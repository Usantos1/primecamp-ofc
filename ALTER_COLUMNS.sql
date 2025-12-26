-- Execute isso no psql da VPS:
-- psql -h 72.62.106.76 -U postgres -d banco_gestao

-- Adicionar colunas faltantes em SALES
ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_pago DECIMAL(15,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cash_register_session_id UUID;

-- Adicionar colunas faltantes em CASH_REGISTER_SESSIONS
ALTER TABLE cash_register_sessions ADD COLUMN IF NOT EXISTS valor_inicial DECIMAL(15,2) DEFAULT 0;
ALTER TABLE cash_register_sessions ADD COLUMN IF NOT EXISTS total_entradas DECIMAL(15,2) DEFAULT 0;
ALTER TABLE cash_register_sessions ADD COLUMN IF NOT EXISTS total_saidas DECIMAL(15,2) DEFAULT 0;

-- Adicionar colunas faltantes em ORDENS_SERVICO
ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Adicionar colunas faltantes em PRODUTOS
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS quantidade INTEGER DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS estoque_minimo INTEGER DEFAULT 0;

