import { useState } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { FinanceiroNavMenu } from '@/components/financeiro/FinanceiroNavMenu';
import { TransactionsManager } from '@/components/financeiro/TransactionsManager';
import { DateFilterBar } from '@/components/financeiro/DateFilterBar';

export default function FinanceiroTransacoesPage() {
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('month');
  const [customDateStart, setCustomDateStart] = useState<Date | undefined>(undefined);
  const [customDateEnd, setCustomDateEnd] = useState<Date | undefined>(undefined);
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);

  return (
    <ModernLayout title="Transações" subtitle="Transações financeiras">
      <div className="flex flex-col gap-4">
        <FinanceiroNavMenu />
        
        {/* Filtros de Data */}
        <DateFilterBar
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          customDateStart={customDateStart}
          customDateEnd={customDateEnd}
          onCustomDateStartChange={setCustomDateStart}
          onCustomDateEndChange={setCustomDateEnd}
          onDatesChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
        />
        
        <div className="flex-1 overflow-hidden">
          <TransactionsManager startDate={startDate} endDate={endDate} />
        </div>
      </div>
    </ModernLayout>
  );
}
