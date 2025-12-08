import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { useLessonProgress } from '@/hooks/useLessonProgress';

interface ImprovedLessonPlayerProps {
  lesson: any;
  trainingId: string;
  onNext?: () => void;
  hasNext?: boolean;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function ImprovedLessonPlayer({ 
  lesson, 
  trainingId,
  onNext,
  hasNext 
}: ImprovedLessonPlayerProps) {
  const [player, setPlayer] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const progressInterval = useRef<NodeJS.Timeout>();
  
  const { updateProgress, getLessonProgress } = useLessonProgress(trainingId);
  const lessonProgress = getLessonProgress(lesson.id);

  const getVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?]+)/);
    return match ? match[1] : '';
  };

  const videoId = getVideoId(lesson.video_url);

  useEffect(() => {
    if (lessonProgress) {
      setProgress(lessonProgress.progress);
      setIsCompleted(lessonProgress.completed);
    }
  }, [lessonProgress]);

  useEffect(() => {
    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
      if (playerRef.current) {
        const newPlayer = new window.YT.Player(playerRef.current, {
          videoId,
          playerVars: {
            autoplay: 0,
            modestbranding: 1,
            rel: 0,
            start: lessonProgress?.last_watched_seconds || 0
          },
          events: {
            onStateChange: handleStateChange
          }
        });
        setPlayer(newPlayer);
      }
    };

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      if (player) {
        player.destroy();
      }
    };
  }, [lesson.id]);

  const handleStateChange = (event: any) => {
    if (event.data === window.YT.PlayerState.PLAYING) {
      startProgressTracking();
    } else {
      stopProgressTracking();
    }
  };

  const startProgressTracking = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }

    progressInterval.current = setInterval(() => {
      if (player && player.getCurrentTime && player.getDuration) {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        const progressPercent = (currentTime / duration) * 100;
        
        setProgress(progressPercent);
        
        // Save progress every 10 seconds
        if (Math.floor(currentTime) % 10 === 0) {
          const completed = progressPercent >= 90;
          updateProgress.mutate({
            lessonId: lesson.id,
            trainingId,
            progress: progressPercent,
            lastWatchedSeconds: Math.floor(currentTime),
            completed
          });
          
          if (completed && !isCompleted) {
            setIsCompleted(true);
          }
        }
      }
    }, 1000);
  };

  const stopProgressTracking = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
  };

  const handleMarkComplete = () => {
    updateProgress.mutate({
      lessonId: lesson.id,
      trainingId,
      progress: 100,
      lastWatchedSeconds: player?.getDuration() || 0,
      completed: true
    });
    setIsCompleted(true);
    setProgress(100);
  };

  return (
    <div className="space-y-4">
      <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
        <div ref={playerRef} className="w-full h-full" />
      </div>

      <Card className="p-4 space-y-4">
        <div>
          <h3 className="text-xl font-semibold mb-2">{lesson.title}</h3>
          {lesson.description && (
            <p className="text-muted-foreground">{lesson.description}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progresso da Aula</span>
            <span className="text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex items-center gap-2">
          {!isCompleted && (
            <Button
              onClick={handleMarkComplete}
              variant="outline"
              size="sm"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Marcar como Concluída
            </Button>
          )}
          
          {isCompleted && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Aula Concluída</span>
            </div>
          )}

          {hasNext && onNext && isCompleted && (
            <Button onClick={onNext} className="ml-auto" size="sm">
              Próxima Aula
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
