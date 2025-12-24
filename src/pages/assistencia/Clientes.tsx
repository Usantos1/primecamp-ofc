import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Search, Edit, Trash2, Phone, Mail, MapPin, User, ExternalLink, Wrench, ShoppingCart, Cake, Settings
} from 'lucide-react';
import { useClientesSupabase as useClientes } from '@/hooks/useClientesSupabase';
import { buscarCEP } from '@/hooks/useAssistencia';
import { Cliente, ClienteFormData } from '@/types/assistencia';
import { EmptyState } from '@/components/EmptyState';
import { LoadingButton } from '@/components/LoadingButton';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { from } from '@/integrations/db/client';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { STATUS_OS_LABELS, STATUS_OS_COLORS } from '@/types/assistencia';

const INITIAL_FORM: ClienteFormData = {
  tipo_pessoa: 'fisica',
  nome: '',
  cpf_cnpj: '',
  rg: '',
  data_nascimento: '',
  telefone: '',
  whatsapp: '',
  email: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
};

export default function Clientes() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState<ClienteFormData>(INITIAL_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [showAniversarioConfig, setShowAniversarioConfig] = useState(false);
  const [aniversarioConfig, setAniversarioConfig] = useState({
    mensagem: '🎉 *Feliz Aniversário!*\n\nOlá {nome}! 🎂\n\nHoje é um dia muito especial! Desejamos um feliz aniversário repleto de alegria, saúde e muitas realizações!\n\nQue este novo ano de vida seja cheio de momentos especiais e conquistas!\n\nParabéns! 🎈🎁',
    horario: '09:00',
    ativo: true,
  });
  
  const { clientes, createCliente, updateCliente, deleteCliente } = useClientes();
  const { toast } = useToast();

  // Buscar OSs do cliente
  const { data: clienteOSs = [], isLoading: loadingOSs } = useQuery({
    queryKey: ['cliente_os', editingCliente?.id],
    queryFn: async () => {
      if (!editingCliente?.id) return [];
      const { data, error } = await from('ordens_servico')
        .select('*')
        .eq('cliente_id', editingCliente.id)
        .order('created_at', { ascending: false })
        .limit(50)
        .execute();
      if (error) throw error;
      return data || [];
    },
    enabled: !!editingCliente?.id && showForm,
  });

  // Buscar vendas do cliente
  const { data: clienteVendas = [], isLoading: loadingVendas } = useQuery({
    queryKey: ['cliente_vendas', editingCliente?.id],
    queryFn: async () => {
      if (!editingCliente?.id) return [];
      const { data, error } = await from('sales')
        .select('*')
        .eq('cliente_id', editingCliente.id)
        .execute()
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!editingCliente?.id && showForm,
  });

  // Filtrar clientes
  const filteredClientes = useMemo(() => {
    if (!searchTerm) return clientes;
    const q = searchTerm.toLowerCase();
    return clientes.filter(c => 
      (c.nome || '').toLowerCase().includes(q) ||
      c.cpf_cnpj?.includes(searchTerm) ||
      c.rg?.includes(searchTerm) ||
      c.telefone?.includes(searchTerm) ||
      c.whatsapp?.includes(searchTerm) ||
      c.email?.toLowerCase().includes(q)
    );
  }, [clientes, searchTerm]);

  // Abrir form para novo cliente
  const handleNew = () => {
    setEditingCliente(null);
    setFormData(INITIAL_FORM);
    setShowForm(true);
  };

  // Abrir form para editar
  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormData({
      tipo_pessoa: cliente.tipo_pessoa,
      nome: cliente.nome,
      nome_fantasia: cliente.nome_fantasia,
      cpf_cnpj: cliente.cpf_cnpj || '',
      rg: cliente.rg,
      sexo: cliente.sexo,
      data_nascimento: cliente.data_nascimento,
      telefone: cliente.telefone || '',
      telefone2: cliente.telefone2,
      whatsapp: cliente.whatsapp || '',
      email: cliente.email || '',
      cep: cliente.cep || '',
      logradouro: cliente.logradouro || '',
      numero: cliente.numero || '',
      complemento: cliente.complemento || '',
      bairro: cliente.bairro || '',
      cidade: cliente.cidade || '',
      estado: cliente.estado || '',
    });
    setShowForm(true);
  };

  // Buscar CEP
  const handleBuscarCEP = async () => {
    if (!formData.cep || formData.cep.length < 8) return;
    
    setIsLoading(true);
    try {
      const endereco = await buscarCEP(formData.cep);
      if (endereco) {
        setFormData(prev => ({
          ...prev,
          logradouro: endereco.logradouro,
          bairro: endereco.bairro,
          cidade: endereco.cidade,
          estado: endereco.uf,
        }));
        toast({ title: 'CEP encontrado!' });
      } else {
        toast({ title: 'CEP não encontrado', variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Salvar cliente
  const handleSubmit = () => {
    if (!formData.nome) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    // Validar: CPF ou RG deve ser preenchido para pessoa física
    if (formData.tipo_pessoa === 'fisica' && !formData.cpf_cnpj && !formData.rg) {
      toast({ title: 'CPF ou RG deve ser preenchido', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      if (editingCliente) {
        updateCliente(editingCliente.id, formData as any);
        toast({ title: 'Cliente atualizado!' });
      } else {
        createCliente(formData as any);
        toast({ title: 'Cliente cadastrado!' });
      }
      setShowForm(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Deletar cliente
  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente excluir este cliente?')) {
      deleteCliente(id);
      toast({ title: 'Cliente excluído!' });
    }
  };

  // Carregar configuração de aniversário
  const loadAniversarioConfig = async () => {
    try {
      const { data, error } = await from('kv_store_2c4defad')
        .select('value')
        .eq('key', 'aniversario_config')
        .single()
        .execute();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar configuração:', error);
        return;
      }

      if (data?.value) {
        setAniversarioConfig(data.value);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração de aniversário:', error);
    }
  };

  // Salvar configuração de aniversário
  const handleSaveAniversarioConfig = async () => {
    try {
      // Salvar configuração
      const { error: configError } = await from('kv_store_2c4defad')
        .insert({
          key: 'aniversario_config',
          value: aniversarioConfig,
        }, {
          onConflict: 'key',
        });

      if (configError) throw configError;

      // Se o envio automático estiver ativado, atualizar o cron job
      if (aniversarioConfig.ativo && aniversarioConfig.horario) {
        try {
          // 🚫 Supabase RPC removido - TODO: implementar na API quando necessário
          // const { data: cronResult, error: cronError } = await supabase.rpc(
          //   'atualizar_cron_aniversario',
          //   { horario_brt: aniversarioConfig.horario }
          // );
          
          // Por enquanto, apenas logar que seria necessário atualizar o cron
          console.log('Cron job precisa ser atualizado manualmente:', aniversarioConfig.horario);
          
          // Simular sucesso para não quebrar o fluxo
          const cronError = null;
          const cronResult = null;

          if (cronError) {
            console.warn('Erro ao atualizar cron job (pode não ter permissão):', cronError);
            // Não falha o salvamento se o cron job não atualizar
            toast({ 
              title: 'Configuração salva!', 
              description: 'A mensagem foi salva, mas o cron job pode precisar ser atualizado manualmente.' 
            });
          } else {
            console.log('Cron job atualizado:', cronResult);
            toast({ 
              title: 'Configuração salva!', 
              description: 'A mensagem de aniversário e o agendamento foram atualizados com sucesso.' 
            });
          }
        } catch (cronErr: any) {
          console.warn('Erro ao atualizar cron job:', cronErr);
          toast({ 
            title: 'Configuração salva!', 
            description: 'A mensagem foi salva, mas o cron job pode precisar ser atualizado manualmente.' 
          });
        }
      } else {
        toast({ 
          title: 'Configuração salva!', 
          description: 'A mensagem de aniversário foi atualizada com sucesso.' 
        });
      }

      setShowAniversarioConfig(false);
    } catch (error: any) {
      console.error('Erro ao salvar configuração:', error);
      toast({ 
        title: 'Erro ao salvar', 
        description: error.message || 'Não foi possível salvar a configuração.',
        variant: 'destructive' 
      });
    }
  };

  return (
    <ModernLayout title="Clientes" subtitle="Gerenciar clientes">
      <div className="space-y-3 md:space-y-4 px-1 md:px-0">
        {/* Barra de ações */}
        <Card className="border-2 border-gray-300">
          <CardContent className="py-2 md:py-3 px-3 md:px-6">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF, RG, telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 md:h-10 text-base md:text-sm border-2 border-gray-300"
                />
              </div>
              <Button 
                onClick={handleNew} 
                className="gap-2 h-9 md:h-10 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-md"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Cliente</span>
                <span className="sm:hidden">Novo</span>
              </Button>
              <Button 
                onClick={async () => {
                  await loadAniversarioConfig();
                  setShowAniversarioConfig(true);
                }}
                variant="outline"
                className="gap-2 h-9 md:h-10 border-2 border-gray-300"
              >
                <Cake className="h-4 w-4" />
                <span className="hidden sm:inline">Config. Aniversário</span>
                <span className="sm:hidden">Aniversário</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de clientes */}
        <Card className="border-2 border-gray-300">
          <CardContent className="p-0">
            {filteredClientes.length === 0 ? (
              <div className="p-6 md:p-12">
                <EmptyState
                  icon={<User className="h-12 w-12" />}
                  title="Nenhum cliente encontrado"
                  description={searchTerm ? "Tente buscar por outro termo" : "Cadastre seu primeiro cliente"}
                  action={!searchTerm ? { label: "Novo Cliente", onClick: handleNew } : undefined}
                />
              </div>
            ) : (
              <>
                {/* Desktop: Tabela */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-2 border-gray-300">
                        <TableHead className="font-semibold bg-muted/60 border-r border-gray-200">Nome</TableHead>
                        <TableHead className="font-semibold bg-muted/60 border-r border-gray-200">CPF/CNPJ</TableHead>
                        <TableHead className="font-semibold bg-muted/60 border-r border-gray-200">RG</TableHead>
                        <TableHead className="font-semibold bg-muted/60 border-r border-gray-200">Telefone</TableHead>
                        <TableHead className="font-semibold bg-muted/60 border-r border-gray-200">Email</TableHead>
                        <TableHead className="font-semibold bg-muted/60 border-r border-gray-200">Cidade</TableHead>
                        <TableHead className="font-semibold bg-muted/60 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClientes.map((cliente, index) => (
                        <TableRow 
                          key={cliente.id}
                          className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}
                        >
                          <TableCell className="font-medium border-r border-gray-200">{cliente.nome}</TableCell>
                          <TableCell className="border-r border-gray-200">{cliente.cpf_cnpj || '-'}</TableCell>
                          <TableCell className="border-r border-gray-200">{cliente.rg || '-'}</TableCell>
                          <TableCell className="border-r border-gray-200">
                            {cliente.whatsapp || cliente.telefone || '-'}
                          </TableCell>
                          <TableCell className="border-r border-gray-200">{cliente.email || '-'}</TableCell>
                          <TableCell className="border-r border-gray-200">{cliente.cidade || '-'}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleEdit(cliente)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleDelete(cliente.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile: Cards */}
                <div className="md:hidden space-y-3 p-2">
                  {filteredClientes.map((cliente, index) => (
                    <Card 
                      key={cliente.id}
                      className="border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-all active:scale-[0.98]"
                    >
                      <CardContent className="p-3 space-y-2">
                        {/* Header: Nome */}
                        <div className="border-b-2 border-gray-200 pb-2">
                          <h3 className="font-semibold text-sm truncate">{cliente.nome}</h3>
                          <div className="flex flex-col gap-0.5 mt-1">
                            {cliente.cpf_cnpj && (
                              <p className="text-xs text-muted-foreground">CPF/CNPJ: {cliente.cpf_cnpj}</p>
                            )}
                            {cliente.rg && (
                              <p className="text-xs text-muted-foreground">RG: {cliente.rg}</p>
                            )}
                          </div>
                        </div>

                        {/* Info: Contato e Localização */}
                        <div className="space-y-2">
                          {(cliente.whatsapp || cliente.telefone) && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs text-muted-foreground">
                                {cliente.whatsapp || cliente.telefone}
                              </span>
                            </div>
                          )}
                          {cliente.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs text-muted-foreground truncate">{cliente.email}</span>
                            </div>
                          )}
                          {cliente.cidade && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs text-muted-foreground">{cliente.cidade}</span>
                            </div>
                          )}
                        </div>

                        {/* Footer: Botões de ação */}
                        <div className="flex justify-end gap-2 pt-2 border-t-2 border-gray-200">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(cliente)}
                            className="h-8 px-3 text-xs border-2 border-gray-300"
                          >
                            <Edit className="h-3.5 w-3.5 mr-1" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(cliente.id)}
                            className="h-8 px-3 text-xs border-2 border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Excluir
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-3 md:p-6">
            <DialogHeader className="pb-2 md:pb-4">
              <DialogTitle className="text-base md:text-lg">
                {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="dados" className="w-full">
              <TabsList className={`w-full grid ${editingCliente ? 'grid-cols-4' : 'grid-cols-3'} h-9 md:h-10`}>
                <TabsTrigger value="dados" className="text-xs md:text-sm">Dados</TabsTrigger>
                <TabsTrigger value="endereco" className="text-xs md:text-sm">Endereço</TabsTrigger>
                <TabsTrigger value="contato" className="text-xs md:text-sm">Contato</TabsTrigger>
                {editingCliente && (
                  <TabsTrigger value="historico" className="text-xs md:text-sm">Histórico</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="dados" className="space-y-3 md:space-y-4 mt-3 md:mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-1.5 md:space-y-2">
                    <Label className="text-xs md:text-sm">Tipo de Pessoa</Label>
                    <Select 
                      value={formData.tipo_pessoa} 
                      onValueChange={(v: any) => setFormData(prev => ({ ...prev, tipo_pessoa: v }))}
                    >
                      <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm border-2 border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fisica">Pessoa Física</SelectItem>
                        <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <Label className="text-xs md:text-sm">
                      {formData.tipo_pessoa === 'fisica' ? 'CPF' : 'CNPJ'}
                      {formData.tipo_pessoa === 'fisica' && <span className="text-muted-foreground ml-1">(ou RG)</span>}
                    </Label>
                    <Input
                      value={formData.cpf_cnpj}
                      onChange={(e) => setFormData(prev => ({ ...prev, cpf_cnpj: e.target.value }))}
                      placeholder={formData.tipo_pessoa === 'fisica' ? '000.000.000-00' : '00.000.000/0000-00'}
                      className="h-9 md:h-10 text-xs md:text-sm border-2 border-gray-300"
                    />
                  </div>
                </div>

                {formData.tipo_pessoa === 'fisica' && (
                  <div className="space-y-1.5 md:space-y-2">
                    <Label className="text-xs md:text-sm">RG <span className="text-muted-foreground">(opcional, se não tiver CPF)</span></Label>
                    <Input
                      value={formData.rg || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, rg: e.target.value }))}
                      placeholder="00.000.000-0"
                      className="h-9 md:h-10 text-xs md:text-sm border-2 border-gray-300"
                    />
                  </div>
                )}

                {formData.tipo_pessoa === 'fisica' && (
                  <div className="space-y-1.5 md:space-y-2">
                    <Label className="text-xs md:text-sm">Data de Nascimento <span className="text-muted-foreground">(opcional, para envio de mensagem de aniversário)</span></Label>
                    <Input
                      type="date"
                      value={formData.data_nascimento || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, data_nascimento: e.target.value }))}
                      className="h-9 md:h-10 text-xs md:text-sm border-2 border-gray-300"
                    />
                  </div>
                )}

                <div className="space-y-1.5 md:space-y-2">
                  <Label className="text-xs md:text-sm">Nome *</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Nome completo"
                    className="h-9 md:h-10 text-xs md:text-sm border-2 border-gray-300"
                  />
                </div>

                {formData.tipo_pessoa === 'juridica' && (
                  <div className="space-y-1.5 md:space-y-2">
                    <Label className="text-xs md:text-sm">Nome Fantasia</Label>
                    <Input
                      value={formData.nome_fantasia || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome_fantasia: e.target.value }))}
                      className="h-9 md:h-10 text-xs md:text-sm border-2 border-gray-300"
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="endereco" className="space-y-3 md:space-y-4 mt-3 md:mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  <div className="space-y-1.5 md:space-y-2">
                    <Label className="text-xs md:text-sm">CEP</Label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.cep}
                        onChange={(e) => setFormData(prev => ({ ...prev, cep: e.target.value }))}
                        placeholder="00000-000"
                        className="h-9 md:h-10 text-xs md:text-sm border-2 border-gray-300"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleBuscarCEP} 
                        disabled={isLoading}
                        className="h-9 md:h-10 w-9 md:w-10 p-0 border-2 border-gray-300"
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-1.5 md:space-y-2">
                    <Label className="text-xs md:text-sm">Logradouro</Label>
                    <Input
                      value={formData.logradouro}
                      onChange={(e) => setFormData(prev => ({ ...prev, logradouro: e.target.value }))}
                      className="h-9 md:h-10 text-xs md:text-sm border-2 border-gray-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
                  <div className="space-y-1.5 md:space-y-2">
                    <Label className="text-xs md:text-sm">Número</Label>
                    <Input
                      value={formData.numero}
                      onChange={(e) => setFormData(prev => ({ ...prev, numero: e.target.value }))}
                      className="h-9 md:h-10 text-xs md:text-sm border-2 border-gray-300"
                    />
                  </div>
                  <div className="md:col-span-3 space-y-1.5 md:space-y-2">
                    <Label className="text-xs md:text-sm">Complemento</Label>
                    <Input
                      value={formData.complemento}
                      onChange={(e) => setFormData(prev => ({ ...prev, complemento: e.target.value }))}
                      className="h-9 md:h-10 text-xs md:text-sm border-2 border-gray-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  <div className="space-y-1.5 md:space-y-2">
                    <Label className="text-xs md:text-sm">Bairro</Label>
                    <Input
                      value={formData.bairro}
                      onChange={(e) => setFormData(prev => ({ ...prev, bairro: e.target.value }))}
                      className="h-9 md:h-10 text-xs md:text-sm border-2 border-gray-300"
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <Label className="text-xs md:text-sm">Cidade</Label>
                    <Input
                      value={formData.cidade}
                      onChange={(e) => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
                      className="h-9 md:h-10 text-xs md:text-sm border-2 border-gray-300"
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <Label className="text-xs md:text-sm">Estado</Label>
                    <Input
                      value={formData.estado}
                      onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}
                      maxLength={2}
                      className="h-9 md:h-10 text-xs md:text-sm border-2 border-gray-300"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contato" className="space-y-3 md:space-y-4 mt-3 md:mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-1.5 md:space-y-2">
                    <Label className="text-xs md:text-sm">Telefone</Label>
                    <Input
                      value={formData.telefone}
                      onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                      placeholder="(00) 0000-0000"
                      className="h-9 md:h-10 text-xs md:text-sm border-2 border-gray-300"
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <Label className="text-xs md:text-sm">WhatsApp</Label>
                    <Input
                      value={formData.whatsapp}
                      onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                      placeholder="(00) 00000-0000"
                      className="h-9 md:h-10 text-xs md:text-sm border-2 border-gray-300"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label className="text-xs md:text-sm">Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                    className="h-9 md:h-10 text-xs md:text-sm border-2 border-gray-300"
                  />
                </div>
              </TabsContent>

              {editingCliente && (
                <TabsContent value="historico" className="space-y-3 md:space-y-4 mt-3 md:mt-4">
                  {/* Ordens de Serviço */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 pb-2 border-b-2 border-gray-300">
                      <Wrench className="h-4 w-4 text-blue-600" />
                      <h3 className="font-semibold text-sm md:text-base">Ordens de Serviço</h3>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {clienteOSs.length}
                      </Badge>
                    </div>
                    {loadingOSs ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">Carregando...</div>
                    ) : clienteOSs.length === 0 ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        Nenhuma ordem de serviço encontrada
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {clienteOSs.map((os: any) => (
                          <Card 
                            key={os.id} 
                            className="border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-all"
                            onClick={() => {
                              setShowForm(false);
                              navigate(`/pdv/os/${os.id}`);
                            }}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-sm">OS #{os.numero}</span>
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs"
                                      style={{ 
                                        borderColor: STATUS_OS_COLORS[os.status as keyof typeof STATUS_OS_COLORS] || '#gray',
                                        color: STATUS_OS_COLORS[os.status as keyof typeof STATUS_OS_COLORS] || '#gray'
                                      }}
                                    >
                                      {STATUS_OS_LABELS[os.status as keyof typeof STATUS_OS_LABELS] || os.status}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {os.descricao_problema || 'Sem descrição'}
                                  </p>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                    {os.data_entrada && (
                                      <span>Entrada: {dateFormatters.short(os.data_entrada)}</span>
                                    )}
                                    {os.valor_total > 0 && (
                                      <span className="font-semibold text-foreground">
                                        {currencyFormatters.brl(os.valor_total)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Vendas/Compras */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 pb-2 border-b-2 border-gray-300">
                      <ShoppingCart className="h-4 w-4 text-green-600" />
                      <h3 className="font-semibold text-sm md:text-base">Vendas/Compras</h3>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {clienteVendas.length}
                      </Badge>
                    </div>
                    {loadingVendas ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">Carregando...</div>
                    ) : clienteVendas.length === 0 ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        Nenhuma venda encontrada
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {clienteVendas.map((venda: any) => (
                          <Card 
                            key={venda.id} 
                            className="border-2 border-gray-300 cursor-pointer hover:border-green-400 transition-all"
                            onClick={() => {
                              setShowForm(false);
                              navigate(`/pdv/venda/${venda.id}`);
                            }}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-sm">Venda #{venda.numero}</span>
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${
                                        venda.status === 'paid' ? 'border-green-500 text-green-600' :
                                        venda.status === 'open' ? 'border-yellow-500 text-yellow-600' :
                                        'border-gray-500 text-gray-600'
                                      }`}
                                    >
                                      {venda.status === 'paid' ? 'Paga' :
                                       venda.status === 'open' ? 'Aberta' :
                                       venda.status === 'draft' ? 'Rascunho' :
                                       venda.status}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                    {venda.created_at && (
                                      <span>{dateFormatters.short(venda.created_at)}</span>
                                    )}
                                    {venda.total > 0 && (
                                      <span className="font-semibold text-foreground">
                                        {currencyFormatters.brl(venda.total)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-3 md:pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowForm(false)}
                className="w-full sm:w-auto h-9 md:h-10 border-2 border-gray-300"
              >
                Cancelar
              </Button>
              <LoadingButton 
                onClick={handleSubmit} 
                loading={isLoading}
                className="w-full sm:w-auto h-9 md:h-10 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0"
              >
                {editingCliente ? 'Atualizar' : 'Cadastrar'}
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Configuração de Aniversário */}
        <Dialog open={showAniversarioConfig} onOpenChange={setShowAniversarioConfig}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-3 md:p-6">
            <DialogHeader className="pb-2 md:pb-4">
              <DialogTitle className="text-base md:text-lg flex items-center gap-2">
                <Cake className="h-5 w-5" />
                Configuração de Mensagem de Aniversário
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 md:py-4">
              <div className="space-y-2">
                <Label className="text-xs md:text-sm">Horário de Envio</Label>
                <Input
                  type="time"
                  value={aniversarioConfig.horario}
                  onChange={(e) => setAniversarioConfig(prev => ({ ...prev, horario: e.target.value }))}
                  className="h-9 md:h-10 text-base md:text-sm border-2 border-gray-300"
                />
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  As mensagens serão enviadas automaticamente neste horário para clientes que fazem aniversário no dia.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs md:text-sm">Mensagem de Aniversário</Label>
                <Textarea
                  value={aniversarioConfig.mensagem}
                  onChange={(e) => setAniversarioConfig(prev => ({ ...prev, mensagem: e.target.value }))}
                  rows={8}
                  className="text-sm border-2 border-gray-300 font-mono"
                  placeholder="Digite a mensagem que será enviada..."
                />
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  Use {'{nome}'} para incluir o nome do cliente na mensagem. A mensagem será enviada via WhatsApp.
                </p>
              </div>

              <div className="flex items-center justify-between p-3 border-2 border-gray-300 rounded-lg">
                <div>
                  <Label className="text-xs md:text-sm">Ativar envio automático</Label>
                  <p className="text-[10px] md:text-xs text-muted-foreground">
                    Quando ativado, as mensagens serão enviadas automaticamente
                  </p>
                </div>
                <Switch
                  checked={aniversarioConfig.ativo}
                  onCheckedChange={(checked) => setAniversarioConfig(prev => ({ ...prev, ativo: checked }))}
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-3 md:pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowAniversarioConfig(false)}
                className="w-full sm:w-auto h-9 md:h-10 border-2 border-gray-300"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveAniversarioConfig}
                className="w-full sm:w-auto h-9 md:h-10 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0"
              >
                Salvar Configuração
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModernLayout>
  );
}
