import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, CheckCircle2, Loader2, LockKeyhole, Search, ShieldCheck, Sparkles, Ticket, Trophy, UserRound } from 'lucide-react';
import { getApiUrl } from '@/utils/apiUrl';

type PublicRaffle = {
  id: string;
  name: string;
  draw_date: string;
  draw_time?: string | null;
  display_draw_time?: string | null;
  draw_executed_at?: string | null;
  status: string;
  total_coupons?: number | null;
  company_name: string;
};

type Participation = {
  raffle_id: string;
  raffle_name: string;
  draw_date: string;
  draw_time?: string | null;
  display_draw_time?: string | null;
  draw_executed_at?: string | null;
  status: string;
  company_name: string;
  tracking_token?: string | null;
  coupon_numbers: number[];
  total_coupons: number;
};

type SearchResult = {
  participant: {
    name: string;
    phone_masked?: string | null;
  } | null;
  participations: Participation[];
};

const statusLabels: Record<string, string> = {
  open: 'Aguardando sorteio',
  closed: 'Encerrado',
  drawn: 'Sorteado',
  cancelled: 'Sorteio cancelado',
};

const onlyDigits = (value: string) => value.replace(/\D+/g, '');

const formatCpf = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
};

const formatPhone = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/^(\(\d{2}\) \d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/^(\(\d{2}\) \d{5})(\d)/, '$1-$2');
};

const statusClassNames: Record<string, string> = {
  open: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  closed: 'border-slate-200 bg-slate-50 text-slate-700',
  drawn: 'border-amber-200 bg-amber-50 text-amber-700',
  cancelled: 'border-red-200 bg-red-50 text-red-700',
};

const getSaoPauloDateParts = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  return {
    year: parts.find((part) => part.type === 'year')?.value || '',
    month: parts.find((part) => part.type === 'month')?.value || '',
    day: parts.find((part) => part.type === 'day')?.value || '',
  };
};

const normalizeDrawTime = (value?: string | null) => {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
};

const formatDrawDate = (drawDate?: string | null) => {
  const dateParts = getSaoPauloDateParts(drawDate);
  if (!dateParts?.year || !dateParts.month || !dateParts.day) return '-';
  return `${dateParts.day}/${dateParts.month}/${dateParts.year}`;
};

const formatDrawTime = (drawDate?: string | null, drawTime?: string | null, displayDrawTime?: string | null) => {
  const time = normalizeDrawTime(displayDrawTime) || normalizeDrawTime(drawTime);
  if (time) return time;
  if (!drawDate) return '-';
  const date = new Date(drawDate);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
};

export default function ConsultaSorteio() {
  const [raffles, setRaffles] = useState<PublicRaffle[]>([]);
  const [loadingRaffles, setLoadingRaffles] = useState(true);
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);

  const displayRaffles = useMemo(() => {
    const byId = new Map<string, PublicRaffle>();
    raffles.forEach((raffle) => byId.set(raffle.id, raffle));
    (result?.participations || []).forEach((participation) => {
      if (byId.has(participation.raffle_id)) return;
      byId.set(participation.raffle_id, {
        id: participation.raffle_id,
        name: participation.raffle_name,
        draw_date: participation.draw_date,
        draw_time: participation.draw_time,
        display_draw_time: participation.display_draw_time,
        draw_executed_at: participation.draw_executed_at,
        status: participation.status,
        total_coupons: participation.total_coupons,
        company_name: participation.company_name,
      });
    });
    return Array.from(byId.values());
  }, [raffles, result?.participations]);

  useEffect(() => {
    const loadRaffles = async () => {
      try {
        setLoadingRaffles(true);
        const res = await fetch(`${getApiUrl()}/public/sorteios`);
        const json = await res.json().catch(() => ({}));
        if (res.ok) setRaffles(json.data || []);
      } finally {
        setLoadingRaffles(false);
      }
    };
    loadRaffles();
  }, []);

  const handleSearch = async () => {
    setError(null);
    setResult(null);

    if (name.trim().length < 2) {
      setError('Informe pelo menos o primeiro nome cadastrado.');
      return;
    }
    if (onlyDigits(cpf).length < 11 && onlyDigits(phone).length < 4) {
      setError('Informe CPF ou celular junto com o primeiro nome.');
      return;
    }

    try {
      setSearching(true);
      const res = await fetch(`${getApiUrl()}/public/sorteio/consultar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf, phone, name }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Não foi possível consultar sua participação.');
        return;
      }
      setResult(json.data || { participant: null, participations: [] });
    } catch (err: any) {
      setError(err?.message || 'Erro ao consultar sorteio.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="h-screen max-h-[100dvh] overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_top_left,#bbf7d0,transparent_30%),radial-gradient(circle_at_bottom_right,#fed7aa,transparent_26%),linear-gradient(135deg,#f0fdf4_0%,#ffffff_48%,#fff7ed_100%)] px-3 py-5 [-webkit-overflow-scrolling:touch] sm:px-5 sm:py-8">
      <div className="mx-auto w-full max-w-7xl space-y-6 pb-10">
        <section className="relative overflow-hidden rounded-[2.25rem] border border-emerald-200 bg-gradient-to-br from-emerald-800 via-emerald-500 to-lime-400 p-5 text-white shadow-2xl shadow-emerald-900/15 sm:p-8">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/2 h-72 w-72 rounded-full bg-lime-200/20 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="w-fit rounded-full bg-white/15 px-3 py-1 text-white hover:bg-white/15">
                  Consulta pública
                </Badge>
                <Badge className="w-fit rounded-full bg-white/15 px-3 py-1 text-white hover:bg-white/15">
                  Sem login
                </Badge>
              </div>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                  Encontre seus números da sorte em poucos segundos
                </h1>
                <p className="max-w-2xl text-base font-medium leading-relaxed text-white/90 sm:text-lg">
                  Consulte com segurança usando primeiro nome + CPF ou primeiro nome + celular. Depois acompanhe o resultado do sorteio em tempo real.
                </p>
              </div>
              <div className="grid max-w-3xl gap-3 sm:grid-cols-3">
                <div className="rounded-3xl bg-white/15 p-4 backdrop-blur">
                  <ShieldCheck className="mb-2 h-5 w-5" />
                  <p className="text-sm font-bold">Dados protegidos</p>
                  <p className="mt-1 text-xs text-white/80">Mostramos apenas suas participações.</p>
                </div>
                <div className="rounded-3xl bg-white/15 p-4 backdrop-blur">
                  <Ticket className="mb-2 h-5 w-5" />
                  <p className="text-sm font-bold">Números reunidos</p>
                  <p className="mt-1 text-xs text-white/80">Todos os seus cupons em um só lugar.</p>
                </div>
                <div className="rounded-3xl bg-white/15 p-4 backdrop-blur">
                  <Sparkles className="mb-2 h-5 w-5" />
                  <p className="text-sm font-bold">Resultado fácil</p>
                  <p className="mt-1 text-xs text-white/80">Acompanhe o sorteio pelo link público.</p>
                </div>
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/25 bg-white/15 p-5 shadow-xl backdrop-blur">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-white/20">
                <Trophy className="h-8 w-8" />
              </div>
              <p className="text-sm font-semibold uppercase tracking-wide text-white/80">Como consultar</p>
              <div className="mt-4 space-y-3">
                <div className="flex gap-3 rounded-2xl bg-white/15 p-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="text-sm font-medium">Digite seu primeiro nome.</p>
                </div>
                <div className="flex gap-3 rounded-2xl bg-white/15 p-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="text-sm font-medium">Confirme com CPF ou celular.</p>
                </div>
                <div className="flex gap-3 rounded-2xl bg-white/15 p-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="text-sm font-medium">Abra o acompanhamento do sorteio.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_460px]">
          <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white/95 shadow-2xl shadow-slate-900/8">
            <CardHeader className="border-b bg-white p-6">
              <CardTitle className="flex items-center gap-3 text-2xl font-black text-slate-950">
                <span className="flex h-12 w-12 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-700">
                  <Search className="h-6 w-6" />
                </span>
                <span>
                  Buscar meus números
                  <span className="mt-1 block text-sm font-medium text-slate-500">Use primeiro nome + CPF ou primeiro nome + celular.</span>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-black text-emerald-800">
                  <LockKeyhole className="h-4 w-4" />
                  Primeiro nome obrigatório
                </div>
                <Label className="text-xs font-bold uppercase tracking-wide text-emerald-900/70">Primeiro nome</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Elizangela"
                  className="mt-2 h-12 rounded-full border-emerald-200 bg-white px-5 text-base font-semibold"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
                <div className="rounded-3xl border bg-white p-4 shadow-sm">
                  <Badge variant="outline" className="mb-3 rounded-full">Opção 1</Badge>
                  <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">CPF</Label>
                  <Input
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    className="mt-2 h-12 rounded-full px-5 text-base"
                  />
                </div>
                <div className="hidden items-center justify-center sm:flex">
                  <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-500">OU</span>
                </div>
                <div className="rounded-3xl border bg-white p-4 shadow-sm">
                  <Badge variant="outline" className="mb-3 rounded-full">Opção 2</Badge>
                  <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Celular</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    className="mt-2 h-12 rounded-full px-5 text-base"
                  />
                </div>
              </div>
              {error && (
                <div className="rounded-3xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}
              <Button className="h-14 w-full rounded-full bg-emerald-600 py-6 text-base font-black shadow-lg shadow-emerald-900/10 hover:bg-emerald-700" onClick={handleSearch} disabled={searching}>
                {searching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Consultar participação
              </Button>

              {result && (
                <div className="space-y-4 border-t pt-6">
                  {result.participant ? (
                    <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                      <p className="flex items-center gap-2 font-black text-slate-950">
                        <UserRound className="h-4 w-4 text-emerald-600" />
                        {result.participant.name}
                      </p>
                      {result.participant.phone_masked && <p className="mt-1 text-sm text-slate-500">Telefone: {result.participant.phone_masked}</p>}
                    </div>
                  ) : (
                    <p className="rounded-3xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                      Nenhuma participação encontrada com os dados informados.
                    </p>
                  )}

                  {result.participations.map((participation) => (
                    <div key={`${participation.raffle_id}-${participation.tracking_token}`} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-lg font-black text-slate-950">{participation.raffle_name}</p>
                          <p className="text-sm text-slate-500">
                            {formatDrawDate(participation.draw_date)} às {formatDrawTime(participation.draw_date, participation.draw_time, participation.display_draw_time)}
                          </p>
                        </div>
                        <Badge variant="outline" className={`w-fit rounded-full ${statusClassNames[participation.status] || ''}`}>{statusLabels[participation.status] || participation.status}</Badge>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {participation.coupon_numbers.map((number) => (
                          <Badge key={number} className="rounded-full bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-600">
                            {number}
                          </Badge>
                        ))}
                      </div>
                      {participation.tracking_token && (
                        <Button asChild variant="outline" className="mt-4 h-11 w-full rounded-full border-2 font-black">
                          <Link to={`/sorteio/acompanhar/${participation.tracking_token}`}>Acompanhar resultado</Link>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white/95 shadow-2xl shadow-slate-900/8">
            <CardHeader className="border-b bg-white p-6">
              <CardTitle className="flex items-center gap-3 text-2xl font-black text-slate-950">
                <span className="flex h-12 w-12 items-center justify-center rounded-3xl bg-amber-50 text-amber-600">
                  <Ticket className="h-6 w-6" />
                </span>
                <span>
                  Sorteios disponíveis
                  <span className="mt-1 block text-sm font-medium text-slate-500">Campanhas públicas em andamento e histórico.</span>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              {loadingRaffles ? (
                <div className="flex items-center justify-center rounded-3xl bg-slate-50 py-12 text-slate-500">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Carregando sorteios...
                </div>
              ) : displayRaffles.length === 0 ? (
                <div className="rounded-3xl border border-dashed bg-slate-50 p-6 text-center">
                  <Ticket className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                  <p className="font-black text-slate-700">Nenhum sorteio disponível</p>
                  <p className="mt-1 text-sm text-slate-500">Quando uma campanha for publicada, ela aparecerá aqui.</p>
                </div>
              ) : (
                displayRaffles.map((raffle) => (
                  <div key={raffle.id} className="rounded-3xl border bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
                    <p className="text-lg font-black text-slate-950">{raffle.name}</p>
                    <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                      <Calendar className="h-4 w-4" />
                      {formatDrawDate(raffle.draw_date)} às {formatDrawTime(raffle.draw_date, raffle.draw_time, raffle.display_draw_time)}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <Badge variant="outline" className={`rounded-full ${statusClassNames[raffle.status] || ''}`}>{statusLabels[raffle.status] || raffle.status}</Badge>
                      <span className="text-xs font-semibold text-slate-500">{raffle.total_coupons || 0} cupons</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
