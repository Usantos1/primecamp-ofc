// Adicionar endpoint de precificação antes do export default
router.post('/precificacao/sugerir', async (req, res) => {
  try {
    const { produto_id, margem_desejada, concorrentes } = req.body;
    
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
    const custo = parseFloat(produto.preco_custo || 0);
    const precoAtual = parseFloat(produto.preco_venda || 0);
    
    // Calcular preço sugerido baseado em margem
    const margem = margem_desejada || 50; // Default 50%
    const precoSugerido = custo > 0 ? custo * (1 + margem / 100) : precoAtual;
    
    // Buscar análise histórica do produto
    const analiseQuery = await pool.query(
      `SELECT 
        AVG(preco_medio_venda) as preco_medio,
        AVG(margem_media) as margem_media
      FROM public.produto_analise_mensal
      WHERE produto_id = $1
      ORDER BY mes DESC
      LIMIT 3`,
      [produto_id]
    );
    
    const precoMedio = analiseQuery.rows[0]?.preco_medio ? parseFloat(analiseQuery.rows[0].preco_medio) : null;
    const margemMedia = analiseQuery.rows[0]?.margem_media ? parseFloat(analiseQuery.rows[0].margem_media) : null;
    
    // Análise de elasticidade (simplificada)
    // Se o produto vende bem, pode aumentar preço
    // Se vende pouco, considerar redução
    
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
    
    if (precoMedio && precoSugerido > precoMedio * 1.1) {
      sugestoes.push({
        tipo: 'aviso',
        mensagem: `Preço sugerido (${currencyFormatters.brl(precoSugerido)}) está ${((precoSugerido / precoMedio - 1) * 100).toFixed(1)}% acima da média histórica`,
      });
    }
    
    if (totalVendas < 5 && precoSugerido > custo * 1.3) {
      sugestoes.push({
        tipo: 'reducao',
        mensagem: `Produto com baixa rotatividade (${totalVendas} vendas). Considere reduzir margem para aumentar vendas.`,
        precoAlternativo: custo * 1.25,
      });
    }
    
    if (totalVendas > 20 && precoSugerido < precoAtual * 0.95) {
      sugestoes.push({
        tipo: 'aumento',
        mensagem: `Produto com alta rotatividade. Pode aumentar preço com segurança.`,
        precoAlternativo: precoAtual * 1.05,
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
      margem_aparente: ((precoSugerido - custo) / precoSugerido * 100),
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
