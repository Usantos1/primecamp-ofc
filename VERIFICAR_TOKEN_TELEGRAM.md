# 🔍 Verificar se o Token do Telegram está Configurado

## ⚠️ Erro 500 ao Enviar Fotos

Se você está recebendo erro 500 ao tentar enviar fotos, provavelmente o token não está configurado.

## ✅ Verificar Token no Supabase

### Passo 1: Acessar Secrets
1. Acesse: https://supabase.com/dashboard/project/gogxicjaqpqbhsfzutij
2. Vá em **Project Settings** (⚙️) > **Edge Functions** > **Secrets**

### Passo 2: Verificar se Existe
Procure por um secret chamado:
```
TELEGRAM_BOT_TOKEN
```

### Passo 3: Se NÃO Existe - Adicionar
1. Clique em **"Add new secret"**
2. **Name:** `TELEGRAM_BOT_TOKEN`
3. **Value:** `8250587864:AAH2HuYS8yLV0nD8sbdwvmksuf_M2fBJOPo`
4. Clique em **Save**

### Passo 4: Se JÁ Existe - Verificar Valor
1. Clique no secret `TELEGRAM_BOT_TOKEN`
2. Verifique se o valor está correto: `8250587864:AAH2HuYS8yLV0nD8sbdwvmksuf_M2fBJOPo`
3. Se estiver diferente, edite e salve

## 🔍 Verificar Logs da Edge Function

1. No Supabase Dashboard, vá em **Edge Functions**
2. Clique em **telegram-bot**
3. Clique em **Logs**
4. Tente enviar uma foto novamente
5. Veja os logs para identificar o erro exato

## 📋 Erros Comuns

### Erro: "TELEGRAM_BOT_TOKEN não configurado"
**Solução:** Adicione o secret `TELEGRAM_BOT_TOKEN` no Supabase Dashboard

### Erro: "chat not found" ou "chat_id is empty"
**Solução:** 
- Verifique se o Chat ID está correto: `5909268855`
- Verifique se você iniciou conversa com o bot (envie `/start`)

### Erro: "file too large"
**Solução:** 
- Comprima a imagem antes de enviar
- Limite: 5MB por foto

### Erro: "bad request" ou "400"
**Solução:**
- Verifique se o token está correto
- Verifique se o bot está ativo
- Tente revogar e criar um novo token no @BotFather

## ✅ Teste Rápido

Após configurar o token, teste enviando uma foto:
1. Abra uma OS
2. Vá na aba "Fotos"
3. Configure o Chat ID: `5909268855`
4. Clique em "Adicionar Fotos Entrada"
5. Selecione uma foto pequena (< 1MB)
6. Verifique se aparece no Telegram

## 🆘 Ainda com Erro?

1. Verifique os logs no Supabase Dashboard
2. Copie a mensagem de erro completa
3. Verifique se o token está correto
4. Tente criar um novo bot no @BotFather se necessário

