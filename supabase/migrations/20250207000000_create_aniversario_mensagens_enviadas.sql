-- ============================================
-- TABELA DE CONTROLE DE MENSAGENS DE ANIVERSÁRIO ENVIADAS
-- ============================================

CREATE TABLE IF NOT EXISTS public.aniversario_mensagens_enviadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  data_envio DATE NOT NULL,
  horario_envio TIME NOT NULL,
  mensagem_enviada TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'enviado' CHECK (status IN ('enviado', 'erro')),
  erro_mensagem TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_aniversario_mensagens_cliente_data 
  ON public.aniversario_mensagens_enviadas(cliente_id, data_envio);

CREATE INDEX IF NOT EXISTS idx_aniversario_mensagens_data_envio 
  ON public.aniversario_mensagens_enviadas(data_envio);

-- Índice para verificar se já foi enviado hoje
CREATE UNIQUE INDEX IF NOT EXISTS idx_aniversario_mensagens_unique 
  ON public.aniversario_mensagens_enviadas(cliente_id, data_envio) 
  WHERE status = 'enviado';

-- RLS Policies
ALTER TABLE public.aniversario_mensagens_enviadas ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários autenticados podem ver todas as mensagens enviadas
CREATE POLICY "Usuários autenticados podem ver mensagens de aniversário"
  ON public.aniversario_mensagens_enviadas
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Apenas o sistema (service role) pode inserir mensagens
-- (Edge functions usam service role key)

COMMENT ON TABLE public.aniversario_mensagens_enviadas IS 'Registro de mensagens de aniversário enviadas para clientes';
COMMENT ON COLUMN public.aniversario_mensagens_enviadas.cliente_id IS 'ID do cliente que recebeu a mensagem';
COMMENT ON COLUMN public.aniversario_mensagens_enviadas.data_envio IS 'Data em que a mensagem foi enviada';
COMMENT ON COLUMN public.aniversario_mensagens_enviadas.horario_envio IS 'Horário em que a mensagem foi enviada';
COMMENT ON COLUMN public.aniversario_mensagens_enviadas.mensagem_enviada IS 'Conteúdo da mensagem enviada';
COMMENT ON COLUMN public.aniversario_mensagens_enviadas.status IS 'Status do envio (enviado ou erro)';


