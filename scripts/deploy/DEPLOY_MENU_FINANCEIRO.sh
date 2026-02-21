#!/bin/bash
set -e

echo "🚀 Iniciando deploy do Menu de Navegação Financeiro..."

# Navegar para o diretório do projeto
cd /root/primecamp-ofc

# Atualizar código do repositório
echo "📥 Atualizando código do repositório..."
git pull origin main

# Instalar dependências (se necessário)
echo "📦 Verificando dependências..."
npm install

# Fazer build do frontend
echo "🔨 Fazendo build do frontend..."
npm run build

# Verificar se o build foi bem-sucedido
if [ ! -d "dist" ]; then
  echo "❌ Erro: Diretório dist não encontrado após o build"
  exit 1
fi

# Deploy para Nginx
echo "📤 Fazendo deploy para Nginx..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

# Limpar cache do Nginx
echo "🧹 Limpando cache do Nginx..."
sudo rm -rf /var/cache/nginx/*
sudo rm -rf /var/lib/nginx/cache/*
sudo systemctl reload nginx

echo "✅ Deploy concluído com sucesso!"
echo "🌐 Acesse: https://primecamp.cloud/financeiro"
