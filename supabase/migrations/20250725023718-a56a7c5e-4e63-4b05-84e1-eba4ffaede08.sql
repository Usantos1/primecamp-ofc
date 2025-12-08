-- Corrigir problema de RLS - adicionar política para a tabela kv_store_2c4defad
CREATE POLICY "Allow authenticated users access to kv_store" 
ON public.kv_store_2c4defad 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);