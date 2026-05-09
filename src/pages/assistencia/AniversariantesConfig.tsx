import { useEffect, useMemo, useState } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Cake, Ban, Edit, Loader2, RefreshCcw, Send } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_TEMPLATE = `🎉 *Feliz Aniversário!*

Olá {primeiro_nome}! 🎂

Hoje é um dia muito especial. Desejamos muita saúde, alegria e conquistas neste novo ciclo.

Parabéns!
{empresa}`;

const VARS = ['{nome}', '{primeiro_nome}', '{empresa}', '{data_aniversario}', '{horario_envio}', '{idade}'];

const renderWhatsAppFormattedText = (text: string) =>
  text.split(/(\*[^*\n]+\*)/g).map((part, index) => {
    if (/^\*[^*\n]+\*$/.test(part)) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold">
          {part.slice(1, -1)}
        </strong>
      );
    }
    return part;
  });

type BirthdayConfig = {
  mensagem: string;
  horario: string;
  ativo: boolean;
  timezone?: string;
  delayMinSeconds: number;
  delayMaxSeconds: number;
};

type BirthdayJob = {
  id: string;
  cliente_id: string;
  cliente_nome: string | null;
  cliente_whatsapp: string | null;
  cliente_telefone: string | null;
  cliente_telefone2: string | null;
  data_nascimento: string | null;
  telefone: string | null;
  status: 'pendente' | 'agendado' | 'enviado' | 'erro' | 'cancelado';
  scheduled_at: string;
  sent_at: string | null;
  error_message: string | null;
  skip_reason: string | null;
  mensagem_preview: string | null;
  source_date: string;
};

type BirthdayJobsResponse = {
  jobs: BirthdayJob[];
  summary: {
    total_jobs: number;
    pending_jobs: number;
    sent_jobs: number;
    error_jobs: number;
    cancelled_jobs: number;
  };
};

type BirthdayUpcomingClient = {
  id: string;
  nome: string | null;
  email: string | null;
  whatsapp: string | null;
  telefone: string | null;
  telefone2: string | null;
  data_nascimento: string | null;
  dia: number;
  mes: number;
  job_id: string | null;
  job_status: string | null;
  scheduled_at: string | null;
  source_date: string | null;
  mensagem_renderizada: string | null;
};

type BirthdayUpcomingResponse = {
  total: number;
  clientes: BirthdayUpcomingClient[];
  today: string;
};

const isoToLocalInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

export default function AniversariantesConfig() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<BirthdayConfig>({
    mensagem: DEFAULT_TEMPLATE,
    horario: '09:00',
    ativo: false,
    timezone: 'America/Sao_Paulo',
    delayMinSeconds: 40,
    delayMaxSeconds: 60,
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jobFilter, setJobFilter] = useState<'all' | 'agendado' | 'enviado' | 'erro' | 'cancelado'>('all');
  const [syncing, setSyncing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [editingClient, setEditingClient] = useState<BirthdayUpcomingClient | null>(null);
  const [editMessage, setEditMessage] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadSettings = async () => {
    setLoadingSettings(true);
    try {
      const { data, error } = await apiClient.get('/birthday-messages/settings');
      if (error) throw new Error(typeof error === 'string' ? error : 'Erro ao carregar configuração');
      setSettings({
        mensagem: data?.template_mensagem || DEFAULT_TEMPLATE,
        horario: data?.horario_envio || '09:00',
        ativo: !!data?.ativo,
        timezone: data?.timezone || 'America/Sao_Paulo',
        delayMinSeconds: Number(data?.delay_min_seconds ?? 40),
        delayMaxSeconds: Number(data?.delay_max_seconds ?? 60),
      });
    } catch (error: any) {
      toast({ title: 'Erro ao carregar', description: error?.message, variant: 'destructive' });
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const {
    data: jobsData,
    refetch: refetchJobs,
    isFetching: loadingJobs,
  } = useQuery({
    queryKey: ['birthday-message-jobs-page', jobFilter],
    queryFn: async () => {
      const query = new URLSearchParams({ limit: '100', status: jobFilter, period: 'month' });
      const { data, error } = await apiClient.get(`/birthday-messages/jobs?${query.toString()}`);
      if (error) throw new Error(typeof error === 'string' ? error : 'Erro ao carregar agendamentos');
      return (data || { jobs: [], summary: {} }) as BirthdayJobsResponse;
    },
  });

  const {
    data: upcomingData,
    refetch: refetchUpcoming,
    isFetching: loadingUpcoming,
  } = useQuery({
    queryKey: ['birthday-upcoming-page', 'month'],
    queryFn: async () => {
      const { data, error } = await apiClient.get('/birthday-messages/upcoming?period=month');
      if (error) throw new Error(typeof error === 'string' ? error : 'Erro ao carregar aniversariantes do mês');
      return (data || { total: 0, clientes: [], today: '' }) as BirthdayUpcomingResponse;
    },
  });

  const preview = useMemo(() => {
    const vars: Record<string, string> = {
      nome: 'Maria Silva',
      primeiro_nome: 'Maria',
      empresa: 'PrimeCamp',
      data_aniversario: '08/05',
      horario_envio: `${settings.horario} (${settings.timezone || 'America/Sao_Paulo'})`,
      idade: '32',
    };
    let message = settings.mensagem || '';
    Object.entries(vars).forEach(([key, value]) => {
      message = message.replace(new RegExp(`\\{${key}\\}`, 'gi'), value);
    });
    return message.trim();
  }, [settings]);

  const summary = jobsData?.summary || {
    total_jobs: 0,
    pending_jobs: 0,
    sent_jobs: 0,
    error_jobs: 0,
    cancelled_jobs: 0,
  };

  const filteredUpcomingClients = useMemo(() => {
    const clientes = upcomingData?.clientes || [];
    if (jobFilter === 'all') return clientes;
    return clientes.filter((client) => client.job_status === jobFilter);
  }, [jobFilter, upcomingData]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await apiClient.put('/birthday-messages/settings', {
        ativo: settings.ativo,
        horario_envio: settings.horario,
        timezone: settings.timezone || 'America/Sao_Paulo',
        template_mensagem: settings.mensagem,
        delay_min_seconds: settings.delayMinSeconds,
        delay_max_seconds: settings.delayMaxSeconds,
        sync_period: 'month',
      });
      if (error) throw new Error(typeof error === 'string' ? error : 'Erro ao salvar configuração');
      await Promise.all([refetchJobs(), refetchUpcoming()]);
      toast({ title: 'Configuração salva!' });
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const syncJobs = async () => {
    setSyncing(true);
    try {
      const { data, error } = await apiClient.post('/birthday-messages/sync', { period: 'month' });
      if (error) throw new Error(typeof error === 'string' ? error : 'Erro ao sincronizar');
      await Promise.all([refetchJobs(), refetchUpcoming()]);
      toast({
        title: 'Fila sincronizada',
        description: `${data?.clientes_encontrados ?? 0} encontrados no mês, ${data?.created ?? 0} criados.`,
      });
    } catch (error: any) {
      toast({ title: 'Erro ao sincronizar', description: error?.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const processJobs = async () => {
    setProcessing(true);
    try {
      const { data, error } = await apiClient.post('/birthday-messages/process', {});
      if (error) throw new Error(typeof error === 'string' ? error : 'Erro ao processar envios');
      await refetchJobs();
      toast({ title: 'Fila processada', description: `${data?.sent || 0} enviados, ${data?.errors || 0} com erro.` });
    } catch (error: any) {
      toast({ title: 'Erro ao processar', description: error?.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const openEdit = (client: BirthdayUpcomingClient) => {
    setEditingClient(client);
    setEditMessage(
      client.mensagem_renderizada?.trim()
        ? client.mensagem_renderizada
        : `🎉 *Feliz Aniversário, ${client.nome?.split(' ')[0] || 'Cliente'}!*\n\nDesejamos um dia maravilhoso, repleto de saúde, alegria e conquistas. Parabéns!`
    );
    setEditPhone(client.whatsapp || client.telefone || client.telefone2 || '');
    setEditScheduledAt(isoToLocalInput(client.scheduled_at));
  };

  const saveEdit = async () => {
    if (!editingClient) return;
    const message = editMessage.trim();
    if (!message) {
      toast({ title: 'Mensagem obrigatória', variant: 'destructive' });
      return;
    }

    let scheduledIso: string | undefined;
    if (editScheduledAt) {
      const parsed = new Date(editScheduledAt);
      if (Number.isNaN(parsed.getTime())) {
        toast({ title: 'Data/hora inválida', variant: 'destructive' });
        return;
      }
      scheduledIso = parsed.toISOString();
    }

    setSavingEdit(true);
    try {
      const payload: Record<string, any> = { mensagem: message };
      if (editPhone) payload.telefone = editPhone;
      if (scheduledIso) payload.scheduled_at = scheduledIso;

      const { error } = editingClient.job_id
        ? await apiClient.patch(`/birthday-messages/jobs/${editingClient.job_id}`, { ...payload, status: 'agendado' })
        : await apiClient.post('/birthday-messages/jobs', {
            ...payload,
            cliente_id: editingClient.id,
            source_date: editingClient.source_date,
          });

      if (error) throw new Error(typeof error === 'string' ? error : 'Erro ao salvar mensagem');
      await Promise.all([refetchJobs(), refetchUpcoming()]);
      setEditingClient(null);
      toast({ title: editingClient.job_id ? 'Mensagem atualizada!' : 'Mensagem agendada!' });
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error?.message, variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  };

  const cancelClientJob = async (client: BirthdayUpcomingClient) => {
    if (!client.job_id) return;
    if (!window.confirm(`Cancelar a mensagem de aniversário de ${client.nome || 'cliente'}?`)) return;

    setCancellingId(client.id);
    try {
      const { error } = await apiClient.patch(`/birthday-messages/jobs/${client.job_id}`, { status: 'cancelado' });
      if (error) throw new Error(typeof error === 'string' ? error : 'Erro ao cancelar mensagem');
      await Promise.all([refetchJobs(), refetchUpcoming()]);
      toast({ title: 'Mensagem cancelada!' });
    } catch (error: any) {
      toast({ title: 'Erro ao cancelar', description: error?.message, variant: 'destructive' });
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <ModernLayout
      title="Aniversariantes"
      subtitle="Automação de mensagens de aniversário via WhatsApp."
    >
      <div className="h-full min-h-0 space-y-4 p-3 md:p-4">
        <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="h-full rounded-2xl border shadow-sm">
            <CardHeader className="space-y-1 pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Cake className="h-5 w-5 text-pink-500" />
                Mensagem e automação
              </CardTitle>
              <CardDescription>
                Configure o envio automático e personalize o texto enviado aos aniversariantes do mês.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingSettings ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-3 rounded-2xl border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Label>Envio automático ativo</Label>
                      <p className="text-sm text-muted-foreground">
                        Quando ativado, o sistema cria a fila do mês e envia no dia e horário configurados.
                      </p>
                    </div>
                    <Switch
                      checked={settings.ativo}
                      onCheckedChange={(ativo) => setSettings((s) => ({ ...s, ativo }))}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-[180px_140px_140px_minmax(0,1fr)]">
                    <div className="space-y-2">
                      <Label>Horário de envio</Label>
                      <Input
                        type="time"
                        value={settings.horario}
                        onChange={(e) => setSettings((s) => ({ ...s, horario: e.target.value }))}
                        className="h-9 rounded-xl text-base md:text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Fuso: {settings.timezone || 'America/Sao_Paulo'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Delay mín.</Label>
                      <Input
                        type="number"
                        min={0}
                        value={settings.delayMinSeconds}
                        onChange={(e) => {
                          const delayMinSeconds = Math.max(0, Number(e.target.value) || 0);
                          setSettings((s) => ({
                            ...s,
                            delayMinSeconds,
                            delayMaxSeconds: Math.max(delayMinSeconds, s.delayMaxSeconds),
                          }));
                        }}
                        className="h-9 rounded-xl text-base md:text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Segundos</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Delay máx.</Label>
                      <Input
                        type="number"
                        min={settings.delayMinSeconds}
                        value={settings.delayMaxSeconds}
                        onChange={(e) => setSettings((s) => ({ ...s, delayMaxSeconds: Math.max(s.delayMinSeconds, Number(e.target.value) || 0) }))}
                        className="h-9 rounded-xl text-base md:text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Entre envios</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Variáveis disponíveis</Label>
                      <div className="flex flex-wrap gap-2">
                        {VARS.map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setSettings((s) => ({ ...s, mensagem: `${s.mensagem}${s.mensagem.endsWith(' ') || s.mensagem.endsWith('\n') ? '' : ' '}${v}` }))}
                            className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Mensagem de aniversário</Label>
                    <Textarea
                      value={settings.mensagem}
                      onChange={(e) => setSettings((s) => ({ ...s, mensagem: e.target.value }))}
                      rows={8}
                      className="min-h-[190px] rounded-2xl font-mono text-sm"
                      placeholder={DEFAULT_TEMPLATE}
                    />
                    <p className="text-xs text-muted-foreground">
                      O WhatsApp interpreta *texto* como negrito. As variáveis serão preenchidas automaticamente antes do envio.
                    </p>
                  </div>

                  <Button onClick={saveSettings} disabled={saving} className="h-9 w-full rounded-xl sm:w-auto">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar configuração
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <div className="h-full min-h-0 xl:sticky xl:top-4">
            <Card className="flex h-full min-h-[430px] flex-col rounded-2xl border bg-muted/20 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Prévia</CardTitle>
                <CardDescription>Como a mensagem aparece no WhatsApp.</CardDescription>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 items-center justify-center px-3 pb-4">
                <div className="relative aspect-[9/19] h-full max-h-[560px] min-h-[390px] rounded-[2.4rem] bg-slate-950 p-2 shadow-2xl ring-1 ring-slate-800">
                  <div className="absolute left-1/2 top-2.5 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-slate-800" />
                  <div className="flex h-full flex-col overflow-hidden rounded-[1.9rem] bg-[#efeae2]">
                    <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">MS</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">Maria Silva</p>
                        <p className="text-[11px] text-white/75">online</p>
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(135deg,rgba(255,255,255,0.35)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.35)_50%,rgba(255,255,255,0.35)_75%,transparent_75%,transparent)] bg-[length:28px_28px] px-3 py-4">
                      <div className="mb-3 text-center">
                        <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] text-slate-500 shadow-sm">Hoje</span>
                      </div>
                      <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-sm bg-[#dcf8c6] px-3 py-2 text-sm leading-relaxed text-slate-900 shadow-sm">
                        <p className="whitespace-pre-wrap break-words">
                          {renderWhatsAppFormattedText(preview || 'Digite a mensagem para ver a prévia.')}
                        </p>
                        <div className="mt-1 flex justify-end gap-1 text-[10px] text-slate-500">
                          <span>{settings.horario || '09:00'}</span>
                          <span className="text-[#34b7f1]">✓✓</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#f0f2f5] px-3 py-2">
                      <div className="truncate rounded-full bg-white px-4 py-2 text-xs text-muted-foreground">
                        Mensagem automática de aniversário
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="rounded-2xl border shadow-sm">
          <CardHeader className="space-y-3 pb-3">
            <div>
              <CardTitle className="text-base sm:text-lg">Fila de aniversários</CardTitle>
              <CardDescription>Agendamentos do mês a partir de hoje.</CardDescription>
            </div>
            <div className="grid gap-3 rounded-[28px] border bg-muted/20 p-3 xl:grid-cols-[180px_minmax(0,1fr)_auto] xl:items-stretch">
                <Select value={jobFilter} onValueChange={(value) => setJobFilter(value as typeof jobFilter)}>
                <SelectTrigger className="h-full min-h-12 w-full rounded-full bg-background px-4 shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="agendado">Agendados</SelectItem>
                    <SelectItem value="enviado">Enviados</SelectItem>
                    <SelectItem value="erro">Com erro</SelectItem>
                    <SelectItem value="cancelado">Cancelados</SelectItem>
                  </SelectContent>
                </Select>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="flex min-h-12 items-center justify-between gap-3 rounded-full border border-emerald-200 bg-emerald-50/50 px-4 py-2 shadow-sm">
                  <p className="text-xs text-muted-foreground">Agendadas</p>
                  <p className="text-lg font-semibold leading-none">{summary.pending_jobs}</p>
                </div>
                <div className="flex min-h-12 items-center justify-between gap-3 rounded-full border border-blue-200 bg-blue-50/50 px-4 py-2 shadow-sm">
                  <p className="text-xs text-muted-foreground">Enviadas</p>
                  <p className="text-lg font-semibold leading-none">{summary.sent_jobs}</p>
                </div>
                <div className="flex min-h-12 items-center justify-between gap-3 rounded-full border border-amber-200 bg-amber-50/50 px-4 py-2 shadow-sm">
                  <p className="text-xs text-muted-foreground">Com erro</p>
                  <p className="text-lg font-semibold leading-none">{summary.error_jobs}</p>
                </div>
                <div className="flex min-h-12 items-center justify-between gap-3 rounded-full border border-rose-200 bg-rose-50/50 px-4 py-2 shadow-sm">
                  <p className="text-xs text-muted-foreground">Canceladas</p>
                  <p className="text-lg font-semibold leading-none">{summary.cancelled_jobs}</p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:justify-end">
                <Button variant="outline" onClick={syncJobs} disabled={syncing} className="h-12 gap-2 rounded-full px-4 shadow-sm">
                  <RefreshCcw className="h-4 w-4" />
                  {syncing ? 'Sincronizando...' : 'Sincronizar'}
                </Button>
                <Button variant="outline" onClick={processJobs} disabled={processing} className="h-12 gap-2 rounded-full px-4 shadow-sm">
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
                    <img
                      src="/whatsapp-logo.png"
                      alt=""
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden');
                      }}
                    />
                    <span className="hidden" aria-hidden>
                      <Send className="h-4 w-4" />
                    </span>
                  </span>
                  {processing ? 'Processando...' : 'Processar fila'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="overflow-hidden rounded-2xl border">
              <div className="flex flex-col gap-2 border-b p-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium">Aniversariantes do mês</p>
                  <p className="text-xs text-muted-foreground">
                    Lista única com aniversário, status, horário agendado, mensagem e ações.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{loadingUpcoming ? '...' : upcomingData?.total ?? 0} cliente(s)</Badge>
                  <Button variant="ghost" size="sm" onClick={() => refetchUpcoming()} disabled={loadingUpcoming} className="rounded-xl">
                    <RefreshCcw className="mr-1 h-3.5 w-3.5" />
                    Atualizar
                  </Button>
                </div>
              </div>
              <div className="max-h-[520px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dia</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Agendado</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingUpcoming || loadingJobs ? (
                      <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Carregando aniversariantes...</TableCell></TableRow>
                    ) : filteredUpcomingClients.length ? (
                      filteredUpcomingClients.map((client) => {
                        const isSent = client.job_status === 'enviado';
                        const isCancelled = client.job_status === 'cancelado';
                        const cancelDisabled = !client.job_id || isSent || isCancelled || cancellingId === client.id;
                        return (
                          <TableRow key={client.id}>
                            <TableCell className="font-medium">{String(client.dia).padStart(2, '0')}/{String(client.mes).padStart(2, '0')}</TableCell>
                            <TableCell>
                              <p className="text-sm">{client.nome || 'Sem nome'}</p>
                              {client.email && <p className="text-xs text-muted-foreground">{client.email}</p>}
                            </TableCell>
                            <TableCell>{client.whatsapp || client.telefone || client.telefone2 || '-'}</TableCell>
                            <TableCell className="text-sm">
                              {client.scheduled_at ? new Date(client.scheduled_at).toLocaleString('pt-BR') : '-'}
                            </TableCell>
                            <TableCell>
                              {client.job_status ? (
                                <Badge variant={isSent ? 'default' : client.job_status === 'erro' ? 'destructive' : 'secondary'}>{client.job_status}</Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="max-w-[320px]">
                              <p className="line-clamp-3 text-xs text-muted-foreground">{client.mensagem_renderizada || '-'}</p>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openEdit(client)} disabled={isSent} title="Editar mensagem"><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="text-destructive disabled:opacity-40" onClick={() => cancelClientJob(client)} disabled={cancelDisabled} title="Cancelar mensagem"><Ban className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Nenhum aniversariante para o filtro selecionado.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!editingClient} onOpenChange={(open) => !open && setEditingClient(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Cake className="h-5 w-5 text-pink-500" />
                {editingClient?.job_id ? 'Editar mensagem de aniversário' : 'Agendar mensagem de aniversário'}
              </DialogTitle>
              <DialogDescription>
                Cliente: <span className="font-medium">{editingClient?.nome || 'Sem nome'}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="5511999999999" />
                </div>
                <div className="space-y-2">
                  <Label>Agendado para</Label>
                  <Input type="datetime-local" value={editScheduledAt} onChange={(e) => setEditScheduledAt(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea value={editMessage} onChange={(e) => setEditMessage(e.target.value)} rows={8} className="font-mono text-sm" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingClient(null)}>Cancelar</Button>
              <Button onClick={saveEdit} disabled={savingEdit}>
                {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModernLayout>
  );
}
