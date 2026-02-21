# Comandos para Atualizar Backend no VPS

Execute estes comandos no servidor VPS para atualizar o backend com as correções do dashboard financeiro:

```bash
# 1. Ir para o diretório do projeto
cd /root/primecamp-ofc

# 2. Atualizar código do repositório
git pull origin main

# 3. Ir para o diretório do servidor
cd server

# 4. Instalar dependências (se necessário)
npm install

# 5. Reiniciar o backend com PM2
pm2 restart primecamp-api

# 6. Verificar logs para confirmar que está funcionando
pm2 logs primecamp-api --lines 50
```

**IMPORTANTE:** Não execute `npm run dev` se o PM2 já estiver rodando! Use apenas `pm2 restart primecamp-api`.

Se precisar parar o PM2 primeiro (não é necessário, mas caso queira):
```bash
pm2 stop primecamp-api
# Depois reinicie com:
pm2 start primecamp-api
```
