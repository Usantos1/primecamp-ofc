-- Add dynamic questions and AI analysis fields
alter table if exists public.job_surveys
  add column if not exists dynamic_questions jsonb default '[]'::jsonb;

alter table if exists public.job_responses
  add column if not exists dynamic_answers jsonb default '{}'::jsonb,
  add column if not exists ai_analysis jsonb;

-- Ensure job_candidate_ai_analysis table exists (reuse if already created)
create table if not exists public.job_candidate_ai_analysis (
  id uuid primary key default gen_random_uuid(),
  job_response_id uuid not null,
  survey_id uuid not null,
  analysis_data jsonb,
  raw_analysis text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint job_candidate_ai_analysis_job_response_id_fkey foreign key (job_response_id) references public.job_responses(id)
);

create index if not exists job_candidate_ai_analysis_job_response_id_idx on public.job_candidate_ai_analysis(job_response_id);
create index if not exists job_candidate_ai_analysis_survey_id_idx on public.job_candidate_ai_analysis(survey_id);

