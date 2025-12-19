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
  // LOG IMEDIATO - PRIMEIRA COISA
  console.log('[import-produtos] ========== NOVA REQUISIÇÃO ==========');
  console.log('[import-produtos] Timestamp:', new Date().toISOString());
  console.log('[import-produtos] Method:', req.method);
  console.log('[import-produtos] URL:', req.url);
  console.log('[import-produtos] Headers:', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('[import-produtos] CORS preflight - retornando OK');
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.error('[import-produtos] Método inválido:', req.method);
    return new Response(
      JSON.stringify({ success: false, error: 'Método não permitido. Use POST.' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  console.log('[import-produtos] Método POST confirmado, iniciando processamento...');

  try {
    // Verificar autenticação
    console.log('[import-produtos] Verificando autenticação...');
    const authHeader = req.headers.get('authorization');
    console.log('[import-produtos] Auth header presente?', !!authHeader);
    if (!authHeader) {
      console.error('[import-produtos] ERRO: Token de autenticação não encontrado');
      return new Response(
        JSON.stringify({ success: false, error: 'Token de autenticação necessário' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    console.log('[import-produtos] Autenticação OK');

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
    console.log('[import-produtos] Iniciando parse do body...');
    let body;
    try {
      // Usar req.json() diretamente ao invés de req.text() + JSON.parse()
      // Isso evita problemas com body muito grande ou incompleto
      body = await req.json();
      console.log('[import-produtos] Body parseado com sucesso');
      console.log('[import-produtos] Body keys:', Object.keys(body || {}));
      console.log('[import-produtos] Produtos no body:', body?.produtos?.length || 0);
    } catch (error: any) {
      console.error('[import-produtos] Erro ao parsear JSON:', error);
      console.error('[import-produtos] Stack:', error.stack);
      console.error('[import-produtos] Error name:', error.name);
      console.error('[import-produtos] Error message:', error.message);
      
      // Tentar ler como texto para debug
      try {
        const bodyText = await req.text();
        console.error('[import-produtos] Body como texto (primeiros 1000 chars):', bodyText.substring(0, 1000));
        console.error('[import-produtos] Tamanho do body:', bodyText.length);
      } catch (textError: any) {
        console.error('[import-produtos] Erro ao ler body como texto:', textError);
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao processar requisição. Body inválido ou incompleto.',
          detalhes: error.message 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[import-produtos] Extraindo produtos e opcoes do body...');
    const { produtos, opcoes } = body;
    console.log('[import-produtos] Produtos extraídos:', produtos?.length || 0);
    console.log('[import-produtos] Opcoes extraídas:', opcoes);

    console.log('[import-produtos] Validando lista de produtos...');
    if (!produtos || !Array.isArray(produtos) || produtos.length === 0) {
      console.error('[import-produtos] ERRO: Lista de produtos vazia ou inválida');
      console.error('[import-produtos] Tipo de produtos:', typeof produtos);
      console.error('[import-produtos] É array?', Array.isArray(produtos));
      console.error('[import-produtos] Tamanho:', produtos?.length);
      return new Response(
        JSON.stringify({ success: false, error: 'Lista de produtos vazia ou inválida' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    console.log('[import-produtos] Lista de produtos válida:', produtos.length, 'produtos');

    // Limitar tamanho do lote para evitar timeout
    console.log('[import-produtos] Verificando tamanho do lote...');
    if (produtos.length > 1000) {
      console.error('[import-produtos] ERRO: Lote muito grande:', produtos.length);
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
    console.log('[import-produtos] Tamanho do lote OK:', produtos.length);

    console.log(`[import-produtos] Importando ${produtos.length} produtos`);
    console.log(`[import-produtos] Opções recebidas:`, { skipDuplicates: opcoes?.skipDuplicates, updateExisting: opcoes?.updateExisting });

    // Opções de importação
    const skipDuplicates = opcoes?.skipDuplicates !== false; // Padrão: true
    const updateExisting = opcoes?.updateExisting === true; // Padrão: false
    
    console.log(`[import-produtos] Opções processadas:`, { skipDuplicates, updateExisting });

    // Mapear produtos da planilha para estrutura do banco
    console.log('[import-produtos] Iniciando mapeamento de produtos...');
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

      // Função auxiliar para converter string com vírgula para número
      const parseValor = (valor: any): number => {
        if (typeof valor === 'number') return valor;
        if (!valor) return 0;
        const str = String(valor).replace(/\./g, '').replace(',', '.');
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
      };

      // Calcular valor parcelado (6x) se não vier
      // Garantir que valores sejam números (converter strings com vírgula)
      const valorVenda = parseValor(prod.vi_venda || prod.valor_dinheiro_pix || 0);
      const valorParcelado = parseValor(prod.valor_parcelado_6x) || valorVenda * 1.2; // 20% de acréscimo padrão

      const nomeProduto = (prod.descricao || prod.nome || '').trim();
      
      // Se não tiver nome, usar uma descrição padrão
      const nomeFinal = nomeProduto || 'Produto sem descrição';
      
      return {
        nome: nomeFinal.toLowerCase(), // Converter para lowercase para evitar duplicatas
        marca: marca || 'Geral',
        modelo: modelo || 'Geral',
        qualidade: qualidade,
        valor_dinheiro_pix: valorVenda,
        valor_parcelado_6x: valorParcelado,
        criado_por: userId || null,
        // Campos adicionais da planilha - garantir tipos corretos
        codigo: prod.codigo ? Number(prod.codigo) : null,
        codigo_barras: prod.codigo_barras || null,
        referencia: prod.referencia || null,
        grupo: prod.grupo || null,
        sub_grupo: prod.sub_grupo || null,
        vi_compra: parseValor(prod.vi_compra || 0),
        vi_custo: parseValor(prod.vi_custo || 0),
        quantidade: Math.round(parseValor(prod.quantidade || 0)),
        margem_percentual: parseValor(prod.margem || 0),
      };
    });

    // Validar produtos
    console.log('[import-produtos] Validando produtos mapeados...');
    console.log('[import-produtos] Exemplo de produto mapeado:', JSON.stringify(produtosMapeados[0], null, 2));
    
    // Verificar produtos inválidos com mais detalhes
    const produtosInvalidosDetalhes = produtosMapeados
      .map((p, idx) => ({ idx, nome: p.nome, marca: p.marca, modelo: p.modelo, temNome: !!p.nome, temMarca: !!p.marca, temModelo: !!p.modelo }))
      .filter(p => !p.temNome || !p.temMarca || !p.temModelo)
      .slice(0, 5); // Primeiros 5 inválidos
    
    if (produtosInvalidosDetalhes.length > 0) {
      console.log('[import-produtos] Exemplos de produtos inválidos:', produtosInvalidosDetalhes);
    }
    
    const produtosValidos = produtosMapeados.filter(p => p.nome && p.nome.trim() !== '' && p.marca && p.modelo);
    const produtosInvalidos = produtosMapeados.length - produtosValidos.length;
    console.log('[import-produtos] Produtos válidos:', produtosValidos.length);
    console.log('[import-produtos] Produtos inválidos:', produtosInvalidos);

    if (produtosValidos.length === 0) {
      console.error('[import-produtos] ERRO: Nenhum produto válido encontrado!');
      console.error('[import-produtos] Total de produtos mapeados:', produtosMapeados.length);
      console.error('[import-produtos] Primeiros produtos inválidos:', produtosInvalidosDetalhes);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nenhum produto válido encontrado. Verifique os dados.',
          detalhes: `${produtosInvalidos} produtos inválidos`,
          exemplo_invalido: produtosInvalidosDetalhes[0]
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[import-produtos] ${produtosValidos.length} produtos válidos, ${produtosInvalidos} inválidos`);

    // Verificar se a função SQL existe (apenas para updateExisting)
    if (updateExisting) {
      console.log(`[import-produtos] Verificando se função bulk_upsert_produtos existe...`);
      try {
        const { data: funcCheck, error: funcError } = await supabaseClient
          .rpc('bulk_upsert_produtos', { produtos_json: [] });
        
        if (funcError && (funcError.message?.includes('não encontrada') || funcError.message?.includes('does not exist') || funcError?.code === '42883')) {
          console.error(`[import-produtos] ERRO CRÍTICO: Função bulk_upsert_produtos não existe!`);
          console.error(`[import-produtos] Execute o script APLICAR_TODAS_FUNCOES_IMPORTACAO.sql no Supabase SQL Editor`);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Função SQL bulk_upsert_produtos não encontrada. Execute o script SQL primeiro.',
              detalhes: 'Execute APLICAR_TODAS_FUNCOES_IMPORTACAO.sql no Supabase SQL Editor'
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        console.log(`[import-produtos] Função bulk_upsert_produtos disponível`);
      } catch (checkError: any) {
        // Se der erro ao verificar, assumir que a função não existe
        console.error(`[import-produtos] Erro ao verificar função:`, checkError);
        console.error(`[import-produtos] Execute o script APLICAR_TODAS_FUNCOES_IMPORTACAO.sql no Supabase SQL Editor`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Função SQL bulk_upsert_produtos não encontrada. Execute o script SQL primeiro.',
            detalhes: 'Execute APLICAR_TODAS_FUNCOES_IMPORTACAO.sql no Supabase SQL Editor'
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

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
          console.log(`[import-produtos] Chamando bulk_upsert_produtos para lote ${batchNum}...`);
          const { data: result, error: rpcError } = await supabaseClient
            .rpc('bulk_upsert_produtos', {
              produtos_json: batch
            });

          console.log(`[import-produtos] Resposta RPC lote ${batchNum}:`, { result, rpcError });

          if (rpcError) {
            console.error(`[import-produtos] Erro RPC no lote ${batchNum}:`, rpcError);
            console.error(`[import-produtos] Detalhes do erro:`, JSON.stringify(rpcError, null, 2));
            erros += batch.length;
            errosDetalhes.push(`Lote ${batchNum}: ${rpcError.message || JSON.stringify(rpcError)}`);
          } else if (result && result.length > 0) {
            const stats = result[0];
            const inseridosLote = stats.inseridos || 0;
            const atualizadosLote = stats.atualizados || 0;
            const errosLote = stats.erros || 0;
            
            inseridos += inseridosLote;
            atualizados += atualizadosLote;
            erros += errosLote;
            
            console.log(`[import-produtos] Lote ${batchNum} processado: ${inseridosLote} inseridos, ${atualizadosLote} atualizados, ${errosLote} erros`);
            
            // Se houver erros, logar mais detalhes
            if (errosLote > 0) {
              console.warn(`[import-produtos] Lote ${batchNum} teve ${errosLote} erros de ${batch.length} produtos`);
            }
          } else {
            console.error(`[import-produtos] Resultado vazio do lote ${batchNum}. Result:`, result);
            erros += batch.length;
            errosDetalhes.push(`Lote ${batchNum}: Resultado vazio da função SQL`);
          }
        } catch (err: any) {
          console.error(`[import-produtos] Exceção no lote ${batchNum}:`, err);
          console.error(`[import-produtos] Stack trace:`, err.stack);
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
            let existingNames = new Set<string>();
            try {
              const { data: existingProducts, error: searchError } = await supabaseClient
                .rpc('buscar_produtos_por_nomes', { nomes: nomesLower });
              
              if (existingProducts) {
                existingNames = new Set(
                  existingProducts.map((p: any) => p.nome?.toLowerCase() || '')
                );
              } else if (searchError) {
                // Se a função não existir, fazer busca manual (mais lento mas funciona)
                console.log(`[import-produtos] Função RPC não disponível, usando fallback. Erro:`, searchError);
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
            } catch (rpcError: any) {
              // Fallback: buscar um por um (mais lento, mas funciona)
              console.log(`[import-produtos] Erro ao chamar RPC, usando fallback:`, rpcError);
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

    console.log(`[import-produtos] ========== IMPORTAÇÃO CONCLUÍDA ==========`);
    console.log(`[import-produtos] Resumo: ${inseridos} inseridos, ${atualizados} atualizados, ${erros} erros`);

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
    console.error('[import-produtos] ========== ERRO INESPERADO ==========');
    console.error('[import-produtos] Erro:', error);
    console.error('[import-produtos] Stack:', error.stack);
    console.error('[import-produtos] Mensagem:', error.message);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno do servidor',
        message: error.message,
        stack: error.stack 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

