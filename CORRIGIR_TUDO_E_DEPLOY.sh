#!/bin/bash

echo "🔧 CORRIGIR TUDO E FAZER DEPLOY COMPLETO"
echo "=========================================="
echo ""

cd /root/primecamp-ofc || { echo "❌ Erro: Não foi possível entrar no diretório"; exit 1; }

# 1. Atualizar código
echo "1. Atualizando código..."
git pull origin main || { echo "❌ Erro: git pull falhou"; exit 1; }
echo "✅ Código atualizado"

# 2. Verificar se TestAuth existe
echo ""
echo "2. Verificando arquivos necessários..."
if [ ! -f "src/pages/TestAuth.tsx" ]; then
    echo "❌ ERRO CRÍTICO: src/pages/TestAuth.tsx não existe!"
    exit 1
fi
echo "✅ TestAuth.tsx existe"

if ! grep -q "test-auth" src/App.tsx; then
    echo "❌ ERRO CRÍTICO: Rota /test-auth não encontrada!"
    exit 1
fi
echo "✅ Rota /test-auth encontrada"

# 3. Parar processos conflitantes
echo ""
echo "3. Parando processos conflitantes..."
pm2 stop all 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true
pkill -9 -f "node.*primecamp" 2>/dev/null || true
sleep 2
echo "✅ Processos parados"

# 4. Verificar/Iniciar API
echo ""
echo "4. Verificando/Iniciando API..."
cd server || { echo "❌ Erro: Não foi possível entrar no diretório server"; exit 1; }

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    echo "   Instalando dependências da API..."
    npm install || { echo "❌ Erro: npm install falhou"; exit 1; }
fi

# Verificar se API está rodando
if ! pm2 list | grep -q "primecamp-api.*online"; then
    echo "   Iniciando API..."
    pm2 start index.js --name primecamp-api || { echo "❌ Erro: Falha ao iniciar API"; exit 1; }
    sleep 3
else
    echo "   Reiniciando API..."
    pm2 restart primecamp-api || { echo "❌ Erro: Falha ao reiniciar API"; exit 1; }
    sleep 3
fi

# Verificar se API está respondendo
echo "   Aguardando API inicializar (10 segundos)..."
sleep 10

echo "   Testando API..."
for i in {1..10}; do
    HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null)
    if [ "$HEALTH" = "200" ]; then
        echo "✅ API está respondendo (200 OK)"
        curl -s http://localhost:3000/api/health | head -3
        break
    fi
    
    # Mostrar logs se falhar
    if [ $i -eq 3 ]; then
        echo "   ⚠️  Primeiras tentativas falharam, verificando logs..."
        pm2 logs primecamp-api --lines 10 --nostream | tail -5
    fi
    
    if [ $i -eq 10 ]; then
        echo "❌ ERRO: API não está respondendo após 10 tentativas!"
        echo ""
        echo "📋 ÚLTIMOS LOGS DA API:"
        pm2 logs primecamp-api --lines 30 --nostream
        echo ""
        echo "🔍 Execute: ./DIAGNOSTICAR_API.sh para diagnóstico completo"
        exit 1
    fi
    echo "   Tentativa $i/10 falhou (código: ${HEALTH:-timeout}), aguardando..."
    sleep 3
done

cd ..

# 5. Limpar e rebuildar frontend
echo ""
echo "5. Limpando builds antigos..."
rm -rf dist node_modules/.vite .vite node_modules/.cache .next build
echo "✅ Limpeza concluída"

echo ""
echo "6. Rebuildando frontend..."
npm run build || { echo "❌ ERRO: Build falhou!"; exit 1; }
echo "✅ Build concluído"

# 7. Verificar build
echo ""
echo "7. Verificando build..."
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

# 8. Copiar para servidor
echo ""
echo "8. Copiando para servidor web..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/
echo "✅ Arquivos copiados"

# 9. Recarregar Nginx
echo ""
echo "9. Recarregando Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recarregado"

# 10. Verificação final
echo ""
echo "10. Verificação final..."
if [ -f "/var/www/html/index.html" ]; then
    echo "✅ /var/www/html/index.html existe"
else
    echo "❌ ERRO: Arquivo não foi copiado!"
    exit 1
fi

if pm2 list | grep -q "primecamp-api.*online"; then
    echo "✅ API está rodando"
else
    echo "❌ ERRO: API não está rodando!"
    exit 1
fi

if systemctl is-active --quiet nginx; then
    echo "✅ Nginx está rodando"
else
    echo "❌ ERRO: Nginx não está rodando!"
    exit 1
fi

# RESUMO FINAL
echo ""
echo "========================================"
echo "🎉 DEPLOY COMPLETO E VERIFICADO!"
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
echo "Se ainda não funcionar:"
echo "- Verifique: pm2 logs primecamp-api"
echo "- Verifique console do navegador para erros"
echo "- Verifique Network tab para ver requisições"

