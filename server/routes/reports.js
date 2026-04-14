/**
 * Relatórios agregados por empresa (company_id do JWT / users).
 * Excluídos por decisão de produto: ponto eletrônico, NPS, orçamentos/quotes.
 */
import express from 'express';
import pkg from 'pg';

const { Pool } = pkg;
const router = express.Router();

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

function parseRange(req) {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return { error: 'Parâmetros startDate e endDate são obrigatórios (YYYY-MM-DD).' };
  }
  const start = `${String(startDate).slice(0, 10)}T00:00:00.000Z`;
  const end = `${String(endDate).slice(0, 10)}T23:59:59.999Z`;
  return { start, end };
}

function requireCompany(req, res) {
  if (!req.companyId) {
    res.status(403).json({ success: false, error: 'Empresa não identificada.' });
    return null;
  }
  return req.companyId;
}

function requireAdmin(req, res) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Acesso restrito a administradores.' });
    return false;
  }
  return true;
}

function relationMissing(error, relationName) {
  const msg = String(error?.message || error || '');
  return msg.includes('does not exist') && msg.includes(relationName);
}

function columnMissing(error, columnName) {
  const msg = String(error?.message || error || '');
  return msg.includes('does not exist') && msg.includes(columnName);
}

/** Formas de pagamento (payments confirmados em vendas pagas no período da venda) */
router.get('/payment-methods', async (req, res) => {
  const companyId = requireCompany(req, res);
  if (!companyId) return;
  const range = parseRange(req);
  if (range.error) return res.status(400).json({ success: false, error: range.error });

  try {
    const result = await pool.query(
      `SELECT p.forma_pagamento,
              COUNT(*)::int AS payment_count,
              COALESCE(SUM(p.valor), 0)::numeric AS total_amount
       FROM payments p
       INNER JOIN sales s ON s.id = p.sale_id
       WHERE s.company_id = $1
         AND p.status = 'confirmed'
         AND s.status IN ('paid', 'partial')
         AND s.created_at >= $2::timestamptz
         AND s.created_at <= $3::timestamptz
       GROUP BY p.forma_pagamento
       ORDER BY total_amount DESC`,
      [companyId, range.start, range.end]
    );
    res.json({ success: true, rows: result.rows });
  } catch (e) {
    console.error('[Reports] payment-methods:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/** Produtos mais vendidos (itens de vendas pagas) */
router.get('/top-products', async (req, res) => {
  const companyId = requireCompany(req, res);
  if (!companyId) return;
  const range = parseRange(req);
  if (range.error) return res.status(400).json({ success: false, error: range.error });
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 200);

  try {
    const result = await pool.query(
      `SELECT si.produto_id,
              MAX(si.produto_nome) AS produto_nome,
              SUM(si.quantidade)::numeric AS qty,
              SUM(si.valor_total)::numeric AS revenue
       FROM sale_items si
       INNER JOIN sales s ON s.id = si.sale_id
       WHERE s.company_id = $1
         AND s.status IN ('paid', 'partial')
         AND s.created_at >= $2::timestamptz
         AND s.created_at <= $3::timestamptz
       GROUP BY si.produto_id
       ORDER BY revenue DESC NULLS LAST
       LIMIT $4`,
      [companyId, range.start, range.end, limit]
    );
    res.json({ success: true, rows: result.rows });
  } catch (e) {
    console.error('[Reports] top-products:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * Pedidos de compra (tabela pedidos) + agregação de peças em OS por fornecedor.
 * Observação: pedidos não têm fornecedor no modelo atual; fornecedor vem de os_items.
 */
router.get('/purchases-suppliers', async (req, res) => {
  const companyId = requireCompany(req, res);
  if (!companyId) return;
  const range = parseRange(req);
  if (range.error) return res.status(400).json({ success: false, error: range.error });

  try {
    const pedidos = await pool.query(
      `SELECT p.id,
              p.nome,
              p.recebido,
              p.created_at,
              COALESCE(SUM(pi.quantidade * COALESCE(pi.valor_compra, 0)), 0)::numeric AS valor_compra_total
       FROM pedidos p
       LEFT JOIN pedido_itens pi ON pi.pedido_id = p.id
       WHERE p.company_id = $1
         AND p.created_at >= $2::timestamptz
         AND p.created_at <= $3::timestamptz
       GROUP BY p.id, p.nome, p.recebido, p.created_at
       ORDER BY p.created_at DESC
       LIMIT 500`,
      [companyId, range.start, range.end]
    );

    let fornecedoresOs;
    try {
      fornecedoresOs = await pool.query(
        `SELECT COALESCE(f.nome, NULLIF(TRIM(oi.fornecedor_nome), ''), '(Sem fornecedor)') AS fornecedor,
                COUNT(oi.id)::int AS itens_count,
                COALESCE(SUM(oi.valor_total), 0)::numeric AS valor_total
         FROM os_items oi
         INNER JOIN ordens_servico o ON o.id = oi.ordem_servico_id
         LEFT JOIN fornecedores f ON f.id = oi.fornecedor_id AND (f.company_id = $1 OR f.company_id IS NULL)
         WHERE o.company_id = $1
           AND oi.created_at >= $2::timestamptz
           AND oi.created_at <= $3::timestamptz
         GROUP BY 1
         ORDER BY valor_total DESC`,
        [companyId, range.start, range.end]
      );
    } catch (e) {
      if (!columnMissing(e, 'fornecedor_nome')) throw e;
      fornecedoresOs = await pool.query(
        `SELECT COALESCE(f.nome, '(Sem fornecedor)') AS fornecedor,
                COUNT(oi.id)::int AS itens_count,
                COALESCE(SUM(oi.valor_total), 0)::numeric AS valor_total
         FROM os_items oi
         INNER JOIN ordens_servico o ON o.id = oi.ordem_servico_id
         LEFT JOIN fornecedores f ON f.id = oi.fornecedor_id AND (f.company_id = $1 OR f.company_id IS NULL)
         WHERE o.company_id = $1
           AND oi.created_at >= $2::timestamptz
           AND oi.created_at <= $3::timestamptz
         GROUP BY 1
         ORDER BY valor_total DESC`,
        [companyId, range.start, range.end]
      );
    }

    res.json({
      success: true,
      pedidos: pedidos.rows,
      fornecedores_os: fornecedoresOs.rows,
    });
  } catch (e) {
    console.error('[Reports] purchases-suppliers:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/** Movimentações de estoque (via produtos da empresa) */
router.get('/stock-movements', async (req, res) => {
  const companyId = requireCompany(req, res);
  if (!companyId) return;
  const range = parseRange(req);
  if (range.error) return res.status(400).json({ success: false, error: range.error });
  const limit = Math.min(parseInt(req.query.limit, 10) || 300, 1000);

  try {
    const result = await pool.query(
      `SELECT pm.id,
              pm.tipo,
              pm.motivo,
              pm.quantidade_delta,
              pm.quantidade_antes,
              pm.quantidade_depois,
              pm.created_at,
              pm.user_nome,
              p.nome AS produto_nome
       FROM produto_movimentacoes pm
       INNER JOIN produtos p ON p.id = pm.produto_id
       WHERE p.company_id = $1
         AND pm.created_at >= $2::timestamptz
         AND pm.created_at <= $3::timestamptz
       ORDER BY pm.created_at DESC
       LIMIT $4`,
      [companyId, range.start, range.end, limit]
    );
    res.json({ success: true, rows: result.rows });
  } catch (e) {
    console.error('[Reports] stock-movements:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/** Ordens de serviço: contagem por status no período (data de criação da OS) */
router.get('/os-overview', async (req, res) => {
  const companyId = requireCompany(req, res);
  if (!companyId) return;
  const range = parseRange(req);
  if (range.error) return res.status(400).json({ success: false, error: range.error });

  try {
    const byStatus = await pool.query(
      `SELECT COALESCE(NULLIF(TRIM(status), ''), '(sem status)') AS status,
              COUNT(*)::int AS cnt
       FROM ordens_servico
       WHERE company_id = $1
         AND created_at >= $2::timestamptz
         AND created_at <= $3::timestamptz
       GROUP BY 1
       ORDER BY cnt DESC`,
      [companyId, range.start, range.end]
    );

    const totals = await pool.query(
      `SELECT COUNT(*)::int AS total_os,
              COALESCE(SUM(COALESCE(valor_total, 0)), 0)::numeric AS valor_total_orcado
       FROM ordens_servico
       WHERE company_id = $1
         AND created_at >= $2::timestamptz
         AND created_at <= $3::timestamptz`,
      [companyId, range.start, range.end]
    );

    res.json({
      success: true,
      by_status: byStatus.rows,
      totals: totals.rows[0] || { total_os: 0, valor_total_orcado: 0 },
    });
  } catch (e) {
    console.error('[Reports] os-overview:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/** Devoluções agregadas */
router.get('/refunds-summary', async (req, res) => {
  const companyId = requireCompany(req, res);
  if (!companyId) return;
  const range = parseRange(req);
  if (range.error) return res.status(400).json({ success: false, error: range.error });

  try {
    const byStatus = await pool.query(
      `SELECT status,
              COUNT(*)::int AS cnt,
              COALESCE(SUM(total_refund_value), 0)::numeric AS valor
       FROM refunds
       WHERE company_id = $1
         AND created_at >= $2::timestamptz
         AND created_at <= $3::timestamptz
       GROUP BY status
       ORDER BY valor DESC`,
      [companyId, range.start, range.end]
    );

    const byReason = await pool.query(
      `SELECT reason,
              COUNT(*)::int AS cnt,
              COALESCE(SUM(total_refund_value), 0)::numeric AS valor
       FROM refunds
       WHERE company_id = $1
         AND created_at >= $2::timestamptz
         AND created_at <= $3::timestamptz
       GROUP BY reason
       ORDER BY cnt DESC
       LIMIT 30`,
      [companyId, range.start, range.end]
    );

    res.json({ success: true, by_status: byStatus.rows, by_reason: byReason.rows });
  } catch (e) {
    console.error('[Reports] refunds-summary:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/** Clientes: novos cadastros e compradores distintos no período */
router.get('/clients-summary', async (req, res) => {
  const companyId = requireCompany(req, res);
  if (!companyId) return;
  const range = parseRange(req);
  if (range.error) return res.status(400).json({ success: false, error: range.error });

  try {
    const novos = await pool.query(
      `SELECT COUNT(*)::int AS novos_clientes
       FROM clientes
       WHERE company_id = $1
         AND created_at >= $2::timestamptz
         AND created_at <= $3::timestamptz`,
      [companyId, range.start, range.end]
    );

    const compradores = await pool.query(
      `SELECT COUNT(DISTINCT s.cliente_id)::int AS clientes_compra_distintos,
              COUNT(*)::int AS vendas_finalizadas
       FROM sales s
       WHERE s.company_id = $1
         AND s.status IN ('paid', 'partial')
         AND s.cliente_id IS NOT NULL
         AND s.created_at >= $2::timestamptz
         AND s.created_at <= $3::timestamptz`,
      [companyId, range.start, range.end]
    );

    res.json({
      success: true,
      novos_clientes: novos.rows[0]?.novos_clientes ?? 0,
      clientes_compra_distintos: compradores.rows[0]?.clientes_compra_distintos ?? 0,
      vendas_finalizadas: compradores.rows[0]?.vendas_finalizadas ?? 0,
    });
  } catch (e) {
    console.error('[Reports] clients-summary:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/** Caixa: sessões e movimentações no período */
router.get('/cash-overview', async (req, res) => {
  const companyId = requireCompany(req, res);
  if (!companyId) return;
  const range = parseRange(req);
  if (range.error) return res.status(400).json({ success: false, error: range.error });

  try {
    let totals = {
      total_sessions: 0,
      open_sessions: 0,
      closed_sessions: 0,
      total_inicial: 0,
      total_final: 0,
      total_esperado: 0,
      total_divergencia: 0,
    };
    let byOperator = [];
    let byMovementType = [];
    let recentSessions = [];

    try {
      const [totalsRes, byOperatorRes, recentSessionsRes] = await Promise.all([
        pool.query(
          `SELECT COUNT(*)::int AS total_sessions,
                  COUNT(*) FILTER (WHERE status = 'open')::int AS open_sessions,
                  COUNT(*) FILTER (WHERE status = 'closed')::int AS closed_sessions,
                  COALESCE(SUM(valor_inicial), 0)::numeric AS total_inicial,
                  COALESCE(SUM(valor_final), 0)::numeric AS total_final,
                  COALESCE(SUM(valor_esperado), 0)::numeric AS total_esperado,
                  COALESCE(SUM(divergencia), 0)::numeric AS total_divergencia
           FROM cash_register_sessions
           WHERE company_id = $1
             AND opened_at >= $2::timestamptz
             AND opened_at <= $3::timestamptz`,
          [companyId, range.start, range.end]
        ),
        pool.query(
          `SELECT COALESCE(NULLIF(TRIM(operador_nome), ''), '(sem operador)') AS operador,
                  COUNT(*)::int AS sessions_count,
                  COUNT(*) FILTER (WHERE status = 'open')::int AS open_count,
                  COUNT(*) FILTER (WHERE status = 'closed')::int AS closed_count,
                  COALESCE(SUM(valor_inicial), 0)::numeric AS valor_inicial,
                  COALESCE(SUM(valor_final), 0)::numeric AS valor_final,
                  COALESCE(SUM(valor_esperado), 0)::numeric AS valor_esperado,
                  COALESCE(SUM(divergencia), 0)::numeric AS divergencia
           FROM cash_register_sessions
           WHERE company_id = $1
             AND opened_at >= $2::timestamptz
             AND opened_at <= $3::timestamptz
           GROUP BY 1
           ORDER BY valor_final DESC, sessions_count DESC
           LIMIT 50`,
          [companyId, range.start, range.end]
        ),
        pool.query(
          `SELECT id, numero, operador_nome, status, opened_at, closed_at,
                  valor_inicial, valor_final, valor_esperado, divergencia
           FROM cash_register_sessions
           WHERE company_id = $1
             AND opened_at >= $2::timestamptz
             AND opened_at <= $3::timestamptz
           ORDER BY opened_at DESC
           LIMIT 100`,
          [companyId, range.start, range.end]
        ),
      ]);
      totals = totalsRes.rows[0] || totals;
      byOperator = byOperatorRes.rows;
      recentSessions = recentSessionsRes.rows;
    } catch (e) {
      if (
        !relationMissing(e, 'cash_register_sessions') &&
        !relationMissing(e, 'cash_register_session')
      ) {
        throw e;
      }
    }

    try {
      const movementRes = await pool.query(
        `SELECT tipo,
                COUNT(*)::int AS cnt,
                COALESCE(SUM(valor), 0)::numeric AS total
         FROM cash_movements
         WHERE company_id = $1
           AND created_at >= $2::timestamptz
           AND created_at <= $3::timestamptz
         GROUP BY tipo
         ORDER BY total DESC`,
        [companyId, range.start, range.end]
      );
      byMovementType = movementRes.rows;
    } catch (e) {
      if (!relationMissing(e, 'cash_movements')) throw e;
    }

    res.json({
      success: true,
      totals,
      by_operator: byOperator,
      by_movement_type: byMovementType,
      recent_sessions: recentSessions,
    });
  } catch (e) {
    console.error('[Reports] cash-overview:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/** Cancelamentos: vendas canceladas + solicitações de cancelamento */
router.get('/sales-cancellations', async (req, res) => {
  const companyId = requireCompany(req, res);
  if (!companyId) return;
  const range = parseRange(req);
  if (range.error) return res.status(400).json({ success: false, error: range.error });

  try {
    const canceledSales = await pool.query(
      `SELECT COUNT(*)::int AS canceled_sales,
              COALESCE(SUM(total), 0)::numeric AS canceled_total
       FROM sales
       WHERE company_id = $1
         AND status = 'canceled'
         AND canceled_at IS NOT NULL
         AND canceled_at >= $2::timestamptz
         AND canceled_at <= $3::timestamptz`,
      [companyId, range.start, range.end]
    );

    const salesByReason = await pool.query(
      `SELECT COALESCE(NULLIF(TRIM(cancel_reason), ''), '(sem motivo informado)') AS reason,
              COUNT(*)::int AS cnt,
              COALESCE(SUM(total), 0)::numeric AS valor
       FROM sales
       WHERE company_id = $1
         AND status = 'canceled'
         AND canceled_at IS NOT NULL
         AND canceled_at >= $2::timestamptz
         AND canceled_at <= $3::timestamptz
       GROUP BY 1
       ORDER BY cnt DESC, valor DESC
       LIMIT 20`,
      [companyId, range.start, range.end]
    );

    const recentCanceledSales = await pool.query(
      `SELECT id, numero, cliente_nome, vendedor_nome, cancel_reason, canceled_at, total
       FROM sales
       WHERE company_id = $1
         AND status = 'canceled'
         AND canceled_at IS NOT NULL
         AND canceled_at >= $2::timestamptz
         AND canceled_at <= $3::timestamptz
       ORDER BY canceled_at DESC
       LIMIT 100`,
      [companyId, range.start, range.end]
    );

    let requestsTotals = {
      total_requests: 0,
      pending_requests: 0,
      approved_requests: 0,
      rejected_requests: 0,
    };
    let requestsByStatus = [];
    let requestReasons = [];

    try {
      const [requestsTotalsRes, requestsByStatusRes, requestReasonsRes] = await Promise.all([
        pool.query(
          `SELECT COUNT(*)::int AS total_requests,
                  COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_requests,
                  COUNT(*) FILTER (WHERE status = 'approved')::int AS approved_requests,
                  COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected_requests
           FROM sale_cancel_requests scr
           INNER JOIN sales s ON s.id = scr.sale_id
           WHERE s.company_id = $1
             AND scr.created_at >= $2::timestamptz
             AND scr.created_at <= $3::timestamptz`,
          [companyId, range.start, range.end]
        ),
        pool.query(
          `SELECT status,
                  COUNT(*)::int AS cnt
           FROM sale_cancel_requests scr
           INNER JOIN sales s ON s.id = scr.sale_id
           WHERE s.company_id = $1
             AND scr.created_at >= $2::timestamptz
             AND scr.created_at <= $3::timestamptz
           GROUP BY status
           ORDER BY cnt DESC`,
          [companyId, range.start, range.end]
        ),
        pool.query(
          `SELECT COALESCE(NULLIF(TRIM(motivo), ''), '(sem motivo informado)') AS reason,
                  COUNT(*)::int AS cnt
           FROM sale_cancel_requests scr
           INNER JOIN sales s ON s.id = scr.sale_id
           WHERE s.company_id = $1
             AND scr.created_at >= $2::timestamptz
             AND scr.created_at <= $3::timestamptz
           GROUP BY 1
           ORDER BY cnt DESC
           LIMIT 20`,
          [companyId, range.start, range.end]
        ),
      ]);
      requestsTotals = requestsTotalsRes.rows[0] || requestsTotals;
      requestsByStatus = requestsByStatusRes.rows;
      requestReasons = requestReasonsRes.rows;
    } catch (e) {
      if (!relationMissing(e, 'sale_cancel_requests')) throw e;
    }

    res.json({
      success: true,
      totals: {
        ...requestsTotals,
        canceled_sales: canceledSales.rows[0]?.canceled_sales ?? 0,
        canceled_total: canceledSales.rows[0]?.canceled_total ?? 0,
      },
      by_reason: salesByReason.rows,
      recent_canceled_sales: recentCanceledSales.rows,
      request_status: requestsByStatus,
      request_reasons: requestReasons,
    });
  } catch (e) {
    console.error('[Reports] sales-cancellations:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/** Pós-venda: fila/histórico de follow-up WhatsApp por OS */
router.get('/post-sales-followup', async (req, res) => {
  const companyId = requireCompany(req, res);
  if (!companyId) return;
  const range = parseRange(req);
  if (range.error) return res.status(400).json({ success: false, error: range.error });

  try {
    let totals = {
      total_jobs: 0,
      sent_jobs: 0,
      pending_jobs: 0,
      error_jobs: 0,
      cancelled_jobs: 0,
    };
    let byStatus = [];
    let byRule = [];
    let recentJobs = [];

    try {
      const [totalsRes, byStatusRes, byRuleRes, recentJobsRes] = await Promise.all([
        pool.query(
          `SELECT COUNT(*)::int AS total_jobs,
                  COUNT(*) FILTER (WHERE status = 'enviado')::int AS sent_jobs,
                  COUNT(*) FILTER (WHERE status IN ('pendente', 'agendado'))::int AS pending_jobs,
                  COUNT(*) FILTER (WHERE status = 'erro')::int AS error_jobs,
                  COUNT(*) FILTER (WHERE status = 'cancelado')::int AS cancelled_jobs
           FROM os_pos_venda_followup_jobs
           WHERE company_id = $1
             AND created_at >= $2::timestamptz
             AND created_at <= $3::timestamptz`,
          [companyId, range.start, range.end]
        ),
        pool.query(
          `SELECT status,
                  COUNT(*)::int AS cnt
           FROM os_pos_venda_followup_jobs
           WHERE company_id = $1
             AND created_at >= $2::timestamptz
             AND created_at <= $3::timestamptz
           GROUP BY status
           ORDER BY cnt DESC`,
          [companyId, range.start, range.end]
        ),
        pool.query(
          `SELECT tipo_regra_envio,
                  COUNT(*)::int AS cnt
           FROM os_pos_venda_followup_jobs
           WHERE company_id = $1
             AND created_at >= $2::timestamptz
             AND created_at <= $3::timestamptz
           GROUP BY tipo_regra_envio
           ORDER BY cnt DESC`,
          [companyId, range.start, range.end]
        ),
        pool.query(
          `SELECT id, ordem_servico_id, telefone, status, tipo_regra_envio,
                  scheduled_at, sent_at, faturado_at, error_message, skip_reason,
                  random_delay_seconds, created_at
           FROM os_pos_venda_followup_jobs
           WHERE company_id = $1
             AND created_at >= $2::timestamptz
             AND created_at <= $3::timestamptz
           ORDER BY created_at DESC
           LIMIT 100`,
          [companyId, range.start, range.end]
        ),
      ]);
      totals = totalsRes.rows[0] || totals;
      byStatus = byStatusRes.rows;
      byRule = byRuleRes.rows;
      recentJobs = recentJobsRes.rows;
    } catch (e) {
      if (!relationMissing(e, 'os_pos_venda_followup_jobs')) throw e;
    }

    res.json({
      success: true,
      totals,
      by_status: byStatus,
      by_rule: byRule,
      recent_jobs: recentJobs,
    });
  } catch (e) {
    console.error('[Reports] post-sales-followup:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/** Atividade / auditoria resumida (apenas admin) */
router.get('/audit-activity', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const companyId = requireCompany(req, res);
  if (!companyId) return;
  const range = parseRange(req);
  if (range.error) return res.status(400).json({ success: false, error: range.error });

  try {
    let activity = { rows: [] };
    let audit = { rows: [] };

    try {
      activity = await pool.query(
        `SELECT COALESCE(NULLIF(TRIM(action), ''), '(sem ação)') AS tipo,
                COUNT(*)::int AS cnt
         FROM user_activity_logs
         WHERE company_id = $1
           AND created_at >= $2::timestamptz
           AND created_at <= $3::timestamptz
         GROUP BY 1
         ORDER BY cnt DESC
         LIMIT 40`,
        [companyId, range.start, range.end]
      );
    } catch (e) {
      const msg = String(e.message || e);
      if (!msg.includes('user_activity_logs') && !msg.includes('does not exist')) throw e;
    }

    try {
      audit = await pool.query(
        `SELECT COALESCE(action, entity_type, '(registro)') AS tipo,
                COUNT(*)::int AS cnt
         FROM audit_logs
         WHERE company_id = $1
           AND created_at >= $2::timestamptz
           AND created_at <= $3::timestamptz
         GROUP BY 1
         ORDER BY cnt DESC
         LIMIT 40`,
        [companyId, range.start, range.end]
      );
    } catch (e) {
      const msg = String(e.message || e);
      if (!msg.includes('audit_logs') && !msg.includes('does not exist')) throw e;
    }

    res.json({
      success: true,
      user_activity: activity.rows,
      audit_logs: audit.rows,
    });
  } catch (e) {
    console.error('[Reports] audit-activity:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
