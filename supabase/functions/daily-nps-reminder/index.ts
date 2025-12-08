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

    console.log('Starting daily NPS reminder process...');

    // Get integration settings to check if NPS reminders are enabled
    const { data: settings } = await supabase
      .from('kv_store_2c4defad')
      .select('value')
      .eq('key', 'integration_settings')
      .single();

    const integrationSettings = settings?.value as any;
    if (!integrationSettings?.whatsappNotifications) {
      console.log('WhatsApp notifications disabled');
      return new Response(JSON.stringify({ message: 'WhatsApp notifications disabled' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!integrationSettings.notificationEvents?.includes('nps_daily_reminder')) {
      console.log('NPS daily reminders disabled');
      return new Response(JSON.stringify({ message: 'NPS daily reminders disabled' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if it's Sunday (0 = Sunday) - block NPS notifications on Sundays
    const todayDate = new Date();
    const dayOfWeek = todayDate.getDay();
    
    if (dayOfWeek === 0) {
      console.log('Sunday detected - NPS reminders blocked');
      return new Response(JSON.stringify({ 
        message: 'NPS reminders blocked on Sunday',
        day: 'Sunday',
        blocked: true
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('NPS reminder process running on weekdays');

    // Get only approved admin users with phone numbers
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('display_name, phone, user_id')
      .eq('approved', true)
      .eq('role', 'admin')
      .not('phone', 'is', null);

    if (error) {
      throw error;
    }

    console.log(`Found ${profiles?.length || 0} users with phone numbers`);

    // Check today's date
    const todayString = new Date().toISOString().split('T')[0];

    let sentCount = 0;
    let errorCount = 0;

    // Send NPS reminder to each user who hasn't responded today
    for (const profile of profiles || []) {
      try {
        // Check if user already responded to NPS today
        const { data: todayResponse } = await supabase
          .from('nps_responses')
          .select('id')
          .eq('user_id', profile.user_id)
          .eq('date', todayString)
          .maybeSingle();

        if (todayResponse) {
          console.log(`User ${profile.display_name} already responded today, skipping...`);
          continue;
        }

        // Send WhatsApp reminder  
        const message = `🌟 *Lembrete NPS Diário*\n\nOlá ${profile.display_name}! 👋\n\nÉ hora de avaliar seu dia no trabalho.\n\nPor favor, acesse o sistema e responda nossa pesquisa NPS diária.\n\n🔗 *Link:* http://primecelular.com/nps\n\nSua opinião é muito importante para nós! 💙`;

        const { data: messageResult, error: messageError } = await supabase.functions.invoke('ativa-crm-api', {
          body: {
            action: 'send_message',
            data: {
              number: profile.phone,
              body: message
            }
          }
        });

        if (messageError) {
          console.error(`Error sending NPS reminder to ${profile.display_name}:`, messageError);
          errorCount++;
        } else if (messageResult && messageResult.warning === 'ERR_NO_DEF_WAPP_FOUND') {
          console.warn(`WhatsApp not configured for ${profile.display_name} - message processed but not sent`);
          errorCount++;
        } else {
          console.log(`NPS reminder sent successfully to ${profile.display_name}`);
          sentCount++;
        }

      } catch (userError) {
        console.error(`Error processing user ${profile.display_name}:`, userError);
        errorCount++;
      }
    }

    const result = {
      message: `NPS daily reminders completed`,
      sent: sentCount,
      errors: errorCount,
      total: profiles?.length || 0,
      details: errorCount > 0 ? 'Some messages failed - check if WhatsApp is configured in Ativa CRM' : 'All messages processed successfully'
    };

    console.log('NPS reminder summary:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in daily-nps-reminder:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});