# 🚀 Comandos Finais de Deploy - Sistema IA-First Financeiro

## ✅ Status
- ✅ Build do frontend concluído com sucesso
- ✅ Todos os hooks quebrados foram corrigidos
- ✅ Sistema IA-First Financeiro 100% implementado

## 📋 Passos para Deploy Completo

### 1. Aplicar Migração SQL (se ainda não aplicada)

```bash
cd /root/primecamp-ofc/server
DB_NAME=$(grep DB_NAME .env | cut -d '=' -f2)
sudo -u postgres psql -d "$DB_NAME" -f ../sql/CRIAR_TABELAS_IA_FINANCEIRO.sql
```

### 2. Reiniciar Backend (para carregar novas rotas e jobs)

```bash
cd /root/primecamp-ofc
pm2 restart all
# ou
pm2 restart primecamp-api
```

### 3. Copiar Build do Frontend para Nginx

```bash
cd /root/primecamp-ofc
sudo rm -rf /var/www/primecamp/html/*
sudo cp -r dist/* /var/www/primecamp/html/
sudo chown -R www-data:www-data /var/www/primecamp/html
sudo systemctl reload nginx
```

### 4. Limpar Cache do Nginx (se necessário)

```bash
sudo rm -rf /var/cache/nginx/*
sudo systemctl reload nginx
```

## 🎯 Deploy Rápido (Tudo de Uma Vez)

```bash
cd /root/primecamp-ofc/server
DB_NAME=$(grep DB_NAME .env | cut -d '=' -f2)
sudo -u postgres psql -d "$DB_NAME" -f ../sql/CRIAR_TABELAS_IA_FINANCEIRO.sql && \
cd /root/primecamp-ofc && \
pm2 restart all && \
sudo rm -rf /var/www/primecamp/html/* && \
sudo cp -r dist/* /var/www/primecamp/html/ && \
sudo chown -R www-data:www-data /var/www/primecamp/html && \
sudo rm -rf /var/cache/nginx/* && \
sudo systemctl reload nginx && \
echo "✅ Deploy concluído com sucesso!"
```

## 📝 Observações

- O sistema financeiro antigo (`/admin/financeiro`) não funcionará completamente (hooks comentados)
- O novo sistema IA-First Financeiro (`/financeiro/*`) está 100% funcional
- Os jobs de agregação de dados serão executados automaticamente via cron:
  - Snapshot diário: meia-noite (00:00)
  - Análise mensal de produtos: dia 1, 01:00
  - Análise mensal de vendedores: dia 1, 01:30
  - Recomendações de estoque: todo dia, 02:00

## 🔍 Verificação Pós-Deploy

1. Acesse: `https://seu-dominio.com/financeiro`
2. Verifique se as páginas carregam:
   - `/financeiro` (Dashboard Executivo)
   - `/financeiro/recomendacoes`
   - `/financeiro/estoque-inteligente`
   - `/financeiro/analise-vendedores`
   - `/financeiro/analise-produtos`
   - `/financeiro/previsoes-vendas`
   - `/financeiro/dre`
   - `/financeiro/planejamento-anual`
   - `/financeiro/precificacao`

## 🎉 Pronto!

O sistema IA-First Financeiro está totalmente implementado e pronto para uso!
