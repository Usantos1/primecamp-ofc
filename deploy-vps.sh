#!/bin/bash
# Deploy frontend na VPS - rodar DENTRO da pasta do projeto: cd ~/primecamp-ofc && ./deploy-vps.sh
set -e
cd "$(dirname "$0")"
echo ">>> git pull origin main"
git pull origin main
echo ">>> npm install"
npm install
echo ">>> npm run build"
npm run build
echo ">>> copiando dist para /var/www/primecamp.cloud/"
sudo cp -r dist/* /var/www/primecamp.cloud/
echo ">>> pm2 restart all"
pm2 restart all
echo ">>> nginx reload"
sudo systemctl reload nginx
echo ">>> Deploy concluído."
