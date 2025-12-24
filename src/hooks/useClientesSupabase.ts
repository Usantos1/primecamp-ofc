import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { from } from '@/integrations/db/client';
import { useAuth } from '@/contexts/AuthContext';
import { Cliente } from '@/types/assistencia';

export function useClientesSupabase() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar todos os clientes
  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await from('clientes')
        .select('*')
        .order('created_at', { ascending: false })
        .execute();
      
      if (error) throw error;
      return (data || []) as Cliente[];
    },
  });

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

      const { data: inserted, error } = await from('clientes')
        .insert(novoCliente)
        .select('*')
        .single();

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
        .update(data)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return (updated?.data || updated) as Cliente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
  });

  // Deletar cliente
  const deleteCliente = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await from('clientes')
        .update({ situacao: 'inativo' })
        .eq('id', id)
        .execute();

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
  };
}

