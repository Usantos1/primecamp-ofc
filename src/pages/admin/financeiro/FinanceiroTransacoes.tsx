import { useOutletContext } from 'react-router-dom';
import { TransactionsManager } from '@/components/financeiro/TransactionsManager';
import type { FinanceiroContextType } from './FinanceiroLayout';

export default function FinanceiroTransacoes() {
  const { startDate } = useOutletContext<FinanceiroContextType>();
  const month = startDate.slice(0, 7);

  return <TransactionsManager month={month} />;
}

