// ============================================================================
// AUTH THUAN TS (khong import React/AsyncStorage) - test headless duoc.
// Gom: SHA-256 tu cai, bam mat khau + salt, dang ky/dang nhap LOCAL,
// sinh tag kieu Riot ID (Ten#1234), XP/Cap do, LP va he thong HANG kieu TFT.
// Lop luu tru (AsyncStorage/Supabase) nam o accounts.ts / authCloud.ts.
// ============================================================================

// ---------- SHA-256 (thuan JS, chuan FIPS 180-4) ----------
const K256 = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];
function utf8Bytes(str: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) { out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f)); }
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      const c2 = str.charCodeAt(++i);
      const cp = 0x10000 + ((c - 0xd800) * 0x400) + (c2 - 0xdc00);
      out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    } else { out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f)); }
  }
  return out;
}
const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
export function sha256Hex(input: string): string {
  const bytes = utf8Bytes(input);
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  // Chi ho tro do dai < 2^32 bit (du cho mat khau/chuoi ngan); 4 byte cao = 0
  bytes.push(0, 0, 0, 0, (bitLen >>> 24) & 0xff, (bitLen >>> 16) & 0xff, (bitLen >>> 8) & 0xff, bitLen & 0xff);
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a, h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Array(64).fill(0);
  for (let block = 0; block < bytes.length; block += 64) {
    for (let t = 0; t < 16; t++) w[t] = ((bytes[block + t * 4] << 24) | (bytes[block + t * 4 + 1] << 16) | (bytes[block + t * 4 + 2] << 8) | bytes[block + t * 4 + 3]) | 0;
    for (let t = 16; t < 64; t++) {
      const s0 = (rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3)) | 0;
      const s1 = (rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10)) | 0;
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let t = 0; t < 64; t++) {
      const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) | 0;
      const ch = ((e & f) ^ (~e & g)) | 0;
      const t1 = (h + S1 + ch + K256[t] + w[t]) | 0;
      const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) | 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) | 0;
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return hex(h0) + hex(h1) + hex(h2) + hex(h3) + hex(h4) + hex(h5) + hex(h6) + hex(h7);
}
// Bam mat khau: SHA-256 lap 200 vong tren (salt:password) - KHONG luu mat khau tho
export function hashPassword(password: string, salt: string): string {
  let h = sha256Hex(salt + ':' + password);
  for (let i = 0; i < 200; i++) h = sha256Hex(h + ':' + salt);
  return h;
}
export function genSalt(rng: () => number = Math.random): string {
  let s = '';
  const chars = 'abcdef0123456789';
  for (let i = 0; i < 16; i++) s += chars[Math.floor(rng() * 16) % 16];
  return s;
}

// ---------- Tai khoan LOCAL ----------
export interface LocalAccount {
  id: string; email: string; displayName: string; tag: string; avatarId: string;
  salt: string; passHash: string; createdAt: number;
}
export type AuthError = 'EMAIL_INVALID' | 'EMAIL_TAKEN' | 'PASSWORD_SHORT' | 'NAME_INVALID' | 'EMAIL_NOT_FOUND' | 'WRONG_PASSWORD';
export const AUTH_ERROR_VI: Record<AuthError, string> = {
  EMAIL_INVALID: 'Email chưa đúng định dạng.', EMAIL_TAKEN: 'Email này đã được đăng ký rồi.',
  PASSWORD_SHORT: 'Mật khẩu cần ít nhất 6 ký tự.', NAME_INVALID: 'Tên hiển thị cần từ 2 đến 16 ký tự.',
  EMAIL_NOT_FOUND: 'Không tìm thấy tài khoản với email này.', WRONG_PASSWORD: 'Mật khẩu chưa đúng, thử lại nhé.',
};
export function isValidEmail(email: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()); }
// Tag #4 so: "duong tuong doi" theo cap (ten khong phan biet hoa thuong + tag)
export function generateTag(accounts: LocalAccount[], displayName: string, rng: () => number = Math.random): string {
  for (let tries = 0; tries < 200; tries++) {
    const tag = String(1000 + Math.floor(rng() * 9000));
    const clash = accounts.some(a => a.displayName.toLowerCase() === displayName.toLowerCase() && a.tag === tag);
    if (!clash) return tag;
  }
  return String(1000 + Math.floor(rng() * 9000));
}
export function registerAccount(
  accounts: LocalAccount[],
  input: { email: string; password: string; displayName: string },
  rng: () => number = Math.random,
): { account?: LocalAccount; error?: AuthError } {
  const email = input.email.trim().toLowerCase();
  const name = input.displayName.trim();
  if (!isValidEmail(email)) return { error: 'EMAIL_INVALID' };
  if (accounts.some(a => a.email === email)) return { error: 'EMAIL_TAKEN' };
  if (input.password.length < 6) return { error: 'PASSWORD_SHORT' };
  if (name.length < 2 || name.length > 16) return { error: 'NAME_INVALID' };
  const salt = genSalt(rng);
  const account: LocalAccount = {
    id: 'acc-' + Math.floor(rng() * 1e15).toString(36) + '-' + Date.now().toString(36),
    email, displayName: name, tag: generateTag(accounts, name, rng), avatarId: 'gogo',
    salt, passHash: hashPassword(input.password, salt), createdAt: Date.now(),
  };
  return { account };
}
export function verifyLogin(
  accounts: LocalAccount[], email: string, password: string,
): { account?: LocalAccount; error?: AuthError } {
  const acc = accounts.find(a => a.email === email.trim().toLowerCase());
  if (!acc) return { error: 'EMAIL_NOT_FOUND' };
  if (hashPassword(password, acc.salt) !== acc.passHash) return { error: 'WRONG_PASSWORD' };
  return { account: acc };
}
export function changePasswordLocal(
  acc: LocalAccount, oldPassword: string, newPassword: string, rng: () => number = Math.random,
): { account?: LocalAccount; error?: AuthError } {
  if (hashPassword(oldPassword, acc.salt) !== acc.passHash) return { error: 'WRONG_PASSWORD' };
  if (newPassword.length < 6) return { error: 'PASSWORD_SHORT' };
  const salt = genSalt(rng);
  return { account: { ...acc, salt, passHash: hashPassword(newPassword, salt) } };
}
export const riotId = (name: string, tag?: string | null) => tag ? name + '#' + tag : name;

// ---------- XP / CAP DO ----------
export const PLACEMENT_XP = [50, 42, 36, 30, 24, 18, 12, 8]; // hang 1..8
export function xpForPlacement(placement: number): number { return PLACEMENT_XP[Math.max(1, Math.min(8, placement)) - 1]; }
export function xpToNextLevel(level: number): number { return 80 + (level - 1) * 40; }
export function applyXp(level: number, xp: number, gained: number): { level: number; xp: number; levelsGained: number } {
  let lv = level, x = xp + Math.max(0, gained), gainedLv = 0;
  while (x >= xpToNextLevel(lv)) { x -= xpToNextLevel(lv); lv++; gainedLv++; }
  return { level: lv, xp: x, levelsGained: gainedLv };
}

// ---------- HANG (RANK) kieu TFT ----------
// 10 bac; bac 0..6 co hang IV..I (division 4..1), bac 7..9 (Cao Thu+) khong chia hang.
export const RANK_TIERS = ['Sắt', 'Đồng', 'Bạc', 'Vàng', 'Bạch Kim', 'Ngọc Lục Bảo', 'Kim Cương', 'Cao Thủ', 'Đại Cao Thủ', 'Thách Đấu'];
export const TIER_COLORS = ['#8d99ae', '#c97b4a', '#c0c8d4', '#f5c542', '#7fe7dc', '#2ecc71', '#5eb2f2', '#b388ff', '#ff6b81', '#ffb703'];
export const APEX_TIER = 7;
export const APEX_PROMOTE_LP = 200;
export interface RankState { tier: number; division: number | null; lp: number }
export const defaultRank = (): RankState => ({ tier: 0, division: 4, lp: 0 });
const ROMAN = ['', 'I', 'II', 'III', 'IV'];
export function rankLabel(r: RankState): string {
  const t = RANK_TIERS[Math.max(0, Math.min(9, r.tier))];
  return r.division ? `${t} ${ROMAN[r.division]} • ${r.lp} LP` : `${t} • ${r.lp} LP`;
}
export function rankShort(r: RankState): string {
  const t = RANK_TIERS[Math.max(0, Math.min(9, r.tier))];
  return r.division ? `${t} ${ROMAN[r.division]}` : t;
}
// Bang LP theo NHOM bac (hang dat duoc 1..8). Cang len bac cao, thua cang tru nang.
export const LP_TABLES: Record<string, number[]> = {
  low: [46, 32, 20, 12, -4, -12, -22, -34],   // Sat / Dong
  mid: [42, 30, 19, 11, -6, -15, -25, -38],   // Bac / Vang
  high: [40, 28, 18, 10, -8, -17, -28, -42],  // Bach Kim / Ngoc Luc Bao
  apex: [38, 26, 17, 10, -10, -19, -30, -45], // Kim Cuong tro len
};
export function lpDelta(placement: number, tier: number): number {
  const tbl = tier <= 1 ? LP_TABLES.low : tier <= 3 ? LP_TABLES.mid : tier <= 5 ? LP_TABLES.high : LP_TABLES.apex;
  return tbl[Math.max(1, Math.min(8, placement)) - 1];
}
export function applyLp(rank: RankState, placement: number): { rank: RankState; delta: number; promoted: boolean; demoted: boolean } {
  const delta = lpDelta(placement, rank.tier);
  let { tier, division, lp } = rank;
  lp += delta;
  let promoted = false, demoted = false;
  // Thang hang
  while (true) {
    if (tier >= APEX_TIER) {
      if (lp >= APEX_PROMOTE_LP && tier < 9) { lp -= APEX_PROMOTE_LP; tier++; division = null; promoted = true; continue; }
      break;
    }
    if (lp >= 100) {
      lp -= 100; promoted = true;
      if (division !== null && division > 1) division--;
      else if (tier < 6) { tier++; division = 4; }
      else { tier = APEX_TIER; division = null; }
      continue;
    }
    break;
  }
  // Giang hang (don gian hoa: xuong 1 bac/hang thi LP = LP am cong 75, kieu TFT de lai 75 LP)
  while (lp < 0) {
    if (tier >= APEX_TIER) {
      if (tier > APEX_TIER) { tier--; lp += 75; demoted = true; continue; }
      tier = 6; division = 1; lp += 75; demoted = true; continue;
    }
    if (tier === 0 && division === 4) { lp = 0; break; } // san Sat IV
    if (division !== null && division < 4) { division++; lp += 75; demoted = true; continue; }
    tier--; division = 1; lp += 75; demoted = true;
  }
  return { rank: { tier, division, lp }, delta, promoted, demoted };
}
// Tien trinh 0..1 toi moc thang hang ke tiep
export function lpProgress(rank: RankState): number {
  const target = rank.tier >= APEX_TIER ? APEX_PROMOTE_LP : 100;
  return Math.max(0, Math.min(1, rank.lp / target));
}

// ---------- THONG KE ----------
export interface MatchStats { matches: number; top1: number; top4: number; placementSum: number }
export const emptyStats = (): MatchStats => ({ matches: 0, top1: 0, top4: 0, placementSum: 0 });
export function recordArenaStats(stats: MatchStats, placement: number): MatchStats {
  return {
    matches: stats.matches + 1,
    top1: stats.top1 + (placement === 1 ? 1 : 0),
    top4: stats.top4 + (placement <= 4 ? 1 : 0),
    placementSum: stats.placementSum + placement,
  };
}
export function avgPlacement(stats: MatchStats): number | null {
  return stats.matches ? stats.placementSum / stats.matches : null;
}
