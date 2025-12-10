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

    const prompt = `Você é um especialista em mapeamento de processos empresariais. Com base nas informações fornecidas, crie um processo COMPLETO, PROFISSIONAL e DETALHADO.

INFORMAÇÕES DO PROCESSO:
- Nome atual: ${processInfo.name}
- Objetivo atual: ${processInfo.objective || 'Não especificado'}
- Departamento: ${processInfo.department || 'Não especificado'}
- Proprietário: ${processInfo.owner || 'Não especificado'}

INSTRUÇÕES DETALHADAS E OBRIGATÓRIAS:

1. SUGESTÕES DE NOME (nameSuggestions):
   - Crie 3-5 sugestões de nomes profissionais, descritivos e específicos
   - Os nomes devem ser claros, objetivos e refletir a essência do processo
   - Exemplo: ["Processo de Criação de Planilha de Métricas de Anúncios", "Fluxo de Consolidação de Dados de Marketing", "Procedimento de Análise de Conversão de Campanhas"]

2. OBJETIVO PRINCIPAL MELHORADO (improvedObjective) - OBRIGATÓRIO, DETALHADO E FORMATADO EM HTML:
   - Crie um objetivo COMPLETO, PROFISSIONAL e DETALHADO formatado em HTML (mínimo 300 caracteres, idealmente 400-600)
   - O objetivo DEVE ser formatado em HTML com:
     * Títulos usando <h3> ou <h4>
     * Parágrafos usando <p> com quebras de linha <br>
     * Listas usando <ul> e <li> ou <ol> e <li>
     * Links usando <a href="URL">texto</a> para ferramentas e recursos
     * Emojis relevantes para tornar visualmente atraente
     * Negrito usando <strong> para destacar pontos importantes
     * Itálico usando <em> para ênfase
   - O objetivo DEVE explicar:
     * CONTEXTO: Situação atual e necessidade do processo
     * PROBLEMA: Qual problema específico este processo resolve
     * OBJETIVO: O que se pretende alcançar com este processo
     * RESULTADO ESPERADO: Qual o resultado concreto esperado
     * BENEFICIÁRIOS: Quem se beneficia deste processo
     * IMPACTO: Qual o impacto positivo na organização
   - Use estrutura HTML bem formatada com tags apropriadas
   - Seja específico e profissional
   - Exemplo de estrutura HTML:
     "<h3>📊 Contexto</h3>
     <p>Este processo foi desenvolvido para [contexto específico]. O problema que resolve é <strong>[problema específico]</strong>.</p>
     
     <h3>🎯 Objetivo</h3>
     <p>O objetivo principal é [objetivo claro e mensurável].</p>
     
     <h3>✅ Resultado Esperado</h3>
     <p>O resultado esperado é [resultado concreto e mensurável].</p>
     
     <h3>👥 Beneficiários</h3>
     <ul>
       <li>[Beneficiário 1] - [benefício específico]</li>
       <li>[Beneficiário 2] - [benefício específico]</li>
     </ul>
     
     <h3>🚀 Impacto</h3>
     <p>Este processo impacta positivamente a organização ao [impacto específico].</p>
     
     <h3>🔗 Recursos e Ferramentas</h3>
     <p>Ferramentas utilizadas: <a href='https://exemplo.com'>Nome da Ferramenta</a>, <a href='https://exemplo2.com'>Outra Ferramenta</a></p>"

3. ATIVIDADES (activities) - DETALHADAS E ESPECÍFICAS:
   - Crie 6-12 atividades DETALHADAS, ESPECÍFICAS e PROFISSIONAIS
   - Cada atividade DEVE ser uma etapa completa e bem definida
   - Para cada atividade, defina:
     * step: número sequencial (1, 2, 3...)
     * description: descrição DETALHADA e ESPECÍFICA da atividade (mínimo 50 caracteres, idealmente 80-150)
       - Explique O QUE fazer, COMO fazer e POR QUE é importante
       - Seja específico sobre ações, ferramentas e resultados esperados
       - Exemplo BOM: "Acessar as plataformas de anúncios (Google Ads, Facebook Ads, LinkedIn Ads) e exportar relatórios de desempenho das últimas 4 semanas, incluindo métricas de impressões, cliques, CTR, CPC, conversões e custo por conversão. Validar a integridade dos dados antes de prosseguir."
       - Exemplo RUIM: "Coletar dados de anúncios"
     * responsible: sugestão de responsável baseado no departamento e função
     * estimatedTime: tempo estimado REALISTA baseado na complexidade (NUNCA mais de 4 horas por atividade)
       - Para atividades muito simples: "15-30 minutos"
       - Para atividades simples: "30 minutos - 1 hora"
       - Para atividades moderadas: "1-2 horas"
       - Para atividades complexas: "2-3 horas" ou "3-4 horas"
       - NUNCA use "1 dia" ou "2-3 dias" - separe em atividades menores
       - Seja REALISTA: coletar dados de múltiplas plataformas pode levar "1-2 horas", não "2-4 horas"
       - Análise de dados pode levar "2-3 horas", não "4-8 horas"
     * tools: array com ferramentas/recursos necessários (mínimo 2-3 ferramentas)
       - Seja específico: ["Google Ads", "Google Analytics", "Google Sheets", "Excel"]

4. FLUXOGRAMA (flowNodes e flowEdges) - OBRIGATÓRIO E COMPLETO:
   - Crie um fluxograma COMPLETO em formato JSON
   - flowNodes: array de nós representando cada etapa
     * Cada nó DEVE ter: id (string única como "node-1"), type ("start", "process", "decision", "end"), label (texto da etapa), position {x: número, y: número}
     * O primeiro nó DEVE ser type: "start" com label "Início do Processo"
     * O último nó DEVE ser type: "end" com label "Fim do Processo"
     * Nós intermediários devem ser type: "process" (uma para cada atividade)
     * Labels devem ser curtos mas descritivos (máximo 40 caracteres)
     * Posições: x incrementa de 250 em 250 (250, 500, 750, 1000...), y pode variar para evitar sobreposição
     * Se houver muitas atividades, use múltiplas linhas (y: 200, 300, 400...)
   - flowEdges: array de conexões entre nós
     * Cada edge DEVE ter: id (string única como "edge-1"), source (id do nó origem), target (id do nó destino), label (string vazia "")
     * Conecte todos os nós sequencialmente: start -> atividade1 -> atividade2 -> ... -> end
     * TODAS as atividades devem estar no fluxograma
     * Se houver decisões, crie nós type: "decision" e edges para cada caminho

5. MÉTRICAS (metrics):
   - Sugira 4-6 métricas ESPECÍFICAS e RELEVANTES para este processo
   - Seja específico: "Tempo médio de criação da planilha", "Precisão dos dados coletados (taxa de erro)", "Frequência de atualização da planilha"

6. AUTOMAÇÕES (automations):
   - Sugira 3-5 automações ESPECÍFICAS que podem melhorar este processo
   - Seja específico: "Integração automática entre Google Ads e Google Sheets via API", "Notificação automática quando novos dados estiverem disponíveis"

FORMATO DE RESPOSTA (JSON OBRIGATÓRIO - SEM MARKDOWN):
{
  "nameSuggestions": ["Nome Sugerido 1", "Nome Sugerido 2", "Nome Sugerido 3"],
  "improvedObjective": "Objetivo completo, detalhado e profissional formatado em HTML (mínimo 300 caracteres, idealmente 400-600). Deve usar tags HTML: <h3>, <p>, <br>, <ul>, <li>, <strong>, <em>, <a href='URL'>texto</a>. Incluir emojis relevantes. Explicar contexto, problema, objetivo, resultado esperado, beneficiários e impacto de forma visual e estruturada.",
  "activities": [
    {
      "step": 1,
      "description": "Descrição DETALHADA e ESPECÍFICA da atividade (mínimo 50 caracteres, idealmente 80-150), explicando O QUE fazer, COMO fazer e POR QUE é importante",
      "responsible": "Sugestão de responsável baseado no departamento",
      "estimatedTime": "Tempo estimado REALISTA baseado na complexidade (ex: 2-4 horas para atividades complexas, 30 minutos para atividades simples)",
      "tools": ["Ferramenta específica 1", "Ferramenta específica 2", "Ferramenta específica 3"]
    }
  ],
  "flowNodes": [
    {
      "id": "node-start",
      "type": "start",
      "label": "Início do Processo",
      "position": { "x": 100, "y": 200 }
    },
    {
      "id": "node-1",
      "type": "process",
      "label": "Nome curto da atividade 1",
      "position": { "x": 350, "y": 200 }
    },
    {
      "id": "node-2",
      "type": "process",
      "label": "Nome curto da atividade 2",
      "position": { "x": 600, "y": 200 }
    },
    {
      "id": "node-end",
      "type": "end",
      "label": "Fim do Processo",
      "position": { "x": 850, "y": 200 }
    }
  ],
  "flowEdges": [
    {
      "id": "edge-1",
      "source": "node-start",
      "target": "node-1",
      "label": ""
    },
    {
      "id": "edge-2",
      "source": "node-1",
      "target": "node-2",
      "label": ""
    },
    {
      "id": "edge-3",
      "source": "node-2",
      "target": "node-end",
      "label": ""
    }
  ],
  "metrics": [
    "Métrica específica 1",
    "Métrica específica 2",
    "Métrica específica 3"
  ],
  "automations": [
    "Automação específica 1",
    "Automação específica 2"
  ]
}

REGRAS CRÍTICAS:
- O fluxograma DEVE ter pelo menos um nó "start" e um nó "end"
- TODAS as atividades devem ter um nó correspondente no fluxograma
- Todos os nós devem estar conectados sequencialmente por edges
- As posições devem ser números válidos (x, y)
- O objetivo DEVE ter pelo menos 300 caracteres, ser detalhado e formatado em HTML válido
- O HTML do objetivo DEVE usar tags válidas: <h3>, <h4>, <p>, <br>, <ul>, <li>, <strong>, <em>, <a href="URL">texto</a>
- O HTML DEVE incluir emojis relevantes para tornar visualmente atraente
- O HTML DEVE ter quebras de linha apropriadas usando <br> ou </p><p>
- As atividades DEVE ter descrições detalhadas (mínimo 50 caracteres)
- Os tempos estimados devem ser REALISTAS: de minutos até algumas horas, NUNCA mais de 4 horas por atividade
- Se uma atividade precisar de mais tempo, divida em atividades menores
- Responda APENAS em JSON válido, SEM markdown, SEM texto adicional, SEM comentários
- O JSON deve ser válido, completo e parseável
- O HTML no improvedObjective deve ser escapado corretamente no JSON (use \\n para quebras de linha dentro de strings)`;

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
        max_tokens: 4000,
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
                  max_tokens: 4000,
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

