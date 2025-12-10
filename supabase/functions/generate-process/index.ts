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

    const prompt = `Você é um especialista em mapeamento de processos empresariais. Com base nas informações fornecidas, crie um processo completo, objetivo detalhado, sugestões de nomes e um fluxograma detalhado.

INFORMAÇÕES DO PROCESSO:
- Nome atual: ${processInfo.name}
- Objetivo atual: ${processInfo.objective || 'Não especificado'}
- Departamento: ${processInfo.department || 'Não especificado'}
- Proprietário: ${processInfo.owner || 'Não especificado'}

INSTRUÇÕES DETALHADAS:

1. SUGESTÕES DE NOME (nameSuggestions):
   - Crie 3-5 sugestões de nomes profissionais e descritivos para este processo
   - Os nomes devem ser claros, objetivos e refletir a essência do processo
   - Exemplo: ["Processo de Atendimento ao Cliente", "Fluxo de Suporte Técnico", "Procedimento de Vendas"]

2. OBJETIVO PRINCIPAL MELHORADO (improvedObjective):
   - Se o objetivo atual for vago ou curto, crie um objetivo completo e detalhado (mínimo 100 caracteres)
   - O objetivo deve explicar claramente: qual problema resolve, qual resultado esperado, quem se beneficia
   - Use parágrafos e formatação clara
   - Se o objetivo atual já for bom, mantenha-o mas pode melhorar

3. ATIVIDADES (activities):
   - Crie 5-10 atividades detalhadas que descrevam cada etapa do processo
   - Para cada atividade, defina:
     * step: número sequencial (1, 2, 3...)
     * description: descrição clara e objetiva da atividade (mínimo 20 caracteres)
     * responsible: sugestão de responsável baseado no departamento
     * estimatedTime: tempo estimado (ex: "30 minutos", "2 horas", "1 dia")
     * tools: array com ferramentas/recursos necessários

4. FLUXOGRAMA (flowNodes e flowEdges) - OBRIGATÓRIO:
   - Crie um fluxograma completo em formato JSON
   - flowNodes: array de nós representando cada etapa
     * Cada nó DEVE ter: id (string única como "node-1"), type ("start", "process", "decision", "end"), label (texto da etapa), position {x: número, y: número}
     * O primeiro nó DEVE ser type: "start" com label "Início"
     * O último nó DEVE ser type: "end" com label "Fim"
     * Nós intermediários devem ser type: "process" ou "decision"
     * Posições devem ser espaçadas: x incrementa de 200 em 200, y pode variar
   - flowEdges: array de conexões entre nós
     * Cada edge DEVE ter: id (string única como "edge-1"), source (id do nó origem), target (id do nó destino), label (opcional, string vazia se não houver)
     * Conecte todos os nós sequencialmente: start -> processo1 -> processo2 -> ... -> end
     * Se houver decisões, crie edges para cada caminho possível

5. MÉTRICAS (metrics):
   - Sugira 3-5 métricas relevantes para acompanhar este processo
   - Exemplo: "Tempo médio de execução", "Taxa de conclusão", "Satisfação do cliente"

6. AUTOMAÇÕES (automations):
   - Sugira 2-4 automações que podem melhorar este processo
   - Exemplo: "Notificação automática por email", "Integração com sistema de CRM"

FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
{
  "nameSuggestions": ["Nome Sugerido 1", "Nome Sugerido 2", "Nome Sugerido 3"],
  "improvedObjective": "Objetivo completo e detalhado com pelo menos 100 caracteres, explicando o problema que resolve, resultado esperado e beneficiários.",
  "activities": [
    {
      "step": 1,
      "description": "Descrição detalhada da atividade (mínimo 20 caracteres)",
      "responsible": "Sugestão de responsável baseado no departamento",
      "estimatedTime": "Tempo estimado (ex: 30 minutos)",
      "tools": ["Ferramenta 1", "Ferramenta 2"]
    }
  ],
  "flowNodes": [
    {
      "id": "node-1",
      "type": "start",
      "label": "Início",
      "position": { "x": 100, "y": 200 }
    },
    {
      "id": "node-2",
      "type": "process",
      "label": "Nome da primeira atividade",
      "position": { "x": 300, "y": 200 }
    },
    {
      "id": "node-3",
      "type": "process",
      "label": "Nome da segunda atividade",
      "position": { "x": 500, "y": 200 }
    },
    {
      "id": "node-end",
      "type": "end",
      "label": "Fim",
      "position": { "x": 700, "y": 200 }
    }
  ],
  "flowEdges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2",
      "label": ""
    },
    {
      "id": "edge-2",
      "source": "node-2",
      "target": "node-3",
      "label": ""
    },
    {
      "id": "edge-3",
      "source": "node-3",
      "target": "node-end",
      "label": ""
    }
  ],
  "metrics": [
    "Métrica 1 (ex: Tempo médio de execução)",
    "Métrica 2 (ex: Taxa de conclusão)",
    "Métrica 3 (ex: Satisfação do cliente)"
  ],
  "automations": [
    "Automação sugerida 1",
    "Automação sugerida 2"
  ]
}

IMPORTANTE:
- O fluxograma DEVE ter pelo menos um nó "start" e um nó "end"
- Todos os nós devem estar conectados por edges
- As posições devem ser números válidos (x, y)
- Responda APENAS em JSON válido, sem markdown ou texto adicional
- O JSON deve ser válido e completo`;

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

