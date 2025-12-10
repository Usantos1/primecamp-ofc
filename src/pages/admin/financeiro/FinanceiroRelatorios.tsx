import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  Calendar
} from 'lucide-react';
import { useBillsToPay, useCashClosings, useFinancialTransactions, useFinancialCategories } from '@/hooks/useFinanceiro';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { cn } from '@/lib/utils';
import type { FinanceiroContextType } from './FinanceiroLayout';

export default function FinanceiroRelatorios() {
  const { startDate, endDate } = useOutletContext<FinanceiroContextType>();
  const month = startDate.slice(0, 7);
  
  const { bills } = useBillsToPay({ month });
  const { cashClosings } = useCashClosings({ month });
  const { transactions } = useFinancialTransactions({ month });
  const { data: categories = [] } = useFinancialCategories();

  // DRE Simplificado
  const dre = useMemo(() => {
    const receitas = transactions
      .filter(t => t.type === 'entrada')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const vendas = cashClosings.reduce((sum, c) => sum + (c.total_sales || 0), 0);
    
    const despesasFixas = bills
      .filter(b => b.expense_type === 'fixa' && b.status === 'pago')
      .reduce((sum, b) => sum + b.amount, 0);
    
    const despesasVariaveis = bills
      .filter(b => b.expense_type === 'variavel' && b.status === 'pago')
      .reduce((sum, b) => sum + b.amount, 0);
    
    const totalDespesas = transactions
      .filter(t => t.type === 'saida')
      .reduce((sum, t) => sum + t.amount, 0);

    const receitaBruta = receitas + vendas;
    const lucroOperacional = receitaBruta - totalDespesas;
    const margemBruta = receitaBruta > 0 ? (lucroOperacional / receitaBruta) * 100 : 0;

    return {
      receitaBruta,
      vendas,
      outrasReceitas: receitas,
      despesasFixas,
      despesasVariaveis,
      totalDespesas,
      lucroOperacional,
      margemBruta,
    };
  }, [transactions, bills, cashClosings]);

  // Despesas por categoria
  const despesasPorCategoria = useMemo(() => {
    const porCategoria: Record<string, number> = {};
    
    transactions
      .filter(t => t.type === 'saida')
      .forEach(t => {
        const catName = t.category?.name || 'Sem categoria';
        porCategoria[catName] = (porCategoria[catName] || 0) + t.amount;
      });

    return Object.entries(porCategoria)
      .map(([categoria, valor]) => ({ categoria, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [transactions]);

  // Fluxo de caixa diário
  const fluxoDiario = useMemo(() => {
    const porDia: Record<string, { entradas: number; saidas: number }> = {};
    
    transactions.forEach(t => {
      const dia = t.transaction_date;
      if (!porDia[dia]) {
        porDia[dia] = { entradas: 0, saidas: 0 };
      }
      if (t.type === 'entrada') {
        porDia[dia].entradas += t.amount;
      } else {
        porDia[dia].saidas += t.amount;
      }
    });

    return Object.entries(porDia)
      .map(([data, valores]) => ({
        data,
        entradas: valores.entradas,
        saidas: valores.saidas,
        saldo: valores.entradas - valores.saidas,
      }))
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [transactions]);

  // Exportar para CSV
  const exportToCSV = (data: any[], filename: string) => {
    const headers = Object.keys(data[0] || {}).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${startDate}_${endDate}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header com exportação */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Relatórios Financeiros</h2>
          <p className="text-sm text-muted-foreground">
            Período: {dateFormatters.short(startDate)} a {dateFormatters.short(endDate)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => exportToCSV(transactions, 'transacoes')}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <FileText className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dre" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="categorias">Por Categoria</TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="vendedores">Por Vendedor</TabsTrigger>
        </TabsList>

        {/* DRE Simplificado */}
        <TabsContent value="dre">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Demonstração de Resultado (DRE Simplificado)
              </CardTitle>
              <CardDescription>
                Visão geral das receitas e despesas do período
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Receitas */}
                <div className="p-4 bg-success/10 rounded-lg border border-success/30">
                  <h4 className="font-semibold text-success mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    RECEITAS
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Vendas (Caixa)</span>
                      <span className="font-medium">{currencyFormatters.brl(dre.vendas)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Outras Receitas</span>
                      <span className="font-medium">{currencyFormatters.brl(dre.outrasReceitas)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold">
                      <span>RECEITA BRUTA</span>
                      <span className="text-success">{currencyFormatters.brl(dre.receitaBruta)}</span>
                    </div>
                  </div>
                </div>

                {/* Despesas */}
                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
                  <h4 className="font-semibold text-destructive mb-3 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    DESPESAS
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Despesas Fixas</span>
                      <span className="font-medium">{currencyFormatters.brl(dre.despesasFixas)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Despesas Variáveis</span>
                      <span className="font-medium">{currencyFormatters.brl(dre.despesasVariaveis)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold">
                      <span>TOTAL DESPESAS</span>
                      <span className="text-destructive">{currencyFormatters.brl(dre.totalDespesas)}</span>
                    </div>
                  </div>
                </div>

                {/* Resultado */}
                <div className={cn(
                  "p-4 rounded-lg border-2",
                  dre.lucroOperacional >= 0 
                    ? "bg-primary/10 border-primary" 
                    : "bg-destructive/10 border-destructive"
                )}>
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-lg">RESULTADO OPERACIONAL</h4>
                      <p className="text-sm text-muted-foreground">
                        Margem: {dre.margemBruta.toFixed(1)}%
                      </p>
                    </div>
                    <span className={cn(
                      "text-3xl font-bold",
                      dre.lucroOperacional >= 0 ? "text-primary" : "text-destructive"
                    )}>
                      {currencyFormatters.brl(dre.lucroOperacional)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Despesas por Categoria */}
        <TabsContent value="categorias">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Despesas por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              {despesasPorCategoria.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma despesa no período
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">% do Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {despesasPorCategoria.map((item, i) => {
                      const total = despesasPorCategoria.reduce((s, x) => s + x.valor, 0);
                      const percent = total > 0 ? (item.valor / total) * 100 : 0;
                      
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{item.categoria}</TableCell>
                          <TableCell className="text-right">{currencyFormatters.brl(item.valor)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">{percent.toFixed(1)}%</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right">
                        {currencyFormatters.brl(despesasPorCategoria.reduce((s, x) => s + x.valor, 0))}
                      </TableCell>
                      <TableCell className="text-right">100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fluxo de Caixa */}
        <TabsContent value="fluxo">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Fluxo de Caixa Diário
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fluxoDiario.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma movimentação no período
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right text-success">Entradas</TableHead>
                      <TableHead className="text-right text-destructive">Saídas</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fluxoDiario.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{dateFormatters.short(item.data)}</TableCell>
                        <TableCell className="text-right text-success">
                          {currencyFormatters.brl(item.entradas)}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          {currencyFormatters.brl(item.saidas)}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-medium",
                          item.saldo >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {currencyFormatters.brl(item.saldo)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Por Vendedor */}
        <TabsContent value="vendedores">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Vendas por Vendedor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cashClosings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum fechamento de caixa no período
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendedor</TableHead>
                      <TableHead className="text-right">Fechamentos</TableHead>
                      <TableHead className="text-right">Total Vendas</TableHead>
                      <TableHead className="text-right">Média por Dia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(
                      cashClosings.reduce((acc, c) => {
                        const key = c.seller_name;
                        if (!acc[key]) acc[key] = { count: 0, total: 0 };
                        acc[key].count++;
                        acc[key].total += c.total_sales || 0;
                        return acc;
                      }, {} as Record<string, { count: number; total: number }>)
                    ).map(([vendedor, dados]) => (
                      <TableRow key={vendedor}>
                        <TableCell className="font-medium">{vendedor}</TableCell>
                        <TableCell className="text-right">{dados.count}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {currencyFormatters.brl(dados.total)}
                        </TableCell>
                        <TableCell className="text-right">
                          {currencyFormatters.brl(dados.total / dados.count)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

