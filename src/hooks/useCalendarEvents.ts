import { useState, useEffect } from 'react';
import { from } from '@/integrations/db/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useWhatsApp } from '@/hooks/useWhatsApp';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: Date;
  end_time: Date;
  location?: string;
  event_type: 'meeting' | 'task' | 'reminder' | 'deadline';
  attendees: string[];
  created_by: string;
  related_task_id?: string;
  related_process_id?: string;
}

export const useCalendarEvents = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendCalendarNotification, getUserPhoneByName } = useWhatsApp();

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('start_time', { ascending: true })
        .execute();

      if (error) throw error;

      const formattedEvents: CalendarEvent[] = data?.map(event => ({
        ...event,
        start_time: new Date(event.start_time),
        end_time: new Date(event.end_time),
        event_type: event.event_type as CalendarEvent['event_type'],
        attendees: event.attendees || [],
      })) || [];

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar eventos do calendário",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (eventData: Omit<CalendarEvent, 'id' | 'created_by'>) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('calendar_events')
        .insert([{
          ...eventData,
          start_time: eventData.start_time.toISOString(),
          end_time: eventData.end_time.toISOString(),
          created_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      const newEvent: CalendarEvent = {
        ...data,
        start_time: new Date(data.start_time),
        end_time: new Date(data.end_time),
        event_type: data.event_type as CalendarEvent['event_type'],
        attendees: data.attendees || [],
      };

      setEvents(prev => [...prev, newEvent]);

      // Notification is now handled by NotificationManager automatically
      console.log('Calendar event created - notification will be sent by NotificationManager');

      toast({
        title: "Evento criado",
        description: "Evento criado com sucesso e notificações enviadas!",
      });

      return newEvent;
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar evento",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    try {
      const updateData = {
        ...updates,
        start_time: updates.start_time?.toISOString(),
        end_time: updates.end_time?.toISOString(),
      };

      const { data, error } = await supabase
        .from('calendar_events')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedEvent: CalendarEvent = {
        ...data,
        start_time: new Date(data.start_time),
        end_time: new Date(data.end_time),
        event_type: data.event_type as CalendarEvent['event_type'],
        attendees: data.attendees || [],
      };

      setEvents(prev => prev.map(event => 
        event.id === id ? updatedEvent : event
      ));

      // Notification updates are now handled by NotificationManager automatically
      console.log('Calendar event updated - notification will be sent by NotificationManager');

      toast({
        title: "Evento atualizado",
        description: "Evento atualizado com sucesso!",
      });

      return updatedEvent;
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar evento",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const eventToDelete = events.find(e => e.id === id);

      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEvents(prev => prev.filter(event => event.id !== id));

      // Notification cancellations are now handled by NotificationManager automatically
      console.log('Calendar event deleted - cancellation notification will be sent by NotificationManager');

      toast({
        title: "Evento excluído",
        description: "Evento excluído com sucesso!",
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir evento",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getEventTypeLabel = (type: string) => {
    const labels = {
      meeting: 'Reunião',
      task: 'Tarefa',
      reminder: 'Lembrete',
      deadline: 'Prazo'
    };
    return labels[type as keyof typeof labels] || type;
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return {
    events,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    refetch: fetchEvents,
  };
};