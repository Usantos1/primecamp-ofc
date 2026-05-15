import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { Copy, ExternalLink, Plus, Trash2, Trophy, Ticket, Users, DollarSign, Shuffle, Settings, ShieldCheck } from 'lucide-react';
import { from } from '@/integrations/db/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { currencyFormatters, dateFormatters } from '@/utils/formatters';
import { cancelRaffleCouponManually, cancelRaffleManually, executeManualRaffle, getOrCreateCurrentRaffle, replaceRaffleTemplateVariables } from '@/utils/raffleService';
import { useValuesVisibility } from '@/hooks/useValuesVisibility';
import { MASKED_VALUE } from '@/components/dashboard/FinancialCards';
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

const validTabs = new Set(['visao-geral', 'configuracoes', 'cupons', 'participantes', 'auditoria']);

const DEFAULT_PRIZE_TIERS: RafflePrizeTier[] = [
  { position: 1, type: 'voucher', description: 'Vale-compra', value: 100 },
  { position: 2, type: 'voucher', description: 'Vale-compra', value: 70 },
  { position: 3, type: 'voucher', description: 'Vale-compra', value: 30 },
];

const normalizePrizeTiers = (tiers?: RafflePrizeTier[] | null): RafflePrizeTier[] => {
  const source = Array.isArray(tiers) && tiers.length > 0 ? tiers : DEFAULT_PRIZE_TIERS;
  return source
    .slice(0, 3)
    .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
    .map((tier, index) => {
      const defaultTier = DEFAULT_PRIZE_TIERS[index] || DEFAULT_PRIZE_TIERS[0];
      const type = tier.type === 'product' ? 'product' : 'voucher';
      return {
        position: index + 1,
        type,
        description: tier.description || (type === 'product' ? 'Produto' : 'Vale-compra'),
        value: type === 'product' ? 0 : Number(tier.value || defaultTier.value || 0),
      };
    })
    .filter((tier, index) => index === 0 || tier.type === 'product' || tier.value > 0);
};

const maskPhone = (value?: string | null) => {
  const digits = String(value || '').replace(/\D+/g, '');
  if (!digits) return '-';
  return `****-${digits.slice(-4)}`;
};

const sumUniqueSourceAmounts = (coupons: RaffleCoupon[]) => {
  const seen = new Set<string>();
  return coupons.reduce((sum, coupon) => {
    const sourceKey =
      coupon.sale_id ? `sale:${coupon.sale_id}` :
      coupon.service_order_id ? `os:${coupon.service_order_id}` :
      `coupon:${coupon.id}`;
    if (seen.has(sourceKey)) return sum;
    seen.add(sourceKey);
    return sum + Number(coupon.source_total_amount || 0);
  }, 0);
};

const createTrackingToken = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
};

const toBoolean = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return ['true', '1', 'sim', 'yes'].includes(value.trim().toLowerCase());
  return Boolean(value);
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
  seller_prize_enabled: false,
  seller_prize_value: 50,
  seller_prize_requires_no_absence: true,
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
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [valuesVisible] = useValuesVisibility();
  const companyId = user?.company_id || null;
  const [activeTab, setActiveTab] = useState(() => (tab && validTabs.has(tab) ? tab : 'visao-geral'));
  const [settings, setSettings] = useState<Partial<RaffleSettings>>(() => emptySettings(companyId));
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [coupons, setCoupons] = useState<RaffleCoupon[]>([]);
  const [auditLogs, setAuditLogs] = useState<RaffleAuditLog[]>([]);
  const [clientesMap, setClientesMap] = useState<Record<string, any>>({});
  const [vendedoresMap, setVendedoresMap] = useState<Record<string, string>>({});
  const [couponSearch, setCouponSearch] = useState('');
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

  useEffect(() => {
    const nextTab = tab && validTabs.has(tab) ? tab : 'visao-geral';
    setActiveTab(nextTab);
  }, [tab]);

  const validCoupons = useMemo(() => coupons.filter((c) => c.status === 'valid' || c.status === 'winner'), [coupons]);
  const eligibleAmountByRaffle = useMemo(() => {
    return Object.fromEntries(
      Array.from(new Set(validCoupons.map((coupon) => coupon.raffle_id))).map((raffleId) => [
        raffleId,
        sumUniqueSourceAmounts(validCoupons.filter((coupon) => coupon.raffle_id === raffleId)),
      ]),
    ) as Record<string, number>;
  }, [validCoupons]);
  const participants = useMemo(() => {
    const ids = new Set(validCoupons.map((c) => c.customer_id).filter(Boolean));
    return Array.from(ids).map((id) => {
      const customerCoupons = validCoupons.filter((c) => c.customer_id === id);
      return {
        customer_id: id as string,
        cliente: clientesMap[id as string],
        total_coupons: customerCoupons.length,
        total_amount: sumUniqueSourceAmounts(customerCoupons),
        numbers: customerCoupons.map((c) => c.coupon_number).join(', '),
      };
    });
  }, [clientesMap, validCoupons]);

  const filteredCoupons = useMemo(() => {
    const term = couponSearch.trim().toLowerCase();
    if (!term) return coupons;
    const digits = term.replace(/\D+/g, '');
    return coupons.filter((coupon) => {
      const cliente = coupon.customer_id ? clientesMap[coupon.customer_id] : null;
      const vendedor = coupon.generated_by_user_id ? vendedoresMap[coupon.generated_by_user_id] : '';
      return (
        String(coupon.coupon_number).includes(digits || term) ||
        String(cliente?.nome || '').toLowerCase().includes(term) ||
        String(vendedor || '').toLowerCase().includes(term) ||
        String(coupon.tracking_token || '').toLowerCase().includes(term)
      );
    });
  }, [clientesMap, couponSearch, coupons, vendedoresMap]);

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
            seller_prize_enabled: toBoolean(settingsData.seller_prize_enabled),
            seller_prize_value: Number(settingsData.seller_prize_value || 50),
            seller_prize_requires_no_absence: toBoolean(settingsData.seller_prize_requires_no_absence, true),
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
        couponsData = await ensureMissingTrackingTokens(couponsData);
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

      const sellerIds = Array.from(new Set(couponsData.map((c) => c.generated_by_user_id).filter(Boolean))) as string[];
      const saleIds = Array.from(new Set(couponsData.map((c) => c.sale_id).filter(Boolean))) as string[];
      let salesMap: Record<string, { vendedor_id?: string | null; vendedor_nome?: string | null }> = {};
      if (saleIds.length > 0) {
        const { data: sales } = await from('sales')
          .select('id, vendedor_id, vendedor_nome')
          .in('id', saleIds)
          .execute();
        salesMap = Object.fromEntries((sales || []).map((sale: any) => [sale.id, sale]));
        (sales || []).forEach((sale: any) => {
          if (sale.vendedor_id) sellerIds.push(sale.vendedor_id);
        });
      }
      const uniqueSellerIds = Array.from(new Set(sellerIds));
      if (uniqueSellerIds.length > 0 || Object.keys(salesMap).length > 0) {
        const [profilesResult, usersResult] = uniqueSellerIds.length > 0
          ? await Promise.all([
              from('profiles')
                .select('user_id, display_name, full_name')
                .in('user_id', uniqueSellerIds)
                .execute(),
              from('users')
                .select('id, display_name, email')
                .in('id', uniqueSellerIds)
                .execute(),
            ])
          : [{ data: [] }, { data: [] }];
        const nextMap: Record<string, string> = {};
        Object.values(salesMap).forEach((sale: any) => {
          if (sale.vendedor_id && sale.vendedor_nome) nextMap[sale.vendedor_id] = sale.vendedor_nome;
        });
        (usersResult.data || []).forEach((seller: any) => {
          nextMap[seller.id] = nextMap[seller.id] || seller.display_name || seller.email || 'Vendedor';
        });
        (profilesResult.data || []).forEach((seller: any) => {
          nextMap[seller.user_id] = seller.display_name || seller.full_name || nextMap[seller.user_id] || 'Vendedor';
        });
        couponsData = couponsData.map((coupon) => {
          if (coupon.generated_by_user_id || !coupon.sale_id) return coupon;
          const sale = salesMap[coupon.sale_id];
          return sale?.vendedor_id ? { ...coupon, generated_by_user_id: sale.vendedor_id } : coupon;
        });
        setCoupons(couponsData);
        setVendedoresMap(nextMap);
      } else {
        setVendedoresMap({});
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

  const ensureMissingTrackingTokens = async (rows: RaffleCoupon[]) => {
    if (!companyId) return rows;
    const groups = new Map<string, { raffleId: string; customerId: string; token: string }>();

    rows.forEach((coupon) => {
      if (!coupon.customer_id || !coupon.raffle_id) return;
      const key = `${coupon.raffle_id}:${coupon.customer_id}`;
      const existingGroup = groups.get(key);
      if (existingGroup) {
        if (coupon.tracking_token) existingGroup.token = coupon.tracking_token;
        return;
      }
      groups.set(key, {
        raffleId: coupon.raffle_id,
        customerId: coupon.customer_id,
        token: coupon.tracking_token || createTrackingToken(),
      });
    });

    const missingGroups = Array.from(groups.values()).filter((group) =>
      rows.some((coupon) =>
        coupon.raffle_id === group.raffleId &&
        coupon.customer_id === group.customerId &&
        !coupon.tracking_token
      )
    );

    for (const group of missingGroups) {
      const { error } = await from('raffle_coupons')
        .update({ tracking_token: group.token, updated_at: new Date().toISOString() })
        .eq('company_id', companyId)
        .eq('raffle_id', group.raffleId)
        .eq('customer_id', group.customerId)
        .is('tracking_token', null)
        .execute();
      if (error) {
        console.warn('[Sorteio] Não foi possível preencher token de acompanhamento:', error);
        groups.delete(`${group.raffleId}:${group.customerId}`);
      }
    }

    return rows.map((coupon) => {
      if (coupon.tracking_token || !coupon.customer_id) return coupon;
      const group = groups.get(`${coupon.raffle_id}:${coupon.customer_id}`);
      return group ? { ...coupon, tracking_token: group.token } : coupon;
    });
  };

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
        seller_prize_enabled: settings.seller_prize_enabled === true,
        seller_prize_value: Number(settings.seller_prize_value || 50),
        seller_prize_requires_no_absence: settings.seller_prize_requires_no_absence !== false,
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

  const handleCancelCoupon = async (coupon: RaffleCoupon) => {
    if (coupon.status === 'winner') {
      toast({ title: 'Cupom vencedor', description: 'Cupom vencedor não pode ser cancelado por aqui.', variant: 'destructive' });
      return;
    }
    if (coupon.status === 'cancelled') return;
    const reason = window.prompt(`Motivo para cancelar o cupom #${coupon.coupon_number}:`, 'Cancelado manualmente');
    if (reason === null) return;
    try {
      await cancelRaffleCouponManually({
        companyId,
        couponId: coupon.id,
        userId: user?.id || null,
        reason: reason || 'Cancelado manualmente',
      });
      toast({ title: 'Cupom cancelado' });
      await loadData();
    } catch (error: any) {
      toast({ title: 'Erro ao cancelar cupom', description: error?.message || 'Tente novamente.', variant: 'destructive' });
    }
  };

  const handleCancelRaffle = async (raffle: Raffle) => {
    if (raffle.status === 'drawn') {
      toast({ title: 'Sorteio já realizado', description: 'Sorteio realizado não pode ser cancelado por aqui.', variant: 'destructive' });
      return;
    }
    const reason = window.prompt(`Motivo para cancelar o sorteio "${raffle.name}":`, 'Sorteio cancelado manualmente');
    if (reason === null) return;
    try {
      await cancelRaffleManually({
        raffleId: raffle.id,
        companyId,
        userId: user?.id || null,
        reason: reason || 'Sorteio cancelado manualmente',
      });
      toast({ title: 'Sorteio cancelado' });
      await loadData();
    } catch (error: any) {
      toast({ title: 'Erro ao cancelar sorteio', description: error?.message || 'Tente novamente.', variant: 'destructive' });
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

  const getTrackingUrl = (token?: string | null) => {
    if (!token) return null;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.ativafix.com';
    return `${origin}/sorteio/acompanhar/${token}`;
  };

  const copyTrackingLink = async (token?: string | null) => {
    const link = getTrackingUrl(token);
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast({ title: 'Link copiado', description: 'O link de acompanhamento foi copiado.' });
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
                <span className="text-xs font-bold">{valuesVisible ? currencyFormatters.brl(currentRaffle ? (eligibleAmountByRaffle[currentRaffle.id] ?? currentRaffle.eligible_sales_amount ?? 0) : 0) : MASKED_VALUE}</span>
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

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          navigate(value === 'visao-geral' ? '/sorteios' : `/sorteios/${value}`);
        }}
      >
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
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleDraw(raffle)}
                              disabled={isDrawing || raffle.status === 'drawn' || raffle.status === 'cancelled'}
                              className="rounded-full"
                            >
                              Sortear na mão
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelRaffle(raffle)}
                              disabled={raffle.status === 'drawn' || raffle.status === 'cancelled'}
                              className="rounded-full"
                            >
                              Cancelar
                            </Button>
                          </div>
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
                <div className="flex items-center justify-between gap-3">
                  <Label>Faixas de prêmio</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    disabled={normalizePrizeTiers(settings.prize_tiers).length >= 3}
                    onClick={() => setSettings((p) => {
                      const current = normalizePrizeTiers(p.prize_tiers);
                      const nextIndex = current.length;
                      const nextTier = DEFAULT_PRIZE_TIERS[nextIndex] || { position: nextIndex + 1, type: 'voucher', description: p.prize_description || 'Vale-compra', value: 30 };
                      return {
                        ...p,
                        prize_tiers: [
                          ...current,
                          {
                            ...nextTier,
                            position: current.length + 1,
                            description: nextTier.description || p.prize_description || 'Vale-compra',
                          },
                        ],
                      };
                    })}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Adicionar prêmio
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {normalizePrizeTiers(settings.prize_tiers).map((tier, tierIndex) => (
                    <div key={tier.position} className="space-y-2 rounded-2xl border bg-muted/20 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Label>{tier.position}º prêmio</Label>
                          {tierIndex > 0 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 rounded-full p-0 text-destructive"
                              title="Remover prêmio"
                              onClick={() => setSettings((p) => {
                                const nextTiers = normalizePrizeTiers(p.prize_tiers)
                                  .filter((item) => item.position !== tier.position)
                                  .map((item, index) => ({ ...item, position: index + 1 }));
                                return {
                                  ...p,
                                  prize_value: nextTiers[0]?.value || 0,
                                  prize_tiers: nextTiers,
                                };
                              })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
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

              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label>Prêmio para vendedor do cliente ganhador</Label>
                    <p className="text-xs text-muted-foreground">
                      Ative se o vendedor que atendeu o cliente vencedor também deve concorrer ao bônus interno.
                    </p>
                  </div>
                  <Switch
                    checked={!!settings.seller_prize_enabled}
                    onCheckedChange={(v) => setSettings((p) => ({
                      ...p,
                      seller_prize_enabled: v === true,
                      seller_prize_value: Number(p.seller_prize_value || 50),
                      seller_prize_requires_no_absence: p.seller_prize_requires_no_absence ?? true,
                    }))}
                  />
                </div>
                {settings.seller_prize_enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Valor do prêmio do vendedor</Label>
                      <CurrencyInput
                        showCurrency
                        value={Number(settings.seller_prize_value || 50)}
                        onChange={(value) => setSettings((p) => ({ ...p, seller_prize_value: value || 0 }))}
                      />
                    </div>
                    <label className="flex items-center gap-2 rounded-lg border p-3">
                      <Switch
                        checked={settings.seller_prize_requires_no_absence ?? true}
                        onCheckedChange={(v) => setSettings((p) => ({ ...p, seller_prize_requires_no_absence: v }))}
                      />
                      <span className="text-sm">Exigir nenhuma falta no mês</span>
                    </label>
                  </div>
                )}
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
              <CardDescription>
                Cupons cancelados permanecem no histórico.
                {settings.seller_prize_enabled
                  ? ` Vendedor do cupom vencedor: bônus de ${currencyFormatters.brl(Number(settings.seller_prize_value || 50))}${settings.seller_prize_requires_no_absence ?? true ? ' se não tiver faltas no mês.' : '.'}`
                  : ' Prêmio para vendedor desativado nas configurações.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Input
                  value={couponSearch}
                  onChange={(e) => setCouponSearch(e.target.value)}
                  placeholder="Pesquisar por cupom, cliente, vendedor ou token"
                  className="max-w-md rounded-full"
                />
                <span className="text-xs text-muted-foreground">
                  {filteredCoupons.length} de {coupons.length} cupom(ns)
                </span>
              </div>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Valor base</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acompanhamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCoupons.map((coupon) => {
                    const cliente = coupon.customer_id ? clientesMap[coupon.customer_id] : null;
                    const vendedor = coupon.generated_by_user_id ? vendedoresMap[coupon.generated_by_user_id] : null;
                    const trackingUrl = getTrackingUrl(coupon.tracking_token);
                    return (
                      <TableRow key={coupon.id}>
                        <TableCell className="font-bold">#{coupon.coupon_number}</TableCell>
                        <TableCell>{cliente?.nome || '-'}</TableCell>
                        <TableCell>{valuesVisible ? (cliente?.whatsapp || cliente?.telefone || '-') : maskPhone(cliente?.whatsapp || cliente?.telefone)}</TableCell>
                        <TableCell>{vendedor || '-'}</TableCell>
                        <TableCell>{coupon.order_type === 'service_order' ? 'Ordem de Serviço' : 'Venda'}</TableCell>
                        <TableCell>{valuesVisible ? currencyFormatters.brl(coupon.eligible_amount) : MASKED_VALUE}</TableCell>
                        <TableCell>{dateFormatters.short(coupon.generated_at)}</TableCell>
                        <TableCell><Badge variant={coupon.status === 'winner' ? 'default' : 'outline'}>{coupon.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          {trackingUrl ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full px-3 text-xs"
                                disabled={coupon.status !== 'valid'}
                                onClick={() => handleCancelCoupon(coupon)}
                              >
                                Cancelar
                              </Button>
                              <Button size="sm" variant="outline" className="rounded-full" onClick={() => copyTrackingLink(coupon.tracking_token)}>
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="outline" className="rounded-full" asChild>
                                <a href={trackingUrl} target="_blank" rel="noreferrer">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full px-3 text-xs"
                                disabled={coupon.status !== 'valid'}
                                onClick={() => handleCancelCoupon(coupon)}
                              >
                                Cancelar
                              </Button>
                              <span className="self-center text-xs text-muted-foreground">Sem link</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredCoupons.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum cupom encontrado.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
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
                      <TableCell>{valuesVisible ? (participant.cliente?.whatsapp || participant.cliente?.telefone || '-') : maskPhone(participant.cliente?.whatsapp || participant.cliente?.telefone)}</TableCell>
                      <TableCell>{participant.cliente?.cpf_cnpj || '-'}</TableCell>
                      <TableCell>{valuesVisible ? currencyFormatters.brl(participant.total_amount) : MASKED_VALUE}</TableCell>
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
