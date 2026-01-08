import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;

const router = express.Router();

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// ═══════════════════════════════════════════════════════
// FORMAS DE PAGAMENTO
// ═══════════════════════════════════════════════════════

// Listar formas de pagamento
router.get('/', async (req, res) => {
  try {
    const companyId = req.companyId;
    const { active_only } = req.query;
    
    let query = `
      SELECT pm.*,
             (SELECT COUNT(*) FROM payment_fees pf WHERE pf.payment_method_id = pm.id) as fees_count
      FROM payment_methods pm
      WHERE pm.company_id = $1
    `;
    
    if (active_only === 'true') {
      query += ' AND pm.is_active = true';
    }
    
    query += ' ORDER BY pm.sort_order, pm.name';
    
    const result = await pool.query(query, [companyId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[PaymentMethods] Erro ao listar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Buscar forma de pagamento por ID com taxas
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId;
    
    const methodResult = await pool.query(
      'SELECT * FROM payment_methods WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
    
    if (methodResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Forma de pagamento não encontrada' });
    }
    
    const feesResult = await pool.query(
      'SELECT * FROM payment_fees WHERE payment_method_id = $1 ORDER BY installments',
      [id]
    );
    
    res.json({
      success: true,
      data: {
        ...methodResult.rows[0],
        fees: feesResult.rows
      }
    });
  } catch (error) {
    console.error('[PaymentMethods] Erro ao buscar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Criar forma de pagamento
router.post('/', async (req, res) => {
  try {
    const companyId = req.companyId;
    const {
      name, code, description, is_active, accepts_installments,
      max_installments, min_value_for_installments, icon, color, sort_order
    } = req.body;
    
    const result = await pool.query(`
      INSERT INTO payment_methods (
        company_id, name, code, description, is_active, accepts_installments,
        max_installments, min_value_for_installments, icon, color, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      companyId, name, code, description, is_active !== false, accepts_installments || false,
      max_installments || 1, min_value_for_installments || 0, icon, color, sort_order || 0
    ]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[PaymentMethods] Erro ao criar:', error);
    if (error.code === '23505') { // unique_violation
      return res.status(400).json({ success: false, error: 'Já existe uma forma de pagamento com este código' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atualizar forma de pagamento
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId;
    const {
      name, code, description, is_active, accepts_installments,
      max_installments, min_value_for_installments, icon, color, sort_order
    } = req.body;
    
    const result = await pool.query(`
      UPDATE payment_methods SET
        name = COALESCE($1, name),
        code = COALESCE($2, code),
        description = COALESCE($3, description),
        is_active = COALESCE($4, is_active),
        accepts_installments = COALESCE($5, accepts_installments),
        max_installments = COALESCE($6, max_installments),
        min_value_for_installments = COALESCE($7, min_value_for_installments),
        icon = COALESCE($8, icon),
        color = COALESCE($9, color),
        sort_order = COALESCE($10, sort_order),
        updated_at = NOW()
      WHERE id = $11 AND company_id = $12
      RETURNING *
    `, [
      name, code, description, is_active, accepts_installments,
      max_installments, min_value_for_installments, icon, color, sort_order,
      id, companyId
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Forma de pagamento não encontrada' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[PaymentMethods] Erro ao atualizar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Deletar forma de pagamento
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId;
    
    // Verificar se está sendo usada em vendas
    const usageCheck = await pool.query(
      "SELECT COUNT(*) as count FROM payments WHERE forma_pagamento = (SELECT code FROM payment_methods WHERE id = $1)",
      [id]
    );
    
    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Esta forma de pagamento está sendo usada em vendas e não pode ser excluída. Você pode desativá-la.'
      });
    }
    
    const result = await pool.query(
      'DELETE FROM payment_methods WHERE id = $1 AND company_id = $2 RETURNING *',
      [id, companyId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Forma de pagamento não encontrada' });
    }
    
    res.json({ success: true, message: 'Forma de pagamento excluída com sucesso' });
  } catch (error) {
    console.error('[PaymentMethods] Erro ao deletar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════
// TAXAS DE PAGAMENTO
// ═══════════════════════════════════════════════════════

// Listar taxas de uma forma de pagamento
router.get('/:id/fees', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM payment_fees WHERE payment_method_id = $1 ORDER BY installments',
      [id]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[PaymentFees] Erro ao listar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Criar/atualizar taxa
router.post('/:id/fees', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId;
    const { installments, fee_percentage, fee_fixed, days_to_receive, description, is_active } = req.body;
    
    // Verificar se a forma de pagamento pertence à empresa
    const methodCheck = await pool.query(
      'SELECT id FROM payment_methods WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
    
    if (methodCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Forma de pagamento não encontrada' });
    }
    
    // Upsert da taxa
    const result = await pool.query(`
      INSERT INTO payment_fees (
        company_id, payment_method_id, installments, fee_percentage, 
        fee_fixed, days_to_receive, description, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (payment_method_id, installments) DO UPDATE SET
        fee_percentage = EXCLUDED.fee_percentage,
        fee_fixed = EXCLUDED.fee_fixed,
        days_to_receive = EXCLUDED.days_to_receive,
        description = EXCLUDED.description,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING *
    `, [
      companyId, id, installments, fee_percentage || 0,
      fee_fixed || 0, days_to_receive || 0, description, is_active !== false
    ]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[PaymentFees] Erro ao criar/atualizar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Deletar taxa
router.delete('/:methodId/fees/:feeId', async (req, res) => {
  try {
    const { methodId, feeId } = req.params;
    const companyId = req.companyId;
    
    const result = await pool.query(`
      DELETE FROM payment_fees 
      WHERE id = $1 AND payment_method_id = $2 
        AND company_id = $3
      RETURNING *
    `, [feeId, methodId, companyId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Taxa não encontrada' });
    }
    
    res.json({ success: true, message: 'Taxa excluída com sucesso' });
  } catch (error) {
    console.error('[PaymentFees] Erro ao deletar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atualizar todas as taxas de uma forma de pagamento de uma vez
router.put('/:id/fees/bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const companyId = req.companyId;
    const { fees } = req.body;
    
    // Verificar se a forma de pagamento pertence à empresa
    const methodCheck = await client.query(
      'SELECT id FROM payment_methods WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
    
    if (methodCheck.rows.length === 0) {
      throw new Error('Forma de pagamento não encontrada');
    }
    
    // Deletar taxas existentes
    await client.query('DELETE FROM payment_fees WHERE payment_method_id = $1', [id]);
    
    // Inserir novas taxas
    for (const fee of fees) {
      await client.query(`
        INSERT INTO payment_fees (
          company_id, payment_method_id, installments, fee_percentage,
          fee_fixed, days_to_receive, description, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        companyId, id, fee.installments, fee.fee_percentage || 0,
        fee.fee_fixed || 0, fee.days_to_receive || 0, fee.description, fee.is_active !== false
      ]);
    }
    
    await client.query('COMMIT');
    
    // Buscar taxas atualizadas
    const result = await pool.query(
      'SELECT * FROM payment_fees WHERE payment_method_id = $1 ORDER BY installments',
      [id]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[PaymentFees] Erro ao atualizar em lote:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════
// CÁLCULO DE LUCRO LÍQUIDO
// ═══════════════════════════════════════════════════════

// Calcular lucro líquido de uma venda considerando taxas
router.post('/calculate-net', async (req, res) => {
  try {
    const companyId = req.companyId;
    const { payment_method_code, installments, gross_amount } = req.body;
    
    // Buscar forma de pagamento e taxa
    const feeResult = await pool.query(`
      SELECT pf.fee_percentage, pf.fee_fixed, pf.days_to_receive
      FROM payment_methods pm
      JOIN payment_fees pf ON pf.payment_method_id = pm.id
      WHERE pm.company_id = $1 AND pm.code = $2 AND pf.installments = $3
    `, [companyId, payment_method_code, installments || 1]);
    
    let fee_percentage = 0;
    let fee_fixed = 0;
    let days_to_receive = 0;
    
    if (feeResult.rows.length > 0) {
      fee_percentage = parseFloat(feeResult.rows[0].fee_percentage) || 0;
      fee_fixed = parseFloat(feeResult.rows[0].fee_fixed) || 0;
      days_to_receive = feeResult.rows[0].days_to_receive || 0;
    }
    
    const fee_amount = (gross_amount * fee_percentage / 100) + fee_fixed;
    const net_amount = gross_amount - fee_amount;
    
    res.json({
      success: true,
      data: {
        gross_amount,
        fee_percentage,
        fee_fixed,
        fee_amount: parseFloat(fee_amount.toFixed(2)),
        net_amount: parseFloat(net_amount.toFixed(2)),
        days_to_receive
      }
    });
  } catch (error) {
    console.error('[PaymentMethods] Erro ao calcular:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Relatório de taxas por período
router.get('/report/fees', async (req, res) => {
  try {
    const companyId = req.companyId;
    const { start_date, end_date } = req.query;
    
    const result = await pool.query(`
      SELECT 
        pm.name as payment_method,
        p.parcelas as installments,
        COUNT(*) as total_transactions,
        SUM(p.valor) as gross_total,
        SUM(COALESCE(p.taxa_cartao, 0)) as total_fees,
        SUM(p.valor - COALESCE(p.taxa_cartao, 0)) as net_total
      FROM payments p
      JOIN vendas v ON p.sale_id = v.id
      LEFT JOIN payment_methods pm ON pm.code = p.forma_pagamento AND pm.company_id = $1
      WHERE v.company_id = $1
        AND v.created_at >= $2
        AND v.created_at <= $3
        AND p.status = 'confirmed'
      GROUP BY pm.name, p.parcelas
      ORDER BY gross_total DESC
    `, [companyId, start_date, end_date]);
    
    // Totais gerais
    const totalsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(p.valor) as gross_total,
        SUM(COALESCE(p.taxa_cartao, 0)) as total_fees,
        SUM(p.valor - COALESCE(p.taxa_cartao, 0)) as net_total
      FROM payments p
      JOIN vendas v ON p.sale_id = v.id
      WHERE v.company_id = $1
        AND v.created_at >= $2
        AND v.created_at <= $3
        AND p.status = 'confirmed'
    `, [companyId, start_date, end_date]);
    
    res.json({
      success: true,
      data: {
        by_method: result.rows,
        totals: totalsResult.rows[0]
      }
    });
  } catch (error) {
    console.error('[PaymentMethods] Erro no relatório:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

