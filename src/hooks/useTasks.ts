import { useState, useEffect } from 'react';
import { from } from '@/integrations/db/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useUserLogs } from '@/hooks/useUserLogs';

export interface Task {
  id: string;
  name: string;
  description?: string;
  category_id?: string;
  process_id?: string;
  responsible_user_id: string;
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed' | 'canceled';
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined data
  responsible_name?: string;
  category_name?: string;
  process_name?: string;
}

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { logActivity } = useUserLogs();

  const fetchTasks = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // 🚫 Supabase RPC removido - TODO: implementar na API quando necessário
      // await supabase.rpc('update_overdue_tasks');
      
      // Then fetch tasks with related data
      const { data, error } = await from('tasks')
        .select('*')
        .order('deadline', { ascending: true })
        .execute();
        
      if (error) {
        console.error('Error fetching tasks:', error);
        toast.error('Erro ao carregar tarefas');
        return;
      }

      // Fetch user names separately
      const userIds = [...new Set((data || []).map(task => task.responsible_user_id).filter(Boolean))];
      const { data: profiles } = userIds.length > 0 
        ? await from('profiles')
            .select('user_id, display_name')
            .in('user_id', userIds)
            .execute()
        : { data: [] };

      // Buscar categorias e processos separadamente se necessário
      const categoryIds = [...new Set((data || []).map(t => t.category_id).filter(Boolean))];
      const processIds = [...new Set((data || []).map(t => t.process_id).filter(Boolean))];
      
      const { data: categories } = categoryIds.length > 0 
        ? await from('categories').select('id, name').in('id', categoryIds).execute()
        : { data: [] };
      
      const { data: processes } = processIds.length > 0
        ? await from('processes').select('id, name').in('id', processIds).execute()
        : { data: [] };

      const formattedTasks: Task[] = (data || []).map(task => {
        const profile = profiles?.find(p => p.user_id === task.responsible_user_id);
        const category = categories?.find(c => c.id === task.category_id);
        const process = processes?.find(p => p.id === task.process_id);
        return {
          id: task.id,
          name: task.name,
          description: task.description,
          category_id: task.category_id,
          process_id: task.process_id,
          responsible_user_id: task.responsible_user_id,
          deadline: task.deadline,
          status: task.status as Task['status'],
          created_by: task.created_by,
          created_at: task.created_at,
          updated_at: task.updated_at,
          responsible_name: profile?.display_name || 'Usuário sem nome',
          category_name: category?.name || 'Sem categoria',
          process_name: process?.name || 'Sem processo'
        };
      });

      setTasks(formattedTasks);
    } catch (error) {
      console.error('Error in fetchTasks:', error);
      toast.error('Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Validate required fields
      if (!taskData.name || !taskData.responsible_user_id || !taskData.deadline) {
        toast.error('Nome, responsável e prazo são obrigatórios');
        return false;
      }

      // Ensure datetime format is correct
      const formattedTaskData = {
        ...taskData,
        deadline: new Date(taskData.deadline).toISOString(),
        category_id: taskData.category_id || null,
        process_id: taskData.process_id || null,
        description: taskData.description || null
      };

      console.log('Creating task with data:', formattedTaskData);

      const { data, error } = await from('tasks')
        .insert([formattedTaskData])
        .select('*')
        .execute();

      if (error) {
        console.error('Error creating task:', error);
        toast.error(`Erro ao criar tarefa: ${error.message}`);
        return false;
      }

      console.log('Task created successfully:', data);
      
      // Log da criação da tarefa
      if (data && data[0]) {
        await logActivity(
          'create_task',
          `Tarefa criada: ${formattedTaskData.name}`,
          'task',
          data[0].id,
          {
            taskName: formattedTaskData.name,
            responsibleUserId: formattedTaskData.responsible_user_id,
            deadline: formattedTaskData.deadline,
            category: formattedTaskData.category_id,
            process: formattedTaskData.process_id
          }
        );
      }
      
      toast.success('Tarefa criada com sucesso!');
      await fetchTasks();
      return true;
    } catch (error) {
      console.error('Error in createTask:', error);
      toast.error(`Erro ao criar tarefa: ${error}`);
      return false;
    }
  };

  const updateTaskStatus = async (taskId: string, status: Task['status'], oldStatus?: string) => {
    try {
      const { error } = await from('tasks')
        .update({ status })
        .eq('id', taskId)
        .execute();

      if (error) {
        console.error('Error updating task status:', error);
        toast.error('Erro ao atualizar status da tarefa');
        return false;
      }

      // Notification is now handled by NotificationManager automatically

      // Log da atualização de status
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        await logActivity(
          'update_task_status',
          `Status da tarefa alterado: ${task.name} (${oldStatus || 'desconhecido'} → ${status})`,
          'task',
          taskId,
          {
            taskName: task.name,
            oldStatus: oldStatus || 'desconhecido',
            newStatus: status,
            deadline: task.deadline
          }
        );
      }

      toast.success('Status da tarefa atualizado!');
      await fetchTasks();
      return true;
    } catch (error) {
      console.error('Error in updateTaskStatus:', error);
      toast.error('Erro ao atualizar status da tarefa');
      return false;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await from('tasks')
        .delete()
        .eq('id', taskId)
        .execute();

      if (error) {
        console.error('Error deleting task:', error);
        toast.error('Erro ao excluir tarefa');
        return false;
      }

      const taskToDelete = tasks.find(t => t.id === taskId);
      const taskName = taskToDelete?.name || 'Tarefa desconhecida';
      
      // Log da exclusão da tarefa
      await logActivity(
        'delete_task',
        `Tarefa excluída: ${taskName}`,
        'task',
        taskId,
        {
          taskName,
          responsibleUserId: taskToDelete?.responsible_user_id,
          deadline: taskToDelete?.deadline,
          status: taskToDelete?.status
        }
      );

      toast.success('Tarefa excluída com sucesso!');
      await fetchTasks();
      return true;
    } catch (error) {
      console.error('Error in deleteTask:', error);
      toast.error('Erro ao excluir tarefa');
      return false;
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const updateTask = async (taskId: string, taskData: Partial<Task>) => {
    try {
      const { error } = await from('tasks')
        .update({
          name: taskData.name,
          description: taskData.description,
          category_id: taskData.category_id,
          responsible_user_id: taskData.responsible_user_id,
          deadline: taskData.deadline,
          status: taskData.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .execute();

      if (error) {
        console.error('Error updating task:', error);
        toast.error('Erro ao atualizar tarefa');
        return false;
      }

      const task = tasks.find(t => t.id === taskId);
      const taskName = task?.name || 'Tarefa desconhecida';
      
      // Log da atualização da tarefa
      await logActivity(
        'update_task',
        `Tarefa atualizada: ${taskName}`,
        'task',
        taskId,
        {
          taskName,
          updatedFields: Object.keys(taskData),
          changes: taskData
        }
      );

      await fetchTasks();
      toast.success('Tarefa atualizada com sucesso!');
      return true;
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Erro ao atualizar tarefa');
      return false;
    }
  };

  return {
    tasks,
    loading,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    refetch: fetchTasks
  };
};