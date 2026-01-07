// Rotas para dashboard e métricas (/api/dashboard/*)
import express from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const router = express.Router();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Middleware de autenticação JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação necessário' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido ou expirado' });
    }
    req.user = user;
    next();
  });
};

router.use(authenticateToken);

// ID da empresa principal
const ADMIN_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

// ================== DASHBOARD DA EMPRESA ==================

// Métricas gerais da empresa
router.get('/company/:companyId/metrics', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { period = '30' } = req.query; // dias

    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Buscar informações da empresa e assinatura
    const companyInfo = await pool.query(
      `SELECT 
        c.*,
        s.status as subscription_status,
        s.expires_at,
        p.name as plan_name,
        COALESCE(p.max_users, 999999) as max_users,
        COALESCE(p.max_products, 999999) as max_products,
        COALESCE(p.max_orders, 999999) as max_orders,
        COALESCE(p.price_monthly, 0) as price_monthly,
        COALESCE(p.price_yearly, 0) as price_yearly
      FROM companies c
      LEFT JOIN subscriptions s ON s.company_id = c.id AND s.status IN ('active', 'trial', 'past_due')
      LEFT JOIN plans p ON p.id = s.plan_id
      WHERE c.id = $1`,
      [companyId]
    );

    if (companyInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    const company = companyInfo.rows[0];

    // Contar usuários
    const usersCount = await pool.query(
      'SELECT COUNT(*) FROM users WHERE company_id = $1',
      [companyId]
    );

    // Contar usuários ativos (aprovados)
    const activeUsersCount = await pool.query(
      `SELECT COUNT(*) FROM users u
       JOIN profiles p ON p.user_id = u.id
       WHERE u.company_id = $1 AND p.approved = true`,
      [companyId]
    );

    // Contar produtos (com tratamento de erro)
    let productsCount = { rows: [{ count: '0' }] };
    try {
      productsCount = await pool.query(
        'SELECT COUNT(*) FROM produtos WHERE company_id = $1',
        [companyId]
      );
    } catch (e) { console.log('[Dashboard] Erro ao contar produtos:', e.message); }

    // Contar ordens de serviço (total e do período)
    let ordersTotal = { rows: [{ count: '0' }] };
    let ordersPeriod = { rows: [{ count: '0' }] };
    try {
      ordersTotal = await pool.query(
        'SELECT COUNT(*) FROM ordens_servico WHERE company_id = $1',
        [companyId]
      );
      ordersPeriod = await pool.query(
        'SELECT COUNT(*) FROM ordens_servico WHERE company_id = $1 AND created_at >= $2',
        [companyId, startDate]
      );
    } catch (e) { console.log('[Dashboard] Erro ao contar ordens:', e.message); }

    // Contar vendas (total e do período)
    let salesTotal = { rows: [{ count: '0', total_value: '0' }] };
    let salesPeriod = { rows: [{ count: '0', total_value: '0' }] };
    try {
      salesTotal = await pool.query(
        'SELECT COUNT(*), COALESCE(SUM(total), 0) as total_value FROM vendas WHERE company_id = $1',
        [companyId]
      );
      salesPeriod = await pool.query(
        'SELECT COUNT(*), COALESCE(SUM(total), 0) as total_value FROM vendas WHERE company_id = $1 AND created_at >= $2',
        [companyId, startDate]
      );
    } catch (e) { console.log('[Dashboard] Erro ao contar vendas:', e.message); }

    // Contar clientes
    let clientsCount = { rows: [{ count: '0' }] };
    try {
      clientsCount = await pool.query(
        'SELECT COUNT(*) FROM clientes WHERE company_id = $1',
        [companyId]
      );
    } catch (e) { console.log('[Dashboard] Erro ao contar clientes:', e.message); }

    // Calcular limites e uso
    const limits = {
      users: {
        current: parseInt(usersCount.rows[0].count),
        max: company.max_users || 999999,
        percentage: company.max_users ? 
          Math.round((parseInt(usersCount.rows[0].count) / company.max_users) * 100) : 0
      },
      products: {
        current: parseInt(productsCount.rows[0].count),
        max: company.max_products || 999999,
        percentage: company.max_products ? 
          Math.round((parseInt(productsCount.rows[0].count) / company.max_products) * 100) : 0
      },
      orders: {
        current: parseInt(ordersPeriod.rows[0].count),
        max: company.max_orders || 999999,
        percentage: company.max_orders ? 
          Math.round((parseInt(ordersPeriod.rows[0].count) / company.max_orders) * 100) : 0
      }
    };

    res.json({
      success: true,
      data: {
        company: {
          id: company.id,
          name: company.name,
          status: company.status,
          created_at: company.created_at
        },
        subscription: {
          status: company.subscription_status || 'none',
          expires_at: company.expires_at,
          plan: company.plan_name,
          price_monthly: company.price_monthly,
          price_yearly: company.price_yearly
        },
        metrics: {
          users: {
            total: parseInt(usersCount.rows[0].count),
            active: parseInt(activeUsersCount.rows[0].count)
          },
          products: parseInt(productsCount.rows[0].count),
          clients: parseInt(clientsCount.rows[0].count),
          orders: {
            total: parseInt(ordersTotal.rows[0].count),
            period: parseInt(ordersPeriod.rows[0].count)
          },
          sales: {
            total_count: parseInt(salesTotal.rows[0].count),
            total_value: parseFloat(salesTotal.rows[0].total_value),
            period_count: parseInt(salesPeriod.rows[0].count),
            period_value: parseFloat(salesPeriod.rows[0].total_value)
          }
        },
        limits,
        period: periodDays
      }
    });
  } catch (error) {
    console.error('[Dashboard] Erro ao buscar métricas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Gráfico de vendas por dia
router.get('/company/:companyId/sales-chart', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { period = '30' } = req.query;

    const result = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total
      FROM vendas
      WHERE company_id = $1 
        AND created_at >= NOW() - INTERVAL '${parseInt(period)} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC`,
      [companyId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Dashboard] Erro ao buscar gráfico:', error);
    res.status(500).json({ error: error.message });
  }
});

// Gráfico de ordens por status
router.get('/company/:companyId/orders-by-status', async (req, res) => {
  try {
    const { companyId } = req.params;

    const result = await pool.query(
      `SELECT 
        status,
        COUNT(*) as count
      FROM ordens_servico
      WHERE company_id = $1
      GROUP BY status
      ORDER BY count DESC`,
      [companyId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Dashboard] Erro ao buscar ordens por status:', error);
    res.status(500).json({ error: error.message });
  }
});

// ================== DASHBOARD DO REVENDEDOR (ADMIN) ==================

// Métricas gerais de todas as empresas (apenas para admin)
router.get('/admin/overview', async (req, res) => {
  try {
    // Verificar se é admin da empresa principal
    if (req.user.company_id !== ADMIN_COMPANY_ID) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Total de empresas por status
    const companiesByStatus = await pool.query(
      `SELECT status, COUNT(*) as count 
       FROM companies 
       WHERE id != $1 AND deleted_at IS NULL
       GROUP BY status`,
      [ADMIN_COMPANY_ID]
    );

    // Total de assinaturas por status
    const subscriptionsByStatus = await pool.query(
      `SELECT status, COUNT(*) as count 
       FROM subscriptions 
       GROUP BY status`
    );

    // Total de usuários em todas as empresas
    const totalUsers = await pool.query(
      'SELECT COUNT(*) FROM users WHERE company_id != $1',
      [ADMIN_COMPANY_ID]
    );

    // Receita mensal (pagamentos confirmados no mês)
    const monthlyRevenue = await pool.query(
      `SELECT COALESCE(SUM(valor), 0) as total
       FROM payments
       WHERE status = 'paid'
       AND paid_at >= date_trunc('month', CURRENT_DATE)`
    );

    // Receita total
    const totalRevenue = await pool.query(
      `SELECT COALESCE(SUM(valor), 0) as total
       FROM payments
       WHERE status = 'paid'`
    );

    // Empresas criadas por mês (últimos 12 meses)
    const companiesPerMonth = await pool.query(
      `SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count
       FROM companies
       WHERE id != $1 
         AND deleted_at IS NULL
         AND created_at >= NOW() - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month ASC`,
      [ADMIN_COMPANY_ID]
    );

    // Pagamentos pendentes
    const pendingPayments = await pool.query(
      `SELECT COUNT(*), COALESCE(SUM(valor), 0) as total
       FROM payments
       WHERE status = 'pending'`
    );

    // Assinaturas expirando em 7 dias
    const expiringSubscriptions = await pool.query(
      `SELECT COUNT(*) 
       FROM subscriptions s
       JOIN companies c ON c.id = s.company_id
       WHERE s.status = 'active'
         AND s.expires_at <= NOW() + INTERVAL '7 days'
         AND s.expires_at > NOW()
         AND c.id != $1`,
      [ADMIN_COMPANY_ID]
    );

    // Top 5 planos mais usados
    const topPlans = await pool.query(
      `SELECT 
        p.name,
        p.code,
        COUNT(s.id) as subscriptions_count
       FROM plans p
       LEFT JOIN subscriptions s ON s.plan_id = p.id AND s.status IN ('active', 'trial')
       WHERE p.is_active = true
       GROUP BY p.id, p.name, p.code
       ORDER BY subscriptions_count DESC
       LIMIT 5`
    );

    res.json({
      success: true,
      data: {
        companies: {
          byStatus: companiesByStatus.rows.reduce((acc, row) => {
            acc[row.status] = parseInt(row.count);
            return acc;
          }, {}),
          total: companiesByStatus.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
          perMonth: companiesPerMonth.rows
        },
        subscriptions: {
          byStatus: subscriptionsByStatus.rows.reduce((acc, row) => {
            acc[row.status] = parseInt(row.count);
            return acc;
          }, {}),
          expiringSoon: parseInt(expiringSubscriptions.rows[0].count)
        },
        users: {
          total: parseInt(totalUsers.rows[0].count)
        },
        revenue: {
          monthly: parseFloat(monthlyRevenue.rows[0].total),
          total: parseFloat(totalRevenue.rows[0].total)
        },
        payments: {
          pending: {
            count: parseInt(pendingPayments.rows[0].count),
            total: parseFloat(pendingPayments.rows[0].total)
          }
        },
        topPlans: topPlans.rows
      }
    });
  } catch (error) {
    console.error('[Dashboard] Erro ao buscar overview admin:', error);
    res.status(500).json({ error: error.message });
  }
});

// Lista de empresas com assinaturas vencendo
router.get('/admin/expiring-subscriptions', async (req, res) => {
  try {
    if (req.user.company_id !== ADMIN_COMPANY_ID) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { days = '7' } = req.query;

    const result = await pool.query(
      `SELECT 
        c.id,
        c.name,
        c.email,
        c.phone,
        s.expires_at,
        p.name as plan_name,
        (SELECT COUNT(*) FROM users WHERE company_id = c.id) as user_count
       FROM companies c
       JOIN subscriptions s ON s.company_id = c.id AND s.status IN ('active', 'past_due')
       JOIN plans p ON p.id = s.plan_id
       WHERE s.expires_at <= NOW() + INTERVAL '${parseInt(days)} days'
         AND s.expires_at > NOW() - INTERVAL '7 days'
         AND c.id != $1
       ORDER BY s.expires_at ASC`,
      [ADMIN_COMPANY_ID]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Dashboard] Erro ao buscar assinaturas expirando:', error);
    res.status(500).json({ error: error.message });
  }
});

// Lista de pagamentos recentes
router.get('/admin/recent-payments', async (req, res) => {
  try {
    if (req.user.company_id !== ADMIN_COMPANY_ID) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { limit = '20' } = req.query;

    const result = await pool.query(
      `SELECT 
        p.id, p.company_id, p.status, p.created_at,
        COALESCE(p.valor, 0) as amount,
        COALESCE(p.forma_pagamento, 'pix') as payment_method,
        p.subscription_id, p.description, p.paid_at,
        c.name as company_name,
        pl.name as plan_name
       FROM payments p
       JOIN companies c ON c.id = p.company_id
       LEFT JOIN subscriptions s ON s.id = p.subscription_id
       LEFT JOIN plans pl ON pl.id = s.plan_id
       ORDER BY p.created_at DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Dashboard] Erro ao buscar pagamentos recentes:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

