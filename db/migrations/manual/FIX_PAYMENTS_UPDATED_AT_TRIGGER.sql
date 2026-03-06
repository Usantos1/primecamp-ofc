-- =====================================================
-- FIX: record "new" has no field "updated_at" em payments
-- O trigger set_updated_at_payments usa NEW.updated_at mas a coluna pode não existir.
-- 1) Remove o trigger para parar o erro
-- 2) Adiciona a coluna updated_at se não existir
-- 3) Recria o trigger (e a função se precisar)
-- =====================================================
-- PGAdmin: Query Tool → abra e execute este arquivo.
-- VPS: PGPASSWORD='SENHA' psql -h localhost -U postgres -d banco_gestao -f db/migrations/manual/FIX_PAYMENTS_UPDATED_AT_TRIGGER.sql
-- =====================================================

-- 1) Remover o trigger que está causando o erro (para UPDATE/INSERT não falharem)
DROP TRIGGER IF EXISTS set_updated_at_payments ON public.payments;

-- 2) Adicionar coluna updated_at se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Coluna updated_at adicionada em payments.';
  END IF;
END $$;

-- 3) Garantir que a função genérica existe (usa NEW.updated_at)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4) Recriar o trigger (só funciona agora que a coluna existe)
DROP TRIGGER IF EXISTS set_updated_at_payments ON public.payments;
CREATE TRIGGER set_updated_at_payments
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

SELECT '✅ payments: trigger updated_at corrigido. Pode confirmar pagamento no PDV.' AS resultado;
