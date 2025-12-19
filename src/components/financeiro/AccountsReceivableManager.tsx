import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, Search, Eye, Plus } from 'lucide-react';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { LoadingButton } from '@/components/LoadingButton';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface AccountsReceivableManagerProps {
  month?: string;
}

interface AccountReceivable {
  id: string;
  cliente_id?: string;
  cliente_nome?: string;
  sale_id?: string;
  ordem_servico_id?: string;
  valor_total: number; // Campo correto da tabela
  valor_pago?: number;
  valor_restante?: number; // Campo calculado
  data_vencimento?: string;
  data_pagamento?: string;
  status: 'pendente' | 'parcial' | 'pago' | 'atrasado' | 'cancelado';
  recurring?: boolean;
  recurring_day?: number;
  parent_receivable_id?: string;
  observacoes?: string;
  created_at: string;
  updated_at?: string;
}

export function AccountsReceivableManager({ month }: AccountsReceivableManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payingAccountId, setPayingAccountId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('pix');
  const [viewingAccount, setViewingAccount] = useState<AccountReceivable | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    cliente_nome: '',
    valor_total: 0,
    data_vencimento: new Date().toISOString().split('T')[0],
    recurring: false,
    recurring_day: undefined as number | undefined,
    observacoes: '',
  });

  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts-receivable', month, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('accounts_receivable')
        .select('*')
        .order('data_vencimento', { ascending: true });

      if (month) {
        const startDate = `${month}-01`;
        const endDate = `${month}-31`;
        query = query.gte('data_vencimento', startDate).lte('data_vencimento', endDate);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('Erro ao buscar contas a receber:', error);
        return [];
      }
      return (data || []) as AccountReceivable[];
    },
  });

  const payAccount = useMutation({
    mutationFn: async ({ id, paymentMethod }: { id: string; paymentMethod: string }) => {
      const account = accounts.find(a => a.id === id);
      if (!account) throw new Error('Conta não encontrada');

      const { data: result, error } = await supabase
        .from('accounts_receivable')
        .update({
          status: 'pago',
          data_pagamento: new Date().toISOString().split('T')[0],
          valor_pago: account.valor_total,
          paid_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-receivable'] });
      setPayDialogOpen(false);
      setPayingAccountId(null);
    },
  });

  const filteredAccounts = accounts.filter(account =>
    account.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string, dueDate?: string) => {
    if (status === 'pago') return 'bg-success/10 text-success border-success/30';
    if (status === 'cancelado') return 'bg-muted text-muted-foreground border-muted';
    if (status === 'parcial') return 'bg-blue-50 text-blue-600 border-blue-300';
    if (dueDate && new Date(dueDate) < new Date()) return 'bg-destructive/10 text-destructive border-destructive/30';
    return 'bg-warning/10 text-warning border-warning/30';
  };

  const totalPendente = filteredAccounts
    .filter(a => a.status === 'pendente' || a.status === 'parcial')
    .reduce((sum, a) => sum + (a.valor_restante || a.valor_total - (a.valor_pago || 0)), 0);

  const totalPago = filteredAccounts
    .filter(a => a.status === 'pago')
    .reduce((sum, a) => sum + (a.valor_pago || 0), 0);

  if (isLoading) {
    return <LoadingSkeleton type="table" count={5} />;
  }

  return (
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Contas a Receber</CardTitle>
              <CardDescription>Gerencie os recebimentos pendentes</CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Conta a Receber
            </Button>
          </div>
        </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
            <p className="text-sm text-muted-foreground">A Receber</p>
            <p className="text-xl font-bold text-warning">{currencyFormatters.brl(totalPendente)}</p>
          </div>
          <div className="p-4 rounded-lg bg-success/10 border border-success/30">
            <p className="text-sm text-muted-foreground">Recebido</p>
            <p className="text-xl font-bold text-success">{currencyFormatters.brl(totalPago)}</p>
          </div>
        </div>

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
        </div>

        {/* Tabela */}
        {filteredAccounts.length === 0 ? (
          <EmptyState
            variant="no-data"
            title="Nenhuma conta a receber encontrada"
            description="As contas a receber são geradas automaticamente a partir de vendas e ordens de serviço."
          />
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.cliente_nome || '-'}</TableCell>
                    <TableCell className="font-semibold">{currencyFormatters.brl(account.valor_total)}</TableCell>
                    <TableCell>{account.data_vencimento ? dateFormatters.short(account.data_vencimento) : '-'}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(account.status, account.data_vencimento)}>
                        {account.status === 'parcial' ? 'Parcial' : account.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setViewingAccount(account)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(account.status === 'pendente' || account.status === 'parcial') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-success"
                            onClick={() => {
                              setPayingAccountId(account.id);
                              setPayDialogOpen(true);
                            }}
                          >
                            <Check className="h-4 w-4" />
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

      {/* Dialog de pagamento */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Recebimento</DialogTitle>
            <DialogDescription>
              Selecione a forma de pagamento recebida
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>
              Cancelar
            </Button>
            <LoadingButton
              onClick={() => payingAccountId && payAccount.mutateAsync({ id: payingAccountId, paymentMethod })}
              loading={payAccount.isPending}
              className="bg-success hover:bg-success/90"
            >
              Confirmar Recebimento
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de visualização */}
      <Dialog open={!!viewingAccount} onOpenChange={() => setViewingAccount(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Conta</DialogTitle>
          </DialogHeader>
          
          {viewingAccount && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{viewingAccount.cliente_nome || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="font-bold text-lg">{currencyFormatters.brl(viewingAccount.valor_total)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vencimento</p>
                  <p className="font-medium">{viewingAccount.data_vencimento ? dateFormatters.short(viewingAccount.data_vencimento) : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(viewingAccount.status, viewingAccount.data_vencimento)}>
                    {viewingAccount.status === 'parcial' ? 'Parcial' : viewingAccount.status}
                  </Badge>
                </div>
                {viewingAccount.data_pagamento && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Data de Pagamento</p>
                      <p className="font-medium">{dateFormatters.short(viewingAccount.data_pagamento)}</p>
                    </div>
                  </>
                )}
              </div>
              {viewingAccount.observacoes && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Observações:</p>
                  <p className="text-sm">{viewingAccount.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

