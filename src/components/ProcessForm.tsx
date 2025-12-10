import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save, Brain, Loader2 } from "lucide-react";
import { Process, Activity, Department, DEPARTMENTS } from "@/types/process";
import { useCategories } from "@/hooks/useCategories";
import { useUsers } from "@/hooks/useUsers";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PrioritySlider } from "./PrioritySlider";
import { RichTextEditor } from "./RichTextEditor";

interface ProcessFormProps {
  process?: Process;
  onSave: (process: Omit<Process, 'id' | 'createdAt' | 'updatedAt' | 'tags' | 'mediaFiles' | 'flowNodes' | 'flowEdges' | 'youtubeVideoId'>) => void;
  onCancel: () => void;
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
    notes: process?.notes || '',
    priority: process?.priority || 2,
    status: process?.status || 'draft' as const,
    categoryId: process?.categoryId || undefined
  });

  const [generatingProcess, setGeneratingProcess] = useState(false);
  const [iaApiKey, setIaApiKey] = useState<string>('');
  const [iaModel, setIaModel] = useState<string>('gpt-4.1-mini');

  useEffect(() => {
    const loadAISettings = async () => {
      try {
        const { data, error } = await supabase
          .from('kv_store_2c4defad')
          .select('*')
          .eq('key', 'integration_settings')
          .maybeSingle();

        if (error) return;
        const value = (data as any)?.value;
        if (value?.aiApiKey) setIaApiKey(value.aiApiKey);
        if (value?.aiModel) setIaModel(value.aiModel);
      } catch (err) {
        console.error('Erro ao carregar integração IA:', err);
      }
    };
    loadAISettings();
  }, []);

  const generateProcessWithAI = async () => {
    if (!formData.name || !formData.objective) {
      toast({ title: "Campos obrigatórios", description: "Preencha nome e objetivo antes de gerar com IA.", variant: "destructive" });
      return;
    }
    if (!iaApiKey) {
      toast({ title: "API Key não configurada", description: "Configure a API Key em Integrações.", variant: "destructive" });
      return;
    }

    setGeneratingProcess(true);
    try {
      toast({ title: "Gerando processo...", description: "A IA está criando o processo. Aguarde..." });
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

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data.activities && Array.isArray(data.activities)) {
        const updatedActivities = data.activities.map((act: any, idx: number) => ({
          id: `ai-${Date.now()}-${idx}`,
          step: act.step || idx + 1,
          description: act.description || '',
          responsible: act.responsible || formData.owner || '',
          estimatedTime: act.estimatedTime || '',
          tools: Array.isArray(act.tools) ? act.tools : [],
        }));

        if (data.nameSuggestions && Array.isArray(data.nameSuggestions) && data.nameSuggestions.length > 0) {
          toast({
            title: "Sugestões de nome",
            description: data.nameSuggestions.slice(0, 3).join(', '),
          });
        }

        setFormData(prev => ({
          ...prev,
          objective: (data.improvedObjective && data.improvedObjective.length > 50) ? data.improvedObjective : prev.objective,
          activities: updatedActivities,
          metrics: Array.isArray(data.metrics) ? data.metrics : prev.metrics,
          automations: Array.isArray(data.automations) ? data.automations : prev.automations,
        }));

        toast({
          title: "Processo gerado!",
          description: `Gerado com ${updatedActivities.length} atividades. Revise e ajuste.`,
        });
      } else {
        throw new Error('Resposta da IA não contém atividades válidas');
      }
    } catch (err: any) {
      toast({
        title: "Erro ao gerar",
        description: err.message || "Não foi possível gerar o processo.",
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
    setFormData({ ...formData, activities: [...formData.activities, newActivity] });
  };

  const updateActivity = (index: number, field: keyof Activity, value: any) => {
    const updated = [...formData.activities];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, activities: updated });
  };

  const removeActivity = (index: number) => {
    if (formData.activities.length <= 1) return;
    const updated = formData.activities.filter((_, i) => i !== index).map((a, i) => ({ ...a, step: i + 1 }));
    setFormData({ ...formData, activities: updated });
  };

  const addMetric = () => setFormData({ ...formData, metrics: [...formData.metrics, ''] });
  const updateMetric = (i: number, v: string) => {
    const updated = [...formData.metrics];
    updated[i] = v;
    setFormData({ ...formData, metrics: updated });
  };
  const removeMetric = (i: number) => {
    if (formData.metrics.length <= 1) return;
    setFormData({ ...formData, metrics: formData.metrics.filter((_, idx) => idx !== i) });
  };

  const addAutomation = () => setFormData({ ...formData, automations: [...formData.automations, ''] });
  const updateAutomation = (i: number, v: string) => {
    const updated = [...formData.automations];
    updated[i] = v;
    setFormData({ ...formData, automations: updated });
  };
  const removeAutomation = (i: number) => {
    if (formData.automations.length <= 1) return;
    setFormData({ ...formData, automations: formData.automations.filter((_, idx) => idx !== i) });
  };

  const addParticipant = (name: string) => {
    if (!name || formData.participants.includes(name)) return;
    setFormData({ ...formData, participants: [...formData.participants, name] });
  };
  const removeParticipant = (index: number) => {
    setFormData({ ...formData, participants: formData.participants.filter((_, i) => i !== index) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.length < 10) {
      toast({ title: "Validação", description: "Nome deve ter pelo menos 10 caracteres.", variant: "destructive" });
      return;
    }
    if (formData.objective.replace(/<[^>]*>/g, '').length < 50) {
      toast({ title: "Validação", description: "Objetivo deve ter pelo menos 50 caracteres.", variant: "destructive" });
      return;
    }
    if (!formData.department) {
      toast({ title: "Validação", description: "Departamento é obrigatório.", variant: "destructive" });
      return;
    }
    if (!formData.owner) {
      toast({ title: "Validação", description: "Proprietário é obrigatório.", variant: "destructive" });
      return;
    }
    onSave(formData as any);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{process ? 'Editar Processo' : 'Novo Processo'}</h2>
          <p className="text-sm text-muted-foreground">Preencha ou gere com IA. Layout em duas colunas, responsivo.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={generatingProcess}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Processo
          </Button>
          <Button variant="outline" onClick={generateProcessWithAI} disabled={generatingProcess} className="gap-2">
            {generatingProcess ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            {generatingProcess ? 'Gerando...' : 'Gerar com IA'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card className="border border-primary/20 shadow-sm">
            <CardHeader>
              <CardTitle>Dados principais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Processo *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Atendimento Online (WhatsApp / Digital)"
                />
              </div>

              <div className="space-y-2">
                <Label>Objetivo Principal *</Label>
                <RichTextEditor
                  value={formData.objective}
                  onChange={(value) => setFormData({ ...formData, objective: value })}
                  placeholder="Descreva o objetivo principal (HTML permitido)..."
                  className="min-h-[180px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Departamento *</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value as Department })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DEPARTMENTS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Proprietário do Processo *</Label>
                  <Select
                    value={formData.owner}
                    onValueChange={(value) => setFormData({ ...formData, owner: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.name}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-primary/20 shadow-sm">
            <CardHeader>
              <CardTitle>Atividades do Processo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.activities.map((activity, index) => (
                <div key={activity.id} className="border border-primary/10 rounded-lg p-4 space-y-3 relative bg-muted/10">
                  {formData.activities.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 text-muted-foreground"
                      onClick={() => removeActivity(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Descrição da Atividade (HTML permitido)</Label>
                      <RichTextEditor
                        value={activity.description}
                        onChange={(value) => updateActivity(index, 'description', value)}
                        placeholder="Detalhe o passo: o quê, como e por quê."
                        className="min-h-[120px]"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Responsável</Label>
                        <Input
                          value={activity.responsible}
                          onChange={(e) => updateActivity(index, 'responsible', e.target.value)}
                          placeholder="Quem executa?"
                        />
                      </div>
                      <div>
                        <Label>Tempo Estimado</Label>
                        <Input
                          value={activity.estimatedTime}
                          onChange={(e) => updateActivity(index, 'estimatedTime', e.target.value)}
                          placeholder="Ex: 30 min ou 2h"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Ferramentas (separadas por vírgula)</Label>
                    <Input
                      value={activity.tools?.join(', ') || ''}
                      onChange={(e) => updateActivity(index, 'tools', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                      placeholder="Ex: WhatsApp, CRM, Planilha"
                    />
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={addActivity} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Etapa
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-primary/20 shadow-sm">
            <CardHeader>
              <CardTitle>Métricas de Sucesso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.metrics.map((metric, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Input
                    value={metric}
                    onChange={(e) => updateMetric(index, e.target.value)}
                    placeholder="Ex: Tempo médio de execução"
                  />
                  {formData.metrics.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeMetric(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" onClick={addMetric} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Métrica
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-primary/20 shadow-sm">
            <CardHeader>
              <CardTitle>Automatizações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.automations.map((automation, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Input
                    value={automation}
                    onChange={(e) => updateAutomation(index, e.target.value)}
                    placeholder="Ex: Notificar automaticamente ao concluir etapa"
                  />
                  {formData.automations.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeAutomation(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" onClick={addAutomation} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Automatização
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-primary/20 shadow-sm">
            <CardHeader>
              <CardTitle>Anotações</CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                value={formData.notes}
                onChange={(value) => setFormData({ ...formData, notes: value })}
                placeholder="Anotações públicas do processo (HTML permitido)..."
                className="min-h-[160px]"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border border-primary/20 shadow-sm">
            <CardHeader>
              <CardTitle>Prioridade</CardTitle>
            </CardHeader>
            <CardContent>
              <PrioritySlider 
                value={formData.priority} 
                onChange={(value) => setFormData({ ...formData, priority: value })}
              />
            </CardContent>
          </Card>

          <Card className="border border-primary/20 shadow-sm">
            <CardHeader>
              <CardTitle>Status do Processo</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="review">Em revisão</SelectItem>
                  <SelectItem value="archived">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="border border-primary/20 shadow-sm">
            <CardHeader>
              <CardTitle>Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="border border-primary/20 shadow-sm">
            <CardHeader>
              <CardTitle>Participantes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Adicionar participante</Label>
                <Select onValueChange={(value) => addParticipant(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um participante" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.name}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.participants.map((participant, index) => (
                  <Badge key={participant} variant="secondary" className="flex items-center gap-2">
                    {participant}
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => removeParticipant(index)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

