-- ============================================
-- CORRIGIR PERMISSÕES PARA EXCLUIR VENDAS
-- Execute este script no Supabase Studio > SQL Editor
-- ============================================

-- Verificar e corrigir políticas RLS para sales
-- Permitir DELETE para usuários autenticados

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can delete sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can delete sales" ON public.sales;
DROP POLICY IF EXISTS "Users can delete their own sales" ON public.sales;

-- Criar política para permitir DELETE
-- Rascunhos: qualquer usuário autenticado pode deletar seus próprios rascunhos
-- Vendas finalizadas: apenas admin/gestor pode deletar (será validado no código)
CREATE POLICY "Authenticated users can delete sales"
ON public.sales
FOR DELETE
USING (
  auth.role() = 'authenticated' AND (
    -- Rascunhos: pode deletar se for o vendedor
    (is_draft = true AND vendedor_id = auth.uid()) OR
    -- Vendas finalizadas: apenas se for admin (validação adicional no código)
    (is_draft = false AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND (role = 'admin' OR department = 'gestao' OR department = 'gerencia')
    ))
  )
);

-- Verificar e corrigir políticas RLS para sale_items
DROP POLICY IF EXISTS "Users can delete sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Authenticated users can delete sale_items" ON public.sale_items;

CREATE POLICY "Authenticated users can delete sale_items"
ON public.sale_items
FOR DELETE
USING (
  auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM public.sales
    WHERE sales.id = sale_items.sale_id
    AND (
      (sales.is_draft = true AND sales.vendedor_id = auth.uid()) OR
      (sales.is_draft = false AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND (role = 'admin' OR department = 'gestao' OR department = 'gerencia')
      ))
    )
  )
);

-- Verificar e corrigir políticas RLS para payments
DROP POLICY IF EXISTS "Users can delete payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can delete payments" ON public.payments;

CREATE POLICY "Authenticated users can delete payments"
ON public.payments
FOR DELETE
USING (
  auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM public.sales
    WHERE sales.id = payments.sale_id
    AND (
      (sales.is_draft = true AND sales.vendedor_id = auth.uid()) OR
      (sales.is_draft = false AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND (role = 'admin' OR department = 'gestao' OR department = 'gerencia')
      ))
    )
  )
);

-- Verificar se RLS está habilitado
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Comentários
COMMENT ON POLICY "Authenticated users can delete sales" ON public.sales IS 
'Permite que usuários autenticados deletem rascunhos próprios ou vendas finalizadas (se admin/gestor)';
COMMENT ON POLICY "Authenticated users can delete sale_items" ON public.sale_items IS 
'Permite deletar itens de vendas que o usuário pode deletar';
COMMENT ON POLICY "Authenticated users can delete payments" ON public.payments IS 
'Permite deletar pagamentos de vendas que o usuário pode deletar';

