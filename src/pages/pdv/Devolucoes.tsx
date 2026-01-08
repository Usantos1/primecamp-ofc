import { useState, useEffect } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  ReceiptText, Search, QrCode, Printer, Copy, CheckCircle, 
  XCircle, Clock, RefreshCw, Eye, Ban
} from 'lucide-react';
import { useRefunds, Refund, Voucher } from '@/hooks/useRefunds';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Devolucoes() {
  const { 
    loading, 
    refunds, 
    vouchers, 
    fetchRefunds, 
    fetchVouchers, 
    checkVoucher
  } = useRefunds();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
  const [validationCode, setValidationCode] = useState('');

  useEffect(() => {
    fetchRefunds();
    fetchVouchers();
  }, []);

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
    </ModernLayout>
  );
}

