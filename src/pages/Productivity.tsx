import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Clock, Target, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { from } from '@/integrations/db/client';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import { format, subDays } from 'date-fns';

export default function Productivity() {
  const [loading, setLoading] = useState(true);
  const [productivityData, setProductivityData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    averageTime: 0,
    efficiency: 0
  });

  useEffect(() => {
    fetchProductivityData();
  }, []);

  const fetchProductivityData = async () => {
    try {
      setLoading(true);
      
      // Fetch tasks from last 30 days
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
       .execute() .gte('created_at', format(subDays(new Date(), 30), 'yyyy-MM-dd'));

      // Process data for charts
      const tasksByDate = (tasks || []).reduce((acc, task) => {
        const date = format(new Date(task.created_at), 'dd/MM');
        if (!acc[date]) {
          acc[date] = { date, created: 0, completed: 0 };
        }
        acc[date].created++;
        if (task.status === 'completed') {
          acc[date].completed++;
        }
        return acc;
      }, {} as Record<string, any>);

      const chartData = Object.values(tasksByDate);
      
      // Calculate stats
      const totalTasks = tasks?.length || 0;
      const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
      const efficiency = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      setProductivityData(chartData);
      setStats({
        totalTasks,
        completedTasks,
        averageTime: 6.5, // Mock data
        efficiency
      });
    } catch (error) {
      console.error('Error fetching productivity data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ModernLayout title="Relatório de Produtividade" subtitle="Análise detalhada de performance da equipe">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32 bg-muted/20" />
            </Card>
          ))}
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout title="Relatório de Produtividade" subtitle="Análise detalhada de performance da equipe">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTasks}</div>
              <p className="text-xs text-muted-foreground">últimos 30 dias</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tarefas Concluídas</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedTasks}</div>
              <p className="text-xs text-muted-foreground">de {stats.totalTasks} criadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageTime}h</div>
              <p className="text-xs text-muted-foreground">por tarefa</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eficiência</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.efficiency}%</div>
              <p className="text-xs text-muted-foreground">taxa de conclusão</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Produtividade por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productivityData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="created" fill="hsl(var(--primary))" name="Criadas" />
                  <Bar dataKey="completed" fill="hsl(var(--chart-2))" name="Concluídas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tendência de Conclusão</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={productivityData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="hsl(var(--chart-1))" 
                    strokeWidth={2}
                    name="Tarefas Concluídas"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </ModernLayout>
  );
}