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

// Helper para verificar se coluna existe
async function columnExists(tableName, columnName) {
  const result = await pool.query(`
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = $1 AND column_name = $2
  `, [tableName, columnName]);
  return result.rows.length > 0;
}

// ═══════════════════════════════════════════════════════
// FORMAS DE PAGAMENTO
// ═══════════════════════════════════════════════════════

// Listar formas de pagamento
router.get('/', async (req, res) => {
  try {
    const companyId = req.companyId;
    const { active_only } = req.query;
    
    // Verificar estrutura da tabela
    const hasCompanyId = await columnExists('payment_methods', 'company_id');
    const hasName = await columnExists('payment_methods', 'name');
    const hasCode = await columnExists('payment_methods', 'code');
    const hasDescription = await columnExists('payment_methods', 'description');
    const hasIsActive = await columnExists('payment_methods', 'is_active');
    const hasAcceptsInstallments = await columnExists('payment_methods', 'accepts_installments');
    const hasMinValueForInstallments = await columnExists('payment_methods', 'min_value_for_installments');
    const hasIcon = await columnExists('payment_methods', 'icon');
    const hasColor = await columnExists('payment_methods', 'color');
    const hasSortOrder = await columnExists('payment_methods', 'sort_order');
    const hasCreatedAt = await columnExists('payment_methods', 'created_at');
    const hasUpdatedAt = await columnExists('payment_methods', 'updated_at');
    
    const nameCol = hasName ? 'name' : 'nome';
    const codeCol = hasCode ? 'code' : 'codigo';
    const activeCol = hasIsActive ? 'is_active' : 'ativo';
    const descriptionCol = hasDescription ? 'pm.description' : 'NULL';
    const minValueCol = hasMinValueForInstallments ? 'COALESCE(pm.min_value_for_installments, 0)' : '0';
    const iconCol = hasIcon ? 'pm.icon' : 'NULL';
    const colorCol = hasColor ? 'pm.color' : 'NULL';
    const createdAtCol = hasCreatedAt ? 'pm.created_at' : 'NOW()';
    const updatedAtCol = hasUpdatedAt ? 'pm.updated_at' : 'NOW()';
    
    // Verificar se a tabela payment_fees existe
    let hasPaymentFeesTable = false;
    try {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'payment_fees'
        )
      `);
      hasPaymentFeesTable = tableCheck.rows[0]?.exists || false;
    } catch (e) {
      hasPaymentFeesTable = false;
    }
    
    const feesCountExpr = hasPaymentFeesTable 
      ? `(SELECT COUNT(*) FROM payment_fees pf WHERE pf.payment_method_id = pm.id)`
      : '0';
    
    let query = `
      SELECT pm.id, 
             pm.${nameCol} as name,
             pm.${codeCol} as code,
             ${descriptionCol} as description,
             COALESCE(pm.${activeCol}, true) as is_active,
             COALESCE(pm.${hasAcceptsInstallments ? 'accepts_installments' : 'permite_parcelamento'}, false) as accepts_installments,
             COALESCE(pm.${hasAcceptsInstallments ? 'max_installments' : 'max_parcelas'}, 1) as max_installments,
             ${minValueCol} as min_value_for_installments,
             ${iconCol} as icon,
             ${colorCol} as color,
             COALESCE(pm.${hasSortOrder ? 'sort_order' : 'ordem'}, 0) as sort_order,
             ${createdAtCol} as created_at,
             ${updatedAtCol} as updated_at,
             ${feesCountExpr} as fees_count
      FROM payment_methods pm
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (hasCompanyId && companyId) {
      query += ` AND (pm.company_id = $${paramIndex} OR pm.company_id IS NULL)`;
      params.push(companyId);
      paramIndex++;
    }
    
    if (active_only === 'true') {
      query += ` AND COALESCE(pm.${activeCol}, true) = true`;
    }
    
    query += ` ORDER BY COALESCE(pm.${hasSortOrder ? 'sort_order' : 'ordem'}, 0), pm.${nameCol}`;
    
    let result;
    try {
      result = await pool.query(query, params);
    } catch (queryError) {
      // Se ainda assim der erro na query (por algum motivo a tabela foi referenciada), 
      // tentar novamente sem a subquery de fees_count
      if (queryError.message && queryError.message.includes('payment_fees')) {
        query = query.replace(/,\s*\$\{feesCountExpr\}\s*as fees_count/, ', 0 as fees_count');
        result = await pool.query(query, params);
      } else {
        throw queryError;
      }
    }
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
    
    const hasName = await columnExists('payment_methods', 'name');
    const hasCode = await columnExists('payment_methods', 'code');
    const hasDescription = await columnExists('payment_methods', 'description');
    const hasIsActive = await columnExists('payment_methods', 'is_active');
    const hasAcceptsInstallments = await columnExists('payment_methods', 'accepts_installments');
    const hasMinValueForInstallments = await columnExists('payment_methods', 'min_value_for_installments');
    const hasIcon = await columnExists('payment_methods', 'icon');
    const hasColor = await columnExists('payment_methods', 'color');
    const hasSortOrder = await columnExists('payment_methods', 'sort_order');
    
    const nameCol = hasName ? 'name' : 'nome';
    const codeCol = hasCode ? 'code' : 'codigo';
    const activeCol = hasIsActive ? 'is_active' : 'ativo';
    const descriptionCol = hasDescription ? 'pm.description' : 'NULL';
    const minValueCol = hasMinValueForInstallments ? 'COALESCE(pm.min_value_for_installments, 0)' : '0';
    const iconCol = hasIcon ? 'pm.icon' : 'NULL';
    const colorCol = hasColor ? 'pm.color' : 'NULL';
    
    const methodResult = await pool.query(`
      SELECT pm.id, 
             pm.${nameCol} as name,
             pm.${codeCol} as code,
             ${descriptionCol} as description,
             COALESCE(pm.${activeCol}, true) as is_active,
             COALESCE(pm.${hasAcceptsInstallments ? 'accepts_installments' : 'permite_parcelamento'}, false) as accepts_installments,
             COALESCE(pm.${hasAcceptsInstallments ? 'max_installments' : 'max_parcelas'}, 1) as max_installments,
             ${minValueCol} as min_value_for_installments,
             ${iconCol} as icon,
             ${colorCol} as color,
             COALESCE(pm.${hasSortOrder ? 'sort_order' : 'ordem'}, 0) as sort_order
      FROM payment_methods pm
      WHERE pm.id = $1
    `, [id]);
    
    if (methodResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Forma de pagamento não encontrada' });
    }
    
    let fees = [];
    try {
      const feesResult = await pool.query(
        'SELECT * FROM payment_fees WHERE payment_method_id = $1 ORDER BY installments',
        [id]
      );
      fees = feesResult.rows;
    } catch (e) {
      // Tabela payment_fees pode não existir ainda
    }
    
    res.json({
      success: true,
      data: {
        ...methodResult.rows[0],
        fees
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
    
    // Verificar colunas existentes
    const hasCompanyId = await columnExists('payment_methods', 'company_id');
    const hasName = await columnExists('payment_methods', 'name');
    const hasCode = await columnExists('payment_methods', 'code');
    
    const nameCol = hasName ? 'name' : 'nome';
    const codeCol = hasCode ? 'code' : 'codigo';
    
    // Montar query dinamicamente
    const cols = ['id', nameCol, codeCol];
    const vals = ['gen_random_uuid()', '$1', '$2'];
    const params = [name, code];
    let paramIdx = 3;
    
    if (hasCompanyId && companyId) {
      cols.push('company_id');
      vals.push(`$${paramIdx}`);
      params.push(companyId);
      paramIdx++;
    }
    
    if (await columnExists('payment_methods', 'description')) {
      cols.push('description');
      vals.push(`$${paramIdx}`);
      params.push(description || '');
      paramIdx++;
    }
    
    if (await columnExists('payment_methods', 'is_active')) {
      cols.push('is_active');
      vals.push(`$${paramIdx}`);
      params.push(is_active !== false);
      paramIdx++;
    }
    
    if (await columnExists('payment_methods', 'accepts_installments')) {
      cols.push('accepts_installments');
      vals.push(`$${paramIdx}`);
      params.push(accepts_installments || false);
      paramIdx++;
    }
    
    if (await columnExists('payment_methods', 'max_installments')) {
      cols.push('max_installments');
      vals.push(`$${paramIdx}`);
      params.push(max_installments || 1);
      paramIdx++;
    }
    
    if (await columnExists('payment_methods', 'min_value_for_installments')) {
      cols.push('min_value_for_installments');
      vals.push(`$${paramIdx}`);
      params.push(min_value_for_installments || 0);
      paramIdx++;
    }
    
    if (await columnExists('payment_methods', 'icon')) {
      cols.push('icon');
      vals.push(`$${paramIdx}`);
      params.push(icon || null);
      paramIdx++;
    }
    
    if (await columnExists('payment_methods', 'color')) {
      cols.push('color');
      vals.push(`$${paramIdx}`);
      params.push(color || null);
      paramIdx++;
    }
    
    if (await columnExists('payment_methods', 'sort_order')) {
      cols.push('sort_order');
      vals.push(`$${paramIdx}`);
      params.push(sort_order || 0);
      paramIdx++;
    }
    
    const query = `INSERT INTO payment_methods (${cols.join(', ')}) VALUES (${vals.join(', ')}) RETURNING *`;
    
    const result = await pool.query(query, params);
    
    // Normalizar resposta
    const row = result.rows[0];
    res.json({ 
      success: true, 
      data: {
        id: row.id,
        name: row.name || row.nome,
        code: row.code || row.codigo,
        description: row.description,
        is_active: row.is_active ?? row.ativo ?? true,
        accepts_installments: row.accepts_installments || false,
        max_installments: row.max_installments || 1,
        min_value_for_installments: row.min_value_for_installments || 0,
        icon: row.icon,
        color: row.color,
        sort_order: row.sort_order || 0
      }
    });
  } catch (error) {
    console.error('[PaymentMethods] Erro ao criar:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: 'Já existe uma forma de pagamento com este código' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atualizar forma de pagamento
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, code, description, is_active, accepts_installments,
      max_installments, min_value_for_installments, icon, color, sort_order
    } = req.body;
    
    const hasName = await columnExists('payment_methods', 'name');
    const hasCode = await columnExists('payment_methods', 'code');
    
    const nameCol = hasName ? 'name' : 'nome';
    const codeCol = hasCode ? 'code' : 'codigo';
    
    const sets = [];
    const params = [];
    let paramIdx = 1;
    
    if (name !== undefined) {
      sets.push(`${nameCol} = $${paramIdx}`);
      params.push(name);
      paramIdx++;
    }
    
    if (code !== undefined && hasCode) {
      sets.push(`${codeCol} = $${paramIdx}`);
      params.push(code);
      paramIdx++;
    }
    
    if (description !== undefined && await columnExists('payment_methods', 'description')) {
      sets.push(`description = $${paramIdx}`);
      params.push(description);
      paramIdx++;
    }
    
    if (is_active !== undefined && await columnExists('payment_methods', 'is_active')) {
      sets.push(`is_active = $${paramIdx}`);
      params.push(is_active);
      paramIdx++;
    }
    
    if (accepts_installments !== undefined && await columnExists('payment_methods', 'accepts_installments')) {
      sets.push(`accepts_installments = $${paramIdx}`);
      params.push(accepts_installments);
      paramIdx++;
    }
    
    if (max_installments !== undefined && await columnExists('payment_methods', 'max_installments')) {
      sets.push(`max_installments = $${paramIdx}`);
      params.push(max_installments);
      paramIdx++;
    }
    
    if (min_value_for_installments !== undefined && await columnExists('payment_methods', 'min_value_for_installments')) {
      sets.push(`min_value_for_installments = $${paramIdx}`);
      params.push(min_value_for_installments);
      paramIdx++;
    }
    
    if (icon !== undefined && await columnExists('payment_methods', 'icon')) {
      sets.push(`icon = $${paramIdx}`);
      params.push(icon);
      paramIdx++;
    }
    
    if (color !== undefined && await columnExists('payment_methods', 'color')) {
      sets.push(`color = $${paramIdx}`);
      params.push(color);
      paramIdx++;
    }
    
    if (sort_order !== undefined && await columnExists('payment_methods', 'sort_order')) {
      sets.push(`sort_order = $${paramIdx}`);
      params.push(sort_order);
      paramIdx++;
    }
    
    if (await columnExists('payment_methods', 'updated_at')) {
      sets.push('updated_at = NOW()');
    }
    
    if (sets.length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhum campo para atualizar' });
    }
    
    params.push(id);
    const query = `UPDATE payment_methods SET ${sets.join(', ')} WHERE id = $${paramIdx} RETURNING *`;
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Forma de pagamento não encontrada' });
    }
    
    const row = result.rows[0];
    res.json({ 
      success: true, 
      data: {
        id: row.id,
        name: row.name || row.nome,
        code: row.code || row.codigo,
        description: row.description,
        is_active: row.is_active ?? row.ativo ?? true,
        accepts_installments: row.accepts_installments || false,
        max_installments: row.max_installments || 1,
        icon: row.icon,
        color: row.color,
        sort_order: row.sort_order || 0
      }
    });
  } catch (error) {
    console.error('[PaymentMethods] Erro ao atualizar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Deletar forma de pagamento
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM payment_methods WHERE id = $1 RETURNING *',
      [id]
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
    
    // Verificar se a forma de pagamento existe
    const methodCheck = await pool.query('SELECT id FROM payment_methods WHERE id = $1', [id]);
    
    if (methodCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Forma de pagamento não encontrada' });
    }
    
    // Verificar se já existe taxa para este número de parcelas
    const existingFee = await pool.query(
      'SELECT id FROM payment_fees WHERE payment_method_id = $1 AND installments = $2',
      [id, installments]
    );
    
    let result;
    if (existingFee.rows.length > 0) {
      // Atualizar
      result = await pool.query(`
        UPDATE payment_fees SET
          fee_percentage = $1,
          fee_fixed = $2,
          days_to_receive = $3,
          description = $4,
          is_active = $5,
          updated_at = NOW()
        WHERE payment_method_id = $6 AND installments = $7
        RETURNING *
      `, [fee_percentage || 0, fee_fixed || 0, days_to_receive || 0, description, is_active !== false, id, installments]);
    } else {
      // Inserir
      result = await pool.query(`
        INSERT INTO payment_fees (
          company_id, payment_method_id, installments, fee_percentage,
          fee_fixed, days_to_receive, description, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [companyId, id, installments, fee_percentage || 0, fee_fixed || 0, days_to_receive || 0, description, is_active !== false]);
    }
    
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
    
    const result = await pool.query(
      'DELETE FROM payment_fees WHERE id = $1 AND payment_method_id = $2 RETURNING *',
      [feeId, methodId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Taxa não encontrada' });
    }
    
    res.json({ success: true, message: 'Taxa excluída com sucesso' });
  } catch (error) {
    console.error('[PaymentFees] Erro ao deletar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atualizar todas as taxas de uma forma de pagamento
router.put('/:id/fees/bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const companyId = req.companyId;
    const { fees } = req.body;
    
    // Verificar se a forma de pagamento existe
    const methodCheck = await client.query('SELECT id FROM payment_methods WHERE id = $1', [id]);
    
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
      `, [companyId, id, fee.installments, fee.fee_percentage || 0, fee.fee_fixed || 0, fee.days_to_receive || 0, fee.description, fee.is_active !== false]);
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

// Calcular lucro líquido de uma venda
router.post('/calculate-net', async (req, res) => {
  try {
    const { payment_method_code, installments, gross_amount } = req.body;
    
    const hasCode = await columnExists('payment_methods', 'code');
    const codeCol = hasCode ? 'code' : 'codigo';
    
    const feeResult = await pool.query(`
      SELECT pf.fee_percentage, pf.fee_fixed, pf.days_to_receive
      FROM payment_methods pm
      JOIN payment_fees pf ON pf.payment_method_id = pm.id
      WHERE pm.${codeCol} = $1 AND pf.installments = $2
    `, [payment_method_code, installments || 1]);
    
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
    
    const hasCode = await columnExists('payment_methods', 'code');
    const codeCol = hasCode ? 'code' : 'codigo';
    const hasName = await columnExists('payment_methods', 'name');
    const nameCol = hasName ? 'name' : 'nome';
    
    const result = await pool.query(`
      SELECT 
        pm.${nameCol} as payment_method,
        p.parcelas as installments,
        COUNT(*) as total_transactions,
        SUM(p.valor) as gross_total,
        SUM(COALESCE(p.taxa_cartao, 0)) as total_fees,
        SUM(p.valor - COALESCE(p.taxa_cartao, 0)) as net_total
      FROM payments p
      JOIN vendas v ON p.sale_id = v.id
      LEFT JOIN payment_methods pm ON pm.${codeCol} = p.forma_pagamento
      WHERE v.created_at >= $1
        AND v.created_at <= $2
        AND p.status = 'confirmed'
      GROUP BY pm.${nameCol}, p.parcelas
      ORDER BY gross_total DESC
    `, [start_date, end_date]);
    
    const totalsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(p.valor) as gross_total,
        SUM(COALESCE(p.taxa_cartao, 0)) as total_fees,
        SUM(p.valor - COALESCE(p.taxa_cartao, 0)) as net_total
      FROM payments p
      JOIN vendas v ON p.sale_id = v.id
      WHERE v.created_at >= $1
        AND v.created_at <= $2
        AND p.status = 'confirmed'
    `, [start_date, end_date]);
    
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
