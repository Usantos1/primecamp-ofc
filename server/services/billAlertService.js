import {
  createWhatsAppSender,
  dispatch,
} from './alertService.js';

const DUE_SOON_DAYS = 3;

async function hasColumn(client, tableName, columnName) {
  const result = await client.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = $2
     LIMIT 1`,
    [tableName, columnName]
  );
  return result.rows.length > 0;
}

function formatDateBR(dateValue) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return String(dateValue);
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function buildPayload(bill) {
  return {
    bill_id: String(bill.id),
    descricao: bill.description || 'Conta a pagar',
    valor: bill.amount,
    data_vencimento: formatDateBR(bill.due_date),
    fornecedor: bill.supplier || '',
  };
}

async function findBillsForAlert(client, companyId, codigoAlerta, conditionSql, limit) {
  return (await client.query(
    `SELECT b.id, b.company_id, b.description, b.amount, b.due_date, b.supplier
     FROM public.bills_to_pay b
     WHERE b.company_id = $1
       AND b.status NOT IN ('pago', 'cancelado')
       AND b.due_date IS NOT NULL
       AND ${conditionSql}
       AND NOT EXISTS (
         SELECT 1
         FROM public.alert_logs l
         WHERE l.company_id = b.company_id
           AND l.codigo_alerta = $2
           AND l.status = 'enviado'
           AND l.payload->>'bill_id' = b.id::text
       )
     ORDER BY b.due_date ASC, b.created_at ASC
     LIMIT $3`,
    [companyId, codigoAlerta, limit]
  )).rows;
}

async function dispatchBillAlertsForCompany(client, companyId, batchSize) {
  const sender = createWhatsAppSender(client, companyId, { tokenKind: 'sensitive' });
  const results = { processed: 0, sent: 0, errors: 0 };

  const dueSoonBills = await findBillsForAlert(
    client,
    companyId,
    'financeiro.conta_pagar_vencendo',
    `(b.due_date::date >= CURRENT_DATE AND b.due_date::date <= CURRENT_DATE + INTERVAL '${DUE_SOON_DAYS} days')`,
    batchSize
  );

  const overdueBills = await findBillsForAlert(
    client,
    companyId,
    'financeiro.conta_pagar_atrasada',
    `b.due_date::date < CURRENT_DATE`,
    batchSize
  );

  const jobs = [
    ...dueSoonBills.map((bill) => ({ codigoAlerta: 'financeiro.conta_pagar_vencendo', bill })),
    ...overdueBills.map((bill) => ({ codigoAlerta: 'financeiro.conta_pagar_atrasada', bill })),
  ];

  for (const job of jobs.slice(0, batchSize)) {
    results.processed += 1;
    const result = await dispatch({
      companyId,
      codigoAlerta: job.codigoAlerta,
      payload: buildPayload(job.bill),
      sendMessage: sender,
      db: client,
    });

    if (result.sent) {
      results.sent += 1;
    } else {
      results.errors += 1;
      console.warn('[Bill Alert Worker] Alerta não enviado:', {
        companyId,
        codigoAlerta: job.codigoAlerta,
        billId: job.bill.id,
        error: result.error,
      });
    }
  }

  return results;
}

export async function processDueBillAlerts(pool, batchSize = 50) {
  const client = await pool.connect();
  try {
    const hasCompanyId = await hasColumn(client, 'bills_to_pay', 'company_id');
    if (!hasCompanyId) {
      return { processed: 0, sent: 0, errors: 0, skipped: 'bills_to_pay sem company_id' };
    }

    const companies = (await client.query(
      `SELECT DISTINCT company_id
       FROM public.alert_panel_config
       WHERE ativo = true
       ORDER BY company_id`
    )).rows;

    const totals = { processed: 0, sent: 0, errors: 0 };
    for (const row of companies) {
      const result = await dispatchBillAlertsForCompany(client, row.company_id, batchSize);
      totals.processed += result.processed;
      totals.sent += result.sent;
      totals.errors += result.errors;
    }
    return totals;
  } finally {
    client.release();
  }
}
