import { useOutletContext } from 'react-router-dom';
import { CashClosingManager } from '@/components/financeiro/CashClosingManager';
import type { FinanceiroContextType } from './FinanceiroLayout';

export default function FinanceiroCaixa() {
  const { startDate } = useOutletContext<FinanceiroContextType>();
  return <CashClosingManager month={startDate.slice(0, 7)} />;
}
