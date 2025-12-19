import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BillsManager } from '@/components/financeiro/BillsManager';
import { AccountsReceivableManager } from '@/components/financeiro/AccountsReceivableManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, TrendingUp } from 'lucide-react';

export function FinanceiroContas() {
  const { startDate } = useOutletContext<{ startDate: string }>();
  const month = startDate.slice(0, 7);
  const [activeTab, setActiveTab] = useState('pagar');
  
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="pagar" className="gap-2">
          <FileText className="h-4 w-4" />
          Contas a Pagar
        </TabsTrigger>
        <TabsTrigger value="receber" className="gap-2">
          <TrendingUp className="h-4 w-4" />
          Contas a Receber
        </TabsTrigger>
      </TabsList>
      <TabsContent value="pagar">
        <BillsManager month={month} />
      </TabsContent>
      <TabsContent value="receber">
        <AccountsReceivableManager month={month} />
      </TabsContent>
    </Tabs>
  );
}
