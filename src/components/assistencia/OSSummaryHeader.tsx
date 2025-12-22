import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Smartphone, DollarSign, Wallet, Calendar, UserCircle, AlertTriangle } from 'lucide-react';
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
}: OSSummaryHeaderProps) {
  const saldoPendente = valorTotal - valorPago;
  const statusLabel = status ? STATUS_OS_LABELS[status as keyof typeof STATUS_OS_LABELS] || status : 'N/A';
  const statusColor = status ? STATUS_OS_COLORS[status as keyof typeof STATUS_OS_COLORS] || 'bg-gray-500' : 'bg-gray-500';

  return (
    <Card className="sticky top-0 z-10 border-2 border-gray-300 shadow-sm mb-3 md:mb-4">
      <CardContent className="p-2 md:p-3">
        {/* Número da OS - destaque no topo */}
        {numeroOS && (
          <div className="mb-2 md:mb-3 pb-2 md:pb-3 border-b-2 border-gray-300">
            <h2 className="text-base md:text-lg font-bold text-primary">OS #{numeroOS}</h2>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2 md:gap-3 items-center">
          {/* Cliente */}
          <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
            <User className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs text-muted-foreground">Cliente</p>
              <p className="text-xs md:text-sm font-medium truncate">{clienteNome || 'Não informado'}</p>
            </div>
          </div>

          {/* Modelo */}
          <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
            <Smartphone className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs text-muted-foreground">Modelo</p>
              <p className="text-xs md:text-sm font-medium truncate">{modeloNome || 'Não informado'}</p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Status</p>
              <Badge className={cn('text-[10px] md:text-xs text-white', statusColor)}>
                {statusLabel}
              </Badge>
            </div>
          </div>

          {/* Valor Total */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <DollarSign className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs text-muted-foreground">Valor Total</p>
              <p className="text-xs md:text-sm font-semibold text-green-600">
                {currencyFormatters.brl(valorTotal)}
              </p>
            </div>
          </div>

          {/* Valor Pago */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <Wallet className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs text-muted-foreground">Valor Pago</p>
              <p className="text-xs md:text-sm font-semibold text-blue-600">
                {currencyFormatters.brl(valorPago)}
              </p>
            </div>
          </div>

          {/* Previsão de Entrega */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs text-muted-foreground">Previsão</p>
              <p className="text-xs md:text-sm font-medium">
                {previsaoEntrega ? dateFormatters.short(previsaoEntrega) : 'Não definida'}
              </p>
            </div>
          </div>

          {/* Técnico */}
          <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
            <UserCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs text-muted-foreground">Técnico</p>
              <p className="text-xs md:text-sm font-medium truncate">{tecnicoNome || 'Não atribuído'}</p>
            </div>
          </div>
        </div>

        {/* Saldo Pendente - destaque se houver */}
        {saldoPendente > 0 && (
          <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t-2 border-gray-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4 text-orange-500" />
              <span className="text-xs md:text-sm font-medium text-orange-600">
                Saldo Pendente: {currencyFormatters.brl(saldoPendente)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

