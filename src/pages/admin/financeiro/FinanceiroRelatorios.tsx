import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileSpreadsheet, FileText, Printer, TrendingUp, TrendingDown } from 'lucide-react';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { exportDREToCSV, exportTransactionsToCSV, printData } from '@/utils/exportFinancial';
import { useFinancialTransactions, useBillsToPay, useCashClosings, useFinancialCategories } from '@/hooks/useFinanceiro';
import { CashFlowChart } from '@/components/financeiro/CashFlowChart';
import { DREComplete } from '@/components/financeiro/DREComplete';
import { FinancialCharts } from '@/components/financeiro/FinancialCharts';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export function FinanceiroRelatorios() {
  const context = useOutletContext<{ startDate: string; endDate?: string; month?: string }>();
  const month = context.month || context.startDate.slice(0, 7);
  const [selectedReport, setSelectedReport] = useState('dre');

  const { transactions, isLoading: transactionsLoading } = useFinancialTransactions({ month });
  const { bills, isLoading: billsLoading } = useBillsToPay({ month });
  const { cashClosings, isLoading: closingsLoading } = useCashClosings({ month });
  const { data: categories = [] } = useFinancialCategories();

  // Buscar vendas do período
  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ['sales-report', month],
    queryFn: async () => {
      const start = `${month}-01`;
      const end = `${month}-31`;
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end)
        .eq('status', 'paid');
      if (error) throw error;
      return data || [];
    },
  });

  // Calcular DRE a partir das transações
  const receitas = transactions
    .filter(t => t.type === 'entrada')
    .reduce((acc, t) => {
      const catName = t.category?.name || 'Outras Receitas';
      if (!acc[catName]) acc[catName] = 0;
      acc[catName] += t.amount;
      return acc;
    }, {} as Record<string, number>);

  const despesas = transactions
    .filter(t => t.type === 'saida')
    .reduce((acc, t) => {
      const catName = t.category?.name || 'Outras Despesas';
      if (!acc[catName]) acc[catName] = 0;
      acc[catName] += t.amount;
      return acc;
    }, {} as Record<string, number>);

  const dreData = {
    receitas: Object.entries(receitas).map(([descricao, valor]) => ({ descricao, valor })),
    despesas: Object.entries(despesas).map(([descricao, valor]) => ({ descricao, valor })),
  };

  const totalReceitas = Object.values(receitas).reduce((sum, v) => sum + v, 0);
  const totalDespesas = Object.values(despesas).reduce((sum, v) => sum + v, 0);
  const lucroLiquido = totalReceitas - totalDespesas;
  const margemLucro = totalReceitas > 0 ? (lucroLiquido / totalReceitas) * 100 : 0;

  if (transactionsLoading || billsLoading || closingsLoading || salesLoading) {
    return <LoadingSkeleton type="cards" count={2} />;
  }

  return (
    <div className="space-y-6">
      {/* Seleção de relatório */}
      <Card>
        <CardContent className="pt-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Select value={selectedReport} onValueChange={setSelectedReport}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecione o relatório" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dre">DRE - Demonstrativo de Resultados</SelectItem>
                <SelectItem value="fluxo">Fluxo de Caixa</SelectItem>
                <SelectItem value="contas">Contas a Pagar/Receber</SelectItem>
                <SelectItem value="vendas">Vendas por Período</SelectItem>
                <SelectItem value="balanco">Balanço Patrimonial</SelectItem>
                <SelectItem value="graficos">Gráficos e Visualizações</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => {
                if (selectedReport === 'dre') {
                  exportDREToCSV(
                    dreData.receitas,
                    dreData.despesas,
                    totalReceitas,
                    totalDespesas,
                    lucroLiquido,
                    margemLucro,
                    month
                  );
                } else if (selectedReport === 'vendas') {
                  exportTransactionsToCSV(
                    transactions.filter(t => t.type === 'entrada'),
                    month
                  );
                }
              }}
            >
              <FileSpreadsheet className="h-4 w-4" />Excel
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => {
                if (selectedReport === 'dre') {
                  printData({
                    title: `DRE - ${month.replace('-', '/')}`,
                    headers: ['Descrição', 'Valor (R$)'],
                    rows: [
                      ['RECEITAS OPERACIONAIS', ''],
                      ...dreData.receitas.map(r => [r.descricao, currencyFormatters.brl(r.valor)]),
                      ['TOTAL RECEITAS', currencyFormatters.brl(totalReceitas)],
                      ['', ''],
                      ['DESPESAS OPERACIONAIS', ''],
                      ...dreData.despesas.map(d => [d.descricao, currencyFormatters.brl(d.valor)]),
                      ['TOTAL DESPESAS', currencyFormatters.brl(totalDespesas)],
                      ['', ''],
                      ['LUCRO LÍQUIDO', currencyFormatters.brl(lucroLiquido)],
                      ['MARGEM LÍQUIDA (%)', `${margemLucro.toFixed(2)}%`],
                    ],
                  }, `Período: ${month.replace('-', '/')}`);
                }
              }}
            >
              <Printer className="h-4 w-4" />Imprimir
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* DRE Completo */}
      {selectedReport === 'dre' && (
        <DREComplete month={month} />
      )}

      {/* Fluxo de Caixa */}
      {selectedReport === 'fluxo' && (
        <CashFlowChart month={month} />
      )}

      {/* Contas a Pagar/Receber */}
      {selectedReport === 'contas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Contas a Pagar</CardTitle>
              <CardDescription>Período: {month.replace('-', '/')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Nenhuma conta encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      bills.map(bill => (
                        <TableRow key={bill.id}>
                          <TableCell className="font-medium">{bill.description}</TableCell>
                          <TableCell>{dateFormatters.short(bill.due_date)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {currencyFormatters.brl(bill.amount)}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${
                              bill.status === 'pago' ? 'bg-success/10 text-success' :
                              bill.status === 'atrasado' ? 'bg-destructive/10 text-destructive' :
                              'bg-warning/10 text-warning'
                            }`}>
                              {bill.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fechamentos de Caixa</CardTitle>
              <CardDescription>Período: {month.replace('-', '/')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead className="text-right">Total Vendas</TableHead>
                      <TableHead className="text-right">Diferença</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashClosings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Nenhum fechamento encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      cashClosings.map(closing => (
                        <TableRow key={closing.id}>
                          <TableCell>{dateFormatters.short(closing.closing_date)}</TableCell>
                          <TableCell>{closing.seller_name}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {currencyFormatters.brl(closing.total_sales)}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${
                            (closing.difference || 0) === 0 ? 'text-success' :
                            (closing.difference || 0) > 0 ? 'text-primary' : 'text-destructive'
                          }`}>
                            {currencyFormatters.brl(closing.difference || 0)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vendas por Período */}
      {selectedReport === 'vendas' && (
        <Card>
          <CardHeader>
            <CardTitle>Vendas por Período</CardTitle>
            <CardDescription>Período: {month.replace('-', '/')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhuma venda encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.map(sale => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">#{sale.numero}</TableCell>
                        <TableCell>{sale.cliente_nome || '-'}</TableCell>
                        <TableCell>{dateFormatters.short(sale.created_at)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {currencyFormatters.brl(sale.total)}
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded text-xs bg-success/10 text-success">
                            {sale.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {sales.length > 0 && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total de Vendas:</span>
                  <span className="text-xl font-bold text-primary">
                    {currencyFormatters.brl(sales.reduce((sum, s) => sum + Number(s.total), 0))}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Balanço Patrimonial */}
      {selectedReport === 'balanco' && (
        <Card>
          <CardHeader>
            <CardTitle>Balanço Patrimonial</CardTitle>
            <CardDescription>Período: {month.replace('-', '/')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ATIVO */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-primary/10 p-3 border-b">
                  <h3 className="font-bold text-primary">ATIVO</h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Caixa e Equivalentes</TableCell>
                      <TableCell className="text-right font-semibold">
                        {currencyFormatters.brl(
                          cashClosings.reduce((sum, c) => sum + (c.actual_cash || 0), 0)
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Contas a Receber</TableCell>
                      <TableCell className="text-right font-semibold">
                        {currencyFormatters.brl(
                          transactions
                            .filter(t => t.type === 'entrada' && t.reference_type === 'bill')
                            .reduce((sum, t) => sum + t.amount, 0)
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/50">
                      <TableCell className="font-bold">TOTAL DO ATIVO</TableCell>
                      <TableCell className="text-right font-bold">
                        {currencyFormatters.brl(
                          cashClosings.reduce((sum, c) => sum + (c.actual_cash || 0), 0) +
                          transactions
                            .filter(t => t.type === 'entrada' && t.reference_type === 'bill')
                            .reduce((sum, t) => sum + t.amount, 0)
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* PASSIVO */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-destructive/10 p-3 border-b">
                  <h3 className="font-bold text-destructive">PASSIVO</h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Contas a Pagar</TableCell>
                      <TableCell className="text-right font-semibold">
                        {currencyFormatters.brl(
                          bills
                            .filter(b => b.status === 'pendente')
                            .reduce((sum, b) => sum + b.amount, 0)
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/50">
                      <TableCell className="font-bold">TOTAL DO PASSIVO</TableCell>
                      <TableCell className="text-right font-bold">
                        {currencyFormatters.brl(
                          bills
                            .filter(b => b.status === 'pendente')
                            .reduce((sum, b) => sum + b.amount, 0)
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* PATRIMÔNIO LÍQUIDO */}
            <div className="mt-6 border rounded-lg overflow-hidden">
              <div className="bg-primary/10 p-3 border-b">
                <h3 className="font-bold text-primary">PATRIMÔNIO LÍQUIDO</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Lucro Acumulado</TableCell>
                    <TableCell className="text-right font-semibold">
                      {currencyFormatters.brl(
                        transactions
                          .filter(t => t.type === 'entrada')
                          .reduce((sum, t) => sum + t.amount, 0) -
                        transactions
                          .filter(t => t.type === 'saida')
                          .reduce((sum, t) => sum + t.amount, 0)
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-bold">TOTAL DO PATRIMÔNIO LÍQUIDO</TableCell>
                    <TableCell className="text-right font-bold">
                      {currencyFormatters.brl(
                        transactions
                          .filter(t => t.type === 'entrada')
                          .reduce((sum, t) => sum + t.amount, 0) -
                        transactions
                          .filter(t => t.type === 'saida')
                          .reduce((sum, t) => sum + t.amount, 0)
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráficos e Visualizações */}
      {selectedReport === 'graficos' && (
        <FinancialCharts month={month} />
      )}
    </div>
  );
}
