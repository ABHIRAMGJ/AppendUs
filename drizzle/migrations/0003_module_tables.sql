-- Skill assessment attempts
create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  topic text not null,
  level text not null,
  score int not null,
  total int not null,
  questions jsonb not null,
  answers jsonb not null,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_attempts TO authenticated;
GRANT ALL ON public.assessment_attempts TO service_role;
alter table public.assessment_attempts enable row level security;
create policy "own attempts" on public.assessment_attempts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admin read attempts" on public.assessment_attempts for select to authenticated using (has_role(auth.uid(), 'admin'::app_role));

-- Coding practice submissions
create table public.code_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  problem text not null,
  language text not null,
  code text not null,
  review text,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.code_submissions TO authenticated;
GRANT ALL ON public.code_submissions TO service_role;
alter table public.code_submissions enable row level security;
create policy "own submissions" on public.code_submissions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admin read submissions" on public.code_submissions for select to authenticated using (has_role(auth.uid(), 'admin'::app_role));

-- Job tracker extras
alter table public.job_applications add column deadline date;
alter table public.job_applications add column next_action text;

-- Project visibility for public portfolio
alter table public.projects add column visibility text not null default 'private';
GRANT SELECT ON public.projects TO anon;
create policy "public read public projects" on public.projects for select to anon using (visibility = 'public');

-- Feature flags (admin-managed)
create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text,
  updated_at timestamptz not null default now()
);
GRANT SELECT ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;
alter table public.feature_flags enable row level security;
create policy "authenticated read flags" on public.feature_flags for select to authenticated using (true);
create policy "admin manage flags" on public.feature_flags for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
insert into public.feature_flags (key, enabled, description) values
  ('community', false, 'Community module (coming soon)'),
  ('voice_interviews', false, 'Voice-based interview practice'),
  ('public_portfolios', true, 'Public portfolio pages');

-- Admin audit log
create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  action text not null,
  target text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT ON public.admin_actions TO authenticated;
GRANT ALL ON public.admin_actions TO service_role;
alter table public.admin_actions enable row level security;
create policy "admin read actions" on public.admin_actions for select to authenticated using (has_role(auth.uid(), 'admin'::app_role));
create policy "admin insert actions" on public.admin_actions for insert to authenticated with check (has_role(auth.uid(), 'admin'::app_role) and auth.uid() = admin_id);

-- Admins can grant/revoke roles
create policy "admin manage roles" on public.user_roles for insert to authenticated with check (has_role(auth.uid(), 'admin'::app_role));
create policy "admin delete roles" on public.user_roles for delete to authenticated using (has_role(auth.uid(), 'admin'::app_role));