import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { from } from '@/integrations/db/client';
import { useToast } from '@/hooks/use-toast';

export function useModules(trainingId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: modules, isLoading } = useQuery({
    queryKey: ['training-modules', trainingId],
    queryFn: async () => {
      if (!trainingId) return [];
      
      const { data, error } = await supabase
        .from('training_modules')
        .select('*, training_lessons(*).execute()')
        .eq('training_id', trainingId)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      
      // Sort lessons within each module
      return data.map(module => ({
        ...module,
        training_lessons: module.training_lessons?.sort((a: any, b: any) => 
          a.order_index - b.order_index
        ) || []
      }));
    },
    enabled: !!trainingId
  });

  const createModule = useMutation({
    mutationFn: async (module: any) => {
      const { data, error } = await supabase
        .from('training_modules')
        .insert(module)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-modules'] });
      toast({ title: 'Módulo criado com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar módulo', variant: 'destructive' });
    }
  });

  const updateModule = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase
        .from('training_modules')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-modules'] });
      toast({ title: 'Módulo atualizado' });
    }
  });

  const deleteModule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('training_modules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-modules'] });
      toast({ title: 'Módulo deletado' });
    }
  });

  const reorderModules = useMutation({
    mutationFn: async (modules: { id: string; order_index: number }[]) => {
      const updates = modules.map(m => 
        from('training_modules').update({ order_index: m.order_index }).eq('id', m.id)
      );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-modules'] });
    }
  });

  return {
    modules,
    isLoading,
    createModule,
    updateModule,
    deleteModule,
    reorderModules
  };
}
