import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProcesses } from '@/hooks/useProcesses';
import { useCategories } from '@/hooks/useCategories';
import { ProcessCard } from '@/components/ProcessCard';
import { CategoryManager } from '@/components/CategoryManager';
import { ModernLayout } from '@/components/ModernLayout';
import { TaskManager } from '@/components/TaskManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Filter, Settings, Shield, Users, LogOut, Target, BarChart3, Activity, TrendingUp, CheckCircle, FileText, Folder, CheckSquare, Clock, AlertTriangle } from 'lucide-react';
import { Dashboard } from '@/components/Dashboard';
import { from } from '@/integrations/db/client';
import { Process } from '@/types/process';
import { useTasks } from '@/hooks/useTasks';

const DashboardGestao = () => {
  const navigate = useNavigate();
  const { user, profile, isAdmin, isApproved, signOut } = useAuth();
  const { processes, loading: processesLoading, createProcess } = useProcesses();
  const { categories, loading: categoriesLoading } = useCategories();
  const { tasks } = useTasks();
  
  const [showProcessForm, setShowProcessForm] = useState(false);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const [stats, setStats] = useState({
    totalProcesses: 0,
    activeProcesses: 0,
    totalUsers: 0,
    totalCategories: 0,
    totalTasks: 0,
    tasksInProgress: 0,
    tasksCompleted: 0,
    tasksDelayed: 0
  });

  // Calculate stats from tasks hook data
  useEffect(() => {
    const calculateStats = async () => {
      try {
        // Fetch processes count
        const { count: processesCount } = await supabase
          .from('processes')
          .select('*', { count: 'exact', head: true }).execute();
        
        const { count: activeProcessesCount } = await supabase
          .from('processes')
          .select('*', { count: 'exact', head: true })
          .execute().eq('status', 'active');
        
        const { count: usersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true }).execute();
        
        const { count: categoriesCount } = await supabase
          .from('categories')
          .select('*', { count: 'exact', head: true }).execute();

        setStats({
          totalProcesses: processesCount || 0,
          activeProcesses: activeProcessesCount || 0,
          totalUsers: usersCount || 0,
          totalCategories: categoriesCount || 0,
          totalTasks: tasks.length,
          tasksInProgress: tasks.filter(t => t.status === 'in_progress').length,
          tasksCompleted: tasks.filter(t => t.status === 'completed').length,
          tasksDelayed: tasks.filter(t => t.status === 'delayed').length,
        });
      } catch (error) {
        console.error('Error calculating stats:', error);
      }
    };

    calculateStats();
  }, [tasks]);

  const filteredProcesses = useMemo(() => {
    let filtered = processes;

    if (searchTerm) {
      filtered = filtered.filter(process =>
        process.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        process.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(process => process.category_id === selectedCategory);
    }

    return filtered;
  }, [processes, searchTerm, selectedCategory]);

  return (
    <ModernLayout 
      title="Dashboard de Gestão" 
      subtitle="OS, Tarefas, Processos e Agendamentos"
    >
      <div className="space-y-6">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTasks}</div>
              <p className="text-xs text-muted-foreground">
                {stats.tasksInProgress} em andamento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processos Ativos</CardTitle>
              <Folder className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeProcesses}</div>
              <p className="text-xs text-muted-foreground">
                de {stats.totalProcesses} processos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tarefas Concluídas</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.tasksCompleted}</div>
              <p className="text-xs text-muted-foreground">
                {stats.tasksDelayed > 0 && `${stats.tasksDelayed} atrasadas`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categorias</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCategories}</div>
              <p className="text-xs text-muted-foreground">
                Organizando processos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs para Tarefas e Processos */}
        <Tabs defaultValue="tarefas" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
            <TabsTrigger value="processos">Processos</TabsTrigger>
            <TabsTrigger value="calendario">Calendário</TabsTrigger>
          </TabsList>

          <TabsContent value="tarefas" className="space-y-4">
            <TaskManager />
          </TabsContent>

          <TabsContent value="processos" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar processos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => setShowProcessForm(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Processo
              </Button>
            </div>

            {filteredProcesses.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Folder className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? 'Nenhum processo encontrado' : 'Nenhum processo cadastrado'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProcesses.map((process) => (
                  <ProcessCard
                    key={process.id}
                    process={process}
                    onEdit={() => {
                      setEditingProcess(process);
                      setShowProcessForm(true);
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendario" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Agendamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Visualização de calendário e agendamentos em breve.
                </p>
                <Button onClick={() => navigate('/calendario')} className="mt-4">
                  Abrir Calendário Completo
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ModernLayout>
  );
};

export default DashboardGestao;

