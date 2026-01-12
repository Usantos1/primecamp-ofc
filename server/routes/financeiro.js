// Rotas para sistema financeiro com IA (/api/financeiro/*)
import express from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

// ============================================
// DASHBOARD EXECUTIVO
// ============================================

router.get('/dashboard', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Calcular per├¡odo (├║ltimos 30 dias se n├úo especificado)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // KPIs principais
    const kpisQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN sale_origin = 'PDV' AND status IN ('paid', 'partial') THEN total ELSE 0 END), 0) as total_pdv,
        COALESCE(SUM(CASE WHEN sale_origin = 'OS' AND status IN ('paid', 'partial') THEN total ELSE 0 END), 0) as total_os,
        COALESCE(SUM(CASE WHEN status IN ('paid', 'partial') THEN total ELSE 0 END), 0) as total_geral,
        COUNT(CASE WHEN sale_origin = 'PDV' AND status IN ('paid', 'partial') THEN 1 END) as qtd_pdv,
        COUNT(CASE WHEN sale_origin = 'OS' AND status IN ('paid', 'partial') THEN 1 END) as qtd_os,
        COALESCE(AVG(CASE WHEN sale_origin = 'PDV' AND status IN ('paid', 'partial') THEN total END), 0) as ticket_medio_pdv,
        COALESCE(AVG(CASE WHEN sale_origin = 'OS' AND status IN ('paid', 'partial') THEN total END), 0) as ticket_medio_os
      FROM public.sales
      WHERE created_at >= $1 AND created_at <= $2
    `;
    
    const kpisResult = await pool.query(kpisQuery, [start, end]);
    const kpis = kpisResult.rows[0];
    
    // Top 10 produtos (├║ltimos 30 dias)
    const topProdutosQuery = `
      SELECT 
        p.id,
        p.nome,
        COUNT(si.id) as quantidade_vendida,
        SUM(si.valor_total) as receita_total,
        SUM(si.valor_total - (si.quantidade * COALESCE(p.vi_custo, p.valor_compra, 0))) as lucro_total
      FROM public.sale_items si
      INNER JOIN public.sales s ON si.sale_id = s.id
      INNER JOIN public.produtos p ON si.produto_id = p.id
      WHERE s.created_at >= $1 AND s.created_at <= $2
        AND s.status IN ('paid', 'partial')
      GROUP BY p.id, p.nome
      ORDER BY receita_total DESC
      LIMIT 10
    `;
    
    const topProdutosResult = await pool.query(topProdutosQuery, [start, end]);
    
    // Top 10 vendedores
    const topVendedoresQuery = `
      SELECT 
        u.id,
        COALESCE(pr.display_name, u.email) as nome,
        COUNT(s.id) as total_vendas,
        SUM(s.total) as total_vendido,
        AVG(s.total) as ticket_medio
      FROM public.sales s
      INNER JOIN auth.users u ON s.cashier_user_id = u.id OR s.technician_id = u.id
      LEFT JOIN public.profiles pr ON u.id = pr.user_id
      WHERE s.created_at >= $1 AND s.created_at <= $2
        AND s.status IN ('paid', 'partial')
      GROUP BY u.id, pr.display_name, u.email
      ORDER BY total_vendido DESC
      LIMIT 10
    `;
    
    const topVendedoresResult = await pool.query(topVendedoresQuery, [start, end]);
    
    // Tend├¬ncia de vendas (├║ltimos 30 dias)
    const tendenciaQuery = `
      SELECT 
        DATE(created_at) as data,
        SUM(CASE WHEN sale_origin = 'PDV' THEN total ELSE 0 END) as total_pdv,
        SUM(CASE WHEN sale_origin = 'OS' THEN total ELSE 0 END) as total_os,
        SUM(total) as total_geral
      FROM public.sales
      WHERE created_at >= $1 AND created_at <= $2
        AND status IN ('paid', 'partial')
      GROUP BY DATE(created_at)
      ORDER BY data ASC
    `;
    
    const tendenciaResult = await pool.query(tendenciaQuery, [start, end]);
    
    // Recomenda├º├╡es cr├¡ticas (├║ltimas 5)
    const recomendacoesQuery = `
      SELECT *
      FROM public.ia_recomendacoes
      WHERE status = 'pendente'
      ORDER BY prioridade DESC, created_at DESC
      LIMIT 5
    `;
    
    const recomendacoesResult = await pool.query(recomendacoesQuery);
    
    res.json({
      kpis: {
        totalPDV: parseFloat(kpis.total_pdv || 0),
        totalOS: parseFloat(kpis.total_os || 0),
        totalGeral: parseFloat(kpis.total_geral || 0),
        quantidadePDV: parseInt(kpis.qtd_pdv || 0),
        quantidadeOS: parseInt(kpis.qtd_os || 0),
        ticketMedioPDV: parseFloat(kpis.ticket_medio_pdv || 0),
        ticketMedioOS: parseFloat(kpis.ticket_medio_os || 0),
      },
      topProdutos: topProdutosResult.rows.map(p => ({
        id: p.id,
        nome: p.nome,
        quantidadeVendida: parseInt(p.quantidade_vendida || 0),
        receitaTotal: parseFloat(p.receita_total || 0),
        lucroTotal: parseFloat(p.lucro_total || 0),
        margem: p.receita_total > 0 ? (p.lucro_total / p.receita_total * 100) : 0,
      })),
      topVendedores: topVendedoresResult.rows.map(v => ({
        id: v.id,
        nome: v.nome,
        totalVendas: parseInt(v.total_vendas || 0),
        totalVendido: parseFloat(v.total_vendido || 0),
        ticketMedio: parseFloat(v.ticket_medio || 0),
      })),
      tendencia: tendenciaResult.rows.map(t => ({
        data: t.data,
        totalPDV: parseFloat(t.total_pdv || 0),
        totalOS: parseFloat(t.total_os || 0),
        totalGeral: parseFloat(t.total_geral || 0),
      })),
      recomendacoes: recomendacoesResult.rows,
    });
  } catch (error) {
    console.error('[Financeiro] Erro no dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// AN├üLISE DE VENDEDORES
// ============================================

router.get('/vendedores/analise', async (req, res) => {
  try {
    const { startDate, endDate, vendedorId } = req.query;
    
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    let query = `
      SELECT 
        u.id,
        COALESCE(pr.display_name, u.email) as nome,
        COUNT(DISTINCT CASE WHEN s.sale_origin = 'PDV' THEN s.id END) as vendas_pdv,
        COUNT(DISTINCT CASE WHEN s.sale_origin = 'OS' THEN s.id END) as vendas_os,
        COUNT(s.id) as total_vendas,
        SUM(s.total) as total_vendido,
        AVG(s.total) as ticket_medio,
        MIN(s.created_at) as primeira_venda,
        MAX(s.created_at) as ultima_venda
      FROM public.sales s
      INNER JOIN auth.users u ON s.cashier_user_id = u.id OR s.technician_id = u.id
      LEFT JOIN public.profiles pr ON u.id = pr.user_id
      WHERE s.created_at >= $1 AND s.created_at <= $2
        AND s.status IN ('paid', 'partial')
    `;
    
    const params = [start, end];
    
    if (vendedorId) {
      query += ` AND u.id = $${params.length + 1}`;
      params.push(vendedorId);
    }
    
    query += `
      GROUP BY u.id, pr.display_name, u.email
      ORDER BY total_vendido DESC
    `;
    
    const result = await pool.query(query, params);
    
    res.json({
      vendedores: result.rows.map(v => ({
        id: v.id,
        nome: v.nome,
        vendasPDV: parseInt(v.vendas_pdv || 0),
        vendasOS: parseInt(v.vendas_os || 0),
        totalVendas: parseInt(v.total_vendas || 0),
        totalVendido: parseFloat(v.total_vendido || 0),
        ticketMedio: parseFloat(v.ticket_medio || 0),
        primeiraVenda: v.primeira_venda,
        ultimaVenda: v.ultima_venda,
      })),
    });
  } catch (error) {
    console.error('[Financeiro] Erro na an├ílise de vendedores:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// AN├üLISE DE PRODUTOS
// ============================================

router.get('/produtos/analise', async (req, res) => {
  try {
    const { startDate, endDate, produtoId } = req.query;
    
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    let query = `
      SELECT 
        p.id,
        p.nome,
        p.codigo,
        p.quantidade as estoque_atual,
        COUNT(si.id) as quantidade_vendida,
        SUM(si.valor_total) as receita_total,
        SUM(si.quantidade * COALESCE(p.vi_custo, p.valor_compra, 0)) as custo_total,
        SUM(si.valor_total - (si.quantidade * COALESCE(p.vi_custo, p.valor_compra, 0))) as lucro_total,
        AVG(si.valor_unitario) as preco_medio_venda
      FROM public.sale_items si
      INNER JOIN public.sales s ON si.sale_id = s.id
      INNER JOIN public.produtos p ON si.produto_id = p.id
      WHERE s.created_at >= $1 AND s.created_at <= $2
        AND s.status IN ('paid', 'partial')
    `;
    
    const params = [start, end];
    
    if (produtoId) {
      query += ` AND p.id = $${params.length + 1}`;
      params.push(produtoId);
    }
    
    query += `
      GROUP BY p.id, p.nome, p.codigo, p.quantidade
      ORDER BY receita_total DESC
    `;
    
    const result = await pool.query(query, params);
    
    res.json({
      produtos: result.rows.map(p => {
        const receita = parseFloat(p.receita_total || 0);
        const lucro = parseFloat(p.lucro_total || 0);
        const margem = receita > 0 ? (lucro / receita * 100) : 0;
        
        return {
          id: p.id,
          nome: p.nome,
          codigo: p.codigo,
          estoqueAtual: parseInt(p.estoque_atual || 0),
          quantidadeVendida: parseInt(p.quantidade_vendida || 0),
          receitaTotal: receita,
          custoTotal: parseFloat(p.custo_total || 0),
          lucroTotal: lucro,
          margemPercentual: margem,
          precoMedioVenda: parseFloat(p.preco_medio_venda || 0),
        };
      }),
    });
  } catch (error) {
    console.error('[Financeiro] Erro na an├ílise de produtos:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// AN├üLISE TEMPORAL (Hor├írios/Dias)
// ============================================

router.get('/temporal/analise', async (req, res) => {
  try {
    const { startDate, endDate, groupBy } = req.query; // groupBy: 'hora', 'dia_semana', 'ambos'
    
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    if (groupBy === 'hora') {
      const query = `
        SELECT 
          EXTRACT(HOUR FROM created_at)::INTEGER as hora,
          COUNT(*) as quantidade_vendas,
          SUM(total) as total_vendido,
          AVG(total) as ticket_medio
        FROM public.sales
        WHERE created_at >= $1 AND created_at <= $2
          AND status IN ('paid', 'partial')
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hora ASC
      `;
      
      const result = await pool.query(query, [start, end]);
      res.json({ porHora: result.rows });
    } else if (groupBy === 'dia_semana') {
      const query = `
        SELECT 
          EXTRACT(DOW FROM created_at)::INTEGER as dia_semana,
          COUNT(*) as quantidade_vendas,
          SUM(total) as total_vendido,
          AVG(total) as ticket_medio
        FROM public.sales
        WHERE created_at >= $1 AND created_at <= $2
          AND status IN ('paid', 'partial')
        GROUP BY EXTRACT(DOW FROM created_at)
        ORDER BY dia_semana ASC
      `;
      
      const result = await pool.query(query, [start, end]);
      res.json({ porDiaSemana: result.rows });
    } else {
      // Ambos
      const horaQuery = `
        SELECT 
          EXTRACT(HOUR FROM created_at)::INTEGER as hora,
          COUNT(*) as quantidade_vendas,
          SUM(total) as total_vendido,
          AVG(total) as ticket_medio
        FROM public.sales
        WHERE created_at >= $1 AND created_at <= $2
          AND status IN ('paid', 'partial')
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hora ASC
      `;
      
      const diaQuery = `
        SELECT 
          EXTRACT(DOW FROM created_at)::INTEGER as dia_semana,
          COUNT(*) as quantidade_vendas,
          SUM(total) as total_vendido,
          AVG(total) as ticket_medio
        FROM public.sales
        WHERE created_at >= $1 AND created_at <= $2
          AND status IN ('paid', 'partial')
        GROUP BY EXTRACT(DOW FROM created_at)
        ORDER BY dia_semana ASC
      `;
      
      const [horaResult, diaResult] = await Promise.all([
        pool.query(horaQuery, [start, end]),
        pool.query(diaQuery, [start, end]),
      ]);
      
      res.json({
        porHora: horaResult.rows,
        porDiaSemana: diaResult.rows,
      });
    }
  } catch (error) {
    console.error('[Financeiro] Erro na an├ílise temporal:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PREVIS├òES (B├ísico - m├⌐dia m├│vel simples)
// ============================================

router.get('/previsoes/vendas', async (req, res) => {
  try {
    const { dias = 30 } = req.query;
    
    // Buscar hist├│rico dos ├║ltimos 90 dias
    const query = `
      SELECT 
        DATE(created_at) as data,
        SUM(total) as total_vendido
      FROM public.sales
      WHERE created_at >= NOW() - INTERVAL '90 days'
        AND status IN ('paid', 'partial')
      GROUP BY DATE(created_at)
      ORDER BY data ASC
    `;
    
    const result = await pool.query(query);
    
    // M├⌐dia m├│vel simples (7 dias)
    const historico = result.rows.map(r => parseFloat(r.total_vendido || 0));
    const mediaMovel = historico.length > 0 
      ? historico.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, historico.length)
      : 0;
    
    // Previs├úo simples (m├⌐dia dos ├║ltimos 7 dias)
    const previsoes = [];
    for (let i = 0; i < parseInt(dias); i++) {
      const data = new Date();
      data.setDate(data.getDate() + i + 1);
      previsoes.push({
        data: data.toISOString().split('T')[0],
        valorPrevisto: mediaMovel,
        intervaloConfiancaMin: mediaMovel * 0.8,
        intervaloConfiancaMax: mediaMovel * 1.2,
        confiancaPercentual: 70,
      });
    }
    
    res.json({
      historico: result.rows.map(r => ({
        data: r.data,
        valorReal: parseFloat(r.total_vendido || 0),
      })),
      previsoes,
    });
  } catch (error) {
    console.error('[Financeiro] Erro nas previs├╡es:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// RECOMENDA├ç├òES
// ============================================

router.get('/recomendacoes', async (req, res) => {
  try {
    const { tipo, status = 'pendente' } = req.query;
    
    let query = 'SELECT * FROM public.ia_recomendacoes WHERE 1=1';
    const params = [];
    
    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }
    
    if (tipo) {
      query += ` AND tipo = $${params.length + 1}`;
      params.push(tipo);
    }
    
    query += ' ORDER BY prioridade DESC, created_at DESC';
    
    const result = await pool.query(query, params);
    res.json({ recomendacoes: result.rows });
  } catch (error) {
    console.error('[Financeiro] Erro nas recomenda├º├╡es:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/recomendacoes/:id/aplicar', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    const updateQuery = `
      UPDATE public.ia_recomendacoes
      SET status = 'aplicada',
          aplicada_em = NOW(),
          aplicada_por = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [userId, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recomenda├º├úo n├úo encontrada' });
    }
    
    res.json({ recomendacao: result.rows[0] });
  } catch (error) {
    console.error('[Financeiro] Erro ao aplicar recomenda├º├úo:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ESTOQUE INTELIGENTE
// ============================================

router.get('/estoque/recomendacoes', async (req, res) => {
  try {
    // Produtos com estoque baixo (menos de 10 unidades)
    const estoqueBaixoQuery = `
      SELECT 
        p.id,
        p.nome,
        p.codigo,
        p.quantidade as estoque_atual,
        COALESCE(p.estoque_minimo, 5) as estoque_minimo,
        -- Calcular venda m├⌐dia di├íria (├║ltimos 30 dias)
        COALESCE((
          SELECT AVG(quantidade_diaria)
          FROM (
            SELECT DATE(s.created_at), SUM(si.quantidade) as quantidade_diaria
            FROM public.sale_items si
            INNER JOIN public.sales s ON si.sale_id = s.id
            WHERE si.produto_id = p.id
              AND s.created_at >= NOW() - INTERVAL '30 days'
              AND s.status IN ('paid', 'partial')
            GROUP BY DATE(s.created_at)
          ) daily_sales
        ), 0) as venda_media_diaria
      FROM public.produtos p
      WHERE p.quantidade <= COALESCE(p.estoque_minimo, 5)
      ORDER BY p.quantidade ASC
    `;
    
    const result = await pool.query(estoqueBaixoQuery);
    
    const recomendacoes = result.rows.map(p => {
      const estoqueAtual = parseInt(p.estoque_atual || 0);
      const estoqueMinimo = parseInt(p.estoque_minimo || 5);
      const vendaMediaDiaria = parseFloat(p.venda_media_diaria || 0);
      
      // Sugerir reposi├º├úo para 30 dias de venda m├⌐dia
      const quantidadeSugerida = Math.max(estoqueMinimo * 2, Math.ceil(vendaMediaDiaria * 30));
      
      return {
        produtoId: p.id,
        produtoNome: p.nome,
        produtoCodigo: p.codigo,
        estoqueAtual,
        estoqueMinimo,
        vendaMediaDiaria,
        quantidadeSugerida,
        diasRestantes: vendaMediaDiaria > 0 ? Math.floor(estoqueAtual / vendaMediaDiaria) : 0,
        prioridade: estoqueAtual === 0 ? 10 : estoqueAtual <= estoqueMinimo ? 8 : 5,
      };
    });
    
    res.json({ recomendacoes });
  } catch (error) {
    console.error('[Financeiro] Erro nas recomenda├º├╡es de estoque:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DRE
// ============================================

router.get('/dre/:periodo', async (req, res) => {
  try {
    const { periodo } = req.params;
    const { tipo = 'mensal' } = req.query;
    
    // Buscar ou calcular DRE
    let query = 'SELECT * FROM public.dre WHERE periodo = $1 AND tipo = $2';
    let result = await pool.query(query, [periodo, tipo]);
    
    if (result.rows.length === 0) {
      // Calcular DRE automaticamente
      const periodoDate = new Date(periodo);
      let startDate, endDate;
      
      if (tipo === 'mensal') {
        startDate = new Date(periodoDate.getFullYear(), periodoDate.getMonth(), 1);
        endDate = new Date(periodoDate.getFullYear(), periodoDate.getMonth() + 1, 0, 23, 59, 59, 999);
      } else {
        // Anual
        startDate = new Date(periodoDate.getFullYear(), 0, 1);
        endDate = new Date(periodoDate.getFullYear(), 11, 31, 23, 59, 59, 999);
      }
      
      // 1. Receita Bruta (vendas pagas/parciais)
      const receitaQuery = `
        SELECT COALESCE(SUM(total), 0) as receita_bruta
        FROM public.sales
        WHERE created_at >= $1 AND created_at <= $2
          AND status IN ('paid', 'partial')
      `;
      const receitaResult = await pool.query(receitaQuery, [startDate, endDate]);
      const receitaBruta = parseFloat(receitaResult.rows[0]?.receita_bruta || 0);
      
      // 2. Deduções (descontos, devoluções) - por enquanto 0
      const deducoes = 0;
      
      // 3. Receita Líquida
      const receitaLiquida = receitaBruta - deducoes;
      
      // 4. Custo dos Produtos Vendidos (CPV)
      const cpvQuery = `
        SELECT COALESCE(SUM(si.quantidade * COALESCE(p.vi_custo, p.valor_compra, 0)), 0) as cpv
        FROM public.sale_items si
        INNER JOIN public.sales s ON si.sale_id = s.id
        INNER JOIN public.produtos p ON si.produto_id = p.id
        WHERE s.created_at >= $1 AND s.created_at <= $2
          AND s.status IN ('paid', 'partial')
      `;
      const cpvResult = await pool.query(cpvQuery, [startDate, endDate]);
      const custoProdutosVendidos = parseFloat(cpvResult.rows[0]?.cpv || 0);
      
      // 5. Lucro Bruto
      const lucroBruto = receitaLiquida - custoProdutosVendidos;
      
      // 6. Margem Bruta (%)
      const margemBrutaPercentual = receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0;
      
      // 7. Despesas Operacionais (contas pagas)
      const despesasQuery = `
        SELECT COALESCE(SUM(amount), 0) as despesas
        FROM public.bills_to_pay
        WHERE payment_date >= $1 AND payment_date <= $2
          AND status = 'pago'
      `;
      const despesasResult = await pool.query(despesasQuery, [startDate, endDate]);
      const despesasOperacionais = parseFloat(despesasResult.rows[0]?.despesas || 0);
      
      // 8. EBITDA (Lucro antes de juros, impostos, depreciação e amortização)
      const ebitda = lucroBruto - despesasOperacionais;
      
      // 9. Resultado Financeiro (por enquanto 0 - não temos dados de juros/receitas financeiras)
      const resultadoFinanceiro = 0;
      
      // 10. Lucro Líquido
      const lucroLiquido = ebitda + resultadoFinanceiro;
      
      // 11. Margem Líquida (%)
      const margemLiquidaPercentual = receitaLiquida > 0 ? (lucroLiquido / receitaLiquida) * 100 : 0;
      
      // Inserir DRE calculado
      const insertQuery = `
        INSERT INTO public.dre (
          periodo, tipo, receita_bruta, deducoes, receita_liquida,
          custo_produtos_vendidos, lucro_bruto, margem_bruta_percentual,
          despesas_operacionais, ebitda, resultado_financeiro,
          lucro_liquido, margem_liquida_percentual
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      
      const insertResult = await pool.query(insertQuery, [
        periodoDate,
        tipo,
        receitaBruta,
        deducoes,
        receitaLiquida,
        custoProdutosVendidos,
        lucroBruto,
        margemBrutaPercentual,
        despesasOperacionais,
        ebitda,
        resultadoFinanceiro,
        lucroLiquido,
        margemLiquidaPercentual,
      ]);
      
      res.json({ dre: insertResult.rows[0] });
      return;
    }
    
    res.json({ dre: result.rows[0] });
  } catch (error) {
    console.error('[Financeiro] Erro no DRE:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PLANEJAMENTO ANUAL
// ============================================

router.get('/planejamento/:ano', async (req, res) => {
  try {
    const { ano } = req.params;
    
    const query = 'SELECT * FROM public.planejamento_anual WHERE ano = $1';
    const result = await pool.query(query, [ano]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Planejamento n├úo encontrado' });
    }
    
    res.json({ planejamento: result.rows[0] });
  } catch (error) {
    console.error('[Financeiro] Erro no planejamento:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/planejamento/:ano', async (req, res) => {
  try {
    const { ano } = req.params;
    const { receita_planejada, meta_mensal, despesas_planejadas, observacoes } = req.body;
    const userId = req.user?.id;
    
    const query = `
      INSERT INTO public.planejamento_anual (ano, receita_planejada, meta_mensal, despesas_planejadas, observacoes, criado_por)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (ano) 
      DO UPDATE SET
        receita_planejada = EXCLUDED.receita_planejada,
        meta_mensal = EXCLUDED.meta_mensal,
        despesas_planejadas = EXCLUDED.despesas_planejadas,
        observacoes = EXCLUDED.observacoes,
        updated_at = NOW()
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      parseInt(ano),
      receita_planejada || 0,
      meta_mensal ? JSON.stringify(meta_mensal) : null,
      despesas_planejadas || 0,
      observacoes || null,
      userId,
    ]);
    
    res.json({ planejamento: result.rows[0] });
  } catch (error) {
    console.error('[Financeiro] Erro ao salvar planejamento:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PRECIFICAÇÃO INTELIGENTE
// ============================================

router.post('/precificacao/sugerir', async (req, res) => {
  try {
    const { produto_id, margem_desejada } = req.body;
    
    if (!produto_id) {
      return res.status(400).json({ error: 'produto_id é obrigatório' });
    }
    
    // Buscar produto
    const produtoQuery = await pool.query(
      'SELECT * FROM public.produtos WHERE id = $1',
      [produto_id]
    );
    
    if (produtoQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    const produto = produtoQuery.rows[0];
    const custo = parseFloat(produto.vi_custo || produto.valor_compra || 0);
    const precoAtual = parseFloat(produto.valor_dinheiro_pix || produto.preco_venda || 0);
    
    // Calcular preço sugerido baseado em margem
    const margem = margem_desejada || 50; // Default 50%
    const precoSugerido = custo > 0 ? custo * (1 + margem / 100) : precoAtual;
    
    // Buscar análise histórica do produto
    const analiseQuery = await pool.query(
      `SELECT 
        AVG(receita_total / NULLIF(quantidade_vendida, 0)) as preco_medio,
        AVG(margem_media) as margem_media
      FROM public.produto_analise_mensal
      WHERE produto_id = $1
      ORDER BY mes DESC
      LIMIT 3`,
      [produto_id]
    );
    
    const precoMedio = analiseQuery.rows[0]?.preco_medio ? parseFloat(analiseQuery.rows[0].preco_medio) : null;
    const margemMedia = analiseQuery.rows[0]?.margem_media ? parseFloat(analiseQuery.rows[0].margem_media) : null;
    
    // Análise de vendas
    const vendasQuery = await pool.query(
      `SELECT COUNT(*) as total_vendas
      FROM public.sale_items si
      INNER JOIN public.sales s ON si.sale_id = s.id
      WHERE si.produto_id = $1
        AND s.created_at >= NOW() - INTERVAL '30 days'
        AND s.status IN ('paid', 'partial')`,
      [produto_id]
    );
    
    const totalVendas = parseInt(vendasQuery.rows[0]?.total_vendas || 0);
    
    // Sugestões baseadas em análise
    const sugestoes = [];
    const percentualDiferenca = precoMedio ? ((precoSugerido / precoMedio - 1) * 100) : 0;
    
    if (precoMedio && Math.abs(percentualDiferenca) > 10) {
      sugestoes.push({
        tipo: percentualDiferenca > 0 ? 'aviso' : 'info',
        mensagem: `Preço sugerido está ${Math.abs(percentualDiferenca).toFixed(1)}% ${percentualDiferenca > 0 ? 'acima' : 'abaixo'} da média histórica`,
      });
    }
    
    if (totalVendas < 5 && precoSugerido > custo * 1.3) {
      sugestoes.push({
        tipo: 'reducao',
        mensagem: `Produto com baixa rotatividade (${totalVendas} vendas). Considere reduzir margem para aumentar vendas.`,
        preco_alternativo: custo * 1.25,
      });
    }
    
    if (totalVendas > 20 && precoSugerido < precoAtual * 0.95) {
      sugestoes.push({
        tipo: 'aumento',
        mensagem: `Produto com alta rotatividade. Pode aumentar preço com segurança.`,
        preco_alternativo: precoAtual * 1.05,
      });
    }
    
    res.json({
      produto: {
        id: produto.id,
        nome: produto.nome,
        codigo: produto.codigo,
        custo: custo,
        preco_atual: precoAtual,
      },
      preco_sugerido: precoSugerido,
      margem_aparente: custo > 0 ? ((precoSugerido - custo) / precoSugerido * 100) : 0,
      analise_historica: {
        preco_medio: precoMedio,
        margem_media: margemMedia,
      },
      vendas_ultimos_30_dias: totalVendas,
      sugestoes: sugestoes,
    });
  } catch (error) {
    console.error('[Financeiro] Erro na precificação:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
