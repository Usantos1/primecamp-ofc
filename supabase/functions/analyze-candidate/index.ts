import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
};

interface AnalysisRequest {
  job_response_id: string;
  survey_id: string;
  candidate_data: {
    name: string;
    email: string;
    age?: number;
    phone?: string;
    responses: Record<string, any>;
    disc_profile?: {
      d_score: number;
      i_score: number;
      s_score: number;
      c_score: number;
      dominant_profile: string;
    };
  };
  job_data: {
    title: string;
    position_title: string;
    description?: string;
    requirements?: string[];
    work_modality?: string;
    contract_type?: string;
  };
}

serve(async (req) => {
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

    const { job_response_id, survey_id, candidate_data, job_data }: AnalysisRequest = await req.json();

    if (!job_response_id || !candidate_data || !job_data) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('[ANALYZE-CANDIDATE] OpenAI API key not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Preparar dados para análise
    const responsesText = Object.entries(candidate_data.responses || {})
      .map(([key, value]) => {
        const val = Array.isArray(value) ? value.join(', ') : String(value);
        return `Pergunta ${key}: ${val}`;
      })
      .join('\n');

    const discInfo = candidate_data.disc_profile
      ? `\n\nPerfil DISC:\n- Dominante (D): ${candidate_data.disc_profile.d_score}\n- Influente (I): ${candidate_data.disc_profile.i_score}\n- Estável (S): ${candidate_data.disc_profile.s_score}\n- Consciencioso (C): ${candidate_data.disc_profile.c_score}\n- Perfil Dominante: ${candidate_data.disc_profile.dominant_profile}`
      : '\n\nPerfil DISC: Não realizado';

    const jobRequirements = job_data.requirements?.join(', ') || 'Não especificado';

    const prompt = `Você é um especialista em recrutamento e seleção. Analise o candidato abaixo e forneça uma avaliação detalhada.

VAGA:
- Título: ${job_data.title}
- Cargo: ${job_data.position_title}
- Descrição: ${job_data.description || 'Não fornecida'}
- Requisitos: ${jobRequirements}
- Modalidade: ${job_data.work_modality || 'Não especificada'}
- Tipo de Contrato: ${job_data.contract_type || 'Não especificado'}

CANDIDATO:
- Nome: ${candidate_data.name}
- Idade: ${candidate_data.age || 'Não informada'}
- Email: ${candidate_data.email}
${discInfo}

RESPOSTAS DO FORMULÁRIO:
${responsesText}

Forneça uma análise detalhada em formato JSON com os seguintes campos:
{
  "perfil_comportamental": "Análise do perfil comportamental baseado nas respostas e DISC",
  "comprometimento": "Avaliação do nível de comprometimento (0-100)",
  "experiencia": "Análise da experiência e qualificações",
  "chances_sucesso": "Probabilidade de sucesso na vaga (0-100)",
  "pontos_fortes": ["ponto 1", "ponto 2", "ponto 3"],
  "pontos_fracos": ["ponto 1", "ponto 2"],
  "recomendacao": "APROVADO", "REPROVADO" ou "ANÁLISE_MANUAL",
  "justificativa": "Justificativa detalhada da recomendação",
  "sugestoes_entrevista": ["pergunta 1", "pergunta 2", "pergunta 3"],
  "area_recomendada": "Técnica", "Atendimento", "Vendas" ou "Outra",
  "score_geral": 0-100
}

Seja objetivo, profissional e baseie-se apenas nos dados fornecidos.`;

    // Chamar OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em recrutamento e seleção. Sempre responda em formato JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('[ANALYZE-CANDIDATE] OpenAI error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const analysisText = openaiData.choices[0]?.message?.content;

    if (!analysisText) {
      throw new Error('No response from OpenAI');
    }

    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (e) {
      console.error('[ANALYZE-CANDIDATE] Failed to parse OpenAI response:', analysisText);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Salvar análise no banco
    const { data: analysisRecord, error: saveError } = await supabase
      .from('job_candidate_ai_analysis')
      .upsert({
        job_response_id,
        survey_id,
        analysis_data: analysis,
        raw_analysis: analysisText,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'job_response_id'
      })
      .select()
      .single();

    if (saveError) {
      console.error('[ANALYZE-CANDIDATE] Error saving analysis:', saveError);
      // Não falhar se não conseguir salvar, apenas logar
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        analysis_id: analysisRecord?.id
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('[ANALYZE-CANDIDATE] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to analyze candidate', 
        details: error.message 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

