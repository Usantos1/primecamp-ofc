import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sale, SaleFormData, SaleItem, SaleItemFormData,
  Payment, PaymentFormData,
  CashRegisterSession, CashRegisterSessionFormData,
  CashMovement, CashMovementFormData,
  Warranty, WarrantyFormData,
  Document,
  AuditLog,
  CancelRequest, CancelRequestFormData,
  SaleStatus, PaymentStatus, PaymentMethod
} from '@/types/pdv';

// ==================== HOOK: VENDAS (SALES) ====================

export function useSales() {
  const auth = useAuth();
  const user = auth?.user || null;
  const profile = auth?.profile || null;
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar vendas
  const loadSales = useCallback(async () => {
    try {
      setIsLoading(true);
      const isAdmin = profile?.role === 'admin';
      let query: any = supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      // Non-admin: only own sales
      if (!isAdmin && user?.id) {
        query = query.eq('vendedor_id', user.id);
      }

      // Load more history to avoid empty screens
      query = query.limit(isAdmin ? 2000 : 500);

      const { data, error } = await query;

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.role, user?.id]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  // Criar venda
  const createSale = useCallback(async (data: SaleFormData): Promise<Sale> => {
    try {
      // Gerar número da venda
      const { data: numeroData } = await supabase.rpc('generate_sale_number');
      const numero = numeroData || 1;

      // Validar UUID do cliente
      const isValidUUID = (str: string | undefined | null): boolean => {
        if (!str) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };

      const saleData = {
        numero,
        status: 'draft' as SaleStatus,
        cliente_id: data.cliente_id && isValidUUID(data.cliente_id) ? data.cliente_id : null,
        cliente_nome: data.cliente_nome || null,
        cliente_cpf_cnpj: data.cliente_cpf_cnpj || null,
        cliente_telefone: data.cliente_telefone || null,
        ordem_servico_id: data.ordem_servico_id && isValidUUID(data.ordem_servico_id) ? data.ordem_servico_id : null,
        vendedor_id: user?.id || null,
        vendedor_nome: profile?.display_name || user?.user_metadata?.name || user?.email || null,
        observacoes: data.observacoes || null,
        is_draft: data.is_draft ?? true,
        subtotal: 0,
        desconto_total: 0,
        total: 0,
        total_pago: 0,
      };

      const { data: newSale, error } = await supabase
        .from('sales')
        .insert(saleData)
        .select()
        .single();

      if (error) throw error;

      // Log de auditoria
      await logAudit('create', 'sale', newSale.id, null, newSale, 'Venda criada');

      setSales(prev => [newSale, ...prev]);
      return newSale;
    } catch (error) {
      console.error('Erro ao criar venda:', error);
      throw error;
    }
  }, [user, profile]);

  // Atualizar venda
  const updateSale = useCallback(async (id: string, data: Partial<SaleFormData>): Promise<Sale> => {
    try {
      const oldSale = sales.find(s => s.id === id);
      
      // Validar UUIDs antes de atualizar
      const isValidUUID = (str: string | undefined | null): boolean => {
        if (!str) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };

      const updateData: any = { ...data };
      if (updateData.cliente_id !== undefined) {
        updateData.cliente_id = updateData.cliente_id && isValidUUID(updateData.cliente_id) ? updateData.cliente_id : null;
      }
      if (updateData.ordem_servico_id !== undefined) {
        updateData.ordem_servico_id = updateData.ordem_servico_id && isValidUUID(updateData.ordem_servico_id) ? updateData.ordem_servico_id : null;
      }
      
      const { data: updatedSale, error } = await supabase
        .from('sales')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log de auditoria
      await logAudit('update', 'sale', id, oldSale, updatedSale, 'Venda atualizada');

      setSales(prev => prev.map(s => s.id === id ? updatedSale : s));
      return updatedSale;
    } catch (error) {
      console.error('Erro ao atualizar venda:', error);
      throw error;
    }
  }, [sales]);

  // Finalizar venda
  const finalizeSale = useCallback(async (id: string): Promise<Sale> => {
    try {
      // Buscar venda do banco se não encontrar no estado
      let sale = sales.find(s => s.id === id);
      if (!sale) {
        const { data: saleData, error: saleError } = await supabase
          .from('sales')
          .select('*')
          .eq('id', id)
          .single();
        if (saleError || !saleData) throw new Error('Venda não encontrada');
        sale = saleData as Sale;
      }

      // Verificar se a venda já foi finalizada
      if (sale.status === 'paid' || sale.status === 'partial') {
        throw new Error('Esta venda já foi finalizada e não pode ser faturada novamente');
      }

      // Calcular totais
      const { data: items } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', id);

      const subtotal = items?.reduce((sum, item) => sum + Number(item.valor_unitario) * Number(item.quantidade), 0) || 0;
      const desconto_total = items?.reduce((sum, item) => sum + Number(item.desconto || 0), 0) || 0;
      const total = subtotal - desconto_total;

      // Calcular total pago
      const { data: payments } = await supabase
        .from('payments')
        .select('valor')
        .eq('sale_id', id)
        .eq('status', 'confirmed');

      const total_pago = payments?.reduce((sum, p) => sum + Number(p.valor), 0) || 0;

      // Determinar status
      let status: SaleStatus = 'open';
      if (total_pago >= total) {
        status = 'paid';
      } else if (total_pago > 0) {
        status = 'partial';
      }

      // Buscar sessão de caixa atual (opcional - não falha se não houver)
      let cashSessionId = null;
      try {        let cashQuery: any = supabase
          .from('cash_register_sessions')
          .select('id')
          .eq('status', 'open')
          .order('opened_at', { ascending: false })
          .limit(1);

        // Vincular ao caixa do operador atual (nÃ£o ao Ãºltimo de qualquer pessoa)
        if (user?.id) {
          cashQuery = cashQuery.eq('operador_id', user.id);
        }

        const { data: currentCashSession } = await cashQuery.single();
        cashSessionId = currentCashSession?.id || null;
      } catch (error) {
        // Não falhar se não houver sessão de caixa aberta ou se a tabela não existir
        console.warn('Nenhuma sessão de caixa aberta encontrada, continuando sem vincular...');
      }

      // Preparar dados de atualização
      const updateData: any = {
        status,
        subtotal,
        desconto_total,
        total,
        total_pago,
        is_draft: false,
        finalized_at: new Date().toISOString(),
      };

      // SEMPRE tentar vincular ao caixa se houver sessão aberta
      let updatedSale;
      let error;
      
      // Sempre incluir cash_register_session_id se houver sessão
      if (cashSessionId) {
        updateData.cash_register_session_id = cashSessionId;
      }
      
      // Tentar atualizar a venda
      const result = await supabase
        .from('sales')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      updatedSale = result.data;
      error = result.error;
      
      // Se der erro de coluna não encontrada (PGRST204), tentar sem o campo
      if (error && error.code === 'PGRST204' && cashSessionId) {
        console.warn('Coluna cash_register_session_id não existe, tentando sem vincular ao caixa...');
        const { cash_register_session_id, ...updateDataWithoutCash } = updateData;
        const retryResult = await supabase
          .from('sales')
          .update(updateDataWithoutCash)
          .eq('id', id)
          .select()
          .single();
        
        updatedSale = retryResult.data;
        error = retryResult.error;
      }
      
      // Log para debug
      if (cashSessionId) {
        console.log(`Venda ${id} vinculada ao caixa ${cashSessionId}`);
      } else {
        console.warn(`Venda ${id} finalizada SEM sessão de caixa aberta`);
      }

      if (error) throw error;

      // Log de auditoria
      await logAudit('update', 'sale', id, sale, updatedSale, 'Venda finalizada');

      // Baixar estoque (o trigger também faz isso, mas garantimos aqui também)
      if (items) {
        for (const item of items) {
          if (item.produto_id && item.produto_tipo === 'produto') {
            try {
              const { error: stockError } = await supabase.rpc('decrement_stock', {
                produto_id: item.produto_id,
                quantidade: item.quantidade
              });
              if (stockError) {
                console.error(`Erro ao baixar estoque do produto ${item.produto_id}:`, stockError);
              }
            } catch (error) {
              console.error(`Erro ao baixar estoque do produto ${item.produto_id}:`, error);
            }
          }
        }
      }

      // Marcar estoque como baixado (o trigger também faz isso, mas garantimos)
      await supabase
        .from('sales')
        .update({ stock_decremented: true })
        .eq('id', id);

      // Integrar ao financeiro (cria transações e contas a receber)
      try {
        await (supabase.rpc as any)('integrate_sale_to_financial', {
          p_sale_id: id
        });
      } catch (error) {
        console.error('Erro ao integrar venda ao financeiro:', error);
        // Não falhar a venda se a integração financeira falhar
      }

      // Faturar OS se houver vínculo
      if (updatedSale.ordem_servico_id) {
        try {
          await (supabase.rpc as any)('fatura_os_from_sale', {
            p_sale_id: id
          });
        } catch (error) {
          console.error('Erro ao faturar OS:', error);
          // Não falhar a venda se o faturamento da OS falhar
        }
      }

      // Atualizar estado - adicionar se não existir, atualizar se existir
      setSales(prev => {
        const exists = prev.find(s => s.id === id);
        if (exists) {
          return prev.map(s => s.id === id ? (updatedSale as Sale) : s);
        } else {
          return [...prev, updatedSale as Sale];
        }
      });
      return updatedSale as Sale;
    } catch (error) {
      console.error('Erro ao finalizar venda:', error);
      throw error;
    }
  }, [sales]);

  // Cancelar venda
  const cancelSale = useCallback(async (id: string, reason?: string): Promise<Sale> => {
    try {
      // Buscar venda do banco se não encontrar no estado
      let sale = sales.find(s => s.id === id);
      if (!sale) {
        const { data: saleData, error: saleError } = await supabase
          .from('sales')
          .select('*')
          .eq('id', id)
          .single();
        if (saleError || !saleData) throw new Error('Venda não encontrada');
        sale = saleData as Sale;
      }

      const { data: updatedSale, error } = await supabase
        .from('sales')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          canceled_by: user?.id || null,
          cancel_reason: reason || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Reverter estoque se foi baixado
      if ((sale as any).stock_decremented) {
        try {
          const { error: revertError } = await (supabase.rpc as any)('revert_stock_from_sale', {
            p_sale_id: id
          });
          if (revertError) {
            console.error('Erro ao reverter estoque:', revertError);
            // Não falhar o cancelamento se a reversão de estoque falhar
          } else {
            console.log('Estoque revertido com sucesso para a venda cancelada:', id);
          }
        } catch (error) {
          console.error('Erro ao reverter estoque:', error);
          // Não falhar o cancelamento se a reversão de estoque falhar
        }
      }

      // Cancelar/remover transações financeiras e contas a receber
      // (As transações podem ser mantidas para auditoria, mas as contas a receber devem ser canceladas)
      try {
        await (supabase.from as any)('accounts_receivable')
          .update({ status: 'cancelado' })
          .eq('sale_id', id);
      } catch (error) {
        console.error('Erro ao cancelar contas a receber:', error);
      }

      // Log de auditoria
      await logAudit('cancel', 'sale', id, sale, updatedSale, `Venda cancelada: ${reason || 'Sem motivo'}`);

      // Atualizar estado - adicionar se não existir, atualizar se existir
      setSales(prev => {
        const exists = prev.find(s => s.id === id);
        if (exists) {
          return prev.map(s => s.id === id ? (updatedSale as Sale) : s);
        } else {
          return [...prev, updatedSale as Sale];
        }
      });
      return updatedSale as Sale;
    } catch (error) {
      console.error('Erro ao cancelar venda:', error);
      throw error;
    }
  }, [sales, user]);

  // Deletar venda
  const deleteSale = useCallback(async (id: string, force: boolean = false): Promise<void> => {
    try {
      // Buscar venda do banco se não encontrar no estado
      let sale = sales.find(s => s.id === id);
      if (!sale) {
        const { data: saleData, error: saleError } = await supabase
          .from('sales')
          .select('*')
          .eq('id', id)
          .single();
        if (saleError || !saleData) throw new Error('Venda não encontrada');
        sale = saleData as Sale;
      }
      
      // Se não for rascunho e não tiver permissão para forçar, não permitir
      if (!sale.is_draft && !force) {
        throw new Error('Apenas rascunhos podem ser excluídos. Use cancelar para vendas finalizadas.');
      }
      
      // Se for venda finalizada e tiver estoque baixado, reverter
      if (!sale.is_draft && (sale as any).stock_decremented) {
        try {
          const { error: revertError } = await (supabase.rpc as any)('revert_stock_from_sale', {
            p_sale_id: id
          });
          if (revertError) {
            console.error('Erro ao reverter estoque:', revertError);
            // Não falhar a exclusão se a reversão de estoque falhar, mas logar o erro
          } else {
            console.log('Estoque revertido com sucesso para a venda excluída:', id);
          }
        } catch (error) {
          console.error('Erro ao reverter estoque:', error);
          // Não falhar a exclusão se a reversão de estoque falhar
        }
      }
      
      // Se tiver contas a receber, cancelar
      if (!sale.is_draft) {
        try {
          await (supabase.from as any)('accounts_receivable')
            .update({ status: 'cancelado' })
            .eq('sale_id', id);
        } catch (error) {
          console.error('Erro ao cancelar contas a receber:', error);
        }
      }

      console.log('Deletando itens da venda:', id);
      // Deletar itens primeiro (cascade)
      const { error: itemsError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', id);
      
      if (itemsError) {
        console.error('Erro ao deletar itens:', itemsError);
        throw itemsError;
      }

      console.log('Deletando pagamentos da venda:', id);
      // Deletar pagamentos
      const { error: paymentsError } = await supabase
        .from('payments')
        .delete()
        .eq('sale_id', id);
      
      if (paymentsError) {
        console.error('Erro ao deletar pagamentos:', paymentsError);
        throw paymentsError;
      }

      console.log('Deletando a venda:', id);
      // Deletar a venda
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar venda:', error);
        throw error;
      }

      console.log('Venda deletada com sucesso, removendo do estado local');
      // Remover do estado local
      setSales(prev => {
        const filtered = prev.filter(s => s.id !== id);
        console.log(`Estado atualizado: ${prev.length} -> ${filtered.length} vendas`);
        return filtered;
      });
      
      // Forçar recarregamento do banco para garantir sincronização
      console.log('Forçando recarregamento do banco...');
      try {
        const { data: updatedSales, error: loadError } = await supabase
          .from('sales')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (!loadError && updatedSales) {
          console.log(`Banco recarregado: ${updatedSales.length} vendas encontradas`);
          setSales(updatedSales as Sale[]);
        } else if (loadError) {
          console.error('Erro ao recarregar do banco:', loadError);
        }
      } catch (reloadError) {
        console.error('Erro ao forçar recarregamento:', reloadError);
      }

      // Log de auditoria (não bloquear se falhar)
      try {
        await logAudit('delete', 'sale', id, sale, null, 'Venda excluída');
      } catch (auditError) {
        console.error('Erro ao registrar log de auditoria:', auditError);
        // Não falhar a exclusão se o log falhar
      }
      
      console.log('=== EXCLUSÃO CONCLUÍDA COM SUCESSO ===');
    } catch (error) {
      console.error('Erro ao deletar venda:', error);
      throw error;
    }
  }, [sales]);

  // Buscar venda por ID
  const getSaleById = useCallback(async (id: string): Promise<Sale | null> => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          items:sale_items(*),
          payments:payments(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao buscar venda:', error);
      return null;
    }
  }, []);

  return {
    sales,
    isLoading,
    createSale,
    updateSale,
    finalizeSale,
    cancelSale,
    deleteSale,
    getSaleById,
    refreshSales: loadSales,
  };
}

// ==================== HOOK: ITENS DA VENDA ====================

export function useSaleItems(saleId: string) {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSaleId, setCurrentSaleId] = useState(saleId);

  // Atualizar saleId quando mudar
  useEffect(() => {
    setCurrentSaleId(saleId);
  }, [saleId]);

  const loadItems = useCallback(async (targetSaleId?: string) => {
    const idToUse = targetSaleId || currentSaleId;
    if (!idToUse) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', idToUse)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentSaleId]);

  useEffect(() => {
    if (currentSaleId) {
      loadItems();
    }
  }, [currentSaleId, loadItems]);

  const addItem = useCallback(async (itemData: SaleItemFormData, targetSaleId?: string): Promise<SaleItem> => {
    try {
      const idToUse = targetSaleId || currentSaleId;
      if (!idToUse) {
        throw new Error('ID da venda é obrigatório para adicionar itens');
      }

      // Validar UUID do produto
      const isValidUUID = (str: string | undefined | null): boolean => {
        if (!str) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };

      // Normalizar tipo do produto
      const normalizeProdutoTipo = (tipo: any): 'produto' | 'servico' | null => {
        if (!tipo) return null;
        const tipoStr = String(tipo).toLowerCase();
        if (tipoStr === 'servico' || tipoStr === 'serviço') return 'servico';
        if (tipoStr === 'produto' || tipoStr === 'peca' || tipoStr === 'peça') return 'produto';
        return null;
      };

      const valor_total = (itemData.valor_unitario * itemData.quantidade) - (itemData.desconto || 0);

      const { data: newItem, error } = await supabase
        .from('sale_items')
        .insert({
          sale_id: idToUse,
          produto_id: itemData.produto_id && isValidUUID(itemData.produto_id) ? itemData.produto_id : null,
          produto_nome: itemData.produto_nome,
          produto_codigo: itemData.produto_codigo || null,
          produto_codigo_barras: itemData.produto_codigo_barras || null,
          produto_tipo: normalizeProdutoTipo(itemData.produto_tipo),
          quantidade: itemData.quantidade,
          valor_unitario: itemData.valor_unitario,
          desconto: itemData.desconto || 0,
          valor_total,
          observacao: itemData.observacao || null,
          garantia_dias: itemData.garantia_dias || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar totais da venda
      await updateSaleTotals(idToUse);

      // Se for a mesma venda, atualizar o estado
      if (idToUse === currentSaleId) {
        setItems(prev => [...prev, newItem]);
      }
      return newItem;
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      throw error;
    }
  }, [currentSaleId]);

  const updateItem = useCallback(async (id: string, itemData: Partial<SaleItemFormData>): Promise<SaleItem> => {
    try {
      const item = items.find(i => i.id === id);
      if (!item) throw new Error('Item não encontrado');

      // Validar UUID do produto
      const isValidUUID = (str: string | undefined | null): boolean => {
        if (!str) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };

      const quantidade = itemData.quantidade ?? item.quantidade;
      const valor_unitario = itemData.valor_unitario ?? item.valor_unitario;
      const desconto = itemData.desconto ?? item.desconto;
      const valor_total = (valor_unitario * quantidade) - desconto;

      // Normalizar tipo do produto
      const normalizeProdutoTipo = (tipo: any): 'produto' | 'servico' | null => {
        if (!tipo) return null;
        const tipoStr = String(tipo).toLowerCase();
        if (tipoStr === 'servico' || tipoStr === 'serviço') return 'servico';
        if (tipoStr === 'produto' || tipoStr === 'peca' || tipoStr === 'peça') return 'produto';
        return null;
      };

      const updateData: any = { ...itemData };
      if (updateData.produto_id !== undefined) {
        updateData.produto_id = updateData.produto_id && isValidUUID(updateData.produto_id) ? updateData.produto_id : null;
      }
      if (updateData.produto_tipo !== undefined) {
        updateData.produto_tipo = normalizeProdutoTipo(updateData.produto_tipo);
      }

      const { data: updatedItem, error } = await supabase
        .from('sale_items')
        .update({
          ...updateData,
          valor_total,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Atualizar totais da venda
      await updateSaleTotals(currentSaleId);

      setItems(prev => prev.map(i => i.id === id ? updatedItem : i));
      return updatedItem;
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      throw error;
    }
  }, [items, currentSaleId]);

  const removeItem = useCallback(async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('sale_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Atualizar totais da venda
      await updateSaleTotals(currentSaleId);

      setItems(prev => prev.filter(i => i.id !== id));
    } catch (error) {
      console.error('Erro ao remover item:', error);
      throw error;
    }
  }, [currentSaleId]);

  return {
    items,
    isLoading,
    addItem,
    updateItem,
    removeItem,
    refreshItems: loadItems,
  };
}

// Função auxiliar para atualizar totais da venda
async function updateSaleTotals(saleId: string) {
  try {
    const { data: items } = await supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', saleId);

    const subtotal = items?.reduce((sum, item) => sum + Number(item.valor_unitario) * Number(item.quantidade), 0) || 0;
    const desconto_total = items?.reduce((sum, item) => sum + Number(item.desconto || 0), 0) || 0;
    const total = subtotal - desconto_total;

    await supabase
      .from('sales')
      .update({ subtotal, desconto_total, total })
      .eq('id', saleId);
  } catch (error) {
    console.error('Erro ao atualizar totais:', error);
  }
}

// ==================== HOOK: PAGAMENTOS ====================

export function usePayments(saleId: string) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPayments = useCallback(async () => {
    if (!saleId) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [saleId]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const addPayment = useCallback(async (paymentData: PaymentFormData): Promise<Payment> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const valor_parcela = paymentData.parcelas && paymentData.parcelas > 1
        ? paymentData.valor / paymentData.parcelas
        : paymentData.valor;

      const { data: newPayment, error } = await supabase
        .from('payments')
        .insert({
          sale_id: saleId,
          forma_pagamento: paymentData.forma_pagamento,
          valor: paymentData.valor,
          troco: paymentData.troco || 0,
          parcelas: paymentData.parcelas || 1,
          taxa_juros: paymentData.taxa_juros || 0,
          valor_parcela: valor_parcela,
          bandeira: paymentData.bandeira || null,
          taxa_cartao: paymentData.taxa_cartao || 0,
          link_pagamento_url: paymentData.link_pagamento_url || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar total pago da venda
      await updateSalePaidTotal(saleId);

      setPayments(prev => [...prev, newPayment]);
      return newPayment;
    } catch (error) {
      console.error('Erro ao adicionar pagamento:', error);
      throw error;
    }
  }, [saleId]);

  const confirmPayment = useCallback(async (id: string): Promise<Payment> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: updatedPayment, error } = await supabase
        .from('payments')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          confirmed_by: user?.id || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Atualizar total pago da venda
      await updateSalePaidTotal(saleId);
      
      // Atualizar status da venda baseado no total pago
      const { data: saleData } = await supabase
        .from('sales')
        .select('total, total_pago')
        .eq('id', saleId)
        .single();
      
      if (saleData) {
        const total = Number(saleData.total);
        const totalPago = Number(saleData.total_pago);
        let newStatus: SaleStatus = 'open';
        
        if (totalPago >= total && total > 0) {
          newStatus = 'paid';
        } else if (totalPago > 0) {
          newStatus = 'partial';
        }
        
        await supabase
          .from('sales')
          .update({ status: newStatus })
          .eq('id', saleId);
      }

      setPayments(prev => prev.map(p => p.id === id ? updatedPayment : p));
      return updatedPayment;
    } catch (error) {
      console.error('Erro ao confirmar pagamento:', error);
      throw error;
    }
  }, [saleId]);

  const cancelPayment = useCallback(async (id: string, reason?: string): Promise<Payment> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: updatedPayment, error } = await supabase
        .from('payments')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          canceled_by: user?.id || null,
          cancel_reason: reason || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Atualizar total pago da venda
      await updateSalePaidTotal(saleId);

      setPayments(prev => prev.map(p => p.id === id ? updatedPayment : p));
      return updatedPayment;
    } catch (error) {
      console.error('Erro ao cancelar pagamento:', error);
      throw error;
    }
  }, [saleId]);

  const removePayment = useCallback(async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Atualizar total pago da venda
      await updateSalePaidTotal(saleId);

      setPayments(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Erro ao remover pagamento:', error);
      throw error;
    }
  }, [saleId]);

  return {
    payments,
    isLoading,
    addPayment,
    confirmPayment,
    cancelPayment,
    removePayment,
    refreshPayments: loadPayments,
  };
}

// Função auxiliar para atualizar total pago
async function updateSalePaidTotal(saleId: string) {
  try {
    const { data: payments } = await supabase
      .from('payments')
      .select('valor')
      .eq('sale_id', saleId)
      .eq('status', 'confirmed');

    const total_pago = payments?.reduce((sum, p) => sum + Number(p.valor), 0) || 0;

    await supabase
      .from('sales')
      .update({ total_pago })
      .eq('id', saleId);
  } catch (error) {
    console.error('Erro ao atualizar total pago:', error);
  }
}

// ==================== HOOK: CAIXA ====================

export function useCashRegister() {
  const auth = useAuth();
  const user = auth?.user || null;
  const profile = auth?.profile || null;
  const [currentSession, setCurrentSession] = useState<CashRegisterSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar sessão aberta
  const loadCurrentSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('cash_register_sessions')
        .select('*')
        .eq('status', 'open')
        .eq('operador_id', user?.id)
        .order('opened_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      setCurrentSession(data || null);
    } catch (error) {
      console.error('Erro ao carregar sessão:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadCurrentSession();
    }
  }, [user, loadCurrentSession]);

  // Abrir caixa
  const openCash = useCallback(async (data: CashRegisterSessionFormData): Promise<CashRegisterSession> => {
    try {
      // Verificar se já existe sessão aberta
      const { data: existing } = await supabase
        .from('cash_register_sessions')
        .select('id')
        .eq('status', 'open')
        .eq('operador_id', data.operador_id)
        .single();

      if (existing) {
        throw new Error('Já existe uma sessão de caixa aberta');
      }

      // Gerar número da sessão
      const { data: numeroData } = await supabase.rpc('generate_cash_session_number');
      const numero = numeroData || 1;

      const { data: { user: userData } } = await supabase.auth.getUser();

      // Buscar profile do usuário para pegar o nome
      const operadorNome = profile?.display_name || userData?.user_metadata?.name || userData?.email || 'Operador';

      const { data: newSession, error } = await supabase
        .from('cash_register_sessions')
        .insert({
          numero,
          operador_id: data.operador_id,
          operador_nome: operadorNome,
          valor_inicial: data.valor_inicial,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      // Log de auditoria
      await logAudit('create', 'cash_session', newSession.id, null, newSession, 'Caixa aberto');

      setCurrentSession(newSession);
      return newSession;
    } catch (error) {
      console.error('Erro ao abrir caixa:', error);
      throw error;
    }
  }, [profile]);

  // Fechar caixa
  const closeCash = useCallback(async (
    sessionId: string,
    valorFinal: number,
    divergencia?: number,
    justificativa?: string
  ): Promise<CashRegisterSession> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Calcular totais por forma de pagamento
      const { data: sales } = await supabase
        .from('sales')
        .select(`
          id,
          payments:payments!inner(forma_pagamento, valor)
        `)
        .eq('status', 'paid')
        .gte('finalized_at', currentSession?.opened_at || new Date().toISOString());

      const totais: Record<string, number> = {};
      sales?.forEach(sale => {
        sale.payments?.forEach((p: any) => {
          totais[p.forma_pagamento] = (totais[p.forma_pagamento] || 0) + Number(p.valor);
        });
      });

      const valorEsperado = currentSession?.valor_inicial || 0;
      const divergenciaCalculada = valorFinal - valorEsperado;

      const { data: updatedSession, error } = await supabase
        .from('cash_register_sessions')
        .update({
          status: 'closed',
          valor_final: valorFinal,
          valor_esperado: valorEsperado,
          divergencia: divergencia || divergenciaCalculada,
          divergencia_justificativa: justificativa || null,
          totais_forma_pagamento: totais,
          closed_at: new Date().toISOString(),
          closed_by: user?.id || null,
          assinatura_caixa: `${user?.user_metadata?.name || user?.email} - ${new Date().toLocaleString('pt-BR')}`,
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      // Log de auditoria
      await logAudit('update', 'cash_session', sessionId, currentSession, updatedSession, 'Caixa fechado');

      setCurrentSession(null);
      return updatedSession;
    } catch (error) {
      console.error('Erro ao fechar caixa:', error);
      throw error;
    }
  }, [currentSession]);

  return {
    currentSession,
    isLoading,
    openCash,
    closeCash,
    refreshSession: loadCurrentSession,
  };
}

// ==================== HOOK: MOVIMENTOS DE CAIXA ====================

export function useCashMovements(sessionId: string) {
  const auth = useAuth();
  const profile = auth?.profile || null;
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadMovements = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error('Erro ao carregar movimentos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  const addMovement = useCallback(async (movementData: CashMovementFormData): Promise<CashMovement> => {
    try {
      const { data: { user: userData } } = await supabase.auth.getUser();

      // Buscar profile do usuário para pegar o nome
      const operadorNome = profile?.display_name || userData?.user_metadata?.name || userData?.email || 'Operador';

      const { data: newMovement, error } = await supabase
        .from('cash_movements')
        .insert({
          session_id: sessionId,
          tipo: movementData.tipo,
          valor: movementData.valor,
          motivo: movementData.motivo || null,
          operador_id: userData?.id || '',
          operador_nome: operadorNome,
        })
        .select()
        .single();

      if (error) throw error;

      // Log de auditoria
      await logAudit('create', 'cash_movement', newMovement.id, null, newMovement, `${movementData.tipo === 'sangria' ? 'Sangria' : 'Suprimento'} de R$ ${movementData.valor}`);

      setMovements(prev => [newMovement, ...prev]);
      return newMovement;
    } catch (error) {
      console.error('Erro ao adicionar movimento:', error);
      throw error;
    }
  }, [sessionId, profile]);

  return {
    movements,
    isLoading,
    addMovement,
    refreshMovements: loadMovements,
  };
}

// ==================== FUNÇÃO: LOG DE AUDITORIA ====================

async function logAudit(
  acao: string,
  entidade: string,
  entidadeId: string | null,
  dadosAnteriores: any,
  dadosNovos: any,
  descricao?: string
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_nome: user.user_metadata?.name || user.email || 'Usuário',
      user_email: user.email,
      acao,
      entidade,
      entidade_id: entidadeId,
      dados_anteriores: dadosAnteriores,
      dados_novos: dadosNovos,
      descricao: descricao || `${acao} em ${entidade}`,
      ip_address: null, // Pode ser implementado depois
      user_agent: navigator.userAgent,
    });
  } catch (error) {
    console.error('Erro ao registrar log de auditoria:', error);
  }
}

// ==================== HOOK: SOLICITAÇÕES DE CANCELAMENTO ====================

export function useCancelRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CancelRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRequests = useCallback(async (status?: 'pending' | 'approved' | 'rejected') => {
    try {
      setIsLoading(true);
      let query = (supabase as any)
        .from('sale_cancel_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      // Se a tabela não existir, apenas retorna array vazio
      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('Tabela sale_cancel_requests não existe ainda. Execute a migration APPLY_CANCEL_REQUESTS_MIGRATION.sql');
          setRequests([]);
          return;
        }
        throw error;
      }
      setRequests((data || []) as CancelRequest[]);
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const createRequest = useCallback(async (
    saleId: string,
    motivo: string
  ): Promise<CancelRequest> => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Usuário não autenticado');

      const { data: newRequest, error } = await (supabase as any)
        .from('sale_cancel_requests')
        .insert({
          sale_id: saleId,
          solicitante_id: currentUser.id,
          solicitante_nome: currentUser.user_metadata?.name || currentUser.email || 'Usuário',
          solicitante_email: currentUser.email,
          motivo,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          throw new Error('Tabela de solicitações de cancelamento não existe. Execute a migration APPLY_CANCEL_REQUESTS_MIGRATION.sql no Supabase.');
        }
        throw error;
      }

      // Log de auditoria
      await logAudit('create', 'cancel_request', newRequest.id, null, newRequest, 'Solicitação de cancelamento criada');

      setRequests(prev => [newRequest as CancelRequest, ...prev]);
      return newRequest as CancelRequest;
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      throw error;
    }
  }, []);

  const approveRequest = useCallback(async (
    requestId: string,
    saleId: string
  ): Promise<void> => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Usuário não autenticado');

      // Atualizar solicitação
      const { data: updatedRequest, error: updateError } = await (supabase as any)
        .from('sale_cancel_requests')
        .update({
          status: 'approved',
          aprovado_por: currentUser.id,
          aprovado_por_nome: currentUser.user_metadata?.name || currentUser.email || 'Admin',
          aprovado_em: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Cancelar a venda
      const { data: sale } = await supabase
        .from('sales')
        .select('*')
        .eq('id', saleId)
        .single();

      if (sale) {
        await supabase
          .from('sales')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            canceled_by: currentUser.id,
            cancel_reason: updatedRequest.motivo,
          })
          .eq('id', saleId);

        // Log de auditoria
        await logAudit('approve', 'cancel_request', requestId, sale, { ...sale, status: 'canceled' }, 'Solicitação de cancelamento aprovada e venda cancelada');
      }

      setRequests(prev => prev.map(r => r.id === requestId ? (updatedRequest as CancelRequest) : r));
    } catch (error) {
      console.error('Erro ao aprovar solicitação:', error);
      throw error;
    }
  }, []);

  const rejectRequest = useCallback(async (
    requestId: string,
    motivoRejeicao: string
  ): Promise<void> => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Usuário não autenticado');

      const { data: updatedRequest, error } = await (supabase as any)
        .from('sale_cancel_requests')
        .update({
          status: 'rejected',
          aprovado_por: currentUser.id,
          aprovado_por_nome: currentUser.user_metadata?.name || currentUser.email || 'Admin',
          aprovado_em: new Date().toISOString(),
          motivo_rejeicao: motivoRejeicao,
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      // Log de auditoria
      await logAudit('reject', 'cancel_request', requestId, null, updatedRequest, `Solicitação de cancelamento rejeitada: ${motivoRejeicao}`);

      setRequests(prev => prev.map(r => r.id === requestId ? (updatedRequest as CancelRequest) : r));
    } catch (error) {
      console.error('Erro ao rejeitar solicitação:', error);
      throw error;
    }
  }, []);

  return {
    requests,
    isLoading,
    createRequest,
    approveRequest,
    rejectRequest,
    refreshRequests: loadRequests,
  };
}

