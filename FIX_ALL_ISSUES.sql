-- ============================================
-- CORRIGIR TODOS OS PROBLEMAS
-- Execute este script no Supabase Studio > SQL Editor
-- ============================================

-- ============================================
-- 1. CORRIGIR PERMISSÕES PARA EXCLUIR VENDAS
-- ============================================

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can delete sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can delete sales" ON public.sales;
DROP POLICY IF EXISTS "Users can delete their own sales" ON public.sales;

-- Criar política para permitir DELETE em sales
-- Rascunhos: qualquer usuário autenticado pode deletar
-- Vendas finalizadas: apenas admin/gestor pode deletar (será validado no código)
CREATE POLICY "Authenticated users can delete sales"
ON public.sales
FOR DELETE
USING (auth.role() = 'authenticated');

-- Verificar e corrigir políticas RLS para sale_items
DROP POLICY IF EXISTS "Users can delete sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Authenticated users can delete sale_items" ON public.sale_items;

CREATE POLICY "Authenticated users can delete sale_items"
ON public.sale_items
FOR DELETE
USING (auth.role() = 'authenticated');

-- Verificar e corrigir políticas RLS para payments
DROP POLICY IF EXISTS "Users can delete payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can delete payments" ON public.payments;

CREATE POLICY "Authenticated users can delete payments"
ON public.payments
FOR DELETE
USING (auth.role() = 'authenticated');

-- Verificar se RLS está habilitado
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. NOTA SOBRE TABELA ordens_servico
-- ============================================
-- A tabela ordens_servico pode não existir ainda no banco.
-- Se você usar o sistema de OS do módulo de assistência,
-- verifique o nome correto da tabela no banco de dados.
-- O código do PDV verifica OSs faturadas através da tabela sales (campo ordem_servico_id),
-- então não é necessário adicionar o campo os_faturada na tabela de OS.

-- Comentários
COMMENT ON POLICY "Authenticated users can delete sales" ON public.sales IS 
'Permite que usuários autenticados deletem vendas (validação de permissões feita no código)';
COMMENT ON POLICY "Authenticated users can delete sale_items" ON public.sale_items IS 
'Permite deletar itens de vendas';
COMMENT ON POLICY "Authenticated users can delete payments" ON public.payments IS 
'Permite deletar pagamentos de vendas';

