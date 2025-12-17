import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Token de API configurado via variável de ambiente
const API_TOKEN = Deno.env.get('API_PRODUTOS_TOKEN') || '';

interface ProdutoResponse {
  id: string;
  nome: string;
  marca: string;
  modelo: string;
  qualidade: string;
  valor_dinheiro_pix: number;
  valor_parcelado_6x: number;
  valor_formatado: {
    dinheiro_pix: string;
    parcelado_6x: string;
    valor_parcela_6x: string;
  };
}

serve(async (req) => {
  console.log('[api-produtos] Requisição recebida:', {
    method: req.method,
    url: req.url,
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar token de autenticação
    const authHeader = req.headers.get('authorization') || req.headers.get('x-api-token');
    const token = authHeader?.replace('Bearer ', '') || authHeader;

    if (!API_TOKEN) {
      console.error('[api-produtos] API_TOKEN não configurado');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'API_TOKEN não configurado no servidor' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!token || token !== API_TOKEN) {
      console.error('[api-produtos] Token inválido ou ausente');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token de autenticação inválido ou ausente',
          message: 'Forneça um token válido no header Authorization ou x-api-token'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Parse da URL e query parameters
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || url.searchParams.get('q') || '';
    const marca = url.searchParams.get('marca') || '';
    const modelo = url.searchParams.get('modelo') || '';
    const qualidade = url.searchParams.get('qualidade') || '';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    console.log('[api-produtos] Parâmetros:', {
      search,
      marca,
      modelo,
      qualidade,
      limit,
      offset,
    });

    // Construir query
    let query = supabaseClient
      .from('produtos')
      .select('id, nome, marca, modelo, qualidade, valor_dinheiro_pix, valor_parcelado_6x')
      .order('nome', { ascending: true });

    // Aplicar filtros
    if (search) {
      query = query.or(`nome.ilike.%${search}%,marca.ilike.%${search}%,modelo.ilike.%${search}%`);
    }
    if (marca) {
      query = query.ilike('marca', `%${marca}%`);
    }
    if (modelo) {
      query = query.ilike('modelo', `%${modelo}%`);
    }
    if (qualidade) {
      query = query.ilike('qualidade', `%${qualidade}%`);
    }

    // Aplicar paginação
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[api-produtos] Erro ao buscar produtos:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao buscar produtos',
          details: error.message 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Formatar resposta para orçamento
    const produtosFormatados: ProdutoResponse[] = (data || []).map((produto: any) => {
      const valorPix = Number(produto.valor_dinheiro_pix) || 0;
      const valor6x = Number(produto.valor_parcelado_6x) || 0;
      const valorParcela = valor6x / 6;

      return {
        id: produto.id,
        nome: produto.nome,
        marca: produto.marca || '',
        modelo: produto.modelo || '',
        qualidade: produto.qualidade || '',
        valor_dinheiro_pix: valorPix,
        valor_parcelado_6x: valor6x,
        valor_formatado: {
          dinheiro_pix: new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(valorPix),
          parcelado_6x: new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(valor6x),
          valor_parcela_6x: new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(valorParcela),
        },
      };
    });

    console.log('[api-produtos] Produtos encontrados:', produtosFormatados.length);

    // Retornar resposta formatada
    return new Response(
      JSON.stringify({
        success: true,
        data: produtosFormatados,
        pagination: {
          total: count || produtosFormatados.length,
          limit,
          offset,
          has_more: (count || 0) > offset + limit,
        },
        meta: {
          timestamp: new Date().toISOString(),
          query: {
            search: search || null,
            marca: marca || null,
            modelo: modelo || null,
            qualidade: qualidade || null,
          },
        },
      }, null, 2),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[api-produtos] Erro inesperado:', error);
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

