/**
 * API: configuração e fila de follow-up pós-venda (WhatsApp).
 */
import express from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  getSettingsRow,
  mergeSettingsResponse,
  upsertSettings,
  scheduleFollowupForOs,
  normalizeWhatsappNumber,
} from '../services/osPosVendaFollowupService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const router = express.Router();
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
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
    const row = await getSettingsRow(pool, req.companyId);
    res.json(mergeSettingsResponse(row));
  } catch (e) {
    console.error('[OS Follow-up] GET settings:', e);
    res.status(500).json({ error: e.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    await upsertSettings(pool, req.companyId, req.body || {});
    const row = await getSettingsRow(pool, req.companyId);
    res.json(mergeSettingsResponse(row));
  } catch (e) {
    console.error('[OS Follow-up] PUT settings:', e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/jobs', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset || '0', 10) || 0, 0);
    const status = String(req.query.status || 'all');
    const search = String(req.query.search || '').trim();
    const where = ['j.company_id = $1'];
    const params = [req.companyId];

    if (status && status !== 'all') {
      params.push(status);
      where.push(`j.status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      where.push(`(
        o.cliente_nome ILIKE $${params.length}
        OR o.telefone_contato ILIKE $${params.length}
        OR j.telefone ILIKE $${params.length}
        OR o.marca_nome ILIKE $${params.length}
        OR o.modelo_nome ILIKE $${params.length}
        OR CAST(o.numero AS TEXT) ILIKE $${params.length}
      )`);
    }

    params.push(limit);
    const limitIndex = params.length;
    params.push(offset);
    const offsetIndex = params.length;

    const r = await pool.query(
      `SELECT j.id, j.ordem_servico_id, j.telefone, j.status, j.tipo_regra_envio,
              j.scheduled_at, j.sent_at, j.faturado_at, j.error_message, j.skip_reason,
              j.random_delay_seconds, j.created_at,
              o.numero AS numero_os,
              o.cliente_nome,
              o.telefone_contato,
              o.marca_nome,
              o.modelo_nome,
              LEFT(mensagem_renderizada, 200) AS mensagem_preview
       FROM os_pos_venda_followup_jobs j
       LEFT JOIN ordens_servico o ON o.id = j.ordem_servico_id
       WHERE ${where.join(' AND ')}
       ORDER BY j.created_at DESC
       LIMIT $${limitIndex}
       OFFSET $${offsetIndex}`,
      params
    );

    const countParams = params.slice(0, params.length - 2);
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM os_pos_venda_followup_jobs j
       LEFT JOIN ordens_servico o ON o.id = j.ordem_servico_id
       WHERE ${where.join(' AND ')}`,
      countParams
    );
    res.json({ jobs: r.rows, total: countResult.rows[0]?.total || 0, limit, offset });
  } catch (e) {
    console.error('[OS Follow-up] GET jobs:', e);
    res.status(500).json({ error: e.message });
  }
});

router.patch('/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { telefone, scheduled_at } = req.body || {};

    const existing = await pool.query(
      `SELECT id, status, telefone
       FROM os_pos_venda_followup_jobs
       WHERE id = $1 AND company_id = $2
       LIMIT 1`,
      [id, req.companyId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Registro não encontrado.' });
    }

    if (existing.rows[0].status === 'enviado') {
      return res.status(400).json({ error: 'Não é possível editar um follow-up já enviado.' });
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
      updates.push(`telefone = $${idx}`);
      values.push(normalized.e164);
    }

    if (scheduled_at !== undefined) {
      const date = new Date(scheduled_at);
      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({ error: 'Data/hora de agendamento inválida.' });
      }
      idx += 1;
      updates.push(`scheduled_at = $${idx}`);
      values.push(date.toISOString());
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhuma alteração informada.' });
    }

    idx += 1;
    updates.push(`updated_at = now()`);
    updates.push(`status = CASE WHEN status = 'erro' OR status = 'cancelado' THEN 'agendado' ELSE status END`);
    updates.push(`error_message = NULL`);
    updates.push(`skip_reason = NULL`);

    await pool.query(
      `UPDATE os_pos_venda_followup_jobs
       SET ${updates.join(', ')}
       WHERE id = $1 AND company_id = $2`,
      values
    );

    res.json({ success: true });
  } catch (e) {
    console.error('[OS Follow-up] PATCH job:', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM os_pos_venda_followup_jobs
       WHERE id = $1 AND company_id = $2`,
      [id, req.companyId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Registro não encontrado.' });
    }

    res.json({ success: true });
  } catch (e) {
    console.error('[OS Follow-up] DELETE job:', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/schedule', async (req, res) => {
  try {
    const { ordem_servico_id, faturado_at } = req.body || {};
    if (!ordem_servico_id) {
      return res.status(400).json({ error: 'ordem_servico_id obrigatório' });
    }
    const result = await scheduleFollowupForOs(
      pool,
      req.companyId,
      ordem_servico_id,
      faturado_at || null
    );
    res.json(result);
  } catch (e) {
    console.error('[OS Follow-up] POST schedule:', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
