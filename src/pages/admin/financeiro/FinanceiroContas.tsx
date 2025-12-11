import { useOutletContext } from 'react-router-dom';
import { BillsManager } from '@/components/financeiro/BillsManager';

export function FinanceiroContas() {
  const { startDate } = useOutletContext<{ startDate: string }>();
  const month = startDate.slice(0, 7);
  
  return <BillsManager month={month} />;
}
