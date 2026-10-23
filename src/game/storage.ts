import AsyncStorage from '@react-native-async-storage/async-storage';
import { MatchStats, RankState, defaultRank, emptyStats } from './auth';
export interface MetaState { gems: number; campaignStars: Record<string, number>; unlockedStage: number; bestWave: number; bestRank: number; wins: number; tutorialDone?: boolean; }
export const defaultMeta: MetaState = { gems: 100, campaignStars: {}, unlockedStage: 1, bestWave: 0, bestRank: 8, wins: 0, tutorialDone: false };
// ===== SCOPE DU LIEU THEO TAI KHOAN =====
// 'guest' dung key goc (tuong thich du lieu cu). Tai khoan dang nhap dung key co hau to
// ':<accountId>' de Ngoc/PvE/ho so/lich su gan rieng tung tai khoan tren cung thiet bi.
let scopeId = 'guest';
export function setDataScope(id: string | null | undefined) { scopeId = id && id !== 'guest' ? id : 'guest'; }
export function dataScope(): string { return scopeId; }
const scoped = (base: string) => scopeId === 'guest' ? base : base + ':' + scopeId;
const KEY = 'dtc-meta-v1';
export async function loadMeta(): Promise<MetaState> { try { const raw = await AsyncStorage.getItem(scoped(KEY)); return raw ? { ...defaultMeta, ...JSON.parse(raw) } : defaultMeta; } catch { return defaultMeta; } }
export async function saveMeta(m: MetaState) { try { await AsyncStorage.setItem(scoped(KEY), JSON.stringify(m)); } catch {} }
const SKEY = 'dtc-settings-v1';
export interface Settings { speed: number; music: boolean; sfx: boolean; }
export const defaultSettings: Settings = { speed: 1, music: true, sfx: true };
export async function loadSettings(): Promise<Settings> { try { const raw = await AsyncStorage.getItem(SKEY); return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings; } catch { return defaultSettings; } }
export async function saveSettings(s: Settings) { try { await AsyncStorage.setItem(SKEY, JSON.stringify(s)); } catch {} }
const PKEY = 'dtc-player-v1';
export interface LocalPlayer { id: string; name: string; }
export async function loadPlayer(): Promise<LocalPlayer> {
  try { const raw = await AsyncStorage.getItem(PKEY); if (raw) { const p = JSON.parse(raw); if (p && p.id) return { id: p.id, name: p.name || 'Người chơi' }; } } catch {}
  const id = 'p-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e9).toString(36);
  const p: LocalPlayer = { id, name: 'Người chơi' };
  try { await AsyncStorage.setItem(PKEY, JSON.stringify(p)); } catch {}
  return p;
}
export async function savePlayerName(name: string) { const p = await loadPlayer(); p.name = name.trim() || p.name; try { await AsyncStorage.setItem(PKEY, JSON.stringify(p)); } catch {} return p; }
export async function setPlayerIdentity(id: string, name: string) { try { await AsyncStorage.setItem(PKEY, JSON.stringify({ id, name })); } catch {} }
// ===== HO SO NGUOI CHOI (profile) theo scope =====
export interface ProfileState {
  displayName: string; tag: string | null; avatarId: string;
  level: number; xp: number; rank: RankState; stats: MatchStats; createdAt: number;
}
export const defaultProfile = (name = 'Người chơi'): ProfileState => ({
  displayName: name, tag: null, avatarId: 'gogo', level: 1, xp: 0,
  rank: defaultRank(), stats: emptyStats(), createdAt: Date.now(),
});
const PROF_KEY = 'dtc-profile-v1';
export async function loadProfile(fallbackName?: string): Promise<ProfileState> {
  try {
    const raw = await AsyncStorage.getItem(scoped(PROF_KEY));
    if (raw) { const p = JSON.parse(raw); return { ...defaultProfile(p.displayName ?? fallbackName ?? 'Người chơi'), ...p, rank: { ...defaultRank(), ...(p.rank ?? {}) }, stats: { ...emptyStats(), ...(p.stats ?? {}) } }; }
  } catch {}
  return defaultProfile(fallbackName ?? 'Người chơi');
}
export async function saveProfile(p: ProfileState) { try { await AsyncStorage.setItem(scoped(PROF_KEY), JSON.stringify(p)); } catch {} }
// ===== LICH SU DAU theo scope =====
export interface HistoryRecord {
  id: string; ts: number; mode: string; modeLabel: string;
  placement?: number; totalPlayers?: number; resultText: string;
  team: { defId: string; star: number }[]; lpDelta?: number; xpGained: number;
}
const HIST_KEY = 'dtc-history-v1';
export async function loadHistory(): Promise<HistoryRecord[]> {
  try { const raw = await AsyncStorage.getItem(scoped(HIST_KEY)); if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) return arr; } } catch {}
  return [];
}
export async function addHistory(rec: HistoryRecord) {
  const arr = await loadHistory();
  arr.unshift(rec);
  try { await AsyncStorage.setItem(scoped(HIST_KEY), JSON.stringify(arr.slice(0, 60))); } catch {}
  return arr.slice(0, 60);
}
// ===== BAN BE theo scope =====
export interface FriendEntry { key: string; name: string; tag: string | null; avatarId: string; rankText: string; source: 'local' | 'supabase' }
const FRIEND_KEY = 'dtc-friends-v1';
export async function loadFriends(): Promise<FriendEntry[]> {
  try { const raw = await AsyncStorage.getItem(scoped(FRIEND_KEY)); if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) return arr; } } catch {}
  return [];
}
export async function saveFriends(f: FriendEntry[]) { try { await AsyncStorage.setItem(scoped(FRIEND_KEY), JSON.stringify(f)); } catch {} }
