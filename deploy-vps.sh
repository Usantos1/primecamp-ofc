#!/bin/bash
# Deploy Prime Camp na VPS
# Uso: bash deploy-vps.sh (ou chmod +x deploy-vps.sh && ./deploy-vps.sh)

set -e

REPO_DIR="${REPO_DIR:-$HOME/primecamp-ofc}"
WEB_ROOT="${WEB_ROOT:-/var/www/primecamp.cloud}"

echo "=== Deploy Prime Camp ==="
echo "Repositório: $REPO_DIR"
echo "Web root: $WEB_ROOT"
echo ""

cd "$REPO_DIR"

echo "1. Atualizando repositório..."
git fetch origin
git status
git pull origin main
echo "   Commit atual: $(git log -1 --oneline)"
echo ""

echo "2. Instalando dependências (se necessário)..."
npm install
echo ""

echo "3. Build do frontend..."
npm run build
if [ ! -d "dist" ]; then
  echo "   ERRO: pasta dist/ não foi criada. Build falhou?"
  exit 1
fi
echo "   Build OK. Conteúdo de dist: $(ls dist | head -5)"
echo ""

echo "4. Copiando arquivos para $WEB_ROOT..."
sudo cp -r dist/* "$WEB_ROOT/"
echo "   Cópia concluída."
echo ""

echo "5. Reiniciando backend (Node/API)..."
if command -v pm2 &>/dev/null; then
  pm2 restart all || true
  echo "   PM2 reiniciado."
elif systemctl is-active --quiet primecamp 2>/dev/null; then
  sudo systemctl restart primecamp
  echo "   Serviço primecamp reiniciado."
elif systemctl is-active --quiet primecamp-api 2>/dev/null; then
  sudo systemctl restart primecamp-api
  echo "   Serviço primecamp-api reiniciado."
else
  echo "   AVISO: Nenhum PM2 ou systemctl (primecamp/primecamp-api) encontrado. Reinicie o backend manualmente se existir."
fi
echo ""

echo "6. Recarregando Nginx..."
sudo systemctl reload nginx
echo "   Nginx recarregado."
echo ""

echo "=== Deploy concluído ==="
