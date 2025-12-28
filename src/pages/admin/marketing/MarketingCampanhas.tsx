import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Play, Pause, Square, ExternalLink } from 'lucide-react';
import { useAdsCampaigns, AdsCampaign } from '@/hooks/useMarketing';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { LoadingButton } from '@/components/LoadingButton';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

const plataformas = [
  { value: 'meta', label: 'Meta Ads (Facebook/Instagram)' },
  { value: 'google', label: 'Google Ads' },
  { value: 'tiktok', label: 'TikTok Ads' },
  { value: 'outros', label: 'Outros' },
];

const tipos = [
  { value: 'trafego', label: 'Tráfego' },
  { value: 'conversao', label: 'Conversão' },
  { value: 'leads', label: 'Geração de Leads' },
  { value: 'vendas', label: 'Vendas/Catálogo' },
  { value: 'brand', label: 'Reconhecimento de Marca' },
];

const statusOptions = [
  { value: 'ativa', label: 'Ativa', color: 'bg-green-100 text-green-700' },
  { value: 'pausada', label: 'Pausada', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'encerrada', label: 'Encerrada', color: 'bg-gray-100 text-gray-700' },
];

export function MarketingCampanhas() {
  const { campaigns, isLoading, createCampaign, updateCampaign, deleteCampaign, isCreating, isUpdating, isDeleting } = useAdsCampaigns();
  
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<AdsCampaign | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [filterPlataforma, setFilterPlataforma] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    nome: '',
    plataforma: 'meta' as 'meta' | 'google' | 'tiktok' | 'outros',
    tipo: 'leads' as 'trafego' | 'conversao' | 'leads' | 'vendas' | 'brand',
    status: 'ativa' as 'ativa' | 'pausada' | 'encerrada',
    data_inicio: new Date().toISOString().slice(0, 10),
    data_fim: '',
    orcamento_diario: '',
    orcamento_total: '',
    objetivo: '',
    url_destino: '',
    publico_alvo: '',
  });

  const resetForm = () => {
    setForm({
      nome: '',
      plataforma: 'meta',
      tipo: 'leads',
      status: 'ativa',
      data_inicio: new Date().toISOString().slice(0, 10),
      data_fim: '',
      orcamento_diario: '',
      orcamento_total: '',
      objetivo: '',
      url_destino: '',
      publico_alvo: '',
    });
    setEditingCampaign(null);
  };

  const handleOpenDialog = (campaign?: AdsCampaign) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setForm({
        nome: campaign.nome,
        plataforma: campaign.plataforma,
        tipo: campaign.tipo,
        status: campaign.status,
        data_inicio: campaign.data_inicio,
        data_fim: campaign.data_fim || '',
        orcamento_diario: campaign.orcamento_diario?.toString() || '',
        orcamento_total: campaign.orcamento_total?.toString() || '',
        objetivo: campaign.objetivo || '',
        url_destino: campaign.url_destino || '',
        publico_alvo: campaign.publico_alvo || '',
      });
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    const data = {
      nome: form.nome,
      plataforma: form.plataforma,
      tipo: form.tipo,
      status: form.status,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim || undefined,
      orcamento_diario: form.orcamento_diario ? parseFloat(form.orcamento_diario) : undefined,
      orcamento_total: form.orcamento_total ? parseFloat(form.orcamento_total) : undefined,
      objetivo: form.objetivo || undefined,
      url_destino: form.url_destino || undefined,
      publico_alvo: form.publico_alvo || undefined,
    };

    if (editingCampaign) {
      await updateCampaign({ id: editingCampaign.id, ...data });
    } else {
      await createCampaign(data);
    }
    setShowDialog(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteCampaign(deletingId);
      setShowDeleteDialog(false);
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (campaign: AdsCampaign, newStatus: 'ativa' | 'pausada' | 'encerrada') => {
    await updateCampaign({ id: campaign.id, status: newStatus });
  };

  // Filtrar campanhas
  const filteredCampaigns = campaigns.filter(c => {
    if (filterPlataforma !== 'todos' && c.plataforma !== filterPlataforma) return false;
    if (filterStatus !== 'todos' && c.status !== filterStatus) return false;
    if (search && !c.nome.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (isLoading) {
    return <LoadingSkeleton type="table" />;
  }

  return (
    <div className="space-y-4">
      {/* Header com filtros */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Buscar campanha..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[200px] h-9"
            />
            <Select value={filterPlataforma} onValueChange={setFilterPlataforma}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Plataforma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {plataformas.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <div className="ml-auto">
              <Button onClick={() => handleOpenDialog()} className="h-9">
                <Plus className="h-4 w-4 mr-1" />Nova Campanha
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de campanhas */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Orçamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhuma campanha encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{campaign.nome}</p>
                          {campaign.objetivo && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {campaign.objetivo}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${
                          campaign.plataforma === 'meta' ? 'border-blue-500 text-blue-600' :
                          campaign.plataforma === 'google' ? 'border-red-500 text-red-600' :
                          campaign.plataforma === 'tiktok' ? 'border-pink-500 text-pink-600' : ''
                        }`}>
                          {plataformas.find(p => p.value === campaign.plataforma)?.label.split(' ')[0]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {tipos.find(t => t.value === campaign.tipo)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span>{dateFormatters.short(campaign.data_inicio)}</span>
                        {campaign.data_fim && (
                          <span className="text-muted-foreground"> - {dateFormatters.short(campaign.data_fim)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {campaign.orcamento_diario && (
                          <p className="text-sm">{currencyFormatters.brl(campaign.orcamento_diario)}/dia</p>
                        )}
                        {campaign.orcamento_total && (
                          <p className="text-xs text-muted-foreground">Total: {currencyFormatters.brl(campaign.orcamento_total)}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusOptions.find(s => s.value === campaign.status)?.color}>
                          {statusOptions.find(s => s.value === campaign.status)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {campaign.status === 'ativa' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStatusChange(campaign, 'pausada')}>
                              <Pause className="h-4 w-4 text-yellow-600" />
                            </Button>
                          )}
                          {campaign.status === 'pausada' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStatusChange(campaign, 'ativa')}>
                              <Play className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {campaign.url_destino && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(campaign.url_destino, '_blank')}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(campaign)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDeletingId(campaign.id); setShowDeleteDialog(true); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de criação/edição */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome da Campanha *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Black Friday - Leads"
                />
              </div>
              
              <div>
                <Label>Plataforma *</Label>
                <Select value={form.plataforma} onValueChange={(v: any) => setForm({ ...form, plataforma: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {plataformas.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Tipo de Campanha *</Label>
                <Select value={form.tipo} onValueChange={(v: any) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {tipos.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Data de Início *</Label>
                <Input
                  type="date"
                  value={form.data_inicio}
                  onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Data de Fim</Label>
                <Input
                  type="date"
                  value={form.data_fim}
                  onChange={(e) => setForm({ ...form, data_fim: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Orçamento Diário (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.orcamento_diario}
                  onChange={(e) => setForm({ ...form, orcamento_diario: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              
              <div>
                <Label>Orçamento Total (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.orcamento_total}
                  onChange={(e) => setForm({ ...form, orcamento_total: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              
              <div className="col-span-2">
                <Label>URL de Destino</Label>
                <Input
                  value={form.url_destino}
                  onChange={(e) => setForm({ ...form, url_destino: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              
              <div className="col-span-2">
                <Label>Objetivo da Campanha</Label>
                <Textarea
                  value={form.objetivo}
                  onChange={(e) => setForm({ ...form, objetivo: e.target.value })}
                  placeholder="Descreva o objetivo principal..."
                  rows={2}
                />
              </div>
              
              <div className="col-span-2">
                <Label>Público-Alvo</Label>
                <Textarea
                  value={form.publico_alvo}
                  onChange={(e) => setForm({ ...form, publico_alvo: e.target.value })}
                  placeholder="Descreva o público-alvo..."
                  rows={2}
                />
              </div>
              
              {editingCampaign && (
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <LoadingButton loading={isCreating || isUpdating} onClick={handleSave} disabled={!form.nome}>
              {editingCampaign ? 'Salvar' : 'Criar Campanha'}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as métricas associadas também serão excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

