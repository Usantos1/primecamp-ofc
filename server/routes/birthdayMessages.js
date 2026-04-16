/**
 * API: configuração e fila de mensagens de aniversário.
 */
import express from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  getBirthdaySettingsRow,
  mergeBirthdaySettingsResponse,
  upsertBirthdaySettings,
  syncBirthdayJobs,
  processDueBirthdayMessages,
  syncBirthdayJobsForCompany,
  normalizeWhatsappNumber,
} from '../services/birthdayMessageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const router = express.Router();
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const requireCompanyId = (req, res, next) => {
  if (!req.companyId) {
    return res.status(403).json({
      error: 'Usuário sem empresa vinculada.',
      codigo: 'COMPANY_ID_REQUIRED',
    });
  }
  next();
};

router.use(requireCompanyId);

router.get('/settings', async (req, res) => {
  try {
    const row = await getBirthdaySettingsRow(pool, req.companyId);
    res.json(mergeBirthdaySettingsResponse(row));
  } catch (error) {
    console.error('[Birthday Messages] GET settings:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    await upsertBirthdaySettings(pool, req.companyId, req.body || {});
    const row = await getBirthdaySettingsRow(pool, req.companyId);
    const syncResult = await syncBirthdayJobsForCompany(pool, req.companyId);
    res.json({
      ...mergeBirthdaySettingsResponse(row),
      sync: syncResult,
    });
  } catch (error) {
    console.error('[Birthday Messages] PUT settings:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/jobs', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '100', 10) || 100, 300);
    const status = req.query.status ? String(req.query.status) : null;
    const period = req.query.period ? String(req.query.period) : 'today';

    const where = ['j.company_id = $1'];
    const params = [req.companyId];
    let idx = params.length;

    if (status && status !== 'all') {
      idx += 1;
      where.push(`j.status = $${idx}`);
      params.push(status);
    }

    if (period === 'today') {
      where.push(`j.source_date = timezone('America/Sao_Paulo', now())::date`);
    } else if (period === 'upcoming') {
      where.push(`j.scheduled_at >= now() - interval '1 day'`);
    }

    idx += 1;
    params.push(limit);

    const result = await pool.query(
      `SELECT j.id, j.cliente_id, j.telefone, j.status, j.scheduled_at, j.sent_at,
              j.error_message, j.skip_reason, j.created_at, j.updated_at, j.source_date,
              LEFT(j.mensagem_renderizada, 240) AS mensagem_preview,
              c.nome AS cliente_nome, c.whatsapp AS cliente_whatsapp, c.telefone AS cliente_telefone,
              c.telefone2 AS cliente_telefone2, c.data_nascimento
       FROM birthday_message_jobs j
       LEFT JOIN clientes c ON c.id = j.cliente_id
       WHERE ${where.join(' AND ')}
       ORDER BY j.scheduled_at DESC, j.created_at DESC
       LIMIT $${idx}`,
      params
    );

    const summaryResult = await pool.query(
      `SELECT
         COUNT(*)::int AS total_jobs,
         COUNT(*) FILTER (WHERE status IN ('agendado', 'pendente'))::int AS pending_jobs,
         COUNT(*) FILTER (WHERE status = 'enviado')::int AS sent_jobs,
         COUNT(*) FILTER (WHERE status = 'erro')::int AS error_jobs,
         COUNT(*) FILTER (WHERE status = 'cancelado')::int AS cancelled_jobs
       FROM birthday_message_jobs
       WHERE company_id = $1
         AND source_date = timezone('America/Sao_Paulo', now())::date`,
      [req.companyId]
    );

    res.json({
      jobs: result.rows,
      summary: summaryResult.rows[0] || {
        total_jobs: 0,
        pending_jobs: 0,
        sent_jobs: 0,
        error_jobs: 0,
        cancelled_jobs: 0,
      },
    });
  } catch (error) {
    console.error('[Birthday Messages] GET jobs:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { telefone, scheduled_at, status } = req.body || {};
    const existing = await pool.query(
      `SELECT id, status
       FROM birthday_message_jobs
       WHERE id = $1 AND company_id = $2
       LIMIT 1`,
      [id, req.companyId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    const updates = [];
    const values = [id, req.companyId];
    let idx = values.length;

    if (telefone !== undefined) {
      const normalized = normalizeWhatsappNumber(telefone);
      if (!normalized.ok) {
        return res.status(400).json({ error: normalized.reason || 'Telefone inválido.' });
      }
      idx += 1;
      values.push(normalized.e164);
      updates.push(`telefone = $${idx}`);
    }

    if (scheduled_at !== undefined) {
      const parsed = new Date(scheduled_at);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'Data/hora inválida.' });
      }
      idx += 1;
      values.push(parsed.toISOString());
      updates.push(`scheduled_at = $${idx}`);
    }

    if (status !== undefined) {
      const allowed = ['agendado', 'pendente', 'cancelado'];
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: 'Status inválido.' });
      }
      idx += 1;
      values.push(status);
      updates.push(`status = $${idx}`);
    } else {
      updates.push(`status = CASE WHEN status IN ('erro', 'cancelado') THEN 'agendado' ELSE status END`);
    }

    updates.push('error_message = NULL');
    updates.push('skip_reason = NULL');
    updates.push('updated_at = now()');

    await pool.query(
      `UPDATE birthday_message_jobs
       SET ${updates.join(', ')}
       WHERE id = $1 AND company_id = $2`,
      values
    );

    res.json({ success: true });
  } catch (error) {
    console.error('[Birthday Messages] PATCH job:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM birthday_message_jobs
       WHERE id = $1 AND company_id = $2`,
      [id, req.companyId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Birthday Messages] DELETE job:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/sync', async (req, res) => {
  try {
    const result = await syncBirthdayJobs(pool, req.companyId);
    res.json(result);
  } catch (error) {
    console.error('[Birthday Messages] POST sync:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/process', async (req, res) => {
  try {
    const result = await processDueBirthdayMessages(pool, 30, req.companyId);
    res.json(result);
  } catch (error) {
    console.error('[Birthday Messages] POST process:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
