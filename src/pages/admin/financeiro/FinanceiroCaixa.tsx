import { useOutletContext } from 'react-router-dom';
import { CashRegisterSessionsManager } from '@/components/financeiro/CashRegisterSessionsManager';

export function FinanceiroCaixa() {
  const context = useOutletContext<{ startDate: string; endDate?: string; month?: string }>();
  const month = context.month || context.startDate.slice(0, 7);
  
  return <CashRegisterSessionsManager month={month} />;
}
