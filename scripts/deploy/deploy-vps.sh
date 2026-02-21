#!/bin/bash
# Deploy Primecamp na VPS (frontend + API)
# Uso: bash deploy-vps.sh   ou   ./deploy-vps.sh

set -e
cd ~/primecamp-ofc

echo ">>> Git pull..."
git pull origin main

echo ">>> npm install..."
npm install
cd server && npm install && cd ..

echo ">>> Build frontend..."
npm run build

echo ">>> Copiando dist para nginx..."
sudo cp -r dist/* /var/www/primecamp.cloud/

echo ">>> Reiniciando API (para carregar server/index.js)..."
sudo systemctl restart primecamp-api || true

echo ">>> Reload nginx..."
sudo systemctl reload nginx

echo ">>> Deploy concluído."
