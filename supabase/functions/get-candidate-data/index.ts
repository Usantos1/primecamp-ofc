import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: corsHeaders }
      );
    }

    // Extract protocol from URL params
    const url = new URL(req.url);
    const protocol = url.searchParams.get('protocol');

    if (!protocol) {
      return new Response(
        JSON.stringify({ error: 'Protocol parameter is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`[GET-CANDIDATE] Searching for protocol: ${protocol}`);

    // Extract protocol part (remove "APP-" prefix)
    const protocolPart = protocol.replace('APP-', '').toLowerCase();
    
    // Fetch all job responses (using service role key for access)
    const { data: jobResponses, error } = await supabase
      .from('job_responses')
      .select('id, name, age, email, whatsapp, phone')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET-CANDIDATE] Error fetching job responses:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to search candidate data' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Find the matching job response by protocol
    const jobResponse = jobResponses?.find(response => {
      const responseProtocol = response.id.split('-')[0].toLowerCase();
      return responseProtocol === protocolPart;
    });

    if (!jobResponse) {
      console.log(`[GET-CANDIDATE] No candidate found for protocol: ${protocol}`);
      return new Response(
        JSON.stringify({ error: 'Candidate not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    console.log(`[GET-CANDIDATE] Found candidate: ${jobResponse.name}`);

    // Return only the necessary data
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          name: jobResponse.name,
          age: jobResponse.age,
          email: jobResponse.email,
          whatsapp: jobResponse.whatsapp || jobResponse.phone,
        }
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('[GET-CANDIDATE] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});