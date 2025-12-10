import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, Eye, CheckCircle, Wallet, CreditCard, Smartphone, Banknote, 
  ArrowUpCircle, ArrowDownCircle, RefreshCw, Trash2, Edit, Clock
} from 'lucide-react';
import { useCashClosings } from '@/hooks/useFinanceiro';
import { CashClosingFormData } from '@/types/financial';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { LoadingButton } from '@/components/LoadingButton';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface CashClosingManagerProps {
  month?: string;
}

type MovementType = 'entrada' | 'retirada' | 'ajuste';

interface CashMovement {
  id: string;
  type: MovementType;
  amount: number;
  description: string;
  date: string;
  time: string;
  created_at: string;
  user_name?: string;
}

const OPENING_AMOUNT = 150.00;

export function CashClosingManager({ month }: CashClosingManagerProps) {
  const [activeTab, setActiveTab] = useState('fechamentos');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [viewingClosing, setViewingClosing] = useState<any>(null);
  const [editingMovement, setEditingMovement] = useState<CashMovement | null>(null);
  const { user, profile, isAdmin } = useAuth();
  const { toast } = useToast();

  const { cashClosings, isLoading, createCashClosing, verifyCashClosing } = useCashClosings({ month });

  // Estado local para movimentações (quando não há tabela no banco)
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [movementForm, setMovementForm] = useState<{
    type: MovementType;
    amount: number;
    description: string;
    date: string;
    time: string;
  }>({
    type: 'entrada',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  });

  const [formData, setFormData] = useState<CashClosingFormData>({
    closing_date: new Date().toISOString().split('T')[0],
    cash_sales: 0,
    pix_sales: 0,
    credit_card_sales: 0,
    debit_card_sales: 0,
    other_sales: 0,
    withdrawals: 0,
    supplies: 0,
    actual_cash: 0,
    notes: '',
  });

  // Calcular totais de movimentações do dia
  const todayMovements = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return movements.filter(m => m.date === today);
  }, [movements]);

  const movementsSummary = useMemo(() => {
    const entradas = todayMovements.filter(m => m.type === 'entrada').reduce((sum, m) => sum + m.amount, 0);
    const retiradas = todayMovements.filter(m => m.type === 'retirada').reduce((sum, m) => sum + m.amount, 0);
    const ajustes = todayMovements.filter(m => m.type === 'ajuste').reduce((sum, m) => sum + m.amount, 0);
    const saldoAtual = OPENING_AMOUNT + entradas - retiradas + ajustes;
    return { entradas, retiradas, ajustes, saldoAtual };
  }, [todayMovements]);

  // Calcular valores em tempo real para fechamento
  const totalSales = formData.cash_sales + formData.pix_sales + formData.credit_card_sales + formData.debit_card_sales + formData.other_sales;
  const expectedCash = OPENING_AMOUNT + formData.cash_sales - formData.withdrawals + formData.supplies;
  const difference = formData.actual_cash - expectedCash;

  const handleOpenDialog = () => {
    // Preencher com valores das movimentações do dia
    setFormData({
      closing_date: new Date().toISOString().split('T')[0],
      cash_sales: 0,
      pix_sales: 0,
      credit_card_sales: 0,
      debit_card_sales: 0,
      other_sales: 0,
      withdrawals: movementsSummary.retiradas,
      supplies: movementsSummary.entradas,
      actual_cash: OPENING_AMOUNT,
      notes: '',
    });
    setIsDialogOpen(true);
  };

  const handleOpenMovementDialog = (type?: MovementType, movement?: CashMovement) => {
    if (movement) {
      setEditingMovement(movement);
      setMovementForm({
        type: movement.type,
        amount: movement.amount,
        description: movement.description,
        date: movement.date,
        time: movement.time,
      });
    } else {
      setEditingMovement(null);
      setMovementForm({
        type: type || 'entrada',
        amount: 0,
        description: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      });
    }
    setIsMovementDialogOpen(true);
  };

  const handleSubmit = async () => {
    await createCashClosing.mutateAsync(formData);
    setIsDialogOpen(false);
  };

  const handleVerify = async (id: string) => {
    await verifyCashClosing.mutateAsync(id);
  };

  const handleSaveMovement = () => {
    if (movementForm.amount <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'O valor deve ser maior que zero.',
        variant: 'destructive',
      });
      return;
    }

    if (!movementForm.description.trim()) {
      toast({
        title: 'Descrição obrigatória',
        description: 'Informe uma descrição para a movimentação.',
        variant: 'destructive',
      });
      return;
    }

    if (editingMovement) {
      setMovements(prev => prev.map(m => 
        m.id === editingMovement.id 
          ? { ...m, ...movementForm }
          : m
      ));
      toast({
        title: 'Movimentação atualizada',
        description: 'A movimentação foi atualizada com sucesso.',
      });
    } else {
      const newMovement: CashMovement = {
        id: crypto.randomUUID(),
        ...movementForm,
        created_at: new Date().toISOString(),
        user_name: profile?.display_name || 'Usuário',
      };
      setMovements(prev => [newMovement, ...prev]);
      toast({
        title: 'Movimentação registrada',
        description: `${movementForm.type === 'entrada' ? 'Entrada' : movementForm.type === 'retirada' ? 'Retirada' : 'Ajuste'} de ${currencyFormatters.brl(movementForm.amount)} registrado(a).`,
      });
    }
    setIsMovementDialogOpen(false);
  };

  const handleDeleteMovement = (id: string) => {
    setMovements(prev => prev.filter(m => m.id !== id));
    toast({
      title: 'Movimentação excluída',
      description: 'A movimentação foi excluída com sucesso.',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'conferido':
        return <Badge className="bg-success/10 text-success border-success/30">Conferido</Badge>;
      case 'fechado':
        return <Badge className="bg-warning/10 text-warning border-warning/30">Aguardando Conferência</Badge>;
      default:
        return <Badge variant="outline">Aberto</Badge>;
    }
  };

  const getMovementIcon = (type: MovementType) => {
    switch (type) {
      case 'entrada':
        return <ArrowUpCircle className="h-4 w-4 text-success" />;
      case 'retirada':
        return <ArrowDownCircle className="h-4 w-4 text-destructive" />;
      case 'ajuste':
        return <RefreshCw className="h-4 w-4 text-primary" />;
    }
  };

  const getMovementBadge = (type: MovementType) => {
    switch (type) {
      case 'entrada':
        return <Badge className="bg-success/10 text-success border-success/30">Entrada</Badge>;
      case 'retirada':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/30">Retirada</Badge>;
      case 'ajuste':
        return <Badge className="bg-primary/10 text-primary border-primary/30">Ajuste</Badge>;
    }
  };

  const getDifferenceColor = (diff: number | undefined) => {
    if (diff === undefined || diff === null) return '';
    if (diff === 0) return 'text-success';
    if (diff > 0) return 'text-primary';
    return 'text-destructive';
  };

  if (isLoading) {
    return <LoadingSkeleton type="table" count={5} />;
  }

  return (
    <div className="space-y-4">
      {/* Cards de resumo do dia */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-muted">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Wallet className="h-4 w-4" />
              Abertura
            </div>
            <p className="text-2xl font-bold">{currencyFormatters.brl(OPENING_AMOUNT)}</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-success">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-success text-sm mb-1">
              <ArrowUpCircle className="h-4 w-4" />
              Entradas
            </div>
            <p className="text-2xl font-bold text-success">{currencyFormatters.brl(movementsSummary.entradas)}</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-destructive text-sm mb-1">
              <ArrowDownCircle className="h-4 w-4" />
              Retiradas
            </div>
            <p className="text-2xl font-bold text-destructive">{currencyFormatters.brl(movementsSummary.retiradas)}</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Banknote className="h-4 w-4" />
              Saldo Atual
            </div>
            <p className="text-2xl font-bold text-primary">{currencyFormatters.brl(movementsSummary.saldoAtual)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Controle de Caixa</CardTitle>
              <CardDescription>
                Gerencie entradas, retiradas, ajustes e fechamentos de caixa
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="movimentacoes" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Movimentações
              </TabsTrigger>
              <TabsTrigger value="fechamentos" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Fechamentos
              </TabsTrigger>
            </TabsList>

            {/* Tab Movimentações */}
            <TabsContent value="movimentacoes">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => handleOpenMovementDialog('entrada')} className="gap-2 bg-success hover:bg-success/90">
                    <ArrowUpCircle className="h-4 w-4" />
                    Entrada
                  </Button>
                  <Button onClick={() => handleOpenMovementDialog('retirada')} variant="destructive" className="gap-2">
                    <ArrowDownCircle className="h-4 w-4" />
                    Retirada
                  </Button>
                  <Button onClick={() => handleOpenMovementDialog('ajuste')} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Ajuste
                  </Button>
                </div>

                {movements.length === 0 ? (
                  <EmptyState
                    variant="no-data"
                    title="Nenhuma movimentação"
                    description="Registre entradas, retiradas ou ajustes no caixa."
                    action={{ label: 'Registrar Entrada', onClick: () => handleOpenMovementDialog('entrada') }}
                  />
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Horário</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Responsável</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movements.map((movement) => (
                          <TableRow key={movement.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                {movement.time}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {dateFormatters.short(movement.date)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getMovementIcon(movement.type)}
                                {getMovementBadge(movement.type)}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {movement.description}
                            </TableCell>
                            <TableCell className={cn(
                              "font-semibold",
                              movement.type === 'entrada' ? 'text-success' : 
                              movement.type === 'retirada' ? 'text-destructive' : 'text-primary'
                            )}>
                              {movement.type === 'retirada' ? '-' : '+'}{currencyFormatters.brl(movement.amount)}
                            </TableCell>
                            <TableCell>{movement.user_name}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleOpenMovementDialog(undefined, movement)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => handleDeleteMovement(movement.id)}
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
              </div>
            </TabsContent>

            {/* Tab Fechamentos */}
            <TabsContent value="fechamentos">
              <div className="space-y-4">
                <Button onClick={handleOpenDialog} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Fechar Caixa
                </Button>

                {cashClosings.length === 0 ? (
                  <EmptyState
                    variant="no-data"
                    title="Nenhum fechamento registrado"
                    description="Registre o fechamento de caixa ao final do expediente."
                    action={{ label: 'Fechar Caixa', onClick: handleOpenDialog }}
                  />
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Vendedor(a)</TableHead>
                          <TableHead>Total Vendas</TableHead>
                          <TableHead>Dinheiro Esperado</TableHead>
                          <TableHead>Dinheiro Real</TableHead>
                          <TableHead>Diferença</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cashClosings.map((closing) => (
                          <TableRow key={closing.id}>
                            <TableCell className="font-medium">
                              {dateFormatters.short(closing.closing_date)}
                            </TableCell>
                            <TableCell>{closing.seller_name}</TableCell>
                            <TableCell className="font-semibold text-primary">
                              {currencyFormatters.brl(closing.total_sales)}
                            </TableCell>
                            <TableCell>{currencyFormatters.brl(closing.expected_cash)}</TableCell>
                            <TableCell>{currencyFormatters.brl(closing.actual_cash || 0)}</TableCell>
                            <TableCell className={getDifferenceColor(closing.difference)}>
                              {closing.difference !== undefined && closing.difference !== null
                                ? currencyFormatters.brl(closing.difference)
                                : '-'}
                            </TableCell>
                            <TableCell>{getStatusBadge(closing.status)}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setViewingClosing(closing)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {isAdmin && closing.status === 'fechado' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-success"
                                    onClick={() => handleVerify(closing.id)}
                                  >
                                    <CheckCircle className="h-4 w-4" />
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
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog de movimentação */}
      <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getMovementIcon(movementForm.type)}
              {editingMovement ? 'Editar' : 'Nova'} {
                movementForm.type === 'entrada' ? 'Entrada' :
                movementForm.type === 'retirada' ? 'Retirada' : 'Ajuste'
              }
            </DialogTitle>
            <DialogDescription>
              {movementForm.type === 'entrada' && 'Registre uma entrada de dinheiro no caixa (suprimento, troco, etc.)'}
              {movementForm.type === 'retirada' && 'Registre uma retirada do caixa (sangria, pagamento, etc.)'}
              {movementForm.type === 'ajuste' && 'Ajuste o valor do caixa (diferença encontrada, correção, etc.)'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Movimentação</Label>
              <Select 
                value={movementForm.type} 
                onValueChange={(value: MovementType) => setMovementForm({ ...movementForm, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">
                    <div className="flex items-center gap-2">
                      <ArrowUpCircle className="h-4 w-4 text-success" />
                      Entrada (Suprimento)
                    </div>
                  </SelectItem>
                  <SelectItem value="retirada">
                    <div className="flex items-center gap-2">
                      <ArrowDownCircle className="h-4 w-4 text-destructive" />
                      Retirada (Sangria)
                    </div>
                  </SelectItem>
                  <SelectItem value="ajuste">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-primary" />
                      Ajuste de Caixa
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={movementForm.date}
                  onChange={(e) => setMovementForm({ ...movementForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={movementForm.time}
                  onChange={(e) => setMovementForm({ ...movementForm, time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Valor</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={movementForm.amount || ''}
                onChange={(e) => setMovementForm({ ...movementForm, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0,00"
                className="text-lg font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                value={movementForm.description}
                onChange={(e) => setMovementForm({ ...movementForm, description: e.target.value })}
                placeholder={
                  movementForm.type === 'entrada' ? 'Ex: Suprimento de troco, depósito...' :
                  movementForm.type === 'retirada' ? 'Ex: Sangria para banco, pagamento fornecedor...' :
                  'Ex: Correção de diferença, ajuste de conferência...'
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMovementDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveMovement}
              className={cn(
                movementForm.type === 'entrada' && 'bg-success hover:bg-success/90',
                movementForm.type === 'retirada' && 'bg-destructive hover:bg-destructive/90',
              )}
            >
              {editingMovement ? 'Salvar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de fechamento */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fechamento de Caixa</DialogTitle>
            <DialogDescription>
              Preencha os valores do fechamento do dia. Abertura: {currencyFormatters.brl(OPENING_AMOUNT)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Data */}
            <div className="space-y-2">
              <Label>Data do Fechamento</Label>
              <Input
                type="date"
                value={formData.closing_date}
                onChange={(e) => setFormData({ ...formData, closing_date: e.target.value })}
              />
            </div>

            {/* Vendas por método */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Vendas por Método de Pagamento
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-success" />
                    Dinheiro
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.cash_sales || ''}
                    onChange={(e) => setFormData({ ...formData, cash_sales: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-primary" />
                    PIX
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.pix_sales || ''}
                    onChange={(e) => setFormData({ ...formData, pix_sales: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-warning" />
                    Cartão Crédito
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.credit_card_sales || ''}
                    onChange={(e) => setFormData({ ...formData, credit_card_sales: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-accent" />
                    Cartão Débito
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.debit_card_sales || ''}
                    onChange={(e) => setFormData({ ...formData, debit_card_sales: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Outros</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.other_sales || ''}
                    onChange={(e) => setFormData({ ...formData, other_sales: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            {/* Sangrias e Suprimentos */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-destructive flex items-center gap-2">
                  <ArrowDownCircle className="h-4 w-4" />
                  Sangrias (Retiradas)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.withdrawals || ''}
                  onChange={(e) => setFormData({ ...formData, withdrawals: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Registradas hoje: {currencyFormatters.brl(movementsSummary.retiradas)}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-success flex items-center gap-2">
                  <ArrowUpCircle className="h-4 w-4" />
                  Suprimentos (Entradas)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.supplies || ''}
                  onChange={(e) => setFormData({ ...formData, supplies: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Registradas hoje: {currencyFormatters.brl(movementsSummary.entradas)}
                </p>
              </div>
            </div>

            {/* Conferência de Caixa */}
            <div className="space-y-2">
              <Label className="font-medium">Valor Real em Caixa (Dinheiro Contado)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.actual_cash || ''}
                onChange={(e) => setFormData({ ...formData, actual_cash: parseFloat(e.target.value) || 0 })}
                className="text-lg font-bold"
              />
            </div>

            {/* Resumo */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <h4 className="font-medium mb-3">Resumo</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Total de Vendas:</span>
                <span className="font-semibold text-primary text-right">{currencyFormatters.brl(totalSales)}</span>
                
                <span className="text-muted-foreground">Abertura:</span>
                <span className="text-right">{currencyFormatters.brl(OPENING_AMOUNT)}</span>
                
                <span className="text-muted-foreground">+ Vendas em Dinheiro:</span>
                <span className="text-right">{currencyFormatters.brl(formData.cash_sales)}</span>
                
                <span className="text-muted-foreground">- Sangrias:</span>
                <span className="text-right text-destructive">{currencyFormatters.brl(formData.withdrawals)}</span>
                
                <span className="text-muted-foreground">+ Suprimentos:</span>
                <span className="text-right text-success">{currencyFormatters.brl(formData.supplies)}</span>
                
                <span className="font-medium border-t pt-2">Dinheiro Esperado:</span>
                <span className="font-bold text-right border-t pt-2">{currencyFormatters.brl(expectedCash)}</span>
                
                <span className="font-medium">Dinheiro Real:</span>
                <span className="font-bold text-right">{currencyFormatters.brl(formData.actual_cash)}</span>
                
                <span className="font-medium">Diferença:</span>
                <span className={cn("font-bold text-right", getDifferenceColor(difference))}>
                  {currencyFormatters.brl(difference)}
                  {difference !== 0 && (
                    <span className="ml-1">
                      {difference > 0 ? '(sobra)' : '(falta)'}
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Anotações sobre o fechamento..."
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
              loading={createCashClosing.isPending}
              className="bg-success hover:bg-success/90"
            >
              Fechar Caixa
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de visualização */}
      <Dialog open={!!viewingClosing} onOpenChange={() => setViewingClosing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Fechamento</DialogTitle>
            <DialogDescription>
              {viewingClosing && dateFormatters.long(viewingClosing.closing_date)} - {viewingClosing?.seller_name}
            </DialogDescription>
          </DialogHeader>
          
          {viewingClosing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Vendas</p>
                  <p className="text-xl font-bold text-primary">{currencyFormatters.brl(viewingClosing.total_sales)}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Diferença</p>
                  <p className={cn("text-xl font-bold", getDifferenceColor(viewingClosing.difference))}>
                    {currencyFormatters.brl(viewingClosing.difference || 0)}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dinheiro:</span>
                  <span>{currencyFormatters.brl(viewingClosing.cash_sales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PIX:</span>
                  <span>{currencyFormatters.brl(viewingClosing.pix_sales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cartão Crédito:</span>
                  <span>{currencyFormatters.brl(viewingClosing.credit_card_sales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cartão Débito:</span>
                  <span>{currencyFormatters.brl(viewingClosing.debit_card_sales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Outros:</span>
                  <span>{currencyFormatters.brl(viewingClosing.other_sales)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Sangrias:</span>
                  <span className="text-destructive">{currencyFormatters.brl(viewingClosing.withdrawals)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Suprimentos:</span>
                  <span className="text-success">{currencyFormatters.brl(viewingClosing.supplies)}</span>
                </div>
              </div>

              {viewingClosing.notes && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Observações:</p>
                  <p className="text-sm">{viewingClosing.notes}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                {getStatusBadge(viewingClosing.status)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
