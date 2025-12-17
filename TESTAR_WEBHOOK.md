# 🔍 Testar Webhook do Telegram

## Problema: Bot não responde ao comando `/getchatid` no canal

O bot está adicionado como administrador com as permissões corretas, mas não está respondendo.

## ✅ Verificações Necessárias

### 1. Verificar Logs da Edge Function

1. Acesse: https://supabase.com/dashboard/project/gogxicjaqpqbhsfzutij/functions
2. Clique em `telegram-webhook`
3. Vá na aba **"Logs"**
4. Envie `/getchatid` no canal novamente
5. Veja se aparecem logs como:
   ```
   [telegram-webhook] Requisição recebida: {...}
   [telegram-webhook] Update recebido: {...}
   [telegram-webhook] Processando mensagem: {...}
   ```

### 2. Verificar se o Webhook está Recebendo Updates

Acesse no navegador:
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

Se `pending_update_count` for maior que 0, significa que há updates pendentes que não foram processados.

### 3. Verificar Permissões do Bot

O bot precisa ter:
- ✅ **"Gerenciar Mensagens"** (já está ativado)
- ✅ **"Postar mensagens"** (verificar se está ativado)

### 4. Testar Manualmente via API

Para testar se o bot consegue enviar mensagens no canal, acesse:

```
https://api.telegram.org/bot8250587864:AAH2HuYS8yLV0nD8sbdwvmksuf_M2fBJOPo/sendMessage?chat_id=-1001234567890&text=Teste
```

**Substitua `-1001234567890` pelo Chat ID real do canal.**

Se funcionar, o bot consegue enviar mensagens. Se não funcionar, pode ser problema de permissões.

## 🐛 Possíveis Problemas

1. **Webhook não está recebendo updates** → Verificar `getWebhookInfo`
2. **Bot não tem permissão para postar** → Verificar permissões no canal
3. **Erro na Edge Function** → Verificar logs
4. **Canal não está enviando updates** → Verificar se o bot está realmente no canal

## 📋 Próximos Passos

1. Verifique os logs da Edge Function
2. Verifique o `getWebhookInfo`
3. Teste enviar mensagem manualmente via API
4. Compartilhe os resultados para diagnóstico

