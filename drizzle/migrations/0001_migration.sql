create type public.app_role as enum ('admin', 'user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "admin read profiles" on public.profiles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admin read threads" on public.mentor_threads for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admin read messages" on public.mentor_messages for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admin read jobs" on public.job_applications for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admin read projects" on public.projects for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admin read analyses" on public.resume_analyses for select to authenticated using (public.has_role(auth.uid(), 'admin'));

alter table public.profiles add column email text;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.email);
  return new;
end; $$;
update public.profiles p set email = u.email from auth.users u where u.id = p.id;