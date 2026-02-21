# Mesma OS com status diferente em localhost e na nuvem

## Causas possíveis

### 1. **Backends diferentes (API/banco diferente)**

O frontend usa a API conforme a variável `VITE_API_URL` (e a lógica em `src/integrations/db/client.ts`):

- Se **não** definir `VITE_API_URL` no `.env` do frontend, ou se definir com URL que **contém** `localhost` (ex.: `http://localhost:3000/api`), o app **ignora** e usa a API de produção: `https://api.primecamp.cloud/api`.
- Se definir `VITE_API_URL` com uma URL que **não** contém a palavra `localhost` (ex.: `http://127.0.0.1:3000/api`), o app usa **essa** API.

**Consequência:** no localhost, se o `.env` tiver por exemplo `VITE_API_URL=http://127.0.0.1:3000/api`, você está apontando para a API local (e o banco da sua máquina). A nuvem usa a API de produção (banco da nuvem). São **dois bancos**: a mesma OS #7000 pode existir nos dois com status diferentes.

**O que fazer:** para ver o **mesmo** dado nos dois ambientes, localhost e nuvem precisam usar a **mesma** API:

- Para ver dados de produção no localhost: **não** defina `VITE_API_URL` ou use algo com `localhost` (ex.: `http://localhost:3000/api`) para que o fallback de produção seja usado.
- Se quiser testar com API local, use `127.0.0.1` sabendo que o banco é outro.

### 2. **Cache do React Query (lista de OS)**

O formulário da OS carrega os dados da **lista em cache** (`ordens_servico`). Se a lista foi carregada antes de alguém mudar o status (em outra aba ou na nuvem), a tela pode mostrar o status antigo.

**O que foi feito no código:** ao abrir o formulário de uma OS, a lista é **refetchada** e, quando a lista atualiza, o `currentOS` é atualizado com o status (e dados) mais recentes. Assim, ao abrir a OS você tende a ver o mesmo status que está no servidor.

### 3. **Conferir qual API está em uso**

Na tela de teste de auth (se existir no app), ou no build, a URL da API costuma aparecer. Verifique se no localhost está a mesma base da nuvem quando você quer que os dados sejam iguais.

---

## Resumo

- **Mesma API e mesmo banco** → status deve bater; se não bater, recarregue a página ou abra de novo a OS (o refetch ao abrir a OS deve corrigir).
- **APIs diferentes** (ex.: localhost com `127.0.0.1` vs nuvem) → são ambientes diferentes; a mesma OS #7000 pode ter status diferente em cada um.
