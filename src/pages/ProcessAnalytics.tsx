import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, FileText, Users, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { from } from '@/integrations/db/client';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export default function ProcessAnalytics() {
  const [loading, setLoading] = useState(true);
  const [processes, setProcesses] = useState([]);
  const [stats, setStats] = useState({
    totalProcesses: 0,
    activeProcesses: 0,
    draftProcesses: 0,
    completedProcesses: 0
  });

  useEffect(() => {
    fetchProcessData();
  }, []);

  const fetchProcessData = async () => {
    try {
      setLoading(true);
      
      const { data: processes } = await from('processes')
        .select('*')
        .execute();

      const statusCounts = (processes || []).reduce((acc, process) => {
        acc[process.status] = (acc[process.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setProcesses(processes || []);
      setStats({
        totalProcesses: processes?.length || 0,
        activeProcesses: statusCounts.active || 0,
        draftProcesses: statusCounts.draft || 0,
        completedProcesses: statusCounts.completed || 0
      });
    } catch (error) {
      console.error('Error fetching process data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusData = [
    { name: 'Ativos', value: stats.activeProcesses, fill: 'hsl(var(--chart-1))' },
    { name: 'Rascunhos', value: stats.draftProcesses, fill: 'hsl(var(--chart-2))' },
    { name: 'Completos', value: stats.completedProcesses, fill: 'hsl(var(--chart-3))' }
  ];

  if (loading) {
    return (
      <ModernLayout title="Análise de Processos" subtitle="Dashboard completo dos processos da empresa">
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
    <ModernLayout title="Análise de Processos" subtitle="Dashboard completo dos processos da empresa">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Processos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProcesses}</div>
              <p className="text-xs text-muted-foreground">processos cadastrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processos Ativos</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeProcesses}</div>
              <p className="text-xs text-muted-foreground">em execução</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rascunhos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.draftProcesses}</div>
              <p className="text-xs text-muted-foreground">aguardando aprovação</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completados</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedProcesses}</div>
              <p className="text-xs text-muted-foreground">finalizados</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Processos por Departamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Análise por departamento em desenvolvimento</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ModernLayout>
  );
}