import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, Pencil, Trash2, Phone, MessageSquare, Mail, 
  ThermometerSun, ThermometerSnowflake, Flame,
  CheckCircle, XCircle, Clock, User, History, Webhook, Users, MessagesSquare
} from 'lucide-react';
import { useLeads, useLeadInteractions, useAdsCampaigns, Lead, LeadInteraction } from '@/hooks/useMarketing';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { LoadingButton } from '@/components/LoadingButton';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { useAuth } from '@/contexts/AuthContext';
import { WebhookManager } from '@/components/marketing/WebhookManager';
import { LeadChatPanel } from '@/components/marketing/LeadChatPanel';
import { cn } from '@/lib/utils';

const fontes = [
  { value: 'meta_ads', label: 'Meta Ads' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'organico', label: 'Orgânico' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'site', label: 'Site' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'ativacrm', label: 'AtivaCRM' },
  { value: 'outros', label: 'Outros' },
];

const statusOptions = [
  { value: 'novo', label: 'Novo', color: 'bg-blue-100 text-blue-700', icon: Clock },
  { value: 'contatado', label: 'Contatado', color: 'bg-yellow-100 text-yellow-700', icon: Phone },
  { value: 'qualificado', label: 'Qualificado', color: 'bg-orange-100 text-orange-700', icon: CheckCircle },
  { value: 'negociacao', label: 'Negociação', color: 'bg-purple-100 text-purple-700', icon: MessageSquare },
  { value: 'convertido', label: 'Convertido', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  { value: 'perdido', label: 'Perdido', color: 'bg-red-100 text-red-700', icon: XCircle },
];

const temperaturas = [
  { value: 'frio', label: 'Frio', color: 'text-blue-500', icon: ThermometerSnowflake },
  { value: 'morno', label: 'Morno', color: 'text-yellow-500', icon: ThermometerSun },
  { value: 'quente', label: 'Quente', color: 'text-red-500', icon: Flame },
];

const tiposInteracao = [
  { value: 'ligacao', label: 'Ligação', icon: Phone },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'email', label: 'E-mail', icon: Mail },
  { value: 'visita', label: 'Visita', icon: User },
  { value: 'reuniao', label: 'Reunião', icon: User },
  { value: 'proposta', label: 'Proposta', icon: CheckCircle },
  { value: 'follow_up', label: 'Follow-up', icon: History },
];

export function MarketingLeads() {
  const { month } = useOutletContext<{ month: string }>();
  const { user, profile } = useAuth();
  const { campaigns } = useAdsCampaigns();
  const { leads, stats, isLoading, createLead, updateLead, deleteLead, isCreating, isUpdating } = useLeads({
    startDate: `${month}-01`,
    endDate: `${month}-31`,
  });
  
  const [activeTab, setActiveTab] = useState<'leads' | 'webhooks' | 'chat'>('leads');
  const [chatLead, setChatLead] = useState<Lead | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showInteractionDialog, setShowInteractionDialog] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterFonte, setFilterFonte] = useState('todos');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    whatsapp: '',
    cidade: '',
    estado: '',
    fonte: 'meta_ads' as Lead['fonte'],
    campaign_id: 'none',
    status: 'novo' as Lead['status'],
    temperatura: 'frio' as Lead['temperatura'],
    interesse: '',
    orcamento_estimado: '',
    prazo_compra: '' as Lead['prazo_compra'] | '',
    observacoes: '',
  });

  const [interactionForm, setInteractionForm] = useState({
    tipo: 'ligacao' as LeadInteraction['tipo'],
    direcao: 'outbound' as LeadInteraction['direcao'],
    resultado: '' as LeadInteraction['resultado'] | '',
    descricao: '',
    duracao_minutos: '',
  });

  const { interactions, createInteraction, isCreating: isCreatingInteraction } = useLeadInteractions(selectedLead?.id || '');

  const resetForm = () => {
    setForm({
      nome: '',
      email: '',
      telefone: '',
      whatsapp: '',
      cidade: '',
      estado: '',
      fonte: 'meta_ads',
      campaign_id: 'none',
      status: 'novo',
      temperatura: 'frio',
      interesse: '',
      orcamento_estimado: '',
      prazo_compra: '',
      observacoes: '',
    });
    setEditingLead(null);
  };

  const handleOpenDialog = (lead?: Lead) => {
    if (lead) {
      setEditingLead(lead);
      setForm({
        nome: lead.nome,
        email: lead.email || '',
        telefone: lead.telefone || '',
        whatsapp: lead.whatsapp || '',
        cidade: lead.cidade || '',
        estado: lead.estado || '',
        fonte: lead.fonte,
        campaign_id: lead.campaign_id || 'none',
        status: lead.status,
        temperatura: lead.temperatura,
        interesse: lead.interesse || '',
        orcamento_estimado: lead.orcamento_estimado?.toString() || '',
        prazo_compra: lead.prazo_compra || '',
        observacoes: lead.observacoes || '',
      });
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    const data = {
      nome: form.nome,
      email: form.email || undefined,
      telefone: form.telefone || undefined,
      whatsapp: form.whatsapp || undefined,
      cidade: form.cidade || undefined,
      estado: form.estado || undefined,
      fonte: form.fonte,
      campaign_id: form.campaign_id && form.campaign_id !== 'none' ? form.campaign_id : undefined,
      status: form.status,
      temperatura: form.temperatura,
      interesse: form.interesse || undefined,
      orcamento_estimado: form.orcamento_estimado ? parseFloat(form.orcamento_estimado) : undefined,
      prazo_compra: form.prazo_compra || undefined,
      observacoes: form.observacoes || undefined,
      convertido: form.status === 'convertido',
      responsavel_id: user?.id,
      responsavel_nome: profile?.display_name || user?.email,
    };

    if (editingLead) {
      await updateLead({ id: editingLead.id, ...data });
    } else {
      await createLead(data as any);
    }
    setShowDialog(false);
    resetForm();
  };

  const handleOpenInteractionDialog = (lead: Lead) => {
    setSelectedLead(lead);
    setInteractionForm({
      tipo: 'ligacao',
      direcao: 'outbound',
      resultado: '',
      descricao: '',
      duracao_minutos: '',
    });
    setShowInteractionDialog(true);
  };

  const handleSaveInteraction = async () => {
    if (!selectedLead) return;
    
    await createInteraction({
      lead_id: selectedLead.id,
      tipo: interactionForm.tipo,
      direcao: interactionForm.direcao,
      resultado: interactionForm.resultado || undefined,
      descricao: interactionForm.descricao || undefined,
      duracao_minutos: interactionForm.duracao_minutos ? parseInt(interactionForm.duracao_minutos) : undefined,
      realizado_por_id: user?.id,
      realizado_por_nome: profile?.display_name || user?.email,
    });
    
    setInteractionForm({
      tipo: 'ligacao',
      direcao: 'outbound',
      resultado: '',
      descricao: '',
      duracao_minutos: '',
    });
  };

  // Filtrar leads
  const filteredLeads = leads.filter(l => {
    if (filterStatus !== 'todos' && l.status !== filterStatus) return false;
    if (filterFonte !== 'todos' && l.fonte !== filterFonte) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      if (!l.nome.toLowerCase().includes(searchLower) && 
          !l.email?.toLowerCase().includes(searchLower) &&
          !l.telefone?.includes(search) &&
          !l.whatsapp?.includes(search)) return false;
    }
    return true;
  });

  if (isLoading) {
    return <LoadingSkeleton type="table" />;
  }

  return (
    <div className="space-y-4">
      {/* Tabs: Leads, Chat e Webhooks */}
      <Card>
        <CardContent className="p-2">
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'leads' ? 'default' : 'ghost'}
              size="sm"
              className={cn('h-8 text-xs', activeTab === 'leads' && 'bg-primary')}
              onClick={() => setActiveTab('leads')}
            >
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Leads
              <Badge variant="secondary" className="ml-2 text-[10px]">{leads.length}</Badge>
            </Button>
            <Button
              variant={activeTab === 'chat' ? 'default' : 'ghost'}
              size="sm"
              className={cn('h-8 text-xs', activeTab === 'chat' && 'bg-green-600 hover:bg-green-700')}
              onClick={() => { setActiveTab('chat'); setChatLead(null); }}
            >
              <MessagesSquare className="h-3.5 w-3.5 mr-1.5" />
              Chat
            </Button>
            <Button
              variant={activeTab === 'webhooks' ? 'default' : 'ghost'}
              size="sm"
              className={cn('h-8 text-xs', activeTab === 'webhooks' && 'bg-orange-600 hover:bg-orange-700')}
              onClick={() => setActiveTab('webhooks')}
            >
              <Webhook className="h-3.5 w-3.5 mr-1.5" />
              Webhooks
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo da Tab Chat */}
      {activeTab === 'chat' && (
        <LeadChatPanel 
          lead={chatLead} 
          onClose={() => setChatLead(null)}
          fullScreen
        />
      )}

      {/* Conteúdo da Tab Webhooks */}
      {activeTab === 'webhooks' && <WebhookManager />}

      {/* Conteúdo da Tab Leads */}
      {activeTab === 'leads' && (
        <>
          {/* Estatísticas compactas */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {statusOptions.map((s) => (
              <Card key={s.value} className="cursor-pointer hover:shadow-md" onClick={() => setFilterStatus(filterStatus === s.value ? 'todos' : s.value)}>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold">{stats.byStatus[s.value as keyof typeof stats.byStatus]}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

      {/* Header com filtros */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Buscar lead..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[200px] h-9"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {statusOptions.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterFonte} onValueChange={setFilterFonte}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="Fonte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {fontes.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Taxa Conv.: {stats.taxaConversao.toFixed(1)}%
              </Badge>
              <Badge variant="outline" className="text-xs text-green-600">
                Total: {currencyFormatters.brl(stats.totalConversao)}
              </Badge>
              <Button onClick={() => handleOpenDialog()} className="h-9">
                <Plus className="h-4 w-4 mr-1" />Novo Lead
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de leads */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[calc(100vh-350px)]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Temp.</TableHead>
                  <TableHead>Interações</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhum lead encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => {
                    const TempIcon = temperaturas.find(t => t.value === lead.temperatura)?.icon || ThermometerSun;
                    return (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{lead.nome}</p>
                            {lead.interesse && (
                              <p className="text-xs text-muted-foreground">{lead.interesse}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {lead.whatsapp && <p className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{lead.whatsapp}</p>}
                            {lead.telefone && !lead.whatsapp && <p className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.telefone}</p>}
                            {lead.email && <p className="text-xs text-muted-foreground truncate max-w-[150px]">{lead.email}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {fontes.find(f => f.value === lead.fonte)?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select value={lead.status} onValueChange={(v: any) => updateLead({ id: lead.id, status: v })}>
                            <SelectTrigger className="h-7 w-[110px]">
                              <Badge className={`${statusOptions.find(s => s.value === lead.status)?.color} text-[10px]`}>
                                {statusOptions.find(s => s.value === lead.status)?.label}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map(s => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <TempIcon className={`h-5 w-5 ${temperaturas.find(t => t.value === lead.temperatura)?.color}`} />
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {lead.total_interacoes}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8" 
                              onClick={() => { setChatLead(lead); setActiveTab('chat'); }}
                              title="Abrir chat"
                            >
                              <MessagesSquare className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenInteractionDialog(lead)}>
                              <History className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(lead)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteLead(lead.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de criação/edição de lead */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingLead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              
              <div>
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
              </div>
              
              <div>
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
              </div>
              
              <div>
                <Label>Fonte *</Label>
                <Select value={form.fonte} onValueChange={(v: any) => setForm({ ...form, fonte: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {fontes.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Campanha</Label>
                <Select value={form.campaign_id} onValueChange={(v) => setForm({ ...form, campaign_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Temperatura</Label>
                <Select value={form.temperatura} onValueChange={(v: any) => setForm({ ...form, temperatura: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {temperaturas.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Interesse</Label>
                <Input value={form.interesse} onChange={(e) => setForm({ ...form, interesse: e.target.value })} placeholder="Produto/serviço..." />
              </div>
              
              <div>
                <Label>Orçamento Estimado</Label>
                <Input type="number" value={form.orcamento_estimado} onChange={(e) => setForm({ ...form, orcamento_estimado: e.target.value })} />
              </div>
              
              <div className="col-span-2">
                <Label>Observações</Label>
                <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <LoadingButton loading={isCreating || isUpdating} onClick={handleSave} disabled={!form.nome}>
              {editingLead ? 'Salvar' : 'Criar Lead'}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de interações */}
      <Dialog open={showInteractionDialog} onOpenChange={setShowInteractionDialog}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Interações - {selectedLead?.nome}</DialogTitle>
            <DialogDescription>Registre e visualize todas as interações com este lead</DialogDescription>
          </DialogHeader>
          
          {/* Formulário de nova interação */}
          <Card className="bg-muted/50">
            <CardContent className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Select value={interactionForm.tipo} onValueChange={(v: any) => setInteractionForm({ ...interactionForm, tipo: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {tiposInteracao.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                
                <Select value={interactionForm.resultado} onValueChange={(v: any) => setInteractionForm({ ...interactionForm, resultado: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Resultado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positivo">Positivo</SelectItem>
                    <SelectItem value="negativo">Negativo</SelectItem>
                    <SelectItem value="neutro">Neutro</SelectItem>
                    <SelectItem value="nao_atendeu">Não Atendeu</SelectItem>
                    <SelectItem value="agendado">Agendado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Textarea
                placeholder="Descrição da interação..."
                value={interactionForm.descricao}
                onChange={(e) => setInteractionForm({ ...interactionForm, descricao: e.target.value })}
                rows={2}
              />
              
              <LoadingButton loading={isCreatingInteraction} onClick={handleSaveInteraction} className="w-full h-9">
                Registrar Interação
              </LoadingButton>
            </CardContent>
          </Card>
          
          {/* Lista de interações */}
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {interactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">Nenhuma interação registrada</p>
              ) : (
                interactions.map((interaction) => {
                  const TipoIcon = tiposInteracao.find(t => t.value === interaction.tipo)?.icon || Phone;
                  return (
                    <Card key={interaction.id}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <TipoIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-[10px]">
                                {tiposInteracao.find(t => t.value === interaction.tipo)?.label}
                              </Badge>
                              {interaction.resultado && (
                                <Badge className={`text-[10px] ${
                                  interaction.resultado === 'positivo' ? 'bg-green-100 text-green-700' :
                                  interaction.resultado === 'negativo' ? 'bg-red-100 text-red-700' : ''
                                }`}>
                                  {interaction.resultado}
                                </Badge>
                              )}
                            </div>
                            {interaction.descricao && (
                              <p className="text-sm mt-1">{interaction.descricao}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {interaction.realizado_por_nome} • {dateFormatters.short(interaction.created_at)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}

