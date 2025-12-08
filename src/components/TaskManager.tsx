import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useUsers } from '@/hooks/useUsers';
import { useCategories } from '@/hooks/useCategories';
import { useTasks, Task } from '@/hooks/useTasks';
import { useProcesses } from '@/hooks/useProcesses';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Calendar, Clock, CheckCircle, AlertTriangle, User, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface TaskManagerProps {
  processId?: string;
}

export const TaskManager: React.FC<TaskManagerProps> = ({ processId }) => {
  const { users } = useUsers();
  const { categories } = useCategories();
  const { processes } = useProcesses();
  const { tasks, createTask, updateTaskStatus, deleteTask, loading } = useTasks();
  const { user, isAdmin } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    category_id: '',
    process_id: processId || '',
    responsible_user_id: '',
    deadline: '',
    status: 'pending' as const
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Filter tasks for this process
  const processTasks = processId ? tasks.filter(task => task.process_id === processId) : tasks;

  // Check for overdue tasks and notify
  useEffect(() => {
    const checkOverdueTasks = () => {
      const now = new Date();
      const overdueTasks = processTasks.filter(task => {
        const deadline = new Date(task.deadline);
        return task.status !== 'completed' && deadline < now && task.status !== 'delayed';
      });

      overdueTasks.forEach(task => {
        if (task.status !== 'delayed') {
          updateTaskStatus(task.id, 'delayed');
          toast.error(`Tarefa "${task.name}" está atrasada!`);
        }
      });
    };

    const interval = setInterval(checkOverdueTasks, 60000); // Check every minute
    checkOverdueTasks(); // Check immediately

    return () => clearInterval(interval);
  }, [processTasks, updateTaskStatus]);

  const handleCreateTask = async () => {
    if (!newTask.name || !newTask.deadline || !newTask.responsible_user_id) {
      toast.error("Nome, responsável e prazo são obrigatórios");
      return;
    }

    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    const taskData = {
      ...newTask,
      process_id: processId,
      created_by: user.id,
    };

    const success = await createTask(taskData);
    
    if (success) {
      setNewTask({
        name: '',
        description: '',
        category_id: '',
        process_id: processId || '',
        responsible_user_id: '',
        deadline: '',
        status: 'pending' as const
      });
      setShowCreateModal(false);
    }
  };

  const handleStatusChange = async (taskId: string, status: Task['status']) => {
    await updateTaskStatus(taskId, status);
  };

  const handleDeleteTask = async (taskId: string, taskName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a tarefa "${taskName}"?`)) {
      await deleteTask(taskId);
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'in_progress': return 'bg-blue-100 border-blue-500 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'delayed': return 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'canceled': return 'bg-gray-100 border-gray-500 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
      default: return 'bg-yellow-100 border-yellow-500 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'; // pending
    }
  };

  const getCardBackgroundColor = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800';
      case 'in_progress': return 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800';
      case 'delayed': return 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800';
      case 'canceled': return 'bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800';
      default: return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800'; // pending
    }
  };

  const getStatusLabel = (status: Task['status']) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'in_progress': return 'Em andamento';
      case 'completed': return 'Concluída';
      case 'delayed': return 'Atrasada';
      case 'canceled': return 'Cancelada';
      default: return 'Pendente';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Tarefas ({processTasks.length})
        </CardTitle>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Nova Tarefa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Nome da Tarefa</label>
                <Input
                  value={newTask.name}
                  onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                  placeholder="Digite o nome da tarefa..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Descrição</label>
                <Textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Descrição opcional..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Categoria</label>
                  <Select value={newTask.category_id} onValueChange={(value) => setNewTask({ ...newTask, category_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Processo Vinculado</label>
                  <Select value={newTask.process_id} onValueChange={(value) => setNewTask({ ...newTask, process_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um processo" />
                    </SelectTrigger>
                    <SelectContent>
                      {processes.map(process => (
                        <SelectItem key={process.id} value={process.id}>
                          {process.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Responsável</label>
                <Select value={newTask.responsible_user_id} onValueChange={(value) => setNewTask({ ...newTask, responsible_user_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Prazo</label>
                <Input
                  type="datetime-local"
                  value={newTask.deadline}
                  onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleCreateTask} className="flex-1">
                  Criar Tarefa
                </Button>
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Carregando tarefas...</div>
        ) : processTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma tarefa criada ainda</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
            {processTasks.map((task) => (
              <div key={task.id} className={`border rounded-lg p-4 space-y-3 ${getCardBackgroundColor(task.status)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{task.name}</h4>
                     {task.description && (
                       <div className="text-sm text-muted-foreground mt-1">
                         {task.description.replace(/<[^>]*>/g, '')}
                       </div>
                     )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(task.status)}>
                        {getStatusLabel(task.status)}
                      </Badge>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-8 w-8 p-0 bg-blue-50 hover:bg-blue-100 border-blue-200 dark:bg-blue-950 dark:hover:bg-blue-900 dark:border-blue-800"
                            onClick={() => {
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
                            onClick={() => handleDeleteTask(task.id, task.name)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <Select 
                      value={task.status} 
                      onValueChange={(value) => handleStatusChange(task.id, value as Task['status'])}
                    >
                      <SelectTrigger className="w-full min-w-[140px] h-10 text-center">
                        <SelectValue />
                      </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="pending">Pendente</SelectItem>
                       <SelectItem value="in_progress">Em andamento</SelectItem>
                       <SelectItem value="completed">Concluída</SelectItem>
                       <SelectItem value="delayed">Atrasada</SelectItem>
                       <SelectItem value="canceled">Cancelada</SelectItem>
                     </SelectContent>
                   </Select>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(task.deadline).toLocaleString('pt-BR')}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {task.responsible_name}
                  </div>
                  
                  {task.category_name && (
                    <div className="text-xs bg-muted px-2 py-1 rounded">
                      {task.category_name}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange(task.id, 'in_progress')}
                    disabled={task.status === 'completed'}
                  >
                    Iniciar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(task.id, 'completed')}
                    disabled={task.status === 'completed'}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Concluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};