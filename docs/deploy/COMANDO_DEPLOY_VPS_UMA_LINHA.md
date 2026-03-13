# Deploy VPS – Comando em uma linha (sempre com cd)

**Use estes comandos na VPS** (SSH no servidor). O `cd` no início é obrigatório para funcionar de qualquer diretório.

**Domínios:** o sistema (login, dashboard, OS, cupom) fica em **app.ativafix.com**; **ativafix.com** mostra a **landing de vendas em React** (mesma build do app). No Nginx, **ativafix.com** e **app.ativafix.com** devem usar o **mesmo** `root` (ex.: `/var/www/ativafix`): o build único decide pelo hostname — em ativafix.com exibe a LP, em app.ativafix.com exibe o app. Um único deploy atualiza os dois. Na API: `FRONTEND_URL=https://app.ativafix.com` no `.env`.

## Uma linha (copiar inteiro, incluindo a aspas final do echo)

```bash
cd /root/primecamp-ofc && git pull origin main && npm install && npm run build && sudo rm -rf /var/www/ativafix/* && sudo cp -r dist/* /var/www/ativafix/ && sudo chown -R www-data:www-data /var/www/ativafix && sudo chmod -R 755 /var/www/ativafix && sudo rm -rf /var/cache/nginx/* 2>/dev/null; sudo systemctl reload nginx && cd server && npm install --production && pm2 restart primecamp-api && cd .. && echo "Deploy concluido!"
```

**Atenção:** use o comando inteiro; não corte no meio. O path do frontend é **`/var/www/ativafix`**. Se aparecer erro de `chown` ou 404, crie a pasta com `sudo mkdir -p /var/www/ativafix` e confira o Nginx. A parte do Nginx usa `;` de propósito (reload roda mesmo se o cache não existir).

## Em vários passos (se a uma linha falhar ou para ver em qual passo deu erro)

```bash
cd /root/primecamp-ofc
git pull origin main
npm install
npm run build
sudo rm -rf /var/www/ativafix/*
sudo cp -r dist/* /var/www/ativafix/
sudo chown -R www-data:www-data /var/www/ativafix
sudo chmod -R 755 /var/www/ativafix
sudo rm -rf /var/cache/nginx/* 2>/dev/null
sudo systemctl reload nginx
cd server
npm install --production
pm2 restart primecamp-api
cd ..
echo "Deploy concluido!"
# (Opcional) Se for a primeira vez com multi-segmento: rode a migration no banco de produção (veja seção "Multi-segmento" abaixo)
```

Se a pasta do projeto for outra (ex.: `/root/primecamp`), troque o primeiro `cd` para o caminho correto. Se o nome do app no PM2 for outro, use `pm2 list` para ver o nome e troque `primecamp-api` no `pm2 restart`.

### Multi-segmento (Revenda)

Para a aba **Segmentos** em **https://app.ativafix.com/admin/revenda** funcionar (e sumir os 404 de `segmentos`, `modulos` e `segment-menu`):

1. **Deploy do código** – o bloco acima já atualiza a API; `pm2 restart primecamp-api` ativa as rotas `/api/admin/revenda/segmentos`, `/api/admin/revenda/modulos` e `/api/me/segment-menu`.
2. **Migration no banco de produção (uma vez)** – no PostgreSQL que a API usa em produção, execute o script `db/migrations/manual/REVENDA_MULTI_SEGMENTO.sql` (pgAdmin, DBeaver, `psql -f`, etc.). Sem isso a API devolve 503 ou lista vazia e o front mostra "Nenhum segmento cadastrado".  
   **Oficina Mecânica:** se o menu não mostrar **Orçamentos** (/orcamentos) ou a página não estiver disponível, execute também `db/migrations/manual/REVENDA_OFICINA_ADD_ORCAMENTOS.sql` no mesmo banco.

**Se continuar 404 após o deploy:** na VPS confira se o código está atualizado (`cd /root/primecamp-ofc && git log -1 --oneline` deve mostrar o commit do multi-segmento) e se a API reiniciou (`pm2 restart primecamp-api`). Teste direto: `curl -s -o /dev/null -w "%{http_code}" https://api.ativafix.com/api/admin/revenda/segmentos` — com o código novo deve retornar 401 (não autenticado) e não 404.

**Se na VPS o curl retorna 401 mas no navegador (ou em aba anônima) continua 404:** a requisição “de fora” pode estar indo para outro lugar ou cache. Na VPS:
1. Recarregar o Nginx (pode estar em cache): `sudo systemctl reload nginx`
2. Se usar `proxy_cache` no Nginx para a API, limpar cache ou desativar para `/api` e testar de novo
3. No seu **PC** (fora da VPS) testar: `curl -s -o /dev/null -w "%{http_code}" https://api.ativafix.com/api/admin/revenda/segmentos`  
   - Se retornar **404** no PC e **401** na VPS, o Nginx pode estar respondendo 404 para requisições externas (ex.: outro `server` ou `location`). Confira `server_name api.ativafix.com` e que não há outro bloco com `default_server` ou ordem que capture primeiro. Garanta que o bloco de `api.ativafix.com` tem `location / { proxy_pass http://127.0.0.1:3000; ... }` e que a porta é a do PM2 (`pm2 list`).
4. Testar direto na porta do Node (só na VPS): `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/admin/revenda/segmentos` — deve dar 401. Se der 401, o Node está certo e o 404 vem do Nginx ou de algo na frente.

**Rodar a migration no banco de produção pela VPS:** na pasta do projeto, com o `.env` do `server` (ou as variáveis `DB_*` definidas), use:
```bash
cd /root/primecamp-ofc
export PGPASSWORD="$DB_PASSWORD"
psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -f db/migrations/manual/REVENDA_MULTI_SEGMENTO.sql
unset PGPASSWORD
```
Se o `.env` está em `server/.env`, carregue antes: `set -a && source server/.env && set +a` (ou `export $(grep -v '^#' server/.env | xargs)`).

**Desenvolvimento local:** se o app em `localhost:8080` chama a API de produção e dá 404 nas rotas de segmentos, defina no `.env`: `VITE_API_URL=http://localhost:3000` (porta do seu backend) e reinicie o Vite.

## Ordem dos passos

1. `cd /root/primecamp-ofc` – entra na pasta do projeto  
2. `git pull origin main` – atualiza o código  
3. `npm install` – dependências do frontend (raiz)  
4. `npm run build` – build do frontend  
5. Limpa e copia `dist/*` para `/var/www/ativafix/`  
6. Ajusta dono e permissões  
7. Limpa cache do Nginx e recarrega  
8. `cd server` → `npm install --production` → `pm2 restart primecamp-api` → `cd ..`  
9. *(Multi-segmento)* Se for a primeira vez: rodar `REVENDA_MULTI_SEGMENTO.sql` no banco de produção (ver seção **Multi-segmento** acima).

## Verificação após o deploy (LP + páginas legais)

Depois do deploy, confira:

1. **https://ativafix.com** — deve abrir a **landing de vendas** (LP em React). Se abrir outra coisa ou 404, o Nginx de `ativafix.com` não está usando o mesmo `root` que `app.ativafix.com` ou o build não foi copiado.
2. **https://app.ativafix.com** — deve abrir o **sistema** (tela de login).
3. **https://app.ativafix.com/demo** — deve abrir a página **Demonstração** (botão "Entrar na demonstração"). Se aparecer "Página em Construção", o build na VPS está antigo; rode o deploy de novo.
4. **https://app.ativafix.com/termos-de-uso** — deve abrir a página **Termos de Uso** (sem login).
5. **https://app.ativafix.com/politica-de-privacidade** — deve abrir a página **Política de Privacidade** (sem login).

Se **termos-de-uso** ou **politica-de-privacidade** derem 404 ao abrir o link direto, o Nginx está sem a regra de SPA. Nos blocos `server` de `ativafix.com` e `app.ativafix.com` o `location /` precisa ter:

```nginx
try_files $uri $uri/ /index.html;
```

Assim qualquer caminho (ex.: `/politica-de-privacidade`) devolve `index.html` e o React Router mostra a página certa. Veja o arquivo `docs/deploy/NGINX_ATIVAFIX_PASSO_A_PASSO.md` para o config completo.

### Se ativafix.com mostra "em construção" ou página simples (não a LP)

Isso acontece quando **ativafix.com** está apontando para outro `root` no Nginx (ex.: uma pasta com um index.html antigo ou “em construção”). A LP de vendas é a **mesma build** do app: o React decide pelo hostname (ativafix.com = LP, app.ativafix.com = sistema).

**O que fazer na VPS:**

1. Abra o config do Nginx: `sudo nano /etc/nginx/sites-available/ativafix`
2. No bloco `server` de **ativafix.com** (e www.ativafix.com), o `root` tem que ser **igual** ao de app.ativafix.com:
   - `root /var/www/ativafix;`
3. Não use outra pasta só para ativafix.com (ex.: `/var/www/ativafix.com` ou `/var/www/landing`). Os dois domínios devem usar **o mesmo** `root`.
4. Salve, teste: `sudo nginx -t` e depois `sudo systemctl reload nginx`.
5. Rode o deploy de novo (build + copiar para `/var/www/ativafix`).
6. Abra https://ativafix.com em aba anônima ou com cache limpo (Ctrl+Shift+R). Deve aparecer a LP em React (hero verde, dores, recursos, CTA WhatsApp).

**Diagnóstico na VPS (ver se os dois domínios servem o mesmo arquivo):**
```bash
# Os dois devem devolver o MESMO index.html (com script src="/assets/...")
curl -sI https://ativafix.com | head -3
curl -sI https://app.ativafix.com | head -3
curl -s https://ativafix.com 2>/dev/null | head -20
curl -s https://app.ativafix.com 2>/dev/null | head -20
```
Se o corpo de ativafix.com for diferente (ex.: texto "em construção" ou outro HTML), o Nginx está com `root` diferente para ativafix.com — corrija para `root /var/www/ativafix;` no bloco de ativafix.com.

**Correção em uma linha (na VPS):** garantir que ativafix.com e app.ativafix.com usem **só** `root /var/www/ativafix;`:
```bash
# Corrige qualquer root errado no config ativafix (ativafix-lp, primecamp.cloud, etc.)
sudo sed -i 's|root /var/www/ativafix-lp;|root /var/www/ativafix;|g' /etc/nginx/sites-available/ativafix
sudo sed -i 's|root /var/www/primecamp.cloud;|root /var/www/ativafix;|g' /etc/nginx/sites-available/ativafix
sudo nginx -t && sudo systemctl reload nginx
```
**Conferir:** no config, ativafix.com e app.ativafix.com devem ter exatamente `root /var/www/ativafix;`:
```bash
sudo grep -A 2 "server_name ativafix.com" /etc/nginx/sites-available/ativafix
sudo grep -A 2 "server_name app.ativafix.com" /etc/nginx/sites-available/ativafix
```
Depois abra https://ativafix.com em aba anônima (Ctrl+Shift+N) — deve carregar a LP em React (hero verde), não a página HTML “em construção”.

**Painel de Alertas:** para o Painel de Alertas funcionar, rode **uma vez** no banco usado pela API a migração `db/migrations/manual/PAINEL_ALERTAS_TABELAS.sql`. Se a API estiver em "errored" com muitos restarts, veja a seção "PM2 em erro / API caindo" abaixo.

**Importante:** o passo 8 (reiniciar a API com PM2) é necessário para que o salvamento do **tema do sistema** (cores, nome, logo) funcione. Se ao salvar configurações aparecer 404 ou 401 em `/api/theme-config`, a VPS está com a API antiga — refaça o deploy **completo** (incluindo `git pull`, `cd server`, `npm install --production` e `pm2 restart primecamp-api`). Só atualizar o frontend não basta; a API precisa ser reiniciada com o código novo.

**Tema por empresa (cores, nome, logo):** o tema é salvo **por empresa** (company_id do usuário). Cada empresa tem sua própria config; ao salvar nas configurações do sistema, reflete para todos os usuários da mesma empresa. Sem login usa tema do domínio (host). Para funcionar, a API na VPS precisa estar atualizada (deploy completo com `cd server` e `pm2 restart primecamp-api`); senão o POST retorna 404.

**White-label (tema por domínio):** para a tela de login e quando o usuário não tem empresa, usa-se o tema do domínio. No `.env` da VPS: `WHITELABEL_DOMAINS=ativafix.com,www.ativafix.com,app.ativafix.com` (padrão). O **app** (login, dashboard, OS, etc.) fica em **app.ativafix.com**; o domínio principal **ativafix.com** fica para LP e páginas de vendas. Configure o Nginx para servir o frontend em `app.ativafix.com` (ex.: `root /var/www/app.ativafix.com` ou o path que você usar). Use `FRONTEND_URL=https://app.ativafix.com` no `.env` da API para links de e-mail (reset de senha). No build do frontend, opcional: `VITE_APP_URL=https://app.ativafix.com`.

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

   **d) Status "errored" ou muitos restarts no PM2:** o app pode estar crashando (ex.: porta 3000 em uso por processo antigo). Rode:
   ```bash
   pm2 logs primecamp-api --err --lines 80
   ```
   Veja a mensagem de erro (ex.: `EADDRINUSE :::3000` = porta em uso). Libere a porta e reinicie:
   ```bash
   pm2 stop primecamp-api
   fuser -k 3000/tcp 2>/dev/null || true
   sleep 2
   cd /root/primecamp-ofc/server && pm2 start index.js --name primecamp-api
   curl -s http://localhost:3000/api/theme-config/ok
   ```
   Se o PM2 foi iniciado com `ecosystem.config.js`, use: `pm2 start ecosystem.config.js` (ou o comando que você usa) em vez de `pm2 start index.js --name primecamp-api`.

   **e) Conferir se a VPS está com o código novo:** na VPS rode:
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

## Se deu 404 ou erro de chown no path do frontend

O path do frontend é **`/var/www/ativafix`**. Criar a pasta se não existir e rodar só a parte do frontend:

```bash
sudo mkdir -p /var/www/ativafix
cd /root/primecamp-ofc && sudo rm -rf /var/www/ativafix/* && sudo cp -r dist/* /var/www/ativafix/ && sudo chown -R www-data:www-data /var/www/ativafix && sudo chmod -R 755 /var/www/ativafix && sudo systemctl reload nginx && echo "Frontend atualizado!"
```

Se o build já foi feito antes, isso já resolve. Se não, rode o deploy completo (comando de uma linha no topo) com atenção ao path.

## PM2 em erro / API caindo (status "errored", muitos restarts)

Se `pm2 list` mostra **primecamp-api** com status **errored** e muitas reinicializações:

1. **Ver o erro que está derrubando a API:**
   ```bash
   pm2 logs primecamp-api --err --lines 100
   ```
   Ou: `cat /root/.pm2/logs/primecamp-api-error.log | tail -150`

2. **Causas comuns:**
   - **Tabelas do Painel de Alertas não existem:** rode a migração no banco que a API usa:
     ```bash
   cd /root/primecamp-ofc
   PGPASSWORD='SUA_SENHA' psql -h localhost -U postgres -d banco_gestao -f db/migrations/manual/PAINEL_ALERTAS_TABELAS.sql
   ```
     (troque `SUA_SENHA`, usuário e banco conforme o `.env` do `server`). Depois: `pm2 restart primecamp-api`.
   - **Variáveis de ambiente (.env):** confira se na pasta do projeto (ou em `server/`) existe `.env` com `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`. O PM2 pode estar rodando com outro diretório de trabalho; use `pm2 show primecamp-api` e veja "exec cwd".

3. **Depois do deploy com código novo:** o Painel de Alertas passou a carregar de forma defensiva. Se o módulo falhar (ex.: tabelas inexistentes), a API sobe mesmo assim e `/api/alerts/*` retorna 503 com mensagem para rodar a migração. Assim o servidor para de cair; basta rodar a SQL e reiniciar.
