import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  Package,
  Pencil,
  Trash2,
  User,
  Calendar,
  PackageCheck,
} from 'lucide-react';
import { currencyFormatters } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { PedidoStatusBadge } from './PedidoStatusBadge';
import { totalCustoPedido, type Pedido } from '@/hooks/usePedidos';

type Props = {
  pedido: Pedido;
  onEdit: (p: Pedido) => void;
  onDarEntrada: (p: Pedido) => void;
  onExcluir: (id: string) => void;
  darEntradaLoadingId: string | null;
};

export function PedidoCard({
  pedido: p,
  onEdit,
  onDarEntrada,
  onExcluir,
  darEntradaLoadingId,
}: Props) {
  const total = totalCustoPedido(p.itens);
  const isLoading = darEntradaLoadingId === p.id;
  const anyLoading = !!darEntradaLoadingId;

  return (
    <Card
      className={cn(
        'rounded-xl overflow-hidden min-w-0 transition-shadow hover:shadow-md',
        'border-[3px] border-gray-300 dark:border-gray-700',
        p.recebido && 'border-l-emerald-500/70 dark:border-l-emerald-400/70'
      )}
    >
      <CardHeader className="gap-3 pb-3 pt-3 px-3 sm:pt-4 sm:px-5 sm:pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
                {p.nome}
              </h3>
              <PedidoStatusBadge recebido={!!p.recebido} />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3 shrink-0" />
                {new Date(p.createdAt).toLocaleString('pt-BR')}
              </span>
              <span className="inline-flex items-center gap-1">
                <Package className="h-3 w-3 shrink-0" />
                {p.itens.length} {p.itens.length === 1 ? 'item' : 'itens'}
              </span>
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3 shrink-0" />
                {p.createdBy}
              </span>
              {p.recebido && p.receivedBy && (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <PackageCheck className="h-3 w-3 shrink-0" />
                  {p.receivedBy}
                  {p.receivedAt && ` · ${new Date(p.receivedAt).toLocaleString('pt-BR')}`}
                </span>
              )}
            </div>
          </div>

          {!p.recebido && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(p)}
                disabled={anyLoading}
                className="min-h-[40px] sm:min-h-0 rounded-full touch-manipulation flex-1 sm:flex-initial"
              >
                <Pencil className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
              <Button
                size="sm"
                onClick={() => onDarEntrada(p)}
                disabled={anyLoading}
                className="min-h-[40px] sm:min-h-0 rounded-full touch-manipulation flex-1 sm:flex-initial"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Package className="h-4 w-4 mr-1.5" />
                )}
                Dar entrada
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onExcluir(p.id)}
                disabled={anyLoading}
                className="min-h-[40px] sm:min-h-0 min-w-[40px] rounded-full touch-manipulation text-destructive hover:text-destructive hover:bg-destructive/10"
                aria-label="Excluir pedido"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-3 sm:px-5 pb-4 pt-0">
        {/* Mobile: cards de itens */}
        <div className="md:hidden space-y-2 min-w-0">
          {p.itens.map((i) => (
            <div
              key={i.produto_id}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-muted/40 dark:bg-muted/30 px-3 py-2.5"
            >
              <p className="font-medium text-sm text-foreground truncate">
                {i.produto_nome}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                <span>Cód: {i.codigo ?? i.referencia ?? '—'}</span>
                <span aria-hidden>·</span>
                <span>Qtd: {i.quantidade}</span>
                <span aria-hidden>·</span>
                <span className="text-foreground/80">
                  Custo:{' '}
                  {i.valor_compra != null
                    ? currencyFormatters.brl(i.valor_compra)
                    : '—'}
                </span>
                <span aria-hidden>·</span>
                <span className="text-foreground/80">
                  Venda:{' '}
                  {i.valor_venda != null
                    ? currencyFormatters.brl(i.valor_venda)
                    : '—'}
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground mt-1.5 tabular-nums">
                Total: {currencyFormatters.brl((i.valor_compra ?? 0) * i.quantidade)}
              </p>
            </div>
          ))}
          {total > 0 && (
            <div className="flex justify-between items-center pt-2 mt-1 border-t-2 border-gray-300 dark:border-gray-700">
              <span className="text-sm font-medium text-muted-foreground">
                Total (custo)
              </span>
              <span className="text-base font-bold text-foreground tabular-nums">
                {currencyFormatters.brl(total)}
              </span>
            </div>
          )}
        </div>

        {/* Desktop: tabela */}
        <div className="hidden md:block overflow-x-auto -mx-1 min-w-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20 h-10">Código</TableHead>
                <TableHead className="h-10">Produto</TableHead>
                <TableHead className="text-right w-20 h-10">Qtd</TableHead>
                <TableHead className="text-right w-28 h-10">Custo un.</TableHead>
                <TableHead className="text-right w-28 h-10">Venda un.</TableHead>
                <TableHead className="text-right w-28 h-10">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {p.itens.map((i) => (
                <TableRow key={i.produto_id}>
                  <TableCell className="font-mono text-xs text-muted-foreground py-2.5">
                    {i.codigo ?? i.referencia ?? '—'}
                  </TableCell>
                  <TableCell className="py-2.5 text-foreground">{i.produto_nome}</TableCell>
                  <TableCell className="text-right font-mono py-2.5 text-foreground">
                    {i.quantidade}
                  </TableCell>
                  <TableCell className="text-right font-mono py-2.5 text-foreground/90">
                    {i.valor_compra != null
                      ? currencyFormatters.brl(i.valor_compra)
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono py-2.5 text-foreground/90">
                    {i.valor_venda != null
                      ? currencyFormatters.brl(i.valor_venda)
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono py-2.5 font-semibold text-foreground">
                    {currencyFormatters.brl((i.valor_compra ?? 0) * i.quantidade)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {total > 0 && (
            <div className="flex justify-end items-baseline gap-2 mt-3 pt-3 border-t-2 border-gray-300 dark:border-gray-700">
              <span className="text-sm text-muted-foreground">Total do pedido (custo):</span>
              <span className="text-base font-bold text-foreground tabular-nums">
                {currencyFormatters.brl(total)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
