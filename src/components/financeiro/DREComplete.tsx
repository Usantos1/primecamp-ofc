import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { currencyFormatters } from '@/utils/formatters';
import { useFinancialTransactions, useFinancialCategories } from '@/hooks/useFinanceiro';
import { useQuery } from '@tanstack/react-query';
import { from } from '@/integrations/db/client';
import { cn } from '@/lib/utils';

interface DRECompleteProps {
  month?: string;
  startDate?: string;
  endDate?: string;
}

interface DRESection {
  title: string;
  items: { descricao: string; valor: number }[];
  total: number;
  type: 'receita' | 'despesa';
}

export function DREComplete({ month, startDate, endDate }: DRECompleteProps) {
  const { transactions } = useFinancialTransactions({ month });
  const { data: categories = [] } = useFinancialCategories();

  // Buscar vendas do período
  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ['sales-dre', startDate, endDate],
    queryFn: async () => {
      try {
        let q = from('sales')
          .select('*')
          .eq('status', 'paid');
        
        // Só aplicar filtro se ambos estiverem definidos e não vazios
        if (startDate && endDate && startDate !== '' && endDate !== '') {
          q = q.gte('created_at', startDate).lte('created_at', endDate + 'T23:59:59');
        }
        
        const { data, error } = await q.execute();
        if (error) {
          console.warn('Erro ao buscar vendas DRE:', error);
          return [];
        }
        console.log('[DRE] Vendas encontradas:', data?.length || 0, 'Total:', data?.reduce((s: number, v: any) => s + Number(v.total || 0), 0));
        return data || [];
      } catch (err) {
        console.warn('Erro ao buscar vendas DRE:', err);
        return [];
      }
    },
  });
  
  // Buscar contas pagas no período
  const { data: billsPaid = [], isLoading: billsLoading } = useQuery({
    queryKey: ['bills-paid-dre', startDate, endDate],
    queryFn: async () => {
      try {
        let q = from('bills_to_pay')
          .select('*')
          .eq('status', 'pago');
        
        // Só aplicar filtro se ambos estiverem definidos e não vazios
        if (startDate && endDate && startDate !== '' && endDate !== '') {
          q = q.gte('payment_date', startDate).lte('payment_date', endDate);
        }
        
        const { data, error } = await q.execute();
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn('Erro ao buscar contas pagas DRE:', err);
        return [];
      }
    },
  });

  // Calcular receitas (incluindo vendas)
  const { receitasOperacionais, totalReceitasOperacionais } = React.useMemo(() => {
    const receitas: Record<string, number> = {};
    
    // Transações manuais de entrada
    transactions.filter(t => t.type === 'entrada').forEach(t => {
      const catName = t.category?.name || 'Outras Receitas';
      receitas[catName] = (receitas[catName] || 0) + t.amount;
    });
    
    // Vendas do PDV
    const totalVendas = sales.reduce((sum: number, s: any) => sum + Number(s.total || 0), 0);
    if (totalVendas > 0) {
      receitas['Vendas de Produtos/Serviços'] = (receitas['Vendas de Produtos/Serviços'] || 0) + totalVendas;
    }
    
    const total = Object.values(receitas).reduce((sum, v) => sum + v, 0);
    
    return { receitasOperacionais: receitas, totalReceitasOperacionais: total };
  }, [transactions, sales]);

  // Calcular despesas (incluindo contas pagas)
  const { despesasOperacionais, totalDespesasOperacionais } = React.useMemo(() => {
    const despesas: Record<string, number> = {};
    
    // Transações manuais de saída
    transactions.filter(t => t.type === 'saida').forEach(t => {
      const catName = t.category?.name || 'Outras Despesas';
      despesas[catName] = (despesas[catName] || 0) + t.amount;
    });
    
    // Contas pagas
    billsPaid.forEach((bill: any) => {
      const catName = bill.expense_type === 'fixa' ? 'Despesas Fixas' : 'Despesas Variáveis';
      despesas[catName] = (despesas[catName] || 0) + Number(bill.amount || 0);
    });
    
    const total = Object.values(despesas).reduce((sum, v) => sum + v, 0);
    
    return { despesasOperacionais: despesas, totalDespesasOperacionais: total };
  }, [transactions, billsPaid]);

  // Resultado Operacional
  const resultadoOperacional = totalReceitasOperacionais - totalDespesasOperacionais;

  // Receitas Não Operacionais (se houver)
  const receitasNaoOperacionais: Record<string, number> = {};
  const totalReceitasNaoOperacionais = Object.values(receitasNaoOperacionais).reduce((sum, v) => sum + v, 0);

  // Despesas Não Operacionais (se houver)
  const despesasNaoOperacionais: Record<string, number> = {};
  const totalDespesasNaoOperacionais = Object.values(despesasNaoOperacionais).reduce((sum, v) => sum + v, 0);

  // Resultado Antes do IR
  const resultadoAntesIR = resultadoOperacional + totalReceitasNaoOperacionais - totalDespesasNaoOperacionais;

  // Impostos (estimado - pode ser calculado de forma mais precisa)
  const impostos = totalReceitasOperacionais * 0.06; // 6% estimado
  const lucroLiquido = resultadoAntesIR - impostos;
  const margemLiquida = totalReceitasOperacionais > 0 ? (lucroLiquido / totalReceitasOperacionais) * 100 : 0;
  const margemOperacional = totalReceitasOperacionais > 0 ? (resultadoOperacional / totalReceitasOperacionais) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>DRE - Demonstrativo de Resultado do Exercício</CardTitle>
        <CardDescription>Período: {month ? month.replace('-', '/') : 'Todo o período'}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-bold w-[60%]">Descrição</TableHead>
                <TableHead className="text-right font-bold">Valor (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* RECEITAS OPERACIONAIS */}
              <TableRow className="bg-green-50/50">
                <TableCell className="font-bold text-green-700 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  RECEITAS OPERACIONAIS
                </TableCell>
                <TableCell className="text-right font-bold text-green-700">
                  {currencyFormatters.brl(totalReceitasOperacionais)}
                </TableCell>
              </TableRow>
              {Object.entries(receitasOperacionais).map(([descricao, valor]) => (
                <TableRow key={descricao}>
                  <TableCell className="pl-8">{descricao}</TableCell>
                  <TableCell className="text-right text-green-600">{currencyFormatters.brl(valor)}</TableCell>
                </TableRow>
              ))}

              {/* DESPESAS OPERACIONAIS */}
              <TableRow className="bg-red-50/50">
                <TableCell className="font-bold text-red-700 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  (-) DESPESAS OPERACIONAIS
                </TableCell>
                <TableCell className="text-right font-bold text-red-700">
                  ({currencyFormatters.brl(totalDespesasOperacionais)})
                </TableCell>
              </TableRow>
              {Object.entries(despesasOperacionais).map(([descricao, valor]) => (
                <TableRow key={descricao}>
                  <TableCell className="pl-8">{descricao}</TableCell>
                  <TableCell className="text-right text-red-600">({currencyFormatters.brl(valor)})</TableCell>
                </TableRow>
              ))}

              {/* RESULTADO OPERACIONAL */}
              <TableRow className={cn(
                "border-t-2 border-b-2",
                resultadoOperacional >= 0 ? 'bg-blue-50/50' : 'bg-red-100/50'
              )}>
                <TableCell className="font-bold text-lg">RESULTADO OPERACIONAL (EBITDA)</TableCell>
                <TableCell className={cn(
                  "text-right font-bold text-lg",
                  resultadoOperacional >= 0 ? 'text-blue-700' : 'text-red-700'
                )}>
                  {currencyFormatters.brl(resultadoOperacional)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-8 text-sm text-muted-foreground">Margem Operacional</TableCell>
                <TableCell className={cn(
                  "text-right font-semibold",
                  margemOperacional >= 0 ? 'text-blue-600' : 'text-red-600'
                )}>
                  {margemOperacional.toFixed(2)}%
                </TableCell>
              </TableRow>

              {/* RECEITAS NÃO OPERACIONAIS */}
              {totalReceitasNaoOperacionais > 0 && (
                <>
                  <TableRow className="bg-green-50/30">
                    <TableCell className="font-bold text-green-700">RECEITAS NÃO OPERACIONAIS</TableCell>
                    <TableCell className="text-right font-bold text-green-700">
                      {currencyFormatters.brl(totalReceitasNaoOperacionais)}
                    </TableCell>
                  </TableRow>
                  {Object.entries(receitasNaoOperacionais).map(([descricao, valor]) => (
                    <TableRow key={descricao}>
                      <TableCell className="pl-8">{descricao}</TableCell>
                      <TableCell className="text-right text-green-600">{currencyFormatters.brl(valor)}</TableCell>
                    </TableRow>
                  ))}
                </>
              )}

              {/* DESPESAS NÃO OPERACIONAIS */}
              {totalDespesasNaoOperacionais > 0 && (
                <>
                  <TableRow className="bg-red-50/30">
                    <TableCell className="font-bold text-red-700">(-) DESPESAS NÃO OPERACIONAIS</TableCell>
                    <TableCell className="text-right font-bold text-red-700">
                      ({currencyFormatters.brl(totalDespesasNaoOperacionais)})
                    </TableCell>
                  </TableRow>
                  {Object.entries(despesasNaoOperacionais).map(([descricao, valor]) => (
                    <TableRow key={descricao}>
                      <TableCell className="pl-8">{descricao}</TableCell>
                      <TableCell className="text-right text-red-600">({currencyFormatters.brl(valor)})</TableCell>
                    </TableRow>
                  ))}
                </>
              )}

              {/* RESULTADO ANTES DO IR */}
              <TableRow className="border-t">
                <TableCell className="font-bold">RESULTADO ANTES DO IR</TableCell>
                <TableCell className={cn(
                  "text-right font-bold",
                  resultadoAntesIR >= 0 ? 'text-blue-700' : 'text-red-700'
                )}>
                  {currencyFormatters.brl(resultadoAntesIR)}
                </TableCell>
              </TableRow>

              {/* IMPOSTOS */}
              {impostos > 0 && (
                <TableRow>
                  <TableCell className="pl-8">(-) Impostos e Contribuições (Estimado)</TableCell>
                  <TableCell className="text-right text-red-600">({currencyFormatters.brl(impostos)})</TableCell>
                </TableRow>
              )}

              {/* LUCRO LÍQUIDO */}
              <TableRow className={cn(
                "border-t-2 border-b-2 bg-primary/5",
                lucroLiquido >= 0 ? 'border-primary' : 'border-destructive'
              )}>
                <TableCell className="font-bold text-xl flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  LUCRO LÍQUIDO
                </TableCell>
                <TableCell className={cn(
                  "text-right font-bold text-xl",
                  lucroLiquido >= 0 ? 'text-primary' : 'text-destructive'
                )}>
                  {currencyFormatters.brl(lucroLiquido)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Margem Líquida</TableCell>
                <TableCell className={cn(
                  "text-right font-bold text-lg",
                  margemLiquida >= 0 ? 'text-primary' : 'text-destructive'
                )}>
                  {margemLiquida.toFixed(2)}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Indicadores */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Receitas Totais</p>
            <p className="text-2xl font-bold text-green-600">{currencyFormatters.brl(totalReceitasOperacionais)}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Despesas Totais</p>
            <p className="text-2xl font-bold text-red-600">{currencyFormatters.brl(totalDespesasOperacionais)}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Margem Líquida</p>
            <p className={cn(
              "text-2xl font-bold",
              margemLiquida >= 0 ? 'text-primary' : 'text-destructive'
            )}>
              {margemLiquida.toFixed(2)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

