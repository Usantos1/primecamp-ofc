import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key, x-csrf-token',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
};

// In-memory rate limiter (for production, use Redis or KV store)
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

function validateInput(data: any): { valid: boolean; error?: string } {
  const { name, email, phone, age, address, cep, whatsapp, instagram, linkedin, responses } = data;
  
  // Length checks
  if (name?.length > 200) return { valid: false, error: 'Name exceeds 200 characters' };
  if (email?.length > 255) return { valid: false, error: 'Email exceeds 255 characters' };
  if (phone && phone.length > 20) return { valid: false, error: 'Phone exceeds 20 characters' };
  if (address && address.length > 500) return { valid: false, error: 'Address exceeds 500 characters' };
  if (whatsapp && whatsapp.length > 20) return { valid: false, error: 'WhatsApp exceeds 20 characters' };
  if (instagram && instagram.length > 100) return { valid: false, error: 'Instagram exceeds 100 characters' };
  if (linkedin && linkedin.length > 200) return { valid: false, error: 'LinkedIn exceeds 200 characters' };
  
  // Format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return { valid: false, error: 'Invalid email format' };
  
  if (age && (age < 16 || age > 100)) {
    return { valid: false, error: 'Age must be between 16 and 100' };
  }
  
  if (cep && !/^\d{5}-?\d{3}$/.test(cep)) {
    return { valid: false, error: 'Invalid CEP format' };
  }
  
  if (phone && !/^\+?[0-9\s\-()]{10,20}$/.test(phone)) {
    return { valid: false, error: 'Invalid phone format' };
  }
  
  if (whatsapp && !/^\+?[0-9\s\-()]{10,20}$/.test(whatsapp)) {
    return { valid: false, error: 'Invalid WhatsApp format' };
  }
  
  // JSONB size check
  if (responses && JSON.stringify(responses).length > 100000) {
    return { valid: false, error: 'Response data too large (max 100KB)' };
  }
  
  return { valid: true };
}

function sanitizeForWhatsApp(text: string): string {
  if (!text) return '';
  return text
    .replace(/[*_~`]/g, '') // Remove WhatsApp formatting chars
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
    .substring(0, 500); // Limit message length
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

    const requestBody = await req.json();
    const idempotencyKey = req.headers.get('idempotency-key');
    const origin = req.headers.get('origin') || 'unknown';
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';

    console.log(`[JOB-SUBMIT] Processing submission from ${origin}, IP: ${clientIp}, idempotency: ${idempotencyKey}`);

    const {
      survey_id,
      name,
      email,
      phone,
      age,
      address,
      cep,
      whatsapp,
      instagram,
      linkedin,
      responses
    } = requestBody;

    // Validate required fields
    if (!survey_id || !name || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: survey_id, name, email' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Comprehensive input validation
    const validation = validateInput(requestBody);
    if (!validation.valid) {
      console.log(`[JOB-SUBMIT] Validation failed: ${validation.error}`);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Rate limiting: IP-based (10 requests per 10 minutes)
    const ipRateLimitKey = `ip_${clientIp}`;
    if (!checkRateLimit(ipRateLimitKey, 10, 600000)) {
      console.log(`[JOB-SUBMIT] IP rate limit exceeded for ${clientIp}`);
      return new Response(
        JSON.stringify({ error: 'Too many requests from your IP. Please try again later.' }),
        { status: 429, headers: corsHeaders }
      );
    }

    // Rate limiting: Email-based (3 submissions per email per hour)
    const emailRateLimitKey = `job_submit_${email}_${survey_id}`;
    if (!checkRateLimit(emailRateLimitKey, 3, 3600000)) {
      console.log(`[JOB-SUBMIT] Email rate limit exceeded for ${email}`);
      return new Response(
        JSON.stringify({ error: 'You have already submitted multiple applications. Please try again later.' }),
        { status: 429, headers: corsHeaders }
      );
    }

    // Verify survey exists and is active
    const { data: survey, error: surveyError } = await supabase
      .from('job_surveys')
      .select('id, title, is_active')
      .eq('id', survey_id)
      .single();

    if (surveyError || !survey) {
      console.error('[JOB-SUBMIT] Survey not found:', surveyError);
      return new Response(
        JSON.stringify({ error: 'Survey not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    if (!survey.is_active) {
      return new Response(
        JSON.stringify({ error: 'Survey is no longer active' }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`[JOB-SUBMIT] Processing new submission for ${email}, survey_id=${survey_id}`);

    // Insert new job response
    const { data: newResponse, error: insertError } = await supabase
      .from('job_responses')
      .insert({
        survey_id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        age: age || null,
        address: address?.trim() || null,
        cep: cep?.trim() || null,
        whatsapp: whatsapp?.trim() || null,
        instagram: instagram?.trim() || null,
        linkedin: linkedin?.trim() || null,
        responses: responses || {}
      })
      .select()
      .single();

    if (insertError) {
      console.error('[JOB-SUBMIT] Error inserting job response:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to submit application' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Generate protocol
    const protocol = `APP-${newResponse.id.split('-')[0].toUpperCase()}`;

    console.log(`[JOB-SUBMIT] Successfully submitted application for ${email}, protocol: ${protocol}`);

    // Notify admins about new candidate (with rate limiting)
    try {
      const { data: admins } = await supabase
        .from('profiles')
        .select('phone, display_name')
        .eq('role', 'admin')
        .eq('approved', true);

      if (admins && admins.length > 0) {
        console.log(`[JOB-SUBMIT] Notifying ${admins.length} admins about new candidate`);
        
        for (const admin of admins) {
          if (admin.phone) {
            // Rate limit notifications per admin (10 per hour)
            const notificationKey = `admin_notif_${admin.phone}`;
            if (!checkRateLimit(notificationKey, 10, 3600000)) {
              console.log(`[JOB-SUBMIT] Skipping notification to ${admin.display_name} - rate limit`);
              continue;
            }

            try {
              const message = `🎯 *Novo Candidato!*\n\n` +
                `📋 *Vaga:* ${sanitizeForWhatsApp(survey.title)}\n` +
                `👤 *Nome:* ${sanitizeForWhatsApp(name)}\n` +
                `📧 *Email:* ${sanitizeForWhatsApp(email)}\n` +
                `📞 *Telefone:* ${sanitizeForWhatsApp(phone || 'Não informado')}\n` +
                `💬 *WhatsApp:* ${sanitizeForWhatsApp(whatsapp || 'Não informado')}\n` +
                `📸 *Instagram:* ${sanitizeForWhatsApp(instagram || 'Não informado')}\n` +
                `🎂 *Idade:* ${age || 'Não informada'}\n` +
                `📍 *Endereço:* ${sanitizeForWhatsApp(address || 'Não informado')}\n` +
                `📮 *CEP:* ${sanitizeForWhatsApp(cep || 'Não informado')}\n` +
                `🔗 *Protocolo:* ${protocol}\n\n` +
                `Acesse: http://primecelular.com/admin/vagas`;

              await supabase.functions.invoke('ativa-crm-api', {
                body: {
                  action: 'send_message',
                  data: {
                    number: admin.phone,
                    body: message
                  }
                }
              });
              console.log(`[JOB-SUBMIT] Notification sent to admin: ${admin.display_name}`);
            } catch (notifError) {
              console.error(`[JOB-SUBMIT] Failed to notify admin ${admin.display_name}:`, notifError);
            }
          }
        }
      }
    } catch (error) {
      console.error('[JOB-SUBMIT] Error notifying admins:', error);
    }

    return new Response(
      JSON.stringify({
        status: 'SUCCESS',
        protocol,
        submissionId: newResponse.id,
        surveyTitle: survey.title,
        submittedAt: newResponse.created_at,
        message: 'Application submitted successfully'
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('[JOB-SUBMIT] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
