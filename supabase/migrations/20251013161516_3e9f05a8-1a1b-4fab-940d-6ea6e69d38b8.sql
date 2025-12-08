-- FASE 1: Sistema de Roles Seguro
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Only system can manage roles" ON public.user_roles
FOR ALL USING (false) WITH CHECK (false);

-- Migrar dados existentes (apenas usuários que existem em auth.users)
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 
  CASE 
    WHEN p.role = 'admin' THEN 'admin'::app_role
    ELSE 'member'::app_role
  END as role
FROM public.profiles p
INNER JOIN auth.users u ON u.id = p.user_id
WHERE p.role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- FASE 2: Atualizar RLS do time_clock
DROP POLICY IF EXISTS "Authenticated users can view all time records" ON public.time_clock;
DROP POLICY IF EXISTS "Users can update their own time records or admins can update an" ON public.time_clock;
DROP POLICY IF EXISTS "Admins can delete time records" ON public.time_clock;
DROP POLICY IF EXISTS "Users can insert their own time records" ON public.time_clock;

CREATE POLICY "Users view own or admins view all time records" 
ON public.time_clock
FOR SELECT USING (
  user_id = auth.uid() OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users insert own time records" 
ON public.time_clock
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Only admins update time records" 
ON public.time_clock
FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins delete time records" 
ON public.time_clock
FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- FASE 3: Sistema de Treinamentos
CREATE TABLE public.trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  training_type text,
  duration_minutes int,
  mandatory boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TYPE public.training_status AS ENUM ('assigned', 'in_progress', 'completed');

CREATE TABLE public.training_assignments (
  training_id uuid REFERENCES public.trainings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status training_status NOT NULL DEFAULT 'assigned',
  progress real NOT NULL DEFAULT 0,
  last_watched_seconds int NOT NULL DEFAULT 0,
  due_date date,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (training_id, user_id)
);

CREATE INDEX idx_training_assignments_user ON training_assignments(user_id);
CREATE INDEX idx_training_assignments_status ON training_assignments(status);

CREATE TRIGGER set_updated_at_trainings
  BEFORE UPDATE ON trainings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_training_assignments
  BEFORE UPDATE ON training_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view trainings" 
ON public.trainings
FOR SELECT USING (true);

CREATE POLICY "Only admins manage trainings" 
ON public.trainings
FOR ALL USING (has_role(auth.uid(), 'admin'));

ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own assignments or admins view all" 
ON public.training_assignments
FOR SELECT USING (
  user_id = auth.uid() OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Only admins manage assignments insert delete" 
ON public.training_assignments
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users update own progress only" 
ON public.training_assignments
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Atualizar todas as políticas RLS existentes para usar has_role
DROP POLICY IF EXISTS "Only admins can insert processes" ON public.processes;
DROP POLICY IF EXISTS "Only admins can update processes" ON public.processes;
DROP POLICY IF EXISTS "Only admins can delete processes" ON public.processes;

CREATE POLICY "Only admins can insert processes" ON public.processes
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update processes" ON public.processes
FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete processes" ON public.processes
FOR DELETE USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their assigned tasks or admins can update all" ON public.tasks;
DROP POLICY IF EXISTS "Users can view accessible tasks" ON public.tasks;

CREATE POLICY "Admins can insert tasks" ON public.tasks
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tasks" ON public.tasks
FOR DELETE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users update assigned or admins update all tasks" ON public.tasks
FOR UPDATE USING (
  responsible_user_id = auth.uid() OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users view accessible tasks" ON public.tasks
FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR 
  responsible_user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM processes 
    WHERE processes.id = tasks.process_id AND can_access_process(processes.id)
  )
);

DROP POLICY IF EXISTS "Only admins can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Only admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Only admins can delete categories" ON public.categories;

CREATE POLICY "Only admins can insert categories" ON public.categories
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update categories" ON public.categories
FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete categories" ON public.categories
FOR DELETE USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can insert tags" ON public.tags;
DROP POLICY IF EXISTS "Only admins can update tags" ON public.tags;
DROP POLICY IF EXISTS "Only admins can delete tags" ON public.tags;

CREATE POLICY "Only admins can insert tags" ON public.tags
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update tags" ON public.tags
FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete tags" ON public.tags
FOR DELETE USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can insert departments" ON public.departments;
DROP POLICY IF EXISTS "Only admins can update departments" ON public.departments;
DROP POLICY IF EXISTS "Only admins can delete departments" ON public.departments;

CREATE POLICY "Only admins can insert departments" ON public.departments
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update departments" ON public.departments
FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete departments" ON public.departments
FOR DELETE USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can manage positions" ON public.positions;

CREATE POLICY "Only admins manage positions" ON public.positions
FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can delete events they created or admins can delete all" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update events they created or admins can update all" ON public.calendar_events;

CREATE POLICY "Users delete own or admins delete all events" ON public.calendar_events
FOR DELETE USING (
  created_by = auth.uid() OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users update own or admins update all events" ON public.calendar_events
FOR UPDATE USING (
  created_by = auth.uid() OR has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Only admins can create tests" ON public.disc_tests;
DROP POLICY IF EXISTS "Only admins can update tests" ON public.disc_tests;
DROP POLICY IF EXISTS "Only admins can delete tests" ON public.disc_tests;
DROP POLICY IF EXISTS "Users can view active tests or admins can view all" ON public.disc_tests;

CREATE POLICY "Only admins create tests" ON public.disc_tests
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins update tests" ON public.disc_tests
FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins delete tests" ON public.disc_tests
FOR DELETE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "View active tests or admins view all" ON public.disc_tests
FOR SELECT USING (
  is_active = true OR user_id = auth.uid() OR has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Admins can delete disc responses" ON public.disc_responses;
DROP POLICY IF EXISTS "Users can view their own responses or admins can view all" ON public.disc_responses;

CREATE POLICY "Admins delete disc responses" ON public.disc_responses
FOR DELETE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own or admins view all disc responses" ON public.disc_responses
FOR SELECT USING (
  user_id = auth.uid() OR has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Only admins can manage NPS surveys" ON public.nps_surveys;

CREATE POLICY "Admins manage NPS surveys" ON public.nps_surveys
FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can manage employee NPS surveys" ON public.employee_nps_surveys;

CREATE POLICY "Admins manage employee NPS surveys" ON public.employee_nps_surveys
FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view their own responses or admins can view all" ON public.nps_responses;

CREATE POLICY "Users view own or admins view all NPS responses" ON public.nps_responses
FOR SELECT USING (
  user_id = auth.uid() OR has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Users can view responses they made or about them or admins can " ON public.employee_nps_responses;

CREATE POLICY "Users view own responses or admins view all employee NPS" ON public.employee_nps_responses
FOR SELECT USING (
  user_id = auth.uid() OR 
  target_employee_id = auth.uid() OR 
  has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Users can create goals for themselves or admins can create for " ON public.goals;
DROP POLICY IF EXISTS "Users can delete their own goals or admins can delete any" ON public.goals;
DROP POLICY IF EXISTS "Users can update their goals, participant goals or admins can u" ON public.goals;
DROP POLICY IF EXISTS "Users can view their goals, department goals, participant goals" ON public.goals;

CREATE POLICY "Users create own or admins create any goals" ON public.goals
FOR INSERT WITH CHECK (
  user_id = auth.uid() OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users delete own or admins delete any goals" ON public.goals
FOR DELETE USING (
  user_id = auth.uid() OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users update own/participant or admins update any goals" ON public.goals
FOR UPDATE USING (
  user_id = auth.uid() OR 
  auth.uid() = ANY (participants) OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users view own/dept/participant or admins view all goals" ON public.goals
FOR SELECT USING (
  user_id = auth.uid() OR 
  department = (SELECT department FROM profiles WHERE user_id = auth.uid()) OR 
  auth.uid() = ANY (participants) OR 
  has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Admins can manage all candidate responses" ON public.candidate_responses;
DROP POLICY IF EXISTS "Only admins can view candidate responses" ON public.candidate_responses;

CREATE POLICY "Admins manage candidate responses" ON public.candidate_responses
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins view candidate responses" ON public.candidate_responses
FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage job responses" ON public.job_responses;
DROP POLICY IF EXISTS "Admins can view all job responses" ON public.job_responses;

CREATE POLICY "Admins manage job responses" ON public.job_responses
FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can manage job surveys" ON public.job_surveys;

CREATE POLICY "Admins manage job surveys" ON public.job_surveys
FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can manage candidate evaluations" ON public.job_candidate_evaluations;

CREATE POLICY "Admins manage candidate evaluations" ON public.job_candidate_evaluations
FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can manage process tags" ON public.process_tags;

CREATE POLICY "Admins manage process tags" ON public.process_tags
FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can manage process templates" ON public.process_templates;

CREATE POLICY "Admins manage process templates" ON public.process_templates
FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can manage team permissions" ON public.team_permissions;

CREATE POLICY "Admins manage team permissions" ON public.team_permissions
FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage user positions" ON public.user_position_departments;

CREATE POLICY "Admins manage user positions" ON public.user_position_departments
FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update profile approval" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles for approval" ON public.profiles;

CREATE POLICY "Admins update profile approval" ON public.profiles
FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all profiles" ON public.profiles
FOR SELECT USING (has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

DROP POLICY IF EXISTS "produtos_read_all" ON public.produtos;
DROP POLICY IF EXISTS "produtos_insert_all" ON public.produtos;
DROP POLICY IF EXISTS "produtos_update_all" ON public.produtos;
DROP POLICY IF EXISTS "produtos_delete_all" ON public.produtos;

CREATE POLICY "Authenticated users view produtos" ON public.produtos
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins manage produtos" ON public.produtos
FOR ALL USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can view security audit logs" ON public.security_audit_logs;

CREATE POLICY "Admins view security audit logs" ON public.security_audit_logs
FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view their own logs or admins can view all" ON public.user_activity_logs;

CREATE POLICY "Users view own or admins view all activity logs" ON public.user_activity_logs
FOR SELECT USING (
  user_id = auth.uid() OR has_role(auth.uid(), 'admin')
);