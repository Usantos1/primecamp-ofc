import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ProdutoImport {
  codigo?: number;
  codigo_barras?: string;
  descricao: string;
  referencia?: string;
  grupo?: string;
  sub_grupo?: string;
  vi_compra?: number;
  vi_custo?: number;
  vi_venda: number;
  quantidade?: number;
  margem?: number;
  // Campos mapeados para a tabela produtos
  nome?: string;
  marca?: string;
  modelo?: string;
  qualidade?: string;
  valor_dinheiro_pix?: number;
  valor_parcelado_6x?: number;
}

serve(async (req) => {
  console.log('[import-produtos] Requisição recebida:', {
    method: req.method,
    url: req.url,
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Método não permitido. Use POST.' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token de autenticação necessário' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Criar cliente Supabase com Service Role (bypass RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Obter usuário autenticado para usar como criado_por
    const supabaseAuthClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser();
    const userId = user?.id || null;
    
    if (userError || !user) {
      console.warn('[import-produtos] Usuário não autenticado, continuando sem criado_por');
    } else {
      console.log('[import-produtos] Usuário autenticado:', userId);
    }

    // Parse do body
    let body;
    try {
      body = await req.json();
    } catch (error: any) {
      console.error('[import-produtos] Erro ao parsear JSON:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao processar requisição. Body inválido.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { produtos, opcoes } = body;

    if (!produtos || !Array.isArray(produtos) || produtos.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Lista de produtos vazia ou inválida' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Limitar tamanho do lote para evitar timeout
    if (produtos.length > 1000) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Lote muito grande (${produtos.length} produtos). Processe em lotes de até 1000 produtos.` 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[import-produtos] Importando ${produtos.length} produtos`);

    // Opções de importação
    const skipDuplicates = opcoes?.skipDuplicates !== false; // Padrão: true
    const updateExisting = opcoes?.updateExisting === true; // Padrão: false

    // Mapear produtos da planilha para estrutura do banco
    const produtosMapeados = produtos.map((prod: ProdutoImport) => {
      // Extrair marca e modelo da descrição se não vierem separados
      let marca = prod.marca || '';
      let modelo = prod.modelo || '';
      let qualidade = prod.qualidade || 'Original';

      // Tentar extrair marca/modelo da descrição se não vierem
      if (!marca && !modelo && prod.descricao) {
        // Exemplo: "ADAPTADOR 90 GRAU HDMI" -> marca vazia, modelo vazio
        // Ou: "TELA IPHONE 12" -> marca: "Apple", modelo: "iPhone 12"
        const descUpper = prod.descricao.toUpperCase();
        if (descUpper.includes('IPHONE')) {
          marca = 'Apple';
          modelo = descUpper.match(/IPHONE\s+(\d+[A-Z]*)/)?.[0] || 'iPhone';
        } else if (descUpper.includes('SAMSUNG')) {
          marca = 'Samsung';
          modelo = descUpper.match(/SAMSUNG\s+([A-Z0-9]+)/)?.[1] || '';
        }
      }

      // Calcular valor parcelado (6x) se não vier
      const valorVenda = prod.vi_venda || prod.valor_dinheiro_pix || 0;
      const valorParcelado = prod.valor_parcelado_6x || valorVenda * 1.2; // 20% de acréscimo padrão

      const nomeProduto = (prod.descricao || prod.nome || '').trim();
      
      return {
        nome: nomeProduto.toLowerCase(), // Converter para lowercase para evitar duplicatas
        marca: marca || 'Geral',
        modelo: modelo || 'Geral',
        qualidade: qualidade,
        valor_dinheiro_pix: valorVenda,
        valor_parcelado_6x: valorParcelado,
        criado_por: userId || null,
        // Campos adicionais da planilha
        codigo: prod.codigo || null,
        codigo_barras: prod.codigo_barras || null,
        referencia: prod.referencia || null,
        grupo: prod.grupo || null,
        sub_grupo: prod.sub_grupo || null,
        vi_compra: prod.vi_compra || 0,
        vi_custo: prod.vi_custo || 0,
        quantidade: prod.quantidade || 0,
        margem_percentual: prod.margem || 0,
      };
    });

    // Validar produtos
    const produtosValidos = produtosMapeados.filter(p => p.nome && p.marca && p.modelo);
    const produtosInvalidos = produtosMapeados.length - produtosValidos.length;

    if (produtosValidos.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nenhum produto válido encontrado. Verifique os dados.',
          detalhes: `${produtosInvalidos} produtos inválidos`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[import-produtos] ${produtosValidos.length} produtos válidos, ${produtosInvalidos} inválidos`);

    // Inserir produtos em lotes
    const batchSize = 100;
    let inseridos = 0;
    let atualizados = 0;
    let erros = 0;
    const errosDetalhes: string[] = [];

    console.log(`[import-produtos] Iniciando inserção de ${produtosValidos.length} produtos em lotes de ${batchSize}`);

    for (let i = 0; i < produtosValidos.length; i += batchSize) {
      const batch = produtosValidos.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      
      console.log(`[import-produtos] Processando lote ${batchNum} (${batch.length} produtos)`);
      console.log(`[import-produtos] Exemplo de produto do lote:`, JSON.stringify(batch[0], null, 2));
      
      if (updateExisting) {
        // Usar função SQL para bulk upsert (muito mais rápido)
        try {
          const { data: result, error: rpcError } = await supabaseClient
            .rpc('bulk_upsert_produtos', {
              produtos_json: batch
            });

          if (rpcError) {
            console.error(`[import-produtos] Erro no lote ${batchNum}:`, rpcError);
            erros += batch.length;
            errosDetalhes.push(`Lote ${batchNum}: ${rpcError.message || JSON.stringify(rpcError)}`);
          } else if (result && result.length > 0) {
            const stats = result[0];
            inseridos += stats.inseridos || 0;
            atualizados += stats.atualizados || 0;
            erros += stats.erros || 0;
            console.log(`[import-produtos] Lote ${batchNum} processado: ${stats.inseridos || 0} inseridos, ${stats.atualizados || 0} atualizados, ${stats.erros || 0} erros`);
          } else {
            console.error(`[import-produtos] Resultado vazio do lote ${batchNum}`);
            erros += batch.length;
          }
        } catch (err: any) {
          console.error(`[import-produtos] Exceção no lote ${batchNum}:`, err);
          erros += batch.length;
          errosDetalhes.push(`Lote ${batchNum}: ${err.message || JSON.stringify(err)}`);
        }
      } else {
        // Apenas inserir (ignorar duplicados se skipDuplicates = true)
        try {
          if (skipDuplicates) {
            // Buscar produtos existentes em lote usando função SQL (muito mais rápido)
            const nomesLower = batch.map(p => p.nome.toLowerCase());
            
            // Usar RPC para buscar produtos existentes em lote (case-insensitive)
            const { data: existingProducts } = await supabaseClient
              .rpc('buscar_produtos_por_nomes', { nomes: nomesLower })
              .catch(() => {
                // Se a função não existir, fazer busca manual (mais lento mas funciona)
                return { data: null };
              });
            
            let existingNames = new Set<string>();
            if (existingProducts) {
              existingNames = new Set(
                existingProducts.map((p: any) => p.nome?.toLowerCase() || '')
              );
            } else {
              // Fallback: buscar um por um (mais lento, mas funciona)
              console.log(`[import-produtos] Função RPC não disponível, usando fallback`);
              for (const nomeLower of nomesLower) {
                const { data: existing } = await supabaseClient
                  .from('produtos')
                  .select('nome')
                  .ilike('nome', nomeLower)
                  .limit(1)
                  .single();
                if (existing) {
                  existingNames.add(existing.nome.toLowerCase());
                }
              }
            }
            
            // Filtrar apenas produtos que não existem
            const produtosNovos = batch.filter(p => !existingNames.has(p.nome.toLowerCase()));
            
            if (produtosNovos.length > 0) {
              const { data, error } = await supabaseClient
                .from('produtos')
                .insert(produtosNovos)
                .select();

              if (error) {
                console.error(`[import-produtos] Erro no lote ${batchNum}:`, error);
                erros += produtosNovos.length;
                errosDetalhes.push(`Lote ${batchNum}: ${error.message || JSON.stringify(error)}`);
              } else {
                const count = data?.length || 0;
                inseridos += count;
                console.log(`[import-produtos] Lote ${batchNum} processado: ${count} produtos inseridos (${batch.length - count} duplicados ignorados)`);
              }
            } else {
              console.log(`[import-produtos] Lote ${batchNum}: todos os produtos já existem, ignorados`);
            }
          } else {
            // Inserir todos, deixar erro de duplicata aparecer
            const { data, error } = await supabaseClient
              .from('produtos')
              .insert(batch)
              .select();

            if (error) {
              console.error(`[import-produtos] Erro no lote ${batchNum}:`, error);
              console.error(`[import-produtos] Detalhes do erro:`, JSON.stringify(error, null, 2));
              erros += batch.length;
              errosDetalhes.push(`Lote ${batchNum}: ${error.message || JSON.stringify(error)}`);
            } else {
              const count = data?.length || 0;
              console.log(`[import-produtos] Lote ${batchNum} processado: ${count} produtos inseridos`);
              inseridos += count;
            }
          }
        } catch (err: any) {
          console.error(`[import-produtos] Exceção no lote ${batchNum}:`, err);
          erros += batch.length;
          errosDetalhes.push(`Lote ${batchNum}: ${err.message || JSON.stringify(err)}`);
        }
      }
    }

    console.log(`[import-produtos] Importação concluída: ${inseridos} inseridos, ${atualizados} atualizados, ${erros} erros`);

    return new Response(
      JSON.stringify({
        success: true,
        resultado: {
          total: produtos.length,
          validos: produtosValidos.length,
          invalidos: produtosInvalidos,
          inseridos: inseridos,
          atualizados: atualizados,
          erros: erros,
          erros_detalhes: errosDetalhes.length > 0 ? errosDetalhes : undefined,
        },
        mensagem: updateExisting
          ? `${atualizados} produtos atualizados/inseridos com sucesso`
          : `${inseridos} produtos inseridos com sucesso`,
      }, null, 2),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[import-produtos] Erro inesperado:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno do servidor',
        message: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

