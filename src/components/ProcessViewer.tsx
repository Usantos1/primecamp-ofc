import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Edit, Clock, User, Users, Target, CheckCircle, Star, AlertTriangle, Brain } from "lucide-react";
import { Process, DEPARTMENTS } from "@/types/process";
import { PriorityCard } from '@/components/PriorityCard';
import { RichTextEditor } from "./RichTextEditor";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ProcessViewerProps {
  process: Process;
  processId: string;
  onEdit: () => void;
  onBack: () => void;
}

export const ProcessViewer = ({ process, processId, onEdit, onBack }: ProcessViewerProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [notes, setNotes] = useState(process.notes || '');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success';
      case 'draft': return 'bg-warning';
      case 'review': return 'bg-accent';
      case 'archived': return 'bg-muted';
      default: return 'bg-muted';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'draft': return 'Rascunho';
      case 'review': return 'Em Revisão';
      case 'archived': return 'Arquivado';
      default: return status;
    }
  };

  const handleSaveNotes = async () => {
    if (!processId || !user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para salvar anotações",
        variant: "destructive"
      });
      return;
    }

    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('processes')
        .update({
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', processId);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Anotações salvas com sucesso",
      });

      setIsEditingNotes(false);
    } catch (error: any) {
      console.error('Erro ao salvar anotações:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar anotações",
        variant: "destructive"
      });
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6 px-2 sm:px-4">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Editar Processo
        </Button>
        <Button variant="default" size="sm" onClick={onEdit} className="gap-2">
          <Brain className="h-4 w-4" />
          Gerar com IA
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
        <PriorityCard priority={process.priority || 1} />
        <Card className="border border-primary/30 shadow-sm">
          <CardContent className="p-4 sm:p-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className={getStatusColor(process.status)}>
                {getStatusText(process.status)}
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Departamento</p>
              <p className="font-medium">{DEPARTMENTS[process.department]}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Accordion type="multiple" defaultValue={['objetivo', 'resumo', 'participantes', 'atividades', 'metricas', 'automacoes', 'anotacoes']} className="space-y-4">
        <AccordionItem value="objetivo" className="border border-primary/30 rounded-lg px-2 sm:px-3 shadow-sm">
          <AccordionTrigger className="text-base font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Objetivo Principal
          </AccordionTrigger>
          <AccordionContent>
            <div
              className="text-foreground leading-relaxed prose prose-sm max-w-none dark:prose-invert px-1 pb-4"
              dangerouslySetInnerHTML={{
                __html: process.objective || 'Objetivo não definido'
              }}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="resumo" className="border border-primary/30 rounded-lg px-2 sm:px-3 shadow-sm">
          <AccordionTrigger className="text-base font-semibold">📋 Resumo do Processo</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pb-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <User className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Proprietário</p>
                  <p className="font-semibold text-sm sm:text-base truncate">{process.owner}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-accent shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Participantes</p>
                  <p className="font-semibold text-sm sm:text-base">{process.participants.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-success shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Etapas</p>
                  <p className="font-semibold text-sm sm:text-base">{process.activities.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Target className="h-6 w-6 sm:h-8 sm:w-8 text-warning shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Métricas</p>
                  <p className="font-semibold text-sm sm:text-base">{process.metrics.length}</p>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="participantes" className="border border-primary/30 rounded-lg px-2 sm:px-3 shadow-sm">
          <AccordionTrigger className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Participantes
          </AccordionTrigger>
          <AccordionContent>
            <div className="pb-4">
              {process.participants.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum participante definido.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {process.participants.map((participant, index) => (
                    <Badge key={index} variant="secondary" className="text-sm">
                      {participant}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="atividades" className="border border-primary/30 rounded-lg px-2 sm:px-3 shadow-sm">
          <AccordionTrigger className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Atividades do Processo
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pb-4">
              <div className="text-sm text-muted-foreground">Total de etapas: {process.activities.length}</div>
              {process.activities.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhuma atividade adicionada.</p>
              ) : (
                process.activities.map((activity, index) => (
                  <div
                    key={activity.id || index}
                    className="p-3 rounded-lg border border-primary/20 bg-muted/20 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">Etapa {activity.step || index + 1}</div>
                      {activity.estimatedTime && (
                        <Badge variant="outline" className="text-xs">
                          {activity.estimatedTime}
                        </Badge>
                      )}
                    </div>
                    <div
                      className="text-sm text-foreground mt-2 leading-relaxed prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: activity.description || 'Sem descrição' }}
                    />
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                      {activity.responsible && (
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {activity.responsible}
                        </span>
                      )}
                      {Array.isArray(activity.tools) && activity.tools.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4" />
                          {activity.tools.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="metricas" className="border border-primary/30 rounded-lg px-2 sm:px-3 shadow-sm">
          <AccordionTrigger className="text-base font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Métricas
          </AccordionTrigger>
          <AccordionContent>
            <div className="pb-4">
              {process.metrics.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhuma métrica definida.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {process.metrics.map((metric, index) => (
                    <Badge key={index} variant="secondary" className="text-sm">
                      {metric}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="automacoes" className="border border-primary/30 rounded-lg px-2 sm:px-3 shadow-sm">
          <AccordionTrigger className="text-base font-semibold flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            Automações
          </AccordionTrigger>
          <AccordionContent>
            <div className="pb-4">
              {process.automations && process.automations.length > 0 ? (
                <div className="space-y-2">
                  {process.automations.map((automation, index) => (
                    <div key={index} className="p-3 rounded-lg bg-muted/40 text-sm">
                      {automation}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Nenhuma automatização definida.</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="anotacoes" className="border border-primary/30 rounded-lg px-2 sm:px-3 shadow-sm">
          <AccordionTrigger className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Anotações e Sugestões
          </AccordionTrigger>
          <AccordionContent>
            <div className="pb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">Campo colaborativo (HTML permitido).</p>
                {!isEditingNotes ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditingNotes(true)}>
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setIsEditingNotes(false); setNotes(process.notes || ''); }}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes}>
                      {savingNotes ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                )}
              </div>
              {isEditingNotes ? (
                <RichTextEditor
                  value={notes}
                  onChange={setNotes}
                  placeholder="Adicione anotações ou sugestões (HTML permitido)..."
                />
              ) : (
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: process.notes || '<p class="text-muted-foreground">Nenhuma anotação ainda. Clique em Editar para adicionar.</p>' }}
                />
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

