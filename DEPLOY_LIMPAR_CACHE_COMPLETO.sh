#!/bin/bash

# 🧹 DEPLOY COM LIMPEZA COMPLETA DE CACHE
# Este script faz deploy completo limpando todos os caches

set -e  # Parar em caso de erro

echo "🧹 Deploy com limpeza completa de cache..."
echo ""

# 1. Ir para o diretório
cd /root/primecamp-ofc || { echo "❌ Erro: Diretório não encontrado"; exit 1; }

# 2. Pull do código
echo "📥 1/8 Atualizando código do repositório..."
git pull origin main
echo "✅ Código atualizado"
echo ""

# 3. Limpar cache do Node/npm
echo "🧹 2/8 Limpando cache do Node/npm..."
rm -rf node_modules/.vite 2>/dev/null || true
rm -rf .vite 2>/dev/null || true
rm -rf dist 2>/dev/null || true
npm cache clean --force 2>/dev/null || true
echo "✅ Cache do Node/npm limpo"
echo ""

# 4. Instalar dependências (fresh install)
echo "📦 3/8 Reinstalando dependências..."
npm install
echo "✅ Dependências reinstaladas"
echo ""

# 5. Build do frontend (forçar rebuild completo)
echo "🔨 4/8 Fazendo build do frontend (sem cache)..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Erro no build do frontend!"
    exit 1
fi
echo "✅ Build concluído"
echo ""

# 6. Limpar TODOS os caches do Nginx
echo "🧹 5/8 Limpando TODOS os caches do Nginx..."
sudo rm -rf /var/cache/nginx/* 2>/dev/null || true
sudo find /var/cache/nginx -type f -delete 2>/dev/null || true
sudo rm -rf /var/lib/nginx/cache/* 2>/dev/null || true
sudo find /var/lib/nginx/cache -type f -delete 2>/dev/null || true
echo "✅ Cache do Nginx limpo"
echo ""

# 7. Limpar e copiar arquivos para Nginx
echo "📦 6/8 Copiando arquivos para o Nginx..."
NGINX_ROOT="/var/www/primecamp.cloud"

# Limpar diretório do Nginx COMPLETAMENTE
sudo rm -rf "$NGINX_ROOT"/* 2>/dev/null || true
sudo rm -rf "$NGINX_ROOT"/.* 2>/dev/null || true
sudo find "$NGINX_ROOT" -type f -delete 2>/dev/null || true
sudo find "$NGINX_ROOT" -type d -mindepth 1 -delete 2>/dev/null || true

# Aguardar um segundo
sleep 1

# Copiar arquivos do build
sudo cp -r dist/* "$NGINX_ROOT"/

# Ajustar permissões
sudo chown -R www-data:www-data "$NGINX_ROOT"
sudo chmod -R 755 "$NGINX_ROOT"
echo "✅ Arquivos copiados"
echo ""

# 8. Testar e recarregar Nginx
echo "🔄 7/8 Recarregando Nginx..."
sudo nginx -t && sudo systemctl reload nginx
echo "✅ Nginx recarregado"
echo ""

# 9. Reiniciar backend (PM2)
echo "🔄 8/8 Reiniciando backend..."
pm2 restart all || pm2 restart primecamp-api || echo "⚠️ PM2 não encontrado ou erro ao reiniciar"
sleep 2
pm2 status 2>/dev/null || echo "⚠️ PM2 não está rodando"
echo "✅ Backend reiniciado"
echo ""

echo "🎉 DEPLOY COMPLETO COM LIMPEZA DE CACHE FINALIZADO!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Limpe o cache do navegador COMPLETAMENTE:"
echo "   - Chrome/Edge: Ctrl+Shift+Delete → Limpar dados de navegação → Cache"
echo "   - Ou use modo anônimo/privado (Ctrl+Shift+N)"
echo "2. Acesse o site e teste as funcionalidades"
echo "3. Se ainda tiver problemas, verifique os logs:"
echo "   - Backend: pm2 logs primecamp-api"
echo "   - Nginx: sudo tail -f /var/log/nginx/error.log"
echo ""
