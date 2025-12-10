import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileText, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useBillsToPay, useCashClosings, useFinancialTransactions, useFinancialCategories } from '@/hooks/useFinanceiro';
import { currencyFormatters } from '@/utils/formatters';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { cn } from '@/lib/utils';
import type { FinanceiroContextType } from './FinanceiroLayout';

export default function FinanceiroRelatorios() {
  const { startDate, endDate } = useOutletContext<FinanceiroContextType>();
  const month = startDate.slice(0, 7);
  
  const { bills, isLoading: loadingBills } = useBillsToPay({ month });
  const { cashClosings, isLoading: loadingCash } = useCashClosings({ month });
  const { transactions, isLoading: loadingTransactions } = useFinancialTransactions({ month });
  const { categories } = useFinancialCategories();

  const isLoading = loadingBills || loadingCash || loadingTransactions;

  const dre = useMemo(() => {
    const receitas = transactions.filter(t => t.type === 'entrada');
    const despesas = transactions.filter(t => t.type === 'saida');
    
    const receitaBruta = receitas.reduce((sum, t) => sum + t.amount, 0);
    const despesasFixas = despesas.filter(t => categories.find(c => c.id === t.category_id)?.is_fixed).reduce((sum, t) => sum + t.amount, 0);
    const despesasVariaveis = despesas.filter(t => !categories.find(c => c.id === t.category_id)?.is_fixed).reduce((sum, t) => sum + t.amount, 0);
    const totalDespesas = despesasFixas + despesasVariaveis;
    const lucroBruto = receitaBruta - totalDespesas;
    const margemBruta = receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0;

    return { receitaBruta, despesasFixas, despesasVariaveis, totalDespesas, lucroBruto, margemBruta };
  }, [transactions, categories]);

  const exportCSV = (type: 'transactions' | 'bills' | 'cash') => {
    let csv = '';
    let filename = '';
    
    if (type === 'transactions') {
      csv = 'Data,Tipo,Descrição,Valor\n' + transactions.map(t => 
        `${t.date},${t.type},${t.description},${t.amount}`
      ).join('\n');
      filename = `transacoes-${month}.csv`;
    } else if (type === 'bills') {
      csv = 'Vencimento,Descrição,Valor,Status\n' + bills.map(b => 
        `${b.due_date},${b.description},${b.amount},${b.status}`
      ).join('\n');
      filename = `contas-${month}.csv`;
    } else {
      csv = 'Data,Colaborador,Vendas,Cartão,Dinheiro,Pix\n' + cashClosings.map(c => 
        `${c.date},${c.user_id},${c.total_sales},${c.card_amount},${c.cash_amount},${c.pix_amount}`
      ).join('\n');
      filename = `caixa-${month}.csv`;
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  if (isLoading) return <LoadingSkeleton type="card" count={3} />;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="dre">
        <TabsList>
          <TabsTrigger value="dre">DRE Simplificado</TabsTrigger>
          <TabsTrigger value="export">Exportar Dados</TabsTrigger>
        </TabsList>

        <TabsContent value="dre" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                DRE - Demonstrativo de Resultado
              </CardTitle>
              <CardDescription>Período: {new Date(startDate).toLocaleDateString('pt-BR')} até {new Date(endDate).toLocaleDateString('pt-BR')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-success/10">
                    <TableCell className="font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-success" />
                      Receita Bruta
                    </TableCell>
                    <TableCell className="text-right font-bold text-success">{currencyFormatters.brl(dre.receitaBruta)}</TableCell>
                    <TableCell className="text-right">100%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium flex items-center gap-2 pl-8">
                      <Minus className="h-4 w-4 text-destructive" />
                      (-) Despesas Fixas
                    </TableCell>
                    <TableCell className="text-right text-destructive">{currencyFormatters.brl(dre.despesasFixas)}</TableCell>
                    <TableCell className="text-right">{dre.receitaBruta > 0 ? ((dre.despesasFixas / dre.receitaBruta) * 100).toFixed(1) : 0}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium flex items-center gap-2 pl-8">
                      <Minus className="h-4 w-4 text-destructive" />
                      (-) Despesas Variáveis
                    </TableCell>
                    <TableCell className="text-right text-destructive">{currencyFormatters.brl(dre.despesasVariaveis)}</TableCell>
                    <TableCell className="text-right">{dre.receitaBruta > 0 ? ((dre.despesasVariaveis / dre.receitaBruta) * 100).toFixed(1) : 0}%</TableCell>
                  </TableRow>
                  <TableRow className="border-t-2">
                    <TableCell className="font-medium flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-destructive" />
                      Total Despesas
                    </TableCell>
                    <TableCell className="text-right font-bold text-destructive">{currencyFormatters.brl(dre.totalDespesas)}</TableCell>
                    <TableCell className="text-right">{dre.receitaBruta > 0 ? ((dre.totalDespesas / dre.receitaBruta) * 100).toFixed(1) : 0}%</TableCell>
                  </TableRow>
                  <TableRow className={cn("border-t-2", dre.lucroBruto >= 0 ? "bg-success/10" : "bg-destructive/10")}>
                    <TableCell className="font-bold text-lg">= Lucro/Prejuízo</TableCell>
                    <TableCell className={cn("text-right font-bold text-lg", dre.lucroBruto >= 0 ? "text-success" : "text-destructive")}>
                      {currencyFormatters.brl(dre.lucroBruto)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={dre.margemBruta >= 20 ? "default" : dre.margemBruta >= 10 ? "secondary" : "destructive"}>
                        {dre.margemBruta.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transações</CardTitle>
                <CardDescription>{transactions.length} registros</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => exportCSV('transactions')} className="w-full gap-2">
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contas a Pagar</CardTitle>
                <CardDescription>{bills.length} registros</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => exportCSV('bills')} className="w-full gap-2">
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fechamentos de Caixa</CardTitle>
                <CardDescription>{cashClosings.length} registros</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => exportCSV('cash')} className="w-full gap-2">
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
