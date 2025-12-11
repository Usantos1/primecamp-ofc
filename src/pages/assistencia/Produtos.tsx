import { useState, useMemo } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Plus, Search, Edit, Trash2, Package, X, Barcode, Warehouse, Plug, 
  DoorOpen, Filter, XCircle
} from 'lucide-react';
import { useProdutos, useMarcasModelos } from '@/hooks/useAssistencia';
import { Produto, ProdutoFormData } from '@/types/assistencia';
import { EmptyState } from '@/components/EmptyState';
import { LoadingButton } from '@/components/LoadingButton';
import { currencyFormatters } from '@/utils/formatters';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const INITIAL_FORM: ProdutoFormData = {
  tipo: 'peca',
  descricao: '',
  codigo_barras: '',
  preco_custo: 0,
  preco_venda: 0,
  estoque_atual: 0,
  estoque_minimo: 0,
};

export default function Produtos() {
  const navigate = useNavigate();
  const { produtos, grupos, isLoading, createProduto, updateProduto, deleteProduto } = useProdutos();
  const { marcas, modelos, getModeloById, getMarcaById, getModelosByMarca } = useMarcasModelos();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [situacaoFilter, setSituacaoFilter] = useState<string>('ativo');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [grupoFilter, setGrupoFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [formData, setFormData] = useState<ProdutoFormData>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtrar produtos
  const filteredProdutos = useMemo(() => {
    let result = [...produtos];

    // Filtro por situação
    if (situacaoFilter === 'ativo') {
      result = result.filter(p => p.situacao === 'ativo' || p.situacao === undefined);
    } else if (situacaoFilter === 'inativo') {
      result = result.filter(p => p.situacao === 'inativo');
    }

    // Filtro por tipo
    if (tipoFilter !== 'all') {
      result = result.filter(p => p.tipo === tipoFilter);
    }

    // Filtro por grupo
    if (grupoFilter !== 'all') {
      result = result.filter(p => p.grupo_id === grupoFilter);
    }

    // Filtro por descrição
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.descricao.toLowerCase().includes(q) ||
        p.codigo_barras?.includes(searchTerm) ||
        p.referencia?.toLowerCase().includes(q) ||
        p.descricao_abreviada?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [produtos, situacaoFilter, tipoFilter, grupoFilter, searchTerm]);

  // Calcular margem de lucro
  const calcularMargem = (custo: number, venda: number): number => {
    if (custo === 0) return 0;
    return ((venda - custo) / custo) * 100;
  };

  // Gerar código sequencial
  const getCodigo = (produto: Produto, index: number): number => {
    return produto.codigo || index + 1;
  };

  // Obter nome do grupo
  const getGrupoNome = (grupoId?: string): string => {
    if (!grupoId) return '-';
    const grupo = grupos.find(g => g.id === grupoId);
    return grupo?.nome || '-';
  };

  // Obter nome da marca
  const getMarcaNome = (marcaId?: string): string => {
    if (!marcaId) return '-';
    const marca = getMarcaById(marcaId);
    return marca?.nome || '-';
  };

  // Obter nome do modelo
  const getModeloNome = (modeloId?: string): string => {
    if (!modeloId) return '-';
    const modelo = getModeloById(modeloId);
    return modelo?.nome || '-';
  };

  // Limpar filtros
  const handleClearFilters = () => {
    setSearchTerm('');
    setSituacaoFilter('ativo');
    setTipoFilter('all');
    setGrupoFilter('all');
  };

  // Abrir form para novo produto
  const handleNew = () => {
    setEditingProduto(null);
    setFormData(INITIAL_FORM);
    setShowForm(true);
  };

  // Abrir form para editar
  const handleEdit = (produto: Produto) => {
    setEditingProduto(produto);
    setSelectedProduto(produto);
    setFormData({
      tipo: produto.tipo as any,
      descricao: produto.descricao,
      descricao_abreviada: produto.descricao_abreviada,
      codigo_barras: produto.codigo_barras || '',
      referencia: produto.referencia,
      grupo_id: produto.grupo_id || '',
      marca_id: produto.marca_id || '',
      modelo_id: produto.modelo_id || '',
      preco_custo: produto.preco_custo,
      preco_venda: produto.preco_venda,
      estoque_atual: produto.estoque_atual,
      estoque_minimo: produto.estoque_minimo || 0,
      localizacao: produto.localizacao || '',
    });
    setShowForm(true);
  };

  // Abrir produto (selecionar)
  const handleOpen = (produto: Produto) => {
    setSelectedProduto(produto);
    handleEdit(produto);
  };

  // Inativar produto
  const handleInativar = () => {
    if (selectedProduto) {
      deleteProduto(selectedProduto.id);
      toast({ title: 'Produto inativado!' });
      setSelectedProduto(null);
    }
  };

  // Salvar produto
  const handleSubmit = () => {
    if (!formData.descricao) {
      toast({ title: 'Descrição é obrigatória', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const margem = calcularMargem(formData.preco_custo, formData.preco_venda);
      
      if (editingProduto) {
        updateProduto(editingProduto.id, { ...formData, margem_lucro: margem } as any);
        toast({ title: 'Produto atualizado!' });
      } else {
        createProduto({ ...formData, margem_lucro: margem } as any);
        toast({ title: 'Produto cadastrado!' });
      }
      setShowForm(false);
      setSelectedProduto(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModernLayout title="Pesquisa de Produtos" subtitle="Gerenciar produtos e serviços">
      <div className="space-y-4">
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

              <Select value={grupoFilter} onValueChange={setGrupoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">TODOS</SelectItem>
                  {grupos.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value="all" disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Sub Grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">TODOS</SelectItem>
                </SelectContent>
              </Select>

              <div className="col-span-2">
                <Input
                  placeholder="Descrição"
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

        {/* Tabela de produtos */}
        <Card>
          <CardContent className="p-0">
            {filteredProdutos.length === 0 ? (
              <div className="p-12 text-center">
                <EmptyState
                  icon={<Package className="h-12 w-12" />}
                  title="Nenhum produto encontrado"
                  description={searchTerm ? "Tente buscar por outro termo" : "Cadastre seu primeiro produto ou serviço"}
                  action={!searchTerm ? { label: "Novo Produto", onClick: handleNew } : undefined}
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
                      <TableHead className="w-32 text-right">Vl. Mín. Venda</TableHead>
                      <TableHead className="w-32">Modelo</TableHead>
                      <TableHead className="w-32">Marca</TableHead>
                      <TableHead className="w-32">Grupo</TableHead>
                      <TableHead className="w-32">Sub Grupo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProdutos.map((produto, index) => (
                      <TableRow 
                        key={produto.id}
                        className={selectedProduto?.id === produto.id ? 'bg-muted' : 'cursor-pointer'}
                        onClick={() => setSelectedProduto(produto)}
                      >
                        <TableCell className="font-mono">{getCodigo(produto, index)}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {produto.referencia || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {produto.codigo_barras || '-'}
                        </TableCell>
                        <TableCell className="font-medium">{produto.descricao}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {produto.localizacao || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {produto.unidade || 'UN'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {currencyFormatters.brl(produto.preco_venda)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {currencyFormatters.brl(produto.preco_venda)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {getModeloNome(produto.modelo_id)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {getMarcaNome(produto.marca_id)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {getGrupoNome(produto.grupo_id)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">-</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Barra de ações */}
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleNew} className="gap-2" variant="default">
                  <Plus className="h-4 w-4" />
                  Novo Produto
                </Button>
                <Button 
                  onClick={() => selectedProduto && handleOpen(selectedProduto)} 
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
                >
                  <Barcode className="h-4 w-4" />
                  Etiqueta
                </Button>
                <Button 
                  className="gap-2"
                  variant="outline"
                  disabled={!selectedProduto}
                >
                  <Warehouse className="h-4 w-4" />
                  Estoque
                </Button>
                <Button 
                  className="gap-2"
                  variant="outline"
                  disabled={!selectedProduto}
                >
                  <Plug className="h-4 w-4" />
                  NCM
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
            <div className="mt-3 text-xs text-muted-foreground text-center">
              Para consultar o estoque, tecle F1 | F2-Novo | F3-Alterar | F8-Excluir | F9-Limpar | F10-Filtrar | Esc-Sair
            </div>
          </CardContent>
        </Card>

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduto ? 'Editar Produto' : 'Novo Produto'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select 
                    value={formData.tipo} 
                    onValueChange={(v: any) => setFormData(prev => ({ ...prev, tipo: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="peca">Peça</SelectItem>
                      <SelectItem value="servico">Serviço</SelectItem>
                      <SelectItem value="produto">Produto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Grupo</Label>
                  <Select
                    value={formData.grupo_id}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, grupo_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {grupos.map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Input
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descrição do produto/serviço"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Referência</Label>
                  <Input
                    value={formData.referencia || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, referencia: e.target.value }))}
                    placeholder="Código interno"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Código de Barras</Label>
                  <Input
                    value={formData.codigo_barras}
                    onChange={(e) => setFormData(prev => ({ ...prev, codigo_barras: e.target.value }))}
                    placeholder="EAN / Código de barras"
                  />
                </div>
              </div>

              {formData.tipo === 'peca' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Marca</Label>
                    <Select
                      value={formData.marca_id}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, marca_id: v, modelo_id: '' }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {marcas.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Select
                      value={formData.modelo_id}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, modelo_id: v }))}
                      disabled={!formData.marca_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.marca_id && getModelosByMarca(formData.marca_id).map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Preço de Custo</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.preco_custo || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      preco_custo: parseFloat(e.target.value) || 0 
                    }))}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preço de Venda</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.preco_venda || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      preco_venda: parseFloat(e.target.value) || 0 
                    }))}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Input
                    value="UN"
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              {formData.preco_custo > 0 && formData.preco_venda > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <span className="text-sm text-muted-foreground">Margem de Lucro: </span>
                  <span className="font-bold text-green-600">
                    {calcularMargem(formData.preco_custo, formData.preco_venda).toFixed(1)}%
                  </span>
                </div>
              )}

              {formData.tipo !== 'servico' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Estoque Atual</Label>
                    <Input
                      type="number"
                      value={formData.estoque_atual || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        estoque_atual: parseInt(e.target.value) || 0 
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estoque Mínimo</Label>
                    <Input
                      type="number"
                      value={formData.estoque_minimo || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        estoque_minimo: parseInt(e.target.value) || 0 
                      }))}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Localização</Label>
                <Input
                  value={formData.localizacao || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, localizacao: e.target.value }))}
                  placeholder="Ex: Prateleira A, Gaveta 3"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <LoadingButton onClick={handleSubmit} loading={isSubmitting}>
                {editingProduto ? 'Atualizar' : 'Cadastrar'}
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModernLayout>
  );
}
