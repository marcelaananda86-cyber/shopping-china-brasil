create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  slug text not null unique,
  title text not null,
  description text not null default '',
  brand text,
  gtin text,
  mpn text,
  google_product_category text,
  condition text not null default 'new' check (condition in ('new', 'refurbished', 'used')),
  image_url text not null,
  additional_image_urls text[] not null default '{}',
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  availability text not null default 'out_of_stock' check (availability in ('in_stock', 'out_of_stock', 'preorder', 'backorder')),
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default false,
  source_url text not null,
  source_updated_at timestamptz,
  synced_at timestamptz,
  next_sync_at timestamptz not null default now(),
  sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_active_slug_idx on public.products(active, slug);
create index if not exists products_next_sync_idx on public.products(next_sync_at) where active;
create index if not exists products_gtin_idx on public.products(gtin) where gtin is not null;

create table if not exists public.orders (
  id text primary key default ('SCB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  customer_id uuid not null references public.profiles(id),
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  currency text not null default 'BRL' check (currency = 'BRL'),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  payment_method text,
  shipping_deadline_days integer not null default 20 check (shipping_deadline_days between 1 and 20),
  tracking_code text,
  shipping_address jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_customer_created_idx on public.orders(customer_id, created_at desc);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id text not null references public.orders(id) on delete cascade,
  product_id text not null,
  slug text not null,
  title text not null,
  image_url text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null default 1 check (quantity > 0)
);

create index if not exists order_items_order_idx on public.order_items(order_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "Public can read active products" on public.products for select using (active = true);
create policy "Customers can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Customers can update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Customers can read own orders" on public.orders for select using (auth.uid() = customer_id);
create policy "Customers can read own order items" on public.order_items for select using (
  exists (select 1 from public.orders where orders.id = order_items.order_id and orders.customer_id = auth.uid())
);

create or replace view public.merchant_products with (security_invoker = true) as
select id, slug, title, description, brand, gtin, mpn, google_product_category, condition,
       image_url, additional_image_urls, price_cents, currency, availability, stock,
       source_url, synced_at, updated_at
from public.products
where active = true;

grant select on public.merchant_products to anon, authenticated;
