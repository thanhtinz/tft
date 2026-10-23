// ============================================================================
// LOP SUPABASE AUTH (chi hoat dong khi da cau hinh URL + anon key - xem supabase.ts).
// Dung Supabase Auth email/password; ho so luu o bang public.profiles (schema.sql).
// Neu chua cau hinh: moi ham tra ve null/'' va game chay che do tai khoan LOCAL.
// ============================================================================
import { ProfileState, defaultProfile } from './storage';
import { MatchStats, RankState, defaultRank, emptyStats } from './auth';
import { getSupabase, isOnlineConfigured } from './supabase';

export const cloudEnabled = () => isOnlineConfigured();

interface ProfileRow {
  id: string; display_name: string; tag: string; avatar_id: string;
  level: number; xp: number; rank_tier: number; rank_division: number | null;
  lp: number; stats: Partial<MatchStats> | null; created_at?: string;
}
export function rowToProfile(r: ProfileRow): ProfileState {
  return {
    displayName: r.display_name, tag: r.tag, avatarId: r.avatar_id || 'gogo',
    level: r.level || 1, xp: r.xp || 0,
    rank: { tier: r.rank_tier ?? 0, division: r.rank_division, lp: r.lp ?? 0 },
    stats: { ...emptyStats(), ...(r.stats ?? {}) },
    createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(),
  };
}
export function profileToRow(p: ProfileState, id: string): ProfileRow {
  return {
    id, display_name: p.displayName, tag: p.tag ?? '0000', avatar_id: p.avatarId,
    level: p.level, xp: p.xp, rank_tier: p.rank.tier, rank_division: p.rank.division,
    lp: p.rank.lp, stats: p.stats,
  };
}
async function fetchProfileRow(userId: string): Promise<ProfileRow | null> {
  const sb = getSupabase(); if (!sb) return null;
  const { data } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
  return (data as ProfileRow) ?? null;
}
async function createProfileRow(userId: string, displayName: string): Promise<ProfileRow | null> {
  const sb = getSupabase(); if (!sb) return null;
  for (let tries = 0; tries < 6; tries++) {
    const tag = String(1000 + Math.floor(Math.random() * 9000));
    const prof = { ...defaultProfile(displayName), tag };
    const row = profileToRow(prof, userId);
    const { error } = await sb.from('profiles').insert(row);
    if (!error) return row;
  }
  return null;
}
export async function signUpCloud(email: string, password: string, displayName: string): Promise<{ userId?: string; email?: string; profile?: ProfileState; needsConfirm?: boolean; error?: string }> {
  const sb = getSupabase(); if (!sb) return { error: 'Chưa cấu hình Supabase.' };
  const { data, error } = await sb.auth.signUp({ email: email.trim().toLowerCase(), password });
  if (error) return { error: error.message };
  const user = data.user;
  if (!user) return { error: 'Đăng ký chưa hoàn tất, hãy kiểm tra email.' };
  if (!data.session) return { needsConfirm: true, email: user.email ?? email };
  const row = await createProfileRow(user.id, displayName.trim());
  return { userId: user.id, email: user.email ?? email, profile: row ? rowToProfile(row) : { ...defaultProfile(displayName.trim()) } };
}
export async function signInCloud(email: string, password: string): Promise<{ userId?: string; email?: string; profile?: ProfileState; error?: string }> {
  const sb = getSupabase(); if (!sb) return { error: 'Chưa cấu hình Supabase.' };
  const { data, error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) return { error: error.message };
  const user = data.user; if (!user) return { error: 'Đăng nhập thất bại.' };
  let row = await fetchProfileRow(user.id);
  if (!row) row = await createProfileRow(user.id, (user.email ?? 'Người chơi').split('@')[0]);
  return { userId: user.id, email: user.email ?? email, profile: row ? rowToProfile(row) : defaultProfile() };
}
export async function getCloudSession(): Promise<{ userId: string; email?: string; profile: ProfileState } | null> {
  const sb = getSupabase(); if (!sb) return null;
  const { data } = await sb.auth.getUser();
  const user = data?.user; if (!user) return null;
  let row = await fetchProfileRow(user.id);
  if (!row) row = await createProfileRow(user.id, (user.email ?? 'Người chơi').split('@')[0]);
  if (!row) return null;
  return { userId: user.id, email: user.email ?? undefined, profile: rowToProfile(row) };
}
export async function signOutCloud() { const sb = getSupabase(); if (sb) await sb.auth.signOut(); }
export async function updateCloudProfile(p: ProfileState) {
  const sb = getSupabase(); if (!sb) return;
  const { data } = await sb.auth.getUser();
  const user = data?.user; if (!user) return;
  await sb.from('profiles').upsert(profileToRow(p, user.id));
}
export async function updateCloudPassword(newPassword: string): Promise<string | null> {
  const sb = getSupabase(); if (!sb) return 'Chưa cấu hình Supabase.';
  const { error } = await sb.auth.updateUser({ password: newPassword });
  return error ? error.message : null;
}
export async function searchProfilesCloud(name: string, tag: string | null): Promise<(ProfileState & { id: string })[]> {
  const sb = getSupabase(); if (!sb) return [];
  let q = sb.from('profiles').select('*').ilike('display_name', name.trim());
  if (tag) q = q.eq('tag', tag);
  const { data } = await q.limit(5);
  return ((data as ProfileRow[]) ?? []).map(r => ({ ...rowToProfile(r), id: r.id }));
}
export async function deleteCloudData() {
  const sb = getSupabase(); if (!sb) return;
  const { data } = await sb.auth.getUser();
  const user = data?.user; if (!user) return;
  try { await sb.from('account_match_history').delete().eq('user_id', user.id); } catch {}
  try { await sb.from('profiles').delete().eq('id', user.id); } catch {}
}
export type { RankState, MatchStats };
export { defaultRank };
