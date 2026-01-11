// Jobs agendados para processamento de dados financeiros e IA
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

/**
 * Criar snapshot diário de vendas (executar diariamente às 00:00)
 */
export async function criarSnapshotDiarioVendas() {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const data = hoje.toISOString().split('T')[0];
    
    // Verificar se já existe snapshot para hoje
    const existe = await pool.query(
      'SELECT id FROM public.vendas_snapshot_diario WHERE data = $1',
      [data]
    );
    
    if (existe.rows.length > 0) {
      console.log(`[Financeiro Jobs] Snapshot para ${data} já existe, pulando...`);
      return;
    }
    
    // Calcular totais do dia anterior
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);
    const dataOntem = ontem.toISOString().split('T')[0];
    const dataOntemFim = new Date(ontem);
    dataOntemFim.setHours(23, 59, 59, 999);
    
    const query = `
      SELECT 
        COALESCE(SUM(CASE WHEN sale_origin = 'PDV' AND status IN ('paid', 'partial') THEN total ELSE 0 END), 0) as total_pdv,
        COALESCE(SUM(CASE WHEN sale_origin = 'OS' AND status IN ('paid', 'partial') THEN total ELSE 0 END), 0) as total_os,
        COALESCE(SUM(CASE WHEN status IN ('paid', 'partial') THEN total ELSE 0 END), 0) as total_geral,
        COUNT(CASE WHEN sale_origin = 'PDV' AND status IN ('paid', 'partial') THEN 1 END) as qtd_pdv,
        COUNT(CASE WHEN sale_origin = 'OS' AND status IN ('paid', 'partial') THEN 1 END) as qtd_os,
        COALESCE(AVG(CASE WHEN sale_origin = 'PDV' AND status IN ('paid', 'partial') THEN total END), 0) as ticket_medio_pdv,
        COALESCE(AVG(CASE WHEN sale_origin = 'OS' AND status IN ('paid', 'partial') THEN total END), 0) as ticket_medio_os
      FROM public.sales
      WHERE DATE(created_at) = $1
    `;
    
    const result = await pool.query(query, [dataOntem]);
    const dados = result.rows[0];
    
    // Inserir snapshot
    await pool.query(`
      INSERT INTO public.vendas_snapshot_diario (
        data, total_pdv, total_os, total_geral,
        quantidade_vendas_pdv, quantidade_vendas_os,
        ticket_medio_pdv, ticket_medio_os
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (data) DO NOTHING
    `, [
      dataOntem,
      parseFloat(dados.total_pdv || 0),
      parseFloat(dados.total_os || 0),
      parseFloat(dados.total_geral || 0),
      parseInt(dados.qtd_pdv || 0),
      parseInt(dados.qtd_os || 0),
      parseFloat(dados.ticket_medio_pdv || 0),
      parseFloat(dados.ticket_medio_os || 0),
    ]);
    
    console.log(`[Financeiro Jobs] ✅ Snapshot diário criado para ${dataOntem}`);
  } catch (error) {
    console.error('[Financeiro Jobs] ❌ Erro ao criar snapshot diário:', error);
  }
}

/**
 * Calcular análise mensal de produtos (executar no dia 1 de cada mês)
 */
export async function calcularAnaliseMensalProdutos() {
  try {
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const mesAnterior = new Date(primeiroDiaMes);
    mesAnterior.setMonth(mesAnterior.getMonth() - 1);
    
    const mes = mesAnterior.toISOString().split('T')[0];
    
    // Buscar produtos que tiveram vendas no mês anterior
    const query = `
      SELECT 
        p.id as produto_id,
        SUM(si.quantidade) as quantidade_vendida,
        SUM(si.valor_total) as receita_total,
        SUM(si.quantidade * COALESCE(p.vi_custo, p.valor_compra, 0)) as custo_total,
        AVG((si.valor_total - (si.quantidade * COALESCE(p.vi_custo, p.valor_compra, 0))) / NULLIF(si.valor_total, 0) * 100) as margem_media
      FROM public.sale_items si
      INNER JOIN public.sales s ON si.sale_id = s.id
      INNER JOIN public.produtos p ON si.produto_id = p.id
      WHERE DATE_TRUNC('month', s.created_at) = DATE_TRUNC('month', $1::date)
        AND s.status IN ('paid', 'partial')
      GROUP BY p.id
    `;
    
    const result = await pool.query(query, [mes]);
    
    for (const row of result.rows) {
      const receitaTotal = parseFloat(row.receita_total || 0);
      const custoTotal = parseFloat(row.custo_total || 0);
      const lucroTotal = receitaTotal - custoTotal;
      const margemMedia = parseFloat(row.margem_media || 0);
      
      // Calcular rotatividade (simplificado: quantidade vendida / estoque médio)
      // Por enquanto, usar quantidade vendida como proxy
      const quantidadeVendida = parseInt(row.quantidade_vendida || 0);
      
      await pool.query(`
        INSERT INTO public.produto_analise_mensal (
          produto_id, mes, quantidade_vendida, receita_total,
          lucro_total, margem_media, rotatividade
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (produto_id, mes)
        DO UPDATE SET
          quantidade_vendida = EXCLUDED.quantidade_vendida,
          receita_total = EXCLUDED.receita_total,
          lucro_total = EXCLUDED.lucro_total,
          margem_media = EXCLUDED.margem_media,
          rotatividade = EXCLUDED.rotatividade,
          updated_at = NOW()
      `, [
        row.produto_id,
        mes,
        quantidadeVendida,
        receitaTotal,
        lucroTotal,
        margemMedia,
        quantidadeVendida, // Simplificado
      ]);
    }
    
    console.log(`[Financeiro Jobs] ✅ Análise mensal de produtos calculada para ${mes}`);
  } catch (error) {
    console.error('[Financeiro Jobs] ❌ Erro ao calcular análise mensal de produtos:', error);
  }
}

/**
 * Calcular análise mensal de vendedores (executar no dia 1 de cada mês)
 */
export async function calcularAnaliseMensalVendedores() {
  try {
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const mesAnterior = new Date(primeiroDiaMes);
    mesAnterior.setMonth(mesAnterior.getMonth() - 1);
    
    const mes = mesAnterior.toISOString().split('T')[0];
    
    const query = `
      SELECT 
        u.id as vendedor_id,
        COUNT(DISTINCT CASE WHEN s.sale_origin = 'PDV' THEN s.id END) as vendas_pdv,
        COUNT(DISTINCT CASE WHEN s.sale_origin = 'OS' THEN s.id END) as vendas_os,
        COUNT(s.id) as total_vendas,
        SUM(s.total) as total_vendido,
        AVG(s.total) as ticket_medio
      FROM public.sales s
      INNER JOIN auth.users u ON s.cashier_user_id = u.id OR s.technician_id = u.id
      WHERE DATE_TRUNC('month', s.created_at) = DATE_TRUNC('month', $1::date)
        AND s.status IN ('paid', 'partial')
      GROUP BY u.id
    `;
    
    const result = await pool.query(query, [mes]);
    
    for (const row of result.rows) {
      await pool.query(`
        INSERT INTO public.vendedor_analise_mensal (
          vendedor_id, mes, vendas_pdv, vendas_os,
          total_vendido, ticket_medio
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (vendedor_id, mes)
        DO UPDATE SET
          vendas_pdv = EXCLUDED.vendas_pdv,
          vendas_os = EXCLUDED.vendas_os,
          total_vendido = EXCLUDED.total_vendido,
          ticket_medio = EXCLUDED.ticket_medio,
          updated_at = NOW()
      `, [
        row.vendedor_id,
        mes,
        parseInt(row.vendas_pdv || 0),
        parseInt(row.vendas_os || 0),
        parseFloat(row.total_vendido || 0),
        parseFloat(row.ticket_medio || 0),
      ]);
    }
    
    console.log(`[Financeiro Jobs] ✅ Análise mensal de vendedores calculada para ${mes}`);
  } catch (error) {
    console.error('[Financeiro Jobs] ❌ Erro ao calcular análise mensal de vendedores:', error);
  }
}

/**
 * Gerar recomendações de estoque (executar diariamente)
 */
export async function gerarRecomendacoesEstoque() {
  try {
    // Buscar produtos com estoque baixo
    const produtosQuery = `
      SELECT 
        p.id,
        p.nome,
        p.codigo,
        p.quantidade as estoque_atual,
        COALESCE(p.estoque_minimo, 5) as estoque_minimo,
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
        AND p.quantidade >= 0
    `;
    
    const produtosResult = await pool.query(produtosQuery);
    
    for (const produto of produtosResult.rows) {
      const estoqueAtual = parseInt(produto.estoque_atual || 0);
      const estoqueMinimo = parseInt(produto.estoque_minimo || 5);
      const vendaMediaDiaria = parseFloat(produto.venda_media_diaria || 0);
      
      // Verificar se já existe recomendação pendente para este produto
      const existeRec = await pool.query(`
        SELECT id FROM public.ia_recomendacoes
        WHERE tipo = 'estoque'
          AND referencia_id = $1
          AND status = 'pendente'
      `, [produto.id]);
      
      if (existeRec.rows.length > 0) {
        continue; // Já existe recomendação pendente
      }
      
      const quantidadeSugerida = Math.max(estoqueMinimo * 2, Math.ceil(vendaMediaDiaria * 30));
      const prioridade = estoqueAtual === 0 ? 10 : estoqueAtual <= estoqueMinimo ? 8 : 5;
      
      await pool.query(`
        INSERT INTO public.ia_recomendacoes (
          tipo, titulo, descricao, acao_sugerida, prioridade, referencia_id
        ) VALUES (
          'estoque',
          $1,
          $2,
          $3,
          $4,
          $5
        )
      `, [
        `Repor estoque: ${produto.nome}`,
        `Produto ${produto.nome} (${produto.codigo || 'sem código'}) está com estoque baixo (${estoqueAtual} unidades). Estoque mínimo: ${estoqueMinimo}. Venda média diária: ${vendaMediaDiaria.toFixed(2)}.`,
        `Repor ${quantidadeSugerida} unidades para garantir 30 dias de estoque.`,
        prioridade,
        produto.id,
      ]);
    }
    
    console.log(`[Financeiro Jobs] ✅ Recomendações de estoque geradas`);
  } catch (error) {
    console.error('[Financeiro Jobs] ❌ Erro ao gerar recomendações de estoque:', error);
  }
}
