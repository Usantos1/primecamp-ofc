# 🔍 Verificar se está usando PostgreSQL

## Problema: Dados diferentes do banco PostgreSQL

## ✅ Checklist de Verificação:

### 1. Verificar `.env` do Frontend

No servidor VPS, verificar o `.env` na raiz do projeto:

```bash
cd /root/primecamp-ofc
cat .env | grep VITE_DB_MODE
cat .env | grep VITE_API_URL
```

Deve mostrar:
```env
VITE_DB_MODE=postgres
VITE_API_URL=http://api.primecamp.cloud/api
```

**IMPORTANTE:** Se mudou o `.env`, precisa **rebuildar** o frontend!

### 2. Rebuildar Frontend após mudar `.env`

```bash
cd /root/primecamp-ofc
npm run build
# ou
pnpm build
```

As variáveis `VITE_*` são embutidas no build, então precisa rebuildar!

### 3. Verificar qual banco a API está usando

No servidor, verificar logs da API:

```bash
pm2 logs primecamp-api --lines 50
```

Ou testar diretamente:

```bash
# Verificar conexão
curl http://localhost:3000/health

# Testar query direta
curl -X POST http://localhost:3000/api/query/ordens_servico \
  -H "Content-Type: application/json" \
  -d '{"select":"*","limit":5}'
```

### 4. Verificar no Console do Navegador

Abra o DevTools (F12) e verifique:

```javascript
// Verificar qual modo está sendo usado
console.log('DB Mode:', import.meta.env.VITE_DB_MODE);
console.log('API URL:', import.meta.env.VITE_API_URL);

// Verificar requisições na aba Network
// Deve aparecer requisições para api.primecamp.cloud/api/query/...
```

### 5. Verificar se está usando Supabase ou PostgreSQL

No console do navegador, verificar localStorage:

```javascript
// Verificar se tem token do Supabase
localStorage.getItem('sb-gogxicjaqpqbhsfzutij-auth-token')

// Verificar requisições na aba Network
// Se estiver usando PostgreSQL, deve ver requisições para api.primecamp.cloud
// Se estiver usando Supabase, deve ver requisições para gogxicjaqpqbhsfzutij.supabase.co
```

## 🔧 Solução Rápida:

### Passo 1: Verificar `.env`

```bash
cd /root/primecamp-ofc
nano .env
```

Certifique-se de ter:
```env
VITE_DB_MODE=postgres
VITE_API_URL=http://api.primecamp.cloud/api
```

### Passo 2: Rebuildar Frontend

```bash
cd /root/primecamp-ofc
npm run build
# ou
pnpm build
```

### Passo 3: Reiniciar Servidor Web (se necessário)

Se estiver usando Nginx ou outro servidor web:

```bash
sudo systemctl restart nginx
# ou
sudo systemctl restart seu-servidor-web
```

### Passo 4: Limpar Cache do Navegador

- Pressione `Ctrl+Shift+R` (Windows/Linux) ou `Cmd+Shift+R` (Mac)
- Ou abra em modo anônimo/privado

## 🐛 Debug Avançado:

### Verificar qual cliente está sendo usado

Adicionar log temporário em `src/integrations/db/client.ts`:

```typescript
export const from = (tableName: string) => {
  const mode = DB_MODE;
  console.log(`[DB Client] Using ${mode} for table ${tableName}`);
  
  if (DB_MODE === 'postgres') {
    return postgresFrom(tableName);
  }
  return supabase.from(tableName);
};
```

### Verificar requisições na Network

1. Abra DevTools (F12)
2. Vá na aba "Network"
3. Recarregue a página
4. Procure por requisições que começam com:
   - `api.primecamp.cloud` = PostgreSQL ✅
   - `gogxicjaqpqbhsfzutij.supabase.co` = Supabase ❌

## ⚠️ Problema Comum:

**Variáveis `VITE_*` são embutidas no build!**

Se mudou o `.env` mas não rebuildou, o frontend ainda está usando as variáveis antigas.

**Solução:** Sempre rebuildar após mudar `.env`:

```bash
npm run build
```

