# 🔧 Corrigir Webhook do Telegram

## Erro 404 ao verificar webhook

O erro `{"ok":false,"error_code":404,"description":"Not Found"}` indica que o webhook não está configurado ou a URL está incompleta.

## ✅ Solução: Configurar o Webhook Novamente

### 1. Configurar o Webhook

Acesse esta URL **COMPLETA** no navegador:

```
https://api.telegram.org/bot8250587864:AAH2HuYS8yLV0nD8sbdwvmksuf_M2fBJOPo/setWebhook?url=https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/telegram-webhook
```

Você deve ver:
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

### 2. Verificar o Webhook (URL COMPLETA)

Acesse esta URL **COMPLETA**:

```
https://api.telegram.org/bot8250587864:AAH2HuYS8yLV0nD8sbdwvmksuf_M2fBJOPo/getWebhookInfo
```

Você deve ver:
```json
{
  "ok": true,
  "result": {
    "url": "https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/telegram-webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

### 3. Testar o Comando

1. No canal "ENTRADA OS.", envie: `/getchatid`
2. O bot deve responder com o Chat ID

## ⚠️ Importante

- A URL deve ser **completa** (não cortada)
- O webhook precisa estar configurado antes de funcionar
- Após configurar, teste novamente o comando

## 🔍 Se ainda não funcionar

1. Verifique os logs da Edge Function em: https://supabase.com/dashboard/project/gogxicjaqpqbhsfzutij/functions/telegram-webhook/logs
2. Envie `/getchatid` novamente
3. Veja se aparecem logs de requisições recebidas

