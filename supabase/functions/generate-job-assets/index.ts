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
    requirements?: string[];
    work_modality?: string;
    contract_type?: string;
    location?: string;
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
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
    }

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (err) {
      console.error('[GENERATE-JOB-ASSETS] JSON parse error:', err);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), { status: 400, headers: corsHeaders });
    }

    const { job, provider = 'openai', apiKey, model = 'gpt-4o-mini', locale = 'pt-BR' }: GenerateJobAssetsRequest = requestBody;

    if (!job?.title || !job?.position_title) {
      return new Response(JSON.stringify({ error: 'Missing job title or position_title' }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[GENERATE-JOB-ASSETS] Request received:', {
      hasJob: !!job,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      provider,
      model
    });

    const openaiKey = apiKey || Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey || openaiKey.trim() === '') {
      console.error('[GENERATE-JOB-ASSETS] No API key provided. apiKey from request:', !!apiKey, 'env key:', !!Deno.env.get('OPENAI_API_KEY'));
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured. Configure it in Integrations > OpenAI' }), { status: 400, headers: corsHeaders });
    }
    
    if (provider !== 'openai') {
      return new Response(JSON.stringify({ error: 'Only OpenAI provider is supported' }), { status: 400, headers: corsHeaders });
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
    
    console.log('[GENERATE-JOB-ASSETS] Using model:', actualModel, 'from input:', model);
    
    // Validar se o modelo é suportado
    const supportedModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
    if (!supportedModels.includes(actualModel)) {
      console.warn('[GENERATE-JOB-ASSETS] Model not in supported list, using anyway:', actualModel);
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

    console.log('[GENERATE-JOB-ASSETS] Calling OpenAI API with model:', actualModel);
    
    let completion;
    try {
      completion = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: actualModel,
          messages: [
            { role: 'system', content: 'Responda somente JSON válido.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.6,
          response_format: { type: 'json_object' }
        })
      });
      
      console.log('[GENERATE-JOB-ASSETS] OpenAI response status:', completion.status);
    } catch (fetchError: any) {
      console.error('[GENERATE-JOB-ASSETS] Fetch error:', fetchError);
      return new Response(JSON.stringify({ 
        error: `Erro ao chamar OpenAI API: ${fetchError?.message || 'Erro desconhecido'}` 
      }), { status: 500, headers: corsHeaders });
    }

    if (!completion.ok) {
      const errTxt = await completion.text();
      console.error('[GENERATE-JOB-ASSETS] OpenAI error:', errTxt);
      let errorMsg = `OpenAI API error (${completion.status})`;
      try {
        const errJson = JSON.parse(errTxt);
        errorMsg = errJson.error?.message || errorMsg;
      } catch {}
      return new Response(JSON.stringify({ error: errorMsg }), { status: 500, headers: corsHeaders });
    }

    let data;
    try {
      data = await completion.json();
    } catch (jsonError: any) {
      console.error('[GENERATE-JOB-ASSETS] JSON parse error on response:', jsonError);
      return new Response(JSON.stringify({ 
        error: `Erro ao processar resposta da OpenAI: ${jsonError?.message || 'Resposta inválida'}` 
      }), { status: 500, headers: corsHeaders });
    }
    
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('[GENERATE-JOB-ASSETS] Empty content in response:', data);
      return new Response(JSON.stringify({ error: 'A IA não retornou conteúdo. Verifique o modelo e a API Key.' }), { status: 500, headers: corsHeaders });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error('[GENERATE-JOB-ASSETS] parse error:', content);
      return new Response(JSON.stringify({ 
        error: 'A IA retornou JSON inválido. Tente novamente.' 
      }), { status: 500, headers: corsHeaders });
    }

    // Validar estrutura do JSON retornado
    if (!parsed.description && !parsed.responsibilities && !parsed.requirements) {
      console.error('[GENERATE-JOB-ASSETS] Invalid response structure:', parsed);
      return new Response(JSON.stringify({ error: 'AI returned invalid response structure' }), { status: 500, headers: corsHeaders });
    }

    // opcional: salvar histórico (ignorar erro se tabela não existir)
    await supabase.from('job_assets_logs').insert({
      payload: job,
      provider,
      created_at: new Date().toISOString(),
    }).catch(() => {});

    return new Response(JSON.stringify({ success: true, assets: parsed }), { headers: corsHeaders });
  } catch (error: any) {
    console.error('[GENERATE-JOB-ASSETS] Error:', error);
    const errorMessage = error?.message || error?.toString() || 'Failed to generate job assets';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }), { status: 500, headers: corsHeaders });
  }
});

