import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { from } from '@/integrations/db/client';
import { supabase } from '@/integrations/supabase/client'; // Mantido para auth.getUser()
import { Produto } from '@/types/assistencia';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from '@/hooks/use-toast';

// Mapear produto do Supabase para tipo assistencia.Produto
// Usar apenas colunas que existem no banco
function mapSupabaseToAssistencia(supabaseProduto: any): Produto {
  return {
    id: supabaseProduto.id,
    
    // Identificação (colunas existentes)
    codigo: supabaseProduto.codigo || undefined,
    nome: supabaseProduto.nome || '',
    codigo_barras: supabaseProduto.codigo_barras || undefined,
    referencia: supabaseProduto.referencia || undefined,
    marca: supabaseProduto.marca || undefined,
    modelo: supabaseProduto.modelo || undefined,
    grupo: supabaseProduto.grupo || undefined,
    sub_grupo: supabaseProduto.sub_grupo || undefined,
    qualidade: supabaseProduto.qualidade || undefined,
    
    // Preço (BRL) - usar apenas colunas existentes
    valor_venda: Number(supabaseProduto.valor_dinheiro_pix || 0),
    valor_parcelado_6x: supabaseProduto.valor_parcelado_6x ? Number(supabaseProduto.valor_parcelado_6x) : undefined,
    margem_percentual: supabaseProduto.margem_percentual ? Number(supabaseProduto.margem_percentual) : undefined,
    
    // Estoque - usar quantidade (coluna existente)
    quantidade: Number(supabaseProduto.quantidade || 0),
    estoque_minimo: supabaseProduto.estoque_minimo ? Number(supabaseProduto.estoque_minimo) : undefined,
    localizacao: supabaseProduto.localizacao || undefined,
    
    // Campos internos (timestamps)
    created_at: supabaseProduto.created_at || supabaseProduto.criado_em || new Date().toISOString(),
    updated_at: supabaseProduto.updated_at || supabaseProduto.atualizado_em || undefined,
    
    // Compatibilidade com código antigo (deprecated) - mapear para campos existentes
    descricao: supabaseProduto.nome || '',
    categoria: supabaseProduto.grupo || undefined,
    preco_venda: Number(supabaseProduto.valor_dinheiro_pix || 0),
    margem_lucro: supabaseProduto.margem_percentual ? Number(supabaseProduto.margem_percentual) : undefined,
    estoque_atual: Number(supabaseProduto.quantidade || 0),
    modelo_compativel: supabaseProduto.modelo || undefined,
  } as Produto;
}

interface UseProdutosPaginatedOptions {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  grupo?: string;
}

export function useProdutosPaginated(options: UseProdutosPaginatedOptions = {}) {
  const queryClient = useQueryClient();
  const {
    page: initialPage = 1,
    pageSize: initialPageSize = 50,
    searchTerm: initialSearchTerm = '',
    grupo: initialGrupo = '',
  } = options;

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [grupo, setGrupo] = useState(initialGrupo);

  // Debounce na busca (300ms)
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Calcular from e to para paginação
  const from = useMemo(() => (page - 1) * pageSize, [page, pageSize]);
  const to = useMemo(() => from + pageSize - 1, [from, pageSize]);

  // Query para buscar produtos paginados
  const {
    data: produtosData,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['produtos-paginated', page, pageSize, debouncedSearchTerm, grupo],
    queryFn: async () => {
      // Construir query base - buscar apenas colunas existentes no banco
      // Schema real: id, codigo, nome, codigo_barras, referencia, marca, modelo, grupo, sub_grupo, qualidade, valor_dinheiro_pix, valor_parcelado_6x, margem_percentual, quantidade
      // Timestamps: usar criado_em/atualizado_em (não created_at/updated_at)
      let query = supabase
        .from('produtos')
        .select('id,codigo,nome,codigo_barras,referencia,marca,modelo,grupo,sub_grupo,qualidade,valor_dinheiro_pix,valor_parcelado_6x,margem_percentual,quantidade,estoque_minimo,localizacao,criado_em,atualizado_em', { count: 'exact' })
        .order('nome', { ascending: true }); // Ordenar por nome (descrição) de A a Z

      // Removido filtro de situação (coluna pode não existir)

      // Aplicar filtro de grupo/categoria (apenas se grupo não estiver vazio)
      if (grupo && grupo.trim() !== '') {
        query = query.eq('grupo', grupo);
      }

      // Aplicar busca (nome, codigo, codigo_barras, referencia) - usar debounced
      if (debouncedSearchTerm.trim()) {
        const search = debouncedSearchTerm.trim();
        // Tentar buscar por código numérico primeiro
        const codigoNum = parseInt(search);
        if (!isNaN(codigoNum)) {
          // Busca por código numérico ou texto
          query = query.or(
            `nome.ilike.%${search}%,codigo.eq.${codigoNum},codigo_barras.ilike.%${search}%,referencia.ilike.%${search}%`
          );
        } else {
          // Busca apenas por texto
          query = query.or(
            `nome.ilike.%${search}%,codigo_barras.ilike.%${search}%,referencia.ilike.%${search}%`
          );
        }
      }

      // Aplicar paginação
      // IMPORTANTE: count deve ser buscado ANTES de aplicar range
      // Primeiro, buscar o count total (sem range)
      const countQuery = supabase
        .from('produtos')
        .select('*', { count: 'exact', head: true });
      
      // Aplicar os mesmos filtros no count
      if (grupo && grupo.trim() !== '') {
        countQuery.eq('grupo', grupo);
      }
      
      if (debouncedSearchTerm.trim()) {
        const search = debouncedSearchTerm.trim();
        const codigoNum = parseInt(search);
        if (!isNaN(codigoNum)) {
          countQuery.or(
            `nome.ilike.%${search}%,codigo.eq.${codigoNum},codigo_barras.ilike.%${search}%,referencia.ilike.%${search}%`
          );
        } else {
          countQuery.or(
            `nome.ilike.%${search}%,codigo_barras.ilike.%${search}%,referencia.ilike.%${search}%`
          );
        }
      }
      
      // Buscar count e data em paralelo
      const [countResult, dataResult] = await Promise.all([
        countQuery,
        query.range(from, to)
      ]);
      
      const { count, error: countError } = countResult;
      const { data, error: dataError } = dataResult;
      const error = dataError || countError;

      if (error) {
        console.error('[useProdutosPaginated] Erro na query:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw new Error(`Erro ao buscar produtos: ${error.message}${error.hint ? ` (${error.hint})` : ''}`);
      }

      const result = {
        produtos: (data || []).map(mapSupabaseToAssistencia),
        totalCount: count || 0,
      };
      
      console.log('[useProdutosPaginated] Resultado:', {
        page,
        produtosCount: result.produtos.length,
        totalCount: result.totalCount,
        from,
        to,
      });
      
      return result;
    },
    keepPreviousData: false, // Desabilitar para garantir dados atualizados
    staleTime: 0, // Sempre buscar dados frescos
    enabled: true, // Sempre habilitado
    refetchOnWindowFocus: false, // Não refetch ao focar janela
  });

  const produtos = produtosData?.produtos || [];
  const totalCount = produtosData?.totalCount || 0;
  const totalPages = useMemo(() => {
    const pages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 1;
    console.log('[useProdutosPaginated] Calculando totalPages:', {
      totalCount,
      pageSize,
      totalPages: pages,
    });
    return pages;
  }, [totalCount, pageSize]);

  // Prefetch da próxima página para navegação mais rápida (opcional)
  useEffect(() => {
    if (produtos.length === pageSize && totalPages > page) {
      const nextPage = page + 1;
      const nextFrom = (nextPage - 1) * pageSize;
      const nextTo = nextFrom + pageSize - 1;
      
      queryClient.prefetchQuery({
        queryKey: ['produtos-paginated', nextPage, pageSize, debouncedSearchTerm, grupo],
        queryFn: async () => {
          let query = supabase
            .from('produtos')
            .select('id,codigo,nome,codigo_barras,referencia,marca,modelo,grupo,sub_grupo,qualidade,valor_dinheiro_pix,valor_parcelado_6x,margem_percentual,quantidade,estoque_minimo,localizacao,criado_em,atualizado_em', { count: 'exact' })
            .order('nome', { ascending: true }); // Ordenar por nome (descrição) de A a Z

          if (grupo && grupo.trim() !== '') {
            query = query.eq('grupo', grupo);
          }

          if (debouncedSearchTerm.trim()) {
            const search = debouncedSearchTerm.trim();
            const codigoNum = parseInt(search);
            if (!isNaN(codigoNum)) {
              query = query.or(
                `nome.ilike.%${search}%,codigo.eq.${codigoNum},codigo_barras.ilike.%${search}%,referencia.ilike.%${search}%`
              );
            } else {
              query = query.or(
                `nome.ilike.%${search}%,codigo_barras.ilike.%${search}%,referencia.ilike.%${search}%`
              );
            }
          }

          const { data, error } = await query.range(nextFrom, nextTo);
          if (error) throw error;
          return {
            produtos: (data || []).map(mapSupabaseToAssistencia),
            totalCount: 0,
          };
        },
        staleTime: 30000,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, produtos.length, totalPages, debouncedSearchTerm, grupo]);

  // Resetar para página 1 quando filtros mudarem
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setPage(1);
  }, []);

  const handleGrupoChange = useCallback((value: string) => {
    setGrupo(value);
    setPage(1);
  }, []);

  // Funções de paginação
  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  }, [totalPages]);

  const goToNextPage = useCallback(() => {
    setPage((currentPage) => {
      const nextPage = currentPage + 1;
      console.log('[useProdutosPaginated] goToNextPage:', {
        currentPage,
        nextPage,
        totalPages,
        canGoNext: nextPage <= totalPages,
      });
      // Verificar se há mais páginas disponíveis
      if (nextPage <= totalPages) {
        return nextPage;
      }
      console.warn('[useProdutosPaginated] Não é possível ir para próxima página:', {
        nextPage,
        totalPages,
      });
      return currentPage;
    });
  }, [totalPages]);

  const goToPreviousPage = useCallback(() => {
    setPage((currentPage) => {
      if (currentPage > 1) {
        return currentPage - 1;
      }
      return currentPage;
    });
  }, []);

  // Buscar grupos únicos para o filtro
  const { data: gruposData } = useQuery({
    queryKey: ['produtos-grupos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select('grupo')
        .not('grupo', 'is', null);

      if (error) throw error;

      // Extrair grupos únicos
      const gruposUnicos = Array.from(
        new Set((data || []).map((p) => p.grupo).filter(Boolean))
      ).sort();

      return gruposUnicos.map((nome) => ({ id: nome, nome }));
    },
    staleTime: 300000, // 5 minutos
  });

  const grupos = gruposData || [];

  // Mapear produto assistencia.Produto para Supabase
  // Usar apenas colunas que existem no banco
  function mapAssistenciaToSupabase(produto: Partial<Produto>): any {
    const payload: any = {};

    // Identificação (colunas existentes)
    if (produto.nome !== undefined) {
      payload.nome = produto.nome.toUpperCase();
    } else if (produto.descricao !== undefined) {
      payload.nome = produto.descricao.toUpperCase();
    }
    
    if (produto.codigo !== undefined && produto.codigo !== null) {
      payload.codigo = produto.codigo;
    }
    
    if (produto.codigo_barras !== undefined && produto.codigo_barras !== null && produto.codigo_barras !== '') {
      payload.codigo_barras = produto.codigo_barras;
    }
    
    if (produto.referencia !== undefined && produto.referencia !== null && produto.referencia !== '') {
      payload.referencia = produto.referencia;
    }
    
    if (produto.marca !== undefined && produto.marca !== null && produto.marca !== '') {
      payload.marca = produto.marca;
    }
    
    if (produto.modelo !== undefined && produto.modelo !== null && produto.modelo !== '') {
      payload.modelo = produto.modelo;
    }
    
    if (produto.grupo !== undefined && produto.grupo !== null && produto.grupo !== '') {
      payload.grupo = produto.grupo;
    }
    
    if (produto.sub_grupo !== undefined && produto.sub_grupo !== null && produto.sub_grupo !== '') {
      payload.sub_grupo = produto.sub_grupo;
    }
    
    if (produto.qualidade !== undefined && produto.qualidade !== null && produto.qualidade !== '') {
      payload.qualidade = produto.qualidade;
    }

    // Preço (BRL) - usar apenas colunas existentes
    if (produto.valor_venda !== undefined && produto.valor_venda !== null) {
      payload.valor_dinheiro_pix = produto.valor_venda;
    }
    
    if (produto.valor_parcelado_6x !== undefined && produto.valor_parcelado_6x !== null) {
      payload.valor_parcelado_6x = produto.valor_parcelado_6x;
    }
    
    if (produto.margem_percentual !== undefined && produto.margem_percentual !== null) {
      payload.margem_percentual = produto.margem_percentual;
    }

    // Estoque - quantidade, estoque_minimo e localizacao
    if (produto.quantidade !== undefined && produto.quantidade !== null) {
      payload.quantidade = produto.quantidade;
    }
    
    if (produto.estoque_minimo !== undefined && produto.estoque_minimo !== null) {
      payload.estoque_minimo = produto.estoque_minimo;
    }
    
    if (produto.localizacao !== undefined && produto.localizacao !== null && produto.localizacao !== '') {
      payload.localizacao = produto.localizacao;
    }

    // Remover campos que não devem ser enviados
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;
    delete payload.criado_em;
    delete payload.atualizado_em;
    delete payload.criado_por;

    return payload;
  }

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

    queryClient.invalidateQueries({ queryKey: ['produtos-paginated'] });
    queryClient.invalidateQueries({ queryKey: ['produtos-grupos'] });
    
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

    queryClient.invalidateQueries({ queryKey: ['produtos-paginated'] });
    queryClient.invalidateQueries({ queryKey: ['produtos-grupos'] });
    
    toast({
      title: 'Sucesso',
      description: 'Produto atualizado com sucesso!',
    });
  }, [queryClient]);

  // Deletar produto (deletar fisicamente)
  const deleteProduto = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro ao deletar produto',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ['produtos-paginated'] });
    queryClient.invalidateQueries({ queryKey: ['produtos-grupos'] });
    
    toast({
      title: 'Sucesso',
      description: 'Produto deletado com sucesso!',
    });
  }, [queryClient]);

  // Invalidação de queries após mutations
  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['produtos-paginated'] });
    queryClient.invalidateQueries({ queryKey: ['produtos-grupos'] });
  }, [queryClient]);

  const result = {
    // Dados
    produtos,
    grupos,
    isLoading,
    isFetching,
    error,

    // Paginação
    page,
    setPage: goToPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    goToNextPage,
    goToPreviousPage,

    // Filtros
    searchTerm,
    setSearchTerm: handleSearchChange,
    grupo,
    setGrupo: handleGrupoChange,

    // Mutations
    createProduto,
    updateProduto,
    deleteProduto,

    // Utilitários
    invalidateQueries,
  };

  return result;
}

