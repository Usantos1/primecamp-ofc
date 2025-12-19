import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
        const { data, error } = await (supabase as any)
          .from('financial_categories')
          .select('*')
          .order('name');

        if (error) {
          console.warn('Erro ao buscar categorias financeiras:', error);
          // Se a tabela não existe, retornar array vazio
          if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
            console.warn('Tabela financial_categories não existe ainda. Aplique as migrations do banco de dados.');
            return [];
          }
          throw error;
        }
        
        // Filtrar apenas categorias ativas se o campo existir
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
        let query = (supabase as any)
          .from('bills_to_pay')
          .select('*, category:financial_categories(*)')
          .order('due_date', { ascending: true });

        if (filters?.status) {
          query = query.eq('status', filters.status);
        }
        if (filters?.expense_type) {
          query = query.eq('expense_type', filters.expense_type);
        }
        if (filters?.month) {
          const startDate = `${filters.month}-01`;
          const endDate = `${filters.month}-31`;
          query = query.gte('due_date', startDate).lte('due_date', endDate);
        }

        const { data, error } = await query;
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
      const { data: result, error } = await (supabase as any)
        .from('bills_to_pay')
        .insert(data)
        .select()
        .single();

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
      const { data: result, error } = await (supabase as any)
        .from('bills_to_pay')
        .update(data)
        .eq('id', id)
        .select()
        .single();

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
      const { data: result, error } = await (supabase as any)
        .from('bills_to_pay')
        .update({
          status: 'pago',
          payment_date: new Date().toISOString().split('T')[0],
          payment_method,
          paid_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', id)
        .select()
        .single();

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
      const { error } = await (supabase as any)
        .from('bills_to_pay')
        .delete()
        .eq('id', id);

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
        let query = (supabase as any)
          .from('cash_closings')
          .select('*')
          .order('closing_date', { ascending: false });

        if (filters?.month) {
          const startDate = `${filters.month}-01`;
          const endDate = `${filters.month}-31`;
          query = query.gte('closing_date', startDate).lte('closing_date', endDate);
        }
        if (filters?.seller_id) {
          query = query.eq('seller_id', filters.seller_id);
        }

        const { data, error } = await query;
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
      const userData = await supabase.auth.getUser();
      const { data: result, error } = await (supabase as any)
        .from('cash_closings')
        .insert({
          ...data,
          seller_id: userData.data.user?.id,
          seller_name: profile?.name || userData.data.user?.email,
          opening_amount: 150.00,
          status: 'fechado',
        })
        .select()
        .single();

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
      const { data: result, error } = await (supabase as any)
        .from('cash_closings')
        .update(data)
        .eq('id', id)
        .select()
        .single();

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
      const userData = await supabase.auth.getUser();
      const { data: result, error } = await (supabase as any)
        .from('cash_closings')
        .update({
          status: 'conferido',
          verified_by: userData.data.user?.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

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
        let query = (supabase as any)
          .from('financial_transactions')
          .select('*, category:financial_categories(*)')
          .order('transaction_date', { ascending: false });

        if (filters?.month) {
          const startDate = `${filters.month}-01`;
          const endDate = `${filters.month}-31`;
          query = query.gte('transaction_date', startDate).lte('transaction_date', endDate);
        }
        if (filters?.type) {
          query = query.eq('type', filters.type);
        }

        const { data, error } = await query;
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
      const { data: result, error } = await (supabase as any)
        .from('financial_transactions')
        .insert(data)
        .select()
        .single();

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
 */
export function useFinancialSummary(month?: string) {
  const { data: bills } = useBillsToPay({ month });
  const { data: transactions } = useFinancialTransactions({ month });
  const { data: cashClosings } = useCashClosings({ month });

  const summary: FinancialSummary = {
    period: month || new Date().toISOString().slice(0, 7),
    total_entradas: transactions?.filter(t => t.type === 'entrada').reduce((sum, t) => sum + t.amount, 0) || 0,
    total_saidas: transactions?.filter(t => t.type === 'saida').reduce((sum, t) => sum + t.amount, 0) || 0,
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

        const { data, error } = await (supabase as any)
          .from('bills_to_pay')
          .select('*, category:financial_categories(*)')
          .eq('status', 'pendente')
          .lte('due_date', futureDate.toISOString().split('T')[0])
          .order('due_date', { ascending: true });

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

