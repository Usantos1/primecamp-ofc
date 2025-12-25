#!/bin/bash

echo "🚀 DEPLOY FINAL COMPLETO (API + Frontend)"
echo "=========================================="
echo ""

cd /root/primecamp-ofc || { echo "❌ Erro: Não foi possível entrar no diretório"; exit 1; }

# 1. Atualizar código
echo "1. Atualizando código..."
git pull origin main || { echo "❌ Erro: git pull falhou"; exit 1; }
echo "✅ Código atualizado"

# 2. Verificar API
echo ""
echo "2. Verificando API..."
if pm2 list | grep -q "primecamp-api.*online"; then
    HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null)
    if [ "$HEALTH" = "200" ]; then
        echo "✅ API está funcionando (200 OK)"
    else
        echo "⚠️  API não está respondendo corretamente, reiniciando..."
        cd server
        pm2 restart primecamp-api
        sleep 5
        cd ..
    fi
else
    echo "⚠️  API não está rodando, iniciando..."
    cd server
    pm2 start index.js --name primecamp-api || { echo "❌ Erro: Falha ao iniciar API"; exit 1; }
    sleep 5
    cd ..
fi

# 3. Limpar builds antigos
echo ""
echo "3. Limpando builds antigos..."
rm -rf dist node_modules/.vite .vite node_modules/.cache .next build
echo "✅ Limpeza concluída"

# 4. Rebuildar frontend
echo ""
echo "4. Rebuildando frontend..."
npm run build || { echo "❌ ERRO: Build falhou!"; exit 1; }
echo "✅ Build concluído"

# 5. Verificar build
echo ""
echo "5. Verificando build..."
if [ ! -f "dist/index.html" ]; then
    echo "❌ ERRO: dist/index.html não foi criado!"
    exit 1
fi
echo "✅ dist/index.html existe"

# Verificar se TestAuth está no bundle
if grep -r "test-auth\|TestAuth" dist/assets/*.js > /dev/null 2>&1; then
    echo "✅ 'test-auth' encontrado no bundle"
else
    echo "⚠️  AVISO: 'test-auth' não encontrado no bundle (pode estar minificado)"
fi

# 6. Copiar para servidor
echo ""
echo "6. Copiando para servidor web..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/
echo "✅ Arquivos copiados"

# 7. Recarregar Nginx
echo ""
echo "7. Recarregando Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recarregado"

# RESUMO FINAL
echo ""
echo "========================================"
echo "🎉 DEPLOY COMPLETO!"
echo "========================================"
echo ""
echo "📋 STATUS:"
pm2 status | grep primecamp-api
echo ""
echo "🌐 TESTAR AGORA:"
echo "1. Acesse: https://primecamp.cloud/test-auth"
echo "2. Abra em JANELA ANÔNIMA (Ctrl + Shift + N) para evitar cache"
echo "3. Abra Console (F12)"
echo "4. Clique em 'Testar Conexão com API'"
echo "5. Deve aparecer: '✅ API está funcionando!'"
echo ""
echo "✅ API: http://localhost:3000/api/health"
curl -s http://localhost:3000/api/health | head -1
echo ""
echo "✅ Frontend: https://primecamp.cloud/test-auth"
echo ""

