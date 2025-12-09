import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

interface GenerateJobAssetsRequest {
  job: {
    title: string;
    position_title: string;
    description?: string;
    department?: string;
    company_name?: string;
    location?: string;
    requirements?: string[];
    benefits?: string[];
    work_modality?: string;
    work_schedule?: string;
    work_days?: string[];
    daily_schedule?: { [key: string]: { start: string; end: string } };
    lunch_break?: string;
    weekly_hours?: number;
    contract_type?: string;
    salary_range?: string;
    salary_min?: number;
    salary_max?: number;
    has_commission?: boolean;
    commission_details?: string;
  };
  provider?: 'openai';
  apiKey?: string;
  model?: string;
  locale?: string;
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

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (err) {
      console.error('[GENERATE-JOB-ASSETS] JSON parse error:', err);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), { status: 400, headers: corsHeaders });
    }

    const { job, provider = 'openai', apiKey, model = 'gpt-4o-mini', locale = 'pt-BR' }: GenerateJobAssetsRequest = requestBody;

    const openaiApiKey = apiKey || Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey || openaiApiKey.trim() === '') {
      console.error('[GENERATE-JOB-ASSETS] No API key provided');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured. Configure it in Integrations > OpenAI' }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    if (provider !== 'openai') {
      return new Response(
        JSON.stringify({ error: 'Only OpenAI provider is supported' }),
        { status: 400, headers: corsHeaders }
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

    if (!job?.title || !job?.position_title) {
      return new Response(
        JSON.stringify({ error: 'Missing job title or position_title' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Construir informações de horários
    let scheduleInfo = '';
    if (job.work_schedule) {
      scheduleInfo = job.work_schedule;
    } else if (job.work_days && job.daily_schedule) {
      const daysInfo = job.work_days.map(day => {
        const schedule = job.daily_schedule?.[day];
        if (schedule) {
          return `${day}: ${schedule.start} às ${schedule.end}`;
        }
        return day;
      }).join(', ');
      scheduleInfo = daysInfo;
      if (job.lunch_break) {
        scheduleInfo += `. Intervalo: ${job.lunch_break}`;
      }
      if (job.weekly_hours) {
        scheduleInfo += `. ${job.weekly_hours}h/semana`;
      }
    }

    // Construir informações de remuneração
    let compensationInfo = '';
    if (job.salary_range) {
      compensationInfo = job.salary_range;
    } else if (job.salary_min && job.salary_max) {
      compensationInfo = `R$ ${job.salary_min.toLocaleString('pt-BR')} a R$ ${job.salary_max.toLocaleString('pt-BR')}`;
    } else if (job.salary_min) {
      compensationInfo = `A partir de R$ ${job.salary_min.toLocaleString('pt-BR')}`;
    }
    if (job.has_commission && job.commission_details) {
      compensationInfo += compensationInfo ? `. ${job.commission_details}` : job.commission_details;
    }

    const prompt = `Você é um especialista em RH e redator de vagas de emprego. Crie uma descrição completa, atraente e profissional em ${locale}.

DADOS COMPLETOS DA VAGA:
- Título: ${job.title}
- Cargo: ${job.position_title}
- Empresa: ${job.company_name || 'não informada'}
- Departamento: ${job.department || 'não informado'}
- Localização: ${job.location || 'não informada'}
- Descrição atual: ${job.description || 'não informada'}
- Requisitos: ${Array.isArray(job.requirements) ? job.requirements.join(', ') : 'não informados'}
- Benefícios: ${Array.isArray(job.benefits) ? job.benefits.join(', ') : 'não informados'}
- Modalidade: ${job.work_modality || 'não informada'}
- Contrato: ${job.contract_type || 'não informado'}
${scheduleInfo ? `- Horários: ${scheduleInfo}` : ''}
${compensationInfo ? `- Remuneração: ${compensationInfo}` : ''}

INSTRUÇÕES DETALHADAS:
1) DESCRIPTION: Crie um texto completo e envolvente (8-12 frases) que:
   - Apresente a empresa e o contexto da vaga de forma atrativa
   - Descreva o perfil ideal do candidato
   - Destaque os principais desafios e oportunidades
   - Mencione o ambiente de trabalho e cultura da empresa
   - Seja profissional mas acessível, usando linguagem que atraia candidatos qualificados
   - Inclua informações sobre localização, modalidade e benefícios quando relevante

2) RESPONSIBILITIES: Liste 5-7 responsabilidades principais de forma clara e específica, começando com verbos de ação (Ex: "Atender clientes", "Desenvolver estratégias", "Gerenciar projetos")

3) REQUIREMENTS: Liste 4-6 requisitos essenciais, incluindo:
   - Formação/experiência necessária
   - Competências técnicas e comportamentais
   - Qualificações desejáveis (se houver)

4) WORK_SCHEDULE: Formate os horários de forma clara e profissional

5) SALARY_RANGE: Formate a remuneração de forma atrativa e clara

6) SLUG_SUGGESTION: Crie um slug curto, descritivo e sem acentos

Responda APENAS em JSON válido:
{
  "description": "Texto completo e detalhado (8-12 frases)",
  "responsibilities": ["responsabilidade detalhada 1","responsabilidade detalhada 2","responsabilidade detalhada 3","responsabilidade detalhada 4","responsabilidade detalhada 5"],
  "requirements": ["requisito detalhado 1","requisito detalhado 2","requisito detalhado 3","requisito detalhado 4"],
  "work_schedule": "${scheduleInfo || 'A combinar'}",
  "salary_range": "${compensationInfo || 'A combinar'}",
  "slug_suggestion": "slug-kebab-case-curto-sem-acentos"
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
      console.error('[GENERATE-JOB-ASSETS] OpenAI error:', errorText);
      let errorMsg = `OpenAI API error (${openaiResponse.status})`;
      try {
        const errJson = JSON.parse(errorText);
        errorMsg = errJson.error?.message || errorMsg;
      } catch {}
      return new Response(JSON.stringify({ error: errorMsg }), { status: 500, headers: corsHeaders });
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
      console.error('[GENERATE-JOB-ASSETS] parse error:', content);
      throw new Error('Invalid JSON from OpenAI');
    }

    // Validar estrutura básica
    if (!parsed.description && !parsed.responsibilities && !parsed.requirements) {
      console.error('[GENERATE-JOB-ASSETS] Invalid response structure:', parsed);
      return new Response(
        JSON.stringify({ error: 'AI did not generate valid content. Please try again.' }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true, assets: parsed }),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[GENERATE-JOB-ASSETS] Error:', error);
    const errorMessage = error?.message || error?.toString() || 'Failed to generate job assets';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
