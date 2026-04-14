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
  solicitar_avaliacao_google: boolean;
  texto_avaliacao_google: string;
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
    solicitar_avaliacao_google: true,
    texto_avaliacao_google: 'Se puder, sua avaliação no Google ajuda muito nossa empresa.',
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
    if (settings.solicitar_avaliacao_google && settings.texto_avaliacao_google) {
      msg = `${msg.trim()}\n\n${settings.texto_avaliacao_google.trim()}`;
    }
    return msg;
  }, [settings]);

  const load = async () => {
    setLoading(true);
    try {
      const token = authAPI.getToken();
      const headers: HeadersInit = { Authorization: `Bearer ${token}` };
      const [sRes, jRes] = await Promise.all([
        fetch(`${getApiUrl()}/os-pos-venda-followup/settings`, { headers }),
        fetch(`${getApiUrl()}/os-pos-venda-followup/jobs?limit=40`, { headers }),
      ]);
      if (sRes.ok) {
        const data = await sRes.json();
        setSettings({
          ativo: !!data.ativo,
          tipo_regra_envio: data.tipo_regra_envio || 'NEXT_DAY_10AM',
          timezone: data.timezone || 'America/Sao_Paulo',
          template_key: data.template_key || 'default',
          template_mensagem: data.template_mensagem || DEFAULT_TEMPLATE,
          solicitar_avaliacao_google: data.solicitar_avaliacao_google !== false,
          texto_avaliacao_google:
            data.texto_avaliacao_google ||
            'Se puder, sua avaliação no Google ajuda muito nossa empresa.',
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
      title="Follow-up pós-venda (WhatsApp)"
      subtitle="Mensagem automática após faturar a OS pelo PDV. Requer token Ativa CRM em Integrações."
    >
      <div className="space-y-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Configuração
            </CardTitle>
            <CardDescription>
              O envio não é imediato: usa a regra escolhida mais um intervalo aleatório de até 30 minutos
              para distribuir os disparos. Uma mensagem por OS faturada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="ativo">Follow-up automático</Label>
                    <p className="text-sm text-muted-foreground">
                      Só agenda após você salvar esta tela pelo menos uma vez no banco.
                    </p>
                  </div>
                  <Switch
                    id="ativo"
                    checked={settings.ativo}
                    onCheckedChange={(v) => setSettings((s) => ({ ...s, ativo: v }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Regra de envio</Label>
                  <Select
                    value={settings.tipo_regra_envio}
                    onValueChange={(v: 'NEXT_DAY_10AM' | 'AFTER_24H') =>
                      setSettings((s) => ({ ...s, tipo_regra_envio: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEXT_DAY_10AM">
                        Dia seguinte às 10:00 (fuso {settings.timezone})
                      </SelectItem>
                      <SelectItem value="AFTER_24H">24 horas após o faturamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Mensagem (template)</Label>
                  <Textarea
                    rows={8}
                    value={settings.template_mensagem}
                    onChange={(e) => setSettings((s) => ({ ...s, template_mensagem: e.target.value }))}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Variáveis: {VARS.join(', ')}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label>Incluir pedido de avaliação no Google</Label>
                    <p className="text-sm text-muted-foreground">Texto adicionado ao final da mensagem.</p>
                  </div>
                  <Switch
                    checked={settings.solicitar_avaliacao_google}
                    onCheckedChange={(v) =>
                      setSettings((s) => ({ ...s, solicitar_avaliacao_google: v }))
                    }
                  />
                </div>

                {settings.solicitar_avaliacao_google && (
                  <div className="space-y-2">
                    <Label>Texto da avaliação Google</Label>
                    <Textarea
                      rows={2}
                      value={settings.texto_avaliacao_google}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, texto_avaliacao_google: e.target.value }))
                      }
                    />
                  </div>
                )}

                <Card className="bg-muted/40">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Prévia</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm whitespace-pre-wrap font-sans">{preview}</pre>
                  </CardContent>
                </Card>

                <Button onClick={save} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico recente</CardTitle>
            <CardDescription>Últimos agendamentos e envios da empresa.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>OS (id)</TableHead>
                  <TableHead>Agendado</TableHead>
                  <TableHead>Enviado</TableHead>
                  <TableHead>Obs.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground text-center">
                      Nenhum registro ainda.
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell>{statusBadge(j.status)}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[120px] truncate">
                        {j.ordem_servico_id}
                      </TableCell>
                      <TableCell className="text-xs">
                        {j.scheduled_at ? new Date(j.scheduled_at).toLocaleString('pt-BR') : '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {j.sent_at ? new Date(j.sent_at).toLocaleString('pt-BR') : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {j.error_message || j.skip_reason || '—'}
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
