-- CRITICAL SECURITY FIX 1: Restrict candidate_responses SELECT access to admins only
-- This prevents public access to sensitive candidate personal data

DROP POLICY IF EXISTS "Anyone can view candidate responses" ON public.candidate_responses;

CREATE POLICY "Only admins can view candidate responses" 
ON public.candidate_responses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- CRITICAL SECURITY FIX 2: Prevent privilege escalation in profiles table
-- Users should not be able to change their own role

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Split the update policy: users can update their profile but NOT their role
CREATE POLICY "Users can update their own profile data" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  -- Prevent role changes by non-admins
  (
    OLD.role = NEW.role OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);

-- CRITICAL SECURITY FIX 3: Add audit logging for candidate data access
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view security audit logs" 
ON public.security_audit_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "System can insert security audit logs" 
ON public.security_audit_logs 
FOR INSERT 
WITH CHECK (true);

-- SECURITY FIX 4: Secure database functions by fixing search paths
-- Update existing functions to have secure search paths

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.log_user_activity(p_user_id uuid, p_activity_type text, p_description text, p_entity_type text DEFAULT NULL::text, p_entity_id uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
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
$function$;