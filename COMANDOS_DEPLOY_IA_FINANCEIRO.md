# 📋 Comandos para Deploy do Sistema IA-First Financeiro

## 🚀 Deploy Completo (Recomendado)

Execute o script de deploy automatizado:

```bash
cd /root/primecamp-ofc
chmod +x DEPLOY_IA_FINANCEIRO.sh
./DEPLOY_IA_FINANCEIRO.sh
```

## 📝 Deploy Manual (Passo a Passo)

### 1. Atualizar Código
```bash
cd /root/primecamp-ofc
git pull origin main
```

### 2. Aplicar Migração SQL
```bash
sudo -u postgres psql -d banco_gestao -f sql/CRIAR_TABELAS_IA_FINANCEIRO.sql
```

### 3. Backend
```bash
cd /root/primecamp-ofc/server
npm install
pm2 restart primecamp-api
pm2 logs primecamp-api --lines 30
```

### 4. Frontend
```bash
cd /root/primecamp-ofc
npm install
npm run build
sudo rm -rf /var/cache/nginx/* /var/www/primecamp.cloud/* /var/www/primecamp.cloud/.*
sleep 1
sudo cp -r dist/* /var/www/primecamp.cloud/
sudo chown -R www-data:www-data /var/www/primecamp.cloud
sudo chmod -R 755 /var/www/primecamp.cloud
sudo nginx -t
sudo systemctl reload nginx
```

## ✅ Verificação

### Verificar se as tabelas foram criadas:
```bash
sudo -u postgres psql -d banco_gestao -c "\dt public.vendas_snapshot_diario"
sudo -u postgres psql -d banco_gestao -c "\dt public.ia_recomendacoes"
```

### Verificar logs do backend:
```bash
pm2 logs primecamp-api --lines 50
```

### Testar endpoints (exemplo):
```bash
curl -H "Authorization: Bearer SEU_TOKEN" https://api.primecamp.cloud/api/financeiro/dashboard
```

## 🔗 URLs Disponíveis

Após o deploy, as seguintes rotas estarão disponíveis:

- **Dashboard Executivo**: `/financeiro` ou `/financeiro/dashboard`
- **Recomendações da IA**: `/financeiro/recomendacoes`
- **Estoque Inteligente**: `/financeiro/estoque`
- **Análise de Vendedores**: `/financeiro/vendedores`
- **Análise de Produtos**: `/financeiro/produtos`
- **Previsões de Vendas**: `/financeiro/previsoes`
- **DRE**: `/financeiro/dre`
- **Planejamento Anual**: `/financeiro/planejamento`

## ⚠️ Observações

1. **Jobs Agendados**: Os jobs de financeiro são agendados automaticamente quando o backend inicia. Eles executam:
   - Snapshot diário: Todo dia às 00:00
   - Análise mensal: Dia 1 de cada mês às 01:00
   - Recomendações de estoque: Diariamente

2. **Permissões**: Todas as rotas requerem a permissão `relatorios.financeiro`

3. **Primeira Execução**: Na primeira execução, pode levar alguns minutos para os jobs gerarem dados suficientes para análises completas.
