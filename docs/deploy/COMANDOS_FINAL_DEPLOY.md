# 🚀 Deploy Final - Correção PM2 + Frontend

## ⚠️ Problema Identificado
- Backend: Porta 3000 em uso (processos duplicados)
- Frontend: Precisa ser buildado e deployado
- Rotas: ✅ Já estão no código e sendo registradas

## ✅ Solução em 2 Etapas

### ETAPA 1: Corrigir Backend (Porta 3000)

```bash
# 1. Parar PM2 e matar processos na porta 3000
cd /root/primecamp-ofc
pm2 stop all
pm2 delete all
lsof -ti:3000 | xargs kill -9 2>/dev/null
sleep 3

# 2. Iniciar backend limpo
cd server
pm2 start index.js --name primecamp-api
sleep 5

# 3. Verificar se está rodando
pm2 status
pm2 logs primecamp-api --lines 30 --nostream | tail -30
```

**✅ Verificar se não há mais erros `EADDRINUSE`**

---

### ETAPA 2: Deploy Frontend

```bash
# 1. Aplicar migração SQL (se ainda não foi aplicada)
cd /root/primecamp-ofc
sudo -u postgres psql -d postgres -f sql/CRIAR_TABELAS_IA_FINANCEIRO.sql

# 2. Build do frontend
npm run build

# 3. Deploy no Nginx
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html

# 4. Limpar cache do Nginx
sudo rm -rf /var/cache/nginx/*
sudo rm -rf /var/lib/nginx/cache/*
sudo systemctl reload nginx

# 5. Verificar se as rotas estão no bundle
echo "🔍 Verificando rotas no bundle:"
grep -r "DashboardExecutivo\|/financeiro" /var/www/html/assets/*.js | head -5
```

---

## ✅ Verificação Final

1. **Backend:**
   ```bash
   pm2 status
   curl http://localhost:3000/api/health
   ```

2. **Frontend:**
   - Acesse: `https://primecamp.cloud/financeiro`
   - Deve carregar o Dashboard Executivo (não "Página em Construção")
   - Limpe cache do navegador: `Ctrl + Shift + R`

3. **Logs:**
   ```bash
   pm2 logs primecamp-api --lines 50
   ```

---

## 🎯 Tudo Deve Funcionar Agora!

Após executar esses comandos, o sistema IA-First Financeiro deve estar 100% funcional.
