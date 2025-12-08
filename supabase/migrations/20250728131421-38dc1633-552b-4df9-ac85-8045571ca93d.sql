-- Corrigir função para incluir search_path de segurança
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public', 'auth'
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    display_name, 
    phone,
    role,
    approved
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    'member',
    false
  );
  RETURN NEW;
END;
$$;