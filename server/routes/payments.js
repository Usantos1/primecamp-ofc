// Rotas para sistema de pagamentos PIX (/api/payments/*)
import express from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';
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

// Gerar código PIX (simulação - em produção usar API de pagamentos)
function generatePixCode(amount, description, txid) {
  // Formato PIX Copia e Cola simplificado
  const pixKey = process.env.PIX_KEY || 'contato@primecamp.cloud';
  const merchantName = 'PRIME CAMP LTDA';
  const merchantCity = 'SAO PAULO';
  
  // Código PIX simplificado para demonstração
  const pixCode = `00020126${pixKey.length.toString().padStart(2, '0')}01${pixKey}5204000053039865406${amount.toFixed(2)}5802BR5913${merchantName}6009${merchantCity}62${txid.length.toString().padStart(2, '0')}05${txid}6304`;
  
  return pixCode;
}

// Gerar QR Code PIX em formato Base64
function generateQRCodeBase64(pixCode) {
  // Em produção, usar uma biblioteca como 'qrcode' para gerar QR Code real
  // Por enquanto retornamos o código para ser processado no frontend
  return pixCode;
}

// ================== ROTAS DE PAGAMENTOS ==================

// Criar novo pagamento PIX
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { company_id, subscription_id, amount, description } = req.body;

    if (!company_id || !amount) {
      return res.status(400).json({ error: 'company_id e amount são obrigatórios' });
    }

    // Gerar ID único para a transação
    const txid = crypto.randomBytes(16).toString('hex').toUpperCase();
    const externalId = `PIX_${txid}`;

    // Gerar código PIX
    const pixCode = generatePixCode(parseFloat(amount), description || 'Assinatura Prime Camp', txid);
    const qrCodeBase64 = generateQRCodeBase64(pixCode);

    // Data de expiração (24 horas)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Criar registro de pagamento
    const result = await pool.query(
      `INSERT INTO payments (
        company_id, subscription_id, valor, forma_pagamento, 
        status, external_id, pix_code, pix_qr_code, expires_at,
        description, created_at, sale_id, troco
      ) VALUES ($1, $2, $3, 'pix', 'pending', $4, $5, $6, $7, $8, NOW(), 
        (SELECT id FROM vendas WHERE company_id = $1 LIMIT 1), 0)
      RETURNING *, valor as amount`,
      [company_id, subscription_id, amount, externalId, pixCode, qrCodeBase64, expiresAt, description]
    );

    res.json({
      success: true,
      data: result.rows[0],
      pix: {
        code: pixCode,
        qrCode: qrCodeBase64,
        expiresAt: expiresAt.toISOString(),
        txid: txid
      }
    });
  } catch (error) {
    console.error('[Payments] Erro ao criar pagamento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook para confirmação de pagamento (chamado pelo gateway de pagamento)
router.post('/webhook', async (req, res) => {
  try {
    const { txid, status, paid_at, external_id } = req.body;
    
    // Verificar assinatura do webhook (em produção)
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers['x-webhook-signature'];
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');
      
      if (signature !== expectedSignature) {
        return res.status(401).json({ error: 'Assinatura inválida' });
      }
    }

    // Buscar pagamento pelo external_id ou txid
    const searchId = external_id || `PIX_${txid}`;
    const payment = await pool.query(
      'SELECT * FROM payments WHERE external_id = $1',
      [searchId]
    );

    if (payment.rows.length === 0) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    const paymentData = payment.rows[0];

    // Atualizar status do pagamento
    if (status === 'paid' || status === 'approved' || status === 'confirmed') {
      await pool.query(
        `UPDATE payments 
         SET status = 'paid', paid_at = $1, updated_at = NOW()
         WHERE id = $2`,
        [paid_at || new Date(), paymentData.id]
      );

      // Ativar/renovar assinatura da empresa
      if (paymentData.subscription_id) {
        // Buscar plano da assinatura
        const subscription = await pool.query(
          'SELECT * FROM subscriptions WHERE id = $1',
          [paymentData.subscription_id]
        );

        if (subscription.rows.length > 0) {
          const sub = subscription.rows[0];
          const newExpiresAt = new Date();
          
          // Adicionar período baseado no ciclo de cobrança
          if (sub.billing_cycle === 'yearly') {
            newExpiresAt.setFullYear(newExpiresAt.getFullYear() + 1);
          } else {
            newExpiresAt.setMonth(newExpiresAt.getMonth() + 1);
          }

          await pool.query(
            `UPDATE subscriptions 
             SET status = 'active', expires_at = $1, updated_at = NOW()
             WHERE id = $2`,
            [newExpiresAt, paymentData.subscription_id]
          );

          // Atualizar status da empresa para ativo
          await pool.query(
            `UPDATE companies 
             SET status = 'active', updated_at = NOW()
             WHERE id = $1`,
            [paymentData.company_id]
          );
        }
      }

      // Registrar no log de uso
      await pool.query(
        `INSERT INTO usage_logs (company_id, action, details, created_at)
         VALUES ($1, 'payment_confirmed', $2, NOW())`,
        [paymentData.company_id, JSON.stringify({ payment_id: paymentData.id, amount: paymentData.valor })]
      );

      console.log('[Payments] Pagamento confirmado:', paymentData.id);
    } else if (status === 'cancelled' || status === 'expired' || status === 'failed') {
      await pool.query(
        `UPDATE payments 
         SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [status, paymentData.id]
      );
    }

    res.json({ success: true, message: 'Webhook processado' });
  } catch (error) {
    console.error('[Payments] Erro no webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verificar status de um pagamento
router.get('/status/:paymentId', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const result = await pool.query(
      `SELECT p.*, c.name as company_name 
       FROM payments p
       JOIN companies c ON c.id = p.company_id
       WHERE p.id = $1`,
      [paymentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Payments] Erro ao buscar status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar pagamentos de uma empresa
router.get('/company/:companyId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT p.id, p.company_id, 
             COALESCE(p.valor, 0) as amount, 
             COALESCE(p.forma_pagamento, 'pix') as payment_method, 
             p.status, 
             COALESCE(p.external_id, '') as external_id, 
             p.created_at,
             p.subscription_id,
             p.pix_code,
             COALESCE(p.description, 'Pagamento') as description,
             p.paid_at,
             COALESCE(pl.name, 'N/A') as plan_name
      FROM payments p
      LEFT JOIN subscriptions s ON s.id = p.subscription_id
      LEFT JOIN plans pl ON pl.id = s.plan_id
      WHERE p.company_id = $1
    `;
    const params = [companyId];
    let paramCount = 2;

    if (status) {
      query += ` AND p.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Contar total
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM payments WHERE company_id = $1',
      [companyId]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count)
      }
    });
  } catch (error) {
    console.error('[Payments] Erro ao listar pagamentos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Simular confirmação de pagamento (apenas para testes)
router.post('/simulate-confirm/:paymentId', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;

    // Verificar se é ambiente de desenvolvimento
    if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PAYMENT_SIMULATION) {
      return res.status(403).json({ error: 'Simulação não permitida em produção' });
    }

    // Buscar pagamento
    const payment = await pool.query(
      'SELECT * FROM payments WHERE id = $1',
      [paymentId]
    );

    if (payment.rows.length === 0) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    const paymentData = payment.rows[0];

    if (paymentData.status === 'paid') {
      return res.status(400).json({ error: 'Pagamento já foi confirmado' });
    }

    // Simular webhook de confirmação
    const webhookBody = {
      external_id: paymentData.external_id,
      status: 'paid',
      paid_at: new Date().toISOString()
    };

    // Chamar lógica do webhook internamente
    await pool.query(
      `UPDATE payments 
       SET status = 'paid', paid_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [paymentId]
    );

    // Ativar assinatura se existir
    if (paymentData.subscription_id) {
      const subscription = await pool.query(
        'SELECT * FROM subscriptions WHERE id = $1',
        [paymentData.subscription_id]
      );

      if (subscription.rows.length > 0) {
        const sub = subscription.rows[0];
        const newExpiresAt = new Date();
        
        if (sub.billing_cycle === 'yearly') {
          newExpiresAt.setFullYear(newExpiresAt.getFullYear() + 1);
        } else {
          newExpiresAt.setMonth(newExpiresAt.getMonth() + 1);
        }

        await pool.query(
          `UPDATE subscriptions 
           SET status = 'active', expires_at = $1, updated_at = NOW()
           WHERE id = $2`,
          [newExpiresAt, paymentData.subscription_id]
        );

        await pool.query(
          `UPDATE companies 
           SET status = 'active', updated_at = NOW()
           WHERE id = $1`,
          [paymentData.company_id]
        );
      }
    }

    res.json({ 
      success: true, 
      message: 'Pagamento confirmado (simulação)',
      data: { ...paymentData, status: 'paid' }
    });
  } catch (error) {
    console.error('[Payments] Erro ao simular confirmação:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

