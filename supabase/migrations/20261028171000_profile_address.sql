alter table public.profiles
add column if not exists address jsonb not null default '{}'::jsonb;
