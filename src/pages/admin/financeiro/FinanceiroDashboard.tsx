import { useMemo, useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, TrendingDown, DollarSign, Wallet, AlertTriangle, CheckCircle,
  ArrowUpRight, ArrowDownRight, PiggyBank, Target, Calendar, CreditCard,
  Receipt, Clock, ArrowRight, Plus, BarChart3, CircleDollarSign
} from 'lucide-react';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import type { FinanceiroContextType } from './FinanceiroLayout';

// Tipos para dados locais
interface Bill {
  id: string;
  type: 'pagar' | 'receber';
  description: string;
  amount: number;
  expense_type: 'fixa' | 'variavel';
  due_date: string;
  status: 'pendente' | 'pago' | 'recebido' | 'atrasado';
  supplier?: string;
  customer?: string;
}

interface CashMovement {
  id: string;
  type: 'entrada' | 'retirada' | 'ajuste';
  amount: number;
  description: string;
  date: string;
  time: string;
}

// Funções para carregar dados do localStorage
const loadBills = (): Bill[] => {
  try {
    const stored = localStorage.getItem('financial_bills');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const loadMovements = (): CashMovement[] => {
  try {
    const stored = localStorage.getItem('cash_movements');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function FinanceiroDashboard() {
  const { startDate } = useOutletContext<FinanceiroContextType>();
  const navigate = useNavigate();
  const currentMonth = startDate.slice(0, 7);
  const currentYear = new Date().getFullYear();
  
  const [bills, setBills] = useState<Bill[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);

  useEffect(() => {
    setBills(loadBills());
    setMovements(loadMovements());
  }, []);

  // Métricas calculadas
  const metrics = useMemo(() => {
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    
    // Contas do mês
    const billsThisMonth = bills.filter(b => b.due_date.startsWith(thisMonth));
    const contasPagar = bills.filter(b => b.type === 'pagar');
    const contasReceber = bills.filter(b => b.type === 'receber');
    
    // Valores pendentes
    const totalAPagar = contasPagar
      .filter(b => b.status === 'pendente' || b.status === 'atrasado')
      .reduce((sum, b) => sum + b.amount, 0);
    
    const totalAReceber = contasReceber
      .filter(b => b.status === 'pendente')
      .reduce((sum, b) => sum + b.amount, 0);
    
    // Valores pagos/recebidos
    const totalPago = contasPagar
      .filter(b => b.status === 'pago')
      .reduce((sum, b) => sum + b.amount, 0);
    
    const totalRecebido = contasReceber
      .filter(b => b.status === 'recebido')
      .reduce((sum, b) => sum + b.amount, 0);
    
    // Despesas fixas e variáveis
    const despesasFixas = contasPagar
      .filter(b => b.expense_type === 'fixa')
      .reduce((sum, b) => sum + b.amount, 0);
    
    const despesasVariaveis = contasPagar
      .filter(b => b.expense_type === 'variavel')
      .reduce((sum, b) => sum + b.amount, 0);
    
    // Contas atrasadas
    const contasAtrasadas = contasPagar.filter(
      b => (b.status === 'pendente' || b.status === 'atrasado') && new Date(b.due_date) < now
    );
    
    // Contas vencendo em 7 dias
    const seteDiasFrente = new Date(now);
    seteDiasFrente.setDate(now.getDate() + 7);
    const contasVencendoBreve = contasPagar.filter(
      b => b.status === 'pendente' && 
           new Date(b.due_date) >= now && 
           new Date(b.due_date) <= seteDiasFrente
    );
    
    // Saldo previsto
    const saldoPrevisto = totalAReceber - totalAPagar;
    
    // Margem de lucro
    const totalReceitas = totalRecebido + totalAReceber;
    const totalDespesas = totalPago + totalAPagar;
    const margemLucro = totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas) * 100 : 0;
    
    // Projeção anual de fixas
    const projecaoAnualFixas = despesasFixas * 12;

    return {
      totalAPagar,
      totalAReceber,
      totalPago,
      totalRecebido,
      despesasFixas,
      despesasVariaveis,
      saldoPrevisto,
      margemLucro,
      projecaoAnualFixas,
      contasAtrasadas: contasAtrasadas.length,
      valorAtrasado: contasAtrasadas.reduce((sum, b) => sum + b.amount, 0),
      contasVencendoBreve,
      totalContas: bills.length,
      contasPagarPendentes: contasPagar.filter(b => b.status === 'pendente').length,
      contasReceberPendentes: contasReceber.filter(b => b.status === 'pendente').length,
    };
  }, [bills]);

  // Dados para gráfico de barras simples (últimos 6 meses)
  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7);
      const monthName = MONTHS_SHORT[date.getMonth()];
      
      const despesas = bills
        .filter(b => b.type === 'pagar' && b.due_date.startsWith(monthKey) && b.status === 'pago')
        .reduce((sum, b) => sum + b.amount, 0);
      
      const receitas = bills
        .filter(b => b.type === 'receber' && b.due_date.startsWith(monthKey) && b.status === 'recebido')
        .reduce((sum, b) => sum + b.amount, 0);
      
      data.push({ month: monthName, despesas, receitas });
    }
    
    return data;
  }, [bills]);

  const maxChartValue = Math.max(...chartData.flatMap(d => [d.despesas, d.receitas]), 1);

  // Indicador de saúde financeira
  const healthScore = useMemo(() => {
    let score = 100;
    
    // Penalidades
    if (metrics.contasAtrasadas > 0) score -= 30;
    if (metrics.saldoPrevisto < 0) score -= 25;
    if (metrics.margemLucro < 10) score -= 20;
    if (metrics.contasVencendoBreve.length > 3) score -= 15;
    if (metrics.despesasFixas > metrics.totalAReceber) score -= 10;
    
    return Math.max(0, score);
  }, [metrics]);

  const getHealthColor = (score: number) => {
    if (score >= 70) return 'text-success';
    if (score >= 40) return 'text-warning';
    return 'text-destructive';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 70) return 'Saudável';
    if (score >= 40) return 'Atenção';
    return 'Crítico';
  };

  return (
    <div className="space-y-6">
      {/* Linha 1: Principais indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-destructive hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/financeiro/contas')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">A Pagar</p>
                <p className="text-2xl font-bold text-destructive">{currencyFormatters.brl(metrics.totalAPagar)}</p>
                <p className="text-xs text-muted-foreground">{metrics.contasPagarPendentes} pendentes</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <ArrowDownRight className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-success hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/financeiro/contas')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">A Receber</p>
                <p className="text-2xl font-bold text-success">{currencyFormatters.brl(metrics.totalAReceber)}</p>
                <p className="text-xs text-muted-foreground">{metrics.contasReceberPendentes} pendentes</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn("border-l-4 hover:shadow-md transition-shadow", metrics.saldoPrevisto >= 0 ? "border-l-primary" : "border-l-destructive")}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo Previsto</p>
                <p className={cn("text-2xl font-bold", metrics.saldoPrevisto >= 0 ? "text-primary" : "text-destructive")}>
                  {currencyFormatters.brl(metrics.saldoPrevisto)}
                </p>
                <p className="text-xs text-muted-foreground">receitas - despesas</p>
              </div>
              <div className={cn("h-12 w-12 rounded-full flex items-center justify-center", metrics.saldoPrevisto >= 0 ? "bg-primary/10" : "bg-destructive/10")}>
                <Wallet className={cn("h-6 w-6", metrics.saldoPrevisto >= 0 ? "text-primary" : "text-destructive")} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saúde Financeira</p>
                <p className={cn("text-2xl font-bold", getHealthColor(healthScore))}>{healthScore}%</p>
                <Badge variant={healthScore >= 70 ? "default" : healthScore >= 40 ? "secondary" : "destructive"}>
                  {getHealthLabel(healthScore)}
                </Badge>
              </div>
              <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linha 2: Alertas e contas vencendo */}
      {(metrics.contasAtrasadas > 0 || metrics.contasVencendoBreve.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.contasAtrasadas > 0 && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  {metrics.contasAtrasadas} Contas Atrasadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">{currencyFormatters.brl(metrics.valorAtrasado)}</p>
                <Button variant="destructive" size="sm" className="mt-2 gap-2" onClick={() => navigate('/admin/financeiro/contas')}>
                  Ver contas <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {metrics.contasVencendoBreve.length > 0 && (
            <Card className="border-warning/50 bg-warning/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-warning">
                  <Clock className="h-5 w-5" />
                  Vencendo em 7 dias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.contasVencendoBreve.slice(0, 3).map(bill => {
                    const daysUntil = Math.ceil((new Date(bill.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={bill.id} className="flex items-center justify-between p-2 bg-background rounded">
                        <div>
                          <p className="font-medium text-sm">{bill.description}</p>
                          <p className="text-xs text-muted-foreground">{bill.supplier}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{currencyFormatters.brl(bill.amount)}</p>
                          <Badge variant="outline">{daysUntil === 0 ? 'Hoje' : `${daysUntil}d`}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Linha 3: Gráfico e detalhamento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico simples de barras */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Receitas vs Despesas (Últimos 6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-48">
              {chartData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-1 items-end h-36">
                    {/* Barra de receitas */}
                    <div 
                      className="flex-1 bg-success/80 rounded-t transition-all hover:bg-success"
                      style={{ height: `${(data.receitas / maxChartValue) * 100}%`, minHeight: data.receitas > 0 ? '4px' : '0' }}
                      title={`Receitas: ${currencyFormatters.brl(data.receitas)}`}
                    />
                    {/* Barra de despesas */}
                    <div 
                      className="flex-1 bg-destructive/80 rounded-t transition-all hover:bg-destructive"
                      style={{ height: `${(data.despesas / maxChartValue) * 100}%`, minHeight: data.despesas > 0 ? '4px' : '0' }}
                      title={`Despesas: ${currencyFormatters.brl(data.despesas)}`}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{data.month}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-success" />
                <span className="text-sm">Receitas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-destructive" />
                <span className="text-sm">Despesas</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detalhamento de despesas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5" />
              Despesas por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Fixas (mensal)</span>
                <span className="font-bold">{currencyFormatters.brl(metrics.despesasFixas)}</span>
              </div>
              <Progress 
                value={metrics.despesasFixas / (metrics.despesasFixas + metrics.despesasVariaveis || 1) * 100} 
                className="h-2" 
              />
              <p className="text-xs text-muted-foreground mt-1">
                Projeção anual: {currencyFormatters.brl(metrics.projecaoAnualFixas)}
              </p>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Variáveis</span>
                <span className="font-bold">{currencyFormatters.brl(metrics.despesasVariaveis)}</span>
              </div>
              <Progress 
                value={metrics.despesasVariaveis / (metrics.despesasFixas + metrics.despesasVariaveis || 1) * 100} 
                className="h-2" 
              />
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Margem de Lucro</span>
                <span className={cn("font-bold", metrics.margemLucro >= 20 ? "text-success" : metrics.margemLucro >= 0 ? "text-warning" : "text-destructive")}>
                  {metrics.margemLucro.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={Math.max(0, Math.min(metrics.margemLucro, 100))} 
                className="h-2 mt-2" 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linha 4: Ações rápidas e resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ações rápidas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/admin/financeiro/contas')}>
                <CreditCard className="h-5 w-5" />
                <span className="text-xs">Nova Conta a Pagar</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/admin/financeiro/contas')}>
                <Receipt className="h-5 w-5" />
                <span className="text-xs">Nova Conta a Receber</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/admin/financeiro/caixa')}>
                <DollarSign className="h-5 w-5" />
                <span className="text-xs">Fechar Caixa</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/admin/financeiro/relatorios')}>
                <BarChart3 className="h-5 w-5" />
                <span className="text-xs">Ver Relatórios</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resumo do período */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Resumo Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                <span className="text-sm">Total de Contas</span>
                <Badge variant="outline">{metrics.totalContas}</Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-success/10 rounded">
                <span className="text-sm">Total Recebido</span>
                <span className="font-bold text-success">{currencyFormatters.brl(metrics.totalRecebido)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-destructive/10 rounded">
                <span className="text-sm">Total Pago</span>
                <span className="font-bold text-destructive">{currencyFormatters.brl(metrics.totalPago)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-primary/10 rounded">
                <span className="text-sm font-medium">Resultado</span>
                <span className={cn("font-bold", metrics.totalRecebido - metrics.totalPago >= 0 ? "text-primary" : "text-destructive")}>
                  {currencyFormatters.brl(metrics.totalRecebido - metrics.totalPago)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
