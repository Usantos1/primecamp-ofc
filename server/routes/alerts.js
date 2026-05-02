/**
 * Rotas do Painel de Alertas — configuração, catálogo, logs e teste de envio.
 * Todas as operações são filtradas por req.companyId (multi-tenant).
 */

import express from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  getPanelConfig,
  savePanelConfig,
  getAlertCatalog,
  getAlertConfigs,
  getAlertConfig,
  saveAlertConfig,
  saveAlertConfigsBulk,
  getLogs,
  getLogsCount,
  dispatch,
  renderTemplate,
  createWhatsAppSender,
} from '../services/alertService.js';

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
      error: 'Usuário sem empresa vinculada. Vincule o usuário a uma empresa em Configurações.',
      codigo: 'COMPANY_ID_REQUIRED',
    });
  }
  next();
};
router.use(requireCompanyId);

/** Envio via WhatsApp usando o serviço central (Ativa CRM). */
function sendViaWhatsApp(companyId, number, body) {
  const sender = createWhatsAppSender(pool, companyId, { tokenKind: 'sensitive' });
  return sender(number, body);
}

// ─── Configuração geral do painel ─────────────────────────────────────────

router.get('/panel', async (req, res) => {
  try {
    const config = await getPanelConfig(pool, req.companyId);
    if (!config) {
      return res.json({
        nome_painel: 'Painel de Alertas',
        ativo: false,
        numero_principal: '',
        numeros_adicionais: [],
        horario_inicio_envio: '08:00',
        horario_fim_envio: '22:00',
        timezone: 'America/Sao_Paulo',
        relatorio_diario_ativo: false,
        horario_relatorio_diario: '19:00',
        resumo_semanal_ativo: false,
        dia_resumo_semanal: 0,
        horario_resumo_semanal: '09:00',
        canal_padrao: 'whatsapp',
      });
    }
    const row = { ...config };
    if (row.horario_inicio_envio) row.horario_inicio_envio = String(row.horario_inicio_envio).slice(0, 5);
    if (row.horario_fim_envio) row.horario_fim_envio = String(row.horario_fim_envio).slice(0, 5);
    if (row.horario_relatorio_diario) row.horario_relatorio_diario = String(row.horario_relatorio_diario).slice(0, 5);
    if (row.horario_resumo_semanal) row.horario_resumo_semanal = String(row.horario_resumo_semanal).slice(0, 5);
    res.json(row);
  } catch (err) {
    console.error('[Alerts] GET panel:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/panel', async (req, res) => {
  try {
    const data = req.body;
    const config = await savePanelConfig(pool, req.companyId, data);
    const row = config ? { ...config } : {};
    if (row.horario_inicio_envio) row.horario_inicio_envio = String(row.horario_inicio_envio).slice(0, 5);
    if (row.horario_fim_envio) row.horario_fim_envio = String(row.horario_fim_envio).slice(0, 5);
    if (row.horario_relatorio_diario) row.horario_relatorio_diario = String(row.horario_relatorio_diario).slice(0, 5);
    if (row.horario_resumo_semanal) row.horario_resumo_semanal = String(row.horario_resumo_semanal).slice(0, 5);
    res.json(row);
  } catch (err) {
    console.error('[Alerts] PUT panel:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Catálogo de alertas (somente leitura) ─────────────────────────────────

router.get('/catalog', async (req, res) => {
  try {
    const rows = await getAlertCatalog(pool);
    res.json(rows);
  } catch (err) {
    console.error('[Alerts] GET catalog:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Configurações por alerta ──────────────────────────────────────────────

router.get('/configs', async (req, res) => {
  try {
    const rows = await getAlertConfigs(pool, req.companyId);
    res.json(rows);
  } catch (err) {
    console.error('[Alerts] GET configs:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/configs', async (req, res) => {
  try {
    const configs = Array.isArray(req.body) ? req.body : (req.body.configs ? req.body.configs : []);
    await saveAlertConfigsBulk(pool, req.companyId, configs);
    const rows = await getAlertConfigs(pool, req.companyId);
    res.json(rows);
  } catch (err) {
    console.error('[Alerts] PUT configs:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/configs/:codigo', async (req, res) => {
  try {
    const codigo = req.params.codigo;
    const row = await saveAlertConfig(pool, req.companyId, codigo, req.body);
    res.json(row);
  } catch (err) {
    console.error('[Alerts] PUT configs/:codigo:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Logs ─────────────────────────────────────────────────────────────────

router.get('/logs', async (req, res) => {
  try {
    const { periodo_inicio, periodo_fim, categoria, status, codigo_alerta, limit, offset } = req.query;
    const filters = {};
    if (periodo_inicio) filters.periodo_inicio = periodo_inicio;
    if (periodo_fim) filters.periodo_fim = periodo_fim;
    if (categoria) filters.categoria = categoria;
    if (status) filters.status = status;
    if (codigo_alerta) filters.codigo_alerta = codigo_alerta;
    if (limit) filters.limit = Math.min(parseInt(limit, 10) || 100, 200);
    if (offset) filters.offset = Math.max(0, parseInt(offset, 10) || 0);
    const rows = await getLogs(pool, req.companyId, filters);
    const total = await getLogsCount(pool, req.companyId, filters);
    res.json({ rows, total });
  } catch (err) {
    console.error('[Alerts] GET logs:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Teste de envio ──────────────────────────────────────────────────────

router.post('/test', async (req, res) => {
  try {
    const panel = await getPanelConfig(pool, req.companyId);
    const numero = req.body?.numero || panel?.numero_principal;
    if (!numero) {
      return res.status(400).json({ error: 'Configure um número principal no painel ou envie "numero" no body.' });
    }
    const body = req.body?.mensagem || 'Teste do Painel de Alertas. Se você recebeu esta mensagem, o envio está funcionando.';
    const result = await sendViaWhatsApp(req.companyId, numero, body);
    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, message: 'Mensagem de teste enviada com sucesso.' });
  } catch (err) {
    console.error('[Alerts] POST test:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Pré-visualização de template ──────────────────────────────────────────

router.post('/preview', (req, res) => {
  try {
    const { template, payload = {} } = req.body;
    const mensagem = renderTemplate(template || '', payload);
    res.json({ mensagem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Disparar alerta (para uso após criar OS, fechar caixa, etc.) ───────────

router.post('/fire', async (req, res) => {
  try {
    const { codigo_alerta: codigoAlerta, payload = {} } = req.body;
    if (!codigoAlerta || typeof codigoAlerta !== 'string') {
      return res.status(400).json({ error: 'codigo_alerta é obrigatório (ex.: os.criada, caixa.fechado)' });
    }
    const companyId = req.companyId;
    const sendMessage = createWhatsAppSender(pool, companyId, { tokenKind: 'sensitive' });
    const result = await dispatch({
      companyId,
      codigoAlerta,
      payload,
      sendMessage,
      db: pool,
    });
    if (!result.sent) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, destinatarios: result.destinatarios });
  } catch (err) {
    console.error('[Alerts] POST fire:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
