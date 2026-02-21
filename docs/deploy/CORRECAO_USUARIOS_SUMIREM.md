# Correção: Usuários Sumiram

## Problema

Os usuários não estão aparecendo no sistema. Isso pode acontecer por várias razões:

1. **Filtro por `company_id`**: O sistema filtra usuários por `company_id`, então usuários sem `company_id` não aparecem
2. **Usuários com `company_id` NULL**: Se os usuários foram criados antes da migração de multi-tenancy, eles podem estar sem `company_id`
3. **Empresa diferente**: Usuários podem estar associados a uma empresa diferente da do usuário logado

## Diagnóstico

Execute o script SQL abaixo para verificar o status dos usuários:

```bash
# No VPS, acesse o PostgreSQL
sudo -u postgres psql -d primecamp -f sql/VERIFICAR_E_CORRIGIR_USERS.sql
```

Ou execute diretamente no cliente SQL (DBeaver, pgAdmin, etc.):

**Arquivo:** `sql/VERIFICAR_E_CORRIGIR_USERS.sql`

## Solução Rápida

Se os usuários estão sem `company_id`, execute o script de correção:

```sql
-- Script para corrigir usuários sem company_id
DO $$ 
DECLARE
    admin_company_id UUID := '00000000-0000-0000-0000-000000000001';
    users_updated INTEGER;
BEGIN
    -- Verificar se empresa admin existe
    IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = admin_company_id) THEN
        RAISE EXCEPTION 'Empresa admin não encontrada!';
    END IF;
    
    -- Atualizar usuários sem company_id
    UPDATE public.users 
    SET company_id = admin_company_id 
    WHERE company_id IS NULL;
    
    GET DIAGNOSTICS users_updated = ROW_COUNT;
    
    RAISE NOTICE '✅ % usuário(s) atualizado(s)', users_updated;
END $$;
```

## Verificação Manual

Para verificar manualmente no banco:

```sql
-- Ver quantos usuários existem
SELECT COUNT(*) FROM public.users;

-- Ver usuários sem company_id
SELECT id, email, company_id, created_at 
FROM public.users 
WHERE company_id IS NULL;

-- Ver todos os usuários
SELECT u.id, u.email, u.company_id, c.name as empresa
FROM public.users u
LEFT JOIN public.companies c ON u.company_id = c.id
ORDER BY u.created_at DESC;
```

## Após a Correção

1. **Reinicie o backend** para garantir que as mudanças sejam refletidas
2. **Faça logout e login novamente** no frontend
3. **Verifique se os usuários aparecem** em `/admin/users`

## Prevenção

Para evitar que isso aconteça no futuro:

1. Certifique-se de que novos usuários sempre recebem `company_id` no cadastro
2. Verifique se a migração `ADICIONAR_COMPANY_ID_USERS.sql` foi executada
3. Monitore logs do backend para erros relacionados a `company_id`
