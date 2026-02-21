-- ============================================
-- Corrige vendas onde o total pago ficou acima do total (ex.: PIX duplicado).
-- 1) Cancela pagamentos em excesso (os mais recentes) até o total pago = total da venda.
-- 2) Recalcula total_pago em sales.
-- Execute no PostgreSQL da API (VPS) UMA VEZ.
-- ============================================

-- Cancelar pagamentos em excesso: para cada venda onde soma(confirmados) > total,
-- cancela o pagamento mais recente; repete até não haver mais excesso.
DO $$
DECLARE
  v_done boolean := false;
  v_id uuid;
BEGIN
  WHILE NOT v_done LOOP
    SELECT p.id INTO v_id
    FROM payments p
    INNER JOIN sales s ON s.id = p.sale_id
    WHERE p.status = 'confirmed'
      AND (SELECT COALESCE(SUM(p2.valor), 0) FROM payments p2 WHERE p2.sale_id = p.sale_id AND p2.status = 'confirmed') > s.total
    ORDER BY p.created_at DESC
    LIMIT 1;

    EXIT WHEN v_id IS NULL;

    UPDATE payments
    SET status = 'canceled', canceled_at = now()
    WHERE id = v_id;
  END LOOP;
END $$;

-- Recalcular total_pago de todas as vendas
UPDATE sales
SET total_pago = COALESCE(
  (SELECT SUM(p.valor) FROM payments p WHERE p.sale_id = sales.id AND p.status = 'confirmed'),
  0
);
