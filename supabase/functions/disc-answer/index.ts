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

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: corsHeaders }
      );
    }

    const { sessionId, testSessionId, questionId, choiceId, selectedType } = await req.json();

    // Support both parameter formats for compatibility
    const actualSessionId = sessionId || testSessionId;
    const actualChoiceId = choiceId || selectedType;

    if (!actualSessionId || !questionId || !actualChoiceId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: sessionId (or testSessionId), questionId, choiceId (or selectedType)' }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`[DISC-ANSWER] Processing answer for session ${actualSessionId}, question ${questionId}, choice ${actualChoiceId}`);

    // Get current candidate response
    const { data: candidateResponse, error: fetchError } = await supabase
      .from('candidate_responses')
      .select('*')
      .eq('id', actualSessionId)
      .single();

    if (fetchError || !candidateResponse) {
      console.error('[DISC-ANSWER] Error fetching candidate response:', fetchError);
      console.error('[DISC-ANSWER] Session ID:', testSessionId);
      
      // Check if it's a "not found" error
      if (fetchError?.code === 'PGRST116' || !candidateResponse) {
        return new Response(
          JSON.stringify({ 
            error: 'Session not found', 
            sessionId: actualSessionId,
            details: 'The test session ID does not exist or has been removed.'
          }),
          { status: 404, headers: corsHeaders }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Database error', details: fetchError?.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Parse existing responses
    const existingResponses = candidateResponse.responses || [];
    
    // Ensure existingResponses is an array
    const responsesArray = Array.isArray(existingResponses) ? existingResponses : [];
    
    // Remove any existing response for this question (prevent duplicates)
    const filteredResponses = responsesArray.filter((r: any) => r.questionId !== questionId);
    
    // Add new response
    const newResponse = {
      questionId,
      selectedType: actualChoiceId,
      timestamp: new Date().toISOString()
    };
    
    const updatedResponses = [...filteredResponses, newResponse];

    // Update the candidate response
    const { error: updateError } = await supabase
      .from('candidate_responses')
      .update({
        responses: updatedResponses,
        updated_at: new Date().toISOString()
      })
      .eq('id', actualSessionId);

    if (updateError) {
      console.error('[DISC-ANSWER] Error updating candidate response:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save answer' }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`[DISC-ANSWER] Successfully saved answer for session ${actualSessionId}, question ${questionId}`);

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: actualSessionId,
        questionId,
        totalResponses: updatedResponses.length
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('[DISC-ANSWER] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});