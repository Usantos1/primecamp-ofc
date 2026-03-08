# Subdomínios e domínios customizados (multi-tenant)

Este documento descreve como oferecer **subdomínios por empresa** (ex.: `empresa1.primecamp.cloud`) e/ou **domínios próprios** (ex.: `sistema.minhaempresa.com.br`) apontando para o Primecamp.

Hoje o sistema já é multi-tenant: o **tenant é definido pelo usuário logado** (`company_id` vindo do banco após o login). O domínio não define a empresa. As opções abaixo permitem usar o domínio para **identificação visual, pré-login ou redirecionamento**, mantendo a segurança pelo `company_id` do usuário.

---

## 1. Subdomínios (ex.: `empresa1.primecamp.cloud`)

### Ideia
Cada empresa acessa por um subdomínio fixo: `acme.primecamp.cloud`, `loja2.primecamp.cloud`. O subdomínio pode ser usado para:
- **Branding**: a URL já “pertence” à empresa.
- **Pré-login**: identificar a empresa antes do login (para pré-preencher contexto ou mostrar logo).
- **Opcional**: forçar que, nesse host, só usuários daquela empresa façam login (validação extra).

### Infraestrutura

1. **DNS**
   - Criar um registro **wildcard** no domínio principal:
   - Tipo: **A** ou **CNAME**
   - Nome: `*` (ou `*.primecamp` se o provedor usar sufixo)
   - Valor: IP ou host do servidor onde sobe o app (ou do proxy).

   Exemplo (registro A):
   ```
   *.primecamp.cloud  →  IP_DO_SERVIDOR
   ```

2. **Proxy reverso (Nginx / Caddy)**
   - Receber todo `*.primecamp.cloud` no mesmo IP.
   - Encaminhar para o mesmo backend (Node/React); o backend lê o **Host** e decide o tenant.

   Exemplo Nginx:
   ```nginx
   server {
     server_name *.primecamp.cloud primecamp.cloud;
     location / {
       proxy_pass http://localhost:3000;  # ou porta do app
       proxy_set_header Host $host;
       proxy_set_header X-Forwarded-Host $host;
     }
   }
   ```

3. **Backend (Node)**
   - Em **todas as requisições** (ou só nas que precisam), ler `req.headers.host` (ex.: `acme.primecamp.cloud`).
   - Extrair o subdomínio: `acme`.
   - Consultar uma tabela **empresa por subdomínio** (ex.: `companies.subdomain` ou tabela de mapeamento) e obter o `company_id`.
   - **Não usar o domínio para autorização**: acesso a dados continua baseado no `company_id` do **usuário logado** (como hoje). O subdomínio serve só para contexto/branding ou para validar “este host é da empresa X”.

4. **Banco de dados**
   - Adicionar coluna em `companies` (ou tabela equivalente):
   - `subdomain VARCHAR(63) UNIQUE` (ex.: `acme`, `loja2`).
   - Regra: só letras minúsculas, números, hífen; único por empresa.

5. **Frontend (React)**
   - Se quiser pré-preencher empresa na tela de login ou mostrar logo:
   - Ler `window.location.hostname`, extrair subdomínio e chamar uma API tipo `GET /api/tenant-by-subdomain?subdomain=acme` que retorna `{ companyId, name, logoUrl }` (dados públicos).
   - Não enviar credenciais baseadas só no subdomínio; o login continua por usuário/senha e o backend continua definindo `company_id` pelo usuário.

### Resumo subdomínios
- **DNS**: wildcard `*.primecamp.cloud` → IP do servidor (ou do proxy).
- **Proxy**: repassar `Host` para o app.
- **App**: mapear `Host` → subdomínio → `company_id` (só para contexto/branding); autorização sempre pelo usuário logado.

---

## 2. Domínios customizados (ex.: `sistema.minhaempresa.com.br`)

### Ideia
A empresa usa o próprio domínio (ex.: `sistema.minhaempresa.com.br`) que aponta para o nosso sistema. O fluxo é o mesmo: domínio identifica a empresa (para branding/contexto), mas o **tenant efetivo** continua sendo o `company_id` do usuário após o login.

### Infraestrutura

1. **O que o cliente configura no DNS**
   - No painel do domínio (`minhaempresa.com.br`), criar:
   - Tipo: **CNAME**
   - Nome: `sistema` (ou o subdomínio que quiserem, ex.: `app`, `primecamp`).
   - Valor (alvo): o host do nosso sistema, ex.:
   - `app.primecamp.cloud` ou `primecamp.cloud`.
   - Assim, `sistema.minhaempresa.com.br` passa a resolver para o mesmo servidor que atende `app.primecamp.cloud`.

2. **Nosso servidor / proxy**
   - O proxy (Nginx/Caddy) deve aceitar esse host no mesmo server block (ou em um server block que também aponta para o mesmo backend).
   - Exemplo Caddy (aceita vários hosts):
   ```text
   app.primecamp.cloud, *.primecamp.cloud, sistema.minhaempresa.com.br {
     reverse_proxy localhost:3000
   }
   ```
   - Ou Nginx:
   ```nginx
   server_name app.primecamp.cloud *.primecamp.cloud sistema.minhaempresa.com.br;
   ```

3. **Banco de dados**
   - Tabela de mapeamento **domínio → empresa**:
   ```sql
   CREATE TABLE company_domains (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
     domain VARCHAR(253) NOT NULL UNIQUE,  -- ex: sistema.minhaempresa.com.br
     is_primary BOOLEAN DEFAULT false,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   CREATE UNIQUE INDEX idx_company_domains_domain ON company_domains(LOWER(domain));
   ```
   - Cadastro: o cliente nos informa o domínio; um admin cadastra em `company_domains` (ou futura tela “Domínio customizado” no painel).

4. **Backend (Node)**
   - Ler `req.headers.host` (ex.: `sistema.minhaempresa.com.br`).
   - Normalizar: lower case, sem porta.
   - Consultar `company_domains` por `domain = host` e obter `company_id`.
   - Usar esse `company_id` só para contexto/branding (e, se quiser, para validar que o usuário que logar pertence a essa empresa). Autorização de dados continua pelo `company_id` do usuário.

5. **SSL (HTTPS)**
   - O domínio do cliente precisa de certificado no **nosso** servidor.
   - **Opção A – Caddy**: Caddy obtém certificados Let’s Encrypt automaticamente para cada host (incluindo `sistema.minhaempresa.com.br`) desde que o DNS aponte para o nosso IP e a porta 80/443 esteja aberta.
   - **Opção B – Nginx + Certbot**: rodar `certbot` para cada novo domínio (manual ou script quando cadastrar em `company_domains`).
   - **Opção C – Proxy na nuvem (Cloudflare, etc.)**: o cliente pode colocar o CNAME no Cloudflare; o tráfego pode terminar em nós já em HTTPS (dependendo do desenho).

### Resumo domínios customizados
- **Cliente**: CNAME `sistema.minhaempresa.com.br` → `app.primecamp.cloud` (ou nosso host).
- **Nós**: proxy aceita esse host; backend mapeia host → `company_id` via `company_domains`; SSL para esse host (Caddy/Certbot).

---

## 3. Onde encaixar no código atual

- **Autenticação**: continua igual. O `company_id` vem do usuário no banco após o login (como em `server/index.js` e `companyMiddleware.js`). **Não** usar só o domínio para decidir acesso a dados.
- **Novo middleware opcional** (antes ou depois do auth):
  - Lê `req.headers.host`, extrai subdomínio (para `*.primecamp.cloud`) ou usa o host inteiro (para domínio customizado).
  - Consulta `companies.subdomain` ou `company_domains.domain` e preenche `req.tenantCompanyId` (ou similar).
  - Rotas que precisem (ex.: login, landing) podem usar `req.tenantCompanyId` para retornar nome da empresa, logo, etc.
- **Frontend**: na tela de login (ou landing), chamar algo como `GET /api/public/tenant?host=sistema.minhaempresa.com.br` que retorna `{ name, logoUrl }` para exibir branding. O login em si não muda.

---

## 4. Checklist rápido

| Item | Subdomínios | Domínios customizados |
|------|-------------|------------------------|
| DNS | Wildcard `*.primecamp.cloud` → nosso IP | Cliente: CNAME → nosso host |
| Proxy | Aceitar `*.primecamp.cloud`, repassar Host | Aceitar lista de hosts, repassar Host |
| Banco | `companies.subdomain` (único) | Tabela `company_domains(company_id, domain)` |
| Backend | Host → subdomínio → company_id | Host → company_domains → company_id |
| SSL | Um cert para *.primecamp.cloud | Cert por host (Caddy/Certbot) ou proxy na nuvem |
| Uso do tenant | Branding / pré-login / validação extra | Idem |

Se quiser, o próximo passo pode ser: (1) migration para `companies.subdomain` e `company_domains`, (2) middleware que preenche `req.tenantCompanyId` pelo Host e (3) um endpoint público `GET /api/public/tenant` para o frontend usar na tela de login.
