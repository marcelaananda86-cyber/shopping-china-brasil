create or replace function public.claim_products_for_sync(batch_size integer default 100)
returns table (id text, slug text, source_url text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with claimed as (
    select product.id
    from public.products as product
    where product.next_sync_at <= now()
    order by (product.synced_at is not null), product.next_sync_at, product.id
    for update skip locked
    limit least(greatest(batch_size, 1), 100)
  ), reserved as (
    update public.products as product
    set next_sync_at = now() + interval '10 minutes'
    from claimed
    where product.id = claimed.id
    returning product.id, product.slug, product.source_url
  )
  select reserved.id, reserved.slug, reserved.source_url
  from reserved;
end;
$$;

revoke all on function public.claim_products_for_sync(integer) from public, anon, authenticated;
grant execute on function public.claim_products_for_sync(integer) to service_role;
