# Verificar e Corrigir company_id dos Usuários

## 1. Verificar usuário atual e company_id:

```bash
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -c "SELECT id, email, company_id FROM users WHERE email = 'lojaprimecamp@gmail.com';"
```

## 2. Verificar se a empresa admin existe:

```bash
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -c "SELECT id, name, status FROM companies WHERE id = '00000000-0000-0000-0000-000000000001' OR name LIKE '%Prime Camp%';"
```

## 3. Se a empresa não existir, criar:

```bash
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -c "INSERT INTO companies (id, name, cnpj, status, created_at) VALUES ('00000000-0000-0000-0000-000000000001', 'Prime Camp LTDA', '12345678000190', 'active', NOW()) ON CONFLICT (id) DO NOTHING;"
```

## 4. Atualizar company_id do usuário:

```bash
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -c "UPDATE users SET company_id = '00000000-0000-0000-0000-000000000001' WHERE email = 'lojaprimecamp@gmail.com' OR company_id IS NULL;"
```

## 5. Verificar produtos e vendas (devem ter company_id):

```bash
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -c "SELECT COUNT(*) as total_produtos, COUNT(company_id) as com_company_id FROM produtos;"
```

```bash
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -c "SELECT COUNT(*) as total_vendas, COUNT(company_id) as com_company_id FROM sales;"
```

## 6. Atualizar produtos e vendas para ter company_id:

```bash
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -c "UPDATE produtos SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;"
```

```bash
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -c "UPDATE sales SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;"
```

---

## Comandos em sequência (executar um por vez):

```bash
# 1. Verificar usuário
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -c "SELECT id, email, company_id FROM users WHERE email = 'lojaprimecamp@gmail.com';"
```

```bash
# 2. Verificar/criar empresa
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -c "SELECT id, name FROM companies WHERE id = '00000000-0000-0000-0000-000000000001';" || PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -c "INSERT INTO companies (id, name, cnpj, status, created_at) VALUES ('00000000-0000-0000-0000-000000000001', 'Prime Camp LTDA', '12345678000190', 'active', NOW()) ON CONFLICT (id) DO NOTHING;"
```

```bash
# 3. Atualizar usuário
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -c "UPDATE users SET company_id = '00000000-0000-0000-0000-000000000001' WHERE email = 'lojaprimecamp@gmail.com' OR company_id IS NULL;"
```

```bash
# 4. Atualizar produtos (se a coluna existir)
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -c "UPDATE produtos SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;" 2>&1 | grep -v "does not exist" || echo "Coluna company_id não existe em produtos"
```

```bash
# 5. Atualizar vendas (se a coluna existir)
PGPASSWORD='AndinhoSurf2015@' psql -h 72.62.106.76 -U postgres -d postgres -c "UPDATE sales SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;" 2>&1 | grep -v "does not exist" || echo "Coluna company_id não existe em sales"
```

```bash
# 6. Depois de executar, limpar cache do navegador e recarregar
# No console do navegador (F12):
# localStorage.clear(); sessionStorage.clear(); location.reload();
```
