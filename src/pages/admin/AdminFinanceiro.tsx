import { ModernLayout } from '@/components/ModernLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BillsManager } from '@/components/financeiro/BillsManager';
import { CashClosingManager } from '@/components/financeiro/CashClosingManager';
import { TransactionsManager } from '@/components/financeiro/TransactionsManager';
import { 
  DollarSign, Receipt, ArrowUpDown, FileBarChart, Wallet
} from 'lucide-react';

export default function AdminFinanceiro() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentTab = searchParams.get('tab') || 'contas';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <ModernLayout title="Financeiro" subtitle="Gestão financeira completa">
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="contas" className="gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Contas</span>
          </TabsTrigger>
          <TabsTrigger value="caixa" className="gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Caixa</span>
          </TabsTrigger>
          <TabsTrigger value="transacoes" className="gap-2">
            <ArrowUpDown className="h-4 w-4" />
            <span className="hidden sm:inline">Transações</span>
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="gap-2">
            <FileBarChart className="h-4 w-4" />
            <span className="hidden sm:inline">Relatórios</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contas" className="space-y-4">
          <BillsManager />
        </TabsContent>

        <TabsContent value="caixa" className="space-y-4">
          <CashClosingManager />
        </TabsContent>

        <TabsContent value="transacoes" className="space-y-4">
          <TransactionsManager />
        </TabsContent>

        <TabsContent value="relatorios" className="space-y-4">
          <div className="text-center py-8 text-muted-foreground">
            Relatórios em desenvolvimento...
          </div>
        </TabsContent>
      </Tabs>
    </ModernLayout>
  );
}

