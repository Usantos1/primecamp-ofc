import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  Target,
  Calendar,
  Users
} from 'lucide-react';
import { useBillsToPay, useCashClosings, useFinancialTransactions, useBillsDueSoon } from '@/hooks/useFinanceiro';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { cn } from '@/lib/utils';
import type { FinanceiroContextType } from './FinanceiroLayout';

export default function FinanceiroDashboard() {
  const { startDate, endDate } = useOutletContext<FinanceiroContextType>();
  
  const month = startDate.slice(0, 7);
  const { bills, isLoading: loadingBills } = useBillsToPay({ month });
  const { cashClosings, isLoading: loadingCash } = useCashClosings({ month });
  const { transactions, isLoading: loadingTransactions } = useFinancialTransactions({ month });
  const { data: billsDueSoon = [] } = useBillsDueSoon(7);

  const isLoading = loadingBills || loadingCash || loadingTransactions;

  // Cálculos
  const metrics = useMemo(() => {
    const totalEntradas = transactions
      .filter(t => t.type === 'entrada')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalSaidas = transactions
      .filter(t => t.type === 'saida')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalVendas = cashClosings.reduce((sum, c) => sum + (c.total_sales || 0), 0);
    
    const contasPendentes = bills.filter(b => b.status === 'pendente');
    const totalPendente = contasPendentes.reduce((sum, b) => sum + b.amount, 0);
    
    const contasPagas = bills.filter(b => b.status === 'pago');
    const totalPago = contasPagas.reduce((sum, b) => sum + b.amount, 0);
    
    const contasAtrasadas = bills.filter(b => 
      b.status === 'pendente' && new Date(b.due_date) < new Date()
    );
    const totalAtrasado = contasAtrasadas.reduce((sum, b) => sum + b.amount, 0);

    const saldo = totalEntradas - totalSaidas;
    const margemLucro = totalEntradas > 0 ? ((totalEntradas - totalSaidas) / totalEntradas) * 100 : 0;

    // Média diária de vendas
    const diasComVendas = cashClosings.length || 1;
    const mediaVendasDiaria = totalVendas / diasComVendas;

    return {
      totalEntradas,
      totalSaidas,
      totalVendas,
      saldo,
      margemLucro,
      totalPendente,
      totalPago,
      totalAtrasado,
      contasPendentes: contasPendentes.length,
      contasAtrasadas: contasAtrasadas.length,
      mediaVendasDiaria,
      fechamentosCaixa: cashClosings.length,
    };
  }, [transactions, bills, cashClosings]);

  // Análise por método de pagamento
  const vendasPorMetodo = useMemo(() => {
    const totais = {
      dinheiro: 0,
      pix: 0,
      credito: 0,
      debito: 0,
      outros: 0,
    };

    cashClosings.forEach(c => {
      totais.dinheiro += c.cash_sales || 0;
      totais.pix += c.pix_sales || 0;
      totais.credito += c.credit_card_sales || 0;
      totais.debito += c.debit_card_sales || 0;
      totais.outros += c.other_sales || 0;
    });

    const total = Object.values(totais).reduce((a, b) => a + b, 0);
    
    return Object.entries(totais).map(([key, value]) => ({
      metodo: key,
      valor: value,
      percentual: total > 0 ? (value / total) * 100 : 0,
    }));
  }, [cashClosings]);

  if (isLoading) {
    return <LoadingSkeleton type="card" count={6} />;
  }

  return (
    <div className="space-y-6">
      {/* Cards principais */}
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
              {currencyFormatters.brl(metrics.totalEntradas)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {transactions.filter(t => t.type === 'entrada').length} transações
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
              {currencyFormatters.brl(metrics.totalSaidas)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {transactions.filter(t => t.type === 'saida').length} transações
            </p>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-l-4",
          metrics.saldo >= 0 ? "border-l-primary" : "border-l-destructive"
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
              metrics.saldo >= 0 ? "text-primary" : "text-destructive"
            )}>
              {currencyFormatters.brl(metrics.saldo)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {metrics.saldo >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-success" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-destructive" />
              )}
              <span className="text-xs text-muted-foreground">
                Margem: {metrics.margemLucro.toFixed(1)}%
              </span>
            </div>
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
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">{metrics.contasPendentes} contas</Badge>
              {metrics.contasAtrasadas > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {metrics.contasAtrasadas} atrasadas
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segunda linha de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Total de Vendas (Caixa)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {currencyFormatters.brl(metrics.totalVendas)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.fechamentosCaixa} fechamentos | Média: {currencyFormatters.brl(metrics.mediaVendasDiaria)}/dia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              Contas Pagas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">
              {currencyFormatters.brl(metrics.totalPago)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {bills.filter(b => b.status === 'pago').length} contas quitadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="h-4 w-4 text-warning" />
              Margem de Lucro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className={cn(
                "text-2xl font-bold",
                metrics.margemLucro >= 20 ? "text-success" : 
                metrics.margemLucro >= 10 ? "text-warning" : "text-destructive"
              )}>
                {metrics.margemLucro.toFixed(1)}%
              </p>
              <Progress 
                value={Math.min(metrics.margemLucro, 100)} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendas por método e alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendas por método de pagamento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vendas por Método de Pagamento</CardTitle>
            <CardDescription>Distribuição das vendas no período</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {vendasPorMetodo.map((item) => {
              const labels: Record<string, string> = {
                dinheiro: 'Dinheiro',
                pix: 'PIX',
                credito: 'Cartão Crédito',
                debito: 'Cartão Débito',
                outros: 'Outros',
              };
              const colors: Record<string, string> = {
                dinheiro: 'bg-success',
                pix: 'bg-primary',
                credito: 'bg-warning',
                debito: 'bg-accent',
                outros: 'bg-muted-foreground',
              };

              return (
                <div key={item.metodo} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{labels[item.metodo]}</span>
                    <span className="font-medium">
                      {currencyFormatters.brl(item.valor)} ({item.percentual.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress 
                    value={item.percentual} 
                    className={cn("h-2", colors[item.metodo])}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Contas vencendo em breve */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Contas Vencendo em Breve
            </CardTitle>
            <CardDescription>Próximos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            {billsDueSoon.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma conta vencendo em breve</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {billsDueSoon.map((bill) => {
                  const daysUntil = Math.ceil(
                    (new Date(bill.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  );
                  const isOverdue = daysUntil < 0;

                  return (
                    <div
                      key={bill.id}
                      className={cn(
                        "p-3 rounded-lg border",
                        isOverdue ? "bg-destructive/10 border-destructive/30" : "bg-muted/50"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{bill.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {bill.supplier || 'Sem fornecedor'}
                          </p>
                        </div>
                        <Badge variant={isOverdue ? "destructive" : "outline"} className="ml-2">
                          {isOverdue ? `${Math.abs(daysUntil)}d atrasado` : `${daysUntil}d`}
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumo rápido */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumo Rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-muted/50 rounded-lg">
              <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{metrics.fechamentosCaixa}</p>
              <p className="text-xs text-muted-foreground">Fechamentos de Caixa</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{transactions.length}</p>
              <p className="text-xs text-muted-foreground">Transações</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <CreditCard className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{bills.length}</p>
              <p className="text-xs text-muted-foreground">Contas Cadastradas</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <PiggyBank className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{currencyFormatters.brl(metrics.mediaVendasDiaria)}</p>
              <p className="text-xs text-muted-foreground">Média Diária</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

