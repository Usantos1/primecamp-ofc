# Guia de Deploy no VPS

## 📋 Opções para fazer deploy

### Opção 1: Git Pull (Recomendado)

Se você já tem o repositório no servidor:

```bash
# No servidor VPS
cd /caminho/do/seu/projeto
git pull origin main

# Instalar dependências da API
cd server
npm install

# Testar conexão
npm run test:connection

# Iniciar API
npm run dev
```

### Opção 2: Clonar Repositório

Se ainda não tem o projeto no servidor:

```bash
# Instalar Git (se não tiver)
apt-get update
apt-get install -y git nodejs npm

# Clonar repositório
cd /root
git clone https://github.com/Usantos1/primecamp-ofc.git
cd primecamp-ofc

# Instalar dependências da API
cd server
npm install

# Criar arquivo .env na raiz do projeto
cd ..
nano .env
```

Cole no `.env`:
```env
VITE_DB_HOST=72.62.106.76
VITE_DB_NAME=banco_gestao
VITE_DB_USER=postgres
VITE_DB_PASSWORD=AndinhoSurf2015@
VITE_DB_PORT=5432
VITE_DB_SSL=false
VITE_API_URL=http://localhost:3000/api
VITE_API_ORIGIN=http://localhost:8080
VITE_DB_MODE=postgres
PORT=3000
```

### Opção 3: Criar Arquivos Manualmente

Se preferir criar os arquivos diretamente no servidor:

```bash
# Criar diretório server
mkdir -p /root/primecamp-api/server
cd /root/primecamp-api/server

# Criar package.json
cat > package.json << 'EOF'
{
  "name": "primecamp-api",
  "version": "1.0.0",
  "description": "API Backend para Prime Camp - PostgreSQL",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "dev": "node --watch index.js",
    "start": "node index.js",
    "test": "node test-connection.js",
    "test:connection": "node test-connection.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5"
  }
}
EOF

# Instalar dependências
npm install
```

Depois copie os arquivos `index.js` e `test-connection.js` do repositório local para o servidor.

## 🚀 Iniciar API

### Desenvolvimento (com auto-reload)
```bash
cd server
npm run dev
```

### Produção (com PM2)
```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar API
cd server
pm2 start index.js --name primecamp-api

# Salvar configuração
pm2 save

# Configurar para iniciar no boot
pm2 startup
```

### Produção (com systemd)
```bash
# Criar serviço systemd
sudo nano /etc/systemd/system/primecamp-api.service
```

Cole:
```ini
[Unit]
Description=Prime Camp API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/primecamp-ofc/server
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Ativar serviço:
```bash
sudo systemctl daemon-reload
sudo systemctl enable primecamp-api
sudo systemctl start primecamp-api
sudo systemctl status primecamp-api
```

## 🔍 Verificar se está funcionando

```bash
# Testar conexão
curl http://localhost:3000/health

# Deve retornar:
# {"status":"ok","database":"connected"}
```

## 🔧 Configurar Nginx (Opcional)

Se quiser expor a API em um domínio:

```bash
sudo nano /etc/nginx/sites-available/primecamp-api
```

Cole:
```nginx
server {
    listen 80;
    server_name api.seudominio.com;

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
    }
}
```

Ativar:
```bash
sudo ln -s /etc/nginx/sites-available/primecamp-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 📝 Checklist

- [ ] Repositório clonado/pull feito no servidor
- [ ] Dependências instaladas (`npm install`)
- [ ] Arquivo `.env` configurado
- [ ] Conexão testada (`npm run test:connection`)
- [ ] API iniciada e funcionando
- [ ] PM2/systemd configurado (produção)
- [ ] Nginx configurado (se necessário)
- [ ] Firewall configurado (porta 3000)

## 🐛 Troubleshooting

### Erro: "Cannot find module"
```bash
cd server
rm -rf node_modules package-lock.json
npm install
```

### Erro de conexão PostgreSQL
```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Testar conexão manualmente
psql -h 72.62.106.76 -U postgres -d banco_gestao
```

### Erro de permissão
```bash
# Dar permissões ao diretório
chmod -R 755 /root/primecamp-ofc
```

### Ver logs do PM2
```bash
pm2 logs primecamp-api
```

### Reiniciar API
```bash
pm2 restart primecamp-api
```

