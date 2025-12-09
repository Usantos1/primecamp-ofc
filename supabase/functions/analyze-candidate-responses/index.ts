import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

interface AnalyzeRequest {
  job_response_id: string;
  survey_id: string;
  candidate: {
    name: string;
    email: string;
    age?: number | null;
    phone?: string | null;
    responses: Record<string, any>;
    disc_final?: {
      d_score: number;
      i_score: number;
      s_score: number;
      c_score: number;
      dominant_profile: string;
    } | null;
  };
  job: {
    title: string;
    position_title: string;
    description?: string;
    department?: string;
    requirements?: string[];
    work_modality?: string;
    contract_type?: string;
    seniority?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: corsHeaders }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const { job_response_id, survey_id, candidate, job }: AnalyzeRequest = await req.json();

    if (!job_response_id || !candidate?.name || !job?.title) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const responsesText = Object.entries(candidate.responses || {})
      .map(([key, value]) => {
        const val = Array.isArray(value) ? value.join(', ') : String(value);
        return `Q${key}: ${val}`;
      })
      .join('\n');

    const discInfo = candidate.disc_final
      ? `\nDISC FINAL: D ${candidate.disc_final.d_score}, I ${candidate.disc_final.i_score}, S ${candidate.disc_final.s_score}, C ${candidate.disc_final.c_score}, Perfil: ${candidate.disc_final.dominant_profile}`
      : '\nDISC FINAL: não realizado';

    const prompt = `Você é um especialista em recrutamento. Avalie o candidato apenas com base nas respostas do formulário (triagem escrita).

VAGA:
- Título: ${job.title}
- Cargo: ${job.position_title}
- Descrição: ${job.description || 'Não informada'}
- Departamento: ${job.department || 'Não informado'}
- Requisitos: ${Array.isArray(job.requirements) ? job.requirements.join(', ') : 'Não informados'}
- Modalidade: ${job.work_modality || 'Não informada'}
- Contrato: ${job.contract_type || 'Não informado'}
- Senioridade: ${job.seniority || 'Não informada'}

CANDIDATO:
- Nome: ${candidate.name}
- Email: ${candidate.email}
- Idade: ${candidate.age || 'não informada'}
- Telefone: ${candidate.phone || 'não informado'}
${discInfo}

RESPOSTAS DO FORMULÁRIO:
${responsesText}

INSTRUÇÕES:
- Responda em JSON válido.
- Inferir perfil DISC apenas a partir das respostas escritas (se DISC final não existir).
- Avaliar clareza/escrita, comprometimento, veracidade (inconsistências, exageros), fit com vaga.
- Incluir red_flags curtas se houver.

FORMATO:
{
  "disc_inferido": { "d": 0-100, "i": 0-100, "s": 0-100, "c": 0-100, "dominante": "D|I|S|C" },
  "scores": {
    "comprometimento": 0-100,
    "escrita": 0-100,
    "veracidade": 0-100,
    "fit": 0-100
  },
  "perfil_resumo": "texto curto (2-3 frases)",
  "red_flags": ["flag1","flag2"],
  "chances_sucesso": 0-100,
  "recomendacao": "APROVAR" | "ANALISAR" | "REPROVAR",
  "sugestoes_followup": ["pergunta 1","pergunta 2"]
}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é direto e responde apenas JSON válido.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6,
        response_format: { type: 'json_object' }
      })
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      console.error('[ANALYZE-CANDIDATE-RESPONSES] OpenAI error:', errText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content from OpenAI');

    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (err) {
      console.error('[ANALYZE-CANDIDATE-RESPONSES] parse error:', content);
      throw new Error('Invalid JSON from OpenAI');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Persistir no job_candidate_ai_analysis (reutilizando tabela existente)
    await supabase
      .from('job_candidate_ai_analysis')
      .upsert({
        job_response_id,
        survey_id,
        analysis_data: analysis,
        raw_analysis: content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'job_response_id' });

    // Guardar também no job_responses (campo ai_analysis)
    await supabase
      .from('job_responses')
      .update({
        ai_analysis: analysis,
        updated_at: new Date().toISOString()
      })
      .eq('id', job_response_id);

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[ANALYZE-CANDIDATE-RESPONSES] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to analyze candidate' }),
      { status: 500, headers: corsHeaders }
    );
  }
});

