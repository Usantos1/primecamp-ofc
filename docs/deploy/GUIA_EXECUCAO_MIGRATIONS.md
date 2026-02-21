# GUIA DE EXECUÇÃO DAS MIGRATIONS - PASSO A PASSO

**Data:** 2025-01-XX  
**Objetivo:** Aplicar todas as migrations na ordem correta para corrigir divergências identificadas na auditoria

---

## ⚠️ ANTES DE COMEÇAR

### 1. BACKUP DO BANCO DE DADOS
```bash
# No servidor/VPS ou localmente:
pg_dump -U postgres -d banco_gestao > backup_antes_migrations_$(date +%Y%m%d_%H%M%S).sql
```

### 2. VERIFICAR CONEXÃO
- Certifique-se de estar conectado ao banco correto
- Verifique permissões de superusuário (algumas migrations podem precisar)

---

## 📋 ORDEM DE EXECUÇÃO

### MIGRATION 1: Criar Sistema Revenda (SE NECESSÁRIO)

**Script:** `CRIAR_SISTEMA_REVENDA_CORRIGIDO.sql`

**Quando aplicar:** APENAS se as tabelas `companies` e `users` NÃO existirem

**Como verificar se precisa:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('companies', 'users');
```

**Como aplicar:**
```bash
# Se as tabelas não existirem:
psql -U postgres -d banco_gestao -f CRIAR_SISTEMA_REVENDA_CORRIGIDO.sql
```

**Validação:**
```sql
-- Executar após aplicar:
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') 
         THEN '✅ companies existe' 
         ELSE '❌ companies faltando' END as status;
```

---

### MIGRATION 2: Adicionar company_id (🔴 CRÍTICO)

**Script:** `sql/ADICIONAR_COMPANY_ID_TODAS_TABELAS_COMPLETO.sql`

**Prioridade:** 🔴 **CRÍTICA** - Isolamento multi-tenant

**Quando aplicar:** SEMPRE (script é idempotente, seguro executar)

**Como aplicar:**
```bash
psql -U postgres -d banco_gestao -f sql/ADICIONAR_COMPANY_ID_TODAS_TABELAS_COMPLETO.sql
```

**Validação:**
```sql
-- Executar após aplicar:
SELECT 
    table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = t.table_name
          AND column_name = 'company_id'
    ) THEN '✅ TEM' ELSE '❌ SEM' END as status
FROM (VALUES
    ('sales'), ('produtos'), ('clientes'), ('ordens_servico'), ('users')
) AS t(table_name);
```

**O que faz:**
- Adiciona coluna `company_id` em todas as tabelas necessárias
- Garante isolamento de dados entre empresas
- CRÍTICO para segurança multi-tenant

---

### MIGRATION 3: Adicionar sale_origin (🟡 ALTA)

**Script:** `ADD_SALE_ORIGIN_MIGRATION.sql`

**Prioridade:** 🟡 **ALTA** - Funcionalidade core

**Quando aplicar:** Se a coluna `sale_origin` não existir em `sales`

**Como aplicar:**
```bash
psql -U postgres -d banco_gestao -f ADD_SALE_ORIGIN_MIGRATION.sql
```

**Validação:**
```sql
-- Executar após aplicar:
SELECT column_name 
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sales'
  AND column_name IN ('sale_origin', 'technician_id', 'cashier_user_id');
```

**O que faz:**
- Adiciona coluna `sale_origin` (PDV/OS)
- Adiciona `technician_id` e `cashier_user_id`
- Atualiza vendas existentes com valores padrão

---

### MIGRATION 4: Adicionar cash_register_session_id (🟡 ALTA)

**Script:** `ADD_CASH_SESSION_TO_SALES.sql`

**Prioridade:** 🟡 **ALTA** - Integração com caixa

**Quando aplicar:** Se a coluna `cash_register_session_id` não existir em `sales`

**Como aplicar:**
```bash
psql -U postgres -d banco_gestao -f ADD_CASH_SESSION_TO_SALES.sql
```

**Validação:**
```sql
-- Executar após aplicar:
SELECT column_name 
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sales'
  AND column_name = 'cash_register_session_id';
```

**O que faz:**
- Adiciona coluna para vincular vendas a sessões de caixa
- Cria índice para performance

---

### MIGRATION 5: Criar Tabelas IA Financeiro (🟢 MÉDIA)

**Script:** `sql/CRIAR_TABELAS_IA_FINANCEIRO.sql`

**Prioridade:** 🟢 **MÉDIA** - Funcionalidades avançadas (opcional)

**Quando aplicar:** Se precisar das funcionalidades de análise IA

**Como aplicar:**
```bash
# Se o script existir:
psql -U postgres -d banco_gestao -f sql/CRIAR_TABELAS_IA_FINANCEIRO.sql
```

**Validação:**
```sql
-- Executar após aplicar:
SELECT table_name 
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'vendas_snapshot_diario',
    'produto_analise_mensal',
    'vendedor_analise_mensal',
    'vendas_analise_temporal'
  );
```

**Nota:** Se o script não existir, essas tabelas são opcionais.

---

### MIGRATION 6: Aplicar Migrations Financeiro (🟢 MÉDIA)

**Script:** `APLICAR_TODAS_MIGRATIONS_FINANCEIRO.sql`

**Prioridade:** 🟢 **MÉDIA** - Garantir estrutura financeiro completa

**Quando aplicar:** Para garantir que todas as tabelas financeiro estão completas

**Como aplicar:**
```bash
psql -U postgres -d banco_gestao -f APLICAR_TODAS_MIGRATIONS_FINANCEIRO.sql
```

**Validação:**
```sql
-- Verificar tabelas financeiro:
SELECT table_name 
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('dre', 'planejamento_anual', 'bills_to_pay', 'financial_categories');
```

---

## ✅ VERIFICAÇÃO FINAL

Após aplicar todas as migrations, execute o script de verificação:

```bash
psql -U postgres -d banco_gestao -f sql/VERIFICAR_MIGRATIONS_APLICADAS.sql
```

Este script mostra:
- Status de cada migration
- Quais tabelas/colunas foram criadas
- O que ainda está faltando (se houver)

---

## 🔍 CHECKLIST PÓS-APLICAÇÃO

Após aplicar todas as migrations, verifique:

### Multi-tenant (company_id)
- [ ] Todas as tabelas listadas têm `company_id`
- [ ] Backend filtra corretamente por `company_id`
- [ ] Testar isolamento de dados entre empresas

### Funcionalidades Core
- [ ] `sale_origin` funciona em vendas
- [ ] `cash_register_session_id` está sendo preenchido
- [ ] Vendas podem ser criadas normalmente

### Financeiro
- [ ] DRE funciona corretamente
- [ ] Contas a pagar podem ser criadas/editadas
- [ ] Relatórios financeiro funcionam

---

## 🚨 TROUBLESHOOTING

### Erro: "column already exists"
- **Causa:** Migration já foi aplicada
- **Solução:** Ignore o erro (migrations são idempotentes)

### Erro: "table does not exist"
- **Causa:** Tabela base não existe
- **Solução:** Aplique `CRIAR_SISTEMA_REVENDA_CORRIGIDO.sql` primeiro

### Erro: "permission denied"
- **Causa:** Usuário não tem permissões
- **Solução:** Execute como superusuário ou conceda permissões

### Erro: "foreign key constraint"
- **Causa:** Dados existentes sem company_id
- **Solução:** O script deve atualizar dados existentes, mas verifique logs

---

## 📝 NOTAS IMPORTANTES

1. **Ordem importa:** Aplique na ordem listada acima
2. **Idempotência:** Todos os scripts usam `IF NOT EXISTS`, são seguros executar múltiplas vezes
3. **Backup:** Sempre faça backup antes de aplicar migrations
4. **Teste:** Teste em ambiente de desenvolvimento primeiro, se possível
5. **Logs:** Verifique logs do PostgreSQL para warnings/errors

---

## 🎯 RESULTADO ESPERADO

Após aplicar todas as migrations:

- ✅ Todas as tabelas têm `company_id` (isolamento multi-tenant)
- ✅ Sales tem `sale_origin`, `cash_register_session_id`, etc.
- ✅ Estrutura financeiro completa
- ✅ Sistema pronto para produção

---

## 📞 SUPORTE

Se encontrar problemas:
1. Verifique os logs do PostgreSQL
2. Execute `sql/VERIFICAR_MIGRATIONS_APLICADAS.sql` para diagnóstico
3. Consulte `AUDITORIA_DIVERGENCIAS_IDENTIFICADAS.md` para contexto
4. Verifique se todos os scripts existem no repositório
