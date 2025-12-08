import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
  'Content-Type': 'application/json',
};

// In-memory rate limiter
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimiter.get(key);
  
  if (!record || now > record.resetAt) {
    rateLimiter.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}

function sanitizeForWhatsApp(text: string): string {
  if (!text) return 'Não informado';
  return text
    .replace(/[*_~`]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .substring(0, 500);
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
    );

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: corsHeaders }
      );
    }

    const { testSessionId } = await req.json();
    const idempotencyKey = req.headers.get('idempotency-key');
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';

    if (!testSessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: testSessionId' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Rate limiting: IP-based (5 completions per 10 minutes)
    const ipRateLimitKey = `disc_finish_${clientIp}`;
    if (!checkRateLimit(ipRateLimitKey, 5, 600000)) {
      console.log(`[DISC-FINISH] IP rate limit exceeded for ${clientIp}`);
      return new Response(
        JSON.stringify({ error: 'Too many test completion attempts. Please try again later.' }),
        { status: 429, headers: corsHeaders }
      );
    }

    console.log(`[DISC-FINISH] Processing finish for session ${testSessionId}, IP: ${clientIp}, idempotency: ${idempotencyKey}`);

    // Get current candidate response
    const { data: candidateResponse, error: fetchError } = await supabase
      .from('candidate_responses')
      .select('*')
      .eq('id', testSessionId)
      .single();

    if (fetchError) {
      console.error('[DISC-FINISH] Error fetching candidate response:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if already completed (idempotency)
    if (candidateResponse.is_completed) {
      console.log(`[DISC-FINISH] Session ${testSessionId} already completed`);
      return new Response(
        JSON.stringify({ 
          status: 'ALREADY_FINISHED',
          resultId: candidateResponse.id,
          sessionId: testSessionId
        }),
        { status: 409, headers: corsHeaders }
      );
    }

    // Calculate DISC scores
    const responses = candidateResponse.responses || [];
    
    if (responses.length < 20) {
      return new Response(
        JSON.stringify({ error: `Incomplete test. Only ${responses.length}/20 questions answered.` }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Calculate scores
    const scores = { D: 0, I: 0, S: 0, C: 0 };
    
    responses.forEach((response: any) => {
      const type = response.selectedType;
      if (type && scores.hasOwnProperty(type)) {
        scores[type]++;
      }
    });

    // Determine dominant profile
    const maxScore = Math.max(scores.D, scores.I, scores.S, scores.C);
    let dominantProfile = '';
    
    if (scores.D === maxScore) dominantProfile = 'D';
    else if (scores.I === maxScore) dominantProfile = 'I';
    else if (scores.S === maxScore) dominantProfile = 'S';
    else if (scores.C === maxScore) dominantProfile = 'C';

    // Update candidate response with completion data
    const { data: updatedResponse, error: updateError } = await supabase
      .from('candidate_responses')
      .update({
        is_completed: true,
        completion_date: new Date().toISOString(),
        d_score: scores.D,
        i_score: scores.I,
        s_score: scores.S,
        c_score: scores.C,
        dominant_profile: dominantProfile,
        updated_at: new Date().toISOString()
      })
      .eq('id', testSessionId)
      .select()
      .single();

    if (updateError) {
      console.error('[DISC-FINISH] Error updating candidate response:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to complete test' }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`[DISC-FINISH] Successfully completed test for session ${testSessionId}`);

    // Notify admins about completed DISC test
    try {
      const { data: admins } = await supabase
        .from('profiles')
        .select('phone, display_name')
        .eq('role', 'admin')
        .eq('approved', true);

      if (admins && admins.length > 0) {
        console.log(`[DISC-FINISH] Notifying ${admins.length} admins about completed test`);
        
        const profileLabels: Record<string, string> = {
          'D': 'Dominância',
          'I': 'Influência',
          'S': 'Estabilidade',
          'C': 'Conformidade'
        };

        const testType = candidateResponse.user_id ? 'Colaborador' : 'Candidato Externo';

        for (const admin of admins) {
          if (admin.phone) {
            // Rate limit notifications per admin (5 per hour)
            const notificationKey = `disc_notif_${admin.phone}`;
            if (!checkRateLimit(notificationKey, 5, 3600000)) {
              console.log(`[DISC-FINISH] Skipping notification to ${admin.display_name} - rate limit`);
              continue;
            }

            try {
              await supabase.functions.invoke('ativa-crm-api', {
                body: {
                  action: 'send_message',
                  data: {
                    number: admin.phone,
                    body: `🧠 *Teste DISC Completado!*\n\n` +
                      `📊 *Tipo:* ${testType}\n` +
                      `👤 *Nome:* ${sanitizeForWhatsApp(candidateResponse.name)}\n` +
                      `📧 *Email:* ${sanitizeForWhatsApp(candidateResponse.email)}\n` +
                      `🏢 *Empresa:* ${sanitizeForWhatsApp(candidateResponse.company)}\n\n` +
                      `📈 *Resultados:*\n` +
                      `• D (Dominância): ${scores.D}\n` +
                      `• I (Influência): ${scores.I}\n` +
                      `• S (Estabilidade): ${scores.S}\n` +
                      `• C (Conformidade): ${scores.C}\n\n` +
                      `🎯 *Perfil Dominante:* ${profileLabels[dominantProfile]}\n\n` +
                      `Acesse: http://primecelular.com/admin/disc`
                  }
                }
              });
              console.log(`[DISC-FINISH] Notification sent to admin: ${admin.display_name}`);
            } catch (notifError) {
              console.error(`[DISC-FINISH] Failed to notify admin ${admin.display_name}:`, notifError);
            }
          }
        }
      }
    } catch (error) {
      console.error('[DISC-FINISH] Error notifying admins:', error);
    }

    return new Response(
      JSON.stringify({
        status: 'FINISHED',
        resultId: updatedResponse.id,
        sessionId: testSessionId,
        scores,
        dominantProfile
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('[DISC-FINISH] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});