# 🔧 Resolver Git Pull no VPS

## ❌ PROBLEMA:

O `git pull` falhou porque há mudanças locais no VPS:
- `.env` (configurações locais)
- `server/package.json` (pode ter dependências diferentes)

## ✅ SOLUÇÃO:

### Opção 1: Stash das mudanças locais (Recomendado)

Salva as mudanças locais temporariamente:

```bash
cd /root/primecamp-ofc
git stash
git pull origin main
git stash pop  # Restaura as mudanças locais depois
```

### Opção 2: Descartar mudanças locais (se não importarem)

**CUIDADO:** Isso vai sobrescrever suas mudanças locais!

```bash
cd /root/primecamp-ofc
git reset --hard origin/main
git pull origin main
```

### Opção 3: Commit das mudanças locais primeiro

Se as mudanças no `.env` e `server/package.json` são importantes:

```bash
cd /root/primecamp-ofc
git add .env server/package.json
git commit -m "chore: atualizar configurações locais do VPS"
git pull origin main
# Resolver conflitos se houver
```

## 📋 DEPOIS DO GIT PULL:

### 1. Verificar se as mudanças foram aplicadas

```bash
# Verificar se o arquivo foi atualizado
grep -A 5 "storage:" src/integrations/supabase/client.ts
```

Deve mostrar o storage mock que criamos.

### 2. Rebuild do Frontend

```bash
cd /root/primecamp-ofc
npm run build
sudo cp -r dist/* /var/www/html/
```

### 3. Reiniciar API

```bash
pm2 restart primecamp-api
```

### 4. Testar

No navegador:
1. Limpar localStorage
2. Hard refresh (`Ctrl + Shift + R`)
3. Fazer login
4. Verificar Console → Network (não deve ter requisições Supabase Auth)

## 🎯 RECOMENDAÇÃO:

Use **Opção 1 (stash)** para preservar suas configurações locais do `.env`:

```bash
cd /root/primecamp-ofc
git stash
git pull origin main
git stash pop
npm run build
sudo cp -r dist/* /var/www/html/
pm2 restart primecamp-api
```

