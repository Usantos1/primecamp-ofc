import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Bill {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  supplier?: string;
  reminder_sent: boolean;
}

interface IntegrationSettings {
  whatsappApiUrl?: string;
  whatsappApiKey?: string;
  whatsappInstance?: string;
  adminPhones?: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar configurações de integração
    const { data: settingsData } = await supabase
      .from('kv_store_2c4defad')
      .select('value')
      .eq('key', 'integration_settings')
      .single();

    const settings = settingsData?.value as IntegrationSettings || {};

    if (!settings.whatsappApiUrl || !settings.whatsappApiKey) {
      console.log('WhatsApp API não configurada');
      return new Response(
        JSON.stringify({ message: 'WhatsApp API não configurada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar contas vencendo nos próximos 3 dias que ainda não foram notificadas
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    const { data: billsDueSoon, error: billsError } = await supabase
      .from('bills_to_pay')
      .select('*')
      .eq('status', 'pendente')
      .eq('reminder_sent', false)
      .lte('due_date', threeDaysFromNow.toISOString().split('T')[0])
      .order('due_date', { ascending: true });

    if (billsError) {
      throw billsError;
    }

    if (!billsDueSoon || billsDueSoon.length === 0) {
      console.log('Nenhuma conta vencendo em breve');
      return new Response(
        JSON.stringify({ message: 'Nenhuma conta vencendo em breve', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Encontradas ${billsDueSoon.length} contas vencendo em breve`);

    // Buscar telefones dos admins
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('phone, name')
      .eq('role', 'admin');

    const adminPhones = settings.adminPhones || 
      adminProfiles?.map(p => p.phone).filter(Boolean) || [];

    if (adminPhones.length === 0) {
      console.log('Nenhum telefone de admin configurado');
      return new Response(
        JSON.stringify({ message: 'Nenhum telefone de admin configurado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const bill of billsDueSoon as Bill[]) {
      const daysUntilDue = Math.ceil(
        (new Date(bill.due_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      let alertType = 'vencimento_proximo';
      let urgencyText = '';

      if (daysUntilDue < 0) {
        alertType = 'vencido';
        urgencyText = `⚠️ *VENCIDO HÁ ${Math.abs(daysUntilDue)} DIA(S)*`;
      } else if (daysUntilDue === 0) {
        alertType = 'vencimento_proximo';
        urgencyText = '🔴 *VENCE HOJE*';
      } else if (daysUntilDue === 1) {
        urgencyText = '🟠 *VENCE AMANHÃ*';
      } else {
        urgencyText = `🟡 *VENCE EM ${daysUntilDue} DIAS*`;
      }

      const message = `
📋 *ALERTA FINANCEIRO - PrimeCamp*

${urgencyText}

💰 *Conta:* ${bill.description}
💵 *Valor:* R$ ${bill.amount.toFixed(2).replace('.', ',')}
📅 *Vencimento:* ${new Date(bill.due_date).toLocaleDateString('pt-BR')}
${bill.supplier ? `🏪 *Fornecedor:* ${bill.supplier}` : ''}

_Acesse o sistema para mais detalhes._
      `.trim();

      // Enviar para cada admin
      for (const phone of adminPhones) {
        try {
          const cleanPhone = phone.replace(/\D/g, '');
          const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

          const response = await fetch(`${settings.whatsappApiUrl}/message/sendText/${settings.whatsappInstance}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': settings.whatsappApiKey,
            },
            body: JSON.stringify({
              number: formattedPhone,
              text: message,
            }),
          });

          const responseData = await response.json();

          // Registrar alerta
          await supabase.from('financial_alerts').insert({
            bill_id: bill.id,
            alert_type: alertType,
            message: message,
            sent_via: 'whatsapp',
            sent_to: phone,
            sent_at: new Date().toISOString(),
            status: response.ok ? 'enviado' : 'erro',
            error_message: response.ok ? null : JSON.stringify(responseData),
          });

          if (response.ok) {
            results.push({ bill_id: bill.id, phone, status: 'success' });
          } else {
            results.push({ bill_id: bill.id, phone, status: 'error', error: responseData });
          }
        } catch (err: any) {
          console.error(`Erro ao enviar para ${phone}:`, err);
          results.push({ bill_id: bill.id, phone, status: 'error', error: err.message });
        }
      }

      // Marcar conta como notificada
      await supabase
        .from('bills_to_pay')
        .update({ 
          reminder_sent: true, 
          reminder_sent_at: new Date().toISOString() 
        })
        .eq('id', bill.id);
    }

    console.log('Alertas processados:', results);

    return new Response(
      JSON.stringify({ 
        message: 'Alertas processados',
        bills_processed: billsDueSoon.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro ao processar alertas:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

