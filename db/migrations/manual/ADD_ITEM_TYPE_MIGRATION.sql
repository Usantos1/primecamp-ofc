-- ============================================
-- MIGRAÇÃO: GARANTIR CAMPO item_type EM sale_items
-- PARTE 2 - PRODUTO x SERVIÇO
-- ============================================
-- Execute este script no banco de dados
-- ============================================

-- Verificar se produto_tipo já existe (já existe na estrutura original)
-- Vamos garantir que está configurado corretamente como item_type
-- Na verdade, o campo já existe como produto_tipo, vamos apenas garantir valores corretos

-- Atualizar valores existentes para garantir consistência
-- Se produto_tipo for null, tentar inferir do tipo do produto
UPDATE public.sale_items si
SET produto_tipo = CASE 
  WHEN p.tipo = 'servico' OR p.tipo = 'serviço' THEN 'servico'
  WHEN p.tipo = 'produto' OR p.tipo = 'peca' OR p.tipo = 'peça' THEN 'produto'
  ELSE 'produto' -- Default para produtos
END
FROM public.produtos p
WHERE si.produto_id = p.id
  AND si.produto_tipo IS NULL;

-- Para itens sem produto_id, manter como null (será definido no momento da venda)

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.sale_items.produto_tipo IS 'Tipo do item: produto (afeta estoque) ou servico (não afeta estoque)';
