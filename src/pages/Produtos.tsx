import React, { useState } from 'react';
import { Package, Plus, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ModernLayout } from '@/components/ModernLayout';
import { ProdutosList } from '@/components/ProdutosList';
import { ProdutoForm } from '@/components/ProdutoForm';
import { ImportExcel } from '@/components/ImportExcel';
import { useProducts, type Produto } from '@/hooks/useProducts';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRL } from '@/utils/currency';

const Produtos: React.FC = () => {
  const { isApproved } = useAuth();
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [disponivelFilter, setDisponivelFilter] = useState<string>('todos');
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null);

  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useProducts(50, search);

  const allProducts = data?.pages.flatMap(page => page.produtos) || [];
  const totalCount = data?.pages[0]?.total || 0;

  const handleEdit = (product: Produto) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDuplicate = (product: Produto) => {
    const { id, criado_em, atualizado_em, criado_por, ...produtoSemId } = product;
    const duplicatedProduct = {
      ...produtoSemId,
      nome: `${product.nome} (Cópia)`,
    };
    console.log('📋 Duplicando produto:', {
      original: product.nome,
      semId: !duplicatedProduct.hasOwnProperty('id'),
      keys: Object.keys(duplicatedProduct),
    });
    setEditingProduct(duplicatedProduct as any);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  const exportToCSV = () => {
    if (!allProducts.length) return;

    const headers = ['nome', 'marca', 'modelo', 'qualidade', 'valor_dinheiro_pix', 'valor_parcelado_6x'];
    
    const csvContent = [
      headers.join(','),
      ...allProducts.map(produto => [
        `"${produto.nome}"`,
        `"${produto.marca}"`,
        `"${produto.modelo}"`,
        `"${produto.qualidade}"`,
        (produto.valor_dinheiro_pix || 0).toFixed(2),
        (produto.valor_parcelado_6x || 0).toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `produtos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const downloadTemplate = () => {
    const template = `nome,marca,modelo,qualidade,valor_dinheiro_pix,valor_parcelado_6x
Tela iPhone 11 Preta,Apple,iPhone 11,Original,349.00,399.00
Troca Conector iPhone 12,Apple,iPhone 12,Premium,199.90,229.90`;

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_produtos.csv';
    link.click();
  };

  if (!isApproved) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-foreground">Acesso Restrito</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Você precisa de aprovação para acessar o módulo de produtos.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ModernLayout
      title="Produtos e Serviços"
      subtitle="Gerencie o catálogo de produtos e serviços oferecidos"
    >
      <div className="space-y-6">
        {/* Linha de ações - movida para dentro do conteúdo */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <h2 className="text-xl font-semibold">Lista de Produtos e Serviços</h2>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" onClick={downloadTemplate} size="sm">
              <Download className="h-4 w-4 mr-2" />
              Modelo
            </Button>
            <Button variant="outline" onClick={() => setShowImport(true)} size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
            <Button variant="outline" onClick={exportToCSV} disabled={!allProducts.length} size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo
            </Button>
          </div>
        </div>

      {/* Stats */}
      {allProducts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produtos</CardTitle>
              <Badge variant="secondary">P</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {allProducts.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Serviços</CardTitle>
              <Badge variant="secondary">S</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                0
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disponíveis</CardTitle>
              <Badge variant="default">✓</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {allProducts.length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="produto">Produto</SelectItem>
                <SelectItem value="servico">Serviço</SelectItem>
              </SelectContent>
            </Select>
            <Select value={disponivelFilter} onValueChange={setDisponivelFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Disponibilidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="disponivel">Disponível</SelectItem>
                <SelectItem value="indisponivel">Indisponível</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      <ProdutosList
        produtos={allProducts}
        isLoading={isLoading}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={fetchNextPage}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
      />

      {/* Modals */}
      <ProdutoForm
        open={showForm}
        onOpenChange={handleFormClose}
        product={editingProduct}
      />

        <ImportExcel
          open={showImport}
          onOpenChange={setShowImport}
        />
      </div>
    </ModernLayout>
  );
};

export default Produtos;