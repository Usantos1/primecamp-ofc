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

const branchScoped = (req, alias = '') => {
  const branchId = req.branchId;
  const useBranch = branchId && req.branchScope !== 'all';
  return {
    branchId: useBranch ? branchId : null,
    condition: useBranch ? ` AND ${alias ? `${alias}.` : ''}branch_id = $BRANCH_PARAM` : '',
  };
};

const appendBranchCondition = (query, params, req, alias = '') => {
  const scope = branchScoped(req, alias);
  if (!scope.branchId) return { query, params };
  const index = params.length + 1;
  return {
    query: query + scope.condition.replace('$BRANCH_PARAM', `$${index}`),
    params: [...params, scope.branchId],
  };
};

const isMissingRaffleTables = (error) => {
  const message = String(error?.message || '');
  return error?.code === '42P01' || message.includes('raffle_coupons') || message.includes('raffles');
};

async function refreshRaffleTotals(client, raffleIds = []) {
  const uniqueRaffleIds = Array.from(new Set(raffleIds.filter(Boolean)));
  for (const raffleId of uniqueRaffleIds) {
    await client.query(`
      UPDATE public.raffles
      SET total_coupons = (
            SELECT COUNT(*)::int
            FROM public.raffle_coupons
            WHERE raffle_id = $1
              AND status IN ('valid', 'winner')
          ),
          total_participants = (
            SELECT COUNT(DISTINCT customer_id)::int
            FROM public.raffle_coupons
            WHERE raffle_id = $1
              AND status IN ('valid', 'winner')
              AND customer_id IS NOT NULL
          ),
          eligible_sales_amount = (
            SELECT COALESCE(SUM(source_total_amount), 0)
            FROM (
              SELECT DISTINCT ON (
                COALESCE(sale_id::text, service_order_id::text, id::text)
              )
                source_total_amount
              FROM public.raffle_coupons
              WHERE raffle_id = $1
                AND status IN ('valid', 'winner')
              ORDER BY
                COALESCE(sale_id::text, service_order_id::text, id::text),
                generated_at ASC
            ) unique_sources
          ),
          updated_at = NOW()
      WHERE id = $1
    `, [raffleId]);
  }
}

async function cancelRaffleCouponsForRefund(client, {
  companyId,
  saleId,
  refundId,
  refundNumber,
  userId,
  reason,
}) {
  if (!companyId || !saleId) return { cancelled: 0 };

  try {
    const existingResult = await client.query(`
      SELECT *
      FROM public.raffle_coupons
      WHERE company_id = $1
        AND sale_id = $2
        AND status <> 'cancelled'
    `, [companyId, saleId]);

    if (existingResult.rows.length === 0) {
      return { cancelled: 0 };
    }

    const cancellationReason = reason || `Cancelado por devolução${refundNumber ? ` #${refundNumber}` : ''}`;
    const updatedResult = await client.query(`
      UPDATE public.raffle_coupons
      SET status = 'cancelled',
          cancelled_at = NOW(),
          cancellation_reason = $3,
          updated_at = NOW()
      WHERE company_id = $1
        AND sale_id = $2
        AND status <> 'cancelled'
      RETURNING *
    `, [companyId, saleId, cancellationReason]);

    for (const coupon of updatedResult.rows) {
      await client.query(`
        INSERT INTO public.raffle_audit_logs (
          company_id, raffle_id, coupon_id, customer_id, sale_id, user_id,
          action, origin, old_data, new_data, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'coupon_cancelled', 'system', $7::jsonb, $8::jsonb, $9::jsonb)
      `, [
        companyId,
        coupon.raffle_id,
        coupon.id,
        coupon.customer_id || null,
        saleId,
        userId || null,
        JSON.stringify(existingResult.rows.find((item) => item.id === coupon.id) || null),
        JSON.stringify(coupon),
        JSON.stringify({
          reason: cancellationReason,
          refund_id: refundId || null,
          refund_number: refundNumber || null,
        }),
      ]);
    }

    await refreshRaffleTotals(client, updatedResult.rows.map((coupon) => coupon.raffle_id));
    return { cancelled: updatedResult.rows.length };
  } catch (error) {
    if (isMissingRaffleTables(error)) {
      console.warn('[Refunds] Tabelas de sorteio ausentes; cupons não foram cancelados:', error.message);
      return { cancelled: 0, skipped: true };
    }
    throw error;
  }
}

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
             s.cliente_nome as sale_customer_name,
             s.total as sale_total,
             s.numero as original_sale_number,
             vc.code as voucher_code,
             u.email as created_by_email,
             u.email as created_by_name,
             u2.email as approved_by_email,
             u2.email as approved_by_name
      FROM refunds r
      LEFT JOIN sales s ON r.sale_id = s.id
      LEFT JOIN vouchers vc ON r.voucher_id = vc.id
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN users u2 ON r.approved_by = u2.id
      WHERE r.company_id = $1
    `;
    const params = [companyId];
    let paramIndex = 2;
    const branchScope = appendBranchCondition('', params, req, 'r');
    query += branchScope.query;
    params.splice(0, params.length, ...branchScope.params);
    paramIndex = params.length + 1;
    
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
    
    const refundBranch = branchScoped(req, 'r');
    const refundResult = await pool.query(`
      SELECT r.*, 
             s.cliente_nome as sale_customer_name,
             s.total as sale_total,
             s.numero as original_sale_number,
             vc.code as voucher_code,
             vc.current_value as voucher_current_value,
             u.email as created_by_email,
             u.email as created_by_name,
             u2.email as approved_by_email,
             u2.email as approved_by_name
      FROM refunds r
      LEFT JOIN sales s ON r.sale_id = s.id
      LEFT JOIN vouchers vc ON r.voucher_id = vc.id
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN users u2 ON r.approved_by = u2.id
      WHERE r.id = $1 AND r.company_id = $2${refundBranch.branchId ? ' AND r.branch_id = $3' : ''}
    `, refundBranch.branchId ? [id, companyId, refundBranch.branchId] : [id, companyId]);
    
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
    const userId = req.user?.id || req.user?.userId || null;
    const branchId = req.branchId || null;
    
    if (!companyId) {
      return res.status(401).json({
        success: false,
        error: 'Sessão inválida (company não identificada). Faça login novamente.'
      });
    }
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

    if (!sale_id) {
      return res.status(400).json({ success: false, error: 'sale_id é obrigatório' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Informe ao menos um item para devolução' });
    }
    
    // VERIFICAR SE JÁ EXISTE DEVOLUÇÃO PARA ESTA VENDA
    const existingRefund = await client.query(
      `SELECT id, refund_number, status FROM refunds 
       WHERE sale_id = $1 AND company_id = $2 AND status NOT IN ('cancelled')`,
      [sale_id, companyId]
    );
    
    if (existingRefund.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `Esta venda já possui devolução registrada (#${existingRefund.rows[0].refund_number}). Não é possível devolver novamente.`
      });
    }

    const saleResult = await client.query(
      `SELECT total, branch_id FROM sales WHERE id = $1 AND company_id = $2${branchId && req.branchScope !== 'all' ? ' AND branch_id = $3' : ''}`,
      branchId && req.branchScope !== 'all' ? [sale_id, companyId, branchId] : [sale_id, companyId]
    );

    if (saleResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Venda não encontrada'
      });
    }

    const saleTotal = Number(saleResult.rows[0].total) || 0;
    
    // Buscar próximo número de devolução (sequência deve existir - rodar CRIAR_SEQUENCIAS_REFUNDS.sql se necessário)
    let seqResult;
    try {
      seqResult = await client.query("SELECT nextval('refund_number_seq') as num");
    } catch (seqErr) {
      await client.query('ROLLBACK');
      console.error('[Refunds] Sequência refund_number_seq não existe:', seqErr.message);
      return res.status(500).json({
        success: false,
        error: 'Configuração do banco incompleta. Execute o script CRIAR_SEQUENCIAS_REFUNDS.sql no PostgreSQL.'
      });
    }
    const refundNumber = `DEV${String(seqResult.rows[0].num).padStart(6, '0')}`;
    
    // Calcular valor total da devolução
    console.log('[Refund] === CRIANDO DEVOLUÇÃO ===');
    console.log('[Refund] Body completo:', JSON.stringify(req.body, null, 2));
    console.log('[Refund] Items array length:', items?.length);
    
    let totalRefundValue = 0;
    let refundItemsToInsert = [];
    
    if (!items || items.length === 0) {
      console.log('[Refund] ERRO: Nenhum item recebido!');
    } else {
      for (const item of items) {
        console.log('[Refund] Item raw:', JSON.stringify(item));
        
        // Converter valores garantindo que são números
        const qty = parseFloat(item.quantity) || 1;
        const price = parseFloat(item.unit_price) || 0;
        const itemTotal = qty * price;
        
        console.log(`[Refund] Item: ${item.product_name}, qty=${qty}, price=${price}, total=${itemTotal}`);
        
        totalRefundValue += itemTotal;
        refundItemsToInsert.push({
          ...item,
          quantity: qty,
          unit_price: price,
          total_price: itemTotal
        });
      }
    }

    if (saleTotal > 0 && totalRefundValue > saleTotal) {
      const refundFactor = saleTotal / totalRefundValue;
      console.log(`[Refund] Total da devolução (${totalRefundValue}) maior que venda (${saleTotal}). Ajustando fator=${refundFactor}`);
      totalRefundValue = 0;
      refundItemsToInsert = refundItemsToInsert.map(item => {
        const adjustedPrice = item.unit_price * refundFactor;
        const adjustedTotal = item.quantity * adjustedPrice;
        totalRefundValue += adjustedTotal;
        return {
          ...item,
          unit_price: adjustedPrice,
          total_price: adjustedTotal
        };
      });
    }
    
    console.log(`[Refund] TOTAL FINAL CALCULADO: R$ ${totalRefundValue}`);
    
    // Criar devolução
    const refundResult = await client.query(`
      INSERT INTO refunds (
        company_id, branch_id, sale_id, refund_number, refund_type, reason, reason_details,
        total_refund_value, refund_method, customer_id, customer_name, notes,
        status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', $13)
      RETURNING *
    `, [
      companyId, branchId || saleResult.rows[0].branch_id || null, sale_id, refundNumber, refund_type, reason, reason_details,
      totalRefundValue, refund_method, customer_id, customer_name, notes, userId
    ]);
    
    const refund = refundResult.rows[0];
    
    // Inserir itens da devolução
    for (const item of refundItemsToInsert) {
      const itemQty = Number(item.quantity) || 1;
      const itemPrice = Number(item.unit_price) || 0;
      const itemTotal = Number(item.total_price) || itemQty * itemPrice;
      
      await client.query(`
        INSERT INTO refund_items (
          refund_id, sale_item_id, product_id, product_name, quantity,
          unit_price, total_price, reason, condition, return_to_stock, destination
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        refund.id, item.sale_item_id, item.product_id, item.product_name,
        itemQty, itemPrice, itemTotal,
        item.reason || reason, item.condition || 'novo', item.return_to_stock !== false,
        item.destination || 'stock'
      ]);
    }
    
    // Se o método for vale compra, criar o vale
    let voucher = null;
    if (refund_method === 'voucher') {
      // Gerar código do voucher: tentar função do banco ou fallback
      let voucherCode;
      try {
        const voucherCodeResult = await client.query("SELECT generate_simple_voucher_code() as code");
        voucherCode = voucherCodeResult.rows[0]?.code;
      } catch (e1) {
        try {
          const voucherCodeResult = await client.query("SELECT generate_voucher_code() as code");
          voucherCode = voucherCodeResult.rows[0]?.code;
        } catch (e2) {
          voucherCode = `V${Date.now().toString(36).toUpperCase().slice(-8)}`;
        }
      }
      if (!voucherCode) voucherCode = `V${Date.now().toString(36).toUpperCase().slice(-8)}`;
      
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
      
      console.log(`[Refund] === CRIANDO VOUCHER ===`);
      console.log(`[Refund] Código: ${voucherCode}`);
      console.log(`[Refund] Valor a inserir: ${totalRefundValue}`);
      console.log(`[Refund] Cliente: ${customer_name}`);
      
      const voucherResult = await client.query(`
        INSERT INTO vouchers (
          company_id, branch_id, code, original_sale_id, refund_id, customer_id,
          customer_name, customer_document, customer_phone,
          original_value, current_value, is_transferable, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, $12)
        RETURNING *
      `, [
        companyId, branchId || saleResult.rows[0].branch_id || null, voucherCode, sale_id, refund.id, customer_id,
        customer_name, customerDocument, customerPhone,
        totalRefundValue, totalRefundValue, userId
      ]);
      
      console.log(`[Refund] Voucher criado:`, JSON.stringify(voucherResult.rows[0]));
      
      voucher = voucherResult.rows[0];
      
      // Atualizar devolução com o ID do vale
      await client.query(
        'UPDATE refunds SET voucher_id = $1 WHERE id = $2',
        [voucher.id, refund.id]
      );
    }
    
    const raffleCancellation = await cancelRaffleCouponsForRefund(client, {
      companyId,
      saleId: sale_id,
      refundId: refund.id,
      refundNumber,
      userId,
      reason: `Devolução ${refundNumber}: ${reason || 'sem motivo informado'}`,
    });

    await client.query('COMMIT');
    
    res.json({
      success: true,
      data: {
        refund: { ...refund, voucher_id: voucher?.id },
        voucher,
        raffle_coupons_cancelled: raffleCancellation.cancelled || 0,
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
    const userId = req.user?.id || null;
    
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
    const userId = req.user?.id || null;
    
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
    
    // Retornar produtos ao estoque (apenas se destination = 'stock')
    for (const item of itemsResult.rows) {
      if (item.return_to_stock && item.product_id) {
        // Converter quantity para número inteiro (remover separadores de milhar se houver)
        const qtyStr = String(item.quantity).replace(/\./g, '').replace(',', '.');
        const qty = Math.round(parseFloat(qtyStr) || 0);
        console.log(`[Refund] Retornando ao estoque: produto=${item.product_id}, qty_raw=${item.quantity}, qty_convertido=${qty}`);
        if (qty > 0) {
          await client.query(`
            UPDATE produtos 
            SET quantidade = COALESCE(quantidade, 0) + $1, updated_at = NOW()
            WHERE id = $2
          `, [qty, item.product_id]);
        }
      }
    }
    
    // Atualizar status da devolução
    await client.query(`
      UPDATE refunds 
      SET status = 'completed', completed_by = $1, completed_at = NOW(), updated_at = NOW()
      WHERE id = $2
    `, [userId, id]);
    
    // Atualizar status da venda original
    // Se devolução em DINHEIRO → venda fica como 'refunded' (devolvida)
    // Se devolução com VOUCHER → venda continua 'paid' (dinheiro no caixa, cliente tem crédito)
    if (refund.sale_id) {
      if (refund.refund_method === 'cash') {
        // Verificar se é devolução total ou parcial
        const saleResult = await client.query('SELECT total FROM sales WHERE id = $1', [refund.sale_id]);
        const saleTotal = saleResult.rows[0]?.total || 0;
        
        if (refund.total_refund_value >= saleTotal * 0.99) {
          // Devolução total em dinheiro → venda devolvida
          await client.query(`
            UPDATE sales 
            SET status = 'refunded', updated_at = NOW()
            WHERE id = $1
          `, [refund.sale_id]);
        } else {
          // Devolução parcial em dinheiro → marca como parcialmente devolvida
          await client.query(`
            UPDATE sales 
            SET status = 'partial_refund', updated_at = NOW()
            WHERE id = $1
          `, [refund.sale_id]);
        }
      }
      // Se for voucher, a venda continua como 'paid' - não muda nada
    }

    const raffleCancellation = await cancelRaffleCouponsForRefund(client, {
      companyId,
      saleId: refund.sale_id,
      refundId: refund.id,
      refundNumber: refund.refund_number,
      userId,
      reason: `Devolução ${refund.refund_number || ''} completada`,
    });
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      message: refund.refund_method === 'cash' 
        ? 'Devolução em dinheiro completada. Venda marcada como devolvida.' 
        : 'Devolução com voucher completada. Venda permanece paga (dinheiro no caixa).',
      raffle_coupons_cancelled: raffleCancellation.cancelled || 0,
    });
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
    const userId = req.user?.id || null;
    
    // Buscar devolução
    const refundResult = await client.query(
      'SELECT * FROM refunds WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
    
    if (refundResult.rows.length === 0) {
      throw new Error('Devolução não encontrada');
    }
    
    const refund = refundResult.rows[0];
    
    const wasCompleted = refund.status === 'completed';

    if (refund.status === 'cancelled') {
      throw new Error('Esta devolução já está cancelada');
    }

    if (wasCompleted) {
      const itemsResult = await client.query(
        'SELECT * FROM refund_items WHERE refund_id = $1',
        [id]
      );

      for (const item of itemsResult.rows) {
        if (item.return_to_stock && item.product_id) {
          const qty = Math.max(0, Math.round(Number(item.quantity) || 0));
          if (qty > 0) {
            await client.query(`
              UPDATE produtos
              SET quantidade = GREATEST(COALESCE(quantidade, 0) - $1, 0), updated_at = NOW()
              WHERE id = $2
            `, [qty, item.product_id]);
          }
        }
      }
    }
    
    // Se tiver vale compra, cancelar também, mesmo se já tiver sido usado.
    // Mantemos voucher_usage como histórico/auditoria do uso anterior.
    if (refund.voucher_id) {
      await client.query(
        "UPDATE vouchers SET status = 'cancelled', current_value = 0, updated_at = NOW() WHERE id = $1",
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
             u.email as created_by_email,
             usage.used_at,
             usage.used_sale_id,
             usage.used_sale_number,
             usage.used_items
      FROM vouchers v
      LEFT JOIN users u ON v.created_by = u.id
      LEFT JOIN LATERAL (
        SELECT vu.used_at,
               vu.sale_id as used_sale_id,
               s.numero as used_sale_number,
               COALESCE(
                 json_agg(
                   json_build_object(
                     'produto_nome', si.produto_nome,
                     'quantidade', si.quantidade,
                     'valor_total', si.valor_total
                   )
                   ORDER BY si.created_at ASC
                 ) FILTER (WHERE si.id IS NOT NULL),
                 '[]'::json
               ) as used_items
        FROM voucher_usage vu
        LEFT JOIN sales s ON vu.sale_id = s.id
        LEFT JOIN sale_items si ON si.sale_id = vu.sale_id
        WHERE vu.voucher_id = v.id
        GROUP BY vu.id, vu.used_at, vu.sale_id, s.numero
        ORDER BY vu.used_at DESC
        LIMIT 1
      ) usage ON true
      WHERE v.company_id = $1
    `;
    const params = [companyId];
    let paramIndex = 2;
    const branchScope = appendBranchCondition('', params, req, 'v');
    query += branchScope.query;
    params.splice(0, params.length, ...branchScope.params);
    paramIndex = params.length + 1;
    
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

// Cancelar vale compra e, se existir, a devolução vinculada
router.put('/vouchers/:id/cancel', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { reason } = req.body;
    const companyId = req.companyId;
    const userId = req.user?.id || null;

    const voucherResult = await client.query(
      `SELECT * FROM vouchers WHERE id = $1 AND company_id = $2${req.branchId && req.branchScope !== 'all' ? ' AND branch_id = $3' : ''} FOR UPDATE`,
      req.branchId && req.branchScope !== 'all' ? [id, companyId, req.branchId] : [id, companyId]
    );

    if (voucherResult.rows.length === 0) {
      throw new Error('Vale não encontrado');
    }

    const voucher = voucherResult.rows[0];

    if (voucher.status === 'cancelled') {
      throw new Error('Este vale já está cancelado');
    }

    if (voucher.refund_id) {
      const refundResult = await client.query(
        'SELECT * FROM refunds WHERE id = $1 AND company_id = $2 FOR UPDATE',
        [voucher.refund_id, companyId]
      );

      if (refundResult.rows.length > 0) {
        const refund = refundResult.rows[0];

        if (refund.status !== 'cancelled') {
          if (refund.status === 'completed') {
            const itemsResult = await client.query(
              'SELECT * FROM refund_items WHERE refund_id = $1',
              [refund.id]
            );

            for (const item of itemsResult.rows) {
              if (item.return_to_stock && item.product_id) {
                const qty = Math.max(0, Math.round(Number(item.quantity) || 0));
                if (qty > 0) {
                  await client.query(`
                    UPDATE produtos
                    SET quantidade = GREATEST(COALESCE(quantidade, 0) - $1, 0), updated_at = NOW()
                    WHERE id = $2
                  `, [qty, item.product_id]);
                }
              }
            }
          }

          await client.query(`
            UPDATE refunds
            SET status = 'cancelled', cancelled_by = $1, cancelled_at = NOW(),
                cancel_reason = $2, updated_at = NOW()
            WHERE id = $3
          `, [userId, reason || 'Cancelamento do voucher vinculado', refund.id]);
        }
      }
    }

    await client.query(
      "UPDATE vouchers SET status = 'cancelled', current_value = 0, updated_at = NOW() WHERE id = $1",
      [id]
    );

    await client.query('COMMIT');

    res.json({ success: true, message: 'Vale cancelado com sucesso' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Vouchers] Erro ao cancelar vale:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Buscar vale por código
router.get('/vouchers/code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const companyId = req.companyId;
    
    const voucherBranch = branchScoped(req, 'v');
    const result = await pool.query(`
      SELECT v.*,
             r.refund_number,
             r.reason as refund_reason
      FROM vouchers v
      LEFT JOIN refunds r ON v.refund_id = r.id
      WHERE v.code = $1 AND v.company_id = $2${voucherBranch.branchId ? ' AND v.branch_id = $3' : ''}
    `, voucherBranch.branchId ? [code.toUpperCase(), companyId, voucherBranch.branchId] : [code.toUpperCase(), companyId]);
    
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

// Usar vale em uma venda (USO ÚNICO - VALOR TOTAL)
router.post('/vouchers/:id/use', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { sale_id, customer_document } = req.body;
    const companyId = req.companyId;
    const userId = req.user?.id || null;
    
    // Buscar vale
    const voucherResult = await client.query(
      `SELECT * FROM vouchers WHERE id = $1 AND company_id = $2${req.branchId && req.branchScope !== 'all' ? ' AND branch_id = $3' : ''} FOR UPDATE`,
      req.branchId && req.branchScope !== 'all' ? [id, companyId, req.branchId] : [id, companyId]
    );
    
    if (voucherResult.rows.length === 0) {
      throw new Error('Vale não encontrado');
    }
    
    const voucher = voucherResult.rows[0];
    
    // Validações
    if (voucher.status !== 'active') {
      throw new Error('Este vale já foi utilizado ou está cancelado');
    }
    
    // Verificar se já foi usado antes (dupla proteção)
    const usageCheck = await client.query(
      'SELECT COUNT(*) as count FROM voucher_usage WHERE voucher_id = $1',
      [id]
    );
    if (parseInt(usageCheck.rows[0].count) > 0) {
      throw new Error('Este vale já foi utilizado anteriormente');
    }
    
    // Verificar se é intransferível e se o documento confere
    if (!voucher.is_transferable && voucher.customer_document && customer_document) {
      if (voucher.customer_document !== customer_document) {
        throw new Error('Este vale é intransferível e só pode ser usado pelo titular');
      }
    }
    
    // USO ÚNICO: usar o valor total do voucher
    const amount = parseFloat(voucher.current_value) || 0;
    const balanceBefore = amount;
    const balanceAfter = 0; // Sempre zera - uso único
    const newStatus = 'used'; // Sempre fica como usado
    
    // Registrar uso
    await client.query(`
      INSERT INTO voucher_usage (voucher_id, sale_id, amount_used, balance_before, balance_after, used_by, company_id, branch_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, sale_id, amount, balanceBefore, balanceAfter, userId, companyId, voucher.branch_id || req.branchId || null]);
    
    // Atualizar vale como USADO
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
             s.numero as sale_number,
             s.created_at as sale_created_at,
             u.email as used_by_email
      FROM voucher_usage vu
      LEFT JOIN sales s ON vu.sale_id = s.id
      LEFT JOIN users u ON vu.used_by = u.id
      WHERE vu.voucher_id = $1
      ORDER BY vu.used_at DESC
    `, [id]);

    const rowsWithItems = [];
    for (const row of result.rows) {
      let items = [];
      if (row.sale_id) {
        const itemsResult = await pool.query(`
          SELECT produto_nome, quantidade, valor_unitario, valor_total
          FROM sale_items
          WHERE sale_id = $1
          ORDER BY created_at ASC
        `, [row.sale_id]);
        items = itemsResult.rows;
      }

      rowsWithItems.push({
        ...row,
        items
      });
    }
    
    res.json({ success: true, data: rowsWithItems });
  } catch (error) {
    console.error('[Vouchers] Erro ao buscar histórico:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

