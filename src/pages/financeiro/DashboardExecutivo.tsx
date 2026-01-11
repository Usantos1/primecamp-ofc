import { useState, useMemo } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, ShoppingCart, Wrench, TrendingUp, TrendingDown,
  AlertTriangle, Package, Users, BarChart3, Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { currencyFormatters } from '@/utils/formatters';
import { useDashboardExecutivo, useRecomendacoes } from '@/hooks/useFinanceiro';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function DashboardExecutivo() {
  const [periodoInicio, setPeriodoInicio] = useState<Date | undefined>(
    new Date(new Date().setDate(new Date().getDate() - 30))
  );
  const [periodoFim, setPeriodoFim] = useState<Date | undefined>(new Date());
  
  const formattedStartDate = periodoInicio ? format(periodoInicio, 'yyyy-MM-dd') : undefined;
  const formattedEndDate = periodoFim ? format(periodoFim, 'yyyy-MM-dd') : undefined;
  
  const { data: dashboard, isLoading } = useDashboardExecutivo(formattedStartDate, formattedEndDate);
  const { data: recomendacoes } = useRecomendacoes(undefined, 'pendente');
  
  const recomendacoesCriticas = useMemo(() => {
    return (recomendacoes || []).filter((r: any) => r.prioridade >= 8).slice(0, 5);
  }, [recomendacoes]);
  
  if (isLoading) {
    return (
      <ModernLayout title="Dashboard Executivo" subtitle="Visão geral financeira e operacional">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </ModernLayout>
    );
  }
  
  if (!dashboard) {
    return (
      <ModernLayout title="Dashboard Executivo" subtitle="Visão geral financeira e operacional">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Nenhum dado disponível</p>
        </div>
      </ModernLayout>
    );
  }
  
  const percentPDV = dashboard.kpis.totalGeral > 0 
    ? (dashboard.kpis.totalPDV / dashboard.kpis.totalGeral) * 100 
    : 0;
  const percentOS = dashboard.kpis.totalGeral > 0 
    ? (dashboard.kpis.totalOS / dashboard.kpis.totalGeral) * 100 
    : 0;
  
  return (
    <ModernLayout title="Dashboard Executivo" subtitle="Visão geral financeira e operacional com IA">
      <div className="flex flex-col h-full overflow-hidden gap-4">
        {/* Filtros */}
        <Card className="flex-shrink-0 border-[3px] border-gray-400 rounded-xl shadow-sm p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Período Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10 rounded-lg border-[3px] border-gray-400",
                      !periodoInicio && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    <span className="truncate">
                      {periodoInicio ? format(periodoInicio, "dd/MM/yyyy", { locale: ptBR }) : "Data"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={periodoInicio} onSelect={setPeriodoInicio} initialFocus locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Período Fim</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10 rounded-lg border-[3px] border-gray-400",
                      !periodoFim && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    <span className="truncate">
                      {periodoFim ? format(periodoFim, "dd/MM/yyyy", { locale: ptBR }) : "Data"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={periodoFim} onSelect={setPeriodoFim} initialFocus locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </Card>
        
        {/* KPIs Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-bold">Receita Total</CardTitle>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currencyFormatters.brl(dashboard.kpis.totalGeral)}</div>
              <p className="text-xs text-muted-foreground">
                {dashboard.kpis.quantidadePDV + dashboard.kpis.quantidadeOS} vendas
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-bold">Vendas PDV</CardTitle>
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currencyFormatters.brl(dashboard.kpis.totalPDV)}</div>
              <p className="text-xs text-muted-foreground">
                {dashboard.kpis.quantidadePDV} vendas ({percentPDV.toFixed(1)}%)
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-bold">Vendas OS</CardTitle>
              <Wrench className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currencyFormatters.brl(dashboard.kpis.totalOS)}</div>
              <p className="text-xs text-muted-foreground">
                {dashboard.kpis.quantidadeOS} vendas ({percentOS.toFixed(1)}%)
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-bold">Ticket Médio</CardTitle>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currencyFormatters.brl(
                  (dashboard.kpis.ticketMedioPDV + dashboard.kpis.ticketMedioOS) / 2
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                PDV: {currencyFormatters.brl(dashboard.kpis.ticketMedioPDV)} | OS: {currencyFormatters.brl(dashboard.kpis.ticketMedioOS)}
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Gráfico de Tendência e Alertas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Gráfico de Tendência */}
          <Card className="lg:col-span-2 border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Tendência de Vendas</CardTitle>
              <CardDescription>Evolução diária de vendas (PDV vs OS)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboard.tendencia}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="data" 
                    tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: ptBR })}
                  />
                  <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number) => currencyFormatters.brl(value)}
                    labelFormatter={(label) => format(new Date(label), 'dd/MM/yyyy', { locale: ptBR })}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="totalPDV" stroke="#3b82f6" name="PDV" strokeWidth={2} />
                  <Line type="monotone" dataKey="totalOS" stroke="#10b981" name="OS" strokeWidth={2} />
                  <Line type="monotone" dataKey="totalGeral" stroke="#8b5cf6" name="Total" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          {/* Alertas Críticos */}
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Alertas Críticos
              </CardTitle>
              <CardDescription>Recomendações da IA</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recomendacoesCriticas.length > 0 ? (
                  recomendacoesCriticas.map((rec: any) => (
                    <div key={rec.id} className="p-2 border-[3px] border-gray-300 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{rec.titulo}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {rec.descricao}
                          </p>
                        </div>
                        <Badge variant={rec.prioridade >= 9 ? 'destructive' : 'default'}>
                          {rec.prioridade}/10
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum alerta crítico no momento
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Top Produtos e Top Vendedores */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top 10 Produtos */}
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Top 10 Produtos
              </CardTitle>
              <CardDescription>Maiores receitas do período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {dashboard.topProdutos.map((produto, index) => (
                  <div key={produto.id} className="flex items-center justify-between p-2 border-[3px] border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <Badge variant="outline" className="font-bold">
                        #{index + 1}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{produto.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {produto.quantidadeVendida} vendas • Margem: {produto.margem.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{currencyFormatters.brl(produto.receitaTotal)}</p>
                      <p className="text-xs text-muted-foreground">
                        Lucro: {currencyFormatters.brl(produto.lucroTotal)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Top 10 Vendedores */}
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top 10 Vendedores
              </CardTitle>
              <CardDescription>Melhor performance do período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {dashboard.topVendedores.map((vendedor, index) => (
                  <div key={vendedor.id} className="flex items-center justify-between p-2 border-[3px] border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <Badge variant="outline" className="font-bold">
                        #{index + 1}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{vendedor.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {vendedor.totalVendas} vendas • Ticket médio: {currencyFormatters.brl(vendedor.ticketMedio)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{currencyFormatters.brl(vendedor.totalVendido)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ModernLayout>
  );
}
