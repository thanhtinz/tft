// Sinh WAV bang Node thuan cho ban NATIVE - Dau Truong Chibi
// Chay: node scripts/generate-audio.mjs
// Tao assets/audio/<sfx>.wav + bgm-home.wav + bgm-battle.wav
// WAV PCM 16-bit mono 22050Hz, tong hop tu cung bang not voi src/game/audio.ts.
// LUU Y: SFX_RENDER va BGM_RENDER duoi day PHAI giu dong bo voi SFX /
// BGM_TRACKS trong src/game/audio.ts (audio.ts la nguon phat tren web,
// script nay chi render ra file cho native qua expo-audio).
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'assets', 'audio');
const SAMPLE_RATE = 22050;

// ---- Bang render SFX (dong bo SFX trong audio.ts) ----
// Moi not: f tan so Hz, t tre (s), d dai (s), type dang song, g gain.
const n = (f, t, d, type = 'square', g = 0.22) => ({ f, t, d, type, g });
export const SFX_RENDER = {
  click: [n(880, 0, 0.06, 'square', 0.18)],
  coin: [n(987.77, 0, 0.08, 'square', 0.22), n(1318.51, 0.08, 0.22, 'square', 0.22)],
  sell: [n(1318.51, 0, 0.07, 'square', 0.2), n(987.77, 0.07, 0.18, 'square', 0.2)],
  place: [n(392, 0, 0.09, 'triangle', 0.3), n(523.25, 0.07, 0.12, 'triangle', 0.25)],
  reroll: [n(440, 0, 0.06, 'square', 0.18), n(554.37, 0.06, 0.06, 'square', 0.18), n(659.25, 0.12, 0.06, 'square', 0.18), n(880, 0.18, 0.12, 'square', 0.2)],
  starup: [n(523.25, 0, 0.1, 'triangle', 0.24), n(659.25, 0.09, 0.1, 'triangle', 0.24), n(783.99, 0.18, 0.1, 'triangle', 0.24), n(1046.5, 0.27, 0.24, 'triangle', 0.26)],
  levelup: [n(523.25, 0, 0.09, 'square', 0.2), n(659.25, 0.09, 0.09, 'square', 0.2), n(783.99, 0.18, 0.09, 'square', 0.2), n(1046.5, 0.27, 0.3, 'square', 0.22)],
  equip: [n(329.63, 0, 0.08, 'square', 0.2), n(493.88, 0.08, 0.14, 'square', 0.2)],
  start: [n(523.25, 0, 0.1, 'square', 0.2), n(523.25, 0.14, 0.1, 'square', 0.2), n(783.99, 0.28, 0.22, 'square', 0.24)],
  hit: [n(160, 0, 0.08, 'sawtooth', 0.28), n(110, 0.05, 0.09, 'square', 0.22)],
  cast: [n(600, 0, 0.07, 'sine', 0.22), n(750, 0.06, 0.07, 'sine', 0.22), n(950, 0.12, 0.07, 'sine', 0.22), n(1200, 0.18, 0.14, 'sine', 0.24)],
  win: [n(523.25, 0, 0.11, 'square', 0.2), n(659.25, 0.11, 0.11, 'square', 0.2), n(783.99, 0.22, 0.11, 'square', 0.2), n(1046.5, 0.33, 0.16, 'square', 0.22), n(783.99, 0.52, 0.11, 'square', 0.2), n(1046.5, 0.63, 0.3, 'square', 0.24)],
  lose: [n(392, 0, 0.16, 'triangle', 0.24), n(329.63, 0.16, 0.16, 'triangle', 0.24), n(261.63, 0.32, 0.16, 'triangle', 0.24), n(196, 0.48, 0.34, 'triangle', 0.24)],
  champion: [n(1046.5, 0, 0.07, 'sine', 0.22), n(1318.51, 0.07, 0.07, 'sine', 0.22), n(1567.98, 0.14, 0.16, 'sine', 0.24)],
  error: [n(185, 0, 0.11, 'sawtooth', 0.22), n(164.81, 0.13, 0.16, 'sawtooth', 0.22)],
};

// ---- Bang render BGM (dong bo BGM_TRACKS trong audio.ts) ----
// note = tan so Hz, len = so phach. Tong phach x (60/bpm) = do dai vong lap.
const b = (note, len) => ({ note, len });
export const BGM_RENDER = {
  home: {
    bpm: 96,
    notes: [
      b(523.25, 1), b(659.25, 1), b(783.99, 1), b(659.25, 1),
      b(698.46, 0.5), b(659.25, 0.5), b(587.33, 1), b(523.25, 1),
      b(440, 1), b(523.25, 1), b(659.25, 1), b(587.33, 1),
      b(493.88, 0.5), b(523.25, 0.5), b(587.33, 1), b(440, 1),
      b(523.25, 1), b(587.33, 1),
    ],
    bass: [
      b(130.81, 2), b(98, 2), b(110, 2), b(87.31, 2),
      b(130.81, 2), b(98, 2), b(110, 2), b(98, 2),
    ],
  },
  battle: {
    bpm: 132,
    notes: [
      b(659.25, 1), b(783.99, 1), b(1046.5, 0.5), b(783.99, 0.5), b(880, 1),
      b(783.99, 1), b(659.25, 1), b(587.33, 0.5), b(659.25, 0.5), b(587.33, 1),
      b(523.25, 1), b(587.33, 1), b(659.25, 0.5), b(783.99, 0.5), b(880, 1),
      b(1046.5, 1), b(880, 1), b(783.99, 0.5), b(659.25, 0.5), b(587.33, 1),
      b(659.25, 1), b(587.33, 1), b(523.25, 1), b(587.33, 1),
    ],
    bass: [
      b(110, 2), b(110, 2), b(87.31, 2), b(98, 2),
      b(110, 1), b(110, 1), b(130.81, 2), b(98, 2),
      b(110, 2), b(87.31, 2), b(98, 2),
    ],
  },
};

// ---- Tong hop song ----
function wave(type, phase) {
  switch (type) {
    case 'sine': return Math.sin(2 * Math.PI * phase);
    case 'square': return (phase % 1) < 0.5 ? 1 : -1;
    case 'triangle': return (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * phase));
    case 'sawtooth': return 2 * (phase - Math.floor(phase + 0.5));
    default: return Math.sin(2 * Math.PI * phase);
  }
}

// Envelope ADSR don gian: attack 10ms -> decay ve sustain 70% -> release 15% cuoi not.
function envelope(tInNote, dur) {
  const attack = 0.01, release = Math.min(0.05, dur * 0.3);
  if (tInNote < attack) return tInNote / attack;
  if (tInNote > dur - release) return Math.max(0, (dur - tInNote) / release) * 0.7 + 0.0;
  const decay = Math.min(1, (tInNote - attack) / 0.04);
  return 1 - 0.3 * decay; // 1.0 -> 0.7 sustain
}

function addNote(buf, freq, startSec, durSec, type, gain) {
  const start = Math.floor(startSec * SAMPLE_RATE);
  const count = Math.floor(durSec * SAMPLE_RATE);
  for (let i = 0; i < count && start + i < buf.length; i++) {
    const t = i / SAMPLE_RATE;
    buf[start + i] += wave(type, freq * t) * envelope(t, durSec) * gain;
  }
}

function renderSfx(notes) {
  const total = Math.max(...notes.map(x => x.t + x.d)) + 0.05;
  const buf = new Float32Array(Math.ceil(total * SAMPLE_RATE));
  for (const x of notes) addNote(buf, x.f, x.t, x.d, x.type, x.g);
  return buf;
}

function renderBgm(track) {
  const spb = 60 / track.bpm; // giay / phach
  const totalBeats = track.notes.reduce((s, x) => s + x.len, 0);
  const totalSec = totalBeats * spb;
  const buf = new Float32Array(Math.ceil(totalSec * SAMPLE_RATE));
  let t = 0;
  for (const x of track.notes) {
    addNote(buf, x.note, t, x.len * spb * 0.92, 'square', 0.32);
    t += x.len * spb;
  }
  let tb = 0;
  for (const x of (track.bass || [])) {
    addNote(buf, x.note, tb, x.len * spb * 0.92, 'triangle', 0.42);
    tb += x.len * spb;
  }
  return { buf, totalSec };
}

// ---- Ma hoa WAV PCM 16-bit mono ----
function encodeWav(samples) {
  // Chuan hoa dinh <= 0.92 de tranh clip khi chong not
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const scale = peak > 0.92 ? 0.92 / peak : 1;
  const dataSize = samples.length * 2;
  const out = Buffer.alloc(44 + dataSize);
  out.write('RIFF', 0); out.writeUInt32LE(36 + dataSize, 4); out.write('WAVE', 8);
  out.write('fmt ', 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); // PCM
  out.writeUInt16LE(1, 22); // mono
  out.writeUInt32LE(SAMPLE_RATE, 24); out.writeUInt32LE(SAMPLE_RATE * 2, 28);
  out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); // block align / bits
  out.write('data', 36); out.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i] * scale));
    out.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return out;
}

// ---- Sinh file ----
mkdirSync(OUT_DIR, { recursive: true });
const made = [];
for (const [name, notes] of Object.entries(SFX_RENDER)) {
  const file = join(OUT_DIR, `${name}.wav`);
  writeFileSync(file, encodeWav(renderSfx(notes)));
  made.push(file);
}
for (const [name, track] of Object.entries(BGM_RENDER)) {
  const file = join(OUT_DIR, `bgm-${name}.wav`);
  const { buf, totalSec } = renderBgm(track);
  writeFileSync(file, encodeWav(buf));
  console.log(`BGM ${name}: ${totalSec.toFixed(2)}s (${track.bpm} bpm, ${track.notes.length} not)`);
  made.push(file);
}
let totalBytes = 0;
for (const f of made) {
  const sz = statSync(f).size;
  totalBytes += sz;
  console.log(`${f.replace(ROOT + '/', '')} - ${sz} bytes`);
}
console.log(`\nDa sinh ${made.length} file WAV, tong ${(totalBytes / 1024).toFixed(1)} KB tai assets/audio/`);
