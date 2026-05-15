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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <Card className="overflow-hidden rounded-3xl border-emerald-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-lime-500 text-white">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Trophy className="h-6 w-6" />
                  {data.raffle.name}
                </CardTitle>
                <p className="mt-1 text-sm text-white/85">{data.raffle.company_name}</p>
              </div>
              <Badge className="w-fit rounded-full bg-white px-4 py-2 text-emerald-700 hover:bg-white">
                {statusLabels[data.raffle.status] || data.raffle.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="mt-1 font-bold">{data.participant.name}</p>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-xs text-muted-foreground">Sorteio marcado para</p>
              <p className="mt-1 font-bold">{dateFormatters.short(data.raffle.draw_date)} às {dateFormatters.time(data.raffle.draw_date)}</p>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="mt-1 font-bold">{statusLabels[data.raffle.status] || data.raffle.status}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-emerald-600" />
                Seus números da sorte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Olá, {data.participant.name}! Seus números já estão participando do nosso sorteio mensal.
              </p>
              <div className="flex flex-wrap gap-2">
                {data.coupons.map((coupon) => (
                  <Badge key={coupon.coupon_number} variant={coupon.status === 'winner' ? 'default' : 'outline'} className="rounded-full px-4 py-2 text-sm">
                    {coupon.coupon_number}
                  </Badge>
                ))}
              </div>
              {!isDrawn && !isCancelled && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold text-emerald-800">
                    <Clock className="h-4 w-4" />
                    Contador regressivo
                  </div>
                  <p className="text-sm text-emerald-900">{getCountdown(data.raffle.draw_date, now)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-amber-600" />
                Resultado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isCancelled ? (
                <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">Este sorteio foi cancelado.</p>
              ) : !isDrawn ? (
                <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Resultado ainda não disponível.</p>
              ) : (
                <>
                  {data.winners.map((winner) => (
                    <div key={`${winner.prize_position}-${winner.coupon_number}`} className={`rounded-2xl border p-4 ${winner.is_current_participant ? 'border-emerald-300 bg-emerald-50' : 'bg-white'}`}>
                      <p className="text-xs font-medium text-muted-foreground">{winner.prize_position || 1}º prêmio</p>
                      <p className="mt-1 font-bold">Número {winner.coupon_number}</p>
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
                    <div className="rounded-2xl bg-emerald-600 p-4 text-white">
                      <p className="font-bold">Parabéns, {data.participant.name}! 🎉</p>
                      <p className="mt-1 text-sm">O seu número {currentWinner.coupon_number} foi um dos ganhadores. Nossa equipe vai entrar em contato pelo WhatsApp.</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                      Dessa vez não foi, mas obrigado por participar. Continue comprando para receber novos números da sorte nos próximos sorteios.
                    </div>
                  )}
                </>
              )}
              <Button variant="outline" className="w-full rounded-full" onClick={loadData}>
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
