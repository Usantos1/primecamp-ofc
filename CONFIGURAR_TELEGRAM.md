# 📸 Configuração Técnica do Telegram Bot para Fotos da OS

> 📖 **Para um guia passo a passo completo e visual, veja:** `PASSO_A_PASSO_TELEGRAM.md`

# Configuração do Telegram Bot para Fotos da OS

## ✅ O que foi implementado

1. **Edge Function `telegram-bot`**: Criada e deployada
2. **Hook `useTelegram`**: Criado em `src/hooks/useTelegram.ts`
3. **Integração pronta**: Substitui o Google Drive por Telegram

## 🔧 Como configurar

### Passo 1: Criar um Bot do Telegram

1. Abra o Telegram e procure por **@BotFather**
2. Envie o comando `/newbot`
3. Siga as instruções para criar um bot
4. **Copie o token** que o BotFather fornecer (ex: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Passo 2: Obter o Chat ID

Você precisa do ID do chat onde as fotos serão enviadas. Pode ser:
- Um grupo do Telegram
- Um canal do Telegram
- Seu próprio chat (chat privado)

**Para obter o Chat ID:**

1. **Opção A - Grupo/Canal:**
   - Adicione o bot ao grupo/canal
   - Envie uma mensagem no grupo/canal
   - Acesse: `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates`
   - Procure por `"chat":{"id":-123456789}` (o ID será negativo para grupos)

2. **Opção B - Chat privado:**
   - Inicie uma conversa com o bot
   - Envie uma mensagem para o bot
   - Acesse: `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates`
   - Procure por `"chat":{"id":123456789}` (o ID será positivo para chats privados)

### Passo 3: Configurar no Supabase

1. Acesse o **Supabase Dashboard**
2. Vá em **Project Settings** > **Edge Functions** > **Secrets**
3. Clique em **Add new secret**
4. **Name:** `TELEGRAM_BOT_TOKEN`
5. **Value:** Cole o token do bot (ex: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
6. Clique em **Save**

### Passo 4: Configurar Chat ID no Sistema

O Chat ID precisa ser configurado no sistema. Você pode:

**Opção A - Variável de ambiente:**
- Adicione `TELEGRAM_CHAT_ID` como secret no Supabase
- Use o valor no código

**Opção B - Campo no formulário:**
- Adicione um campo para o usuário informar o Chat ID
- Ou configure um Chat ID padrão

## 📝 Exemplo de uso

```typescript
import { useTelegram } from '@/hooks/useTelegram';

const { sendPhoto, sendMultiplePhotos, loading } = useTelegram();

// Enviar uma foto
const result = await sendPhoto(
  file,
  osNumero,
  'entrada', // ou 'saida' ou 'processo'
  chatId, // ID do chat do Telegram
  'Legenda opcional'
);

// Enviar múltiplas fotos
const results = await sendMultiplePhotos(
  files,
  osNumero,
  'entrada',
  chatId
);
```

## 🔍 Troubleshooting

### Erro: "TELEGRAM_BOT_TOKEN não configurado"
- Verifique se o secret foi adicionado no Supabase Dashboard
- Certifique-se de que o nome está exatamente como `TELEGRAM_BOT_TOKEN`

### Erro: "chat not found"
- Verifique se o bot foi adicionado ao grupo/canal
- Verifique se o Chat ID está correto (pode ser negativo para grupos)

### Erro: "file too large"
- O Telegram tem limite de 10MB por foto
- O sistema limita a 5MB para segurança
- Comprima as imagens antes de enviar

## ✅ Vantagens do Telegram vs Google Drive

1. ✅ **Mais simples**: Não precisa de Service Account
2. ✅ **Mais rápido**: API direta, sem upload complexo
3. ✅ **Mais confiável**: Menos pontos de falha
4. ✅ **Notificações**: Recebe notificações no Telegram
5. ✅ **Organização**: Pode criar grupos/canais por OS ou tipo

## 🚀 Próximos passos

1. Atualizar `OrdemServicoForm.tsx` para usar `useTelegram` em vez de `driveUpload`
2. Adicionar campo para configurar Chat ID (ou usar variável de ambiente)
3. Testar envio de fotos
4. Remover código do Google Drive (opcional)

