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
  XCircle, Clock, RefreshCw, Eye, Ban, ArrowLeft, Package,
  User, AlertTriangle, ShoppingBag
} from 'lucide-react';
import { useRefunds, Refund, Voucher } from '@/hooks/useRefunds';
import { from } from '@/integrations/db/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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
    createRefund,
    approveRefund,
    completeRefund,
    fetchRefund
  } = useRefunds();
  const { toast } = useToast();
  const { profile, isAdmin } = useAuth();
  
  // Verificar se usuário pode fazer devolução (admin ou gestor)
  const canProcessRefund = isAdmin || profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'gestor';
  
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
  
  // Estado para visualização de devolução
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [refundDetailsOpen, setRefundDetailsOpen] = useState(false);
  const [loadingRefundDetails, setLoadingRefundDetails] = useState(false);
  
  // Estado para seleção de cliente
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

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

      console.log('[Devolução] Itens da venda raw:', items);
      
      const saleItems: SaleItem[] = (items || []).map((item: any) => {
        console.log('[Devolução] Item raw:', item);
        
        // Tentar todas as formas possíveis de obter o preço
        const quantidade = Number(item.quantidade) || Number(item.quantity) || 1;
        const subtotalItem = Number(item.subtotal) || Number(item.total) || 0;
        
        // Preço unitário: tentar campo direto ou calcular do subtotal
        let precoUnit = Number(item.preco_unitario) || 
                        Number(item.valor_unitario) || 
                        Number(item.price) || 
                        Number(item.unit_price) || 0;
        
        // Se não tem preço unitário, calcular do subtotal
        if (precoUnit === 0 && subtotalItem > 0 && quantidade > 0) {
          precoUnit = subtotalItem / quantidade;
        }
        
        console.log('[Devolução] Item processado:', item.produto_nome, 'qty:', quantidade, 'price:', precoUnit, 'subtotal:', subtotalItem);
        
        return {
          id: item.id,
          produto_id: item.produto_id,
          produto_nome: item.produto_nome || item.nome || item.product_name || 'Produto',
          quantidade: quantidade,
          preco_unitario: precoUnit,
          subtotal: subtotalItem || (precoUnit * quantidade),
          selected: true,
          refund_qty: quantidade,
          destination: 'stock' as ProductDestination
        };
      });

      const clienteNome = sale.cliente_nome || 'Consumidor Final';
      const isConsumidorFinal = !sale.cliente_id || clienteNome === 'Consumidor Final';
      
      setSaleData({
        id: sale.id,
        numero: sale.numero,
        cliente_nome: clienteNome,
        cliente_id: sale.cliente_id,
        total: sale.total,
        created_at: sale.created_at,
        items: saleItems
      });
      
      setSelectedItems(saleItems);
      // Se for consumidor final, forçar devolução em dinheiro
      setRefundMethod(isConsumidorFinal ? 'cash' : 'voucher');
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
    
    // Verificar permissão
    if (!canProcessRefund) {
      toast({
        title: 'Acesso Negado',
        description: 'Apenas administradores ou gestores podem processar devoluções. Solicite autorização.',
        variant: 'destructive'
      });
      return;
    }
    
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

    // Se for voucher, precisa ter cliente identificado
    if (refundMethod === 'voucher' && (!saleData.cliente_id || saleData.cliente_nome === 'Consumidor Final')) {
      toast({
        title: 'Cliente obrigatório',
        description: 'Para gerar voucher, a venda precisa ter um cliente identificado. Vendas para "Consumidor Final" só podem ser devolvidas em dinheiro.',
        variant: 'destructive'
      });
      return;
    }

    setProcessingRefund(true);
    try {
      const refundItems = itemsToRefund.map(item => {
        // Garantir que temos valores numéricos válidos
        const qty = Number(item.refund_qty) || Number(item.quantidade) || 1;
        const price = Number(item.preco_unitario) || Number(item.subtotal / item.quantidade) || 0;
        
        console.log('[Devolução] Item:', item.produto_nome, 'Qty:', qty, 'Price:', price);
        
        return {
          sale_item_id: item.id,
          product_id: item.produto_id,
          product_name: item.produto_nome,
          quantity: qty,
          unit_price: price,
          return_to_stock: item.destination === 'stock',
          condition: item.destination === 'loss' ? 'defeituoso' : 'novo',
          destination: item.destination
        };
      });

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
        return <Badge className="bg-gray-600"><CheckCircle className="h-3 w-3 mr-1" /> Usado</Badge>;
      case 'expired':
        return <Badge className="bg-orange-600"><Clock className="h-3 w-3 mr-1" /> Expirado</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-600"><XCircle className="h-3 w-3 mr-1" /> Cancelado</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-600"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
      case 'approved':
        return <Badge className="bg-blue-600"><CheckCircle className="h-3 w-3 mr-1" /> Aprovado</Badge>;
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
      const valorVoucher = voucher.value || voucher.remaining_value || 0;
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
              .huge { font-size: 24px; }
              .alert { background: #000; color: #fff; padding: 5px; margin: 10px 0; }
              .value { font-size: 20px; }
            </style>
          </head>
          <body>
            <div class="center bold big">VALE COMPRA</div>
            <div class="line"></div>
            
            <div class="center bold huge">${voucher.code}</div>
            
            <div class="line"></div>
            <div class="center">
              <div>Valor do Crédito:</div>
              <div class="bold value">${formatCurrency(valorVoucher)}</div>
            </div>
            <div class="line"></div>
            
            <div>Cliente: ${voucher.customer_name || '-'}</div>
            <div>Emitido: ${formatDate(voucher.created_at)}</div>
            <div>Validade: ${voucher.expires_at ? formatDate(voucher.expires_at) : 'Sem validade'}</div>
            
            <div class="line"></div>
            <div class="center alert bold">⚠️ GUARDE ESTE CUPOM ⚠️</div>
            <div class="center" style="margin-top: 5px;">
              Este vale é de USO ÚNICO.<br>
              Apresente no caixa para usar.<br>
              Não pode ser dividido.</div>
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

  // Buscar clientes
  const searchCustomers = async (term: string) => {
    if (term.length < 2) {
      setCustomerSearchResults([]);
      return;
    }
    
    setSearchingCustomers(true);
    try {
      const { data } = await from('clientes')
        .select('id, nome, cpf_cnpj, telefone')
        .ilike('nome', `%${term}%`)
        .limit(10)
        .execute();
      
      setCustomerSearchResults(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setSearchingCustomers(false);
    }
  };

  // Selecionar cliente
  const handleSelectCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    if (saleData) {
      setSaleData({
        ...saleData,
        cliente_id: customer.id,
        cliente_nome: customer.nome
      });
    }
    setCustomerSearchTerm('');
    setCustomerSearchResults([]);
    // Agora pode usar voucher
    setRefundMethod('voucher');
  };

  // Estado para itens da devolução selecionada
  const [refundItems, setRefundItems] = useState<any[]>([]);
  const [loadingRefundItems, setLoadingRefundItems] = useState(false);

  // Carregar detalhes da devolução com itens
  const loadRefundDetails = async (refund: Refund) => {
    setSelectedRefund(refund);
    setRefundDetailsOpen(true);
    setLoadingRefundItems(true);
    
    try {
      // Buscar itens da devolução
      const { data: items } = await from('refund_items')
        .select('*')
        .eq('refund_id', refund.id)
        .execute();
      
      setRefundItems(items || []);
    } catch (error) {
      console.error('Erro ao buscar itens da devolução:', error);
      setRefundItems([]);
    } finally {
      setLoadingRefundItems(false);
    }
  };

  // Aprovar devolução
  const handleApproveRefund = async (refundId: string) => {
    try {
      const result = await approveRefund(refundId);
      if (result) {
        toast({
          title: 'Sucesso',
          description: 'Devolução aprovada!'
        });
        fetchRefunds();
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao aprovar devolução',
        variant: 'destructive'
      });
    }
  };

  // Completar devolução (estornar estoque)
  const handleCompleteRefund = async (refundId: string) => {
    try {
      const result = await completeRefund(refundId);
      if (result) {
        toast({
          title: 'Sucesso',
          description: 'Devolução completada! Estoque atualizado.'
        });
        fetchRefunds();
        setRefundDetailsOpen(false);
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao completar devolução',
        variant: 'destructive'
      });
    }
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
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRefunds.map((refund) => (
                      <TableRow key={refund.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>#{refund.refund_number}</TableCell>
                        <TableCell>#{refund.original_sale_number || refund.sale_id?.slice(0,8)}</TableCell>
                        <TableCell>{refund.customer_name || '-'}</TableCell>
                        <TableCell>{formatCurrency(refund.total_refund_value)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {refund.refund_method === 'voucher' ? '🎟️ Voucher' : 
                             refund.refund_method === 'cash' ? '💵 Dinheiro' : 
                             refund.refund_method === 'card' ? '💳 Cartão' : refund.refund_method}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(refund.status)}</TableCell>
                        <TableCell>{formatDate(refund.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => loadRefundDetails(refund)}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {refund.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600"
                                onClick={() => handleApproveRefund(refund.id)}
                                title="Aprovar"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {(refund.status === 'pending' || refund.status === 'approved') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600"
                                onClick={() => handleCompleteRefund(refund.id)}
                                title="Completar (estornar estoque)"
                              >
                                <Package className="h-4 w-4" />
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

      {/* Dialog de Detalhes da Devolução */}
      <Dialog open={refundDetailsOpen} onOpenChange={setRefundDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Detalhes da Devolução
            </DialogTitle>
            <DialogDescription>
              {selectedRefund && `#${selectedRefund.refund_number}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRefund && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Status:</span>
                {getStatusBadge(selectedRefund.status)}
              </div>
              
              {/* Informações Principais */}
              <div className="grid grid-cols-2 gap-4 text-sm border rounded-lg p-4">
                <div>
                  <span className="text-muted-foreground text-xs">Nº Devolução:</span>
                  <div className="font-bold text-lg">#{selectedRefund.refund_number}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Venda Original:</span>
                  <div className="font-bold text-lg">#{selectedRefund.original_sale_number || selectedRefund.sale_id?.slice(0,8)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Cliente:</span>
                  <div className="font-semibold">{selectedRefund.customer_name || 'Consumidor Final'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Valor Total:</span>
                  <div className="font-bold text-green-600 text-lg">{formatCurrency(selectedRefund.total_refund_value)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Método de Devolução:</span>
                  <div className="font-semibold">
                    {selectedRefund.refund_method === 'voucher' ? '🎟️ Vale Compra' : 
                     selectedRefund.refund_method === 'cash' ? '💵 Dinheiro' : 
                     selectedRefund.refund_method}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Tipo:</span>
                  <div className="font-semibold">
                    {selectedRefund.refund_type === 'full' ? '📦 Devolução Total' : '📦 Devolução Parcial'}
                  </div>
                </div>
              </div>

              {/* Rastreabilidade */}
              <div className="border rounded-lg p-4 bg-slate-50">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Rastreabilidade
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Processado por:</span>
                    <div className="font-medium">{selectedRefund.created_by_name || selectedRefund.created_by || 'Usuário do sistema'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Data/Hora:</span>
                    <div className="font-medium">{formatDate(selectedRefund.created_at)}</div>
                  </div>
                  {selectedRefund.approved_by_name && (
                    <div>
                      <span className="text-muted-foreground text-xs">Aprovado por:</span>
                      <div className="font-medium">{selectedRefund.approved_by_name}</div>
                    </div>
                  )}
                  {selectedRefund.approved_at && (
                    <div>
                      <span className="text-muted-foreground text-xs">Data Aprovação:</span>
                      <div className="font-medium">{formatDate(selectedRefund.approved_at)}</div>
                    </div>
                  )}
                  {selectedRefund.voucher_code && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground text-xs">Voucher Gerado:</span>
                      <div className="font-bold text-purple-600">{selectedRefund.voucher_code}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Motivo */}
              <div className="border rounded-lg p-4">
                <span className="text-muted-foreground text-xs">Motivo da Devolução:</span>
                <div className="font-medium mt-1">{selectedRefund.reason || '-'}</div>
              </div>

              {/* Itens da Devolução */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Produtos Devolvidos ({refundItems.length})
                </h4>
                {loadingRefundItems ? (
                  <div className="text-center py-4 text-muted-foreground">Carregando...</div>
                ) : refundItems.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">Nenhum item encontrado</div>
                ) : (
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {refundItems.map((item, idx) => (
                      <div key={item.id || idx} className="p-3 flex justify-between items-center text-sm hover:bg-muted/50">
                        <div className="flex-1">
                          <div className="font-semibold">{item.product_name}</div>
                          <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                            <span>Qtd: <strong>{item.quantity}</strong></span>
                            <span>Unit: <strong>{formatCurrency(parseFloat(item.unit_price) || 0)}</strong></span>
                            <span className="inline-flex items-center">
                              {item.destination === 'stock' ? (
                                <><Package className="h-3 w-3 mr-1" /> Retorno ao Estoque</>
                              ) : item.destination === 'exchange' ? (
                                <><RefreshCw className="h-3 w-3 mr-1" /> Separado p/ Troca</>
                              ) : (
                                <><AlertTriangle className="h-3 w-3 mr-1 text-red-500" /> Prejuízo/Perda</>
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="font-bold text-right">
                          {formatCurrency(parseFloat(item.total_price) || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Legenda de Status */}
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Ver legenda de status
                </summary>
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <ul className="space-y-1 text-muted-foreground text-xs">
                    <li>🟡 <strong>Pendente:</strong> Aguardando aprovação de gestor</li>
                    <li>🔵 <strong>Aprovado:</strong> Aprovado, aguardando completar operação</li>
                    <li>🟢 <strong>Concluído:</strong> Finalizado, estoque/caixa atualizados</li>
                    <li>🔴 <strong>Cancelado:</strong> Devolução cancelada</li>
                  </ul>
                </div>
              </details>
            </div>
          )}
          
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setRefundDetailsOpen(false)}>
              Fechar
            </Button>
            {selectedRefund?.status === 'pending' && (
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleApproveRefund(selectedRefund.id)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprovar
              </Button>
            )}
            {(selectedRefund?.status === 'pending' || selectedRefund?.status === 'approved') && (
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => handleCompleteRefund(selectedRefund.id)}
              >
                <Package className="h-4 w-4 mr-2" />
                Completar
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

              {/* Seleção de Cliente (se for Consumidor Final) */}
              {(!saleData.cliente_id || saleData.cliente_nome === 'Consumidor Final') && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-orange-700">
                        <span className="text-lg">⚠️</span>
                        <span className="font-medium">Venda para Consumidor Final</span>
                      </div>
                      <p className="text-sm text-orange-600">
                        Para gerar voucher, selecione ou cadastre um cliente:
                      </p>
                      
                      {selectedCustomer ? (
                        <div className="flex items-center justify-between p-2 bg-white rounded border">
                          <div>
                            <div className="font-medium">{selectedCustomer.nome}</div>
                            <div className="text-sm text-muted-foreground">
                              {selectedCustomer.cpf_cnpj || selectedCustomer.telefone || 'Sem documento'}
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedCustomer(null);
                              if (saleData) {
                                setSaleData({
                                  ...saleData,
                                  cliente_id: undefined,
                                  cliente_nome: 'Consumidor Final'
                                });
                              }
                              setRefundMethod('cash');
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Input
                            placeholder="Buscar cliente por nome..."
                            value={customerSearchTerm}
                            onChange={(e) => {
                              setCustomerSearchTerm(e.target.value);
                              searchCustomers(e.target.value);
                            }}
                          />
                          {customerSearchResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {customerSearchResults.map((customer) => (
                                <div
                                  key={customer.id}
                                  className="p-2 hover:bg-muted cursor-pointer"
                                  onClick={() => handleSelectCustomer(customer)}
                                >
                                  <div className="font-medium">{customer.nome}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {customer.cpf_cnpj || customer.telefone || '-'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {searchingCustomers && (
                            <div className="absolute right-3 top-2">
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

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
                <Select 
                  value={refundMethod} 
                  onValueChange={(v: 'voucher' | 'cash') => setRefundMethod(v)}
                  disabled={!saleData?.cliente_id || saleData?.cliente_nome === 'Consumidor Final'}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="voucher" disabled={!saleData?.cliente_id || saleData?.cliente_nome === 'Consumidor Final'}>
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
                {refundMethod === 'voucher' && saleData?.cliente_id && saleData?.cliente_nome !== 'Consumidor Final' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Será gerado um voucher único e intransferível para o cliente.
                  </p>
                )}
                {(!saleData?.cliente_id || saleData?.cliente_nome === 'Consumidor Final') && (
                  <p className="text-xs text-orange-600 mt-1 font-medium">
                    ⚠️ Venda para Consumidor Final - apenas devolução em dinheiro disponível.
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


