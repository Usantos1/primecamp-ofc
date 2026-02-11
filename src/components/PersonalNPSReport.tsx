import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, TrendingUp, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { from } from '@/integrations/db/client';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

interface NPSResponse {
  id: string;
  date: string;
  responses: any;
  created_at: string;
}

export function PersonalNPSReport() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthlyResponses, setMonthlyResponses] = useState<NPSResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // Grid de calendário completo - segunda a domingo
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const fetchMonthlyResponses = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await from('nps_responses')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: true })
        .execute();

      if (error) {
        console.error('[NPS] Erro na query:', error);
        throw error;
      }
      
      setMonthlyResponses(data || []);
    } catch (error) {
      console.error('[NPS] Erro ao buscar respostas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyResponses();
  }, [currentDate, user]);

  const getResponseForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return monthlyResponses.find(response => {
      const rDate = (response.date || '').toString().split('T')[0];
      return rDate === dateStr;
    });
  };

  /** Nota média a partir do objeto responses (chaves = question id, valores = nota) */
  const getScoreFromResponses = (responsesObj: Record<string, unknown> | null | undefined): number => {
    if (!responsesObj || typeof responsesObj !== 'object') return 0;
    const values = Object.values(responsesObj).filter(
      v => typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)))
    ).map(v => Number(v));
    if (values.length === 0) return 0;
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
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

  const getScoreColor = (score: number) => {
    if (score >= 9) return 'bg-green-500';
    if (score >= 7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const calculateAverageScores = () => {
    if (monthlyResponses.length === 0) return { average: 0 };
    const total = monthlyResponses.reduce((sum, response) => sum + getScoreFromResponses(response.responses), 0);
    return { average: Math.round((total / monthlyResponses.length) * 10) / 10 };
  };

  const chartData = monthlyResponses
    .slice()
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .map(response => ({
      date: format(new Date((response.date || '').toString().split('T')[0]), 'dd/MM'),
      nota: getScoreFromResponses(response.responses)
    }));

  const averages = calculateAverageScores();

  return (
    <div className="space-y-3">
      {/* Header compacto com navegação e estatísticas */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-2 md:p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Navegação do mês */}
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigateMonth('prev')}
                className="h-8 w-8 border border-gray-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-[100px] text-center text-sm">
                {format(currentDate, 'MMM yyyy', { locale: ptBR })}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigateMonth('next')}
                className="h-8 w-8 border border-gray-300"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Estatísticas inline */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="h-10 flex flex-col items-center justify-center px-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 min-w-[70px]">
                <span className="text-[9px] text-blue-600 dark:text-blue-400 font-medium">Respostas</span>
                <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{monthlyResponses.length}</span>
              </div>
              <div className="h-10 flex flex-col items-center justify-center px-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800 min-w-[70px]">
                <span className="text-[9px] text-green-600 dark:text-green-400 font-medium">Nota média</span>
                <span className="text-sm font-bold text-green-700 dark:text-green-300">{averages.average}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="border-2 border-gray-300 shadow-sm">
          <CardHeader className="pb-3 pt-3 md:pt-6 px-3 md:px-6 border-b-2 border-gray-200">
            <CardTitle className="text-base md:text-xl">Evolução das Notas</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
              <LineChart data={chartData}>
                <XAxis dataKey="date" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="nota" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Nota média"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Calendar View */}
      <Card className="border-2 border-gray-300 shadow-sm">
        <CardHeader className="pb-3 pt-3 md:pt-6 px-3 md:px-6 border-b-2 border-gray-200">
          <CardTitle className="text-base md:text-xl">Calendário de Respostas</CardTitle>
        </CardHeader>
        
        <CardContent className="p-3 md:p-6">
          {loading ? (
            <div className="text-center py-8">Carregando respostas...</div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {/* Headers dos dias da semana */}
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
                <div key={day} className="p-2 text-center font-medium text-sm bg-muted rounded">
                  {day}
                </div>
              ))}
              
              {/* Dias do calendário */}
              {calendarDays.map(date => {
                const response = getResponseForDay(date);
                const isToday = isSameDay(date, new Date());
                const isCurrentMonth = isSameMonth(date, currentDate);
                
                return (
                  <Card 
                    key={date.toISOString()} 
                    className={`p-2 md:p-3 min-h-12 md:min-h-16 ${isToday ? 'ring-2 ring-primary' : ''} ${!isCurrentMonth ? 'opacity-30' : ''}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs md:text-sm font-medium">
                          {format(date, 'dd')}
                        </span>
                        {isCurrentMonth && (response ? (
                          <Badge variant="default" className="text-xs bg-green-500 px-1 py-0">
                            ✓
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            --
                          </Badge>
                        ))}
                      </div>
                      
                      {response && isCurrentMonth && (() => {
                        const score = getScoreFromResponses(response.responses);
                        return (
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${getScoreColor(score)}`} />
                              <span>Nota: {score}</span>
                            </div>
                          </div>
                        );
                      })()}
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