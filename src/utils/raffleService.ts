import { from } from '@/integrations/db/client';
import { getApiUrl } from '@/utils/apiUrl';
import type { Raffle, RaffleCoupon, RaffleSettings } from '@/types/raffle';

const DEFAULT_COUPON_TEMPLATE =
  'Olá, {cliente}! Obrigado por comprar na {empresa}. Você recebeu {quantidade_cupons} número(s) da sorte para o sorteio {nome_sorteio}: {numeros_da_sorte}. Sorteio em {data_sorteio}. Boa sorte!';

const DEFAULT_WINNER_TEMPLATE =
  'Parabéns, {cliente}! O seu número da sorte {numero_sorteado} foi o ganhador do sorteio {nome_sorteio} da {empresa}. Entre em contato com nossa equipe para combinar a retirada do prêmio.';

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
  return new Date(referenceYear, referenceMonth - 1, day, Number(hour) || 20, Number(minute) || 0, 0);
};

const formatDateBR = (value?: string | Date | null) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR');
};

const formatPrize = (params: {
  description?: string | null;
  value?: number | null;
  validityDays?: number | null;
}) => {
  const description = params.description || 'Vale-compra';
  const value = Number(params.value || 0);
  const valueText = value > 0 ? ` de ${value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : '';
  return `${description}${valueText}`;
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
      const prizePatch = {
        prize_description: settings.prize_description || 'Vale-compra',
        prize_value: Number(settings.prize_value || 100),
        prize_validity_days: Number(settings.prize_validity_days || 7),
      prize_redeem_instructions: settings.prize_redeem_instructions || 'Retirada presencial na loja mediante apresentação de documento e número da sorte vencedor.',
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
      draw_date: drawDate.toISOString(),
      prize_description: settings.prize_description || 'Vale-compra',
      prize_value: Number(settings.prize_value || 100),
      prize_validity_days: Number(settings.prize_validity_days || 7),
      prize_redeem_instructions: settings.prize_redeem_instructions || 'Retirada presencial na loja mediante apresentação de documento e número da sorte vencedor.',
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
    const couponsPayload = Array.from({ length: quantity }).map((_, index) => ({
      company_id: input.companyId,
      raffle_id: raffle.id,
      customer_id: input.customerId,
      sale_id: input.saleId || null,
      service_order_id: input.serviceOrderId || null,
      order_type: input.orderType,
      coupon_number: firstNumber + index,
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
      .select('id, customer_id, source_total_amount')
      .eq('raffle_id', raffle.id)
      .eq('status', 'valid')
      .execute();
    const participants = new Set((allValidCoupons || []).map((c: any) => c.customer_id).filter(Boolean));
    const totalEligible = (allValidCoupons || []).reduce((sum: number, c: any) => sum + Number(c.source_total_amount || 0), 0);

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
      const body = replaceRaffleTemplateVariables(settings.coupon_message_template || DEFAULT_COUPON_TEMPLATE, {
        cliente: customerName,
        telefone: customerPhone,
        valor_total: totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        quantidade_cupons: coupons.length,
        numeros_da_sorte: numbers,
        data_sorteio: formatDateBR(raffle.draw_date),
        nome_sorteio: raffle.name,
        empresa: input.companyName || 'Ativa FIX',
        numero_os: input.serviceOrderNumber || '',
        numero_venda: input.saleNumber || '',
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

export async function executeManualRaffle(params: {
  raffleId: string;
  companyId?: string | null;
  userId?: string | null;
}) {
  const { data: raffle } = await from('raffles').select('*').eq('id', params.raffleId).single();
  if (!raffle || raffle.status === 'drawn' || raffle.status === 'cancelled') {
    throw new Error('Sorteio indisponível para execução.');
  }

  const { data: coupons } = await from('raffle_coupons')
    .select('*')
    .eq('raffle_id', params.raffleId)
    .eq('status', 'valid')
    .execute();
  if (!coupons || coupons.length === 0) {
    throw new Error('Não há cupons válidos para sortear.');
  }

  const winner = coupons[Math.floor(Math.random() * coupons.length)] as RaffleCoupon;
  await from('raffle_coupons').update({ status: 'winner' }).eq('id', winner.id).execute();
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
    newData: { raffle: updatedRaffle, winner },
  });

  const { data: settings } = await from('raffle_settings')
    .select('*')
    .eq('id', raffle.raffle_setting_id)
    .maybeSingle()
    .execute();
  if ((settings as RaffleSettings | null)?.send_winner_message_enabled && winner.customer_id) {
    const { data: customer } = await from('clientes')
      .select('id, nome, telefone, whatsapp')
      .eq('id', winner.customer_id)
      .maybeSingle()
      .execute();
    const phone = customer?.whatsapp || customer?.telefone;
    if (hasValidPhone(phone)) {
      const body = replaceRaffleTemplateVariables(
        (settings as RaffleSettings).winner_message_template || DEFAULT_WINNER_TEMPLATE,
        {
          cliente: customer?.nome || '',
          numero_sorteado: winner.coupon_number,
          nome_sorteio: raffle.name,
          empresa: 'Ativa FIX',
          telefone: phone,
          data_sorteio: formatDateBR(new Date()),
          premio: formatPrize({
            description: raffle.prize_description || (settings as RaffleSettings).prize_description,
            value: raffle.prize_value ?? (settings as RaffleSettings).prize_value,
            validityDays: raffle.prize_validity_days ?? (settings as RaffleSettings).prize_validity_days,
          }),
          premio_valor: Number((raffle.prize_value ?? (settings as RaffleSettings).prize_value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          validade_premio: `${Number((raffle.prize_validity_days ?? (settings as RaffleSettings).prize_validity_days) || 0)} dias`,
          retirada_premio: raffle.prize_redeem_instructions || (settings as RaffleSettings).prize_redeem_instructions || 'Retirada presencial na loja mediante apresentação de documento e número da sorte vencedor.',
          valor_total_compras: Number(winner.source_total_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        },
      );
      await sendRaffleWhatsApp({
        companyId: params.companyId,
        raffleId: params.raffleId,
        couponId: winner.id,
        customerId: winner.customer_id,
        phone: onlyDigits(phone),
        messageType: 'winner_notification',
        messageBody: body,
      });
    }
  }

  return { raffle: updatedRaffle as Raffle, winner };
}
