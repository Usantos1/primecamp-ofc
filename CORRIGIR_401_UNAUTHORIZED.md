# 🔧 Corrigir Erro 401 Unauthorized no Webhook

## Problema Identificado

O webhook está retornando `401 Unauthorized` porque o Supabase Edge Functions pode estar exigindo autenticação por padrão.

## ✅ Solução

O código foi atualizado para não exigir autenticação do Supabase, já que o Telegram não envia tokens de autenticação.

## 🔄 Próximos Passos

### 1. Aguardar alguns segundos
O deploy foi feito. Aguarde 10-20 segundos para a função atualizar.

### 2. Limpar Updates Pendentes

Há **37 updates pendentes**. Vamos limpar:

Acesse no navegador:
```
https://api.telegram.org/bot8250587864:AAH2HuYS8yLV0nD8sbdwvmksuf_M2fBJOPo/deleteWebhook?drop_pending_updates=true
```

Isso vai:
- Remover o webhook atual
- Limpar os 37 updates pendentes

### 3. Reconfigurar o Webhook

Depois, configure novamente:
```
https://api.telegram.org/bot8250587864:AAH2HuYS8yLV0nD8sbdwvmksuf_M2fBJOPo/setWebhook?url=https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/telegram-webhook
```

### 4. Verificar Novamente

Acesse:
```
https://api.telegram.org/bot8250587864:AAH2HuYS8yLV0nD8sbdwvmksuf_M2fBJOPo/getWebhookInfo
```

Agora você deve ver:
- `"pending_update_count": 0`
- Sem `"last_error_message"` ou com uma mensagem diferente

### 5. Testar o Comando

1. No canal "ENTRADA OS.", envie: `/getchatid`
2. O bot deve responder agora!

## ⚠️ Se ainda não funcionar

Se após esses passos ainda houver erro 401, pode ser necessário verificar as configurações de RLS ou tornar a função pública no Supabase Dashboard.

