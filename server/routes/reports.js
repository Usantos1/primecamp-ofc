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

    const fornecedoresOs = await pool.query(
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
