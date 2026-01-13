import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, DollarSign, Package } from 'lucide-react';
import { currencyFormatters } from '@/utils/formatters';
// TODO: Implementar hooks do sistema financeiro antigo ou migrar para novo sistema
// import { useFinancialTransactions, useFinancialCategories } from '@/hooks/useFinanceiro';
import { useQuery } from '@tanstack/react-query';
import { from } from '@/integrations/db/client';
import { cn } from '@/lib/utils';

interface DRECompleteProps {
  month?: string;
  startDate?: string;
  endDate?: string;
}

// Função para extrair custo da observação
const extractCusto = (observacoes: string | null): number => {
  if (!observacoes) return 0;
  const custoMatch = observacoes.match(/Custo:\s*R\$\s*([\d.,]+)/i);
  if (!custoMatch) return 0;
  return parseFloat(custoMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
};

export function DREComplete({ month, startDate, endDate }: DRECompleteProps) {
  // TODO: Implementar hooks do sistema financeiro antigo
  const transactions: any[] = [];
  const categories: any[] = [];

  // Buscar vendas do período (incluindo observacoes para extrair custo)
  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ['sales-dre', startDate, endDate],
    queryFn: async () => {
      try {
        let q = from('sales')
          .select('id, total, observacoes, created_at')
          .eq('status', 'paid');
        
        if (startDate && endDate && startDate !== '' && endDate !== '') {
          q = q.gte('created_at', startDate).lte('created_at', endDate + 'T23:59:59');
        }
        
        const { data, error } = await q.execute();
        if (error) {
          console.warn('Erro ao buscar vendas DRE:', error);
          return [];
        }
        return data || [];
      } catch (err) {
        console.warn('Erro ao buscar vendas DRE:', err);
        return [];
      }
    },
  });
  
  // Buscar contas pagas no período (filtrar por payment_date se existir, caso contrário due_date)
  const { data: billsPaid = [], isLoading: billsLoading } = useQuery({
    queryKey: ['bills-paid-dre', startDate, endDate],
    queryFn: async () => {
      try {
        let q = from('bills_to_pay')
          .select('*')
          .eq('status', 'pago');
        
        if (startDate && endDate && startDate !== '' && endDate !== '') {
          // CORRIGIDO: Usar payment_date ao invés de due_date para contas pagas
          // payment_date é a data quando a conta foi realmente paga
          // Se payment_date não existir, o backend/query vai retornar erro, então usamos due_date como fallback
          try {
            q = q.gte('payment_date', startDate).lte('payment_date', endDate);
            const { data, error } = await q.execute();
            if (error) throw error;
            return data || [];
          } catch (paymentDateError) {
            // Fallback: se payment_date não existir, usar due_date
            console.warn('payment_date não disponível, usando due_date como fallback:', paymentDateError);
            q = from('bills_to_pay')
              .select('*')
              .eq('status', 'pago')
              .gte('due_date', startDate).lte('due_date', endDate);
            const { data, error } = await q.execute();
            if (error) throw error;
            return data || [];
          }
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

  // Calcular valores do DRE
  const dreData = React.useMemo(() => {
    // Garantir que sales e billsPaid são arrays válidos
    const validSales = Array.isArray(sales) ? sales : [];
    const validBills = Array.isArray(billsPaid) ? billsPaid : [];
    const validTransactions = Array.isArray(transactions) ? transactions : [];
    
    // RECEITA BRUTA DE VENDAS
    const receitaBrutaVendas = validSales.reduce((sum: number, s: any) => {
      const valor = Number(s.total || 0);
      return sum + (isNaN(valor) ? 0 : valor);
    }, 0);
    
    // CMV - Custo das Mercadorias Vendidas (extraído da observação)
    const cmv = validSales.reduce((sum: number, s: any) => {
      const valor = extractCusto(s.observacoes);
      return sum + (isNaN(valor) ? 0 : valor);
    }, 0);
    
    // LUCRO BRUTO
    const lucroBruto = receitaBrutaVendas - cmv;
    const margemBruta = receitaBrutaVendas > 0 ? (lucroBruto / receitaBrutaVendas) * 100 : 0;
    
    // Outras receitas (transações manuais de entrada)
    const outrasReceitas: Record<string, number> = {};
    validTransactions.filter(t => t.type === 'entrada').forEach(t => {
      const catName = t.category?.name || 'Outras Receitas';
      const valor = Number(t.amount || 0);
      outrasReceitas[catName] = (outrasReceitas[catName] || 0) + (isNaN(valor) ? 0 : valor);
    });
    const totalOutrasReceitas = Object.values(outrasReceitas).reduce((sum, v) => sum + v, 0);
    
    // DESPESAS OPERACIONAIS (contas a pagar + transações manuais de saída)
    const despesasFixas: Record<string, number> = {};
    const despesasVariaveis: Record<string, number> = {};
    
    // Contas pagas - agrupar por descrição
    validBills.forEach((bill: any) => {
      const descricao = bill.description || 'Outras Despesas';
      const valor = Number(bill.amount || 0);
      const valorValido = isNaN(valor) ? 0 : valor;
      if (bill.expense_type === 'fixa') {
        despesasFixas[descricao] = (despesasFixas[descricao] || 0) + valorValido;
      } else {
        despesasVariaveis[descricao] = (despesasVariaveis[descricao] || 0) + valorValido;
      }
    });
    
    // Transações manuais de saída
    validTransactions.filter(t => t.type === 'saida').forEach(t => {
      const catName = t.category?.name || 'Outras Despesas';
      const valor = Number(t.amount || 0);
      despesasVariaveis[catName] = (despesasVariaveis[catName] || 0) + (isNaN(valor) ? 0 : valor);
    });
    
    const totalDespesasFixas = Object.values(despesasFixas).reduce((sum, v) => sum + v, 0);
    const totalDespesasVariaveis = Object.values(despesasVariaveis).reduce((sum, v) => sum + v, 0);
    const totalDespesasOperacionais = totalDespesasFixas + totalDespesasVariaveis;
    
    // RESULTADO OPERACIONAL (EBITDA) = Lucro Bruto - Despesas Operacionais
    const resultadoOperacional = lucroBruto + totalOutrasReceitas - totalDespesasOperacionais;
    const totalReceitas = receitaBrutaVendas + totalOutrasReceitas;
    const margemOperacional = totalReceitas > 0 ? (resultadoOperacional / totalReceitas) * 100 : 0;
    
    // IMPOSTOS (estimado 6% sobre receitas)
    const impostos = totalReceitas > 0 ? totalReceitas * 0.06 : 0;
    
    // LUCRO LÍQUIDO = Resultado Operacional - Impostos
    const lucroLiquido = resultadoOperacional - impostos;
    const margemLiquida = totalReceitas > 0 ? (lucroLiquido / totalReceitas) * 100 : 0;
    
    // Debug log para verificar valores
    console.log('[DRE] Cálculos:', {
      receitaBrutaVendas,
      cmv,
      lucroBruto,
      totalDespesasOperacionais,
      resultadoOperacional,
      impostos,
      lucroLiquido,
      salesCount: validSales.length,
      billsCount: validBills.length
    });
    
    return {
      receitaBrutaVendas,
      cmv,
      lucroBruto,
      margemBruta,
      outrasReceitas,
      totalOutrasReceitas,
      despesasFixas,
      despesasVariaveis,
      totalDespesasFixas,
      totalDespesasVariaveis,
      totalDespesasOperacionais,
      resultadoOperacional,
      margemOperacional,
      impostos,
      lucroLiquido,
      margemLiquida,
      totalReceitas,
    };
  }, [transactions, sales, billsPaid]);

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
              {/* RECEITA BRUTA DE VENDAS */}
              <TableRow className="bg-green-50/50">
                <TableCell className="font-bold text-green-700 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  RECEITA BRUTA DE VENDAS
                </TableCell>
                <TableCell className="text-right font-bold text-green-700">
                  {currencyFormatters.brl(dreData.receitaBrutaVendas)}
                </TableCell>
              </TableRow>

              {/* CMV - CUSTO DAS MERCADORIAS VENDIDAS */}
              <TableRow className="bg-orange-50/50">
                <TableCell className="font-bold text-orange-700 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  (-) CMV - Custo das Mercadorias/Peças
                </TableCell>
                <TableCell className="text-right font-bold text-orange-700">
                  ({currencyFormatters.brl(dreData.cmv)})
                </TableCell>
              </TableRow>

              {/* LUCRO BRUTO */}
              <TableRow className={cn(
                "border-t-2 border-b-2",
                dreData.lucroBruto >= 0 ? 'bg-blue-50/50' : 'bg-red-100/50'
              )}>
                <TableCell className="font-bold text-lg">LUCRO BRUTO</TableCell>
                <TableCell className={cn(
                  "text-right font-bold text-lg",
                  dreData.lucroBruto >= 0 ? 'text-blue-700' : 'text-red-700'
                )}>
                  {currencyFormatters.brl(dreData.lucroBruto)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-8 text-sm text-muted-foreground">Margem Bruta</TableCell>
                <TableCell className={cn(
                  "text-right font-semibold",
                  dreData.margemBruta >= 0 ? 'text-blue-600' : 'text-red-600'
                )}>
                  {dreData.margemBruta.toFixed(2)}%
                </TableCell>
              </TableRow>

              {/* OUTRAS RECEITAS */}
              {dreData.totalOutrasReceitas > 0 && (
                <>
                  <TableRow className="bg-green-50/30">
                    <TableCell className="font-bold text-green-700">(+) OUTRAS RECEITAS</TableCell>
                    <TableCell className="text-right font-bold text-green-700">
                      {currencyFormatters.brl(dreData.totalOutrasReceitas)}
                    </TableCell>
                  </TableRow>
                  {Object.entries(dreData.outrasReceitas).map(([descricao, valor]) => (
                    <TableRow key={descricao}>
                      <TableCell className="pl-8">{descricao}</TableCell>
                      <TableCell className="text-right text-green-600">{currencyFormatters.brl(valor)}</TableCell>
                    </TableRow>
                  ))}
                </>
              )}

              {/* DESPESAS FIXAS */}
              {dreData.totalDespesasFixas > 0 && (
                <>
                  <TableRow className="bg-red-50/50">
                    <TableCell className="font-bold text-red-700 flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      (-) DESPESAS FIXAS
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-700">
                      ({currencyFormatters.brl(dreData.totalDespesasFixas)})
                    </TableCell>
                  </TableRow>
                  {Object.entries(dreData.despesasFixas).map(([descricao, valor]) => (
                    <TableRow key={`fixa-${descricao}`}>
                      <TableCell className="pl-8">{descricao}</TableCell>
                      <TableCell className="text-right text-red-600">({currencyFormatters.brl(valor)})</TableCell>
                    </TableRow>
                  ))}
                </>
              )}

              {/* DESPESAS VARIÁVEIS */}
              {dreData.totalDespesasVariaveis > 0 && (
                <>
                  <TableRow className="bg-red-50/30">
                    <TableCell className="font-bold text-red-600">(-) DESPESAS VARIÁVEIS</TableCell>
                    <TableCell className="text-right font-bold text-red-600">
                      ({currencyFormatters.brl(dreData.totalDespesasVariaveis)})
                    </TableCell>
                  </TableRow>
                  {Object.entries(dreData.despesasVariaveis).map(([descricao, valor]) => (
                    <TableRow key={`var-${descricao}`}>
                      <TableCell className="pl-8">{descricao}</TableCell>
                      <TableCell className="text-right text-red-600">({currencyFormatters.brl(valor)})</TableCell>
                    </TableRow>
                  ))}
                </>
              )}

              {/* TOTAL DESPESAS OPERACIONAIS */}
              <TableRow className="bg-red-100/50">
                <TableCell className="font-bold text-red-700">TOTAL DESPESAS OPERACIONAIS</TableCell>
                <TableCell className="text-right font-bold text-red-700">
                  ({currencyFormatters.brl(dreData.totalDespesasOperacionais)})
                </TableCell>
              </TableRow>

              {/* RESULTADO OPERACIONAL (EBITDA) */}
              <TableRow className={cn(
                "border-t-2 border-b-2",
                dreData.resultadoOperacional >= 0 ? 'bg-blue-50/50' : 'bg-red-100/50'
              )}>
                <TableCell className="font-bold text-lg">RESULTADO OPERACIONAL (EBITDA)</TableCell>
                <TableCell className={cn(
                  "text-right font-bold text-lg",
                  dreData.resultadoOperacional >= 0 ? 'text-blue-700' : 'text-red-700'
                )}>
                  {currencyFormatters.brl(dreData.resultadoOperacional)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-8 text-sm text-muted-foreground">Margem Operacional</TableCell>
                <TableCell className={cn(
                  "text-right font-semibold",
                  dreData.margemOperacional >= 0 ? 'text-blue-600' : 'text-red-600'
                )}>
                  {dreData.margemOperacional.toFixed(2)}%
                </TableCell>
              </TableRow>

              {/* IMPOSTOS */}
              {dreData.impostos > 0 && (
                <TableRow>
                  <TableCell className="pl-8">(-) Impostos e Contribuições (Estimado 6%)</TableCell>
                  <TableCell className="text-right text-red-600">({currencyFormatters.brl(dreData.impostos)})</TableCell>
                </TableRow>
              )}

              {/* LUCRO LÍQUIDO */}
              <TableRow className={cn(
                "border-t-2 border-b-2 bg-primary/5",
                dreData.lucroLiquido >= 0 ? 'border-primary' : 'border-destructive'
              )}>
                <TableCell className="font-bold text-xl flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  LUCRO LÍQUIDO
                </TableCell>
                <TableCell className={cn(
                  "text-right font-bold text-xl",
                  dreData.lucroLiquido >= 0 ? 'text-primary' : 'text-destructive'
                )}>
                  {currencyFormatters.brl(dreData.lucroLiquido)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Margem Líquida</TableCell>
                <TableCell className={cn(
                  "text-right font-bold text-lg",
                  dreData.margemLiquida >= 0 ? 'text-primary' : 'text-destructive'
                )}>
                  {dreData.margemLiquida.toFixed(2)}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Indicadores */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-green-50 rounded-lg text-center border border-green-200">
            <p className="text-xs text-muted-foreground">Receita Bruta</p>
            <p className="text-lg font-bold text-green-600">{currencyFormatters.brl(dreData.receitaBrutaVendas)}</p>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg text-center border border-orange-200">
            <p className="text-xs text-muted-foreground">Custo (CMV)</p>
            <p className="text-lg font-bold text-orange-600">{currencyFormatters.brl(dreData.cmv)}</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg text-center border border-red-200">
            <p className="text-xs text-muted-foreground">Despesas</p>
            <p className="text-lg font-bold text-red-600">{currencyFormatters.brl(dreData.totalDespesasOperacionais)}</p>
          </div>
          <div className={cn(
            "p-3 rounded-lg text-center border",
            dreData.lucroLiquido >= 0 ? 'bg-primary/10 border-primary/30' : 'bg-destructive/10 border-destructive/30'
          )}>
            <p className="text-xs text-muted-foreground">Lucro Líquido</p>
            <p className={cn(
              "text-lg font-bold",
              dreData.lucroLiquido >= 0 ? 'text-primary' : 'text-destructive'
            )}>
              {currencyFormatters.brl(dreData.lucroLiquido)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

