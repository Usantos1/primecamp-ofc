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
// DEVOLUÇÕES
// ═══════════════════════════════════════════════════════

// Listar devoluções
router.get('/', async (req, res) => {
  try {
    const companyId = req.companyId;
    const { status, startDate, endDate, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT r.*, 
             v.name as sale_customer_name,
             v.total as sale_total,
             u.email as created_by_email
      FROM refunds r
      LEFT JOIN vendas v ON r.sale_id = v.id
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.company_id = $1
    `;
    const params = [companyId];
    let paramIndex = 2;
    
    if (status) {
      query += ` AND r.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (startDate) {
      query += ` AND r.created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND r.created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    query += ` ORDER BY r.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Refunds] Erro ao listar devoluções:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Buscar devolução por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId;
    
    const refundResult = await pool.query(`
      SELECT r.*, 
             v.name as sale_customer_name,
             v.total as sale_total,
             vc.code as voucher_code,
             vc.current_value as voucher_current_value
      FROM refunds r
      LEFT JOIN vendas v ON r.sale_id = v.id
      LEFT JOIN vouchers vc ON r.voucher_id = vc.id
      WHERE r.id = $1 AND r.company_id = $2
    `, [id, companyId]);
    
    if (refundResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Devolução não encontrada' });
    }
    
    const itemsResult = await pool.query(`
      SELECT ri.*, p.nome as product_full_name
      FROM refund_items ri
      LEFT JOIN produtos p ON ri.product_id = p.id
      WHERE ri.refund_id = $1
    `, [id]);
    
    res.json({
      success: true,
      data: {
        ...refundResult.rows[0],
        items: itemsResult.rows
      }
    });
  } catch (error) {
    console.error('[Refunds] Erro ao buscar devolução:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Criar devolução
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const companyId = req.companyId;
    const userId = req.user.id;
    const {
      sale_id,
      refund_type,
      reason,
      reason_details,
      refund_method,
      items,
      customer_id,
      customer_name,
      notes
    } = req.body;
    
    // Buscar próximo número de devolução
    const seqResult = await client.query("SELECT nextval('refund_number_seq') as num");
    const refundNumber = `DEV${String(seqResult.rows[0].num).padStart(6, '0')}`;
    
    // Calcular valor total da devolução
    const totalRefundValue = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    
    // Criar devolução
    const refundResult = await client.query(`
      INSERT INTO refunds (
        company_id, sale_id, refund_number, refund_type, reason, reason_details,
        total_refund_value, refund_method, customer_id, customer_name, notes,
        status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12)
      RETURNING *
    `, [
      companyId, sale_id, refundNumber, refund_type, reason, reason_details,
      totalRefundValue, refund_method, customer_id, customer_name, notes, userId
    ]);
    
    const refund = refundResult.rows[0];
    
    // Inserir itens da devolução
    for (const item of items) {
      await client.query(`
        INSERT INTO refund_items (
          refund_id, sale_item_id, product_id, product_name, quantity,
          unit_price, total_price, reason, condition, return_to_stock
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        refund.id, item.sale_item_id, item.product_id, item.product_name,
        item.quantity, item.unit_price, item.quantity * item.unit_price,
        item.reason || reason, item.condition || 'novo', item.return_to_stock !== false
      ]);
    }
    
    // Se o método for vale compra, criar o vale
    let voucher = null;
    if (refund_method === 'voucher') {
      const voucherCodeResult = await client.query("SELECT generate_voucher_code() as code");
      const voucherCode = voucherCodeResult.rows[0].code;
      
      // Pegar documento do cliente se disponível
      let customerDocument = null;
      let customerPhone = null;
      if (customer_id) {
        const customerResult = await client.query(
          'SELECT cpf_cnpj, telefone FROM clientes WHERE id = $1',
          [customer_id]
        );
        if (customerResult.rows.length > 0) {
          customerDocument = customerResult.rows[0].cpf_cnpj;
          customerPhone = customerResult.rows[0].telefone;
        }
      }
      
      const voucherResult = await client.query(`
        INSERT INTO vouchers (
          company_id, code, original_sale_id, refund_id, customer_id,
          customer_name, customer_document, customer_phone,
          original_value, current_value, is_transferable, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, $11)
        RETURNING *
      `, [
        companyId, voucherCode, sale_id, refund.id, customer_id,
        customer_name, customerDocument, customerPhone,
        totalRefundValue, totalRefundValue, userId
      ]);
      
      voucher = voucherResult.rows[0];
      
      // Atualizar devolução com o ID do vale
      await client.query(
        'UPDATE refunds SET voucher_id = $1 WHERE id = $2',
        [voucher.id, refund.id]
      );
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      data: {
        refund: { ...refund, voucher_id: voucher?.id },
        voucher
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Refunds] Erro ao criar devolução:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Aprovar devolução
router.put('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.companyId;
    const userId = req.user.id;
    
    const result = await pool.query(`
      UPDATE refunds 
      SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
      WHERE id = $2 AND company_id = $3 AND status = 'pending'
      RETURNING *
    `, [userId, id, companyId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Devolução não encontrada ou já processada' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Refunds] Erro ao aprovar devolução:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Completar devolução (executar estorno e retorno ao estoque)
router.put('/:id/complete', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const companyId = req.companyId;
    const userId = req.user.id;
    
    // Buscar devolução
    const refundResult = await client.query(
      'SELECT * FROM refunds WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
    
    if (refundResult.rows.length === 0) {
      throw new Error('Devolução não encontrada');
    }
    
    const refund = refundResult.rows[0];
    
    if (refund.status !== 'approved' && refund.status !== 'pending') {
      throw new Error('Devolução já foi processada');
    }
    
    // Buscar itens da devolução
    const itemsResult = await client.query(
      'SELECT * FROM refund_items WHERE refund_id = $1',
      [id]
    );
    
    // Retornar produtos ao estoque
    for (const item of itemsResult.rows) {
      if (item.return_to_stock && item.product_id) {
        await client.query(`
          UPDATE produtos 
          SET quantidade = COALESCE(quantidade, 0) + $1, updated_at = NOW()
          WHERE id = $2
        `, [item.quantity, item.product_id]);
      }
    }
    
    // Atualizar status da devolução
    await client.query(`
      UPDATE refunds 
      SET status = 'completed', completed_by = $1, completed_at = NOW(), updated_at = NOW()
      WHERE id = $2
    `, [userId, id]);
    
    await client.query('COMMIT');
    
    res.json({ success: true, message: 'Devolução completada com sucesso' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Refunds] Erro ao completar devolução:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Cancelar devolução
router.put('/:id/cancel', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { reason } = req.body;
    const companyId = req.companyId;
    const userId = req.user.id;
    
    // Buscar devolução
    const refundResult = await client.query(
      'SELECT * FROM refunds WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
    
    if (refundResult.rows.length === 0) {
      throw new Error('Devolução não encontrada');
    }
    
    const refund = refundResult.rows[0];
    
    if (refund.status === 'completed') {
      throw new Error('Não é possível cancelar uma devolução já completada');
    }
    
    // Se tiver vale compra, cancelar também
    if (refund.voucher_id) {
      await client.query(
        "UPDATE vouchers SET status = 'cancelled', updated_at = NOW() WHERE id = $1",
        [refund.voucher_id]
      );
    }
    
    // Atualizar status da devolução
    await client.query(`
      UPDATE refunds 
      SET status = 'cancelled', cancelled_by = $1, cancelled_at = NOW(), 
          cancel_reason = $2, updated_at = NOW()
      WHERE id = $3
    `, [userId, reason, id]);
    
    await client.query('COMMIT');
    
    res.json({ success: true, message: 'Devolução cancelada com sucesso' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Refunds] Erro ao cancelar devolução:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════
// VALES COMPRA
// ═══════════════════════════════════════════════════════

// Listar vales
router.get('/vouchers/list', async (req, res) => {
  try {
    const companyId = req.companyId;
    const { status, customer, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT v.*, 
             u.email as created_by_email
      FROM vouchers v
      LEFT JOIN users u ON v.created_by = u.id
      WHERE v.company_id = $1
    `;
    const params = [companyId];
    let paramIndex = 2;
    
    if (status) {
      query += ` AND v.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (customer) {
      query += ` AND (v.customer_name ILIKE $${paramIndex} OR v.customer_document LIKE $${paramIndex})`;
      params.push(`%${customer}%`);
      paramIndex++;
    }
    
    query += ` ORDER BY v.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Vouchers] Erro ao listar vales:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Buscar vale por código
router.get('/vouchers/code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const companyId = req.companyId;
    
    const result = await pool.query(`
      SELECT v.*,
             r.refund_number,
             r.reason as refund_reason
      FROM vouchers v
      LEFT JOIN refunds r ON v.refund_id = r.id
      WHERE v.code = $1 AND v.company_id = $2
    `, [code.toUpperCase(), companyId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Vale não encontrado' });
    }
    
    const voucher = result.rows[0];
    
    // Verificar validade
    if (voucher.status !== 'active') {
      return res.json({
        success: false,
        error: `Vale ${voucher.status === 'used' ? 'já utilizado' : voucher.status === 'expired' ? 'expirado' : 'cancelado'}`,
        data: voucher
      });
    }
    
    if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
      await pool.query(
        "UPDATE vouchers SET status = 'expired', updated_at = NOW() WHERE id = $1",
        [voucher.id]
      );
      return res.json({
        success: false,
        error: 'Vale expirado',
        data: { ...voucher, status: 'expired' }
      });
    }
    
    res.json({ success: true, data: voucher });
  } catch (error) {
    console.error('[Vouchers] Erro ao buscar vale:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Usar vale em uma venda
router.post('/vouchers/:id/use', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { sale_id, amount, customer_document } = req.body;
    const companyId = req.companyId;
    const userId = req.user.id;
    
    // Buscar vale
    const voucherResult = await client.query(
      'SELECT * FROM vouchers WHERE id = $1 AND company_id = $2 FOR UPDATE',
      [id, companyId]
    );
    
    if (voucherResult.rows.length === 0) {
      throw new Error('Vale não encontrado');
    }
    
    const voucher = voucherResult.rows[0];
    
    // Validações
    if (voucher.status !== 'active') {
      throw new Error('Vale não está ativo');
    }
    
    if (voucher.current_value < amount) {
      throw new Error(`Saldo insuficiente. Saldo disponível: R$ ${voucher.current_value.toFixed(2)}`);
    }
    
    // Verificar se é intransferível e se o documento confere
    if (!voucher.is_transferable && voucher.customer_document && customer_document) {
      if (voucher.customer_document !== customer_document) {
        throw new Error('Este vale é intransferível e só pode ser usado pelo titular');
      }
    }
    
    const balanceBefore = voucher.current_value;
    const balanceAfter = balanceBefore - amount;
    const newStatus = balanceAfter === 0 ? 'used' : 'active';
    
    // Registrar uso
    await client.query(`
      INSERT INTO voucher_usage (voucher_id, sale_id, amount_used, balance_before, balance_after, used_by)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, sale_id, amount, balanceBefore, balanceAfter, userId]);
    
    // Atualizar vale
    await client.query(`
      UPDATE vouchers 
      SET current_value = $1, status = $2, updated_at = NOW()
      WHERE id = $3
    `, [balanceAfter, newStatus, id]);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      data: {
        amount_used: amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        voucher_status: newStatus
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Vouchers] Erro ao usar vale:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Histórico de uso do vale
router.get('/vouchers/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT vu.*, 
             v.numero as sale_number,
             u.email as used_by_email
      FROM voucher_usage vu
      LEFT JOIN vendas v ON vu.sale_id = v.id
      LEFT JOIN users u ON vu.used_by = u.id
      WHERE vu.voucher_id = $1
      ORDER BY vu.used_at DESC
    `, [id]);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Vouchers] Erro ao buscar histórico:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

