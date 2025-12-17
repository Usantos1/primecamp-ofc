# 🔧 Configurar Webhook com API Key

## ✅ Solução: Usar Publishable Key na URL

Agora que temos a publishable key, vamos configurar o webhook com ela na URL.

## 📋 Passo a Passo

### 1. Limpar Updates Pendentes

Primeiro, vamos limpar os 37 updates pendentes:

Acesse no navegador:
```
https://api.telegram.org/bot8250587864:AAH2HuYS8yLV0nD8sbdwvmksuf_M2fBJOPo/deleteWebhook?drop_pending_updates=true
```

Você deve ver:
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was deleted"
}
```

### 2. Configurar Webhook com API Key

Agora configure o webhook usando a publishable key na URL:

```
https://api.telegram.org/bot8250587864:AAH2HuYS8yLV0nD8sbdwvmksuf_M2fBJOPo/setWebhook?url=https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/telegram-webhook?apikey=sb_publishable_iZ4CZQVa-ToFo_8K8FQiOg_a4sXAM0v
```

Você deve ver:
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

### 3. Verificar o Webhook

Acesse:
```
https://api.telegram.org/bot8250587864:AAH2HuYS8yLV0nD8sbdwvmksuf_M2fBJOPo/getWebhookInfo
```

Agora você deve ver:
- `"pending_update_count": 0`
- Sem `"last_error_message"` ou com uma mensagem diferente de 401

### 4. Testar o Comando

1. No canal "ENTRADA OS.", envie: `/getchatid`
2. O bot deve responder agora! 🎉

## ⚠️ Importante

- A publishable key é segura para usar em URLs públicas
- Ela permite acesso à função sem autenticação JWT
- Mantenha a secret key segura e não a compartilhe

