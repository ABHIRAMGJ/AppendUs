create extension if not exists vector;

create table public.resume_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  analysis_id uuid,
  content text not null,
  embedding vector(3072) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resume_chunks TO authenticated;
GRANT ALL ON public.resume_chunks TO service_role;

alter table public.resume_chunks enable row level security;

create policy "own resume chunks" on public.resume_chunks
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "admin read resume chunks" on public.resume_chunks
  for select to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

create index resume_chunks_embedding_idx
  on public.resume_chunks using hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

create or replace function public.match_resume_chunks (
  query_embedding vector(3072),
  match_count int default 8
)
returns table (
  id uuid,
  content text,
  similarity float
)
language sql stable
security invoker
set search_path = public
as $$
  select
    c.id,
    c.content,
    1 - (c.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)) as similarity
  from resume_chunks c
  where c.user_id = auth.uid()
  order by c.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)
  limit match_count;
$$;