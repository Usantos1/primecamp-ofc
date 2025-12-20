import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Save, X, Plus, Search, Phone, Printer, Send, Trash2, Edit,
  User, Smartphone, FileText, Check, AlertTriangle, Package, DollarSign, Download, ArrowLeft, Image, Upload, Settings, ChevronDown, ChevronUp
} from 'lucide-react';
import { 
  useOrdensServico, useClientes, useMarcasModelos, useProdutos, 
  useItensOS, usePagamentos, buscarCEP, useConfiguracaoStatus
} from '@/hooks/useAssistencia';
import { useCargos } from '@/hooks/useCargos';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { 
  OrdemServicoFormData, CHECKLIST_ITENS, ItemOS,
  STATUS_OS_LABELS, STATUS_OS_COLORS, StatusOS, CARGOS_LABELS
} from '@/types/assistencia';
import { PhoneDrawing, PhoneDrawingLegend } from '@/components/assistencia/PhoneDrawing';
import { PatternLock } from '@/components/assistencia/PatternLock';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { LoadingButton } from '@/components/LoadingButton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useTelegram } from '@/hooks/useTelegram';

interface OrdemServicoFormProps {
  osId?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export default function OrdemServicoForm({ osId, onClose, isModal = false }: OrdemServicoFormProps = {} as OrdemServicoFormProps) {
  const navigate = useNavigate();
  const { id: routeId, tab: routeTab } = useParams<{ id?: string; tab?: string }>();
  const id = osId || routeId;
  const isEditing = Boolean(id);
  const { toast } = useToast();

  // Hooks
  const { createOS, updateOS, getOSById, updateStatus } = useOrdensServicoSupabase();
  const { clientes, searchClientes, createCliente, getClienteById } = useClientesSupabase();
  const { marcas, modelos, getModelosByMarca } = useMarcasModelos();
  const { produtos, searchProdutos, updateProduto } = useProdutos();
  const { configuracoes, getConfigByStatus } = useConfiguracaoStatus();
  const { tecnicos, colaboradores, getColaboradorById, isLoading: isLoadingCargos } = useCargos();
  
  // Debug: verificar se técnicos e colaboradores estão sendo carregados
  useEffect(() => {
    if (!isLoadingCargos) {
      console.log('[OrdemServicoForm] Técnicos carregados:', tecnicos.length, tecnicos.map(t => t.nome));
      console.log('[OrdemServicoForm] Colaboradores carregados:', colaboradores.length, colaboradores.map(c => c.nome));
    }
  }, [tecnicos, colaboradores, isLoadingCargos]);
  const { sendMessage, loading: whatsappLoading } = useWhatsApp();
  const { sendMultiplePhotos: sendTelegramPhotos, deleteMessage: deleteTelegramMessage, loading: telegramLoading } = useTelegram();

  // Estados para Chat IDs do Telegram - carrega automaticamente do localStorage
  const [telegramChatIdEntrada, setTelegramChatIdEntrada] = useState<string>(() => {
    const saved = localStorage.getItem('telegram_chat_id_entrada');
    return saved || '';
  });

  const [telegramChatIdProcesso, setTelegramChatIdProcesso] = useState<string>(() => {
    const saved = localStorage.getItem('telegram_chat_id_processo');
    return saved || '';
  });

  const [telegramChatIdSaida, setTelegramChatIdSaida] = useState<string>(() => {
    const saved = localStorage.getItem('telegram_chat_id_saida');
    return saved || '';
  });

  // Salvar Chat IDs automaticamente quando mudarem (com debounce de 2 segundos)
  useEffect(() => {
    if (telegramChatIdEntrada && telegramChatIdEntrada.trim()) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem('telegram_chat_id_entrada', telegramChatIdEntrada.trim());
        console.log('[OrdemServicoForm] Chat ID Entrada salvo automaticamente:', telegramChatIdEntrada.trim());
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [telegramChatIdEntrada]);

  useEffect(() => {
    if (telegramChatIdProcesso && telegramChatIdProcesso.trim()) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem('telegram_chat_id_processo', telegramChatIdProcesso.trim());
        console.log('[OrdemServicoForm] Chat ID Processo salvo automaticamente:', telegramChatIdProcesso.trim());
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [telegramChatIdProcesso]);

  useEffect(() => {
    if (telegramChatIdSaida && telegramChatIdSaida.trim()) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem('telegram_chat_id_saida', telegramChatIdSaida.trim());
        console.log('[OrdemServicoForm] Chat ID Saída salvo automaticamente:', telegramChatIdSaida.trim());
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [telegramChatIdSaida]);

  // Estados do formulário
  const [formData, setFormData] = useState<OrdemServicoFormData>({
    cliente_id: '',
    telefone_contato: '', // Obrigatório
    tipo_aparelho: 'celular',
    marca_id: '',
    modelo_id: '',
    imei: '',
    numero_serie: '',
    cor: '',
    operadora: '',
    senha_aparelho: '',
    senha_numerica: '', // Para iPhone
    padrao_desbloqueio: '', // Padrão de desbloqueio
    possui_senha: false,
    possui_senha_tipo: 'nao', // Tipo de senha: 'sim', 'nao', 'deslizar', 'nao_sabe', 'nao_autorizou'
    deixou_aparelho: true,
    apenas_agendamento: false,
    descricao_problema: '',
    condicoes_equipamento: '',
    previsao_entrega: '',
    hora_previsao: '18:00',
    observacoes: '',
    observacoes_internas: '',
    checklist_entrada: [],
    areas_defeito: [],
    observacoes_checklist: '',
    // Resolução
    problema_constatado: '',
    tecnico_id: '',
    servico_executado: '',
    // Orçamento
    orcamento_parcelado: 0,
    orcamento_desconto: 0,
    orcamento_autorizado: false,
  });

  const [currentOS, setCurrentOS] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [localActiveTab, setLocalActiveTab] = useState('dados');
  const activeTab = isModal ? localActiveTab : (routeTab || 'dados');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Função para navegar entre as abas
  const handleTabChange = (tab: string) => {
    if (isModal) {
      // Se for modal, apenas muda o estado local
      setLocalActiveTab(tab);
      return;
    }
    // Se for página, navega pela URL
    if (isEditing && id) {
      navigate(`/pdv/os/${id}/${tab}`);
    } else {
      navigate(`/pdv/os/nova/${tab}`);
    }
  };

  // Estados para busca
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteResults, setClienteResults] = useState<any[]>([]);
  const [showClienteSearch, setShowClienteSearch] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<any>(null);

  // Estados para itens da OS
  const [showAddItem, setShowAddItem] = useState(false);
  const [produtoSearch, setProdutoSearch] = useState('');
  const [produtoResults, setProdutoResults] = useState<any[]>([]);
  const [itemForm, setItemForm] = useState({
    tipo: 'servico' as 'peca' | 'servico' | 'mao_de_obra',
    produto_id: undefined as string | undefined,
    descricao: '',
    quantidade: 1,
    valor_unitario: 0,
    valor_minimo: 0,
    desconto: 0,
    garantia: 0,
    colaborador_id: '',
  });
  const [editingItem, setEditingItem] = useState<ItemOS | null>(null);

  // Itens e pagamentos (apenas para edição)
  // Usar um ID temporário se a OS ainda não foi criada
  const osIdParaItens = id || currentOS?.id || 'temp';
  const { itens, total, addItem, updateItem, removeItem } = useItensOS(osIdParaItens);
  const { pagamentos, totalPago, addPagamento } = usePagamentos(osIdParaItens);

  // Carregar OS existente
  useEffect(() => {
    if (isEditing && id) {
      const os = getOSById(id);
      if (os) {
        setCurrentOS(os);
        setFormData({
          cliente_id: os.cliente_id,
          telefone_contato: os.telefone_contato || '',
          tipo_aparelho: os.tipo_aparelho || 'celular',
          marca_id: os.marca_id || '',
          modelo_id: os.modelo_id || '',
          imei: os.imei || '',
          numero_serie: os.numero_serie || '',
          cor: os.cor || '',
          senha_aparelho: os.senha_aparelho || '',
          senha_numerica: os.senha_numerica || '',
          padrao_desbloqueio: os.padrao_desbloqueio || '',
          possui_senha: os.possui_senha,
          possui_senha_tipo: os.possui_senha_tipo || (os.possui_senha ? (os.padrao_desbloqueio ? 'deslizar' : 'sim') : 'nao'),
          deixou_aparelho: os.deixou_aparelho,
          apenas_agendamento: os.apenas_agendamento || false,
          descricao_problema: os.descricao_problema,
          condicoes_equipamento: os.condicoes_equipamento || '',
          previsao_entrega: os.previsao_entrega || '',
          hora_previsao: os.hora_previsao || '18:00',
          observacoes: os.observacoes || '',
          observacoes_internas: os.observacoes_internas || '',
          checklist_entrada: os.checklist_entrada || [],
          areas_defeito: os.areas_defeito || [],
          observacoes_checklist: os.observacoes_checklist || '',
          problema_constatado: os.problema_constatado || '',
          tecnico_id: os.tecnico_id || '',
          servico_executado: os.servico_executado || '',
          orcamento_parcelado: os.orcamento_parcelado || 0,
          orcamento_desconto: os.orcamento_desconto || 0,
          orcamento_autorizado: os.orcamento_autorizado || false,
        });
        
        const cliente = getClienteById(os.cliente_id);
        if (cliente) {
          setSelectedCliente(cliente);
        }

        // Carregar Chat IDs salvos na OS ou usar os do localStorage
        if (os.telegram_chat_id_entrada) {
          setTelegramChatIdEntrada(os.telegram_chat_id_entrada);
        }
        if (os.telegram_chat_id_processo) {
          setTelegramChatIdProcesso(os.telegram_chat_id_processo);
        }
        if (os.telegram_chat_id_saida) {
          setTelegramChatIdSaida(os.telegram_chat_id_saida);
        }
      }
    }
  }, [id, isEditing, getOSById, getClienteById]);

  // Atualizar nomes de colaboradores que estão faltando nos itens
  useEffect(() => {
    if (itens.length > 0 && colaboradores.length > 0) {
      itens.forEach(item => {
        if (item.colaborador_id && !item.colaborador_nome) {
          const colab = getColaboradorById(item.colaborador_id);
          if (colab) {
            updateItem(item.id, { colaborador_nome: colab.nome });
            console.log(`Nome do colaborador atualizado para item ${item.id}: ${colab.nome}`);
          }
        }
      });
    }
  }, [itens, colaboradores, getColaboradorById, updateItem]);

  // Buscar cliente
  useEffect(() => {
    if (clienteSearch.length >= 2) {
      const results = searchClientes(clienteSearch);
      setClienteResults(results.slice(0, 10));
    } else {
      setClienteResults([]);
    }
  }, [clienteSearch, searchClientes]);

  // Buscar produtos - filtrar conforme o tipo selecionado
  useEffect(() => {
    if (produtoSearch.length >= 2) {
      const results = searchProdutos(produtoSearch);
      console.log('Resultados da busca (antes do filtro):', results.length, results);
      
      // Se o tipo for "peca", filtrar apenas peças com estoque
      // Se for "servico" ou "mao_de_obra", mostrar todos os produtos
      let produtosFiltrados = results;
      
      if (itemForm.tipo === 'peca') {
        produtosFiltrados = results.filter(prod => {
          const isPeca = prod.tipo === 'peca' || prod.tipo === 'produto';
          const temEstoque = (prod.estoque_atual || 0) > 0;
          console.log(`Produto: ${prod.descricao}, Tipo: ${prod.tipo}, Estoque: ${prod.estoque_atual}, isPeca: ${isPeca}, temEstoque: ${temEstoque}`);
          return isPeca && temEstoque;
        });
        console.log('Produtos com estoque (tipo peça):', produtosFiltrados.length, produtosFiltrados);
      } else {
        // Para serviços e mão de obra, mostrar todos os produtos encontrados
        console.log('Mostrando todos os produtos (tipo serviço/mão de obra):', produtosFiltrados.length);
      }
      
      setProdutoResults(produtosFiltrados.slice(0, 10));
    } else {
      setProdutoResults([]);
    }
  }, [produtoSearch, searchProdutos, itemForm.tipo]);

  // Modelos filtrados por marca
  const modelosFiltrados = useMemo(() => {
    if (!formData.marca_id) return [];
    return getModelosByMarca(formData.marca_id);
  }, [formData.marca_id, getModelosByMarca]);

  // Garantir que marcas sejam inicializadas
  useEffect(() => {
    // O hook useMarcasModelos já inicializa automaticamente
    // Mas vamos forçar a inicialização se necessário
    if (marcas.length === 0) {
      console.log('Marcas não carregadas, aguardando inicialização...');
    } else {
      console.log(`Marcas carregadas: ${marcas.length}`, marcas.map(m => m.nome));
    }
  }, [marcas]);

  // Selecionar cliente
  const handleSelectCliente = (cliente: any) => {
    setSelectedCliente(cliente);
    setFormData(prev => ({
      ...prev,
      cliente_id: cliente.id,
      telefone_contato: cliente.whatsapp || cliente.telefone || '',
    }));
    setShowClienteSearch(false);
    setClienteSearch('');
  };

  // Toggle checklist
  const toggleChecklist = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      checklist_entrada: prev.checklist_entrada.includes(itemId)
        ? prev.checklist_entrada.filter(i => i !== itemId)
        : [...prev.checklist_entrada, itemId]
    }));
  };

  // Adicionar/Editar item
  const handleSubmitItem = () => {
    try {
      console.log('=== INICIANDO ADIÇÃO DE ITEM ===');
      console.log('Item form:', itemForm);
      console.log('OS ID:', id);
      
      // Validar se é peça e tem estoque suficiente
      // NOTA: Se o usuário digitou manualmente a descrição sem selecionar do estoque,
      // permitir adicionar mas avisar que não terá controle de estoque
      if (itemForm.tipo === 'peca') {
        // Se não tem produto_id mas tem descrição, pode ser que o usuário digitou manualmente
        // Nesse caso, apenas avisar mas permitir adicionar
        if (!itemForm.produto_id && itemForm.descricao.trim()) {
          console.warn('Peça adicionada sem seleção do estoque - sem controle de estoque');
          // Não bloquear, apenas avisar
        } else if (!itemForm.produto_id) {
          toast({
            title: 'Produto obrigatório',
            description: 'Selecione uma peça do estoque para adicionar.',
            variant: 'destructive',
          });
          return;
        }
        
        // Só validar estoque se tiver produto_id selecionado
        if (itemForm.produto_id) {
          const produto = produtos.find(p => p.id === itemForm.produto_id);
          if (!produto) {
            toast({
              title: 'Produto não encontrado',
              description: 'O produto selecionado não foi encontrado.',
              variant: 'destructive',
            });
            return;
          }
          
          console.log('Produto encontrado:', produto);
          console.log(`Estoque disponível: ${produto.estoque_atual}, Quantidade solicitada: ${itemForm.quantidade}`);
          
          if (produto.estoque_atual < itemForm.quantidade) {
            toast({
              title: 'Estoque insuficiente',
              description: `Estoque disponível: ${produto.estoque_atual} unidades. Quantidade solicitada: ${itemForm.quantidade}`,
              variant: 'destructive',
            });
            return;
          }
        }
      }
      
      if (!itemForm.descricao.trim()) {
        toast({
          title: 'Descrição obrigatória',
          description: 'Informe a descrição do item.',
          variant: 'destructive',
        });
        return;
      }
      
      // Se não tiver ID e não tiver OS criada, criar a OS primeiro
      if (!id && !currentOS) {
        toast({
          title: 'OS não encontrada',
          description: 'Salve a OS primeiro antes de adicionar itens.',
          variant: 'destructive',
        });
        return;
      }
      
      // Se não tiver ID mas tiver OS criada, usar o ID da OS
      const osIdParaItem = id || currentOS?.id;
      if (!osIdParaItem) {
        toast({
          title: 'OS não encontrada',
          description: 'Não foi possível identificar a ordem de serviço.',
          variant: 'destructive',
        });
        return;
      }
      
      console.log('OS ID para item:', osIdParaItem);
      
      // Gerenciar estoque para peças (ANTES de criar itemData para validar)
      if (itemForm.tipo === 'peca' && itemForm.produto_id) {
        const produto = produtos.find(p => p.id === itemForm.produto_id);
        if (produto) {
          if (editingItem) {
            // Ao editar: reverter quantidade antiga e aplicar nova
            const quantidadeAntiga = editingItem.quantidade || 0;
            const quantidadeNova = itemForm.quantidade;
            const diferenca = quantidadeNova - quantidadeAntiga;
            
            if (diferenca !== 0) {
              const novoEstoque = Math.max(0, (produto.estoque_atual || 0) - diferenca);
              
              // Validar se há estoque suficiente para a diferença
              if (diferenca > 0 && (produto.estoque_atual || 0) < diferenca) {
                toast({
                  title: 'Estoque insuficiente',
                  description: `Estoque disponível: ${produto.estoque_atual} unidades. Não é possível aumentar a quantidade em ${diferenca} unidades.`,
                  variant: 'destructive',
                });
                return;
              }
              
              updateProduto(produto.id, { estoque_atual: novoEstoque });
              console.log(`Estoque ajustado: ${produto.estoque_atual} → ${novoEstoque} (diferença: ${diferenca})`);
            }
          } else {
            // Ao adicionar: decrementar estoque
            const novoEstoque = Math.max(0, (produto.estoque_atual || 0) - itemForm.quantidade);
            updateProduto(produto.id, { estoque_atual: novoEstoque });
            console.log(`Estoque decrementado: ${produto.estoque_atual} → ${novoEstoque} (quantidade: ${itemForm.quantidade})`);
          }
        }
      }
      
      // Calcular dados do item APÓS validações de estoque
      const valorTotal = (itemForm.quantidade * itemForm.valor_unitario) - itemForm.desconto;
      const colaborador = itemForm.colaborador_id ? getColaboradorById(itemForm.colaborador_id) : null;
      
      console.log('Valor total calculado:', valorTotal);
      console.log('Colaborador encontrado:', colaborador);
      console.log('Colaborador ID:', itemForm.colaborador_id);
      console.log('Colaborador Nome:', colaborador?.nome);
      
      const itemData = {
        tipo: itemForm.tipo,
        produto_id: itemForm.produto_id,
        descricao: itemForm.descricao,
        quantidade: itemForm.quantidade,
        valor_unitario: itemForm.valor_unitario,
        valor_minimo: itemForm.valor_minimo || 0,
        desconto: itemForm.desconto,
        garantia: itemForm.garantia || 0,
        colaborador_id: itemForm.colaborador_id || undefined,
        colaborador_nome: colaborador?.nome || undefined, // Sempre recalcular o nome
        valor_total: valorTotal,
      };
      
      console.log('Dados do item a ser adicionado/editado:', itemData);
      
      if (editingItem) {
        console.log('Editando item:', editingItem.id);
        updateItem(editingItem.id, itemData);
        setEditingItem(null);
        toast({
          title: 'Item atualizado',
          description: 'O item foi atualizado com sucesso.',
        });
      } else {
        console.log('Adicionando novo item...');
        addItem(itemData);
        toast({
          title: 'Item adicionado',
          description: 'O item foi adicionado à ordem de serviço.',
        });
      }
      
      console.log('=== ITEM ADICIONADO COM SUCESSO ===');
      
      setShowAddItem(false);
      setItemForm({
        tipo: 'servico',
        produto_id: undefined,
        descricao: '',
        quantidade: 1,
        valor_unitario: 0,
        valor_minimo: 0,
        desconto: 0,
        garantia: 0,
        colaborador_id: '',
      });
      setProdutoSearch('');
    } catch (error: any) {
      console.error('=== ERRO AO ADICIONAR ITEM ===');
      console.error('Erro completo:', error);
      console.error('Mensagem:', error.message);
      console.error('Stack:', error.stack);
      
      toast({
        title: 'Erro ao adicionar item',
        description: error.message || 'Ocorreu um erro ao adicionar o item. Verifique o console para mais detalhes.',
        variant: 'destructive',
      });
    }
  };

  // Editar item
  const handleEditItem = (item: ItemOS) => {
    setEditingItem(item);
    setItemForm({
      tipo: item.tipo,
      produto_id: item.produto_id,
      descricao: item.descricao,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      valor_minimo: item.valor_minimo || 0,
      desconto: item.desconto,
      garantia: item.garantia || 0,
      colaborador_id: item.colaborador_id || '',
    });
    setShowAddItem(true);
  };

  // Remover item (com reversão de estoque)
  const handleRemoveItem = (itemId: string) => {
    const item = itens.find(i => i.id === itemId);
    if (!item) return;

    // Reverter estoque se for peça com produto_id
    if (item.tipo === 'peca' && item.produto_id) {
      const produto = produtos.find(p => p.id === item.produto_id);
      if (produto) {
        const quantidadeRemovida = item.quantidade || 0;
        const novoEstoque = (produto.estoque_atual || 0) + quantidadeRemovida;
        updateProduto(produto.id, { estoque_atual: novoEstoque });
        console.log(`Estoque revertido: ${produto.estoque_atual} → ${novoEstoque} (quantidade removida: ${quantidadeRemovida})`);
      }
    }

    removeItem(itemId);
    toast({
      title: 'Item removido',
      description: 'O item foi removido da ordem de serviço e o estoque foi revertido.',
    });
  };

  // Selecionar produto
  const handleSelectProduto = (produto: any) => {
    setItemForm(prev => ({
      ...prev,
      produto_id: produto.id,
      descricao: produto.descricao,
      valor_unitario: produto.preco_venda,
      tipo: produto.tipo === 'peca' ? 'peca' : (produto.tipo === 'produto' ? 'peca' : 'servico'),
      quantidade: 1, // Resetar quantidade ao selecionar novo produto
    }));
    setProdutoSearch('');
    setProdutoResults([]);
  };

  // Salvar OS
  const handleSubmit = async () => {
    if (!formData.cliente_id) {
      toast({ title: 'Selecione um cliente', variant: 'destructive' });
      return;
    }
    if (!formData.descricao_problema) {
      toast({ title: 'Descreva o problema', variant: 'destructive' });
      return;
    }

    if (!formData.telefone_contato) {
      toast({ title: 'Telefone para contato é obrigatório', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const tecnico = formData.tecnico_id ? getColaboradorById(formData.tecnico_id) : null;
      
      if (isEditing && currentOS) {
        updateOS(currentOS.id, {
          ...formData,
          cliente_nome: selectedCliente?.nome,
          cliente_empresa: selectedCliente?.nome_fantasia,
          marca_nome: marcas.find(m => m.id === formData.marca_id)?.nome,
          modelo_nome: modelos.find(m => m.id === formData.modelo_id)?.nome,
          tecnico_nome: tecnico?.nome,
        });
        // Recarregar dados atualizados da OS
        const osAtualizada = getOSById(currentOS.id);
        if (osAtualizada) {
          setCurrentOS(osAtualizada);
          setFormData(prev => ({
            ...prev,
            possui_senha_tipo: osAtualizada.possui_senha_tipo || (osAtualizada.possui_senha ? (osAtualizada.padrao_desbloqueio ? 'deslizar' : 'sim') : 'nao'),
            senha_aparelho: osAtualizada.senha_aparelho || prev.senha_aparelho,
            padrao_desbloqueio: osAtualizada.padrao_desbloqueio || prev.padrao_desbloqueio,
          }));
        }
        // Mostrar toast centralizado
        setShowSuccessToast(true);
        setTimeout(() => {
          setShowSuccessToast(false);
        }, 2000);
      } else {
        const novaOS = createOS({
          ...formData,
          cliente_nome: selectedCliente?.nome,
          cliente_empresa: selectedCliente?.nome_fantasia,
          marca_nome: marcas.find(m => m.id === formData.marca_id)?.nome,
          modelo_nome: modelos.find(m => m.id === formData.modelo_id)?.nome,
          tecnico_nome: tecnico?.nome,
        } as any);
        toast({ title: `OS #${novaOS.numero} criada!` });
        if (isModal && onClose) {
          // Se estiver no modal, fecha e deixa o usuário abrir novamente se quiser
          onClose();
        } else {
          navigate(`/pdv/os/${novaOS.id}`);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Alterar status
  const handleChangeStatus = async (status: StatusOS | string) => {
    if (!currentOS) return;
    
    const config = getConfigByStatus(status);
    
    // Se configurado para notificar via WhatsApp, enviar mensagem
    if (config?.notificar_whatsapp && config.mensagem_whatsapp) {
      const cliente = getClienteById(currentOS.cliente_id);
      const telefone = currentOS.telefone_contato || cliente?.whatsapp || cliente?.telefone;
      
      if (telefone) {
        try {
          // Substituir variáveis na mensagem
          const marca = marcas.find(m => m.id === currentOS.marca_id);
          const modelo = modelos.find(m => m.id === currentOS.modelo_id);
          
          let mensagem = config.mensagem_whatsapp
            .replace(/{cliente}/g, cliente?.nome || currentOS.cliente_nome || 'Cliente')
            .replace(/{numero}/g, currentOS.numero?.toString() || '')
            .replace(/{status}/g, config.label)
            .replace(/{marca}/g, marca?.nome || currentOS.marca_nome || '')
            .replace(/{modelo}/g, modelo?.nome || currentOS.modelo_nome || '');
          
          // Formatar número
          let numero = telefone.replace(/\D/g, '');
          numero = numero.replace(/^0+/, '');
          if (!numero.startsWith('55')) {
            if (numero.startsWith('0')) {
              numero = numero.substring(1);
            }
            if (numero.length === 10 || numero.length === 11) {
              numero = '55' + numero;
            }
          }
          
          // Enviar via API do Ativa CRM
          if (numero.length >= 12 && numero.length <= 13) {
            await sendMessage({
              number: numero,
              body: mensagem
            });
          }
        } catch (error: any) {
          console.error('Erro ao enviar notificação de status:', error);
          // Não bloquear a mudança de status se o envio falhar
        }
      }
    }
    
    await updateStatus(currentOS.id, status as StatusOS, config?.notificar_whatsapp);
    setCurrentOS((prev: any) => prev ? { ...prev, status } : null);
    
    toast({ 
      title: 'Status atualizado', 
      description: config?.notificar_whatsapp ? 'Status atualizado e cliente notificado via WhatsApp.' : 'Status atualizado com sucesso.'
    });
  };

  // WhatsApp - Enviar via API do Ativa CRM
  const handleWhatsApp = async () => {
    if (!currentOS && !isEditing) {
      toast({ title: 'Salve a OS antes de enviar', variant: 'destructive' });
      return;
    }
    
    const os = currentOS || (isEditing ? getOSById(id || '') : null);
    if (!os) {
      toast({ title: 'OS não encontrada', variant: 'destructive' });
      return;
    }

    const cliente = getClienteById(os.cliente_id);
    const telefone = os.telefone_contato || cliente?.whatsapp || cliente?.telefone;
    
    if (!telefone) {
      toast({ title: 'Telefone não encontrado', variant: 'destructive' });
      return;
    }

    try {
      const marca = marcas.find(m => m.id === os.marca_id);
      const modelo = modelos.find(m => m.id === os.modelo_id);
      
      const mensagem = `*ORDEM DE SERVIÇO #${os.numero}*

*Cliente:* ${cliente?.nome || os.cliente_nome}
*Telefone:* ${telefone}
*Aparelho:* ${marca?.nome || ''} ${modelo?.nome || ''}
*Problema:* ${os.descricao_problema}
*Status:* ${STATUS_OS_LABELS[os.status as StatusOS]}
*Data Entrada:* ${dateFormatters.short(os.data_entrada)}
${os.previsao_entrega ? `*Previsão Entrega:* ${dateFormatters.short(os.previsao_entrega)}` : ''}

*Sobre a Garantia do Serviço:*
1 - A Empresa oferece Garantia de 90 dias em peças usadas no conserto, contados a partir da data de entrega.
2 - Não realizamos troca de peças danificadas por Mal Uso, Molhadas, Trincadas, Quebradas e riscadas.
3 - O Aparelho só será devolvido mediante a apresentação desta ou documento do proprietário, guarde-a com cuidado.
4 - Ao ligar para a loja, informe o número da Ordem de Serviço para melhor atendê-lo.
5 - Os aparelhos não retirados em no máximo 30 dias serão acrescido despesas de armazenamento de 6% ao mês.
6 - Os aparelhos não retirados em até 90 dias a partir da data da comunicação para sua retirada, serão descartados.`;

      // Formatar número para API do Ativa CRM
      // A API espera: número com código do país SEM o +, apenas dígitos
      let numero = telefone.replace(/\D/g, '');
      
      // Remover zeros à esquerda
      numero = numero.replace(/^0+/, '');
      
      // Se não começar com código do país, adicionar 55 (Brasil)
      if (!numero.startsWith('55')) {
        // Se começar com 0, remover
        if (numero.startsWith('0')) {
          numero = numero.substring(1);
        }
        // Adicionar código do país se não tiver
        // Número brasileiro: 10 dígitos (fixo) ou 11 dígitos (celular)
        if (numero.length === 10 || numero.length === 11) {
          numero = '55' + numero;
        }
      }
      
      // Validar formato final: deve ter 12 ou 13 dígitos (55 + 10 ou 11 dígitos)
      if (numero.length < 12 || numero.length > 13) {
        toast({
          title: 'Número inválido',
          description: `O número "${telefone}" não está em um formato válido. Use: (DDD) 9XXXX-XXXX ou (DDD) XXXX-XXXX`,
          variant: 'destructive',
        });
        return;
      }

      // Log para debug
      console.log('[handleWhatsApp] Número original:', telefone);
      console.log('[handleWhatsApp] Número formatado:', numero, 'Tamanho:', numero.length);
      
      console.log(`[handleWhatsApp] Número formatado: ${numero} (original: ${telefone})`);

      // Enviar via API do Ativa CRM
      await sendMessage({
        number: numero,
        body: mensagem
      });

      // O hook useWhatsApp já exibe toast de sucesso
    } catch (error: any) {
      console.error('Erro ao enviar WhatsApp:', error);
      toast({ 
        title: 'Erro ao enviar WhatsApp', 
        description: error.message || 'Não foi possível enviar a mensagem. Verifique se o Ativa CRM está configurado.',
        variant: 'destructive' 
      });
    }
  };

  // Impressão e PDF
  const handlePrint = async (tipo: 'a4' | 'termica' | 'pdf') => {
    if (!currentOS && !isEditing) {
      toast({ title: 'Salve a OS antes de imprimir', variant: 'destructive' });
      return;
    }

    const os = currentOS || (isEditing ? getOSById(id || '') : null);
    if (!os) {
      toast({ title: 'OS não encontrada', variant: 'destructive' });
      return;
    }

    if (tipo === 'pdf') {
      await handleGeneratePDF(os);
    } else if (tipo === 'a4') {
      await handlePrintA4(os);
    } else {
      // Impressão térmica - usar API específica
      toast({ title: 'Impressão térmica em desenvolvimento' });
    }
  };

  // Gerar PDF
  const handleGeneratePDF = async (os: any) => {
    try {
      const cliente = getClienteById(os.cliente_id);
      const marca = marcas.find(m => m.id === os.marca_id);
      const modelo = modelos.find(m => m.id === os.modelo_id);

      const formatCurrency = (value?: number) =>
        value !== undefined && value !== null ? currencyFormatters.brl(value) : '-';

      const checklistEntrada = (os.checklist_entrada || []).join(', ') || 'Não informado';
      const areasDefeito = (os.areas_defeito || []).join(', ') || 'Não informado';
      const senhaInfo = os.possui_senha
        ? (os.possui_senha_tipo || 'Sim')
        : 'Não';
      const senhaDetalhe = os.padrao_desbloqueio || os.senha_aparelho || os.senha_numerica || '';

      const telefoneLoja = '(19) 98768-0453';
      const logoUrl = 'https://primecamp.com.br/wp-content/uploads/2025/07/Design-sem-nome-4.png';
      const dataEntrada = dateFormatters.short(os.data_entrada);
      const horaEntrada = os.hora_entrada || os.hora_previsao || '-';

      const senhaLabel = os.possui_senha
        ? (os.possui_senha_tipo || 'Sim - senha')
        : 'Não';
      const areasDefeitoTexto = os.areas_defeito?.length
        ? `${os.areas_defeito.length} ponto(s) marcado(s)`
        : '-';

      const formatAddress = () => {
        const parts = [
          cliente?.logradouro,
          cliente?.bairro,
          cliente?.cidade,
          cliente?.uf,
          cliente?.cep,
        ].filter(Boolean);
        return parts.join(' - ') || '-';
      };

      const patternToSvg = (pattern: string | undefined) => {
        if (!pattern) return '';
        const points: Record<string, [number, number]> = {
          '1': [20, 20], '2': [50, 20], '3': [80, 20],
          '4': [20, 50], '5': [50, 50], '6': [80, 50],
          '7': [20, 80], '8': [50, 80], '9': [80, 80],
        };
        const seq = pattern.replace(/\s/g, '').split(/[-,.]/).filter(Boolean);
        if (seq.length < 2) return '';
        const lines: string[] = [];
        for (let i = 0; i < seq.length - 1; i++) {
          const a = points[seq[i]];
          const b = points[seq[i + 1]];
          if (a && b) {
            lines.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#111" stroke-width="1.5" />`);
          }
        }
        const circles = Object.keys(points).map(k => {
          const [x, y] = points[k];
          const active = seq.includes(k);
          return `<circle cx="${x}" cy="${y}" r="4" fill="${active ? '#2563eb' : '#fff'}" stroke="#111" stroke-width="1.5" />`;
        }).join('');
        return `
          <svg width="60" height="60" viewBox="0 0 100 100" style="display:inline-block;vertical-align:middle;">
            <rect x="5" y="5" width="90" height="90" rx="6" ry="6" fill="#fff" stroke="#111" stroke-width="1.5" />
            ${lines.join('')}
            ${circles}
          </svg>
        `;
      };

      const defectsToSvg = (areas: string[] | undefined) => {
        if (!areas || !areas.length) return '';
        const normalized = areas.slice(0, 4);
        const positions: [number, number][] = [
          [50, 20], [80, 50], [50, 80], [20, 50],
        ];
        const circles = normalized.map((_, idx) => {
          const [x, y] = positions[idx];
          return `<circle cx="${x}" cy="${y}" r="6" fill="#ef4444" stroke="#111" stroke-width="1.5" />`;
        }).join('');
        return `
          <svg width="60" height="60" viewBox="0 0 100 100" style="display:inline-block;vertical-align:middle;">
            <rect x="20" y="8" width="60" height="84" rx="8" ry="8" fill="#fff" stroke="#111" stroke-width="1.5" />
            ${circles}
          </svg>
        `;
      };

      const patternSvg = patternToSvg(os.padrao_desbloqueio);
      const defectsSvg = defectsToSvg(os.areas_defeito || []);

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>OS #${os.numero}</title>
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              @page { size: A4; margin: 8mm; }
              body { font-family: Arial, sans-serif; padding: 0; color: #111; font-size: 10px; line-height: 1.2; }
              h1 { margin: 0; font-size: 16px; }
              h2 { margin: 2px 0 4px; font-size: 12px; color: #333; }
              h3 { margin: 4px 0 2px; font-size: 10px; font-weight: bold; }
              .muted { color: #555; font-size: 9px; }
              .section { margin-bottom: 3px; }
              .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px; font-size: 9px; }
              .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px 8px; font-size: 9px; }
              .label { font-weight: bold; font-size: 9px; }
              .value { margin-left: 4px; font-size: 9px; }
              .card { border: 1px solid #ddd; padding: 4px 6px; border-radius: 3px; background: #fafafa; font-size: 9px; }
              ol { padding-left: 14px; margin: 2px 0; font-size: 8px; }
              ol li { margin: 1px 0; }
              .footer { margin-top: 4px; font-weight: bold; text-align: center; font-size: 9px; }
              .title-row { display: flex; justify-content: space-between; align-items: center; }
              .chip { border: 1px solid #999; padding: 2px 4px; border-radius: 2px; font-size: 8px; }
              .table { width: 100%; border-collapse: collapse; margin-top: 2px; }
              .table td { padding: 2px; border: 1px solid #e5e7eb; font-size: 8px; }
              .header { display: grid; grid-template-columns: 80px 1fr 140px; align-items: start; gap: 6px; border-bottom: 1px solid #111; padding-bottom: 4px; margin-bottom: 4px; }
              .header-logo img { max-width: 70px; max-height: 40px; object-fit: contain; }
              .header-info { font-size: 8px; line-height: 1.2; }
              .header-info .title { font-weight: bold; font-size: 10px; }
              .header-right { text-align: right; font-size: 9px; }
              .divider { height: 1px; background: #111; margin: 3px 0 4px; }
              .signature { margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
              .signature-line { border-top: 1px solid #000; padding-top: 2px; text-align: center; font-size: 8px; }
              .copy { page-break-inside: avoid; border: 1px solid #111; padding: 4px 5px; margin-bottom: 3px; }
              .copy-title { text-align: center; font-weight: bold; margin: 1px 0 3px; font-size: 9px; }
              .flex-row { display: flex; align-items: center; gap: 4px; }
              .bold { font-weight: bold; }
              .os-highlight { font-weight: bold; font-size: 11px; }
              svg { max-width: 50px; max-height: 50px; }
              @media print {
                .copy { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            ${['Via do Cliente', 'Via da Empresa'].map((via) => `
              <div class="copy">
                <div class="header">
                  <div class="header-logo">
                    <img src="${logoUrl}" alt="Prime Camp" />
                  </div>
                  <div class="header-info">
                    <div class="title">PRIME CAMP ASSISTÊNCIA TÉCNICA</div>
                    <div>CNPJ:31.833.574/0001-74 &nbsp;&nbsp; IE:122.047.010.118</div>
                    <div>AV. COM EMÍLIO PIERI, 823 - CAMPINAS/SP CEP: 13057-535 BAIRRO: CONJ. HABIT. VIDA NOVA</div>
                    <div>Tel/WhatsApp: ${telefoneLoja}</div>
                  </div>
                  <div class="header-right">
                    <div>Data: ${dataEntrada}</div>
                    <div>Hora: ${horaEntrada}</div>
                    <div class="os-highlight">OS Nº ${os.numero}</div>
                  </div>
                </div>
                <div class="copy-title">COMPROVANTE DE ENTRADA - ${via}</div>
                <div class="section grid-3">
                  <div><span class="label">Data:</span><span class="value">${dateFormatters.short(os.data_entrada)}</span></div>
                  <div><span class="label">Hora:</span><span class="value">${os.hora_entrada || horaEntrada || '-'}</span></div>
                  <div><span class="label">Status:</span><span class="value">${STATUS_OS_LABELS[os.status as StatusOS] || '-'}</span></div>
                </div>
                <h3>Cliente</h3>
                <div class="card grid-2">
                  <div><span class="label">Cliente:</span><span class="value">${cliente?.nome || os.cliente_nome || '-'}</span></div>
                  <div><span class="label">Contato:</span><span class="value">${os.telefone_contato || '-'}</span></div>
                  ${os.cliente_empresa ? `<div><span class="label">Empresa:</span><span class="value">${os.cliente_empresa}</span></div>` : ''}
                  <div><span class="label">Endereço:</span><span class="value">${formatAddress()}</span></div>
                </div>
                <h3>Equipamento</h3>
                <div class="card grid-3">
                  <div><span class="label">Equipamento:</span><span class="value">${os.tipo_aparelho || '-'}</span></div>
                  <div><span class="label">Modelo:</span><span class="value">${modelo?.nome || os.modelo_nome || '-'}</span></div>
                  <div><span class="label">Marca:</span><span class="value">${marca?.nome || os.marca_nome || '-'}</span></div>
                  ${os.cor ? `<div><span class="label">Cor:</span><span class="value"><strong>${os.cor}</strong></span></div>` : ''}
                  <div><span class="label">IMEI:</span><span class="value">${os.imei || os.numero_serie || '-'}</span></div>
                  <div><span class="label">Acessórios:</span><span class="value">${os.acessorios || os.observacoes_checklist || '-'}</span></div>
                  <div><span class="label">Série:</span><span class="value">${os.numero_serie || '-'}</span></div>
                </div>
                <h3>Problema Informado</h3>
                <div class="card">
                  <div>${os.descricao_problema || '-'}</div>
                  <div class="muted" style="margin-top:2px;"><span class="label">Possui Senha:</span> ${senhaLabel}</div>
                  ${patternSvg ? `<div style="margin-top:2px;">${patternSvg}</div>` : ''}
                </div>
                <h3>Condições do Aparelho</h3>
                <div class="card">
                  <div>${os.condicoes_equipamento || os.observacoes || '-'}</div>
                  <div class="muted" style="margin-top:2px;"><span class="label">Checklist:</span> ${checklistEntrada}</div>
                  <div class="muted" style="margin-top:2px;"><span class="label">Áreas com defeito:</span> ${areasDefeitoTexto}</div>
                  ${defectsSvg ? `<div style="margin-top:2px;">${defectsSvg}</div>` : ''}
                </div>
                <h3>Status da Ordem</h3>
                <div class="card grid-2">
                  <div><span class="label">Situação:</span><span class="value">${os.situacao || '-'}</span></div>
                  <div><span class="label">Serviço Executado:</span><span class="value">${os.servico_executado || os.problema_constatado || '-'}</span></div>
                </div>
                ${(os.orcamento_desconto || os.orcamento_parcelado) ? `
                <h3>Orçamento Pré Autorizado</h3>
                <div class="card">
                  <div><span class="label">Valor autorizado (PIX/Dinheiro):</span> ${formatCurrency(os.orcamento_desconto)}</div>
                  <div><span class="label">Valor autorizado (Cartão):</span> ${formatCurrency(os.orcamento_parcelado)}</div>
                </div>
                ` : ''}
                ${(os.subtotal || os.valor_total) ? `
                <h3>Valores</h3>
                <div class="card grid-3">
                  <div><span class="label">Subtotal:</span><span class="value">${formatCurrency(os.subtotal)}</span></div>
                  <div><span class="label">Desconto:</span><span class="value">${formatCurrency(os.desconto)}</span></div>
                  <div><span class="label">Total:</span><span class="value">${formatCurrency(os.valor_total)}</span></div>
                </div>
                ` : ''}
                ${(os.previsao_entrega || os.atendente_nome || os.vendedor_nome) ? `
                <h3>Previsão e Responsáveis</h3>
                <div class="card grid-3">
                  <div><span class="label">Previsão Entrega:</span><span class="value">${os.previsao_entrega ? dateFormatters.short(os.previsao_entrega) : '-'}</span></div>
                  <div><span class="label">Hora:</span><span class="value">${os.hora_previsao || '-'}</span></div>
                  <div><span class="label">Atendente/Vendedor:</span><span class="value">${os.atendente_nome || os.vendedor_nome || '-'}</span></div>
                </div>
                ` : ''}
                <h3>Condições de Serviço</h3>
                <div class="card">
                  <ol>
                    <li>A Empresa oferece Garantia de 90 dias em peças usadas no conserto, contados a partir da data de entrega.</li>
                    <li>Não realizamos troca de peças danificadas por Mal Uso, Molhadas, Trincadas, Quebradas e riscadas.</li>
                    <li>O Aparelho só será devolvido mediante a apresentação desta ou documento do proprietário, guarde-a com cuidado.</li>
                    <li>Ao ligar para a loja, informe o número da Ordem de Serviço para melhor atendê-lo.</li>
                    <li>Os aparelhos não retirados em no máximo 30 dias serão acrescido despesas de armazenamento de 6% ao mês.</li>
                    <li>Os aparelhos não retirados em até 90 dias a partir da data da comunicação para sua retirada, serão descartados.</li>
                  </ol>
                </div>
                <div class="signature">
                  <div class="signature-line">${cliente?.nome || os.cliente_nome || 'Cliente'}</div>
                  <div class="signature-line">${os.tecnico_nome || 'Técnico'}</div>
                </div>
                <div class="footer">${via}</div>
              </div>
            `).join('')}
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
        };
      }
    } catch (error) {
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    }
  };

  // Impressão A4
  const handlePrintA4 = async (os: any) => {
    try {
      const cliente = getClienteById(os.cliente_id);
      const marca = marcas.find(m => m.id === os.marca_id);
      const modelo = modelos.find(m => m.id === os.modelo_id);
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>OS #${os.numero}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; }
            }
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .info { margin-bottom: 15px; }
            .info strong { display: inline-block; width: 150px; }
            .termo { margin-top: 30px; padding: 15px; border: 1px solid #ccc; background: #f9f9f9; }
            .termo h3 { margin-top: 0; }
            .termo ol { margin: 10px 0; padding-left: 20px; }
            .termo li { margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ORDEM DE SERVIÇO #${os.numero}</h1>
            <p>Prime Camp Assistência Técnica</p>
          </div>
          
          <div class="info">
            <strong>Cliente:</strong> ${cliente?.nome || os.cliente_nome || '-'}
          </div>
          <div class="info">
            <strong>Telefone:</strong> ${os.telefone_contato || '-'}
          </div>
          <div class="info">
            <strong>Aparelho:</strong> ${marca?.nome || ''} ${modelo?.nome || ''}
          </div>
          <div class="info">
            <strong>IMEI:</strong> ${os.imei || '-'}
          </div>
          <div class="info">
            <strong>Problema:</strong> ${os.descricao_problema || '-'}
          </div>
          <div class="info">
            <strong>Data Entrada:</strong> ${dateFormatters.short(os.data_entrada)}
          </div>
          <div class="info">
            <strong>Previsão Entrega:</strong> ${os.previsao_entrega ? dateFormatters.short(os.previsao_entrega) : '-'}
          </div>
          
          <div class="termo">
            <h3>Sobre a Garantia do Serviço:</h3>
            <ol>
              <li>A Empresa oferece Garantia de 90 dias em peças usadas no conserto, contados a partir da data de entrega.</li>
              <li>Não realizamos troca de peças danificadas por Mal Uso, Molhadas, Trincadas, Quebradas e riscadas.</li>
              <li>O Aparelho só será devolvido mediante a apresentação desta ou documento do proprietário, guarde-a com cuidado.</li>
              <li>Ao ligar para a loja, informe o número da Ordem de Serviço para melhor atendê-lo.</li>
              <li>Os aparelhos não retirados em no máximo 30 dias serão acrescido despesas de armazenamento de 6% ao mês.</li>
              <li>Os aparelhos não retirados em até 90 dias a partir da data da comunicação para sua retirada, serão descartados.</li>
            </ol>
          </div>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    } catch (error) {
      toast({ title: 'Erro ao imprimir', variant: 'destructive' });
    }
  };

  const content = (
    <div className={cn("w-full flex flex-col", isModal ? "h-full overflow-hidden" : "min-h-[calc(100dvh-8rem)]")}>
        {/* Tabs principais */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Header com tabs */}
          <div className="border-b-2 mb-2">
            <div className="overflow-x-auto">
              <TabsList className="w-max min-w-full justify-start bg-transparent h-auto p-0 gap-0">
                <TabsTrigger 
                  value="dados" 
                  className="whitespace-nowrap gap-2 px-3 sm:px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs sm:text-sm data-[state=active]:text-primary"
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Dados da OS</span>
                  <span className="sm:hidden">Dados</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="checklist" 
                  className="whitespace-nowrap gap-2 px-3 sm:px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs sm:text-sm data-[state=active]:text-primary"
                >
                  <Check className="h-4 w-4" />
                  <span className="hidden sm:inline">Checklist</span>
                  <span className="sm:hidden">Check</span>
                </TabsTrigger>
                {isEditing && (
                  <>
                    <TabsTrigger 
                      value="resolucao" 
                      className="whitespace-nowrap gap-2 px-3 sm:px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs sm:text-sm data-[state=active]:text-primary"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <span className="hidden sm:inline">Resolução</span>
                      <span className="sm:hidden">Resol</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="itens" 
                      className="whitespace-nowrap gap-2 px-3 sm:px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs sm:text-sm data-[state=active]:text-primary"
                    >
                      <Package className="h-4 w-4" />
                      <span className="hidden sm:inline">Peças/Serviços ({itens.length})</span>
                      <span className="sm:hidden">Itens ({itens.length})</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="financeiro" 
                      className="whitespace-nowrap gap-2 px-3 sm:px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs sm:text-sm data-[state=active]:text-primary"
                    >
                      <DollarSign className="h-4 w-4" />
                      <span className="hidden sm:inline">Financeiro</span>
                      <span className="sm:hidden">Fin</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="tecnico" 
                      className="whitespace-nowrap gap-2 px-3 sm:px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs sm:text-sm data-[state=active]:text-primary"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="hidden sm:inline">Informações Técnicas</span>
                      <span className="sm:hidden">Técnico</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="fotos" 
                      className="whitespace-nowrap gap-2 px-3 sm:px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-xs sm:text-sm data-[state=active]:text-primary"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="hidden sm:inline">Fotos</span>
                      <span className="sm:hidden">Fotos</span>
                    </TabsTrigger>
                  </>
                )}
              </TabsList>
            </div>
          </div>

          {/* Tab Dados */}
          <TabsContent value="dados" className="flex-1 flex flex-col min-h-0 p-2">
            <div className="grid grid-cols-1 xl:grid-cols-[80%_20%] gap-3 flex-1 min-h-0 items-stretch">
              {/* Widget 1: Dados do Cliente e Aparelho */}
              <Card className="flex flex-col h-full overflow-hidden border-2">
                <CardHeader className="pb-2 pt-3 flex-shrink-0 border-b-2">
                  <CardTitle className="text-base font-semibold">Dados da OS</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-3 flex-1 overflow-y-auto">
                  {/* Cliente */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-sm font-medium">Cliente</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar cliente..."
                          value={selectedCliente ? selectedCliente.nome : clienteSearch}
                          onChange={(e) => {
                            if (selectedCliente) {
                              setSelectedCliente(null);
                              setFormData(prev => ({ ...prev, cliente_id: '' }));
                            }
                            setClienteSearch(e.target.value);
                            setShowClienteSearch(true);
                          }}
                          onFocus={() => setShowClienteSearch(true)}
                          className="pl-10 h-10 text-sm"
                        />
                        {selectedCliente && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                            onClick={() => {
                              setSelectedCliente(null);
                              setFormData(prev => ({ ...prev, cliente_id: '' }));
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
                                {cliente.cpf_cnpj} • {cliente.telefone}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Telefone *</Label>
                      <Input
                        value={formData.telefone_contato || selectedCliente?.telefone || selectedCliente?.whatsapp || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, telefone_contato: e.target.value }))}
                        placeholder="(99) 99999-9999"
                        className="h-10 text-sm"
                        required
                      />
                    </div>
                  </div>
                  
                  {/* Aparelho - Linha 1 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Marca *</Label>
                      <Select 
                        value={formData.marca_id || ''} 
                        onValueChange={(v) => {
                          setFormData(prev => ({ 
                            ...prev, 
                            marca_id: v, 
                            modelo_id: '' 
                          }));
                        }}
                      >
                        <SelectTrigger className="w-full h-10 text-sm">
                          <SelectValue placeholder="Marca">
                            {formData.marca_id && marcas.length > 0 
                              ? (marcas.find(m => m.id === formData.marca_id)?.nome || currentOS?.marca_nome || '')
                              : ''}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {marcas && marcas.length > 0 ? (
                            marcas.filter(m => m.situacao === 'ativo').map(m => (
                              <SelectItem key={m.id} value={m.id} className="text-sm">{m.nome}</SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma marca cadastrada. Acesse Marcas e Modelos para cadastrar.</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Modelo *</Label>
                      <Select 
                        value={formData.modelo_id || ''} 
                        onValueChange={(v) => {
                          setFormData(prev => ({ ...prev, modelo_id: v }));
                        }}
                        disabled={!formData.marca_id}
                      >
                        <SelectTrigger className="w-full h-10 text-sm" disabled={!formData.marca_id}>
                          <SelectValue placeholder="Modelo">
                            {formData.modelo_id && modelosFiltrados.length > 0
                              ? (modelosFiltrados.find(m => m.id === formData.modelo_id)?.nome || currentOS?.modelo_nome || '')
                              : ''}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {modelosFiltrados && modelosFiltrados.length > 0 ? (
                            modelosFiltrados.filter(m => m.situacao === 'ativo').map(m => (
                              <SelectItem key={m.id} value={m.id} className="text-sm">{m.nome}</SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground">
                              {formData.marca_id ? 'Nenhum modelo disponível para esta marca' : 'Selecione uma marca primeiro'}
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">IMEI</Label>
                      <Input
                        value={formData.imei}
                        onChange={(e) => setFormData(prev => ({ ...prev, imei: e.target.value }))}
                        placeholder="IMEI"
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Nº Série</Label>
                      <Input
                        value={formData.numero_serie}
                        onChange={(e) => setFormData(prev => ({ ...prev, numero_serie: e.target.value }))}
                        placeholder="Nº Série"
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>

                  {/* Aparelho - Linha 2 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Cor</Label>
                      <Input
                        value={formData.cor}
                        onChange={(e) => setFormData(prev => ({ ...prev, cor: e.target.value }))}
                        placeholder="Cor"
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Operadora</Label>
                      <Input
                        value={formData.operadora}
                        onChange={(e) => setFormData(prev => ({ ...prev, operadora: e.target.value }))}
                        placeholder="Operadora"
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Previsão Entrega</Label>
                      <Input
                        type="date"
                        value={formData.previsao_entrega}
                        onChange={(e) => setFormData(prev => ({ ...prev, previsao_entrega: e.target.value }))}
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Hora</Label>
                      <Input
                        type="time"
                        value={formData.hora_previsao || '18:00'}
                        onChange={(e) => setFormData(prev => ({ ...prev, hora_previsao: e.target.value }))}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>

                  {/* Deixou Aparelho */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Deixou aparelho</Label>
                    <Select 
                      value={formData.deixou_aparelho ? 'sim' : formData.apenas_agendamento ? 'agendado' : 'nao'} 
                      onValueChange={(v) => {
                        setFormData(prev => ({ 
                          ...prev, 
                          deixou_aparelho: v === 'sim',
                          apenas_agendamento: v === 'agendado'
                        }));
                      }}
                    >
                      <SelectTrigger className="w-full h-10 text-sm">
                        <SelectValue placeholder="Selecione">
                          {formData.deixou_aparelho ? 'SIM' : formData.apenas_agendamento ? 'HORÁRIO AGENDADO' : 'NÃO'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        <SelectItem value="sim" className="text-sm">SIM</SelectItem>
                        <SelectItem value="nao" className="text-sm">NÃO</SelectItem>
                        <SelectItem value="agendado" className="text-sm">HORÁRIO AGENDADO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Descrição e Condições */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Descrição do Problema *</Label>
                      <Textarea
                        value={formData.descricao_problema}
                        onChange={(e) => setFormData(prev => ({ ...prev, descricao_problema: e.target.value }))}
                        placeholder="Descreva o problema..."
                        rows={3}
                        className="resize-none text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Condições do Equipamento</Label>
                      <Textarea
                        value={formData.condicoes_equipamento}
                        onChange={(e) => setFormData(prev => ({ ...prev, condicoes_equipamento: e.target.value }))}
                        placeholder="Estado físico..."
                        rows={3}
                        className="resize-none text-sm"
                      />
                    </div>
                  </div>

                  {/* Orçamento Pré Autorizado */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Orçamento pré autorizado</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Cartão Débito/Crédito até 6x</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={formData.orcamento_parcelado ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const numValue = val === '' ? undefined : parseFloat(val);
                            setFormData(prev => ({ ...prev, orcamento_parcelado: numValue }));
                          }}
                          placeholder="0,00"
                          className="h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Dinheiro ou PIX</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={formData.orcamento_desconto ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const numValue = val === '' ? undefined : parseFloat(val);
                            setFormData(prev => ({ ...prev, orcamento_desconto: numValue }));
                          }}
                          placeholder="0,00"
                          className="h-10 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Widget 2: Senha e Áreas com Defeito */}
              <Card className="flex flex-col h-full overflow-visible border-2">
                <CardHeader className="pb-2 pt-3 flex-shrink-0 border-b-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Senha e Áreas com Defeito
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-visible space-y-4 px-2">
                  {/* Seção Senha */}
                  <div className="space-y-3 flex-shrink-0">
                    <Label className="text-sm font-medium">Possui senha</Label>
                    <Select 
                      value={formData.possui_senha_tipo || 'nao'} 
                      onValueChange={(v) => {
                        setFormData(prev => ({ 
                          ...prev, 
                          possui_senha_tipo: v,
                          possui_senha: v !== 'nao' && v !== ''
                        }));
                      }}
                    >
                      <SelectTrigger className="w-full h-10 text-sm">
                        <SelectValue>
                          {formData.possui_senha_tipo === 'sim' && 'SIM'}
                          {formData.possui_senha_tipo === 'deslizar' && 'SIM - DESLIZAR (DESENHO)'}
                          {(formData.possui_senha_tipo === 'nao' || !formData.possui_senha_tipo) && 'NÃO'}
                          {formData.possui_senha_tipo === 'nao_sabe' && 'NÃO SABE, VAI PASSAR DEPOIS'}
                          {formData.possui_senha_tipo === 'nao_autorizou' && 'CLIENTE NÃO QUIZ DEIXAR SENHA'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        <SelectItem value="sim" className="text-sm">SIM</SelectItem>
                        <SelectItem value="deslizar" className="text-sm">SIM - DESLIZAR (DESENHO)</SelectItem>
                        <SelectItem value="nao" className="text-sm">NÃO</SelectItem>
                        <SelectItem value="nao_sabe" className="text-sm">NÃO SABE, VAI PASSAR DEPOIS</SelectItem>
                        <SelectItem value="nao_autorizou" className="text-sm">CLIENTE NÃO QUIZ DEIXAR SENHA</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Senha - Campo de texto quando SIM */}
                    {formData.possui_senha_tipo === 'sim' && (
                      <div className="space-y-2">
                        <Input
                          type="text"
                          value={formData.senha_aparelho}
                          onChange={(e) => setFormData(prev => ({ ...prev, senha_aparelho: e.target.value }))}
                          placeholder="Digite a senha"
                          className="h-10 text-sm"
                        />
                      </div>
                    )}

                    {/* Senha - PatternLock quando DESLIZAR */}
                    {formData.possui_senha_tipo === 'deslizar' && (
                      <div className="space-y-2 flex-shrink-0">
                        <div className="flex justify-center items-center w-full overflow-visible">
                          <PatternLock
                            value={formData.padrao_desbloqueio}
                            onChange={(pattern) => setFormData(prev => ({ ...prev, padrao_desbloqueio: pattern }))}
                            className="flex-shrink-0"
                          />
                        </div>
                        <Input
                          value={formData.senha_aparelho}
                          onChange={(e) => setFormData(prev => ({ ...prev, senha_aparelho: e.target.value }))}
                          placeholder="Senha adicional"
                          className="h-10 text-sm"
                        />
                      </div>
                    )}
                  </div>

                  {/* Divisor */}
                  <div className="border-t flex-shrink-0"></div>

                  {/* Seção Áreas com Defeito */}
                  <div className="flex-1 flex flex-col min-h-0">
                    <Label className="text-sm font-medium mb-2 flex-shrink-0">Áreas com Defeito</Label>
                    <div className="flex-1 flex items-center justify-center min-h-0 overflow-visible">
                      <PhoneDrawing
                        areas={formData.areas_defeito}
                        onAreasChange={(areas) => setFormData(prev => ({ ...prev, areas_defeito: areas }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Checklist */}
          <TabsContent value="checklist" className="flex-1 flex flex-col min-h-0 space-y-2 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-2">
              {/* Estado Físico */}
              <Card className="flex flex-col h-full m-2">
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-base text-destructive">Estado Físico</CardTitle>
                  <CardDescription className="text-xs">Marque os problemas encontrados</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pt-2">
                  <ScrollArea className="h-[calc(100vh-20rem)] md:h-[400px]">
                    <div className="grid grid-cols-1 gap-1 pr-4">
                      {CHECKLIST_ITENS.filter(i => i.categoria === 'fisico').map(item => (
                        <div key={item.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50">
                          <Checkbox
                            id={item.id}
                            checked={formData.checklist_entrada.includes(item.id)}
                            onCheckedChange={() => toggleChecklist(item.id)}
                          />
                          <Label htmlFor={item.id} className="text-sm cursor-pointer flex-1">
                            {item.nome}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Estado Funcional */}
              <Card className="flex flex-col h-full m-2">
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-base text-green-600">Estado Funcional</CardTitle>
                  <CardDescription className="text-xs">Marque o que está funcionando</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pt-2">
                  <ScrollArea className="h-[calc(100vh-20rem)] md:h-[400px]">
                    <div className="grid grid-cols-1 gap-1 pr-4">
                      {CHECKLIST_ITENS.filter(i => i.categoria === 'funcional').map(item => (
                        <div key={item.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50">
                          <Checkbox
                            id={item.id}
                            checked={formData.checklist_entrada.includes(item.id)}
                            onCheckedChange={() => toggleChecklist(item.id)}
                          />
                          <Label htmlFor={item.id} className="text-sm cursor-pointer flex-1">
                            {item.nome}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
            
            {/* Observações do Checklist */}
            <Card>
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-base">Observações Gerais do Checklist</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <Textarea
                  value={formData.observacoes_checklist || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes_checklist: e.target.value }))}
                  placeholder="Adicione observações gerais sobre o checklist..."
                  rows={3}
                  className="resize-none"
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Tab Resolução do Problema */}
          {isEditing && (
            <TabsContent value="resolucao" className="flex-1 flex flex-col min-h-0 space-y-2 mt-2">
              <Card className="border-2 m-2 flex flex-col h-full">
                <CardHeader className="pb-2 pt-3 border-b-2 flex-shrink-0">
                  <CardTitle className="text-base font-semibold">Resolução do Problema</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col min-h-0 pt-3">
                  <div className="space-y-2 flex-1 flex flex-col min-h-0">
                    <Label className="text-sm font-medium flex-shrink-0">Problema Constatado</Label>
                    <Textarea
                      value={formData.problema_constatado || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, problema_constatado: e.target.value }))}
                      placeholder="Descreva o problema constatado após análise técnica..."
                      className="min-h-[220px] md:min-h-[320px] resize-none flex-1"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-shrink-0 mt-3">
                    <div className="space-y-2">
                      <Label>Técnico Responsável</Label>
                      <Select
                        value={formData.tecnico_id || ''}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, tecnico_id: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o técnico" />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            console.log('[OrdemServicoForm] Renderizando Select de técnicos:', {
                              isLoadingCargos,
                              tecnicosLength: tecnicos.length,
                              colaboradoresLength: colaboradores.length,
                              tecnicos: tecnicos.map(t => t.nome),
                              colaboradores: colaboradores.map(c => c.nome)
                            });
                            
                            if (isLoadingCargos) {
                              return <div className="px-2 py-1.5 text-sm text-muted-foreground">Carregando técnicos...</div>;
                            }
                            
                            if (tecnicos.length > 0) {
                              return tecnicos.map(tecnico => (
                                <SelectItem key={tecnico.id} value={tecnico.id}>
                                  {tecnico.nome}
                                </SelectItem>
                              ));
                            }
                            
                            if (colaboradores.length > 0) {
                              // Se não há técnicos específicos, mostrar todos os colaboradores
                              return colaboradores.map(colab => (
                                <SelectItem key={colab.id} value={colab.id}>
                                  {colab.nome}
                                </SelectItem>
                              ));
                            }
                            
                            return <div className="px-2 py-1.5 text-sm text-muted-foreground">Nenhum técnico cadastrado</div>;
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Serviço Executado</Label>
                      <Input
                        value={formData.servico_executado || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, servico_executado: e.target.value }))}
                        placeholder="Descreva o serviço executado (ex.: troca de tela, troca de bateria, conector, limpeza, atualização, etc.)"
                      />
                      <p className="text-xs text-muted-foreground">
                        Campo livre para digitar exatamente o serviço realizado.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
          
          {/* Tab Informações Técnicas */}
          {isEditing && (
            <TabsContent value="tecnico" className="flex-1 flex flex-col min-h-0 space-y-2 mt-2">
              <Card className="border-2 m-2 flex flex-col h-full">
                <CardHeader className="pb-2 pt-3 border-b-2 flex-shrink-0">
                  <CardTitle className="text-base font-semibold">Informações Técnicas Internas</CardTitle>
                  <CardDescription className="text-xs">Anotações internas que não aparecem para o cliente</CardDescription>
                </CardHeader>
                <CardContent className="pt-3 flex-1 flex flex-col min-h-0">
                  <Textarea
                    value={formData.observacoes_internas || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, observacoes_internas: e.target.value }))}
                    placeholder="Ex: faltando parafuso, câmera não funciona, placa oxidada, peças removidas..."
                    className="resize-none w-full flex-1 min-h-[200px]"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}
          
          {/* Tab Fotos */}
          {isEditing && (
            <TabsContent value="fotos" className="flex-1 flex flex-col min-h-0 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Fotos da Ordem de Serviço</CardTitle>
                  <CardDescription>
                    Fotos serão enviadas automaticamente para o Telegram
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Configuração dos Chat IDs do Telegram - Colapsável */}
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full justify-between text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Configuração dos Chat IDs do Telegram
                        </span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 mt-2">
                      <div className="bg-muted/50 p-3 rounded-lg space-y-3">
                        <p className="text-xs text-muted-foreground">
                          Configure o Chat ID de cada canal/grupo onde as fotos serão enviadas. Use o comando <code className="bg-background px-1 rounded">/getchatid</code> no Telegram para obter o ID.
                        </p>
                        
                        {/* Chat ID Entrada */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Chat ID - Fotos de Entrada</Label>
                          <Input
                            type="text"
                            placeholder="Ex: -1002120498327"
                            value={telegramChatIdEntrada}
                            onChange={(e) => setTelegramChatIdEntrada(e.target.value)}
                            className="h-8 text-xs"
                          />
                          {telegramChatIdEntrada && (
                            <p className="text-xs text-green-600">
                              ✅ <code className="bg-background px-1 rounded text-xs">{telegramChatIdEntrada}</code>
                            </p>
                          )}
                        </div>

                        {/* Chat ID Processo */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Chat ID - Fotos de Processo</Label>
                          <Input
                            type="text"
                            placeholder="Ex: -1001234567890"
                            value={telegramChatIdProcesso}
                            onChange={(e) => setTelegramChatIdProcesso(e.target.value)}
                            className="h-8 text-xs"
                          />
                          {telegramChatIdProcesso && (
                            <p className="text-xs text-green-600">
                              ✅ <code className="bg-background px-1 rounded text-xs">{telegramChatIdProcesso}</code>
                            </p>
                          )}
                        </div>

                        {/* Chat ID Saída */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Chat ID - Fotos de Saída</Label>
                          <Input
                            type="text"
                            placeholder="Ex: -4925747509"
                            value={telegramChatIdSaida}
                            onChange={(e) => setTelegramChatIdSaida(e.target.value)}
                            className="h-8 text-xs"
                          />
                          {telegramChatIdSaida && (
                            <p className="text-xs text-green-600">
                              ✅ <code className="bg-background px-1 rounded text-xs">{telegramChatIdSaida}</code>
                            </p>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground">
                          💡 Os Chat IDs serão salvos automaticamente após 2 segundos.
                        </p>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Botões de upload por tipo */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Fotos de Entrada</Label>
                      <div className="flex gap-2">
                        <input
                          type="file"
                          id="upload-entrada"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length === 0) return;
                            
                            if (!currentOS?.numero) {
                              toast({
                                title: 'Erro',
                                description: 'Salve a OS antes de adicionar fotos',
                                variant: 'destructive'
                              });
                              return;
                            }

                            const chatId = telegramChatIdEntrada || currentOS?.telegram_chat_id_entrada;
                            if (!chatId) {
                              toast({
                                title: 'Erro',
                                description: 'Configure o Chat ID de Entrada acima',
                                variant: 'destructive'
                              });
                              return;
                            }

                            toast({
                              title: 'Enviando fotos...',
                              description: `Enviando ${files.length} foto(s) de entrada para o Telegram`,
                            });

                            try {
                              const results = await sendTelegramPhotos(
                                files,
                                currentOS.numero,
                                'entrada',
                                chatId,
                                `OS-${currentOS.numero} - Fotos de Entrada`
                              );

                              const successful = results.filter(r => r.success);
                              const failed = results.filter(r => !r.success);

                              if (successful.length > 0) {
                                const newPhotos = successful.map((r, idx) => ({
                                  url: r.fileUrl || undefined,
                                  thumbnailUrl: r.thumbnailUrl || undefined, // Thumbnail como fallback
                                  postLink: r.postLink || undefined, // Link do post como fallback
                                  fileName: files[idx]?.name || `foto_${idx + 1}.jpg`,
                                  tipo: 'entrada' as const,
                                  enviadoEm: new Date().toISOString(),
                                  messageId: r.messageId,
                                  fileId: r.fileId,
                                  chatId: chatId, // Salvar chatId para poder deletar depois
                                }));
                                const updatedFotos = [
                                  ...(currentOS.fotos_telegram_entrada || []),
                                  ...newPhotos
                                ];

                                await updateOS(currentOS.id, {
                                  fotos_telegram_entrada: updatedFotos,
                                  telegram_chat_id_entrada: chatId,
                                });
                                
                                // Recarregar OS atualizada para atualizar o preview
                                const osAtualizada = getOSById(currentOS.id);
                                if (osAtualizada) {
                                  setCurrentOS(osAtualizada);
                                }

                                if (failed.length > 0) {
                                  toast({
                                    title: 'Parcialmente enviado',
                                    description: `${successful.length} foto(s) enviada(s), ${failed.length} falharam`,
                                  });
                                } else {
                                  toast({
                                    title: '✅ Fotos enviadas!',
                                    description: `${successful.length} foto(s) de entrada enviada(s) com sucesso`,
                                  });
                                }
                              } else {
                                toast({
                                  title: 'Erro no envio',
                                  description: failed[0]?.error || 'Falha ao enviar fotos',
                                  variant: 'destructive'
                                });
                              }
                            } catch (error: any) {
                              toast({
                                title: 'Erro',
                                description: error.message || 'Erro ao enviar fotos',
                                variant: 'destructive'
                              });
                            } finally {
                              e.target.value = '';
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          disabled={!telegramChatIdEntrada || telegramLoading}
                          onClick={() => {
                            document.getElementById('upload-entrada')?.click();
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {telegramLoading ? 'Enviando...' : 'Adicionar Fotos Entrada'}
                        </Button>
                      </div>
                      {currentOS?.fotos_telegram_entrada && currentOS.fotos_telegram_entrada.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {currentOS.fotos_telegram_entrada.length} foto(s) cadastrada(s)
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Fotos de Processo</Label>
                      <div className="flex gap-2">
                        <input
                          type="file"
                          id="upload-processo"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length === 0) return;
                            
                            if (!currentOS?.numero) {
                              toast({
                                title: 'Erro',
                                description: 'Salve a OS antes de adicionar fotos',
                                variant: 'destructive'
                              });
                              return;
                            }

                            const chatId = telegramChatIdProcesso || currentOS?.telegram_chat_id_processo;
                            if (!chatId) {
                              toast({
                                title: 'Erro',
                                description: 'Configure o Chat ID de Processo acima',
                                variant: 'destructive'
                              });
                              return;
                            }

                            toast({
                              title: 'Enviando fotos...',
                              description: `Enviando ${files.length} foto(s) de processo para o Telegram`,
                            });

                            try {
                              const results = await sendTelegramPhotos(
                                files,
                                currentOS.numero,
                                'processo',
                                chatId,
                                `OS-${currentOS.numero} - Fotos de Processo`
                              );

                              const successful = results.filter(r => r.success);
                              const failed = results.filter(r => !r.success);

                              if (successful.length > 0) {
                                const newPhotos = successful.map((r, idx) => ({
                                  url: r.fileUrl || undefined,
                                  thumbnailUrl: r.thumbnailUrl || undefined, // Thumbnail como fallback
                                  postLink: r.postLink || undefined, // Link do post como fallback
                                  fileName: files[idx]?.name || `foto_${idx + 1}.jpg`,
                                  tipo: 'processo' as const,
                                  enviadoEm: new Date().toISOString(),
                                  messageId: r.messageId,
                                  fileId: r.fileId,
                                  chatId: chatId, // Salvar chatId para poder deletar depois
                                }));
                                const updatedFotos = [
                                  ...(currentOS.fotos_telegram_processo || []),
                                  ...newPhotos
                                ];

                                await updateOS(currentOS.id, {
                                  fotos_telegram_processo: updatedFotos,
                                  telegram_chat_id_processo: chatId,
                                });
                                
                                // Recarregar OS atualizada para atualizar o preview
                                const osAtualizada = getOSById(currentOS.id);
                                if (osAtualizada) {
                                  setCurrentOS(osAtualizada);
                                }
                                
                                // Logs já foram salvos no banco pelo useTelegram

                                if (failed.length > 0) {
                                  toast({
                                    title: 'Parcialmente enviado',
                                    description: `${successful.length} foto(s) enviada(s), ${failed.length} falharam`,
                                    variant: 'default'
                                  });
                                } else {
                                  toast({
                                    title: '✅ Fotos enviadas!',
                                    description: `${successful.length} foto(s) de processo enviada(s) com sucesso`,
                                    variant: 'default'
                                  });
                                }
                              } else {
                                toast({
                                  title: 'Erro no envio',
                                  description: failed[0]?.error || 'Falha ao enviar fotos',
                                  variant: 'destructive'
                                });
                              }
                            } catch (error: any) {
                              toast({
                                title: 'Erro',
                                description: error.message || 'Erro ao enviar fotos',
                                variant: 'destructive'
                              });
                            } finally {
                              e.target.value = '';
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          disabled={!telegramChatIdProcesso || telegramLoading}
                          onClick={() => {
                            document.getElementById('upload-processo')?.click();
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {telegramLoading ? 'Enviando...' : 'Adicionar Fotos Processo'}
                        </Button>
                      </div>
                      {currentOS?.fotos_telegram_processo && currentOS.fotos_telegram_processo.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {currentOS.fotos_telegram_processo.length} foto(s) cadastrada(s)
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Fotos de Saída</Label>
                      <div className="flex gap-2">
                        <input
                          type="file"
                          id="upload-saida"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length === 0) return;
                            
                            if (!currentOS?.numero) {
                              toast({
                                title: 'Erro',
                                description: 'Salve a OS antes de adicionar fotos',
                                variant: 'destructive'
                              });
                              return;
                            }

                            const chatId = telegramChatIdSaida || currentOS?.telegram_chat_id_saida;
                            if (!chatId) {
                              toast({
                                title: 'Erro',
                                description: 'Configure o Chat ID de Saída acima',
                                variant: 'destructive'
                              });
                              return;
                            }

                            toast({
                              title: 'Enviando fotos...',
                              description: `Enviando ${files.length} foto(s) de saída para o Telegram`,
                            });

                            try {
                              const results = await sendTelegramPhotos(
                                files,
                                currentOS.numero,
                                'saida',
                                chatId,
                                `OS-${currentOS.numero} - Fotos de Saída`
                              );

                              const successful = results.filter(r => r.success);
                              const failed = results.filter(r => !r.success);

                              if (successful.length > 0) {
                                const newPhotos = successful.map((r, idx) => ({
                                  url: r.fileUrl || undefined,
                                  thumbnailUrl: r.thumbnailUrl || undefined, // Thumbnail como fallback
                                  postLink: r.postLink || undefined, // Link do post como fallback
                                  fileName: files[idx]?.name || `foto_${idx + 1}.jpg`,
                                  tipo: 'saida' as const,
                                  enviadoEm: new Date().toISOString(),
                                  messageId: r.messageId,
                                  fileId: r.fileId,
                                  chatId: chatId, // Salvar chatId para poder deletar depois
                                }));
                                const updatedFotos = [
                                  ...(currentOS.fotos_telegram_saida || []),
                                  ...newPhotos
                                ];

                                await updateOS(currentOS.id, {
                                  fotos_telegram_saida: updatedFotos,
                                  telegram_chat_id_saida: chatId,
                                });
                                
                                // Recarregar OS atualizada para atualizar o preview
                                const osAtualizada = getOSById(currentOS.id);
                                if (osAtualizada) {
                                  setCurrentOS(osAtualizada);
                                }
                                
                                // Logs já foram salvos no banco pelo useTelegram

                                if (failed.length > 0) {
                                  toast({
                                    title: 'Parcialmente enviado',
                                    description: `${successful.length} foto(s) enviada(s), ${failed.length} falharam`,
                                  });
                                } else {
                                  toast({
                                    title: '✅ Fotos enviadas!',
                                    description: `${successful.length} foto(s) de saída enviada(s) com sucesso`,
                                  });
                                }
                              } else {
                                toast({
                                  title: 'Erro no envio',
                                  description: failed[0]?.error || 'Falha ao enviar fotos',
                                  variant: 'destructive'
                                });
                              }
                            } catch (error: any) {
                              toast({
                                title: 'Erro',
                                description: error.message || 'Erro ao enviar fotos',
                                variant: 'destructive'
                              });
                            } finally {
                              e.target.value = '';
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          disabled={!telegramChatIdSaida || telegramLoading}
                          onClick={() => {
                            document.getElementById('upload-saida')?.click();
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {telegramLoading ? 'Enviando...' : 'Adicionar Fotos Saída'}
                        </Button>
                      </div>
                      {currentOS?.fotos_telegram_saida && currentOS.fotos_telegram_saida.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {currentOS.fotos_telegram_saida.length} foto(s) cadastrada(s)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Galeria de fotos com preview */}
                  {(currentOS?.fotos_telegram_entrada && currentOS.fotos_telegram_entrada.length > 0) ||
                   (currentOS?.fotos_telegram_processo && currentOS.fotos_telegram_processo.length > 0) ||
                   (currentOS?.fotos_telegram_saida && currentOS.fotos_telegram_saida.length > 0) ? (
                    <div className="space-y-4">
                      {currentOS?.fotos_telegram_entrada && currentOS.fotos_telegram_entrada.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Image className="h-4 w-4" />
                            Fotos de Entrada ({currentOS.fotos_telegram_entrada.length})
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {currentOS.fotos_telegram_entrada.map((foto, index) => {
                              const fotoData = typeof foto === 'string' 
                                ? { url: foto, fileName: `foto_${index + 1}.jpg`, tipo: 'entrada' as const } 
                                : foto;
                              // Prioridade: url > thumbnailUrl
                              // Se não tiver nenhum, tentar usar postLink como fallback (pode ter thumbnail embutido)
                              const imageUrl = fotoData.url || fotoData.thumbnailUrl;
                              const hasImage = !!(fotoData.url || fotoData.thumbnailUrl);
                              const hasPostLink = !!fotoData.postLink;
                              // Se não tiver imagem mas tiver postLink, mostrar link
                              const chatId = fotoData.chatId || currentOS.telegram_chat_id_entrada;
                              
                              const handleDelete = async (e: React.MouseEvent) => {
                                e.stopPropagation();
                                if (!fotoData.messageId || !chatId) {
                                  toast({
                                    title: 'Erro',
                                    description: 'Não é possível deletar: dados da mensagem não encontrados',
                                    variant: 'destructive',
                                  });
                                  return;
                                }
                                
                                if (!confirm('Tem certeza que deseja deletar esta foto do Telegram?')) {
                                  return;
                                }
                                
                                const result = await deleteTelegramMessage(chatId, fotoData.messageId);
                                if (result.success) {
                                  // Remover foto da lista
                                  const updatedFotos = currentOS.fotos_telegram_entrada?.filter((_, i) => i !== index) || [];
                                  await updateOS(currentOS.id, {
                                    fotos_telegram_entrada: updatedFotos,
                                  });
                                  const osAtualizada = getOSById(currentOS.id);
                                  if (osAtualizada) {
                                    setCurrentOS(osAtualizada);
                                  }
                                }
                              };
                              
                              return (
                                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border group cursor-pointer hover:border-primary transition-colors bg-muted">
                                  {hasImage && imageUrl ? (
                                    <>
                                      <img 
                                        src={imageUrl} 
                                        alt={fotoData.fileName || `Entrada ${index + 1}`}
                                        className="w-full h-full object-cover"
                                        onClick={() => {
                                          if (fotoData.postLink) {
                                            window.open(fotoData.postLink, '_blank');
                                          } else if (imageUrl) {
                                            window.open(imageUrl, '_blank');
                                          }
                                        }}
                                        onError={(e) => {
                                          // Se a imagem falhar, esconder e mostrar fallback
                                          const img = e.target as HTMLImageElement;
                                          img.style.display = 'none';
                                          // Mostrar fallback
                                          const parent = img.parentElement;
                                          if (parent) {
                                            const fallback = parent.querySelector('.image-fallback') as HTMLElement;
                                            if (fallback) {
                                              fallback.style.display = 'flex';
                                            }
                                          }
                                        }}
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                        <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium">
                                          {fotoData.postLink ? 'Clique para ver no Telegram' : 'Clique para ampliar'}
                                        </span>
                                      </div>
                                      {/* Fallback escondido inicialmente */}
                                      <div className="image-fallback hidden w-full h-full flex-col items-center justify-center p-2 text-center absolute inset-0 bg-muted">
                                        <Image className="h-8 w-8 text-muted-foreground mb-1" />
                                        <p className="text-xs font-medium truncate w-full">{fotoData.fileName}</p>
                                        <p className="text-xs text-muted-foreground">Enviada para Telegram</p>
                                        {fotoData.postLink && (
                                          <a 
                                            href={fotoData.postLink} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xs text-primary hover:underline mt-1"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            Ver no Telegram
                                          </a>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                                      <Image className="h-8 w-8 text-muted-foreground mb-1" />
                                      <p className="text-xs font-medium truncate w-full">{fotoData.fileName}</p>
                                      <p className="text-xs text-muted-foreground">Enviada para Telegram</p>
                                      {fotoData.enviadoEm && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {new Date(fotoData.enviadoEm).toLocaleString('pt-BR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </p>
                                      )}
                                      {fotoData.postLink && (
                                        <a 
                                          href={fotoData.postLink} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-xs text-primary hover:underline mt-1"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          Ver no Telegram
                                        </a>
                                      )}
                                    </div>
                                  )}
                                  <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                                    {fotoData.tipo}
                                  </div>
                                  {fotoData.messageId && chatId && (
                                    <button
                                      onClick={handleDelete}
                                      className="absolute top-1 left-1 bg-destructive/80 hover:bg-destructive text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Deletar foto do Telegram"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {currentOS?.fotos_telegram_processo && currentOS.fotos_telegram_processo.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Image className="h-4 w-4" />
                            Fotos de Processo ({currentOS.fotos_telegram_processo.length})
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {currentOS.fotos_telegram_processo.map((foto, index) => {
                              const fotoData = typeof foto === 'string' 
                                ? { url: foto, fileName: `foto_${index + 1}.jpg`, tipo: 'processo' as const } 
                                : foto;
                              const imageUrl = fotoData.url || fotoData.thumbnailUrl;
                              const hasImage = !!(fotoData.url || fotoData.thumbnailUrl);
                              const hasPostLink = !!fotoData.postLink;
                              const chatId = fotoData.chatId || currentOS.telegram_chat_id_processo;
                              
                              const handleDelete = async (e: React.MouseEvent) => {
                                e.stopPropagation();
                                if (!fotoData.messageId || !chatId) {
                                  toast({
                                    title: 'Erro',
                                    description: 'Não é possível deletar: dados da mensagem não encontrados',
                                    variant: 'destructive',
                                  });
                                  return;
                                }
                                
                                if (!confirm('Tem certeza que deseja deletar esta foto do Telegram?')) {
                                  return;
                                }
                                
                                const result = await deleteTelegramMessage(chatId, fotoData.messageId);
                                if (result.success) {
                                  const updatedFotos = currentOS.fotos_telegram_processo?.filter((_, i) => i !== index) || [];
                                  await updateOS(currentOS.id, {
                                    fotos_telegram_processo: updatedFotos,
                                  });
                                  const osAtualizada = getOSById(currentOS.id);
                                  if (osAtualizada) {
                                    setCurrentOS(osAtualizada);
                                  }
                                }
                              };
                              
                              return (
                                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border group cursor-pointer hover:border-primary transition-colors bg-muted">
                                  {hasImage && imageUrl ? (
                                    <>
                                      <img 
                                        src={imageUrl} 
                                        alt={fotoData.fileName || `Processo ${index + 1}`}
                                        className="w-full h-full object-cover"
                                        onClick={() => {
                                          if (fotoData.postLink) {
                                            window.open(fotoData.postLink, '_blank');
                                          } else if (imageUrl) {
                                            window.open(imageUrl, '_blank');
                                          }
                                        }}
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                        <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium">
                                          {fotoData.postLink ? 'Clique para ver no Telegram' : 'Clique para ampliar'}
                                        </span>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                                      {fotoData.thumbnailUrl ? (
                                        <img 
                                          src={fotoData.thumbnailUrl} 
                                          alt={fotoData.fileName || `Processo ${index + 1}`}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <Image className="h-8 w-8 text-muted-foreground mb-1" />
                                      )}
                                      <p className="text-xs font-medium truncate w-full">{fotoData.fileName}</p>
                                      <p className="text-xs text-muted-foreground">Enviada para Telegram</p>
                                      {fotoData.enviadoEm && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {new Date(fotoData.enviadoEm).toLocaleString('pt-BR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </p>
                                      )}
                                      {fotoData.postLink && (
                                        <a 
                                          href={fotoData.postLink} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-xs text-primary hover:underline mt-1"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          Ver no Telegram
                                        </a>
                                      )}
                                    </div>
                                  )}
                                  <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                                    {fotoData.tipo}
                                  </div>
                                  {fotoData.messageId && chatId && (
                                    <button
                                      onClick={handleDelete}
                                      className="absolute top-1 left-1 bg-destructive/80 hover:bg-destructive text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Deletar foto do Telegram"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {currentOS?.fotos_telegram_saida && currentOS.fotos_telegram_saida.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Image className="h-4 w-4" />
                            Fotos de Saída ({currentOS.fotos_telegram_saida.length})
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {currentOS.fotos_telegram_saida.map((foto, index) => {
                              const fotoData = typeof foto === 'string' 
                                ? { url: foto, fileName: `foto_${index + 1}.jpg`, tipo: 'saida' as const } 
                                : foto;
                              const imageUrl = fotoData.url || fotoData.thumbnailUrl;
                              const hasImage = !!(fotoData.url || fotoData.thumbnailUrl);
                              const hasPostLink = !!fotoData.postLink;
                              const chatId = fotoData.chatId || currentOS.telegram_chat_id_saida;
                              
                              const handleDelete = async (e: React.MouseEvent) => {
                                e.stopPropagation();
                                if (!fotoData.messageId || !chatId) {
                                  toast({
                                    title: 'Erro',
                                    description: 'Não é possível deletar: dados da mensagem não encontrados',
                                    variant: 'destructive',
                                  });
                                  return;
                                }
                                
                                if (!confirm('Tem certeza que deseja deletar esta foto do Telegram?')) {
                                  return;
                                }
                                
                                const result = await deleteTelegramMessage(chatId, fotoData.messageId);
                                if (result.success) {
                                  const updatedFotos = currentOS.fotos_telegram_saida?.filter((_, i) => i !== index) || [];
                                  await updateOS(currentOS.id, {
                                    fotos_telegram_saida: updatedFotos,
                                  });
                                  const osAtualizada = getOSById(currentOS.id);
                                  if (osAtualizada) {
                                    setCurrentOS(osAtualizada);
                                  }
                                }
                              };
                              
                              return (
                                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border group cursor-pointer hover:border-primary transition-colors bg-muted">
                                  {hasImage && imageUrl ? (
                                    <>
                                      <img 
                                        src={imageUrl} 
                                        alt={fotoData.fileName || `Saída ${index + 1}`}
                                        className="w-full h-full object-cover"
                                        onClick={() => {
                                          if (fotoData.postLink) {
                                            window.open(fotoData.postLink, '_blank');
                                          } else if (imageUrl) {
                                            window.open(imageUrl, '_blank');
                                          }
                                        }}
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                        <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium">
                                          {fotoData.postLink ? 'Clique para ver no Telegram' : 'Clique para ampliar'}
                                        </span>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                                      {fotoData.thumbnailUrl ? (
                                        <img 
                                          src={fotoData.thumbnailUrl} 
                                          alt={fotoData.fileName || `Saída ${index + 1}`}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <Image className="h-8 w-8 text-muted-foreground mb-1" />
                                      )}
                                      <p className="text-xs font-medium truncate w-full">{fotoData.fileName}</p>
                                      <p className="text-xs text-muted-foreground">Enviada para Telegram</p>
                                      {fotoData.enviadoEm && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {new Date(fotoData.enviadoEm).toLocaleString('pt-BR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </p>
                                      )}
                                      {fotoData.postLink && (
                                        <a 
                                          href={fotoData.postLink} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-xs text-primary hover:underline mt-1"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          Ver no Telegram
                                        </a>
                                      )}
                                    </div>
                                  )}
                                  <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                                    {fotoData.tipo}
                                  </div>
                                  {fotoData.messageId && chatId && (
                                    <button
                                      onClick={handleDelete}
                                      className="absolute top-1 left-1 bg-destructive/80 hover:bg-destructive text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Deletar foto do Telegram"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Nenhuma foto cadastrada ainda
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Tab Itens (Peças/Serviços) */}
          {isEditing && (
            <TabsContent value="itens" className="flex-1 flex flex-col min-h-0 space-y-2 mt-2">
              <Card className="m-2 flex flex-col h-full">
                <CardHeader className="pb-2 pt-3 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Peças e Serviços</CardTitle>
                    <Button onClick={() => {
                      setEditingItem(null);
                      setItemForm({ tipo: 'servico', produto_id: undefined, descricao: '', quantidade: 1, valor_unitario: 0, valor_minimo: 0, desconto: 0, garantia: 0, colaborador_id: '' });
                      setShowAddItem(true);
                    }} size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-2 flex-1 flex flex-col min-h-0">
                  {itens.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum item adicionado ainda.
                    </p>
                  ) : (
                    <ScrollArea className="flex-1">
                      <div className="w-full overflow-x-auto">
                        <div className="min-w-[900px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Tipo</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-right">Qtd</TableHead>
                            <TableHead className="text-right">Valor Unit.</TableHead>
                            <TableHead className="text-right">Valor Mín.</TableHead>
                            <TableHead className="text-right">Desconto</TableHead>
                            <TableHead className="text-right">Garantia</TableHead>
                            <TableHead>Colaborador</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {itens.map(item => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <Badge variant="outline">
                                  {item.tipo === 'peca' ? 'Peça' : item.tipo === 'servico' ? 'Serviço' : 'M.O.'}
                                </Badge>
                              </TableCell>
                              <TableCell>{item.descricao}</TableCell>
                              <TableCell className="text-right">{item.quantidade}</TableCell>
                              <TableCell className="text-right">{currencyFormatters.brl(item.valor_unitario)}</TableCell>
                              <TableCell className="text-right">{currencyFormatters.brl(item.valor_minimo || 0)}</TableCell>
                              <TableCell className="text-right">{currencyFormatters.brl(item.desconto)}</TableCell>
                              <TableCell className="text-right">{item.garantia ? `${item.garantia} dias` : '-'}</TableCell>
                              <TableCell>
                                {(() => {
                                  // Se tem colaborador_id mas não tem nome, tentar buscar
                                  if (item.colaborador_id && !item.colaborador_nome) {
                                    const colab = getColaboradorById(item.colaborador_id);
                                    if (colab) {
                                      // Atualizar o item com o nome encontrado
                                      updateItem(item.id, { colaborador_nome: colab.nome });
                                      return colab.nome;
                                    }
                                  }
                                  return item.colaborador_nome || '-';
                                })()}
                              </TableCell>
                              <TableCell className="text-right font-semibold">{currencyFormatters.brl(item.valor_total)}</TableCell>
                              <TableCell>
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditItem(item)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveItem(item.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                        </div>
                      </div>
                    </ScrollArea>
                  )}
                  
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg flex justify-between items-center">
                    <span className="font-medium">Total:</span>
                    <span className="text-2xl font-bold">{currencyFormatters.brl(total)}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Tab Financeiro */}
          {isEditing && (
            <TabsContent value="financeiro" className="flex-1 flex flex-col min-h-0 space-y-2 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-2 flex-shrink-0">
                <Card className="m-2">
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="text-3xl font-bold">{currencyFormatters.brl(total)}</p>
                  </CardContent>
                </Card>
                <Card className="m-2">
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Valor Pago</p>
                    <p className="text-3xl font-bold text-green-600">{currencyFormatters.brl(totalPago)}</p>
                  </CardContent>
                </Card>
                <Card className="m-2">
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Saldo Restante</p>
                    <p className={cn("text-3xl font-bold", total - totalPago > 0 ? "text-orange-600" : "text-green-600")}>
                      {currencyFormatters.brl(total - totalPago)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="m-2 flex flex-col flex-1 min-h-0">
                <CardHeader className="pb-2 pt-3 flex-shrink-0">
                  <CardTitle className="text-base">Pagamentos</CardTitle>
                </CardHeader>
                <CardContent className="pt-2 flex-1 flex flex-col min-h-0">
                  {pagamentos.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      Nenhum pagamento registrado.
                    </p>
                  ) : (
                    <ScrollArea className="flex-1">
                      <div className="w-full overflow-x-auto">
                        <div className="min-w-[900px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Forma</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pagamentos.map(pag => (
                            <TableRow key={pag.id}>
                              <TableCell>{dateFormatters.short(pag.data_pagamento)}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {pag.tipo === 'adiantamento' ? 'Adiantamento' : 'Pagamento Final'}
                                </Badge>
                              </TableCell>
                              <TableCell className="capitalize">{pag.forma_pagamento}</TableCell>
                              <TableCell className="text-right font-semibold">{currencyFormatters.brl(pag.valor)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                        </div>
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Dialog para adicionar/editar item */}
        <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Item' : 'Adicionar Item'}</DialogTitle>
              <DialogDescription>Adicione peças ou serviços à ordem de serviço</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto/serviço..."
                  value={produtoSearch}
                  onChange={(e) => setProdutoSearch(e.target.value)}
                  className="pl-9"
                />
                {produtoResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-40 overflow-auto">
                    {produtoResults.map(prod => (
                      <div
                        key={prod.id}
                        className="p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                        onClick={() => handleSelectProduto(prod)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">{prod.descricao}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-muted-foreground">
                                {currencyFormatters.brl(prod.preco_venda)}
                              </p>
                              <Badge 
                                variant={prod.estoque_atual > 0 ? "default" : "destructive"}
                                className="text-xs"
                              >
                                Estoque: {prod.estoque_atual || 0}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {produtoSearch.length >= 2 && produtoResults.length === 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg p-3">
                    <p className="text-sm text-muted-foreground">
                      {itemForm.tipo === 'peca' 
                        ? 'Nenhuma peça encontrada com estoque disponível.' 
                        : 'Nenhum produto encontrado.'}
                    </p>
                    {itemForm.tipo === 'peca' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Verifique se a peça está cadastrada e possui estoque maior que zero.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select 
                    value={itemForm.tipo} 
                    onValueChange={(v: any) => {
                      setItemForm(prev => ({ 
                        ...prev, 
                        tipo: v, 
                        produto_id: undefined, 
                        descricao: '' 
                      }));
                      // Limpar busca quando mudar o tipo
                      setProdutoSearch('');
                      setProdutoResults([]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="servico">Serviço</SelectItem>
                      <SelectItem value="peca">Peça (do estoque)</SelectItem>
                      <SelectItem value="mao_de_obra">Mão de Obra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    max={itemForm.tipo === 'peca' && itemForm.produto_id 
                      ? produtos.find(p => p.id === itemForm.produto_id)?.estoque_atual || undefined
                      : undefined}
                    value={itemForm.quantidade}
                    onChange={(e) => {
                      const valor = parseInt(e.target.value) || 1;
                      // Se for peça, validar contra estoque
                      if (itemForm.tipo === 'peca' && itemForm.produto_id) {
                        const produto = produtos.find(p => p.id === itemForm.produto_id);
                        if (produto && valor > (produto.estoque_atual || 0)) {
                          toast({
                            title: 'Quantidade excede estoque',
                            description: `Estoque disponível: ${produto.estoque_atual} unidades.`,
                            variant: 'destructive',
                          });
                          return;
                        }
                      }
                      setItemForm(prev => ({ ...prev, quantidade: valor }));
                    }}
                  />
                  {itemForm.tipo === 'peca' && itemForm.produto_id && (
                    <p className="text-xs text-muted-foreground">
                      Estoque disponível: {produtos.find(p => p.id === itemForm.produto_id)?.estoque_atual || 0} unidades
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={itemForm.descricao}
                  onChange={(e) => {
                    // Se for peça, não permitir editar manualmente (deve vir do estoque)
                    if (itemForm.tipo === 'peca' && itemForm.produto_id) {
                      return;
                    }
                    setItemForm(prev => ({ ...prev, descricao: e.target.value }));
                  }}
                  placeholder={itemForm.tipo === 'peca' ? "Selecione uma peça do estoque acima" : "Descrição do item"}
                  disabled={itemForm.tipo === 'peca' && !!itemForm.produto_id}
                  className={itemForm.tipo === 'peca' && !!itemForm.produto_id ? "bg-muted" : ""}
                />
                {itemForm.tipo === 'peca' && !itemForm.produto_id && (
                  <p className="text-xs text-muted-foreground">
                    Busque e selecione uma peça do estoque acima
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Valor Unitário</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={itemForm.valor_unitario || ''}
                    onChange={(e) => setItemForm(prev => ({ ...prev, valor_unitario: parseFloat(e.target.value) || 0 }))}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Mínimo</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={itemForm.valor_minimo || ''}
                    onChange={(e) => setItemForm(prev => ({ ...prev, valor_minimo: parseFloat(e.target.value) || 0 }))}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Desconto</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={itemForm.desconto || ''}
                    onChange={(e) => setItemForm(prev => ({ ...prev, desconto: parseFloat(e.target.value) || 0 }))}
                    placeholder="0,00"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Garantia (dias)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={itemForm.garantia || ''}
                    onChange={(e) => setItemForm(prev => ({ ...prev, garantia: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Colaborador que lançou</Label>
                  <Select
                    value={itemForm.colaborador_id || ''}
                    onValueChange={(v) => setItemForm(prev => ({ ...prev, colaborador_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        console.log('[OrdemServicoForm] Renderizando Select de colaboradores:', {
                          isLoadingCargos,
                          colaboradoresLength: colaboradores.length,
                          colaboradores: colaboradores.map(c => `${c.nome} (${c.cargo})`)
                        });
                        
                        if (isLoadingCargos) {
                          return <div className="px-2 py-1.5 text-sm text-muted-foreground">Carregando colaboradores...</div>;
                        }
                        
                        if (colaboradores.length > 0) {
                          return colaboradores.map(colab => (
                            <SelectItem key={colab.id} value={colab.id}>
                              {colab.nome} ({CARGOS_LABELS[colab.cargo]})
                            </SelectItem>
                          ));
                        }
                        
                        return <div className="px-2 py-1.5 text-sm text-muted-foreground">Nenhum colaborador cadastrado</div>;
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg flex justify-between items-center">
                <span className="font-medium">Total do Item:</span>
                <span className="text-xl font-bold">
                  {currencyFormatters.brl((itemForm.quantidade * itemForm.valor_unitario) - itemForm.desconto)}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddItem(false)}>Cancelar</Button>
              <Button onClick={handleSubmitItem} disabled={!itemForm.descricao}>
                {editingItem ? 'Atualizar' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rodapé com ações */}
        <div className="border-t bg-background p-3 sm:p-4 flex-shrink-0 mt-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {!isModal && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/pdv/os')}
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
              )}
              {isEditing && currentOS && (
                <>
                  <span className="text-sm font-medium">Status OS: </span>
                  <Select value={currentOS.status} onValueChange={handleChangeStatus}>
                    <SelectTrigger className={cn('w-[180px] h-9 text-white border-0', (() => {
                      const config = getConfigByStatus(currentOS.status);
                      return config?.cor || STATUS_OS_COLORS[currentOS.status as StatusOS] || 'bg-gray-500';
                    })())}>
                      <SelectValue placeholder="Alterar Status">
                        {(() => {
                          const config = getConfigByStatus(currentOS.status);
                          return config?.label || STATUS_OS_LABELS[currentOS.status as StatusOS] || currentOS.status;
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {configuracoes
                        .filter(c => c.ativo)
                        .sort((a, b) => a.ordem - b.ordem)
                        .map((config) => (
                          <SelectItem key={config.status} value={config.status}>
                            {config.label}
                          </SelectItem>
                        ))}
                      {/* Incluir status padrão que não estão nas configurações */}
                      {Object.entries(STATUS_OS_LABELS)
                        .filter(([value]) => !configuracoes.some(c => c.status === value))
                        .map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:justify-end">
              {isEditing && currentOS && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleWhatsApp()}
                    disabled={whatsappLoading}
                  >
                    <Send className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">
                      {whatsappLoading ? 'Enviando...' : 'Enviar no WhatsApp'}
                    </span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handlePrint('termica')}>
                    <Printer className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Térmica</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handlePrint('a4')}>
                    <Printer className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">A4</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handlePrint('pdf')}>
                    <Download className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Salvar PDF</span>
                  </Button>
                </>
              )}
              <LoadingButton onClick={handleSubmit} loading={isLoading} size="sm">
                <Save className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">{isEditing ? 'Atualizar' : 'Salvar'}</span>
                <span className="sm:hidden">{isEditing ? 'Atualizar' : 'Salvar'}</span>
              </LoadingButton>
            </div>
          </div>
        </div>
        
        {/* Toast centralizado de sucesso */}
        {showSuccessToast && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] pointer-events-none">
            <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in-0 zoom-in-95 duration-200">
              <Check className="h-5 w-5" />
              <span className="font-semibold">OS salva com sucesso!</span>
            </div>
          </div>
        )}
      </div>
  );

  if (isModal) {
    return content;
  }

  return (
    <ModernLayout 
      title={isEditing ? `OS #${currentOS?.numero || ''}` : 'Nova Ordem de Serviço'} 
      subtitle={isEditing ? 'Editar ordem de serviço' : 'Cadastrar nova OS'}
    >
      {content}
    </ModernLayout>
  );
}
