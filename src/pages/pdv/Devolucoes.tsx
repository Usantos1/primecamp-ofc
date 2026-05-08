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
import { useRefunds, Refund, Voucher, VoucherUsageHistory } from '@/hooks/useRefunds';
import { from } from '@/integrations/db/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeConfig } from '@/contexts/ThemeConfigContext';
import { useCupomConfig } from '@/hooks/useCupomConfig';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
    cancelRefund,
    cancelVoucher,
    fetchVoucherHistory,
    fetchRefund
  } = useRefunds();
  const { toast } = useToast();
  const { profile, isAdmin } = useAuth();
  const { config: themeConfig } = useThemeConfig();
  const { data: cupomConfig } = useCupomConfig();
  
  // Quem pode aprovar/completar sem senha (admin ou gestor). Vendedores podem criar e aprovar/completar com senha.
  const canApproveWithoutPassword = isAdmin || profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'gestor';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
  const [voucherHistory, setVoucherHistory] = useState<VoucherUsageHistory[]>([]);
  const [loadingVoucherHistory, setLoadingVoucherHistory] = useState(false);
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

  // Modal de senha de aprovação (para vendedores aprovarem/completarem devolução)
  const [approvalPasswordOpen, setApprovalPasswordOpen] = useState(false);
  const [approvalPasswordValue, setApprovalPasswordValue] = useState('');
  const [approvalAction, setApprovalAction] = useState<'approve' | 'complete' | null>(null);
  const [approvalRefundId, setApprovalRefundId] = useState<string | null>(null);

  // Verificar se veio com sale_id na URL
  useEffect(() => {
    const saleId = searchParams.get('sale');
    if (saleId) {
      loadSaleForRefund(saleId);
    }
  }, [searchParams]);

  // Dados de refunds e vouchers vêm do useRefunds (React Query); não disparar fetch extra no mount

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
      
      const saleTotal = Number(sale.total) || 0;
      const saleItemsBase: SaleItem[] = (items || []).map((item: any) => {
        console.log('[Devolução] Item raw:', item);
        
        // Tentar todas as formas possíveis de obter o preço
        const quantidade = Number(item.quantidade) || Number(item.quantity) || 1;
        const descontoItem = Number(item.desconto) || Number(item.discount) || 0;
        const valorTotalItem = Number(item.valor_total) || Number(item.subtotal) || Number(item.total) || 0;
        
        // Preço unitário: tentar campo direto ou calcular do subtotal
        let precoUnit = Number(item.preco_unitario) || 
                        Number(item.valor_unitario) || 
                        Number(item.price) || 
                        Number(item.unit_price) || 0;
        
        const subtotalBruto = precoUnit * quantidade;
        let subtotalLiquido = valorTotalItem;
        
        // Se não tem total líquido salvo, descontar desconto do item ou calcular pelo preço bruto
        if (subtotalLiquido === 0) {
          subtotalLiquido = Math.max(0, subtotalBruto - descontoItem);
        }
        
        // Se não tem preço unitário, calcular pelo total líquido
        if (precoUnit === 0 && subtotalLiquido > 0 && quantidade > 0) {
          precoUnit = subtotalLiquido / quantidade;
        }
        
        console.log('[Devolução] Item processado:', item.produto_nome, 'qty:', quantidade, 'price:', precoUnit, 'subtotal:', subtotalLiquido);
        
        return {
          id: item.id,
          produto_id: item.produto_id,
          produto_nome: item.produto_nome || item.nome || item.product_name || 'Produto',
          quantidade: quantidade,
          preco_unitario: quantidade > 0 ? subtotalLiquido / quantidade : precoUnit,
          subtotal: subtotalLiquido,
          selected: true,
          refund_qty: quantidade,
          destination: 'stock' as ProductDestination
        };
      });
      const totalItensLiquido = saleItemsBase.reduce((sum, item) => sum + item.subtotal, 0);
      const fatorDescontoVenda = saleTotal > 0 && totalItensLiquido > saleTotal && totalItensLiquido > 0
        ? saleTotal / totalItensLiquido
        : 1;
      const saleItems = saleItemsBase.map(item => {
        const subtotalFinal = Number((item.subtotal * fatorDescontoVenda).toFixed(2));
        return {
          ...item,
          subtotal: subtotalFinal,
          preco_unitario: item.quantidade > 0 ? subtotalFinal / item.quantidade : item.preco_unitario,
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

  // Processar devolução (criar) — qualquer usuário com acesso à página (vendas.manage) pode criar; aprovar/completar exige admin ou senha
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
      const rawRefundTotal = itemsToRefund.reduce((sum, item) => {
        const qty = Number(item.refund_qty) || Number(item.quantidade) || 1;
        const price = Number(item.preco_unitario) || Number(item.subtotal / item.quantidade) || 0;
        return sum + qty * price;
      }, 0);
      const maxRefundTotal = Number(saleData.total) || rawRefundTotal;
      const refundValueFactor = rawRefundTotal > maxRefundTotal && rawRefundTotal > 0
        ? maxRefundTotal / rawRefundTotal
        : 1;
      const refundItems = itemsToRefund.map(item => {
        // Garantir que temos valores numéricos válidos
        const qty = Number(item.refund_qty) || Number(item.quantidade) || 1;
        const basePrice = Number(item.preco_unitario) || Number(item.subtotal / item.quantidade) || 0;
        const price = basePrice * refundValueFactor;
        
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
        navigate('/devolucoes', { replace: true });
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
    const total = selectedItems
      .filter(i => i.selected)
      .reduce((sum, item) => sum + (item.refund_qty || 0) * item.preco_unitario, 0);
    return saleData?.total ? Math.min(total, Number(saleData.total)) : total;
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

  // Constrói o HTML do voucher com as configs do cupom (logo e nome da empresa), igual ao cupom de venda
  const getVoucherPrintHtml = (voucher: any) => {
    const valorVoucher = voucher.original_value || voucher.current_value || voucher.value || voucher.remaining_value || 0;
    const mostrarLogo = cupomConfig?.mostrar_logo !== false;
    const logoUrl = cupomConfig?.logo_url || '';
    const companyName = cupomConfig?.empresa_nome || themeConfig?.companyName || 'Ativa FIX';
    const logoSrc = logoUrl.startsWith('data:') ? logoUrl : logoUrl.startsWith('http') ? logoUrl : `${window.location.origin}${logoUrl.startsWith('/') ? '' : '/'}${logoUrl}`;
    const logoImg =
      mostrarLogo && logoUrl
        ? `<div class="center" style="margin-bottom: 3px;"><img src="${logoSrc}" style="max-width: 60mm; max-height: 20mm; object-fit: contain; filter: contrast(2) brightness(0.85) saturate(1.2); -webkit-filter: contrast(2) brightness(0.85) saturate(1.2); image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges; -webkit-print-color-adjust: exact; print-color-adjust: exact;" alt="${companyName}" onerror="this.style.display='none'" /></div><div class="divider-dashed"></div>`
        : '';
    const validityText = voucher.expires_at ? formatDate(voucher.expires_at) : '90 dias após a emissão';
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Voucher ${voucher.code}</title>
          <style>
            @page { size: 80mm 297mm; margin: 0; padding: 0; }
            @media print {
              @page { size: 80mm 297mm; margin: 0; padding: 0; }
              * { color: #000000 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; -webkit-font-smoothing: none !important; text-rendering: optimizeLegibility !important; image-rendering: -webkit-optimize-contrast !important; image-rendering: crisp-edges !important; }
              body { font-size: 12px !important; padding: 2mm 6mm !important; transform: scale(1) !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
            * { margin: 0; padding: 0; box-sizing: border-box; color: #000000 !important; -webkit-font-smoothing: none !important; text-rendering: optimizeLegibility !important; image-rendering: crisp-edges !important; }
            body { width: 80mm; max-width: 80mm; margin: 0; padding: 2mm 6mm 2mm 5mm; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #000000 !important; background: #fff; line-height: 1.35; font-weight: 900; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; overflow: hidden; letter-spacing: 0.1px; }
            .center { text-align: center; }
            .bold { font-weight: 900 !important; color: #000000 !important; }
            .divider-dashed { border-top: 2px dashed #000000 !important; margin: 4px 0; }
            .big { font-size: 14px !important; font-weight: 900 !important; }
            .huge { font-size: 18px !important; font-weight: 900 !important; letter-spacing: 1px; }
            .alert { background: #000000 !important; color: #ffffff !important; padding: 4px 6px; margin: 6px 0; font-weight: 900 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .value { font-size: 16px !important; font-weight: 900 !important; }
            div, p, span { color: #000000 !important; font-weight: 900 !important; }
          </style>
        </head>
        <body>
          ${logoImg}
          <div class="center bold big" style="margin: 4px 0;">VALE COMPRA</div>
          <div class="divider-dashed"></div>
          <div class="center bold huge" style="margin: 6px 0;">${voucher.code}</div>
          <div class="divider-dashed"></div>
          <div class="center" style="margin: 4px 0;">
            <div>Valor do Crédito:</div>
            <div class="bold value">${formatCurrency(valorVoucher)}</div>
          </div>
          <div class="divider-dashed"></div>
          <div style="font-size: 11px; margin: 2px 0;">Cliente: ${voucher.customer_name || '-'}</div>
          <div style="font-size: 11px; margin: 2px 0;">Emitido: ${formatDate(voucher.created_at)}</div>
          <div style="font-size: 11px; margin: 2px 0;">Validade: ${validityText}</div>
          <div class="divider-dashed"></div>
          <div class="center alert bold" style="font-size: 10px;">GUARDE ESTE CUPOM</div>
          <div class="center" style="font-size: 9px; margin-top: 4px; line-height: 1.4;">
            Este vale é de USO ÚNICO.<br>
            Apresente no caixa para usar.<br>
            Não pode ser dividido.</div>
          <div class="center" style="font-size: 9px; margin-top: 2px;">Apresente este código no caixa.</div>
          <div class="divider-dashed"></div>
          <div class="center" style="font-size: 9px;">Gerado por ${companyName}</div>
        </body>
      </html>`;
  };

  const handlePrintVoucher = (voucher: any) => {
    const html = getVoucherPrintHtml(voucher);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 500);
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
      loadVoucherDetails(voucher);
    }
  };

  const loadVoucherDetails = async (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setVoucherDialogOpen(true);
    setLoadingVoucherHistory(true);
    try {
      const history = await fetchVoucherHistory(voucher.id);
      setVoucherHistory(history || []);
    } catch (error) {
      console.error('Erro ao buscar histórico do voucher:', error);
      setVoucherHistory([]);
    } finally {
      setLoadingVoucherHistory(false);
    }
  };

  const handleCancelVoucher = async (voucher: Voucher) => {
    const reason = window.prompt(
      `Informe o motivo para cancelar o voucher ${voucher.code}:`,
      'Cancelamento administrativo'
    );

    if (!reason?.trim()) return;

    const confirmed = window.confirm(
      'Confirmar cancelamento do voucher? Se ele estiver vinculado a uma devolução, a devolução também será cancelada.'
    );

    if (!confirmed) return;

    const result = await cancelVoucher(voucher.id, reason.trim());
    if (result) {
      fetchRefunds();
      fetchVouchers();
      setVoucherDialogOpen(false);
      setSelectedVoucher(null);
    }
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

  const handleCancelRefund = async (refund: Refund) => {
    const reason = window.prompt(
      `Informe o motivo para cancelar a devolução #${refund.refund_number}:`,
      'Cancelamento administrativo'
    );

    if (!reason?.trim()) return;

    const confirmed = window.confirm(
      'Confirmar cancelamento da devolução? Se houver voucher vinculado, ele também será cancelado.'
    );

    if (!confirmed) return;

    const result = await cancelRefund(refund.id, reason.trim());
    if (result) {
      fetchRefunds();
      fetchVouchers();
      setRefundDetailsOpen(false);
      setSelectedRefund(null);
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

  // Aprovar devolução (direto se admin/gestor; senão abre modal de senha)
  const handleApproveRefund = (refundId: string) => {
    if (canApproveWithoutPassword) {
      doApproveRefund(refundId);
    } else {
      setApprovalRefundId(refundId);
      setApprovalAction('approve');
      setApprovalPasswordValue('');
      setApprovalPasswordOpen(true);
    }
  };

  const doApproveRefund = async (refundId: string, approvalPassword?: string) => {
    try {
      const result = await approveRefund(refundId, approvalPassword ? { approval_password: approvalPassword } : undefined);
      if (result) {
        toast({ title: 'Sucesso', description: 'Devolução aprovada!' });
        fetchRefunds();
        setRefundDetailsOpen(false);
      }
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao aprovar devolução', variant: 'destructive' });
    }
  };

  // Completar devolução (direto se admin/gestor; senão abre modal de senha)
  const handleCompleteRefund = (refundId: string) => {
    if (canApproveWithoutPassword) {
      doCompleteRefund(refundId);
    } else {
      setApprovalRefundId(refundId);
      setApprovalAction('complete');
      setApprovalPasswordValue('');
      setApprovalPasswordOpen(true);
    }
  };

  const doCompleteRefund = async (refundId: string, approvalPassword?: string) => {
    try {
      const result = await completeRefund(refundId, approvalPassword ? { approval_password: approvalPassword } : undefined);
      if (result) {
        toast({ title: 'Sucesso', description: 'Devolução completada! Estoque atualizado.' });
        fetchRefunds();
        setRefundDetailsOpen(false);
      }
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao completar devolução', variant: 'destructive' });
    }
  };

  // Confirmar senha de aprovação (vendedor)
  const handleApprovalPasswordSubmit = async () => {
    if (!approvalRefundId || !approvalAction) return;
    if (!approvalPasswordValue.trim()) {
      toast({ title: 'Senha obrigatória', description: 'Digite a senha de aprovação', variant: 'destructive' });
      return;
    }
    if (approvalAction === 'approve') {
      await doApproveRefund(approvalRefundId, approvalPasswordValue.trim());
    } else {
      await doCompleteRefund(approvalRefundId, approvalPasswordValue.trim());
    }
    setApprovalPasswordOpen(false);
    setApprovalPasswordValue('');
    setApprovalRefundId(null);
    setApprovalAction(null);
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
    totalValue: vouchers.filter(v => v.status === 'active').reduce((sum, v) => {
      const valor = parseFloat(v.current_value) || parseFloat(v.remaining_value) || 0;
      return sum + valor;
    }, 0),
    totalRefunds: refunds.length
  };

  return (
    <ModernLayout
      title="Devoluções e Vouchers"
      subtitle="Gerencie devoluções, trocas e cupons de crédito"
    >
      <div className="flex flex-col gap-3 pb-8 min-w-0 [&_button]:rounded-full [&_input]:rounded-full [&_[role=combobox]]:rounded-full">
        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <Card className="border-2 border-slate-300 dark:border-slate-700 rounded-2xl md:rounded-full overflow-hidden touch-manipulation">
            <CardContent className="flex h-14 items-center justify-between gap-3 px-4 md:px-5 py-0 min-w-0">
              <span className="text-xs sm:text-sm text-muted-foreground truncate">Total de Vouchers</span>
              <span className="text-lg font-bold tabular-nums shrink-0">{stats.totalVouchers}</span>
            </CardContent>
          </Card>
          <Card className="border-2 border-green-500 rounded-2xl md:rounded-full overflow-hidden touch-manipulation">
            <CardContent className="flex h-14 items-center justify-between gap-3 px-4 md:px-5 py-0 min-w-0">
              <span className="text-xs sm:text-sm text-muted-foreground truncate">Vouchers Ativos</span>
              <span className="text-lg font-bold text-green-600 tabular-nums shrink-0">{stats.activeVouchers}</span>
            </CardContent>
          </Card>
          <Card className="border-2 border-blue-500 rounded-2xl md:rounded-full overflow-hidden touch-manipulation">
            <CardContent className="flex h-14 items-center justify-between gap-3 px-4 md:px-5 py-0 min-w-0">
              <span className="text-xs sm:text-sm text-muted-foreground truncate">Saldo em Vouchers</span>
              <span className="text-lg font-bold text-blue-600 tabular-nums shrink-0">{formatCurrency(stats.totalValue)}</span>
            </CardContent>
          </Card>
          <Card className="border-2 border-orange-500 rounded-2xl md:rounded-full overflow-hidden touch-manipulation col-span-2 md:col-span-1">
            <CardContent className="flex h-14 items-center justify-between gap-3 px-4 md:px-5 py-0 min-w-0">
              <span className="text-xs sm:text-sm text-muted-foreground truncate">Total de Devoluções</span>
              <span className="text-lg font-bold tabular-nums shrink-0">{stats.totalRefunds}</span>
            </CardContent>
          </Card>
        </div>

        {/* Validar Voucher */}
        <Card className="rounded-2xl md:rounded-full overflow-hidden border-2 border-slate-300 dark:border-slate-700">
          <CardContent className="flex flex-col md:flex-row md:items-center gap-2 p-3 md:px-5 md:py-3">
            <div className="flex items-center gap-2 font-semibold text-sm shrink-0">
              <QrCode className="h-4 w-4" />
              Validar Voucher
            </div>
            <Input
              placeholder="Código do voucher (ex: VC-ABC123)"
              value={validationCode}
              onChange={(e) => setValidationCode(e.target.value.toUpperCase())}
              className="flex-1 min-w-0 h-11 md:h-10 touch-manipulation text-sm"
            />
            <Button
              onClick={handleValidateVoucher}
              disabled={loading}
              className="h-11 md:h-10 px-5 touch-manipulation shrink-0"
            >
              <Search className="h-4 w-4 mr-2" />
              Validar
            </Button>
          </CardContent>
        </Card>

      {/* Tabs — mesmo estilo de Relatórios: centralizado, sem corte, botões visíveis */}
      <div className="w-full min-w-0 overflow-visible">
        <Tabs defaultValue="vouchers" className="w-full min-w-0 space-y-4 overflow-visible">
          <TabsList className="h-auto grid w-full grid-cols-2 gap-2 p-2 border-2 border-gray-300 dark:border-gray-600 rounded-full min-h-[3.25rem] items-center justify-items-center overflow-visible bg-muted/40 mb-1 shadow-sm">
            <TabsTrigger
              value="vouchers"
              className={cn(
                "w-full min-h-11 rounded-full font-semibold flex items-center justify-center gap-2 transition-all text-xs sm:text-sm",
                "data-[state=inactive]:bg-gray-200 data-[state=inactive]:text-gray-800 data-[state=inactive]:shadow-sm",
                "dark:data-[state=inactive]:bg-gray-700 dark:data-[state=inactive]:text-gray-100",
                "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
              )}
            >
              <ReceiptText className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate text-center">Vouchers ({stats.totalVouchers})</span>
            </TabsTrigger>
            <TabsTrigger
              value="refunds"
              className={cn(
                "w-full min-h-11 rounded-full font-semibold flex items-center justify-center gap-2 transition-all text-xs sm:text-sm",
                "data-[state=inactive]:bg-gray-200 data-[state=inactive]:text-gray-800 data-[state=inactive]:shadow-sm",
                "dark:data-[state=inactive]:bg-gray-700 dark:data-[state=inactive]:text-gray-100",
                "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
              )}
            >
              <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate text-center">Devoluções ({stats.totalRefunds})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vouchers" className="mt-3 overflow-visible min-h-0">
          <Card className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-2 py-3 px-3 sm:px-6">
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-lg">Vouchers Emitidos</CardTitle>
                <CardDescription className="text-[10px] sm:text-sm hidden sm:block">Cupons de crédito únicos e rastreáveis</CardDescription>
              </div>
              <div className="flex gap-2 w-full md:w-auto md:items-center">
                <Input
                  placeholder="Buscar por código ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 md:w-72 h-11 md:h-10 touch-manipulation text-sm"
                />
                <Button
                  variant="outline"
                  onClick={() => fetchVouchers()}
                  className="h-11 md:h-10 w-11 md:w-10 p-0 touch-manipulation shrink-0"
                  aria-label="Atualizar lista"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-2 py-2 sm:px-6 sm:py-4">
              {loading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : filteredVouchers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum voucher encontrado
                </div>
              ) : (
                <>
                  {/* Desktop: Tabela */}
                  <div className="hidden lg:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Valor Original</TableHead>
                          <TableHead>Saldo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data/Hora de Uso</TableHead>
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
                                <Button variant="ghost" size="sm" onClick={() => handleCopyCode(voucher.code)}>
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>{voucher.customer_name || '-'}</TableCell>
                            <TableCell>{formatCurrency(voucher.original_value || voucher.value || 0)}</TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(voucher.current_value || voucher.remaining_value || 0)}
                            </TableCell>
                            <TableCell>{getStatusBadge(voucher.status)}</TableCell>
                            <TableCell>
                              {voucher.used_at ? (
                                <div className="space-y-0.5">
                                  <div className="font-medium">{formatDate(voucher.used_at)}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Venda #{voucher.used_sale_number || voucher.used_sale_id?.slice(0, 8)}
                                  </div>
                                  {voucher.used_items && voucher.used_items.length > 0 && (
                                    <div className="text-xs text-muted-foreground max-w-[220px] truncate">
                                      {voucher.used_items.map(item => item.produto_nome).filter(Boolean).join(', ')}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {voucher.expires_at ? formatDate(voucher.expires_at) : '90 dias após a emissão'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => loadVoucherDetails(voucher)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handlePrintVoucher(voucher)}>
                                  <Printer className="h-4 w-4" />
                                </Button>
                                {voucher.status !== 'cancelled' && (
                                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleCancelVoucher(voucher)}>
                                    <Ban className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Mobile: Cards compactos */}
                  <div className="lg:hidden space-y-1.5">
                    {filteredVouchers.map((voucher) => (
                      <Card
                        key={voucher.id}
                        className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden touch-manipulation active:scale-[0.99]"
                      >
                        <CardContent className="p-2">
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="min-w-0 flex-1">
                              <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs font-semibold truncate block">
                                {voucher.code}
                              </code>
                              <p className="text-xs text-foreground truncate mt-0.5">{voucher.customer_name || '-'}</p>
                            </div>
                            {getStatusBadge(voucher.status)}
                          </div>
                          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-border/50">
                            <div className="min-w-0 text-[10px] text-muted-foreground">
                              <div>{formatCurrency(voucher.current_value || voucher.remaining_value || 0)} saldo</div>
                              {voucher.used_at && (
                                <div className="truncate">
                                  Usado em {formatDate(voucher.used_at)}
                                  {voucher.used_sale_number ? ` · Venda #${voucher.used_sale_number}` : ''}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-0.5">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md" onClick={() => handleCopyCode(voucher.code)} aria-label="Copiar">
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md" onClick={() => loadVoucherDetails(voucher)} aria-label="Ver">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md" onClick={() => handlePrintVoucher(voucher)} aria-label="Imprimir">
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                              {voucher.status !== 'cancelled' && (
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md text-red-600" onClick={() => handleCancelVoucher(voucher)} aria-label="Cancelar">
                                  <Ban className="h-3.5 w-3.5" />
                                </Button>
                              )}
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
        </TabsContent>

        <TabsContent value="refunds" className="mt-3 overflow-visible min-h-0">
          <Card className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-2 py-3 px-3 sm:px-6">
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-lg">Histórico de Devoluções</CardTitle>
                <CardDescription className="text-[10px] sm:text-sm hidden sm:block">Todas as devoluções processadas</CardDescription>
              </div>
              <div className="flex gap-2 w-full md:w-auto md:items-center">
                <Input
                  placeholder="Buscar por nº ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 md:w-72 h-11 md:h-10 touch-manipulation text-sm"
                />
                <Button
                  variant="outline"
                  onClick={() => fetchRefunds()}
                  className="h-11 md:h-10 w-11 md:w-10 p-0 touch-manipulation shrink-0"
                  aria-label="Atualizar devoluções"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-2 py-2 sm:px-6 sm:py-4">
              {loading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : filteredRefunds.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhuma devolução encontrada
                </div>
              ) : (
                <>
                  {/* Desktop: Tabela */}
                  <div className="hidden md:block overflow-x-auto">
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
                                <Button variant="ghost" size="sm" onClick={() => loadRefundDetails(refund)} title="Ver detalhes">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {refund.status === 'pending' && (
                                  <Button variant="ghost" size="sm" className="text-green-600" onClick={() => handleApproveRefund(refund.id)} title="Aprovar">
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                {(refund.status === 'pending' || refund.status === 'approved') && (
                                  <Button variant="ghost" size="sm" className="text-blue-600" onClick={() => handleCompleteRefund(refund.id)} title="Completar (estornar estoque)">
                                    <Package className="h-4 w-4" />
                                  </Button>
                                )}
                                {refund.status !== 'cancelled' && (
                                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleCancelRefund(refund)} title="Cancelar devolução">
                                    <Ban className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Mobile: Cards compactos */}
                  <div className="md:hidden space-y-1.5">
                    {filteredRefunds.map((refund) => (
                      <Card
                        key={refund.id}
                        className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden touch-manipulation active:scale-[0.99] cursor-pointer"
                        onClick={() => loadRefundDetails(refund)}
                      >
                        <CardContent className="p-2">
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold text-sm tabular-nums">#{refund.refund_number}</span>
                              <p className="text-xs text-foreground truncate mt-0.5">{refund.customer_name || '-'}</p>
                            </div>
                            {getStatusBadge(refund.status)}
                          </div>
                          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-border/50 text-[10px] text-muted-foreground">
                            <span>Venda #{refund.original_sale_number || refund.sale_id?.slice(0,8)} · {formatCurrency(refund.total_refund_value)}</span>
                            <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md" onClick={() => loadRefundDetails(refund)} aria-label="Ver">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {refund.status === 'pending' && (
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md text-green-600" onClick={() => handleApproveRefund(refund.id)} aria-label="Aprovar">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {(refund.status === 'pending' || refund.status === 'approved') && (
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md text-blue-600" onClick={() => handleCompleteRefund(refund.id)} aria-label="Completar">
                                  <Package className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {refund.status !== 'cancelled' && (
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md text-red-600" onClick={() => handleCancelRefund(refund)} aria-label="Cancelar">
                                  <Ban className="h-3.5 w-3.5" />
                                </Button>
                              )}
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
        </TabsContent>
        </Tabs>
      </div>
      </div>

      {/* Dialog de Detalhes do Voucher */}
      <Dialog open={voucherDialogOpen} onOpenChange={setVoucherDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto [&_button]:rounded-full [&_input]:rounded-full [&_[role=combobox]]:rounded-full">
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
                  <div className="font-semibold">{formatCurrency(selectedVoucher.original_value || selectedVoucher.value || 0)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Saldo Disponível</div>
                  <div className="font-semibold text-green-600">
                    {formatCurrency(selectedVoucher.current_value || selectedVoucher.remaining_value || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Cliente</div>
                  <div className="font-semibold">{selectedVoucher.customer_name || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Validade</div>
                  <div className="font-semibold">
                    {selectedVoucher.expires_at ? formatDate(selectedVoucher.expires_at) : '90 dias após a emissão'}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-muted-foreground">Emitido em</div>
                  <div className="font-semibold">{formatDate(selectedVoucher.created_at)}</div>
                </div>
              </div>
              
              <div className="border rounded-lg p-3 space-y-2">
                <div className="font-semibold text-sm">Uso do voucher</div>
                {loadingVoucherHistory ? (
                  <div className="text-sm text-muted-foreground">Carregando histórico...</div>
                ) : voucherHistory.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Este voucher ainda não foi usado.</div>
                ) : (
                  <div className="space-y-3">
                    {voucherHistory.map((usage) => (
                      <div key={usage.id} className="rounded-md bg-muted/50 p-3 text-sm space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-xs text-muted-foreground">Venda</div>
                            <div className="font-semibold">#{usage.sale_number || usage.sale_id?.slice(0, 8) || '-'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Data/Hora de uso</div>
                            <div className="font-semibold">{formatDate(usage.used_at)}</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-xs text-muted-foreground">Valor usado</div>
                            <div className="font-semibold text-green-600">{formatCurrency(usage.amount_used)}</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Produto(s)</div>
                          {usage.items && usage.items.length > 0 ? (
                            <div className="space-y-1">
                              {usage.items.map((item, index) => (
                                <div key={`${usage.id}-${index}`} className="flex justify-between gap-2">
                                  <span className="min-w-0 truncate">{item.produto_nome || 'Produto'}</span>
                                  <span className="shrink-0 text-muted-foreground">
                                    {Number(item.quantidade || 0)}x {formatCurrency(Number(item.valor_total || 0))}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-muted-foreground">Produtos não encontrados para esta venda.</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto [&_button]:rounded-full [&_input]:rounded-full [&_[role=combobox]]:rounded-full">
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
            {selectedRefund?.status !== 'cancelled' && selectedRefund && (
              <Button 
                variant="destructive"
                onClick={() => handleCancelRefund(selectedRefund)}
              >
                <Ban className="h-4 w-4 mr-2" />
                Cancelar Devolução
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Senha de aprovação (vendedores) */}
      <Dialog open={approvalPasswordOpen} onOpenChange={(open) => {
        if (!open) {
          setApprovalPasswordOpen(false);
          setApprovalPasswordValue('');
          setApprovalRefundId(null);
          setApprovalAction(null);
        }
      }}>
        <DialogContent className="max-w-sm [&_button]:rounded-full [&_input]:rounded-full [&_[role=combobox]]:rounded-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Senha de aprovação
            </DialogTitle>
            <DialogDescription>
              Para {approvalAction === 'approve' ? 'aprovar' : 'completar'} esta devolução/troca, digite a senha de autorização definida pelo administrador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Label htmlFor="approval-password">Senha</Label>
            <Input
              id="approval-password"
              type="password"
              placeholder="Senha de aprovação"
              value={approvalPasswordValue}
              onChange={(e) => setApprovalPasswordValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApprovalPasswordSubmit()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalPasswordOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApprovalPasswordSubmit} disabled={loading || !approvalPasswordValue.trim()}>
              {approvalAction === 'approve' ? 'Aprovar' : 'Completar'}
            </Button>
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
          navigate('/devolucoes', { replace: true });
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto [&_button]:rounded-full [&_input]:rounded-full [&_[role=combobox]]:rounded-full">
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
                navigate('/devolucoes', { replace: true });
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


