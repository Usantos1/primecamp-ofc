# 🚀 Deploy da API em Produção - VPS

## 📋 Estratégia Recomendada

**Testar localmente primeiro**, depois fazer deploy na VPS. Isso evita problemas em produção.

## 🔧 Opção 1: Deploy com PM2 (Recomendado)

### Passo 1: Instalar PM2 no Servidor

```bash
# No servidor VPS
npm install -g pm2
```

### Passo 2: Configurar Variáveis de Ambiente

No servidor, criar/editar `.env` na raiz do projeto:

```bash
cd /root/primecamp-ofc
nano .env
```

Conteúdo:
```env
# PostgreSQL
VITE_DB_HOST=72.62.106.76
VITE_DB_NAME=banco_gestao
VITE_DB_USER=postgres
VITE_DB_PASSWORD=AndinhoSurf2015@
VITE_DB_PORT=5432
VITE_DB_SSL=false

# API Backend
VITE_API_URL=http://api.primecamp.cloud/api
VITE_API_ORIGIN=https://seudominio.com  # ou http://localhost:8080 para dev
PORT=3000
NODE_ENV=production
```

### Passo 3: Instalar Dependências

```bash
cd /root/primecamp-ofc/server
npm install --production
```

### Passo 4: Iniciar com PM2

```bash
cd /root/primecamp-ofc/server
pm2 start index.js --name primecamp-api --env production
```

### Passo 5: Configurar PM2 para Iniciar no Boot

```bash
# Salvar configuração atual
pm2 save

# Configurar para iniciar automaticamente no boot
pm2 startup
# Execute o comando que aparecer (algo como: sudo env PATH=...)
```

### Passo 6: Comandos Úteis do PM2

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs primecamp-api

# Reiniciar
pm2 restart primecamp-api

# Parar
pm2 stop primecamp-api

# Deletar
pm2 delete primecamp-api

# Monitorar (dashboard)
pm2 monit
```

## 🔧 Opção 2: Deploy com systemd (Alternativa)

### Passo 1: Criar Arquivo de Serviço

```bash
sudo nano /etc/systemd/system/primecamp-api.service
```

Conteúdo:
```ini
[Unit]
Description=Prime Camp API
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/primecamp-ofc/server
Environment="NODE_ENV=production"
EnvironmentFile=/root/primecamp-ofc/.env
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=primecamp-api

[Install]
WantedBy=multi-user.target
```

### Passo 2: Ativar e Iniciar

```bash
sudo systemctl daemon-reload
sudo systemctl enable primecamp-api
sudo systemctl start primecamp-api
sudo systemctl status primecamp-api
```

### Passo 3: Ver Logs

```bash
sudo journalctl -u primecamp-api -f
```

## 🌐 Opção 3: Configurar Nginx como Reverse Proxy

### Passo 1: Instalar Nginx (se não tiver)

```bash
sudo apt update
sudo apt install nginx -y
```

### Passo 2: Criar Configuração do Nginx

```bash
sudo nano /etc/nginx/sites-available/primecamp-api
```

Conteúdo:
```nginx
server {
    listen 80;
    server_name api.primecamp.cloud;

    # Redirecionar HTTP para HTTPS (opcional, se tiver SSL)
    # return 301 https://$server_name$request_uri;

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

# Se tiver SSL (recomendado)
# server {
#     listen 443 ssl http2;
#     server_name api.primecamp.cloud;
#
#     ssl_certificate /path/to/cert.pem;
#     ssl_certificate_key /path/to/key.pem;
#
#     location / {
#         proxy_pass http://localhost:3000;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#         proxy_cache_bypass $http_upgrade;
#     }
# }
```

### Passo 3: Ativar Site

```bash
sudo ln -s /etc/nginx/sites-available/primecamp-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 Configurar SSL com Let's Encrypt (Opcional mas Recomendado)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obter certificado
sudo certbot --nginx -d api.primecamp.cloud

# Renovação automática (já configurado automaticamente)
sudo certbot renew --dry-run
```

## 🔥 Configurar Firewall

```bash
# Permitir porta 3000 (se necessário para testes diretos)
sudo ufw allow 3000/tcp

# Permitir HTTP e HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Verificar status
sudo ufw status
```

## 📝 Checklist de Deploy

- [ ] Código atualizado no servidor (`git pull`)
- [ ] Dependências instaladas (`npm install --production`)
- [ ] Arquivo `.env` configurado
- [ ] API testada localmente no servidor (`npm run dev`)
- [ ] PM2/systemd configurado
- [ ] API iniciando automaticamente no boot
- [ ] Nginx configurado (se aplicável)
- [ ] SSL configurado (se aplicável)
- [ ] Firewall configurado
- [ ] Testado de fora do servidor (`curl http://api.primecamp.cloud/health`)

## 🧪 Testar Localmente ANTES de Produção

### No seu computador local:

1. **Clonar repositório:**
```bash
git clone https://github.com/Usantos1/primecamp-ofc.git
cd primecamp-ofc
```

2. **Configurar `.env`:**
```env
VITE_DB_HOST=72.62.106.76
VITE_DB_NAME=banco_gestao
VITE_DB_USER=postgres
VITE_DB_PASSWORD=AndinhoSurf2015@
VITE_DB_PORT=5432
VITE_DB_SSL=false
VITE_API_URL=http://localhost:3000/api
VITE_API_ORIGIN=http://localhost:8080
PORT=3000
```

3. **Instalar e rodar:**
```bash
cd server
npm install
npm run dev
```

4. **Testar:**
```bash
curl http://localhost:3000/health
```

5. **Testar com frontend local:**
- Iniciar frontend: `npm run dev`
- Acessar `http://localhost:8080/pdv/os`
- Verificar se os dados aparecem

## 🚀 Deploy Rápido na VPS

```bash
# 1. Conectar ao servidor
ssh root@72.62.106.76

# 2. Ir para o diretório do projeto
cd /root/primecamp-ofc

# 3. Atualizar código
git pull origin main

# 4. Instalar/atualizar dependências
cd server
npm install --production

# 5. Reiniciar API
pm2 restart primecamp-api

# 6. Verificar logs
pm2 logs primecamp-api --lines 50
```

## 🔍 Monitoramento

### Ver logs em tempo real:
```bash
pm2 logs primecamp-api --lines 100
```

### Ver uso de recursos:
```bash
pm2 monit
```

### Verificar se está rodando:
```bash
pm2 status
curl http://api.primecamp.cloud/health
```

## ⚠️ Troubleshooting

### API não inicia:
```bash
# Ver logs
pm2 logs primecamp-api

# Verificar se porta está em uso
sudo netstat -tulpn | grep 3000

# Verificar variáveis de ambiente
cd server
node -e "require('dotenv').config({path:'../.env'}); console.log(process.env.VITE_DB_HOST)"
```

### Erro de conexão PostgreSQL:
```bash
# Testar conexão manualmente
psql -h 72.62.106.76 -U postgres -d banco_gestao
```

### CORS não funciona:
- Verificar `VITE_API_ORIGIN` no `.env`
- Verificar configuração CORS no `server/index.js`
- Verificar logs do Nginx (se estiver usando)

## 📊 Recomendação Final

**Para começar:**
1. ✅ Testar localmente primeiro
2. ✅ Fazer deploy na VPS com PM2
3. ✅ Configurar Nginx depois
4. ✅ Adicionar SSL por último

Isso permite testar cada etapa sem quebrar produção!

