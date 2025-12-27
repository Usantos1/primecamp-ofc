# Comandos para executar na VPS

## Opção 1: Script Automático (Recomendado)

```bash
cd /root/primecamp-ofc
git pull origin main
bash DEPLOY_TELEGRAM_INTEGRATION.sh
```

## Opção 2: Comandos Manuais

### 1. Atualizar código
```bash
cd /root/primecamp-ofc
git fetch origin
git pull origin main
```

### 2. Aplicar script SQL (criar tabelas do Telegram)
```bash
psql -U postgres -d banco_gestao -f CRIAR_TABELAS_FALTANDO.sql
```

**Nota:** Alguns erros são normais se as tabelas já existirem (NOTICE: relation already exists).

### 3. Reiniciar servidor Node.js
```bash
# Se estiver usando PM2:
pm2 restart primecamp

# Ou se não souber o nome:
pm2 restart all

# Ou reiniciar manualmente:
pm2 stop primecamp
pm2 start primecamp

# Verificar status:
pm2 status
pm2 logs primecamp --lines 50
```

### 4. Verificar se está funcionando
```bash
# Ver logs do servidor
pm2 logs primecamp --lines 100

# Verificar se o endpoint está respondendo
curl -X POST https://api.primecamp.cloud/api/upsert/kv_store_2c4defad \
  -H "Content-Type: application/json" \
  -d '{"data": {"key": "test", "value": {"test": true}}, "onConflict": "key"}'
```

## Verificação Final

1. Acesse a página de Integrações: `https://seu-dominio.com/integracoes`
2. Configure os Chat IDs do Telegram
3. Verifique se está salvando sem erros no console do navegador

## Troubleshooting

Se o endpoint `/api/upsert` retornar 404:
- Verifique se o servidor foi reiniciado: `pm2 restart primecamp`
- Verifique os logs: `pm2 logs primecamp`
- Verifique se o arquivo `server/index.js` foi atualizado: `grep -n "upsert" server/index.js`

Se houver erros no SQL:
- Verifique se as tabelas já existem: `psql -U postgres -d banco_gestao -c "\dt" | grep telegram`
- Execute apenas as partes que faltam do script SQL manualmente

