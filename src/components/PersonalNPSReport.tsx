import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, TrendingUp, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
    
    console.log('NPS Debug - fetching responses for user:', user.id);
    console.log('NPS Debug - date range:', format(monthStart, 'yyyy-MM-dd'), 'to', format(monthEnd, 'yyyy-MM-dd'));
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('nps_responses')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (error) {
        console.error('NPS Debug - query error:', error);
        throw error;
      }
      
      console.log('NPS Debug - fetched data:', data);
      setMonthlyResponses(data || []);
    } catch (error) {
      console.error('Erro ao buscar respostas NPS:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyResponses();
  }, [currentDate, user]);

  const getResponseForDay = (date: Date) => {
    return monthlyResponses.find(response => 
      isSameDay(new Date(response.date), date)
    );
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
    if (monthlyResponses.length === 0) return { satisfaction: 0, recommendation: 0 };
    
    // Log para debug
    console.log('NPS Debug - monthlyResponses:', monthlyResponses);
    
    const totalSatisfaction = monthlyResponses.reduce((sum, response) => {
      const satisfaction = response.responses?.satisfaction || 0;
      console.log('NPS Debug - satisfaction score:', satisfaction);
      return sum + satisfaction;
    }, 0);
    
    const totalRecommendation = monthlyResponses.reduce((sum, response) => {
      const recommendation = response.responses?.recommendation || 0;
      console.log('NPS Debug - recommendation score:', recommendation);
      return sum + recommendation;
    }, 0);
    
    return {
      satisfaction: Math.round((totalSatisfaction / monthlyResponses.length) * 10) / 10,
      recommendation: Math.round((totalRecommendation / monthlyResponses.length) * 10) / 10
    };
  };

  const chartData = monthlyResponses.map(response => ({
    date: format(new Date(response.date), 'dd/MM'),
    satisfaction: response.responses.satisfaction,
    recommendation: response.responses.recommendation
  }));

  const averages = calculateAverageScores();

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Meu Relatório NPS
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-32 text-center">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Respostas no Mês</p>
                <p className="text-2xl font-bold">{monthlyResponses.length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Satisfação Média</p>
                <p className="text-2xl font-bold">{averages.satisfaction}</p>
              </div>
              <div className={`w-3 h-3 rounded-full ${getScoreColor(averages.satisfaction)}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Recomendação Média</p>
                <p className="text-2xl font-bold">{averages.recommendation}</p>
              </div>
              <div className={`w-3 h-3 rounded-full ${getScoreColor(averages.recommendation)}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evolução das Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="satisfaction" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Satisfação"
                />
                <Line 
                  type="monotone" 
                  dataKey="recommendation" 
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={2}
                  name="Recomendação"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Calendar View */}
      <Card>
        <CardHeader>
          <CardTitle>Calendário de Respostas</CardTitle>
        </CardHeader>
        
        <CardContent>
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
                      
                      {response && isCurrentMonth && (
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${getScoreColor(response.responses.satisfaction)}`} />
                            <span>S: {response.responses.satisfaction}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${getScoreColor(response.responses.recommendation)}`} />
                            <span>R: {response.responses.recommendation}</span>
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