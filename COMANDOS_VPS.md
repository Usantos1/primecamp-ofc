# Comandos para executar na VPS

## ⚠️ IMPORTANTE: Se você está tendo erros no frontend (ex: "single().execute is not a function")

**Use o script de deploy completo que faz rebuild do frontend:**

```bash
cd /root/primecamp-ofc
git pull origin main
bash DEPLOY_COMPLETO.sh
```

Este script:
- Faz pull do código
- Instala dependências
- Faz rebuild completo do frontend (`npm run build`)
- Reinicia o servidor
- Testa o endpoint

## Opção 1: Script Automático (Apenas Backend)

```bash
cd /root/primecamp-ofc
git pull origin main
bash DEPLOY_TELEGRAM_INTEGRATION.sh
```

**Nota:** Este script NÃO faz rebuild do frontend. Use apenas se já tiver feito o build anteriormente.

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

### 3. Fazer rebuild do frontend (IMPORTANTE!)
```bash
# Instalar dependências (se necessário)
npm install

# Fazer build do frontend
npm run build
```

### 4. Reiniciar servidor Node.js
```bash
# Se estiver usando PM2:
pm2 restart primecamp-api

# Ou se não souber o nome:
pm2 restart all

# Ou reiniciar manualmente:
pm2 stop primecamp-api
pm2 start primecamp-api

# Verificar status:
pm2 status
pm2 logs primecamp-api --lines 50
```

### 5. Verificar se está funcionando
```bash
# Ver logs do servidor
pm2 logs primecamp --lines 100

# Verificar se o endpoint está respondendo
curl -X POST https://api.primecamp.cloud/api/upsert/kv_store_2c4defad \
  -H "Content-Type: application/json" \
  -d '{"data": {"key": "test", "value": {"test": true}}, "onConflict": "key"}'
```

## Verificação Final

1. **Limpe o cache do navegador** (Ctrl+Shift+R ou Cmd+Shift+R)
2. Acesse a página de Integrações: `https://primecamp.cloud/integracoes`
3. Configure os Chat IDs do Telegram
4. Verifique se está salvando sem erros no console do navegador (F12)

## Troubleshooting

Se o endpoint `/api/upsert` retornar 404:
- Verifique se o servidor foi reiniciado: `pm2 restart primecamp`
- Verifique os logs: `pm2 logs primecamp`
- Verifique se o arquivo `server/index.js` foi atualizado: `grep -n "upsert" server/index.js`

Se houver erros no SQL:
- Verifique se as tabelas já existem: `psql -U postgres -d banco_gestao -c "\dt" | grep telegram`
- Execute apenas as partes que faltam do script SQL manualmente

