-- ============================================
-- APLICAR CONFIGURAÇÃO DO CUPOM TÉRMICO
-- Execute este script no Supabase Studio > SQL Editor
-- ============================================

-- ============================================
-- CONFIGURAÇÕES DO CUPOM TÉRMICO
-- ============================================

CREATE TABLE IF NOT EXISTS public.cupom_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Dados da Empresa
  empresa_nome TEXT NOT NULL DEFAULT 'PRIME CAMP',
  empresa_cnpj TEXT,
  empresa_ie TEXT, -- Inscrição Estadual
  empresa_endereco TEXT,
  empresa_telefone TEXT,
  empresa_whatsapp TEXT,
  
  -- Logo
  logo_url TEXT, -- URL da imagem do logo (armazenada no Supabase Storage)
  
  -- Termos de Garantia
  termos_garantia TEXT DEFAULT 'Esse comprovante de venda é sua Garantia, portando guarde-o com cuidado. A Garantia não cobre mau uso do cliente. (pressão, impacto, quebra, umidade, calor excessivo).',
  
  -- Configurações de Impressão
  mostrar_logo BOOLEAN DEFAULT true,
  mostrar_qr_code BOOLEAN DEFAULT true,
  mensagem_rodape TEXT DEFAULT 'Obrigado pela preferência! Volte sempre',
  imprimir_2_vias BOOLEAN DEFAULT false,
  imprimir_sem_dialogo BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índice único para garantir apenas uma configuração
CREATE UNIQUE INDEX IF NOT EXISTS idx_cupom_config_single ON public.cupom_config((1));

-- RLS
ALTER TABLE public.cupom_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Authenticated users can view cupom config" ON public.cupom_config;
CREATE POLICY "Authenticated users can view cupom config" ON public.cupom_config
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can insert cupom config" ON public.cupom_config;
CREATE POLICY "Admins can insert cupom config" ON public.cupom_config
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update cupom config" ON public.cupom_config;
CREATE POLICY "Admins can update cupom config" ON public.cupom_config
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_cupom_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_cupom_config_updated_at ON public.cupom_config;
CREATE TRIGGER update_cupom_config_updated_at
  BEFORE UPDATE ON public.cupom_config
  FOR EACH ROW
  EXECUTE FUNCTION update_cupom_config_updated_at();

-- Inserir configuração padrão
INSERT INTO public.cupom_config (
  empresa_nome,
  empresa_cnpj,
  empresa_ie,
  empresa_endereco,
  empresa_telefone,
  empresa_whatsapp,
  termos_garantia
) VALUES (
  'PRIME CAMP ASSISTÊNCIA TÉCNICA',
  '31.833.574/0001-74',
  '122.047.010.118',
  'AV COM EMILIO PIERI, 823 CONJ. HABIT. VIDA NOVA, CAMPINAS',
  '(19) 98768-0453',
  '(19) 98768-0453',
  'Esse comprovante de venda é sua Garantia, portando guarde-o com cuidado. A Garantia não cobre mau uso do cliente. (pressão, impacto, quebra, umidade, calor excessivo).'
) ON CONFLICT DO NOTHING;

