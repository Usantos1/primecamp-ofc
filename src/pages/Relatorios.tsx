import { useMemo, useState } from 'react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  User,
  BarChart3,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSalesSummary, useTechnicianProductivity, ReportFilters } from '@/hooks/useReports';
import { useDashboardExecutivo } from '@/hooks/useFinanceiro';
import { useCargos } from '@/hooks/useCargos';
import { TrendCharts } from '@/components/dashboard/TrendCharts';
import { currencyFormatters } from '@/utils/formatters';
import { PAYMENT_METHOD_LABELS } from '@/types/pdv';
import type { DashboardTrendData } from '@/hooks/useDashboardData';

export default function Relatorios() {
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  });
  const [endDate, setEndDate] = useState<Date | undefined>(() => new Date());
  const [technicianId, setTechnicianId] = useState<string>('all');
  const [saleOrigin, setSaleOrigin] = useState<'PDV' | 'OS' | 'all'>('all');
  const [paymentMethod, setPaymentMethod] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'summary' | 'productivity'>('summary');

  const filters: ReportFilters = useMemo(
    () => ({
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
      technicianId: technicianId !== 'all' ? technicianId : undefined,
      saleOrigin: saleOrigin !== 'all' ? saleOrigin : undefined,
      paymentMethod: paymentMethod !== 'all' ? paymentMethod : undefined,
    }),
    [startDate, endDate, technicianId, saleOrigin, paymentMethod]
  );

  const { data: summary, isLoading: isLoadingSummary } = useSalesSummary(filters);
  const { data: productivity, isLoading: isLoadingProductivity } = useTechnicianProductivity(filters);
  const { tecnicos, isLoading: isLoadingTecnicos } = useCargos();
  const { data: financeiroDashboard } = useDashboardExecutivo(filters.startDate, filters.endDate);

  const paymentMethods = [
    { value: 'all', label: 'Todas' },
    { value: 'dinheiro', label: PAYMENT_METHOD_LABELS.dinheiro },
    { value: 'pix', label: PAYMENT_METHOD_LABELS.pix },
    { value: 'debito', label: PAYMENT_METHOD_LABELS.debito },
    { value: 'credito', label: PAYMENT_METHOD_LABELS.credito },
    { value: 'link_pagamento', label: PAYMENT_METHOD_LABELS.link_pagamento },
    { value: 'carteira_digital', label: PAYMENT_METHOD_LABELS.carteira_digital },
    { value: 'fiado', label: PAYMENT_METHOD_LABELS.fiado },
  ];

  const trendChartData: DashboardTrendData[] = useMemo(() => {
    const applyOrigin = (arr: DashboardTrendData[]): DashboardTrendData[] => {
      if (saleOrigin === 'PDV') return arr.map((p) => ({ ...p, totalOS: 0, faturamento_os: 0, totalGeral: p.totalPDV }));
      if (saleOrigin === 'OS') return arr.map((p) => ({ ...p, totalPDV: 0, vendas: 0, totalGeral: p.totalOS }));
      return arr;
    };
    if (!financeiroDashboard?.tendencia?.length || !filters.startDate || !filters.endDate) {
      if (financeiroDashboard?.tendencia?.length) {
        const raw = financeiroDashboard.tendencia.map((t) => {
          const rawD = t?.data;
          const dateStr = typeof rawD === 'string' ? rawD.trim().slice(0, 10) : '';
          const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
          return {
            date: dateStr ? format(d, 'dd/MM', { locale: ptBR }) : '–',
            data: dateStr,
            vendas: t.totalPDV ?? 0,
            os: 0,
            faturamento_os: t.totalOS ?? 0,
            totalPDV: t.totalPDV ?? 0,
            totalOS: t.totalOS ?? 0,
            totalGeral: t.totalGeral ?? 0,
          };
        });
        return applyOrigin(raw);
      }
      return [];
    }
    const start = new Date(filters.startDate + 'T12:00:00');
    const end = new Date(filters.endDate + 'T12:00:00');
    const byDate = new Map<string, DashboardTrendData>();
    financeiroDashboard.tendencia.forEach((t) => {
      const rawStr = typeof t?.data === 'string' ? t.data.trim() : '';
      if (!rawStr || rawStr.length < 10) return;
      const dateStr = rawStr.slice(0, 10);
      if (dateStr < filters.startDate! || dateStr > filters.endDate!) return;
      const d = new Date(dateStr + 'T12:00:00');
      if (Number.isNaN(d.getTime())) return;
      byDate.set(dateStr, {
        date: format(d, 'dd/MM', { locale: ptBR }),
        data: dateStr,
        vendas: t.totalPDV ?? 0,
        os: 0,
        faturamento_os: t.totalOS ?? 0,
        totalPDV: t.totalPDV ?? 0,
        totalOS: t.totalOS ?? 0,
        totalGeral: t.totalGeral ?? 0,
      });
    });
    const result: DashboardTrendData[] = [];
    let cur = new Date(start);
    while (cur <= end) {
      const dateStr = format(cur, 'yyyy-MM-dd');
      const dateLabel = format(cur, 'dd/MM', { locale: ptBR });
      result.push(
        byDate.get(dateStr) ?? {
          date: dateLabel,
          data: dateStr,
          vendas: 0,
          os: 0,
          faturamento_os: 0,
          totalPDV: 0,
          totalOS: 0,
          totalGeral: 0,
        }
      );
      cur = addDays(cur, 1);
    }
    return applyOrigin(result);
  }, [financeiroDashboard?.tendencia, filters.startDate, filters.endDate, saleOrigin]);

  return (
    <ModernLayout title="Relatórios" subtitle="Vendas, tendências e produtividade">
      <div className="flex flex-col gap-3 md:gap-4 pb-6">
        {/* Filtros */}
        <Card className="border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-sm flex-shrink-0">
          <CardContent className="p-3 md:p-4">
            <div className="md:hidden grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 text-xs justify-start border-gray-300 dark:border-gray-600">
                    <Calendar className="h-3 w-3 mr-1" />
                    {startDate ? format(startDate, 'dd/MM', { locale: ptBR }) : 'Início'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={startDate} onSelect={setStartDate} locale={ptBR} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 text-xs justify-start border-gray-300 dark:border-gray-600">
                    <Calendar className="h-3 w-3 mr-1" />
                    {endDate ? format(endDate, 'dd/MM', { locale: ptBR }) : 'Fim'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={endDate} onSelect={setEndDate} locale={ptBR} />
                </PopoverContent>
              </Popover>
              <Select value={saleOrigin} onValueChange={(v: 'PDV' | 'OS' | 'all') => setSaleOrigin(v)}>
                <SelectTrigger className="h-9 text-xs border-gray-300 dark:border-gray-600">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="PDV">PDV</SelectItem>
                  <SelectItem value="OS">OS</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-9 text-xs border-gray-300 dark:border-gray-600">
                  <SelectValue placeholder="Pagamento" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="hidden md:grid grid-cols-5 gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Data Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal h-10 border-gray-300 dark:border-gray-600', !startDate && 'text-muted-foreground')}>
                      <Calendar className="mr-2 h-4 w-4" />
                      <span className="truncate">{startDate ? format(startDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Data'}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent mode="single" selected={startDate} onSelect={setStartDate} locale={ptBR} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Data Fim</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal h-10 border-gray-300 dark:border-gray-600', !endDate && 'text-muted-foreground')}>
                      <Calendar className="mr-2 h-4 w-4" />
                      <span className="truncate">{endDate ? format(endDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Data'}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent mode="single" selected={endDate} onSelect={setEndDate} locale={ptBR} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Origem</Label>
                <Select value={saleOrigin} onValueChange={(v: 'PDV' | 'OS' | 'all') => setSaleOrigin(v)}>
                  <SelectTrigger className="h-10 border-gray-300 dark:border-gray-600">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="PDV">PDV</SelectItem>
                    <SelectItem value="OS">OS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Técnico</Label>
                <Select value={technicianId} onValueChange={setTechnicianId} disabled={isLoadingTecnicos}>
                  <SelectTrigger className="h-10 border-gray-300 dark:border-gray-600">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {tecnicos.map((tec) => (
                      <SelectItem key={tec.id} value={tec.id}>{tec.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Forma de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-10 border-gray-300 dark:border-gray-600">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de tendência (respeita período e origem) */}
        {trendChartData.length > 0 && (
          <div className="w-full min-w-0">
            <TrendCharts data={trendChartData} valuesVisible hidePeriodSelector />
          </div>
        )}

        {/* Conteúdo com Tabs */}
        <div className="w-full min-w-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'summary' | 'productivity')} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 border-2 border-gray-300 dark:border-gray-600 rounded-xl">
              <TabsTrigger value="summary" className="font-semibold">
                <BarChart3 className="h-4 w-4 mr-2" />
                Resumo Geral
              </TabsTrigger>
              <TabsTrigger value="productivity" className="font-semibold">
                <User className="h-4 w-4 mr-2" />
                Produtividade por Técnico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4 mt-4">
              {isLoadingSummary ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Carregando...</div>
              ) : summary ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-0">
                  <Card className="border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-sm min-w-0 overflow-hidden">
                    <CardContent className="p-4 min-w-0">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground font-semibold truncate">Total PDV</p>
                          <p className="text-lg font-bold text-blue-700 dark:text-blue-400 mt-1 truncate" title={currencyFormatters.brl(summary.totalPDV)}>{currencyFormatters.brl(summary.totalPDV)}</p>
                          <p className="text-xs text-muted-foreground mt-1">{summary.countPDV} {summary.countPDV === 1 ? 'venda' : 'vendas'}</p>
                        </div>
                        <ShoppingCart className="h-8 w-8 text-blue-500 opacity-50 flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-sm min-w-0 overflow-hidden">
                    <CardContent className="p-4 min-w-0">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground font-semibold truncate">Total OS</p>
                          <p className="text-lg font-bold text-green-700 dark:text-green-400 mt-1 truncate" title={currencyFormatters.brl(summary.totalOS)}>{currencyFormatters.brl(summary.totalOS)}</p>
                          <p className="text-xs text-muted-foreground mt-1">{summary.countOS} {summary.countOS === 1 ? 'OS' : 'OS'}</p>
                        </div>
                        <Wrench className="h-8 w-8 text-green-500 opacity-50 flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-sm min-w-0 overflow-hidden">
                    <CardContent className="p-4 min-w-0">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground font-semibold truncate">Total Geral</p>
                          <p className="text-lg font-bold text-purple-700 dark:text-purple-400 mt-1 truncate" title={currencyFormatters.brl(summary.totalGeral)}>{currencyFormatters.brl(summary.totalGeral)}</p>
                          <p className="text-xs text-muted-foreground mt-1">{summary.countGeral} {summary.countGeral === 1 ? 'venda' : 'vendas'}</p>
                        </div>
                        <DollarSign className="h-8 w-8 text-purple-500 opacity-50 flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-sm min-w-0 overflow-hidden">
                    <CardContent className="p-4 min-w-0">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground font-semibold truncate">% PDV</p>
                          <p className="text-lg font-bold text-orange-700 dark:text-orange-400 mt-1">{summary.percentPDV.toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground mt-1">% OS: {summary.percentOS.toFixed(1)}%</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-orange-500 opacity-50 flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="border-2 border-gray-300 dark:border-gray-600 rounded-xl">
                  <CardContent className="p-8 text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhum dado disponível no período selecionado</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="productivity" className="space-y-4 mt-4">
              {isLoadingProductivity ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Carregando...</div>
              ) : productivity && productivity.length > 0 ? (
                <Card className="border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-sm overflow-hidden min-w-0">
                  <div className="hidden md:block overflow-x-auto scrollbar-thin">
                    <Table className="min-w-[600px]">
                      <TableHeader>
                        <TableRow className="border-b-2 border-gray-200 dark:border-gray-700 bg-muted/50">
                          <TableHead className="font-semibold">Técnico</TableHead>
                          <TableHead className="text-right font-semibold">OS Completadas</TableHead>
                          <TableHead className="text-right font-semibold">Receita Total</TableHead>
                          <TableHead className="text-right font-semibold">Receita Serviços</TableHead>
                          <TableHead className="text-right font-semibold">Receita Produtos</TableHead>
                          <TableHead className="text-right font-semibold">Ticket Médio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productivity.map((tech) => (
                          <TableRow key={tech.technician_id} className="border-b border-gray-100 dark:border-gray-800">
                            <TableCell className="font-medium">{tech.technician_nome}</TableCell>
                            <TableCell className="text-right">{tech.osCompleted}</TableCell>
                            <TableCell className="text-right font-semibold">{currencyFormatters.brl(tech.totalRevenue)}</TableCell>
                            <TableCell className="text-right">{currencyFormatters.brl(tech.serviceRevenue)}</TableCell>
                            <TableCell className="text-right">{currencyFormatters.brl(tech.productRevenue)}</TableCell>
                            <TableCell className="text-right font-semibold">{currencyFormatters.brl(tech.averageTicket)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="md:hidden space-y-3 p-3">
                    {productivity.map((tech) => (
                      <Card key={tech.technician_id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                        <CardContent className="p-4 space-y-2">
                          <h3 className="font-bold">{tech.technician_nome}</h3>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><span className="text-muted-foreground">OS:</span> {tech.osCompleted}</div>
                            <div><span className="text-muted-foreground">Ticket médio:</span> {currencyFormatters.brl(tech.averageTicket)}</div>
                            <div className="col-span-2"><span className="text-muted-foreground">Receita total:</span> {currencyFormatters.brl(tech.totalRevenue)}</div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </Card>
              ) : (
                <Card className="border-2 border-gray-300 dark:border-gray-600 rounded-xl">
                  <CardContent className="p-8 text-center">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhuma produtividade encontrada no período</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ModernLayout>
  );
}
