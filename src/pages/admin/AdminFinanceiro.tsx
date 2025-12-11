import { useState } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Receipt, 
  AlertTriangle,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Wallet
} from 'lucide-react';
import { useFinancialSummary, useBillsDueSoon, useBillsToPay, useCashClosings } from '@/hooks/useFinanceiro';
import { BillsManager } from '@/components/financeiro/BillsManager';
import { CashClosingManager } from '@/components/financeiro/CashClosingManager';
import { TransactionsManager } from '@/components/financeiro/TransactionsManager';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

export default function AdminFinanceiro() {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  
  const summary = useFinancialSummary(selectedMonth);
  const { data: billsDueSoon = [], isLoading: loadingBills } = useBillsDueSoon(7);
  const { cashClosings, isLoading: loadingCashClosings } = useCashClosings({ month: selectedMonth });

  const isLoading = loadingBills || loadingCashClosings;

  return (
    <ModernLayout
      title="Financeiro"
      subtitle="Controle de caixa, contas e transações"
    >
      <div className="space-y-6">
        {/* Seletor de mês */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-background text-foreground"
            />
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-success">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                Total de Entradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">
                {currencyFormatters.brl(summary.total_entradas)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-destructive">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Total de Saídas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">
                {currencyFormatters.brl(summary.total_saidas)}
              </p>
            </CardContent>
          </Card>

          <Card className={cn(
            "border-l-4",
            summary.saldo >= 0 ? "border-l-primary" : "border-l-destructive"
          )}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Saldo do Período
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className={cn(
                "text-2xl font-bold",
                summary.saldo >= 0 ? "text-primary" : "text-destructive"
              )}>
                {currencyFormatters.brl(summary.saldo)}
              </p>
            </CardContent>
          </Card>

          <Card className={cn(
            "border-l-4",
            summary.bills_overdue > 0 ? "border-l-warning" : "border-l-muted"
          )}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Contas Pendentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">{summary.bills_pending}</p>
                {summary.bills_overdue > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {summary.bills_overdue} atrasadas
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alertas de vencimento */}
        {billsDueSoon.length > 0 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                Contas Vencendo em Breve
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {billsDueSoon.slice(0, 6).map((bill) => {
                  const daysUntil = Math.ceil(
                    (new Date(bill.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  );
                  const isOverdue = daysUntil < 0;

                  return (
                    <div
                      key={bill.id}
                      className={cn(
                        "p-3 rounded-lg border",
                        isOverdue ? "bg-destructive/10 border-destructive/30" : "bg-background"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm truncate">{bill.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {bill.supplier || 'Sem fornecedor'}
                          </p>
                        </div>
                        <Badge variant={isOverdue ? "destructive" : "outline"} className="text-xs">
                          {isOverdue ? 'Atrasado' : `${daysUntil}d`}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="font-bold text-primary">
                          {currencyFormatters.brl(bill.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {dateFormatters.short(bill.due_date)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs principais */}
        <Tabs defaultValue="caixa" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="caixa" className="gap-2">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Fechamento de Caixa</span>
              <span className="sm:hidden">Caixa</span>
            </TabsTrigger>
            <TabsTrigger value="contas" className="gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Contas a Pagar</span>
              <span className="sm:hidden">Contas</span>
            </TabsTrigger>
            <TabsTrigger value="transacoes" className="gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Transações</span>
              <span className="sm:hidden">Trans.</span>
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Relatórios</span>
              <span className="sm:hidden">Relat.</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="caixa">
            <CashClosingManager month={selectedMonth} />
          </TabsContent>

          <TabsContent value="contas">
            <BillsManager month={selectedMonth} />
          </TabsContent>

          <TabsContent value="transacoes">
            <TransactionsManager month={selectedMonth} />
          </TabsContent>

          <TabsContent value="relatorios">
            <Card>
              <CardHeader>
                <CardTitle>Relatórios Financeiros</CardTitle>
                <CardDescription>
                  Análises e relatórios do período selecionado
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Relatórios em desenvolvimento...</p>
                <p className="text-sm mt-2">
                  Em breve você terá acesso a relatórios detalhados, gráficos e exportação de dados.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ModernLayout>
  );
}


