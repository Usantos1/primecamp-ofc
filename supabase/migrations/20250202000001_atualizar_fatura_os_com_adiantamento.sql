-- ============================================
-- ATUALIZAR FUNÇÃO DE FATURAMENTO DE OS
-- Agora diferencia entre adiantamento e faturamento completo
-- ============================================

-- Remover função antiga
DROP FUNCTION IF EXISTS public.fatura_os_from_sale(UUID);

-- Criar função atualizada que verifica se é adiantamento ou faturamento completo
CREATE OR REPLACE FUNCTION public.fatura_os_from_sale(p_sale_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_sale RECORD;
  v_os RECORD;
  v_total_pago_os NUMERIC;
  v_total_os NUMERIC;
BEGIN
  -- Buscar dados da venda
  SELECT * INTO v_sale
  FROM public.sales
  WHERE id = p_sale_id;
  
  IF NOT FOUND OR v_sale.ordem_servico_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Buscar OS
  SELECT * INTO v_os
  FROM public.ordens_servico
  WHERE id = v_sale.ordem_servico_id;
  
  IF NOT FOUND THEN
    -- Se a OS não existe no banco (pode estar em localStorage), apenas marcar venda
    UPDATE public.sales
    SET os_faturada = true
    WHERE id = p_sale_id;
    RETURN TRUE;
  END IF;
  
  -- Calcular total pago na OS (soma de todas as vendas vinculadas)
  SELECT COALESCE(SUM(total_pago), 0) INTO v_total_pago_os
  FROM public.sales
  WHERE ordem_servico_id = v_sale.ordem_servico_id
    AND status IN ('paid', 'partial');
  
  -- Total da OS
  v_total_os := COALESCE(v_os.valor_total, 0);
  
  -- Atualizar valor pago na OS
  UPDATE public.ordens_servico
  SET valor_pago = v_total_pago_os,
      updated_at = now()
  WHERE id = v_sale.ordem_servico_id;
  
  -- Se o total pago for >= total da OS, finalizar a OS
  IF v_total_pago_os >= v_total_os AND v_total_os > 0 THEN
    -- FATURAMENTO COMPLETO: Finalizar a OS
    UPDATE public.ordens_servico
    SET status = 'finalizada',
        situacao = 'fechada',
        data_conclusao = CURRENT_DATE,
        updated_at = now()
    WHERE id = v_sale.ordem_servico_id;
    
    RAISE NOTICE 'OS #% finalizada (faturamento completo). Total pago: %, Total OS: %', 
      v_os.numero, v_total_pago_os, v_total_os;
  ELSE
    -- ADIANTAMENTO: Não finalizar, apenas atualizar valor pago
    RAISE NOTICE 'OS #% recebeu adiantamento. Total pago: %, Total OS: %', 
      v_os.numero, v_total_pago_os, v_total_os;
  END IF;
  
  -- Marcar venda como OS faturada
  UPDATE public.sales
  SET os_faturada = true
  WHERE id = p_sale_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao faturar OS: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Comentário atualizado
COMMENT ON FUNCTION public.fatura_os_from_sale IS 
'Fatura uma OS vinculada a uma venda. Se total_pago >= total_os, finaliza a OS. Se for apenas adiantamento, apenas atualiza valor_pago.';

