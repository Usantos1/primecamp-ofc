-- ============================================
-- LIMPAR PERMISSÕES INDEVIDAS DE VENDEDORES
-- Remove permissões de OS, produtos, etc de usuários com role vendedor
-- ============================================

-- Remover permissões customizadas de OS, produtos, assistência de usuários vendedores
DELETE FROM public.user_permissions up
USING public.user_position_departments upd
JOIN public.roles r ON r.id = upd.role_id
JOIN public.permissions p ON p.id = up.permission_id
WHERE upd.user_id = up.user_id
  AND r.name = 'vendedor'
  AND (
    p.resource IN ('os', 'produtos', 'os.config')
    OR (p.resource = 'assistencia')
  );

-- Remover permissões customizadas de financeiro de vendedores
DELETE FROM public.user_permissions up
USING public.user_position_departments upd
JOIN public.roles r ON r.id = upd.role_id
JOIN public.permissions p ON p.id = up.permission_id
WHERE upd.user_id = up.user_id
  AND r.name = 'vendedor'
  AND p.resource = 'financeiro';

-- Garantir que vendedores não tenham role_id que dê acesso a OS
-- (isso já está correto na migration, mas vamos garantir)
UPDATE public.user_position_departments upd
SET role_id = NULL
WHERE EXISTS (
  SELECT 1 FROM public.roles r
  WHERE r.id = upd.role_id
  AND r.name IN ('tecnico', 'atendente')
)
AND EXISTS (
  SELECT 1 FROM public.user_position_departments upd2
  JOIN public.roles r2 ON r2.id = upd2.role_id
  WHERE upd2.user_id = upd.user_id
  AND r2.name = 'vendedor'
  AND upd2.is_primary = true
);

COMMENT ON FUNCTION public.has_permission IS 'Verifica se um usuário tem uma permissão específica. Vendedores NÃO têm acesso a OS, produtos ou financeiro.';

