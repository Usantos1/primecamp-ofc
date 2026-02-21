# 🚀 Atualizar Backend - Correção NPS

## ⚡ Comando Rápido (Uma Linha)

```bash
cd /root/primecamp-ofc && git pull origin main && cd server && pm2 restart primecamp-api && sleep 3 && pm2 logs primecamp-api --lines 20 --nostream
```

## 📝 Comandos Passo a Passo

```bash
# 1. Ir para o diretório do projeto
cd /root/primecamp-ofc

# 2. Atualizar código do repositório
git pull origin main

# 3. Ir para o diretório do servidor
cd server

# 4. Reiniciar o backend com PM2
pm2 restart primecamp-api

# 5. Aguardar alguns segundos
sleep 3

# 6. Verificar status
pm2 status

# 7. Ver logs recentes
pm2 logs primecamp-api --lines 20 --nostream
```

## 🔍 Verificar se Funcionou

```bash
# Ver status do PM2
pm2 status

# Ver logs em tempo real (Ctrl+C para sair)
pm2 logs primecamp-api

# Ver últimas 50 linhas de log
pm2 logs primecamp-api --lines 50 --nostream

# Testar health check da API
curl http://localhost:3000/api/health
```

## ⚠️ Se o Processo Não Existir

```bash
cd /root/primecamp-ofc/server
pm2 start index.js --name primecamp-api
pm2 save  # Salvar para iniciar após reboot
```

## 📋 O Que Foi Corrigido

- ✅ Backend agora verifica se a coluna `company_id` existe antes de filtrar
- ✅ Evita erro 500 ao atualizar pesquisas NPS
- ✅ Script SQL já foi executado e todos os registros têm `company_id`

## 🎯 Após Atualizar

Teste editando uma pesquisa NPS no frontend. O erro 500 deve estar resolvido!
