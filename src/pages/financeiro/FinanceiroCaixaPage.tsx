import { useState } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { FinanceiroNavMenu } from '@/components/financeiro/FinanceiroNavMenu';
import { CashRegisterSessionsManager } from '@/components/financeiro/CashRegisterSessionsManager';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function FinanceiroCaixaPage() {
  const [month, setMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');

  const monthOptions = (() => {
    const d = new Date();
    const list: string[] = [];
    for (let i = 0; i < 24; i++) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      list.push(format(m, 'yyyy-MM'));
    }
    return list;
  })();

  return (
    <ModernLayout title="Caixa" subtitle="Gestão de sessões de caixa">
      <div className="flex flex-col h-full overflow-hidden gap-4">
        <FinanceiroNavMenu />
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="month" className="text-muted-foreground whitespace-nowrap">Mês</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger id="month" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((m) => (
                  <SelectItem key={m} value={m}>
                    {format(new Date(m + '-01'), 'MMMM yyyy', { locale: ptBR })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        <CashRegisterSessionsManager month={month} statusFilter={statusFilter} />
      </div>
    </ModernLayout>
  );
}
