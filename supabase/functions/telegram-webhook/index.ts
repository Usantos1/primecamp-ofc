import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TELEGRAM_API_URL = "https://api.telegram.org/bot";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: 'private' | 'group' | 'supergroup' | 'channel';
      title?: string;
      username?: string;
      first_name?: string;
    };
    text?: string;
    date: number;
  };
  channel_post?: {
    message_id: number;
    chat: {
      id: number;
      type: 'channel';
      title?: string;
      username?: string;
    };
    text?: string;
    date: number;
  };
}

serve(async (req) => {
  console.log('[telegram-webhook] Requisição recebida:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
  });

  try {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // IMPORTANTE: Telegram não envia autenticação do Supabase
    // Validar se a requisição vem do Telegram verificando o header ou usando um secret
    
    // Verificar se há um token secreto na query string (opcional, para segurança extra)
    const url = new URL(req.url);
    const secretToken = url.searchParams.get('secret');
    const expectedSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
    
    // Se um secret estiver configurado, validar
    if (expectedSecret && secretToken !== expectedSecret) {
      console.error('[telegram-webhook] Secret token inválido');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!TELEGRAM_BOT_TOKEN) {
      console.error('[telegram-webhook] TELEGRAM_BOT_TOKEN não configurado');
      return new Response(
        JSON.stringify({ success: false, error: 'Token não configurado' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const update: TelegramUpdate = await req.json();
    console.log('[telegram-webhook] Update recebido:', JSON.stringify(update, null, 2));

    // Telegram pode enviar mensagens de canal em 'channel_post' em vez de 'message'
    const message = update.message || (update as any).channel_post;
    
    // Processar apenas mensagens de texto
    if (!message || !message.text) {
      console.log('[telegram-webhook] Sem mensagem de texto. Update type:', {
        hasMessage: !!update.message,
        hasChannelPost: !!(update as any).channel_post,
        messageText: message?.text,
      });
      return new Response(JSON.stringify({ success: true, message: 'Ignorado - sem texto' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const chatId = message.chat.id;
    const chatType = message.chat.type;
    const text = message.text.trim();
    const chatName = message.chat.title || message.chat.first_name || 'Chat';
    
    console.log('[telegram-webhook] Processando mensagem:', {
      chatId,
      chatType,
      chatName,
      text,
      messageId: message.message_id,
    });

    // Comando /getchatid ou /chatid
    if (text === '/getchatid' || text === '/chatid' || text === '/id') {
      console.log('[telegram-webhook] Comando /getchatid recebido. Chat ID:', chatId);
      
      const tipoLabel = chatType === 'private' 
        ? 'Chat Privado' 
        : chatType === 'group' 
        ? 'Grupo' 
        : chatType === 'supergroup' 
        ? 'Supergrupo' 
        : chatType === 'channel'
        ? 'Canal' 
        : 'Desconhecido';
      
      const responseText = `🔍 *Chat ID Encontrado!*\n\n` +
        `📱 *Tipo:* ${tipoLabel}\n` +
        `💬 *Nome:* ${chatName}\n` +
        `🆔 *Chat ID:* \`${chatId}\`\n\n` +
        `Copie este número e cole no campo "Chat ID do Telegram" no sistema PrimeCamp.\n\n` +
        `💡 *Dica:* Este ID será salvo automaticamente após você colar no sistema.\n` +
        `${chatType === 'channel' ? '✅ *Canal detectado!* O bot precisa ser administrador para funcionar corretamente.\n' : ''}`;

      // Enviar resposta
      console.log('[telegram-webhook] Preparando para enviar mensagem:', {
        chatId,
        chatType,
        tokenPresent: !!TELEGRAM_BOT_TOKEN,
        tokenPrefix: TELEGRAM_BOT_TOKEN ? TELEGRAM_BOT_TOKEN.substring(0, 10) + '...' : 'NÃO CONFIGURADO',
      });

      const sendResponse = await fetch(
        `${TELEGRAM_API_URL}${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: responseText,
            parse_mode: 'Markdown',
          }),
        }
      );

      const sendData = await sendResponse.json();
      console.log('[telegram-webhook] Resposta do Telegram API:', {
        status: sendResponse.status,
        ok: sendResponse.ok,
        data: sendData,
      });

      if (!sendResponse.ok) {
        console.error('[telegram-webhook] Erro ao enviar mensagem:', sendData);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: sendData.description || 'Erro ao enviar mensagem',
            telegramError: sendData 
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true, chatId, chatType, chatName }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Comando /start - Mensagem de boas-vindas
    if (text === '/start') {
      const welcomeText = `👋 *Bem-vindo ao PrimeCamp Gestão Bot!*\n\n` +
        `Este bot é usado para receber fotos das Ordens de Serviço.\n\n` +
        `📋 *Comandos disponíveis:*\n` +
        `• /getchatid - Mostra o ID deste chat\n` +
        `• /start - Mostra esta mensagem\n\n` +
        `💡 *Como usar:*\n` +
        `1. Envie /getchatid neste chat\n` +
        `2. Copie o Chat ID que aparecer\n` +
        `3. Cole no sistema PrimeCamp na aba "Fotos"\n` +
        `4. Comece a enviar fotos! 🎉`;

      await fetch(
        `${TELEGRAM_API_URL}${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: welcomeText,
            parse_mode: 'Markdown',
          }),
        }
      );

      return new Response(
        JSON.stringify({ success: true, message: 'Welcome sent' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Ignorar outras mensagens
    return new Response(
      JSON.stringify({ success: true, message: 'Ignorado' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[telegram-webhook] Erro capturado:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro desconhecido' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

