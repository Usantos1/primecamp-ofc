import { useEffect, useMemo, useState } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { getApiUrl } from '@/utils/apiUrl';
import { authAPI } from '@/integrations/auth/api-client';
import { ChevronLeft, ChevronRight, Loader2, MessageCircle, Pencil, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_TEMPLATE = `Olá, {cliente}. Tudo bem?
Passando para saber como está sua experiência após o serviço realizado no aparelho.
Está tudo certo com o funcionamento?`;

const VARS = ['{cliente}', '{numero_os}', '{empresa}', '{marca}', '{modelo}', '{data_faturamento}'];

type Settings = {
  ativo: boolean;
  tipo_regra_envio: 'NEXT_DAY_10AM' | 'AFTER_24H';
  timezone: string;
  template_key: string;
  template_mensagem: string;
};

type JobRow = {
  id: string;
  ordem_servico_id: string;
  numero_os: number | null;
  cliente_nome: string | null;
  telefone: string | null;
  telefone_contato: string | null;
  status: string;
  tipo_regra_envio: string;
  scheduled_at: string;
  sent_at: string | null;
  faturado_at: string;
  error_message: string | null;
  skip_reason: string | null;
  random_delay_seconds: number;
  created_at: string;
  mensagem_preview: string | null;
  marca_nome: string | null;
  modelo_nome: string | null;
};

export default function FollowupPosVendaConfig() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingJob, setEditingJob] = useState<JobRow | null>(null);
  const [editPhone, setEditPhone] = useState('');
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [updatingJob, setUpdatingJob] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>({
    ativo: true,
    tipo_regra_envio: 'NEXT_DAY_10AM',
    timezone: 'America/Sao_Paulo',
    template_key: 'default',
    template_mensagem: DEFAULT_TEMPLATE,
  });
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [jobTotal, setJobTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [jobSearch, setJobSearch] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState('all');
  const totalPages = Math.max(1, Math.ceil(jobTotal / pageSize));

  const preview = useMemo(() => {
    const vars: Record<string, string> = {
      cliente: 'Maria Silva',
      numero_os: '4521',
      empresa: 'Minha Assistência',
      marca: 'Apple',
      modelo: 'iPhone 13',
      data_faturamento: new Date().toLocaleString('pt-BR'),
    };
    let msg = settings.template_mensagem || '';
    for (const [k, v] of Object.entries(vars)) {
      msg = msg.replaceAll(`{${k}}`, v);
    }
    return msg.trim();
  }, [settings.template_mensagem]);

  const load = async () => {
    setLoading(true);
    try {
      const token = authAPI.getToken();
      const headers: HeadersInit = { Authorization: `Bearer ${token}` };
      const jobParams = new URLSearchParams({
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
      });
      if (jobStatusFilter !== 'all') jobParams.set('status', jobStatusFilter);
      if (jobSearch.trim()) jobParams.set('search', jobSearch.trim());

      const [sRes, jRes] = await Promise.all([
        fetch(`${getApiUrl()}/os-pos-venda-followup/settings`, { headers }),
        fetch(`${getApiUrl()}/os-pos-venda-followup/jobs?${jobParams.toString()}`, { headers }),
      ]);
      if (sRes.ok) {
        const data = await sRes.json();
        setSettings({
          ativo: !!data.ativo,
          tipo_regra_envio: data.tipo_regra_envio || 'NEXT_DAY_10AM',
          timezone: data.timezone || 'America/Sao_Paulo',
          template_key: data.template_key || 'default',
          template_mensagem: data.template_mensagem || DEFAULT_TEMPLATE,
        });
      }
      if (jRes.ok) {
        const j = await jRes.json();
        setJobs(j.jobs || []);
        setJobTotal(Number(j.total || 0));
      }
    } catch (e: any) {
      toast({ title: 'Erro ao carregar', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize, jobStatusFilter, jobSearch]);

  useEffect(() => {
    setPage(1);
  }, [pageSize, jobStatusFilter, jobSearch]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const save = async () => {
    setSaving(true);
    try {
      const token = authAPI.getToken();
      const res = await fetch(`${getApiUrl()}/os-pos-venda-followup/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || res.statusText);
      toast({ title: 'Configuração salva' });
      await load();
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (s: string) => {
    const variant =
      s === 'erro'
        ? 'destructive'
        : s === 'enviado'
          ? 'default'
          : s === 'cancelado'
            ? 'outline'
            : 'secondary';
    return <Badge variant={variant as 'default' | 'secondary' | 'destructive' | 'outline'}>{s}</Badge>;
  };

  const aparelhoLabel = (j: JobRow) => {
    const parts = [j.marca_nome, j.modelo_nome].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'Aparelho não informado';
  };

  const toDateTimeLocal = (value: string | null) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const openEditDialog = (job: JobRow) => {
    setEditingJob(job);
    setEditPhone(job.telefone || job.telefone_contato || '');
    setEditScheduledAt(toDateTimeLocal(job.scheduled_at));
  };

  const saveJobEdit = async () => {
    if (!editingJob) return;
    setUpdatingJob(true);
    try {
      const token = authAPI.getToken();
      const res = await fetch(`${getApiUrl()}/os-pos-venda-followup/jobs/${editingJob.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          telefone: editPhone,
          scheduled_at: editScheduledAt ? new Date(editScheduledAt).toISOString() : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || res.statusText);
      toast({ title: 'Follow-up atualizado' });
      setEditingJob(null);
      await load();
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar', description: e?.message, variant: 'destructive' });
    } finally {
      setUpdatingJob(false);
    }
  };

  const deleteJob = async (jobId: string) => {
    setDeletingJobId(jobId);
    try {
      const token = authAPI.getToken();
      const res = await fetch(`${getApiUrl()}/os-pos-venda-followup/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || res.statusText);
      toast({ title: 'Registro removido' });
      await load();
    } catch (e: any) {
      toast({ title: 'Erro ao remover', description: e?.message, variant: 'destructive' });
    } finally {
      setDeletingJobId(null);
    }
  };

  return (
    <ModernLayout
      title="Pós-venda"
      subtitle="Mensagem automática de acompanhamento no WhatsApp após o faturamento da OS no PDV. Requer integração Ativa CRM configurada."
    >
      <div className="h-full flex flex-col min-h-0 w-full max-w-none min-w-0 p-4 md:p-6 pb-8 space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full min-w-0">
          <div className="xl:col-span-8 min-w-0 space-y-6">
            <Card className="border shadow-sm w-full min-w-0">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 shrink-0 text-primary" />
                  Mensagem e disparo
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed text-pretty max-w-none">
                  O envio não é imediato: aplica-se a regra de horário escolhida e um intervalo aleatório de até 30
                  minutos para distribuir os disparos. Uma mensagem por OS faturada.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 min-w-0">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border bg-muted/30 p-4">
                      <div className="space-y-1 min-w-0">
                        <Label htmlFor="ativo">Automação ativa</Label>
                        <p className="text-sm text-muted-foreground">
                          É necessário salvar pelo menos uma vez para gravar no banco e passar a agendar envios.
                        </p>
                      </div>
                      <Switch
                        id="ativo"
                        checked={settings.ativo}
                        onCheckedChange={(v) => setSettings((s) => ({ ...s, ativo: v }))}
                        className="shrink-0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Momento do disparo</Label>
                      <Select
                        value={settings.tipo_regra_envio}
                        onValueChange={(v: 'NEXT_DAY_10AM' | 'AFTER_24H') =>
                          setSettings((s) => ({ ...s, tipo_regra_envio: v }))
                        }
                      >
                        <SelectTrigger className="w-full min-w-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NEXT_DAY_10AM">
                            Dia seguinte às 10:00 ({settings.timezone})
                          </SelectItem>
                          <SelectItem value="AFTER_24H">24 horas após o faturamento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="template">Texto da mensagem</Label>
                      <Textarea
                        id="template"
                        rows={10}
                        value={settings.template_mensagem}
                        onChange={(e) => setSettings((s) => ({ ...s, template_mensagem: e.target.value }))}
                        className="font-mono text-sm min-h-[200px] w-full"
                        placeholder={DEFAULT_TEMPLATE}
                      />
                      <p className="text-xs text-muted-foreground">
                        Variáveis disponíveis: {VARS.join(' · ')}
                      </p>
                    </div>

                    <Button onClick={save} disabled={saving} size="lg" className="w-full sm:w-auto">
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar configuração
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="xl:col-span-4 min-w-0 space-y-6 xl:sticky xl:top-4 xl:self-start">
            <Card className="border shadow-sm bg-muted/20 w-full min-w-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Prévia</CardTitle>
                <CardDescription>Exemplo com dados fictícios</CardDescription>
              </CardHeader>
              <CardContent className="min-w-0">
                <pre className="text-sm whitespace-pre-wrap break-words font-sans leading-relaxed text-foreground border rounded-md p-4 bg-background max-h-[min(60vh,560px)] overflow-y-auto">
                  {preview}
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border shadow-sm w-full min-w-0">
          <CardHeader className="space-y-4">
            <div>
              <CardTitle className="text-base sm:text-lg">Histórico recente</CardTitle>
              <CardDescription>Agendamentos e envios desta empresa.</CardDescription>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center flex-1">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por OS, cliente, telefone ou aparelho..."
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={jobStatusFilter} onValueChange={setJobStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="agendado">Agendado</SelectItem>
                    <SelectItem value="enviado">Enviado</SelectItem>
                    <SelectItem value="erro">Erro</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Atualizar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto min-w-0 p-4 sm:p-6 pt-0">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="whitespace-nowrap">OS</TableHead>
                  <TableHead className="whitespace-nowrap">Cliente</TableHead>
                  <TableHead className="whitespace-nowrap">Aparelho</TableHead>
                  <TableHead className="whitespace-nowrap">Telefone</TableHead>
                  <TableHead className="whitespace-nowrap">Agendado</TableHead>
                  <TableHead className="whitespace-nowrap">Enviado</TableHead>
                  <TableHead className="min-w-[140px]">Obs.</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-muted-foreground text-center py-8">
                      Nenhum registro ainda.
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="align-middle">{statusBadge(j.status)}</TableCell>
                      <TableCell className="align-middle">
                        <div className="min-w-[110px]">
                          <div className="font-medium">OS #{j.numero_os ?? '—'}</div>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="min-w-[160px]">
                          <div className="font-medium">{j.cliente_nome || 'Cliente não informado'}</div>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="min-w-[160px]">
                          <div className="font-medium">{aparelhoLabel(j)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs align-middle whitespace-nowrap">
                        {j.telefone || j.telefone_contato || '—'}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap align-middle">
                        {j.scheduled_at ? new Date(j.scheduled_at).toLocaleString('pt-BR') : '—'}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap align-middle">
                        {j.sent_at ? new Date(j.sent_at).toLocaleString('pt-BR') : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground align-middle max-w-[280px]">
                        <span className="line-clamp-2">{j.error_message || j.skip_reason || '—'}</span>
                      </TableCell>
                      <TableCell className="align-middle text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(j)}
                            disabled={j.status === 'enviado'}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4 mr-1" />
                                Remover
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover follow-up</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Isso excluirá este registro do histórico/fila de pós-venda.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteJob(j.id)}
                                  disabled={deletingJobId === j.id}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deletingJobId === j.id ? 'Removendo...' : 'Remover'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground tabular-nums">
                {jobTotal === 0
                  ? '0 registros'
                  : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, jobTotal)} de ${jobTotal} registros`}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <div className="flex items-center gap-2 sm:mr-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Por página</span>
                  <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <span className="min-w-[72px] text-center text-sm font-medium tabular-nums">
                    {page}/{totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loading}
                    className="gap-1"
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!editingJob} onOpenChange={(open) => !open && setEditingJob(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar follow-up</DialogTitle>
              <DialogDescription>
                Ajuste o telefone e o horário agendado para este acompanhamento.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <div className="text-sm text-muted-foreground">{editingJob?.cliente_nome || 'Cliente não informado'}</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Telefone</Label>
                <Input
                  id="edit-phone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="5511999999999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-scheduled-at">Agendado para</Label>
                <Input
                  id="edit-scheduled-at"
                  type="datetime-local"
                  value={editScheduledAt}
                  onChange={(e) => setEditScheduledAt(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingJob(null)}>
                Cancelar
              </Button>
              <Button onClick={saveJobEdit} disabled={updatingJob}>
                {updatingJob && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModernLayout>
  );
}
