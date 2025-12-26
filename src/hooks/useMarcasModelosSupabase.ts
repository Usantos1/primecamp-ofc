import { useQuery, useQueryClient } from '@tanstack/react-query';
import { from } from '@/integrations/db/client';
import { Marca, Modelo } from '@/types/assistencia';
import { useToast } from '@/hooks/use-toast';

// Mapear marca do Supabase para assistencia.Marca
function mapSupabaseToMarca(supabaseMarca: any): Marca {
  return {
    id: supabaseMarca.id,
    nome: supabaseMarca.nome,
    situacao: supabaseMarca.situacao || 'ativo',
    created_at: supabaseMarca.created_at || new Date().toISOString(),
  };
}

// Mapear modelo do Supabase para assistencia.Modelo
function mapSupabaseToModelo(supabaseModelo: any): Modelo {
  return {
    id: supabaseModelo.id,
    marca_id: supabaseModelo.marca_id,
    nome: supabaseModelo.nome,
    situacao: supabaseModelo.situacao || 'ativo',
    created_at: supabaseModelo.created_at || new Date().toISOString(),
  };
}

export function useMarcasSupabase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Buscar marcas do Supabase
  const { data: marcasData, isLoading, error } = useQuery({
    queryKey: ['marcas-assistencia'],
    queryFn: async () => {
      const { data, error } = await from('marcas')
        .select('*')
        .neq('situacao', 'inativo')  // Mostra ativo e null
        .order('nome', { ascending: true })
        .execute();

      if (error) throw error;
      return ((data || []) as any[]).map(mapSupabaseToMarca);
    },
  });

  const marcas = marcasData || [];

  // Criar marca
  const createMarca = async (nome: string, userId: string): Promise<Marca> => {
    if (!userId) throw new Error('Usuário não autenticado');

    const { data: novaMarca, error } = await from('marcas')
      .insert({
        nome: nome.trim(),
        situacao: 'ativo',
        created_by: userId,
      });

    if (error) {
      console.error('[createMarca] Erro:', error);
      toast({
        title: 'Erro ao criar marca',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ['marcas-assistencia'] });
    
    toast({
      title: 'Sucesso',
      description: 'Marca criada com sucesso!',
    });

    return mapSupabaseToMarca(novaMarca);
  };

  // Atualizar marca
  const updateMarca = async (id: string, data: Partial<Marca>): Promise<Marca | null> => {
    const { error } = await from('marcas')
      .eq('id', id)
      .update({
        nome: data.nome?.trim(),
        situacao: data.situacao,
      });

    if (error) {
      console.error('[updateMarca] Erro:', error);
      toast({
        title: 'Erro ao atualizar marca',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ['marcas-assistencia'] });
    queryClient.invalidateQueries({ queryKey: ['modelos-assistencia'] });
    
    toast({
      title: 'Sucesso',
      description: 'Marca atualizada com sucesso!',
    });

    return data as Marca;
  };

  // Deletar marca (soft delete)
  const deleteMarca = async (id: string): Promise<boolean> => {
    const { error } = await from('marcas')
      .eq('id', id)
      .update({ situacao: 'inativo' });

    if (error) {
      console.error('[deleteMarca] Erro:', error);
      toast({
        title: 'Erro ao deletar marca',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ['marcas-assistencia'] });
    queryClient.invalidateQueries({ queryKey: ['modelos-assistencia'] });
    
    toast({
      title: 'Sucesso',
      description: 'Marca deletada com sucesso!',
    });

    return true;
  };

  // Buscar marca por ID
  const getMarcaById = (id: string): Marca | undefined => {
    return marcas.find(m => m.id === id);
  };

  return {
    marcas,
    isLoading,
    error,
    createMarca,
    updateMarca,
    deleteMarca,
    getMarcaById,
  };
}

export function useModelosSupabase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Buscar modelos do Supabase
  const { data: modelosData, isLoading, error } = useQuery({
    queryKey: ['modelos-assistencia'],
    queryFn: async () => {
      const { data, error } = await from('modelos')
        .select('*')
        .neq('situacao', 'inativo')  // Mostra ativo e null
        .order('nome', { ascending: true })
        .execute();

      if (error) throw error;
      return ((data || []) as any[]).map(mapSupabaseToModelo);
    },
  });

  const modelos = modelosData || [];

  // Criar modelo
  const createModelo = async (marcaId: string, nome: string, userId: string): Promise<Modelo> => {
    if (!userId) throw new Error('Usuário não autenticado');

    const { data: novoModelo, error } = await from('modelos')
      .insert({
        marca_id: marcaId,
        nome: nome.trim(),
        situacao: 'ativo',
        created_by: userId,
      });

    if (error) {
      console.error('[createModelo] Erro:', error);
      toast({
        title: 'Erro ao criar modelo',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ['modelos-assistencia'] });
    
    toast({
      title: 'Sucesso',
      description: 'Modelo criado com sucesso!',
    });

    return mapSupabaseToModelo(novoModelo);
  };

  // Atualizar modelo
  const updateModelo = async (id: string, data: Partial<Modelo>): Promise<Modelo | null> => {
    const { error } = await from('modelos')
      .eq('id', id)
      .update({
        marca_id: data.marca_id,
        nome: data.nome?.trim(),
        situacao: data.situacao,
      });

    if (error) {
      console.error('[updateModelo] Erro:', error);
      toast({
        title: 'Erro ao atualizar modelo',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ['modelos-assistencia'] });
    
    toast({
      title: 'Sucesso',
      description: 'Modelo atualizado com sucesso!',
    });

    return data as Modelo;
  };

  // Deletar modelo (soft delete)
  const deleteModelo = async (id: string): Promise<boolean> => {
    const { error } = await from('modelos')
      .eq('id', id)
      .update({ situacao: 'inativo' });

    if (error) {
      console.error('[deleteModelo] Erro:', error);
      toast({
        title: 'Erro ao deletar modelo',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ['modelos-assistencia'] });
    
    toast({
      title: 'Sucesso',
      description: 'Modelo deletado com sucesso!',
    });

    return true;
  };

  // Buscar modelo por ID
  const getModeloById = (id: string): Modelo | undefined => {
    return modelos.find(m => m.id === id);
  };

  // Buscar modelos por marca
  const getModelosByMarca = (marcaId: string): Modelo[] => {
    return modelos.filter(m => m.marca_id === marcaId && m.situacao !== 'inativo');
  };

  return {
    modelos,
    isLoading,
    error,
    createModelo,
    updateModelo,
    deleteModelo,
    getModeloById,
    getModelosByMarca,
  };
}

// Hook combinado para marcas e modelos
export function useMarcasModelosSupabase() {
  const { marcas, getMarcaById } = useMarcasSupabase();
  const { modelos, getModeloById, getModelosByMarca } = useModelosSupabase();

  return {
    marcas,
    modelos,
    getMarcaById,
    getModeloById,
    getModelosByMarca,
  };
}

