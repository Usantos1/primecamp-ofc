import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { from } from '@/integrations/db/client';
import { authAPI } from '@/integrations/auth/api-client';
import { useToast } from './use-toast';
import { useErrorHandler } from './useErrorHandler';
import {
  BillToPay,
  BillToPayFormData,
  CashClosing,
  CashClosingFormData,
  FinancialCategory,
  FinancialTransaction,
  FinancialSummary,
  BillStatus,
} from '@/types/financial';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para gerenciar categorias financeiras
 */
export function useFinancialCategories() {
  return useQuery({
    queryKey: ['financial-categories'],
    queryFn: async () => {
      try {
        const { data, error } = await from('financial_categories')
          .select('*')
          .order('name')
          .execute();

        if (error) {
          console.warn('Erro ao buscar categorias financeiras:', error);
          if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
            console.warn('Tabela financial_categories não existe ainda.');
            return [];
          }
          throw error;
        }
        
        const activeCategories = (data || []).filter((cat: FinancialCategory) => 
          cat.is_active !== false
        );
        
        return activeCategories as FinancialCategory[];
      } catch (err) {
        console.warn('Erro ao buscar categorias financeiras:', err);
        return [];
      }
    },
    retry: false,
  });
}

/**
 * Hook para gerenciar contas a pagar
 */
export function useBillsToPay(filters?: {
  status?: BillStatus;
  expense_type?: 'fixa' | 'variavel';
  month?: string;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  const query = useQuery({
    queryKey: ['bills-to-pay', filters],
    queryFn: async () => {
      try {
        let q = from('bills_to_pay')
          .select('*')
          .order('due_date', { ascending: true });

        if (filters?.status) {
          q = q.eq('status', filters.status);
        }
        if (filters?.expense_type) {
          q = q.eq('expense_type', filters.expense_type);
        }
        if (filters?.month) {
          const startDate = `${filters.month}-01`;
          const endDate = `${filters.month}-31`;
          q = q.gte('due_date', startDate).lte('due_date', endDate);
        }

        const { data, error } = await q.execute();
        if (error) {
          console.warn('Tabela bills_to_pay não existe ainda:', error.message);
          return [];
        }
        return data as BillToPay[];
      } catch (err) {
        console.warn('Erro ao buscar contas a pagar:', err);
        return [];
      }
    },
    retry: false,
  });

  const createBill = useMutation({
    mutationFn: async (data: BillToPayFormData) => {
      const { data: result, error } = await from('bills_to_pay').insert(data);
      if (error) throw error;
      return result as BillToPay;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills-to-pay'] });
      toast({ title: 'Conta cadastrada com sucesso!' });
    },
    onError: (error) => handleError(error, { context: 'createBill' }),
  });

  const updateBill = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BillToPay> }) => {
      const { data: result, error } = await from('bills_to_pay')
        .eq('id', id)
        .update(data);
      if (error) throw error;
      return result as BillToPay;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills-to-pay'] });
      toast({ title: 'Conta atualizada com sucesso!' });
    },
    onError: (error) => handleError(error, { context: 'updateBill' }),
  });

  const payBill = useMutation({
    mutationFn: async ({ id, payment_method }: { id: string; payment_method: string }) => {
      const userData = await authAPI.getCurrentUser();
      const { data: result, error } = await from('bills_to_pay')
        .eq('id', id)
        .update({
          status: 'pago',
          payment_date: new Date().toISOString().split('T')[0],
          payment_method,
          paid_by: userData.data?.user?.id,
        });
      if (error) throw error;
      return result as BillToPay;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills-to-pay'] });
      toast({ title: 'Conta paga com sucesso!' });
    },
    onError: (error) => handleError(error, { context: 'payBill' }),
  });

  const deleteBill = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await from('bills_to_pay').eq('id', id).delete();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills-to-pay'] });
      toast({ title: 'Conta excluída com sucesso!' });
    },
    onError: (error) => handleError(error, { context: 'deleteBill' }),
  });

  return {
    bills: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createBill,
    updateBill,
    payBill,
    deleteBill,
  };
}

/**
 * Hook para gerenciar fechamento de caixa
 */
export function useCashClosings(filters?: { month?: string; seller_id?: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  const { user, profile } = useAuth();

  const query = useQuery({
    queryKey: ['cash-closings', filters],
    queryFn: async () => {
      try {
        let q = from('cash_closings')
          .select('*')
          .order('closing_date', { ascending: false });

        if (filters?.month) {
          const startDate = `${filters.month}-01`;
          const endDate = `${filters.month}-31`;
          q = q.gte('closing_date', startDate).lte('closing_date', endDate);
        }
        if (filters?.seller_id) {
          q = q.eq('seller_id', filters.seller_id);
        }

        const { data, error } = await q.execute();
        if (error) {
          console.warn('Tabela cash_closings não existe ainda:', error.message);
          return [];
        }
        return data as CashClosing[];
      } catch (err) {
        console.warn('Erro ao buscar fechamentos de caixa:', err);
        return [];
      }
    },
    retry: false,
  });

  const createCashClosing = useMutation({
    mutationFn: async (data: CashClosingFormData) => {
      const userData = await authAPI.getCurrentUser();
      const { data: result, error } = await from('cash_closings').insert({
        ...data,
        seller_id: userData.data?.user?.id,
        seller_name: profile?.name || userData.data?.user?.email,
        opening_amount: 150.00,
        status: 'fechado',
      });
      if (error) throw error;
      return result as CashClosing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-closings'] });
      toast({ title: 'Caixa fechado com sucesso!' });
    },
    onError: (error) => handleError(error, { context: 'createCashClosing' }),
  });

  const updateCashClosing = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CashClosing> }) => {
      const { data: result, error } = await from('cash_closings')
        .eq('id', id)
        .update(data);
      if (error) throw error;
      return result as CashClosing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-closings'] });
      toast({ title: 'Fechamento atualizado!' });
    },
    onError: (error) => handleError(error, { context: 'updateCashClosing' }),
  });

  const verifyCashClosing = useMutation({
    mutationFn: async (id: string) => {
      const userData = await authAPI.getCurrentUser();
      const { data: result, error } = await from('cash_closings')
        .eq('id', id)
        .update({
          status: 'conferido',
          verified_by: userData.data?.user?.id,
          verified_at: new Date().toISOString(),
        });
      if (error) throw error;
      return result as CashClosing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-closings'] });
      toast({ title: 'Caixa conferido com sucesso!' });
    },
    onError: (error) => handleError(error, { context: 'verifyCashClosing' }),
  });

  return {
    cashClosings: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createCashClosing,
    updateCashClosing,
    verifyCashClosing,
  };
}

/**
 * Hook para transações financeiras
 */
export function useFinancialTransactions(filters?: { month?: string; type?: 'entrada' | 'saida' }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  const query = useQuery({
    queryKey: ['financial-transactions', filters],
    queryFn: async () => {
      try {
        let q = from('financial_transactions')
          .select('*')
          .order('transaction_date', { ascending: false });

        if (filters?.month) {
          const startDate = `${filters.month}-01`;
          const endDate = `${filters.month}-31`;
          q = q.gte('transaction_date', startDate).lte('transaction_date', endDate);
        }
        if (filters?.type) {
          q = q.eq('type', filters.type);
        }

        const { data, error } = await q.execute();
        if (error) {
          console.warn('Tabela financial_transactions não existe ainda:', error.message);
          return [];
        }
        return data as FinancialTransaction[];
      } catch (err) {
        console.warn('Erro ao buscar transações:', err);
        return [];
      }
    },
    retry: false,
  });

  const createTransaction = useMutation({
    mutationFn: async (data: Omit<FinancialTransaction, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: result, error } = await from('financial_transactions').insert(data);
      if (error) throw error;
      return result as FinancialTransaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
      toast({ title: 'Transação registrada!' });
    },
    onError: (error) => handleError(error, { context: 'createTransaction' }),
  });

  return {
    transactions: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createTransaction,
  };
}

/**
 * Hook para resumo financeiro
 * Aceita month (legado) ou startDate/endDate para período personalizado
 */
export function useFinancialSummary(monthOrPeriod?: string | { startDate?: string; endDate?: string; month?: string }) {
  // Normalizar parâmetros
  const period = typeof monthOrPeriod === 'string' 
    ? { month: monthOrPeriod, startDate: `${monthOrPeriod}-01`, endDate: `${monthOrPeriod}-31` }
    : monthOrPeriod || { month: new Date().toISOString().slice(0, 7) };
  
  const startDate = period.startDate || `${period.month}-01`;
  const endDate = period.endDate || `${period.month}-31`;
  const month = period.month || startDate.slice(0, 7);

  const { data: bills } = useBillsToPay({ month });
  const { data: transactions } = useFinancialTransactions({ month });
  const { data: cashClosings } = useCashClosings({ month });
  
  // Buscar vendas pagas do período
  const { data: sales } = useQuery({
    queryKey: ['sales-summary', startDate, endDate],
    queryFn: async () => {
      try {
        const { data, error } = await from('sales')
          .select('id, total, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .eq('status', 'paid')
          .execute();
        
        if (error) {
          console.warn('Erro ao buscar vendas para resumo:', error);
          return [];
        }
        return data || [];
      } catch (err) {
        console.warn('Erro ao buscar vendas:', err);
        return [];
      }
    },
    retry: false,
  });

  // Total de vendas pagas
  const totalVendas = sales?.reduce((sum, s) => sum + Number(s.total || 0), 0) || 0;
  
  // Transações manuais
  const totalTransacoesEntrada = transactions?.filter(t => t.type === 'entrada').reduce((sum, t) => sum + t.amount, 0) || 0;
  const totalTransacoesSaida = transactions?.filter(t => t.type === 'saida').reduce((sum, t) => sum + t.amount, 0) || 0;

  const summary: FinancialSummary = {
    period: `${startDate} - ${endDate}`,
    // Entradas = vendas pagas + transações de entrada
    total_entradas: totalVendas + totalTransacoesEntrada,
    total_saidas: totalTransacoesSaida,
    saldo: 0,
    bills_pending: bills?.filter(b => b.status === 'pendente').length || 0,
    bills_overdue: bills?.filter(b => b.status === 'atrasado' || (b.status === 'pendente' && new Date(b.due_date) < new Date())).length || 0,
    cash_closings_pending: cashClosings?.filter(c => c.status === 'fechado').length || 0,
  };

  summary.saldo = summary.total_entradas - summary.total_saidas;

  return summary;
}

/**
 * Hook para contas vencendo em breve
 */
export function useBillsDueSoon(daysAhead: number = 7) {
  return useQuery({
    queryKey: ['bills-due-soon', daysAhead],
    queryFn: async () => {
      try {
        const today = new Date();
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + daysAhead);

        const { data, error } = await from('bills_to_pay')
          .select('*')
          .eq('status', 'pendente')
          .lte('due_date', futureDate.toISOString().split('T')[0])
          .order('due_date', { ascending: true })
          .execute();

        if (error) {
          console.warn('Tabela bills_to_pay não existe ainda:', error.message);
          return [];
        }
        return data as BillToPay[];
      } catch (err) {
        console.warn('Erro ao buscar contas vencendo:', err);
        return [];
      }
    },
    refetchInterval: 60000,
    retry: false,
  });
}
