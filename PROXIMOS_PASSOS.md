# 🎯 Próximos Passos - Migração Frontend

## ✅ O que já está pronto:
- ✅ API Backend rodando (`http://api.primecamp.cloud`)
- ✅ PostgreSQL conectado e funcionando
- ✅ Banco de dados migrado

## 🚀 Agora vamos migrar o Frontend:

### Passo 1: Configurar `.env` do Frontend

Certifique-se que o `.env` na raiz do projeto tem:

```env
VITE_DB_MODE=postgres
VITE_API_URL=http://api.primecamp.cloud/api
```

### Passo 2: Atualizar um Hook de Teste

Vamos começar migrando um hook simples para testar. Vou atualizar o `useOrdensServicoSupabase.ts` como exemplo:

**Mudança necessária:**
- Trocar `import { supabase }` por `import { from } from '@/integrations/db/client'`
- Adicionar `.execute()` nas queries
- Ajustar ordem dos métodos (WHERE antes de UPDATE/DELETE)

### Passo 3: Testar no Navegador

1. Iniciar o frontend: `npm run dev`
2. Acessar a página de OS
3. Verificar se os dados aparecem
4. Verificar console por erros

### Passo 4: Migrar Outros Hooks Gradualmente

Após testar, migrar um hook por vez:
- `useClientesSupabase.ts`
- `useProdutosSupabase.ts`
- `useMarcasModelosSupabase.ts`
- etc.

## 🔧 Diferenças Importantes:

### Query (SELECT)
```typescript
// Antes (Supabase)
const { data } = await supabase.from('tabela').select('*');

// Depois (PostgreSQL)
const { data } = await from('tabela').select('*').execute();
```

### Insert
```typescript
// Antes
const { data } = await supabase.from('tabela').insert({ campo: valor });

// Depois
const { data } = await from('tabela').insert({ campo: valor });
```

### Update
```typescript
// Antes
const { data } = await supabase
  .from('tabela')
  .update({ campo: valor })
  .eq('id', 123);

// Depois
const { data } = await from('tabela')
  .eq('id', 123)
  .update({ campo: valor });
```

## ⚠️ Importante:

- **Autenticação**: Por enquanto, manter usando Supabase (já configurado no wrapper)
- **Testar cada hook**: Após migrar, testar no navegador antes de continuar
- **Rollback fácil**: Se algo der errado, mude `VITE_DB_MODE=supabase` no `.env`

## 📝 Quer que eu comece migrando algum hook específico?

Posso começar migrando:
1. `useOrdensServicoSupabase.ts` (mais usado)
2. `useClientesSupabase.ts` (mais simples)
3. Outro que você preferir

