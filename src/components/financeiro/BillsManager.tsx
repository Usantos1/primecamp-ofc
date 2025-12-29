import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Check, Search, Filter } from 'lucide-react';
import { useBillsToPay, useFinancialCategories } from '@/hooks/useFinanceiro';
import { BillToPayFormData, BILL_STATUS_LABELS, EXPENSE_TYPE_LABELS, PAYMENT_METHOD_LABELS, PaymentMethod } from '@/types/financial';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingButton } from '@/components/LoadingButton';
import { cn } from '@/lib/utils';

interface BillsManagerProps {
  month?: string;
  startDate?: string;
  endDate?: string;
}

export function BillsManager({ month, startDate, endDate }: BillsManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payingBillId, setPayingBillId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBillId, setDeletingBillId] = useState<string | null>(null);

  const { data: categories = [] } = useFinancialCategories();
  const { bills, isLoading, createBill, updateBill, payBill, deleteBill } = useBillsToPay({
    month,
    startDate,
    endDate,
    status: statusFilter !== 'all' ? statusFilter as any : undefined,
    expense_type: typeFilter !== 'all' ? typeFilter as any : undefined,
  });

  const [formData, setFormData] = useState<BillToPayFormData & { recurring_start?: string; recurring_end?: string }>({
    description: '',
    amount: 0,
    category_id: '',
    expense_type: 'variavel',
    due_date: new Date().toISOString().split('T')[0],
    supplier: '',
    notes: '',
    recurring: false,
    recurring_start: '2025-01',
    recurring_end: new Date().toISOString().slice(0, 7),
  });

  const filteredBills = bills.filter(bill =>
    bill.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenDialog = (bill?: any) => {
    if (bill) {
      setEditingBill(bill);
      setFormData({
        description: bill.description,
        amount: bill.amount,
        category_id: bill.category_id || '',
        expense_type: bill.expense_type,
        due_date: bill.due_date,
        supplier: bill.supplier || '',
        notes: bill.notes || '',
        recurring: bill.recurring,
        recurring_day: bill.recurring_day,
        recurring_start: '2025-01',
        recurring_end: new Date().toISOString().slice(0, 7),
      });
    } else {
      setEditingBill(null);
      setFormData({
        description: '',
        amount: 0,
        category_id: '',
        expense_type: 'variavel',
        due_date: new Date().toISOString().split('T')[0],
        supplier: '',
        notes: '',
        recurring: false,
        recurring_start: '2025-01',
        recurring_end: new Date().toISOString().slice(0, 7),
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingBill) {
      await updateBill.mutateAsync({ id: editingBill.id, data: formData });
    } else {
      await createBill.mutateAsync(formData);
    }
    setIsDialogOpen(false);
  };

  const handlePayBill = async () => {
    if (payingBillId) {
      await payBill.mutateAsync({ id: payingBillId, payment_method: paymentMethod });
      setPayDialogOpen(false);
      setPayingBillId(null);
    }
  };

  const handleDeleteBill = async () => {
    if (deletingBillId) {
      await deleteBill.mutateAsync(deletingBillId);
      setDeleteDialogOpen(false);
      setDeletingBillId(null);
    }
  };

  const getStatusColor = (status: string, dueDate: string) => {
    if (status === 'pago') return 'bg-success/10 text-success border-success/30';
    if (status === 'cancelado') return 'bg-muted text-muted-foreground border-muted';
    if (new Date(dueDate) < new Date()) return 'bg-destructive/10 text-destructive border-destructive/30';
    return 'bg-warning/10 text-warning border-warning/30';
  };

  const expenseCategories = categories.filter(c => c.type === 'saida');

  if (isLoading) {
    return <LoadingSkeleton type="table" count={5} />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Contas a Pagar</CardTitle>
            <CardDescription>Gerencie suas despesas fixas e variáveis</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Conta
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="atrasado">Atrasado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="fixa">Fixa</SelectItem>
              <SelectItem value="variavel">Variável</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        {filteredBills.length === 0 ? (
          <EmptyState
            variant="no-data"
            title="Nenhuma conta encontrada"
            description="Cadastre suas contas a pagar para controlar seus vencimentos."
            action={{ label: 'Nova Conta', onClick: () => handleOpenDialog() }}
          />
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium">{bill.description}</TableCell>
                    <TableCell className="text-muted-foreground">{bill.supplier || '-'}</TableCell>
                    <TableCell className="font-semibold">{currencyFormatters.brl(bill.amount)}</TableCell>
                    <TableCell>{dateFormatters.short(bill.due_date)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{EXPENSE_TYPE_LABELS[bill.expense_type]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(bill.status, bill.due_date)}>
                        {BILL_STATUS_LABELS[bill.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {bill.status === 'pendente' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-success"
                            onClick={() => {
                              setPayingBillId(bill.id);
                              setPayDialogOpen(true);
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenDialog(bill)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => {
                            setDeletingBillId(bill.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Dialog de criação/edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBill ? 'Editar Conta' : 'Nova Conta a Pagar'}</DialogTitle>
            <DialogDescription>
              {editingBill ? 'Atualize os dados da conta' : 'Cadastre uma nova despesa'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Conta de luz"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Vencimento *</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={formData.category_id || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={expenseCategories.length === 0 ? "Nenhuma categoria disponível" : "Selecione"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {expenseCategories.length === 0 ? (
                      <SelectItem value="loading" disabled>Carregando categorias...</SelectItem>
                    ) : (
                      expenseCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {expenseCategories.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Categorias serão carregadas automaticamente após aplicar as migrations do banco de dados.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Tipo de Despesa</Label>
                <Select
                  value={formData.expense_type}
                  onValueChange={(value: any) => setFormData({ ...formData, expense_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixa">Fixa</SelectItem>
                    <SelectItem value="variavel">Variável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Input
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Nome do fornecedor"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={formData.recurring}
                  onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                />
                <Label htmlFor="recurring" className="cursor-pointer font-medium">
                  Conta recorrente (criar múltiplas)
                </Label>
              </div>
              {formData.recurring && (
                <div className="space-y-3 pl-2 border-l-2 border-primary/20">
                  <div>
                    <Label>Dia do mês para recorrência *</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.recurring_day || ''}
                      onChange={(e) => setFormData({ ...formData, recurring_day: parseInt(e.target.value) || undefined })}
                      placeholder="Ex: 28 (dia 28 de cada mês)"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Mês Inicial *</Label>
                      <Input
                        type="month"
                        value={formData.recurring_start || ''}
                        onChange={(e) => setFormData({ ...formData, recurring_start: e.target.value })}
                        placeholder="2025-01"
                      />
                    </div>
                    <div>
                      <Label>Mês Final *</Label>
                      <Input
                        type="month"
                        value={formData.recurring_end || ''}
                        onChange={(e) => setFormData({ ...formData, recurring_end: e.target.value })}
                        placeholder="2025-12"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Serão criadas contas para cada mês entre o período selecionado
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionais..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <LoadingButton
              onClick={handleSubmit}
              loading={createBill.isPending || updateBill.isPending}
            >
              {editingBill ? 'Atualizar' : 'Cadastrar'}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de pagamento */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
            <DialogDescription>
              Selecione a forma de pagamento utilizada
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Select value={paymentMethod} onValueChange={(v: PaymentMethod) => setPaymentMethod(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>
              Cancelar
            </Button>
            <LoadingButton
              onClick={handlePayBill}
              loading={payBill.isPending}
              className="bg-success hover:bg-success/90"
            >
              Confirmar Pagamento
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de exclusão */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir Conta"
        description="Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita."
        onConfirm={handleDeleteBill}
        variant="danger"
      />
    </Card>
  );
}


