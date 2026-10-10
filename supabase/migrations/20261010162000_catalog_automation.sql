create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create index if not exists products_next_sync_all_idx on public.products(next_sync_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute procedure public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
for each row execute procedure public.set_updated_at();

create schema if not exists private;

create or replace function private.invoke_catalog_sync()
returns bigint
language sql
security definer
set search_path = ''
as $$
  select net.http_post(
    url := 'https://hwkgdhfnhhoomqtlzsxq.supabase.co/functions/v1/sync-catalog?limit=100',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'sync_catalog_secret'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$$;

revoke all on function private.invoke_catalog_sync() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from vault.decrypted_secrets where name = 'sync_catalog_secret') then
    perform cron.schedule(
      'sync-shopping-china-catalog',
      '*/15 * * * *',
      'select private.invoke_catalog_sync();'
    );
  end if;
end;
$$;
