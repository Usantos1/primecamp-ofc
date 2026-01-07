// Rotas para gerenciamento de revenda (/api/admin/revenda/*)
import express from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { requireAdminCompany } from '../middleware/companyMiddleware.js';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const router = express.Router();

console.log('[Revenda] Rotas de revenda sendo configuradas...');

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

// Aplicar autenticação e depois verificação de admin
router.use((req, res, next) => {
  console.log('[Revenda] Rota acessada:', req.method, req.path, 'Headers:', JSON.stringify(req.headers));
  next();
});
router.use(authenticateToken);
router.use((req, res, next) => {
  console.log('[Revenda] Após autenticação, user:', req.user?.id);
  next();
});
router.use(requireAdminCompany);
router.use((req, res, next) => {
  console.log('[Revenda] Após verificação admin, prosseguindo...');
  next();
});

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Listar todas as empresas
router.get('/companies', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        c.*,
        s.status as subscription_status,
        s.expires_at as subscription_expires_at,
        p.name as plan_name,
        p.code as plan_code,
        (SELECT COUNT(*) FROM users WHERE company_id = c.id) as user_count
      FROM companies c
      LEFT JOIN subscriptions s ON s.company_id = c.id AND s.status = 'active'
      LEFT JOIN plans p ON p.id = s.plan_id
      WHERE c.deleted_at IS NULL
    `;
    
    const params = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (c.name ILIKE $${paramCount} OR c.email ILIKE $${paramCount} OR c.cnpj ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      query += ` AND c.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM companies WHERE deleted_at IS NULL`
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar empresas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obter empresa específica
router.get('/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        c.*,
        s.id as subscription_id,
        s.status as subscription_status,
        s.expires_at as subscription_expires_at,
        s.billing_cycle,
        p.id as plan_id,
        p.name as plan_name,
        p.code as plan_code,
        (SELECT COUNT(*) FROM users WHERE company_id = c.id) as user_count
      FROM companies c
      LEFT JOIN subscriptions s ON s.company_id = c.id AND s.status = 'active'
      LEFT JOIN plans p ON p.id = s.plan_id
      WHERE c.id = $1 AND c.deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empresa não encontrada' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erro ao obter empresa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Criar nova empresa
router.post('/companies', async (req, res) => {
  try {
    const {
      name,
      cnpj,
      email,
      phone,
      address,
      city,
      state,
      zip_code,
      plan_id,
      billing_cycle = 'monthly'
    } = req.body;

    await pool.query('BEGIN');

    // Criar empresa
    const companyResult = await pool.query(
      `INSERT INTO companies (name, cnpj, email, phone, address, city, state, zip_code, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'trial')
       RETURNING *`,
      [name, cnpj, email, phone, address, city, state, zip_code]
    );

    const company = companyResult.rows[0];

    // Criar assinatura se plan_id fornecido
    if (plan_id) {
      const planResult = await pool.query('SELECT * FROM plans WHERE id = $1', [plan_id]);
      if (planResult.rows.length > 0) {
        const plan = planResult.rows[0];
        const amount = billing_cycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + (billing_cycle === 'yearly' ? 12 : 1));

        await pool.query(
          `INSERT INTO subscriptions (company_id, plan_id, billing_cycle, expires_at, amount, status)
           VALUES ($1, $2, $3, $4, $5, 'active')`,
          [company.id, plan_id, billing_cycle, expiresAt, amount]
        );
      }
    }

    await pool.query('COMMIT');

    res.json({ success: true, data: company });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Erro ao criar empresa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atualizar empresa
router.put('/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = ['name', 'cnpj', 'email', 'phone', 'address', 'city', 'state', 'zip_code', 'status', 'settings'];
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramCount}`);
        values.push(updates[field]);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhum campo para atualizar' });
    }

    values.push(id);
    updateFields.push(`updated_at = NOW()`);

    const result = await pool.query(
      `UPDATE companies SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Listar planos disponíveis
router.get('/plans', async (req, res) => {
  try {
    console.log('[Revenda] GET /plans - Iniciando busca de planos...');
    console.log('[Revenda] User autenticado:', req.user?.id);
    
    const result = await pool.query(
      `SELECT * FROM plans WHERE active = true ORDER BY price_monthly ASC`
    );
    
    console.log('[Revenda] Planos encontrados:', result.rows.length);
    console.log('[Revenda] Planos:', result.rows.map(p => ({ id: p.id, name: p.name })));
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Revenda] Erro ao listar planos:', error);
    console.error('[Revenda] Stack trace:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Criar/atualizar assinatura
router.post('/companies/:id/subscription', async (req, res) => {
  try {
    const { id } = req.params;
    const { plan_id, billing_cycle = 'monthly' } = req.body;

    const planResult = await pool.query('SELECT * FROM plans WHERE id = $1', [plan_id]);
    if (planResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Plano não encontrado' });
    }

    const plan = planResult.rows[0];
    const amount = billing_cycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + (billing_cycle === 'yearly' ? 12 : 1));

    // Cancelar assinatura anterior se existir
    await pool.query(
      `UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW() 
       WHERE company_id = $1 AND status = 'active'`,
      [id]
    );

    // Criar nova assinatura
    const result = await pool.query(
      `INSERT INTO subscriptions (company_id, plan_id, billing_cycle, expires_at, amount, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING *`,
      [id, plan_id, billing_cycle, expiresAt, amount]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Listar pagamentos de uma empresa
router.get('/companies/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM payments 
       WHERE company_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [id]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erro ao listar pagamentos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
