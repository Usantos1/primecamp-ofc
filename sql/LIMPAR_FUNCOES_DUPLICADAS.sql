-- ============================================================
-- LIMPAR FUNÇÕES (ROLES) DUPLICADAS
-- ============================================================
-- Este script mantém apenas UMA função de cada tipo, preservando:
-- - A função com MAIS permissões associadas
-- - Se empatar, mantém a MAIS RECENTE (updated_at mais recente)
-- - Se empatar novamente, mantém a MAIS ANTIGA (created_at mais antiga)

DO $$
DECLARE
    dup_role RECORD;
    role_to_keep UUID;
    role_to_delete UUID;
    permission_count INTEGER;
    max_permissions INTEGER;
BEGIN
    -- Para cada função duplicada
    FOR dup_role IN 
        SELECT name, COUNT(*) as count
        FROM roles
        GROUP BY name
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE 'Processando função duplicada: %', dup_role.name;
        
        -- Encontrar a função a MANTER (com mais permissões, mais recente, ou mais antiga)
        SELECT 
            r.id,
            COUNT(rp.permission_id)::INTEGER as perm_count
        INTO 
            role_to_keep,
            max_permissions
        FROM roles r
        LEFT JOIN role_permissions rp ON rp.role_id = r.id
        WHERE r.name = dup_role.name
        GROUP BY r.id, r.updated_at, r.created_at
        ORDER BY 
            COUNT(rp.permission_id) DESC,  -- Mais permissões primeiro
            r.updated_at DESC,              -- Mais recente segundo
            r.created_at ASC                -- Mais antiga terceiro
        LIMIT 1;
        
        RAISE NOTICE '  Mantendo função ID: % (com % permissões)', role_to_keep, max_permissions;
        
        -- Para cada função duplicada (exceto a que vamos manter)
        FOR role_to_delete IN 
            SELECT id 
            FROM roles 
            WHERE name = dup_role.name 
            AND id != role_to_keep
            ORDER BY created_at
        LOOP
            RAISE NOTICE '  Deletando função ID: %', role_to_delete;
            
            -- Verificar quantos usuários estão usando esta função
            SELECT COUNT(*) INTO permission_count
            FROM profiles
            WHERE role = (SELECT name FROM roles WHERE id = role_to_delete);
            
            IF permission_count > 0 THEN
                RAISE NOTICE '    ATENÇÃO: % usuários estão usando esta função. Atualizando para função mantida...', permission_count;
                
                -- Atualizar usuários para usar a função mantida
                UPDATE profiles
                SET role = (SELECT name FROM roles WHERE id = role_to_keep)
                WHERE role = (SELECT name FROM roles WHERE id = role_to_delete);
            END IF;
            
            -- Deletar permissões associadas (cascade)
            DELETE FROM role_permissions WHERE role_id = role_to_delete;
            
            -- Deletar a função
            DELETE FROM roles WHERE id = role_to_delete;
            
            RAISE NOTICE '    Função deletada com sucesso';
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Limpeza de funções duplicadas concluída!';
END $$;

-- Verificar resultado
SELECT 
    name,
    display_name,
    COUNT(*) as quantidade
FROM roles
GROUP BY name, display_name
HAVING COUNT(*) > 1;

-- Se retornar 0 linhas, não há mais duplicações!
