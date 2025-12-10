import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Edit, Trash2, Check, Search, Calendar,
  TrendingDown, TrendingUp, ArrowDownCircle, ArrowUpCircle, AlertTriangle
} from 'lucide-react';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingButton } from '@/components/LoadingButton';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface BillsManagerProps {
  month?: string;
}

type BillType = 'pagar' | 'receber';
type ExpenseType = 'fixa' | 'variavel';
type BillStatus = 'pendente' | 'pago' | 'recebido' | 'atrasado' | 'cancelado';

interface Bill {
  id: string;
  type: BillType;
  description: string;
  amount: number;
  expense_type: ExpenseType;
  due_date: string;
  due_day?: number;
  supplier?: string;
  customer?: string;
  notes?: string;
  status: BillStatus;
  payment_date?: string;
  created_at: string;
}

const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  fixa: 'Fixa',
  variavel: 'Variável',
};

const BILL_STATUS_LABELS: Record<BillStatus, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  recebido: 'Recebido',
  atrasado: 'Atrasado',
  cancelado: 'Cancelado',
};

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const loadBills = (): Bill[] => {
  try {
    const stored = localStorage.getItem('financial_bills');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveBills = (bills: Bill[]) => {
  localStorage.setItem('financial_bills', JSON.stringify(bills));
};

export function BillsManager({ month }: BillsManagerProps) {
  const [activeTab, setActiveTab] = useState<string>('pagar');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payingBillId, setPayingBillId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBillId, setDeletingBillId] = useState<string | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    type: 'pagar' as BillType,
    description: '',
    amount: 0,
    expense_type: 'variavel' as ExpenseType,
    due_date: new Date().toISOString().split('T')[0],
    due_day: 1,
    supplier: '',
    customer: '',
    notes: '',
  });

  useEffect(() => {
    setBills(loadBills());
  }, []);

  const filteredBills = useMemo(() => {
    const billType = activeTab === 'planejamento' ? 'pagar' : activeTab;
    let filtered = bills.filter(bill => bill.type === billType);

    if (month && activeTab !== 'planejamento') {
      filtered = filtered.filter(bill => bill.due_date.startsWith(month));
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(bill =>
        bill.description.toLowerCase().includes(search) ||
        bill.supplier?.toLowerCase().includes(search) ||
        bill.customer?.toLowerCase().includes(search)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(bill => bill.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(bill => bill.expense_type === typeFilter);
    }

    filtered = filtered.map(bill => {
      if (bill.status === 'pendente' && new Date(bill.due_date) < new Date()) {
        return { ...bill, status: 'atrasado' as BillStatus };
      }
      return bill;
    });

    return filtered.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [bills, activeTab, month, searchTerm, statusFilter, typeFilter]);

  const fixedExpenses = useMemo(() => {
    return bills.filter(b => b.type === 'pagar' && b.expense_type === 'fixa');
  }, [bills]);

  const monthlyTotals = useMemo(() => {
    const totals: number[] = Array(12).fill(0);
    fixedExpenses.forEach(expense => {
      totals.forEach((_, index) => {
        totals[index] += expense.amount;
      });
    });
    return totals;
  }, [fixedExpenses]);

  const totals = useMemo(() => {
    const contasPagar = bills.filter(b => b.type === 'pagar');
    const contasReceber = bills.filter(b => b.type === 'receber');

    return {
      totalPagar: contasPagar.filter(b => b.status === 'pendente' || b.status === 'atrasado').reduce((sum, b) => sum + b.amount, 0),
      totalReceber: contasReceber.filter(b => b.status === 'pendente').reduce((sum, b) => sum + b.amount, 0),
      pagarPendentes: contasPagar.filter(b => b.status === 'pendente').length,
      pagarAtrasadas: contasPagar.filter(b => b.status === 'atrasado' || (b.status === 'pendente' && new Date(b.due_date) < new Date())).length,
      receberPendentes: contasReceber.filter(b => b.status === 'pendente').length,
      totalFixasMensal: fixedExpenses.reduce((sum, b) => sum + b.amount, 0),
      totalFixasAnual: fixedExpenses.reduce((sum, b) => sum + b.amount, 0) * 12,
    };
  }, [bills, fixedExpenses]);

  const handleOpenDialog = (bill?: Bill, forFixed: boolean = false) => {
    if (bill) {
      setEditingBill(bill);
      setFormData({
        type: bill.type,
        description: bill.description,
        amount: bill.amount,
        expense_type: bill.expense_type,
        due_date: bill.due_date,
        due_day: bill.due_day || parseInt(bill.due_date.split('-')[2]) || 1,
        supplier: bill.supplier || '',
        customer: bill.customer || '',
        notes: bill.notes || '',
      });
    } else {
      setEditingBill(null);
      const isFixed = forFixed || activeTab === 'planejamento';
      setFormData({
        type: activeTab === 'receber' ? 'receber' : 'pagar',
        description: '',
        amount: 0,
        expense_type: isFixed ? 'fixa' : 'variavel',
        due_date: new Date().toISOString().split('T')[0],
        due_day: 1,
        supplier: '',
        customer: '',
        notes: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.description.trim()) {
      toast({ title: 'Descrição obrigatória', variant: 'destructive' });
      return;
    }
    if (formData.amount <= 0) {
      toast({ title: 'Valor deve ser maior que zero', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    
    try {
      if (editingBill) {
        const updated = bills.map(b => b.id === editingBill.id ? { ...b, ...formData } : b);
        setBills(updated);
        saveBills(updated);
        toast({ title: 'Conta atualizada!' });
      } else {
        const newBill: Bill = {
          id: crypto.randomUUID(),
          ...formData,
          status: 'pendente',
          created_at: new Date().toISOString(),
        };
        const updated = [...bills, newBill];
        setBills(updated);
        saveBills(updated);
        toast({ title: 'Conta cadastrada!' });
      }
      setIsDialogOpen(false);
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePay = async () => {
    if (!payingBillId) return;
    const bill = bills.find(b => b.id === payingBillId);
    const updated = bills.map(b => 
      b.id === payingBillId 
        ? { ...b, status: (b.type === 'pagar' ? 'pago' : 'recebido') as BillStatus, payment_date: new Date().toISOString().split('T')[0] }
        : b
    );
    setBills(updated);
    saveBills(updated);
    toast({ title: bill?.type === 'pagar' ? 'Conta paga!' : 'Valor recebido!' });
    setPayDialogOpen(false);
    setPayingBillId(null);
  };

  const handleDelete = async () => {
    if (!deletingBillId) return;
    const updated = bills.filter(b => b.id !== deletingBillId);
    setBills(updated);
    saveBills(updated);
    toast({ title: 'Conta excluída!' });
    setDeleteDialogOpen(false);
    setDeletingBillId(null);
  };

  const getStatusColor = (status: BillStatus) => {
    switch (status) {
      case 'pago':
      case 'recebido':
        return 'bg-success/10 text-success border-success/30';
      case 'cancelado':
        return 'bg-muted text-muted-foreground';
      case 'atrasado':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      default:
        return 'bg-warning/10 text-warning border-warning/30';
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-destructive text-sm mb-1">
              <ArrowDownCircle className="h-4 w-4" />A Pagar
            </div>
            <p className="text-2xl font-bold text-destructive">{currencyFormatters.brl(totals.totalPagar)}</p>
            <p className="text-xs text-muted-foreground">{totals.pagarPendentes} pendentes</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-success">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-success text-sm mb-1">
              <ArrowUpCircle className="h-4 w-4" />A Receber
            </div>
            <p className="text-2xl font-bold text-success">{currencyFormatters.brl(totals.totalReceber)}</p>
            <p className="text-xs text-muted-foreground">{totals.receberPendentes} pendentes</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-primary text-sm mb-1">
              <Calendar className="h-4 w-4" />Fixas/Mês
            </div>
            <p className="text-2xl font-bold text-primary">{currencyFormatters.brl(totals.totalFixasMensal)}</p>
            <p className="text-xs text-muted-foreground">{fixedExpenses.length} despesas</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-warning text-sm mb-1">
              <TrendingDown className="h-4 w-4" />Fixas/Ano
            </div>
            <p className="text-2xl font-bold text-warning">{currencyFormatters.brl(totals.totalFixasAnual)}</p>
            <p className="text-xs text-muted-foreground">projeção {selectedYear}</p>
          </CardContent>
        </Card>

        {totals.pagarAtrasadas > 0 && (
          <Card className="border-l-4 border-l-destructive bg-destructive/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-destructive text-sm mb-1">
                <AlertTriangle className="h-4 w-4" />Atrasadas
              </div>
              <p className="text-2xl font-bold text-destructive">{totals.pagarAtrasadas}</p>
              <p className="text-xs text-muted-foreground">em atraso</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <TabsList>
                <TabsTrigger value="pagar" className="gap-2">
                  <TrendingDown className="h-4 w-4" />A Pagar
                </TabsTrigger>
                <TabsTrigger value="receber" className="gap-2">
                  <TrendingUp className="h-4 w-4" />A Receber
                </TabsTrigger>
                <TabsTrigger value="planejamento" className="gap-2">
                  <Calendar className="h-4 w-4" />Planejamento Anual
                </TabsTrigger>
              </TabsList>
              
              <Button onClick={() => handleOpenDialog(undefined, activeTab === 'planejamento')} className="gap-2">
                <Plus className="h-4 w-4" />
                {activeTab === 'planejamento' ? 'Nova Despesa Fixa' : activeTab === 'pagar' ? 'Nova Conta a Pagar' : 'Nova Conta a Receber'}
              </Button>
            </div>

            {activeTab !== 'planejamento' && (
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value={activeTab === 'pagar' ? 'pago' : 'recebido'}>{activeTab === 'pagar' ? 'Pago' : 'Recebido'}</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
                {activeTab === 'pagar' && (
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="fixa">Fixa</SelectItem>
                      <SelectItem value="variavel">Variável</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {activeTab === 'planejamento' && (
              <div className="flex items-center gap-3 mb-4">
                <Label>Ano:</Label>
                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                  <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <TabsContent value="pagar" className="mt-0">
              <BillsTable bills={filteredBills} type="pagar" onEdit={handleOpenDialog} onPay={(id) => { setPayingBillId(id); setPayDialogOpen(true); }} onDelete={(id) => { setDeletingBillId(id); setDeleteDialogOpen(true); }} getStatusColor={getStatusColor} />
            </TabsContent>

            <TabsContent value="receber" className="mt-0">
              <BillsTable bills={filteredBills} type="receber" onEdit={handleOpenDialog} onPay={(id) => { setPayingBillId(id); setPayDialogOpen(true); }} onDelete={(id) => { setDeletingBillId(id); setDeleteDialogOpen(true); }} getStatusColor={getStatusColor} />
            </TabsContent>

            <TabsContent value="planejamento" className="mt-0">
              <AnnualPlanningTable expenses={fixedExpenses} year={selectedYear} monthlyTotals={monthlyTotals} onEdit={handleOpenDialog} onDelete={(id) => { setDeletingBillId(id); setDeleteDialogOpen(true); }} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBill ? 'Editar Conta' : formData.expense_type === 'fixa' ? 'Nova Despesa Fixa' : formData.type === 'pagar' ? 'Nova Conta a Pagar' : 'Nova Conta a Receber'}</DialogTitle>
            <DialogDescription>{editingBill ? 'Atualize os dados' : 'Cadastre uma nova conta'}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Ex: Aluguel, Internet..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input type="number" step="0.01" value={formData.amount || ''} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} />
              </div>
              {formData.expense_type === 'fixa' ? (
                <div className="space-y-2">
                  <Label>Dia Vencimento</Label>
                  <Select value={formData.due_day?.toString() || '1'} onValueChange={(v) => setFormData({ ...formData, due_day: parseInt(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                        <SelectItem key={day} value={day.toString()}>Dia {day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Vencimento *</Label>
                  <Input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
                </div>
              )}
            </div>

            {formData.type === 'pagar' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={formData.expense_type} onValueChange={(v: ExpenseType) => setFormData({ ...formData, expense_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixa">Fixa (Mensal)</SelectItem>
                      <SelectItem value="variavel">Variável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fornecedor</Label>
                  <Input value={formData.supplier} onChange={(e) => setFormData({ ...formData, supplier: e.target.value })} />
                </div>
              </div>
            )}

            {formData.type === 'receber' && (
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input value={formData.customer} onChange={(e) => setFormData({ ...formData, customer: e.target.value })} />
              </div>
            )}

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <LoadingButton onClick={handleSubmit} loading={isLoading}>{editingBill ? 'Atualizar' : 'Cadastrar'}</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar</DialogTitle>
            <DialogDescription>Marcar como {activeTab === 'receber' ? 'recebido' : 'pago'}?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handlePay} className="bg-success hover:bg-success/90">Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} title="Excluir" description="Confirma exclusão?" onConfirm={handleDelete} variant="danger" />
    </div>
  );
}

interface BillsTableProps {
  bills: Bill[];
  type: BillType;
  onEdit: (bill: Bill) => void;
  onPay: (id: string) => void;
  onDelete: (id: string) => void;
  getStatusColor: (status: BillStatus) => string;
}

function BillsTable({ bills, type, onEdit, onPay, onDelete, getStatusColor }: BillsTableProps) {
  if (bills.length === 0) {
    return <EmptyState variant="no-data" title={type === 'pagar' ? 'Nenhuma conta a pagar' : 'Nenhuma conta a receber'} description="Cadastre suas contas para começar." />;
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descrição</TableHead>
            <TableHead>{type === 'pagar' ? 'Fornecedor' : 'Cliente'}</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Vencimento</TableHead>
            {type === 'pagar' && <TableHead>Tipo</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bills.map((bill) => (
            <TableRow key={bill.id}>
              <TableCell className="font-medium">{bill.description}</TableCell>
              <TableCell className="text-muted-foreground">{type === 'pagar' ? bill.supplier || '-' : bill.customer || '-'}</TableCell>
              <TableCell className={cn("font-semibold", type === 'pagar' ? 'text-destructive' : 'text-success')}>{currencyFormatters.brl(bill.amount)}</TableCell>
              <TableCell>{dateFormatters.short(bill.due_date)}</TableCell>
              {type === 'pagar' && <TableCell><Badge variant="outline">{EXPENSE_TYPE_LABELS[bill.expense_type]}</Badge></TableCell>}
              <TableCell><Badge className={getStatusColor(bill.status)}>{BILL_STATUS_LABELS[bill.status]}</Badge></TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  {(bill.status === 'pendente' || bill.status === 'atrasado') && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={() => onPay(bill.id)}><Check className="h-4 w-4" /></Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(bill)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(bill.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface AnnualPlanningTableProps {
  expenses: Bill[];
  year: number;
  monthlyTotals: number[];
  onEdit: (bill: Bill) => void;
  onDelete: (id: string) => void;
}

function AnnualPlanningTable({ expenses, year, monthlyTotals, onEdit, onDelete }: AnnualPlanningTableProps) {
  const annualTotal = monthlyTotals.reduce((sum, total) => sum + total, 0);

  if (expenses.length === 0) {
    return <EmptyState variant="no-data" title="Nenhuma despesa fixa" description="Cadastre despesas fixas para o planejamento anual." />;
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background min-w-[180px]">Despesa</TableHead>
              <TableHead className="text-center min-w-[70px]">Dia</TableHead>
              {MONTHS.map((m, i) => <TableHead key={i} className="text-center min-w-[90px]">{m}</TableHead>)}
              <TableHead className="text-center min-w-[100px] bg-muted/50">Total</TableHead>
              <TableHead className="text-right min-w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((exp) => (
              <TableRow key={exp.id}>
                <TableCell className="sticky left-0 bg-background font-medium">
                  <div><p>{exp.description}</p>{exp.supplier && <p className="text-xs text-muted-foreground">{exp.supplier}</p>}</div>
                </TableCell>
                <TableCell className="text-center"><Badge variant="outline">Dia {exp.due_day || '-'}</Badge></TableCell>
                {MONTHS.map((_, i) => <TableCell key={i} className="text-center text-sm">{currencyFormatters.brl(exp.amount)}</TableCell>)}
                <TableCell className="text-center font-bold bg-muted/50 text-primary">{currencyFormatters.brl(exp.amount * 12)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(exp)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(exp.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/30 font-bold">
              <TableCell className="sticky left-0 bg-muted/30">TOTAL</TableCell>
              <TableCell></TableCell>
              {monthlyTotals.map((t, i) => <TableCell key={i} className="text-center text-destructive">{currencyFormatters.brl(t)}</TableCell>)}
              <TableCell className="text-center text-lg text-destructive bg-muted/50">{currencyFormatters.brl(annualTotal)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Média Mensal</p><p className="text-2xl font-bold">{currencyFormatters.brl(annualTotal / 12)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Semestral</p><p className="text-2xl font-bold">{currencyFormatters.brl(annualTotal / 2)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Anual ({year})</p><p className="text-2xl font-bold text-destructive">{currencyFormatters.brl(annualTotal)}</p></CardContent></Card>
      </div>
    </div>
  );
}
