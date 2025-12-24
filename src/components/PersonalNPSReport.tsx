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
    
    console.log('NPS Debug - fetching responses for user:', user.id);
    console.log('NPS Debug - date range:', format(monthStart, 'yyyy-MM-dd'), 'to', format(monthEnd, 'yyyy-MM-dd'));
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('nps_responses')
        .select('*')
        .execute().eq('user_id', user.id)
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
    <div className="space-y-4 md:space-y-6 px-1 md:px-0">
      {/* Header with Navigation */}
      <Card className="border-2 border-gray-300 shadow-sm">
        <CardHeader className="pb-3 pt-3 md:pt-6 px-3 md:px-6 border-b-2 border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-xl">
              <div className="p-1.5 md:p-2 rounded-lg bg-gradient-to-br from-green-100 to-white border-2 border-gray-200">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
              </div>
              Meu Relatório NPS
            </CardTitle>
            
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
        </CardHeader>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <Card className="border-2 border-gray-300 border-l-4 border-l-blue-500 shadow-sm bg-blue-50/50 md:bg-transparent">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-sm font-medium text-blue-700 md:text-muted-foreground">Respostas no Mês</p>
                <p className="text-base md:text-2xl font-bold text-blue-700 md:text-foreground">{monthlyResponses.length}</p>
              </div>
              <BarChart3 className="h-3 w-3 md:h-8 md:w-8 text-blue-600 md:text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-300 border-l-4 border-l-green-500 shadow-sm bg-green-50/50 md:bg-transparent">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-sm font-medium text-green-700 md:text-muted-foreground">Satisfação Média</p>
                <p className="text-base md:text-2xl font-bold text-green-700 md:text-foreground">{averages.satisfaction}</p>
              </div>
              <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-gray-200 ${getScoreColor(averages.satisfaction)}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-300 border-l-4 border-l-purple-500 shadow-sm bg-purple-50/50 md:bg-transparent">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-sm font-medium text-purple-700 md:text-muted-foreground">Recomendação Média</p>
                <p className="text-base md:text-2xl font-bold text-purple-700 md:text-foreground">{averages.recommendation}</p>
              </div>
              <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-gray-200 ${getScoreColor(averages.recommendation)}`} />
            </div>
          </CardContent>
        </Card>
      </div>

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