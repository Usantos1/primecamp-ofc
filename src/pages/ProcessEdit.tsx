import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { from } from '@/integrations/db/client';
import { useAuth } from '@/contexts/AuthContext';
import { ProcessForm } from '@/components/ProcessForm';
import { ModernLayout } from '@/components/ModernLayout';
import { useToast } from '@/hooks/use-toast';
import { Process } from '@/types/process';

const ProcessEdit = () => {
  const { processId } = useParams<{ processId: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading, profile } = useAuth();
  const { toast } = useToast();
  
  const [process, setProcess] = useState<Process | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('ProcessEdit - Auth state:', { user: !!user, isAdmin, authLoading, profile });
    
    if (!authLoading && !user) {
      console.log('ProcessEdit - Redirecting to auth (no user)');
      navigate('/login');
      return;
    }
    
    // Aguarda o perfil ser carregado antes de verificar se é admin
    if (!authLoading && user && profile && !isAdmin) {
      console.log('ProcessEdit - Redirecting home (not admin)');
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para editar processos",
        variant: "destructive"
      });
      navigate('/');
      return;
    }
    
    // Só tenta carregar o processo se tudo estiver ok
    if (processId && user && profile && isAdmin) {
      console.log('ProcessEdit - Fetching process');
      fetchProcess();
    }
  }, [processId, user, isAdmin, authLoading, navigate, profile]);

  const fetchProcess = async () => {
    if (!processId) return;
    
    setLoading(true);
    try {
      const { data, error } = await from('processes')
        .select('*')
        .eq('id', processId)
        .single();

      if (error) {
        toast({
          title: "Erro",
          description: "Processo não encontrado",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      // Convert database format to Process interface
      const processData: Process = {
        id: data.id,
        name: data.name,
        objective: data.objective,
        department: data.department as any,
        owner: data.owner,
        participants: Array.isArray(data.participants) ? data.participants as string[] : [],
        activities: Array.isArray(data.activities) ? data.activities as any[] : [],
        metrics: Array.isArray(data.metrics) ? data.metrics as string[] : [],
        automations: Array.isArray(data.automations) ? data.automations as string[] : [],
        priority: data.priority || 1,
        notes: data.notes || '',
        categoryId: data.category_id,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        status: data.status as any
      };

      setProcess(processData);
    } catch (error) {
      console.error('Error fetching process:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar processo",
        variant: "destructive"
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (processData: Omit<Process, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!processId) return;

    try {
      const { error } = await supabase
        .from('processes')
        .update({
          name: processData.name,
          objective: processData.objective,
          department: processData.department,
          owner: processData.owner,
          priority: processData.priority || 1,
          participants: processData.participants || [],
          activities: processData.activities as any || [],
          metrics: processData.metrics || [],
          automations: processData.automations || [],
          notes: processData.notes || '',
          status: processData.status,
          category_id: processData.categoryId,
          updated_at: new Date().toISOString()
        })
        .eq('id', processId);

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao atualizar processo",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Processo atualizado com sucesso",
      });

      navigate(`/processo/${processId}`);
    } catch (error) {
      console.error('Error updating process:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar processo",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    navigate(`/processo/${processId}`);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando processo...</p>
        </div>
      </div>
    );
  }

  if (!process) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Processo não encontrado</p>
      </div>
    );
  }

  return (
    <ModernLayout
      title="Editar Processo"
      subtitle="Configure e atualize os detalhes do processo"
    >
      <ProcessForm 
        process={process}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </ModernLayout>
  );
};

export default ProcessEdit;