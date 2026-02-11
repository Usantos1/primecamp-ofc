import { useState } from 'react';
import { format, subDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TrendPeriod } from '@/hooks/useDashboardData';
import { TREND_PERIOD_LABELS } from './TrendCharts';

const PERIOD_OPTIONS: { value: TrendPeriod; label: string; subtitle?: string }[] = [
  { value: 'day', label: 'Hoje' },
  { value: 'week', label: 'Esta semana (seg. até hoje)', subtitle: `${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'dd/MM')} – ${format(new Date(), 'dd/MM')}` },
  { value: 'month', label: 'Este mês', subtitle: format(new Date(), 'MMMM yyyy', { locale: ptBR }) },
  { value: '3m', label: '3 meses' },
  { value: '6m', label: '6 meses' },
  { value: 'year', label: 'Todo o período', subtitle: 'Últimos 12 meses' },
];

interface DashboardPeriodFilterProps {
  value: TrendPeriod;
  onChange: (period: TrendPeriod) => void;
  className?: string;
  triggerClassName?: string;
}

export function DashboardPeriodFilter({ value, onChange, className, triggerClassName }: DashboardPeriodFilterProps) {
  const [open, setOpen] = useState(false);
  const currentLabel = TREND_PERIOD_LABELS[value] || value;
  const selectedOption = PERIOD_OPTIONS.find((o) => o.value === value) || PERIOD_OPTIONS[1];

  const handleSelect = (period: TrendPeriod) => {
    onChange(period);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-[130px] sm:w-[140px] justify-between h-8 text-xs sm:text-sm border-gray-300 dark:border-gray-600', triggerClassName)}
        >
          <span className="truncate">{currentLabel}</span>
          <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn('w-auto p-0', className)} align="end" sideOffset={4}>
        <div className="flex flex-col sm:flex-row max-h-[70vh] sm:max-h-[480px]">
          {/* Lista de opções (estilo Google Ads) */}
          <div className="border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-700 min-w-[200px] max-h-[320px] sm:max-h-none overflow-y-auto">
            <div className="py-1">
              {PERIOD_OPTIONS.map((opt, idx) => (
                <button
                  key={`${opt.value}-${idx}`}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/80 transition-colors',
                    value === opt.value && 'bg-primary/10 text-primary font-medium'
                  )}
                >
                  <div className="min-w-0">
                    <span className="block truncate">{opt.label}</span>
                    {opt.subtitle && <span className="block text-xs text-muted-foreground truncate">{opt.subtitle}</span>}
                  </div>
                  {value === opt.value && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              ))}
            </div>
          </div>
          {/* Painel direito: resumo do período selecionado (opcional) */}
          <div className="p-3 sm:w-56 border-t sm:border-t-0 border-gray-200 dark:border-gray-700 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-1">Período selecionado</p>
            <p className="text-sm font-medium">{currentLabel}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedOption?.subtitle || (value === 'day' && format(new Date(), "EEEE, d 'de' MMM", { locale: ptBR })) || (value === 'week' && `${format(subDays(new Date(), 6), 'dd/MM')} – ${format(new Date(), 'dd/MM')}`) || (value === 'month' && format(new Date(), 'MMMM yyyy', { locale: ptBR })) || '—'}
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
