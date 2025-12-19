-- ==========================================
-- CORREÇÃO DEFINITIVA PARA CÓDIGO E REFERÊNCIA
-- ==========================================
-- Esta versão simplifica a lógica e força a atualização dos campos

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
      
      -- SIMPLIFICADO: Extrair valores diretamente, tratando null explicitamente
      -- Para codigo: se existe no JSON e não é null, converter para INTEGER
      IF produto_item ? 'codigo' AND produto_item->'codigo' IS NOT NULL AND produto_item->'codigo' != 'null'::jsonb THEN
        BEGIN
          v_codigo := (produto_item->>'codigo')::INTEGER;
        EXCEPTION WHEN OTHERS THEN
          v_codigo := NULL;
        END;
      ELSE
        v_codigo := NULL;
      END IF;
      
      -- Para codigo_barras: se existe no JSON e não é null, usar o valor
      IF produto_item ? 'codigo_barras' AND produto_item->'codigo_barras' IS NOT NULL AND produto_item->'codigo_barras' != 'null'::jsonb THEN
        v_codigo_barras := (produto_item->>'codigo_barras')::TEXT;
        IF v_codigo_barras = '' THEN
          v_codigo_barras := NULL;
        END IF;
      ELSE
        v_codigo_barras := NULL;
      END IF;
      
      -- Para referencia: se existe no JSON e não é null, usar o valor
      IF produto_item ? 'referencia' AND produto_item->'referencia' IS NOT NULL AND produto_item->'referencia' != 'null'::jsonb THEN
        v_referencia := (produto_item->>'referencia')::TEXT;
        IF v_referencia = '' THEN
          v_referencia := NULL;
        END IF;
      ELSE
        v_referencia := NULL;
      END IF;
      
      -- Log para debug (apenas primeiro produto)
      IF v_inseridos + v_atualizados = 0 THEN
        RAISE NOTICE 'Primeiro produto - codigo: %, referencia: %, codigo_barras: %', v_codigo, v_referencia, v_codigo_barras;
        RAISE NOTICE 'JSON codigo: %, JSON referencia: %', produto_item->'codigo', produto_item->'referencia';
      END IF;
      
      -- Buscar produto existente (case-insensitive)
      SELECT id INTO produto_existente
      FROM public.produtos
      WHERE lower(nome) = nome_lower
      LIMIT 1;
      
      IF produto_existente IS NOT NULL THEN
        -- Atualizar produto existente - SEMPRE atualizar codigo e referencia se vierem no JSON
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
          -- FORÇAR atualização de codigo, codigo_barras e referencia
          codigo = CASE 
            WHEN produto_item ? 'codigo' THEN v_codigo
            ELSE codigo -- Preservar se não vier no JSON
          END,
          codigo_barras = CASE 
            WHEN produto_item ? 'codigo_barras' THEN v_codigo_barras
            ELSE codigo_barras -- Preservar se não vier no JSON
          END,
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
        -- Inserir novo produto - usar valores extraídos diretamente
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
          v_codigo, -- Usar valor extraído diretamente
          v_codigo_barras, -- Usar valor extraído diretamente
          v_referencia, -- Usar valor extraído diretamente
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

