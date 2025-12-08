-- Atualizar tabela de perfis para incluir telefone
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone text;

-- Atualizar função para lidar com novos usuários e incluir telefone
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;