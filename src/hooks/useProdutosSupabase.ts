import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { from } from '@/integrations/db/client';
import { Produto, ProdutoFormData } from '@/types/assistencia';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Mapear produto do Supabase para tipo assistencia.Produto
function mapSupabaseToAssistencia(supabaseProduto: any): Produto {
  return {
    id: supabaseProduto.id,
    
    // Identificação
    codigo: supabaseProduto.codigo || undefined,
    nome: supabaseProduto.nome || '',
    nome_abreviado: supabaseProduto.nome_abreviado || undefined,
    codigo_barras: supabaseProduto.codigo_barras || undefined,
    referencia: supabaseProduto.referencia || undefined,
    marca: supabaseProduto.marca || undefined,
    modelo: supabaseProduto.modelo || undefined,
    grupo: supabaseProduto.grupo || undefined,
    sub_grupo: supabaseProduto.sub_grupo || undefined,
    
    // Preço (BRL) - Busca em múltiplos campos possíveis
    valor_compra: Number(supabaseProduto.valor_compra || supabaseProduto.vi_compra || supabaseProduto.vi_custo || supabaseProduto.preco_custo || 0),
    valor_venda: Number(supabaseProduto.valor_venda || supabaseProduto.preco_venda || supabaseProduto.valor_dinheiro_pix || 0),
    valor_parcelado_6x: supabaseProduto.valor_parcelado_6x ? Number(supabaseProduto.valor_parcelado_6x) : undefined,
    margem_percentual: supabaseProduto.margem_percentual ? Number(supabaseProduto.margem_percentual) : undefined,
    permitir_desconto_percentual: supabaseProduto.permitir_desconto_percentual ? Number(supabaseProduto.permitir_desconto_percentual) : undefined,
    
    // Estoque
    quantidade: Number(supabaseProduto.quantidade || 0),
    estoque_minimo: supabaseProduto.estoque_minimo ? Number(supabaseProduto.estoque_minimo) : undefined,
    localizacao: supabaseProduto.localizacao || undefined,
    
    // Configurações
    situacao: (supabaseProduto.situacao || 'ATIVO') as 'ATIVO' | 'INATIVO',
    tipo: (supabaseProduto.tipo || 'PECA') as 'PECA' | 'SERVICO' | 'PRODUTO',
    garantia_dias: supabaseProduto.garantia_dias ? Number(supabaseProduto.garantia_dias) : undefined,
    peso_kg: supabaseProduto.peso_kg ? Number(supabaseProduto.peso_kg) : undefined,
    
    // Campos internos
    created_at: supabaseProduto.created_at || new Date().toISOString(),
    updated_at: supabaseProduto.updated_at || undefined,
    
    // Compatibilidade com código antigo (deprecated)
    descricao: supabaseProduto.nome || '',
    descricao_abreviada: supabaseProduto.nome_abreviado || undefined,
    categoria: supabaseProduto.grupo || undefined,
    preco_custo: Number(supabaseProduto.valor_compra || supabaseProduto.vi_compra || supabaseProduto.vi_custo || supabaseProduto.preco_custo || 0),
    preco_venda: Number(supabaseProduto.valor_venda || supabaseProduto.preco_venda || supabaseProduto.valor_dinheiro_pix || 0),
    margem_lucro: supabaseProduto.margem_percentual ? Number(supabaseProduto.margem_percentual) : undefined,
    estoque_atual: Number(supabaseProduto.quantidade || 0),
    modelo_compativel: supabaseProduto.modelo || undefined,
  } as Produto;
}

// Mapear produto assistencia.Produto para Supabase
// Nunca enviar: id, created_at, updated_at, criado_em, atualizado_em, criado_por
function mapAssistenciaToSupabase(produto: Partial<Produto>): any {
  const payload: any = {};

  // Identificação
  if (produto.nome !== undefined) {
    payload.nome = produto.nome.toUpperCase();
  } else if (produto.descricao !== undefined) {
    payload.nome = produto.descricao.toUpperCase();
  }
  
  if (produto.nome_abreviado !== undefined) {
    payload.nome_abreviado = produto.nome_abreviado;
  } else if (produto.descricao_abreviada !== undefined) {
    payload.nome_abreviado = produto.descricao_abreviada;
  }
  
  if (produto.codigo !== undefined) {
    payload.codigo = produto.codigo;
  }
  
  if (produto.codigo_barras !== undefined) {
    payload.codigo_barras = produto.codigo_barras;
  }
  
  if (produto.referencia !== undefined) {
    payload.referencia = produto.referencia;
  }
  
  if (produto.marca !== undefined) {
    payload.marca = produto.marca;
  }
  
  if (produto.modelo !== undefined) {
    payload.modelo = produto.modelo;
  } else if (produto.modelo_compativel !== undefined) {
    payload.modelo = produto.modelo_compativel;
  }
  
  if (produto.grupo !== undefined) {
    payload.grupo = produto.grupo;
  } else if (produto.categoria !== undefined) {
    payload.grupo = produto.categoria;
  }
  
  if (produto.sub_grupo !== undefined) {
    payload.sub_grupo = produto.sub_grupo;
  }

  // Preço (BRL) - só enviar se tiver valor
  if (produto.valor_compra !== undefined) {
    payload.valor_compra = produto.valor_compra;
  } else if (produto.preco_custo !== undefined) {
    payload.valor_compra = produto.preco_custo;
  }
  
  if (produto.valor_venda !== undefined) {
    payload.valor_venda = produto.valor_venda;
    // Manter compatibilidade com campo antigo
    payload.valor_dinheiro_pix = produto.valor_venda;
  } else if (produto.preco_venda !== undefined) {
    payload.valor_venda = produto.preco_venda;
    payload.valor_dinheiro_pix = produto.preco_venda;
  }
  
  if (produto.valor_parcelado_6x !== undefined) {
    payload.valor_parcelado_6x = produto.valor_parcelado_6x;
  }
  
  if (produto.margem_percentual !== undefined) {
    payload.margem_percentual = produto.margem_percentual;
  } else if (produto.margem_lucro !== undefined) {
    payload.margem_percentual = produto.margem_lucro;
  }
  
  if (produto.permitir_desconto_percentual !== undefined) {
    payload.permitir_desconto_percentual = produto.permitir_desconto_percentual;
  }

  // Estoque - só enviar se tiver valor
  if (produto.quantidade !== undefined) {
    payload.quantidade = produto.quantidade;
  } else if (produto.estoque_atual !== undefined) {
    payload.quantidade = produto.estoque_atual;
  }
  
  if (produto.estoque_minimo !== undefined) {
    payload.estoque_minimo = produto.estoque_minimo;
  }
  
  if (produto.localizacao !== undefined) {
    payload.localizacao = produto.localizacao;
  }

  // Configurações
  if (produto.situacao !== undefined) {
    payload.situacao = produto.situacao;
  }
  
  if (produto.tipo !== undefined) {
    payload.tipo = produto.tipo;
  }
  
  if (produto.garantia_dias !== undefined) {
    payload.garantia_dias = produto.garantia_dias;
  }
  
  if (produto.peso_kg !== undefined) {
    payload.peso_kg = produto.peso_kg;
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

export function useProdutosSupabase() {
  const queryClient = useQueryClient();

  // Buscar produtos do Supabase
  const { data: produtosData, isLoading, error } = useQuery({
    queryKey: ['produtos-assistencia'],
    queryFn: async () => {
      // Buscar todos os produtos sem limite
      // Usar paginação para buscar todos
      let allData: any[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await from('produtos')
          .select('*')
          .order('nome', { ascending: true })
          .range(offset, offset + pageSize - 1)
          .execute();

        if (error) throw error;
        
        const rows = data || [];
        if (rows.length > 0) {
          allData = [...allData, ...rows];
          offset += pageSize;
          hasMore = rows.length === pageSize;
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
    const { user } = useAuth();
    if (!user) throw new Error('Usuário não autenticado');

    const produtoSupabase = mapAssistenciaToSupabase(data);
    
    // Remover campos que não existem na tabela
    delete produtoSupabase.tipo;
    
    const { data: novoProduto, error } = await from('produtos')
      .insert({
        ...produtoSupabase,
        criado_por: user.id,
      });

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

    return mapSupabaseToAssistencia(novoProduto?.data || novoProduto);
  }, [queryClient]);

  // Atualizar produto
  const updateProduto = useCallback(async (id: string, data: Partial<Produto>) => {
    const produtoSupabase = mapAssistenciaToSupabase(data);
    
    // Remover campos que não existem na tabela
    delete produtoSupabase.tipo;
    
    const { error } = await from('produtos')
      .eq('id', id)
      .update(produtoSupabase);

    if (error) {
      console.error('[updateProduto] Erro:', error);
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
    // Marcar como INATIVO usando o campo situacao
    const { error } = await from('produtos')
      .eq('id', id)
      .update({ situacao: 'INATIVO' });

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

  // Buscar produtos por query (nome, código, código de barras, referência)
  const searchProdutos = useCallback((query: string): Produto[] => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase().trim();
    console.log('[useProdutosSupabase] Buscando produtos:', {
      query,
      totalProdutos: produtos.length,
      produtosAtivos: produtos.filter(p => p.situacao === 'ATIVO' || !p.situacao).length
    });
    
    const produtosAtivos = produtos.filter(p => !p.situacao || p.situacao === 'ATIVO');
    
    const resultados = produtosAtivos.filter(p => {
      const nomeMatch = p.nome?.toLowerCase().includes(q);
      const codigoMatch = p.codigo?.toString().includes(query);
      const codigoBarrasMatch = p.codigo_barras?.toLowerCase().includes(q);
      const referenciaMatch = p.referencia?.toLowerCase().includes(q);
      
      return nomeMatch || codigoMatch || codigoBarrasMatch || referenciaMatch;
    });
    
    console.log('[useProdutosSupabase] Resultados da busca:', {
      total: resultados.length,
      amostra: resultados.slice(0, 5).map(p => ({
        nome: p.nome,
        quantidade: p.quantidade,
        situacao: p.situacao
      }))
    });
    
    return resultados;
  }, [produtos]);

  // Buscar produto por ID
  const getProdutoById = useCallback((id: string): Produto | undefined => {
    return produtos.find(p => p.id === id);
  }, [produtos]);

  return {
    produtos: produtos.filter(p => p.situacao === 'ATIVO' || !p.situacao), // Filtrar apenas ativos
    grupos,
    isLoading,
    createProduto,
    updateProduto,
    deleteProduto,
    searchProdutos,
    getProdutoById,
  };
}

// Alias para compatibilidade
export const useProdutos = useProdutosSupabase;

