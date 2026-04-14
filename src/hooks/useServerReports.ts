import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';

export type ServerReportTabKey =
  | 'payments'
  | 'products'
  | 'purchases'
  | 'stock'
  | 'assistencia'
  | 'refunds'
  | 'clients'
  | 'audit';

export type PaymentMethodRow = {
  forma_pagamento: string;
  payment_count: number;
  total_amount: string | number;
};

export type TopProductRow = {
  produto_id: string | null;
  produto_nome: string;
  qty: string | number;
  revenue: string | number;
};

export type PedidoRow = {
  id: string;
  nome: string;
  recebido: boolean;
  created_at: string;
  valor_compra_total: string | number;
};

export type FornecedorOsRow = {
  fornecedor: string;
  itens_count: number;
  valor_total: string | number;
};

export type StockMovRow = {
  id: string;
  tipo: string;
  motivo: string | null;
  quantidade_delta: number | null;
  quantidade_antes: number | null;
  quantidade_depois: number | null;
  created_at: string;
  user_nome: string | null;
  produto_nome: string;
};

export type OsStatusRow = { status: string; cnt: number };

function qstart(start?: string, end?: string) {
  return !!start && !!end;
}

async function getJson(path: string) {
  const { data, error } = await apiClient.get(path);
  if (error) throw new Error(typeof error === 'string' ? error : 'Erro na API');
  if (!data?.success) throw new Error(data?.error || 'Resposta inválida');
  return data;
}

export function useServerReportsQueries(
  startDate: string | undefined,
  endDate: string | undefined,
  activeTab: string,
  isAdmin: boolean
) {
  const base = qstart(startDate, endDate);
  const qs = `startDate=${encodeURIComponent(startDate!)}&endDate=${encodeURIComponent(endDate!)}`;

  const paymentMethods = useQuery({
    queryKey: ['server-report', 'payment-methods', startDate, endDate],
    queryFn: async () => (await getJson(`/api/reports/payment-methods?${qs}`)).rows as PaymentMethodRow[],
    enabled: base && activeTab === 'payments',
  });

  const topProducts = useQuery({
    queryKey: ['server-report', 'top-products', startDate, endDate],
    queryFn: async () => (await getJson(`/api/reports/top-products?${qs}&limit=50`)).rows as TopProductRow[],
    enabled: base && activeTab === 'products',
  });

  const purchases = useQuery({
    queryKey: ['server-report', 'purchases', startDate, endDate],
    queryFn: async () => {
      const d = await getJson(`/api/reports/purchases-suppliers?${qs}`);
      return {
        pedidos: d.pedidos as PedidoRow[],
        fornecedores_os: d.fornecedores_os as FornecedorOsRow[],
      };
    },
    enabled: base && activeTab === 'purchases',
  });

  const stock = useQuery({
    queryKey: ['server-report', 'stock', startDate, endDate],
    queryFn: async () => (await getJson(`/api/reports/stock-movements?${qs}&limit=400`)).rows as StockMovRow[],
    enabled: base && activeTab === 'stock',
  });

  const osOverview = useQuery({
    queryKey: ['server-report', 'os', startDate, endDate],
    queryFn: async () => {
      const d = await getJson(`/api/reports/os-overview?${qs}`);
      return {
        by_status: d.by_status as OsStatusRow[],
        totals: d.totals as { total_os: number; valor_total_orcado: string | number },
      };
    },
    enabled: base && activeTab === 'assistencia',
  });

  const refunds = useQuery({
    queryKey: ['server-report', 'refunds', startDate, endDate],
    queryFn: async () => {
      const d = await getJson(`/api/reports/refunds-summary?${qs}`);
      return {
        by_status: d.by_status as { status: string; cnt: number; valor: string | number }[],
        by_reason: d.by_reason as { reason: string; cnt: number; valor: string | number }[],
      };
    },
    enabled: base && activeTab === 'refunds',
  });

  const clients = useQuery({
    queryKey: ['server-report', 'clients', startDate, endDate],
    queryFn: async () => {
      const d = await getJson(`/api/reports/clients-summary?${qs}`);
      return {
        novos_clientes: d.novos_clientes as number,
        clientes_compra_distintos: d.clientes_compra_distintos as number,
        vendas_finalizadas: d.vendas_finalizadas as number,
      };
    },
    enabled: base && activeTab === 'clients',
  });

  const audit = useQuery({
    queryKey: ['server-report', 'audit', startDate, endDate],
    queryFn: async () => {
      const d = await getJson(`/api/reports/audit-activity?${qs}`);
      return {
        user_activity: d.user_activity as { tipo: string; cnt: number }[],
        audit_logs: d.audit_logs as { tipo: string; cnt: number }[],
      };
    },
    enabled: base && activeTab === 'audit' && isAdmin,
  });

  return {
    paymentMethods,
    topProducts,
    purchases,
    stock,
    osOverview,
    refunds,
    clients,
    audit,
  };
}
