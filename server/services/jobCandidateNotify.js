/**
 * Notifica administradores (WhatsApp via Ativa CRM) quando uma candidatura é concluída.
 * Usa o Painel de Alertas: alerta `rh.nova_candidatura`, token em integration_settings e números em alert_panel_config.
 */

import { dispatch, createWhatsAppSender } from './alertService.js';

const WA_BLOCK_MAX = 3600;

/** Texto legível da pergunta (JSON de job_surveys pode usar title, question, label, etc.). */
function questionDisplayLabel(q, indexZeroBased) {
  const fromFields = [q.title, q.question, q.label, q.text, q.name, q.prompt];
  for (const c of fromFields) {
    if (c != null && String(c).trim()) return String(c).trim();
  }
  const sid = q.id != null ? String(q.id).trim() : '';
  // IDs tipo timestamp (só dígitos) não são enunciados — evita "• *1754930438559*"
  if (sid && /^\d{8,}$/.test(sid)) {
    return `Pergunta ${indexZeroBased + 1}`;
  }
  if (sid) return sid;
  return `Pergunta ${indexZeroBased + 1}`;
}

/**
 * Monta texto pergunta → resposta a partir de job_surveys.questions e do JSON responses.
 */
export function formatQuestionsAnswersForWhatsApp(surveyRow, responsesObj) {
  const raw = responsesObj && typeof responsesObj === 'object' ? responsesObj : {};
  const questions = Array.isArray(surveyRow?.questions) ? surveyRow.questions : [];

  if (questions.length === 0) {
    const entries = Object.entries(raw);
    if (entries.length === 0) return '(nenhuma resposta registrada)';
    return entries
      .map(([k, v], i) => {
        const val = Array.isArray(v) ? v.join(', ') : String(v ?? '').trim();
        const keyLabel = /^\d{8,}$/.test(String(k).trim()) ? `Pergunta ${i + 1}` : k;
        return `• *${keyLabel}*\n${val || '(vazio)'}`;
      })
      .join('\n\n');
  }

  const parts = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const id = q.id;
    const title = questionDisplayLabel(q, i);
    let val = raw[id];
    if (val == null && id != null) val = raw[String(id)];
    if (val == null || val === '') val = '(sem resposta)';
    else if (Array.isArray(val)) val = val.join(', ');
    else val = String(val).trim() || '(sem resposta)';
    parts.push(`• *${title}*\n${val}`);
  }
  return parts.join('\n\n');
}

function parseResponsesColumn(responses) {
  if (responses == null) return {};
  if (typeof responses === 'object' && !Array.isArray(responses)) return responses;
  if (typeof responses === 'string') {
    try {
      return JSON.parse(responses);
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Dispara alerta rh.nova_candidatura (não bloqueia; erros só em log).
 * @param {import('pg').Pool} pool
 * @param {{ surveyRow: Record<string, any>, responseRow: Record<string, any> }} params
 */
export async function notifyAdminsNewJobCandidate(pool, { surveyRow, responseRow }) {
  const companyId = surveyRow?.company_id || responseRow?.company_id;
  if (!companyId) {
    console.warn('[RH] notifyAdminsNewJobCandidate: sem company_id');
    return;
  }

  const surveyNorm = { ...surveyRow };
  let q = surveyNorm.questions;
  if (typeof q === 'string') {
    try {
      q = JSON.parse(q);
    } catch {
      q = [];
    }
  }
  if (!Array.isArray(q)) q = [];
  surveyNorm.questions = q;

  const responsesObj = parseResponsesColumn(responseRow.responses);
  let block = formatQuestionsAnswersForWhatsApp(surveyNorm, responsesObj);
  if (block.length > WA_BLOCK_MAX) {
    block = `${block.slice(0, WA_BLOCK_MAX - 60)}\n\n...(texto truncado — ver candidato no admin)`;
  }

  try {
    const sender = createWhatsAppSender(pool, companyId);
    const result = await dispatch({
      companyId,
      codigoAlerta: 'rh.nova_candidatura',
      payload: {
        vaga_titulo: surveyNorm.title || surveyNorm.position_title || 'Vaga',
        vaga_cargo: surveyNorm.position_title || '',
        empresa: surveyNorm.company_name || '',
        candidato_nome: responseRow.name || '',
        candidato_email: responseRow.email || '',
        candidato_telefone: responseRow.phone != null ? String(responseRow.phone) : '',
        candidato_whatsapp: responseRow.whatsapp != null ? String(responseRow.whatsapp) : '',
        candidato_idade: responseRow.age != null ? String(responseRow.age) : '',
        candidato_cep: responseRow.cep != null ? String(responseRow.cep) : '',
        candidato_endereco: responseRow.address != null ? String(responseRow.address) : '',
        candidato_instagram: responseRow.instagram != null ? String(responseRow.instagram) : '',
        candidato_linkedin: responseRow.linkedin != null ? String(responseRow.linkedin) : '',
        protocolo_id: String(responseRow.id),
        perguntas_respostas: block,
      },
      sendMessage: sender,
      db: pool,
    });
    if (!result.sent) {
      console.warn('[RH] notifyAdminsNewJobCandidate não enviado:', result.error || result);
    }
  } catch (e) {
    console.error('[RH] notifyAdminsNewJobCandidate:', e?.message || e);
  }
}
