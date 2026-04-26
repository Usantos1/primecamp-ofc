import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2, Trash2 } from 'lucide-react';
import { currencyFormatters } from '@/utils/formatters';
import { BuscaProdutoSelector, type ProdutoBusca } from './BuscaProdutoSelector';
import { totalCustoPedido, type Pedido, type PedidoItem } from '@/hooks/usePedidos';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editando: Pedido | null;
  onSubmit: (params: {
    nome: string;
    itens: PedidoItem[];
    editando: Pedido | null;
  }) => Promise<boolean>;
};

export function PedidoForm({ open, onOpenChange, editando, onSubmit }: Props) {
  const [nome, setNome] = useState('');
  const [itens, setItens] = useState<PedidoItem[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) {
      if (editando) {
        setNome(editando.nome);
        setItens(editando.itens.map((i) => ({ ...i })));
      } else {
        setNome('');
        setItens([]);
      }
    }
  }, [open, editando]);

  const adicionarItem = (p: ProdutoBusca) => {
    setItens((prev) => {
      const ja = prev.find((i) => i.produto_id === p.id);
      if (ja) {
        return prev.map((i) =>
          i.produto_id === p.id ? { ...i, quantidade: i.quantidade + 1 } : i
        );
      }
      return [
        ...prev,
        {
          produto_id: p.id,
          produto_nome: p.nome,
          codigo: p.codigo,
          referencia: p.referencia,
          quantidade: 1,
        },
      ];
    });
  };

  const removerItem = (produto_id: string) => {
    setItens((prev) => prev.filter((i) => i.produto_id !== produto_id));
  };

  const alterarItem = (produto_id: string, upd: Partial<PedidoItem>) => {
    setItens((prev) =>
      prev.map((i) => (i.produto_id === produto_id ? { ...i, ...upd } : i))
    );
  };

  const handleSubmit = async () => {
    setSalvando(true);
    try {
      const ok = await onSubmit({ nome, itens, editando });
      if (ok) onOpenChange(false);
    } finally {
      setSalvando(false);
    }
  };

  const total = totalCustoPedido(itens);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col rounded-xl sm:rounded-lg [&_button]:rounded-full [&_input]:rounded-full">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base sm:text-lg">
            {editando ? 'Editar pedido' : 'Novo pedido'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {editando
              ? 'Altere nome e itens (custos e vendas serão usados ao dar entrada).'
              : 'Nome do pedido e itens. Informe custo e venda para atualizar ao dar entrada e gerar despesa.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
          <div>
            <Label className="text-sm">Nome do pedido</Label>
            <Input
              placeholder="Ex: Pedido Fornecedor X - Jan/2026"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mt-1 min-h-[44px] rounded-full touch-manipulation"
            />
          </div>

          <BuscaProdutoSelector onSelect={adicionarItem} />

          {itens.length > 0 && (
            <div>
              <Label>Itens do pedido</Label>
              <div className="border-2 border-gray-300 dark:border-gray-700 rounded-lg overflow-x-auto mt-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-10">Código / Ref.</TableHead>
                      <TableHead className="h-10">Produto</TableHead>
                      <TableHead className="w-20 h-10 text-right">Qtd</TableHead>
                      <TableHead className="w-28 h-10 text-right">Custo un. (R$)</TableHead>
                      <TableHead className="w-28 h-10 text-right">Venda un. (R$)</TableHead>
                      <TableHead className="w-10 h-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((i) => (
                      <TableRow key={i.produto_id}>
                        <TableCell className="font-mono text-xs text-muted-foreground py-2">
                          {i.codigo ?? i.referencia ?? '—'}
                        </TableCell>
                        <TableCell className="py-2 text-foreground">{i.produto_nome}</TableCell>
                        <TableCell className="text-right py-2">
                          <Input
                            type="number"
                            min={1}
                            value={i.quantidade}
                            onChange={(e) =>
                              alterarItem(i.produto_id, {
                                quantidade: Number(e.target.value) || 0,
                              })
                            }
                            className="w-16 rounded-full text-right h-8"
                          />
                        </TableCell>
                        <TableCell className="text-right py-2">
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            placeholder="0"
                            value={i.valor_compra ?? ''}
                            onChange={(e) =>
                              alterarItem(i.produto_id, {
                                valor_compra: parseFloat(e.target.value) || undefined,
                              })
                            }
                            className="w-24 rounded-full text-right h-8"
                          />
                        </TableCell>
                        <TableCell className="text-right py-2">
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            placeholder="0"
                            value={i.valor_venda ?? ''}
                            onChange={(e) =>
                              alterarItem(i.produto_id, {
                                valor_venda: parseFloat(e.target.value) || undefined,
                              })
                            }
                            className="w-24 rounded-full text-right h-8"
                          />
                        </TableCell>
                        <TableCell className="py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removerItem(i.produto_id)}
                            aria-label="Remover item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end items-baseline gap-2 mt-2 text-sm">
                <span className="text-muted-foreground">Total (custo):</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {currencyFormatters.brl(total)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Será gerado em Contas a Pagar ao dar entrada.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={salvando}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 rounded-full touch-manipulation"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={salvando || itens.length === 0 || !nome.trim()}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 rounded-full touch-manipulation"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {editando ? 'Salvar alterações' : 'Salvar pedido'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
