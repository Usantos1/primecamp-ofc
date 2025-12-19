import { useOutletContext } from 'react-router-dom';
import { TransactionsManager } from '@/components/financeiro/TransactionsManager';

export function FinanceiroTransacoes() {
  const context = useOutletContext<{ startDate: string; endDate?: string; month?: string }>();
  const month = context.month || context.startDate.slice(0, 7);
  
  return <TransactionsManager month={month} />;
}
