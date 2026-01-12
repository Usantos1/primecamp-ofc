import { ModernLayout } from '@/components/ModernLayout';
import { FinanceiroNavMenu } from '@/components/financeiro/FinanceiroNavMenu';
import { TransactionsManager } from '@/components/financeiro/TransactionsManager';

export default function FinanceiroTransacoesPage() {
  return (
    <ModernLayout title="Transações" subtitle="Transações financeiras">
      <div className="flex flex-col h-full overflow-hidden gap-4">
        <FinanceiroNavMenu />
        <TransactionsManager />
      </div>
    </ModernLayout>
  );
}
