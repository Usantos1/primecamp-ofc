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
import { getApiUrl } from '@/utils/apiUrl';
import { authAPI } from '@/integrations/auth/api-client';
import { Loader2, MessageCircle } from 'lucide-react';
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
  telefone: string | null;
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
};

export default function FollowupPosVendaConfig() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    ativo: true,
    tipo_regra_envio: 'NEXT_DAY_10AM',
    timezone: 'America/Sao_Paulo',
    template_key: 'default',
    template_mensagem: DEFAULT_TEMPLATE,
  });
  const [jobs, setJobs] = useState<JobRow[]>([]);

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
      const [sRes, jRes] = await Promise.all([
        fetch(`${getApiUrl()}/os-pos-venda-followup/settings`, { headers }),
        fetch(`${getApiUrl()}/os-pos-venda-followup/jobs?limit=50`, { headers }),
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
      }
    } catch (e: any) {
      toast({ title: 'Erro ao carregar', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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

  return (
    <ModernLayout
      title="Pós-venda"
      subtitle="Mensagem automática de acompanhamento no WhatsApp após o faturamento da OS no PDV. Requer integração Ativa CRM configurada."
    >
      <div className="w-full max-w-[min(100%,1200px)] mx-auto px-2 sm:px-4 lg:px-6 space-y-6 pb-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <Card className="border shadow-sm">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 shrink-0 text-primary" />
                  Mensagem e disparo
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed max-w-prose">
                  O envio não é imediato: aplica-se a regra de horário escolhida e um intervalo aleatório de até 30
                  minutos para distribuir os disparos. Uma mensagem por OS faturada.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                        <SelectTrigger className="w-full max-w-xl">
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

          <div className="space-y-6 xl:sticky xl:top-4 xl:self-start">
            <Card className="border shadow-sm bg-muted/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Prévia</CardTitle>
                <CardDescription>Exemplo com dados fictícios</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground border rounded-md p-4 bg-background max-h-[min(50vh,420px)] overflow-y-auto">
                  {preview}
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border shadow-sm w-full">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Histórico recente</CardTitle>
            <CardDescription>Agendamentos e envios desta empresa.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto -mx-2 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="whitespace-nowrap">OS (id)</TableHead>
                  <TableHead className="whitespace-nowrap">Agendado</TableHead>
                  <TableHead className="whitespace-nowrap">Enviado</TableHead>
                  <TableHead className="min-w-[140px]">Obs.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground text-center py-8">
                      Nenhum registro ainda.
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="align-middle">{statusBadge(j.status)}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[140px] truncate align-middle">
                        {j.ordem_servico_id}
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
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ModernLayout>
  );
}
