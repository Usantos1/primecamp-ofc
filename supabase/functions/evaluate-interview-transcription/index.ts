import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

interface EvaluateRequest {
  interview_id: string;
  transcription: string;
  interview_type: 'online' | 'presencial';
  job_response_id: string;
  survey_id: string;
  include_profile_analysis?: boolean;
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

    const { interview_id, transcription, interview_type, job_response_id, survey_id, include_profile_analysis = false }: EvaluateRequest = await req.json();

    if (!interview_id || !transcription || !interview_type) {
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

    // Buscar dados do candidato, vaga e análise de IA
    const { data: jobResponse } = await supabase
      .from('job_responses')
      .select('*')
      .eq('id', job_response_id)
      .single();

    const { data: jobSurvey } = await supabase
      .from('job_surveys')
      .select('*')
      .eq('id', survey_id)
      .single();

    const { data: aiAnalysis } = await supabase
      .from('job_candidate_ai_analysis')
      .select('*')
      .eq('job_response_id', job_response_id)
      .single();

    const { data: interview } = await supabase
      .from('job_interviews')
      .select('*')
      .eq('id', interview_id)
      .single();

    // Construir prompt para avaliação
    const prompt = `Você é um especialista em recrutamento e seleção com décadas de experiência. Sua tarefa é avaliar uma transcrição de entrevista ${interview_type === 'online' ? 'online (videoconferência)' : 'presencial'} e determinar se o candidato deve avançar para a próxima etapa.

CONTEXTO DA VAGA:
- Título: ${jobSurvey?.title || 'N/A'}
- Cargo: ${jobSurvey?.position_title || 'N/A'}
- Descrição: ${jobSurvey?.description || 'N/A'}
- Requisitos: ${Array.isArray(jobSurvey?.requirements) ? jobSurvey?.requirements.join(', ') : 'N/A'}

DADOS DO CANDIDATO:
- Nome: ${jobResponse?.name || 'N/A'}
- Idade: ${jobResponse?.age || 'N/A'}

${aiAnalysis?.analysis_data ? `\nANÁLISE DE IA PRÉVIA:\n${JSON.stringify(aiAnalysis.analysis_data, null, 2)}` : ''}

${interview?.questions ? `\nPERGUNTAS DA ENTREVISTA:\n${JSON.stringify(interview.questions, null, 2)}` : ''}

TRANSCRIÇÃO DA ENTREVISTA:
${transcription}

INSTRUÇÕES DE AVALIAÇÃO:
1. Analise a transcrição considerando:
   - Clareza e coerência das respostas
   - Alinhamento com os requisitos da vaga
   - Demonstração de competências técnicas e comportamentais
   - Comunicação e expressão
   - Motivação e interesse genuíno
   - Red flags ou pontos de atenção
   - Comparação com a análise de IA prévia

2. Para entrevista ONLINE:
   - Avalie também a comunicação não-verbal possível (tom de voz, clareza, etc.)
   - Considere se o candidato demonstrou conforto com tecnologia
   - Observe se respondeu adequadamente às perguntas comportamentais

3. Para entrevista PRESENCIAL:
   - Considere aspectos de presença e postura (se mencionados na transcrição)
   - Avalie interação pessoal e fit cultural
   - Observe demonstração de habilidades práticas

${include_profile_analysis ? `4. IDENTIFICAÇÃO DE PERFIL DISC:
   Analise as respostas do candidato e identifique seu perfil comportamental DISC:
   - D (Dominância): Decisão rápida, assertividade, foco em resultados, liderança
   - I (Influência): Sociabilidade, entusiasmo, persuasão, otimismo
   - S (Estabilidade): Paciência, consistência, lealdade, trabalho em equipe
   - C (Conformidade): Precisão, análise, organização, atenção a detalhes
   
   Identifique o perfil dominante e secundário baseado em:
   - Tom de voz e ritmo de fala
   - Forma de estruturar respostas
   - Exemplos dados
   - Prioridades mencionadas
   - Estilo de comunicação
   
   Forneça uma análise detalhada do perfil identificado.` : ''}

5. Classifique o candidato:
   - "approved": Candidato aprovado para próxima etapa (${interview_type === 'online' ? 'entrevista presencial' : 'contratação'})
   - "rejected": Candidato não aprovado
   - "manual_review": Necessita revisão manual adicional

6. Seja rigoroso mas justo. Um candidato só deve ser aprovado se demonstrar claramente potencial para a vaga.

FORMATO DE RESPOSTA (JSON):
{
  "recommendation": "approved" | "rejected" | "manual_review",
  "score": 0-100,
  "justification": "Justificativa detalhada da decisão",
  "strengths_identified": ["força 1", "força 2", "força 3"],
  "concerns_identified": ["preocupação 1", "preocupação 2"],
  "key_highlights": ["destaque 1", "destaque 2"],
  "comparison_with_initial_analysis": "Como a entrevista confirmou ou divergiu da análise inicial",
  "next_steps_recommendation": "Recomendações para próximos passos",
  "interview_quality": "Avaliação da qualidade da entrevista (perguntas, respostas, etc.)"${include_profile_analysis ? `,
  "candidate_profile": "Perfil DISC identificado (ex: 'D-I', 'S-C', 'I dominante', etc.)",
  "profile_analysis": "Análise detalhada do perfil comportamental identificado nas respostas",
  "profile_confidence": "Nível de confiança na identificação do perfil (alto/médio/baixo)",
  "profile_indicators": ["indicador 1", "indicador 2", "indicador 3"]` : ''}
}

Seja objetivo, profissional e baseie-se apenas na transcrição fornecida.`;

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
            content: 'Você é um especialista em recrutamento e seleção com décadas de experiência. Sempre responda em formato JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Mais determinístico para avaliações
        response_format: { type: 'json_object' }
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('[EVALUATE-TRANSCRIPTION] OpenAI error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const evaluationText = openaiData.choices[0]?.message?.content;

    if (!evaluationText) {
      throw new Error('No response from OpenAI');
    }

    let evaluation;
    try {
      evaluation = JSON.parse(evaluationText);
    } catch (e) {
      console.error('[EVALUATE-TRANSCRIPTION] Failed to parse OpenAI response:', evaluationText);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Atualizar entrevista com avaliação
    const { error: updateError } = await supabase
      .from('job_interviews')
      .update({
        transcription,
        ai_evaluation: evaluation,
        ai_recommendation: evaluation.recommendation,
        ai_score: evaluation.score,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', interview_id);

    if (updateError) {
      console.error('[EVALUATE-TRANSCRIPTION] Error updating interview:', updateError);
      // Não falhar, apenas logar
    }

    return new Response(
      JSON.stringify({
        success: true,
        evaluation,
        interview_id
      }),
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('[EVALUATE-TRANSCRIPTION] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to evaluate transcription',
        details: error.message
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

