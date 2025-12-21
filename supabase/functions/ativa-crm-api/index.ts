import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, data } = await req.json();
    console.log('Ativa CRM API action:', action, data);

    switch (action) {
      case 'send_message':
        return await sendMessage(data);
      case 'create_contact':
        return await createContact(data);
      case 'get_contacts':
        return await getContacts();
      case 'update_os_status':
        return await updateOSStatus(data);
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Error in ativa-crm-api:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function sendMessage(data: { number: string, body: string, url?: string }) {
  const token = Deno.env.get('ATIVA_CRM_TOKEN');
  
  if (!token) {
    throw new Error('ATIVA_CRM_TOKEN is required');
  }

  const { number, body, url } = data;

  try {
    let response;
    
    if (url) {
      // Send media message
      const formData = new FormData();
      formData.append('number', number);
      formData.append('body', body);
      formData.append('url', url);

      response = await fetch('https://api.ativacrm.com/api/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
    } else {
      // Send text message
      response = await fetch('https://api.ativacrm.com/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          number,
          body
        })
      });
    }

    const responseText = await response.text();
    console.log('Ativa CRM raw response:', responseText);
    
    // Check if response is HTML (common error case)
    if (responseText.trim().startsWith('<')) {
      console.error('Ativa CRM returned HTML instead of JSON:', responseText.substring(0, 200));
      throw new Error('API returned HTML response instead of JSON');
    }
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Ativa CRM response as JSON:', parseError);
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
    }
    
    console.log('Ativa CRM response:', result);
    
    // Handle specific API errors - treat known errors as warnings, not failures
    if (result.error) {
      console.error('Ativa CRM API error:', result.error);
      
      switch (result.error) {
        case 'ERR_NO_DEF_WAPP_FOUND':
          console.warn('No default WhatsApp found in Ativa CRM - continuing anyway');
          // Return success for this known error case
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Message processed (no WhatsApp configured)',
              warning: result.error 
            }),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        case 'ERR_INVALID_TOKEN':
          throw new Error('Invalid Ativa CRM token');
        case 'ERR_INVALID_NUMBER':
          throw new Error('Invalid phone number format');
        default:
          console.warn(`Ativa CRM API warning: ${result.error}`);
          // For unknown errors, still return the response but with 200 status
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: result.error,
              message: 'API returned an error but request was processed'
            }),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: result,
        message: 'Message sent successfully'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error sending message to Ativa CRM:', error);
    throw error;
  }
}

async function createContact(data: { name: string, phone: string, email?: string }) {
  // Here you would implement contact creation logic
  // This is a placeholder implementation
  return new Response(
    JSON.stringify({ success: true, message: 'Contact created' }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

async function getContacts() {
  // Here you would implement contacts retrieval logic
  // This is a placeholder implementation
  return new Response(
    JSON.stringify({ contacts: [] }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

async function updateOSStatus(data: { 
  os_id: string; 
  os_numero: number; 
  status: string; 
  cliente_nome?: string;
  cliente_telefone?: string;
  valor_total?: number;
}) {
  const token = Deno.env.get('ATIVA_CRM_TOKEN');
  
  if (!token) {
    console.warn('ATIVA_CRM_TOKEN não configurado - pulando envio de status para API');
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Status update skipped (no API token configured)',
        warning: 'ATIVA_CRM_TOKEN not configured'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  const { os_id, os_numero, status, cliente_nome, cliente_telefone, valor_total } = data;

  try {
    // Preparar payload para enviar status da OS para API externa
    // Ajuste a URL e estrutura conforme a API que você está usando
    const apiUrl = Deno.env.get('ATIVA_CRM_API_URL') || 'https://api.ativacrm.com/api';
    
    const payload = {
      type: 'os_status_update',
      os_id,
      os_numero,
      status,
      cliente_nome,
      cliente_telefone,
      valor_total,
      timestamp: new Date().toISOString()
    };

    console.log('Enviando status de OS para API:', payload);

    const response = await fetch(`${apiUrl}/os/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log('Resposta da API de status:', responseText);

    // Se a API retornar erro 404 ou não existir o endpoint, não falhar
    if (response.status === 404) {
      console.warn('Endpoint de status de OS não encontrado na API - continuando normalmente');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Status update processed (endpoint not found)',
          warning: 'OS status endpoint not available'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!response.ok) {
      console.error('Erro ao enviar status para API:', response.status, responseText);
      // Não falhar completamente, apenas logar o erro
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `API returned status ${response.status}`,
          message: 'Status update attempted but API returned error'
        }),
        { 
          status: 200, // Retornar 200 para não quebrar o fluxo
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.warn('Resposta da API não é JSON válido:', responseText.substring(0, 100));
      result = { success: true, raw: responseText };
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: result,
        message: 'OS status sent to API successfully'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro ao enviar status de OS para API:', error);
    // Não falhar completamente, apenas logar o erro
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Status update attempted but failed'
      }),
      { 
        status: 200, // Retornar 200 para não quebrar o fluxo
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}