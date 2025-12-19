import { useOutletContext } from 'react-router-dom';
import { CashClosingManager } from '@/components/financeiro/CashClosingManager';

export function FinanceiroCaixa() {
  const context = useOutletContext<{ startDate: string; endDate?: string; month?: string }>();
  const month = context.month || context.startDate.slice(0, 7);
  
  return <CashClosingManager month={month} />;
}
