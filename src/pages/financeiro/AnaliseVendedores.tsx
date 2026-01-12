import { useState, useMemo } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { FinanceiroNavMenu } from '@/components/financeiro/FinanceiroNavMenu';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, ShoppingCart, Wrench, DollarSign, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { currencyFormatters } from '@/utils/formatters';
import { useAnaliseVendedores } from '@/hooks/useFinanceiro';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AnaliseVendedores() {
  const [periodoInicio, setPeriodoInicio] = useState<Date | undefined>(
    new Date(new Date().setDate(new Date().getDate() - 30))
  );
  const [periodoFim, setPeriodoFim] = useState<Date | undefined>(new Date());
  const [vendedorFiltro, setVendedorFiltro] = useState<string>('all');
  
  const formattedStartDate = periodoInicio ? format(periodoInicio, 'yyyy-MM-dd') : undefined;
  const formattedEndDate = periodoFim ? format(periodoFim, 'yyyy-MM-dd') : undefined;
  const vendedorId = vendedorFiltro !== 'all' ? vendedorFiltro : undefined;
  
  const { data: vendedores, isLoading } = useAnaliseVendedores(formattedStartDate, formattedEndDate, vendedorId);
  
  const dadosGrafico = useMemo(() => {
    if (!vendedores) return [];
    return vendedores
      .slice(0, 10)
      .map(v => ({
        nome: v.nome.length > 15 ? v.nome.substring(0, 15) + '...' : v.nome,
        totalVendido: v.totalVendido,
        vendasPDV: v.vendasPDV,
        vendasOS: v.vendasOS,
      }));
  }, [vendedores]);
  
  const vendedoresOrdenados = useMemo(() => {
    return (vendedores || []).sort((a, b) => b.totalVendido - a.totalVendido);
  }, [vendedores]);
  
  const totalGeral = useMemo(() => {
    return (vendedores || []).reduce((sum, v) => sum + v.totalVendido, 0);
  }, [vendedores]);
  
  if (isLoading) {
    return (
      <ModernLayout title="Análise de Vendedores" subtitle="Performance e produtividade dos vendedores">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </ModernLayout>
    );
  }
  
  return (
    <ModernLayout title="Análise de Vendedores" subtitle="Performance e produtividade dos vendedores">
      <div className="flex flex-col h-full overflow-hidden gap-4">
        {/* Menu de Navegação */}
        <FinanceiroNavMenu />
        
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
              <Label className="text-xs font-semibold text-muted-foreground">Vendedor</Label>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal h-10 rounded-lg border-[3px] border-gray-400"
                disabled
              >
                <Users className="mr-2 h-4 w-4" />
                Todos os vendedores
              </Button>
            </div>
          </div>
        </Card>
        
        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Total Vendedores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vendedoresOrdenados.length}</div>
            </CardContent>
          </Card>
          
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Total Vendido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currencyFormatters.brl(totalGeral)}</div>
            </CardContent>
          </Card>
          
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Vendas PDV
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vendedoresOrdenados.reduce((sum, v) => sum + v.vendasPDV, 0)}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Vendas OS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vendedoresOrdenados.reduce((sum, v) => sum + v.vendasOS, 0)}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Gráfico */}
        {dadosGrafico.length > 0 && (
          <Card className="border-[3px] border-gray-400 rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Top 10 Vendedores</CardTitle>
              <CardDescription>Comparação de vendas por vendedor</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nome" angle={-45} textAnchor="end" height={100} />
                  <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => currencyFormatters.brl(value)} />
                  <Legend />
                  <Bar dataKey="totalVendido" fill="#3b82f6" name="Total Vendido" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        
        {/* Tabela */}
        <Card className="flex-1 overflow-hidden border-[3px] border-gray-400 rounded-xl shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Detalhamento por Vendedor</CardTitle>
            <CardDescription>Performance detalhada de cada vendedor</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10 border-b-[3px] border-gray-400">
                <TableRow>
                  <TableHead className="font-bold">#</TableHead>
                  <TableHead className="font-bold">Nome</TableHead>
                  <TableHead className="font-bold text-right">Vendas PDV</TableHead>
                  <TableHead className="font-bold text-right">Vendas OS</TableHead>
                  <TableHead className="font-bold text-right">Total Vendas</TableHead>
                  <TableHead className="font-bold text-right">Total Vendido</TableHead>
                  <TableHead className="font-bold text-right">Ticket Médio</TableHead>
                  <TableHead className="font-bold">Período</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendedoresOrdenados.map((vendedor, index) => (
                  <TableRow key={vendedor.id} className="border-b-[2px] border-gray-300">
                    <TableCell className="font-semibold">{index + 1}</TableCell>
                    <TableCell className="font-semibold">{vendedor.nome}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="bg-blue-50">{vendedor.vendasPDV}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="bg-green-50">{vendedor.vendasOS}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{vendedor.totalVendas}</TableCell>
                    <TableCell className="text-right font-bold">{currencyFormatters.brl(vendedor.totalVendido)}</TableCell>
                    <TableCell className="text-right">{currencyFormatters.brl(vendedor.ticketMedio)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {vendedor.primeiraVenda && format(new Date(vendedor.primeiraVenda), 'dd/MM/yyyy', { locale: ptBR })} - {' '}
                      {vendedor.ultimaVenda && format(new Date(vendedor.ultimaVenda), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
                {vendedoresOrdenados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Nenhum vendedor encontrado no período selecionado
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
