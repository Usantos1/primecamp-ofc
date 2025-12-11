import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, DollarSign, FileText, TrendingUp, Calendar } from 'lucide-react';

export function FinanceiroLayout() {
  const location = useLocation();
  const currentPath = location.pathname;
  
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.toISOString().slice(0, 7));
  
  const getActiveTab = () => {
    if (currentPath.includes('/caixa')) return 'caixa';
    if (currentPath.includes('/contas')) return 'contas';
    if (currentPath.includes('/transacoes')) return 'transacoes';
    if (currentPath.includes('/relatorios')) return 'relatorios';
    return 'dashboard';
  };

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      value: date.toISOString().slice(0, 7),
      label: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    };
  });

  return (
    <ModernLayout title="Módulo Financeiro" subtitle="Gestão financeira completa">
      <div className="space-y-6">
        {/* Filtro de período */}
        <Card>
          <CardContent className="pt-4 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Período:</span>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Navegação por tabs */}
            <Tabs value={getActiveTab()} className="w-auto">
              <TabsList>
                <TabsTrigger value="dashboard" asChild>
                  <NavLink to="/admin/financeiro" end className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Dashboard
                  </NavLink>
                </TabsTrigger>
                <TabsTrigger value="caixa" asChild>
                  <NavLink to="/admin/financeiro/caixa" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Caixa
                  </NavLink>
                </TabsTrigger>
                <TabsTrigger value="contas" asChild>
                  <NavLink to="/admin/financeiro/contas" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Contas
                  </NavLink>
                </TabsTrigger>
                <TabsTrigger value="transacoes" asChild>
                  <NavLink to="/admin/financeiro/transacoes" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Transações
                  </NavLink>
                </TabsTrigger>
                <TabsTrigger value="relatorios" asChild>
                  <NavLink to="/admin/financeiro/relatorios" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Relatórios
                  </NavLink>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Conteúdo da rota filha */}
        <Outlet context={{ startDate: `${selectedMonth}-01` }} />
      </div>
    </ModernLayout>
  );
}
