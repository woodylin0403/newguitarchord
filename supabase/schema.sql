-- 教會詩歌吉他譜 — Supabase schema
-- 執行方式：Supabase Dashboard → SQL Editor → 貼上整個檔案 → Run。
-- 可重複執行（都有 if not exists / drop-create）。

-- ─────────────────────────────────────────────────────────────
-- song_contents：站上編輯後的 ChordPro 內容（覆寫檔案）。
-- 沒有 row 的歌，網站仍讀 data/songs/<slug>.chordpro。
-- ─────────────────────────────────────────────────────────────
create table if not exists public.song_contents (
  slug        text primary key,
  chordpro    text not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

alter table public.song_contents enable row level security;

drop policy if exists "song_contents public read" on public.song_contents;
create policy "song_contents public read"
  on public.song_contents for select
  using (true);
-- 寫入一律走 server action + service_role（繞過 RLS），不開放 client 直接寫。

-- ─────────────────────────────────────────────────────────────
-- songs：站上新增的歌曲（songs.json 之外的）。目錄層會把兩者合併。
-- ─────────────────────────────────────────────────────────────
create table if not exists public.songs (
  slug            text primary key,
  title           text not null check (char_length(btrim(title)) between 1 and 120),
  music_key       text not null,
  number          int  not null,
  time_signature  text,
  created_at      timestamptz not null default now(),
  created_by      uuid
);

alter table public.songs enable row level security;

drop policy if exists "songs public read" on public.songs;
create policy "songs public read"
  on public.songs for select
  using (true);
-- 新增 / 刪除一律走 server action + service_role。

-- ─────────────────────────────────────────────────────────────
-- song_scans：把一首歌釘到「該頁其中一張裁切圖」，取代整頁掃描顯示。
-- 從編輯器的縮圖選擇設定；優先於 data/scan-map.json。
-- ─────────────────────────────────────────────────────────────
create table if not exists public.song_scans (
  slug        text primary key,
  crop        text not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

alter table public.song_scans enable row level security;

drop policy if exists "song_scans public read" on public.song_scans;
create policy "song_scans public read"
  on public.song_scans for select
  using (true);
-- 寫入走 server action + service_role。

-- ─────────────────────────────────────────────────────────────
-- profiles：auth.users 的鏡像 + 顯示名稱，註冊時自動建立。
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  name        text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read"
  on public.profiles for select
  using (true);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        name = coalesce(excluded.name, public.profiles.name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- comments：每首歌的留言。
-- ─────────────────────────────────────────────────────────────
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  song_slug   text not null,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index if not exists comments_song_idx
  on public.comments (song_slug, created_at desc);

alter table public.comments enable row level security;

drop policy if exists "comments read visible" on public.comments;
create policy "comments read visible"
  on public.comments for select
  using (deleted_at is null);

drop policy if exists "comments insert own" on public.comments;
create policy "comments insert own"
  on public.comments for insert
  with check (user_id = auth.uid());

drop policy if exists "comments update own" on public.comments;
create policy "comments update own"
  on public.comments for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
-- 管理員刪除留言走 server action + service_role。
