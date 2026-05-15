import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Gift, Loader2, RefreshCw, Ticket, Trophy, XCircle } from 'lucide-react';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { getApiUrl } from '@/utils/apiUrl';

type PublicRaffleData = {
  raffle: {
    id: string;
    name: string;
    draw_date: string;
    draw_executed_at?: string | null;
    status: 'open' | 'closed' | 'drawn' | 'cancelled' | string;
    company_name: string;
  };
  participant: {
    id: string;
    name: string;
    phone_masked?: string | null;
  };
  coupons: Array<{
    coupon_number: number;
    status: string;
    prize_position?: number | null;
    prize_type?: string | null;
    prize_description?: string | null;
    prize_value?: number | null;
  }>;
  winners: Array<{
    coupon_number: number;
    customer_name: string;
    phone_masked?: string | null;
    prize_position?: number | null;
    prize_type?: string | null;
    prize_description?: string | null;
    prize_value?: number | null;
    is_current_participant?: boolean;
  }>;
};

const statusLabels: Record<string, string> = {
  open: 'Aguardando sorteio',
  closed: 'Encerrado',
  drawn: 'Sorteado',
  cancelled: 'Sorteio cancelado',
};

const formatPrize = (winner: PublicRaffleData['winners'][number]) => {
  if (!winner.prize_description && !winner.prize_value) return null;
  if (winner.prize_type === 'product') return winner.prize_description || 'Produto';
  return `${winner.prize_description || 'Vale-compra'} de ${currencyFormatters.brl(Number(winner.prize_value || 0))}`;
};

const getCountdown = (target?: string | null, nowMs = Date.now()) => {
  if (!target) return 'Data do sorteio indisponível';
  const diff = new Date(target).getTime() - nowMs;
  if (diff <= 0) return 'O sorteio já pode ser realizado.';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `Faltam ${days} dias, ${hours} horas, ${minutes} minutos e ${seconds} segundos para o sorteio.`;
};

const getCountdownParts = (target?: string | null, nowMs = Date.now()) => {
  if (!target) return null;
  const diff = new Date(target).getTime() - nowMs;
  if (diff <= 0) return null;
  return [
    { label: 'dias', value: Math.floor(diff / 86400000) },
    { label: 'horas', value: Math.floor((diff % 86400000) / 3600000) },
    { label: 'min', value: Math.floor((diff % 3600000) / 60000) },
    { label: 'seg', value: Math.floor((diff % 60000) / 1000) },
  ];
};

export default function AcompanharSorteio() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicRaffleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const loadData = async (silent = false) => {
    if (!token) {
      setError('Link de acompanhamento inválido.');
      setLoading(false);
      return;
    }

    try {
      if (!silent) setLoading(true);
      setError(null);
      const res = await fetch(`${getApiUrl()}/public/sorteio/${token}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Acompanhamento não encontrado.');
        setData(null);
        return;
      }
      setData(json.data as PublicRaffleData);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar acompanhamento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!data || data.raffle.status === 'drawn' || data.raffle.status === 'cancelled') return undefined;
    const timer = window.setInterval(() => loadData(true), 30000);
    return () => window.clearInterval(timer);
  }, [data?.raffle.status, token]);

  const isDrawn = data?.raffle.status === 'drawn';
  const isCancelled = data?.raffle.status === 'cancelled';
  const currentWinner = useMemo(() => data?.winners.find((winner) => winner.is_current_participant), [data?.winners]);
  const countdownParts = getCountdownParts(data?.raffle.draw_date, now);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-4">
        <Card className="w-full max-w-md rounded-3xl">
          <CardContent className="p-10 text-center">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-emerald-600" />
            <p className="text-muted-foreground">Carregando acompanhamento do sorteio...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-4">
        <Card className="w-full max-w-md rounded-3xl border-red-200">
          <CardContent className="p-10 text-center">
            <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h1 className="mb-2 text-xl font-bold">Acompanhamento não encontrado</h1>
            <p className="text-sm text-muted-foreground">{error || 'Verifique se o link recebido está correto.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#d1fae5,transparent_34%),linear-gradient(135deg,#f0fdf4_0%,#ffffff_48%,#fff7ed_100%)] px-3 py-5 sm:px-5 sm:py-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Card className="overflow-hidden rounded-[2rem] border-emerald-200 shadow-2xl shadow-emerald-900/10">
          <CardHeader className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-500 to-lime-400 p-6 text-white sm:p-8">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
            <div className="absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-lime-200/20 blur-3xl" />
            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="space-y-3">
                <Badge className="w-fit rounded-full bg-white/15 px-3 py-1 text-white hover:bg-white/15">
                  Acompanhamento público
                </Badge>
                <div>
                  <CardTitle className="flex items-center gap-3 text-3xl font-black leading-tight sm:text-4xl">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                      <Trophy className="h-7 w-7" />
                    </span>
                    {data.raffle.name}
                  </CardTitle>
                  <p className="mt-2 text-base font-medium text-white/90">{data.raffle.company_name}</p>
                </div>
              </div>
              <Badge className="w-fit rounded-full bg-white px-5 py-3 text-sm font-bold text-emerald-700 shadow-lg hover:bg-white">
                {statusLabels[data.raffle.status] || data.raffle.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 bg-white/90 p-4 sm:grid-cols-3 sm:p-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Cliente</p>
              <p className="mt-2 text-lg font-black text-slate-950">{data.participant.name}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sorteio marcado para</p>
              <p className="mt-2 text-lg font-black text-slate-950">{dateFormatters.short(data.raffle.draw_date)} às {dateFormatters.time(data.raffle.draw_date)}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
              <p className="mt-2 text-lg font-black text-slate-950">{statusLabels[data.raffle.status] || data.raffle.status}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_430px]">
          <Card className="rounded-[2rem] border-slate-200 bg-white/95 shadow-xl shadow-slate-900/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-2xl font-black">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Ticket className="h-6 w-6" />
                </span>
                Seus números da sorte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6 pt-2">
              <div className="rounded-3xl bg-slate-50 p-5 text-slate-700">
                <p className="text-base leading-relaxed">
                  Olá, <strong className="text-slate-950">{data.participant.name}</strong>! Seus números já estão participando do nosso sorteio mensal.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:flex sm:flex-wrap">
                {data.coupons.map((coupon) => (
                  <div
                    key={coupon.coupon_number}
                    className={`flex min-h-20 items-center justify-center rounded-3xl border-2 px-5 text-2xl font-black shadow-sm ${
                      coupon.status === 'winner'
                        ? 'border-emerald-500 bg-emerald-600 text-white'
                        : 'border-emerald-100 bg-emerald-50 text-emerald-950'
                    }`}
                  >
                    {coupon.coupon_number}
                  </div>
                ))}
              </div>
              {!isDrawn && !isCancelled && (
                <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-lime-50 p-5">
                  <div className="mb-4 flex items-center gap-2 font-black text-emerald-900">
                    <Clock className="h-5 w-5" />
                    Contador regressivo
                  </div>
                  {countdownParts ? (
                    <div className="grid grid-cols-4 gap-2">
                      {countdownParts.map((part) => (
                        <div key={part.label} className="rounded-2xl bg-white p-3 text-center shadow-sm">
                          <p className="text-2xl font-black text-emerald-700">{String(part.value).padStart(2, '0')}</p>
                          <p className="text-[11px] font-semibold uppercase text-slate-500">{part.label}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-emerald-900">{getCountdown(data.raffle.draw_date, now)}</p>
                  )}
                  <p className="mt-4 text-sm font-medium text-emerald-900">{getCountdown(data.raffle.draw_date, now)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-slate-200 bg-white/95 shadow-xl shadow-slate-900/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-2xl font-black">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <Calendar className="h-6 w-6" />
                </span>
                Resultado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6 pt-2">
              {isCancelled ? (
                <p className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-semibold text-red-700">Este sorteio foi cancelado.</p>
              ) : !isDrawn ? (
                <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5">
                  <p className="font-black text-amber-900">Resultado ainda não disponível.</p>
                  <p className="mt-2 text-sm text-amber-800">Quando o sorteio for realizado, esta página será atualizada automaticamente.</p>
                </div>
              ) : (
                <>
                  {data.winners.map((winner) => (
                    <div key={`${winner.prize_position}-${winner.coupon_number}`} className={`rounded-3xl border p-5 ${winner.is_current_participant ? 'border-emerald-300 bg-emerald-50' : 'bg-white'}`}>
                      <p className="text-xs font-medium text-muted-foreground">{winner.prize_position || 1}º prêmio</p>
                      <p className="mt-1 text-xl font-black">Número {winner.coupon_number}</p>
                      <p className="text-sm">Ganhador: {winner.customer_name}</p>
                      {winner.phone_masked && <p className="text-sm">Telefone: {winner.phone_masked}</p>}
                      {formatPrize(winner) && (
                        <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-emerald-700">
                          <Gift className="h-4 w-4" />
                          {formatPrize(winner)}
                        </p>
                      )}
                    </div>
                  ))}
                  {currentWinner ? (
                    <div className="rounded-3xl bg-emerald-600 p-5 text-white">
                      <p className="font-bold">Parabéns, {data.participant.name}! 🎉</p>
                      <p className="mt-1 text-sm">O seu número {currentWinner.coupon_number} foi um dos ganhadores. Nossa equipe vai entrar em contato pelo WhatsApp.</p>
                    </div>
                  ) : (
                    <div className="rounded-3xl bg-slate-50 p-5 text-sm text-slate-700">
                      Dessa vez não foi, mas obrigado por participar. Continue comprando para receber novos números da sorte nos próximos sorteios.
                    </div>
                  )}
                </>
              )}
              <Button variant="outline" className="h-12 w-full rounded-full border-2 font-bold" onClick={loadData}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar resultado
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
