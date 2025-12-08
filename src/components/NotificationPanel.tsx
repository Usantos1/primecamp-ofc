import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, X, AlertTriangle, CheckCircle, Info, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  id: string;
  type: 'task_overdue' | 'task_assigned' | 'process_updated' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationChange?: (count: number) => void;
}

export function NotificationPanel({ isOpen, onClose, onNotificationChange }: NotificationPanelProps) {
  const { tasks } = useTasks();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Try to load notifications from localStorage
    const savedNotifications = localStorage.getItem('notifications');
    let allNotifications: Notification[] = [];

    if (savedNotifications) {
      try {
        allNotifications = JSON.parse(savedNotifications);
      } catch (error) {
        console.error('Error parsing saved notifications:', error);
      }
    }

    // Generate notifications from overdue tasks
    const overdueTasks = tasks.filter(task => 
      task.responsible_user_id === user?.id &&
      new Date(task.deadline) < new Date() && 
      task.status !== 'completed'
    );

    const taskNotifications: Notification[] = overdueTasks.map(task => {
      const existingNotification = allNotifications.find(n => n.id === `overdue-${task.id}`);
      return {
        id: `overdue-${task.id}`,
        type: 'task_overdue',
        title: 'Tarefa em Atraso',
        message: `A tarefa "${task.name}" está em atraso desde ${format(new Date(task.deadline), "dd/MM/yyyy", { locale: ptBR })}`,
        timestamp: new Date(task.deadline),
        read: existingNotification?.read || false
      };
    });

    // Add some mock notifications only if they don't exist
    const systemNotifications: Notification[] = [];
    
    if (!allNotifications.find(n => n.id === 'welcome')) {
      systemNotifications.push({
        id: 'welcome',
        type: 'info',
        title: 'Bem-vindo ao ProcessFlow',
        message: 'Sistema de gestão de processos está funcionando perfeitamente!',
        timestamp: new Date(),
        read: false
      });
    }

    if (!allNotifications.find(n => n.id === 'system-update')) {
      systemNotifications.push({
        id: 'system-update',
        type: 'info',
        title: 'Sistema Atualizado',
        message: 'Nova versão do sistema foi implantada com melhorias de performance.',
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        read: false
      });
    }

    const finalNotifications = [
      ...taskNotifications,
      ...systemNotifications,
      ...allNotifications.filter(n => 
        !taskNotifications.find(tn => tn.id === n.id) && 
        !systemNotifications.find(sn => sn.id === n.id)
      )
    ];

    setNotifications(finalNotifications);
    localStorage.setItem('notifications', JSON.stringify(finalNotifications));
  }, [tasks, user]);

  // Update notification count when it changes
  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.read).length;
    onNotificationChange?.(unreadCount);
  }, [notifications, onNotificationChange]);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'task_overdue':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'task_assigned':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'process_updated':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  const getNotificationBadge = (type: Notification['type']) => {
    switch (type) {
      case 'task_overdue':
        return <Badge className="bg-red-500 text-white">Urgente</Badge>;
      case 'task_assigned':
        return <Badge className="bg-green-500 text-white">Nova</Badge>;
      case 'process_updated':
        return <Badge className="bg-blue-500 text-white">Atualização</Badge>;
      default:
        return <Badge variant="secondary">Info</Badge>;
    }
  };

  const markAsRead = (notificationId: string) => {
    const updatedNotifications = notifications.map(notification => 
      notification.id === notificationId 
        ? { ...notification, read: true }
        : notification
    );
    setNotifications(updatedNotifications);
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
  };

  const deleteNotification = (notificationId: string) => {
    const updatedNotifications = notifications.filter(n => n.id !== notificationId);
    setNotifications(updatedNotifications);
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
  };

  const clearAll = () => {
    const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updatedNotifications);
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
  };

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const notificationPanel = target.closest('.notification-panel');
      const notificationButton = target.closest('[data-notification-trigger]');
      
      if (!notificationPanel && !notificationButton && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
      <div className="w-full max-w-md bg-background border-l shadow-lg h-full overflow-hidden notification-panel">
        <Card className="h-full rounded-none border-0">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificações
                {notifications.filter(n => !n.read).length > 0 && (
                  <Badge className="bg-red-500 text-white">
                    {notifications.filter(n => !n.read).length}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAll}>
                    Limpar tudo
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 h-full overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <div className="text-center">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma notificação</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b cursor-pointer transition-colors ${
                      notification.read 
                        ? 'bg-background opacity-60' 
                        : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">{notification.title}</h4>
                        <div className="flex items-center gap-1">
                          {getNotificationBadge(notification.type)}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(notification.timestamp, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}