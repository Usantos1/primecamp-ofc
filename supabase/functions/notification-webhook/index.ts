import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { 
      type, 
      user_id, 
      data, 
      webhook_url,
      notification_message 
    } = await req.json()

    // Log the notification activity
    await supabaseClient.rpc('log_user_activity', {
      p_user_id: user_id,
      p_activity_type: 'notification',
      p_description: `Webhook triggered: ${type}`,
      p_entity_type: type,
      p_entity_id: data?.id || null
    });

    // Prepare notification payload
    const notificationPayload = {
      timestamp: new Date().toISOString(),
      type: type,
      user_id: user_id,
      message: notification_message,
      data: data,
      source: 'supabase-system'
    };

    // Send to external webhook if provided
    if (webhook_url) {
      try {
        const webhookResponse = await fetch(webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(notificationPayload)
        });

        console.log('Webhook response status:', webhookResponse.status);
      } catch (webhookError) {
        console.error('Webhook error:', webhookError);
      }
    }

    // Store notification in database for internal tracking
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: user_id,
        type: type,
        message: notification_message,
        data: data,
        webhook_url: webhook_url,
        status: 'sent'
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent successfully',
        payload: notificationPayload 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})