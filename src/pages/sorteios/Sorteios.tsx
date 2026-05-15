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
import { executeManualRaffle, getOrCreateCurrentRaffle } from '@/utils/raffleService';
import type { Raffle, RaffleAuditLog, RaffleCoupon, RaffleSettings } from '@/types/raffle';

const DEFAULT_COUPON_TEMPLATE =
  'Olá, {cliente}! 😊\n\nObrigado por comprar na {empresa}.\n\nVocê recebeu seus números da sorte para o sorteio {nome_sorteio}:\n\n{numeros_da_sorte}\n\nO sorteio será realizado no dia {data_sorteio}.\n\nBoa sorte!';

const DEFAULT_WINNER_TEMPLATE =
  'Parabéns, {cliente}! 🎉\n\nO seu número da sorte {numero_sorteado} foi o ganhador do sorteio {nome_sorteio} da {empresa}.\n\nPrêmio: {premio}.\nValidade: {validade_premio}.\nRetirada: {retirada_premio}.\n\nObrigado por comprar com a gente!';

const ensureWinnerPrizeVariables = (template?: string | null) => {
  let message = template || DEFAULT_WINNER_TEMPLATE;
  if (!message.includes('{premio}')) {
    message += '\n\nPrêmio: {premio}.';
  }
  if (!message.includes('{validade_premio}')) {
    message += '\nValidade: {validade_premio}.';
  }
  if (!message.includes('{retirada_premio}')) {
    message += '\nRetirada: {retirada_premio}.';
  }
  return message;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

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
      setSettings(settingsData
        ? {
            ...settingsData,
            winner_message_template: ensureWinnerPrizeVariables(settingsData.winner_message_template),
            prize_description: settingsData.prize_description || 'Vale-compra',
            prize_value: Number(settingsData.prize_value || 100),
            prize_validity_days: Number(settingsData.prize_validity_days || 7),
            prize_redeem_instructions: settingsData.prize_redeem_instructions || 'Retirada presencial na loja mediante apresentação de documento e número da sorte vencedor.',
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
        coupon_message_template: settings.coupon_message_template || DEFAULT_COUPON_TEMPLATE,
        winner_message_template: winnerMessageTemplate,
        prize_description: settings.prize_description || 'Vale-compra',
        prize_value: Number(settings.prize_value || 100),
        prize_validity_days: Number(settings.prize_validity_days || 7),
        prize_redeem_instructions: settings.prize_redeem_instructions || 'Retirada presencial na loja mediante apresentação de documento e número da sorte vencedor.',
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
        description: `Número vencedor: ${result.winner.coupon_number}`,
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

  const getCustomerName = (customerId?: string | null) => {
    if (!customerId) return '-';
    return clientesMap[customerId]?.nome || customerId;
  };

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
        <div className="flex gap-2">
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Sorteio atual</p>
            <p className="font-semibold truncate">{currentRaffle?.name || 'Ainda não criado'}</p>
            <Badge variant={currentRaffle?.status === 'drawn' ? 'default' : 'outline'} className="mt-2">
              {currentRaffle?.status || 'sem sorteio'}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Cupons válidos</p>
            <p className="text-2xl font-bold">{validCoupons.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Participantes</p>
            <p className="text-2xl font-bold">{participants.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Valor elegível</p>
            <p className="text-2xl font-bold">{currencyFormatters.brl(currentRaffle?.eligible_sales_amount || 0)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="visao-geral">Sorteios Mensais</TabsTrigger>
          <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
          <TabsTrigger value="cupons">Cupons Gerados</TabsTrigger>
          <TabsTrigger value="participantes">Clientes Participantes</TabsTrigger>
          <TabsTrigger value="auditoria">Relatórios e Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shuffle className="h-5 w-5" /> Sorteios Mensais</CardTitle>
              <CardDescription>Criação mensal acontece automaticamente quando o primeiro cupom do mês é gerado.</CardDescription>
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
                    const winner = coupons.find((c) => c.id === raffle.winning_coupon_id);
                    return (
                      <TableRow key={raffle.id}>
                        <TableCell className="font-medium">{raffle.name}</TableCell>
                        <TableCell><Badge variant="outline">{raffle.status}</Badge></TableCell>
                        <TableCell>{String(raffle.reference_month).padStart(2, '0')}/{raffle.reference_year}</TableCell>
                        <TableCell>{raffle.total_coupons}</TableCell>
                        <TableCell>{raffle.total_participants}</TableCell>
                        <TableCell>{dateFormatters.short(raffle.draw_date)}</TableCell>
                        <TableCell>{winner ? `#${winner.coupon_number} · ${getCustomerName(winner.customer_id)}` : '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleDraw(raffle)}
                            disabled={isDrawing || raffle.status === 'drawn' || raffle.status === 'cancelled'}
                          >
                            Sortear
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
          <Card>
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
                    <Label>Tipo do prêmio</Label>
                    <Input
                      value={settings.prize_description || 'Vale-compra'}
                      onChange={(e) => setSettings((p) => ({ ...p, prize_description: e.target.value }))}
                      placeholder="Vale-compra"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor do vale-compra</Label>
                    <CurrencyInput
                      showCurrency
                      value={Number(settings.prize_value ?? 100)}
                      onChange={(value) => setSettings((p) => ({ ...p, prize_value: value || 0 }))}
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
                  Prévia: {(settings.prize_description || 'Vale-compra')} de {currencyFormatters.brl(Number(settings.prize_value ?? 100))} válido por {Number(settings.prize_validity_days ?? 7)} dias. {settings.prize_redeem_instructions || 'Retirada presencial na loja mediante apresentação de documento e número da sorte vencedor.'}
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
                <p className="text-xs text-muted-foreground">Variáveis: {'{cliente}'}, {'{valor_total}'}, {'{quantidade_cupons}'}, {'{numeros_da_sorte}'}, {'{data_sorteio}'}, {'{nome_sorteio}'}, {'{empresa}'}, {'{numero_os}'}, {'{numero_venda}'}.</p>
              </div>

              <div className="space-y-2">
                <Label>Modelo da mensagem para ganhador</Label>
                <Textarea rows={5} value={settings.winner_message_template || ''} onChange={(e) => setSettings((p) => ({ ...p, winner_message_template: e.target.value }))} />
                <p className="text-xs text-muted-foreground">
                  Variáveis do ganhador: {'{cliente}'}, {'{numero_sorteado}'}, {'{nome_sorteio}'}, {'{empresa}'}, {'{premio}'}, {'{premio_valor}'}, {'{validade_premio}'}, {'{retirada_premio}'}.
                </p>
              </div>

              <Button onClick={handleSaveSettings} disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar configurações'}
              </Button>
            </CardContent>
          </Card>
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
