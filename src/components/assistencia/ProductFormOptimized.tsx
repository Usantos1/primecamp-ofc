import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Produto } from '@/types/assistencia';
import { parseBRLInput, maskBRL, formatBRL } from '@/utils/currency';
import { from } from '@/integrations/db/client';
import { Barcode, Package, DollarSign, Warehouse, History, Plus, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProductFormOptimizedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produto?: Produto | null;
  onSave: (payload: Partial<Produto>) => Promise<void>;
  grupos?: any[];
  marcas?: any[];
  modelos?: any[];
}

interface FormData {
  nome: string;
  codigo?: number;
  codigo_barras?: string;
  referencia?: string;
  marca?: string;
  modelo?: string;
  grupo?: string;
  sub_grupo?: string;
  qualidade?: string;
  preco_custo?: number | string;
  valor_venda?: number | string;
  valor_parcelado_6x?: number | string;
  margem_percentual?: number;
  quantidade?: number;
  estoque_minimo?: number;
  localizacao?: string;
}

interface EstoqueMovimentacao {
  id: string;
  data: string;
  ref_tipo: 'OS' | 'Venda' | 'Cancelamento' | 'Devolução' | 'Ajuste' | 'Inventário';
  ref_id?: string;
  ref_numero: number;
  quantidade_delta: number; // negativo = saída, positivo = entrada
  descricao: string;
  vendedor_nome?: string | null;
}

/**
 * Gera código de barras EAN-13 válido
 */
function gerarEAN13(input?: string | number): string {
  let base: string;
  
  if (typeof input === 'number') {
    base = input.toString().padStart(12, '0').slice(-12);
  } else if (typeof input === 'string' && input.length >= 12) {
    base = input.replace(/\D/g, '').slice(0, 12).padStart(12, '0');
  } else if (typeof input === 'string' && input.length > 0) {
    base = input.replace(/\D/g, '').padStart(12, '0').slice(-12);
  } else {
    const random = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    base = '789' + random;
  }
  
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    const digito = parseInt(base[i]!, 10);
    soma += (i % 2 === 0) ? digito : digito * 3;
  }
  const dv = (10 - (soma % 10)) % 10;
  
  return base + dv.toString();
}

/**
 * Busca o próximo código disponível (MAX + 1)
 */
async function buscarProximoCodigo(): Promise<number> {
  try {
    const { data, error } = await from('produtos')
      .select('codigo')
      .not('codigo', 'is', null)
      .order('codigo', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar próximo código:', error);
      return 1;
    }

    const maxCodigo = data?.codigo || 0;
    return maxCodigo + 1;
  } catch (error) {
    console.error('Erro ao buscar próximo código:', error);
    return 1;
  }
}

/**
 * Busca movimentações de estoque relacionadas ao produto (OS e Vendas)
 */
async function buscarMovimentacoesEstoque(produtoId: string): Promise<EstoqueMovimentacao[]> {
  try {
    const movimentacoes: EstoqueMovimentacao[] = [];

    // 1. Buscar os_items relacionados ao produto (Ordens de Serviço)
    const { data: osItens } = await from('os_items')
      .select('id, quantidade, tipo, descricao, created_at, ordem_servico_id, colaborador_nome')
      .eq('produto_id', produtoId)
      .eq('tipo', 'peca')
      .order('created_at', { ascending: false })
      .execute();

    if (osItens && osItens.length > 0) {
      // Buscar números das OSs relacionadas
      const osIds = [...new Set(osItens.map((item: any) => item.ordem_servico_id).filter(Boolean))];
      
      let osMap = new Map();
      if (osIds.length > 0) {
        const { data: ordens } = await from('ordens_servico')
          .select('id, numero')
          .in('id', osIds)
          .execute();
        osMap = new Map((ordens || []).map((os: any) => [os.id, os.numero]));
      }

      osItens.forEach((item: any) => {
        movimentacoes.push({
          id: item.id,
          data: item.created_at,
          ref_tipo: 'OS',
          ref_id: item.ordem_servico_id,
          ref_numero: osMap.get(item.ordem_servico_id) || 0,
          quantidade_delta: -Math.abs(Number(item.quantidade || 0)),
          descricao: item.descricao || 'Baixa via OS',
          vendedor_nome: item.colaborador_nome || null,
        });
      });
    }

    // 2. Buscar sale_items relacionados ao produto (Vendas)
    const { data: saleItens } = await from('sale_items')
      .select('id, quantidade, produto_nome, created_at, sale_id')
      .eq('produto_id', produtoId)
      .order('created_at', { ascending: false })
      .execute();

    if (saleItens && saleItens.length > 0) {
      // Agrupar por venda para evitar múltiplas linhas que parecem múltiplos cancelamentos
      // (ex: mesmo produto lançado mais de uma vez na mesma venda)
      const groupedBySale = new Map<string, { quantidade: number; created_at: string }>();
      for (const item of saleItens as any[]) {
        const saleId = item.sale_id;
        if (!saleId) continue;
        const prev = groupedBySale.get(saleId);
        const qtd = Math.abs(Number(item.quantidade || 0));
        if (!prev) {
          groupedBySale.set(saleId, { quantidade: qtd, created_at: item.created_at });
        } else {
          groupedBySale.set(saleId, {
            quantidade: prev.quantidade + qtd,
            // manter o created_at mais recente (já vem ordenado desc, então prev é o mais recente)
            created_at: prev.created_at,
          });
        }
      }

      // Buscar números das vendas relacionadas
      const saleIds = [...groupedBySale.keys()];
      
      let salesMap = new Map();
      let salesMeta = new Map<string, any>();
      if (saleIds.length > 0) {
        const { data: sales } = await from('sales')
          .select('id, numero, status, is_draft, vendedor_nome, created_at, finalized_at, canceled_at, updated_at')
          .in('id', saleIds)
          .execute();
        salesMap = new Map((sales || []).map((s: any) => [s.id, s.numero]));
        salesMeta = new Map((sales || []).map((s: any) => [s.id, s]));
      }

      for (const [saleId, agg] of groupedBySale.entries()) {
        const sale = salesMeta.get(saleId);
        const saleNumero = salesMap.get(saleId) || 0;
        const qtd = Math.abs(Number(agg.quantidade || 0));

        // Venda (saída) - apenas quando não é rascunho
        const isDraft = Boolean(sale?.is_draft);
        const saleStatus = (sale?.status || 'draft') as string;
        const hasFinalizedAt = Boolean(sale?.finalized_at);
        const baixaEfetivada = !isDraft && (hasFinalizedAt || ['open', 'paid', 'partial', 'canceled', 'refunded'].includes(saleStatus));

        if (baixaEfetivada) {
          movimentacoes.push({
            id: `sale-${saleId}`,
            data: sale?.finalized_at || sale?.created_at || agg.created_at,
            ref_tipo: 'Venda',
            ref_id: saleId,
            ref_numero: saleNumero,
            quantidade_delta: -qtd,
            descricao: `Venda #${saleNumero || '?'}`,
            vendedor_nome: sale?.vendedor_nome || null,
          });
        }

        // Cancelamento (entrada) - quando cancelada e havia baixa efetivada
        if (saleStatus === 'canceled' && sale?.canceled_at && baixaEfetivada) {
          movimentacoes.push({
            id: `sale-cancel-${saleId}`,
            data: sale.canceled_at,
            ref_tipo: 'Cancelamento',
            ref_id: saleId,
            ref_numero: saleNumero,
            quantidade_delta: +qtd,
            descricao: `Cancelamento da venda #${saleNumero || '?'}`,
            vendedor_nome: sale?.vendedor_nome || null,
          });
        }

        // Devolução (entrada) - se status for refunded
        if (saleStatus === 'refunded' && baixaEfetivada) {
          movimentacoes.push({
            id: `sale-refund-${saleId}`,
            data: sale?.updated_at || agg.created_at,
            ref_tipo: 'Devolução',
            ref_id: saleId,
            ref_numero: saleNumero,
            quantidade_delta: +qtd,
            descricao: `Devolução da venda #${saleNumero || '?'}`,
            vendedor_nome: sale?.vendedor_nome || null,
          });
        }
      }
    }

    // 3. Movimentações internas (ajustes manuais / inventário)
    const { data: internalMovs } = await from('produto_movimentacoes')
      .select('id, tipo, motivo, quantidade_antes, quantidade_depois, quantidade_delta, valor_venda_antes, valor_venda_depois, valor_custo_antes, valor_custo_depois, inventario_id, user_nome, created_at')
      .eq('produto_id', produtoId)
      .order('created_at', { ascending: false })
      .limit(200)
      .execute();

    if (internalMovs && internalMovs.length > 0) {
      (internalMovs as any[]).forEach((m) => {
        const isInventario = String(m.tipo || '').includes('inventario');
        const qtdDelta = Number(m.quantidade_delta || 0);

        const parts: string[] = [];
        if (m.quantidade_antes !== null && m.quantidade_depois !== null) {
          parts.push(`Estoque: ${m.quantidade_antes} → ${m.quantidade_depois} (${qtdDelta >= 0 ? '+' : ''}${qtdDelta})`);
        }
        if (m.valor_venda_antes !== null && m.valor_venda_depois !== null) {
          parts.push(`Venda: ${formatBRL(Number(m.valor_venda_antes || 0))} → ${formatBRL(Number(m.valor_venda_depois || 0))}`);
        }
        if (m.valor_custo_antes !== null && m.valor_custo_depois !== null) {
          parts.push(`Custo: ${formatBRL(Number(m.valor_custo_antes || 0))} → ${formatBRL(Number(m.valor_custo_depois || 0))}`);
        }

        movimentacoes.push({
          id: `internal-${m.id}`,
          data: m.created_at,
          ref_tipo: isInventario ? 'Inventário' : 'Ajuste',
          ref_id: m.inventario_id || undefined,
          ref_numero: 0,
          quantidade_delta: Number.isFinite(qtdDelta) ? qtdDelta : 0,
          descricao: parts.length > 0 ? parts.join(' • ') : (m.motivo || 'Ajuste manual'),
          vendedor_nome: m.user_nome || null,
        });
      });
    }

    // Ordenar por data decrescente
    movimentacoes.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    return movimentacoes;
  } catch (error) {
    console.error('Erro ao buscar movimentações:', error);
    return [];
  }
}

export function ProductFormOptimized({
  open,
  onOpenChange,
  produto,
  onSave,
  grupos = [],
  marcas = [],
  modelos = [],
}: ProductFormOptimizedProps) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCodigo, setIsLoadingCodigo] = useState(false);
  const [activeTab, setActiveTab] = useState('dados');
  const isEditing = Boolean(produto?.id);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      nome: '',
      codigo: undefined,
      codigo_barras: '',
      referencia: '',
      marca: '',
      modelo: '',
      grupo: '',
      sub_grupo: '',
      qualidade: '',
      preco_custo: undefined,
      valor_venda: 0,
      valor_parcelado_6x: undefined,
      margem_percentual: undefined,
      quantidade: 0,
      estoque_minimo: 0,
      localizacao: '',
    },
  });

  const codigoBarras = watch('codigo_barras');
  const codigo = watch('codigo');
  const precoCusto = watch('preco_custo');
  const valorVenda = watch('valor_venda');
  const valorParcelado = watch('valor_parcelado_6x');
  
  // Estados para controlar valores brutos durante digitação (sem formatação)
  const [precoCustoRaw, setPrecoCustoRaw] = useState<string>('');
  const [valorVendaRaw, setValorVendaRaw] = useState<string>('');
  const [valorParceladoRaw, setValorParceladoRaw] = useState<string>('');

  // Buscar movimentações de estoque (apenas quando editar e produto tiver ID)
  const { data: movimentacoes = [], isLoading: isLoadingMovimentacoes } = useQuery({
    queryKey: ['produto_movimentacoes', produto?.id],
    queryFn: () => buscarMovimentacoesEstoque(produto!.id),
    enabled: !!produto?.id && open,
  });

  // Carrega dados do produto quando editar ou abrir modal
  useEffect(() => {
    if (open) {
      if (produto) {
        // Modo edição
        reset({
          nome: produto.nome || produto.descricao || '',
          codigo: produto.codigo,
          codigo_barras: produto.codigo_barras || '',
          referencia: produto.referencia || '',
          marca: produto.marca || '',
          modelo: produto.modelo || produto.modelo_compativel || '',
          grupo: produto.grupo || produto.categoria || '',
          sub_grupo: produto.sub_grupo || '',
          qualidade: produto.qualidade || '',
          preco_custo: (produto.preco_custo || produto.valor_compra || 0),
          valor_venda: produto.valor_venda || produto.preco_venda || 0,
          valor_parcelado_6x: produto.valor_parcelado_6x,
          margem_percentual: produto.margem_percentual || produto.margem_lucro,
          quantidade: produto.quantidade || produto.estoque_atual || 0,
          estoque_minimo: produto.estoque_minimo || 0,
          localizacao: produto.localizacao || '',
        });
        setActiveTab('dados');
      } else {
        // Modo criação - buscar próximo código
        setIsLoadingCodigo(true);
        buscarProximoCodigo().then((proximoCodigo) => {
          reset({
            nome: '',
            codigo: proximoCodigo,
            codigo_barras: '',
            referencia: '',
            marca: '',
            modelo: '',
            grupo: '',
            sub_grupo: '',
            qualidade: '',
            valor_venda: 0,
            valor_parcelado_6x: undefined,
            margem_percentual: undefined,
            quantidade: 0,
            estoque_minimo: 0,
            localizacao: '',
          });
          // Limpar valores brutos
          setPrecoCustoRaw('');
          setValorVendaRaw('');
          setValorParceladoRaw('');
          setIsLoadingCodigo(false);
          setActiveTab('dados');
        });
      }
    }
  }, [produto, open, reset]);

  // Gerar código de barras EAN-13
  const handleGerarCodigoBarras = () => {
    const codigoAtual = codigo || codigoBarras;
    const ean13 = gerarEAN13(codigoAtual);
    setValue('codigo_barras', ean13);
  };

  // Converter valor bruto (string com vírgula) para número
  const parseRawValue = (rawValue: string): number => {
    if (!rawValue || rawValue.trim() === '') return 0;
    // Remove espaços e converte vírgula para ponto
    const cleaned = rawValue.trim().replace(/[^\d,\.]/g, '').replace(',', '.');
    if (!cleaned || cleaned === '.') return 0;
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };
  
  // Handler genérico para campos de preço
  const handlePrecoChange = (
    value: string,
    setRaw: (val: string) => void,
    setFormValue: (val: number) => void
  ) => {
    // Permite backspace e delete funcionarem normalmente
    if (value === '') {
      setRaw('');
      setFormValue(0);
      return;
    }
    
    const masked = maskBRL(value);
    setRaw(masked);
    const numValue = parseRawValue(masked);
    setFormValue(numValue);
  };

  // Calcular margem automaticamente
  useEffect(() => {
    const venda = typeof valorVenda === 'string' ? parseBRLInput(valorVenda) : Number(valorVenda || 0);
    const custo = typeof precoCusto === 'string' ? parseBRLInput(precoCusto) : Number(precoCusto || 0);
    if (!custo || custo <= 0) {
      setValue('margem_percentual', 0);
      return;
    }
    const margem = ((venda - custo) / custo) * 100;
    setValue('margem_percentual', Number.isFinite(margem) ? Number(margem.toFixed(2)) : 0);
  }, [valorVenda, precoCusto, setValue]);

  const onSubmit = async (data: FormData) => {
    try {
      setIsSaving(true);

      const payload: Partial<Produto> = {};

      // Identificação
      if (data.nome) {
        payload.nome = data.nome;
      }
      if (data.codigo !== undefined && data.codigo !== null) {
        payload.codigo = data.codigo;
      }
      if (data.codigo_barras && data.codigo_barras.trim()) {
        payload.codigo_barras = data.codigo_barras.trim();
      }
      if (data.referencia && data.referencia.trim()) {
        payload.referencia = data.referencia.trim();
      }
      if (data.marca && data.marca.trim()) {
        payload.marca = data.marca.trim();
      }
      if (data.modelo && data.modelo.trim()) {
        payload.modelo = data.modelo.trim();
      }
      if (data.grupo && data.grupo.trim()) {
        payload.grupo = data.grupo.trim();
      }
      if (data.sub_grupo && data.sub_grupo.trim()) {
        payload.sub_grupo = data.sub_grupo.trim();
      }
      if (data.qualidade && data.qualidade.trim()) {
        payload.qualidade = data.qualidade.trim();
      }

      // Preços (BRL)
      const precoCustoNum = typeof data.preco_custo === 'string' ? parseBRLInput(data.preco_custo) : (data.preco_custo || 0);
      if (precoCustoNum >= 0 || isEditing) {
        (payload as any).preco_custo = precoCustoNum;
      }

      const valorVendaNum = typeof data.valor_venda === 'string' ? parseBRLInput(data.valor_venda) : (data.valor_venda || 0);
      if (valorVendaNum > 0 || isEditing) {
        payload.valor_venda = valorVendaNum;
      }

      if (data.valor_parcelado_6x !== undefined && data.valor_parcelado_6x !== null) {
        const valorParceladoNum = typeof data.valor_parcelado_6x === 'string' ? parseBRLInput(data.valor_parcelado_6x) : data.valor_parcelado_6x;
        if (valorParceladoNum > 0 || isEditing) {
          payload.valor_parcelado_6x = valorParceladoNum;
        }
      }

      if (data.margem_percentual !== undefined && data.margem_percentual !== null) {
        payload.margem_percentual = data.margem_percentual;
      }

      // Estoque
      if (data.quantidade !== undefined && data.quantidade !== null) {
        payload.quantidade = data.quantidade;
      }
      // Estoque mínimo: sempre enviar, mesmo se for 0 (para permitir zerar)
      if (data.estoque_minimo !== undefined && data.estoque_minimo !== null) {
        payload.estoque_minimo = data.estoque_minimo;
      } else if (isEditing) {
        // Se estiver editando e não foi informado, enviar 0
        payload.estoque_minimo = 0;
      }
      // Localização: enviar mesmo se vazio (para permitir limpar)
      if (data.localizacao !== undefined) {
        payload.localizacao = data.localizacao.trim() || null;
      }

      await onSave(payload);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="dados" className="gap-2">
                <Package className="h-4 w-4" />
                Dados do Produto
              </TabsTrigger>
              <TabsTrigger value="precos" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Preços
              </TabsTrigger>
              <TabsTrigger value="estoque" className="gap-2">
                <Warehouse className="h-4 w-4" />
                Estoque
              </TabsTrigger>
              <TabsTrigger value="condicional" className="gap-2" disabled={!isEditing}>
                <History className="h-4 w-4" />
                Estoque Condicional
              </TabsTrigger>
            </TabsList>

            {/* ABA: Dados do Produto */}
            <TabsContent value="dados" className="flex-1 overflow-y-auto space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="nome">
                    Nome/Descrição *
                    {errors.nome && <span className="text-destructive ml-2">({errors.nome.message})</span>}
                  </Label>
                  <Input
                    id="nome"
                    {...register('nome', { required: 'Nome é obrigatório' })}
                    placeholder="Ex: Adaptador iPhone Jack P2"
                    className="text-base md:text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="codigo">Código</Label>
                  <Input
                    id="codigo"
                    type="number"
                    {...register('codigo', { valueAsNumber: true })}
                    placeholder="Código do produto"
                    disabled={isLoadingCodigo || isEditing}
                    className="text-base md:text-sm"
                  />
                  {isLoadingCodigo && (
                    <p className="text-xs text-muted-foreground mt-1">Carregando próximo código...</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="codigo_barras">Código de Barras (EAN-13)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="codigo_barras"
                      {...register('codigo_barras')}
                      placeholder="7890000000000"
                      className="flex-1 text-base md:text-sm"
                      maxLength={13}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGerarCodigoBarras}
                      disabled={!codigo && !codigoBarras}
                      className="gap-2"
                    >
                      <Barcode className="h-4 w-4" />
                      Gerar
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="referencia">Referência</Label>
                  <Input
                    id="referencia"
                    {...register('referencia')}
                    placeholder="Ex: AIJ-669"
                    className="text-base md:text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="marca">Marca</Label>
                  <Select
                    value={watch('marca') || ''}
                    onValueChange={(value) => setValue('marca', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a marca" />
                    </SelectTrigger>
                    <SelectContent>
                      {marcas.map((marca) => (
                        <SelectItem key={marca.id || marca} value={marca.nome || marca}>
                          {marca.nome || marca}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="modelo">Modelo</Label>
                  <Select
                    value={watch('modelo') || ''}
                    onValueChange={(value) => setValue('modelo', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      {modelos.map((modelo) => (
                        <SelectItem key={modelo.id || modelo} value={modelo.nome || modelo}>
                          {modelo.nome || modelo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="grupo">Grupo/Categoria</Label>
                  <Select
                    value={watch('grupo') || ''}
                    onValueChange={(value) => setValue('grupo', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {grupos.map((grupo) => (
                        <SelectItem key={grupo.id || grupo} value={grupo.nome || grupo}>
                          {grupo.nome || grupo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sub_grupo">Subgrupo</Label>
                  <Input
                    id="sub_grupo"
                    {...register('sub_grupo')}
                    placeholder="Ex: Acessórios"
                    className="text-base md:text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="qualidade">Qualidade</Label>
                  <Input
                    id="qualidade"
                    {...register('qualidade')}
                    placeholder="Ex: Original"
                    className="text-base md:text-sm"
                  />
                </div>
              </div>
            </TabsContent>

            {/* ABA: Preços */}
            <TabsContent value="precos" className="flex-1 overflow-y-auto space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="preco_custo">Valor de Compra / Custo</Label>
                  <Input
                    id="preco_custo"
                    type="text"
                    inputMode="decimal"
                    value={precoCustoRaw}
                    onChange={(e) => {
                      handlePrecoChange(
                        e.target.value,
                        setPrecoCustoRaw,
                        (val) => setValue('preco_custo', val)
                      );
                    }}
                    onBlur={() => {
                      const numValue = parseRawValue(precoCustoRaw);
                      if (numValue > 0) {
                        setPrecoCustoRaw(numValue.toFixed(2).replace('.', ','));
                      } else if (precoCustoRaw === '' || precoCustoRaw === '0') {
                        setPrecoCustoRaw('');
                      }
                    }}
                    onKeyDown={(e) => {
                      // Permite backspace, delete, tab, enter, arrow keys funcionarem normalmente
                      if (['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                        return;
                      }
                    }}
                    placeholder="0,00"
                    className="text-right text-base md:text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Usado para calcular a margem automaticamente
                  </p>
                </div>

                <div>
                  <Label htmlFor="valor_venda">
                    Valor de Venda (Dinheiro/PIX) *
                  </Label>
                  <Input
                    id="valor_venda"
                    type="text"
                    inputMode="decimal"
                    value={valorVendaRaw}
                    onChange={(e) => {
                      handlePrecoChange(
                        e.target.value,
                        setValorVendaRaw,
                        (val) => setValue('valor_venda', val)
                      );
                    }}
                    onBlur={() => {
                      const numValue = parseRawValue(valorVendaRaw);
                      if (numValue > 0) {
                        setValorVendaRaw(numValue.toFixed(2).replace('.', ','));
                      } else if (valorVendaRaw === '' || valorVendaRaw === '0') {
                        setValorVendaRaw('');
                      }
                    }}
                    onKeyDown={(e) => {
                      // Permite backspace, delete, tab, enter, arrow keys funcionarem normalmente
                      if (['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                        return;
                      }
                    }}
                    placeholder="0,00"
                    className="text-right font-semibold text-base md:text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="valor_parcelado_6x">Valor Parcelado 6x</Label>
                  <Input
                    id="valor_parcelado_6x"
                    type="text"
                    inputMode="decimal"
                    value={valorParceladoRaw}
                    onChange={(e) => {
                      handlePrecoChange(
                        e.target.value,
                        setValorParceladoRaw,
                        (val) => setValue('valor_parcelado_6x', val)
                      );
                    }}
                    onBlur={() => {
                      const numValue = parseRawValue(valorParceladoRaw);
                      if (numValue > 0) {
                        setValorParceladoRaw(numValue.toFixed(2).replace('.', ','));
                      } else if (valorParceladoRaw === '' || valorParceladoRaw === '0') {
                        setValorParceladoRaw('');
                      }
                    }}
                    onKeyDown={(e) => {
                      // Permite backspace, delete, tab, enter, arrow keys funcionarem normalmente
                      if (['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                        return;
                      }
                    }}
                    placeholder="0,00"
                    className="text-right text-base md:text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="margem_percentual">Margem (%)</Label>
                  <Input
                    id="margem_percentual"
                    type="number"
                    step="0.01"
                    {...register('margem_percentual', { valueAsNumber: true })}
                    placeholder="0.00"
                    readOnly
                    className="bg-muted text-base md:text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Calculada automaticamente: ((Venda - Compra) / Compra) × 100
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* ABA: Estoque */}
            <TabsContent value="estoque" className="flex-1 overflow-y-auto space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantidade">Quantidade Atual</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    {...register('quantidade', { valueAsNumber: true })}
                    placeholder="0"
                    className="text-base md:text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="estoque_minimo">Estoque Mínimo</Label>
                  <Input
                    id="estoque_minimo"
                    type="number"
                    {...register('estoque_minimo', { valueAsNumber: true })}
                    placeholder="0"
                    className="text-base md:text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Alerta quando estoque ficar abaixo deste valor
                  </p>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="localizacao">Localização</Label>
                  <Input
                    id="localizacao"
                    {...register('localizacao')}
                    placeholder="Ex: Prateleira A3, Gaveta 2"
                    className="text-base md:text-sm"
                  />
                </div>
              </div>
            </TabsContent>

            {/* ABA: Estoque Condicional */}
            <TabsContent value="condicional" className="flex-1 overflow-y-auto space-y-4 mt-4">
              {isLoadingMovimentacoes ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando histórico...
                </div>
              ) : movimentacoes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma movimentação de estoque registrada</p>
                  <p className="text-sm mt-2">As baixas de estoque vindas de vendas ou OS aparecerão aqui</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Histórico de movimentações de estoque vinculadas a este produto (Vendas e Ordens de Serviço)
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Ref.</TableHead>
                          <TableHead>Quantidade</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Vendedor</TableHead>
                          <TableHead>Descrição</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movimentacoes.map((mov) => (
                          <TableRow key={mov.id}>
                            <TableCell>
                              {format(new Date(mov.data), "dd/MM/yyyy 'às' HH:mm")}
                            </TableCell>
                            <TableCell className="font-mono">
                              {mov.ref_id ? (
                                <button
                                  type="button"
                                  className="underline underline-offset-2 hover:text-blue-600"
                                  onClick={() => {
                                    if (mov.ref_tipo === 'OS') navigate(`/os/${mov.ref_id}`);
                                    if (mov.ref_tipo === 'Venda' || mov.ref_tipo === 'Cancelamento' || mov.ref_tipo === 'Devolução') navigate(`/pdv/venda/${mov.ref_id}`);
                                  }}
                                  title={mov.ref_tipo === 'OS' ? 'Abrir OS' : 'Abrir venda'}
                                >
                                  #{mov.ref_numero}
                                </button>
                              ) : (
                                <>#{mov.ref_numero}</>
                              )}
                            </TableCell>
                            <TableCell className={mov.quantidade_delta < 0 ? "font-semibold text-destructive" : "font-semibold text-emerald-700"}>
                              {mov.quantidade_delta < 0 ? '-' : '+'}{Math.abs(mov.quantidade_delta)}
                            </TableCell>
                            <TableCell>
                              <span className="px-2 py-1 bg-muted rounded text-xs">
                                {mov.ref_tipo}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {mov.vendedor_nome || '-'}
                            </TableCell>
                            <TableCell>{mov.descricao}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || isLoadingCodigo}>
              {isSaving ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
