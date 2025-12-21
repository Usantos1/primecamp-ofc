import { useMemo, useState } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/EmptyState';
import { ImportarProdutos } from '@/components/ImportarProdutos';
import { ProductFormOptimized } from '@/components/assistencia/ProductFormOptimized';
import { useProdutos } from '@/hooks/useProdutosSupabase';
import { useMarcasModelosSupabase } from '@/hooks/useMarcasModelosSupabase';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { currencyFormatters } from '@/utils/formatters';
import { generateEtiquetaPDF, generateEtiquetasA4, EtiquetaData } from '@/utils/etiquetaGenerator';
import { Produto } from '@/types/assistencia';

import {
  Barcode,
  DoorOpen,
  Edit,
  FileSpreadsheet,
  Package,
  Plus,
  Warehouse,
  X,
  XCircle,
} from 'lucide-react';

export default function Produtos() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { produtos, grupos, isLoading, createProduto, updateProduto, deleteProduto } = useProdutos();
  const { marcas, modelos } = useMarcasModelosSupabase();

  const [searchTerm, setSearchTerm] = useState('');
  const [situacaoFilter, setSituacaoFilter] = useState<string>('ativo');
  const [tipoFilter, setTipoFilter] = useState<string>('all');

  const [showForm, setShowForm] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);

  const [showEtiquetaModal, setShowEtiquetaModal] = useState(false);
  const [quantidadeEtiquetas, setQuantidadeEtiquetas] = useState(1);

  const [showEstoqueModal, setShowEstoqueModal] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const filteredProdutos = useMemo(() => {
    let result = [...produtos];

    if (situacaoFilter !== 'all') {
      result =
        situacaoFilter === 'ativo'
          ? result.filter((p) => p.situacao === 'ativo' || p.situacao === undefined)
          : result.filter((p) => p.situacao === 'inativo');
    }

    if (tipoFilter !== 'all') {
      result = result.filter((p) => p.tipo === tipoFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.descricao?.toLowerCase().includes(q) ||
          p.codigo_barras?.includes(searchTerm) ||
          p.referencia?.toLowerCase().includes(q) ||
          p.descricao_abreviada?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [produtos, situacaoFilter, tipoFilter, searchTerm]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSituacaoFilter('ativo');
    setTipoFilter('all');
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

  // payload do ProductFormOptimized (supabasePayload) -> Produto
  const handleSave = async (supabasePayload: any) => {
    const produtoData: Partial<Produto> = {
      descricao: supabasePayload.nome || '',
      codigo: supabasePayload.codigo,
      codigo_barras: supabasePayload.codigo_barras,
      referencia: supabasePayload.referencia,
      descricao_abreviada: supabasePayload.nome_abreviado,
      marca: supabasePayload.marca,
      modelo_compativel: supabasePayload.modelo,
      categoria: supabasePayload.grupo,
      preco_custo: supabasePayload.valor_compra || 0,
      preco_venda: supabasePayload.valor_dinheiro_pix || supabasePayload.valor_venda || 0,
      margem_lucro: supabasePayload.margem_percentual,
      estoque_atual: supabasePayload.quantidade || 0,
      estoque_minimo: supabasePayload.estoque_minimo,
      localizacao: supabasePayload.localizacao,
      situacao: supabasePayload.situacao === 'INATIVO' ? 'inativo' : 'ativo',
    };

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
      <div className="space-y-4 relative pb-20">
        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pesquisa Filtro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <Select value={situacaoFilter} onValueChange={setSituacaoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Situação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">TODOS</SelectItem>
                  <SelectItem value="ativo">ATIVOS</SelectItem>
                  <SelectItem value="inativo">INATIVOS</SelectItem>
                </SelectContent>
              </Select>

              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">TODOS</SelectItem>
                  <SelectItem value="peca">Peças</SelectItem>
                  <SelectItem value="servico">Serviços</SelectItem>
                  <SelectItem value="produto">Produtos</SelectItem>
                </SelectContent>
              </Select>

              <div className="col-span-2">
                <Input
                  placeholder="Descrição, referência ou código de barras"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={handleClearFilters} className="gap-2">
                <XCircle className="h-4 w-4" />
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Barra de ações */}
        <div className="sticky top-0 bg-background border-b z-40 shadow-sm -mx-4 px-4 py-2">
          <Card className="border-0 shadow-none">
            <CardContent className="py-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setShowImport(true)} className="gap-2" variant="outline">
                    <FileSpreadsheet className="h-4 w-4" />
                    Importar
                  </Button>

                  <Button onClick={handleNew} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Produto
                  </Button>

                  <Button
                    onClick={() => selectedProduto && handleEdit(selectedProduto)}
                    className="gap-2"
                    variant="outline"
                    disabled={!selectedProduto}
                  >
                    <Edit className="h-4 w-4" />
                    Abrir
                  </Button>

                  <Button
                    onClick={handleInativar}
                    className="gap-2"
                    variant="outline"
                    disabled={!selectedProduto}
                  >
                    <X className="h-4 w-4" />
                    Inativar
                  </Button>

                  <Button
                    className="gap-2"
                    variant="outline"
                    disabled={!selectedProduto}
                    onClick={() => setShowEtiquetaModal(true)}
                  >
                    <Barcode className="h-4 w-4" />
                    Etiqueta
                  </Button>

                  <Button
                    className="gap-2"
                    variant="outline"
                    disabled={!selectedProduto}
                    onClick={() => setShowEstoqueModal(true)}
                  >
                    <Warehouse className="h-4 w-4" />
                    Estoque
                  </Button>
                </div>

                <Button
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="gap-2 text-destructive"
                >
                  <DoorOpen className="h-4 w-4" />
                  Sair
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-10 text-center text-muted-foreground">Carregando...</div>
            ) : filteredProdutos.length === 0 ? (
              <div className="p-12 text-center">
                <EmptyState
                  icon={<Package className="h-12 w-12" />}
                  title="Nenhum produto encontrado"
                  description={searchTerm ? 'Tente buscar por outro termo' : 'Cadastre seu primeiro produto ou serviço'}
                  action={!searchTerm ? { label: 'Novo Produto', onClick: handleNew } : undefined}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Código</TableHead>
                      <TableHead className="w-24">Referência</TableHead>
                      <TableHead className="w-32">Código de Barras</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-32">Localização</TableHead>
                      <TableHead className="w-20">Un</TableHead>
                      <TableHead className="w-28 text-right">Vl Venda</TableHead>
                      <TableHead className="w-32">Modelo</TableHead>
                      <TableHead className="w-32">Marca</TableHead>
                      <TableHead className="w-24 text-right">Estoque</TableHead>
                      <TableHead className="w-20">Ações</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredProdutos.map((produto) => (
                      <TableRow
                        key={produto.id}
                        className={selectedProduto?.id === produto.id ? 'bg-muted' : 'cursor-pointer'}
                        onClick={() => setSelectedProduto(produto)}
                      >
                        <TableCell className="font-mono">{produto.codigo || '-'}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">{produto.referencia || '-'}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">{produto.codigo_barras || '-'}</TableCell>
                        <TableCell className="font-medium uppercase">{produto.descricao}</TableCell>
                        <TableCell className="text-muted-foreground">{produto.localizacao || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{produto.unidade || 'UN'}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {currencyFormatters.brl(produto.preco_venda)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {produto.modelo_compativel || (produto as any).modelo || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{produto.marca || '-'}</TableCell>
                        <TableCell className="text-right font-mono">{produto.estoque_atual || 0}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(produto);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

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
