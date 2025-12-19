import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Search, Plus, Minus, Trash2, ShoppingCart, User, X,
  Save, CreditCard, DollarSign, QrCode, Printer, Send, Download, FileText, Wrench
} from 'lucide-react';
import { generateCupomTermica, generateCupomPDF, printTermica } from '@/utils/pdfGenerator';
import { openWhatsApp, formatVendaMessage } from '@/utils/whatsapp';
import { useSales, useSaleItems, usePayments } from '@/hooks/usePDV';
import { useClientes, useOrdensServico, useItensOS } from '@/hooks/useAssistencia';
import { useProdutosSupabase } from '@/hooks/useProdutosSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CartItem, PaymentFormData, PaymentMethod } from '@/types/pdv';
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
  
  const { produtos, isLoading: produtosLoading } = useProdutosSupabase();
  
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
  const { ordens } = useOrdensServico();
  
  // Buscar todos os itens do localStorage
  const [todosItensOS, setTodosItensOS] = useState<any[]>([]);
  
  useEffect(() => {
    // Carregar todos os itens do localStorage
    const loadAllItens = () => {
      try {
        const stored = localStorage.getItem('assistencia_itens_os');
        if (stored) {
          const parsed = JSON.parse(stored);
          setTodosItensOS(Array.isArray(parsed) ? parsed : []);
          console.log(`Carregados ${parsed.length} itens do localStorage`);
        } else {
          setTodosItensOS([]);
        }
      } catch (error) {
        console.error('Erro ao carregar itens do localStorage:', error);
        setTodosItensOS([]);
      }
    };
    
    loadAllItens();
    // Recarregar periodicamente para pegar atualizações
    const interval = setInterval(loadAllItens, 2000);
    return () => clearInterval(interval);
  }, []);

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
  
  // Estados para modal de faturar OS
  const [showFaturarOSModal, setShowFaturarOSModal] = useState(false);
  const [osList, setOsList] = useState<any[]>([]);
  const [isLoadingOS, setIsLoadingOS] = useState(false);
  const [osSearch, setOsSearch] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Carregar venda se estiver editando
  useEffect(() => {
    if (isEditing && id) {
      loadSale();
    }
  }, [isEditing, id]);

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
        const { data: vendasComOS } = await supabase
          .from('sales')
          .select('ordem_servico_id')
          .not('ordem_servico_id', 'is', null);
        
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
      const { data: existingItems } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', novaVenda.id);
      
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

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2 - Buscar produto
      if (e.key === 'F2' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      
      // F4 - Finalizar venda
      if (e.key === 'F4' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (cart.length > 0) {
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]);

  // Calcular totais
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
      // Validar UUID do produto antes de adicionar ao carrinho
      const isValidUUID = (str: string | undefined | null): boolean => {
        if (!str) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };

      setCart([...cart, {
        produto_id: produto.id && isValidUUID(produto.id) ? produto.id : undefined,
        produto_nome: produto.nome || produto.descricao,
        produto_codigo: produto.codigo?.toString(),
        produto_codigo_barras: produto.codigo_barras,
        produto_tipo: normalizeProdutoTipo(produto.tipo),
        quantidade: 1,
        valor_unitario: produto.preco_venda || produto.valor_dinheiro_pix || 0,
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

  // Função auxiliar para validar UUID
  const isValidUUID = (str: string | undefined | null): boolean => {
    if (!str) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Finalizar venda
  const handleFinalize = async () => {
    if (cart.length === 0) {
      toast({ title: 'Adicione pelo menos um item ao carrinho', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      if (!isEditing || !id) {
        // Criar venda primeiro
        const newSale = await createSale({
          cliente_id: selectedCliente?.id && isValidUUID(selectedCliente.id) ? selectedCliente.id : undefined,
          cliente_nome: selectedCliente?.nome,
          cliente_cpf_cnpj: selectedCliente?.cpf_cnpj,
          cliente_telefone: selectedCliente?.telefone || selectedCliente?.whatsapp,
          observacoes,
          is_draft: false,
        });

        // Adicionar itens
        for (const cartItem of cart) {
          await addItem(cartItem, newSale.id);
        }

        // Atualizar valores da venda antes de finalizar
        await updateSale(newSale.id, {
          subtotal: totals.subtotal,
          desconto_total: totals.descontoTotal,
          total: totals.total,
        });

        // Finalizar
        await finalizeSale(newSale.id);
        
        toast({ title: 'Venda finalizada com sucesso!' });
        navigate(`/pdv/venda/${newSale.id}`);
        setShowCheckout(true);
      } else {
        // Atualizar itens - IMPORTANTE: não adicionar itens que já existem no banco
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

        // Finalizar
        await finalizeSale(id);
        toast({ title: 'Venda finalizada com sucesso!' });
        setShowCheckout(true);
      }
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
      setCheckoutPayment({
        forma_pagamento: 'dinheiro',
        valor: undefined,
        troco: 0,
      });
      
      // Verificar se está pago
      const sale = await getSaleById(id);
      if (sale && Number(sale.total_pago) >= Number(sale.total)) {
        toast({ title: 'Venda finalizada com sucesso!' });
        setShowCheckout(false);
        // Recarregar dados da venda
        await loadSale();
      }
    } catch (error) {
      console.error('Erro ao adicionar pagamento:', error);
      toast({ title: 'Erro ao adicionar pagamento', variant: 'destructive' });
    }
  };

  // Imprimir cupom térmico
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
        termos_garantia: 'A Empresa oferece Garantia de 90 dias em peças usadas no conserto, contados a partir da data de entrega. A garantia não cobre danos causados por mau uso, quedas, água ou outros fatores externos.',
      };

      const qrCodeData = `venda:${sale.id}`;
      const html = await generateCupomTermica(cupomData, qrCodeData);
      printTermica(html);
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
        termos_garantia: 'A Empresa oferece Garantia de 90 dias em peças usadas no conserto, contados a partir da data de entrega. A garantia não cobre danos causados por mau uso, quedas, água ou outros fatores externos.',
      };

      const qrCodeData = `venda:${sale.id}`;
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

  return (
    <ModernLayout 
      title={isEditing ? `Venda #${sale?.numero || ''}` : 'Nova Venda'}
      subtitle={isEditing ? 'Editar venda' : 'Criar nova venda'}
    >
      <div className="space-y-4">
        {/* Header com ações */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/pdv/vendas')}
            >
              Voltar
            </Button>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenFaturarOSModal}
              >
                <Wrench className="h-4 w-4 mr-2" />
                Faturar OS
              </Button>
            )}
            {isEditing && (
              <Badge variant="outline">
                {sale?.is_draft ? 'Rascunho' : 'Finalizada'}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isEditing && sale && !sale.is_draft && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintCupom}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir Cupom
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSavePDF}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Salvar PDF
                </Button>
                {selectedCliente?.whatsapp && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSendWhatsApp}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar WhatsApp
                  </Button>
                )}
              </>
            )}
            {(!isEditing || sale?.is_draft) && (
              <>
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isSaving || isDeleting}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Salvando...' : 'Salvar Rascunho'}
                </Button>
                <Button
                  onClick={handleFinalize}
                  disabled={cart.length === 0 || isSaving || isDeleting}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {isSaving ? 'Finalizando...' : 'Finalizar Venda'}
                </Button>
                {isEditing && (sale?.is_draft || isAdmin) && (
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isSaving || isDeleting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeleting ? 'Excluindo...' : 'Excluir'}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Coluna esquerda - Busca e Cliente */}
          <div className="lg:col-span-2 space-y-4">
            {/* Busca de produtos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Buscar Produto (F2)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                    className="pl-9"
                  />
                  {showProductSearch && productResults.length > 0 && (
                    <div className="absolute z-50 w-full bg-background border rounded shadow-lg max-h-64 overflow-auto mt-1">
                      {productResults.map(produto => (
                        <div
                          key={produto.id}
                          className="p-3 hover:bg-muted cursor-pointer border-b last:border-0"
                          onClick={() => handleAddProduct(produto)}
                        >
                          <p className="font-medium">{produto.descricao || ''}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-muted-foreground">
                              {produto.codigo && `Cód: ${produto.codigo}`}
                              {produto.codigo_barras && ` • Barras: ${produto.codigo_barras}`}
                            </p>
                            <p className="text-sm font-semibold">
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
              <CardHeader>
                <CardTitle className="text-base">Cliente (Opcional)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                      className="pl-9"
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
                          className="p-2 hover:bg-muted cursor-pointer text-sm"
                          onClick={() => handleSelectCliente(cliente)}
                        >
                          <p className="font-medium">{cliente.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {cliente.cpf_cnpj} • {cliente.telefone || cliente.whatsapp}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedCliente && (
                    <div className="p-3 bg-muted/50 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{selectedCliente.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedCliente.cpf_cnpj} • {selectedCliente.telefone || selectedCliente.whatsapp}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
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

            {/* Carrinho */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Carrinho ({cart.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum item no carrinho</p>
                    <p className="text-sm">Use F2 para buscar produtos</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium">{item.produto_nome}</p>
                            {item.produto_codigo && (
                              <p className="text-xs text-muted-foreground">Cód: {item.produto_codigo}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-4 gap-2 items-center">
                          <div>
                            <Label className="text-xs">Qtd</Label>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
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
                                className="w-16 h-7 text-center text-sm"
                                min="0.001"
                                step="0.001"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
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
                              className="h-7 text-sm"
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
                              className="h-7 text-sm"
                              step="0.01"
                            />
                          </div>
                          <div className="text-right">
                            <Label className="text-xs">Total</Label>
                            <p className="font-semibold">
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
                              className="h-7 text-sm"
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
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{currencyFormatters.brl(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Desconto Itens:</span>
                  <span className="text-red-600">-{currencyFormatters.brl(totals.descontoItens)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Desconto Total:</span>
                  <Input
                    type="number"
                    value={descontoTotal}
                    onChange={(e) => setDescontoTotal(parseFloat(e.target.value) || 0)}
                    className="h-7 w-24 text-sm"
                    step="0.01"
                  />
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>{currencyFormatters.brl(totals.total)}</span>
                </div>
                {isEditing && (
                  <>
                    <div className="border-t pt-2 flex justify-between text-sm">
                      <span>Total Pago:</span>
                      <span className="text-green-600">{currencyFormatters.brl(totalPago)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
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
              <CardHeader>
                <CardTitle className="text-base">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observações gerais da venda..."
                  rows={4}
                  className="resize-none"
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Forma de Pagamento</Label>
                <Select
                  value={checkoutPayment.forma_pagamento}
                  onValueChange={(v: PaymentMethod) => setCheckoutPayment({ ...checkoutPayment, forma_pagamento: v })}
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
                <Label>Valor</Label>
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
                  placeholder="0,00"
                />
              </div>
            </div>
            
            {checkoutPayment.forma_pagamento === 'dinheiro' && checkoutPayment.valor && checkoutPayment.valor > saldoRestante && (
              <div>
                <Label>Troco</Label>
                <Input
                  type="number"
                  value={checkoutPayment.troco || 0}
                  readOnly
                  className="bg-muted"
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

            <div className="border-t pt-4">
              <div className="flex justify-between font-bold text-lg">
                <span>Total a Pagar:</span>
                <span>{currencyFormatters.brl(saldoRestante)}</span>
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
                className="w-full"
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
    </ModernLayout>
  );
}

