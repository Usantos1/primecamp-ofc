# Auditoria: Página /integracoes – o que não é mais usado

## Resumo

Na página **Integrações** (`/integracoes`, `src/pages/Integration.tsx`) existem itens que **não são lidos pelo backend** ou cujo **backend não existe**. Abaixo: o que é usado, o que está obsoleto e sugestões.

---

## 1. O que **é usado**

| Item | Onde é usado |
|------|----------------|
| **Token Ativa CRM** (`ativaCrmToken`) | Backend `POST /api/whatsapp/send` lê de `kv_store_2c4defad` (chave `integration_settings` ou `integration_settings_<company_id>`) e usa para enviar mensagens via API Ativa CRM. |
| **Tab API Externa** (`ApiManager`) | Gestão de tokens de API (`useApiTokens`). Tokens usados para acesso à API. |
| **Tab Telegram** (Chat IDs Entrada/Processo/Saída) | `useTelegramConfig` é usado em `OrdemServicoForm.tsx` para enviar fotos das OS para os canais/grupos do Telegram. |
| **OpenAI / IA** (Provider, API Key, Modelo) | `AdminJobSurveysManager.tsx` lê de `kv_store_2c4defad` (chave `integration_settings`) para gerar descrições, slugs e perguntas de vagas. |
| **Teste de Integração WhatsApp** (botão Enviar Teste) | Chama `POST /api/whatsapp/send`; fluxo real de envio. |

---

## 2. O que **não é usado** (obsoleto ou morto)

### 2.1 Campos salvos mas nunca lidos pelo backend

- **`whatsappNotifications`**  
  Salvo na tela e no `kv_store`. O backend **não** consulta esse campo. O envio em `/api/whatsapp/send` não verifica se “notificações WhatsApp” estão habilitadas.

- **`defaultNotificationPhone`**  
  Salvo, mas **nenhum código** no servidor usa esse número (nem no envio manual, nem em nenhum cron/função).

- **`notificationEvents`**  
  Lista de eventos (Nova Tarefa Criada, Mudança de Status, etc.). Salva na config, mas **nenhum endpoint** no `server` lê essa lista. Ou seja, a escolha de “eventos que disparam notificações” não tem efeito hoje.

- **`webhookUrl`**  
  Faz parte do estado e é salvo no mesmo objeto de integração. Na UI, porém, a **URL exibida é fixa** (`https://primecamp.cloud/api/webhook`). Nada no código usa `settings.webhookUrl`. O fluxo real de webhooks é o **WebhookManager** (URLs do tipo `/api/webhook/leads/{key}`).

**Recomendações:**  
- Remover da UI (e do tipo/estado) os campos que não serão implementados em curto prazo, **ou** documentar como “reservado para uso futuro” e não persistir no mesmo objeto que o backend lê.  
- O card **“Configuração de Webhook”** com URL fixa pode ser removido ou substituído por um link/atalho para a tela onde ficam os webhooks reais (WebhookManager), para evitar confusão.

---

### 2.2 Lembrete NPS Diário – backend inexistente

- **Evento “Lembrete NPS Diário (08:00)”** na lista de eventos.  
- **Card “Teste de Lembrete NPS”** e botão **“Enviar Lembretes NPS Agora”**.

O front chama:

```ts
apiClient.invokeFunction('daily-nps-reminder')
```

No `server/index.js` **não existe** rota para `POST /api/functions/daily-nps-reminder`. Além disso, o módulo NPS foi removido (`server/migrations/DROP_MODULOS_REMOVIDOS.sql` dropa `nps_surveys` e `nps_responses`). Ou seja:

- O botão de teste sempre falhará (endpoint não existe).
- Não há cron nem função no backend que envie “lembrete NPS” às 08:00.

**Recomendação:**  
- Remover o evento **“Lembrete NPS Diário (08:00)”** da lista de eventos.  
- Remover o card **“Teste de Lembrete NPS”** e o botão **“Enviar Lembretes NPS Agora”**, até que exista um backend real para isso.

---

### 2.3 Demais eventos (tarefa, processo, calendário)

Os eventos **Nova Tarefa Criada**, **Mudança de Status da Tarefa**, **Tarefa Atribuída**, **Tarefa Concluída**, **Novo Processo Criado**, **Evento de Calendário** são apenas selecionáveis e salvos em `notificationEvents`. Nenhum código no repositório (front ou server) lê essa lista para disparar notificação ou chamar Ativa CRM. Ou seja, são **configuração morta** hoje.

**Recomendação:**  
- Remover da UI até haver um fluxo (webhook/cron) que use `notificationEvents`, **ou** manter com aviso claro: “Em breve” / “Não implementado”.

---

## 3. Inconsistência de chave (multi-tenant)

- **Integration.tsx** grava com chave `integration_settings_${user.company_id}` (ou `integration_settings` se não houver `company_id`).
- **AdminJobSurveysManager.tsx** lê sempre a chave **`integration_settings`** (sem sufixo de empresa).

Em cenário multi-empresa, quem tem `company_id` salva em `integration_settings_<id>` e o painel de vagas/IA continua lendo só `integration_settings`. Assim, a API Key e o modelo de IA configurados em Integrações podem **não** ser os que o AdminJobSurveysManager usa.

**Recomendação:**  
- Fazer AdminJobSurveysManager usar a mesma regra de chave que Integration (por exemplo, `integration_settings_${company_id}` quando o usuário tiver `company_id`), ou centralizar a leitura em um hook que já receba `company_id`.

---

## 4. Checklist de limpeza sugerida

| Ação | Prioridade |
|------|------------|
| Remover evento “Lembrete NPS Diário (08:00)” e card/botão “Teste de Lembrete NPS” | Alta – evita erro 404 e confusão |
| Remover ou esconder campos `webhookUrl`, `defaultNotificationPhone` e o switch `whatsappNotifications` se não forem usados em breve; ou documentar como “futuro” | Média |
| Revisar card “Configuração de Webhook” (URL fixa): remover ou redirecionar para onde os webhooks são de fato configurados | Média |
| Alinhar chave de integração (company) entre Integration e AdminJobSurveysManager | Alta se houver multi-tenant |
| Remover ou marcar como “em breve” a lista de eventos (task_created, etc.) até existir backend que os use | Baixa |

---

## 5. Referência rápida de uso no código

- **Token Ativa CRM:** `server/index.js` ~linha 2666 (`/api/whatsapp/send`).  
- **Telegram:** `useTelegramConfig` → `OrdemServicoForm.tsx`.  
- **IA (OpenAI):** `AdminJobSurveysManager.tsx` (chave `integration_settings`).  
- **Envio WhatsApp (app):** `useWhatsApp.ts` → `NovaVenda`, `OrdemServicoForm`, `NotificationManager` (e backend acima).  
- **Webhooks de leads:** `WebhookManager` / `useWebhooks` → `/api/webhook/leads/{key}` (não usa o card de URL fixa em Integrações).
