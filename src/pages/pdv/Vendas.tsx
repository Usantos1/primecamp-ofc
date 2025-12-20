import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Plus, Search, Eye, Edit, Filter, Printer, Download, Send, MoreVertical, X, Trash2,
  ShoppingCart, DollarSign, Calendar, User
} from 'lucide-react';
import { generateCupomPDF, generateCupomTermica, printTermica } from '@/utils/pdfGenerator';
import { openWhatsApp, formatVendaMessage } from '@/utils/whatsapp';
import { useSales, useCancelRequests } from '@/hooks/usePDV';
import { useAuth } from '@/contexts/AuthContext';
import { Sale, SALE_STATUS_LABELS } from '@/types/pdv';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const SALE_STATUS_COLORS: Record<Sale['status'], string> = {
  draft: 'bg-gray-100 text-gray-800',
  open: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800',
  canceled: 'bg-red-100 text-red-800',
  refunded: 'bg-orange-100 text-orange-800',
};

export default function Vendas() {
  const navigate = useNavigate();
  const { sales, isLoading, getSaleById, cancelSale, deleteSale, refreshSales } = useSales();
  const { isAdmin, profile } = useAuth();
  const { createRequest } = useCancelRequests();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');
  
  // Estado do modal de cancelamento
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [isCanceling, setIsCanceling] = useState(false);
  
  // Estado do modal de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSaleToDelete, setSelectedSaleToDelete] = useState<Sale | null>(null);
  const [deleteMotivo, setDeleteMotivo] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Estado do modal de preview
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewSale, setPreviewSale] = useState<any>(null);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [previewPayments, setPreviewPayments] = useState<any[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Filtrar vendas
  const filteredSales = useMemo(() => {
    let result = [...sales];

    // Filtro por status
    if (statusFilter !== 'all') {
      result = result.filter(sale => sale.status === statusFilter);
    }

    // Filtro por data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dateFilter === 'today') {
      result = result.filter(sale => {
        const saleDate = new Date(sale.created_at);
        saleDate.setHours(0, 0, 0, 0);
        return saleDate.getTime() === today.getTime();
      });
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      result = result.filter(sale => new Date(sale.created_at) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      result = result.filter(sale => new Date(sale.created_at) >= monthAgo);
    }

    // Filtro por busca
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(sale =>
        sale.numero.toString().includes(search) ||
        sale.cliente_nome?.toLowerCase().includes(search) ||
        sale.cliente_cpf_cnpj?.includes(search) ||
        sale.vendedor_nome?.toLowerCase().includes(search)
      );
    }

    return result;
  }, [sales, statusFilter, dateFilter, searchTerm]);

  // Estatísticas
  const stats = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const vendasHoje = sales.filter(s => {
      const data = new Date(s.created_at);
      data.setHours(0, 0, 0, 0);
      return data.getTime() === hoje.getTime();
    });

    const totalHoje = vendasHoje
      .filter(s => s.status === 'paid')
      .reduce((sum, s) => sum + Number(s.total), 0);

    const totalGeral = sales
      .filter(s => s.status === 'paid')
      .reduce((sum, s) => sum + Number(s.total), 0);

    return {
      totalHoje: vendasHoje.length,
      totalHojeValor: totalHoje,
      totalGeral: sales.length,
      totalGeralValor: totalGeral,
    };
  }, [sales]);

  // Ações rápidas
  const handlePrintCupom = async (sale: Sale) => {
    try {
      const fullSale = await getSaleById(sale.id);
      if (!fullSale || !fullSale.items || !fullSale.payments) return;

      const cupomData = {
        numero: fullSale.numero,
        data: new Date(fullSale.created_at).toLocaleDateString('pt-BR'),
        hora: new Date(fullSale.created_at).toLocaleTimeString('pt-BR'),
        cliente: fullSale.cliente_nome ? {
          nome: fullSale.cliente_nome,
          cpf_cnpj: fullSale.cliente_cpf_cnpj || undefined,
          telefone: fullSale.cliente_telefone || undefined,
        } : undefined,
        itens: fullSale.items.map((item: any) => ({
          nome: item.produto_nome,
          quantidade: Number(item.quantidade),
          valor_unitario: Number(item.valor_unitario),
          desconto: Number(item.desconto || 0),
          valor_total: Number(item.valor_total),
        })),
        subtotal: Number(fullSale.subtotal),
        desconto_total: Number(fullSale.desconto_total),
        total: Number(fullSale.total),
        pagamentos: fullSale.payments
          .filter((p: any) => p.status === 'confirmed')
          .map((p: any) => ({
            forma: p.forma_pagamento,
            valor: Number(p.valor),
            troco: p.troco ? Number(p.troco) : undefined,
          })),
        vendedor: fullSale.vendedor_nome || undefined,
        observacoes: fullSale.observacoes || undefined,
      };

      // Gerar QR code com URL para 2ª via do cupom
      const qrCodeData = `${window.location.origin}/cupom/${fullSale.id}`;
      const html = await generateCupomTermica(cupomData, qrCodeData);
      
      // Impressão direta sem abrir janela
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);
      
      const printDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
      if (printDoc) {
        printDoc.open();
        printDoc.write(html);
        printDoc.close();
        
        // Aguardar carregamento e imprimir
        setTimeout(() => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
            
            // Remover iframe após impressão
            setTimeout(() => {
              try {
                if (printFrame.parentNode) {
                  document.body.removeChild(printFrame);
                }
              } catch (e) {
                console.error('Erro ao remover iframe:', e);
              }
            }, 1000);
          } catch (e) {
            console.error('Erro ao imprimir:', e);
            toast({ title: 'Erro ao imprimir cupom', variant: 'destructive' });
          }
        }, 500);
      }
    } catch (error) {
      console.error('Erro ao imprimir cupom:', error);
    }
  };

  const handleSavePDF = async (sale: Sale) => {
    try {
      const fullSale = await getSaleById(sale.id);
      if (!fullSale || !fullSale.items || !fullSale.payments) return;

      const cupomData = {
        numero: fullSale.numero,
        data: new Date(fullSale.created_at).toLocaleDateString('pt-BR'),
        hora: new Date(fullSale.created_at).toLocaleTimeString('pt-BR'),
        empresa: {
          nome: 'PRIME CAMP', // TODO: Buscar de configuração
          cnpj: '31.833.574/0001-74', // TODO: Buscar de configuração
          endereco: undefined, // TODO: Buscar de configuração
          telefone: undefined, // TODO: Buscar de configuração
        },
        cliente: fullSale.cliente_nome ? {
          nome: fullSale.cliente_nome,
          cpf_cnpj: fullSale.cliente_cpf_cnpj || undefined,
          telefone: fullSale.cliente_telefone || undefined,
        } : undefined,
        itens: fullSale.items.map((item: any) => ({
          nome: item.produto_nome,
          quantidade: Number(item.quantidade),
          valor_unitario: Number(item.valor_unitario),
          desconto: Number(item.desconto || 0),
          valor_total: Number(item.valor_total),
        })),
        subtotal: Number(fullSale.subtotal),
        desconto_total: Number(fullSale.desconto_total),
        total: Number(fullSale.total),
        pagamentos: fullSale.payments
          .filter((p: any) => p.status === 'confirmed')
          .map((p: any) => ({
            forma: p.forma_pagamento,
            valor: Number(p.valor),
            troco: p.troco ? Number(p.troco) : undefined,
          })),
        vendedor: fullSale.vendedor_nome || undefined,
        observacoes: fullSale.observacoes || undefined,
        termos_garantia: 'A Empresa oferece Garantia de 90 dias em peças usadas no conserto, contados a partir da data de entrega. A garantia não cobre danos causados por mau uso, quedas, água ou outros fatores externos.',
      };

      // Gerar QR code com URL para 2ª via do cupom
      const qrCodeData = `${window.location.origin}/cupom/${fullSale.id}`;
      const pdf = await generateCupomPDF(cupomData, qrCodeData);
      pdf.save(`cupom-venda-${fullSale.numero}.pdf`);
    } catch (error) {
      console.error('Erro ao salvar PDF:', error);
    }
  };

  const handleSendWhatsApp = async (sale: Sale) => {
    try {
      const fullSale = await getSaleById(sale.id);
      if (!fullSale || !fullSale.items || !fullSale.payments || !fullSale.cliente_telefone) {
        return;
      }

      const message = formatVendaMessage({
        numero: fullSale.numero,
        data: new Date(fullSale.created_at).toLocaleDateString('pt-BR'),
        total: Number(fullSale.total),
        cliente: fullSale.cliente_nome || undefined,
        itens: fullSale.items.map((item: any) => ({
          nome: item.produto_nome,
          quantidade: Number(item.quantidade),
          valor_total: Number(item.valor_total),
        })),
        pagamentos: fullSale.payments
          .filter((p: any) => p.status === 'confirmed')
          .map((p: any) => ({
            forma: p.forma_pagamento,
            valor: Number(p.valor),
          })),
      });

      openWhatsApp(fullSale.cliente_telefone, message);
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
    }
  };

  // Verificar se é admin ou gestor (pode ser baseado em department ou cargo)
  const canCancelDirectly = isAdmin || profile?.department === 'gestao' || profile?.department === 'gerencia';
  const canDelete = isAdmin || profile?.department === 'gestao' || profile?.department === 'gerencia';

  // Abrir modal de exclusão
  const handleOpenDeleteDialog = (sale: Sale, e?: React.MouseEvent) => {
    // Prevenir propagação de eventos
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Verificar permissões
    if (!sale.is_draft && !canDelete) {
      toast({
        title: 'Ação não permitida',
        description: 'Apenas administradores podem excluir vendas finalizadas.',
        variant: 'destructive',
      });
      return false;
    }
    
    setSelectedSaleToDelete(sale);
    setDeleteMotivo('');
    setDeleteDialogOpen(true);
    return false;
  };

  // Confirmar exclusão
  const handleConfirmDelete = async (e?: React.MouseEvent) => {
    // Prevenir fechamento automático do modal
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!selectedSaleToDelete) {
      return;
    }

    // Se for venda finalizada, motivo é obrigatório
    if (!selectedSaleToDelete.is_draft && !deleteMotivo.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Por favor, informe o motivo da exclusão.',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);
    try {
      console.log('=== INICIANDO EXCLUSÃO ===');
      console.log('Venda ID:', selectedSaleToDelete.id);
      console.log('É rascunho:', selectedSaleToDelete.is_draft);
      console.log('Can delete:', canDelete);
      console.log('Force:', !selectedSaleToDelete.is_draft && canDelete);
      
      // Se for rascunho, excluir normalmente
      // Se for venda finalizada, usar force=true (apenas admin/gestor pode)
      await deleteSale(selectedSaleToDelete.id, !selectedSaleToDelete.is_draft && canDelete);
      
      console.log('=== VENDA EXCLUÍDA COM SUCESSO ===');
      
      toast({
        title: 'Venda excluída',
        description: `Venda #${selectedSaleToDelete.numero} foi excluída com sucesso.`,
      });
      
      // Fechar modal primeiro
      setDeleteDialogOpen(false);
      setSelectedSaleToDelete(null);
      setDeleteMotivo('');
      
      // Recarregar lista de vendas após fechar modal
      console.log('Recarregando lista de vendas...');
      if (refreshSales) {
        try {
          await refreshSales();
          console.log('Lista recarregada via refreshSales');
        } catch (refreshError) {
          console.error('Erro ao recarregar via refreshSales:', refreshError);
          // Forçar recarregamento da página se refreshSales falhar
          setTimeout(() => window.location.reload(), 500);
        }
      } else {
        console.warn('refreshSales não disponível, recarregando página...');
        setTimeout(() => window.location.reload(), 500);
      }
    } catch (error: any) {
      console.error('=== ERRO AO EXCLUIR VENDA ===');
      console.error('Erro completo:', error);
      console.error('Mensagem:', error.message);
      console.error('Stack:', error.stack);
      
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir venda. Verifique o console para mais detalhes.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      console.log('=== FIM DA EXCLUSÃO ===');
    }
  };

  // Abrir modal de preview
  const handleViewSale = async (sale: Sale) => {
    setIsLoadingPreview(true);
    setPreviewDialogOpen(true);
    try {
      const fullSale = await getSaleById(sale.id);
      if (fullSale) {
        setPreviewSale(fullSale);
        setPreviewItems(fullSale.items || []);
        setPreviewPayments(fullSale.payments || []);
      }
    } catch (error) {
      console.error('Erro ao carregar venda:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os detalhes da venda.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Abrir modal de cancelamento
  const handleOpenCancelDialog = (sale: Sale, e?: React.MouseEvent) => {
    // Prevenir propagação de eventos
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Não pode cancelar rascunhos ou vendas já canceladas
    if (sale.is_draft || sale.status === 'canceled') {
      toast({
        title: 'Ação não permitida',
        description: 'Esta venda não pode ser cancelada.',
        variant: 'destructive',
      });
      return false;
    }
    setSelectedSale(sale);
    setCancelMotivo('');
    setCancelDialogOpen(true);
    return false;
  };

  // Confirmar cancelamento
  const handleConfirmCancel = async () => {
    if (!selectedSale || !cancelMotivo.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Por favor, informe o motivo do cancelamento.',
        variant: 'destructive',
      });
      return;
    }

    setIsCanceling(true);
    try {
      if (canCancelDirectly) {
        // Admin/Gestor: cancelar diretamente
        await cancelSale(selectedSale.id, cancelMotivo);
        toast({
          title: 'Venda cancelada',
          description: `Venda #${selectedSale.numero} foi cancelada com sucesso.`,
        });
      } else {
        // Usuário normal: criar solicitação
        await createRequest(selectedSale.id, cancelMotivo);
        toast({
          title: 'Solicitação enviada',
          description: `Solicitação de cancelamento da venda #${selectedSale.numero} foi enviada para aprovação.`,
        });
      }
      setCancelDialogOpen(false);
      setSelectedSale(null);
      setCancelMotivo('');
      
      // Recarregar lista de vendas (já é feito automaticamente pelo hook, mas garantimos)
      // Não redirecionar, apenas fechar o modal e atualizar a lista
    } catch (error: any) {
      console.error('Erro ao cancelar venda:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao processar cancelamento.',
        variant: 'destructive',
      });
    } finally {
      setIsCanceling(false);
    }
  };

  if (isLoading) {
    return (
      <ModernLayout title="Vendas" subtitle="Gerenciamento de vendas">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout title="Vendas" subtitle="Gerenciamento de vendas do PDV">
      <div className="space-y-6">
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalHoje}</div>
              <p className="text-xs text-muted-foreground">
                {currencyFormatters.brl(stats.totalHojeValor)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Geral</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGeral}</div>
              <p className="text-xs text-muted-foreground">
                {currencyFormatters.brl(stats.totalGeralValor)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rascunhos</CardTitle>
              <Edit className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sales.filter(s => s.is_draft).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sales.filter(s => s.status === 'partial' || s.status === 'open').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Card principal */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-lg">Lista de Vendas</CardTitle>
              <Button onClick={() => navigate('/pdv/venda/nova')} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Venda
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nº venda, cliente, CPF/CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="open">Aberta</SelectItem>
                  <SelectItem value="paid">Paga</SelectItem>
                  <SelectItem value="partial">Parcial</SelectItem>
                  <SelectItem value="canceled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Últimos 7 dias</SelectItem>
                  <SelectItem value="month">Últimos 30 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tabela de vendas */}
            {filteredSales.length === 0 ? (
              <EmptyState
                variant="no-data"
                title="Nenhuma venda encontrada"
                description="Cadastre uma nova venda para começar."
                action={{ label: 'Nova Venda', onClick: () => navigate('/pdv/venda/nova') }}
              />
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Nº</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Pago</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => (
                      <TableRow 
                        key={sale.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/pdv/venda/${sale.id}`)}
                      >
                        <TableCell className="font-bold text-primary">#{sale.numero}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sale.cliente_nome || 'Cliente não informado'}</p>
                            {sale.cliente_cpf_cnpj && (
                              <p className="text-xs text-muted-foreground">{sale.cliente_cpf_cnpj}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{sale.vendedor_nome || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(SALE_STATUS_COLORS[sale.status])}>
                            {SALE_STATUS_LABELS[sale.status]}
                          </Badge>
                          {sale.is_draft && (
                            <Badge variant="outline" className="ml-2">Rascunho</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {dateFormatters.short(sale.created_at)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {currencyFormatters.brl(sale.total)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "font-semibold",
                            Number(sale.total_pago) >= Number(sale.total) ? "text-green-600" : "text-orange-600"
                          )}>
                            {currencyFormatters.brl(sale.total_pago)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={async (e) => {
                                e.stopPropagation();
                                await handleViewSale(sale);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!sale.is_draft && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePrintCupom(sale);
                                    }}
                                  >
                                    <Printer className="h-4 w-4 mr-2" />
                                    Reimprimir Cupom
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/pdv/venda/${sale.id}/editar`);
                                    }}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar Venda
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSavePDF(sale);
                                    }}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Salvar PDF
                                  </DropdownMenuItem>
                                  {sale.cliente_telefone && (
                                    <DropdownMenuItem 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSendWhatsApp(sale);
                                      }}
                                    >
                                      <Send className="h-4 w-4 mr-2" />
                                      Enviar WhatsApp
                                    </DropdownMenuItem>
                                  )}
                                  {!sale.is_draft && sale.status !== 'canceled' && (
                                    <DropdownMenuItem 
                                      onSelect={(e) => {
                                        e.preventDefault();
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        handleOpenCancelDialog(sale, e);
                                      }}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <X className="h-4 w-4 mr-2" />
                                      Cancelar Venda
                                    </DropdownMenuItem>
                                  )}
                                  {/* Opção de excluir - apenas para admin/gestor ou rascunhos */}
                                  {(sale.is_draft || canDelete) && (
                                    <DropdownMenuItem 
                                      onSelect={(e) => {
                                        e.preventDefault();
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        handleOpenDeleteDialog(sale, e);
                                      }}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Excluir Venda
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            {sale.is_draft && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/pdv/venda/${sale.id}/editar`);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDeleteDialog(sale, e);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {/* Botão de excluir para vendas finalizadas (apenas admin/gestor) */}
                            {!sale.is_draft && canDelete && sale.status !== 'canceled' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDeleteDialog(sale, e);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Preview da Venda */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualizar Venda #{previewSale?.numero || ''}</DialogTitle>
          </DialogHeader>
          
          {isLoadingPreview ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : previewSale ? (
            <div className="space-y-4">
              {/* Informações da Venda */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações da Venda</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div>
                      <Badge className={cn(SALE_STATUS_COLORS[previewSale.status])}>
                        {SALE_STATUS_LABELS[previewSale.status]}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data</Label>
                    <p className="text-sm">{new Date(previewSale.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Vendedor</Label>
                    <p className="text-sm">{previewSale.vendedor_nome || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Total</Label>
                    <p className="text-sm font-semibold">{currencyFormatters.brl(previewSale.total)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Cliente */}
              {previewSale.cliente_nome && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cliente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Nome</Label>
                        <p className="text-sm">{previewSale.cliente_nome}</p>
                      </div>
                      {previewSale.cliente_cpf_cnpj && (
                        <div>
                          <Label className="text-xs text-muted-foreground">CPF/CNPJ</Label>
                          <p className="text-sm">{previewSale.cliente_cpf_cnpj}</p>
                        </div>
                      )}
                      {previewSale.cliente_telefone && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Telefone</Label>
                          <p className="text-sm">{previewSale.cliente_telefone}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Itens */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Itens ({previewItems.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {previewItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center py-2 border-b">
                        <div className="flex-1">
                          <p className="font-medium">{item.produto_nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantidade}x {currencyFormatters.brl(item.valor_unitario)}
                            {item.desconto > 0 && ` - Desc: ${currencyFormatters.brl(item.desconto)}`}
                          </p>
                        </div>
                        <p className="font-semibold">{currencyFormatters.brl(item.valor_total)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{currencyFormatters.brl(previewSale.subtotal)}</span>
                    </div>
                    {previewSale.desconto_total > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Desconto:</span>
                        <span>-{currencyFormatters.brl(previewSale.desconto_total)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-2">
                      <span>Total:</span>
                      <span>{currencyFormatters.brl(previewSale.total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pagamentos */}
              {previewPayments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Pagamentos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {previewPayments
                        .filter((p: any) => p.status === 'confirmed')
                        .map((payment: any) => (
                          <div key={payment.id} className="flex justify-between items-center py-2 border-b">
                            <div>
                              <p className="font-medium capitalize">{payment.forma_pagamento}</p>
                              {payment.troco > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Troco: {currencyFormatters.brl(payment.troco)}
                                </p>
                              )}
                            </div>
                            <p className="font-semibold">{currencyFormatters.brl(payment.valor)}</p>
                          </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between">
                        <span>Total Pago:</span>
                        <span className={cn(
                          "font-semibold",
                          Number(previewSale.total_pago) >= Number(previewSale.total) ? "text-green-600" : "text-orange-600"
                        )}>
                          {currencyFormatters.brl(previewSale.total_pago)}
                        </span>
                      </div>
                      {Number(previewSale.total_pago) < Number(previewSale.total) && (
                        <div className="flex justify-between text-orange-600 mt-1">
                          <span>Saldo Restante:</span>
                          <span className="font-semibold">
                            {currencyFormatters.brl(Number(previewSale.total) - Number(previewSale.total_pago))}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Observações */}
              {previewSale.observacoes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Observações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{previewSale.observacoes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Venda não encontrada</p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Fechar
            </Button>
            {previewSale && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPreviewDialogOpen(false);
                    navigate(`/pdv/venda/${previewSale.id}`);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (previewSale) {
                      await handlePrintCupom(previewSale);
                    }
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão */}
      <AlertDialog 
        open={deleteDialogOpen} 
        onOpenChange={(open) => {
          // Não permitir fechar durante exclusão
          if (!isDeleting) {
            setDeleteDialogOpen(open);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedSaleToDelete?.is_draft ? 'Excluir Rascunho' : 'Excluir Venda'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedSaleToDelete?.is_draft ? (
                <>
                  Tem certeza que deseja excluir o rascunho <strong>#{selectedSaleToDelete?.numero}</strong>?
                  <br />
                  <br />
                  Esta ação <strong>não pode ser desfeita</strong> e irá remover permanentemente todos os dados relacionados.
                </>
              ) : (
                <>
                  Tem certeza que deseja excluir a venda <strong>#{selectedSaleToDelete?.numero}</strong>?
                  <br />
                  <br />
                  Esta ação <strong>não pode ser desfeita</strong> e irá:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Reverter o estoque dos produtos vendidos</li>
                    <li>Cancelar contas a receber relacionadas</li>
                    <li>Remover permanentemente todos os dados da venda</li>
                  </ul>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!selectedSaleToDelete?.is_draft && (
            <div className="space-y-2">
              <Label htmlFor="delete-motivo">Motivo da Exclusão *</Label>
              <Textarea
                id="delete-motivo"
                placeholder="Informe o motivo da exclusão desta venda..."
                value={deleteMotivo}
                onChange={(e) => setDeleteMotivo(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} onClick={(e) => {
              if (!isDeleting) {
                setDeleteDialogOpen(false);
                setSelectedSaleToDelete(null);
                setDeleteMotivo('');
              }
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleConfirmDelete(e);
              }}
              disabled={isDeleting || (!selectedSaleToDelete?.is_draft && !deleteMotivo.trim())}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Cancelamento */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Venda</AlertDialogTitle>
            <AlertDialogDescription>
              {canCancelDirectly ? (
                <>
                  Você tem permissão para cancelar vendas diretamente. Esta ação não pode ser desfeita.
                  <br />
                  <strong>Venda #{selectedSale?.numero}</strong>
                </>
              ) : (
                <>
                  Você não tem permissão para cancelar vendas diretamente. Uma solicitação será enviada para aprovação do administrador.
                  <br />
                  <strong>Venda #{selectedSale?.numero}</strong>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="cancel-motivo">Motivo do Cancelamento *</Label>
              <Textarea
                id="cancel-motivo"
                placeholder="Descreva o motivo do cancelamento..."
                value={cancelMotivo}
                onChange={(e) => setCancelMotivo(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCanceling}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={isCanceling || !cancelMotivo.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCanceling ? (
                'Processando...'
              ) : canCancelDirectly ? (
                'Confirmar Cancelamento'
              ) : (
                'Enviar Solicitação'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ModernLayout>
  );
}

