-- Grade de estoque: controle por cor (tampas) ou com/sem aro (telas)
-- estoque_grade: { "tipo": "cor"|"aro", "itens": { "Branca": 5, "Dourada": 3 } }
-- quantidade continua sendo o total (soma dos itens) para compatibilidade com vendas/OS

ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS estoque_grade JSONB DEFAULT NULL;

COMMENT ON COLUMN public.produtos.estoque_grade IS 'Grade de estoque: tipo "cor" (itens por cor) ou "aro" (Com Aro / Sem Aro). Ex: {"tipo":"cor","itens":{"Branca":5,"Dourada":3}}';
