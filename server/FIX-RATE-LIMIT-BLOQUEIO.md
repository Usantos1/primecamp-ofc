# Corrigir bloqueio 429 (muitas tentativas de login)

Quando a API começa a retornar **429 Too Many Requests** em `/api/auth/me` e `/api/auth/login`, todo mundo fica bloqueado na tela de login.

## O que foi alterado no código

1. **Limite geral (`/api/*`)** não conta mais nenhuma rota que tenha `/auth` na URL. Ou seja, `auth/me` e login **não consomem** o limite de 5000 requisições.
2. **Limite de login** aumentado para 10.000 tentativas por IP a cada 15 minutos.
3. Assim que esse código estiver rodando na API, o bloqueio deixa de acontecer por causa de `auth/me` ou login.

## Obrigatório: atualizar a API na VPS

O código novo **só vale** depois de atualizar o servidor e reiniciar a API. Enquanto a API antiga estiver no ar, o 429 continua.

### 1. No seu PC (enviar para o Git)

```powershell
cd "c:\Users\Uander\Documents\GitHub\primecamp"
git add server/index.js
git commit -m "fix(API): rate limit nao contar rotas /api/auth/* + limite login 10k"
git push origin main
```

### 2. Na VPS (atualizar e reiniciar)

Conecte na VPS e rode:

```bash
cd /root/primecamp-ofc
git pull origin main
cd server
npm install --production
pm2 restart primecamp-api
pm2 save
cd ..
echo "API atualizada - aguarde 20s e teste o login"
```

### 3. Desbloquear agora (sem esperar deploy)

Se você **já está bloqueado** e precisa entrar agora, na VPS rode só:

```bash
pm2 restart primecamp-api
```

Isso **zera o contador de tentativas** (está em memória). Em ~30 segundos o login volta a funcionar. Depois faça o deploy do código acima para o problema não voltar.
