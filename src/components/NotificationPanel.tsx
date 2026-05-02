import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, X, AlertTriangle, CheckCircle, Info, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

const DISMISSED_KEY = 'primecamp_notifications_dismissed';
const NOTIFICATIONS_KEY = 'notifications';

function getDismissedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function setDismissedId(id: string, add: boolean) {
  const set = getDismissedIds();
  if (add) set.add(id);
  else set.delete(id);
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]));
  } catch {
    // localStorage pode estar indisponível em navegação privada.
  }
}

export function NotificationPanel({ isOpen, onClose, onNotificationChange }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const savedNotifications = localStorage.getItem(NOTIFICATIONS_KEY);
    let allNotifications: Notification[] = [];

    if (savedNotifications) {
      try {
        allNotifications = JSON.parse(savedNotifications);
      } catch (error) {
        console.error('Error parsing saved notifications:', error);
      }
    }

    const dismissed = getDismissedIds();

    // Dicas úteis do sistema – só entram se o usuário nunca dispensou
    const tipAlertas: Notification = {
      id: 'tip-alertas',
      type: 'info',
      title: 'Painel de Alertas',
      message: 'Receba avisos por WhatsApp: nova OS, caixa fechado, resumo de vendas. Configure em Relatórios > Painel de Alertas.',
      timestamp: new Date(),
      read: false
    };
    const tipRelatorios: Notification = {
      id: 'tip-relatorios',
      type: 'info',
      title: 'Relatórios',
      message: 'Tendência de vendas (PDV vs OS), resumo geral e filtros por data em Relatórios.',
      timestamp: new Date(Date.now() - 3600000),
      read: false
    };

    const others = allNotifications.filter(
      (n) => !dismissed.has(n.id) && n.id !== 'tip-alertas' && n.id !== 'tip-relatorios'
    );

    const finalNotifications = [
      ...(!dismissed.has('tip-alertas') ? [tipAlertas] : []),
      ...(!dismissed.has('tip-relatorios') ? [tipRelatorios] : []),
      ...others
    ];
    setNotifications(finalNotifications);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(finalNotifications));
  }, []);

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
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updatedNotifications));
  };

  const deleteNotification = (notificationId: string) => {
    if (notificationId === 'tip-alertas' || notificationId === 'tip-relatorios') {
      setDismissedId(notificationId, true);
    }
    const updatedNotifications = notifications.filter(n => n.id !== notificationId);
    setNotifications(updatedNotifications);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updatedNotifications));
  };

  const clearAll = () => {
    const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updatedNotifications);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updatedNotifications));
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
    <div className="notification-panel fixed right-2 top-14 z-50 w-[calc(100vw-1rem)] max-w-[360px] sm:right-4 sm:top-16">
      <Card className="max-h-[min(520px,calc(100dvh-5rem))] overflow-hidden rounded-[28px] border border-border/70 bg-background shadow-[0_18px_50px_rgba(16,24,40,0.18)] dark:bg-slate-950">
        <div className="flex max-h-[min(520px,calc(100dvh-5rem))] min-h-0 flex-col">
          <CardHeader className="flex-shrink-0 border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30">
                  <Bell className="h-4 w-4" />
                </span>
                Notificações
                {notifications.filter(n => !n.read).length > 0 && (
                  <Badge className="bg-red-500 text-white">
                    {notifications.filter(n => !n.read).length}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={clearAll}>
                    Marcar lidas
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-emerald-200 scrollbar-track-transparent dark:scrollbar-thumb-emerald-900">
              {notifications.length === 0 ? (
                <div className="flex h-44 items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Bell className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    <p className="text-sm">Nenhuma notificação</p>
                  </div>
                </div>
              ) : (
                <div className="p-2">
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`cursor-pointer rounded-2xl p-3 transition-colors ${
                        notification.read 
                          ? 'bg-background opacity-70' 
                          : 'bg-muted/40 hover:bg-muted/60'
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        {getNotificationIcon(notification.type)}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="min-w-0 flex-1 truncate text-sm font-semibold">{notification.title}</h4>
                            <div className="flex shrink-0 items-center gap-1">
                              {getNotificationBadge(notification.type)}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 rounded-full p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification.id);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
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
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
