import { CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  recebido: boolean;
  className?: string;
};

export function PedidoStatusBadge({ recebido, className }: Props) {
  if (recebido) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
          'border border-emerald-500/40 bg-emerald-500/10 text-emerald-700',
          'dark:border-emerald-400/40 dark:bg-emerald-400/15 dark:text-emerald-300',
          className
        )}
      >
        <CheckCircle2 className="h-3 w-3" />
        Recebido
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        'border border-amber-500/40 bg-amber-500/10 text-amber-700',
        'dark:border-amber-400/40 dark:bg-amber-400/15 dark:text-amber-300',
        className
      )}
    >
      <Clock className="h-3 w-3" />
      Pendente
    </span>
  );
}
