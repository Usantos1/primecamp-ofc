import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FlowBuilder } from '@/components/FlowBuilder';
import { ProcessViewer } from '@/components/ProcessViewer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Edit, Eye } from 'lucide-react';
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

  const handleSaveFlow = async (nodes: any[], edges: any[]) => {
    if (!processId) return;

    try {
      // Salva no localStorage para persistência imediata
      const flowData = { nodes, edges };
      localStorage.setItem(`flow-layout-${processId}`, JSON.stringify(flowData));

      // Se for admin, salva também no banco
      if (profile && isAdmin) {
        const { error } = await supabase
          .from('processes')
          .update({
            flow_nodes: nodes,
            flow_edges: edges,
            updated_at: new Date().toISOString()
          })
          .eq('id', processId);

        if (error) {
          toast({
            title: "Erro",
            description: "Erro ao salvar fluxo no banco",
            variant: "destructive"
          });
          return;
        }

        toast({
          title: "Sucesso",
          description: "Fluxo salvo com sucesso",
        });

        // Refresh process data
        await fetchProcess();
      } else {
        toast({
          title: "Layout salvo",
          description: "Layout do fluxo salvo localmente",
        });
      }
    } catch (error) {
      console.error('Error saving flow:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar fluxo",
        variant: "destructive"
      });
    }
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
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Processo não encontrado</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header fixo no topo */}
      <div className="sticky top-0 z-50 h-14 bg-background border-b border-border flex items-center px-2 sm:px-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/')}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Voltar</span>
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <Badge variant="outline" className="text-xs shrink-0">
                {process.department}
              </Badge>
              <Badge variant={process.status === 'active' ? 'default' : 'secondary'} className="text-xs shrink-0">
                {process.status}
              </Badge>
            </div>
            <h1 className="text-sm sm:text-lg font-semibold truncate min-w-0">
              {process.name}
            </h1>
          </div>
          
          {profile && isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/processo/${processId}/edit`)}
              className="shrink-0"
            >
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Editar</span>
            </Button>
          )}
        </div>
      </div>

      {/* Content com scroll adequado */}
      <div className="pb-4">
        <Tabs defaultValue="details" className="w-full">
          <div className="sticky top-14 z-40 bg-background border-b border-border">
            <TabsList className="mx-2 sm:mx-4 mt-2 sm:mt-4 mb-2 grid w-full max-w-[400px] grid-cols-2">
              <TabsTrigger value="details" className="text-xs sm:text-sm">Detalhes</TabsTrigger>
              <TabsTrigger value="flow" className="text-xs sm:text-sm">Fluxo</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="details" className="mx-2 sm:mx-4 mt-2">
            <ProcessViewer 
              process={process}
              onEdit={() => navigate(`/processo/${processId}/edit`)}
              onBack={() => navigate('/')}
            />
          </TabsContent>
          
          <TabsContent value="flow" className="mx-2 sm:mx-4 mt-2">
            <div className="h-[calc(100vh-8rem)]">
              <FlowBuilder
                processId={process.id}
                initialNodes={process.flowNodes || []}
                initialEdges={process.flowEdges || []}
                onSave={handleSaveFlow}
                readOnly={!profile || !isAdmin}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProcessView;