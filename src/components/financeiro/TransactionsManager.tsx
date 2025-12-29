import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, TrendingUp, TrendingDown, Search, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import { useFinancialTransactions, useFinancialCategories } from '@/hooks/useFinanceiro';
import { TRANSACTION_TYPE_LABELS, PAYMENT_METHOD_LABELS, PaymentMethod, TransactionType } from '@/types/financial';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { LoadingButton } from '@/components/LoadingButton';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { from } from '@/integrations/db/client';

interface TransactionsManagerProps {
  month?: string;
  startDate?: string;
  endDate?: string;
}

const ITEMS_PER_PAGE = 20;

export function TransactionsManager({ month, startDate, endDate }: TransactionsManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: categories = [] } = useFinancialCategories();
  const { transactions, isLoading, createTransaction } = useFinancialTransactions({
    month,
    type: typeFilter !== 'all' ? typeFilter as any : undefined,
  });
  
  // Buscar vendas pagas do período
  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ['sales-transactions', startDate, endDate],
    queryFn: async () => {
      try {
        let q = from('sales')
          .select('id, numero, cliente_nome, total, created_at, status, observacoes')
          .eq('status', 'paid')
          .order('created_at', { ascending: false });
        
        // Só aplicar filtro de data se ambos estiverem definidos e não vazios
        if (startDate && endDate && startDate !== '' && endDate !== '') {
          q = q.gte('created_at', startDate).lte('created_at', endDate + 'T23:59:59');
        }
        
        const { data, error } = await q.execute();
        if (error) {
          console.warn('Erro ao buscar vendas:', error);
          return [];
        }
        console.log('[TransactionsManager] Vendas encontradas:', data?.length || 0);
        return data || [];
      } catch (err) {
        console.warn('Erro ao buscar vendas:', err);
        return [];
      }
    },
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

  // Função para extrair custo e lucro da observação (campo observacoes)
  const extractCustoLucro = (observacoes: string | null) => {
    if (!observacoes) return { custo: 0, lucro: 0 };
    const custoMatch = observacoes.match(/Custo:\s*R\$\s*([\d.,]+)/i);
    const lucroMatch = observacoes.match(/Lucro:\s*R\$\s*([\d.,]+)/i);
    const parseValor = (str: string) => {
      if (!str) return 0;
      return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    };
    return {
      custo: custoMatch ? parseValor(custoMatch[1]) : 0,
      lucro: lucroMatch ? parseValor(lucroMatch[1]) : 0,
    };
  };

  // Combinar transações manuais + vendas
  const allTransactions = useMemo(() => {
    const items: Array<{
      id: string;
      date: string;
      type: 'entrada' | 'saida';
      description: string;
      category: string;
      method: string;
      amount: number;
      source: 'manual' | 'sale';
      custo?: number;
      lucro?: number;
    }> = [];
    
    // Transações manuais - EXCLUIR as que referenciam vendas (já buscamos vendas diretamente)
    transactions.forEach(t => {
      // Ignorar transações que são referências a vendas
      const isFromSale = t.reference_type === 'sale' || 
                         t.description?.toLowerCase().includes('quitação') ||
                         t.description?.toLowerCase().includes('venda #');
      
      if (!isFromSale) {
        items.push({
          id: t.id,
          date: t.transaction_date,
          type: t.type,
          description: t.description,
          category: t.category?.name || '-',
          method: t.payment_method ? PAYMENT_METHOD_LABELS[t.payment_method] : '-',
          amount: t.amount,
          source: 'manual',
        });
      }
    });
    
    // Vendas como entradas (apenas pagas)
    sales.forEach((sale: any) => {
      if (typeFilter === 'all' || typeFilter === 'entrada') {
        const { custo, lucro } = extractCustoLucro(sale.observacoes);
        items.push({
          id: `sale-${sale.id}`,
          date: sale.created_at?.split('T')[0] || '',
          type: 'entrada',
          description: `Venda #${sale.numero}${sale.cliente_nome ? ` - ${sale.cliente_nome}` : ''}`,
          category: 'Vendas',
          method: 'PDV',
          amount: Number(sale.total || 0),
          source: 'sale',
          custo,
          lucro,
        });
      }
    });
    
    // Ordenar por data (mais recentes primeiro)
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return items;
  }, [transactions, sales, typeFilter]);

  const filteredTransactions = allTransactions.filter(t =>
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Paginação
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
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

  // Calcular totais usando dados filtrados (sem paginação)
  const totais = useMemo(() => {
    const vendasItems = filteredTransactions.filter(t => t.source === 'sale');
    const totalCusto = vendasItems.reduce((sum, t) => sum + (t.custo || 0), 0);
    const totalVenda = vendasItems.reduce((sum, t) => sum + t.amount, 0);
    const totalLucro = vendasItems.reduce((sum, t) => sum + (t.lucro || 0), 0);
    const totalEntradas = filteredTransactions
      .filter(t => t.type === 'entrada')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalSaidas = filteredTransactions
      .filter(t => t.type === 'saida')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return { totalCusto, totalVenda, totalLucro, totalEntradas, totalSaidas };
  }, [filteredTransactions]);

  const { totalCusto, totalVenda, totalLucro, totalEntradas, totalSaidas } = totais;

  if (isLoading || salesLoading) {
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-xs text-muted-foreground">Total Custo</p>
            <p className="text-lg font-bold text-red-600">{currencyFormatters.brl(totalCusto)}</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-xs text-muted-foreground">Total Vendas</p>
            <p className="text-lg font-bold text-blue-600">{currencyFormatters.brl(totalVenda)}</p>
          </div>
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <p className="text-xs text-muted-foreground">Total Lucro</p>
            <p className="text-lg font-bold text-green-600">{currencyFormatters.brl(totalLucro)}</p>
          </div>
          <div className={cn(
            "p-3 rounded-lg border",
            totalEntradas - totalSaidas >= 0 
              ? "bg-primary/10 border-primary/30" 
              : "bg-destructive/10 border-destructive/30"
          )}>
            <p className="text-xs text-muted-foreground">Saldo (Entradas - Saídas)</p>
            <p className={cn(
              "text-lg font-bold",
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
          <>
            <div className="border rounded-lg overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right text-red-600">Custo</TableHead>
                    <TableHead className="text-right text-blue-600">Venda</TableHead>
                    <TableHead className="text-right text-green-600">Lucro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{dateFormatters.short(transaction.date)}</TableCell>
                      <TableCell>
                        <Badge className={cn(
                          transaction.type === 'entrada'
                            ? 'bg-success/10 text-success border-success/30'
                            : 'bg-destructive/10 text-destructive border-destructive/30'
                        )}>
                          {transaction.source === 'sale' ? (
                            <ShoppingCart className="h-3 w-3 mr-1" />
                          ) : transaction.type === 'entrada' ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {transaction.source === 'sale' ? 'Venda' : TRANSACTION_TYPE_LABELS[transaction.type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{transaction.description}</TableCell>
                      <TableCell className="text-right text-red-600">
                        {transaction.custo && transaction.custo > 0 ? currencyFormatters.brl(transaction.custo) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-blue-600">
                        {transaction.source === 'sale' ? currencyFormatters.brl(transaction.amount) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {transaction.lucro && transaction.lucro > 0 ? currencyFormatters.brl(transaction.lucro) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} de {filteredTransactions.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
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


