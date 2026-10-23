// Ket noi Supabase cho PvP Online (Realtime Broadcast + Presence, khong can bang du lieu).
// Cau hinh: dat EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY khi build,
// hoac dien extra.supabaseUrl / extra.supabaseAnonKey trong app.json (xem README).
import Constants from 'expo-constants';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const extra = ((Constants.expoConfig?.extra ?? {}) as Record<string, string>);
const env = ((globalThis as any).process?.env ?? {}) as Record<string, string | undefined>;
const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || '';
const SUPABASE_ANON_KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey || '';

export function isOnlineConfigured(): boolean { return !!SUPABASE_URL && !!SUPABASE_ANON_KEY; }

let client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
  if (!isOnlineConfigured()) return null;
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { realtime: { params: { eventsPerSecond: 12 } } });
  return client;
}
