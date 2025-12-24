# ✅ Verificação do Arquivo .env

## 📋 Configuração CORRETA para Desconectar do Supabase:

Seu arquivo `.env` deve ter estas linhas:

```env
# ============================================
# CRÍTICO: Forçar PostgreSQL
# ============================================
VITE_DB_MODE=postgres

# URL da API PostgreSQL
VITE_API_URL=http://api.primecamp.cloud/api

# ============================================
# Configuração PostgreSQL (Backend)
# ============================================
VITE_DB_HOST=72.62.106.76
VITE_DB_NAME=banco_gestao
VITE_DB_USER=postgres
VITE_DB_PASSWORD=AndinhoSurf2015@
VITE_DB_PORT=5432
VITE_DB_SSL=false

# ============================================
# Configuração do Servidor API
# ============================================
VITE_API_ORIGIN=https://primecamp.cloud
PORT=3000
NODE_ENV=production
JWT_SECRET=your_jwt_secret_here
```

## ✅ Checklist:

- [ ] `VITE_DB_MODE=postgres` ← **CRÍTICO!** Deve ser `postgres`, não `supabase`
- [ ] `VITE_API_URL=http://api.primecamp.cloud/api` ← URL da sua API
- [ ] `VITE_DB_HOST=72.62.106.76` ← IP do seu VPS PostgreSQL
- [ ] `VITE_DB_NAME=banco_gestao` ← Nome do banco
- [ ] `VITE_DB_USER=postgres` ← Usuário do PostgreSQL
- [ ] `VITE_DB_PASSWORD=AndinhoSurf2015@` ← Senha do PostgreSQL

## ⚠️ IMPORTANTE:

1. **Após mudar `.env`, SEMPRE fazer rebuild:**
   ```bash
   npm run build
   ```

2. **Variáveis `VITE_*` são embutidas no build!**
   - Se mudar `.env` sem rebuild, ainda vai usar valores antigos
   - Sempre rebuild após mudanças

3. **Verificar no console do navegador:**
   - Deve aparecer: `[DB Client] Configuração: usando 'PostgreSQL'`
   - NÃO deve aparecer: `usando 'Supabase'`

## 🔍 Como Verificar se Está Funcionando:

1. **No console do navegador:**
   ```
   [DB Client] Configuração: usando 'PostgreSQL'
   [DB Client] ✅ Usando PostgreSQL para tabela: produtos
   ```

2. **No Network tab:**
   - Requisições devem ir para: `api.primecamp.cloud/api/query/...`
   - NÃO devem ir para: `gogxicjaqpqbhsfzutij.supabase.co`

3. **Testar:**
   - Abrir `primecamp.cloud/produtos`
   - Deve listar produtos do PostgreSQL
   - Não deve aparecer erros do Supabase no console

## 🐛 Se Ainda Usar Supabase:

1. Verificar se `.env` tem `VITE_DB_MODE=postgres` (não `supabase`)
2. Fazer rebuild: `npm run build`
3. Limpar cache do navegador (Ctrl+Shift+R)
4. Verificar logs do console

