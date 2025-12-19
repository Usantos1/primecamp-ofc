-- ==========================================
-- ATUALIZAR FUNÇÃO BULK_UPSERT_PRODUTOS
-- ==========================================
-- Execute este script no Supabase SQL Editor
-- para melhorar o tratamento de erros

-- Atualizar função para melhor tratamento de erros
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
BEGIN
  -- Iterar sobre cada produto no JSON
  FOR produto_item IN SELECT * FROM jsonb_array_elements(produtos_json)
  LOOP
    BEGIN
      nome_lower := LOWER(COALESCE(produto_item->>'nome', ''));
      
      -- Validar nome (não pode ser vazio)
      IF nome_lower IS NULL OR nome_lower = '' OR nome_lower = 'produto sem descrição' THEN
        v_erros := v_erros + 1;
        CONTINUE;
      END IF;
      
      -- Buscar produto existente (case-insensitive)
      SELECT id INTO produto_existente
      FROM public.produtos
      WHERE lower(nome) = nome_lower
      LIMIT 1;
      
      -- Função auxiliar para converter valores com segurança
      -- Converter string vazia ou null para NULL, senão converter para tipo
      
      IF produto_existente IS NOT NULL THEN
        -- Atualizar produto existente
        UPDATE public.produtos
        SET
          marca = COALESCE(NULLIF((produto_item->>'marca')::TEXT, ''), marca, 'Geral'),
          modelo = COALESCE(NULLIF((produto_item->>'modelo')::TEXT, ''), modelo, 'Geral'),
          qualidade = COALESCE(NULLIF((produto_item->>'qualidade')::TEXT, ''), qualidade, 'Original'),
          valor_dinheiro_pix = COALESCE(
            CASE 
              WHEN (produto_item->>'valor_dinheiro_pix')::TEXT IS NULL OR (produto_item->>'valor_dinheiro_pix')::TEXT = '' 
              THEN NULL 
              ELSE (produto_item->>'valor_dinheiro_pix')::NUMERIC 
            END,
            valor_dinheiro_pix,
            0
          ),
          valor_parcelado_6x = COALESCE(
            CASE 
              WHEN (produto_item->>'valor_parcelado_6x')::TEXT IS NULL OR (produto_item->>'valor_parcelado_6x')::TEXT = '' 
              THEN NULL 
              ELSE (produto_item->>'valor_parcelado_6x')::NUMERIC 
            END,
            valor_parcelado_6x,
            0
          ),
          codigo = CASE 
            WHEN (produto_item->>'codigo')::TEXT IS NULL OR (produto_item->>'codigo')::TEXT = '' 
            THEN codigo 
            ELSE (produto_item->>'codigo')::INTEGER 
          END,
          codigo_barras = COALESCE(NULLIF((produto_item->>'codigo_barras')::TEXT, ''), codigo_barras),
          referencia = COALESCE(NULLIF((produto_item->>'referencia')::TEXT, ''), referencia),
          grupo = COALESCE(NULLIF((produto_item->>'grupo')::TEXT, ''), grupo),
          sub_grupo = COALESCE(NULLIF((produto_item->>'sub_grupo')::TEXT, ''), sub_grupo),
          vi_compra = COALESCE(
            CASE 
              WHEN (produto_item->>'vi_compra')::TEXT IS NULL OR (produto_item->>'vi_compra')::TEXT = '' 
              THEN NULL 
              ELSE (produto_item->>'vi_compra')::NUMERIC 
            END,
            vi_compra,
            0
          ),
          vi_custo = COALESCE(
            CASE 
              WHEN (produto_item->>'vi_custo')::TEXT IS NULL OR (produto_item->>'vi_custo')::TEXT = '' 
              THEN NULL 
              ELSE (produto_item->>'vi_custo')::NUMERIC 
            END,
            vi_custo,
            0
          ),
          quantidade = COALESCE(
            CASE 
              WHEN (produto_item->>'quantidade')::TEXT IS NULL OR (produto_item->>'quantidade')::TEXT = '' 
              THEN NULL 
              ELSE (produto_item->>'quantidade')::INTEGER 
            END,
            quantidade,
            0
          ),
          margem_percentual = COALESCE(
            CASE 
              WHEN (produto_item->>'margem_percentual')::TEXT IS NULL OR (produto_item->>'margem_percentual')::TEXT = '' 
              THEN NULL 
              ELSE (produto_item->>'margem_percentual')::NUMERIC 
            END,
            margem_percentual,
            0
          ),
          atualizado_em = NOW()
        WHERE id = produto_existente.id;
        
        v_atualizados := v_atualizados + 1;
      ELSE
        -- Inserir novo produto - garantir valores padrão para campos obrigatórios
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
          criado_por
        ) VALUES (
          nome_lower,
          COALESCE(NULLIF((produto_item->>'marca')::TEXT, ''), 'Geral'),
          COALESCE(NULLIF((produto_item->>'modelo')::TEXT, ''), 'Geral'),
          COALESCE(NULLIF((produto_item->>'qualidade')::TEXT, ''), 'Original'),
          COALESCE(
            CASE 
              WHEN (produto_item->>'valor_dinheiro_pix')::TEXT IS NULL OR (produto_item->>'valor_dinheiro_pix')::TEXT = '' 
              THEN NULL 
              ELSE (produto_item->>'valor_dinheiro_pix')::NUMERIC 
            END,
            0
          ),
          COALESCE(
            CASE 
              WHEN (produto_item->>'valor_parcelado_6x')::TEXT IS NULL OR (produto_item->>'valor_parcelado_6x')::TEXT = '' 
              THEN NULL 
              ELSE (produto_item->>'valor_parcelado_6x')::NUMERIC 
            END,
            0
          ),
          CASE 
            WHEN (produto_item->>'codigo')::TEXT IS NULL OR (produto_item->>'codigo')::TEXT = '' 
            THEN NULL 
            ELSE (produto_item->>'codigo')::INTEGER 
          END,
          NULLIF((produto_item->>'codigo_barras')::TEXT, ''),
          NULLIF((produto_item->>'referencia')::TEXT, ''),
          NULLIF((produto_item->>'grupo')::TEXT, ''),
          NULLIF((produto_item->>'sub_grupo')::TEXT, ''),
          COALESCE(
            CASE 
              WHEN (produto_item->>'vi_compra')::TEXT IS NULL OR (produto_item->>'vi_compra')::TEXT = '' 
              THEN NULL 
              ELSE (produto_item->>'vi_compra')::NUMERIC 
            END,
            0
          ),
          COALESCE(
            CASE 
              WHEN (produto_item->>'vi_custo')::TEXT IS NULL OR (produto_item->>'vi_custo')::TEXT = '' 
              THEN NULL 
              ELSE (produto_item->>'vi_custo')::NUMERIC 
            END,
            0
          ),
          COALESCE(
            CASE 
              WHEN (produto_item->>'quantidade')::TEXT IS NULL OR (produto_item->>'quantidade')::TEXT = '' 
              THEN NULL 
              ELSE (produto_item->>'quantidade')::INTEGER 
            END,
            0
          ),
          COALESCE(
            CASE 
              WHEN (produto_item->>'margem_percentual')::TEXT IS NULL OR (produto_item->>'margem_percentual')::TEXT = '' 
              THEN NULL 
              ELSE (produto_item->>'margem_percentual')::NUMERIC 
            END,
            0
          ),
          (produto_item->>'criado_por')::UUID
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

-- Comentário para documentação
COMMENT ON FUNCTION public.bulk_upsert_produtos(JSONB) IS 'Faz bulk upsert de produtos usando lower(nome) como chave única. Retorna contadores de inseridos, atualizados e erros. Melhorado tratamento de erros e validações.';

