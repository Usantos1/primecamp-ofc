import { useOutletContext } from 'react-router-dom';
import { CashClosingManager } from '@/components/financeiro/CashClosingManager';

export function FinanceiroCaixa() {
  const { startDate } = useOutletContext<{ startDate: string }>();
  const month = startDate.slice(0, 7);
  
  return <CashClosingManager month={month} />;
}
