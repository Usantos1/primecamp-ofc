-- ============================================================
-- LIMPAR FUNÇÕES DUPLICADAS - VERSÃO SIMPLES E FUNCIONAL
-- ============================================================
-- Mantém a função com MAIS permissões (Vendedor com 41, Gerente com 15)

DO $$
DECLARE
    role_record RECORD;
    role_to_keep_id UUID;
    role_to_keep_name TEXT;
BEGIN
    -- Para cada nome de função duplicada
    FOR role_record IN 
        SELECT name, COUNT(*) as count
        FROM roles
        GROUP BY name
        HAVING COUNT(*) > 1
    LOOP
        -- Encontrar qual função manter (com mais permissões)
        SELECT 
            r.id,
            r.name,
            COUNT(rp.permission_id) as perm_count
        INTO 
            role_to_keep_id,
            role_to_keep_name
        FROM roles r
        LEFT JOIN role_permissions rp ON rp.role_id = r.id
        WHERE r.name = role_record.name
        GROUP BY r.id, r.name, r.updated_at, r.created_at
        ORDER BY 
            COUNT(rp.permission_id) DESC,  -- Mais permissões primeiro
            r.updated_at DESC,              -- Mais recente segundo
            r.created_at ASC                -- Mais antiga terceiro
        LIMIT 1;
        
        RAISE NOTICE 'Função: % - Mantendo ID: % (nome: %)', role_record.name, role_to_keep_id, role_to_keep_name;
        
        -- Atualizar usuários que estão usando outras versões desta função
        UPDATE profiles
        SET role = role_to_keep_name
        WHERE role = role_record.name
        AND EXISTS (
            SELECT 1 FROM roles 
            WHERE id = role_to_keep_id
        );
        
        -- Deletar permissões das funções duplicadas (exceto a que vamos manter)
        DELETE FROM role_permissions
        WHERE role_id IN (
            SELECT id 
            FROM roles 
            WHERE name = role_record.name 
            AND id != role_to_keep_id
        );
        
        -- Deletar as funções duplicadas (exceto a que vamos manter)
        DELETE FROM roles
        WHERE name = role_record.name
        AND id != role_to_keep_id;
        
        RAISE NOTICE '  Funções duplicadas removidas para: %', role_record.name;
    END LOOP;
    
    RAISE NOTICE 'Limpeza concluída!';
END $$;

-- Verificar resultado
SELECT 
    name,
    display_name,
    COUNT(*) as quantidade
FROM roles
GROUP BY name, display_name
HAVING COUNT(*) > 1;

-- Se retornar 0 linhas, não há mais duplicações! ✅
