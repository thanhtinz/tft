// Giao thuc PvP online thuan TypeScript - khong import react / supabase.
// Moi ham deu xac dinh (deterministic) de 2 client cung tinh ra 1 ket qua.
import { PlacedUnit, hashSeed, mulberry32, simulateBattle } from './engine';

export interface SnapshotUnit { defId: string; star: number; items: string[]; x: number; y: number; }
export interface TeamSnapshot { playerId: string; name: string; seat: number; round: number; level: number; augments: string[]; units: SnapshotUnit[]; }
export interface RoomPlayer { id: string; name: string; seat: number; hp: number; alive: boolean; isBot: boolean; connected: boolean; }

export interface TeamMeta { playerId: string; name: string; seat: number; round: number; level: number; augments: string[]; }
export interface PairInfo { a: number; b: number; ghost: boolean; }
export interface PairBattleResult { winnerSeat: number; loserSeat: number; winnerSurvivors: number; duration: number; round?: number; }

// Bang chu loai ky tu de nham: bo 0/O/1/I (32 ky tu)
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function makeRoomCode(rnd: () => number): string {
  let out = '';
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(rnd() * ROOM_ALPHABET.length);
    out += ROOM_ALPHABET[Math.max(0, Math.min(ROOM_ALPHABET.length - 1, idx))];
  }
  return out;
}

export function serializeTeam(units: PlacedUnit[], meta: TeamMeta): TeamSnapshot {
  return {
    playerId: meta.playerId,
    name: meta.name,
    seat: meta.seat,
    round: meta.round,
    level: meta.level,
    augments: [...(meta.augments ?? [])],
    units: units.map((u) => ({ defId: u.defId, star: u.star, items: [...u.items], x: u.x, y: u.y })),
  };
}

export function deserializeTeam(snap: TeamSnapshot): PlacedUnit[] {
  return snap.units.map((u, i) => ({
    uid: `snap-${snap.seat}-${i}`,
    defId: u.defId,
    star: u.star,
    items: [...u.items],
    x: u.x,
    y: u.y,
  }));
}

// Khoa cap chuan hoa, dung de so sanh voi recentPairs duoi moi dinh dang phan cach.
export function pairKey(a: number, b: number): string {
  const lo = Math.min(a, b); const hi = Math.max(a, b);
  return lo + ':' + hi;
}

function normalizeRecent(recentPairs: string[]): Set<string> {
  const set = new Set<string>();
  for (const s of recentPairs) {
    const nums = String(s).match(/\d+/g);
    if (nums && nums.length >= 2) set.add(pairKey(Number(nums[0]), Number(nums[1])));
    else set.add(String(s));
  }
  return set;
}

export function pairRound(players: RoomPlayer[], round: number, recentPairs: string[] = []): { a: number; b: number; ghost: boolean }[] {
  const aliveSeats = players.filter((p) => p.alive).map((p) => p.seat);
  if (aliveSeats.length < 2) return [];
  // Xao tron xac dinh theo round
  const rnd = mulberry32(hashSeed('pair' + round));
  const shuffled = [...aliveSeats];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
  }
  const recent = normalizeRecent(recentPairs);
  const pairs: { a: number; b: number; ghost: boolean }[] = [];
  const remaining = [...shuffled];
  while (remaining.length >= 2) {
    const a = remaining.shift()!;
    // Tim doi thu khong lap cap gan day neu co the
    let idx = remaining.findIndex((b) => !recent.has(pairKey(a, b)));
    if (idx === -1) idx = 0;
    const b = remaining.splice(idx, 1)[0];
    pairs.push({ a, b, ghost: false });
  }
  if (remaining.length === 1) {
    const a = remaining[0];
    // Ghost: lay 1 nguoi con song khac lam bong ma (uu tien khong lap cap, xac dinh)
    const candidates = aliveSeats.filter((s) => s !== a);
    let b = candidates.find((s) => !recent.has(pairKey(a, s)));
    if (b === undefined) b = candidates[0];
    pairs.push({ a, b: b!, ghost: true });
  }
  return pairs;
}

export function pairSeed(roomCode: string, round: number, a: number, b: number): number {
  const min = Math.min(a, b); const max = Math.max(a, b);
  return hashSeed(roomCode + ':' + round + ':' + min + ':' + max);
}

export function runPairBattle(snapLow: TeamSnapshot, snapHigh: TeamSnapshot, seed: number): PairBattleResult {
  // CANONICAL: snapLow (seat thap) luon la team 0 / player, snapHigh la team 1 / enemy.
  // Ca 2 client sap xep theo seat tang dan roi goi ham nay se nhan ket qua giong het.
  const result = simulateBattle(deserializeTeam(snapLow), deserializeTeam(snapHigh), snapLow.augments ?? [], seed);
  if (result.winner === 0) {
    return { winnerSeat: snapLow.seat, loserSeat: snapHigh.seat, winnerSurvivors: result.survivors, duration: result.duration };
  }
  return { winnerSeat: snapHigh.seat, loserSeat: snapLow.seat, winnerSurvivors: result.enemySurvivors, duration: result.duration };
}

export function damageForLoss(round: number, winnerSurvivors: number): number {
  return 2 + winnerSurvivors * 2 + Math.floor(round / 6);
}

export function applyPairResult(
  players: RoomPlayer[],
  pair: { a: number; b: number; ghost: boolean },
  result: { winnerSeat: number; loserSeat?: number; winnerSurvivors: number; duration?: number; round?: number },
  isGhostPair: boolean,
): RoomPlayer[] {
  const ghost = isGhostPair || pair.ghost;
  const loserSeat: number = result.loserSeat !== undefined ? result.loserSeat : (result.winnerSeat === pair.a ? pair.b : pair.a);
  const round: number = (result as any).round !== undefined ? (result as any).round : ((pair as any).round !== undefined ? (pair as any).round : 0);
  const damage: number = typeof (result as any).damage === 'number' ? (result as any).damage : damageForLoss(round, result.winnerSurvivors);
  return players.map((p) => {
    if (ghost) {
      // Tran ghost: chi a (nguoi that) bi tru khi a thua; b la bong ma, khong bi tru o tran nay.
      if (p.seat !== pair.a || loserSeat !== pair.a) return { ...p };
    } else {
      if (p.seat !== loserSeat) return { ...p };
    }
    const hp = Math.max(0, p.hp - damage);
    return { ...p, hp, alive: hp > 0 };
  });
}

// Hang cuoi cung: nguoi con song xep truoc (mau cao hon truoc),
// nguoi bi loai xep theo thu tu bi loai nguoc lai (bi loai cang muon hang cang cao).
export function rankings(players: RoomPlayer[], eliminationOrder: string[] = []): RoomPlayer[] {
  const elimIndex = new Map<string, number>();
  eliminationOrder.forEach((id, i) => elimIndex.set(id, i));
  return [...players].sort((x, y) => {
    if (x.alive !== y.alive) return x.alive ? -1 : 1;
    if (x.alive && y.alive) {
      if (y.hp !== x.hp) return y.hp - x.hp;
      return x.seat - y.seat;
    }
    const ex = elimIndex.has(x.id) ? elimIndex.get(x.id)! : -1;
    const ey = elimIndex.has(y.id) ? elimIndex.get(y.id)! : -1;
    if (ey !== ex) return ey - ex;
    if (y.hp !== x.hp) return y.hp - x.hp;
    return x.seat - y.seat;
  });
}

// Ban gon khong can eliminationOrder: song truoc, mau cao truoc, seat nho truoc khi hoa.
export function finalRanks(players: RoomPlayer[]): RoomPlayer[] {
  return rankings(players, []);
}

// --- Transport mock cho test headless ---
export interface Transport {
  send(type: string, payload: any): void;
  on(type: string, cb: (payload: any, fromId: string) => void): () => void;
}

export class MockHub {
  private handlers = new Map<string, Map<string, Set<(payload: any, fromId: string) => void>>>();

  connect(id: string): Transport {
    if (!this.handlers.has(id)) this.handlers.set(id, new Map());
    const hub = this;
    return {
      send(type: string, payload: any): void {
        // Broadcast toi TAT CA client khac, khong gui lai chinh minh
        for (const [otherId, byType] of hub.handlers.entries()) {
          if (otherId === id) continue;
          const set = byType.get(type);
          if (!set) continue;
          for (const cb of [...set]) cb(payload, id);
        }
      },
      on(type: string, cb: (payload: any, fromId: string) => void): () => void {
        let byType = hub.handlers.get(id);
        if (!byType) { byType = new Map(); hub.handlers.set(id, byType); }
        let set = byType.get(type);
        if (!set) { set = new Set(); byType.set(type, set); }
        set.add(cb);
        return () => { set!.delete(cb); };
      },
    };
  }
}
