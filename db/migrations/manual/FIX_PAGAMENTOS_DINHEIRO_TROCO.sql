-- ============================================
-- Corrige pagamentos em dinheiro com troco: valor deve ser o aplicado à venda (valor - troco), não o valor recebido.
-- Execute no PostgreSQL da API (VPS) UMA VEZ.
-- Após rodar: lista de vendas (Pago) e Detalhes do Caixa (Esperado / Totais por forma) ficam corretos.
-- ============================================

-- 1) Ajustar payments onde valor era o "recebido" (valor > total da venda) → valor aplicado = valor - troco
UPDATE payments p
SET valor = p.valor - COALESCE(p.troco, 0)
FROM sales s
WHERE p.sale_id = s.id
  AND LOWER(TRIM(COALESCE(p.forma_pagamento, ''))) = 'dinheiro'
  AND COALESCE(p.troco, 0) > 0
  AND p.valor > s.total;

-- 2) Recalcular total_pago de todas as vendas (soma dos pagamentos confirmados)
UPDATE sales
SET total_pago = COALESCE(
  (SELECT SUM(p.valor) FROM payments p WHERE p.sale_id = sales.id AND p.status = 'confirmed'),
  0
);
