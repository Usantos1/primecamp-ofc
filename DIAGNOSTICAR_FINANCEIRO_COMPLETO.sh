#!/bin/bash
set -e

echo "🔍 DIAGNÓSTICO COMPLETO - Rota /financeiro"
echo "============================================"
echo ""

cd /root/primecamp-ofc

# 1. Verificar se a rota está no código fonte
echo "1️⃣ Verificando código fonte..."
if grep -q 'path="/financeiro"' src/App.tsx; then
    echo "  ✅ Rota '/financeiro' encontrada no App.tsx"
    grep -n 'path="/financeiro"' src/App.tsx | head -1
else
    echo "  ❌ Rota '/financeiro' NÃO encontrada no App.tsx!"
    exit 1
fi

# 2. Verificar se o componente está importado
echo ""
echo "2️⃣ Verificando importações..."
if grep -q "import DashboardExecutivo" src/App.tsx; then
    echo "  ✅ DashboardExecutivo está importado"
else
    echo "  ❌ DashboardExecutivo NÃO está importado!"
    exit 1
fi

# 3. Verificar build local
echo ""
echo "3️⃣ Verificando build local..."
if [ -f "dist/index.html" ]; then
    echo "  ✅ dist/index.html existe"
    BUNDLE_FILE=$(grep -o 'assets/index-[^"]*\.js' dist/index.html | head -1)
    echo "  📦 Bundle: $BUNDLE_FILE"
    
    if [ -f "dist/$BUNDLE_FILE" ]; then
        echo "  ✅ Bundle existe"
        
        # Verificar se DashboardExecutivo está no bundle
        if grep -q "DashboardExecutivo" "dist/$BUNDLE_FILE"; then
            echo "  ✅ DashboardExecutivo encontrado no bundle"
        else
            echo "  ❌ DashboardExecutivo NÃO encontrado no bundle!"
        fi
        
        # Verificar se a rota está no bundle
        if grep -q "/financeiro" "dist/$BUNDLE_FILE"; then
            echo "  ✅ Rota '/financeiro' encontrada no bundle"
        else
            echo "  ❌ Rota '/financeiro' NÃO encontrada no bundle!"
        fi
    else
        echo "  ❌ Bundle não existe!"
    fi
else
    echo "  ❌ dist/index.html não existe! Execute 'npm run build' primeiro."
    exit 1
fi

# 4. Verificar servidor
echo ""
echo "4️⃣ Verificando servidor (/var/www/html)..."
if [ -f "/var/www/html/index.html" ]; then
    echo "  ✅ /var/www/html/index.html existe"
    SERVER_BUNDLE=$(sudo grep -o 'assets/index-[^"]*\.js' /var/www/html/index.html | head -1)
    echo "  📦 Bundle no servidor: $SERVER_BUNDLE"
    
    if [ -f "/var/www/html/$SERVER_BUNDLE" ]; then
        echo "  ✅ Bundle existe no servidor"
        
        # Comparar hashes
        if [ "$BUNDLE_FILE" = "$SERVER_BUNDLE" ]; then
            echo "  ✅ Bundle no servidor está atualizado (hash igual)"
        else
            echo "  ⚠️  Bundle no servidor está DESATUALIZADO!"
            echo "     Local: $BUNDLE_FILE"
            echo "     Servidor: $SERVER_BUNDLE"
            echo ""
            echo "  🔄 Fazendo deploy do frontend..."
            sudo rm -rf /var/www/html/*
            sudo cp -r dist/* /var/www/html/
            sudo chown -R www-data:www-data /var/www/html
            sudo chmod -R 755 /var/www/html
            echo "  ✅ Deploy concluído"
        fi
        
        # Verificar se DashboardExecutivo está no bundle do servidor
        if sudo grep -q "DashboardExecutivo" "/var/www/html/$SERVER_BUNDLE"; then
            echo "  ✅ DashboardExecutivo encontrado no bundle do servidor"
        else
            echo "  ❌ DashboardExecutivo NÃO encontrado no bundle do servidor!"
        fi
    else
        echo "  ❌ Bundle não existe no servidor!"
    fi
else
    echo "  ❌ /var/www/html/index.html não existe!"
    exit 1
fi

# 5. Verificar Nginx
echo ""
echo "5️⃣ Verificando configuração do Nginx..."
if [ -f "/etc/nginx/sites-available/default" ]; then
    echo "  ✅ Arquivo de configuração do Nginx encontrado"
    
    # Verificar se há try_files configurado para SPA
    if sudo grep -q "try_files" /etc/nginx/sites-available/default; then
        echo "  ✅ try_files configurado (SPA mode)"
        sudo grep "try_files" /etc/nginx/sites-available/default | head -1
    else
        echo "  ⚠️  try_files NÃO encontrado - pode causar problemas com rotas do React Router"
    fi
else
    echo "  ⚠️  Arquivo de configuração do Nginx não encontrado em /etc/nginx/sites-available/default"
fi

# 6. Limpar cache do Nginx
echo ""
echo "6️⃣ Limpando cache do Nginx..."
sudo rm -rf /var/cache/nginx/*
sudo rm -rf /var/lib/nginx/cache/*
sudo systemctl reload nginx
echo "  ✅ Cache limpo e Nginx recarregado"

echo ""
echo "✅ Diagnóstico concluído!"
echo ""
echo "💡 Próximos passos:"
echo "   1. Teste no navegador em modo anônimo"
echo "   2. Verifique o console do navegador (F12) para erros JavaScript"
echo "   3. Verifique se você tem a permissão 'relatorios.financeiro'"
