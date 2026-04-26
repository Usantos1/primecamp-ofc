import { useCallback, useEffect, useState } from 'react';
import { from } from '@/integrations/db/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export type PedidoItem = {
  produto_id: string;
  produto_nome: string;
  codigo?: number;
  referencia?: string;
  quantidade: number;
  valor_compra?: number;
  valor_venda?: number;
};

export type Pedido = {
  id: string;
  nome: string;
  itens: PedidoItem[];
  createdAt: string;
  createdBy: string;
  recebido?: boolean;
  receivedBy?: string;
  receivedAt?: string;
};

const PEDIDOS_STORAGE_KEY = 'primecamp_pedidos';

function loadPedidosFromStorage(): Pedido[] {
  try {
    const raw = localStorage.getItem(PEDIDOS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [];
    return list.map((p: any) => ({
      ...p,
      createdBy: p.createdBy ?? '—',
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
  try {
    localStorage.setItem(PEDIDOS_STORAGE_KEY, JSON.stringify(pedidos));
  } catch {
    // ignore
  }
}

function mapDbToPedido(row: any, itens: any[]): Pedido {
  const itensMap = (itens || []).map((i: any) => ({
    produto_id: i.produto_id,
    produto_nome: i.produto_nome ?? '',
    codigo: i.codigo,
    referencia: i.referencia,
    quantidade: Number(i.quantidade ?? 1),
    valor_compra: i.valor_compra != null ? Number(i.valor_compra) : undefined,
    valor_venda: i.valor_venda != null ? Number(i.valor_venda) : undefined,
  }));
  return {
    id: row.id,
    nome: row.nome ?? '',
    itens: itensMap,
    createdAt: row.created_at ?? new Date().toISOString(),
    createdBy: row.created_by_nome ?? '—',
    recebido: row.recebido ?? false,
    receivedBy: row.received_by_nome,
    receivedAt: row.received_at,
  };
}

export function usePedidos() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const userNome = profile?.display_name || user?.email || 'Usuário';
  const companyId = user?.company_id;

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [pedidosFromStorage, setPedidosFromStorage] = useState(false);
  const [darEntradaId, setDarEntradaId] = useState<string | null>(null);

  const loadFromDb = useCallback(async () => {
    setLoading(true);
    try {
      const fields =
        'id,nome,created_at,created_by,created_by_nome,recebido,received_at,received_by,received_by_nome';
      if (!companyId) {
        setPedidos([]);
        setLoading(false);
        return;
      }
      const resCompany = await from('pedidos')
        .select(fields)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .execute();
      if (resCompany.error) throw resCompany.error;

      const list = ((resCompany.data || []) as any[]).slice().sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      if (list.length === 0) {
        const fromStorage = loadPedidosFromStorage();
        setPedidos(fromStorage);
        setPedidosFromStorage(fromStorage.length > 0);
        setLoading(false);
        return;
      }

      setPedidosFromStorage(false);
      const ids = list.map((r: any) => r.id);
      const { data: itensRows, error: errItens } = await from('pedido_itens')
        .select('pedido_id,produto_id,produto_nome,codigo,referencia,quantidade,valor_compra,valor_venda')
        .in('pedido_id', ids)
        .execute();
      if (errItens) throw errItens;

      const itensByPedido = (itensRows || []).reduce(
        (acc: Record<string, any[]>, i: any) => {
          const pid = i.pedido_id;
          if (!acc[pid]) acc[pid] = [];
          acc[pid].push(i);
          return acc;
        },
        {}
      );
      const mapped = list.map((r: any) => mapDbToPedido(r, itensByPedido[r.id] ?? []));
      setPedidos(mapped);
    } catch (e: any) {
      const fromStorage = loadPedidosFromStorage();
      if (fromStorage.length > 0) {
        setPedidos(fromStorage);
        setPedidosFromStorage(true);
      } else {
        setPedidosFromStorage(false);
        toast({
          title: 'Erro ao carregar pedidos',
          description: e?.message || 'Não foi possível carregar os pedidos.',
          variant: 'destructive',
        });
        setPedidos([]);
      }
    } finally {
      setLoading(false);
    }
  }, [companyId, toast]);

  useEffect(() => {
    loadFromDb();
  }, [loadFromDb]);

  const salvarPedido = useCallback(
    async (params: {
      nome: string;
      itens: PedidoItem[];
      editando?: Pedido | null;
    }): Promise<boolean> => {
      const nome = params.nome.trim();
      const editingPedido = params.editando ?? null;

      if (!nome) {
        toast({
          title: 'Nome obrigatório',
          description: 'Informe o nome do pedido.',
          variant: 'destructive',
        });
        return false;
      }
      if (params.itens.length === 0) {
        toast({
          title: 'Itens obrigatórios',
          description: 'Adicione pelo menos um item.',
          variant: 'destructive',
        });
        return false;
      }
      const itensPayload = params.itens.map((i) => ({
        produto_id: i.produto_id,
        produto_nome: i.produto_nome,
        codigo: i.codigo,
        referencia: i.referencia,
        quantidade: i.quantidade,
        valor_compra: i.valor_compra,
        valor_venda: i.valor_venda,
      }));

      try {
        if (editingPedido) {
          const { error: errUpd } = await from('pedidos')
            .update({ nome })
            .eq('id', editingPedido.id)
            .execute();
          if (errUpd) throw errUpd;
          await from('pedido_itens').eq('pedido_id', editingPedido.id).delete().execute();
          for (const item of itensPayload) {
            const { error: errItem } = await from('pedido_itens')
              .insert({
                pedido_id: editingPedido.id,
                ...item,
              })
              .execute();
            if (errItem) throw errItem;
          }
          toast({ title: 'Pedido atualizado', description: `"${nome}" foi alterado.` });
        } else {
          if (!companyId) {
            toast({
              title: 'Erro',
              description: 'Empresa não identificada. Faça login novamente.',
              variant: 'destructive',
            });
            return false;
          }
          const { data: inserted, error: errIns } = await from('pedidos')
            .insert({
              nome,
              company_id: companyId,
              created_by: user?.id ?? null,
              created_by_nome: userNome,
              recebido: false,
            })
            .select('id,created_at,created_by_nome')
            .execute();
          if (errIns || !inserted) throw errIns || new Error('Inserção falhou');
          const row = Array.isArray(inserted) ? inserted[0] : inserted;
          const pedidoId = row?.id;
          if (!pedidoId) throw new Error('ID do pedido não retornado');
          for (const item of itensPayload) {
            const { error: errItem } = await from('pedido_itens')
              .insert({
                pedido_id: pedidoId,
                ...item,
              })
              .execute();
            if (errItem) throw errItem;
          }
          toast({ title: 'Pedido criado', description: `"${nome}" foi adicionado à lista.` });
        }
        await loadFromDb();
        return true;
      } catch (e: any) {
        try {
          if (editingPedido) {
            const next = pedidos.map((p) =>
              p.id === editingPedido.id ? { ...p, nome, itens: itensPayload } : p
            );
            savePedidosToStorage(next);
            setPedidos(next);
            toast({
              title: 'Pedido atualizado',
              description: `"${nome}" foi alterado (salvo localmente).`,
            });
          } else {
            const novo: Pedido = {
              id: crypto.randomUUID(),
              nome,
              itens: itensPayload,
              createdAt: new Date().toISOString(),
              createdBy: userNome,
              recebido: false,
            };
            const next = [novo, ...pedidos];
            savePedidosToStorage(next);
            setPedidos(next);
            toast({
              title: 'Pedido criado',
              description: `"${nome}" foi adicionado (salvo localmente).`,
            });
          }
          return true;
        } catch {
          toast({
            title: editingPedido ? 'Erro ao atualizar' : 'Erro ao criar pedido',
            description: e?.message || 'Tente novamente.',
            variant: 'destructive',
          });
          return false;
        }
      }
    },
    [companyId, loadFromDb, pedidos, toast, user?.id, userNome]
  );

  const darEntrada = useCallback(
    async (pedido: Pedido) => {
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
          const valorCompra =
            item.valor_compra ?? Number(row.valor_compra ?? row.vi_custo ?? 0);
          totalDespesa += valorCompra * item.quantidade;

          const { error: errUpdate } = await from('produtos')
            .update({
              quantidade: novaQtd,
              ...(item.valor_compra != null && {
                valor_compra: item.valor_compra,
                vi_custo: item.valor_compra,
              }),
              ...(item.valor_venda != null && {
                valor_venda: item.valor_venda,
                valor_dinheiro_pix: item.valor_venda,
              }),
            })
            .eq('id', item.produto_id)
            .execute();
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
              description:
                'Despesa em Contas a Pagar não foi criada: ' + (errBill as any)?.message,
              variant: 'destructive',
            });
          }
        }

        const { error: errUpd } = await from('pedidos')
          .update({
            recebido: true,
            received_at: new Date().toISOString(),
            received_by: user?.id ?? null,
            received_by_nome: userNome,
          })
          .eq('id', pedido.id)
          .execute();
        if (errUpd) throw errUpd;

        await loadFromDb();
        toast({
          title: 'Entrada concluída',
          description: `Estoque atualizado.${totalDespesa > 0 ? ' Despesa gerada em Contas a Pagar.' : ''}`,
        });
      } catch (e: any) {
        toast({
          title: 'Erro',
          description: e?.message || 'Não foi possível concluir a entrada.',
          variant: 'destructive',
        });
      } finally {
        setDarEntradaId(null);
      }
    },
    [loadFromDb, toast, user?.id, userNome]
  );

  const excluirPedido = useCallback(
    async (id: string) => {
      try {
        const { error } = await from('pedidos').eq('id', id).delete().execute();
        if (error) throw error;
        await loadFromDb();
        toast({ title: 'Pedido removido', description: 'O pedido foi excluído da lista.' });
      } catch (e: any) {
        const next = pedidos.filter((p) => p.id !== id);
        if (next.length !== pedidos.length) {
          savePedidosToStorage(next);
          setPedidos(next);
          toast({
            title: 'Pedido removido',
            description: 'O pedido foi excluído (apenas local).',
          });
        } else {
          toast({
            title: 'Erro ao excluir',
            description: e?.message || 'Não foi possível excluir o pedido.',
            variant: 'destructive',
          });
        }
      }
    },
    [loadFromDb, pedidos, toast]
  );

  return {
    pedidos,
    loading,
    pedidosFromStorage,
    darEntradaId,
    companyId,
    reload: loadFromDb,
    salvarPedido,
    darEntrada,
    excluirPedido,
  };
}

export const totalCustoPedido = (itens: PedidoItem[]) =>
  itens.reduce((s, i) => s + (i.valor_compra ?? 0) * i.quantidade, 0);
