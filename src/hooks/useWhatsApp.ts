import { useState } from 'react';
import { from } from '@/integrations/db/client';
import { toast } from 'sonner';

const APP_BASE_URL = import.meta.env.VITE_APP_URL || 'https://primecamp.cloud';

interface SendMessageData {
  number: string;
  body: string;
  url?: string;
}

export function useWhatsApp() {
  const [loading, setLoading] = useState(false);

  const getUserPhoneByName = async (displayName: string): Promise<string | null> => {
    try {
      console.log('🔥 getUserPhoneByName: Searching phone for:', displayName);
      
      const { data, error } = await from('profiles')
        .select('phone, display_name, approved')
        .eq('display_name', displayName)
        .eq('approved', true)
        .maybeSingle();

      console.log('🔥 getUserPhoneByName: Query result:', { data, error });

      if (error) {
        console.error('🔥 Error fetching user phone:', error);
        return null;
      }

      if (!data?.phone) {
        console.log(`🔥 No phone found for user: ${displayName}`);
        return null;
      }

      console.log(`🔥 Phone found for ${displayName}: ${data.phone}`);
      return data.phone;
    } catch (error) {
      console.error('🔥 Error in getUserPhoneByName:', error);
      return null;
    }
  };

  const sendMessage = async (data: SendMessageData) => {
    console.log('🔥 useWhatsApp: Sending message', data);
    setLoading(true);
    
    try {
      console.log('🔥 Sending WhatsApp message via edge function:', {
        action: 'send_message',
        data: {
          number: data.number,
          bodyLength: data.body?.length || 0,
          hasUrl: !!data.url
        }
      });
      
      // 🚫 Supabase Functions removido - usar API direta
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.primecamp.cloud/api';
      const response = await fetch(`${API_URL}/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          data
        }),
      });
      
      let result: any = null;
      let error: any = null;
      
      if (!response.ok) {
        error = await response.json().catch(() => ({ error: 'Erro ao enviar mensagem' }));
      } else {
        result = await response.json();
      }

      console.log('🔥 API response:', { 
        result, 
        error,
        resultType: typeof result,
        hasError: !!error,
        resultKeys: result && typeof result === 'object' ? Object.keys(result) : null
      });

      if (error) {
        console.error('🔥 Error calling edge function:', error);
        throw error;
      }

      // Verificar se a mensagem foi realmente enviada
      if (result && typeof result === 'object') {
        // Verificar se há erro na resposta (mesmo com status 200)
        if (result.error) {
          console.error('🔥 Ativa CRM retornou erro:', result.error);
          
          // Mensagens de erro mais específicas
          if (result.error === 'invalidNumber' || result.error === 'ERR_INVALID_NUMBER' || 
              result.error.includes('invalidNumber') || result.error.includes('Invalid phone number')) {
            throw new Error('Número de telefone inválido. Verifique se o número está no formato correto (ex: 5519988779414).');
          } else if (result.error.includes('Invalid Ativa CRM token') || result.error === 'ERR_INVALID_TOKEN') {
            throw new Error('Token do Ativa CRM inválido. Verifique as configurações de integração.');
          } else {
            throw new Error(result.error || 'Erro desconhecido ao enviar mensagem');
          }
        }
        
        if (result.success === false) {
          const errorMsg = result.error || result.message || 'Erro desconhecido ao enviar mensagem';
          console.error('🔥 WhatsApp API error:', errorMsg);
          
          // Mensagens de erro mais específicas
          if (errorMsg.includes('invalidNumber') || errorMsg.includes('Invalid phone number') || errorMsg === 'invalidNumber') {
            throw new Error('Número de telefone inválido. Verifique se o número está no formato correto (ex: 5519988779414).');
          } else if (errorMsg.includes('Invalid Ativa CRM token') || errorMsg.includes('ERR_INVALID_TOKEN')) {
            throw new Error('Token do Ativa CRM inválido. Verifique as configurações de integração.');
          } else {
            throw new Error(errorMsg);
          }
        }
        
        // Se tiver warning mas success for true, ainda é sucesso
        if (result.warning && result.success === true) {
          console.warn('🔥 WhatsApp sent with warning:', result.warning);
          toast.success('Mensagem processada (pode não ter WhatsApp configurado no Ativa CRM)');
          return result;
        }
      }

      console.log('🔥 WhatsApp message sent successfully:', result);
      toast.success('Mensagem enviada com sucesso!');
      
      return result;
    } catch (error: any) {
      console.error('🔥 Error sending WhatsApp message:', error);
      
      // Mensagens de erro mais específicas
      if (error.message?.includes('Invalid phone number') || error.message?.includes('invalidNumber')) {
        toast.error('Número de telefone inválido. Verifique se o número está no formato correto (ex: 5519988779414).');
      } else if (error.message?.includes('Invalid Ativa CRM token')) {
        toast.error('Token do Ativa CRM inválido. Verifique as configurações de integração.');
      } else {
        toast.error(error.message || 'Erro ao enviar mensagem. Verifique o console para mais detalhes.');
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const sendTaskNotification = async (task: any, userPhone?: string, responsibleName?: string) => {
    console.log('useWhatsApp: Sending task notification', { task, userPhone, responsibleName });
    if (!userPhone) {
      console.log('No phone number provided for task notification');
      return;
    }

    const statusLabels = {
      'pending': 'Pendente',
      'in_progress': 'Em Andamento', 
      'completed': 'Concluída',
      'delayed': 'Atrasada'
    };

    const message = `🔔 *Nova Tarefa Atribuída*\n\n📋 *Tarefa:* ${task.name}\n📊 *Status:* ${statusLabels[task.status] || task.status}\n👤 *Responsável:* ${responsibleName || 'Não definido'}\n⏰ *Prazo:* ${task.deadline ? new Date(task.deadline).toLocaleDateString('pt-BR') : 'Não definido'}\n📊 *Prioridade:* ${task.priority || 'Normal'}\n🔗 *Link:* ${APP_BASE_URL}/tarefas\n\nAcesse o sistema para mais detalhes!`;

    await sendMessage({
      number: userPhone,
      body: message
    });
  };

  const sendCalendarNotification = async (event: any, userPhone?: string) => {
    if (!userPhone) {
      console.log('No phone number provided for calendar notification');
      return;
    }

    const message = `📅 *Novo Evento Agendado*\n\n📋 *Evento:* ${event.title}\n⏰ *Data/Hora:* ${new Date(event.start_time).toLocaleString('pt-BR')}\n📍 *Local:* ${event.location || 'Não informado'}\n🔗 *Link:* ${APP_BASE_URL}/calendario\n\nNão esqueça do seu compromisso!`;

    await sendMessage({
      number: userPhone,
      body: message
    });
  };

  const sendTaskStatusNotification = async (task: any, userPhone?: string, oldStatus?: string, responsibleName?: string) => {
    console.log('useWhatsApp: Sending task status notification', { task, userPhone, oldStatus, responsibleName });
    if (!userPhone) {
      console.log('No phone number provided for task status notification');
      return;
    }

    const statusLabels = {
      'pending': 'Pendente',
      'in_progress': 'Em Andamento',
      'completed': 'Concluída',
      'delayed': 'Atrasada'
    };

    const message = `🔄 *Status da Tarefa Atualizado*\n\n📋 *Tarefa:* ${task.name}\n📊 *Novo Status:* ${statusLabels[task.status] || task.status}\n👤 *Responsável:* ${responsibleName || 'Não definido'}\n⏰ *Prazo:* ${task.deadline ? new Date(task.deadline).toLocaleDateString('pt-BR') : 'Não definido'}\n🔗 *Link:* ${APP_BASE_URL}/tarefas\n\nVerifique os detalhes no sistema!`;

    await sendMessage({
      number: userPhone,
      body: message
    });
  };

  const sendProcessNotification = async (process: any, userPhone?: string, userName?: string) => {
    console.log('🔥 useWhatsApp: Sending process notification', { process, userPhone, userName });
    if (!userPhone) {
      console.log('🔥 No phone number provided for process notification');
      return;
    }

    console.log('🔥 Creating message for process:', process.name);
    const message = `📋 *Novo Processo Criado*\n\n📋 *Processo:* ${process.name}\n📝 *Objetivo:* ${process.objective}\n🏢 *Departamento:* ${process.department}\n👤 *Proprietário:* ${process.owner}\n🔗 *Link:* ${APP_BASE_URL}/processos\n\nAcesse o sistema para mais detalhes!`;

    console.log('🔥 Sending WhatsApp message:', { number: userPhone, message });
    await sendMessage({
      number: userPhone,
      body: message
    });
  };

  const sendNPSReminder = async (userPhone: string, userName: string) => {
    if (!userPhone) {
      console.log('No phone number provided for NPS reminder');
      return;
    }

    const message = `🌟 *Lembrete NPS Diário*\n\nOlá ${userName}! 👋\n\nÉ hora de avaliar seu dia no trabalho.\n\nPor favor, acesse o sistema e responda nossa pesquisa NPS diária.\n\n🔗 *Link:* ${APP_BASE_URL}/nps\n\nSua opinião é muito importante para nós! 💙`;

    await sendMessage({
      number: userPhone,
      body: message
    });
  };

  const sendJobCandidateNotification = async (candidate: any, surveyTitle: string, adminPhone: string) => {
    const message = `🎯 *Novo Candidato!*\n\n` +
      `📋 *Vaga:* ${surveyTitle}\n` +
      `👤 *Nome:* ${candidate.name}\n` +
      `📧 *Email:* ${candidate.email}\n` +
      `📞 *Telefone:* ${candidate.phone || 'Não informado'}\n` +
      `💬 *WhatsApp:* ${candidate.whatsapp || 'Não informado'}\n` +
      `📸 *Instagram:* ${candidate.instagram || 'Não informado'}\n` +
      `🎂 *Idade:* ${candidate.age || 'Não informada'}\n` +
      `📍 *Endereço:* ${candidate.address || 'Não informado'}\n` +
      `📮 *CEP:* ${candidate.cep || 'Não informado'}\n` +
      `🔗 *Protocolo:* ${candidate.protocol}\n\n` +
      `Acesse o sistema para mais detalhes:\n` +
      `${APP_BASE_URL}/admin/vagas`;

    await sendMessage({
      number: adminPhone,
      body: message
    });
  };

  const sendDiscTestCompletedNotification = async (testData: any, adminPhone: string) => {
    const profileLabels: Record<string, string> = {
      'D': 'Dominância',
      'I': 'Influência',
      'S': 'Estabilidade',
      'C': 'Conformidade'
    };

    const isCandidate = !testData.user_id;
    const testType = isCandidate ? 'Candidato Externo' : 'Colaborador';

    const message = `🧠 *Teste DISC Completado!*\n\n` +
      `📊 *Tipo:* ${testType}\n` +
      `👤 *Nome:* ${testData.name || 'Não informado'}\n` +
      `📧 *Email:* ${testData.email || 'Não informado'}\n` +
      `🏢 *Empresa:* ${testData.company || 'Não informada'}\n\n` +
      `📈 *Resultados:*\n` +
      `• D (Dominância): ${testData.d_score || 0}\n` +
      `• I (Influência): ${testData.i_score || 0}\n` +
      `• S (Estabilidade): ${testData.s_score || 0}\n` +
      `• C (Conformidade): ${testData.c_score || 0}\n\n` +
      `🎯 *Perfil Dominante:* ${profileLabels[testData.dominant_profile] || 'Não definido'}\n\n` +
      `Acesse o sistema para análise completa:\n` +
      `${APP_BASE_URL}/admin/disc`;

    await sendMessage({
      number: adminPhone,
      body: message
    });
  };

  return {
    sendMessage,
    sendTaskNotification,
    sendCalendarNotification,
    sendTaskStatusNotification,
    sendProcessNotification,
    sendNPSReminder,
    sendJobCandidateNotification,
    sendDiscTestCompletedNotification,
    getUserPhoneByName,
    loading
  };
}