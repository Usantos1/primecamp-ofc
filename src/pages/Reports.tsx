import { useState, useEffect } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, Clock, Settings, ArrowUpRight, Calendar, CheckSquare, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ReportExporter } from '@/components/ReportExporter';
import { AlertsConfigModal } from '@/components/AlertsConfigModal';
import { ScheduledReportsModal } from '@/components/ScheduledReportsModal';

export default function Reports() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    tasks: { total: 0, completed: 0, delayed: 0 },
    processes: { total: 0, active: 0 },
    users: { total: 0, active: 0 },
    events: { total: 0, thisMonth: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Fetch real task statistics
        const { data: tasks } = await supabase
          .from('tasks')
          .select('status');
        
        const taskStats = {
          total: tasks?.length || 0,
          completed: tasks?.filter(t => t.status === 'completed').length || 0,
          delayed: tasks?.filter(t => t.status === 'delayed').length || 0
        };

        // Fetch real process statistics
        const { data: processes } = await supabase
          .from('processes')
          .select('status');
        
        const processStats = {
          total: processes?.length || 0,
          active: processes?.filter(p => p.status !== 'archived').length || 0
        };

        // Fetch real user statistics
        const { data: profiles } = await supabase
          .from('profiles')
          .select('approved, created_at');
        
        const userStats = {
          total: profiles?.length || 0,
          active: profiles?.filter(p => p.approved).length || 0
        };

        // Fetch real event statistics
        const thisMonth = new Date();
        thisMonth.setDate(1);
        const { data: events } = await supabase
          .from('calendar_events')
          .select('created_at')
          .gte('created_at', thisMonth.toISOString());
        
        const eventStats = {
          total: events?.length || 0,
          thisMonth: events?.length || 0
        };

        setStats({
          tasks: taskStats,
          processes: processStats,
          users: userStats,
          events: eventStats
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  return (
    <ModernLayout
      title="Relatórios & Analytics"
      subtitle="Análises completas e métricas do sistema"
    >
      <div className="space-y-6">
        {/* Dashboard de Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Tarefas Ativas</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {loading ? '...' : stats.tasks.total - stats.tasks.completed}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {stats.tasks.delayed} atrasadas
                  </p>
                </div>
                <CheckSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Processos</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {loading ? '...' : stats.processes.total}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {stats.processes.active} ativos
                  </p>
                </div>
                <Target className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Usuários Ativos</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {loading ? '...' : stats.users.active}
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {stats.users.total} total
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Eventos</p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                    {loading ? '...' : stats.events.thisMonth}
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Este mês
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Relatórios Disponíveis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Produtividade
                </CardTitle>
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  Ativo
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Análise completa de produtividade por equipe, departamento e usuário individual.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tarefas concluídas</span>
                  <span className="font-medium">{stats.tasks.completed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tarefas atrasadas</span>
                  <span className="font-medium text-red-600">{stats.tasks.delayed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de conclusão</span>
                  <span className="font-medium text-green-600">
                    {stats.tasks.total > 0 ? Math.round((stats.tasks.completed / stats.tasks.total) * 100) : 0}%
                  </span>
                </div>
              </div>
              <Button 
                className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
                onClick={() => navigate('/productivity')}
              >
                Ver Relatório Completo
                <ArrowUpRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-primary" />
                  Processos
                </CardTitle>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  Ativo
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Métricas de desempenho e otimização de processos organizacionais.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Processos ativos</span>
                  <span className="font-medium">{stats.processes.active}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total de processos</span>
                  <span className="font-medium">{stats.processes.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de atividade</span>
                  <span className="font-medium text-green-600">
                    {stats.processes.total > 0 ? Math.round((stats.processes.active / stats.processes.total) * 100) : 0}%
                  </span>
                </div>
              </div>
              <Button 
                className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
                onClick={() => navigate('/process-analytics')}
              >
                Analisar Processos
                <ArrowUpRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" />
                  Equipes
                </CardTitle>
                <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                  Ativo
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Performance e colaboração entre equipes e departamentos.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Membros ativos</span>
                  <span className="font-medium">{stats.users.active}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total de usuários</span>
                  <span className="font-medium">{stats.users.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de aprovação</span>
                  <span className="font-medium text-green-600">
                    {stats.users.total > 0 ? Math.round((stats.users.active / stats.users.total) * 100) : 0}%
                  </span>
                </div>
              </div>
              <Button 
                className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
                onClick={() => navigate('/usuarios')}
              >
                Relatório de Equipes
                <ArrowUpRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-primary" />
                  Tempo & Eficiência
                </CardTitle>
                <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                  Ativo
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Análise detalhada de tempo gasto e otimização de recursos.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Horas trabalhadas</span>
                  <span className="font-medium">1,456h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tempo produtivo</span>
                  <span className="font-medium">89%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ROI médio</span>
                  <span className="font-medium text-green-600">+267%</span>
                </div>
              </div>
              <Button 
                className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
                onClick={() => navigate('/admin?tab=time-clock')}
              >
                Análise Temporal
                <ArrowUpRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  Agenda & Eventos
                </CardTitle>
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                  Ativo
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Relatórios de eventos, reuniões e planejamento de agenda.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Eventos este mês</span>
                  <span className="font-medium">{stats.events.thisMonth}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total de eventos</span>
                  <span className="font-medium">{stats.events.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Eventos ativos</span>
                  <span className="font-medium text-green-600">{stats.events.thisMonth}</span>
                </div>
              </div>
              <Button 
                className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
                onClick={() => navigate('/calendario')}
              >
                Relatório de Agenda
                <ArrowUpRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="h-5 w-5 text-primary" />
                  Personalizado
                </CardTitle>
                <Badge variant="outline" className="border-dashed">
                  Configurar
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Crie relatórios personalizados com métricas específicas do seu negócio.
              </p>
              <div className="text-center py-6">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Configure seus próprios KPIs</p>
              </div>
              <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary">
                Configurar Relatório
                <Settings className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Ações Rápidas */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ReportExporter />
              <AlertsConfigModal />
              <ScheduledReportsModal />
            </div>
          </CardContent>
        </Card>
      </div>
    </ModernLayout>
  );
}