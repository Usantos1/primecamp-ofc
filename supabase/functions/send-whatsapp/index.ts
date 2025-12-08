import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppMessage {
  number: string;
  body: string;
  url?: string; // For media messages
}

interface TaskNotification {
  taskId: string;
  taskName: string;
  deadline: string;
  responsibleUser: string;
  processName?: string;
}

interface EventNotification {
  eventId: string;
  eventTitle: string;
  startTime: string;
  location?: string;
  attendees: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  try {
    const ativaToken = Deno.env.get('ATIVA_CRM_TOKEN');
    
    if (!ativaToken) {
      return new Response(JSON.stringify({ error: 'Ativa CRM token not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const body = await req.json();
    const { type, data } = body;

    let message: WhatsAppMessage;

    switch (type) {
      case 'task_assigned':
        const taskData: TaskNotification = data;
        message = {
          number: taskData.responsibleUser,
          body: `🎯 *Nova tarefa atribuída!*\n\n` +
                `📋 *Tarefa:* ${taskData.taskName}\n` +
                `⏰ *Prazo:* ${new Date(taskData.deadline).toLocaleString('pt-BR')}\n` +
                `${taskData.processName ? `📁 *Processo:* ${taskData.processName}\n` : ''}` +
                `\n🔗 Acesse o sistema para mais detalhes: ${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.app') || 'https://app.primecamp.com'}`
        };
        break;

      case 'event_reminder':
        const eventData: EventNotification = data;
        message = {
          number: eventData.attendees[0], // Send to first attendee for now
          body: `📅 *Lembrete de evento!*\n\n` +
                `🎭 *Evento:* ${eventData.eventTitle}\n` +
                `⏰ *Início:* ${new Date(eventData.startTime).toLocaleString('pt-BR')}\n` +
                `${eventData.location ? `📍 *Local:* ${eventData.location}\n` : ''}` +
                `👥 *Participantes:* ${eventData.attendees.join(', ')}\n` +
                `\n🔗 Acesse o sistema: ${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.app') || 'https://app.primecamp.com'}`
        };
        break;

      case 'custom_message':
        message = data as WhatsAppMessage;
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid message type' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }

    // Send message to Ativa CRM API
    const ativaResponse = await fetch('https://api.ativacrm.com/api/messages/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ativaToken}`
      },
      body: JSON.stringify({
        number: message.number,
        body: message.body,
        ...(message.url && { url: message.url })
      })
    });

    const responseData = await ativaResponse.json();

    if (!ativaResponse.ok) {
      console.error('Ativa CRM API Error:', responseData);
      return new Response(JSON.stringify({ 
        error: 'Failed to send WhatsApp message',
        details: responseData 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    console.log('WhatsApp message sent successfully:', {
      number: message.number,
      type,
      response: responseData
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'WhatsApp message sent successfully',
      ativaResponse: responseData
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});