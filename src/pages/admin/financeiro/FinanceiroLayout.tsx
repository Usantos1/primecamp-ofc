import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  LayoutDashboard, 
  DollarSign, 
  FileText, 
  TrendingUp, 
  BarChart3,
  CalendarDays
} from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin/financeiro' },
  { id: 'caixa', label: 'Caixa', icon: DollarSign, path: '/admin/financeiro/caixa' },
  { id: 'contas', label: 'Contas', icon: FileText, path: '/admin/financeiro/contas' },
  { id: 'transacoes', label: 'Transações', icon: TrendingUp, path: '/admin/financeiro/transacoes' },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3, path: '/admin/financeiro/relatorios' },
];

export function FinanceiroLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Filtro de período (igual ao de vendas)
  const [dateFilter, setDateFilter] = useState<string>('month');
  const [customDateStart, setCustomDateStart] = useState<Date | undefined>(undefined);
  const [customDateEnd, setCustomDateEnd] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Calcular datas baseado no filtro
  // Para contas a pagar, consideramos vencimentos futuros
  const getDateRange = () => {
    const today = new Date();
    let startDate: string;
    let endDate: string;

    if (dateFilter === 'today') {
      startDate = format(today, 'yyyy-MM-dd');
      endDate = format(today, 'yyyy-MM-dd');
    } else if (dateFilter === 'week') {
      // Próximos 7 dias (para contas a pagar)
      startDate = format(today, 'yyyy-MM-dd');
      const weekAhead = new Date(today);
      weekAhead.setDate(weekAhead.getDate() + 7);
      endDate = format(weekAhead, 'yyyy-MM-dd');
    } else if (dateFilter === 'month') {
      // Próximos 30 dias (para contas a pagar)
      startDate = format(today, 'yyyy-MM-dd');
      const monthAhead = new Date(today);
      monthAhead.setDate(monthAhead.getDate() + 30);
      endDate = format(monthAhead, 'yyyy-MM-dd');
    } else if (dateFilter === 'custom' && customDateStart && customDateEnd) {
      startDate = format(customDateStart, 'yyyy-MM-dd');
      endDate = format(customDateEnd, 'yyyy-MM-dd');
    } else {
      // all - não filtra por data
      startDate = '';
      endDate = '';
    }

    // Calcular mês para compatibilidade
    const month = startDate ? startDate.slice(0, 7) : '';

    return { startDate, endDate, month };
  };

  const dateRange = getDateRange();

  const currentTab = tabs.find(t => 
    location.pathname === t.path || 
    (t.id === 'dashboard' && location.pathname === '/admin/financeiro')
  ) || tabs[0];

  return (
    <ModernLayout title="Financeiro" subtitle="Gestão financeira completa">
      <div className="flex flex-col h-full overflow-hidden gap-3">
        {/* Header compacto */}
        <Card className="flex-shrink-0">
          <CardContent className="p-2 md:p-3">
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {/* Tabs - Mobile: scroll horizontal */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin flex-1 md:flex-none">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = location.pathname === tab.path || 
                    (tab.id === 'dashboard' && location.pathname === '/admin/financeiro');
                  return (
                    <Button
                      key={tab.id}
                      variant={isActive ? 'default' : 'ghost'}
                      size="sm"
                      className={cn(
                        'h-8 px-2 md:px-3 text-xs md:text-sm whitespace-nowrap',
                        isActive && 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                      )}
                      onClick={() => navigate(tab.path)}
                    >
                      <Icon className="h-3.5 w-3.5 mr-1 md:mr-1.5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </Button>
                  );
                })}
              </div>
              
              {/* Seletor de Período - Igual ao de Vendas */}
              <div className="ml-auto">
                <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className={cn(
                        "w-[180px] md:w-[200px] h-8 text-xs justify-start text-left font-normal",
                        dateFilter === 'custom' && customDateStart && customDateEnd && "text-foreground"
                      )}
                    >
                      <CalendarDays className="mr-2 h-3.5 w-3.5" />
                      {dateFilter === 'custom' && customDateStart && customDateEnd ? (
                        <span className="truncate">
                          {format(customDateStart, 'dd/MM/yy', { locale: ptBR })} - {format(customDateEnd, 'dd/MM/yy', { locale: ptBR })}
                        </span>
                      ) : dateFilter === 'today' ? (
                        'Hoje'
                      ) : dateFilter === 'week' ? (
                        'Últimos 7 dias'
                      ) : dateFilter === 'month' ? (
                        'Últimos 30 dias'
                      ) : (
                        'Todos'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <div className="p-3 border-b space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant={dateFilter === 'today' ? 'default' : 'outline'} 
                          size="sm"
                          onClick={() => { setDateFilter('today'); setShowDatePicker(false); }}
                        >
                          Hoje
                        </Button>
                        <Button 
                          variant={dateFilter === 'week' ? 'default' : 'outline'} 
                          size="sm"
                          onClick={() => { setDateFilter('week'); setShowDatePicker(false); }}
                        >
                          7 dias
                        </Button>
                        <Button 
                          variant={dateFilter === 'month' ? 'default' : 'outline'} 
                          size="sm"
                          onClick={() => { setDateFilter('month'); setShowDatePicker(false); }}
                        >
                          30 dias
                        </Button>
                        <Button 
                          variant={dateFilter === 'all' ? 'default' : 'outline'} 
                          size="sm"
                          onClick={() => { setDateFilter('all'); setShowDatePicker(false); }}
                        >
                          Todos
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground text-center pt-1">
                        ou selecione um período:
                      </div>
                    </div>
                    <div className="p-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Data Início</Label>
                          <Input
                            type="date"
                            value={customDateStart ? format(customDateStart, 'yyyy-MM-dd') : ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                setCustomDateStart(new Date(e.target.value + 'T00:00:00'));
                              }
                            }}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Data Fim</Label>
                          <Input
                            type="date"
                            value={customDateEnd ? format(customDateEnd, 'yyyy-MM-dd') : ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                setCustomDateEnd(new Date(e.target.value + 'T23:59:59'));
                              }
                            }}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <Button 
                        className="w-full" 
                        size="sm"
                        disabled={!customDateStart || !customDateEnd}
                        onClick={() => { 
                          setDateFilter('custom'); 
                          setShowDatePicker(false); 
                        }}
                      >
                        Aplicar Período
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-auto scrollbar-thin min-h-0">
          <Outlet context={{ 
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            month: dateRange.month,
            dateFilter,
          }} />
        </div>
      </div>
    </ModernLayout>
  );
}
