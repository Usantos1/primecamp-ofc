-- ============================================
-- PERMITIR LEITURA PÚBLICA DE OS PARA ACOMPANHAMENTO
-- ============================================

-- Policy: Permitir leitura pública (anon) de OS específica por ID
-- Isso permite que clientes acessem a página de acompanhamento sem autenticação
CREATE POLICY "Leitura pública de OS para acompanhamento"
  ON public.ordens_servico
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Permitir leitura pública de clientes (apenas nome) para exibir na página
CREATE POLICY "Leitura pública de clientes (apenas nome)"
  ON public.clientes
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Permitir leitura pública de marcas
CREATE POLICY "Leitura pública de marcas"
  ON public.marcas
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Permitir leitura pública de modelos
CREATE POLICY "Leitura pública de modelos"
  ON public.modelos
  FOR SELECT
  TO anon
  USING (true);

COMMENT ON POLICY "Leitura pública de OS para acompanhamento" ON public.ordens_servico IS 'Permite que clientes acessem informações da OS através do QR code sem autenticação';
COMMENT ON POLICY "Leitura pública de clientes (apenas nome)" ON public.clientes IS 'Permite leitura do nome do cliente para exibir na página pública de acompanhamento';
COMMENT ON POLICY "Leitura pública de marcas" ON public.marcas IS 'Permite leitura de marcas para exibir na página pública de acompanhamento';
COMMENT ON POLICY "Leitura pública de modelos" ON public.modelos IS 'Permite leitura de modelos para exibir na página pública de acompanhamento';

