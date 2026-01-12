import { useState } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { FinanceiroNavMenu } from '@/components/financeiro/FinanceiroNavMenu';
import { CashRegisterSessionsManager } from '@/components/financeiro/CashRegisterSessionsManager';
import { format } from 'date-fns';

export default function FinanceiroCaixaPage() {
  const [month, setMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  
  return (
    <ModernLayout title="Caixa" subtitle="Gestão de sessões de caixa">
      <div className="flex flex-col h-full overflow-hidden gap-4">
        <FinanceiroNavMenu />
        <CashRegisterSessionsManager month={month} />
      </div>
    </ModernLayout>
  );
}
