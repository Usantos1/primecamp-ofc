import { useState } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { CashRegisterSessionsManager } from '@/components/financeiro/CashRegisterSessionsManager';
import { CaixaGeral } from '@/components/financeiro/CaixaGeral';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FinanceiroCaixaPage() {
  const { isAdmin } = useAuth();
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>(isAdmin ? 'month' : 'today');
  const [customDateStart, setCustomDateStart] = useState<Date | undefined>(undefined);
  const [customDateEnd, setCustomDateEnd] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');

  const showFilters = isAdmin;

  return (
    <ModernLayout title="Caixa" subtitle={isAdmin ? 'Gestão de sessões de caixa' : 'Meu caixa (hoje)'}>
      <div className="flex flex-col h-full overflow-hidden gap-4">
        {showFilters && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-muted-foreground whitespace-nowrap">Período</Label>
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full md:w-[220px] h-9 md:h-10 text-sm border-2 border-gray-300 justify-start text-left font-normal',
                    dateFilter === 'custom' && customDateStart && customDateEnd && 'text-foreground'
                  )}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {dateFilter === 'custom' && customDateStart && customDateEnd ? (
                    <span className="truncate">
                      {format(customDateStart, 'dd/MM/yy', { locale: ptBR })} - {format(customDateEnd, 'dd/MM/yy', { locale: ptBR })}
                    </span>
                  ) : dateFilter === 'today' ? (
                    'Hoje'
                  ) : dateFilter === 'week' ? (
                    'Últimos 7 dias'
                  ) : dateFilter === 'month' ? (
                    'Últimos 30 dias'
                  ) : (
                    'Todos os períodos'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 border-b space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant={dateFilter === 'today' ? 'default' : 'outline'} size="sm" onClick={() => { setDateFilter('today'); setShowDatePicker(false); }}>Hoje</Button>
                    <Button variant={dateFilter === 'week' ? 'default' : 'outline'} size="sm" onClick={() => { setDateFilter('week'); setShowDatePicker(false); }}>7 dias</Button>
                    <Button variant={dateFilter === 'month' ? 'default' : 'outline'} size="sm" onClick={() => { setDateFilter('month'); setShowDatePicker(false); }}>30 dias</Button>
                    <Button variant={dateFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => { setDateFilter('all'); setShowDatePicker(false); }}>Todos</Button>
                  </div>
                  <div className="text-xs text-muted-foreground text-center pt-1">ou selecione um período:</div>
                </div>
                <div className="p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Data Início</Label>
                      <Input
                        type="date"
                        value={customDateStart ? format(customDateStart, 'yyyy-MM-dd') : ''}
                        onChange={(e) => { if (e.target.value) setCustomDateStart(new Date(e.target.value + 'T00:00:00')); }}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Data Fim</Label>
                      <Input
                        type="date"
                        value={customDateEnd ? format(customDateEnd, 'yyyy-MM-dd') : ''}
                        onChange={(e) => { if (e.target.value) setCustomDateEnd(new Date(e.target.value + 'T23:59:59')); }}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <Button className="w-full" size="sm" disabled={!customDateStart || !customDateEnd} onClick={() => { setDateFilter('custom'); setShowDatePicker(false); }}>Aplicar Período</Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="status" className="text-muted-foreground whitespace-nowrap">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'open' | 'closed')}>
              <SelectTrigger id="status" className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Abertos</SelectItem>
                <SelectItem value="closed">Fechados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        )}
        {isAdmin && (
          <CaixaGeral />
        )}
        <CashRegisterSessionsManager
          dateFilter={isAdmin ? dateFilter : 'today'}
          customDateStart={isAdmin ? customDateStart : undefined}
          customDateEnd={isAdmin ? customDateEnd : undefined}
          statusFilter={statusFilter}
        />
      </div>
    </ModernLayout>
  );
}
