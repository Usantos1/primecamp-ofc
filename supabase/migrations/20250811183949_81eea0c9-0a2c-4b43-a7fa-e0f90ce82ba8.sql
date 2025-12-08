-- Adicionar política DELETE para disc_responses (apenas admins podem deletar)
CREATE POLICY "Admins can delete disc responses" 
ON disc_responses 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);