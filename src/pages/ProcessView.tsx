import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { from } from '@/integrations/db/client';
import { useAuth } from '@/contexts/AuthContext';
import { ProcessViewer } from '@/components/ProcessViewer';
import { ModernLayout } from '@/components/ModernLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Edit, ArrowLeft } from 'lucide-react';
import { Process } from '@/types/process';

const ProcessView = () => {
  const { processId } = useParams<{ processId: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading, profile } = useAuth();
  const { toast } = useToast();
  
  const [process, setProcess] = useState<Process | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
    
    if (processId && user) {
      fetchProcess();
    }
  }, [processId, user, authLoading, navigate]);

  const fetchProcess = async () => {
    if (!processId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('processes')
        .select('*')
        .execute().eq('id', processId)
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
      let flowNodes = Array.isArray(data.flow_nodes) ? data.flow_nodes as any[] : [];
      let flowEdges = Array.isArray(data.flow_edges) ? data.flow_edges as any[] : [];

      // Tenta carregar do localStorage se existir
      const savedFlow = localStorage.getItem(`flow-layout-${processId}`);
      if (savedFlow) {
        try {
          const parsed = JSON.parse(savedFlow);
          if (parsed.nodes && parsed.edges) {
            flowNodes = parsed.nodes;
            flowEdges = parsed.edges;
          }
        } catch (e) {
          console.warn('Erro ao carregar fluxo do localStorage:', e);
        }
      }

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
        tags: Array.isArray(data.tags) ? data.tags as string[] : [],
        priority: data.priority || 1,
        mediaFiles: Array.isArray(data.media_files) ? data.media_files as any[] : [],
        flowNodes,
        flowEdges,
        youtubeVideoId: data.youtube_video_id || '',
        categoryId: data.category_id,
        notes: data.notes || '',
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        status: data.status as any
      };

      console.log('ProcessView - Process loaded:', { 
        name: processData.name, 
        youtubeVideoId: processData.youtubeVideoId,
        flowNodes: processData.flowNodes?.length || 0, 
        flowEdges: processData.flowEdges?.length || 0,
        flowNodesData: processData.flowNodes,
        flowEdgesData: processData.flowEdges
      });
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


  if (authLoading || loading) {
    return (
      <ModernLayout title="Carregando..." subtitle="Carregando processo...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando processo...</p>
          </div>
        </div>
      </ModernLayout>
    );
  }

  if (!process) {
    return (
      <ModernLayout title="Processo não encontrado" subtitle="O processo solicitado não foi encontrado">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Processo não encontrado</p>
            <Button onClick={() => navigate('/processos')} className="mt-4">
              Voltar para Processos
            </Button>
          </CardContent>
        </Card>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout
      title={process.name}
      subtitle={`${process.department} • ${process.status === 'active' ? 'Ativo' : process.status === 'draft' ? 'Rascunho' : process.status}`}
    >
      <ProcessViewer 
        process={process}
        processId={processId || ''}
        onEdit={() => navigate(`/processo/${processId}/edit`)}
        onBack={() => navigate('/processos')}
      />
    </ModernLayout>
  );
};

export default ProcessView;