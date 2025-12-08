import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    if (req.method !== 'GET' && req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: corsHeaders }
      );
    }

    let sessionId;
    
    // Try to get sessionId from URL path first (for direct GET requests)
    const urlPath = new URL(req.url).pathname;
    const pathSessionId = urlPath.split('/').pop();
    
    // If it's a POST with body, try to get sessionId from body
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        sessionId = body.sessionId;
      } catch (e) {
        // Fallback to URL path
        sessionId = pathSessionId;
      }
    } else {
      sessionId = pathSessionId;
    }

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing session ID' }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`[DISC-STATUS] Checking status for session ${sessionId}`);

    // Get candidate response
    const { data: candidateResponse, error: fetchError } = await supabase
      .from('candidate_responses')
      .select('id, test_id, is_completed, completion_date, responses')
      .eq('id', sessionId)
      .single();

    if (fetchError) {
      console.error('[DISC-STATUS] Error fetching candidate response:', fetchError);
      return new Response(
        JSON.stringify({ 
          status: 'NOT_FOUND',
          sessionId,
          error: 'Session not found'
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Determine status
    let status = 'NOT_STARTED';
    const responses = candidateResponse.responses || [];
    
    if (candidateResponse.is_completed) {
      status = 'FINISHED';
    } else if (responses.length > 0) {
      status = 'IN_PROGRESS';
    }

    console.log(`[DISC-STATUS] Session ${sessionId} status: ${status}, responses: ${responses.length}/20`);

    return new Response(
      JSON.stringify({
        status,
        sessionId,
        resultId: candidateResponse.is_completed ? candidateResponse.id : null,
        totalResponses: responses.length,
        isCompleted: candidateResponse.is_completed,
        completionDate: candidateResponse.completion_date
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('[DISC-STATUS] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        status: 'ERROR',
        error: 'Internal server error'
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});