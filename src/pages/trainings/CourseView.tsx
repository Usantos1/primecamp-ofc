import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, CheckCircle, Play, ArrowLeft } from 'lucide-react';
import { useTrainings } from '@/hooks/useTrainings';
import { useLessonProgress } from '@/hooks/useLessonProgress';
import { ImprovedLessonPlayer } from '@/components/trainings/ImprovedLessonPlayer';
import { ModernLayout } from '@/components/ModernLayout';

export default function CourseView() {
  const { trainingId } = useParams();
  const navigate = useNavigate();
  const { myAssignments } = useTrainings();
  const { progress: lessonsProgress } = useLessonProgress(trainingId);
  
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [openModules, setOpenModules] = useState<string[]>([]);

  const assignment = myAssignments?.find(a => a.training_id === trainingId);
  const training = assignment?.training;

  useEffect(() => {
    if (training?.training_modules && training.training_modules.length > 0) {
      // Open first module by default
      setOpenModules([training.training_modules[0].id]);
      
      // Find last watched lesson or select first
      const lastProgress = lessonsProgress?.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )[0];
      
      if (lastProgress && !lastProgress.completed) {
        // Find and select the last watched lesson
        for (const module of training.training_modules) {
          const lesson = module.training_lessons?.find((l: any) => l.id === lastProgress.lesson_id);
          if (lesson) {
            setSelectedLesson(lesson);
            setOpenModules(prev => [...new Set([...prev, module.id])]);
            return;
          }
        }
      }
      
      // Select first lesson
      const firstModule = training.training_modules[0];
      if (firstModule.training_lessons && firstModule.training_lessons.length > 0) {
        setSelectedLesson(firstModule.training_lessons[0]);
      }
    }
  }, [training, lessonsProgress]);

  const toggleModule = (moduleId: string) => {
    setOpenModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const isLessonCompleted = (lessonId: string) => {
    return lessonsProgress?.find(p => p.lesson_id === lessonId)?.completed || false;
  };

  const getNextLesson = () => {
    if (!training?.training_modules || !selectedLesson) return null;
    
    for (let i = 0; i < training.training_modules.length; i++) {
      const module = training.training_modules[i];
      const lessons = module.training_lessons || [];
      const currentIndex = lessons.findIndex((l: any) => l.id === selectedLesson.id);
      
      if (currentIndex !== -1) {
        if (currentIndex < lessons.length - 1) {
          return lessons[currentIndex + 1];
        } else if (i < training.training_modules.length - 1) {
          const nextModule = training.training_modules[i + 1];
          return nextModule.training_lessons?.[0];
        }
      }
    }
    return null;
  };

  const handleNextLesson = () => {
    const nextLesson = getNextLesson();
    if (nextLesson) {
      setSelectedLesson(nextLesson);
    }
  };

  if (!training) {
    return (
      <ModernLayout title="Carregando...">
        <div className="text-center py-8">Carregando treinamento...</div>
      </ModernLayout>
    );
  }

  const totalLessons = assignment?.totalLessons || 0;
  const completedLessons = assignment?.completedLessons || 0;
  const overallProgress = assignment?.progress || 0;

  return (
    <ModernLayout 
      title={training.title}
      subtitle={training.description}
    >
      <Button
        variant="ghost"
        onClick={() => navigate('/treinamentos')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar - Modules & Lessons */}
        <div className="lg:col-span-1 space-y-3">
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Progresso Geral</h3>
            <div className="space-y-2">
              <Progress value={overallProgress} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {completedLessons} de {totalLessons} aulas concluídas
              </p>
            </div>
          </Card>

          <div className="space-y-2">
            {training.training_modules?.map((module: any, moduleIndex: number) => (
              <Card key={module.id}>
                <Collapsible
                  open={openModules.includes(module.id)}
                  onOpenChange={() => toggleModule(module.id)}
                >
                  <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="text-left flex-1">
                      <p className="font-medium text-sm">
                        Módulo {moduleIndex + 1}: {module.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {module.training_lessons?.length || 0} aulas
                      </p>
                    </div>
                    {openModules.includes(module.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-2 pb-2 space-y-1">
                      {module.training_lessons?.map((lesson: any, lessonIndex: number) => {
                        const completed = isLessonCompleted(lesson.id);
                        const isActive = selectedLesson?.id === lesson.id;
                        
                        return (
                          <Button
                            key={lesson.id}
                            variant={isActive ? "secondary" : "ghost"}
                            className="w-full justify-start text-sm"
                            onClick={() => setSelectedLesson(lesson)}
                          >
                            {completed ? (
                              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                            ) : (
                              <Play className="h-4 w-4 mr-2" />
                            )}
                            <span className="flex-1 text-left truncate">
                              {lessonIndex + 1}. {lesson.title}
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        </div>

        {/* Main Content - Video Player */}
        <div className="lg:col-span-2">
          {selectedLesson ? (
            <ImprovedLessonPlayer
              lesson={selectedLesson}
              trainingId={trainingId!}
              onNext={handleNextLesson}
              hasNext={!!getNextLesson()}
            />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                Selecione uma aula para começar
              </p>
            </Card>
          )}
        </div>
      </div>
    </ModernLayout>
  );
}
