# 🚀 Migração Completa Final - Passo a Passo

## ✅ O QUE FOI FEITO:

1. ✅ Interceptação melhorada com stack trace
2. ✅ OrdensServico.tsx migrado para usar wrapper
3. ✅ Código commitado e enviado para Git

## 📋 EXECUTAR NO VPS (ORDEM CRÍTICA):

### 1. Parar API e Limpar Processos

```bash
pm2 stop primecamp-api
pm2 delete primecamp-api
fuser -k 3000/tcp
pm2 kill
```

### 2. Instalar Dependências da API

```bash
cd /root/primecamp-ofc/server
npm install
```

**VERIFICAR se instalou:**
```bash
npm list jsonwebtoken bcrypt
```

### 3. Iniciar API

```bash
pm2 start index.js --name primecamp-api
pm2 save
pm2 logs primecamp-api --lines 10
```

**VERIFICAR se está funcionando:**
```bash
curl http://localhost:3000/health
```

Deve retornar: `{"status":"ok","database":"connected"}`

### 4. Atualizar Código do Frontend

```bash
cd /root/primecamp-ofc
git pull origin main
```

### 5. Rebuild FORÇADO (limpar TUDO)

```bash
# Limpar build anterior COMPLETAMENTE
rm -rf dist
rm -rf node_modules/.vite

# Rebuild completo
npm run build

# Copiar arquivos
sudo cp -r dist/* /var/www/html/

# Verificar se interceptação está no código
grep -i "BLOQUEADA\|Interceptação" /var/www/html/index*.js | head -3
```

**Se encontrar "BLOQUEADA" ou "Interceptação", o código está correto!**

## 🧹 NO NAVEGADOR (LIMPAR TUDO):

### 1. Fechar TODAS as abas do site

### 2. Limpar localStorage COMPLETAMENTE

No Console (F12):

```javascript
localStorage.clear();
sessionStorage.clear();
console.log('Limpo!', Object.keys(localStorage));
```

### 3. Limpar Cache COMPLETAMENTE

1. `Ctrl + Shift + Delete`
2. Marque **TUDO**
3. Período: **Todo o período**
4. Limpar

### 4. Fechar Navegador Completamente

Feche todas as janelas do navegador.

### 5. Abrir Navegador e Testar

1. Abra navegador novamente
2. Acesse: `https://primecamp.cloud/auth`
3. **Abra Console ANTES de fazer login** (F12)
4. Vá em Network → Marque "Disable cache"
5. Faça login

### 6. Verificar Console

**Deve aparecer:**
- ✅ `🚫 Interceptação Supabase Auth ATIVADA`
- ✅ `🚫🚫🚫 REQUISIÇÃO SUPABASE AUTH BLOQUEADA via fetch:` (se tentar fazer requisição)
- ✅ Requisições para `api.primecamp.cloud/api/auth/login`
- ❌ **ZERO** requisições para `supabase.co/auth/v1/token`

## 🔍 SE AINDA APARECER SUPABASE AUTH:

### Verificar no Console:

Procure por mensagens como:
- `🚫🚫🚫 REQUISIÇÃO SUPABASE AUTH BLOQUEADA`
- `Stack trace da requisição bloqueada:`

**Se aparecer essas mensagens, a interceptação ESTÁ FUNCIONANDO!** O problema é que algum código ainda está tentando fazer a requisição.

### Verificar código buildado:

No navegador, DevTools → Sources:
1. Procure por `index-*.js` (arquivo maior)
2. Abra o arquivo
3. Procure por `BLOQUEADA` (Ctrl+F)
4. Deve encontrar a interceptação

**Se NÃO encontrar, o build não foi feito corretamente!**

## ✅ CHECKLIST FINAL:

- [ ] API parada e processos limpos
- [ ] `npm install` executado no servidor
- [ ] API iniciada e funcionando (`/health` retorna OK)
- [ ] `git pull` executado
- [ ] `rm -rf dist` executado
- [ ] `npm run build` executado
- [ ] Arquivos copiados para `/var/www/html/`
- [ ] Interceptação verificada no código buildado
- [ ] localStorage limpo
- [ ] Cache limpo
- [ ] Navegador fechado e reaberto
- [ ] Login testado com DevTools aberto
- [ ] Console verificado (mensagens de bloqueio aparecem)

## 🎯 RESULTADO ESPERADO:

Após seguir TODOS os passos:
- ✅ Login funciona via `api.primecamp.cloud/api/auth/login`
- ✅ Console mostra `🚫 Interceptação Supabase Auth ATIVADA`
- ✅ Se tentar fazer requisição Supabase Auth, aparece `🚫🚫🚫 BLOQUEADA`
- ✅ **ZERO** requisições bem-sucedidas para `supabase.co/auth/v1/token`
- ✅ Token salvo como `auth_token`
- ✅ Profile carregado do PostgreSQL

