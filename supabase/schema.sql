-- MoriBox database schema for Supabase (Postgres).
-- Run once in: Supabase dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS.

-- ───────────────────────── Profiles ─────────────────────────
-- One row per auth user. Email lives in auth.users; the copy here is for
-- display and is kept in sync by the trigger below.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  email       text not null default '',
  phone       text not null default '',
  role        text not null default 'customer'
              check (role in ('customer','admin','warehouse','accountant')),
  created_at  timestamptz not null default now()
);

-- Emails that automatically become admin once they have a CONFIRMED address.
-- Only manageable from the SQL editor (RLS on, no client policies).
create table if not exists public.admin_emails (
  email text primary key check (email = lower(email)),
  role  text not null default 'admin' check (role in ('admin','warehouse','accountant'))
);
alter table public.admin_emails add column if not exists role text not null default 'admin'
  check (role in ('admin','warehouse','accountant'));
alter table public.admin_emails enable row level security;

-- Promotes the profile to admin if its email is allowlisted AND confirmed.
-- "Confirmed" matters: otherwise anyone could sign up with an allowlisted
-- address they don't own. (With "Confirm email" switched OFF in Supabase,
-- signup auto-confirms - fine for development, NOT for production.)
create or replace function public.apply_admin_allowlist(p_user_id uuid, p_email text, p_confirmed_at timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_confirmed_at is not null
     and exists (select 1 from public.admin_emails where email = lower(coalesce(p_email, ''))) then
    update public.profiles
       set role = (select a.role from public.admin_emails a where a.email = lower(coalesce(p_email, '')))
     where id = p_user_id;
  end if;
end;
$$;

alter table public.profiles add column if not exists phone text not null default '';

-- Migration for databases created before roles existed: is_admin -> role.
alter table public.profiles add column if not exists role text not null default 'customer'
  check (role in ('customer','admin','warehouse','accountant'));

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_admin') then
    update public.profiles set role = 'admin' where is_admin;
    alter table public.profiles drop column is_admin;
  end if;
end
$$;

-- Roles:  customer   - shopper (default)
--         admin      - everything, incl. managing users/roles
--         warehouse  - products & stock (create / edit / delete)
--         accountant - read-only access to orders & revenue
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Name comes from the email sign-up form; phone sign-ins have none
  -- (the app falls back to a generic label).
  insert into public.profiles (id, name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.email, ''),
    coalesce(new.phone, '')
  );
  perform public.apply_admin_allowlist(new.id, new.email, new.email_confirmed_at);
  return new;
end;
$$;

create or replace function public.handle_user_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.apply_admin_allowlist(new.id, new.email, new.email_confirmed_at);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.handle_user_confirmed();

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.sync_profile_email();

-- Role helpers used by every policy. SECURITY DEFINER so the check itself
-- isn't blocked by profiles' own RLS.
create or replace function public.user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'customer');
$$;

create or replace function public.has_role(roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_role() = any (roles);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_role() = 'admin';
$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Users may only change their display name — never role, email or id.
revoke update on public.profiles from authenticated, anon;
grant update (name) on public.profiles to authenticated;

-- ───────────────────────── Products ─────────────────────────
create table if not exists public.products (
  id              text primary key,
  name            text not null,
  grade           text not null check (grade in ('PG','MG','RG','HG','EG','SD','ACC')),
  scale           text not null default '',
  series          text not null default '',
  price           integer not null check (price >= 0),
  sale_price      integer check (sale_price >= 0),
  image           text not null default '',
  images          text[] not null default '{}',
  stock           integer not null default 0 check (stock >= 0),
  is_new          boolean not null default false,
  is_best_seller  boolean not null default false,
  specs           jsonb not null default '{}'::jsonb,
  description     text not null default '',
  created_at      timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists "products: public read" on public.products;
create policy "products: public read" on public.products
  for select using (true);

drop policy if exists "products: admin write" on public.products;
drop policy if exists "products: staff write" on public.products;
create policy "products: staff write" on public.products
  for all using (public.has_role(array['admin','warehouse']))
  with check (public.has_role(array['admin','warehouse']));

-- ───────────────────────── Orders ─────────────────────────
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  user_id         uuid references auth.users (id) on delete set null,  -- kept as a sales record if the account is deleted
  customer_name   text not null,
  customer_email  text not null,
  phone           text not null,
  address         text not null,
  sector          text not null default '',
  subtotal        integer not null check (subtotal >= 0),
  shipping_fee    integer not null check (shipping_fee >= 0),
  total           integer not null check (total >= 0),
  status          text not null default 'pending'
                  check (status in ('pending','confirmed','shipping','delivered','cancelled')),
  created_at      timestamptz not null default now()
);

create table if not exists public.order_items (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders (id) on delete cascade,
  product_id  text references public.products (id) on delete set null,
  name        text not null,
  grade       text not null,
  price       integer not null check (price >= 0),
  quantity    integer not null check (quantity > 0)
);

-- Payment tracking. cod/bank_transfer are live; the others are reserved for
-- gateways (MoMo, ZaloPay, VNPay, card) that are not connected yet.
alter table public.orders add column if not exists payment_method text not null default 'cod'
  check (payment_method in ('cod','bank_transfer','momo','zalopay','vnpay','card'));
alter table public.orders add column if not exists payment_status text not null default 'unpaid'
  check (payment_status in ('unpaid','paid','refunded'));
alter table public.orders add column if not exists paid_at timestamptz;
-- Set when a customer asks to cancel an order they already paid for.
alter table public.orders add column if not exists cancel_requested_at timestamptz;

create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
create index if not exists order_items_order_idx on public.order_items (order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- No insert policy on purpose: orders are created ONLY through place_order()
-- below, so clients can't invent prices or skip the stock check.
drop policy if exists "orders: read own or admin" on public.orders;
create policy "orders: read own or admin" on public.orders
  for select using (user_id = auth.uid() or public.has_role(array['admin','accountant']));

drop policy if exists "orders: admin update status" on public.orders;
create policy "orders: admin update status" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "order_items: read own or admin" on public.order_items;
create policy "order_items: read own or admin" on public.order_items
  for select using (
    public.has_role(array['admin','accountant'])
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- ───────────────────────── place_order() ─────────────────────────
-- p_items:    [{ "product_id": "rx-78-2", "quantity": 2 }, ...]
-- p_shipping: { "name": "...", "phone": "...", "address": "...", "sector": "..." }
-- Prices are read from the products table here — never trusted from the client.
-- Stock is locked, checked and decremented in the same transaction.
-- Signature changed (added p_payment_method), so drop the old overload first.
drop function if exists public.place_order(jsonb, jsonb);

create or replace function public.place_order(p_items jsonb, p_shipping jsonb, p_payment_method text default 'cod')
returns table (order_id uuid, order_code text, total integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_email     text;
  v_item      jsonb;
  v_prod      public.products%rowtype;
  v_qty       integer;
  v_unit      integer;
  v_subtotal  integer := 0;
  v_shipping  integer := 30000;
  v_order_id  uuid := gen_random_uuid();
  v_code      text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart';
  end if;
  if coalesce(trim(p_shipping ->> 'name'), '') = ''
     or coalesce(trim(p_shipping ->> 'phone'), '') = ''
     or coalesce(trim(p_shipping ->> 'address'), '') = '' then
    raise exception 'missing_shipping_info';
  end if;

  -- Only methods that work without a gateway can be chosen for now.
  if p_payment_method not in ('cod', 'bank_transfer') then
    raise exception 'invalid_payment_method';
  end if;

  select email into v_email from public.profiles where id = v_uid;
  v_code := 'MS-' || lpad((floor(random() * 900000) + 100000)::int::text, 6, '0');

  insert into public.orders
    (id, code, user_id, customer_name, customer_email, phone, address, sector, subtotal, shipping_fee, total, payment_method)
  values
    (v_order_id, v_code, v_uid, trim(p_shipping ->> 'name'), coalesce(v_email, ''),
     trim(p_shipping ->> 'phone'), trim(p_shipping ->> 'address'),
     coalesce(p_shipping ->> 'sector', ''), 0, v_shipping, 0, p_payment_method);

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::int;
    if v_qty is null or v_qty < 1 then
      raise exception 'invalid_quantity';
    end if;

    select * into v_prod from public.products where id = v_item ->> 'product_id' for update;
    if not found then
      raise exception 'product_not_found: %', v_item ->> 'product_id';
    end if;
    if v_prod.stock < v_qty then
      raise exception 'insufficient_stock: %', v_prod.name;
    end if;

    v_unit := coalesce(v_prod.sale_price, v_prod.price);
    v_subtotal := v_subtotal + v_unit * v_qty;

    update public.products set stock = stock - v_qty where id = v_prod.id;
    insert into public.order_items (order_id, product_id, name, grade, price, quantity)
    values (v_order_id, v_prod.id, v_prod.name, v_prod.grade, v_unit, v_qty);
  end loop;

  update public.orders set subtotal = v_subtotal, total = v_subtotal + v_shipping where id = v_order_id;

  return query select v_order_id, v_code, v_subtotal + v_shipping;
end;
$$;

revoke all on function public.place_order(jsonb, jsonb, text) from public, anon;
grant execute on function public.place_order(jsonb, jsonb, text) to authenticated;

-- ───────────────────────── Making yourself admin ─────────────────────────
-- After you have registered an account in the app, run this ONCE in the SQL
-- editor (replace the email). It can't be done from the website on purpose.
--
--   update public.profiles set role = 'admin' where email = 'you@example.com';

-- ───────────────────────── Delete my account ─────────────────────────
-- A browser can't delete auth users itself, so Settings → Security calls this.
-- Profile is removed by cascade; past orders stay as sales records (user_id → null).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if public.user_role() <> 'customer' then
    raise exception 'staff_cannot_delete';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ───────────────────────── Changing roles from the app ─────────────────────────
-- Used by the admin "Người dùng" page. Only an admin can call it, and you can't
-- change your own role (so the shop can never end up with zero admins by accident).
drop function if exists public.set_user_admin(uuid, boolean);

create or replace function public.set_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_role not in ('customer','admin','warehouse','accountant') then
    raise exception 'invalid_role';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'cannot_change_own_role';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
end;
$$;

revoke all on function public.set_user_role(uuid, text) from public, anon;
grant execute on function public.set_user_role(uuid, text) to authenticated;

-- ───────────────────────── Confirming payment ─────────────────────────
-- Admin and accountant mark an order paid (COD: after delivery; bank transfer:
-- once the money has arrived) or refunded. Done through this function so the
-- accountant can confirm payments without being able to edit anything else.
create or replace function public.set_order_payment(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(array['admin','accountant']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_status not in ('unpaid','paid','refunded') then
    raise exception 'invalid_status';
  end if;
  if p_status = 'paid' and exists (select 1 from public.orders where id = p_order_id and status = 'cancelled') then
    raise exception 'order_cancelled';
  end if;
  update public.orders
     set payment_status = p_status,
         paid_at = case when p_status = 'paid' then now() else null end
   where id = p_order_id;
end;
$$;

revoke all on function public.set_order_payment(uuid, text) from public, anon;
grant execute on function public.set_order_payment(uuid, text) to authenticated;

-- ───────────────────────── Cancelling an order ─────────────────────────
-- Returns 'cancelled' or 'requested'.
--   Customer, order still unpaid  -> cancelled at once, stock goes back.
--   Customer, order already paid  -> only records a cancel request; staff
--                                    cancel it and refund the money by hand.
--   Admin / accountant            -> cancel any order that has not shipped.
-- Refunds are NOT automatic (no payment gateway): after cancelling a paid order,
-- staff transfer the money back and mark it with set_order_payment(..., 'refunded').
create or replace function public.cancel_order(p_order_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order  public.orders%rowtype;
  v_staff  boolean := public.has_role(array['admin','accountant']);
  v_item   record;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found';
  end if;
  if not v_staff and v_order.user_id is distinct from auth.uid() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_order.status = 'cancelled' then
    return 'cancelled';
  end if;
  if v_order.status in ('shipping', 'delivered') then
    raise exception 'cannot_cancel_after_shipping';
  end if;
  if not v_staff and v_order.status <> 'pending' then
    raise exception 'cannot_cancel_confirmed';
  end if;

  if not v_staff and v_order.payment_status = 'paid' then
    update public.orders
       set cancel_requested_at = coalesce(cancel_requested_at, now())
     where id = p_order_id;
    return 'requested';
  end if;

  for v_item in
    select product_id, quantity from public.order_items
     where order_id = p_order_id and product_id is not null
  loop
    update public.products set stock = stock + v_item.quantity where id = v_item.product_id;
  end loop;

  update public.orders set status = 'cancelled' where id = p_order_id;
  return 'cancelled';
end;
$$;

revoke all on function public.cancel_order(uuid) from public, anon;
grant execute on function public.cancel_order(uuid) to authenticated;

-- ───────────────────────── Allowlist: how to use ─────────────────────────
-- 1) Add staff emails (lowercase) with a role - run separately, e.g.:
--      insert into public.admin_emails (email, role) values
--        ('boss@example.com',  'admin'),
--        ('kho@example.com',   'warehouse'),
--        ('ketoan@example.com','accountant')
--      on conflict (email) do update set role = excluded.role;
-- 2) Accounts registered AFTER that get the role automatically once confirmed.
--    The statement below back-fills accounts that already exist (safe to re-run;
--    it only upgrades plain customers, never overrides a role you set by hand):
update public.profiles p
   set role = a.role
  from public.admin_emails a, auth.users u
 where u.id = p.id
   and u.email_confirmed_at is not null
   and lower(p.email) = a.email
   and p.role = 'customer';
