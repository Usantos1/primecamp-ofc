import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import crypto from 'crypto';
import https from 'https';

// Fetch: usar nativo (Node 18+) onde existir; senão node-fetch não é usado na rota telegram (usa https)
const fetch = typeof globalThis.fetch === 'function' ? globalThis.fetch : null;
import resellerRoutes from './routes/reseller.js';
import paymentsRoutes from './routes/payments.js';
import dashboardRoutes from './routes/dashboard.js';
import refundsRoutes from './routes/refunds.js';
import reportsRoutes from './routes/reports.js';
import paymentMethodsRoutes from './routes/paymentMethods.js';
import financeiroRoutes from './routes/financeiro.js';
import { checkSubscription, checkAndBlockOverdueCompanies } from './middleware/subscriptionMiddleware.js';
import { requirePermission, invalidateAllPermissionCache } from './middleware/permissionMiddleware.js';
import { notifyAdminsNewJobCandidate } from './services/jobCandidateNotify.js';
import { sendPasswordResetEmail } from './mailer.js';

// Painel de Alertas: carregamento dinâmico para não derrubar o servidor se tabelas não existirem
let alertsRoutes = null;
try {
  const alertsModule = await import('./routes/alerts.js');
  alertsRoutes = alertsModule.default;
  console.log('[Server] Módulo Painel de Alertas carregado');
} catch (e) {
  console.error('[Server] Painel de Alertas não carregado. Rode db/migrations/manual/PAINEL_ALERTAS_TABELAS.sql no banco:', e.message);
}

let osPosVendaFollowupRoutes = null;
try {
  const followMod = await import('./routes/osPosVendaFollowup.js');
  osPosVendaFollowupRoutes = followMod.default;
  console.log('[Server] Módulo follow-up pós-venda carregado');
} catch (e) {
  console.warn('[Server] Follow-up pós-venda: rotas não carregadas:', e.message);
}

let birthdayMessagesRoutes = null;
try {
  const birthdayMod = await import('./routes/birthdayMessages.js');
  birthdayMessagesRoutes = birthdayMod.default;
  console.log('[Server] Módulo mensagens de aniversário carregado');
} catch (e) {
  console.warn('[Server] Mensagens de aniversário: rotas não carregadas:', e.message);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_SAFE_TIMEOUT_MS = 2_147_000_000; // Limite do setTimeout em Node.js (~24,8 dias)
const VALID_OPENAI_MODELS = [
  'gpt-5.5',
  'gpt-5.4-mini',
  'gpt-5.4-nano',
  'gpt-5.2',
  'gpt-5.2-chat-latest',
  'gpt-5.1',
  'gpt-5',
  'gpt-5-mini',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-4',
  'o1',
  'o1-mini',
  'o1-preview',
  'o3-mini',
];

function scheduleLongTimeout(callback, delayMs) {
  const delay = Math.max(0, Number(delayMs) || 0);
  if (delay > MAX_SAFE_TIMEOUT_MS) {
    return setTimeout(() => scheduleLongTimeout(callback, delay - MAX_SAFE_TIMEOUT_MS), MAX_SAFE_TIMEOUT_MS);
  }
  return setTimeout(callback, delay);
}

// Trust proxy para funcionar corretamente atrás do Nginx
app.set('trust proxy', 1);

// Validar variáveis de ambiente obrigatórias
const requiredEnvVars = {
  DB_HOST: process.env.DB_HOST,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  JWT_SECRET: process.env.JWT_SECRET,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('❌ ERRO: Variáveis de ambiente obrigatórias não encontradas:');
  missingVars.forEach(key => console.error(`   - ${key}`));
  console.error('\n💡 Configure essas variáveis no arquivo .env');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

// Configuração do PostgreSQL - SEM fallbacks sensíveis
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

function normalizeMetaValue(value) {
  return String(value || '').trim().toLowerCase();
}

function hashSha256(value) {
  const normalized = normalizeMetaValue(value);
  if (!normalized) return undefined;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function normalizePhoneForMeta(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}

async function getIntegrationSettings(companyId) {
  const keys = companyId ? [`integration_settings_${companyId}`, 'integration_settings'] : ['integration_settings'];
  for (const key of keys) {
    const result = await pool.query('SELECT value FROM kv_store_2c4defad WHERE key = $1', [key]);
    if (result.rows[0]?.value) return result.rows[0].value;
  }
  return {};
}

function isMissingMetaLogsTable(error) {
  return error?.code === '42P01' || String(error?.message || '').includes('meta_ads_event_logs');
}

function isMissingGoogleLogsTable(error) {
  return error?.code === '42P01' || String(error?.message || '').includes('google_ads_event_logs');
}

function formatGoogleAdsDateTime(value) {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  const iso = Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  return iso.replace('T', ' ').replace(/\.\d{3}Z$/, '+00:00');
}

function normalizeGoogleCustomerId(value) {
  return String(value || '').replace(/\D/g, '');
}

function getGoogleConversionActionResource(customerId, conversionAction) {
  const raw = String(conversionAction || '').trim();
  if (!raw) return '';
  if (raw.startsWith('customers/')) return raw;
  return `customers/${normalizeGoogleCustomerId(customerId)}/conversionActions/${raw.replace(/\D/g, '')}`;
}

function buildGoogleUserIdentifiers(data = {}) {
  const identifiers = [];
  const phone = normalizePhoneForMeta(data.phone || data.telefone);
  const email = normalizeMetaValue(data.email);
  const firstName = normalizeMetaValue(data.firstName || data.first_name);
  const lastName = normalizeMetaValue(data.lastName || data.last_name);
  const postalCode = String(data.postalCode || data.cep || '').replace(/\D/g, '');

  const hashedPhoneNumber = hashSha256(phone);
  const hashedEmail = hashSha256(email);
  if (hashedPhoneNumber) identifiers.push({ hashedPhoneNumber });
  if (hashedEmail) identifiers.push({ hashedEmail });
  if (firstName || lastName || postalCode) {
    const addressInfo = {
      countryCode: 'BR',
      ...(hashSha256(firstName) ? { hashedFirstName: hashSha256(firstName) } : {}),
      ...(hashSha256(lastName) ? { hashedLastName: hashSha256(lastName) } : {}),
      ...(postalCode ? { postalCode } : {}),
    };
    identifiers.push({ addressInfo });
  }
  return identifiers;
}

async function beginGoogleAdsEventLog(companyId, conversion, context = {}) {
  try {
    const insertResult = await pool.query(`
      INSERT INTO public.google_ads_event_logs (
        company_id, event_id, event_name, event_type, source, sale_id, ordem_servico_id, ativa_crm_event_id,
        status, attempts, last_attempt_at, request_payload
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'enviando', 1, now(), $9::jsonb)
      ON CONFLICT (event_id) DO NOTHING
      RETURNING id, status, attempts
    `, [
      companyId,
      conversion.eventId,
      conversion.eventName,
      context.eventType || 'conversion',
      context.source || 'system',
      context.saleId || null,
      context.ordemServicoId || null,
      context.ativaCrmEventId || null,
      JSON.stringify(conversion),
    ]);

    if (insertResult.rows[0]) {
      return { shouldSend: true, logId: insertResult.rows[0].id };
    }

    const existingResult = await pool.query(
      'SELECT id, status, attempts FROM public.google_ads_event_logs WHERE event_id = $1 LIMIT 1',
      [conversion.eventId]
    );
    const existing = existingResult.rows[0];
    if (!existing || existing.status === 'enviado' || Number(existing.attempts || 0) >= 3) {
      return { shouldSend: false, logId: existing?.id, reason: existing?.status === 'enviado' ? 'already_sent' : 'max_attempts' };
    }

    const retryResult = await pool.query(`
      UPDATE public.google_ads_event_logs
      SET status = 'enviando',
          attempts = attempts + 1,
          last_attempt_at = now(),
          error_message = NULL,
          request_payload = $2::jsonb
      WHERE id = $1
      RETURNING id
    `, [existing.id, JSON.stringify(conversion)]);

    return { shouldSend: true, logId: retryResult.rows[0]?.id || existing.id };
  } catch (error) {
    if (isMissingGoogleLogsTable(error)) {
      console.warn('[Google Ads] Tabela google_ads_event_logs ausente. Rode db/migrations/manual/GOOGLE_ADS_EVENT_LOGS.sql na VPS.');
      return { shouldSend: true, logId: null, missingTable: true };
    }
    throw error;
  }
}

async function finishGoogleAdsEventLog(logId, status, payload = {}) {
  if (!logId) return;
  try {
    await pool.query(`
      UPDATE public.google_ads_event_logs
      SET status = $2,
          sent_at = CASE WHEN $2 = 'enviado' THEN now() ELSE sent_at END,
          response_payload = COALESCE($3::jsonb, response_payload),
          error_message = $4
      WHERE id = $1
    `, [
      logId,
      status,
      payload.response ? JSON.stringify(payload.response) : null,
      payload.errorMessage || null,
    ]);
  } catch (error) {
    console.warn('[Google Ads] Não foi possível atualizar log:', error.message);
  }
}

async function getGoogleAdsAccessToken(googleAds) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: googleAds.clientId || '',
      client_secret: googleAds.clientSecret || '',
      refresh_token: googleAds.refreshToken || '',
      grant_type: 'refresh_token',
    }).toString(),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(data?.error_description || data?.error || `OAuth Google retornou status ${response.status}`);
  }
  return data.access_token;
}

async function sendGoogleAdsConversion(companyId, conversion, context = {}) {
  if (!fetch) {
    console.warn('[Google Ads] fetch indisponível no runtime atual.');
    return { skipped: true, reason: 'fetch_unavailable' };
  }

  const settings = await getIntegrationSettings(companyId);
  const googleAds = settings.googleAds || {};
  const customerId = normalizeGoogleCustomerId(googleAds.customerId);
  const developerToken = String(googleAds.developerToken || '').trim();

  if (!googleAds.enabled || !customerId || !developerToken || !googleAds.clientId || !googleAds.clientSecret || !googleAds.refreshToken) {
    return { skipped: true, reason: 'not_configured' };
  }

  if (!conversion.conversionAction) {
    return { skipped: true, reason: 'conversion_action_missing' };
  }

  const log = await beginGoogleAdsEventLog(companyId, conversion, context);
  if (!log.shouldSend) {
    console.log('[Google Ads] Conversão ignorada por idempotência:', { event_id: conversion.eventId, reason: log.reason });
    return { skipped: true, reason: log.reason };
  }

  try {
    const accessToken = await getGoogleAdsAccessToken(googleAds);
    const body = {
      conversions: [
        {
          conversionAction: getGoogleConversionActionResource(customerId, conversion.conversionAction),
          conversionDateTime: formatGoogleAdsDateTime(conversion.conversionDateTime || new Date()),
          orderId: conversion.orderId || conversion.eventId,
          currencyCode: conversion.currencyCode || 'BRL',
          ...(conversion.value !== undefined ? { conversionValue: Number(conversion.value || 0) } : {}),
          ...(conversion.gclid ? { gclid: conversion.gclid } : {}),
          ...(conversion.gbraid ? { gbraid: conversion.gbraid } : {}),
          ...(conversion.wbraid ? { wbraid: conversion.wbraid } : {}),
          ...(Array.isArray(conversion.userIdentifiers) && conversion.userIdentifiers.length > 0 ? { userIdentifiers: conversion.userIdentifiers } : {}),
          ...(conversion.customVariables || {}),
        },
      ],
      partialFailure: true,
      validateOnly: googleAds.validateOnly === true,
    };

    const response = await fetch(`https://googleads.googleapis.com/v18/customers/${customerId}:uploadClickConversions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': developerToken,
        ...(googleAds.loginCustomerId ? { 'login-customer-id': normalizeGoogleCustomerId(googleAds.loginCustomerId) } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    const partialFailureMessage = data?.partialFailureError?.message;
    if (!response.ok || partialFailureMessage) {
      const errorMessage = partialFailureMessage || data?.error?.message || `Google Ads retornou status ${response.status}`;
      await finishGoogleAdsEventLog(log.logId, 'erro', { response: data, errorMessage });
      throw new Error(errorMessage);
    }

    await finishGoogleAdsEventLog(log.logId, 'enviado', { response: data });
    console.log('[Google Ads] Conversão enviada:', { event_name: conversion.eventName, event_id: conversion.eventId, response: data });
    return data;
  } catch (error) {
    await finishGoogleAdsEventLog(log.logId, 'erro', { errorMessage: error.message });
    throw error;
  }
}

async function isGoogleAdsEventEnabled(companyId, flag) {
  const settings = await getIntegrationSettings(companyId);
  const googleAds = settings.googleAds || {};
  return googleAds.enabled === true && googleAds[flag] === true;
}

async function beginMetaEventLog(companyId, event, context = {}) {
  try {
    const insertResult = await pool.query(`
      INSERT INTO public.meta_ads_event_logs (
        company_id, event_id, event_name, event_type, source, sale_id, ordem_servico_id,
        status, attempts, last_attempt_at, request_payload
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'enviando', 1, now(), $8::jsonb)
      ON CONFLICT (event_id) DO NOTHING
      RETURNING id, status, attempts
    `, [
      companyId,
      event.event_id,
      event.event_name,
      context.eventType || 'os_purchase',
      context.source || 'system',
      context.saleId || null,
      context.ordemServicoId || null,
      JSON.stringify(event),
    ]);

    if (insertResult.rows[0]) {
      return { shouldSend: true, logId: insertResult.rows[0].id };
    }

    const existingResult = await pool.query(
      'SELECT id, status, attempts FROM public.meta_ads_event_logs WHERE event_id = $1 LIMIT 1',
      [event.event_id]
    );
    const existing = existingResult.rows[0];
    if (!existing || existing.status === 'enviado' || Number(existing.attempts || 0) >= 3) {
      return { shouldSend: false, logId: existing?.id, reason: existing?.status === 'enviado' ? 'already_sent' : 'max_attempts' };
    }

    const retryResult = await pool.query(`
      UPDATE public.meta_ads_event_logs
      SET status = 'enviando',
          attempts = attempts + 1,
          last_attempt_at = now(),
          error_message = NULL,
          request_payload = $2::jsonb
      WHERE id = $1
      RETURNING id
    `, [existing.id, JSON.stringify(event)]);

    return { shouldSend: true, logId: retryResult.rows[0]?.id || existing.id };
  } catch (error) {
    if (isMissingMetaLogsTable(error)) {
      console.warn('[Meta Ads] Tabela meta_ads_event_logs ausente. Rode db/migrations/manual/META_ADS_EVENT_LOGS.sql na VPS.');
      return { shouldSend: true, logId: null, missingTable: true };
    }
    throw error;
  }
}

async function finishMetaEventLog(logId, status, payload = {}) {
  if (!logId) return;
  try {
    await pool.query(`
      UPDATE public.meta_ads_event_logs
      SET status = $2,
          sent_at = CASE WHEN $2 = 'enviado' THEN now() ELSE sent_at END,
          response_payload = COALESCE($3::jsonb, response_payload),
          error_message = $4
      WHERE id = $1
    `, [
      logId,
      status,
      payload.response ? JSON.stringify(payload.response) : null,
      payload.errorMessage || null,
    ]);
  } catch (error) {
    console.warn('[Meta Ads] Não foi possível atualizar log:', error.message);
  }
}

async function sendMetaEvent(companyId, event, context = {}) {
  if (!fetch) {
    console.warn('[Meta Ads] fetch indisponível no runtime atual.');
    return { skipped: true, reason: 'fetch_unavailable' };
  }

  const settings = await getIntegrationSettings(companyId);
  const meta = settings.metaAds || {};
  const enabled = meta.enabled === true || settings.metaAdsEnabled === true;
  const pixelId = meta.pixelId || settings.metaPixelId;
  const accessToken = meta.accessToken || settings.metaAccessToken;
  const testEventCode = meta.testEventCode || settings.metaTestEventCode;

  if (!enabled || !pixelId || !accessToken) {
    return { skipped: true, reason: 'not_configured' };
  }

  const log = await beginMetaEventLog(companyId, event, context);
  if (!log.shouldSend) {
    console.log('[Meta Ads] Evento ignorado por idempotência:', { event_id: event.event_id, reason: log.reason });
    return { skipped: true, reason: log.reason };
  }

  const body = {
    data: [event],
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  };

  const response = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('[Meta Ads] Erro ao enviar evento:', data);
    const errorMessage = data?.error?.message || `Meta Ads retornou status ${response.status}`;
    await finishMetaEventLog(log.logId, 'erro', { response: data, errorMessage });
    throw new Error(errorMessage);
  }

  await finishMetaEventLog(log.logId, 'enviado', { response: data });
  console.log('[Meta Ads] Evento enviado:', { event_name: event.event_name, event_id: event.event_id, response: data });
  return data;
}

async function isMetaOsPurchaseEnabled(companyId) {
  const settings = await getIntegrationSettings(companyId);
  const meta = settings.metaAds || {};
  return (meta.enabled === true || settings.metaAdsEnabled === true) && meta.sendOsPurchase !== false;
}

async function buildMetaOsPurchaseEvent(saleId) {
  const saleResult = await pool.query(`
    SELECT
      s.id,
      s.numero,
      s.company_id,
      s.total,
      s.total_pago,
      s.finalized_at,
      s.created_at,
      s.cliente_id AS sale_cliente_id,
      s.cliente_nome AS sale_cliente_nome,
      s.cliente_telefone AS sale_cliente_telefone,
      s.cliente_cpf_cnpj AS sale_cliente_cpf_cnpj,
      s.ordem_servico_id,
      os.cliente_id AS os_cliente_id,
      os.numero AS os_numero,
      os.cliente_nome AS os_cliente_nome,
      os.telefone_contato AS os_cliente_telefone,
      os.modelo_nome,
      os.marca_nome,
      os.descricao_problema,
      os.valor_total,
      c.id AS cliente_id,
      c.email AS cliente_email,
      c.cidade AS cliente_cidade,
      c.estado AS cliente_estado,
      c.cep AS cliente_cep,
      c.cpf_cnpj AS cliente_cpf_cnpj,
      c.data_nascimento AS cliente_data_nascimento
    FROM public.sales s
    LEFT JOIN public.ordens_servico os ON os.id = s.ordem_servico_id
    LEFT JOIN public.clientes c ON c.id = COALESCE(os.cliente_id, s.cliente_id)
    WHERE s.id = $1
    LIMIT 1
  `, [saleId]);

  const sale = saleResult.rows[0];
  if (!sale || !sale.ordem_servico_id) return null;

  const customerName = sale.os_cliente_nome || sale.sale_cliente_nome || '';
  const phone = normalizePhoneForMeta(sale.os_cliente_telefone || sale.sale_cliente_telefone || '');
  const [firstName, ...lastNameParts] = customerName.trim().split(/\s+/).filter(Boolean);
  const modelName = [sale.marca_nome, sale.modelo_nome].filter(Boolean).join(' ') || sale.modelo_nome || 'Ordem de Serviço';
  const value = Number(sale.valor_total || sale.total || sale.total_pago || 0);
  const eventTime = Math.floor(new Date(sale.finalized_at || sale.created_at || Date.now()).getTime() / 1000);

  const userData = {};
  const phoneHash = hashSha256(phone);
  const firstNameHash = hashSha256(firstName);
  const lastNameHash = hashSha256(lastNameParts.join(' '));
  const emailHash = hashSha256(sale.cliente_email);
  const cityHash = hashSha256(sale.cliente_cidade);
  const stateHash = hashSha256(sale.cliente_estado);
  const zipHash = hashSha256(String(sale.cliente_cep || '').replace(/\D/g, ''));
  const birthDateHash = hashSha256(sale.cliente_data_nascimento ? new Date(sale.cliente_data_nascimento).toISOString().slice(0, 10).replace(/-/g, '') : '');
  const externalIdHash = hashSha256(sale.cliente_id || sale.os_cliente_id || sale.sale_cliente_id || sale.cliente_cpf_cnpj || sale.sale_cliente_cpf_cnpj);
  if (phoneHash) userData.ph = [phoneHash];
  if (firstNameHash) userData.fn = [firstNameHash];
  if (lastNameHash) userData.ln = [lastNameHash];
  if (emailHash) userData.em = [emailHash];
  if (cityHash) userData.ct = [cityHash];
  if (stateHash) userData.st = [stateHash];
  if (zipHash) userData.zp = [zipHash];
  if (birthDateHash) userData.db = [birthDateHash];
  if (externalIdHash) userData.external_id = [externalIdHash];

  return {
    companyId: sale.company_id,
    saleId: sale.id,
    ordemServicoId: sale.ordem_servico_id,
    event: {
      event_name: 'Purchase',
      event_time: eventTime,
      event_id: `os_purchase_${sale.company_id}_${sale.ordem_servico_id}`,
      action_source: 'system_generated',
      user_data: userData,
      custom_data: {
        currency: 'BRL',
        value,
        order_id: String(sale.os_numero || sale.numero || sale.id),
        content_name: modelName,
        content_category: 'Ordem de Serviço',
        contents: [
          {
            id: sale.ordem_servico_id,
            quantity: 1,
            item_price: value,
          },
        ],
        descricao_problema: sale.descricao_problema || undefined,
      },
    },
  };
}

async function sendMetaOsPurchaseForSale(saleId) {
  try {
    const payload = await buildMetaOsPurchaseEvent(saleId);
    if (!payload) return { sent: false, reason: 'sale_without_os' };
    if (!await isMetaOsPurchaseEnabled(payload.companyId)) return { sent: false, reason: 'meta_os_purchase_disabled' };

    const alreadySentResult = await pool.query(`
      SELECT id, event_id
      FROM public.meta_ads_event_logs
      WHERE company_id = $1
        AND ordem_servico_id = $2
        AND event_name = 'Purchase'
        AND status = 'enviado'
      LIMIT 1
    `, [payload.companyId, payload.ordemServicoId]);
    if (alreadySentResult.rows[0]) {
      return { sent: false, reason: 'already_sent_for_os', log_id: alreadySentResult.rows[0].id };
    }

    const result = await sendMetaEvent(payload.companyId, payload.event, {
      eventType: 'os_purchase',
      source: 'os_billing',
      saleId: payload.saleId,
      ordemServicoId: payload.ordemServicoId,
    });
    if (result?.skipped) return { sent: false, reason: result.reason };
    return { sent: true, result };
  } catch (error) {
    console.error('[Meta Ads] Falha ao enviar conversão de OS:', error.message);
    return { sent: false, reason: 'send_error', error: error.message };
  }
}

async function sendMetaOsPurchaseForOrder(ordemServicoId, companyId = null) {
  if (!ordemServicoId) return { processed: 0, sent: 0, skipped: 0, errors: 0, results: [] };

  const params = [ordemServicoId];
  let companyFilter = '';
  if (companyId) {
    params.push(companyId);
    companyFilter = `AND company_id = $${params.length}`;
  }

  const salesResult = await pool.query(`
    SELECT DISTINCT ON (ordem_servico_id) id
    FROM public.sales
    WHERE ordem_servico_id = $1
      ${companyFilter}
      AND sale_origin = 'OS'
      AND status = 'paid'
      AND COALESCE(is_draft, false) = false
    ORDER BY ordem_servico_id, total DESC NULLS LAST, finalized_at DESC NULLS LAST, created_at DESC
  `, params);

  const summary = { processed: 0, sent: 0, skipped: 0, errors: 0, results: [] };
  for (const row of salesResult.rows) {
    summary.processed += 1;
    const result = await sendMetaOsPurchaseForSale(row.id);
    summary.results.push({ sale_id: row.id, ...result });
    if (result?.sent) summary.sent += 1;
    else if (result?.reason === 'send_error') summary.errors += 1;
    else summary.skipped += 1;
  }

  return summary;
}

function buildGooglePurchaseConversionFromMetaPayload(payload, conversionAction, eventType) {
  if (!payload?.event || !conversionAction) return null;
  const event = payload.event;
  const userData = event.user_data || {};
  const customData = event.custom_data || {};
  const userIdentifiers = [];
  if (Array.isArray(userData.ph)) {
    userData.ph.forEach((hashedPhoneNumber) => {
      if (hashedPhoneNumber) userIdentifiers.push({ hashedPhoneNumber });
    });
  }
  if (Array.isArray(userData.em)) {
    userData.em.forEach((hashedEmail) => {
      if (hashedEmail) userIdentifiers.push({ hashedEmail });
    });
  }

  return {
    eventName: eventType === 'pdv_purchase' ? 'PDV Purchase' : 'OS Purchase',
    eventId: `google_${eventType}_${payload.saleId}`,
    conversionAction,
    conversionDateTime: new Date((event.event_time || Math.floor(Date.now() / 1000)) * 1000),
    orderId: String(customData.order_id || payload.saleId),
    value: Number(customData.value || 0),
    currencyCode: customData.currency || 'BRL',
    userIdentifiers,
  };
}

async function buildGooglePdvPurchaseConversion(saleId, conversionAction) {
  if (!conversionAction) return null;
  const saleResult = await pool.query(`
    SELECT
      s.id,
      s.numero,
      s.company_id,
      s.total,
      s.total_pago,
      s.finalized_at,
      s.created_at,
      s.cliente_id,
      s.cliente_nome,
      s.cliente_telefone,
      s.cliente_cpf_cnpj,
      c.email AS cliente_email,
      c.cep AS cliente_cep
    FROM public.sales s
    LEFT JOIN public.clientes c ON c.id = s.cliente_id
    WHERE s.id = $1
      AND s.sale_origin = 'PDV'
    LIMIT 1
  `, [saleId]);

  const sale = saleResult.rows[0];
  if (!sale) return null;
  const [firstName, ...lastNameParts] = String(sale.cliente_nome || '').trim().split(/\s+/).filter(Boolean);
  const value = Number(sale.total_pago || sale.total || 0);
  return {
    companyId: sale.company_id,
    saleId: sale.id,
    conversion: {
      eventName: 'PDV Purchase',
      eventId: `google_pdv_purchase_${sale.id}`,
      conversionAction,
      conversionDateTime: new Date(sale.finalized_at || sale.created_at || Date.now()),
      orderId: String(sale.numero || sale.id),
      value,
      currencyCode: 'BRL',
      userIdentifiers: buildGoogleUserIdentifiers({
        phone: sale.cliente_telefone,
        email: sale.cliente_email,
        firstName,
        lastName: lastNameParts.join(' '),
        postalCode: sale.cliente_cep,
      }),
    },
  };
}

async function sendGoogleAdsPurchaseForSale(saleId) {
  try {
    const saleOriginResult = await pool.query('SELECT company_id, sale_origin FROM public.sales WHERE id = $1 LIMIT 1', [saleId]);
    const saleOriginRow = saleOriginResult.rows[0];
    if (!saleOriginRow) return;

    const settings = await getIntegrationSettings(saleOriginRow.company_id);
    const googleAds = settings.googleAds || {};
    const isPdv = saleOriginRow.sale_origin === 'PDV';
    const flag = isPdv ? 'sendPdvPurchase' : 'sendOsPurchase';
    if (!googleAds.enabled || googleAds[flag] !== true) return;

    const conversionAction = isPdv ? googleAds.pdvPurchaseConversionAction : googleAds.osPurchaseConversionAction;
    let companyId = saleOriginRow.company_id;
    let ordemServicoId = null;
    let conversion = null;

    if (isPdv) {
      const pdvPayload = await buildGooglePdvPurchaseConversion(saleId, conversionAction);
      if (!pdvPayload) return;
      companyId = pdvPayload.companyId;
      conversion = pdvPayload.conversion;
    } else {
      const payload = await buildMetaOsPurchaseEvent(saleId);
      if (!payload) return;
      companyId = payload.companyId;
      ordemServicoId = payload.ordemServicoId;
      conversion = buildGooglePurchaseConversionFromMetaPayload(payload, conversionAction, 'os_purchase');
    }

    if (!conversion) return;

    await sendGoogleAdsConversion(companyId, conversion, {
      eventType: isPdv ? 'pdv_purchase' : 'os_purchase',
      source: isPdv ? 'pdv_sale' : 'os_billing',
      saleId,
      ordemServicoId,
    });
  } catch (error) {
    console.error('[Google Ads] Falha ao enviar conversão de venda:', error.message);
  }
}

function shouldSendMetaOsPurchaseFromSaleRow(row) {
  return row
    && row.ordem_servico_id
    && row.sale_origin === 'OS'
    && row.status === 'paid';
}

function shouldSendGooglePurchaseFromSaleRow(row) {
  return row && row.status === 'paid';
}

function isMissingAtivaCrmWebhookTable(error) {
  return error?.code === '42P01' || String(error?.message || '').includes('ativa_crm_webhook_events');
}

function stableEventHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value || {})).digest('hex').slice(0, 32);
}

function findFirstDeep(value, keys, maxDepth = 6) {
  const wanted = new Set(keys.map((key) => String(key).toLowerCase()));
  const seen = new Set();

  function visit(node, depth) {
    if (node == null || depth > maxDepth) return undefined;
    if (typeof node !== 'object') return undefined;
    if (seen.has(node)) return undefined;
    seen.add(node);

    if (Array.isArray(node)) {
      for (const item of node) {
        const found = visit(item, depth + 1);
        if (found !== undefined && found !== null && found !== '') return found;
      }
      return undefined;
    }

    for (const [key, child] of Object.entries(node)) {
      if (wanted.has(key.toLowerCase()) && child !== undefined && child !== null && child !== '') {
        return child;
      }
    }

    for (const child of Object.values(node)) {
      const found = visit(child, depth + 1);
      if (found !== undefined && found !== null && found !== '') return found;
    }

    return undefined;
  }

  return visit(value, 0);
}

function normalizeWebhookText(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function parseWebhookBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'sim', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'nao', 'não', 'no'].includes(normalized)) return false;
  }
  return undefined;
}

function parseWebhookJsonObject(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {
    return null;
  }
}

function extractAtivaCrmWebhookData(payload) {
  const contact = payload?.contact || payload?.customer || payload?.lead || payload?.data?.contact || {};
  const ticket = payload?.ticket || payload?.conversation || payload?.chat || payload?.data?.ticket || {};
  const firstMessage = Array.isArray(payload?.messages) ? payload.messages[0] : null;
  const parsedMessageData = parseWebhookJsonObject(payload?.messages_0_dataJson);
  const rawInfo = payload?.rawMessage?.Info || payload?.rawMessage?.info || parsedMessageData?.event?.Info || {};
  const referral = payload?.referral || payload?.message?.referral || firstMessage?.referral || parsedMessageData?.referral || findFirstDeep(payload, ['referral']);

  const messageText = normalizeWebhookText(
    payload?.messages_0_body ||
    payload?.rawMessage_Message_conversation ||
    payload?.rawMessage_RawMessage_conversation ||
    parsedMessageData?.event?.Message?.conversation ||
    parsedMessageData?.event?.RawMessage?.conversation ||
    firstMessage?.body ||
    firstMessage?.text ||
    payload?.message?.body ||
    payload?.message?.text ||
    payload?.body ||
    payload?.text ||
    payload?.ticket?.lastMessage ||
    findFirstDeep(payload, ['messageText', 'message_text', 'lastMessage', 'body', 'text', 'message'])
  );

  const contactName = normalizeWebhookText(
    payload?.contact_name ||
    payload?.rawMessage_Info_PushName ||
    parsedMessageData?.contactName ||
    parsedMessageData?.event?.Info?.PushName ||
    contact.name ||
    contact.nome ||
    rawInfo.PushName ||
    payload?.name ||
    payload?.nome ||
    findFirstDeep(payload, ['contactName', 'pushName', 'name', 'nome'])
  );

  const contactPhone = normalizePhoneForMeta(
    payload?.contact_number ||
    payload?.rawMessage_Info_Sender ||
    payload?.rawMessage_MessageSource_Sender ||
    payload?.messages_0_remoteJid ||
    parsedMessageData?.event?.Info?.Sender ||
    parsedMessageData?.event?.MessageSource?.Sender ||
    contact.number ||
    contact.phone ||
    contact.telefone ||
    contact.whatsapp ||
    rawInfo.Sender ||
    payload?.number ||
    payload?.phone ||
    payload?.telefone ||
    payload?.whatsapp ||
    findFirstDeep(payload, ['number', 'phone', 'telefone', 'whatsapp', 'sender', 'from'])
  );

  const messageId = normalizeWebhookText(
    payload?.messages_0_id ||
    payload?.rawMessage_Info_ID ||
    parsedMessageData?.event?.Info?.ID ||
    firstMessage?.id ||
    payload?.message?.id ||
    payload?.rawMessage?.key?.id ||
    findFirstDeep(payload, ['message_id', 'messageId'])
  );
  const ticketId = normalizeWebhookText(payload?.ticket_id || payload?.messages_0_ticketId || ticket.id || payload?.conversation_id || findFirstDeep(payload, ['ticket_id', 'ticketId']));
  const conversationId = normalizeWebhookText(
    payload?.messages_0_remoteJid ||
    payload?.rawMessage_Info_Chat ||
    payload?.rawMessage_MessageSource_Chat ||
    parsedMessageData?.event?.Info?.Chat ||
    parsedMessageData?.event?.MessageSource?.Chat ||
    ticket.uuid ||
    ticket.id ||
    payload?.conversationId ||
    payload?.conversation_id ||
    findFirstDeep(payload, ['conversation_id', 'conversationId', 'chat_id'])
  );
  const eventId = messageId || (ticketId && messageText ? `${ticketId}:${stableEventHash(messageText)}` : null) || stableEventHash(payload);
  const fromMe = parseWebhookBoolean(
    payload?.messages_0_fromMe ??
    payload?.rawMessage_Info_IsFromMe ??
    payload?.rawMessage_MessageSource_IsFromMe ??
    parsedMessageData?.event?.Info?.IsFromMe ??
    parsedMessageData?.event?.MessageSource?.IsFromMe ??
    findFirstDeep(payload, ['fromMe', 'from_me', 'isFromMe'])
  );

  return {
    eventId,
    conversationId,
    ticketId,
    messageId,
    contactName,
    contactPhone,
    messageText,
    direction: fromMe === true ? 'outbound' : 'inbound',
    ctwaClid: normalizeWebhookText(
      payload?.ctwa_clid ||
      payload?.rawMessage_Message_contextInfo_externalAdReply_ctwaClid ||
      payload?.rawMessage_RawMessage_contextInfo_externalAdReply_ctwaClid ||
      referral?.ctwa_clid ||
      referral?.ctwaClid ||
      findFirstDeep(payload, ['ctwa_clid', 'ctwaClid'])
    ),
    sourceUrl: normalizeWebhookText(
      payload?.source_url ||
      payload?.rawMessage_Message_contextInfo_externalAdReply_sourceUrl ||
      payload?.rawMessage_RawMessage_contextInfo_externalAdReply_sourceUrl ||
      referral?.source_url ||
      referral?.sourceUrl ||
      referral?.source_url ||
      findFirstDeep(payload, ['source_url', 'sourceUrl', 'source'])
    ),
    campaignId: normalizeWebhookText(payload?.campaign_id || payload?.rawMessage_Message_contextInfo_externalAdReply_campaignId || referral?.campaign_id || findFirstDeep(payload, ['campaign_id', 'campaignId'])),
    campaignName: normalizeWebhookText(payload?.campaign_name || payload?.rawMessage_Message_contextInfo_externalAdReply_campaignName || referral?.campaign_name || findFirstDeep(payload, ['campaign_name', 'campaignName', 'campaign'])),
    adsetId: normalizeWebhookText(payload?.adset_id || payload?.rawMessage_Message_contextInfo_externalAdReply_adsetId || referral?.adset_id || findFirstDeep(payload, ['adset_id', 'adsetId'])),
    adId: normalizeWebhookText(payload?.ad_id || payload?.rawMessage_Message_contextInfo_externalAdReply_adId || referral?.ad_id || findFirstDeep(payload, ['ad_id', 'adId'])),
    utmSource: normalizeWebhookText(payload?.utm_source || findFirstDeep(payload, ['utm_source'])),
    utmMedium: normalizeWebhookText(payload?.utm_medium || findFirstDeep(payload, ['utm_medium'])),
    utmCampaign: normalizeWebhookText(payload?.utm_campaign || findFirstDeep(payload, ['utm_campaign'])),
  };
}

async function isMetaClientLeadEnabled(companyId) {
  const settings = await getIntegrationSettings(companyId);
  const meta = settings.metaAds || {};
  return (meta.enabled === true || settings.metaAdsEnabled === true) && meta.sendClientLead === true;
}

async function insertAtivaCrmWebhookEvent(companyId, payload, req) {
  const extracted = extractAtivaCrmWebhookData(payload);
  const headers = {
    'content-type': req.get('content-type'),
    'user-agent': req.get('user-agent'),
    'x-real-ip': req.get('x-real-ip') || req.ip,
  };

  const values = [
    companyId,
    extracted.eventId,
    extracted.conversationId,
    extracted.ticketId,
    extracted.messageId,
    extracted.contactName,
    extracted.contactPhone,
    extracted.messageText,
    extracted.direction,
    extracted.ctwaClid,
    extracted.sourceUrl,
    extracted.campaignId,
    extracted.campaignName,
    extracted.adsetId,
    extracted.adId,
    extracted.utmSource,
    extracted.utmMedium,
    extracted.utmCampaign,
    JSON.stringify(payload),
    JSON.stringify(headers),
    req.ip,
  ];

  const insertResult = await pool.query(`
    INSERT INTO public.ativa_crm_webhook_events (
      company_id, event_id, conversation_id, ticket_id, message_id,
      contact_name, contact_phone, message_text, direction,
      ctwa_clid, source_url, campaign_id, campaign_name, adset_id, ad_id,
      utm_source, utm_medium, utm_campaign, raw_payload, headers, ip_origem
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11, $12, $13, $14, $15,
      $16, $17, $18, $19::jsonb, $20::jsonb, $21
    )
    ON CONFLICT (company_id, event_id) DO NOTHING
    RETURNING *
  `, values);

  if (insertResult.rows[0]) return { event: insertResult.rows[0], duplicate: false };

  const existingResult = await pool.query(
    'SELECT * FROM public.ativa_crm_webhook_events WHERE company_id = $1 AND event_id = $2 LIMIT 1',
    [companyId, extracted.eventId]
  );
  return { event: existingResult.rows[0], duplicate: true };
}

async function markAtivaCrmWebhookMetaStatus(eventId, status, patch = {}) {
  if (!eventId) return;
  try {
    await pool.query(`
      UPDATE public.ativa_crm_webhook_events
      SET meta_status = $2,
          meta_event_id = COALESCE($3, meta_event_id),
          meta_error_message = $4
      WHERE id = $1
    `, [eventId, status, patch.metaEventId || null, patch.errorMessage || null]);
  } catch (error) {
    console.warn('[AtivaCRM Webhook] Não foi possível atualizar status Meta:', error.message);
  }
}

async function sendMetaLeadForAtivaCrmWebhook(event) {
  if (!event || event.direction === 'outbound') {
    if (event?.id) await markAtivaCrmWebhookMetaStatus(event.id, 'ignorado', { errorMessage: 'Mensagem enviada pela empresa' });
    return { skipped: true, reason: 'outbound' };
  }

  if (!event.contact_phone && !event.contact_name) {
    await markAtivaCrmWebhookMetaStatus(event.id, 'ignorado', { errorMessage: 'Sem telefone/nome para matching' });
    return { skipped: true, reason: 'missing_user_data' };
  }

  if (!await isMetaClientLeadEnabled(event.company_id)) {
    await markAtivaCrmWebhookMetaStatus(event.id, 'ignorado', { errorMessage: 'Envio de Lead desativado' });
    return { skipped: true, reason: 'lead_disabled' };
  }

  const [firstName, ...lastNameParts] = String(event.contact_name || '').trim().split(/\s+/).filter(Boolean);
  const userData = {};
  const phoneHash = hashSha256(event.contact_phone);
  const firstNameHash = hashSha256(firstName);
  const lastNameHash = hashSha256(lastNameParts.join(' '));
  if (phoneHash) userData.ph = [phoneHash];
  if (firstNameHash) userData.fn = [firstNameHash];
  if (lastNameHash) userData.ln = [lastNameHash];

  const leadKey = event.contact_phone || event.conversation_id || event.ticket_id || event.event_id;
  const metaEventId = `ativa_crm_lead_${event.company_id}_${stableEventHash(leadKey)}`;
  const metaEvent = {
    event_name: 'Lead',
    event_time: Math.floor(new Date(event.created_at || Date.now()).getTime() / 1000),
    event_id: metaEventId,
    action_source: 'chat',
    user_data: userData,
    custom_data: {
      content_name: 'Lead WhatsApp Ativa CRM',
      content_category: 'WhatsApp',
      ctwa_clid: event.ctwa_clid || undefined,
      source_url: event.source_url || undefined,
      campaign_id: event.campaign_id || undefined,
      campaign_name: event.campaign_name || event.utm_campaign || undefined,
      adset_id: event.adset_id || undefined,
      ad_id: event.ad_id || undefined,
      conversation_id: event.conversation_id || undefined,
      ticket_id: event.ticket_id || undefined,
    },
  };

  try {
    const result = await sendMetaEvent(event.company_id, metaEvent, {
      eventType: 'ativa_crm_lead',
      source: 'ativa_crm_webhook',
    });

    await markAtivaCrmWebhookMetaStatus(event.id, result?.skipped ? 'ignorado' : 'enviado', {
      metaEventId,
      errorMessage: result?.skipped ? result.reason : null,
    });
    return result;
  } catch (error) {
    await markAtivaCrmWebhookMetaStatus(event.id, 'erro', { metaEventId, errorMessage: error.message });
    throw error;
  }
}

function detectAtivaCrmLeadStage(event) {
  const payload = event?.raw_payload || {};
  const statusValue = normalizeWebhookText(
    payload?.lead_status ||
    payload?.status ||
    payload?.ticket_status ||
    payload?.qualification_status ||
    payload?.stage ||
    findFirstDeep(payload, ['lead_status', 'ticket_status', 'qualification_status', 'status', 'stage'])
  );
  const reason = normalizeWebhookText(
    payload?.lost_reason ||
    payload?.disqualification_reason ||
    payload?.motivo_perda ||
    findFirstDeep(payload, ['lost_reason', 'disqualification_reason', 'motivo_perda', 'reason'])
  );
  const tagsValue = findFirstDeep(payload, ['tags', 'tag', 'tag_name', 'tagName', 'labels', 'etiquetas']);
  const tagsText = Array.isArray(tagsValue)
    ? tagsValue.map((tag) => typeof tag === 'object' ? (tag.name || tag.nome || tag.title || tag.id || '') : String(tag)).join(' ')
    : normalizeWebhookText(tagsValue) || '';
  const text = `${statusValue || ''} ${reason || ''} ${tagsText}`.toLowerCase();

  if (/(desqual|perdido|perda|sem interesse|invalido|inválido|spam|cancelado|nao qual|não qual)/i.test(text)) {
    return 'disqualified';
  }
  if (/(qualificado|qualified|hot|quente|oportunidade|orcamento|orçamento|negociacao|negociação)/i.test(text)) {
    return 'qualified';
  }
  return 'lead';
}

async function isGoogleAdsLeadEnabled(companyId, stage) {
  const settings = await getIntegrationSettings(companyId);
  const googleAds = settings.googleAds || {};
  if (!googleAds.enabled) return false;
  if (stage === 'qualified') return googleAds.sendQualifiedLead === true;
  if (stage === 'disqualified') return googleAds.sendDisqualifiedLead === true;
  return googleAds.sendClientLead === true;
}

function getGoogleAdsLeadConversionAction(googleAds, stage) {
  if (stage === 'qualified') return googleAds.qualifiedLeadConversionAction;
  if (stage === 'disqualified') return googleAds.disqualifiedLeadConversionAction;
  return googleAds.clientLeadConversionAction;
}

async function sendGoogleAdsLeadForAtivaCrmWebhook(event) {
  if (!event || event.direction === 'outbound') {
    return { skipped: true, reason: 'outbound' };
  }
  if (!event.contact_phone && !event.contact_name) {
    return { skipped: true, reason: 'missing_user_data' };
  }

  const stage = detectAtivaCrmLeadStage(event);
  if (!await isGoogleAdsLeadEnabled(event.company_id, stage)) {
    return { skipped: true, reason: `${stage}_disabled` };
  }

  const settings = await getIntegrationSettings(event.company_id);
  const googleAds = settings.googleAds || {};
  const conversionAction = getGoogleAdsLeadConversionAction(googleAds, stage);
  if (!conversionAction) return { skipped: true, reason: 'conversion_action_missing' };

  const [firstName, ...lastNameParts] = String(event.contact_name || '').trim().split(/\s+/).filter(Boolean);
  const leadKey = event.contact_phone || event.conversation_id || event.ticket_id || event.event_id;
  const eventType = stage === 'qualified' ? 'lead_qualified' : stage === 'disqualified' ? 'lead_disqualified' : 'ativa_crm_lead';
  const conversion = {
    eventName: stage === 'qualified' ? 'Lead Qualified' : stage === 'disqualified' ? 'Lead Disqualified' : 'Lead WhatsApp',
    eventId: `google_${eventType}_${event.company_id}_${stableEventHash(leadKey)}`,
    conversionAction,
    conversionDateTime: new Date(event.created_at || Date.now()),
    orderId: String(event.ticket_id || event.conversation_id || event.event_id),
    value: stage === 'disqualified' ? 0 : Number(googleAds.defaultLeadValue || 1),
    currencyCode: 'BRL',
    gclid: event.raw_payload?.gclid || findFirstDeep(event.raw_payload, ['gclid']),
    gbraid: event.raw_payload?.gbraid || findFirstDeep(event.raw_payload, ['gbraid']),
    wbraid: event.raw_payload?.wbraid || findFirstDeep(event.raw_payload, ['wbraid']),
    userIdentifiers: buildGoogleUserIdentifiers({
      phone: event.contact_phone,
      firstName,
      lastName: lastNameParts.join(' '),
    }),
  };

  return sendGoogleAdsConversion(event.company_id, conversion, {
    eventType,
    source: 'ativa_crm_webhook',
    ativaCrmEventId: event.id,
  });
}

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requisições sem origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);
    
    // Lista de origens permitidas
    // Usar API_ORIGIN ao invés de VITE_API_ORIGIN (não é credencial, mas mantém consistência)
    const apiOrigin = process.env.API_ORIGIN || process.env.VITE_API_ORIGIN;
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:8080',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:3000',
      apiOrigin,
      'https://ativafix.com',
      'http://ativafix.com',
      'https://www.ativafix.com',
      'http://www.ativafix.com',
      'https://app.ativafix.com',
      'http://app.ativafix.com',
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(null, true); // Permitir em desenvolvimento
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Idempotency-Key'],
  exposedHeaders: ['Content-Range', 'X-Total-Count'],
  preflightContinue: false,
  optionsSuccessStatus: 200,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Bypass imediato para GET theme-config/ok (antes de qualquer auth/rota) — evita 401 em deploy
app.use((req, res, next) => {
  const url = (req.originalUrl || req.url || '').split('?')[0];
  if (req.method === 'GET' && (url.includes('theme-config/ok') || (req.url && String(req.url).indexOf('theme-config/ok') !== -1))) {
    res.setHeader('X-Theme-Config', 'enabled');
    return res.status(200).json({ ok: true, themeConfig: 'enabled', path: url || req.url, _v: 2 });
  }
  next();
});

// Configurar multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Criar diretório uploads se não existir
    const uploadDir = join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Usar nome original ou gerar nome único
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = file.originalname.split('.').pop();
    cb(null, `${uniqueSuffix}.${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Aceitar apenas imagens
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos'));
    }
  }
});

// Middleware para log de requisições (debug)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    headers: req.headers,
    body: req.body,
  });
  next();
});

// Testar conexão com PostgreSQL
pool.on('error', (err) => {
  console.error('Erro inesperado no pool de conexões PostgreSQL', err);
});

// Middleware de autenticação JWT
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação necessário' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    const tokenUserId = decoded.id || decoded.userId || decoded.sub;
    
    // CRÍTICO: company_id SEMPRE do banco — nunca confiar no token para isolamento entre empresas
    // Se o usuário existe no banco e company_id está NULL, não usar token (evita ver dados de outra empresa)
    try {
      const userResult = await pool.query(
        'SELECT company_id FROM users WHERE id = $1',
        [tokenUserId]
      );
      if (userResult.rows.length > 0) {
        const dbCompanyId = userResult.rows[0].company_id;
        if (dbCompanyId) {
          req.companyId = dbCompanyId;
          req.user.company_id = dbCompanyId;
        }
        // Se company_id no banco é NULL: não usar decoded.company_id (token pode estar desatualizado)
      } else if (decoded.company_id) {
        req.companyId = decoded.company_id;
        req.user.company_id = decoded.company_id;
      }
    } catch (dbError) {
      if (dbError.message && dbError.message.includes('company_id')) {
        console.warn('[Auth] Coluna company_id não existe na tabela users');
        if (decoded.company_id) {
          req.companyId = decoded.company_id;
          req.user.company_id = decoded.company_id;
        }
      } else {
        throw dbError;
      }
    }
    
    next();
  } catch (err) {
    console.error('[Auth] Erro ao verificar token:', err.message);
    return res.status(403).json({ error: 'Token inválido ou expirado' });
  }
};

// Rate limiting - NÃO aplicar limite em rotas /api/auth/* (evita 429 em auth/me e login)
// Limite alto (30k req/15min/IP) para suportar dashboards com muitas queries
// simultaneas (sales, users, fornecedores, etc.) e o retry interno do React Query.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const url = (req.originalUrl || req.url || '').toLowerCase();
    // auth/me, auth/login, auth/signup, /query/* nao consomem limite geral
    if (url.includes('/auth')) return true;
    // Rotas de leitura (POST /api/query/*) sao chamadas em alta frequencia pelo
    // dashboard e dependem do react-query: nao bloqueamos por rate-limit aqui.
    if (url.startsWith('/api/query/') || url.includes('/api/query/')) return true;
    return false;
  },
});

// Login/signup: limite bem alto; reiniciar a API zera o contador em memória
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10000, // 10k tentativas por IP (evita bloqueio com vários usuários / re-logins)
  message: { error: 'Muitas tentativas de login. Aguarde alguns minutos ou reinicie o servidor da API.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar rate limiting (auth primeiro, depois geral que ignora /api/auth/*)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/demo', authLimiter);
app.use('/api/', limiter);

// Rota de teste de API tokens (ANTES do middleware de autenticação)
app.get('/api/api-tokens/test', (req, res) => {
  res.json({ success: true, message: 'Rota de API tokens está funcionando!' });
});

// Theme-config GET (ANTES do middleware de auth — assim não exige token)
app.get('/api/theme-config/ok', (req, res) => {
  res.setHeader('X-Theme-Config', 'enabled');
  res.json({ ok: true, themeConfig: 'enabled', path: req.path || req.url });
});
app.get('/theme-config/ok', (req, res) => {
  res.setHeader('X-Theme-Config', 'enabled');
  res.json({ ok: true, themeConfig: 'enabled', path: req.path || req.url });
});

// POST - Gerar códigos em massa para produtos sem código (autenticado) — apenas da empresa
// IMPORTANTE: Esta rota deve estar ANTES do middleware global que pula /api/functions/*
app.post('/api/functions/gerar-codigos-produtos', authenticateToken, requirePermission('produtos.manage'), async (req, res) => {
  try {
    if (!req.companyId) {
      return res.status(403).json({ error: 'Usuário sem empresa vinculada.', codigo: 'COMPANY_ID_REQUIRED' });
    }
    const companyId = req.companyId;
    console.log('[Gerar Códigos] Iniciando geração de códigos para produtos sem código (empresa)', companyId);
    
    // Buscar o maior código existente — apenas da empresa
    const maxCodigoResult = await pool.query(`
      SELECT MAX(codigo) as max_codigo
      FROM produtos
      WHERE company_id = $1 AND codigo IS NOT NULL
    `, [companyId]);
    
    const maxCodigo = maxCodigoResult.rows[0]?.max_codigo || 0;
    let proximoCodigo = maxCodigo + 1;
    
    // Buscar todos os produtos sem código — apenas da empresa
    const produtosSemCodigoResult = await pool.query(`
      SELECT id, nome
      FROM produtos
      WHERE company_id = $1 AND codigo IS NULL
      ORDER BY nome
    `, [companyId]);
    
    const produtosSemCodigo = produtosSemCodigoResult.rows;
    console.log(`[Gerar Códigos] Encontrados ${produtosSemCodigo.length} produtos sem código`);
    
    if (produtosSemCodigo.length === 0) {
      return res.json({ 
        success: true, 
        message: 'Nenhum produto sem código encontrado',
        atualizados: 0 
      });
    }
    
    // Atualizar cada produto com um código sequencial (apenas da empresa)
    let atualizados = 0;
    for (const produto of produtosSemCodigo) {
      try {
        await pool.query(`
          UPDATE produtos
          SET codigo = $1
          WHERE id = $2 AND company_id = $3
        `, [proximoCodigo, produto.id, companyId]);
        
        atualizados++;
        proximoCodigo++;
      } catch (error) {
        console.error(`[Gerar Códigos] Erro ao atualizar produto ${produto.id}:`, error);
      }
    }
    
    console.log(`[Gerar Códigos] ${atualizados} produtos atualizados com sucesso`);
    
    res.json({ 
      success: true, 
      message: `${atualizados} produtos receberam códigos automaticamente`,
      atualizados 
    });
  } catch (error) {
    console.error('[Gerar Códigos] Erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rotas de revenda (admin apenas) - ANTES do middleware global
try {
  console.log('[Server] Registrando rotas de revenda em /api/admin/revenda');
  console.log('[Server] Tipo de resellerRoutes:', typeof resellerRoutes);
  console.log('[Server] resellerRoutes é função?', typeof resellerRoutes === 'function');
  console.log('[Server] resellerRoutes:', resellerRoutes);
  
  if (!resellerRoutes) {
    throw new Error('resellerRoutes é undefined ou null');
  }
  
  // Registrar rotas de revenda
  app.use('/api/admin/revenda', resellerRoutes);
  console.log('[Server] ✅ Rotas de revenda registradas com sucesso');
  
  // Registrar rotas de pagamentos (COM autenticação)
  app.use('/api/payments', authenticateToken, paymentsRoutes);
  console.log('[Server] ✅ Rotas de pagamentos registradas com sucesso');
  
  // Registrar rotas de dashboard (COM autenticação)
  app.use('/api/dashboard', authenticateToken, dashboardRoutes);
  console.log('[Server] ✅ Rotas de dashboard registradas com sucesso');
  
  // Registrar rotas de devoluções e vales (COM autenticação)
  app.use('/api/refunds', authenticateToken, refundsRoutes);
  console.log('[Server] ✅ Rotas de devoluções registradas com sucesso');

  app.use('/api/reports', authenticateToken, reportsRoutes);
  console.log('[Server] ✅ Rotas de relatórios registradas em /api/reports');
  
  // Registrar rotas de formas de pagamento (COM autenticação)
  app.use('/api/payment-methods', authenticateToken, paymentMethodsRoutes);
  console.log('[Server] ✅ Rotas de formas de pagamento registradas com sucesso');
  
  // Registrar rotas de financeiro/IA (COM autenticação)
  app.use('/api/financeiro', authenticateToken, financeiroRoutes);
  // Registrar rotas do Painel de Alertas (COM autenticação) ou stub 503 se módulo não carregou
  if (alertsRoutes) {
    app.use('/api/alerts', authenticateToken, alertsRoutes);
    console.log('[Server] ✅ Rotas do Painel de Alertas registradas com sucesso');
  } else {
    app.use('/api/alerts', authenticateToken, (req, res) => {
      res.status(503).json({
        error: 'Painel de Alertas indisponível. Rode a migração PAINEL_ALERTAS_TABELAS.sql no banco e reinicie a API.',
        codigo: 'ALERTS_MODULE_NOT_LOADED',
      });
    });
    console.log('[Server] ⚠️ Painel de Alertas: usando stub 503 (migração não aplicada ou erro no carregamento)');
  }
  if (osPosVendaFollowupRoutes) {
    app.use('/api/os-pos-venda-followup', authenticateToken, osPosVendaFollowupRoutes);
    console.log('[Server] ✅ Rotas de follow-up pós-venda em /api/os-pos-venda-followup');
  }
  if (birthdayMessagesRoutes) {
    app.use('/api/birthday-messages', authenticateToken, birthdayMessagesRoutes);
    console.log('[Server] ✅ Rotas de mensagens de aniversário em /api/birthday-messages');
  }
  console.log('[Server] ✅ Rotas de financeiro/IA registradas com sucesso');
  
  // Job para verificar inadimplentes a cada hora
  setInterval(async () => {
    try {
      const result = await checkAndBlockOverdueCompanies();
      if (result.blocked > 0) {
        console.log(`[Server] ${result.blocked} empresas bloqueadas por inadimplência`);
      }
    } catch (error) {
      console.error('[Server] Erro ao verificar inadimplentes:', error);
    }
  }, 60 * 60 * 1000); // 1 hora

  // Follow-up WhatsApp pós-venda (OS faturada): processar fila a cada 1 minuto
  if (osPosVendaFollowupRoutes) {
    setInterval(() => {
      import('./jobs/osPosVendaFollowupWorker.js')
        .then((m) => m.runOsPosVendaFollowupTick(pool))
        .then((r) => {
          if (r?.processed > 0) {
            console.log('[OS Follow-up Worker]', r);
          }
        })
        .catch((err) => {
          if (!String(err.message || err).includes('does not exist')) {
            console.error('[OS Follow-up Worker]', err.message || err);
          }
        });
    }, 60 * 1000);
    console.log('[Server] ✅ Worker follow-up pós-venda agendado (1 min)');
  }

  if (birthdayMessagesRoutes) {
    setInterval(() => {
      import('./jobs/birthdayMessageWorker.js')
        .then((m) => m.runBirthdayMessageTick(pool))
        .then((r) => {
          if ((r?.sync?.created || 0) > 0 || (r?.process?.processed || 0) > 0) {
            console.log('[Birthday Message Worker]', r);
          }
        })
        .catch((err) => {
          if (!String(err.message || err).includes('does not exist')) {
            console.error('[Birthday Message Worker]', err.message || err);
          }
        });
    }, 60 * 1000);
    console.log('[Server] ✅ Worker de mensagens de aniversário agendado (1 min)');
  }

  if (alertsRoutes) {
    const runBillAlerts = () => {
      import('./jobs/billAlertWorker.js')
        .then((m) => m.runBillAlertTick(pool))
        .then((r) => {
          if ((r?.processed || 0) > 0) {
            console.log('[Bill Alert Worker]', r);
          }
        })
        .catch((err) => {
          if (!String(err.message || err).includes('does not exist')) {
            console.error('[Bill Alert Worker]', err.message || err);
          }
        });
    };
    setTimeout(runBillAlerts, 10 * 1000);
    setInterval(runBillAlerts, 15 * 60 * 1000);
    console.log('[Server] ✅ Worker de alertas de contas a pagar agendado (15 min)');
  }
  
  // Jobs de financeiro/IA (assíncrono para não bloquear)
  (async () => {
    try {
      const financeiroJobs = await import('./jobs/financeiroJobs.js');
      
      // Executar jobs uma vez ao iniciar (para popular dados iniciais)
      console.log('[Server] Executando jobs iniciais de financeiro...');
      await financeiroJobs.criarSnapshotDiarioVendas().catch(e => console.error('[Financeiro Jobs] Erro inicial:', e));
      await financeiroJobs.gerarRecomendacoesEstoque().catch(e => console.error('[Financeiro Jobs] Erro inicial:', e));
      
      // Snapshot diário (executar às 00:00)
      const agora = new Date();
      const proximaMeiaNoite = new Date(agora);
      proximaMeiaNoite.setHours(24, 0, 0, 0);
      const msAteMeiaNoite = proximaMeiaNoite.getTime() - agora.getTime();
      
      scheduleLongTimeout(() => {
        financeiroJobs.criarSnapshotDiarioVendas();
        financeiroJobs.gerarRecomendacoesEstoque();
        
        // Depois, executar diariamente
        setInterval(() => {
          financeiroJobs.criarSnapshotDiarioVendas();
          financeiroJobs.gerarRecomendacoesEstoque();
        }, 24 * 60 * 60 * 1000);
      }, msAteMeiaNoite);
      
      // Análise mensal (dia 1 de cada mês, às 01:00). Não usar setInterval de 30 dias:
      // esse intervalo ultrapassa o limite seguro do Node e pode disparar em loop.
      const scheduleNextMonthlyAnalysis = () => {
        const now = new Date();
        const nextRun = new Date(now);
        nextRun.setDate(1);
        nextRun.setHours(1, 0, 0, 0);
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }

        const delayMs = nextRun.getTime() - now.getTime();
        console.log(`[Server] Próxima análise mensal financeira agendada para ${nextRun.toISOString()}`);

        scheduleLongTimeout(async () => {
          await financeiroJobs.calcularAnaliseMensalProdutos().catch(e => console.error('[Financeiro Jobs] Erro mensal:', e));
          await financeiroJobs.calcularAnaliseMensalVendedores().catch(e => console.error('[Financeiro Jobs] Erro mensal:', e));
          scheduleNextMonthlyAnalysis();
        }, delayMs);
      };

      scheduleNextMonthlyAnalysis();
      
      console.log('[Server] ✅ Jobs de financeiro/IA agendados');
    } catch (error) {
      console.warn('[Server] ⚠️ Erro ao carregar jobs de financeiro:', error.message);
    }
  })();
  
  // Rota de teste para verificar se está funcionando
  app.get('/api/admin/revenda/test', (req, res) => {
    res.json({ success: true, message: 'Rotas de revenda estão funcionando!' });
  });
  
  // Listar rotas registradas (debug)
  console.log('[Server] Rotas registradas no Express:', app._router?.stack?.filter(r => r.route || r.regexp?.test('/api/admin/revenda')).length || 'N/A');
} catch (error) {
  console.error('[Server] ❌ Erro ao registrar rotas de revenda:', error);
  console.error('[Server] Stack trace:', error.stack);
  app.use('/api/admin/revenda', (req, res) => {
    res.status(500).json({ error: 'Rotas de revenda não disponíveis', details: error.message });
  });
}

// Importar middleware de company
let requireCompanyAccess;
try {
  const companyMiddleware = await import('./middleware/companyMiddleware.js');
  requireCompanyAccess = companyMiddleware.requireCompanyAccess;
  console.log('[Server] ✅ Middleware de company carregado');
} catch (error) {
  console.warn('[Server] ⚠️ Middleware de company não encontrado:', error.message);
  requireCompanyAccess = null;
}

// Aplicar autenticação a rotas de dados (não aplicar em /api/auth/*, /api/health, /api/functions/*, /api/whatsapp/*, /api/v1/*)
// Os endpoints /api/functions/*, /api/whatsapp/* e /api/v1/* terão autenticação própria dentro de cada rota
app.use((req, res, next) => {
  // Preflight CORS: OPTIONS nunca exige autenticação
  if (req.method === 'OPTIONS') return next();
  // GET theme-config/ok: responder aqui também (redundante com middleware cedo — cobre processo antigo na porta ou ordem diferente)
  if (req.method === 'GET' && typeof req.url === 'string' && req.url.indexOf('theme-config/ok') !== -1) {
    res.setHeader('X-Theme-Config', 'enabled');
    return res.status(200).json({ ok: true, themeConfig: 'enabled', path: req.url, _v: 2 });
  }
  if (req.method === 'GET' && typeof req.url === 'string' && req.url.indexOf('theme-config') !== -1) return next();
  // Pular autenticação para rotas de auth, health check, functions, whatsapp, webhook/leads, webhook/test e API pública v1
  // Também pular para rota de teste de api-tokens
  // IMPORTANTE: Pular também para /api/admin/revenda/* pois já tem autenticação própria
  // IMPORTANTE: Pular também para /api/public/* (portal de vagas e candidaturas públicas)
  const isGetThemeConfig = req.method === 'GET' && (
    (req.path && (req.path.startsWith('/api/theme-config') || req.path.startsWith('/theme-config') || req.path.includes('theme-config'))) ||
    (req.originalUrl && req.originalUrl.includes('theme-config'))
  );
  if (req.path.startsWith('/api/auth/') || 
      req.path === '/api/health' || 
      req.path === '/health' ||
      isGetThemeConfig || // GET tema e /ok públicos (qualquer formato de path)
      req.path.startsWith('/api/public/') ||  // Rotas públicas (vagas, candidaturas)
      req.path.startsWith('/api/functions/') ||
      req.path.startsWith('/api/storage/') ||
      req.path.startsWith('/api/whatsapp/') ||
      req.path.startsWith('/api/webhook/leads/') ||
      req.path.startsWith('/api/webhook/ativa-crm/') ||
      req.path.startsWith('/api/v1/') ||  // API pública v1 usa validateApiToken
      req.path.startsWith('/api/admin/revenda/') || // Rotas de revenda já têm autenticação própria
      req.path.startsWith('/api/api-tokens') || // Rotas de API tokens (admin apenas)
      req.path === '/api/api-tokens/test' ||
      (req.method === 'POST' && /^\/api\/webhook\/test\/[^/]+$/.test(req.path))) { // Webhook test público
    return next();
  }
  // Aplicar autenticação para outras rotas /api/*
  if (req.path.startsWith('/api/')) {
    return authenticateToken(req, res, next);
  }
  next();
});

// Aplicar verificação de assinatura ativa para rotas que precisam (após autenticação)
if (requireCompanyAccess) {
  app.use((req, res, next) => {
    // Pular verificação de company para rotas que não precisam
    if (req.path.startsWith('/api/auth/') || 
        req.path === '/api/health' || 
        req.path === '/health' ||
        req.path.startsWith('/api/public/') ||  // Rotas públicas (vagas, candidaturas)
        req.path.startsWith('/api/functions/') ||
        req.path.startsWith('/api/storage/') ||
        req.path.startsWith('/api/whatsapp/') ||
        req.path.startsWith('/api/webhook/') ||
        req.path.startsWith('/api/v1/') ||  // API pública v1
        req.path.startsWith('/api/admin/revenda/') || // Rotas de revenda
        req.path.startsWith('/api/api-tokens') || // Rotas de API tokens
        !req.user) { // Se não está autenticado, pula
      return next();
    }
    // Aplicar verificação de company para rotas autenticadas
    return requireCompanyAccess(req, res, next);
  });
  console.log('[Server] ✅ Middleware de verificação de assinatura aplicado');
}

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ============================================
// ENDPOINT DE HEALTH CHECK
// ============================================

// Health check (não precisa de autenticação)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API PostgreSQL está funcionando',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// ENDPOINTS PÚBLICOS (sem autenticação)
// ============================================

// Visível no portal: flag visible_on_portal (default true) + ativa ou encerrada publicável
const jobSurveyPublicPortalSql = `(
  COALESCE(visible_on_portal, true) = true
  AND (
    is_active = true
    OR (is_active = false AND (published_at IS NOT NULL OR (slug IS NOT NULL AND TRIM(slug) <> '')))
  )
)`;

// Listar vagas públicas (ativas + encerradas que já foram publicadas, salvo se ocultas do portal)
app.get('/api/public/vagas', async (req, res) => {
  try {
    const { search, location, modality, contract_type, page = 1, pageSize = 12 } = req.query;
    
    let whereConditions = [jobSurveyPublicPortalSql];
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(
        title ILIKE $${paramIndex} OR 
        position_title ILIKE $${paramIndex} OR 
        description ILIKE $${paramIndex} OR 
        department ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (location) {
      whereConditions.push(`location ILIKE $${paramIndex}`);
      params.push(`%${location}%`);
      paramIndex++;
    }

    if (modality) {
      whereConditions.push(`work_modality = $${paramIndex}`);
      params.push(modality);
      paramIndex++;
    }

    if (contract_type) {
      whereConditions.push(`contract_type = $${paramIndex}`);
      params.push(contract_type);
      paramIndex++;
    }

    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    
    // Contar total
    const countSql = `SELECT COUNT(*) FROM job_surveys WHERE ${whereConditions.join(' AND ')}`;
    const countResult = await pool.query(countSql, params);
    const total = parseInt(countResult.rows[0].count);

    // Buscar vagas
    const sql = `
      SELECT * FROM job_surveys 
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY is_active DESC, created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(parseInt(pageSize), offset);
    
    const result = await pool.query(sql, params);
    
    res.json({
      data: result.rows,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / parseInt(pageSize))
    });
  } catch (error) {
    console.error('[Public] Erro ao buscar vagas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar slugs de vagas ativas (para debug)
app.get('/api/public/vagas/slugs', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, slug, title, is_active FROM job_surveys WHERE is_active = true ORDER BY created_at DESC'
    );
    res.json({ data: result.rows });
  } catch (error) {
    console.error('[Public] Erro ao listar slugs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar vaga por slug ou ID (pública)
app.get('/api/public/vaga/:slugOrId', async (req, res) => {
  try {
    const { slugOrId } = req.params;
    console.log('[Public] Buscando vaga por slug/id:', slugOrId);
    
    // Tentar buscar por slug (case-insensitive)
    let result = await pool.query(
      `SELECT * FROM job_surveys WHERE LOWER(slug) = LOWER($1) AND ${jobSurveyPublicPortalSql}`,
      [slugOrId]
    );
    
    // Se não encontrar por slug, tentar por ID
    if (result.rows.length === 0 && slugOrId.length === 36) {
      result = await pool.query(
        `SELECT * FROM job_surveys WHERE id = $1 AND ${jobSurveyPublicPortalSql}`,
        [slugOrId]
      );
    }
    
    // Se ainda não encontrar, tentar busca parcial no slug
    if (result.rows.length === 0) {
      result = await pool.query(
        `SELECT * FROM job_surveys WHERE LOWER(slug) LIKE LOWER($1) AND ${jobSurveyPublicPortalSql}`,
        [`%${slugOrId}%`]
      );
    }
    
    if (result.rows.length === 0) {
      console.log('[Public] Vaga não encontrada:', slugOrId);
      return res.status(404).json({ error: 'Vaga não encontrada', slug: slugOrId });
    }
    
    console.log('[Public] Vaga encontrada:', result.rows[0].title);
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('[Public] Erro ao buscar vaga:', error);
    res.status(500).json({ error: error.message });
  }
});

// Submeter candidatura (pública)
app.post('/api/public/candidatura', async (req, res) => {
  try {
    const { survey_id, name, email, phone, whatsapp, responses, ...otherData } = req.body;
    
    if (!survey_id || !name || !email) {
      return res.status(400).json({ error: 'survey_id, name e email são obrigatórios' });
    }
    
    // Buscar a vaga para pegar o company_id
    const surveyResult = await pool.query(
      'SELECT * FROM job_surveys WHERE id = $1',
      [survey_id]
    );
    
    if (surveyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vaga não encontrada' });
    }

    if (surveyResult.rows[0].is_active === false) {
      return res.status(400).json({ error: 'As inscrições para esta vaga foram encerradas.' });
    }
    
    const companyId = surveyResult.rows[0].company_id;
    const surveyRow = surveyResult.rows[0];
    
    // Inserir candidatura
    const insertResult = await pool.query(`
      INSERT INTO job_responses (
        survey_id, name, email, phone, whatsapp, responses, company_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'received')
      RETURNING *
    `, [survey_id, name, email.toLowerCase(), phone, whatsapp, JSON.stringify(responses || {}), companyId]);
    
    const response = insertResult.rows[0];
    const protocol = `APP-${response.id.split('-')[0].toUpperCase()}`;
    
    res.json({ 
      success: true, 
      data: response,
      protocol 
    });

    void notifyAdminsNewJobCandidate(pool, { surveyRow, responseRow: response }).catch((e) =>
      console.error('[RH] notify public/candidatura:', e)
    );
  } catch (error) {
    console.error('[Public] Erro ao submeter candidatura:', error);
    res.status(500).json({ error: error.message });
  }
});

// Consultar status de candidatura (pública)
app.get('/api/public/candidatura/:protocol', async (req, res) => {
  try {
    const { protocol } = req.params;
    const uuidStart = protocol.replace('APP-', '').toLowerCase();
    
    // Buscar candidatura pelo início do UUID
    const result = await pool.query(`
      SELECT jr.*, js.title as survey_title, js.position_title
      FROM job_responses jr
      LEFT JOIN job_surveys js ON jr.survey_id = js.id
      WHERE LOWER(jr.id) LIKE $1 || '%'
      ORDER BY jr.created_at DESC
      LIMIT 1
    `, [uuidStart]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidatura não encontrada' });
    }
    
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('[Public] Erro ao consultar candidatura:', error);
    res.status(500).json({ error: error.message });
  }
});

// Acompanhamento de OS (público - usado pelo QR code na OS). Não incluir coluna "operadora" (pode não existir na tabela).
app.get('/api/public/acompanhar-os/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'ID da OS é obrigatório' });
    const result = await pool.query(`
      SELECT id, numero, status, cliente_nome, marca_nome, modelo_nome, cor, numero_serie, imei, descricao_problema, data_entrada, previsao_entrega, valor_total, observacoes
      FROM ordens_servico
      WHERE id = $1
      LIMIT 1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ordem de Serviço não encontrada' });
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('[Public] Erro ao consultar OS:', error);
    res.status(500).json({ error: error.message });
  }
});

// Segunda via do cupom (público - usado pelo QR code). Não exige autenticação.
app.get('/api/public/cupom/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'ID do cupom é obrigatório' });
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const saleResult = await pool.query(
      `SELECT id, numero, status, created_at, subtotal, total, desconto_total,
              cliente_id, cliente_nome, cliente_cpf_cnpj, cliente_telefone, observacoes, ordem_servico_id
       FROM public.sales WHERE ${isUUID ? 'id = $1' : 'numero = $1'} LIMIT 1`,
      [isUUID ? id : parseInt(id, 10)]
    );
    if (saleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cupom não encontrado' });
    }
    const sale = saleResult.rows[0];
    if (sale.cliente_id && (!sale.cliente_cpf_cnpj || !sale.cliente_telefone)) {
      try {
        const clienteResult = await pool.query(
          'SELECT cpf_cnpj, telefone, whatsapp FROM public.clientes WHERE id = $1 LIMIT 1',
          [sale.cliente_id]
        );
        const cliente = clienteResult.rows[0];
        if (cliente) {
          sale.cliente_cpf_cnpj = sale.cliente_cpf_cnpj || cliente.cpf_cnpj || null;
          sale.cliente_telefone = sale.cliente_telefone || cliente.telefone || cliente.whatsapp || null;
        }
      } catch (clienteError) {
        console.warn('[Public] Nao foi possivel complementar dados do cliente do cupom:', clienteError);
      }
    }
    const saleId = sale.id;
    const [itemsResult, paymentsResult] = await Promise.all([
      pool.query(
        `SELECT si.id, si.produto_id, si.produto_nome, si.produto_codigo, si.produto_codigo_barras,
                si.quantidade, si.valor_unitario, si.desconto, si.valor_total
         FROM public.sale_items si WHERE si.sale_id = $1 ORDER BY si.created_at`,
        [saleId]
      ),
      pool.query(
        `SELECT forma_pagamento, valor, troco, parcelas, status
         FROM public.payments WHERE sale_id = $1 AND status = 'confirmed' ORDER BY created_at`,
        [saleId]
      )
    ]);
    res.json({
      sale,
      items: itemsResult.rows,
      payments: paymentsResult.rows,
    });
  } catch (error) {
    console.error('[Public] Erro ao consultar cupom:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ENDPOINTS DE CANDIDATURA (Functions - Público)
// ============================================

// POST /api/functions/job-application-save-draft - Salvar rascunho de candidatura
app.post('/api/functions/job-application-save-draft', async (req, res) => {
  try {
    const { survey_id, email, name, phone, age, cep, address, whatsapp, instagram, linkedin, responses, current_step, form_data } = req.body;
    
    if (!survey_id) {
      return res.status(400).json({ error: 'survey_id é obrigatório' });
    }
    
    // Buscar a vaga para pegar o company_id
    const surveyResult = await pool.query(
      'SELECT id, company_id, is_active FROM job_surveys WHERE id = $1',
      [survey_id]
    );
    
    if (surveyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vaga não encontrada' });
    }

    if (surveyResult.rows[0].is_active === false) {
      return res.status(400).json({ error: 'As inscrições para esta vaga foram encerradas.' });
    }
    
    const companyId = surveyResult.rows[0].company_id;
    const emailLower = email?.toLowerCase() || null;
    
    // Verificar se já existe um rascunho para este email/survey
    const existingDraft = await pool.query(
      'SELECT id FROM job_application_drafts WHERE survey_id = $1 AND email = $2',
      [survey_id, emailLower]
    );
    
    let result;
    if (existingDraft.rows.length > 0) {
      // Atualizar rascunho existente
      result = await pool.query(`
        UPDATE job_application_drafts 
        SET name = $1, phone = $2, age = $3, cep = $4, address = $5, 
            whatsapp = $6, instagram = $7, linkedin = $8, responses = $9,
            current_step = $10, form_data = $11, updated_at = NOW(), last_saved_at = NOW()
        WHERE id = $12
        RETURNING *
      `, [name, phone, age, cep, address, whatsapp, instagram, linkedin, 
          JSON.stringify(responses || {}), current_step, JSON.stringify(form_data || {}),
          existingDraft.rows[0].id]);
    } else {
      // Criar novo rascunho
      result = await pool.query(`
        INSERT INTO job_application_drafts (
          survey_id, email, name, phone, age, cep, address, whatsapp, instagram, linkedin,
          responses, current_step, form_data, company_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `, [survey_id, emailLower, name, phone, age, cep, address, whatsapp, instagram, linkedin,
          JSON.stringify(responses || {}), current_step, JSON.stringify(form_data || {}), companyId]);
    }
    
    res.json({ 
      success: true, 
      draft_id: result.rows[0].id 
    });
  } catch (error) {
    console.error('[Functions] Erro ao salvar rascunho:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/functions/job-application-submit - Submeter candidatura final
app.post('/api/functions/job-application-submit', async (req, res) => {
  try {
    const { survey_id, name, email, phone, age, cep, address, whatsapp, instagram, linkedin, responses } = req.body;
    
    if (!survey_id || !name || !email) {
      return res.status(400).json({ error: 'survey_id, name e email são obrigatórios' });
    }
    
    // Buscar a vaga completa (questions, company_name, etc.) para notificação RH e validações
    const surveyResult = await pool.query(
      'SELECT * FROM job_surveys WHERE id = $1',
      [survey_id]
    );
    
    if (surveyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vaga não encontrada' });
    }
    
    const survey = surveyResult.rows[0];

    if (survey.is_active === false) {
      return res.status(400).json({ error: 'As inscrições para esta vaga foram encerradas.' });
    }
    const companyId = survey.company_id;
    const emailLower = email.toLowerCase().trim();

    // Permitir candidatura mesmo se o e-mail já possui cadastro (usuário) no sistema —
    // funcionários antigos, leads, ex-candidatos, etc. não devem ser bloqueados aqui.
    // A duplicidade por vaga (mesma vaga + mesmo e-mail) continua sendo barrada logo abaixo.

    // Verificar se já existe candidatura deste email para esta vaga
    const existingResponse = await pool.query(
      'SELECT id, created_at FROM job_responses WHERE survey_id = $1 AND email = $2',
      [survey_id, emailLower]
    );
    
    if (existingResponse.rows.length > 0) {
      const existingId = existingResponse.rows[0].id;
      const existingDate = existingResponse.rows[0].created_at;
      console.log('[API] Candidatura duplicada detectada:', {
        survey_id,
        survey_title: survey.title || survey.position_title,
        email: emailLower,
        existing_job_response_id: existingId,
        existing_created_at: existingDate,
        attempted_at: new Date().toISOString()
      });
      
      return res.status(409).json({ 
        error: 'Você já se candidatou para esta vaga',
        job_response_id: existingId,
        created_at: existingDate
      });
    }
    
    // Inserir candidatura
    const insertResult = await pool.query(`
      INSERT INTO job_responses (
        survey_id, name, email, phone, age, cep, address, whatsapp, instagram, linkedin,
        responses, company_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [survey_id, name.trim(), emailLower, phone, age, cep, address, whatsapp, instagram, linkedin,
        JSON.stringify(responses || {}), companyId]);
    
    const response = insertResult.rows[0];
    
    // Deletar rascunho se existir
    await pool.query(
      'DELETE FROM job_application_drafts WHERE survey_id = $1 AND email = $2',
      [survey_id, emailLower]
    );
    
    console.log(`[Functions] Nova candidatura: ${name} para ${survey.title}`);
    
    res.json({ 
      success: true, 
      submissionId: response.id,
      job_response_id: response.id,
      data: response
    });

    void notifyAdminsNewJobCandidate(pool, { surveyRow: survey, responseRow: response }).catch((e) =>
      console.error('[RH] notify job-application-submit:', e)
    );
  } catch (error) {
    console.error('[Functions] Erro ao submeter candidatura:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ENDPOINTS DE AUTENTICAÇÃO
// ============================================

// Login - APENAS PostgreSQL, SEM Supabase
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('[API] Tentativa de login:', { email: email?.toLowerCase() });

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // 🚫 BUSCAR APENAS NA TABELA users DO POSTGRESQL
    // NÃO usar Supabase Auth de forma alguma
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      console.log('[API] Usuário não encontrado na tabela users:', email.toLowerCase());
      return res.status(401).json({ error: 'Email ou senha incorretos. Verifique se o usuário existe na tabela "users" do PostgreSQL.' });
    }

    const user = result.rows[0];
    console.log('[API] Usuário encontrado:', { id: user.id, email: user.email, hasPasswordHash: !!user.password_hash });

    // Verificar se tem password_hash
    if (!user.password_hash) {
      console.error('[API] Usuário sem password_hash:', user.id);
      return res.status(401).json({ error: 'Usuário sem senha configurada. Entre em contato com o administrador.' });
    }

    // Verificar senha usando bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      console.log('[API] Senha incorreta para usuário:', email.toLowerCase());
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    console.log('[API] Senha válida, buscando profile...');

    // Buscar profile do usuário na tabela profiles do PostgreSQL
    const profileResult = await pool.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [user.id]
    );

    const profile = profileResult.rows[0] || null;
    console.log('[API] Profile encontrado:', { hasProfile: !!profile, role: profile?.role });

    // Gerar token JWT (incluindo company_id para isolamento de dados)
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        role: profile?.role || 'member',
        company_id: user.company_id
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('[API] Login bem-sucedido:', { userId: user.id, email: user.email, company_id: user.company_id, hasToken: !!token });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        email_verified: user.email_verified,
        created_at: user.created_at,
        company_id: user.company_id
      },
      profile
    });
  } catch (error) {
    console.error('[API] Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Login demo — entra com usuário de demonstração (credenciais só no servidor)
const DEMO_EMAIL = process.env.DEMO_EMAIL || process.env.DEMO_USER_EMAIL;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || process.env.DEMO_USER_PASSWORD;

app.post('/api/auth/demo', async (req, res) => {
  try {
    if (!DEMO_EMAIL || !DEMO_PASSWORD) {
      return res.status(503).json({
        error: 'Demonstração não configurada. Defina DEMO_EMAIL e DEMO_PASSWORD no servidor.',
        code: 'DEMO_NOT_CONFIGURED'
      });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [DEMO_EMAIL.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(503).json({
        error: 'Usuário de demonstração não encontrado no banco. Execute o script de criação do usuário demo.',
        code: 'DEMO_USER_NOT_FOUND'
      });
    }

    const user = result.rows[0];
    if (!user.password_hash) {
      return res.status(503).json({ error: 'Usuário demo sem senha configurada.', code: 'DEMO_NO_PASSWORD' });
    }

    const isValidPassword = await bcrypt.compare(DEMO_PASSWORD, user.password_hash);
    if (!isValidPassword) {
      return res.status(503).json({ error: 'Senha do usuário demo não confere com DEMO_PASSWORD.', code: 'DEMO_PASSWORD_MISMATCH' });
    }

    const profileResult = await pool.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [user.id]
    );
    const profile = profileResult.rows[0] || null;

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: profile?.role || 'member',
        company_id: user.company_id
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        email_verified: user.email_verified,
        created_at: user.created_at,
        company_id: user.company_id
      },
      profile
    });
  } catch (error) {
    console.error('[API] Erro no login demo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Signup (Cadastro)
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, display_name, phone, department, role, company_id } = req.body;

    console.log('[API] Tentativa de cadastro:', { email: email?.toLowerCase(), hasDisplayName: !!display_name, company_id });

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    // Verificar se email já existe
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (existingUser.rows.length > 0) {
      console.log('[API] Email já cadastrado:', email.toLowerCase());
      return res.status(400).json({ error: 'Este email já está cadastrado' });
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('[API] Senha hash criada');

    // Criar usuário com company_id (se fornecido)
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, email_verified, company_id)
       VALUES ($1, $2, true, $3)
       RETURNING *`,
      [email.toLowerCase().trim(), passwordHash, company_id || null]
    );

    const newUser = userResult.rows[0];
    console.log('[API] Usuário criado:', { id: newUser.id, email: newUser.email });

    // Criar profile SEMPRE (mesmo que vazio)
    const profileResult = await pool.query(
      `INSERT INTO profiles (user_id, display_name, phone, department, role, approved, approved_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW())
       RETURNING *`,
      [
        newUser.id, 
        display_name || email.split('@')[0] || email, // Usar nome do email se não fornecido
        phone || null, 
        department || null, 
        role || 'member'
      ]
    );
    
    const profile = profileResult.rows[0];
    console.log('[API] Profile criado:', { id: profile.id, display_name: profile.display_name, role: profile.role });

    // Gerar token JWT (incluindo company_id para isolamento de dados)
    const token = jwt.sign(
      { 
        id: newUser.id, 
        email: newUser.email,
        role: profile.role || 'member',
        company_id: newUser.company_id
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('[API] Cadastro bem-sucedido:', { userId: newUser.id, email: newUser.email, company_id: newUser.company_id, hasToken: !!token });

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        email_verified: newUser.email_verified,
        created_at: newUser.created_at
      },
      profile
    });
  } catch (error) {
    console.error('[API] Erro no cadastro:', error);
    res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
});

// Obter usuário atual
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar usuário
    const userResult = await pool.query(
      'SELECT id, email, email_verified, created_at, company_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = userResult.rows[0];

    // Buscar profile
    const profileResult = await pool.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [userId]
    );

    const profile = profileResult.rows[0] || null;

    res.json({
      user,
      profile
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Logout (apenas remove token do cliente, não precisa fazer nada no servidor)
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logout realizado com sucesso' });
});

// Menu por segmento: retorna o menu (módulos) da empresa do usuário para adaptar sidebar
app.get('/api/me/segment-menu', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.json({ segmento_id: null, segmento_nome: null, segmento_slug: null, menu: [] });
    const hasSegmentoCol = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'segmento_id'`
    );
    if (hasSegmentoCol.rows.length === 0) return res.json({ segmento_id: null, segmento_nome: null, segmento_slug: null, menu: [] });
    const company = await pool.query('SELECT segmento_id FROM companies WHERE id = $1', [companyId]);
    if (company.rows.length === 0 || !company.rows[0].segmento_id) return res.json({ segmento_id: null, segmento_nome: null, segmento_slug: null, menu: [] });
    const segmentoId = company.rows[0].segmento_id;
    const seg = await pool.query('SELECT id, nome, slug FROM segmentos WHERE id = $1', [segmentoId]);
    const segmentoNome = seg.rows[0]?.nome || null;
    const segmentoSlug = seg.rows[0]?.slug || null;
    const menuResult = await pool.query(
      `SELECT m.id, m.nome, m.slug, m.path, m.label_menu, m.icone, m.categoria, sm.ordem_menu
       FROM modulos m
       INNER JOIN segmentos_modulos sm ON sm.modulo_id = m.id AND sm.segmento_id = $1 AND sm.ativo = true
       WHERE m.ativo
       ORDER BY sm.ordem_menu, m.nome`,
      [segmentoId]
    );
    res.json({
      segmento_id: segmentoId,
      segmento_nome: segmentoNome,
      segmento_slug: segmentoSlug,
      menu: (menuResult.rows || []).map((r) => ({ id: r.id, path: r.path, label_menu: r.label_menu || r.nome, slug: r.slug, icone: r.icone, categoria: r.categoria || 'operacao' })),
    });
  } catch (err) {
    console.error('[segment-menu]', err);
    res.json({ segmento_id: null, segmento_nome: null, segmento_slug: null, menu: [] });
  }
});

// Recursos do segmento da empresa (para editor de permissões por segmento, como em empresas)
app.get('/api/me/segment-recursos', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.json({ modulos: [], recursos: [] });
    const hasSegmentoCol = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'segmento_id'`
    );
    if (hasSegmentoCol.rows.length === 0) return res.json({ modulos: [], recursos: [] });
    const company = await pool.query('SELECT segmento_id FROM companies WHERE id = $1', [companyId]);
    if (company.rows.length === 0 || !company.rows[0].segmento_id) return res.json({ modulos: [], recursos: [] });
    const segmentoId = company.rows[0].segmento_id;
    const modulosResult = await pool.query(
      `SELECT m.id, m.nome, m.slug, m.path, m.label_menu, sm.ordem_menu
       FROM modulos m
       INNER JOIN segmentos_modulos sm ON sm.modulo_id = m.id AND sm.segmento_id = $1 AND sm.ativo
       WHERE m.ativo
       ORDER BY sm.ordem_menu, m.nome`,
      [segmentoId]
    );
    const recursosResult = await pool.query(
      `SELECT r.id, r.modulo_id, r.nome, r.slug, r.permission_key
       FROM recursos r
       INNER JOIN segmentos_modulos sm ON sm.modulo_id = r.modulo_id AND sm.segmento_id = $1 AND sm.ativo
       INNER JOIN segmentos_recursos sr ON sr.recurso_id = r.id AND sr.segmento_id = $1 AND sr.ativo
       WHERE r.ativo
       ORDER BY (SELECT ordem_menu FROM segmentos_modulos WHERE segmento_id = $1 AND modulo_id = r.modulo_id), r.nome`,
      [segmentoId]
    );
    res.json({
      modulos: (modulosResult.rows || []).map((m) => ({ id: m.id, nome: m.nome, slug: m.slug, path: m.path, label_menu: m.label_menu || m.nome, ordem_menu: m.ordem_menu })),
      recursos: (recursosResult.rows || []).map((r) => ({ id: r.id, modulo_id: r.modulo_id, nome: r.nome, slug: r.slug, permission_key: r.permission_key })),
    });
  } catch (err) {
    console.error('[segment-recursos]', err);
    res.json({ modulos: [], recursos: [] });
  }
});

// Menu e tela inicial por cargo (role): se o cargo tiver role_modulos, usa ordem e home_path do cargo.
// Se o cargo for "vendedor" e não tiver role_modulos, retorna menu do segmento SEM PDV (vendedor não vê PDV por padrão).
app.get('/api/me/role-menu', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const companyId = req.user?.company_id;
    if (!userId) return res.json({ menu: [], home_path: null, role_display_name: null });
    const hasTable = await pool.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'role_modulos'`
    );
    if (hasTable.rows.length === 0) return res.json({ menu: [], home_path: null, role_display_name: null });
    const upd = await pool.query(
      `SELECT role_id FROM user_position_departments WHERE user_id = $1 AND is_primary = true AND role_id IS NOT NULL LIMIT 1`,
      [userId]
    );
    const roleId = upd.rows[0]?.role_id;
    if (!roleId) return res.json({ menu: [], home_path: null, role_display_name: null });
    const roleRow = await pool.query(
      `SELECT name, display_name, home_path FROM roles WHERE id = $1`,
      [roleId]
    );
    const roleName = (roleRow.rows[0]?.name || '').toLowerCase();
    const roleDisplayName = roleRow.rows[0]?.display_name || roleRow.rows[0]?.name || null;
    const home_path = roleRow.rows[0]?.home_path || null;
    const roleLabel = (roleDisplayName || '').toLowerCase();
    const isVendedor = roleName === 'vendedor' || roleName === 'vendedora' || roleLabel === 'vendedor' || roleLabel === 'vendedora';
    const isAdminRole = roleName === 'admin' || roleLabel.includes('administrador');

    const count = await pool.query(
      `SELECT 1 FROM role_modulos WHERE role_id = $1 AND ativo = true LIMIT 1`,
      [roleId]
    );
    if (count.rows.length > 0) {
      let menuResult;
      const comp = companyId ? (await pool.query('SELECT segmento_id FROM companies WHERE id = $1', [companyId])).rows[0] : null;
      const segmentoId = comp?.segmento_id;
      if (segmentoId) {
        // Só incluir módulos que estão ativos no segmento da empresa (ex.: Orçamentos inativo em Assistência não aparece)
        menuResult = await pool.query(
          `SELECT m.id, m.nome, m.slug, m.path, m.label_menu, m.icone, m.categoria, rm.ordem_menu
           FROM role_modulos rm
           INNER JOIN modulos m ON m.id = rm.modulo_id AND m.ativo
           INNER JOIN segmentos_modulos sm ON sm.modulo_id = m.id AND sm.segmento_id = $2 AND sm.ativo = true
           WHERE rm.role_id = $1 AND rm.ativo
           ORDER BY rm.ordem_menu, m.nome`,
          [roleId, segmentoId]
        );
      } else {
        menuResult = await pool.query(
          `SELECT m.id, m.nome, m.slug, m.path, m.label_menu, m.icone, m.categoria, rm.ordem_menu
           FROM role_modulos rm
           INNER JOIN modulos m ON m.id = rm.modulo_id AND m.ativo
           WHERE rm.role_id = $1 AND rm.ativo
           ORDER BY rm.ordem_menu, m.nome`,
          [roleId]
        );
      }
      let menuRows = menuResult.rows || [];
      if (isVendedor) {
        const bloqueadosVendedor = ['/pdv', '/orcamentos', '/relatorios', '/financeiro', '/painel-alertas'];
        menuRows = menuRows.filter((r) => {
          const p = (r.path || '').replace(/\/$/, '') || '/';
          const bloqueado = bloqueadosVendedor.includes(p) || (r.categoria || '') === 'gestao';
          return !bloqueado;
        });
      }
      if (isAdminRole) {
        menuRows = menuRows.filter((r) => {
          const p = (r.path || '').replace(/\/$/, '') || '/';
          return p !== '/orcamentos';
        });
      }
      return res.json({
        menu: menuRows.map((r) => ({
          id: r.id,
          path: r.path || '/',
          label_menu: r.label_menu || r.nome,
          slug: r.slug,
          icone: r.icone,
          categoria: r.categoria || 'operacao',
        })),
        home_path: home_path || null,
        role_display_name: roleDisplayName,
      });
    }

    // Cargo sem módulos configurados: vendedor recebe menu do segmento SEM PDV e SEM gestão (Relatórios, Financeiro, Painel de Alertas).
    if (isVendedor && companyId) {
      const comp = await pool.query('SELECT segmento_id FROM companies WHERE id = $1', [companyId]);
      const segmentoId = comp.rows[0]?.segmento_id;
      if (segmentoId) {
        const menuResult = await pool.query(
          `SELECT m.id, m.nome, m.slug, m.path, m.label_menu, m.icone, m.categoria, sm.ordem_menu
           FROM modulos m
           INNER JOIN segmentos_modulos sm ON sm.modulo_id = m.id AND sm.segmento_id = $1 AND sm.ativo = true
           WHERE m.ativo
             AND (m.path IS NULL OR (m.path != '/pdv' AND m.path != '/orcamentos'))
             AND (m.categoria IS NULL OR m.categoria != 'gestao')
           ORDER BY sm.ordem_menu, m.nome`,
          [segmentoId]
        );
        const menu = (menuResult.rows || []).map((r) => ({
          id: r.id,
          path: r.path || '/',
          label_menu: r.label_menu || r.nome,
          slug: r.slug,
          icone: r.icone,
          categoria: r.categoria || 'operacao',
        }));
        // Vendedor(a) sem PDV no menu: não abrir em /pdv; forçar Dashboard
        const safeHome = (isVendedor && home_path === '/pdv') ? null : (home_path || null);
        return res.json({ menu, home_path: safeHome, role_display_name: roleDisplayName });
      }
    }

    // Admin de empresa sem "Módulos e menu" configurado: retorna menu do segmento SEM Orçamentos (admin não vê orçamento)
    if (isAdminRole && companyId) {
      const comp = await pool.query('SELECT segmento_id FROM companies WHERE id = $1', [companyId]);
      const segmentoId = comp.rows[0]?.segmento_id;
      if (segmentoId) {
        const menuResult = await pool.query(
          `SELECT m.id, m.nome, m.slug, m.path, m.label_menu, m.icone, m.categoria, sm.ordem_menu
           FROM modulos m
           INNER JOIN segmentos_modulos sm ON sm.modulo_id = m.id AND sm.segmento_id = $1 AND sm.ativo = true
           WHERE m.ativo AND (m.path IS NULL OR m.path != '/orcamentos')
           ORDER BY sm.ordem_menu, m.nome`,
          [segmentoId]
        );
        const menu = (menuResult.rows || []).map((r) => ({
          id: r.id,
          path: r.path || '/',
          label_menu: r.label_menu || r.nome,
          slug: r.slug,
          icone: r.icone,
          categoria: r.categoria || 'operacao',
        }));
        return res.json({ menu, home_path: home_path || null, role_display_name: roleDisplayName });
      }
    }

    return res.json({ menu: [], home_path: null, role_display_name: roleDisplayName });
  } catch (err) {
    console.error('[role-menu]', err);
    res.json({ menu: [], home_path: null, role_display_name: null });
  }
});

// Configuração de menu do cargo (módulos, recursos, tela inicial) — filtrada pelo segmento da empresa
app.get('/api/roles/:roleId/menu-config', authenticateToken, async (req, res) => {
  try {
    const roleId = req.params.roleId;
    const companyId = req.user?.company_id;
    const hasTable = await pool.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'role_modulos'`
    );
    if (hasTable.rows.length === 0) return res.json({ modulos: [], recursos: [], home_path: null });
    const role = await pool.query(`SELECT id, home_path FROM roles WHERE id = $1`, [roleId]);
    if (role.rows.length === 0) return res.status(404).json({ error: 'Role não encontrado' });
    let segmentoId = null;
    if (companyId) {
      const comp = await pool.query(
        `SELECT segmento_id FROM companies WHERE id = $1`,
        [companyId]
      );
      segmentoId = comp.rows[0]?.segmento_id || null;
    }
    // Só incluir módulos que estão ativos no segmento da empresa (sm.ativo = true)
    const modulosResult = segmentoId
      ? await pool.query(
          `SELECT m.id, m.nome, m.slug, m.path, m.label_menu, rm.ativo as link_ativo, rm.ordem_menu
           FROM modulos m
           INNER JOIN segmentos_modulos sm ON sm.modulo_id = m.id AND sm.segmento_id = $2 AND sm.ativo = true
           LEFT JOIN role_modulos rm ON rm.modulo_id = m.id AND rm.role_id = $1
           WHERE m.ativo
           ORDER BY COALESCE(rm.ordem_menu, sm.ordem_menu, 999), m.nome`,
          [roleId, segmentoId]
        )
      : await pool.query(
          `SELECT m.id, m.nome, m.slug, m.path, m.label_menu, rm.ativo as link_ativo, rm.ordem_menu
           FROM modulos m
           LEFT JOIN role_modulos rm ON rm.modulo_id = m.id AND rm.role_id = $1
           WHERE m.ativo
           ORDER BY COALESCE(rm.ordem_menu, 999), m.nome`,
          [roleId]
        );
    // Só incluir recursos de módulos ativos no segmento e recursos ativos no segmento (sr.ativo = true)
    const recursosResult = segmentoId
      ? await pool.query(
          `SELECT r.id, r.modulo_id, r.nome, r.slug, r.permission_key, rr.ativo as link_ativo
           FROM recursos r
           INNER JOIN segmentos_modulos sm ON sm.modulo_id = r.modulo_id AND sm.segmento_id = $2 AND sm.ativo = true
           INNER JOIN segmentos_recursos sr ON sr.recurso_id = r.id AND sr.segmento_id = $2 AND sr.ativo = true
           LEFT JOIN role_recursos rr ON rr.recurso_id = r.id AND rr.role_id = $1
           WHERE r.ativo
           ORDER BY (SELECT COALESCE(rm.ordem_menu, 999) FROM role_modulos rm WHERE rm.role_id = $1 AND rm.modulo_id = r.modulo_id LIMIT 1), r.nome`,
          [roleId, segmentoId]
        )
      : await pool.query(
          `SELECT r.id, r.modulo_id, r.nome, r.slug, r.permission_key, rr.ativo as link_ativo
           FROM recursos r
           INNER JOIN modulos m ON m.id = r.modulo_id AND m.ativo
           LEFT JOIN role_recursos rr ON rr.recurso_id = r.id AND rr.role_id = $1
           WHERE r.ativo
           ORDER BY (SELECT ordem_menu FROM role_modulos WHERE role_id = $1 AND modulo_id = r.modulo_id LIMIT 1), r.nome`,
          [roleId]
        );
    res.json({
      modulos: (modulosResult.rows || []).map((m) => ({
        id: m.id,
        nome: m.nome,
        slug: m.slug,
        path: m.path,
        label_menu: m.label_menu || m.nome,
        link_ativo: !!m.link_ativo,
        ordem_menu: m.ordem_menu,
      })),
      recursos: (recursosResult.rows || []).map((r) => ({
        id: r.id,
        modulo_id: r.modulo_id,
        nome: r.nome,
        slug: r.slug,
        permission_key: r.permission_key,
        link_ativo: !!r.link_ativo,
      })),
      home_path: role.rows[0].home_path || null,
    });
  } catch (err) {
    console.error('[roles menu-config GET]', err);
    res.status(500).json({ error: 'Erro ao carregar configuração do cargo' });
  }
});

app.put('/api/roles/:roleId/menu-config', authenticateToken, requirePermission('admin.users'), async (req, res) => {
  try {
    const roleId = req.params.roleId;
    const { modulos = [], recursos = [], home_path } = req.body || {};
    const hasTable = await pool.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'role_modulos'`
    );
    if (hasTable.rows.length === 0) return res.status(400).json({ error: 'Tabelas role_modulos não existem' });
    await pool.query(`UPDATE roles SET home_path = $1, updated_at = NOW() WHERE id = $2`, [home_path || null, roleId]);
    await pool.query(`DELETE FROM role_modulos WHERE role_id = $1`, [roleId]);
    for (let i = 0; i < (modulos || []).length; i++) {
      const m = modulos[i];
      if (m.modulo_id && m.ativo) {
        await pool.query(
          `INSERT INTO role_modulos (role_id, modulo_id, ativo, ordem_menu) VALUES ($1, $2, true, $3)
           ON CONFLICT (role_id, modulo_id) DO UPDATE SET ativo = true, ordem_menu = $3, updated_at = NOW()`,
          [roleId, m.modulo_id, m.ordem_menu != null ? m.ordem_menu : i]
        );
      }
    }
    await pool.query(`DELETE FROM role_recursos WHERE role_id = $1`, [roleId]);
    for (const r of recursos || []) {
      if (r.recurso_id && r.ativo) {
        await pool.query(
          `INSERT INTO role_recursos (role_id, recurso_id, ativo) VALUES ($1, $2, true)
           ON CONFLICT (role_id, recurso_id) DO UPDATE SET ativo = true, updated_at = NOW()`,
          [roleId, r.recurso_id]
        );
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[roles menu-config PUT]', err);
    res.status(500).json({ error: 'Erro ao salvar configuração do cargo' });
  }
});

// Request Password Reset (Solicitar reset de senha)
app.post('/api/auth/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    // Buscar usuário
    const result = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // Por segurança, não revelar se o email existe ou não
      return res.json({ message: 'Se o email existir, um link de redefinição será enviado' });
    }

    const user = result.rows[0];

    // Gerar token de reset (válido por 1 hora)
    const resetToken = jwt.sign(
      { id: user.id, email: user.email, type: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const resetLink = `${process.env.FRONTEND_URL || 'https://app.ativafix.com'}/reset-password?access_token=${resetToken}`;

    // Enviar email se SMTP estiver configurado; caso contrário, loga o link para debug
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        await sendPasswordResetEmail({ to: user.email, resetLink, name: user.name || null });
      } catch (mailErr) {
        console.error('[API] Falha ao enviar email de reset:', mailErr.message);
        // Log do link como fallback para não bloquear o fluxo
        console.log(`[API][MAIL_FALLBACK] Link de reset para ${user.email}: ${resetLink}`);
      }
    } else {
      console.log(`[API][NO_SMTP] Link de reset para ${user.email}: ${resetLink}`);
    }

    res.json({ message: 'Se o email existir, um link de redefinição será enviado' });
  } catch (error) {
    console.error('Erro ao solicitar reset de senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Reset Password (Redefinir senha com token)
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { password, token } = req.body;

    console.log('[API] Tentativa de reset de senha:', { hasPassword: !!password, hasToken: !!token });

    if (!password || !token) {
      return res.status(400).json({ error: 'Senha e token são obrigatórios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    // Verificar token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.type !== 'password_reset') {
        console.log('[API] Token inválido - tipo incorreto:', decoded.type);
        return res.status(400).json({ error: 'Token inválido' });
      }
      console.log('[API] Token válido:', { userId: decoded.id, email: decoded.email });
    } catch (error) {
      console.error('[API] Erro ao verificar token:', error.message);
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }

    // Hash da nova senha
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('[API] Nova senha hash criada');

    // Atualizar senha
    const result = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email',
      [passwordHash, decoded.id]
    );

    if (result.rows.length === 0) {
      console.log('[API] Usuário não encontrado para reset:', decoded.id);
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    console.log('[API] Senha redefinida com sucesso:', { userId: result.rows[0].id, email: result.rows[0].email });

    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (error) {
    console.error('[API] Erro ao redefinir senha:', error);
    res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
});

// ============================================
// FIM DOS ENDPOINTS DE AUTENTICAÇÃO
// ============================================

// Helper para construir WHERE clause
// offset: número de parâmetros já usados (para começar a contar a partir desse número)
function buildWhereClause(where, offsetOrParams = []) {
  if (!where || Object.keys(where).length === 0) {
    return { clause: '', params: [] };
  }

  const conditions = [];
  const params = [];
  // Se for array, usar o length; se for número, usar diretamente
  const offset = Array.isArray(offsetOrParams) ? offsetOrParams.length : offsetOrParams;
  let paramIndex = offset + 1;

  // Tratar OR primeiro
  if (where.__or) {
    const orConditions = [];
    const orParts = where.__or.split(',');
    
    for (const part of orParts) {
      const [field, operator, ...valueParts] = part.split('.');
      const value = valueParts.join('.');
      
      if (operator === 'ilike') {
        const searchValue = value.replace(/%/g, '');
        orConditions.push(`${field} ILIKE $${paramIndex}`);
        params.push(`%${searchValue}%`);
        paramIndex++;
      } else if (operator === 'eq') {
        orConditions.push(`${field} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }
    
    if (orConditions.length > 0) {
      conditions.push(`(${orConditions.join(' OR ')})`);
    }
  }
  
  // Tratar NOT
  for (const [field, value] of Object.entries(where)) {
    if (field.includes('__not__')) {
      // Split por '__not__' e pegar o que vem depois
      const parts = field.split('__not__');
      const actualField = parts[0];
      const operatorPart = parts[1] || '';
      
      // Remover underscore inicial se existir (para casos como __not___is -> _is)
      const operator = operatorPart.startsWith('_') ? operatorPart.substring(1) : operatorPart;
      
      if (operator === 'is' && value === null) {
        conditions.push(`${actualField} IS NOT NULL`);
      } else if (operator === 'eq') {
        conditions.push(`${actualField} != $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
      continue;
    }
    
    // Pular __or que já foi tratado
    if (field === '__or') continue;
    
    if (field.endsWith('__neq')) {
      const actualField = field.replace('__neq', '');
      conditions.push(`${actualField} != $${paramIndex}`);
      params.push(value);
      paramIndex++;
    } else if (field.endsWith('__gt')) {
      const actualField = field.replace('__gt', '');
      conditions.push(`${actualField} > $${paramIndex}`);
      params.push(value);
      paramIndex++;
    } else if (field.endsWith('__gte')) {
      const actualField = field.replace('__gte', '');
      conditions.push(`${actualField} >= $${paramIndex}`);
      params.push(value);
      paramIndex++;
    } else if (field.endsWith('__lt')) {
      const actualField = field.replace('__lt', '');
      conditions.push(`${actualField} < $${paramIndex}`);
      params.push(value);
      paramIndex++;
    } else if (field.endsWith('__lte')) {
      const actualField = field.replace('__lte', '');
      conditions.push(`${actualField} <= $${paramIndex}`);
      params.push(value);
      paramIndex++;
    } else if (field.endsWith('__like')) {
      const actualField = field.replace('__like', '');
      conditions.push(`${actualField} LIKE $${paramIndex}`);
      params.push(value);
      paramIndex++;
    } else if (field.endsWith('__ilike')) {
      const actualField = field.replace('__ilike', '');
      conditions.push(`${actualField} ILIKE $${paramIndex}`);
      params.push(value);
      paramIndex++;
    } else if (field.endsWith('__in')) {
      const actualField = field.replace('__in', '');
      // Se array vazio, adicionar condição que sempre retorna false
      if (!Array.isArray(value) || value.length === 0) {
        conditions.push('1=0'); // Sempre false - não retorna nenhum resultado
      } else {
        const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
        conditions.push(`${actualField} IN (${placeholders})`);
        params.push(...value);
      }
    } else if (field.endsWith('__is')) {
      const actualField = field.replace('__is', '');
      if (value === null || value === undefined) {
        conditions.push(`${actualField} IS NULL`);
      } else {
        conditions.push(`${actualField} IS NOT NULL`);
      }
    } else {
      conditions.push(`${field} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  // Se não há condições, retornar clause vazio
  if (conditions.length === 0) {
    return { clause: '', params };
  }

  return {
    clause: `WHERE ${conditions.join(' AND ')}`,
    params,
  };
}

// Query endpoint
app.post('/api/query/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { select, where, orderBy, limit, offset } = req.body;

    // Usar schema public explicitamente
    const tableName = table.includes('.') ? table : `public.${table}`;
    
    const fields = Array.isArray(select) ? select.join(', ') : (select || '*');
    const { clause: whereClause, params } = buildWhereClause(where);

    // Lista COMPLETA de tabelas que precisam filtrar por company_id
    // CRÍTICO: Garante isolamento de dados entre empresas
    const tablesWithCompanyId = [
      // Dados de negócio principais
      'produtos', 'vendas', 'sales', 'clientes', 'ordens_servico', 'veiculos',
      'sale_items', 'os_items', 'fornecedores', 'produto_movimentacoes',
      // Ponto eletrônico
      'time_clock',
      // Usuários (cada empresa só vê seus usuários)
      'users',
      // NPS e pesquisas
      'nps_surveys', 'nps_responses',
      // Vagas e recrutamento
      'job_surveys', 'job_responses', 'job_application_drafts',
      'job_candidate_ai_analysis', 'job_candidate_evaluations', 
      'job_interviews', 'candidate_responses',
      // Financeiro (contas a pagar, transações, contas a receber, categorias)
      'payments', 'caixa_sessions', 'caixa_movements', 'cash_register_sessions', 'cash_movements',
      'bills_to_pay', 'financial_transactions', 'accounts_receivable', 'financial_categories',
      // Marcas e modelos (se tiver por empresa)
      'marcas', 'modelos',
      // Configurações específicas da empresa
      'configuracoes_empresa', 'company_settings',
      'cupom_config',
      'os_pagamentos', 'os_config_status',
      // Devoluções e inventário
      'refunds', 'refund_items',
      // Pedidos de compra (isolamento por empresa)
      'pedidos',
      'quotes',
      // Logs do sistema, DISC, integrações e Academy
      'user_activity_logs', 'audit_logs', 'disc_responses',
      'telegram_config',
      'trainings', 'training_assignments',
      'alert_panel_config', 'alert_config', 'alert_logs'
    ];
    
    const tableNameOnly = table.includes('.') ? table.split('.')[1] : table;
    const needsCompanyFilter = tablesWithCompanyId.includes(tableNameOnly.toLowerCase());
    // Tabela companies: usuário só pode ver a própria empresa (id = company_id do usuário)
    const isCompaniesTable = tableNameOnly.toLowerCase() === 'companies';

    // CRÍTICO: Nunca usar "empresa padrão" — isolamento entre empresas. Usuário SEM company_id não pode ver dados de ninguém.
    if (needsCompanyFilter && req.user && !req.companyId) {
      return res.status(403).json({
        error: 'Usuário sem empresa vinculada (company_id). Vincule o usuário a uma empresa em Configurações para acessar dados.',
        codigo: 'COMPANY_ID_REQUIRED'
      });
    }
    
    // Se a tabela precisa de filtro por company_id e o usuário está autenticado
    let finalWhereClause = whereClause;
    let finalParams = [...params];
    
    if (req.user && req.companyId && (needsCompanyFilter || isCompaniesTable)) {
      // companies: só retornar a empresa do usuário (id = company_id do usuário)
      if (isCompaniesTable) {
        const companyCondition = `id = $${finalParams.length + 1}`;
        finalWhereClause = finalWhereClause ? `${finalWhereClause} AND ${companyCondition}` : `WHERE ${companyCondition}`;
        finalParams.push(req.companyId);
      }
      // os_items por ordem_servico_id: NÃO filtrar por company_id — a OS já é da empresa; evita perder itens ao faturar
      // companies: já aplicamos filtro por id = req.companyId acima; tabela não tem coluna company_id
      const isOsItemsByOS = tableNameOnly.toLowerCase() === 'os_items' &&
        where && typeof where === 'object' && where.ordem_servico_id != null;
      const skipCompanyFilter = isOsItemsByOS || isCompaniesTable;

      // Verificar se já existe filtro de company_id no where
      const hasCompanyFilter = where && (
        (typeof where === 'object' && 'company_id' in where) ||
        (Array.isArray(where) && where.some((w) => w.field === 'company_id' || w.company_id))
      );
      
      if (!hasCompanyFilter && !skipCompanyFilter) {
        // Adicionar filtro de company_id automaticamente
        const companyCondition = `${tableNameOnly}.company_id = $${finalParams.length + 1}`;
        if (finalWhereClause) {
          finalWhereClause += ` AND ${companyCondition}`;
        } else {
          finalWhereClause = `WHERE ${companyCondition}`;
        }
        finalParams.push(req.companyId);
        console.log(`[Query] Adicionando filtro company_id=${req.companyId} para tabela ${tableNameOnly}`);
      } else if (skipCompanyFilter) {
        console.log(`[Query] os_items por ordem_servico_id: sem filtro company_id para retornar todos os itens da OS`);
      }
    }

    // Query para buscar dados
    let sql = `SELECT ${fields} FROM ${tableName}`;
    if (finalWhereClause) sql += ` ${finalWhereClause}`;

    // Validar coluna de ordenação para evitar erro "column ... does not exist"
    if (orderBy && orderBy.field) {
      let columnExists = true;
      try {
        const colCheck = await pool.query(
          `SELECT 1 FROM information_schema.columns 
           WHERE table_schema = 'public' 
             AND table_name = $1 
             AND column_name = $2`,
          [table.includes('.') ? table.split('.')[1] : table, orderBy.field]
        );
        columnExists = colCheck.rows.length > 0;
      } catch (e) {
        console.warn(`[Query] Falha ao checar coluna ${orderBy.field} em ${tableName}:`, e.message);
      }

      if (columnExists) {
        const direction = orderBy.ascending === false ? 'DESC' : 'ASC';
        sql += ` ORDER BY ${orderBy.field} ${direction}`;
      } else {
        console.warn(`[Query] Coluna de ordenação '${orderBy.field}' não existe em ${tableName}, ignorando ORDER BY.`);
      }
    }

    if (limit) {
      sql += ` LIMIT ${limit}`;
    }

    if (offset) {
      sql += ` OFFSET ${offset}`;
    }

    console.log(`[Query] ${tableName}:`, sql, finalParams);
    const result = await pool.query(sql, finalParams);
    console.log(`[Query] ${tableName} resultado:`, result.rows.length, 'registros');
    
    // Query para contar total (sem limit/offset)
    let countSql = `SELECT COUNT(*) as total FROM ${tableName}`;
    if (finalWhereClause) countSql += ` ${finalWhereClause}`;
    
    const countResult = await pool.query(countSql, finalParams);
    const totalCount = parseInt(countResult.rows[0]?.total || '0');

    res.json({ rows: result.rows, count: totalCount });
  } catch (error) {
    console.error('Erro na query:', error);
    res.status(500).json({ error: error.message });
  }
});

// Insert endpoint
app.post('/api/insert/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const data = req.body;

    // Usar schema public explicitamente
    const tableName = table.includes('.') ? table : `public.${table}`;
    const tableNameOnly = table.includes('.') ? table.split('.')[1] : table;

    // Suportar INSERT em lote: body pode ser array de objetos
    const rowsToInsert = Array.isArray(data) ? data : [data];

    // os_config_status: usar APENAS company_id do usuário autenticado — nunca empresa de outro usuário
    const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
    const isValidCompanyId = (id) => id && id !== ZERO_UUID && String(id).toLowerCase() !== ZERO_UUID;
    if (tableNameOnly.toLowerCase() === 'os_config_status') {
      const companyId = (req.user && isValidCompanyId(req.companyId)) ? req.companyId : null;
      if (!companyId) {
        return res.status(403).json({
          error: 'Usuário sem empresa vinculada (company_id). Vincule o usuário a uma empresa em Configurações.',
          codigo: 'COMPANY_ID_REQUIRED'
        });
      }
      rowsToInsert.forEach(row => {
        if (row && (row.company_id == null || row.company_id === '' || !isValidCompanyId(row.company_id))) row.company_id = companyId;
      });
      console.log('[Insert] os_config_status company_id=', companyId, 'rows=', rowsToInsert.length);
    }

    // Lista COMPLETA de tabelas que precisam de company_id no INSERT
    // CRÍTICO: Garante isolamento de dados entre empresas
    const tablesWithCompanyId = [
      'produtos', 'vendas', 'sales', 'clientes', 'ordens_servico', 'veiculos',
      'sale_items', 'os_items', 'fornecedores', 'produto_movimentacoes',
      'time_clock', 'users',
      'nps_surveys', 'nps_responses',
      'job_surveys', 'job_responses', 'job_application_drafts',
      'job_candidate_ai_analysis', 'job_candidate_evaluations', 
      'job_interviews', 'candidate_responses',
      'payments', 'caixa_sessions', 'caixa_movements', 'cash_register_sessions', 'cash_movements',
      'bills_to_pay', 'financial_transactions', 'accounts_receivable', 'financial_categories',
      'marcas', 'modelos', 'configuracoes_empresa', 'company_settings',
      'cupom_config',
      'os_pagamentos', 'os_config_status', 'fornecedores',
      'refunds', 'refund_items',
      'pedidos',
      'quotes',
      'user_activity_logs', 'audit_logs', 'disc_responses',
      'telegram_config',
      'trainings', 'training_assignments',
      'alert_panel_config', 'alert_config', 'alert_logs'
    ];
    
    const needsCompanyId = tablesWithCompanyId.includes(tableNameOnly.toLowerCase());
    
    // Adicionar company_id automaticamente se necessário (outras tabelas; os_config_status já tratado acima)
    if (needsCompanyId && req.user && req.companyId) {
      rowsToInsert.forEach(row => {
        if (!row.company_id) {
          row.company_id = req.companyId;
        }
      });
      console.log(`[Insert] Adicionando company_id=${req.companyId} para tabela ${tableNameOnly}`);
    } else if (needsCompanyId && req.user && !req.companyId) {
      return res.status(403).json({
        error: 'Usuário sem empresa vinculada (company_id). Vincule o usuário a uma empresa em Configurações.',
        codigo: 'COMPANY_ID_REQUIRED'
      });
    }

    // Rede de segurança: os_config_status nunca pode ir ao INSERT sem company_id (apenas do usuário, nunca de outra empresa)
    const ZERO_UUID_SAFETY = '00000000-0000-0000-0000-000000000000';
    const validCompanyIdSafety = (id) => id && id !== ZERO_UUID_SAFETY && String(id).toLowerCase() !== ZERO_UUID_SAFETY;
    if (tableNameOnly.toLowerCase() === 'os_config_status' && needsCompanyId) {
      const missing = rowsToInsert.some(row => row == null || !validCompanyIdSafety(row.company_id));
      if (missing) {
        const fallbackId = validCompanyIdSafety(req.companyId) ? req.companyId : null;
        if (fallbackId) {
          rowsToInsert.forEach(row => {
            if (row && !validCompanyIdSafety(row.company_id)) row.company_id = fallbackId;
          });
          console.log('[Insert] os_config_status: company_id aplicado', fallbackId);
        } else {
          return res.status(403).json({
            error: 'Usuário sem empresa vinculada. Vincule o usuário a uma empresa em Configurações.',
            codigo: 'COMPANY_ID_REQUIRED'
          });
        }
      }
    }

    if (!rowsToInsert || rowsToInsert.length === 0) {
      return res.status(400).json({ error: 'Insert requires data' });
    }

    // VALIDAÇÃO CRÍTICA: Regras de negócio para sales (sale_origin)
    if (tableNameOnly.toLowerCase() === 'sales') {
      for (const row of rowsToInsert) {
        const saleOrigin = row?.sale_origin;
        
        // Todas as vendas devem ter sale_origin definido
        if (!saleOrigin || (saleOrigin !== 'PDV' && saleOrigin !== 'OS')) {
          return res.status(400).json({ 
            error: 'sale_origin é obrigatório e deve ser "PDV" ou "OS"',
            codigo: 'SALE_ORIGIN_REQUIRED'
          });
        }
        
        // Validações para vendas de OS
        if (saleOrigin === 'OS') {
          // Vendas consolidadas (retroativas) não precisam de ordem_servico_id e technician_id
          const isConsolidada = row.cliente_nome && (
            row.cliente_nome.includes('CONSOLIDADA') || 
            row.cliente_nome.includes('CONSOLIDADO')
          );
          
          if (!isConsolidada) {
            // Vendas de OS precisam de ordem_servico_id. technician_id é opcional (adiantamento sem técnico permitido).
            if (!row.ordem_servico_id) {
              return res.status(400).json({ 
                error: 'Vendas de OS devem ter ordem_servico_id',
                codigo: 'OS_SALE_REQUIRES_ORDEM_SERVICO_ID'
              });
            }
          }
          
          if (row.cashier_user_id) {
            return res.status(400).json({ 
              error: 'Vendas de OS não devem ter cashier_user_id',
              codigo: 'OS_SALE_CANNOT_HAVE_CASHIER_USER_ID'
            });
          }
        }
        
        // Validações para vendas de PDV
        if (saleOrigin === 'PDV') {
          // Vendas consolidadas (retroativas) não precisam de cashier_user_id
          const isConsolidada = row.cliente_nome && (
            row.cliente_nome.includes('CONSOLIDADA') || 
            row.cliente_nome.includes('CONSOLIDADO')
          );
          
          if (!isConsolidada) {
            // Apenas vendas normais de PDV precisam de cashier_user_id
            if (!row.cashier_user_id) {
              return res.status(400).json({ 
                error: 'Vendas de PDV devem ter cashier_user_id',
                codigo: 'PDV_SALE_REQUIRES_CASHIER_USER_ID'
              });
            }
          }
          
          if (row.ordem_servico_id) {
            return res.status(400).json({ 
              error: 'Vendas de PDV não devem ter ordem_servico_id',
              codigo: 'PDV_SALE_CANNOT_HAVE_ORDEM_SERVICO_ID'
            });
          }
          if (row.technician_id) {
            return res.status(400).json({ 
              error: 'Vendas de PDV não devem ter technician_id',
              codigo: 'PDV_SALE_CANNOT_HAVE_TECHNICIAN_ID'
            });
          }
        }
      }
    }
    
    // VALIDAÇÃO CRÍTICA: Verificar estoque para sale_items (exceto faturamento de OS — itens já saíram na OS)
    if (tableNameOnly.toLowerCase() === 'sale_items') {
      const saleId = rowsToInsert[0]?.sale_id;
      let isFaturamentoOS = false;
      if (saleId) {
        try {
          const saleRow = await pool.query(
            'SELECT ordem_servico_id FROM public.sales WHERE id = $1',
            [saleId]
          );
          isFaturamentoOS = saleRow.rows.length > 0 && saleRow.rows[0].ordem_servico_id != null;
        } catch (e) {
          console.warn('[Insert] sale_items: erro ao checar sale ordem_servico_id:', e.message);
        }
      }
      // Fallback: item com observação "OS #123" é faturamento de OS — não validar estoque
      if (!isFaturamentoOS && rowsToInsert.some(r => (r?.observacao || '').match(/OS\s*#\s*\d+/))) {
        isFaturamentoOS = true;
      }
      if (!isFaturamentoOS) {
        for (const row of rowsToInsert) {
          if (row?.produto_id && row?.quantidade && row?.produto_tipo === 'produto') {
            const estoqueResult = await pool.query(
              'SELECT quantidade FROM public.produtos WHERE id = $1',
              [row.produto_id]
            );
            if (estoqueResult.rows.length > 0) {
              const estoqueDisponivel = Number(estoqueResult.rows[0].quantidade || 0);
              const quantidadeSolicitada = Number(row.quantidade || 0);
              if (quantidadeSolicitada > estoqueDisponivel) {
                console.log(`[Insert] Bloqueado: Estoque insuficiente. Solicitado: ${quantidadeSolicitada}, Disponível: ${estoqueDisponivel}`);
                return res.status(400).json({
                  error: `Estoque insuficiente para este produto. Disponível: ${estoqueDisponivel} unidade(s)`,
                  codigo: 'ESTOQUE_INSUFICIENTE',
                  estoque_disponivel: estoqueDisponivel
                });
              }
            }
          }
        }
      } else {
        console.log(`[Insert] sale_items: faturamento de OS (sale_id=${saleId}), pulando validação de estoque`);
      }
    }

    // VALIDAÇÃO CRÍTICA: Pagamento não pode superar o total da venda (evita duplicação PIX/cartão)
    if (tableNameOnly.toLowerCase() === 'payments') {
      for (const row of rowsToInsert) {
        const saleId = row?.sale_id;
        if (!saleId) continue;
        const saleResult = await pool.query(
          'SELECT total FROM public.sales WHERE id = $1',
          [saleId]
        );
        if (saleResult.rows.length === 0) continue;
        const saleTotal = Number(saleResult.rows[0].total || 0);
        let valorAplicado = Number(row.valor || 0);
        const troco = Number(row.troco || 0);
        const forma = (row.forma_pagamento || '').toLowerCase();
        if (forma === 'dinheiro' && troco > 0 && valorAplicado > saleTotal) {
          valorAplicado = valorAplicado - troco;
        }
        const sumResult = await pool.query(
          `SELECT COALESCE(SUM(valor), 0) AS total FROM public.payments WHERE sale_id = $1 AND status = 'confirmed'`,
          [saleId]
        );
        const jaPago = Number(sumResult.rows[0]?.total || 0);
        const saldoRestante = saleTotal - jaPago;
        if (valorAplicado > saldoRestante + 0.01) {
          console.log(`[Insert] Bloqueado: Pagamento acima do saldo. Venda total: ${saleTotal}, Já pago: ${jaPago}, Tentativa: ${valorAplicado}`);
          return res.status(400).json({
            error: `O valor do pagamento não pode ser maior que o saldo restante da venda (R$ ${saldoRestante.toFixed(2)}).`,
            codigo: 'PAGAMENTO_ACIMA_DO_TOTAL'
          });
        }
      }
    }

    // Última verificação: os_config_status nunca pode ter linha sem company_id
    if (tableNameOnly.toLowerCase() === 'os_config_status') {
      const bad = rowsToInsert.some(row => !row || row.company_id == null || row.company_id === '' || String(row.company_id).toLowerCase() === '00000000-0000-0000-0000-000000000000');
      if (bad) {
        return res.status(400).json({
          error: 'Configuração de status exige empresa. Faça login com usuário vinculado a uma empresa e recarregue a página.',
          codigo: 'COMPANY_ID_REQUIRED'
        });
      }
    }

    // Normalizar colunas a partir do primeiro item
    const firstRow = rowsToInsert[0] || {};
    const keys = Object.keys(firstRow);
    if (keys.length === 0) {
      return res.status(400).json({ error: 'Insert requires non-empty object' });
    }

    // Garantir que todas as linhas têm as mesmas colunas (evita SQL inválido)
    for (const row of rowsToInsert) {
      const rowKeys = Object.keys(row || {});
      const same = rowKeys.length === keys.length && rowKeys.every(k => keys.includes(k));
      if (!same) {
        return res.status(400).json({ error: 'Insert batch requires consistent columns in all rows' });
      }
    }

    // Verificar tipos de colunas para tratar arrays UUID[] corretamente
    let columnTypes = {};
    try {
      const typeResult = await pool.query(`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = $1
      `, [tableNameOnly]);
      
      typeResult.rows.forEach(row => {
        columnTypes[row.column_name] = {
          dataType: row.data_type,
          udtName: row.udt_name
        };
      });
    } catch (typeError) {
      console.warn(`[Insert] Erro ao verificar tipos de colunas:`, typeError.message);
    }

    // Usar apenas colunas que existem na tabela (evita erro "column does not exist" se o banco não tiver migration)
    const validKeys = keys.filter(k => columnTypes[k]);
    if (validKeys.length === 0) {
      return res.status(400).json({ error: 'Nenhuma coluna válida para esta tabela. Verifique o schema.' });
    }
    const skippedKeys = keys.filter(k => !columnTypes[k]);
    if (skippedKeys.length > 0) {
      console.log(`[Insert] ${tableNameOnly}: colunas omitidas (não existem na tabela):`, skippedKeys);
    }
    let keysToUse = validKeys;
    // Garantir company_id no INSERT para tabelas que exigem (evita null constraint)
    if (needsCompanyId && columnTypes['company_id'] && !keysToUse.includes('company_id')) {
      keysToUse = ['company_id', ...keysToUse];
    }

    // Colunas conhecidas que são arrays UUID[] (não JSONB)
    const uuidArrayColumns = ['allowed_respondents', 'target_employees'];

    // Colunas que são do tipo DATE e não devem ter conversão de timezone
    const dateOnlyColumns = ['due_date', 'payment_date', 'data_vencimento', 'data_pagamento', 'birth_date', 'data_nascimento'];
    
    const values = [];
    const rowsPlaceholders = rowsToInsert.map((row, rowIndex) => {
      const base = rowIndex * keysToUse.length;
      keysToUse.forEach((k, i) => {
        let value = row[k];
        const columnType = columnTypes[k];
        
        // CORREÇÃO: Para colunas de data (DATE), manter string exatamente como veio
        // PostgreSQL vai tratar como DATE sem conversão de timezone
        if (typeof value === 'string' && dateOnlyColumns.includes(k) && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
          // Log para debug
          console.log(`[Insert] Coluna ${k} (DATE): mantendo valor exato: ${value}`);
          values.push(value);
          return;
        }
        
        // CORREÇÃO: Se o valor for uma string que parece um array JSON, deserializar primeiro
        if (typeof value === 'string' && uuidArrayColumns.includes(k)) {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              console.log(`[Insert] Deserializado array UUID[] da string JSON para coluna ${k}`);
              value = parsed;
            }
          } catch (e) {
            // Não é JSON válido, continuar com o valor original
            console.warn(`[Insert] Valor da coluna ${k} não é JSON válido, mantendo como string`);
          }
        }
        
        // Se for uma coluna conhecida de array UUID[], passar como array nativo
        if (Array.isArray(value) && uuidArrayColumns.includes(k)) {
          // Deixar o driver PostgreSQL converter automaticamente
          values.push(value);
          return;
        }
        
        // Se for array e a coluna for ARRAY (detectado pelo tipo), passar como array nativo
        if (Array.isArray(value) && columnType && columnType.dataType === 'ARRAY') {
          values.push(value);
          return;
        }
        
        // Se for objeto/array e a coluna for JSONB, serializar como JSON
        if (value !== null && typeof value === 'object' && columnType && columnType.udtName === 'jsonb') {
          values.push(JSON.stringify(value));
          return;
        }
        
        // Se for objeto/array mas não sabemos o tipo, tentar detectar:
        // Se for array de strings que parecem UUIDs, provavelmente é UUID[]
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value[0])) {
          // Provavelmente é UUID[], passar como array
          values.push(value);
          return;
        }
        
        // Para outros objetos, serializar como JSON (pode ser JSONB)
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          values.push(JSON.stringify(value));
          return;
        }
        
        // Valor primitivo ou null
        values.push(value);
      });
      // Criar placeholders com CAST para colunas DATE
      const placeholders = keysToUse.map((k, i) => {
        const placeholder = `$${base + i + 1}`;
        // Se for coluna de data, fazer CAST explícito para DATE
        if (dateOnlyColumns.includes(k)) {
          return `${placeholder}::date`;
        }
        return placeholder;
      }).join(', ');
      return `(${placeholders})`;
    }).join(', ');

    const sql = `
      INSERT INTO ${tableName} (${keysToUse.join(', ')})
      VALUES ${rowsPlaceholders}
      RETURNING *
    `;

    console.log(`[Insert] ${tableName}:`, keysToUse, Array.isArray(data) ? `(batch ${rowsToInsert.length})` : '(single)');
    const result = await pool.query(sql, values);

    const isFinalizingSale = data?.status === 'paid' || data?.is_draft === false || data?.finalized_at;
    if (tableNameOnly.toLowerCase() === 'sales' && isFinalizingSale) {
      result.rows
        .filter(shouldSendMetaOsPurchaseFromSaleRow)
        .forEach((row) => {
          void sendMetaOsPurchaseForSale(row.id);
        });
      result.rows
        .filter(shouldSendGooglePurchaseFromSaleRow)
        .forEach((row) => {
          void sendGoogleAdsPurchaseForSale(row.id);
        });
    }

    res.json({ data: Array.isArray(data) ? result.rows : result.rows[0], rows: result.rows });
  } catch (error) {
    console.error('Erro ao inserir:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update endpoint
app.post('/api/update/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { data, where } = req.body;
    
    // CORREÇÃO IMEDIATA: Deserializar arrays UUID[] que chegaram como strings JSON
    // Isso DEVE ser feito ANTES de qualquer outro processamento
    if (data) {
      const fixArrayField = (fieldName) => {
        if (data[fieldName] !== undefined && typeof data[fieldName] === 'string') {
          try {
            let str = data[fieldName].trim();
            // Remover todas as aspas externas
            while (str.startsWith('"') && str.endsWith('"') && str.length >= 2) {
              str = str.slice(1, -1);
            }
            // Se parece um array JSON, deserializar
            if (str.startsWith('[') && str.endsWith(']')) {
              const parsed = JSON.parse(str);
              if (Array.isArray(parsed)) {
                console.log(`[Update] 🔧 CORREÇÃO IMEDIATA: ${fieldName} deserializado de string para array (${parsed.length} itens)`);
                data[fieldName] = parsed;
              }
            }
          } catch (e) {
            console.error(`[Update] ❌ Erro ao deserializar ${fieldName}:`, e.message);
          }
        }
      };
      
      fixArrayField('allowed_respondents');
      fixArrayField('target_employees');
    }
    
    // LOG para debug: verificar arrays UUID[] após correção
    if (data && (data.allowed_respondents || data.target_employees)) {
      console.log(`[Update] 📥 Dados recebidos para ${table} (APÓS CORREÇÃO):`);
      if (data.allowed_respondents) {
        console.log(`[Update]   allowed_respondents: tipo=${typeof data.allowed_respondents}, isArray=${Array.isArray(data.allowed_respondents)}, tamanho=${Array.isArray(data.allowed_respondents) ? data.allowed_respondents.length : 'N/A'}`);
      }
      if (data.target_employees) {
        console.log(`[Update]   target_employees: tipo=${typeof data.target_employees}, isArray=${Array.isArray(data.target_employees)}, tamanho=${Array.isArray(data.target_employees) ? data.target_employees.length : 'N/A'}`);
      }
    }

    // Usar schema public explicitamente
    const tableName = table.includes('.') ? table : `public.${table}`;
    const tableNameOnly = table.includes('.') ? table.split('.')[1] : table;

    // Lista COMPLETA de tabelas que precisam filtrar por company_id no UPDATE
    // CRÍTICO: Garante isolamento de dados entre empresas
    const tablesWithCompanyId = [
      'produtos', 'vendas', 'sales', 'clientes', 'ordens_servico', 'veiculos',
      'sale_items', 'os_items', 'fornecedores', 'produto_movimentacoes',
      'time_clock', 'users',
      'nps_surveys', 'nps_responses',
      'job_surveys', 'job_responses', 'job_application_drafts',
      'job_candidate_ai_analysis', 'job_candidate_evaluations', 
      'job_interviews', 'candidate_responses',
      'payments', 'caixa_sessions', 'caixa_movements', 'cash_register_sessions', 'cash_movements',
      'bills_to_pay', 'financial_transactions', 'accounts_receivable', 'financial_categories',
      'marcas', 'modelos', 'configuracoes_empresa', 'company_settings',
      'cupom_config',
      'os_pagamentos', 'os_config_status', 'fornecedores',
      'refunds', 'refund_items',
      'pedidos', 'quotes',
      'user_activity_logs', 'audit_logs', 'disc_responses',
      'telegram_config',
      'trainings', 'training_assignments',
      'alert_panel_config', 'alert_config', 'alert_logs'
    ];

    const needsCompanyFilter = tablesWithCompanyId.includes(tableNameOnly.toLowerCase());

    // CRÍTICO: Usuário sem company_id não pode alterar dados de ninguém (isolamento entre empresas)
    if (needsCompanyFilter && req.user && !req.companyId) {
      return res.status(403).json({
        error: 'Usuário sem empresa vinculada (company_id). Vincule o usuário a uma empresa em Configurações.',
        codigo: 'COMPANY_ID_REQUIRED'
      });
    }

    if (!where || Object.keys(where).length === 0) {
      return res.status(400).json({ error: 'Update requires WHERE clause' });
    }

    // VALIDAÇÃO CRÍTICA: Regras de negócio para sales (sale_origin)
    if (tableNameOnly.toLowerCase() === 'sales') {
      const saleOrigin = data?.sale_origin;
      
      // Se sale_origin está sendo atualizado, validar como no INSERT
      if (saleOrigin !== undefined) {
        if (saleOrigin !== 'PDV' && saleOrigin !== 'OS') {
          return res.status(400).json({ 
            error: 'sale_origin deve ser "PDV" ou "OS"',
            codigo: 'INVALID_SALE_ORIGIN'
          });
        }
        
        // Validações para vendas de OS
        if (saleOrigin === 'OS') {
          if (data.cashier_user_id !== undefined && data.cashier_user_id !== null) {
            return res.status(400).json({ 
              error: 'Vendas de OS não devem ter cashier_user_id',
              codigo: 'OS_SALE_CANNOT_HAVE_CASHIER_USER_ID'
            });
          }
        }
        
        // Validações para vendas de PDV
        if (saleOrigin === 'PDV') {
          if (data.ordem_servico_id !== undefined && data.ordem_servico_id !== null) {
            return res.status(400).json({ 
              error: 'Vendas de PDV não devem ter ordem_servico_id',
              codigo: 'PDV_SALE_CANNOT_HAVE_ORDEM_SERVICO_ID'
            });
          }
          if (data.technician_id !== undefined && data.technician_id !== null) {
            return res.status(400).json({ 
              error: 'Vendas de PDV não devem ter technician_id',
              codigo: 'PDV_SALE_CANNOT_HAVE_TECHNICIAN_ID'
            });
          }
        }
      } else {
        // Se sale_origin não está sendo atualizado, verificar consistência com sale_origin atual
        const { clause: tempWhereClause, params: tempWhereParams } = buildWhereClause(where, 0);
        const currentSaleResult = await pool.query(
          `SELECT sale_origin FROM ${tableName} ${tempWhereClause}`,
          tempWhereParams
        );
        
        if (currentSaleResult.rows.length > 0) {
          const currentSaleOrigin = currentSaleResult.rows[0].sale_origin;
          
          if (currentSaleOrigin === 'OS') {
            if (data.cashier_user_id !== undefined && data.cashier_user_id !== null) {
              return res.status(400).json({ 
                error: 'Vendas de OS não devem ter cashier_user_id',
                codigo: 'OS_SALE_CANNOT_HAVE_CASHIER_USER_ID'
              });
            }
          } else if (currentSaleOrigin === 'PDV') {
            if (data.ordem_servico_id !== undefined && data.ordem_servico_id !== null) {
              return res.status(400).json({ 
                error: 'Vendas de PDV não devem ter ordem_servico_id',
                codigo: 'PDV_SALE_CANNOT_HAVE_ORDEM_SERVICO_ID'
              });
            }
            if (data.technician_id !== undefined && data.technician_id !== null) {
              return res.status(400).json({ 
                error: 'Vendas de PDV não devem ter technician_id',
                codigo: 'PDV_SALE_CANNOT_HAVE_TECHNICIAN_ID'
              });
            }
          }
        }
      }
    }

    // FUNÇÃO HELPER: Força deserialização de arrays UUID[] que chegaram como strings
    const forceDeserializeArray = (value, key) => {
      if (value === null || value === undefined) return value;
      if (Array.isArray(value)) return value; // Já é array, retornar como está
      if (typeof value !== 'string') return value; // Não é string, retornar como está
      
      try {
        let str = String(value).trim();
        
        // Remover todas as aspas externas (pode ter sido serializado múltiplas vezes)
        while (str.length >= 2 && str.startsWith('"') && str.endsWith('"')) {
          str = str.slice(1, -1);
        }
        
        // Verificar se parece um array JSON
        if (!str.startsWith('[') || !str.endsWith(']')) {
          return value; // Não parece array, retornar original
        }
        
        // Tentar deserializar
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed)) {
          console.log(`[Update] 🔧 FORÇA DESERIALIZAÇÃO: ${key} convertido de string para array (${parsed.length} itens)`);
          return parsed;
        }
        
        return value;
      } catch (e) {
        console.warn(`[Update] ⚠️ Erro ao forçar deserialização de ${key}:`, e.message);
        return value; // Em caso de erro, retornar original
      }
    };
    
    // CORREÇÃO CRÍTICA: Aplicar deserialização forçada em arrays UUID[] ANTES de qualquer processamento
    const uuidArrayColumns = ['allowed_respondents', 'target_employees'];
    for (const key of uuidArrayColumns) {
      if (data[key] !== undefined) {
        const originalValue = data[key];
        const fixedValue = forceDeserializeArray(originalValue, key);
        if (fixedValue !== originalValue) {
          data[key] = fixedValue;
        }
      }
    }
    
    let keys = Object.keys(data);
    
    // os_items: só atualizar colunas que existem na base (evita "fornecedor_nome does not exist" se migração não foi aplicada)
    const osItemsSafeKeys = ['tipo', 'produto_id', 'descricao', 'quantidade', 'valor_unitario', 'valor_minimo', 'desconto', 'valor_total', 'garantia', 'colaborador_id', 'colaborador_nome', 'com_aro', 'fornecedor_id', 'fornecedor_nome', 'grade_cor'];
    if (tableNameOnly.toLowerCase() === 'os_items') {
      data = Object.fromEntries(Object.entries(data).filter(([k]) => osItemsSafeKeys.includes(k)));
      keys = Object.keys(data);
    }
    
    // Verificar tipos de colunas para tratar arrays UUID[] corretamente
    let columnTypes = {};
    try {
      const typeResult = await pool.query(`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = $1
      `, [tableNameOnly]);
      
      typeResult.rows.forEach(row => {
        columnTypes[row.column_name] = {
          dataType: row.data_type,
          udtName: row.udt_name
        };
      });
    } catch (typeError) {
      console.warn(`[Update] Erro ao verificar tipos de colunas:`, typeError.message);
    }

    // Usar apenas colunas que existem na tabela (evita erro "column does not exist")
    const validKeys = keys.filter(k => columnTypes[k]);
    if (validKeys.length === 0) {
      // Ex.: update só com print_status/printed_at em tabela que não tem essas colunas → não quebrar o fluxo
      console.log(`[Update] ${tableNameOnly}: nenhuma coluna do payload existe na tabela (omitidas: ${keys.join(', ')}). Retornando sucesso sem alterar.`);
      return res.json({ data: [], rows: [], count: 0 });
    }
    const skippedKeys = keys.filter(k => !columnTypes[k]);
    if (skippedKeys.length > 0) {
      console.log(`[Update] ${tableNameOnly}: colunas omitidas (não existem na tabela):`, skippedKeys);
    }
    const keysToUse = validKeys;
    
    // Serializar valores: arrays UUID[] devem ser passados como arrays, JSONB como JSON string
    const values = keysToUse.map((key, index) => {
      let value = data[key];
      const columnType = columnTypes[key];
      
      // UUID: string vazia "" causa "invalid input syntax for type uuid" no PostgreSQL
      if (columnType && columnType.udtName === 'uuid' && (value === '' || value === undefined)) {
        value = null;
      }
      
      // Colunas conhecidas que são arrays UUID[] (não JSONB)
      const uuidArrayColumns = ['allowed_respondents', 'target_employees'];
      
      // LOG para debug
      if (uuidArrayColumns.includes(key)) {
        console.log(`[Update] Processando coluna ${key}:`, {
          tipo: typeof value,
          isArray: Array.isArray(value),
          valor: typeof value === 'string' ? value.substring(0, 100) : value,
          columnType: columnType
        });
      }
      
      // CORREÇÃO CRÍTICA: Usar função helper para forçar deserialização se necessário
      if (uuidArrayColumns.includes(key)) {
        const fixedValue = forceDeserializeArray(value, key);
        if (fixedValue !== value) {
          value = fixedValue;
        }
      }
      
      // Se for uma coluna conhecida de array UUID[], passar como array nativo
      if (Array.isArray(value) && uuidArrayColumns.includes(key)) {
        console.log(`[Update] ✅ Detectado array UUID[] nativo para coluna ${key}, tamanho: ${value.length}`);
        return value; // Deixar o driver PostgreSQL converter automaticamente
      }
      
      // Se for array e a coluna for ARRAY (detectado pelo tipo), passar como array nativo
      if (Array.isArray(value) && columnType && columnType.dataType === 'ARRAY') {
        console.log(`[Update] ✅ Detectado tipo ARRAY para coluna ${key}, passando como array nativo`);
        return value; // Deixar o driver PostgreSQL converter automaticamente
      }
      
      // CORREÇÃO: Se for string que parece array JSON e a coluna é ARRAY, tentar deserializar
      if (typeof value === 'string' && columnType && columnType.dataType === 'ARRAY') {
        try {
          let parsed = value;
          // Se começa com '"', remover aspas externas primeiro
          if (value.trim().startsWith('"') && value.trim().endsWith('"')) {
            parsed = value.trim().slice(1, -1);
          }
          const parsedArray = JSON.parse(parsed);
          if (Array.isArray(parsedArray)) {
            console.log(`[Update] ✅ Deserializado array da string JSON para coluna ${key} (tipo ARRAY)`);
            return parsedArray;
          }
        } catch (e) {
          // Não é JSON válido, continuar
          console.warn(`[Update] ⚠️ Erro ao deserializar array para coluna ${key}:`, e.message);
        }
      }
      
      // Se for objeto/array e a coluna for JSONB, serializar como JSON
      if (value !== null && typeof value === 'object' && columnType && columnType.udtName === 'jsonb') {
        return JSON.stringify(value);
      }
      
      // Se for objeto/array mas não sabemos o tipo, tentar detectar:
      // Se for array de strings que parecem UUIDs, provavelmente é UUID[]
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value[0])) {
        // Provavelmente é UUID[], passar como array
        console.log(`[Update] ✅ Detectado array de UUIDs para coluna ${key}, passando como array nativo`);
        return value;
      }
      
      // Para outros objetos, serializar como JSON (pode ser JSONB)
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        return JSON.stringify(value);
      }
      
      // ÚLTIMA VERIFICAÇÃO: Se for string e a coluna é do tipo ARRAY, tentar deserializar
      // Isso cobre casos onde a coluna é ARRAY mas não está na lista de colunas conhecidas
      if (typeof value === 'string' && columnType && columnType.dataType === 'ARRAY') {
        try {
          let parsed = value.trim();
          // Remover aspas externas se existirem
          if (parsed.startsWith('"') && parsed.endsWith('"')) {
            parsed = parsed.slice(1, -1);
          }
          // Verificar se parece um array JSON
          if (parsed.startsWith('[') && parsed.endsWith(']')) {
            const parsedArray = JSON.parse(parsed);
            if (Array.isArray(parsedArray)) {
              console.log(`[Update] ✅ Última verificação: Deserializado array para coluna ${key} (tipo ARRAY detectado)`);
              return parsedArray;
            }
          }
        } catch (e) {
          // Não é JSON válido, continuar com valor original
        }
      }
      
      return value;
    });
    
    // Construir SET clause com tratamento especial para arrays UUID[]
    let setClause = keysToUse.map((key, i) => {
      const uuidArrayColumns = ['allowed_respondents', 'target_employees'];
      // Para arrays UUID[], usar cast explícito para garantir conversão correta
      if (uuidArrayColumns.includes(key) && Array.isArray(values[i])) {
        return `${key} = $${i + 1}::uuid[]`;
      }
      return `${key} = $${i + 1}`;
    }).join(', ');
    
    // Passar o número de valores do SET como offset para buildWhereClause
    const { clause: whereClause, params: whereParams } = buildWhereClause(where, values.length);
    let params = [...values, ...whereParams];
    let finalWhereClause = whereClause;
    
    // os_items atualizado apenas por id: não exigir company_id no WHERE e preencher company_id se null
    const isOsItemsUpdateById = tableNameOnly.toLowerCase() === 'os_items' && where && typeof where === 'object' && Object.keys(where).length === 1 && 'id' in where;
    if (isOsItemsUpdateById && columnTypes['company_id'] && req.companyId) {
      setClause += `, company_id = COALESCE(company_id, $${params.length + 1})`;
      params.push(req.companyId);
    }

    // payments: confirmar pagamento mesmo com company_id NULL (ex.: inserção antiga); preencher company_id e só permitir se for da empresa ou ainda não vinculado
    const isPaymentsUpdateById = tableNameOnly.toLowerCase() === 'payments' && where && typeof where === 'object' && Object.keys(where).length === 1 && 'id' in where;
    if (isPaymentsUpdateById && columnTypes['company_id'] && req.companyId) {
      setClause += `, company_id = COALESCE(company_id, $${params.length + 1})`;
      params.push(req.companyId);
    }
    
    // Adicionar filtro de company_id sempre que a tabela for multi-empresa (isolamento: uma empresa não altera dados de outra)
    if (needsCompanyFilter && req.user && req.companyId && !isOsItemsUpdateById) {
      const hasCompanyFilter = where && (
        (typeof where === 'object' && 'company_id' in where) ||
        (Array.isArray(where) && where.some((w) => w.field === 'company_id' || w.company_id))
      );
      
      if (!hasCompanyFilter) {
        // Verificar se a coluna company_id existe na tabela antes de adicionar o filtro
        try {
          const columnCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = $1 
            AND column_name = 'company_id'
          `, [tableNameOnly]);
          
          if (columnCheck.rows.length > 0) {
            // Coluna existe, adicionar filtro
            // payments atualizado por id: permitir linha com company_id NULL (confirmar pagamento) e preencher com req.companyId
            const paymentAllowNull = isPaymentsUpdateById ? ` (company_id = $${params.length + 1} OR company_id IS NULL)` : ` company_id = $${params.length + 1}`;
            if (finalWhereClause) {
              finalWhereClause += ` AND${paymentAllowNull}`;
            } else {
              finalWhereClause = `WHERE${paymentAllowNull}`;
            }
            params.push(req.companyId);
            console.log(`[Update] Adicionando filtro company_id=${req.companyId} para tabela ${tableNameOnly}`);
          } else {
            console.log(`[Update] Tabela ${tableNameOnly} não tem coluna company_id, pulando filtro`);
          }
        } catch (checkError) {
          console.warn(`[Update] Erro ao verificar coluna company_id em ${tableNameOnly}:`, checkError.message);
          // Em caso de erro na verificação, não adicionar o filtro para evitar quebrar o UPDATE
        }
      }
    }

    // Garantir que finalWhereClause seja válido - buildWhereClause retorna "WHERE ..." ou ""
    // Se estiver vazio e não houver filtro de company_id, não adicionar WHERE
    let sql = `UPDATE ${tableName} SET ${setClause}`;
    if (finalWhereClause) {
      sql += ` ${finalWhereClause}`;
    } else {
      // Se não há WHERE clause, isso é um erro
      console.error(`[Update] ERRO: finalWhereClause está vazio para ${tableName}`);
      console.error(`[Update] where recebido:`, JSON.stringify(where, null, 2));
      console.error(`[Update] whereClause retornado:`, whereClause);
      return res.status(400).json({ error: 'Update requires WHERE clause' });
    }
    sql += ` RETURNING *`;

    console.log(`[Update] ${tableName}:`, keys, 'WHERE:', finalWhereClause, 'Params:', params.length);
    console.log(`[Update] SQL completo:`, sql);
    
    // Log detalhado dos parâmetros, especialmente arrays
    const paramDetails = params.slice(0, keys.length).map((p, i) => {
      const key = keys[i];
      if (Array.isArray(p)) {
        return `${key}=[ARRAY:${p.length} items] ${JSON.stringify(p.slice(0, 3))}...`;
      } else if (typeof p === 'string' && (p.startsWith('[') || p.startsWith('"['))) {
        return `${key}="[STRING QUE PARECE ARRAY: ${p.substring(0, 100)}...]"`;
      } else {
        return `${key}=${typeof p === 'string' && p.length > 50 ? p.substring(0, 50) + '...' : p}`;
      }
    });
    console.log(`[Update] Parâmetros detalhados:`, paramDetails);
    
    console.log(`[Update] Executando query...`);
    
    // Log final dos arrays antes de executar
    params.slice(0, keys.length).forEach((param, i) => {
      const key = keys[i];
      if (key === 'allowed_respondents' || key === 'target_employees') {
        console.log(`[Update] 🔍 VALOR FINAL para ${key}:`, {
          tipo: typeof param,
          isArray: Array.isArray(param),
          valor: Array.isArray(param) ? `[${param.length} itens]` : String(param).substring(0, 100)
        });
      }
    });
    
    const result = await pool.query(sql, params);
    console.log(`[Update] Query executada com sucesso, ${result.rowCount} linhas afetadas`);

    if (tableNameOnly.toLowerCase() === 'sales') {
      result.rows
        .filter(shouldSendMetaOsPurchaseFromSaleRow)
        .forEach((row) => {
          void sendMetaOsPurchaseForSale(row.id);
        });
      result.rows
        .filter(shouldSendGooglePurchaseFromSaleRow)
        .forEach((row) => {
          void sendGoogleAdsPurchaseForSale(row.id);
        });
    }

    if (tableNameOnly.toLowerCase() === 'ordens_servico') {
      const statusValue = String(data?.status || '').toLowerCase();
      if (statusValue === 'entregue_faturada' || statusValue.includes('faturad')) {
        result.rows.forEach((row) => {
          void sendMetaOsPurchaseForOrder(row.id, row.company_id);
        });
      }
    }

    res.json({ data: result.rows, rows: result.rows, count: result.rowCount });
  } catch (error) {
    console.error('❌ Erro ao atualizar:', error);
    console.error('❌ Mensagem de erro:', error.message);
    console.error('❌ Stack:', error.stack);
    
    // Log detalhado do erro para arrays
    if (error.message && error.message.includes('malformed array literal')) {
      console.error('❌ ERRO DE ARRAY MALFORMADO DETECTADO!');
      console.error('❌ Verificando parâmetros de array...');
      params.slice(0, keys.length).forEach((param, i) => {
        const key = keys[i];
        if (key === 'allowed_respondents' || key === 'target_employees') {
          console.error(`❌ Parâmetro ${key}:`, {
            tipo: typeof param,
            isArray: Array.isArray(param),
            valor: typeof param === 'string' ? param : JSON.stringify(param).substring(0, 200)
          });
        }
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Upsert endpoint (INSERT ... ON CONFLICT UPDATE)
app.post('/api/upsert/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { data, onConflict } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Data is required' });
    }

    // Usar schema public explicitamente
    const tableName = table.includes('.') ? table : `public.${table}`;

    const keys = Object.keys(data);
    // Serializar objetos/arrays como JSON para campos JSONB
    const values = Object.values(data).map(value => {
      if (value !== null && typeof value === 'object') {
        return JSON.stringify(value);
      }
      return value;
    });
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    // Determinar coluna de conflito (padrão: 'key' para kv_store, 'id' para outras)
    const conflictColumn = onConflict || (table === 'kv_store_2c4defad' ? 'key' : 'id');
    
    // Verificar se a coluna de conflito existe na tabela
    let actualConflictColumn = conflictColumn;
    try {
      const checkColumn = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1 
        AND column_name = $2
      `, [table, conflictColumn]);
      
      if (checkColumn.rows.length === 0 && conflictColumn === 'id') {
        // Se 'id' não existe, tentar 'key' ou primeira coluna única
        const uniqueCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
          WHERE tc.table_schema = 'public' 
          AND tc.table_name = $1 
          AND tc.constraint_type = 'UNIQUE'
          LIMIT 1
        `, [table]);
        
        if (uniqueCheck.rows.length > 0) {
          actualConflictColumn = uniqueCheck.rows[0].column_name;
        } else if (table === 'kv_store_2c4defad') {
          actualConflictColumn = 'key';
        }
      }
    } catch (checkError) {
      console.warn(`[Upsert] Erro ao verificar coluna de conflito, usando padrão: ${checkError.message}`);
    }
    
    // Verificar se a coluna updated_at existe na tabela
    let hasUpdatedAt = false;
    try {
      const checkUpdatedAt = await pool.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'updated_at'
      `, [table]);
      hasUpdatedAt = checkUpdatedAt.rows.length > 0;
    } catch (e) {
      console.warn(`[Upsert] Erro ao verificar coluna updated_at: ${e.message}`);
    }

    // Construir cláusula SET para UPDATE em caso de conflito
    const keysToUpdate = keys.filter(key => key !== actualConflictColumn && key !== 'created_at');
    const updateClause = keysToUpdate
      .map((key) => {
        const valueIndex = keys.indexOf(key) + 1;
        return `${key} = $${valueIndex}`;
      })
      .join(', ');

    // Se não há colunas para atualizar além da de conflito, usar apenas updated_at (se existir)
    let finalUpdateClause;
    if (updateClause) {
      finalUpdateClause = hasUpdatedAt ? `${updateClause}, updated_at = NOW()` : updateClause;
    } else {
      // Se não há nada para atualizar, fazer um update "dummy" ou usar updated_at se existir
      finalUpdateClause = hasUpdatedAt ? 'updated_at = NOW()' : `${actualConflictColumn} = EXCLUDED.${actualConflictColumn}`;
    }

    const sql = `
      INSERT INTO ${tableName} (${keys.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (${actualConflictColumn}) 
      DO UPDATE SET ${finalUpdateClause}
      RETURNING *
    `;

    console.log(`[Upsert] ${tableName} on conflict: ${actualConflictColumn}`);
    const result = await pool.query(sql, values);
    res.json({ data: result.rows[0], rows: result.rows });
  } catch (error) {
    console.error('Erro ao upsert:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete endpoint (COM FILTRO DE company_id OBRIGATÓRIO)
app.post('/api/delete/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { where } = req.body;

    // Usar schema public explicitamente
    const tableName = table.includes('.') ? table : `public.${table}`;
    const tableNameOnly = table.includes('.') ? table.split('.')[1] : table;

    if (!where || Object.keys(where).length === 0) {
      return res.status(400).json({ error: 'Delete requires WHERE clause' });
    }

    // Lista COMPLETA de tabelas que precisam filtrar por company_id no DELETE
    // CRÍTICO: Garante isolamento de dados entre empresas
    const tablesWithCompanyId = [
      'produtos', 'vendas', 'sales', 'clientes', 'ordens_servico', 'veiculos',
      'sale_items', 'os_items', 'fornecedores', 'produto_movimentacoes',
      'time_clock', 'users',
      'nps_surveys', 'nps_responses',
      'job_surveys', 'job_responses', 'job_application_drafts',
      'job_candidate_ai_analysis', 'job_candidate_evaluations', 
      'job_interviews', 'candidate_responses',
      'payments', 'caixa_sessions', 'caixa_movements', 'cash_register_sessions', 'cash_movements',
      'bills_to_pay', 'financial_transactions', 'accounts_receivable', 'financial_categories',
      'marcas', 'modelos', 'configuracoes_empresa', 'company_settings',
      'cupom_config',
      'os_pagamentos', 'os_config_status', 'fornecedores',
      'refunds', 'refund_items',
      'pedidos', 'quotes',
      'user_activity_logs', 'audit_logs', 'disc_responses',
      'telegram_config',
      'trainings', 'training_assignments',
      'alert_panel_config', 'alert_config', 'alert_logs'
    ];

    const needsCompanyFilter = tablesWithCompanyId.includes(tableNameOnly.toLowerCase());

    // CRÍTICO: Usuário sem company_id não pode excluir dados de ninguém (isolamento entre empresas)
    if (needsCompanyFilter && req.user && !req.companyId) {
      return res.status(403).json({
        error: 'Usuário sem empresa vinculada (company_id). Vincule o usuário a uma empresa em Configurações.',
        codigo: 'COMPANY_ID_REQUIRED'
      });
    }

    const { clause: whereClause, params } = buildWhereClause(where);
    let finalWhereClause = whereClause;
    let finalParams = [...params];

    // Antes de excluir fornecedor: desvincular itens de OS (evita FK e não depende do endpoint update/os_items)
    if (tableNameOnly.toLowerCase() === 'fornecedores' && where && typeof where === 'object' && where.id) {
      try {
        await pool.query(
          'UPDATE public.os_items SET fornecedor_id = null WHERE fornecedor_id = $1',
          [where.id]
        );
        console.log('[Delete] Fornecedor: os_items desvinculados para id', where.id);
      } catch (unlinkErr) {
        // Coluna fornecedor_id pode não existir em ambientes antigos; não bloquear o delete
        console.warn('[Delete] Fornecedor: aviso ao desvincular os_items:', unlinkErr.message);
      }
    }

    // CRÍTICO: Adicionar filtro de company_id sempre (isolamento: uma empresa não exclui dados de outra)
    if (needsCompanyFilter && req.user && req.companyId) {
      const hasCompanyFilter = where && (typeof where === 'object' && 'company_id' in where);
      
      if (!hasCompanyFilter) {
        let tableHasCompanyId = false;
        try {
          const colCheck = await pool.query(`
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'company_id'
          `, [tableNameOnly]);
          tableHasCompanyId = colCheck.rows && colCheck.rows.length > 0;
        } catch (e) {
          console.warn('[Delete] Erro ao verificar coluna company_id:', e.message);
        }
        if (tableHasCompanyId) {
          if (finalWhereClause) {
            finalWhereClause += ` AND company_id = $${finalParams.length + 1}`;
          } else {
            finalWhereClause = `WHERE company_id = $${finalParams.length + 1}`;
          }
          finalParams.push(req.companyId);
          console.log(`[Delete] Adicionando filtro company_id=${req.companyId} para tabela ${tableNameOnly}`);
        } else {
          console.log(`[Delete] Tabela ${tableNameOnly} sem coluna company_id, delete sem filtro de empresa`);
        }
      }
    }

    if (tableNameOnly.toLowerCase() === 'bills_to_pay') {
      try {
        const billsToDelete = await pool.query(
          `SELECT id FROM ${tableName} ${finalWhereClause}`,
          finalParams
        );
        const billIds = billsToDelete.rows.map((row) => row.id).filter(Boolean);

        if (billIds.length > 0) {
          try {
            await pool.query(
              'DELETE FROM public.financial_alerts WHERE bill_id = ANY($1::uuid[])',
              [billIds]
            );
          } catch (cleanupErr) {
            console.warn('[Delete] bills_to_pay: aviso ao limpar financial_alerts:', cleanupErr.message);
          }

          try {
            await pool.query(
              `DELETE FROM public.financial_transactions
               WHERE reference_type = 'bill'
                 AND reference_id = ANY($1::uuid[])`,
              [billIds]
            );
          } catch (cleanupErr) {
            console.warn('[Delete] bills_to_pay: aviso ao limpar financial_transactions:', cleanupErr.message);
          }

          try {
            await pool.query(
              'UPDATE public.treasury_movements SET bill_id = NULL WHERE bill_id = ANY($1::uuid[])',
              [billIds]
            );
          } catch (cleanupErr) {
            console.warn('[Delete] bills_to_pay: aviso ao desvincular treasury_movements:', cleanupErr.message);
          }
        }
      } catch (cleanupErr) {
        console.warn('[Delete] bills_to_pay: aviso ao preparar limpeza de vínculos:', cleanupErr.message);
      }
    }

    const sql = `
      DELETE FROM ${tableName}
      ${finalWhereClause}
      RETURNING *
    `;

    console.log(`[Delete] ${tableName} - SQL: ${sql.substring(0, 100)}...`);
    const result = await pool.query(sql, finalParams);
    res.json({ data: result.rows, rows: result.rows, count: result.rowCount });
  } catch (error) {
    console.error('Erro ao deletar:', error);
    res.status(500).json({ error: error.message });
  }
});

// RPC endpoint (para funções stored procedures)
app.post('/api/rpc/:function', async (req, res) => {
  try {
    const { function: functionName } = req.params;
    const params = req.body.params || [];

    const placeholders = params.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `SELECT * FROM ${functionName}(${placeholders})`;

    const result = await pool.query(sql, params);
    res.json({ data: result.rows, rows: result.rows });
  } catch (error) {
    console.error('Erro ao executar RPC:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ENDPOINT WHATSAPP - ENVIO DE MENSAGENS VIA ATIVA CRM
// ============================================

function extractAtivaCrmTicketId(payload) {
  if (!payload || typeof payload !== 'object') return null;

  const candidates = [
    payload.ticketId,
    payload.ticket_id,
    payload.ticket?.id,
    payload.data?.ticketId,
    payload.data?.ticket_id,
    payload.data?.ticket?.id,
    payload.message?.ticketId,
    payload.message?.ticket_id,
    payload.message?.ticket?.id,
    payload.data?.id,
    payload.id,
  ];

  const ticketId = candidates.find((value) => value !== undefined && value !== null && value !== '');
  return ticketId ? String(ticketId) : null;
}

function extractAtivaCrmContactId(payload) {
  if (!payload || typeof payload !== 'object') return null;

  const candidates = [
    payload.contactId,
    payload.contact_id,
    payload.contact?.id,
    payload.data?.contactId,
    payload.data?.contact_id,
    payload.data?.contact?.id,
    payload.message?.contactId,
    payload.message?.contact_id,
    payload.message?.contact?.id,
    payload.ticket?.contactId,
    payload.ticket?.contact_id,
    payload.ticket?.contact?.id,
    payload.data?.ticket?.contactId,
    payload.data?.ticket?.contact_id,
    payload.data?.ticket?.contact?.id,
  ];

  const contactId = candidates.find((value) => value !== undefined && value !== null && value !== '');
  return contactId ? String(contactId) : null;
}

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

async function postAtivaCrmApi({ token, path, payload, label }) {
  const response = await fetch(`https://api.ativacrm.com/api/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.warn(`[AtivaCRM] Falha em ${label}:`, response.status, result);
    return { success: false, status: response.status, data: result, path };
  }

  return { success: true, status: response.status, data: result, path };
}

async function createAtivaCrmContact({ token, name, email, phone, tagId }) {
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  if (!cleanPhone) return null;

  const contactName = normalizeAtivaCrmContactName(name, cleanPhone);
  const numericTagId = tagId ? Number(tagId) : null;
  const payload = {
    name: contactName || cleanPhone,
    contactName: contactName || cleanPhone,
    contact_name: contactName || cleanPhone,
    displayName: contactName || cleanPhone,
    email: email || '',
    phone: cleanPhone,
    number: cleanPhone,
    whatsapp: cleanPhone,
  };
  if (numericTagId && Number.isFinite(numericTagId)) {
    payload.tags = [numericTagId];
  }

  const attempts = [];
  for (const path of ['createcontact', 'contactCreate']) {
    const result = await postAtivaCrmApi({
      token,
      path,
      payload,
      label: `criar contato (${path})`,
    });
    attempts.push(result);
  }

  return { success: attempts.some((attempt) => attempt.success), attempts };
}

async function updateAtivaCrmContact({ token, name, email, phone, contactId, ticketId }) {
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  const contactName = normalizeAtivaCrmContactName(name, cleanPhone);
  if (!contactName || (!cleanPhone && !contactId && !ticketId)) return null;

  const basePayload = {
    name: contactName,
    contactName,
    contact_name: contactName,
    displayName: contactName,
    email: email || '',
  };
  const payloads = [
    cleanPhone ? { ...basePayload, phone: cleanPhone, number: cleanPhone, whatsapp: cleanPhone } : null,
    contactId ? { ...basePayload, id: contactId, contactId } : null,
    ticketId ? { ...basePayload, ticketId } : null,
  ].filter(Boolean);

  const attempts = [];
  for (const payload of payloads) {
    for (const path of ['updatecontact', 'contactUpdate']) {
      const result = await postAtivaCrmApi({
        token,
        path,
        payload,
        label: `atualizar contato (${path})`,
      });
      attempts.push(result);
      if (result.success) return { success: true, attempts };
    }
  }

  return { success: attempts.some((attempt) => attempt.success), attempts };
}

async function updateAtivaCrmContactTag({ token, phone, tagId, contactId, ticketId }) {
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  const numericTagId = tagId ? Number(tagId) : null;
  if (!numericTagId || !Number.isFinite(numericTagId)) return null;

  const attempts = [];
  const payloads = [
    cleanPhone ? { number: cleanPhone, tags: [numericTagId] } : null,
    contactId ? { contactId, tags: [numericTagId] } : null,
    ticketId ? { ticketId, tags: [numericTagId] } : null,
  ].filter(Boolean);

  for (const payload of payloads) {
    const result = await postAtivaCrmApi({
      token,
      path: 'updatetag',
      payload,
      label: 'aplicar tag ao contato/ticket',
    });
    attempts.push(result);
    if (result.success) return { success: true, attempts };
  }

  return { success: false, attempts };
}

async function addAtivaCrmTicketTag({ token, ticketId, tagId }) {
  if (!ticketId || !tagId) return null;

  const response = await fetch(`https://api.ativacrm.com/api/tickets/${ticketId}/tags`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ tagId: Number(tagId) }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.warn('[AtivaCRM] Falha ao adicionar tag ao ticket:', response.status, result);
    return { success: false, status: response.status, data: result };
  }

  return { success: true, status: response.status, data: result };
}

// POST /api/whatsapp/send (usa integration_settings por empresa se houver auth)
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { action, data } = req.body;

    if (!data || !data.number || !data.body) {
      return res.status(400).json({ error: 'number e body são obrigatórios' });
    }

    let companyId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        const userRow = await pool.query('SELECT company_id FROM users WHERE id = $1', [decoded.userId || decoded.sub]);
        if (userRow.rows[0]?.company_id) companyId = userRow.rows[0].company_id;
      } catch (_) {}
    }
    const integrationKey = companyId ? `integration_settings_${companyId}` : 'integration_settings';

    const tokenResult = await pool.query(
      `SELECT value FROM kv_store_2c4defad WHERE key = $1`,
      [integrationKey]
    );

    let ativaCrmToken = null;
    if (tokenResult.rows.length > 0 && tokenResult.rows[0].value) {
      const settings = tokenResult.rows[0].value;
      ativaCrmToken = settings.ativaCrmToken;
    }

    if (!ativaCrmToken) {
      return res.status(400).json({ 
        error: 'Token do Ativa CRM não configurado',
        warning: 'Configure o token em Integrações'
      });
    }

    // Formatar número (remover caracteres especiais)
    const formattedNumber = data.number.replace(/\D/g, '');
    const contactName = normalizeAtivaCrmContactName(data.contactName || data.name, formattedNumber);

    const contactResult = await createAtivaCrmContact({
      token: ativaCrmToken,
      name: contactName,
      email: data.email,
      phone: formattedNumber,
      tagId: data.tagId,
    });

    const contactUpdateResult = await updateAtivaCrmContact({
      token: ativaCrmToken,
      name: contactName,
      email: data.email,
      phone: formattedNumber,
    });

    let contactTagResult = null;
    if (data.tagId) {
      contactTagResult = await updateAtivaCrmContactTag({
        token: ativaCrmToken,
        phone: formattedNumber,
        tagId: data.tagId,
      });
    }

    // Enviar mensagem via API do Ativa CRM (documentação oficial)
    // URL: https://api.ativacrm.com/api/messages/send
    const ativaCrmResponse = await fetch('https://api.ativacrm.com/api/messages/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ativaCrmToken}`,
      },
      body: JSON.stringify({
        name: contactName || formattedNumber,
        contactName: contactName || formattedNumber,
        contact_name: contactName || formattedNumber,
        displayName: contactName || formattedNumber,
        email: data.email || '',
        number: formattedNumber,
        body: data.body,
        tagId: data.tagId ? Number(data.tagId) : undefined,
        tags: data.tagId ? [Number(data.tagId)] : undefined,
        contact: {
          name: contactName || formattedNumber,
          contactName: contactName || formattedNumber,
          number: formattedNumber,
          phone: formattedNumber,
          whatsapp: formattedNumber,
          email: data.email || '',
        },
      }),
    });

    const ativaCrmData = await ativaCrmResponse.json().catch(() => ({}));

    console.log('[WhatsApp] Resposta Ativa CRM:', ativaCrmResponse.status, ativaCrmData);

    if (!ativaCrmResponse.ok) {
      // Verificar se é erro de WhatsApp não configurado
      if (ativaCrmData.message?.includes('WhatsApp') || ativaCrmData.error?.includes('WhatsApp')) {
        return res.json({
          success: false,
          warning: 'ERR_NO_DEF_WAPP_FOUND',
          message: ativaCrmData.message || 'Nenhum WhatsApp padrão configurado no Ativa CRM',
        });
      }
      
      return res.status(ativaCrmResponse.status).json({
        success: false,
        error: ativaCrmData.message || ativaCrmData.error || 'Erro ao enviar mensagem',
      });
    }

    let tagResult = null;
    const ticketId = data.ticketId || extractAtivaCrmTicketId(ativaCrmData);
    const contactId = extractAtivaCrmContactId(ativaCrmData);
    const contactUpdateAfterSendResult = await updateAtivaCrmContact({
      token: ativaCrmToken,
      name: contactName,
      email: data.email,
      phone: formattedNumber,
      contactId,
      ticketId,
    });

    if (data.tagId) {
      const contactTagAfterSendResult = await updateAtivaCrmContactTag({
        token: ativaCrmToken,
        phone: formattedNumber,
        tagId: data.tagId,
        contactId,
        ticketId,
      });
      if (ticketId) {
        tagResult = await addAtivaCrmTicketTag({
          token: ativaCrmToken,
          ticketId,
          tagId: data.tagId,
        });
        if (contactTagAfterSendResult) {
          tagResult = { ticket: tagResult, contact: contactTagAfterSendResult };
        }
      } else {
        console.warn('[AtivaCRM] Mensagem enviada, mas nenhum ticketId foi encontrado para aplicar a tag:', data.tagId);
        tagResult = {
          success: false,
          warning: 'TICKET_ID_NOT_FOUND',
          tagId: data.tagId,
          contact: contactTagAfterSendResult,
        };
      }
    }

    res.json({
      success: true,
      message: ativaCrmData.message || 'Mensagem enviada com sucesso',
      data: ativaCrmData,
      contact: contactResult,
      contactUpdate: contactUpdateResult,
      contactUpdateAfterSend: contactUpdateAfterSendResult,
      contactTag: contactTagResult,
      tag: tagResult,
    });
  } catch (error) {
    console.error('[WhatsApp] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/meta-ads/test-event', authenticateToken, async (req, res) => {
  try {
    if (!req.companyId) {
      return res.status(403).json({ error: 'Usuário sem empresa vinculada.', codigo: 'COMPANY_ID_REQUIRED' });
    }

    const now = Math.floor(Date.now() / 1000);
    const phone = normalizePhoneForMeta(req.body?.phone || '5599999999999');
    const value = Number(req.body?.value || 1);
    const event = {
      event_name: 'Purchase',
      event_time: now,
      event_id: `meta_test_${req.companyId}_${now}`,
      action_source: 'system_generated',
      user_data: {
        ph: [hashSha256(phone)],
      },
      custom_data: {
        currency: 'BRL',
        value,
        order_id: `TEST-${now}`,
        content_name: req.body?.content_name || 'Evento de teste Ativa Fix',
        content_category: 'Teste',
      },
    };

    const result = await sendMetaEvent(req.companyId, event, {
      eventType: 'test',
      source: 'manual_test',
    });
    if (result?.skipped) {
      return res.status(400).json({
        success: false,
        error: 'Meta Ads não configurado ou desativado.',
        reason: result.reason,
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Meta Ads] Erro no evento de teste:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/meta-ads/reprocess-os-purchases', authenticateToken, async (req, res) => {
  try {
    if (!req.companyId) {
      return res.status(403).json({ success: false, error: 'Usuário sem empresa vinculada.', codigo: 'COMPANY_ID_REQUIRED' });
    }

    const startDate = req.body?.startDate || new Date().toISOString().slice(0, 10);
    const endDate = req.body?.endDate || startDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({ success: false, error: 'Informe startDate/endDate no formato YYYY-MM-DD.' });
    }

    const salesResult = await pool.query(`
      SELECT DISTINCT ON (s.ordem_servico_id)
        s.id,
        s.ordem_servico_id
      FROM public.sales s
      LEFT JOIN public.meta_ads_event_logs l
        ON l.company_id = s.company_id
       AND l.ordem_servico_id = s.ordem_servico_id
       AND l.event_name = 'Purchase'
       AND l.status = 'enviado'
      WHERE s.company_id = $1
        AND s.sale_origin = 'OS'
        AND s.ordem_servico_id IS NOT NULL
        AND s.status = 'paid'
        AND COALESCE(s.is_draft, false) = false
        AND COALESCE(s.finalized_at, s.created_at) >= $2::date
        AND COALESCE(s.finalized_at, s.created_at) < ($3::date + INTERVAL '1 day')
        AND l.id IS NULL
      ORDER BY s.ordem_servico_id, s.total DESC NULLS LAST, s.finalized_at DESC NULLS LAST, s.created_at DESC
    `, [req.companyId, startDate, endDate]);

    const summary = {
      period: { startDate, endDate },
      found: salesResult.rows.length,
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: 0,
      results: [],
    };

    for (const sale of salesResult.rows) {
      summary.processed += 1;
      const result = await sendMetaOsPurchaseForSale(sale.id);
      summary.results.push({
        sale_id: sale.id,
        ordem_servico_id: sale.ordem_servico_id,
        ...result,
      });
      if (result?.sent) summary.sent += 1;
      else if (result?.reason === 'send_error') summary.errors += 1;
      else summary.skipped += 1;
    }

    res.json({ success: true, ...summary });
  } catch (error) {
    console.error('[Meta Ads] Erro ao reprocessar purchases de OS:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/meta-ads/logs', authenticateToken, async (req, res) => {
  try {
    if (!req.companyId) {
      return res.status(403).json({ success: false, error: 'Usuário sem empresa vinculada.', codigo: 'COMPANY_ID_REQUIRED' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const result = await pool.query(`
      SELECT
        id,
        event_id,
        event_name,
        event_type,
        source,
        sale_id,
        ordem_servico_id,
        status,
        attempts,
        last_attempt_at,
        sent_at,
        error_message,
        response_payload,
        created_at
      FROM public.meta_ads_event_logs
      WHERE company_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [req.companyId, limit]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    if (isMissingMetaLogsTable(error)) {
      return res.json({ success: true, data: [], warning: 'META_ADS_EVENT_LOGS_MISSING' });
    }
    console.error('[Meta Ads] Erro ao listar logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/meta-ads/report', authenticateToken, async (req, res) => {
  try {
    if (!req.companyId) {
      return res.status(403).json({ success: false, error: 'Usuário sem empresa vinculada.', codigo: 'COMPANY_ID_REQUIRED' });
    }

    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
    const now = new Date();
    const defaultStartDate = new Date(now);
    defaultStartDate.setDate(defaultStartDate.getDate() - (days - 1));
    defaultStartDate.setHours(0, 0, 0, 0);

    const requestedStart = req.query.startDate ? new Date(`${req.query.startDate}T00:00:00.000Z`) : defaultStartDate;
    const requestedEnd = req.query.endDate ? new Date(`${req.query.endDate}T23:59:59.999Z`) : now;
    const startDate = Number.isNaN(requestedStart.getTime()) ? defaultStartDate : requestedStart;
    const endDate = Number.isNaN(requestedEnd.getTime()) ? now : requestedEnd;
    const cappedEndDate = endDate < startDate ? startDate : endDate;

    const [leadSummary, purchaseSummary, dailySummary] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE direction = 'inbound')::int AS inbound,
          COUNT(*) FILTER (WHERE direction = 'outbound')::int AS outbound,
          COUNT(*) FILTER (WHERE meta_status = 'enviado')::int AS enviado,
          COUNT(*) FILTER (WHERE meta_status = 'erro')::int AS erro,
          COUNT(*) FILTER (WHERE meta_status = 'ignorado')::int AS ignorado,
          COUNT(*) FILTER (WHERE ctwa_clid IS NOT NULL OR campaign_id IS NOT NULL OR campaign_name IS NOT NULL OR ad_id IS NOT NULL)::int AS com_campanha,
          COUNT(DISTINCT NULLIF(contact_phone, ''))::int AS contatos_unicos
        FROM public.ativa_crm_webhook_events
        WHERE company_id = $1
          AND created_at >= $2::timestamptz
          AND created_at <= $3::timestamptz
      `, [req.companyId, startDate.toISOString(), cappedEndDate.toISOString()]),
      pool.query(`
        WITH latest_purchase_per_os AS (
          SELECT DISTINCT ON (ordem_servico_id)
            ordem_servico_id,
            event_name,
            status,
            request_payload,
            created_at
          FROM public.meta_ads_event_logs
          WHERE company_id = $1
            AND created_at >= $2::timestamptz
            AND created_at <= $3::timestamptz
            AND source <> 'manual_test'
            AND event_name = 'Purchase'
            AND ordem_servico_id IS NOT NULL
          ORDER BY ordem_servico_id, CASE WHEN status = 'enviado' THEN 0 ELSE 1 END, created_at DESC
        )
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'enviado')::int AS enviado,
          COUNT(*) FILTER (WHERE status = 'erro')::int AS erro,
          COALESCE(SUM(
            CASE
              WHEN status = 'enviado'
               AND (request_payload->'custom_data'->>'value') ~ '^[0-9]+(\\.[0-9]+)?$'
              THEN (request_payload->'custom_data'->>'value')::numeric
              ELSE 0
            END
          ), 0)::numeric AS valor_enviado
        FROM latest_purchase_per_os
      `, [req.companyId, startDate.toISOString(), cappedEndDate.toISOString()]),
      pool.query(`
        WITH dias AS (
          SELECT generate_series(
            date_trunc('day', $2::timestamptz),
            date_trunc('day', $3::timestamptz),
            interval '1 day'
          )::date AS dia
        ),
        leads AS (
          SELECT date_trunc('day', created_at)::date AS dia, COUNT(*)::int AS total
          FROM public.ativa_crm_webhook_events
          WHERE company_id = $1
            AND created_at >= $2::timestamptz
            AND created_at <= $3::timestamptz
          GROUP BY 1
        ),
        purchases AS (
          SELECT dia, COUNT(*)::int AS total
          FROM (
            SELECT DISTINCT ON (ordem_servico_id)
              ordem_servico_id,
              date_trunc('day', created_at)::date AS dia,
              status,
              created_at
            FROM public.meta_ads_event_logs
            WHERE company_id = $1
              AND created_at >= $2::timestamptz
              AND created_at <= $3::timestamptz
              AND source <> 'manual_test'
              AND event_name = 'Purchase'
              AND ordem_servico_id IS NOT NULL
            ORDER BY ordem_servico_id, CASE WHEN status = 'enviado' THEN 0 ELSE 1 END, created_at DESC
          ) purchase_per_os
          WHERE status = 'enviado'
          GROUP BY 1
        )
        SELECT
          dias.dia,
          COALESCE(leads.total, 0)::int AS leads,
          COALESCE(purchases.total, 0)::int AS purchases
        FROM dias
        LEFT JOIN leads ON leads.dia = dias.dia
        LEFT JOIN purchases ON purchases.dia = dias.dia
        ORDER BY dias.dia DESC
        LIMIT 14
      `, [req.companyId, startDate.toISOString(), cappedEndDate.toISOString()]),
    ]);

    res.json({
      success: true,
      days,
      period: {
        startDate: startDate.toISOString().slice(0, 10),
        endDate: cappedEndDate.toISOString().slice(0, 10),
      },
      leads: leadSummary.rows[0] || {},
      purchases: purchaseSummary.rows[0] || {},
      daily: dailySummary.rows,
    });
  } catch (error) {
    if (isMissingMetaLogsTable(error) || isMissingAtivaCrmWebhookTable(error)) {
      return res.json({
        success: true,
        warning: 'META_REPORT_TABLES_MISSING',
        leads: {},
        purchases: {},
        daily: [],
      });
    }
    console.error('[Meta Ads] Erro ao gerar relatório:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/google-ads/test-event', authenticateToken, async (req, res) => {
  try {
    if (!req.companyId) {
      return res.status(403).json({ error: 'Usuário sem empresa vinculada.', codigo: 'COMPANY_ID_REQUIRED' });
    }

    const settings = await getIntegrationSettings(req.companyId);
    const googleAds = settings.googleAds || {};
    const conversionAction = googleAds.osPurchaseConversionAction || googleAds.clientLeadConversionAction;
    const now = new Date();
    const conversion = {
      eventName: 'Google Ads Test',
      eventId: `google_test_${req.companyId}_${Math.floor(now.getTime() / 1000)}`,
      conversionAction,
      conversionDateTime: now,
      orderId: `TEST-${Math.floor(now.getTime() / 1000)}`,
      value: Number(req.body?.value || 1),
      currencyCode: 'BRL',
      userIdentifiers: buildGoogleUserIdentifiers({
        phone: req.body?.phone || '5599999999999',
        firstName: 'Teste',
        lastName: 'Ativa Fix',
      }),
    };

    const result = await sendGoogleAdsConversion(req.companyId, conversion, {
      eventType: 'test',
      source: 'manual_test',
    });
    if (result?.skipped) {
      return res.status(400).json({
        success: false,
        error: 'Google Ads não configurado ou conversão sem Conversion Action.',
        reason: result.reason,
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Google Ads] Erro no evento de teste:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/google-ads/logs', authenticateToken, async (req, res) => {
  try {
    if (!req.companyId) {
      return res.status(403).json({ success: false, error: 'Usuário sem empresa vinculada.', codigo: 'COMPANY_ID_REQUIRED' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const result = await pool.query(`
      SELECT
        id,
        event_id,
        event_name,
        event_type,
        source,
        sale_id,
        ordem_servico_id,
        ativa_crm_event_id,
        status,
        attempts,
        last_attempt_at,
        sent_at,
        error_message,
        response_payload,
        created_at
      FROM public.google_ads_event_logs
      WHERE company_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [req.companyId, limit]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    if (isMissingGoogleLogsTable(error)) {
      return res.json({ success: true, data: [], warning: 'GOOGLE_ADS_EVENT_LOGS_MISSING' });
    }
    console.error('[Google Ads] Erro ao listar logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/google-ads/report', authenticateToken, async (req, res) => {
  try {
    if (!req.companyId) {
      return res.status(403).json({ success: false, error: 'Usuário sem empresa vinculada.', codigo: 'COMPANY_ID_REQUIRED' });
    }

    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
    const now = new Date();
    const defaultStartDate = new Date(now);
    defaultStartDate.setDate(defaultStartDate.getDate() - (days - 1));
    defaultStartDate.setHours(0, 0, 0, 0);
    const requestedStart = req.query.startDate ? new Date(`${req.query.startDate}T00:00:00.000Z`) : defaultStartDate;
    const requestedEnd = req.query.endDate ? new Date(`${req.query.endDate}T23:59:59.999Z`) : now;
    const startDate = Number.isNaN(requestedStart.getTime()) ? defaultStartDate : requestedStart;
    const endDate = Number.isNaN(requestedEnd.getTime()) ? now : requestedEnd;
    const cappedEndDate = endDate < startDate ? startDate : endDate;

    const [summary, dailySummary] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'enviado')::int AS enviado,
          COUNT(*) FILTER (WHERE status = 'erro')::int AS erro,
          COUNT(*) FILTER (WHERE status = 'ignorado')::int AS ignorado,
          COUNT(*) FILTER (WHERE event_type IN ('os_purchase', 'pdv_purchase') AND status = 'enviado')::int AS purchases,
          COUNT(*) FILTER (WHERE event_type = 'ativa_crm_lead' AND status = 'enviado')::int AS leads,
          COUNT(*) FILTER (WHERE event_type = 'lead_qualified' AND status = 'enviado')::int AS qualificados,
          COUNT(*) FILTER (WHERE event_type = 'lead_disqualified' AND status = 'enviado')::int AS desqualificados,
          COALESCE(SUM(
            CASE
              WHEN event_type IN ('os_purchase', 'pdv_purchase')
               AND status = 'enviado'
               AND (request_payload->>'value') ~ '^[0-9]+(\\.[0-9]+)?$'
              THEN (request_payload->>'value')::numeric
              ELSE 0
            END
          ), 0)::numeric AS valor_enviado
        FROM public.google_ads_event_logs
        WHERE company_id = $1
          AND created_at >= $2::timestamptz
          AND created_at <= $3::timestamptz
          AND source <> 'manual_test'
      `, [req.companyId, startDate.toISOString(), cappedEndDate.toISOString()]),
      pool.query(`
        WITH dias AS (
          SELECT generate_series(
            date_trunc('day', $2::timestamptz),
            date_trunc('day', $3::timestamptz),
            interval '1 day'
          )::date AS dia
        ),
        events AS (
          SELECT
            date_trunc('day', created_at)::date AS dia,
            COUNT(*) FILTER (WHERE event_type LIKE '%purchase%')::int AS purchases,
            COUNT(*) FILTER (WHERE event_type LIKE '%lead%')::int AS leads
          FROM public.google_ads_event_logs
          WHERE company_id = $1
            AND created_at >= $2::timestamptz
            AND created_at <= $3::timestamptz
            AND source <> 'manual_test'
          GROUP BY 1
        )
        SELECT
          dias.dia,
          COALESCE(events.leads, 0)::int AS leads,
          COALESCE(events.purchases, 0)::int AS purchases
        FROM dias
        LEFT JOIN events ON events.dia = dias.dia
        ORDER BY dias.dia DESC
        LIMIT 14
      `, [req.companyId, startDate.toISOString(), cappedEndDate.toISOString()]),
    ]);

    res.json({
      success: true,
      days,
      period: {
        startDate: startDate.toISOString().slice(0, 10),
        endDate: cappedEndDate.toISOString().slice(0, 10),
      },
      summary: summary.rows[0] || {},
      daily: dailySummary.rows,
    });
  } catch (error) {
    if (isMissingGoogleLogsTable(error)) {
      return res.json({
        success: true,
        warning: 'GOOGLE_ADS_EVENT_LOGS_MISSING',
        summary: {},
        daily: [],
      });
    }
    console.error('[Google Ads] Erro ao gerar relatório:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/webhook/ativa-crm/:companyId/:secret', async (req, res) => {
  const { companyId, secret } = req.params;
  try {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId)) {
      return res.status(404).json({ success: false, error: 'Webhook inválido' });
    }

    const settings = await getIntegrationSettings(companyId);
    const meta = settings.metaAds || {};
    if (!meta.webhookSecret || secret !== meta.webhookSecret) {
      return res.status(403).json({ success: false, error: 'Webhook não autorizado' });
    }

    const { event, duplicate } = await insertAtivaCrmWebhookEvent(companyId, req.body || {}, req);
    if (!event) {
      return res.status(500).json({ success: false, error: 'Evento não foi registrado' });
    }

    let metaResult = { skipped: true, reason: duplicate ? 'duplicate_webhook_event' : 'not_processed' };
    let googleAdsResult = { skipped: true, reason: duplicate ? 'duplicate_webhook_event' : 'not_processed' };
    if (!duplicate) {
      try {
        metaResult = await sendMetaLeadForAtivaCrmWebhook(event);
      } catch (metaError) {
        console.error('[AtivaCRM Webhook] Lead recebido, mas falhou ao enviar para Meta:', metaError.message);
        metaResult = { skipped: false, error: metaError.message };
      }
      try {
        googleAdsResult = await sendGoogleAdsLeadForAtivaCrmWebhook(event);
      } catch (googleError) {
        console.error('[AtivaCRM Webhook] Lead recebido, mas falhou ao enviar para Google Ads:', googleError.message);
        googleAdsResult = { skipped: false, error: googleError.message };
      }
    }

    res.json({
      success: true,
      event_id: event.event_id,
      duplicate,
      meta: metaResult,
      googleAds: googleAdsResult,
    });
  } catch (error) {
    if (isMissingAtivaCrmWebhookTable(error)) {
      return res.status(503).json({
        success: false,
        error: 'Tabela de webhook Ativa CRM ausente. Rode db/migrations/manual/ATIVA_CRM_WEBHOOK_EVENTS.sql.',
      });
    }
    console.error('[AtivaCRM Webhook] Erro ao processar webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/ativa-crm/webhook-events', authenticateToken, async (req, res) => {
  try {
    if (!req.companyId) {
      return res.status(403).json({ success: false, error: 'Usuário sem empresa vinculada.', codigo: 'COMPANY_ID_REQUIRED' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 50);
    const events = [];
    let warning = null;

    try {
      const result = await pool.query(`
        SELECT
          id,
          event_id,
          conversation_id,
          ticket_id,
          message_id,
          contact_name,
          contact_phone,
          message_text,
          direction,
          ctwa_clid,
          source_url,
          campaign_id,
          campaign_name,
          adset_id,
          ad_id,
          utm_source,
          utm_medium,
          utm_campaign,
          meta_event_id,
          meta_status,
          meta_error_message,
          created_at
        FROM public.ativa_crm_webhook_events
        WHERE company_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `, [req.companyId, limit]);
      events.push(...result.rows);
    } catch (error) {
      if (isMissingAtivaCrmWebhookTable(error)) {
        warning = 'ATIVA_CRM_WEBHOOK_EVENTS_MISSING';
      } else {
        throw error;
      }
    }

    try {
      const legacyResult = await pool.query(`
        SELECT
          l.id,
          l.nome,
          l.telefone,
          l.whatsapp,
          l.observacoes,
          l.utm_campaign,
          l.utm_source,
          l.utm_medium,
          l.raw_payload,
          l.created_at
        FROM public.leads l
        WHERE l.webhook_id IS NOT NULL
           OR l.raw_payload IS NOT NULL
           OR l.utm_source = 'ativacrm_whatsapp'
        ORDER BY l.created_at DESC
        LIMIT $1
      `, [limit]);

      const mappedLegacy = legacyResult.rows.map((lead) => {
        const rawPayload = typeof lead.raw_payload === 'string' ? parseWebhookJsonObject(lead.raw_payload) : lead.raw_payload;
        const extracted = rawPayload ? extractAtivaCrmWebhookData(rawPayload) : {};
        const message = lead.observacoes
          ? String(lead.observacoes).replace(/^Mensagem:\s*/i, '').trim()
          : extracted.messageText;
        return {
          id: `lead_${lead.id}`,
          event_id: `legacy_lead_${lead.id}`,
          conversation_id: extracted.conversationId || null,
          ticket_id: extracted.ticketId || null,
          message_id: extracted.messageId || null,
          contact_name: lead.nome || extracted.contactName || 'Lead WhatsApp',
          contact_phone: normalizePhoneForMeta(lead.whatsapp || lead.telefone || extracted.contactPhone || ''),
          message_text: message || null,
          direction: extracted.direction || 'inbound',
          ctwa_clid: extracted.ctwaClid || null,
          source_url: extracted.sourceUrl || null,
          campaign_id: extracted.campaignId || null,
          campaign_name: lead.utm_campaign || extracted.campaignName || null,
          adset_id: extracted.adsetId || null,
          ad_id: extracted.adId || null,
          utm_source: lead.utm_source || extracted.utmSource || null,
          utm_medium: lead.utm_medium || extracted.utmMedium || null,
          utm_campaign: lead.utm_campaign || extracted.utmCampaign || null,
          meta_event_id: null,
          meta_status: null,
          meta_error_message: null,
          created_at: lead.created_at,
          source: 'legacy_leads',
        };
      });

      const existingKeys = new Set(events.map((event) => event.contact_phone || event.event_id));
      mappedLegacy.forEach((event) => {
        const key = event.contact_phone || event.event_id;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          events.push(event);
        }
      });
    } catch (legacyError) {
      if (legacyError?.code !== '42P01') {
        console.warn('[AtivaCRM Webhook] Não foi possível carregar leads do webhook antigo:', legacyError.message);
      }
    }

    events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json({ success: true, data: events.slice(0, limit), warning });
  } catch (error) {
    console.error('[AtivaCRM Webhook] Erro ao listar eventos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// TEMA DO SISTEMA (cores, logo, nome) — persistido na VPS por domínio (white-label)
// ============================================
// Cada domínio tem sua própria chave; domínios não listados usam a chave padrão.
// Para liberar white-label em um domínio, adicione-o em WHITELABEL_DOMAINS no .env (ex: ativafix.com).
const WHITELABEL_DOMAINS = (process.env.WHITELABEL_DOMAINS || 'ativafix.com,www.ativafix.com,app.ativafix.com')
  .toLowerCase()
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function themeConfigKey(host) {
  if (!host || typeof host !== 'string') return 'theme_config';
  const h = host.toLowerCase().replace(/^www\./, '');
  const normalized = h.replace(/\./g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 64);
  if (!normalized) return 'theme_config';
  const allowed = WHITELABEL_DOMAINS.length === 0 || WHITELABEL_DOMAINS.some((d) => d.replace(/^www\./, '') === h);
  if (!allowed) return 'theme_config';
  // Compatibilidade: ativafix.com e app.ativafix.com usam o mesmo tema (empresa 1 / login)
  if (h === 'ativafix.com' || h === 'app.ativafix.com') return 'theme_config_ativafix';
  return `theme_config_${normalized}`;
}

// GET /api/theme-config — público (login) ou com auth (tema da empresa do usuário)
// Com Authorization: retorna tema da empresa (company_id); senão usa ?host= para tema do domínio
app.get('/api/theme-config', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    let companyId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        const userRow = await pool.query('SELECT company_id FROM users WHERE id = $1', [decoded.id || decoded.userId || decoded.sub]);
        if (userRow.rows[0]?.company_id) companyId = userRow.rows[0].company_id;
      } catch (_) {}
    }
    // 1) Se logado com empresa, buscar tema da empresa
    if (companyId) {
      const companyKey = `theme_config_company_${companyId}`;
      const companyResult = await pool.query('SELECT value FROM kv_store_2c4defad WHERE key = $1', [companyKey]);
      if (companyResult.rows.length > 0 && companyResult.rows[0].value) {
        const val = companyResult.rows[0].value;
        return res.json(typeof val === 'string' ? JSON.parse(val) : val);
      }
    }
    // 2) Sem auth (tela de login): ativafix.com/localhost usam tema da empresa 1 (logo e cores corretos)
    const ADMIN_COMPANY_ID = '00000000-0000-0000-0000-000000000001';
    const adminCompanyKey = `theme_config_company_${ADMIN_COMPANY_ID}`;
    let host = req.query.host;
    if (host == null && req.headers.origin) {
      try {
        host = new URL(req.headers.origin).hostname;
      } catch (_) {}
    }
    const h = (host && host.toLowerCase().replace(/^www\./, '')) || '';
    const isLoginHost = h === 'ativafix.com' || h === 'app.ativafix.com' || h === 'localhost' || h === '127.0.0.1';
    if (isLoginHost) {
      const company1Result = await pool.query('SELECT value FROM kv_store_2c4defad WHERE key = $1', [adminCompanyKey]);
      if (company1Result.rows.length > 0 && company1Result.rows[0].value) {
        const val = company1Result.rows[0].value;
        return res.json(typeof val === 'string' ? JSON.parse(val) : val);
      }
    }
    const key = themeConfigKey(host);
    const result = await pool.query('SELECT value FROM kv_store_2c4defad WHERE key = $1', [key]);
    if (result.rows.length === 0 || !result.rows[0].value) {
      const fallback = await pool.query('SELECT value FROM kv_store_2c4defad WHERE key = $1', [adminCompanyKey]);
      if (fallback.rows.length === 0 || !fallback.rows[0].value) return res.json(null);
      const val = fallback.rows[0].value;
      return res.json(typeof val === 'string' ? JSON.parse(val) : val);
    }
    const value = result.rows[0].value;
    res.json(typeof value === 'string' ? JSON.parse(value) : value);
  } catch (err) {
    console.error('[theme-config] GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/theme-config — salvar tema (autenticado); por empresa (company_id) para que cada empresa tenha suas cores/nome/logo
app.post('/api/theme-config', authenticateToken, requirePermission('admin.config'), async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    const { companyName, logo, logoAlt, colors, navigationVariant } = req.body;
    const companyId = req.companyId || req.user?.company_id;
    if (!companyId) {
      return res.status(403).json({ error: 'Usuário sem empresa vinculada para salvar o tema.' });
    }
    const key = `theme_config_company_${companyId}`;
    const incoming = {
      ...(companyName != null && { companyName: String(companyName).trim() || null }),
      ...(logo != null && { logo: logo === '' ? null : logo }),
      ...(logoAlt != null && { logoAlt: String(logoAlt).trim() || null }),
      ...(navigationVariant != null && {
        navigationVariant: navigationVariant === 'miui' ? 'miui' : 'default',
      }),
      ...(colors && typeof colors === 'object' && {
        colors: {
          ...(colors.primary != null && { primary: String(colors.primary).trim() }),
          ...(colors.sidebar != null && { sidebar: String(colors.sidebar).trim() }),
          ...(colors.button != null && { button: String(colors.button).trim() }),
        },
      }),
    };
    const existing = await pool.query('SELECT value FROM kv_store_2c4defad WHERE key = $1', [key]);
    const prev = existing.rows.length > 0 && existing.rows[0].value
      ? (typeof existing.rows[0].value === 'string' ? JSON.parse(existing.rows[0].value) : existing.rows[0].value)
      : {};
    const merged = {
      ...prev,
      ...incoming,
      colors: incoming.colors ? { ...(prev.colors || {}), ...incoming.colors } : (prev.colors || undefined),
    };
    if (merged.colors && Object.keys(merged.colors).length === 0) merged.colors = undefined;
    await pool.query(
      `INSERT INTO kv_store_2c4defad (key, value) VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = $2::jsonb`,
      [key, JSON.stringify(merged)]
    );
    res.json({ success: true, config: merged });
  } catch (err) {
    console.error('[theme-config] POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ENDPOINT DE STORAGE - UPLOAD DE ARQUIVOS
// ============================================

// POST /api/storage/upload
app.post('/api/storage/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo não fornecido' });
    }

    const { bucket, path, cacheControl, upsert, contentType } = req.body;
    
    // Usar path fornecido ou nome do arquivo
    const filePath = path || req.file.filename;
    
    // Construir URL pública
    // STORAGE_BASE_URL é opcional - se não definido, usa localhost
    // Em produção, configure STORAGE_BASE_URL no .env para sua URL pública
    // Exemplo: STORAGE_BASE_URL=https://api.ativafix.com/uploads
    const baseUrl = process.env.STORAGE_BASE_URL || `http://localhost:${PORT}/uploads`;
    const publicUrl = `${baseUrl}/${req.file.filename}`;

    console.log('[API] Upload realizado:', {
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: filePath,
      size: req.file.size,
      bucket
    });

    res.json({
      url: publicUrl,
      path: filePath
    });
  } catch (error) {
    console.error('[API] Erro no upload:', error);
    res.status(500).json({ error: error.message || 'Erro ao fazer upload' });
  }
});

// Servir arquivos estáticos da pasta uploads
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// ============================================
// FUNCTIONS - ADMINISTRAÇÃO DE USUÁRIOS
// ============================================

// Middleware para verificar se usuário é admin
const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Buscar role do usuário
    const result = await pool.query(
      'SELECT role FROM profiles WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem executar esta ação.' });
    }
    
    next();
  } catch (error) {
    console.error('[API] Erro ao verificar permissões:', error);
    res.status(500).json({ error: 'Erro ao verificar permissões' });
  }
};

// POST /api/functions/admin-get-user
app.post('/api/functions/admin-get-user', authenticateToken, requirePermission('admin.users'), async (req, res) => {
  try {
    const userId = req.body?.userId || req.body?.body?.userId;

    if (!userId) {
      return res.status(400).json({ error: 'userId é obrigatório' });
    }

    // Buscar usuário na tabela users
    const userResult = await pool.query(
      'SELECT id, email, email_verified, created_at FROM users WHERE id = $1',
      [userId]
    );

    // Buscar profile
    const profileResult = await pool.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [userId]
    );

    const profile = profileResult.rows[0] || null;

    // Se não existir em users, ainda assim retornar o profile (evita quebrar UI por dados órfãos)
    const user = userResult.rows[0] || null;

    res.json({
      data: {
        user,
        profile
      }
    });
  } catch (error) {
    console.error('[API] Erro ao buscar usuário:', error);
    res.status(500).json({ error: error.message || 'Erro ao buscar usuário' });
  }
});

// POST /api/functions/admin-update-user
app.post('/api/functions/admin-update-user', authenticateToken, requirePermission('admin.users'), async (req, res) => {
  try {
    const rawBody = req.body?.body && typeof req.body.body === 'object' ? req.body.body : req.body;
    const { userId, email, password } = rawBody || {};

    if (!userId) {
      return res.status(400).json({ error: 'userId é obrigatório' });
    }

    // Verificar se usuário existe
    const userResult = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    // Atualizar email se fornecido
    if (email !== undefined) {
      // Verificar se email já existe
      const emailCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email.toLowerCase().trim(), userId]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Este email já está em uso por outro usuário' });
      }

      updates.push(`email = $${paramIndex}`);
      values.push(email.toLowerCase().trim());
      paramIndex++;
    }

    // Atualizar senha se fornecida
    if (password !== undefined && password.trim() !== '') {
      if (password.length < 6) {
        return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramIndex}`);
      values.push(passwordHash);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const sql = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, email_verified, created_at
    `;

    const result = await pool.query(sql, values);

    console.log('[API] Usuário atualizado:', { userId, updatedFields: updates.length });

    res.json({
      data: {
        success: true,
        user: result.rows[0]
      }
    });
  } catch (error) {
    console.error('[API] Erro ao atualizar usuário:', error);
    res.status(500).json({ error: error.message || 'Erro ao atualizar usuário' });
  }
});

// POST /api/functions/admin-delete-user
app.post('/api/functions/admin-delete-user', authenticateToken, requirePermission('admin.users'), async (req, res) => {
  const quoteIdent = (ident) => `"${String(ident).replace(/"/g, '""')}"`;
  try {
    const userId = req.body?.userId || req.body?.body?.userId;

    if (!userId) {
      return res.status(400).json({ error: 'userId é obrigatório' });
    }

    console.log('[API] Tentando deletar usuário:', userId);

    // Verificar se é o próprio usuário (não permitir auto-deleção)
    if (req.user.id === userId) {
      return res.status(400).json({ error: 'Você não pode deletar seu próprio usuário' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verificar se existe em profiles ou users
      const profileResult = await client.query('SELECT user_id FROM profiles WHERE user_id = $1', [userId]);
      const userResult = await client.query('SELECT id, email FROM users WHERE id = $1', [userId]);
      if (profileResult.rows.length === 0 && userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Reatribuição obrigatória para entidades de caixa:
      // algumas bases mantêm operador_id como NOT NULL e/ou FK com ON DELETE SET NULL.
      // Sem reatribuir, a exclusão do usuário falha por violação de constraint.
      let fallbackOperatorId = req.user?.id;
      if (!fallbackOperatorId || fallbackOperatorId === userId) {
        const fallbackUser = await client.query(
          `SELECT id
           FROM users
           WHERE id <> $1
           ORDER BY created_at ASC
           LIMIT 1`,
          [userId]
        );
        fallbackOperatorId = fallbackUser.rows[0]?.id || null;
      }

      if (fallbackOperatorId && fallbackOperatorId !== userId) {
        await client.query(
          'UPDATE cash_movements SET operador_id = $1 WHERE operador_id = $2',
          [fallbackOperatorId, userId]
        );
        await client.query(
          'UPDATE cash_register_sessions SET operador_id = $1 WHERE operador_id = $2',
          [fallbackOperatorId, userId]
        );
      }

      // Segurança adicional: se ainda restarem movimentos com o operador a excluir,
      // interrompe com mensagem clara para evitar erro de NOT NULL no DELETE.
      const pendingCashRefs = await client.query(
        'SELECT COUNT(*)::int AS total FROM cash_movements WHERE operador_id = $1',
        [userId]
      ).catch(() => ({ rows: [{ total: 0 }] }));
      const pendingCashTotal = pendingCashRefs.rows[0]?.total || 0;
      if (pendingCashTotal > 0) {
        throw new Error(
          `Não foi possível reatribuir ${pendingCashTotal} movimentos de caixa do usuário. Exclua/feche os caixas desse operador antes de excluir o usuário.`
        );
      }

      // Descobrir todas as FKs que apontam para users(id) e limpar referências automaticamente.
      // Estratégia: se coluna aceita NULL -> UPDATE para NULL; caso contrário -> DELETE da linha referenciada.
      const fkRefs = await client.query(`
        SELECT
          tc.table_name,
          kcu.column_name,
          cols.is_nullable,
          tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
         AND ccu.table_schema = tc.table_schema
        JOIN information_schema.columns cols
          ON cols.table_schema = tc.table_schema
         AND cols.table_name = tc.table_name
         AND cols.column_name = kcu.column_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND ccu.table_name = 'users'
          AND ccu.column_name = 'id'
        ORDER BY tc.table_name, kcu.column_name
      `);

      const cleanupWarnings = [];
      for (const ref of fkRefs.rows) {
        const table = ref.table_name;
        const column = ref.column_name;
        if (table === 'users') continue;

        try {
          // Tabela de caixa: nunca zerar operador_id (NOT NULL em várias bases).
          if (
            (table === 'cash_movements' || table === 'cash_register_sessions') &&
            column === 'operador_id'
          ) {
            continue;
          }

          // Se coluna permite NULL, só então aplicamos SET NULL.
          if (ref.is_nullable === 'YES') {
            await client.query(
              `UPDATE public.${quoteIdent(table)} SET ${quoteIdent(column)} = NULL WHERE ${quoteIdent(column)} = $1`,
              [userId]
            );
          } else {
            // Coluna NOT NULL: evitar apagar histórico financeiro crítico.
            // Para caixa, preferimos manter dados e já reatribuímos operador_id acima.
            // Para demais tabelas, tentamos DELETE como fallback.
            if (table !== 'cash_movements' && table !== 'cash_register_sessions') {
              await client.query(
                `DELETE FROM public.${quoteIdent(table)} WHERE ${quoteIdent(column)} = $1`,
                [userId]
              );
            }
          }
        } catch (cleanupError) {
          cleanupWarnings.push({
            table,
            column,
            message: cleanupError?.message || 'erro ao limpar referência'
          });
        }
      }

      // Garantia extra para tabelas mais comuns do domínio
      await client.query('DELETE FROM profiles WHERE user_id = $1', [userId]).catch(() => {});
      await client.query('DELETE FROM user_permissions WHERE user_id = $1', [userId]).catch(() => {});
      await client.query('DELETE FROM user_position_departments WHERE user_id = $1', [userId]).catch(() => {});

      // Não fazer DELETE físico em users:
      // algumas bases têm FK ON DELETE SET NULL para cash_movements.operador_id (NOT NULL),
      // o que torna a remoção física inconsistente.
      // Estratégia definitiva: arquivar usuário (anonimiza + remove company_id).
      let usedArchiveFallback = false;
      if (userResult.rows.length > 0) {
        const archivedEmail = `deleted_${userId}_${Date.now()}@arquivado.local`;
        await client.query(
          `UPDATE users
           SET email = $1,
               company_id = NULL
           WHERE id = $2`,
          [archivedEmail, userId]
        );
        usedArchiveFallback = true;
      }

      await client.query('COMMIT');
      console.log('[API] Usuário deletado com sucesso:', {
        userId,
        email: userResult.rows[0]?.email || null,
        cleanupWarnings: cleanupWarnings.length,
        archived: usedArchiveFallback
      });

      if (cleanupWarnings.length > 0) {
        console.warn('[API] Limpeza com avisos durante exclusão de usuário:', cleanupWarnings.slice(0, 5));
      }
    } catch (txError) {
      await client.query('ROLLBACK').catch(() => {});
      throw txError;
    } finally {
      client.release();
    }

    res.json({
      data: {
        success: true,
        message: 'Usuário deletado com sucesso'
      }
    });
  } catch (error) {
    console.error('[API] Erro ao deletar usuário:', error);
    
    // Verificar se é erro de foreign key
    if (error.code === '23503') {
      return res.status(400).json({ 
        error: 'Não é possível deletar este usuário pois ele possui registros relacionados. Detalhes: ' + error.detail,
        warning: true
      });
    }

    res.status(500).json({ error: error.message || 'Erro ao deletar usuário' });
  }
});

// ============================================
// FUNCTIONS - DISC TEST
// ============================================

// POST /api/functions/disc-answer
app.post('/api/functions/disc-answer', authenticateToken, async (req, res) => {
  try {
    const { sessionId, questionId, selectedType, idempotencyKey } = req.body;

    if (!sessionId || !questionId || !selectedType) {
      return res.status(400).json({ error: 'sessionId, questionId e selectedType são obrigatórios' });
    }

    if (!['D', 'I', 'S', 'C'].includes(selectedType)) {
      return res.status(400).json({ error: 'selectedType deve ser D, I, S ou C' });
    }

    // Buscar sessão de teste
    const sessionResult = await pool.query(
      'SELECT * FROM candidate_responses WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sessão de teste não encontrada' });
    }

    const session = sessionResult.rows[0];

    // Verificar se já está completo
    if (session.is_completed) {
      return res.status(409).json({ error: 'Teste já foi finalizado' });
    }

    // Carregar respostas existentes
    let responses = [];
    if (session.responses) {
      try {
        responses = typeof session.responses === 'string' 
          ? JSON.parse(session.responses) 
          : session.responses;
      } catch (e) {
        responses = [];
      }
    }

    // Remover resposta anterior para esta questão (evitar duplicatas)
    responses = responses.filter((r) => r.questionId !== questionId);

    // Adicionar nova resposta
    responses.push({
      questionId,
      selectedType
    });

    // Atualizar no banco
    await pool.query(
      'UPDATE candidate_responses SET responses = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(responses), sessionId]
    );

    console.log('[API] Resposta DISC salva:', { sessionId, questionId, selectedType });

    res.json({
      data: {
        success: true,
        sessionId,
        questionId,
        selectedType,
        totalResponses: responses.length
      }
    });
  } catch (error) {
    console.error('[API] Erro ao salvar resposta DISC:', error);
    res.status(500).json({ error: error.message || 'Erro ao salvar resposta' });
  }
});

// POST /api/functions/disc-finish
app.post('/api/functions/disc-finish', authenticateToken, async (req, res) => {
  try {
    const { testSessionId } = req.body;

    if (!testSessionId) {
      return res.status(400).json({ error: 'testSessionId é obrigatório' });
    }

    // Buscar sessão de teste
    const sessionResult = await pool.query(
      'SELECT * FROM candidate_responses WHERE id = $1',
      [testSessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sessão de teste não encontrada' });
    }

    const session = sessionResult.rows[0];

    // Verificar se já está completo (idempotência)
    if (session.is_completed) {
      return res.status(409).json({ 
        error: 'ALREADY_FINISHED',
        message: 'Teste já foi finalizado',
        resultId: session.id
      });
    }

    // Carregar respostas
    let responses = [];
    if (session.responses) {
      try {
        responses = typeof session.responses === 'string' 
          ? JSON.parse(session.responses) 
          : session.responses;
      } catch (e) {
        responses = [];
      }
    }

    // Calcular scores DISC
    const scores = {
      d: 0,
      i: 0,
      s: 0,
      c: 0
    };

    responses.forEach((r) => {
      if (r.selectedType === 'D') scores.d++;
      else if (r.selectedType === 'I') scores.i++;
      else if (r.selectedType === 'S') scores.s++;
      else if (r.selectedType === 'C') scores.c++;
    });

    // Determinar perfil dominante
    const maxScore = Math.max(scores.d, scores.i, scores.s, scores.c);
    let dominantProfile = 'BALANCED';
    if (maxScore === scores.d) dominantProfile = 'D';
    else if (maxScore === scores.i) dominantProfile = 'I';
    else if (maxScore === scores.s) dominantProfile = 'S';
    else if (maxScore === scores.c) dominantProfile = 'C';

    // Atualizar sessão como completa e salvar scores
    await pool.query(
      `UPDATE candidate_responses 
       SET is_completed = true, 
           d_score = $1, 
           i_score = $2, 
           s_score = $3, 
           c_score = $4,
           dominant_profile = $5,
           completion_date = NOW(),
           updated_at = NOW()
       WHERE id = $6`,
      [scores.d, scores.i, scores.s, scores.c, dominantProfile, testSessionId]
    );

    console.log('[API] Teste DISC finalizado:', { 
      testSessionId, 
      scores, 
      dominantProfile 
    });

    res.json({
      data: {
        success: true,
        resultId: testSessionId,
        scores,
        dominantProfile
      }
    });
  } catch (error) {
    console.error('[API] Erro ao finalizar teste DISC:', error);
    res.status(500).json({ error: error.message || 'Erro ao finalizar teste' });
  }
});

// POST /api/functions/disc-session-status
app.post('/api/functions/disc-session-status', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId é obrigatório' });
    }

    // Buscar sessão de teste
    const sessionResult = await pool.query(
      'SELECT id, is_completed, d_score, i_score, s_score, c_score, dominant_profile FROM candidate_responses WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sessão de teste não encontrada' });
    }

    const session = sessionResult.rows[0];

    if (session.is_completed) {
      res.json({
        data: {
          status: 'FINISHED',
          resultId: session.id,
          scores: {
            d: session.d_score || 0,
            i: session.i_score || 0,
            s: session.s_score || 0,
            c: session.c_score || 0
          },
          dominantProfile: session.dominant_profile
        }
      });
    } else {
      res.json({
        data: {
          status: 'IN_PROGRESS'
        }
      });
    }
  } catch (error) {
    console.error('[API] Erro ao verificar status da sessão DISC:', error);
    res.status(500).json({ error: error.message || 'Erro ao verificar status' });
  }
});

// POST /api/functions/analyze-candidate - Analisar candidato com IA
app.post('/api/functions/analyze-candidate', authenticateToken, async (req, res) => {
  try {
    const { job_response_id, survey_id, candidate_data, job_data } = req.body;

    if (!job_response_id || !survey_id || !candidate_data || !job_data) {
      return res.status(400).json({ error: 'job_response_id, survey_id, candidate_data e job_data são obrigatórios' });
    }

    // Buscar API key da OpenAI do banco (por empresa)
    const integrationKey = req.companyId ? `integration_settings_${req.companyId}` : 'integration_settings';
    const tokenResult = await pool.query(
      `SELECT value FROM kv_store_2c4defad WHERE key = $1`,
      [integrationKey]
    );

    let openaiApiKey = null;
    let openaiModel = 'gpt-4o-mini';
    if (tokenResult.rows.length > 0 && tokenResult.rows[0].value) {
      const value = tokenResult.rows[0].value;
      // value pode ser JSONB (objeto) ou string JSON
      const settings = typeof value === 'string' ? JSON.parse(value) : value;
      openaiApiKey = settings.aiApiKey;
      const configuredModel = settings.aiModel || 'gpt-4o-mini';
      if (VALID_OPENAI_MODELS.includes(configuredModel)) {
        openaiModel = configuredModel;
      } else {
        console.warn(`[Analyze Candidate] Modelo inválido '${configuredModel}' configurado. Usando fallback 'gpt-4o-mini'.`);
        openaiModel = 'gpt-4o-mini';
      }
      console.log('[Analyze Candidate] Configurações carregadas:', { hasApiKey: !!openaiApiKey, model: openaiModel });
    } else {
      console.log('[Analyze Candidate] Nenhuma configuração encontrada no banco');
    }

    if (!openaiApiKey) {
      return res.status(400).json({ 
        error: 'API Key da OpenAI não configurada',
        message: 'Configure a API Key em Integrações > OpenAI'
      });
    }

    // Construir prompt para análise
    const discInfo = candidate_data.disc_profile ? `
Perfil DISC:
- Dominante (D): ${candidate_data.disc_profile.d_score || 0}/20
- Influente (I): ${candidate_data.disc_profile.i_score || 0}/20
- Estável (S): ${candidate_data.disc_profile.s_score || 0}/20
- Cauteloso (C): ${candidate_data.disc_profile.c_score || 0}/20
- Perfil Dominante: ${candidate_data.disc_profile.dominant_profile || 'BALANCED'}
` : '';

    const responsesText = candidate_data.responses && typeof candidate_data.responses === 'object' 
      ? Object.entries(candidate_data.responses)
          .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
          .join('\n')
      : String(candidate_data.responses || '');

    const prompt = `Analise o seguinte candidato para a vaga "${job_data.position_title || job_data.title}" e forneça uma análise detalhada em formato JSON.

DADOS DA VAGA:
Título: ${job_data.title || job_data.position_title}
Descrição: ${job_data.description || 'Não informado'}
Requisitos: ${Array.isArray(job_data.requirements) ? job_data.requirements.join(', ') : job_data.requirements || 'Não informado'}
Modalidade: ${job_data.work_modality || 'Não informado'}
Tipo de Contrato: ${job_data.contract_type || 'Não informado'}

DADOS DO CANDIDATO:
Nome: ${candidate_data.name || 'Não informado'}
Idade: ${candidate_data.age || 'Não informado'}
Email: ${candidate_data.email || 'Não informado'}
Telefone: ${candidate_data.phone || 'Não informado'}
${discInfo}
Respostas do Questionário:
${responsesText}

INSTRUÇÕES:
Analise o candidato e retorne APENAS um JSON válido (sem markdown, sem texto adicional) com a seguinte estrutura:
{
  "score_geral": número de 0 a 100,
  "recomendacao": "APROVADO" ou "REPROVADO" ou "ANÁLISE_MANUAL",
  "justificativa": "texto explicando a recomendação",
  "chances_sucesso": número de 0 a 100 (porcentagem),
  "comprometimento": número de 0 a 100 (porcentagem),
  "area_recomendada": "nome da área/função recomendada",
  "perfil_comportamental": "análise detalhada do perfil comportamental baseado no DISC e respostas",
  "experiencia": "análise da experiência e qualificações",
  "pontos_fortes": ["ponto 1", "ponto 2", "ponto 3"],
  "pontos_fracos": ["ponto 1", "ponto 2"],
  "recomendacoes": "recomendações específicas para este candidato"
}`;

    // Chamar API da OpenAI
    console.log('[Analyze Candidate] Chamando OpenAI API com modelo:', openaiModel);
    
    // Modelos que requerem max_completion_tokens ao invés de max_tokens
    const modelsRequiringCompletionTokens = ['gpt-4o', 'gpt-4o-mini', 'o1', 'o1-mini', 'o1-preview', 'o3-mini', 'gpt-5', 'gpt-5.1', 'gpt-5.2'];
    const requiresCompletionTokens = modelsRequiringCompletionTokens.some(m => openaiModel.includes(m));
    
    // Modelos que só aceitam temperature = 1 (o1, o3, gpt-5)
    const modelsRequiringTemp1 = ['o1', 'o1-mini', 'o1-preview', 'o3', 'o3-mini', 'gpt-5'];
    const requiresTemp1 = modelsRequiringTemp1.some(m => openaiModel.includes(m));
    
    const requestBody = {
      model: openaiModel,
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em recrutamento e seleção. Analise candidatos de forma objetiva e profissional, fornecendo análises detalhadas em formato JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: requiresTemp1 ? 1 : 0.7
    };
    
    // Usar max_completion_tokens para modelos mais novos, max_tokens para modelos antigos
    if (requiresCompletionTokens) {
      requestBody.max_completion_tokens = 2000;
    } else {
      requestBody.max_tokens = 2000;
    }
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      let errorData = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText };
      }
      console.error('[OpenAI] Erro na API:', openaiResponse.status, errorData);
      return res.status(500).json({ 
        error: 'Erro ao chamar API da OpenAI',
        details: errorData.error?.message || errorData.message || 'Erro desconhecido',
        status: openaiResponse.status
      });
    }

    const openaiData = await openaiResponse.json();
    const rawAnalysis = openaiData.choices[0]?.message?.content || '';

    // Tentar parsear o JSON da resposta
    let analysisData = {};
    try {
      // Remover markdown code blocks se existirem
      const jsonText = rawAnalysis.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysisData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[OpenAI] Erro ao parsear JSON:', parseError);
      // Se não conseguir parsear, criar análise básica
      analysisData = {
        score_geral: 50,
        recomendacao: 'ANÁLISE_MANUAL',
        justificativa: 'Erro ao processar análise da IA. Análise manual necessária.',
        chances_sucesso: 50,
        comprometimento: 50,
        area_recomendada: 'Não definida',
        perfil_comportamental: rawAnalysis.substring(0, 500),
        experiencia: 'Análise não disponível',
        pontos_fortes: [],
        pontos_fracos: [],
        recomendacoes: ''
      };
    }

    // Buscar company_id do job_response
    const jobResponseResult = await pool.query(
      'SELECT company_id FROM job_responses WHERE id = $1',
      [job_response_id]
    );
    
    const companyId = jobResponseResult.rows[0]?.company_id || '00000000-0000-0000-0000-000000000001';

    // Usar UPSERT (INSERT ... ON CONFLICT ... DO UPDATE) para lidar com a constraint UNIQUE em job_response_id
    await pool.query(
      `INSERT INTO job_candidate_ai_analysis (job_response_id, survey_id, company_id, analysis_data, raw_analysis)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (job_response_id) 
       DO UPDATE SET 
         analysis_data = EXCLUDED.analysis_data,
         raw_analysis = EXCLUDED.raw_analysis,
         company_id = EXCLUDED.company_id,
         updated_at = NOW()`,
      [job_response_id, survey_id, companyId, JSON.stringify(analysisData), rawAnalysis]
    );

    console.log('[Analyze Candidate] Análise salva com sucesso para:', job_response_id);

    // Retornar dados no formato esperado pelo frontend
    res.json({
      data: {
        score: analysisData.score_geral || 0,
        recommendation: analysisData.recomendacao || 'ANÁLISE_MANUAL',
        analysis: analysisData
      }
    });
  } catch (error) {
    console.error('[Analyze Candidate] Erro:', error);
    res.status(500).json({ error: error.message || 'Erro ao analisar candidato' });
  }
});

// POST /api/functions/generate-interview-questions - Gerar perguntas de entrevista com IA
app.post('/api/functions/generate-interview-questions', authenticateToken, async (req, res) => {
  try {
    // Pode vir como body.body (se chamado com { body: {...} }) ou diretamente no req.body
    const requestData = req.body.body || req.body;
    const { job_response_id, survey_id, interview_type, ai_analysis } = requestData;

    if (!job_response_id || !survey_id) {
      return res.status(400).json({ error: 'job_response_id e survey_id são obrigatórios' });
    }

    // Buscar API key da OpenAI do banco (por empresa)
    const integrationKey = req.companyId ? `integration_settings_${req.companyId}` : 'integration_settings';
    const tokenResult = await pool.query(
      `SELECT value FROM kv_store_2c4defad WHERE key = $1`,
      [integrationKey]
    );

    let openaiApiKey = null;
    let openaiModel = 'gpt-4o-mini';
    if (tokenResult.rows.length > 0 && tokenResult.rows[0].value) {
      const value = tokenResult.rows[0].value;
      const settings = typeof value === 'string' ? JSON.parse(value) : value;
      openaiApiKey = settings.aiApiKey;
      const configuredModel = settings.aiModel || 'gpt-4o-mini';
      if (VALID_OPENAI_MODELS.includes(configuredModel)) {
        openaiModel = configuredModel;
      } else {
        console.warn(`[Generate Interview Questions] Modelo inválido '${configuredModel}' configurado. Usando fallback 'gpt-4o-mini'.`);
        openaiModel = 'gpt-4o-mini';
      }
      console.log('[Generate Interview Questions] Configurações carregadas:', { hasApiKey: !!openaiApiKey, model: openaiModel });
    }

    if (!openaiApiKey) {
      return res.status(400).json({ 
        error: 'API Key da OpenAI não configurada',
        message: 'Configure a API Key em Integrações > OpenAI'
      });
    }

    // Buscar dados do candidato e da vaga (com filtro de company_id para segurança)
    const jobResponseResult = await pool.query(
      'SELECT * FROM job_responses WHERE id = $1 AND company_id = $2',
      [job_response_id, req.companyId || '00000000-0000-0000-0000-000000000001']
    );

    const jobSurveyResult = await pool.query(
      'SELECT * FROM job_surveys WHERE id = $1 AND company_id = $2',
      [survey_id, req.companyId || '00000000-0000-0000-0000-000000000001']
    );

    if (jobResponseResult.rows.length === 0 || jobSurveyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Candidato ou vaga não encontrados' });
    }

    const candidate = jobResponseResult.rows[0];
    const jobSurvey = jobSurveyResult.rows[0];

    // Construir prompt para gerar perguntas
    const interviewTypeText = interview_type === 'online' ? 'online (remota)' : 'presencial';
    const analysisText = ai_analysis ? `
Análise de IA do candidato:
- Score Geral: ${ai_analysis.score_geral || 'N/A'}/100
- Recomendação: ${ai_analysis.recomendacao || 'N/A'}
- Justificativa: ${ai_analysis.justificativa || 'N/A'}
- Perfil Comportamental: ${ai_analysis.perfil_comportamental || 'N/A'}
- Pontos Fortes: ${Array.isArray(ai_analysis.pontos_fortes) ? ai_analysis.pontos_fortes.join(', ') : 'N/A'}
- Pontos Fracos: ${Array.isArray(ai_analysis.pontos_fracos) ? ai_analysis.pontos_fracos.join(', ') : 'N/A'}
` : 'Análise de IA não disponível.';

    const prompt = `Você é um especialista em recrutamento e seleção. Gere perguntas personalizadas de entrevista para o candidato abaixo.

DADOS DA VAGA:
Título: ${jobSurvey.position_title || jobSurvey.title}
Descrição: ${jobSurvey.description || 'Não informado'}
Requisitos: ${Array.isArray(jobSurvey.requirements) ? jobSurvey.requirements.join(', ') : jobSurvey.requirements || 'Não informado'}

DADOS DO CANDIDATO:
Nome: ${candidate.name || 'Não informado'}
Idade: ${candidate.age || 'Não informado'}
Email: ${candidate.email || 'Não informado'}

${analysisText}

TIPO DE ENTREVISTA: ${interviewTypeText}

INSTRUÇÕES:
Gere de 5 a 8 perguntas personalizadas e relevantes para esta entrevista, baseadas nos dados da vaga, do candidato e na análise de IA (se disponível).
As perguntas devem ser:
- Específicas e direcionadas ao perfil do candidato
- Relevantes para a vaga
- Profissionais e apropriadas para uma entrevista de emprego
- Variadas (técnicas, comportamentais, situacionais)

Retorne APENAS um JSON válido (sem markdown, sem texto adicional) com a seguinte estrutura:
{
  "questions": [
    {
      "id": "q1",
      "question": "Texto da pergunta",
      "category": "técnica" ou "comportamental" ou "situacional"
    },
    ...
  ]
}`;

    // Chamar API da OpenAI
    console.log('[Generate Interview Questions] Chamando OpenAI API com modelo:', openaiModel);
    
    // Modelos que requerem max_completion_tokens ao invés de max_tokens
    const modelsRequiringCompletionTokens = ['gpt-4o', 'gpt-4o-mini', 'o1', 'o1-mini', 'o1-preview', 'o3-mini', 'gpt-5', 'gpt-5.1', 'gpt-5.2'];
    const requiresCompletionTokens = modelsRequiringCompletionTokens.some(m => openaiModel.includes(m));
    
    // Modelos que só aceitam temperature = 1 (o1, o3, gpt-5)
    const modelsRequiringTemp1 = ['o1', 'o1-mini', 'o1-preview', 'o3', 'o3-mini', 'gpt-5'];
    const requiresTemp1 = modelsRequiringTemp1.some(m => openaiModel.includes(m));
    
    const requestBody = {
      model: openaiModel,
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em recrutamento e seleção. Gere perguntas de entrevista personalizadas e profissionais em formato JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: requiresTemp1 ? 1 : 0.7
    };
    
    if (requiresCompletionTokens) {
      requestBody.max_completion_tokens = 2000;
    } else {
      requestBody.max_tokens = 2000;
    }
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      let errorData = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText };
      }
      console.error('[OpenAI] Erro na API:', openaiResponse.status, errorData);
      return res.status(500).json({ 
        error: 'Erro ao chamar API da OpenAI',
        details: errorData.error?.message || errorData.message || 'Erro desconhecido',
        status: openaiResponse.status
      });
    }

    const openaiData = await openaiResponse.json();
    const rawResponse = openaiData.choices[0]?.message?.content || '';

    if (!rawResponse || rawResponse.trim() === '') {
      console.error('[OpenAI] Resposta vazia da API. Modelo:', openaiModel, 'Response:', JSON.stringify(openaiData));
      return res.status(500).json({ 
        error: 'A IA não retornou dados',
        details: `O modelo ${openaiModel} retornou resposta vazia. Verifique se o modelo está correto ou tente usar 'gpt-4o' ou 'gpt-4o-mini'.`
      });
    }

    let questionsData = { questions: [] };
    try {
      const jsonText = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      questionsData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[OpenAI] Erro ao parsear JSON:', parseError, 'Raw:', rawResponse.substring(0, 500));
      return res.status(500).json({ 
        error: 'Erro ao processar resposta da IA',
        details: `A IA não retornou um formato JSON válido. Modelo: ${openaiModel}. Verifique se o modelo está correto.`
      });
    }

    // Garantir que questions seja um array
    if (!Array.isArray(questionsData.questions)) {
      questionsData.questions = [];
    }

    console.log('[Generate Interview Questions] Perguntas geradas:', questionsData.questions.length);

    res.json({
      questions: questionsData.questions
    });
  } catch (error) {
    console.error('[Generate Interview Questions] Erro:', error);
    res.status(500).json({ error: error.message || 'Erro ao gerar perguntas de entrevista' });
  }
});

// POST /api/functions/generate-dynamic-questions - Gerar perguntas dinâmicas para formulários de vagas
app.post('/api/functions/generate-dynamic-questions', authenticateToken, async (req, res) => {
  try {
    const { survey, base_questions, provider, apiKey, model } = req.body;

    if (!survey || !survey.title) {
      return res.status(400).json({ error: 'Dados da vaga (survey) são obrigatórios' });
    }

    // Buscar API key da OpenAI do banco de dados (se não fornecida)
    let openaiApiKey = apiKey;
    let openaiModel = model || 'gpt-4o-mini';
    
    if (!openaiApiKey) {
      const tokenResult = await pool.query(`
        SELECT value FROM kv_store_2c4defad WHERE key = 'integration_settings'
      `);
      
      if (tokenResult.rows.length > 0 && tokenResult.rows[0].value) {
        const value = tokenResult.rows[0].value;
        const settings = typeof value === 'string' ? JSON.parse(value) : value;
        openaiApiKey = settings.aiApiKey;
        const configuredModel = settings.aiModel || 'gpt-4o-mini';
        if (VALID_OPENAI_MODELS.includes(configuredModel)) {
          openaiModel = configuredModel;
        }
      }
    }

    if (!openaiApiKey) {
      return res.status(400).json({ 
        error: 'API Key da OpenAI não configurada',
        message: 'Configure a API Key em Integrações > OpenAI'
      });
    }

    // Construir prompt
    const baseQuestionsText = Array.isArray(base_questions) && base_questions.length > 0
      ? base_questions.map((q, idx) => `${idx + 1}. ${q.title || q.question || q.text || ''}`).join('\n')
      : 'Nenhuma pergunta base ainda.';

    const prompt = `Você é um especialista em recrutamento e seleção. Gere perguntas personalizadas para o formulário de candidatura da seguinte vaga:

TÍTULO DA VAGA: ${survey.position_title || survey.title}
DESCRIÇÃO: ${survey.description || 'Não informado'}
REQUISITOS: ${Array.isArray(survey.requirements) ? survey.requirements.join(', ') : survey.requirements || 'Não informado'}
DEPARTAMENTO: ${survey.department || 'Não informado'}
MODALIDADE: ${survey.work_modality || 'Não informado'}
TIPO DE CONTRATO: ${survey.contract_type || 'Não informado'}

PERGUNTAS JÁ EXISTENTES NO FORMULÁRIO:
${baseQuestionsText}

INSTRUÇÕES:
Gere 3 a 5 perguntas adicionais personalizadas e relevantes para esta vaga específica. As perguntas devem:
- Ser complementares às perguntas já existentes
- Ser específicas para a vaga e área de atuação
- Variar entre técnicas, comportamentais e situacionais
- Ser adequadas para um formulário de candidatura online

Retorne APENAS um JSON válido (sem markdown, sem texto adicional) com a seguinte estrutura:
{
  "dynamic_questions": [
    {
      "id": "q1",
      "title": "Texto da pergunta",
      "question": "Texto da pergunta (mesmo que title)",
      "description": "Descrição opcional da pergunta",
      "type": "textarea",
      "required": true,
      "options": []
    },
    ...
  ]
}`;

    // Modelos que requerem max_completion_tokens
    const modelsRequiringCompletionTokens = ['gpt-4o', 'gpt-4o-mini', 'o1', 'o1-mini', 'o1-preview', 'o3-mini', 'gpt-5', 'gpt-5.1', 'gpt-5.2'];
    const requiresCompletionTokens = modelsRequiringCompletionTokens.some(m => openaiModel.includes(m));
    
    // Modelos que só aceitam temperature = 1
    const modelsRequiringTemp1 = ['o1', 'o1-mini', 'o1-preview', 'o3', 'o3-mini', 'gpt-5'];
    const requiresTemp1 = modelsRequiringTemp1.some(m => openaiModel.includes(m));
    
    const requestBody = {
      model: openaiModel,
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em recrutamento e seleção. Gere perguntas personalizadas e profissionais para formulários de candidatura em formato JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: requiresTemp1 ? 1 : 0.7
    };
    
    if (requiresCompletionTokens) {
      requestBody.max_completion_tokens = 2000;
    } else {
      requestBody.max_tokens = 2000;
    }
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      let errorData = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText };
      }
      console.error('[OpenAI] Erro na API:', openaiResponse.status, errorData);
      return res.status(500).json({ 
        error: 'Erro ao chamar API da OpenAI',
        details: errorData.error?.message || errorData.message || 'Erro desconhecido',
        status: openaiResponse.status
      });
    }

    const openaiData = await openaiResponse.json();
    const rawResponse = openaiData.choices[0]?.message?.content || '';

    if (!rawResponse || rawResponse.trim() === '') {
      console.error('[OpenAI] Resposta vazia da API. Modelo:', openaiModel, 'Response:', JSON.stringify(openaiData));
      return res.status(500).json({ 
        error: 'A IA não retornou dados',
        details: `O modelo ${openaiModel} retornou resposta vazia. Verifique se o modelo está correto.`
      });
    }

    let questionsData = { dynamic_questions: [] };
    try {
      const jsonText = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      questionsData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[OpenAI] Erro ao parsear JSON:', parseError, 'Raw:', rawResponse.substring(0, 500));
      return res.status(500).json({ 
        error: 'Erro ao processar resposta da IA',
        details: `A IA não retornou um formato JSON válido. Modelo: ${openaiModel}.`
      });
    }

    // Garantir que dynamic_questions seja um array
    if (!Array.isArray(questionsData.dynamic_questions)) {
      questionsData.dynamic_questions = [];
    }

    console.log('[Generate Dynamic Questions] Perguntas geradas:', questionsData.dynamic_questions.length);

    res.json({
      dynamic_questions: questionsData.dynamic_questions
    });
  } catch (error) {
    console.error('[Generate Dynamic Questions] Erro:', error);
    res.status(500).json({ 
      error: 'Erro ao gerar perguntas dinâmicas',
      details: error.message || 'Erro desconhecido'
    });
  }
});

// POST /api/functions/evaluate-interview-transcription - Avaliar transcrição de entrevista com IA
app.post('/api/functions/evaluate-interview-transcription', authenticateToken, async (req, res) => {
  try {
    // Pode vir como body.body (se chamado com { body: {...} }) ou diretamente no req.body
    const requestData = req.body.body || req.body;
    const { interview_id, transcription, interview_type, job_response_id, survey_id, include_profile_analysis } = requestData;

    if (!interview_id || !transcription || !job_response_id || !survey_id) {
      return res.status(400).json({ error: 'interview_id, transcription, job_response_id e survey_id são obrigatórios' });
    }

    // Buscar API key da OpenAI do banco de dados
    const tokenResult = await pool.query(`
      SELECT value FROM kv_store_2c4defad WHERE key = 'integration_settings'
    `);

    let openaiApiKey = null;
    let openaiModel = 'gpt-4o-mini';
    if (tokenResult.rows.length > 0 && tokenResult.rows[0].value) {
      const value = tokenResult.rows[0].value;
      const settings = typeof value === 'string' ? JSON.parse(value) : value;
      openaiApiKey = settings.aiApiKey;
      const configuredModel = settings.aiModel || 'gpt-4o-mini';
      if (VALID_OPENAI_MODELS.includes(configuredModel)) {
        openaiModel = configuredModel;
      } else {
        console.warn(`[Evaluate Interview] Modelo inválido '${configuredModel}' configurado. Usando fallback 'gpt-4o-mini'.`);
        openaiModel = 'gpt-4o-mini';
      }
      console.log('[Evaluate Interview] Configurações carregadas:', { hasApiKey: !!openaiApiKey, model: openaiModel });
    }

    if (!openaiApiKey) {
      return res.status(400).json({ 
        error: 'API Key da OpenAI não configurada',
        message: 'Configure a API Key em Integrações > OpenAI'
      });
    }

    // Buscar dados da entrevista, candidato e vaga (com filtro de company_id para segurança)
    const interviewResult = await pool.query(
      'SELECT * FROM job_interviews WHERE id = $1 AND company_id = $2',
      [interview_id, req.companyId || '00000000-0000-0000-0000-000000000001']
    );

    const jobResponseResult = await pool.query(
      'SELECT * FROM job_responses WHERE id = $1 AND company_id = $2',
      [job_response_id, req.companyId || '00000000-0000-0000-0000-000000000001']
    );

    const jobSurveyResult = await pool.query(
      'SELECT * FROM job_surveys WHERE id = $1 AND company_id = $2',
      [survey_id, req.companyId || '00000000-0000-0000-0000-000000000001']
    );

    if (interviewResult.rows.length === 0 || jobResponseResult.rows.length === 0 || jobSurveyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entrevista, candidato ou vaga não encontrados' });
    }

    const interview = interviewResult.rows[0];
    const candidate = jobResponseResult.rows[0];
    const jobSurvey = jobSurveyResult.rows[0];

    // Buscar análise de IA do candidato (se disponível)
    const aiAnalysisResult = await pool.query(
      'SELECT * FROM job_candidate_ai_analysis WHERE job_response_id = $1 AND company_id = $2 ORDER BY created_at DESC LIMIT 1',
      [job_response_id, req.companyId || '00000000-0000-0000-0000-000000000001']
    );
    const aiAnalysis = aiAnalysisResult.rows.length > 0 ? aiAnalysisResult.rows[0].analysis_data : null;

    // Construir prompt para avaliação
    const analysisText = aiAnalysis ? `
Análise de IA do candidato:
- Score Geral: ${aiAnalysis.score_geral || 'N/A'}/100
- Recomendação: ${aiAnalysis.recomendacao || 'N/A'}
- Justificativa: ${aiAnalysis.justificativa || 'N/A'}
- Perfil Comportamental: ${aiAnalysis.perfil_comportamental || 'N/A'}
- Pontos Fortes: ${Array.isArray(aiAnalysis.pontos_fortes) ? aiAnalysis.pontos_fortes.join(', ') : 'N/A'}
- Pontos Fracos: ${Array.isArray(aiAnalysis.pontos_fracos) ? aiAnalysis.pontos_fracos.join(', ') : 'N/A'}
` : 'Análise de IA não disponível.';

    const profileAnalysisInstruction = include_profile_analysis 
      ? 'Além disso, identifique o perfil comportamental do candidato (DISC: Dominante, Influente, Estável ou Consciente).'
      : '';

    const prompt = `Você é um especialista em recrutamento e seleção. Avalie a transcrição da entrevista abaixo e forneça uma análise completa.

DADOS DA VAGA:
Título: ${jobSurvey.position_title || jobSurvey.title}
Descrição: ${jobSurvey.description || 'Não informado'}
Requisitos: ${Array.isArray(jobSurvey.requirements) ? jobSurvey.requirements.join(', ') : jobSurvey.requirements || 'Não informado'}

DADOS DO CANDIDATO:
Nome: ${candidate.name || 'Não informado'}
Idade: ${candidate.age || 'Não informado'}
Email: ${candidate.email || 'Não informado'}

${analysisText}

TRANSCRIÇÃO DA ENTREVISTA:
${transcription}

TIPO DE ENTREVISTA: ${interview_type === 'online' ? 'Online (remota)' : 'Presencial'}

INSTRUÇÕES:
Avalie a transcrição da entrevista considerando:
- Adequação do candidato à vaga
- Qualidade das respostas
- Clareza de comunicação
- Experiência e conhecimento demonstrados
- Potencial de contribuição para a empresa
${profileAnalysisInstruction}

Retorne APENAS um JSON válido (sem markdown, sem texto adicional) com a seguinte estrutura:
{
  "score": 0-100,
  "recommendation": "approved" ou "rejected" ou "manual_review",
  "justification": "Justificativa detalhada da avaliação",
  "strengths": ["Ponto forte 1", "Ponto forte 2"],
  "weaknesses": ["Ponto fraco 1", "Ponto fraco 2"],
  "candidate_profile": "DISC profile (D, I, S ou C) - apenas se include_profile_analysis for true",
  "summary": "Resumo executivo da avaliação"
}`;

    console.log('[Evaluate Interview] Chamando OpenAI API com modelo:', openaiModel);

    const modelsRequiringTemp1 = ['o1', 'o1-mini', 'o1-preview', 'o3', 'o3-mini', 'gpt-5'];
    const requiresTemp1 = modelsRequiringTemp1.some(m => openaiModel.includes(m));

    const requestBody = {
      model: openaiModel,
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em recrutamento e seleção. Avalie entrevistas e forneça análises profissionais em formato JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: requiresTemp1 ? 1 : 0.7
    };

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      let errorData = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText };
      }
      console.error('[OpenAI] Erro na API (evaluate-interview):', openaiResponse.status, errorData);
      return res.status(500).json({ 
        error: 'Erro ao chamar API da OpenAI',
        details: errorData.error?.message || errorData.message || 'Erro desconhecido',
        status: openaiResponse.status
      });
    }

    const openaiData = await openaiResponse.json();
    const rawResponse = openaiData.choices[0]?.message?.content || '';

    if (!rawResponse || rawResponse.trim() === '') {
      console.error('[OpenAI] Resposta vazia da API (evaluate-interview). Modelo:', openaiModel);
      return res.status(500).json({ 
        error: 'A IA não retornou dados',
        details: `O modelo ${openaiModel} retornou resposta vazia. Verifique se o modelo está correto.`
      });
    }

    let evaluationData = {};
    try {
      const jsonText = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      evaluationData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[OpenAI] Erro ao parsear JSON (evaluate-interview):', parseError, 'Raw:', rawResponse.substring(0, 500));
      return res.status(500).json({ 
        error: 'Erro ao processar resposta da IA',
        details: `A IA não retornou um formato JSON válido. Modelo: ${openaiModel}.`
      });
    }

    // Mapear recommendation para valores permitidos pela constraint CHECK
    // Valores permitidos: 'approved', 'rejected', 'manual_review'
    let aiRecommendation = evaluationData.recommendation || 'manual_review';
    if (aiRecommendation === 'review') {
      aiRecommendation = 'manual_review';
    }
    if (!['approved', 'rejected', 'manual_review'].includes(aiRecommendation)) {
      aiRecommendation = 'manual_review';
    }

    // Atualizar entrevista no banco com a avaliação
    await pool.query(
      `UPDATE job_interviews 
       SET transcription = $1, 
           ai_evaluation = $2, 
           ai_recommendation = $3, 
           ai_score = $4,
           status = 'completed',
           completed_at = NOW()
       WHERE id = $5 AND company_id = $6`,
      [
        transcription,
        evaluationData,
        aiRecommendation,
        evaluationData.score || 0,
        interview_id,
        req.companyId || '00000000-0000-0000-0000-000000000001'
      ]
    );

    console.log('[Evaluate Interview] Avaliação concluída:', evaluationData.recommendation);

    res.json({
      evaluation: {
        score: evaluationData.score || 0,
        recommendation: evaluationData.recommendation || 'review',
        justification: evaluationData.justification || '',
        strengths: evaluationData.strengths || [],
        weaknesses: evaluationData.weaknesses || [],
        candidate_profile: evaluationData.candidate_profile || null,
        summary: evaluationData.summary || ''
      }
    });
  } catch (error) {
    console.error('[Evaluate Interview] Erro:', error);
    res.status(500).json({ error: error.message || 'Erro ao avaliar transcrição da entrevista' });
  }
});

// POST /api/functions/generate-os-with-ai - Gerar Ordem de Serviço a partir de texto livre/transcrição com IA
app.post('/api/functions/generate-os-with-ai', authenticateToken, async (req, res) => {
  try {
    const requestData = req.body?.body || req.body || {};
    const {
      prompt,
      tipo_negocio,
      tipo_aparelho_padrao,
      contexto = {},
    } = requestData;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'O campo "prompt" é obrigatório.' });
    }

    const promptText = String(prompt).trim().slice(0, 6000);
    const isOficina = tipo_negocio === 'oficina_mecanica';

    // Buscar API Key da OpenAI por empresa (mesmo padrão dos demais endpoints de IA)
    const integrationKey = req.companyId ? `integration_settings_${req.companyId}` : 'integration_settings';
    const tokenResult = await pool.query(
      `SELECT value FROM kv_store_2c4defad WHERE key = $1`,
      [integrationKey]
    );

    let openaiApiKey = null;
    let openaiModel = 'gpt-4o-mini';
    if (tokenResult.rows.length > 0 && tokenResult.rows[0].value) {
      const value = tokenResult.rows[0].value;
      const settings = typeof value === 'string' ? JSON.parse(value) : value;
      openaiApiKey = settings.aiApiKey;
      const configuredModel = settings.aiModel || 'gpt-4o-mini';
      if (VALID_OPENAI_MODELS.includes(configuredModel)) {
        openaiModel = configuredModel;
      } else {
        console.warn(`[Generate OS AI] Modelo inválido '${configuredModel}'. Usando fallback 'gpt-4o-mini'.`);
        openaiModel = 'gpt-4o-mini';
      }
    }

    if (!openaiApiKey) {
      return res.status(400).json({
        error: 'API Key da OpenAI não configurada',
        message: 'Configure a API Key em Integrações > OpenAI'
      });
    }

    // Listas de marcas/modelos do sistema (limitadas) para ajudar a IA a escolher exatamente
    const marcasContexto = Array.isArray(contexto.marcas)
      ? contexto.marcas.filter(Boolean).slice(0, 80).join(', ')
      : '';
    const modelosContexto = Array.isArray(contexto.modelos)
      ? contexto.modelos.filter(Boolean).slice(0, 200).join(', ')
      : '';

    const tipoAparelhoSugerido = tipo_aparelho_padrao
      || (isOficina ? 'veiculo' : 'celular');

    const today = new Date();
    const dataHojeISO = today.toISOString().slice(0, 10);

    const sistemaPrompt = isOficina
      ? 'Você é um assistente especialista em oficinas mecânicas e atendimento de clientes. Extraia informações estruturadas a partir da fala/texto livre da atendente para preencher uma Ordem de Serviço.'
      : 'Você é um assistente especialista em assistência técnica de eletrônicos (celulares, tablets, notebooks) e atendimento de clientes. Extraia informações estruturadas a partir da fala/texto livre da atendente para preencher uma Ordem de Serviço.';

    const userPrompt = `Hoje é ${dataHojeISO}. Tipo de negócio: ${isOficina ? 'Oficina Mecânica' : 'Assistência Técnica'}.

Texto livre / transcrição da atendente:
"""
${promptText}
"""

${marcasContexto ? `Marcas cadastradas no sistema (use EXATAMENTE um destes nomes quando houver correspondência razoável): ${marcasContexto}\n` : ''}${modelosContexto ? `Modelos cadastrados no sistema (use EXATAMENTE estes nomes quando houver correspondência razoável; o nome pode incluir a marca à frente): ${modelosContexto}\n` : ''}
INSTRUÇÕES:
- Retorne APENAS um JSON válido (sem markdown, sem texto extra) com o seguinte formato:
{
  "cliente": {
    "nome": "string com nome completo do cliente, em Title Case ou ''",
    "telefone": "string com apenas dígitos do telefone/WhatsApp ou ''",
    "cpf_cnpj": "string com CPF ou CNPJ apenas dígitos ou ''"
  },
  "os": {
    "tipo_aparelho": "${tipoAparelhoSugerido}",
    "marca_nome": "string ou ''",
    "modelo_nome": "string ou ''",
    "imei": "string apenas dígitos ou ''",
    "numero_serie": "string ou ''",
    "cor": "string com PRIMEIRA LETRA MAIÚSCULA (ex.: 'Branco', 'Preto', 'Azul Marinho') ou ''",
    "descricao_problema": "string começando com letra maiúscula, descrevendo o defeito relatado",
    "condicoes_equipamento": "string começando com letra maiúscula, descrevendo condições/observações de entrada",
    "previsao_entrega": "yyyy-mm-dd ou ''",
    "hora_previsao": "HH:mm ou ''",
    "observacoes": "string começando com letra maiúscula ou ''",
    "orcamento_parcelado": número (>=0) ou 0,
    "orcamento_desconto": número (>=0) ou 0,
    "apenas_orcamento": true|false,
    "possui_senha_tipo": "sim" | "nao" | "deslizar" | "nao_sabe" | "nao_autorizou" | "",
    "senha_aparelho": "string com a senha numérica/alfanumérica falada pelo cliente, ou ''"
  },
  "itens_sugeridos": [
    {
      "tipo": "peca" | "servico" | "mao_de_obra",
      "descricao": "string clara, primeira letra maiúscula",
      "quantidade": número (>=1),
      "valor_unitario": número (>=0),
      "desconto": número (>=0),
      "garantia": número em dias (>=0)
    }
  ],
  "alertas": ["string", "..."]
}

REGRAS:
- Não invente dados. Se um campo não foi mencionado claramente, deixe vazio ('') ou 0.
- Em TODOS os campos de texto livre (cor, descricao_problema, condicoes_equipamento, observacoes, descricao de itens, nome do cliente), comece com LETRA MAIÚSCULA. Use capitalização natural — não escreva tudo em CAIXA ALTA, mas garanta a primeira letra de cada frase em maiúscula.
- Cliente: extraia nome, telefone e CPF se forem citados. O nome deve estar em Title Case (ex.: "Elizangela Santos", "João da Silva"). Telefone e CPF: devolva APENAS dígitos (sem máscara, sem espaço, sem "(", "-", ".").
- IMEI: apenas dígitos (15 dígitos quando completo).
- Para datas relativas ("amanhã", "sexta", "em 3 dias"), calcule a partir de ${dataHojeISO} e devolva no formato yyyy-mm-dd.
- Para horários ("às 5 da tarde", "17h", "meio dia"), devolva HH:mm em 24h.
- Senha do aparelho: se o cliente disser uma senha (ex.: "senha 1234", "senha ABC123", "senha é a data de aniversário 1505"), retorne em "senha_aparelho" e marque "possui_senha_tipo": "sim". Se disser "padrão" ou "desenho", marque "deslizar". Se disser "não tem senha" ou "sem senha", marque "nao". Se "não sabe" → "nao_sabe". Se "não quis deixar" → "nao_autorizou". Se nada for mencionado, deixe vazio.
- "orcamento_desconto" representa o valor à vista (dinheiro/PIX). "orcamento_parcelado" representa o valor parcelado (até 6x). Devolva como número decimal puro (ex.: 280.00, NÃO use "R$" nem vírgulas).
- "apenas_orcamento" deve ser true se o cliente vai apenas receber um orçamento, sem deixar o aparelho ainda autorizado.
- Em "itens_sugeridos", inclua peças e serviços citados explicitamente (com valor unitário); se não houver itens claros, devolva [].
- Em "alertas", inclua observações para a atendente revisar (ex.: "Valor não citado, confirmar com cliente.", "Modelo dito como 'iPhone' sem versão — confirmar.").
- A linguagem é português do Brasil.`;

    const modelsRequiringTemp1 = ['o1', 'o1-mini', 'o1-preview', 'o3', 'o3-mini', 'gpt-5'];
    const requiresTemp1 = modelsRequiringTemp1.some(m => openaiModel.includes(m));
    const modelsRequiringCompletionTokens = ['gpt-4o', 'gpt-4o-mini', 'o1', 'o1-mini', 'o1-preview', 'o3-mini', 'gpt-5'];
    const requiresCompletionTokens = modelsRequiringCompletionTokens.some(m => openaiModel.includes(m));

    const requestBody = {
      model: openaiModel,
      messages: [
        { role: 'system', content: sistemaPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: requiresTemp1 ? 1 : 0.3,
    };

    if (requiresCompletionTokens) {
      requestBody.max_completion_tokens = 1500;
    } else {
      requestBody.max_tokens = 1500;
    }

    console.log('[Generate OS AI] Chamando OpenAI:', { model: openaiModel, promptLen: promptText.length });

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      let errorData = {};
      try { errorData = JSON.parse(errorText); } catch { errorData = { message: errorText }; }
      console.error('[OpenAI] Erro na API (generate-os-with-ai):', openaiResponse.status, errorData);
      return res.status(500).json({
        error: 'Erro ao chamar API da OpenAI',
        details: errorData.error?.message || errorData.message || 'Erro desconhecido',
        status: openaiResponse.status,
      });
    }

    const openaiData = await openaiResponse.json();
    const rawContent = openaiData.choices?.[0]?.message?.content || '';

    if (!rawContent.trim()) {
      console.error('[Generate OS AI] Resposta vazia da OpenAI. Modelo:', openaiModel);
      return res.status(500).json({
        error: 'A IA não retornou dados',
        details: `O modelo ${openaiModel} retornou resposta vazia.`,
      });
    }

    let parsed = null;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('[Generate OS AI] Erro ao parsear JSON:', parseError, 'Raw:', rawContent.substring(0, 500));
      return res.status(500).json({
        error: 'Erro ao processar resposta da IA',
        details: 'A IA não retornou um JSON válido. Tente novamente.',
      });
    }

    // Helpers de capitalização
    const capitalizeFirst = (s) => {
      if (!s || typeof s !== 'string') return '';
      const trimmed = s.trim();
      if (!trimmed) return '';
      return trimmed.charAt(0).toLocaleUpperCase('pt-BR') + trimmed.slice(1);
    };
    const capitalizeFirstOfSentences = (s) => {
      if (!s || typeof s !== 'string') return '';
      const trimmed = s.trim();
      if (!trimmed) return '';
      // Capitaliza início e após ". ", "? ", "! ", e quebras de linha
      return trimmed.replace(/(^|[.!?]\s+|\n+)([a-zà-ÿ])/g, (_, sep, ch) => sep + ch.toLocaleUpperCase('pt-BR'));
    };
    const titleCaseNome = (s) => {
      if (!s || typeof s !== 'string') return '';
      const trimmed = s.trim().replace(/\s+/g, ' ');
      if (!trimmed) return '';
      const minus = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
      return trimmed
        .split(' ')
        .map((w, i) => {
          const lw = w.toLocaleLowerCase('pt-BR');
          if (i > 0 && minus.has(lw)) return lw;
          return lw.charAt(0).toLocaleUpperCase('pt-BR') + lw.slice(1);
        })
        .join(' ');
    };
    const onlyDigits = (s) => (typeof s === 'string' ? s.replace(/\D+/g, '') : '');

    // Sanitização defensiva
    const safeOS = (parsed && typeof parsed === 'object' && parsed.os && typeof parsed.os === 'object') ? parsed.os : {};
    const safeCliente = (parsed && typeof parsed === 'object' && parsed.cliente && typeof parsed.cliente === 'object') ? parsed.cliente : {};
    const safeItens = Array.isArray(parsed?.itens_sugeridos) ? parsed.itens_sugeridos : [];
    const safeAlertas = Array.isArray(parsed?.alertas) ? parsed.alertas.map(a => String(a)).slice(0, 20) : [];

    const tiposValidos = new Set(['peca', 'servico', 'mao_de_obra']);
    const itensSanitizados = safeItens
      .filter(it => it && typeof it === 'object')
      .map(it => ({
        tipo: tiposValidos.has(String(it.tipo)) ? String(it.tipo) : 'servico',
        descricao: capitalizeFirst(String(it.descricao || '')).slice(0, 300),
        quantidade: Number(it.quantidade) > 0 ? Number(it.quantidade) : 1,
        valor_unitario: Number(it.valor_unitario) >= 0 ? Number(it.valor_unitario) : 0,
        desconto: Number(it.desconto) > 0 ? Number(it.desconto) : 0,
        garantia: Number(it.garantia) > 0 ? Number(it.garantia) : 90,
      }))
      .filter(it => it.descricao !== '');

    const tiposSenhaValidos = new Set(['sim', 'nao', 'deslizar', 'nao_sabe', 'nao_autorizou']);
    const possuiSenhaTipoRaw = typeof safeOS.possui_senha_tipo === 'string' ? safeOS.possui_senha_tipo.trim().toLowerCase() : '';
    const possuiSenhaTipo = tiposSenhaValidos.has(possuiSenhaTipoRaw) ? possuiSenhaTipoRaw : '';

    const result = {
      cliente: {
        nome: titleCaseNome(typeof safeCliente.nome === 'string' ? safeCliente.nome : ''),
        telefone: onlyDigits(safeCliente.telefone).slice(0, 15),
        cpf_cnpj: onlyDigits(safeCliente.cpf_cnpj).slice(0, 14),
      },
      os: {
        tipo_aparelho: typeof safeOS.tipo_aparelho === 'string' ? safeOS.tipo_aparelho : tipoAparelhoSugerido,
        marca_nome: typeof safeOS.marca_nome === 'string' ? safeOS.marca_nome.trim() : '',
        modelo_nome: typeof safeOS.modelo_nome === 'string' ? safeOS.modelo_nome.trim() : '',
        imei: onlyDigits(safeOS.imei).slice(0, 20),
        numero_serie: typeof safeOS.numero_serie === 'string' ? safeOS.numero_serie.trim() : '',
        cor: capitalizeFirst(typeof safeOS.cor === 'string' ? safeOS.cor : ''),
        descricao_problema: capitalizeFirstOfSentences(typeof safeOS.descricao_problema === 'string' ? safeOS.descricao_problema : ''),
        condicoes_equipamento: capitalizeFirstOfSentences(typeof safeOS.condicoes_equipamento === 'string' ? safeOS.condicoes_equipamento : ''),
        previsao_entrega: typeof safeOS.previsao_entrega === 'string' ? safeOS.previsao_entrega.trim() : '',
        hora_previsao: typeof safeOS.hora_previsao === 'string' ? safeOS.hora_previsao.trim() : '',
        observacoes: capitalizeFirstOfSentences(typeof safeOS.observacoes === 'string' ? safeOS.observacoes : ''),
        orcamento_parcelado: Number(safeOS.orcamento_parcelado) >= 0 ? Number(safeOS.orcamento_parcelado) : 0,
        orcamento_desconto: Number(safeOS.orcamento_desconto) >= 0 ? Number(safeOS.orcamento_desconto) : 0,
        apenas_orcamento: typeof safeOS.apenas_orcamento === 'boolean' ? safeOS.apenas_orcamento : false,
        possui_senha_tipo: possuiSenhaTipo,
        senha_aparelho: typeof safeOS.senha_aparelho === 'string' ? safeOS.senha_aparelho.trim().slice(0, 60) : '',
      },
      itens_sugeridos: itensSanitizados,
      alertas: safeAlertas,
    };

    console.log('[Generate OS AI] Sucesso:', {
      itens: result.itens_sugeridos.length,
      alertas: result.alertas.length,
      hasMarca: !!result.os.marca_nome,
      hasModelo: !!result.os.modelo_nome,
      hasCliente: !!result.cliente.nome,
      hasSenha: !!result.os.senha_aparelho,
    });

    return res.json({ data: result });
  } catch (error) {
    console.error('[Generate OS AI] Erro:', error);
    return res.status(500).json({ error: error.message || 'Erro ao gerar OS com IA' });
  }
});

// POST /api/functions/import-produtos - Importar produtos em lote
app.post('/api/functions/import-produtos', authenticateToken, requirePermission('produtos.manage'), async (req, res) => {
  try {
    const { produtos, opcoes } = req.body;
    
    if (!produtos || !Array.isArray(produtos)) {
      return res.status(400).json({ error: 'Array de produtos é obrigatório' });
    }

    const skipDuplicates = opcoes?.skipDuplicates ?? true;
    const updateExisting = opcoes?.updateExisting ?? false;

    let inseridos = 0;
    let atualizados = 0;
    let erros = 0;
    let invalidos = 0;
    const errosDetalhes = [];

    console.log(`[ImportProdutos] Processando ${produtos.length} produtos...`);

    for (const produto of produtos) {
      try {
        // Validar produto
        if (!produto.descricao && !produto.nome) {
          invalidos++;
          continue;
        }

        // Preparar dados - aceitar múltiplos nomes de campos para compatibilidade
        // Função para limitar valores numéricos
        const limitNum = (val, min, max) => {
          if (val === null || val === undefined || isNaN(val)) return null;
          return Math.min(Math.max(val, min), max);
        };
        
        let valorVenda = parseFloat(produto.valor_dinheiro_pix) || parseFloat(produto.vi_venda) || parseFloat(produto.valor_venda) || 0;
        valorVenda = limitNum(valorVenda, 0, 9999999999.99) || 0; // Max ~10 bilhões
        
        let valorParcelado = produto.valor_parcelado_6x ? parseFloat(produto.valor_parcelado_6x) : (valorVenda ? valorVenda * 1.2 : null);
        valorParcelado = limitNum(valorParcelado, 0, 9999999999.99);
        
        let margemPercentual = produto.margem_percentual ? parseFloat(produto.margem_percentual) : (produto.margem ? parseFloat(produto.margem) : null);
        margemPercentual = limitNum(margemPercentual, 0, 999.99); // DECIMAL(5,2) max é 999.99
        
        // Código: se for número pequeno (< 2 bilhões), usar como INT, senão ignorar
        let codigoVal = null;
        if (produto.codigo !== null && produto.codigo !== undefined) {
          const codigoNum = parseInt(produto.codigo);
          if (!isNaN(codigoNum) && codigoNum > 0 && codigoNum < 2000000000) {
            codigoVal = codigoNum;
          }
        }
        
        // Quantidade e estoque - limitar para evitar overflow
        let quantidade = parseInt(produto.quantidade) || 0;
        quantidade = Math.min(Math.max(quantidade, 0), 2000000000);
        
        let estoqueMinimo = parseInt(produto.estoque_minimo) || 0;
        estoqueMinimo = Math.min(Math.max(estoqueMinimo, 0), 2000000000);
        
        const dadosProduto = {
          codigo: codigoVal,
          nome: (produto.descricao || produto.nome || '').toUpperCase().substring(0, 255),
          codigo_barras: produto.codigo_barras ? String(produto.codigo_barras).substring(0, 50) : null,
          referencia: produto.referencia ? String(produto.referencia).substring(0, 100) : null,
          marca: produto.marca ? String(produto.marca).substring(0, 100) : null,
          modelo: produto.modelo ? String(produto.modelo).substring(0, 100) : null,
          grupo: produto.grupo ? String(produto.grupo).substring(0, 100) : null,
          sub_grupo: produto.sub_grupo ? String(produto.sub_grupo).substring(0, 100) : null,
          qualidade: produto.qualidade ? String(produto.qualidade).substring(0, 50) : null,
          valor_dinheiro_pix: valorVenda,
          valor_parcelado_6x: valorParcelado,
          margem_percentual: margemPercentual,
          quantidade: quantidade,
          estoque_minimo: estoqueMinimo,
          localizacao: produto.localizacao ? String(produto.localizacao).substring(0, 100) : null,
        };

        // Verificar se produto já existe (APENAS por código_barras - referência é localização, não identificador)
        let produtoExistente = null;
        
        if (produto.codigo_barras) {
          const checkResult = await pool.query(
            'SELECT id FROM produtos WHERE codigo_barras = $1 LIMIT 1',
            [produto.codigo_barras]
          );
          if (checkResult.rows.length > 0) {
            produtoExistente = checkResult.rows[0];
          }
        }

        if (produtoExistente) {
          if (skipDuplicates) {
            // Pular duplicado - não conta como processado
            continue;
          } else if (updateExisting) {
            // Atualizar existente
            const keys = Object.keys(dadosProduto).filter(k => dadosProduto[k] !== null);
            const values = keys.map(k => dadosProduto[k]);
            const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
            
            await pool.query(
              `UPDATE produtos SET ${setClause}, atualizado_em = NOW() WHERE id = $${keys.length + 1}`,
              [...values, produtoExistente.id]
            );
            atualizados++;
          } else {
            // Ambas opções desmarcadas: inserir como novo (cria duplicado)
            const keys = Object.keys(dadosProduto).filter(k => dadosProduto[k] !== null);
            const values = keys.map(k => dadosProduto[k]);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            
            await pool.query(
              `INSERT INTO produtos (${keys.join(', ')}, criado_em) VALUES (${placeholders}, NOW())`,
              values
            );
            inseridos++;
          }
        } else {
          // Inserir novo
          const keys = Object.keys(dadosProduto).filter(k => dadosProduto[k] !== null);
          const values = keys.map(k => dadosProduto[k]);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          
          await pool.query(
            `INSERT INTO produtos (${keys.join(', ')}, criado_em) VALUES (${placeholders}, NOW())`,
            values
          );
          inseridos++;
        }
      } catch (produtoError) {
        console.error('[ImportProdutos] Erro ao processar produto:', produtoError.message);
        erros++;
        errosDetalhes.push(produtoError.message);
      }
    }

    console.log(`[ImportProdutos] Concluído: ${inseridos} inseridos, ${atualizados} atualizados, ${erros} erros, ${invalidos} inválidos`);

    res.json({
      success: true,
      resultado: {
        inseridos,
        atualizados,
        erros,
        invalidos,
        erros_detalhes: errosDetalhes.length > 0 ? errosDetalhes.slice(0, 10) : undefined
      }
    });
  } catch (error) {
    console.error('[ImportProdutos] Erro geral:', error);
    res.status(500).json({ error: error.message || 'Erro ao importar produtos' });
  }
});

// POST /api/functions/import-clientes - Importar clientes em lote
app.post('/api/functions/import-clientes', authenticateToken, requirePermission('clientes.create'), async (req, res) => {
  try {
    const { clientes, opcoes } = req.body;
    
    if (!clientes || !Array.isArray(clientes)) {
      return res.status(400).json({ error: 'Array de clientes é obrigatório' });
    }

    const skipDuplicates = opcoes?.skipDuplicates ?? true;
    const updateExisting = opcoes?.updateExisting ?? false;

    // Verificar quais colunas existem na tabela clientes
    const colunasResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'clientes'
    `);
    const colunasExistentes = new Set(colunasResult.rows.map(r => r.column_name));
    console.log('[ImportClientes] Colunas existentes:', Array.from(colunasExistentes));

    let inseridos = 0;
    let atualizados = 0;
    let erros = 0;
    let invalidos = 0;
    const errosDetalhes = [];

    console.log(`[ImportClientes] Processando ${clientes.length} clientes...`);

    for (const cliente of clientes) {
      try {
        // Validar cliente
        if (!cliente.nome) {
          invalidos++;
          continue;
        }

        // Preparar dados - usar nomes de colunas que existem na tabela
        const dadosPossiveis = {
          nome: String(cliente.nome).toUpperCase().substring(0, 255),
          cpf_cnpj: cliente.cpf_cnpj ? String(cliente.cpf_cnpj).substring(0, 20) : null,
          telefone: cliente.telefone ? String(cliente.telefone).substring(0, 50) : null,
          telefone2: cliente.telefone2 ? String(cliente.telefone2).substring(0, 50) : null,
          whatsapp: cliente.whatsapp ? String(cliente.whatsapp).substring(0, 50) : null,
          endereco: cliente.endereco ? String(cliente.endereco).substring(0, 255) : null,
          logradouro: cliente.endereco ? String(cliente.endereco).substring(0, 255) : null,
          numero: cliente.numero ? String(cliente.numero).substring(0, 20) : null,
          complemento: cliente.complemento ? String(cliente.complemento).substring(0, 100) : null,
          bairro: cliente.bairro ? String(cliente.bairro).substring(0, 100) : null,
          cep: cliente.cep ? String(cliente.cep).replace(/\D/g, '').substring(0, 10) : null,
          cidade: cliente.cidade ? String(cliente.cidade).substring(0, 100) : null,
          estado: cliente.estado ? String(cliente.estado).substring(0, 50) : null,
          tipo_pessoa: cliente.tipo_pessoa || 'fisica',
          tipo_cliente: 'cliente',
          situacao: 'ativo',
          codigo_original: cliente.codigo_original ? String(cliente.codigo_original) : null,
        };
        
        // Filtrar apenas colunas que existem na tabela
        const dadosCliente = {};
        for (const [key, value] of Object.entries(dadosPossiveis)) {
          if (colunasExistentes.has(key)) {
            dadosCliente[key] = value;
          }
        }

        // Verificar se cliente já existe (por CPF/CNPJ)
        let clienteExistente = null;
        
        if (cliente.cpf_cnpj) {
          const cpfCnpjLimpo = String(cliente.cpf_cnpj).replace(/\D/g, '');
          if (cpfCnpjLimpo.length > 0) {
            const checkResult = await pool.query(
              'SELECT id FROM clientes WHERE REPLACE(REPLACE(REPLACE(cpf_cnpj, \'.\', \'\'), \'-\', \'\'), \'/\', \'\') = $1 LIMIT 1',
              [cpfCnpjLimpo]
            );
            if (checkResult.rows.length > 0) {
              clienteExistente = checkResult.rows[0];
            }
          }
        }

        if (clienteExistente) {
          if (skipDuplicates) {
            // Pular duplicado
            continue;
          } else if (updateExisting) {
            // Atualizar existente
            const keys = Object.keys(dadosCliente).filter(k => dadosCliente[k] !== null);
            const values = keys.map(k => dadosCliente[k]);
            const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
            
            await pool.query(
              `UPDATE clientes SET ${setClause}, updated_at = NOW() WHERE id = $${keys.length + 1}`,
              [...values, clienteExistente.id]
            );
            atualizados++;
          } else {
            // Inserir como novo (cria duplicado)
            const keys = Object.keys(dadosCliente).filter(k => dadosCliente[k] !== null);
            const values = keys.map(k => dadosCliente[k]);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            
            await pool.query(
              `INSERT INTO clientes (${keys.join(', ')}, created_at) VALUES (${placeholders}, NOW())`,
              values
            );
            inseridos++;
          }
        } else {
          // Inserir novo
          const keys = Object.keys(dadosCliente).filter(k => dadosCliente[k] !== null);
          const values = keys.map(k => dadosCliente[k]);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          
          await pool.query(
            `INSERT INTO clientes (${keys.join(', ')}, created_at) VALUES (${placeholders}, NOW())`,
            values
          );
          inseridos++;
        }
      } catch (clienteError) {
        console.error('[ImportClientes] Erro ao processar cliente:', clienteError.message);
        erros++;
        errosDetalhes.push(clienteError.message);
      }
    }

    console.log(`[ImportClientes] Concluído: ${inseridos} inseridos, ${atualizados} atualizados, ${erros} erros, ${invalidos} inválidos`);

    res.json({
      inseridos,
      atualizados,
      erros,
      invalidos,
      errosDetalhes: errosDetalhes.length > 0 ? errosDetalhes.slice(0, 10) : undefined
    });
  } catch (error) {
    console.error('[ImportClientes] Erro geral:', error);
    res.status(500).json({ error: error.message || 'Erro ao importar clientes' });
  }
});

// ============================================
// ENDPOINT DE BUSCA DE CLIENTES (AUTOCOMPLETE)
// ============================================

// GET /api/clientes/search - Buscar clientes por termo (ILIKE)
app.get('/api/clientes/search', authenticateToken, async (req, res) => {
  try {
    const { q, limit = 15 } = req.query;
    const companyId = req.companyId;
    
    console.log('[ClientesSearch] Buscando:', { q, limit, companyId });
    
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const searchTerm = `%${q}%`;
    const limitNum = Math.min(parseInt(limit) || 15, 100);

    // CRÍTICO: Filtrar por company_id para isolamento de dados
    const result = await pool.query(
      `SELECT id, nome, cpf_cnpj, rg, telefone, whatsapp, email, cidade, estado, tipo_pessoa, situacao
       FROM clientes 
       WHERE company_id = $3
         AND (situacao IS NULL OR situacao != 'inativo')
         AND (
           nome ILIKE $1 
           OR cpf_cnpj ILIKE $1 
           OR telefone ILIKE $1 
           OR whatsapp ILIKE $1
           OR email ILIKE $1
         )
       ORDER BY nome ASC
       LIMIT $2`,
      [searchTerm, limitNum, companyId]
    );

    console.log('[ClientesSearch] Encontrados:', result.rows.length, 'clientes');
    res.json(result.rows);
  } catch (error) {
    console.error('[ClientesSearch] Erro:', error);
    res.status(500).json({ error: error.message || 'Erro ao buscar clientes' });
  }
});

// ============================================
// TELEGRAM BOT FUNCTIONS (usa apenas https nativo, sem fetch/form-data)
// ============================================

function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        try {
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, json: () => Promise.resolve(JSON.parse(body)) });
        } catch {
          resolve({ ok: false, json: () => Promise.resolve({}) });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// POST /api/functions/telegram-bot - Enviar foto para Telegram
app.post('/api/functions/telegram-bot', authenticateToken, async (req, res) => {
  try {
    const { action, file, fileName, osNumero, tipo, chatId, caption, messageId } = req.body;

    // Ação de deletar mensagem
    if (action === 'delete') {
      if (!chatId || !messageId) {
        return res.status(400).json({ error: 'chatId e messageId são obrigatórios para deletar' });
      }

      const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      if (!TELEGRAM_BOT_TOKEN) {
        return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN não configurado' });
      }

      const deleteUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteMessage`;
      const deleteResponse = await httpsRequest(deleteUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
      });
      const deleteResult = await deleteResponse.json();

      if (!deleteResult.ok) {
        return res.status(400).json({
          success: false,
          error: deleteResult.description || 'Erro ao deletar mensagem',
        });
      }
      return res.json({ success: true });
    }

    // Ação padrão: enviar foto
    if (!file || !osNumero || !tipo || !chatId) {
      return res.status(400).json({ error: 'file, osNumero, tipo e chatId são obrigatórios' });
    }

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!TELEGRAM_BOT_TOKEN) {
      return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN não configurado. Configure no arquivo .env' });
    }

    console.log(`[Telegram] Enviando foto para OS-${osNumero}, tipo: ${tipo}, chat: ${chatId}`);

    const imageBuffer = Buffer.from(file, 'base64');
    const captionText = caption || `📱 OS-${osNumero}\n📁 Tipo: ${tipo === 'entrada' ? 'Entrada' : tipo === 'saida' ? 'Saída' : 'Processo'}\n📅 ${new Date().toLocaleString('pt-BR')}`;
    const photoName = fileName || `os-${osNumero}-${tipo}.jpg`;

    const boundary = '----PrimeCampTelegram' + Date.now();
    const CRLF = '\r\n';
    const parts = [];
    parts.push(Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="chat_id"${CRLF}${CRLF}${chatId}${CRLF}`, 'utf8'));
    parts.push(Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="caption"${CRLF}${CRLF}${captionText}${CRLF}`, 'utf8'));
    parts.push(Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="photo"; filename="${photoName}"${CRLF}Content-Type: image/jpeg${CRLF}${CRLF}`, 'utf8'));
    parts.push(imageBuffer);
    parts.push(Buffer.from(`${CRLF}--${boundary}--${CRLF}`, 'utf8'));
    const body = Buffer.concat(parts);

    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
    const telegramResponse = await httpsRequest(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(body.length),
      },
      body,
    });
    const telegramResult = await telegramResponse.json();

    if (!telegramResult.ok) {
      console.error('[Telegram] Erro na API:', telegramResult);
      return res.status(400).json({
        success: false,
        error: telegramResult.description || 'Erro ao enviar foto para Telegram',
      });
    }

    const photo = telegramResult.result.photo;
    const largestPhoto = photo[photo.length - 1];
    const smallestPhoto = photo[0];

    let fileUrl = null;
    let thumbnailUrl = null;
    try {
      const fileResponse = await httpsRequest(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${largestPhoto.file_id}`);
      const fileData = await fileResponse.json();
      if (fileData.ok) {
        fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`;
      }
      const thumbResponse = await httpsRequest(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${smallestPhoto.file_id}`);
      const thumbData = await thumbResponse.json();
      if (thumbData.ok) {
        thumbnailUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${thumbData.result.file_path}`;
      }
    } catch (urlError) {
      console.warn('[Telegram] Não foi possível obter URLs das fotos:', urlError.message);
    }

    console.log(`[Telegram] Foto enviada com sucesso. MessageId: ${telegramResult.result.message_id}`);

    res.json({
      success: true,
      messageId: telegramResult.result.message_id,
      fileId: largestPhoto.file_id,
      fileUrl,
      thumbnailUrl,
    });

  } catch (error) {
    console.error('[Telegram] Erro:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro interno ao processar requisição do Telegram' 
    });
  }
});

// =====================================================
// MINI CRM - Chat com Leads via AtivaCRM
// =====================================================

// Buscar configuração do AtivaCRM
app.get('/api/ativacrm/config', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, is_active, created_at FROM ativacrm_config LIMIT 1');
    res.json({ data: result.rows[0] || null, hasConfig: result.rows.length > 0 });
  } catch (error) {
    console.error('Erro ao buscar config AtivaCRM:', error);
    res.status(500).json({ error: 'Erro ao buscar configuração' });
  }
});

// Salvar configuração do AtivaCRM
app.post('/api/ativacrm/config', authenticateToken, async (req, res) => {
  const { api_token, webhook_secret } = req.body;
  
  try {
    // Verificar se já existe configuração
    const existing = await pool.query('SELECT id FROM ativacrm_config LIMIT 1');
    
    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE ativacrm_config SET api_token = $1, webhook_secret = $2, updated_at = NOW() WHERE id = $3',
        [api_token, webhook_secret, existing.rows[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO ativacrm_config (api_token, webhook_secret) VALUES ($1, $2)',
        [api_token, webhook_secret]
      );
    }
    
    res.json({ success: true, message: 'Configuração salva com sucesso' });
  } catch (error) {
    console.error('Erro ao salvar config AtivaCRM:', error);
    res.status(500).json({ error: 'Erro ao salvar configuração' });
  }
});

// Buscar mensagens de um lead
app.get('/api/leads/:leadId/messages', authenticateToken, async (req, res) => {
  const { leadId } = req.params;
  const { limit = 50, offset = 0 } = req.query;
  
  try {
    const result = await pool.query(
      `SELECT * FROM lead_messages 
       WHERE lead_id = $1 
       ORDER BY created_at ASC 
       LIMIT $2 OFFSET $3`,
      [leadId, limit, offset]
    );
    
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM lead_messages WHERE lead_id = $1',
      [leadId]
    );
    
    res.json({ 
      data: result.rows, 
      total: parseInt(countResult.rows[0].total),
      hasMore: result.rows.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: 'Erro ao buscar mensagens' });
  }
});

// Enviar mensagem para um lead via AtivaCRM
app.post('/api/leads/:leadId/messages/send', authenticateToken, async (req, res) => {
  const { leadId } = req.params;
  const { body, media_url } = req.body;
  
  try {
    // Buscar lead para pegar o número
    const leadResult = await pool.query('SELECT * FROM leads WHERE id = $1', [leadId]);
    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }
    
    const lead = leadResult.rows[0];
    const phoneNumber = lead.whatsapp || lead.telefone;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Lead não possui número de telefone' });
    }
    
    // Buscar token do AtivaCRM
    const configResult = await pool.query('SELECT api_token FROM ativacrm_config WHERE is_active = true LIMIT 1');
    if (configResult.rows.length === 0) {
      return res.status(400).json({ error: 'AtivaCRM não configurado' });
    }
    
    const apiToken = configResult.rows[0].api_token;
    
    // Limpar número (apenas dígitos)
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Enviar mensagem via AtivaCRM
    console.log(`[AtivaCRM] Enviando mensagem para ${cleanNumber}`);
    
    const ativaCrmPayload = media_url 
      ? { number: cleanNumber, body, url: media_url }
      : { number: cleanNumber, body };
    
    const ativaCrmResponse = await fetch('https://api.ativacrm.com/api/messages/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify(ativaCrmPayload)
    });
    
    const ativaCrmResult = await ativaCrmResponse.json();
    
    if (!ativaCrmResponse.ok) {
      console.error('[AtivaCRM] Erro ao enviar:', ativaCrmResult);
      return res.status(500).json({ error: 'Erro ao enviar mensagem via AtivaCRM', details: ativaCrmResult });
    }
    
    console.log('[AtivaCRM] Mensagem enviada:', ativaCrmResult);
    
    // Salvar mensagem no banco
    const messageResult = await pool.query(
      `INSERT INTO lead_messages (lead_id, direction, message_type, body, media_url, status, sender_name)
       VALUES ($1, 'outbound', $2, $3, $4, 'sent', $5)
       RETURNING *`,
      [leadId, media_url ? 'image' : 'text', body, media_url, req.user.email]
    );
    
    // Atualizar última interação do lead
    await pool.query(
      'UPDATE leads SET total_interacoes = COALESCE(total_interacoes, 0) + 1, updated_at = NOW() WHERE id = $1',
      [leadId]
    );
    
    res.json({ 
      success: true, 
      message: messageResult.rows[0],
      ativacrm: ativaCrmResult
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

// Buscar conversas recentes (leads com mensagens)
app.get('/api/leads/conversations', authenticateToken, async (req, res) => {
  const { limit = 20 } = req.query;
  
  try {
    const result = await pool.query(`
      SELECT 
        l.*,
        lm.last_message,
        lm.last_message_at,
        lm.unread_count,
        lm.last_direction
      FROM leads l
      INNER JOIN (
        SELECT 
          lead_id,
          MAX(body) FILTER (WHERE created_at = max_created) as last_message,
          MAX(created_at) as last_message_at,
          COUNT(*) FILTER (WHERE direction = 'inbound' AND status != 'read') as unread_count,
          MAX(direction) FILTER (WHERE created_at = max_created) as last_direction
        FROM (
          SELECT *, MAX(created_at) OVER (PARTITION BY lead_id) as max_created
          FROM lead_messages
        ) sub
        GROUP BY lead_id
      ) lm ON l.id = lm.lead_id
      ORDER BY lm.last_message_at DESC
      LIMIT $1
    `, [limit]);
    
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Erro ao buscar conversas:', error);
    // Se a query complexa falhar, tentar uma mais simples
    try {
      const simpleResult = await pool.query(`
        SELECT DISTINCT ON (l.id)
          l.*,
          lm.body as last_message,
          lm.created_at as last_message_at,
          lm.direction as last_direction
        FROM leads l
        INNER JOIN lead_messages lm ON l.id = lm.lead_id
        ORDER BY l.id, lm.created_at DESC
        LIMIT $1
      `, [limit]);
      
      res.json({ data: simpleResult.rows });
    } catch (simpleError) {
      res.status(500).json({ error: 'Erro ao buscar conversas' });
    }
  }
});

// Marcar mensagens como lidas
app.post('/api/leads/:leadId/messages/read', authenticateToken, async (req, res) => {
  const { leadId } = req.params;
  
  try {
    await pool.query(
      `UPDATE lead_messages SET status = 'read' WHERE lead_id = $1 AND direction = 'inbound' AND status != 'read'`,
      [leadId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao marcar como lido:', error);
    res.status(500).json({ error: 'Erro ao marcar como lido' });
  }
});

// Apagar uma mensagem específica
app.delete('/api/leads/:leadId/messages/:messageId', authenticateToken, async (req, res) => {
  const { leadId, messageId } = req.params;
  
  try {
    await pool.query(
      `DELETE FROM lead_messages WHERE id = $1 AND lead_id = $2`,
      [messageId, leadId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao apagar mensagem:', error);
    res.status(500).json({ error: 'Erro ao apagar mensagem' });
  }
});

// Apagar todas as mensagens de um lead (limpar conversa)
app.delete('/api/leads/:leadId/messages', authenticateToken, async (req, res) => {
  const { leadId } = req.params;
  
  try {
    await pool.query(
      `DELETE FROM lead_messages WHERE lead_id = $1`,
      [leadId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao apagar conversa:', error);
    res.status(500).json({ error: 'Erro ao apagar conversa' });
  }
});

// Atualizar status do lead (ganho/perdido)
app.patch('/api/leads/:leadId/status', authenticateToken, async (req, res) => {
  const { leadId } = req.params;
  const { status, temperatura } = req.body;
  
  try {
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (status) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
      
      // Se convertido, marcar como tal
      if (status === 'convertido') {
        updates.push(`convertido = true`);
      }
    }
    
    if (temperatura) {
      updates.push(`temperatura = $${paramIndex}`);
      values.push(temperatura);
      paramIndex++;
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(leadId);
    
    await pool.query(
      `UPDATE leads SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// =====================================================
// WEBHOOK TEST - Sistema de Teste em Tempo Real
// =====================================================

// Armazenamento em memória para eventos de teste (expira em 30 min)
const webhookTestSessions = new Map();

// Limpar sessões antigas a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of webhookTestSessions.entries()) {
    if (now - session.createdAt > 30 * 60 * 1000) { // 30 minutos
      webhookTestSessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000);

// Criar sessão de teste (autenticado)
app.post('/api/webhook/test/session', authenticateToken, async (req, res) => {
  const sessionId = crypto.randomUUID();
  webhookTestSessions.set(sessionId, {
    createdAt: Date.now(),
    events: [],
    userId: req.user.id
  });
  
  const testUrl = `${process.env.STORAGE_BASE_URL?.replace('/uploads', '') || 'https://api.ativafix.com'}/api/webhook/test/${sessionId}`;
  
  res.json({ 
    success: true, 
    sessionId,
    testUrl,
    expiresIn: '30 minutos'
  });
});

// Receber webhook de teste (público)
app.post('/api/webhook/test/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const payload = req.body;
  
  console.log(`[Webhook Test] Sessão: ${sessionId}`);
  console.log(`[Webhook Test] Payload:`, JSON.stringify(payload, null, 2));
  
  const session = webhookTestSessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ 
      success: false, 
      error: 'Sessão de teste não encontrada ou expirada' 
    });
  }
  
  // Adicionar evento
  session.events.push({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    payload,
    headers: {
      'content-type': req.get('content-type'),
      'user-agent': req.get('user-agent'),
      'x-real-ip': req.get('x-real-ip') || req.ip
    }
  });
  
  // Manter apenas os últimos 50 eventos
  if (session.events.length > 50) {
    session.events = session.events.slice(-50);
  }
  
  res.json({ success: true, message: 'Evento recebido' });
});

// Buscar eventos de teste (autenticado)
app.get('/api/webhook/test/:sessionId/events', authenticateToken, (req, res) => {
  const { sessionId } = req.params;
  const { since } = req.query; // timestamp para buscar apenas novos eventos
  
  const session = webhookTestSessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ 
      success: false, 
      error: 'Sessão de teste não encontrada ou expirada' 
    });
  }
  
  let events = session.events;
  
  // Filtrar eventos desde um timestamp específico
  if (since) {
    events = events.filter(e => new Date(e.timestamp) > new Date(since));
  }
  
  res.json({ 
    success: true, 
    events,
    totalEvents: session.events.length,
    sessionCreatedAt: new Date(session.createdAt).toISOString()
  });
});

// Encerrar sessão de teste
app.delete('/api/webhook/test/:sessionId', authenticateToken, (req, res) => {
  const { sessionId } = req.params;
  
  if (webhookTestSessions.has(sessionId)) {
    webhookTestSessions.delete(sessionId);
    res.json({ success: true, message: 'Sessão encerrada' });
  } else {
    res.status(404).json({ success: false, error: 'Sessão não encontrada' });
  }
});

// =====================================================
// WEBHOOK - Receber Leads de Fontes Externas (AtivaCRM, etc)
// =====================================================

// Endpoint público para receber webhooks (não requer autenticação)
app.post('/api/webhook/leads/:webhookKey', async (req, res) => {
  const { webhookKey } = req.params;
  const payload = req.body;
  
  console.log(`[Webhook] Recebendo lead via webhook key: ${webhookKey}`);
  console.log(`[Webhook] Payload:`, JSON.stringify(payload, null, 2));

  try {
    // Verificar se o webhook está ativo
    const webhookResult = await pool.query(
      `SELECT * FROM webhook_configs WHERE webhook_key = $1 AND is_active = true`,
      [webhookKey]
    );

    if (webhookResult.rows.length === 0) {
      console.log(`[Webhook] Webhook key não encontrada ou inativa: ${webhookKey}`);
      return res.status(404).json({ success: false, error: 'Webhook não encontrado ou inativo' });
    }

    const webhook = webhookResult.rows[0];
    
    // Mapear campos do payload para os campos do lead
    // Suporta vários formatos: CRM, Elementor, AtivaCRM, etc.
    // Detectar formato do payload
    const isAtivaCRMTicket = payload.ticket && payload.contact;
    
    let leadData;
    
    if (isAtivaCRMTicket) {
      // Formato AtivaCRM - Ticket de WhatsApp
      console.log('[Webhook] Formato detectado: AtivaCRM WhatsApp Ticket');
      const contact = payload.contact || {};
      const rawMessage = payload.rawMessage?.Info || {};
      const messages = payload.messages || [];
      const lastMessage = messages[0]?.body || payload.ticket?.lastMessage || '';
      
      leadData = {
        nome: contact.name || rawMessage.PushName || 'Lead WhatsApp',
        email: contact.email || null,
        telefone: contact.number || rawMessage.Sender || null,
        whatsapp: contact.number || rawMessage.Sender || null,
        cidade: null,
        estado: null,
        fonte: 'webhook',
        webhook_id: webhook.id,
        webhook_nome: webhook.nome,
        utm_source: 'ativacrm_whatsapp',
        utm_medium: payload.ticket?.queueName || null,
        utm_campaign: payload.company?.name || null,
        utm_term: null,
        utm_content: payload.ticket?.id?.toString() || null,
        interesse: null,
        observacoes: lastMessage ? `Mensagem: ${lastMessage}` : null,
        status: 'novo',
        temperatura: 'quente', // WhatsApp = lead mais quente
        convertido: false,
        total_interacoes: 1,
        raw_payload: JSON.stringify(payload),
      };
    } else {
      // Formato padrão (Elementor, formulários, etc.)
      console.log('[Webhook] Formato detectado: Formulário padrão');
      leadData = {
        nome: payload.nome || payload.name || payload.full_name || payload.lead_name || payload.Nome || payload['Nome:'] || payload['Nome'] || 'Lead sem nome',
        email: payload.email || payload.Email || payload.e_mail || payload['E-mail:'] || payload['E-mail'] || payload['email:'] || null,
        telefone: payload.telefone || payload.phone || payload.tel || payload.Telefone || payload['DDD + Telefone:'] || payload['Telefone:'] || payload['Celular:'] || payload['WhatsApp:'] || null,
        whatsapp: payload.whatsapp || payload.whats || payload.celular || payload.mobile || payload.Whatsapp || payload['WhatsApp:'] || payload['Celular:'] || payload['DDD + Telefone:'] || payload.telefone || null,
        cidade: payload.cidade || payload.city || payload.Cidade || payload['Cidade:'] || null,
        estado: payload.estado || payload.state || payload.uf || payload.Estado || payload['Estado:'] || payload['UF:'] || null,
        fonte: 'webhook',
        webhook_id: webhook.id,
        webhook_nome: webhook.nome,
        utm_source: payload.utm_source || payload.source || payload['URL da página'] || webhook.fonte_padrao || null,
        utm_medium: payload.utm_medium || payload.medium || payload.form_name || null,
        utm_campaign: payload.utm_campaign || payload.campaign || payload.campanha || payload['Campanha:'] || null,
        utm_term: payload.utm_term || payload.keyword || payload.palavra_chave || payload['Palavra-chave:'] || null,
        utm_content: payload.utm_content || payload.form_id || null,
        interesse: payload.interesse || payload.interest || payload.produto || payload.servico || payload['Interesse:'] || payload['Serviço:'] || payload['Produto:'] || null,
        observacoes: payload.observacoes || payload.obs || payload.notes || payload.mensagem || payload.message || payload['Mensagem:'] || payload['Observações:'] || null,
        status: 'novo',
        temperatura: 'frio',
        convertido: false,
        total_interacoes: 0,
        raw_payload: JSON.stringify(payload),
      };
    }

    // Verificar se o lead já existe pelo telefone/whatsapp
    const phoneNumber = leadData.whatsapp || leadData.telefone;
    let leadId = null;
    let isNewLead = false;
    
    if (phoneNumber) {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const existingLead = await pool.query(
        `SELECT id FROM leads WHERE 
         REPLACE(REPLACE(REPLACE(whatsapp, '+', ''), '-', ''), ' ', '') = $1 OR
         REPLACE(REPLACE(REPLACE(telefone, '+', ''), '-', ''), ' ', '') = $1
         LIMIT 1`,
        [cleanPhone]
      );
      
      if (existingLead.rows.length > 0) {
        leadId = existingLead.rows[0].id;
        console.log(`[Webhook] Lead já existe. ID: ${leadId}`);
        
        // Atualizar dados do lead existente (exceto status e temperatura para não sobrescrever)
        await pool.query(
          `UPDATE leads SET 
            nome = COALESCE(NULLIF($1, ''), nome),
            email = COALESCE(NULLIF($2, ''), email),
            total_interacoes = COALESCE(total_interacoes, 0) + 1,
            updated_at = NOW()
          WHERE id = $3`,
          [leadData.nome, leadData.email, leadId]
        );
      }
    }
    
    // Se não encontrou lead existente, criar novo
    if (!leadId) {
      isNewLead = true;
      const insertResult = await pool.query(
        `INSERT INTO leads (
          nome, email, telefone, whatsapp, cidade, estado,
          fonte, webhook_id, webhook_nome, 
          utm_source, utm_medium, utm_campaign, utm_term, utm_content,
          interesse, observacoes, status, temperatura, convertido, total_interacoes, raw_payload
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING id`,
        [
          leadData.nome, leadData.email, leadData.telefone, leadData.whatsapp,
          leadData.cidade, leadData.estado, leadData.fonte, leadData.webhook_id,
          leadData.webhook_nome, leadData.utm_source, leadData.utm_medium,
          leadData.utm_campaign, leadData.utm_term, leadData.utm_content,
          leadData.interesse, leadData.observacoes, leadData.status,
          leadData.temperatura, leadData.convertido, leadData.total_interacoes,
          leadData.raw_payload
        ]
      );
      leadId = insertResult.rows[0].id;
    }

    // Atualizar contador de leads recebidos no webhook (apenas para novos leads)
    if (isNewLead) {
      await pool.query(
        `UPDATE webhook_configs SET leads_recebidos = COALESCE(leads_recebidos, 0) + 1, ultimo_lead_em = NOW() WHERE id = $1`,
        [webhook.id]
      );
    }

    // Registrar log do webhook
    await pool.query(
      `INSERT INTO webhook_logs (webhook_id, tipo, payload, lead_id, ip_origem) VALUES ($1, $2, $3, $4, $5)`,
      [webhook.id, 'lead_recebido', JSON.stringify(payload), leadId, req.ip]
    );

    console.log(`[Webhook] Lead ${isNewLead ? 'criado' : 'atualizado'} com sucesso. ID: ${leadId}`);

    // Se for um webhook do AtivaCRM com mensagem, salvar na tabela de mensagens
    if (isAtivaCRMTicket && leadData.observacoes) {
      try {
        const messageBody = leadData.observacoes.replace('Mensagem: ', '');
        const externalMessageId = payload.messages?.[0]?.id || null;
        
        // Verificar se a mensagem já existe pelo external_id
        if (externalMessageId) {
          const existingMsg = await pool.query(
            `SELECT id FROM lead_messages WHERE external_id = $1 LIMIT 1`,
            [externalMessageId]
          );
          
          if (existingMsg.rows.length > 0) {
            console.log(`[Webhook] Mensagem já existe. External ID: ${externalMessageId}`);
          } else {
            await pool.query(
              `INSERT INTO lead_messages (lead_id, direction, message_type, body, sender_name, sender_number, external_id, metadata)
               VALUES ($1, 'inbound', 'text', $2, $3, $4, $5, $6)`,
              [
                leadId, 
                messageBody,
                payload.contact?.name || 'Desconhecido',
                payload.contact?.number || null,
                externalMessageId,
                JSON.stringify({
                  ticket_id: payload.ticket?.id,
                  queue_name: payload.ticket?.queueName
                })
              ]
            );
            console.log(`[Webhook] Mensagem salva para lead ${leadId}`);
          }
        } else {
          // Sem external_id, verificar por body + lead_id + timestamp recente (evitar duplicatas)
          const recentMsg = await pool.query(
            `SELECT id FROM lead_messages 
             WHERE lead_id = $1 AND body = $2 AND created_at > NOW() - INTERVAL '1 minute'
             LIMIT 1`,
            [leadId, messageBody]
          );
          
          if (recentMsg.rows.length === 0) {
            await pool.query(
              `INSERT INTO lead_messages (lead_id, direction, message_type, body, sender_name, sender_number, metadata)
               VALUES ($1, 'inbound', 'text', $2, $3, $4, $5)`,
              [
                leadId, 
                messageBody,
                payload.contact?.name || 'Desconhecido',
                payload.contact?.number || null,
                JSON.stringify({
                  ticket_id: payload.ticket?.id,
                  queue_name: payload.ticket?.queueName
                })
              ]
            );
            console.log(`[Webhook] Mensagem salva para lead ${leadId}`);
          } else {
            console.log(`[Webhook] Mensagem duplicada ignorada para lead ${leadId}`);
          }
        }
      } catch (msgError) {
        console.error('[Webhook] Erro ao salvar mensagem:', msgError);
        // Não falhar o webhook por erro na mensagem
      }
    }

    res.json({ 
      success: true, 
      message: isNewLead ? 'Lead recebido com sucesso' : 'Mensagem adicionada ao lead existente',
      lead_id: leadId,
      is_new_lead: isNewLead
    });

  } catch (error) {
    console.error('[Webhook] Erro ao processar lead:', error);
    
    // Tentar registrar o erro no log
    try {
      const webhookResult = await pool.query(
        `SELECT id FROM webhook_configs WHERE webhook_key = $1`,
        [webhookKey]
      );
      if (webhookResult.rows.length > 0) {
        await pool.query(
          `INSERT INTO webhook_logs (webhook_id, tipo, payload, erro, ip_origem) VALUES ($1, $2, $3, $4, $5)`,
          [webhookResult.rows[0].id, 'erro', JSON.stringify(payload), error.message, req.ip]
        );
      }
    } catch (logError) {
      console.error('[Webhook] Erro ao registrar log:', logError);
    }

    res.status(500).json({ 
      success: false, 
      error: 'Erro ao processar lead',
      details: error.message 
    });
  }
});

// GET - Listar webhooks configurados (autenticado)
app.get('/api/webhook/configs', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM webhook_configs ORDER BY created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Webhook] Erro ao listar configs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Criar novo webhook (autenticado)
app.post('/api/webhook/configs', authenticateToken, async (req, res) => {
  try {
    const { nome, fonte_padrao, descricao } = req.body;
    
    // Gerar chave única para o webhook
    const crypto = await import('crypto');
    const webhookKey = crypto.randomBytes(16).toString('hex');
    
    const result = await pool.query(
      `INSERT INTO webhook_configs (nome, webhook_key, fonte_padrao, descricao, is_active, created_by)
       VALUES ($1, $2, $3, $4, true, $5)
       RETURNING *`,
      [nome, webhookKey, fonte_padrao || 'webhook', descricao, req.user.id]
    );
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Webhook] Erro ao criar config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Atualizar webhook (autenticado)
app.put('/api/webhook/configs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, fonte_padrao, descricao, is_active } = req.body;
    
    const result = await pool.query(
      `UPDATE webhook_configs 
       SET nome = COALESCE($1, nome), 
           fonte_padrao = COALESCE($2, fonte_padrao), 
           descricao = COALESCE($3, descricao),
           is_active = COALESCE($4, is_active),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [nome, fonte_padrao, descricao, is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Webhook não encontrado' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Webhook] Erro ao atualizar config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Excluir webhook (autenticado)
app.delete('/api/webhook/configs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query(`DELETE FROM webhook_configs WHERE id = $1`, [id]);
    
    res.json({ success: true, message: 'Webhook excluído' });
  } catch (error) {
    console.error('[Webhook] Erro ao excluir config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Logs do webhook (autenticado)
app.get('/api/webhook/logs/:webhookId', authenticateToken, async (req, res) => {
  try {
    const { webhookId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const result = await pool.query(
      `SELECT * FROM webhook_logs WHERE webhook_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [webhookId, limit]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Webhook] Erro ao buscar logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// API PÚBLICA - ENDPOINTS PARA INTEGRAÇÃO EXTERNA (Agentes IA, Sistemas, etc)
// ═══════════════════════════════════════════════════════════════════════════════

// Middleware para validar API Token
const validateApiToken = async (req, res, next) => {
  console.log('[API Token Validation] Middleware chamado para:', req.method, req.path);
  try {
    const authHeader = req.headers.authorization;
    console.log('[API Token Validation] Header authorization recebido:', authHeader ? 'SIM' : 'NÃO');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Token de API não fornecido',
        message: 'Inclua o header Authorization: Bearer <seu_token>'
      });
    }
    
    const token = authHeader.substring(7).trim();
    console.log('[API Token Validation] Validando token:', token.substring(0, 20) + '...');
    console.log('[API Token Validation] Tamanho do token:', token.length);
    
    // Buscar token no banco (primeiro sem filtro de ativo para debug)
    const resultAll = await pool.query(
      `SELECT id, nome, token, ativo, expires_at FROM api_tokens WHERE token = $1`,
      [token]
    );
    
    console.log('[API Token Validation] Token encontrado no banco:', resultAll.rows.length > 0);
    if (resultAll.rows.length > 0) {
      console.log('[API Token Validation] Status do token:', {
        nome: resultAll.rows[0].nome,
        ativo: resultAll.rows[0].ativo,
        expires_at: resultAll.rows[0].expires_at
      });
    }
    
    // Buscar token no banco (com filtro de ativo)
    const result = await pool.query(
      `SELECT * FROM api_tokens WHERE token = $1 AND ativo = true`,
      [token]
    );
    
    if (result.rows.length === 0) {
      console.log('[API Token Validation] Token não encontrado ou inativo');
      return res.status(401).json({ 
        success: false, 
        error: 'Token de API inválido ou inativo'
      });
    }
    
    const apiToken = result.rows[0];
    
    // Isolamento: definir company_id do token para filtrar dados em /api/v1/*
    if (apiToken.company_id) {
      req.companyId = apiToken.company_id;
    } else if (apiToken.criado_por) {
      const userRow = await pool.query('SELECT company_id FROM users WHERE id = $1', [apiToken.criado_por]);
      if (userRow.rows[0]?.company_id) req.companyId = userRow.rows[0].company_id;
    }
    
    // Verificar se expirou
    if (apiToken.expires_at && new Date(apiToken.expires_at) < new Date()) {
      return res.status(401).json({ 
        success: false, 
        error: 'Token de API expirado'
      });
    }
    
    // Atualizar último uso
    await pool.query(
      `UPDATE api_tokens SET ultimo_uso = NOW(), uso_count = uso_count + 1 WHERE id = $1`,
      [apiToken.id]
    );
    
    // Interceptar resposta para salvar no log
    const originalJson = res.json.bind(res);
    res.json = function(body) {
      // Salvar log com resposta (assíncrono, não bloqueia resposta)
      pool.query(
        `INSERT INTO api_access_logs (token_id, endpoint, method, ip_address, user_agent, query_params, response_status, response_body)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          apiToken.id, 
          req.path, 
          req.method, 
          req.ip, 
          req.headers['user-agent'], 
          JSON.stringify(req.query),
          res.statusCode,
          JSON.stringify(body)
        ]
      ).catch(err => console.error('[API Log] Erro ao salvar log:', err));
      
      return originalJson(body);
    };
    
    req.apiToken = apiToken;
    next();
  } catch (error) {
    console.error('[API] Erro ao validar token:', error);
    res.status(500).json({ success: false, error: 'Erro interno ao validar token' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// GESTÃO DE TOKENS (autenticado - apenas admins)
// ═══════════════════════════════════════════════════════════════════════════════

// Criar tabelas se não existirem
const initApiTables = async () => {
  try {
    console.log('[API Tables] Iniciando criação de tabelas...');
    
    // Verificar se tabela users existe
    const usersCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'users'
      );
    `);
    
    if (!usersCheck.rows[0].exists) {
      console.error('[API Tables] ❌ ERRO: Tabela users não existe! Execute CRIAR_TABELAS_API_TOKENS.sql primeiro.');
      return;
    }
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        token VARCHAR(64) UNIQUE NOT NULL,
        permissoes JSONB DEFAULT '["produtos:read"]'::jsonb,
        ativo BOOLEAN DEFAULT true,
        expires_at TIMESTAMP,
        ultimo_uso TIMESTAMP,
        uso_count INTEGER DEFAULT 0,
        criado_por UUID REFERENCES users(id),
        company_id UUID REFERENCES companies(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS api_access_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token_id UUID REFERENCES api_tokens(id) ON DELETE CASCADE,
        endpoint VARCHAR(255),
        method VARCHAR(10),
        ip_address VARCHAR(45),
        user_agent TEXT,
        query_params JSONB,
        response_status INTEGER,
        response_body TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      -- Adicionar coluna response_body se não existir (para tabelas já criadas)
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'api_access_logs' AND column_name = 'response_body'
        ) THEN
          ALTER TABLE api_access_logs ADD COLUMN response_body TEXT;
        END IF;
      END $$;
      
      CREATE INDEX IF NOT EXISTS idx_api_tokens_token ON api_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_api_tokens_ativo ON api_tokens(ativo);
      CREATE INDEX IF NOT EXISTS idx_api_tokens_criado_por ON api_tokens(criado_por);
      CREATE INDEX IF NOT EXISTS idx_api_access_logs_token_id ON api_access_logs(token_id);
      CREATE INDEX IF NOT EXISTS idx_api_access_logs_created_at ON api_access_logs(created_at);

      CREATE TABLE IF NOT EXISTS birthday_message_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        ativo BOOLEAN NOT NULL DEFAULT false,
        horario_envio VARCHAR(5) NOT NULL DEFAULT '09:00',
        timezone VARCHAR(64) NOT NULL DEFAULT 'America/Sao_Paulo',
        template_mensagem TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT birthday_message_settings_company_unique UNIQUE (company_id)
      );

      CREATE INDEX IF NOT EXISTS idx_birthday_message_settings_company ON birthday_message_settings(company_id);

      CREATE TABLE IF NOT EXISTS birthday_message_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
        telefone TEXT,
        mensagem_renderizada TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'agendado',
        scheduled_at TIMESTAMPTZ NOT NULL,
        sent_at TIMESTAMPTZ,
        source_date DATE NOT NULL,
        template_key VARCHAR(64) NOT NULL DEFAULT 'birthday-default',
        error_message TEXT,
        skip_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT birthday_message_jobs_status_check CHECK (status IN ('pendente', 'agendado', 'enviado', 'erro', 'cancelado')),
        CONSTRAINT birthday_message_jobs_company_cliente_date_unique UNIQUE (company_id, cliente_id, source_date)
      );

      CREATE INDEX IF NOT EXISTS idx_birthday_message_jobs_due
        ON birthday_message_jobs(status, scheduled_at)
        WHERE status IN ('pendente', 'agendado');
      CREATE INDEX IF NOT EXISTS idx_birthday_message_jobs_company_created ON birthday_message_jobs(company_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_birthday_message_jobs_company_date ON birthday_message_jobs(company_id, source_date DESC);
    `);
    
    // Verificar se as tabelas foram criadas
    const tokensCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'api_tokens'
      );
    `);
    
    const logsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'api_access_logs'
      );
    `);
    
    if (tokensCheck.rows[0].exists && logsCheck.rows[0].exists) {
      console.log('✅ Tabelas de API inicializadas com sucesso');
    } else {
      console.error('[API Tables] ❌ ERRO: Tabelas não foram criadas corretamente!');
      console.error('[API Tables] api_tokens existe:', tokensCheck.rows[0].exists);
      console.error('[API Tables] api_access_logs existe:', logsCheck.rows[0].exists);
    }
  } catch (error) {
    console.error('[API Tables] ❌ ERRO ao inicializar tabelas de API:', error);
    console.error('[API Tables] Detalhes:', error.message);
    console.error('[API Tables] Stack:', error.stack);
  }
};
initApiTables();

// GET - Listar tokens (autenticado) — só da empresa do usuário
app.get('/api/api-tokens', authenticateToken, async (req, res) => {
  try {
    if (!req.companyId) {
      return res.status(403).json({ success: false, error: 'Usuário sem empresa vinculada.' });
    }
    const result = await pool.query(`
      SELECT id, nome, descricao, token, permissoes, ativo, expires_at, ultimo_uso, uso_count, created_at
      FROM api_tokens 
      WHERE company_id = $1 OR (company_id IS NULL AND criado_por IN (SELECT id FROM users WHERE company_id = $2))
      ORDER BY created_at DESC
    `, [req.companyId, req.companyId]);
    console.log('[API Tokens] Tokens encontrados:', result.rows.length);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[API Tokens] Erro ao listar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Criar token (autenticado)
app.post('/api/api-tokens', authenticateToken, async (req, res) => {
  try {
    console.log('[API Tokens] POST /api/api-tokens - Usuário:', req.user?.id, 'Body:', req.body);
    const { nome, descricao, permissoes, expires_at } = req.body;
    
    if (!nome) {
      return res.status(400).json({ success: false, error: 'Nome é obrigatório' });
    }
    
    // Gerar token seguro
    const token = crypto.randomBytes(32).toString('hex');
    
    if (!req.companyId) {
      return res.status(403).json({ success: false, error: 'Usuário sem empresa vinculada.' });
    }
    const result = await pool.query(`
      INSERT INTO api_tokens (nome, descricao, token, permissoes, expires_at, criado_por, company_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [nome, descricao, token, JSON.stringify(permissoes || ['produtos:read']), expires_at, req.user.id, req.companyId]);
    
    console.log('[API Tokens] Token criado com sucesso:', result.rows[0].id);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[API Tokens] Erro ao criar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Atualizar token (autenticado) — só token da própria empresa
app.put('/api/api-tokens/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.companyId) return res.status(403).json({ success: false, error: 'Usuário sem empresa vinculada.' });
    const check = await pool.query('SELECT id FROM api_tokens WHERE id = $1 AND (company_id = $2 OR (company_id IS NULL AND criado_por IN (SELECT id FROM users WHERE company_id = $2)))', [id, req.companyId]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, error: 'Token não encontrado.' });
    const { nome, descricao, permissoes, ativo, expires_at } = req.body;
    
    const result = await pool.query(`
      UPDATE api_tokens 
      SET nome = COALESCE($1, nome), 
          descricao = COALESCE($2, descricao), 
          permissoes = COALESCE($3, permissoes),
          ativo = COALESCE($4, ativo),
          expires_at = $5,
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [nome, descricao, permissoes ? JSON.stringify(permissoes) : null, ativo, expires_at, id]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[API Tokens] Erro ao atualizar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Excluir token (autenticado) — só token da própria empresa
app.delete('/api/api-tokens/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.companyId) return res.status(403).json({ success: false, error: 'Usuário sem empresa vinculada.' });
    const check = await pool.query('SELECT id FROM api_tokens WHERE id = $1 AND (company_id = $2 OR (company_id IS NULL AND criado_por IN (SELECT id FROM users WHERE company_id = $2)))', [id, req.companyId]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, error: 'Token não encontrado.' });
    await pool.query(`DELETE FROM api_tokens WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Token excluído' });
  } catch (error) {
    console.error('[API Tokens] Erro ao excluir:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Logs de acesso de um token (autenticado) — só token da própria empresa
app.get('/api/api-tokens/:id/logs', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.companyId) return res.status(403).json({ success: false, error: 'Usuário sem empresa vinculada.' });
    const check = await pool.query('SELECT id FROM api_tokens WHERE id = $1 AND (company_id = $2 OR (company_id IS NULL AND criado_por IN (SELECT id FROM users WHERE company_id = $2)))', [id, req.companyId]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, error: 'Token não encontrado.' });
    const limit = parseInt(req.query.limit) || 100;
    
    const result = await pool.query(`
      SELECT * FROM api_access_logs 
      WHERE token_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `, [id, limit]);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[API Tokens] Erro ao buscar logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Logs de acesso de todos os tokens da empresa, com busca e paginação
app.get('/api/api-logs', authenticateToken, async (req, res) => {
  try {
    if (!req.companyId) return res.status(403).json({ success: false, error: 'Usuário sem empresa vinculada.' });

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const search = String(req.query.search || '').trim();
    const tokenId = String(req.query.token_id || '').trim();
    const method = String(req.query.method || '').trim().toUpperCase();
    const status = String(req.query.status || '').trim();

    const where = [
      `(t.company_id = $1 OR (t.company_id IS NULL AND t.criado_por IN (SELECT id FROM users WHERE company_id = $1)))`
    ];
    const params = [req.companyId];
    let idx = 2;

    if (tokenId && tokenId !== 'all') {
      where.push(`l.token_id = $${idx}`);
      params.push(tokenId);
      idx++;
    }

    if (method && method !== 'ALL') {
      where.push(`UPPER(l.method) = $${idx}`);
      params.push(method);
      idx++;
    }

    if (status && status !== 'all') {
      if (status === 'success') {
        where.push(`COALESCE(l.response_status, 0) >= 200 AND COALESCE(l.response_status, 0) < 300`);
      } else if (status === 'error') {
        where.push(`COALESCE(l.response_status, 0) >= 400`);
      } else if (/^\d{3}$/.test(status)) {
        where.push(`l.response_status = $${idx}`);
        params.push(parseInt(status, 10));
        idx++;
      }
    }

    if (search) {
      where.push(`(
        l.endpoint ILIKE $${idx}
        OR l.method ILIKE $${idx}
        OR l.ip_address ILIKE $${idx}
        OR l.user_agent ILIKE $${idx}
        OR l.query_params::text ILIKE $${idx}
        OR l.response_body ILIKE $${idx}
        OR t.nome ILIKE $${idx}
      )`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM api_access_logs l
       INNER JOIN api_tokens t ON t.id = l.token_id
       ${whereSql}`,
      params
    );

    const result = await pool.query(
      `SELECT
          l.*,
          t.nome AS token_nome
       FROM api_access_logs l
       INNER JOIN api_tokens t ON t.id = l.token_id
       ${whereSql}
       ORDER BY l.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    if (result.rows.length === 0 && offset === 0 && !search && !method && (!status || status === 'all') && tokenId && tokenId !== 'all') {
      const tokenResult = await pool.query(
        `SELECT id, nome, uso_count, ultimo_uso, created_at
         FROM api_tokens t
         WHERE t.id = $1
           AND (t.company_id = $2 OR (t.company_id IS NULL AND t.criado_por IN (SELECT id FROM users WHERE company_id = $2)))`,
        [tokenId, req.companyId]
      );

      const token = tokenResult.rows[0];
      if (token && Number(token.uso_count || 0) > 0) {
        return res.json({
          success: true,
          data: [{
            id: `usage-summary-${token.id}`,
            token_id: token.id,
            token_nome: token.nome,
            endpoint: 'Histórico do token',
            method: 'INFO',
            ip_address: '-',
            user_agent: 'Resumo gerado a partir do contador de uso do token',
            query_params: {
              uso_count: token.uso_count,
              ultimo_uso: token.ultimo_uso,
              observacao: 'As respostas completas passam a ser exibidas para novas chamadas registradas em api_access_logs.',
            },
            response_status: null,
            response_body: JSON.stringify({
              tipo: 'resumo_historico',
              token: token.nome,
              total_requisicoes: token.uso_count,
              ultimo_uso: token.ultimo_uso,
              aviso: 'Este token possui uso histórico, mas os detalhes por requisição não foram armazenados antes da ativação dos logs detalhados. Faça uma nova chamada na API para ver endpoint, filtros e resposta completa.',
            }),
            created_at: token.ultimo_uso || token.created_at || new Date().toISOString(),
            is_summary: true,
          }],
          total: 1,
          limit,
          offset,
        });
      }
    }

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0]?.total || '0', 10),
      limit,
      offset,
    });
  } catch (error) {
    console.error('[API Logs] Erro ao buscar logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINTS PÚBLICOS (com API Token)
// ═══════════════════════════════════════════════════════════════════════════════

function normalizeProductSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[{}[\]()"']/g, ' ')
    .replace(/[?!.:,;|/\\_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function extractProductModelSearchTerms(value) {
  const normalized = normalizeProductSearchText(value);
  if (!normalized) return [];

  const terms = new Set();
  const add = (term) => {
    const clean = normalizeProductSearchText(term)
      .replace(/\b(modelo|aparelho|celular|smartphone)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (clean.length >= 2) terms.add(clean);
  };

  const patterns = [
    /\biphone\s+(?:se\s*)?(?:\d{1,2}|x|xr|xs)(?:\s+(?:pro|max|mini|plus|ultra))*\b/gi,
    /\bipad\s+(?:\d{1,2}|air|mini|pro)(?:\s+\d{1,2})?\b/gi,
    /\bgalaxy\s+(?:a|s|m|j|note|z)\s*\d{1,3}\s*(?:e|s|plus|ultra|fe|5g)?\b/gi,
    /\bsamsung\s+(?:a|s|m|j|note|z)\s*\d{1,3}\s*(?:e|s|plus|ultra|fe|5g)?\b/gi,
    /\bmoto\s+(?:g|e)\s*\d{1,3}\s*(?:play|plus|power|stylus|5g)?\b/gi,
    /\bmotorola\s+(?:g|e)\s*\d{1,3}\s*(?:play|plus|power|stylus|5g)?\b/gi,
    /\bredmi\s+(?:note\s*)?\d{1,2}\s*(?:pro|plus|s|c|a|5g)?\b/gi,
    /\bpoco\s+[a-z]\s*\d{1,2}\s*(?:pro|plus|5g)?\b/gi,
  ];

  patterns.forEach((pattern) => {
    for (const match of normalized.matchAll(pattern)) {
      add(match[0]);
    }
  });

  if (terms.size === 0) {
    let cleaned = normalized
      .replace(/\b(quero|queria|gostaria|preciso|pode|poderia|me|passar|fazer|ver|saber|um|uma|o|a|os|as|de|da|do|das|dos|para|pra|pro|por|favor|orcamento|orcamento|preco|valor|quanto|custa|troca|trocar|trocada|conserto|reparo|arrumar|tela|display|vidro|touch|bateria|teste|listar|consulta|consultar|tem|chegou|chegar)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const keywordMatch = cleaned.match(/\b(iphone|ipad|galaxy|samsung|moto|motorola|redmi|poco)\b/);
    if (keywordMatch?.index !== undefined) {
      cleaned = cleaned.slice(keywordMatch.index).trim();
    }

    const words = cleaned.split(/\s+/).filter(Boolean).slice(0, 4).join(' ');
    add(words);
  }

  add(normalized);
  return Array.from(terms).slice(0, 5);
}

function appendProductTextSearchFilter(sql, params, paramIndex, terms, columns = ['p.modelo', 'p.nome']) {
  const searchTerms = Array.isArray(terms) ? terms.filter(Boolean) : [];
  if (searchTerms.length === 0) return { sql, paramIndex };

  const clauses = searchTerms.map((term) => {
    const placeholders = columns.map((column) => `${column} ILIKE $${paramIndex}`).join(' OR ');
    params.push(`%${term}%`);
    paramIndex++;
    return `(${placeholders})`;
  });

  return {
    sql: `${sql} AND (${clauses.join(' OR ')})`,
    paramIndex,
  };
}

// GET - Buscar produtos (API pública)
app.get('/api/v1/produtos', validateApiToken, async (req, res) => {
  try {
    const { 
      busca, 
      modelo, 
      marca, 
      grupo,
      codigo,
      referencia,
      codigo_barras,
      localizacao,
      estoque_min,
      estoque_max,
      preco_min,
      preco_max,
      ativo,
      limit = 50, 
      offset = 0,
      ordenar = 'descricao',
      ordem = 'asc'
    } = req.query;
    
    if (!req.companyId) {
      return res.status(403).json({ success: false, error: 'Token sem empresa vinculada. Associe o token a uma empresa.' });
    }
    const buscaTerms = busca ? extractProductModelSearchTerms(busca) : [];
    const modeloTerms = modelo ? extractProductModelSearchTerms(modelo) : [];

    let query = `
      SELECT 
        p.id,
        p.nome,
        COALESCE(p.valor_dinheiro_pix, 0) as valor_dinheiro_pix,
        COALESCE(p.valor_parcelado_6x, 0) as valor_parcelado_6x
      FROM produtos p
      WHERE p.company_id = $1
    `;
    const params = [req.companyId];
    let paramIndex = 2;
    
    // Filtros
    if (busca) {
      const filter = appendProductTextSearchFilter(query, params, paramIndex, buscaTerms, ['p.nome', 'p.referencia', 'p.modelo']);
      query = filter.sql;
      paramIndex = filter.paramIndex;
    }
    
    if (modelo) {
      const filter = appendProductTextSearchFilter(query, params, paramIndex, modeloTerms);
      query = filter.sql;
      paramIndex = filter.paramIndex;
    }
    
    if (marca) {
      query += ` AND p.marca ILIKE $${paramIndex}`;
      params.push(`%${marca}%`);
      paramIndex++;
    }
    
    if (grupo) {
      query += ` AND p.grupo ILIKE $${paramIndex}`;
      params.push(`%${grupo}%`);
      paramIndex++;
    }
    
    if (codigo) {
      query += ` AND p.codigo::text = $${paramIndex}`;
      params.push(codigo);
      paramIndex++;
    }
    
    if (referencia) {
      query += ` AND p.referencia ILIKE $${paramIndex}`;
      params.push(`%${referencia}%`);
      paramIndex++;
    }
    
    if (codigo_barras) {
      query += ` AND p.codigo_barras = $${paramIndex}`;
      params.push(codigo_barras);
      paramIndex++;
    }
    
    if (localizacao) {
      query += ` AND p.localizacao ILIKE $${paramIndex}`;
      params.push(`%${localizacao}%`);
      paramIndex++;
    }
    
    if (estoque_min !== undefined) {
      query += ` AND COALESCE(p.quantidade, 0) >= $${paramIndex}`;
      params.push(parseInt(estoque_min));
      paramIndex++;
    }
    
    if (estoque_max !== undefined) {
      query += ` AND COALESCE(p.quantidade, 0) <= $${paramIndex}`;
      params.push(parseInt(estoque_max));
      paramIndex++;
    }
    
    if (preco_min !== undefined) {
      query += ` AND COALESCE(p.valor_dinheiro_pix, 0) >= $${paramIndex}`;
      params.push(parseFloat(preco_min));
      paramIndex++;
    }
    
    if (preco_max !== undefined) {
      query += ` AND COALESCE(p.valor_dinheiro_pix, 0) <= $${paramIndex}`;
      params.push(parseFloat(preco_max));
      paramIndex++;
    }
    
    if (ativo !== undefined) {
      const ativoValue = ativo === 'true' || ativo === true;
      query += ` AND (p.situacao = $${paramIndex} OR UPPER(p.situacao) = $${paramIndex + 1})`;
      params.push(ativoValue ? 'ativo' : 'inativo', ativoValue ? 'ATIVO' : 'INATIVO');
      paramIndex += 2;
    }
    
    // Ordenação
    const ordenarCampos = ['nome', 'codigo', 'quantidade'];
    const ordemValida = ['asc', 'desc'];
    let campoOrdenar = ordenarCampos.includes(ordenar) ? ordenar : 'nome';
    // Mapear 'descricao' para 'nome' para compatibilidade
    if (campoOrdenar === 'descricao') campoOrdenar = 'nome';
    // Mapear 'preco_venda' para usar valor_dinheiro_pix
    let campoReal;
    if (campoOrdenar === 'preco_venda') {
      campoReal = 'COALESCE(p.valor_dinheiro_pix, 0)';
    } else {
      campoReal = `p.${campoOrdenar}`;
    }
    const direcao = ordemValida.includes(ordem.toLowerCase()) ? ordem.toUpperCase() : 'ASC';
    
    query += ` ORDER BY ${campoReal} ${direcao}`;
    
    // Paginação
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));
    
    // Executar query
    const result = await pool.query(query, params);
    
    // Construir query de count com os mesmos filtros (incluindo company_id)
    let countQuery = `SELECT COUNT(*) FROM produtos p WHERE p.company_id = $1`;
    const countParams = [req.companyId];
    let countParamIndex = 2;
    
    // Aplicar os mesmos filtros da query principal
    if (busca) {
      const filter = appendProductTextSearchFilter(countQuery, countParams, countParamIndex, buscaTerms, ['p.nome', 'p.referencia', 'p.modelo']);
      countQuery = filter.sql;
      countParamIndex = filter.paramIndex;
    }
    if (modelo) {
      const filter = appendProductTextSearchFilter(countQuery, countParams, countParamIndex, modeloTerms);
      countQuery = filter.sql;
      countParamIndex = filter.paramIndex;
    }
    if (marca) {
      countQuery += ` AND p.marca ILIKE $${countParamIndex}`;
      countParams.push(`%${marca}%`);
      countParamIndex++;
    }
    if (grupo) {
      countQuery += ` AND p.grupo ILIKE $${countParamIndex}`;
      countParams.push(`%${grupo}%`);
      countParamIndex++;
    }
    if (codigo) {
      countQuery += ` AND p.codigo::text = $${countParamIndex}`;
      countParams.push(codigo);
      countParamIndex++;
    }
    if (referencia) {
      countQuery += ` AND p.referencia ILIKE $${countParamIndex}`;
      countParams.push(`%${referencia}%`);
      countParamIndex++;
    }
    if (codigo_barras) {
      countQuery += ` AND p.codigo_barras = $${countParamIndex}`;
      countParams.push(codigo_barras);
      countParamIndex++;
    }
    if (localizacao) {
      countQuery += ` AND p.localizacao ILIKE $${countParamIndex}`;
      countParams.push(`%${localizacao}%`);
      countParamIndex++;
    }
    if (estoque_min !== undefined) {
      countQuery += ` AND COALESCE(p.quantidade, 0) >= $${countParamIndex}`;
      countParams.push(parseInt(estoque_min));
      countParamIndex++;
    }
    if (estoque_max !== undefined) {
      countQuery += ` AND COALESCE(p.quantidade, 0) <= $${countParamIndex}`;
      countParams.push(parseInt(estoque_max));
      countParamIndex++;
    }
    if (preco_min !== undefined) {
      countQuery += ` AND COALESCE(p.valor_dinheiro_pix, 0) >= $${countParamIndex}`;
      countParams.push(parseFloat(preco_min));
      countParamIndex++;
    }
    if (preco_max !== undefined) {
      countQuery += ` AND COALESCE(p.valor_dinheiro_pix, 0) <= $${countParamIndex}`;
      countParams.push(parseFloat(preco_max));
      countParamIndex++;
    }
    if (ativo !== undefined) {
      const ativoValue = ativo === 'true' || ativo === true;
      countQuery += ` AND (p.situacao = $${countParamIndex} OR UPPER(p.situacao) = $${countParamIndex + 1})`;
      countParams.push(ativoValue ? 'ativo' : 'inativo', ativoValue ? 'ATIVO' : 'INATIVO');
      countParamIndex += 2;
    }
    
    const countResult = await pool.query(countQuery, countParams);
    
    // Formato compacto para economizar tokens (sem metadados)
    const compact = req.query.compact === 'true';
    
    if (compact) {
      // Retorna apenas array de produtos com campos mínimos
      res.json(result.rows.map(p => ({
        n: p.nome, // nome abreviado
        v: parseFloat(p.valor_dinheiro_pix), // valor_dinheiro_pix
        p: parseFloat(p.valor_parcelado_6x) // valor_parcelado_6x
      })));
    } else {
      // Formato completo (padrão)
      res.json({ 
        success: true, 
        data: result.rows,
        meta: {
          total: parseInt(countResult.rows[0].count),
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: parseInt(offset) + result.rows.length < parseInt(countResult.rows[0].count)
        }
      });
    }
  } catch (error) {
    console.error('[API Produtos] Erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Buscar produto por ID (API pública) — só da empresa do token
app.get('/api/v1/produtos/:id', validateApiToken, async (req, res) => {
  try {
    if (!req.companyId) return res.status(403).json({ success: false, error: 'Token sem empresa vinculada.' });
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        p.id,
        p.nome,
        COALESCE(p.valor_dinheiro_pix, 0) as valor_dinheiro_pix,
        COALESCE(p.valor_parcelado_6x, 0) as valor_parcelado_6x
      FROM produtos p
      WHERE (p.id = $1 OR p.codigo::text = $1 OR p.codigo_barras = $1) AND p.company_id = $2
    `, [id, req.companyId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Produto não encontrado' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[API Produtos] Erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Listar marcas (API pública) — só da empresa do token
app.get('/api/v1/marcas', validateApiToken, async (req, res) => {
  try {
    if (!req.companyId) return res.status(403).json({ success: false, error: 'Token sem empresa vinculada.' });
    const result = await pool.query(`SELECT * FROM marcas WHERE company_id = $1 ORDER BY nome`, [req.companyId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[API Marcas] Erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Listar modelos (API pública) — só da empresa do token
app.get('/api/v1/modelos', validateApiToken, async (req, res) => {
  try {
    if (!req.companyId) return res.status(403).json({ success: false, error: 'Token sem empresa vinculada.' });
    const { marca_id } = req.query;
    
    let query = `SELECT mo.*, m.nome as marca_nome FROM modelos mo LEFT JOIN marcas m ON mo.marca_id = m.id WHERE mo.company_id = $1`;
    const params = [req.companyId];
    
    if (marca_id) {
      query += ` AND mo.marca_id = $2`;
      params.push(marca_id);
    }
    
    query += ` ORDER BY mo.nome`;
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[API Modelos] Erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Grupos de produtos (API pública) — só da empresa do token
app.get('/api/v1/grupos', validateApiToken, async (req, res) => {
  try {
    if (!req.companyId) return res.status(403).json({ success: false, error: 'Token sem empresa vinculada.' });
    const result = await pool.query(`
      SELECT DISTINCT grupo, COUNT(*) as quantidade
      FROM produtos 
      WHERE company_id = $1 AND grupo IS NOT NULL AND grupo != ''
      GROUP BY grupo
      ORDER BY grupo
    `, [req.companyId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[API Grupos] Erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Documentação da API
app.get('/api/v1/docs', (req, res) => {
  res.json({
    name: "PrimeCamp API",
    version: "1.0.0",
    description: "API para integração com sistemas externos e agentes de IA",
    base_url: "https://api.ativafix.com/api/v1",
    authentication: {
      type: "Bearer Token",
      header: "Authorization: Bearer <seu_token>",
      how_to_get: "Acesse /admin/integracoes no painel e gere um token de API"
    },
    endpoints: [
      {
        method: "GET",
        path: "/produtos",
        description: "Buscar produtos com filtros",
        parameters: {
          busca: "Busca geral. Aceita frase natural e extrai termos úteis, como 'tela iphone 11'",
          modelo: "Filtrar por modelo do aparelho. Aceita frase natural, como 'quero orçamento para troca de tela do iphone 11'",
          marca: "Filtrar por marca",
          grupo: "Filtrar por grupo/categoria",
          codigo: "Buscar por código exato",
          referencia: "Buscar por referência",
          codigo_barras: "Buscar por código de barras",
          localizacao: "Filtrar por localização no estoque",
          estoque_min: "Estoque mínimo",
          estoque_max: "Estoque máximo",
          preco_min: "Preço mínimo",
          preco_max: "Preço máximo",
          ativo: "true/false - filtrar por ativos/inativos",
          limit: "Quantidade de resultados (default: 50, max: 100)",
          offset: "Offset para paginação",
          ordenar: "Campo para ordenação (descricao, codigo, preco_venda, quantidade)",
          ordem: "Direção da ordenação (asc, desc)"
        },
        example: "/produtos?modelo=quero%20orcamento%20para%20troca%20de%20tela%20do%20iphone%2011&limit=10"
      },
      {
        method: "GET",
        path: "/produtos/:id",
        description: "Buscar produto por ID, código ou código de barras"
      },
      {
        method: "GET",
        path: "/marcas",
        description: "Listar todas as marcas"
      },
      {
        method: "GET",
        path: "/modelos",
        description: "Listar modelos (use ?marca_id=UUID para filtrar)"
      },
      {
        method: "GET",
        path: "/grupos",
        description: "Listar grupos/categorias de produtos"
      }
    ],
    examples: {
      curl: `curl -X GET "https://api.ativafix.com/api/v1/produtos?modelo=iPhone%2015" -H "Authorization: Bearer SEU_TOKEN"`,
      javascript: `fetch('https://api.ativafix.com/api/v1/produtos?modelo=iPhone 15', {
  headers: { 'Authorization': 'Bearer SEU_TOKEN' }
}).then(r => r.json()).then(console.log)`,
      ai_agent: `Use esta API quando o cliente perguntar sobre preços, disponibilidade ou características de produtos. Exemplo: "Qual o preço da tela do iPhone 11?" -> GET /produtos?modelo=quero%20orcamento%20para%20troca%20de%20tela%20do%20iphone%2011`
    }
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📊 Conectado ao PostgreSQL: ${process.env.DB_HOST}`);
  console.log(`💾 Database: ${process.env.DB_NAME}`);
});

