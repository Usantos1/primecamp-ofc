import { useOutletContext } from 'react-router-dom';
import { TransactionsManager } from '@/components/financeiro/TransactionsManager';

export function FinanceiroTransacoes() {
  const { startDate } = useOutletContext<{ startDate: string }>();
  const month = startDate.slice(0, 7);
  
  return <TransactionsManager month={month} />;
}
