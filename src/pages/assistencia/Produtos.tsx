import { useState, useMemo, useEffect } from 'react';
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
  DoorOpen, Filter, XCircle, Save, AlertTriangle, Check, FileSpreadsheet
} from 'lucide-react';
import { ImportarProdutos } from '@/components/ImportarProdutos';
import { Badge } from '@/components/ui/badge';
import { useProdutos } from '@/hooks/useProdutosSupabase';
import { useMarcasModelosSupabase } from '@/hooks/useMarcasModelosSupabase';
import { Produto, ProdutoFormData } from '@/types/assistencia';
import { EmptyState } from '@/components/EmptyState';
import { LoadingButton } from '@/components/LoadingButton';
import { currencyFormatters } from '@/utils/formatters';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { generateEtiquetaPDF, generateEtiquetasA4, EtiquetaData } from '@/utils/etiquetaGenerator';
// import { ProductFormOptimized } from '@/components/assistencia/ProductFormOptimized'; // Componente não implementado

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
  const { marcas, modelos, getModeloById, getMarcaById, getModelosByMarca } = useMarcasModelosSupabase();
  const { toast } = useToast();

  // Verificar se há backups disponíveis quando produtos desaparecem
  useEffect(() => {
    const checkBackups = () => {
      const backupKeys = Object.keys(localStorage)
        .filter(k => k.startsWith('assistencia_produtos_backup_'))
        .sort()
        .reverse();
      
      if (backupKeys.length > 0 && produtos.length === 0) {
        const latestBackup = localStorage.getItem(backupKeys[0]);
        if (latestBackup) {
          try {
            const backupData = JSON.parse(latestBackup);
            if (Array.isArray(backupData) && backupData.length > 0) {
              console.warn(`[PRODUTOS] Backup encontrado com ${backupData.length} produtos!`);
              toast({
                title: '⚠️ Backup encontrado!',
                description: `Encontrado backup com ${backupData.length} produtos. Verifique o console para restaurar.`,
                variant: 'default',
                duration: 15000,
              });
              // Adicionar função global para restaurar
              (window as any).restaurarProdutosBackup = () => {
                localStorage.setItem('assistencia_produtos', latestBackup);
                window.location.reload();
              };
              console.log('[PRODUTOS] Para restaurar, execute: window.restaurarProdutosBackup()');
            }
          } catch (error) {
            console.error('Erro ao verificar backup:', error);
          }
        }
      }
    };

    // Verificar backups após 2 segundos (dar tempo para carregar)
    const timeout = setTimeout(checkBackups, 2000);
    return () => clearTimeout(timeout);
  }, [produtos.length, toast]);

  const [searchTerm, setSearchTerm] = useState('');
  const [situacaoFilter, setSituacaoFilter] = useState<string>('ativo');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [formData, setFormData] = useState<ProdutoFormData>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('manutencao');
  const [showEtiquetaModal, setShowEtiquetaModal] = useState(false);
  const [quantidadeEtiquetas, setQuantidadeEtiquetas] = useState(1);
  const [showEstoqueModal, setShowEstoqueModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  
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
  }, [produtos, situacaoFilter, tipoFilter, searchTerm]);

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
    // Abrir modal imediatamente
    setShowForm(true);
    setEditingProduto(produto);
    setSelectedProduto(produto);
    
    // Preencher dados do formulário
    setFormData({
      tipo: produto.tipo as any || 'peca',
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

  // Gerar código de barras automaticamente
  const gerarCodigoBarras = (produto: Produto): string => {
    if (produto.codigo_barras) {
      return produto.codigo_barras;
    }
    
    // Gerar EAN13 baseado no código do produto
    if (produto.codigo) {
      // EAN13 precisa de 13 dígitos
      // Usar código do produto + zeros à esquerda + dígito verificador
      const codigoBase = produto.codigo.toString().padStart(12, '0');
      // Calcular dígito verificador EAN13
      let soma = 0;
      for (let i = 0; i < 12; i++) {
        const digito = parseInt(codigoBase[i]);
        soma += i % 2 === 0 ? digito : digito * 3;
      }
      const digitoVerificador = (10 - (soma % 10)) % 10;
      return codigoBase + digitoVerificador.toString();
    }
    
    // Se não tiver código, gerar baseado no ID
    const idBase = produto.id.replace(/-/g, '').substring(0, 12).padStart(12, '0');
    let soma = 0;
    for (let i = 0; i < 12; i++) {
      const digito = parseInt(idBase[i]);
      soma += i % 2 === 0 ? digito : digito * 3;
    }
    const digitoVerificador = (10 - (soma % 10)) % 10;
    return idBase + digitoVerificador.toString();
  };

  // Gerar etiqueta
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
      // Gerar código de barras se não tiver
      const codigoBarras = gerarCodigoBarras(selectedProduto);
      
      // Se o produto não tinha código de barras, atualizar
      if (!selectedProduto.codigo_barras) {
        await updateProduto(selectedProduto.id, {
          ...selectedProduto,
          codigo_barras: codigoBarras,
        });
        toast({
          title: 'Código de barras gerado',
          description: `Código de barras ${codigoBarras} foi gerado e salvo no produto.`,
        });
      }

      // Calcular código do produto (usar código existente ou índice + 1)
      const produtoIndex = produtos.findIndex(p => p.id === selectedProduto.id);
      const codigoProduto = selectedProduto.codigo || produtoIndex + 1;

      const etiquetaData: EtiquetaData = {
        descricao: selectedProduto.descricao,
        descricao_abreviada: selectedProduto.descricao_abreviada,
        preco_venda: selectedProduto.preco_venda,
        codigo_barras: codigoBarras,
        codigo: codigoProduto,
        referencia: selectedProduto.referencia,
        empresa: {
          nome: 'PRIMECAMP',
          logo: 'https://primecamp.com.br/wp-content/uploads/2025/07/Design-sem-nome-4.png', // Logo da empresa
        },
      };

      // Gerar múltiplas etiquetas se necessário
      if (quantidadeEtiquetas > 1) {
        const produtos = Array(quantidadeEtiquetas).fill(etiquetaData);
        const doc = await generateEtiquetasA4(produtos, 7, 5); // 7 colunas x 5 linhas para etiquetas verticais
        // Abrir janela de impressão
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
      } else {
        const doc = await generateEtiquetaPDF(etiquetaData);
        // Abrir janela de impressão
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
      }

      toast({
        title: 'Etiqueta gerada',
        description: `Abrindo janela de impressão para ${quantidadeEtiquetas} etiqueta(s)...`,
      });

      setShowEtiquetaModal(false);
      setQuantidadeEtiquetas(1);
    } catch (error: any) {
      console.error('Erro ao gerar etiqueta:', error);
      toast({
        title: 'Erro ao gerar etiqueta',
        description: error.message || 'Ocorreu um erro ao gerar a etiqueta.',
        variant: 'destructive',
      });
    }
  };

  // Abrir produto (selecionar)
  const handleOpen = (produto: Produto) => {
    setSelectedProduto(produto);
    handleEdit(produto);
  };

  // Inativar produto
  const handleInativar = async () => {
    if (selectedProduto) {
      await deleteProduto(selectedProduto.id);
      toast({ title: 'Produto inativado!' });
      setSelectedProduto(null);
    }
  };

  // Salvar produto (para o novo ProductFormOptimized)
  const handleSave = async (supabasePayload: any) => {
    // Converter payload do Supabase para formato Produto
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
        description: error.message || 'Erro ao salvar produto',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Salvar produto (função antiga - mantida para compatibilidade)
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
        margem_lucro: calcularMargem(formData.preco_custo, formData.preco_venda),
      };
      
      if (editingProduto) {
        await updateProduto(editingProduto.id, produtoData);
        toast({ title: 'Produto atualizado!' });
      } else {
        await createProduto(produtoData);
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

        {/* Barra de ações fixa abaixo dos filtros */}
        <div className="sticky top-0 bg-background border-b z-40 shadow-sm -mx-4 px-4 py-2">
          <Card className="border-0 shadow-none">
            <CardContent className="py-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setShowImport(true)} className="gap-2" variant="outline">
                    <FileSpreadsheet className="h-4 w-4" />
                    Importar
                  </Button>
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
        </div>

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
                      <TableHead className="w-32">Modelo</TableHead>
                      <TableHead className="w-32">Marca</TableHead>
                      <TableHead className="w-24 text-right">Estoque</TableHead>
                      <TableHead className="w-20">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProdutos.map((produto, index) => (
                      <TableRow 
                        key={produto.id}
                        className={selectedProduto?.id === produto.id ? 'bg-muted' : 'cursor-pointer'}
                        onClick={() => setSelectedProduto(produto)}
                      >
                        <TableCell className="font-mono">{produto.codigo || '-'}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {produto.referencia || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {produto.codigo_barras || '-'}
                        </TableCell>
                        <TableCell className="font-medium uppercase">{produto.descricao}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {produto.localizacao || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {produto.unidade || 'UN'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {currencyFormatters.brl(produto.preco_venda)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {produto.modelo_compativel || produto.modelo || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {produto.marca || '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {produto.estoque_atual || 0}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpen(produto);
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

        {/* Form Dialog Simplificado */}
        {/* <ProductFormOptimized
          open={showForm}
          onOpenChange={setShowForm}
          produto={editingProduto}
          onSave={handleSave}
          grupos={grupos}
          marcas={marcas}
          modelos={modelos}
        /> */}
        {/* TODO: Implementar ProductFormOptimized ou usar formulário inline */}

        {/* Modal antigo removido - código foi movido para ProductFormOptimized */}

        {/* Modal de Etiqueta */}
        <Dialog open={showEtiquetaModal} onOpenChange={setShowEtiquetaModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Gerar Etiqueta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedProduto && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Produto</Label>
                    <span className="font-semibold">{selectedProduto.descricao}</span>
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
                  onChange={(e) => setQuantidadeEtiquetas(Math.max(1, parseInt(e.target.value) || 1))}
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

        {/* Modal de Estoque - O modal correto está mais abaixo - código duplicado removido */}

        {/* Modal de Etiqueta */}
        <Dialog open={showEtiquetaModal} onOpenChange={setShowEtiquetaModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Gerar Etiqueta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedProduto && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Produto:</Label>
                    <span className="font-semibold">{selectedProduto.descricao}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Preço:</Label>
                    <span className="font-semibold text-lg">
                      {currencyFormatters.brl(selectedProduto.preco_venda)}
                    </span>
                  </div>
                  {selectedProduto.codigo_barras && (
                    <div className="flex items-center justify-between">
                      <Label>Código de Barras:</Label>
                      <span className="text-sm font-mono">{selectedProduto.codigo_barras}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label>Quantidade de Etiquetas</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={quantidadeEtiquetas}
                  onChange={(e) => setQuantidadeEtiquetas(Math.max(1, parseInt(e.target.value) || 1))}
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

        {/* Modal de Estoque */}
        <Dialog open={showEstoqueModal} onOpenChange={setShowEstoqueModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Informações de Estoque</DialogTitle>
            </DialogHeader>
            {selectedProduto && (
              <div className="space-y-6 py-4">
                {/* Informações do Produto */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-2">{selectedProduto.descricao}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Código:</span> {selectedProduto.codigo || selectedProduto.id}
                    </div>
                    {selectedProduto.referencia && (
                      <div>
                        <span className="font-medium">Referência:</span> {selectedProduto.referencia}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quantidades */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Estoque Atual</Label>
                      <div className="text-3xl font-bold text-primary">
                        {selectedProduto.estoque_atual || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Quantidade disponível em estoque
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Estoque Mínimo</Label>
                      <div className="text-2xl font-semibold">
                        {selectedProduto.estoque_minimo || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Quantidade mínima para alerta
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Estoque de Reposição</Label>
                      <div className="text-2xl font-semibold">
                        {(selectedProduto as any).estoque_reposicao || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Quantidade ideal para reposição
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Estoque Disponível Real</Label>
                      <div className="text-2xl font-semibold text-green-600">
                        {Math.max(0, (selectedProduto.estoque_atual || 0))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Estoque disponível para venda
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Localização</Label>
                      <div className="text-lg font-medium">
                        {selectedProduto.localizacao || '-'}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Localização física no estoque
                      </p>
                    </div>

                    {/* Status do Estoque */}
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Status do Estoque</Label>
                      <div className="mt-2">
                        {selectedProduto.estoque_atual !== undefined && selectedProduto.estoque_minimo !== undefined && (
                          <>
                            {selectedProduto.estoque_atual <= selectedProduto.estoque_minimo ? (
                              <Badge variant="destructive" className="text-sm py-1 px-3">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Estoque Baixo
                              </Badge>
                            ) : selectedProduto.estoque_atual <= (selectedProduto.estoque_minimo * 1.5) ? (
                              <Badge variant="outline" className="text-sm py-1 px-3 border-yellow-500 text-yellow-700">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Atenção
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-sm py-1 px-3 border-green-500 text-green-700">
                                <Check className="h-3 w-3 mr-1" />
                                Normal
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resumo */}
                <div className="border-t pt-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Saldo Disponível</p>
                      <p className="text-lg font-semibold">
                        {Math.max(0, (selectedProduto.estoque_atual || 0) - (selectedProduto.estoque_minimo || 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Necessário Repor</p>
                      <p className="text-lg font-semibold text-orange-600">
                        {Math.max(0, ((selectedProduto as any).estoque_reposicao || 0) - (selectedProduto.estoque_atual || 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Valor Total Estoque</p>
                      <p className="text-lg font-semibold text-primary">
                        {currencyFormatters.brl((selectedProduto.estoque_atual || 0) * (selectedProduto.preco_custo || 0))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEstoqueModal(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Importação */}
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
