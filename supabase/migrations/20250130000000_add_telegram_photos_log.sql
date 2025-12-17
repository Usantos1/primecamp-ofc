-- ============================================
-- LOGS DE FOTOS ENVIADAS PARA TELEGRAM
-- ============================================

-- Tabela para armazenar logs e links das fotos enviadas para Telegram
CREATE TABLE IF NOT EXISTS public.os_telegram_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referência à OS (pode ser ID do localStorage ou UUID se migrar para banco)
  ordem_servico_id TEXT NOT NULL,
  ordem_servico_numero INTEGER NOT NULL,
  
  -- Informações da foto
  file_name TEXT NOT NULL,
  file_url TEXT, -- URL da foto no Telegram
  file_id TEXT, -- File ID do Telegram (para download futuro)
  message_id BIGINT, -- ID da mensagem no Telegram
  
  -- Tipo da foto
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'processo', 'saida')),
  
  -- Chat ID do Telegram onde foi enviada
  telegram_chat_id TEXT NOT NULL,
  
  -- Status do envio
  status TEXT NOT NULL DEFAULT 'enviado' CHECK (status IN ('enviado', 'erro', 'processando')),
  error_message TEXT,
  
  -- Metadados
  file_size BIGINT, -- Tamanho do arquivo em bytes
  mime_type TEXT, -- Tipo MIME da imagem
  
  -- Timestamps
  enviado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_os_telegram_photos_os_id ON public.os_telegram_photos(ordem_servico_id);
CREATE INDEX IF NOT EXISTS idx_os_telegram_photos_os_numero ON public.os_telegram_photos(ordem_servico_numero);
CREATE INDEX IF NOT EXISTS idx_os_telegram_photos_tipo ON public.os_telegram_photos(tipo);
CREATE INDEX IF NOT EXISTS idx_os_telegram_photos_chat_id ON public.os_telegram_photos(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_os_telegram_photos_enviado_em ON public.os_telegram_photos(enviado_em DESC);
CREATE INDEX IF NOT EXISTS idx_os_telegram_photos_status ON public.os_telegram_photos(status);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_os_telegram_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_os_telegram_photos_updated_at
  BEFORE UPDATE ON public.os_telegram_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_os_telegram_photos_updated_at();

-- RLS (Row Level Security)
ALTER TABLE public.os_telegram_photos ENABLE ROW LEVEL SECURITY;

-- Política: Usuários autenticados podem ver todas as fotos
CREATE POLICY "Authenticated users can view telegram photos" 
  ON public.os_telegram_photos 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Política: Usuários autenticados podem inserir fotos
CREATE POLICY "Authenticated users can insert telegram photos" 
  ON public.os_telegram_photos 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Política: Usuários autenticados podem atualizar fotos
CREATE POLICY "Authenticated users can update telegram photos" 
  ON public.os_telegram_photos 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- Política: Apenas admins podem deletar fotos
CREATE POLICY "Admins can delete telegram photos" 
  ON public.os_telegram_photos 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Comentários para documentação
COMMENT ON TABLE public.os_telegram_photos IS 'Logs e links das fotos enviadas para Telegram das OSs';
COMMENT ON COLUMN public.os_telegram_photos.ordem_servico_id IS 'ID da OS (pode ser do localStorage ou UUID)';
COMMENT ON COLUMN public.os_telegram_photos.ordem_servico_numero IS 'Número da OS para busca rápida';
COMMENT ON COLUMN public.os_telegram_photos.file_url IS 'URL da foto no Telegram (se disponível)';
COMMENT ON COLUMN public.os_telegram_photos.file_id IS 'File ID do Telegram para download futuro';
COMMENT ON COLUMN public.os_telegram_photos.message_id IS 'ID da mensagem no Telegram';
COMMENT ON COLUMN public.os_telegram_photos.tipo IS 'Tipo da foto: entrada, processo ou saida';
COMMENT ON COLUMN public.os_telegram_photos.telegram_chat_id IS 'Chat ID do Telegram onde foi enviada';

-- ============================================
-- FUNÇÃO PARA BUSCAR FOTOS DE UMA OS
-- ============================================
CREATE OR REPLACE FUNCTION get_os_telegram_photos(p_os_id TEXT)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  file_url TEXT,
  file_id TEXT,
  message_id BIGINT,
  tipo TEXT,
  telegram_chat_id TEXT,
  status TEXT,
  enviado_em TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    otp.id,
    otp.file_name,
    otp.file_url,
    otp.file_id,
    otp.message_id,
    otp.tipo,
    otp.telegram_chat_id,
    otp.status,
    otp.enviado_em
  FROM public.os_telegram_photos otp
  WHERE otp.ordem_servico_id = p_os_id
  ORDER BY otp.enviado_em DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNÇÃO PARA BUSCAR FOTOS POR TIPO
-- ============================================
CREATE OR REPLACE FUNCTION get_os_telegram_photos_by_type(
  p_os_id TEXT,
  p_tipo TEXT
)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  file_url TEXT,
  file_id TEXT,
  message_id BIGINT,
  tipo TEXT,
  telegram_chat_id TEXT,
  status TEXT,
  enviado_em TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    otp.id,
    otp.file_name,
    otp.file_url,
    otp.file_id,
    otp.message_id,
    otp.tipo,
    otp.telegram_chat_id,
    otp.status,
    otp.enviado_em
  FROM public.os_telegram_photos otp
  WHERE otp.ordem_servico_id = p_os_id
    AND otp.tipo = p_tipo
  ORDER BY otp.enviado_em DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

