# Demonstração com o sistema real

O botão **"Experimentar o sistema"** na landing leva o visitante ao **sistema real** do Ativa FIX, em modo demonstração. Ele usa um usuário de demonstração configurado no servidor — mesma interface, mesmas funcionalidades e dados da empresa demo.

## O que o visitante vê

- **Dashboard** com indicadores reais (Receita, Vendas PDV/OS, Ticket, Estoque, Caixa, OS por status e gráficos).
- **Ordens de serviço** reais (lista, abrir, editar).
- **PDV** real (vendas, produtos, caixa).
- **Financeiro**, **Relatórios**, **Painel de Alertas** e demais módulos.
- Um **banner** no topo: *"Você está na demonstração. Os dados são de exemplo."*

Nada é “mockado”: é o mesmo código e a mesma API; apenas o usuário logado é o de demo (empresa com dados de exemplo).

## Configuração no servidor

### 1. Criar o usuário de demonstração

Você pode criar o usuário **pelo próprio sistema** (cadastro normal com um email tipo `demo@ativafix.com`) ou **direto no banco**.

**Opção A – Pelo sistema**

1. Acesse o app e crie uma empresa só para demo (ou use uma existente que será “empresa demo”).
2. Crie um usuário com email, por exemplo, `demo@ativafix.com` e senha forte (essa será a senha do demo).
3. Anote o **email** e a **senha** para o passo 2.

**Opção B – Script automático (recomendado)**

Na raiz do projeto (onde está o `.env` com `DEMO_EMAIL` e `DEMO_PASSWORD`):

```bash
node server/scripts/create-demo-user.js
```

O script lê o `.env`, **cria ou usa a empresa "Ativa FIX - Demonstração"** (isolada da sua empresa real), cria o usuário demo nela ou **move** o usuário demo existente para essa empresa. Assim o visitante da demo nunca vê dados da sua empresa.

**Opção C – Direto no banco (SQL)**

1. Gerar o hash da senha (Node, na pasta do servidor):

   ```bash
   node -e "const bcrypt=require('bcrypt'); console.log(bcrypt.hashSync('SuaSenhaDemoAqui', 10));"
   ```

2. No PostgreSQL, use o `company_id` da empresa que será a “empresa demo” (pode ser a primeira empresa, por exemplo) e insira o usuário e o perfil (substitua `HASH_AQUI` e `COMPANY_ID_AQUI`):

   ```sql
   INSERT INTO users (id, email, password_hash, email_verified, company_id, created_at)
   VALUES (
     gen_random_uuid(),
     'demo@ativafix.com',
     'HASH_AQUI',
     true,
     'COMPANY_ID_AQUI',
     NOW()
   )
   RETURNING id;
   ```

   Use o `id` retornado em:

   ```sql
   INSERT INTO profiles (id, user_id, display_name, role, approved, approved_at, created_at, updated_at)
   VALUES (
     gen_random_uuid(),
     'ID_DO_USUARIO_ACIMA',
     'Visitante Demo',
     'admin',
     true,
     NOW(),
     NOW(),
     NOW()
   );
   ```

### 2. Variáveis de ambiente da API

O `.env` deve ficar na **raiz do projeto** (pasta que contém a pasta `server/`), por exemplo `/root/primecamp-ofc/.env`. A API carrega com `dotenv.config({ path: join(__dirname, '..', '.env') })`.

No servidor (VPS), edite o `.env` da raiz do projeto e defina:

```env
DEMO_EMAIL=demo@ativafix.com
DEMO_PASSWORD=SuaSenhaDemoAqui
```

Ou, se preferir:

```env
DEMO_USER_EMAIL=demo@ativafix.com
DEMO_USER_PASSWORD=SuaSenhaDemoAqui
```

Depois **reinicie a API** para carregar as variáveis: `pm2 restart primecamp-api`.

**Conferir na VPS** se as variáveis existem (sem mostrar o valor):

```bash
cd /root/primecamp-ofc   # ou o caminho do seu projeto
grep -E '^DEMO_' .env
```

Deve aparecer pelo menos `DEMO_EMAIL=...` e `DEMO_PASSWORD=...`.

### 3. Dados de exemplo (obrigatório para a demo ter conteúdo)

Sem este passo, a demo fica **sem clientes, sem OS e sem vendas** — o dashboard e as listas aparecem vazios. Na **raiz do projeto** (após criar o usuário demo), rode:

```bash
node server/scripts/seed-demo-data.js
```

O script insere na empresa "Ativa FIX - Demonstração":
- **5 clientes** de teste  
- **60 ordens de serviço** (abertas, finalizadas, entregues etc.)  
- **75 vendas** de exemplo totalizando **~R$ 45.000** (para o dashboard mostrar receita e tendência)  

Pode rodar mais de uma vez; ele evita conflito de números. Para mais dados, use o próprio sistema logado como usuário demo.

**Imagem de referência do aparelho:** na conta demo, o upload de imagem de referência não está disponível; ao tentar enviar, será exibida a mensagem amigável de conta demonstração.

**Ordem na VPS (após deploy):**
1. `node server/scripts/create-demo-user.js` — cria usuário e empresa demo.
2. `node server/scripts/seed-demo-data.js` — popula clientes, OS e vendas de exemplo.

## Fluxo na landing

1. Visitante clica em **"Experimentar o sistema"** (hero ou seção “Veja o Ativa FIX funcionando”).
2. Abre **nova aba** em `https://app.ativafix.com/demo`.
3. Na página `/demo`, clica em **"Entrar na demonstração"**.
4. A API chama `POST /api/auth/demo`, que valida `DEMO_EMAIL`/`DEMO_PASSWORD` e retorna o token do usuário demo.
5. O front guarda o token e redireciona para `/` (dashboard).
6. O visitante usa o **sistema completo**; o banner informa que é demonstração.

## Segurança e limites

- A senha do demo **não** é enviada pelo navegador; fica só no servidor (env).
- O endpoint `/api/auth/demo` usa o mesmo rate limit das rotas de login.
- Recomenda-se que a **empresa demo** seja só para isso (e que os dados sejam apenas de exemplo).

## Problemas comuns

### Erro "Cannot POST /api/auth/demo"

Significa que a **API na VPS está rodando código antigo** (sem a rota `/api/auth/demo`). É preciso atualizar o backend e reiniciar:

1. Na VPS: `cd /root/primecamp-ofc` (ou o caminho do projeto).
2. Atualize o código: `git pull origin main`.
3. Reinicie a API: `cd server && npm install --production && pm2 restart primecamp-api`.

Ou rode o **deploy completo** (frontend + backend) conforme `docs/deploy/COMANDO_DEPLOY_VPS_UMA_LINHA.md`.

### Mensagem "Demonstração não configurada. Defina DEMO_EMAIL e DEMO_PASSWORD no servidor."

A API está em execução, mas não está vendo as variáveis. Faça o seguinte **na VPS**:

1. **Confirme que o `.env` está na raiz do projeto** (ao lado da pasta `server/`), não dentro de `server/`.
2. **Confirme que as linhas existem** no `.env`:
   ```bash
   cd /root/primecamp-ofc
   grep -E '^DEMO_EMAIL=|^DEMO_PASSWORD=' .env
   ```
   Se não aparecer nada, adicione:
   ```env
   DEMO_EMAIL=demo@ativafix.com
   DEMO_PASSWORD=demo
   ```
3. **Reinicie a API** para carregar o `.env` de novo:
   ```bash
   pm2 restart primecamp-api
   ```
4. Se usar outro nome de app no PM2, use: `pm2 list` e depois `pm2 restart NOME_DO_APP`.

### "Usuário de demonstração não encontrado no banco"

O `.env` está correto, mas não existe usuário com o email `DEMO_EMAIL` no banco. Crie o usuário demo **na VPS** (na raiz do projeto):

```bash
cd /root/primecamp-ofc
node server/scripts/create-demo-user.js
```

O script usa o `DEMO_EMAIL` e `DEMO_PASSWORD` do `.env` e vincula o usuário à primeira empresa. Depois disso, tente "Entrar na demonstração" de novo.

### Demo está vendo dados da minha empresa

O usuário demo deve estar **só na empresa "Ativa FIX - Demonstração"**. Se ele foi criado antes (vinculado à primeira empresa do banco), rode de novo o script — ele move o usuário para a empresa de demonstração:

```bash
cd /root/primecamp-ofc
git pull origin main
node server/scripts/create-demo-user.js
```

O visitante da demo passará a ver apenas dados da empresa "Ativa FIX - Demonstração" (vazia ou com dados de exemplo que você colocar nela).

## Resumo

| Onde        | O quê |
|------------|--------|
| Landing    | Botão "Experimentar o sistema" → abre `APP_URL/demo` em nova aba. |
| App        | Rota `/demo` → página com botão "Entrar na demonstração". |
| API        | `POST /api/auth/demo` → login com usuário definido em `DEMO_EMAIL`/`DEMO_PASSWORD`. |
| Após login | Uso normal do sistema + banner "Você está na demonstração". |

Assim, a demo passa a ser o **sistema real**, sem réplica mockada.
