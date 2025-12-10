import { useOutletContext } from 'react-router-dom';
import { BillsManager } from '@/components/financeiro/BillsManager';
import type { FinanceiroContextType } from './FinanceiroLayout';

export default function FinanceiroContas() {
  const { startDate } = useOutletContext<FinanceiroContextType>();
  const month = startDate.slice(0, 7);

  return <BillsManager month={month} />;
}

