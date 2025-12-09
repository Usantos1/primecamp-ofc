import { useState, useEffect, useMemo } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  CheckSquare, 
  Target,
  GraduationCap,
  Brain,
  FileText,
  Download,
  Calendar,
  Filter,
  Award,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { jsPDF } from 'jspdf';
import { useToast } from '@/hooks/use-toast';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Reports() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [tasksData, setTasksData] = useState<any>(null);
  const [trainingsData, setTrainingsData] = useState<any>(null);
  const [discData, setDiscData] = useState<any>(null);
  const [processesData, setProcessesData] = useState<any>(null);
  const [usersData, setUsersData] = useState<any>(null);

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return null;
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchAllData();
  }, [user, dateRange]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const dateFilter = getDateFilter();
      
      // Fetch Tasks Data
      let tasksQuery = supabase
        .from('tasks')
        .select('id, status, deadline, created_at, responsible_user_id, process_id');
      
      if (dateFilter) {
        tasksQuery = tasksQuery.gte('created_at', dateFilter);
      }

      const { data: tasks } = await tasksQuery;

      // Fetch Trainings Data
      let trainingsQuery = supabase
        .from('training_assignments')
        .select('id, status, progress, completed_at, training_id, user_id, training:trainings(title, department)');
      
      if (dateFilter) {
        trainingsQuery = trainingsQuery.gte('assigned_at', dateFilter);
      }

      const { data: trainings } = await trainingsQuery;

      // Fetch DISC Data
      const { data: discResults } = await supabase
        .from('disc_responses')
        .select('id, dominant, d, i, s, c, created_at, user_id')
        .order('created_at', { ascending: false });

      // Fetch Processes Data
      const { data: processes } = await supabase
        .from('processes')
        .select('id, name, status, department, created_at');

      // Fetch Users Data
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, department, role, approved, created_at');

      // Process Tasks Data
      const tasksByStatus = tasks?.reduce((acc: any, task: any) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {}) || {};

      const tasksByDay = tasks?.reduce((acc: any, task: any) => {
        const date = new Date(task.created_at).toLocaleDateString('pt-BR');
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {}) || {};

      // Process Trainings Data
      const trainingsByStatus = trainings?.reduce((acc: any, training: any) => {
        acc[training.status] = (acc[training.status] || 0) + 1;
        return acc;
      }, {}) || {};

      const trainingsByDepartment = trainings?.reduce((acc: any, training: any) => {
        const dept = training.training?.department || 'Sem departamento';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {}) || {};

      // Process DISC Data
      const discByProfile = discResults?.reduce((acc: any, result: any) => {
        acc[result.dominant] = (acc[result.dominant] || 0) + 1;
        return acc;
      }, {}) || {};

      // Process Processes Data
      const processesByStatus = processes?.reduce((acc: any, process: any) => {
        acc[process.status] = (acc[process.status] || 0) + 1;
        return acc;
      }, {}) || {};

      const processesByDepartment = processes?.reduce((acc: any, process: any) => {
        const dept = process.department || 'Sem departamento';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {}) || {};

      // Process Users Data
      const usersByDepartment = profiles?.reduce((acc: any, profile: any) => {
        const dept = profile.department || 'Sem departamento';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {}) || {};

      setTasksData({
        total: tasks?.length || 0,
        byStatus: tasksByStatus,
        byDay: Object.entries(tasksByDay).map(([date, count]) => ({ date, count })),
        completed: tasks?.filter((t: any) => t.status === 'completed').length || 0,
        pending: tasks?.filter((t: any) => t.status === 'pending').length || 0,
        delayed: tasks?.filter((t: any) => t.status === 'delayed').length || 0,
        inProgress: tasks?.filter((t: any) => t.status === 'in_progress').length || 0
      });

      setTrainingsData({
        total: trainings?.length || 0,
        byStatus: trainingsByStatus,
        byDepartment: Object.entries(trainingsByDepartment).map(([name, value]) => ({ name, value })),
        completed: trainings?.filter((t: any) => t.status === 'completed').length || 0,
        inProgress: trainings?.filter((t: any) => t.status === 'in_progress').length || 0,
        averageProgress: trainings?.length > 0 
          ? Math.round(trainings.reduce((sum: number, t: any) => sum + (t.progress || 0), 0) / trainings.length)
          : 0
      });

      setDiscData({
        total: discResults?.length || 0,
        byProfile: Object.entries(discByProfile).map(([name, value]) => ({ name, value })),
        recent: discResults?.slice(0, 10) || []
      });

      setProcessesData({
        total: processes?.length || 0,
        byStatus: processesByStatus,
        byDepartment: Object.entries(processesByDepartment).map(([name, value]) => ({ name, value })),
        active: processes?.filter((p: any) => p.status === 'active').length || 0
      });

      setUsersData({
        total: profiles?.length || 0,
        active: profiles?.filter((p: any) => p.approved).length || 0,
        byDepartment: Object.entries(usersByDepartment).map(([name, value]) => ({ name, value })),
        byRole: {
          admin: profiles?.filter((p: any) => p.role === 'admin').length || 0,
          member: profiles?.filter((p: any) => p.role === 'member').length || 0
        }
      });

    } catch (error) {
      console.error('Error fetching reports data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados dos relatórios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Relatório PrimeCamp', 20, 20);
    doc.setFontSize(12);
    doc.text(`Período: ${dateRange === '7d' ? 'Últimos 7 dias' : dateRange === '30d' ? 'Últimos 30 dias' : dateRange === '90d' ? 'Últimos 90 dias' : 'Todo o período'}`, 20, 30);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 40);
    
    let yPos = 60;
    
    // Tasks Summary
    doc.setFontSize(14);
    doc.text('Resumo de Tarefas', 20, yPos);
    yPos += 10;
    doc.setFontSize(10);
    if (tasksData) {
      doc.text(`Total: ${tasksData.total}`, 20, yPos);
      yPos += 7;
      doc.text(`Concluídas: ${tasksData.completed}`, 20, yPos);
      yPos += 7;
      doc.text(`Pendentes: ${tasksData.pending}`, 20, yPos);
      yPos += 7;
      doc.text(`Atrasadas: ${tasksData.delayed}`, 20, yPos);
      yPos += 15;
    }

    // Trainings Summary
    doc.setFontSize(14);
    doc.text('Resumo de Treinamentos', 20, yPos);
    yPos += 10;
    doc.setFontSize(10);
    if (trainingsData) {
      doc.text(`Total: ${trainingsData.total}`, 20, yPos);
      yPos += 7;
      doc.text(`Concluídos: ${trainingsData.completed}`, 20, yPos);
      yPos += 7;
      doc.text(`Progresso médio: ${trainingsData.averageProgress}%`, 20, yPos);
      yPos += 15;
    }

    // Users Summary
    doc.setFontSize(14);
    doc.text('Resumo de Usuários', 20, yPos);
    yPos += 10;
    doc.setFontSize(10);
    if (usersData) {
      doc.text(`Total: ${usersData.total}`, 20, yPos);
      yPos += 7;
      doc.text(`Ativos: ${usersData.active}`, 20, yPos);
      yPos += 7;
      doc.text(`Administradores: ${usersData.byRole.admin}`, 20, yPos);
      yPos += 7;
      doc.text(`Membros: ${usersData.byRole.member}`, 20, yPos);
    }

    doc.save(`relatorio_primecamp_${new Date().toISOString().split('T')[0]}.pdf`);
    toast({
      title: "Sucesso",
      description: "Relatório exportado em PDF",
    });
  };

  const overviewStats = useMemo(() => {
    return {
      tasks: {
        total: tasksData?.total || 0,
        completed: tasksData?.completed || 0,
        completionRate: tasksData?.total > 0 
          ? Math.round((tasksData.completed / tasksData.total) * 100) 
          : 0
      },
      trainings: {
        total: trainingsData?.total || 0,
        completed: trainingsData?.completed || 0,
        averageProgress: trainingsData?.averageProgress || 0
      },
      users: {
        total: usersData?.total || 0,
        active: usersData?.active || 0,
        activeRate: usersData?.total > 0 
          ? Math.round((usersData.active / usersData.total) * 100) 
          : 0
      },
      processes: {
        total: processesData?.total || 0,
        active: processesData?.active || 0,
        activeRate: processesData?.total > 0 
          ? Math.round((processesData.active / processesData.total) * 100) 
          : 0
      }
    };
  }, [tasksData, trainingsData, usersData, processesData]);

  if (loading) {
    return (
      <ModernLayout title="Relatórios & Analytics">
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout
      title="Relatórios & Analytics"
      subtitle="Análises completas e métricas do sistema"
    >
      <div className="space-y-6">
        {/* Filtros e Ações */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-center gap-4">
            <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="all">Todo o período</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={exportToPDF} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Tarefas</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {overviewStats.tasks.total}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {overviewStats.tasks.completionRate}% concluídas
                  </p>
                </div>
                <CheckSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Treinamentos</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {overviewStats.trainings.total}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {overviewStats.trainings.averageProgress}% progresso médio
                  </p>
                </div>
                <GraduationCap className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Usuários</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {overviewStats.users.active}
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    {overviewStats.users.activeRate}% ativos
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Processos</p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                    {overviewStats.processes.active}
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    {overviewStats.processes.activeRate}% ativos
                  </p>
                </div>
                <Target className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs de Relatórios */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="tasks">Tarefas</TabsTrigger>
            <TabsTrigger value="trainings">Treinamentos</TabsTrigger>
            <TabsTrigger value="disc">DISC</TabsTrigger>
            <TabsTrigger value="processes">Processos</TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tarefas por Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5" />
                    Tarefas por Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tasksData?.byStatus && Object.keys(tasksData.byStatus).length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={Object.entries(tasksData.byStatus).map(([name, value]) => ({ name, value }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.entries(tasksData.byStatus).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum dado disponível</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Treinamentos por Departamento */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Treinamentos por Departamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {trainingsData?.byDepartment && trainingsData.byDepartment.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={trainingsData.byDepartment}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum dado disponível</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Usuários por Departamento */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Usuários por Departamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {usersData?.byDepartment && usersData.byDepartment.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={usersData.byDepartment}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum dado disponível</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Processos por Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Processos por Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {processesData?.byStatus && Object.keys(processesData.byStatus).length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={Object.entries(processesData.byStatus).map(([name, value]) => ({ name, value }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.entries(processesData.byStatus).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum dado disponível</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Relatório de Tarefas */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tarefas por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {tasksData?.byStatus && Object.keys(tasksData.byStatus).length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={Object.entries(tasksData.byStatus).map(([name, value]) => ({ name, value }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum dado disponível</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Evolução de Tarefas</CardTitle>
                </CardHeader>
                <CardContent>
                  {tasksData?.byDay && tasksData.byDay.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={tasksData.byDay}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum dado disponível</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Métricas de Tarefas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{tasksData?.total || 0}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{tasksData?.completed || 0}</p>
                    <p className="text-sm text-muted-foreground">Concluídas</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{tasksData?.pending || 0}</p>
                    <p className="text-sm text-muted-foreground">Pendentes</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{tasksData?.delayed || 0}</p>
                    <p className="text-sm text-muted-foreground">Atrasadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Relatório de Treinamentos */}
          <TabsContent value="trainings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Treinamentos por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {trainingsData?.byStatus && Object.keys(trainingsData.byStatus).length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={Object.entries(trainingsData.byStatus).map(([name, value]) => ({ name, value }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.entries(trainingsData.byStatus).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum dado disponível</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Treinamentos por Departamento</CardTitle>
                </CardHeader>
                <CardContent>
                  {trainingsData?.byDepartment && trainingsData.byDepartment.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={trainingsData.byDepartment}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum dado disponível</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Métricas de Treinamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{trainingsData?.total || 0}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{trainingsData?.completed || 0}</p>
                    <p className="text-sm text-muted-foreground">Concluídos</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{trainingsData?.inProgress || 0}</p>
                    <p className="text-sm text-muted-foreground">Em Progresso</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{trainingsData?.averageProgress || 0}%</p>
                    <p className="text-sm text-muted-foreground">Progresso Médio</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Relatório DISC */}
          <TabsContent value="disc" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Distribuição de Perfis DISC
                </CardTitle>
              </CardHeader>
              <CardContent>
                {discData?.byProfile && discData.byProfile.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={discData.byProfile}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8b5cf6">
                        {discData.byProfile.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum teste DISC realizado ainda</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estatísticas DISC</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-6">
                  <p className="text-3xl font-bold text-purple-600">{discData?.total || 0}</p>
                  <p className="text-sm text-muted-foreground mt-2">Total de Testes Realizados</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Relatório de Processos */}
          <TabsContent value="processes" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Processos por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {processesData?.byStatus && Object.keys(processesData.byStatus).length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={Object.entries(processesData.byStatus).map(([name, value]) => ({ name, value }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.entries(processesData.byStatus).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum dado disponível</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Processos por Departamento</CardTitle>
                </CardHeader>
                <CardContent>
                  {processesData?.byDepartment && processesData.byDepartment.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={processesData.byDepartment}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum dado disponível</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Métricas de Processos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{processesData?.total || 0}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{processesData?.active || 0}</p>
                    <p className="text-sm text-muted-foreground">Ativos</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {processesData?.total > 0 
                        ? Math.round((processesData.active / processesData.total) * 100) 
                        : 0}%
                    </p>
                    <p className="text-sm text-muted-foreground">Taxa de Atividade</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ModernLayout>
  );
}
