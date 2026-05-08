import { useEffect, useMemo, useState } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2, ChevronDown, Plus, Search, Trash2 } from 'lucide-react';
import { currencyFormatters } from '@/utils/formatters';
import { BuscaProdutoSelector, type ProdutoBusca } from './BuscaProdutoSelector';
import { totalCustoPedido, type Pedido, type PedidoItem } from '@/hooks/usePedidos';
import { useFornecedores } from '@/hooks/useFornecedores';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editando: Pedido | null;
  onSubmit: (params: {
    nome: string;
    fornecedor_id: string;
    fornecedor_nome: string;
    itens: PedidoItem[];
    editando: Pedido | null;
  }) => Promise<boolean>;
  onCreateProduto?: (nomeInicial: string, onCreated: (produto: ProdutoBusca) => void) => void;
};

export function PedidoForm({ open, onOpenChange, editando, onSubmit, onCreateProduto }: Props) {
  const [nome, setNome] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [fornecedorNome, setFornecedorNome] = useState('');
  const [itens, setItens] = useState<PedidoItem[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [fornecedorPopoverOpen, setFornecedorPopoverOpen] = useState(false);
  const [fornecedorSearch, setFornecedorSearch] = useState('');
  const [showNovoFornecedorDialog, setShowNovoFornecedorDialog] = useState(false);
  const [novoFornecedorNome, setNovoFornecedorNome] = useState('');
  const { fornecedores, createFornecedor } = useFornecedores();

  const fornecedoresFiltrados = useMemo(() => {
    const q = fornecedorSearch.trim().toLowerCase();
    if (!q) return fornecedores.slice(0, 50);
    return fornecedores.filter((f) => f.nome.toLowerCase().includes(q)).slice(0, 50);
  }, [fornecedores, fornecedorSearch]);

  useEffect(() => {
    if (open) {
      if (editando) {
        setNome(editando.nome);
        setFornecedorId(editando.fornecedor_id || '');
        setFornecedorNome(editando.fornecedor_nome || '');
        setItens(editando.itens.map((i) => ({ ...i })));
      } else {
        setNome('');
        setFornecedorId('');
        setFornecedorNome('');
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
      const ok = await onSubmit({ nome, fornecedor_id: fornecedorId, fornecedor_nome: fornecedorNome, itens, editando });
      if (ok) onOpenChange(false);
    } finally {
      setSalvando(false);
    }
  };

  const handleCreateFornecedor = async () => {
    const nomeTrim = novoFornecedorNome.trim();
    if (!nomeTrim) return;
    const novo = await createFornecedor(nomeTrim);
    setFornecedorId(novo.id);
    setFornecedorNome(novo.nome);
    setNovoFornecedorNome('');
    setShowNovoFornecedorDialog(false);
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
              ? 'Confira fornecedor, itens, custos e venda antes de dar entrada.'
              : 'Escolha o fornecedor e adicione os produtos. O pedido ficará pendente até a chegada.'}
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

          <div>
            <Label className="text-sm">Fornecedor <span className="text-destructive">*</span></Label>
            <Popover open={fornecedorPopoverOpen} onOpenChange={(open) => { setFornecedorPopoverOpen(open); if (!open) setFornecedorSearch(''); }}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="mt-1 w-full justify-between font-normal min-h-[44px] rounded-full touch-manipulation">
                  <span className="truncate">{fornecedorNome || 'Selecione o fornecedor'}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="z-[110] w-[var(--radix-popover-trigger-width)] max-h-[min(320px,calc(100vh-220px))] overflow-hidden p-0" align="start">
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar fornecedor..."
                      value={fornecedorSearch}
                      onChange={(e) => setFornecedorSearch(e.target.value)}
                      className="h-9 pl-8 text-sm"
                      autoFocus
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setNovoFornecedorNome(fornecedorSearch.trim()); setShowNovoFornecedorDialog(true); setFornecedorPopoverOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-green-700 font-medium hover:bg-green-50 border-b"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Cadastrar novo fornecedor
                </button>
                <div
                  className="max-h-[min(220px,calc(100vh-330px))] overflow-y-auto overscroll-contain p-1"
                  onWheel={(event) => event.stopPropagation()}
                  onTouchMove={(event) => event.stopPropagation()}
                >
                  {fornecedoresFiltrados.length > 0 ? (
                    fornecedoresFiltrados.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                        onClick={() => {
                          setFornecedorId(f.id);
                          setFornecedorNome(f.nome);
                          setFornecedorPopoverOpen(false);
                        }}
                      >
                        <span className="truncate">{f.nome}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                      {fornecedorSearch.trim() ? 'Nenhum fornecedor encontrado.' : 'Nenhum fornecedor cadastrado.'}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {fornecedorId ? (
            <BuscaProdutoSelector onSelect={adicionarItem} onCreateProduto={onCreateProduto} />
          ) : (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-sm text-muted-foreground dark:border-gray-700">
              Selecione o fornecedor para liberar a busca de produtos.
            </div>
          )}

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
            disabled={salvando || itens.length === 0 || !nome.trim() || !fornecedorId}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 rounded-full touch-manipulation"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {editando ? 'Salvar alterações' : 'Salvar pedido'}
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={showNovoFornecedorDialog} onOpenChange={setShowNovoFornecedorDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo fornecedor</DialogTitle>
            <DialogDescription>Cadastre o fornecedor do pedido.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="Ex: Loja de Peças XYZ"
              value={novoFornecedorNome}
              onChange={(e) => setNovoFornecedorNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateFornecedor(); } }}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowNovoFornecedorDialog(false); setNovoFornecedorNome(''); }}>Cancelar</Button>
              <Button onClick={handleCreateFornecedor} disabled={!novoFornecedorNome.trim()}>
                Cadastrar e selecionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
