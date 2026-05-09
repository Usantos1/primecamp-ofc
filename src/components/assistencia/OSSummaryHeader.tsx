import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Smartphone, DollarSign, Wallet, Calendar, UserCircle } from 'lucide-react';
import { STATUS_OS_LABELS, STATUS_OS_COLORS } from '@/types/assistencia';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { cn } from '@/lib/utils';

interface OSSummaryHeaderProps {
  numeroOS?: number;
  clienteNome?: string;
  modeloNome?: string;
  status?: string;
  valorTotal?: number;
  valorPago?: number;
  previsaoEntrega?: string;
  tecnicoNome?: string;
  onBack?: () => void;
}

export function OSSummaryHeader({
  numeroOS,
  clienteNome,
  modeloNome,
  status,
  valorTotal = 0,
  valorPago = 0,
  previsaoEntrega,
  tecnicoNome,
  onBack,
}: OSSummaryHeaderProps) {
  const statusLabel = status ? STATUS_OS_LABELS[status as keyof typeof STATUS_OS_LABELS] || status : 'N/A';
  const statusColor = status ? STATUS_OS_COLORS[status as keyof typeof STATUS_OS_COLORS] || 'bg-gray-500' : 'bg-gray-500';

  return (
    <div className="rounded-2xl border border-border bg-card/95 px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </button>
        )}

        <div className="flex min-w-0 flex-1 items-center justify-center gap-x-6 gap-y-2 flex-wrap">
        {/* OS # e Status */}
        <div className="flex items-center gap-3">
          {numeroOS && (
            <Badge variant="outline" className="text-sm font-bold px-3 py-1 border-border bg-background text-foreground">
              OS #{numeroOS}
            </Badge>
          )}
          <Badge className={cn('text-xs font-semibold px-3 py-1 text-white', statusColor)}>
            {statusLabel}
          </Badge>
        </div>

        {/* Separador */}
        <div className="h-6 w-px bg-border" />

        {/* Cliente */}
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-blue-500" />
          <span className="text-xs text-muted-foreground">Cliente:</span>
          <span className={cn(
            "text-sm font-semibold",
            clienteNome ? "text-foreground" : "text-muted-foreground italic"
          )}>
            {clienteNome || 'Não selecionado'}
          </span>
        </div>

        {/* Separador */}
        <div className="h-6 w-px bg-border" />

        {/* Modelo */}
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-purple-500" />
          <span className="text-xs text-muted-foreground">Modelo:</span>
          <span className={cn(
            "text-sm font-semibold",
            modeloNome ? "text-foreground" : "text-muted-foreground italic"
          )}>
            {modeloNome || 'N/A'}
          </span>
        </div>

        {/* Separador */}
        <div className="h-6 w-px bg-border" />

        {/* Total */}
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-500" />
          <span className="text-xs text-muted-foreground">Total:</span>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-300">
            {currencyFormatters.brl(valorTotal)}
          </span>
        </div>

        {/* Pago */}
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-blue-500" />
          <span className="text-xs text-muted-foreground">Pago:</span>
          <span className="text-sm font-bold text-blue-600 dark:text-blue-300">
            {currencyFormatters.brl(valorPago)}
          </span>
        </div>

        {/* Separador */}
        <div className="h-6 w-px bg-border" />

        {/* Previsão */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-amber-500" />
          <span className="text-xs text-muted-foreground">Prev:</span>
          <span className={cn(
            "text-sm font-semibold",
            previsaoEntrega ? "text-foreground" : "text-muted-foreground"
          )}>
            {previsaoEntrega ? dateFormatters.short(previsaoEntrega) : 'N/A'}
          </span>
        </div>

        {/* Técnico */}
        <div className="flex items-center gap-2">
          <UserCircle className="h-4 w-4 text-indigo-500" />
          <span className="text-xs text-muted-foreground">Téc:</span>
          <span className={cn(
            "text-sm font-semibold",
            tecnicoNome ? "text-foreground" : "text-muted-foreground"
          )}>
            {tecnicoNome || 'N/A'}
          </span>
        </div>
        </div>
      </div>
    </div>
  );
}
