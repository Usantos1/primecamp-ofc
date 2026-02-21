# Correção: Erro de Foreign Key em cashier_user_id

## Problema

Ao tentar finalizar uma venda no PDV, ocorre o erro:
```
insert or update on table "sales" violates foreign key constraint "sales_cashier_user_id_fkey"
Key (cashier_user_id)=(483dec5a-7709-4a6a-b71f-b5231d33a2fc) is not present in table "users".
```

## Causa

**A foreign key constraint `sales_cashier_user_id_fkey` está apontando para a tabela errada!**

A constraint atual está definida como:
```sql
FOREIGN KEY (cashier_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
```

Mas o sistema usa autenticação customizada e os usuários estão em `public.users`, não em `auth.users`. Por isso, mesmo que o usuário exista em `public.users`, a constraint falha porque está procurando em `auth.users`.

## Solução

**Execute o script SQL `sql/CORRIGIR_FOREIGN_KEY_CASHIER_USER_ID.sql`** para corrigir a constraint.

Este script:
1. **Remove** a constraint antiga (que aponta para `auth.users`)
2. **Cria** uma nova constraint apontando para `public.users`

### Passos para Correção

#### 1. Executar o script de correção

Execute no banco de dados:
```sql
-- Dropar constraint antiga
ALTER TABLE public.sales 
DROP CONSTRAINT IF EXISTS sales_cashier_user_id_fkey;

-- Criar nova constraint apontando para public.users
ALTER TABLE public.sales
ADD CONSTRAINT sales_cashier_user_id_fkey 
FOREIGN KEY (cashier_user_id) 
REFERENCES public.users(id) 
ON DELETE SET NULL;
```

Ou execute o script completo: `sql/CORRIGIR_FOREIGN_KEY_CASHIER_USER_ID.sql`

#### 2. Verificar a correção

Execute para confirmar:
```sql
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.sales'::regclass
    AND conname = 'sales_cashier_user_id_fkey';
```

A constraint deve mostrar: `FOREIGN KEY (cashier_user_id) REFERENCES public.users(id) ON DELETE SET NULL`

## Prevenção

Para evitar que isso aconteça novamente, é necessário garantir que:

1. **Sincronização automática**: Quando um usuário faz login pela primeira vez, criar o registro em `public.users`
2. **Validação no backend**: Verificar se o `cashier_user_id` existe antes de inserir a venda
3. **Tratamento de erro**: Se o usuário não existir, criar automaticamente ou retornar erro mais claro

## Próximos Passos

1. ✅ Criar script de verificação e correção
2. ⏳ Adicionar validação no backend para verificar/criar usuário antes de inserir venda
3. ⏳ Adicionar lógica de sincronização automática no login
