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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Save, X, Plus, Search, Phone, Printer, Send, Trash2, Edit,
  User, Smartphone, FileText, Check, AlertTriangle, Package, DollarSign
} from 'lucide-react';
import { 
  useOrdensServico, useClientes, useMarcasModelos, useProdutos, 
  useItensOS, usePagamentos, buscarCEP, useConfiguracaoStatus
} from '@/hooks/useAssistencia';
import { useCargos } from '@/hooks/useCargos';
import { 
  OrdemServicoFormData, CHECKLIST_ITENS, ItemOS,
  STATUS_OS_LABELS, STATUS_OS_COLORS, StatusOS
} from '@/types/assistencia';
import { PhoneDrawing, PhoneDrawingLegend } from '@/components/assistencia/PhoneDrawing';
import { PatternLock } from '@/components/assistencia/PatternLock';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { LoadingButton } from '@/components/LoadingButton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function OrdemServicoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { toast } = useToast();

  // Hooks
  const { createOS, updateOS, getOSById, updateStatus } = useOrdensServico();
  const { clientes, searchClientes, createCliente, getClienteById } = useClientes();
  const { marcas, modelos, getModelosByMarca } = useMarcasModelos();
  const { produtos, searchProdutos } = useProdutos();
  const { configuracoes, getConfigByStatus } = useConfiguracaoStatus();
  const { tecnicos, colaboradores, getColaboradorById } = useCargos();

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
    senha_aparelho: '',
    senha_numerica: '', // Para iPhone
    padrao_desbloqueio: '', // Padrão de desbloqueio
    possui_senha: false,
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
  const [activeTab, setActiveTab] = useState('dados');

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
  const { itens, total, addItem, updateItem, removeItem } = useItensOS(id || '');
  const { pagamentos, totalPago, addPagamento } = usePagamentos(id || '');

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
      }
    }
  }, [id, isEditing, getOSById, getClienteById]);

  // Buscar cliente
  useEffect(() => {
    if (clienteSearch.length >= 2) {
      const results = searchClientes(clienteSearch);
      setClienteResults(results.slice(0, 10));
    } else {
      setClienteResults([]);
    }
  }, [clienteSearch, searchClientes]);

  // Buscar produtos
  useEffect(() => {
    if (produtoSearch.length >= 2) {
      const results = searchProdutos(produtoSearch);
      setProdutoResults(results.slice(0, 10));
    } else {
      setProdutoResults([]);
    }
  }, [produtoSearch, searchProdutos]);

  // Modelos filtrados por marca
  const modelosFiltrados = useMemo(() => {
    if (!formData.marca_id) return [];
    return getModelosByMarca(formData.marca_id);
  }, [formData.marca_id, getModelosByMarca]);

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
    const valorTotal = (itemForm.quantidade * itemForm.valor_unitario) - itemForm.desconto;
    const colaborador = itemForm.colaborador_id ? getColaboradorById(itemForm.colaborador_id) : null;
    
    if (editingItem) {
      updateItem(editingItem.id, {
        ...itemForm,
        valor_total: valorTotal,
        colaborador_nome: colaborador?.nome,
      });
      setEditingItem(null);
    } else {
      addItem({
        ...itemForm,
        produto_id: undefined,
        valor_total: valorTotal,
        colaborador_nome: colaborador?.nome,
      });
    }
    
    setShowAddItem(false);
    setItemForm({
      tipo: 'servico',
      descricao: '',
      quantidade: 1,
      valor_unitario: 0,
      valor_minimo: 0,
      desconto: 0,
      garantia: 0,
      colaborador_id: '',
    });
    setProdutoSearch('');
  };

  // Editar item
  const handleEditItem = (item: ItemOS) => {
    setEditingItem(item);
    setItemForm({
      tipo: item.tipo,
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

  // Selecionar produto
  const handleSelectProduto = (produto: any) => {
    setItemForm(prev => ({
      ...prev,
      descricao: produto.descricao,
      valor_unitario: produto.preco_venda,
      tipo: produto.tipo as any,
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
        toast({ title: 'OS atualizada!' });
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
        navigate(`/pdv/os/${novaOS.id}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Alterar status
  const handleChangeStatus = async (status: StatusOS) => {
    if (!currentOS) return;
    
    const config = getConfigByStatus(status);
    await updateStatus(currentOS.id, status, config?.notificar_whatsapp);
    setCurrentOS((prev: any) => prev ? { ...prev, status } : null);
  };

  // WhatsApp
  const handleWhatsApp = (mensagem?: string) => {
    const telefone = formData.telefone_contato || selectedCliente?.whatsapp || selectedCliente?.telefone;
    if (telefone) {
      const numero = telefone.replace(/\D/g, '');
      const texto = mensagem ? encodeURIComponent(mensagem) : '';
      window.open(`https://wa.me/55${numero}${texto ? `?text=${texto}` : ''}`, '_blank');
    }
  };

  // Impressão
  const handlePrint = (tipo: 'a4' | 'termica') => {
    toast({ title: `Impressão ${tipo.toUpperCase()} em desenvolvimento` });
  };

  return (
    <ModernLayout 
      title={isEditing ? `OS #${currentOS?.numero || ''}` : 'Nova Ordem de Serviço'} 
      subtitle={isEditing ? 'Editar ordem de serviço' : 'Cadastrar nova OS'}
    >
      <div className="space-y-4 w-full">
        {/* Header com ações */}
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {isEditing && currentOS && (
                  <>
                    <Badge className={cn('text-white', STATUS_OS_COLORS[currentOS.status as StatusOS])}>
                      {STATUS_OS_LABELS[currentOS.status as StatusOS]}
                    </Badge>
                    <Select value={currentOS.status} onValueChange={handleChangeStatus}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Alterar Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_OS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isEditing && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleWhatsApp()}>
                      <Phone className="h-4 w-4 mr-1" />
                      WhatsApp
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handlePrint('termica')}>
                      <Printer className="h-4 w-4 mr-1" />
                      Térmica
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handlePrint('a4')}>
                      <Printer className="h-4 w-4 mr-1" />
                      A4
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={() => navigate('/pdv/os')}>
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
                <LoadingButton onClick={handleSubmit} loading={isLoading}>
                  <Save className="h-4 w-4 mr-1" />
                  {isEditing ? 'Atualizar' : 'Salvar'}
                </LoadingButton>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs principais */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="dados" className="gap-2">
              <FileText className="h-4 w-4" />
              Dados da OS
            </TabsTrigger>
            <TabsTrigger value="checklist" className="gap-2">
              <Check className="h-4 w-4" />
              Checklist
            </TabsTrigger>
            {isEditing && (
              <>
                <TabsTrigger value="resolucao" className="gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Resolução
                </TabsTrigger>
                <TabsTrigger value="itens" className="gap-2">
                  <Package className="h-4 w-4" />
                  Peças/Serviços ({itens.length})
                </TabsTrigger>
                <TabsTrigger value="financeiro" className="gap-2">
                  <DollarSign className="h-4 w-4" />
                  Financeiro
                </TabsTrigger>
                <TabsTrigger value="tecnico" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Informações Técnicas
                </TabsTrigger>
                <TabsTrigger value="fotos" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Fotos
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Tab Dados */}
          <TabsContent value="dados" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Coluna 1: Cliente */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedCliente ? (
                    <div className="p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{selectedCliente.nome}</p>
                          {selectedCliente.cpf_cnpj && (
                            <p className="text-sm text-muted-foreground">{selectedCliente.cpf_cnpj}</p>
                          )}
                          {(selectedCliente.telefone || selectedCliente.whatsapp) && (
                            <p className="text-sm text-green-600">{selectedCliente.whatsapp || selectedCliente.telefone}</p>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setSelectedCliente(null);
                          setFormData(prev => ({ ...prev, cliente_id: '' }));
                        }}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por nome, CPF ou telefone..."
                          value={clienteSearch}
                          onChange={(e) => {
                            setClienteSearch(e.target.value);
                            setShowClienteSearch(true);
                          }}
                          onFocus={() => setShowClienteSearch(true)}
                          className="pl-9"
                        />
                      </div>
                      
                      {showClienteSearch && clienteResults.length > 0 && (
                        <div className="absolute z-50 w-full bg-background border rounded-lg shadow-lg max-h-60 overflow-auto">
                          {clienteResults.map(cliente => (
                            <div
                              key={cliente.id}
                              className="p-2 hover:bg-muted cursor-pointer"
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
                  )}

                  <div className="space-y-2">
                    <Label>Telefone para Contato *</Label>
                    <Input
                      value={formData.telefone_contato}
                      onChange={(e) => setFormData(prev => ({ ...prev, telefone_contato: e.target.value }))}
                      placeholder="(99) 99999-9999"
                      required
                    />
                  </div>
                  
                  {selectedCliente?.nome_fantasia && (
                    <div className="space-y-2">
                      <Label>Empresa</Label>
                      <Input
                        value={selectedCliente.nome_fantasia}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Coluna 2: Aparelho */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Aparelho
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Marca</Label>
                      <Select 
                        value={formData.marca_id} 
                        onValueChange={(v) => {
                          const marcaSelecionada = marcas.find(m => m.id === v);
                          setFormData(prev => ({ 
                            ...prev, 
                            marca_id: v, 
                            modelo_id: '' 
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a marca">
                            {formData.marca_id ? marcas.find(m => m.id === formData.marca_id)?.nome || currentOS?.marca_nome : 'Selecione'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {marcas.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formData.marca_id && (
                        <p className="text-xs text-muted-foreground">
                          Marca: {marcas.find(m => m.id === formData.marca_id)?.nome}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Modelo</Label>
                      <Select 
                        value={formData.modelo_id} 
                        onValueChange={(v) => {
                          const modeloSelecionado = modelosFiltrados.find(m => m.id === v);
                          setFormData(prev => ({ ...prev, modelo_id: v }));
                        }}
                        disabled={!formData.marca_id}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o modelo">
                            {formData.modelo_id ? modelosFiltrados.find(m => m.id === formData.modelo_id)?.nome || currentOS?.modelo_nome : 'Selecione'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {modelosFiltrados.length > 0 ? (
                            modelosFiltrados.map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                            ))
                          ) : (
                            <SelectItem value="" disabled>Nenhum modelo disponível</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {formData.modelo_id && (
                        <p className="text-xs text-muted-foreground">
                          Modelo: {modelosFiltrados.find(m => m.id === formData.modelo_id)?.nome}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>IMEI</Label>
                      <Input
                        value={formData.imei}
                        onChange={(e) => setFormData(prev => ({ ...prev, imei: e.target.value }))}
                        placeholder="IMEI do aparelho"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cor</Label>
                      <Input
                        value={formData.cor}
                        onChange={(e) => setFormData(prev => ({ ...prev, cor: e.target.value }))}
                        placeholder="Cor do aparelho"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="possui_senha"
                        checked={formData.possui_senha}
                        onCheckedChange={(v) => setFormData(prev => ({ ...prev, possui_senha: !!v }))}
                      />
                      <Label htmlFor="possui_senha" className="text-sm">Possui Senha</Label>
                    </div>
                    
                    {formData.possui_senha && (
                      <div className="space-y-3 pl-6 border-l-2">
                        {/* Verificar se é iPhone para mostrar campo numérico ou padrão */}
                        {formData.marca_id && marcas.find(m => m.id === formData.marca_id)?.nome.toLowerCase().includes('apple') ? (
                          <div className="space-y-2">
                            <Label>Senha Numérica (iPhone)</Label>
                            <Input
                              type="number"
                              value={formData.senha_numerica}
                              onChange={(e) => setFormData(prev => ({ ...prev, senha_numerica: e.target.value }))}
                              placeholder="Digite a senha numérica"
                              maxLength={6}
                            />
                          </div>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <Label>Padrão de Desbloqueio</Label>
                              <PatternLock
                                value={formData.padrao_desbloqueio}
                                onChange={(pattern) => setFormData(prev => ({ ...prev, padrao_desbloqueio: pattern }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Senha (se houver)</Label>
                              <Input
                                value={formData.senha_aparelho}
                                onChange={(e) => setFormData(prev => ({ ...prev, senha_aparelho: e.target.value }))}
                                placeholder="Senha adicional"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="deixou_aparelho"
                        checked={formData.deixou_aparelho}
                        onCheckedChange={(v) => setFormData(prev => ({ ...prev, deixou_aparelho: !!v, apenas_agendamento: !v }))}
                      />
                      <Label htmlFor="deixou_aparelho" className="text-sm">Deixou o aparelho</Label>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="apenas_agendamento"
                        checked={formData.apenas_agendamento}
                        onCheckedChange={(v) => setFormData(prev => ({ ...prev, apenas_agendamento: !!v, deixou_aparelho: !v }))}
                      />
                      <Label htmlFor="apenas_agendamento" className="text-sm">Apenas agendamento</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Coluna 3: Desenho do aparelho */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Áreas com Defeito
                  </CardTitle>
                  <CardDescription>Clique para marcar as áreas com problemas</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <PhoneDrawing
                    areas={formData.areas_defeito}
                    onAreasChange={(areas) => setFormData(prev => ({ ...prev, areas_defeito: areas }))}
                  />
                  <PhoneDrawingLegend />
                </CardContent>
              </Card>
            </div>

            {/* Descrição do problema e previsão */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Descrição do Problema *</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={formData.descricao_problema}
                    onChange={(e) => setFormData(prev => ({ ...prev, descricao_problema: e.target.value }))}
                    placeholder="Descreva o problema relatado pelo cliente..."
                    rows={4}
                    className="resize-none"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Condições e Observações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>Condições do Equipamento</Label>
                    <Textarea
                      value={formData.condicoes_equipamento}
                      onChange={(e) => setFormData(prev => ({ ...prev, condicoes_equipamento: e.target.value }))}
                      placeholder="Estado físico do aparelho ao receber..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Previsão de Entrega</Label>
                      <Input
                        type="date"
                        value={formData.previsao_entrega}
                        onChange={(e) => setFormData(prev => ({ ...prev, previsao_entrega: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Hora de Entrega</Label>
                      <Input
                        type="time"
                        value={formData.hora_previsao}
                        onChange={(e) => setFormData(prev => ({ ...prev, hora_previsao: e.target.value }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Orçamento Pré-autorizado */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Orçamento Pré-autorizado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="orcamento_autorizado"
                      checked={formData.orcamento_autorizado}
                      onCheckedChange={(v) => setFormData(prev => ({ ...prev, orcamento_autorizado: !!v }))}
                    />
                    <Label htmlFor="orcamento_autorizado" className="text-sm">Orçamento pré-autorizado</Label>
                  </div>
                  
                  {formData.orcamento_autorizado && (
                    <div className="grid grid-cols-2 gap-3 pl-6">
                      <div className="space-y-2">
                        <Label>Valor Parcelado (Débito/Crédito até 6x)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.orcamento_parcelado || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, orcamento_parcelado: parseFloat(e.target.value) || 0 }))}
                          placeholder="0,00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Valor com Desconto (Dinheiro/PIX)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.orcamento_desconto || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, orcamento_desconto: parseFloat(e.target.value) || 0 }))}
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Checklist */}
          <TabsContent value="checklist" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Estado Físico */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-destructive">Estado Físico</CardTitle>
                  <CardDescription>Marque os problemas encontrados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2">
                    {CHECKLIST_ITENS.filter(i => i.categoria === 'fisico').map(item => (
                      <div key={item.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50">
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
                </CardContent>
              </Card>

              {/* Estado Funcional */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-green-600">Estado Funcional</CardTitle>
                  <CardDescription>Marque o que está funcionando</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2">
                    {CHECKLIST_ITENS.filter(i => i.categoria === 'funcional').map(item => (
                      <div key={item.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50">
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
                </CardContent>
              </Card>
            </div>
            
            {/* Observações do Checklist */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Observações Gerais do Checklist</CardTitle>
              </CardHeader>
              <CardContent>
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
            <TabsContent value="resolucao" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Resolução do Problema</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Problema Constatado</Label>
                    <Textarea
                      value={formData.problema_constatado || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, problema_constatado: e.target.value }))}
                      placeholder="Descreva o problema constatado após análise técnica..."
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
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
                          {tecnicos.length > 0 ? (
                            tecnicos.map(tecnico => (
                              <SelectItem key={tecnico.id} value={tecnico.id}>
                                {tecnico.nome}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="" disabled>Nenhum técnico cadastrado</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Serviço Executado</Label>
                      <Select
                        value={formData.servico_executado || ''}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, servico_executado: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* TODO: Carregar lista de serviços */}
                          <SelectItem value="troca_tela">Troca de Tela</SelectItem>
                          <SelectItem value="troca_bateria">Troca de Bateria</SelectItem>
                          <SelectItem value="troca_conector">Troca de Conector</SelectItem>
                          <SelectItem value="limpeza">Limpeza</SelectItem>
                          <SelectItem value="formatação">Formatação</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
          
          {/* Tab Informações Técnicas */}
          {isEditing && (
            <TabsContent value="tecnico" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Informações Técnicas Internas</CardTitle>
                  <CardDescription>Anotações internas que não aparecem para o cliente</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={formData.observacoes_internas || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, observacoes_internas: e.target.value }))}
                    placeholder="Ex: faltando parafuso, câmera não funciona, placa oxidada, peças removidas..."
                    rows={8}
                    className="resize-none"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}
          
          {/* Tab Fotos */}
          {isEditing && (
            <TabsContent value="fotos" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Fotos da Ordem de Serviço</CardTitle>
                  <CardDescription>Fotos serão salvas automaticamente no Google Drive</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        // TODO: Implementar captura de foto ou upload
                        toast({ title: 'Funcionalidade em desenvolvimento', description: 'Integração com Google Drive em andamento' });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Tirar Foto / Upload
                    </Button>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>As fotos serão automaticamente:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Salvas em uma pasta no Google Drive com o nome: OS-{currentOS?.numero || 'N'}</li>
                      <li>Nomeadas como: OS-{currentOS?.numero || 'N'}-foto-{new Date().toISOString().split('T')[0]}.jpg</li>
                    </ul>
                  </div>
                  
                  {/* TODO: Exibir fotos existentes */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Placeholder para fotos */}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Tab Itens (Peças/Serviços) */}
          {isEditing && (
            <TabsContent value="itens" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Peças e Serviços</CardTitle>
                    <Button onClick={() => {
                      setEditingItem(null);
                      setItemForm({ tipo: 'servico', descricao: '', quantidade: 1, valor_unitario: 0, valor_minimo: 0, desconto: 0, garantia: 0, colaborador_id: '' });
                      setShowAddItem(true);
                    }} size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {itens.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum item adicionado ainda.
                    </p>
                  ) : (
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
                            <TableCell>{item.colaborador_nome || '-'}</TableCell>
                            <TableCell className="text-right font-semibold">{currencyFormatters.brl(item.valor_total)}</TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditItem(item)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
            <TabsContent value="financeiro" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="text-3xl font-bold">{currencyFormatters.brl(total)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Valor Pago</p>
                    <p className="text-3xl font-bold text-green-600">{currencyFormatters.brl(totalPago)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Saldo Restante</p>
                    <p className={cn("text-3xl font-bold", total - totalPago > 0 ? "text-orange-600" : "text-green-600")}>
                      {currencyFormatters.brl(total - totalPago)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pagamentos</CardTitle>
                </CardHeader>
                <CardContent>
                  {pagamentos.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      Nenhum pagamento registrado.
                    </p>
                  ) : (
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
                        className="p-2 hover:bg-muted cursor-pointer"
                        onClick={() => handleSelectProduto(prod)}
                      >
                        <p className="font-medium">{prod.descricao}</p>
                        <p className="text-xs text-muted-foreground">
                          {currencyFormatters.brl(prod.preco_venda)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select 
                    value={itemForm.tipo} 
                    onValueChange={(v: any) => setItemForm(prev => ({ ...prev, tipo: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="servico">Serviço</SelectItem>
                      <SelectItem value="peca">Peça</SelectItem>
                      <SelectItem value="mao_de_obra">Mão de Obra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    value={itemForm.quantidade}
                    onChange={(e) => setItemForm(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={itemForm.descricao}
                  onChange={(e) => setItemForm(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descrição do item"
                />
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
                      {colaboradores.length > 0 ? (
                        colaboradores.map(colab => (
                          <SelectItem key={colab.id} value={colab.id}>
                            {colab.nome} ({CARGOS_LABELS[colab.cargo]})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>Nenhum colaborador cadastrado</SelectItem>
                      )}
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
      </div>
    </ModernLayout>
  );
}
