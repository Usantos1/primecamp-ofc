import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { currencyFormatters } from '@/utils/formatters';

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
  vendas: number;
  os: number;
}

export function useDashboardData() {
  const [financialData, setFinancialData] = useState<DashboardFinancialData | null>(null);
  const [osData, setOsData] = useState<DashboardOSData | null>(null);
  const [alerts, setAlerts] = useState<DashboardAlerts | null>(null);
  const [trendData, setTrendData] = useState<DashboardTrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Carregar dados financeiros
      await loadFinancialData();
      
      // Carregar dados de OS
      await loadOSData();
      
      // Carregar alertas
      await loadAlerts();
      
      // Carregar dados de tendência
      await loadTrendData();
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFinancialData = async () => {
    try {
      const hoje = new Date();
      const inicioDia = startOfDay(hoje);
      const fimDia = endOfDay(hoje);
      const inicioMes = startOfMonth(hoje);
      const fimMes = endOfMonth(hoje);

      // Vendas do dia
      const { data: vendasDia } = await supabase
        .from('sales')
        .select('total, total_pago')
        .eq('status', 'paid')
        .gte('created_at', inicioDia.toISOString())
        .lte('created_at', fimDia.toISOString());

      // Vendas do mês
      const { data: vendasMes } = await supabase
        .from('sales')
        .select('total, total_pago')
        .eq('status', 'paid')
        .gte('created_at', inicioMes.toISOString())
        .lte('created_at', fimMes.toISOString());

      const faturamentoDia = vendasDia?.reduce((acc, v) => acc + (v.total_pago || v.total || 0), 0) || 0;
      const faturamentoMes = vendasMes?.reduce((acc, v) => acc + (v.total_pago || v.total || 0), 0) || 0;
      const vendasHoje = vendasDia?.length || 0;
      const vendasMesCount = vendasMes?.length || 0;
      const ticketMedio = vendasHoje > 0 ? faturamentoDia / vendasHoje : 0;

      // Total em caixa (sessão aberta)
      const { data: caixaSession } = await supabase
        .from('cash_register_sessions')
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
      const { data: osList } = await supabase
        .from('ordens_servico')
        .select('status');

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
      const { data: osParadas } = await supabase
        .from('ordens_servico')
        .select('id')
        .in('status', ['aberta', 'em_andamento', 'aguardando'])
        .lt('updated_at', tresDiasAtras.toISOString());

      // Estoque baixo (menos de 5 unidades)
      const { data: produtosBaixoEstoque } = await supabase
        .from('produtos')
        .select('id')
        .lt('estoque', 5)
        .gt('estoque', 0);

      // Caixa aberto
      const { data: caixaAberto } = await supabase
        .from('cash_register_sessions')
        .select('id')
        .eq('status', 'open')
        .limit(1)
        .single();

      // OS sem atualização há mais de 7 dias
      const seteDiasAtras = subDays(new Date(), 7);
      const { data: osSemAtualizacao } = await supabase
        .from('ordens_servico')
        .select('id')
        .in('status', ['aberta', 'em_andamento', 'aguardando'])
        .lt('updated_at', seteDiasAtras.toISOString());

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

  const loadTrendData = async () => {
    try {
      const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return {
          date: format(date, 'dd/MM'),
          dateISO: format(date, 'yyyy-MM-dd'),
        };
      });

      const trendPromises = ultimos7Dias.map(async ({ date, dateISO }) => {
        const inicioDia = startOfDay(new Date(dateISO));
        const fimDia = endOfDay(new Date(dateISO));

        // Vendas do dia
        const { data: vendas } = await supabase
          .from('sales')
          .select('id')
          .eq('status', 'paid')
          .gte('created_at', inicioDia.toISOString())
          .lte('created_at', fimDia.toISOString());

        // OS criadas no dia
        const { data: os } = await supabase
          .from('ordens_servico')
          .select('id')
          .gte('created_at', inicioDia.toISOString())
          .lte('created_at', fimDia.toISOString());

        return {
          date,
          vendas: vendas?.length || 0,
          os: os?.length || 0,
        };
      });

      const trends = await Promise.all(trendPromises);
      setTrendData(trends);
    } catch (error) {
      console.error('Erro ao carregar dados de tendência:', error);
    }
  };

  return {
    financialData,
    osData,
    alerts,
    trendData,
    loading,
    refresh: loadDashboardData,
  };
}


