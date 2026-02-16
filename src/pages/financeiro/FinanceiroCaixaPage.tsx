import { useState } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { CashRegisterSessionsManager } from '@/components/financeiro/CashRegisterSessionsManager';
import { CaixaGeral } from '@/components/financeiro/CaixaGeral';
import { useAuth } from '@/contexts/AuthContext';

export default function FinanceiroCaixaPage() {
  const { isAdmin } = useAuth();
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>(isAdmin ? 'month' : 'today');
  const [customDateStart, setCustomDateStart] = useState<Date | undefined>(undefined);
  const [customDateEnd, setCustomDateEnd] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');

  return (
    <ModernLayout title="Caixa" subtitle={isAdmin ? 'Gestão de sessões de caixa' : 'Meu caixa (hoje)'}>
      <div className="flex flex-col h-full min-h-0 overflow-y-auto overflow-x-hidden gap-4">
        {isAdmin && (
          <CaixaGeral
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            customDateStart={customDateStart}
            customDateEnd={customDateEnd}
            setCustomDateStart={setCustomDateStart}
            setCustomDateEnd={setCustomDateEnd}
            showDatePicker={showDatePicker}
            setShowDatePicker={setShowDatePicker}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
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
