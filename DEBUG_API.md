# 🔍 Debug da API - "Failed to fetch"

## Problemas Comuns e Soluções

### 1. Verificar se a API está rodando

No servidor VPS:
```bash
# Verificar se a API está rodando
curl http://localhost:3000/health

# Ou de fora do servidor
curl http://api.primecamp.cloud/health
```

Deve retornar: `{"status":"ok","database":"connected"}`

### 2. Verificar URL da API no Frontend

No `.env` do frontend, certifique-se de ter:
```env
VITE_API_URL=http://api.primecamp.cloud/api
```

**IMPORTANTE:** 
- Se estiver em desenvolvimento local: `http://localhost:3000/api`
- Se estiver em produção: `http://api.primecamp.cloud/api`

### 3. Verificar CORS na API

No servidor, verificar `server/index.js`:
```javascript
app.use(cors({
  origin: process.env.VITE_API_ORIGIN || 'http://localhost:8080',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

No `.env` do servidor:
```env
VITE_API_ORIGIN=http://localhost:8080  # Para desenvolvimento
# ou
VITE_API_ORIGIN=https://seudominio.com  # Para produção
```

### 4. Verificar Token de Autenticação

O cliente API tenta obter o token do localStorage. Verificar no console do navegador:

```javascript
// No console do navegador
localStorage.getItem('sb-gogxicjaqpqbhsfzutij-auth-token')
```

Se retornar `null`, você precisa fazer login primeiro.

### 5. Testar Requisição Manual

No console do navegador:
```javascript
fetch('http://api.primecamp.cloud/api/query/ordens_servico', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    select: '*',
    orderBy: { field: 'created_at', ascending: false },
    limit: 10
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

### 6. Verificar Logs da API

No servidor VPS, verificar logs:
```bash
# Se estiver usando PM2
pm2 logs primecamp-api

# Se estiver usando systemd
sudo journalctl -u primecamp-api -f

# Se estiver rodando direto
# Os logs aparecem no terminal onde está rodando
```

### 7. Verificar Firewall

```bash
# Verificar se a porta 3000 está aberta
sudo ufw status
sudo netstat -tulpn | grep 3000
```

### 8. Verificar Nginx (se estiver usando)

Se a API está atrás do Nginx, verificar configuração:
```nginx
location /api {
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
```

## ✅ Checklist Rápido

- [ ] API está rodando (`curl http://api.primecamp.cloud/health`)
- [ ] `.env` do frontend tem `VITE_API_URL` correto
- [ ] `.env` do servidor tem `VITE_API_ORIGIN` correto
- [ ] CORS está configurado corretamente
- [ ] Porta 3000 está acessível
- [ ] Nginx está configurado (se aplicável)
- [ ] Token de autenticação existe no localStorage

## 🐛 Erro Específico: "Failed to fetch"

Este erro geralmente significa:
1. **API não está acessível** - Verificar se está rodando
2. **CORS bloqueado** - Verificar configuração CORS
3. **URL incorreta** - Verificar `VITE_API_URL` no `.env`
4. **Firewall bloqueando** - Verificar regras de firewall
5. **HTTPS/HTTP misturado** - Se o site é HTTPS, a API também deve ser

## 🔧 Solução Rápida

1. **Reiniciar API:**
```bash
pm2 restart primecamp-api
```

2. **Verificar variáveis de ambiente:**
```bash
cd server
cat ../.env | grep VITE_API
```

3. **Testar conexão:**
```bash
curl -X POST http://api.primecamp.cloud/api/query/ordens_servico \
  -H "Content-Type: application/json" \
  -d '{"select":"*","limit":1}'
```

