# Nginx Ativa FIX – Passo a passo pelo terminal

Execute os comandos **na VPS** (SSH). Domínios: **ativafix.com** (LP/vendas), **app.ativafix.com** (sistema), **api.ativafix.com** (API).

---

## 1. Conferir se o Nginx está instalado

```bash
nginx -v
```

Se não estiver: `sudo apt update && sudo apt install -y nginx`

---

## 2. Criar pastas: app (sistema) e LP (página de vendas)

```bash
# App = build do frontend (React) – servido em app.ativafix.com
sudo mkdir -p /var/www/ativafix
sudo chown -R www-data:www-data /var/www/ativafix
sudo chmod -R 755 /var/www/ativafix

# LP = página de vendas (landing) – servida em ativafix.com e www.ativafix.com
sudo mkdir -p /var/www/ativafix-lp
sudo chown -R www-data:www-data /var/www/ativafix-lp
sudo chmod -R 755 /var/www/ativafix-lp
```

*(Se você já usa `/var/www/primecamp.cloud` para o app, use esse path no bloco **app.ativafix.com** do Nginx e mantenha `/var/www/ativafix-lp` só para a LP.)*

---

## 3. Parar o Nginx para o Certbot (só na primeira vez)

```bash
sudo systemctl stop nginx
```

---

## 4. Gerar certificado SSL (Let’s Encrypt)

**Primeira vez** (ainda não tem certificado para esses domínios):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot certonly --standalone -d ativafix.com -d www.ativafix.com -d app.ativafix.com -d api.ativafix.com --agree-tos -m SEU_EMAIL@dominio.com --non-interactive
```

**Se já existe certificado** (ex.: só ativafix.com, www, api) e você quer **incluir app.ativafix.com**, use `--expand`:

```bash
sudo systemctl stop nginx
sudo certbot certonly --standalone --expand -d ativafix.com -d www.ativafix.com -d app.ativafix.com -d api.ativafix.com --agree-tos -m SEU_EMAIL@dominio.com --non-interactive
sudo systemctl start nginx
```

*(Troque `SEU_EMAIL@dominio.com` pelo seu e-mail.)*

---

## 5. Subir o Nginx de novo

```bash
sudo systemctl start nginx
```

---

## 6. Criar o arquivo de configuração do Nginx

```bash
sudo nano /etc/nginx/sites-available/ativafix
```

**Apague tudo** que estiver no arquivo e **cole o bloco abaixo inteiro**. Depois ajuste:

- **ativafix.com:** `root` deve ser a pasta da **LP** (página de vendas), ex.: `/var/www/ativafix-lp`.
- **app.ativafix.com:** `root` deve ser a pasta do **build do app** (React), ex.: `/var/www/ativafix` ou `/var/www/primecamp.cloud`.
- **ssl_certificate / ssl_certificate_key:** se o Certbot tiver gerado em outro caminho, use `ls /etc/letsencrypt/live/` e ajuste.

```nginx
# =========================
# HTTP → HTTPS (todos os hostnames)
# =========================
server {
    listen 80;
    listen [::]:80;
    server_name ativafix.com www.ativafix.com app.ativafix.com api.ativafix.com;
    return 301 https://$host$request_uri;
}

# =========================
# ativafix.com – LP / página de vendas (HTTPS) – NÃO é o app
# =========================
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ativafix.com www.ativafix.com;

    root /var/www/ativafix-lp;
    index index.html;

    location / {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
        try_files $uri $uri/ /index.html;
    }

    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
        add_header X-Content-Type-Options "nosniff";
    }

    ssl_certificate /etc/letsencrypt/live/ativafix.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ativafix.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# =========================
# app.ativafix.com – Sistema (login, dashboard, OS, etc.) (HTTPS)
# =========================
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name app.ativafix.com;

    root /var/www/ativafix;
    index index.html;

    location / {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
        try_files $uri $uri/ /index.html;
    }

    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
        add_header X-Content-Type-Options "nosniff";
    }

    ssl_certificate /etc/letsencrypt/live/ativafix.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ativafix.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# =========================
# api.ativafix.com – API Node (HTTPS)
# =========================
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.ativafix.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;
    }

    ssl_certificate /etc/letsencrypt/live/ativafix.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ativafix.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}
```

Salvar no nano: **Ctrl+O**, Enter, **Ctrl+X**.

---

## 7. Se o Certbot criou arquivo em outro caminho

Listar certificados:

```bash
sudo ls /etc/letsencrypt/live/
```

Se aparecer algo como `ativafix.com` (e não outro nome), o config acima está certo. Se o nome for outro (ex.: `app.ativafix.com`), no nano troque:

- `live/ativafix.com` → `live/NOME_QUE_APARECEU`

---

## 8. Ativar o site e testar a configuração

```bash
sudo ln -sf /etc/nginx/sites-available/ativafix /etc/nginx/sites-enabled/
sudo nginx -t
```

Se aparecer `syntax is ok` e `test is successful`, recarregar:

```bash
sudo systemctl reload nginx
```

---

## 9. (Opcional) Desativar o site antigo

Se você tinha um config só para `primecamp.cloud` ou outro arquivo que conflita com os mesmos `server_name`, desative:

```bash
sudo rm -f /etc/nginx/sites-enabled/primecamp.cloud
sudo nginx -t && sudo systemctl reload nginx
```

*(Só faça isso se tiver certeza; senão pule.)*

---

## 10. Conferir se está respondendo

```bash
curl -sI https://ativafix.com        | head -1
curl -sI https://app.ativafix.com    | head -1
curl -sI https://api.ativafix.com/api/health | head -1
```

Todos devem retornar `HTTP/2 200` (ou 301 no primeiro, se houver redirect). Para ver o corpo do health:

```bash
curl -s https://api.ativafix.com/api/health
```

---

## 11. Renovação automática do SSL (já costuma estar ativa)

```bash
sudo certbot renew --dry-run
```

Se passar, o cron do certbot já renova sozinho.

---

## Resumo dos domínios

| Domínio           | Uso                          | root / proxy                  |
|-------------------|------------------------------|-------------------------------|
| ativafix.com      | LP / página de vendas        | `root /var/www/ativafix-lp`   |
| app.ativafix.com  | Sistema (login, dashboard…)  | `root /var/www/ativafix`      |
| api.ativafix.com  | API (Node na porta 3000)    | `proxy_pass :3000`            |

- **ativafix.com** = conteúdo da pasta `landing/` do repositório (página de vendas).
- **app.ativafix.com** = build do frontend React (deploy do app). Se você usa `/var/www/primecamp.cloud` para o app, troque o `root` do bloco app.ativafix.com para esse path.

---

## Deploy da LP (página de vendas) em ativafix.com

Na VPS, a partir da pasta do projeto (ex.: `/root/primecamp-ofc`):

```bash
sudo mkdir -p /var/www/ativafix-lp
sudo cp -r landing/* /var/www/ativafix-lp/
sudo chown -R www-data:www-data /var/www/ativafix-lp
sudo chmod -R 755 /var/www/ativafix-lp
```

Depois de editar os arquivos em `landing/` no repositório, faça `git pull` e rode os comandos acima de novo para atualizar a LP.
