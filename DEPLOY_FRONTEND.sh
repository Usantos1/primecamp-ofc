#!/bin/bash
# Script para fazer deploy do frontend na VPS
# Uso: bash DEPLOY_FRONTEND.sh

set -e

echo "=========================================="
echo "Deploy do Frontend - PrimeCamp"
echo "=========================================="

cd /root/primecamp-ofc || exit 1

echo ""
echo "1️⃣ Atualizando código do repositório..."
git pull origin main

echo ""
echo "2️⃣ Instalando dependências (se necessário)..."
npm install

echo ""
echo "3️⃣ Fazendo build do projeto..."
npm run build

if [ ! -d "dist" ]; then
    echo "❌ Erro: Pasta dist não foi criada!"
    exit 1
fi

echo ""
echo "4️⃣ Fazendo backup dos arquivos antigos..."
sudo mkdir -p /var/www/html.backup
sudo cp -r /var/www/html/* /var/www/html.backup/ 2>/dev/null || true

echo ""
echo "5️⃣ Copiando novos arquivos para /var/www/html..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 755 /var/www/html/

echo ""
echo "6️⃣ Verificando configuração do Nginx..."
NGINX_CONFIG="/etc/nginx/sites-available/primecamp.cloud.conf"

if [ ! -f "$NGINX_CONFIG" ]; then
    echo "⚠️  Configuração do Nginx não encontrada em $NGINX_CONFIG"
    echo "   Criando configuração básica..."
    
    sudo tee "$NGINX_CONFIG" > /dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name primecamp.cloud www.primecamp.cloud;
    
    root /var/www/html;
    index index.html;
    
    # Configuração SPA - React Router (IMPORTANTE!)
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Arquivos estáticos
    location ~* \.(js|css)$ {
        expires 0;
        add_header Cache-Control "no-cache, must-revalidate";
    }
    
    location ~* \.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    access_log /var/log/nginx/primecamp.cloud.access.log;
    error_log /var/log/nginx/primecamp.cloud.error.log;
}
EOF

    # Criar link simbólico
    sudo rm -f /etc/nginx/sites-enabled/primecamp.cloud.conf
    sudo ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/primecamp.cloud.conf
    echo "   ✅ Configuração criada"
fi

# Verificar se tem try_files configurado
if ! grep -q "try_files.*index.html" "$NGINX_CONFIG"; then
    echo "⚠️  Nginx não está configurado para SPA!"
    echo "   Adicionando configuração SPA..."
    
    # Criar backup
    sudo cp "$NGINX_CONFIG" "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Adicionar try_files se não existir
    sudo sed -i 's|location / {|location / {\n        try_files $uri $uri/ /index.html;|' "$NGINX_CONFIG"
    
    echo "   ✅ Configuração SPA adicionada"
fi

echo ""
echo "7️⃣ Testando configuração do Nginx..."
if sudo nginx -t; then
    echo "   ✅ Sintaxe OK"
else
    echo "   ❌ Erro na configuração do Nginx!"
    sudo nginx -t
    exit 1
fi

echo ""
echo "8️⃣ Recarregando Nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ Deploy concluído com sucesso!"
echo ""
echo "Verificando arquivos em /var/www/html:"
ls -lah /var/www/html/ | head -10

echo ""
echo "Teste acessando: https://primecamp.cloud/rh"

