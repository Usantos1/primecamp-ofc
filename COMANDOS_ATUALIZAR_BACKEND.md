# Comandos para Atualizar Backend no VPS

## ⚠️ PROBLEMA:
O frontend está dando erro 404 nas rotas `/api/financeiro/dashboard` e `/api/financeiro/recomendacoes` porque o backend não foi atualizado/reiniciado.

## Solução Rápida:

```bash
# 1. Ir para o diretório do projeto
cd /root/primecamp-ofc

# 2. Atualizar código
git pull origin main

# 3. Reiniciar backend
cd server
pm2 restart primecamp-api

# 4. Verificar status
pm2 status
pm2 logs primecamp-api --lines 20 --nostream
```

## Ou usar o script:

```bash
cd /root/primecamp-ofc
git pull origin main
chmod +x ATUALIZAR_BACKEND_VPS.sh
./ATUALIZAR_BACKEND_VPS.sh
```

## Se o processo não existir:

```bash
cd /root/primecamp-ofc/server
pm2 start index.js --name primecamp-api
pm2 save  # Salvar para iniciar após reboot
```

## Verificar se está funcionando:

```bash
# Testar health check
curl http://localhost:3000/api/health

# Testar rota do financeiro (requer autenticação)
curl -H "Authorization: Bearer SEU_TOKEN" http://localhost:3000/api/financeiro/dashboard
```
