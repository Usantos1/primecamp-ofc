import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { from } from '@/integrations/db/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

const round2 = (n: number) => Math.round(n * 100) / 100;

export type FormaPagamento = string;

export type CaixaGeralDateFilter = 'today' | 'week' | 'month' | 'all' | 'custom';

export interface CaixaGeralPeriod {
  dateFilter: CaixaGeralDateFilter;
  customDateStart?: Date;
  customDateEnd?: Date;
}

function getDateRange(period: CaixaGeralPeriod): { start: string; end: string } | null {
  const now = new Date();
  if (period.dateFilter === 'all') return null;
  if (period.dateFilter === 'custom' && period.customDateStart && period.customDateEnd) {
    return {
      start: startOfDay(period.customDateStart).toISOString(),
      end: endOfDay(period.customDateEnd).toISOString(),
    };
  }
  if (period.dateFilter === 'today') {
    return { start: startOfDay(now).toISOString(), end: endOfDay(now).toISOString() };
  }
  if (period.dateFilter === 'week') {
    return { start: startOfDay(subDays(now, 6)).toISOString(), end: endOfDay(now).toISOString() };
  }
  if (period.dateFilter === 'month') {
    return { start: startOfDay(subDays(now, 29)).toISOString(), end: endOfDay(now).toISOString() };
  }
  return null;
}

export interface TotaisPorForma {
  bruto: number;
  taxa: number;
  liquido: number;
}

export interface LedgerEntry {
  id: string;
  data: string;
  tipo: 'entrada_venda' | 'sangria' | 'suprimento' | 'transferencia' | 'pagamento_conta' | 'retirada_lucro';
  forma_pagamento: string;
  descricao: string;
  valor_bruto: number;
  valor_taxa: number;
  valor_liquido: number;
  sale_numero?: number;
  session_numero?: number;
  forma_destino?: string;
}

export function useCaixaGeral(period: CaixaGeralPeriod) {
  const dateRange = useMemo(() => getDateRange(period), [period.dateFilter, period.customDateStart?.getTime(), period.customDateEnd?.getTime()]);

  const paymentsQuery = useQuery({
    queryKey: ['caixa-geral-payments', dateRange?.start ?? 'all', dateRange?.end ?? 'all'],
    queryFn: async () => {
      let salesQuery = from('sales').select('id, numero, created_at').eq('status', 'paid');
      if (dateRange) {
        salesQuery = salesQuery.gte('created_at', dateRange.start).lte('created_at', dateRange.end);
      }
      const { data: sales } = await salesQuery.execute();
      const saleIds = (sales || []).map((s: any) => s.id).filter(Boolean);
      if (saleIds.length === 0) return { payments: [] as any[], salesMap: {} as Record<string, number> };
      const { data: payments, error } = await from('payments')
        .select('id, sale_id, forma_pagamento, valor, valor_repasse, taxa_cartao, parcelas, created_at')
        .in('sale_id', saleIds)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })
        .execute();
      if (error) throw error;
      const salesMap: Record<string, number> = {};
      (sales || []).forEach((s: any) => { salesMap[s.id] = s.numero ?? 0; });
      return { payments: payments || [], salesMap };
    },
  });

  const movementsQuery = useQuery({
    queryKey: ['caixa-geral-movements', dateRange?.start ?? 'all', dateRange?.end ?? 'all'],
    queryFn: async () => {
      let movQuery = from('cash_movements')
        .select('id, session_id, tipo, valor, motivo, created_at')
        .order('created_at', { ascending: false });
      if (dateRange) {
        movQuery = movQuery.gte('created_at', dateRange.start).lte('created_at', dateRange.end);
      }
      const { data, error } = await movQuery.execute();
      if (error) throw error;
      const sessions = new Set((data || []).map((m: any) => m.session_id));
      let sessionsMap: Record<string, number> = {};
      if (sessions.size > 0) {
        const { data: sessData } = await from('cash_register_sessions')
          .select('id, numero')
          .in('id', Array.from(sessions))
          .execute();
        (sessData || []).forEach((s: any) => { sessionsMap[s.id] = s.numero ?? 0; });
      }
      return { movements: data || [], sessionsMap };
    },
  });

  const treasuryQuery = useQuery({
    queryKey: ['caixa-geral-treasury', dateRange?.start ?? 'all', dateRange?.end ?? 'all'],
    queryFn: async () => {
      let q = from('treasury_movements').select('id, tipo, forma_origem, forma_destino, valor, motivo, bill_id, created_at').order('created_at', { ascending: false });
      if (dateRange) {
        q = q.gte('created_at', dateRange.start).lte('created_at', dateRange.end);
      }
      const { data, error } = await q.execute();
      if (error) return []; // tabela pode não existir ainda
      return (data || []) as any[];
    },
  });

  const payments = paymentsQuery.data?.payments ?? [];
  const salesMap = paymentsQuery.data?.salesMap ?? {};
  const movements = movementsQuery.data?.movements ?? [];
  const sessionsMap = movementsQuery.data?.sessionsMap ?? {};
  const treasuryMovements = treasuryQuery.data ?? [];

  const totaisPorForma = useMemo(() => {
    const map: Record<string, { bruto: number; taxa: number; liquido: number }> = {};
    payments.forEach((p: any) => {
      const forma = p.forma_pagamento || 'outro';
      const valor = Number(p.valor) || 0;
      const valorRepasse = p.valor_repasse != null ? Number(p.valor_repasse) : null;
      const taxaPct = Number(p.taxa_cartao) || 0;
      const liquido = valorRepasse != null && valorRepasse >= 0
        ? valorRepasse
        : round2(valor * (1 - taxaPct / 100));
      const taxa = round2(valor - liquido);
      if (!map[forma]) map[forma] = { bruto: 0, taxa: 0, liquido: 0 };
      map[forma].bruto = round2(map[forma].bruto + valor);
      map[forma].taxa = round2(map[forma].taxa + taxa);
      map[forma].liquido = round2(map[forma].liquido + liquido);
    });
    return map;
  }, [payments]);

  const sangriaTotal = useMemo(() => {
    return round2(movements.filter((m: any) => m.tipo === 'sangria').reduce((s, m) => s + Number(m.valor || 0), 0));
  }, [movements]);

  const suprimentoTotal = useMemo(() => {
    return round2(movements.filter((m: any) => m.tipo === 'suprimento').reduce((s, m) => s + Number(m.valor || 0), 0));
  }, [movements]);

  const saldoPorForma = useMemo(() => {
    const saldos: Record<string, number> = {};
    Object.entries(totaisPorForma).forEach(([forma, t]) => {
      saldos[forma] = t.liquido;
    });
    saldos['dinheiro'] = round2((saldos['dinheiro'] ?? 0) + suprimentoTotal - sangriaTotal);
    treasuryMovements.forEach((tm: any) => {
      const valor = Number(tm.valor) || 0;
      const orig = tm.forma_origem || 'dinheiro';
      const dest = tm.forma_destino;
      if (tm.tipo === 'transferencia' && dest) {
        saldos[orig] = round2((saldos[orig] ?? 0) - valor);
        saldos[dest] = round2((saldos[dest] ?? 0) + valor);
      } else {
        saldos[orig] = round2((saldos[orig] ?? 0) - valor);
      }
    });
    return saldos;
  }, [totaisPorForma, sangriaTotal, suprimentoTotal, treasuryMovements]);

  const ledger = useMemo(() => {
    const entries: LedgerEntry[] = [];
    payments.slice(0, 200).forEach((p: any) => {
      const valor = Number(p.valor) || 0;
      const valorRepasse = p.valor_repasse != null ? Number(p.valor_repasse) : null;
      const taxaPct = Number(p.taxa_cartao) || 0;
      const liquido = valorRepasse != null && valorRepasse >= 0 ? valorRepasse : round2(valor * (1 - taxaPct / 100));
      const taxa = round2(valor - liquido);
      entries.push({
        id: `p-${p.id}`,
        data: p.created_at,
        tipo: 'entrada_venda',
        forma_pagamento: p.forma_pagamento,
        descricao: `Venda #${salesMap[p.sale_id] ?? '-'}`,
        valor_bruto: valor,
        valor_taxa: taxa,
        valor_liquido: liquido,
        sale_numero: salesMap[p.sale_id],
      });
    });
    movements.slice(0, 200).forEach((m: any) => {
      const valor = Number(m.valor) || 0;
      entries.push({
        id: `m-${m.id}`,
        data: m.created_at,
        tipo: m.tipo as 'sangria' | 'suprimento',
        forma_pagamento: 'dinheiro',
        descricao: m.tipo === 'sangria' ? `Sangria${m.motivo ? `: ${m.motivo}` : ''}` : `Suprimento${m.motivo ? `: ${m.motivo}` : ''}`,
        valor_bruto: valor,
        valor_taxa: 0,
        valor_liquido: m.tipo === 'suprimento' ? valor : -valor,
        session_numero: sessionsMap[m.session_id],
      });
    });
    treasuryMovements.slice(0, 200).forEach((tm: any) => {
      const valor = Number(tm.valor) || 0;
      const tipo = tm.tipo as 'transferencia' | 'pagamento_conta' | 'retirada_lucro' | 'sangria';
      let desc = '';
      if (tipo === 'transferencia') desc = tm.forma_destino ? `→ ${tm.forma_destino}` : 'Transferência';
      else if (tipo === 'pagamento_conta') desc = `Conta a pagar${tm.motivo ? `: ${tm.motivo}` : ''}`;
      else if (tipo === 'sangria') desc = tm.motivo ? `Sangria: ${tm.motivo}` : 'Sangria';
      else desc = tm.motivo ? `Lucro: ${tm.motivo}` : 'Retirada como lucro';
      entries.push({
        id: `tm-${tm.id}`,
        data: tm.created_at,
        tipo,
        forma_pagamento: tm.forma_origem,
        forma_destino: tm.forma_destino,
        descricao: desc,
        valor_bruto: valor,
        valor_taxa: 0,
        valor_liquido: -valor,
      });
    });
    entries.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    return entries.slice(0, 200);
  }, [payments, movements, salesMap, sessionsMap, treasuryMovements]);

  return {
    totaisPorForma,
    sangriaTotal,
    suprimentoTotal,
    saldoPorForma,
    ledger,
    isLoading: paymentsQuery.isLoading || movementsQuery.isLoading || treasuryQuery.isLoading,
    refetch: () => { paymentsQuery.refetch(); movementsQuery.refetch(); treasuryQuery.refetch(); },
  };
}
