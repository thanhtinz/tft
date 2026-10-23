// OnlineMatch: dieu phoi tran PvP online tren Supabase Realtime (Broadcast + Presence).
// Mo hinh host-authoritative:
//  - Chu phong (host) gan ghe, lap bot vao ghe trong, phat vong (plan) va ghep cap.
//  - Moi client gui SNAPSHOT doi hinh cua minh; host phat lai toan bo snapshot + cap dau + seed.
//  - Moi client tu mo phong tran cua minh bang battle engine voi SEED chung (deterministic,
//    thu tu canonical: ghe thap lam team 0) nen 2 phia cung mot cap ra ket qua giong het.
//  - Client gui ket qua ve host; host doi chieu bang cach tu mo phong lai (co moi snapshot),
//    tong hop mau ca 8 nguoi va phat bang xep hang moi vong.
//  - Host roi phong giua tran: nguoi choi that con ket noi co ghe thap nhat tiep quan (host migration),
//    trang thai bang xep hang da duoc moi client luu tu cac ban phat standings nen tran khong vo.
//  - Nguoi choi roi phong: ghe do duoc AI dieu khien tiep (host sinh doi hinh bot cho ghe do).
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { BOT_NAMES } from './data';
import { PlacedUnit, isPveRound, makeAiTeam, pveEnemiesForRound, simulateBattle } from './engine';
import { RoomPlayer, TeamSnapshot, applyPairResult, damageForLoss, deserializeTeam, makeRoomCode, pairRound, pairSeed, rankings, runPairBattle, serializeTeam } from './online';

export const PLAN_SECONDS = 40;
export const BATTLE_WATCH_SECONDS = 24;

export interface BattleInfo {
  round: number; pve: boolean; mySeat: number;
  pairs: { a: number; b: number; ghost: boolean; seed: number }[];
  snaps: Record<number, TeamSnapshot>;
  myPair?: { a: number; b: number; ghost: boolean; seed: number };
}
export interface StandingsInfo { players: RoomPlayer[]; round: number; finished: boolean; ranks: Record<string, number>; }
export interface MatchEvents {
  onLobby?: (players: RoomPlayer[], mySeat: number, isHost: boolean) => void;
  onStart?: (players: RoomPlayer[]) => void;
  onPlan?: (round: number, seconds: number) => void;
  onBattle?: (info: BattleInfo) => void;
  onStandings?: (s: StandingsInfo) => void;
  onNotice?: (text: string) => void;
  onHostChange?: (isHost: boolean) => void;
  onError?: (text: string) => void;
}

interface Msg { t: string; from: string; [k: string]: any; }

export class OnlineMatch {
  code = ''; myId = ''; myName = ''; mySeat = -1; isHost = false;
  players: RoomPlayer[] = []; round = 1; started = false; finished = false;
  private ch: RealtimeChannel | null = null;
  private ev: MatchEvents;
  private seatById = new Map<string, number>();
  private snaps = new Map<number, TeamSnapshot>();
  private lastSnapBySeat = new Map<number, TeamSnapshot>();
  private recentPairs: string[] = [];
  private eliminationOrder: string[] = [];
  private botControlled = new Set<number>();
  private timers: ReturnType<typeof setTimeout>[] = [];
  private hostId = '';
  private planStartedAt = 0;
  private gotStart = false;

  constructor(events: MatchEvents) { this.ev = events; }
  private later(fn: () => void, ms: number) { const t = setTimeout(fn, ms); this.timers.push(t); return t; }
  private notice(s: string) { this.ev.onNotice?.(s); }

  // ---------- Ket noi phong ----------
  async createRoom(player: { id: string; name: string }, fixedCode?: string): Promise<string> {
    this.code = fixedCode ? fixedCode.toUpperCase() : makeRoomCode(Math.random); this.isHost = true; this.hostId = player.id;
    await this.connect(player); return this.code;
  }
  async joinRoom(code: string, player: { id: string; name: string }): Promise<void> {
    this.code = code.trim().toUpperCase(); this.isHost = false;
    await this.connect(player);
    this.send({ t: 'hello' });
  }
  private async connect(player: { id: string; name: string }) {
    const sb = getSupabase(); if (!sb) throw new Error('Chưa cấu hình Supabase');
    this.myId = player.id; this.myName = player.name;
    const ch = sb.channel('dtc-room-' + this.code, { config: { broadcast: { self: false }, presence: { key: player.id } } });
    this.ch = ch;
    ch.on('broadcast', { event: 'msg' }, ({ payload }) => this.onMsg(payload as Msg));
    ch.on('presence', { event: 'sync' }, () => this.onPresenceSync());
    ch.on('presence', { event: 'leave' }, ({ leftPresences }) => this.onPresenceLeave(leftPresences as any[]));
    await ch.subscribe(async (status) => { if (status === 'SUBSCRIBED') { await ch.track({ name: player.name, at: Date.now() }); if (this.isHost) this.hostSyncLobby(); } });
  }
  private send(m: Omit<Msg, 'from'>) { this.ch?.send({ type: 'broadcast', event: 'msg', payload: { ...m, from: this.myId } }); }
  async leave() { this.timers.forEach(clearTimeout); this.timers = []; try { await this.ch?.untrack(); await this.ch?.unsubscribe(); } catch {} this.ch = null; }

  // ---------- Lobby ----------
  private presenceHumans(): { id: string; name: string }[] {
    if (!this.ch) return [];
    const st = this.ch.presenceState() as Record<string, any[]>;
    return Object.entries(st).map(([id, arr]) => ({ id, name: (arr[0]?.name as string) || 'Người chơi' }));
  }
  private hostSyncLobby() {
    if (!this.isHost || this.started) return;
    const humans = this.presenceHumans();
    for (const h of humans) if (!this.seatById.has(h.id)) { const used = new Set(this.seatById.values()); let s = 0; while (used.has(s)) s++; this.seatById.set(h.id, s); }
    const bySeat = new Map<number, RoomPlayer>();
    for (const h of humans) { const seat = this.seatById.get(h.id)!; bySeat.set(seat, { id: h.id, name: h.name, seat, hp: 100, alive: true, isBot: false, connected: true }); }
    const out: RoomPlayer[] = [];
    for (let seat = 0; seat < 8; seat++) out.push(bySeat.get(seat) ?? { id: 'bot-' + seat, name: BOT_NAMES[seat % BOT_NAMES.length] + ' (AI)', seat, hp: 100, alive: true, isBot: true, connected: false });
    this.players = out; this.mySeat = this.seatById.get(this.myId) ?? 0;
    this.send({ t: 'lobby', players: out });
    this.ev.onLobby?.(out, this.mySeat, true);
  }
  startGame() {
    if (!this.isHost || this.started) return;
    this.started = true; this.round = 1;
    this.send({ t: 'start', players: this.players });
    this.ev.onStart?.(this.players);
    this.later(() => this.hostStartRound(), 1200);
  }

  // ---------- Vong dau (host) ----------
  private hostStartRound() {
    if (!this.isHost || this.finished) return;
    this.snaps.clear();
    this.send({ t: 'plan', round: this.round, seconds: PLAN_SECONDS });
    this.ev.onPlan?.(this.round, PLAN_SECONDS);
    this.planStartedAt = Date.now();
    this.later(() => this.hostCollectAndBattle(), (PLAN_SECONDS + 4) * 1000);
  }
  submitSnapshot(units: PlacedUnit[], level: number, augments: string[]) {
    const snap = serializeTeam(units, { playerId: this.myId, name: this.myName, seat: this.mySeat, round: this.round, level, augments });
    if (this.isHost) { this.snaps.set(this.mySeat, snap); this.lastSnapBySeat.set(this.mySeat, snap); }
    else this.send({ t: 'snapshot', snap });
  }
  private hostTeamFor(seat: number): TeamSnapshot {
    const p = this.players.find(x => x.seat === seat)!;
    const existing = this.snaps.get(seat) ?? this.lastSnapBySeat.get(seat);
    if (existing && !p.isBot && !this.botControlled.has(seat)) return existing;
    // Bot / nguoi roi phong / khong gui kip: host sinh doi hinh AI cho ghe do
    const units = makeAiTeam(this.round, seat * 7 + this.round);
    const snap = serializeTeam(units, { playerId: p.id, name: p.name, seat, round: this.round, level: 1 + Math.min(8, Math.floor(this.round / 2)), augments: [] });
    this.snaps.set(seat, snap); return snap;
  }
  private hostCollectAndBattle() {
    if (!this.isHost || this.finished) return;
    const alive = this.players.filter(p => p.alive);
    const snaps: Record<number, TeamSnapshot> = {};
    for (const p of alive) snaps[p.seat] = this.hostTeamFor(p.seat);
    for (const p of this.players) if (!p.alive && this.lastSnapBySeat.has(p.seat)) snaps[p.seat] = this.lastSnapBySeat.get(p.seat)!;
    const pve = isPveRound(this.round);
    let pairs: BattleInfo['pairs'] = [];
    if (!pve) {
      const rawPairs = pairRound(alive, this.round, this.recentPairs);
      this.recentPairs = [...rawPairs.map(p => [Math.min(p.a, p.b), Math.max(p.a, p.b)].join('-')), ...this.recentPairs].slice(0, 24);
      pairs = rawPairs.map(p => ({ ...p, seed: pairSeed(this.code, this.round, p.a, p.b) }));
      // Host tu mo phong toan bo cap de tong hop (client se tu mo phong lai va doi chieu)
      let next = this.players.map(p => ({ ...p }));
      for (const pr of pairs) {
        const low = Math.min(pr.a, pr.b), high = Math.max(pr.a, pr.b);
        const res = runPairBattle(snaps[low], snaps[high], pr.seed);
        next = applyPairResult(next, pr, { ...res, round: this.round }, pr.ghost);
      }
      this.commitStandings(next);
    }
    const info: BattleInfo = { round: this.round, pve, mySeat: this.mySeat, pairs, snaps, myPair: pairs.find(p => p.a === this.mySeat || (!p.ghost && p.b === this.mySeat)) };
    this.send({ t: 'battle', round: this.round, pve, pairs, snaps });
    this.ev.onBattle?.(info);
    if (pve) {
      // PvE: moi nguoi tu danh quai, gui ket qua; host tong hop sau khi het thoi gian xem tran
      this.later(() => this.hostPveStandings(snaps), BATTLE_WATCH_SECONDS * 1000);
    } else {
      this.later(() => this.hostBroadcastStandings(), BATTLE_WATCH_SECONDS * 1000);
    }
  }
  private pveResults = new Map<number, { win: boolean; enemySurvivors: number }>();
  reportPve(win: boolean, enemySurvivors: number) {
    if (this.isHost) this.pveResults.set(this.mySeat, { win, enemySurvivors });
    else this.send({ t: 'pve-result', seat: this.mySeat, win, enemySurvivors });
  }
  reportResult(pair: { a: number; b: number }, winnerSeat: number, winnerSurvivors: number) {
    if (!this.isHost) this.send({ t: 'result', round: this.round, pair, winnerSeat, winnerSurvivors });
  }
  private hostPveStandings(snaps: Record<number, TeamSnapshot>) {
    if (!this.isHost || this.finished) return;
    let next = this.players.map(p => ({ ...p }));
    for (const p of next) {
      if (!p.alive) continue;
      let r = this.pveResults.get(p.seat);
      if (!r) { // Khong nhan duoc bao cao: host tu mo phong bang snapshot cua ghe do
        const res = simulateBattle(deserializeTeam(snaps[p.seat]), pveEnemiesForRound(this.round), snaps[p.seat].augments, pairSeed(this.code, this.round, p.seat, 99));
        r = { win: res.winner === 0, enemySurvivors: res.enemySurvivors };
      }
      if (!r.win) { const dmg = damageForLoss(this.round, r.enemySurvivors); p.hp = Math.max(0, p.hp - dmg); p.alive = p.hp > 0; }
    }
    this.pveResults.clear();
    this.commitStandings(next);
    this.hostBroadcastStandings();
  }
  private pendingStandings: StandingsInfo | null = null;
  private commitStandings(next: RoomPlayer[]) {
    for (const p of next) if (!p.alive && this.players.find(x => x.seat === p.seat)?.alive) this.eliminationOrder.push(p.id);
    this.players = next;
    const aliveCount = next.filter(p => p.alive).length;
    const humansAlive = next.filter(p => p.alive && !p.isBot).length;
    this.finished = aliveCount <= 1 || humansAlive === 0;
    const ranks = this.finished ? Object.fromEntries(rankings(next, this.eliminationOrder).map((p, i) => [p.id, i + 1])) : Object.fromEntries(next.map(p => [p.id, 0]));
    this.pendingStandings = { players: next, round: this.round, finished: this.finished, ranks };
  }
  private hostBroadcastStandings() {
    if (!this.isHost || !this.pendingStandings) return;
    const s = this.pendingStandings; this.pendingStandings = null;
    this.send({ t: 'standings', standings: s });
    this.ev.onStandings?.(s);
    if (!s.finished) { this.round = s.round + 1; this.later(() => this.hostStartRound(), 3500); }
  }

  // ---------- Nhan thong diep ----------
  private onMsg(m: Msg) {
    if (m.from === this.myId) return;
    switch (m.t) {
      case 'hello': if (this.isHost && !this.started) this.hostSyncLobby(); break;
      case 'lobby': if (!this.isHost) { this.players = m.players; const me = (m.players as RoomPlayer[]).find(p => p.id === this.myId); this.mySeat = me?.seat ?? -1; this.hostId = m.from; this.ev.onLobby?.(m.players, this.mySeat, false); } break;
      case 'start': if (!this.gotStart) { this.gotStart = true; this.started = true; this.players = m.players; this.ev.onStart?.(m.players); } break;
      case 'plan': this.round = m.round; this.planStartedAt = Date.now(); this.ev.onPlan?.(m.round, m.seconds); break;
      case 'snapshot': if (this.isHost) { const snap = m.snap as TeamSnapshot; this.snaps.set(snap.seat, snap); this.lastSnapBySeat.set(snap.seat, snap); } break;
      case 'battle': { const info: BattleInfo = { round: m.round, pve: m.pve, mySeat: this.mySeat, pairs: m.pairs, snaps: m.snaps, myPair: (m.pairs as BattleInfo['pairs']).find(p => p.a === this.mySeat || (!p.ghost && p.b === this.mySeat)) }; this.ev.onBattle?.(info); break; }
      case 'result': break; // Host da tu mo phong lai de doi chieu; ket qua host la chuan cuoi
      case 'pve-result': if (this.isHost) this.pveResults.set(m.seat, { win: m.win, enemySurvivors: m.enemySurvivors }); break;
      case 'standings': { const s = m.standings as StandingsInfo; this.players = s.players; if (!s.finished) this.round = s.round + 1; this.finished = s.finished; this.ev.onStandings?.(s); break; }
      case 'notice': this.notice(m.text); break;
      case 'host-takeover': this.hostId = m.from; this.notice(m.text || 'Chủ phòng mới đã tiếp quản trận đấu.'); break;
    }
  }
  private onPresenceSync() { if (this.isHost && !this.started) this.hostSyncLobby(); }
  private onPresenceLeave(left: any[]) {
    if (!this.ch) return;
    const presentIds = new Set(this.presenceHumans().map(h => h.id));
    for (const lp of left ?? []) {
      const leftId = lp.presence_ref ? Object.keys(this.ch.presenceState()).find(k => !presentIds.has(k) && k !== this.myId) : undefined;
      void leftId;
    }
    // Nguoi roi phong trong tran: ghe chuyen cho AI (host xu ly khi sinh doi hinh)
    for (const p of this.players) {
      if (!p.isBot && p.id !== this.myId && !presentIds.has(p.id) && p.connected) {
        p.connected = false; this.botControlled.add(p.seat);
        if (this.started) this.notice(`${p.name} đã mất kết nối — AI sẽ điều khiển ghế này.`);
        if (this.isHost) this.send({ t: 'notice', text: `${p.name} đã mất kết nối — AI sẽ điều khiển ghế này.` });
      }
    }
    // Host roi phong: nguoi that con ket noi ghe thap nhat tiep quan
    if (this.started && !this.finished && this.hostId && !presentIds.has(this.hostId) && !this.isHost) {
      const candidates = this.players.filter(p => !p.isBot && p.connected && presentIds.has(p.id)).sort((a, b) => a.seat - b.seat);
      if (candidates.length && candidates[0].id === this.myId) {
        this.isHost = true; this.hostId = this.myId; this.ev.onHostChange?.(true);
        this.send({ t: 'host-takeover', text: `${this.myName} là chủ phòng mới và tiếp tục trận đấu.` });
        this.notice('Chủ phòng cũ đã rời — bạn tiếp quản trận đấu.');
        this.later(() => this.hostStartRound(), 4000);
      } else if (candidates.length) { this.hostId = candidates[0].id; }
    }
    if (!this.started && this.isHost) this.hostSyncLobby();
  }
}

// Ghe nhanh: dung kenh cho doi cong khai (Presence). Nguoi cho lau nhat lam chu phong,
// tao ma phong va moi cac nguoi con lai vao phong do.
export async function quickMatch(player: { id: string; name: string }, onStatus: (s: string) => void): Promise<{ code: string; isHost: boolean }> {
  const sb = getSupabase(); if (!sb) throw new Error('Chưa cấu hình Supabase');
  return new Promise((resolve, reject) => {
    const ch = sb.channel('dtc-lobby-v1', { config: { broadcast: { self: false }, presence: { key: player.id } } });
    let done = false; const myTs = Date.now();
    const finish = async (r: { code: string; isHost: boolean }) => { if (done) return; done = true; try { await ch.untrack(); await ch.unsubscribe(); } catch {} resolve(r); };
    ch.on('broadcast', { event: 'qm' }, ({ payload }) => {
      if (payload && payload.hostId !== player.id && payload.ts >= myTs - 30000) { onStatus('Đã tìm thấy phòng, đang vào...'); finish({ code: payload.code, isHost: false }); }
    });
    ch.on('presence', { event: 'sync' }, async () => {
      if (done) return;
      const st = ch.presenceState() as Record<string, any[]>;
      const waiting = Object.entries(st).map(([id, arr]) => ({ id, ts: (arr[0]?.ts as number) || 0, name: arr[0]?.name })).filter(w => w.ts > 0).sort((a, b) => a.ts - b.ts);
      const oldest = waiting[0];
      if (oldest && oldest.id === player.id && Date.now() - myTs > 2500) {
        const code = makeRoomCode(Math.random);
        onStatus('Bạn là người chờ lâu nhất — đang tạo phòng mới...');
        await ch.send({ type: 'broadcast', event: 'qm', payload: { code, hostId: player.id, ts: myTs } });
        finish({ code, isHost: true });
      }
    });
    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') { onStatus('Đang tìm người chơi khác...'); await ch.track({ name: player.name, ts: myTs }); }
    });
    setTimeout(() => { if (!done) { const code = makeRoomCode(Math.random); onStatus('Chưa có ai đang chờ — tạo phòng mới cho bạn.'); finish({ code, isHost: true }); } }, 9000);
    setTimeout(() => { if (!done) reject(new Error('Hết thời gian chờ ghép nhanh')); }, 20000);
  });
}
