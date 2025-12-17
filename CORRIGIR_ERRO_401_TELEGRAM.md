# 🔧 Corrigir Erro 401 Unauthorized do Telegram

## Problema Identificado

O webhook está recebendo requisições corretamente, mas ao tentar enviar a resposta para o Telegram, recebe erro **401 Unauthorized**. Isso significa que o `TELEGRAM_BOT_TOKEN` não está configurado ou está incorreto no Supabase.

## ✅ Solução: Verificar e Configurar o Token

### Passo 1: Verificar se o Token está Configurado

1. Acesse: https://supabase.com/dashboard/project/gogxicjaqpqbhsfzutij
2. Vá em **Project Settings** (⚙️) > **Edge Functions** > **Secrets**
3. Procure por um secret chamado: `TELEGRAM_BOT_TOKEN`

### Passo 2: Se NÃO Existe - Adicionar

1. Clique em **"Add new secret"**
2. **Name:** `TELEGRAM_BOT_TOKEN` (exatamente assim, com letras maiúsculas)
3. **Value:** `8250587864:AAH2HuYS8yLV0nD8sbdwvmksuf_M2fBJOPo`
4. Clique em **Save**

### Passo 3: Se JÁ Existe - Verificar Valor

1. Clique no secret `TELEGRAM_BOT_TOKEN`
2. Verifique se o valor está correto: `8250587864:AAH2HuYS8yLV0nD8sbdwvmksuf_M2fBJOPo`
3. Se estiver diferente ou vazio, edite e salve

### Passo 4: Aguardar e Testar

1. Aguarde 10-20 segundos após salvar
2. No canal "ENTRADA OS.", envie: `/getchatid`
3. O bot deve responder agora!

## 🔍 Verificar Logs

Se ainda não funcionar, verifique os logs:

1. Acesse: https://supabase.com/dashboard/project/gogxicjaqpqbhsfzutij/functions/telegram-webhook/logs
2. Envie `/getchatid` novamente
3. Veja se aparece: `[telegram-webhook] Token presente: true`

Se aparecer `false`, o token não está configurado corretamente.

## ⚠️ Importante

- O token deve ser exatamente: `8250587864:AAH2HuYS8yLV0nD8sbdwvmksuf_M2fBJOPo`
- O nome do secret deve ser exatamente: `TELEGRAM_BOT_TOKEN` (com letras maiúsculas)
- Após configurar, aguarde alguns segundos antes de testar

