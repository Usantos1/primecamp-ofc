import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, GraduationCap } from 'lucide-react';
import { useModules } from '@/hooks/useModules';
import { LessonManager } from './LessonManager';

interface ModuleManagerProps {
  trainingId: string;
}

export function ModuleManager({ trainingId }: ModuleManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const { modules, createModule, updateModule, deleteModule, reorderModules } = useModules(trainingId);

  const handleSubmit = () => {
    if (!title.trim()) return;

    if (editingModule) {
      updateModule.mutate({ 
        id: editingModule.id, 
        title, 
        description 
      });
    } else {
      const maxOrder = modules?.reduce((max, m) => Math.max(max, m.order_index), -1) ?? -1;
      createModule.mutate({ 
        training_id: trainingId,
        title, 
        description,
        order_index: maxOrder + 1
      });
    }
    
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEditingModule(null);
    setIsOpen(false);
  };

  const handleEdit = (module: any) => {
    setEditingModule(module);
    setTitle(module.title);
    setDescription(module.description || '');
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja deletar este módulo e todas as suas aulas?')) {
      deleteModule.mutate(id);
    }
  };

  const moveModule = (index: number, direction: 'up' | 'down') => {
    if (!modules) return;
    const newModules = [...modules];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newModules.length) return;
    
    [newModules[index], newModules[targetIndex]] = [newModules[targetIndex], newModules[index]];
    
    const updates = newModules.map((m, i) => ({ id: m.id, order_index: i }));
    reorderModules.mutate(updates);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Módulos do Treinamento</h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingModule(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Módulo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingModule ? 'Editar Módulo' : 'Novo Módulo'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Título</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Introdução ao Sistema"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Descrição</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição opcional do módulo"
                  rows={3}
                />
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingModule ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {modules?.map((module, index) => (
          <Card key={module.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    {module.title}
                  </CardTitle>
                  {module.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {module.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {module.training_lessons?.length || 0} aula(s)
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveModule(index, 'up')}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveModule(index, 'down')}
                    disabled={index === modules.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(module)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(module.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedModule(selectedModule === module.id ? null : module.id)}
              >
                {selectedModule === module.id ? 'Ocultar' : 'Gerenciar'} Aulas
              </Button>
              {selectedModule === module.id && (
                <div className="mt-4">
                  <LessonManager moduleId={module.id} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        
        {!modules || modules.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            Nenhum módulo criado ainda. Clique em "Novo Módulo" para começar.
          </Card>
        )}
      </div>
    </div>
  );
}
