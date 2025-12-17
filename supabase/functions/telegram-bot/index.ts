import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_API_URL = "https://api.telegram.org/bot";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramUploadRequest {
  file: string; // Base64 encoded file
  fileName: string;
  osNumero: number | string;
  tipo: 'entrada' | 'saida' | 'processo';
  chatId: string; // ID do chat do Telegram (grupo ou canal)
  caption?: string;
}

interface TelegramDeleteRequest {
  chatId: string;
  messageId: number;
}

serve(async (req) => {
  console.log('[telegram-bot] Requisição recebida:', {
    method: req.method,
    url: req.url,
  });

  try {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      console.log('[telegram-bot] Respondendo OPTIONS (CORS preflight)');
      return new Response(null, { headers: corsHeaders });
    }

    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!TELEGRAM_BOT_TOKEN) {
      console.error('[telegram-bot] TELEGRAM_BOT_TOKEN não configurado');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'TELEGRAM_BOT_TOKEN não configurado' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Ler body uma vez para verificar o tipo de requisição
    let body: any = {};
    try {
      const bodyText = await req.text();
      if (bodyText && bodyText.trim()) {
        body = JSON.parse(bodyText);
        console.log('[telegram-bot] Body parseado:', { 
          hasAction: !!body.action, 
          hasFile: !!body.file, 
          hasChatId: !!body.chatId, 
          hasMessageId: !!body.messageId 
        });
      } else {
        console.log('[telegram-bot] Body vazio ou inválido');
      }
    } catch (e) {
      console.error('[telegram-bot] Erro ao parsear body:', e);
      // Se for erro de parse, pode ser que seja uma requisição de upload com formato diferente
      // Vamos continuar e deixar o código abaixo tratar
      body = {};
    }

    // Verificar se é requisição de deletar mensagem (verificar no body)
    if (body && (body.action === 'delete' || (body.chatId && body.messageId && !body.file))) {
      console.log('[telegram-bot] Requisição de deletar mensagem:', body);
      const deleteBody: TelegramDeleteRequest = body as TelegramDeleteRequest;
      const { chatId, messageId } = deleteBody;

      if (!chatId || !messageId) {
        return new Response(
          JSON.stringify({ success: false, error: 'chatId e messageId são obrigatórios' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Deletar mensagem via Telegram API
      const deleteResponse = await fetch(
        `${TELEGRAM_API_URL}${TELEGRAM_BOT_TOKEN}/deleteMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
          }),
        }
      );

      const deleteData = await deleteResponse.json();

      if (!deleteResponse.ok || !deleteData.ok) {
        console.error('[telegram-bot] Erro ao deletar mensagem:', deleteData);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: deleteData.description || 'Erro ao deletar mensagem',
            telegramError: deleteData 
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('[telegram-bot] Mensagem deletada com sucesso');
      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Se chegou aqui, é requisição de upload
    console.log('[telegram-bot] Requisição de upload de foto');
    const uploadBody: TelegramUploadRequest = body as TelegramUploadRequest;
    console.log('[telegram-bot] Body recebido:', {
      hasFile: !!uploadBody.file,
      fileName: uploadBody.fileName,
      osNumero: uploadBody.osNumero,
      tipo: uploadBody.tipo,
      chatId: uploadBody.chatId,
      fileSize: uploadBody.file?.length || 0,
    });

    const { file, fileName, osNumero, tipo, chatId, caption } = uploadBody;

    if (!file || !fileName || !osNumero || !tipo || !chatId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Parâmetros obrigatórios faltando' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[telegram-bot] Decodificando arquivo base64...');
    // Decodificar arquivo base64
    let fileBuffer: Uint8Array;
    try {
      fileBuffer = Uint8Array.from(atob(file), c => c.charCodeAt(0));
      console.log('[telegram-bot] Arquivo decodificado. Tamanho:', fileBuffer.length, 'bytes');
    } catch (decodeError: any) {
      console.error('[telegram-bot] Erro ao decodificar base64:', decodeError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao decodificar arquivo: ' + decodeError.message 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[telegram-bot] Criando FormData...');
    // Criar FormData para enviar foto
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
    formData.append('photo', blob, fileName);
    formData.append('chat_id', String(chatId));
    
    if (caption) {
      formData.append('caption', caption);
    }

    console.log('[telegram-bot] Enviando foto para Telegram...', {
      fileName,
      osNumero,
      tipo,
      chatId,
      fileSize: fileBuffer.length,
      caption: caption || 'sem legenda',
    });

    // Enviar foto via Telegram Bot API
    const telegramResponse = await fetch(
      `${TELEGRAM_API_URL}${TELEGRAM_BOT_TOKEN}/sendPhoto`,
      {
        method: 'POST',
        body: formData,
      }
    );

    console.log('[telegram-bot] Resposta do Telegram. Status:', telegramResponse.status, telegramResponse.statusText);

    let telegramData: any;
    try {
      const responseText = await telegramResponse.text();
      console.log('[telegram-bot] Resposta do Telegram (texto):', responseText.substring(0, 500));
      telegramData = JSON.parse(responseText);
    } catch (parseError: any) {
      console.error('[telegram-bot] Erro ao parsear resposta do Telegram:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao processar resposta do Telegram: ' + parseError.message 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!telegramResponse.ok) {
      console.error('[telegram-bot] Erro do Telegram:', telegramData);
      const errorMsg = telegramData.description || telegramData.error_description || 'Erro ao enviar foto para Telegram';
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMsg,
          telegramError: telegramData 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[telegram-bot] Foto enviada com sucesso:', {
      messageId: telegramData.result?.message_id,
      photoId: telegramData.result?.photo?.[0]?.file_id,
      chatType: telegramData.result?.chat?.type,
    });

    // Retornar informações da foto enviada
    const photos = telegramData.result?.photo || [];
    const photo = photos[photos.length - 1]; // Pegar a maior resolução
    const thumbnail = photos[0]; // Pegar a menor resolução (thumbnail)
    const fileId = photo?.file_id;
    
    // Tentar obter URL da foto (pode não estar disponível em canais)
    let fileUrl = undefined;
    let thumbnailUrl = undefined;
    
    if (photo?.file_path) {
      fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${photo.file_path}`;
    }
    
    // URL do thumbnail (menor resolução)
    if (thumbnail?.file_path) {
      thumbnailUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${thumbnail.file_path}`;
    }
    
    // Sempre gerar postLink se tiver messageId e chat
    let postLink = undefined;
    const chat = telegramData.result?.chat;
    const messageId = telegramData.result?.message_id;
    
    if (messageId && chat) {
      if (chat.username) {
        // Canal público: https://t.me/username/message_id
        postLink = `https://t.me/${chat.username}/${messageId}`;
      } else if (chat.id) {
        // Canal privado ou grupo: usar chat_id e message_id
        // Formato: https://t.me/c/chat_id/message_id (remover o -100 do início se existir)
        const cleanChatId = String(chat.id).replace(/^-100/, '');
        postLink = `https://t.me/c/${cleanChatId}/${messageId}`;
      }
    }

    console.log('[telegram-bot] URLs geradas:', { fileUrl, thumbnailUrl, postLink });

    return new Response(
      JSON.stringify({
        success: true,
        messageId: messageId,
        fileId: fileId,
        fileUrl: fileUrl,
        thumbnailUrl: thumbnailUrl, // URL do thumbnail (menor resolução)
        postLink: postLink, // Link do post no Telegram
        photo: telegramData.result?.photo,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[telegram-bot] Erro capturado:', error);
    console.error('[telegram-bot] Stack trace:', error.stack);
    console.error('[telegram-bot] Error name:', error.name);
    console.error('[telegram-bot] Error message:', error.message);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro desconhecido',
        errorName: error.name,
        errorStack: error.stack?.substring(0, 500) 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

