# 🔧 Comandos VPS - Fix AnaliseVendedores

## ⚠️ ERRO CORRIGIDO:
- "Rendered more hooks than during the previous render" 
- Hooks agora estão na ordem correta (antes de qualquer early return)

## 🚀 DEPLOY RÁPIDO:

```bash
cd /root/primecamp-ofc
chmod +x DEPLOY_FIX_ANALISE_VENDEDORES.sh
./DEPLOY_FIX_ANALISE_VENDEDORES.sh
```

## 📋 DEPLOY MANUAL (se preferir):

```bash
# 1. Atualizar código
cd /root/primecamp-ofc
git pull origin main

# 2. Build frontend
npm run build

# 3. Detectar diretório Nginx (ajuste se necessário)
NGINX_ROOT="/var/www/primecamp.cloud"  # ou "/var/www/html"

# 4. Deploy frontend
sudo rm -rf "$NGINX_ROOT"/*
sudo cp -r dist/* "$NGINX_ROOT"/
sudo chown -R www-data:www-data "$NGINX_ROOT"
sudo chmod -R 755 "$NGINX_ROOT"

# 5. Limpar cache
sudo rm -rf /var/cache/nginx/*
sudo rm -rf /var/lib/nginx/cache/*
sudo systemctl reload nginx

# 6. Reiniciar backend (se necessário)
cd /root/primecamp-ofc/server
pm2 restart primecamp-api
```

## ✅ VERIFICAÇÃO:

1. Acesse: https://primecamp.cloud/financeiro/analise-vendedores
2. Faça hard refresh no navegador: **Ctrl+Shift+R** (ou Ctrl+F5)
3. O erro não deve mais aparecer

## 📝 O QUE FOI CORRIGIDO:

- ✅ Hooks (`useMemo`) movidos para ANTES do `if (isLoading) return`
- ✅ Garantida ordem consistente de hooks em todas as renderizações
- ✅ Scrollbar discreto (8px) já aplicado globalmente via ModernLayout
