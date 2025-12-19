-- ============================================
-- APLICAR TODAS AS MIGRATIONS: RECORRÊNCIA E ORDENS DE SERVIÇO
-- ============================================

-- 1. Adicionar recorrência em accounts_receivable
ALTER TABLE public.accounts_receivable
ADD COLUMN IF NOT EXISTS recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurring_day INTEGER,
ADD COLUMN IF NOT EXISTS parent_receivable_id UUID REFERENCES public.accounts_receivable(id) ON DELETE SET NULL;

-- Índices para facilitar busca de contas recorrentes
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_recurring ON public.accounts_receivable(recurring);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_parent ON public.accounts_receivable(parent_receivable_id);

-- 2. Criar tabela de ordens de serviço
CREATE TABLE IF NOT EXISTS public.ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INTEGER NOT NULL UNIQUE,
  situacao TEXT NOT NULL DEFAULT 'aberta' CHECK (situacao IN ('aberta', 'fechada', 'cancelada')),
  status TEXT NOT NULL DEFAULT 'aberta',
  
  -- Datas
  data_entrada DATE NOT NULL,
  hora_entrada TIME,
  previsao_entrega DATE,
  hora_previsao TIME,
  data_conclusao DATE,
  data_entrega DATE,
  data_saida DATE,
  
  -- Cliente
  cliente_id UUID,
  cliente_nome TEXT,
  cliente_empresa TEXT,
  telefone_contato TEXT NOT NULL,
  
  -- Aparelho
  tipo_aparelho TEXT NOT NULL DEFAULT 'Celular',
  marca_id UUID,
  marca_nome TEXT,
  modelo_id UUID,
  modelo_nome TEXT,
  imei TEXT,
  numero_serie TEXT,
  cor TEXT,
  senha_aparelho TEXT,
  senha_numerica TEXT,
  padrao_desbloqueio TEXT,
  possui_senha BOOLEAN DEFAULT false,
  possui_senha_tipo TEXT,
  deixou_aparelho BOOLEAN DEFAULT true,
  apenas_agendamento BOOLEAN DEFAULT false,
  
  -- Problema
  descricao_problema TEXT NOT NULL,
  descricao_servico TEXT,
  problema_constatado TEXT,
  laudo_tecnico TEXT,
  
  -- Resolução
  tecnico_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tecnico_nome TEXT,
  servico_executado TEXT,
  
  -- Checklist
  checklist_entrada JSONB DEFAULT '[]'::jsonb,
  checklist_saida JSONB DEFAULT '[]'::jsonb,
  areas_defeito JSONB DEFAULT '[]'::jsonb,
  observacoes_checklist TEXT,
  
  -- Condições
  condicoes_equipamento TEXT,
  observacoes TEXT,
  observacoes_internas TEXT,
  
  -- Orçamento
  orcamento_parcelado NUMERIC(12,2),
  orcamento_desconto NUMERIC(12,2),
  orcamento_autorizado BOOLEAN DEFAULT false,
  
  -- Valores
  subtotal NUMERIC(12,2) DEFAULT 0,
  desconto NUMERIC(12,2) DEFAULT 0,
  valor_total NUMERIC(12,2) DEFAULT 0,
  valor_pago NUMERIC(12,2) DEFAULT 0,
  
  -- Vendedor/Atendente
  vendedor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  vendedor_nome TEXT,
  atendente_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  atendente_nome TEXT,
  
  -- Garantia
  garantia_dias INTEGER,
  
  -- Fotos
  fotos_entrada JSONB DEFAULT '[]'::jsonb,
  fotos_saida JSONB DEFAULT '[]'::jsonb,
  fotos_processo JSONB DEFAULT '[]'::jsonb,
  fotos_telegram_entrada JSONB DEFAULT '[]'::jsonb,
  fotos_telegram_processo JSONB DEFAULT '[]'::jsonb,
  fotos_telegram_saida JSONB DEFAULT '[]'::jsonb,
  telegram_chat_id_entrada TEXT,
  telegram_chat_id_processo TEXT,
  telegram_chat_id_saida TEXT,
  fotos_drive_folder_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices para ordens de serviço
CREATE INDEX IF NOT EXISTS idx_ordens_servico_numero ON public.ordens_servico(numero);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_situacao ON public.ordens_servico(situacao);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_status ON public.ordens_servico(status);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_data_entrada ON public.ordens_servico(data_entrada);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_cliente_id ON public.ordens_servico(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_tecnico_id ON public.ordens_servico(tecnico_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_ordens_servico_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ordens_servico_updated_at ON public.ordens_servico;
CREATE TRIGGER trigger_update_ordens_servico_updated_at
  BEFORE UPDATE ON public.ordens_servico
  FOR EACH ROW
  EXECUTE FUNCTION update_ordens_servico_updated_at();

-- RLS Policies para ordens de serviço
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários autenticados podem ver ordens de serviço" ON public.ordens_servico;
CREATE POLICY "Usuários autenticados podem ver ordens de serviço"
  ON public.ordens_servico
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem criar ordens de serviço" ON public.ordens_servico;
CREATE POLICY "Usuários autenticados podem criar ordens de serviço"
  ON public.ordens_servico
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários autenticados podem atualizar ordens de serviço" ON public.ordens_servico;
CREATE POLICY "Usuários autenticados podem atualizar ordens de serviço"
  ON public.ordens_servico
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários autenticados podem deletar ordens de serviço" ON public.ordens_servico;
CREATE POLICY "Usuários autenticados podem deletar ordens de serviço"
  ON public.ordens_servico
  FOR DELETE
  TO authenticated
  USING (true);

-- Atualizar referência em sales para usar a nova tabela
DO $$
BEGIN
  -- Verificar se a coluna já existe antes de adicionar
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales' 
    AND column_name = 'ordem_servico_id'
  ) THEN
    ALTER TABLE public.sales 
    ADD COLUMN ordem_servico_id UUID REFERENCES public.ordens_servico(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_sales_ordem_servico_id ON public.sales(ordem_servico_id);
  END IF;
END $$;

-- Atualizar referência em accounts_receivable para usar a nova tabela
DO $$
BEGIN
  -- Verificar se a coluna já existe antes de adicionar
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'accounts_receivable' 
    AND column_name = 'ordem_servico_id'
  ) THEN
    ALTER TABLE public.accounts_receivable 
    ADD COLUMN ordem_servico_id UUID REFERENCES public.ordens_servico(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_accounts_receivable_os_id ON public.accounts_receivable(ordem_servico_id);
  END IF;
END $$;

