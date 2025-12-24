import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSunday, isSameDay, startOfWeek, endOfWeek, addDays, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTimeClock } from '@/hooks/useTimeClock';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import { from } from '@/integrations/db/client';

interface TimeRecord {
  id: string;
  user_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
  break_start: string | null;
  break_end: string | null;
  total_hours: unknown;
  status: string;
  location: string | null;
}

export function TimeSheetManager() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [monthlyRecords, setMonthlyRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { users } = useUsers();
  const { user, isAdmin } = useAuth();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // Grid de calendário completo (6 semanas)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Domingo = 0
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const fetchMonthlyRecords = async () => {
    if (!selectedUser) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('time_clock')
        .select('*')
        .execute().eq('user_id', selectedUser)
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (error) throw error;
      setMonthlyRecords(data || []);
    } catch (error) {
      console.error('Erro ao buscar registros:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUser) {
      fetchMonthlyRecords();
    }
  }, [selectedUser, currentDate]);

  useEffect(() => {
    if (user && !selectedUser) {
      setSelectedUser(user.id);
    }
  }, [user, selectedUser]);

  const getRecordForDay = (date: Date) => {
    return monthlyRecords.find(record => {
      // Ensure we're comparing dates correctly by normalizing time zones
      const recordDate = new Date(record.date + 'T00:00:00');
      const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return recordDate.getTime() === targetDate.getTime();
    });
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--:--';
    return format(new Date(timeString), 'HH:mm');
  };

  const calculateTotalHours = (record: TimeRecord | undefined) => {
    if (!record?.clock_in || !record?.clock_out) return '0h 0m';
    
    const clockIn = new Date(record.clock_in);
    const clockOut = new Date(record.clock_out);
    
    let totalMinutes = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60);
    
    // Subtrair tempo de almoço
    if (record.lunch_start && record.lunch_end) {
      const lunchStart = new Date(record.lunch_start);
      const lunchEnd = new Date(record.lunch_end);
      const lunchMinutes = (lunchEnd.getTime() - lunchStart.getTime()) / (1000 * 60);
      totalMinutes -= lunchMinutes;
    }
    
    // Subtrair tempo de pausa
    if (record.break_start && record.break_end) {
      const breakStart = new Date(record.break_start);
      const breakEnd = new Date(record.break_end);
      const breakMinutes = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60);
      totalMinutes -= breakMinutes;
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    
    return `${hours}h ${minutes}m`;
  };

  const getStatusBadge = (date: Date, record: TimeRecord | undefined) => {
    if (isSunday(date)) {
      return <Badge variant="secondary" className="text-xs">Descanso</Badge>;
    }
    
    if (!record && isSameMonth(date, currentDate)) {
      return <Badge variant="destructive" className="text-xs">Falta</Badge>;
    }
    
    if (!record) {
      return null; // Não mostrar badge para dias de outros meses
    }
    
    if (record.clock_in && record.clock_out) {
      return <Badge variant="default" className="text-xs bg-green-500">Completo</Badge>;
    }
    
    if (record.clock_in && !record.clock_out) {
      return <Badge variant="default" className="text-xs bg-yellow-500">Em andamento</Badge>;
    }
    
    return <Badge variant="secondary" className="text-xs">Parcial</Badge>;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  return (
    <div className="space-y-4 md:space-y-6 px-1 md:px-0">
      <Card className="border-2 border-gray-300 shadow-sm">
        <CardHeader className="pb-3 pt-3 md:pt-6 px-3 md:px-6 border-b-2 border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-xl">
              <div className="p-1.5 md:p-2 rounded-lg bg-gradient-to-br from-indigo-100 to-white border-2 border-gray-200">
                <Clock className="h-4 w-4 md:h-5 md:w-5 text-indigo-600" />
              </div>
              Espelho de Ponto
            </CardTitle>
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4">
              {isAdmin && (
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="w-full md:w-48 h-9 md:h-10 text-base md:text-sm border-2 border-gray-300">
                    <SelectValue placeholder="Selecionar usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {user.display_name || 'Usuário'}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <div className="flex items-center justify-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigateMonth('prev')}
                  className="h-9 w-9 border-2 border-gray-300"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium min-w-[120px] md:min-w-32 text-center text-sm md:text-base">
                  {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigateMonth('next')}
                  className="h-9 w-9 border-2 border-gray-300"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-3 md:p-6">
          {loading ? (
            <div className="text-center py-8 text-sm md:text-base text-muted-foreground">Carregando registros...</div>
          ) : (
            <div className="grid grid-cols-7 gap-1.5 md:gap-2">
              {/* Headers dos dias da semana */}
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div 
                  key={day} 
                  className="p-1.5 md:p-2 text-center font-semibold text-[10px] md:text-sm bg-gray-100 border-2 border-gray-300 rounded"
                >
                  {day}
                </div>
              ))}
              
              {/* Dias do calendário */}
              {calendarDays.map(date => {
                const record = getRecordForDay(date);
                const isToday = isSameDay(date, new Date());
                const isSundayDay = isSunday(date);
                const isCurrentMonth = isSameMonth(date, currentDate);
                
                return (
                  <Card 
                    key={date.toISOString()} 
                    className={`p-2 md:p-3 min-h-[80px] md:min-h-24 border-2 ${isToday ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-300'} ${isSundayDay ? 'bg-gray-50' : ''} ${!isCurrentMonth ? 'opacity-30' : ''} shadow-sm`}
                  >
                    <div className="space-y-1.5 md:space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs md:text-sm font-semibold">
                          {format(date, 'dd')}
                        </span>
                        {getStatusBadge(date, record)}
                      </div>
                      
                      {!isSundayDay && record && isCurrentMonth && (
                        <div className="space-y-1 text-[10px] md:text-xs">
                          <div className="flex justify-between">
                            <span>Entrada:</span>
                            <span className="font-mono">{formatTime(record.clock_in)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Saída:</span>
                            <span className="font-mono">{formatTime(record.clock_out)}</span>
                          </div>
                          {record.lunch_start && record.lunch_end && (
                            <div className="flex justify-between text-muted-foreground">
                              <span>Almoço:</span>
                              <span className="font-mono text-[9px] md:text-xs">
                                {formatTime(record.lunch_start)}-{formatTime(record.lunch_end)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between font-medium pt-1 border-t border-gray-200">
                            <span>Total:</span>
                            <span className="font-mono">{calculateTotalHours(record)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}