import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ReceiptText, Search, QrCode, Printer, Copy, CheckCircle, 
  XCircle, Clock, RefreshCw, Eye, Ban, ArrowLeft, Package
} from 'lucide-react';
import { useRefunds, Refund, Voucher } from '@/hooks/useRefunds';
import { from } from '@/integrations/db/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ProductDestination = 'stock' | 'exchange' | 'loss';

interface SaleItem {
  id: string;
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  selected?: boolean;
  refund_qty?: number;
  destination?: ProductDestination; // Destino do produto
}

interface SaleData {
  id: string;
  numero: number;
  cliente_nome: string;
  cliente_id?: string;
  total: number;
  created_at: string;
  items: SaleItem[];
}

export default function Devolucoes() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { 
    loading, 
    refunds, 
    vouchers, 
    fetchRefunds, 
    fetchVouchers, 
    checkVoucher,
    createRefund
  } = useRefunds();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
  const [validationCode, setValidationCode] = useState('');
  
  // Estado do formulário de devolução
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [saleData, setSaleData] = useState<SaleData | null>(null);
  const [loadingSale, setLoadingSale] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<'voucher' | 'cash'>('voucher');
  const [selectedItems, setSelectedItems] = useState<SaleItem[]>([]);
  const [processingRefund, setProcessingRefund] = useState(false);

  // Verificar se veio com sale_id na URL
  useEffect(() => {
    const saleId = searchParams.get('sale');
    if (saleId) {
      loadSaleForRefund(saleId);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchRefunds();
    fetchVouchers();
  }, []);

  // Carregar dados da venda para devolução
  const loadSaleForRefund = async (saleId: string) => {
    setLoadingSale(true);
    try {
      // Buscar venda
      const { data: sale, error: saleError } = await from('sales')
        .select('*')
        .eq('id', saleId)
        .single();
      
      if (saleError || !sale) {
        toast({
          title: 'Erro',
          description: 'Venda não encontrada',
          variant: 'destructive'
        });
        return;
      }

      // Buscar itens da venda
      const { data: items, error: itemsError } = await from('sale_items')
        .select('*')
        .eq('sale_id', saleId)
        .execute();

      if (itemsError) {
        toast({
          title: 'Erro',
          description: 'Erro ao carregar itens da venda',
          variant: 'destructive'
        });
        return;
      }

      const saleItems: SaleItem[] = (items || []).map((item: any) => ({
        id: item.id,
        produto_id: item.produto_id,
        produto_nome: item.produto_nome || item.nome || 'Produto',
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario || item.valor_unitario,
        subtotal: item.subtotal || item.total,
        selected: true,
        refund_qty: item.quantidade,
        destination: 'stock' as ProductDestination // Padrão: volta ao estoque
      }));

      setSaleData({
        id: sale.id,
        numero: sale.numero,
        cliente_nome: sale.cliente_nome || 'Consumidor Final',
        cliente_id: sale.cliente_id,
        total: sale.total,
        created_at: sale.created_at,
        items: saleItems
      });
      
      setSelectedItems(saleItems);
      setRefundDialogOpen(true);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao carregar venda',
        variant: 'destructive'
      });
    } finally {
      setLoadingSale(false);
    }
  };

  // Processar devolução
  const handleProcessRefund = async () => {
    if (!saleData) return;
    
    const itemsToRefund = selectedItems.filter(i => i.selected && (i.refund_qty || 0) > 0);
    
    if (itemsToRefund.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos um item para devolver',
        variant: 'destructive'
      });
      return;
    }

    if (!refundReason.trim()) {
      toast({
        title: 'Erro',
        description: 'Informe o motivo da devolução',
        variant: 'destructive'
      });
      return;
    }

    setProcessingRefund(true);
    try {
      const refundItems = itemsToRefund.map(item => ({
        sale_item_id: item.id,
        product_id: item.produto_id,
        product_name: item.produto_nome,
        quantity: item.refund_qty || item.quantidade,
        unit_price: item.preco_unitario,
        return_to_stock: item.destination === 'stock', // Só volta ao estoque se destino for 'stock'
        condition: item.destination === 'loss' ? 'defeituoso' : 'novo',
        destination: item.destination
      }));

      const result = await createRefund({
        sale_id: saleData.id,
        refund_type: itemsToRefund.length === saleData.items.length ? 'full' : 'partial',
        reason: refundReason,
        refund_method: refundMethod,
        items: refundItems,
        customer_id: saleData.cliente_id,
        customer_name: saleData.cliente_nome
      });

      if (result) {
        toast({
          title: 'Devolução criada!',
          description: refundMethod === 'voucher' 
            ? `Voucher gerado: ${result.voucher?.code || 'N/A'}`
            : 'Devolução em dinheiro registrada'
        });
        
        setRefundDialogOpen(false);
        setSaleData(null);
        setSelectedItems([]);
        setRefundReason('');
        fetchRefunds();
        fetchVouchers();
        
        // Limpar parâmetro da URL
        navigate('/pdv/devolucoes', { replace: true });
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao processar devolução',
        variant: 'destructive'
      });
    } finally {
      setProcessingRefund(false);
    }
  };

  // Toggle seleção de item
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, selected: !item.selected } : item
      )
    );
  };

  // Atualizar quantidade de devolução
  const updateRefundQty = (itemId: string, qty: number) => {
    setSelectedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, refund_qty: Math.min(qty, item.quantidade) } : item
      )
    );
  };

  // Atualizar destino do produto
  const updateItemDestination = (itemId: string, destination: ProductDestination) => {
    setSelectedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, destination } : item
      )
    );
  };

  // Labels para destino
  const destinationLabels: Record<ProductDestination, { label: string; color: string; icon: string }> = {
    stock: { label: 'Estoque', color: 'text-green-600', icon: '📦' },
    exchange: { label: 'Troca', color: 'text-blue-600', icon: '🔄' },
    loss: { label: 'Prejuízo', color: 'text-red-600', icon: '⚠️' }
  };

  // Calcular total da devolução
  const calculateRefundTotal = () => {
    return selectedItems
      .filter(i => i.selected)
      .reduce((sum, item) => sum + (item.refund_qty || 0) * item.preco_unitario, 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Ativo</Badge>;
      case 'used':
        return <Badge className="bg-blue-600"><CheckCircle className="h-3 w-3 mr-1" /> Usado</Badge>;
      case 'expired':
        return <Badge className="bg-orange-600"><Clock className="h-3 w-3 mr-1" /> Expirado</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-600"><XCircle className="h-3 w-3 mr-1" /> Cancelado</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-600"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
      case 'completed':
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Concluído</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Código copiado!',
      description: code
    });
  };

  const handlePrintVoucher = (voucher: Voucher) => {
    // Criar janela de impressão térmica
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Voucher ${voucher.code}</title>
            <style>
              body { font-family: monospace; font-size: 12px; width: 280px; margin: 0; padding: 10px; }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .line { border-top: 1px dashed #000; margin: 10px 0; }
              .big { font-size: 18px; }
            </style>
          </head>
          <body>
            <div class="center bold big">VOUCHER DE CRÉDITO</div>
            <div class="line"></div>
            <div class="center bold big">${voucher.code}</div>
            <div class="line"></div>
            <div>Valor: <span class="bold">${formatCurrency(voucher.value)}</span></div>
            <div>Saldo: <span class="bold">${formatCurrency(voucher.remaining_value)}</span></div>
            <div class="line"></div>
            <div>Emitido: ${formatDate(voucher.created_at)}</div>
            <div>Validade: ${voucher.expires_at ? formatDate(voucher.expires_at) : 'Sem validade'}</div>
            <div class="line"></div>
            <div class="center">Este voucher é pessoal e intransferível.</div>
            <div class="center">Apresente este código no caixa.</div>
            <div class="line"></div>
            <div class="center" style="font-size: 10px;">Gerado por Prime Camp</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleValidateVoucher = async () => {
    if (!validationCode.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite o código do voucher',
        variant: 'destructive'
      });
      return;
    }

    const result = await checkVoucher(validationCode.trim());
    if (result?.data) {
      // Adaptar formato do resultado para Voucher
      const voucher: Voucher = {
        id: result.data.id,
        code: result.data.code,
        company_id: result.data.company_id,
        customer_name: result.data.customer_name || '',
        value: result.data.original_value || result.data.value,
        remaining_value: result.data.current_value || result.data.remaining_value,
        status: result.data.status,
        expires_at: result.data.expires_at,
        created_at: result.data.created_at,
        is_transferable: result.data.is_transferable || false
      };
      setSelectedVoucher(voucher);
      setVoucherDialogOpen(true);
    }
  };

  const handleCancelVoucher = async (id: string) => {
    toast({
      title: 'Funcionalidade em desenvolvimento',
      description: 'O cancelamento de vouchers será implementado em breve',
      variant: 'default'
    });
  };

  const filteredVouchers = vouchers.filter(v => 
    v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRefunds = refunds.filter(r =>
    r.refund_number?.toString().includes(searchTerm) ||
    r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Estatísticas
  const stats = {
    totalVouchers: vouchers.length,
    activeVouchers: vouchers.filter(v => v.status === 'active').length,
    totalValue: vouchers.filter(v => v.status === 'active').reduce((sum, v) => sum + (v.remaining_value || 0), 0),
    totalRefunds: refunds.length
  };

  return (
    <ModernLayout
      title="Devoluções e Vouchers"
      subtitle="Gerencie devoluções, trocas e cupons de crédito"
    >
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Vouchers</CardDescription>
            <CardTitle className="text-2xl">{stats.totalVouchers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vouchers Ativos</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.activeVouchers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saldo em Vouchers</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{formatCurrency(stats.totalValue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Devoluções</CardDescription>
            <CardTitle className="text-2xl">{stats.totalRefunds}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Validar Voucher */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Validar Voucher
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Digite o código do voucher (ex: VC-ABC123)"
              value={validationCode}
              onChange={(e) => setValidationCode(e.target.value.toUpperCase())}
              className="max-w-md"
            />
            <Button onClick={handleValidateVoucher} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              Validar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="vouchers" className="w-full">
        <TabsList>
          <TabsTrigger value="vouchers" className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4" />
            Vouchers ({stats.totalVouchers})
          </TabsTrigger>
          <TabsTrigger value="refunds" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Devoluções ({stats.totalRefunds})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vouchers" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Vouchers Emitidos</CardTitle>
                <CardDescription>Cupons de crédito únicos e rastreáveis</CardDescription>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar por código ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
                <Button variant="outline" onClick={() => fetchVouchers()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : filteredVouchers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum voucher encontrado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Valor Original</TableHead>
                      <TableHead>Saldo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVouchers.map((voucher) => (
                      <TableRow key={voucher.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded font-mono text-sm">
                              {voucher.code}
                            </code>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleCopyCode(voucher.code)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>{voucher.customer_name || '-'}</TableCell>
                        <TableCell>{formatCurrency(voucher.value)}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(voucher.remaining_value)}
                        </TableCell>
                        <TableCell>{getStatusBadge(voucher.status)}</TableCell>
                        <TableCell>
                          {voucher.expires_at ? formatDate(voucher.expires_at) : 'Sem validade'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedVoucher(voucher);
                                setVoucherDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePrintVoucher(voucher)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            {voucher.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600"
                                onClick={() => handleCancelVoucher(voucher.id)}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="refunds" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Devoluções</CardTitle>
              <CardDescription>Todas as devoluções processadas</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : filteredRefunds.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma devolução encontrada
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Venda Original</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRefunds.map((refund) => (
                      <TableRow key={refund.id}>
                        <TableCell>#{refund.refund_number}</TableCell>
                        <TableCell>#{refund.original_sale_number}</TableCell>
                        <TableCell>{refund.customer_name || '-'}</TableCell>
                        <TableCell>{formatCurrency(refund.total_refund_value)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {refund.refund_type === 'voucher' ? 'Voucher' : 
                             refund.refund_type === 'cash' ? 'Dinheiro' : 
                             refund.refund_type === 'card' ? 'Cartão' : refund.refund_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(refund.status)}</TableCell>
                        <TableCell>{formatDate(refund.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Detalhes do Voucher */}
      <Dialog open={voucherDialogOpen} onOpenChange={setVoucherDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Voucher</DialogTitle>
          </DialogHeader>
          {selectedVoucher && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-mono font-bold">{selectedVoucher.code}</div>
                <div className="mt-2">{getStatusBadge(selectedVoucher.status)}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Valor Original</div>
                  <div className="font-semibold">{formatCurrency(selectedVoucher.value)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Saldo Disponível</div>
                  <div className="font-semibold text-green-600">
                    {formatCurrency(selectedVoucher.remaining_value)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Cliente</div>
                  <div className="font-semibold">{selectedVoucher.customer_name || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Validade</div>
                  <div className="font-semibold">
                    {selectedVoucher.expires_at ? formatDate(selectedVoucher.expires_at) : 'Sem validade'}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-muted-foreground">Emitido em</div>
                  <div className="font-semibold">{formatDate(selectedVoucher.created_at)}</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoucherDialogOpen(false)}>
              Fechar
            </Button>
            {selectedVoucher && (
              <Button onClick={() => handlePrintVoucher(selectedVoucher)}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Processamento de Devolução */}
      <Dialog open={refundDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setRefundDialogOpen(false);
          setSaleData(null);
          setSelectedItems([]);
          setRefundReason('');
          navigate('/pdv/devolucoes', { replace: true });
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Processar Devolução/Troca
            </DialogTitle>
            <DialogDescription>
              {saleData && `Venda #${saleData.numero} - ${saleData.cliente_nome}`}
            </DialogDescription>
          </DialogHeader>

          {loadingSale ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Carregando venda...</span>
            </div>
          ) : saleData ? (
            <div className="space-y-4">
              {/* Info da Venda */}
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Venda:</span>
                      <span className="font-semibold ml-2">#{saleData.numero}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Data:</span>
                      <span className="ml-2">{formatDate(saleData.created_at)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-semibold ml-2">{formatCurrency(saleData.total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Itens para Devolução */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Itens para devolver:</Label>
                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="p-3 space-y-2">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{item.produto_nome}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(item.preco_unitario)} x {item.quantidade} = {formatCurrency(item.subtotal)}
                          </div>
                        </div>
                        {item.selected && (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Qtd:</Label>
                            <Input
                              type="number"
                              min="1"
                              max={item.quantidade}
                              value={item.refund_qty || item.quantidade}
                              onChange={(e) => updateRefundQty(item.id, parseInt(e.target.value) || 1)}
                              className="w-16 h-8 text-center"
                            />
                          </div>
                        )}
                      </div>
                      {/* Destino do Produto */}
                      {item.selected && (
                        <div className="ml-7 flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Destino:</Label>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant={item.destination === 'stock' ? 'default' : 'outline'}
                              className={`h-7 text-xs ${item.destination === 'stock' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                              onClick={() => updateItemDestination(item.id, 'stock')}
                            >
                              📦 Estoque
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={item.destination === 'exchange' ? 'default' : 'outline'}
                              className={`h-7 text-xs ${item.destination === 'exchange' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                              onClick={() => updateItemDestination(item.id, 'exchange')}
                            >
                              🔄 Troca
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={item.destination === 'loss' ? 'default' : 'outline'}
                              className={`h-7 text-xs ${item.destination === 'loss' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                              onClick={() => updateItemDestination(item.id, 'loss')}
                            >
                              ⚠️ Prejuízo
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  📦 <strong>Estoque:</strong> Produto volta ao estoque | 
                  🔄 <strong>Troca:</strong> Cliente vai trocar por outro | 
                  ⚠️ <strong>Prejuízo:</strong> Produto com defeito/descarte
                </p>
              </div>

              {/* Motivo */}
              <div>
                <Label htmlFor="reason">Motivo da devolução *</Label>
                <Textarea
                  id="reason"
                  placeholder="Ex: Produto com defeito, Troca por outro tamanho..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Método de Reembolso */}
              <div>
                <Label>Forma de reembolso</Label>
                <Select value={refundMethod} onValueChange={(v: 'voucher' | 'cash') => setRefundMethod(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="voucher">
                      <div className="flex items-center gap-2">
                        <ReceiptText className="h-4 w-4" />
                        Voucher de Crédito (Recomendado)
                      </div>
                    </SelectItem>
                    <SelectItem value="cash">
                      <div className="flex items-center gap-2">
                        <span>💵</span>
                        Dinheiro
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {refundMethod === 'voucher' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Será gerado um voucher único e intransferível para o cliente.
                  </p>
                )}
              </div>

              {/* Total da Devolução */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">Total a devolver:</span>
                    <span className="text-2xl font-bold text-green-600">
                      {formatCurrency(calculateRefundTotal())}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setRefundDialogOpen(false);
                navigate('/pdv/devolucoes', { replace: true });
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleProcessRefund}
              disabled={processingRefund || !saleData || calculateRefundTotal() === 0}
            >
              {processingRefund ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Devolução
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModernLayout>
  );
}

