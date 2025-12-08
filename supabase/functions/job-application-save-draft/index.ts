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

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: corsHeaders }
      );
    }

    const {
      survey_id,
      email,
      name,
      phone,
      age,
      cep,
      address,
      whatsapp,
      instagram,
      linkedin,
      responses,
      current_step,
      form_data
    } = await req.json();

    // Validate required fields
    if (!survey_id || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: survey_id, email' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Check if draft already exists
    const { data: existingDraft } = await supabase
      .from('job_application_drafts')
      .select('id')
      .eq('survey_id', survey_id)
      .eq('email', normalizedEmail)
      .single();

    const draftData = {
      survey_id,
      email: normalizedEmail,
      name: name?.trim() || null,
      phone: phone?.trim() || null,
      age: age || null,
      cep: cep?.trim() || null,
      address: address?.trim() || null,
      whatsapp: whatsapp?.trim() || null,
      instagram: instagram?.trim() || null,
      linkedin: linkedin?.trim() || null,
      responses: responses || {},
      current_step: current_step || 0,
      form_data: form_data || {}
    };

    let result;
    if (existingDraft) {
      // Update existing draft
      const { data, error } = await supabase
        .from('job_application_drafts')
        .update(draftData)
        .eq('id', existingDraft.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new draft
      const { data, error } = await supabase
        .from('job_application_drafts')
        .insert(draftData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return new Response(
      JSON.stringify({
        success: true,
        draft_id: result.id,
        message: 'Draft saved successfully'
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('[JOB-SAVE-DRAFT] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to save draft', details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});

