import { useState } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Users, BookOpen } from 'lucide-react';
import { useTrainings } from '@/hooks/useTrainings';
import { Switch } from '@/components/ui/switch';
import AdminAssignments from './AdminAssignments';
import { ModuleManager } from '@/components/trainings/ModuleManager';

export default function AdminTrainings() {
  const { trainings, isLoading, createTraining, updateTraining, deleteTraining } = useTrainings();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showModuleManager, setShowModuleManager] = useState(false);
  const [editingTraining, setEditingTraining] = useState<any>(null);
  const [selectedTraining, setSelectedTraining] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    training_type: '',
    department: '',
    thumbnail_url: '',
    duration_minutes: '',
    mandatory: false
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      training_type: '',
      department: '',
      thumbnail_url: '',
      duration_minutes: '',
      mandatory: false
    });
    setEditingTraining(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trainingData = {
      ...formData,
      duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null
    };

    if (editingTraining) {
      await updateTraining.mutateAsync({ id: editingTraining.id, ...trainingData });
    } else {
      await createTraining.mutateAsync(trainingData);
    }
    
    setIsCreateOpen(false);
    resetForm();
  };

  const handleEdit = (training: any) => {
    setFormData({
      title: training.title,
      description: training.description || '',
      training_type: training.training_type || '',
      department: training.department || '',
      thumbnail_url: training.thumbnail_url || '',
      duration_minutes: training.duration_minutes?.toString() || '',
      mandatory: training.mandatory
    });
    setEditingTraining(training);
    setIsCreateOpen(true);
  };

  const handleManageContent = (training: any) => {
    setSelectedTraining(training);
    setShowModuleManager(true);
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Tem certeza que deseja deletar "${title}"?`)) {
      await deleteTraining.mutateAsync(id);
    }
  };

  if (isLoading) return <ModernLayout title="Treinamentos"><div>Carregando...</div></ModernLayout>;

  return (
    <ModernLayout 
      title="Gestão de Treinamentos" 
      subtitle="Crie e gerencie treinamentos para a equipe"
    >
      <Tabs defaultValue="trainings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="trainings">Treinamentos</TabsTrigger>
          <TabsTrigger value="assignments">Atribuições</TabsTrigger>
        </TabsList>

        <TabsContent value="trainings" className="space-y-4">
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Novo Treinamento</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingTraining ? 'Editar' : 'Criar'} Treinamento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Título *</Label>
                  <Input 
                    id="title" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea 
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="department">Departamento</Label>
                    <Input 
                      id="department"
                      placeholder="Vendas, TI, RH..."
                      value={formData.department}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="training_type">Tipo</Label>
                    <Input 
                      id="training_type"
                      placeholder="Onboarding, Técnico..."
                      value={formData.training_type}
                      onChange={(e) => setFormData({...formData, training_type: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="thumbnail_url">URL da Thumbnail</Label>
                  <Input 
                    id="thumbnail_url"
                    placeholder="https://..."
                    value={formData.thumbnail_url}
                    onChange={(e) => setFormData({...formData, thumbnail_url: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="duration">Duração Total (minutos)</Label>
                  <Input 
                    id="duration"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch 
                    id="mandatory"
                    checked={formData.mandatory}
                    onCheckedChange={(checked) => setFormData({...formData, mandatory: checked})}
                  />
                  <Label htmlFor="mandatory">Obrigatório</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingTraining ? 'Salvar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <div className="grid gap-4 md:grid-cols-2">
            {trainings && trainings.map((training) => (
              <Card key={training.id}>
                <CardHeader>
                  <div className="flex gap-4">
                    {training.thumbnail_url && (
                      <img 
                        src={training.thumbnail_url} 
                        alt={training.title}
                        className="w-24 h-24 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <CardTitle className="text-base">{training.title}</CardTitle>
                        {training.mandatory && (
                          <Badge variant="destructive">Obrigatório</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {training.description || 'Sem descrição'}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    {training.training_type && (
                      <Badge variant="secondary">{training.training_type}</Badge>
                    )}
                    {training.department && (
                      <Badge variant="outline">{training.department}</Badge>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleManageContent(training)}
                    >
                      <BookOpen className="h-4 w-4 mr-1" />
                      Conteúdo
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEdit(training)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDelete(training.id, training.title)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Deletar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assignments">
          <AdminAssignments />
        </TabsContent>
      </Tabs>

      {/* Module Manager Dialog */}
      <Dialog open={showModuleManager} onOpenChange={setShowModuleManager}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Gerenciar Conteúdo: {selectedTraining?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedTraining && (
            <ModuleManager trainingId={selectedTraining.id} />
          )}
        </DialogContent>
      </Dialog>
    </ModernLayout>
  );
}
