import { useState, useEffect } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePaymentMethods, PaymentMethod, PaymentFee } from '@/hooks/usePaymentMethods';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Plus, Edit, Trash2, Settings, CreditCard, Banknote, QrCode, Ticket,
  Percent, Calendar, DollarSign, TrendingUp, BarChart3, Loader2, Save
} from 'lucide-react';

const ICONS = [
  { value: 'Banknote', label: 'Dinheiro', icon: Banknote },
  { value: 'QrCode', label: 'QR Code / PIX', icon: QrCode },
  { value: 'CreditCard', label: 'Cartão', icon: CreditCard },
  { value: 'Ticket', label: 'Vale/Voucher', icon: Ticket },
];

const COLORS = [
  { value: '#22c55e', label: 'Verde' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#f59e0b', label: 'Laranja' },
  { value: '#6b7280', label: 'Cinza' },
];

export default function PaymentMethodsConfig() {
  const {
    loading,
    paymentMethods,
    fetchPaymentMethods,
    fetchPaymentMethod,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    saveFeesBulk,
    fetchFeesReport
  } = usePaymentMethods();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isMethodDialogOpen, setIsMethodDialogOpen] = useState(false);
  const [isFeesDialogOpen, setIsFeesDialogOpen] = useState(false);
  const [editingFees, setEditingFees] = useState<PaymentFee[]>([]);
  const [report, setReport] = useState<any>(null);
  const [reportPeriod, setReportPeriod] = useState({
    startDate: format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });

  const [methodForm, setMethodForm] = useState({
    id: '',
    name: '',
    code: '',
    description: '',
    is_active: true,
    accepts_installments: false,
    max_installments: 1,
    min_value_for_installments: 0,
    icon: 'CreditCard',
    color: '#3b82f6',
    sort_order: 0
  });

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const handleOpenMethodDialog = (method?: PaymentMethod) => {
    if (method) {
      setMethodForm({
        id: method.id,
        name: method.name,
        code: method.code,
        description: method.description || '',
        is_active: method.is_active,
        accepts_installments: method.accepts_installments,
        max_installments: method.max_installments,
        min_value_for_installments: method.min_value_for_installments,
        icon: method.icon || 'CreditCard',
        color: method.color || '#3b82f6',
        sort_order: method.sort_order
      });
    } else {
      setMethodForm({
        id: '',
        name: '',
        code: '',
        description: '',
        is_active: true,
        accepts_installments: false,
        max_installments: 1,
        min_value_for_installments: 0,
        icon: 'CreditCard',
        color: '#3b82f6',
        sort_order: paymentMethods.length
      });
    }
    setIsMethodDialogOpen(true);
  };

  const handleSaveMethod = async () => {
    if (methodForm.id) {
      await updatePaymentMethod(methodForm.id, methodForm);
    } else {
      await createPaymentMethod(methodForm);
    }
    setIsMethodDialogOpen(false);
    fetchPaymentMethods();
  };

  const handleDeleteMethod = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta forma de pagamento?')) {
      await deletePaymentMethod(id);
      fetchPaymentMethods();
    }
  };

  const handleOpenFeesDialog = async (method: PaymentMethod) => {
    setSelectedMethod(method);
    const fullMethod = await fetchPaymentMethod(method.id);
    if (fullMethod) {
      // Gerar array de taxas para todas as parcelas
      const fees: PaymentFee[] = [];
      for (let i = 1; i <= (method.accepts_installments ? method.max_installments : 1); i++) {
        const existingFee = fullMethod.fees?.find((f: PaymentFee) => f.installments === i);
        fees.push({
          id: existingFee?.id || '',
          payment_method_id: method.id,
          installments: i,
          fee_percentage: existingFee?.fee_percentage || 0,
          fee_fixed: existingFee?.fee_fixed || 0,
          days_to_receive: existingFee?.days_to_receive || 0,
          description: existingFee?.description || (i === 1 ? 'À vista' : `${i}x`),
          is_active: existingFee?.is_active !== false
        });
      }
      setEditingFees(fees);
    }
    setIsFeesDialogOpen(true);
  };

  const handleSaveFees = async () => {
    if (selectedMethod) {
      await saveFeesBulk(selectedMethod.id, editingFees);
      setIsFeesDialogOpen(false);
    }
  };

  const handleUpdateFee = (index: number, field: keyof PaymentFee, value: any) => {
    const newFees = [...editingFees];
    newFees[index] = { ...newFees[index], [field]: value };
    setEditingFees(newFees);
  };

  const handleLoadReport = async () => {
    const data = await fetchFeesReport(reportPeriod.startDate, reportPeriod.endDate);
    setReport(data);
  };

  const getIconComponent = (iconName: string) => {
    const iconObj = ICONS.find(i => i.value === iconName);
    if (iconObj) {
      const Icon = iconObj.icon;
      return <Icon className="h-5 w-5" />;
    }
    return <CreditCard className="h-5 w-5" />;
  };

  return (
    <ModernLayout
      title="Formas de Pagamento"
      subtitle="Configure formas de pagamento, taxas e parcelamentos"
    >
      <div className="space-y-6 overflow-auto max-h-[calc(100vh-200px)] pb-8">
        <Tabs defaultValue="methods" className="w-full">
          <TabsList>
            <TabsTrigger value="methods">
              <CreditCard className="h-4 w-4 mr-2" />
              Formas de Pagamento
            </TabsTrigger>
            <TabsTrigger value="report">
              <BarChart3 className="h-4 w-4 mr-2" />
              Relatório de Taxas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="methods" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Meios de Pagamento Cadastrados</h2>
              <Button onClick={() => handleOpenMethodDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Forma de Pagamento
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paymentMethods.map((method) => (
                <Card key={method.id} className={!method.is_active ? 'opacity-60' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2 rounded-lg" 
                          style={{ backgroundColor: method.color + '20', color: method.color }}
                        >
                          {getIconComponent(method.icon || 'CreditCard')}
                        </div>
                        <div>
                          <CardTitle className="text-base">{method.name}</CardTitle>
                          <CardDescription className="text-xs">{method.code}</CardDescription>
                        </div>
                      </div>
                      <Badge variant={method.is_active ? 'default' : 'secondary'}>
                        {method.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-sm text-muted-foreground mb-3">
                      {method.accepts_installments ? (
                        <span>Até {method.max_installments}x</span>
                      ) : (
                        <span>Somente à vista</span>
                      )}
                      {method.fees_count ? (
                        <span className="ml-2">• {method.fees_count} taxas configuradas</span>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleOpenFeesDialog(method)}
                      >
                        <Percent className="h-3 w-3 mr-1" />
                        Taxas
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenMethodDialog(method)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDeleteMethod(method.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="report" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Relatório de Taxas por Período
                </CardTitle>
                <CardDescription>
                  Visualize o valor bruto, taxas pagas e valor líquido recebido
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Data Início</Label>
                    <Input
                      type="date"
                      value={reportPeriod.startDate}
                      onChange={(e) => setReportPeriod(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Fim</Label>
                    <Input
                      type="date"
                      value={reportPeriod.endDate}
                      onChange={(e) => setReportPeriod(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                  <Button onClick={handleLoadReport} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BarChart3 className="h-4 w-4 mr-2" />}
                    Gerar Relatório
                  </Button>
                </div>

                {report && (
                  <>
                    <div className="grid grid-cols-4 gap-4 mt-6">
                      <Card className="bg-muted/50">
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold">{report.totals?.total_transactions || 0}</div>
                          <div className="text-sm text-muted-foreground">Transações</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-green-50 dark:bg-green-900/20">
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold text-green-600">
                            R$ {(report.totals?.gross_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-sm text-muted-foreground">Valor Bruto</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-red-50 dark:bg-red-900/20">
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold text-red-600">
                            R$ {(report.totals?.total_fees || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-sm text-muted-foreground">Total Taxas</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-blue-50 dark:bg-blue-900/20">
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold text-blue-600">
                            R$ {(report.totals?.net_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-sm text-muted-foreground">Valor Líquido</div>
                        </CardContent>
                      </Card>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Forma de Pagamento</TableHead>
                          <TableHead>Parcelas</TableHead>
                          <TableHead className="text-right">Transações</TableHead>
                          <TableHead className="text-right">Valor Bruto</TableHead>
                          <TableHead className="text-right">Taxas</TableHead>
                          <TableHead className="text-right">Valor Líquido</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.by_method?.map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.payment_method || 'Outros'}</TableCell>
                            <TableCell>{item.installments}x</TableCell>
                            <TableCell className="text-right">{item.total_transactions}</TableCell>
                            <TableCell className="text-right">
                              R$ {parseFloat(item.gross_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              R$ {parseFloat(item.total_fees || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              R$ {parseFloat(item.net_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog de Forma de Pagamento */}
        <Dialog open={isMethodDialogOpen} onOpenChange={setIsMethodDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{methodForm.id ? 'Editar' : 'Nova'} Forma de Pagamento</DialogTitle>
              <DialogDescription>
                Configure os detalhes da forma de pagamento
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={methodForm.name}
                    onChange={(e) => setMethodForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Cartão de Crédito"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input
                    value={methodForm.code}
                    onChange={(e) => setMethodForm(prev => ({ ...prev, code: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                    placeholder="Ex: credito"
                    disabled={!!methodForm.id}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={methodForm.description}
                  onChange={(e) => setMethodForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição opcional"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ícone</Label>
                  <Select
                    value={methodForm.icon}
                    onValueChange={(value) => setMethodForm(prev => ({ ...prev, icon: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICONS.map((icon) => (
                        <SelectItem key={icon.value} value={icon.value}>
                          <div className="flex items-center gap-2">
                            <icon.icon className="h-4 w-4" />
                            {icon.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Select
                    value={methodForm.color}
                    onValueChange={(value) => setMethodForm(prev => ({ ...prev, color: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLORS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: color.value }} />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Aceita Parcelamento</Label>
                <Switch
                  checked={methodForm.accepts_installments}
                  onCheckedChange={(checked) => setMethodForm(prev => ({ ...prev, accepts_installments: checked }))}
                />
              </div>

              {methodForm.accepts_installments && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Máximo de Parcelas</Label>
                    <Input
                      type="number"
                      min={1}
                      max={24}
                      value={methodForm.max_installments}
                      onChange={(e) => setMethodForm(prev => ({ ...prev, max_installments: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Mínimo p/ Parcelar</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={methodForm.min_value_for_installments}
                      onChange={(e) => setMethodForm(prev => ({ ...prev, min_value_for_installments: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label>Ativo</Label>
                <Switch
                  checked={methodForm.is_active}
                  onCheckedChange={(checked) => setMethodForm(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMethodDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveMethod} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Taxas */}
        <Dialog open={isFeesDialogOpen} onOpenChange={setIsFeesDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configurar Taxas - {selectedMethod?.name}</DialogTitle>
              <DialogDescription>
                Configure as taxas para cada número de parcelas
              </DialogDescription>
            </DialogHeader>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Parcelas</TableHead>
                  <TableHead>Taxa (%)</TableHead>
                  <TableHead>Taxa Fixa (R$)</TableHead>
                  <TableHead>Dias p/ Receber</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-20">Ativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editingFees.map((fee, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{fee.installments}x</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step={0.01}
                        min={0}
                        className="w-24"
                        value={fee.fee_percentage}
                        onChange={(e) => handleUpdateFee(index, 'fee_percentage', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step={0.01}
                        min={0}
                        className="w-24"
                        value={fee.fee_fixed}
                        onChange={(e) => handleUpdateFee(index, 'fee_fixed', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        className="w-20"
                        value={fee.days_to_receive}
                        onChange={(e) => handleUpdateFee(index, 'days_to_receive', parseInt(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={fee.description || ''}
                        onChange={(e) => handleUpdateFee(index, 'description', e.target.value)}
                        placeholder={fee.installments === 1 ? 'À vista' : `${fee.installments}x`}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={fee.is_active}
                        onCheckedChange={(checked) => handleUpdateFee(index, 'is_active', checked)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFeesDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveFees} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Taxas
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModernLayout>
  );
}

