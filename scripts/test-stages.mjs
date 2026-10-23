// Test he thong sinh man PvE 5.200 man (src/game/stages.ts) - tu chua, chay: node scripts/test-stages.mjs
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

execSync(
  'npx tsc --ignoreConfig --ignoreDeprecations 6.0 src/game/data.ts src/game/engine.ts src/game/stages.ts --outDir scripts/.build-stages --module commonjs --target es2020 --moduleResolution node10 --skipLibCheck --esModuleInterop',
  { stdio: 'inherit' },
);

const require = createRequire(import.meta.url);
const { CAMPAIGN, MONSTERS } = require('./.build-stages/data.js');
const { statsOf } = require('./.build-stages/engine.js');
const {
  TOTAL_STAGES, CHAPTER_SIZE, CHAPTER_COUNT, THEMES, THEMES_VALID,
  stageDef, buildStageTeam, stageReward, stagePower, chapterName, chapterOf,
} = require('./.build-stages/stages.js');

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log(`PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`FAIL ${name}${extra ? ' — ' + extra : ''}`); }
}

const totalHp = (id) => buildStageTeam(id).reduce((s, u) => s + statsOf(u).hp, 0);
const monsterIds = new Set(MONSTERS.map((m) => m.id));

// 1. Quy mo
check('TOTAL_STAGES >= 5000', TOTAL_STAGES >= 5000, `TOTAL_STAGES=${TOTAL_STAGES}`);
check('CHAPTER geometry', CHAPTER_SIZE === 100 && CHAPTER_COUNT === 52 && CHAPTER_SIZE * CHAPTER_COUNT === TOTAL_STAGES);
check('THEMES >= 10 va moi id quai/boss hop le', THEMES.length >= 10 && THEMES_VALID, `themes=${THEMES.length}`);

// 2. Man 1 khop CAMPAIGN ai 1 (2 slime)
const t1 = buildStageTeam(1);
check(
  'buildStageTeam(1) khop CAMPAIGN ai 1 (2 slime)',
  t1.length === 2 && t1.every((u) => u.defId === 'slime' && u.isMonster),
  `len=${t1.length}, ids=${t1.map((u) => u.defId).join(',')}`,
);

// 3. Cac man moc co doi khong rong, moi quai hop le
for (const id of [13, 100, 1000, 5000, 5200]) {
  const team = buildStageTeam(id);
  check(
    `buildStageTeam(${id}) khong rong + quai hop le`,
    team.length > 0 && team.every((u) => u.isMonster && u.monster && monsterIds.has(u.defId) && monsterIds.has(u.monster.id)),
    `len=${team.length}`,
  );
}

// 4. Tong mau doi tang don dieu o cac moc cach xa
const marks = [13, 100, 500, 1000, 2500, 5000, 5200];
const hps = marks.map(totalHp);
console.log('Tong mau doi theo moc:', marks.map((m, i) => `${m}=${Math.round(hps[i]).toLocaleString('en-US')}`).join(' | '));
check(
  'Tong mau tang don dieu 13<100<500<1000<2500<5000<5200',
  hps.every((h, i) => i === 0 || h > hps[i - 1]),
  hps.map((h) => Math.round(h)).join(' < '),
);

// 5. Co boss
check('stageDef(10).isBoss', stageDef(10).isBoss === true);
check('stageDef(100).isChapterBoss (+isBoss)', stageDef(100).isChapterBoss === true && stageDef(100).isBoss === true);
check('stageDef(37) khong boss', stageDef(37).isBoss === false && stageDef(37).isChapterBoss === false);

// 6. Deterministic
for (const id of [37, 1234, 5200]) {
  check(
    `Deterministic man ${id} (stageDef + buildStageTeam)`,
    JSON.stringify(stageDef(id)) === JSON.stringify(stageDef(id)) &&
      JSON.stringify(buildStageTeam(id)) === JSON.stringify(buildStageTeam(id)),
  );
}

// 7. Man 12 giu ten/thuong CAMPAIGN
check(
  'stageDef(12) giu ten/thuong CAMPAIGN',
  stageDef(12).name === CAMPAIGN[11].name && stageDef(12).reward === CAMPAIGN[11].reward,
  `"${stageDef(12).name}" / ${stageDef(12).reward}`,
);

// 8. Chuong
check('stageDef(1).chapter === 1', stageDef(1).chapter === 1);
check('stageDef(5200).chapter === 52', stageDef(5200).chapter === 52, `chapterName(52)="${chapterName(52)}"`);
check('chapterOf khop stageDef.chapter', chapterOf(101) === 2 && stageDef(101).chapter === 2);

// 9. Thuong + suc manh tang
check('stageReward(2000) > stageReward(100)', stageReward(2000) > stageReward(100), `${stageReward(2000)} > ${stageReward(100)}`);
check(
  'stagePower tang don dieu (mau)',
  [1, 12, 13, 100, 500, 1000, 2500, 5000, 5200].every((id, i, a) => i === 0 || stagePower(id) > stagePower(a[i - 1])),
  [1, 100, 1000, 5200].map((id) => `${id}:${stagePower(id)}`).join(', '),
);

console.log(`\nTong: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
