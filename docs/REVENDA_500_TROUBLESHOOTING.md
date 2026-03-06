# Revenda — Erro 500 ao criar empresa ou listar planos

## O que foi corrigido

1. **Transação ao criar empresa** — O backend passou a usar um único client do pool para BEGIN/INSERT/COMMIT, evitando falha por uso de conexões diferentes.
2. **Assinatura anual** — Se o plano não tiver `price_yearly`, o valor usado passa a ser `price_monthly * 12`.
3. **Script SQL** — No script de instalação, os triggers foram alterados de `EXECUTE FUNCTION` para `EXECUTE PROCEDURE` (compatível com mais versões do PostgreSQL).
4. **Resposta de erro** — Em desenvolvimento, a API devolve `error` e opcionalmente `detail` no JSON de erro 500 para facilitar o diagnóstico.

## Se o erro 500 continuar

### 1. Ver a mensagem real do erro

- Abra as **Ferramentas do desenvolvedor** (F12) → aba **Rede (Network)**.
- Tente de novo **Criar** empresa ou abrir **Gerenciar Planos**.
- Clique na requisição que retornou **500** (por exemplo `companies` ou `plans`).
- Em **Resposta (Response)** ou **Preview**, veja o corpo da resposta: o campo `error` (e, se existir, `detail`) traz a mensagem do banco ou do servidor.

### 2. Só falta `company_id` na tabela `users` (erro 503)

Se a API responder **503** com mensagem sobre "estrutura do banco" ou "company_id", execute apenas o fix:

```bash
psql -U seu_usuario -d seu_banco -f db/migrations/manual/REVENDA_FIX_users_company_id.sql
```

Ou no DBeaver/pgAdmin: abra e execute o arquivo `db/migrations/manual/REVENDA_FIX_users_company_id.sql`.

### 3. Falta coluna `deleted_at` em `companies` (503 com detail "column c.deleted_at does not exist")

Execute no PostgreSQL (pgAdmin/DBeaver ou psql):

```bash
psql -U postgres -d banco_gestao -f db/migrations/manual/REVENDA_FIX_companies_deleted_at.sql
```

Se na **VPS** der **Peer authentication failed** ao rodar como `root`, use uma das opções:

- **Opção A — Conexão TCP com senha:**
  ```bash
  PGPASSWORD='sua_senha_postgres' psql -h localhost -U postgres -d banco_gestao -f db/migrations/manual/REVENDA_FIX_companies_deleted_at.sql
  ```

- **Opção B — Entrar como usuário do sistema postgres e depois rodar o script:**
  ```bash
  su - postgres
  psql -d banco_gestao -f /caminho/para/primecamp-ofc/db/migrations/manual/REVENDA_FIX_companies_deleted_at.sql
  exit
  ```

- **Opção C — Executar no pgAdmin/DBeaver** conectado ao mesmo banco que a API usa (banco_gestao), abrindo e executando o arquivo `REVENDA_FIX_companies_deleted_at.sql`.

### 4. Reexecutar o script completo (após a correção dos triggers)

Se ainda não rodou o script principal ou quiser garantir tudo:

```bash
psql -U seu_usuario -d seu_banco -f db/migrations/manual/INSTALAR_SISTEMA_REVENDA_COMPLETO.sql
```

Ou abra o arquivo no DBeaver/pgAdmin e execute.

### 5. Conferir se as tabelas e o admin existem

No PostgreSQL:

```sql
-- Tabelas do sistema de revenda
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('companies', 'plans', 'subscriptions');

-- Empresa admin e planos
SELECT id, name, email FROM companies WHERE id = '00000000-0000-0000-0000-000000000001';
SELECT id, name, code, price_monthly, price_yearly FROM plans;
```

- Deve existir a empresa admin e pelo menos um plano.
- Se a tabela `users` tiver coluna `company_id`, o usuário admin deve estar vinculado à empresa admin:

```sql
SELECT u.id, u.email, u.company_id, p.role
FROM users u
LEFT JOIN profiles p ON p.user_id = u.id
WHERE u.email = 'seu_email_admin';
```

O `company_id` deve ser `00000000-0000-0000-0000-000000000001` e o `role` deve ser `admin`.

### 6. Coluna "Usuários" mostra 0 para todas as empresas

A coluna **Usuários** na lista de empresas vem de `users.company_id`: conta quantos usuários têm `company_id` igual ao `id` da empresa.

- **Se a API já foi atualizada** e mesmo assim aparece 0, os usuários no banco provavelmente estão com `company_id` nulo ou de outra empresa.
- **Como corrigir (dados):** vincule cada usuário à empresa desejada. Exemplo (substitua o nome da empresa e os e-mails):

```sql
-- Ver empresas e usuários
SELECT id, name FROM companies;
SELECT id, email, company_id FROM users;

-- Vincular usuários à empresa "Ativa CRM" (troque o nome se precisar)
UPDATE users
SET company_id = (SELECT id FROM companies WHERE name = 'Ativa CRM' LIMIT 1)
WHERE email IN ('usuario1@exemplo.com', 'usuario2@exemplo.com');
```

- Usuários criados pela revenda (botão "Gerenciar usuários" → "Criar usuário") já nascem com o `company_id` correto. Usuários criados pelo cadastro normal do sistema precisam ser vinculados como acima ou pela tela **Configurações > Usuários e Permissões** (se houver opção de empresa).

### 7. Erros comuns

| Mensagem / Sintoma | O que fazer |
|--------------------|-------------|
| `relation "plans" does not exist` | Rodar o script SQL completo (cria `companies`, `plans`, `subscriptions`). |
| `relation "companies" does not exist` | Idem. |
| `column "company_id" does not exist` (em `users`) | O script adiciona `company_id` em `users`; garantir que esse trecho do script foi executado sem erro. |
| Token inválido / 403 | Fazer login de novo; conferir se o usuário é admin da empresa principal. |
| Coluna Usuários sempre 0 | Ver seção 6 acima; conferir se usuários têm `company_id` preenchido e se a API foi reiniciada após o deploy. |
| Vendo dados de outra empresa (financeiro, caixa, vendas) | **Seção 8**: vincule o usuário à empresa correta na tabela `users`. Depois logout e login. |
| Caixa com dados de outra empresa | Seções 8 e 9: conferir `company_id` do usuário e rodar `CAIXA_ADD_company_id.sql` se necessário. |
| DRE / despesas fixas mostrando dados de outra empresa | Seção 8 (usuário) + **Seção 10**: rodar `BILLS_TO_PAY_ADD_company_id.sql` e reiniciar a API. |
| Fluxo de Caixa / Contas / Transações de outra empresa | Seção 8 (usuário) + **Seção 11**: rodar `FINANCEIRO_ADD_company_id.sql` e reiniciar a API. |

### 8. Logado na empresa A mas aparecendo dados da empresa B (financeiro, caixa, vendas, etc.)

**Causa:** O usuário com que você está logado está vinculado à empresa errada na tabela `users` (coluna `company_id`).

**Solução:** Vincule o usuário à empresa correta no PostgreSQL:

```sql
-- Ver qual empresa está vinculada ao seu usuário
SELECT u.email, u.company_id, c.name AS empresa
FROM users u
LEFT JOIN companies c ON c.id = u.company_id
WHERE u.email = 'seu_email@exemplo.com';

-- Vincular à empresa desejada (ex.: Ativa CRM)
UPDATE users
SET company_id = (SELECT id FROM companies WHERE name ILIKE '%Ativa CRM%' LIMIT 1)
WHERE email = 'seu_email@exemplo.com';
```

Ou execute o script `db/migrations/manual/FIX_USUARIO_EMPRESA_VINCULAR.sql` (ajustando os emails e nomes de empresa). Depois faça **logout e login de novo** para o token refletir o novo `company_id`.

### 9. Caixa (sessões/movimentos) mostrando dados de outra empresa

O Caixa usa as tabelas `cash_register_sessions` e `cash_movements`. Para isolar por empresa, elas precisam da coluna `company_id` (e conferir a seção 8 — usuário com `company_id` correto).

**Na VPS (como root)** — comando completo (troque `SUA_SENHA_POSTGRES` pela senha real):

```bash
cd /root/primecamp-ofc && PGPASSWORD='SUA_SENHA_POSTGRES' psql -h localhost -U postgres -d banco_gestao -f /root/primecamp-ofc/db/migrations/manual/CAIXA_ADD_company_id.sql
```

Se a pasta do projeto for outra, troque `/root/primecamp-ofc` pelo caminho correto. **Alternativa:** execute o arquivo `CAIXA_ADD_company_id.sql` no pgAdmin/DBeaver. Depois, reinicie a API.

### 10. DRE / Financeiro — despesas fixas (contas a pagar) de outra empresa

A tela de **DRE** e as **despesas fixas** vêm da tabela `bills_to_pay`. Para isolar por empresa, ela precisa da coluna `company_id`. Execute no PostgreSQL (e confira a **Seção 8** — usuário com `company_id` correto).

**Na VPS (como root)** — comando completo (troque `SUA_SENHA_POSTGRES` pela senha real do usuário `postgres`):

```bash
cd /root/primecamp-ofc && PGPASSWORD='SUA_SENHA_POSTGRES' psql -h localhost -U postgres -d banco_gestao -f /root/primecamp-ofc/db/migrations/manual/BILLS_TO_PAY_ADD_company_id.sql
```

Se a pasta do projeto na VPS for outra (ex.: `~/primecamp-ofc`), troque os dois caminhos: `cd /root/primecamp-ofc` e `-f /root/primecamp-ofc/db/...` pelo caminho correto.

**No pgAdmin:** (1) Conecte no banco que a API usa (ex.: `banco_gestao`). (2) Botão direito no banco → Query Tool. (3) File → Open e escolha `BILLS_TO_PAY_ADD_company_id.sql` (ou cole o conteúdo do arquivo). (4) Execute (F5 ou ícone play). Veja as NOTICE em Messages.

O script adiciona `company_id` em `bills_to_pay` e preenche a partir de `created_by`. Depois, **reinicie a API** (ex.: `pm2 restart primecamp-api`).

### 11. Fluxo de Caixa, Contas a Pagar ou Transações mostrando dados de outra empresa

As telas **Fluxo de Caixa**, **Contas** e **Transações** usam as tabelas `financial_transactions`, `accounts_receivable` e `financial_categories`. Para isolar por empresa, essas tabelas precisam da coluna `company_id`. Execute no PostgreSQL (e confira a **Seção 8** — usuário com `company_id` correto).

**No pgAdmin:** Query Tool → abra e execute `db/migrations/manual/FINANCEIRO_ADD_company_id.sql`.

**Na VPS (como root):**
```bash
cd /root/primecamp-ofc && PGPASSWORD='SUA_SENHA_POSTGRES' psql -h localhost -U postgres -d banco_gestao -f /root/primecamp-ofc/db/migrations/manual/FINANCEIRO_ADD_company_id.sql
```

Depois, **reinicie a API**.

Depois de reexecutar o script e conferir os pontos acima, teste de novo em **Nova Empresa** e **Gerenciar Planos**. Se ainda der 500, use a resposta da API (campo `error`/`detail`) para identificar a linha ou constraint que está falhando.
