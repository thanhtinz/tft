import AsyncStorage from '@react-native-async-storage/async-storage';
export interface MetaState { gems: number; campaignStars: Record<string, number>; unlockedStage: number; bestWave: number; bestRank: number; wins: number; tutorialDone?: boolean; }
export const defaultMeta: MetaState = { gems: 100, campaignStars: {}, unlockedStage: 1, bestWave: 0, bestRank: 8, wins: 0, tutorialDone: false };
const KEY = 'dtc-meta-v1';
export async function loadMeta(): Promise<MetaState> { try { const raw = await AsyncStorage.getItem(KEY); return raw ? { ...defaultMeta, ...JSON.parse(raw) } : defaultMeta; } catch { return defaultMeta; } }
export async function saveMeta(m: MetaState) { try { await AsyncStorage.setItem(KEY, JSON.stringify(m)); } catch {} }
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
