import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  User, Smartphone, FileText, Check, AlertTriangle, Package, DollarSign, Download, ArrowLeft, Image, Upload, Settings, ChevronDown, ChevronUp,
  CreditCard, Wallet, QrCode, Banknote
} from 'lucide-react';
import { 
  useOrdensServico, useClientes, useMarcasModelos, 
  usePagamentos, buscarCEP, useConfiguracaoStatus
} from '@/hooks/useAssistencia';
import { useItensOSSupabase } from '@/hooks/useItensOSSupabase';
import { useProdutosSupabase } from '@/hooks/useProdutosSupabase';
import { useOrdensServicoSupabase } from '@/hooks/useOrdensServicoSupabase';
import { useClientesSupabase } from '@/hooks/useClientesSupabase';
import { useMarcasModelosSupabase } from '@/hooks/useMarcasModelosSupabase';
import { useCargos } from '@/hooks/useCargos';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { 
  OrdemServicoFormData, CHECKLIST_ITENS, ItemOS,
  STATUS_OS_LABELS, STATUS_OS_COLORS, StatusOS, CARGOS_LABELS
} from '@/types/assistencia';
import { PatternLock } from '@/components/assistencia/PatternLock';
import { useOSImageReference } from '@/hooks/useOSImageReference';
import { OSImageReferenceViewer } from '@/components/assistencia/OSImageReferenceViewer';
import { CameraCapture } from '@/components/assistencia/CameraCapture';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { LoadingButton } from '@/components/LoadingButton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useTelegram } from '@/hooks/useTelegram';
import { useTelegramConfig } from '@/hooks/useTelegramConfig';
import { OSSummaryHeader } from '@/components/assistencia/OSSummaryHeader';
import { generateOSTermica } from '@/utils/osTermicaGenerator';
import { generateOSPDF } from '@/utils/osPDFGenerator';
import { printTermica } from '@/utils/pdfGenerator';
import { useChecklistConfig } from '@/hooks/useChecklistConfig';

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
  const queryClient = useQueryClient();

  // Hooks
  const { createOS, updateOS, getOSById, updateStatus } = useOrdensServicoSupabase();
  const { clientes, searchClientes, searchClientesAsync, createCliente, getClienteById } = useClientesSupabase();
  const { marcas, modelos, getModelosByMarca } = useMarcasModelosSupabase();
  const { produtos, searchProdutos, updateProduto, isLoading: isLoadingProdutos } = useProdutosSupabase();
  
  // Debug: verificar produtos carregados
  useEffect(() => {
    if (!isLoadingProdutos) {
      console.log('[OrdemServicoForm] Produtos carregados:', {
        total: produtos.length,
        comEstoque: produtos.filter(p => (p.quantidade || 0) > 0).length,
        semEstoque: produtos.filter(p => (p.quantidade || 0) === 0).length,
        amostra: produtos.slice(0, 5).map(p => ({ nome: p.nome, quantidade: p.quantidade, tipo: p.tipo }))
      });
    }
  }, [produtos, isLoadingProdutos]);
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
  const { imageUrl: osImageReferenceUrl } = useOSImageReference();
  const { itemsEntrada: checklistEntradaConfig, itemsSaida: checklistSaidaConfig } = useChecklistConfig();
  
  // Configurações do Telegram do banco de dados
  const {
    chatIdEntrada: telegramChatIdEntradaFromDB,
    chatIdProcesso: telegramChatIdProcessoFromDB,
    chatIdSaida: telegramChatIdSaidaFromDB,
    updateChatIdEntrada,
    updateChatIdProcesso,
    updateChatIdSaida,
    isUpdating: isUpdatingTelegramConfig,
  } = useTelegramConfig();

  // Estados locais para Chat IDs do Telegram (carregados do banco ou da OS específica)
  const [telegramChatIdEntrada, setTelegramChatIdEntrada] = useState<string>('');
  const [telegramChatIdProcesso, setTelegramChatIdProcesso] = useState<string>('');
  const [telegramChatIdSaida, setTelegramChatIdSaida] = useState<string>('');

  // Carregar chat IDs do banco quando disponíveis (valores padrão globais)
  useEffect(() => {
    if (telegramChatIdEntradaFromDB) {
      setTelegramChatIdEntrada(telegramChatIdEntradaFromDB);
    }
  }, [telegramChatIdEntradaFromDB]);

  useEffect(() => {
    if (telegramChatIdProcessoFromDB) {
      setTelegramChatIdProcesso(telegramChatIdProcessoFromDB);
    }
  }, [telegramChatIdProcessoFromDB]);

  useEffect(() => {
    if (telegramChatIdSaidaFromDB) {
      setTelegramChatIdSaida(telegramChatIdSaidaFromDB);
    }
  }, [telegramChatIdSaidaFromDB]);

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

  // Estados para checklist de saída
  const [showChecklistSaidaModal, setShowChecklistSaidaModal] = useState(false);
  const [checklistSaidaMarcados, setChecklistSaidaMarcados] = useState<string[]>([]);
  const [checklistSaidaAprovado, setChecklistSaidaAprovado] = useState<boolean | null>(null);
  const [checklistSaidaObservacoes, setChecklistSaidaObservacoes] = useState('');
  const [pendingStatusChange, setPendingStatusChange] = useState<string | null>(null);

  const [currentOS, setCurrentOS] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [localActiveTab, setLocalActiveTab] = useState('dados');
  const activeTab = isModal ? localActiveTab : (routeTab || 'dados');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [osLoaded, setOsLoaded] = useState(false); // Flag para evitar recarregar OS

  // Função para navegar entre as abas
  const handleTabChange = (tab: string) => {
    if (isModal) {
      // Se for modal, apenas muda o estado local
      setLocalActiveTab(tab);
      return;
    }
    // Se for página, navega pela URL
    if (isEditing && id) {
      navigate(`/os/${id}/${tab}`);
    } else {
      navigate(`/os/nova/${tab}`);
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
    garantia: 90, // Padrão de 90 dias
    colaborador_id: '',
  });
  const [editingItem, setEditingItem] = useState<ItemOS | null>(null);

  // Itens e pagamentos (apenas para edição)
  // Usar um ID temporário se a OS ainda não foi criada
  const osIdParaItens = id || currentOS?.id || 'temp';
  const { itens, total, addItem, updateItem, removeItem, isLoading: isLoadingItens } = useItensOSSupabase(osIdParaItens);
  const { pagamentos, totalPago, addPagamento } = usePagamentos(osIdParaItens);

  // Carregar OS existente - APENAS UMA VEZ
  useEffect(() => {
    if (isEditing && id && !osLoaded) {
      // Tentar carregar múltiplas vezes se não encontrar (para casos de criação recente)
      let tentativas = 0;
      const carregarOS = async () => {
        const os = getOSById(id);
        if (os) {
          console.log('[OrdemServicoForm] Carregando OS pela primeira vez:', os.id);
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
        
        // Primeiro tenta buscar cliente localmente
        let cliente = getClienteById(os.cliente_id);
        
        // Se não encontrou localmente e tem cliente_id, buscar via API
        if (!cliente && os.cliente_id) {
          console.log('[OrdemServicoForm] Cliente não encontrado localmente, buscando via API...');
          try {
            const API_URL = (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('localhost')) 
              ? import.meta.env.VITE_API_URL 
              : 'https://api.primecamp.cloud/api';
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/query/clientes`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ where: { id: os.cliente_id } }),
            });
            if (response.ok) {
              const result = await response.json();
              const clienteData = result.rows?.[0] || result.data?.[0];
              if (clienteData) {
                cliente = clienteData;
                console.log('[OrdemServicoForm] Cliente encontrado via API:', cliente.nome);
              }
            }
          } catch (error) {
            console.error('[OrdemServicoForm] Erro ao buscar cliente via API:', error);
          }
        }
        
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
        
        setOsLoaded(true); // Marcar como carregado para não recarregar
        } else if (tentativas < 5) {
          tentativas++;
          setTimeout(carregarOS, 500);
        }
      };
      carregarOS();
    }
  }, [id, isEditing, getOSById, getClienteById, osLoaded]);

  // Atualizar valor_total da OS quando itens mudarem
  useEffect(() => {
    if (isEditing && currentOS && total !== undefined && total >= 0 && !isLoadingItens) {
      // Atualizar valor_total na OS quando o total dos itens mudar
      const valorTotalAtual = Number(currentOS.valor_total || 0);
      const novoTotal = Number(total || 0);
      
      // Sempre atualizar se houver diferença (mesmo que pequena) ou se o total mudou
      if (Math.abs(novoTotal - valorTotalAtual) > 0.01 || (novoTotal > 0 && valorTotalAtual === 0)) {
        console.log('[OrdemServicoForm] Atualizando valor_total da OS:', {
          osId: currentOS.id,
          valorAtual: valorTotalAtual,
          novoTotal: novoTotal,
          itens: itens.length
        });
        updateOS(currentOS.id, { valor_total: novoTotal }).then(() => {
          // Invalidar queries relacionadas para atualizar a lista
          queryClient.invalidateQueries({ queryKey: ['ordens_servico'] });
          queryClient.invalidateQueries({ queryKey: ['os_items_all'] });
        }).catch(error => {
          console.error('[OrdemServicoForm] Erro ao atualizar valor_total:', error);
        });
      }
    }
  }, [total, isEditing, currentOS, updateOS, itens.length, queryClient, isLoadingItens]);

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

  // Buscar cliente (assíncrono via API com ILIKE)
  useEffect(() => {
    if (clienteSearch.length >= 2) {
      // Primeiro tenta busca local para resposta imediata
      const localResults = searchClientes(clienteSearch);
      if (localResults.length > 0) {
        setClienteResults(localResults.slice(0, 10));
      }
      
      // Depois faz busca assíncrona no banco para resultados completos
      searchClientesAsync(clienteSearch, 15).then(asyncResults => {
        if (asyncResults.length > 0) {
          // Mescla resultados, removendo duplicados
          const allResults = [...localResults];
          asyncResults.forEach(r => {
            if (!allResults.find(l => l.id === r.id)) {
              allResults.push(r);
            }
          });
          setClienteResults(allResults.slice(0, 15));
        }
      });
    } else {
      setClienteResults([]);
    }
  }, [clienteSearch, searchClientes, searchClientesAsync]);

  // Buscar produtos - SEMPRE filtrar apenas produtos com estoque disponível
  useEffect(() => {
    if (produtoSearch.length >= 2) {
      console.log('[OrdemServicoForm] Buscando produtos:', {
        termo: produtoSearch,
        totalProdutos: produtos.length,
        tipoSelecionado: itemForm.tipo
      });
      
      const results = searchProdutos(produtoSearch);
      console.log('[OrdemServicoForm] Resultados da busca (antes do filtro de estoque):', results.length, results.map(p => ({
        nome: p.nome,
        quantidade: p.quantidade,
        tipo: p.tipo
      })));
      
      // SEMPRE filtrar apenas produtos com estoque > 0
      // Usar o campo 'quantidade' que é o campo correto no banco
      let produtosFiltrados = results.filter(prod => {
        const estoque = prod.quantidade || 0;
        const temEstoque = estoque > 0;
        if (!temEstoque) {
          console.log(`[OrdemServicoForm] Produto ${prod.nome} descartado: estoque=${estoque}`);
        }
        return temEstoque;
      });
      
      console.log('[OrdemServicoForm] Produtos com estoque > 0:', produtosFiltrados.length);
      
      // Se o tipo for "peca", também filtrar por tipo
      if (itemForm.tipo === 'peca') {
        const antes = produtosFiltrados.length;
        produtosFiltrados = produtosFiltrados.filter(prod => {
          const isPeca = prod.tipo === 'peca' || prod.tipo === 'produto' || prod.tipo === 'PECA' || prod.tipo === 'PRODUTO';
          return isPeca;
        });
        console.log(`[OrdemServicoForm] Após filtrar por tipo peça: ${antes} → ${produtosFiltrados.length}`);
      }
      
      console.log('[OrdemServicoForm] Produtos finais para exibir:', produtosFiltrados.length);
      setProdutoResults(produtosFiltrados.slice(0, 10));
    } else {
      setProdutoResults([]);
    }
  }, [produtoSearch, searchProdutos, itemForm.tipo, produtos.length]);

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
  const handleSubmitItem = async () => {
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
          const estoqueDisponivel = produto.quantidade || 0;
          console.log(`Estoque disponível: ${estoqueDisponivel}, Quantidade solicitada: ${itemForm.quantidade}`);
          
          if (estoqueDisponivel < itemForm.quantidade) {
            toast({
              title: 'Estoque insuficiente',
              description: `Estoque disponível: ${estoqueDisponivel} unidades. Quantidade solicitada: ${itemForm.quantidade}`,
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
              const estoqueAtual = produto.quantidade || 0;
              const novoEstoque = Math.max(0, estoqueAtual - diferenca);
              
              // Validar se há estoque suficiente para a diferença
              if (diferenca > 0 && estoqueAtual < diferenca) {
                toast({
                  title: 'Estoque insuficiente',
                  description: `Estoque disponível: ${estoqueAtual} unidades. Não é possível aumentar a quantidade em ${diferenca} unidades.`,
                  variant: 'destructive',
                });
                return;
              }
              
              updateProduto(produto.id, { quantidade: novoEstoque });
              console.log(`Estoque ajustado: ${estoqueAtual} → ${novoEstoque} (diferença: ${diferenca})`);
            }
          } else {
            // Ao adicionar: decrementar estoque
            const estoqueAtual = produto.quantidade || 0;
            const novoEstoque = Math.max(0, estoqueAtual - itemForm.quantidade);
            updateProduto(produto.id, { quantidade: novoEstoque });
            console.log(`Estoque decrementado: ${estoqueAtual} → ${novoEstoque} (quantidade: ${itemForm.quantidade})`);
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
        garantia: itemForm.garantia || 90,
        colaborador_id: itemForm.colaborador_id || undefined,
        colaborador_nome: colaborador?.nome || undefined, // Sempre recalcular o nome
        valor_total: valorTotal,
      };
      
      console.log('Dados do item a ser adicionado/editado:', itemData);
      
      if (editingItem) {
        console.log('Editando item:', editingItem.id);
        await updateItem(editingItem.id, itemData);
        setEditingItem(null);
        toast({
          title: 'Item atualizado',
          description: 'O item foi atualizado com sucesso.',
        });
      } else {
        console.log('Adicionando novo item...');
        await addItem(itemData);
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
        garantia: 90,
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
  const handleRemoveItem = async (itemId: string) => {
    const item = itens.find(i => i.id === itemId);
    if (!item) return;

    // Reverter estoque se for peça com produto_id
    if (item.tipo === 'peca' && item.produto_id) {
      const produto = produtos.find(p => p.id === item.produto_id);
      if (produto) {
        const quantidadeRemovida = item.quantidade || 0;
        const estoqueAtual = produto.quantidade || 0;
        const novoEstoque = estoqueAtual + quantidadeRemovida;
        updateProduto(produto.id, { quantidade: novoEstoque });
        console.log(`Estoque revertido: ${estoqueAtual} → ${novoEstoque} (quantidade removida: ${quantidadeRemovida})`);
      }
    }

    await removeItem(itemId);
    toast({
      title: 'Item removido',
      description: 'O item foi removido da ordem de serviço e o estoque foi revertido.',
    });
  };

  // Selecionar produto
  const handleSelectProduto = (produto: Produto) => {
    // Usar garantia do produto ou padrão de 90 dias
    const garantiaProduto = produto.garantia_dias || 90;
    
    setItemForm(prev => ({
      ...prev,
      produto_id: produto.id,
      descricao: produto.nome || produto.descricao || '', // Usar nome (campo correto)
      valor_unitario: produto.valor_dinheiro_pix || produto.valor_venda || produto.preco_venda || 0,
      garantia: garantiaProduto, // Usar garantia do produto ou 90 dias como padrão
      tipo: produto.tipo === 'peca' ? 'peca' : (produto.tipo === 'produto' ? 'peca' : 'servico'),
      quantidade: 1, // Resetar quantidade ao selecionar novo produto
    }));
    setProdutoSearch('');
    setProdutoResults([]);
  };

  // Salvar OS
  const handleSubmit = async () => {
    // Prevenir múltiplos cliques
    if (isLoading) {
      toast({ title: 'Aguarde...', description: 'Salvando OS...', variant: 'default' });
      return;
    }

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
        // Marcar orçamento como autorizado se houver valores
        const temOrcamento = (formData.orcamento_desconto && formData.orcamento_desconto > 0) || 
                            (formData.orcamento_parcelado && formData.orcamento_parcelado > 0);
        
        updateOS(currentOS.id, {
          ...formData,
          cliente_nome: selectedCliente?.nome,
          cliente_empresa: selectedCliente?.nome_fantasia,
          marca_nome: marcas.find(m => m.id === formData.marca_id)?.nome,
          modelo_nome: modelos.find(m => m.id === formData.modelo_id)?.nome,
          tecnico_nome: tecnico?.nome,
          orcamento_autorizado: temOrcamento || formData.orcamento_autorizado || false,
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
        // Marcar orçamento como autorizado se houver valores
        const temOrcamento = (formData.orcamento_desconto && formData.orcamento_desconto > 0) || 
                            (formData.orcamento_parcelado && formData.orcamento_parcelado > 0);
        
        const novaOS = await createOS({
          ...formData,
          cliente_nome: selectedCliente?.nome,
          cliente_empresa: selectedCliente?.nome_fantasia,
          marca_nome: marcas.find(m => m.id === formData.marca_id)?.nome,
          modelo_nome: modelos.find(m => m.id === formData.modelo_id)?.nome,
          tecnico_nome: tecnico?.nome,
          orcamento_autorizado: temOrcamento || formData.orcamento_autorizado || false,
        } as any);
        
        toast({ title: `OS #${novaOS.numero} criada!` });
        
        // Invalidar queries para garantir que a OS seja recarregada
        queryClient.invalidateQueries({ queryKey: ['ordens_servico'] });
        
        // Aguardar um pouco para garantir que a query foi invalidada e a OS está disponível
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Recarregar a OS criada
        const osCriada = getOSById(novaOS.id);
        if (osCriada) {
          setCurrentOS(osCriada);
        }
        
        if (isModal && onClose) {
          // Se estiver no modal, fecha e deixa o usuário abrir novamente se quiser
          onClose();
        } else {
          navigate(`/os/${novaOS.id}`);
        }
      }
    } catch (error: any) {
      console.error('Erro ao salvar OS:', error);
      toast({ 
        title: 'Erro ao salvar OS', 
        description: error.message || 'Ocorreu um erro inesperado',
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Alterar status
  const handleChangeStatus = async (status: StatusOS | string) => {
    if (!currentOS) return;
    
    // Se mudar para "manutenção finalizada" ou "finalizada", abrir modal de checklist de saída
    if (status === 'finalizada' || status === 'manutencao_finalizada' || status.toLowerCase().includes('finalizada')) {
      setPendingStatusChange(status);
      setShowChecklistSaidaModal(true);
      return; // Não atualizar status ainda, aguardar aprovação do checklist
    }
    
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

  // Finalizar checklist de saída
  const handleFinalizarChecklistSaida = async () => {
    console.log('[handleFinalizarChecklistSaida] Iniciando finalização do checklist de saída', {
      currentOS: currentOS?.id,
      pendingStatusChange,
      checklistSaidaAprovado,
      checklistSaidaMarcados: checklistSaidaMarcados.length,
      checklistSaidaObservacoes
    });

    if (!currentOS || !pendingStatusChange) {
      console.error('[handleFinalizarChecklistSaida] OS ou status pendente não encontrado');
      toast({ 
        title: 'Erro', 
        description: 'OS não encontrada ou status não definido.',
        variant: 'destructive' 
      });
      return;
    }

    // Validar se foi marcado como aprovado ou reprovado
    if (checklistSaidaAprovado === null) {
      toast({ 
        title: 'Selecione o resultado', 
        description: 'Marque se o aparelho foi aprovado ou reprovado no checklist de saída.',
        variant: 'destructive' 
      });
      return;
    }

    try {
      // Atualizar OS com checklist de saída
      const checklistSaidaIds = checklistSaidaMarcados;
      console.log('[handleFinalizarChecklistSaida] Atualizando OS com dados:', {
        osId: currentOS.id,
        checklist_saida: checklistSaidaIds,
        observacoes_checklist_saida: checklistSaidaObservacoes,
        checklist_saida_aprovado: checklistSaidaAprovado,
      });

      const updatedOS = await updateOS(currentOS.id, {
        checklist_saida: checklistSaidaIds,
        observacoes_checklist_saida: checklistSaidaObservacoes || null,
        checklist_saida_aprovado: checklistSaidaAprovado,
      });

      console.log('[handleFinalizarChecklistSaida] OS atualizada com sucesso:', updatedOS);

      // Atualizar status
      console.log('[handleFinalizarChecklistSaida] Atualizando status da OS:', pendingStatusChange);
      const config = getConfigByStatus(pendingStatusChange);
      await updateStatus(currentOS.id, pendingStatusChange as StatusOS, config?.notificar_whatsapp);
      console.log('[handleFinalizarChecklistSaida] Status atualizado com sucesso');

      // Notificar cliente via WhatsApp
      const cliente = getClienteById(currentOS.cliente_id);
      const telefone = currentOS.telefone_contato || cliente?.whatsapp || cliente?.telefone;

      if (telefone && checklistSaidaAprovado) {
        // Aprovado - enviar mensagem padrão
        try {
          const marca = marcas.find(m => m.id === currentOS.marca_id);
          const modelo = modelos.find(m => m.id === currentOS.modelo_id);
          
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
          
          if (numero.length >= 12 && numero.length <= 13) {
            const mensagem = `Olá ${cliente?.nome || currentOS.cliente_nome || 'Cliente'}! Sua OS #${currentOS.numero} do ${marca?.nome || currentOS.marca_nome || ''} ${modelo?.nome || currentOS.modelo_nome || ''} está pronta para retirada. O aparelho foi aprovado no checklist de saída.`;
            await sendMessage({ number: numero, body: mensagem });
          }
        } catch (error: any) {
          console.error('Erro ao enviar notificação de aprovação:', error);
        }
      } else if (telefone && !checklistSaidaAprovado) {
        // Reprovar - perguntar se quer avisar mesmo assim
        const avisarCliente = window.confirm(
          'O aparelho foi reprovado no checklist de saída. Deseja avisar o cliente mesmo assim?'
        );

        if (avisarCliente) {
          try {
            const marca = marcas.find(m => m.id === currentOS.marca_id);
            const modelo = modelos.find(m => m.id === currentOS.modelo_id);
            
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
            
            if (numero.length >= 12 && numero.length <= 13) {
              const mensagem = `Olá ${cliente?.nome || currentOS.cliente_nome || 'Cliente'}! Sua OS #${currentOS.numero} do ${marca?.nome || currentOS.marca_nome || ''} ${modelo?.nome || currentOS.modelo_nome || ''} está pronta para retirada. ${checklistSaidaObservacoes ? `Observações: ${checklistSaidaObservacoes}` : 'Por favor, entre em contato conosco para mais informações.'}`;
              await sendMessage({ number: numero, body: mensagem });
            }
          } catch (error: any) {
            console.error('Erro ao enviar notificação de reprovação:', error);
          }
        }
      }

      // Atualizar estado local
      setCurrentOS((prev: any) => prev ? { 
        ...prev, 
        status: pendingStatusChange,
        checklist_saida: checklistSaidaIds,
        checklist_saida_aprovado: checklistSaidaAprovado,
      } : null);

      // Fechar modal e limpar estados
      setShowChecklistSaidaModal(false);
      setChecklistSaidaMarcados([]);
      setChecklistSaidaAprovado(null);
      setChecklistSaidaObservacoes('');
      setPendingStatusChange(null);

      toast({ 
        title: 'Checklist de saída finalizado', 
        description: checklistSaidaAprovado 
          ? 'Aparelho aprovado e cliente notificado.' 
          : 'Checklist de saída registrado com ressalvas.'
      });
    } catch (error: any) {
      console.error('[handleFinalizarChecklistSaida] Erro completo ao finalizar checklist de saída:', {
        error,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack
      });
      
      let errorMessage = 'Ocorreu um erro ao finalizar o checklist de saída.';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.details) {
        errorMessage = error.details;
      } else if (error.hint) {
        errorMessage = error.hint;
      }
      
      toast({ 
        title: 'Erro ao finalizar checklist', 
        description: errorMessage,
        variant: 'destructive',
        duration: 8000
      });
    }
  };

  // WhatsApp - Enviar via API do Ativa CRM
  const handleWhatsApp = async () => {
    console.log('[handleWhatsApp] Iniciando envio de mensagem da OS');
    
    if (!currentOS && !isEditing) {
      console.warn('[handleWhatsApp] OS não salva ainda');
      toast({ title: 'Salve a OS antes de enviar', variant: 'destructive' });
      return;
    }
    
    const os = currentOS || (isEditing ? getOSById(id || '') : null);
    if (!os) {
      console.error('[handleWhatsApp] OS não encontrada');
      toast({ title: 'OS não encontrada', variant: 'destructive' });
      return;
    }

    console.log('[handleWhatsApp] OS encontrada:', { id: os.id, numero: os.numero });

    const cliente = getClienteById(os.cliente_id);
    const telefone = os.telefone_contato || cliente?.whatsapp || cliente?.telefone;
    
    console.log('[handleWhatsApp] Telefone encontrado:', { telefone, cliente_id: os.cliente_id, cliente_nome: cliente?.nome });
    
    if (!telefone) {
      console.error('[handleWhatsApp] Telefone não encontrado');
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

      console.log('[handleWhatsApp] Mensagem preparada:', mensagem.substring(0, 100) + '...');

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
        console.error('[handleWhatsApp] Número inválido após formatação:', { numero, length: numero.length, original: telefone });
        toast({
          title: 'Número inválido',
          description: `O número "${telefone}" não está em um formato válido. Use: (DDD) 9XXXX-XXXX ou (DDD) XXXX-XXXX`,
          variant: 'destructive',
        });
        return;
      }

      // Log para debug
      console.log('[handleWhatsApp] Dados finais para envio:', {
        numeroOriginal: telefone,
        numeroFormatado: numero,
        tamanho: numero.length,
        mensagemLength: mensagem.length,
        osNumero: os.numero
      });

      // Enviar via API do Ativa CRM
      console.log('[handleWhatsApp] Chamando sendMessage do hook useWhatsApp...');
      const result = await sendMessage({
        number: numero,
        body: mensagem
      });

      console.log('[handleWhatsApp] Resposta do sendMessage:', result);

      // O hook useWhatsApp já exibe toast de sucesso
      toast({ 
        title: 'Mensagem enviada com sucesso!', 
        description: `Mensagem da OS #${os.numero} enviada para ${telefone}`,
      });
    } catch (error: any) {
      console.error('[handleWhatsApp] Erro completo ao enviar WhatsApp:', {
        error,
        message: error.message,
        stack: error.stack,
        name: error.name
      });
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

    if (tipo === 'pdf' || tipo === 'a4') {
      // Usar a mesma função para PDF e A4 (baseada na térmica)
      try {
        const cliente = getClienteById(os.cliente_id);
        const marca = marcas.find(m => m.id === os.marca_id);
        const modelo = modelos.find(m => m.id === os.modelo_id);
        
        // Buscar primeira foto de entrada
        const fotoEntrada = os.fotos_telegram_entrada?.[0];
        const fotoEntradaUrl = fotoEntrada 
          ? (typeof fotoEntrada === 'string' ? fotoEntrada : (fotoEntrada.url || fotoEntrada.thumbnailUrl))
          : undefined;

        // Buscar imagem de referência do aparelho
        const imagemReferenciaUrl = osImageReferenceUrl || null;
        const areasDefeito = os.areas_defeito || [];

        // Gerar uma única página com ambas as vias lado a lado
        const htmlCompleto = await generateOSPDF({
          os,
          clienteNome: cliente?.nome || os.cliente_nome || 'Cliente',
          marcaNome: marca?.nome || os.marca_nome,
          modeloNome: modelo?.nome || os.modelo_nome,
          checklistEntrada: checklistEntradaConfig,
          checklistEntradaMarcados: os.checklist_entrada || [],
          fotoEntradaUrl,
          imagemReferenciaUrl,
          areasDefeito,
          via: 'cliente', // Não importa, pois ambas as vias são geradas juntas
          formato: tipo === 'pdf' ? 'pdf' : 'a4',
        });

        if (tipo === 'pdf') {
          // Para PDF, abrir em nova janela e permitir download
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(htmlCompleto);
            printWindow.document.close();
            printWindow.onload = () => {
              printWindow.focus();
              printWindow.print();
            };
          }
        } else {
          // Para A4, apenas imprimir
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(htmlCompleto);
            printWindow.document.close();
            printWindow.onload = () => {
              printWindow.focus();
              printWindow.print();
            };
          }
        }

        toast({ title: `${tipo === 'pdf' ? 'PDF' : 'A4'} gerado`, description: '2 vias geradas (Cliente e Empresa)' });
      } catch (error: any) {
        console.error(`Erro ao gerar ${tipo}:`, error);
        toast({ 
          title: `Erro ao gerar ${tipo}`, 
          description: error.message || 'Ocorreu um erro ao gerar o documento.',
          variant: 'destructive' 
        });
      }
    } else if (tipo === 'termica') {
      // Impressão térmica com 2 vias
      try {
        const cliente = getClienteById(os.cliente_id);
        const marca = marcas.find(m => m.id === os.marca_id);
        const modelo = modelos.find(m => m.id === os.modelo_id);
        
        // Buscar primeira foto de entrada
        const fotoEntrada = os.fotos_telegram_entrada?.[0];
        const fotoEntradaUrl = fotoEntrada 
          ? (typeof fotoEntrada === 'string' ? fotoEntrada : (fotoEntrada.url || fotoEntrada.thumbnailUrl))
          : undefined;

        // Buscar imagem de referência do aparelho
        const imagemReferenciaUrl = osImageReferenceUrl || null;
        const areasDefeito = os.areas_defeito || [];

        // Gerar via do cliente
        const htmlCliente = await generateOSTermica({
          os,
          clienteNome: cliente?.nome || os.cliente_nome || 'Cliente',
          marcaNome: marca?.nome || os.marca_nome,
          modeloNome: modelo?.nome || os.modelo_nome,
          checklistEntrada: checklistEntradaConfig,
          checklistEntradaMarcados: os.checklist_entrada || [],
          fotoEntradaUrl,
          imagemReferenciaUrl,
          areasDefeito,
          via: 'cliente',
        });

        // Gerar via da loja
        const htmlLoja = await generateOSTermica({
          os,
          clienteNome: cliente?.nome || os.cliente_nome || 'Cliente',
          marcaNome: marca?.nome || os.marca_nome,
          modeloNome: modelo?.nome || os.modelo_nome,
          checklistEntrada: checklistEntradaConfig,
          checklistEntradaMarcados: os.checklist_entrada || [],
          fotoEntradaUrl,
          imagemReferenciaUrl,
          areasDefeito,
          via: 'loja',
        });

        // Imprimir ambas as vias
        printTermica(htmlCliente);
        setTimeout(() => {
          printTermica(htmlLoja);
        }, 1000);

        toast({ title: 'Impressão térmica gerada', description: '2 vias impressas (Cliente e Loja)' });
      } catch (error: any) {
        console.error('Erro ao gerar impressão térmica:', error);
        toast({ 
          title: 'Erro ao gerar impressão térmica', 
          description: error.message || 'Ocorreu um erro ao gerar a impressão.',
          variant: 'destructive' 
        });
      }
    }
  };

  // Funções antigas removidas - agora usando generateOSPDF baseado na térmica
  /*
  const handleGeneratePDF = async (os: any) => {
    try {
      const cliente = getClienteById(os.cliente_id);
      const marca = marcas.find(m => m.id === os.marca_id);
      const modelo = modelos.find(m => m.id === os.modelo_id);

      const formatCurrency = (value?: number) =>
        value !== undefined && value !== null ? currencyFormatters.brl(value) : '-';

      // Formatar checklist de entrada (separando físico e funcional)
      const checklistFisico = checklistEntradaConfig
        .filter(item => item.categoria === 'fisico' && (os.checklist_entrada || []).includes(item.item_id))
        .map(item => item.nome)
        .join(', ') || 'Nenhum problema encontrado';

      const checklistFuncional = checklistEntradaConfig
        .filter(item => item.categoria === 'funcional' && (os.checklist_entrada || []).includes(item.item_id))
        .map(item => item.nome)
        .join(', ') || 'Nenhum item funcional verificado';

      // Buscar primeira foto de entrada
      const fotoEntrada = os.fotos_telegram_entrada?.[0];
      const fotoEntradaUrl = fotoEntrada 
        ? (typeof fotoEntrada === 'string' ? fotoEntrada : (fotoEntrada.url || fotoEntrada.thumbnailUrl))
        : undefined;

      // Removido: areasDefeito (agora apenas checklist)
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
      // Removido: areasDefeitoTexto (agora apenas checklist)

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

      // Função removida: defectsToSvg (não mais necessário - defeitos apenas via checklist)

      const patternSvg = patternToSvg(os.padrao_desbloqueio);
      // Removido: SVG de defeitos (agora apenas checklist)
      const defectsSvg = '';

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
                ${fotoEntradaUrl ? `
                <h3>Foto de Entrada</h3>
                <div class="card" style="text-align: center; padding: 8px;">
                  <img src="${fotoEntradaUrl}" style="max-width: 100%; max-height: 300px; object-fit: contain; border: 1px solid #ddd;" alt="Foto de Entrada" />
                </div>
                ` : ''}
                <h3>Checklist de Entrada</h3>
                <div class="card">
                  ${checklistFisico !== 'Nenhum problema encontrado' ? `
                    <div style="margin-bottom: 4px;">
                      <div class="label" style="color: #dc2626;">Problemas Encontrados:</div>
                      <div style="font-size: 8px; margin-left: 8px; margin-top: 2px;">${checklistFisico}</div>
                    </div>
                  ` : ''}
                  ${checklistFuncional !== 'Nenhum item funcional verificado' ? `
                    <div style="margin-top: 4px;">
                      <div class="label" style="color: #16a34a;">Funcional OK:</div>
                      <div style="font-size: 8px; margin-left: 8px; margin-top: 2px;">${checklistFuncional}</div>
                    </div>
                  ` : ''}
                  ${os.observacoes_checklist ? `
                    <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #ddd;">
                      <div class="label">Observações:</div>
                      <div style="font-size: 8px; margin-left: 8px; margin-top: 2px;">${os.observacoes_checklist}</div>
                    </div>
                  ` : ''}
                </div>
                <h3>Condições do Aparelho</h3>
                <div class="card">
                  <div>${os.condicoes_equipamento || os.observacoes || '-'}</div>
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
  */

  /*
  // Impressão A4
  const handlePrintA4 = async (os: any) => {
    try {
      const cliente = getClienteById(os.cliente_id);
      const marca = marcas.find(m => m.id === os.marca_id);
      const modelo = modelos.find(m => m.id === os.modelo_id);
      
      // Formatar checklist de entrada
      const checklistFisicoA4 = checklistEntradaConfig
        .filter(item => item.categoria === 'fisico' && (os.checklist_entrada || []).includes(item.item_id))
        .map(item => item.nome)
        .join(', ') || 'Nenhum problema encontrado';

      const checklistFuncionalA4 = checklistEntradaConfig
        .filter(item => item.categoria === 'funcional' && (os.checklist_entrada || []).includes(item.item_id))
        .map(item => item.nome)
        .join(', ') || 'Nenhum item funcional verificado';

      // Buscar primeira foto de entrada
      const fotoEntradaA4 = os.fotos_telegram_entrada?.[0];
      const fotoEntradaUrlA4 = fotoEntradaA4 
        ? (typeof fotoEntradaA4 === 'string' ? fotoEntradaA4 : (fotoEntradaA4.url || fotoEntradaA4.thumbnailUrl))
        : undefined;
      
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
            .checklist-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; background: #fafafa; }
            .checklist-section h3 { margin-top: 0; color: #333; }
            .checklist-item { margin: 5px 0; padding-left: 20px; }
            .checklist-fisico { color: #dc2626; }
            .checklist-funcional { color: #16a34a; }
            .foto-entrada { text-align: center; margin: 20px 0; }
            .foto-entrada img { max-width: 100%; max-height: 400px; border: 1px solid #ddd; }
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
          
          ${fotoEntradaUrlA4 ? `
          <div class="foto-entrada">
            <h3>Foto de Entrada</h3>
            <img src="${fotoEntradaUrlA4}" alt="Foto de Entrada" />
          </div>
          ` : ''}
          
          <div class="checklist-section">
            <h3>Checklist de Entrada</h3>
            ${checklistFisicoA4 !== 'Nenhum problema encontrado' ? `
              <div class="checklist-fisico">
                <strong>Problemas Encontrados:</strong>
                <div class="checklist-item">${checklistFisicoA4}</div>
              </div>
            ` : ''}
            ${checklistFuncionalA4 !== 'Nenhum item funcional verificado' ? `
              <div class="checklist-funcional" style="margin-top: 15px;">
                <strong>Funcional OK:</strong>
                <div class="checklist-item">${checklistFuncionalA4}</div>
              </div>
            ` : ''}
            ${os.observacoes_checklist ? `
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
                <strong>Observações:</strong>
                <div style="margin-top: 5px;">${os.observacoes_checklist}</div>
              </div>
            ` : ''}
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
  */

  const content = (
    <div className={cn("w-full h-full flex flex-col overflow-hidden", isModal ? "" : "")}>
        {/* Tabs principais */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
          {/* Header com tabs - compacto */}
          <div className="flex-shrink-0 mb-2 px-2">
            {/* Mobile: grid compacto */}
            <div className="md:hidden">
              <TabsList className="w-full grid grid-cols-3 bg-white h-auto p-1 gap-1 rounded-lg border border-gray-200 shadow-sm">
                <TabsTrigger 
                  value="dados" 
                  className="gap-1 px-1.5 py-1.5 rounded-md data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-medium text-[10px] hover:bg-gray-100 transition-all"
                >
                  <FileText className="h-3 w-3" />
                  <span>Dados</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="checklist" 
                  className="gap-1 px-1.5 py-1.5 rounded-md data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-medium text-[10px] hover:bg-gray-100 transition-all"
                >
                  <Check className="h-3 w-3" />
                  <span>Check</span>
                </TabsTrigger>
                {isEditing && (
                  <>
                    <TabsTrigger 
                      value="resolucao" 
                      className="gap-1 px-1.5 py-1.5 rounded-md data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-medium text-[10px] hover:bg-gray-100 transition-all"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      <span>Resol</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="tecnico" 
                      className="gap-1 px-1.5 py-1.5 rounded-md data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-medium text-[10px] hover:bg-gray-100 transition-all"
                    >
                      <Settings className="h-3 w-3" />
                      <span>Téc</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="itens" 
                      className="gap-1 px-1.5 py-1.5 rounded-md data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-medium text-[10px] hover:bg-gray-100 transition-all"
                    >
                      <Package className="h-3 w-3" />
                      <span>Itens</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="fotos" 
                      className="gap-1 px-1.5 py-1.5 rounded-md data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-medium text-[10px] hover:bg-gray-100 transition-all"
                    >
                      <Image className="h-3 w-3" />
                      <span>Fotos</span>
                    </TabsTrigger>
                  </>
                )}
              </TabsList>
            </div>
            {/* Desktop: linha única compacta */}
            <div className="hidden md:block">
              <TabsList className="inline-flex bg-white h-auto p-1 gap-0 rounded-lg border border-gray-200 shadow-sm">
                <TabsTrigger 
                  value="dados" 
                  className="gap-1.5 px-3 py-1.5 rounded-md data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-medium text-xs hover:bg-gray-100 transition-all"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Dados</span>
                </TabsTrigger>
                <div className="h-4 w-px bg-gray-200 mx-0.5 self-center" />
                <TabsTrigger 
                  value="checklist" 
                  className="gap-1.5 px-3 py-1.5 rounded-md data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-medium text-xs hover:bg-gray-100 transition-all"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Checklist</span>
                </TabsTrigger>
                {isEditing && (
                  <>
                    <div className="h-4 w-px bg-gray-200 mx-0.5 self-center" />
                    <TabsTrigger 
                      value="resolucao" 
                      className="gap-1.5 px-3 py-1.5 rounded-md data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-medium text-xs hover:bg-gray-100 transition-all"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>Resolução</span>
                    </TabsTrigger>
                    <div className="h-4 w-px bg-gray-200 mx-0.5 self-center" />
                    <TabsTrigger 
                      value="tecnico" 
                      className="gap-1.5 px-3 py-1.5 rounded-md data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-medium text-xs hover:bg-gray-100 transition-all"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      <span>Info. Técnicas</span>
                    </TabsTrigger>
                    <div className="h-4 w-px bg-gray-200 mx-0.5 self-center" />
                    <TabsTrigger 
                      value="itens" 
                      className="gap-1.5 px-3 py-1.5 rounded-md data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-medium text-xs hover:bg-gray-100 transition-all"
                    >
                      <Package className="h-3.5 w-3.5" />
                      <span>Peças ({itens.length})</span>
                    </TabsTrigger>
                    <div className="h-4 w-px bg-gray-200 mx-0.5 self-center" />
                    <TabsTrigger 
                      value="financeiro" 
                      className="gap-1.5 px-3 py-1.5 rounded-md data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-medium text-xs hover:bg-gray-100 transition-all"
                    >
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>Financeiro</span>
                    </TabsTrigger>
                    <div className="h-4 w-px bg-gray-200 mx-0.5 self-center" />
                    <TabsTrigger 
                      value="fotos" 
                      className="gap-1.5 px-3 py-1.5 rounded-md data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-medium text-xs hover:bg-gray-100 transition-all"
                    >
                      <Image className="h-3.5 w-3.5" />
                      <span>Fotos</span>
                    </TabsTrigger>
                  </>
                )}
              </TabsList>
            </div>
          </div>

          {/* Resumo Fixo da OS - Compacto */}
          {isEditing && currentOS && (
            <div className="flex-shrink-0 mb-2 px-2">
              <OSSummaryHeader
                numeroOS={currentOS.numero}
                clienteNome={selectedCliente?.nome || getClienteById(currentOS.cliente_id)?.nome}
                modeloNome={modelos.find(m => m.id === currentOS.modelo_id)?.nome || currentOS.modelo_nome}
                status={currentOS.status}
                valorTotal={total}
                valorPago={totalPago}
                previsaoEntrega={currentOS.previsao_entrega}
                tecnicoNome={currentOS.tecnico_id ? getColaboradorById(currentOS.tecnico_id)?.nome || currentOS.tecnico_nome : undefined}
              />
            </div>
          )}

          {/* Tab Dados - com scroll interno */}
          <TabsContent value="dados" className="flex-1 overflow-auto scrollbar-thin p-2 md:p-3">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
              {/* Widget 1: Dados do Cliente e Aparelho */}
              <Card className="border border-gray-200/80 shadow-sm rounded-xl bg-white">
                <CardHeader className="py-3 px-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
                  <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Dados da OS
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  {/* Cliente */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs font-medium text-gray-600">Cliente</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Buscar por nome, CPF/CNPJ ou telefone..."
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
                          className={cn(
                            "pl-10 h-10 text-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg",
                            selectedCliente ? "bg-green-50 border-green-300 text-green-800 font-medium" : ""
                          )}
                        />
                        {selectedCliente && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
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
                        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-56 overflow-auto mt-1">
                          {clienteResults.map(cliente => (
                            <div
                              key={cliente.id}
                              className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                              onClick={() => handleSelectCliente(cliente)}
                            >
                              <p className="font-semibold text-sm text-gray-800">{cliente.nome}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {cliente.cpf_cnpj && <span>{cliente.cpf_cnpj} • </span>}
                                {cliente.telefone || cliente.whatsapp || 'Sem telefone'}
                                {cliente.cidade && <span> • {cliente.cidade}/{cliente.estado}</span>}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                      {showClienteSearch && clienteSearch.length >= 2 && clienteResults.length === 0 && (
                        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-xl p-4 mt-1 text-center">
                          <p className="text-sm text-gray-500">Nenhum cliente encontrado</p>
                          <p className="text-xs text-gray-400 mt-1">Verifique o termo de busca ou cadastre um novo cliente</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-600">Telefone *</Label>
                      <Input
                        value={formData.telefone_contato || selectedCliente?.telefone || selectedCliente?.whatsapp || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, telefone_contato: e.target.value }))}
                        placeholder="(99) 99999-9999"
                        className="h-10 text-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg"
                        required
                      />
                    </div>
                  </div>
                  
                  {/* Aparelho - Linha 1 */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-600">Marca *</Label>
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
                        <SelectTrigger className="w-full h-10 text-sm border-gray-200 rounded-lg">
                          <SelectValue placeholder="Selecione a marca">
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
                            <div className="px-3 py-2 text-sm text-gray-500">Nenhuma marca cadastrada. Acesse Marcas e Modelos para cadastrar.</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-600">Modelo *</Label>
                      <Select 
                        value={formData.modelo_id || ''} 
                        onValueChange={(v) => {
                          setFormData(prev => ({ ...prev, modelo_id: v }));
                        }}
                        disabled={!formData.marca_id}
                      >
                        <SelectTrigger className="w-full h-10 text-sm border-gray-200 rounded-lg" disabled={!formData.marca_id}>
                          <SelectValue placeholder="Selecione o modelo">
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
                            <div className="px-3 py-2 text-sm text-gray-500">
                              {formData.marca_id ? 'Nenhum modelo disponível para esta marca' : 'Selecione uma marca primeiro'}
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-600">IMEI</Label>
                      <Input
                        value={formData.imei}
                        onChange={(e) => setFormData(prev => ({ ...prev, imei: e.target.value }))}
                        placeholder="Digite o IMEI"
                        className="h-10 text-sm border-gray-200 rounded-lg"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-600">Nº Série</Label>
                      <Input
                        value={formData.numero_serie}
                        onChange={(e) => setFormData(prev => ({ ...prev, numero_serie: e.target.value }))}
                        placeholder="Número de série"
                        className="h-10 text-sm border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Aparelho - Linha 2 */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-600">Cor</Label>
                      <Input
                        value={formData.cor}
                        onChange={(e) => setFormData(prev => ({ ...prev, cor: e.target.value }))}
                        placeholder="Ex: Preto, Branco"
                        className="h-10 text-sm border-gray-200 rounded-lg"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-600">Operadora</Label>
                      <Input
                        value={formData.operadora}
                        onChange={(e) => setFormData(prev => ({ ...prev, operadora: e.target.value }))}
                        placeholder="Ex: Vivo, Claro"
                        className="h-10 text-sm border-gray-200 rounded-lg"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-600">Previsão Entrega</Label>
                      <Input
                        type="date"
                        value={formData.previsao_entrega}
                        onChange={(e) => setFormData(prev => ({ ...prev, previsao_entrega: e.target.value }))}
                        className="h-10 text-sm border-gray-200 rounded-lg"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-600">Hora</Label>
                      <Input
                        type="time"
                        value={formData.hora_previsao || '18:00'}
                        onChange={(e) => setFormData(prev => ({ ...prev, hora_previsao: e.target.value }))}
                        className="h-10 text-sm border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Deixou Aparelho */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-gray-600">Deixou aparelho</Label>
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
                      <SelectTrigger className="w-full h-10 text-sm border-gray-200 rounded-lg">
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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-600">Descrição do Problema *</Label>
                      <Textarea
                        value={formData.descricao_problema}
                        onChange={(e) => setFormData(prev => ({ ...prev, descricao_problema: e.target.value }))}
                        placeholder="Descreva detalhadamente o problema relatado pelo cliente..."
                        rows={3}
                        className="resize-none text-sm border-gray-200 rounded-lg min-h-[80px]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-600">Condições do Equipamento</Label>
                      <Textarea
                        value={formData.condicoes_equipamento}
                        onChange={(e) => setFormData(prev => ({ ...prev, condicoes_equipamento: e.target.value }))}
                        placeholder="Estado físico do aparelho: riscos, trincas, amassados..."
                        rows={3}
                        className="resize-none text-sm border-gray-200 rounded-lg min-h-[80px]"
                      />
                    </div>
                  </div>

                  {/* Orçamento Pré Autorizado */}
                  <div className="p-3 bg-gray-50/80 rounded-lg border border-gray-100">
                    <Label className="text-xs font-semibold text-gray-700 mb-2 block">Orçamento Pré-Autorizado</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-gray-500">Cartão até 6x</Label>
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
                          placeholder="R$ 0,00"
                          className="h-10 text-sm border-gray-200 rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-gray-500">Dinheiro ou PIX</Label>
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
                          placeholder="R$ 0,00"
                          className="h-10 text-sm border-gray-200 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Widget 2: Senha e Áreas com Defeito */}
              <Card className="border border-gray-200/80 shadow-sm rounded-xl bg-white">
                <CardHeader className="py-3 px-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
                  <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Senha e Defeitos
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {/* Seção Senha */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-600">Possui senha</Label>
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
                      <SelectTrigger className="w-full h-10 text-sm border-gray-200 rounded-lg">
                        <SelectValue className="truncate">
                          {formData.possui_senha_tipo === 'sim' && 'SIM'}
                          {formData.possui_senha_tipo === 'deslizar' && 'SIM - DESLIZAR (DESENHO)'}
                          {(formData.possui_senha_tipo === 'nao' || !formData.possui_senha_tipo) && 'NÃO'}
                          {formData.possui_senha_tipo === 'nao_sabe' && 'NÃO SABE'}
                          {formData.possui_senha_tipo === 'nao_autorizou' && 'NÃO AUTORIZOU'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        <SelectItem value="sim" className="text-sm">SIM</SelectItem>
                        <SelectItem value="deslizar" className="text-sm">SIM - DESLIZAR (DESENHO)</SelectItem>
                        <SelectItem value="nao" className="text-sm">NÃO</SelectItem>
                        <SelectItem value="nao_sabe" className="text-sm">NÃO SABE, VAI PASSAR DEPOIS</SelectItem>
                        <SelectItem value="nao_autorizou" className="text-sm">CLIENTE NÃO QUIS DEIXAR SENHA</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Senha - Campo de texto quando SIM */}
                    {formData.possui_senha_tipo === 'sim' && (
                      <Input
                        type="text"
                        value={formData.senha_aparelho}
                        onChange={(e) => setFormData(prev => ({ ...prev, senha_aparelho: e.target.value }))}
                        placeholder="Digite a senha do aparelho"
                        className="h-10 text-sm border-gray-200 rounded-lg"
                      />
                    )}

                    {/* Senha - PatternLock quando DESLIZAR */}
                    {formData.possui_senha_tipo === 'deslizar' && (
                      <div className="space-y-2">
                        <div className="flex justify-center p-2 bg-gray-50 rounded-lg">
                          <PatternLock
                            value={formData.padrao_desbloqueio}
                            onChange={(pattern) => setFormData(prev => ({ ...prev, padrao_desbloqueio: pattern }))}
                            className="max-w-[180px]"
                          />
                        </div>
                        <Input
                          value={formData.senha_aparelho}
                          onChange={(e) => setFormData(prev => ({ ...prev, senha_aparelho: e.target.value }))}
                          placeholder="Senha adicional (opcional)"
                          className="h-10 text-sm border-gray-200 rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  {/* Seção Áreas com Defeito - Imagem de Referência Interativa */}
                  <div className="border-t border-gray-100 pt-4">
                    <Label className="text-xs font-medium text-gray-600 mb-2 block">Referência Visual do Aparelho</Label>
                    <div className="h-[220px] flex items-center justify-center bg-gray-50/50 rounded-xl border border-gray-200 p-2">
                      <OSImageReferenceViewer
                        imageUrl={osImageReferenceUrl || null}
                        defects={formData.areas_defeito || []}
                        onDefectsChange={(defects) => setFormData(prev => ({ ...prev, areas_defeito: defects }))}
                        readOnly={false}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 px-1">
                      <p className="text-xs text-gray-500">
                        Clique para marcar defeitos ({formData.areas_defeito?.length || 0})
                      </p>
                      {formData.areas_defeito && formData.areas_defeito.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData(prev => ({ ...prev, areas_defeito: [] }));
                          }}
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded px-2 py-1 transition-colors flex items-center gap-1"
                          title="Limpar todos os defeitos"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Limpar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Checklist */}
          <TabsContent value="checklist" className="flex-1 overflow-auto scrollbar-thin space-y-2 mt-2 p-2">
            <Tabs defaultValue="entrada" className="w-full">
              <TabsList className="w-full justify-start mb-4">
                <TabsTrigger value="entrada">Checklist de Entrada</TabsTrigger>
                {isEditing && currentOS && (
                  <TabsTrigger value="saida">Checklist de Saída</TabsTrigger>
                )}
              </TabsList>

              {/* Checklist de Entrada */}
              <TabsContent value="entrada" className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-2">
                  {/* Problemas Encontrados - Entrada */}
                  <Card className="border-2">
                    <CardHeader className="pb-2 pt-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base text-destructive">Problemas Encontrados</CardTitle>
                          <CardDescription className="text-xs">Marque os problemas encontrados</CardDescription>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          {checklistEntradaConfig.filter(i => i.categoria === 'fisico').filter(item => (formData.checklist_entrada || []).includes(item.item_id)).length} / {checklistEntradaConfig.filter(i => i.categoria === 'fisico').length}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 pt-2">
                      <ScrollArea className="h-[calc(100vh-20rem)] md:h-[400px]">
                        <div className="grid grid-cols-1 gap-1 pr-4">
                          {checklistEntradaConfig.filter(i => i.categoria === 'fisico').map(item => (
                            <div key={item.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50">
                              <Checkbox
                                id={`entrada-fisico-${item.id}`}
                                checked={(formData.checklist_entrada || []).includes(item.item_id)}
                                onCheckedChange={() => toggleChecklist(item.item_id)}
                                disabled={isEditing && currentOS}
                              />
                              <Label htmlFor={`entrada-fisico-${item.id}`} className={cn("text-sm cursor-pointer flex-1", isEditing && currentOS && "cursor-default opacity-75")}>
                                {item.nome}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Funcional OK - Entrada */}
                  <Card className="border-2">
                    <CardHeader className="pb-2 pt-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base text-green-600">Funcional OK</CardTitle>
                          <CardDescription className="text-xs">Marque o que está funcionando</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                            {checklistEntradaConfig.filter(i => i.categoria === 'funcional').filter(item => (formData.checklist_entrada || []).includes(item.item_id)).length} / {checklistEntradaConfig.filter(i => i.categoria === 'funcional').length}
                          </Badge>
                          {!isEditing || !currentOS ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                const funcionalIds = checklistEntradaConfig.filter(i => i.categoria === 'funcional').map(i => i.item_id);
                                const novosIds = [...new Set([...(formData.checklist_entrada || []), ...funcionalIds])];
                                setFormData(prev => ({ ...prev, checklist_entrada: novosIds }));
                              }}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Marcar tudo OK
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 pt-2">
                      <ScrollArea className="h-[calc(100vh-20rem)] md:h-[400px]">
                        <div className="grid grid-cols-1 gap-1 pr-4">
                          {checklistEntradaConfig.filter(i => i.categoria === 'funcional').map(item => (
                            <div key={item.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50">
                              <Checkbox
                                id={`entrada-funcional-${item.id}`}
                                checked={(formData.checklist_entrada || []).includes(item.item_id)}
                                onCheckedChange={() => toggleChecklist(item.item_id)}
                                disabled={isEditing && currentOS}
                              />
                              <Label htmlFor={`entrada-funcional-${item.id}`} className={cn("text-sm cursor-pointer flex-1", isEditing && currentOS && "cursor-default opacity-75")}>
                                {item.nome}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Observações do Checklist de Entrada */}
                <Card>
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-base">Observações do Checklist de Entrada</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <Textarea
                      value={formData.observacoes_checklist || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, observacoes_checklist: e.target.value }))}
                      placeholder="Adicione observações gerais sobre o checklist de entrada..."
                      rows={3}
                      className="resize-none"
                      disabled={isEditing && currentOS}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Checklist de Saída */}
              {isEditing && currentOS && (
                <TabsContent value="saida" className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-2">
                    {/* Problemas Encontrados - Saída */}
                    <Card className="border-2">
                      <CardHeader className="pb-2 pt-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base text-destructive">Problemas Encontrados</CardTitle>
                            <CardDescription className="text-xs">Itens verificados na saída</CardDescription>
                          </div>
                          <Badge variant="destructive" className="text-xs">
                            {checklistSaidaConfig.filter(i => i.categoria === 'fisico').filter(item => (currentOS.checklist_saida || []).includes(item.item_id)).length} / {checklistSaidaConfig.filter(i => i.categoria === 'fisico').length}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 pt-2">
                        <ScrollArea className="h-[calc(100vh-20rem)] md:h-[400px]">
                          <div className="grid grid-cols-1 gap-1 pr-4">
                            {checklistSaidaConfig.filter(i => i.categoria === 'fisico').map(item => (
                              <div key={item.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50">
                                <Checkbox
                                  id={`saida-fisico-${item.id}`}
                                  checked={(currentOS.checklist_saida || []).includes(item.item_id)}
                                  disabled
                                />
                                <Label htmlFor={`saida-fisico-${item.id}`} className="text-sm cursor-default opacity-75 flex-1">
                                  {item.nome}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* Funcional OK - Saída */}
                    <Card className="border-2">
                      <CardHeader className="pb-2 pt-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base text-green-600">Funcional OK</CardTitle>
                            <CardDescription className="text-xs">Itens funcionais verificados na saída</CardDescription>
                          </div>
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                            {checklistSaidaConfig.filter(i => i.categoria === 'funcional').filter(item => (currentOS.checklist_saida || []).includes(item.item_id)).length} / {checklistSaidaConfig.filter(i => i.categoria === 'funcional').length}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 pt-2">
                        <ScrollArea className="h-[calc(100vh-20rem)] md:h-[400px]">
                          <div className="grid grid-cols-1 gap-1 pr-4">
                            {checklistSaidaConfig.filter(i => i.categoria === 'funcional').map(item => (
                              <div key={item.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50">
                                <Checkbox
                                  id={`saida-funcional-${item.id}`}
                                  checked={(currentOS.checklist_saida || []).includes(item.item_id)}
                                  disabled
                                />
                                <Label htmlFor={`saida-funcional-${item.id}`} className="text-sm cursor-default opacity-75 flex-1">
                                  {item.nome}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Status do Checklist de Saída */}
                  {currentOS.checklist_saida_aprovado !== null && (
                    <Card>
                      <CardHeader className="pb-2 pt-3">
                        <CardTitle className="text-base">Resultado do Checklist de Saída</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <div className="flex items-center gap-2">
                          <Badge className={cn(
                            "text-sm",
                            currentOS.checklist_saida_aprovado 
                              ? "bg-green-600 text-white" 
                              : "bg-red-600 text-white"
                          )}>
                            {currentOS.checklist_saida_aprovado ? '✓ Aprovado' : '✗ Reprovado'}
                          </Badge>
                          {currentOS.observacoes_checklist_saida && (
                            <p className="text-sm text-muted-foreground">
                              {currentOS.observacoes_checklist_saida}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              )}
            </Tabs>
          </TabsContent>
          
          {/* Tab Resolução do Problema */}
          {isEditing && (
            <TabsContent value="resolucao" className="flex-1 overflow-auto scrollbar-thin space-y-2 mt-2 p-2">
              <Card className="border-2 border-gray-300 m-2">
                <CardHeader className="pb-2 pt-2 md:pt-3 border-b-2 border-gray-300 flex-shrink-0">
                  <CardTitle className="text-sm md:text-base font-semibold">Resolução do Problema</CardTitle>
                </CardHeader>
                <CardContent className="pt-3 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="problema-constatado" className="text-sm font-medium">Problema Constatado</Label>
                    <Textarea
                      id="problema-constatado"
                      value={formData.problema_constatado || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        console.log('[OrdemServicoForm] Problema constatado onChange - valor:', value);
                        setFormData(prev => {
                          console.log('[OrdemServicoForm] Estado anterior:', prev.problema_constatado);
                          const updated = { ...prev, problema_constatado: value };
                          console.log('[OrdemServicoForm] Estado atualizado:', updated.problema_constatado);
                          return updated;
                        });
                      }}
                      placeholder="Descreva o problema constatado após análise técnica..."
                      rows={12}
                      className="min-h-[220px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      Caracteres: {(formData.problema_constatado || '').length}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Técnico Responsável</Label>
                      <Select
                        value={formData.tecnico_id || ''}
                        onValueChange={(v) => {
                          console.log('[OrdemServicoForm] Técnico selecionado:', v);
                          setFormData(prev => {
                            const updated = { ...prev, tecnico_id: v };
                            console.log('[OrdemServicoForm] Estado atualizado técnico:', updated.tecnico_id);
                            return updated;
                          });
                        }}
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
                      <Label htmlFor="servico-executado">Serviço Executado</Label>
                      <Textarea
                        id="servico-executado"
                        value={formData.servico_executado || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          console.log('[OrdemServicoForm] Serviço executado onChange - valor:', value);
                          setFormData(prev => {
                            console.log('[OrdemServicoForm] Estado anterior servico:', prev.servico_executado);
                            const updated = { ...prev, servico_executado: value };
                            console.log('[OrdemServicoForm] Estado atualizado servico:', updated.servico_executado);
                            return updated;
                          });
                        }}
                        placeholder="Descreva o serviço executado (ex.: troca de tela, troca de bateria, conector, limpeza, atualização, etc.)"
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        Campo livre para digitar exatamente o serviço realizado. Caracteres: {(formData.servico_executado || '').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
          
          {/* Tab Informações Técnicas */}
          {isEditing && (
            <TabsContent value="tecnico" className="flex-1 overflow-auto scrollbar-thin space-y-2 mt-2 p-2">
              <Card className="border-2">
                <CardHeader className="pb-2 pt-2 md:pt-3 border-b-2 border-gray-300 flex-shrink-0">
                  <CardTitle className="text-sm md:text-base font-semibold">Informações Técnicas Internas</CardTitle>
                  <CardDescription className="text-[10px] md:text-xs">Anotações internas que não aparecem para o cliente</CardDescription>
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
            <TabsContent value="fotos" className="flex-1 overflow-auto scrollbar-thin space-y-4 p-2">
              <Card className="border-2 border-gray-300 shadow-lg">
                <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b-2 border-gray-300">
                  <CardTitle className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Image className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                    Fotos da Ordem de Serviço
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm text-gray-600">
                    Fotos serão enviadas automaticamente para o Telegram
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {/* Botões de upload por tipo */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2 p-3 rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50">
                      <Label className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                        <Image className="h-4 w-4 text-blue-600" />
                        Fotos de Entrada
                      </Label>
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
                          className="flex-1 border-2 border-blue-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
                          disabled={!telegramChatIdEntrada || telegramLoading}
                          onClick={() => {
                            document.getElementById('upload-entrada')?.click();
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2 text-blue-600" />
                          <span className="hidden sm:inline">{telegramLoading ? 'Enviando...' : 'Adicionar Fotos'}</span>
                          <span className="sm:hidden">{telegramLoading ? '...' : 'Arquivo'}</span>
                        </Button>
                        <CameraCapture
                          onCapture={async (files) => {
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
                                  thumbnailUrl: r.thumbnailUrl || undefined,
                                  postLink: r.postLink || undefined,
                                  fileName: files[idx]?.name || `foto_${idx + 1}.jpg`,
                                  tipo: 'entrada' as const,
                                  enviadoEm: new Date().toISOString(),
                                  messageId: r.messageId,
                                  fileId: r.fileId,
                                  chatId: chatId,
                                }));
                                const updatedFotos = [
                                  ...(currentOS.fotos_telegram_entrada || []),
                                  ...newPhotos
                                ];

                                await updateOS(currentOS.id, {
                                  fotos_telegram_entrada: updatedFotos,
                                  telegram_chat_id_entrada: chatId,
                                });
                                
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
                            }
                          }}
                          multiple={true}
                          disabled={!telegramChatIdEntrada || telegramLoading || !currentOS?.numero}
                        />
                      </div>
                      {currentOS?.fotos_telegram_entrada && currentOS.fotos_telegram_entrada.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {currentOS.fotos_telegram_entrada.length} foto(s) cadastrada(s)
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 p-3 rounded-lg border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50">
                      <Label className="text-sm font-semibold text-orange-900 flex items-center gap-2">
                        <Image className="h-4 w-4 text-orange-600" />
                        Fotos de Processo
                      </Label>
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
                          className="flex-1 border-2 border-orange-300 hover:border-orange-500 hover:bg-orange-50 transition-all duration-200"
                          disabled={!telegramChatIdProcesso || telegramLoading}
                          onClick={() => {
                            document.getElementById('upload-processo')?.click();
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2 text-orange-600" />
                          <span className="hidden sm:inline">{telegramLoading ? 'Enviando...' : 'Adicionar Fotos'}</span>
                          <span className="sm:hidden">{telegramLoading ? '...' : 'Arquivo'}</span>
                        </Button>
                        <CameraCapture
                          onCapture={async (files) => {
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
                                  thumbnailUrl: r.thumbnailUrl || undefined,
                                  postLink: r.postLink || undefined,
                                  fileName: files[idx]?.name || `foto_${idx + 1}.jpg`,
                                  tipo: 'processo' as const,
                                  enviadoEm: new Date().toISOString(),
                                  messageId: r.messageId,
                                  fileId: r.fileId,
                                  chatId: chatId,
                                }));
                                const updatedFotos = [
                                  ...(currentOS.fotos_telegram_processo || []),
                                  ...newPhotos
                                ];

                                await updateOS(currentOS.id, {
                                  fotos_telegram_processo: updatedFotos,
                                  telegram_chat_id_processo: chatId,
                                });
                                
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
                                    description: `${successful.length} foto(s) de processo enviada(s) com sucesso`,
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
                            }
                          }}
                          multiple={true}
                          disabled={!telegramChatIdProcesso || telegramLoading || !currentOS?.numero}
                        />
                      </div>
                      {currentOS?.fotos_telegram_processo && currentOS.fotos_telegram_processo.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {currentOS.fotos_telegram_processo.length} foto(s) cadastrada(s)
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 p-3 rounded-lg border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100/50">
                      <Label className="text-sm font-semibold text-green-900 flex items-center gap-2">
                        <Image className="h-4 w-4 text-green-600" />
                        Fotos de Saída
                      </Label>
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
                          className="flex-1 border-2 border-green-300 hover:border-green-500 hover:bg-green-50 transition-all duration-200"
                          disabled={!telegramChatIdSaida || telegramLoading}
                          onClick={() => {
                            document.getElementById('upload-saida')?.click();
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2 text-green-600" />
                          <span className="hidden sm:inline">{telegramLoading ? 'Enviando...' : 'Adicionar Fotos'}</span>
                          <span className="sm:hidden">{telegramLoading ? '...' : 'Arquivo'}</span>
                        </Button>
                        <CameraCapture
                          onCapture={async (files) => {
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
                                  thumbnailUrl: r.thumbnailUrl || undefined,
                                  postLink: r.postLink || undefined,
                                  fileName: files[idx]?.name || `foto_${idx + 1}.jpg`,
                                  tipo: 'saida' as const,
                                  enviadoEm: new Date().toISOString(),
                                  messageId: r.messageId,
                                  fileId: r.fileId,
                                  chatId: chatId,
                                }));
                                const updatedFotos = [
                                  ...(currentOS.fotos_telegram_saida || []),
                                  ...newPhotos
                                ];

                                await updateOS(currentOS.id, {
                                  fotos_telegram_saida: updatedFotos,
                                  telegram_chat_id_saida: chatId,
                                });
                                
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
                            }
                          }}
                          multiple={true}
                          disabled={!telegramChatIdSaida || telegramLoading || !currentOS?.numero}
                        />
                      </div>
                      {currentOS?.fotos_telegram_saida && currentOS.fotos_telegram_saida.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {currentOS.fotos_telegram_saida.length} foto(s) cadastrada(s)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resumo de Fotos com Badges */}
                  {(currentOS?.fotos_telegram_entrada?.length || 0) > 0 ||
                   (currentOS?.fotos_telegram_processo?.length || 0) > 0 ||
                   (currentOS?.fotos_telegram_saida?.length || 0) > 0 ? (
                    <div className="flex items-center gap-3 mb-4 p-4 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-lg border-2 border-gray-200 shadow-md">
                      <Image className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                      <span className="text-sm md:text-base font-semibold text-gray-800">Fotos:</span>
                      {currentOS?.fotos_telegram_entrada?.length > 0 && (
                        <Badge variant="outline" className="gap-1 border-2 border-blue-300 bg-blue-100 text-blue-900 font-semibold hover:bg-blue-200 transition-colors">
                          <Image className="h-3 w-3" />
                          Entrada: {currentOS.fotos_telegram_entrada.length}
                        </Badge>
                      )}
                      {currentOS?.fotos_telegram_processo?.length > 0 && (
                        <Badge variant="outline" className="gap-1 border-2 border-orange-300 bg-orange-100 text-orange-900 font-semibold hover:bg-orange-200 transition-colors">
                          <Image className="h-3 w-3" />
                          Processo: {currentOS.fotos_telegram_processo.length}
                        </Badge>
                      )}
                      {currentOS?.fotos_telegram_saida?.length > 0 && (
                        <Badge variant="outline" className="gap-1 border-2 border-green-300 bg-green-100 text-green-900 font-semibold hover:bg-green-200 transition-colors">
                          <Image className="h-3 w-3" />
                          Saída: {currentOS.fotos_telegram_saida.length}
                        </Badge>
                      )}
                    </div>
                  ) : null}

                  {/* Galeria de fotos com preview */}
                  {(currentOS?.fotos_telegram_entrada && currentOS.fotos_telegram_entrada.length > 0) ||
                   (currentOS?.fotos_telegram_processo && currentOS.fotos_telegram_processo.length > 0) ||
                   (currentOS?.fotos_telegram_saida && currentOS.fotos_telegram_saida.length > 0) ? (
                    <div className="space-y-4">
                      {currentOS?.fotos_telegram_entrada && currentOS.fotos_telegram_entrada.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Image className="h-4 w-4" />
                            Fotos de Entrada
                            <Badge variant="secondary" className="ml-1">
                              {currentOS.fotos_telegram_entrada.length}
                            </Badge>
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {[...currentOS.fotos_telegram_entrada]
                              .sort((a, b) => {
                                const aData = typeof a === 'string' ? new Date(0) : (a.enviadoEm ? new Date(a.enviadoEm) : new Date(0));
                                const bData = typeof b === 'string' ? new Date(0) : (b.enviadoEm ? new Date(b.enviadoEm) : new Date(0));
                                return bData.getTime() - aData.getTime(); // Mais recente primeiro
                              })
                              .map((foto, index) => {
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
                            Fotos de Processo
                            <Badge variant="secondary" className="ml-1">
                              {currentOS.fotos_telegram_processo.length}
                            </Badge>
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
                            Fotos de Saída
                            <Badge variant="secondary" className="ml-1">
                              {currentOS.fotos_telegram_saida.length}
                            </Badge>
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
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Image className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-base font-medium mb-2">Nenhuma foto cadastrada ainda</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Adicione fotos de entrada, processo ou saída para documentar a OS
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Configure os Chat IDs do Telegram acima para enviar fotos automaticamente
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Tab Itens (Peças/Serviços) */}
          {isEditing && (
            <TabsContent value="itens" className="flex-1 overflow-auto scrollbar-thin space-y-2 mt-2 p-2">
              <Card className="border-2">
                <CardHeader className="pb-2 pt-3 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Peças e Serviços</CardTitle>
                    <Button onClick={() => {
                      setEditingItem(null);
                      setItemForm({ tipo: 'servico', produto_id: undefined, descricao: '', quantidade: 1, valor_unitario: 0, valor_minimo: 0, desconto: 0, garantia: 90, colaborador_id: '' });
                      setShowAddItem(true);
                    }} size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-2 flex-1 flex flex-col min-h-0">
                  {itens.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Package className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-base font-medium mb-2">Nenhum item adicionado ainda</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Adicione peças ou serviços para compor o orçamento da OS
                      </p>
                      <Button 
                        onClick={() => {
                          setEditingItem(null);
                          setItemForm({ tipo: 'servico', produto_id: undefined, descricao: '', quantidade: 1, valor_unitario: 0, valor_minimo: 0, desconto: 0, garantia: 90, colaborador_id: '' });
                          setShowAddItem(true);
                        }}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar Primeiro Item
                      </Button>
                    </div>
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
            <TabsContent value="financeiro" className="flex-1 overflow-auto scrollbar-thin space-y-2 mt-2 p-2">

              {/* Saldo Pendente em Destaque */}
              {total - totalPago > 0 && (
                <Card className="border-2 border-orange-500 bg-orange-50/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-6 w-6 text-orange-600" />
                        <div>
                          <p className="text-sm font-medium text-orange-900">Saldo Pendente</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {currencyFormatters.brl(total - totalPago)}
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => {
                          if (!currentOS?.id) {
                            toast({ 
                              title: 'Erro', 
                              description: 'OS não encontrada',
                              variant: 'destructive'
                            });
                            return;
                          }
                          // Navegar para o PDV com a OS pré-carregada
                          // Salvar o ID da OS no localStorage para o PDV importar
                          localStorage.setItem('pdv_import_os_id', currentOS.id);
                          localStorage.setItem('pdv_import_os_numero', currentOS.numero?.toString() || '');
                          navigate('/pdv/nova');
                        }}
                        className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
                        size="lg"
                      >
                        <Plus className="h-4 w-4" />
                        Registrar Pagamento
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

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
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Pagamentos</CardTitle>
                    <Button 
                      onClick={() => {
                        // TODO: Abrir dialog de pagamento
                        toast({ title: 'Funcionalidade em desenvolvimento', description: 'Dialog de pagamento será implementado' });
                      }}
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar Pagamento
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-2 flex-1 flex flex-col min-h-0">
                  {pagamentos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-base font-medium mb-2">Nenhum pagamento registrado</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Registre o primeiro pagamento para começar a controlar o financeiro desta OS
                      </p>
                      <Button 
                        onClick={() => {
                          // TODO: Abrir dialog de pagamento
                          toast({ title: 'Funcionalidade em desenvolvimento', description: 'Dialog de pagamento será implementado' });
                        }}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Registrar Primeiro Pagamento
                      </Button>
                    </div>
                  ) : (
                    <ScrollArea className="flex-1">
                      <div className="w-full overflow-x-auto">
                        <div className="min-w-[900px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Forma de Pagamento</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pagamentos.map(pag => {
                                const getPaymentIcon = (forma: string) => {
                                  const formaLower = forma?.toLowerCase() || '';
                                  if (formaLower.includes('pix')) return <QrCode className="h-4 w-4" />;
                                  if (formaLower.includes('dinheiro') || formaLower.includes('cash')) return <Banknote className="h-4 w-4" />;
                                  if (formaLower.includes('cartão') || formaLower.includes('cartao') || formaLower.includes('card')) return <CreditCard className="h-4 w-4" />;
                                  return <Wallet className="h-4 w-4" />;
                                };
                                return (
                                  <TableRow key={pag.id}>
                                    <TableCell>{dateFormatters.short(pag.data_pagamento)}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline">
                                        {pag.tipo === 'adiantamento' ? 'Adiantamento' : 'Pagamento Final'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        {getPaymentIcon(pag.forma_pagamento)}
                                        <span className="capitalize">{pag.forma_pagamento}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">{currencyFormatters.brl(pag.valor)}</TableCell>
                                  </TableRow>
                                );
                              })}
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
                  className="pl-9 text-base"
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
                            <p className="font-medium">{prod.nome}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-muted-foreground">
                                {currencyFormatters.brl(prod.valor_venda || prod.preco_venda || 0)}
                              </p>
                              <Badge 
                                variant={(prod.quantidade || 0) > 0 ? "default" : "destructive"}
                                className="text-xs"
                              >
                                Estoque: {prod.quantidade || 0}
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
                      Nenhum produto encontrado com estoque disponível.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Apenas produtos com estoque maior que zero são exibidos. Verifique se o produto está cadastrado e possui estoque disponível.
                    </p>
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
                      ? produtos.find(p => p.id === itemForm.produto_id)?.quantidade || undefined
                      : undefined}
                    value={itemForm.quantidade}
                    onChange={(e) => {
                      const valor = parseInt(e.target.value) || 1;
                      // Se for peça, validar contra estoque
                      if (itemForm.tipo === 'peca' && itemForm.produto_id) {
                        const produto = produtos.find(p => p.id === itemForm.produto_id);
                        const estoqueDisponivel = produto?.quantidade || 0;
                        if (produto && valor > estoqueDisponivel) {
                          toast({
                            title: 'Quantidade excede estoque',
                            description: `Estoque disponível: ${estoqueDisponivel} unidades.`,
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
                      Estoque disponível: {produtos.find(p => p.id === itemForm.produto_id)?.quantidade || 0} unidades
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={itemForm.descricao}
                  onChange={(e) => {
                    // Sempre permitir editar a descrição (pode ser ajustada manualmente)
                    setItemForm(prev => ({ ...prev, descricao: e.target.value }));
                  }}
                  placeholder={itemForm.tipo === 'peca' && !itemForm.produto_id ? "Selecione uma peça do estoque acima ou digite manualmente" : "Descrição do item"}
                />
                {itemForm.tipo === 'peca' && !itemForm.produto_id && (
                  <p className="text-xs text-muted-foreground">
                    Busque e selecione uma peça do estoque acima ou digite manualmente
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
                    value={itemForm.garantia || 90}
                    onChange={(e) => setItemForm(prev => ({ ...prev, garantia: parseInt(e.target.value) || 90 }))}
                    placeholder="90"
                  />
                  <p className="text-xs text-muted-foreground">
                    Padrão: 90 dias (ou conforme cadastro do produto)
                  </p>
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
        <div className="p-3 flex-shrink-0 mt-auto">
          <Card className="border border-gray-200 shadow-sm rounded-xl bg-white">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  {!isModal && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/os')}
                      className="gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Voltar
                    </Button>
                  )}
                  {isEditing && currentOS && (
                    <>
                      <span className="text-sm font-medium text-gray-600">Status OS:</span>
                      <Select value={currentOS.status} onValueChange={handleChangeStatus}>
                        <SelectTrigger className={cn('w-[160px] h-9 text-white border-0 rounded-lg', (() => {
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

                <div className="flex items-center justify-center sm:justify-end gap-2 flex-wrap">
                  {isEditing && currentOS && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleWhatsApp()}
                        disabled={whatsappLoading}
                        className="rounded-lg"
                      >
                        <Send className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">
                          {whatsappLoading ? 'Enviando...' : 'Enviar no WhatsApp'}
                        </span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handlePrint('termica')} className="rounded-lg">
                        <Printer className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Térmica</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handlePrint('a4')} className="rounded-lg">
                        <Printer className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">A4</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handlePrint('pdf')} className="rounded-lg">
                        <Download className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Salvar PDF</span>
                      </Button>
                    </>
                  )}
                  <LoadingButton onClick={handleSubmit} loading={isLoading} size="sm" className="rounded-lg bg-emerald-600 hover:bg-emerald-700">
                    <Save className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">{isEditing ? 'Atualizar' : 'Salvar'}</span>
                    <span className="sm:hidden">{isEditing ? 'Atualizar' : 'Salvar'}</span>
                  </LoadingButton>
                </div>
              </div>
            </CardContent>
          </Card>
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

      {/* Modal de Checklist de Saída */}
      <Dialog open={showChecklistSaidaModal} onOpenChange={setShowChecklistSaidaModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Checklist de Saída - OS #{currentOS?.numero}</DialogTitle>
            <DialogDescription>
              Marque os itens verificados antes de finalizar a manutenção. O aparelho será aprovado ou reprovado com base neste checklist.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Grid de Checklist */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Problemas Encontrados */}
              <Card>
                <CardHeader className="pb-2 pt-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-destructive">Problemas Encontrados</CardTitle>
                    <Badge variant="destructive" className="text-xs">
                      {checklistSaidaConfig.filter(i => i.categoria === 'fisico').filter(item => checklistSaidaMarcados.includes(item.item_id)).length} / {checklistSaidaConfig.filter(i => i.categoria === 'fisico').length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2 pr-4">
                      {checklistSaidaConfig.filter(i => i.categoria === 'fisico').map(item => (
                        <div key={item.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50">
                          <Checkbox
                            id={`saida-${item.item_id}`}
                            checked={checklistSaidaMarcados.includes(item.item_id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setChecklistSaidaMarcados(prev => [...prev, item.item_id]);
                              } else {
                                setChecklistSaidaMarcados(prev => prev.filter(id => id !== item.item_id));
                              }
                            }}
                          />
                          <Label htmlFor={`saida-${item.item_id}`} className="text-sm cursor-pointer flex-1">
                            {item.nome}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Funcional OK */}
              <Card>
                <CardHeader className="pb-2 pt-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-green-600">Funcional OK</CardTitle>
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                      {checklistSaidaConfig.filter(i => i.categoria === 'funcional').filter(item => checklistSaidaMarcados.includes(item.item_id)).length} / {checklistSaidaConfig.filter(i => i.categoria === 'funcional').length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2 pr-4">
                      {checklistSaidaConfig.filter(i => i.categoria === 'funcional').map(item => (
                        <div key={item.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50">
                          <Checkbox
                            id={`saida-${item.item_id}`}
                            checked={checklistSaidaMarcados.includes(item.item_id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setChecklistSaidaMarcados(prev => [...prev, item.item_id]);
                              } else {
                                setChecklistSaidaMarcados(prev => prev.filter(id => id !== item.item_id));
                              }
                            }}
                          />
                          <Label htmlFor={`saida-${item.item_id}`} className="text-sm cursor-pointer flex-1">
                            {item.nome}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Aprovação/Reprovação */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resultado do Checklist</CardTitle>
                <CardDescription>O aparelho foi aprovado ou reprovado no checklist de saída?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    variant={checklistSaidaAprovado === true ? 'default' : 'outline'}
                    className={cn('flex-1', checklistSaidaAprovado === true && 'bg-green-600 hover:bg-green-700')}
                    onClick={() => setChecklistSaidaAprovado(true)}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Aprovado
                  </Button>
                  <Button
                    variant={checklistSaidaAprovado === false ? 'default' : 'outline'}
                    className={cn('flex-1', checklistSaidaAprovado === false && 'bg-red-600 hover:bg-red-700')}
                    onClick={() => setChecklistSaidaAprovado(false)}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Reprovado
                  </Button>
                </div>

                {checklistSaidaAprovado === false && (
                  <div className="space-y-2">
                    <Label>Observações (Ressalvas)</Label>
                    <Textarea
                      value={checklistSaidaObservacoes}
                      onChange={(e) => setChecklistSaidaObservacoes(e.target.value)}
                      placeholder="Descreva as ressalvas ou problemas encontrados..."
                      rows={3}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowChecklistSaidaModal(false);
              setPendingStatusChange(null);
              setChecklistSaidaMarcados([]);
              setChecklistSaidaAprovado(null);
              setChecklistSaidaObservacoes('');
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleFinalizarChecklistSaida}
              disabled={checklistSaidaAprovado === null}
              className={cn(
                checklistSaidaAprovado === true && 'bg-green-600 hover:bg-green-700',
                checklistSaidaAprovado === false && 'bg-red-600 hover:bg-red-700'
              )}
            >
              <Save className="h-4 w-4 mr-2" />
              Finalizar Checklist e Atualizar Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModernLayout>
  );
}
