-- Corrigir função com search_path apropriado
CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_description TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  INSERT INTO public.user_activity_logs (
    user_id, 
    activity_type, 
    description, 
    entity_type, 
    entity_id
  ) VALUES (
    p_user_id, 
    p_activity_type, 
    p_description, 
    p_entity_type, 
    p_entity_id
  );
END;
$$;