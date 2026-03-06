# Auditoria: isolamento de dados por empresa

Este documento registra a auditoria feita para garantir que **nada de uma empresa apareça no login de outra**.

## Fontes de dados auditadas

### 1. API genérica (`/api/query`, `/api/insert`, `/api/update`, `/api/delete`)

Tabelas que **têm filtro por `company_id`** (lista `tablesWithCompanyId` no `server/index.js`):

- **Negócio:** produtos, vendas, sales, clientes, ordens_servico, sale_items, os_items, fornecedores, produto_movimentacoes  
- **Ponto:** time_clock  
- **Usuários:** users  
- **NPS:** nps_surveys, nps_responses  
- **Vagas/recrutamento:** job_surveys, job_responses, job_application_drafts, job_candidate_ai_analysis, job_candidate_evaluations, job_interviews, candidate_responses  
- **Financeiro:** payments, caixa_sessions, caixa_movements, cash_register_sessions, cash_movements, bills_to_pay, financial_transactions, accounts_receivable, financial_categories  
- **Marcas/modelos:** marcas, modelos  
- **Config:** configuracoes_empresa, company_settings, os_pagamentos, os_config_status  
- **Devoluções:** refunds, refund_items  

**Caso especial – tabela `companies`:** na query, é aplicado `id = req.companyId` para que o usuário veja apenas a própria empresa (a tabela não tem coluna `company_id`).

### 2. Rotas dedicadas

- **`/api/financeiro/*`:** `requireCompanyId` + filtro `company_id` nas queries (já existente).  
- **`/api/refunds`:** usa `req.companyId` e `WHERE r.company_id = $1`.  
- **`/api/dashboard/*`:** usa `companyId` do parâmetro + `verifyCompanyAccess` (só acessa empresa própria ou admin).  
- **`/api/reseller/*`:** rotas de revenda; acesso controlado por contexto admin/empresa.

### 3. API pública com token (`/api/v1/*`)

- **Token:** tabela `api_tokens` com `company_id` (migração `API_TOKENS_ADD_company_id.sql`).  
- **validateApiToken:** define `req.companyId` a partir de `apiToken.company_id` ou de `criado_por` → `users.company_id`.  
- **Endpoints:**  
  - `GET /api/v1/produtos` e `GET /api/v1/produtos/:id`: `WHERE company_id = req.companyId`.  
  - `GET /api/v1/marcas`, `GET /api/v1/modelos`, `GET /api/v1/grupos`: filtro por `company_id`.  
- Sem `req.companyId` (token sem empresa), a API responde **403**.

### 4. Gestão de tokens (`/api/api-tokens`)

- **GET:** lista apenas tokens com `company_id = req.companyId` (ou criados por usuários da empresa, se `company_id` for NULL).  
- **POST:** grava `company_id = req.companyId` ao criar token.  
- **PUT / DELETE / GET logs:** só permite se o token pertencer à empresa do usuário.

### 5. Tabelas usadas no frontend e não filtradas por empresa

- **profiles, positions, user_position_departments, departments, roles, permissions, role_permissions, user_permissions, permission_changes_history:** em geral ligadas a `user_id`; o usuário já está restrito por empresa via `users.company_id`. Queries que listam “todos os perfis” sem filtro de usuário devem ser evitadas ou feitas via rotas que limitem por empresa.  
- **disc_responses, disc_tests:** podem ser por vaga/empresa; se houver listagens globais, considerar `company_id` ou vínculo com job_survey.  
- **kv_store_2c4defad:** store genérico; se guardar dados por empresa, usar chave com company_id ou tabela com `company_id`.  
- **inventarios, inventario_itens, cupom_config, treasury_movements:** se usados em telas por empresa, a tabela deve ter `company_id` e estar em `tablesWithCompanyId` (e migração correspondente).

## Migrações aplicáveis

| Arquivo | Objetivo |
|--------|----------|
| `REVENDA_FIX_users_company_id.sql` | `company_id` em `users` |
| `CAIXA_ADD_company_id.sql` | `company_id` em cash_register_sessions e cash_movements |
| `BILLS_TO_PAY_ADD_company_id.sql` | `company_id` em bills_to_pay |
| `FINANCEIRO_ADD_company_id.sql` | `company_id` em financial_categories, financial_transactions, accounts_receivable |
| `API_TOKENS_ADD_company_id.sql` | `company_id` em api_tokens (lista de tokens e API pública por empresa) |

## Checklist pós-deploy

1. Rodar todas as migrações acima no banco que a API usa.  
2. Garantir que cada usuário em `users` tenha `company_id` preenchido (ver `FIX_USUARIO_EMPRESA_VINCULAR.sql` e doc de troubleshooting).  
3. Reiniciar a API após deploy.  
4. Fazer logout e login de novo após alterar `company_id` de usuário.  
5. Tokens de API: após rodar `API_TOKENS_ADD_company_id.sql`, recriar tokens se necessário para que tenham `company_id` e a API pública retorne só dados da empresa.
