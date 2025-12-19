-- Função para fazer bulk upsert de produtos usando lower(nome) como chave
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
      nome_lower := LOWER(produto_item->>'nome');
      
      -- Buscar produto existente (case-insensitive)
      SELECT id INTO produto_existente
      FROM public.produtos
      WHERE lower(nome) = nome_lower
      LIMIT 1;
      
      IF produto_existente IS NOT NULL THEN
        -- Atualizar produto existente
        UPDATE public.produtos
        SET
          marca = COALESCE((produto_item->>'marca')::TEXT, marca),
          modelo = COALESCE((produto_item->>'modelo')::TEXT, modelo),
          qualidade = COALESCE((produto_item->>'qualidade')::TEXT, qualidade),
          valor_dinheiro_pix = COALESCE((produto_item->>'valor_dinheiro_pix')::NUMERIC, valor_dinheiro_pix),
          valor_parcelado_6x = COALESCE((produto_item->>'valor_parcelado_6x')::NUMERIC, valor_parcelado_6x),
          codigo = COALESCE((produto_item->>'codigo')::INTEGER, codigo),
          codigo_barras = COALESCE((produto_item->>'codigo_barras')::TEXT, codigo_barras),
          referencia = COALESCE((produto_item->>'referencia')::TEXT, referencia),
          grupo = COALESCE((produto_item->>'grupo')::TEXT, grupo),
          sub_grupo = COALESCE((produto_item->>'sub_grupo')::TEXT, sub_grupo),
          vi_compra = COALESCE((produto_item->>'vi_compra')::NUMERIC, vi_compra),
          vi_custo = COALESCE((produto_item->>'vi_custo')::NUMERIC, vi_custo),
          quantidade = COALESCE((produto_item->>'quantidade')::INTEGER, quantidade),
          margem_percentual = COALESCE((produto_item->>'margem_percentual')::NUMERIC, margem_percentual),
          atualizado_em = NOW()
        WHERE id = produto_existente.id;
        
        v_atualizados := v_atualizados + 1;
      ELSE
        -- Inserir novo produto
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
          (produto_item->>'marca')::TEXT,
          (produto_item->>'modelo')::TEXT,
          (produto_item->>'qualidade')::TEXT,
          COALESCE((produto_item->>'valor_dinheiro_pix')::NUMERIC, 0),
          COALESCE((produto_item->>'valor_parcelado_6x')::NUMERIC, 0),
          (produto_item->>'codigo')::INTEGER,
          (produto_item->>'codigo_barras')::TEXT,
          (produto_item->>'referencia')::TEXT,
          (produto_item->>'grupo')::TEXT,
          (produto_item->>'sub_grupo')::TEXT,
          COALESCE((produto_item->>'vi_compra')::NUMERIC, 0),
          COALESCE((produto_item->>'vi_custo')::NUMERIC, 0),
          COALESCE((produto_item->>'quantidade')::INTEGER, 0),
          COALESCE((produto_item->>'margem_percentual')::NUMERIC, 0),
          (produto_item->>'criado_por')::UUID
        );
        
        v_inseridos := v_inseridos + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_erros := v_erros + 1;
      -- Log do erro (pode ser melhorado com logging)
      RAISE WARNING 'Erro ao processar produto %: %', produto_item->>'nome', SQLERRM;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_inseridos, v_atualizados, v_erros;
END;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION public.bulk_upsert_produtos(JSONB) IS 'Faz bulk upsert de produtos usando lower(nome) como chave única. Retorna contadores de inseridos, atualizados e erros.';

