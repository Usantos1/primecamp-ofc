import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { processInfo, provider = 'openai', apiKey, model = 'gpt-4o' } = await req.json();

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API Key não fornecida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!processInfo || !processInfo.name || !processInfo.objective) {
      return new Response(
        JSON.stringify({ error: 'Informações do processo são obrigatórias (nome e objetivo)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map futuristic models to actual OpenAI models
    const modelMap: Record<string, string> = {
      'gpt-5': 'gpt-4o',
      'gpt-5-mini': 'gpt-4o-mini',
      'chatgpt-5.1': 'gpt-4o',
      'chatgpt-5.1-mini': 'gpt-4o-mini',
      'gpt-4.1': 'gpt-4o',
      'gpt-4.1-mini': 'gpt-4o-mini',
    };

    const actualModel = modelMap[model] || model;

    const prompt = `Você é um especialista em mapeamento de processos empresariais. Com base nas informações fornecidas, crie um processo completo e um fluxograma detalhado.

INFORMAÇÕES DO PROCESSO:
- Nome: ${processInfo.name}
- Objetivo: ${processInfo.objective}
- Departamento: ${processInfo.department || 'Não especificado'}
- Proprietário: ${processInfo.owner || 'Não especificado'}

INSTRUÇÕES:
1. Crie atividades detalhadas (5-10 atividades) que descrevam cada etapa do processo
2. Para cada atividade, defina:
   - Descrição clara e objetiva
   - Responsável sugerido (baseado no departamento)
   - Tempo estimado
   - Ferramentas/recursos necessários

3. Crie um fluxograma em formato JSON com:
   - Nós (nodes) representando cada atividade/etapa
   - Conexões (edges) mostrando o fluxo entre as atividades
   - Cada nó deve ter: id, type ('process', 'decision', 'start', 'end'), label, position (x, y)
   - Cada edge deve ter: id, source (id do nó origem), target (id do nó destino), label (opcional)

4. Identifique pontos de decisão e loops quando necessário

FORMATO DE RESPOSTA (JSON):
{
  "activities": [
    {
      "step": 1,
      "description": "Descrição detalhada da atividade",
      "responsible": "Sugestão de responsável",
      "estimatedTime": "Tempo estimado (ex: 30 minutos)",
      "tools": ["Ferramenta 1", "Ferramenta 2"]
    }
  ],
  "flowNodes": [
    {
      "id": "node-1",
      "type": "start",
      "label": "Início",
      "position": { "x": 100, "y": 100 }
    },
    {
      "id": "node-2",
      "type": "process",
      "label": "Nome da atividade",
      "position": { "x": 300, "y": 100 }
    }
  ],
  "flowEdges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2",
      "label": ""
    }
  ],
  "metrics": [
    "Métrica 1 (ex: Tempo médio de execução)",
    "Métrica 2 (ex: Taxa de conclusão)"
  ],
  "automations": [
    "Automação sugerida 1",
    "Automação sugerida 2"
  ]
}

Responda APENAS em JSON válido, sem markdown ou texto adicional:`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: actualModel,
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em mapeamento de processos empresariais. Sempre retorne JSON válido sem markdown.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API Error:', errorData);
      
      // Try fallback model if primary fails
      if (actualModel !== 'gpt-4o-mini') {
        console.log('Tentando modelo fallback: gpt-4o-mini');
        const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'Você é um especialista em mapeamento de processos empresariais. Sempre retorne JSON válido sem markdown.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 3000,
          }),
        });

        if (!fallbackResponse.ok) {
          throw new Error(`OpenAI API Error: ${fallbackResponse.statusText}`);
        }

        const fallbackData = await fallbackResponse.json();
        const fallbackContent = fallbackData.choices[0]?.message?.content || '{}';
        let parsedFallback;
        try {
          parsedFallback = JSON.parse(fallbackContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
        } catch {
          throw new Error('Erro ao processar resposta da IA (fallback)');
        }

        return new Response(
          JSON.stringify(parsedFallback),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`OpenAI API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';

    // Parse JSON from response (remove markdown if present)
    let parsed;
    try {
      parsed = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError, 'Content:', content);
      throw new Error('Erro ao processar resposta da IA. A resposta não é um JSON válido.');
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro desconhecido ao gerar processo' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

