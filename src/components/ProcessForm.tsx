import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { X, Plus, Save, ArrowLeft, Settings, Brain, Loader2 } from "lucide-react";
import { Process, Activity, Department, DEPARTMENTS, COMMON_TAGS, MediaFile, FlowNode, FlowEdge } from "@/types/process";
import { useCategories } from "@/hooks/useCategories";
import { useUsers } from "@/hooks/useUsers";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FlowBuilder } from "./FlowBuilder";
import { MediaUpload } from "./MediaUpload";
import { PrioritySlider } from "./PrioritySlider";
import { RichTextEditor } from "./RichTextEditor";
import { MultiSelect, Option } from "./ui/multi-select";

interface ProcessFormProps {
  process?: Process;
  onSave: (process: Omit<Process, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  onClose?: () => void;
}

export const ProcessForm = ({ process, onSave, onCancel }: ProcessFormProps) => {
  const { toast } = useToast();
  const { categories } = useCategories();
  const { users } = useUsers();
  
  const [formData, setFormData] = useState({
    name: process?.name || '',
    objective: process?.objective || '',
    department: process?.department || '' as Department,
    owner: process?.owner || '',
    participants: process?.participants || [],
    activities: process?.activities || [{ id: '1', step: 1, description: '', responsible: '', estimatedTime: '', tools: [] }],
    metrics: process?.metrics || [''],
    automations: process?.automations || [],
    tags: process?.tags || [],
    notes: process?.notes || '',
    priority: process?.priority || 2,
    mediaFiles: process?.mediaFiles || [],
    flowNodes: process?.flowNodes || [],
    flowEdges: process?.flowEdges || [],
    youtubeVideoId: process?.youtubeVideoId || '',
    status: process?.status || 'draft' as const,
    categoryId: process?.categoryId || null
  });

  const [generatingProcess, setGeneratingProcess] = useState(false);
  const [iaApiKey, setIaApiKey] = useState<string>('');
  const [iaModel, setIaModel] = useState<string>('gpt-4.1-mini');

  // Load AI settings from integrations
  useEffect(() => {
    const loadAISettings = async () => {
      try {
        const { data, error } = await supabase
          .from('kv_store_2c4defad')
          .select('*')
          .eq('key', 'integration_settings')
          .maybeSingle();

        if (error) {
          console.error('Erro ao buscar integração IA:', error);
          return;
        }
        
        const value = (data as any)?.value;
        console.log('Configurações de IA carregadas no ProcessForm:', {
          hasApiKey: !!value?.aiApiKey,
          apiKeyLength: value?.aiApiKey?.length || 0,
          provider: value?.aiProvider,
          model: value?.aiModel
        });
        
        if (value?.aiApiKey) {
          setIaApiKey(value.aiApiKey);
        }
        if (value?.aiModel) {
          setIaModel(value.aiModel);
        }
      } catch (err) {
        console.error('Erro ao carregar integração IA:', err);
      }
    };

    loadAISettings();
  }, []);

  const generateProcessWithAI = async () => {
    if (!formData.name || !formData.objective) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome e objetivo do processo antes de gerar com IA.",
        variant: "destructive",
      });
      return;
    }

    if (!iaApiKey) {
      toast({
        title: "API Key não configurada",
        description: "Configure a API Key da OpenAI em Integrações.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingProcess(true);
    try {
      toast({
        title: "Gerando processo...",
        description: "A IA está criando o processo e fluxograma. Aguarde...",
      });

      console.log('Chamando generate-process com:', {
        processInfo: {
          name: formData.name,
          objective: formData.objective,
          department: formData.department,
          owner: formData.owner,
        },
        apiKeyLength: iaApiKey.length,
        model: iaModel
      });

      const { data, error } = await supabase.functions.invoke('generate-process', {
        body: {
          processInfo: {
            name: formData.name,
            objective: formData.objective,
            department: formData.department,
            owner: formData.owner,
          },
          provider: 'openai',
          apiKey: iaApiKey,
          model: iaModel,
        },
      });

      console.log('Resposta da função:', { data, error });

      if (error) {
        console.error('Erro na função:', error);
        throw error;
      }

      if (data?.error) {
        console.error('Erro na resposta:', data.error);
        throw new Error(data.error);
      }

      if (data.activities && Array.isArray(data.activities)) {
        // Aplicar atividades
        const updatedActivities = data.activities.map((act: any, idx: number) => ({
          id: `ai-${Date.now()}-${idx}`,
          step: act.step || idx + 1,
          description: act.description || '',
          responsible: act.responsible || formData.owner || '',
          estimatedTime: act.estimatedTime || '',
          tools: Array.isArray(act.tools) ? act.tools : [],
        }));

        // Mostrar sugestões de nome se fornecidas
        if (data.nameSuggestions && Array.isArray(data.nameSuggestions) && data.nameSuggestions.length > 0) {
          toast({
            title: "Sugestões de nome geradas",
            description: `Sugestões: ${data.nameSuggestions.slice(0, 3).join(', ')}. Você pode atualizar o nome do processo.`,
          });
        }

        setFormData(prev => {
          // Aplicar fluxograma (garantir que seja um array válido)
          const flowNodes = Array.isArray(data.flowNodes) && data.flowNodes.length > 0 
            ? data.flowNodes 
            : prev.flowNodes;
          const flowEdges = Array.isArray(data.flowEdges) && data.flowEdges.length > 0 
            ? data.flowEdges 
            : prev.flowEdges;

          return {
            ...prev,
            // Atualizar objetivo melhorado se fornecido
            objective: (data.improvedObjective && data.improvedObjective.length > 50) 
              ? data.improvedObjective 
              : prev.objective,
            activities: updatedActivities,
            flowNodes: flowNodes,
            flowEdges: flowEdges,
            metrics: Array.isArray(data.metrics) ? data.metrics : prev.metrics,
            automations: Array.isArray(data.automations) ? data.automations : prev.automations,
          };
        });

        console.log('Dados aplicados:', {
          activitiesCount: updatedActivities.length,
          flowNodesCount: flowNodes.length,
          flowEdgesCount: flowEdges.length,
          hasImprovedObjective: !!data.improvedObjective,
          flowNodes: flowNodes,
          flowEdges: flowEdges
        });

        // Validar se o fluxograma foi gerado
        if (flowNodes.length === 0 || flowEdges.length === 0) {
          console.warn('Fluxograma não foi gerado corretamente pela IA');
          toast({
            title: "Aviso",
            description: "Processo gerado, mas o fluxograma não foi criado. Você pode criar manualmente.",
            variant: "default",
          });
        } else {
          toast({
            title: "Processo gerado!",
            description: `O processo foi criado com ${updatedActivities.length} atividades e fluxograma completo (${flowNodes.length} nós, ${flowEdges.length} conexões). Revise e ajuste conforme necessário.`,
          });
        }
      } else {
        throw new Error('Resposta da IA não contém atividades válidas');
      }
    } catch (error: any) {
      console.error('Erro completo ao gerar processo:', error);
      const errorMessage = error.message || error.error || error.details || "Não foi possível gerar o processo. Verifique a API Key em Integrações.";
      toast({
        title: "Erro ao gerar processo",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setGeneratingProcess(false);
    }
  };

  const addActivity = () => {
    const newActivity: Activity = {
      id: Date.now().toString(),
      step: formData.activities.length + 1,
      description: '',
      responsible: '',
      estimatedTime: '',
      tools: []
    };
    setFormData({
      ...formData,
      activities: [...formData.activities, newActivity]
    });
  };

  const updateActivity = (index: number, field: keyof Activity, value: any) => {
    const updatedActivities = [...formData.activities];
    updatedActivities[index] = { ...updatedActivities[index], [field]: value };
    setFormData({
      ...formData,
      activities: updatedActivities
    });
  };

  const removeActivity = (index: number) => {
    if (formData.activities.length > 1) {
      const updatedActivities = formData.activities.filter((_, i) => i !== index);
      // Reorder steps
      updatedActivities.forEach((activity, i) => {
        activity.step = i + 1;
      });
      setFormData({
        ...formData,
        activities: updatedActivities
      });
    }
  };

  const addMetric = () => {
    setFormData({
      ...formData,
      metrics: [...formData.metrics, '']
    });
  };

  const updateMetric = (index: number, value: string) => {
    const updatedMetrics = [...formData.metrics];
    updatedMetrics[index] = value;
    setFormData({
      ...formData,
      metrics: updatedMetrics
    });
  };

  const removeMetric = (index: number) => {
    if (formData.metrics.length > 1) {
      setFormData({
        ...formData,
        metrics: formData.metrics.filter((_, i) => i !== index)
      });
    }
  };

  const addTag = () => {
    if (selectedTag && !formData.tags.includes(selectedTag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, selectedTag]
      });
      setSelectedTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag)
    });
  };

  const handleMediaFilesChange = (files: MediaFile[]) => {
    console.log('ProcessForm recebeu mídias:', files);
    setFormData({
      ...formData,
      mediaFiles: files
    });
  };

  const handleFlowSave = (nodes: FlowNode[], edges: FlowEdge[]) => {
    console.log('ProcessForm recebeu fluxo:', { nodes, edges });
    setFormData({
      ...formData,
      flowNodes: nodes,
      flowEdges: edges
    });
    toast({
      title: "Fluxo salvo",
      description: "O fluxo do processo foi atualizado",
      variant: "default"
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Iniciando submissão do formulário:', formData);
    
    // Validações
    if (formData.name.length < 10) {
      toast({
        title: "Erro de validação",
        description: "Nome do processo deve ter pelo menos 10 caracteres",
        variant: "destructive"
      });
      return;
    }

    if (formData.objective.length < 50) {
      toast({
        title: "Erro de validação", 
        description: "Objetivo principal deve ter pelo menos 50 caracteres",
        variant: "destructive"
      });
      return;
    }

    if (!formData.department) {
      toast({
        title: "Erro de validação",
        description: "Área/Departamento é obrigatório",
        variant: "destructive"
      });
      return;
    }

    if (!formData.owner) {
      toast({
        title: "Erro de validação",
        description: "Proprietário do processo é obrigatório", 
        variant: "destructive"
      });
      return;
    }

    if (!formData.categoryId) {
      toast({
        title: "Erro de validação",
        description: "Categoria é obrigatória",
        variant: "destructive"
      });
      return;
    }

    console.log('Validações passaram, chamando onSave');
    onSave(formData);
    toast({
      title: "Processo salvo",
      description: `Processo "${formData.name}" foi salvo com sucesso!`,
      variant: "default"
    });
  };

  return (
    <div className="w-full space-y-6 px-6 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {process ? 'Editar Processo' : 'Novo Processo'}
            </h1>
            <p className="text-muted-foreground">
              Configure o processo interno da PrimeCamp
            </p>
          </div>
        </div>
        <Button type="submit" form="process-form" variant="tech">
          <Save className="h-4 w-4" />
          Salvar Processo
        </Button>
      </div>

      <form id="process-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>📌 Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Processo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Atendimento presencial de orçamento"
                  className={formData.name.length < 10 ? 'border-destructive' : ''}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.name.length}/10 caracteres mínimos
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Área / Departamento *</Label>
                <Select value={formData.department} onValueChange={(value) => setFormData({...formData, department: value as Department})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEPARTMENTS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="objective">Objetivo Principal *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateProcessWithAI}
                  disabled={generatingProcess || !iaApiKey || !formData.name || !formData.objective}
                  className="gap-2"
                >
                  {generatingProcess ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4" />
                      Gerar Processo e Fluxograma com IA
                    </>
                  )}
                </Button>
              </div>
              <RichTextEditor
                value={formData.objective}
                onChange={(value) => setFormData({...formData, objective: value})}
                placeholder="Descreva claramente qual problema este processo resolve e qual resultado esperado..."
                className={formData.objective.length < 50 ? 'border-destructive' : ''}
              />
              <p className="text-xs text-muted-foreground">
                {formData.objective.length}/50 caracteres mínimos
              </p>
              {!iaApiKey && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Configure a API Key da OpenAI em Integrações para usar a IA.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner">Proprietário do Processo *</Label>
                <Select value={formData.owner} onValueChange={(value) => setFormData({...formData, owner: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.display_name}>
                        {user.display_name}
                        {user.department && (
                          <span className="text-muted-foreground ml-2">({user.department})</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value as any})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="review">Em Revisão</SelectItem>
                    <SelectItem value="archived">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select 
                  value={formData.categoryId || ''} 
                  onValueChange={(value) => setFormData({...formData, categoryId: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <span>{category.icon}</span>
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!formData.categoryId && (
                  <p className="text-xs text-destructive">Categoria é obrigatória</p>
                )}
              </div>
            </div>

            {/* Participantes */}
            <div className="space-y-2">
              <Label>Participantes</Label>
              <MultiSelect
                options={users.map(user => ({
                  label: `${user.display_name}${user.department ? ` (${user.department})` : ''}`,
                  value: user.display_name
                }))}
                selected={formData.participants}
                onChange={(values) => setFormData({...formData, participants: values})}
                placeholder="Selecione os participantes"
              />
            </div>
          </CardContent>
        </Card>

        {/* Atividades */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>🔧 Atividades do Processo</CardTitle>
              <Button type="button" onClick={addActivity} variant="outline" size="sm">
                <Plus className="h-4 w-4" />
                Nova Etapa
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.activities.map((activity, index) => (
              <div key={activity.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Etapa {activity.step}</span>
                  {formData.activities.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeActivity(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Descrição da Atividade</Label>
                    <RichTextEditor
                      value={activity.description}
                      onChange={(value) => updateActivity(index, 'description', value)}
                      placeholder="Descreva o que deve ser feito nesta etapa..."
                      className="min-h-[80px]"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Responsável</Label>
                      <Select value={activity.responsible} onValueChange={(value) => updateActivity(index, 'responsible', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.display_name}>
                              {user.display_name}
                              {user.department && (
                                <span className="text-muted-foreground ml-2">({user.department})</span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Tempo Estimado</Label>
                      <Input
                        value={activity.estimatedTime}
                        onChange={(e) => updateActivity(index, 'estimatedTime', e.target.value)}
                        placeholder="Ex: 5 minutos, 1 hora"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Métricas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>📊 Métricas de Sucesso</CardTitle>
              <Button type="button" onClick={addMetric} variant="outline" size="sm">
                <Plus className="h-4 w-4" />
                Nova Métrica
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {formData.metrics.map((metric, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={metric}
                  onChange={(e) => updateMetric(index, e.target.value)}
                  placeholder="Ex: 90% dos clientes devem ter contato registrado no CRM"
                />
                {formData.metrics.length > 1 && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeMetric(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Prioridade */}
        <Card>
          <CardHeader>
            <CardTitle>⭐ Prioridade</CardTitle>
          </CardHeader>
          <CardContent>
            <PrioritySlider 
              value={formData.priority}
              onValueChange={(value) => setFormData({...formData, priority: value})}
            />
          </CardContent>
        </Card>

        {/* Anotações e Sugestões */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Anotações e Sugestões
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Colaboradores podem adicionar anotações, sugestões de mudanças ou observações sobre o processo. Use formatação HTML para destacar informações importantes.
            </p>
          </CardHeader>
          <CardContent>
            <RichTextEditor
              value={formData.notes || ''}
              onChange={(value) => setFormData({...formData, notes: value})}
              placeholder="Adicione anotações, sugestões de melhorias ou observações sobre este processo..."
              className="min-h-[300px]"
            />
          </CardContent>
        </Card>

        {/* Vídeo Explicativo */}
        <Card>
          <CardHeader>
            <CardTitle>🎥 Vídeo Explicativo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="youtubeVideoId">ID do Vídeo YouTube</Label>
              <Input
                id="youtubeVideoId"
                value={formData.youtubeVideoId}
                onChange={(e) => setFormData({...formData, youtubeVideoId: e.target.value})}
                placeholder="Ex: dQw4w9WgXcQ (apenas o ID do vídeo)"
              />
              <p className="text-xs text-muted-foreground">
                Cole apenas o ID do vídeo do YouTube (a parte após v= na URL)
              </p>
            </div>
            
            {formData.youtubeVideoId && (
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Preview:</p>
                <div className="aspect-video w-full max-w-md mx-auto bg-black rounded-lg overflow-hidden relative youtube-container">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube-nocookie.com/embed/${formData.youtubeVideoId}?modestbranding=1&rel=0&showinfo=0&controls=1&fs=1&iv_load_policy=3&disablekb=0&cc_load_policy=0&hl=pt&color=white&theme=dark&autoplay=0&loop=0&branding=0&enablejsapi=0&playsinline=1&origin=${window.location.origin}&widget_referrer=${window.location.origin}`}
                    title="Preview do vídeo explicativo"
                    frameBorder="0"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    referrerPolicy="strict-origin-when-cross-origin"
                    style={{ 
                      border: 'none',
                      pointerEvents: 'auto'
                    }}
                    className="w-full h-full"
                    sandbox="allow-scripts allow-same-origin allow-fullscreen"
                    allowFullScreen
                  ></iframe>
                  {/* Máscara sutil apenas para o botão de copiar link */}
                  <div 
                    className="absolute top-2 right-14 w-8 h-6 pointer-events-none z-10"
                    style={{
                      background: 'rgba(0,0,0,0.001)',
                      borderRadius: '2px'
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Construtor de Fluxo */}
        <FlowBuilder 
          processId={process?.id}
          initialNodes={formData.flowNodes}
          initialEdges={formData.flowEdges}
          onSave={handleFlowSave}
        />

      </form>
    </div>
  );
};