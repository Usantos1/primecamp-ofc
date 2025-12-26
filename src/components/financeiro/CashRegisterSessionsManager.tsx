import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { from } from '@/integrations/db/client';
import { useAuth } from '@/contexts/AuthContext';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';

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
  month: string;
}

function labelForma(forma: string) {
  switch (forma) {
    case 'dinheiro': return 'Dinheiro';
    case 'pix': return 'PIX';
    case 'debito': return 'Débito';
    case 'credito': return 'Crédito';
    case 'link_pagamento': return 'Link';
    case 'carteira_digital': return 'Carteira';
    default: return forma;
  }
}

export function CashRegisterSessionsManager({ month }: Props) {
  const { user, profile, isAdmin } = useAuth();
  const [selected, setSelected] = useState<CashSession | null>(null);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['cash-register-sessions-admin', month, isAdmin, user?.id],
    queryFn: async () => {
      const start = `${month}-01`;
      const end = `${month}-31`;

      let q = from('cash_register_sessions')
        .select('*')
        .gte('opened_at', start)
        .lte('opened_at', end)
        .order('opened_at', { ascending: false });

      // Não-admin vê apenas os próprios caixas
      if (!isAdmin && user?.id) {
        q = q.eq('operador_id', user.id);
      }

      const { data, error } = await q.execute();
      if (error) {
        console.warn('Erro ao buscar sessões de caixa:', error);
        return [];
      }
      return (data || []) as CashSession[];
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
            Nenhuma sessão de caixa encontrada para {month.replace('-', '/')}
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}


