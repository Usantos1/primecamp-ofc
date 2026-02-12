import { useState, useEffect, useCallback } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { from } from '@/integrations/db/client';
import { currencyFormatters } from '@/utils/formatters';
import {
  ClipboardList,
  Plus,
  Package,
  CheckCircle2,
  Trash2,
  Search,
  Loader2,
  Pencil,
  User,
} from 'lucide-react';

const STORAGE_KEY = 'primecamp_pedidos';

type PedidoItem = {
  produto_id: string;
  produto_nome: string;
  codigo?: number;
  referencia?: string;
  quantidade: number;
  valor_compra?: number;
  valor_venda?: number;
};

type Pedido = {
  id: string;
  nome: string;
  itens: PedidoItem[];
  createdAt: string;
  createdBy: string;
  recebido?: boolean;
  receivedBy?: string;
  receivedAt?: string;
};

function loadPedidosFromStorage(): Pedido[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [];
    // Garantir campos de rastreabilidade em pedidos antigos
    return list.map((p: any) => ({
      ...p,
      createdBy: p.createdBy || '—',
      receivedBy: p.receivedBy,
      receivedAt: p.receivedAt,
      itens: (p.itens || []).map((i: any) => ({
        ...i,
        valor_compra: i.valor_compra ?? undefined,
        valor_venda: i.valor_venda ?? undefined,
      })),
    }));
  } catch {
    return [];
  }
}

function savePedidosToStorage(pedidos: Pedido[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pedidos));
}

export default function Pedidos() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const userNome = profile?.display_name || user?.email || 'Usuário';

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [showNovo, setShowNovo] = useState(false);
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);

  const [nomePedido, setNomePedido] = useState('');
  const [itensNovo, setItensNovo] = useState<PedidoItem[]>([]);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [produtosBusca, setProdutosBusca] = useState<{ id: string; nome: string; codigo?: number; referencia?: string }[]>([]);
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [darEntradaId, setDarEntradaId] = useState<string | null>(null);

  useEffect(() => {
    setPedidos(loadPedidosFromStorage());
  }, []);

  const persistPedidos = useCallback((next: Pedido[]) => {
    setPedidos(next);
    savePedidosToStorage(next);
  }, []);

  const buscarProdutos = useCallback(async () => {
    const term = (buscaProduto || '').trim();
    if (!term || term.length < 2) {
      setProdutosBusca([]);
      return;
    }
    setLoadingBusca(true);
    try {
      let query = from('produtos')
        .select('id,nome,codigo,referencia')
        .order('nome', { ascending: true })
        .limit(50);
      const codigoNum = parseInt(term);
      if (!isNaN(codigoNum)) {
        query = query.eq('codigo', codigoNum);
      } else {
        query = query.ilike('nome', `%${term}%`);
      }
      const { data, error } = await query.execute();
      if (error) throw error;
      setProdutosBusca((data || []).map((r: any) => ({
        id: r.id,
        nome: r.nome || '',
        codigo: r.codigo,
        referencia: r.referencia,
      })));
    } catch (e: any) {
      toast({
        title: 'Erro na busca',
        description: e?.message || 'Não foi possível buscar produtos.',
        variant: 'destructive',
      });
      setProdutosBusca([]);
    } finally {
      setLoadingBusca(false);
    }
  }, [buscaProduto, toast]);

  const adicionarItem = (p: { id: string; nome: string; codigo?: number; referencia?: string }) => {
    const ja = itensNovo.find((i) => i.produto_id === p.id);
    if (ja) {
      setItensNovo((prev) =>
        prev.map((i) =>
          i.produto_id === p.id ? { ...i, quantidade: i.quantidade + 1 } : i
        )
      );
    } else {
      setItensNovo((prev) => [
        ...prev,
        {
          produto_id: p.id,
          produto_nome: p.nome,
          codigo: p.codigo,
          referencia: p.referencia,
          quantidade: 1,
        },
      ]);
    }
    setBuscaProduto('');
    setProdutosBusca([]);
  };

  const removerItem = (produto_id: string) => {
    setItensNovo((prev) => prev.filter((i) => i.produto_id !== produto_id));
  };

  const alterarItem = (produto_id: string, upd: Partial<PedidoItem>) => {
    setItensNovo((prev) =>
      prev.map((i) => (i.produto_id === produto_id ? { ...i, ...upd } : i))
    );
  };

  const abrirNovo = () => {
    setNomePedido('');
    setItensNovo([]);
    setEditingPedido(null);
    setShowNovo(true);
  };

  const abrirEdicao = (p: Pedido) => {
    if (p.recebido) return;
    setNomePedido(p.nome);
    setItensNovo(p.itens.map((i) => ({ ...i })));
    setEditingPedido(p);
    setShowNovo(true);
  };

  const salvarPedido = () => {
    const nome = nomePedido.trim();
    if (!nome) {
      toast({ title: 'Nome obrigatório', description: 'Informe o nome do pedido.', variant: 'destructive' });
      return;
    }
    if (itensNovo.length === 0) {
      toast({ title: 'Itens obrigatórios', description: 'Adicione pelo menos um item.', variant: 'destructive' });
      return;
    }
    if (editingPedido) {
      persistPedidos(
        pedidos.map((p) =>
          p.id === editingPedido.id
            ? {
                ...p,
                nome,
                itens: itensNovo.map((i) => ({
                  produto_id: i.produto_id,
                  produto_nome: i.produto_nome,
                  codigo: i.codigo,
                  referencia: i.referencia,
                  quantidade: i.quantidade,
                  valor_compra: i.valor_compra,
                  valor_venda: i.valor_venda,
                })),
              }
            : p
        )
      );
      toast({ title: 'Pedido atualizado', description: `"${nome}" foi alterado.` });
    } else {
      const novo: Pedido = {
        id: crypto.randomUUID(),
        nome,
        itens: itensNovo.map((i) => ({
          produto_id: i.produto_id,
          produto_nome: i.produto_nome,
          codigo: i.codigo,
          referencia: i.referencia,
          quantidade: i.quantidade,
          valor_compra: i.valor_compra,
          valor_venda: i.valor_venda,
        })),
        createdAt: new Date().toISOString(),
        createdBy: userNome,
        recebido: false,
      };
      persistPedidos([...pedidos, novo]);
      toast({ title: 'Pedido criado', description: `"${nome}" foi adicionado à lista.` });
    }
    setShowNovo(false);
    setEditingPedido(null);
  };

  const darEntrada = async (pedido: Pedido) => {
    setDarEntradaId(pedido.id);
    try {
      let totalDespesa = 0;
      for (const item of pedido.itens) {
        const { data: prod, error: errFetch } = await from('produtos')
          .select('id,quantidade,valor_compra,valor_venda,vi_custo,valor_dinheiro_pix')
          .eq('id', item.produto_id)
          .single();
        if (errFetch || !prod) {
          toast({
            title: 'Produto não encontrado',
            description: item.produto_nome,
            variant: 'destructive',
          });
          continue;
        }
        const row = prod as any;
        const atualQtd = Number(row.quantidade ?? 0);
        const novaQtd = atualQtd + item.quantidade;
        const valorCompra = item.valor_compra ?? Number(row.valor_compra ?? row.vi_custo ?? 0);
        const valorVenda = item.valor_venda ?? Number(row.valor_venda ?? row.valor_dinheiro_pix ?? 0);
        totalDespesa += valorCompra * item.quantidade;

        const { error: errUpdate } = await from('produtos')
          .update({
            quantidade: novaQtd,
            ...(item.valor_compra != null && { valor_compra: item.valor_compra, vi_custo: item.valor_compra }),
            ...(item.valor_venda != null && { valor_venda: item.valor_venda, valor_dinheiro_pix: item.valor_venda }),
          })
          .eq('id', item.produto_id);
        if (errUpdate) {
          toast({
            title: 'Erro ao atualizar estoque',
            description: (errUpdate as any)?.message || item.produto_nome,
            variant: 'destructive',
          });
          continue;
        }
      }

      if (totalDespesa > 0) {
        const dueDate = new Date().toISOString().split('T')[0];
        const { error: errBill } = await from('bills_to_pay')
          .insert({
            description: `Entrada de estoque - Pedido: ${pedido.nome}`,
            amount: totalDespesa,
            due_date: dueDate,
            expense_type: 'variavel',
            recurring: false,
            reminder_sent: false,
            status: 'pendente',
            created_by: user?.id,
          })
          .select()
          .execute();
        if (errBill) {
          toast({
            title: 'Estoque atualizado',
            description: 'Despesa em Contas a Pagar não foi criada: ' + (errBill as any)?.message,
            variant: 'destructive',
          });
        }
      }

      persistPedidos(
        pedidos.map((p) =>
          p.id === pedido.id
            ? {
                ...p,
                recebido: true,
                receivedBy: userNome,
                receivedAt: new Date().toISOString(),
              }
            : p
        )
      );
      toast({
        title: 'Entrada concluída',
        description: `Estoque atualizado. ${totalDespesa > 0 ? 'Despesa gerada em Contas a Pagar.' : ''}`,
      });
    } finally {
      setDarEntradaId(null);
    }
  };

  const excluirPedido = (id: string) => {
    persistPedidos(pedidos.filter((p) => p.id !== id));
    toast({ title: 'Pedido removido', description: 'O pedido foi excluído da lista.' });
  };

  const totalPedido = (itens: PedidoItem[]) =>
    itens.reduce((s, i) => s + (i.valor_compra ?? 0) * i.quantidade, 0);

  return (
    <ModernLayout title="Pedidos" subtitle="Crie pedidos e dê entrada no estoque">
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Crie pedidos de compra e, quando receber a mercadoria, use &quot;Dar entrada&quot; para atualizar o estoque e gerar a despesa em Contas a Pagar.
          </p>
          <Button onClick={abrirNovo}>
            <Plus className="h-4 w-4 mr-2" />
            Novo pedido
          </Button>
        </div>

        {pedidos.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle className="text-lg">Nenhum pedido</CardTitle>
              <CardDescription className="mt-2">
                Crie um pedido para listar itens e depois dar entrada no estoque.
              </CardDescription>
              <Button className="mt-4" onClick={abrirNovo}>
                <Plus className="h-4 w-4 mr-2" />
                Novo pedido
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pedidos.map((p) => (
              <Card key={p.id} className={p.recebido ? 'opacity-90' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                          {p.nome}
                          {p.recebido && (
                            <Badge variant="secondary" className="font-normal">
                              Recebido
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1 flex flex-col gap-0.5">
                          <span>{new Date(p.createdAt).toLocaleString('pt-BR')} · {p.itens.length} item(ns)</span>
                          <span className="flex items-center gap-1.5 text-xs">
                            <User className="h-3 w-3" />
                            Criado por: {p.createdBy}
                          </span>
                          {p.recebido && p.receivedBy && (
                            <span className="flex items-center gap-1.5 text-xs">
                              <Package className="h-3 w-3" />
                              Recebido por: {p.receivedBy}
                              {p.receivedAt && ` em ${new Date(p.receivedAt).toLocaleString('pt-BR')}`}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      {!p.recebido && (
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => abrirEdicao(p)}>
                            <Pencil className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => darEntrada(p)}
                            disabled={!!darEntradaId}
                          >
                            {darEntradaId === p.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Package className="h-4 w-4 mr-2" />
                            )}
                            Dar entrada
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => excluirPedido(p.id)}
                            disabled={!!darEntradaId}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto -mx-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">Código</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-right w-20">Qtd</TableHead>
                          <TableHead className="text-right w-24">Custo un.</TableHead>
                          <TableHead className="text-right w-24">Venda un.</TableHead>
                          <TableHead className="text-right w-24">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {p.itens.map((i) => (
                          <TableRow key={i.produto_id}>
                            <TableCell className="font-mono text-muted-foreground">
                              {i.codigo ?? i.referencia ?? '-'}
                            </TableCell>
                            <TableCell>{i.produto_nome}</TableCell>
                            <TableCell className="text-right font-mono">{i.quantidade}</TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {i.valor_compra != null ? currencyFormatters.brl(i.valor_compra) : '—'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {i.valor_venda != null ? currencyFormatters.brl(i.valor_venda) : '—'}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {currencyFormatters.brl((i.valor_compra ?? 0) * i.quantidade)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {totalPedido(p.itens) > 0 && (
                    <p className="text-sm font-medium text-muted-foreground mt-2 text-right">
                      Total do pedido (custo): {currencyFormatters.brl(totalPedido(p.itens))}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showNovo} onOpenChange={(open) => !open && (setShowNovo(false), setEditingPedido(null))}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingPedido ? 'Editar pedido' : 'Novo pedido'}</DialogTitle>
            <CardDescription>
              {editingPedido ? 'Altere nome e itens (custos e vendas serão usados ao dar entrada).' : 'Nome do pedido e itens. Informe custo e venda para atualizar ao dar entrada e gerar despesa.'}
            </CardDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
            <div>
              <Label>Nome do pedido</Label>
              <Input
                placeholder="Ex: Pedido Fornecedor X - Jan/2025"
                value={nomePedido}
                onChange={(e) => setNomePedido(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Buscar produto para adicionar</Label>
              <div className="flex gap-2 mt-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Nome ou código do produto..."
                    value={buscaProduto}
                    onChange={(e) => setBuscaProduto(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), buscarProdutos())}
                  />
                </div>
                <Button type="button" variant="secondary" onClick={buscarProdutos} disabled={loadingBusca}>
                  {loadingBusca ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
                </Button>
              </div>
              {produtosBusca.length > 0 && (
                <ul className="mt-2 border rounded-md divide-y max-h-40 overflow-auto">
                  {produtosBusca.map((prod) => (
                    <li key={prod.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex justify-between items-center"
                        onClick={() => adicionarItem(prod)}
                      >
                        <span className="truncate">{prod.nome}</span>
                        <span className="text-muted-foreground font-mono text-xs shrink-0 ml-2">
                          {prod.codigo ?? prod.referencia ?? ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {itensNovo.length > 0 && (
              <div>
                <Label>Itens do pedido</Label>
                <div className="border rounded-lg overflow-x-auto mt-1">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código / Ref.</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="w-20 text-right">Qtd</TableHead>
                        <TableHead className="w-28 text-right">Custo un. (R$)</TableHead>
                        <TableHead className="w-28 text-right">Venda un. (R$)</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itensNovo.map((i) => (
                        <TableRow key={i.produto_id}>
                          <TableCell className="font-mono text-muted-foreground">
                            {i.codigo ?? i.referencia ?? '-'}
                          </TableCell>
                          <TableCell>{i.produto_nome}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={1}
                              value={i.quantidade}
                              onChange={(e) => alterarItem(i.produto_id, { quantidade: Number(e.target.value) || 0 })}
                              className="w-16 text-right h-8"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              placeholder="0"
                              value={i.valor_compra ?? ''}
                              onChange={(e) => alterarItem(i.produto_id, { valor_compra: parseFloat(e.target.value) || undefined })}
                              className="w-24 text-right h-8"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              placeholder="0"
                              value={i.valor_venda ?? ''}
                              onChange={(e) => alterarItem(i.produto_id, { valor_venda: parseFloat(e.target.value) || undefined })}
                              className="w-24 text-right h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removerItem(i.produto_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total (custo): {currencyFormatters.brl(totalPedido(itensNovo))} — será gerado em Contas a Pagar ao dar entrada.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovo(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarPedido} disabled={itensNovo.length === 0 || !nomePedido.trim()}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {editingPedido ? 'Salvar alterações' : 'Salvar pedido'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModernLayout>
  );
}
