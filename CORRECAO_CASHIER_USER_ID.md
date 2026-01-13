# Correção: Erro de Foreign Key em cashier_user_id

## Problema

Ao tentar finalizar uma venda no PDV, ocorre o erro:
```
insert or update on table "sales" violates foreign key constraint "sales_cashier_user_id_fkey"
Key (cashier_user_id)=(483dec5a-7709-4a6a-b71f-b5231d33a2fc) is not present in table "users".
```

## Causa

O usuário está autenticado (existe em `auth.users` do Supabase Auth), mas não existe na tabela `public.users` do PostgreSQL. A foreign key constraint `sales_cashier_user_id_fkey` exige que o `cashier_user_id` aponte para um registro válido em `public.users`.

## Solução

Execute o script SQL `sql/VERIFICAR_E_CORRIGIR_CASHIER_USER_ID.sql` para:

1. **Verificar** se o usuário existe em `public.users`
2. **Listar** usuários existentes
3. **Verificar** a constraint de foreign key
4. **Criar** o usuário em `public.users` se não existir

## Passos para Correção

### 1. Verificar o problema

Execute no banco de dados:
```sql
SELECT 
    id,
    email,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = '483dec5a-7709-4a6a-b71f-b5231d33a2fc'
        ) THEN '✅ EXISTE'
        ELSE '❌ NÃO EXISTE'
    END as status
FROM auth.users
WHERE id = '483dec5a-7709-4a6a-b71f-b5231d33a2fc';
```

### 2. Criar o usuário em public.users

Se o usuário não existir em `public.users`, execute:
```sql
DO $$ 
DECLARE
    user_id UUID := '483dec5a-7709-4a6a-b71f-b5231d33a2fc';
    user_email TEXT;
    user_role TEXT;
    admin_company_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Buscar dados do usuário em auth.users
    SELECT email, raw_user_meta_data->>'role' INTO user_email, user_role
    FROM auth.users 
    WHERE id = user_id;
    
    IF user_email IS NULL THEN
        RAISE EXCEPTION 'Usuário com ID % não existe em auth.users.', user_id;
    END IF;
    
    -- Criar usuário em public.users se não existir
    INSERT INTO public.users (id, email, company_id, created_at)
    VALUES (user_id, user_email, admin_company_id, NOW())
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
    
    RAISE NOTICE '✅ Usuário % criado/atualizado em public.users', user_id;
END $$;
```

### 3. Verificar outras vendas com problema

Execute para encontrar outras vendas com o mesmo problema:
```sql
SELECT 
    s.id,
    s.numero,
    s.cashier_user_id,
    s.created_at,
    CASE 
        WHEN u.id IS NOT NULL THEN '✅ OK'
        ELSE '❌ PROBLEMA'
    END as status
FROM public.sales s
LEFT JOIN public.users u ON s.cashier_user_id = u.id
WHERE s.cashier_user_id IS NOT NULL
    AND u.id IS NULL
ORDER BY s.created_at DESC;
```

## Prevenção

Para evitar que isso aconteça novamente, é necessário garantir que:

1. **Sincronização automática**: Quando um usuário faz login pela primeira vez, criar o registro em `public.users`
2. **Validação no backend**: Verificar se o `cashier_user_id` existe antes de inserir a venda
3. **Tratamento de erro**: Se o usuário não existir, criar automaticamente ou retornar erro mais claro

## Próximos Passos

1. ✅ Criar script de verificação e correção
2. ⏳ Adicionar validação no backend para verificar/criar usuário antes de inserir venda
3. ⏳ Adicionar lógica de sincronização automática no login
