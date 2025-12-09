import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

interface GenerateJobAssetsRequest {
  job: {
    title: string;
    position_title: string;
    description?: string;
    department?: string;
    requirements?: string[];
    work_modality?: string;
    contract_type?: string;
    location?: string;
  };
  provider?: 'openai';
  apiKey?: string;
  locale?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
    }

    const { job, provider = 'openai', apiKey, locale = 'pt-BR' }: GenerateJobAssetsRequest = await req.json();

    if (!job?.title || !job?.position_title) {
      return new Response(JSON.stringify({ error: 'Missing job title or position_title' }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openaiKey = apiKey || Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey || provider !== 'openai') {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), { status: 500, headers: corsHeaders });
    }

    const prompt = `Você é um especialista em RH. Gere textos curtos e objetivos em ${locale}.
Dados da vaga:
- Título: ${job.title}
- Cargo: ${job.position_title}
- Descrição atual: ${job.description || 'não informada'}
- Departamento: ${job.department || 'não informado'}
- Requisitos: ${Array.isArray(job.requirements) ? job.requirements.join(', ') : 'não informados'}
- Modalidade: ${job.work_modality || 'não informada'}
- Contrato: ${job.contract_type || 'não informado'}
- Local: ${job.location || 'não informado'}

Responda em JSON:
{
  "description": "Resumo atraente (4-6 frases)",
  "responsibilities": ["bullet 1","bullet 2","bullet 3","bullet 4"],
  "requirements": ["req 1","req 2","req 3"],
  "work_schedule": "Texto curto de horários/modo de trabalho",
  "salary_range": "Faixa salarial se houver; senão sugestão",
  "slug_suggestion": "slug-kebab-case-curto"
}`;

    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Responda somente JSON válido.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6,
        response_format: { type: 'json_object' }
      })
    });

    if (!completion.ok) {
      const errTxt = await completion.text();
      console.error('[GENERATE-JOB-ASSETS] OpenAI error:', errTxt);
      throw new Error(`OpenAI error: ${completion.status}`);
    }

    const data = await completion.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty AI response');

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error('[GENERATE-JOB-ASSETS] parse error:', content);
      throw new Error('Invalid JSON from AI');
    }

    // opcional: salvar histórico
    await supabase.from('job_assets_logs').insert({
      payload: job,
      provider,
      created_at: new Date().toISOString(),
    }).catch(() => {});

    return new Response(JSON.stringify({ success: true, assets: parsed }), { headers: corsHeaders });
  } catch (error: any) {
    console.error('[GENERATE-JOB-ASSETS] Error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Failed to generate job assets' }), { status: 500, headers: corsHeaders });
  }
});

