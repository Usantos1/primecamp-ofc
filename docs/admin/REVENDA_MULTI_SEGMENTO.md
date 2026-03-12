# Multi-Segmento em /admin/revenda

## Visão geral

A área **Gestão de Revenda** (`/admin/revenda`) passou a suportar **segmentos de negócio**: cada nicho (Oficina Mecânica, Comércio, Assistência Técnica, etc.) pode ter seus próprios **módulos** e **recursos**, permitindo empacotar o sistema por segmento sem quebrar o que já existe.

## Instalação do banco

Execute no PostgreSQL o script:

```
db/migrations/manual/REVENDA_MULTI_SEGMENTO.sql
```

**Em desenvolvimento (localhost):** para a tela de Segmentos carregar os dados, o frontend precisa apontar para o mesmo backend/banco onde o script foi executado. No `.env` na raiz do projeto, defina por exemplo:

```env
VITE_API_URL=http://localhost:3000
```

(Use a porta em que o servidor Node/Express sobe.) Sem isso, o app pode usar a API de produção, onde o script não foi rodado, e a lista de segmentos fica vazia.

Esse script:

- Cria as tabelas: `segmentos`, `modulos`, `recursos`, `segmentos_modulos`, `segmentos_recursos`
- Adiciona a coluna `segmento_id` em `companies` (opcional, nullable)
- Popula módulos (Dashboard, OS, Clientes, Veículos, PDV, Vendas, Caixa, Financeiro, Relatórios, etc.)
- Cria os segmentos iniciais: **Assistência Técnica**, **Oficina Mecânica**, **Comércio**
- Cria recursos por módulo e vincula **Oficina Mecânica** e **Comércio** aos seus módulos e recursos

## Interface em /admin/revenda

A tela de revenda está organizada em **5 abas**:

1. **Empresas** – Listagem e CRUD de empresas; em cada empresa é possível escolher um **Segmento de negócio**. A coluna "Segmento" aparece na tabela.
2. **Planos** – Acesso rápido ao gerenciador de planos (o fluxo completo segue na aba Empresas).
3. **Segmentos** – Listagem de segmentos em cards; ao clicar em um segmento abre o painel de edição com 4 sub-abas:
   - **Informações** – Nome, slug, descrição, ícone, cor, ativo
   - **Módulos** – Quais módulos o segmento possui e ordem no menu (toggle por módulo)
   - **Recursos** – Recursos liberados por módulo (visualização; a liberação segue os módulos ativos)
   - **Prévia do menu** – Como o menu do sistema aparecerá para empresas desse segmento
4. **Módulos** – Cadastro global de módulos do sistema (listagem em tabela).
5. **Recursos** – Cadastro global de recursos por módulo (listagem em tabela).

## Menu lateral por segmento

- Se a **empresa** do usuário tiver `segmento_id` preenchido, o **menu lateral** (sidebar) é montado a partir dos **módulos** configurados para esse segmento (ordem e itens).
- O endpoint `GET /api/me/segment-menu` (autenticado) retorna o menu da empresa do usuário. O `AppSidebar` usa esse retorno quando há itens, substituindo as seções fixas (Operação, Estoque, Relatórios, Gestão) pelo menu do segmento.
- Empresas sem segmento continuam com o menu padrão (comportamento anterior).

## Permissões

- A lógica de **permissões por role** (roles, role_permissions, user_permissions) permanece.
- A base está pronta para, no futuro, restringir acesso por **segmento + recursos**: só considerar permissões cujo recurso esteja no segmento da empresa. Hoje o menu já respeita o segmento; a checagem fina por recurso pode ser adicionada depois.

## API (revenda)

Todos sob `GET/POST/PUT/DELETE` com autenticação JWT e `requireAdminCompany`:

- `GET/POST /segmentos`, `GET/PUT /segmentos/:id`
- `GET /segmentos/:id/modulos`, `PUT /segmentos/:id/modulos` (body: `{ modulos: [{ modulo_id, ativo, ordem_menu }] }`)
- `GET /segmentos/:id/recursos`, `PUT /segmentos/:id/recursos` (body: `{ recurso_ids: [] }`)
- `GET /segmentos/:id/menu-preview`
- `GET/POST /modulos`, `GET/PUT /modulos/:id`
- `GET/POST /recursos`, `GET/PUT /recursos/:id` (query opcional: `?modulo_id=...`)

## Empresas (CRUD)

- Na **criação** e **edição** de empresa é possível escolher **Segmento de negócio** (opcional).
- O campo `segmento_id` é enviado na API e armazenado em `companies`. A listagem de empresas pode exibir o nome do segmento (via join ou campo calculado, conforme implementado no backend).

## Escalabilidade

- Novos segmentos (ex.: Agência, Clínica, Pet Shop) podem ser criados pela aba **Segmentos** e associados a módulos e recursos existentes.
- Novos módulos e recursos podem ser cadastrados nas abas **Módulos** e **Recursos** e depois vinculados aos segmentos desejados.

## Arquivos principais

| O que | Onde |
|-------|------|
| Migration (tabelas + seeds) | `db/migrations/manual/REVENDA_MULTI_SEGMENTO.sql` |
| API segmentos/módulos/recursos | `server/routes/reseller.js` (bloco multi-segmento) |
| Endpoint menu da empresa | `server/index.js` – `GET /api/me/segment-menu` |
| Hook e tipos | `src/hooks/useSegments.ts` |
| Página Revenda (abas + Segmentos/Módulos/Recursos) | `src/pages/admin/AdminReseller.tsx` |
| Menu lateral por segmento | `src/components/AppSidebar.tsx` (uso de `segment-menu` e `hasSegmentMenu`) |
| Company com segmento_id | `src/hooks/useReseller.ts` (interface Company) |
