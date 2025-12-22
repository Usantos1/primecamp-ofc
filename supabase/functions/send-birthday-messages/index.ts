import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current date
    const today = new Date();
    const todayMonth = today.getMonth() + 1; // JavaScript months are 0-indexed
    const todayDay = today.getDate();

    // Load birthday message configuration
    const { data: configData, error: configError } = await supabase
      .from('kv_store_2c4defad')
      .select('value')
      .eq('key', 'aniversario_config')
      .single();

    if (configError || !configData?.value) {
      console.log('Configuração de aniversário não encontrada ou desativada');
      return new Response(
        JSON.stringify({ message: 'Configuração não encontrada ou desativada', sent: 0 }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 200 }
      );
    }

    const config = configData.value as {
      mensagem: string;
      horario: string;
      ativo: boolean;
    };

    // Check if automatic sending is enabled
    if (!config.ativo) {
      console.log('Envio automático de aniversário está desativado');
      return new Response(
        JSON.stringify({ message: 'Envio automático desativado', sent: 0 }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 200 }
      );
    }

    // Check if it's the right time to send (default 09:00)
    const [configHour, configMinute] = config.horario.split(':').map(Number);
    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();

    // Only send if it's the configured time (with 1 minute tolerance)
    if (currentHour !== configHour || Math.abs(currentMinute - configMinute) > 1) {
      console.log(`Não é o horário de envio. Configurado: ${config.horario}, Atual: ${currentHour}:${currentMinute}`);
      return new Response(
        JSON.stringify({ 
          message: `Não é o horário de envio. Configurado: ${config.horario}`, 
          sent: 0 
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 200 }
      );
    }

    // Find clients with birthday today
    const { data: clientes, error: clientesError } = await supabase
      .from('clientes')
      .select('id, nome, data_nascimento, whatsapp, telefone')
      .not('data_nascimento', 'is', null)
      .eq('tipo_pessoa', 'fisica');

    if (clientesError) {
      throw clientesError;
    }

    if (!clientes || clientes.length === 0) {
      console.log('Nenhum cliente encontrado com data de nascimento cadastrada');
      return new Response(
        JSON.stringify({ message: 'Nenhum cliente com aniversário hoje', sent: 0 }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 200 }
      );
    }

    // Filter clients with birthday today
    const aniversariantes = clientes.filter(cliente => {
      if (!cliente.data_nascimento) return false;
      
      const nascimento = new Date(cliente.data_nascimento);
      const nascimentoMonth = nascimento.getMonth() + 1;
      const nascimentoDay = nascimento.getDate();
      
      return nascimentoMonth === todayMonth && nascimentoDay === todayDay;
    });

    if (aniversariantes.length === 0) {
      console.log('Nenhum cliente faz aniversário hoje');
      return new Response(
        JSON.stringify({ message: 'Nenhum cliente faz aniversário hoje', sent: 0 }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 200 }
      );
    }

    console.log(`Encontrados ${aniversariantes.length} aniversariantes hoje`);

    // Check if messages were already sent today
    const todayString = today.toISOString().split('T')[0];
    const { data: sentToday } = await supabase
      .from('aniversario_mensagens_enviadas')
      .select('cliente_id')
      .eq('data_envio', todayString);

    const sentClientIds = new Set(sentToday?.map(s => s.cliente_id) || []);

    let sentCount = 0;
    let errorCount = 0;

    // Send birthday message to each client
    for (const cliente of aniversariantes) {
      // Skip if already sent today
      if (sentClientIds.has(cliente.id)) {
        console.log(`Mensagem já enviada hoje para ${cliente.nome}`);
        continue;
      }

      // Get phone number (prefer WhatsApp, fallback to telefone)
      const phone = cliente.whatsapp || cliente.telefone;
      if (!phone) {
        console.log(`Cliente ${cliente.nome} não tem telefone cadastrado`);
        continue;
      }

      try {
        // Replace {nome} in message
        const message = config.mensagem.replace(/{nome}/g, cliente.nome);

        // Send WhatsApp message via ativa-crm-api
        const { data: messageResult, error: messageError } = await supabase.functions.invoke('ativa-crm-api', {
          body: {
            action: 'send_message',
            data: {
              number: phone,
              body: message
            }
          }
        });

        if (messageError) {
          console.error(`Erro ao enviar mensagem para ${cliente.nome}:`, messageError);
          errorCount++;
        } else if (messageResult && messageResult.warning === 'ERR_NO_DEF_WAPP_FOUND') {
          console.warn(`WhatsApp não configurado para ${cliente.nome} - mensagem processada mas não enviada`);
          errorCount++;
        } else {
          console.log(`Mensagem de aniversário enviada com sucesso para ${cliente.nome}`);
          
          // Record that message was sent
          await supabase
            .from('aniversario_mensagens_enviadas')
            .insert({
              cliente_id: cliente.id,
              data_envio: todayString,
              horario_envio: `${configHour}:${configMinute}:00`,
              mensagem_enviada: message,
              status: 'enviado'
            });

          sentCount++;
        }
      } catch (error: any) {
        console.error(`Erro ao processar cliente ${cliente.nome}:`, error);
        errorCount++;
      }
    }

    const result = {
      message: `Mensagens de aniversário processadas`,
      sent: sentCount,
      errors: errorCount,
      total: aniversariantes.length,
      date: todayString
    };

    return new Response(
      JSON.stringify(result),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 200 }
    );
  } catch (error: any) {
    console.error('Erro ao processar mensagens de aniversário:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro ao processar mensagens de aniversário',
        details: error.toString()
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 }
    );
  }
});

