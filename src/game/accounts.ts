// ============================================================================
// LOP DANH TINH / PHIEN DANG NHAP (AsyncStorage) - noi auth.ts (thuan) voi app.
// 2 che do: LOCAL (tai khoan tren thiet bi, mat khau bam SHA-256 + salt) va
// SUPABASE (neu da cau hinh - xem authCloud.ts). Khach = scope 'guest'.
// Viec setDataScope() khien Ngoc/PvE/ho so/lich su/ban be gan theo tung tai khoan.
// ============================================================================
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthError, LocalAccount, applyLp, applyXp, changePasswordLocal, recordArenaStats, registerAccount, riotId, verifyLogin } from './auth';
import { FriendEntry, ProfileState, addHistory, dataScope, defaultProfile, loadProfile, saveProfile, setDataScope, setPlayerIdentity } from './storage';
import { isOnlineConfigured } from './supabase';

export interface Identity {
  kind: 'guest' | 'local' | 'supabase';
  accountId: string; // 'guest' khi chua dang nhap
  displayName: string; tag: string | null; avatarId: string; email?: string;
}
const REG_KEY = 'dtc-accounts-v1';
const SES_KEY = 'dtc-session-v1';
const DEV_BACKUP_KEY = 'dtc-device-player-backup-v1';
export const guestIdentity = (name = 'Người chơi'): Identity => ({ kind: 'guest', accountId: 'guest', displayName: name, tag: null, avatarId: 'gogo' });
export const cloudAvailable = () => isOnlineConfigured();
export function parseRiotId(text: string): { name: string; tag: string | null } {
  const t = text.trim();
  const i = t.lastIndexOf('#');
  if (i > 0) return { name: t.slice(0, i).trim(), tag: t.slice(i + 1).trim() };
  return { name: t, tag: null };
}
export const formatRiotId = riotId;

export async function loadRegistry(): Promise<LocalAccount[]> {
  try { const raw = await AsyncStorage.getItem(REG_KEY); if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) return arr; } } catch {}
  return [];
}
async function saveRegistry(arr: LocalAccount[]) { try { await AsyncStorage.setItem(REG_KEY, JSON.stringify(arr)); } catch {} }

async function backupDevicePlayerOnce() {
  try {
    const bak = await AsyncStorage.getItem(DEV_BACKUP_KEY);
    if (bak) return;
    const raw = await AsyncStorage.getItem('dtc-player-v1');
    if (raw) { const p = JSON.parse(raw); if (p && p.id && !String(p.id).startsWith('acc-') && !String(p.id).startsWith('sb-')) await AsyncStorage.setItem(DEV_BACKUP_KEY, raw); }
  } catch {}
}
async function restoreDevicePlayer() {
  try { const bak = await AsyncStorage.getItem(DEV_BACKUP_KEY); if (bak) await AsyncStorage.setItem('dtc-player-v1', bak); } catch {}
}

async function activateLocalAccount(acc: LocalAccount): Promise<Identity> {
  await backupDevicePlayerOnce();
  setDataScope(acc.id);
  const prof = await loadProfile(acc.displayName);
  if (prof.displayName !== acc.displayName || prof.tag !== acc.tag || prof.avatarId !== acc.avatarId || prof.createdAt === 0) {
    await saveProfile({ ...prof, displayName: acc.displayName, tag: acc.tag, avatarId: acc.avatarId });
  }
  await setPlayerIdentity(acc.id, acc.displayName);
  try { await AsyncStorage.setItem(SES_KEY, JSON.stringify({ accountId: acc.id })); } catch {}
  return { kind: 'local', accountId: acc.id, displayName: acc.displayName, tag: acc.tag, avatarId: acc.avatarId, email: acc.email };
}
export async function activateCloudIdentity(userId: string, prof: ProfileState, email?: string): Promise<Identity> {
  await backupDevicePlayerOnce();
  setDataScope('sb-' + userId);
  await saveProfile(prof);
  await setPlayerIdentity('sb-' + userId, prof.displayName);
  return { kind: 'supabase', accountId: 'sb-' + userId, displayName: prof.displayName, tag: prof.tag, avatarId: prof.avatarId, email };
}

export async function restoreSession(): Promise<Identity> {
  // 1) Phien LOCAL tren thiet bi
  try {
    const raw = await AsyncStorage.getItem(SES_KEY);
    if (raw) {
      const ses = JSON.parse(raw);
      if (ses && ses.accountId) {
        const reg = await loadRegistry();
        const acc = reg.find(a => a.id === ses.accountId);
        if (acc) return await activateLocalAccount(acc);
      }
    }
  } catch {}
  // 2) Phien SUPABASE (client tu persist session)
  if (isOnlineConfigured()) {
    try {
      const { getCloudSession } = await import('./authCloud');
      const sess = await getCloudSession();
      if (sess) return await activateCloudIdentity(sess.userId, sess.profile, sess.email);
    } catch {}
  }
  // 3) Khach
  setDataScope('guest');
  return guestIdentity();
}

export async function registerLocal(input: { email: string; password: string; displayName: string }): Promise<{ identity?: Identity; error?: AuthError }> {
  const reg = await loadRegistry();
  const r = registerAccount(reg, input);
  if (!r.account) return { error: r.error };
  reg.push(r.account);
  await saveRegistry(reg);
  const identity = await activateLocalAccount(r.account);
  await saveProfile({ ...defaultProfile(r.account.displayName), tag: r.account.tag, avatarId: r.account.avatarId });
  return { identity };
}
export async function loginLocal(email: string, password: string): Promise<{ identity?: Identity; error?: AuthError }> {
  const reg = await loadRegistry();
  const r = verifyLogin(reg, email, password);
  if (!r.account) return { error: r.error };
  return { identity: await activateLocalAccount(r.account) };
}
export async function logout(): Promise<Identity> {
  try { await AsyncStorage.removeItem(SES_KEY); } catch {}
  if (isOnlineConfigured()) { try { const { signOutCloud } = await import('./authCloud'); await signOutCloud(); } catch {} }
  setDataScope('guest');
  await restoreDevicePlayer();
  return guestIdentity();
}

// ---------- Cap nhat ho so ----------
export async function renameIdentity(identity: Identity, newName: string): Promise<{ identity?: Identity; error?: string }> {
  const name = newName.trim();
  if (name.length < 2 || name.length > 16) return { error: 'Tên hiển thị cần từ 2 đến 16 ký tự.' };
  const prof = await loadProfile(identity.displayName);
  if (identity.kind === 'local') {
    const reg = await loadRegistry();
    const acc = reg.find(a => a.id === identity.accountId);
    if (!acc) return { error: 'Không tìm thấy tài khoản.' };
    let tag = acc.tag;
    const clash = reg.some(a => a.id !== acc.id && a.displayName.toLowerCase() === name.toLowerCase() && a.tag === tag);
    if (clash) { const { generateTag } = await import('./auth'); tag = generateTag(reg.filter(a => a.id !== acc.id), name); }
    acc.displayName = name; acc.tag = tag;
    await saveRegistry(reg);
    await saveProfile({ ...prof, displayName: name, tag });
    await setPlayerIdentity(acc.id, name);
    return { identity: { ...identity, displayName: name, tag } };
  }
  if (identity.kind === 'supabase') {
    const { updateCloudProfile } = await import('./authCloud');
    const updated = { ...prof, displayName: name };
    await updateCloudProfile(updated);
    await saveProfile(updated);
    await setPlayerIdentity(identity.accountId, name);
    return { identity: { ...identity, displayName: name } };
  }
  await saveProfile({ ...prof, displayName: name });
  await setPlayerIdentity(identity.accountId, name);
  return { identity: { ...identity, displayName: name } };
}
export async function changeAvatar(identity: Identity, avatarId: string): Promise<ProfileState> {
  const prof = await loadProfile(identity.displayName);
  const updated = { ...prof, avatarId };
  await saveProfile(updated);
  if (identity.kind === 'local') {
    const reg = await loadRegistry();
    const acc = reg.find(a => a.id === identity.accountId);
    if (acc) { acc.avatarId = avatarId; await saveRegistry(reg); }
  }
  if (identity.kind === 'supabase') { const { updateCloudProfile } = await import('./authCloud'); await updateCloudProfile(updated); }
  return updated;
}
export async function changePassword(identity: Identity, oldPw: string, newPw: string): Promise<{ error?: AuthError | string }> {
  if (identity.kind === 'local') {
    const reg = await loadRegistry();
    const idx = reg.findIndex(a => a.id === identity.accountId);
    if (idx < 0) return { error: 'Không tìm thấy tài khoản.' };
    const r = changePasswordLocal(reg[idx], oldPw, newPw);
    if (!r.account) return { error: r.error };
    reg[idx] = r.account;
    await saveRegistry(reg);
    return {};
  }
  if (identity.kind === 'supabase') {
    if (newPw.length < 6) return { error: 'PASSWORD_SHORT' };
    const { updateCloudPassword } = await import('./authCloud');
    const err = await updateCloudPassword(newPw);
    return err ? { error: err } : {};
  }
  return { error: 'Khách không có mật khẩu.' };
}
export async function deleteAccount(identity: Identity, password: string): Promise<{ error?: string }> {
  if (identity.kind === 'guest') return { error: 'Khách không có tài khoản để xóa.' };
  if (identity.kind === 'local') {
    const reg = await loadRegistry();
    const acc = reg.find(a => a.id === identity.accountId);
    if (!acc) return { error: 'Không tìm thấy tài khoản.' };
    const v = verifyLogin(reg, acc.email, password);
    if (!v.account) return { error: 'Mật khẩu chưa đúng.' };
    await saveRegistry(reg.filter(a => a.id !== acc.id));
    const suffix = ':' + acc.id;
    for (const base of ['dtc-meta-v1', 'dtc-profile-v1', 'dtc-history-v1', 'dtc-friends-v1']) {
      try { await AsyncStorage.removeItem(base + suffix); } catch {}
    }
    await logout();
    return {};
  }
  // Supabase: xoa hang ho so + lich su cua chinh minh (RLS owner), roi dang xuat.
  // Xoa ca user khoi Auth can service_role/admin nen lam trong Dashboard neu can thiet hon.
  const { deleteCloudData } = await import('./authCloud');
  await deleteCloudData();
  await logout();
  return {};
}

// ---------- Ban be ----------
export async function findFriend(identity: Identity, riotIdText: string): Promise<{ friend?: FriendEntry; error?: string }> {
  const { name, tag } = parseRiotId(riotIdText);
  if (!name) return { error: 'Hãy nhập Riot ID của bạn (Tên#1234).' };
  if (identity.kind === 'supabase') {
    const { searchProfilesCloud } = await import('./authCloud');
    const rows = await searchProfilesCloud(name, tag);
    const row = rows.find(r => !tag || r.tag === tag) ?? rows[0];
    if (!row) return { error: 'Không tìm thấy người chơi này trên hệ thống.' };
    if (row.displayName === identity.displayName && row.tag === identity.tag) return { error: 'Đây là chính bạn rồi.' };
    const { rankLabel } = await import('./auth');
    return { friend: { key: 'sb:' + row.id, name: row.displayName, tag: row.tag, avatarId: row.avatarId, rankText: rankLabel(row.rank), source: 'supabase' } };
  }
  // Local: tim trong cac tai khoan tren cung thiet bi
  const reg = await loadRegistry();
  const acc = reg.find(a => a.displayName.toLowerCase() === name.toLowerCase() && (!tag || a.tag === tag) && a.id !== identity.accountId);
  if (!acc) return { error: 'Không tìm thấy tài khoản này trên thiết bị (chế độ local chỉ tìm được tài khoản đã đăng ký trên máy này).' };
  let rankText = 'Sắt IV • 0 LP';
  try {
    const raw = await AsyncStorage.getItem('dtc-profile-v1:' + acc.id);
    if (raw) { const p = JSON.parse(raw); const { rankLabel } = await import('./auth'); rankText = rankLabel(p.rank); }
  } catch {}
  return { friend: { key: 'local:' + acc.id, name: acc.displayName, tag: acc.tag, avatarId: acc.avatarId, rankText, source: 'local' } };
}

// ---------- Ap dung phan thuong sau tran: XP + LP + thong ke + lich su ----------
export interface MatchRewardResult { xpGained: number; levelsGained: number; lpDelta?: number; promoted?: boolean; demoted?: boolean; profile: ProfileState }
export async function applyMatchRewards(opts: {
  mode: string; modeLabel: string; resultText: string;
  placement?: number; totalPlayers?: number; xp: number;
  team: { defId: string; star: number }[];
}): Promise<MatchRewardResult> {
  const prof = await loadProfile();
  const xpRes = applyXp(prof.level, prof.xp, opts.xp);
  let stats = prof.stats;
  let lpDelta: number | undefined; let promoted = false; let demoted = false;
  let rank = prof.rank;
  if (opts.placement && (opts.mode === 'arena' || opts.mode === 'online')) {
    const lpRes = applyLp(prof.rank, opts.placement);
    rank = lpRes.rank; lpDelta = lpRes.delta; promoted = lpRes.promoted; demoted = lpRes.demoted;
    stats = recordArenaStats(prof.stats, opts.placement);
  }
  const updated: ProfileState = { ...prof, level: xpRes.level, xp: xpRes.xp, rank, stats };
  await saveProfile(updated);
  await addHistory({
    id: 'm-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36),
    ts: Date.now(), mode: opts.mode, modeLabel: opts.modeLabel, placement: opts.placement,
    totalPlayers: opts.totalPlayers, resultText: opts.resultText, team: opts.team.slice(0, 12),
    lpDelta, xpGained: opts.xp,
  });
  return { xpGained: opts.xp, levelsGained: xpRes.levelsGained, lpDelta, promoted, demoted, profile: updated };
}
export function currentScopeId(): string { return dataScope(); }
