-- =========================================================
-- Gestor de Inversiones — Schema inicial (MVP)
-- Ejecutar en el SQL editor de Supabase (o via `supabase db push`)
-- =========================================================

-- ---------- Enums ----------
create type user_role as enum ('ADMIN', 'MANAGER', 'VIEWER');
create type client_type as enum ('PROPIO', 'TERCERO');
create type operation_type as enum (
  'COMPRA', 'VENTA', 'DEPOSITO', 'RETIRO',
  'DIVIDENDO', 'INTERES', 'COMISION', 'OTRO'
);

-- ---------- Usuarios (extiende auth.users de Supabase) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role user_role not null default 'VIEWER',
  created_at timestamptz not null default now()
);

-- ---------- Clientes ----------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type client_type not null default 'TERCERO',
  email text,
  phone text,
  notes text,
  status text not null default 'ACTIVO', -- ACTIVO | INACTIVO
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Activos (catálogo) ----------
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  ticker text not null unique,
  name text,
  type text,        -- ACCION, CRIPTO, CAUCION, PLAZO_FIJO, CAPITAL, OTRO
  sector text,
  currency text not null default 'ARS',
  created_at timestamptz not null default now()
);

-- ---------- Operaciones ----------
create table public.operations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  asset_id uuid references public.assets(id) on delete restrict,
  date date not null,
  type operation_type not null,
  quantity numeric(18,6) not null default 0,
  price numeric(18,6) not null default 0,
  currency text not null default 'ARS',
  commission numeric(18,6) not null default 0,
  total numeric(18,6) not null default 0, -- (quantity*price) +/- commission según type
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_operations_client on public.operations(client_id);
create index idx_operations_asset on public.operations(asset_id);
create index idx_operations_date on public.operations(date);

-- ---------- Cotizaciones (para integrar API de mercado a futuro) ----------
create table public.price_snapshots (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  date date not null,
  price numeric(18,6) not null,
  source text default 'manual',
  created_at timestamptz not null default now(),
  unique(asset_id, date)
);

-- =========================================================
-- Regla: no vender más cantidad de la disponible
-- =========================================================
create or replace function public.check_sell_quantity()
returns trigger as $$
declare
  available numeric;
begin
  if new.type = 'VENTA' then
    select coalesce(sum(
      case when o.type = 'COMPRA' then o.quantity
           when o.type = 'VENTA' then -o.quantity
           else 0 end
    ), 0)
    into available
    from public.operations o
    where o.client_id = new.client_id
      and o.asset_id = new.asset_id
      and o.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000');

    if new.quantity > available then
      raise exception 'No se puede vender % unidades: solo hay % disponibles para este cliente/activo', new.quantity, available;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_check_sell_quantity
before insert or update on public.operations
for each row execute function public.check_sell_quantity();

-- =========================================================
-- Vistas calculadas (reemplazan los bloques manuales del Sheet)
-- =========================================================

-- Posiciones actuales por cliente + activo
create or replace view public.v_positions as
select
  o.client_id,
  o.asset_id,
  a.ticker,
  a.name as asset_name,
  a.currency,
  sum(case when o.type = 'COMPRA' then o.quantity
           when o.type = 'VENTA' then -o.quantity
           else 0 end) as quantity,
  case when sum(case when o.type = 'COMPRA' then o.quantity else 0 end) > 0 then
    sum(case when o.type = 'COMPRA' then o.quantity * o.price else 0 end)
    / nullif(sum(case when o.type = 'COMPRA' then o.quantity else 0 end), 0)
  else 0 end as avg_price
from public.operations o
join public.assets a on a.id = o.asset_id
where o.type in ('COMPRA', 'VENTA')
group by o.client_id, o.asset_id, a.ticker, a.name, a.currency;

-- Resumen por cliente: capital aportado, retiros, ganancia/pérdida, rendimiento
create or replace view public.v_client_summary as
select
  c.id as client_id,
  c.name,
  c.type,
  coalesce(sum(case when o.type = 'DEPOSITO' then o.total else 0 end), 0) as capital_aportado,
  coalesce(sum(case when o.type = 'RETIRO' then o.total else 0 end), 0) as retiros,
  coalesce(sum(case when o.type in ('DIVIDENDO','INTERES') then o.total else 0 end), 0) as ingresos_pasivos,
  coalesce(sum(case when o.type = 'COMISION' then o.total else 0 end), 0) as comisiones_pagadas,
  coalesce(sum(case when o.type = 'VENTA' then (o.quantity*o.price - o.commission) 
                     when o.type = 'COMPRA' then -(o.quantity*o.price + o.commission)
                     else 0 end), 0) as resultado_trading
from public.clients c
left join public.operations o on o.client_id = c.id
group by c.id, c.name, c.type;

-- Resultado por activo (todos los clientes)
create or replace view public.v_result_by_asset as
select
  a.id as asset_id,
  a.ticker,
  coalesce(sum(case when o.type = 'VENTA' then (o.quantity*o.price - o.commission)
                     when o.type = 'COMPRA' then -(o.quantity*o.price + o.commission)
                     else 0 end), 0) as resultado
from public.assets a
left join public.operations o on o.asset_id = a.id
group by a.id, a.ticker;

-- =========================================================
-- Row Level Security
-- =========================================================
alter table public.clients enable row level security;
alter table public.assets enable row level security;
alter table public.operations enable row level security;
alter table public.price_snapshots enable row level security;
alter table public.profiles enable row level security;

-- Cualquier usuario autenticado con perfil puede leer
create policy "read_authenticated" on public.clients for select using (auth.role() = 'authenticated');
create policy "read_authenticated" on public.assets for select using (auth.role() = 'authenticated');
create policy "read_authenticated" on public.operations for select using (auth.role() = 'authenticated');
create policy "read_authenticated" on public.price_snapshots for select using (auth.role() = 'authenticated');
create policy "read_own_profile" on public.profiles for select using (auth.uid() = id);

-- Solo ADMIN/MANAGER pueden escribir (se valida vía función helper)
create or replace function public.current_role() returns user_role as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer;

create policy "write_manager_admin_clients" on public.clients for all
  using (public.current_role() in ('ADMIN','MANAGER'))
  with check (public.current_role() in ('ADMIN','MANAGER'));

create policy "write_manager_admin_operations" on public.operations for all
  using (public.current_role() in ('ADMIN','MANAGER'))
  with check (public.current_role() in ('ADMIN','MANAGER'));

create policy "write_admin_assets" on public.assets for all
  using (public.current_role() = 'ADMIN')
  with check (public.current_role() = 'ADMIN');
