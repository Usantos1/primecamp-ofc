# Sistema de Revenda Multi-Tenant

## 📋 Visão Geral

Sistema completo para revender o PrimeCamp para outras empresas com:
- Multi-tenancy (separação de dados por empresa)
- Planos e assinaturas
- Pagamento PIX com confirmação automática
- Bloqueio automático por falta de pagamento
- Painel administrativo de revenda

## 🏗️ Arquitetura

### Estrutura de Dados

**Row-Level Security (RLS)**: Todas as tabelas principais têm `company_id` para separar dados por empresa.

- **Empresa Admin**: ID fixo `00000000-0000-0000-0000-000000000001`
- **Outras empresas**: Cada uma tem seu próprio `company_id` UUID

### Tabelas Principais

1. **companies**: Cadastro de empresas
2. **plans**: Planos disponíveis (Básico, Premium, Enterprise)
3. **subscriptions**: Assinaturas ativas das empresas
4. **payments**: Histórico de pagamentos PIX
5. **usage_logs**: Logs de uso para controle de limites

## 🚀 Instalação

### 1. Criar tabelas do sistema de revenda

```bash
psql -U postgres -d postgres -f CRIAR_SISTEMA_REVENDA.sql
```

### 2. Adicionar company_id nas tabelas existentes

```bash
psql -U postgres -d postgres -f ADICIONAR_COMPANY_ID_TABELAS.sql
```

### 3. Verificar se empresa admin existe

```sql
SELECT * FROM companies WHERE id = '00000000-0000-0000-0000-000000000001';
```

## 📊 Planos Disponíveis

| Plano | Mensal | Anual | Usuários | Storage | Ordens/Mês |
|-------|--------|-------|----------|---------|------------|
| Básico | R$ 99 | R$ 990 | 5 | 10 GB | 100 |
| Premium | R$ 299 | R$ 2.990 | 20 | 50 GB | 500 |
| Enterprise | R$ 799 | R$ 7.990 | 100 | 200 GB | Ilimitado |

## 🔐 Permissões

### Painel de Revenda (`/admin/revenda`)

**Acesso**: Apenas admins da empresa principal (ID fixo)

**Funcionalidades**:
- Listar empresas
- Cadastrar nova empresa
- Editar empresa
- Gerenciar assinaturas
- Ver pagamentos
- Suspender/ativar empresas

### Middleware de Verificação

Todas as rotas verificam automaticamente:
1. Se empresa está ativa (`status != 'suspended' || 'cancelled'`)
2. Se assinatura está válida (`expires_at > NOW()`)
3. Se não está bloqueada por falta de pagamento

## 💳 Integração PIX

### Fluxo de Pagamento

1. **Criar pagamento**: Gera código PIX e QR Code
2. **Webhook**: Recebe confirmação do gateway
3. **Confirmação automática**: Atualiza status do pagamento
4. **Liberação**: Ativa/renova assinatura automaticamente

### Webhook PIX

```
POST /api/webhook/pix
```

**Payload esperado**:
```json
{
  "external_id": "payment_123",
  "status": "paid",
  "paid_at": "2026-01-07T10:00:00Z"
}
```

## 🔄 Bloqueio Automático

### Job de Verificação (criar cron)

```bash
# Verificar assinaturas expiradas a cada hora
0 * * * * node server/jobs/checkExpiredSubscriptions.js
```

**Ações automáticas**:
- Marca assinatura como `expired` se `expires_at < NOW()`
- Suspende empresa se sem pagamento há mais de 3 dias
- Envia notificação por email antes de expirar

## 📡 APIs Disponíveis

### Listar Empresas
```
GET /api/admin/revenda/companies?page=1&limit=20&search=&status=
```

### Criar Empresa
```
POST /api/admin/revenda/companies
{
  "name": "Empresa XYZ",
  "cnpj": "12.345.678/0001-90",
  "email": "contato@empresa.com",
  "plan_id": "uuid-do-plano",
  "billing_cycle": "monthly"
}
```

### Atualizar Assinatura
```
POST /api/admin/revenda/companies/:id/subscription
{
  "plan_id": "uuid-do-plano",
  "billing_cycle": "yearly"
}
```

### Listar Planos
```
GET /api/admin/revenda/plans
```

## 🛠️ Próximos Passos

1. ✅ Criar tabelas do sistema
2. ✅ Adicionar company_id nas tabelas existentes
3. ✅ Criar middleware de verificação
4. ✅ Criar rotas de API
5. ⏳ Criar painel frontend `/admin/revenda`
6. ⏳ Integrar gateway PIX (Gerencianet/MercadoPago)
7. ⏳ Criar job de verificação de expiração
8. ⏳ Adicionar notificações por email

## 📝 Notas Importantes

- **Empresa Admin**: Sempre ativa, sem verificação de pagamento
- **Dados Separados**: Cada empresa só vê seus próprios dados
- **Segurança**: Middleware verifica acesso em todas as rotas
- **Escalabilidade**: Estrutura preparada para crescimento

