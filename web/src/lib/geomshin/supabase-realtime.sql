-- 검신 Realtime (이미 스키마 적용된 DB에 한 번 더 실행)
-- Supabase SQL Editor에서 실행

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
