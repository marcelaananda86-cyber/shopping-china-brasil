alter table public.orders
  add column if not exists confirmation_email_status text not null default 'pending'
    check (confirmation_email_status in ('pending', 'sending', 'sent', 'failed')),
  add column if not exists confirmation_email_attempts integer not null default 0
    check (confirmation_email_attempts >= 0),
  add column if not exists confirmation_email_claimed_at timestamptz,
  add column if not exists confirmation_email_sent_at timestamptz,
  add column if not exists confirmation_email_message_id text,
  add column if not exists confirmation_email_error text;

-- Pedidos concluídos antes desta integração não devem disparar mensagens
-- retroativas (inclusive pedidos usados durante os testes do checkout).
update public.orders
set confirmation_email_status = 'sent',
    confirmation_email_sent_at = coalesce(paid_at, updated_at),
    confirmation_email_message_id = 'legacy-order'
where status in ('paid', 'processing', 'shipped', 'delivered')
  and confirmation_email_sent_at is null;

create or replace function public.claim_order_confirmation_email(p_order_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed boolean := false;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'insufficient_privilege';
  end if;

  update public.orders
  set confirmation_email_status = 'sending',
      confirmation_email_attempts = confirmation_email_attempts + 1,
      confirmation_email_claimed_at = now(),
      confirmation_email_error = null
  where id = p_order_id
    and status = 'paid'
    and confirmation_email_sent_at is null
    and (
      confirmation_email_status in ('pending', 'failed')
      or (
        confirmation_email_status = 'sending'
        and confirmation_email_claimed_at < now() - interval '10 minutes'
      )
    )
  returning true into claimed;

  return coalesce(claimed, false);
end;
$$;

revoke all on function public.claim_order_confirmation_email(text) from public, anon, authenticated;
grant execute on function public.claim_order_confirmation_email(text) to service_role;
