-- ============================================
-- CRIAR POLÍTICA RLS PARA UPLOAD NO BUCKET OS-REFERENCE-IMAGES
-- ============================================
-- NOTA: No Supabase, políticas de Storage devem ser criadas via interface ou usando
-- a função storage.create_policy. Este SQL tenta criar usando a função correta.

-- IMPORTANTE: Se este SQL não funcionar, use a interface do Supabase:
-- Storage > Policies > New policy > For full customization

-- Tentar criar política usando função do Supabase (se disponível)
-- Se não funcionar, use a interface gráfica conforme instruções abaixo

DO $$
BEGIN
  -- Verificar se a política já existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Permitir upload autenticado os-reference-images'
  ) THEN
    -- Criar política usando SQL direto (requer permissões de superuser)
    EXECUTE '
    CREATE POLICY "Permitir upload autenticado os-reference-images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = ''os-reference-images''::text AND
      auth.role() = ''authenticated''::text
    )';
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Permissões insuficientes. Use a interface do Supabase Dashboard > Storage > Policies para criar a política manualmente.';
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao criar política: %. Use a interface do Supabase Dashboard > Storage > Policies para criar a política manualmente.', SQLERRM;
END $$;

-- INSTRUÇÕES ALTERNATIVAS (se o SQL acima não funcionar):
-- 
-- 1. Acesse: Supabase Dashboard > Storage > Policies
-- 2. Clique em "New policy" ao lado de "OS-REFERENCE-IMAGES"
-- 3. Escolha "For full customization"
-- 4. Preencha:
--    - Policy name: "Permitir upload autenticado"
--    - Allowed operation: INSERT
--    - Target roles: authenticated
--    - USING expression: (bucket_id = 'os-reference-images'::text)
--    - WITH CHECK expression: (bucket_id = 'os-reference-images'::text AND auth.role() = 'authenticated'::text)
-- 5. Salve a política

