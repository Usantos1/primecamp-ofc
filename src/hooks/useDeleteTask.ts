import { useTasks } from '@/hooks/useTasks';
import { toast } from 'sonner';

export const useDeleteTask = () => {
  const { deleteTask } = useTasks();

  const handleDeleteTask = async (taskId: string, taskName: string) => {
    try {
      const success = await deleteTask(taskId);
      
      if (success) {
        toast.success(`Tarefa "${taskName}" excluída com sucesso!`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Erro ao excluir tarefa');
      return false;
    }
  };

  return { handleDeleteTask };
};