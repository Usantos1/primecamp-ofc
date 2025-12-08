import { useState, useMemo, useEffect } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Plus, Calendar, User, Tag, Clock, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { useTasks, Task } from '@/hooks/useTasks';
import { useUsers } from '@/hooks/useUsers';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TaskDetailModal } from '@/components/TaskDetailModal';
import { TaskFooterTips } from '@/components/TaskFooterTips';

const statusOptions = [
  { value: 'pending', label: 'Pendente', color: 'bg-yellow-500' },
  { value: 'in_progress', label: 'Em andamento', color: 'bg-blue-500' },
  { value: 'completed', label: 'Concluída', color: 'bg-green-500' },
  { value: 'delayed', label: 'Atrasada', color: 'bg-red-500' },
  { value: 'canceled', label: 'Cancelada', color: 'bg-gray-500' }
];

export default function Tasks() {
  const { tasks, loading, createTask, updateTaskStatus, updateTask, deleteTask } = useTasks();
  const { users } = useUsers();
  const { categories } = useCategories();
  const { isAdmin, user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [responsibleFilter, setResponsibleFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
      category_id: '',
      responsible_user_id: '',
      deadline: '',
      status: 'pending' as const
    }
  });

  const editForm = useForm({
    defaultValues: {
      name: '',
      description: '',
      category_id: '',
      responsible_user_id: '',
      deadline: '',
      status: 'pending' as Task['status']
    }
  });

  // Load task data into edit form when modal opens
  useEffect(() => {
    if (selectedTask && isEditModalOpen) {
      editForm.reset({
        name: selectedTask.name,
        description: selectedTask.description || '',
        category_id: selectedTask.category_id || '',
        responsible_user_id: selectedTask.responsible_user_id,
        deadline: selectedTask.deadline.slice(0, 16), // Format for datetime-local
        status: selectedTask.status
      });
    }
  }, [selectedTask, isEditModalOpen, editForm]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || task.category_id === categoryFilter;
      const matchesResponsible = responsibleFilter === 'all' || task.responsible_user_id === responsibleFilter;
      const matchesSearch = searchTerm === '' || 
        task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.responsible_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesCategory && matchesResponsible && matchesSearch;
    });
  }, [tasks, statusFilter, categoryFilter, responsibleFilter, searchTerm]);

  const getStatusBadge = (status: Task['status']) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return (
      <Badge className={`${statusOption?.color} text-white`}>
        {statusOption?.label}
      </Badge>
    );
  };

  const isOverdue = (deadline: string, status: Task['status']) => {
    return new Date(deadline) < new Date() && status !== 'completed';
  };

  const onSubmit = async (data: any) => {
    if (!user) return;
    
    const success = await createTask({
      ...data,
      created_by: user.id,
    });
    
    if (success) {
      form.reset();
      setIsCreateModalOpen(false);
    }
  };

  const onEditSubmit = async (data: any) => {
    if (!selectedTask || !user) return;
    
    const success = await updateTask(selectedTask.id, data);
    
    if (success) {
      editForm.reset();
      setIsEditModalOpen(false);
      setSelectedTask(null);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    await updateTaskStatus(taskId, newStatus);
  };

  const handleDeleteTask = async (taskId: string, taskName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a tarefa "${taskName}"?`)) {
      const success = await deleteTask(taskId);
      if (success) {
        setSelectedTask(null);
      }
    }
  };

  return (
    <div className="relative min-h-screen">
      <ModernLayout 
        title="Tarefas" 
        subtitle="Gerencie todas as tarefas do sistema"
        headerActions={
          isAdmin && (
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Tarefa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Criar Nova Tarefa</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Tarefa</FormLabel>
                          <FormControl>
                            <Input placeholder="Digite o nome da tarefa" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Descreva a tarefa" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="category_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoria</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione uma categoria" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories.map(category => (
                                  <SelectItem key={category.id} value={category.id}>
                                    {category.icon} {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="responsible_user_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Responsável</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione um responsável" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {users.map(user => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.display_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="deadline"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prazo</FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {statusOptions.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">
                        Criar Tarefa
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )
        }
      >
        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
          <Input
            placeholder="Buscar tarefas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-background/50"
          />
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {statusOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tasks Container */}
        <div className="space-y-4 pb-4">
          {loading ? (
            <div className="text-center py-8">Carregando tarefas...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma tarefa encontrada
            </div>
          ) : (
            filteredTasks.map(task => {
                const getTaskCardColor = (status: Task['status']) => {
                  switch (status) {
                    case 'completed': return 'bg-green-100 border-green-300 dark:bg-green-950 dark:border-green-700';
                    case 'in_progress': return 'bg-blue-100 border-blue-300 dark:bg-blue-950 dark:border-blue-700';
                    case 'delayed': return 'bg-red-100 border-red-300 dark:bg-red-950 dark:border-red-700';
                    case 'canceled': return 'bg-gray-100 border-gray-300 dark:bg-gray-950 dark:border-gray-700';
                    default: return 'bg-yellow-100 border-yellow-300 dark:bg-yellow-950 dark:border-yellow-700';
                  }
                };
                
                return (
                <Card 
                  key={task.id} 
                  className={`backdrop-blur-sm border hover:shadow-lg transition-all duration-200 ${getTaskCardColor(task.status)}`}
                >
                  <CardHeader className="pb-3">
                    {/* Header with Status, Edit, and Delete */}
                    <div className="flex items-center justify-between mb-3 p-3 bg-muted/50 rounded-lg border">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(task.status)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Select 
                          value={task.status} 
                          onValueChange={(value) => handleStatusChange(task.id, value as Task['status'])}
                        >
                          <SelectTrigger className="min-w-[160px] h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-50">
                            {statusOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isAdmin && (
                          <div className="flex gap-1">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-8 w-8 p-0 bg-blue-50 hover:bg-blue-100 border-blue-200 dark:bg-blue-950 dark:hover:bg-blue-900 dark:border-blue-800"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTask(task);
                                setIsEditModalOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-8 w-8 p-0 bg-red-50 hover:bg-red-100 border-red-200 dark:bg-red-950 dark:hover:bg-red-900 dark:border-red-800"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task.id, task.name);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Task Title and Description */}
                    <div 
                      className="space-y-2 cursor-pointer"
                      onClick={() => setSelectedTask(task)}
                    >
                      <CardTitle className="text-lg flex items-center gap-2 hover:text-primary transition-colors">
                        {task.name}
                        {isOverdue(task.deadline, task.status) && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </CardTitle>
                      {task.description && (
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {task.description.replace(/<[^>]*>/g, '')}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{task.responsible_name}</span>
                        </div>
                        {task.category_name && (
                          <div className="flex items-center gap-1">
                            <Tag className="h-4 w-4" />
                            <span>{task.category_name}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span className={isOverdue(task.deadline, task.status) ? 'text-red-500 font-medium' : ''}>
                          {format(new Date(task.deadline), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })
            )}

          {/* Tips Component */}
          <TaskFooterTips />
        </div>

        {/* Task Detail Modal */}
        {selectedTask && !isEditModalOpen && (
          <TaskDetailModal
            task={selectedTask}
            isOpen={!!selectedTask}
            onClose={() => setSelectedTask(null)}
          />
        )}

        {/* Edit Task Modal */}
        {isEditModalOpen && selectedTask && (
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Editar Tarefa</DialogTitle>
              </DialogHeader>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Tarefa</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite o nome da tarefa" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Descreva a tarefa" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="category_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione uma categoria" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map(category => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.icon} {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="responsible_user_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsável</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um responsável" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users.map(user => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.display_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="deadline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prazo</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {statusOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      Salvar Alterações
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </ModernLayout>
    </div>
  );
}