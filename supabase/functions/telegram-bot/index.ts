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

    console.log('[telegram-bot] Lendo body da requisição...');
    const body: TelegramUploadRequest = await req.json();
    console.log('[telegram-bot] Body recebido:', {
      hasFile: !!body.file,
      fileName: body.fileName,
      osNumero: body.osNumero,
      tipo: body.tipo,
      chatId: body.chatId,
      fileSize: body.file?.length || 0,
    });

    const { file, fileName, osNumero, tipo, chatId, caption } = body;

    if (!file || !fileName || !osNumero || !tipo || !chatId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Parâmetros obrigatórios faltando' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    console.log('[telegram-bot] Token presente:', !!TELEGRAM_BOT_TOKEN);
    
    if (!TELEGRAM_BOT_TOKEN) {
      console.error('[telegram-bot] TELEGRAM_BOT_TOKEN não configurado');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'TELEGRAM_BOT_TOKEN não configurado. Configure no Supabase Dashboard > Edge Functions > Secrets' 
        }),
        {
          status: 500,
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
    const photo = telegramData.result?.photo?.[telegramData.result.photo.length - 1]; // Pegar a maior resolução
    const fileId = photo?.file_id;
    
    // Tentar obter URL da foto (pode não estar disponível em canais)
    let fileUrl = undefined;
    if (photo?.file_path) {
      fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${photo.file_path}`;
    }
    
    // Se não tiver fileUrl (comum em canais), gerar link do post
    let postLink = undefined;
    if (!fileUrl && telegramData.result?.message_id && telegramData.result?.chat?.username) {
      // Canal público: https://t.me/username/message_id
      postLink = `https://t.me/${telegramData.result.chat.username}/${telegramData.result.message_id}`;
    } else if (!fileUrl && telegramData.result?.message_id && chatId) {
      // Canal privado ou grupo: usar chat_id e message_id
      // Formato: https://t.me/c/chat_id/message_id (remover o -100 do início se existir)
      const cleanChatId = String(chatId).replace(/^-100/, '');
      postLink = `https://t.me/c/${cleanChatId}/${telegramData.result.message_id}`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: telegramData.result?.message_id,
        fileId: fileId,
        fileUrl: fileUrl,
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

