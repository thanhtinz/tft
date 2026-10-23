-- Dau Truong Chibi - PvP Online dung Supabase Realtime (Broadcast + Presence) nen
-- phan phong dau KHONG bat buoc chay file nay.
-- TU 2026-10-23: game co he thong TAI KHOAN (Supabase Auth) + ho so/hang tren bang
-- profiles o cuoi file - MUON dung dang nhap online thi chay file nay 1 lan trong
-- Supabase Dashboard -> SQL Editor -> Run. Dong thoi tat "Confirm email" tai
-- Authentication -> Providers -> Email de dang ky xong dang nhap duoc ngay.

-- Lich su tran online (client ghi khi tran ket thuc, chi de xem thong ke)
create table if not exists public.match_history (
  id bigint generated always as identity primary key,
  room_code text not null,
  player_name text not null,
  rank int not null,
  rounds int not null default 0,
  created_at timestamptz not null default now()
);

-- Danh sach phong cong khai (ho tro tim phong nhanh o ban sau)
create table if not exists public.open_rooms (
  room_code text primary key,
  host_name text not null,
  players int not null default 1,
  status text not null default 'lobby',
  updated_at timestamptz not null default now()
);

alter table public.match_history enable row level security;
alter table public.open_rooms enable row level security;

-- Phong ban be, xac thuc an danh: cho phep anon doc/ghi (chi nen dung cho game giai tri)
create policy "anon read history" on public.match_history for select using (true);
create policy "anon insert history" on public.match_history for insert with check (true);
create policy "anon read rooms" on public.open_rooms for select using (true);
create policy "anon upsert rooms" on public.open_rooms for insert with check (true);
create policy "anon update rooms" on public.open_rooms for update using (true) with check (true);
create policy "anon delete rooms" on public.open_rooms for delete using (true);

-- ============================================================================
-- HE THONG TAI KHOAN (Supabase Auth) - ho so nguoi choi kieu Riot ID (Ten#tag)
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  tag text not null,
  avatar_id text not null default 'gogo',
  level int not null default 1,
  xp int not null default 0,
  rank_tier int not null default 0,
  rank_division int default 4,
  lp int not null default 0,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (display_name, tag)
);

alter table public.profiles enable row level security;

-- Ho so rut gon doc cong khai (de tim ban theo Riot ID + hien hang)
create policy "profiles public read" on public.profiles for select using (true);
-- Chi chu so huu moi duoc tao/sua/xoa ho so cua minh
create policy "profiles owner insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles owner update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles owner delete" on public.profiles for delete using (auth.uid() = id);

-- Lich su tran theo tai khoan (client co the chi ghi local; bang nay de dong bo sau)
create table if not exists public.account_match_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null,
  placement int,
  team jsonb not null default '[]'::jsonb,
  lp_delta int,
  xp_gained int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.account_match_history enable row level security;
create policy "history owner read" on public.account_match_history for select using (auth.uid() = user_id);
create policy "history owner insert" on public.account_match_history for insert with check (auth.uid() = user_id);
create policy "history owner delete" on public.account_match_history for delete using (auth.uid() = user_id);
