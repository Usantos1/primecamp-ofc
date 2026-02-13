import { useState } from 'react';
import { format } from 'date-fns';
import { ModernLayout } from '@/components/ModernLayout';
import { FinanceiroNavMenu } from '@/components/financeiro/FinanceiroNavMenu';
import { DateFilterBar } from '@/components/financeiro/DateFilterBar';
import { DREComplete } from '@/components/financeiro/DREComplete';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

function getDefaultMonthRange() {
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);
  return { start: format(monthAgo, 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
}

export default function DRE() {
  const defaultRange = getDefaultMonthRange();
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('month');
  const [customDateStart, setCustomDateStart] = useState<Date | undefined>(undefined);
  const [customDateEnd, setCustomDateEnd] = useState<Date | undefined>(undefined);
  const [startDate, setStartDate] = useState<string | undefined>(defaultRange.start);
  const [endDate, setEndDate] = useState<string | undefined>(defaultRange.end);
  
  return (
    <ModernLayout title="DRE - Demonstrativo do Resultado do Exercício" subtitle="Demonstração do resultado financeiro">
      <div className="flex flex-col gap-4">
        {/* Menu de Navegação */}
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
        
        {/* DRE */}
        <div className="flex-1">
          <DREComplete startDate={startDate} endDate={endDate} />
        </div>
      </div>
    </ModernLayout>
  );
}
