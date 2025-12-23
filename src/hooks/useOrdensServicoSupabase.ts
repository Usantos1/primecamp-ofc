import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { OrdemServico, StatusOS } from '@/types/assistencia';

export function useOrdensServicoSupabase() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar todas as OS
  const { data: ordens = [], isLoading } = useQuery({
    queryKey: ['ordens_servico'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as OrdemServico[];
    },
  });

  // Criar OS
  const createOS = useMutation({
    mutationFn: async (data: Partial<OrdemServico>): Promise<OrdemServico> => {
      const now = new Date();
      
      // Usar número fornecido ou buscar próximo número
      let numero: number;
      if (data.numero) {
        // Usar o número fornecido diretamente (permite números específicos para importação)
        numero = data.numero;
      } else {
        // Buscar próximo número apenas se não foi fornecido
        const { data: lastOS } = await supabase
          .from('ordens_servico')
          .select('numero')
          .order('numero', { ascending: false })
          .limit(1)
          .single();
        
        numero = lastOS?.numero ? lastOS.numero + 1 : 1;
      }

      const novaOS: any = {
        numero,
        situacao: (data.status === 'entregue' || data.status === 'cancelada') ? 'fechada' : 'aberta',
        status: data.status || 'aberta',
        data_entrada: data.data_entrada || now.toISOString().split('T')[0],
        hora_entrada: data.hora_entrada || now.toTimeString().slice(0, 5),
        cliente_id: data.cliente_id || null,
        cliente_nome: data.cliente_nome || null,
        cliente_empresa: data.cliente_empresa || null,
        telefone_contato: data.telefone_contato || '',
        tipo_aparelho: data.tipo_aparelho || 'Celular',
        marca_id: data.marca_id || null,
        marca_nome: data.marca_nome || null,
        modelo_id: data.modelo_id || null,
        modelo_nome: data.modelo_nome || null,
        imei: data.imei || null,
        numero_serie: data.numero_serie || null,
        cor: data.cor || null,
        senha_aparelho: data.senha_aparelho || null,
        senha_numerica: data.senha_numerica || null,
        padrao_desbloqueio: data.padrao_desbloqueio || null,
        possui_senha: data.possui_senha || false,
        deixou_aparelho: data.deixou_aparelho ?? true,
        apenas_agendamento: data.apenas_agendamento || false,
        descricao_problema: data.descricao_problema || '',
        problema_constatado: data.problema_constatado || null,
        descricao_servico: data.descricao_servico || null,
        checklist_entrada: data.checklist_entrada || [],
        checklist_saida: [],
        areas_defeito: data.areas_defeito || [],
        observacoes_checklist: data.observacoes_checklist || null,
        condicoes_equipamento: data.condicoes_equipamento || null,
        observacoes: data.observacoes || null,
        observacoes_internas: data.observacoes_internas || null,
        previsao_entrega: data.previsao_entrega || null,
        hora_previsao: data.hora_previsao || null,
        orcamento_parcelado: data.orcamento_parcelado || null,
        orcamento_desconto: data.orcamento_desconto || null,
        orcamento_autorizado: data.orcamento_autorizado || false,
        tecnico_id: data.tecnico_id || null,
        tecnico_nome: data.tecnico_nome || null,
        servico_executado: data.servico_executado || null,
        vendedor_id: data.vendedor_id || null,
        vendedor_nome: data.vendedor_nome || null,
        subtotal: 0,
        desconto: 0,
        valor_total: 0,
        created_by: user?.id || null,
      };

      const { data: inserted, error } = await supabase
        .from('ordens_servico')
        .insert(novaOS)
        .select()
        .single();

      if (error) throw error;
      return inserted as OrdemServico;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens_servico'] });
    },
  });

  // Atualizar OS
  const updateOS = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<OrdemServico> }): Promise<OrdemServico> => {
      const { data: updated, error } = await supabase
        .from('ordens_servico')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated as OrdemServico;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens_servico'] });
    },
  });

  // Deletar OS
  const deleteOS = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('ordens_servico')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens_servico'] });
    },
  });

  // Buscar OS por ID
  const getOSById = useCallback((id: string): OrdemServico | undefined => {
    return ordens.find(os => os.id === id);
  }, [ordens]);

  // Atualizar status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusOS | string }): Promise<void> => {
      // Buscar dados da OS antes de atualizar
      const { data: osData } = await supabase
        .from('ordens_servico')
        .select('id, numero, status, cliente_id, cliente_nome, telefone_contato, valor_total')
        .eq('id', id)
        .single();

      const updates: any = { status };
      
      if (status === 'entregue') {
        updates.situacao = 'fechada';
        updates.data_entrega = new Date().toISOString().split('T')[0];
      }
      if (status === 'cancelada') {
        updates.situacao = 'cancelada';
      }
      if (status === 'finalizada') {
        updates.data_conclusao = new Date().toISOString().split('T')[0];
      }
      
      const { error } = await supabase
        .from('ordens_servico')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Enviar status para API externa (não bloquear se falhar)
      if (osData) {
        try {
          const { data: clienteData } = await supabase
            .from('clientes')
            .select('nome, telefone, whatsapp')
            .eq('id', osData.cliente_id)
            .single();

          await supabase.functions.invoke('ativa-crm-api', {
            body: {
              action: 'update_os_status',
              data: {
                os_id: id,
                os_numero: osData.numero || 0,
                status: status,
                cliente_nome: osData.cliente_nome || clienteData?.nome || '',
                cliente_telefone: osData.telefone_contato || clienteData?.telefone || clienteData?.whatsapp || '',
                valor_total: osData.valor_total || 0
              }
            }
          });
        } catch (apiError) {
          console.error('Erro ao enviar status de OS para API externa:', apiError);
          // Não lançar erro para não bloquear a atualização do status
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens_servico'] });
    },
  });

  // Estatísticas
  const getEstatisticas = useCallback(() => {
    const hoje = new Date().toISOString().split('T')[0];
    const aguardandoStatuses = [
      'aguardando_orcamento',
      'aguardando_peca',
      'aguardando_aprovacao',
      'aguardando_cliente'
    ];
    
    return {
      total: ordens.length,
      abertas: ordens.filter(o => o.status === 'aberta').length,
      emAndamento: ordens.filter(o => ['em_andamento', 'aprovado'].includes(o.status)).length,
      aguardando: ordens.filter(o => aguardandoStatuses.includes(o.status)).length,
      aguardandoPeca: ordens.filter(o => o.status === 'aguardando_peca').length,
      finalizadas: ordens.filter(o => o.status === 'finalizada').length,
      aguardandoRetirada: ordens.filter(o => o.status === 'aguardando_retirada').length,
      entregues: ordens.filter(o => o.status === 'entregue').length,
      canceladas: ordens.filter(o => o.status === 'cancelada').length,
      hoje: ordens.filter(o => o.data_entrada === hoje).length,
      prazoHoje: ordens.filter(o => o.previsao_entrega === hoje && !['entregue', 'cancelada'].includes(o.status)).length,
      emAtraso: ordens.filter(o => 
        o.previsao_entrega && 
        o.previsao_entrega < hoje && 
        !['entregue', 'cancelada'].includes(o.status)
      ).length,
    };
  }, [ordens]);

  return {
    ordens,
    isLoading,
    createOS: createOS.mutateAsync,
    updateOS: (id: string, data: Partial<OrdemServico>) => updateOS.mutateAsync({ id, data }),
    deleteOS: deleteOS.mutateAsync,
    getOSById,
    updateStatus: (id: string, status: StatusOS | string) => updateStatus.mutateAsync({ id, status }),
    getEstatisticas,
  };
}

import { useCallback } from 'react';

