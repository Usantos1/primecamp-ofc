import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Clock, User, Users, Target, CheckCircle, Star, AlertTriangle } from "lucide-react";
import { Process, DEPARTMENTS } from "@/types/process";
import { useCategories } from "@/hooks/useCategories";
import { PrioritySlider } from "./PrioritySlider";
import { TaskManager } from '@/components/TaskManager';
import { PriorityCard } from '@/components/PriorityCard';

interface ProcessViewerProps {
  process: Process;
  onEdit: () => void;
  onBack: () => void;
}

export const ProcessViewer = ({ process, onEdit, onBack }: ProcessViewerProps) => {
  console.log('ProcessViewer - Video ID:', process.youtubeVideoId);
  const { categories } = useCategories();
  
  
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

  const getCategory = () => {
    if (!process.categoryId) return null;
    return categories.find(cat => cat.id === process.categoryId);
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'Baixa';
      case 2: return 'Média';
      case 3: return 'Alta';
      case 4: return 'Crítica';
      default: return 'Baixa';
    }
  };

  const getPriorityCardColor = (priority: number) => {
    switch (priority) {
      case 1: return 'border-green-300 bg-green-50 dark:bg-green-950 dark:border-green-700';
      case 2: return 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-700';
      case 3: return 'border-orange-300 bg-orange-50 dark:bg-orange-950 dark:border-orange-700';
      case 4: return 'border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-700';
      default: return 'border-green-300 bg-green-50 dark:bg-green-950 dark:border-green-700';
    }
  };

  const getPriorityTextColor = (priority: number) => {
    switch (priority) {
      case 1: return 'text-green-700 dark:text-green-300';
      case 2: return 'text-yellow-700 dark:text-yellow-300';
      case 3: return 'text-orange-700 dark:text-orange-300';
      case 4: return 'text-red-700 dark:text-red-300';
      default: return 'text-green-700 dark:text-green-300';
    }
  };

  const getPriorityIconBg = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-green-200 dark:bg-green-800';
      case 2: return 'bg-yellow-200 dark:bg-yellow-800';
      case 3: return 'bg-orange-200 dark:bg-orange-800';
      case 4: return 'bg-red-200 dark:bg-red-800';
      default: return 'bg-green-200 dark:bg-green-800';
    }
  };

  const getPriorityIcon = (priority: number) => {
    switch (priority) {
      case 1: return '🟢';
      case 2: return '🟡';
      case 3: return '🟠';
      case 4: return '🔴';
      default: return '🟢';
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6 px-2 sm:px-4">
      {/* Header - removido para evitar duplicação com ProcessView */}

      {/* Priority & Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <PriorityCard priority={process.priority || 1} />

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium mb-2">Status do Processo</h3>
                <Badge className={getStatusColor(process.status)}>
                  {getStatusText(process.status)}
                </Badge>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Departamento</div>
                <div className="font-medium">{DEPARTMENTS[process.department]}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Objetivo Principal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-foreground leading-relaxed prose prose-sm max-w-none">
            {process.objective?.replace(/<[^>]*>/g, '') || 'Objetivo não definido'}
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Resumo do Processo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
        </CardContent>
      </Card>

      {/* Participantes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            Participantes do Processo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="default" className="text-sm">
              {process.owner} (Proprietário)
            </Badge>
            {process.participants.map((participant) => (
              <Badge key={participant} variant="secondary" className="text-sm">
                {participant}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Atividades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Atividades do Processo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {process.activities.map((activity, index) => (
              <div key={activity.id} className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-start gap-4">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                    {activity.step}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="font-medium text-foreground prose prose-sm max-w-none">
                      {activity.description?.replace(/<[^>]*>/g, '') || 'Descrição não disponível'}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span><strong>Responsável:</strong> {activity.responsible || 'Não definido'}</span>
                      </div>
                      
                      {activity.estimatedTime && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span><strong>Tempo:</strong> {activity.estimatedTime}</span>
                        </div>
                      )}
                    </div>
                    
                    {activity.tools && activity.tools.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {activity.tools.map((tool) => (
                          <Badge key={tool} variant="outline" className="text-xs">
                            {tool}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Métricas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-warning" />
            Métricas de Sucesso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {process.metrics.map((metric, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="bg-warning text-warning-foreground rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs mt-0.5">
                  {index + 1}
                </div>
                <div className="text-sm leading-relaxed prose prose-sm max-w-none flex-1">
                  {metric?.replace(/<[^>]*>/g, '') || 'Métrica não disponível'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>


      {/* Task Management */}
      <TaskManager 
        processId={process.id}
      />

      {/* Tags e Categoria */}
      <Card>
        <CardHeader>
          <CardTitle>🏷️ Tags e Classificação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {getCategory() && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Categoria:</p>
                <Badge variant="outline" style={{ backgroundColor: getCategory()?.color + '20', borderColor: getCategory()?.color }}>
                  {getCategory()?.icon} {getCategory()?.name}
                </Badge>
              </div>
            )}
            
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Tags:</p>
              <div className="flex flex-wrap gap-2">
                {process.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vídeo Explicativo */}
      {process.youtubeVideoId && (
        <Card>
          <CardHeader>
            <CardTitle>🎥 Vídeo Explicativo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video w-full max-w-3xl mx-auto bg-black rounded-lg overflow-hidden relative youtube-container">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube-nocookie.com/embed/${process.youtubeVideoId}?modestbranding=1&rel=0&showinfo=0&controls=1&fs=1&iv_load_policy=3&disablekb=0&cc_load_policy=0&hl=pt&color=white&theme=dark&autoplay=0&loop=0&branding=0&enablejsapi=0&playsinline=1&origin=${window.location.origin}&widget_referrer=${window.location.origin}`}
                title="Vídeo explicativo do processo"
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};