import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const url = new URL(req.url);
    const nome = url.searchParams.get('nome');

    if (!nome) {
      return new Response(
        JSON.stringify({ error: 'Nome do produto é obrigatório' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Consultando produto:', nome);

    const { data, error } = await supabaseClient
      .from('produtos')
      .select('*')
      .ilike('nome', nome)
      .eq('disponivel', true)
      .single();

    if (error) {
      console.error('Erro ao consultar produto:', error);
      
      if (error.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'Produto não encontrado' }),
          { 
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Erro interno do servidor' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const response = {
      nome: data.nome,
      tipo: data.tipo,
      valor_avista_centavos: data.valor_avista_centavos,
      valor_6x_centavos: data.valor_6x_centavos,
      garantia_dias: data.garantia_dias,
      tempo_reparo_minutos: data.tempo_reparo_minutos,
      observacoes: data.observacoes,
      disponivel: data.disponivel
    };

    console.log('Produto encontrado:', response);

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );

  } catch (error) {
    console.error('Erro na função consulta-produto:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});