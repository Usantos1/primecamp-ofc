import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Play } from 'lucide-react';
import { useLessons } from '@/hooks/useLessons';

interface LessonManagerProps {
  moduleId: string;
}

export function LessonManager({ moduleId }: LessonManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState<number>(0);

  const { lessons, createLesson, updateLesson, deleteLesson, reorderLessons } = useLessons(moduleId);

  const handleSubmit = () => {
    if (!title.trim() || !videoUrl.trim()) return;

    if (editingLesson) {
      updateLesson.mutate({ 
        id: editingLesson.id, 
        title, 
        description,
        video_url: videoUrl,
        duration_minutes: duration || null
      });
    } else {
      const maxOrder = lessons?.reduce((max, l) => Math.max(max, l.order_index), -1) ?? -1;
      createLesson.mutate({ 
        module_id: moduleId,
        title, 
        description,
        video_url: videoUrl,
        duration_minutes: duration || null,
        order_index: maxOrder + 1
      });
    }
    
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setVideoUrl('');
    setDuration(0);
    setEditingLesson(null);
    setIsOpen(false);
  };

  const handleEdit = (lesson: any) => {
    setEditingLesson(lesson);
    setTitle(lesson.title);
    setDescription(lesson.description || '');
    setVideoUrl(lesson.video_url);
    setDuration(lesson.duration_minutes || 0);
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja deletar esta aula?')) {
      deleteLesson.mutate(id);
    }
  };

  const moveLesson = (index: number, direction: 'up' | 'down') => {
    if (!lessons) return;
    const newLessons = [...lessons];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newLessons.length) return;
    
    [newLessons[index], newLessons[targetIndex]] = [newLessons[targetIndex], newLessons[index]];
    
    const updates = newLessons.map((l, i) => ({ id: l.id, order_index: i }));
    reorderLessons.mutate(updates);
  };

  return (
    <div className="space-y-3">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button size="sm" onClick={() => setEditingLesson(null)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Aula
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLesson ? 'Editar Aula' : 'Nova Aula'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Título</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Como fazer login no sistema"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">URL do YouTube</label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Duração (minutos)</label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                placeholder="15"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Descrição</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição opcional da aula"
                rows={3}
              />
            </div>
            <Button onClick={handleSubmit} className="w-full">
              {editingLesson ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {lessons?.map((lesson, index) => (
          <Card key={lesson.id} className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <Play className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{lesson.title}</p>
                  {lesson.duration_minutes && (
                    <p className="text-xs text-muted-foreground">
                      {lesson.duration_minutes} min
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveLesson(index, 'up')}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveLesson(index, 'down')}
                  disabled={index === lessons.length - 1}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(lesson)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(lesson.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        
        {!lessons || lessons.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma aula criada ainda
          </p>
        )}
      </div>
    </div>
  );
}
