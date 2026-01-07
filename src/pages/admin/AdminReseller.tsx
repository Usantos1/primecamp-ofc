import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useReseller, Company, Plan } from '@/hooks/useReseller';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Plus, Search, Edit, Eye, DollarSign, Users, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ADMIN_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

export default function AdminReseller() {
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { 
    loading, 
    error, 
    listCompanies, 
    getCompany,
    createCompany, 
    updateCompany,
    listPlans,
    createPlan,
    updatePlan,
    deletePlan,
    createSubscription,
    listCompanyUsers,
    createCompanyUser,
    resetUserPassword,
    toggleUserActive
  } = useReseller();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [plansDialogOpen, setPlansDialogOpen] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<any[]>([]);
  const [planFormData, setPlanFormData] = useState<Partial<Plan>>({});
  const [userFormData, setUserFormData] = useState({
    email: '',
    password: '',
    display_name: '',
    role: 'member',
    phone: ''
  });
  const [formData, setFormData] = useState<Partial<Company> & { plan_id?: string; billing_cycle?: 'monthly' | 'yearly' }>({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    status: 'trial'
  });

  // Verificar se é admin da empresa principal
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login');
        return;
      }
      
      // Verificar se é admin
      if (!isAdmin || profile?.role !== 'admin') {
        toast.error('Acesso negado. Apenas administradores da empresa principal podem acessar esta página.');
        navigate('/admin');
        return;
      }
      
      // Verificar se pertence à empresa admin (via API)
      // O backend já faz essa verificação, mas vamos adicionar uma camada extra de segurança
      // Se o backend retornar 403, o erro será tratado no hook useReseller
    }
  }, [user, profile, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin && profile?.role === 'admin') {
      loadCompanies();
    }
  }, [pagination.page, search, statusFilter, user, isAdmin, profile]);

  useEffect(() => {
    if (user && isAdmin && profile?.role === 'admin') {
      loadPlans();
    }
  }, [user, isAdmin, profile]);

  const loadCompanies = async () => {
    try {
      const data = await listCompanies({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter || undefined
      });
      
      // Se retornar erro 403, significa que não é admin da empresa principal
      if (data.error && data.error.includes('Acesso negado')) {
        toast.error('Acesso negado. Apenas administradores da empresa principal podem acessar esta página.');
        navigate('/admin');
        return;
      }
      
      setCompanies(data.data || []);
      if (data.pagination) {
        setPagination(prev => ({
          ...prev,
          ...data.pagination,
          page: data.pagination?.page || prev.page
        }));
      }
    } catch (err: any) {
      // Se for erro 403, redirecionar
      if (err.message?.includes('403') || err.message?.includes('Acesso negado')) {
        toast.error('Acesso negado. Apenas administradores da empresa principal podem acessar esta página.');
        navigate('/admin');
        return;
      }
      toast.error(err.message || 'Erro ao carregar empresas');
    }
  };

  const loadPlans = async () => {
    try {
      const plansData = await listPlans();
      console.log('[AdminReseller] Planos carregados:', plansData);
      
      // Se retornar erro 403, significa que não é admin da empresa principal
      if (plansData?.error && plansData.error.includes('Acesso negado')) {
        toast.error('Acesso negado. Apenas administradores da empresa principal podem acessar esta página.');
        navigate('/admin');
        return;
      }
      
      setPlans(Array.isArray(plansData) ? plansData : []);
    } catch (err: any) {
      // Se for erro 403, redirecionar
      if (err.message?.includes('403') || err.message?.includes('Acesso negado')) {
        toast.error('Acesso negado. Apenas administradores da empresa principal podem acessar esta página.');
        navigate('/admin');
        return;
      }
      console.error('Erro ao carregar planos:', err);
      toast.error('Erro ao carregar planos: ' + err.message);
      setPlans([]);
    }
  };

  const handleCreateCompany = async () => {
    try {
      await createCompany(formData);
      toast.success('Empresa criada com sucesso!');
      setDialogOpen(false);
      resetForm();
      loadCompanies();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar empresa');
    }
  };

  const handleUpdateCompany = async () => {
    if (!selectedCompany) return;
    try {
      await updateCompany(selectedCompany.id, formData);
      toast.success('Empresa atualizada com sucesso!');
      setDialogOpen(false);
      resetForm();
      loadCompanies();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar empresa');
    }
  };

  const handleCreateSubscription = async () => {
    if (!selectedCompany || !formData.plan_id) return;
    try {
      await createSubscription(
        selectedCompany.id,
        formData.plan_id,
        formData.billing_cycle || 'monthly'
      );
      toast.success('Assinatura criada com sucesso!');
      setSubscriptionDialogOpen(false);
      resetForm();
      loadCompanies();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar assinatura');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      cnpj: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      status: 'trial'
    });
    setSelectedCompany(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = async (company: Company) => {
    try {
      const fullCompany = await getCompany(company.id);
      setSelectedCompany(fullCompany);
      setFormData({
        name: fullCompany.name,
        cnpj: fullCompany.cnpj,
        email: fullCompany.email,
        phone: fullCompany.phone,
        address: fullCompany.address,
        city: fullCompany.city,
        state: fullCompany.state,
        zip_code: fullCompany.zip_code,
        status: fullCompany.status
      });
      setDialogOpen(true);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar empresa');
    }
  };

  const openSubscriptionDialog = (company: Company) => {
    setSelectedCompany(company);
    setFormData({ plan_id: '', billing_cycle: 'monthly' });
    setSubscriptionDialogOpen(true);
  };

  const openUsersDialog = async (company: Company) => {
    setSelectedCompany(company);
    setUsersDialogOpen(true);
    try {
      const users = await listCompanyUsers(company.id);
      setCompanyUsers(users || []);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar usuários');
    }
  };

  const openPlansDialog = () => {
    setPlansDialogOpen(true);
    loadPlans();
  };

  const handleCreatePlan = async () => {
    try {
      await createPlan(planFormData);
      toast.success('Plano criado com sucesso!');
      setPlansDialogOpen(false);
      setPlanFormData({});
      loadPlans();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar plano');
    }
  };

  const handleUpdatePlan = async (plan: Plan) => {
    try {
      await updatePlan(plan.id, planFormData);
      toast.success('Plano atualizado com sucesso!');
      setPlansDialogOpen(false);
      setPlanFormData({});
      loadPlans();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar plano');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Tem certeza que deseja desativar este plano?')) return;
    try {
      await deletePlan(planId);
      toast.success('Plano desativado com sucesso!');
      loadPlans();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao desativar plano');
    }
  };

  const handleCreateUser = async () => {
    if (!selectedCompany) return;
    try {
      await createCompanyUser(selectedCompany.id, userFormData);
      toast.success('Usuário criado com sucesso!');
      setUserFormData({ email: '', password: '', display_name: '', role: 'member', phone: '' });
      const users = await listCompanyUsers(selectedCompany.id);
      setCompanyUsers(users || []);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar usuário');
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!selectedCompany) return;
    const newPassword = prompt('Digite a nova senha (mínimo 6 caracteres):');
    if (!newPassword || newPassword.length < 6) {
      toast.error('Senha deve ter pelo menos 6 caracteres');
      return;
    }
    try {
      await resetUserPassword(selectedCompany.id, userId, newPassword);
      toast.success('Senha resetada com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao resetar senha');
    }
  };

  const handleToggleUserActive = async (userId: string) => {
    if (!selectedCompany) return;
    try {
      await toggleUserActive(selectedCompany.id, userId);
      toast.success('Status do usuário alterado!');
      const users = await listCompanyUsers(selectedCompany.id);
      setCompanyUsers(users || []);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar status do usuário');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      trial: 'secondary',
      suspended: 'destructive',
      cancelled: 'outline'
    };
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      trial: 'bg-blue-100 text-blue-800',
      suspended: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return (
      <Badge className={colors[status] || ''} variant={variants[status] || 'outline'}>
        {status === 'active' ? 'Ativa' : 
         status === 'trial' ? 'Trial' : 
         status === 'suspended' ? 'Suspensa' : 
         status === 'cancelled' ? 'Cancelada' : status}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <ModernLayout
      title="Gestão de Revenda"
      subtitle="Gerencie empresas, assinaturas e pagamentos"
    >
      <div className="space-y-4">
        {/* Filtros e ações */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex-1 flex flex-col md:flex-row gap-2 w-full md:w-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, email ou CNPJ..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="suspended">Suspensa</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={openPlansDialog} variant="outline" className="w-full md:w-auto">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Gerenciar Planos
                </Button>
                <Button onClick={openCreateDialog} className="w-full md:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Empresa
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabela de empresas */}
        <Card>
          <CardHeader>
            <CardTitle>Empresas Cadastradas</CardTitle>
            <CardDescription>
              {pagination.total} empresa(s) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : companies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma empresa encontrada
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Usuários</TableHead>
                      <TableHead>Expira em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>{company.cnpj || '-'}</TableCell>
                        <TableCell>{company.email}</TableCell>
                        <TableCell>
                          {company.plan_name ? (
                            <Badge variant="outline">{company.plan_name}</Badge>
                          ) : (
                            <span className="text-muted-foreground">Sem plano</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(company.status)}</TableCell>
                        <TableCell>{company.user_count || 0}</TableCell>
                        <TableCell>
                          {company.subscription_expires_at ? (
                            format(new Date(company.subscription_expires_at), 'dd/MM/yyyy', { locale: ptBR })
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(company)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openSubscriptionDialog(company)}
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openUsersDialog(company)}
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Paginação */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Página {pagination.page} de {pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de criar/editar empresa */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedCompany ? 'Editar Empresa' : 'Nova Empresa'}
              </DialogTitle>
              <DialogDescription>
                {selectedCompany ? 'Atualize os dados da empresa' : 'Preencha os dados para cadastrar uma nova empresa'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Empresa *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome da empresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contato@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Rua, número"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">CEP</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                    placeholder="00000-000"
                  />
                </div>
              </div>
              {selectedCompany && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="suspended">Suspensa</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={selectedCompany ? handleUpdateCompany : handleCreateCompany}>
                {selectedCompany ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de criar assinatura */}
        <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Assinatura</DialogTitle>
              <DialogDescription>
                Selecione o plano e período de cobrança para {selectedCompany?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="plan_id">Plano *</Label>
                <Select
                  value={formData.plan_id || undefined}
                  onValueChange={(value) => setFormData({ ...formData, plan_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.length > 0 ? (
                      plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - {formatCurrency(plan.price_monthly)}/mês
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-plans" disabled>Nenhum plano disponível</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing_cycle">Período de Cobrança</Label>
                <Select
                  value={formData.billing_cycle || 'monthly'}
                  onValueChange={(value: 'monthly' | 'yearly') => setFormData({ ...formData, billing_cycle: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.plan_id && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm font-medium mb-2">Resumo da Assinatura</div>
                  {(() => {
                    const plan = plans.find(p => p.id === formData.plan_id);
                    if (!plan) return null;
                    const price = formData.billing_cycle === 'yearly' && plan.price_yearly 
                      ? plan.price_yearly 
                      : plan.price_monthly;
                    return (
                      <div className="space-y-1 text-sm">
                        <div>Plano: <strong>{plan.name}</strong></div>
                        <div>Valor: <strong>{formatCurrency(price)}</strong></div>
                        <div>Período: <strong>{formData.billing_cycle === 'yearly' ? 'Anual' : 'Mensal'}</strong></div>
                        <div>Limite de usuários: <strong>{plan.max_users}</strong></div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSubscriptionDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateSubscription}
                disabled={!formData.plan_id}
              >
                Criar Assinatura
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de gerenciar usuários */}
        <Dialog open={usersDialogOpen} onOpenChange={setUsersDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Usuários de {selectedCompany?.name}</DialogTitle>
              <DialogDescription>
                Gerencie os usuários desta empresa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Formulário de criar usuário */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Novo Usuário</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="user_email">Email *</Label>
                      <Input
                        id="user_email"
                        type="email"
                        value={userFormData.email}
                        onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                        placeholder="usuario@empresa.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user_password">Senha *</Label>
                      <Input
                        id="user_password"
                        type="password"
                        value={userFormData.password}
                        onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="user_display_name">Nome</Label>
                      <Input
                        id="user_display_name"
                        value={userFormData.display_name}
                        onChange={(e) => setUserFormData({ ...userFormData, display_name: e.target.value })}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user_role">Função</Label>
                      <Select
                        value={userFormData.role}
                        onValueChange={(value) => setUserFormData({ ...userFormData, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Membro</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={handleCreateUser} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Usuário
                  </Button>
                </CardContent>
              </Card>

              {/* Lista de usuários */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Usuários Cadastrados ({companyUsers.length})</h3>
                <div className="space-y-2">
                  {companyUsers.map((user) => (
                    <Card key={user.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{user.display_name || user.email}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                            <div className="text-xs text-muted-foreground">
                              {user.role} • {user.email_verified ? 'Ativo' : 'Inativo'}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResetPassword(user.id)}
                            >
                              Resetar Senha
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleUserActive(user.id)}
                            >
                              {user.email_verified ? 'Desativar' : 'Ativar'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {companyUsers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum usuário cadastrado
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUsersDialogOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de gerenciar planos */}
        <Dialog open={plansDialogOpen} onOpenChange={setPlansDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gerenciar Planos</DialogTitle>
              <DialogDescription>
                Crie, edite ou desative planos de assinatura
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Formulário de criar/editar plano */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {planFormData.id ? 'Editar Plano' : 'Novo Plano'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="plan_name">Nome *</Label>
                      <Input
                        id="plan_name"
                        value={planFormData.name || ''}
                        onChange={(e) => setPlanFormData({ ...planFormData, name: e.target.value })}
                        placeholder="Ex: Básico"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plan_code">Código *</Label>
                      <Input
                        id="plan_code"
                        value={planFormData.code || ''}
                        onChange={(e) => setPlanFormData({ ...planFormData, code: e.target.value })}
                        placeholder="Ex: basic"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plan_description">Descrição</Label>
                    <Input
                      id="plan_description"
                      value={planFormData.description || ''}
                      onChange={(e) => setPlanFormData({ ...planFormData, description: e.target.value })}
                      placeholder="Descrição do plano"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="plan_price_monthly">Preço Mensal *</Label>
                      <Input
                        id="plan_price_monthly"
                        type="number"
                        step="0.01"
                        value={planFormData.price_monthly || ''}
                        onChange={(e) => setPlanFormData({ ...planFormData, price_monthly: parseFloat(e.target.value) })}
                        placeholder="99.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plan_price_yearly">Preço Anual</Label>
                      <Input
                        id="plan_price_yearly"
                        type="number"
                        step="0.01"
                        value={planFormData.price_yearly || ''}
                        onChange={(e) => setPlanFormData({ ...planFormData, price_yearly: parseFloat(e.target.value) })}
                        placeholder="990.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plan_max_users">Máx. Usuários</Label>
                      <Input
                        id="plan_max_users"
                        type="number"
                        value={planFormData.max_users || ''}
                        onChange={(e) => setPlanFormData({ ...planFormData, max_users: parseInt(e.target.value) || null })}
                        placeholder="Ilimitado"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={planFormData.id ? () => handleUpdatePlan(planFormData as Plan) : handleCreatePlan}
                      className="flex-1"
                    >
                      {planFormData.id ? 'Atualizar' : 'Criar'} Plano
                    </Button>
                    {planFormData.id && (
                      <Button 
                        variant="outline"
                        onClick={() => setPlanFormData({})}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Lista de planos */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Planos Cadastrados ({plans.length})</h3>
                <div className="space-y-2">
                  {plans.map((plan) => (
                    <Card key={plan.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{plan.name} ({plan.code})</div>
                            <div className="text-sm text-muted-foreground">
                              {formatCurrency(plan.price_monthly)}/mês
                              {plan.price_yearly && ` • ${formatCurrency(plan.price_yearly)}/ano`}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Máx. {plan.max_users || '∞'} usuários • {plan.active ? 'Ativo' : 'Inativo'}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPlanFormData(plan)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {plan.active && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeletePlan(plan.id)}
                              >
                                Desativar
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setPlansDialogOpen(false);
                setPlanFormData({});
              }}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModernLayout>
  );
}

