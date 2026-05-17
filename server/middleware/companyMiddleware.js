// Middleware para verificar company_id e assinatura ativa
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '..', '.env') });

export const ADMIN_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Verificar se empresa está ativa e pagando
export const checkCompanyActive = async (companyId) => {
  if (!companyId) return { active: false, reason: 'Company ID não fornecido' };
  
  // Empresa admin sempre ativa
  if (companyId === ADMIN_COMPANY_ID) {
    return { active: true, isAdmin: true };
  }

  try {
    // Verificar status da empresa
    const companyResult = await pool.query(
      `SELECT status, deleted_at FROM companies WHERE id = $1`,
      [companyId]
    );

    if (companyResult.rows.length === 0) {
      return { active: false, reason: 'Empresa não encontrada' };
    }

    const company = companyResult.rows[0];
    
    if (company.deleted_at || company.status === 'cancelled' || company.status === 'suspended') {
      return { active: false, reason: `Empresa ${company.status}` };
    }

    // Verificar assinatura ativa
    const subscriptionResult = await pool.query(
      `SELECT status, expires_at 
       FROM subscriptions 
       WHERE company_id = $1 AND status = 'active'
       ORDER BY expires_at DESC 
       LIMIT 1`,
      [companyId]
    );

    if (subscriptionResult.rows.length === 0) {
      return { active: false, reason: 'Nenhuma assinatura ativa encontrada' };
    }

    const subscription = subscriptionResult.rows[0];
    
    if (new Date(subscription.expires_at) < new Date()) {
      return { active: false, reason: 'Assinatura expirada' };
    }

    return { active: true, expiresAt: subscription.expires_at };
  } catch (error) {
    console.error('Erro ao verificar empresa:', error);
    return { active: false, reason: 'Erro ao verificar status da empresa' };
  }
};

// Middleware para verificar company_id do usuário
export const requireCompanyAccess = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Buscar company_id do usuário
    const userResult = await pool.query(
      `SELECT company_id FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const companyId = userResult.rows[0].company_id;
    req.companyId = companyId;

    // Verificar se empresa está ativa
    const companyStatus = await checkCompanyActive(companyId);
    
    if (!companyStatus.active) {
      return res.status(403).json({ 
        error: 'Acesso bloqueado',
        reason: companyStatus.reason,
        requiresPayment: true
      });
    }

    req.companyStatus = companyStatus;
    next();
  } catch (error) {
    console.error('Erro no middleware de company:', error);
    res.status(500).json({ error: 'Erro ao verificar acesso da empresa' });
  }
};

// Middleware para verificar se é admin da empresa principal
export const requireAdminCompany = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Verificar se usuário é admin e pertence à empresa admin
    const userResult = await pool.query(
      `SELECT u.company_id, p.role 
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = userResult.rows[0];
    
    if (user.company_id !== ADMIN_COMPANY_ID || user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas admins da empresa principal podem acessar.' });
    }

    next();
  } catch (error) {
    console.error('Erro no middleware de admin company:', error);
    const msg = (error.message || '').toLowerCase();
    const code = error.code || '';
    const schemaError = code === '42703' || code === '42P01' || msg.includes('does not exist') || msg.includes('não existe');
    if (schemaError) {
      return res.status(503).json({
        error: 'Estrutura do banco incompleta. Execute no PostgreSQL o script: db/migrations/manual/INSTALAR_SISTEMA_REVENDA_COMPLETO.sql (a parte que adiciona company_id na tabela users deve rodar sem erro).',
        detail: error.message
      });
    }
    res.status(500).json({ error: 'Erro ao verificar permissões' });
  }
};
