import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { from } from '@/integrations/db/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export function useTrainings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: trainings, isLoading } = useQuery({
    queryKey: ['trainings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainings')
        .select(`
          *,
          training_modules (
            id,
            title,
            description,
            order_index,
            training_lessons (
              id,
              title,
              description,
              video_url,
              duration_minutes,
              order_index
            )
          .execute())
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Sort modules and lessons
      return data?.map(training => ({
        ...training,
        training_modules: training.training_modules
          ?.sort((a: any, b: any) => a.order_index - b.order_index)
          .map((module: any) => ({
            ...module,
            training_lessons: module.training_lessons
              ?.sort((a: any, b: any) => a.order_index - b.order_index) || []
          })) || []
      }));
    }
  });

  const { data: myAssignments } = useQuery({
    queryKey: ['my-training-assignments'],
    queryFn: async () => {
      const { user } = useAuth();
      if (!user) return [];

      const { data, error } = await supabase
        .from('training_assignments')
        .select(`
          *,
          training:trainings(
            *,
            training_modules (
              id,
              title,
              description,
              order_index,
              training_lessons (
                id,
                title,
                description,
                video_url,
                duration_minutes,
                order_index
              )
            .execute())
          )
        `)
        .eq('user_id', user.id)
        .order('assigned_at', { ascending: false });
      
      if (error) throw error;
      
      // Sort modules and lessons, and get progress
      const assignmentsWithProgress = await Promise.all(data.map(async (assignment) => {
        const training = assignment.training;
        
        // Get lesson progress for this training
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('*')
          .execute().eq('user_id', user.id)
          .eq('training_id', training.id);
        
        const modules = training.training_modules
          ?.sort((a: any, b: any) => a.order_index - b.order_index)
          .map((module: any) => ({
            ...module,
            training_lessons: module.training_lessons
              ?.sort((a: any, b: any) => a.order_index - b.order_index) || []
          })) || [];
        
        // Calculate progress
        const totalLessons = modules.reduce((sum, m) => sum + (m.training_lessons?.length || 0), 0);
        const completedLessons = progressData?.filter(p => p.completed).length || 0;
        const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
        
        return {
          ...assignment,
          training: {
            ...training,
            training_modules: modules
          },
          totalLessons,
          completedLessons,
          progress
        };
      }));
      
      return assignmentsWithProgress;
    }
  });

  const createTraining = useMutation({
    mutationFn: async (training: any) => {
      const { user } = useAuth();
      
      const { data, error } = await supabase
        .from('trainings')
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
      const { error } = await supabase
        .from('trainings')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      toast({ title: 'Treinamento atualizado' });
    }
  });

  const deleteTraining = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('trainings')
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
      const { user } = useAuth();
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('training_assignments')
        .update({ 
          progress, 
          status,
          last_watched_seconds: lastWatchedSeconds,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('training_id', trainingId)
        .eq('user_id', user.id);
      
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
      const { user } = useAuth();
      if (!user) throw new Error('Not authenticated');
      
      const assignments = userIds.map(userId => ({
        training_id: trainingId,
        user_id: userId,
        assigned_by: user.id,
        due_date: dueDate,
        status: 'assigned' as const
      }));
      
      const { error } = await supabase
        .from('training_assignments')
        .upsert(assignments, { onConflict: 'training_id,user_id' });
      
      if (error) throw error;
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
