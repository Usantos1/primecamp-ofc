import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { from as dbFrom } from '@/integrations/db/client';
import { useAuth } from '@/contexts/AuthContext';
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
    // Custo (compat): vi_custo (importação) / valor_compra (legado)
    preco_custo: Number(supabaseProduto.vi_custo || supabaseProduto.valor_compra || 0),
    valor_compra: Number(supabaseProduto.vi_custo || supabaseProduto.valor_compra || 0),
    valor_parcelado_6x: supabaseProduto.valor_parcelado_6x ? Number(supabaseProduto.valor_parcelado_6x) : undefined,
    margem_percentual: supabaseProduto.margem_percentual ? Number(supabaseProduto.margem_percentual) : undefined,
    
    // Estoque - usar quantidade (coluna existente)
    quantidade: Number(supabaseProduto.quantidade || 0),
    estoque_fisico: supabaseProduto.estoque_fisico != null ? Number(supabaseProduto.estoque_fisico || 0) : undefined,
    estoque_reservado: supabaseProduto.estoque_reservado != null ? Number(supabaseProduto.estoque_reservado || 0) : undefined,
    estoque_disponivel: supabaseProduto.estoque_disponivel != null ? Number(supabaseProduto.estoque_disponivel || 0) : undefined,
    estoque_minimo: supabaseProduto.estoque_minimo ? Number(supabaseProduto.estoque_minimo) : undefined,
    estoque_unidades: Array.isArray(supabaseProduto.estoque_unidades) ? supabaseProduto.estoque_unidades : undefined,
    localizacao: supabaseProduto.localizacao || undefined,
    unidade: supabaseProduto.unidade || undefined,
    estoque_grade: supabaseProduto.estoque_grade && typeof supabaseProduto.estoque_grade === 'object'
      ? { tipo: supabaseProduto.estoque_grade.tipo, itens: supabaseProduto.estoque_grade.itens || {} }
      : undefined,
    
    // Configurações (tipo, garantia)
    tipo: (supabaseProduto.tipo || 'PECA') as 'PECA' | 'SERVICO' | 'PRODUTO',
    garantia_dias: supabaseProduto.garantia_dias != null ? Number(supabaseProduto.garantia_dias) : undefined,
    
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

export type SearchField = 'all' | 'codigo' | 'referencia' | 'codigo_barras' | 'descricao' | 'localizacao';

interface UseProdutosPaginatedOptions {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  searchField?: SearchField;
  grupo?: string;
  localizacao?: string;
  orderBy?: 'nome' | 'codigo';
  orderDirection?: 'asc' | 'desc';
}

export function useProdutosPaginated(options: UseProdutosPaginatedOptions = {}) {
  const queryClient = useQueryClient();
  const { user, profile, activeBranchId } = useAuth();
  const {
    page: initialPage = 1,
    pageSize: initialPageSize = 50,
    searchTerm: initialSearchTerm = '',
    searchField: initialSearchField = 'all',
    grupo: initialGrupo = '',
    localizacao: initialLocalizacao = '',
    orderBy: initialOrderBy = 'nome',
    orderDirection: initialOrderDirection = 'asc',
  } = options;

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [searchField, setSearchField] = useState<SearchField>(initialSearchField);
  const [grupo, setGrupo] = useState(initialGrupo);
  const [localizacao, setLocalizacao] = useState(initialLocalizacao);
  const [orderBy, setOrderByState] = useState<'nome' | 'codigo'>(initialOrderBy);
  const [orderDirection, setOrderDirectionState] = useState<'asc' | 'desc'>(initialOrderDirection);

  // Wrappers que invalidam cache e resetam página
  const setOrderBy = useCallback((field: 'nome' | 'codigo') => {
    setOrderByState(field);
    setPage(1);
    queryClient.invalidateQueries({ queryKey: ['produtos-paginated'] });
  }, [queryClient, setPage]);

  const setOrderDirection = useCallback((direction: 'asc' | 'desc') => {
    setOrderDirectionState(direction);
    setPage(1);
    queryClient.invalidateQueries({ queryKey: ['produtos-paginated'] });
  }, [queryClient, setPage]);

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
    queryKey: ['produtos-paginated', activeBranchId, page, pageSize, debouncedSearchTerm, searchField, grupo, localizacao, orderBy, orderDirection],
    queryFn: async () => {
      // Construir query base usando wrapper PostgreSQL
      const selectFields = 'id,codigo,nome,codigo_barras,referencia,marca,modelo,grupo,sub_grupo,qualidade,valor_dinheiro_pix,valor_parcelado_6x,margem_percentual,quantidade,estoque_minimo,localizacao,unidade,tipo,garantia_dias,vi_custo,estoque_grade,criado_em,atualizado_em';
      
      let query = dbFrom('produtos')
        .select(selectFields);
      
      // Aplicar ordenação
      if (orderBy === 'codigo') {
        query = query.order('codigo', { ascending: orderDirection === 'asc' });
      } else {
        query = query.order('nome', { ascending: orderDirection === 'asc' });
      }

      // Aplicar filtro de grupo/categoria
      if (grupo && grupo.trim() !== '') {
        query = query.eq('grupo', grupo);
      }

      // Aplicar filtro de localização
      if (localizacao && localizacao.trim() !== '') {
        query = query.eq('localizacao', localizacao.trim());
      }

      // Aplicar busca (nome, codigo, codigo_barras, referencia)
      if (debouncedSearchTerm.trim()) {
        const search = debouncedSearchTerm.trim();
        const codigoNum = parseInt(search);
        
        // Busca por campo específico ou todos
        if (searchField === 'codigo') {
          if (!isNaN(codigoNum)) {
            query = query.eq('codigo', codigoNum);
          } else {
            query = query.ilike('codigo', `%${search}%`);
          }
        } else if (searchField === 'referencia') {
          query = query.ilike('referencia', `%${search}%`);
        } else if (searchField === 'codigo_barras') {
          query = query.ilike('codigo_barras', `%${search}%`);
        } else if (searchField === 'descricao') {
          query = query.ilike('nome', `%${search}%`);
        } else if (searchField === 'localizacao') {
          query = query.ilike('localizacao', `%${search}%`);
        } else {
          // Busca em todos os campos
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
      }

      // Aplicar paginação
      query = query.range(from, to);
      
      // Executar query (count vem automaticamente)
      let { data, error, count } = await query.execute();

      // Fallback defensivo: se a coluna vi_custo não existir no banco, refazer sem ela
      if (error && String(error.message || error).includes('vi_custo') && String(error.message || error).includes('does not exist')) {
        const fallbackFields = 'id,codigo,nome,codigo_barras,referencia,marca,modelo,grupo,sub_grupo,qualidade,valor_dinheiro_pix,valor_parcelado_6x,margem_percentual,quantidade,estoque_minimo,localizacao,unidade,tipo,garantia_dias,estoque_grade,criado_em,atualizado_em';
        let fallbackQuery = dbFrom('produtos')
          .select(fallbackFields);
        fallbackQuery = fallbackQuery.order(orderBy === 'codigo' ? 'codigo' : 'nome', { ascending: orderDirection === 'asc', nullsFirst: orderBy === 'codigo' ? false : true });
        if (grupo && grupo.trim() !== '') fallbackQuery = fallbackQuery.eq('grupo', grupo);
        if (localizacao && localizacao.trim() !== '') fallbackQuery = fallbackQuery.eq('localizacao', localizacao.trim());
        if (debouncedSearchTerm.trim()) {
          const search = debouncedSearchTerm.trim();
          const codigoNum = parseInt(search);
          if (!isNaN(codigoNum)) {
            fallbackQuery = fallbackQuery.or(
              `nome.ilike.%${search}%,codigo.eq.${codigoNum},codigo_barras.ilike.%${search}%,referencia.ilike.%${search}%`
            );
          } else {
            fallbackQuery = fallbackQuery.or(
              `nome.ilike.%${search}%,codigo_barras.ilike.%${search}%,referencia.ilike.%${search}%`
            );
          }
        }
        fallbackQuery = fallbackQuery.range(from, to);
        const fallbackRes = await fallbackQuery.execute();
        data = fallbackRes.data;
        error = fallbackRes.error;
        count = fallbackRes.count;
      }

      if (error) {
        console.error('[useProdutosPaginated] Erro na query:', {
          message: error.message || error,
          error,
        });
        throw new Error(`Erro ao buscar produtos: ${error.message || error}`);
      }

      let rows = data || [];
      if (activeBranchId && rows.length > 0) {
        const productIds = rows.map((row: any) => row.id).filter(Boolean);
        const { data: stocks, error: stockError } = await dbFrom('product_stocks')
          .select('product_id,branch_id,quantity,reserved_quantity,minimum_quantity')
          .in('product_id', productIds)
          .execute();

        if (!stockError) {
          const osReservedByProductBranch = new Map<string, number>();
          const { data: osItems, error: osItemsError } = await dbFrom('os_items')
            .select('produto_id,tipo,quantidade,branch_id,ordem_servico_id')
            .in('produto_id', productIds)
            .execute();

          const pendingOsItems = osItemsError
            ? []
            : (osItems || []).filter((item: any) => String(item.tipo || 'peca').toLowerCase() === 'peca');
          const osIds = Array.from(new Set(pendingOsItems.map((item: any) => item.ordem_servico_id).filter(Boolean)));
          let openOsById = new Map<string, any>();
          if (osIds.length > 0) {
            const { data: ordens } = await dbFrom('ordens_servico')
              .select('id,status,branch_id')
              .in('id', osIds)
              .execute();
            const closedStatuses = new Set(['cancelada', 'entregue', 'entregue_faturada', 'entregue_sem_reparo']);
            openOsById = new Map(
              (ordens || [])
                .filter((os: any) => !closedStatuses.has(String(os.status || '').toLowerCase()))
                .map((os: any) => [os.id, os])
            );
          }

          pendingOsItems.forEach((item: any) => {
            const os = openOsById.get(item.ordem_servico_id);
            if (!os) return;
            const branchId = item.branch_id || os.branch_id || '';
            const key = `${item.produto_id}:${branchId}`;
            osReservedByProductBranch.set(key, (osReservedByProductBranch.get(key) || 0) + Math.abs(Number(item.quantidade || 0)));
          });

          const branchIds = Array.from(new Set((stocks || []).map((stock: any) => stock.branch_id).filter(Boolean)));
          let branchNames = new Map<string, string>();
          if (branchIds.length > 0) {
            const { data: branches } = await dbFrom('branches')
              .select('id,name')
              .in('id', branchIds)
              .execute();
            branchNames = new Map((branches || []).map((branch: any) => [branch.id, branch.name]));
          }
          const stocksByProduct = new Map<string, any[]>();
          (stocks || []).forEach((stock: any) => {
            const current = stocksByProduct.get(stock.product_id) || [];
            current.push(stock);
            stocksByProduct.set(stock.product_id, current);
          });
          rows = rows.map((row: any) => {
            const productStocks = stocksByProduct.get(row.id) || [];
            const isAllBranches = activeBranchId === 'all';
            const stock = isAllBranches ? null : productStocks.find((item) => item.branch_id === activeBranchId);
            const getReservedQuantity = (item: any) => Math.max(
              Number(item.reserved_quantity || 0),
              osReservedByProductBranch.get(`${row.id}:${item.branch_id}`) || 0
            );
            const physicalQuantity = isAllBranches
              ? productStocks.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
              : stock ? Number(stock.quantity || 0) : 0;
            const reservedQuantity = isAllBranches
              ? productStocks.reduce((sum, item) => sum + getReservedQuantity(item), 0)
              : stock ? getReservedQuantity(stock) : 0;
            const quantity = Math.max(0, physicalQuantity - reservedQuantity);
            const minimumQuantity = isAllBranches
              ? productStocks.reduce((sum, item) => sum + Number(item.minimum_quantity || 0), 0)
              : stock ? Number(stock.minimum_quantity || 0) : 0;
            return {
              ...row,
              quantidade: quantity,
              estoque_fisico: physicalQuantity,
              estoque_reservado: reservedQuantity,
              estoque_disponivel: quantity,
              estoque_minimo: minimumQuantity,
              estoque_unidades: productStocks.map((item) => ({
                branch_id: item.branch_id,
                branch_name: branchNames.get(item.branch_id) || 'Unidade',
                quantity: Number(item.quantity || 0),
                reserved_quantity: getReservedQuantity(item),
                available_quantity: Math.max(0, Number(item.quantity || 0) - getReservedQuantity(item)),
                minimum_quantity: Number(item.minimum_quantity || 0),
                is_active_branch: isAllBranches || item.branch_id === activeBranchId,
              })),
            };
          });
        }
      }
      
      // Garantir que count seja um número válido
      // Se count for undefined, null, 0 ou NaN, manter o valor anterior ou usar um valor seguro
      let finalCount = count;
      if (finalCount === undefined || finalCount === null || isNaN(finalCount) || finalCount < 0) {
        // Se não temos count válido, não podemos usar rows.length pois não é o total real
        // Vamos usar 0 temporariamente e deixar que a próxima query traga o count correto
        finalCount = 0;
        console.warn('[useProdutosPaginated] Count inválido recebido:', count, '- usando 0 temporariamente');
      }
      
      const result = {
        produtos: rows.map(mapSupabaseToAssistencia),
        totalCount: finalCount,
      };
      
      if (import.meta.env?.DEV) {
        console.log('[useProdutosPaginated] Resultado:', { page, produtosCount: result.produtos.length, totalCount: result.totalCount });
      }
      return result;
    },
    staleTime: Infinity, // Dados nunca ficam stale - não refetch automático
    refetchInterval: false, // Nunca atualizar sozinho (evita atualizar a cada X min enquanto vendedor edita)
    enabled: true,
    refetchOnWindowFocus: false, // Não refetch ao focar janela
    refetchOnMount: false, // Não refetch ao montar componente
    refetchOnReconnect: false, // Não refetch ao reconectar
    gcTime: 1000 * 60 * 60, // Manter em cache por 1 hora (anteriormente cacheTime)
  });

  const produtos = produtosData?.produtos || [];
  // Só usar totalCount se for um número válido maior que 0
  // Se for 0 e temos produtos, pode ser que o count ainda não foi carregado
  const totalCount = useMemo(() => {
    const count = produtosData?.totalCount;
    // Se temos produtos mas count é 0, pode ser que ainda está carregando
    // Nesse caso, manter 0 para não mostrar paginação errada
    if (count !== undefined && count !== null && !isNaN(count) && count >= 0) {
      return count;
    }
    return 0;
  }, [produtosData?.totalCount]);
  
  const totalPages = useMemo(() => {
    // Se totalCount for 0 mas temos produtos, pode ser que ainda está carregando o count
    // Nesse caso, calcular baseado nos produtos retornados como estimativa mínima
    if (totalCount === 0 && produtos.length > 0) {
      return Math.max(1, Math.ceil(produtos.length / pageSize));
    }
    return totalCount > 0 ? Math.ceil(totalCount / pageSize) : 1;
  }, [totalCount, pageSize, produtos.length]);

  // Prefetch da próxima página para navegação mais rápida (opcional)
  useEffect(() => {
    if (produtos.length === pageSize && totalPages > page) {
      const nextPage = page + 1;
      const nextFrom = (nextPage - 1) * pageSize;
      const nextTo = nextFrom + pageSize - 1;
      
      queryClient.prefetchQuery({
        queryKey: ['produtos-paginated', nextPage, pageSize, debouncedSearchTerm, searchField, grupo, localizacao, orderBy, orderDirection],
        queryFn: async () => {
          const selectFields = 'id,codigo,nome,codigo_barras,referencia,marca,modelo,grupo,sub_grupo,qualidade,valor_dinheiro_pix,valor_parcelado_6x,margem_percentual,quantidade,estoque_minimo,localizacao,unidade,tipo,garantia_dias,vi_custo,estoque_grade,criado_em,atualizado_em';
          
          let query = dbFrom('produtos')
            .select(selectFields);
          
          // Aplicar ordenação (mesma lógica da query principal)
          if (orderBy === 'codigo') {
            query = query.order('codigo', { ascending: orderDirection === 'asc', nullsFirst: false });
          } else {
            query = query.order('nome', { ascending: orderDirection === 'asc' });
          }

          if (grupo && grupo.trim() !== '') {
            query = query.eq('grupo', grupo);
          }

          if (localizacao && localizacao.trim() !== '') {
            query = query.eq('localizacao', localizacao.trim());
          }

          if (debouncedSearchTerm.trim()) {
            const search = debouncedSearchTerm.trim();
            const codigoNum = parseInt(search);
            
            // Aplicar busca com mesmo campo que a query principal
            if (searchField === 'codigo') {
              if (!isNaN(codigoNum)) {
                query = query.eq('codigo', codigoNum);
              } else {
                query = query.ilike('codigo', `%${search}%`);
              }
            } else if (searchField === 'referencia') {
              query = query.ilike('referencia', `%${search}%`);
            } else if (searchField === 'codigo_barras') {
              query = query.ilike('codigo_barras', `%${search}%`);
            } else if (searchField === 'descricao') {
              query = query.ilike('nome', `%${search}%`);
            } else if (searchField === 'localizacao') {
              query = query.ilike('localizacao', `%${search}%`);
            } else {
              // Busca em todos os campos
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
          }

          query = query.range(nextFrom, nextTo);
          const { data, error, count } = await query.execute();
          if (error) throw error;
          return {
            produtos: ((data || []) as any[]).map(mapSupabaseToAssistencia),
            totalCount: count || 0,
          };
        },
        staleTime: Infinity, // Dados nunca ficam stale - não refetch automático
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, produtos.length, totalPages, debouncedSearchTerm, searchField, grupo, localizacao, orderBy, orderDirection]);

  // Resetar para página 1 quando filtros mudarem e invalidar cache
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setPage(1);
    // Invalidar cache para forçar busca fresca
    queryClient.invalidateQueries({ queryKey: ['produtos-paginated'] });
  }, [queryClient]);

  const handleGrupoChange = useCallback((value: string) => {
    setGrupo(value);
    setPage(1);
    queryClient.invalidateQueries({ queryKey: ['produtos-paginated'] });
  }, [queryClient]);

  const handleLocalizacaoChange = useCallback((value: string) => {
    setLocalizacao(value);
    setPage(1);
    queryClient.invalidateQueries({ queryKey: ['produtos-paginated'] });
  }, [queryClient]);

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
      const { data, error } = await dbFrom('produtos')
        .select('grupo')
        .not('grupo', 'is', null)
        .execute();

      if (error) throw error;

      // Extrair grupos únicos
      const rows = data || [];
      const gruposUnicos = Array.from(
        new Set(rows.map((p: any) => p.grupo).filter(Boolean))
      ).sort();

      return gruposUnicos.map((nome) => ({ id: nome, nome }));
    },
    staleTime: 300000, // 5 minutos
  });

  const grupos = gruposData || [];

  // Buscar localizações únicas para o filtro
  const { data: localizacoesData } = useQuery({
    queryKey: ['produtos-localizacoes'],
    queryFn: async () => {
      const { data, error } = await dbFrom('produtos')
        .select('localizacao')
        .not('localizacao', 'is', null)
        .execute();

      if (error) throw error;

      const rows = data || [];
      const locsUnicas = Array.from(
        new Set(rows.map((p: any) => (p.localizacao || '').trim()).filter(Boolean))
      ).sort();

      return locsUnicas;
    },
    staleTime: 300000,
  });

  const localizacoes = localizacoesData || [];

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
    
    if ((produto as any).qualidade !== undefined && (produto as any).qualidade !== null && (produto as any).qualidade !== '') {
      payload.qualidade = (produto as any).qualidade;
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
    if (produto.unidade !== undefined && produto.unidade !== null && produto.unidade !== '') {
      payload.unidade = produto.unidade;
    }
    if (produto.estoque_grade !== undefined) {
      payload.estoque_grade = produto.estoque_grade ?? null;
    }
    if (produto.tipo !== undefined && produto.tipo !== null && produto.tipo !== '') {
      payload.tipo = produto.tipo;
    }
    if (produto.garantia_dias !== undefined && produto.garantia_dias !== null) {
      payload.garantia_dias = Number(produto.garantia_dias);
    }

    // Custo/Compra (quando existir no banco) - usar vi_custo (compatível com importação)
    if ((produto as any).preco_custo !== undefined && (produto as any).preco_custo !== null) {
      payload.vi_custo = Number((produto as any).preco_custo || 0);
    } else if ((produto as any).valor_compra !== undefined && (produto as any).valor_compra !== null) {
      payload.vi_custo = Number((produto as any).valor_compra || 0);
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
    if (!user) throw new Error('Usuário não autenticado');

    const produtoSupabase = mapAssistenciaToSupabase(data);
    
    const { data: novoProduto, error } = await dbFrom('produtos')
      .insert({
        ...produtoSupabase,
        criado_por: user.id,
      });

    if (error) {
      const msg = typeof error === 'object' && error !== null && 'message' in error ? String((error as any).message) : 'Erro ao criar produto';
      const isNetworkError = msg.includes('Failed to fetch');
      toast({
        title: 'Erro ao criar produto',
        description: isNetworkError ? 'Sem conexão com o servidor. Verifique sua internet e se a API está acessível.' : msg,
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

    return mapSupabaseToAssistencia(novoProduto?.data || novoProduto);
  }, [queryClient, user]);

  // Atualizar produto
  const updateProduto = useCallback(async (id: string, data: Partial<Produto>) => {
    const shouldUpdateBranchStock = !!activeBranchId && activeBranchId !== 'all' && (
      data.quantidade !== undefined ||
      data.estoque_minimo !== undefined
    );
    // Buscar estado anterior para auditoria
    const { data: oldRow, error: oldErr } = await dbFrom('produtos')
      .select('id, nome, quantidade, valor_dinheiro_pix, vi_custo')
      .eq('id', id)
      .single();

    if (oldErr && oldErr.code !== 'PGRST116') {
      const isNetworkError = oldErr.message?.includes('Failed to fetch') || (oldErr as any).message === 'Failed to fetch';
      toast({
        title: 'Erro ao atualizar produto',
        description: isNetworkError
          ? 'Sem conexão com o servidor. Verifique sua internet e se a API (api.ativafix.com) está acessível.'
          : 'Não foi possível carregar o estado anterior para auditoria.',
        variant: 'destructive',
      });
      throw oldErr;
    }

    const produtoSupabase = mapAssistenciaToSupabase(data);
    if (shouldUpdateBranchStock) {
      delete (produtoSupabase as any).quantidade;
      delete (produtoSupabase as any).estoque_minimo;
    }
    
    const { error } = await dbFrom('produtos')
      .eq('id', id)
      .update(produtoSupabase);

    if (error) {
      const msg = typeof error === 'object' && error !== null && 'message' in error ? String((error as any).message) : '';
      const isNetworkError = msg.includes('Failed to fetch');
      toast({
        title: 'Erro ao atualizar produto',
        description: isNetworkError
          ? 'Sem conexão com o servidor. Verifique sua internet e se a API está acessível.'
          : msg || 'Erro ao atualizar.',
        variant: 'destructive',
      });
      throw error;
    }

    let beforeBranchQtd: number | null = null;
    let afterBranchQtd: number | null = null;
    if (shouldUpdateBranchStock) {
      const { data: currentStock } = await dbFrom('product_stocks')
        .select('id,quantity,reserved_quantity,minimum_quantity')
        .eq('product_id', id)
        .eq('branch_id', activeBranchId)
        .maybeSingle();

      beforeBranchQtd = Number(currentStock?.quantity || 0);
      afterBranchQtd = data.quantidade !== undefined ? Number(data.quantidade || 0) : beforeBranchQtd;

      const stockPayload = {
        product_id: id,
        company_id: user?.company_id,
        branch_id: activeBranchId,
        quantity: afterBranchQtd,
        reserved_quantity: Number(currentStock?.reserved_quantity || 0),
        minimum_quantity: data.estoque_minimo !== undefined ? Number(data.estoque_minimo || 0) : Number(currentStock?.minimum_quantity || 0),
      };

      if (currentStock?.id) {
        const { error: stockUpdateError } = await dbFrom('product_stocks')
          .update(stockPayload)
          .eq('id', currentStock.id)
          .execute();
        if (stockUpdateError) throw stockUpdateError;
      } else {
        const { error: stockInsertError } = await dbFrom('product_stocks')
          .insert(stockPayload)
          .execute();
        if (stockInsertError) throw stockInsertError;
      }
    }

    queryClient.invalidateQueries({ queryKey: ['produtos-paginated'] });
    queryClient.invalidateQueries({ queryKey: ['produtos-grupos'] });
    
    // Registrar movimentações internas (estoque/preço/custo)
    try {
      const beforeQtd = beforeBranchQtd !== null ? beforeBranchQtd : Number((oldRow as any)?.quantidade ?? 0);
      const afterQtd = afterBranchQtd !== null ? afterBranchQtd : (data.quantidade !== undefined ? Number(data.quantidade ?? 0) : beforeQtd);
      const beforeVenda = Number((oldRow as any)?.valor_dinheiro_pix ?? 0);
      const afterVenda = data.valor_venda !== undefined ? Number(data.valor_venda ?? 0) : beforeVenda;
      const beforeCusto = Number((oldRow as any)?.vi_custo ?? 0);
      const afterCusto =
        (data as any).preco_custo !== undefined
          ? Number((data as any).preco_custo ?? 0)
          : (data as any).valor_compra !== undefined
            ? Number((data as any).valor_compra ?? 0)
            : beforeCusto;

      const userNome = profile?.display_name || user?.email || 'Usuário';
      const motivoAjusteEstoque = String((data as any).motivo_ajuste_estoque || '').trim() || 'Edição manual do produto';
      const movements: any[] = [];

      if (afterQtd !== beforeQtd) {
        movements.push({
          produto_id: id,
          tipo: 'ajuste_estoque',
          motivo: motivoAjusteEstoque,
          quantidade_antes: beforeQtd,
          quantidade_depois: afterQtd,
          quantidade_delta: afterQtd - beforeQtd,
          user_id: user?.id || null,
          user_nome: userNome,
        });
      }

      if (afterVenda !== beforeVenda) {
        movements.push({
          produto_id: id,
          tipo: 'ajuste_preco_venda',
          motivo: 'Edição manual do produto',
          valor_venda_antes: beforeVenda,
          valor_venda_depois: afterVenda,
          user_id: user?.id || null,
          user_nome: userNome,
        });
      }

      if (afterCusto !== beforeCusto) {
        movements.push({
          produto_id: id,
          tipo: 'ajuste_preco_custo',
          motivo: 'Edição manual do produto',
          valor_custo_antes: beforeCusto,
          valor_custo_depois: afterCusto,
          user_id: user?.id || null,
          user_nome: userNome,
        });
      }

      if (movements.length > 0) {
        const { error: movErr } = await dbFrom('produto_movimentacoes')
          .insert(movements)
          .execute();
        if (movErr) throw movErr;
      }
    } catch (auditErr) {
      console.error('[useProdutosPaginated] Falha ao registrar movimentação interna:', auditErr);
      toast({
        title: 'Aviso',
        description: 'Produto atualizado, mas falhou ao registrar movimentação interna. Verifique se a tabela produto_movimentacoes existe e foi aplicada no banco.',
        variant: 'destructive',
      });
    }

    toast({
      title: 'Sucesso',
      description: 'Produto atualizado com sucesso!',
    });
  }, [queryClient, user, profile, activeBranchId]);

  // Deletar produto (deletar fisicamente)
  const deleteProduto = useCallback(async (id: string) => {
    const { error } = await dbFrom('produtos')
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
    searchField,
    setSearchField,
    grupo,
    setGrupo: handleGrupoChange,
    localizacao,
    setLocalizacao: handleLocalizacaoChange,
    localizacoes,

    // Mutations
    createProduto,
    updateProduto,
    deleteProduto,

    // Ordenação
    orderBy,
    setOrderBy,
    orderDirection,
    setOrderDirection,

    // Utilitários
    invalidateQueries,
  };

  return result;
}

