import { useState, useEffect, useCallback, useRef } from 'react';
import { from } from '@/integrations/db/client';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays, subMonths, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { currencyFormatters } from '@/utils/formatters';

export type TrendPeriod = 'day' | 'week' | '30d' | 'lastMonth' | 'month' | '3m' | '6m' | 'year' | 'custom';

export interface CustomDateRange {
  start: string; // yyyy-MM-dd
  end: string;
}

export interface DashboardFinancialData {
  faturamentoDia: number;
  faturamentoMes: number;
  ticketMedio: number;
  totalCaixa: number;
  vendasHoje: number;
  vendasMes: number;
}

export interface DashboardOSData {
  abertas: number;
  emAndamento: number;
  aguardando: number;
  finalizadas: number;
  aguardandoRetirada: number;
  total: number;
}

export interface DashboardAlerts {
  osParadas: number;
  estoqueBaixo: number;
  caixaAberto: boolean;
  osSemAtualizacao: number;
}

export interface DashboardTrendData {
  date: string;
  /** Para eixo X e tooltip (yyyy-MM-dd) */
  data?: string;
  /** Faturamento vendas de produtos (PDV) em R$ */
  vendas: number;
  /** Quantidade de OS criadas */
  os: number;
  /** Faturamento de ordens de serviço em R$ (valor_total) */
  faturamento_os: number;
  /** PDV em R$ (igual a vendas) - mesmo formato do /financeiro */
  totalPDV: number;
  /** OS em R$ (igual a faturamento_os) - mesmo formato do /financeiro */
  totalOS: number;
  /** Total PDV + OS em R$ - mesmo formato do /financeiro */
  totalGeral: number;
}

const DASHBOARD_PERIOD_STORAGE_KEY = 'primecamp_dashboard_trend_period';
const DASHBOARD_CUSTOM_RANGE_KEY = 'primecamp_dashboard_custom_range';

function getStoredTrendPeriod(): TrendPeriod {
  try {
    const v = localStorage.getItem(DASHBOARD_PERIOD_STORAGE_KEY);
    if (v && ['day', 'week', '30d', 'lastMonth', 'month', '3m', '6m', 'year', 'custom'].includes(v)) return v as TrendPeriod;
  } catch {}
  return 'week';
}

function getStoredCustomRange(): CustomDateRange | null {
  try {
    const raw = localStorage.getItem(DASHBOARD_CUSTOM_RANGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { start?: string; end?: string };
    if (parsed?.start && parsed?.end) return { start: parsed.start, end: parsed.end };
  } catch {}
  return null;
}

export function useDashboardData() {
  const [financialData, setFinancialData] = useState<DashboardFinancialData | null>(null);
  const [osData, setOsData] = useState<DashboardOSData | null>(null);
  const [alerts, setAlerts] = useState<DashboardAlerts | null>(null);
  const [trendData, setTrendData] = useState<DashboardTrendData[]>([]);
  const [trendPeriod, setTrendPeriodState] = useState<TrendPeriod>(getStoredTrendPeriod);
  const [customDateRange, setCustomDateRangeState] = useState<CustomDateRange | null>(getStoredCustomRange);
  const [loading, setLoading] = useState(true);
  const periodChangeCount = useRef(0);

  const setTrendPeriod = useCallback((period: TrendPeriod, customRange?: CustomDateRange) => {
    setTrendPeriodState(period);
    if (period === 'custom' && customRange) {
      setCustomDateRangeState(customRange);
      try {
        localStorage.setItem(DASHBOARD_CUSTOM_RANGE_KEY, JSON.stringify(customRange));
      } catch {}
    }
    try {
      localStorage.setItem(DASHBOARD_PERIOD_STORAGE_KEY, period);
    } catch {}
  }, []);

  const loadDashboardData = useCallback(async (period: TrendPeriod) => {
    try {
      setLoading(true);
      await loadFinancialData();
      await loadOSData();
      await loadAlerts();
      await loadTrendData(period);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData(trendPeriod);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carregamento inicial apenas uma vez
  }, []);

  useEffect(() => {
    if (periodChangeCount.current === 0) {
      periodChangeCount.current = 1;
      return;
    }
    if (trendPeriod === 'custom') return; // gráfico usa só API financeiro com datas customizadas
    loadTrendData(trendPeriod);
  }, [trendPeriod]);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      await loadFinancialData();
      await loadOSData();
      await loadAlerts();
      await loadTrendData(trendPeriod);
    } catch (error) {
      console.error('Erro ao atualizar dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [trendPeriod]);

  const loadFinancialData = async () => {
    try {
      const hoje = new Date();
      const inicioDia = startOfDay(hoje);
      const fimDia = endOfDay(hoje);
      const inicioMes = startOfMonth(hoje);
      const fimMes = endOfMonth(hoje);

      // Vendas do dia - apenas status 'paid' e 'partial' são válidos
      const { data: vendasDia, error: errorDia } = await from('sales')
        .select('total, total_pago, status, created_at, company_id')
        .in('status', ['paid', 'partial'])
        .gte('created_at', inicioDia.toISOString())
        .lte('created_at', fimDia.toISOString())
        .execute();

      if (errorDia) {
        console.error('[Dashboard] Erro ao buscar vendas do dia:', errorDia);
      } else {
        console.log('[Dashboard] Vendas do dia encontradas:', vendasDia?.length || 0, 'Período:', inicioDia.toISOString(), 'até', fimDia.toISOString());
      }

      // Vendas do mês - se não houver vendas no mês atual, buscar dos últimos 30 dias como fallback
      let vendasMes = null;
      let errorMes = null;
      
      const { data: vendasMesAtual, error: errorMesAtual } = await from('sales')
        .select('total, total_pago, status, created_at, company_id')
        .in('status', ['paid', 'partial'])
        .gte('created_at', inicioMes.toISOString())
        .lte('created_at', fimMes.toISOString())
        .execute();

      if (errorMesAtual) {
        console.error('[Dashboard] Erro ao buscar vendas do mês:', errorMesAtual);
        errorMes = errorMesAtual;
      } else {
        console.log('[Dashboard] Vendas do mês atual encontradas:', vendasMesAtual?.length || 0, 'Período:', inicioMes.toISOString(), 'até', fimMes.toISOString());
        
        // Se não há vendas no mês atual, buscar dos últimos 30 dias
        if (!vendasMesAtual || vendasMesAtual.length === 0) {
          const inicio30Dias = startOfDay(subDays(hoje, 30));
          const { data: vendas30Dias, error: error30Dias } = await from('sales')
            .select('total, total_pago, status, created_at, company_id')
            .in('status', ['paid', 'partial'])
            .gte('created_at', inicio30Dias.toISOString())
            .lte('created_at', fimMes.toISOString())
            .execute();
          
          if (error30Dias) {
            console.error('[Dashboard] Erro ao buscar vendas dos últimos 30 dias:', error30Dias);
            vendasMes = vendasMesAtual; // Usar resultado vazio
          } else {
            console.log('[Dashboard] Vendas dos últimos 30 dias encontradas:', vendas30Dias?.length || 0, 'Período:', inicio30Dias.toISOString(), 'até', fimMes.toISOString());
            vendasMes = vendas30Dias;
          }
        } else {
          vendasMes = vendasMesAtual;
        }
      }

      const faturamentoDia = vendasDia?.reduce((acc, v) => acc + Number(v.total_pago || v.total || 0), 0) || 0;
      const faturamentoMes = vendasMes?.reduce((acc, v) => acc + Number(v.total_pago || v.total || 0), 0) || 0;
      
      console.log('[Dashboard] Faturamento calculado - Dia:', faturamentoDia, 'Mês/30d:', faturamentoMes);
      const vendasHoje = vendasDia?.length || 0;
      const vendasMesCount = vendasMes?.length || 0;
      // Ticket médio baseado no mês (mais representativo)
      const ticketMedio = vendasMesCount > 0 ? faturamentoMes / vendasMesCount : 0;

      // Total em caixa (sessão aberta)
      const { data: caixaSession } = await from('cash_register_sessions')
        .select('valor_inicial, total_entradas, total_saidas')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const totalCaixa = caixaSession 
        ? (caixaSession.valor_inicial || 0) + (caixaSession.total_entradas || 0) - (caixaSession.total_saidas || 0)
        : 0;

      setFinancialData({
        faturamentoDia,
        faturamentoMes,
        ticketMedio,
        totalCaixa,
        vendasHoje,
        vendasMes: vendasMesCount,
      });
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
    }
  };

  const loadOSData = async () => {
    try {
      const { data: osList } = await from('ordens_servico')
        .select('status')
        .execute();

      if (!osList) return;

      const stats = {
        abertas: 0,
        emAndamento: 0,
        aguardando: 0,
        finalizadas: 0,
        aguardandoRetirada: 0,
        total: osList.length,
      };

      osList.forEach(os => {
        switch (os.status) {
          case 'aberta':
            stats.abertas++;
            break;
          case 'em_andamento':
            stats.emAndamento++;
            break;
          case 'aguardando':
            stats.aguardando++;
            break;
          case 'finalizada':
            stats.finalizadas++;
            break;
          case 'aguardando_retirada':
            stats.aguardandoRetirada++;
            break;
        }
      });

      setOsData(stats);
    } catch (error) {
      console.error('Erro ao carregar dados de OS:', error);
    }
  };

  const loadAlerts = async () => {
    try {
      // OS paradas (sem atualização há mais de 3 dias)
      const tresDiasAtras = subDays(new Date(), 3);
      const { data: osParadas } = await from('ordens_servico')
        .select('id')
        .in('status', ['aberta', 'em_andamento', 'aguardando'])
        .lt('updated_at', tresDiasAtras.toISOString())
        .execute();

      // Estoque baixo (menos de 5 unidades)
      const { data: produtosBaixoEstoque } = await from('produtos')
        .select('id')
        .lt('quantidade', 5)
        .gt('quantidade', 0)
        .execute();

      // Caixa aberto
      const { data: caixaAberto } = await from('cash_register_sessions')
        .select('id')
        .eq('status', 'open')
        .limit(1)
        .single();

      // OS sem atualização há mais de 7 dias
      const seteDiasAtras = subDays(new Date(), 7);
      const { data: osSemAtualizacao } = await from('ordens_servico')
        .select('id')
        .in('status', ['aberta', 'em_andamento', 'aguardando'])
        .lt('updated_at', seteDiasAtras.toISOString())
        .execute();

      setAlerts({
        osParadas: osParadas?.length || 0,
        estoqueBaixo: produtosBaixoEstoque?.length || 0,
        caixaAberto: !!caixaAberto,
        osSemAtualizacao: osSemAtualizacao?.length || 0,
      });
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
    }
  };

  const loadTrendData = useCallback(async (period: TrendPeriod) => {
    if (period === 'custom') return; // tendência custom vem só da API financeiro
    try {
      const hoje = new Date();
      let items: { date: string; dateISO: string }[] = [];

      if (period === 'day') {
        const d = startOfDay(hoje);
        items = [{ date: 'Hoje', dateISO: format(d, 'yyyy-MM-dd') }];
      } else if (period === 'week') {
        items = Array.from({ length: 7 }, (_, i) => {
          const date = subDays(hoje, 6 - i);
          return { date: format(date, 'dd/MM', { locale: ptBR }), dateISO: format(date, 'yyyy-MM-dd') };
        });
      } else if (period === '30d') {
        items = Array.from({ length: 30 }, (_, i) => {
          const date = subDays(hoje, 29 - i);
          return { date: format(date, 'dd/MM', { locale: ptBR }), dateISO: format(date, 'yyyy-MM-dd') };
        });
      } else if (period === 'lastMonth') {
        const mesAnterior = subMonths(hoje, 1);
        const inicio = startOfMonth(mesAnterior);
        const fim = endOfMonth(mesAnterior);
        const dias = fim.getDate(); // quantidade de dias no mês
        items = Array.from({ length: dias }, (_, i) => {
          const date = new Date(inicio);
          date.setDate(inicio.getDate() + i);
          return { date: format(date, 'dd/MM', { locale: ptBR }), dateISO: format(date, 'yyyy-MM-dd') };
        });
      } else if (period === 'month') {
        // Mês vigente: do dia 1 até hoje
        const inicioMes = startOfMonth(hoje);
        const diffMs = hoje.getTime() - inicioMes.getTime();
        const diasNoMesAteHoje = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
        items = Array.from({ length: diasNoMesAteHoje }, (_, i) => {
          const date = new Date(inicioMes);
          date.setDate(inicioMes.getDate() + i);
          return { date: format(date, 'dd/MM', { locale: ptBR }), dateISO: format(date, 'yyyy-MM-dd') };
        });
      } else if (period === '3m') {
        items = Array.from({ length: 13 }, (_, i) => {
          const weekStart = startOfWeek(subWeeks(hoje, 12 - i), { weekStartsOn: 1 });
          return { date: format(weekStart, 'dd/MM', { locale: ptBR }), dateISO: format(weekStart, 'yyyy-MM-dd'), isWeek: true as const };
        });
      } else if (period === '6m') {
        items = Array.from({ length: 26 }, (_, i) => {
          const weekStart = startOfWeek(subWeeks(hoje, 25 - i), { weekStartsOn: 1 });
          return { date: format(weekStart, 'dd/MM', { locale: ptBR }), dateISO: format(weekStart, 'yyyy-MM-dd'), isWeek: true as const };
        });
      } else {
        // year: 12 meses
        items = Array.from({ length: 12 }, (_, i) => {
          const date = subMonths(hoje, 11 - i);
          return { date: format(date, 'MMM/yy', { locale: ptBR }), dateISO: format(startOfMonth(date), 'yyyy-MM-dd') };
        });
      }

      const fetchPoint = async (item: { date: string; dateISO: string; isWeek?: boolean }, isMonthAggregate: boolean) => {
        let inicio: Date;
        let fim: Date;
        if (isMonthAggregate) {
          inicio = startOfMonth(new Date(item.dateISO));
          fim = endOfMonth(inicio);
        } else if (item.isWeek) {
          inicio = startOfWeek(new Date(item.dateISO), { weekStartsOn: 1 });
          fim = endOfWeek(inicio, { weekStartsOn: 1 });
        } else {
          inicio = startOfDay(new Date(item.dateISO));
          fim = endOfDay(inicio);
        }
        const { data: vendas } = await from('sales')
          .select('id, total, total_pago')
          .in('status', ['paid', 'partial'])
          .gte('created_at', inicio.toISOString())
          .lte('created_at', fim.toISOString())
          .execute();
        const { data: osList } = await from('ordens_servico')
          .select('id')
          .gte('created_at', inicio.toISOString())
          .lte('created_at', fim.toISOString())
          .execute();
        const osIds = (osList || []).map((o: any) => o.id).filter(Boolean);
        let faturamentoOS = 0;
        if (osIds.length > 0) {
          const { data: itensOS } = await from('os_items')
            .select('ordem_servico_id, valor_total')
            .in('ordem_servico_id', osIds)
            .execute();
          faturamentoOS = (itensOS || []).reduce((acc: number, i: any) => acc + Number(i.valor_total ?? 0), 0);
        }
        const faturamentoDia = vendas?.reduce((acc, v) => acc + Number(v.total_pago || v.total || 0), 0) || 0;
        const totalGeral = faturamentoDia + faturamentoOS;
        return {
          date: item.date,
          data: item.dateISO,
          vendas: faturamentoDia,
          os: osIds.length,
          faturamento_os: faturamentoOS,
          totalPDV: faturamentoDia,
          totalOS: faturamentoOS,
          totalGeral,
        };
      };

      const isMonthAggregate = period === 'year';
      const trends = await Promise.all(items.map((item) => fetchPoint(item as { date: string; dateISO: string; isWeek?: boolean }, isMonthAggregate)));
      setTrendData(trends);
    } catch (error) {
      console.error('Erro ao carregar dados de tendência:', error);
    }
  }, []);

  return {
    financialData,
    osData,
    alerts,
    trendData,
    trendPeriod,
    setTrendPeriod,
    customDateRange: trendPeriod === 'custom' ? customDateRange : null,
    loading,
    refetch,
  };
}


