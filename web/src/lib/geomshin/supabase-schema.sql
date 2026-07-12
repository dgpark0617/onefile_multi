-- 검신 멀티플레이용 Supabase 스키마
-- Supabase SQL Editor에서 한 번 실행

create table if not exists geomshin_users (
  id text primary key,
  slot integer not null unique,
  display_name text not null,
  ink integer not null default 12,
  last_ink_at_ms bigint not null,
  seeded boolean not null default false,
  blocked boolean not null default false,
  brush_color integer not null default 2278750,
  home_x integer not null default -1,
  home_y integer not null default -1,
  onsite boolean not null default false,
  last_geo_at_ms bigint not null default 0,
  geo_x integer not null default -1,
  geo_y integer not null default -1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 희소 픽셀 (소유된 칸만). LWW 덮어쓰기 위해 owner_slot FK 없음
create table if not exists geomshin_pixels (
  i integer primary key check (i >= 0 and i < 250000),
  x integer not null,
  y integer not null,
  owner_slot integer not null,
  color integer not null,
  lock_until_ms bigint not null default 0,
  has_ad boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists geomshin_pixels_owner on geomshin_pixels(owner_slot);
create index if not exists geomshin_pixels_xy on geomshin_pixels(x, y);

create table if not exists geomshin_meta (
  key text primary key,
  value bigint not null
);

insert into geomshin_meta(key, value) values ('next_slot', 1)
  on conflict (key) do nothing;

-- 원자적 슬롯 발급: 현재 값을 쓰고 +1
create or replace function geomshin_alloc_slot()
returns integer
language plpgsql
as $$
declare
  n bigint;
begin
  update geomshin_meta
  set value = value + 1
  where key = 'next_slot'
  returning value - 1 into n;
  if n is null then
    insert into geomshin_meta(key, value) values ('next_slot', 2)
    on conflict (key) do update set value = geomshin_meta.value + 1
    returning value - 1 into n;
  end if;
  return n::integer;
end;
$$;

-- Realtime: 변경된 픽셀만 브로드캐스트 (다른 클라 즉시 반영)
alter table geomshin_pixels replica identity full;

do $$
begin
  alter publication supabase_realtime add table geomshin_pixels;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

alter table geomshin_pixels enable row level security;

drop policy if exists geomshin_pixels_select_authenticated on geomshin_pixels;
create policy geomshin_pixels_select_authenticated
  on geomshin_pixels
  for select
  to authenticated
  using (true);

-- API는 service_role 로 쓰므로 INSERT/UPDATE/DELETE 정책 불필요

