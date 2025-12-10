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
import { supabase } from '@/integrations/supabase/client';
import { Process } from '@/types/process';
import { useTasks } from '@/hooks/useTasks';

const Index = () => {
  const navigate = useNavigate();
  const { user, profile, isAdmin, isApproved, signOut } = useAuth();
  const { processes, loading: processesLoading, createProcess } = useProcesses();
  const { categories, loading: categoriesLoading } = useCategories();
  const { tasks } = useTasks();
  
  console.log('Index - Auth state:', { user: !!user, profile, isAdmin, isApproved });
  
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
          .select('*', { count: 'exact', head: true });

        // Fetch active processes count
        const { count: activeProcessesCount } = await supabase
          .from('processes')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        // Fetch users count
        const { count: usersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('approved', true);

        // Fetch categories count
        const { count: categoriesCount } = await supabase
          .from('categories')
          .select('*', { count: 'exact', head: true });

        // Calculate task stats from the tasks array
        const totalTasks = tasks.length;
        const tasksInProgress = tasks.filter(task => task.status === 'in_progress').length;
        const tasksCompleted = tasks.filter(task => task.status === 'completed').length;
        const tasksDelayed = tasks.filter(task => task.status === 'delayed').length;

        setStats({
          totalProcesses: processesCount || 0,
          activeProcesses: activeProcessesCount || 0,
          totalUsers: usersCount || 0,
          totalCategories: categoriesCount || 0,
          totalTasks,
          tasksInProgress,
          tasksCompleted,
          tasksDelayed
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    calculateStats();
  }, [tasks]);

  // Check URL for category filter or new process trigger
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    const hash = window.location.hash;
    
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
    
    if (hash === '#new-process' && isAdmin) {
      navigate('/processos/novo');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [isAdmin]);

  // Filtrar processos por busca e categoria
  const filteredProcesses = useMemo(() => {
    return processes.filter(process => {
      const matchesSearch = process.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           process.objective.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           process.owner.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || 
                             process.categoryId === selectedCategory ||
                             (!process.categoryId && selectedCategory === 'uncategorized');
      
      return matchesSearch && matchesCategory;
    });
  }, [processes, searchTerm, selectedCategory]);

  // Agrupar processos por categoria
  const processesByCategory = useMemo(() => {
    const grouped: { [key: string]: Process[] } = {};
    
    categories.forEach(category => {
      grouped[category.id] = filteredProcesses.filter(p => p.categoryId === category.id);
    });
    
    // Processos sem categoria
    grouped['uncategorized'] = filteredProcesses.filter(p => !p.categoryId);
    
    return grouped;
  }, [filteredProcesses, categories]);

  const handleViewProcess = (process: Process) => {
    navigate(`/processo/${process.id}`);
  };

  const handleEditProcess = (process: Process) => {
    // Redireciona para página de edição dedicada
    navigate(`/processo/${process.id}/edit`);
  };


  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Sistema de Processos</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Bem-vindo ao sistema de gestão de processos empresariais
            </p>
            <Button onClick={() => navigate('/login')} className="w-full">
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check approval status for non-admins or if not explicitly approved
  if (user && profile && !isApproved && !isAdmin) {
    navigate('/pending-approval');
    return null;
  }

  if (processesLoading || categoriesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <ModernLayout 
      title="Dashboard" 
      subtitle={`Bem-vindo, ${profile?.display_name || user.email}`}
      onSearch={setSearchTerm}
      headerActions={
        <div className="flex items-center gap-2">
          {profile && isAdmin && (
            <Badge variant="default" className="gap-1 bg-gradient-to-r from-primary to-primary-glow">
              <Shield className="h-3 w-3" />
              Admin
            </Badge>
          )}
          {profile && isAdmin && (
            <Button onClick={() => navigate('/admin')} variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Admin
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Tabs - Moved to top */}
        <Tabs defaultValue="dashboard" className="w-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-muted/50 backdrop-blur-sm">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="processes" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Target className="h-4 w-4 mr-2" />
                Processos
              </TabsTrigger>
              <TabsTrigger value="tasks" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <CheckCircle className="h-4 w-4 mr-2" />
                Tarefas
              </TabsTrigger>
            </TabsList>
            
            {profile && isAdmin && (
              <Button 
                onClick={() => navigate('/processos/novo')}
                className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90 shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Processo
              </Button>
            )}
          </div>
          
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Total de Processos
                  </CardTitle>
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalProcesses}</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                    Processos Ativos
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.activeProcesses}</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    Total de Usuários
                  </CardTitle>
                  <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.totalUsers}</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
                    Total de Categorias
                  </CardTitle>
                  <Folder className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.totalCategories}</div>
                </CardContent>
              </Card>
            </div>

            {/* Task Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950 dark:to-cyan-900 border-cyan-200 dark:border-cyan-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-cyan-700 dark:text-cyan-300">
                    Total de Tarefas
                  </CardTitle>
                  <CheckSquare className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-cyan-900 dark:text-cyan-100">{stats.totalTasks}</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 border-yellow-200 dark:border-yellow-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                    Em Andamento
                  </CardTitle>
                  <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{stats.tasksInProgress}</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    Concluídas
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{stats.tasksCompleted}</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">
                    Atrasadas
                  </CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-900 dark:text-red-100">{stats.tasksDelayed}</div>
                </CardContent>
              </Card>
            </div>

            <Dashboard />
          </TabsContent>
          
          <TabsContent value="processes" className="space-y-6">
            {/* Search and Filters */}
            <Card className="border-0 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Buscar processos por nome, objetivo ou responsável..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-background/50 border-border/50 focus:bg-background"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={selectedCategory === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory('all')}
                      className={selectedCategory === 'all' ? 'bg-gradient-to-r from-primary to-primary-glow' : ''}
                    >
                      Todos ({processes.length})
                    </Button>
                    {categories.map(category => (
                      <Button
                        key={category.id}
                        variant={selectedCategory === category.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory(category.id)}
                        className={selectedCategory === category.id ? 'bg-gradient-to-r from-primary to-primary-glow' : ''}
                      >
                        <span className="mr-1">{category.icon}</span>
                        {category.name} ({processesByCategory[category.id]?.length || 0})
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Processes by Category */}
            {selectedCategory === 'all' ? (
              <div className="space-y-8">
                {categories.map(category => {
                  const categoryProcesses = processesByCategory[category.id] || [];
                  if (categoryProcesses.length === 0) return null;
                  
                  return (
                    <div key={category.id}>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">{category.icon}</span>
                        <h2 className="text-xl font-semibold">{category.name}</h2>
                        <Badge variant="secondary">{categoryProcesses.length}</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {categoryProcesses.map((process) => (
                          <ProcessCard
                            key={process.id}
                            process={process}
                            onView={handleViewProcess}
                            onEdit={handleEditProcess}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                
                {/* Uncategorized processes */}
                {processesByCategory['uncategorized']?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">📁</span>
                      <h2 className="text-xl font-semibold">Sem Categoria</h2>
                      <Badge variant="secondary">{processesByCategory['uncategorized'].length}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {processesByCategory['uncategorized'].map((process) => (
                        <ProcessCard
                          key={process.id}
                          process={process}
                          onView={handleViewProcess}
                          onEdit={handleEditProcess}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProcesses.map((process) => (
                  <ProcessCard
                    key={process.id}
                    process={process}
                    onView={handleViewProcess}
                    onEdit={handleEditProcess}
                  />
                ))}
              </div>
            )}

            {filteredProcesses.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum processo encontrado</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm ? 'Nenhum processo encontrado para sua busca.' : 'Nenhum processo encontrado.'}
                  </p>
                  {!searchTerm && profile && isAdmin && (
                    <Button onClick={() => navigate('/processos/novo')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Processo
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="tasks">
            <TaskManager />
          </TabsContent>
        </Tabs>

      </div>
    </ModernLayout>
  );
};

export default Index;