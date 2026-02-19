import { useQuery, useQueryClient } from '@tanstack/react-query';
import { from } from '@/integrations/db/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Fornecedor } from '@/types/assistencia';

export function useFornecedores() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: fornecedores = [], isLoading } = useQuery({
    queryKey: ['fornecedores'],
    queryFn: async () => {
      const { data, error } = await from('fornecedores')
        .select('*')
        .order('nome', { ascending: true })
        .execute();
      if (error) throw error;
      return (data || []) as Fornecedor[];
    },
  });

  const createFornecedor = async (nome: string): Promise<Fornecedor> => {
    const { data: novo, error } = await from('fornecedores')
      .insert({ nome: nome.trim() })
      .select('*')
      .single();
    if (error) {
      toast({ title: 'Erro ao criar fornecedor', description: error.message, variant: 'destructive' });
      throw error;
    }
    queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
    toast({ title: 'Fornecedor cadastrado', description: `${nome.trim()} adicionado.` });
    return novo as Fornecedor;
  };

  return { fornecedores, isLoading, createFornecedor };
}
