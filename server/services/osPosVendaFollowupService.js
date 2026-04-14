/**
 * Follow-up automático pós-venda (WhatsApp) para OS faturadas.
 */
import { addDays, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { createWhatsAppSender } from './alertService.js';

export const FOLLOWUP_RULES = {
  NEXT_DAY_10AM: 'NEXT_DAY_10AM',
  AFTER_24H: 'AFTER_24H',
};

export const RANDOM_DELAY_MAX_SECONDS = 1800;

export const DEFAULT_TEMPLATE = `Olá, {cliente}. Tudo bem?
Passando para saber como está sua experiência após o serviço realizado no aparelho.
Está tudo certo com o funcionamento?`;

export const DEFAULT_GOOGLE_TEXT =
  'Se puder, sua avaliação no Google ajuda muito nossa empresa.';

function randomDelaySeconds() {
  return Math.floor(Math.random() * (RANDOM_DELAY_MAX_SECONDS + 1));
}

/**
 * @param {Date|string} faturadoAt
 * @param {'NEXT_DAY_10AM'|'AFTER_24H'} ruleType
 * @param {string} timeZone IANA
 * @param {number} delaySec
 * @returns {Date}
 */
export function computeScheduledAt(faturadoAt, ruleType, timeZone, delaySec) {
  const fat = faturadoAt instanceof Date ? faturadoAt : new Date(faturadoAt);
  if (Number.isNaN(fat.getTime())) {
    throw new Error('data de faturamento inválida');
  }
  if (ruleType === FOLLOWUP_RULES.AFTER_24H) {
    const ms = fat.getTime() + 24 * 60 * 60 * 1000 + delaySec * 1000;
    return new Date(ms);
  }
  const zoned = toZonedTime(fat, timeZone);
  const nextCal = addDays(zoned, 1);
  const at10local = setMilliseconds(
    setSeconds(setMinutes(setHours(nextCal, 10), 0), 0),
    0
  );
  const utcInstant = fromZonedTime(at10local, timeZone);
  return new Date(utcInstant.getTime() + delaySec * 1000);
}

/**
 * @param {string} template
 * @param {Record<string,string>} vars
 */
export function renderFollowupTemplate(template, vars) {
  let out = template || '';
  for (const [k, v] of Object.entries(vars)) {
    const re = new RegExp(`\\{${k}\\}`, 'g');
    out = out.replace(re, v ?? '');
  }
  return out;
}

function formatPtBrDateTime(iso) {
  try {
    const d = iso instanceof Date ? iso : new Date(iso);
    return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return String(iso);
  }
}

/**
 * Normaliza telefone BR para envio (somente dígitos, prefixo 55).
 * @returns {{ ok: boolean, e164?: string, reason?: string }}
 */
export function normalizeWhatsappNumber(raw) {
  if (raw == null || String(raw).trim() === '') {
    return { ok: false, reason: 'Telefone ausente' };
  }
  let n = String(raw).replace(/\D/g, '');
  n = n.replace(/^0+/, '');
  if (n.startsWith('55')) {
    // ok
  } else if (n.length === 10 || n.length === 11) {
    n = `55${n}`;
  }
  if (n.length < 12 || n.length > 13) {
    return { ok: false, reason: 'Telefone inválido para WhatsApp' };
  }
  return { ok: true, e164: n };
}

export async function getSettingsRow(client, companyId) {
  const r = await client.query(
    `SELECT * FROM os_pos_venda_followup_settings WHERE company_id = $1`,
    [companyId]
  );
  return r.rows[0] || null;
}

export function mergeSettingsResponse(row) {
  if (!row) {
    return {
      ativo: true,
      tipo_regra_envio: FOLLOWUP_RULES.NEXT_DAY_10AM,
      timezone: 'America/Sao_Paulo',
      template_key: 'default',
      template_mensagem: DEFAULT_TEMPLATE,
      solicitar_avaliacao_google: true,
      texto_avaliacao_google: DEFAULT_GOOGLE_TEXT,
    };
  }
  return {
    ativo: row.ativo,
    tipo_regra_envio: row.tipo_regra_envio,
    timezone: row.timezone,
    template_key: row.template_key,
    template_mensagem: row.template_mensagem || DEFAULT_TEMPLATE,
    solicitar_avaliacao_google: row.solicitar_avaliacao_google,
    texto_avaliacao_google: row.texto_avaliacao_google || DEFAULT_GOOGLE_TEXT,
  };
}

export async function upsertSettings(client, companyId, body) {
  const {
    ativo,
    tipo_regra_envio,
    timezone,
    template_key,
    template_mensagem,
    solicitar_avaliacao_google,
    texto_avaliacao_google,
  } = body;

  const rule =
    tipo_regra_envio === FOLLOWUP_RULES.AFTER_24H
      ? FOLLOWUP_RULES.AFTER_24H
      : FOLLOWUP_RULES.NEXT_DAY_10AM;

  await client.query(
    `INSERT INTO os_pos_venda_followup_settings (
       company_id, ativo, tipo_regra_envio, timezone, template_key,
       template_mensagem, solicitar_avaliacao_google, texto_avaliacao_google
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (company_id) DO UPDATE SET
       ativo = EXCLUDED.ativo,
       tipo_regra_envio = EXCLUDED.tipo_regra_envio,
       timezone = EXCLUDED.timezone,
       template_key = EXCLUDED.template_key,
       template_mensagem = EXCLUDED.template_mensagem,
       solicitar_avaliacao_google = EXCLUDED.solicitar_avaliacao_google,
       texto_avaliacao_google = EXCLUDED.texto_avaliacao_google,
       updated_at = now()`,
    [
      companyId,
      !!ativo,
      rule,
      timezone || 'America/Sao_Paulo',
      template_key || 'default',
      template_mensagem ?? DEFAULT_TEMPLATE,
      solicitar_avaliacao_google !== false,
      texto_avaliacao_google ?? DEFAULT_GOOGLE_TEXT,
    ]
  );
}

/**
 * Monta mensagem final (template + bloco Google opcional).
 */
export function buildMessageFromSettings(settingsRow, vars) {
  const base = mergeSettingsResponse(settingsRow);
  const tmpl = base.template_mensagem || DEFAULT_TEMPLATE;
  let msg = renderFollowupTemplate(tmpl, vars);
  if (base.solicitar_avaliacao_google && base.texto_avaliacao_google) {
    msg = `${msg.trim()}\n\n${base.texto_avaliacao_google.trim()}`;
  }
  return msg;
}

/**
 * Agenda follow-up para uma OS faturada (idempotente por ordem_servico_id).
 */
export async function scheduleFollowupForOs(pool, companyId, ordemServicoId, faturadoAtInput) {
  const client = await pool.connect();
  try {
    const settings = await getSettingsRow(client, companyId);
    if (!settings) {
      return { scheduled: false, reason: 'configuracao_inexistente' };
    }
    if (!settings.ativo) {
      return { scheduled: false, reason: 'follow_up_desativado' };
    }

    const osRes = await client.query(
      `SELECT o.id, o.company_id, o.cliente_id, o.telefone_contato, o.cliente_nome,
              o.marca_nome, o.modelo_nome, o.numero, o.status, o.situacao,
              c.name AS empresa_nome
       FROM ordens_servico o
       LEFT JOIN companies c ON c.id = o.company_id
       WHERE o.id = $1`,
      [ordemServicoId]
    );
    if (osRes.rows.length === 0) {
      return { scheduled: false, reason: 'os_nao_encontrada' };
    }
    const os = osRes.rows[0];
    if (String(os.company_id) !== String(companyId)) {
      return { scheduled: false, reason: 'os_outra_empresa' };
    }
    if (os.situacao === 'cancelada' || os.status === 'cancelada') {
      return { scheduled: false, reason: 'os_cancelada' };
    }
    if (os.status !== 'entregue_faturada') {
      return { scheduled: false, reason: 'os_nao_faturada' };
    }

    const faturadoAt = faturadoAtInput ? new Date(faturadoAtInput) : new Date();
    const delaySec = randomDelaySeconds();
    const scheduledAt = computeScheduledAt(
      faturadoAt,
      settings.tipo_regra_envio,
      settings.timezone || 'America/Sao_Paulo',
      delaySec
    );

    const vars = {
      cliente: os.cliente_nome || 'Cliente',
      numero_os: String(os.numero ?? ''),
      empresa: os.empresa_nome || '',
      marca: os.marca_nome || '',
      modelo: os.modelo_nome || '',
      data_faturamento: formatPtBrDateTime(faturadoAt),
    };
    const mensagem = buildMessageFromSettings(settings, vars);

    const phone = normalizeWhatsappNumber(os.telefone_contato);
    if (!phone.ok) {
      const ins = await client.query(
        `INSERT INTO os_pos_venda_followup_jobs (
           company_id, ordem_servico_id, cliente_id, telefone, mensagem_renderizada,
           status, tipo_regra_envio, scheduled_at, faturado_at, random_delay_seconds,
           skip_reason, template_key
         ) VALUES ($1,$2,$3,$4,$5,'cancelado',$6,$7,$8,$9,$10,$11)
         ON CONFLICT (ordem_servico_id) DO NOTHING
         RETURNING id`,
        [
          companyId,
          ordemServicoId,
          os.cliente_id,
          os.telefone_contato,
          mensagem,
          settings.tipo_regra_envio,
          scheduledAt.toISOString(),
          faturadoAt.toISOString(),
          delaySec,
          phone.reason,
          settings.template_key || 'default',
        ]
      );
      return {
        scheduled: false,
        reason: 'telefone_invalido',
        skip_reason: phone.reason,
        duplicate: ins.rowCount === 0,
      };
    }

    const ins = await client.query(
      `INSERT INTO os_pos_venda_followup_jobs (
         company_id, ordem_servico_id, cliente_id, telefone, mensagem_renderizada,
         status, tipo_regra_envio, scheduled_at, faturado_at, random_delay_seconds,
         template_key
       ) VALUES ($1,$2,$3,$4,$5,'agendado',$6,$7,$8,$9,$10)
       ON CONFLICT (ordem_servico_id) DO NOTHING
       RETURNING id`,
      [
        companyId,
        ordemServicoId,
        os.cliente_id,
        phone.e164,
        mensagem,
        settings.tipo_regra_envio,
        scheduledAt.toISOString(),
        faturadoAt.toISOString(),
        delaySec,
        settings.template_key || 'default',
      ]
    );

    if (ins.rowCount === 0) {
      return { scheduled: false, reason: 'ja_existia', duplicate: true };
    }

    return {
      scheduled: true,
      id: ins.rows[0].id,
      scheduled_at: scheduledAt.toISOString(),
      random_delay_seconds: delaySec,
    };
  } finally {
    client.release();
  }
}

/**
 * Processa fila (com lock SKIP LOCKED).
 * @param {import('pg').Pool} pool
 * @param {number} batchSize
 */
export async function processDueFollowups(pool, batchSize = 25) {
  const client = await pool.connect();
  const results = { processed: 0, sent: 0, errors: 0, cancelled: 0 };
  try {
    for (let i = 0; i < batchSize; i++) {
      await client.query('BEGIN');
      const pick = await client.query(
        `SELECT * FROM os_pos_venda_followup_jobs
         WHERE status IN ('pendente', 'agendado') AND scheduled_at <= now()
         ORDER BY scheduled_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT 1`
      );
      if (pick.rows.length === 0) {
        await client.query('COMMIT');
        break;
      }
      const job = pick.rows[0];
      results.processed++;

      const osRes = await client.query(
        `SELECT situacao, status FROM ordens_servico WHERE id = $1`,
        [job.ordem_servico_id]
      );
      const osRow = osRes.rows[0];
      if (
        !osRow ||
        osRow.situacao === 'cancelada' ||
        osRow.status === 'cancelada'
      ) {
        await client.query(
          `UPDATE os_pos_venda_followup_jobs SET status = 'cancelado', skip_reason = COALESCE(skip_reason, 'OS cancelada'), updated_at = now() WHERE id = $1`,
          [job.id]
        );
        await client.query('COMMIT');
        results.cancelled++;
        continue;
      }

      const send = createWhatsAppSender(client, job.company_id);
      let sendRes;
      try {
        sendRes = await send(job.telefone, job.mensagem_renderizada);
      } catch (sendErr) {
        sendRes = { ok: false, error: sendErr?.message || String(sendErr) };
      }
      if (sendRes.ok) {
        await client.query(
          `UPDATE os_pos_venda_followup_jobs SET status = 'enviado', sent_at = now(), updated_at = now(), error_message = NULL WHERE id = $1`,
          [job.id]
        );
        results.sent++;
      } else {
        await client.query(
          `UPDATE os_pos_venda_followup_jobs SET status = 'erro', error_message = $2, updated_at = now() WHERE id = $1`,
          [job.id, sendRes.error || 'Erro ao enviar']
        );
        results.errors++;
      }
      await client.query('COMMIT');
    }
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    console.error('[OS Follow-up] Erro no worker:', e);
    throw e;
  } finally {
    client.release();
  }
  return results;
}
