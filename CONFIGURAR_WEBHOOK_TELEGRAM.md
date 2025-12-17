# 🔗 Configurar Webhook do Telegram (Para o comando /getchatid)

## 🎯 O que isso faz?

Quando você configurar o webhook, o bot poderá responder ao comando `/getchatid` em qualquer **canal/grupo/chat**, mostrando automaticamente o Chat ID!

> 💡 **Importante para Canais:** O bot precisa ser **administrador** do canal para poder responder comandos.

## ✅ Passo a Passo

### 1. Deploy da Edge Function (Já feito! ✅)
A Edge Function `telegram-webhook` já foi criada e deployada.

### 2. Configurar Webhook no Telegram

1. Abra seu navegador
2. Acesse esta URL (substitua com seus dados):

```
https://api.telegram.org/bot8250587864:AAH2HuYS8yLV0nD8sbdwvmksuf_M2fBJOPo/setWebhook?url=https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/telegram-webhook
```

**Ou use esta URL completa:**
```
https://api.telegram.org/bot8250587864:AAH2HuYS8yLV0nD8sbdwvmksuf_M2fBJOPo/setWebhook?url=https://gogxicjaqpqbhsfzutij.supabase.co/functions/v1/telegram-webhook
```

3. Você verá uma resposta JSON:
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

4. ✅ **Pronto!** O webhook está configurado!

### 3. Adicionar Bot como Administrador do Canal (Se usar canal)

⚠️ **IMPORTANTE:** Se você está usando um **canal**, o bot precisa ser **administrador**:

1. No canal, clique no nome do canal (topo)
2. Vá em **"Administradores"** ou **"Administrators"**
3. Clique em **"Adicionar Administrador"** ou **"Add Administrator"**
4. Procure pelo bot: `@Primecampgestao_bot`
5. Adicione o bot como administrador
6. ✅ Pronto! Agora o bot pode responder comandos no canal

### 4. Testar o Comando

1. No Telegram, abra o **canal** onde o bot está (como administrador)
2. Envie o comando: `/getchatid`
3. O bot responderá com:
   ```
   🔍 Chat ID Encontrado!
   
   📱 Tipo: Canal
   💬 Nome: [Nome do canal]
   🆔 Chat ID: -1001234567890
   
   Copie este número e cole no campo "Chat ID do Telegram" no sistema PrimeCamp.
   ```

4. **COPIE O NÚMERO** (será negativo, tipo `-1001234567890`)
5. Cole no sistema!

## 🎉 Vantagens

- ✅ **Não precisa acessar a API manualmente**
- ✅ **Funciona em qualquer canal/grupo/chat**
- ✅ **Resposta instantânea**
- ✅ **Mostra o tipo de chat** (canal/grupo/privado)
- ✅ **ID de canal é negativo** (ex: `-1001234567890`)

## 🔍 Verificar Webhook

Para verificar se o webhook está configurado, acesse esta URL **COMPLETA**:

```
https://api.telegram.org/bot8250587864:AAH2HuYS8yLV0nD8sbdwvmksuf_M2fBJOPo/getWebhookInfo
```

⚠️ **IMPORTANTE:** A URL deve estar completa. Se aparecer erro 404, significa que o webhook não está configurado. Configure novamente usando o Passo 2 acima.

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

## 🗑️ Remover Webhook (se necessário)

Se quiser remover o webhook:

```
https://api.telegram.org/bot8250587864:AAH2HuYS8yLV0nD8sbdwvmksuf_M2fBJOPo/deleteWebhook
```

## ⚠️ Importante

- O webhook é **opcional**. Se não configurar, você ainda pode obter o Chat ID usando o método alternativo (acessando a API diretamente).
- O webhook precisa que o `TELEGRAM_BOT_TOKEN` esteja configurado no Supabase.
- **Para canais:** O bot precisa ser **administrador** do canal para responder comandos.
- **Para grupos:** O bot precisa estar adicionado ao grupo.
- **Para chat privado:** Basta iniciar conversa com o bot (`/start`).

## 🚀 Próximo Passo

Após configurar o webhook:
1. Teste o comando `/getchatid` em qualquer chat
2. Copie o Chat ID retornado
3. Cole no sistema PrimeCamp
4. Comece a enviar fotos! 🎉

