# PLANO DE REPARO - AUDITORIA PRIMECAMP

**Data:** 2025-01-XX  
**Status:** Pronto para Execução

---

## 📋 RESUMO DO PROCESSO

Este plano foi criado após análise completa do código e documentação. Baseia-se nas divergências identificadas em `AUDITORIA_DIVERGENCIAS_IDENTIFICADAS.md`.

---

## 🎯 ORDEM DE EXECUÇÃO DAS CORREÇÕES

### FASE 1: VERIFICAÇÃO ✅ (JÁ EXECUTADA)

1. ✅ Executar `sql/VERIFICAR_SCHEMA_COMPLETO.sql` no banco
2. ✅ Executar `sql/ANALISAR_RESULTADOS_VERIFICACAO.sql` para resumo
3. ✅ Analisar resultados e comparar com documentação

---

### FASE 2: CORREÇÕES CRÍTICAS (Multi-tenant - company_id)

**PRIORIDADE: 🔴 CRÍTICA**

**Script:** `sql/ADICIONAR_COMPANY_ID_TODAS_TABELAS_COMPLETO.sql`

**Descrição:** Adiciona coluna `company_id` em todas as tabelas que precisam de isolamento multi-tenant.

**Tabelas que DEVEM ter company_id:**
- sales
- sale_items
- ordens_servico
- os_items
- produtos
- clientes
- users (já deve ter, mas verificar)
- payments
- cash_register_sessions
- bills_to_pay
- dre
- planejamento_anual
- ia_recomendacoes

**Como aplicar:**
```bash
# No servidor/VPS ou localmente:
psql -U postgres -d <nome_banco> -f sql/ADICIONAR_COMPANY_ID_TODAS_TABELAS_COMPLETO.sql
```

**Validação:**
```sql
-- Verificar se company_id foi adicionado:
SELECT 
    table_name,
    CASE WHEN column_name = 'company_id' THEN '✅ TEM' ELSE '❌ SEM' END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('sales', 'produtos', 'clientes', 'ordens_servico', 'users')
  AND column_name = 'company_id';
```

---

### FASE 3: CORREÇÕES ALTAS (Funcionalidades Core)

#### 3.1. Adicionar sale_origin em sales

**PRIORIDADE: 🟡 ALTA**

**Script:** `ADD_SALE_ORIGIN_MIGRATION.sql`

**Descrição:** Adiciona coluna `sale_origin` (PDV/OS) e campos relacionados (`technician_id`, `cashier_user_id`).

**Como aplicar:**
```bash
psql -U postgres -d <nome_banco> -f ADD_SALE_ORIGIN_MIGRATION.sql
```

**Validação:**
```sql
SELECT column_name 
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sales'
  AND column_name IN ('sale_origin', 'technician_id', 'cashier_user_id');
```

#### 3.2. Adicionar cash_register_session_id em sales

**PRIORIDADE: 🟡 ALTA**

**Script:** `ADD_CASH_SESSION_TO_SALES.sql`

**Descrição:** Adiciona coluna para vincular vendas a sessões de caixa.

**Como aplicar:**
```bash
psql -U postgres -d <nome_banco> -f ADD_CASH_SESSION_TO_SALES.sql
```

**Validação:**
```sql
SELECT column_name 
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sales'
  AND column_name = 'cash_register_session_id';
```

---

### FASE 4: CORREÇÕES MÉDIAS (Funcionalidades Avançadas)

#### 4.1. Criar Tabelas Financeiro IA

**PRIORIDADE: 🟢 MÉDIA**

**Script:** `sql/CRIAR_TABELAS_IA_FINANCEIRO.sql` (se existir)

**Tabelas esperadas:**
- vendas_snapshot_diario
- produto_analise_mensal
- vendedor_analise_mensal
- vendas_analise_temporal
- ia_previsoes (pode já existir)

**Nota:** Se o script não existir, verificar se essas tabelas são realmente necessárias.

#### 4.2. Aplicar Migrations Financeiro Completas

**PRIORIDADE: 🟢 MÉDIA**

**Script:** `APLICAR_TODAS_MIGRATIONS_FINANCEIRO.sql`

**Descrição:** Garante que todas as tabelas financeiro estão criadas com estrutura completa.

---

### FASE 5: CORREÇÕES DE CÓDIGO ✅ (JÁ APLICADA)

#### 5.1. DREComplete.tsx - Filtro payment_date

**Status:** ✅ **CORRIGIDO**

**Arquivo:** `src/components/financeiro/DREComplete.tsx`

**Commit:** "fix: corrigir filtro de data em DREComplete - usar payment_date ao invés de due_date para contas pagas com fallback"

**Validação:** Código já commitado e pronto para deploy.

---

## 🔍 CHECKLIST DE VALIDAÇÃO PÓS-CORREÇÃO

### Multi-tenant (company_id)
- [ ] Verificar se todas as tabelas listadas têm `company_id`
- [ ] Testar isolamento de dados (criar dados em company_id diferente e verificar)
- [ ] Verificar se backend filtra corretamente por `company_id`

### Funcionalidades Core
- [ ] Verificar se `sale_origin` funciona corretamente
- [ ] Testar criação de vendas com `sale_origin = 'PDV'` e `'OS'`
- [ ] Verificar se `cash_register_session_id` está sendo preenchido

### Financeiro
- [ ] Testar DRE (verificar se usa `payment_date` corretamente)
- [ ] Testar criação/edição de contas a pagar
- [ ] Verificar se relatórios financeiro funcionam

### Geral
- [ ] Testar fluxo completo: Criar OS → Vender → Fechar Caixa → DRE
- [ ] Verificar se não há erros no console do navegador
- [ ] Verificar se não há erros no log do backend

---

## 📝 NOTAS IMPORTANTES

1. **Backup antes de aplicar:**
   ```bash
   pg_dump -U postgres -d <nome_banco> > backup_antes_correcoes.sql
   ```

2. **Ordem importa:** Aplique as migrations na ordem listada acima.

3. **Teste incremental:** Após cada fase, valide antes de continuar.

4. **Rollback:** Todos os scripts usam `IF NOT EXISTS`, então são idempotentes e seguros.

5. **Ambiente:** Teste primeiro em ambiente de desenvolvimento/staging se possível.

---

## 🚀 DEPLOY DAS CORREÇÕES

Após aplicar todas as correções e validar:

1. **Frontend (correção de código):**
   ```bash
   # Build e deploy do frontend (já commitado)
   npm run build
   # Deploy no VPS (usar script existente)
   ```

2. **Backend:**
   - Nenhuma alteração de código necessário
   - Apenas migrations no banco

3. **Validação final:**
   - Executar `sql/VERIFICAR_SCHEMA_COMPLETO.sql` novamente
   - Comparar resultados (menos itens "FALTANDO")
   - Testar funcionalidades principais

---

## 📊 STATUS ATUAL

- ✅ Fases 1-4 da Auditoria: COMPLETAS
- ✅ 1 Correção de código: APLICADA (DREComplete.tsx)
- ✅ Scripts SQL: CORRIGIDOS E PRONTOS
- ⏳ Correções de banco: PENDENTES (requerem execução manual)

---

## 🎯 PRÓXIMOS PASSOS

1. Executar `sql/ANALISAR_RESULTADOS_VERIFICACAO.sql` no banco
2. Analisar resultados e identificar o que está faltando
3. Aplicar migrations na ordem de prioridade
4. Validar após cada fase
5. Fazer deploy das correções de código (já commitadas)
