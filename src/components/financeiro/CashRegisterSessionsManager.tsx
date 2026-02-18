import { useMemo, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { from } from '@/integrations/db/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCashRegister, useCashMovements } from '@/hooks/usePDV';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { useToast } from '@/hooks/use-toast';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { Lock, Plus, Minus } from 'lucide-react';

type CashSession = {
  id: string;
  numero?: number | null;
  operador_id?: string | null;
  operador_nome?: string | null;
  status?: 'open' | 'closed' | string;
  valor_inicial?: number | null;
  valor_final?: number | null;
  valor_esperado?: number | null;
  divergencia?: number | null;
  opened_at?: string | null;
  closed_at?: string | null;
  totais_forma_pagamento?: Record<string, number> | null;
};

interface Props {
  dateFilter: 'today' | 'week' | 'month' | 'all' | 'custom';
  customDateStart?: Date;
  customDateEnd?: Date;
  statusFilter?: 'all' | 'open' | 'closed';
}

function labelForma(forma: string) {
  const f = (forma || '').toLowerCase();
  switch (f) {
    case 'dinheiro': return 'Dinheiro';
    case 'pix': return 'PIX';
    case 'debito': return 'Débito';
    case 'credito': return 'Crédito';
    case 'credito_parcelado': return 'Crédito parcelado';
    case 'link_pagamento': return 'Link';
    case 'carteira_digital': return 'Carteira';
    case 'adiantamento os': return 'Adiantamento OS';
    default: return forma || 'Outros';
  }
}

/** Calcula valor_esperado por sessão (inicial + entradas vendas excl. Adiantamento OS + suprimentos - sangrias) e anexa às sessões */
async function enrichSessionsWithEsperado(list: CashSession[]): Promise<CashSession[]> {
  if (list.length === 0) return list;
  const ids = list.map(s => s.id);
  const [movsRes, salesRes] = await Promise.all([
    from('cash_movements').select('session_id, tipo, valor').in('session_id', ids).execute(),
    from('sales').select('id, cash_register_session_id').in('cash_register_session_id', ids).eq('status', 'paid').execute(),
  ]);
  const movements = (movsRes.data || []) as { session_id: string; tipo: string; valor: number }[];
  const sales = (salesRes.data || []) as { id: string; cash_register_session_id: string }[];
  const saleIds = sales.map(s => s.id).filter(Boolean);
  let payments: { sale_id: string; forma_pagamento: string; valor: number }[] = [];
  if (saleIds.length > 0) {
    const payRes = await from('payments').select('sale_id, forma_pagamento, valor').in('sale_id', saleIds).eq('status', 'confirmed').execute();
    payments = (payRes.data || []) as { sale_id: string; forma_pagamento: string; valor: number }[];
  }
  const salesBySession: Record<string, string[]> = {};
  sales.forEach((s: any) => {
    const sid = s.cash_register_session_id;
    if (!salesBySession[sid]) salesBySession[sid] = [];
    salesBySession[sid].push(s.id);
  });
  const suprimentoBySession: Record<string, number> = {};
  const sangriaBySession: Record<string, number> = {};
  movements.forEach((m: any) => {
    const sid = m.session_id;
    const v = Number(m.valor || 0);
    if (m.tipo === 'suprimento') suprimentoBySession[sid] = (suprimentoBySession[sid] || 0) + v;
    else if (m.tipo === 'sangria') sangriaBySession[sid] = (sangriaBySession[sid] || 0) + v;
  });
  const entradasVendasBySession: Record<string, number> = {};
  // Totais por forma de pagamento por sessão (para exibir no detalhe do caixa)
  const totaisFormaBySession: Record<string, Record<string, number>> = {};
  payments.forEach((p: any) => {
    const forma = (p.forma_pagamento || '').trim() || 'outros';
    const sessionId = sales.find((s: any) => s.id === p.sale_id)?.cash_register_session_id;
    if (!sessionId) return;
    const valor = Number(p.valor || 0);
    if ((p.forma_pagamento || '').toLowerCase() !== 'adiantamento os') {
      entradasVendasBySession[sessionId] = (entradasVendasBySession[sessionId] || 0) + valor;
    }
    if (!totaisFormaBySession[sessionId]) totaisFormaBySession[sessionId] = {};
    totaisFormaBySession[sessionId][forma] = (totaisFormaBySession[sessionId][forma] || 0) + valor;
  });
  return list.map(s => {
    const inicial = Number(s.valor_inicial || 0);
    const entradasVendas = entradasVendasBySession[s.id] || 0;
    const suprimento = suprimentoBySession[s.id] || 0;
    const sangria = sangriaBySession[s.id] || 0;
    const valor_esperado = inicial + entradasVendas + suprimento - sangria;
    // Totais por forma: usar salvos no fechamento ou calcular dos pagamentos (caixa aberto)
    const fromDb = s.totais_forma_pagamento && Object.keys(s.totais_forma_pagamento).length > 0;
    let totais_forma_pagamento: Record<string, number> | null = fromDb
      ? { ...s.totais_forma_pagamento }
      : (totaisFormaBySession[s.id] ? { ...totaisFormaBySession[s.id] } : null);
    // Para caixa aberto (totais calculados): incluir abertura no total "dinheiro"
    if (!fromDb && totais_forma_pagamento && inicial > 0) {
      const keyDinheiro = Object.keys(totais_forma_pagamento).find(k => k.toLowerCase() === 'dinheiro');
      if (keyDinheiro) totais_forma_pagamento[keyDinheiro] = (totais_forma_pagamento[keyDinheiro] || 0) + inicial;
      else totais_forma_pagamento['dinheiro'] = inicial;
    } else if (!fromDb && inicial > 0) {
      totais_forma_pagamento = { dinheiro: inicial };
    }
    return { ...s, valor_esperado, totais_forma_pagamento };
  });
}

export function CashRegisterSessionsManager({ dateFilter, customDateStart, customDateEnd, statusFilter = 'all' }: Props) {
  const { user, profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { closeCash } = useCashRegister();
  const [selected, setSelected] = useState<CashSession | null>(null);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [valorFinal, setValorFinal] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [movementType, setMovementType] = useState<'sangria' | 'suprimento'>('sangria');
  const [movementValor, setMovementValor] = useState('');
  const [movementMotivo, setMovementMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedSessionId = selected?.id ?? '';
  const { movements, addMovement } = useCashMovements(selectedSessionId);

  useEffect(() => {
    setShowCloseForm(false);
    setShowMovementForm(false);
  }, [selected?.id]);

  const handleCloseCash = async () => {
    if (!selected || !valorFinal.trim()) {
      toast({ title: 'Informe o valor final', variant: 'destructive' });
      return;
    }
    const v = parseFloat(valorFinal.replace(',', '.'));
    if (isNaN(v) || v < 0) {
      toast({ title: 'Valor final inválido', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      await closeCash(selected.id, v, undefined, justificativa.trim() || undefined, {
        opened_at: selected.opened_at,
        valor_inicial: selected.valor_inicial,
      });
      toast({ title: 'Caixa fechado com sucesso.' });
      setSelected(null);
      setShowCloseForm(false);
      setValorFinal('');
      setJustificativa('');
      queryClient.invalidateQueries({ queryKey: ['cash-register-sessions-admin'] });
    } catch (e: any) {
      toast({ title: e?.message || 'Erro ao fechar caixa', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMovement = async () => {
    if (!selected || !movementValor.trim()) {
      toast({ title: 'Informe o valor', variant: 'destructive' });
      return;
    }
    const v = parseFloat(movementValor.replace(',', '.'));
    if (isNaN(v) || v <= 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      await addMovement({ tipo: movementType, valor: v, motivo: movementMotivo.trim() || undefined });
      toast({ title: movementType === 'sangria' ? 'Sangria registrada.' : 'Suprimento registrado.' });
      setShowMovementForm(false);
      setMovementValor('');
      setMovementMotivo('');
      queryClient.invalidateQueries({ queryKey: ['cash-register-sessions-admin'] });
    } catch (e: any) {
      toast({ title: e?.message || 'Erro ao registrar', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['cash-register-sessions-admin', dateFilter, customDateStart?.toISOString(), customDateEnd?.toISOString(), statusFilter, isAdmin, user?.id],
    queryFn: async () => {
      const baseFilter = () => {
        let q = from('cash_register_sessions').select('*');
        if (!isAdmin && user?.id) q = q.eq('operador_id', user.id);
        return q;
      };

      // Sessões ABERTAS: sempre trazer todas (sem filtro de data)
      if (statusFilter === 'open') {
        let q = baseFilter().eq('status', 'open').order('opened_at', { ascending: false });
        const { data, error } = await q.execute();
        if (error) { console.warn('Erro ao buscar sessões de caixa:', error); return []; }
        const list = (data || []) as CashSession[];
        return enrichSessionsWithEsperado(list);
      }

      // FECHADAS: só por período
      if (statusFilter === 'closed') {
        let q = baseFilter().eq('status', 'closed');
        const now = new Date();
        if (dateFilter === 'today') {
          q = q.gte('opened_at', startOfDay(now).toISOString()).lte('opened_at', endOfDay(now).toISOString());
        } else if (dateFilter === 'week') {
          const weekAgo = subDays(now, 7);
          q = q.gte('opened_at', startOfDay(weekAgo).toISOString()).lte('opened_at', endOfDay(now).toISOString());
        } else if (dateFilter === 'month') {
          const monthAgo = subDays(now, 30);
          q = q.gte('opened_at', startOfDay(monthAgo).toISOString()).lte('opened_at', endOfDay(now).toISOString());
        } else if (dateFilter === 'custom' && customDateStart && customDateEnd) {
          q = q.gte('opened_at', startOfDay(customDateStart).toISOString()).lte('opened_at', endOfDay(customDateEnd).toISOString());
        }
        q = q.order('opened_at', { ascending: false });
        const { data, error } = await q.execute();
        if (error) { console.warn('Erro ao buscar sessões de caixa:', error); return []; }
        const list = (data || []) as CashSession[];
        return enrichSessionsWithEsperado(list);
      }

      // TODOS: período + sempre incluir sessões abertas (para caixas abertos aparecerem mesmo com opened_at null ou fora do período)
      const now = new Date();
      let qPeriod = baseFilter();
      if (dateFilter === 'today') {
        qPeriod = qPeriod.gte('opened_at', startOfDay(now).toISOString()).lte('opened_at', endOfDay(now).toISOString());
      } else if (dateFilter === 'week') {
        const weekAgo = subDays(now, 7);
        qPeriod = qPeriod.gte('opened_at', startOfDay(weekAgo).toISOString()).lte('opened_at', endOfDay(now).toISOString());
      } else if (dateFilter === 'month') {
        const monthAgo = subDays(now, 30);
        qPeriod = qPeriod.gte('opened_at', startOfDay(monthAgo).toISOString()).lte('opened_at', endOfDay(now).toISOString());
      } else if (dateFilter === 'custom' && customDateStart && customDateEnd) {
        qPeriod = qPeriod.gte('opened_at', startOfDay(customDateStart).toISOString()).lte('opened_at', endOfDay(customDateEnd).toISOString());
      }
      qPeriod = qPeriod.order('opened_at', { ascending: false });

      const [byPeriodRes, openRes] = await Promise.all([
        qPeriod.execute(),
        baseFilter().eq('status', 'open').execute(),
      ]);
      if (byPeriodRes.error) { console.warn('Erro ao buscar sessões de caixa:', byPeriodRes.error); return []; }

      const byPeriod = (byPeriodRes.data || []) as CashSession[];
      const openSessions = (openRes.data || []) as CashSession[];
      const seen = new Set(byPeriod.map(s => s.id));
      const merged = [...byPeriod];
      for (const s of openSessions) {
        if (!seen.has(s.id)) { seen.add(s.id); merged.push(s); }
      }
      merged.sort((a, b) => {
        const aAt = a.opened_at ? new Date(a.opened_at).getTime() : 0;
        const bAt = b.opened_at ? new Date(b.opened_at).getTime() : 0;
        return bAt - aAt;
      });
      return enrichSessionsWithEsperado(merged);
    },
    retry: false,
  });

  const totalsByMethod = useMemo(() => {
    const totals: Record<string, number> = {};
    sessions.forEach(s => {
      const map = (s.totais_forma_pagamento || {}) as Record<string, number>;
      Object.entries(map).forEach(([k, v]) => {
        totals[k] = (totals[k] || 0) + Number(v || 0);
      });
    });
    return totals;
  }, [sessions]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Caixas (Sessões)</CardTitle>
        </CardHeader>
        <CardContent>Carregando...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2">
          <CardTitle>Caixas (Sessões)</CardTitle>
          {Object.keys(totalsByMethod).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(totalsByMethod).map(([forma, valor]) => (
                <Badge key={forma} variant="outline" className="gap-2">
                  <span className="font-medium">{labelForma(forma)}:</span>
                  <span className="font-bold">{currencyFormatters.brl(valor)}</span>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            {statusFilter === 'open'
              ? 'Nenhuma sessão de caixa aberta no momento.'
              : 'Nenhuma sessão de caixa encontrada no período selecionado.'}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Operador(a)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Abertura</TableHead>
                  <TableHead>Fechamento</TableHead>
                  <TableHead className="text-right">Inicial</TableHead>
                  <TableHead className="text-right">Esperado</TableHead>
                  <TableHead className="text-right">Final</TableHead>
                  <TableHead className="text-right">Dif.</TableHead>
                  <TableHead>Formas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map(s => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(s)}>
                    <TableCell className="font-medium">#{s.numero ?? '-'}</TableCell>
                    <TableCell>{s.operador_nome || '-'}</TableCell>
                    <TableCell>
                      <Badge className={s.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {s.status === 'open' ? 'Aberto' : 'Fechado'}
                      </Badge>
                    </TableCell>
                    <TableCell>{s.opened_at ? dateFormatters.short(s.opened_at) : '-'}</TableCell>
                    <TableCell>{s.closed_at ? dateFormatters.short(s.closed_at) : '-'}</TableCell>
                    <TableCell className="text-right">{currencyFormatters.brl(Number(s.valor_inicial || 0))}</TableCell>
                    <TableCell className="text-right">{currencyFormatters.brl(Number(s.valor_esperado || 0))}</TableCell>
                    <TableCell className="text-right">{currencyFormatters.brl(Number(s.valor_final || 0))}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {currencyFormatters.brl(Number(s.divergencia || 0))}
                    </TableCell>
                    <TableCell>
                      {s.totais_forma_pagamento && Object.keys(s.totais_forma_pagamento).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(s.totais_forma_pagamento).map(([forma, valor]) => (
                            <Badge key={forma} variant="outline" className="text-xs">
                              {labelForma(forma)} {currencyFormatters.brl(Number(valor || 0))}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelected(s); }}>
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Caixa #{selected?.numero ?? '-'}</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Operador(a)</div>
                  <div className="font-semibold">{selected.operador_nome || '-'}</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Abertura</div>
                  <div className="font-semibold">{selected.opened_at ? dateFormatters.long(selected.opened_at) : '-'}</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Fechamento</div>
                  <div className="font-semibold">{selected.closed_at ? dateFormatters.long(selected.closed_at) : '-'}</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Diferença</div>
                  <div className="font-bold">{currencyFormatters.brl(Number(selected.divergencia || 0))}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Inicial</div>
                  <div className="font-semibold">{currencyFormatters.brl(Number(selected.valor_inicial || 0))}</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Esperado</div>
                  <div className="font-semibold">{currencyFormatters.brl(Number(selected.valor_esperado ?? selected.valor_inicial ?? 0))}</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Final</div>
                  <div className="font-semibold">{currencyFormatters.brl(Number(selected.valor_final ?? 0))}</div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <div className="font-semibold mb-2">Totais por forma de pagamento</div>
                {selected.totais_forma_pagamento && Object.keys(selected.totais_forma_pagamento).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selected.totais_forma_pagamento).map(([forma, valor]) => (
                      <Badge key={forma} variant="outline" className="gap-2">
                        <span className="font-medium">{labelForma(forma)}:</span>
                        <span className="font-bold">{currencyFormatters.brl(Number(valor || 0))}</span>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Sem totais registrados (caixa ainda aberto ou não conferido)</div>
                )}
              </div>

              {selected.status === 'open' && isAdmin && (
                <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                  <div className="font-semibold">Ações do administrador</div>
                  <div className="flex flex-wrap gap-2">
                    {!showCloseForm && !showMovementForm && (
                      <>
                        <Button variant="destructive" size="sm" onClick={() => setShowCloseForm(true)} className="gap-1">
                          <Lock className="h-4 w-4" /> Fechar caixa
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setMovementType('sangria'); setShowMovementForm(true); }} className="gap-1">
                          <Minus className="h-4 w-4" /> Sangria (retirada)
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setMovementType('suprimento'); setShowMovementForm(true); }} className="gap-1">
                          <Plus className="h-4 w-4" /> Suprimento
                        </Button>
                      </>
                    )}
                  </div>
                  {showCloseForm && (
                    <div className="space-y-2 p-3 border rounded-lg">
                      <Label>Valor final no caixa (R$)</Label>
                      <Input type="text" inputMode="decimal" placeholder="0,00" value={valorFinal} onChange={(e) => setValorFinal(e.target.value)} />
                      <Label>Justificativa (opcional)</Label>
                      <Textarea placeholder="Ex.: Conferido com fechamento" value={justificativa} onChange={(e) => setJustificativa(e.target.value)} rows={2} />
                      <div className="flex gap-2">
                        <Button size="sm" disabled={isSubmitting} onClick={handleCloseCash}>Fechar caixa</Button>
                        <Button size="sm" variant="outline" onClick={() => { setShowCloseForm(false); setValorFinal(''); setJustificativa(''); }}>Cancelar</Button>
                      </div>
                    </div>
                  )}
                  {showMovementForm && (
                    <div className="space-y-2 p-3 border rounded-lg">
                      <Label>{movementType === 'sangria' ? 'Valor da sangria (R$)' : 'Valor do suprimento (R$)'}</Label>
                      <Input type="text" inputMode="decimal" placeholder="0,00" value={movementValor} onChange={(e) => setMovementValor(e.target.value)} />
                      <Label>Motivo (opcional)</Label>
                      <Input placeholder="Ex.: Troco para vendas" value={movementMotivo} onChange={(e) => setMovementMotivo(e.target.value)} />
                      <div className="flex gap-2">
                        <Button size="sm" disabled={isSubmitting} onClick={handleAddMovement}>Registrar</Button>
                        <Button size="sm" variant="outline" onClick={() => { setShowMovementForm(false); setMovementValor(''); setMovementMotivo(''); }}>Cancelar</Button>
                      </div>
                    </div>
                  )}
                  {movements.length > 0 && (
                    <div>
                      <div className="font-medium mb-2">Movimentos desta sessão</div>
                      <div className="border rounded overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Valor</TableHead>
                              <TableHead>Motivo</TableHead>
                              <TableHead>Data</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {movements.map((m: any) => (
                              <TableRow key={m.id}>
                                <TableCell>{m.tipo === 'sangria' ? 'Sangria' : 'Suprimento'}</TableCell>
                                <TableCell>{currencyFormatters.brl(Number(m.valor || 0))}</TableCell>
                                <TableCell>{m.motivo || '-'}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{m.created_at ? dateFormatters.short(m.created_at) : '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}


