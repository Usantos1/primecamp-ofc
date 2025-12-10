import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  Receipt, 
  CreditCard, 
  ArrowLeftRight,
  TrendingUp,
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

type PeriodFilter = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface FinanceiroContextType {
  period: PeriodFilter;
  startDate: string;
  endDate: string;
  setPeriod: (period: PeriodFilter) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
}

export default function FinanceiroLayout() {
  const location = useLocation();
  const today = new Date();
  
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [startDate, setStartDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
  );

  const handlePeriodChange = (newPeriod: PeriodFilter) => {
    setPeriod(newPeriod);
    const now = new Date();
    
    switch (newPeriod) {
      case 'today':
        setStartDate(now.toISOString().split('T')[0]);
        setEndDate(now.toISOString().split('T')[0]);
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        setStartDate(weekStart.toISOString().split('T')[0]);
        setEndDate(weekEnd.toISOString().split('T')[0]);
        break;
      case 'month':
        setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
        setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
        break;
      case 'year':
        setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]);
        setEndDate(new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]);
        break;
    }
  };

  const navItems = [
    { path: '/admin/financeiro', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { path: '/admin/financeiro/caixa', label: 'Fechamento de Caixa', icon: Receipt },
    { path: '/admin/financeiro/contas', label: 'Contas a Pagar', icon: CreditCard },
    { path: '/admin/financeiro/transacoes', label: 'Transações', icon: ArrowLeftRight },
    { path: '/admin/financeiro/relatorios', label: 'Relatórios', icon: TrendingUp },
  ];

  const periodLabels: Record<PeriodFilter, string> = {
    today: 'Hoje',
    week: 'Esta Semana',
    month: 'Este Mês',
    year: 'Este Ano',
    custom: 'Personalizado',
  };

  return (
    <ModernLayout
      title="Financeiro"
      subtitle="Controle completo de caixa, contas e análises financeiras"
    >
      <div className="space-y-6">
        {/* Header com navegação e filtros */}
        <div className="flex flex-col gap-4">
          {/* Navegação por abas */}
          <div className="flex flex-wrap gap-2 p-1 bg-muted/50 rounded-lg">
            {navItems.map((item) => {
              const isActive = item.exact 
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);
              const Icon = item.icon;
              
              return (
                <NavLink key={item.path} to={item.path} end={item.exact}>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    className={cn(
                      'gap-2',
                      isActive && 'shadow-sm'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Button>
                </NavLink>
              );
            })}
          </div>

          {/* Filtros de período */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-card border rounded-lg">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Período:</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {(['today', 'week', 'month', 'year', 'custom'] as PeriodFilter[]).map((p) => (
                <Button
                  key={p}
                  variant={period === p ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePeriodChange(p)}
                >
                  {periodLabels[p]}
                </Button>
              ))}
            </div>

            {period === 'custom' && (
              <div className="flex items-center gap-2 ml-auto">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-auto"
                />
                <span className="text-muted-foreground">até</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-auto"
                />
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(startDate).toLocaleDateString('pt-BR')} - {new Date(endDate).toLocaleDateString('pt-BR')}
              </Badge>
              
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        </div>

        {/* Conteúdo da rota */}
        <Outlet context={{ period, startDate, endDate, setPeriod, setStartDate, setEndDate }} />
      </div>
    </ModernLayout>
  );
}

