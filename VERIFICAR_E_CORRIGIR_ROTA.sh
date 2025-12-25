#!/bin/bash

echo "🔍 VERIFICAR E CORRIGIR ROTA /test-auth"
echo "========================================"
echo ""

cd /root/primecamp-ofc || { echo "❌ Erro: Não foi possível entrar no diretório"; exit 1; }

# 1. Verificar se arquivo existe
echo "1. Verificando arquivos..."
if [ ! -f "src/pages/TestAuth.tsx" ]; then
    echo "❌ ERRO: src/pages/TestAuth.tsx não existe!"
    exit 1
fi
echo "✅ TestAuth.tsx existe"

# 2. Verificar se rota está no App.tsx
echo ""
echo "2. Verificando rota no App.tsx..."
if ! grep -q 'path="/test-auth"' src/App.tsx; then
    echo "❌ ERRO: Rota /test-auth não encontrada no App.tsx!"
    exit 1
fi
echo "✅ Rota /test-auth encontrada no App.tsx"

if ! grep -q "import TestAuth" src/App.tsx; then
    echo "❌ ERRO: Import de TestAuth não encontrado!"
    exit 1
fi
echo "✅ Import de TestAuth encontrado"

# 3. Verificar se está ANTES do catch-all
echo ""
echo "3. Verificando ordem das rotas..."
TEST_AUTH_LINE=$(grep -n 'path="/test-auth"' src/App.tsx | cut -d: -f1)
CATCH_ALL_LINE=$(grep -n 'path="\*"' src/App.tsx | cut -d: -f1)

if [ -z "$TEST_AUTH_LINE" ] || [ -z "$CATCH_ALL_LINE" ]; then
    echo "⚠️  Não foi possível verificar ordem das rotas"
else
    if [ "$TEST_AUTH_LINE" -lt "$CATCH_ALL_LINE" ]; then
        echo "✅ Rota /test-auth está ANTES do catch-all (linha $TEST_AUTH_LINE < $CATCH_ALL_LINE)"
    else
        echo "❌ ERRO: Rota /test-auth está DEPOIS do catch-all!"
        exit 1
    fi
fi

# 4. Limpar build completamente
echo ""
echo "4. Limpando build completamente..."
rm -rf dist node_modules/.vite .vite node_modules/.cache .next build
echo "✅ Limpeza concluída"

# 5. Rebuildar
echo ""
echo "5. Rebuildando frontend..."
npm run build || { echo "❌ ERRO: Build falhou!"; exit 1; }
echo "✅ Build concluído"

# 6. Verificar se TestAuth está no bundle
echo ""
echo "6. Verificando se TestAuth está no bundle..."
if grep -r "test-auth\|TestAuth" dist/assets/*.js > /dev/null 2>&1; then
    echo "✅ 'test-auth' encontrado no bundle JavaScript"
    grep -r "test-auth\|TestAuth" dist/assets/*.js | head -3
else
    echo "⚠️  AVISO: 'test-auth' não encontrado no bundle (pode estar minificado)"
fi

# 7. Verificar index.html
echo ""
echo "7. Verificando index.html..."
if [ -f "dist/index.html" ]; then
    echo "✅ dist/index.html existe"
    if grep -q "root" dist/index.html; then
        echo "✅ Elemento root encontrado no HTML"
    else
        echo "⚠️  AVISO: Elemento root não encontrado"
    fi
else
    echo "❌ ERRO: dist/index.html não existe!"
    exit 1
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

echo ""
echo "========================================"
echo "✅ VERIFICAÇÃO E CORREÇÃO CONCLUÍDA!"
echo "========================================"
echo ""
echo "🌐 TESTE AGORA:"
echo "1. Abra em JANELA ANÔNIMA (Ctrl + Shift + N)"
echo "2. Acesse: https://primecamp.cloud/test-auth"
echo "3. Abra Console (F12) e verifique se há erros"
echo "4. Se ainda não funcionar, verifique o Network tab"
echo ""

