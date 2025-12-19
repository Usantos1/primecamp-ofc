import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { BarChart3, DollarSign, FileText, TrendingUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function FinanceiroLayout() {
  const location = useLocation();
  const currentPath = location.pathname;
  
  const now = new Date();
  const [periodoInicio, setPeriodoInicio] = useState<Date | undefined>(
    new Date(new Date().setDate(new Date().getDate() - 30))
  );
  const [periodoFim, setPeriodoFim] = useState<Date | undefined>(new Date());
  const [useDateRange, setUseDateRange] = useState(false);
  
  const getActiveTab = () => {
    if (currentPath.includes('/caixa')) return 'caixa';
    if (currentPath.includes('/contas')) return 'contas';
    if (currentPath.includes('/transacoes')) return 'transacoes';
    if (currentPath.includes('/relatorios')) return 'relatorios';
    return 'dashboard';
  };

  // Calcular mês selecionado ou período
  const selectedMonth = useDateRange && periodoInicio 
    ? periodoInicio.toISOString().slice(0, 7)
    : now.toISOString().slice(0, 7);

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
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filtro:</span>
                <Select value={useDateRange ? 'range' : 'month'} onValueChange={(v) => setUseDateRange(v === 'range')}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Por Mês</SelectItem>
                    <SelectItem value="range">Por Período</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {useDateRange ? (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Período Início</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-[200px] justify-start text-left font-normal",
                            !periodoInicio && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {periodoInicio ? format(periodoInicio, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={periodoInicio}
                          onSelect={setPeriodoInicio}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Período Fim</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-[200px] justify-start text-left font-normal",
                            !periodoFim && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {periodoFim ? format(periodoFim, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={periodoFim}
                          onSelect={setPeriodoFim}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Mês:</span>
                  <Select value={selectedMonth} onValueChange={(v) => {
                    const date = new Date(v + '-01');
                    setPeriodoInicio(date);
                    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                    setPeriodoFim(lastDay);
                  }}>
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
              )}
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
        <Outlet context={{ 
          startDate: useDateRange && periodoInicio 
            ? periodoInicio.toISOString().split('T')[0]
            : `${selectedMonth}-01`,
          endDate: useDateRange && periodoFim
            ? periodoFim.toISOString().split('T')[0]
            : undefined,
          month: selectedMonth
        }} />
      </div>
    </ModernLayout>
  );
}
