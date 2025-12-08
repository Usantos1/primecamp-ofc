import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

interface GenerateQuestionsRequest {
  job_response_id: string;
  survey_id: string;
  interview_type: 'online' | 'presencial';
  ai_analysis?: any; // Análise de IA existente do candidato
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

    const { job_response_id, survey_id, interview_type, ai_analysis }: GenerateQuestionsRequest = await req.json();

    if (!job_response_id || !survey_id || !interview_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Buscar dados do candidato e da vaga
    const { data: jobResponse, error: responseError } = await supabase
      .from('job_responses')
      .select('*')
      .eq('id', job_response_id)
      .single();

    const { data: jobSurvey, error: surveyError } = await supabase
      .from('job_surveys')
      .select('*')
      .eq('id', survey_id)
      .single();

    if (responseError || !jobResponse) {
      return new Response(
        JSON.stringify({ error: 'Job response not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    if (surveyError || !jobSurvey) {
      return new Response(
        JSON.stringify({ error: 'Job survey not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Buscar análise de IA se não fornecida
    let analysis = ai_analysis;
    if (!analysis) {
      const { data: existingAnalysis } = await supabase
        .from('job_candidate_ai_analysis')
        .select('*')
        .eq('job_response_id', job_response_id)
        .single();
      
      analysis = existingAnalysis?.analysis_data;
    }

    // Buscar perfil DISC se disponível
    const { data: discResult } = await supabase
      .from('candidate_responses')
      .select('*')
      .eq('whatsapp', jobResponse.whatsapp || jobResponse.phone || '')
      .eq('is_completed', true)
      .order('created_at', { ascending: false })
      .maybeSingle();

    const discInfo = discResult
      ? `\nPerfil DISC:\n- Dominante (D): ${discResult.d_score || 0}\n- Influente (I): ${discResult.i_score || 0}\n- Estável (S): ${discResult.s_score || 0}\n- Consciencioso (C): ${discResult.c_score || 0}\n- Perfil Dominante: ${discResult.dominant_profile || 'N/A'}`
      : '\nPerfil DISC: Não disponível';

    // Construir prompt para gerar perguntas
    const prompt = `Você é um especialista em recrutamento e seleção. Sua tarefa é gerar perguntas inteligentes e estratégicas para uma entrevista ${interview_type === 'online' ? 'online (via videoconferência)' : 'presencial'}.

CONTEXTO DA VAGA:
- Título: ${jobSurvey.title}
- Cargo: ${jobSurvey.position_title}
- Descrição: ${jobSurvey.description || 'Não fornecida'}
- Requisitos: ${Array.isArray(jobSurvey.requirements) ? jobSurvey.requirements.join(', ') : 'Não especificados'}
- Modalidade: ${jobSurvey.work_modality || 'Não especificada'}

DADOS DO CANDIDATO:
- Nome: ${jobResponse.name}
- Idade: ${jobResponse.age || 'Não informada'}
- Email: ${jobResponse.email}
${discInfo}

${analysis ? `\nANÁLISE DE IA EXISTENTE:\n${JSON.stringify(analysis, null, 2)}` : ''}

RESPOSTAS DO FORMULÁRIO:
${Object.entries(jobResponse.responses || {}).map(([key, value]) => {
  const val = Array.isArray(value) ? value.join(', ') : String(value);
  return `Pergunta ${key}: ${val}`;
}).join('\n')}

INSTRUÇÕES:
1. Gere entre 8 e 12 perguntas estratégicas para esta entrevista ${interview_type === 'online' ? 'online' : 'presencial'}
2. As perguntas devem ser específicas para este candidato e esta vaga
3. Use a análise de IA e o perfil DISC para criar perguntas personalizadas
4. Inclua perguntas sobre:
   - Experiência e competências técnicas
   - Situações comportamentais (STAR method)
   - Adaptação ao perfil DISC identificado
   - Pontos de atenção identificados na análise
   - Alinhamento com a cultura e valores da empresa
5. Para entrevista online, priorize perguntas que funcionem bem em videoconferência
6. Para entrevista presencial, pode incluir dinâmicas e observação comportamental

FORMATO DE RESPOSTA (JSON):
{
  "questions": [
    {
      "id": "q1",
      "question": "Texto da pergunta",
      "type": "behavioral" | "technical" | "cultural" | "situational",
      "category": "experiencia" | "comportamento" | "tecnica" | "cultural",
      "estimated_time": "2-3 minutos",
      "notes": "Notas para o entrevistador sobre o que observar"
    }
  ],
  "interview_duration_estimate": "45-60 minutos",
  "focus_areas": ["área 1", "área 2", "área 3"],
  "recommended_approach": "Abordagem recomendada para esta entrevista"
}

Seja estratégico, profissional e focado em identificar o melhor fit para a vaga.`;

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
      console.error('[GENERATE-QUESTIONS] OpenAI error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const questionsText = openaiData.choices[0]?.message?.content;

    if (!questionsText) {
      throw new Error('No response from OpenAI');
    }

    let questionsData;
    try {
      questionsData = JSON.parse(questionsText);
    } catch (e) {
      console.error('[GENERATE-QUESTIONS] Failed to parse OpenAI response:', questionsText);
      throw new Error('Invalid JSON response from OpenAI');
    }

    return new Response(
      JSON.stringify({
        success: true,
        questions: questionsData.questions || [],
        interview_duration_estimate: questionsData.interview_duration_estimate,
        focus_areas: questionsData.focus_areas || [],
        recommended_approach: questionsData.recommended_approach
      }),
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('[GENERATE-QUESTIONS] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate interview questions',
        details: error.message
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

