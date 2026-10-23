-- Dau Truong Chibi - PvP Online dung Supabase Realtime (Broadcast + Presence) nen
-- KHONG bat buoc chay file nay. Cac bang duoi day la TUY CHON (luu lich su tran dau
-- va danh sach phong cong khai neu sau nay can). Game chay duoc ma khong can bang.
-- Neu muon dung: vao Supabase Dashboard -> SQL Editor -> dan toan bo file -> Run.

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
