import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookMessage {
  id: string;
  from: string;
  body: string;
  timestamp: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video';
  url?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'POST') {
      const webhook: WebhookMessage = await req.json();
      
      console.log('Received webhook from Ativa CRM:', webhook);

      // Process received message
      // You can add logic here to:
      // 1. Store the message in database
      // 2. Update task status based on message content
      // 3. Create automatic responses
      // 4. Notify relevant users

      // Example: Store webhook data
      const { data, error } = await supabaseClient
        .from('kv_store_2c4defad')
        .upsert({
          key: `webhook_${webhook.id}`,
          value: webhook
        });

      if (error) {
        console.error('Error storing webhook:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully',
        data: webhook
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});