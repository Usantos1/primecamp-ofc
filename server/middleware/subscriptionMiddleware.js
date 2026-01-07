// Middleware para verificação de assinatura e bloqueio por inadimplência
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// ID da empresa principal (não precisa de assinatura)
const ADMIN_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

// Dias de tolerância após expiração antes de bloquear
const GRACE_PERIOD_DAYS = 7;

/**
 * Middleware para verificar se a empresa tem assinatura ativa
 * Bloqueia acesso se a assinatura expirou além do período de tolerância
 */
export const checkSubscription = async (req, res, next) => {
  try {
    // Se não tem usuário autenticado, pular
    if (!req.user || !req.companyId) {
      return next();
    }

    // Empresa principal não precisa de assinatura
    if (req.companyId === ADMIN_COMPANY_ID) {
      return next();
    }

    // Verificar status da empresa e assinatura
    const result = await pool.query(
      `SELECT 
        c.id,
        c.name,
        c.status as company_status,
        s.id as subscription_id,
        s.status as subscription_status,
        s.expires_at,
        s.plan_id,
        p.name as plan_name,
        p.max_users,
        p.max_products,
        p.max_orders
      FROM companies c
      LEFT JOIN subscriptions s ON s.company_id = c.id AND s.status IN ('active', 'past_due', 'trial')
      LEFT JOIN plans p ON p.id = s.plan_id
      WHERE c.id = $1`,
      [req.companyId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Empresa não encontrada',
        code: 'COMPANY_NOT_FOUND'
      });
    }

    const company = result.rows[0];

    // Verificar se empresa está bloqueada
    if (company.company_status === 'blocked' || company.company_status === 'suspended') {
      return res.status(403).json({ 
        error: 'Empresa bloqueada. Entre em contato com o suporte.',
        code: 'COMPANY_BLOCKED',
        status: company.company_status
      });
    }

    // Se não tem assinatura, verificar se está em período de trial
    if (!company.subscription_id) {
      // Verificar se a empresa foi criada recentemente (trial de 14 dias)
      const companyCreated = await pool.query(
        'SELECT created_at FROM companies WHERE id = $1',
        [req.companyId]
      );
      
      if (companyCreated.rows.length > 0) {
        const createdAt = new Date(companyCreated.rows[0].created_at);
        const trialEnds = new Date(createdAt);
        trialEnds.setDate(trialEnds.getDate() + 14);
        
        if (new Date() > trialEnds) {
          return res.status(403).json({ 
            error: 'Período de trial expirado. Por favor, assine um plano para continuar.',
            code: 'TRIAL_EXPIRED',
            trialEnded: trialEnds.toISOString()
          });
        }
      }
      
      // Adicionar informações do plano ao request (trial)
      req.subscription = {
        status: 'trial',
        plan: null,
        limits: {
          max_users: 3,
          max_products: 100,
          max_orders: 50
        }
      };
      return next();
    }

    // Verificar se assinatura expirou
    if (company.expires_at) {
      const expiresAt = new Date(company.expires_at);
      const now = new Date();
      const gracePeriodEnd = new Date(expiresAt);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

      if (now > gracePeriodEnd) {
        // Bloquear empresa automaticamente
        await pool.query(
          `UPDATE companies SET status = 'suspended', updated_at = NOW() WHERE id = $1`,
          [req.companyId]
        );
        
        await pool.query(
          `UPDATE subscriptions SET status = 'expired', updated_at = NOW() WHERE id = $1`,
          [company.subscription_id]
        );

        // Registrar log
        await pool.query(
          `INSERT INTO usage_logs (company_id, action, details, created_at)
           VALUES ($1, 'subscription_expired', $2, NOW())`,
          [req.companyId, JSON.stringify({ 
            expired_at: expiresAt.toISOString(),
            blocked_at: now.toISOString()
          })]
        );

        return res.status(403).json({ 
          error: 'Assinatura expirada. Por favor, renove seu plano para continuar.',
          code: 'SUBSCRIPTION_EXPIRED',
          expiredAt: expiresAt.toISOString(),
          gracePeriodEnded: gracePeriodEnd.toISOString()
        });
      }

      // Se está no período de tolerância, avisar mas permitir acesso
      if (now > expiresAt && now <= gracePeriodEnd) {
        const daysRemaining = Math.ceil((gracePeriodEnd - now) / (1000 * 60 * 60 * 24));
        
        // Marcar como past_due se ainda não estiver
        if (company.subscription_status === 'active') {
          await pool.query(
            `UPDATE subscriptions SET status = 'past_due', updated_at = NOW() WHERE id = $1`,
            [company.subscription_id]
          );
        }

        // Adicionar aviso no header da resposta
        res.setHeader('X-Subscription-Warning', `Assinatura vencida. ${daysRemaining} dias para renovar.`);
        res.setHeader('X-Subscription-Status', 'past_due');
        res.setHeader('X-Grace-Period-Ends', gracePeriodEnd.toISOString());
      }
    }

    // Adicionar informações do plano ao request
    req.subscription = {
      id: company.subscription_id,
      status: company.subscription_status,
      expiresAt: company.expires_at,
      plan: {
        id: company.plan_id,
        name: company.plan_name
      },
      limits: {
        max_users: company.max_users || 999999,
        max_products: company.max_products || 999999,
        max_orders: company.max_orders || 999999
      }
    };

    next();
  } catch (error) {
    console.error('[Subscription] Erro ao verificar assinatura:', error);
    // Em caso de erro, permitir acesso mas logar o problema
    next();
  }
};

/**
 * Middleware para verificar limites do plano
 */
export const checkPlanLimits = (resourceType) => {
  return async (req, res, next) => {
    try {
      // Se não tem informações de assinatura, pular
      if (!req.subscription || !req.companyId) {
        return next();
      }

      // Empresa principal não tem limites
      if (req.companyId === ADMIN_COMPANY_ID) {
        return next();
      }

      const limits = req.subscription.limits;
      let currentCount = 0;
      let maxAllowed = 999999;

      switch (resourceType) {
        case 'users':
          const usersResult = await pool.query(
            'SELECT COUNT(*) FROM users WHERE company_id = $1',
            [req.companyId]
          );
          currentCount = parseInt(usersResult.rows[0].count);
          maxAllowed = limits.max_users;
          break;

        case 'products':
          const productsResult = await pool.query(
            'SELECT COUNT(*) FROM produtos WHERE company_id = $1',
            [req.companyId]
          );
          currentCount = parseInt(productsResult.rows[0].count);
          maxAllowed = limits.max_products;
          break;

        case 'orders':
          // Contar ordens do mês atual
          const ordersResult = await pool.query(
            `SELECT COUNT(*) FROM ordens_servico 
             WHERE company_id = $1 
             AND created_at >= date_trunc('month', CURRENT_DATE)`,
            [req.companyId]
          );
          currentCount = parseInt(ordersResult.rows[0].count);
          maxAllowed = limits.max_orders;
          break;
      }

      if (currentCount >= maxAllowed) {
        return res.status(403).json({
          error: `Limite de ${resourceType} atingido. Seu plano permite até ${maxAllowed}.`,
          code: 'PLAN_LIMIT_REACHED',
          resource: resourceType,
          current: currentCount,
          limit: maxAllowed
        });
      }

      // Avisar se está próximo do limite (80%)
      if (currentCount >= maxAllowed * 0.8) {
        res.setHeader('X-Plan-Warning', `Você está usando ${currentCount} de ${maxAllowed} ${resourceType}.`);
      }

      next();
    } catch (error) {
      console.error('[PlanLimits] Erro ao verificar limites:', error);
      next();
    }
  };
};

/**
 * Job para verificar e bloquear empresas inadimplentes
 * Deve ser executado periodicamente (ex: diariamente via cron)
 */
export const checkAndBlockOverdueCompanies = async () => {
  try {
    console.log('[Subscription] Verificando empresas inadimplentes...');

    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() - GRACE_PERIOD_DAYS);

    // Buscar assinaturas expiradas além do período de tolerância
    const result = await pool.query(
      `SELECT s.id, s.company_id, s.expires_at, c.name as company_name
       FROM subscriptions s
       JOIN companies c ON c.id = s.company_id
       WHERE s.status IN ('active', 'past_due')
       AND s.expires_at < $1
       AND c.status NOT IN ('blocked', 'suspended')
       AND c.id != $2`,
      [gracePeriodEnd, ADMIN_COMPANY_ID]
    );

    console.log(`[Subscription] ${result.rows.length} empresas para bloquear`);

    for (const sub of result.rows) {
      // Bloquear empresa
      await pool.query(
        `UPDATE companies SET status = 'suspended', updated_at = NOW() WHERE id = $1`,
        [sub.company_id]
      );

      await pool.query(
        `UPDATE subscriptions SET status = 'expired', updated_at = NOW() WHERE id = $1`,
        [sub.id]
      );

      // Registrar log
      await pool.query(
        `INSERT INTO usage_logs (company_id, action, details, created_at)
         VALUES ($1, 'auto_blocked_overdue', $2, NOW())`,
        [sub.company_id, JSON.stringify({ 
          subscription_id: sub.id,
          expired_at: sub.expires_at,
          company_name: sub.company_name
        })]
      );

      console.log(`[Subscription] Empresa bloqueada: ${sub.company_name} (${sub.company_id})`);
    }

    return { blocked: result.rows.length };
  } catch (error) {
    console.error('[Subscription] Erro ao verificar inadimplentes:', error);
    throw error;
  }
};

export default { checkSubscription, checkPlanLimits, checkAndBlockOverdueCompanies };

