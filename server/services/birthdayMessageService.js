/**
 * Agendamento e envio de mensagens de aniversário para clientes.
 */
import {
  addSeconds,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  differenceInYears,
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { createWhatsAppSender } from './alertService.js';
import { normalizeWhatsappNumber } from './osPosVendaFollowupService.js';

export { normalizeWhatsappNumber };

export const DEFAULT_BIRTHDAY_TEMPLATE = `🎉 *Feliz Aniversário!*

Olá {nome}! 🎂

Hoje é um dia muito especial. Desejamos muita saúde, alegria e conquistas neste novo ciclo.

Parabéns!
{empresa}`;

function formatLocalDateParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    sourceDate: `${map.year}-${map.month}-${map.day}`,
  };
}

function computeScheduledAtForToday(timeZone, horario) {
  const [hourRaw, minuteRaw] = String(horario || '09:00').split(':');
  const hour = Number(hourRaw) || 9;
  const minute = Number(minuteRaw) || 0;
  const zonedNow = toZonedTime(new Date(), timeZone);
  const localTarget = setMilliseconds(
    setSeconds(setMinutes(setHours(zonedNow, hour), minute), 0),
    0
  );
  return fromZonedTime(localTarget, timeZone);
}

function computeScheduledAtForDate(timeZone, horario, sourceDate) {
  if (!sourceDate) {
    return computeScheduledAtForToday(timeZone, horario);
  }

  const [yearRaw, monthRaw, dayRaw] = String(sourceDate).slice(0, 10).split('-');
  const [hourRaw, minuteRaw] = String(horario || '09:00').split(':');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw) || 9;
  const minute = Number(minuteRaw) || 0;

  if (!year || !month || !day) {
    return computeScheduledAtForToday(timeZone, horario);
  }

  const localTarget = new Date(year, month - 1, day, hour, minute, 0, 0);
  return fromZonedTime(localTarget, timeZone);
}

function normalizeDelaySettings(settings = {}) {
  const min = Math.max(0, Number(settings.delay_min_seconds ?? 40) || 0);
  const maxRaw = Math.max(0, Number(settings.delay_max_seconds ?? 60) || 0);
  return {
    delay_min_seconds: min,
    delay_max_seconds: Math.max(min, maxRaw),
  };
}

function randomDelaySeconds(min = 40, max = 60) {
  const normalizedMin = Math.max(0, Number(min) || 0);
  const normalizedMax = Math.max(normalizedMin, Number(max) || normalizedMin);
  return Math.floor(Math.random() * (normalizedMax - normalizedMin + 1)) + normalizedMin;
}

function renderBirthdayTemplate(template, vars) {
  let output = template || '';
  for (const [key, value] of Object.entries(vars)) {
    output = output.replace(new RegExp(`\\{${key}\\}`, 'gi'), value == null ? '' : String(value));
  }
  return output.trim();
}

function formatBirthday(dateValue) {
  if (!dateValue) return '';
  try {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
}

function resolveClientPhone(cliente) {
  return cliente?.whatsapp || cliente?.telefone || cliente?.telefone2 || '';
}

function buildCompanySignature(companyName) {
  return companyName ? `\n\n${companyName}` : '';
}

export async function getBirthdaySettingsRow(client, companyId) {
  const result = await client.query(
    `SELECT * FROM birthday_message_settings WHERE company_id = $1`,
    [companyId]
  );
  return result.rows[0] || null;
}

export function mergeBirthdaySettingsResponse(row) {
  if (!row) {
    return {
      ativo: false,
      horario_envio: '09:00',
      timezone: 'America/Sao_Paulo',
      template_mensagem: DEFAULT_BIRTHDAY_TEMPLATE,
      delay_min_seconds: 40,
      delay_max_seconds: 60,
    };
  }
  const delay = normalizeDelaySettings(row);
  return {
    ativo: !!row.ativo,
    horario_envio: row.horario_envio || '09:00',
    timezone: row.timezone || 'America/Sao_Paulo',
    template_mensagem: row.template_mensagem || DEFAULT_BIRTHDAY_TEMPLATE,
    delay_min_seconds: delay.delay_min_seconds,
    delay_max_seconds: delay.delay_max_seconds,
  };
}

export async function upsertBirthdaySettings(client, companyId, body) {
  const merged = mergeBirthdaySettingsResponse(body);
  await client.query(
    `INSERT INTO birthday_message_settings (
       company_id, ativo, horario_envio, timezone, template_mensagem, delay_min_seconds, delay_max_seconds
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (company_id) DO UPDATE SET
       ativo = EXCLUDED.ativo,
       horario_envio = EXCLUDED.horario_envio,
       timezone = EXCLUDED.timezone,
       template_mensagem = EXCLUDED.template_mensagem,
       delay_min_seconds = EXCLUDED.delay_min_seconds,
       delay_max_seconds = EXCLUDED.delay_max_seconds,
       updated_at = now()`,
    [
      companyId,
      !!merged.ativo,
      merged.horario_envio || '09:00',
      merged.timezone || 'America/Sao_Paulo',
      merged.template_mensagem || DEFAULT_BIRTHDAY_TEMPLATE,
      merged.delay_min_seconds,
      merged.delay_max_seconds,
    ]
  );
}

function buildBirthdayMessage(settingsRow, cliente, companyName, scheduledAt) {
  const settings = mergeBirthdaySettingsResponse(settingsRow);
  const birthDate = cliente?.data_nascimento ? new Date(cliente.data_nascimento) : null;
  const vars = {
    nome: cliente?.nome || 'Cliente',
    primeiro_nome: (cliente?.nome || 'Cliente').split(' ')[0],
    empresa: buildCompanySignature(companyName),
    data_aniversario: formatBirthday(cliente?.data_nascimento),
    horario_envio: scheduledAt.toLocaleString('pt-BR', { timeZone: settings.timezone || 'America/Sao_Paulo' }),
    idade: birthDate && !Number.isNaN(birthDate.getTime())
      ? String(differenceInYears(new Date(), birthDate))
      : '',
  };
  return renderBirthdayTemplate(settings.template_mensagem || DEFAULT_BIRTHDAY_TEMPLATE, vars);
}

export async function syncBirthdayJobsForCompany(pool, companyId, options = {}) {
  const { force = false, period = 'today' } = options;
  const client = await pool.connect();
  try {
    const settings = await getBirthdaySettingsRow(client, companyId);
    // Se NÃO foi forçado (chamada do worker automático) e empresa está inativa, pular.
    // Sync manual (force=true) sempre roda, para o usuário enxergar a fila.
    if (!force && (!settings || !settings.ativo)) {
      return {
        company_id: companyId,
        created: 0,
        duplicates: 0,
        cancelled: 0,
        skipped: 0,
        clientes_encontrados: 0,
        inativo: true,
      };
    }

    const effectiveSettings = settings || {
      horario_envio: '09:00',
      timezone: 'America/Sao_Paulo',
      template_mensagem: DEFAULT_BIRTHDAY_TEMPLATE,
    };

    const timeZone = effectiveSettings.timezone || 'America/Sao_Paulo';
    const delaySettings = normalizeDelaySettings(effectiveSettings);
    const localDate = formatLocalDateParts(new Date(), timeZone);
    const companyResult = await client.query('SELECT name FROM companies WHERE id = $1', [companyId]);
    const companyName = companyResult.rows[0]?.name || '';

    const birthdayDateExpression = `
      to_date(
        to_char(now() AT TIME ZONE $2, 'YYYY') ||
        lpad(EXTRACT(MONTH FROM data_nascimento)::text, 2, '0') ||
        lpad(EXTRACT(DAY FROM data_nascimento)::text, 2, '0'),
        'YYYYMMDD'
      )
    `;

    const periodFilter = period === 'month'
      ? `AND ${birthdayDateExpression} BETWEEN (now() AT TIME ZONE $2)::date
           AND ((date_trunc('month', now() AT TIME ZONE $2) + interval '1 month - 1 day')::date)`
      : `AND EXTRACT(MONTH FROM data_nascimento) = $3
         AND EXTRACT(DAY FROM data_nascimento) = $4`;

    const clientesResult = await client.query(
      `SELECT id, nome, whatsapp, telefone, telefone2, data_nascimento,
              to_char(${period === 'month' ? birthdayDateExpression : '$5::date'}, 'YYYY-MM-DD') AS birthday_source_date
       FROM clientes
       WHERE company_id = $1
         AND data_nascimento IS NOT NULL
         AND (situacao IS NULL OR situacao = '' OR situacao <> 'inativo')
         ${periodFilter}
       ORDER BY birthday_source_date, nome`,
      period === 'month'
        ? [companyId, timeZone]
        : [companyId, timeZone, localDate.month, localDate.day, localDate.sourceDate]
    );

    const summary = {
      company_id: companyId,
      created: 0,
      duplicates: 0,
      cancelled: 0,
      skipped: 0,
      clientes_encontrados: clientesResult.rows.length,
      data_referencia: localDate.sourceDate,
      periodo: period,
    };
    const delayByDate = new Map();

    for (const cliente of clientesResult.rows) {
      const sourceDate = String(cliente.birthday_source_date || localDate.sourceDate).slice(0, 10);
      const currentDelaySeconds = delayByDate.get(sourceDate) || 0;
      const scheduledAt = addSeconds(
        computeScheduledAtForDate(
          timeZone,
          effectiveSettings.horario_envio,
          sourceDate
        ),
        currentDelaySeconds
      );
      delayByDate.set(
        sourceDate,
        currentDelaySeconds + randomDelaySeconds(
          delaySettings.delay_min_seconds,
          delaySettings.delay_max_seconds
        )
      );
      const rawPhone = resolveClientPhone(cliente);
      const normalized = normalizeWhatsappNumber(rawPhone);
      const message = buildBirthdayMessage(effectiveSettings, cliente, companyName, scheduledAt);
      const status = normalized.ok ? 'agendado' : 'cancelado';
      const insertResult = await client.query(
        `INSERT INTO birthday_message_jobs (
           company_id, cliente_id, telefone, mensagem_renderizada, status,
           scheduled_at, source_date, template_key, skip_reason
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'birthday-default', $8)
         ON CONFLICT (company_id, cliente_id, source_date) DO UPDATE
           SET scheduled_at = CASE
                 WHEN birthday_message_jobs.status IN ('agendado', 'pendente', 'erro')
                   THEN EXCLUDED.scheduled_at
                 ELSE birthday_message_jobs.scheduled_at
               END,
               status = CASE
                 WHEN birthday_message_jobs.status IN ('agendado', 'pendente', 'erro')
                   THEN EXCLUDED.status
                 ELSE birthday_message_jobs.status
               END,
               telefone = CASE
                 WHEN birthday_message_jobs.status IN ('agendado', 'pendente', 'erro')
                   THEN EXCLUDED.telefone
                 ELSE birthday_message_jobs.telefone
               END,
               mensagem_renderizada = CASE
                 WHEN birthday_message_jobs.status IN ('agendado', 'pendente', 'erro')
                   THEN EXCLUDED.mensagem_renderizada
                 ELSE birthday_message_jobs.mensagem_renderizada
               END,
               skip_reason = CASE
                 WHEN birthday_message_jobs.status IN ('agendado', 'pendente', 'erro')
                   THEN EXCLUDED.skip_reason
                 ELSE birthday_message_jobs.skip_reason
               END,
               error_message = CASE
                 WHEN birthday_message_jobs.status = 'erro' THEN NULL
                 ELSE birthday_message_jobs.error_message
               END,
               updated_at = now()
         RETURNING id, (xmax <> 0) AS updated_existing`,
        [
          companyId,
          cliente.id,
          normalized.ok ? normalized.e164 : rawPhone || null,
          message,
          status,
          scheduledAt.toISOString(),
          sourceDate,
          normalized.ok ? null : (normalized.reason || 'Telefone inválido'),
        ]
      );

      if (insertResult.rows[0]?.updated_existing) {
        summary.duplicates += 1;
      } else if (status === 'cancelado') {
        summary.cancelled += 1;
      } else {
        summary.created += 1;
      }
    }

    return summary;
  } finally {
    client.release();
  }
}

export async function syncBirthdayJobs(pool, companyId = null, options = {}) {
  const { force = false, period = 'today' } = options;
  const client = await pool.connect();
  try {
    let companyIds = [];
    if (companyId) {
      companyIds = [companyId];
    } else {
      const result = await client.query(
        `SELECT company_id
         FROM birthday_message_settings
         WHERE ativo = true`
      );
      companyIds = result.rows.map((row) => row.company_id).filter(Boolean);
    }
    const totals = {
      companies: companyIds.length,
      created: 0,
      duplicates: 0,
      cancelled: 0,
      skipped: 0,
      clientes_encontrados: 0,
    };
    const details = [];
    for (const currentCompanyId of companyIds) {
      const result = await syncBirthdayJobsForCompany(pool, currentCompanyId, { force, period });
      details.push(result);
      totals.created += result.created;
      totals.duplicates += result.duplicates;
      totals.cancelled += result.cancelled;
      totals.skipped += result.skipped;
      totals.clientes_encontrados += (result.clientes_encontrados || 0);
    }
    return { ...totals, details };
  } finally {
    client.release();
  }
}

/**
 * Lista os aniversariantes do mês atual (ou de qualquer período curto), com o
 * status do agendamento da data do aniversário quando existir. Útil para o usuário enxergar
 * todos os clientes que vão fazer aniversário, mesmo antes de sincronizar.
 */
export async function listBirthdayClients(pool, companyId, options = {}) {
  const { period = 'month', timezone = 'America/Sao_Paulo', limit = 200 } = options;
  const localDate = formatLocalDateParts(new Date(), timezone);
  const birthdayDateExpression = `
    to_date(
      to_char(now() AT TIME ZONE $2, 'YYYY') ||
      lpad(EXTRACT(MONTH FROM c.data_nascimento)::text, 2, '0') ||
      lpad(EXTRACT(DAY FROM c.data_nascimento)::text, 2, '0'),
      'YYYYMMDD'
    )
  `;

  const filters = [
    `c.company_id = $1`,
    `c.data_nascimento IS NOT NULL`,
    `(c.situacao IS NULL OR c.situacao = '' OR c.situacao <> 'inativo')`,
  ];
  const params = [companyId, timezone];

  if (period === 'today') {
    filters.push(`${birthdayDateExpression} = (now() AT TIME ZONE $2)::date`);
  } else if (period === 'upcoming30') {
    // próximos 30 dias considerando rollover de mês
    filters.push(`(
      ${birthdayDateExpression} BETWEEN (now() AT TIME ZONE $2)::date
            AND ((now() AT TIME ZONE $2)::date + interval '30 days')::date
    )`);
  } else {
    // default: mês atual
    filters.push(`EXTRACT(MONTH FROM c.data_nascimento) = $3`);
    params.push(localDate.month);
  }

  params.push(limit);
  const limitIdx = params.length;

  const result = await pool.query(
    `SELECT
       c.id,
       c.nome,
       c.whatsapp,
       c.telefone,
       c.telefone2,
       c.email,
       c.data_nascimento,
       EXTRACT(DAY FROM c.data_nascimento)::int  AS dia,
       EXTRACT(MONTH FROM c.data_nascimento)::int AS mes,
       to_char(${birthdayDateExpression}, 'YYYY-MM-DD') AS source_date,
       j.id     AS job_id,
       j.status AS job_status,
       j.scheduled_at,
       j.sent_at,
       j.error_message,
       j.skip_reason,
       j.mensagem_renderizada
     FROM clientes c
     LEFT JOIN birthday_message_jobs j
       ON j.cliente_id = c.id
      AND j.company_id = c.company_id
      AND j.source_date = ${birthdayDateExpression}
     WHERE ${filters.join(' AND ')}
     ORDER BY EXTRACT(MONTH FROM c.data_nascimento), EXTRACT(DAY FROM c.data_nascimento), c.nome
     LIMIT $${limitIdx}`,
    params
  );

  return {
    period,
    today: localDate.sourceDate,
    total: result.rows.length,
    clientes: result.rows,
  };
}

/**
 * Garante (ou cria) um job de aniversário para um cliente específico em uma
 * data de referência (default: hoje, no fuso de SP). Retorna o job final.
 * Útil para o usuário editar/agendar manualmente a partir da lista de
 * "Aniversariantes do mês", mesmo quando ainda não há job sincronizado.
 */
export async function ensureBirthdayJobForClient(pool, companyId, clienteId, options = {}) {
  const { sourceDate = null, scheduledAt = null, mensagem = null } = options;

  const client = await pool.connect();
  try {
    const settingsRow = await getBirthdaySettingsRow(client, companyId);
    const effectiveSettings = settingsRow || {
      horario_envio: '09:00',
      timezone: 'America/Sao_Paulo',
      template_mensagem: DEFAULT_BIRTHDAY_TEMPLATE,
    };
    const timeZone = effectiveSettings.timezone || 'America/Sao_Paulo';
    const localDate = formatLocalDateParts(new Date(), timeZone);
    const finalSourceDate = sourceDate || localDate.sourceDate;

    const clienteResult = await client.query(
      `SELECT id, nome, whatsapp, telefone, telefone2, data_nascimento
       FROM clientes
       WHERE id = $1 AND company_id = $2
       LIMIT 1`,
      [clienteId, companyId]
    );
    const cliente = clienteResult.rows[0];
    if (!cliente) {
      throw new Error('Cliente não encontrado.');
    }

    const companyResult = await client.query(
      'SELECT name FROM companies WHERE id = $1',
      [companyId]
    );
    const companyName = companyResult.rows[0]?.name || '';

    const finalScheduledAt = scheduledAt
      ? new Date(scheduledAt)
      : computeScheduledAtForDate(timeZone, effectiveSettings.horario_envio, finalSourceDate);

    const rawPhone = resolveClientPhone(cliente);
    const normalized = normalizeWhatsappNumber(rawPhone);

    const renderedMessage = mensagem && String(mensagem).trim().length > 0
      ? String(mensagem).trim()
      : buildBirthdayMessage(effectiveSettings, cliente, companyName, finalScheduledAt);

    const status = normalized.ok ? 'agendado' : 'cancelado';
    const skipReason = normalized.ok ? null : (normalized.reason || 'Telefone inválido');

    const insertResult = await client.query(
      `INSERT INTO birthday_message_jobs (
         company_id, cliente_id, telefone, mensagem_renderizada, status,
         scheduled_at, source_date, template_key, skip_reason
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'birthday-default', $8)
       ON CONFLICT (company_id, cliente_id, source_date) DO UPDATE
         SET telefone = EXCLUDED.telefone,
             mensagem_renderizada = EXCLUDED.mensagem_renderizada,
             status = EXCLUDED.status,
             scheduled_at = EXCLUDED.scheduled_at,
             skip_reason = EXCLUDED.skip_reason,
             error_message = NULL,
             updated_at = now()
       RETURNING *`,
      [
        companyId,
        cliente.id,
        normalized.ok ? normalized.e164 : (rawPhone || null),
        renderedMessage,
        status,
        finalScheduledAt.toISOString(),
        finalSourceDate,
        skipReason,
      ]
    );

    return insertResult.rows[0];
  } finally {
    client.release();
  }
}

export async function processDueBirthdayMessages(pool, batchSize = 25, companyId = null) {
  const client = await pool.connect();
  const results = { processed: 0, sent: 0, errors: 0, cancelled: 0 };
  try {
    for (let i = 0; i < batchSize; i += 1) {
      await client.query('BEGIN');
      const where = [`status IN ('pendente', 'agendado')`, 'scheduled_at <= now()'];
      const params = [];
      if (companyId) {
        params.push(companyId);
        where.push(`company_id = $${params.length}`);
      }
      const pick = await client.query(
        `SELECT *
         FROM birthday_message_jobs
         WHERE ${where.join(' AND ')}
         ORDER BY scheduled_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT 1`,
        params
      );

      if (pick.rows.length === 0) {
        await client.query('COMMIT');
        break;
      }

      const job = pick.rows[0];
      results.processed += 1;

      const clienteResult = await client.query(
        `SELECT id, nome, situacao
         FROM clientes
         WHERE id = $1 AND company_id = $2
         LIMIT 1`,
        [job.cliente_id, job.company_id]
      );

      const cliente = clienteResult.rows[0];
      if (!cliente || cliente.situacao === 'inativo') {
        await client.query(
          `UPDATE birthday_message_jobs
           SET status = 'cancelado',
               skip_reason = COALESCE(skip_reason, 'Cliente indisponível'),
               updated_at = now()
           WHERE id = $1`,
          [job.id]
        );
        await client.query('COMMIT');
        results.cancelled += 1;
        continue;
      }

      const sender = createWhatsAppSender(client, job.company_id);
      let sendResult;
      try {
        sendResult = await sender(job.telefone, job.mensagem_renderizada, {
          name: cliente.nome,
        });
      } catch (sendErr) {
        sendResult = { ok: false, error: sendErr?.message || String(sendErr) };
      }

      if (sendResult.ok) {
        await client.query(
          `UPDATE birthday_message_jobs
           SET status = 'enviado',
               sent_at = now(),
               error_message = NULL,
               updated_at = now()
           WHERE id = $1`,
          [job.id]
        );
        results.sent += 1;
      } else {
        await client.query(
          `UPDATE birthday_message_jobs
           SET status = 'erro',
               error_message = $2,
               updated_at = now()
           WHERE id = $1`,
          [job.id, sendResult.error || 'Erro ao enviar']
        );
        results.errors += 1;
      }

      await client.query('COMMIT');
    }
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    console.error('[Birthday Message Worker] Erro:', error);
    throw error;
  } finally {
    client.release();
  }
  return results;
}
