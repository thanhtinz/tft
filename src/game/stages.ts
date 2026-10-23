// He thong sinh man PvE tu dong: 5.200 man / 52 chuong (100 man/chuong).
// Thuan TypeScript, xac dinh hoan toan theo id man (deterministic, khong dung Math.random).
// 12 man dau lay nguyen tu CAMPAIGN (data.ts) de trai nghiem dau game khong doi;
// tu man 13 tro di sinh thu tuc theo chu de (theme) cua chuong + seed rieng cua man.
import { CAMPAIGN, MONSTERS, monsterById } from './data';
import { makeMonsterTeam, PlacedUnit } from './engine';

export const TOTAL_STAGES = 5200;
export const CHAPTER_SIZE = 100;
export const CHAPTER_COUNT = 52;

export interface ThemeDef { name: string; monsters: string[]; boss: string; hue: string; }

// 12 chu de xoay vong theo chuong: chuong c dung THEMES[(c-1) % THEMES.length],
// do kho tang theo vong lap chuong nho he so scale theo id (xem difficultyScale).
export const THEMES: ThemeDef[] = [
  { name: 'Rừng Slime', monsters: ['slime', 'nam', 'goblin'], boss: 'golem', hue: '#7bc96f' },
  { name: 'Đồi Nấm Độc', monsters: ['nam', 'goblin', 'witchmob'], boss: 'golem', hue: '#95d5b2' },
  { name: 'Hang Goblin', monsters: ['goblin', 'slime', 'skeleton'], boss: 'golem', hue: '#e9c46a' },
  { name: 'Thung Lũng Sói', monsters: ['soi', 'goblin', 'slime'], boss: 'dragonboss', hue: '#a2d2ff' },
  { name: 'Tháp Xương', monsters: ['skeleton', 'witchmob', 'soi'], boss: 'frostboss', hue: '#ced4da' },
  { name: 'Rừng Phù Thủy', monsters: ['witchmob', 'nam', 'skeleton'], boss: 'frostboss', hue: '#cdb4f6' },
  { name: 'Núi Lửa Rồng', monsters: ['golem', 'soi', 'goblin'], boss: 'dragonboss', hue: '#ff9770' },
  { name: 'Lâu Đài Băng', monsters: ['skeleton', 'witchmob', 'golem'], boss: 'frostboss', hue: '#90e0ef' },
  { name: 'Vương Quốc Bóng Đêm', monsters: ['soi', 'skeleton', 'witchmob'], boss: 'kingboss', hue: '#bdb2ff' },
  { name: 'Đền Cổ Golem', monsters: ['golem', 'skeleton', 'goblin'], boss: 'kingboss', hue: '#ffd6a5' },
  { name: 'Vực Sâu Hỗn Loạn', monsters: ['witchmob', 'soi', 'golem', 'skeleton'], boss: 'kingboss', hue: '#ffadad' },
  { name: 'Thiên Đỉnh Rồng', monsters: ['golem', 'witchmob', 'soi'], boss: 'dragonboss', hue: '#ffb703' },
];

// Boss lon cuoi chuong xoay vong 3 boss nay (man % 100 === 0).
const CHAPTER_BOSSES = ['kingboss', 'frostboss', 'dragonboss'];

export interface StageDef {
  id: number;
  chapter: number;
  theme: number;
  name: string;
  isBoss: boolean;
  isChapterBoss: boolean;
  reward: number;
  power: number;
}

// --- Seed / RNG cuc bo (khong sua engine.ts) ---
function hash32(n: number): number {
  let h = (n >>> 0) ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 0x21f0aaad);
  h = Math.imul(h ^ (h >>> 15), 0x735a2d97);
  return (h ^ (h >>> 15)) >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Duong cong do kho ---
// He so scale mau/atk cho quai thuong: ~1 o man 13, tang mu nhe theo id
// (1 + ((id-12)/140)^1.25): man 100 ~1.57, 500 ~5.8, 1000 ~12.5, 2500 ~37.6, 5000 ~87.
// Cong them so luong quai (3 -> 9) va boss/sao o man cao nen tong mau doi tang
// don dieu ro ret o cac moc xa nhau.
export function difficultyScale(id: number): number {
  return 1 + Math.pow(Math.max(0, id - 12) / 140, 1.25);
}

// Chi so suc manh dich hien thi UI / dung cho test: don dieu tang chat theo id
// (difficultyScale khong giam + id*3 tang tuyen tinh).
export function stagePower(id: number): number {
  return Math.round(90 * difficultyScale(id) + id * 3);
}

export function chapterOf(id: number): number {
  return Math.ceil(id / CHAPTER_SIZE);
}
// Alias nhom ban do UI: 1 nhom = 1 chuong 100 man.
export function mapGroupOf(id: number): number {
  return chapterOf(id);
}

function themeIndexOf(chapter: number): number {
  return (chapter - 1) % THEMES.length;
}

function bossIdFor(id: number, chapter: number): string {
  if (id % CHAPTER_SIZE === 0) return CHAPTER_BOSSES[(chapter - 1) % CHAPTER_BOSSES.length];
  return THEMES[themeIndexOf(chapter)].boss;
}

export function stageReward(id: number): number {
  if (id <= CAMPAIGN.length) return CAMPAIGN[id - 1].reward;
  const chapter = chapterOf(id);
  let r = Math.round(24 + id * 0.55 + chapter * 10);
  if (id % CHAPTER_SIZE === 0) r *= 3;
  else if (id % 10 === 0) r = Math.round(r * 1.5);
  return r;
}

export function stageDef(id: number): StageDef {
  const chapter = chapterOf(id); // moi id: chuong = ceil(id/100); 12 man dau nam o chuong 1
  const theme = themeIndexOf(chapter);
  const isBoss = id % 10 === 0;
  const isChapterBoss = id % CHAPTER_SIZE === 0;
  let name: string;
  if (id <= CAMPAIGN.length) name = CAMPAIGN[id - 1].name;
  else if (isBoss) name = `Boss: ${monsterById(bossIdFor(id, chapter)).name}`;
  else name = `${THEMES[theme].name} - Màn ${id}`;
  return { id, chapter, theme, name, isBoss, isChapterBoss, reward: stageReward(id), power: stagePower(id) };
}

function toRoman(n: number): string {
  const table: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  let v = n;
  for (const [num, sym] of table) while (v >= num) { out += sym; v -= num; }
  return out;
}

export function chapterName(chapter: number): string {
  const theme = THEMES[themeIndexOf(chapter)];
  const loop = Math.floor((chapter - 1) / THEMES.length); // 0 = vong dau
  return loop === 0 ? theme.name : `${theme.name} ${toRoman(loop + 1)}`;
}

// So quai thuong: 3 luc dau, +1 moi 250 man, toi da 9.
function regularCount(id: number): number {
  return Math.min(9, 3 + Math.floor((id - 13) / 250));
}

// Ti le sao quai thuong theo do cao cua man (sao do engine.statsOf nhan 1.8 / 3.2).
function starFor(id: number, r: number): number {
  const p3 = id > 3500 ? 0.12 : 0;
  const p2 = id > 3500 ? 0.35 : id > 1500 ? 0.3 : id > 600 ? 0.12 : 0;
  if (r < p3) return 3;
  if (r < p3 + p2) return 2;
  return 1;
}

export function buildStageTeam(id: number): PlacedUnit[] {
  // 12 man dau: dung nguyen CAMPAIGN, scale 1 nhu cu.
  if (id <= CAMPAIGN.length) {
    const st = CAMPAIGN[id - 1];
    return makeMonsterTeam(st.enemies.map(e => ({ def: monsterById(e.id), count: e.count })), 1);
  }

  const chapter = chapterOf(id);
  const theme = THEMES[themeIndexOf(chapter)];
  const rng = mulberry32(hash32(id));
  const scale = difficultyScale(id);

  // Chon quai thuong tu theme theo seed cua man.
  const count = regularCount(id);
  const picks: string[] = [];
  for (let i = 0; i < count; i++) picks.push(theme.monsters[Math.floor(rng() * theme.monsters.length)]);
  const team = makeMonsterTeam(picks.map(mid => ({ def: monsterById(mid), count: 1 })), scale);

  // Man boss: them 1 boss cua theme (scale x1.8); boss cuoi chuong: boss lon xoay
  // vong kingboss/frostboss/dragonboss voi scale x3.
  const isBoss = id % 10 === 0;
  const isChapterBoss = id % CHAPTER_SIZE === 0;
  if (isBoss) {
    const bossScale = scale * (isChapterBoss ? 3 : 1.8);
    const bossTeam = makeMonsterTeam([{ def: monsterById(bossIdFor(id, chapter)), count: 1 }], bossScale);
    team.push(...bossTeam);
  }

  // Gan sao (dung tiep rng cua man -> deterministic) va chuan hoa uid/vi tri
  // sau khi gop boss (makeMonsterTeam danh uid/vi tri tu 0 cho moi lan goi).
  team.forEach((u, i) => {
    const isBossUnit = isBoss && i === team.length - 1;
    u.uid = `s${id}-${i}`;
    u.x = i % 7;
    u.y = i < 4 ? 0 : 2;
    if (isBossUnit) u.star = isChapterBoss && id >= 2500 ? 2 : 1;
    else u.star = starFor(id, rng());
  });
  return team;
}

// Dam bao moi id trong THEMES deu la quai hop le (chay 1 lan khi import o dev/test).
export const THEMES_VALID = THEMES.every(t =>
  t.monsters.every(m => MONSTERS.some(x => x.id === m)) && MONSTERS.some(x => x.id === t.boss),
);
