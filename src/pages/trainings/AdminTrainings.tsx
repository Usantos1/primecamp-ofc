import { useState, useMemo } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Users, BookOpen, Search, Filter, Clock, Users as UsersIcon } from 'lucide-react';
import { useTrainings } from '@/hooks/useTrainings';
import { Switch } from '@/components/ui/switch';
import AdminAssignments from './AdminAssignments';
import { ModuleManager } from '@/components/trainings/ModuleManager';
import { QuizManager } from '@/components/trainings/QuizManager';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function AdminTrainings() {
  const { trainings, isLoading, createTraining, updateTraining, deleteTraining } = useTrainings();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterMandatory, setFilterMandatory] = useState<string>('all');
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
    await deleteTraining.mutateAsync(id);
  };

  // Get unique values for filters
  const departments = useMemo(() => {
    const depts = new Set<string>();
    trainings?.forEach(t => {
      if (t.department) depts.add(t.department);
    });
    return Array.from(depts);
  }, [trainings]);

  const types = useMemo(() => {
    const typeSet = new Set<string>();
    trainings?.forEach(t => {
      if (t.training_type) typeSet.add(t.training_type);
    });
    return Array.from(typeSet);
  }, [trainings]);

  // Filter trainings
  const filteredTrainings = useMemo(() => {
    if (!trainings) return [];
    return trainings.filter(training => {
      const matchesSearch = !searchTerm || 
        training.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        training.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDepartment = filterDepartment === 'all' || training.department === filterDepartment;
      const matchesType = filterType === 'all' || training.training_type === filterType;
      const matchesMandatory = filterMandatory === 'all' || 
        (filterMandatory === 'yes' && training.mandatory) ||
        (filterMandatory === 'no' && !training.mandatory);
      
      return matchesSearch && matchesDepartment && matchesType && matchesMandatory;
    });
  }, [trainings, searchTerm, filterDepartment, filterType, filterMandatory]);

  if (isLoading) {
    return (
      <ModernLayout title="Treinamentos">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </ModernLayout>
    );
  }

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
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar treinamentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {departments.length > 0 && (
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {types.length > 0 && (
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {types.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={filterMandatory} onValueChange={setFilterMandatory}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Obrigatório" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="yes">Obrigatórios</SelectItem>
                <SelectItem value="no">Opcionais</SelectItem>
              </SelectContent>
            </Select>
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

          {filteredTrainings.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">
                {searchTerm || filterDepartment !== 'all' || filterType !== 'all' || filterMandatory !== 'all'
                  ? 'Nenhum treinamento encontrado com os filtros aplicados'
                  : 'Nenhum treinamento criado ainda'}
              </p>
              {(searchTerm || filterDepartment !== 'all' || filterType !== 'all' || filterMandatory !== 'all') && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setFilterDepartment('all');
                    setFilterType('all');
                    setFilterMandatory('all');
                  }}
                  className="mt-4"
                >
                  Limpar Filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTrainings.map((training) => (
                <Card key={training.id} className="hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50">
                  {training.thumbnail_url && (
                    <div className="relative h-48 overflow-hidden rounded-t-lg">
                      <img 
                        src={training.thumbnail_url} 
                        alt={training.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        {training.mandatory && (
                          <Badge variant="destructive" className="shadow-lg">
                            Obrigatório
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2">{training.title}</CardTitle>
                      {!training.thumbnail_url && training.mandatory && (
                        <Badge variant="destructive" className="shrink-0">Obrigatório</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                      {training.description || 'Sem descrição'}
                    </p>
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

                    {training.duration_minutes && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{training.duration_minutes} minutos</span>
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap pt-2 border-t">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleManageContent(training)}
                        className="flex-1"
                      >
                        <BookOpen className="h-4 w-4 mr-1" />
                        Conteúdo
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEdit(training)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o treinamento "{training.title}"? 
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(training.id, training.title)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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
            <Tabs defaultValue="modules" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="modules">Módulos e Aulas</TabsTrigger>
                <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
              </TabsList>
              <TabsContent value="modules">
                <ModuleManager trainingId={selectedTraining.id} />
              </TabsContent>
              <TabsContent value="quizzes">
                <QuizManager trainingId={selectedTraining.id} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </ModernLayout>
  );
}
