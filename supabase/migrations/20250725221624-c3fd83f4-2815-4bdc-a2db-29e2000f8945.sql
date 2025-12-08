-- Corrigir warning de search_path nas funções existentes
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.get_current_user_department()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  SELECT department FROM public.profiles WHERE user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.can_access_process(_process_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  SELECT EXISTS (
    -- Admin pode ver todos os processos
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) OR EXISTS (
    -- Usuário pode ver processos onde é participante ou proprietário
    SELECT 1 FROM public.processes p
    WHERE p.id = _process_id 
    AND (
      p.owner = (SELECT display_name FROM public.profiles WHERE user_id = auth.uid())
      OR auth.uid()::text = ANY(p.participants)
      OR (SELECT display_name FROM public.profiles WHERE user_id = auth.uid()) = ANY(p.participants)
    )
  ) OR EXISTS (
    -- Usuário pode ver processos do mesmo departamento
    SELECT 1 FROM public.processes p
    WHERE p.id = _process_id 
    AND p.department = (SELECT department FROM public.profiles WHERE user_id = auth.uid())
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_user_approved()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  SELECT COALESCE(approved, FALSE) FROM public.profiles WHERE user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email),
    'member'
  );
  RETURN NEW;
END;
$function$;