import { useState, useMemo } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Search, Edit, Trash2, Phone, Mail, MapPin, User
} from 'lucide-react';
import { useClientesSupabase as useClientes } from '@/hooks/useClientesSupabase';
import { buscarCEP } from '@/hooks/useAssistencia';
import { Cliente, ClienteFormData } from '@/types/assistencia';
import { EmptyState } from '@/components/EmptyState';
import { LoadingButton } from '@/components/LoadingButton';
import { useToast } from '@/hooks/use-toast';

const INITIAL_FORM: ClienteFormData = {
  tipo_pessoa: 'fisica',
  nome: '',
  cpf_cnpj: '',
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
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState<ClienteFormData>(INITIAL_FORM);
  const [isLoading, setIsLoading] = useState(false);
  
  const { clientes, createCliente, updateCliente, deleteCliente } = useClientes();
  const { toast } = useToast();

  // Filtrar clientes
  const filteredClientes = useMemo(() => {
    if (!searchTerm) return clientes;
    const q = searchTerm.toLowerCase();
    return clientes.filter(c => 
      c.nome.toLowerCase().includes(q) ||
      c.cpf_cnpj?.includes(searchTerm) ||
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

  return (
    <ModernLayout title="Clientes" subtitle="Gerenciar clientes">
      <div className="space-y-4">
        {/* Barra de ações */}
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF, telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Cliente
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de clientes */}
        <Card>
          <CardContent className="p-0">
            {filteredClientes.length === 0 ? (
              <EmptyState
                icon={User}
                title="Nenhum cliente encontrado"
                description={searchTerm ? "Tente buscar por outro termo" : "Cadastre seu primeiro cliente"}
                action={!searchTerm ? { label: "Novo Cliente", onClick: handleNew } : undefined}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClientes.map(cliente => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">{cliente.nome}</TableCell>
                      <TableCell>{cliente.cpf_cnpj || '-'}</TableCell>
                      <TableCell>
                        {cliente.whatsapp || cliente.telefone || '-'}
                      </TableCell>
                      <TableCell>{cliente.email || '-'}</TableCell>
                      <TableCell>{cliente.cidade || '-'}</TableCell>
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
            )}
          </CardContent>
        </Card>

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="dados" className="flex-1">Dados Pessoais</TabsTrigger>
                <TabsTrigger value="endereco" className="flex-1">Endereço</TabsTrigger>
                <TabsTrigger value="contato" className="flex-1">Contato</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Pessoa</Label>
                    <Select 
                      value={formData.tipo_pessoa} 
                      onValueChange={(v: any) => setFormData(prev => ({ ...prev, tipo_pessoa: v }))}
                    >
                      <SelectTrigger>
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
                      value={formData.cpf_cnpj}
                      onChange={(e) => setFormData(prev => ({ ...prev, cpf_cnpj: e.target.value }))}
                      placeholder={formData.tipo_pessoa === 'fisica' ? '000.000.000-00' : '00.000.000/0000-00'}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Nome completo"
                  />
                </div>

                {formData.tipo_pessoa === 'juridica' && (
                  <div className="space-y-2">
                    <Label>Nome Fantasia</Label>
                    <Input
                      value={formData.nome_fantasia || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome_fantasia: e.target.value }))}
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="endereco" className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.cep}
                        onChange={(e) => setFormData(prev => ({ ...prev, cep: e.target.value }))}
                        placeholder="00000-000"
                      />
                      <Button type="button" variant="outline" onClick={handleBuscarCEP} disabled={isLoading}>
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Logradouro</Label>
                    <Input
                      value={formData.logradouro}
                      onChange={(e) => setFormData(prev => ({ ...prev, logradouro: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input
                      value={formData.numero}
                      onChange={(e) => setFormData(prev => ({ ...prev, numero: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-3 space-y-2">
                    <Label>Complemento</Label>
                    <Input
                      value={formData.complemento}
                      onChange={(e) => setFormData(prev => ({ ...prev, complemento: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Bairro</Label>
                    <Input
                      value={formData.bairro}
                      onChange={(e) => setFormData(prev => ({ ...prev, bairro: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input
                      value={formData.cidade}
                      onChange={(e) => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Input
                      value={formData.estado}
                      onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}
                      maxLength={2}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contato" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={formData.telefone}
                      onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                      placeholder="(00) 0000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input
                      value={formData.whatsapp}
                      onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <LoadingButton onClick={handleSubmit} loading={isLoading}>
                {editingCliente ? 'Atualizar' : 'Cadastrar'}
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModernLayout>
  );
}
