# 🚀 COMANDOS PARA VPS - REBUILD FINAL

## ⚠️ IMPORTANTE: REBUILD OBRIGATÓRIO

As correções só terão efeito após rebuild do frontend!

---

## 📋 COMANDOS COMPLETOS:

```bash
# 1. Atualizar código
cd /root/primecamp-ofc
git pull origin main

# 2. Rebuild do frontend (OBRIGATÓRIO)
npm run build

# 3. Copiar arquivos buildados
sudo cp -r dist/* /var/www/html/

# 4. Verificar se copiou corretamente
ls -lh /var/www/html/index*.js | head -1

# 5. Reiniciar API (se necessário)
pm2 restart primecamp-api

# 6. Verificar logs
pm2 logs primecamp-api --lines 20
```

---

## ✅ VERIFICAÇÃO:

Após rebuild, verifique:

1. **Data dos arquivos buildados:**
   ```bash
   ls -lh /var/www/html/index*.js | head -1
   ```
   Deve mostrar data/hora recente.

2. **Testar API:**
   ```bash
   curl http://localhost:3000/api/health
   ```

3. **Verificar se servidor está rodando:**
   ```bash
   pm2 status
   ```

---

## 🧹 NO NAVEGADOR (APÓS REBUILD):

1. **Limpar cache completamente:**
   - `Ctrl + Shift + Delete`
   - Selecionar "Imagens e arquivos em cache"
   - Período: "Todo o período"
   - Limpar

2. **Hard Refresh:**
   - `Ctrl + Shift + R` (Chrome/Edge)
   - Ou fechar e abrir navegador

3. **Verificar Console:**
   - Abrir DevTools (F12)
   - Deve aparecer:
     ```
     ✅ Interceptação Supabase COMPLETA ATIVADA
     ✅ Limpeza automática de tokens Supabase executada
     ```

4. **Testar Login:**
   - Acessar: `https://primecamp.cloud/auth`
   - Fazer login
   - Verificar Network tab:
     - ❌ NÃO deve ter `supabase.co/auth/v1/token`
     - ✅ Deve ter `api.primecamp.cloud/api/auth/login`

---

**Status:** ✅ **AGUARDANDO REBUILD NA VPS**

