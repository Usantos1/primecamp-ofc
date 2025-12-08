import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGoals } from '@/hooks/useGoals';
import { useUsers } from '@/hooks/useUsers';
import { useDepartments } from '@/hooks/useDepartments';
import { Target, Search, TrendingUp, Users, Calendar, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const AdminGoalsManager = () => {
  const { goals, loading } = useGoals();
  const { users } = useUsers();
  const { departments } = useDepartments();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      completed: 'secondary',
      paused: 'outline',
      cancelled: 'destructive'
    };
    
    const labels = {
      active: 'Ativa',
      completed: 'Concluída',
      paused: 'Pausada',
      cancelled: 'Cancelada'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] as any}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.display_name || 'Usuário';
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  // Filter goals based on search and filters
  const filteredGoals = goals.filter(goal => {
    const matchesSearch = 
      goal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getUserName(goal.user_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (goal.department && goal.department.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDepartment = filterDepartment === 'all' || goal.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || goal.status === filterStatus;

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    total: goals.length,
    active: goals.filter(g => g.status === 'active').length,
    completed: goals.filter(g => g.status === 'completed').length,
    averageProgress: goals.length > 0 
      ? goals.reduce((sum, goal) => sum + calculateProgress(goal.current_value, goal.target_value), 0) / goals.length 
      : 0
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Target className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total de Metas</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <TrendingUp className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Metas Ativas</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Trophy className="h-8 w-8 text-yellow-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-sm text-muted-foreground">Metas Concluídas</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Calendar className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{Math.round(stats.averageProgress)}%</p>
              <p className="text-sm text-muted-foreground">Progresso Médio</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Gerenciar Metas - Visão Administrativa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por usuário, título ou departamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Departamentos</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.name}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="completed">Concluídas</SelectItem>
                <SelectItem value="paused">Pausadas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Goals Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Meta</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGoals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma meta encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGoals.map((goal) => (
                    <TableRow key={goal.id}>
                      <TableCell>
                        <div className="font-medium">{getUserName(goal.user_id)}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{goal.title}</div>
                          {goal.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {goal.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{goal.department || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{goal.current_value}</span>
                            <span>{goal.target_value} {goal.unit}</span>
                          </div>
                          <Progress 
                            value={calculateProgress(goal.current_value, goal.target_value)} 
                            className="h-2"
                          />
                          <div className="text-xs text-muted-foreground">
                            {Math.round(calculateProgress(goal.current_value, goal.target_value))}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {goal.deadline ? (
                          <div className="text-sm">
                            {format(new Date(goal.deadline), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sem prazo</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(goal.status)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(goal.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};