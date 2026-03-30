-- Create feedback table for user feedback submissions
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  email text,
  message text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.feedback enable row level security;

-- Allow anyone to insert feedback (no auth required)
create policy "Allow public insert"
on public.feedback
for insert
to public
with check (true);

-- Allow authenticated users to read their own feedback (optional - for future admin dashboard)
create policy "Allow authenticated users to read"
on public.feedback
for select
to authenticated
using (true);
