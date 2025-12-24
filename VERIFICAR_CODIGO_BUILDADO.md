# 🔍 Verificar Código Buildado no Servidor

## ❌ PROBLEMA:

Mesmo após limpar cache, ainda aparecem requisições para Supabase Auth.

## 🔍 VERIFICAÇÕES NECESSÁRIAS:

### 1. Verificar se o arquivo buildado foi atualizado

No VPS, execute:

```bash
# Verificar data de modificação dos arquivos buildados
ls -lh /var/www/html/index*.js | head -5

# Deve mostrar arquivos com data/hora RECENTE (de hoje)
```

### 2. Verificar se o código novo está no arquivo buildado

```bash
# Procurar pelo storage mock no arquivo buildado
grep -i "getItem.*null" /var/www/html/index*.js

# Se encontrar, o código está atualizado
# Se não encontrar, o build não foi feito corretamente
```

### 3. Verificar se há código antigo ainda

```bash
# Procurar por autoRefreshToken: true (código antigo)
grep -i "autoRefreshToken.*true" /var/www/html/index*.js

# Se encontrar, o código ANTIGO ainda está lá!
```

### 4. Verificar VITE_API_URL no buildado

```bash
# Verificar se VITE_API_URL está correto
grep -i "VITE_API_URL\|api.primecamp.cloud" /var/www/html/index*.js | head -3

# Deve mostrar a URL da API PostgreSQL
```

## 🔧 SOLUÇÃO SE O CÓDIGO NÃO ESTÁ ATUALIZADO:

### Opção 1: Rebuild Forçado

```bash
cd /root/primecamp-ofc

# Limpar build anterior
rm -rf dist

# Rebuild completo
npm run build

# Copiar arquivos
sudo cp -r dist/* /var/www/html/

# Verificar se foi copiado
ls -lh /var/www/html/index*.js | head -3
```

### Opção 2: Verificar .env antes do build

```bash
cd /root/primecamp-ofc

# Verificar .env
cat .env | grep VITE_DB_MODE
cat .env | grep VITE_API_URL

# Deve mostrar:
# VITE_DB_MODE=postgres
# VITE_API_URL=http://api.primecamp.cloud/api

# Se não estiver correto, editar:
nano .env

# Depois rebuild
npm run build
sudo cp -r dist/* /var/www/html/
```

## 🎯 TESTE DEFINITIVO:

### No navegador, abra o código fonte:

1. Abra DevTools (F12)
2. Vá em Sources (Fontes)
3. Procure por `index-*.js`
4. Abra o arquivo maior (geralmente `index-BiXX5deV.js` ou similar)
5. Procure por `getItem` (Ctrl+F)
6. Deve encontrar algo como: `getItem:()=>null` ou `getItem: function() { return null; }`

**Se NÃO encontrar isso, o código buildado está ANTIGO!**

## ✅ SE O CÓDIGO ESTÁ ATUALIZADO MAS AINDA FALHA:

Pode ser que algum código ainda esteja importando Supabase Auth diretamente. Verifique no Console do navegador se há erros como:

```
⚠️ DEPRECATED: Use authAPI.login() ao invés de supabase.auth.signInWithPassword()
```

Se aparecer esse erro, algum código ainda está usando Supabase Auth diretamente.

