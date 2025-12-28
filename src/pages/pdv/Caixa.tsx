import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DollarSign, Plus, Minus, Lock, Unlock, TrendingUp, TrendingDown,
  Calendar, Clock, User, FileText
} from 'lucide-react';
import { useCashRegister, useCashMovements } from '@/hooks/usePDV';
import { useAuth } from '@/contexts/AuthContext';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { useToast } from '@/hooks/use-toast';
import { LoadingButton } from '@/components/LoadingButton';
import { cn } from '@/lib/utils';
import { from } from '@/integrations/db/client';

export default function Caixa() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentSession, isLoading, openCash, closeCash } = useCashRegister();
  const { movements, isLoading: movementsLoading, addMovement } = useCashMovements(
    currentSession?.id || ''
  );

  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [valorInicial, setValorInicial] = useState('');
  const [valorFinal, setValorFinal] = useState('');
  const [divergencia, setDivergencia] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [movementType, setMovementType] = useState<'sangria' | 'suprimento'>('sangria');
  const [movementValor, setMovementValor] = useState('');
  const [movementMotivo, setMovementMotivo] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sales, setSales] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [salePayments, setSalePayments] = useState<Record<string, any[]>>({});
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [showSaleDetails, setShowSaleDetails] = useState(false);

  useEffect(() => {
    if (currentSession?.id) {
      loadSales();
    }
  }, [currentSession?.id]);

  // Carregar itens da venda quando seleciona
  useEffect(() => {
    const loadSaleItems = async () => {
      if (selectedSale && showSaleDetails && !selectedSale.items) {
        const { data: itemsData } = await from('sale_items')
          .select('*')
          .eq('sale_id', selectedSale.id)
          .execute();
        
        if (itemsData) {
          setSelectedSale((prev: any) => prev ? { ...prev, items: itemsData } : null);
        }
      }
    };
    loadSaleItems();
  }, [selectedSale?.id, showSaleDetails]);

  const loadSales = async () => {
    if (!currentSession?.id) return;
    try {
      setLoadingSales(true);
      // 1) Preferência: vendas vinculadas diretamente ao caixa (cash_register_session_id)
      let salesData: any[] | null = null;
      let salesError: any = null;

      const direct = await from('sales')
        .select('*')
        .eq('cash_register_session_id', currentSession.id)
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .execute();

      salesData = direct.data || [];
      salesError = direct.error;

      // 2) Fallback: se a coluna não existe / não está sendo preenchida, buscar por período do caixa (opened_at) e operador
      if (
        salesError?.code === 'PGRST204' ||
        String(salesError?.message || '').includes('cash_register_session_id') ||
        (Array.isArray(salesData) && salesData.length === 0)
      ) {
        const openedAt = (currentSession as any).opened_at || (currentSession as any).created_at;
        const operadorId = (currentSession as any).operador_id || user?.id;

        if (openedAt && operadorId) {
          const fallback = await from('sales')
            .select('*')
            .eq('status', 'paid')
            .eq('vendedor_id', operadorId)
            .gte('finalized_at', openedAt)
            .order('created_at', { ascending: false })
            .execute();

          // só sobrescreve se não der erro
          if (!fallback.error) {
            salesData = fallback.data || [];
          }
        }
      }

      setSales(salesData || []);
      
      // Carregar pagamentos de todas as vendas
      if (salesData && salesData.length > 0) {
        const saleIds = salesData.map(s => s.id);
        const { data: paymentsData, error: paymentsError } = await from('payments')
          .select('*')
          .in('sale_id', saleIds)
          .eq('status', 'confirmed')
          .execute();
        
        if (!paymentsError && paymentsData) {
          const paymentsBySale: Record<string, any[]> = {};
          paymentsData.forEach((payment: any) => {
            if (!paymentsBySale[payment.sale_id]) {
              paymentsBySale[payment.sale_id] = [];
            }
            paymentsBySale[payment.sale_id].push(payment);
          });
          setSalePayments(paymentsBySale);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    } finally {
      setLoadingSales(false);
    }
  };

  const handleOpenCash = async () => {
    if (!valorInicial || parseFloat(valorInicial) < 0) {
      toast({ title: 'Valor inicial inválido', variant: 'destructive' });
      return;
    }

    try {
      setIsProcessing(true);
      await openCash({
        valor_inicial: parseFloat(valorInicial),
        operador_id: user?.id || '',
      });
      toast({ title: 'Caixa aberto com sucesso!' });
      setShowOpenDialog(false);
      setValorInicial('');
    } catch (error: any) {
      toast({ 
        title: 'Erro ao abrir caixa', 
        description: error.message || 'Tente novamente',
        variant: 'destructive' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseCash = async () => {
    if (!valorFinal || parseFloat(valorFinal) < 0) {
      toast({ title: 'Valor final inválido', variant: 'destructive' });
      return;
    }

    if (!currentSession) return;

    try {
      setIsProcessing(true);
      const valorFinalNum = parseFloat(valorFinal);
      const divergenciaNum = divergencia ? parseFloat(divergencia) : undefined;
      
      await closeCash(
        currentSession.id,
        valorFinalNum,
        divergenciaNum,
        justificativa || undefined
      );
      
      toast({ title: 'Caixa fechado com sucesso!' });
      setShowCloseDialog(false);
      setValorFinal('');
      setDivergencia('');
      setJustificativa('');
    } catch (error: any) {
      toast({ 
        title: 'Erro ao fechar caixa', 
        description: error.message || 'Tente novamente',
        variant: 'destructive' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddMovement = async () => {
    if (!movementValor || parseFloat(movementValor) <= 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' });
      return;
    }

    if (!currentSession) return;

    try {
      setIsProcessing(true);
      await addMovement({
        tipo: movementType,
        valor: parseFloat(movementValor),
        motivo: movementMotivo || undefined,
      });
      
      toast({ 
        title: `${movementType === 'sangria' ? 'Sangria' : 'Suprimento'} registrado com sucesso!` 
      });
      setShowMovementDialog(false);
      setMovementValor('');
      setMovementMotivo('');
    } catch (error: any) {
      toast({ 
        title: 'Erro ao registrar movimento', 
        description: error.message || 'Tente novamente',
        variant: 'destructive' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Calcular totais
  const totalSuprimentos = movements
    .filter(m => m.tipo === 'suprimento')
    .reduce((sum, m) => sum + Number(m.valor), 0);
  
  const totalSaidas = movements
    .filter(m => m.tipo === 'sangria')
    .reduce((sum, m) => sum + Number(m.valor), 0);

  // Calcular total de vendas vinculadas ao caixa
  const totalVendas = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);

  // Total de entradas para conferência: Vendas + Suprimentos
  const totalEntradas = totalSuprimentos + totalVendas;
  
  // Calcular totais por forma de pagamento
  const pagamentosPorForma: Record<string, number> = {};
  Object.values(salePayments).flat().forEach((payment: any) => {
    const forma = payment.forma_pagamento;
    if (!pagamentosPorForma[forma]) {
      pagamentosPorForma[forma] = 0;
    }
    pagamentosPorForma[forma] += Number(payment.valor || 0);
  });
  
  const valorEsperado = currentSession 
    ? Number(currentSession.valor_inicial) + totalEntradas - totalSaidas
    : 0;

  if (isLoading) {
    return (
      <ModernLayout title="Caixa" subtitle="Gerenciamento de caixa">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout title="Caixa" subtitle="Abertura, fechamento e movimentos de caixa">
      <div className="flex flex-col h-full overflow-hidden gap-2 md:gap-3">
        {/* Status do Caixa */}
        <div className="flex-shrink-0 bg-card border border-gray-200 rounded-lg shadow-sm p-2 md:p-3">
          {currentSession ? (
            <>
              {/* Mobile: Layout compacto */}
              <div className="md:hidden space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-green-100 text-green-800 text-[10px]">
                    <Unlock className="h-3 w-3 mr-1" />Aberto
                  </Badge>
                  <Button onClick={() => setShowCloseDialog(true)} variant="destructive" size="sm" className="h-7 text-xs">
                    <Lock className="h-3 w-3 mr-1" />Fechar
                  </Button>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin text-[10px]">
                  <span className="whitespace-nowrap px-1.5 py-0.5 bg-gray-100 rounded">Inicial: {currencyFormatters.brl(currentSession.valor_inicial)}</span>
                  <span className="whitespace-nowrap px-1.5 py-0.5 bg-green-100 text-green-700 rounded">+{currencyFormatters.brl(totalEntradas)}</span>
                  <span className="whitespace-nowrap px-1.5 py-0.5 bg-red-100 text-red-700 rounded">-{currencyFormatters.brl(totalSaidas)}</span>
                  <span className="whitespace-nowrap px-1.5 py-0.5 bg-blue-100 text-blue-700 font-bold rounded">= {currencyFormatters.brl(valorEsperado)}</span>
                </div>
              </div>

              {/* Desktop: Layout completo */}
              <div className="hidden md:flex flex-wrap items-center gap-3">
                <Badge className="bg-green-100 text-green-800 text-xs"><Unlock className="h-3 w-3 mr-1" />Caixa Aberto</Badge>
                <div className="flex items-center gap-4 flex-wrap flex-1">
                  <div className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">Inicial:</span><span className="text-sm font-semibold">{currencyFormatters.brl(currentSession.valor_inicial)}</span></div>
                  <div className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-green-600" /><span className="text-xs text-muted-foreground">Entradas:</span><span className="text-sm font-semibold text-green-600">{currencyFormatters.brl(totalEntradas)}</span></div>
                  <div className="flex items-center gap-1.5"><TrendingDown className="h-3.5 w-3.5 text-red-600" /><span className="text-xs text-muted-foreground">Saídas:</span><span className="text-sm font-semibold text-red-600">{currencyFormatters.brl(totalSaidas)}</span></div>
                  <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-1 rounded"><span className="text-xs text-muted-foreground">Esperado:</span><span className="text-sm font-bold text-primary">{currencyFormatters.brl(valorEsperado)}</span></div>
                </div>
                {Object.keys(pagamentosPorForma).length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {Object.entries(pagamentosPorForma).map(([forma, valor]) => (
                      <Badge key={forma} variant="outline" className="text-xs">{forma === 'dinheiro' ? '💵' : forma === 'pix' ? '📱' : forma === 'debito' ? '💳' : forma === 'credito' ? '💳' : '📄'} {currencyFormatters.brl(valor)}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <Button onClick={() => setShowCloseDialog(true)} variant="destructive" size="sm" className="h-8"><Lock className="h-3.5 w-3.5 mr-1" />Fechar Caixa</Button>
                </div>
                <div className="w-full flex items-center gap-3 text-xs text-muted-foreground mt-1 pt-2 border-t">
                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{currentSession.operador_nome}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{dateFormatters.short(currentSession.opened_at)}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(currentSession.opened_at).toLocaleTimeString('pt-BR')}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <Badge variant="outline" className="text-[10px] md:text-xs"><Lock className="h-3 w-3 mr-1" />Fechado</Badge>
                <span className="text-xs md:text-sm text-muted-foreground hidden md:inline">Abra o caixa para começar a operar</span>
              </div>
              <Button onClick={() => setShowOpenDialog(true)} size="sm" className="h-7 md:h-8 text-xs md:text-sm">
                <Unlock className="h-3 w-3 md:h-3.5 md:w-3.5 mr-1" />Abrir
              </Button>
            </div>
          )}
        </div>

        {/* Vendas - Flex-1 com scroll interno */}
        {currentSession && (
          <Card className="flex-1 flex flex-col overflow-hidden min-h-0 border border-gray-200">
            <CardHeader className="flex-shrink-0 pb-2 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Vendas do Caixa</CardTitle>
                <Badge variant="outline" className="text-xs">{sales.length} venda(s)</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden min-h-0 p-0">
              {loadingSales ? (
                <div className="text-center py-4 text-muted-foreground text-sm">Carregando vendas...</div>
              ) : sales.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Nenhuma venda registrada nesta sessão</p>
                </div>
              ) : (
                <>
                  {/* Desktop: Tabela com scroll */}
                  <div className="hidden md:flex flex-1 flex-col overflow-hidden min-h-0">
                    <div className="flex-1 overflow-auto scrollbar-thin border-t border-gray-200">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b-2 border-gray-300">
                          <TableHead className="font-semibold bg-muted/60 border-r border-gray-200">Número</TableHead>
                          <TableHead className="font-semibold bg-muted/60 border-r border-gray-200">Cliente</TableHead>
                          <TableHead className="font-semibold bg-muted/60 border-r border-gray-200">Data/Hora</TableHead>
                          <TableHead className="font-semibold bg-muted/60 border-r border-gray-200">Formas de Pagamento</TableHead>
                          <TableHead className="font-semibold bg-muted/60 text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sales.map((sale, index) => {
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
                              <TableCell className="font-medium border-r border-gray-200">#{sale.numero}</TableCell>
                              <TableCell className="border-r border-gray-200">{sale.cliente_nome || 'Consumidor Final'}</TableCell>
                              <TableCell className="border-r border-gray-200">
                                {dateFormatters.short(sale.created_at)}{' '}
                                {new Date(sale.created_at).toLocaleTimeString('pt-BR')}
                              </TableCell>
                              <TableCell className="border-r border-gray-200">
                                {salePaymentsList.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {salePaymentsList.map((p: any, idx: number) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {p.forma_pagamento === 'dinheiro' ? 'Dinheiro' : 
                                         p.forma_pagamento === 'pix' ? 'PIX' :
                                         p.forma_pagamento === 'debito' ? 'Débito' :
                                         p.forma_pagamento === 'credito' ? 'Crédito' :
                                         p.forma_pagamento === 'link_pagamento' ? 'Link' :
                                         p.forma_pagamento === 'carteira_digital' ? 'Carteira' : p.forma_pagamento}
                                        {' '}
                                        {currencyFormatters.brl(p.valor)}
                                      </Badge>
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
                    {/* Rodapé fixo - Total */}
                    <div className="flex-shrink-0 p-3 bg-muted/50 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">Total de Vendas:</span>
                        <span className="text-lg font-bold text-primary">
                          {currencyFormatters.brl(totalVendas)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile: Cards com scroll */}
                  <div className="md:hidden flex-1 overflow-auto scrollbar-thin p-3 space-y-3">
                    {sales.map((sale) => {
                      const salePaymentsList = salePayments[sale.id] || [];
                      return (
                        <Card 
                          key={sale.id}
                          className="border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-all active:scale-[0.98]"
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
                                <p className="text-xs text-muted-foreground">Data/Hora</p>
                                <p className="text-sm">
                                  {dateFormatters.short(sale.created_at)}{' '}
                                  {new Date(sale.created_at).toLocaleTimeString('pt-BR')}
                                </p>
                              </div>
                              {salePaymentsList.length > 0 && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Formas de Pagamento</p>
                                  <div className="flex flex-wrap gap-1">
                                    {salePaymentsList.map((p: any, idx: number) => (
                                      <Badge key={idx} variant="outline" className="text-[10px] border-2 border-gray-300">
                                        {p.forma_pagamento === 'dinheiro' ? 'Dinheiro' : 
                                         p.forma_pagamento === 'pix' ? 'PIX' :
                                         p.forma_pagamento === 'debito' ? 'Débito' :
                                         p.forma_pagamento === 'credito' ? 'Crédito' :
                                         p.forma_pagamento === 'link_pagamento' ? 'Link' :
                                         p.forma_pagamento === 'carteira_digital' ? 'Carteira' : p.forma_pagamento}
                                        {' '}
                                        {currencyFormatters.brl(p.valor)}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    <div className="p-3 bg-muted/50 border-2 border-gray-300 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">Total de Vendas:</span>
                        <span className="text-lg font-bold text-primary">
                          {currencyFormatters.brl(totalVendas)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Movimentos */}
        {currentSession && (
          <Card className="border-2 border-gray-300">
            <CardHeader className="pb-2 md:pb-3 pt-3 md:pt-6">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 md:gap-0">
                <CardTitle className="text-base md:text-lg">Movimentos</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMovementType('suprimento');
                      setShowMovementDialog(true);
                    }}
                    className="h-8 md:h-9 flex-1 md:flex-none border-2 border-gray-300"
                  >
                    <Plus className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2" />
                    <span className="text-xs md:text-sm">Suprimento</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMovementType('sangria');
                      setShowMovementDialog(true);
                    }}
                    className="h-8 md:h-9 flex-1 md:flex-none border-2 border-gray-300"
                  >
                    <Minus className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2" />
                    <span className="text-xs md:text-sm">Sangria</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 md:p-6">
              {movements.length === 0 ? (
                <div className="text-center py-6 md:py-8 text-muted-foreground">
                  <FileText className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-xs md:text-sm">Nenhum movimento registrado</p>
                </div>
              ) : (
                <>
                  {/* Desktop: Tabela */}
                  <div className="hidden md:block border-2 border-gray-300 rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b-2 border-gray-300">
                          <TableHead className="font-semibold bg-muted/60 border-r border-gray-200">Tipo</TableHead>
                          <TableHead className="font-semibold bg-muted/60 border-r border-gray-200">Valor</TableHead>
                          <TableHead className="font-semibold bg-muted/60 border-r border-gray-200">Motivo</TableHead>
                          <TableHead className="font-semibold bg-muted/60 border-r border-gray-200">Operador</TableHead>
                          <TableHead className="font-semibold bg-muted/60">Data/Hora</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movements.map((movement, index) => (
                          <TableRow 
                            key={movement.id}
                            className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}
                          >
                            <TableCell className="border-r border-gray-200">
                              <Badge
                                className={cn(
                                  movement.tipo === 'sangria'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-green-100 text-green-800'
                                )}
                              >
                                {movement.tipo === 'sangria' ? 'Sangria' : 'Suprimento'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold border-r border-gray-200">
                              {currencyFormatters.brl(movement.valor)}
                            </TableCell>
                            <TableCell className="border-r border-gray-200">{movement.motivo || '-'}</TableCell>
                            <TableCell className="border-r border-gray-200">{movement.operador_nome}</TableCell>
                            <TableCell>
                              {dateFormatters.short(movement.created_at)}{' '}
                              {new Date(movement.created_at).toLocaleTimeString('pt-BR')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile: Cards */}
                  <div className="md:hidden space-y-3">
                    {movements.map((movement) => (
                      <Card 
                        key={movement.id}
                        className="border-2 border-gray-300"
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center justify-between border-b-2 border-gray-200 pb-2">
                            <Badge
                              className={cn(
                                'text-xs',
                                movement.tipo === 'sangria'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-green-100 text-green-800'
                              )}
                            >
                              {movement.tipo === 'sangria' ? 'Sangria' : 'Suprimento'}
                            </Badge>
                            <span className="text-base font-bold">
                              {currencyFormatters.brl(movement.valor)}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {movement.motivo && (
                              <div>
                                <p className="text-xs text-muted-foreground">Motivo</p>
                                <p className="text-sm">{movement.motivo}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-muted-foreground">Operador</p>
                              <p className="text-sm font-medium">{movement.operador_nome}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Data/Hora</p>
                              <p className="text-sm">
                                {dateFormatters.short(movement.created_at)}{' '}
                                {new Date(movement.created_at).toLocaleTimeString('pt-BR')}
                              </p>
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
        )}
      </div>

      {/* Dialog: Abrir Caixa */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent className="p-3 md:p-6 max-w-[95vw] md:max-w-md">
          <DialogHeader className="pb-2 md:pb-4">
            <DialogTitle className="text-base md:text-lg">Abrir Caixa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 md:space-y-4">
            <div>
              <Label className="text-xs md:text-sm">Valor Inicial (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={valorInicial}
                onChange={(e) => setValorInicial(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="h-9 md:h-10 text-sm border-2 border-gray-300"
              />
            </div>
            <div className="text-xs md:text-sm text-muted-foreground">
              <p>Informe o valor em dinheiro que está no caixa no momento da abertura.</p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-3 md:pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowOpenDialog(false)}
              className="w-full sm:w-auto h-9 md:h-10 border-2 border-gray-300"
            >
              Cancelar
            </Button>
            <LoadingButton 
              onClick={handleOpenCash} 
              loading={isProcessing}
              className="w-full sm:w-auto h-9 md:h-10"
            >
              Abrir Caixa
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Fechar Caixa */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="p-3 md:p-6 max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2 md:pb-4">
            <DialogTitle className="text-base md:text-lg">Fechar Caixa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 md:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <Label className="text-xs md:text-sm">Valor Esperado (R$)</Label>
                <Input
                  type="number"
                  value={valorEsperado.toFixed(2)}
                  disabled
                  className="bg-muted h-9 md:h-10 text-sm border-2 border-gray-300"
                />
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                  Calculado automaticamente
                </p>
              </div>
              <div>
                <Label className="text-xs md:text-sm">Valor Final Contado (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={valorFinal}
                  onChange={(e) => {
                    setValorFinal(e.target.value);
                    const final = parseFloat(e.target.value) || 0;
                    const diverg = final - valorEsperado;
                    setDivergencia(diverg.toFixed(2));
                  }}
                  placeholder="0.00"
                  autoFocus
                  className="h-9 md:h-10 text-sm border-2 border-gray-300"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-xs md:text-sm">Divergência (R$)</Label>
              <Input
                type="number"
                value={divergencia}
                onChange={(e) => setDivergencia(e.target.value)}
                className={cn(
                  'h-9 md:h-10 text-sm border-2',
                  parseFloat(divergencia || '0') !== 0 ? 'border-orange-500' : 'border-gray-300'
                )}
                disabled
              />
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                {parseFloat(divergencia || '0') > 0 
                  ? 'Sobra no caixa' 
                  : parseFloat(divergencia || '0') < 0 
                  ? 'Falta no caixa' 
                  : 'Sem divergência'}
              </p>
            </div>

            {parseFloat(divergencia || '0') !== 0 && (
              <div>
                <Label className="text-xs md:text-sm">Justificativa da Divergência</Label>
                <Textarea
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder="Explique a divergência encontrada..."
                  rows={3}
                  className="text-sm border-2 border-gray-300"
                />
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-3 md:pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowCloseDialog(false)}
              className="w-full sm:w-auto h-9 md:h-10 border-2 border-gray-300"
            >
              Cancelar
            </Button>
            <LoadingButton 
              onClick={handleCloseCash} 
              loading={isProcessing}
              className="w-full sm:w-auto h-9 md:h-10"
            >
              Fechar Caixa
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Movimento */}
      <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
        <DialogContent className="p-3 md:p-6 max-w-[95vw] md:max-w-md">
          <DialogHeader className="pb-2 md:pb-4">
            <DialogTitle className="text-base md:text-lg">
              {movementType === 'sangria' ? 'Registrar Sangria' : 'Registrar Suprimento'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 md:space-y-4">
            <div>
              <Label className="text-xs md:text-sm">Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={movementValor}
                onChange={(e) => setMovementValor(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="h-9 md:h-10 text-sm border-2 border-gray-300"
              />
            </div>
            <div>
              <Label className="text-xs md:text-sm">Motivo (Opcional)</Label>
              <Textarea
                value={movementMotivo}
                onChange={(e) => setMovementMotivo(e.target.value)}
                placeholder="Descreva o motivo do movimento..."
                rows={3}
                className="text-sm border-2 border-gray-300"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-3 md:pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowMovementDialog(false)}
              className="w-full sm:w-auto h-9 md:h-10 border-2 border-gray-300"
            >
              Cancelar
            </Button>
            <LoadingButton 
              onClick={handleAddMovement} 
              loading={isProcessing}
              className="w-full sm:w-auto h-9 md:h-10"
            >
              Registrar
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes da Venda */}
      <Dialog open={showSaleDetails} onOpenChange={setShowSaleDetails}>
        <DialogContent className="p-3 md:p-6 max-w-[95vw] md:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2 md:pb-4">
            <DialogTitle className="text-base md:text-lg">Detalhes da Venda #{selectedSale?.numero}</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-3 md:space-y-4">
              {/* Informações da Venda */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Label className="text-xs md:text-sm text-muted-foreground">Cliente</Label>
                  <p className="font-medium text-sm md:text-base">{selectedSale.cliente_nome || 'Consumidor Final'}</p>
                </div>
                <div>
                  <Label className="text-xs md:text-sm text-muted-foreground">Data/Hora</Label>
                  <p className="font-medium text-sm md:text-base">
                    {dateFormatters.short(selectedSale.created_at)}{' '}
                    {new Date(selectedSale.created_at).toLocaleTimeString('pt-BR')}
                  </p>
                </div>
                <div>
                  <Label className="text-xs md:text-sm text-muted-foreground">Vendedor</Label>
                  <p className="font-medium text-sm md:text-base">{selectedSale.vendedor_nome || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs md:text-sm text-muted-foreground">Total</Label>
                  <p className="font-bold text-base md:text-lg">{currencyFormatters.brl(selectedSale.total)}</p>
                </div>
              </div>

              {/* Produtos */}
              <div>
                <Label className="text-xs md:text-sm font-semibold mb-2 block">Produtos:</Label>
                <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                  {/* Desktop: Tabela */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b-2 border-gray-300">
                          <TableHead className="font-semibold bg-muted/60 border-r border-gray-200">Produto</TableHead>
                          <TableHead className="font-semibold bg-muted/60 border-r border-gray-200 text-right">Qtd</TableHead>
                          <TableHead className="font-semibold bg-muted/60 border-r border-gray-200 text-right">Vl. Unit.</TableHead>
                          <TableHead className="font-semibold bg-muted/60 text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSale.items && selectedSale.items.length > 0 ? (
                          selectedSale.items.map((item: any, index: number) => (
                            <TableRow 
                              key={item.id}
                              className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}
                            >
                              <TableCell className="border-r border-gray-200">{item.produto_nome}</TableCell>
                              <TableCell className="text-right border-r border-gray-200">{item.quantidade}</TableCell>
                              <TableCell className="text-right border-r border-gray-200">{currencyFormatters.brl(item.valor_unitario)}</TableCell>
                              <TableCell className="text-right font-semibold">{currencyFormatters.brl(item.valor_total)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              Carregando produtos...
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Mobile: Cards */}
                  <div className="md:hidden space-y-2 p-2">
                    {selectedSale.items && selectedSale.items.length > 0 ? (
                      selectedSale.items.map((item: any) => (
                        <Card key={item.id} className="border-2 border-gray-300">
                          <CardContent className="p-2 space-y-1">
                            <p className="font-medium text-sm">{item.produto_nome}</p>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Qtd: {item.quantidade}</span>
                              <span>Unit: {currencyFormatters.brl(item.valor_unitario)}</span>
                            </div>
                            <div className="text-right pt-1 border-t border-gray-200">
                              <span className="font-bold text-sm">Total: {currencyFormatters.brl(item.valor_total)}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Carregando produtos...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Pagamentos */}
              <div>
                <Label className="text-xs md:text-sm font-semibold mb-2 block">Formas de Pagamento:</Label>
                <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                  {/* Desktop: Tabela */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b-2 border-gray-300">
                          <TableHead className="font-semibold bg-muted/60 border-r border-gray-200">Forma</TableHead>
                          <TableHead className="font-semibold bg-muted/60 border-r border-gray-200 text-right">Valor</TableHead>
                          {salePayments[selectedSale.id]?.some((p: any) => p.troco > 0) && (
                            <TableHead className="font-semibold bg-muted/60 text-right">Troco</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salePayments[selectedSale.id] && salePayments[selectedSale.id].length > 0 ? (
                          salePayments[selectedSale.id].map((payment: any, index: number) => (
                            <TableRow 
                              key={payment.id}
                              className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}
                            >
                              <TableCell className="capitalize border-r border-gray-200">
                                {payment.forma_pagamento === 'dinheiro' ? 'Dinheiro' : 
                                 payment.forma_pagamento === 'pix' ? 'PIX' :
                                 payment.forma_pagamento === 'debito' ? 'Débito' :
                                 payment.forma_pagamento === 'credito' ? 'Crédito' :
                                 payment.forma_pagamento === 'link_pagamento' ? 'Link de Pagamento' :
                                 payment.forma_pagamento === 'carteira_digital' ? 'Carteira Digital' : payment.forma_pagamento}
                              </TableCell>
                              <TableCell className={`text-right font-semibold ${salePayments[selectedSale.id]?.some((p: any) => p.troco > 0) ? 'border-r border-gray-200' : ''}`}>
                                {currencyFormatters.brl(payment.valor)}
                              </TableCell>
                              {salePayments[selectedSale.id]?.some((p: any) => p.troco > 0) && (
                                <TableCell className="text-right">
                                  {payment.troco > 0 ? currencyFormatters.brl(payment.troco) : '-'}
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                              Nenhum pagamento encontrado
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Mobile: Cards */}
                  <div className="md:hidden space-y-2 p-2">
                    {salePayments[selectedSale.id] && salePayments[selectedSale.id].length > 0 ? (
                      salePayments[selectedSale.id].map((payment: any) => (
                        <Card key={payment.id} className="border-2 border-gray-300">
                          <CardContent className="p-2 space-y-1">
                            <p className="font-medium text-sm capitalize">
                              {payment.forma_pagamento === 'dinheiro' ? 'Dinheiro' : 
                               payment.forma_pagamento === 'pix' ? 'PIX' :
                               payment.forma_pagamento === 'debito' ? 'Débito' :
                               payment.forma_pagamento === 'credito' ? 'Crédito' :
                               payment.forma_pagamento === 'link_pagamento' ? 'Link de Pagamento' :
                               payment.forma_pagamento === 'carteira_digital' ? 'Carteira Digital' : payment.forma_pagamento}
                            </p>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Valor:</span>
                              <span className="font-bold">{currencyFormatters.brl(payment.valor)}</span>
                            </div>
                            {payment.troco > 0 && (
                              <div className="flex justify-between text-xs pt-1 border-t border-gray-200">
                                <span className="text-muted-foreground">Troco:</span>
                                <span className="font-semibold">{currencyFormatters.brl(payment.troco)}</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Nenhum pagamento encontrado
                      </div>
                    )}
                  </div>
                  {salePayments[selectedSale.id] && salePayments[selectedSale.id].length > 0 && (
                    <div className="p-3 md:p-4 bg-muted/50 border-t-2 border-gray-300">
                      <div className="flex justify-between items-center font-bold text-sm md:text-base">
                        <span>Total Pago:</span>
                        <span className="text-base md:text-lg">
                          {currencyFormatters.brl(
                            salePayments[selectedSale.id].reduce((sum: number, p: any) => sum + Number(p.valor || 0), 0)
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="pt-3 md:pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowSaleDetails(false)}
              className="w-full sm:w-auto h-9 md:h-10 border-2 border-gray-300"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModernLayout>
  );
}

