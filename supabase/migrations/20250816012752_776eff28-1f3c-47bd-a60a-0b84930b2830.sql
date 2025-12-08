-- Fix the search_path issue for the function
CREATE OR REPLACE FUNCTION public.update_updated_at_produtos()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public';