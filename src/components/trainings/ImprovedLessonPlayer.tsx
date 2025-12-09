import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  ChevronRight, 
  Gauge, 
  Bookmark, 
  BookmarkCheck,
  Plus,
  X,
  Play,
  Pause,
  SkipForward,
  SkipBack
} from 'lucide-react';
import { useLessonProgress } from '@/hooks/useLessonProgress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface Bookmark {
  id?: string;
  time: number;
  note: string;
  created_at?: string;
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
  const [playbackRate, setPlaybackRate] = useState(1);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showBookmarkForm, setShowBookmarkForm] = useState(false);
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [bookmarkTime, setBookmarkTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const progressInterval = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  
  const { updateProgress, getLessonProgress } = useLessonProgress(trainingId);
  const lessonProgress = getLessonProgress(lesson.id);

  const getVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?]+)/);
    return match ? match[1] : '';
  };

  const videoId = getVideoId(lesson.video_url);

  // Load bookmarks
  useEffect(() => {
    const loadBookmarks = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('lesson_bookmarks')
        .select('*')
        .eq('lesson_id', lesson.id)
        .eq('user_id', user.id)
        .order('time', { ascending: true });

      if (!error && data) {
        setBookmarks(data);
      }
    };

    loadBookmarks();
  }, [lesson.id]);

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
      if (playerRef.current && !player) {
        const newPlayer = new window.YT.Player(playerRef.current, {
          videoId,
          playerVars: {
            autoplay: 0,
            modestbranding: 1,
            rel: 0,
            start: lessonProgress?.last_watched_seconds || 0,
            controls: 1
          },
          events: {
            onStateChange: handleStateChange,
            onReady: () => {
              newPlayer.setPlaybackRate(playbackRate);
            }
          }
        });
        setPlayer(newPlayer);
      }
    };

    // If API already loaded
    if (window.YT && window.YT.Player && playerRef.current && !player) {
      const newPlayer = new window.YT.Player(playerRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          modestbranding: 1,
          rel: 0,
          start: lessonProgress?.last_watched_seconds || 0,
          controls: 1
        },
        events: {
          onStateChange: handleStateChange,
          onReady: () => {
            newPlayer.setPlaybackRate(playbackRate);
          }
        }
      });
      setPlayer(newPlayer);
    }

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
      setIsPlaying(true);
      startProgressTracking();
    } else {
      setIsPlaying(false);
      stopProgressTracking();
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (player && player.setPlaybackRate) {
      player.setPlaybackRate(rate);
      toast({
        title: "Velocidade alterada",
        description: `${rate}x`,
      });
    }
  };

  const handleAddBookmark = async () => {
    if (!player) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentTime = Math.floor(player.getCurrentTime());
    setBookmarkTime(currentTime);
    setShowBookmarkForm(true);
  };

  const handleSaveBookmark = async () => {
    if (!bookmarkNote.trim()) {
      toast({
        title: "Erro",
        description: "Adicione uma nota ao marcador",
        variant: "destructive"
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('lesson_bookmarks')
      .insert({
        lesson_id: lesson.id,
        user_id: user.id,
        time: bookmarkTime,
        note: bookmarkNote
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar marcador",
        variant: "destructive"
      });
      return;
    }

    setBookmarks([...bookmarks, data]);
    setBookmarkNote('');
    setShowBookmarkForm(false);
    toast({
      title: "Marcador adicionado",
      description: "Marcador salvo com sucesso",
    });
  };

  const handleJumpToBookmark = (time: number) => {
    if (player && player.seekTo) {
      player.seekTo(time, true);
      toast({
        title: "Pulando para marcador",
        description: `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`,
      });
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    const { error } = await supabase
      .from('lesson_bookmarks')
      .delete()
      .eq('id', bookmarkId);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao deletar marcador",
        variant: "destructive"
      });
      return;
    }

    setBookmarks(bookmarks.filter(b => b.id !== bookmarkId));
    toast({
      title: "Marcador removido",
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const handleSkip = (seconds: number) => {
    if (player && player.getCurrentTime) {
      const currentTime = player.getCurrentTime();
      player.seekTo(currentTime + seconds, true);
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
      <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black">
        <div ref={playerRef} className="w-full h-full" />
      </div>

      {/* Custom Controls */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSkip(-10)}
                title="Voltar 10 segundos"
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => player?.getPlayerState() === 1 ? player.pauseVideo() : player?.playVideo()}
                title={isPlaying ? "Pausar" : "Reproduzir"}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSkip(10)}
                title="Avançar 10 segundos"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <Select value={playbackRate.toString()} onValueChange={(v) => handlePlaybackRateChange(parseFloat(v))}>
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.5">0.5x</SelectItem>
                    <SelectItem value="0.75">0.75x</SelectItem>
                    <SelectItem value="1">1x</SelectItem>
                    <SelectItem value="1.25">1.25x</SelectItem>
                    <SelectItem value="1.5">1.5x</SelectItem>
                    <SelectItem value="1.75">1.75x</SelectItem>
                    <SelectItem value="2">2x</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleAddBookmark}
              >
                <Bookmark className="h-4 w-4 mr-1" />
                Marcador
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="bookmarks">
              Marcadores ({bookmarks.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="info" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="bookmarks" className="space-y-4">
            {showBookmarkForm && (
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Tempo: {formatTime(bookmarkTime)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowBookmarkForm(false);
                      setBookmarkNote('');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  placeholder="Adicione uma nota para este marcador..."
                  value={bookmarkNote}
                  onChange={(e) => setBookmarkNote(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleSaveBookmark} size="sm" className="w-full">
                  Salvar Marcador
                </Button>
              </Card>
            )}

            {bookmarks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum marcador ainda</p>
                <p className="text-sm">Clique em "Marcador" para adicionar um</p>
              </div>
            ) : (
              <div className="space-y-2">
                {bookmarks.map((bookmark) => (
                  <Card key={bookmark.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <BookmarkCheck className="h-4 w-4 text-primary" />
                          <Badge variant="outline" className="cursor-pointer" onClick={() => handleJumpToBookmark(bookmark.time)}>
                            {formatTime(bookmark.time)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{bookmark.note}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => bookmark.id && handleDeleteBookmark(bookmark.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
