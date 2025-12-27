-- CORRIGIR REFERÊNCIAS DA TABELA cash_register_sessions
-- A tabela foi criada com referência a auth.users (Supabase)
-- Precisamos alterar para public.users

-- 1. Remover constraint antiga (se existir)
DO $$
BEGIN
  -- Tentar remover constraint de operador_id
  ALTER TABLE cash_register_sessions DROP CONSTRAINT IF EXISTS cash_register_sessions_operador_id_fkey;
  ALTER TABLE cash_register_sessions DROP CONSTRAINT IF EXISTS cash_register_sessions_closed_by_fkey;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Tabela cash_register_sessions não existe';
  WHEN others THEN
    RAISE NOTICE 'Erro ao remover constraints: %', SQLERRM;
END $$;

-- 2. Verificar se a tabela existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cash_register_sessions') THEN
    -- Criar tabela se não existir
    CREATE TABLE public.cash_register_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      numero BIGINT NOT NULL,
      operador_id UUID NOT NULL,
      operador_nome TEXT NOT NULL,
      valor_inicial NUMERIC(12,2) NOT NULL DEFAULT 0,
      valor_final NUMERIC(12,2),
      valor_esperado NUMERIC(12,2),
      divergencia NUMERIC(12,2),
      divergencia_justificativa TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
      totais_forma_pagamento JSONB DEFAULT '{}',
      opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      closed_at TIMESTAMP WITH TIME ZONE,
      closed_by UUID,
      assinatura_caixa TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE 'Tabela cash_register_sessions criada';
  ELSE
    RAISE NOTICE 'Tabela cash_register_sessions já existe';
  END IF;
END $$;

-- 3. Adicionar colunas faltando (se necessário)
DO $$
BEGIN
  -- created_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'cash_register_sessions' AND column_name = 'created_at') THEN
    ALTER TABLE cash_register_sessions ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Coluna created_at adicionada';
  END IF;
  
  -- updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'cash_register_sessions' AND column_name = 'updated_at') THEN
    ALTER TABLE cash_register_sessions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Coluna updated_at adicionada';
  END IF;
END $$;

-- 4. Criar índices
CREATE INDEX IF NOT EXISTS idx_cash_sessions_operador_id ON cash_register_sessions(operador_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON cash_register_sessions(status);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_opened_at ON cash_register_sessions(opened_at);

-- 5. Verificar estrutura final
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'cash_register_sessions'
ORDER BY ordinal_position;

