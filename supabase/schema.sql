-- Exhibition guestbook (public read + insert via anon key)
create table if not exists public.guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  font_id text not null,
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists guestbook_entries_created_at_idx
  on public.guestbook_entries (created_at desc);

alter table public.guestbook_entries enable row level security;

create policy "guestbook_select_anon"
  on public.guestbook_entries
  for select
  to anon, authenticated
  using (true);

create policy "guestbook_insert_anon"
  on public.guestbook_entries
  for insert
  to anon, authenticated
  with check (true);

-- No update/delete for visitors (manage via Supabase dashboard if needed)
