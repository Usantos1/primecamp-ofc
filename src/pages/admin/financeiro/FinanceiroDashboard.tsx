import { useNavigate, useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Plus, ArrowRight, Wallet, CreditCard, FileText, BarChart3 } from 'lucide-react';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { useFinancialSummary, useBillsDueSoon, useFinancialTransactions, useCashClosings } from '@/hooks/useFinanceiro';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

export function FinanceiroDashboard() {
  const navigate = useNavigate();
  const { startDate } = useOutletContext<{ startDate: string }>();
  const month = startDate.slice(0, 7);

  const summary = useFinancialSummary(month);
  const { data: billsDueSoon = [], isLoading: billsLoading } = useBillsDueSoon(7);
  const { transactions, isLoading: transactionsLoading } = useFinancialTransactions({ month });
  const { cashClosings, isLoading: closingsLoading } = useCashClosings({ month });

  // Calcular margem líquida corretamente
  const lucroLiquido = summary.total_entradas - summary.total_saidas;
  const margemLiquida = summary.total_entradas > 0 
    ? ((lucroLiquido / summary.total_entradas) * 100) 
    : 0;

  const metrics = {
    totalEntradas: summary.total_entradas,
    totalSaidas: summary.total_saidas,
    saldo: summary.saldo,
    margemLucro: margemLiquida,
    margemLiquida: margemLiquida,
    lucroLiquido: lucroLiquido,
    contasPendentes: summary.bills_pending,
    contasAtrasadas: summary.bills_overdue,
    mediaVendasDiaria: summary.total_entradas / (new Date().getDate() || 1),
    fechamentosCaixa: cashClosings.length,
  };

  if (transactionsLoading || closingsLoading || billsLoading) {
    return <LoadingSkeleton type="cards" count={4} />;
  }

  return (
    <div className="space-y-6">
      {/* Cards de métricas principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500 cursor-pointer hover:shadow-md" onClick={() => navigate('/admin/financeiro/transacoes')}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
              <TrendingUp className="h-4 w-4" />Entradas
            </div>
            <p className="text-2xl font-bold text-green-600">{currencyFormatters.brl(metrics.totalEntradas)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 cursor-pointer hover:shadow-md" onClick={() => navigate('/admin/financeiro/contas')}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-red-600 text-sm mb-1">
              <TrendingDown className="h-4 w-4" />Saídas
            </div>
            <p className="text-2xl font-bold text-red-600">{currencyFormatters.brl(metrics.totalSaidas)}</p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 cursor-pointer hover:shadow-md ${metrics.saldo >= 0 ? 'border-l-blue-500' : 'border-l-red-500'}`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-blue-600 text-sm mb-1">
              <Wallet className="h-4 w-4" />Saldo
            </div>
            <p className={`text-2xl font-bold ${metrics.saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {currencyFormatters.brl(metrics.saldo)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-purple-600 text-sm mb-1">
              <BarChart3 className="h-4 w-4" />Margem Líquida
            </div>
            <p className="text-2xl font-bold text-purple-600">{metrics.margemLiquida.toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              Lucro: {currencyFormatters.brl(metrics.lucroLiquido)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas e ações rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contas vencendo */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Contas Vencendo em Breve
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/financeiro/contas')}>
                Ver todas <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {billsDueSoon.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Nenhuma conta vencendo em breve
              </div>
            ) : (
              <div className="space-y-3">
                {billsDueSoon.slice(0, 5).map(bill => (
                  <div key={bill.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{bill.description}</p>
                      <p className="text-sm text-muted-foreground">{dateFormatters.short(bill.due_date)}</p>
                    </div>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                      {currencyFormatters.brl(bill.amount)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ações rápidas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigate('/admin/financeiro/caixa')}>
                <DollarSign className="h-5 w-5" />
                <span className="text-sm">Fechar Caixa</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigate('/admin/financeiro/contas')}>
                <FileText className="h-5 w-5" />
                <span className="text-sm">Nova Conta</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigate('/admin/financeiro/transacoes')}>
                <CreditCard className="h-5 w-5" />
                <span className="text-sm">Nova Transação</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigate('/admin/financeiro/relatorios')}>
                <BarChart3 className="h-5 w-5" />
                <span className="text-sm">Ver Relatórios</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Indicadores de saúde financeira */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Indicadores de Saúde Financeira</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-3xl font-bold text-primary">{metrics.fechamentosCaixa}</p>
              <p className="text-sm text-muted-foreground">Fechamentos do Mês</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-3xl font-bold text-primary">{currencyFormatters.brl(metrics.mediaVendasDiaria)}</p>
              <p className="text-sm text-muted-foreground">Média Diária</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-3xl font-bold text-yellow-600">{metrics.contasPendentes}</p>
              <p className="text-sm text-muted-foreground">Contas Pendentes</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className={`text-3xl font-bold ${metrics.contasAtrasadas > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {metrics.contasAtrasadas}
              </p>
              <p className="text-sm text-muted-foreground">Contas Atrasadas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
