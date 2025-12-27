import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { from } from '@/integrations/db/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export function useTrainings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: trainings, isLoading } = useQuery({
    queryKey: ['trainings'],
    queryFn: async () => {
      // Buscar treinamentos
      const { data: trainingsData, error: trainingsError } = await from('trainings')
        .select('*')
        .order('created_at', { ascending: false })
        .execute();
      
      if (trainingsError) throw trainingsError;
      
      // Para cada treinamento, buscar módulos e lições
      const trainingsWithModules = await Promise.all((trainingsData || []).map(async (training: any) => {
        const { data: modules } = await from('training_modules')
          .select('*')
          .eq('training_id', training.id)
          .order('order_index', { ascending: true })
          .execute();
        
        const modulesWithLessons = await Promise.all((modules || []).map(async (module: any) => {
          const { data: lessons } = await from('training_lessons')
            .select('*')
            .eq('module_id', module.id)
            .order('order_index', { ascending: true })
            .execute();
          
          return {
            ...module,
            training_lessons: lessons || []
          };
        }));
        
        return {
          ...training,
          training_modules: modulesWithLessons
        };
      }));
      
      return trainingsWithModules;
    }
  });

  const { data: myAssignments } = useQuery({
    queryKey: ['my-training-assignments', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Buscar assignments do usuário
      const { data: assignments, error: assignmentsError } = await from('training_assignments')
        .select('*')
        .eq('user_id', user.id)
        .order('assigned_at', { ascending: false })
        .execute();
      
      if (assignmentsError) throw assignmentsError;
      
      // Para cada assignment, buscar o treinamento completo e progresso
      const assignmentsWithProgress = await Promise.all((assignments || []).map(async (assignment: any) => {
        // Buscar treinamento
        const { data: trainingData } = await from('trainings')
          .select('*')
          .eq('id', assignment.training_id)
          .single();
        
        if (!trainingData) return null;
        
        // Buscar módulos
        const { data: modules } = await from('training_modules')
          .select('*')
          .eq('training_id', trainingData.id)
          .order('order_index', { ascending: true })
          .execute();
        
        // Buscar lições para cada módulo
        const modulesWithLessons = await Promise.all((modules || []).map(async (module: any) => {
          const { data: lessons } = await from('training_lessons')
            .select('*')
            .eq('module_id', module.id)
            .order('order_index', { ascending: true })
            .execute();
          
          return {
            ...module,
            training_lessons: lessons || []
          };
        }));
        
        // Buscar progresso
        const { data: progressData } = await from('lesson_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('training_id', trainingData.id)
          .execute();
        
        // Calcular progresso
        const totalLessons = modulesWithLessons.reduce((sum, m) => sum + (m.training_lessons?.length || 0), 0);
        const completedLessons = progressData?.filter((p: any) => p.completed).length || 0;
        const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
        
        return {
          ...assignment,
          training: {
            ...trainingData,
            training_modules: modulesWithLessons
          },
          totalLessons,
          completedLessons,
          progress
        };
      }));
      
      return assignmentsWithProgress.filter(Boolean);
    },
    enabled: !!user
  });

  const createTraining = useMutation({
    mutationFn: async (training: any) => {
      const { data, error } = await from('trainings')
        .insert({ ...training, created_by: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      toast({ title: 'Treinamento criado com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar treinamento', variant: 'destructive' });
    }
  });

  const updateTraining = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await from('trainings')
        .update(updates)
        .eq('id', id)
        .execute();
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      toast({ title: 'Treinamento atualizado' });
    }
  });

  const deleteTraining = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await from('trainings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      toast({ title: 'Treinamento deletado' });
    }
  });

  const updateProgress = useMutation({
    mutationFn: async ({ 
      trainingId, 
      progress, 
      status, 
      lastWatchedSeconds 
    }: {
      trainingId: string;
      progress: number;
      status: 'in_progress' | 'completed';
      lastWatchedSeconds: number;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await from('training_assignments')
        .update({ 
          progress, 
          status,
          last_watched_seconds: lastWatchedSeconds,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('training_id', trainingId)
        .eq('user_id', user.id)
        .execute();
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-training-assignments'] });
      toast({ title: 'Progresso salvo' });
    }
  });

  const assignTraining = useMutation({
    mutationFn: async ({ 
      trainingId, 
      userIds, 
      dueDate 
    }: {
      trainingId: string;
      userIds: string[];
      dueDate?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Inserir um por um para evitar conflitos
      for (const userId of userIds) {
        await from('training_assignments')
          .upsert({
            training_id: trainingId,
            user_id: userId,
            assigned_by: user.id,
            due_date: dueDate,
            status: 'assigned'
          }, { onConflict: 'training_id,user_id' });
      }
    },
    onSuccess: () => {
      toast({ title: 'Treinamento atribuído com sucesso' });
    }
  });

  return {
    trainings,
    myAssignments,
    isLoading,
    createTraining,
    updateTraining,
    deleteTraining,
    updateProgress,
    assignTraining
  };
}
