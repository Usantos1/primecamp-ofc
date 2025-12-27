import { useState } from 'react';
import { from } from '@/integrations/db/client';
import { apiClient } from '@/integrations/api/client';
import { toast } from 'sonner';

export interface TelegramPhotoResult {
  success: boolean;
  messageId?: number;
  fileId?: string;
  fileUrl?: string;
  thumbnailUrl?: string; // URL do thumbnail (menor resolução)
  postLink?: string; // Link do post no Telegram (usado quando fileUrl não está disponível)
  error?: string;
}

export function useTelegram() {
  const [loading, setLoading] = useState(false);

  const sendPhoto = async (
    file: File,
    osNumero: number | string,
    tipo: 'entrada' | 'saida' | 'processo',
    chatId: string,
    caption?: string
  ): Promise<TelegramPhotoResult> => {
    setLoading(true);
    
    try {
      console.log('[useTelegram] Enviando foto:', {
        fileName: file.name,
        osNumero,
        tipo,
        chatId,
        fileSize: file.size,
      });

      // Converter arquivo para base64
      const base64File = await fileToBase64(file);

      // Verificar tamanho (limite do Telegram é 10MB, mas vamos usar 5MB para segurança)
      if (base64File.length > 5 * 1024 * 1024) {
        return {
          success: false,
          error: 'Arquivo muito grande. Tamanho máximo: 5MB. Tente comprimir a imagem.',
        };
      }

      const { data, error } = await apiClient.invokeFunction('telegram-bot', {
        file: base64File,
        fileName: file.name,
        osNumero: String(osNumero),
        tipo: tipo,
        chatId: chatId,
        caption: caption || `OS-${osNumero} - ${tipo === 'entrada' ? 'Entrada' : tipo === 'saida' ? 'Saída' : 'Processo'}`,
      });

      if (error) {
        console.error('[useTelegram] Erro ao chamar Edge Function:', error);
        console.error('[useTelegram] Detalhes do erro:', {
          message: error.message,
          name: error.name,
          status: (error as any).status,
        });
        
        // Verificar se é erro de token não configurado
        if (error.message?.includes('TELEGRAM_BOT_TOKEN não configurado')) {
          return {
            success: false,
            error: 'Token do Telegram não configurado. Configure o TELEGRAM_BOT_TOKEN no Supabase Dashboard > Edge Functions > Secrets',
          };
        }
        
        throw error;
      }

      if (!data) {
        console.error('[useTelegram] Nenhuma resposta da Edge Function');
        return {
          success: false,
          error: 'Nenhuma resposta da Edge Function. Verifique os logs no Supabase Dashboard.',
        };
      }

      if (!data.success) {
        const errorMsg = data?.error || 'Erro desconhecido ao enviar foto';
        console.error('[useTelegram] Erro na resposta:', errorMsg);
        console.error('[useTelegram] Dados completos da resposta:', data);
        
        // Salvar log de erro no banco
        try {
          await savePhotoLog({
            ordem_servico_id: String(osNumero),
            ordem_servico_numero: Number(osNumero),
            file_name: file.name,
            tipo: tipo,
            telegram_chat_id: chatId,
            status: 'erro',
            error_message: errorMsg,
            file_size: file.size,
            mime_type: file.type,
          });
        } catch (logError) {
          console.error('[useTelegram] Erro ao salvar log de erro:', logError);
        }
        
        return {
          success: false,
          error: errorMsg,
        };
      }

      console.log('[useTelegram] Foto enviada com sucesso:', data);
      
      // Salvar log no banco de dados
      try {
        await savePhotoLog({
          ordem_servico_id: String(osNumero), // Usando número como ID temporário
          ordem_servico_numero: Number(osNumero),
          file_name: file.name,
          file_url: data.fileUrl || data.thumbnailUrl || data.postLink, // Usar thumbnailUrl ou postLink como fallback
          file_id: data.fileId,
          message_id: data.messageId,
          tipo: tipo,
          telegram_chat_id: chatId,
          status: 'enviado',
          file_size: file.size,
          mime_type: file.type,
        });
      } catch (logError) {
        console.error('[useTelegram] Erro ao salvar log no banco:', logError);
        // Não falhar o envio se o log falhar
      }
      
      toast.success('Foto enviada para Telegram com sucesso!');
      
      return {
        success: true,
        messageId: data.messageId,
        fileId: data.fileId,
        fileUrl: data.fileUrl,
        thumbnailUrl: data.thumbnailUrl, // Incluir thumbnail
        postLink: data.postLink, // Incluir link do post
      };
    } catch (error: any) {
      console.error('[useTelegram] Erro ao enviar foto:', error);
      toast.error(error.message || 'Erro ao enviar foto para Telegram');
      
      return {
        success: false,
        error: error.message || 'Erro ao enviar foto',
      };
    } finally {
      setLoading(false);
    }
  };

  const sendMultiplePhotos = async (
    files: File[],
    osNumero: number | string,
    tipo: 'entrada' | 'saida' | 'processo',
    chatId: string,
    caption?: string
  ): Promise<TelegramPhotoResult[]> => {
    const results: TelegramPhotoResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`[useTelegram] Enviando foto ${i + 1}/${files.length}`);
      
      const result = await sendPhoto(
        file,
        osNumero,
        tipo,
        chatId,
        caption ? `${caption} (${i + 1}/${files.length})` : undefined
      );
      
      results.push(result);
      
      // Pequeno delay entre envios para evitar rate limit
      if (i < files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const sucesso = results.filter(r => r.success).length;
    const falhas = results.filter(r => !r.success).length;

    console.log('[useTelegram] Upload concluído:', {
      total: results.length,
      sucesso,
      falhas,
    });

    if (sucesso > 0) {
      toast.success(`${sucesso} foto(s) enviada(s) com sucesso!`);
    }
    if (falhas > 0) {
      toast.error(`${falhas} foto(s) falharam ao enviar.`);
    }

    return results;
  };

  const deleteMessage = async (
    chatId: string,
    messageId: number
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      console.log('[useTelegram] Deletando mensagem:', { chatId, messageId });

      const { data, error } = await apiClient.invokeFunction('telegram-bot', {
        action: 'delete',
        chatId,
        messageId,
      });

      if (error) {
        console.error('[useTelegram] Erro ao deletar mensagem:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao deletar mensagem');
      }

      toast.success('Foto deletada do Telegram com sucesso!');
      return { success: true };
    } catch (error: any) {
      console.error('[useTelegram] Erro ao deletar mensagem:', error);
      const errorMsg = error.message || 'Erro ao deletar foto do Telegram';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  return {
    sendPhoto,
    sendMultiplePhotos,
    deleteMessage,
    loading,
  };
}

// Helper function para converter File para base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remover o prefixo "data:image/jpeg;base64," se existir
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Interface para salvar log de foto no banco
interface PhotoLogData {
  ordem_servico_id: string;
  ordem_servico_numero: number;
  file_name: string;
  file_url?: string;
  file_id?: string;
  message_id?: number;
  tipo: 'entrada' | 'saida' | 'processo';
  telegram_chat_id: string;
  status: 'enviado' | 'erro' | 'processando';
  error_message?: string;
  file_size?: number;
  mime_type?: string;
}

// Função para salvar log de foto no banco de dados
async function savePhotoLog(data: PhotoLogData): Promise<void> {
  try {
    const { error } = await from('os_telegram_photos')
      .insert({
        ordem_servico_id: data.ordem_servico_id,
        ordem_servico_numero: data.ordem_servico_numero,
        file_name: data.file_name,
        file_url: data.file_url || null,
        file_id: data.file_id || null,
        message_id: data.message_id || null,
        tipo: data.tipo,
        telegram_chat_id: data.telegram_chat_id,
        status: data.status,
        error_message: data.error_message || null,
        file_size: data.file_size || null,
        mime_type: data.mime_type || null,
      })
      .execute();

    if (error) {
      console.error('[useTelegram] Erro ao salvar log:', error);
      throw error;
    }

    console.log('[useTelegram] Log salvo com sucesso no banco');
  } catch (error) {
    console.error('[useTelegram] Erro ao salvar log de foto:', error);
    // Não propagar o erro para não quebrar o fluxo principal
  }
}

