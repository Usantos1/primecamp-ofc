import { useState, useMemo } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit, Trash2, Phone, Mail, User, Building, Users } from 'lucide-react';
import { useClientes } from '@/hooks/useAssistencia';
import { Cliente, ClienteFormData } from '@/types/assistencia';
import { dateFormatters } from '@/utils/formatters';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingButton } from '@/components/LoadingButton';

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function Clientes() {
  const { clientes, isLoading, createCliente, updateCliente, deleteCliente } = useClientes();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoCadastro, setTipoCadastro] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<ClienteFormData>({
    tipo_pessoa: 'fisica',
    tipo_cadastro: 'cliente',
    nome: '',
    nome_fantasia: '',
    cpf_cnpj: '',
    rg: '',
    sexo: undefined,
    data_nascimento: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    telefone: '',
    telefone2: '',
    email: '',
    whatsapp: '',
    limite_credito: 0,
  });

  // Filtrar clientes
  const filteredClientes = useMemo(() => {
    let filtered = clientes;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.nome.toLowerCase().includes(search) ||
        c.cpf_cnpj?.includes(search) ||
        c.telefone?.includes(search) ||
        c.email?.toLowerCase().includes(search)
      );
    }
    
    if (tipoCadastro !== 'all') {
      filtered = filtered.filter(c => c.tipo_cadastro === tipoCadastro);
    }
    
    return filtered;
  }, [clientes, searchTerm, tipoCadastro]);

  // Contadores
  const counts = useMemo(() => ({
    total: clientes.length,
    clientes: clientes.filter(c => c.tipo_cadastro === 'cliente').length,
    fornecedores: clientes.filter(c => c.tipo_cadastro === 'fornecedor').length,
    colaboradores: clientes.filter(c => c.tipo_cadastro === 'colaborador').length,
  }), [clientes]);

  const handleOpenDialog = (cliente?: Cliente) => {
    if (cliente) {
      setEditingCliente(cliente);
      setFormData({
        tipo_pessoa: cliente.tipo_pessoa,
        tipo_cadastro: cliente.tipo_cadastro,
        nome: cliente.nome,
        nome_fantasia: cliente.nome_fantasia || '',
        cpf_cnpj: cliente.cpf_cnpj || '',
        rg: cliente.rg || '',
        sexo: cliente.sexo,
        data_nascimento: cliente.data_nascimento || '',
        cep: cliente.cep || '',
        endereco: cliente.endereco || '',
        numero: cliente.numero || '',
        complemento: cliente.complemento || '',
        bairro: cliente.bairro || '',
        cidade: cliente.cidade || '',
        estado: cliente.estado || '',
        telefone: cliente.telefone || '',
        telefone2: cliente.telefone2 || '',
        email: cliente.email || '',
        whatsapp: cliente.whatsapp || '',
        limite_credito: cliente.limite_credito || 0,
      });
    } else {
      setEditingCliente(null);
      setFormData({
        tipo_pessoa: 'fisica',
        tipo_cadastro: 'cliente',
        nome: '',
        nome_fantasia: '',
        cpf_cnpj: '',
        rg: '',
        sexo: undefined,
        data_nascimento: '',
        cep: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        telefone: '',
        telefone2: '',
        email: '',
        whatsapp: '',
        limite_credito: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.nome.trim()) return;
    
    setIsSaving(true);
    try {
      if (editingCliente) {
        updateCliente(editingCliente.id, formData);
      } else {
        createCliente(formData);
      }
      setIsDialogOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (deletingId) {
      deleteCliente(deletingId);
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  // Buscar CEP
  const buscarCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          endereco: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  return (
    <ModernLayout title="Clientes" subtitle="Gerencie clientes, fornecedores e colaboradores">
      <div className="space-y-6">
        {/* Cards de resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setTipoCadastro('all')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Users className="h-4 w-4" />
                Total
              </div>
              <p className="text-2xl font-bold">{counts.total}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md border-l-4 border-l-blue-500" onClick={() => setTipoCadastro('cliente')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-blue-600 text-sm mb-1">
                <User className="h-4 w-4" />
                Clientes
              </div>
              <p className="text-2xl font-bold text-blue-600">{counts.clientes}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md border-l-4 border-l-orange-500" onClick={() => setTipoCadastro('fornecedor')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-orange-600 text-sm mb-1">
                <Building className="h-4 w-4" />
                Fornecedores
              </div>
              <p className="text-2xl font-bold text-orange-600">{counts.fornecedores}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md border-l-4 border-l-green-500" onClick={() => setTipoCadastro('colaborador')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
                <Users className="h-4 w-4" />
                Colaboradores
              </div>
              <p className="text-2xl font-bold text-green-600">{counts.colaboradores}</p>
            </CardContent>
          </Card>
        </div>

        {/* Card principal */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>Cadastro de Pessoas</CardTitle>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Cadastro
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF/CNPJ, telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={tipoCadastro} onValueChange={setTipoCadastro}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="cliente">Clientes</SelectItem>
                  <SelectItem value="fornecedor">Fornecedores</SelectItem>
                  <SelectItem value="colaborador">Colaboradores</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tabela */}
            {filteredClientes.length === 0 ? (
              <EmptyState
                variant="no-data"
                title="Nenhum cadastro encontrado"
                description="Cadastre clientes, fornecedores ou colaboradores."
                action={{ label: 'Novo Cadastro', onClick: () => handleOpenDialog() }}
              />
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClientes.map((cliente) => (
                      <TableRow key={cliente.id}>
                        <TableCell className="font-mono text-muted-foreground">
                          {cliente.codigo?.toString().padStart(4, '0')}
                        </TableCell>
                        <TableCell className="font-medium">{cliente.nome}</TableCell>
                        <TableCell>{cliente.cpf_cnpj || '-'}</TableCell>
                        <TableCell>
                          {cliente.telefone && (
                            <a
                              href={`https://wa.me/55${cliente.telefone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-green-600 hover:underline"
                            >
                              <Phone className="h-3 w-3" />
                              {cliente.telefone}
                            </a>
                          )}
                        </TableCell>
                        <TableCell>
                          {cliente.email && (
                            <a href={`mailto:${cliente.email}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                              <Mail className="h-3 w-3" />
                              {cliente.email}
                            </a>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {cliente.cidade ? `${cliente.cidade}/${cliente.estado}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {cliente.tipo_cadastro === 'cliente' ? 'Cliente' :
                             cliente.tipo_cadastro === 'fornecedor' ? 'Fornecedor' : 'Colaborador'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(cliente)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeletingId(cliente.id); setDeleteDialogOpen(true); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de cadastro */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCliente ? 'Editar Cadastro' : 'Novo Cadastro'}</DialogTitle>
            <DialogDescription>Preencha os dados do cadastro</DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="dados" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dados">Dados Pessoais</TabsTrigger>
              <TabsTrigger value="endereco">Endereço</TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="space-y-4 mt-4">
              {/* Tipo de cadastro */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Pessoa</Label>
                  <Select value={formData.tipo_pessoa} onValueChange={(v: any) => setFormData({ ...formData, tipo_pessoa: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fisica">Pessoa Física</SelectItem>
                      <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Cadastro</Label>
                  <Select value={formData.tipo_cadastro} onValueChange={(v: any) => setFormData({ ...formData, tipo_cadastro: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cliente">Cliente</SelectItem>
                      <SelectItem value="fornecedor">Fornecedor</SelectItem>
                      <SelectItem value="colaborador">Colaborador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Nome */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{formData.tipo_pessoa === 'juridica' ? 'Razão Social *' : 'Nome Completo *'}</Label>
                  <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Nome completo" />
                </div>
                <div className="space-y-2">
                  <Label>Nome Fantasia</Label>
                  <Input value={formData.nome_fantasia} onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })} placeholder="Nome fantasia" />
                </div>
              </div>

              {/* Documentos */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{formData.tipo_pessoa === 'juridica' ? 'CNPJ' : 'CPF'}</Label>
                  <Input value={formData.cpf_cnpj} onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })} placeholder={formData.tipo_pessoa === 'juridica' ? '00.000.000/0000-00' : '000.000.000-00'} />
                </div>
                <div className="space-y-2">
                  <Label>{formData.tipo_pessoa === 'juridica' ? 'Inscrição Estadual' : 'RG'}</Label>
                  <Input value={formData.rg} onChange={(e) => setFormData({ ...formData, rg: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Data Nascimento</Label>
                  <Input type="date" value={formData.data_nascimento} onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })} />
                </div>
              </div>

              {/* Contatos */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-2">
                  <Label>Telefone 2</Label>
                  <Input value={formData.telefone2} onChange={(e) => setFormData({ ...formData, telefone2: e.target.value })} placeholder="(00) 00000-0000" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })} placeholder="(00) 00000-0000" />
                </div>
              </div>

              {formData.tipo_pessoa === 'fisica' && (
                <div className="space-y-2">
                  <Label>Sexo</Label>
                  <Select value={formData.sexo || ''} onValueChange={(v: any) => setFormData({ ...formData, sexo: v || undefined })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Feminino</SelectItem>
                      <SelectItem value="O">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>

            <TabsContent value="endereco" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input
                    value={formData.cep}
                    onChange={(e) => {
                      setFormData({ ...formData, cep: e.target.value });
                      if (e.target.value.replace(/\D/g, '').length === 8) {
                        buscarCep(e.target.value);
                      }
                    }}
                    placeholder="00000-000"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Endereço</Label>
                  <Input value={formData.endereco} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} placeholder="Rua, Avenida..." />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input value={formData.numero} onChange={(e) => setFormData({ ...formData, numero: e.target.value })} placeholder="Nº" />
                </div>
                <div className="space-y-2 col-span-3">
                  <Label>Complemento</Label>
                  <Input value={formData.complemento} onChange={(e) => setFormData({ ...formData, complemento: e.target.value })} placeholder="Apto, Bloco..." />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input value={formData.bairro} onChange={(e) => setFormData({ ...formData, bairro: e.target.value })} placeholder="Bairro" />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={formData.cidade} onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} placeholder="Cidade" />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={formData.estado} onValueChange={(v) => setFormData({ ...formData, estado: v })}>
                    <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                    <SelectContent>
                      {ESTADOS_BR.map(uf => (<SelectItem key={uf} value={uf}>{uf}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <LoadingButton onClick={handleSubmit} loading={isSaving}>{editingCliente ? 'Atualizar' : 'Cadastrar'}</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de exclusão */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir Cadastro"
        description="Tem certeza que deseja excluir este cadastro?"
        onConfirm={handleDelete}
        variant="danger"
      />
    </ModernLayout>
  );
}

