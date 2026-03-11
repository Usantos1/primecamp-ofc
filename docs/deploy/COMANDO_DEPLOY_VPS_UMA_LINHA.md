# Deploy VPS – Comando em uma linha (sempre com cd)

**Use estes comandos na VPS** (SSH no servidor). O `cd` no início é obrigatório para funcionar de qualquer diretório.

## Uma linha (copiar inteiro, incluindo a aspas final do echo)

```bash
cd /root/primecamp-ofc && git pull origin main && npm install && npm run build && sudo rm -rf /var/www/primecamp.cloud/* && sudo cp -r dist/* /var/www/primecamp.cloud/ && sudo chown -R www-data:www-data /var/www/primecamp.cloud && sudo chmod -R 755 /var/www/primecamp.cloud && sudo rm -rf /var/cache/nginx/* 2>/dev/null; sudo systemctl reload nginx && cd server && npm install --production && pm2 restart primecamp-api && cd .. && echo "Deploy concluido!"
```

**Atenção:** use o comando inteiro; não corte no meio. O path correto é **`/var/www/primecamp.cloud`** (com `.cloud`). Se aparecer `chown: cannot access '/var/www/primecamp'`, o path está errado e o deploy não conclui (404). A parte do Nginx usa `;` de propósito (reload roda mesmo se o cache não existir).

## Em vários passos (se a uma linha falhar ou para ver em qual passo deu erro)

```bash
cd /root/primecamp-ofc
git pull origin main
npm install
npm run build
sudo rm -rf /var/www/primecamp.cloud/*
sudo cp -r dist/* /var/www/primecamp.cloud/
sudo chown -R www-data:www-data /var/www/primecamp.cloud
sudo chmod -R 755 /var/www/primecamp.cloud
sudo rm -rf /var/cache/nginx/* 2>/dev/null
sudo systemctl reload nginx
cd server
npm install --production
pm2 restart primecamp-api
cd ..
echo "Deploy concluido!"
```

Se a pasta do projeto for outra (ex.: `/root/primecamp`), troque o primeiro `cd` para o caminho correto. Se o nome do app no PM2 for outro, use `pm2 list` para ver o nome e troque `primecamp-api` no `pm2 restart`.

## Ordem dos passos

1. `cd /root/primecamp-ofc` – entra na pasta do projeto  
2. `git pull origin main` – atualiza o código  
3. `npm install` – dependências do frontend (raiz)  
4. `npm run build` – build do frontend  
5. Limpa e copia `dist/*` para `/var/www/primecamp.cloud/`  
6. Ajusta dono e permissões  
7. Limpa cache do Nginx e recarrega  
8. `cd server` → `npm install --production` → `pm2 restart primecamp-api` → `cd ..`

**Importante:** o passo 8 (reiniciar a API com PM2) é necessário para que o salvamento do **tema do sistema** (cores, nome, logo) funcione. Se ao salvar configurações aparecer 404 ou 401 em `/api/theme-config`, a VPS está com a API antiga — refaça o deploy **completo** (incluindo `git pull`, `cd server`, `npm install --production` e `pm2 restart primecamp-api`). Só atualizar o frontend não basta; a API precisa ser reiniciada com o código novo.

**Tema por empresa (cores, nome, logo):** o tema é salvo **por empresa** (company_id do usuário). Cada empresa tem sua própria config; ao salvar nas configurações do sistema, reflete para todos os usuários da mesma empresa. Sem login usa tema do domínio (host). Para funcionar, a API na VPS precisa estar atualizada (deploy completo com `cd server` e `pm2 restart primecamp-api`); senão o POST retorna 404.

**White-label (tema por domínio):** para a tela de login e quando o usuário não tem empresa, usa-se o tema do domínio. No `.env` da VPS: `WHITELABEL_DOMAINS=ativafix.com,www.ativafix.com,primecamp.cloud,www.primecamp.cloud` (opcional; esses já vêm por padrão).

## POST /api/theme-config ainda retorna 404 depois do deploy

1. **Confirmar que a API nova está no ar:** no navegador ou na VPS rode:
   ```bash
   curl -s https://api.ativafix.com/api/theme-config/ok
   ```
   Deve retornar `{"ok":true,"themeConfig":"enabled"}`. Se retornar 404, a API em produção **não** é a nova: refaça o deploy (caminho do projeto, `cd server`, `pm2 restart primecamp-api`) e confira com `pm2 list` qual processo está rodando e de qual pasta.

2. **Se /ok retorna 200 mas POST ainda 404:** na VPS teste direto no Node:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/theme-config -H "Content-Type: application/json" -d '{}'
   ```
   Deve retornar `401` (não autorizado), não 404. Se der 404, o servidor Node não tem a rota (código antigo). Se der 401, o Node está certo e o 404 pode vir do Nginx (ex.: bloqueio de POST ou proxy para outro backend). Confira o config do Nginx para `api.ativafix.com` (ou o domínio da API) e garanta que `proxy_pass` envia para o processo que você reiniciou com PM2.

3. **Reinício garantido:** `cd /root/primecamp-ofc && git pull origin main && cd server && npm install --production && pm2 restart primecamp-api && pm2 logs primecamp-api --lines 5`

4. **Se curl /api/theme-config/ok ainda retorna "Token de autenticação necessário":**

   **a) Testar direto no Node (na VPS):**
   ```bash
   curl -s http://localhost:3000/api/theme-config/ok
   ```
   - Se retornar `{"ok":true,...}` → o Node está certo; o 401 via HTTPS vem do **Nginx** (proxy ou outro backend). Confira qual servidor Nginx usa para `api.ativafix.com` e se o `proxy_pass` aponta para `http://127.0.0.1:3000` (ou a porta do PM2).
   - Se retornar `{"error":"Token..."}` → o processo na porta 3000 **não** é o código novo. Siga (b).

   **b) Forçar atualização do código e reinício:**
   ```bash
   cd /root/primecamp-ofc
   git fetch origin main
   git reset --hard origin/main
   git log -1 --oneline
   ```
   O último commit deve ser algo como `9dcc7fd` ou mais recente. Depois:
   ```bash
   cd server && pm2 restart primecamp-api
   curl -s http://localhost:3000/api/theme-config/ok
   ```
   Se localhost retornar `{"ok":true,...}`, teste a API pública: `curl -s https://api.ativafix.com/api/theme-config/ok` (sempre use `curl`, não digite a URL direto no bash).

   **c) Teste sem /api** (caso o Nginx repasse só o path): `curl -s http://localhost:3000/theme-config/ok`

   **d) Conferir se a VPS está com o código novo:** na VPS rode:
   ```bash
   grep -n "Bypass imediato" /root/primecamp-ofc/server/index.js
   ```
   Deve aparecer uma linha (ex.: `121:// Bypass imediato...`). Se não aparecer, o repositório na VPS está desatualizado: no seu **PC** faça `git push origin main`; na **VPS** rode `git fetch origin main && git reset --hard origin/main`, depois `cd server && pm2 restart primecamp-api`. Confirme também que o PM2 usa o projeto certo: `pm2 describe primecamp-api` (campo "script path" deve ser o `index.js` dentro de `/root/primecamp-ofc/server`). Resposta correta do endpoint: `{"ok":true,"themeConfig":"enabled","path":"/api/theme-config/ok","_v":2}`.

## Requisito: Node 18+ na API

A API usa o **fetch nativo** do Node (sem `node-fetch` nem `form-data`). É necessário **Node 18 ou superior** no ambiente onde a API roda. Para conferir: `node -v`. Se for menor que 18, atualize: `nvm install 20 && nvm use 20` (ou use o método do seu provedor).

## Se aparecer "Cannot find package 'form-data'" ou "...form-data/index.js" (Telegram)

O server tem um **postinstall** que cria `form-data/index.js` (o pacote não traz esse arquivo). Na VPS, atualize o código e rode **npm install** no `server` para o postinstall rodar; depois reinicie a API:

```bash
cd /root/primecamp-ofc && git pull origin main && cd server && npm install --production && pm2 restart primecamp-api && echo "OK"
```

Se ainda falhar, force reinstalação: `cd server && rm -rf node_modules && npm install --production && pm2 restart primecamp-api`

## Se deu 404 ou "chown: cannot access '/var/www/primecamp'"

O path certo é **`/var/www/primecamp.cloud`** (com `.cloud`). Criar a pasta se não existir e rodar só a parte do frontend:

```bash
sudo mkdir -p /var/www/primecamp.cloud
cd /root/primecamp-ofc && sudo rm -rf /var/www/primecamp.cloud/* && sudo cp -r dist/* /var/www/primecamp.cloud/ && sudo chown -R www-data:www-data /var/www/primecamp.cloud && sudo chmod -R 755 /var/www/primecamp.cloud && sudo systemctl reload nginx && echo "Frontend atualizado!"
```

Se o build já foi feito antes, isso já resolve. Se não, rode o deploy completo (comando de uma linha no topo) com atenção ao path.
