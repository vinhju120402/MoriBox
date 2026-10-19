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
-- Staff can lock an account: it can no longer order and is signed out by the app.
alter table public.profiles add column if not exists disabled boolean not null default false;

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
-- Effective role. A disabled account is treated as a plain customer. A staff
-- account that has two-factor authentication set up only keeps its role while the
-- session is at AAL2 (i.e. the one-time code was entered) - enforced here so it
-- also holds against anyone calling the API directly.
create or replace function public.user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case
      when p.disabled then 'customer'
      when p.role <> 'customer'
           and exists (select 1 from auth.mfa_factors f where f.user_id = p.id and f.status = 'verified')
           and coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' then 'customer'
      else p.role
    end
    from public.profiles p where p.id = auth.uid()
  ), 'customer');
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
alter table public.orders add column if not exists discount integer not null default 0 check (discount >= 0);
alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists status_updated_at timestamptz;
-- Filled in by staff when they pay a refund back (transaction code, receiving account...).
alter table public.orders add column if not exists refund_note text;
alter table public.orders add column if not exists refunded_at timestamptz;

-- Unit cost snapshot (for profit). Customers can never read this column: see the
-- column grants below, and the admin/accountant read profit through get_profit().
alter table public.order_items add column if not exists cost integer not null default 0 check (cost >= 0);

-- Per-product low-stock alert level (default 5).
alter table public.products add column if not exists low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0);

create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
create index if not exists order_items_order_idx on public.order_items (order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Hide the cost column from API clients (RLS is row-level only, so use column grants).
revoke select on public.order_items from anon, authenticated;
grant select (id, order_id, product_id, name, grade, price, quantity) on public.order_items to authenticated;

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

-- ───────────────────────── Audit log ─────────────────────────
create table if not exists public.audit_log (
  id           bigint generated always as identity primary key,
  at           timestamptz not null default now(),
  actor_id     uuid,
  actor_email  text,
  actor_role   text,
  action       text not null,
  target_type  text,
  target_id    text,
  detail       jsonb not null default '{}'::jsonb
);
create index if not exists audit_log_at_idx on public.audit_log (at desc);
alter table public.audit_log enable row level security;

drop policy if exists "audit_log: admin read" on public.audit_log;
create policy "audit_log: admin read" on public.audit_log for select using (public.is_admin());
-- No write policies: rows are only added by the functions/triggers below.

create or replace function public.write_audit(p_action text, p_target_type text, p_target_id text, p_detail jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_role  text;
begin
  select email, role into v_email, v_role from public.profiles where id = auth.uid();
  insert into public.audit_log (actor_id, actor_email, actor_role, action, target_type, target_id, detail)
  values (auth.uid(), v_email, v_role, p_action, p_target_type, p_target_id, coalesce(p_detail, '{}'::jsonb));
end;
$$;
revoke all on function public.write_audit(text, text, text, jsonb) from public, anon, authenticated;

-- {field: {from, to}} for every key that differs between two rows.
create or replace function public.jsonb_changes(p_old jsonb, p_new jsonb, p_ignore text[] default '{}')
returns jsonb
language sql
immutable
as $$
  select coalesce(jsonb_object_agg(k, jsonb_build_object('from', p_old -> k, 'to', p_new -> k)), '{}'::jsonb)
  from jsonb_object_keys(p_new) as k
  where (p_old -> k) is distinct from (p_new -> k) and not (k = any (p_ignore));
$$;

-- Manual edits of products by staff. Automatic stock changes (sales, cancellations,
-- goods received) are recorded in stock_movements instead.
create or replace function public.audit_products()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changes jsonb;
begin
  if auth.uid() is null or not public.has_role(array['admin','warehouse']) then
    return null;
  end if;
  if tg_op = 'INSERT' then
    perform public.write_audit('product.create', 'product', new.id, jsonb_build_object('name', new.name));
  elsif tg_op = 'DELETE' then
    perform public.write_audit('product.delete', 'product', old.id, jsonb_build_object('name', old.name));
  else
    if coalesce(current_setting('app.stock_reason', true), '') <> '' then
      return null;
    end if;
    v_changes := public.jsonb_changes(to_jsonb(old), to_jsonb(new), array['image','images','specs','description','created_at']);
    if v_changes <> '{}'::jsonb then
      perform public.write_audit('product.update', 'product', new.id, jsonb_build_object('name', new.name, 'changes', v_changes));
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists products_audit on public.products;
create trigger products_audit
  after insert or update or delete on public.products
  for each row execute function public.audit_products();

-- Generic audit for admin-only tables (coupons, shop settings).
create or replace function public.audit_generic()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row     jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_changes jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    return null;
  end if;
  if tg_op = 'UPDATE' then
    v_changes := public.jsonb_changes(to_jsonb(old), to_jsonb(new), array['updated_at','used_count']);
    if v_changes = '{}'::jsonb then
      return null;
    end if;
    perform public.write_audit(tg_table_name || '.update', tg_table_name, coalesce(v_row ->> 'code', v_row ->> 'id'), jsonb_build_object('changes', v_changes));
  else
    perform public.write_audit(tg_table_name || '.' || lower(tg_op), tg_table_name, coalesce(v_row ->> 'code', v_row ->> 'id'), v_row);
  end if;
  return null;
end;
$$;

-- ───────────────────────── Stock movements ─────────────────────────
-- Every change of products.stock is recorded here (sale, cancel, receive, adjust).
create table if not exists public.stock_movements (
  id           bigint generated always as identity primary key,
  at           timestamptz not null default now(),
  product_id   text not null references public.products (id) on delete cascade,
  delta        integer not null,
  stock_after  integer not null,
  reason       text not null,
  note         text,
  order_id     uuid,
  actor_id     uuid
);
create index if not exists stock_movements_product_idx on public.stock_movements (product_id, at desc);
alter table public.stock_movements enable row level security;

drop policy if exists "stock_movements: staff read" on public.stock_movements;
create policy "stock_movements: staff read" on public.stock_movements
  for select using (public.has_role(array['admin','warehouse']));

create or replace function public.log_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := coalesce(nullif(current_setting('app.stock_reason', true), ''), 'adjust');
begin
  if tg_op = 'INSERT' then
    if new.stock <> 0 then
      insert into public.stock_movements (product_id, delta, stock_after, reason, actor_id)
      values (new.id, new.stock, new.stock, 'initial', auth.uid());
    end if;
  elsif new.stock is distinct from old.stock then
    insert into public.stock_movements (product_id, delta, stock_after, reason, note, order_id, actor_id)
    values (
      new.id, new.stock - old.stock, new.stock, v_reason,
      nullif(current_setting('app.stock_note', true), ''),
      nullif(current_setting('app.order_id', true), '')::uuid,
      auth.uid()
    );
  end if;
  return null;
end;
$$;

drop trigger if exists products_stock_log on public.products;
create trigger products_stock_log
  after insert or update of stock on public.products
  for each row execute function public.log_stock_movement();

-- Goods received into the warehouse (a "phiếu nhập"): adds to stock and records why.
create or replace function public.receive_stock(p_product_id text, p_qty integer, p_note text default '')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock integer;
begin
  if not public.has_role(array['admin','warehouse']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_qty is null or p_qty < 1 then
    raise exception 'invalid_quantity';
  end if;
  perform set_config('app.stock_reason', 'receive', true);
  perform set_config('app.stock_note', coalesce(p_note, ''), true);
  update public.products set stock = stock + p_qty where id = p_product_id returning stock into v_stock;
  if not found then
    raise exception 'product_not_found';
  end if;
  perform set_config('app.stock_reason', '', true);
  perform set_config('app.stock_note', '', true);
  return v_stock;
end;
$$;
revoke all on function public.receive_stock(text, integer, text) from public, anon;
grant execute on function public.receive_stock(text, integer, text) to authenticated;

-- ───────────────────────── Product costs (staff only) ─────────────────────────
-- Kept out of `products` because that table is publicly readable.
create table if not exists public.product_costs (
  product_id  text primary key references public.products (id) on delete cascade,
  cost_price  integer not null default 0 check (cost_price >= 0)
);
alter table public.product_costs enable row level security;

drop policy if exists "product_costs: staff read" on public.product_costs;
create policy "product_costs: staff read" on public.product_costs
  for select using (public.has_role(array['admin','warehouse','accountant']));
drop policy if exists "product_costs: staff write" on public.product_costs;
create policy "product_costs: staff write" on public.product_costs
  for all using (public.has_role(array['admin','warehouse']))
  with check (public.has_role(array['admin','warehouse']));

-- ───────────────────────── Shop settings (one row) ─────────────────────────
create table if not exists public.shop_settings (
  id                 boolean primary key default true check (id),
  shop_name          text not null default 'MoriBox',
  shipping_fee       integer not null default 30000 check (shipping_fee >= 0),
  bank_bin           text not null default '',
  bank_account       text not null default '',
  bank_account_name  text not null default '',
  bank_name          text not null default '',
  updated_at         timestamptz not null default now()
);
insert into public.shop_settings (id) values (true) on conflict (id) do nothing;
alter table public.shop_settings enable row level security;

-- Public read: checkout needs the shipping fee and the bank details to show the QR.
drop policy if exists "shop_settings: public read" on public.shop_settings;
create policy "shop_settings: public read" on public.shop_settings for select using (true);
drop policy if exists "shop_settings: admin update" on public.shop_settings;
create policy "shop_settings: admin update" on public.shop_settings
  for update using (public.is_admin()) with check (public.is_admin());

drop trigger if exists shop_settings_audit on public.shop_settings;
create trigger shop_settings_audit
  after update on public.shop_settings
  for each row execute function public.audit_generic();

-- ───────────────────────── Coupons ─────────────────────────
create table if not exists public.coupons (
  code          text primary key check (code = upper(code) and length(code) between 3 and 30),
  kind          text not null check (kind in ('percent','fixed')),
  value         integer not null check (value > 0),
  min_order     integer not null default 0 check (min_order >= 0),
  max_discount  integer check (max_discount > 0),
  starts_at     timestamptz,
  ends_at       timestamptz,
  usage_limit   integer check (usage_limit > 0),
  used_count    integer not null default 0 check (used_count >= 0),
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  constraint coupons_percent_range check (kind <> 'percent' or value <= 100)
);
alter table public.coupons enable row level security;

-- Admin-only: customers validate codes through preview_coupon()/place_order().
drop policy if exists "coupons: admin all" on public.coupons;
create policy "coupons: admin all" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

drop trigger if exists coupons_audit on public.coupons;
create trigger coupons_audit
  after insert or update or delete on public.coupons
  for each row execute function public.audit_generic();

-- Discount for a code on a subtotal, or an error code the app turns into a message.
create or replace function public.compute_coupon_discount(p_code text, p_subtotal integer)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v public.coupons%rowtype;
  d integer;
begin
  select * into v from public.coupons where code = upper(trim(coalesce(p_code, '')));
  if not found or not v.active then
    raise exception 'coupon_invalid';
  end if;
  if v.starts_at is not null and now() < v.starts_at then
    raise exception 'coupon_not_started';
  end if;
  if v.ends_at is not null and now() > v.ends_at then
    raise exception 'coupon_expired';
  end if;
  if v.usage_limit is not null and v.used_count >= v.usage_limit then
    raise exception 'coupon_exhausted';
  end if;
  if p_subtotal < v.min_order then
    raise exception 'coupon_min_order: %', v.min_order;
  end if;
  d := case v.kind when 'percent' then floor(p_subtotal * v.value / 100.0)::integer else v.value end;
  if v.max_discount is not null then
    d := least(d, v.max_discount);
  end if;
  return least(d, p_subtotal);
end;
$$;
revoke all on function public.compute_coupon_discount(text, integer) from public, anon, authenticated;

-- What the cart shows before ordering. Subtotal is recomputed from real prices.
create or replace function public.preview_coupon(p_code text, p_items jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_item     jsonb;
  v_prod     public.products%rowtype;
  v_subtotal integer := 0;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_prod from public.products where id = v_item ->> 'product_id';
    if found then
      v_subtotal := v_subtotal + coalesce(v_prod.sale_price, v_prod.price) * greatest((v_item ->> 'quantity')::int, 0);
    end if;
  end loop;
  return jsonb_build_object('subtotal', v_subtotal, 'discount', public.compute_coupon_discount(p_code, v_subtotal));
end;
$$;
revoke all on function public.preview_coupon(text, jsonb) from public, anon;
grant execute on function public.preview_coupon(text, jsonb) to authenticated;

-- ───────────────────────── place_order() ─────────────────────────
-- p_items:    [{ "product_id": "rx-78-2", "quantity": 2 }, ...]
-- p_shipping: { "name": "...", "phone": "...", "address": "...", "sector": "..." }
-- Prices are read from the products table here — never trusted from the client.
-- Stock is locked, checked and decremented in the same transaction.
-- Signature changed again (added p_coupon), so drop the old overloads first.
drop function if exists public.place_order(jsonb, jsonb);
drop function if exists public.place_order(jsonb, jsonb, text);

create or replace function public.place_order(
  p_items jsonb,
  p_shipping jsonb,
  p_payment_method text default 'cod',
  p_coupon text default null
)
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
  v_cost      integer;
  v_subtotal  integer := 0;
  v_discount  integer := 0;
  v_shipping  integer;
  v_order_id  uuid := gen_random_uuid();
  v_code      text;
  v_coupon    text := upper(trim(coalesce(p_coupon, '')));
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if exists (select 1 from public.profiles where id = v_uid and disabled) then
    raise exception 'account_disabled';
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

  select shipping_fee into v_shipping from public.shop_settings where id;
  v_shipping := coalesce(v_shipping, 30000);

  select email into v_email from public.profiles where id = v_uid;
  v_code := 'MS-' || lpad((floor(random() * 900000) + 100000)::int::text, 6, '0');

  insert into public.orders
    (id, code, user_id, customer_name, customer_email, phone, address, sector, subtotal, shipping_fee, total, payment_method)
  values
    (v_order_id, v_code, v_uid, trim(p_shipping ->> 'name'), coalesce(v_email, ''),
     trim(p_shipping ->> 'phone'), trim(p_shipping ->> 'address'),
     coalesce(p_shipping ->> 'sector', ''), 0, v_shipping, 0, p_payment_method);

  -- Tag the stock changes below so stock_movements records them as a sale.
  perform set_config('app.stock_reason', 'sale', true);
  perform set_config('app.order_id', v_order_id::text, true);

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
    select coalesce(c.cost_price, 0) into v_cost from public.product_costs c where c.product_id = v_prod.id;
    v_cost := coalesce(v_cost, 0);

    update public.products set stock = stock - v_qty where id = v_prod.id;
    insert into public.order_items (order_id, product_id, name, grade, price, quantity, cost)
    values (v_order_id, v_prod.id, v_prod.name, v_prod.grade, v_unit, v_qty, v_cost);
  end loop;

  perform set_config('app.stock_reason', '', true);
  perform set_config('app.order_id', '', true);

  if v_coupon <> '' then
    v_discount := public.compute_coupon_discount(v_coupon, v_subtotal);
    update public.coupons set used_count = used_count + 1
     where code = v_coupon and (usage_limit is null or used_count < usage_limit);
    if not found then
      raise exception 'coupon_exhausted';
    end if;
  end if;

  update public.orders
     set subtotal = v_subtotal,
         discount = v_discount,
         coupon_code = nullif(v_coupon, ''),
         total = v_subtotal - v_discount + v_shipping
   where id = v_order_id;

  return query select v_order_id, v_code, v_subtotal - v_discount + v_shipping;
end;
$$;

revoke all on function public.place_order(jsonb, jsonb, text, text) from public, anon;
grant execute on function public.place_order(jsonb, jsonb, text, text) to authenticated;

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
  perform public.write_audit('user.role', 'user', p_user_id::text, jsonb_build_object('role', p_role));
end;
$$;

revoke all on function public.set_user_role(uuid, text) from public, anon;
grant execute on function public.set_user_role(uuid, text) to authenticated;

-- ───────────────────────── Confirming payment ─────────────────────────
-- Admin and accountant mark an order paid (COD: after delivery; bank transfer:
-- once the money has arrived) or refunded. Done through this function so the
-- accountant can confirm payments without being able to edit anything else.
-- Signature changed (added p_note), so drop the old overload first.
drop function if exists public.set_order_payment(uuid, text);

create or replace function public.set_order_payment(p_order_id uuid, p_status text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note text := nullif(trim(coalesce(p_note, '')), '');
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
         paid_at = case when p_status = 'paid' then now() else null end,
         refund_note = case when p_status = 'refunded' then v_note else null end,
         refunded_at = case when p_status = 'refunded' then now() else null end
   where id = p_order_id;
  perform public.write_audit('order.payment', 'order', p_order_id::text,
    jsonb_build_object('status', p_status, 'note', v_note));
end;
$$;

revoke all on function public.set_order_payment(uuid, text, text) from public, anon;
grant execute on function public.set_order_payment(uuid, text, text) to authenticated;

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
    perform public.write_audit('order.cancel_request', 'order', p_order_id::text, jsonb_build_object('code', v_order.code));
    return 'requested';
  end if;

  perform set_config('app.stock_reason', 'cancel', true);
  perform set_config('app.order_id', p_order_id::text, true);
  for v_item in
    select product_id, quantity from public.order_items
     where order_id = p_order_id and product_id is not null
  loop
    update public.products set stock = stock + v_item.quantity where id = v_item.product_id;
  end loop;
  perform set_config('app.stock_reason', '', true);
  perform set_config('app.order_id', '', true);

  -- A cancelled order gives its coupon use back.
  if v_order.coupon_code is not null then
    update public.coupons set used_count = greatest(used_count - 1, 0) where code = v_order.coupon_code;
  end if;

  update public.orders set status = 'cancelled' where id = p_order_id;
  perform public.write_audit('order.cancel', 'order', p_order_id::text, jsonb_build_object('code', v_order.code, 'by_staff', v_staff));
  return 'cancelled';
end;
$$;

revoke all on function public.cancel_order(uuid) from public, anon;
grant execute on function public.cancel_order(uuid) to authenticated;

-- ───────────────────────── Order fulfilment ─────────────────────────
-- pending -> confirmed (packed)   : admin, warehouse   (not before payment, unless COD)
-- confirmed -> shipping (handed over): admin, warehouse
-- shipping -> delivered           : admin, accountant
create or replace function public.set_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_role  text := public.user_role();
begin
  if v_role not in ('admin', 'warehouse', 'accountant') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found';
  end if;
  if v_order.status = 'cancelled' then
    raise exception 'order_cancelled';
  end if;
  if not (
       (v_order.status = 'pending'   and p_status = 'confirmed' and v_role in ('admin', 'warehouse'))
    or (v_order.status = 'confirmed' and p_status = 'shipping'  and v_role in ('admin', 'warehouse'))
    or (v_order.status = 'shipping'  and p_status = 'delivered' and v_role in ('admin', 'accountant'))
  ) then
    raise exception 'invalid_transition';
  end if;
  if p_status = 'confirmed' and v_order.payment_method <> 'cod' and v_order.payment_status <> 'paid' then
    raise exception 'awaiting_payment';
  end if;

  update public.orders set status = p_status, status_updated_at = now() where id = p_order_id;
  perform public.write_audit('order.status', 'order', p_order_id::text,
    jsonb_build_object('code', v_order.code, 'from', v_order.status, 'to', p_status));
end;
$$;
revoke all on function public.set_order_status(uuid, text) from public, anon;
grant execute on function public.set_order_status(uuid, text) to authenticated;

-- What the warehouse needs to pick and pack: items + where to ship, NO prices.
create or replace function public.get_packing_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_role(array['admin', 'warehouse']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(t) order by t.created_at)
    from (
      select o.id, o.code, o.status, o.created_at, o.customer_name, o.phone, o.address, o.sector,
             o.payment_method, o.payment_status,
             (select coalesce(jsonb_agg(jsonb_build_object('product_id', i.product_id, 'name', i.name, 'quantity', i.quantity) order by i.id), '[]'::jsonb)
                from public.order_items i where i.order_id = o.id) as items
        from public.orders o
       where o.status in ('pending', 'confirmed', 'shipping')
       order by o.created_at
       limit 200
    ) t
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.get_packing_list() from public, anon;
grant execute on function public.get_packing_list() to authenticated;

-- ───────────────────────── Accounts & staff ─────────────────────────
create or replace function public.set_user_disabled(p_user_id uuid, p_disabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'cannot_disable_self';
  end if;
  update public.profiles set disabled = p_disabled where id = p_user_id;
  perform public.write_audit('user.disabled', 'user', p_user_id::text, jsonb_build_object('disabled', p_disabled));
end;
$$;
revoke all on function public.set_user_disabled(uuid, boolean) from public, anon;
grant execute on function public.set_user_disabled(uuid, boolean) to authenticated;

create or replace function public.list_staff_emails()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('email', a.email, 'role', a.role) order by a.email) from public.admin_emails a), '[]'::jsonb);
end;
$$;
revoke all on function public.list_staff_emails() from public, anon;
grant execute on function public.list_staff_emails() to authenticated;

create or replace function public.set_staff_email(p_email text, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_email !~ '^\S+@\S+\.\S+$' then
    raise exception 'invalid_email';
  end if;
  if p_role not in ('admin', 'warehouse', 'accountant') then
    raise exception 'invalid_role';
  end if;
  insert into public.admin_emails (email, role) values (v_email, p_role)
  on conflict (email) do update set role = excluded.role;
  -- Apply right away to an existing confirmed customer account with this email.
  update public.profiles p set role = p_role
   where lower(p.email) = v_email and p.role = 'customer'
     and exists (select 1 from auth.users u where u.id = p.id and u.email_confirmed_at is not null);
  perform public.write_audit('staff_email.set', 'staff_email', v_email, jsonb_build_object('role', p_role));
end;
$$;
revoke all on function public.set_staff_email(text, text) from public, anon;
grant execute on function public.set_staff_email(text, text) to authenticated;

create or replace function public.remove_staff_email(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from public.admin_emails where email = lower(trim(coalesce(p_email, '')));
  perform public.write_audit('staff_email.remove', 'staff_email', lower(trim(coalesce(p_email, ''))), '{}'::jsonb);
end;
$$;
revoke all on function public.remove_staff_email(text) from public, anon;
grant execute on function public.remove_staff_email(text) to authenticated;

-- ───────────────────────── Profit report ─────────────────────────
-- Gross profit of PAID, non-cancelled orders in [p_from, p_to). Cost prices stay
-- on the server; the app only ever receives these totals.
create or replace function public.get_profit(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_items_revenue bigint;
  v_cogs          bigint;
  v_discounts     bigint;
begin
  if not public.has_role(array['admin', 'accountant']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select coalesce(sum(i.price * i.quantity), 0), coalesce(sum(i.cost * i.quantity), 0)
    into v_items_revenue, v_cogs
    from public.order_items i
    join public.orders o on o.id = i.order_id
   where o.status <> 'cancelled' and o.payment_status = 'paid'
     and o.created_at >= p_from and o.created_at < p_to;
  select coalesce(sum(o.discount), 0) into v_discounts
    from public.orders o
   where o.status <> 'cancelled' and o.payment_status = 'paid'
     and o.created_at >= p_from and o.created_at < p_to;
  return jsonb_build_object('items_revenue', v_items_revenue, 'discounts', v_discounts, 'cogs', v_cogs);
end;
$$;
revoke all on function public.get_profit(timestamptz, timestamptz) from public, anon;
grant execute on function public.get_profit(timestamptz, timestamptz) to authenticated;

-- ───────────────────────── Product images (Storage) ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

drop policy if exists "product images: public read" on storage.objects;
create policy "product images: public read" on storage.objects
  for select using (bucket_id = 'product-images');
drop policy if exists "product images: staff insert" on storage.objects;
create policy "product images: staff insert" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.has_role(array['admin', 'warehouse']));
drop policy if exists "product images: staff update" on storage.objects;
create policy "product images: staff update" on storage.objects
  for update using (bucket_id = 'product-images' and public.has_role(array['admin', 'warehouse']));
drop policy if exists "product images: staff delete" on storage.objects;
create policy "product images: staff delete" on storage.objects
  for delete using (bucket_id = 'product-images' and public.has_role(array['admin', 'warehouse']));

-- ───────────────────────── Realtime: new orders reach staff instantly ─────────────────────────
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
end
$$;

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
