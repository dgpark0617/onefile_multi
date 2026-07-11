-- 검신 멀티플레이용 Supabase 스키마 초안 (아직 연결 전)
-- 사용 시점: Vercel 배포 후 보드/유저가 인스턴스 간에 공유되어야 할 때

-- 시민 (아이디 = PK, 비밀번호 없음 단계)
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

-- 픽셀 (500×500 → i = y*500+x). 희소 저장: 소유된 칸만
create table if not exists geomshin_pixels (
  i integer primary key check (i >= 0 and i < 250000),
  x integer not null,
  y integer not null,
  owner_slot integer not null references geomshin_users(slot),
  color integer not null,
  lock_until_ms bigint not null default 0,
  has_ad boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists geomshin_pixels_owner on geomshin_pixels(owner_slot);
create index if not exists geomshin_pixels_xy on geomshin_pixels(x, y);

-- 슬롯 발급 카운터
create table if not exists geomshin_meta (
  key text primary key,
  value bigint not null
);
insert into geomshin_meta(key, value) values ('next_slot', 1)
  on conflict (key) do nothing;

-- Realtime: geomshin_pixels UPDATE/INSERT 구독 → 클라 뷰포트 갱신
