-- Permite tipo 'sangria' em treasury_movements (para retirada por carteira em /financeiro/caixa)
DO $$
BEGIN
  ALTER TABLE treasury_movements DROP CONSTRAINT IF EXISTS treasury_movements_tipo_check;
  ALTER TABLE treasury_movements ADD CONSTRAINT treasury_movements_tipo_check
    CHECK (tipo IN ('transferencia', 'pagamento_conta', 'retirada_lucro', 'sangria'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Constraint alterada ou tabela inexistente: %', SQLERRM;
END $$;
