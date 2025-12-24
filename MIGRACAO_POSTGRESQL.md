# Guia de Migração do Supabase para PostgreSQL

Este guia explica como migrar do Supabase para PostgreSQL direto no seu VPS.

## 📋 Pré-requisitos

1. PostgreSQL instalado e rodando no VPS (72.62.106.76)
2. Banco de dados `banco_gestao` criado
3. Todas as tabelas migradas do Supabase para o PostgreSQL

## 🔧 Configuração

### 1. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
VITE_DB_HOST=72.62.106.76
VITE_DB_NAME=banco_gestao
VITE_DB_USER=postgres
VITE_DB_PASSWORD=AndinhoSurf2015@
VITE_DB_PORT=5432
VITE_DB_SSL=false
VITE_DB_MODE=postgres
```

### 2. Instalação de Dependências

As dependências já foram instaladas:
- `pg` - Cliente PostgreSQL para Node.js
- `@types/pg` - Tipos TypeScript para pg

## 🔄 Estratégia de Migração

### Opção 1: Migração Completa (Recomendado)

Substituir completamente o Supabase por PostgreSQL:

1. **Migrar Autenticação**: Implementar sistema próprio de autenticação ou usar JWT
2. **Migrar Storage**: Usar sistema de arquivos ou S3
3. **Migrar Queries**: Substituir todas as chamadas do Supabase pelo cliente PostgreSQL

### Opção 2: Migração Híbrida (Temporária)

Manter Supabase apenas para autenticação e usar PostgreSQL para dados:

1. Manter autenticação no Supabase
2. Usar PostgreSQL para todas as queries de dados
3. Migrar autenticação depois

## 📝 Passos para Migração

### Passo 1: Exportar Dados do Supabase

```bash
# Conectar ao Supabase e exportar todas as tabelas
pg_dump -h gogxicjaqpqbhsfzutij.supabase.co -U postgres -d postgres > backup_supabase.sql
```

### Passo 2: Importar para PostgreSQL

```bash
# Importar no seu PostgreSQL
psql -h 72.62.106.76 -U postgres -d banco_gestao < backup_supabase.sql
```

### Passo 3: Atualizar Código

Substituir imports do Supabase pelo cliente PostgreSQL:

**Antes:**
```typescript
import { supabase } from '@/integrations/supabase/client';
const { data } = await supabase.from('tabela').select('*');
```

**Depois:**
```typescript
import { from } from '@/integrations/postgres/client';
const { data } = await from('tabela').select('*').execute();
```

### Passo 4: Atualizar Hooks

Todos os hooks que usam `useOrdensServicoSupabase`, `useClientesSupabase`, etc. precisam ser atualizados para usar o cliente PostgreSQL.

## ⚠️ Considerações Importantes

### 1. Autenticação

O Supabase fornece autenticação pronta. Para PostgreSQL direto, você precisará:
- Implementar sistema próprio de autenticação (JWT)
- Ou manter Supabase apenas para auth (híbrido)

### 2. Row Level Security (RLS)

O Supabase tem RLS nativo. No PostgreSQL direto, você precisará:
- Implementar RLS manualmente nas queries
- Ou usar middlewares para verificar permissões

### 3. Storage

O Supabase Storage não está disponível no PostgreSQL. Você precisará:
- Usar sistema de arquivos do servidor
- Ou integrar com S3/Cloud Storage

### 4. Real-time

O Supabase tem subscriptions em tempo real. No PostgreSQL direto:
- Usar polling ou WebSockets
- Ou usar bibliotecas como Socket.io

## 🛠️ Ferramentas Úteis

### Cliente PostgreSQL Criado

Foi criado um cliente compatível com a API do Supabase em `src/integrations/postgres/client.ts`:

```typescript
import { from } from '@/integrations/postgres/client';

// Select
const { data, error } = await from('ordens_servico')
  .select('*')
  .eq('status', 'aberta')
  .order('data_entrada', { ascending: false })
  .limit(10)
  .execute();

// Insert
const { data, error } = await from('ordens_servico')
  .insert({ numero: 1, status: 'aberta' });

// Update
const { data, error } = await from('ordens_servico')
  .eq('id', '123')
  .update({ status: 'fechada' });

// Delete
const { data, error } = await from('ordens_servico')
  .eq('id', '123')
  .delete();
```

## 📊 Checklist de Migração

- [ ] Exportar dados do Supabase
- [ ] Importar dados no PostgreSQL
- [ ] Configurar variáveis de ambiente
- [ ] Atualizar cliente de banco de dados
- [ ] Migrar hooks de dados
- [ ] Implementar autenticação (se necessário)
- [ ] Implementar RLS/permissões
- [ ] Migrar storage (se necessário)
- [ ] Testar todas as funcionalidades
- [ ] Atualizar documentação

## 🚀 Próximos Passos

1. Testar conexão com PostgreSQL
2. Migrar uma tabela por vez
3. Testar cada funcionalidade após migração
4. Monitorar performance

## 📞 Suporte

Se encontrar problemas durante a migração, verifique:
- Conexão com o PostgreSQL
- Permissões do usuário
- Estrutura das tabelas
- Logs do servidor

