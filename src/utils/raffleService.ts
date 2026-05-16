import { from } from '@/integrations/db/client';
import { getApiUrl } from '@/utils/apiUrl';
import type { Raffle, RaffleCoupon, RafflePrizeTier, RaffleSettings } from '@/types/raffle';

const DEFAULT_COUPON_TEMPLATE =
  'Olá, {cliente}! Obrigado por comprar na {empresa}. Você recebeu seus números da sorte: {numeros_da_sorte}. O sorteio será realizado no dia {data_sorteio} às {horario_sorteio}. Acompanhe o resultado por aqui: {link_acompanhamento}. Boa sorte!';

const DEFAULT_WINNER_TEMPLATE =
  'Parabéns, {cliente}! O seu número da sorte {numero_sorteado} foi o ganhador do sorteio {nome_sorteio} da {empresa}. Entre em contato com nossa equipe para combinar a retirada do prêmio.';

const DEFAULT_RAFFLE_COUPON_ATIVA_CRM_TAG_ID = 201;

type GenerateRaffleCouponsInput = {
  companyId?: string | null;
  customerId?: string | null;
  saleId?: string | null;
  serviceOrderId?: string | null;
  orderType: 'sale' | 'service_order';
  totalAmount: number;
  userId?: string | null;
  saleNumber?: number | string | null;
  serviceOrderNumber?: number | string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  companyName?: string | null;
};

const onlyDigits = (value?: string | null) => String(value || '').replace(/\D+/g, '');

const getAppBaseUrl = () => {
  const envUrl = import.meta.env.VITE_APP_URL || import.meta.env.VITE_PUBLIC_APP_URL;
  if (envUrl) return String(envUrl).replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return 'https://app.ativafix.com';
};

const createTrackingToken = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
};

const createUniqueTrackingToken = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = createTrackingToken();
    const { data } = await from('raffle_coupons')
      .select('id')
      .eq('tracking_token', token)
      .limit(1)
      .execute();
    if (!data || data.length === 0) return token;
  }
  return createTrackingToken();
};

const ensureCouponTrackingTemplate = (template?: string | null) => {
  let message = template || DEFAULT_COUPON_TEMPLATE;
  if (!message.includes('{horario_sorteio}')) {
    message = message.replace('{data_sorteio}', '{data_sorteio} às {horario_sorteio}');
  }
  if (!message.includes('{link_acompanhamento}')) {
    message += '\n\nVocê pode acompanhar o resultado por aqui:\n\n{link_acompanhamento}';
  }
  return message;
};

const hasValidPhone = (value?: string | null) => {
  const digits = onlyDigits(value);
  return digits.length >= 10;
};

const isGenericCustomer = (name?: string | null) => {
  const normalized = String(name || '').trim().toLowerCase();
  return !normalized || normalized.includes('consumidor final') || normalized.includes('cliente não informado') || normalized === 'cliente';
};

const getMonthRange = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return {
    referenceMonth: month + 1,
    referenceYear: year,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    lastDay: end,
  };
};

const buildDrawDate = (settings: RaffleSettings, reference = new Date()) => {
  const { referenceYear, referenceMonth, lastDay } = getMonthRange(reference);
  const [hour = '20', minute = '00'] = String(settings.draw_time || '20:00').split(':');
  const day = settings.draw_day_type === 'fixed_day'
    ? Math.min(Math.max(Number(settings.fixed_draw_day || lastDay.getDate()), 1), lastDay.getDate())
    : lastDay.getDate();
  const safeHour = String(Number(hour) || 20).padStart(2, '0');
  const safeMinute = String(Number(minute) || 0).padStart(2, '0');
  return `${referenceYear}-${String(referenceMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}T${safeHour}:${safeMinute}:00-03:00`;
};

const formatDateBR = (value?: string | Date | null) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR');
};

const formatTimeBR = (value?: string | Date | null) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
};

const formatPrize = (params: {
  type?: string | null;
  description?: string | null;
  value?: number | null;
  validityDays?: number | null;
}) => {
  const description = params.description || (params.type === 'product' ? 'Produto' : 'Vale-compra');
  const value = Number(params.value || 0);
  const valueText = params.type === 'product' || value <= 0 ? '' : ` de ${value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
  return `${description}${valueText}`;
};

const DEFAULT_PRIZE_TIERS: RafflePrizeTier[] = [
  { position: 1, type: 'voucher', description: 'Vale-compra', value: 100 },
  { position: 2, type: 'voucher', description: 'Vale-compra', value: 70 },
  { position: 3, type: 'voucher', description: 'Vale-compra', value: 30 },
];

const normalizePrizeTiers = (tiers?: RafflePrizeTier[] | null): RafflePrizeTier[] => {
  const source = Array.isArray(tiers) && tiers.length > 0 ? tiers : DEFAULT_PRIZE_TIERS;
  return source
    .map((tier, index) => ({
      position: Number(tier.position || index + 1),
      type: tier.type === 'product' ? 'product' : 'voucher',
      description: tier.description || (tier.type === 'product' ? 'Produto' : 'Vale-compra'),
      value: tier.type === 'product' ? Number(tier.value || 0) : Number(tier.value || DEFAULT_PRIZE_TIERS[index]?.value || 0),
    }))
    .filter((tier) => tier.type === 'product' || tier.value > 0)
    .sort((a, b) => a.position - b.position);
};

const sumUniqueSourceAmounts = (coupons: Array<{
  id?: string | null;
  sale_id?: string | null;
  service_order_id?: string | null;
  order_type?: string | null;
  source_total_amount?: number | string | null;
}>) => {
  const seen = new Set<string>();
  return coupons.reduce((sum, coupon) => {
    const sourceKey =
      coupon.sale_id ? `sale:${coupon.sale_id}` :
      coupon.service_order_id ? `os:${coupon.service_order_id}` :
      `coupon:${coupon.id || Math.random()}`;
    if (seen.has(sourceKey)) return sum;
    seen.add(sourceKey);
    return sum + Number(coupon.source_total_amount || 0);
  }, 0);
};

export const replaceRaffleTemplateVariables = (
  template: string,
  variables: Record<string, string | number | null | undefined>,
) => {
  return Object.entries(variables).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value ?? '')),
    template,
  );
};

async function getCompanyName(companyId?: string | null) {
  if (!companyId) return 'Empresa';
  const { data } = await from('companies')
    .select('name')
    .eq('id', companyId)
    .maybeSingle()
    .execute();
  return data?.name || 'Empresa';
}

export async function getOrCreateCurrentRaffle(settings: RaffleSettings, companyId?: string | null): Promise<Raffle | null> {
  const now = new Date();
  const { referenceMonth, referenceYear, startDate, endDate } = getMonthRange(now);

  const { data: existing, error: existingError } = await from('raffles')
    .select('*')
    .eq('company_id', companyId)
    .eq('reference_month', referenceMonth)
    .eq('reference_year', referenceYear)
    .maybeSingle()
    .execute();

  if (existingError) {
    console.warn('[Sorteio] Erro ao buscar sorteio mensal:', existingError);
  }

  if (existing) {
    if (existing.status === 'open') {
      const drawDate = buildDrawDate(settings, now);
      const prizePatch = {
        raffle_setting_id: settings.id || existing.raffle_setting_id || null,
        draw_date: drawDate,
        prize_description: settings.prize_description || 'Vale-compra',
        prize_value: Number(settings.prize_value || 100),
        prize_validity_days: Number(settings.prize_validity_days || 7),
        prize_redeem_instructions: settings.prize_redeem_instructions || 'Retirada presencial na loja mediante apresentação de documento e número da sorte vencedor.',
        prize_tiers: normalizePrizeTiers(settings.prize_tiers),
      };
      await from('raffles').update(prizePatch).eq('id', existing.id).execute();
      return { ...(existing as Raffle), ...prizePatch };
    }
    return existing as Raffle;
  }

  const drawDate = buildDrawDate(settings, now);
  const raffleName = `${settings.campaign_name || 'Sorteio Mensal'} ${String(referenceMonth).padStart(2, '0')}/${referenceYear}`;
  const { data: created, error } = await from('raffles')
    .insert({
      company_id: companyId,
      raffle_setting_id: settings.id,
      name: raffleName,
      reference_month: referenceMonth,
      reference_year: referenceYear,
      start_date: startDate,
      end_date: endDate,
      draw_date: drawDate,
      prize_description: settings.prize_description || 'Vale-compra',
      prize_value: Number(settings.prize_value || 100),
      prize_validity_days: Number(settings.prize_validity_days || 7),
      prize_redeem_instructions: settings.prize_redeem_instructions || 'Retirada presencial na loja mediante apresentação de documento e número da sorte vencedor.',
      prize_tiers: normalizePrizeTiers(settings.prize_tiers),
      status: 'open',
    })
    .select()
    .single();

  if (error) {
    console.warn('[Sorteio] Erro ao criar sorteio mensal:', error);
    return null;
  }

  await logRaffleAudit({
    companyId,
    raffleId: created?.id,
    userId: null,
    action: 'raffle_created',
    origin: 'system',
    newData: created,
  });

  return created as Raffle;
}

export async function logRaffleAudit(params: {
  companyId?: string | null;
  raffleId?: string | null;
  couponId?: string | null;
  customerId?: string | null;
  saleId?: string | null;
  serviceOrderId?: string | null;
  userId?: string | null;
  action: string;
  origin?: 'system' | 'user' | 'cron' | 'api';
  oldData?: unknown;
  newData?: unknown;
  metadata?: unknown;
}) {
  try {
    await from('raffle_audit_logs').insert({
      company_id: params.companyId || null,
      raffle_id: params.raffleId || null,
      coupon_id: params.couponId || null,
      customer_id: params.customerId || null,
      sale_id: params.saleId || null,
      service_order_id: params.serviceOrderId || null,
      user_id: params.userId || null,
      action: params.action,
      origin: params.origin || 'system',
      old_data: params.oldData || null,
      new_data: params.newData || null,
      metadata: params.metadata || null,
      ip_address: null,
    });
  } catch (error) {
    console.warn('[Sorteio] Falha ao registrar auditoria:', error);
  }
}

async function sendRaffleWhatsApp(params: {
  companyId?: string | null;
  raffleId?: string | null;
  couponId?: string | null;
  customerId?: string | null;
  phone: string;
  messageType: 'coupon_generated' | 'winner_notification';
  messageBody: string;
  contactName?: string | null;
  tagId?: number | null;
}) {
  const logPayload = {
    company_id: params.companyId || null,
    raffle_id: params.raffleId || null,
    coupon_id: params.couponId || null,
    customer_id: params.customerId || null,
    phone: params.phone,
    message_type: params.messageType,
    message_body: params.messageBody,
    send_status: 'pending',
  };

  const { data: logRow } = await from('raffle_message_logs').insert(logPayload).select().single();

  try {
    const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    const response = await fetch(`${getApiUrl()}/whatsapp/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'send_message',
        data: {
          number: params.phone,
          body: params.messageBody,
          contactName: params.contactName || undefined,
          tagId: params.tagId || undefined,
        },
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result?.success === false || result?.error) {
      throw new Error(result?.error || result?.message || 'Falha ao enviar WhatsApp');
    }

    if (logRow?.id) {
      await from('raffle_message_logs')
        .update({
          send_status: 'sent',
          external_message_id: result?.messageId || result?.id || null,
          sent_at: new Date().toISOString(),
        })
        .eq('id', logRow.id)
        .execute();
    }
    return { ok: true, result };
  } catch (error: any) {
    if (logRow?.id) {
      await from('raffle_message_logs')
        .update({
          send_status: 'failed',
          error_message: error?.message || String(error),
        })
        .eq('id', logRow.id)
        .execute();
    }
    console.warn('[Sorteio] Envio WhatsApp falhou, sem bloquear venda:', error);
    return { ok: false, error };
  }
}

export async function generateRaffleCoupons(input: GenerateRaffleCouponsInput) {
  try {
    const totalAmount = Number(input.totalAmount || 0);
    if (!input.companyId || !input.customerId || totalAmount <= 0) {
      return { generated: 0, reason: 'missing_company_customer_or_amount' };
    }
    const companyName = input.companyName || await getCompanyName(input.companyId);

    let customerName = input.customerName || '';
    let customerPhone = input.customerPhone || '';
    let customerCpf = '';
    if (!customerPhone || !customerName) {
      const { data: customer } = await from('clientes')
        .select('id, nome, telefone, whatsapp, cpf_cnpj')
        .eq('id', input.customerId)
        .maybeSingle()
        .execute();
      customerName = customerName || customer?.nome || '';
      customerPhone = customerPhone || customer?.whatsapp || customer?.telefone || '';
      customerCpf = customer?.cpf_cnpj || '';
    }

    if (isGenericCustomer(customerName) || !hasValidPhone(customerPhone)) {
      await logRaffleAudit({
        companyId: input.companyId,
        customerId: input.customerId,
        saleId: input.saleId,
        serviceOrderId: input.serviceOrderId,
        userId: input.userId,
        action: 'coupon_skipped_invalid_customer',
        origin: 'system',
        metadata: { customerName, customerPhone, totalAmount },
      });
      return { generated: 0, reason: 'invalid_customer' };
    }

    const { data: settingsRow } = await from('raffle_settings')
      .select('*')
      .eq('company_id', input.companyId)
      .maybeSingle()
      .execute();
    const settings = settingsRow as RaffleSettings | null;
    if (!settings?.is_active || Number(settings.amount_per_coupon || 0) <= 0) {
      return { generated: 0, reason: 'raffle_inactive' };
    }

    const quantity = Math.floor(totalAmount / Number(settings.amount_per_coupon));
    if (quantity <= 0) return { generated: 0, reason: 'amount_below_rule' };

    const raffle = await getOrCreateCurrentRaffle(settings, input.companyId);
    if (!raffle || raffle.status === 'drawn' || raffle.status === 'cancelled') {
      return { generated: 0, reason: 'raffle_unavailable' };
    }

    const { data: existingForSale } = await from('raffle_coupons')
      .select('id')
      .eq('raffle_id', raffle.id)
      .eq('sale_id', input.saleId)
      .execute();
    if (input.saleId && existingForSale && existingForSale.length > 0) {
      return { generated: 0, reason: 'already_generated' };
    }

    const { data: lastCoupons } = await from('raffle_coupons')
      .select('coupon_number')
      .eq('company_id', input.companyId)
      .eq('raffle_id', raffle.id)
      .order('coupon_number', { ascending: false })
      .limit(1)
      .execute();

    const currentMax = Number(lastCoupons?.[0]?.coupon_number || 0);
    const firstNumber = Math.max(Number(settings.initial_number || 100), currentMax + 1);
    let trackingToken = await createUniqueTrackingToken();
    const { data: existingTracking } = await from('raffle_coupons')
      .select('tracking_token')
      .eq('raffle_id', raffle.id)
      .eq('customer_id', input.customerId)
      .limit(1)
      .execute();
    if (existingTracking?.[0]?.tracking_token) {
      trackingToken = existingTracking[0].tracking_token;
    }

    const couponsPayload = Array.from({ length: quantity }).map((_, index) => ({
      company_id: input.companyId,
      raffle_id: raffle.id,
      customer_id: input.customerId,
      sale_id: input.saleId || null,
      service_order_id: input.serviceOrderId || null,
      order_type: input.orderType,
      coupon_number: firstNumber + index,
      tracking_token: trackingToken,
      eligible_amount: Number(settings.amount_per_coupon),
      source_total_amount: totalAmount,
      status: 'valid',
      generated_by_user_id: input.userId || null,
      generated_at: new Date().toISOString(),
    }));

    const { data: inserted, error: insertError } = await from('raffle_coupons')
      .insert(couponsPayload)
      .select()
      .execute();
    if (insertError) throw insertError;

    const coupons = (inserted || []) as RaffleCoupon[];
    const { data: allValidCoupons } = await from('raffle_coupons')
      .select('id, customer_id, sale_id, service_order_id, source_total_amount')
      .eq('raffle_id', raffle.id)
      .eq('status', 'valid')
      .execute();
    const participants = new Set((allValidCoupons || []).map((c: any) => c.customer_id).filter(Boolean));
    const totalEligible = sumUniqueSourceAmounts(allValidCoupons || []);

    await from('raffles')
      .update({
        total_coupons: allValidCoupons?.length || coupons.length,
        total_participants: participants.size,
        eligible_sales_amount: totalEligible,
      })
      .eq('id', raffle.id)
      .execute();

    await logRaffleAudit({
      companyId: input.companyId,
      raffleId: raffle.id,
      customerId: input.customerId,
      saleId: input.saleId,
      serviceOrderId: input.serviceOrderId,
      userId: input.userId,
      action: 'coupon_generated',
      origin: 'system',
      newData: coupons,
      metadata: { totalAmount, quantity },
    });

    if (settings.send_coupon_message_enabled) {
      const numbers = coupons.map((c) => c.coupon_number).join(', ');
      const trackingUrl = `${getAppBaseUrl()}/sorteio/acompanhar/${trackingToken}`;
      const body = replaceRaffleTemplateVariables(ensureCouponTrackingTemplate(settings.coupon_message_template), {
        cliente: customerName,
        telefone: customerPhone,
        valor_total: totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        quantidade_cupons: coupons.length,
        numeros_da_sorte: numbers,
        data_sorteio: formatDateBR(raffle.draw_date),
        horario_sorteio: formatTimeBR(raffle.draw_date),
        nome_sorteio: raffle.name,
        empresa: companyName,
        numero_os: input.serviceOrderNumber || '',
        numero_venda: input.saleNumber || '',
        link_acompanhamento: trackingUrl,
        cpf: customerCpf,
      });

      await sendRaffleWhatsApp({
        companyId: input.companyId,
        raffleId: raffle.id,
        couponId: coupons[0]?.id,
        customerId: input.customerId,
        phone: onlyDigits(customerPhone),
        messageType: 'coupon_generated',
        messageBody: body,
        contactName: customerName,
        tagId: Number(settings.ativa_crm_coupon_tag_id || DEFAULT_RAFFLE_COUPON_ATIVA_CRM_TAG_ID),
      });
    }

    return { generated: coupons.length, coupons, raffle };
  } catch (error) {
    console.warn('[Sorteio] Erro ao gerar cupons:', error);
    return { generated: 0, reason: 'error', error };
  }
}

export async function cancelRaffleCouponsForSale(params: {
  companyId?: string | null;
  saleId: string;
  userId?: string | null;
  reason?: string;
}) {
  try {
    const { data: winnerCoupons } = await from('raffle_coupons')
      .select('id')
      .eq('sale_id', params.saleId)
      .eq('status', 'winner')
      .execute();
    if (winnerCoupons && winnerCoupons.length > 0) {
      await logRaffleAudit({
        companyId: params.companyId,
        saleId: params.saleId,
        userId: params.userId,
        action: 'coupon_cancel_blocked_winner',
        origin: 'system',
        metadata: { reason: params.reason },
      });
      return { cancelled: 0, blocked: true };
    }

    const { data: updated } = await from('raffle_coupons')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: params.reason || 'Venda cancelada',
      })
      .eq('sale_id', params.saleId)
      .eq('status', 'valid')
      .select()
      .execute();

    await logRaffleAudit({
      companyId: params.companyId,
      saleId: params.saleId,
      userId: params.userId,
      action: 'coupon_cancelled',
      origin: 'system',
      newData: updated || [],
      metadata: { reason: params.reason },
    });

    return { cancelled: updated?.length || 0 };
  } catch (error) {
    console.warn('[Sorteio] Erro ao cancelar cupons da venda:', error);
    return { cancelled: 0, error };
  }
}

export async function cancelRaffleCouponsForServiceOrder(params: {
  companyId?: string | null;
  serviceOrderId: string;
  userId?: string | null;
  reason?: string;
}) {
  try {
    const { data: winnerCoupons } = await from('raffle_coupons')
      .select('id')
      .eq('service_order_id', params.serviceOrderId)
      .eq('status', 'winner')
      .execute();
    if (winnerCoupons && winnerCoupons.length > 0) {
      await logRaffleAudit({
        companyId: params.companyId,
        serviceOrderId: params.serviceOrderId,
        userId: params.userId,
        action: 'coupon_cancel_blocked_winner',
        origin: 'system',
        metadata: { reason: params.reason },
      });
      return { cancelled: 0, blocked: true };
    }

    const { data: updated } = await from('raffle_coupons')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: params.reason || 'OS cancelada/devolvida',
      })
      .eq('service_order_id', params.serviceOrderId)
      .eq('status', 'valid')
      .select()
      .execute();

    await logRaffleAudit({
      companyId: params.companyId,
      serviceOrderId: params.serviceOrderId,
      userId: params.userId,
      action: 'coupon_cancelled',
      origin: 'system',
      newData: updated || [],
      metadata: { reason: params.reason },
    });

    return { cancelled: updated?.length || 0 };
  } catch (error) {
    console.warn('[Sorteio] Erro ao cancelar cupons da OS:', error);
    return { cancelled: 0, error };
  }
}

export async function cancelRaffleCouponManually(params: {
  companyId?: string | null;
  couponId: string;
  userId?: string | null;
  reason?: string;
}) {
  const { data: coupon } = await from('raffle_coupons').select('*').eq('id', params.couponId).maybeSingle();
  if (!coupon) throw new Error('Cupom não encontrado.');
  if (coupon.status === 'winner') throw new Error('Cupom vencedor não pode ser cancelado sem refazer o sorteio administrativamente.');
  if (coupon.status === 'cancelled') return { coupon };

  const { data: updated, error } = await from('raffle_coupons')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: params.reason || 'Cancelado manualmente',
    })
    .eq('id', params.couponId)
    .select()
    .single();
  if (error) throw error;

  await logRaffleAudit({
    companyId: params.companyId || coupon.company_id,
    raffleId: coupon.raffle_id,
    couponId: params.couponId,
    customerId: coupon.customer_id,
    saleId: coupon.sale_id,
    serviceOrderId: coupon.service_order_id,
    userId: params.userId,
    action: 'coupon_cancelled_manual',
    origin: 'user',
    oldData: coupon,
    newData: updated,
    metadata: { reason: params.reason },
  });

  return { coupon: updated };
}

export async function cancelRaffleManually(params: {
  raffleId: string;
  companyId?: string | null;
  userId?: string | null;
  reason?: string;
}) {
  const { data: raffle } = await from('raffles').select('*').eq('id', params.raffleId).maybeSingle();
  if (!raffle) throw new Error('Sorteio não encontrado.');
  if (raffle.status === 'drawn') throw new Error('Sorteio já realizado não pode ser cancelado por aqui.');
  if (raffle.status === 'cancelled') return { raffle };

  const { data: updated, error } = await from('raffles')
    .update({
      status: 'cancelled',
      cancelled_reason: params.reason || 'Cancelado manualmente',
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.raffleId)
    .select()
    .single();
  if (error) throw error;

  await logRaffleAudit({
    companyId: params.companyId || raffle.company_id,
    raffleId: params.raffleId,
    userId: params.userId,
    action: 'raffle_cancelled',
    origin: 'user',
    oldData: raffle,
    newData: updated,
    metadata: { reason: params.reason },
  });

  return { raffle: updated };
}

export async function executeManualRaffle(params: {
  raffleId: string;
  companyId?: string | null;
  userId?: string | null;
}) {
  const { data: raffle } = await from('raffles').select('*').eq('id', params.raffleId).single();
  if (!raffle || raffle.status === 'drawn' || raffle.status === 'cancelled') {
    throw new Error('Sorteio indisponível para execução.');
  }
  const companyName = await getCompanyName(params.companyId || raffle.company_id);

  const { data: coupons } = await from('raffle_coupons')
    .select('*')
    .eq('raffle_id', params.raffleId)
    .eq('status', 'valid')
    .execute();
  if (!coupons || coupons.length === 0) {
    throw new Error('Não há cupons válidos para sortear.');
  }

  const { data: settings } = await from('raffle_settings')
    .select('*')
    .eq('id', raffle.raffle_setting_id)
    .maybeSingle()
    .execute();
  const prizeTiers = normalizePrizeTiers((raffle.prize_tiers || (settings as RaffleSettings | null)?.prize_tiers) as RafflePrizeTier[] | null);
  const shuffledCoupons = [...coupons].sort(() => Math.random() - 0.5) as RaffleCoupon[];
  const usedWinnerKeys = new Set<string>();
  const winners: RaffleCoupon[] = [];
  for (const coupon of shuffledCoupons) {
    const winnerKey = coupon.customer_id ? `customer:${coupon.customer_id}` : `coupon:${coupon.id}`;
    if (usedWinnerKeys.has(winnerKey)) continue;
    usedWinnerKeys.add(winnerKey);
    winners.push(coupon);
    if (winners.length >= prizeTiers.length) break;
  }
  if (winners.length === 0) {
    throw new Error('Não há clientes únicos suficientes para sortear.');
  }

  for (let index = 0; index < winners.length; index += 1) {
    const winner = winners[index];
    const tier = prizeTiers[index];
    await from('raffle_coupons')
      .update({
        status: 'winner',
        prize_position: tier.position,
        prize_type: tier.type || 'voucher',
        prize_description: tier.description,
        prize_value: tier.value,
      })
      .eq('id', winner.id)
      .execute();
    winners[index] = { ...winner, status: 'winner', prize_position: tier.position, prize_type: tier.type || 'voucher', prize_description: tier.description, prize_value: tier.value };
  }

  const winner = winners[0];
  const { data: updatedRaffle } = await from('raffles')
    .update({
      status: 'drawn',
      winning_coupon_id: winner.id,
      winning_customer_id: winner.customer_id || null,
      draw_executed_at: new Date().toISOString(),
      draw_origin: 'manual',
      drawn_by_user_id: params.userId || null,
    })
    .eq('id', params.raffleId)
    .select()
    .single();

  await logRaffleAudit({
    companyId: params.companyId,
    raffleId: params.raffleId,
    couponId: winner.id,
    customerId: winner.customer_id,
    userId: params.userId,
    action: 'raffle_drawn',
    origin: 'user',
    newData: { raffle: updatedRaffle, winners },
  });

  if ((settings as RaffleSettings | null)?.send_winner_message_enabled) {
    for (const currentWinner of winners) {
      if (!currentWinner.customer_id) continue;
      const currentTier = prizeTiers.find((tier) => tier.position === currentWinner.prize_position) || prizeTiers[0];
    const { data: customer } = await from('clientes')
      .select('id, nome, telefone, whatsapp')
        .eq('id', currentWinner.customer_id)
      .maybeSingle()
      .execute();
    const phone = customer?.whatsapp || customer?.telefone;
    if (hasValidPhone(phone)) {
      const body = replaceRaffleTemplateVariables(
        (settings as RaffleSettings).winner_message_template || DEFAULT_WINNER_TEMPLATE,
        {
          cliente: customer?.nome || '',
            numero_sorteado: currentWinner.coupon_number,
          nome_sorteio: raffle.name,
          empresa: companyName,
          telefone: phone,
          data_sorteio: formatDateBR(new Date()),
          premio: formatPrize({
              type: currentTier.type,
              description: currentTier.description,
              value: currentTier.value,
            validityDays: raffle.prize_validity_days ?? (settings as RaffleSettings).prize_validity_days,
          }),
            premio_tipo: currentTier.type === 'product' ? 'Produto' : 'Vale-compra',
            premio_valor: currentTier.type === 'product' ? '' : Number(currentTier.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            posicao_premio: `${currentTier.position}º prêmio`,
          validade_premio: `${Number((raffle.prize_validity_days ?? (settings as RaffleSettings).prize_validity_days) || 0)} dias`,
          retirada_premio: raffle.prize_redeem_instructions || (settings as RaffleSettings).prize_redeem_instructions || 'Retirada presencial na loja mediante apresentação de documento e número da sorte vencedor.',
            valor_total_compras: Number(currentWinner.source_total_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        },
      );
      await sendRaffleWhatsApp({
        companyId: params.companyId,
        raffleId: params.raffleId,
          couponId: currentWinner.id,
          customerId: currentWinner.customer_id,
        phone: onlyDigits(phone),
        messageType: 'winner_notification',
        messageBody: body,
      });
    }
    }
  }

  return { raffle: updatedRaffle as Raffle, winner, winners };
}
