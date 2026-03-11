# Configurar acesso por ativafix.com na VPS

Você apontou o domínio **ativafix.com** e **api.ativafix.com** para o IP da VPS (72.62.106.76). Para o site e a API funcionarem por esse domínio, faça o seguinte **na VPS**.

---

## Configuração corrigida (HTTP + HTTPS frontend)

No Nginx **não pode ter `location` dentro de `location`**. O bloco `location = /index.html` tem de ser irmão de `location /`, não filho. Abaixo está o config correto para colar no seu arquivo (substitua os blocos HTTP e HTTPS do frontend).

**HTTP → HTTPS (inclui ativafix.com):**

```nginx
# =========================
# HTTP → HTTPS
# =========================
server {
    if ($host = www.ativafix.com) {
        return 301 https://$host$request_uri;
    }
    if ($host = ativafix.com) {
        return 301 https://$host$request_uri;
    }
    if ($host = www.primecamp.cloud) {
        return 301 https://$host$request_uri;
    }
    if ($host = primecamp.cloud) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    listen [::]:80;
    server_name primecamp.cloud www.primecamp.cloud ativafix.com www.ativafix.com;
    return 301 https://$host$request_uri;
}
```

**HTTPS (frontend) – `location` e `location = /index.html` no mesmo nível:**

```nginx
# =========================
# HTTPS (frontend)
# =========================
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name primecamp.cloud www.primecamp.cloud ativafix.com www.ativafix.com;

    root /var/www/primecamp.cloud;
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

    ssl_certificate /etc/letsencrypt/live/primecamp.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/primecamp.cloud/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}
```

**Importante:** Com esse config, o certificado SSL é só de **primecamp.cloud**. Ao acessar **https://ativafix.com** o navegador pode acusar “certificado inválido” (nome diferente). Para HTTPS correto em ativafix.com, é preciso emitir certificado também para ativafix.com (veja seção SSL mais abaixo). O HTTP em ativafix.com já redireciona para HTTPS.

Depois de editar:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 1. Nginx: servir o frontend em ativafix.com e www.ativafix.com

No mesmo servidor que já atende primecamp.cloud, adicione os novos nomes ao bloco do frontend **ou** crie um bloco específico para ativafix.com.

### Opção A – Adicionar ao config existente (recomendado)

Se o frontend já está em `/etc/nginx/sites-available/primecamp.cloud`, edite o bloco que tem `server_name primecamp.cloud` e inclua ativafix.com:

```bash
sudo nano /etc/nginx/sites-available/primecamp.cloud
```

No bloco **HTTPS** do frontend (o que tem `root /var/www/primecamp.cloud`), altere a linha `server_name` para:

```nginx
server_name primecamp.cloud www.primecamp.cloud ativafix.com www.ativafix.com;
```

Salve, teste e recarregue:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Assim, **ativafix.com** e **www.ativafix.com** passam a servir os mesmos arquivos do frontend (mesma pasta do primecamp.cloud).

---

### Opção B – Arquivo só para ativafix.com (recomendado se quiser manter separado)

Use **um único arquivo** com frontend + API. Na VPS:

```bash
sudo nano /etc/nginx/sites-available/ativafix.com
```

**Cole o conteúdo abaixo inteiro** (depois você gera o SSL com certbot; se o certbot já tiver criado o arquivo, ele pode ter inserido os caminhos do SSL – nesse caso confira se estão iguais aos abaixo).

```nginx
# =========================
# ativafix.com – HTTP → HTTPS (frontend + API)
# =========================
server {
    listen 80;
    listen [::]:80;
    server_name ativafix.com www.ativafix.com api.ativafix.com;
    return 301 https://$host$request_uri;
}

# =========================
# ativafix.com – Frontend (HTTPS)
# =========================
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ativafix.com www.ativafix.com;

    root /var/www/primecamp.cloud;
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
# api.ativafix.com – API (HTTPS)
# =========================
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.ativafix.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }

    ssl_certificate /etc/letsencrypt/live/ativafix.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ativafix.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}
```

**Ordem dos passos:**

1. **Criar os certificados SSL antes** (o config acima usa esses caminhos; sem eles o `nginx -t` falha):
   ```bash
   sudo systemctl stop nginx
   sudo certbot certonly --standalone -d ativafix.com -d www.ativafix.com -d api.ativafix.com
   sudo systemctl start nginx
   ```
   (Certbot pede e-mail e aceite dos termos.)

2. **Salvar o arquivo** em nano (Ctrl+O, Enter, Ctrl+X).

3. **Ativar o site e testar:**
   ```bash
   sudo ln -sf /etc/nginx/sites-available/ativafix.com /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

4. **Testar no navegador:**  
   https://ativafix.com e https://api.ativafix.com/api/health

**Importante:** O `root` **tem que ser** `/var/www/primecamp.cloud` (não `/var/www/ativafix.com`). Não existe pasta separada para ativafix; o mesmo deploy serve os dois domínios. Se no servidor estiver `root /var/www/ativafix.com;`, o site dá 404. Corrija para `root /var/www/primecamp.cloud;`, depois `sudo nginx -t && sudo systemctl reload nginx`.

---

## 2. Nginx: API em api.ativafix.com (se não usar o arquivo único acima)

No mesmo arquivo onde está o bloco da **api.primecamp.cloud** (ex.: `primecamp.cloud` ou `ativafix.com`), adicione um bloco para **api.ativafix.com** fazendo proxy para o mesmo backend (porta 3000):

```nginx
# API ativafix.com (HTTPS)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.ativafix.com;

    ssl_certificate /etc/letsencrypt/live/ativafix.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ativafix.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirecionar HTTP -> HTTPS (API)
server {
    listen 80;
    listen [::]:80;
    server_name api.ativafix.com;
    return 301 https://$server_name$request_uri;
}
```

Ou, se quiser **reaproveitar o mesmo bloco** da api.primecamp.cloud, basta colocar os dois nomes no `server_name`:

```nginx
server_name api.primecamp.cloud api.ativafix.com;
```

(Os certificados SSL precisam cobrir ambos os nomes ou você usa um cert para cada.)

---

## 3. SSL com Let’s Encrypt (HTTPS)

Para ter **https://ativafix.com** e **https://api.ativafix.com**:

```bash
# Instalar certbot se ainda não tiver
sudo apt update && sudo apt install -y certbot python3-certbot-nginx

# Gerar certificado para ativafix.com e www.ativafix.com
sudo certbot --nginx -d ativafix.com -d www.ativafix.com

# Gerar certificado para api.ativafix.com (pode ser no mesmo comando ou separado)
sudo certbot --nginx -d api.ativafix.com
```

O certbot ajusta o Nginx para usar os certificados. Depois:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 4. Resumo do que já foi feito no código

- **Frontend:** ao abrir o site em **ativafix.com** ou **www.ativafix.com**, a aplicação usa automaticamente **https://api.ativafix.com/api** (arquivo `src/utils/apiUrl.ts`).
- **Backend:** a API aceita requisições com origem **ativafix.com** e **www.ativafix.com** (CORS no `server/index.js`).
- **Deploy:** o mesmo build e a mesma pasta (`/var/www/primecamp.cloud`) servem **primecamp.cloud** e **ativafix.com**; não é necessário build ou pasta separados.
- **Logo, nome e cores no ativafix.com:** em **ativafix.com** e **www.ativafix.com**, o logo, o nome "Ativa Fix" e as cores padrão (dourado HSL 44 100% 53%) vêm do **domínio**. O tema (cores, nome, logo) é **persistido na VPS** (API `GET/POST /api/theme-config`, tabela `kv_store_2c4defad`), não no localStorage: ao salvar nas configurações do sistema, reflete para todos os dispositivos e navegadores que acessam esse domínio.

---

## 5. Checklist rápido

1. DNS: **ativafix.com**, **www.ativafix.com** e **api.ativafix.com** apontando para o IP da VPS.
2. Nginx: `server_name` do frontend incluindo ativafix.com e www.ativafix.com (ou bloco separado).
3. Nginx: bloco para **api.ativafix.com** com `proxy_pass http://localhost:3000`.
4. Certificados SSL para ativafix.com, www.ativafix.com e api.ativafix.com (certbot).
5. `sudo nginx -t && sudo systemctl reload nginx`.
6. Testar: **https://ativafix.com** e **https://api.ativafix.com/api/health**.

Se algo não abrir ou der erro de certificado/CORS, confira os blocos do Nginx e os logs: `sudo tail -50 /var/log/nginx/error.log`.
