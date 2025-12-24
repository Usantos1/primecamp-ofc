import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { from } from '@/integrations/db/client';
import { BarChart3, TrendingUp, Users, Target, Calendar, CheckCircle, Activity } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, subMonths, subYears, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface DashboardStats {
  totalNPSResponses: number;
  averageNPS: number;
  npsScore: number;
  totalGoals: number;
  completedGoals: number;
  tasksToday: number;
  activeProcesses: number;
}

interface NPSData {
  date: string;
  npsScore: number;
  promoters: number;
  detractors: number;
  neutrals: number;
  totalResponses: number;
  satisfaction: number;
  recommendation: number;
}

type NPSPeriod = '7d' | '30d' | '3m' | '1y';

interface GoalData {
  title: string;
  progress: number;
  target: number;
  current: number;
}

interface TaskData {
  date: string;
  completed: number;
  created: number;
}

export function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [npsPeriod, setNpsPeriod] = useState<NPSPeriod>('30d');
  const [stats, setStats] = useState<DashboardStats>({
    totalNPSResponses: 0,
    averageNPS: 0,
    npsScore: 0,
    totalGoals: 0,
    completedGoals: 0,
    tasksToday: 0,
    activeProcesses: 0
  });
  const [npsData, setNpsData] = useState<NPSData[]>([]);
  const [goalData, setGoalData] = useState<GoalData[]>([]);
  const [taskData, setTaskData] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, npsPeriod]);

  const getPeriodDate = (period: NPSPeriod): Date => {
    switch (period) {
      case '7d': return subDays(new Date(), 7);
      case '30d': return subDays(new Date(), 30);
      case '3m': return subMonths(new Date(), 3);
      case '1y': return subYears(new Date(), 1);
    }
  };

  const fetchDashboardData = async () => {
    if (!user || !profile) return;
    
    setLoading(true);
    try {
      // Fetch NPS data with period filter - include today's data
      const fromDate = getPeriodDate(npsPeriod);
      const toDate = new Date();
      // Format dates correctly to include today's data
      const fromDateStr = format(fromDate, 'yyyy-MM-dd');
      const toDateStr = format(toDate, 'yyyy-MM-dd');
      
      console.log('Fetching NPS data from', fromDateStr, 'to', toDateStr);
      
      const { data: npsResponses } = await supabase
        .from('nps_responses')
        .select('*')
       .execute() .gte('date', fromDateStr)
        .lte('date', toDateStr)
        .order('date', { ascending: true });

      console.log('NPS responses found:', npsResponses?.length || 0);

      // Fetch goals data - by department or all if admin
      const isAdmin = profile.role === 'admin';
      let goalsQuery = from('goals').select('*').execute();
      
      if (!isAdmin && profile.department) {
        goalsQuery = goalsQuery.or(`user_id.eq.${user.id},department.eq.${profile.department}`);
      }
      
      const { data: goals } = await goalsQuery;

      // Fetch tasks data - user's tasks or department tasks if admin
      let tasksQuery = supabase
        .from('tasks')
        .select('*')
       .execute() .gte('created_at', format(subDays(new Date(), 30), 'yyyy-MM-dd'));
        
      if (!isAdmin) {
        tasksQuery = tasksQuery.eq('responsible_user_id', user.id);
      }
      
      const { data: tasks } = await tasksQuery;

      // Fetch processes for active processes count
      const { data: processes } = await supabase
        .from('processes')
        .select('*')
        .execute().eq('status', 'active');

      // Generate complete date range for the period (skip Sundays)
      const generateDateRange = (period: NPSPeriod): string[] => {
        const dates: string[] = [];
        const fromDate = startOfDay(getPeriodDate(period));
        const toDate = endOfDay(new Date());
        
        let currentDate = new Date(fromDate);
        while (currentDate <= toDate) {
          // Skip Sundays (getDay() returns 0 for Sunday)
          if (currentDate.getDay() !== 0) {
            if (period === '1y' || period === '3m') {
              // For longer periods, show monthly aggregation
              const monthKey = format(currentDate, 'MM/yyyy');
              if (!dates.includes(monthKey)) {
                dates.push(monthKey);
              }
              currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
            } else {
              // For shorter periods, show daily (skip Sundays)
              dates.push(format(currentDate, 'dd/MM'));
              currentDate.setDate(currentDate.getDate() + 1);
            }
          } else {
            // If it's Sunday, just skip to the next day
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
        return dates;
      };

      const dateRange = generateDateRange(npsPeriod);

      // Process NPS data with proper aggregation (filter out Sundays)
      const npsDataByDate = (npsResponses || []).reduce((acc, response) => {
        const responseDate = parseISO(response.date + 'T00:00:00');
        
        // Skip Sundays
        if (responseDate.getDay() === 0) {
          return acc;
        }
        
        let dateKey: string;
        if (npsPeriod === '1y' || npsPeriod === '3m') {
          dateKey = format(responseDate, 'MM/yyyy');
        } else {
          dateKey = format(responseDate, 'dd/MM');
        }
        
        const responses = response.responses as Record<string, any>;
        
        if (!acc[dateKey]) {
          acc[dateKey] = { 
            totalResponses: 0, 
            allQuestionsSum: 0,
            totalQuestions: 0,
            satisfactionSum: 0,
            recommendationSum: 0
          };
        }
        
        // Calculate average of all questions in the response
        const questionValues = Object.values(responses).filter(val => typeof val === 'number') as number[];
        const avgAllQuestions = questionValues.length > 0 
          ? questionValues.reduce((sum, val) => sum + val, 0) / questionValues.length 
          : 0;
        
        acc[dateKey].totalResponses++;
        acc[dateKey].allQuestionsSum += avgAllQuestions;
        acc[dateKey].totalQuestions += questionValues.length;
        acc[dateKey].satisfactionSum += responses?.satisfaction || 0;
        acc[dateKey].recommendationSum += responses?.recommendation || 0;
        
        return acc;
      }, {} as Record<string, { 
        totalResponses: number; 
        allQuestionsSum: number; 
        totalQuestions: number;
        satisfactionSum: number;
        recommendationSum: number;
      }>);

      // Create complete dataset with all dates in range (filter out days with no responses)
      const npsDataFormatted: NPSData[] = dateRange
        .map(date => {
          const data = npsDataByDate[date];
          
          if (data && data.totalResponses > 0) {
            const avgAllQuestions = data.allQuestionsSum / data.totalResponses;
            
            return {
              date,
              npsScore: Math.round(avgAllQuestions * 10) / 10,
              promoters: 0,
              detractors: 0, 
              neutrals: 0,
              totalResponses: data.totalResponses,
              satisfaction: data.satisfactionSum / data.totalResponses,
              recommendation: data.recommendationSum / data.totalResponses
            };
          }
          return null;
        })
        .filter(Boolean) as NPSData[]; // Remove null entries (days with no responses)

      // Process goals data
      const goalDataFormatted: GoalData[] = (goals || []).map(goal => ({
        title: goal.title,
        progress: Math.round((goal.current_value / goal.target_value) * 100),
        target: goal.target_value,
        current: goal.current_value
      }));

      // Process tasks data - group by date
      const tasksByDate = (tasks || []).reduce((acc, task) => {
        const date = format(new Date(task.created_at), 'dd/MM');
        if (!acc[date]) {
          acc[date] = { created: 0, completed: 0 };
        }
        acc[date].created++;
        if (task.status === 'completed') {
          acc[date].completed++;
        }
        return acc;
      }, {} as Record<string, { created: number; completed: number }>);

      const taskDataFormatted: TaskData[] = Object.entries(tasksByDate).map(([date, data]) => ({
        date,
        completed: data.completed,
        created: data.created
      }));

      // Calculate stats - overall average of all questions across all responses
      const totalResponses = npsDataFormatted.reduce((sum, item) => sum + item.totalResponses, 0);
      const totalNPSSum = npsDataFormatted.reduce((sum, item) => sum + (item.npsScore * item.totalResponses), 0);
      
      const overallNPS = totalResponses > 0 
        ? Math.round((totalNPSSum / totalResponses) * 10) / 10
        : 0;
        
      const avgSatisfaction = npsDataFormatted.length > 0 
        ? npsDataFormatted.reduce((sum, item) => sum + item.satisfaction, 0) / npsDataFormatted.length 
        : 0;

      const completedGoals = (goals || []).filter(goal => 
        goal.current_value >= goal.target_value
      ).length;

      const today = format(new Date(), 'yyyy-MM-dd');
      const tasksToday = (tasks || []).filter(task => 
        format(new Date(task.created_at), 'yyyy-MM-dd') === today
      ).length;

      setStats({
        totalNPSResponses: totalResponses,
        averageNPS: Math.round(avgSatisfaction * 10) / 10,
        npsScore: overallNPS,
        totalGoals: goals?.length || 0,
        completedGoals,
        tasksToday,
        activeProcesses: processes?.length || 0
      });

      setNpsData(npsDataFormatted);
      setGoalData(goalDataFormatted);
      setTaskData(taskDataFormatted);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const periodLabels = {
    '7d': '7 dias',
    '30d': '30 dias', 
    '3m': '3 meses',
    '1y': '1 ano'
  };

  const getNPSColor = (score: number) => {
    if (score >= 50) return 'text-green-600 dark:text-green-400';
    if (score >= 0) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-32 bg-muted/20" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
              NPS Score
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", getNPSColor(stats.npsScore))}>
              {stats.npsScore}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {stats.totalNPSResponses} respostas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
              Metas Concluídas
            </CardTitle>
            <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              {stats.completedGoals}/{stats.totalGoals}
            </div>
            <p className="text-xs text-green-600 dark:text-green-400">
              {Math.round((stats.completedGoals / Math.max(stats.totalGoals, 1)) * 100)}% completas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Tarefas Hoje
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {stats.tasksToday}
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400">
              tarefas criadas hoje
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
              Total de Usuários
            </CardTitle>
            <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
              {stats.activeProcesses}
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400">
              usuários cadastrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* NPS Chart with Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                NPS Geral da Empresa
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(periodLabels).map(([period, label]) => (
                  <Button
                    key={period}
                    size="sm"
                    variant={npsPeriod === period ? "default" : "outline"}
                    onClick={() => setNpsPeriod(period as NPSPeriod)}
                    className="text-xs"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {npsData.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {npsData.reduce((sum, item) => sum + item.totalResponses, 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total de Respostas</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {stats.npsScore}
                    </p>
                    <p className="text-xs text-muted-foreground">Média Geral</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={npsData}>
                    <XAxis dataKey="date" />
                    <YAxis domain={[1, 5]} />
                    <Tooltip 
                      formatter={(value, name) => [
                        `${value}`,
                        name === 'npsScore' ? 'Média das Perguntas' : name
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="npsScore" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      name="Média das Perguntas"
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-2">Nenhum dado de NPS disponível</p>
                  <Button onClick={() => navigate('/nps')} variant="outline" size="sm">
                    Ver NPS
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Progresso das Metas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {goalData.length > 0 ? (
              <div className="space-y-4">
                {goalData.slice(0, 5).map((goal, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium truncate">{goal.title}</span>
                      <Badge variant={goal.progress >= 100 ? "default" : "secondary"}>
                        {goal.progress}%
                      </Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${Math.min(goal.progress, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {goal.current} / {goal.target}
                    </div>
                  </div>
                ))}
                {goalData.length > 5 && (
                  <Button onClick={() => navigate('/goals')} variant="outline" size="sm" className="w-full">
                    Ver todas as metas
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <div className="text-center">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-2">Nenhuma meta definida</p>
                  <Button onClick={() => navigate('/goals')} variant="outline" size="sm">
                    Ver Metas
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tasks Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Tarefas - Últimos 30 dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {taskData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={taskData}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="created" fill="hsl(var(--primary))" name="Criadas" />
                <Bar dataKey="completed" fill="hsl(var(--secondary))" name="Concluídas" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">Nenhuma tarefa encontrada</p>
                <Button onClick={() => navigate('/tasks')} variant="outline" size="sm">
                  Ver Tarefas
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}