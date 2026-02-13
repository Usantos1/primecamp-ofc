import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { from } from '@/integrations/db/client';

const round2 = (n: number) => Math.round(n * 100) / 100;

export type FormaPagamento = string;

export interface TotaisPorForma {
  bruto: number;
  taxa: number;
  liquido: number;
}

export interface LedgerEntry {
  id: string;
  data: string;
  tipo: 'entrada_venda' | 'sangria' | 'suprimento';
  forma_pagamento: string;
  descricao: string;
  valor_bruto: number;
  valor_taxa: number;
  valor_liquido: number;
  sale_numero?: number;
  session_numero?: number;
}

export function useCaixaGeral() {
  const paymentsQuery = useQuery({
    queryKey: ['caixa-geral-payments'],
    queryFn: async () => {
      const { data: sales } = await from('sales')
        .select('id, numero')
        .eq('status', 'paid')
        .execute();
      const saleIds = (sales || []).map((s: any) => s.id).filter(Boolean);
      if (saleIds.length === 0) return { payments: [] as any[], salesMap: {} as Record<string, number> };
      const { data: payments, error } = await from('payments')
        .select('id, sale_id, forma_pagamento, valor, valor_repasse, taxa_cartao, created_at')
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
    queryKey: ['caixa-geral-movements'],
    queryFn: async () => {
      const { data, error } = await from('cash_movements')
        .select('id, session_id, tipo, valor, motivo, created_at')
        .order('created_at', { ascending: false })
        .execute();
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

  const payments = paymentsQuery.data?.payments ?? [];
  const salesMap = paymentsQuery.data?.salesMap ?? {};
  const movements = movementsQuery.data?.movements ?? [];
  const sessionsMap = movementsQuery.data?.sessionsMap ?? {};

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
    return saldos;
  }, [totaisPorForma, sangriaTotal, suprimentoTotal]);

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
    entries.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    return entries.slice(0, 150);
  }, [payments, movements, salesMap, sessionsMap]);

  return {
    totaisPorForma,
    sangriaTotal,
    suprimentoTotal,
    saldoPorForma,
    ledger,
    isLoading: paymentsQuery.isLoading || movementsQuery.isLoading,
    refetch: () => { paymentsQuery.refetch(); movementsQuery.refetch(); },
  };
}
