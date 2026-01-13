# Diagnóstico: Problemas em /admin/users

## Problemas Reportados

1. **Não lista todos os usuários**
2. **Não cadastra novos usuários** (erro: "Este email já está cadastrado")

## Análise do Código

### 1. Listagem de Usuários

O componente `UserManagementNew.tsx` está **corretamente** filtrando usuários por `company_id`:

```typescript
// Linha 141-142
if (currentCompanyId) {
  usersQuery = usersQuery.eq('company_id', currentCompanyId);
}
```

**Isso é o comportamento esperado para multi-tenancy** - cada empresa só vê seus próprios usuários.

### 2. Cadastro de Usuários

O endpoint `/api/auth/signup` verifica se o email já existe **globalmente** (sem filtro por `company_id`):

```javascript
// Linha 946-949
const existingUser = await pool.query(
  'SELECT id FROM users WHERE email = $1',
  [email.toLowerCase().trim()]
);
```

A tabela `users` tem constraint `UNIQUE` no campo `email` (definido na migration), então:
- **Email é único globalmente** (não por empresa)
- Se "natalia@primecamp.com.br" já existe, não pode cadastrar novamente

## Verificações Necessárias

Execute o script SQL para diagnosticar:

```sql
-- Ver todos os usuários
SELECT 
    u.id,
    u.email,
    u.company_id,
    c.name as empresa,
    p.display_name
FROM public.users u
LEFT JOIN public.companies c ON u.company_id = c.id
LEFT JOIN public.profiles p ON u.id = p.user_id
ORDER BY u.created_at DESC;
```

## Possíveis Causas

### Problema 1: Não lista todos os usuários

**Causa:** O sistema está filtrando por `company_id`, que é o comportamento correto para multi-tenancy.

**Soluções possíveis:**
- Se você é admin e quer ver TODOS os usuários, precisamos adicionar uma exceção para admins
- Se há usuários sem `company_id`, eles não aparecerão na listagem

### Problema 2: Email já cadastrado

**Causa:** O email "natalia@primecamp.com.br" já existe no banco de dados.

**Soluções:**
1. **Usar outro email** para o novo usuário
2. **Verificar se o usuário já existe** e reativar/resetar senha
3. **Deletar o usuário antigo** se for duplicado/indesejado

## Script de Diagnóstico

Execute: `sql/VERIFICAR_USUARIOS_E_EMAILS.sql`

Este script verifica:
- Total de usuários
- Distribuição por empresa
- Se o email "natalia@primecamp.com.br" existe
- Lista todos os usuários
- Usuários sem company_id
- Emails duplicados (não deveria haver)

## Próximos Passos

1. ✅ Execute o script de diagnóstico
2. ⏳ Se o email realmente existe, decidir: deletar usuário antigo ou usar outro email
3. ⏳ Se quiser que admins vejam TODOS os usuários, precisamos modificar o código
