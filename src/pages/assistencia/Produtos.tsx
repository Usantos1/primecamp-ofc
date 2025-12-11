import { useState, useMemo } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, Package, Wrench, Tag, AlertTriangle, BarChart3 } from 'lucide-react';
import { useProdutos, useMarcas, useModelos, useGruposProduto } from '@/hooks/useAssistencia';
import { Produto, ProdutoFormData } from '@/types/assistencia';
import { currencyFormatters } from '@/utils/formatters';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingButton } from '@/components/LoadingButton';
import { cn } from '@/lib/utils';

export default function Produtos() {
  const { produtos, isLoading, createProduto, updateProduto, deleteProduto, ajustarEstoque } = useProdutos();
  const { marcas } = useMarcas();
  const { modelos } = useModelos();
  const { grupos } = useGruposProduto();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [grupoFilter, setGrupoFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [estoqueDialog, setEstoqueDialog] = useState(false);
  const [estoqueProdutoId, setEstoqueProdutoId] = useState<string | null>(null);
  const [estoqueQtd, setEstoqueQtd] = useState(0);
  const [estoqueTipo, setEstoqueTipo] = useState<'entrada' | 'saida'>('entrada');
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<ProdutoFormData>({
    tipo: 'peca',
    descricao: '',
    descricao_abreviada: '',
    codigo_barras: '',
    referencia: '',
    grupo_id: '',
    marca_id: '',
    modelo_id: '',
    preco_custo: 0,
    preco_venda: 0,
    estoque_atual: 0,
    estoque_minimo: 0,
    localizacao: '',
  });

  // Filtrar produtos
  const filteredProdutos = useMemo(() => {
    let filtered = produtos;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.descricao.toLowerCase().includes(search) ||
        p.codigo_barras?.includes(search) ||
        p.referencia?.toLowerCase().includes(search)
      );
    }
    
    if (tipoFilter !== 'all') {
      filtered = filtered.filter(p => p.tipo === tipoFilter);
    }
    
    if (grupoFilter !== 'all') {
      filtered = filtered.filter(p => p.grupo_id === grupoFilter);
    }
    
    return filtered;
  }, [produtos, searchTerm, tipoFilter, grupoFilter]);

  // Estatísticas
  const stats = useMemo(() => ({
    total: produtos.length,
    pecas: produtos.filter(p => p.tipo === 'peca').length,
    servicos: produtos.filter(p => p.tipo === 'servico').length,
    estoqueBaixo: produtos.filter(p => p.estoque_minimo && p.estoque_atual <= p.estoque_minimo).length,
    valorEstoque: produtos.reduce((sum, p) => sum + (p.preco_custo * p.estoque_atual), 0),
  }), [produtos]);

  // Modelos filtrados pela marca
  const modelosFiltrados = useMemo(() => {
    if (!formData.marca_id) return modelos;
    return modelos.filter(m => m.marca_id === formData.marca_id);
  }, [formData.marca_id, modelos]);

  // Calcular margem de lucro
  const margemLucro = useMemo(() => {
    if (formData.preco_custo <= 0) return 0;
    return ((formData.preco_venda - formData.preco_custo) / formData.preco_custo) * 100;
  }, [formData.preco_custo, formData.preco_venda]);

  const handleOpenDialog = (produto?: Produto) => {
    if (produto) {
      setEditingProduto(produto);
      setFormData({
        tipo: produto.tipo,
        descricao: produto.descricao,
        descricao_abreviada: produto.descricao_abreviada || '',
        codigo_barras: produto.codigo_barras || '',
        referencia: produto.referencia || '',
        grupo_id: produto.grupo_id || '',
        marca_id: produto.marca_id || '',
        modelo_id: produto.modelo_id || '',
        preco_custo: produto.preco_custo,
        preco_venda: produto.preco_venda,
        estoque_atual: produto.estoque_atual,
        estoque_minimo: produto.estoque_minimo || 0,
        localizacao: produto.localizacao || '',
      });
    } else {
      setEditingProduto(null);
      setFormData({
        tipo: 'peca',
        descricao: '',
        descricao_abreviada: '',
        codigo_barras: '',
        referencia: '',
        grupo_id: '',
        marca_id: '',
        modelo_id: '',
        preco_custo: 0,
        preco_venda: 0,
        estoque_atual: 0,
        estoque_minimo: 0,
        localizacao: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.descricao.trim()) return;
    
    setIsSaving(true);
    try {
      if (editingProduto) {
        updateProduto(editingProduto.id, formData);
      } else {
        createProduto(formData);
      }
      setIsDialogOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (deletingId) {
      deleteProduto(deletingId);
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  const handleAjustarEstoque = () => {
    if (estoqueProdutoId && estoqueQtd > 0) {
      ajustarEstoque(estoqueProdutoId, estoqueQtd, estoqueTipo);
      setEstoqueDialog(false);
      setEstoqueProdutoId(null);
      setEstoqueQtd(0);
    }
  };

  const getGrupoNome = (grupoId?: string) => {
    if (!grupoId) return '-';
    const grupo = grupos.find(g => g.id === grupoId);
    return grupo?.nome || '-';
  };

  return (
    <ModernLayout title="Produtos e Peças" subtitle="Gerencie estoque de peças e serviços">
      <div className="space-y-6">
        {/* Cards de resumo */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setTipoFilter('all')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Package className="h-4 w-4" />
                Total
              </div>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md border-l-4 border-l-blue-500" onClick={() => setTipoFilter('peca')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-blue-600 text-sm mb-1">
                <Tag className="h-4 w-4" />
                Peças
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats.pecas}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md border-l-4 border-l-purple-500" onClick={() => setTipoFilter('servico')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-purple-600 text-sm mb-1">
                <Wrench className="h-4 w-4" />
                Serviços
              </div>
              <p className="text-2xl font-bold text-purple-600">{stats.servicos}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-orange-600 text-sm mb-1">
                <AlertTriangle className="h-4 w-4" />
                Estoque Baixo
              </div>
              <p className="text-2xl font-bold text-orange-600">{stats.estoqueBaixo}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
                <BarChart3 className="h-4 w-4" />
                Valor Estoque
              </div>
              <p className="text-xl font-bold text-green-600">{currencyFormatters.brl(stats.valorEstoque)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Card principal */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>Cadastro de Produtos</CardTitle>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Produto
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição, código de barras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="peca">Peças</SelectItem>
                  <SelectItem value="servico">Serviços</SelectItem>
                  <SelectItem value="produto">Produtos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={grupoFilter} onValueChange={setGrupoFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Grupos</SelectItem>
                  {grupos.map(g => (<SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* Tabela */}
            {filteredProdutos.length === 0 ? (
              <EmptyState
                variant="no-data"
                title="Nenhum produto encontrado"
                description="Cadastre peças, serviços e produtos."
                action={{ label: 'Novo Produto', onClick: () => handleOpenDialog() }}
              />
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Grupo</TableHead>
                      <TableHead>Referência</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead className="text-right">Venda</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProdutos.map((produto) => {
                      const estoqueBaixo = produto.estoque_minimo && produto.estoque_atual <= produto.estoque_minimo;
                      return (
                        <TableRow key={produto.id} className={cn(estoqueBaixo && "bg-orange-50 dark:bg-orange-950/20")}>
                          <TableCell className="font-mono text-muted-foreground">
                            {produto.codigo?.toString().padStart(4, '0')}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div>
                              <p>{produto.descricao}</p>
                              {produto.codigo_barras && (
                                <p className="text-xs text-muted-foreground font-mono">{produto.codigo_barras}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{getGrupoNome(produto.grupo_id)}</TableCell>
                          <TableCell className="text-muted-foreground">{produto.referencia || '-'}</TableCell>
                          <TableCell className="text-right">
                            <button
                              className={cn(
                                "font-semibold cursor-pointer hover:underline",
                                estoqueBaixo ? "text-orange-600" : ""
                              )}
                              onClick={() => {
                                setEstoqueProdutoId(produto.id);
                                setEstoqueDialog(true);
                              }}
                            >
                              {produto.estoque_atual}
                              {estoqueBaixo && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                            </button>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {currencyFormatters.brl(produto.preco_custo)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {currencyFormatters.brl(produto.preco_venda)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {produto.tipo === 'peca' ? 'Peça' : produto.tipo === 'servico' ? 'Serviço' : 'Produto'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(produto)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeletingId(produto.id); setDeleteDialogOpen(true); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de cadastro */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduto ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            <DialogDescription>Preencha os dados do produto</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Tipo e descrição */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={formData.tipo} onValueChange={(v: any) => setFormData({ ...formData, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="peca">Peça</SelectItem>
                    <SelectItem value="servico">Serviço</SelectItem>
                    <SelectItem value="produto">Produto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Descrição *</Label>
                <Input value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} placeholder="Nome do produto" />
              </div>
            </div>

            {/* Código e referência */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Código de Barras</Label>
                <Input value={formData.codigo_barras} onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })} placeholder="EAN-13" />
              </div>
              <div className="space-y-2">
                <Label>Referência</Label>
                <Input value={formData.referencia} onChange={(e) => setFormData({ ...formData, referencia: e.target.value })} placeholder="Ref. fornecedor" />
              </div>
              <div className="space-y-2">
                <Label>Grupo</Label>
                <Select value={formData.grupo_id} onValueChange={(v) => setFormData({ ...formData, grupo_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {grupos.map(g => (<SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Marca e modelo (para peças) */}
            {formData.tipo === 'peca' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Marca</Label>
                  <Select value={formData.marca_id} onValueChange={(v) => setFormData({ ...formData, marca_id: v, modelo_id: '' })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {marcas.map(m => (<SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Select value={formData.modelo_id} onValueChange={(v) => setFormData({ ...formData, modelo_id: v })} disabled={!formData.marca_id}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {modelosFiltrados.map(m => (<SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Valores */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Preço de Custo</Label>
                <Input type="number" step="0.01" value={formData.preco_custo} onChange={(e) => setFormData({ ...formData, preco_custo: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Preço de Venda</Label>
                <Input type="number" step="0.01" value={formData.preco_venda} onChange={(e) => setFormData({ ...formData, preco_venda: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Margem de Lucro</Label>
                <div className={cn(
                  "h-9 px-3 py-2 rounded-md border bg-muted/50 flex items-center font-medium",
                  margemLucro > 0 ? "text-green-600" : margemLucro < 0 ? "text-destructive" : ""
                )}>
                  {margemLucro.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Estoque (apenas para peças e produtos) */}
            {formData.tipo !== 'servico' && (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Estoque Atual</Label>
                  <Input type="number" min="0" value={formData.estoque_atual} onChange={(e) => setFormData({ ...formData, estoque_atual: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Estoque Mínimo</Label>
                  <Input type="number" min="0" value={formData.estoque_minimo} onChange={(e) => setFormData({ ...formData, estoque_minimo: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Localização</Label>
                  <Input value={formData.localizacao} onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })} placeholder="Prateleira, gaveta..." />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <LoadingButton onClick={handleSubmit} loading={isSaving}>{editingProduto ? 'Atualizar' : 'Cadastrar'}</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de ajuste de estoque */}
      <Dialog open={estoqueDialog} onOpenChange={setEstoqueDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajustar Estoque</DialogTitle>
            <DialogDescription>Entrada ou saída de estoque</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Movimento</Label>
              <Select value={estoqueTipo} onValueChange={(v: any) => setEstoqueTipo(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input type="number" min="1" value={estoqueQtd} onChange={(e) => setEstoqueQtd(parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEstoqueDialog(false)}>Cancelar</Button>
            <Button onClick={handleAjustarEstoque}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de exclusão */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Inativar Produto"
        description="Tem certeza que deseja inativar este produto?"
        onConfirm={handleDelete}
        variant="danger"
      />
    </ModernLayout>
  );
}

