import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useUsers } from '@/hooks/useUsers';
import { CalendarEvent } from '@/hooks/useCalendarEvents';

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eventData: any) => Promise<void>;
  event?: CalendarEvent | null;
  selectedDate?: Date;
}

export const CalendarEventModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  event, 
  selectedDate 
}: CalendarEventModalProps) => {
  const { users } = useUsers();
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
    event_type: 'meeting' as 'meeting' | 'task' | 'reminder' | 'deadline',
    attendees: [] as string[]
  });

  useEffect(() => {
    if (event) {
      setEventForm({
        title: event.title,
        description: event.description || '',
        start_time: format(event.start_time, "yyyy-MM-dd'T'HH:mm"),
        end_time: format(event.end_time, "yyyy-MM-dd'T'HH:mm"),
        location: event.location || '',
        event_type: event.event_type,
        attendees: event.attendees
      });
      setSelectedAttendees(event.attendees);
    } else if (selectedDate) {
      const dateStr = format(selectedDate, "yyyy-MM-dd'T'09:00");
      const endDateStr = format(selectedDate, "yyyy-MM-dd'T'10:00");
      setEventForm(prev => ({
        ...prev,
        start_time: dateStr,
        end_time: endDateStr
      }));
    }
  }, [event, selectedDate]);

  const resetForm = () => {
    setEventForm({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      location: '',
      event_type: 'meeting',
      attendees: []
    });
    setSelectedAttendees([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit({
        ...eventForm,
        start_time: new Date(eventForm.start_time),
        end_time: new Date(eventForm.end_time),
        attendees: selectedAttendees
      });
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error submitting event:', error);
    }
  };

  const handleAddAttendee = (attendee: string) => {
    if (attendee && !selectedAttendees.includes(attendee)) {
      setSelectedAttendees([...selectedAttendees, attendee]);
    }
  };

  const handleRemoveAttendee = (attendee: string) => {
    setSelectedAttendees(selectedAttendees.filter(a => a !== attendee));
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={eventForm.title}
              onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
              placeholder="Título do evento"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="start_time">Data/Hora Início</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={eventForm.start_time}
                onChange={(e) => setEventForm({...eventForm, start_time: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Data/Hora Fim</Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={eventForm.end_time}
                onChange={(e) => setEventForm({...eventForm, end_time: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_type">Tipo</Label>
            <Select value={eventForm.event_type} onValueChange={(value: any) => setEventForm({...eventForm, event_type: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meeting">Reunião</SelectItem>
                <SelectItem value="task">Tarefa</SelectItem>
                <SelectItem value="reminder">Lembrete</SelectItem>
                <SelectItem value="deadline">Prazo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Local (opcional)</Label>
            <Input
              id="location"
              value={eventForm.location}
              onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
              placeholder="Local do evento"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={eventForm.description}
              onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
              placeholder="Descrição do evento"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Participantes</Label>
            <Select onValueChange={handleAddAttendee}>
              <SelectTrigger>
                <SelectValue placeholder="Adicionar participante" />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.display_name || 'Sem nome'}>
                    {user.display_name || 'Sem nome'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAttendees.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedAttendees.map(attendee => (
                  <Badge 
                    key={attendee} 
                    variant="secondary" 
                    className="cursor-pointer"
                    onClick={() => handleRemoveAttendee(attendee)}
                  >
                    {attendee} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {event ? 'Atualizar' : 'Criar'} Evento
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};