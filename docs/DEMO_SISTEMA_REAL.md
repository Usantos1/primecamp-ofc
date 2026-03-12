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

**Opção B – Direto no banco (SQL)**

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

No servidor (arquivo `.env` da API), defina:

```env
DEMO_EMAIL=demo@ativafix.com
DEMO_PASSWORD=SuaSenhaDemoAqui
```

Ou, se preferir:

```env
DEMO_USER_EMAIL=demo@ativafix.com
DEMO_USER_PASSWORD=SuaSenhaDemoAqui
```

Reinicie a API após alterar o `.env`.

### 3. Dados de exemplo (opcional)

Para a demo ficar rica (OS, vendas, gráficos etc.), popule a **empresa demo** com dados reais: clientes, produtos, ordens de serviço, vendas PDV, movimentações de caixa. Pode fazer isso usando o próprio sistema logado como esse usuário demo.

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

## Resumo

| Onde        | O quê |
|------------|--------|
| Landing    | Botão "Experimentar o sistema" → abre `APP_URL/demo` em nova aba. |
| App        | Rota `/demo` → página com botão "Entrar na demonstração". |
| API        | `POST /api/auth/demo` → login com usuário definido em `DEMO_EMAIL`/`DEMO_PASSWORD`. |
| Após login | Uso normal do sistema + banner "Você está na demonstração". |

Assim, a demo passa a ser o **sistema real**, sem réplica mockada.
