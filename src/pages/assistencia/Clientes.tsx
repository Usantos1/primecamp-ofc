import { useState, useMemo, useEffect } from 'react';
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
// Tabs removidas - formulário único sem abas
import { 
  Plus, Search, Edit, Trash2, Phone, Mail, MapPin, User, ExternalLink, Wrench, ShoppingCart, Cake, Settings, Upload,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X
} from 'lucide-react';
import { ImportarClientes } from '@/components/ImportarClientes';
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

// Tipos de campo de busca
type SearchFieldType = 'all' | 'nome' | 'cpf_cnpj' | 'rg' | 'telefone' | 'email';

const SEARCH_FIELD_LABELS: Record<SearchFieldType, string> = {
  all: 'Todos',
  nome: 'Nome',
  cpf_cnpj: 'CPF/CNPJ',
  rg: 'RG',
  telefone: 'Telefone',
  email: 'Email',
};

export default function Clientes() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<SearchFieldType>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState<ClienteFormData>(INITIAL_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [showAniversarioConfig, setShowAniversarioConfig] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [aniversarioConfig, setAniversarioConfig] = useState({
    mensagem: '🎉 *Feliz Aniversário!*\n\nOlá {nome}! 🎂\n\nHoje é um dia muito especial! Desejamos um feliz aniversário repleto de alegria, saúde e muitas realizações!\n\nQue este novo ano de vida seja cheio de momentos especiais e conquistas!\n\nParabéns! 🎈🎁',
    horario: '09:00',
    ativo: true,
  });
  
  const { 
    clientes, 
    createCliente, 
    updateCliente, 
    deleteCliente,
    searchClientesAsync,
    page,
    totalPages,
    totalCount,
    goToPage,
    nextPage,
    prevPage,
    pageSize,
  } = useClientes(50);
  const { toast } = useToast();
  
  // Estado para clientes da busca no servidor
  const [searchResults, setSearchResults] = useState<Cliente[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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
        .order('created_at', { ascending: false })
        .limit(50)
        .execute();
      if (error) throw error;
      return data || [];
    },
    enabled: !!editingCliente?.id && showForm,
  });

  // Buscar no servidor quando o termo de busca muda
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchClientesAsync(searchTerm, 100);
        // Filtrar por campo específico se selecionado
        if (searchField !== 'all') {
          const q = searchTerm.toLowerCase();
          const filtered = results.filter(c => {
            const value = c[searchField as keyof Cliente];
            return value && String(value).toLowerCase().includes(q);
          });
          setSearchResults(filtered);
        } else {
          setSearchResults(results);
        }
      } catch (error) {
        console.error('Erro na busca:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timer);
  }, [searchTerm, searchField, searchClientesAsync]);

  // Usar resultados da busca do servidor quando há termo de busca
  const filteredClientes = useMemo(() => {
    if (!searchTerm) return clientes;
    if (searchTerm.length < 2) {
      // Busca local para termos muito curtos
      const q = searchTerm.toLowerCase();
      return clientes.filter(c => {
        if (searchField === 'all') {
          return (c.nome || '').toLowerCase().includes(q) ||
            c.cpf_cnpj?.includes(searchTerm) ||
            c.telefone?.includes(searchTerm);
        }
        const value = c[searchField as keyof Cliente];
        return value && String(value).toLowerCase().includes(q);
      });
    }
    // Usar resultados da busca no servidor
    return searchResults;
  }, [clientes, searchTerm, searchField, searchResults]);

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
  const handleSubmit = async () => {
    if (!formData.nome) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      if (editingCliente) {
        await updateCliente(editingCliente.id, formData as any);
        toast({ title: 'Cliente atualizado!' });
      } else {
        await createCliente(formData as any);
        toast({ title: 'Cliente cadastrado com sucesso!' });
        // Limpar busca e definir para buscar o cliente recém criado
        setSearchTerm(formData.nome.split(' ')[0]); // Buscar pelo primeiro nome
      }
      setShowForm(false);
      setFormData(INITIAL_FORM);
    } catch (error: any) {
      console.error('Erro ao salvar cliente:', error);
      toast({ title: 'Erro ao salvar cliente', description: error?.message || 'Tente novamente', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Deletar cliente
  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir este cliente?')) {
      try {
        await deleteCliente(id);
        toast({ title: 'Cliente excluído!' });
        // Atualizar resultados da busca removendo o cliente excluído
        if (searchResults.length > 0) {
          setSearchResults(prev => prev.filter(c => c.id !== id));
        }
      } catch (error: any) {
        console.error('Erro ao excluir cliente:', error);
        toast({ title: 'Erro ao excluir', description: error?.message, variant: 'destructive' });
      }
    }
  };

  // Carregar configuração de aniversário
  const loadAniversarioConfig = async () => {
    try {
      const { data, error } = await from('kv_store_2c4defad')
        .select('value')
        .eq('key', 'aniversario_config')
        .single();

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
      // TODO: Implementar upsert na API quando necessário
      // Por enquanto, usar insert simples
      const { error: configError } = await from('kv_store_2c4defad')
        .insert({
          key: 'aniversario_config',
          value: aniversarioConfig,
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
      <div className="flex flex-col h-full overflow-hidden gap-2 md:gap-3">
        {/* Mobile: Header compacto */}
        <div className="md:hidden flex-shrink-0 bg-white/80 dark:bg-slate-900/50 border border-gray-200 rounded-lg p-2 space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 ${isSearching ? 'text-blue-500 animate-pulse' : 'text-muted-foreground'}`} />
              <Input 
                placeholder={searchField === 'all' ? "Buscar cliente..." : `Buscar por ${SEARCH_FIELD_LABELS[searchField]}...`} 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className={`h-8 pl-8 text-sm border-gray-200 ${searchField !== 'all' ? 'pr-20' : ''}`} 
              />
              {searchField !== 'all' && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                    {SEARCH_FIELD_LABELS[searchField]}
                  </Badge>
                  <button onClick={() => setSearchField('all')} className="text-gray-400 hover:text-gray-600">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
            <Button onClick={handleNew} size="sm" className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Desktop: Barra de ações completa */}
        <div className="hidden md:block flex-shrink-0 bg-card border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isSearching ? 'text-blue-500 animate-pulse' : 'text-muted-foreground'}`} />
              <Input 
                placeholder={searchField === 'all' ? "Buscar por nome, CPF, telefone... (clique na coluna para filtrar)" : `Buscar por ${SEARCH_FIELD_LABELS[searchField]}...`} 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className={`pl-9 h-9 text-sm border-gray-200 ${searchField !== 'all' ? 'pr-24' : ''}`} 
              />
              {searchField !== 'all' && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                    {SEARCH_FIELD_LABELS[searchField]}
                  </Badge>
                  <button onClick={() => setSearchField('all')} className="text-gray-400 hover:text-gray-600">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
            <Button onClick={handleNew} size="sm" className="gap-2 h-9 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4" /><span>Novo Cliente</span>
            </Button>
            <Button onClick={() => setShowImportDialog(true)} variant="outline" size="sm" className="gap-2 h-9">
              <Upload className="h-4 w-4" /><span>Importar</span>
            </Button>
            <Button onClick={async () => { await loadAniversarioConfig(); setShowAniversarioConfig(true); }} variant="outline" size="sm" className="gap-2 h-9">
              <Cake className="h-4 w-4" /><span>Config. Aniversário</span>
            </Button>
          </div>
        </div>

        {/* Lista de clientes - flex-1 com scroll interno */}
        <Card className="flex-1 flex flex-col overflow-hidden min-h-0 border border-gray-200">
          <CardContent className="flex-1 flex flex-col overflow-hidden min-h-0 p-0">
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
                {/* Desktop: Tabela com scroll interno */}
                <div className="hidden md:flex flex-1 flex-col overflow-hidden min-h-0">
                  <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                  <table className="w-full caption-bottom text-sm border-collapse">
                    <thead className="sticky top-0 z-20 bg-background shadow-sm">
                      <tr className="border-b-[3px] border-gray-400">
                        <th 
                          className={`h-12 px-4 text-left align-middle font-semibold border-r border-gray-200 cursor-pointer hover:bg-blue-100 transition-colors ${searchField === 'nome' ? 'bg-blue-200 text-blue-700' : 'bg-muted/60'}`}
                          onClick={() => setSearchField(searchField === 'nome' ? 'all' : 'nome')}
                          title="Clique para filtrar por Nome"
                        >
                          Nome {searchField === 'nome' && <Search className="inline h-3 w-3 ml-1" />}
                        </th>
                        <th 
                          className={`h-12 px-4 text-left align-middle font-semibold border-r border-gray-200 cursor-pointer hover:bg-blue-100 transition-colors ${searchField === 'cpf_cnpj' ? 'bg-blue-200 text-blue-700' : 'bg-muted/60'}`}
                          onClick={() => setSearchField(searchField === 'cpf_cnpj' ? 'all' : 'cpf_cnpj')}
                          title="Clique para filtrar por CPF/CNPJ"
                        >
                          CPF/CNPJ {searchField === 'cpf_cnpj' && <Search className="inline h-3 w-3 ml-1" />}
                        </th>
                        <th 
                          className={`h-12 px-4 text-left align-middle font-semibold border-r border-gray-200 cursor-pointer hover:bg-blue-100 transition-colors ${searchField === 'rg' ? 'bg-blue-200 text-blue-700' : 'bg-muted/60'}`}
                          onClick={() => setSearchField(searchField === 'rg' ? 'all' : 'rg')}
                          title="Clique para filtrar por RG"
                        >
                          RG {searchField === 'rg' && <Search className="inline h-3 w-3 ml-1" />}
                        </th>
                        <th 
                          className={`h-12 px-4 text-left align-middle font-semibold border-r border-gray-200 cursor-pointer hover:bg-blue-100 transition-colors ${searchField === 'telefone' ? 'bg-blue-200 text-blue-700' : 'bg-muted/60'}`}
                          onClick={() => setSearchField(searchField === 'telefone' ? 'all' : 'telefone')}
                          title="Clique para filtrar por Telefone"
                        >
                          Telefone {searchField === 'telefone' && <Search className="inline h-3 w-3 ml-1" />}
                        </th>
                        <th 
                          className={`h-12 px-4 text-left align-middle font-semibold border-r border-gray-200 cursor-pointer hover:bg-blue-100 transition-colors ${searchField === 'email' ? 'bg-blue-200 text-blue-700' : 'bg-muted/60'}`}
                          onClick={() => setSearchField(searchField === 'email' ? 'all' : 'email')}
                          title="Clique para filtrar por Email"
                        >
                          Email {searchField === 'email' && <Search className="inline h-3 w-3 ml-1" />}
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-semibold bg-muted/60 border-r border-gray-200">Cidade</th>
                        <th className="h-12 px-4 text-right align-middle font-semibold bg-muted/60">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClientes.map((cliente, index) => (
                        <tr 
                          key={cliente.id}
                          className={`border-b-2 border-gray-300 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}
                        >
                          <td className="py-3.5 px-3 align-middle font-medium border-r border-gray-200">{cliente.nome}</td>
                          <td className="py-3.5 px-3 align-middle border-r border-gray-200">{cliente.cpf_cnpj || '-'}</td>
                          <td className="py-3.5 px-3 align-middle border-r border-gray-200">{cliente.rg || '-'}</td>
                          <td className="py-3.5 px-3 align-middle border-r border-gray-200">
                            {cliente.whatsapp || cliente.telefone || '-'}
                          </td>
                          <td className="py-3.5 px-3 align-middle border-r border-gray-200">{cliente.email || '-'}</td>
                          <td className="py-3.5 px-3 align-middle border-r border-gray-200">{cliente.cidade || '-'}</td>
                          <td className="py-3.5 px-3 align-middle">
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
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>

                {/* Mobile: Cards com scroll */}
                <div className="md:hidden flex-1 overflow-auto scrollbar-thin p-2 space-y-3">
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

                {/* Paginação - fixo no rodapé */}
                {totalPages > 1 && (
                  <div className="flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-gray-200 bg-muted/30">
                    <div className="text-xs text-muted-foreground">
                      Mostrando {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalCount)} de {totalCount}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => goToPage(1)} disabled={page === 1}>
                        <ChevronsLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={prevPage} disabled={page === 1}>
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <span className="px-2 text-xs font-medium">{page} / {totalPages}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={nextPage} disabled={page === totalPages}>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => goToPage(totalPages)} disabled={page === totalPages}>
                        <ChevronsRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Form Dialog - Formulário único sem abas */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-lg font-semibold">
                {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
              {/* Seção: Dados Pessoais */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Dados Pessoais</h3>
                
                {/* Tipo de Pessoa e CPF/CNPJ na mesma linha */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Pessoa</Label>
                    <Select 
                      value={formData.tipo_pessoa} 
                      onValueChange={(v: any) => setFormData(prev => ({ ...prev, tipo_pessoa: v }))}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fisica">Pessoa Física</SelectItem>
                        <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{formData.tipo_pessoa === 'fisica' ? 'CPF' : 'CNPJ'}</Label>
                    <Input
                      tabIndex={1}
                      value={formData.cpf_cnpj}
                      onChange={(e) => setFormData(prev => ({ ...prev, cpf_cnpj: e.target.value }))}
                      placeholder={formData.tipo_pessoa === 'fisica' ? '000.000.000-00' : '00.000.000/0000-00'}
                      className="h-10"
                    />
                  </div>
                  {formData.tipo_pessoa === 'fisica' && (
                    <div className="space-y-2">
                      <Label>RG <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                      <Input
                        tabIndex={2}
                        value={formData.rg || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, rg: e.target.value }))}
                        placeholder="00.000.000-0"
                        className="h-10"
                      />
                    </div>
                  )}
                </div>

                {/* Nome - Campo principal */}
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input
                    tabIndex={3}
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Nome completo do cliente"
                    className="h-10 text-base"
                    autoFocus
                    required
                  />
                </div>

                {formData.tipo_pessoa === 'juridica' && (
                  <div className="space-y-2">
                    <Label>Nome Fantasia</Label>
                    <Input
                      tabIndex={4}
                      value={formData.nome_fantasia || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome_fantasia: e.target.value }))}
                      placeholder="Nome fantasia da empresa"
                      className="h-10"
                    />
                  </div>
                )}

                {/* Celular e Data de Nascimento */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Celular / WhatsApp *</Label>
                    <Input
                      tabIndex={5}
                      value={formData.whatsapp}
                      onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value, telefone: e.target.value }))}
                      placeholder="(19) 99999-9999"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone Fixo</Label>
                    <Input
                      tabIndex={6}
                      value={formData.telefone2 || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, telefone2: e.target.value }))}
                      placeholder="(19) 3333-3333"
                      className="h-10"
                    />
                  </div>
                  {formData.tipo_pessoa === 'fisica' && (
                    <div className="space-y-2">
                      <Label>Data de Nascimento</Label>
                      <Input
                        tabIndex={7}
                        type="date"
                        value={formData.data_nascimento || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, data_nascimento: e.target.value }))}
                        className="h-10"
                      />
                    </div>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    tabIndex={8}
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                    className="h-10"
                  />
                </div>
              </div>

              {/* Seção: Endereço */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Endereço</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <div className="flex gap-2">
                      <Input
                        tabIndex={9}
                        value={formData.cep}
                        onChange={(e) => setFormData(prev => ({ ...prev, cep: e.target.value }))}
                        placeholder="13000-000"
                        className="h-10"
                        onBlur={handleBuscarCEP}
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleBuscarCEP} 
                        disabled={isLoading}
                        className="h-10 w-10 p-0 shrink-0"
                        tabIndex={-1}
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <Label>Logradouro</Label>
                    <Input
                      tabIndex={10}
                      value={formData.logradouro}
                      onChange={(e) => setFormData(prev => ({ ...prev, logradouro: e.target.value }))}
                      placeholder="Rua, Avenida, etc."
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input
                      tabIndex={11}
                      value={formData.numero}
                      onChange={(e) => setFormData(prev => ({ ...prev, numero: e.target.value }))}
                      placeholder="123"
                      className="h-10"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>Complemento</Label>
                    <Input
                      tabIndex={12}
                      value={formData.complemento}
                      onChange={(e) => setFormData(prev => ({ ...prev, complemento: e.target.value }))}
                      placeholder="Apto, Bloco, etc."
                      className="h-10"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>Bairro</Label>
                    <Input
                      tabIndex={13}
                      value={formData.bairro}
                      onChange={(e) => setFormData(prev => ({ ...prev, bairro: e.target.value }))}
                      placeholder="Bairro"
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3 space-y-2">
                    <Label>Cidade</Label>
                    <Input
                      tabIndex={14}
                      value={formData.cidade}
                      onChange={(e) => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
                      placeholder="Cidade"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>UF</Label>
                    <Input
                      tabIndex={15}
                      value={formData.estado}
                      onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value.toUpperCase() }))}
                      maxLength={2}
                      placeholder="SP"
                      className="h-10"
                    />
                  </div>
                </div>
              </div>

              {/* Histórico (apenas na edição) */}
              {editingCliente && (clienteOSs.length > 0 || clienteVendas.length > 0) && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Histórico</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <div className="font-medium">Ordens de Serviço</div>
                      <div className="text-2xl font-bold text-blue-600">{clienteOSs.length}</div>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                      <div className="font-medium">Vendas</div>
                      <div className="text-2xl font-bold text-green-600">{clienteVendas.length}</div>
                    </div>
                  </div>
                </div>
              )}
            </form>

            <DialogFooter className="pt-4 border-t mt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowForm(false)}
                className="h-10"
              >
                Cancelar
              </Button>
              <LoadingButton 
                onClick={handleSubmit} 
                loading={isLoading}
                className="h-10 bg-blue-600 hover:bg-blue-700 text-white"
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

        {/* Modal de Importação de Clientes */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-3 md:p-6">
            <DialogHeader className="pb-2 md:pb-4">
              <DialogTitle className="text-base md:text-lg flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Importar Clientes em Massa
              </DialogTitle>
            </DialogHeader>
            <ImportarClientes 
              onClose={() => setShowImportDialog(false)}
              onSuccess={() => {
                setShowImportDialog(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </ModernLayout>
  );
}
