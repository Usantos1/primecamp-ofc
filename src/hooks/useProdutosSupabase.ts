import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Produto, ProdutoFormData } from '@/types/assistencia';
import { toast } from '@/hooks/use-toast';

// Mapear produto do Supabase para tipo assistencia.Produto
function mapSupabaseToAssistencia(supabaseProduto: any): Produto {
  return {
    id: supabaseProduto.id,
    codigo: supabaseProduto.codigo || undefined,
    codigo_barras: supabaseProduto.codigo_barras || undefined,
    situacao: 'ativo', // Sempre ativo se está no banco
    tipo: (supabaseProduto.tipo === 'servico' ? 'servico' : 'peca') as any,
    descricao: supabaseProduto.nome || '',
    descricao_abreviada: undefined, // Não existe no Supabase ainda
    referencia: supabaseProduto.referencia || undefined,
    categoria: supabaseProduto.grupo || undefined,
    grupo_id: undefined, // Não temos grupos ainda
    marca: supabaseProduto.marca || undefined,
    marca_id: undefined,
    modelo_id: undefined,
    modelo_compativel: supabaseProduto.modelo || undefined,
    preco_custo: Number(supabaseProduto.vi_compra || supabaseProduto.vi_custo || 0),
    preco_venda: Number(supabaseProduto.valor_dinheiro_pix || 0),
    margem_lucro: Number(supabaseProduto.margem_percentual || 0),
    estoque_atual: Number(supabaseProduto.quantidade || 0),
    estoque_minimo: 0, // Não existe no Supabase ainda
    localizacao: undefined,
    ncm: undefined,
    unidade: undefined,
    created_at: supabaseProduto.created_at || new Date().toISOString(),
    updated_at: supabaseProduto.updated_at || supabaseProduto.updated_at,
    // Campos adicionais da tabela para acesso direto
    grupo_nome: supabaseProduto.grupo || undefined,
    sub_grupo_nome: supabaseProduto.sub_grupo || undefined,
  } as any;
}

// Mapear produto assistencia.Produto para Supabase
function mapAssistenciaToSupabase(produto: Partial<Produto>): any {
  return {
    nome: produto.descricao || '',
    marca: produto.marca || 'Geral',
    modelo: produto.modelo_compativel || produto.modelo_id || 'Geral',
    qualidade: 'Original', // Padrão
    valor_dinheiro_pix: produto.preco_venda || 0,
    valor_parcelado_6x: (produto.preco_venda || 0) * 1.2, // 20% de acréscimo padrão
    codigo: produto.codigo || null,
    codigo_barras: produto.codigo_barras || null,
    referencia: produto.referencia || null,
    grupo: produto.categoria || null,
    sub_grupo: null,
    vi_compra: produto.preco_custo || 0,
    vi_custo: produto.preco_custo || 0,
    quantidade: produto.estoque_atual || 0,
    margem_percentual: produto.margem_lucro || 0,
    tipo: produto.tipo === 'servico' ? 'servico' : 'produto',
  };
}

export function useProdutos() {
  const queryClient = useQueryClient();

  // Buscar produtos do Supabase
  const { data: produtosData, isLoading, error } = useQuery({
    queryKey: ['produtos-assistencia'],
    queryFn: async () => {
      // Buscar todos os produtos sem limite (Supabase tem limite padrão de 1000)
      // Usar paginação para buscar todos
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('produtos')
          .select('*')
          .order('nome', { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      return allData.map(mapSupabaseToAssistencia);
    },
  });

  const produtos = produtosData || [];

  // Criar produto
  const createProduto = useCallback(async (data: Partial<Produto>): Promise<Produto> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const produtoSupabase = mapAssistenciaToSupabase(data);
    
    const { data: novoProduto, error } = await supabase
      .from('produtos')
      .insert({
        ...produtoSupabase,
        criado_por: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Erro ao criar produto',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ['produtos-assistencia'] });
    
    toast({
      title: 'Sucesso',
      description: 'Produto criado com sucesso!',
    });

    return mapSupabaseToAssistencia(novoProduto);
  }, [queryClient]);

  // Atualizar produto
  const updateProduto = useCallback(async (id: string, data: Partial<Produto>) => {
    const produtoSupabase = mapAssistenciaToSupabase(data);
    
    const { error } = await supabase
      .from('produtos')
      .update(produtoSupabase)
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro ao atualizar produto',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ['produtos-assistencia'] });
    
    toast({
      title: 'Sucesso',
      description: 'Produto atualizado com sucesso!',
    });
  }, [queryClient]);

  // Deletar produto (soft delete - marcar como inativo)
  const deleteProduto = useCallback(async (id: string) => {
    // Como não temos campo situacao, vamos deletar fisicamente
    // Ou podemos adicionar um campo disponivel = false
    const { error } = await supabase
      .from('produtos')
      .update({ disponivel: false })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro ao deletar produto',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ['produtos-assistencia'] });
    
    toast({
      title: 'Sucesso',
      description: 'Produto deletado com sucesso!',
    });
  }, [queryClient]);

  // Grupos (mock - não temos grupos no Supabase ainda)
  const grupos = useMemo(() => [], []);

  return {
    produtos: produtos.filter(p => p.situacao === 'ativo'), // Filtrar apenas ativos
    grupos,
    isLoading,
    createProduto,
    updateProduto,
    deleteProduto,
  };
}

