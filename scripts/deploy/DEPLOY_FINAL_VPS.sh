#!/bin/bash
set -e

echo "🚀 DEPLOY FINAL - FRONTEND PARA NGINX"
echo "======================================"
echo ""

# 1. Ir para o diretório do projeto
cd /root/primecamp-ofc || {
    echo "❌ Erro: Diretório /root/primecamp-ofc não encontrado"
    exit 1
}

# 2. Verificar se existe dist/
if [ ! -d "dist" ]; then
    echo "❌ Erro: Diretório dist/ não encontrado. Execute 'npm run build' primeiro."
    exit 1
fi

# 3. Detectar diretório do Nginx
NGINX_ROOT="/var/www/primecamp.cloud"

# Tentar detectar do nginx config
if [ -f "/etc/nginx/sites-available/primecamp.cloud" ]; then
    DETECTED_ROOT=$(grep -A 5 "server_name primecamp.cloud" /etc/nginx/sites-available/primecamp.cloud 2>/dev/null | grep "root" | head -1 | awk '{print $2}' | sed 's/;//' | sed 's/;$//' || echo "")
    if [ -n "$DETECTED_ROOT" ] && [ "$DETECTED_ROOT" != "/" ]; then
        NGINX_ROOT="$DETECTED_ROOT"
    fi
fi

echo "📁 Diretório Nginx: $NGINX_ROOT"

# 4. Criar diretório se não existir
if [ ! -d "$NGINX_ROOT" ]; then
    echo "📁 Criando diretório $NGINX_ROOT..."
    mkdir -p "$NGINX_ROOT"
fi

# 5. Fazer backup (opcional, comentado para rapidez)
# echo "💾 Fazendo backup..."
# if [ -d "$NGINX_ROOT" ] && [ "$(ls -A $NGINX_ROOT)" ]; then
#     BACKUP_DIR="/root/backup-nginx-$(date +%Y%m%d-%H%M%S)"
#     mkdir -p "$BACKUP_DIR"
#     cp -r "$NGINX_ROOT"/* "$BACKUP_DIR/" 2>/dev/null || true
#     echo "✅ Backup salvo em $BACKUP_DIR"
# fi

# 6. Limpar diretório do Nginx
echo "🗑️  Limpando diretório do Nginx..."
rm -rf "$NGINX_ROOT"/* 2>/dev/null || true
rm -rf "$NGINX_ROOT"/.* 2>/dev/null || true

# 7. Copiar arquivos
echo "📤 Copiando arquivos do dist/ para $NGINX_ROOT..."
cp -r dist/* "$NGINX_ROOT/" 2>/dev/null || {
    echo "❌ Erro ao copiar arquivos"
    exit 1
}

# 8. Ajustar permissões
echo "🔐 Ajustando permissões..."
chown -R www-data:www-data "$NGINX_ROOT" 2>/dev/null || true
chmod -R 755 "$NGINX_ROOT" 2>/dev/null || true

# 9. Limpar cache do Nginx
echo "🧹 Limpando cache do Nginx..."
rm -rf /var/cache/nginx/* 2>/dev/null || true
rm -rf /var/lib/nginx/cache/* 2>/dev/null || true

# 10. Testar configuração do Nginx
echo "🔍 Testando configuração do Nginx..."
nginx -t 2>/dev/null && echo "✅ Configuração do Nginx OK" || echo "⚠️  Aviso: nginx -t falhou (pode ser normal)"

# 11. Recarregar Nginx
echo "🔄 Recarregando Nginx..."
systemctl reload nginx 2>/dev/null || service nginx reload 2>/dev/null || {
    echo "⚠️  Aviso: Não foi possível recarregar nginx automaticamente"
    echo "   Execute manualmente: systemctl reload nginx"
}

echo ""
echo "✅ DEPLOY CONCLUÍDO!"
echo ""
echo "📋 IMPORTANTE:"
echo "   - Acesse: https://primecamp.cloud/financeiro (NOVO)"
echo "   - NÃO acesse: https://primecamp.cloud/admin/financeiro (ANTIGO)"
echo ""
echo "💡 Dicas:"
echo "   - Limpe o cache do navegador (Ctrl+Shift+R)"
echo "   - Faça logout e login novamente se necessário"
echo ""
