import { useState, useMemo } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Plus, Search, Edit, Trash2, Package, Wrench, Box
} from 'lucide-react';
import { useProdutos } from '@/hooks/useAssistencia';
import { Produto, ProdutoFormData } from '@/types/assistencia';
import { EmptyState } from '@/components/EmptyState';
import { LoadingButton } from '@/components/LoadingButton';
import { currencyFormatters } from '@/utils/formatters';
import { useToast } from '@/hooks/use-toast';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [formData, setFormData] = useState<ProdutoFormData>(INITIAL_FORM);
  const [isLoading, setIsLoading] = useState(false);
  
  const { produtos, createProduto, updateProduto, deleteProduto } = useProdutos();
  const { toast } = useToast();

  // Filtrar produtos
  const filteredProdutos = useMemo(() => {
    let result = produtos;
    
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.descricao.toLowerCase().includes(q) ||
        p.codigo_barras?.includes(searchTerm) ||
        p.referencia?.toLowerCase().includes(q)
      );
    }
    
    if (tipoFilter !== 'all') {
      result = result.filter(p => p.tipo === tipoFilter);
    }
    
    return result;
  }, [produtos, searchTerm, tipoFilter]);

  // Calcular margem de lucro
  const calcularMargem = (custo: number, venda: number): number => {
    if (custo === 0) return 0;
    return ((venda - custo) / custo) * 100;
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
    setFormData({
      tipo: produto.tipo as any,
      descricao: produto.descricao,
      descricao_abreviada: produto.descricao_abreviada,
      codigo_barras: produto.codigo_barras || '',
      referencia: produto.referencia,
      preco_custo: produto.preco_custo,
      preco_venda: produto.preco_venda,
      estoque_atual: produto.estoque_atual,
      estoque_minimo: produto.estoque_minimo,
      localizacao: produto.localizacao,
    });
    setShowForm(true);
  };

  // Salvar produto
  const handleSubmit = () => {
    if (!formData.descricao) {
      toast({ title: 'Descrição é obrigatória', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  // Deletar produto
  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente excluir este produto?')) {
      deleteProduto(id);
      toast({ title: 'Produto excluído!' });
    }
  };

  // Ícone por tipo
  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'peca': return <Box className="h-4 w-4" />;
      case 'servico': return <Wrench className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  // Badge por tipo
  const getTipoBadge = (tipo: string) => {
    const colors: Record<string, string> = {
      peca: 'bg-blue-500',
      servico: 'bg-green-500',
      produto: 'bg-purple-500',
    };
    const labels: Record<string, string> = {
      peca: 'Peça',
      servico: 'Serviço',
      produto: 'Produto',
    };
    return (
      <Badge className={`${colors[tipo]} text-white`}>
        {labels[tipo] || tipo}
      </Badge>
    );
  };

  return (
    <ModernLayout title="Produtos e Serviços" subtitle="Gerenciar peças, produtos e serviços">
      <div className="space-y-4">
        {/* Barra de ações */}
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por descrição, código..."
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
              </div>
              <Button onClick={handleNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de produtos */}
        <Card>
          <CardContent className="p-0">
            {filteredProdutos.length === 0 ? (
              <EmptyState
                icon={Package}
                title="Nenhum produto encontrado"
                description={searchTerm ? "Tente buscar por outro termo" : "Cadastre seu primeiro produto ou serviço"}
                action={!searchTerm ? { label: "Novo Produto", onClick: handleNew } : undefined}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Venda</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProdutos.map(produto => (
                    <TableRow key={produto.id}>
                      <TableCell>{getTipoBadge(produto.tipo)}</TableCell>
                      <TableCell className="font-medium">{produto.descricao}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {produto.codigo_barras || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {currencyFormatters.brl(produto.preco_custo)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {currencyFormatters.brl(produto.preco_venda)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={produto.margem_lucro && produto.margem_lucro > 0 ? 'text-green-600' : ''}>
                          {produto.margem_lucro?.toFixed(1) || 0}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {produto.tipo === 'servico' ? '-' : (
                          <span className={
                            produto.estoque_atual <= (produto.estoque_minimo || 0) 
                              ? 'text-red-600 font-semibold' 
                              : ''
                          }>
                            {produto.estoque_atual}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleEdit(produto)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete(produto.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-lg">
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
                  <Label>Código de Barras</Label>
                  <Input
                    value={formData.codigo_barras}
                    onChange={(e) => setFormData(prev => ({ ...prev, codigo_barras: e.target.value }))}
                  />
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
              </div>

              {/* Mostrar margem calculada */}
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
              <LoadingButton onClick={handleSubmit} loading={isLoading}>
                {editingProduto ? 'Atualizar' : 'Cadastrar'}
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModernLayout>
  );
}
