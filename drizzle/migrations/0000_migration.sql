create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, education_level text, target_role text, skills text, weekly_hours int,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "own profile delete" on public.profiles for delete to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.mentor_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, title text not null default 'New conversation',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.mentor_threads to authenticated;
grant all on public.mentor_threads to service_role;
alter table public.mentor_threads enable row level security;
create policy "own threads" on public.mentor_threads for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.mentor_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.mentor_threads(id) on delete cascade,
  user_id uuid not null, message jsonb not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.mentor_messages to authenticated;
grant all on public.mentor_messages to service_role;
alter table public.mentor_messages enable row level security;
create policy "own messages" on public.mentor_messages for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.mentor_messages(thread_id, created_at);

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, company text not null, role text not null,
  status text not null default 'applied', notes text, applied_on date default current_date,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.job_applications to authenticated;
grant all on public.job_applications to service_role;
alter table public.job_applications enable row level security;
create policy "own jobs" on public.job_applications for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, title text not null, description text, tech text, link text,
  status text not null default 'in_progress',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;
create policy "own projects" on public.projects for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.resume_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, target_role text, result jsonb not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.resume_analyses to authenticated;
grant all on public.resume_analyses to service_role;
alter table public.resume_analyses enable row level security;
create policy "own analyses" on public.resume_analyses for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);