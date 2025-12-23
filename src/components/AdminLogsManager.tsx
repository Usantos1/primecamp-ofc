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
    <div className="space-y-4 md:space-y-6 px-1 md:px-0">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Card className="border-2 border-gray-300 border-l-4 border-l-blue-500 shadow-sm bg-blue-50/50 md:bg-transparent">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-sm font-medium text-blue-700 md:text-muted-foreground">Total de Logs</p>
                <p className="text-base md:text-2xl font-bold text-blue-700 md:text-foreground">{stats.totalLogs}</p>
              </div>
              <Activity className="h-3 w-3 md:h-5 md:w-5 text-blue-600 md:text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-gray-300 border-l-4 border-l-green-500 shadow-sm bg-green-50/50 md:bg-transparent">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-sm font-medium text-green-700 md:text-muted-foreground">Usuários Ativos</p>
                <p className="text-base md:text-2xl font-bold text-green-700 md:text-foreground">{stats.uniqueUsers}</p>
              </div>
              <Activity className="h-3 w-3 md:h-5 md:w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-gray-300 border-l-4 border-l-indigo-500 shadow-sm bg-indigo-50/50 md:bg-transparent">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-sm font-medium text-indigo-700 md:text-muted-foreground">Logs Hoje</p>
                <p className="text-base md:text-2xl font-bold text-indigo-700 md:text-foreground">{stats.todayLogs}</p>
              </div>
              <Activity className="h-3 w-3 md:h-5 md:w-5 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-gray-300 border-l-4 border-l-orange-500 shadow-sm bg-orange-50/50 md:bg-transparent">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] md:text-sm font-medium text-orange-700 md:text-muted-foreground">Atividade Mais Comum</p>
                <p className="text-xs md:text-lg font-bold text-orange-700 md:text-foreground truncate">{stats.mostCommonActivity}</p>
              </div>
              <Activity className="h-3 w-3 md:h-5 md:w-5 text-orange-600 flex-shrink-0 ml-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-gray-300 shadow-sm">
        <CardHeader className="pb-3 pt-3 md:pt-6 px-3 md:px-6 border-b-2 border-gray-200">
          <CardTitle className="flex items-center gap-2 text-base md:text-xl">
            <div className="p-1.5 md:p-2 rounded-lg bg-gradient-to-br from-gray-100 to-white border-2 border-gray-200">
              <Activity className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
            </div>
            Log de Atividades dos Usuários
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6 space-y-3 md:space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuário, descrição ou tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 md:h-10 text-base md:text-sm border-2 border-gray-300"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger className="w-full md:w-48 h-9 md:h-10 text-base md:text-sm border-2 border-gray-300">
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
              <p className="mt-2 text-sm md:text-base text-muted-foreground">Carregando logs...</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto border-2 border-gray-300 rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-gray-300">
                      <TableHead className="font-semibold">Usuário</TableHead>
                      <TableHead className="font-semibold">Tipo de Atividade</TableHead>
                      <TableHead className="font-semibold">Descrição</TableHead>
                      <TableHead className="font-semibold">Entidade</TableHead>
                      <TableHead className="font-semibold">IP</TableHead>
                      <TableHead className="font-semibold">Data/Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id} className="border-b border-gray-200 hover:bg-gray-50/50">
                        <TableCell className="font-medium text-sm">
                          {getUserName(log.user_id)}
                        </TableCell>
                        <TableCell>
                          {getActivityBadge(log.activity_type)}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate text-sm">
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
                            <span className="text-muted-foreground">-</span>
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

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredLogs.map((log) => (
                  <Card key={log.id} className="border-2 border-gray-300 shadow-sm">
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{getUserName(log.user_id)}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                            </p>
                          </div>
                          {getActivityBadge(log.activity_type)}
                        </div>
                        <div className="pt-2 border-t-2 border-gray-200">
                          <p className="text-xs text-muted-foreground mb-1">Descrição:</p>
                          <p className="text-sm">{log.description}</p>
                        </div>
                        {(log.entity_type || log.ip_address) && (
                          <div className="pt-2 border-t-2 border-gray-200 space-y-1">
                            {log.entity_type && (
                              <div>
                                <p className="text-xs text-muted-foreground">Entidade:</p>
                                <p className="text-sm font-medium">{log.entity_type}</p>
                                {log.entity_id && (
                                  <p className="text-xs text-muted-foreground">{log.entity_id.slice(0, 8)}...</p>
                                )}
                              </div>
                            )}
                            {log.ip_address && (
                              <div>
                                <p className="text-xs text-muted-foreground">IP:</p>
                                <p className="text-sm font-mono">{log.ip_address}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredLogs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum log encontrado com os filtros aplicados.
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};