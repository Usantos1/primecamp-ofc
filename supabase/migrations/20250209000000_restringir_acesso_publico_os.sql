-- Ajuste de segurança: restringir leitura pública de OS para acompanhamento
-- Remove políticas anônimas amplas e exige header específico por OS

-- Revoga políticas anteriores de leitura pública ampla
DROP POLICY IF EXISTS "Leitura pública de OS para acompanhamento" ON public.ordens_servico;
DROP POLICY IF EXISTS "Leitura pública de clientes (apenas nome)" ON public.clientes;
DROP POLICY IF EXISTS "Leitura pública de marcas" ON public.marcas;
DROP POLICY IF EXISTS "Leitura pública de modelos" ON public.modelos;

-- Nova política: permite apenas a OS cujo ID foi enviado no header x-os-id (usado pelo QR)
CREATE POLICY "Leitura pública de OS por header seguro"
  ON public.ordens_servico
  FOR SELECT
  TO anon
  USING (
    -- Se o header não existir ou estiver vazio, bloqueia
    NULLIF(current_setting('request.headers.x-os-id', true), '') IS NOT NULL
    AND id = NULLIF(current_setting('request.headers.x-os-id', true), '')::uuid
  );

COMMENT ON POLICY "Leitura pública de OS por header seguro" ON public.ordens_servico IS
'Permite leitura anônima apenas da OS cujo ID foi enviado no header x-os-id (QR). Demais tabelas não são mais públicas.';

