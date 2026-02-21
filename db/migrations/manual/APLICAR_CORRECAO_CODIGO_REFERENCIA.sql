-- ==========================================
-- APLICAR CORREÇÃO DEFINITIVA PARA CÓDIGO E REFERÊNCIA
-- ==========================================
-- Este script corrige a função bulk_upsert_produtos
-- para salvar corretamente codigo e referencia mesmo quando são null no JSON

CREATE OR REPLACE FUNCTION public.bulk_upsert_produtos(
  produtos_json JSONB
)
RETURNS TABLE (
  inseridos INTEGER,
  atualizados INTEGER,
  erros INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  produto_item JSONB;
  nome_lower TEXT;
  produto_existente RECORD;
  v_inseridos INTEGER := 0;
  v_atualizados INTEGER := 0;
  v_erros INTEGER := 0;
  v_codigo INTEGER;
  v_codigo_barras TEXT;
  v_referencia TEXT;
BEGIN
  -- Iterar sobre cada produto no JSON
  FOR produto_item IN SELECT * FROM jsonb_array_elements(produtos_json)
  LOOP
    BEGIN
      -- Validar nome (não pode ser vazio)
      nome_lower := LOWER(TRIM(COALESCE(produto_item->>'nome', '')));
      IF nome_lower = '' OR nome_lower = 'produto sem descrição' THEN
        v_erros := v_erros + 1;
        CONTINUE;
      END IF;
      
      -- Extrair codigo, codigo_barras e referencia do JSON
      -- Tratar null corretamente: se vier null no JSON, usar NULL no banco
      -- Se não vier no JSON, preservar valor existente (para UPDATE) ou usar NULL (para INSERT)
      
      -- Para codigo: verificar se existe e converter para INTEGER
      IF produto_item ? 'codigo' THEN
        -- Se o valor é null no JSON, usar NULL
        IF produto_item->'codigo' IS NULL OR produto_item->'codigo' = 'null'::jsonb THEN
          v_codigo := NULL;
        ELSIF (produto_item->>'codigo')::TEXT = '' THEN
          v_codigo := NULL;
        ELSE
          BEGIN
            v_codigo := LEAST(GREATEST((produto_item->>'codigo')::NUMERIC, -2147483648), 2147483647)::INTEGER;
          EXCEPTION WHEN OTHERS THEN
            v_codigo := NULL;
          END;
        END IF;
      ELSE
        v_codigo := NULL; -- Para INSERT, usar NULL se não vier no JSON
      END IF;
      
      -- Para codigo_barras: verificar se existe e converter para TEXT
      IF produto_item ? 'codigo_barras' THEN
        -- Se o valor é null no JSON, usar NULL
        IF produto_item->'codigo_barras' IS NULL OR produto_item->'codigo_barras' = 'null'::jsonb THEN
          v_codigo_barras := NULL;
        ELSIF (produto_item->>'codigo_barras')::TEXT = '' THEN
          v_codigo_barras := NULL;
        ELSE
          v_codigo_barras := (produto_item->>'codigo_barras')::TEXT;
        END IF;
      ELSE
        v_codigo_barras := NULL; -- Para INSERT, usar NULL se não vier no JSON
      END IF;
      
      -- Para referencia: verificar se existe e converter para TEXT
      IF produto_item ? 'referencia' THEN
        -- Se o valor é null no JSON, usar NULL
        IF produto_item->'referencia' IS NULL OR produto_item->'referencia' = 'null'::jsonb THEN
          v_referencia := NULL;
        ELSIF (produto_item->>'referencia')::TEXT = '' THEN
          v_referencia := NULL;
        ELSE
          v_referencia := (produto_item->>'referencia')::TEXT;
        END IF;
      ELSE
        v_referencia := NULL; -- Para INSERT, usar NULL se não vier no JSON
      END IF;
      
      -- Buscar produto existente (case-insensitive)
      SELECT id INTO produto_existente
      FROM public.produtos
      WHERE lower(nome) = nome_lower
      LIMIT 1;
      
      IF produto_existente IS NOT NULL THEN
        -- Atualizar produto existente
        UPDATE public.produtos
        SET
          marca = COALESCE(NULLIF(TRIM(COALESCE(produto_item->>'marca', '')), ''), marca, 'Geral'),
          modelo = COALESCE(NULLIF(TRIM(COALESCE(produto_item->>'modelo', '')), ''), modelo, 'Geral'),
          qualidade = COALESCE(NULLIF(TRIM(COALESCE(produto_item->>'qualidade', '')), ''), qualidade, 'Original'),
          valor_dinheiro_pix = COALESCE(
            CASE 
              WHEN (produto_item->>'valor_dinheiro_pix')::TEXT IS NULL OR (produto_item->>'valor_dinheiro_pix')::TEXT = '' 
              THEN NULL 
              ELSE LEAST((produto_item->>'valor_dinheiro_pix')::NUMERIC, 9999999999.99)::NUMERIC(12,2)
            END,
            valor_dinheiro_pix,
            0
          ),
          valor_parcelado_6x = COALESCE(
            CASE 
              WHEN (produto_item->>'valor_parcelado_6x')::TEXT IS NULL OR (produto_item->>'valor_parcelado_6x')::TEXT = '' 
              THEN NULL 
              ELSE LEAST((produto_item->>'valor_parcelado_6x')::NUMERIC, 9999999999.99)::NUMERIC(12,2)
            END,
            valor_parcelado_6x,
            0
          ),
          -- CORRIGIDO: Atualizar codigo se vier no JSON
          codigo = CASE 
            WHEN produto_item ? 'codigo' THEN v_codigo
            ELSE codigo -- Preservar se não vier no JSON
          END,
          -- CORRIGIDO: Atualizar codigo_barras se vier no JSON
          codigo_barras = CASE 
            WHEN produto_item ? 'codigo_barras' THEN v_codigo_barras
            ELSE codigo_barras -- Preservar se não vier no JSON
          END,
          -- CORRIGIDO: Atualizar referencia se vier no JSON
          referencia = CASE 
            WHEN produto_item ? 'referencia' THEN v_referencia
            ELSE referencia -- Preservar se não vier no JSON
          END,
          grupo = COALESCE(NULLIF(TRIM(COALESCE(produto_item->>'grupo', '')), ''), grupo),
          sub_grupo = COALESCE(NULLIF(TRIM(COALESCE(produto_item->>'sub_grupo', '')), ''), sub_grupo),
          vi_compra = COALESCE(
            CASE 
              WHEN (produto_item->>'vi_compra')::TEXT IS NULL OR (produto_item->>'vi_compra')::TEXT = '' 
              THEN NULL 
              ELSE LEAST((produto_item->>'vi_compra')::NUMERIC, 9999999999.99)::NUMERIC(12,2)
            END,
            vi_compra,
            0
          ),
          vi_custo = COALESCE(
            CASE 
              WHEN (produto_item->>'vi_custo')::TEXT IS NULL OR (produto_item->>'vi_custo')::TEXT = '' 
              THEN NULL 
              ELSE LEAST((produto_item->>'vi_custo')::NUMERIC, 9999999999.99)::NUMERIC(12,2)
            END,
            vi_custo,
            0
          ),
          quantidade = COALESCE(
            CASE 
              WHEN (produto_item->>'quantidade')::TEXT IS NULL OR (produto_item->>'quantidade')::TEXT = '' 
              THEN NULL 
              ELSE LEAST(GREATEST((produto_item->>'quantidade')::NUMERIC, -2147483648), 2147483647)::INTEGER
            END,
            quantidade,
            0
          ),
          margem_percentual = COALESCE(
            CASE 
              WHEN (produto_item->>'margem_percentual')::TEXT IS NULL OR (produto_item->>'margem_percentual')::TEXT = '' 
              THEN NULL 
              ELSE LEAST((produto_item->>'margem_percentual')::NUMERIC, 999.99)::NUMERIC(5,2)
            END,
            margem_percentual,
            0
          ),
          atualizado_em = NOW()
        WHERE id = produto_existente.id;
        
        v_atualizados := v_atualizados + 1;
      ELSE
        -- Inserir novo produto - usar valores extraídos
        INSERT INTO public.produtos (
          nome,
          marca,
          modelo,
          qualidade,
          valor_dinheiro_pix,
          valor_parcelado_6x,
          codigo,
          codigo_barras,
          referencia,
          grupo,
          sub_grupo,
          vi_compra,
          vi_custo,
          quantidade,
          margem_percentual,
          criado_por,
          disponivel
        ) VALUES (
          nome_lower,
          COALESCE(NULLIF(TRIM(COALESCE(produto_item->>'marca', '')), ''), 'Geral'),
          COALESCE(NULLIF(TRIM(COALESCE(produto_item->>'modelo', '')), ''), 'Geral'),
          COALESCE(NULLIF(TRIM(COALESCE(produto_item->>'qualidade', '')), ''), 'Original'),
          COALESCE(
            CASE 
              WHEN (produto_item->>'valor_dinheiro_pix')::TEXT IS NULL OR (produto_item->>'valor_dinheiro_pix')::TEXT = '' 
              THEN NULL 
              ELSE LEAST((produto_item->>'valor_dinheiro_pix')::NUMERIC, 9999999999.99)::NUMERIC(12,2)
            END,
            0
          ),
          COALESCE(
            CASE 
              WHEN (produto_item->>'valor_parcelado_6x')::TEXT IS NULL OR (produto_item->>'valor_parcelado_6x')::TEXT = '' 
              THEN NULL 
              ELSE LEAST((produto_item->>'valor_parcelado_6x')::NUMERIC, 9999999999.99)::NUMERIC(12,2)
            END,
            0
          ),
          v_codigo, -- Usar valor extraído
          v_codigo_barras, -- Usar valor extraído
          v_referencia, -- Usar valor extraído
          NULLIF(TRIM(COALESCE(produto_item->>'grupo', '')), ''),
          NULLIF(TRIM(COALESCE(produto_item->>'sub_grupo', '')), ''),
          COALESCE(
            CASE 
              WHEN (produto_item->>'vi_compra')::TEXT IS NULL OR (produto_item->>'vi_compra')::TEXT = '' 
              THEN NULL 
              ELSE LEAST((produto_item->>'vi_compra')::NUMERIC, 9999999999.99)::NUMERIC(12,2)
            END,
            0
          ),
          COALESCE(
            CASE 
              WHEN (produto_item->>'vi_custo')::TEXT IS NULL OR (produto_item->>'vi_custo')::TEXT = '' 
              THEN NULL 
              ELSE LEAST((produto_item->>'vi_custo')::NUMERIC, 9999999999.99)::NUMERIC(12,2)
            END,
            0
          ),
          COALESCE(
            CASE 
              WHEN (produto_item->>'quantidade')::TEXT IS NULL OR (produto_item->>'quantidade')::TEXT = '' 
              THEN NULL 
              ELSE LEAST(GREATEST((produto_item->>'quantidade')::NUMERIC, -2147483648), 2147483647)::INTEGER
            END,
            0
          ),
          COALESCE(
            CASE 
              WHEN (produto_item->>'margem_percentual')::TEXT IS NULL OR (produto_item->>'margem_percentual')::TEXT = '' 
              THEN NULL 
              ELSE LEAST((produto_item->>'margem_percentual')::NUMERIC, 999.99)::NUMERIC(5,2)
            END,
            0
          ),
          (produto_item->>'criado_por')::UUID,
          true
        );
        
        v_inseridos := v_inseridos + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_erros := v_erros + 1;
      -- Log do erro com mais detalhes
      RAISE WARNING 'Erro ao processar produto %: % (SQLSTATE: %, SQLERRM: %)', 
        COALESCE(produto_item->>'nome', 'SEM NOME'), 
        SQLERRM,
        SQLSTATE,
        SQLERRM;
      -- Continuar processando outros produtos mesmo se um falhar
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_inseridos, v_atualizados, v_erros;
END;
$$;

