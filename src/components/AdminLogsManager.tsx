import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserLogs } from '@/hooks/useUserLogs';
import { useUsers } from '@/hooks/useUsers';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Activity, Filter } from 'lucide-react';

export const AdminLogsManager = () => {
  const { logs, loading } = useUserLogs();
  const { users } = useUsers();
  const [searchTerm, setSearchTerm] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.display_name || 'Usuário desconhecido';
  };

  const getActivityBadge = (activityType: string) => {
    const getDisplayName = (type: string) => {
      const displayNames: { [key: string]: string } = {
        'create_process': 'Processo Criado',
        'update_process': 'Processo Atualizado', 
        'delete_process': 'Processo Excluído',
        'create_task': 'Tarefa Criada',
        'update_task': 'Tarefa Atualizada',
        'update_task_status': 'Status da Tarefa',
        'delete_task': 'Tarefa Excluída',
        'update_user': 'Usuário Atualizado',
        'time_clock': 'Ponto Eletrônico',
        'login': 'Login',
        'logout': 'Logout'
      };
      return displayNames[type] || type.replace('_', ' ').toUpperCase();
    };

    const getVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
      if (type.includes('delete')) return 'destructive';
      if (type.includes('create')) return 'default';
      if (type.includes('update')) return 'secondary';
      if (type === 'time_clock') return 'outline';
      return 'secondary';
    };

    return <Badge variant={getVariant(activityType)}>{getDisplayName(activityType)}</Badge>;
  };

  const getUniqueActivityTypes = () => {
    const types = [...new Set(logs.map(log => log.activity_type))];
    return types.sort();
  };

  const filteredLogs = logs.filter(log => {
    const userName = getUserName(log.user_id).toLowerCase();
    const matchesSearch = userName.includes(searchTerm.toLowerCase()) ||
                         log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.activity_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = activityFilter === 'all' || log.activity_type === activityFilter;
    
    return matchesSearch && matchesFilter;
  });

  const getOverallStats = () => {
    const totalLogs = logs.length;
    const uniqueUsers = new Set(logs.map(log => log.user_id)).size;
    const todayLogs = logs.filter(log => {
      const logDate = new Date(log.created_at).toDateString();
      const today = new Date().toDateString();
      return logDate === today;
    }).length;
    
    const activityCounts = logs.reduce((acc, log) => {
      acc[log.activity_type] = (acc[log.activity_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonActivity = Object.entries(activityCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    return { totalLogs, uniqueUsers, todayLogs, mostCommonActivity };
  };

  const stats = getOverallStats();

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Logs</p>
                <p className="text-2xl font-bold">{stats.totalLogs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Usuários Ativos</p>
                <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Logs Hoje</p>
                <p className="text-2xl font-bold">{stats.todayLogs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Atividade Mais Comum</p>
                <p className="text-lg font-bold">{stats.mostCommonActivity}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Log de Atividades dos Usuários
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuário, descrição ou tipo de atividade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por atividade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as atividades</SelectItem>
                  {getUniqueActivityTypes().map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Carregando logs...</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Tipo de Atividade</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Data/Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {getUserName(log.user_id)}
                      </TableCell>
                      <TableCell>
                        {getActivityBadge(log.activity_type)}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {log.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.entity_type ? (
                          <div className="text-sm">
                            <span className="font-medium">{log.entity_type}</span>
                            {log.entity_id && (
                              <div className="text-muted-foreground text-xs">
                                {log.entity_id.slice(0, 8)}...
                              </div>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-mono">
                          {log.ip_address || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};