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

// Retorna mensagem amigável para erros de schema (tabela/coluna inexistente)
function isSchemaError(err) {
  const msg = (err.message || '').toLowerCase();
  const code = err.code || '';
  return (
    code === '42P01' || // undefined_table
    code === '42703' || // undefined_column
    msg.includes('does not exist') ||
    msg.includes('não existe') ||
    msg.includes('column ') && msg.includes(' does not exist')
  );
}

// Listar todas as empresas
router.get('/companies', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const offset = (page - 1) * limit;

    // user_count: quantidade de usuários com company_id = empresa (tabela public.users)
    // segmento_id/segmento_nome: multi-segmento (tabelas segmentos podem não existir)
    let query = `
      SELECT 
        c.*,
        s.status as subscription_status,
        s.expires_at as subscription_expires_at,
        p.name as plan_name,
        p.code as plan_code,
        (SELECT COUNT(*)::int FROM public.users u WHERE u.company_id = c.id) as user_count
      FROM companies c
      LEFT JOIN subscriptions s ON s.company_id = c.id AND s.status = 'active'
      LEFT JOIN plans p ON p.id = s.plan_id
      WHERE (c.deleted_at IS NULL)
    `;
    try {
      const hasSegmento = await pool.query(
        `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'segmento_id'`
      );
      if (hasSegmento.rows.length > 0) {
        query = `
          SELECT 
            c.*,
            seg.nome as segmento_nome,
            seg.slug as segmento_slug,
            sub.status as subscription_status,
            sub.expires_at as subscription_expires_at,
            p.name as plan_name,
            p.code as plan_code,
            (SELECT COUNT(*)::int FROM public.users u WHERE u.company_id = c.id) as user_count
          FROM companies c
          LEFT JOIN segmentos seg ON seg.id = c.segmento_id
          LEFT JOIN subscriptions sub ON sub.company_id = c.id AND sub.status = 'active'
          LEFT JOIN plans p ON p.id = sub.plan_id
          WHERE (c.deleted_at IS NULL)
        `;
      }
    } catch (_) {}
    const params = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (c.name ILIKE $${paramCount} OR c.email ILIKE $${paramCount} OR (c.cnpj::text IS NOT NULL AND c.cnpj::text ILIKE $${paramCount}))`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      query += ` AND c.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit) || 20, offset);

    let result;
    let countResult;
    try {
      result = await pool.query(query, params);
      countResult = await pool.query(
        `SELECT COUNT(*) FROM companies WHERE deleted_at IS NULL`
      );
    } catch (queryErr) {
      if (isSchemaError(queryErr)) {
        return res.status(503).json({
          success: false,
          error: 'Estrutura do banco incompleta para revenda. Execute no PostgreSQL o script: db/migrations/manual/INSTALAR_SISTEMA_REVENDA_COMPLETO.sql',
          detail: queryErr.message
        });
      }
      throw queryErr;
    }

    const total = countResult?.rows?.[0]?.count ? parseInt(countResult.rows[0].count, 10) : (result.rows || []).length;
    const totalPages = Math.ceil(total / (parseInt(limit) || 20));

    res.json({
      success: true,
      data: result.rows || [],
      pagination: {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Erro ao listar empresas:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao listar empresas',
      detail: process.env.NODE_ENV !== 'production' ? error.detail : undefined
    });
  }
});

// Obter empresa específica
router.get('/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;

    let result = await pool.query(
      `SELECT 
        c.*,
        s.id as subscription_id,
        s.status as subscription_status,
        s.expires_at as subscription_expires_at,
        s.billing_cycle,
        p.id as plan_id,
        p.name as plan_name,
        p.code as plan_code,
        (SELECT COUNT(*)::int FROM public.users u WHERE u.company_id = c.id) as user_count
      FROM companies c
      LEFT JOIN subscriptions s ON s.company_id = c.id AND s.status = 'active'
      LEFT JOIN plans p ON p.id = s.plan_id
      WHERE c.id = $1 AND c.deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empresa não encontrada' });
    }

    const row = result.rows[0];
    try {
      const hasSegmento = await pool.query(
        `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'segmento_id'`
      );
      if (hasSegmento.rows.length > 0 && row.segmento_id) {
        const seg = await pool.query('SELECT id, nome, slug FROM segmentos WHERE id = $1', [row.segmento_id]);
        if (seg.rows.length > 0) {
          row.segmento_nome = seg.rows[0].nome;
          row.segmento_slug = seg.rows[0].slug;
        }
      }
    } catch (_) {}

    res.json({ success: true, data: row });
  } catch (error) {
    if (isSchemaError(error)) {
      return res.status(503).json({
        success: false,
        error: 'Estrutura do banco incompleta para revenda. Execute: db/migrations/manual/INSTALAR_SISTEMA_REVENDA_COMPLETO.sql',
        detail: error.message
      });
    }
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

    const nameTrim = typeof name === 'string' ? name.trim() : '';
    const emailTrim = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!nameTrim) {
      return res.status(400).json({ success: false, error: 'Nome da empresa é obrigatório.' });
    }
    if (!emailTrim) {
      return res.status(400).json({ success: false, error: 'E-mail da empresa é obrigatório.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Criar empresa (segmento_id opcional se coluna existir)
      const companyCols = ['name', 'cnpj', 'email', 'phone', 'address', 'city', 'state', 'zip_code', 'status'];
      const companyVals = [nameTrim, cnpj || null, emailTrim, phone || null, address || null, city || null, state || null, zip_code || null, 'trial'];
      const segmentoId = req.body.segmento_id || null;
      try {
        const hasSeg = await client.query(`SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'segmento_id'`);
        if (hasSeg.rows.length > 0 && segmentoId) {
          companyCols.push('segmento_id');
          companyVals.push(segmentoId);
        }
      } catch (_) {}
      const placeholders = companyVals.map((_, i) => `$${i + 1}`).join(', ');
      const companyResult = await client.query(
        `INSERT INTO companies (${companyCols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        companyVals
      );

      const company = companyResult.rows[0];

      // Config de cupom por empresa: dados fictícios (não da Prime Camp) para a nova empresa
      const cupomConfigKey = `cupom_config_${company.id}`;
      const cupomConfigValue = {
        empresa_nome: 'Nome da Empresa',
        empresa_cnpj: '',
        empresa_ie: '',
        empresa_endereco: '',
        empresa_telefone: '',
        empresa_whatsapp: '',
        logo_url: '',
        termos_garantia: 'Esse comprovante de venda é sua Garantia, portando guarde-o com cuidado. A Garantia não cobre mau uso do cliente. (pressão, impacto, quebra, umidade, calor excessivo).',
        mostrar_logo: true,
        mostrar_qr_code: true,
        mensagem_rodape: 'Obrigado pela preferência! Volte sempre',
        imprimir_2_vias: false,
        imprimir_sem_dialogo: true,
        impressora_padrao: '',
      };
      try {
        await client.query(
          `INSERT INTO kv_store_2c4defad (key, value) VALUES ($1, $2::jsonb)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [cupomConfigKey, JSON.stringify(cupomConfigValue)]
        );
      } catch (kvErr) {
        console.warn('[Revenda] Não foi possível criar config cupom padrão para nova empresa:', kvErr.message);
      }

      // Criar assinatura se plan_id fornecido
      if (plan_id) {
        const planResult = await client.query('SELECT * FROM plans WHERE id = $1', [plan_id]);
        if (planResult.rows.length > 0) {
          const plan = planResult.rows[0];
          const priceMonthly = Number(plan.price_monthly) || 0;
          const priceYearly = plan.price_yearly != null ? Number(plan.price_yearly) : null;
          const amount = billing_cycle === 'yearly'
            ? (priceYearly ?? priceMonthly * 12)
            : priceMonthly;
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + (billing_cycle === 'yearly' ? 12 : 1));

          await client.query(
            `INSERT INTO subscriptions (company_id, plan_id, billing_cycle, expires_at, amount, status)
             VALUES ($1, $2, $3, $4, $5, 'active')`,
            [company.id, plan_id, billing_cycle, expiresAt, amount]
          );
        }
      }

      await client.query('COMMIT');
      res.json({ success: true, data: company });
    } catch (txError) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Erro ao criar empresa:', txError);
      res.status(500).json({
        success: false,
        error: txError.message || 'Erro ao criar empresa',
        code: txError.code,
        detail: process.env.NODE_ENV !== 'production' ? txError.detail : undefined
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao criar empresa (conexão):', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atualizar empresa
router.put('/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = ['name', 'cnpj', 'email', 'phone', 'address', 'city', 'state', 'zip_code', 'status', 'settings', 'segmento_id'];
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
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao listar planos',
      detail: process.env.NODE_ENV !== 'production' ? (error.detail || error.code) : undefined
    });
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

// ═══════════════════════════════════════════════════════════════
// MULTI-SEGMENTO: Segmentos, Módulos, Recursos
// ═══════════════════════════════════════════════════════════════

function isSegmentSchemaError(err) {
  const msg = (err.message || '').toLowerCase();
  const code = err.code || '';
  return code === '42P01' || code === '42703' || msg.includes('does not exist');
}

// Listar segmentos
router.get('/segmentos', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*,
        (SELECT COUNT(*)::int FROM segmentos_modulos sm WHERE sm.segmento_id = s.id AND sm.ativo) as modulos_count,
        (SELECT COUNT(*)::int FROM segmentos_recursos sr WHERE sr.segmento_id = s.id AND sr.ativo) as recursos_count
       FROM segmentos s
       ORDER BY s.nome`
    );
    res.json({ success: true, data: result.rows || [] });
  } catch (error) {
    if (isSegmentSchemaError(error)) {
      return res.status(503).json({
        success: false,
        error: 'Estrutura multi-segmento não instalada. Execute: db/migrations/manual/REVENDA_MULTI_SEGMENTO.sql',
        detail: error.message
      });
    }
    console.error('Erro ao listar segmentos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obter um segmento
router.get('/segmentos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT s.*,
        (SELECT COUNT(*)::int FROM segmentos_modulos sm WHERE sm.segmento_id = s.id AND sm.ativo) as modulos_count,
        (SELECT COUNT(*)::int FROM segmentos_recursos sr WHERE sr.segmento_id = s.id AND sr.ativo) as recursos_count
       FROM segmentos s WHERE s.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Segmento não encontrado' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (isSegmentSchemaError(error)) {
      return res.status(503).json({ success: false, error: 'Estrutura multi-segmento não instalada.', detail: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Criar segmento
router.post('/segmentos', async (req, res) => {
  try {
    const { nome, slug, descricao, icone, cor, ativo = true } = req.body;
    if (!nome || !slug) {
      return res.status(400).json({ success: false, error: 'Nome e slug são obrigatórios' });
    }
    const slugNorm = String(slug).trim().toLowerCase().replace(/\s+/g, '_');
    const result = await pool.query(
      `INSERT INTO segmentos (nome, slug, descricao, icone, cor, ativo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [nome.trim(), slugNorm, descricao || null, icone || 'briefcase', cor || '#3b82f6', ativo]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ success: false, error: 'Slug já existe' });
    if (isSegmentSchemaError(error)) return res.status(503).json({ success: false, error: 'Estrutura multi-segmento não instalada.' });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atualizar segmento
router.put('/segmentos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, slug, descricao, icone, cor, ativo } = req.body;
    const updates = [];
    const values = [];
    let n = 1;
    if (nome !== undefined) { updates.push(`nome = $${n++}`); values.push(nome); }
    if (slug !== undefined) { updates.push(`slug = $${n++}`); values.push(String(slug).trim().toLowerCase().replace(/\s+/g, '_')); }
    if (descricao !== undefined) { updates.push(`descricao = $${n++}`); values.push(descricao); }
    if (icone !== undefined) { updates.push(`icone = $${n++}`); values.push(icone); }
    if (cor !== undefined) { updates.push(`cor = $${n++}`); values.push(cor); }
    if (ativo !== undefined) { updates.push(`ativo = $${n++}`); values.push(ativo); }
    if (updates.length === 0) return res.status(400).json({ success: false, error: 'Nenhum campo para atualizar' });
    updates.push(`updated_at = NOW()`);
    values.push(id);
    const result = await pool.query(
      `UPDATE segmentos SET ${updates.join(', ')} WHERE id = $${n} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Segmento não encontrado' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ success: false, error: 'Slug já existe' });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Listar módulos do segmento + ordem (para edição)
router.get('/segmentos/:id/modulos', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT m.*, sm.ativo as link_ativo, sm.ordem_menu
       FROM modulos m
       LEFT JOIN segmentos_modulos sm ON sm.modulo_id = m.id AND sm.segmento_id = $1
       ORDER BY COALESCE(sm.ordem_menu, 999), m.nome`,
      [id]
    );
    res.json({ success: true, data: result.rows || [] });
  } catch (error) {
    if (isSegmentSchemaError(error)) return res.status(503).json({ success: false, error: 'Estrutura multi-segmento não instalada.' });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atualizar vínculo segmento x módulos (ativo + ordem_menu)
router.put('/segmentos/:id/modulos', async (req, res) => {
  try {
    const { id: segmentoId } = req.params;
    const { modulos } = req.body; // array of { modulo_id, ativo, ordem_menu }
    await pool.query('DELETE FROM segmentos_modulos WHERE segmento_id = $1', [segmentoId]);
    if (Array.isArray(modulos) && modulos.length > 0) {
      for (let i = 0; i < modulos.length; i++) {
        const { modulo_id, ativo, ordem_menu } = modulos[i];
        if (ativo) {
          await pool.query(
            `INSERT INTO segmentos_modulos (segmento_id, modulo_id, ativo, ordem_menu)
             VALUES ($1, $2, true, $3)
             ON CONFLICT (segmento_id, modulo_id) DO UPDATE SET ativo = true, ordem_menu = $3`,
            [segmentoId, modulo_id, ordem_menu != null ? ordem_menu : i]
          );
        }
      }
    }
    const result = await pool.query(
      `SELECT m.*, sm.ativo as link_ativo, sm.ordem_menu
       FROM modulos m
       LEFT JOIN segmentos_modulos sm ON sm.modulo_id = m.id AND sm.segmento_id = $1
       ORDER BY COALESCE(sm.ordem_menu, 999), m.nome`,
      [segmentoId]
    );
    res.json({ success: true, data: result.rows || [] });
  } catch (error) {
    if (isSegmentSchemaError(error)) return res.status(503).json({ success: false, error: 'Estrutura multi-segmento não instalada.' });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Listar recursos do segmento (agrupados por módulo)
router.get('/segmentos/:id/recursos', async (req, res) => {
  try {
    const { id } = req.params;
    const modulos = await pool.query(
      `SELECT m.id, m.nome, m.slug FROM modulos m
       INNER JOIN segmentos_modulos sm ON sm.modulo_id = m.id AND sm.segmento_id = $1 AND sm.ativo
       ORDER BY sm.ordem_menu, m.nome`,
      [id]
    );
    const recursos = await pool.query(
      `SELECT r.*, sr.ativo as link_ativo
       FROM recursos r
       LEFT JOIN segmentos_recursos sr ON sr.recurso_id = r.id AND sr.segmento_id = $1
       WHERE r.modulo_id IN (SELECT modulo_id FROM segmentos_modulos WHERE segmento_id = $1 AND ativo)
       ORDER BY (SELECT ordem_menu FROM segmentos_modulos WHERE segmento_id = $1 AND modulo_id = r.modulo_id), r.nome`,
      [id, id, id]
    );
    res.json({
      success: true,
      data: {
        modulos: modulos.rows,
        recursos: recursos.rows || []
      }
    });
  } catch (error) {
    if (isSegmentSchemaError(error)) return res.status(503).json({ success: false, error: 'Estrutura multi-segmento não instalada.' });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atualizar vínculo segmento x recursos
router.put('/segmentos/:id/recursos', async (req, res) => {
  try {
    const { id: segmentoId } = req.params;
    const { recurso_ids } = req.body; // array of recurso_id to enable
    await pool.query('DELETE FROM segmentos_recursos WHERE segmento_id = $1', [segmentoId]);
    if (Array.isArray(recurso_ids) && recurso_ids.length > 0) {
      for (const recursoId of recurso_ids) {
        await pool.query(
          `INSERT INTO segmentos_recursos (segmento_id, recurso_id, ativo)
           VALUES ($1, $2, true)
           ON CONFLICT (segmento_id, recurso_id) DO UPDATE SET ativo = true`,
          [segmentoId, recursoId]
        );
      }
    }
    const count = await pool.query('SELECT COUNT(*)::int as c FROM segmentos_recursos WHERE segmento_id = $1', [segmentoId]);
    res.json({ success: true, recursos_count: count.rows[0].c });
  } catch (error) {
    if (isSegmentSchemaError(error)) return res.status(503).json({ success: false, error: 'Estrutura multi-segmento não instalada.' });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Prévia do menu do segmento
router.get('/segmentos/:id/menu-preview', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT m.id, m.nome, m.slug, m.path, m.label_menu, m.icone, sm.ordem_menu
       FROM modulos m
       INNER JOIN segmentos_modulos sm ON sm.modulo_id = m.id AND sm.segmento_id = $1 AND sm.ativo
       ORDER BY sm.ordem_menu, m.nome`,
      [id]
    );
    res.json({ success: true, data: result.rows || [] });
  } catch (error) {
    if (isSegmentSchemaError(error)) return res.status(503).json({ success: false, error: 'Estrutura multi-segmento não instalada.' });
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Módulos (CRUD global)
router.get('/modulos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM modulos ORDER BY categoria, nome');
    res.json({ success: true, data: result.rows || [] });
  } catch (error) {
    if (isSegmentSchemaError(error)) return res.status(503).json({ success: false, error: 'Estrutura multi-segmento não instalada.' });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/modulos/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM modulos WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Módulo não encontrado' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (isSegmentSchemaError(error)) return res.status(503).json({ success: false, error: 'Estrutura multi-segmento não instalada.' });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/modulos', async (req, res) => {
  try {
    const { nome, slug, descricao, categoria, icone, path, label_menu, ativo = true } = req.body;
    if (!nome || !slug) return res.status(400).json({ success: false, error: 'Nome e slug são obrigatórios' });
    const slugNorm = String(slug).trim().toLowerCase().replace(/\s+/g, '_');
    const result = await pool.query(
      `INSERT INTO modulos (nome, slug, descricao, categoria, icone, path, label_menu, ativo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [nome.trim(), slugNorm, descricao || null, categoria || null, icone || 'box', path || null, label_menu || null, ativo]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ success: false, error: 'Slug já existe' });
    if (isSegmentSchemaError(error)) return res.status(503).json({ success: false, error: 'Estrutura multi-segmento não instalada.' });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/modulos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, slug, descricao, categoria, icone, path, label_menu, ativo } = req.body;
    const updates = [];
    const values = [];
    let n = 1;
    if (nome !== undefined) { updates.push(`nome = $${n++}`); values.push(nome); }
    if (slug !== undefined) { updates.push(`slug = $${n++}`); values.push(String(slug).trim().toLowerCase().replace(/\s+/g, '_')); }
    if (descricao !== undefined) { updates.push(`descricao = $${n++}`); values.push(descricao); }
    if (categoria !== undefined) { updates.push(`categoria = $${n++}`); values.push(categoria); }
    if (icone !== undefined) { updates.push(`icone = $${n++}`); values.push(icone); }
    if (path !== undefined) { updates.push(`path = $${n++}`); values.push(path); }
    if (label_menu !== undefined) { updates.push(`label_menu = $${n++}`); values.push(label_menu); }
    if (ativo !== undefined) { updates.push(`ativo = $${n++}`); values.push(ativo); }
    if (updates.length === 0) return res.status(400).json({ success: false, error: 'Nenhum campo para atualizar' });
    values.push(id);
    const result = await pool.query(
      `UPDATE modulos SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${n} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Módulo não encontrado' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ success: false, error: 'Slug já existe' });
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Recursos (CRUD global, filtro por modulo_id opcional)
router.get('/recursos', async (req, res) => {
  try {
    const { modulo_id } = req.query;
    let query = `SELECT r.*, m.nome as modulo_nome, m.slug as modulo_slug FROM recursos r JOIN modulos m ON m.id = r.modulo_id`;
    const params = [];
    if (modulo_id) { query += ' WHERE r.modulo_id = $1'; params.push(modulo_id); }
    query += ' ORDER BY m.nome, r.nome';
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows || [] });
  } catch (error) {
    if (isSegmentSchemaError(error)) return res.status(503).json({ success: false, error: 'Estrutura multi-segmento não instalada.' });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/recursos/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT r.*, m.nome as modulo_nome FROM recursos r JOIN modulos m ON m.id = r.modulo_id WHERE r.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Recurso não encontrado' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (isSegmentSchemaError(error)) return res.status(503).json({ success: false, error: 'Estrutura multi-segmento não instalada.' });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/recursos', async (req, res) => {
  try {
    const { modulo_id, nome, slug, descricao, tipo, permission_key, ativo = true } = req.body;
    if (!modulo_id || !nome || !slug) return res.status(400).json({ success: false, error: 'modulo_id, nome e slug são obrigatórios' });
    const slugNorm = String(slug).trim().toLowerCase().replace(/\s+/g, '_');
    const result = await pool.query(
      `INSERT INTO recursos (modulo_id, nome, slug, descricao, tipo, permission_key, ativo)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [modulo_id, nome.trim(), slugNorm, descricao || null, tipo || 'action', permission_key || null, ativo]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (isSegmentSchemaError(error)) return res.status(503).json({ success: false, error: 'Estrutura multi-segmento não instalada.' });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/recursos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { modulo_id, nome, slug, descricao, tipo, permission_key, ativo } = req.body;
    const updates = [];
    const values = [];
    let n = 1;
    if (modulo_id !== undefined) { updates.push(`modulo_id = $${n++}`); values.push(modulo_id); }
    if (nome !== undefined) { updates.push(`nome = $${n++}`); values.push(nome); }
    if (slug !== undefined) { updates.push(`slug = $${n++}`); values.push(String(slug).trim().toLowerCase().replace(/\s+/g, '_')); }
    if (descricao !== undefined) { updates.push(`descricao = $${n++}`); values.push(descricao); }
    if (tipo !== undefined) { updates.push(`tipo = $${n++}`); values.push(tipo); }
    if (permission_key !== undefined) { updates.push(`permission_key = $${n++}`); values.push(permission_key); }
    if (ativo !== undefined) { updates.push(`ativo = $${n++}`); values.push(ativo); }
    if (updates.length === 0) return res.status(400).json({ success: false, error: 'Nenhum campo para atualizar' });
    values.push(id);
    const result = await pool.query(
      `UPDATE recursos SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${n} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Recurso não encontrado' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
