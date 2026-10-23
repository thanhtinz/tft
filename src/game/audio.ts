// He thong am thanh TONG HOP BANG CODE - Dau Truong Chibi
// Khong dung file nhac thuong mai:
// - WEB (ban chinh): Web Audio API thuan (oscillator + gain envelope),
//   SFX la chuoi not ngan, BGM la sequencer chiptune chay bang setInterval theo bpm.
// - NATIVE: khong co WebAudio thi thu lazy require('expo-audio') va phat
//   cac file wav sinh san tu assets/audio/<sfx>.wav / bgm-<track>.wav
//   (sinh bang scripts/generate-audio.mjs). Neu chua cai expo-audio hoac
//   chua co file thi no-op im lang, KHONG bao gio crash.
// - Moi truy cap window deu qua globalThis + guard nen import file nay
//   trong node/test/native deu an toan. File nay co y KHONG import
//   react-native de compile/test headless bang tsc thuan duoc.

// Ten dang song: tuong duong OscillatorType cua Web Audio nhung khai bao
// cuc bo de khong phu thuoc DOM lib khi compile headless.
export type WaveType = 'sine' | 'square' | 'triangle' | 'sawtooth';
type OscillatorType = WaveType;

export interface SfxNote { f: number; t: number; d: number; type: OscillatorType; g: number }
export interface SfxDef { notes: SfxNote[] }
export interface BgmNote { note: string | number; len: number }
export interface BgmTrack { bpm: number; notes: BgmNote[]; bass?: BgmNote[] }

export const SFX_NAMES = [
  'click', 'coin', 'sell', 'place', 'reroll', 'starup', 'levelup',
  'equip', 'start', 'hit', 'cast', 'win', 'lose', 'champion', 'error',
  'burst', 'freeze', 'heal', 'stun', 'sparkle',
] as const;
export type SfxName = (typeof SFX_NAMES)[number];
export type BgmName = 'home' | 'battle';

const N = (f: number, t: number, d: number, type: OscillatorType = 'square', g = 0.22): SfxNote => ({ f, t, d, type, g });

// Moi SFX: chuoi not ngan (tong thoi luong <= 1.5s), f = tan so Hz,
// t = do tre bat dau (s), d = thoi luong not (s), g = gain 0..1.
export const SFX: Record<SfxName, SfxDef> = {
  // Click UI: 1 tieng "tak" cao, rat ngan
  click: { notes: [N(880, 0, 0.06, 'square', 0.18)] },
  // Coin: 2 not cao noi tiep kieu nhan xu (B5 -> E6)
  coin: { notes: [N(987.77, 0, 0.08, 'square', 0.22), N(1318.51, 0.08, 0.22, 'square', 0.22)] },
  // Sell: coin dao nguoc (E6 -> B5) nghe nhu "tra xu"
  sell: { notes: [N(1318.51, 0, 0.07, 'square', 0.2), N(987.77, 0.07, 0.18, 'square', 0.2)] },
  // Place: dat tuong - tieng "thoc" tram + not xac nhan
  place: { notes: [N(392, 0, 0.09, 'triangle', 0.3), N(523.25, 0.07, 0.12, 'triangle', 0.25)] },
  // Reroll: 4 not leo nhanh kieu xoay shop
  reroll: { notes: [N(440, 0, 0.06, 'square', 0.18), N(554.37, 0.06, 0.06, 'square', 0.18), N(659.25, 0.12, 0.06, 'square', 0.18), N(880, 0.18, 0.12, 'square', 0.2)] },
  // Starup: hop am di len C-E-G-C (len sao)
  starup: { notes: [N(523.25, 0, 0.1, 'triangle', 0.24), N(659.25, 0.09, 0.1, 'triangle', 0.24), N(783.99, 0.18, 0.1, 'triangle', 0.24), N(1046.5, 0.27, 0.24, 'triangle', 0.26)] },
  // Levelup: fanfare ngan di len roi giu not cao
  levelup: { notes: [N(523.25, 0, 0.09, 'square', 0.2), N(659.25, 0.09, 0.09, 'square', 0.2), N(783.99, 0.18, 0.09, 'square', 0.2), N(1046.5, 0.27, 0.3, 'square', 0.22)] },
  // Equip: mac do - 2 not kim loai ngan
  equip: { notes: [N(329.63, 0, 0.08, 'square', 0.2), N(493.88, 0.08, 0.14, 'square', 0.2)] },
  // Start: bat dau tran - "san sang... di!"
  start: { notes: [N(523.25, 0, 0.1, 'square', 0.2), N(523.25, 0.14, 0.1, 'square', 0.2), N(783.99, 0.28, 0.22, 'square', 0.24)] },
  // Hit: danh trung - tieng tram thap kieu "bop"
  hit: { notes: [N(160, 0, 0.08, 'sawtooth', 0.28), N(110, 0.05, 0.09, 'square', 0.22)] },
  // Cast: tung chieu - quet tan so di len bang not sine lien tiep
  cast: { notes: [N(600, 0, 0.07, 'sine', 0.22), N(750, 0.06, 0.07, 'sine', 0.22), N(950, 0.12, 0.07, 'sine', 0.22), N(1200, 0.18, 0.14, 'sine', 0.24)] },
  // Win: giai dieu thang ngan vui tuoi
  win: { notes: [N(523.25, 0, 0.11, 'square', 0.2), N(659.25, 0.11, 0.11, 'square', 0.2), N(783.99, 0.22, 0.11, 'square', 0.2), N(1046.5, 0.33, 0.16, 'square', 0.22), N(783.99, 0.52, 0.11, 'square', 0.2), N(1046.5, 0.63, 0.3, 'square', 0.24)] },
  // Lose: giai dieu di xuong buon
  lose: { notes: [N(392, 0, 0.16, 'triangle', 0.24), N(329.63, 0.16, 0.16, 'triangle', 0.24), N(261.63, 0.32, 0.16, 'triangle', 0.24), N(196, 0.48, 0.34, 'triangle', 0.24)] },
  // Champion: chon tuong - tia sang lap lanh cao
  champion: { notes: [N(1046.5, 0, 0.07, 'sine', 0.22), N(1318.51, 0.07, 0.07, 'sine', 0.22), N(1567.98, 0.14, 0.16, 'sine', 0.24)] },
  // Error: thao tac sai - 2 tieng "e e" thap
  error: { notes: [N(185, 0, 0.11, 'sawtooth', 0.22), N(164.81, 0.13, 0.16, 'sawtooth', 0.22)] },
  // Burst: no manh nhat (dung cho skillKind aoe/burst) - bum tram sau + vet rac cao o dau
  burst: { notes: [N(72, 0, 0.3, 'sawtooth', 0.32), N(55, 0.02, 0.36, 'square', 0.28), N(196, 0, 0.12, 'sawtooth', 0.2), N(392, 0.03, 0.08, 'square', 0.14)] },
  // Freeze: lanh, cao, long lanh kieu tinh the bang - chuoi sine cao roi tan dan
  freeze: { notes: [N(1567.98, 0, 0.09, 'sine', 0.22), N(1318.51, 0.07, 0.09, 'sine', 0.22), N(1760, 0.14, 0.1, 'sine', 0.2), N(2093, 0.21, 0.18, 'sine', 0.18), N(1046.5, 0.21, 0.14, 'triangle', 0.12)] },
  // Heal (SFX): hoi phuc am ap - hop am triangle di len nhe nhang (khac han 'heal' event cua engine)
  heal: { notes: [N(523.25, 0, 0.12, 'triangle', 0.22), N(659.25, 0.09, 0.12, 'triangle', 0.22), N(783.99, 0.18, 0.2, 'sine', 0.22)] },
  // Stun (SFX): choang - "boing" tram lung khuyn + rung ngan
  stun: { notes: [N(146.83, 0, 0.12, 'sawtooth', 0.26), N(130.81, 0.1, 0.12, 'square', 0.22), N(196, 0.2, 0.09, 'square', 0.18), N(185, 0.29, 0.14, 'square', 0.16)] },
  // Sparkle: cau loot roi/trung thuong - arpeggio di len 4 not lap lanh (dai hon 'coin' 2 not)
  sparkle: { notes: [N(987.77, 0, 0.07, 'sine', 0.22), N(1318.51, 0.06, 0.07, 'sine', 0.22), N(1567.98, 0.12, 0.08, 'sine', 0.23), N(2093, 0.18, 0.2, 'sine', 0.24)] },
};

// Anh xa loai ky nang (SkillKind trong data.ts / skillKind tren BattleEvent) -> SFX phu hop.
// Chi tra ve ten DA CO trong SFX_NAMES; khong ro/loai con lai -> 'cast' mac dinh nhu cu.
// GameScreen pha sau: audio.playSfx(skillSfxName(e.skillKind)) khi co event 'cast',
// va audio.playSfx('sparkle') khi cau loot (OrbFlight) cham dich / ha dich PvE roi cau.
export function skillSfxName(skillKind?: string): SfxName {
  const k = (skillKind ?? '').trim().toLowerCase();
  if (!k) return 'cast';
  if (k === 'freeze' || k.includes('freeze') || k.includes('frost') || k.includes('ice')) return 'freeze';
  if (k === 'aoe' || k === 'burst' || k.includes('aoe') || k.includes('burst') || k.includes('explod') || k.includes('bomb')) return 'burst';
  if (k === 'heal' || k === 'shield' || k.includes('heal') || k.includes('shield')) return 'heal';
  if (k === 'stun' || k.includes('stun')) return 'stun';
  // buffAS / summon / execute / poison / lifesteal / dash va moi loai khac: giu 'cast'
  return 'cast';
}

// BGM dang sequencer chiptune: note = tan so Hz (number), len = so phach
// (1 = not den). Giai dieu + bass deu lap lien mach theo tong so phach.
// LUU Y: giu dong bo bang not nay voi scripts/generate-audio.mjs.
const B = (note: number, len: number): BgmNote => ({ note, len });

export const BGM_TRACKS: Record<BgmName, BgmTrack> = {
  // Home: nhe nhang, cham (96 bpm), tong dai C-major am ap, tong 16 phach/vong
  home: {
    bpm: 96,
    notes: [
      B(523.25, 1), B(659.25, 1), B(783.99, 1), B(659.25, 1),
      B(698.46, 0.5), B(659.25, 0.5), B(587.33, 1), B(523.25, 1),
      B(440, 1), B(523.25, 1), B(659.25, 1), B(587.33, 1),
      B(493.88, 0.5), B(523.25, 0.5), B(587.33, 1), B(440, 1),
      B(523.25, 1), B(587.33, 1),
    ],
    bass: [
      B(130.81, 2), B(98, 2), B(110, 2), B(87.31, 2),
      B(130.81, 2), B(98, 2), B(110, 2), B(98, 2),
    ],
  },
  // Battle: nhanh, hao hung (132 bpm), tong 24 phach/vong
  battle: {
    bpm: 132,
    notes: [
      B(659.25, 1), B(783.99, 1), B(1046.5, 0.5), B(783.99, 0.5), B(880, 1),
      B(783.99, 1), B(659.25, 1), B(587.33, 0.5), B(659.25, 0.5), B(587.33, 1),
      B(523.25, 1), B(587.33, 1), B(659.25, 0.5), B(783.99, 0.5), B(880, 1),
      B(1046.5, 1), B(880, 1), B(783.99, 0.5), B(659.25, 0.5), B(587.33, 1),
      B(659.25, 1), B(587.33, 1), B(523.25, 1), B(587.33, 1),
    ],
    bass: [
      B(110, 2), B(110, 2), B(87.31, 2), B(98, 2),
      B(110, 1), B(110, 1), B(130.81, 2), B(98, 2),
      B(110, 2), B(87.31, 2), B(98, 2),
    ],
  },
};

// ---------- Tien ich moi truong ----------
const g: any = globalThis as any;

function webWindow(): any | null {
  if (typeof g.window === 'undefined' || !g.window) return null;
  return g.window;
}
function hasWebAudio(): boolean {
  const w = webWindow();
  return !!w && ('AudioContext' in w || 'webkitAudioContext' in w);
}

// Lazy require cho native: trong ESM/node khong co require toan cuc nen
// phai guard typeof; trong Metro/Babel thi require ton tai nhu global.
function lazyRequire(mod: string): any | null {
  try {
    const req = typeof g.require === 'function' ? g.require : null;
    if (!req) return null;
    return req(mod);
  } catch { return null; }
}

export class AudioMan {
  musicEnabled = true;
  sfxEnabled = true;
  currentBgm: BgmName | null = null;

  private ctx: any = null;
  private bgmTimer: any = null;
  private melodyIdx = 0;
  private melodyWait = 0;
  private bassIdx = 0;
  private bassWait = 0;
  private nativeBgmPlayer: any = null;
  private nativeModule: any | undefined = undefined; // undefined = chua thu load

  isMusicEnabled(): boolean { return this.musicEnabled; }
  isSfxEnabled(): boolean { return this.sfxEnabled; }

  // Goi sau tuong tac nguoi dung dau tien (tap/click) de mo khoa AudioContext.
  unlock(): void {
    if (hasWebAudio()) {
      try {
        const ctx = this.ensureCtx();
        if (ctx && ctx.state === 'suspended' && typeof ctx.resume === 'function') {
          const p = ctx.resume();
          if (p && typeof p.catch === 'function') p.catch(() => undefined);
        }
      } catch { /* no-op */ }
      return;
    }
    // Native: nap san module (khong phat tieng nao) de lan phat sau nhanh hon.
    this.loadNative();
  }

  setMusicEnabled(b: boolean): void {
    this.musicEnabled = !!b;
    if (!this.musicEnabled) this.stopBgm();
  }
  setSfxEnabled(b: boolean): void { this.sfxEnabled = !!b; }

  playSfx(name: SfxName | string): void {
    if (!this.sfxEnabled) return;
    const def = (SFX as Record<string, SfxDef>)[name];
    if (!def) return;
    if (hasWebAudio()) {
      const ctx = this.ensureCtx();
      if (!ctx) return;
      try {
        const t0 = ctx.currentTime + 0.01;
        for (const n of def.notes) this.tone(ctx, n.f, t0 + n.t, n.d, n.type, n.g);
      } catch { /* no-op */ }
      return;
    }
    this.playNativeFile(`${name}.wav`, false);
  }

  startBgm(track: BgmName): void {
    if (!this.musicEnabled) return;
    if (this.currentBgm === track && (this.bgmTimer || this.nativeBgmPlayer)) return;
    this.stopBgmInternal();
    const def = BGM_TRACKS[track];
    if (!def) return;
    this.currentBgm = track;

    if (hasWebAudio()) {
      const ctx = this.ensureCtx();
      if (!ctx) { this.currentBgm = null; return; }
      // Scheduler: tick = not kep (1/2 phach). Moi tick phat not giai dieu
      // va/hoac not bass khi bo dem cho cua chung ve 0.
      this.melodyIdx = 0; this.melodyWait = 0;
      this.bassIdx = 0; this.bassWait = 0;
      const stepMs = (60 / def.bpm) * 0.5 * 1000;
      const tick = () => {
        try {
          if (ctx.state === 'suspended' && typeof ctx.resume === 'function') ctx.resume();
          if (this.melodyWait <= 0) {
            const bn = def.notes[this.melodyIdx % def.notes.length];
            const f = typeof bn.note === 'number' ? bn.note : parseFloat(String(bn.note));
            if (isFinite(f) && f > 0) this.tone(ctx, f, ctx.currentTime + 0.02, Math.min(bn.len * (60 / def.bpm) * 0.92, 1.2), 'square', 0.11);
            this.melodyWait = Math.max(1, Math.round(bn.len * 2));
            this.melodyIdx++;
          }
          if (def.bass && def.bass.length) {
            if (this.bassWait <= 0) {
              const bn = def.bass[this.bassIdx % def.bass.length];
              const f = typeof bn.note === 'number' ? bn.note : parseFloat(String(bn.note));
              if (isFinite(f) && f > 0) this.tone(ctx, f, ctx.currentTime + 0.02, Math.min(bn.len * (60 / def.bpm) * 0.92, 1.4), 'triangle', 0.16);
              this.bassWait = Math.max(1, Math.round(bn.len * 2));
              this.bassIdx++;
            }
            this.bassWait--;
          }
          this.melodyWait--;
        } catch { /* bo qua tick loi, vong lap van tiep tuc */ }
      };
      tick();
      this.bgmTimer = g.setInterval ? g.setInterval(tick, stepMs) : null;
      return;
    }
    // Native: phat file bgm-<track>.wav dang lap (neu co expo-audio + file).
    this.nativeBgmPlayer = this.playNativeFile(`bgm-${track}.wav`, true);
    if (!this.nativeBgmPlayer) this.currentBgm = track; // van ghi nhan lua chon, phat no-op
  }

  stopBgm(): void {
    this.stopBgmInternal();
    this.currentBgm = null;
  }

  // ---------- noi bo ----------
  private stopBgmInternal(): void {
    if (this.bgmTimer) {
      try { if (g.clearInterval) g.clearInterval(this.bgmTimer); } catch { /* no-op */ }
      this.bgmTimer = null;
    }
    if (this.nativeBgmPlayer) {
      try {
        if (typeof this.nativeBgmPlayer.pause === 'function') this.nativeBgmPlayer.pause();
        if (typeof this.nativeBgmPlayer.remove === 'function') this.nativeBgmPlayer.remove();
      } catch { /* no-op */ }
      this.nativeBgmPlayer = null;
    }
  }

  private ensureCtx(): any | null {
    if (this.ctx) return this.ctx;
    const w = webWindow();
    if (!w) return null;
    try {
      const AC = w.AudioContext || w.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      return this.ctx;
    } catch { return null; }
  }

  // Phat 1 not bang oscillator + gain envelope (attack nhanh, decay mu).
  private tone(ctx: any, freq: number, start: number, dur: number, type: WaveType, gain: number): void {
    const osc = ctx.createOscillator();
    const gn = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gn.gain.setValueAtTime(0.0001, start);
    gn.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), start + 0.012);
    gn.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(dur, 0.03));
    osc.connect(gn);
    gn.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + Math.max(dur, 0.03) + 0.05);
  }

  private loadNative(): any | null {
    if (this.nativeModule !== undefined) return this.nativeModule;
    // Chi thu expo-audio khi KHONG co WebAudio (native that).
    this.nativeModule = lazyRequire('expo-audio');
    return this.nativeModule;
  }

  // Native: phat assets/audio/<file> bang expo-audio (API createAudioPlayer
  // cua expo-audio SDK 58; tuong thich nguoc playAsync cua Audio.Sound neu co).
  // File duoc require dong trong try/catch: Metro khong resolve duoc thi
  // bo qua im lang. Tra ve player (cho BGM de dung/lap) hoac null.
  private playNativeFile(file: string, loop: boolean): any | null {
    try {
      const mod = this.loadNative();
      if (!mod) return null;
      const req = typeof g.require === 'function' ? g.require : null;
      if (!req) return null;
      let source: any = null;
      try { source = req(`../assets/audio/${file}`); } catch { return null; }
      if (!source) return null;
      if (typeof mod.createAudioPlayer === 'function') {
        const player = mod.createAudioPlayer(source);
        try { player.loop = !!loop; } catch { /* no-op */ }
        if (typeof player.play === 'function') player.play();
        return player;
      }
      if (mod.Audio && typeof mod.Audio.Sound === 'function') {
        const sound = new mod.Audio.Sound();
        const p = sound.loadAsync(source, { shouldPlay: true, isLooping: !!loop });
        if (p && typeof p.catch === 'function') p.catch(() => undefined);
        return { pause: () => { try { sound.pauseAsync(); } catch { /* no-op */ } }, remove: () => { try { sound.unloadAsync(); } catch { /* no-op */ } } };
      }
      return null;
    } catch { return null; }
  }
}

export const audio = new AudioMan();
