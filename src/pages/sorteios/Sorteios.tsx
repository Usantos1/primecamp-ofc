import { useEffect, useMemo, useState } from 'react';
import { ModernLayout } from '@/components/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Trophy, Ticket, Users, DollarSign, Shuffle, Settings, ShieldCheck } from 'lucide-react';
import { from } from '@/integrations/db/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { executeManualRaffle, getOrCreateCurrentRaffle, replaceRaffleTemplateVariables } from '@/utils/raffleService';
import type { Raffle, RaffleAuditLog, RaffleCoupon, RafflePrizeTier, RaffleSettings } from '@/types/raffle';

const DEFAULT_COUPON_TEMPLATE =
  'Olá, {cliente}! 😊\n\nObrigado por comprar na {empresa}.\n\nVocê recebeu seus números da sorte:\n\n{numeros_da_sorte}\n\nO sorteio será realizado no dia {data_sorteio} às {horario_sorteio}.\n\nVocê pode acompanhar o resultado por aqui:\n\n{link_acompanhamento}\n\nBoa sorte!';

const DEFAULT_WINNER_TEMPLATE =
  'Parabéns, {cliente}! 🎉\n\nO seu número da sorte {numero_sorteado} ganhou o {posicao_premio} do sorteio {nome_sorteio} da {empresa}.\n\nPrêmio: {premio}.\nValidade: {validade_premio}.\nRetirada: {retirada_premio}.\n\nObrigado por comprar com a gente!';

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

const ensureWinnerPrizeVariables = (template?: string | null) => {
  let message = template || DEFAULT_WINNER_TEMPLATE;
  if (!message.includes('{premio}')) {
    message += '\n\nPrêmio: {premio}.';
  }
  if (!message.includes('{posicao_premio}')) {
    message = message.replace('foi o ganhador', 'ganhou o {posicao_premio}');
  }
  if (!message.includes('{validade_premio}')) {
    message += '\nValidade: {validade_premio}.';
  }
  if (!message.includes('{retirada_premio}')) {
    message += '\nRetirada: {retirada_premio}.';
  }
  return message;
};

const ensureCouponTrackingVariables = (template?: string | null) => {
  let message = template || DEFAULT_COUPON_TEMPLATE;
  if (!message.includes('{horario_sorteio}')) {
    message = message.replace('{data_sorteio}', '{data_sorteio} às {horario_sorteio}');
  }
  if (!message.includes('{link_acompanhamento}')) {
    message += '\n\nVocê pode acompanhar o resultado por aqui:\n\n{link_acompanhamento}';
  }
  return message;
};

const raffleStatusLabel: Record<string, string> = {
  open: 'Aberto',
  closed: 'Encerrado',
  drawn: 'Sorteado',
  cancelled: 'Cancelado',
};

const DEFAULT_PRIZE_TIERS: RafflePrizeTier[] = [
  { position: 1, type: 'voucher', description: 'Vale-compra', value: 100 },
  { position: 2, type: 'voucher', description: 'Vale-compra', value: 70 },
  { position: 3, type: 'voucher', description: 'Vale-compra', value: 30 },
];

const normalizePrizeTiers = (tiers?: RafflePrizeTier[] | null): RafflePrizeTier[] => {
  const source = Array.isArray(tiers) && tiers.length > 0 ? tiers : DEFAULT_PRIZE_TIERS;
  return DEFAULT_PRIZE_TIERS.map((defaultTier, index) => {
    const tier = source.find((item) => Number(item.position) === defaultTier.position) || source[index] || defaultTier;
    return {
      position: defaultTier.position,
      type: tier.type === 'product' ? 'product' : 'voucher',
      description: tier.description || (tier.type === 'product' ? 'Produto' : 'Vale-compra'),
      value: tier.type === 'product' ? Number(tier.value || 0) : Number(tier.value || defaultTier.value),
    };
  });
};

const emptySettings = (companyId?: string | null): Partial<RaffleSettings> => ({
  company_id: companyId || null,
  is_active: false,
  campaign_name: 'Sorteio Mensal Ativa FIX',
  amount_per_coupon: 10,
  initial_number: 100,
  draw_day_type: 'last_day_of_month',
  fixed_draw_day: null,
  draw_time: '20:00',
  auto_draw_enabled: false,
  send_coupon_message_enabled: true,
  send_winner_message_enabled: true,
  coupon_message_template: DEFAULT_COUPON_TEMPLATE,
  winner_message_template: DEFAULT_WINNER_TEMPLATE,
  prize_description: 'Vale-compra',
  prize_value: 100,
  prize_validity_days: 7,
  prize_redeem_instructions: 'Retirada presencial na loja mediante apresentação de documento e número da sorte vencedor.',
  prize_tiers: DEFAULT_PRIZE_TIERS,
  rounding_rule: 'complete_value',
});

export default function Sorteios() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const companyId = user?.company_id || null;
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [settings, setSettings] = useState<Partial<RaffleSettings>>(() => emptySettings(companyId));
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [coupons, setCoupons] = useState<RaffleCoupon[]>([]);
  const [auditLogs, setAuditLogs] = useState<RaffleAuditLog[]>([]);
  const [clientesMap, setClientesMap] = useState<Record<string, any>>({});
  const [companyName, setCompanyName] = useState('Empresa');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [previewType, setPreviewType] = useState<'coupon' | 'winner'>('winner');

  const currentRaffle = useMemo(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    return raffles.find((r) => r.reference_month === month && r.reference_year === year) || raffles[0];
  }, [raffles]);

  const validCoupons = useMemo(() => coupons.filter((c) => c.status === 'valid' || c.status === 'winner'), [coupons]);
  const participants = useMemo(() => {
    const ids = new Set(validCoupons.map((c) => c.customer_id).filter(Boolean));
    return Array.from(ids).map((id) => {
      const customerCoupons = validCoupons.filter((c) => c.customer_id === id);
      return {
        customer_id: id as string,
        cliente: clientesMap[id as string],
        total_coupons: customerCoupons.length,
        total_amount: customerCoupons.reduce((sum, c) => sum + Number(c.source_total_amount || 0), 0),
        numbers: customerCoupons.map((c) => c.coupon_number).join(', '),
      };
    });
  }, [clientesMap, validCoupons]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: settingsData } = await from('raffle_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle()
        .execute();

      if (companyId) {
        const { data: company } = await from('companies')
          .select('name')
          .eq('id', companyId)
          .maybeSingle()
          .execute();
        setCompanyName(company?.name || 'Empresa');
      }

      setSettings(settingsData
        ? {
            ...settingsData,
            coupon_message_template: ensureCouponTrackingVariables(settingsData.coupon_message_template),
            winner_message_template: ensureWinnerPrizeVariables(settingsData.winner_message_template),
            prize_description: settingsData.prize_description || 'Vale-compra',
            prize_value: Number(settingsData.prize_value || 100),
            prize_validity_days: Number(settingsData.prize_validity_days || 7),
            prize_redeem_instructions: settingsData.prize_redeem_instructions || 'Retirada presencial na loja mediante apresentação de documento e número da sorte vencedor.',
            prize_tiers: normalizePrizeTiers(settingsData.prize_tiers),
          }
        : emptySettings(companyId));

      const { data: rafflesData } = await from('raffles')
        .select('*')
        .order('reference_year', { ascending: false })
        .order('reference_month', { ascending: false })
        .limit(24)
        .execute();
      setRaffles((rafflesData || []) as Raffle[]);

      const raffleIds = (rafflesData || []).map((r: Raffle) => r.id);
      let couponsData: RaffleCoupon[] = [];
      if (raffleIds.length > 0) {
        const { data } = await from('raffle_coupons')
          .select('*')
          .in('raffle_id', raffleIds)
          .order('coupon_number', { ascending: false })
          .limit(500)
          .execute();
        couponsData = (data || []) as RaffleCoupon[];
        setCoupons(couponsData);
      } else {
        setCoupons([]);
      }

      const customerIds = Array.from(new Set(couponsData.map((c) => c.customer_id).filter(Boolean))) as string[];
      if (customerIds.length > 0) {
        const { data: clientes } = await from('clientes')
          .select('id, nome, telefone, whatsapp, cpf_cnpj, cep, email, data_nascimento')
          .in('id', customerIds)
          .execute();
        setClientesMap(Object.fromEntries((clientes || []).map((c: any) => [c.id, c])));
      } else {
        setClientesMap({});
      }

      const { data: logs } = await from('raffle_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
        .execute();
      setAuditLogs((logs || []) as RaffleAuditLog[]);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar sorteios', description: error?.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  const handleSaveSettings = async () => {
    if (!companyId) {
      toast({ title: 'Empresa não identificada', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const winnerMessageTemplate = ensureWinnerPrizeVariables(settings.winner_message_template);
      const couponMessageTemplate = ensureCouponTrackingVariables(settings.coupon_message_template);

      const payload = {
        company_id: companyId,
        is_active: !!settings.is_active,
        campaign_name: settings.campaign_name || 'Sorteio Mensal',
        amount_per_coupon: Number(settings.amount_per_coupon || 10),
        initial_number: Number(settings.initial_number || 100),
        draw_day_type: settings.draw_day_type || 'last_day_of_month',
        fixed_draw_day: settings.draw_day_type === 'fixed_day' ? Number(settings.fixed_draw_day || 1) : null,
        draw_time: settings.draw_time || '20:00',
        auto_draw_enabled: !!settings.auto_draw_enabled,
        send_coupon_message_enabled: !!settings.send_coupon_message_enabled,
        send_winner_message_enabled: !!settings.send_winner_message_enabled,
        coupon_message_template: couponMessageTemplate,
        winner_message_template: winnerMessageTemplate,
        prize_description: settings.prize_description || 'Vale-compra',
        prize_value: Number(normalizePrizeTiers(settings.prize_tiers)[0]?.value || settings.prize_value || 100),
        prize_validity_days: Number(settings.prize_validity_days || 7),
        prize_redeem_instructions: settings.prize_redeem_instructions || 'Retirada presencial na loja mediante apresentação de documento e número da sorte vencedor.',
        prize_tiers: normalizePrizeTiers(settings.prize_tiers),
        rounding_rule: 'complete_value',
        updated_at: new Date().toISOString(),
      };

      let savedSettings: RaffleSettings | null = null;

      if (settings.id) {
        const { error } = await from('raffle_settings').update(payload).eq('id', settings.id).execute();
        if (error) throw error;
        savedSettings = { ...(settings as RaffleSettings), ...payload, id: settings.id };
      } else {
        const { data, error } = await from('raffle_settings').insert(payload).select().single();
        if (error) throw error;
        savedSettings = data as RaffleSettings;
        setSettings(savedSettings);
      }

      await from('raffle_audit_logs').insert({
        company_id: companyId,
        user_id: user?.id || null,
        action: settings.id ? 'settings_updated' : 'settings_created',
        origin: 'user',
        new_data: payload,
      });

      if (savedSettings?.is_active) {
        await getOrCreateCurrentRaffle(savedSettings, companyId);
      }

      toast({ title: 'Configurações salvas' });
      await loadData();
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error?.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDraw = async (raffle: Raffle) => {
    const validCouponsCount = coupons.filter((coupon) => coupon.raffle_id === raffle.id && coupon.status === 'valid').length;
    if (validCouponsCount <= 0) {
      toast({
        title: 'Nenhum cupom válido',
        description: 'Este sorteio ainda não possui cupons válidos para sortear.',
        variant: 'destructive',
      });
      return;
    }

    const confirmed = window.confirm(`Executar o sorteio "${raffle.name}"? Essa ação não pode ser refeita sem auditoria.`);
    if (!confirmed) return;

    setIsDrawing(true);
    try {
      const result = await executeManualRaffle({
        raffleId: raffle.id,
        companyId,
        userId: user?.id,
      });
      toast({
        title: 'Sorteio realizado',
        description: `${result.winners?.length || 1} prêmio(s) sorteado(s).`,
      });
      await loadData();
    } catch (error: any) {
      toast({ title: 'Erro ao sortear', description: error?.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setIsDrawing(false);
    }
  };

  const handleCreateCurrentRaffle = async () => {
    if (!settings.id || !companyId) {
      toast({ title: 'Salve as configurações antes de criar o sorteio', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      await getOrCreateCurrentRaffle(settings as RaffleSettings, companyId);
      toast({ title: 'Sorteio do mês criado' });
      await loadData();
    } catch (error: any) {
      toast({ title: 'Erro ao criar sorteio', description: error?.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDrawCurrentRaffle = () => {
    if (!currentRaffle) {
      toast({ title: 'Crie o sorteio do mês antes de sortear', variant: 'destructive' });
      return;
    }
    handleDraw(currentRaffle);
  };

  const getCustomerName = (customerId?: string | null) => {
    if (!customerId) return '-';
    return clientesMap[customerId]?.nome || customerId;
  };

  const winnerPreview = useMemo(() => {
    const firstPrize = normalizePrizeTiers(settings.prize_tiers)[0] || DEFAULT_PRIZE_TIERS[0];
    const prizeValue = Number(firstPrize.value || 100);
    const validityDays = Number(settings.prize_validity_days ?? 7);
    const prizeText = firstPrize.type === 'product'
      ? (firstPrize.description || 'Produto')
      : `${firstPrize.description || settings.prize_description || 'Vale-compra'} de ${currencyFormatters.brl(prizeValue)}`;
    return replaceRaffleTemplateVariables(
      ensureWinnerPrizeVariables(settings.winner_message_template),
      {
        cliente: 'Maria Silva',
        numero_sorteado: 127,
        nome_sorteio: currentRaffle?.name || settings.campaign_name || 'Sorteio Mensal',
        empresa: companyName,
        telefone: '(99) 99999-9999',
        data_sorteio: dateFormatters.short(new Date().toISOString()),
        premio: prizeText,
        premio_tipo: firstPrize.type === 'product' ? 'Produto' : 'Vale-compra',
        premio_valor: firstPrize.type === 'product' ? '' : currencyFormatters.brl(prizeValue),
        posicao_premio: '1º prêmio',
        validade_premio: `${validityDays} dias`,
        retirada_premio: settings.prize_redeem_instructions || 'Retirada presencial na loja mediante apresentação de documento e número da sorte vencedor.',
        valor_total_compras: currencyFormatters.brl(100),
      },
    );
  }, [
    currentRaffle?.name,
    companyName,
    settings.campaign_name,
    settings.prize_description,
    settings.prize_redeem_instructions,
    settings.prize_tiers,
    settings.prize_validity_days,
    settings.winner_message_template,
  ]);

  const couponPreview = useMemo(() => {
    return replaceRaffleTemplateVariables(settings.coupon_message_template || DEFAULT_COUPON_TEMPLATE, {
      cliente: 'Maria Silva',
      telefone: '(99) 99999-9999',
      valor_total: currencyFormatters.brl(58),
      quantidade_cupons: 5,
      numeros_da_sorte: '100, 101, 102, 103, 104',
      data_sorteio: dateFormatters.short(currentRaffle?.draw_date || new Date().toISOString()),
      horario_sorteio: dateFormatters.time(currentRaffle?.draw_date || new Date().toISOString()),
      nome_sorteio: currentRaffle?.name || settings.campaign_name || 'Sorteio Mensal',
      empresa: companyName,
      numero_os: '1234',
      numero_venda: '5678',
      link_acompanhamento: `${typeof window !== 'undefined' ? window.location.origin : 'https://app.ativafix.com'}/sorteio/acompanhar/exemplo`,
    });
  }, [
    currentRaffle?.draw_date,
    currentRaffle?.name,
    companyName,
    settings.campaign_name,
    settings.coupon_message_template,
  ]);

  const activePreview = previewType === 'coupon' ? couponPreview : winnerPreview;

  const content = (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-600" />
            Sorteios
          </h1>
          <p className="text-sm text-muted-foreground">
            Sistema de sorteio mensal com números da sorte por venda ou OS faturada.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex flex-wrap justify-end gap-2">
            <Card className="rounded-full border shadow-sm">
              <CardContent className="flex min-h-9 items-center gap-2 px-3 py-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Sorteio atual</span>
                <span className="max-w-[220px] truncate text-xs font-semibold">{currentRaffle?.name || 'Ainda não criado'}</span>
                <Badge variant={currentRaffle?.status === 'drawn' ? 'default' : 'outline'} className="shrink-0 rounded-full px-2 py-0 text-[10px]">
                  {currentRaffle?.status ? raffleStatusLabel[currentRaffle.status] || currentRaffle.status : 'Sem sorteio'}
                </Badge>
              </CardContent>
            </Card>
            <Card className="rounded-full border shadow-sm">
              <CardContent className="flex min-h-9 items-center gap-2 px-3 py-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Cupons</span>
                <span className="text-xs font-bold">{validCoupons.length}</span>
              </CardContent>
            </Card>
            <Card className="rounded-full border shadow-sm">
              <CardContent className="flex min-h-9 items-center gap-2 px-3 py-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Participantes</span>
                <span className="text-xs font-bold">{participants.length}</span>
              </CardContent>
            </Card>
            <Card className="rounded-full border shadow-sm">
              <CardContent className="flex min-h-9 items-center gap-2 px-3 py-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Elegível</span>
                <span className="text-xs font-bold">{currencyFormatters.brl(currentRaffle?.eligible_sales_amount || 0)}</span>
              </CardContent>
            </Card>
          </div>
          {!currentRaffle && settings.id && (
            <Button onClick={handleCreateCurrentRaffle} disabled={isSaving}>
              Criar sorteio do mês
            </Button>
          )}
          <Button variant="outline" onClick={loadData} disabled={isLoading}>
            Atualizar
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex h-auto flex-wrap rounded-full border border-emerald-200 bg-gradient-to-r from-emerald-50 via-lime-50 to-amber-50 p-1 shadow-sm dark:border-emerald-900 dark:from-emerald-950/50 dark:via-lime-950/30 dark:to-amber-950/30">
          <TabsTrigger className="rounded-full px-3 py-1.5 text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow" value="visao-geral">Sorteios Mensais</TabsTrigger>
          <TabsTrigger className="rounded-full px-3 py-1.5 text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow" value="configuracoes">Configurações</TabsTrigger>
          <TabsTrigger className="rounded-full px-3 py-1.5 text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow" value="cupons">Cupons Gerados</TabsTrigger>
          <TabsTrigger className="rounded-full px-3 py-1.5 text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow" value="participantes">Clientes Participantes</TabsTrigger>
          <TabsTrigger className="rounded-full px-3 py-1.5 text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow" value="auditoria">Relatórios e Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="space-y-3">
          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Shuffle className="h-5 w-5" /> Sorteios Mensais</CardTitle>
                <CardDescription>Crie o sorteio do mês e execute o sorteio manual quando houver cupons válidos.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCreateCurrentRaffle}
                  disabled={isSaving || !settings.id}
                  className="rounded-full"
                >
                  Criar sorteio do mês
                </Button>
                <Button
                  type="button"
                  onClick={handleDrawCurrentRaffle}
                  disabled={isDrawing || !currentRaffle || currentRaffle.status === 'drawn' || currentRaffle.status === 'cancelled'}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700"
                >
                  Sortear na mão
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Cupons</TableHead>
                    <TableHead>Participantes</TableHead>
                    <TableHead>Data sorteio</TableHead>
                    <TableHead>Vencedor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {raffles.map((raffle) => {
                    const raffleWinners = coupons
                      .filter((c) => c.raffle_id === raffle.id && c.status === 'winner')
                      .sort((a, b) => Number(a.prize_position || 99) - Number(b.prize_position || 99));
                    return (
                      <TableRow key={raffle.id}>
                        <TableCell className="font-medium">{raffle.name}</TableCell>
                        <TableCell><Badge variant="outline">{raffle.status}</Badge></TableCell>
                        <TableCell>{String(raffle.reference_month).padStart(2, '0')}/{raffle.reference_year}</TableCell>
                        <TableCell>{raffle.total_coupons}</TableCell>
                        <TableCell>{raffle.total_participants}</TableCell>
                        <TableCell>{dateFormatters.short(raffle.draw_date)}</TableCell>
                        <TableCell>
                          {raffleWinners.length > 0
                            ? raffleWinners.map((winner) => `${winner.prize_position || 1}º #${winner.coupon_number} · ${winner.prize_type === 'product' ? (winner.prize_description || 'Produto') : currencyFormatters.brl(Number(winner.prize_value || 0))}`).join(' | ')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleDraw(raffle)}
                            disabled={isDrawing || raffle.status === 'drawn' || raffle.status === 'cancelled'}
                            className="rounded-full"
                          >
                            Sortear na mão
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {raffles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Nenhum sorteio mensal criado ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuracoes">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <Card className="xl:col-span-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Configurações do Sorteio</CardTitle>
              <CardDescription>Configuração por empresa. Venda/OS só gera cupom se estiver ativo e houver cliente com telefone válido.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Sistema de sorteio ativo</Label>
                  <p className="text-xs text-muted-foreground">Quando desativado, nenhuma venda gera cupom.</p>
                </div>
                <Switch checked={!!settings.is_active} onCheckedChange={(v) => setSettings((p) => ({ ...p, is_active: v }))} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Nome da campanha</Label>
                  <Input value={settings.campaign_name || ''} onChange={(e) => setSettings((p) => ({ ...p, campaign_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Valor base por cupom</Label>
                  <CurrencyInput
                    showCurrency
                    value={Number(settings.amount_per_coupon || 10)}
                    onChange={(value) => setSettings((p) => ({ ...p, amount_per_coupon: value || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Número inicial</Label>
                  <Input type="number" min="1" value={settings.initial_number || 100} onChange={(e) => setSettings((p) => ({ ...p, initial_number: Number(e.target.value) || 100 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Dia do sorteio</Label>
                  <Select value={settings.draw_day_type || 'last_day_of_month'} onValueChange={(v: 'last_day_of_month' | 'fixed_day') => setSettings((p) => ({ ...p, draw_day_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last_day_of_month">Último dia do mês</SelectItem>
                      <SelectItem value="fixed_day">Dia fixo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Horário</Label>
                  <Input type="time" value={settings.draw_time || '20:00'} onChange={(e) => setSettings((p) => ({ ...p, draw_time: e.target.value }))} />
                </div>
              </div>

              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <div>
                    <Label>Prêmio do sorteio</Label>
                    <p className="text-xs text-muted-foreground">
                      Esse texto fica salvo no sorteio mensal e entra na variável {'{premio}'} da mensagem do ganhador.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo dos prêmios</Label>
                    <Input
                      value={settings.prize_description || 'Vale-compra'}
                      onChange={(e) => {
                        const description = e.target.value;
                        setSettings((p) => ({
                          ...p,
                          prize_description: description,
                          prize_tiers: normalizePrizeTiers(p.prize_tiers).map((tier) => ({ ...tier, description })),
                        }));
                      }}
                      placeholder="Vale-compra"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Validade em dias</Label>
                    <Input
                      type="number"
                      min="0"
                      value={settings.prize_validity_days ?? 7}
                      onChange={(e) => setSettings((p) => ({ ...p, prize_validity_days: Number(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {normalizePrizeTiers(settings.prize_tiers).map((tier) => (
                    <div key={tier.position} className="space-y-2 rounded-2xl border bg-muted/20 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Label>{tier.position}º prêmio</Label>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={tier.type === 'product' ? 'text-muted-foreground' : 'font-medium'}>Vale</span>
                          <Switch
                            checked={tier.type === 'product'}
                            onCheckedChange={(checked) => setSettings((p) => ({
                              ...p,
                              prize_tiers: normalizePrizeTiers(p.prize_tiers).map((item) =>
                                item.position === tier.position
                                  ? {
                                      ...item,
                                      type: checked ? 'product' : 'voucher',
                                      description: checked ? 'Produto' : 'Vale-compra',
                                      value: checked ? 0 : (DEFAULT_PRIZE_TIERS[tier.position - 1]?.value || 0),
                                    }
                                  : item
                              ),
                            }))}
                          />
                          <span className={tier.type === 'product' ? 'font-medium' : 'text-muted-foreground'}>Produto</span>
                        </div>
                      </div>
                      {tier.type === 'product' ? (
                        <Input
                          value={tier.description}
                          onChange={(e) => setSettings((p) => ({
                            ...p,
                            prize_tiers: normalizePrizeTiers(p.prize_tiers).map((item) =>
                              item.position === tier.position ? { ...item, description: e.target.value, value: 0 } : item
                            ),
                          }))}
                          placeholder="Ex.: Carregador, fone, película..."
                        />
                      ) : (
                        <CurrencyInput
                          showCurrency
                          value={Number(tier.value || 0)}
                          onChange={(value) => setSettings((p) => {
                            const nextTiers = normalizePrizeTiers(p.prize_tiers).map((item) =>
                              item.position === tier.position ? { ...item, type: 'voucher', description: settings.prize_description || 'Vale-compra', value: value || 0 } : item
                            );
                            return {
                              ...p,
                              prize_value: nextTiers[0]?.value || 0,
                              prize_tiers: nextTiers,
                            };
                          })}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label>Como retirar o prêmio</Label>
                  <Textarea
                    rows={3}
                    value={settings.prize_redeem_instructions || 'Retirada presencial na loja mediante apresentação de documento e número da sorte vencedor.'}
                    onChange={(e) => setSettings((p) => ({ ...p, prize_redeem_instructions: e.target.value }))}
                    placeholder="Ex.: Retirada presencial na loja em até 7 dias, apresentando documento e o número da sorte vencedor."
                  />
                </div>
                <p className="text-sm font-medium">
                  Prévia: {normalizePrizeTiers(settings.prize_tiers).map((tier) => tier.type === 'product' ? `${tier.position}º ${tier.description}` : `${tier.position}º ${currencyFormatters.brl(tier.value)}`).join(' · ')}. Válidos por {Number(settings.prize_validity_days ?? 7)} dias. {settings.prize_redeem_instructions || 'Retirada presencial na loja mediante apresentação de documento e número da sorte vencedor.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 border rounded-lg p-3">
                  <Switch checked={!!settings.auto_draw_enabled} onCheckedChange={(v) => setSettings((p) => ({ ...p, auto_draw_enabled: v }))} />
                  <span className="text-sm">Sorteio automático</span>
                </label>
                <label className="flex items-center gap-2 border rounded-lg p-3">
                  <Switch checked={!!settings.send_coupon_message_enabled} onCheckedChange={(v) => setSettings((p) => ({ ...p, send_coupon_message_enabled: v }))} />
                  <span className="text-sm">WhatsApp ao gerar cupom</span>
                </label>
                <label className="flex items-center gap-2 border rounded-lg p-3">
                  <Switch checked={!!settings.send_winner_message_enabled} onCheckedChange={(v) => setSettings((p) => ({ ...p, send_winner_message_enabled: v }))} />
                  <span className="text-sm">WhatsApp ao ganhador</span>
                </label>
              </div>

              <div className="space-y-2">
                <Label>Modelo da mensagem de cupom</Label>
                <Textarea rows={6} value={settings.coupon_message_template || ''} onChange={(e) => setSettings((p) => ({ ...p, coupon_message_template: e.target.value }))} />
                <p className="text-xs text-muted-foreground">Variáveis: {'{cliente}'}, {'{valor_total}'}, {'{quantidade_cupons}'}, {'{numeros_da_sorte}'}, {'{data_sorteio}'}, {'{horario_sorteio}'}, {'{link_acompanhamento}'}, {'{nome_sorteio}'}, {'{empresa}'}, {'{numero_os}'}, {'{numero_venda}'}.</p>
              </div>

              <div className="space-y-2">
                <Label>Modelo da mensagem para ganhador</Label>
                <Textarea rows={5} value={settings.winner_message_template || ''} onChange={(e) => setSettings((p) => ({ ...p, winner_message_template: e.target.value }))} />
                <p className="text-xs text-muted-foreground">
                  Variáveis do ganhador: {'{cliente}'}, {'{numero_sorteado}'}, {'{nome_sorteio}'}, {'{empresa}'}, {'{posicao_premio}'}, {'{premio_tipo}'}, {'{premio}'}, {'{premio_valor}'}, {'{validade_premio}'}, {'{retirada_premio}'}.
                </p>
              </div>

              <Button onClick={handleSaveSettings} disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar configurações'}
              </Button>
            </CardContent>
          </Card>

          <div className="xl:sticky xl:top-20 xl:col-span-4 self-start">
            <Card className="flex h-[calc(100vh-9rem)] min-h-[560px] w-full min-w-0 overflow-hidden rounded-[1.5rem] border bg-white shadow-sm dark:bg-slate-950">
              <div className="flex min-h-0 w-full flex-col">
              <CardHeader className="space-y-1.5 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">Prévia no WhatsApp</CardTitle>
                  <div className="inline-flex shrink-0 rounded-full border bg-background p-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={previewType === 'coupon' ? 'default' : 'ghost'}
                      className="h-6 rounded-full px-2.5 text-[11px]"
                      onClick={() => setPreviewType('coupon')}
                    >
                      Cupom
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={previewType === 'winner' ? 'default' : 'ghost'}
                      className="h-6 rounded-full px-2.5 text-[11px]"
                      onClick={() => setPreviewType('winner')}
                    >
                      Ganhador
                    </Button>
                  </div>
                </div>
                <CardDescription className="text-xs">Como as mensagens automáticas serão enviadas.</CardDescription>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 items-center justify-center px-4 pb-4 pt-0">
                <div className="relative aspect-[9/19] h-full max-h-[calc(100vh-15rem)] min-h-[430px] rounded-[2rem] bg-slate-950 p-1.5 shadow-xl ring-1 ring-slate-800">
                  <div className="absolute left-1/2 top-2.5 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-slate-800" />
                  <div className="flex h-full flex-col overflow-hidden rounded-[1.6rem] bg-[#efeae2]">
                    <div className="flex items-center gap-2 bg-[#075e54] px-3 py-2.5 text-white">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-semibold">MS</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">Maria Silva</p>
                        <p className="text-[11px] text-white/75">online</p>
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-hidden bg-[linear-gradient(135deg,rgba(255,255,255,0.35)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.35)_50%,rgba(255,255,255,0.35)_75%,transparent_75%,transparent)] bg-[length:28px_28px] px-2.5 py-3">
                      <div className="mb-2 text-center">
                        <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-[10px] text-slate-500 shadow-sm">Hoje</span>
                      </div>
                      <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-sm bg-[#dcf8c6] px-2.5 py-2 text-[11px] leading-snug text-slate-900 shadow-sm">
                        <p className="whitespace-pre-wrap break-words line-clamp-[14]">
                          {renderWhatsAppFormattedText(activePreview || 'Configure a mensagem para ver a prévia.')}
                        </p>
                        <div className="mt-1 flex justify-end gap-1 text-[10px] text-slate-500">
                          <span>20:00</span>
                          <span className="text-[#34b7f1]">✓✓</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#f0f2f5] px-2.5 py-1.5">
                      <div className="truncate rounded-full bg-white px-3 py-1.5 text-[11px] text-slate-500">
                        {previewType === 'coupon' ? 'Mensagem automática de cupom' : 'Mensagem automática do ganhador'}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              </div>
            </Card>
          </div>
          </div>
        </TabsContent>

        <TabsContent value="cupons">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Ticket className="h-5 w-5" /> Cupons Gerados</CardTitle>
              <CardDescription>Cupons cancelados permanecem no histórico e não participam do sorteio.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => {
                    const cliente = coupon.customer_id ? clientesMap[coupon.customer_id] : null;
                    return (
                      <TableRow key={coupon.id}>
                        <TableCell className="font-bold">#{coupon.coupon_number}</TableCell>
                        <TableCell>{cliente?.nome || '-'}</TableCell>
                        <TableCell>{cliente?.whatsapp || cliente?.telefone || '-'}</TableCell>
                        <TableCell>{coupon.order_type === 'service_order' ? 'Ordem de Serviço' : 'Venda'}</TableCell>
                        <TableCell>{currencyFormatters.brl(coupon.source_total_amount)}</TableCell>
                        <TableCell>{dateFormatters.short(coupon.generated_at)}</TableCell>
                        <TableCell><Badge variant={coupon.status === 'winner' ? 'default' : 'outline'}>{coupon.status}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                  {coupons.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum cupom gerado.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participantes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Clientes Participantes</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Total elegível</TableHead>
                    <TableHead>Cupons</TableHead>
                    <TableHead>Números</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((participant) => (
                    <TableRow key={participant.customer_id}>
                      <TableCell>{participant.cliente?.nome || participant.customer_id}</TableCell>
                      <TableCell>{participant.cliente?.whatsapp || participant.cliente?.telefone || '-'}</TableCell>
                      <TableCell>{participant.cliente?.cpf_cnpj || '-'}</TableCell>
                      <TableCell>{currencyFormatters.brl(participant.total_amount)}</TableCell>
                      <TableCell>{participant.total_coupons}</TableCell>
                      <TableCell className="max-w-[280px] truncate">{participant.numbers}</TableCell>
                    </TableRow>
                  ))}
                  {participants.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum participante.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auditoria">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Cupons cancelados</p><p className="text-2xl font-bold">{coupons.filter((c) => c.status === 'cancelled').length}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Cupons por venda</p><p className="text-2xl font-bold">{coupons.filter((c) => c.order_type === 'sale').length}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Cupons por OS</p><p className="text-2xl font-bold">{coupons.filter((c) => c.order_type === 'service_order').length}</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Auditoria</CardTitle>
              <CardDescription>Eventos críticos ficam registrados para rastreabilidade.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Referência</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{dateFormatters.short(log.created_at)}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.origin}</TableCell>
                      <TableCell>{log.sale_id || log.service_order_id || log.coupon_id || log.raffle_id || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {auditLogs.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum log registrado.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  return <ModernLayout title="Sorteios" subtitle="Sistema de Sorteio Mensal">{content}</ModernLayout>;
}
