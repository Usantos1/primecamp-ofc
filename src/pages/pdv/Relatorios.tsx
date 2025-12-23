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
      <div className="space-y-4 md:space-y-6 px-2 md:px-6 w-full max-w-none">
        {/* Filtros */}
        <Card className="border-2 border-gray-300 shadow-sm rounded-xl bg-white/80 dark:bg-slate-900/50">
          <CardHeader className="pb-2 md:pb-3 pt-3 md:pt-6">
            <CardTitle className="text-base md:text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-xs md:text-sm">Período Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal h-9 md:h-10 text-xs md:text-sm border-2 border-gray-300",
                        !periodoInicio && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
                      <span className="truncate">
                        {periodoInicio ? format(periodoInicio, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione uma data</span>}
                      </span>
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
              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-xs md:text-sm">Período Fim</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal h-9 md:h-10 text-xs md:text-sm border-2 border-gray-300",
                        !periodoFim && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
                      <span className="truncate">
                        {periodoFim ? format(periodoFim, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione uma data</span>}
                      </span>
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
              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-xs md:text-sm">Vendedor</Label>
                <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
                  <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm border-2 border-gray-300">
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
                <Button 
                  className="w-full h-9 md:h-10 text-xs md:text-sm border-2 border-gray-300 bg-gradient-to-r from-blue-500/90 to-indigo-500/90 text-white hover:shadow-md"
                  onClick={() => {
                    // Exportar relatório
                    alert('Funcionalidade de exportação em desenvolvimento');
                  }}
                >
                  <Download className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 px-1 md:px-0">
          <Card className="border-2 border-l-4 border-l-blue-500 border-gray-300 cursor-pointer hover:shadow-md active:scale-95 md:active:scale-100 bg-gradient-to-br from-blue-50 to-blue-100/70 dark:from-blue-950/40 dark:to-blue-900/30 md:bg-transparent md:dark:bg-transparent rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 pt-2 md:pt-3 px-2 md:px-6">
              <CardTitle className="text-[10px] md:text-sm font-medium">Total de Vendas</CardTitle>
              <ShoppingCart className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-2 md:px-6 pb-2 md:pb-3">
              <div className="text-base md:text-2xl font-bold">{stats.totalVendas}</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-l-4 border-l-green-500 border-gray-300 cursor-pointer hover:shadow-md active:scale-95 md:active:scale-100 bg-gradient-to-br from-emerald-50 to-green-100/70 dark:from-green-950/40 dark:to-green-900/30 md:bg-transparent md:dark:bg-transparent rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 pt-2 md:pt-3 px-2 md:px-6">
              <CardTitle className="text-[10px] md:text-sm font-medium">Total Recebido</CardTitle>
              <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-2 md:px-6 pb-2 md:pb-3">
              <div className="text-base md:text-2xl font-bold">{currencyFormatters.brl(stats.totalRecebido)}</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-l-4 border-l-purple-500 border-gray-300 cursor-pointer hover:shadow-md active:scale-95 md:active:scale-100 bg-gradient-to-br from-purple-50 to-purple-100/70 dark:from-purple-950/40 dark:to-purple-900/30 md:bg-transparent md:dark:bg-transparent rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 pt-2 md:pt-3 px-2 md:px-6">
              <CardTitle className="text-[10px] md:text-sm font-medium">Ticket Médio</CardTitle>
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-2 md:px-6 pb-2 md:pb-3">
              <div className="text-base md:text-2xl font-bold">{currencyFormatters.brl(stats.ticketMedio)}</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-l-4 border-l-orange-500 border-gray-300 cursor-pointer hover:shadow-md active:scale-95 md:active:scale-100 bg-gradient-to-br from-amber-50 to-orange-100/70 dark:from-orange-950/40 dark:to-orange-900/30 md:bg-transparent md:dark:bg-transparent rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 pt-2 md:pt-3 px-2 md:px-6">
              <CardTitle className="text-[10px] md:text-sm font-medium">Vendedores</CardTitle>
              <User className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-2 md:px-6 pb-2 md:pb-3">
              <div className="text-base md:text-2xl font-bold">{stats.vendasPorVendedor.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Vendas por Vendedor */}
        <Card className="border-2 border-gray-300 rounded-xl shadow-sm">
          <CardHeader className="pb-2 md:pb-3 pt-3 md:pt-6">
            <CardTitle className="text-base md:text-lg">Vendas por Vendedor</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            {stats.vendasPorVendedor.length === 0 ? (
              <div className="text-center py-6 md:py-8 text-muted-foreground">
                <BarChart3 className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 opacity-50" />
                <p className="text-xs md:text-sm">Nenhuma venda no período</p>
              </div>
            ) : (
              <>
                {/* Desktop: Tabela */}
                <div className="hidden md:block border-2 border-gray-300 rounded-xl overflow-x-auto shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-2 border-gray-300">
                        <TableHead className="font-semibold bg-muted/60 border-r border-gray-200">Vendedor</TableHead>
                        <TableHead className="font-semibold bg-muted/60 border-r border-gray-200 text-right">Quantidade</TableHead>
                        <TableHead className="font-semibold bg-muted/60 border-r border-gray-200 text-right">Total</TableHead>
                        <TableHead className="font-semibold bg-muted/60 text-right">Ticket Médio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.vendasPorVendedor.map((vendedor, index) => (
                        <TableRow 
                          key={vendedor.id}
                          className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}
                        >
                          <TableCell className="font-medium border-r border-gray-200">{vendedor.nome}</TableCell>
                          <TableCell className="text-right border-r border-gray-200">{vendedor.quantidade}</TableCell>
                          <TableCell className="text-right font-semibold border-r border-gray-200">
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

                {/* Mobile: Cards */}
                <div className="md:hidden space-y-3">
                  {stats.vendasPorVendedor.map((vendedor) => (
                    <Card key={vendedor.id} className="border-2 border-gray-300 rounded-xl shadow-sm">
                      <CardContent className="p-3 space-y-2">
                        <div className="border-b-2 border-gray-200 pb-2">
                          <h3 className="font-semibold text-sm">{vendedor.nome}</h3>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Quantidade:</span>
                            <span className="text-sm font-medium">{vendedor.quantidade}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Total:</span>
                            <span className="text-sm font-bold text-primary">
                              {currencyFormatters.brl(vendedor.total)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                            <span className="text-xs text-muted-foreground">Ticket Médio:</span>
                            <span className="text-sm font-semibold">
                              {currencyFormatters.brl(vendedor.total / vendedor.quantidade)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Últimas Vendas */}
        <Card className="border-2 border-gray-300 rounded-xl shadow-sm">
          <CardHeader className="pb-2 md:pb-3 pt-3 md:pt-6">
            <CardTitle className="text-base md:text-lg">Últimas Vendas</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            {filteredSales.length === 0 ? (
              <div className="text-center py-6 md:py-8 text-muted-foreground">
                <ShoppingCart className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 opacity-50" />
                <p className="text-xs md:text-sm">Nenhuma venda no período</p>
              </div>
            ) : (
              <>
                {/* Desktop: Tabela */}
                <div className="hidden md:block border-2 border-gray-300 rounded-xl overflow-x-auto shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-2 border-gray-300">
                        <TableHead className="font-semibold bg-muted/60 border-r border-gray-200">Nº</TableHead>
                        <TableHead className="font-semibold bg-muted/60 border-r border-gray-200">Cliente</TableHead>
                        <TableHead className="font-semibold bg-muted/60 border-r border-gray-200">Vendedor</TableHead>
                        <TableHead className="font-semibold bg-muted/60 border-r border-gray-200">Data</TableHead>
                        <TableHead className="font-semibold bg-muted/60 border-r border-gray-200">Formas de Pagamento</TableHead>
                        <TableHead className="font-semibold bg-muted/60 text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSales.slice(0, 20).map((sale, index) => {
                        const salePaymentsList = salePayments[sale.id] || [];
                        return (
                          <TableRow 
                            key={sale.id}
                            className={`cursor-pointer hover:bg-muted/50 border-b border-gray-200 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}
                            onClick={() => {
                              setSelectedSale(sale);
                              setShowSaleDetails(true);
                            }}
                          >
                            <TableCell className="font-bold text-primary border-r border-gray-200">#{sale.numero}</TableCell>
                            <TableCell className="border-r border-gray-200">{sale.cliente_nome || 'Consumidor Final'}</TableCell>
                            <TableCell className="border-r border-gray-200">{sale.vendedor_nome || '-'}</TableCell>
                            <TableCell className="border-r border-gray-200">{dateFormatters.short(sale.created_at)}</TableCell>
                            <TableCell className="border-r border-gray-200">
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

                {/* Mobile: Cards */}
                <div className="md:hidden space-y-3">
                  {filteredSales.slice(0, 20).map((sale) => {
                    const salePaymentsList = salePayments[sale.id] || [];
                    return (
                      <Card 
                        key={sale.id}
                        className="border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-all active:scale-[0.98] rounded-xl shadow-sm"
                        onClick={() => {
                          setSelectedSale(sale);
                          setShowSaleDetails(true);
                        }}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center justify-between border-b-2 border-gray-200 pb-2">
                            <span className="font-semibold text-sm">Venda #{sale.numero}</span>
                            <span className="text-base font-bold text-primary">
                              {currencyFormatters.brl(sale.total)}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            <div>
                              <p className="text-xs text-muted-foreground">Cliente</p>
                              <p className="text-sm font-medium">{sale.cliente_nome || 'Consumidor Final'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Vendedor</p>
                              <p className="text-sm">{sale.vendedor_nome || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Data</p>
                              <p className="text-sm">{dateFormatters.short(sale.created_at)}</p>
                            </div>
                            {salePaymentsList.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Formas de Pagamento</p>
                                <div className="flex flex-wrap gap-1">
                                  {salePaymentsList.map((p: any, idx: number) => (
                                    <BadgeComponent key={idx} variant="outline" className="text-[10px] border-2 border-gray-300">
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
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </ModernLayout>
  );
}

