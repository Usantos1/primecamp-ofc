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
  SkipBack,
  Maximize2,
  Minimize2
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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showBookmarkForm, setShowBookmarkForm] = useState(false);
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [bookmarkTime, setBookmarkTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressInterval = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  
  // Debug: verificar se player está disponível
  useEffect(() => {
    if (player) {
      console.log('Player disponível:', player);
    }
  }, [player]);
  
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
            controls: 0,
            showinfo: 0,
            iv_load_policy: 3,
            fs: 0,
            disablekb: 0
          },
          events: {
            onStateChange: handleStateChange,
            onReady: () => {
              newPlayer.setPlaybackRate(playbackRate);
              handlePlayerReady(newPlayer);
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
          controls: 0,
          showinfo: 0,
          iv_load_policy: 3,
          fs: 0,
          disablekb: 0
        },
        events: {
          onStateChange: handleStateChange,
          onReady: () => {
            newPlayer.setPlaybackRate(playbackRate);
            handlePlayerReady(newPlayer);
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
      // Continuar rastreando mesmo quando pausado para atualizar o tempo
      startProgressTracking();
    }
  };

  const handlePlayerReady = (playerInstance: any) => {
    // Inicializar duração e tempo quando o player estiver pronto
    try {
      const total = playerInstance.getDuration();
      const current = playerInstance.getCurrentTime();
      if (total && total > 0) {
        setDuration(total);
      }
      if (current !== undefined) {
        setCurrentTime(current);
        setProgress((current / total) * 100);
      }
      // Iniciar tracking mesmo se não estiver playing
      startProgressTracking();
    } catch (error) {
      console.error('Erro ao inicializar player:', error);
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
        const current = player.getCurrentTime();
        const total = player.getDuration();
        const progressPercent = (current / total) * 100;
        
        setCurrentTime(current);
        setDuration(total);
        setProgress(progressPercent);
        
        // Save progress every 10 seconds
        if (Math.floor(current) % 10 === 0) {
          const completed = progressPercent >= 90;
          updateProgress.mutate({
            lessonId: lesson.id,
            trainingId,
            progress: progressPercent,
            lastWatchedSeconds: Math.floor(current),
            completed
          });
          
          if (completed && !isCompleted) {
            setIsCompleted(true);
          }
        }
      }
    }, 100);
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    // Não fazer nada se clicar nos controles
    const target = e.target as HTMLElement;
    if (target.closest('.video-controls') || target.closest('[class*="Select"]')) {
      return;
    }

    // Prevenir comportamento padrão
    e.stopPropagation();
    e.preventDefault();

    // Toggle play/pause
    if (player) {
      try {
        const state = player.getPlayerState();
        console.log('Estado do player:', state);
        if (state === window.YT.PlayerState.PLAYING || state === 1) {
          player.pauseVideo();
        } else {
          player.playVideo();
        }
      } catch (error) {
        console.error('Erro ao controlar player:', error);
        toast({
          title: "Erro",
          description: "Não foi possível controlar o vídeo",
          variant: "destructive"
        });
      }
    } else {
      console.warn('Player não disponível');
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!player || !progressBarRef.current || !duration) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    player.seekTo(newTime, true);
    setCurrentTime(newTime);
    setProgress((newTime / duration) * 100);
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

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      // Entrar em tela cheia
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      } else if ((containerRef.current as any).mozRequestFullScreen) {
        (containerRef.current as any).mozRequestFullScreen();
      } else if ((containerRef.current as any).msRequestFullscreen) {
        (containerRef.current as any).msRequestFullscreen();
      }
    } else {
      // Sair de tela cheia
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  };

  // Detectar mudanças no estado de tela cheia
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div 
        ref={containerRef}
        className="relative aspect-video w-full rounded-lg overflow-hidden bg-black group cursor-pointer"
        onMouseEnter={() => {
          setShowControls(true);
        }}
        onMouseLeave={() => {
          setShowControls(false);
        }}
        onClick={handleVideoClick}
      >
        <div 
          ref={playerRef} 
          className="w-full h-full relative z-0 youtube-player-container"
        />
        
        {/* Máscara clicável para play/pause - sempre ativa mas invisível */}
        <div 
          className="absolute inset-0 z-5 cursor-pointer"
          style={{ 
            pointerEvents: showControls ? 'none' : 'auto',
            backgroundColor: 'transparent'
          }}
          onClick={handleVideoClick}
        />
        
        {/* Overlay Controls estilo YouTube - aparecem no hover */}
        <div 
          className={`absolute inset-0 transition-opacity duration-300 z-10 video-controls ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ 
            pointerEvents: showControls ? 'auto' : 'none'
          }}
        >
          {/* Gradiente de fundo mais transparente */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" style={{ pointerEvents: 'none' }} />
          
          {/* Barra de progresso estilo YouTube na parte inferior */}
          <div 
            ref={progressBarRef}
            className="absolute bottom-0 left-0 right-0 h-1 bg-black/30 cursor-pointer group/progress"
            onClick={handleProgressBarClick}
            onMouseEnter={(e) => {
              e.currentTarget.style.height = '4px';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.height = '4px';
            }}
          >
            {/* Barra de progresso preenchida */}
            <div 
              className="h-full bg-red-600 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
            {/* Indicador de posição */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>
          
          {/* Controles no centro inferior - mais transparentes */}
          <div 
            className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1.5 border border-white/10 shadow-lg video-controls"
            style={{ pointerEvents: 'auto' }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleSkip(-10);
              }}
              title="Voltar 10 segundos"
              className="h-7 w-7 p-0 hover:bg-white/10 text-white/80 hover:text-white transition-all"
            >
              <SkipBack className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (player) {
                  try {
                    const state = player.getPlayerState();
                    if (state === 1) {
                      player.pauseVideo();
                    } else {
                      player.playVideo();
                    }
                  } catch (error) {
                    console.error('Erro ao controlar player:', error);
                  }
                }
              }}
              title={isPlaying ? "Pausar" : "Reproduzir"}
              className="h-8 w-8 p-0 bg-white/20 hover:bg-white/30 text-white transition-all"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleSkip(10);
              }}
              title="Avançar 10 segundos"
              className="h-7 w-7 p-0 hover:bg-white/10 text-white/80 hover:text-white transition-all"
            >
              <SkipForward className="h-3 w-3" />
            </Button>
            
            {/* Tempo atual / Duração */}
            <div className="text-white/80 text-xs font-mono px-1.5 min-w-[80px]">
              {duration > 0 ? (
                <>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </>
              ) : (
                '--:-- / --:--'
              )}
            </div>
            
            {/* Separador */}
            <div className="h-4 w-px bg-white/20 mx-0.5" />
            
            {/* Velocidade */}
            <div 
              className="flex items-center gap-1"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <Select 
                value={playbackRate.toString()} 
                onValueChange={(v) => {
                  handlePlaybackRateChange(parseFloat(v));
                }}
              >
                <SelectTrigger 
                  className="h-6 w-12 text-[10px] bg-white/10 hover:bg-white/20 border-white/10 text-white/90 [&>svg]:text-white/70 [&>svg]:h-2.5 [&>svg]:w-2.5"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
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
            
            {/* Separador */}
            <div className="h-4 w-px bg-white/20 mx-0.5" />
            
            {/* Marcador */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleAddBookmark();
              }}
              className="h-7 w-7 p-0 hover:bg-white/10 text-white/80 hover:text-white transition-all"
              title="Adicionar marcador"
            >
              <Bookmark className="h-3 w-3" />
            </Button>
            
            {/* Separador */}
            <div className="h-4 w-px bg-white/20 mx-0.5" />
            
            {/* Maximizar */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleToggleFullscreen();
              }}
              className="h-7 w-7 p-0 hover:bg-white/10 text-white/80 hover:text-white transition-all"
              title={isFullscreen ? "Sair de tela cheia" : "Tela cheia"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3 w-3" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
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
