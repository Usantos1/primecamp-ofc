import { useMemo, useState } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ClipboardList, Loader2, Plus, Search } from 'lucide-react';
import { usePedidos, type Pedido } from '@/hooks/usePedidos';
import { PedidoCard } from '@/components/pedidos/PedidoCard';
import { PedidoForm } from '@/components/pedidos/PedidoForm';
import { PedidosResumoCards } from '@/components/pedidos/PedidosResumoCards';

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

  const pedidosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return pedidos.filter((p) => {
      if (statusFilter === 'pendentes' && p.recebido) return false;
      if (statusFilter === 'recebidos' && !p.recebido) return false;
      if (!termo) return true;
      const inNome = p.nome.toLowerCase().includes(termo);
      const inCriador = (p.createdBy || '').toLowerCase().includes(termo);
      const inItens = p.itens.some((i) =>
        (i.produto_nome || '').toLowerCase().includes(termo)
      );
      return inNome || inCriador || inItens;
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
            <Tabs
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              className="w-full md:w-auto"
            >
              <TabsList className="grid grid-cols-3 w-full md:w-auto rounded-full border-2 border-gray-300 dark:border-gray-700 p-1">
                <TabsTrigger value="todos" className="text-xs sm:text-sm">
                  Todos
                </TabsTrigger>
                <TabsTrigger value="pendentes" className="text-xs sm:text-sm">
                  Pendentes
                </TabsTrigger>
                <TabsTrigger value="recebidos" className="text-xs sm:text-sm">
                  Recebidos
                </TabsTrigger>
              </TabsList>
            </Tabs>
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
                onDarEntrada={darEntrada}
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
      />
    </ModernLayout>
  );
}
