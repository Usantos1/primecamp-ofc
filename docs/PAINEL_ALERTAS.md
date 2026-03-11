# Painel de Alertas

Módulo de notificações automáticas por empresa, com integração WhatsApp via Ativa CRM. Cada empresa configura quais alertas receber, números de destino, janela de horário e templates de mensagem.

## Estrutura

- **Menu:** Painel de Alertas (abaixo de Financeiro, mesma permissão `relatorios.financeiro`).
- **Rota frontend:** `/painel-alertas`.
- **API:** `/api/alerts/*` (autenticada, filtrada por `company_id`).

## Banco de dados

Executar a migração antes de usar:

```bash
# No diretório do projeto (ou ajuste o caminho do arquivo)
psql -h HOST -U USER -d DB -f db/migrations/manual/PAINEL_ALERTAS_TABELAS.sql
```

Ou no pgAdmin: abra e execute o conteúdo de `db/migrations/manual/PAINEL_ALERTAS_TABELAS.sql`.

Tabelas criadas:

- `alert_panel_config` — configuração geral do painel por empresa (ativo, número principal, horários, timezone, relatórios).
- `alert_catalog` — catálogo fixo de tipos de alerta (código, categoria, nome, variáveis, template padrão).
- `alert_config` — configuração por empresa por alerta (ativo, template, destinatários).
- `alert_logs` — histórico de envios (destino, status, mensagem, erro).

## Backend

- **Serviço:** `server/services/alertService.js`
  - `getPanelConfig`, `savePanelConfig` — painel geral.
  - `getAlertCatalog`, `getAlertConfigs`, `saveAlertConfig` — catálogo e configs por alerta.
  - `getLogs`, `getLogsCount`, `logAlert` — logs.
  - `renderTemplate(template, payload)` — substitui variáveis no texto.
  - `dispatch({ companyId, codigoAlerta, payload, sendMessage, db })` — valida e envia alerta (painel ativo, alerta ativo, janela horária, números).
  - `createWhatsAppSender(pool, companyId)` — retorna função `(number, body) => Promise<{ok, error}>` para envio via Ativa CRM.

- **Rotas:** `server/routes/alerts.js`
  - `GET /api/alerts/panel` — configuração geral.
  - `PUT /api/alerts/panel` — salvar configuração geral.
  - `GET /api/alerts/catalog` — catálogo de alertas.
  - `GET /api/alerts/configs` — configs por alerta da empresa.
  - `PUT /api/alerts/configs` — salvar em lote.
  - `PUT /api/alerts/configs/:codigo` — salvar um alerta.
  - `GET /api/alerts/logs` — histórico (query: periodo_inicio, periodo_fim, categoria, status, limit, offset).
  - `POST /api/alerts/test` — enviar mensagem de teste para o número principal.
  - `POST /api/alerts/preview` — pré-visualizar template com payload.
  - `POST /api/alerts/fire` — disparar um alerta (body: `{ codigo_alerta, payload }`). Usado após criar OS, fechar caixa, etc.

## Disparar alerta a partir do frontend

Após criar uma OS (ou outro evento), chame:

```ts
const res = await fetch(`${getApiUrl()}/alerts/fire`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.token}`,
  },
  body: JSON.stringify({
    codigo_alerta: 'os.criada',
    payload: {
      numero_os: '123',
      cliente: 'Nome do Cliente',
      marca: 'Samsung',
      modelo: 'Galaxy',
      usuario: 'Operador',
      link_os: 'https://...',
      empresa: 'Minha Empresa',
    },
  }),
});
```

O backend valida: painel ativo, alerta ativo, janela de horário, números configurados; monta a mensagem pelo template e envia via WhatsApp (Ativa CRM). O envio e possíveis erros ficam registrados em `alert_logs`.

## Códigos de alerta (catálogo)

- **Operacional:** `os.criada`, `os.status_alterado`, `os.finalizada`, `os.entregue`, `os.cancelada`, `os.orcamento_aprovado`, `os.orcamento_recusado`, `devolucao.criada`
- **Financeiro:** `caixa.fechado`, `caixa.sangria`, `caixa.suprimento`, `financeiro.despesa_lancada`, `financeiro.conta_pagar_vencendo`, `financeiro.conta_pagar_atrasada`, `financeiro.conta_receber_vencendo`, `financeiro.conta_receber_atrasada`, `financeiro.pagamento_realizado`, `financeiro.recebimento_confirmado`
- **Comercial:** `venda.concluida`, `venda.meta_dia_atingida`, `venda.meta_mes_atingida`, `venda.resumo_diario`, `venda.resumo_semanal`, `venda.ticket_medio_dia`, `venda.quantidade_dia`
- **Gestão:** `gestao.desconto_acima_limite`, `gestao.registro_excluido`, `gestao.valor_alterado_manual`, `gestao.caixa_aberto_apos_horario`, `gestao.os_parada`, `gestao.retirada_pendente`, `gestao.baixa_movimentacao`

## Variáveis nos templates

Exemplos: `{cliente}`, `{numero_os}`, `{status}`, `{marca}`, `{modelo}`, `{usuario}`, `{valor}`, `{descricao}`, `{data_vencimento}`, `{total_vendas}`, `{quantidade_vendas}`, `{ticket_medio}`, `{empresa}`, `{link_os}`, `{valor_abertura}`, `{valor_fechamento}`. Cada tipo de alerta tem suas variáveis em `variaveis_disponiveis` no catálogo.

## Multi-tenant

Todas as configurações e logs são por `company_id`. Uma empresa não vê nem altera dados de outra. As rotas `/api/alerts/*` exigem autenticação e usam `req.companyId` definido pelo middleware.
