import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraduationCap, Clock, CheckCircle, Play } from 'lucide-react';
import { useTrainings } from '@/hooks/useTrainings';
import { ModernLayout } from '@/components/ModernLayout';
import { useNavigate } from 'react-router-dom';

export default function StudentTrainings() {
  const { myAssignments, isLoading } = useTrainings();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <ModernLayout title="Meus Treinamentos">
        <div>Carregando...</div>
      </ModernLayout>
    );
  }

  const pendingTrainings = myAssignments?.filter(a => a.status !== 'completed') || [];
  const completedTrainings = myAssignments?.filter(a => a.status === 'completed') || [];

  return (
    <ModernLayout 
      title="Meus Treinamentos" 
      subtitle="Acompanhe seu progresso nos treinamentos atribuídos"
    >
      {pendingTrainings.length > 0 && (
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Pendentes ({pendingTrainings.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingTrainings.map((assignment) => (
              <Card key={assignment.training_id} className="hover:shadow-lg transition">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2">
                      {assignment.training.title}
                    </CardTitle>
                    {assignment.training.mandatory && (
                      <Badge variant="destructive" className="shrink-0">Obrigatório</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {assignment.training.description || 'Sem descrição'}
                  </p>
                  
                  {assignment.training.training_type && (
                    <Badge variant="secondary">{assignment.training.training_type}</Badge>
                  )}

                  {assignment.training.duration_minutes && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{assignment.training.duration_minutes} minutos</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">{Math.round(assignment.progress)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${assignment.progress}%` }}
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={() => navigate(`/treinamentos/${assignment.training_id}`)}
                    className="w-full"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {assignment.progress > 0 ? 'Continuar' : 'Começar'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {completedTrainings.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Concluídos ({completedTrainings.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedTrainings.map((assignment) => (
              <Card key={assignment.training_id} className="opacity-75">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    {assignment.training.title}
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Concluído em {new Date(assignment.completed_at).toLocaleDateString('pt-BR')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {pendingTrainings.length === 0 && completedTrainings.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum treinamento atribuído ainda
        </div>
      )}
    </ModernLayout>
  );
}
