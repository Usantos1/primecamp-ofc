# 🚨 Correção Completa - PM2 + Rotas Financeiro

## Problemas Identificados
1. ✅ PM2 com erro `EADDRINUSE` - porta 3000 já está em uso
2. ✅ Rota `/financeiro` retornando 404 (mostrando "Página em Construção")

## Solução Completa

Execute os comandos abaixo **no servidor VPS**:

```bash
# 1. Ir para o diretório do projeto
cd /root/primecamp-ofc

# 2. Parar todos os processos PM2
pm2 stop all
pm2 delete all

# 3. Matar processos na porta 3000 (se houver)
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "Porta 3000 já está livre"

# 4. Aguardar um pouco
sleep 2

# 5. Atualizar código do repositório
git pull origin main

# 6. Verificar se as rotas financeiro estão no código
grep -n "path=\"/financeiro" src/App.tsx

# 7. Fazer build do frontend
npm run build

# 8. Verificar se as rotas estão no bundle
grep -r "DashboardExecutivo\|/financeiro" dist/assets/*.js | head -5

# 9. Iniciar backend com PM2
cd server
pm2 start index.js --name primecamp-api

# 10. Verificar logs do backend
sleep 3
pm2 logs primecamp-api --lines 30 --nostream

# 11. Verificar status do PM2
pm2 status

# 12. Fazer deploy do frontend
cd /root/primecamp-ofc
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html

# 13. Limpar cache do Nginx agressivamente
sudo rm -rf /var/cache/nginx/*
sudo rm -rf /var/lib/nginx/cache/*
sudo systemctl reload nginx

# 14. Verificar se as rotas estão no bundle deployado
echo "🔍 Verificando rotas no bundle deployado:"
grep -r "DashboardExecutivo" /var/www/html/assets/*.js | head -3 || echo "❌ Rota não encontrada!"
```

## Verificação Final

Após executar os comandos:

1. **Verifique o backend:**
   ```bash
   pm2 status
   curl http://localhost:3000/api/health
   ```

2. **Verifique o frontend:**
   - Acesse: `https://primecamp.cloud/financeiro`
   - Deve carregar o Dashboard Executivo (não "Página em Construção")
   - Limpe o cache do navegador: `Ctrl + Shift + R`

3. **Se ainda não funcionar:**
   - Verifique os logs: `pm2 logs primecamp-api --lines 50`
   - Verifique o bundle: `grep -r "financeiro" /var/www/html/assets/*.js | head -5`
