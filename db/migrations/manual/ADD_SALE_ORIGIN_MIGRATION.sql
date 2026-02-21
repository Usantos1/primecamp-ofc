-- ============================================
-- MIGRAÇÃO: ADICIONAR CAMPO sale_origin E CAMPOS RELACIONADOS
-- PARTE 1 - ESTRUTURA DE VENDAS
-- ============================================
-- Execute este script no banco de dados
-- ============================================

-- Adicionar campo sale_origin na tabela sales
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS sale_origin TEXT CHECK (sale_origin IN ('PDV', 'OS'));

-- Adicionar campo technician_id (para vendas de OS)
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS technician_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Adicionar campo cashier_user_id (para vendas de PDV)
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS cashier_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_sales_sale_origin ON public.sales(sale_origin);
CREATE INDEX IF NOT EXISTS idx_sales_technician_id ON public.sales(technician_id);
CREATE INDEX IF NOT EXISTS idx_sales_cashier_user_id ON public.sales(cashier_user_id);

-- Atualizar vendas existentes baseado em ordem_servico_id
-- Se tem ordem_servico_id, provavelmente é OS
UPDATE public.sales 
SET sale_origin = 'OS'
WHERE ordem_servico_id IS NOT NULL 
  AND sale_origin IS NULL;

-- Para vendas que não têm ordem_servico_id, definir como PDV
UPDATE public.sales 
SET sale_origin = 'PDV'
WHERE ordem_servico_id IS NULL 
  AND sale_origin IS NULL;

-- Migrar vendedor_id para cashier_user_id quando for PDV
-- Apenas se o vendedor_id existir em auth.users
UPDATE public.sales s
SET cashier_user_id = s.vendedor_id
FROM auth.users u
WHERE s.sale_origin = 'PDV' 
  AND s.cashier_user_id IS NULL 
  AND s.vendedor_id IS NOT NULL
  AND s.vendedor_id = u.id;

-- Migrar technician_id de ordens_servico quando possível
-- Apenas se o tecnico_id existir em auth.users
UPDATE public.sales s
SET technician_id = os.tecnico_id
FROM public.ordens_servico os
INNER JOIN auth.users u ON os.tecnico_id = u.id
WHERE s.ordem_servico_id = os.id
  AND s.sale_origin = 'OS'
  AND s.technician_id IS NULL
  AND os.tecnico_id IS NOT NULL;

-- Comentário para documentação
COMMENT ON COLUMN public.sales.sale_origin IS 'Origem da venda: PDV (Ponto de Venda) ou OS (Ordem de Serviço)';
COMMENT ON COLUMN public.sales.technician_id IS 'ID do técnico responsável (obrigatório quando sale_origin = OS)';
COMMENT ON COLUMN public.sales.cashier_user_id IS 'ID do usuário do caixa (obrigatório quando sale_origin = PDV)';
