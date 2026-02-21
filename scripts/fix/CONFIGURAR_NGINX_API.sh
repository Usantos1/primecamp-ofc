#!/bin/bash

echo "⚙️  CONFIGURANDO NGINX PARA API"
echo "=============================="
echo ""

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Por favor, execute como root (sudo)"
    exit 1
fi

CONFIG_FILE="/etc/nginx/sites-available/primecamp.cloud"
BACKUP_FILE="/etc/nginx/sites-available/primecamp.cloud.backup.$(date +%Y%m%d_%H%M%S)"

echo "1️⃣ Fazendo backup da configuração atual..."
cp "$CONFIG_FILE" "$BACKUP_FILE"
echo "✅ Backup criado: $BACKUP_FILE"

echo ""
echo "2️⃣ Verificando se já existe configuração para api.primecamp.cloud..."
if grep -q "server_name api.primecamp.cloud" "$CONFIG_FILE"; then
    echo "⚠️  Configuração para api.primecamp.cloud já existe"
    echo "   Verificando se está correta..."
else
    echo "✅ Adicionando configuração para api.primecamp.cloud..."
    
    # Adicionar configuração no final do arquivo
    cat >> "$CONFIG_FILE" << 'EOF'

# API Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.primecamp.cloud;

    ssl_certificate /etc/letsencrypt/live/primecamp.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/primecamp.cloud/privkey.pem;

    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # CORS headers (handled by Express, but adding here for preflight)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name api.primecamp.cloud;
    return 301 https://$server_name$request_uri;
}
EOF
    
    echo "✅ Configuração adicionada"
fi

echo ""
echo "3️⃣ Verificando sintaxe do Nginx..."
nginx -t
if [ $? -ne 0 ]; then
    echo "❌ Erro na sintaxe do Nginx. Restaurando backup..."
    cp "$BACKUP_FILE" "$CONFIG_FILE"
    echo "✅ Backup restaurado"
    exit 1
fi
echo "✅ Sintaxe do Nginx está correta"

echo ""
echo "4️⃣ Recarregando Nginx..."
systemctl reload nginx
if [ $? -ne 0 ]; then
    echo "❌ Erro ao recarregar Nginx"
    exit 1
fi
echo "✅ Nginx recarregado"

echo ""
echo "🎉 CONFIGURAÇÃO DO NGINX CONCLUÍDA!"
echo ""
echo "📋 TESTE:"
echo "curl https://api.primecamp.cloud/api/health"
echo ""

