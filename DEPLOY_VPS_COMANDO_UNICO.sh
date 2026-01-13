#!/bin/bash

# 🚀 DEPLOY COMPLETO NA VPS - COMANDO ÚNICO
# Execute este script para fazer deploy completo (backend + frontend)

set -e  # Parar em caso de erro

echo "🚀 Iniciando deploy completo..."
echo ""

# 1. Ir para o diretório
cd /root/primecamp-ofc || { echo "❌ Erro: Diretório não encontrado"; exit 1; }

# 2. Pull do código
echo "📥 1/7 Atualizando código do repositório..."
git pull origin main
echo "✅ Código atualizado"
echo ""

# 3. Instalar dependências do backend (se necessário)
echo "📦 2/7 Verificando dependências do backend..."
cd server
npm install --production
cd ..
echo "✅ Dependências do backend OK"
echo ""

# 4. Build do frontend
echo "🔨 3/7 Fazendo build do frontend..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Erro no build do frontend!"
    exit 1
fi
echo "✅ Build concluído"
echo ""

# 5. Limpar e copiar arquivos para Nginx
echo "📦 4/7 Copiando arquivos para o Nginx..."
NGINX_ROOT="/var/www/primecamp.cloud"

# Limpar cache do Nginx
sudo rm -rf /var/cache/nginx/* 2>/dev/null || true
sudo find /var/cache/nginx -type f -delete 2>/dev/null || true

# Limpar diretório do Nginx
sudo rm -rf "$NGINX_ROOT"/* 2>/dev/null || true
sudo rm -rf "$NGINX_ROOT"/.* 2>/dev/null || true

# Aguardar um segundo
sleep 1

# Copiar arquivos do build
sudo cp -r dist/* "$NGINX_ROOT"/

# Ajustar permissões
sudo chown -R www-data:www-data "$NGINX_ROOT"
sudo chmod -R 755 "$NGINX_ROOT"
echo "✅ Arquivos copiados"
echo ""

# 6. Testar e recarregar Nginx
echo "🔄 5/7 Recarregando Nginx..."
sudo nginx -t && sudo systemctl reload nginx
echo "✅ Nginx recarregado"
echo ""

# 7. Reiniciar backend (PM2)
echo "🔄 6/7 Reiniciando backend..."
pm2 restart all || pm2 restart primecamp-api || echo "⚠️ PM2 não encontrado ou erro ao reiniciar"
sleep 2
pm2 status 2>/dev/null || echo "⚠️ PM2 não está rodando"
echo "✅ Backend reiniciado"
echo ""

# 8. Verificar status
echo "📊 7/7 Verificando status..."
echo ""
echo "=== Status PM2 ==="
pm2 list 2>/dev/null || echo "PM2 não disponível"
echo ""
echo "=== Últimas linhas do log do backend ==="
pm2 logs primecamp-api --lines 10 --nostream 2>/dev/null || echo "Logs não disponíveis"
echo ""

echo "🎉 DEPLOY COMPLETO FINALIZADO!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Limpe o cache do navegador (Ctrl+Shift+R ou Cmd+Shift+R)"
echo "2. Acesse o site e teste as funcionalidades"
echo "3. Verifique os logs se houver problemas:"
echo "   - Backend: pm2 logs primecamp-api"
echo "   - Nginx: sudo tail -f /var/log/nginx/error.log"
echo ""
