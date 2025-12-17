# 📸 Passo a Passo Completo - Configurar Telegram Bot para Fotos da OS

## 📋 Índice
1. [Criar Bot do Telegram](#1-criar-bot-do-telegram)
2. [Obter Chat ID](#2-obter-chat-id)
3. [Configurar Token no Supabase](#3-configurar-token-no-supabase)
4. [Usar no Sistema](#4-usar-no-sistema)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. Criar Bot do Telegram

### Passo 1.1: Abrir o Telegram
1. Abra o aplicativo **Telegram** no seu celular ou computador
2. Procure por **@BotFather** na busca
3. Clique no bot oficial do BotFather (tem um check azul ✓)

### Passo 1.2: Criar um novo bot
1. Envie o comando: `/newbot`
2. O BotFather vai perguntar: **"Alright, a new bot. How are we going to call it? Please choose a name for your bot."**
3. Digite um nome para o bot (ex: `PrimeCamp Fotos OS`)
4. O BotFather vai perguntar: **"Good. Now let's choose a username for your bot. It must end in `bot`. Like this, for example: TetrisBot or tetris_bot."**
5. Digite um username que termine com `bot` (ex: `primecamp_fotos_bot`)

### Passo 1.3: Copiar o Token
1. O BotFather vai enviar uma mensagem com o **token** do bot
2. Exemplo de token: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz-1234567890`
3. **COPIE ESSE TOKEN** - você vai precisar dele no próximo passo
4. ⚠️ **IMPORTANTE:** Guarde esse token em local seguro, não compartilhe com ninguém

---

## 2. Obter Chat ID

Você precisa do **Chat ID** do local onde as fotos serão enviadas. Pode ser:
- Um **grupo** do Telegram
- Um **canal** do Telegram  
- Seu próprio **chat privado** com o bot

### Opção A: Usar um Canal (Recomendado) ⭐

#### Passo 2.1: Criar ou escolher um canal
1. No Telegram, crie um novo **canal** ou escolha um canal existente
2. **Adicione o bot como administrador** (OBRIGATÓRIO para canais):
   - Clique no nome do canal (topo)
   - Vá em **"Administradores"** ou **"Administrators"**
   - Clique em **"Adicionar Administrador"** ou **"Add Administrator"**
   - Procure pelo bot: `@Primecampgestao_bot`
   - Adicione o bot como administrador
   - ⚠️ **IMPORTANTE:** O bot precisa ser administrador para responder comandos em canais

#### Passo 2.2: Obter o Chat ID do canal (Método Fácil! 🎉)
1. No canal, envie o comando: `/getchatid`
2. O bot responderá automaticamente com o Chat ID!
3. **COPIE O NÚMERO** que aparecer na mensagem do bot
   - ⚠️ **O ID de canais é NEGATIVO** (começa com `-`)
   - Exemplo: `-1001234567890`

**Método Alternativo (se o comando não funcionar):**
1. Envie uma mensagem qualquer no grupo (pode ser "teste")
2. Abra seu navegador e acesse:
   ```
   https://api.telegram.org/bot<SEU_TOKEN>/getUpdates
   ```
   **Substitua `<SEU_TOKEN>` pelo token que você copiou no Passo 1.3**
3. Você verá um JSON com várias informações
4. Procure por `"chat":{"id":-123456789}` 
   - ⚠️ **O ID de grupos é NEGATIVO** (começa com `-`)
   - Exemplo: `-1001234567890`
5. **COPIE ESSE NÚMERO** (com o sinal negativo se for grupo)

### Opção B: Usar Chat Privado (Mais Simples)

#### Passo 2.1: Iniciar conversa com o bot
1. No Telegram, procure pelo username do seu bot (ex: `@primecamp_fotos_bot`)
2. Clique no bot e depois em **"Iniciar"** ou **"Start"**
3. Envie uma mensagem qualquer para o bot (ex: "oi")

#### Passo 2.2: Obter o Chat ID (Método Fácil! 🎉)
1. No chat privado com o bot, envie o comando: `/getchatid`
2. O bot responderá automaticamente com o Chat ID!
3. **COPIE O NÚMERO** que aparecer na mensagem do bot
   - ⚠️ **O ID de chat privado é POSITIVO** (sem sinal negativo)
   - Exemplo: `5909268855` (seu Chat ID)

**Método Alternativo (se o comando não funcionar):**
1. Envie uma mensagem qualquer para o bot (ex: "oi")
2. Abra seu navegador e acesse:
   ```
   https://api.telegram.org/bot<SEU_TOKEN>/getUpdates
   ```
   **Substitua `<SEU_TOKEN>` pelo token que você copiou no Passo 1.3**

3. Você verá um JSON com várias informações
4. Procure por `"chat":{"id":123456789}`
   - ⚠️ **O ID de chat privado é POSITIVO** (sem sinal negativo)
   - Exemplo: `5909268855`
5. **COPIE ESSE NÚMERO**


---

## 3. Configurar Token no Supabase

### Passo 3.1: Acessar o Supabase Dashboard
1. Acesse: https://supabase.com/dashboard
2. Faça login na sua conta
3. Selecione o projeto **primecamp** (ou o nome do seu projeto)

### Passo 3.2: Adicionar o Secret
1. No menu lateral, clique em **"Project Settings"** (Configurações do Projeto)
2. Clique em **"Edge Functions"** no menu lateral
3. Clique em **"Secrets"** (Segredos)
4. Clique no botão **"Add new secret"** (Adicionar novo segredo)

### Passo 3.3: Configurar o Token
1. No campo **"Name"** (Nome), digite exatamente:
   ```
   TELEGRAM_BOT_TOKEN
   ```
   ⚠️ **IMPORTANTE:** O nome deve ser exatamente assim, com letras maiúsculas

2. No campo **"Value"** (Valor), cole o token que você copiou no Passo 1.3
   - Exemplo: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz-1234567890`

3. Clique em **"Save"** (Salvar)

4. ✅ Pronto! O token está configurado

---

## 4. Usar no Sistema

### Passo 5.1: Abrir uma Ordem de Serviço
1. Acesse o sistema PrimeCamp
2. Vá em **"Ordem de Serviço"** > **"Nova OS"** ou abra uma OS existente
3. Clique na aba **"Fotos"** (última aba)

### Passo 5.2: Configurar o Chat ID (Apenas uma vez!)
1. Na seção **"Chat ID do Telegram"**, cole o Chat ID que você obteve no Passo 2
   - Se for grupo: `-1001234567890` (com o sinal negativo)
   - Se for chat privado: `123456789` (sem sinal negativo)
   - **Exemplo do seu caso:** `5909268855`

2. Clique no botão **"Salvar como padrão"** que aparece ao lado do campo
   - ✅ O Chat ID será salvo automaticamente
   - ✅ Nas próximas vezes, o Chat ID já estará preenchido automaticamente
   - ✅ Você não precisará configurar novamente!

### Passo 5.3: Enviar Fotos

#### Fotos de Entrada:
1. Clique no botão **"Adicionar Fotos Entrada"**
2. Selecione uma ou mais fotos do seu computador/celular
3. Aguarde o envio (você verá "Enviando fotos...")
4. ✅ As fotos serão enviadas para o Telegram com a legenda: `OS-{número} - Fotos de Entrada`

#### Fotos de Processo:
1. Clique no botão **"Adicionar Fotos Processo"**
2. Selecione as fotos
3. ✅ As fotos serão enviadas com a legenda: `OS-{número} - Fotos de Processo`

#### Fotos de Saída:
1. Clique no botão **"Adicionar Fotos Saída"**
2. Selecione as fotos
3. ✅ As fotos serão enviadas com a legenda: `OS-{número} - Fotos de Saída`

### Passo 5.4: Verificar no Telegram
1. Abra o Telegram (grupo/canal/chat privado)
2. Você verá as fotos sendo enviadas automaticamente
3. Cada foto terá uma legenda indicando a OS e o tipo (Entrada/Processo/Saída)

---

## 6. Troubleshooting

### ❌ Erro: "TELEGRAM_BOT_TOKEN não configurado"
**Solução:**
- Verifique se o secret foi adicionado no Supabase Dashboard
- Verifique se o nome está exatamente como `TELEGRAM_BOT_TOKEN` (maiúsculas)
- Aguarde alguns minutos após adicionar o secret (pode levar tempo para propagar)

### ❌ Erro: "chat not found" ou "chat_id is empty"
**Solução:**
- Verifique se o Chat ID está correto (pode ser negativo para grupos)
- Verifique se o bot foi adicionado ao grupo/canal
- Para chat privado, verifique se você iniciou conversa com o bot (enviou /start)

### ❌ Erro: "file too large"
**Solução:**
- O Telegram tem limite de 10MB por foto
- O sistema limita a 5MB para segurança
- Comprima as imagens antes de enviar
- Use um app de compressão de imagens

### ❌ Botões desabilitados
**Solução:**
- Verifique se você configurou o Chat ID no campo acima dos botões
- O Chat ID não pode estar vazio

### ❌ Fotos não aparecem no Telegram
**Solução:**
1. Verifique se o token está correto no Supabase
2. Verifique se o Chat ID está correto
3. Verifique os logs no Supabase Dashboard:
   - Vá em **Edge Functions** > **telegram-bot** > **Logs**
   - Veja se há erros

### ❌ Não consigo obter o Chat ID
**Solução Alternativa:**
1. Use o bot @userinfobot no Telegram
2. Adicione ele ao grupo ou inicie conversa
3. Ele mostrará o Chat ID automaticamente

---

## 📝 Resumo Rápido

1. ✅ Criar bot com @BotFather → Copiar token
2. ✅ Obter Chat ID (grupo/canal/chat) → Copiar número
3. ✅ Adicionar `TELEGRAM_BOT_TOKEN` no Supabase Dashboard
4. ✅ Abrir OS → Aba "Fotos" → Configurar Chat ID
5. ✅ Enviar fotos → Verificar no Telegram

---

## 🎯 Dicas Finais

- 💡 **Grupo vs Chat Privado:**
  - **Grupo:** Melhor para equipe ver todas as fotos
  - **Chat Privado:** Mais simples, só você vê

- 💡 **Organização:**
  - Crie grupos separados por tipo: "OS Entrada", "OS Processo", "OS Saída"
  - Ou use um grupo único e organize por legenda

- 💡 **Segurança:**
  - Não compartilhe o token do bot
  - Use grupos privados para fotos sensíveis
  - Revogue o token se suspeitar de vazamento

- 💡 **Performance:**
  - Envie fotos uma de cada vez se houver muitas
  - Comprima fotos grandes antes de enviar
  - O sistema tem delay de 500ms entre envios para evitar rate limit

---

## ✅ Pronto!

Agora você pode enviar fotos das OSs diretamente para o Telegram! 🎉

Se tiver dúvidas, consulte os logs no Supabase Dashboard ou verifique o arquivo `CONFIGURAR_TELEGRAM.md` para mais detalhes técnicos.

