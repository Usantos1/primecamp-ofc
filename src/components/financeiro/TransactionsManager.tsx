import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, TrendingUp, TrendingDown, Search, Filter } from 'lucide-react';
import { useFinancialTransactions, useFinancialCategories } from '@/hooks/useFinanceiro';
import { TRANSACTION_TYPE_LABELS, PAYMENT_METHOD_LABELS, PaymentMethod, TransactionType } from '@/types/financial';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { LoadingButton } from '@/components/LoadingButton';
import { cn } from '@/lib/utils';

interface TransactionsManagerProps {
  month?: string;
}

export function TransactionsManager({ month }: TransactionsManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: categories = [] } = useFinancialCategories();
  const { transactions, isLoading, createTransaction } = useFinancialTransactions({
    month,
    type: typeFilter !== 'all' ? typeFilter as any : undefined,
  });

  const [formData, setFormData] = useState({
    type: 'entrada' as TransactionType,
    category_id: '',
    description: '',
    amount: 0,
    payment_method: 'pix' as PaymentMethod,
    transaction_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const filteredTransactions = transactions.filter(t =>
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenDialog = () => {
    setFormData({
      type: 'entrada',
      category_id: '',
      description: '',
      amount: 0,
      payment_method: 'pix',
      transaction_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    await createTransaction.mutateAsync({
      ...formData,
      reference_type: 'manual',
    } as any);
    setIsDialogOpen(false);
  };

  const availableCategories = categories.filter(c => c.type === formData.type);

  // Calcular totais
  const totalEntradas = filteredTransactions
    .filter(t => t.type === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalSaidas = filteredTransactions
    .filter(t => t.type === 'saida')
    .reduce((sum, t) => sum + t.amount, 0);

  if (isLoading) {
    return <LoadingSkeleton type="table" count={5} />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Transações</CardTitle>
            <CardDescription>Histórico de entradas e saídas</CardDescription>
          </div>
          <Button onClick={handleOpenDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Transação
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-success/10 border border-success/30">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              Entradas
            </p>
            <p className="text-xl font-bold text-success">{currencyFormatters.brl(totalEntradas)}</p>
          </div>
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Saídas
            </p>
            <p className="text-xl font-bold text-destructive">{currencyFormatters.brl(totalSaidas)}</p>
          </div>
          <div className={cn(
            "p-4 rounded-lg border",
            totalEntradas - totalSaidas >= 0 
              ? "bg-primary/10 border-primary/30" 
              : "bg-destructive/10 border-destructive/30"
          )}>
            <p className="text-sm text-muted-foreground">Saldo</p>
            <p className={cn(
              "text-xl font-bold",
              totalEntradas - totalSaidas >= 0 ? "text-primary" : "text-destructive"
            )}>
              {currencyFormatters.brl(totalEntradas - totalSaidas)}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar transações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="entrada">Entradas</SelectItem>
              <SelectItem value="saida">Saídas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        {filteredTransactions.length === 0 ? (
          <EmptyState
            variant="no-data"
            title="Nenhuma transação encontrada"
            description="Registre suas entradas e saídas manualmente."
            action={{ label: 'Nova Transação', onClick: handleOpenDialog }}
          />
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{dateFormatters.short(transaction.transaction_date)}</TableCell>
                    <TableCell>
                      <Badge className={cn(
                        transaction.type === 'entrada'
                          ? 'bg-success/10 text-success border-success/30'
                          : 'bg-destructive/10 text-destructive border-destructive/30'
                      )}>
                        {transaction.type === 'entrada' ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {TRANSACTION_TYPE_LABELS[transaction.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{transaction.description}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {transaction.category?.name || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {transaction.payment_method 
                        ? PAYMENT_METHOD_LABELS[transaction.payment_method] 
                        : '-'}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-semibold",
                      transaction.type === 'entrada' ? 'text-success' : 'text-destructive'
                    )}>
                      {transaction.type === 'entrada' ? '+' : '-'}
                      {currencyFormatters.brl(transaction.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Dialog de criação */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Transação</DialogTitle>
            <DialogDescription>
              Registre uma entrada ou saída manualmente
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: TransactionType) => setFormData({ 
                  ...formData, 
                  type: value,
                  category_id: '' 
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-success" />
                      Entrada
                    </span>
                  </SelectItem>
                  <SelectItem value="saida">
                    <span className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-destructive" />
                      Saída
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Pagamento de fornecedor"
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
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Método de Pagamento</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value: PaymentMethod) => setFormData({ ...formData, payment_method: value })}
                >
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
              loading={createTransaction.isPending}
              className={formData.type === 'entrada' ? 'bg-success hover:bg-success/90' : ''}
            >
              Registrar
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

