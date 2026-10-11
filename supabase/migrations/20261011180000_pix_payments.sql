alter table public.orders
  add column if not exists customer_name text,
  add column if not exists customer_email text,
  add column if not exists customer_phone text,
  add column if not exists customer_document text,
  add column if not exists checkout_attempt_id uuid,
  add column if not exists paid_at timestamptz;

create unique index if not exists orders_customer_attempt_uidx
on public.orders(customer_id, checkout_attempt_id)
where checkout_attempt_id is not null;

create table if not exists public.order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  batch_number integer not null check (batch_number > 0),
  batch_count integer not null check (batch_count > 0 and batch_number <= batch_count),
  amount_cents integer not null check (amount_cents > 0),
  provider text not null default 'blackcat' check (provider = 'blackcat'),
  provider_transaction_id text not null unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'refunded')),
  pix_copy_paste text,
  pix_qr_code_base64 text,
  invoice_url text,
  expires_at timestamptz,
  paid_at timestamptz,
  end_to_end_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, batch_number)
);

create index if not exists order_payments_order_idx on public.order_payments(order_id, batch_number);

drop trigger if exists order_payments_set_updated_at on public.order_payments;
create trigger order_payments_set_updated_at before update on public.order_payments
for each row execute procedure public.set_updated_at();

alter table public.order_payments enable row level security;

drop policy if exists "Customers can read own order payments" on public.order_payments;
create policy "Customers can read own order payments"
on public.order_payments for select
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_payments.order_id
      and orders.customer_id = (select auth.uid())
  )
);
