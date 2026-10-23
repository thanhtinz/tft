import AsyncStorage from '@react-native-async-storage/async-storage';
export interface MetaState { gems: number; campaignStars: Record<string, number>; unlockedStage: number; bestWave: number; bestRank: number; wins: number; }
export const defaultMeta: MetaState = { gems: 100, campaignStars: {}, unlockedStage: 1, bestWave: 0, bestRank: 8, wins: 0 };
const KEY = 'dtc-meta-v1';
export async function loadMeta(): Promise<MetaState> { try { const raw = await AsyncStorage.getItem(KEY); return raw ? { ...defaultMeta, ...JSON.parse(raw) } : defaultMeta; } catch { return defaultMeta; } }
export async function saveMeta(m: MetaState) { try { await AsyncStorage.setItem(KEY, JSON.stringify(m)); } catch {} }
const SKEY = 'dtc-settings-v1';
export interface Settings { speed: number; }
export async function loadSettings(): Promise<Settings> { try { const raw = await AsyncStorage.getItem(SKEY); return raw ? JSON.parse(raw) : { speed: 1 }; } catch { return { speed: 1 }; } }
export async function saveSettings(s: Settings) { try { await AsyncStorage.setItem(SKEY, JSON.stringify(s)); } catch {} }
