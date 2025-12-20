import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DollarSign, Plus, Minus, Lock, Unlock, TrendingUp, TrendingDown,
  Calendar, Clock, User, FileText
} from 'lucide-react';
import { useCashRegister, useCashMovements } from '@/hooks/usePDV';
import { useAuth } from '@/contexts/AuthContext';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { useToast } from '@/hooks/use-toast';
import { LoadingButton } from '@/components/LoadingButton';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

export default function Caixa() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentSession, isLoading, openCash, closeCash, refreshSession } = useCashRegister();
  const { movements, isLoading: movementsLoading, addMovement, refreshMovements } = useCashMovements(
    currentSession?.id || ''
  );

  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [valorInicial, setValorInicial] = useState('');
  const [valorFinal, setValorFinal] = useState('');
  const [divergencia, setDivergencia] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [movementType, setMovementType] = useState<'sangria' | 'suprimento'>('sangria');
  const [movementValor, setMovementValor] = useState('');
  const [movementMotivo, setMovementMotivo] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sales, setSales] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [salePayments, setSalePayments] = useState<Record<string, any[]>>({});
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [showSaleDetails, setShowSaleDetails] = useState(false);

  useEffect(() => {
    if (currentSession?.id) {
      refreshMovements();
      loadSales();
    }
  }, [currentSession?.id, refreshMovements]);

  const loadSales = async () => {
    if (!currentSession?.id) return;
    try {
      setLoadingSales(true);
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('cash_register_session_id', currentSession.id)
        .eq('status', 'paid')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSales(data || []);
      
      // Carregar pagamentos de todas as vendas
      if (data && data.length > 0) {
        const saleIds = data.map(s => s.id);
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .in('sale_id', saleIds)
          .eq('status', 'confirmed');
        
        if (!paymentsError && paymentsData) {
          const paymentsBySale: Record<string, any[]> = {};
          paymentsData.forEach((payment: any) => {
            if (!paymentsBySale[payment.sale_id]) {
              paymentsBySale[payment.sale_id] = [];
            }
            paymentsBySale[payment.sale_id].push(payment);
          });
          setSalePayments(paymentsBySale);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    } finally {
      setLoadingSales(false);
    }
  };

  const handleOpenCash = async () => {
    if (!valorInicial || parseFloat(valorInicial) < 0) {
      toast({ title: 'Valor inicial inválido', variant: 'destructive' });
      return;
    }

    try {
      setIsProcessing(true);
      await openCash({
        valor_inicial: parseFloat(valorInicial),
        operador_id: user?.id || '',
      });
      toast({ title: 'Caixa aberto com sucesso!' });
      setShowOpenDialog(false);
      setValorInicial('');
    } catch (error: any) {
      toast({ 
        title: 'Erro ao abrir caixa', 
        description: error.message || 'Tente novamente',
        variant: 'destructive' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseCash = async () => {
    if (!valorFinal || parseFloat(valorFinal) < 0) {
      toast({ title: 'Valor final inválido', variant: 'destructive' });
      return;
    }

    if (!currentSession) return;

    try {
      setIsProcessing(true);
      const valorFinalNum = parseFloat(valorFinal);
      const divergenciaNum = divergencia ? parseFloat(divergencia) : undefined;
      
      await closeCash(
        currentSession.id,
        valorFinalNum,
        divergenciaNum,
        justificativa || undefined
      );
      
      toast({ title: 'Caixa fechado com sucesso!' });
      setShowCloseDialog(false);
      setValorFinal('');
      setDivergencia('');
      setJustificativa('');
    } catch (error: any) {
      toast({ 
        title: 'Erro ao fechar caixa', 
        description: error.message || 'Tente novamente',
        variant: 'destructive' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddMovement = async () => {
    if (!movementValor || parseFloat(movementValor) <= 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' });
      return;
    }

    if (!currentSession) return;

    try {
      setIsProcessing(true);
      await addMovement({
        tipo: movementType,
        valor: parseFloat(movementValor),
        motivo: movementMotivo || undefined,
      });
      
      toast({ 
        title: `${movementType === 'sangria' ? 'Sangria' : 'Suprimento'} registrado com sucesso!` 
      });
      setShowMovementDialog(false);
      setMovementValor('');
      setMovementMotivo('');
    } catch (error: any) {
      toast({ 
        title: 'Erro ao registrar movimento', 
        description: error.message || 'Tente novamente',
        variant: 'destructive' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Calcular totais
  const totalEntradas = movements
    .filter(m => m.tipo === 'suprimento')
    .reduce((sum, m) => sum + Number(m.valor), 0);
  
  const totalSaidas = movements
    .filter(m => m.tipo === 'sangria')
    .reduce((sum, m) => sum + Number(m.valor), 0);

  // Calcular total de vendas vinculadas ao caixa
  const totalVendas = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  
  const valorEsperado = currentSession 
    ? Number(currentSession.valor_inicial) + totalEntradas - totalSaidas + totalVendas
    : 0;

  if (isLoading) {
    return (
      <ModernLayout title="Caixa" subtitle="Gerenciamento de caixa">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout title="Caixa" subtitle="Abertura, fechamento e movimentos de caixa">
      <div className="space-y-6">
        {/* Status do Caixa */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Status do Caixa</CardTitle>
              {currentSession ? (
                <Badge className="bg-green-100 text-green-800">
                  <Unlock className="h-3 w-3 mr-1" />
                  Aberto
                </Badge>
              ) : (
                <Badge variant="outline">
                  <Lock className="h-3 w-3 mr-1" />
                  Fechado
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {currentSession ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm text-muted-foreground">Valor Inicial</Label>
                    </div>
                    <p className="text-2xl font-bold">{currencyFormatters.brl(currentSession.valor_inicial)}</p>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <Label className="text-sm text-muted-foreground">Total Entradas</Label>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      {currencyFormatters.brl(totalEntradas)}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      <Label className="text-sm text-muted-foreground">Total Saídas</Label>
                    </div>
                    <p className="text-2xl font-bold text-red-600">
                      {currencyFormatters.brl(totalSaidas)}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm text-muted-foreground">Valor Esperado</Label>
                      <p className="text-3xl font-bold text-primary">
                        {currencyFormatters.brl(valorEsperado)}
                      </p>
                    </div>
                    <Button onClick={() => setShowCloseDialog(true)} variant="destructive">
                      <Lock className="h-4 w-4 mr-2" />
                      Fechar Caixa
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Operador: {currentSession.operador_nome}</span>
                  <span>•</span>
                  <Calendar className="h-4 w-4" />
                  <span>{dateFormatters.short(currentSession.opened_at)}</span>
                  <span>•</span>
                  <Clock className="h-4 w-4" />
                  <span>{new Date(currentSession.opened_at).toLocaleTimeString('pt-BR')}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium mb-2">Caixa Fechado</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Abra o caixa para começar a operar
                </p>
                <Button onClick={() => setShowOpenDialog(true)}>
                  <Unlock className="h-4 w-4 mr-2" />
                  Abrir Caixa
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vendas */}
        {currentSession && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Vendas</CardTitle>
                <Badge variant="outline">{sales.length} venda(s)</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loadingSales ? (
                <div className="text-center py-4 text-muted-foreground">Carregando vendas...</div>
              ) : sales.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma venda registrada nesta sessão</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">#{sale.numero}</TableCell>
                          <TableCell>{sale.cliente_nome || 'Consumidor Final'}</TableCell>
                          <TableCell>
                            {dateFormatters.short(sale.created_at)}{' '}
                            {new Date(sale.created_at).toLocaleTimeString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {currencyFormatters.brl(sale.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="p-4 bg-muted/50 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total de Vendas:</span>
                      <span className="text-xl font-bold text-primary">
                        {currencyFormatters.brl(totalVendas)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Movimentos */}
        {currentSession && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Movimentos</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMovementType('suprimento');
                      setShowMovementDialog(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Suprimento
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMovementType('sangria');
                      setShowMovementDialog(true);
                    }}
                  >
                    <Minus className="h-4 w-4 mr-2" />
                    Sangria
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {movements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum movimento registrado</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Operador</TableHead>
                        <TableHead>Data/Hora</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell>
                            <Badge
                              className={cn(
                                movement.tipo === 'sangria'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-green-100 text-green-800'
                              )}
                            >
                              {movement.tipo === 'sangria' ? 'Sangria' : 'Suprimento'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {currencyFormatters.brl(movement.valor)}
                          </TableCell>
                          <TableCell>{movement.motivo || '-'}</TableCell>
                          <TableCell>{movement.operador_nome}</TableCell>
                          <TableCell>
                            {dateFormatters.short(movement.created_at)}{' '}
                            {new Date(movement.created_at).toLocaleTimeString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog: Abrir Caixa */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir Caixa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Valor Inicial (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={valorInicial}
                onChange={(e) => setValorInicial(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Informe o valor em dinheiro que está no caixa no momento da abertura.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenDialog(false)}>
              Cancelar
            </Button>
            <LoadingButton onClick={handleOpenCash} loading={isProcessing}>
              Abrir Caixa
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Fechar Caixa */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fechar Caixa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor Esperado (R$)</Label>
                <Input
                  type="number"
                  value={valorEsperado.toFixed(2)}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Calculado automaticamente
                </p>
              </div>
              <div>
                <Label>Valor Final Contado (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={valorFinal}
                  onChange={(e) => {
                    setValorFinal(e.target.value);
                    const final = parseFloat(e.target.value) || 0;
                    const diverg = final - valorEsperado;
                    setDivergencia(diverg.toFixed(2));
                  }}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>
            
            <div>
              <Label>Divergência (R$)</Label>
              <Input
                type="number"
                value={divergencia}
                onChange={(e) => setDivergencia(e.target.value)}
                className={cn(
                  parseFloat(divergencia || '0') !== 0 && 'border-orange-500'
                )}
                disabled
              />
              <p className="text-xs text-muted-foreground mt-1">
                {parseFloat(divergencia || '0') > 0 
                  ? 'Sobra no caixa' 
                  : parseFloat(divergencia || '0') < 0 
                  ? 'Falta no caixa' 
                  : 'Sem divergência'}
              </p>
            </div>

            {parseFloat(divergencia || '0') !== 0 && (
              <div>
                <Label>Justificativa da Divergência</Label>
                <Textarea
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder="Explique a divergência encontrada..."
                  rows={3}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
              Cancelar
            </Button>
            <LoadingButton onClick={handleCloseCash} loading={isProcessing}>
              Fechar Caixa
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Movimento */}
      <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {movementType === 'sangria' ? 'Registrar Sangria' : 'Registrar Suprimento'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={movementValor}
                onChange={(e) => setMovementValor(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div>
              <Label>Motivo (Opcional)</Label>
              <Textarea
                value={movementMotivo}
                onChange={(e) => setMovementMotivo(e.target.value)}
                placeholder="Descreva o motivo do movimento..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMovementDialog(false)}>
              Cancelar
            </Button>
            <LoadingButton onClick={handleAddMovement} loading={isProcessing}>
              Registrar
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModernLayout>
  );
}

