# 🔐 Configurar Token do Telegram no Supabase

## ✅ Seus Dados

- **Token do Bot:** `8250587864:AAH2HuYS8yLV0nD8sbdwvmksuf_M2fBJOPo`
- **Chat ID:** `5909268855`
- **Username do Bot:** `@Primecampgestao_bot`

## 📋 Passo a Passo

### 1. Acessar Supabase Dashboard
1. Vá para: https://supabase.com/dashboard
2. Faça login
3. Selecione o projeto **primecamp** (ou seu projeto)

### 2. Adicionar Secret
1. No menu lateral, clique em **"Project Settings"** (⚙️)
2. Clique em **"Edge Functions"**
3. Clique em **"Secrets"** (🔐)
4. Clique em **"Add new secret"**

### 3. Configurar
1. **Name:** Digite exatamente:
   ```
   TELEGRAM_BOT_TOKEN
   ```
   ⚠️ **IMPORTANTE:** Deve ser exatamente assim, com letras maiúsculas

2. **Value:** Cole o token:
   ```
   8250587864:AAH2HuYS8yLV0nD8sbdwvmksuf_M2fBJOPo
   ```

3. Clique em **"Save"** (Salvar)

### 4. Verificar
- O secret deve aparecer na lista com o nome `TELEGRAM_BOT_TOKEN`
- ✅ Pronto! O token está configurado

## 🎯 Próximo Passo

Agora você pode usar o sistema:
1. Abra uma OS
2. Vá na aba "Fotos"
3. O Chat ID `5909268855` será carregado automaticamente (ou digite uma vez e salve)
4. Envie fotos! 🎉

## ⚠️ Importante

- **NÃO compartilhe o token** com ninguém
- O token dá controle total sobre o bot
- Se suspeitar de vazamento, revogue o token no @BotFather

