#!/bin/bash

echo "🔧 RECRIANDO CONFIGURAÇÃO DO NGINX (COMO FOI FEITO ANTES)"
echo "========================================================="
echo ""

cd /root/primecamp-ofc || exit 1

echo "1️⃣ Verificando configurações existentes..."
echo "   sites-available:"
ls -la /etc/nginx/sites-available/ 2>/dev/null | grep -v "^d"
echo ""
echo "   sites-enabled:"
ls -la /etc/nginx/sites-enabled/ 2>/dev/null | grep -v "^d"

echo ""
echo "2️⃣ Criando configuração completa do Nginx para primecamp.cloud..."

NGINX_CONFIG="/etc/nginx/sites-available/primecamp.cloud"

# Criar configuração completa
sudo tee "$NGINX_CONFIG" > /dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name primecamp.cloud www.primecamp.cloud;
    
    # Redirecionar HTTP para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name primecamp.cloud www.primecamp.cloud;
    
    root /var/www/html;
    index index.html;
    
    # SSL configuration (ajustar caminhos se necessário)
    # ssl_certificate /etc/letsencrypt/live/primecamp.cloud/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/primecamp.cloud/privkey.pem;
    
    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Anti-cache para index.html (solução aplicada anteriormente)
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
        add_header X-Content-Type-Options "nosniff";
        try_files $uri =404;
    }
    
    # Configuração SPA - React Router
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, must-revalidate";
    }
    
    # Arquivos estáticos com cache curto (não 1 ano)
    location ~* \.(js|css)$ {
        expires 0;
        add_header Cache-Control "no-cache, must-revalidate";
        add_header Pragma "no-cache";
        access_log off;
    }
    
    # Outros assets com cache normal
    location ~* \.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # Logs
    access_log /var/log/nginx/primecamp.cloud.access.log;
    error_log /var/log/nginx/primecamp.cloud.error.log;
}
EOF

echo "   ✅ Configuração criada em $NGINX_CONFIG"

echo ""
echo "3️⃣ Removendo link antigo em sites-enabled (se existir)..."
sudo rm -f /etc/nginx/sites-enabled/primecamp.cloud
sudo rm -f /etc/nginx/sites-enabled/default

echo ""
echo "4️⃣ Criando link simbólico em sites-enabled..."
sudo ln -sf /etc/nginx/sites-available/primecamp.cloud /etc/nginx/sites-enabled/primecamp.cloud
echo "   ✅ Link criado"

echo ""
echo "5️⃣ Verificando sintaxe do Nginx..."
if sudo nginx -t; then
    echo "   ✅ Sintaxe OK"
else
    echo "   ❌ Erro de sintaxe!"
    echo "   Verificando erros..."
    sudo nginx -t 2>&1
    exit 1
fi

echo ""
echo "6️⃣ Garantindo que arquivos estão corretos..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/

echo ""
echo "7️⃣ Limpando cache e reiniciando Nginx..."
sudo rm -rf /var/cache/nginx/*
sudo systemctl restart nginx
sleep 3

echo ""
echo "8️⃣ Verificando status do Nginx..."
sudo systemctl status nginx --no-pager -l | head -10

echo ""
echo "9️⃣ Testando configuração..."
echo "   Via localhost:"
curl -s http://localhost/ | grep -o 'assets/index-[^"]*\.js' | sort -u

echo ""
echo "   Via HTTPS:"
curl -s -H "Cache-Control: no-cache" https://primecamp.cloud/ | grep -o 'assets/index-[^"]*\.js' | sort -u

echo ""
echo "✅ CONFIGURAÇÃO RECRIADA!"
echo ""
echo "📋 TESTE NO NAVEGADOR:"
echo "   1. Feche TODAS as abas"
echo "   2. Abra janela anônima (Ctrl+Shift+N)"
echo "   3. Acesse: https://primecamp.cloud/integracoes"
echo "   4. Deve estar igual ao localhost agora"

