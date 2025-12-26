import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { from } from '@/integrations/db/client';
import { from } from '@/integrations/db/client'; // Mantido para auth.getUser()
import { Marca, Modelo } from '@/types/assistencia';
import { useToast } from '@/hooks/use-toast';
import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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
        .eq('situacao', 'ativo')
        .order('nome', { ascending: true })
        .execute();

      if (error) throw error;
      return ((data || []) as any[]).map(mapSupabaseToMarca);
    },
  });

  const marcas = marcasData || [];

  // Criar marca
  const createMarca = useCallback(async (nome: string): Promise<Marca> => {
    const { user } = useAuth();
    if (!user) throw new Error('Usuário não autenticado');

    const { data: novaMarca, error } = await from('marcas')
      .insert({
        nome: nome.trim(),
        situacao: 'ativo',
        created_by: user.id,
      })
      .select('*')
     .execute() .single();

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

    return mapSupabaseToMarca(novaMarca?.data || novaMarca);
  }, [queryClient, toast]);

  // Atualizar marca
  const updateMarca = useCallback(async (id: string, data: Partial<Marca>): Promise<Marca | null> => {
    const { error } = await from('marcas')
      .update({
        nome: data.nome?.trim(),
        situacao: data.situacao,
      })
      .eq('id', id)
      .select('*')
     .execute() .single();

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
  }, [queryClient, toast]);

  // Deletar marca (soft delete)
  const deleteMarca = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await from('marcas')
      .update({ situacao: 'inativo' })
      .eq('id', id)
      .execute();

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
  }, [queryClient, toast]);

  // Buscar marca por ID
  const getMarcaById = useCallback((id: string): Marca | undefined => {
    return marcas.find(m => m.id === id);
  }, [marcas]);

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
        .eq('situacao', 'ativo')
        .order('nome', { ascending: true })
        .execute();

      if (error) throw error;
      return ((data || []) as any[]).map(mapSupabaseToModelo);
    },
  });

  const modelos = modelosData || [];

  // Criar modelo
  const createModelo = useCallback(async (marcaId: string, nome: string): Promise<Modelo> => {
    const { user } = useAuth();
    if (!user) throw new Error('Usuário não autenticado');

    const { data: novoModelo, error } = await from('modelos')
      .insert({
        marca_id: marcaId,
        nome: nome.trim(),
        situacao: 'ativo',
        created_by: user.id,
      })
      .select('*')
     .execute() .single();

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

    return mapSupabaseToModelo(novoModelo?.data || novoModelo);
  }, [queryClient, toast]);

  // Atualizar modelo
  const updateModelo = useCallback(async (id: string, data: Partial<Modelo>): Promise<Modelo | null> => {
    const { error } = await from('modelos')
      .update({
        marca_id: data.marca_id,
        nome: data.nome?.trim(),
        situacao: data.situacao,
      })
      .eq('id', id)
      .select('*')
     .execute() .single();

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
  }, [queryClient, toast]);

  // Deletar modelo (soft delete)
  const deleteModelo = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await from('modelos')
      .update({ situacao: 'inativo' })
      .eq('id', id)
      .execute();

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
  }, [queryClient, toast]);

  // Buscar modelo por ID
  const getModeloById = useCallback((id: string): Modelo | undefined => {
    return modelos.find(m => m.id === id);
  }, [modelos]);

  // Buscar modelos por marca
  const getModelosByMarca = useCallback((marcaId: string): Modelo[] => {
    return modelos.filter(m => m.marca_id === marcaId && m.situacao === 'ativo');
  }, [modelos]);

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

