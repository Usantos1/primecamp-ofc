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
  console.log('[Revenda] Rota acessada:', req.method, req.path);
  console.log('[Revenda] Headers authorization:', req.headers['authorization'] ? 'SIM' : 'NÃO');
  next();
});
router.use(authenticateToken);
router.use((req, res, next) => {
  console.log('[Revenda] Após autenticação, user:', req.user?.id);
  next();
});
router.use(requireAdminCompany);
router.use((req, res, next) => {
  console.log('[Revenda] Após verificação admin, prosseguindo para:', req.method, req.path);
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

// Listar planos disponíveis (todos, incluindo inativos)
router.get('/plans', async (req, res) => {
  try {
    console.log('[Revenda] GET /plans - Iniciando busca de planos...');
    console.log('[Revenda] User autenticado:', req.user?.id);
    
    const { active } = req.query;
    let query = `SELECT * FROM plans`;
    const params = [];
    
    if (active !== undefined) {
      query += ` WHERE active = $1`;
      params.push(active === 'true');
    }
    
    query += ` ORDER BY price_monthly ASC`;
    
    const result = await pool.query(query, params);
    
    console.log('[Revenda] Planos encontrados:', result.rows.length);
    console.log('[Revenda] Planos:', result.rows.map(p => ({ id: p.id, name: p.name })));
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Revenda] Erro ao listar planos:', error);
    console.error('[Revenda] Stack trace:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Criar novo plano
router.post('/plans', async (req, res) => {
  try {
    const { name, code, description, price_monthly, price_yearly, max_users, features, active = true } = req.body;
    
    if (!name || !code || !price_monthly) {
      return res.status(400).json({ success: false, error: 'Nome, código e preço mensal são obrigatórios' });
    }
    
    const result = await pool.query(
      `INSERT INTO plans (name, code, description, price_monthly, price_yearly, max_users, features, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, code, description, price_monthly, price_yearly || null, max_users || null, features ? JSON.stringify(features) : null, active]
    );
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erro ao criar plano:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atualizar plano
router.put('/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, price_monthly, price_yearly, max_users, features, active } = req.body;
    
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) { updateFields.push(`name = $${paramCount++}`); values.push(name); }
    if (code !== undefined) { updateFields.push(`code = $${paramCount++}`); values.push(code); }
    if (description !== undefined) { updateFields.push(`description = $${paramCount++}`); values.push(description); }
    if (price_monthly !== undefined) { updateFields.push(`price_monthly = $${paramCount++}`); values.push(price_monthly); }
    if (price_yearly !== undefined) { updateFields.push(`price_yearly = $${paramCount++}`); values.push(price_yearly); }
    if (max_users !== undefined) { updateFields.push(`max_users = $${paramCount++}`); values.push(max_users); }
    if (features !== undefined) { updateFields.push(`features = $${paramCount++}`); values.push(JSON.stringify(features)); }
    if (active !== undefined) { updateFields.push(`active = $${paramCount++}`); values.push(active); }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhum campo para atualizar' });
    }
    
    updateFields.push(`updated_at = NOW()`);
    values.push(id);
    
    const result = await pool.query(
      `UPDATE plans SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Plano não encontrado' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar plano:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Deletar plano (soft delete)
router.delete('/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE plans SET active = false, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Plano não encontrado' });
    }
    
    res.json({ success: true, message: 'Plano desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar plano:', error);
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

// Listar usuários de uma empresa
router.get('/companies/:id/users', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[Revenda] GET /companies/:id/users - Company ID:', id);
    
    // Verificar se empresa existe
    const companyCheck = await pool.query('SELECT id FROM companies WHERE id = $1', [id]);
    if (companyCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empresa não encontrada' });
    }
    
    const result = await pool.query(
      `SELECT 
        u.id,
        u.email,
        u.email_verified,
        u.created_at,
        COALESCE(p.display_name, '') as display_name,
        COALESCE(p.role, 'member') as role,
        p.phone
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.company_id = $1
       ORDER BY u.created_at DESC`,
      [id]
    );

    console.log('[Revenda] Usuários encontrados:', result.rows.length);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Revenda] Erro ao listar usuários:', error);
    console.error('[Revenda] Stack trace:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Criar usuário para uma empresa
router.post('/companies/:id/users', async (req, res) => {
  try {
    const { id: companyId } = req.params;
    const { email, password, display_name, role = 'member', phone } = req.body;
    
    console.log('[Revenda] POST /companies/:id/users - Company ID:', companyId);
    console.log('[Revenda] Dados do usuário:', { email, hasPassword: !!password, display_name, role });
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email e senha são obrigatórios' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Senha deve ter pelo menos 6 caracteres' });
    }
    
    // Verificar se empresa existe
    const companyCheck = await pool.query('SELECT id FROM companies WHERE id = $1', [companyId]);
    if (companyCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empresa não encontrada' });
    }
    
    // Verificar se email já existe
    const existingUserCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existingUserCheck.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Email já cadastrado' });
    }
    
    // Hash da senha
    const bcrypt = (await import('bcrypt')).default;
    const passwordHash = await bcrypt.hash(password, 10);
    
    await pool.query('BEGIN');
    
    try {
      // Criar usuário
      const userResult = await pool.query(
        `INSERT INTO users (email, password_hash, company_id, email_verified)
         VALUES ($1, $2, $3, true)
         RETURNING *`,
        [email.toLowerCase().trim(), passwordHash, companyId]
      );
      
      const user = userResult.rows[0];
      console.log('[Revenda] Usuário criado:', user.id);
      
      // Criar perfil (se não existir)
      const profileCheck = await pool.query('SELECT id FROM profiles WHERE user_id = $1', [user.id]);
      if (profileCheck.rows.length === 0) {
        await pool.query(
          `INSERT INTO profiles (user_id, display_name, role, phone)
           VALUES ($1, $2, $3, $4)`,
          [user.id, display_name || null, role, phone || null]
        );
        console.log('[Revenda] Perfil criado para usuário:', user.id);
      } else {
        // Atualizar perfil existente
        await pool.query(
          `UPDATE profiles SET display_name = $1, role = $2, phone = $3
           WHERE user_id = $4`,
          [display_name || null, role, phone || null, user.id]
        );
        console.log('[Revenda] Perfil atualizado para usuário:', user.id);
      }
      
      await pool.query('COMMIT');
      
      // Buscar usuário completo com perfil
      const fullUserResult = await pool.query(
        `SELECT 
          u.id,
          u.email,
          u.email_verified,
          u.created_at,
          COALESCE(p.display_name, '') as display_name,
          COALESCE(p.role, 'member') as role,
          p.phone
         FROM users u
         LEFT JOIN profiles p ON p.user_id = u.id
         WHERE u.id = $1`,
        [user.id]
      );
      
      res.json({ success: true, data: fullUserResult.rows[0] });
    } catch (dbError) {
      await pool.query('ROLLBACK');
      throw dbError;
    }
  } catch (error) {
    console.error('[Revenda] Erro ao criar usuário:', error);
    console.error('[Revenda] Stack trace:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Resetar senha de um usuário
router.post('/companies/:companyId/users/:userId/reset-password', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const { new_password } = req.body;
    
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ success: false, error: 'Nova senha deve ter pelo menos 6 caracteres' });
    }
    
    // Verificar se usuário pertence à empresa
    const userResult = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND company_id = $2',
      [userId, companyId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado nesta empresa' });
    }
    
    // Hash da nova senha
    const bcrypt = (await import('bcrypt')).default;
    const passwordHash = await bcrypt.hash(new_password, 10);
    
    // Atualizar senha
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, userId]
    );
    
    res.json({ success: true, message: 'Senha resetada com sucesso' });
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Desativar/ativar usuário
router.put('/companies/:companyId/users/:userId/toggle-active', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    
    // Verificar se usuário pertence à empresa
    const userResult = await pool.query(
      'SELECT id, email_verified FROM users WHERE id = $1 AND company_id = $2',
      [userId, companyId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado nesta empresa' });
    }
    
    // Toggle email_verified (usado como ativo/inativo)
    const newStatus = !userResult.rows[0].email_verified;
    
    await pool.query(
      'UPDATE users SET email_verified = $1 WHERE id = $2',
      [newStatus, userId]
    );
    
    res.json({ success: true, message: `Usuário ${newStatus ? 'ativado' : 'desativado'} com sucesso` });
  } catch (error) {
    console.error('Erro ao alterar status do usuário:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
