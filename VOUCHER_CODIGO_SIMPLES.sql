-- ═══════════════════════════════════════════════════════
-- CÓDIGO SIMPLES PARA VOUCHERS: V001, V002, V003...
-- ═══════════════════════════════════════════════════════

-- Criar sequência para vouchers (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'voucher_number_seq') THEN
    CREATE SEQUENCE voucher_number_seq START WITH 1;
    RAISE NOTICE 'Sequência voucher_number_seq criada';
  ELSE
    RAISE NOTICE 'Sequência voucher_number_seq já existe';
  END IF;
END $$;

-- Atualizar sequência para iniciar do próximo número disponível
DO $$
DECLARE
  max_num INTEGER;
BEGIN
  -- Tentar extrair o maior número dos códigos existentes
  SELECT COALESCE(MAX(
    CASE 
      WHEN code ~ '^V[0-9]+$' THEN CAST(SUBSTRING(code FROM 2) AS INTEGER)
      ELSE 0
    END
  ), 0) INTO max_num FROM vouchers;
  
  IF max_num > 0 THEN
    PERFORM setval('voucher_number_seq', max_num + 1, false);
    RAISE NOTICE 'Sequência ajustada para começar em %', max_num + 1;
  END IF;
END $$;

-- Nova função para gerar código simples
CREATE OR REPLACE FUNCTION generate_simple_voucher_code()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  result TEXT;
  code_exists BOOLEAN := TRUE;
BEGIN
  WHILE code_exists LOOP
    SELECT nextval('voucher_number_seq') INTO next_num;
    result := 'V' || LPAD(next_num::TEXT, 3, '0');
    SELECT EXISTS(SELECT 1 FROM vouchers WHERE code = result) INTO code_exists;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Verificar criação
SELECT 
  'voucher_number_seq' as objeto,
  CASE WHEN EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'voucher_number_seq') 
       THEN '✅ OK' ELSE '❌ FALTA' END as status
UNION ALL
SELECT 
  'generate_simple_voucher_code()',
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_simple_voucher_code') 
       THEN '✅ OK' ELSE '❌ FALTA' END;

-- Teste da função
SELECT generate_simple_voucher_code() as proximo_codigo;

