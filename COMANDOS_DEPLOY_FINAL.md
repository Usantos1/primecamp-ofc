# 🚀 COMANDOS DE DEPLOY - Sistema IA-First Financeiro (COMPLETO)

## ✅ CONFIRMAÇÃO: TUDO 100% IMPLEMENTADO

- ✅ 8 tabelas SQL
- ✅ 12 endpoints backend
- ✅ 4 jobs agendados
- ✅ 11 hooks React Query
- ✅ 9 componentes frontend
- ✅ Todas as rotas configuradas
- ✅ Jobs registrados no server/index.js

---

## 📋 DEPLOY COMPLETO (VPS)

### 1. Conectar no VPS
```bash
ssh root@seu-vps
cd /root/primecamp-ofc
```

### 2. Atualizar código
```bash
git pull origin main
```

### 3. Aplicar Migração SQL (SE AINDA NÃO FOI APLICADA)

**Primeiro, descubra o nome do banco:**
```bash
sudo -u postgres psql -l
```

**Ou verifique no .env:**
```bash
grep DB_NAME .env
```

**Depois aplique a migração:**
```bash
sudo -u postgres psql -d NOME_DO_BANCO -f sql/CRIAR_TABELAS_IA_FINANCEIRO.sql
```

**OU aplicar manualmente:**
```bash
sudo -u postgres psql -d seu_banco
# Copiar e colar o conteúdo de sql/CRIAR_TABELAS_IA_FINANCEIRO.sql
\q
```

### 4. Deploy Backend
```bash
cd /root/primecamp-ofc/server
npm install
pm2 restart primecamp-api
pm2 logs primecamp-api --lines 50
```

**Verificar se os jobs foram carregados:**
```bash
pm2 logs primecamp-api | grep -i "financeiro\|Jobs de"
```

### 5. Deploy Frontend
```bash
cd /root/primecamp-ofc
npm install
npm run build
```

**Limpar cache e deploy:**
```bash
sudo rm -rf /var/cache/nginx/* /var/www/primecamp.cloud/* /var/www/primecamp.cloud/.*
sleep 2
sudo cp -r dist/* /var/www/primecamp.cloud/
sudo chown -R www-data:www-data /var/www/primecamp.cloud
sudo chmod -R 755 /var/www/primecamp.cloud
```

**Testar e recarregar Nginx:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔍 VERIFICAÇÃO PÓS-DEPLOY

### 1. Verificar Backend
```bash
# Ver logs
pm2 logs primecamp-api --lines 50

# Testar endpoint
curl -H "Authorization: Bearer SEU_TOKEN" http://localhost:3001/api/financeiro/dashboard
```

### 2. Verificar Frontend
- Acessar: `https://primecamp.cloud/financeiro`
- Verificar se todas as 9 páginas carregam:
  - Dashboard Executivo
  - Recomendações
  - Estoque Inteligente
  - Análise de Vendedores
  - Análise de Produtos
  - Previsões de Vendas
  - DRE
  - Planejamento Anual
  - Precificação Inteligente

### 3. Verificar Jobs
```bash
pm2 logs primecamp-api | grep -i "Jobs de financeiro\|Executando jobs"
```

---

## ⚡ DEPLOY RÁPIDO (TUDO EM UM)

```bash
ssh root@seu-vps
cd /root/primecamp-ofc
git pull origin main
cd server && npm install && pm2 restart primecamp-api
cd .. && npm install && npm run build
sudo rm -rf /var/cache/nginx/* /var/www/primecamp.cloud/* /var/www/primecamp.cloud/.*
sleep 2
sudo cp -r dist/* /var/www/primecamp.cloud/
sudo chown -R www-data:www-data /var/www/primecamp.cloud
sudo chmod -R 755 /var/www/primecamp.cloud
sudo nginx -t && sudo systemctl reload nginx
pm2 logs primecamp-api --lines 30
```

---

## 📝 NOTAS IMPORTANTES

1. **Migração SQL**: Execute apenas uma vez. Se já foi executada, pule o passo 3.
2. **Jobs**: Os jobs serão executados automaticamente conforme agendamento:
   - Snapshot diário: 00:00
   - Análise mensal produtos: Dia 1, 01:00
   - Análise mensal vendedores: Dia 1, 01:30
   - Recomendações estoque: 02:00
3. **Cache Nginx**: Limpe sempre para garantir que o frontend atualizado seja servido.
4. **Logs**: Verifique os logs após o deploy para garantir que não há erros.

---

## ✅ CHECKLIST FINAL

- [ ] Código atualizado (`git pull`)
- [ ] Migração SQL aplicada (se necessário)
- [ ] Backend deployado e reiniciado
- [ ] Frontend buildado e deployado
- [ ] Cache Nginx limpo
- [ ] Nginx recarregado
- [ ] Logs verificados (sem erros)
- [ ] Frontend testado (todas as 9 páginas)
- [ ] Endpoints testados (pelo menos dashboard)

---

**🎉 Sistema 100% completo e pronto para produção!**
