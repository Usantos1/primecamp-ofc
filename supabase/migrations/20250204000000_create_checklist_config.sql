-- ============================================
-- CONFIGURAÇÃO DE CHECKLIST PERSONALIZADO
-- ============================================

-- Tabela para armazenar configuração de checklist de entrada e saída
CREATE TABLE IF NOT EXISTS public.os_checklist_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tipo de checklist
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  
  -- Dados do item
  item_id TEXT NOT NULL, -- ID único do item (ex: 'tela_trincada')
  nome TEXT NOT NULL, -- Nome do item (ex: 'Tela Trincada')
  categoria TEXT NOT NULL CHECK (categoria IN ('fisico', 'funcional')),
  
  -- Ordem de exibição
  ordem INTEGER NOT NULL DEFAULT 0,
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_os_checklist_config_tipo ON public.os_checklist_config(tipo);
CREATE INDEX IF NOT EXISTS idx_os_checklist_config_categoria ON public.os_checklist_config(categoria);
CREATE INDEX IF NOT EXISTS idx_os_checklist_config_ativo ON public.os_checklist_config(ativo);
CREATE INDEX IF NOT EXISTS idx_os_checklist_config_ordem ON public.os_checklist_config(ordem);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_os_checklist_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_os_checklist_config_updated_at
  BEFORE UPDATE ON public.os_checklist_config
  FOR EACH ROW
  EXECUTE FUNCTION update_os_checklist_config_updated_at();

-- RLS Policies
ALTER TABLE public.os_checklist_config ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários autenticados podem ver todas as configurações
CREATE POLICY "Usuários autenticados podem ver checklist config"
  ON public.os_checklist_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Apenas admins podem inserir/atualizar/deletar
CREATE POLICY "Apenas admins podem inserir checklist config"
  ON public.os_checklist_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Apenas admins podem atualizar checklist config"
  ON public.os_checklist_config
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Apenas admins podem deletar checklist config"
  ON public.os_checklist_config
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Comentários
COMMENT ON TABLE public.os_checklist_config IS 'Configuração personalizada de checklist de entrada e saída para OS';
COMMENT ON COLUMN public.os_checklist_config.tipo IS 'Tipo de checklist: entrada ou saida';
COMMENT ON COLUMN public.os_checklist_config.item_id IS 'ID único do item (ex: tela_trincada)';
COMMENT ON COLUMN public.os_checklist_config.nome IS 'Nome do item (ex: Tela Trincada)';
COMMENT ON COLUMN public.os_checklist_config.categoria IS 'Categoria: fisico ou funcional';
COMMENT ON COLUMN public.os_checklist_config.ordem IS 'Ordem de exibição do item';
COMMENT ON COLUMN public.os_checklist_config.ativo IS 'Se o item está ativo e deve ser exibido';

-- Inserir itens padrão de entrada
INSERT INTO public.os_checklist_config (tipo, item_id, nome, categoria, ordem, ativo) VALUES
  ('entrada', 'tela_trincada', 'Tela Trincada', 'fisico', 1, true),
  ('entrada', 'tela_riscada', 'Tela Riscada', 'fisico', 2, true),
  ('entrada', 'tampa_trincada', 'Tampa Traseira Trincada', 'fisico', 3, true),
  ('entrada', 'tampa_riscada', 'Tampa Traseira Riscada', 'fisico', 4, true),
  ('entrada', 'aro_amassado', 'Aro/Lateral Amassado', 'fisico', 5, true),
  ('entrada', 'aro_riscado', 'Aro/Lateral Riscado', 'fisico', 6, true),
  ('entrada', 'botoes_quebrados', 'Botões Quebrados', 'fisico', 7, true),
  ('entrada', 'camera_trincada', 'Lente da Câmera Trincada', 'fisico', 8, true),
  ('entrada', 'entrada_danificada', 'Entrada Carregamento Danificada', 'fisico', 9, true),
  ('entrada', 'touch_ok', 'Touch Funcionando', 'funcional', 10, true),
  ('entrada', 'display_ok', 'Display Funcionando', 'funcional', 11, true),
  ('entrada', 'som_ok', 'Som Funcionando', 'funcional', 12, true),
  ('entrada', 'microfone_ok', 'Microfone Funcionando', 'funcional', 13, true),
  ('entrada', 'camera_traseira_ok', 'Câmera Traseira Funcionando', 'funcional', 14, true),
  ('entrada', 'camera_frontal_ok', 'Câmera Frontal Funcionando', 'funcional', 15, true),
  ('entrada', 'wifi_ok', 'Wi-Fi Funcionando', 'funcional', 16, true),
  ('entrada', 'bluetooth_ok', 'Bluetooth Funcionando', 'funcional', 17, true),
  ('entrada', 'carregamento_ok', 'Carregamento Funcionando', 'funcional', 18, true),
  ('entrada', 'bateria_ok', 'Bateria em Bom Estado', 'funcional', 19, true),
  ('entrada', 'biometria_ok', 'Biometria Funcionando', 'funcional', 20, true),
  ('entrada', 'face_id_ok', 'Face ID Funcionando', 'funcional', 21, true),
  ('entrada', 'sensores_ok', 'Sensores Funcionando', 'funcional', 22, true),
  ('entrada', 'botoes_ok', 'Botões Funcionando', 'funcional', 23, true),
  ('entrada', 'vibracall_ok', 'Vibracall Funcionando', 'funcional', 24, true)
ON CONFLICT DO NOTHING;

-- Inserir itens padrão de saída
INSERT INTO public.os_checklist_config (tipo, item_id, nome, categoria, ordem, ativo) VALUES
  ('saida', 'aparelho_limpo', 'Aparelho Limpo', 'fisico', 1, true),
  ('saida', 'tela_protegida', 'Tela Protegida', 'fisico', 2, true),
  ('saida', 'carcaça_ok', 'Carcaça em Bom Estado', 'fisico', 3, true),
  ('saida', 'touch_ok', 'Touch Funcionando', 'funcional', 10, true),
  ('saida', 'display_ok', 'Display Funcionando', 'funcional', 11, true),
  ('saida', 'som_ok', 'Som Funcionando', 'funcional', 12, true),
  ('saida', 'microfone_ok', 'Microfone Funcionando', 'funcional', 13, true),
  ('saida', 'camera_traseira_ok', 'Câmera Traseira Funcionando', 'funcional', 14, true),
  ('saida', 'camera_frontal_ok', 'Câmera Frontal Funcionando', 'funcional', 15, true),
  ('saida', 'wifi_ok', 'Wi-Fi Funcionando', 'funcional', 16, true),
  ('saida', 'bluetooth_ok', 'Bluetooth Funcionando', 'funcional', 17, true),
  ('saida', 'carregamento_ok', 'Carregamento Funcionando', 'funcional', 18, true),
  ('saida', 'bateria_ok', 'Bateria em Bom Estado', 'funcional', 19, true),
  ('saida', 'biometria_ok', 'Biometria Funcionando', 'funcional', 20, true),
  ('saida', 'face_id_ok', 'Face ID Funcionando', 'funcional', 21, true),
  ('saida', 'sensores_ok', 'Sensores Funcionando', 'funcional', 22, true),
  ('saida', 'botoes_ok', 'Botões Funcionando', 'funcional', 23, true),
  ('saida', 'vibracall_ok', 'Vibracall Funcionando', 'funcional', 24, true)
ON CONFLICT DO NOTHING;

