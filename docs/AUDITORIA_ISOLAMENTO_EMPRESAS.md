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
- **Config:** configuracoes_empresa, company_settings, cupom_config, os_pagamentos, os_config_status, telegram_config  
- **Academy / Treinamentos:** trainings, training_assignments  
- **Devoluções:** refunds, refund_items  
- **Logs:** user_activity_logs, audit_logs  
- **DISC (admin/disc):** disc_responses  

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
- **kv_store_2c4defad:** chaves por empresa: `cupom_config_<company_id>` (cupom), `integration_settings_<company_id>` (API Externa, WhatsApp, OpenAI; frontend Integration.tsx e backend /api/whatsapp/send, /api/functions/analyze-candidate, /api/functions/generate-interview-questions).  
- **inventarios, inventario_itens, treasury_movements:** se usados em telas por empresa, a tabela deve ter `company_id` e estar em `tablesWithCompanyId` (e migração correspondente).

### 6. Revenda — apenas para admin da empresa principal (empresa 1)

**Regra:** A funcionalidade de **Gestão de Revenda** (`/admin/revenda`) não deve aparecer nem ser acessível para outras empresas. Apenas administradores da **empresa principal** (ID `00000000-0000-0000-0000-000000000001`) podem ver e usar.

| Onde | O que foi feito |
|------|------------------|
| **Backend** | `server/routes/reseller.js`: todas as rotas em `/api/admin/revenda/*` usam `requireAdminCompany` (middleware que exige `user.company_id === ADMIN_COMPANY_ID` e `role === 'admin'`). Retorna 403 para demais usuários. |
| **Admin.tsx** | O card "Gestão de Revenda" só é exibido quando `user?.company_id === ADMIN_COMPANY_ID`. |
| **Configuracoes.tsx** | O card "Gestão de Revenda" só é incluído em `configSections` quando `user?.company_id === ADMIN_COMPANY_ID`. Demais clientes não veem o card em Configurações. |
| **AdminReseller.tsx** | Se `user.company_id !== ADMIN_COMPANY_ID`, redireciona para `/admin` com toast "Acesso negado...". Não renderiza o conteúdo da página. Assim, mesmo acessando a URL diretamente, outros clientes não veem a tela de revenda. |
| **Sidebar** | Não há link direto para "Revenda" na sidebar; o acesso é via Admin ou Configurações (ambos já filtram o card). |

**Constante usada:** `ADMIN_COMPANY_ID = '00000000-0000-0000-0000-000000000001'` (empresa principal no backend: `server/middleware/companyMiddleware.js` e nos frontends que exibem/ocultam Revenda).

## Migrações aplicáveis

| Arquivo | Objetivo |
|--------|----------|
| `REVENDA_FIX_users_company_id.sql` | `company_id` em `users` |
| `CAIXA_ADD_company_id.sql` | `company_id` em cash_register_sessions e cash_movements |
| `BILLS_TO_PAY_ADD_company_id.sql` | `company_id` em bills_to_pay |
| `FINANCEIRO_ADD_company_id.sql` | `company_id` em financial_categories, financial_transactions, accounts_receivable |
| `API_TOKENS_ADD_company_id.sql` | `company_id` em api_tokens (lista de tokens e API pública por empresa) |
| `LOGS_ADD_company_id.sql` | `company_id` em user_activity_logs e audit_logs (tela Logs do sistema) |
| `DISC_ADD_company_id.sql` | `company_id` em disc_responses (tela Resultados DISC / admin/disc) |
| `CUPOM_CONFIG_ADD_company_id.sql` | `company_id` em cupom_config (Dados da Empresa no cupom; kv_store usa chave `cupom_config_<company_id>`) |
| `TELEGRAM_CONFIG_ADD_company_id.sql` | `company_id` em telegram_config (Chat IDs Telegram por empresa; integrações) |
| `TRAININGS_ADD_company_id.sql` | `company_id` em trainings e training_assignments (Academy / treinamentos por empresa) |
| `WALLETS_ADD_company_id.sql` | `company_id` em wallets (Carteiras / Contas de origem por empresa) |

## Checklist pós-deploy

1. Rodar todas as migrações acima no banco que a API usa.  
2. Garantir que cada usuário em `users` tenha `company_id` preenchido (ver `FIX_USUARIO_EMPRESA_VINCULAR.sql` e doc de troubleshooting).  
3. Reiniciar a API após deploy.  
4. Fazer logout e login de novo após alterar `company_id` de usuário.  
5. Tokens de API: após rodar `API_TOKENS_ADD_company_id.sql`, recriar tokens se necessário para que tenham `company_id` e a API pública retorne só dados da empresa.  
6. **Revenda:** só aparece e funciona para admin da empresa 1; outros clientes não veem o card nem acessam `/admin/revenda`.

---

## Resumo da auditoria (checklist do sistema)

| Área | Isolamento / Regra |
|------|---------------------|
| Vendas, PDV, Clientes, Produtos, OS | Filtro por `company_id` na API genérica e rotas dedicadas. |
| Caixa (sessões/movimentos) | `company_id`; migração CAIXA. |
| Financeiro (DRE, Contas a pagar, Transações, Contas a receber) | `company_id`; migrações BILLS_TO_PAY, FINANCEIRO. |
| Carteiras / Formas de pagamento | Rotas dedicadas filtram por `req.companyId`. |
| Cupom (Dados da Empresa) | Chave `cupom_config_<company_id>` no kv_store; tabela `cupom_config` com `company_id`. |
| Integrações (WhatsApp, Telegram, API Externa, OpenAI) | Chave `integration_settings_<company_id>`; tabela `telegram_config` com `company_id`. |
| Tokens de API / Integrações (lista) | `api_tokens.company_id`; API v1 retorna só dados da empresa do token. |
| Logs do sistema | `user_activity_logs`, `audit_logs` com `company_id`. |
| DISC (Resultados) | `disc_responses` com `company_id`. |
| Tabela `companies` | Query genérica restringe a `id = req.companyId` (uma empresa por usuário). |
| **Revenda** | **Só admin da empresa 1:** card oculto em Admin e Configurações; rota `/admin/revenda` redireciona os demais; backend 403 em `/api/admin/revenda/*`. |
| **Academy / Treinamentos** | `trainings` e `training_assignments` com `company_id`; listagem e criação filtradas por empresa; migração `TRAININGS_ADD_company_id.sql`. |
| **Carteiras (Formas de pagamento)** | `wallets` com `company_id`; rota dedicada lista/creat/update/delete só da empresa; migração `WALLETS_ADD_company_id.sql`. |
