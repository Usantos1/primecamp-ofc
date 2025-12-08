import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { GraduationCap, Clock, CheckCircle } from 'lucide-react';

interface CourseCardProps {
  training: any;
  progress?: number;
  completedLessons?: number;
  totalLessons?: number;
  onContinue: () => void;
}

export function CourseCard({ 
  training, 
  progress = 0,
  completedLessons = 0,
  totalLessons = 0,
  onContinue 
}: CourseCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {training.thumbnail_url && (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img 
            src={training.thumbnail_url} 
            alt={training.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {training.title}
          </CardTitle>
          {training.mandatory && (
            <Badge variant="destructive" className="shrink-0">Obrigatório</Badge>
          )}
        </div>
        {training.department && (
          <Badge variant="outline" className="w-fit mt-2">
            {training.department}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {training.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {training.description}
          </p>
        )}
        
        {totalLessons > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{completedLessons}/{totalLessons} aulas</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {training.duration_minutes && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{training.duration_minutes} minutos</span>
          </div>
        )}

        <Button onClick={onContinue} className="w-full">
          {progress === 100 ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Revisar
            </>
          ) : progress > 0 ? (
            'Continuar'
          ) : (
            'Começar'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
