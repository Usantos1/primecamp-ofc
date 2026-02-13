import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCaixaGeral, type LedgerEntry } from '@/hooks/useCaixaGeral';
import { PAYMENT_METHOD_LABELS } from '@/types/pdv';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { from } from '@/integrations/db/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Banknote, RefreshCw, TrendingUp, TrendingDown, MinusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function labelForma(forma: string): string {
  return (PAYMENT_METHOD_LABELS as Record<string, string>)[forma] ?? forma;
}

function SaldoCard({
  forma,
  saldo,
  bruto,
  taxa,
}: {
  forma: string;
  saldo: number;
  bruto: number;
  taxa: number;
}) {
  const isNegative = saldo < 0;
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Banknote className="h-4 w-4" />
          {labelForma(forma)}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className={cn('text-2xl font-bold tabular-nums', isNegative ? 'text-destructive' : 'text-foreground')}>
          {currencyFormatters.brl(saldo)}
        </p>
        {(bruto > 0 || taxa !== 0) && (
          <p className="text-xs text-muted-foreground mt-1">
            Bruto {currencyFormatters.brl(bruto)}
            {taxa > 0 && <> · Taxa −{currencyFormatters.brl(taxa)}</>}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const isEntrada = entry.tipo === 'entrada_venda' || entry.tipo === 'suprimento';
  const isSangria = entry.tipo === 'sangria';
  return (
    <TableRow>
      <TableCell className="text-muted-foreground whitespace-nowrap">
        {dateFormatters.withTime(entry.data)}
      </TableCell>
      <TableCell>
        <Badge variant={entry.tipo === 'entrada_venda' ? 'default' : entry.tipo === 'sangria' ? 'destructive' : 'secondary'}>
          {entry.tipo === 'entrada_venda' ? 'Venda' : entry.tipo === 'sangria' ? 'Sangria' : 'Suprimento'}
        </Badge>
      </TableCell>
      <TableCell>{labelForma(entry.forma_pagamento)}</TableCell>
      <TableCell>{entry.descricao}</TableCell>
      <TableCell className="text-right tabular-nums">{currencyFormatters.brl(entry.valor_bruto)}</TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {entry.valor_taxa > 0 ? `−${currencyFormatters.brl(entry.valor_taxa)}` : '—'}
      </TableCell>
      <TableCell className={cn('text-right tabular-nums font-medium', isSangria ? 'text-destructive' : isEntrada ? 'text-green-600 dark:text-green-400' : '')}>
        {isSangria ? `−${currencyFormatters.brl(Math.abs(entry.valor_liquido))}` : currencyFormatters.brl(entry.valor_liquido)}
      </TableCell>
    </TableRow>
  );
}

type OpenSession = { id: string; numero?: number | null; operador_nome?: string | null };

export function CaixaGeral() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { saldoPorForma, totaisPorForma, sangriaTotal, suprimentoTotal, ledger, isLoading, refetch } = useCaixaGeral();

  const [showRetiradaDialog, setShowRetiradaDialog] = useState(false);
  const [retiradaSessionId, setRetiradaSessionId] = useState('');
  const [retiradaValor, setRetiradaValor] = useState('');
  const [retiradaMotivo, setRetiradaMotivo] = useState('');
  const [isSubmittingRetirada, setIsSubmittingRetirada] = useState(false);

  const { data: openSessions = [] } = useQuery({
    queryKey: ['cash-register-sessions-open-caixa-geral'],
    queryFn: async () => {
      const { data, error } = await from('cash_register_sessions')
        .select('id, numero, operador_nome')
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .execute();
      if (error) throw error;
      return (data || []) as OpenSession[];
    },
    enabled: showRetiradaDialog,
  });

  const handleRetiradaSubmit = async () => {
    if (!retiradaSessionId.trim()) {
      toast({ title: 'Selecione uma sessão de caixa aberta', variant: 'destructive' });
      return;
    }
    const v = parseFloat(retiradaValor.replace(',', '.'));
    if (isNaN(v) || v <= 0) {
      toast({ title: 'Informe um valor válido', variant: 'destructive' });
      return;
    }
    const operadorNome = profile?.display_name ?? (user as any)?.user_metadata?.name ?? user?.email ?? 'Operador';
    setIsSubmittingRetirada(true);
    try {
      const { data: newMovement, error } = await from('cash_movements')
        .insert({
          session_id: retiradaSessionId,
          tipo: 'sangria',
          valor: v,
          motivo: retiradaMotivo.trim() || null,
          operador_id: user?.id ?? '',
          operador_nome: operadorNome,
        })
        .select()
        .single()
        .execute();
      if (error) throw error;
      toast({ title: 'Retirada (sangria) registrada com sucesso.' });
      setShowRetiradaDialog(false);
      setRetiradaSessionId('');
      setRetiradaValor('');
      setRetiradaMotivo('');
      queryClient.invalidateQueries({ queryKey: ['caixa-geral-payments'] });
      queryClient.invalidateQueries({ queryKey: ['caixa-geral-movements'] });
      queryClient.invalidateQueries({ queryKey: ['cash-register-sessions-admin'] });
      queryClient.invalidateQueries({ queryKey: ['cash-register-sessions-open-caixa-geral'] });
      refetch();
    } catch (e: any) {
      toast({ title: e?.message || 'Erro ao registrar retirada', variant: 'destructive' });
    } finally {
      setIsSubmittingRetirada(false);
    }
  };

  // Sempre mostrar todas as formas de pagamento (inclusive com R$ 0,00)
  const formasOrdenadas = ['dinheiro', 'pix', 'debito', 'credito', 'link_pagamento', 'carteira_digital', 'fiado'];
  const outrasFormas = Object.keys(saldoPorForma).filter((f) => !formasOrdenadas.includes(f));
  const formasComSaldo = [...formasOrdenadas, ...outrasFormas];

  const totalGeral = Object.values(saldoPorForma).reduce((a, b) => round2(a + b), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Caixa geral (tesouraria)</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowRetiradaDialog(true)}>
            <MinusCircle className="h-4 w-4 mr-1" />
            Retirar (sangria)
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-1', isLoading && 'animate-spin')} />
            Atualizar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-8 text-center">Carregando saldos...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {formasComSaldo.map((forma) => (
              <SaldoCard
                key={forma}
                forma={forma}
                saldo={round2(saldoPorForma[forma] ?? 0)}
                bruto={totaisPorForma[forma]?.bruto ?? 0}
                taxa={totaisPorForma[forma]?.taxa ?? 0}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <TrendingDown className="h-4 w-4 text-destructive" /> Sangrias totais: <strong className="text-foreground">{currencyFormatters.brl(sangriaTotal)}</strong>
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-green-600" /> Suprimentos totais: <strong className="text-foreground">{currencyFormatters.brl(suprimentoTotal)}</strong>
            </span>
            <span className="font-semibold tabular-nums">
              Saldo geral: {currencyFormatters.brl(totalGeral)}
            </span>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Espelho (movimentos)</CardTitle>
              <p className="text-sm text-muted-foreground">Entradas e saídas por forma de pagamento — valores líquidos após taxas.</p>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Forma</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Bruto</TableHead>
                      <TableHead className="text-right">Taxa</TableHead>
                      <TableHead className="text-right">Líquido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledger.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhum movimento no período.
                        </TableCell>
                      </TableRow>
                    ) : (
                      ledger.map((entry) => <LedgerRow key={entry.id} entry={entry} />)
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={showRetiradaDialog} onOpenChange={setShowRetiradaDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Retirar (sangria)</DialogTitle>
            <DialogDescription>
              Registre uma retirada de dinheiro do caixa. É necessário ter uma sessão de caixa aberta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Sessão de caixa</Label>
              <Select value={retiradaSessionId} onValueChange={setRetiradaSessionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a sessão" />
                </SelectTrigger>
                <SelectContent>
                  {openSessions.length === 0 ? (
                    <SelectItem value="_none" disabled>Nenhuma sessão aberta</SelectItem>
                  ) : (
                    openSessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        Caixa #{s.numero ?? s.id.slice(0, 8)} {s.operador_nome ? `— ${s.operador_nome}` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {openSessions.length === 0 && (
                <p className="text-xs text-muted-foreground">Abra um caixa em uma das sessões abaixo para poder retirar.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={retiradaValor}
                onChange={(e) => setRetiradaValor(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Textarea
                placeholder="Ex: Depósito no banco"
                value={retiradaMotivo}
                onChange={(e) => setRetiradaMotivo(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRetiradaDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRetiradaSubmit}
              disabled={isSubmittingRetirada || openSessions.length === 0 || !retiradaSessionId || retiradaSessionId === '_none' || !retiradaValor.trim()}
            >
              {isSubmittingRetirada ? 'Salvando…' : 'Registrar retirada'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const round2 = (n: number) => Math.round(n * 100) / 100;
