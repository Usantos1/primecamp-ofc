import { useState, useEffect } from 'react';
import { Process, Department } from '@/types/process';
import { from } from '@/integrations/db/client';
import { toast } from 'sonner';
import { useUserLogs } from '@/hooks/useUserLogs';
import { useAuth } from '@/contexts/AuthContext';

export const useProcesses = () => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const { logActivity } = useUserLogs();

  const fetchProcesses = async () => {
    try {
      const { data, error } = await supabase
        .from('processes')
        .select('*')
        .execute().order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching processes:', error);
        toast.error('Erro ao carregar processos');
        return;
      }

      const formattedProcesses: Process[] = data.map(row => ({
        id: row.id,
        name: row.name,
        objective: row.objective,
        department: row.department as Department,
        owner: row.owner,
        priority: row.priority || 1,
        participants: Array.isArray(row.participants) ? row.participants : [],
        activities: Array.isArray(row.activities) ? row.activities as any : [],
        metrics: Array.isArray(row.metrics) ? row.metrics : [],
        automations: Array.isArray(row.automations) ? row.automations : [],
        tags: Array.isArray(row.tags) ? row.tags : [],
        flowNodes: Array.isArray(row.flow_nodes) ? row.flow_nodes as any : [],
        flowEdges: Array.isArray(row.flow_edges) ? row.flow_edges as any : [],
        youtubeVideoId: row.youtube_video_id || '',
        categoryId: row.category_id,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        status: row.status as Process['status']
      }));

      setProcesses(formattedProcesses);
    } catch (error) {
      console.error('Unexpected error fetching processes:', error);
      toast.error('Erro inesperado ao carregar processos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  const createProcess = async (processData: Omit<Process, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        toast.error('Usuário não autenticado');
        return null;
      }

      const { data, error } = await supabase
        .from('processes')
        .insert({
          name: processData.name,
          objective: processData.objective,
          department: processData.department,
          owner: processData.owner,
          priority: processData.priority || 1,
          participants: processData.participants || [],
          activities: processData.activities as any || [],
          metrics: processData.metrics || [],
          automations: processData.automations || [],
          tags: processData.tags || [],
          flow_nodes: processData.flowNodes as any || [],
          flow_edges: processData.flowEdges as any || [],
          youtube_video_id: processData.youtubeVideoId || null,
          status: processData.status,
          category_id: processData.categoryId,
          created_by: user.data.user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating process:', error);
        toast.error('Erro ao criar processo');
        return null;
      }

      const newProcess: Process = {
        id: data.id,
        name: data.name,
        objective: data.objective,
        department: data.department as Department,
        owner: data.owner,
        priority: data.priority,
        participants: Array.isArray(data.participants) ? data.participants : [],
        activities: Array.isArray(data.activities) ? data.activities as any : [],
        metrics: Array.isArray(data.metrics) ? data.metrics : [],
        automations: Array.isArray(data.automations) ? data.automations : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        flowNodes: Array.isArray(data.flow_nodes) ? data.flow_nodes as any : [],
        flowEdges: Array.isArray(data.flow_edges) ? data.flow_edges as any : [],
        youtubeVideoId: data.youtube_video_id || '',
        categoryId: data.category_id,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        status: data.status as Process['status']
      };

      setProcesses(prev => [newProcess, ...prev]);
      
      // Log da criação do processo
      await logActivity(
        'create_process',
        `Processo criado: ${newProcess.name}`,
        'process',
        newProcess.id,
        {
          processName: newProcess.name,
          department: newProcess.department,
          owner: newProcess.owner,
          priority: newProcess.priority
        }
      );
      
      toast.success('Processo criado com sucesso');
      return newProcess;
    } catch (error) {
      console.error('Unexpected error creating process:', error);
      toast.error('Erro inesperado ao criar processo');
      return null;
    }
  };

  const updateProcess = async (id: string, updates: Partial<Process>) => {
    try {
      const { error } = await supabase
        .from('processes')
        .update({
          ...(updates.name && { name: updates.name }),
          ...(updates.objective && { objective: updates.objective }),
          ...(updates.department && { department: updates.department }),
          ...(updates.owner && { owner: updates.owner }),
          ...(updates.priority !== undefined && { priority: updates.priority }),
          ...(updates.participants && { participants: updates.participants }),
          ...(updates.activities && { activities: updates.activities as any }),
          ...(updates.metrics && { metrics: updates.metrics }),
          ...(updates.automations && { automations: updates.automations }),
          ...(updates.tags && { tags: updates.tags }),
          ...(updates.flowNodes && { flow_nodes: updates.flowNodes as any }),
          ...(updates.flowEdges && { flow_edges: updates.flowEdges as any }),
          ...(updates.youtubeVideoId !== undefined && { youtube_video_id: updates.youtubeVideoId }),
          ...(updates.status && { status: updates.status }),
          ...(updates.categoryId !== undefined && { category_id: updates.categoryId })
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating process:', error);
        toast.error('Erro ao atualizar processo');
        return;
      }

      setProcesses(prev =>
        prev.map(process =>
          process.id === id
            ? { ...process, ...updates, updatedAt: new Date() }
            : process
        )
      );
      
      // Log da atualização do processo
      const processName = processes.find(p => p.id === id)?.name || 'Processo desconhecido';
      await logActivity(
        'update_process',
        `Processo atualizado: ${processName}`,
        'process',
        id,
        {
          processName,
          updatedFields: Object.keys(updates),
          updates
        }
      );
      
      toast.success('Processo atualizado com sucesso');
    } catch (error) {
      console.error('Unexpected error updating process:', error);
      toast.error('Erro inesperado ao atualizar processo');
    }
  };

  const deleteProcess = async (id: string) => {
    try {
      const { error } = await supabase
        .from('processes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting process:', error);
        toast.error('Erro ao excluir processo');
        return;
      }

      const processToDelete = processes.find(p => p.id === id);
      const processName = processToDelete?.name || 'Processo desconhecido';
      
      setProcesses(prev => prev.filter(process => process.id !== id));
      
      // Log da exclusão do processo
      await logActivity(
        'delete_process',
        `Processo excluído: ${processName}`,
        'process',
        id,
        {
          processName,
          department: processToDelete?.department,
          owner: processToDelete?.owner
        }
      );
      
      toast.success('Processo excluído com sucesso');
    } catch (error) {
      console.error('Unexpected error deleting process:', error);
      toast.error('Erro inesperado ao excluir processo');
    }
  };

  const getProcessById = (id: string) => {
    return processes.find(process => process.id === id);
  };

  const getProcessesByDepartment = (department: string) => {
    return processes.filter(process => process.department === department);
  };

  return {
    processes,
    loading,
    createProcess,
    updateProcess,
    deleteProcess,
    getProcessById,
    getProcessesByDepartment,
    refetch: fetchProcesses
  };
};