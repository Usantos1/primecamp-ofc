import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { from } from '@/integrations/db/client';

export interface ChecklistConfigItem {
  id: string;
  tipo: 'entrada' | 'saida';
  item_id: string;
  nome: string;
  categoria: 'fisico' | 'funcional';
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export function useChecklistConfig(tipo?: 'entrada' | 'saida') {
  const queryClient = useQueryClient();

  // Buscar todos os itens de checklist
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['checklist_config', tipo],
    queryFn: async () => {
      let query = supabase
        .from('os_checklist_config')
        .select('*')
        .execute().order('ordem', { ascending: true });

      if (tipo) {
        query = query.eq('tipo', tipo);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as ChecklistConfigItem[];
    },
  });

  // Criar item
  const createItem = useMutation({
    mutationFn: async (item: Omit<ChecklistConfigItem, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('os_checklist_config')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data as ChecklistConfigItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist_config'] });
    },
  });

  // Atualizar item
  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ChecklistConfigItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('os_checklist_config')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ChecklistConfigItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist_config'] });
    },
  });

  // Deletar item
  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('os_checklist_config')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist_config'] });
    },
  });

  // Filtrar por tipo e categoria
  const itemsEntrada = items.filter(i => i.tipo === 'entrada' && i.ativo);
  const itemsSaida = items.filter(i => i.tipo === 'saida' && i.ativo);
  const itemsFisico = items.filter(i => i.categoria === 'fisico' && i.ativo);
  const itemsFuncional = items.filter(i => i.categoria === 'funcional' && i.ativo);

  return {
    items,
    itemsEntrada,
    itemsSaida,
    itemsFisico,
    itemsFuncional,
    isLoading,
    createItem,
    updateItem,
    deleteItem,
  };
}

