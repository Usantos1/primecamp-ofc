import { useEffect, useMemo, useState } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Calendar, Download, TrendingUp, DollarSign, ShoppingCart, 
  User, Package, BarChart3
} from 'lucide-react';
import { Badge as BadgeComponent } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useSales } from '@/hooks/usePDV';
import { supabase } from '@/integrations/supabase/client';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';

export default function Relatorios() {
  const { sales, isLoading } = useSales();
  const [periodoInicio, setPeriodoInicio] = useState<Date | undefined>(
    new Date(new Date().setDate(new Date().getDate() - 30))
  );
  const [periodoFim, setPeriodoFim] = useState<Date | undefined>(new Date());
  const [vendedorFilter, setVendedorFilter] = useState<string>('all');
  const [salePayments, setSalePayments] = useState<Record<string, any[]>>({});
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [showSaleDetails, setShowSaleDetails] = useState(false);

  // Filtrar vendas por período
  const filteredSales = useMemo(() => {
    if (!periodoInicio || !periodoFim) return sales;
    
    const inicio = new Date(periodoInicio);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(periodoFim);
    fim.setHours(23, 59, 59, 999);

    return sales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      const inPeriod = saleDate >= inicio && saleDate <= fim;
      const byVendedor = vendedorFilter === 'all' || sale.vendedor_id === vendedorFilter;
      return inPeriod && byVendedor && !sale.is_draft;
    });
  }, [sales, periodoInicio, periodoFim, vendedorFilter]);

  // Estatísticas
  const stats = useMemo(() => {
    const vendasPagas = filteredSales.filter(s => s.status === 'paid');
    const totalVendas = vendasPagas.length;
    const totalRecebido = vendasPagas.reduce((sum, s) => sum + Number(s.total), 0);
    const ticketMedio = totalVendas > 0 ? totalRecebido / totalVendas : 0;

    // Vendas por vendedor
    const vendasPorVendedor = vendasPagas.reduce((acc, sale) => {
      const vendedorId = sale.vendedor_id || 'sem-vendedor';
      const vendedorNome = sale.vendedor_nome || 'Sem vendedor';
      if (!acc[vendedorId]) {
        acc[vendedorId] = { id: vendedorId, nome: vendedorNome, total: 0, quantidade: 0 };
      }
      acc[vendedorId].total += Number(sale.total);
      acc[vendedorId].quantidade += 1;
      return acc;
    }, {} as Record<string, { id: string; nome: string; total: number; quantidade: number }>);

    // Vendas por forma de pagamento
    // Nota: Isso requer buscar os pagamentos, por enquanto vamos usar dados básicos

    // Produtos mais vendidos
    // Nota: Isso requer buscar os itens, por enquanto vamos usar dados básicos

    return {
      totalVendas,
      totalRecebido,
      ticketMedio,
      vendasPorVendedor: Object.values(vendasPorVendedor).sort((a, b) => b.total - a.total),
    };
  }, [filteredSales]);

  // Carregar pagamentos das vendas
  useEffect(() => {
    if (filteredSales.length > 0) {
      const loadPayments = async () => {
        const saleIds = filteredSales.map(s => s.id);
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*')
          .in('sale_id', saleIds)
          .eq('status', 'confirmed');
        
        if (paymentsData) {
          const paymentsBySale: Record<string, any[]> = {};
          paymentsData.forEach((payment: any) => {
            if (!paymentsBySale[payment.sale_id]) {
              paymentsBySale[payment.sale_id] = [];
            }
            paymentsBySale[payment.sale_id].push(payment);
          });
          setSalePayments(paymentsBySale);
        }
      };
      loadPayments();
    }
  }, [filteredSales]);

  // Carregar items quando uma venda é selecionada
  useEffect(() => {
    if (selectedSale && showSaleDetails) {
      const loadItems = async () => {
        const { data: itemsData } = await supabase
          .from('sale_items')
          .select('*')
          .eq('sale_id', selectedSale.id);
        
        if (itemsData) {
          setSelectedSale((prev: any) => ({ ...prev, items: itemsData }));
        }
      };
      loadItems();
    }
  }, [selectedSale?.id, showSaleDetails]);

  // Lista de vendedores únicos
  const vendedores = useMemo(() => {
    const unique = new Map<string, string>();
    sales.forEach(sale => {
      if (sale.vendedor_id && sale.vendedor_nome) {
        unique.set(sale.vendedor_id, sale.vendedor_nome);
      }
    });
    return Array.from(unique.entries()).map(([id, nome]) => ({ id, nome }));
  }, [sales]);

  if (isLoading) {
    return (
      <ModernLayout title="Relatórios" subtitle="Relatórios de vendas e caixa">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout title="Relatórios" subtitle="Relatórios de vendas e caixa">
      <div className="space-y-6">
        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label>Período Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !periodoInicio && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {periodoInicio ? format(periodoInicio, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={periodoInicio}
                      onSelect={setPeriodoInicio}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label>Período Fim</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !periodoFim && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {periodoFim ? format(periodoFim, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={periodoFim}
                      onSelect={setPeriodoFim}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Vendedor</Label>
                <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {vendedores.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button className="w-full" onClick={() => {
                  // Exportar relatório
                  alert('Funcionalidade de exportação em desenvolvimento');
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVendas}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currencyFormatters.brl(stats.totalRecebido)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currencyFormatters.brl(stats.ticketMedio)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendedores</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.vendasPorVendedor.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Vendas por Vendedor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vendas por Vendedor</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.vendasPorVendedor.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma venda no período</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendedor</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Ticket Médio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.vendasPorVendedor.map((vendedor) => (
                      <TableRow key={vendedor.id}>
                        <TableCell className="font-medium">{vendedor.nome}</TableCell>
                        <TableCell className="text-right">{vendedor.quantidade}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {currencyFormatters.brl(vendedor.total)}
                        </TableCell>
                        <TableCell className="text-right">
                          {currencyFormatters.brl(vendedor.total / vendedor.quantidade)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimas Vendas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Últimas Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredSales.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma venda no período</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Formas de Pagamento</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.slice(0, 20).map((sale) => {
                      const salePaymentsList = salePayments[sale.id] || [];
                      return (
                        <TableRow 
                          key={sale.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setSelectedSale(sale);
                            setShowSaleDetails(true);
                          }}
                        >
                          <TableCell className="font-bold text-primary">#{sale.numero}</TableCell>
                          <TableCell>{sale.cliente_nome || 'Consumidor Final'}</TableCell>
                          <TableCell>{sale.vendedor_nome || '-'}</TableCell>
                          <TableCell>{dateFormatters.short(sale.created_at)}</TableCell>
                          <TableCell>
                            {salePaymentsList.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {salePaymentsList.map((p: any, idx: number) => (
                                  <BadgeComponent key={idx} variant="outline" className="text-xs">
                                    {p.forma_pagamento === 'dinheiro' ? 'Dinheiro' : 
                                     p.forma_pagamento === 'pix' ? 'PIX' :
                                     p.forma_pagamento === 'debito' ? 'Débito' :
                                     p.forma_pagamento === 'credito' ? `Crédito${p.parcelas && p.parcelas > 1 ? ` (${p.parcelas}x)` : ''}` :
                                     p.forma_pagamento === 'link_pagamento' ? 'Link' :
                                     p.forma_pagamento === 'carteira_digital' ? 'Carteira' : p.forma_pagamento}
                                    {' '}
                                    {currencyFormatters.brl(p.valor)}
                                  </BadgeComponent>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {currencyFormatters.brl(sale.total)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ModernLayout>
  );
}

