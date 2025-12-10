import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, TrendingDown, DollarSign, Wallet, AlertTriangle, CheckCircle,
  ArrowUpRight, ArrowDownRight, PiggyBank, Target, Calendar, Users
} from 'lucide-react';
import { useBillsToPay, useCashClosings, useFinancialTransactions, useBillsDueSoon } from '@/hooks/useFinanceiro';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { cn } from '@/lib/utils';
import type { FinanceiroContextType } from './FinanceiroLayout';

export default function FinanceiroDashboard() {
  const { startDate } = useOutletContext<FinanceiroContextType>();
  const month = startDate.slice(0, 7);
  
  const { bills, isLoading: loadingBills } = useBillsToPay({ month });
  const { cashClosings, isLoading: loadingCash } = useCashClosings({ month });
  const { transactions, isLoading: loadingTransactions } = useFinancialTransactions({ month });
  const { data: billsDueSoon = [] } = useBillsDueSoon(7);

  const isLoading = loadingBills || loadingCash || loadingTransactions;

  const metrics = useMemo(() => {
    const totalEntradas = transactions.filter(t => t.type === 'entrada').reduce((sum, t) => sum + t.amount, 0);
    const totalSaidas = transactions.filter(t => t.type === 'saida').reduce((sum, t) => sum + t.amount, 0);
    const totalVendas = cashClosings.reduce((sum, c) => sum + (c.total_sales || 0), 0);
    const contasPendentes = bills.filter(b => b.status === 'pendente');
    const totalPendente = contasPendentes.reduce((sum, b) => sum + b.amount, 0);
    const contasAtrasadas = bills.filter(b => b.status === 'pendente' && new Date(b.due_date) < new Date());
    const saldo = totalEntradas - totalSaidas;
    const margemLucro = totalEntradas > 0 ? ((totalEntradas - totalSaidas) / totalEntradas) * 100 : 0;
    const mediaVendasDiaria = totalVendas / (cashClosings.length || 1);

    return { totalEntradas, totalSaidas, totalVendas, saldo, margemLucro, totalPendente, 
      contasPendentes: contasPendentes.length, contasAtrasadas: contasAtrasadas.length, 
      mediaVendasDiaria, fechamentosCaixa: cashClosings.length };
  }, [transactions, bills, cashClosings]);

  if (isLoading) return <LoadingSkeleton type="card" count={4} />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-success">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              Total de Entradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{currencyFormatters.brl(metrics.totalEntradas)}</p>
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
            <p className="text-2xl font-bold text-destructive">{currencyFormatters.brl(metrics.totalSaidas)}</p>
          </CardContent>
        </Card>

        <Card className={cn("border-l-4", metrics.saldo >= 0 ? "border-l-primary" : "border-l-destructive")}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Saldo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className={cn("text-2xl font-bold", metrics.saldo >= 0 ? "text-primary" : "text-destructive")}>
              {currencyFormatters.brl(metrics.saldo)}
            </p>
            <p className="text-xs text-muted-foreground">Margem: {metrics.margemLucro.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Contas Pendentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{currencyFormatters.brl(metrics.totalPendente)}</p>
            <div className="flex gap-2">
              <Badge variant="outline">{metrics.contasPendentes} contas</Badge>
              {metrics.contasAtrasadas > 0 && <Badge variant="destructive">{metrics.contasAtrasadas} atrasadas</Badge>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Total Vendas (Caixa)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{currencyFormatters.brl(metrics.totalVendas)}</p>
            <p className="text-xs text-muted-foreground">{metrics.fechamentosCaixa} fechamentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Margem de Lucro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className={cn("text-2xl font-bold", metrics.margemLucro >= 20 ? "text-success" : metrics.margemLucro >= 10 ? "text-warning" : "text-destructive")}>
              {metrics.margemLucro.toFixed(1)}%
            </p>
            <Progress value={Math.min(metrics.margemLucro, 100)} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <PiggyBank className="h-4 w-4" />
              Média Diária
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{currencyFormatters.brl(metrics.mediaVendasDiaria)}</p>
          </CardContent>
        </Card>
      </div>

      {billsDueSoon.length > 0 && (
        <Card className="border-warning/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Contas Vencendo em Breve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {billsDueSoon.slice(0, 6).map((bill) => {
                const daysUntil = Math.ceil((new Date(bill.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                const isOverdue = daysUntil < 0;
                return (
                  <div key={bill.id} className={cn("p-3 rounded-lg border", isOverdue ? "bg-destructive/10" : "bg-muted/50")}>
                    <div className="flex justify-between">
                      <p className="font-medium text-sm truncate">{bill.description}</p>
                      <Badge variant={isOverdue ? "destructive" : "outline"}>{isOverdue ? 'Atrasado' : `${daysUntil}d`}</Badge>
                    </div>
                    <p className="font-bold text-primary mt-1">{currencyFormatters.brl(bill.amount)}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
