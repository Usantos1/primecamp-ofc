import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Plus } from 'lucide-react';

interface TrainingPlayerProps {
  videoUrl: string;
  currentProgress: number;
  onProgressUpdate: (progress: number, status: 'in_progress' | 'completed') => void;
}

export function TrainingPlayer({ 
  videoUrl, 
  currentProgress, 
  onProgressUpdate 
}: TrainingPlayerProps) {
  const [progress, setProgress] = useState(currentProgress);
  const [isCompleted, setIsCompleted] = useState(currentProgress >= 100);

  const getEmbedUrl = (url: string) => {
    if (url.includes('embed')) return url;
    
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  const handleMarkAsCompleted = () => {
    setProgress(100);
    setIsCompleted(true);
    onProgressUpdate(100, 'completed');
  };

  const handleUpdateProgress = (newProgress: number) => {
    const updatedProgress = Math.min(Math.max(0, newProgress), 100);
    setProgress(updatedProgress);
    onProgressUpdate(updatedProgress, updatedProgress >= 100 ? 'completed' : 'in_progress');
    
    if (updatedProgress >= 100) {
      setIsCompleted(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
        <iframe
          src={getEmbedUrl(videoUrl)}
          title="Treinamento"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>

      <Card className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progresso</span>
            <span className="text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleUpdateProgress(progress + 10)}
            variant="outline"
            size="sm"
            disabled={isCompleted}
          >
            <Plus className="h-4 w-4 mr-1" />
            +10%
          </Button>
          
          <Button
            onClick={handleMarkAsCompleted}
            disabled={isCompleted}
            className="ml-auto"
            size="sm"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {isCompleted ? 'Concluído' : 'Marcar como Concluído'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
