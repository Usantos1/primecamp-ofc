import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Tag, Clock, Edit } from 'lucide-react';
import { Task } from '@/hooks/useTasks';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
}

export function TaskDetailModal({ task, isOpen, onClose, onEdit }: TaskDetailModalProps) {
  const { isAdmin } = useAuth();

  if (!task) return null;

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-500 text-white';
      case 'in_progress': return 'bg-blue-500 text-white';
      case 'delayed': return 'bg-red-500 text-white';
      case 'canceled': return 'bg-gray-500 text-white';
      default: return 'bg-yellow-500 text-white';
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{task.name}</DialogTitle>
            {isAdmin && onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(task.status)}>
              {getStatusLabel(task.status)}
            </Badge>
            {new Date(task.deadline) < new Date() && task.status !== 'completed' && (
              <Badge className="bg-red-500 text-white">Atrasada</Badge>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <h3 className="font-semibold mb-2">Descrição</h3>
              <div className="prose prose-sm max-w-none dark:prose-invert bg-muted/30 p-4 rounded-lg">
                {task.description.replace(/<[^>]*>/g, '')}
              </div>
            </div>
          )}

          {/* Task Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Responsável:</span>
                <span className="text-sm">{task.responsible_name}</span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Prazo:</span>
                <span className="text-sm">
                  {format(new Date(task.deadline), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {task.category_name && (
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Categoria:</span>
                  <span className="text-sm">{task.category_name}</span>
                </div>
              )}

              {task.process_name && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Processo:</span>
                  <span className="text-sm">{task.process_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Created At */}
          <div className="text-xs text-muted-foreground border-t pt-4">
            Criado em {format(new Date(task.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}