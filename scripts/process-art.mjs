// Xu ly anh raster tho (art-raw/) thanh asset game:
// - units/<id>.png (nen MAGENTA thuan #FF00FF) -> tach nen bang color-distance keying
//   + khu vien (despill) o dai bien, trim sat nhan vat, chuan hoa canvas 512x512
//   (boss 640), xuat assets/art/units/<id>.webp (alpha) + <id>.webp.b64 de commit.
//   Ngoai le: file <id>.green.png dung nen GREEN thuan #00FF00 (cho nhan vat mau hong
//   gan magenta nhu Slime) - cung thuat toan, doi mau khoa.
// - scenes/<name>.jpg -> resize 1280x720 (lobby/arena) hoac 1024x360 (banner-*),
//   xuat assets/art/scenes/<name>.webp + .b64.
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

function keyOutBuffer(data, W, H, key) {
  const d = Buffer.from(data);
  const [kr, kg, kb] = key.K;
  const domAvg = (i) => key.dom.reduce((s, c) => s + d[i + c], 0) / key.dom.length;
  const othMin = (i) => Math.min(...key.oth.map(c => d[i + c]));
  const T0 = 90, T1 = 210;
  for (let p = 0; p < W * H; p++) {
    const i = p * 4, r = d[i], g = d[i + 1], b = d[i + 2];
    const dist = Math.hypot(r - kr, g - kg, b - kb);
    let a = (dist - T0) / (T1 - T0);
    a = a < 0 ? 0 : a > 1 ? 1 : a;
    const na = Math.round(a * 255);
    d[i + 3] = na < 10 ? 0 : na > 246 ? 255 : na;
    // Despill: chi khi do thua mau khoa cao (tranh lam nhat trang phuc cua nhan vat)
    const spill = domAvg(i) - othMin(i);
    if (na > 0 && spill > 60) {
      const excess = spill, k = 0.5 * (1 - a * 0.5);
      for (const c of key.dom) d[i + c] = Math.max(0, Math.round(d[i + c] - excess * k));
    }
  }
  // Pass 2: lam sach fringe o dai vien ban trong suot
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; const a8 = d[i + 3];
    if (a8 === 0 || a8 === 255) continue;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const dist = Math.hypot(r - kr, g - kg, b - kb);
    if (dist < 175) { d[i + 3] = 0; continue; }
    const spill = domAvg(i) - othMin(i);
    if (spill > 24) for (const c of key.dom) d[i + c] = Math.max(0, Math.round(d[i + c] - spill * 0.8));
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
    .webp({ quality: 84, alphaQuality: 92, effort: 4 })
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
    const webp = await sharp(join(RAW_SCENES, f))
      .resize(isBanner ? { width: 1024, height: 360, fit: 'cover' } : { width: 1280, height: 720, fit: 'cover' })
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
