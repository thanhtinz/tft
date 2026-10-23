// Xu ly anh raster tho (art-raw/) thanh asset game:
// - units/<id>.png (nen MAGENTA thuan #FF00FF) -> tach nen bang color-distance keying
//   + khu vien (despill) o dai bien, trim sat nhan vat, chuan hoa canvas 512x512
//   (boss 640), xuat assets/art/units/<id>.webp (alpha) + <id>.webp.b64 de commit.
//   Ngoai le: file <id>.green.png dung nen GREEN thuan #00FF00 (cho nhan vat mau hong
//   gan magenta nhu Slime) - cung thuat toan, doi mau khoa.
// - scenes/<name>.jpg -> resize 1280x720 (lobby/arena) hoac 1024x360 (banner-*)
//   hoac 600x840 doc (card-* - lung the bai), xuat assets/art/scenes/<name>.webp + .b64.
// - Sinh src/game/artManifest.ts voi require tinh tung file.
// Chay: node scripts/process-art.mjs [--only=id1,id2]
import sharp from 'sharp';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW_UNITS = join(ROOT, 'art-raw', 'units');
const RAW_SCENES = join(ROOT, 'art-raw', 'scenes');
const OUT_UNITS = join(ROOT, 'assets', 'art', 'units');
const OUT_SCENES = join(ROOT, 'assets', 'art', 'scenes');
const BOSS_IDS = new Set(['dragonboss', 'frostboss', 'kingboss', 'titan']);
const onlyArg = process.argv.find(a => a.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
// Khoa mau: dom = cac kenh mau chiem uu the cua nen, oth = cac kenh con lai
const KEYS = {
  magenta: { K: [255, 0, 255], dom: [0, 2], oth: [1] },
  green: { K: [0, 255, 0], dom: [1], oth: [0, 2] },
};

// Do nhiem mau khoa (spill) tai 1 pixel: magenta -> min(R,B)-G, green -> G-max(R,B)
function spillOf(d, i, key) {
  if (key.dom.length === 2) return Math.min(d[i], d[i + 2]) - d[i + 1];
  return d[i + 1] - Math.max(d[i], d[i + 2]);
}

function keyOutBuffer(data, W, H, key) {
  const d = Buffer.from(data);
  const [kr, kg, kb] = key.K;
  const N = W * H;
  // Pass 1: alpha theo khoang cach mau toi mau khoa (giu nguyen nguong da on dinh)
  const alpha = new Uint8Array(N);
  const T0 = 90, T1 = 210;
  for (let p = 0; p < N; p++) {
    const i = p * 4;
    const dist = Math.hypot(d[i] - kr, d[i + 1] - kg, d[i + 2] - kb);
    let a = (dist - T0) / (T1 - T0);
    a = a < 0 ? 0 : a > 1 ? 1 : a;
    const na = Math.round(a * 255);
    alpha[p] = na < 10 ? 0 : na > 246 ? 255 : na;
  }
  // Pass 1b: giet han pixel alpha thap (<0.35) - chung la quang nen tron >65%,
  // khong chua thong tin nhan vat dang ke, de lai chi tao dom vien
  for (let p = 0; p < N; p++) if (alpha[p] > 0 && alpha[p] < 90) alpha[p] = 0;
  // Pass 2: GOT ALPHA 1px (min-filter 3x3) - cat vong bien ngoai cung von la
  // phan tron nen nhieu nhat (halo magenta 1-2px cua anh AI sinh tren nen khoa)
  const er = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x;
    if (alpha[p] === 0) { er[p] = 0; continue; }
    let m = alpha[p];
    for (let dy = -1; dy <= 1 && m > 0; dy++) {
      const yy = y + dy; if (yy < 0 || yy >= H) { m = 0; break; }
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx; if (xx < 0 || xx >= W) { m = 0; break; }
        const v = alpha[yy * W + xx]; if (v < m) m = v;
      }
    }
    er[p] = m;
  }
  for (let p = 0; p < N; p++) alpha[p] = er[p];
  // Pass 3: DESPILL TRU (subtractive) cho dai bien + pixel dac nhiem nang.
  // Khong dung unmix chia-cho-alpha: nen magenta cua tranh AI khong thuan
  // #FF00FF tuyet doi nen phep chia khuech dai sai so -> day kenh con lai
  // (tung thu: G bi thoi len thanh vien xanh la). Phep tru co gioi han,
  // chi keo cac kenh khoa ve muc spill muc tieu ti le voi alpha.
  for (let p = 0; p < N; p++) {
    const a8 = alpha[p]; if (a8 === 0) continue;
    const i = p * 4;
    const spill = spillOf(d, i, key);
    if (a8 < 255) {
      const t = Math.max(0, spill - (a8 / 255) * 48);
      if (t > 0) for (const c of key.dom) d[i + c] = Math.max(0, Math.round(d[i + c] - t));
    } else if (spill > 100) {
      const cut = (spill - 100) * 0.7;
      for (const c of key.dom) d[i + c] = Math.max(0, Math.round(d[i + c] - cut));
    }
    d[i + 3] = a8;
  }
  // Pass 4: xoa cac DOM ALPHA LO LUNG tach roi (component nho hon nguong)
  const label = new Int32Array(N).fill(-1);
  let best = 0, bestSize = 0; const sizes = [];
  const stack = [];
  for (let s = 0; s < N; s++) {
    if (alpha[s] === 0 || label[s] !== -1) continue;
    const id = sizes.length; let size = 0; stack.push(s); label[s] = id;
    while (stack.length) {
      const p = stack.pop(); size++;
      const x = p % W, y = (p / W) | 0;
      if (x > 0 && alpha[p - 1] > 0 && label[p - 1] === -1) { label[p - 1] = id; stack.push(p - 1); }
      if (x < W - 1 && alpha[p + 1] > 0 && label[p + 1] === -1) { label[p + 1] = id; stack.push(p + 1); }
      if (y > 0 && alpha[p - W] > 0 && label[p - W] === -1) { label[p - W] = id; stack.push(p - W); }
      if (y < H - 1 && alpha[p + W] > 0 && label[p + W] === -1) { label[p + W] = id; stack.push(p + W); }
    }
    sizes.push(size); if (size > bestSize) { bestSize = size; best = id; }
  }
  const minKeep = Math.max(24, Math.floor(bestSize * 0.0008));
  for (let p = 0; p < N; p++) {
    if (alpha[p] > 0 && label[p] !== best && sizes[label[p]] < minKeep) {
      alpha[p] = 0; d[p * 4 + 3] = 0;
    }
  }
  // Pass 5: DEM MAU BIEN (color padding): lan mau pixel dac ra vung trong suot
  // ~3px de khi scale loc song tuyen khong lem mau la; vung trong suot con lai
  // dua RGB ve 0 (truoc day giu nguyen RGB magenta -> halo hong khi render)
  const filled = new Uint8Array(N);
  for (let p = 0; p < N; p++) filled[p] = alpha[p] > 0 ? 1 : 0;
  for (let iter = 0; iter < 3; iter++) {
    const src = Buffer.from(d); const srcF = Uint8Array.from(filled);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = y * W + x; if (srcF[p]) continue;
      let sr = 0, sg = 0, sb = 0, cnt = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy; if (yy < 0 || yy >= H) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx; if (xx < 0 || xx >= W) continue;
          const q = yy * W + xx; if (!srcF[q]) continue;
          const j = q * 4; sr += src[j]; sg += src[j + 1]; sb += src[j + 2]; cnt++;
        }
      }
      if (cnt) {
        const i = p * 4;
        d[i] = Math.round(sr / cnt); d[i + 1] = Math.round(sg / cnt); d[i + 2] = Math.round(sb / cnt);
        filled[p] = 1;
      }
    }
  }
  for (let p = 0; p < N; p++) {
    const i = p * 4;
    if (!filled[p]) { d[i] = 0; d[i + 1] = 0; d[i + 2] = 0; }
    d[i + 3] = alpha[p];
  }
  return d;
}

async function processUnit(inputPath, canvas, keyName) {
  const pre = await sharp(inputPath).resize({ width: 900, height: 900, fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const keyedBuf = keyOutBuffer(pre.data, pre.info.width, pre.info.height, KEYS[keyName]);
  const keyed = sharp(keyedBuf, { raw: { width: pre.info.width, height: pre.info.height, channels: 4 } }).png();
  let trimmed;
  try { trimmed = await keyed.trim({ threshold: 8 }).toBuffer(); }
  catch { trimmed = await keyed.toBuffer(); }
  const inner = canvas - 14;
  const resized = await sharp(trimmed).resize({ width: inner, height: inner, fit: 'inside' }).png().toBuffer();
  const meta = await sharp(resized).metadata();
  const left = Math.round((canvas - (meta.width ?? inner)) / 2);
  const top = canvas - (meta.height ?? inner) - 4;
  return sharp({ create: { width: canvas, height: canvas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: resized, left, top }])
    .webp({ quality: 86, alphaQuality: 100, effort: 4 })
    .toBuffer();
}

async function main() {
  mkdirSync(OUT_UNITS, { recursive: true });
  mkdirSync(OUT_SCENES, { recursive: true });
  let totalB64 = 0; const unitIds = [], sceneIds = [];
  const unitFiles = existsSync(RAW_UNITS) ? readdirSync(RAW_UNITS).filter(f => f.endsWith('.png')).sort() : [];
  for (const f of unitFiles) {
    const isGreen = f.endsWith('.green.png');
    const id = isGreen ? f.replace(/\.green\.png$/, '') : f.replace(/\.png$/, '');
    if (only && !only.has(id)) { if (existsSync(join(OUT_UNITS, id + '.webp.b64'))) unitIds.push(id); continue; }
    const webp = await processUnit(join(RAW_UNITS, f), BOSS_IDS.has(id) ? 640 : 512, isGreen ? 'green' : 'magenta');
    writeFileSync(join(OUT_UNITS, id + '.webp'), webp);
    const b64 = webp.toString('base64');
    writeFileSync(join(OUT_UNITS, id + '.webp.b64'), b64);
    totalB64 += b64.length; unitIds.push(id);
    console.log(`unit ${id}: webp ${(webp.length / 1024).toFixed(0)}KB`);
  }
  const sceneFiles = existsSync(RAW_SCENES) ? readdirSync(RAW_SCENES).filter(f => /\.(jpg|png)$/.test(f)).sort() : [];
  for (const f of sceneFiles) {
    const id = f.replace(/\.(jpg|png)$/, '');
    if (only && !only.has(id)) { if (existsSync(join(OUT_SCENES, id + '.webp.b64'))) sceneIds.push(id); continue; }
    const isBanner = id.startsWith('banner');
    const isCard = id.startsWith('card-');
    const webp = await sharp(join(RAW_SCENES, f))
      .resize(isBanner ? { width: 1024, height: 360, fit: 'cover' } : isCard ? { width: 600, height: 840, fit: 'cover' } : { width: 1280, height: 720, fit: 'cover' })
      .webp({ quality: 76, effort: 4 }).toBuffer();
    writeFileSync(join(OUT_SCENES, id + '.webp'), webp);
    const b64 = webp.toString('base64');
    writeFileSync(join(OUT_SCENES, id + '.webp.b64'), b64);
    totalB64 += b64.length; sceneIds.push(id);
    console.log(`scene ${id}: webp ${(webp.length / 1024).toFixed(0)}KB`);
  }
  const lines = ['// AUTO-GENERATED by scripts/process-art.mjs - KHONG sua tay.',
    '// Anh raster that (assets/art) duoc giai ma tu .b64 boi scripts/decode-art.mjs.', '',
    'export const UNIT_ART: Record<string, number> = {'];
  for (const id of [...new Set(unitIds)].sort()) lines.push(`  ${JSON.stringify(id)}: require('../../assets/art/units/${id}.webp'),`);
  lines.push('};', '', 'export const SCENE_ART: Record<string, number> = {');
  for (const id of sceneIds.sort()) lines.push(`  ${JSON.stringify(id)}: require('../../assets/art/scenes/${id}.webp'),`);
  lines.push('};', '');
  writeFileSync(join(ROOT, 'src', 'game', 'artManifest.ts'), lines.join('\n'));
  console.log(`manifest: ${unitIds.length} units, ${sceneIds.length} scenes; tong .b64 moi chay: ${(totalB64 / 1048576).toFixed(2)}MB`);
}
main().catch(e => { console.error(e); process.exit(1); });
