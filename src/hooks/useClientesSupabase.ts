import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { from } from '@/integrations/db/client';
import { useAuth } from '@/contexts/AuthContext';
import { Cliente } from '@/types/assistencia';

// URL da API
const API_URL = (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('localhost')) 
  ? import.meta.env.VITE_API_URL 
  : 'https://api.primecamp.cloud/api';

export function useClientesSupabase(pageSize: number = 50) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Buscar clientes com paginação
  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes', page, pageSize],
    queryFn: async () => {
      const offsetVal = (page - 1) * pageSize;
      const { data, error, count } = await from('clientes')
        .select('*')
        .neq('situacao', 'inativo')  // Exclui apenas inativos, mostra ativos e null
        .order('nome', { ascending: true })
        .range(offsetVal, offsetVal + pageSize - 1)
        .execute();
      
      if (error) throw error;
      if (count !== undefined) {
        setTotalCount(count);
      }
      return (data || []) as Cliente[];
    },
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  
  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const nextPage = () => goToPage(page + 1);
  const prevPage = () => goToPage(page - 1);

  // Criar cliente
  const createCliente = useMutation({
    mutationFn: async (data: Partial<Cliente>): Promise<Cliente> => {
      const novoCliente: any = {
        tipo_pessoa: data.tipo_pessoa || 'fisica',
        situacao: 'ativo',
        nome: data.nome || '',
        nome_fantasia: data.nome_fantasia || null,
        cpf_cnpj: data.cpf_cnpj || null,
        rg: data.rg || null,
        sexo: data.sexo || null,
        data_nascimento: data.data_nascimento || null,
        cep: data.cep || null,
        logradouro: data.logradouro || null,
        numero: data.numero || null,
        complemento: data.complemento || null,
        bairro: data.bairro || null,
        cidade: data.cidade || null,
        estado: data.estado || null,
        telefone: data.telefone || null,
        telefone2: data.telefone2 || null,
        email: data.email || null,
        whatsapp: data.whatsapp || null,
        created_by: user?.id || null,
      };

      const { data: inserted, error } = await from('clientes').insert(novoCliente);

      if (error) throw error;
      return (inserted?.data || inserted) as Cliente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
  });

  // Atualizar cliente
  const updateCliente = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Cliente> }): Promise<Cliente> => {
      const { data: updated, error } = await from('clientes')
        .eq('id', id)
        .update(data);

      if (error) throw error;
      return (updated?.data || updated) as Cliente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
  });

  // Deletar cliente (soft delete - marca como inativo)
  const deleteCliente = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await from('clientes')
        .eq('id', id)
        .update({ situacao: 'inativo' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
  });

  // Buscar cliente por ID
  const getClienteById = (id: string): Cliente | undefined => {
    return clientes.find(c => c.id === id);
  };

  // Buscar clientes (síncrono - apenas nos carregados em memória)
  const searchClientes = (query: string): Cliente[] => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return clientes.filter(c => 
      c.nome.toLowerCase().includes(q) ||
      c.cpf_cnpj?.includes(query) ||
      c.rg?.includes(query) ||
      c.telefone?.includes(query) ||
      c.whatsapp?.includes(query)
    );
  };

  // Buscar clientes (assíncrono - busca no banco via API com ILIKE)
  const searchClientesAsync = useCallback(async (query: string, limit: number = 15): Promise<Cliente[]> => {
    if (!query || query.length < 2) return [];
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/clientes/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        console.error('[searchClientesAsync] Erro na resposta:', response.status);
        return [];
      }

      const data = await response.json();
      return (data || []) as Cliente[];
    } catch (error) {
      console.error('[searchClientesAsync] Erro ao buscar clientes:', error);
      return [];
    }
  }, []);

  return {
    clientes,
    isLoading,
    createCliente: createCliente.mutateAsync,
    updateCliente: (id: string, data: Partial<Cliente>) => updateCliente.mutateAsync({ id, data }),
    deleteCliente: deleteCliente.mutateAsync,
    getClienteById,
    searchClientes,
    searchClientesAsync,
    // Paginação
    page,
    totalPages,
    totalCount,
    goToPage,
    nextPage,
    prevPage,
    pageSize,
  };
}

