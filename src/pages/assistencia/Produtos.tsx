import { useState, useMemo } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, Search, Edit, Trash2, Package, X, Barcode, Warehouse, Plug, 
  DoorOpen, Filter, XCircle, Save
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
  const [activeTab, setActiveTab] = useState('manutencao');
  
  // Campos adicionais do formulário completo
  const [formDataExtended, setFormDataExtended] = useState({
    codigo_balanca: '',
    situacao: 'ativo' as 'ativo' | 'inativo',
    ncm: '',
    cest: '',
    serial: false,
    peso: 0,
    informacoes_adicionais: '',
    servico_nfse: '',
    garantia: 0,
    sub_grupo_id: '',
    grade: '',
    compra: 0,
    percentual_lucro: 0,
    percentual_desconto: 0,
    tipo_preco: 'variavel' as 'fixo' | 'variavel',
    conversao_codigo_barras: '',
    conversao_unidade: 'UN',
    conversao_fator: 1,
    conversao_operacao: 'multiplicar' as 'multiplicar' | 'dividir',
    natureza_operacao: '',
    situacao_tributaria: '',
    aliquota_icms: '',
    percentual_ipi: 0,
    percentual_ampara_rs: 0,
    percentual_mva: 0,
    percentual_mva_interes: 0,
    estoque_reposicao: 0,
    icms_st_base: 0,
    icms_st_aliquota: 0,
    icms_st_valor: 0,
  });

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
    setFormDataExtended({
      codigo_balanca: '',
      situacao: 'ativo',
      ncm: '',
      cest: '',
      serial: false,
      peso: 0,
      informacoes_adicionais: '',
      servico_nfse: '',
      garantia: 0,
      sub_grupo_id: '',
      grade: '',
      compra: 0,
      percentual_lucro: 0,
      percentual_desconto: 0,
      tipo_preco: 'variavel',
      conversao_codigo_barras: '',
      conversao_unidade: 'UN',
      conversao_fator: 1,
      conversao_operacao: 'multiplicar',
      natureza_operacao: '',
      situacao_tributaria: '',
      aliquota_icms: '',
      percentual_ipi: 0,
      percentual_ampara_rs: 0,
      percentual_mva: 0,
      percentual_mva_interes: 0,
      estoque_reposicao: 0,
      icms_st_base: 0,
      icms_st_aliquota: 0,
      icms_st_valor: 0,
    });
    setActiveTab('manutencao');
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
    // Carregar dados estendidos (se existirem no produto)
    setFormDataExtended({
      codigo_balanca: (produto as any).codigo_balanca || '',
      situacao: produto.situacao || 'ativo',
      ncm: (produto as any).ncm || '',
      cest: (produto as any).cest || '',
      serial: (produto as any).serial || false,
      peso: (produto as any).peso || 0,
      informacoes_adicionais: (produto as any).informacoes_adicionais || '',
      servico_nfse: (produto as any).servico_nfse || '',
      garantia: (produto as any).garantia || 0,
      sub_grupo_id: (produto as any).sub_grupo_id || '',
      grade: (produto as any).grade || '',
      compra: (produto as any).compra || produto.preco_custo,
      percentual_lucro: calcularMargem(produto.preco_custo, produto.preco_venda),
      percentual_desconto: (produto as any).percentual_desconto || 0,
      tipo_preco: (produto as any).tipo_preco || 'variavel',
      conversao_codigo_barras: (produto as any).conversao_codigo_barras || produto.codigo_barras || '',
      conversao_unidade: (produto as any).conversao_unidade || produto.unidade || 'UN',
      conversao_fator: (produto as any).conversao_fator || 1,
      conversao_operacao: (produto as any).conversao_operacao || 'multiplicar',
      natureza_operacao: (produto as any).natureza_operacao || '',
      situacao_tributaria: (produto as any).situacao_tributaria || '',
      aliquota_icms: (produto as any).aliquota_icms || '',
      percentual_ipi: (produto as any).percentual_ipi || 0,
      percentual_ampara_rs: (produto as any).percentual_ampara_rs || 0,
      percentual_mva: (produto as any).percentual_mva || 0,
      percentual_mva_interes: (produto as any).percentual_mva_interes || 0,
      estoque_reposicao: (produto as any).estoque_reposicao || 0,
      icms_st_base: (produto as any).icms_st_base || 0,
      icms_st_aliquota: (produto as any).icms_st_aliquota || 0,
      icms_st_valor: (produto as any).icms_st_valor || 0,
    });
    setActiveTab('manutencao');
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
  const handleSubmit = async () => {
    if (!formData.descricao) {
      toast({ title: 'Descrição é obrigatória', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Combinar dados do formulário com dados estendidos
      const produtoData: any = {
        ...formData,
        ...formDataExtended,
        // Garantir que campos principais estejam corretos
        situacao: formDataExtended.situacao,
        unidade: formDataExtended.conversao_unidade || 'UN',
      };
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
          </CardContent>
        </Card>

        {/* Form Dialog Completo */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {editingProduto ? 'Editar Produto' : 'Cadastro de Produto'}
              </DialogTitle>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="manutencao">Manutenção</TabsTrigger>
                <TabsTrigger value="fornecedor">Fornecedor</TabsTrigger>
                <TabsTrigger value="estoque">Estoque</TabsTrigger>
                <TabsTrigger value="estoque-condicional">Estoque Condicional</TabsTrigger>
                <TabsTrigger value="preco-venda-empresa">Preço Venda Empresa</TabsTrigger>
                <TabsTrigger value="preco-fornecedor">Preço Fornecedor</TabsTrigger>
                <TabsTrigger value="foto">Foto</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto p-4">
                {/* Tab: Manutenção */}
                <TabsContent value="manutencao" className="space-y-4 mt-0">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Código</Label>
                      <Input
                        value={editingProduto?.codigo || (filteredProdutos.length + 1).toString()}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cód. Balança</Label>
                      <Input
                        value={formDataExtended.codigo_balanca}
                        onChange={(e) => setFormDataExtended(prev => ({ ...prev, codigo_balanca: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Situação</Label>
                      <Select
                        value={formDataExtended.situacao}
                        onValueChange={(v: any) => setFormDataExtended(prev => ({ ...prev, situacao: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ativo">ATIVO</SelectItem>
                          <SelectItem value="inativo">INATIVO</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo Produto</Label>
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
                          <SelectItem value="assistencia">ASSISTÊNCIA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Código de Barras</Label>
                      <div className="flex gap-2">
                        <Input
                          value={formData.codigo_barras}
                          onChange={(e) => setFormData(prev => ({ ...prev, codigo_barras: e.target.value }))}
                          placeholder="7890000030922"
                        />
                        <Button variant="outline" size="icon">
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>NCM</Label>
                      <div className="flex gap-2">
                        <Input
                          value={formDataExtended.ncm}
                          onChange={(e) => setFormDataExtended(prev => ({ ...prev, ncm: e.target.value }))}
                          placeholder="01031000"
                        />
                        <Button variant="outline" size="icon">
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>CEST</Label>
                      <div className="flex gap-2">
                        <Input
                          value={formDataExtended.cest}
                          onChange={(e) => setFormDataExtended(prev => ({ ...prev, cest: e.target.value }))}
                        />
                        <Button variant="outline" size="icon">
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Un</Label>
                      <Select
                        value={formDataExtended.conversao_unidade}
                        onValueChange={(v) => setFormDataExtended(prev => ({ ...prev, conversao_unidade: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UN">UN</SelectItem>
                          <SelectItem value="KG">KG</SelectItem>
                          <SelectItem value="M">M</SelectItem>
                          <SelectItem value="LT">LT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição Detalhada</Label>
                    <Textarea
                      value={formData.descricao}
                      onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                      placeholder="CAMERA FRONTAL IPHONE 11"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Descrição Abreviada</Label>
                      <Input
                        value={formData.descricao_abreviada || formData.descricao}
                        onChange={(e) => setFormData(prev => ({ ...prev, descricao_abreviada: e.target.value }))}
                        placeholder="CAMERA FRONTAL IPHONE 11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Serial</Label>
                      <Select
                        value={formDataExtended.serial ? 'sim' : 'nao'}
                        onValueChange={(v) => setFormDataExtended(prev => ({ ...prev, serial: v === 'sim' }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nao">NÃO</SelectItem>
                          <SelectItem value="sim">SIM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Referência</Label>
                      <Input
                        value={formData.referencia || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, referencia: e.target.value }))}
                        placeholder="IPHONE 11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Peso</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={formDataExtended.peso || ''}
                        onChange={(e) => setFormDataExtended(prev => ({ ...prev, peso: parseFloat(e.target.value) || 0 }))}
                        placeholder="1,000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Informações Adicionais</Label>
                      <Textarea
                        value={formDataExtended.informacoes_adicionais}
                        onChange={(e) => setFormDataExtended(prev => ({ ...prev, informacoes_adicionais: e.target.value }))}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Serviço NFSE</Label>
                      <Input
                        value={formDataExtended.servico_nfse}
                        onChange={(e) => setFormDataExtended(prev => ({ ...prev, servico_nfse: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Garantia (dias)</Label>
                      <Input
                        type="number"
                        value={formDataExtended.garantia || ''}
                        onChange={(e) => setFormDataExtended(prev => ({ ...prev, garantia: parseInt(e.target.value) || 0 }))}
                        placeholder="90"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Grupo</Label>
                      <div className="flex gap-2">
                        <Input
                          value={formData.grupo_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, grupo_id: e.target.value }))}
                          placeholder="33"
                        />
                        <Button variant="outline" size="icon">
                          <Search className="h-4 w-4" />
                        </Button>
                        <Select
                          value={formData.grupo_id}
                          onValueChange={(v) => setFormData(prev => ({ ...prev, grupo_id: v }))}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="COMPONENTES" />
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
                      <Label>Sub Grupo</Label>
                      <div className="flex gap-2">
                        <Input
                          value={formDataExtended.sub_grupo_id}
                          onChange={(e) => setFormDataExtended(prev => ({ ...prev, sub_grupo_id: e.target.value }))}
                          placeholder="32"
                        />
                        <Button variant="outline" size="icon">
                          <Search className="h-4 w-4" />
                        </Button>
                        <Select
                          value={formDataExtended.sub_grupo_id}
                          onValueChange={(v) => setFormDataExtended(prev => ({ ...prev, sub_grupo_id: v }))}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="GERAL" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="geral">GERAL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Marca</Label>
                      <div className="flex gap-2">
                        <Input
                          value={formData.marca_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, marca_id: e.target.value }))}
                          placeholder="4"
                        />
                        <Button variant="outline" size="icon">
                          <Search className="h-4 w-4" />
                        </Button>
                        <Select
                          value={formData.marca_id}
                          onValueChange={(v) => setFormData(prev => ({ ...prev, marca_id: v, modelo_id: '' }))}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="APPLE" />
                          </SelectTrigger>
                          <SelectContent>
                            {marcas.map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Modelo</Label>
                      <Select
                        value={formData.modelo_id}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, modelo_id: v }))}
                        disabled={!formData.marca_id}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="11" />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.marca_id && getModelosByMarca(formData.marca_id).map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Grade</Label>
                      <Select
                        value={formDataExtended.grade}
                        onValueChange={(v) => setFormDataExtended(prev => ({ ...prev, grade: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">-</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Valores */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-4">Valores</h3>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Compra</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formDataExtended.compra || ''}
                          onChange={(e) => setFormDataExtended(prev => ({ ...prev, compra: parseFloat(e.target.value) || 0 }))}
                          placeholder="30,000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Custo</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.preco_custo || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, preco_custo: parseFloat(e.target.value) || 0 }))}
                          placeholder="30,000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>%Lucro</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formDataExtended.percentual_lucro || ''}
                          onChange={(e) => {
                            const lucro = parseFloat(e.target.value) || 0;
                            setFormDataExtended(prev => ({ ...prev, percentual_lucro: lucro }));
                            if (formData.preco_custo > 0) {
                              const venda = formData.preco_custo * (1 + lucro / 100);
                              setFormData(prev => ({ ...prev, preco_venda: venda }));
                            }
                          }}
                          placeholder="500,000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>V. Venda</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.preco_venda || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, preco_venda: parseFloat(e.target.value) || 0 }))}
                          placeholder="180,000"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label>% Desc.</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formDataExtended.percentual_desconto || ''}
                          onChange={(e) => setFormDataExtended(prev => ({ ...prev, percentual_desconto: parseFloat(e.target.value) || 0 }))}
                          placeholder="0,00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo de preço</Label>
                        <Select
                          value={formDataExtended.tipo_preco}
                          onValueChange={(v: any) => setFormDataExtended(prev => ({ ...prev, tipo_preco: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixo">FIXO</SelectItem>
                            <SelectItem value="variavel">VARIÁVEL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Conversão para entradas */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-4">Conversão para entradas</h3>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Código Barras</Label>
                        <Input
                          value={formDataExtended.conversao_codigo_barras || formData.codigo_barras}
                          onChange={(e) => setFormDataExtended(prev => ({ ...prev, conversao_codigo_barras: e.target.value }))}
                          placeholder="7890000030922"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Un</Label>
                        <Select
                          value={formDataExtended.conversao_unidade}
                          onValueChange={(v) => setFormDataExtended(prev => ({ ...prev, conversao_unidade: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UN">UN</SelectItem>
                            <SelectItem value="KG">KG</SelectItem>
                            <SelectItem value="M">M</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Fator</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={formDataExtended.conversao_fator || ''}
                          onChange={(e) => setFormDataExtended(prev => ({ ...prev, conversao_fator: parseFloat(e.target.value) || 1 }))}
                          placeholder="1,000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Operação</Label>
                        <RadioGroup
                          value={formDataExtended.conversao_operacao}
                          onValueChange={(v: any) => setFormDataExtended(prev => ({ ...prev, conversao_operacao: v }))}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="multiplicar" id="mult" />
                            <Label htmlFor="mult" className="font-normal">Multiplicar</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="dividir" id="div" />
                            <Label htmlFor="div" className="font-normal">Dividir</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                  </div>

                  {/* Dados Fiscais */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-4">Dados Fiscais</h3>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Nat. Operação</Label>
                        <div className="flex gap-2">
                          <Input
                            value={formDataExtended.natureza_operacao}
                            onChange={(e) => setFormDataExtended(prev => ({ ...prev, natureza_operacao: e.target.value }))}
                            placeholder="1"
                          />
                          <Button variant="outline" size="icon">
                            <Search className="h-4 w-4" />
                          </Button>
                          <Select
                            value={formDataExtended.natureza_operacao}
                            onValueChange={(v) => setFormDataExtended(prev => ({ ...prev, natureza_operacao: v }))}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="5102 - VENDA DE MERCADORIA" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5102">5102 - VENDA DE MERCADORIA</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Situação Tributária</Label>
                        <div className="flex gap-2">
                          <Input
                            value={formDataExtended.situacao_tributaria}
                            onChange={(e) => setFormDataExtended(prev => ({ ...prev, situacao_tributaria: e.target.value }))}
                            placeholder="1"
                          />
                          <Button variant="outline" size="icon">
                            <Search className="h-4 w-4" />
                          </Button>
                          <Select
                            value={formDataExtended.situacao_tributaria}
                            onValueChange={(v) => setFormDataExtended(prev => ({ ...prev, situacao_tributaria: v }))}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="102 - TRIBUTADO PELO SIMPLES NACIONAL" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="102">102 - TRIBUTADO PELO SIMPLES NACIONAL</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Alíquota ICMS</Label>
                        <div className="flex gap-2">
                          <Input
                            value={formDataExtended.aliquota_icms}
                            onChange={(e) => setFormDataExtended(prev => ({ ...prev, aliquota_icms: e.target.value }))}
                            placeholder="1"
                          />
                          <Button variant="outline" size="icon">
                            <Search className="h-4 w-4" />
                          </Button>
                          <Select
                            value={formDataExtended.aliquota_icms}
                            onValueChange={(v) => setFormDataExtended(prev => ({ ...prev, aliquota_icms: v }))}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="ISENTO" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="isento">ISENTO</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label>% IPI</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={formDataExtended.percentual_ipi || ''}
                          onChange={(e) => setFormDataExtended(prev => ({ ...prev, percentual_ipi: parseFloat(e.target.value) || 0 }))}
                          placeholder="0,000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>% Ampara RS</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={formDataExtended.percentual_ampara_rs || ''}
                          onChange={(e) => setFormDataExtended(prev => ({ ...prev, percentual_ampara_rs: parseFloat(e.target.value) || 0 }))}
                          placeholder="0,000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>% MVA</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={formDataExtended.percentual_mva || ''}
                          onChange={(e) => setFormDataExtended(prev => ({ ...prev, percentual_mva: parseFloat(e.target.value) || 0 }))}
                          placeholder="0,000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>% MVA Interes.</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={formDataExtended.percentual_mva_interes || ''}
                          onChange={(e) => setFormDataExtended(prev => ({ ...prev, percentual_mva_interes: parseFloat(e.target.value) || 0 }))}
                          placeholder="0,000"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Estoque */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-4">Estoque</h3>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Estoque</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={formData.estoque_atual || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, estoque_atual: parseFloat(e.target.value) || 0 }))}
                          placeholder="0,000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Reposição</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={formDataExtended.estoque_reposicao || ''}
                          onChange={(e) => setFormDataExtended(prev => ({ ...prev, estoque_reposicao: parseFloat(e.target.value) || 0 }))}
                          placeholder="0,000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mínimo</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={formData.estoque_minimo || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, estoque_minimo: parseFloat(e.target.value) || 0 }))}
                          placeholder="0,000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Localização</Label>
                        <Input
                          value={formData.localizacao || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, localizacao: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-medium mb-4">ICMS ST Retido</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Base</Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={formDataExtended.icms_st_base || ''}
                            onChange={(e) => setFormDataExtended(prev => ({ ...prev, icms_st_base: parseFloat(e.target.value) || 0 }))}
                            placeholder="0,000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Alíquota</Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={formDataExtended.icms_st_aliquota || ''}
                            onChange={(e) => setFormDataExtended(prev => ({ ...prev, icms_st_aliquota: parseFloat(e.target.value) || 0 }))}
                            placeholder="0,000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Valor</Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={formDataExtended.icms_st_valor || ''}
                            onChange={(e) => setFormDataExtended(prev => ({ ...prev, icms_st_valor: parseFloat(e.target.value) || 0 }))}
                            placeholder="0,000"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab: Fornecedor */}
                <TabsContent value="fornecedor" className="space-y-4 mt-0">
                  <div className="text-center text-muted-foreground py-8">
                    <p>Configurações de fornecedor em desenvolvimento</p>
                  </div>
                </TabsContent>

                {/* Tab: Estoque */}
                <TabsContent value="estoque" className="space-y-4 mt-0">
                  <div className="text-center text-muted-foreground py-8">
                    <p>Gestão de estoque em desenvolvimento</p>
                  </div>
                </TabsContent>

                {/* Tab: Estoque Condicional */}
                <TabsContent value="estoque-condicional" className="space-y-4 mt-0">
                  <div className="text-center text-muted-foreground py-8">
                    <p>Estoque condicional em desenvolvimento</p>
                  </div>
                </TabsContent>

                {/* Tab: Preço Venda Empresa */}
                <TabsContent value="preco-venda-empresa" className="space-y-4 mt-0">
                  <div className="text-center text-muted-foreground py-8">
                    <p>Preços de venda por empresa em desenvolvimento</p>
                  </div>
                </TabsContent>

                {/* Tab: Preço Fornecedor */}
                <TabsContent value="preco-fornecedor" className="space-y-4 mt-0">
                  <div className="text-center text-muted-foreground py-8">
                    <p>Preços de fornecedor em desenvolvimento</p>
                  </div>
                </TabsContent>

                {/* Tab: Foto */}
                <TabsContent value="foto" className="space-y-4 mt-0">
                  <div className="text-center text-muted-foreground py-8">
                    <p>Upload de fotos em desenvolvimento</p>
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <DialogFooter className="border-t pt-4">
              <div className="flex items-center justify-between w-full">
                <div className="flex gap-2">
                  <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo
                  </Button>
                  <LoadingButton onClick={handleSubmit} loading={isSubmitting} className="gap-2">
                    <Save className="h-4 w-4" />
                    Salvar
                  </LoadingButton>
                  <Button variant="outline" className="gap-2">
                    <Save className="h-4 w-4" />
                    Cópia
                  </Button>
                </div>
                <Button variant="outline" onClick={() => setShowForm(false)} className="gap-2 text-destructive">
                  <X className="h-4 w-4" />
                  Sair
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModernLayout>
  );
}
