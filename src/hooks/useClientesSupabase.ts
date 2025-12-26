import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { from } from '@/integrations/db/client';
import { useAuth } from '@/contexts/AuthContext';
import { Cliente } from '@/types/assistencia';

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
        .eq('situacao', 'ativo')
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

  // Buscar clientes
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

  return {
    clientes,
    isLoading,
    createCliente: createCliente.mutateAsync,
    updateCliente: (id: string, data: Partial<Cliente>) => updateCliente.mutateAsync({ id, data }),
    deleteCliente: deleteCliente.mutateAsync,
    getClienteById,
    searchClientes,
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

