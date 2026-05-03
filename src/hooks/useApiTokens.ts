import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';

export interface ApiToken {
  id: string;
  nome: string;
  descricao?: string;
  token: string;
  permissoes: string[];
  ativo: boolean;
  expires_at?: string;
  ultimo_uso?: string;
  uso_count: number;
  created_at: string;
  updated_at?: string;
}

export interface ApiAccessLog {
  id: string;
  token_id: string;
  token_nome?: string;
  endpoint: string;
  method: string;
  ip_address: string;
  user_agent: string;
  query_params: Record<string, unknown>;
  response_status?: number;
  response_body?: string;
  created_at: string;
  is_summary?: boolean;
}

export interface ApiLogsFilters {
  search?: string;
  token_id?: string;
  token_ids?: string[];
  method?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface ApiLogsResult {
  rows: ApiAccessLog[];
  total: number;
  limit: number;
  offset: number;
  error?: string;
}

export interface CreateTokenData {
  nome: string;
  descricao?: string;
  permissoes?: string[];
  expires_at?: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function filterLegacyLogs(rows: ApiAccessLog[], filters: ApiLogsFilters) {
  let filteredRows = rows;
  const search = filters.search?.trim().toLowerCase();
  if (search) {
    filteredRows = filteredRows.filter((log) => {
      const haystack = [
        log.endpoint,
        log.method,
        log.ip_address,
        log.user_agent,
        JSON.stringify(log.query_params || {}),
        log.response_body || '',
        log.token_nome || '',
      ].join(' ').toLowerCase();
      return haystack.includes(search);
    });
  }

  if (filters.status && filters.status !== 'all') {
    filteredRows = filteredRows.filter((log) => {
      const status = Number(log.response_status || 0);
      if (filters.status === 'success') return status >= 200 && status < 300;
      if (filters.status === 'error') return status >= 400;
      return status === Number(filters.status);
    });
  }

  return filteredRows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function useApiTokens() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Listar tokens
  const { data: tokensData, isLoading, refetch } = useQuery({
    queryKey: ['api-tokens'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: ApiToken[] }>('/api-tokens');
      if (response.error) {
        throw new Error(response.error);
      }
      // Garantir que sempre retornamos um array
      const data = response.data?.data;
      return Array.isArray(data) ? data : [];
    },
  });

  // Garantir que tokens seja sempre um array
  const tokens = Array.isArray(tokensData) ? tokensData : [];

  // Criar token
  const createMutation = useMutation({
    mutationFn: async (data: CreateTokenData) => {
      const response = await apiClient.post<{ success: boolean; data: ApiToken }>('/api-tokens', data);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
      toast({ title: 'Token criado com sucesso!' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Erro ao criar token', description: getErrorMessage(error, 'Erro desconhecido'), variant: 'destructive' });
    },
  });

  // Atualizar token
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ApiToken> }) => {
      const response = await apiClient.put<{ success: boolean; data: ApiToken }>(`/api-tokens/${id}`, data);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
      toast({ title: 'Token atualizado!' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Erro ao atualizar token', description: getErrorMessage(error, 'Erro desconhecido'), variant: 'destructive' });
    },
  });

  // Excluir token
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/api-tokens/${id}`);
      if (response.error) {
        throw new Error(response.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
      toast({ title: 'Token excluído!' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Erro ao excluir token', description: getErrorMessage(error, 'Erro desconhecido'), variant: 'destructive' });
    },
  });

  // Buscar logs de um token
  const fetchLogs = useCallback(async (tokenId: string): Promise<ApiAccessLog[]> => {
    try {
      const response = await apiClient.get<{ success: boolean; data: ApiAccessLog[] }>(`/api-tokens/${tokenId}/logs`);
      if (response.error) {
        throw new Error(response.error);
      }
      const data = response.data?.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      return [];
    }
  }, []);

  const fetchAllLogs = useCallback(async (filters: ApiLogsFilters = {}): Promise<ApiLogsResult> => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value) !== '') {
          params.set(key, String(value));
        }
      });

      const query = params.toString();
      const response = await apiClient.get<{
        success: boolean;
        data: ApiAccessLog[];
        total: number;
        limit: number;
        offset: number;
      }>(`/api-logs${query ? `?${query}` : ''}`);

      if (response.error) {
        throw new Error(response.error);
      }

      return {
        rows: Array.isArray(response.data?.data) ? response.data.data : [],
        total: response.data?.total || 0,
        limit: response.data?.limit || filters.limit || 20,
        offset: response.data?.offset || filters.offset || 0,
      };
    } catch (error) {
      console.error('Erro ao buscar logs da API:', error);
      const tokenIds = filters.token_id && filters.token_id !== 'all'
        ? [filters.token_id]
        : filters.token_ids || [];

      if (tokenIds.length > 0) {
        try {
          const limit = filters.limit || 20;
          const offset = filters.offset || 0;
          const legacyLimit = Math.max(100, offset + limit);
          const responses = await Promise.all(
            tokenIds.map((id) => apiClient.get<{ success: boolean; data: ApiAccessLog[] }>(`/api-tokens/${id}/logs?limit=${legacyLimit}`))
          );
          const rows = responses.flatMap((response) => (
            response.error || !Array.isArray(response.data?.data) ? [] : response.data.data
          ));
          const filteredRows = filterLegacyLogs(rows, filters);

          return {
            rows: filteredRows.slice(offset, offset + limit),
            total: filteredRows.length,
            limit,
            offset,
          };
        } catch (legacyError) {
          console.error('Erro ao buscar logs pela rota legada:', legacyError);
        }
      }

      return {
        rows: [],
        total: 0,
        limit: filters.limit || 20,
        offset: filters.offset || 0,
        error: getErrorMessage(error, 'Erro ao buscar logs da API'),
      };
    }
  }, []);

  return {
    tokens,
    isLoading,
    refetch,
    createToken: createMutation.mutateAsync,
    updateToken: updateMutation.mutateAsync,
    deleteToken: deleteMutation.mutateAsync,
    fetchLogs,
    fetchAllLogs,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Permissões disponíveis
export const API_PERMISSIONS = [
  { value: 'produtos:read', label: 'Ler Produtos', description: 'Permite buscar e listar produtos' },
  { value: 'produtos:write', label: 'Editar Produtos', description: 'Permite criar e editar produtos' },
  { value: 'marcas:read', label: 'Ler Marcas', description: 'Permite listar marcas' },
  { value: 'modelos:read', label: 'Ler Modelos', description: 'Permite listar modelos' },
  { value: 'clientes:read', label: 'Ler Clientes', description: 'Permite buscar clientes' },
  { value: 'os:read', label: 'Ler OS', description: 'Permite consultar ordens de serviço' },
];

