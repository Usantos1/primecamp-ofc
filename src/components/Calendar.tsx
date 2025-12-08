import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, MapPin, Users, Edit, Trash2, Move } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useCalendarEvents, CalendarEvent } from '@/hooks/useCalendarEvents';
import { CalendarEventModal } from './CalendarEventModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

export const Calendar = () => {
  const { user } = useAuth();
  const { tasks } = useTasks();
  const { events, loading, createEvent, updateEvent, deleteEvent } = useCalendarEvents();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);

  // Convert tasks to calendar events with extended interface for task events
  const taskEvents = useMemo(() => {
    return tasks.map(task => ({
      id: task.id,
      title: task.name,
      description: task.description,
      start_time: new Date(task.deadline),
      end_time: new Date(task.deadline),
      event_type: 'deadline' as const,
      attendees: [task.responsible_name || ''],
      created_by: task.created_by || '',
      location: undefined,
      color: task.status === 'delayed' ? '#ef4444' : task.status === 'completed' ? '#10b981' : '#f59e0b'
    }));
  }, [tasks]);

  // Combine calendar events and task events
  const allEvents = [...events, ...taskEvents];

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // Grid de calendário completo - segunda a domingo
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (date: Date) => {
    return allEvents.filter(event => 
      isSameDay(event.start_time, date) || isSameDay(event.end_time, date)
    );
  };

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleDayDoubleClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setIsEventDialogOpen(true);
  };

  const openEditEvent = (event: CalendarEvent) => {
    // Only allow editing of calendar events, not task events
    if (event.event_type === 'deadline' && tasks.some(t => t.id === event.id)) {
      return; // Don't allow editing task deadlines from calendar
    }
    setSelectedEvent(event);
    setIsEventDialogOpen(true);
  };

  const handleEventSubmit = async (eventData: any) => {
    if (selectedEvent) {
      await updateEvent(selectedEvent.id, eventData);
    } else {
      await createEvent(eventData);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEvent(eventId);
      toast({
        title: "Evento excluído",
        description: "O evento foi excluído com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir evento.",
        variant: "destructive",
      });
    }
  };

  const handleDragStart = (event: CalendarEvent, e: React.DragEvent) => {
    // Only allow dragging of calendar events, not task deadlines
    if (event.event_type === 'deadline' && tasks.some(t => t.id === event.id)) {
      e.preventDefault();
      return;
    }
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (date: Date, e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedEvent) return;

    try {
      const timeDiff = draggedEvent.end_time.getTime() - draggedEvent.start_time.getTime();
      const newStartTime = new Date(date);
      newStartTime.setHours(draggedEvent.start_time.getHours(), draggedEvent.start_time.getMinutes());
      
      const newEndTime = new Date(newStartTime.getTime() + timeDiff);

      await updateEvent(draggedEvent.id, {
        ...draggedEvent,
        start_time: newStartTime,
        end_time: newEndTime,
      });

      toast({
        title: "Evento movido",
        description: `Evento movido para ${format(newStartTime, "d 'de' MMMM", { locale: ptBR })}`,
      });
    } catch (error) {
      console.error('Error moving event:', error);
      toast({
        title: "Erro",
        description: "Erro ao mover evento.",
        variant: "destructive",
      });
    } finally {
      setDraggedEvent(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </h2>
              <Button variant="outline" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={view} onValueChange={(value: 'month' | 'week') => setView(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Mês</SelectItem>
                  <SelectItem value="week">Semana</SelectItem>
                </SelectContent>
              </Select>
              
              <Button onClick={() => {
                setSelectedEvent(null);
                setIsEventDialogOpen(true);
              }} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Evento
              </Button>
              
              <CalendarEventModal
                isOpen={isEventDialogOpen}
                onClose={() => setIsEventDialogOpen(false)}
                onSubmit={handleEventSubmit}
                event={selectedEvent}
                selectedDate={selectedDate}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(day => {
              const dayEvents = getEventsForDay(day);
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              
              return (
                <button
                  key={day.toString()}
                  onClick={() => handleDayClick(day)}
                  onDoubleClick={() => handleDayDoubleClick(day)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(day, e)}
                  className={cn(
                    "relative p-2 min-h-[80px] text-left transition-colors border rounded-md",
                    isCurrentMonth 
                      ? "bg-card hover:bg-muted/50" 
                      : "bg-muted/20 text-muted-foreground",
                    isSelected && "bg-primary/10 border-primary",
                    isTodayDate && "bg-primary/5 border-primary/30",
                    draggedEvent && "border-dashed border-primary/50"
                  )}
                >
                  <span className={cn(
                    "text-sm font-medium",
                    isTodayDate && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </span>
                  
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 3).map(event => {
                      const isTaskDeadline = event.event_type === 'deadline' && tasks.some(t => t.id === event.id);
                      return (
                        <div
                          key={event.id}
                          draggable={!isTaskDeadline}
                          onDragStart={(e) => handleDragStart(event, e)}
                          className={cn(
                            "text-xs p-1 rounded text-white truncate cursor-pointer hover:opacity-80 flex items-center gap-1",
                            !isTaskDeadline && "cursor-move"
                          )}
                          style={{ backgroundColor: (event as any).color || '#6366f1' }}
                          title={`${event.title}${!isTaskDeadline ? ' (Clique para editar ou arraste para mover)' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isTaskDeadline) {
                              openEditEvent(event);
                            }
                          }}
                        >
                          {!isTaskDeadline && <Move className="h-2 w-2 opacity-70" />}
                          <span className="truncate">{event.title}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayEvents.length - 3} mais
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Events */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Eventos de {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getEventsForDay(selectedDate).length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum evento neste dia
              </p>
            ) : (
              <div className="space-y-3">
                 {getEventsForDay(selectedDate).map(event => (
                   <div
                     key={event.id}
                     className="p-4 rounded-lg border-l-4"
                     style={{ borderLeftColor: (event as any).color || '#6366f1' }}
                   >
                     <div className="flex items-start justify-between">
                       <div className="flex-1">
                         <h3 className="font-medium">{event.title}</h3>
                         {event.description && (
                           <div className="text-sm text-muted-foreground mt-1">
                             {event.description?.replace(/<[^>]*>/g, '') || 'Sem descrição'}
                           </div>
                         )}
                         <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                           <div className="flex items-center gap-1">
                             <Clock className="h-3 w-3" />
                             {format(event.start_time, 'HH:mm')}
                           </div>
                           {event.location && (
                             <div className="flex items-center gap-1">
                               <MapPin className="h-3 w-3" />
                               {event.location}
                             </div>
                           )}
                           {event.attendees.length > 0 && (
                             <div className="flex items-center gap-1">
                               <Users className="h-3 w-3" />
                               {event.attendees.join(', ')}
                             </div>
                           )}
                         </div>
                       </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {event.event_type === 'meeting' && 'Reunião'}
                            {event.event_type === 'task' && 'Tarefa'}
                            {event.event_type === 'reminder' && 'Lembrete'}
                            {event.event_type === 'deadline' && 'Prazo'}
                          </Badge>
                          
                          {/* Only show edit/delete for calendar events, not task deadlines */}
                          {!(event.event_type === 'deadline' && tasks.some(t => t.id === event.id)) && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditEvent(event)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir evento</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteEvent(event.id)}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                     </div>
                   </div>
                 ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};