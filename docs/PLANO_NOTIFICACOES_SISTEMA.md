# Plano de Implementação: Sistema de Notificações (Ativa FIX + Ativa CRM)

**Objetivo:** Permitir configurar um número de celular (WhatsApp) que recebe notificações automáticas do sistema, com integração máxima entre Ativa FIX e Ativa CRM.

**Posição no menu:** Abaixo de "Financeiro" na navegação (novo item **Notificações**).

---

## 1. Escopo e princípios

- **Multi-tenant:** Cada empresa (Ativa FIX, Ativa CRM, Prime Camp, etc.) tem sua própria configuração de notificações e número de destino.
- **Canal:** WhatsApp (reaproveitar integração existente em Integrações → WhatsApp; envio via `POST /api/whatsapp/send`).
- **Configuração central:** Uma tela "Notificações" onde o admin define o celular que recebe as notificações e marca quais eventos deseja receber.
- **Integração Ativa FIX ↔ Ativa CRM:** O mesmo sistema serve ambos; eventos de OS, devolução, caixa, contas e vendas disparam notificações para o número configurado por empresa. Futuramente pode-se permitir notificações cruzadas (ex.: evento no FIX notificar um número do CRM) se fizer sentido.

---

## 2. Eventos notificáveis (lista proposta)

| # | Evento | Descrição | Quando disparar |
|---|--------|-----------|-----------------|
| 1 | **OS aberta** | Nova ordem de serviço criada | Ao salvar/criar OS (status inicial). |
| 2 | **OS finalizada/entregue** | OS concluída ou entregue ao cliente | Ao mudar status para finalizada/entregue_faturada. |
| 3 | **Devolução** | Devolução de venda registrada | Ao registrar uma devolução (refund). |
| 4 | **Caixa fechado** | Fechamento de caixa (sangria/fechamento de sessão) | Ao fechar a sessão de caixa. |
| 5 | **Lembrete contas a pagar** | Contas a vencer ou vencidas | Agendado (ex.: todo dia às 08:00), listando contas a pagar do dia/semana. |
| 6 | **Lembrete contas a receber** | Contas a receber em aberto / vencendo | Agendado (ex.: todo dia às 08:00 ou 18:00), resumo por vencimento. |
| 7 | **Relatório de vendas diário** | Resumo de vendas do dia | Agendado no horário configurado (ex.: 19:00). |
| 8 | **Nova venda (PDV)** | Venda finalizada no PDV | Imediato ao finalizar venda (opcional; pode ser ruidoso). |
| 9 | **Pagamento recebido** | Pagamento confirmado em conta a receber | Ao confirmar pagamento em contas a receber (opcional). |

**Sugestão inicial de ativação:** 1–7 como padrão; 8 e 9 como opções “ligar se quiser”.

---

## 3. Modelo de dados

### 3.1 Opção A: Tabela dedicada `notification_settings` (recomendada)

- **Escopo por empresa:** `company_id` em toda configuração.
- Campos sugeridos:
  - `id`, `company_id`, `phone_whatsapp` (número que recebe, ex.: 5511999999999)
  - `os_aberta`, `os_finalizada`, `devolucao`, `caixa_fechado`, `lembrete_contas_pagar`, `lembrete_contas_receber`, `relatorio_vendas_diario`, `nova_venda_pdv`, `pagamento_recebido` (boolean, ativa/desativa cada evento)
  - `relatorio_vendas_horario` (time, ex.: 19:00 para relatório diário)
  - `lembrete_contas_dias_antes` (número de dias antes do vencimento para lembrete de contas a pagar/receber)
  - `created_at`, `updated_at`

### 3.2 Opção B: Usar `kv_store` (chave por empresa)

- Chave: `notification_settings_${company_id}`.
- Valor: JSON com os mesmos campos acima.
- **Prós:** Sem migração de tabela; alinhado a outras configs (cupom, integrações).  
- **Contras:** Agendamentos (cron) precisam iterar empresas e ler do kv_store.

**Recomendação:** Opção B (kv_store) para MVP; migrar para tabela depois se precisar de relatórios ou filtros por configuração.

---

## 4. Backend (API)

1. **Endpoints (autenticados, filtrados por `company_id`):**
   - `GET /api/notification-settings` — retorna configuração da empresa (ou padrão).
   - `PUT /api/notification-settings` — salva configuração (phone + quais eventos + horário do relatório + dias antes para lembretes).

2. **Envio de mensagens:**
   - Reaproveitar `POST /api/whatsapp/send` (já usa `integration_settings_${companyId}` para credenciais).
   - Serviço interno (ou helper) que:
     - Lê `notification_settings_${companyId}` (ou tabela).
     - Verifica se o evento está ativo e se há número configurado.
     - Monta o texto da mensagem e chama o envio WhatsApp (com `company_id` no contexto para usar a API key da empresa).

3. **Disparo por evento (em tempo real):**
   - **OS aberta / OS finalizada:** No código que cria/atualiza a OS (ex.: após insert/update em `ordens_servico`), chamar função `notifyEvent('os_aberta' | 'os_finalizada', companyId, payload)`.
   - **Devolução:** No fluxo de criação de refund, chamar `notifyEvent('devolucao', companyId, payload)`.
   - **Caixa fechado:** No fluxo de fechamento de sessão de caixa, chamar `notifyEvent('caixa_fechado', companyId, payload)`.
   - **Nova venda PDV / Pagamento recebido:** Idem, nos pontos corretos do código.

4. **Disparo agendado (cron/job):**
   - Job diário (ex.: Node-cron ou job na VPS):
     - **Lembrete contas a pagar:** Para cada empresa com `lembrete_contas_pagar` ativo, buscar contas a vencer (hoje + N dias), montar mensagem e enviar no horário configurado (ex.: 08:00).
     - **Lembrete contas a receber:** Idem para contas a receber.
     - **Relatório de vendas diário:** Para cada empresa com `relatorio_vendas_diario` ativo, gerar resumo do dia (vendas, totais) e enviar no horário configurado (ex.: 19:00).

5. **Isolamento:** Sempre usar `company_id` ao ler config e ao enviar (para usar a API WhatsApp e o número corretos da empresa).

---

## 5. Frontend

1. **Menu:** Incluir item **Notificações** logo abaixo de **Financeiro** (sidebar e, se aplicável, dentro do bloco “Relatórios/Financeiro” ou como submenu).
2. **Rota sugerida:** `/admin/notificacoes` (ou `/admin/financeiro/notificacoes` se preferir dentro do módulo Financeiro).
3. **Tela de configuração:**
   - Campo: número de celular (WhatsApp) que receberá as notificações.
   - Checkboxes (ou toggles) para cada evento listado no §2.
   - Campo: horário do relatório de vendas diário (time picker).
   - Campo opcional: “Lembrar contas a pagar/receber com X dias de antecedência”.
   - Botão “Salvar” persiste via `PUT /api/notification-settings`.
   - Opcional: “Testar notificação” (envia uma mensagem de teste para o número informado).

4. **Permissão:** Usar permissão existente (ex.: `relatorios.financeiro` ou admin) ou criar `notificacoes.manage` — a definir.

---

## 6. Integração Ativa FIX ↔ Ativa CRM

- **Hoje:** Cada empresa (tenant) tem sua config e seu número; eventos do FIX (OS, caixa, devolução, vendas) disparam apenas para a empresa em que o evento ocorreu.
- **Futuro (opcional):** Se quiser “notificar o CRM quando algo acontecer no FIX” (ex.: OS aberta no FIX → notificar número do CRM):
  - Opção 1: Na config do FIX, permitir um “número secundário” (ex.: número do gestor no CRM).
  - Opção 2: Config “notificações cruzadas” (empresa A pode assinar eventos da empresa B), com cuidado para não vazar dados entre tenants.

Fica fora do escopo do MVP; pode ser Fase 2.

---

## 7. Fases sugeridas

| Fase | Entregas |
|------|----------|
| **Fase 1 – Config e estrutura** | Modelo (kv_store ou tabela), GET/PUT de configuração, tela “Notificações” no menu abaixo de Financeiro, número + toggles por evento + horário do relatório. |
| **Fase 2 – Eventos em tempo real** | OS aberta, OS finalizada, Devolução, Caixa fechado (e opcionalmente nova venda PDV e pagamento recebido) chamando o helper de notificação e enviando via WhatsApp. |
| **Fase 3 – Agendados** | Job diário: lembretes contas a pagar/receber + relatório de vendas no horário configurado. |
| **Fase 4 (opcional)** | Notificação de teste na tela; relatório de “últimas notificações enviadas”; integração cruzada FIX ↔ CRM. |

---

## 8. Resumo para aprovação

- **Onde aparece:** Item **Notificações** no menu, logo abaixo de **Financeiro**.
- **O que configura:** Número WhatsApp + quais eventos receber + horário do relatório diário de vendas + dias de antecedência para lembretes.
- **Eventos:** OS aberta, OS finalizada, Devolução, Caixa fechado, Lembrete contas a pagar, Lembrete contas a receber, Relatório de vendas diário e (opcional) Nova venda PDV e Pagamento recebido.
- **Canal:** WhatsApp (integração já existente).
- **Multi-tenant:** Tudo por `company_id`; cada empresa com sua config e seu número.
- **Integração Ativa FIX/CRM:** Mesmo sistema para ambos; notificações cruzadas como evolução futura.

**Aguardando sua aprovação para seguir com a implementação (começando pela Fase 1).**
