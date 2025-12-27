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
    <Card className="sticky top-0 z-10 bg-white border border-gray-200 shadow-sm rounded-xl">
      <CardContent className="p-3 md:p-4">
        {/* Header com número da OS e status */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {/* Número da OS como badge */}
            {numeroOS && (
              <Badge variant="outline" className="text-sm font-bold px-3 py-1 bg-gray-50 border-gray-300 text-gray-700">
                OS #{numeroOS}
              </Badge>
            )}
            {/* Status como pill colorido */}
            <Badge className={cn('text-xs font-semibold px-3 py-1 text-white shadow-sm', statusColor)}>
              {statusLabel}
            </Badge>
          </div>
          {/* Saldo pendente como alerta */}
          {saldoPendente > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg border border-orange-200">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-semibold">
                Pendente: {currencyFormatters.brl(saldoPendente)}
              </span>
            </div>
          )}
        </div>

        {/* Grid de informações */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Cliente */}
          <div className="flex items-start gap-2">
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Cliente</p>
              <p className={cn(
                "text-sm font-semibold truncate",
                clienteNome ? "text-gray-800" : "text-gray-400 italic"
              )}>
                {clienteNome || 'Selecione um cliente'}
              </p>
            </div>
          </div>

          {/* Modelo */}
          <div className="flex items-start gap-2">
            <div className="p-1.5 bg-purple-50 rounded-lg">
              <Smartphone className="h-4 w-4 text-purple-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Modelo</p>
              <p className={cn(
                "text-sm font-semibold truncate",
                modeloNome ? "text-gray-800" : "text-gray-400 italic"
              )}>
                {modeloNome || 'Não informado'}
              </p>
            </div>
          </div>

          {/* Valor Total */}
          <div className="flex items-start gap-2">
            <div className="p-1.5 bg-green-50 rounded-lg">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Total</p>
              <p className="text-sm font-bold text-green-600">
                {currencyFormatters.brl(valorTotal)}
              </p>
            </div>
          </div>

          {/* Valor Pago */}
          <div className="flex items-start gap-2">
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <Wallet className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Pago</p>
              <p className="text-sm font-bold text-blue-600">
                {currencyFormatters.brl(valorPago)}
              </p>
            </div>
          </div>

          {/* Previsão de Entrega */}
          <div className="flex items-start gap-2">
            <div className="p-1.5 bg-amber-50 rounded-lg">
              <Calendar className="h-4 w-4 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Previsão</p>
              <p className={cn(
                "text-sm font-semibold",
                previsaoEntrega ? "text-gray-800" : "text-gray-400 italic"
              )}>
                {previsaoEntrega ? dateFormatters.short(previsaoEntrega) : 'Não definida'}
              </p>
            </div>
          </div>

          {/* Técnico */}
          <div className="flex items-start gap-2">
            <div className="p-1.5 bg-indigo-50 rounded-lg">
              <UserCircle className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Técnico</p>
              <p className={cn(
                "text-sm font-semibold truncate",
                tecnicoNome ? "text-gray-800" : "text-gray-400 italic"
              )}>
                {tecnicoNome || 'Não atribuído'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
