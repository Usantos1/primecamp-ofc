-- ============================================
-- INTEGRAÇÃO COMPLETA DE ESTOQUE COM PDV
-- Execute este script no Supabase Studio > SQL Editor
-- ============================================

-- ============================================
-- 1. GARANTIR QUE A FUNÇÃO decrement_stock EXISTE
-- ============================================
CREATE OR REPLACE FUNCTION decrement_stock(produto_id UUID, quantidade NUMERIC)
RETURNS BOOLEAN AS $$
DECLARE
  v_estoque_atual NUMERIC;
BEGIN
  -- Verificar se o produto existe e tem estoque
  SELECT estoque_atual INTO v_estoque_atual
  FROM public.produtos
  WHERE id = produto_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'Produto % não encontrado', produto_id;
    RETURN FALSE;
  END IF;
  
  -- Se estoque_atual for NULL, definir como 0
  IF v_estoque_atual IS NULL THEN
    v_estoque_atual := 0;
  END IF;
  
  -- Verificar se há estoque suficiente
  IF v_estoque_atual < quantidade THEN
    RAISE NOTICE 'Estoque insuficiente para produto %. Disponível: %, Solicitado: %', 
      produto_id, v_estoque_atual, quantidade;
    -- Ainda assim, permite a baixa (pode ser estoque negativo em casos especiais)
  END IF;
  
  -- Decrementar estoque (não permite negativo, usa GREATEST)
  UPDATE public.produtos
  SET estoque_atual = GREATEST(0, COALESCE(estoque_atual, 0) - quantidade),
      updated_at = NOW()
  WHERE id = produto_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao decrementar estoque: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. FUNÇÃO PARA REVERTER ESTOQUE (CANCELAMENTO/EXCLUSÃO)
-- ============================================
CREATE OR REPLACE FUNCTION revert_stock_from_sale(p_sale_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_item RECORD;
  v_estoque_atual NUMERIC;
BEGIN
  -- Buscar todos os itens da venda que são produtos
  FOR v_item IN 
    SELECT produto_id, quantidade, produto_tipo
    FROM public.sale_items
    WHERE sale_id = p_sale_id
      AND produto_tipo = 'produto'
      AND produto_id IS NOT NULL
  LOOP
    -- Buscar estoque atual
    SELECT estoque_atual INTO v_estoque_atual
    FROM public.produtos
    WHERE id = v_item.produto_id;
    
    -- Reverter estoque (adicionar de volta)
    UPDATE public.produtos
    SET estoque_atual = COALESCE(estoque_atual, 0) + v_item.quantidade,
        updated_at = NOW()
    WHERE id = v_item.produto_id;
    
    RAISE NOTICE 'Estoque revertido: Produto %, Quantidade: %', 
      v_item.produto_id, v_item.quantidade;
  END LOOP;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao reverter estoque: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. FUNÇÃO PARA VERIFICAR ESTOQUE ANTES DE FINALIZAR
-- ============================================
CREATE OR REPLACE FUNCTION check_stock_availability(p_sale_id UUID)
RETURNS TABLE (
  produto_id UUID,
  produto_nome TEXT,
  estoque_disponivel NUMERIC,
  quantidade_solicitada NUMERIC,
  estoque_suficiente BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    si.produto_id,
    p.descricao AS produto_nome,
    COALESCE(p.estoque_atual, 0) AS estoque_disponivel,
    si.quantidade AS quantidade_solicitada,
    (COALESCE(p.estoque_atual, 0) >= si.quantidade) AS estoque_suficiente
  FROM public.sale_items si
  LEFT JOIN public.produtos p ON p.id = si.produto_id
  WHERE si.sale_id = p_sale_id
    AND si.produto_tipo = 'produto'
    AND si.produto_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. TRIGGER PARA BAIXAR ESTOQUE AUTOMATICAMENTE AO FINALIZAR VENDA
-- ============================================
CREATE OR REPLACE FUNCTION trigger_decrement_stock_on_finalize()
RETURNS TRIGGER AS $$
DECLARE
  v_item RECORD;
BEGIN
  -- Quando venda é finalizada (is_draft muda de true para false)
  IF NEW.is_draft = false AND OLD.is_draft = true AND NEW.stock_decremented = false THEN
    -- Baixar estoque para cada item
    FOR v_item IN 
      SELECT produto_id, quantidade
      FROM public.sale_items
      WHERE sale_id = NEW.id
        AND produto_tipo = 'produto'
        AND produto_id IS NOT NULL
    LOOP
      PERFORM decrement_stock(v_item.produto_id, v_item.quantidade);
    END LOOP;
    
    -- Marcar como estoque baixado
    NEW.stock_decremented := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trigger_decrement_stock_on_finalize ON public.sales;

-- Criar novo trigger
CREATE TRIGGER trigger_decrement_stock_on_finalize
  BEFORE UPDATE ON public.sales
  FOR EACH ROW
  WHEN (OLD.is_draft = true AND NEW.is_draft = false)
  EXECUTE FUNCTION trigger_decrement_stock_on_finalize();

-- ============================================
-- 5. GARANTIR QUE O CAMPO stock_decremented EXISTE
-- ============================================
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS stock_decremented BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_sales_stock_decremented ON public.sales(stock_decremented);

-- ============================================
-- 6. COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================
COMMENT ON FUNCTION decrement_stock IS 'Decrementa o estoque de um produto quando uma venda é finalizada';
COMMENT ON FUNCTION revert_stock_from_sale IS 'Reverte a baixa de estoque quando uma venda é cancelada ou excluída';
COMMENT ON FUNCTION check_stock_availability IS 'Verifica se há estoque suficiente para todos os produtos de uma venda';
COMMENT ON COLUMN public.sales.stock_decremented IS 'Indica se o estoque já foi baixado para esta venda';

-- ============================================
-- 7. TESTE DAS FUNÇÕES (OPCIONAL - DESCOMENTE PARA TESTAR)
-- ============================================
-- Exemplo de uso:
-- SELECT decrement_stock('uuid-do-produto', 2);
-- SELECT revert_stock_from_sale('uuid-da-venda');
-- SELECT * FROM check_stock_availability('uuid-da-venda');

