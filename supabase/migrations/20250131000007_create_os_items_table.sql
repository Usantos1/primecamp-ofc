-- ============================================
-- TABELA DE ITENS DE ORDEM DE SERVIÇO
-- ============================================

CREATE TABLE IF NOT EXISTS public.os_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_servico_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  
  -- Tipo e descrição
  tipo TEXT NOT NULL CHECK (tipo IN ('peca', 'servico', 'mao_de_obra')),
  descricao TEXT NOT NULL,
  
  -- Quantidade e valores
  quantidade NUMERIC(10,3) NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_minimo NUMERIC(12,2) DEFAULT 0,
  desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Garantia
  garantia INTEGER DEFAULT 0, -- Garantia em dias
  
  -- Colaborador
  colaborador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  colaborador_nome TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_os_items_ordem_servico_id ON public.os_items(ordem_servico_id);
CREATE INDEX IF NOT EXISTS idx_os_items_produto_id ON public.os_items(produto_id);
CREATE INDEX IF NOT EXISTS idx_os_items_tipo ON public.os_items(tipo);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_os_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_os_items_updated_at
  BEFORE UPDATE ON public.os_items
  FOR EACH ROW
  EXECUTE FUNCTION update_os_items_updated_at();

-- RLS Policies
ALTER TABLE public.os_items ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários autenticados podem ver itens de OS
CREATE POLICY "Usuários autenticados podem ver itens de OS"
  ON public.os_items
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Usuários autenticados podem criar itens de OS
CREATE POLICY "Usuários autenticados podem criar itens de OS"
  ON public.os_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Usuários autenticados podem atualizar itens de OS
CREATE POLICY "Usuários autenticados podem atualizar itens de OS"
  ON public.os_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Usuários autenticados podem deletar itens de OS
CREATE POLICY "Usuários autenticados podem deletar itens de OS"
  ON public.os_items
  FOR DELETE
  TO authenticated
  USING (true);

