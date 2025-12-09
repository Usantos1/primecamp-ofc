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
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Helper function to add section header
    const addSectionHeader = (title: string, y: number) => {
      doc.setFillColor(59, 130, 246); // Blue
      doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin + 5, y + 6);
      doc.setTextColor(0, 0, 0);
      return y + 12;
    };

    // Helper function to add metric box
    const addMetricBox = (label: string, value: string | number, x: number, y: number, width: number, color: number[]) => {
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(x, y, width, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(label, x + 5, y + 8);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(String(value), x + 5, y + 16);
      doc.setTextColor(0, 0, 0);
    };

    // Helper function to add table row
    const addTableRow = (label: string, value: string | number, y: number, isHeader: boolean = false) => {
      if (isHeader) {
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
      }
      doc.text(label, margin + 5, y + 6);
      doc.text(String(value), pageWidth - margin - 5, y + 6, { align: 'right' });
      return y + 8;
    };

    // Header with gradient effect
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    // White overlay for text area
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 35, pageWidth, 15, 'F');
    
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('PRIMECAMP', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(16);
    doc.text('Relatório & Analytics', pageWidth / 2, 30, { align: 'center' });
    
    // Period and date
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const periodText = dateRange === '7d' ? 'Últimos 7 dias' : 
                      dateRange === '30d' ? 'Últimos 30 dias' : 
                      dateRange === '90d' ? 'Últimos 90 dias' : 
                      'Todo o período';
    doc.text(`Período: ${periodText}`, margin, 42);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth - margin, 42, { align: 'right' });
    
    yPos = 60;

    // Overview Metrics - 4 boxes in a row
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Visão Geral', margin, yPos);
    yPos += 8;
    
    const boxWidth = (pageWidth - (margin * 2) - 15) / 4;
    const boxHeight = 25;
    
    addMetricBox('Tarefas', overviewStats.tasks.total, margin, yPos, boxWidth, [59, 130, 246]);
    addMetricBox('Treinamentos', overviewStats.trainings.total, margin + boxWidth + 5, yPos, boxWidth, [16, 185, 129]);
    addMetricBox('Usuários', overviewStats.users.active, margin + (boxWidth + 5) * 2, yPos, boxWidth, [139, 92, 246]);
    addMetricBox('Processos', overviewStats.processes.active, margin + (boxWidth + 5) * 3, yPos, boxWidth, [245, 158, 11]);
    
    yPos += boxHeight + 15;

    // Tasks Section
    if (tasksData) {
      yPos = addSectionHeader('📋 RESUMO DE TAREFAS', yPos);
      
      // Metrics boxes
      const taskBoxWidth = (pageWidth - (margin * 2) - 15) / 4;
      addMetricBox('Total', tasksData.total, margin, yPos, taskBoxWidth, [59, 130, 246]);
      addMetricBox('Concluídas', tasksData.completed, margin + taskBoxWidth + 5, yPos, taskBoxWidth, [16, 185, 129]);
      addMetricBox('Pendentes', tasksData.pending, margin + (taskBoxWidth + 5) * 2, yPos, taskBoxWidth, [245, 158, 11]);
      addMetricBox('Atrasadas', tasksData.delayed, margin + (taskBoxWidth + 5) * 3, yPos, taskBoxWidth, [239, 68, 68]);
      yPos += 30;

      // Tasks by Status Table
      if (tasksData.byStatus && Object.keys(tasksData.byStatus).length > 0) {
        yPos = addTableRow('Status', 'Quantidade', yPos, true);
        Object.entries(tasksData.byStatus).forEach(([status, count]: [string, any]) => {
          if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = margin;
          }
          yPos = addTableRow(status, count, yPos);
        });
        yPos += 10;
      }

      // Completion Rate
      const completionRate = tasksData.total > 0 
        ? Math.round((tasksData.completed / tasksData.total) * 100) 
        : 0;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Taxa de Conclusão: ${completionRate}%`, margin, yPos);
      yPos += 8;
      
      // Progress bar
      doc.setFillColor(229, 231, 235);
      doc.rect(margin, yPos, pageWidth - (margin * 2), 6, 'F');
      doc.setFillColor(16, 185, 129);
      doc.rect(margin, yPos, (pageWidth - (margin * 2)) * (completionRate / 100), 6, 'F');
      yPos += 15;
    }

    // Trainings Section
    if (trainingsData) {
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = margin;
      }
      
      yPos = addSectionHeader('🎓 RESUMO DE TREINAMENTOS', yPos);
      
      const trainingBoxWidth = (pageWidth - (margin * 2) - 10) / 3;
      addMetricBox('Total', trainingsData.total, margin, yPos, trainingBoxWidth, [16, 185, 129]);
      addMetricBox('Concluídos', trainingsData.completed, margin + trainingBoxWidth + 5, yPos, trainingBoxWidth, [16, 185, 129]);
      addMetricBox('Progresso Médio', `${trainingsData.averageProgress}%`, margin + (trainingBoxWidth + 5) * 2, yPos, trainingBoxWidth, [59, 130, 246]);
      yPos += 30;

      // Trainings by Status
      if (trainingsData.byStatus && Object.keys(trainingsData.byStatus).length > 0) {
        yPos = addTableRow('Status', 'Quantidade', yPos, true);
        Object.entries(trainingsData.byStatus).forEach(([status, count]: [string, any]) => {
          if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = margin;
          }
          yPos = addTableRow(status, count, yPos);
        });
        yPos += 10;
      }

      // Trainings by Department
      if (trainingsData.byDepartment && trainingsData.byDepartment.length > 0) {
        if (yPos > pageHeight - 50) {
          doc.addPage();
          yPos = margin;
        }
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Por Departamento:', margin, yPos);
        yPos += 8;
        yPos = addTableRow('Departamento', 'Quantidade', yPos, true);
        trainingsData.byDepartment.forEach((dept: any) => {
          if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = margin;
          }
          yPos = addTableRow(dept.name, dept.value, yPos);
        });
        yPos += 10;
      }
    }

    // Users Section
    if (usersData) {
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = margin;
      }
      
      yPos = addSectionHeader('👥 RESUMO DE USUÁRIOS', yPos);
      
      const userBoxWidth = (pageWidth - (margin * 2) - 10) / 3;
      addMetricBox('Total', usersData.total, margin, yPos, userBoxWidth, [139, 92, 246]);
      addMetricBox('Ativos', usersData.active, margin + userBoxWidth + 5, yPos, userBoxWidth, [16, 185, 129]);
      const activeRate = usersData.total > 0 
        ? Math.round((usersData.active / usersData.total) * 100) 
        : 0;
      addMetricBox('Taxa Ativos', `${activeRate}%`, margin + (userBoxWidth + 5) * 2, yPos, userBoxWidth, [59, 130, 246]);
      yPos += 30;

      // Users by Role
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Por Função:', margin, yPos);
      yPos += 8;
      yPos = addTableRow('Função', 'Quantidade', yPos, true);
      yPos = addTableRow('Administradores', usersData.byRole.admin, yPos);
      yPos = addTableRow('Membros', usersData.byRole.member, yPos);
      yPos += 10;

      // Users by Department
      if (usersData.byDepartment && usersData.byDepartment.length > 0) {
        if (yPos > pageHeight - 50) {
          doc.addPage();
          yPos = margin;
        }
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Por Departamento:', margin, yPos);
        yPos += 8;
        yPos = addTableRow('Departamento', 'Quantidade', yPos, true);
        usersData.byDepartment.forEach((dept: any) => {
          if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = margin;
          }
          yPos = addTableRow(dept.name, dept.value, yPos);
        });
      }
    }

    // Processes Section
    if (processesData) {
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = margin;
      }
      
      yPos = addSectionHeader('🎯 RESUMO DE PROCESSOS', yPos);
      
      const processBoxWidth = (pageWidth - (margin * 2) - 10) / 3;
      addMetricBox('Total', processesData.total, margin, yPos, processBoxWidth, [245, 158, 11]);
      addMetricBox('Ativos', processesData.active, margin + processBoxWidth + 5, yPos, processBoxWidth, [16, 185, 129]);
      const processActiveRate = processesData.total > 0 
        ? Math.round((processesData.active / processesData.total) * 100) 
        : 0;
      addMetricBox('Taxa Ativos', `${processActiveRate}%`, margin + (processBoxWidth + 5) * 2, yPos, processBoxWidth, [59, 130, 246]);
      yPos += 30;

      // Processes by Status
      if (processesData.byStatus && Object.keys(processesData.byStatus).length > 0) {
        yPos = addTableRow('Status', 'Quantidade', yPos, true);
        Object.entries(processesData.byStatus).forEach(([status, count]: [string, any]) => {
          if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = margin;
          }
          yPos = addTableRow(status, count, yPos);
        });
      }
    }

    // DISC Section
    if (discData && discData.total > 0) {
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = margin;
      }
      
      yPos = addSectionHeader('🧠 RESUMO DISC', yPos);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total de Testes Realizados: ${discData.total}`, margin, yPos);
      yPos += 10;

      if (discData.byProfile && discData.byProfile.length > 0) {
        yPos = addTableRow('Perfil', 'Quantidade', yPos, true);
        discData.byProfile.forEach((profile: any) => {
          if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = margin;
          }
          yPos = addTableRow(profile.name, profile.value, yPos);
        });
      }
    }

    // Footer on all pages
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      doc.text('PrimeCamp - Sistema de Gestão Empresarial', margin, pageHeight - 10);
    }

    const fileName = `Relatorio_PrimeCamp_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    toast({
      title: "Sucesso",
      description: "Relatório exportado em PDF com sucesso!",
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
