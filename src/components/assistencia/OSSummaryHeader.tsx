import { Badge } from '@/components/ui/badge';
import { User, Smartphone, DollarSign, Wallet, Calendar, UserCircle } from 'lucide-react';
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
  const statusLabel = status ? STATUS_OS_LABELS[status as keyof typeof STATUS_OS_LABELS] || status : 'N/A';
  const statusColor = status ? STATUS_OS_COLORS[status as keyof typeof STATUS_OS_COLORS] || 'bg-gray-500' : 'bg-gray-500';

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {/* OS # e Status */}
        <div className="flex items-center gap-2">
          {numeroOS && (
            <Badge variant="outline" className="text-xs font-bold px-2 py-0.5 bg-gray-50 border-gray-300 text-gray-700">
              OS #{numeroOS}
            </Badge>
          )}
          <Badge className={cn('text-[10px] font-semibold px-2 py-0.5 text-white', statusColor)}>
            {statusLabel}
          </Badge>
        </div>

        {/* Separador */}
        <div className="h-5 w-px bg-gray-200 hidden sm:block" />

        {/* Cliente */}
        <div className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-[11px] text-gray-500">Cliente:</span>
          <span className={cn(
            "text-xs font-semibold",
            clienteNome ? "text-gray-800" : "text-gray-400 italic"
          )}>
            {clienteNome || 'Não selecionado'}
          </span>
        </div>

        {/* Separador */}
        <div className="h-5 w-px bg-gray-200 hidden sm:block" />

        {/* Modelo */}
        <div className="flex items-center gap-1.5">
          <Smartphone className="h-3.5 w-3.5 text-purple-500" />
          <span className="text-[11px] text-gray-500">Modelo:</span>
          <span className={cn(
            "text-xs font-semibold",
            modeloNome ? "text-gray-800" : "text-gray-400 italic"
          )}>
            {modeloNome || 'N/A'}
          </span>
        </div>

        {/* Separador */}
        <div className="h-5 w-px bg-gray-200 hidden sm:block" />

        {/* Total */}
        <div className="flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5 text-green-500" />
          <span className="text-[11px] text-gray-500">Total:</span>
          <span className="text-xs font-bold text-green-600">
            {currencyFormatters.brl(valorTotal)}
          </span>
        </div>

        {/* Pago */}
        <div className="flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-[11px] text-gray-500">Pago:</span>
          <span className="text-xs font-bold text-blue-600">
            {currencyFormatters.brl(valorPago)}
          </span>
        </div>

        {/* Separador */}
        <div className="h-5 w-px bg-gray-200 hidden sm:block" />

        {/* Previsão */}
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-[11px] text-gray-500">Prev:</span>
          <span className={cn(
            "text-xs font-semibold",
            previsaoEntrega ? "text-gray-800" : "text-gray-400"
          )}>
            {previsaoEntrega ? dateFormatters.short(previsaoEntrega) : 'N/A'}
          </span>
        </div>

        {/* Técnico */}
        <div className="flex items-center gap-1.5">
          <UserCircle className="h-3.5 w-3.5 text-indigo-500" />
          <span className="text-[11px] text-gray-500">Téc:</span>
          <span className={cn(
            "text-xs font-semibold",
            tecnicoNome ? "text-gray-800" : "text-gray-400"
          )}>
            {tecnicoNome || 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
}
