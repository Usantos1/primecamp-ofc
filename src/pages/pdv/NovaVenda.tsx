import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, Plus, Minus, Trash2, ShoppingCart, User, X,
  Save, CreditCard, DollarSign, QrCode, Printer, Send, Download, FileText, Wrench,
  FileCheck, ArrowRight, MessageCircle, Share2, CheckCircle2
} from 'lucide-react';
import { generateCupomTermica, generateCupomPDF, printTermica, generateOrcamentoPDF, generateOrcamentoHTML, OrcamentoData } from '@/utils/pdfGenerator';
import { openWhatsApp, formatVendaMessage } from '@/utils/whatsapp';
import { useSales, useSaleItems, usePayments, useCashRegister } from '@/hooks/usePDV';
import { useQuotes } from '@/hooks/useQuotes';
import { useClientesSupabase as useClientes } from '@/hooks/useClientesSupabase';
import { useOrdensServicoSupabase as useOrdensServico } from '@/hooks/useOrdensServicoSupabase';
import { useItensOS } from '@/hooks/useAssistencia';
import { useProdutosSupabase } from '@/hooks/useProdutosSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { from } from '@/integrations/db/client';
import { useCupomConfig } from '@/hooks/useCupomConfig';
import { CartItem, PaymentFormData, PaymentMethod, PAYMENT_METHOD_LABELS, Quote } from '@/types/pdv';
import { currencyFormatters } from '@/utils/formatters';
import { useToast } from '@/hooks/use-toast';
import { LoadingButton } from '@/components/LoadingButton';
import { cn } from '@/lib/utils';

export default function NovaVenda() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const isEditing = Boolean(id);

  const { createSale, updateSale, finalizeSale, deleteSale, getSaleById } = useSales();
  const { items, addItem, updateItem, removeItem, isLoading: itemsLoading } = useSaleItems(id || '');
  const { payments, addPayment, confirmPayment, isLoading: paymentsLoading } = usePayments(id || '');
  const { currentSession: cashSession } = useCashRegister();
  const { createQuote, convertToSale, markAsSentWhatsApp } = useQuotes();
  
  const { produtos, isLoading: produtosLoading } = useProdutosSupabase();
  const { data: cupomConfig } = useCupomConfig();
  
  // Função de busca de produtos
  const searchProdutos = (term: string) => {
    if (!term) return [];
    const search = term.toLowerCase();
    return produtos.filter(p => 
      p.descricao?.toLowerCase().includes(search) ||
      p.codigo?.toString().includes(search) ||
      p.codigo_barras?.includes(search) ||
      p.referencia?.toLowerCase().includes(search)
    );
  };
  const { clientes, searchClientes, createCliente } = useClientes();
  const { ordens, getOSById } = useOrdensServico();
  
  // Buscar todos os itens do localStorage
  // Removido: não precisa mais carregar itens do localStorage
  // Os itens de OS agora são carregados diretamente do Supabase quando necessário

  // Estados
  const [sale, setSale] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<any[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteResults, setClienteResults] = useState<any[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  const [showClienteSearch, setShowClienteSearch] = useState(false);
  
  const [observacoes, setObservacoes] = useState('');
  const [vendedorId, setVendedorId] = useState('');
  
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutPayment, setCheckoutPayment] = useState<PaymentFormData>({
    forma_pagamento: 'dinheiro',
    valor: undefined,
    troco: 0,
  });
  
  const [descontoTotal, setDescontoTotal] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEmitirCupomDialog, setShowEmitirCupomDialog] = useState(false);
  const [shouldEmitCupom, setShouldEmitCupom] = useState(true);
  const [pendingSaleForCupom, setPendingSaleForCupom] = useState<any>(null);
  
  // Estados para modal de faturar OS
  const [showFaturarOSModal, setShowFaturarOSModal] = useState(false);
  const [osList, setOsList] = useState<any[]>([]);
  const [isLoadingOS, setIsLoadingOS] = useState(false);
  const [osSearch, setOsSearch] = useState('');

  // Estados para orçamento
  const [showOrcamentoModal, setShowOrcamentoModal] = useState(false);
  const [orcamentoGerado, setOrcamentoGerado] = useState<Quote | null>(null);
  const [isGeneratingOrcamento, setIsGeneratingOrcamento] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Carregar venda se estiver editando
  useEffect(() => {
    if (isEditing && id) {
      loadSale();
    }
  }, [isEditing, id]);

  // Função para importar OS automaticamente
  const handleImportarOS = useCallback(async (osId: string) => {
    try {
      console.log('[NovaVenda] Importando OS:', osId);
      
      // Buscar OS do Supabase
      const os = getOSById(osId);
      if (!os) {
        toast({
          title: 'OS não encontrada',
          description: 'A ordem de serviço não foi encontrada.',
          variant: 'destructive',
        });
        return;
      }

      // Buscar itens da OS do banco
      const { data: itensOS, error: itensError } = await from('os_items')
        .select('*')
        .eq('ordem_servico_id', osId)
        .in('tipo', ['peca', 'produto'])
        .execute();

      if (itensError) {
        console.error('Erro ao buscar itens da OS:', itensError);
        toast({
          title: 'Erro',
          description: 'Erro ao buscar itens da OS.',
          variant: 'destructive',
        });
        return;
      }

      if (!itensOS || itensOS.length === 0) {
        toast({
          title: 'OS sem produtos',
          description: 'Esta OS não possui produtos para faturar.',
          variant: 'destructive',
        });
        return;
      }

      // Buscar cliente
      const cliente = clientes.find(c => c.id === os.cliente_id);

      // Criar venda vinculada à OS
      const novaVenda = await createSale({
        cliente_id: os.cliente_id || null,
        cliente_nome: os.cliente_nome || cliente?.nome || 'Cliente não informado',
        cliente_cpf_cnpj: cliente?.cpf_cnpj || null,
        cliente_telefone: os.telefone_contato || cliente?.telefone || null,
        ordem_servico_id: os.id,
        is_draft: true,
        observacoes: `Faturamento da OS #${os.numero}`,
      });

      // Adicionar itens da OS ao carrinho
      for (const itemOS of itensOS) {
        // Buscar produto se tiver produto_id
        let produto = null;
        if (itemOS.produto_id) {
          produto = produtos.find(p => p.id === itemOS.produto_id);
        }

        await addItem({
          produto_id: itemOS.produto_id || undefined,
          produto_nome: itemOS.descricao,
          produto_tipo: itemOS.tipo === 'peca' ? 'produto' : 'produto',
          quantidade: Number(itemOS.quantidade) || 1,
          valor_unitario: Number(itemOS.valor_unitario) || 0,
          desconto: Number(itemOS.desconto || 0),
          observacao: `OS #${os.numero}`,
        }, novaVenda.id);
      }

      toast({
        title: 'OS importada com sucesso!',
        description: `OS #${os.numero} foi importada para o PDV.`,
      });

      // Navegar para editar a venda
      navigate(`/pdv/venda/${novaVenda.id}/editar`);
    } catch (error: any) {
      console.error('Erro ao importar OS:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao importar ordem de serviço.',
        variant: 'destructive',
      });
    }
  }, [getOSById, clientes, produtos, createSale, addItem, navigate, toast]);

  // Importar OS do localStorage se houver
  useEffect(() => {
    if (!isEditing && !id) {
      const osIdParaImportar = localStorage.getItem('pdv_import_os_id');
      const osNumeroParaImportar = localStorage.getItem('pdv_import_os_numero');
      
      if (osIdParaImportar) {
        console.log('[NovaVenda] Importando OS:', osIdParaImportar, 'Número:', osNumeroParaImportar);
        handleImportarOS(osIdParaImportar);
        // Limpar após importar
        localStorage.removeItem('pdv_import_os_id');
        localStorage.removeItem('pdv_import_os_numero');
      }
    }
  }, [isEditing, id, handleImportarOS]);

  // Função auxiliar para normalizar tipo do produto
  const normalizeProdutoTipo = (tipo: any): 'produto' | 'servico' | undefined => {
    if (!tipo) return 'produto';
    const tipoStr = String(tipo).toLowerCase();
    if (tipoStr === 'servico' || tipoStr === 'serviço') return 'servico';
    if (tipoStr === 'produto' || tipoStr === 'peca' || tipoStr === 'peça') return 'produto';
    return 'produto';
  };

  // Carregar itens quando a venda for carregada
  useEffect(() => {
    if (sale && items) {
      const loadItems = async () => {
        console.log('=== CARREGANDO ITENS DA VENDA ===');
        console.log(`Venda ID: ${sale.id}`);
        console.log(`Total de itens no banco: ${items.length}`);
        
        // Função auxiliar para identificar itens duplicados
        const getItemKey = (item: any) => {
          return `${item.produto_id || 'no-id'}_${item.produto_nome}_${item.produto_codigo || 'no-code'}_${item.produto_codigo_barras || 'no-barcode'}`;
        };
        
        // Remover duplicados baseado em chave única
        const uniqueItems = items.reduce((acc: any[], item) => {
          const key = getItemKey(item);
          const existing = acc.find(i => getItemKey(i) === key);
          
          if (!existing) {
            acc.push(item);
          } else {
            // Se já existe, verificar se este é mais recente ou tem mais informações
            if (item.id > existing.id || (item.produto_id && !existing.produto_id)) {
              const index = acc.indexOf(existing);
              acc[index] = item;
            }
          }
          return acc;
        }, []);
        
        if (uniqueItems.length !== items.length) {
          console.warn(`⚠️ DUPLICAÇÃO DETECTADA: ${items.length} itens no banco, ${uniqueItems.length} únicos`);
          // Remover duplicados do banco
          const duplicates = items.filter(item => {
            const key = getItemKey(item);
            const firstIndex = items.findIndex(i => getItemKey(i) === key);
            return items.indexOf(item) !== firstIndex;
          });
          
          console.log(`Removendo ${duplicates.length} itens duplicados do banco...`);
          for (const dup of duplicates) {
            try {
              await removeItem(dup.id);
            } catch (error) {
              console.error(`Erro ao remover item duplicado ${dup.id}:`, error);
            }
          }
        }
        
        const cartItems = uniqueItems.map(item => {
          const quantidade = Number(item.quantidade) || 1;
          const valorUnitario = Number(item.valor_unitario) || 0;
          const desconto = Number(item.desconto || 0);
          const total = (valorUnitario * quantidade) - desconto;
          
          console.log(`Item: ${item.produto_nome} (ID: ${item.id})`);
          console.log(`  Quantidade: ${quantidade}`);
          console.log(`  Valor Unitário: ${currencyFormatters.brl(valorUnitario)}`);
          console.log(`  Desconto: ${currencyFormatters.brl(desconto)}`);
          console.log(`  Total: ${currencyFormatters.brl(total)}`);
          
          return {
            produto_id: item.produto_id || undefined,
            produto_nome: item.produto_nome,
            produto_codigo: item.produto_codigo || undefined,
            produto_codigo_barras: item.produto_codigo_barras || undefined,
            produto_tipo: normalizeProdutoTipo(item.produto_tipo),
            quantidade: quantidade,
            valor_unitario: valorUnitario,
            desconto: desconto,
            observacao: item.observacao || undefined,
            garantia_dias: item.garantia_dias || undefined,
          };
        });
        
        const subtotalCalculado = cartItems.reduce((sum, item) => 
          sum + (item.valor_unitario * item.quantidade), 0
        );
        console.log(`Subtotal calculado: ${currencyFormatters.brl(subtotalCalculado)}`);
        console.log(`Subtotal da venda: ${currencyFormatters.brl(sale.subtotal || 0)}`);
        
        setCart(cartItems);
        
        if (sale.cliente_id) {
          const cliente = clientes.find(c => c.id === sale.cliente_id);
          if (cliente) setSelectedCliente(cliente);
        }
        
        setObservacoes(sale.observacoes || '');
        setDescontoTotal(Number(sale.desconto_total || 0));
      };
      
      loadItems();
    }
  }, [sale, items, clientes, removeItem]);

  const loadSale = async () => {
    if (!id) return;
    const loadedSale = await getSaleById(id);
    if (loadedSale) {
      setSale(loadedSale);
      
      // Se a venda foi cancelada, redirecionar para a lista
      if (loadedSale.status === 'canceled') {
        toast({
          title: 'Venda cancelada',
          description: 'Esta venda foi cancelada e não pode ser editada.',
          variant: 'destructive',
        });
        navigate('/pdv/vendas');
        return;
      }
    }
  };

  // Carregar OSs finalizadas com produtos para faturar
  const loadOSParaFaturar = async () => {
    setIsLoadingOS(true);
    try {
      console.log('Carregando OSs para faturar do localStorage...');
      
      // Buscar apenas do localStorage (sistema atual - sem banco ainda)
      const ordensFromStorage = ordens.filter(os => os.status === 'finalizada');
      console.log(`Encontradas ${ordensFromStorage.length} OSs finalizadas no localStorage`);

      // Verificar quais OSs já foram faturadas (verificando se há venda vinculada)
      let osFaturadas = new Set<string>();
      try {
        const { data: vendasComOS } = await from('sales')
          .select('ordem_servico_id')
          .not('ordem_servico_id', 'is', null)
          .execute();
        
        if (vendasComOS) {
          osFaturadas = new Set(vendasComOS.map((v: any) => v.ordem_servico_id));
        }
      } catch (error) {
        // Se der erro ao buscar vendas, continuar sem filtrar
        console.warn('Não foi possível verificar OSs faturadas:', error);
      }

      // Para cada OS, buscar seus itens do localStorage
      const ordensComProdutos = ordensFromStorage
        .filter(os => {
          // Verificar se já foi faturada
          if (osFaturadas.has(os.id)) {
            console.log(`OS #${os.numero} já foi faturada, ignorando...`);
            return false;
          }
          return true;
        })
        .map(os => {
          // Buscar itens do localStorage
          const itens = todosItensOS.filter(item => 
            (item.ordem_servico_id === os.id || item.os_id === os.id) &&
            (item.tipo === 'peca' || item.tipo === 'produto')
          );
          
          console.log(`OS #${os.numero}: ${itens.length} produtos encontrados`);
          return { ...os, itens };
        })
        .filter(os => {
          // Filtrar apenas OSs que tenham produtos
          const itens = os.itens || [];
          const temProdutos = itens.some((item: any) => 
            item.tipo === 'peca' || item.tipo === 'produto'
          );
          if (!temProdutos) {
            console.log(`OS #${os.numero} não tem produtos, ignorando...`);
          }
          return temProdutos;
        });

      console.log(`Total de OSs com produtos para faturar: ${ordensComProdutos.length}`);
      setOsList(ordensComProdutos);
    } catch (error: any) {
      console.error('Erro ao carregar OSs:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao carregar ordens de serviço.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingOS(false);
    }
  };

  // Abrir modal de faturar OS
  const handleOpenFaturarOSModal = () => {
    setShowFaturarOSModal(true);
    loadOSParaFaturar();
  };

  // Faturar OS selecionada
  const handleFaturarOS = async (os: any) => {
    try {
      setIsLoadingOS(true);

      // Buscar itens da OS apenas do localStorage (sistema atual - sem banco ainda)
      console.log(`Buscando itens da OS #${os.numero} do localStorage...`);
      const itensOS = todosItensOS.filter(item => 
        (item.ordem_servico_id === os.id || item.os_id === os.id) &&
        (item.tipo === 'peca' || item.tipo === 'produto')
      );
      
      console.log(`Encontrados ${itensOS.length} itens para a OS #${os.numero}`);

      if (!itensOS || itensOS.length === 0) {
        toast({
          title: 'OS sem produtos',
          description: 'Esta OS não possui produtos para faturar.',
          variant: 'destructive',
        });
        return;
      }

      // Buscar cliente do localStorage (sistema atual)
      const cliente = clientes.find(c => c.id === os.cliente_id);

      // Criar venda vinculada à OS
      const novaVenda = await createSale({
        cliente_id: os.cliente_id || null,
        cliente_nome: os.cliente_nome || cliente?.nome || 'Cliente não informado',
        cliente_cpf_cnpj: cliente?.cpf_cnpj || null,
        cliente_telefone: os.telefone_contato || cliente?.telefone || null,
        ordem_servico_id: os.id,
        is_draft: true,
        observacoes: `Faturamento da OS #${os.numero}`,
      });

      // Adicionar produtos da OS ao carrinho
      console.log('=== FATURAR OS - DETALHES DOS ITENS ===');
      
      // Primeiro, verificar se já existem itens na venda (para evitar duplicação)
      const { data: existingItems } = await from('sale_items')
        .select('*')
        .eq('sale_id', novaVenda.id)
        .execute();
      
      console.log(`Itens já existentes na venda: ${existingItems?.length || 0}`);
      
      // Função auxiliar para verificar se item já existe
      const itemExists = (itemOS: any, existing: any[]): boolean => {
        return existing.some(existingItem => {
          // Comparar por produto_id se ambos tiverem
          if (itemOS.produto_id && existingItem.produto_id) {
            return itemOS.produto_id === existingItem.produto_id;
          }
          // Comparar por nome
          return existingItem.produto_nome === itemOS.descricao;
        });
      };
      
      let itemsAdded = 0;
      let itemsSkipped = 0;
      
      for (const itemOS of itensOS) {
        // Verificar se item já existe antes de adicionar
        if (existingItems && itemExists(itemOS, existingItems)) {
          console.log(`⚠️ Item já existe, pulando: ${itemOS.descricao}`);
          itemsSkipped++;
          continue;
        }
        
        const quantidade = Number(itemOS.quantidade) || 1;
        const valorUnitario = Number(itemOS.valor_unitario) || 0;
        const desconto = Number(itemOS.desconto || 0);
        
        console.log(`Adicionando item: ${itemOS.descricao}`);
        console.log(`  Quantidade: ${quantidade}`);
        console.log(`  Valor Unitário: ${currencyFormatters.brl(valorUnitario)}`);
        console.log(`  Desconto: ${currencyFormatters.brl(desconto)}`);
        console.log(`  Total: ${currencyFormatters.brl((valorUnitario * quantidade) - desconto)}`);
        
        try {
          await addItem({
            produto_id: itemOS.produto_id || undefined,
            produto_nome: itemOS.descricao,
            produto_tipo: itemOS.tipo === 'peca' ? 'produto' : 'produto',
            quantidade: quantidade,
            valor_unitario: valorUnitario,
            desconto: desconto,
            observacao: `OS #${os.numero}`,
          }, novaVenda.id);
          itemsAdded++;
          
          // Atualizar lista de itens existentes para próxima iteração
          if (existingItems) {
            existingItems.push({
              produto_id: itemOS.produto_id || null,
              produto_nome: itemOS.descricao,
            } as any);
          }
        } catch (error) {
          console.error(`Erro ao adicionar item ${itemOS.descricao}:`, error);
        }
      }
      
      console.log(`=== RESUMO: ${itemsAdded} adicionados, ${itemsSkipped} pulados (já existiam) ===`);

      // A OS será marcada como faturada automaticamente quando a venda for finalizada
      // através da função fatura_os_from_sale no trigger

      toast({
        title: 'OS faturada com sucesso!',
        description: `OS #${os.numero} foi vinculada à venda #${novaVenda.numero}`,
      });

      setShowFaturarOSModal(false);
      navigate(`/pdv/venda/${novaVenda.id}/editar`);
    } catch (error: any) {
      console.error('Erro ao faturar OS:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao faturar ordem de serviço.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingOS(false);
    }
  };

  // Buscar produtos
  useEffect(() => {
    if (productSearch.length >= 2) {
      const results = searchProdutos(productSearch);
      setProductResults(results.slice(0, 10));
      setShowProductSearch(true);
    } else {
      setProductResults([]);
      setShowProductSearch(false);
    }
  }, [productSearch, searchProdutos]);

  // Buscar clientes
  useEffect(() => {
    if (clienteSearch.length >= 2) {
      const results = searchClientes(clienteSearch);
      setClienteResults(results.slice(0, 10));
      setShowClienteSearch(true);
    } else {
      setClienteResults([]);
      setShowClienteSearch(false);
    }
  }, [clienteSearch, searchClientes]);

  // Focar no campo de busca ao montar
  useEffect(() => {
    if (searchInputRef.current && !isEditing) {
      searchInputRef.current.focus();
    }
  }, [isEditing]);

  // Calcular totais (movido para antes de handleFinalize)
  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => 
      sum + (item.valor_unitario * item.quantidade), 0
    );
    const descontoItens = cart.reduce((sum, item) => sum + (item.desconto || 0), 0);
    const total = subtotal - descontoItens - descontoTotal;
    
    return {
      subtotal,
      descontoItens,
      descontoTotal,
      total: Math.max(0, total),
    };
  }, [cart, descontoTotal]);

  // Função auxiliar para validar UUID
  const isValidUUID = (str: string | undefined | null): boolean => {
    if (!str) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Finalizar venda
  const handleFinalize = useCallback(async () => {
    if (cart.length === 0) {
      toast({ title: 'Adicione pelo menos um item ao carrinho', variant: 'destructive' });
      return;
    }

    // Validar se o caixa está aberto
    if (!cashSession || cashSession.status !== 'open') {
      toast({ 
        title: 'Caixa fechado', 
        description: 'É necessário abrir o caixa antes de realizar vendas.',
        variant: 'destructive' 
      });
      navigate('/pdv/caixa');
      return;
    }

    // Para vendas existentes, validar pagamentos antes de finalizar
    if (isEditing && id) {
      const confirmedPayments = payments.filter(p => p.status === 'confirmed');
      if (confirmedPayments.length === 0) {
        toast({ 
          title: 'Forma de pagamento obrigatória', 
          description: 'É necessário adicionar pelo menos uma forma de pagamento antes de finalizar a venda.',
          variant: 'destructive' 
        });
        setShowCheckout(true); // Abrir modal de pagamento
        return;
      }

      // Validar se o total pago é maior que zero
      const totalPago = confirmedPayments.reduce((sum, p) => sum + Number(p.valor || 0), 0);
      if (totalPago <= 0) {
        toast({ 
          title: 'Valor de pagamento inválido', 
          description: 'O valor total dos pagamentos deve ser maior que zero.',
          variant: 'destructive' 
        });
        setShowCheckout(true); // Abrir modal de pagamento
        return;
      }
    }

    setIsSaving(true);
    try {
      if (!isEditing || !id) {
        // Criar venda primeiro como rascunho
        const newSale = await createSale({
          cliente_id: selectedCliente?.id && isValidUUID(selectedCliente.id) ? selectedCliente.id : undefined,
          cliente_nome: selectedCliente?.nome,
          cliente_cpf_cnpj: selectedCliente?.cpf_cnpj,
          cliente_telefone: selectedCliente?.telefone || selectedCliente?.whatsapp,
          observacoes,
          is_draft: true, // Criar como rascunho primeiro
        });

        // Adicionar itens
        for (const cartItem of cart) {
          await addItem(cartItem, newSale.id);
        }

        // Atualizar valores da venda
        await updateSale(newSale.id, {
          subtotal: totals.subtotal,
          desconto_total: totals.descontoTotal,
          total: totals.total,
        });

        // Redirecionar para a página da venda e abrir modal de pagamento
        navigate(`/pdv/venda/${newSale.id}`);
        setShowCheckout(true);
        setIsSaving(false);
        toast({ 
          title: 'Venda criada', 
          description: 'Adicione a forma de pagamento para finalizar a venda.',
        });
        return;
      }

      // Para vendas existentes, atualizar itens - IMPORTANTE: não adicionar itens que já existem no banco
        console.log('=== FINALIZAR VENDA - VERIFICANDO ITENS ===');
        console.log(`Itens no carrinho: ${cart.length}`);
        console.log(`Itens no banco: ${items.length}`);
        
        // Função auxiliar para comparar itens
        const itemsMatch = (item1: any, item2: any): boolean => {
          // Se ambos têm produto_id, comparar por isso (mais confiável)
          if (item1.produto_id && item2.produto_id) {
            return item1.produto_id === item2.produto_id;
          }
          // Se ambos têm código de barras, comparar por isso
          if (item1.produto_codigo_barras && item2.produto_codigo_barras) {
            return item1.produto_codigo_barras === item2.produto_codigo_barras;
          }
          // Se ambos têm código, comparar por isso
          if (item1.produto_codigo && item2.produto_codigo) {
            return item1.produto_codigo === item2.produto_codigo;
          }
          // Último recurso: comparar por nome (menos confiável)
          return item1.produto_nome === item2.produto_nome;
        };
        
        // Primeiro, remover itens que não estão mais no carrinho
        for (const item of items) {
          const stillInCart = cart.some(cartItem => itemsMatch(item, cartItem));
          
          if (!stillInCart) {
            console.log(`Removendo item do banco: ${item.produto_nome}`);
            await removeItem(item.id);
          }
        }

        // Adicionar/atualizar apenas itens que realmente mudaram ou não existem
        for (const cartItem of cart) {
          // Buscar item existente usando a função de comparação
          const existingItem = items.find(i => itemsMatch(i, cartItem));

          if (existingItem) {
            // Verificar se realmente mudou antes de atualizar
            const hasChanged = 
              Math.abs(existingItem.quantidade - cartItem.quantidade) > 0.001 ||
              Math.abs(existingItem.valor_unitario - cartItem.valor_unitario) > 0.01 ||
              Math.abs((existingItem.desconto || 0) - (cartItem.desconto || 0)) > 0.01;
            
            if (hasChanged) {
              console.log(`Atualizando item: ${cartItem.produto_nome}`);
              await updateItem(existingItem.id, cartItem);
            } else {
              console.log(`Item já existe e não mudou: ${cartItem.produto_nome} (ID: ${existingItem.id})`);
            }
          } else {
            console.log(`Adicionando novo item: ${cartItem.produto_nome}`);
            await addItem(cartItem, id);
          }
        }

        // Atualizar valores da venda antes de finalizar
        await updateSale(id, {
          subtotal: totals.subtotal,
          desconto_total: totals.descontoTotal,
          total: totals.total,
        });

        // Validar se há pelo menos um pagamento confirmado
        const confirmedPayments = payments.filter(p => p.status === 'confirmed');
        if (confirmedPayments.length === 0) {
          toast({ 
            title: 'Forma de pagamento obrigatória', 
            description: 'É necessário adicionar pelo menos uma forma de pagamento antes de finalizar a venda.',
            variant: 'destructive' 
          });
          setShowCheckout(true); // Abrir modal de pagamento
          setIsSaving(false);
          return;
        }

        // Validar se o total pago é maior que zero
        const totalPago = confirmedPayments.reduce((sum, p) => sum + Number(p.valor || 0), 0);
        if (totalPago <= 0) {
          toast({ 
            title: 'Valor de pagamento inválido', 
            description: 'O valor total dos pagamentos deve ser maior que zero.',
            variant: 'destructive' 
          });
          setShowCheckout(true); // Abrir modal de pagamento
          setIsSaving(false);
          return;
        }

        // Finalizar
        await finalizeSale(id);
        toast({ title: 'Venda finalizada com sucesso!' });
        setShowCheckout(true);
    } catch (error: any) {
      console.error('Erro ao finalizar venda:', error);
      toast({ 
        title: 'Erro ao finalizar venda', 
        description: error.message || 'Não foi possível finalizar a venda.',
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  }, [cart, isEditing, id, selectedCliente, observacoes, totals, items, payments, createSale, addItem, updateSale, finalizeSale, removeItem, updateItem, navigate, toast, setShowCheckout, setIsSaving, cashSession]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2 - Buscar produto
      if (e.key === 'F2' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
          // Garantir que o campo de busca está visível
          setShowProductSearch(true);
        }
      }
      
      // F4 - Finalizar venda
      if (e.key === 'F4' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        if (cart.length > 0 && !isSaving) {
          handleFinalize();
        }
      }
      
      // ESC - Fechar modais
      if (e.key === 'Escape') {
        setShowProductSearch(false);
        setShowClienteSearch(false);
        setShowCheckout(false);
      }
    };

    // Adicionar listener com capture para garantir que seja capturado antes de outros handlers
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [cart, handleFinalize, isSaving]);

  // Adicionar produto ao carrinho
  const handleAddProduct = (produto: any) => {
    const existingItem = cart.find(item => 
      item.produto_id === produto.id || 
      item.produto_nome === produto.descricao
    );

    if (existingItem) {
      setCart(cart.map(item =>
        item === existingItem
          ? { ...item, quantidade: item.quantidade + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        produto_id: produto.id && isValidUUID(produto.id) ? produto.id : undefined,
        produto_nome: produto.descricao || '',
        produto_codigo: produto.codigo?.toString(),
        produto_codigo_barras: produto.codigo_barras,
        produto_tipo: normalizeProdutoTipo(produto.tipo),
        quantidade: 1,
        valor_unitario: produto.preco_venda || 0,
        desconto: 0,
      }]);
    }

    setProductSearch('');
    setShowProductSearch(false);
    searchInputRef.current?.focus();
  };

  // Atualizar quantidade
  const handleUpdateQuantity = (index: number, delta: number) => {
    setCart(cart.map((item, i) =>
      i === index
        ? { ...item, quantidade: Math.max(0.001, item.quantidade + delta) }
        : item
    ));
  };

  // Remover item
  const handleRemoveItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Atualizar desconto do item
  const handleUpdateItemDiscount = (index: number, desconto: number) => {
    setCart(cart.map((item, i) =>
      i === index
        ? { ...item, desconto: Math.max(0, Math.min(desconto, item.valor_unitario * item.quantidade)) }
        : item
    ));
  };

  // Selecionar cliente
  const handleSelectCliente = (cliente: any) => {
    setSelectedCliente(cliente);
    setClienteSearch(cliente.nome);
    setShowClienteSearch(false);
  };

  // Salvar rascunho
  const handleSaveDraft = async () => {
    try {
      setIsSaving(true);
      
      if (isEditing && id) {
        // Atualizar venda existente
        await updateSale(id, {
          cliente_id: selectedCliente?.id && isValidUUID(selectedCliente.id) ? selectedCliente.id : undefined,
          cliente_nome: selectedCliente?.nome,
          cliente_cpf_cnpj: selectedCliente?.cpf_cnpj,
          cliente_telefone: selectedCliente?.telefone || selectedCliente?.whatsapp,
          observacoes,
          is_draft: true,
          subtotal: totals.subtotal,
          desconto_total: totals.descontoTotal,
          total: totals.total,
        });

        // Atualizar itens
        const currentItemIds = items.map(i => i.id);
        const cartItemIds = cart.map((_, i) => `temp-${i}`);

        // Remover itens que não estão mais no carrinho
        for (const item of items) {
          if (!cart.some((c, i) => c.produto_id === item.produto_id && c.produto_nome === item.produto_nome)) {
            await removeItem(item.id);
          }
        }

        // Adicionar/atualizar itens
        for (const cartItem of cart) {
          const existingItem = items.find(i => 
            i.produto_id === cartItem.produto_id && 
            i.produto_nome === cartItem.produto_nome
          );

          if (existingItem) {
            await updateItem(existingItem.id, cartItem);
          } else {
            await addItem(cartItem);
          }
        }

        toast({ title: 'Rascunho salvo com sucesso!' });
      } else {
        // Criar nova venda
        const newSale = await createSale({
          cliente_id: selectedCliente?.id && isValidUUID(selectedCliente.id) ? selectedCliente.id : undefined,
          cliente_nome: selectedCliente?.nome,
          cliente_cpf_cnpj: selectedCliente?.cpf_cnpj,
          cliente_telefone: selectedCliente?.telefone || selectedCliente?.whatsapp,
          observacoes,
          is_draft: true,
        });

        // Adicionar itens
        for (const cartItem of cart) {
          await addItem(cartItem, newSale.id);
        }

        // Atualizar valores da venda
        await updateSale(newSale.id, {
          subtotal: totals.subtotal,
          desconto_total: totals.descontoTotal,
          total: totals.total,
        });

        toast({ title: 'Rascunho salvo com sucesso!' });
        navigate(`/pdv/venda/${newSale.id}/editar`);
      }
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
      toast({ title: 'Erro ao salvar rascunho', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };


  // Excluir venda
  const handleDelete = async () => {
    if (!isEditing || !id) {
      return;
    }

    const confirmMessage = sale?.is_draft
      ? 'Tem certeza que deseja excluir este rascunho? Esta ação não pode ser desfeita.'
      : 'Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita e irá reverter estoque e cancelar contas a receber.';

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsDeleting(true);
    try {
      // Se for rascunho, excluir normalmente
      // Se for venda finalizada, usar force=true (apenas admin pode)
      await deleteSale(id, !sale?.is_draft && isAdmin);
      toast({ title: sale?.is_draft ? 'Rascunho excluído com sucesso!' : 'Venda excluída com sucesso!' });
      navigate('/pdv/vendas');
    } catch (error: any) {
      console.error('Erro ao excluir rascunho:', error);
      toast({ 
        title: 'Erro ao excluir rascunho', 
        description: error.message || 'Não foi possível excluir o rascunho.',
        variant: 'destructive' 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Adicionar pagamento
  const handleAddPayment = async () => {
    if (!id) return;
    
    try {
      const payment = await addPayment(checkoutPayment);
      await confirmPayment(payment.id);
      
      toast({ title: 'Pagamento adicionado com sucesso!' });
      
      // Recarregar dados para atualizar saldo restante
      await loadSale();
      
      // Resetar formulário mas manter modal aberto
      setCheckoutPayment({
        forma_pagamento: 'dinheiro',
        valor: undefined,
        troco: 0,
      });
      
      // Verificar se está totalmente pago e finalizar automaticamente
      const updatedSale = await getSaleById(id);
      if (updatedSale && Number(updatedSale.total_pago) >= Number(updatedSale.total)) {
        // Finalizar a venda automaticamente
        try {
          await finalizeSale(id);
          toast({ title: 'Venda finalizada com sucesso!' });
          setShowCheckout(false);
          
          // Aguardar carregar items e payments antes de imprimir
          setPendingSaleForCupom(updatedSale);
          // Aguardar um pouco mais para garantir que items e payments estejam carregados
          setTimeout(async () => {
            await loadSale();
            setTimeout(async () => {
              // Recarregar sale novamente para garantir dados atualizados
              const finalSale = await getSaleById(id);
              if (finalSale && items && payments && payments.length > 0) {
                console.log('[IMPRESSÃO] Iniciando impressão automática...', { 
                  saleId: finalSale.id,
                  itemsCount: items.length,
                  paymentsCount: payments.length
                });
                await handlePrintCupomDirect(finalSale);
                setTimeout(() => {
                  limparPDV();
                  toast({ title: 'PDV limpo. Pronto para nova venda!' });
                }, 2000);
              } else {
                console.warn('[IMPRESSÃO] Dados não carregados para impressão:', { 
                  sale: !!finalSale, 
                  items: !!items, 
                  payments: !!payments,
                  itemsCount: items?.length,
                  paymentsCount: payments?.length
                });
              }
            }, 800);
          }, 1200);
        } catch (error: any) {
          console.error('Erro ao finalizar venda automaticamente:', error);
          toast({ 
            title: 'Pagamento adicionado, mas erro ao finalizar', 
            description: error.message || 'Finalize manualmente a venda.',
            variant: 'destructive' 
          });
        }
      }
    } catch (error) {
      console.error('Erro ao adicionar pagamento:', error);
      toast({ title: 'Erro ao adicionar pagamento', variant: 'destructive' });
    }
  };

  // Limpar PDV para nova venda
  const limparPDV = () => {
    setCart([]);
    setSelectedCliente(null);
    setClienteSearch('');
    setProductSearch('');
    setObservacoes('');
    setDescontoTotal(0);
    setShowProductSearch(false);
    setShowClienteSearch(false);
    setShowCheckout(false);
    setCheckoutPayment({
      forma_pagamento: 'dinheiro',
      valor: undefined,
      troco: 0,
    });
    // Focar no campo de busca
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  // Confirmar emissão de cupom - SEMPRE imprime direto
  const handleConfirmEmitCupom = async () => {
    setShowEmitirCupomDialog(false);
    
    if (pendingSaleForCupom) {
      try {
        // Recarregar dados da venda para ter items e payments atualizados
        await loadSale();
        // Aguardar um pouco para garantir que os dados foram carregados
        setTimeout(async () => {
          if (sale && items && payments) {
            // SEMPRE imprime direto, sem perguntar
            await handlePrintCupomDirect(pendingSaleForCupom);
            // Aguardar impressão e limpar PDV
            setTimeout(() => {
              limparPDV();
              toast({ title: 'PDV limpo. Pronto para nova venda!' });
            }, 1500);
          } else {
            // Se não tiver dados, apenas limpar
            limparPDV();
          }
        }, 500);
      } catch (error) {
        console.error('Erro ao emitir cupom:', error);
        toast({ title: 'Erro ao emitir cupom', variant: 'destructive' });
        // Limpar mesmo em caso de erro
        limparPDV();
      }
    } else {
      // Se não tiver venda pendente, apenas limpar
      limparPDV();
    }
    
    setPendingSaleForCupom(null);
  };

  // Imprimir cupom térmico (com janela)
  const handlePrintCupom = async () => {
    if (!sale || !items || !payments) return;

    try {
      const cupomData = {
        numero: sale.numero,
        data: new Date(sale.created_at).toLocaleDateString('pt-BR'),
        hora: new Date(sale.created_at).toLocaleTimeString('pt-BR'),
        empresa: {
          nome: 'PRIME CAMP', // TODO: Buscar de configuração
          cnpj: '31.833.574/0001-74', // TODO: Buscar de configuração
          endereco: undefined, // TODO: Buscar de configuração
          telefone: undefined, // TODO: Buscar de configuração
        },
        cliente: sale.cliente_nome ? {
          nome: sale.cliente_nome,
          cpf_cnpj: sale.cliente_cpf_cnpj || undefined,
          telefone: sale.cliente_telefone || undefined,
        } : undefined,
        itens: items.map(item => ({
          nome: item.produto_nome,
          quantidade: Number(item.quantidade),
          valor_unitario: Number(item.valor_unitario),
          desconto: Number(item.desconto || 0),
          valor_total: Number(item.valor_total),
        })),
        subtotal: Number(sale.subtotal),
        desconto_total: Number(sale.desconto_total),
        total: Number(sale.total),
        pagamentos: payments
          .filter(p => p.status === 'confirmed')
          .map(p => ({
            forma: p.forma_pagamento,
            valor: Number(p.valor),
            troco: p.troco ? Number(p.troco) : undefined,
          })),
        vendedor: sale.vendedor_nome || undefined,
        observacoes: sale.observacoes || undefined,
      };

      // Gerar QR code com URL para 2ª via do cupom
      const qrCodeData = `${window.location.origin}/cupom/${sale.id}`;
      const html = await generateCupomTermica(cupomData, qrCodeData, cupomConfig || undefined);
      printTermica(html);
    } catch (error) {
      console.error('Erro ao gerar cupom:', error);
      toast({ title: 'Erro ao gerar cupom', variant: 'destructive' });
    }
  };

  // Imprimir cupom térmico diretamente (sem abrir janela)
  const handlePrintCupomDirect = async (saleData?: any) => {
    try {
      const saleToUse = saleData || sale;
      if (!saleToUse || !items || !payments) {
        console.error('Dados insuficientes para imprimir cupom:', { saleToUse, items, payments });
        return;
      }
      const cupomData = {
        numero: saleToUse.numero,
        data: new Date(saleToUse.created_at).toLocaleDateString('pt-BR'),
        hora: new Date(saleToUse.created_at).toLocaleTimeString('pt-BR'),
        empresa: {
          nome: 'PRIME CAMP',
          cnpj: '31.833.574/0001-74',
          endereco: undefined,
          telefone: undefined,
        },
        cliente: saleToUse.cliente_nome ? {
          nome: saleToUse.cliente_nome,
          cpf_cnpj: saleToUse.cliente_cpf_cnpj || undefined,
          telefone: saleToUse.cliente_telefone || undefined,
        } : undefined,
        itens: items.map(item => ({
          codigo: item.produto_codigo || item.produto_codigo_barras || undefined,
          nome: item.produto_nome,
          quantidade: Number(item.quantidade),
          valor_unitario: Number(item.valor_unitario),
          desconto: Number(item.desconto || 0),
          valor_total: Number(item.valor_total),
        })),
        subtotal: Number(saleToUse.subtotal),
        desconto_total: Number(saleToUse.desconto_total),
        total: Number(saleToUse.total),
        pagamentos: payments
          .filter(p => p.status === 'confirmed')
          .map(p => ({
            forma: p.forma_pagamento,
            valor: Number(p.valor),
            troco: p.troco ? Number(p.troco) : undefined,
            parcelas: p.parcelas || undefined,
            valor_parcela: p.parcelas && p.parcelas > 1 ? Number(p.valor) / p.parcelas : undefined,
          })),
        vendedor: saleToUse.vendedor_nome || undefined,
        observacoes: saleToUse.observacoes || undefined,
      };

      // Gerar QR code com URL para 2ª via do cupom
      const qrCodeData = `${window.location.origin}/cupom/${saleToUse.id}`;
      const html = await generateCupomTermica(cupomData, qrCodeData, cupomConfig || undefined);
      
      const imprimirSemDialogo = cupomConfig?.imprimir_sem_dialogo !== false; // Default true
      const imprimir2Vias = cupomConfig?.imprimir_2_vias === true;
      
      console.log('[IMPRESSÃO] Configurações:', { imprimirSemDialogo, imprimir2Vias, cupomConfig });
      
      const printCupom = () => {
        return new Promise<void>((resolve) => {
          // Impressão direta sem abrir janela
          const printFrame = document.createElement('iframe');
          printFrame.style.position = 'fixed';
          printFrame.style.right = '0';
          printFrame.style.bottom = '0';
          printFrame.style.width = '0';
          printFrame.style.height = '0';
          printFrame.style.border = '0';
          document.body.appendChild(printFrame);
          
          const printDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
          if (printDoc) {
            printDoc.open();
            printDoc.write(html);
            printDoc.close();
            
            // Aguardar carregamento e imprimir
            setTimeout(() => {
              try {
                printFrame.contentWindow?.focus();
                // Imprimir diretamente - navegadores podem mostrar diálogo
                printFrame.contentWindow?.print();
                console.log('[IMPRESSÃO] Comando de impressão enviado');
                
                // Remover iframe após impressão
                setTimeout(() => {
                  try {
                    if (printFrame.parentNode) {
                      document.body.removeChild(printFrame);
                    }
                  } catch (e) {
                    console.error('Erro ao remover iframe:', e);
                  }
                  resolve();
                }, 2000);
              } catch (e) {
                console.error('Erro ao imprimir:', e);
                toast({ title: 'Erro ao imprimir cupom', variant: 'destructive' });
                resolve();
              }
            }, 1000); // Delay para garantir que HTML está totalmente carregado
          } else {
            resolve();
          }
        });
      };
      
      // Imprimir primeira via
      console.log('[IMPRESSÃO] Iniciando impressão da primeira via');
      await printCupom();
      console.log('[IMPRESSÃO] Primeira via impressa');
      
      // Se configurado para 2 vias, imprimir novamente após um delay
      if (imprimir2Vias) {
        console.log('[IMPRESSÃO] Configurado para 2 vias, aguardando 3 segundos para imprimir segunda via');
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('[IMPRESSÃO] Iniciando impressão da segunda via');
        await printCupom();
        console.log('[IMPRESSÃO] Segunda via impressa com sucesso');
      } else {
        console.log('[IMPRESSÃO] Apenas 1 via configurada (imprimir_2_vias = false)');
      }
    } catch (error) {
      console.error('Erro ao gerar cupom:', error);
      toast({ title: 'Erro ao gerar cupom', variant: 'destructive' });
    }
  };

  // Enviar por WhatsApp
  const handleSendWhatsApp = () => {
    if (!sale || !items || !payments || !selectedCliente?.whatsapp) {
      toast({ 
        title: 'Cliente não possui WhatsApp cadastrado', 
        variant: 'destructive' 
      });
      return;
    }

    const message = formatVendaMessage({
      numero: sale.numero,
      data: new Date(sale.created_at).toLocaleDateString('pt-BR'),
      total: Number(sale.total),
      cliente: sale.cliente_nome || undefined,
      itens: items.map(item => ({
        nome: item.produto_nome,
        quantidade: Number(item.quantidade),
        valor_total: Number(item.valor_total),
      })),
      pagamentos: payments
        .filter(p => p.status === 'confirmed')
        .map(p => ({
          forma: p.forma_pagamento,
          valor: Number(p.valor),
        })),
    });

    openWhatsApp(selectedCliente.whatsapp, message);
  };

  // Salvar PDF
  const handleSavePDF = async () => {
    if (!sale || !items || !payments) return;

    try {
      const cupomData = {
        numero: sale.numero,
        data: new Date(sale.created_at).toLocaleDateString('pt-BR'),
        hora: new Date(sale.created_at).toLocaleTimeString('pt-BR'),
        empresa: {
          nome: 'PRIME CAMP', // TODO: Buscar de configuração
          cnpj: '31.833.574/0001-74', // TODO: Buscar de configuração
          endereco: undefined, // TODO: Buscar de configuração
          telefone: undefined, // TODO: Buscar de configuração
        },
        cliente: sale.cliente_nome ? {
          nome: sale.cliente_nome,
          cpf_cnpj: sale.cliente_cpf_cnpj || undefined,
          telefone: sale.cliente_telefone || undefined,
        } : undefined,
        itens: items.map(item => ({
          nome: item.produto_nome,
          quantidade: Number(item.quantidade),
          valor_unitario: Number(item.valor_unitario),
          desconto: Number(item.desconto || 0),
          valor_total: Number(item.valor_total),
        })),
        subtotal: Number(sale.subtotal),
        desconto_total: Number(sale.desconto_total),
        total: Number(sale.total),
        pagamentos: payments
          .filter(p => p.status === 'confirmed')
          .map(p => ({
            forma: p.forma_pagamento,
            valor: Number(p.valor),
            troco: p.troco ? Number(p.troco) : undefined,
          })),
        vendedor: sale.vendedor_nome || undefined,
        observacoes: sale.observacoes || undefined,
      };

      // Gerar QR code com URL para 2ª via do cupom
      const qrCodeData = `${window.location.origin}/cupom/${sale.id}`;
      const pdf = await generateCupomPDF(cupomData, qrCodeData);
      pdf.save(`cupom-venda-${sale.numero}.pdf`);
      
      toast({ title: 'PDF salvo com sucesso!' });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    }
  };

  const totalPago = payments
    .filter(p => p.status === 'confirmed')
    .reduce((sum, p) => sum + Number(p.valor), 0);

  const saldoRestante = totals.total - totalPago;

  // ===== FUNÇÕES DE ORÇAMENTO =====
  
  // Gerar orçamento (não afeta estoque, não movimenta caixa)
  const handleGerarOrcamento = async () => {
    if (cart.length === 0) {
      toast({ title: 'Adicione pelo menos um item ao carrinho', variant: 'destructive' });
      return;
    }

    setIsGeneratingOrcamento(true);
    try {
      const novoOrcamento = await createQuote({
        cliente_id: selectedCliente?.id,
        cliente_nome: selectedCliente?.nome,
        cliente_cpf_cnpj: selectedCliente?.cpf_cnpj,
        cliente_telefone: selectedCliente?.telefone || selectedCliente?.whatsapp,
        observacoes,
        validade_dias: 7,
      }, cart);

      setOrcamentoGerado(novoOrcamento);
      setShowOrcamentoModal(true);
      
      toast({ 
        title: 'Orçamento gerado com sucesso!', 
        description: `Orçamento #${novoOrcamento.numero} criado.`,
      });
    } catch (error: any) {
      console.error('Erro ao gerar orçamento:', error);
      toast({ 
        title: 'Erro ao gerar orçamento', 
        description: error.message || 'Não foi possível gerar o orçamento.',
        variant: 'destructive' 
      });
    } finally {
      setIsGeneratingOrcamento(false);
    }
  };

  // Imprimir orçamento como PDF
  const handlePrintOrcamento = async () => {
    if (!orcamentoGerado) return;

    try {
      const orcamentoData: OrcamentoData = {
        numero: orcamentoGerado.numero,
        data: new Date(orcamentoGerado.created_at).toLocaleDateString('pt-BR'),
        hora: new Date(orcamentoGerado.created_at).toLocaleTimeString('pt-BR'),
        validade: orcamentoGerado.data_validade 
          ? new Date(orcamentoGerado.data_validade).toLocaleDateString('pt-BR')
          : undefined,
        empresa: {
          nome: 'PRIME CAMP ASSISTÊNCIA TÉCNICA',
          cnpj: '31.833.574/0001-74',
        },
        cliente: orcamentoGerado.cliente_nome ? {
          nome: orcamentoGerado.cliente_nome,
          cpf_cnpj: orcamentoGerado.cliente_cpf_cnpj || undefined,
          telefone: orcamentoGerado.cliente_telefone || undefined,
        } : undefined,
        itens: cart.map(item => ({
          nome: item.produto_nome,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          desconto: item.desconto || 0,
          valor_total: (item.valor_unitario * item.quantidade) - (item.desconto || 0),
        })),
        subtotal: totals.subtotal,
        desconto_total: totals.descontoItens + totals.descontoTotal,
        total: totals.total,
        vendedor: profile?.display_name || user?.email || undefined,
        observacoes: observacoes || undefined,
        condicoes_pagamento: 'Pagamento à vista ou parcelado. Consulte condições.',
      };

      const pdf = await generateOrcamentoPDF(orcamentoData);
      pdf.save(`orcamento-${orcamentoGerado.numero}.pdf`);
      
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error) {
      console.error('Erro ao gerar PDF do orçamento:', error);
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    }
  };

  // Enviar orçamento por WhatsApp
  const handleEnviarOrcamentoWhatsApp = async () => {
    if (!orcamentoGerado) return;

    const telefone = selectedCliente?.telefone || selectedCliente?.whatsapp;
    if (!telefone) {
      toast({ 
        title: 'Cliente sem telefone', 
        description: 'O cliente não possui telefone cadastrado.',
        variant: 'destructive' 
      });
      return;
    }

    try {
      // Marcar como enviado
      await markAsSentWhatsApp(orcamentoGerado.id);

      // Formatar mensagem do orçamento
      const itensTexto = cart.map(item => 
        `• ${item.produto_nome} (${item.quantidade}x) - ${currencyFormatters.brl((item.valor_unitario * item.quantidade) - (item.desconto || 0))}`
      ).join('\n');

      const mensagem = `Oi ${selectedCliente?.nome?.split(' ')[0] || ''} 👋

Conforme combinamos, segue o orçamento do seu atendimento na *PrimeCamp*:

📋 *Orçamento #${orcamentoGerado.numero}*
📅 Válido até: ${orcamentoGerado.data_validade ? new Date(orcamentoGerado.data_validade).toLocaleDateString('pt-BR') : '7 dias'}

${itensTexto}

💰 *Total: ${currencyFormatters.brl(totals.total)}*

Qualquer dúvida é só me chamar por aqui 😊

_PrimeCamp Assistência Técnica_`;

      openWhatsApp(telefone, mensagem);
      
      toast({ title: 'WhatsApp aberto!', description: 'Envie a mensagem para o cliente.' });
    } catch (error) {
      console.error('Erro ao enviar orçamento por WhatsApp:', error);
      toast({ title: 'Erro ao enviar', variant: 'destructive' });
    }
  };

  // Converter orçamento em venda
  const handleConverterOrcamentoEmVenda = async () => {
    if (!orcamentoGerado) return;

    try {
      const saleId = await convertToSale(orcamentoGerado.id);
      
      toast({ 
        title: 'Orçamento convertido!', 
        description: 'Redirecionando para a venda...',
      });

      setShowOrcamentoModal(false);
      navigate(`/pdv/venda/${saleId}/editar`);
    } catch (error: any) {
      console.error('Erro ao converter orçamento:', error);
      toast({ 
        title: 'Erro ao converter', 
        description: error.message || 'Não foi possível converter o orçamento.',
        variant: 'destructive' 
      });
    }
  };

  // Fechar modal e limpar PDV após orçamento
  const handleFecharOrcamentoModal = (limpar: boolean = false) => {
    setShowOrcamentoModal(false);
    setOrcamentoGerado(null);
    
    if (limpar) {
      limparPDV();
      toast({ title: 'PDV limpo. Pronto para novo atendimento!' });
    }
  };

  return (
    <ModernLayout 
      title={isEditing ? `Venda #${sale?.numero || ''}` : 'Nova Venda'}
      subtitle={isEditing ? 'Editar venda' : 'Criar nova venda'}
    >
      <div className="space-y-3 md:space-y-4">
        {/* Header com ações */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 md:gap-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="h-9 md:h-9 text-xs md:text-sm"
              onClick={() => navigate('/pdv/vendas')}
            >
              Voltar
            </Button>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 md:h-9 text-xs md:text-sm"
                onClick={handleOpenFaturarOSModal}
              >
                <Wrench className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                <span className="hidden md:inline">Faturar OS</span>
              </Button>
            )}
            {isEditing && (
              <Badge variant="outline" className="text-xs">
                {sale?.is_draft ? 'Rascunho' : 'Finalizada'}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isEditing && sale && !sale.is_draft && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 md:h-9 text-xs md:text-sm"
                  onClick={handlePrintCupom}
                >
                  <Printer className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                  <span className="hidden md:inline">Imprimir Cupom</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 md:h-9 text-xs md:text-sm"
                  onClick={handleSavePDF}
                >
                  <Download className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                  <span className="hidden md:inline">Salvar PDF</span>
                </Button>
                {selectedCliente?.whatsapp && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 md:h-9 text-xs md:text-sm"
                    onClick={handleSendWhatsApp}
                  >
                    <Send className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                    <span className="hidden md:inline">Enviar WhatsApp</span>
                  </Button>
                )}
              </>
            )}
            {(!isEditing || sale?.is_draft) && (
              <>
                {/* BOTÃO PRINCIPAL: GERAR ORÇAMENTO */}
                <Button
                  size="sm"
                  className="h-9 md:h-10 text-xs md:text-sm flex-1 md:flex-initial bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md"
                  onClick={handleGerarOrcamento}
                  disabled={cart.length === 0 || isGeneratingOrcamento || isSaving}
                >
                  <FileCheck className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                  <span className="hidden md:inline">{isGeneratingOrcamento ? 'Gerando...' : 'Gerar Orçamento'}</span>
                  <span className="md:hidden">{isGeneratingOrcamento ? 'Gerando...' : 'Orçamento'}</span>
                </Button>

                {/* Salvar Rascunho */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 md:h-10 text-xs md:text-sm"
                  onClick={handleSaveDraft}
                  disabled={isSaving || isDeleting}
                >
                  <Save className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                  <span className="hidden md:inline">{isSaving ? 'Salvando...' : 'Salvar Rascunho'}</span>
                  <span className="md:hidden">{isSaving ? '...' : 'Salvar'}</span>
                </Button>

                {/* Finalizar Venda - Agora secundário */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 md:h-10 text-xs md:text-sm border-blue-300 text-blue-700 hover:bg-blue-50"
                  onClick={handleFinalize}
                  disabled={cart.length === 0 || isSaving || isDeleting}
                >
                  <ShoppingCart className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                  <span className="hidden md:inline">{isSaving ? 'Finalizando...' : 'Finalizar Venda'}</span>
                  <span className="md:hidden">{isSaving ? '...' : 'Venda'}</span>
                </Button>

                {isEditing && (sale?.is_draft || isAdmin) && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-9 md:h-10 text-xs md:text-sm"
                    onClick={handleDelete}
                    disabled={isSaving || isDeleting}
                  >
                    <Trash2 className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                    <span className="hidden md:inline">{isDeleting ? 'Excluindo...' : 'Excluir'}</span>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
          {/* Coluna esquerda - Busca e Cliente */}
          <div className="lg:col-span-2 space-y-3 md:space-y-4">
            {/* Busca de produtos - DESTAQUE PRINCIPAL */}
            <Card className="border-2 border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 shadow-sm">
              <CardHeader className="p-3 md:p-4 pb-0">
                <CardTitle className="text-sm md:text-base flex items-center gap-2 text-emerald-800">
                  <Search className="h-4 w-4" />
                  Buscar Produto (F2)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-4 pt-2">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Digite o nome, código ou código de barras do produto..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && productResults.length > 0) {
                        handleAddProduct(productResults[0]);
                      }
                    }}
                    className="pl-12 h-12 md:h-14 text-base md:text-lg border-2 border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl shadow-sm"
                  />
                  {showProductSearch && productResults.length > 0 && (
                    <div className="absolute z-50 w-full bg-background border rounded shadow-lg max-h-64 overflow-auto mt-1">
                      {productResults.map(produto => (
                        <div
                          key={produto.id}
                          className="p-2 md:p-3 hover:bg-muted cursor-pointer border-b last:border-0 active:bg-muted"
                          onClick={() => handleAddProduct(produto)}
                        >
                          <p className="font-medium text-sm md:text-base">{produto.descricao || ''}</p>
                          <div className="flex items-center justify-between mt-1 gap-2">
                            <p className="text-xs text-muted-foreground truncate">
                              {produto.codigo && `Cód: ${produto.codigo}`}
                              {produto.codigo_barras && ` • Barras: ${produto.codigo_barras}`}
                            </p>
                            <p className="text-xs md:text-sm font-semibold flex-shrink-0">
                              {currencyFormatters.brl(produto.preco_venda || 0)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Cliente */}
            <Card>
              <CardHeader className="p-3 md:p-6">
                <CardTitle className="text-sm md:text-base">Cliente (Opcional)</CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 md:h-4 md:w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar cliente por nome, CPF/CNPJ ou telefone..."
                      value={selectedCliente ? selectedCliente.nome : clienteSearch}
                      onChange={(e) => {
                        if (selectedCliente) {
                          setSelectedCliente(null);
                        }
                        setClienteSearch(e.target.value);
                      }}
                      onFocus={() => setShowClienteSearch(true)}
                      className="pl-9 h-10 md:h-10 text-base"
                    />
                    {selectedCliente && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => {
                          setSelectedCliente(null);
                          setClienteSearch('');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {showClienteSearch && clienteResults.length > 0 && !selectedCliente && (
                    <div className="absolute z-50 w-full bg-background border rounded shadow-lg max-h-48 overflow-auto mt-1">
                      {clienteResults.map(cliente => (
                        <div
                          key={cliente.id}
                          className="p-2 hover:bg-muted cursor-pointer text-sm active:bg-muted"
                          onClick={() => handleSelectCliente(cliente)}
                        >
                          <p className="font-medium text-xs md:text-sm">{cliente.nome}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {cliente.cpf_cnpj} • {cliente.telefone || cliente.whatsapp}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedCliente && (
                    <div className="p-2 md:p-3 bg-muted/50 rounded-md">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm md:text-base truncate">{selectedCliente.nome}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {selectedCliente.cpf_cnpj} • {selectedCliente.telefone || selectedCliente.whatsapp}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 md:h-6 md:w-6 flex-shrink-0"
                          onClick={() => {
                            setSelectedCliente(null);
                            setClienteSearch('');
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Carrinho - com destaque visual */}
            <Card className={cn(
              "border-2 transition-all",
              cart.length === 0 
                ? "border-dashed border-gray-300 bg-gray-50/50" 
                : "border-blue-200 bg-white shadow-sm"
            )}>
              <CardHeader className="p-3 md:p-4 pb-2">
                <CardTitle className="text-sm md:text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShoppingCart className={cn("h-4 w-4", cart.length > 0 ? "text-blue-600" : "text-gray-400")} />
                    Carrinho
                  </span>
                  {cart.length > 0 && (
                    <Badge className="bg-blue-600 text-white">{cart.length} {cart.length === 1 ? 'item' : 'itens'}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-4 pt-0">
                {cart.length === 0 ? (
                  <div className="text-center py-8 md:py-12">
                    <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                      <ShoppingCart className="h-8 w-8 md:h-10 md:w-10 text-gray-400" />
                    </div>
                    <p className="text-base md:text-lg font-medium text-gray-500">Carrinho vazio</p>
                    <p className="text-sm text-gray-400 mt-1">Pressione <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">F2</kbd> para buscar produtos</p>
                  </div>
                ) : (
                  <div className="space-y-2 md:space-y-3">
                    {cart.map((item, index) => (
                      <div key={index} className="border rounded-lg p-2 md:p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="font-medium text-sm md:text-base truncate">{item.produto_nome}</p>
                            {item.produto_codigo && (
                              <p className="text-xs text-muted-foreground">Cód: {item.produto_codigo}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 md:h-6 md:w-6 flex-shrink-0"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
                          <div>
                            <Label className="text-xs">Qtd</Label>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 md:h-7 md:w-7"
                                onClick={() => handleUpdateQuantity(index, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                value={item.quantidade}
                                onChange={(e) => {
                                  const qtd = parseFloat(e.target.value) || 0;
                                  setCart(cart.map((it, i) =>
                                    i === index ? { ...it, quantidade: Math.max(0.001, qtd) } : it
                                  ));
                                }}
                                className="w-14 md:w-16 h-8 md:h-7 text-center text-xs md:text-sm"
                                min="0.001"
                                step="0.001"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 md:h-7 md:w-7"
                                onClick={() => handleUpdateQuantity(index, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Unit.</Label>
                            <Input
                              type="number"
                              value={item.valor_unitario}
                              onChange={(e) => {
                                const valor = parseFloat(e.target.value) || 0;
                                setCart(cart.map((it, i) =>
                                  i === index ? { ...it, valor_unitario: valor } : it
                                ));
                              }}
                              className="h-8 md:h-7 text-xs md:text-sm"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Desconto</Label>
                            <Input
                              type="number"
                              value={item.desconto || 0}
                              onChange={(e) => {
                                const desconto = parseFloat(e.target.value) || 0;
                                handleUpdateItemDiscount(index, desconto);
                              }}
                              className="h-8 md:h-7 text-xs md:text-sm"
                              step="0.01"
                            />
                          </div>
                          <div className="text-right">
                            <Label className="text-xs">Total</Label>
                            <p className="font-semibold text-sm md:text-base">
                              {currencyFormatters.brl((item.valor_unitario * item.quantidade) - (item.desconto || 0))}
                            </p>
                          </div>
                        </div>
                        {item.observacao && (
                          <div className="mt-2">
                            <Label className="text-xs">Observação</Label>
                            <Input
                              value={item.observacao}
                              onChange={(e) => {
                                setCart(cart.map((it, i) =>
                                  i === index ? { ...it, observacao: e.target.value } : it
                                ));
                              }}
                              placeholder="Ex: Película aplicada"
                              className="h-8 md:h-7 text-xs md:text-sm"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coluna direita - Resumo */}
          <div className="space-y-3 md:space-y-4">
            <Card className={cn(
              "sticky top-4 md:static border-2 transition-all",
              totals.total > 0 
                ? "border-emerald-200 shadow-lg bg-gradient-to-b from-white to-emerald-50/30" 
                : "border-gray-200"
            )}>
              <CardHeader className="p-3 md:p-4 pb-2">
                <CardTitle className="text-sm md:text-base flex items-center gap-2">
                  <DollarSign className={cn("h-4 w-4", totals.total > 0 ? "text-emerald-600" : "text-gray-400")} />
                  Resumo
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-4 pt-0 space-y-2 md:space-y-3">
                <div className="flex justify-between text-xs md:text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{currencyFormatters.brl(totals.subtotal)}</span>
                </div>
                {totals.descontoItens > 0 && (
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-gray-600">Desconto Itens:</span>
                    <span className="text-red-600 font-medium">-{currencyFormatters.brl(totals.descontoItens)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs md:text-sm gap-2">
                  <span className="text-gray-600">Desconto Extra:</span>
                  <Input
                    type="number"
                    value={descontoTotal}
                    onChange={(e) => setDescontoTotal(parseFloat(e.target.value) || 0)}
                    className="h-8 md:h-7 w-20 md:w-24 text-xs md:text-sm"
                    step="0.01"
                  />
                </div>
                
                {/* TOTAL - GRANDE DESTAQUE */}
                <div className={cn(
                  "rounded-xl p-3 md:p-4 mt-2",
                  totals.total > 0 
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md" 
                    : "bg-gray-100 text-gray-500"
                )}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm md:text-base font-medium">Total:</span>
                    <span className="text-2xl md:text-3xl font-bold">
                      {currencyFormatters.brl(totals.total)}
                    </span>
                  </div>
                </div>
                {isEditing && (
                  <>
                    <div className="border-t pt-2 flex justify-between text-xs md:text-sm">
                      <span>Total Pago:</span>
                      <span className="text-green-600 font-medium">{currencyFormatters.brl(totalPago)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-sm md:text-base">
                      <span>Saldo Restante:</span>
                      <span className={cn(
                        saldoRestante > 0 ? "text-orange-600" : "text-green-600"
                      )}>
                        {currencyFormatters.brl(saldoRestante)}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Observações */}
            <Card>
              <CardHeader className="p-3 md:p-6">
                <CardTitle className="text-sm md:text-base">Observações</CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <Textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observações gerais da venda..."
                  rows={3}
                  className="resize-none text-sm md:text-base"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal de Checkout */}
      <Dialog open={showCheckout} onOpenChange={(open) => {
        setShowCheckout(open);
        if (open) {
          // Resetar valores quando abrir o modal
          setCheckoutPayment({
            forma_pagamento: 'dinheiro',
            valor: undefined,
            troco: 0,
          });
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Finalizar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Pagamentos já adicionados */}
            {payments && payments.filter((p: any) => p.status === 'confirmed').length > 0 && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <Label className="text-sm font-semibold mb-2 block">Pagamentos Adicionados:</Label>
                <div className="space-y-2">
                  {payments
                    .filter((p: any) => p.status === 'confirmed')
                    .map((payment: any) => (
                      <div key={payment.id} className="flex justify-between items-center text-sm">
                        <span className="capitalize">{PAYMENT_METHOD_LABELS[payment.forma_pagamento as PaymentMethod] || payment.forma_pagamento}</span>
                        <span className="font-semibold">{currencyFormatters.brl(payment.valor)}</span>
                      </div>
                    ))}
                  <div className="flex justify-between items-center pt-2 border-t font-semibold">
                    <span>Total Pago:</span>
                    <span>{currencyFormatters.brl(totalPago)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Forma de Pagamento</Label>
                <Select
                  value={checkoutPayment.forma_pagamento}
                  onValueChange={(v: PaymentMethod) => {
                    const isDinheiro = v === 'dinheiro';
                    setCheckoutPayment({
                      ...checkoutPayment,
                      forma_pagamento: v,
                      // Não preencher automaticamente - deixar usuário escolher o valor
                      valor: undefined,
                      troco: 0,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="debito">Débito</SelectItem>
                    <SelectItem value="credito">Crédito</SelectItem>
                    <SelectItem value="link_pagamento">Link de Pagamento</SelectItem>
                    <SelectItem value="carteira_digital">Carteira Digital</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor Recebido</Label>
                <Input
                  type="number"
                  value={checkoutPayment.valor ?? ''}
                  onChange={(e) => {
                    const valor = e.target.value === '' ? undefined : parseFloat(e.target.value) || 0;
                    setCheckoutPayment({
                      ...checkoutPayment,
                      valor,
                      troco: checkoutPayment.forma_pagamento === 'dinheiro' && valor && valor > saldoRestante
                        ? valor - saldoRestante
                        : 0,
                    });
                  }}
                  step="0.01"
                  placeholder={`Máx: ${currencyFormatters.brl(saldoRestante)}`}
                />
              </div>
            </div>
            
            {checkoutPayment.forma_pagamento === 'dinheiro' && checkoutPayment.valor && checkoutPayment.valor > saldoRestante && (
              <div>
                <Label>Troco</Label>
                <Input
                  type="text"
                  value={currencyFormatters.brl(checkoutPayment.troco || 0)}
                  readOnly
                  className="bg-muted font-semibold text-lg"
                />
              </div>
            )}

            {checkoutPayment.forma_pagamento === 'credito' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Parcelas</Label>
                  <Select
                    value={checkoutPayment.parcelas?.toString() || '1'}
                    onValueChange={(v) => setCheckoutPayment({ ...checkoutPayment, parcelas: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Taxa de Juros (%)</Label>
                  <Input
                    type="number"
                    value={checkoutPayment.taxa_juros || 0}
                    onChange={(e) => setCheckoutPayment({ ...checkoutPayment, taxa_juros: parseFloat(e.target.value) || 0 })}
                    step="0.01"
                  />
                </div>
              </div>
            )}

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Total da Venda:</span>
                <span className="font-semibold">{currencyFormatters.brl(sale?.total || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Pago:</span>
                <span className="font-semibold">{currencyFormatters.brl(totalPago)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Saldo Restante:</span>
                <span className={saldoRestante > 0 ? 'text-red-600' : 'text-green-600'}>
                  {currencyFormatters.brl(saldoRestante)}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddPayment} disabled={!checkoutPayment.valor || checkoutPayment.valor <= 0 || checkoutPayment.valor === undefined}>
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Modal de Faturar OS */}
      <Dialog open={showFaturarOSModal} onOpenChange={setShowFaturarOSModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Faturar Ordem de Serviço</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Busca */}
            <div>
              <Input
                placeholder="Buscar OS por número, cliente ou telefone..."
                value={osSearch}
                onChange={(e) => setOsSearch(e.target.value)}
                className="w-full text-base"
              />
            </div>

            {/* Lista de OSs */}
            {isLoadingOS ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando OSs...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {osList
                  .filter(os => {
                    if (!osSearch) return true;
                    const search = osSearch.toLowerCase();
                    return (
                      os.numero?.toString().includes(search) ||
                      os.cliente_nome?.toLowerCase().includes(search) ||
                      os.telefone_contato?.includes(search)
                    );
                  })
                  .map(os => {
                    const itens = os.itens || [];
                    const produtos = itens.filter((item: any) => 
                      item.tipo === 'peca' || item.tipo === 'produto'
                    );
                    const totalOS = produtos.reduce((sum: number, item: any) => 
                      sum + (Number(item.valor_total) || 0), 0
                    );

                    return (
                      <Card key={os.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">OS #{os.numero}</Badge>
                              <span className="font-semibold">{os.cliente_nome}</span>
                              {os.telefone_contato && (
                                <span className="text-sm text-muted-foreground">
                                  {os.telefone_contato}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>Produtos: {(os.itens || []).length}</p>
                              <p>Total: {currencyFormatters.brl(totalOS)}</p>
                              {os.tipo_aparelho && (
                                <p>Aparelho: {os.tipo_aparelho} {os.marca_nome} {os.modelo_nome}</p>
                              )}
                            </div>
                          </div>
                          <Button
                            onClick={() => handleFaturarOS(os)}
                            disabled={isLoadingOS}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Faturar
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                
                {osList.filter(os => {
                  if (!osSearch) return true;
                  const search = osSearch.toLowerCase();
                  return (
                    os.numero?.toString().includes(search) ||
                    os.cliente_nome?.toLowerCase().includes(search) ||
                    os.telefone_contato?.includes(search)
                  );
                }).length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {osSearch ? 'Nenhuma OS encontrada' : 'Nenhuma OS finalizada com produtos para faturar'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFaturarOSModal(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Sucesso do Orçamento */}
      <Dialog open={showOrcamentoModal} onOpenChange={(open) => !open && handleFecharOrcamentoModal(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">Orçamento Gerado!</DialogTitle>
                <DialogDescription>
                  Orçamento #{orcamentoGerado?.numero} criado com sucesso
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Resumo do orçamento */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Cliente:</span>
                <span className="font-medium">{orcamentoGerado?.cliente_nome || 'Não identificado'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Itens:</span>
                <span className="font-medium">{cart.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Validade:</span>
                <span className="font-medium">
                  {orcamentoGerado?.data_validade 
                    ? new Date(orcamentoGerado.data_validade).toLocaleDateString('pt-BR')
                    : '7 dias'
                  }
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-semibold">Total:</span>
                <span className="font-bold text-lg text-emerald-600">
                  {currencyFormatters.brl(orcamentoGerado?.total || totals.total)}
                </span>
              </div>
            </div>

            {/* Ações */}
            <div className="space-y-2">
              <p className="text-sm text-gray-600 font-medium">O que deseja fazer?</p>
              
              {/* Imprimir/PDF */}
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12"
                onClick={handlePrintOrcamento}
              >
                <Printer className="h-5 w-5 text-gray-500" />
                <div className="text-left">
                  <div className="font-medium">Salvar PDF</div>
                  <div className="text-xs text-gray-500">Baixar orçamento em PDF</div>
                </div>
              </Button>

              {/* WhatsApp */}
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12 border-green-200 hover:bg-green-50"
                onClick={handleEnviarOrcamentoWhatsApp}
                disabled={!selectedCliente?.telefone && !selectedCliente?.whatsapp}
              >
                <MessageCircle className="h-5 w-5 text-green-600" />
                <div className="text-left">
                  <div className="font-medium text-green-700">Enviar por WhatsApp</div>
                  <div className="text-xs text-gray-500">
                    {selectedCliente?.telefone || selectedCliente?.whatsapp || 'Cliente sem telefone'}
                  </div>
                </div>
              </Button>

              {/* Converter em Venda */}
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12 border-blue-200 hover:bg-blue-50"
                onClick={handleConverterOrcamentoEmVenda}
              >
                <ArrowRight className="h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <div className="font-medium text-blue-700">Converter em Venda</div>
                  <div className="text-xs text-gray-500">Abrir como venda para finalizar</div>
                </div>
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="ghost" 
              onClick={() => handleFecharOrcamentoModal(true)}
              className="text-gray-500"
            >
              Novo Atendimento
            </Button>
            <Button 
              onClick={() => handleFecharOrcamentoModal(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModernLayout>
  );
}

