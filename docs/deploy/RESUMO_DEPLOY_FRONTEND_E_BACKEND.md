# Resumo - Deploy Frontend e Backend

## ⚠️ Problemas Identificados

1. **Frontend:** Erro `showAlreadyAppliedModal is not defined` - código não compilado no servidor
2. **Backend:** Rota `evaluate-interview-transcription` criada e corrigida

## 🔧 Solução Completa

### 1. ATUALIZAR BACKEND (Primeiro)

```bash
cd /root/primecamp-ofc
git pull origin main
pm2 restart primecamp-api
pm2 logs primecamp-api --lines 50
```

Isso corrige a avaliação de entrevistas com IA.

### 2. ATUALIZAR FRONTEND (Depois)

Execute o script de rebuild completo:

```bash
cd /root/primecamp-ofc
git pull origin main
chmod +x DEPLOY_FORCAR_REBUILD_COMPLETO.sh
./DEPLOY_FORCAR_REBUILD_COMPLETO.sh
```

OU manualmente:

```bash
cd /root/primecamp-ofc
git pull origin main
rm -rf dist node_modules/.vite node_modules/.cache .vite
npm run build
sudo rm -rf /var/www/primecamp.cloud/*
sudo cp -r dist/* /var/www/primecamp.cloud/
sudo chown -R www-data:www-data /var/www/primecamp.cloud
sudo chmod -R 755 /var/www/primecamp.cloud
sudo rm -rf /var/cache/nginx/* /var/lib/nginx/cache/*
sudo systemctl reload nginx
```

### 3. NO NAVEGADOR (Após deploy)

1. Feche TODAS as abas do primecamp.cloud
2. Ctrl+Shift+Delete → Limpar cache completamente
3. OU use modo anônimo (Ctrl+Shift+N)
4. Acesse: https://primecamp.cloud/vaga/Aux-tecnico

## 📋 Comandos Rápidos

### Backend apenas:
```bash
cd /root/primecamp-ofc && git pull origin main && pm2 restart primecamp-api
```

### Frontend apenas:
```bash
cd /root/primecamp-ofc && git pull origin main && rm -rf dist node_modules/.vite && npm run build && sudo rm -rf /var/www/primecamp.cloud/* && sudo cp -r dist/* /var/www/primecamp.cloud/ && sudo chown -R www-data:www-data /var/www/primecamp.cloud && sudo systemctl reload nginx
```

## ✅ Verificação

Após o deploy do frontend, o script `DEPLOY_FORCAR_REBUILD_COMPLETO.sh` verifica automaticamente se `showAlreadyAppliedModal` está no build compilado. Se não estiver, o script mostrará um erro.
