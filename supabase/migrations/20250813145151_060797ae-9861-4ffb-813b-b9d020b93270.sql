-- Fix remaining security warnings

-- FIX 1: Update functions to have secure search paths
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

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_overdue_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.tasks 
  SET status = 'delayed'
  WHERE deadline < now() 
  AND status IN ('pending', 'in_progress');
END;
$function$;