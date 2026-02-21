# 🚀 Comandos para Executar no Servidor

O arquivo `CORRIGIR_PM2_E_ROTAS.sh` foi criado e enviado ao repositório, mas você precisa fazer `git pull` primeiro.

## Execute estes comandos no servidor:

```bash
cd /root/primecamp-ofc

# 1. Atualizar código do repositório
git pull origin main

# 2. Tornar o script executável
chmod +x CORRIGIR_PM2_E_ROTAS.sh

# 3. Executar o script completo
./CORRIGIR_PM2_E_ROTAS.sh
```

## Alternativa: Executar comandos manualmente

Se preferir, você pode executar os comandos manualmente:

```bash
cd /root/primecamp-ofc

# Atualizar código
git pull origin main

# Parar PM2
pm2 stop all
pm2 delete all
sleep 2

# Matar processos na porta 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Instalar dependências do backend
cd server
npm install

# Aplicar migração SQL
DB_NAME=$(grep DB_NAME ../.env | cut -d '=' -f2 || echo "postgres")
sudo -u postgres psql -d "$DB_NAME" -f ../sql/CRIAR_TABELAS_IA_FINANCEIRO.sql || echo "Migração pode já estar aplicada"

# Iniciar backend
pm2 start index.js --name primecamp-api
sleep 5

# Voltar para raiz e fazer build do frontend
cd /root/primecamp-ofc
npm install
rm -rf dist node_modules/.vite || true
npm run build

# Deploy frontend
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

# Limpar cache Nginx
sudo rm -rf /var/cache/nginx/*
sudo rm -rf /var/lib/nginx/cache/*
sudo systemctl reload nginx

echo "✅ Deploy concluído!"
```
