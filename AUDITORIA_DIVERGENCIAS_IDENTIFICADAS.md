# DIVERGÊNCIAS IDENTIFICADAS NA AUDITORIA

**Data:** 2025-01-XX  
**Status:** Análise Baseada em Código (sem execução de banco ainda)

---

## 🔴 ALTO - Divergências que Quebram Fluxos Principais

### 1. bills_to_pay - Filtro por Data de Pagamento

**Problema:**
- **Frontend (`DREComplete.tsx` linha 67):** Filtra contas pagas por `due_date` 
- **Backend (`financeiro.js` linha 710-720):** Usa `payment_date` com fallback para `due_date`
- **Frontend (`TransactionsManager.tsx` linha 86):** Usa `payment_date`
- **Divergência:** DREComplete filtra por data de vencimento ao invés de data de pagamento

**Impacto:**
- DRE mostra despesas incorretas (contas que venceram no período mas foram pagas antes/depois)
- Cálculo de despesas operacionais incorreto

**Solução:**
```typescript
// DREComplete.tsx linha 67 - CORRIGIR:
// ANTES:
q = q.gte('due_date', startDate).lte('due_date', endDate);

// DEPOIS (verificar qual coluna existe):
// Opção 1: Usar payment_date se existir
q = q.gte('payment_date', startDate).lte('payment_date', endDate);

// Opção 2: Filtrar por status='pago' E due_date (se payment_date não existir)
// Mas ideal é usar payment_date
```

**Arquivo a corrigir:**
- `src/components/financeiro/DREComplete.tsx` (linha ~67)

**Status:** ✅ **CORRIGIDO**
- Commit: "fix: corrigir filtro de data em DREComplete - usar payment_date ao invés de due_date para contas pagas com fallback"
- Implementado com fallback para `due_date` caso `payment_date` não exista no banco
- Código agora tenta usar `payment_date` primeiro, e se falhar, usa `due_date`

---

### 2. sales.sale_origin (Potencial)

**Status:** Backend tem fallback, mas coluna ideal existe em migrations

**Migrations identificadas:**
- `ADD_SALE_ORIGIN_MIGRATION.sql` - Adiciona coluna `sale_origin`
- Backend já verifica dinamicamente se coluna existe (`hasSaleOrigin`)

**Impacto:**
- Baixo (backend tem fallback usando `ordem_servico_id`)
- Performance melhor se coluna existir (não precisa JOIN/verificação)

**Ação:**
- Verificar se migration foi aplicada
- Se não, aplicar `ADD_SALE_ORIGIN_MIGRATION.sql`

---

### 3. sales.cash_register_session_id (Potencial)

**Status:** Migration existe

**Migrations identificadas:**
- `ADD_CASH_SESSION_TO_SALES.sql` - Adiciona `cash_register_session_id`

**Impacto:**
- Médio (vincula vendas a sessões de caixa)
- Útil para relatórios de caixa

**Ação:**
- Verificar se migration foi aplicada
- Se não, aplicar `ADD_CASH_SESSION_TO_SALES.sql`

---

## 🟡 MÉDIO - Divergências que Afetam Relatórios/Funcionalidades

### 4. Tabelas Financeiro IA Faltantes (Potencial)

**Tabelas esperadas (sql/CRIAR_TABELAS_IA_FINANCEIRO.sql):**
- vendas_snapshot_diario
- produto_analise_mensal
- vendedor_analise_mensal
- vendas_analise_temporal
- ia_previsoes
- ia_recomendacoes (já existe)

**Impacto:**
- Funcionalidades de análise/previsões podem não funcionar
- Relatórios podem estar incompletos

**Ação:**
- Verificar se tabelas existem no banco
- Se não, aplicar `sql/CRIAR_TABELAS_IA_FINANCEIRO.sql`

---

### 5. company_id em Tabelas (Multi-tenant)

**Status:** Backend adiciona filtro automaticamente, mas colunas podem faltar

**Tabelas que DEVEM ter company_id (baseado em tablesWithCompanyId):**
- sales ✅ (migrations existem)
- produtos ✅ (migrations existem)
- clientes ✅ (migrations existem)
- ordens_servico ✅ (migrations existem)
- users ✅ (migrations existem)
- sale_items ❓
- os_items ❓
- payments ❓
- cash_register_sessions ❓
- bills_to_pay ❓
- dre ❓
- planejamento_anual ❓

**Impacto:**
- CRÍTICO se não tiver (quebra isolamento multi-tenant)
- Backend tenta adicionar filtro, mas se coluna não existe, não filtra corretamente

**Ação:**
- Verificar todas as tabelas listadas em `tablesWithCompanyId`
- Aplicar `sql/ADICIONAR_COMPANY_ID_TODAS_TABELAS_COMPLETO.sql` se necessário

---

## 🟢 BAIXO - Ajustes e Melhorias

### 6. Índices Faltantes

**Impacto:**
- Performance de queries pode ser lenta

**Ação:**
- Verificar índices esperados vs existentes
- Aplicar `sql/INDICES_PERFORMANCE_FINANCEIRO.sql` se necessário

---

## ✅ O QUE ESTÁ FUNCIONANDO CORRETAMENTE

1. **Backend Multi-tenant:**
   - Sistema de filtro automático de `company_id` está bem implementado
   - Fallbacks para quando coluna não existe
   - Lista `tablesWithCompanyId` completa

2. **Backend Resiliente:**
   - Verificação dinâmica de colunas (hasSaleOrigin, hasCashierUserId, etc)
   - Fallbacks quando colunas não existem
   - Sistema funciona mesmo com schema parcial

3. **Migrations Existentes:**
   - Todas as migrations principais existem
   - Scripts são idempotentes (IF NOT EXISTS)
   - Backward compatible

---

## 📋 RESUMO DE AÇÕES PRIORITÁRIAS

### CRÍTICO (Fazer primeiro):
1. ⚠️ **Verificar se company_id existe em todas tabelas de `tablesWithCompanyId`**
2. ⚠️ **Aplicar migration `sql/ADICIONAR_COMPANY_ID_TODAS_TABELAS_COMPLETO.sql` se necessário**

### ALTO (Corrigir código):
1. ✅ **Corrigir `DREComplete.tsx` - usar payment_date ao invés de due_date**

### MÉDIO (Verificar migrations):
1. ⏳ **Verificar se `ADD_SALE_ORIGIN_MIGRATION.sql` foi aplicada**
2. ⏳ **Verificar se `ADD_CASH_SESSION_TO_SALES.sql` foi aplicada**
3. ⏳ **Verificar se tabelas Financeiro IA existem**

---

## 🔧 CORREÇÕES DE CÓDIGO NECESSÁRIAS

### Correção 1: DREComplete.tsx

**Arquivo:** `src/components/financeiro/DREComplete.tsx`  
**Linha:** ~67

**Código atual:**
```typescript
q = q.gte('due_date', startDate).lte('due_date', endDate);
```

**Código corrigido:**
```typescript
// Usar payment_date se existir, caso contrário due_date como fallback
// Mas ideal é ter payment_date e filtrar por ele
q = q.gte('payment_date', startDate).lte('payment_date', endDate);
```

**Nota:** Backend já tem lógica para detectar coluna correta. Frontend deveria seguir mesma lógica ou backend retornar dados já filtrados.

---

## 📝 PRÓXIMOS PASSOS

1. ⏳ Executar `sql/VERIFICAR_SCHEMA_COMPLETO.sql` no banco
2. ⏳ Analisar resultados e comparar com esta lista
3. ⏳ Criar migrations corretivas específicas
4. ⏳ Aplicar correção de código (DREComplete.tsx)
5. ⏳ Aplicar migrations no banco
6. ⏳ Validar correções
