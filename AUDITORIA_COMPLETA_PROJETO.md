# AUDITORIA COMPLETA DO PROJETO PRIMECAMP

**Data Início:** 2025-01-XX  
**Objetivo:** Identificar e corrigir todas inconsistências entre documentação (.md/.sql) e código atual

---

## ⚠️ PROBLEMA IMEDIATO RESOLVIDO

### `/integracoes` não aparece no menu
- **Status:** ✅ CÓDIGO CORRETO - problema de permissão
- **Causa:** Link está em `adminItems`, só aparece se `userIsAdmin === true`
- **Solução:** Verificar se usuário tem permissão de admin. O código está correto.

---

## FASE 1: INVENTÁRIO DE DOCUMENTAÇÃO

### 1.1 Arquivos .sql Principais (Schema Esperado)

#### Tabelas Core do Sistema:
1. **sql/CRIAR_TABELA_COMPANIES.sql** - Multi-tenant (companies)
2. **sql/ADICIONAR_COMPANY_ID_TODAS_TABELAS_COMPLETO.sql** - Adiciona company_id em todas tabelas
3. **APPLY_PDV_MIGRATION.sql** - Schema completo PDV (sales, sale_items, payments, cash_register_sessions, etc)
4. **CRIAR_TABELAS_BANCO.sql** - Schema base (users, tasks, processes, sales, produtos, clientes, etc)

#### Tabelas Financeiro IA:
5. **sql/CRIAR_TABELAS_IA_FINANCEIRO.sql** - Sistema financeiro IA-First:
   - vendas_snapshot_diario
   - produto_analise_mensal
   - vendedor_analise_mensal
   - vendas_analise_temporal
   - ia_previsoes
   - ia_recomendacoes
   - dre
   - planejamento_anual

6. **sql/CRIAR_TABELA_DRE.sql** - DRE (Demonstrativo do Resultado do Exercício)

### 1.2 Arquivos .md Principais (Regras de Negócio)

- README.md - Documentação geral
- STATUS_IMPLEMENTACAO.md - Status de implementação
- ROTAS_FINANCEIRO.md - Rotas do módulo financeiro
- PLANEJAMENTO_IA_FINANCEIRO.md - Planejamento do módulo IA financeiro

---

## FASE 2: SCHEMA ESPERADO (Baseado em .sql)

### 2.1 Tabelas Principais e Colunas Esperadas

#### ✅ companies (Multi-tenant)
```sql
- id UUID PRIMARY KEY
- name VARCHAR(255) NOT NULL
- cnpj VARCHAR(18) UNIQUE
- email, phone, address
- status VARCHAR(20) DEFAULT 'active'
- created_at, updated_at
```

#### ✅ users
```sql
- id UUID PRIMARY KEY
- email, password_hash
- company_id UUID REFERENCES companies(id) -- IMPORTANTE
- created_at, updated_at
```

#### ✅ sales (PDV)
```sql
- id UUID PRIMARY KEY
- numero INTEGER UNIQUE
- status TEXT ('draft', 'open', 'paid', 'partial', 'canceled', 'refunded')
- cliente_id UUID
- cliente_nome, cliente_cpf_cnpj, cliente_telefone TEXT
- ordem_servico_id UUID
- subtotal, desconto_total, total, total_pago NUMERIC(12,2)
- vendedor_id UUID REFERENCES users(id)
- sale_origin TEXT ('PDV', 'OS') -- IMPORTANTE (pode não existir em todas versões)
- cash_register_session_id UUID -- IMPORTANTE
- company_id UUID REFERENCES companies(id) -- IMPORTANTE
- is_draft BOOLEAN
- created_at, updated_at, finalized_at, canceled_at
```

#### ✅ sale_items
```sql
- id UUID PRIMARY KEY
- sale_id UUID REFERENCES sales(id)
- produto_id UUID REFERENCES produtos(id)
- produto_nome, produto_codigo, produto_codigo_barras TEXT
- produto_tipo TEXT ('produto', 'servico')
- quantidade NUMERIC(10,3)
- valor_unitario, desconto, valor_total NUMERIC(12,2)
- observacao TEXT
- garantia_dias, garantia_inicio, garantia_fim
- created_at
```

#### ✅ ordens_servico
```sql
- id UUID PRIMARY KEY
- numero VARCHAR(50)
- cliente_id UUID
- cliente_nome VARCHAR(255)
- equipamento, marca, modelo, numero_serie VARCHAR
- defeito_relatado, observacoes TEXT
- status VARCHAR(50) DEFAULT 'pendente'
- tecnico_id UUID REFERENCES users(id)
- valor_orcamento, valor_total DECIMAL(10,2)
- company_id UUID REFERENCES companies(id) -- IMPORTANTE
- data_entrada, data_saida TIMESTAMP
- created_at, updated_at
```

#### ✅ produtos
```sql
- id UUID PRIMARY KEY
- nome VARCHAR(255) NOT NULL
- descricao TEXT
- codigo, codigo_barras VARCHAR(100)
- categoria VARCHAR(100)
- preco_custo, preco_venda DECIMAL(15,2)
- quantidade (estoque_atual) INTEGER
- estoque_minimo INTEGER
- company_id UUID REFERENCES companies(id) -- IMPORTANTE
- ativo/situacao VARCHAR(20) or BOOLEAN
- created_at, updated_at
```

#### ✅ clientes
```sql
- id UUID PRIMARY KEY
- nome VARCHAR(255) NOT NULL
- email, telefone VARCHAR
- cpf_cnpj VARCHAR(20)
- endereco, cidade, estado, cep VARCHAR/TEXT
- observacoes TEXT
- company_id UUID REFERENCES companies(id) -- IMPORTANTE
- ativo/situacao VARCHAR(20) or BOOLEAN
- created_at, updated_at
```

#### ✅ cash_register_sessions (Caixa)
```sql
- id UUID PRIMARY KEY
- numero INTEGER UNIQUE
- operador_id UUID REFERENCES users(id) -- ou user_id
- operador_nome TEXT
- valor_inicial, valor_final, valor_esperado, divergencia NUMERIC(12,2)
- status TEXT ('open', 'closed')
- totais_forma_pagamento JSONB
- opened_at, closed_at TIMESTAMP
- closed_by UUID
```

#### ✅ payments
```sql
- id UUID PRIMARY KEY
- sale_id UUID REFERENCES sales(id)
- forma_pagamento TEXT ('dinheiro', 'pix', 'debito', 'credito', etc)
- valor, troco NUMERIC(12,2)
- parcelas INTEGER
- status TEXT ('pending', 'confirmed', 'canceled', 'refunded')
- created_at, confirmed_at, canceled_at, refunded_at
```

#### ✅ bills_to_pay (Contas a Pagar)
```sql
- id UUID PRIMARY KEY
- amount NUMERIC
- status TEXT ('pago', 'pendente', etc)
- payment_date, paid_at, paid_date, pago_em TIMESTAMP (variações)
- due_date TIMESTAMP
- company_id UUID REFERENCES companies(id)
- created_at, updated_at
```

#### ✅ dre
```sql
- id UUID PRIMARY KEY
- periodo DATE NOT NULL
- tipo VARCHAR(20) ('mensal', 'anual')
- receita_bruta, deducoes, receita_liquida NUMERIC(15,2)
- custo_produtos_vendidos, lucro_bruto NUMERIC(15,2)
- margem_bruta_percentual NUMERIC(5,2)
- despesas_operacionais, ebitda NUMERIC(15,2)
- resultado_financeiro, lucro_liquido NUMERIC(15,2)
- margem_liquida_percentual NUMERIC(5,2)
- created_at, updated_at
- CONSTRAINT UNIQUE(periodo, tipo)
```

#### ✅ planejamento_anual
```sql
- id UUID PRIMARY KEY
- ano INTEGER UNIQUE
- receita_planejada NUMERIC(10,2)
- meta_mensal JSONB -- {1: valor, 2: valor, ...}
- despesas_planejadas NUMERIC(10,2)
- observacoes TEXT
- criado_por UUID REFERENCES users(id)
- created_at, updated_at
```

#### ✅ ia_recomendacoes
```sql
- id UUID PRIMARY KEY
- tipo VARCHAR(50) ('preco', 'estoque', 'vendedor', etc)
- titulo VARCHAR(200)
- descricao TEXT
- acao_sugerida TEXT
- prioridade INTEGER (1-10)
- status VARCHAR(20) ('pendente', 'aceita', 'rejeitada', 'aplicada')
- company_id UUID REFERENCES companies(id)
- created_at, updated_at
```

#### ✅ vendas_snapshot_diario
```sql
- id UUID PRIMARY KEY
- data DATE UNIQUE
- total_pdv, total_os, total_geral NUMERIC(10,2)
- quantidade_vendas_pdv, quantidade_vendas_os INTEGER
- ticket_medio_pdv, ticket_medio_os NUMERIC(10,2)
- created_at, updated_at
```

---

## FASE 3: ESTADO ATUAL DO CÓDIGO

### 3.1 Frontend - Páginas Principais

**Páginas Identificadas:**
- `/` - Index.tsx (Dashboard principal)
- `/pdv` - PDV/Vendas
- `/os` - OrdensServico.tsx
- `/clientes` - Clientes.tsx
- `/produtos` - Produtos.tsx
- `/financeiro/*` - 11 páginas financeiro
- `/integracoes` - Integration.tsx
- `/admin/*` - Páginas admin

### 3.2 Backend - Rotas Principais

**server/routes/financeiro.js:**
- GET /dashboard
- GET /vendedores/analise
- GET /produtos/analise
- GET /temporal/analise
- GET /recomendacoes
- POST /recomendacoes/:id/aplicar
- GET /estoque/recomendacoes
- GET /dre/:periodo
- GET /planejamento/:ano
- POST /planejamento/:ano
- POST /precificacao/sugerir

**server/routes/dashboard.js:**
- GET /company/:companyId/metrics
- GET /company/:companyId/sales-chart
- GET /company/:companyId/orders-by-status

**server/routes/payments.js:**
- POST /create
- POST /webhook
- GET /status/:paymentId
- GET /company/:companyId

**server/routes/refunds.js:**
- GET /, GET /:id
- POST /
- PUT /:id/approve, /:id/complete, /:id/cancel
- GET /vouchers/*

---

## FASE 4: DIFERENÇAS IDENTIFICADAS (GAP ANALYSIS)

### 4.1 CRÍTICO (Impede app de rodar)

**A SER VERIFICADO:**
- [ ] Tabelas core faltantes (companies, users, sales, etc)
- [ ] Coluna company_id faltante em tabelas que devem ter (multi-tenant)
- [ ] Foreign keys quebradas

### 4.2 ALTO (Quebra fluxos principais)

**A SER VERIFICADO:**
- [ ] Coluna sale_origin faltante em sales (backend tem fallback, mas ideal ter)
- [ ] Coluna cash_register_session_id faltante em sales
- [ ] Colunas de pagamento em bills_to_pay (payment_date vs paid_at vs pago_em)

### 4.3 MÉDIO (Quebra relatórios/filtros)

**A SER VERIFICADO:**
- [ ] Tabelas de análise IA faltantes (vendas_snapshot_diario, produto_analise_mensal, etc)
- [ ] Índices faltantes (performance)

### 4.4 BAIXO (UI/ajustes)

**A SER VERIFICADO:**
- [ ] Campos opcionais faltantes
- [ ] Valores default diferentes

---

## FASE 5: PLANO DE REPARO

**A SER PREENCHIDO APÓS VERIFICAÇÃO COMPLETA**

---

## FASE 6: CHECKLIST DE VALIDAÇÃO

**A SER PREENCHIDO APÓS CORREÇÕES**

---

## PRÓXIMOS PASSOS IMEDIATOS

1. ✅ Criar estrutura da auditoria
2. ⏳ Ler mais arquivos SQL para mapear schema completo
3. ⏳ Criar script SQL de verificação (comparar banco atual vs esperado)
4. ⏳ Identificar diferenças específicas
5. ⏳ Criar migrations corretivas
6. ⏳ Executar correções
7. ⏳ Validar
