revoke all on function public.handle_new_user() from public, anon, authenticated;

drop policy if exists "Customers can read own profile" on public.profiles;
create policy "Customers can read own profile"
on public.profiles for select
using ((select auth.uid()) = id);

drop policy if exists "Customers can update own profile" on public.profiles;
create policy "Customers can update own profile"
on public.profiles for update
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Customers can read own orders" on public.orders;
create policy "Customers can read own orders"
on public.orders for select
using ((select auth.uid()) = customer_id);

drop policy if exists "Customers can read own order items" on public.order_items;
create policy "Customers can read own order items"
on public.order_items for select
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.customer_id = (select auth.uid())
  )
);
