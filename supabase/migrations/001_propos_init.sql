-- ProPos — Supabase ilk şema (25 Kasım 2026)
-- Çalıştırma: Supabase panel → SQL Editor → bu dosyanın tamamını yapıştırıp Run. Tekrar çalıştırmak güvenlidir (idempotent).
-- Güvenlik modeli: tüm tablolarda RLS AÇIK ve hiçbir politika YOK; anon/authenticated roller hiçbir şeye erişemez.
-- Yalnızca sunucu (PHP, secret/service_role anahtarı) okuyup yazar. İstemci veriyi PHP'den alır; Realtime yalnızca "değişti" sinyali taşır.

create table if not exists public.propos_tenant_state (
  tenant_id  text primary key check (tenant_id ~ '^[A-Z0-9_-]{1,40}$'),
  rev        bigint not null default 0,
  updated_by text   not null default '',
  data       jsonb  not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Bayi/işletme kayıt listesi: tek satır (id = 1).
create table if not exists public.propos_registry (
  id         smallint primary key default 1 check (id = 1),
  data       jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.propos_tenant_state enable row level security;
alter table public.propos_registry     enable row level security;
revoke all on public.propos_tenant_state from anon, authenticated;
revoke all on public.propos_registry     from anon, authenticated;

-- Yeni Supabase projelerinde service_role'e otomatik yetki verilmeyebilir: açıkça ver (yalnızca sunucu bu rolü kullanır).
grant usage on schema public to service_role;
grant select, insert, update, delete on public.propos_tenant_state to service_role;
grant select, insert, update, delete on public.propos_registry     to service_role;

-- Keepalive: projenin duraklatılmaması için günlük çağrılır. Hiçbir veri döndürmez (sabit 1).
create or replace function public.propos_keepalive() returns integer
language sql stable security definer set search_path = public as $$ select 1 $$;
revoke all on function public.propos_keepalive() from public, anon, authenticated;
grant execute on function public.propos_keepalive() to service_role;
