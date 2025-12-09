import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

interface GenerateRequest {
  survey: {
    id?: string;
    title: string;
    position_title: string;
    description?: string;
    department?: string;
    requirements?: string[];
    work_modality?: string;
    contract_type?: string;
    seniority?: string;
  };
  base_questions?: any[];
  locale?: string;
  provider?: 'openai';
  apiKey?: string;
  model?: string;
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

    const { survey, base_questions = [], locale = 'pt-BR', provider = 'openai', apiKey, model = 'gpt-4o-mini' }: GenerateRequest = await req.json();

    const openaiApiKey = apiKey || Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey || provider !== 'openai') {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Mapear modelos "futuristas" para modelos reais da OpenAI
    const modelMap: { [key: string]: string } = {
      'gpt-5': 'gpt-4o',
      'gpt-5-mini': 'gpt-4o-mini',
      'chatgpt-5.1': 'gpt-4o',
      'chatgpt-5.1-mini': 'gpt-4o-mini',
      'gpt-4.1': 'gpt-4-turbo',
      'gpt-4.1-mini': 'gpt-4o-mini',
    };
    const actualModel = modelMap[model] || model || 'gpt-4o-mini';

    if (!survey?.title || !survey?.position_title) {
      return new Response(
        JSON.stringify({ error: 'Missing survey data' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const prompt = `Você é um especialista em recrutamento e seleção.
Gere perguntas inteligentes e estratégicas para triagem inicial de candidatos, em ${locale}.

CONTEXTUALIZE A VAGA:
- Título: ${survey.title}
- Cargo: ${survey.position_title}
- Descrição: ${survey.description || 'Não informada'}
- Departamento: ${survey.department || 'Não informado'}
- Requisitos: ${Array.isArray(survey.requirements) ? survey.requirements.join(', ') : 'Não informados'}
- Modalidade: ${survey.work_modality || 'Não informada'}
- Contrato: ${survey.contract_type || 'Não informado'}
- Senioridade: ${survey.seniority || 'Não informada'}

PERGUNTAS BASE EXISTENTES (manter ou reformular):
${base_questions.map((q, idx) => `${idx + 1}. ${q.title || q.question || 'Pergunta'} (${q.type || 'texto'})`).join('\n') || 'Nenhuma'}

INSTRUÇÕES:
1) Entregue de 6 a 10 perguntas, variadas entre técnica, comportamental (STAR), cultural e situacional.
2) Mantenha as perguntas atuais (se fizer sentido) reformulando para clareza. Adicione lacunas que faltam.
3) Indique se é obrigatória (required true/false).
4) Se for múltipla escolha, devolva opções curtas (3-6).
5) Otimize para descobrir: perfil comportamental (DISC indireto), comprometimento, escrita/clareza, aderência aos requisitos e honestidade.
6) Responda apenas em JSON válido.

FORMATO DE RESPOSTA:
{
  "questions": [
    {
      "id": "q1",
      "title": "texto da pergunta",
      "description": "breve contexto",
      "type": "text" | "textarea" | "select" | "radio" | "checkbox" | "number",
      "required": true,
      "options": ["op1","op2"] // apenas se select/radio/checkbox
    }
  ]
}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: actualModel,
        messages: [
          { role: 'system', content: 'Você é conciso e sempre responde com JSON válido.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6,
        response_format: { type: 'json_object' }
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('[GENERATE-DYNAMIC-QUESTIONS] OpenAI error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error('[GENERATE-DYNAMIC-QUESTIONS] parse error:', content);
      throw new Error('Invalid JSON from OpenAI');
    }

    const dynamicQuestions = Array.isArray(parsed?.questions) ? parsed.questions : [];

    return new Response(
      JSON.stringify({ success: true, dynamic_questions: dynamicQuestions }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[GENERATE-DYNAMIC-QUESTIONS] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate questions' }),
      { status: 500, headers: corsHeaders }
    );
  }
});

