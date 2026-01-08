import { useState, useCallback } from 'react';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';

export interface RefundItem {
  sale_item_id?: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  reason?: string;
  condition?: 'novo' | 'usado' | 'defeituoso';
  return_to_stock?: boolean;
}

export interface Refund {
  id: string;
  company_id: string;
  sale_id: string;
  refund_number: string;
  refund_type: 'full' | 'partial';
  reason: string;
  reason_details?: string;
  total_refund_value: number;
  refund_method: 'cash' | 'voucher' | 'original';
  voucher_id?: string;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  customer_id?: string;
  customer_name?: string;
  created_by: string;
  created_at: string;
  items?: RefundItem[];
  voucher?: Voucher;
}

export interface Voucher {
  id: string;
  code: string;
  company_id: string;
  original_sale_id?: string;
  refund_id?: string;
  customer_id?: string;
  customer_name: string;
  customer_document?: string;
  customer_phone?: string;
  original_value: number;
  current_value: number;
  expires_at?: string;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  is_transferable: boolean;
  created_at: string;
}

export interface CreateRefundData {
  sale_id: string;
  refund_type: 'full' | 'partial';
  reason: string;
  reason_details?: string;
  refund_method: 'cash' | 'voucher' | 'original';
  items: RefundItem[];
  customer_id?: string;
  customer_name?: string;
  notes?: string;
}

export function useRefunds() {
  const [loading, setLoading] = useState(false);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const { toast } = useToast();

  const fetchRefunds = useCallback(async (filters?: { status?: string; startDate?: string; endDate?: string }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      
      const response = await apiClient.get(`/refunds?${params.toString()}`);
      if (response.data?.success) {
        setRefunds(response.data.data || []);
      }
      return response.data?.data || [];
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao carregar devoluções',
        variant: 'destructive'
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchRefund = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/refunds/${id}`);
      return response.data?.data || null;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao carregar devolução',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createRefund = useCallback(async (data: CreateRefundData) => {
    setLoading(true);
    try {
      // Log detalhado dos itens
      console.log('[useRefunds] Criando devolução com dados:', JSON.stringify(data, null, 2));
      data.items.forEach((item, idx) => {
        console.log(`[useRefunds] Item ${idx}: ${item.product_name}, qty=${item.quantity}, unit_price=${item.unit_price}, subtotal=${item.quantity * item.unit_price}`);
      });
      
      const response = await apiClient.post('/refunds', data);
      if (response.data?.success) {
        toast({
          title: 'Sucesso',
          description: 'Devolução criada com sucesso'
        });
        return response.data.data;
      }
      throw new Error(response.data?.error || response.error || 'Erro desconhecido');
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar devolução',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const approveRefund = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await apiClient.put(`/refunds/${id}/approve`, {});
      if (response.data?.success) {
        toast({
          title: 'Sucesso',
          description: 'Devolução aprovada'
        });
        return response.data.data;
      }
      throw new Error(response.data?.error || response.error);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao aprovar devolução',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const completeRefund = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await apiClient.put(`/refunds/${id}/complete`, {});
      if (response.data?.success) {
        toast({
          title: 'Sucesso',
          description: 'Devolução completada e estoque atualizado'
        });
        return true;
      }
      throw new Error(response.data?.error || response.error);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao completar devolução',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const cancelRefund = useCallback(async (id: string, reason: string) => {
    setLoading(true);
    try {
      const response = await apiClient.put(`/refunds/${id}/cancel`, { reason });
      if (response.data?.success) {
        toast({
          title: 'Sucesso',
          description: 'Devolução cancelada'
        });
        return true;
      }
      throw new Error(response.data?.error || response.error);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao cancelar devolução',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // ═══════════════════════════════════════════════════════
  // VALES COMPRA
  // ═══════════════════════════════════════════════════════

  const fetchVouchers = useCallback(async (filters?: { status?: string; customer?: string }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.customer) params.append('customer', filters.customer);
      
      const response = await apiClient.get(`/refunds/vouchers/list?${params.toString()}`);
      if (response.data?.success) {
        setVouchers(response.data.data || []);
      }
      return response.data?.data || [];
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao carregar vales',
        variant: 'destructive'
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const checkVoucher = useCallback(async (code: string) => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/refunds/vouchers/code/${code}`);
      return response.data; // Retorna { success, data, error }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao verificar vale',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const useVoucher = useCallback(async (voucherId: string, saleId: string, amount: number, customerDocument?: string) => {
    setLoading(true);
    try {
      const response = await apiClient.post(`/refunds/vouchers/${voucherId}/use`, {
        sale_id: saleId,
        amount,
        customer_document: customerDocument
      });
      if (response.data?.success) {
        toast({
          title: 'Sucesso',
          description: `Vale utilizado. Saldo restante: R$ ${response.data.data.balance_after.toFixed(2)}`
        });
        return response.data.data;
      }
      throw new Error(response.data?.error || response.error);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao usar vale',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchVoucherHistory = useCallback(async (voucherId: string) => {
    try {
      const response = await apiClient.get(`/refunds/vouchers/${voucherId}/history`);
      return response.data?.data || [];
    } catch (error: any) {
      return [];
    }
  }, []);

  return {
    loading,
    refunds,
    vouchers,
    fetchRefunds,
    fetchRefund,
    createRefund,
    approveRefund,
    completeRefund,
    cancelRefund,
    fetchVouchers,
    checkVoucher,
    useVoucher,
    fetchVoucherHistory
  };
}

