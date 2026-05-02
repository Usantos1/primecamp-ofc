import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { ClipboardList, Clock, CheckCircle2, Wallet } from 'lucide-react';
import { currencyFormatters } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { totalCustoPedido, type Pedido } from '@/hooks/usePedidos';

type Props = {
  pedidos: Pedido[];
};

type Metric = {
  label: string;
  value: string;
  icon: typeof ClipboardList;
  iconClass: string;
};

export function PedidosResumoCards({ pedidos }: Props) {
  const metrics = useMemo<Metric[]>(() => {
    const total = pedidos.length;
    const pendentes = pedidos.filter((p) => !p.recebido);
    const recebidos = pedidos.filter((p) => p.recebido);
    const valorPendente = pendentes.reduce((s, p) => s + totalCustoPedido(p.itens), 0);

    return [
      {
        label: 'Total de pedidos',
        value: String(total),
        icon: ClipboardList,
        iconClass:
          'bg-blue-500/10 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300',
      },
      {
        label: 'Pendentes',
        value: String(pendentes.length),
        icon: Clock,
        iconClass:
          'bg-amber-500/10 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300',
      },
      {
        label: 'Recebidos',
        value: String(recebidos.length),
        icon: CheckCircle2,
        iconClass:
          'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300',
      },
      {
        label: 'Custo pendente',
        value: currencyFormatters.brl(valorPendente),
        icon: Wallet,
        iconClass:
          'bg-violet-500/10 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300',
      },
    ];
  }, [pedidos]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <Card
            key={m.label}
            className="rounded-2xl md:rounded-full border-2 border-gray-300 dark:border-gray-700 px-3 md:px-4 py-0 h-14 flex items-center gap-3 min-w-0 overflow-hidden"
          >
            <div
              className={cn(
                'h-9 w-9 rounded-full flex items-center justify-center shrink-0',
                m.iconClass
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 md:flex md:items-center md:justify-between md:gap-2">
              <p className="text-[11px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">
                {m.label}
              </p>
              <p className="text-base sm:text-lg font-bold text-foreground tabular-nums truncate md:shrink-0">
                {m.value}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
