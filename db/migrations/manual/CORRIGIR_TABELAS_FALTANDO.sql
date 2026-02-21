-- ============================================================
-- SCRIPT SQL PARA CORRIGIR TABELAS E COLUNAS FALTANDO
-- Execute este script no banco banco_gestao
-- ============================================================

-- ==========================================================
-- 1. TABELA: tasks - Adicionar coluna deadline
-- ==========================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS process_id UUID;

-- ==========================================================
-- 2. TABELA: processes - Criar tabela completa
-- ==========================================================
CREATE TABLE IF NOT EXISTS processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  objective TEXT,
  department VARCHAR(100),
  owner VARCHAR(255),
  priority INTEGER DEFAULT 1,
  participants JSONB DEFAULT '[]'::jsonb,
  activities JSONB DEFAULT '[]'::jsonb,
  metrics JSONB DEFAULT '[]'::jsonb,
  automations JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  flow_nodes JSONB DEFAULT '[]'::jsonb,
  flow_edges JSONB DEFAULT '[]'::jsonb,
  youtube_video_id VARCHAR(255),
  notes TEXT,
  media_files JSONB DEFAULT '[]'::jsonb,
  category_id UUID,
  status VARCHAR(50) DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para processes
CREATE INDEX IF NOT EXISTS idx_processes_status ON processes(status);
CREATE INDEX IF NOT EXISTS idx_processes_department ON processes(department);
CREATE INDEX IF NOT EXISTS idx_processes_created_by ON processes(created_by);

-- ==========================================================
-- 3. TABELA: sales - Adicionar colunas faltantes
-- ==========================================================
ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_pago DECIMAL(15,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cash_register_session_id UUID;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS financial_integrated BOOLEAN DEFAULT FALSE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS stock_decremented BOOLEAN DEFAULT FALSE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS os_faturada BOOLEAN DEFAULT FALSE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS canceled_by UUID;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- ==========================================================
-- 4. TABELA: cash_register_sessions - Adicionar colunas
-- ==========================================================
ALTER TABLE cash_register_sessions ADD COLUMN IF NOT EXISTS valor_inicial DECIMAL(15,2) DEFAULT 0;
ALTER TABLE cash_register_sessions ADD COLUMN IF NOT EXISTS total_entradas DECIMAL(15,2) DEFAULT 0;
ALTER TABLE cash_register_sessions ADD COLUMN IF NOT EXISTS total_saidas DECIMAL(15,2) DEFAULT 0;
ALTER TABLE cash_register_sessions ADD COLUMN IF NOT EXISTS valor_final DECIMAL(15,2);
ALTER TABLE cash_register_sessions ADD COLUMN IF NOT EXISTS valor_esperado DECIMAL(15,2);
ALTER TABLE cash_register_sessions ADD COLUMN IF NOT EXISTS divergencia DECIMAL(15,2);
ALTER TABLE cash_register_sessions ADD COLUMN IF NOT EXISTS divergencia_justificativa TEXT;
ALTER TABLE cash_register_sessions ADD COLUMN IF NOT EXISTS operador_nome VARCHAR(255);
ALTER TABLE cash_register_sessions ADD COLUMN IF NOT EXISTS numero INTEGER;
ALTER TABLE cash_register_sessions ADD COLUMN IF NOT EXISTS totais_forma_pagamento JSONB;
ALTER TABLE cash_register_sessions ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE cash_register_sessions ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE cash_register_sessions ADD COLUMN IF NOT EXISTS closed_by UUID;
ALTER TABLE cash_register_sessions ADD COLUMN IF NOT EXISTS assinatura_caixa TEXT;

-- ==========================================================
-- 5. TABELA: ordens_servico - Adicionar colunas
-- ==========================================================
ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ==========================================================
-- 6. TABELA: produtos - Adicionar colunas
-- ==========================================================
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS quantidade INTEGER DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS estoque_minimo INTEGER DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS codigo_barras VARCHAR(100);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'produto';

-- ==========================================================
-- 7. TABELA: marcas - Criar se não existir
-- ==========================================================
CREATE TABLE IF NOT EXISTS marcas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  situacao VARCHAR(50) DEFAULT 'ativo',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================
-- 8. TABELA: modelos - Criar se não existir  
-- ==========================================================
CREATE TABLE IF NOT EXISTS modelos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  marca_id UUID REFERENCES marcas(id),
  situacao VARCHAR(50) DEFAULT 'ativo',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================
-- 9. TABELA: os_items - Criar se não existir
-- ==========================================================
CREATE TABLE IF NOT EXISTS os_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_servico_id UUID,
  produto_id UUID,
  produto_nome VARCHAR(255),
  quantidade INTEGER DEFAULT 1,
  valor_unitario DECIMAL(15,2) DEFAULT 0,
  desconto DECIMAL(15,2) DEFAULT 0,
  valor_total DECIMAL(15,2) DEFAULT 0,
  tipo VARCHAR(50) DEFAULT 'servico',
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para os_items
CREATE INDEX IF NOT EXISTS idx_os_items_ordem_servico_id ON os_items(ordem_servico_id);

-- ==========================================================
-- 10. TABELA: user_streaks - Criar se não existir
-- ==========================================================
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  total_activities INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ==========================================================
-- 11. TABELA: time_clock - Criar se não existir
-- ==========================================================
CREATE TABLE IF NOT EXISTS time_clock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  clock_in TIMESTAMP WITH TIME ZONE,
  clock_out TIMESTAMP WITH TIME ZONE,
  break_start TIMESTAMP WITH TIME ZONE,
  break_end TIMESTAMP WITH TIME ZONE,
  total_hours DECIMAL(5,2),
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para time_clock
CREATE INDEX IF NOT EXISTS idx_time_clock_user_id ON time_clock(user_id);
CREATE INDEX IF NOT EXISTS idx_time_clock_date ON time_clock(date);

-- ==========================================================
-- 12. TABELA: cupom_config - Criar se não existir
-- ==========================================================
CREATE TABLE IF NOT EXISTS cupom_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_nome VARCHAR(255) DEFAULT 'Prime Camp',
  empresa_cnpj VARCHAR(20),
  empresa_endereco TEXT,
  empresa_telefone VARCHAR(20),
  empresa_logo_url TEXT,
  mensagem_cabecalho TEXT,
  mensagem_rodape TEXT,
  mostrar_qrcode BOOLEAN DEFAULT TRUE,
  largura_cupom INTEGER DEFAULT 80,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir configuração padrão se não existir
INSERT INTO cupom_config (empresa_nome) 
SELECT 'Prime Camp' 
WHERE NOT EXISTS (SELECT 1 FROM cupom_config LIMIT 1);

-- ==========================================================
-- 13. TABELA: categories - Criar se não existir
-- ==========================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#3b82f6',
  icon VARCHAR(50) DEFAULT 'folder',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================
-- 14. TRIGGER: Atualizar updated_at automaticamente
-- ==========================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger às tabelas principais
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['processes', 'tasks', 'sales', 'ordens_servico', 'produtos', 'marcas', 'modelos', 'user_streaks', 'time_clock', 'cupom_config', 'categories', 'cash_register_sessions']
  LOOP
    BEGIN
      EXECUTE format('
        DROP TRIGGER IF EXISTS trigger_update_%I ON %I;
        CREATE TRIGGER trigger_update_%I
          BEFORE UPDATE ON %I
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      ', t, t, t, t);
    EXCEPTION WHEN undefined_table THEN
      -- Tabela não existe, ignorar
      NULL;
    END;
  END LOOP;
END $$;

-- ==========================================================
-- FIM DO SCRIPT
-- ==========================================================

SELECT 'Script executado com sucesso!' as status;

