# ✅ COMANDO CORRETO PARA VPS

## ❌ ERRO:
Você digitou: `git pull origi`
O correto é: `git pull origin main`

---

## 📋 COMANDOS COMPLETOS CORRETOS:

```bash
# 1. Ir para o diretório
cd /root/primecamp-ofc

# 2. Atualizar código (COMANDO CORRETO)
git pull origin main

# 3. Rebuild do frontend
npm run build

# 4. Copiar arquivos buildados
sudo cp -r dist/* /var/www/html/

# 5. Verificar se copiou corretamente
ls -lh /var/www/html/index*.js | head -1

# 6. Reiniciar API (se necessário)
pm2 restart primecamp-api

# 7. Verificar logs
pm2 logs primecamp-api --lines 20
```

---

## 🔍 SE DER ERRO DE PERMISSÃO:

```bash
# Verificar se o repositório está configurado corretamente
git remote -v

# Deve mostrar algo como:
# origin  https://github.com/Usantos1/primecamp-ofc.git (fetch)
# origin  https://github.com/Usantos1/primecamp-ofc.git (push)
```

---

**Comando correto:** `git pull origin main` (não `origi`)

