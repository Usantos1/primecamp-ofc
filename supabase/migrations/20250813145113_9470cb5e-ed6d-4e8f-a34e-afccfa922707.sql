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

-- Create a function to validate profile updates (prevents role escalation)
CREATE OR REPLACE FUNCTION public.validate_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  -- Allow admins to change any profile
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RETURN NEW;
  END IF;
  
  -- For non-admins, prevent role changes
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'Permission denied: Only admins can change user roles';
  END IF;
  
  -- For non-admins, only allow updating their own profile
  IF NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Permission denied: Can only update own profile';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger for profile validation
DROP TRIGGER IF EXISTS validate_profile_update_trigger ON public.profiles;
CREATE TRIGGER validate_profile_update_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_update();

-- Restore the update policy (now protected by trigger)
CREATE POLICY "Users can update their own profile data" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

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