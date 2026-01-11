import { useState, useMemo } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Package, TrendingUp, DollarSign, TrendingDown, Calendar, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { currencyFormatters } from '@/utils/formatters';
import { useAnaliseProdutos } from '@/hooks/useFinanceiro';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AnaliseProdutos() {
  const [periodoInicio, setPeriodoInicio] = useState<Date | undefined>(
    new Date(new Date().setDate(new Date().getDate() - 30))
  );
  const [periodoFim, setPeriodoFim] = useState<Date | undefined>(new Date());
  const [ordem, setOrdem] = useState<'receita' | 'lucro' | 'margem' | 'quantidade'>('receita');
  
  const formattedStartDate = periodoInicio ? format(periodoInicio, 'yyyy-MM-dd') : undefined;
  const formattedEndDate = periodoFim ? format(periodoFim, 'yyyy-MM-dd') : undefined;
  
  const { data: produtos, isLoading } = useAnaliseProdutos(formattedStartDate, formattedEndDate);
  
  const produtosOrdenados = useMemo(() => {
    if (!produtos) return [];
    
    const sorted = [...produtos].sort((a, b) => {
      switch (ordem) {
        case 'receita':
          return b.receitaTotal - a.receitaTotal;
        case 'lucro':
          return b.lucroTotal - a.lucroTotal;
        case 'margem':
          return b.margemPercentual - a.margemPercentual;
        case 'quantidade':
          return b.quantidadeVendida - a.quantidadeVendida;
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [produtos, ordem]);
  
  const dadosGrafico = useMemo(() => {
    return produtosOrdenados
      .slice(0, 10)
      .map(p => ({
        nome: p.nome.length > 20 ? p.nome.substring(0, 20) + '...' : p.nome,
        receita: p.receitaTotal,
        lucro: p.lucroTotal,
        margem: p.margemPercentual,
      }));
  }, [produtosOrdenados]);
  
  const totalReceita = useMemo(() => {
    return produtosOrdenados.reduce((sum, p) => sum + p.receitaTotal, 0);
  }, [produtosOrdenados]);
  
  const totalLucro = useMemo(() => {
    return produtosOrdenados.reduce((sum, p) => sum + p.lucroTotal, 0);
  }, [produtosOrdenados]);
  
  const margemMedia = useMemo(() => {
    if (totalReceita === 0) return 0;
    return (totalLucro / totalReceita) * 100;
  }, [totalReceita, totalLucro]);
  
  if (isLoading) {
    return (
      <ModernLayout title="Análise de Produtos" subtitle="Performance e rentabilidade dos produtos">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </ModernLayout>
    );
  }
  
  const getMargemBadge = (margem: number) => {
    if (margem >= 50) {
      return <Badge className="bg-green-500">Excelente ({margem.toFixed(1)}%)</Badge>;
    } else if (margem >= 30) {
      return <Badge className="bg-blue-500">Boa ({margem.toFixed(1)}%)</Badge>;
    } else if (margem >= 15) {
      return <Badge className="bg-yellow-500">Regular ({margem.toFixed(1)}%)</Badge>;
    } else {
      return <Badge variant="destructive">Baixa ({margem.toFixed(1)}%)</Badge>;
    }
  };
  
  return (
    <ModernLayout title="Análise de Produtos" subtitle="Performance e rentabilidade dos produtos">
      <div className="flex flex-col h-full overflow-hidden gap-4">
        {/* Filtros */}
        <Card className="flex-shrink-0 border-[3px] border-gray-400 rounded-xl shadow-sm p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Período Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10 rounded-lg border-[3px] border-gray-400",
                      !periodoInicio && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    <span className="truncate">
                      {periodoInicio ? format(periodoInicio, "dd/MM/yyyy", { locale: ptBR }) : "Data"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={periodoInicio} onSelect={setPeriodoInicio} initialFocus locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Período Fim</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10 rounded-lg border-[3px] border-gray-400",
                      !periodoFim && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    <span className="truncate">
                      {periodoFim ? format(periodoFim, "dd/MM/yyyy", { locale: ptBR }) : "Data"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={periodoFim} onSelect={setPeriodoFim} initialFocus locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Ordenar por</Label>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal h-10 rounded-lg border-[3px] border-gray-400"
                onClick={() => {
                  const ordemMap: Record<string, 'receita' | 'lucro' | 'margem' | 'quantidade'> = {
                    receita: 'lucro',
                    lucro: 'margem',
                    margem: 'quantidade',
                    quantidade: 'receita',
                  };
                  setOrdem(ordemMap[ordem]);
                }}
              >
                {ordem === 'receita' && 'Receita Total'}
                {ordem === 'lucro' && 'Lucro Total'}
                {ordem === 'margem' && 'Margem %'}
                {ordem === 'quantidade' && 'Quantidade Vendida'}
              </Button>
            </div>
          </div>
        </Card>
        
        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Total Produtos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{produtosOrdenados.length}</div>
            </CardContent>
          </Card>
          
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Receita Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currencyFormatters.brl(totalReceita)}</div>
            </CardContent>
          </Card>
          
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Lucro Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{currencyFormatters.brl(totalLucro)}</div>
            </CardContent>
          </Card>
          
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Margem Média
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{margemMedia.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Gráfico */}
        {dadosGrafico.length > 0 && (
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Top 10 Produtos</CardTitle>
              <CardDescription>Receita vs Lucro</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nome" angle={-45} textAnchor="end" height={100} />
                  <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => currencyFormatters.brl(value)} />
                  <Legend />
                  <Bar dataKey="receita" fill="#3b82f6" name="Receita" />
                  <Bar dataKey="lucro" fill="#10b981" name="Lucro" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        
        {/* Tabela */}
        <Card className="flex-1 overflow-hidden border-[3px] border-gray-400 rounded-xl shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Detalhamento por Produto</CardTitle>
            <CardDescription>Performance detalhada de cada produto</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10 border-b-[3px] border-gray-400">
                <TableRow>
                  <TableHead className="font-bold">#</TableHead>
                  <TableHead className="font-bold">Produto</TableHead>
                  <TableHead className="font-bold">Código</TableHead>
                  <TableHead className="font-bold text-right">Estoque</TableHead>
                  <TableHead className="font-bold text-right">Qtd Vendida</TableHead>
                  <TableHead className="font-bold text-right">Receita</TableHead>
                  <TableHead className="font-bold text-right">Custo</TableHead>
                  <TableHead className="font-bold text-right">Lucro</TableHead>
                  <TableHead className="font-bold text-right">Margem</TableHead>
                  <TableHead className="font-bold text-right">Preço Médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtosOrdenados.map((produto, index) => (
                  <TableRow key={produto.id} className="border-b-[2px] border-gray-300">
                    <TableCell className="font-semibold">{index + 1}</TableCell>
                    <TableCell className="font-semibold max-w-[200px] truncate" title={produto.nome}>
                      {produto.nome}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{produto.codigo || '-'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {produto.estoqueAtual <= 5 ? (
                        <Badge variant="destructive">{produto.estoqueAtual}</Badge>
                      ) : produto.estoqueAtual <= 10 ? (
                        <Badge className="bg-orange-500">{produto.estoqueAtual}</Badge>
                      ) : (
                        <span className="font-semibold">{produto.estoqueAtual}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{produto.quantidadeVendida}</TableCell>
                    <TableCell className="text-right font-bold">{currencyFormatters.brl(produto.receitaTotal)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{currencyFormatters.brl(produto.custoTotal)}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">{currencyFormatters.brl(produto.lucroTotal)}</TableCell>
                    <TableCell className="text-right">{getMargemBadge(produto.margemPercentual)}</TableCell>
                    <TableCell className="text-right">{currencyFormatters.brl(produto.precoMedioVenda)}</TableCell>
                  </TableRow>
                ))}
                {produtosOrdenados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      Nenhum produto encontrado no período selecionado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ModernLayout>
  );
}
