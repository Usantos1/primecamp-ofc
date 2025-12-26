import { useState, useMemo, memo } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EmptyState } from '@/components/EmptyState';
import { ImportarProdutos } from '@/components/ImportarProdutos';
import { ProductFormOptimized } from '@/components/assistencia/ProductFormOptimized';
import { useProdutosPaginated } from '@/hooks/useProdutosPaginated';
import { useMarcasModelosSupabase } from '@/hooks/useMarcasModelosSupabase';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { currencyFormatters } from '@/utils/formatters';
import { generateEtiquetaPDF, generateEtiquetasA4, EtiquetaData } from '@/utils/etiquetaGenerator';
import { Produto } from '@/types/assistencia';

import {
  Barcode,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  Edit,
  FileSpreadsheet,
  Package,
  Plus,
  Warehouse,
  X,
  XCircle,
} from 'lucide-react';

// Componente de linha da tabela otimizado com React.memo
const ProdutoTableRow = memo(({ 
  produto, 
  isSelected, 
  onSelect, 
  onEdit,
  index = 0
}: { 
  produto: Produto; 
  isSelected: boolean; 
  onSelect: () => void; 
  onEdit: () => void;
  index?: number;
}) => {
  const valorVenda = useMemo(() => 
    currencyFormatters.brl(produto.preco_venda || produto.valor_venda || 0),
    [produto.preco_venda, produto.valor_venda]
  );

  const descricaoCompleta = useMemo(() => 
    produto.nome || produto.descricao || '',
    [produto.nome, produto.descricao]
  );

  const infoSecundaria = useMemo(() => {
    const parts = [];
    if (produto.referencia) parts.push(`Ref: ${produto.referencia}`);
    if (produto.codigo_barras) parts.push(`EAN: ${produto.codigo_barras}`);
    return parts.join(' • ');
  }, [produto.referencia, produto.codigo_barras]);

  // Calcular status do estoque
  const estoqueStatus = useMemo(() => {
    const quantidade = produto.quantidade || 0;
    const estoqueMinimo = produto.estoque_minimo || 0;
    
    if (quantidade === 0) {
      return { status: 'zerado', label: 'Zerado', className: 'bg-red-100 text-red-700 border-red-300' };
    } else if (quantidade <= estoqueMinimo && estoqueMinimo > 0) {
      return { status: 'baixo', label: 'Baixo', className: 'bg-orange-100 text-orange-700 border-orange-300' };
    } else {
      return { status: 'ok', label: 'OK', className: 'bg-green-100 text-green-700 border-green-300' };
    }
  }, [produto.quantidade, produto.estoque_minimo]);

  // Zebra striping: linhas alternadas com mais contraste
  const zebraClass = index % 2 === 0 ? 'bg-background' : 'bg-muted/30';
  
  return (
    <TableRow
      className={`${isSelected ? 'bg-muted' : `${zebraClass} cursor-pointer hover:bg-muted/60`} border-b border-gray-200 transition-colors`}
      onClick={onSelect}
    >
      {/* Código - alinhado à direita */}
      <TableCell className="font-mono text-sm py-3.5 px-3 text-right border-r border-gray-200 w-[90px] hidden md:table-cell">
        {produto.codigo || '-'}
      </TableCell>
      
      {/* Referência - alinhado à esquerda */}
      <TableCell className="font-mono text-sm py-3.5 px-3 text-left text-muted-foreground border-r border-gray-200 w-[120px] hidden lg:table-cell">
        {produto.referencia || '-'}
      </TableCell>
      
      {/* Código de Barras - alinhado à esquerda */}
      <TableCell className="font-mono text-xs py-3.5 px-3 text-left text-muted-foreground border-r border-gray-200 w-[160px] hidden lg:table-cell">
        {produto.codigo_barras || '-'}
      </TableCell>
      
      {/* Descrição - alinhado à esquerda, truncate com tooltip */}
      <TableCell className="font-medium py-3.5 px-3 text-left border-r border-gray-200">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="truncate uppercase">
                {descricaoCompleta}
              </div>
            </TooltipTrigger>
            {descricaoCompleta.length > 30 && (
              <TooltipContent>
                <p className="max-w-xs">{descricaoCompleta}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        {/* Mobile: mostrar referência e código de barras aqui */}
        <div className="text-xs text-muted-foreground md:hidden mt-1">
          {infoSecundaria || '-'}
        </div>
      </TableCell>

      {/* Localização - alinhado à esquerda */}
      <TableCell className="text-sm py-3.5 px-3 text-left text-muted-foreground border-r border-gray-200 w-[140px] hidden lg:table-cell">
        {produto.localizacao || '-'}
      </TableCell>
      
      {/* Estoque - alinhado à direita com badge */}
      <TableCell className="text-sm py-3.5 px-3 text-right border-r border-gray-200 w-[90px]">
        <div className="flex items-center justify-end gap-1.5">
          <span className="font-mono font-semibold">{produto.quantidade || 0}</span>
          <Badge variant="outline" className={`${estoqueStatus.className} text-xs px-1.5 py-0 border font-medium`}>
            {estoqueStatus.label}
          </Badge>
        </div>
      </TableCell>
      
      {/* Unidade - centralizado */}
      <TableCell className="text-sm py-3.5 px-3 text-center text-muted-foreground border-r border-gray-200 w-[70px] hidden md:table-cell">
        UN
      </TableCell>
      
      {/* Valor de Venda - alinhado à direita */}
      <TableCell className="text-sm py-3.5 px-3 text-right font-semibold border-r border-gray-200 w-[110px]">
        {valorVenda}
      </TableCell>
      
      {/* Ações - centralizado */}
      <TableCell className="py-3.5 px-3 text-center w-[80px]">
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="h-7 w-7 p-0"
        >
          <Edit className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
});
ProdutoTableRow.displayName = 'ProdutoTableRow';

export default function Produtos() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Hook paginado com filtros server-side
  const hookResult = useProdutosPaginated();
  
  // Extrair valores com fallbacks seguros
  const produtos = hookResult?.produtos || [];
  const grupos = hookResult?.grupos || [];
  const isLoading = hookResult?.isLoading || false;
  const isFetching = hookResult?.isFetching || false;
  const page = hookResult?.page || 1;
  const goToPage = hookResult?.setPage || (() => {});
  const totalCount = hookResult?.totalCount || 0;
  const totalPages = hookResult?.totalPages || 1;
  const goToNextPage = hookResult?.goToNextPage || (() => {});
  const goToPreviousPage = hookResult?.goToPreviousPage || (() => {});
  const searchTerm = hookResult?.searchTerm || '';
  const setSearchTerm = hookResult?.setSearchTerm || (() => {});
  const grupo = hookResult?.grupo || '';
  const setGrupo = hookResult?.setGrupo || (() => {});
  const createProduto = hookResult?.createProduto || (async () => {});
  const updateProduto = hookResult?.updateProduto || (async () => {});
  const deleteProduto = hookResult?.deleteProduto || (async () => {});
  const error = hookResult?.error;

  const { marcas, modelos } = useMarcasModelosSupabase();


  const [showForm, setShowForm] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);

  const [showEtiquetaModal, setShowEtiquetaModal] = useState(false);
  const [quantidadeEtiquetas, setQuantidadeEtiquetas] = useState(1);

  const [showEstoqueModal, setShowEstoqueModal] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const handleClearFilters = () => {
    setSearchTerm('');
    setGrupo('');
  };

  const handleNew = () => {
    setEditingProduto(null);
    setSelectedProduto(null);
    setShowForm(true);
  };

  const handleEdit = (produto: Produto) => {
    setEditingProduto(produto);
    setSelectedProduto(produto);
    setShowForm(true);
  };

  const handleInativar = async () => {
    if (!selectedProduto) return;

    try {
      await deleteProduto(selectedProduto.id);
      toast({ title: 'Produto inativado!' });
      setSelectedProduto(null);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Não foi possível inativar.',
        variant: 'destructive',
      });
    }
  };

  const gerarCodigoBarras = (produto: Produto): string => {
    if (produto.codigo_barras) return produto.codigo_barras;

    // tenta gerar EAN13 a partir do "codigo"
    if (produto.codigo) {
      const d12 = produto.codigo.toString().padStart(12, '0');

      let soma = 0;
      for (let i = 0; i < 12; i++) {
        const n = parseInt(d12[i]!, 10);
        soma += i % 2 === 0 ? n : n * 3;
      }
      const dv = (10 - (soma % 10)) % 10;
      return d12 + String(dv);
    }

    // fallback: usa o id
    const base = produto.id.replace(/-/g, '').substring(0, 12).padStart(12, '0');
    let soma = 0;
    for (let i = 0; i < 12; i++) {
      const n = parseInt(base[i]!, 10);
      soma += i % 2 === 0 ? n : n * 3;
    }
    const dv = (10 - (soma % 10)) % 10;
    return base + String(dv);
  };

  const handleGerarEtiqueta = async () => {
    if (!selectedProduto) {
      toast({
        title: 'Produto não selecionado',
        description: 'Selecione um produto para gerar a etiqueta.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const codigoBarras = gerarCodigoBarras(selectedProduto);

      // se não tinha, salva no produto
      if (!selectedProduto.codigo_barras) {
        await updateProduto(selectedProduto.id, {
          ...selectedProduto,
          codigo_barras: codigoBarras,
        });

        toast({
          title: 'Código de barras gerado',
          description: `Código ${codigoBarras} salvo no produto.`,
        });
      }

      const etiquetaData: EtiquetaData = {
        descricao: selectedProduto.descricao,
        descricao_abreviada: selectedProduto.descricao_abreviada,
        preco_venda: selectedProduto.preco_venda,
        codigo_barras: codigoBarras,
        codigo: selectedProduto.codigo,
        referencia: selectedProduto.referencia,
        empresa: {
          nome: 'PRIMECAMP',
          logo: 'https://primecamp.com.br/wp-content/uploads/2025/07/Design-sem-nome-4.png',
        },
      };

      if (quantidadeEtiquetas > 1) {
        const itens = Array.from({ length: quantidadeEtiquetas }, () => etiquetaData);
        const doc = await generateEtiquetasA4(itens, 7, 5);
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
      } else {
        const doc = await generateEtiquetaPDF(etiquetaData);
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
      }

      toast({
        title: 'Etiqueta gerada',
        description: `Abrindo impressão para ${quantidadeEtiquetas} etiqueta(s)...`,
      });

      setShowEtiquetaModal(false);
      setQuantidadeEtiquetas(1);
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Erro ao gerar etiqueta',
        description: error?.message || 'Ocorreu um erro ao gerar a etiqueta.',
        variant: 'destructive',
      });
    }
  };

  // payload do ProductFormOptimized já vem como Partial<Produto>
  const handleSave = async (produtoData: Partial<Produto>) => {

    try {
      if (editingProduto) {
        await updateProduto(editingProduto.id, produtoData);
        toast({ title: 'Produto atualizado com sucesso!' });
      } else {
        await createProduto(produtoData);
        toast({ title: 'Produto criado com sucesso!' });
      }

      setEditingProduto(null);
      setShowForm(false);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao salvar produto',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return (
    <ModernLayout title="Pesquisa de Produtos" subtitle="Gerenciar produtos e serviços">
      {/* Container principal - flexível sem altura forçada */}
      <div className="flex flex-col min-h-0">
        {/* Barra de filtros e ações */}
        <div className="bg-background border-b-2 border-gray-300 shadow-sm shrink-0 rounded-t-lg">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 px-3 py-2">
            {/* Filtros - linha superior no mobile */}
            <div className="flex items-center gap-2 flex-wrap">
              <Select 
                value={grupo && grupo.trim() !== '' ? grupo : 'all'} 
                onValueChange={(value) => {
                  setGrupo(value === 'all' ? '' : value);
                  hookResult.setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[140px] md:w-[140px] shrink-0 text-xs border-2 border-gray-300">
                  <SelectValue placeholder="Grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">TODOS</SelectItem>
                  {grupos.map((g) => (
                    <SelectItem key={g.id || g.nome} value={g.nome}>
                      {g.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 flex-1 md:w-[180px] md:flex-none text-base md:text-xs border-2 border-gray-300"
              />

              <Button 
                variant="outline" 
                size="sm"
                onClick={handleClearFilters} 
                className="gap-1 h-9 shrink-0 px-2 border-2 border-gray-300"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span className="hidden lg:inline text-xs">Limpar</span>
              </Button>
            </div>

            {/* Ações - linha inferior no mobile */}
            <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex-wrap md:flex-nowrap">
              <div className="w-px h-5 bg-gray-300 mx-0.5 shrink-0 hidden md:block"></div>

              <Button onClick={() => setShowImport(true)} size="sm" variant="outline" className="gap-1 h-9 shrink-0 px-2 border-2 border-gray-300">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span className="hidden xl:inline text-xs">Importar</span>
              </Button>

              <Button onClick={handleNew} size="sm" className="gap-1 h-9 shrink-0 px-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-md">
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden xl:inline text-xs">Novo</span>
              </Button>

              <Button
                onClick={() => selectedProduto && handleEdit(selectedProduto)}
                size="sm"
                variant="outline"
                disabled={!selectedProduto}
                className="gap-1 h-9 shrink-0 px-2 border-2 border-gray-300"
              >
                <Edit className="h-3.5 w-3.5" />
                <span className="hidden xl:inline text-xs">Abrir</span>
              </Button>

              <Button
                onClick={handleInativar}
                size="sm"
                variant="outline"
                disabled={!selectedProduto}
                className="gap-1 h-9 shrink-0 px-2 border-2 border-gray-300"
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden xl:inline text-xs">Inativar</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={!selectedProduto}
                onClick={() => setShowEtiquetaModal(true)}
                className="gap-1 h-9 shrink-0 px-2 border-2 border-gray-300"
              >
                <Barcode className="h-3.5 w-3.5" />
                <span className="hidden xl:inline text-xs">Etiqueta</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={!selectedProduto}
                onClick={() => setShowEstoqueModal(true)}
                className="gap-1 h-9 shrink-0 px-2 border-2 border-gray-300"
              >
                <Warehouse className="h-3.5 w-3.5" />
                <span className="hidden xl:inline text-xs">Estoque</span>
              </Button>

              <div className="flex-1 min-w-0 hidden md:block"></div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(-1)}
                className="gap-1 h-9 shrink-0 px-2 text-destructive border-2 border-red-300"
              >
                <DoorOpen className="h-3.5 w-3.5" />
                <span className="hidden xl:inline text-xs">Sair</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Área da tabela - apenas o corpo rola */}
        <div className="flex-1 min-h-0 px-2 md:px-4 pb-2 md:pb-4 flex flex-col">
          <Card className="h-full flex flex-col overflow-hidden border-2 border-gray-300">
            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
            {hookResult.error ? (
              <div className="p-12 text-center">
                <EmptyState
                  icon={<Package className="h-12 w-12" />}
                  title="Erro ao carregar produtos"
                  description={hookResult.error instanceof Error ? hookResult.error.message : 'Ocorreu um erro ao buscar os produtos. Tente recarregar a página.'}
                  action={{ label: 'Recarregar', onClick: () => window.location.reload() }}
                />
              </div>
            ) : isLoading ? (
              <div className="p-10 text-center text-muted-foreground">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4 mx-auto"></div>
                  <div className="h-4 bg-muted rounded animate-pulse w-1/2 mx-auto"></div>
                  <div className="h-4 bg-muted rounded animate-pulse w-2/3 mx-auto"></div>
                </div>
              </div>
            ) : produtos.length === 0 ? (
              <div className="p-12 text-center">
                <EmptyState
                  icon={<Package className="h-12 w-12" />}
                  title="Nenhum produto encontrado"
                  description={searchTerm ? 'Tente buscar por outro termo' : 'Cadastre seu primeiro produto ou serviço'}
                  action={!searchTerm ? { label: 'Novo Produto', onClick: handleNew } : undefined}
                />
              </div>
            ) : (
              <>
                {/* Desktop: Tabela */}
                <div className="hidden md:flex flex-1 flex-col overflow-hidden min-h-0">
                  {/* Container da tabela com scroll apenas vertical */}
                  <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                    <table className="w-full caption-bottom text-sm border-collapse table-fixed">
                      {/* Cabeçalho fixo */}
                      <thead className="sticky top-0 z-20 bg-muted/50 backdrop-blur-sm">
                        <tr className="border-b-2 border-gray-300">
                          <th className="h-11 px-3 text-right align-middle font-semibold text-foreground bg-muted/60 border-r border-gray-200 w-[90px]">Código</th>
                          <th className="h-11 px-3 text-left align-middle font-semibold text-foreground bg-muted/60 border-r border-gray-200 w-[120px] hidden lg:table-cell">Referência</th>
                          <th className="h-11 px-3 text-left align-middle font-semibold text-foreground bg-muted/60 border-r border-gray-200 w-[160px] hidden lg:table-cell">Código de Barras</th>
                          <th className="h-11 px-3 text-left align-middle font-semibold text-foreground bg-muted/60 border-r border-gray-200 min-w-[200px]">Descrição</th>
                          <th className="h-11 px-3 text-left align-middle font-semibold text-foreground bg-muted/60 border-r border-gray-200 w-[140px] hidden lg:table-cell">Localização</th>
                          <th className="h-11 px-3 text-right align-middle font-semibold text-foreground bg-muted/60 border-r border-gray-200 w-[90px]">Estoque</th>
                          <th className="h-11 px-3 text-center align-middle font-semibold text-foreground bg-muted/60 border-r border-gray-200 w-[70px]">Unidade</th>
                          <th className="h-11 px-3 text-right align-middle font-semibold text-foreground bg-muted/60 border-r border-gray-200 w-[110px]">Valor de Venda</th>
                          <th className="h-11 px-3 text-center align-middle font-semibold text-foreground bg-muted/60 w-[80px]">Ações</th>
                        </tr>
                      </thead>
                      {/* Corpo da tabela */}
                      <tbody>
                          {isFetching && !isLoading && produtos.length > 0 ? (
                            produtos.map((produto, index) => (
                              <tr key={`skeleton-${produto.id}`} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}>
                                <td colSpan={9} className="py-3.5 px-3">
                                  <div className="h-9 bg-muted rounded animate-pulse"></div>
                                </td>
                              </tr>
                            ))
                          ) : produtos.length === 0 ? (
                            <tr className="border-b border-gray-200">
                              <td colSpan={9} className="py-8 px-3 text-center text-muted-foreground">
                                Nenhum produto encontrado
                              </td>
                            </tr>
                          ) : (
                            produtos.map((produto, index) => (
                              <ProdutoTableRow
                                key={produto.id}
                                produto={produto}
                                isSelected={selectedProduto?.id === produto.id}
                                onSelect={() => setSelectedProduto(produto)}
                                onEdit={() => handleEdit(produto)}
                                index={index}
                              />
                            ))
                          )}
                        </tbody>
                    </table>
                  </div>

                  {/* Controles de Paginação Desktop - fixo no final, compacto */}
                  <div className="shrink-0 border-t-2 border-gray-300 bg-background px-3 py-2 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground text-center sm:text-left">
                      Mostrando {produtos.length > 0 && totalCount > 0 ? (page - 1) * (hookResult?.pageSize || 50) + 1 : 0} a {totalCount > 0 ? Math.min(page * (hookResult?.pageSize || 50), totalCount) : 0} de {totalCount} produtos
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousPage}
                        disabled={page === 1 || isFetching}
                        className="h-7 text-xs border-2 border-gray-300"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Anterior</span>
                      </Button>
                      <div className="text-xs font-medium px-2">
                        Página {page} de {totalPages || 1}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextPage}
                        disabled={!totalPages || page >= totalPages || isFetching}
                        className="h-7 text-xs border-2 border-gray-300"
                      >
                        <span className="hidden sm:inline">Próxima</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Mobile: Cards */}
                <div className="md:hidden flex-1 overflow-y-auto min-h-0 space-y-3 p-2">
                  {isFetching && !isLoading && produtos.length > 0 ? (
                    produtos.map((produto) => (
                      <Card key={`skeleton-${produto.id}`} className="border-2 border-gray-300">
                        <CardContent className="p-3">
                          <div className="h-20 bg-muted rounded animate-pulse"></div>
                        </CardContent>
                      </Card>
                    ))
                  ) : produtos.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      Nenhum produto encontrado
                    </div>
                  ) : (
                    produtos.map((produto, index) => {
                      const valorVenda = currencyFormatters.brl(produto.preco_venda || produto.valor_venda || 0);
                      const descricaoCompleta = produto.nome || produto.descricao || '';
                      const infoSecundaria = [
                        produto.referencia && `Ref: ${produto.referencia}`,
                        produto.codigo_barras && `EAN: ${produto.codigo_barras}`,
                        produto.codigo && `Código: ${produto.codigo}`
                      ].filter(Boolean).join(' • ');
                      
                      const quantidade = produto.quantidade || 0;
                      const estoqueMinimo = produto.estoque_minimo || 0;
                      let estoqueStatus;
                      if (quantidade === 0) {
                        estoqueStatus = { status: 'zerado', label: 'Zerado', className: 'bg-red-100 text-red-700 border-red-300' };
                      } else if (quantidade <= estoqueMinimo && estoqueMinimo > 0) {
                        estoqueStatus = { status: 'baixo', label: 'Baixo', className: 'bg-orange-100 text-orange-700 border-orange-300' };
                      } else {
                        estoqueStatus = { status: 'ok', label: 'OK', className: 'bg-green-100 text-green-700 border-green-300' };
                      }

                      return (
                        <Card 
                          key={produto.id}
                          className={`border-2 ${selectedProduto?.id === produto.id ? 'border-blue-500 bg-blue-50/50' : 'border-gray-300'} cursor-pointer hover:border-blue-400 transition-all active:scale-[0.98]`}
                          onClick={() => setSelectedProduto(produto)}
                        >
                          <CardContent className="p-3 space-y-2">
                            {/* Header: Descrição */}
                            <div className="border-b-2 border-gray-200 pb-2">
                              <h3 className="font-semibold text-sm uppercase truncate">{descricaoCompleta}</h3>
                              {infoSecundaria && (
                                <p className="text-xs text-muted-foreground mt-1">{infoSecundaria}</p>
                              )}
                            </div>

                            {/* Info: Estoque e Valor */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground">Estoque</p>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-semibold text-base">{quantidade}</span>
                                  <Badge variant="outline" className={`${estoqueStatus.className} text-[10px] px-1.5 py-0 border-2 font-medium`}>
                                    {estoqueStatus.label}
                                  </Badge>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground">Valor de Venda</p>
                                <p className="font-semibold text-base text-green-600">{valorVenda}</p>
                              </div>
                            </div>

                            {/* Footer: Botão de ação */}
                            <div className="flex justify-end pt-2 border-t-2 border-gray-200">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(produto);
                                }}
                                className="h-8 px-3 text-xs border-2 border-gray-300"
                              >
                                <Edit className="h-3.5 w-3.5 mr-1" />
                                Editar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>

              </>
            )}
            </CardContent>
          </Card>

          {/* Mobile: Paginação - fora do Card */}
          <div className="md:hidden shrink-0 border-t-2 border-gray-300 bg-background mt-2 px-3 py-3 flex flex-col items-center justify-between gap-2 rounded-lg">
            <div className="text-xs text-muted-foreground text-center">
              Mostrando {produtos.length > 0 && totalCount > 0 ? (page - 1) * (hookResult?.pageSize || 50) + 1 : 0} a {totalCount > 0 ? Math.min(page * (hookResult?.pageSize || 50), totalCount) : 0} de {totalCount} produtos
            </div>
            <div className="flex items-center gap-2 w-full justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={page === 1 || isFetching}
                className="h-8 text-xs border-2 border-gray-300 flex-1 max-w-[120px]"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Anterior</span>
              </Button>
              <div className="text-xs font-semibold px-3 py-1 bg-gray-100 rounded border-2 border-gray-300">
                {page} / {totalPages || 1}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={!totalPages || page >= totalPages || isFetching}
                className="h-8 text-xs border-2 border-gray-300 flex-1 max-w-[120px]"
              >
                <span>Próxima</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Modal único de cadastro/edição */}
        <ProductFormOptimized
          open={showForm}
          onOpenChange={setShowForm}
          produto={editingProduto}
          onSave={handleSave}
          grupos={grupos}
          marcas={marcas}
          modelos={modelos}
        />

        {/* Modal de Etiqueta */}
        <Dialog open={showEtiquetaModal} onOpenChange={setShowEtiquetaModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Gerar Etiqueta</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {selectedProduto && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Produto</Label>
                    <span className="font-semibold text-right">{selectedProduto.descricao}</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Quantidade de Etiquetas</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={quantidadeEtiquetas}
                  onChange={(e) => setQuantidadeEtiquetas(Math.max(1, parseInt(e.target.value || '1', 10)))}
                  className="text-base md:text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {quantidadeEtiquetas > 1
                    ? `${quantidadeEtiquetas} etiquetas serão geradas em uma página A4`
                    : '1 etiqueta será gerada (50mm x 30mm)'}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEtiquetaModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleGerarEtiqueta}>
                <Barcode className="h-4 w-4 mr-2" />
                Gerar Etiqueta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Estoque (visualização) */}
        <Dialog open={showEstoqueModal} onOpenChange={setShowEstoqueModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Informações de Estoque</DialogTitle>
            </DialogHeader>

            {selectedProduto ? (
              <div className="space-y-6 py-4">
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-2">{selectedProduto.descricao}</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Código:</span> {selectedProduto.codigo || selectedProduto.id}
                    </div>
                    <div>
                      <span className="font-medium">Referência:</span> {selectedProduto.referencia || '-'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Estoque Atual</p>
                    <p className="text-2xl font-bold">{selectedProduto.estoque_atual || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Estoque Mínimo</p>
                    <p className="text-2xl font-semibold">{selectedProduto.estoque_minimo || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Valor Total (custo)</p>
                    <p className="text-2xl font-semibold">
                      {currencyFormatters.brl((selectedProduto.estoque_atual || 0) * (selectedProduto.preco_custo || 0))}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-muted-foreground">Selecione um produto.</div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEstoqueModal(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Importação */}
        <Dialog open={showImport} onOpenChange={setShowImport}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Importar Produtos em Massa</DialogTitle>
            </DialogHeader>
            <ImportarProdutos />
          </DialogContent>
        </Dialog>
      </div>
    </ModernLayout>
  );
}
