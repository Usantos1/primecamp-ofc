import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ItemOS } from '@/types/assistencia';

export function useItensOSSupabase(osId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar itens da OS
  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['os_items', osId],
    queryFn: async () => {
      if (!osId || osId === 'temp') return [];
      
      const { data, error } = await supabase
        .from('os_items')
        .select('*')
        .eq('ordem_servico_id', osId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data || []) as ItemOS[];
    },
    enabled: !!osId && osId !== 'temp',
  });

  // Calcular total
  const total = itens.reduce((acc, i) => acc + Number(i.valor_total || 0), 0);

  // Adicionar item
  const addItem = useMutation({
    mutationFn: async (data: Omit<ItemOS, 'id' | 'ordem_servico_id' | 'created_at'>): Promise<ItemOS> => {
      if (!osId || osId === 'temp') {
        throw new Error('OS deve ser criada antes de adicionar itens');
      }

      const novoItem: any = {
        ordem_servico_id: osId,
        produto_id: data.produto_id || null,
        tipo: data.tipo,
        descricao: data.descricao,
        quantidade: data.quantidade,
        valor_unitario: data.valor_unitario,
        valor_minimo: data.valor_minimo || 0,
        desconto: data.desconto || 0,
        valor_total: data.valor_total,
        garantia: data.garantia || 0,
        colaborador_id: data.colaborador_id || null,
        colaborador_nome: data.colaborador_nome || null,
        created_by: user?.id || null,
      };

      const { data: inserted, error } = await supabase
        .from('os_items')
        .insert(novoItem)
        .select()
        .single();

      if (error) throw error;
      return inserted as ItemOS;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['os_items', osId] });
      queryClient.invalidateQueries({ queryKey: ['os_items_all'] }); // Invalidar query da lista
    },
  });

  // Atualizar item
  const updateItem = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ItemOS> }): Promise<ItemOS> => {
      const { data: updated, error } = await supabase
        .from('os_items')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated as ItemOS;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['os_items', osId] });
      queryClient.invalidateQueries({ queryKey: ['os_items_all'] }); // Invalidar query da lista
    },
  });

  // Remover item
  const removeItem = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('os_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['os_items', osId] });
      queryClient.invalidateQueries({ queryKey: ['os_items_all'] }); // Invalidar query da lista
    },
  });

  return {
    itens,
    total,
    isLoading,
    addItem: addItem.mutateAsync,
    updateItem: (id: string, data: Partial<ItemOS>) => updateItem.mutateAsync({ id, data }),
    removeItem: removeItem.mutateAsync,
  };
}

