import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfMonth, endOfMonth, subMonths, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Wallet, Wrench, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardConfig } from '@/hooks/useDashboardConfig';
import { useDashboardExecutivo } from '@/hooks/useFinanceiro';
import { FinancialCards, getStoredValuesVisible, setStoredValuesVisible } from '@/components/dashboard/FinancialCards';
import { OSStatusCards } from '@/components/dashboard/OSStatusCards';
import { AlertCards } from '@/components/dashboard/AlertCards';
import { TrendCharts } from '@/components/dashboard/TrendCharts';
import { DashboardPeriodFilter } from '@/components/dashboard/DashboardPeriodFilter';
import { PresentationMode } from '@/components/dashboard/PresentationMode';
import { useOrdensServicoSupabase as useOrdensServico } from '@/hooks/useOrdensServicoSupabase';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import type { DashboardTrendData } from '@/hooks/useDashboardData';

const Index = () => {
  const navigate = useNavigate();
  const { isAdmin, profile, loading: authLoading } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { financialData, osData, alerts, trendData, trendPeriod, setTrendPeriod, customDateRange, loading: dataLoading, refetch } = useDashboardData();
  const { config, loading: configLoading } = useDashboardConfig();
  const { getEstatisticas } = useOrdensServico();
  /** Ocultar/exibir valores em R$ (ícone de olho como em bancos) - persistido no localStorage */
  const [valuesVisible, setValuesVisible] = useState(getStoredValuesVisible);

  const stats = getEstatisticas();

  // Verificar se é gestor/admin (só verifica se não estiver carregando)
  const isGestor = !permissionsLoading && (isAdmin || hasPermission('admin.view') || hasPermission('financeiro.view'));

  // Período do gráfico → datas para a API do financeiro (mesmos dados reais do /financeiro)
  const { startDate: financeiroStart, endDate: financeiroEnd, periodStartDate, periodEndDate } = useMemo(() => {
    const end = new Date();
    let start = new Date();
    if (trendPeriod === 'custom' && customDateRange?.start && customDateRange?.end) {
      return {
        startDate: customDateRange.start,
        endDate: customDateRange.end,
        periodStartDate: customDateRange.start,
        periodEndDate: customDateRange.end,
      };
    }
    if (trendPeriod === 'custom') {
      // Fallback: últimos 7 dias se ainda não tiver range salvo
      const start = subDays(end, 6);
      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
        periodStartDate: format(start, 'yyyy-MM-dd'),
        periodEndDate: format(end, 'yyyy-MM-dd'),
      };
    }
    if (trendPeriod === 'day') start = end;
    else if (trendPeriod === 'week') start = subDays(end, 6);
    else if (trendPeriod === '30d') start = subDays(end, 29);
    else if (trendPeriod === 'lastMonth') {
      const mesAnterior = subMonths(end, 1);
      start = startOfMonth(mesAnterior);
      const endLastMonth = endOfMonth(mesAnterior);
      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(endLastMonth, 'yyyy-MM-dd'),
        periodStartDate: format(start, 'yyyy-MM-dd'),
        periodEndDate: format(endLastMonth, 'yyyy-MM-dd'),
      };
    } else if (trendPeriod === 'month') {
      start = startOfMonth(end);
    } else if (trendPeriod === '3m') start = subDays(end, 89);
    else if (trendPeriod === '6m') start = subDays(end, 179);
    else start = subDays(end, 364); // year
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      periodStartDate: format(start, 'yyyy-MM-dd'),
      periodEndDate: format(end, 'yyyy-MM-dd'),
    };
  }, [trendPeriod, customDateRange]);

  const { data: financeiroDashboard, isLoading: financeiroLoading, refetch: refetchFinanceiro } = useDashboardExecutivo(
    financeiroStart,
    financeiroEnd
  );

  // Gráfico: usar tendência do financeiro (dados reais); filtrar pelo período e preencher dias faltantes
  const trendChartData: DashboardTrendData[] = useMemo(() => {
    const emptyPoint = (dateStr: string, dateLabel: string): DashboardTrendData => ({
      date: dateLabel,
      data: dateStr,
      vendas: 0,
      os: 0,
      faturamento_os: 0,
      totalPDV: 0,
      totalOS: 0,
      totalGeral: 0,
    });

    if (financeiroDashboard?.tendencia?.length && periodStartDate && periodEndDate) {
      const byDate = new Map<string, DashboardTrendData>();

      financeiroDashboard.tendencia.forEach((t) => {
        const raw = t?.data;
        const rawStr = typeof raw === 'string' ? raw.trim() : '';
        if (!rawStr || rawStr.length < 10) return;
        const dateStr = rawStr.slice(0, 10);
        if (dateStr < periodStartDate || dateStr > periodEndDate) return;
        const d = new Date(dateStr + 'T12:00:00');
        if (Number.isNaN(d.getTime())) return;
        const dateLabel = format(d, 'dd/MM', { locale: ptBR });
        byDate.set(dateStr, {
          date: dateLabel,
          data: dateStr,
          vendas: t.totalPDV ?? 0,
          os: 0,
          faturamento_os: t.totalOS ?? 0,
          totalPDV: t.totalPDV ?? 0,
          totalOS: t.totalOS ?? 0,
          totalGeral: t.totalGeral ?? 0,
        });
      });

      const start = new Date(periodStartDate + 'T12:00:00');
      const end = new Date(periodEndDate + 'T12:00:00');
      const result: DashboardTrendData[] = [];
      let cur = new Date(start);
      while (cur <= end) {
        const dateStr = format(cur, 'yyyy-MM-dd');
        const dateLabel = format(cur, 'dd/MM', { locale: ptBR });
        result.push(byDate.get(dateStr) ?? emptyPoint(dateStr, dateLabel));
        cur = addDays(cur, 1);
      }
      return result;
    }

    if (financeiroDashboard?.tendencia?.length) {
      return financeiroDashboard.tendencia.map((t) => {
        const raw = t?.data;
        const dateStr = typeof raw === 'string' ? raw.trim() : '';
        let dateLabel = dateStr;
        if (dateStr) {
          try {
            const d = dateStr.length === 10 ? new Date(dateStr + 'T12:00:00') : new Date(dateStr);
            if (!Number.isNaN(d.getTime())) dateLabel = format(d, 'dd/MM', { locale: ptBR });
          } catch {
            // mantém dateStr se format falhar
          }
        }
        return {
          date: dateLabel || '–',
          data: dateStr || raw,
          vendas: t.totalPDV ?? 0,
          os: 0,
          faturamento_os: t.totalOS ?? 0,
          totalPDV: t.totalPDV ?? 0,
          totalOS: t.totalOS ?? 0,
          totalGeral: t.totalGeral ?? 0,
        };
      });
    }
    return trendData;
  }, [financeiroDashboard?.tendencia, trendData, periodStartDate, periodEndDate]);

  // Se modo apresentação está ativo e é gestor, mostrar modo apresentação
  if (config.presentationMode && isGestor && financialData && osData && alerts) {
    return (
      <PresentationMode
        financialData={financialData}
        osData={osData}
        alerts={alerts}
        trendData={trendChartData}
      />
    );
  }

  // Widgets habilitados ordenados
  const enabledWidgets = config.widgets
    .filter(w => w.enabled)
    .sort((a, b) => a.order - b.order);

  const isLoading = authLoading || permissionsLoading || configLoading || dataLoading;
  const showSkeleton = useDelayedLoading(isLoading, 200);

  if (showSkeleton) {
    return <DashboardSkeleton />;
  }

  if (isLoading) {
    return (
      <ModernLayout title="Dashboard" subtitle="Carregando...">
        <div className="flex flex-col h-full min-h-[200px]" aria-hidden />
      </ModernLayout>
    );
  }

  return (
    <ModernLayout 
      title="Dashboard" 
      subtitle={isGestor ? "Visão geral e gestão" : "Acesso rápido às principais funcionalidades"}
    >
      <div className="flex flex-col h-full overflow-hidden min-h-0">
        {/* Indicadores Financeiros + Alertas (6 na mesma linha) */}
        {isGestor && financialData && (
          <div className="flex-shrink-0 px-2 sm:px-3 md:px-0 pb-3 sm:pb-4 border-b border-gray-200 dark:border-gray-700 bg-background">
            <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
              <h2 className="text-base md:text-lg font-semibold">Indicadores Financeiros</h2>
              <div className="flex items-center gap-2">
                <DashboardPeriodFilter
                  value={trendPeriod}
                  onChange={setTrendPeriod}
                  periodStartDate={periodStartDate}
                  periodEndDate={periodEndDate}
                  customDateRange={trendPeriod === 'custom' ? customDateRange : undefined}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 sm:h-9 sm:w-9 p-0 shrink-0 border-gray-300 dark:border-gray-600"
                  onClick={() => {
                    const next = !valuesVisible;
                    setStoredValuesVisible(next);
                    setValuesVisible(next);
                  }}
                  title={valuesVisible ? 'Ocultar valores' : 'Exibir valores'}
                  aria-label={valuesVisible ? 'Ocultar valores em reais' : 'Exibir valores em reais'}
                >
                  {valuesVisible ? (
                    <Eye className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-muted-foreground" />
                  ) : (
                    <EyeOff className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 sm:h-9 sm:w-9 p-0 shrink-0 border-gray-300 dark:border-gray-600"
                  onClick={() => { refetch(); refetchFinanceiro(); }}
                  title="Atualizar dados"
                  aria-label="Atualizar dashboard"
                  disabled={dataLoading || financeiroLoading}
                >
                  <RefreshCw className={`h-4 w-4 sm:h-4.5 sm:w-4.5 text-muted-foreground ${dataLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <FinancialCards
                data={financialData}
                financeiroKpis={financeiroDashboard?.kpis}
                valuesVisible={valuesVisible}
                inline
                compact
              />
              {alerts && (
                <>
                  <Card
                    className="border-2 border-orange-300 dark:border-orange-600 shadow-sm hover:shadow-md transition-all cursor-pointer min-w-0 bg-orange-50 dark:bg-orange-950/30 py-1 px-2"
                    onClick={() => navigate('/produtos?filter=estoque_baixo')}
                  >
                    <CardHeader className="pb-1 pt-2 px-2">
                      <CardTitle className="text-[10px] sm:text-xs font-semibold flex items-center gap-1 text-orange-700 dark:text-orange-400">
                        <Package className="h-5 w-5 shrink-0" />
                        Estoque Baixo
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-2 pb-2 pt-0">
                      <div className="text-sm sm:text-base font-bold">{alerts.estoqueBaixo}</div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Produtos com menos de 5 unidades</p>
                    </CardContent>
                  </Card>
                  <Card
                    className={`border-2 shadow-sm hover:shadow-md transition-all cursor-pointer min-w-0 py-1 px-2 ${alerts.caixaAberto ? 'border-green-300 bg-green-50 dark:border-green-600 dark:bg-green-950/30' : 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900/50'}`}
                    onClick={() => navigate('/pdv/caixa')}
                  >
                    <CardHeader className="pb-1 pt-2 px-2">
                      <CardTitle className="text-[10px] sm:text-xs font-semibold flex items-center gap-1 text-gray-700 dark:text-gray-300">
                        <Wallet className="h-5 w-5 shrink-0" />
                        Caixa Aberto
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-2 pb-2 pt-0">
                      <div className="text-sm sm:text-base font-bold">{alerts.caixaAberto ? 'Sim' : 'Não'}</div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{alerts.caixaAberto ? 'Caixa está aberto' : 'Caixa está fechado'}</p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        )}

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin px-2 sm:px-3 md:px-0 pt-3 sm:pt-4 min-h-0">
          <div className="space-y-4 sm:space-y-5 md:space-y-6 pb-4 sm:pb-6 max-w-full">
            {/* Renderizar widgets conforme configuração (exceto financial-cards que está fixo) */}
            {enabledWidgets.map((widget) => {
              switch (widget.id) {
                case 'financial-cards':
                  // Já renderizado fixo no topo
                  return null;

                case 'os-status':
                  if (!osData) return null;
                  return (
                    <div key={widget.id} className="w-full min-w-0">
                      <h2 className="text-base md:text-lg font-semibold mb-2 sm:mb-3">Ordens de Serviço</h2>
                      <OSStatusCards data={osData} showValues={isGestor} />
                    </div>
                  );

                case 'alerts': {
                  if (!isGestor || !alerts) return null;
                  const hasAlertsToShow = alerts.osParadas > 0 || alerts.osSemAtualizacao > 0;
                  if (!hasAlertsToShow) return null;
                  return (
                    <div key={widget.id} className="w-full min-w-0">
                      <h2 className="text-base md:text-lg font-semibold mb-2 sm:mb-3">Alertas de Gestão</h2>
                      <AlertCards alerts={alerts} excludeTopRow />
                    </div>
                  );
                }

                case 'trend-charts':
                  if (!isGestor) return null;
                  return (
                    <div key={widget.id} className="w-full min-w-0">
                      <TrendCharts
                        data={trendChartData}
                        valuesVisible={valuesVisible}
                        period={trendPeriod}
                        hidePeriodSelector
                      />
                    </div>
                  );

                default:
                  return null;
              }
            })}
          </div>
        </div>
      </div>
    </ModernLayout>
  );
};

export default Index;
