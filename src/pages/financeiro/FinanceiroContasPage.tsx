import { useState } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { BillsManager } from '@/components/financeiro/BillsManager';
import { AccountsReceivableManager } from '@/components/financeiro/AccountsReceivableManager';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FinanceiroContasPage() {
  const [activeTab, setActiveTab] = useState<'pagar' | 'receber'>('pagar');
  
  return (
    <ModernLayout title="Contas" subtitle="Contas a pagar e receber">
      <div className="flex flex-col gap-4">
        <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
          {/* Tabs customizadas */}
          <Card className="flex-shrink-0">
            <CardContent className="p-2">
              <div className="flex items-center gap-2">
                <Button
                  variant={activeTab === 'pagar' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-8 text-xs md:text-sm',
                    activeTab === 'pagar' && 'bg-red-600 hover:bg-red-700 text-white'
                  )}
                  onClick={() => setActiveTab('pagar')}
                >
                  <TrendingDown className="h-3.5 w-3.5 mr-1.5" />
                  <span className="hidden sm:inline">Contas a</span> Pagar
                </Button>
                <Button
                  variant={activeTab === 'receber' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-8 text-xs md:text-sm',
                    activeTab === 'receber' && 'bg-green-600 hover:bg-green-700 text-white'
                  )}
                  onClick={() => setActiveTab('receber')}
                >
                  <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                  <span className="hidden sm:inline">Contas a</span> Receber
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Conteúdo */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'pagar' && <BillsManager />}
            {activeTab === 'receber' && <AccountsReceivableManager />}
          </div>
        </div>
      </div>
    </ModernLayout>
  );
}
