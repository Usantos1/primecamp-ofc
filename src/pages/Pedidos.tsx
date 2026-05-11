import { useMemo, useState } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardList, Loader2, Plus, Search } from 'lucide-react';
import { usePedidos, totalCustoPedido, type Pedido } from '@/hooks/usePedidos';
import { PedidoCard } from '@/components/pedidos/PedidoCard';
import { PedidoForm } from '@/components/pedidos/PedidoForm';
import type { ProdutoBusca } from '@/components/pedidos/BuscaProdutoSelector';
import { PedidosResumoCards } from '@/components/pedidos/PedidosResumoCards';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/types/financial';
import { currencyFormatters } from '@/utils/formatters';
import { ProductFormOptimized } from '@/components/assistencia/ProductFormOptimized';
import { useProdutosPaginated } from '@/hooks/useProdutosPaginated';
import type { Produto } from '@/types/assistencia';

type StatusFilter = 'todos' | 'pendentes' | 'recebidos';

export default function Pedidos() {
  const {
    pedidos,
    loading,
    pedidosFromStorage,
    darEntradaId,
    companyId,
    salvarPedido,
    darEntrada,
    excluirPedido,
  } = usePedidos();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Pedido | null>(null);
  const [busca, setBusca] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [pedidoEntrada, setPedidoEntrada] = useState<Pedido | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [showProductForm, setShowProductForm] = useState(false);
  const [produtoInicial, setProdutoInicial] = useState<Produto | null>(null);
  const [onProdutoCriado, setOnProdutoCriado] = useState<((produto: ProdutoBusca) => void) | null>(null);
  const { createProduto } = useProdutosPaginated({ pageSize: 1 });

  const pedidosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return pedidos.filter((p) => {
      if (statusFilter === 'pendentes' && p.recebido) return false;
      if (statusFilter === 'recebidos' && !p.recebido) return false;
      if (!termo) return true;
      const inNome = p.nome.toLowerCase().includes(termo);
      const inCriador = (p.createdBy || '').toLowerCase().includes(termo);
      const inFornecedor = (p.fornecedor_nome || '').toLowerCase().includes(termo);
      const inItens = p.itens.some((i) =>
        (i.produto_nome || '').toLowerCase().includes(termo)
      );
      return inNome || inCriador || inFornecedor || inItens;
    });
  }, [pedidos, busca, statusFilter]);

  const abrirNovo = () => {
    setEditing(null);
    setShowForm(true);
  };

  const abrirEdicao = (p: Pedido) => {
    if (p.recebido) return;
    setEditing(p);
    setShowForm(true);
  };

  const handleFormChange = (open: boolean) => {
    setShowForm(open);
    if (!open) setEditing(null);
  };

  const abrirPagamentoEntrada = (p: Pedido) => {
    setPedidoEntrada(p);
    setPaymentMethod('pix');
  };

  const confirmarEntrada = async () => {
    if (!pedidoEntrada) return;
    const ok = await darEntrada(pedidoEntrada, { payment_method: paymentMethod });
    if (ok) setPedidoEntrada(null);
  };

  const entradaTotal = pedidoEntrada ? totalCustoPedido(pedidoEntrada.itens) : 0;

  const abrirCadastroProduto = (nomeInicial: string, onCreated: (produto: ProdutoBusca) => void) => {
    setProdutoInicial({
      id: '',
      nome: nomeInicial,
      descricao: nomeInicial,
      quantidade: 0,
      unidade: 'UN',
      tipo: 'PECA',
    } as Produto);
    setOnProdutoCriado(() => onCreated);
    setShowProductForm(true);
  };

  const salvarProdutoDoPedido = async (payload: Partial<Produto>) => {
    const created = await createProduto({
      ...payload,
      quantidade: 0,
      estoque_atual: 0,
      estoque_grade: undefined,
    });
    onProdutoCriado?.({
      id: created.id,
      nome: created.nome || created.descricao || payload.nome || '',
      codigo: created.codigo,
      referencia: created.referencia,
      valor_compra: created.valor_compra ?? created.preco_custo,
      valor_venda: created.valor_venda ?? created.preco_venda,
    });
    setOnProdutoCriado(null);
    setProdutoInicial(null);
  };

  return (
    <ModernLayout title="Pedidos" subtitle="Crie pedidos e dê entrada no estoque">
      <div className="space-y-4 md:space-y-5 pb-8 min-w-0 [&_button]:rounded-full [&_input]:rounded-full [&_[role=tab]]:rounded-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Pedidos de compra
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Crie pedidos e, ao receber, use{' '}
              <span className="font-medium text-foreground">&quot;Dar entrada&quot;</span>{' '}
              para atualizar o estoque e gerar a despesa em Contas a Pagar.
            </p>
          </div>
          <Button
            onClick={abrirNovo}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-[40px] rounded-full touch-manipulation shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo pedido
          </Button>
        </div>

        {/* Resumo */}
        {!loading && pedidos.length > 0 && <PedidosResumoCards pedidos={pedidos} />}

        {/* Aviso localStorage */}
        {pedidosFromStorage && (
          <Alert
            variant="default"
            className="border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-500/40 rounded-xl"
          >
            <AlertTitle className="text-sm sm:text-base text-amber-900 dark:text-amber-200">
              Lista apenas deste navegador
            </AlertTitle>
            <AlertDescription className="text-xs sm:text-sm text-amber-800 dark:text-amber-300/90">
              Você está vendo só os pedidos salvos neste computador. Para que todos da
              empresa vejam a mesma lista, é preciso que a API exponha as tabelas{' '}
              <strong>pedidos</strong> e <strong>pedido_itens</strong> no backend e que a
              migração{' '}
              <code className="text-[10px] sm:text-xs px-1 py-0.5 rounded bg-amber-200/50 dark:bg-amber-900/40">
                ADD_PEDIDOS_COMPANY_ID
              </code>{' '}
              esteja aplicada no banco.
            </AlertDescription>
          </Alert>
        )}

        {/* Filtros */}
        {!loading && pedidos.length > 0 && (
          <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar por nome, criador ou produto..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 min-h-[44px] sm:min-h-[40px] rounded-full"
              />
            </div>
            <div className="grid h-11 w-full grid-cols-3 overflow-hidden rounded-full md:w-[320px]">
              {[
                { value: 'todos', label: 'Todos' },
                { value: 'pendentes', label: 'Pendentes' },
                { value: 'recebidos', label: 'Recebidos' },
              ].map((item) => {
                const active = statusFilter === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setStatusFilter(item.value as StatusFilter)}
                    className={[
                      'h-full !rounded-none border-y-2 border-r-2 border-gray-300 bg-background text-xs font-semibold transition-colors first:!rounded-l-full first:border-l-2 last:!rounded-r-full dark:border-gray-700 sm:text-sm',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
                    ].join(' ')}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Conteúdo */}
        {loading ? (
          <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center py-10 sm:py-12 text-center px-4">
              <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4 animate-spin" />
              <CardTitle className="text-base sm:text-lg">Carregando pedidos...</CardTitle>
            </CardContent>
          </Card>
        ) : pedidos.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center py-10 sm:py-12 text-center px-4">
              <ClipboardList className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
              <CardTitle className="text-base sm:text-lg">Nenhum pedido</CardTitle>
              <CardDescription className="mt-2 text-sm">
                {!companyId
                  ? 'Faça login para ver os pedidos da sua empresa.'
                  : 'Crie um pedido para listar itens e depois dar entrada no estoque.'}
              </CardDescription>
              {companyId && (
                <Button
                  className="mt-4 min-h-[44px] rounded-full touch-manipulation w-full sm:w-auto"
                  onClick={abrirNovo}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo pedido
                </Button>
              )}
            </CardContent>
          </Card>
        ) : pedidosFiltrados.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center px-4">
              <Search className="h-10 w-10 text-muted-foreground mb-3" />
              <CardTitle className="text-base sm:text-lg">Nenhum pedido encontrado</CardTitle>
              <CardDescription className="mt-2 text-sm">
                Tente ajustar a busca ou os filtros.
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:gap-4">
            {pedidosFiltrados.map((p) => (
              <PedidoCard
                key={p.id}
                pedido={p}
                onEdit={abrirEdicao}
                onDarEntrada={abrirPagamentoEntrada}
                onExcluir={excluirPedido}
                darEntradaLoadingId={darEntradaId}
              />
            ))}
          </div>
        )}
      </div>

      <PedidoForm
        open={showForm}
        onOpenChange={handleFormChange}
        editando={editing}
        onSubmit={salvarPedido}
        onCreateProduto={abrirCadastroProduto}
      />

      <ProductFormOptimized
        open={showProductForm}
        onOpenChange={(open) => {
          setShowProductForm(open);
          if (!open) {
            setProdutoInicial(null);
            setOnProdutoCriado(null);
          }
        }}
        produto={produtoInicial}
        onSave={salvarProdutoDoPedido}
      />

      <Dialog open={!!pedidoEntrada} onOpenChange={(open) => !open && setPedidoEntrada(null)}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Dar entrada no pedido</DialogTitle>
            <DialogDescription>
              Selecione a forma de pagamento usada neste pedido. A despesa será registrada como paga no financeiro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="font-medium text-foreground">{pedidoEntrada?.nome}</p>
              <p className="text-muted-foreground">
                Total do pedido: <span className="font-semibold text-foreground">{currencyFormatters.brl(entradaTotal)}</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pedido-payment-method">Forma de pagamento</Label>
              <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                <SelectTrigger id="pedido-payment-method" className="min-h-[44px] rounded-full">
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setPedidoEntrada(null)}
              disabled={!!darEntradaId}
              className="w-full sm:w-auto min-h-[44px] rounded-full"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarEntrada}
              disabled={!pedidoEntrada || !!darEntradaId}
              className="w-full sm:w-auto min-h-[44px] rounded-full"
            >
              {darEntradaId ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Confirmar entrada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModernLayout>
  );
}
