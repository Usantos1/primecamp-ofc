# Guia de Migração do Frontend

## ✅ Status Atual

- ✅ API Backend rodando em `http://api.primecamp.cloud`
- ✅ PostgreSQL conectado e funcionando
- ✅ Banco de dados migrado

## 🎯 Próximos Passos

### 1. Configurar Variáveis de Ambiente no Frontend

Certifique-se de que o `.env` do frontend tem:

```env
VITE_DB_MODE=postgres
VITE_API_URL=http://api.primecamp.cloud/api
```

### 2. Atualizar Imports nos Hooks

Substituir imports do Supabase pelo wrapper unificado:

**Antes:**
```typescript
import { supabase } from '@/integrations/supabase/client';
```

**Depois:**
```typescript
import { from } from '@/integrations/db/client';
```

### 3. Migrar Hooks Gradualmente

Começar pelos hooks mais simples e ir migrando um por vez:

#### Exemplo: `useOrdensServicoSupabase.ts`

**Antes:**
```typescript
const { data: ordens } = await supabase
  .from('ordens_servico')
  .select('*')
  .eq('status', 'aberta');
```

**Depois:**
```typescript
import { from } from '@/integrations/db/client';

const { data: ordens } = await from('ordens_servico')
  .select('*')
  .eq('status', 'aberta')
  .execute();
```

### 4. Diferenças Importantes

#### A) Métodos que retornam dados precisam de `.execute()`

**Supabase:**
```typescript
const { data } = await supabase.from('tabela').select('*');
```

**PostgreSQL (via wrapper):**
```typescript
const { data } = await from('tabela').select('*').execute();
```

#### B) Insert precisa de `.execute()` ou usar método direto

**Supabase:**
```typescript
const { data } = await supabase.from('tabela').insert({ campo: valor });
```

**PostgreSQL:**
```typescript
const { data } = await from('tabela').insert({ campo: valor });
// ou
const { data } = await from('tabela').insert({ campo: valor }).execute();
```

#### C) Update e Delete precisam de WHERE antes

**Supabase:**
```typescript
const { data } = await supabase
  .from('tabela')
  .update({ campo: valor })
  .eq('id', 123);
```

**PostgreSQL:**
```typescript
const { data } = await from('tabela')
  .eq('id', 123)
  .update({ campo: valor });
```

### 5. Autenticação

Por enquanto, manter autenticação no Supabase:

```typescript
import { auth } from '@/integrations/db/client';

// Login ainda usa Supabase
await auth.signInWithPassword({ email, password });
```

### 6. Checklist de Migração

Migrar nesta ordem:

- [ ] `useOrdensServicoSupabase.ts`
- [ ] `useClientesSupabase.ts`
- [ ] `useProdutosSupabase.ts`
- [ ] `useItensOSSupabase.ts`
- [ ] `useMarcasModelosSupabase.ts`
- [ ] `useCupomConfig.ts`
- [ ] `useChecklistConfig.ts`
- [ ] `useDashboardData.ts`
- [ ] `useDashboardConfig.ts`
- [ ] Outros hooks que usam Supabase

### 7. Testar Cada Hook

Após migrar cada hook:

1. Testar a funcionalidade no navegador
2. Verificar console por erros
3. Verificar se os dados estão sendo carregados corretamente
4. Testar operações CRUD (Create, Read, Update, Delete)

### 8. Manter Supabase como Fallback

O wrapper permite alternar facilmente:

```typescript
// No .env
VITE_DB_MODE=postgres  // Usa PostgreSQL
// ou
VITE_DB_MODE=supabase  // Usa Supabase (fallback)
```

## 🔍 Troubleshooting

### Erro: "Cannot read property 'execute' of undefined"

Verificar se está usando `.execute()` após a query:
```typescript
// ❌ Errado
const { data } = await from('tabela').select('*');

// ✅ Correto
const { data } = await from('tabela').select('*').execute();
```

### Erro: "Network request failed"

Verificar se a API está acessível:
```bash
curl http://api.primecamp.cloud/health
```

Verificar CORS na API se estiver em domínio diferente.

### Dados não aparecem

Verificar:
1. Console do navegador por erros
2. Network tab para ver requisições
3. Logs da API no servidor
4. Se a tabela existe no PostgreSQL

## 📝 Exemplo Completo de Migração

Vou criar um exemplo completo migrando `useOrdensServicoSupabase.ts` como referência.

