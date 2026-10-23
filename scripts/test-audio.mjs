// Test tu chua cho he thong am thanh (chay: node scripts/test-audio.mjs)
// 1) Compile src/game/audio.ts bang tsc thuan (khong import react-native
//    nen compile duoc trong node), 2) kiem tra du lieu SFX/BGM,
// 3) kiem tra AudioMan no-op an toan trong node, 4) chay generate-audio
// va kiem tra file WAV (header RIFF, kich thuoc, thoi luong BGM).
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let pass = 0, fail = 0;
const check = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name); cond ? pass++ : fail++; };

// --- 1. Compile audio.ts ---
execSync('npx tsc --ignoreConfig --ignoreDeprecations 6.0 src/game/audio.ts --outDir scripts/.build-audio --module commonjs --target es2020 --moduleResolution node10 --skipLibCheck --esModuleInterop', { cwd: ROOT, stdio: 'pipe' });
const audioMod = require('./.build-audio/audio.js');
const { SFX_NAMES, SFX, BGM_TRACKS, AudioMan, audio } = audioMod;
check('Import audio.ts trong node khong loi, co du export', !!(SFX_NAMES && SFX && BGM_TRACKS && AudioMan && audio));

// --- 2. SFX ---
const REQUIRED = ['click', 'coin', 'sell', 'place', 'reroll', 'starup', 'levelup', 'equip', 'start', 'hit', 'cast', 'win', 'lose', 'champion', 'error'];
check('SFX_NAMES du 15 ten bat buoc', REQUIRED.every(x => SFX_NAMES.includes(x)) && SFX_NAMES.length >= 15);
check('Moi SFX co it nhat 1 not', REQUIRED.every(x => SFX[x] && Array.isArray(SFX[x].notes) && SFX[x].notes.length >= 1));
check('Tan so moi not SFX trong 40..4000Hz', REQUIRED.every(x => SFX[x].notes.every(n => n.f >= 40 && n.f <= 4000)));
check('Thoi luong tong moi SFX <= 1.5s', REQUIRED.every(x => SFX[x].notes.every(n => n.t + n.d <= 1.5 + 1e-9)));
check('Moi not SFX co type + gain hop le', REQUIRED.every(x => SFX[x].notes.every(n => ['sine', 'square', 'triangle', 'sawtooth'].includes(n.type) && n.g > 0 && n.g <= 1 && n.d > 0 && n.t >= 0)));

// --- 3. BGM ---
const tracks = Object.keys(BGM_TRACKS);
check('BGM co dung 2 track home + battle', tracks.length === 2 && tracks.includes('home') && tracks.includes('battle'));
const noteFreq = (nt) => typeof nt.note === 'number' ? nt.note : NaN;
check('Moi track BGM >= 16 not giai dieu', tracks.every(k => BGM_TRACKS[k].notes.length >= 16));
check('bpm battle > bpm home', BGM_TRACKS.battle.bpm > BGM_TRACKS.home.bpm);
check('Moi not BGM hop le (tan so 40..4000, len > 0)', tracks.every(k =>
  [...BGM_TRACKS[k].notes, ...(BGM_TRACKS[k].bass || [])].every(nt => {
    const f = noteFreq(nt);
    return (typeof nt.note === 'string' || (f >= 40 && f <= 4000)) && nt.len > 0;
  })));
check('BGM co bass cho ca 2 track', tracks.every(k => Array.isArray(BGM_TRACKS[k].bass) && BGM_TRACKS[k].bass.length >= 4));

// --- 4. AudioMan trong node: no-op an toan ---
let noThrow = true;
try {
  audio.unlock();
  audio.setSfxEnabled(false);
  check('setSfxEnabled(false) -> isSfxEnabled() === false', audio.isSfxEnabled() === false);
  audio.playSfx('coin'); // da tat SFX: no-op
  audio.setSfxEnabled(true);
  check('setSfxEnabled(true) -> isSfxEnabled() === true', audio.isSfxEnabled() === true);
  for (const nm of REQUIRED) audio.playSfx(nm); // khong WebAudio trong node: di duong native no-op
  audio.playSfx('khong-ton-tai');
  audio.startBgm('home');
  audio.startBgm('battle'); // chuyen track
  audio.stopBgm();
  check('stopBgm -> currentBgm === null', audio.currentBgm === null);
  audio.setMusicEnabled(false);
  check('setMusicEnabled(false) -> isMusicEnabled() === false', audio.isMusicEnabled() === false);
  audio.startBgm('home'); // da tat nhac: khong phat, khong throw
  audio.setMusicEnabled(true);
  const m2 = new AudioMan();
  m2.unlock(); m2.startBgm('battle'); m2.stopBgm();
} catch (e) {
  noThrow = false;
  console.log('  loi: ' + (e && e.message));
}
check('AudioMan: playSfx/startBgm/stopBgm/unlock trong node khong throw', noThrow);

// --- 5. Generate WAV + kiem tra file ---
const genOut = execSync('node scripts/generate-audio.mjs', { cwd: ROOT, encoding: 'utf8' });
console.log('--- generate-audio ---\n' + genOut.trim() + '\n----------------------');
const audioDir = join(ROOT, 'assets', 'audio');
const wavs = existsSync(audioDir) ? readdirSync(audioDir).filter(f => f.endsWith('.wav')) : [];
const expected = [...REQUIRED.map(x => `${x}.wav`), 'bgm-home.wav', 'bgm-battle.wav'];
check(`Sinh du ${expected.length} file WAV (15 SFX + 2 BGM)`, expected.every(f => wavs.includes(f)));
let allRiff = true, totalBytes = 0;
for (const f of expected) {
  const p = join(audioDir, f);
  if (!existsSync(p)) { allRiff = false; continue; }
  const buf = readFileSync(p);
  totalBytes += buf.length;
  if (buf.length <= 44 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') allRiff = false;
}
check('Tat ca WAV co header RIFF/WAVE dung va kich thuoc > 44', allRiff);
const wavDur = (f) => {
  const p = join(audioDir, f);
  if (!existsSync(p)) return 0;
  const sz = statSync(p).size;
  return (sz - 44) / 2 / 22050; // PCM16 mono 22050Hz
};
const dHome = wavDur('bgm-home.wav'), dBattle = wavDur('bgm-battle.wav');
check(`BGM wav vong lap 8..20s (home=${dHome.toFixed(2)}s, battle=${dBattle.toFixed(2)}s)`, dHome >= 8 && dHome <= 20 && dBattle >= 8 && dBattle <= 20);
console.log(`File WAV: ${expected.length} file, tong dung luong ${(totalBytes / 1024).toFixed(1)} KB`);

console.log(`\nTONG: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
