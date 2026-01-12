import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type DateFilterType = 'today' | 'week' | 'month' | 'all' | 'custom';

interface DateFilterBarProps {
  dateFilter: DateFilterType;
  onDateFilterChange: (filter: DateFilterType) => void;
  customDateStart?: Date;
  customDateEnd?: Date;
  onCustomDateStartChange?: (date: Date | undefined) => void;
  onCustomDateEndChange?: (date: Date | undefined) => void;
  onDatesChange?: (startDate: string | undefined, endDate: string | undefined) => void;
  className?: string;
}

export function DateFilterBar({
  dateFilter,
  onDateFilterChange,
  customDateStart,
  customDateEnd,
  onCustomDateStartChange,
  onCustomDateEndChange,
  onDatesChange,
  className,
}: DateFilterBarProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const getDateRange = () => {
    const today = new Date();
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (dateFilter === 'today') {
      startDate = format(today, 'yyyy-MM-dd');
      endDate = format(today, 'yyyy-MM-dd');
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = format(weekAgo, 'yyyy-MM-dd');
      endDate = format(today, 'yyyy-MM-dd');
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      startDate = format(monthAgo, 'yyyy-MM-dd');
      endDate = format(today, 'yyyy-MM-dd');
    } else if (dateFilter === 'custom' && customDateStart && customDateEnd) {
      startDate = format(customDateStart, 'yyyy-MM-dd');
      endDate = format(customDateEnd, 'yyyy-MM-dd');
    } else {
      startDate = undefined;
      endDate = undefined;
    }

    if (onDatesChange) {
      onDatesChange(startDate, endDate);
    }

    return { startDate, endDate };
  };

  // Calcular datas sempre que mudar
  useState(() => {
    getDateRange();
  });

  const handleFilterChange = (filter: DateFilterType) => {
    onDateFilterChange(filter);
    if (filter !== 'custom') {
      getDateRange();
    }
  };

  return (
    <Card className={cn("flex-shrink-0 border-[3px] border-gray-400 rounded-xl shadow-sm", className)}>
      <CardContent className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Botões de filtro rápido */}
          <div className="flex items-center gap-1 flex-wrap">
            <Button
              variant={dateFilter === 'today' ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs"
              onClick={() => handleFilterChange('today')}
            >
              Hoje
            </Button>
            <Button
              variant={dateFilter === 'week' ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs"
              onClick={() => handleFilterChange('week')}
            >
              7 dias
            </Button>
            <Button
              variant={dateFilter === 'month' ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs"
              onClick={() => handleFilterChange('month')}
            >
              30 dias
            </Button>
            <Button
              variant={dateFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs"
              onClick={() => handleFilterChange('all')}
            >
              Todos
            </Button>
          </div>

          {/* Seletor de período personalizado */}
          <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
            <PopoverTrigger asChild>
              <Button
                variant={dateFilter === 'custom' && customDateStart && customDateEnd ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  "h-8 text-xs justify-start text-left font-normal border-[2px]",
                  dateFilter === 'custom' && customDateStart && customDateEnd && "bg-primary text-primary-foreground"
                )}
              >
                <CalendarDays className="mr-2 h-3.5 w-3.5" />
                {dateFilter === 'custom' && customDateStart && customDateEnd ? (
                  <span className="truncate">
                    {format(customDateStart, 'dd/MM/yy', { locale: ptBR })} - {format(customDateEnd, 'dd/MM/yy', { locale: ptBR })}
                  </span>
                ) : (
                  'Personalizado'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-3 border-b space-y-2">
                <div className="text-xs text-muted-foreground text-center">
                  ou selecione um período:
                </div>
              </div>
              <div className="p-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Data Início</Label>
                    <Input
                      type="date"
                      value={customDateStart ? format(customDateStart, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          const date = new Date(e.target.value + 'T00:00:00');
                          onCustomDateStartChange?.(date);
                          if (customDateEnd) {
                            onDateFilterChange('custom');
                            getDateRange();
                          }
                        }
                      }}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Data Fim</Label>
                    <Input
                      type="date"
                      value={customDateEnd ? format(customDateEnd, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          const date = new Date(e.target.value + 'T23:59:59');
                          onCustomDateEndChange?.(date);
                          if (customDateStart) {
                            onDateFilterChange('custom');
                            getDateRange();
                          }
                        }
                      }}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardContent>
    </Card>
  );
}
