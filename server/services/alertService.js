/**
 * Serviço central de alertas — Painel de Alertas (Ativa FIX ↔ Ativa CRM).
 * Responsável por: config do painel, config por alerta, renderização de templates,
 * validação de regras de disparo e envio via canal (WhatsApp/Ativa CRM).
 * Tudo isolado por company_id.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// ─── AlertTemplateRenderer: substitui variáveis no template ─────────────────
const DEFAULT_VARS = [
  'cliente', 'numero_os', 'status', 'marca', 'modelo', 'usuario', 'usuario_caixa', 'valor',
  'descricao', 'data_vencimento', 'total_vendas', 'quantidade_vendas', 'ticket_medio',
  'empresa', 'link_os', 'defeito', 'cliente_cpf', 'cliente_endereco', 'valor_abertura', 'valor_fechamento', 'meta', 'horario',
  'dias', 'tipo', 'id', 'campo', 'valor_anterior', 'valor_novo', 'limite', 'operador_nome'
];

// Variáveis que devem ser formatadas como moeda (R$) quando o valor for numérico.
const CURRENCY_VARS = new Set([
  'valor', 'valor_abertura', 'valor_fechamento', 'total_vendas',
  'ticket_medio', 'meta', 'valor_anterior', 'valor_novo', 'limite'
]);

function formatBRL(num) {
  try {
    return `R$ ${Number(num).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } catch {
    return `R$ ${Number(num).toFixed(2).replace('.', ',')}`;
  }
}

function parseCurrencyNumber(value) {
  if (typeof value === 'number') return value;
  const cleaned = String(value).trim().replace(/[^\d.,-]/g, '');
  if (!cleaned) return NaN;

  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');

  if (lastDot !== -1 && lastComma !== -1) {
    // Usa o último separador como decimal: "1.650,00" e "1,650.00".
    return lastComma > lastDot
      ? Number(cleaned.replace(/\./g, '').replace(',', '.'))
      : Number(cleaned.replace(/,/g, ''));
  }

  if (lastComma !== -1) {
    return Number(cleaned.replace(/\./g, '').replace(',', '.'));
  }

  if (lastDot !== -1) {
    const [, decimals = ''] = cleaned.split('.');
    if (decimals.length === 3) return Number(cleaned.replace(/\./g, ''));
  }

  return Number(cleaned);
}

function maybeFormatCurrency(key, value) {
  if (!CURRENCY_VARS.has(key)) return value;
  if (value == null || value === '') return value;
  // Se já parece formatado (contém "R$"), mantém.
  if (typeof value === 'string' && /r\$/i.test(value)) return value;
  const num = parseCurrencyNumber(value);
  if (!Number.isFinite(num)) return value;
  return formatBRL(num);
}

/**
 * Substitui {variavel} e #{numero_os} no template pelos valores do payload.
 * Aplica formatação de moeda (R$) automaticamente para variáveis monetárias.
 * @param {string} template - Texto com placeholders
 * @param {Record<string, any>} payload - Dados do evento
 * @returns {string} Mensagem final
 */
export function renderTemplate(template, payload = {}) {
  if (!template || typeof template !== 'string') return '';
  let out = template;
  const vars = { ...payload };

  // Caixa fechado: operador do caixa — alguns clients não enviam usuario_caixa; template pode usar {usuario_caixa} ou [usuario_caixa]
  const uNome = vars.usuario != null && String(vars.usuario).trim() !== '' ? String(vars.usuario).trim() : '';
  const opNome = vars.operador_nome != null && String(vars.operador_nome).trim() !== '' ? String(vars.operador_nome).trim() : '';
  const uCaixaRaw = vars.usuario_caixa != null && String(vars.usuario_caixa).trim() !== '' ? String(vars.usuario_caixa).trim() : '';
  vars.usuario_caixa = uCaixaRaw || uNome || opNome;

  for (const key of Object.keys(vars)) {
    vars[key] = maybeFormatCurrency(key, vars[key]);
  }
  for (const key of DEFAULT_VARS) {
    if (vars[key] === undefined) vars[key] = `[${key}]`;
  }
  for (const [key, value] of Object.entries(vars)) {
    const val = value == null ? '' : String(value);
    out = out.replace(new RegExp(`\\{${key}\\}`, 'gi'), val);
    out = out.replace(new RegExp(`#\\{${key}\\}`, 'gi'), val);
    // Templates salvos com colchetes (erro comum) em vez de chaves
    out = out.replace(new RegExp(`\\[${key}\\]`, 'gi'), val);
  }
  // #{numero_os} sem chave no payload
  out = out.replace(/#\{numero_os\}/gi, vars.numero_os ?? payload.numero_os ?? '[numero_os]');
  return out;
}

// ─── AlertLogService: grava e consulta logs ─────────────────────────────────

export async function logAlert(client, { company_id, codigo_alerta, categoria, destino, payload, mensagem_final, status, erro, enviado_em }) {
  const q = `
    INSERT INTO alert_logs (company_id, codigo_alerta, categoria, destino, payload, mensagem_final, status, erro, enviado_em)
    VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
    RETURNING id
  `;
  const res = await client.query(q, [
    company_id,
    codigo_alerta,
    categoria || null,
    destino,
    payload ? JSON.stringify(payload) : null,
    mensagem_final || null,
    status,
    erro || null,
    enviado_em || new Date(),
  ]);
  return res.rows[0]?.id;
}

export async function getLogs(poolOrClient, companyId, filters = {}) {
  const client = poolOrClient;
  const { periodo_inicio, periodo_fim, categoria, status, codigo_alerta, limit = 100, offset = 0 } = filters;
  let sql = `
    SELECT id, company_id, codigo_alerta, categoria, destino, payload, mensagem_final, status, erro, enviado_em, created_at
    FROM alert_logs
    WHERE company_id = $1
  `;
  const params = [companyId];
  let idx = 2;
  if (periodo_inicio) {
    sql += ` AND created_at >= $${idx}`;
    params.push(periodo_inicio);
    idx++;
  }
  if (periodo_fim) {
    sql += ` AND created_at <= $${idx}`;
    params.push(periodo_fim);
    idx++;
  }
  if (categoria) {
    sql += ` AND categoria = $${idx}`;
    params.push(categoria);
    idx++;
  }
  if (status) {
    sql += ` AND status = $${idx}`;
    params.push(status);
    idx++;
  }
  if (codigo_alerta) {
    sql += ` AND codigo_alerta = $${idx}`;
    params.push(codigo_alerta);
    idx++;
  }
  sql += ` ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
  params.push(limit, offset);
  const result = await client.query(sql, params);
  return result.rows;
}

export async function getLogsCount(poolOrClient, companyId, filters = {}) {
  const client = poolOrClient;
  const { periodo_inicio, periodo_fim, categoria, status, codigo_alerta } = filters;
  let sql = `SELECT COUNT(*) AS total FROM alert_logs WHERE company_id = $1`;
  const params = [companyId];
  let idx = 2;
  if (periodo_inicio) { sql += ` AND created_at >= $${idx}`; params.push(periodo_inicio); idx++; }
  if (periodo_fim) { sql += ` AND created_at <= $${idx}`; params.push(periodo_fim); idx++; }
  if (categoria) { sql += ` AND categoria = $${idx}`; params.push(categoria); idx++; }
  if (status) { sql += ` AND status = $${idx}`; params.push(status); idx++; }
  if (codigo_alerta) { sql += ` AND codigo_alerta = $${idx}`; params.push(codigo_alerta); idx++; }
  const result = await client.query(sql, params);
  return parseInt(result.rows[0]?.total || '0', 10);
}

// ─── AlertService: configuração do painel e por alerta ─────────────────────

export async function getPanelConfig(poolOrClient, companyId) {
  const res = await poolOrClient.query(
    `SELECT * FROM alert_panel_config WHERE company_id = $1`,
    [companyId]
  );
  return res.rows[0] || null;
}

export async function savePanelConfig(poolOrClient, companyId, data) {
  const {
    nome_painel, ativo, numero_principal, numeros_adicionais,
    horario_inicio_envio, horario_fim_envio, timezone,
    relatorio_diario_ativo, horario_relatorio_diario,
    resumo_semanal_ativo, dia_resumo_semanal, horario_resumo_semanal,
    canal_padrao
  } = data;
  const res = await poolOrClient.query(`
    INSERT INTO alert_panel_config (
      company_id, nome_painel, ativo, numero_principal, numeros_adicionais,
      horario_inicio_envio, horario_fim_envio, timezone,
      relatorio_diario_ativo, horario_relatorio_diario,
      resumo_semanal_ativo, dia_resumo_semanal, horario_resumo_semanal,
      canal_padrao, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
    ON CONFLICT (company_id) DO UPDATE SET
      nome_painel = COALESCE(EXCLUDED.nome_painel, alert_panel_config.nome_painel),
      ativo = COALESCE(EXCLUDED.ativo, alert_panel_config.ativo),
      numero_principal = COALESCE(EXCLUDED.numero_principal, alert_panel_config.numero_principal),
      numeros_adicionais = COALESCE(EXCLUDED.numeros_adicionais, alert_panel_config.numeros_adicionais),
      horario_inicio_envio = COALESCE(EXCLUDED.horario_inicio_envio, alert_panel_config.horario_inicio_envio),
      horario_fim_envio = COALESCE(EXCLUDED.horario_fim_envio, alert_panel_config.horario_fim_envio),
      timezone = COALESCE(EXCLUDED.timezone, alert_panel_config.timezone),
      relatorio_diario_ativo = COALESCE(EXCLUDED.relatorio_diario_ativo, alert_panel_config.relatorio_diario_ativo),
      horario_relatorio_diario = COALESCE(EXCLUDED.horario_relatorio_diario, alert_panel_config.horario_relatorio_diario),
      resumo_semanal_ativo = COALESCE(EXCLUDED.resumo_semanal_ativo, alert_panel_config.resumo_semanal_ativo),
      dia_resumo_semanal = COALESCE(EXCLUDED.dia_resumo_semanal, alert_panel_config.dia_resumo_semanal),
      horario_resumo_semanal = COALESCE(EXCLUDED.horario_resumo_semanal, alert_panel_config.horario_resumo_semanal),
      canal_padrao = COALESCE(EXCLUDED.canal_padrao, alert_panel_config.canal_padrao),
      updated_at = NOW()
  `, [
    companyId, nome_painel ?? 'Painel de Alertas', ativo ?? false, numero_principal ?? null,
    numeros_adicionais && Array.isArray(numeros_adicionais) ? numeros_adicionais : null,
    horario_inicio_envio ?? null, horario_fim_envio ?? null, timezone ?? 'America/Sao_Paulo',
    relatorio_diario_ativo ?? false, horario_relatorio_diario ?? null,
    resumo_semanal_ativo ?? false, dia_resumo_semanal ?? null, horario_resumo_semanal ?? null,
    canal_padrao ?? 'whatsapp'
  ]);
  const row = await poolOrClient.query(
    `SELECT * FROM alert_panel_config WHERE company_id = $1`,
    [companyId]
  );
  return row.rows[0];
}

export async function getAlertCatalog(poolOrClient) {
  const res = await poolOrClient.query(
    `SELECT codigo_alerta, categoria, nome, descricao, variaveis_disponiveis, tipo_disparo, ativo_por_padrao, template_padrao, prioridade_padrao FROM alert_catalog ORDER BY categoria, nome`
  );
  return res.rows;
}

export async function getAlertConfigs(poolOrClient, companyId) {
  const res = await poolOrClient.query(
    `SELECT * FROM alert_config WHERE company_id = $1`,
    [companyId]
  );
  return res.rows;
}

export async function getAlertConfig(poolOrClient, companyId, codigoAlerta) {
  const res = await poolOrClient.query(
    `SELECT * FROM alert_config WHERE company_id = $1 AND codigo_alerta = $2`,
    [companyId, codigoAlerta]
  );
  return res.rows[0] || null;
}

export async function saveAlertConfig(poolOrClient, companyId, codigoAlerta, data) {
  const { ativo, usar_destinatarios_globais, numeros_destino, prioridade, template_mensagem, permitir_edicao_template } = data;
  await poolOrClient.query(`
    INSERT INTO alert_config (company_id, codigo_alerta, ativo, usar_destinatarios_globais, numeros_destino, prioridade, template_mensagem, permitir_edicao_template, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    ON CONFLICT (company_id, codigo_alerta) DO UPDATE SET
      ativo = COALESCE(EXCLUDED.ativo, alert_config.ativo),
      usar_destinatarios_globais = COALESCE(EXCLUDED.usar_destinatarios_globais, alert_config.usar_destinatarios_globais),
      numeros_destino = EXCLUDED.numeros_destino,
      prioridade = COALESCE(EXCLUDED.prioridade, alert_config.prioridade),
      template_mensagem = EXCLUDED.template_mensagem,
      permitir_edicao_template = COALESCE(EXCLUDED.permitir_edicao_template, alert_config.permitir_edicao_template),
      updated_at = NOW()
  `, [
    companyId, codigoAlerta, ativo ?? false, usar_destinatarios_globais ?? true,
    numeros_destino && Array.isArray(numeros_destino) ? numeros_destino : null,
    prioridade ?? 0, template_mensagem ?? null, permitir_edicao_template ?? true
  ]);
  return getAlertConfig(poolOrClient, companyId, codigoAlerta);
}

export async function saveAlertConfigsBulk(poolOrClient, companyId, configs) {
  for (const { codigo_alerta, ...data } of configs) {
    await saveAlertConfig(poolOrClient, companyId, codigo_alerta, data);
  }
  return getAlertConfigs(poolOrClient, companyId);
}

// ─── AlertDispatcher: valida e envia alertas ───────────────────────────────

/**
 * Verifica se o horário atual está dentro da janela permitida (considerando timezone).
 * @param {string} timezone - ex: America/Sao_Paulo
 * @param {string} inicio - ex: 08:00
 * @param {string} fim - ex: 22:00
 * @returns {boolean}
 */
export function isWithinTimeWindow(timezone, inicio, fim) {
  if (!inicio || !fim) return true;
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false });
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === 'hour').value, 10);
    const minute = parseInt(parts.find(p => p.type === 'minute').value, 10);
    const currentMinutes = hour * 60 + minute;
    const [hi, mi] = inicio.split(':').map(Number);
    const [hf, mf] = fim.split(':').map(Number);
    const startMinutes = (hi || 0) * 60 + (mi || 0);
    const endMinutes = (hf || 23) * 60 + (mf || 59);
    if (startMinutes <= endMinutes) return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  } catch {
    return true;
  }
}

/**
 * Dispara um alerta: valida painel, alerta, janela horária, monta mensagem e envia via canal.
 * O envio real (WhatsApp) deve ser feito pela rota que chama, passando um sender.
 * @param {object} options
 * @param {string} options.companyId
 * @param {string} options.codigoAlerta
 * @param {Record<string, any>} options.payload
 * @param {function(string, string): Promise<{ ok: boolean, error?: string }>} options.sendMessage - (number, body) => Promise
 * @param {import('pg').Pool | import('pg').Client} options.db - pool ou client
 * @returns {Promise<{ sent: boolean, error?: string, destinatarios?: string[] }>}
 */
export async function dispatch(options) {
  const { companyId, codigoAlerta, payload = {}, sendMessage, db } = options;
  const client = db || pool;
  if (!companyId || !codigoAlerta) {
    return { sent: false, error: 'companyId e codigoAlerta são obrigatórios' };
  }

  const panel = await getPanelConfig(client, companyId);
  if (!panel) return { sent: false, error: 'Painel não configurado para esta empresa' };
  if (!panel.ativo) return { sent: false, error: 'Painel de alertas desativado' };

  const alertConf = await getAlertConfig(client, companyId, codigoAlerta);
  const catalogRow = (await client.query(
    `SELECT categoria, nome, template_padrao, prioridade_padrao, ativo_por_padrao FROM alert_catalog WHERE codigo_alerta = $1`,
    [codigoAlerta]
  )).rows[0];
  if (!catalogRow) return { sent: false, error: 'Alerta não encontrado no catálogo' };

  const ativo = alertConf ? alertConf.ativo : (catalogRow.ativo_por_padrao ?? false);
  if (!ativo) return { sent: false, error: 'Alerta desativado para esta empresa' };

  const template = (alertConf && alertConf.template_mensagem) || catalogRow.template_padrao || '';

  // Compat: caixa.fechado — se o front antigo não enviou 'usuario_caixa', usa 'usuario' como fallback.
  const payloadFinal = { ...payload };
  if (codigoAlerta === 'caixa.fechado') {
    if (payloadFinal.usuario_caixa == null || String(payloadFinal.usuario_caixa).trim() === '') {
      payloadFinal.usuario_caixa = payloadFinal.usuario || payloadFinal.operador_nome || '';
    }
  }

  let mensagem = renderTemplate(template, payloadFinal);

  // Compatibilidade: garante dados essenciais de OS aberta mesmo com template antigo/customizado.
  if (codigoAlerta === 'os.criada') {
    const defeito = payload?.defeito ? String(payload.defeito).trim() : '';
    const linkOs = payload?.link_os ? String(payload.link_os).trim() : '';
    const cpf = payload?.cliente_cpf ? String(payload.cliente_cpf).trim() : '';
    const endereco = payload?.cliente_endereco ? String(payload.cliente_endereco).trim() : '';
    const templateLower = String(template || '').toLowerCase();
    // Detecta o estilo do template para manter o mesmo padrão ao acrescentar linhas.
    const usaNegrito = /\*[^*\n]+\*/.test(template || '');
    const usaSeparadorPonto = /\n\s*\.\s*\n/.test(template || '');
    const sep = usaSeparadorPonto ? '\n.\n' : '\n';
    const b = (s) => (usaNegrito ? `*${s}*` : s);

    if (defeito && !templateLower.includes('{defeito}')) {
      mensagem += `${sep}${b('Defeito:')} ${defeito}`;
    }
    if (linkOs && !templateLower.includes('{link_os}')) {
      mensagem += `${sep}${b('Acompanhamento:')} ${linkOs}`;
    }
    if (cpf && !templateLower.includes('{cliente_cpf}')) {
      mensagem += `${sep}${b('CPF/CNPJ:')} ${cpf}`;
    }
    if (endereco && !templateLower.includes('{cliente_endereco}')) {
      mensagem += `${sep}${b('Endereço:')} ${endereco}`;
    }
  }

  // Remove apenas placeholders de variável não preenchida (evita apagar texto legítimo com colchetes)
  mensagem = mensagem
    .replace(/\[(?:cliente_cpf|cliente_endereco|usuario_caixa|numero_os|link_os)\]/gi, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  if (!mensagem.trim()) return { sent: false, error: 'Template vazio' };

  const usarGlobais = alertConf ? alertConf.usar_destinatarios_globais !== false : true;
  let numeros = [];
  if (usarGlobais) {
    if (panel.numero_principal) numeros.push(panel.numero_principal);
    if (panel.numeros_adicionais && Array.isArray(panel.numeros_adicionais)) numeros.push(...panel.numeros_adicionais);
  } else if (alertConf && alertConf.numeros_destino && alertConf.numeros_destino.length) {
    numeros = [...alertConf.numeros_destino];
  }
  numeros = [...new Set(numeros.map(n => String(n).replace(/\D/g, '')))].filter(Boolean);
  if (numeros.length === 0) return { sent: false, error: 'Nenhum número configurado para envio' };

  const timezone = panel.timezone || 'America/Sao_Paulo';
  const inicio = panel.horario_inicio_envio ? String(panel.horario_inicio_envio).slice(0, 5) : null;
  const fim = panel.horario_fim_envio ? String(panel.horario_fim_envio).slice(0, 5) : null;
  if (!isWithinTimeWindow(timezone, inicio, fim)) {
    return { sent: false, error: 'Fora da janela de envio permitida' };
  }

  if (!sendMessage) return { sent: false, error: 'Canal de envio não configurado' };

  const resultados = [];
  for (const num of numeros) {
    try {
      const { ok, error } = await sendMessage(num, mensagem);
      await logAlert(client, {
        company_id: companyId,
        codigo_alerta: codigoAlerta,
        categoria: catalogRow.categoria,
        destino: num,
        payload,
        mensagem_final: mensagem,
        status: ok ? 'enviado' : 'erro',
        erro: error || null,
        enviado_em: new Date(),
      });
      resultados.push({ numero: num, ok, error });
    } catch (e) {
      await logAlert(client, {
        company_id: companyId,
        codigo_alerta: codigoAlerta,
        categoria: catalogRow.categoria,
        destino: num,
        payload,
        mensagem_final: mensagem,
        status: 'erro',
        erro: e && e.message ? e.message : String(e),
        enviado_em: new Date(),
      });
      resultados.push({ numero: num, ok: false, error: e?.message || String(e) });
    }
  }
  const allOk = resultados.every(r => r.ok);
  return {
    sent: allOk,
    destinatarios: numeros,
    error: allOk ? undefined : resultados.find(r => !r.ok)?.error,
    resultados,
  };
}

export { pool as alertPool };

function normalizeAtivaCrmContactName(name, phone = '') {
  const value = String(name || '').trim();
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  const phoneDigits = String(phone || '').replace(/\D/g, '');
  const normalized = value.toLowerCase();
  const genericNames = new Set(['cliente', 'lead', 'lead whatsapp', 'desconhecido']);

  if (genericNames.has(normalized)) return '';
  if (digits && digits === phoneDigits) return '';
  if (digits.length >= 10 && digits.length >= value.replace(/\s/g, '').length - 2) return '';

  return value;
}

/**
 * Cria uma função de envio via WhatsApp (Ativa CRM) para uma empresa.
 * Use para chamar dispatch() a partir de outras rotas (ex.: ao criar OS, fechar caixa).
 * Ex.: const sender = createWhatsAppSender(pool, companyId);
 *      await dispatch({ companyId, codigoAlerta: 'os.criada', payload: {...}, sendMessage: sender, db: pool });
 */
export function createWhatsAppSender(poolOrClient, companyId, options = {}) {
  const fetch = typeof globalThis.fetch === 'function' ? globalThis.fetch : null;
  const tokenKind = options.tokenKind === 'sensitive' ? 'sensitive' : 'common';
  const tokenField = tokenKind === 'sensitive' ? 'ativaCrmSensitiveToken' : 'ativaCrmToken';
  const tokenError = tokenKind === 'sensitive'
    ? 'Token sensível do Ativa CRM não configurado. Configure em Integrações > CRM.'
    : 'Token do Ativa CRM não configurado. Configure em Integrações.';
  return async function sendMessage(number, body, contact = {}) {
    const key = `integration_settings_${companyId}`;
    const res = await poolOrClient.query(
      'SELECT value FROM kv_store_2c4defad WHERE key = $1',
      [key]
    );
    const token = res.rows[0]?.value?.[tokenField] || null;
    if (!token) return { ok: false, error: tokenError };
    if (!fetch) return { ok: false, error: 'Fetch não disponível' };
    const formattedNumber = String(number).replace(/\D/g, '');
    if (!formattedNumber) return { ok: false, error: 'Número inválido' };
    const contactName = normalizeAtivaCrmContactName(contact.name || contact.contactName, formattedNumber);
    const payload = {
      number: formattedNumber,
      body,
      ...(contactName ? {
        name: contactName,
        contactName,
        contact_name: contactName,
        displayName: contactName,
        contact: {
          name: contactName,
          contactName,
          number: formattedNumber,
          phone: formattedNumber,
          whatsapp: formattedNumber,
          email: contact.email || '',
        },
      } : {}),
    };
    try {
      const response = await fetch('https://api.ativacrm.com/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return { ok: false, error: data.message || data.error || 'Erro ao enviar' };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  };
}
