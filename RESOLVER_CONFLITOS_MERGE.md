# 🔧 Resolver Conflitos de Merge no VPS

## ❌ PROBLEMA:

Conflitos de merge em:
- `.env`
- `server/package.json`

## ✅ SOLUÇÃO:

### Opção 1: Descartar mudanças locais e usar versão remota (Mais Simples)

**CUIDADO:** Isso vai sobrescrever seu `.env` local!

```bash
cd /root/primecamp-ofc

# Abortar merge atual
git merge --abort

# Descartar mudanças locais
git reset --hard origin/main

# Atualizar código
git pull origin main

# Rebuild
npm run build
sudo cp -r dist/* /var/www/html/
pm2 restart primecamp-api
```

**Depois disso, você precisa recriar o `.env` com suas configurações do VPS:**

```bash
nano .env
```

Adicione:
```env
VITE_DB_MODE=postgres
VITE_API_URL=http://api.primecamp.cloud/api
VITE_DB_HOST=72.62.106.76
VITE_DB_NAME=banco_gestao
VITE_DB_USER=postgres
VITE_DB_PASSWORD=AndinhoSurf2015@
VITE_DB_PORT=5432
VITE_DB_SSL=false
VITE_API_ORIGIN=https://primecamp.cloud
PORT=3000
NODE_ENV=production
JWT_SECRET=ae6cf1f3d6ee17f916d177f3721e16e70285651a829fa017b1137513d373d745231d96ecb14006f938ca6557fdd14b26494085bc6a947c2d7347ba6d29e7085a
```

### Opção 2: Resolver conflitos manualmente (Mais Trabalhoso)

```bash
cd /root/primecamp-ofc

# Ver conflitos
git status

# Resolver conflitos manualmente
nano .env
nano server/package.json

# Depois de resolver, marcar como resolvido
git add .env server/package.json
git commit -m "chore: resolver conflitos de merge"

# Continuar pull
git pull origin main

# Rebuild
npm run build
sudo cp -r dist/* /var/www/html/
pm2 restart primecamp-api
```

## 🎯 RECOMENDAÇÃO:

Use **Opção 1** (mais rápida). Você só precisa recriar o `.env` depois.

## 📋 PASSOS COMPLETOS:

```bash
cd /root/primecamp-ofc

# 1. Abortar merge
git merge --abort

# 2. Resetar para versão remota
git reset --hard origin/main

# 3. Pull atualizado
git pull origin main

# 4. Recriar .env (copie as configurações acima)
nano .env

# 5. Rebuild
npm run build
sudo cp -r dist/* /var/www/html/

# 6. Reiniciar API
pm2 restart primecamp-api
```

## ✅ DEPOIS DISSO:

No navegador:
1. Limpar localStorage
2. Hard refresh (`Ctrl + Shift + R`)
3. Testar login
4. Verificar Console → Network (não deve ter Supabase Auth)

