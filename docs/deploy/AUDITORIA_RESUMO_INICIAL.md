# RESUMO INICIAL DA AUDITORIA - PRIMECAMP

**Data:** 2025-01-XX  
**Status:** Em Progresso

---

## ✅ PROBLEMA IDENTIFICADO IMEDIATO

### `/integracoes` não aparece no menu
- **Status:** CÓDIGO CORRETO - problema de permissão
- **Código:** Rota existe em `src/App.tsx:193` e `src/components/AppSidebar.tsx:193`
- **Causa:** Link está em `adminItems`, só aparece se `userIsAdmin === true`
- **Solução:** Verificar se usuário tem permissão de admin. O código está correto.

---

## FASE 1: INVENTÁRIO DE DOCUMENTAÇÃO

### Arquivos .sql Principais Identificados (prioritários para schema):

1. **sql/CRIAR_TABELA_COMPANIES.sql** - Tabela companies
2. **sql/ADICIONAR_COMPANY_ID_TODAS_TABELAS_COMPLETO.sql** - Adiciona company_id em todas tabelas
3. **sql/CRIAR_TABELAS_IA_FINANCEIRO.sql** - Tabelas do sistema financeiro IA
4. **sql/CRIAR_TABELA_DRE.sql** - Tabela DRE
5. **CRIAR_TABELAS_BANCO.sql** - Schema base do banco
6. **APPLY_PDV_MIGRATION.sql** - Migrações PDV

### Arquivos .md Principais (para entender regras de negócio):

- README.md
- STATUS_IMPLEMENTACAO.md  
- ROTAS_FINANCEIRO.md
- PLANEJAMENTO_IA_FINANCEIRO.md

---

## FASE 2: SCHEMA ESPERADO (Baseado em .sql lidos)

### Tabelas Principais Identificadas:

1. **companies** - Empresas (multi-tenant)
2. **users** - Usuários
3. **sales** - Vendas
4. **ordens_servico** - Ordens de Serviço
5. **produtos** - Produtos
6. **clientes** - Clientes
7. **dre** - Demonstrativo do Resultado do Exercício
8. **planejamento_anual** - Planejamento Financeiro Anual
9. **ia_recomendacoes** - Recomendações IA
10. **ia_previsoes** - Previsões IA
11. **vendas_snapshot_diario** - Snapshot diário de vendas
12. **produto_analise_mensal** - Análise mensal de produtos
13. **vendedor_analise_mensal** - Análise mensal de vendedores

### Colunas Importantes Esperadas:

#### companies
- id (UUID, PK)
- name, cnpj, email, phone, address
- status, created_at, updated_at

#### sales
- id, customer_id, total, status
- sale_origin (PDV/OS) - IMPORTANTE
- company_id - IMPORTANTE (multi-tenant)
- created_at, updated_at

#### ordens_servico
- id, numero, cliente_id, status
- company_id - IMPORTANTE
- created_at, updated_at

---

## FASE 3: ESTADO ATUAL DO CÓDIGO

### Frontend - Páginas Principais:
- `/` - Dashboard (Index.tsx)
- `/pdv` - Vendas/PDV
- `/os` - Ordens de Serviço
- `/clientes` - Clientes
- `/produtos` - Produtos
- `/financeiro/*` - Módulo Financeiro (11 páginas)
- `/integracoes` - Integrações (Integration.tsx)

### Backend - Rotas Principais:
- `/api/financeiro/*` - Rotas financeiro (financeiro.js)
- `/api/dashboard/*` - Dashboard (dashboard.js)
- `/api/payments/*` - Pagamentos (payments.js)
- `/api/refunds/*` - Devoluções (refunds.js)
- `/api/reseller/*` - Revenda (reseller.js)

---

## PRÓXIMOS PASSOS

1. ✅ Identificar problema /integracoes (código OK, problema de permissão)
2. ⏳ Ler todos arquivos SQL principais para mapear schema completo
3. ⏳ Comparar schema esperado vs schema atual (verificar colunas faltantes)
4. ⏳ Identificar rotas/páginas quebradas
5. ⏳ Criar plano de reparo
6. ⏳ Executar correções

---

## OBSERVAÇÕES INICIAIS

- Muitos arquivos SQL indicam adicionar `company_id` em várias tabelas (multi-tenant)
- Sistema tem módulo financeiro IA-First com várias tabelas de análise
- Backend tem verificação dinâmica de colunas (ex: `hasSaleOrigin`, `hasCashierUserId`)
- Muitos arquivos de migração indicam evolução incremental do schema
