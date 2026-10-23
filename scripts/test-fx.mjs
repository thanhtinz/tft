// Test hoi quy render-state + dong su kien giao tranh (src/game/fx.ts + BattleEvent)
// Tu chua: tu compile bang tsc roi kiem tra headless. Chay: node scripts/test-fx.mjs
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
execSync(
  'npx tsc --ignoreConfig --ignoreDeprecations 6.0 src/game/data.ts src/game/engine.ts src/game/rig.ts src/game/fx.ts --outDir scripts/.build-fx --module commonjs --target es2020 --moduleResolution node10 --skipLibCheck --esModuleInterop',
  { cwd: root, stdio: 'inherit' },
);

const require = createRequire(import.meta.url);
const { simulateBattle, pveEnemiesForRound, makeMonsterTeam, makeAiTeam } = require('./.build-fx/engine.js');
const { MONSTERS } = require('./.build-fx/data.js');
const { resolveArt, renderUnitsForFrame, eventsInWindow } = require('./.build-fx/fx.js');

let pass = 0, fail = 0;
const check = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name); cond ? pass++ : fail++; };
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const byId = (id) => MONSTERS.find(m => m.id === id);

// --- 1. Render dich PvE: doi mau 2 tuong vs pveEnemiesForRound(1) (2 slime) ---
{
  const team = [
    { uid: 'a', defId: 'gogo', star: 1, items: [], x: 3, y: 2 },
    { uid: 'b', defId: 'lulu', star: 1, items: [], x: 2, y: 3 },
  ];
  const r = simulateBattle(team, pveEnemiesForRound(1), [], 7);
  check('PvE: moi frame renderUnitsForFrame co so luong bang frame.units',
    r.frames.length > 0 && r.frames.every(f => renderUnitsForFrame(f).length === f.units.length));
  check('PvE: moi frame co unit team 1 (dich hien thi)',
    r.frames.every(f => renderUnitsForFrame(f).some(u => u.team === 1)));
  check('PvE: moi render unit co art xac dinh (art && art.id)',
    r.frames.every(f => renderUnitsForFrame(f).every(u => !!u.art && !!u.art.id)));
  check("PvE: frame dau co unit dich art.id === 'slime'",
    renderUnitsForFrame(r.frames[0]).some(u => u.team === 1 && u.art.id === 'slime'));
  check('PvE: renderUnitsForFrame sap xep theo y tang dan',
    r.frames.every(f => { const ru = renderUnitsForFrame(f); return ru.every((u, i) => i === 0 || ru[i - 1].y <= u.y); }));
  check('PvE: FightUnit mang artId + range tuong minh khop def',
    r.frames[0].units.every(u => typeof u.artId === 'string' && u.artId.length > 0 && isNum(u.range) && u.range >= 1));
}

// --- 2. Render dich campaign (boss) + AI team ---
{
  const team = () => [
    { uid: 'a', defId: 'gogo', star: 2, items: ['kiem'], x: 3, y: 2 },
    { uid: 'b', defId: 'lulu', star: 1, items: [], x: 2, y: 3 },
    { uid: 'c', defId: 'pipo', star: 1, items: [], x: 4, y: 3 },
  ];
  const bossEnemies = makeMonsterTeam([{ def: byId('dragonboss'), count: 1 }, { def: byId('slime'), count: 1 }]);
  const rBoss = simulateBattle(team(), bossEnemies, [], 3);
  check('Boss: moi frame render units deu resolve duoc art + co team 1',
    rBoss.frames.length > 0 && rBoss.frames.every(f => { const ru = renderUnitsForFrame(f); return ru.length === f.units.length && ru.some(u => u.team === 1) && ru.every(u => !!u.art && !!u.art.id); }));
  check("Boss: frame dau co art.id === 'dragonboss' o team 1",
    renderUnitsForFrame(rBoss.frames[0]).some(u => u.team === 1 && u.art.id === 'dragonboss'));

  const rAi = simulateBattle(team(), makeAiTeam(10, 3), [], 5);
  check('AI: moi frame render units deu resolve duoc art + co team 1',
    rAi.frames.length > 0 && rAi.frames.every(f => { const ru = renderUnitsForFrame(f); return ru.length === f.units.length && ru.some(u => u.team === 1) && ru.every(u => !!u.art && !!u.art.id); }));
}

// --- 3. Golem trieu hoi (sumo) ---
{
  check("resolveArt('golem-summon') tra ve def golem (id 'golem')",
    !!resolveArt('golem-summon') && resolveArt('golem-summon').id === 'golem');
  check("resolveArt('golem') tra ve def golem + resolveArt tuong/quai thuong dung",
    !!resolveArt('golem') && resolveArt('golem').id === 'golem' && resolveArt('lulu')?.id === 'lulu' && resolveArt('slime')?.id === 'slime');

  const teamSumo = () => [
    { uid: 'sumo1', defId: 'sumo', star: 2, items: ['nuocmat', 'sachcu'], x: 3, y: 3 },
    { uid: 'tank1', defId: 'gogo', star: 2, items: ['giap', 'tim'], x: 2, y: 2 },
    { uid: 'tank2', defId: 'toto', star: 2, items: ['tim'], x: 4, y: 2 },
    { uid: 'tank3', defId: 'bobi', star: 2, items: [], x: 3, y: 2 },
  ];
  const enemyTanky = () => makeMonsterTeam([
    { def: byId('golem'), count: 2 },
    { def: byId('dragonboss'), count: 1 },
    { def: byId('soi'), count: 2 },
  ], 1.2);
  let golemFrame = null;
  for (let seed = 1; seed <= 20 && !golemFrame; seed++) {
    const r = simulateBattle(teamSumo(), enemyTanky(), [], seed);
    golemFrame = r.frames.find(f => f.units.some(u => u.artId === 'golem')) ?? null;
  }
  check('Golem: tim thay frame chua unit artId golem trong seed 1..20', !!golemFrame);
  check('Golem: render unit golem resolve art id golem, range 1',
    !!golemFrame && renderUnitsForFrame(golemFrame).some(u => u.artId === 'golem' && u.art.id === 'golem' && u.range === 1));
}

// --- 4. Dong su kien giao tranh ---
{
  const healTeam = () => [
    { uid: 'v1', defId: 'vivi', star: 1, items: [], x: 2, y: 3 },
    { uid: 'd1', defId: 'dodo', star: 1, items: [], x: 3, y: 3 },
    { uid: 'l1', defId: 'lulu', star: 1, items: [], x: 4, y: 3 },
    { uid: 'p1', defId: 'pipo', star: 1, items: [], x: 1, y: 3 },
    { uid: 'g1', defId: 'gogo', star: 1, items: [], x: 3, y: 2 },
  ];
  const healEnemies = () => makeMonsterTeam([
    { def: byId('golem'), count: 1 },
    { def: byId('soi'), count: 2 },
    { def: byId('skeleton'), count: 2 },
  ]);
  const r = simulateBattle(healTeam(), healEnemies(), [], 1);

  const atk = r.events.find(e => e.type === 'attack');
  check("Event: co 'attack' voi amount > 0 va du toa do ax/ay/tx/ty dang so",
    !!atk && atk.amount > 0 && isNum(atk.ax) && isNum(atk.ay) && isNum(atk.tx) && isNum(atk.ty) && !!atk.attackerUid && !!atk.targetUid && atk.uid === atk.targetUid && atk.kind === 'phys' && typeof atk.crit === 'boolean' && typeof atk.ranged === 'boolean');
  check("Event: dinh dang text cu giu nguyen - attack 'X danh Y -N', cast 'X tung ky nang ...!'",
    r.events.filter(e => e.type === 'attack').every(e => /^.+ đánh .+ -\d+$/.test(e.text)) &&
    r.events.filter(e => e.type === 'cast').every(e => /^.+ tung kỹ năng .+!$/.test(e.text)));
  const cast = r.events.find(e => e.type === 'cast');
  check("Event: co it nhat 1 'cast' kem skillKind/skillName + toa do muc tieu",
    !!cast && !!cast.skillKind && !!cast.skillName && cast.uid === cast.attackerUid && isNum(cast.tx) && isNum(cast.ty));
  check("Event: co 'death' voi targetUid/uid la ke chet",
    r.events.some(e => e.type === 'death' && !!e.targetUid && e.uid === e.targetUid));
  const hit = r.events.find(e => e.type === 'hit');
  check("Event: co 'hit' tu ky nang kem skillKind, amount > 0, kind phys/magic + toa do",
    !!hit && !!hit.skillKind && hit.amount > 0 && (hit.kind === 'phys' || hit.kind === 'magic') && isNum(hit.ax) && isNum(hit.tx) && !!hit.attackerUid && hit.uid === hit.targetUid);
  check("Event: khong co 'hit' trung voi don danh thuong (attack giu amount rieng, hit deu co skillKind)",
    r.events.filter(e => e.type === 'hit').every(e => !!e.skillKind));
  const roundEnd = r.events[r.events.length - 1];
  check("Event: cuoi tran co 1 'roundEnd' text 'Ket thuc tran' tai t = duration",
    r.events.filter(e => e.type === 'roundEnd').length === 1 && roundEnd.type === 'roundEnd' && roundEnd.text === 'Kết thúc trận' && roundEnd.t === r.duration);

  // Heal: tim trong vong lap seed xac dinh 1..30
  let healEv = null;
  for (let seed = 1; seed <= 30 && !healEv; seed++) {
    const rr = simulateBattle(healTeam(), healEnemies(), [], seed);
    healEv = rr.events.find(e => e.type === 'heal') ?? null;
  }
  check("Event: co 'heal' (vivi/dodo) trong seed 1..30 voi amount > 0, kind heal, uid = nguoi duoc hoi",
    !!healEv && healEv.amount > 0 && healEv.kind === 'heal' && !!healEv.attackerUid && healEv.uid === healEv.targetUid && isNum(healEv.ax) && isNum(healEv.tx));

  // Crit: tim trong vong lap seed xac dinh 1..30
  let foundCrit = false;
  for (let seed = 1; seed <= 30 && !foundCrit; seed++) {
    const rr = simulateBattle(healTeam(), healEnemies(), [], seed);
    foundCrit = rr.events.some(e => e.type === 'attack' && e.crit === true);
  }
  check("Event: co attack crit === true trong seed 1..30", foundCrit);
}

// --- 5. Deterministic: cung tran + seed 2 lan -> events giong het ---
{
  const team = () => [
    { uid: 'a', defId: 'gogo', star: 2, items: ['kiem'], x: 3, y: 2 },
    { uid: 'b', defId: 'lulu', star: 1, items: [], x: 2, y: 3 },
    { uid: 'c', defId: 'pipo', star: 1, items: [], x: 4, y: 3 },
  ];
  const enemies = () => makeMonsterTeam([{ def: byId('golem'), count: 1 }, { def: byId('soi'), count: 2 }]);
  const r1 = simulateBattle(team(), enemies(), [], 42);
  const r2 = simulateBattle(team(), enemies(), [], 42);
  check('Deterministic: JSON.stringify(events) giong het 2 lan chay cung seed',
    JSON.stringify(r1.events) === JSON.stringify(r2.events));
  check('Deterministic: winner + duration + survivors giong het',
    r1.winner === r2.winner && r1.duration === r2.duration && r1.survivors === r2.survivors && r1.enemySurvivors === r2.enemySurvivors);
}

// --- 6. eventsInWindow: dung bien, khong trung lap khi ghep cua so lien tiep ---
{
  const evs = [
    { t: 0, type: 'attack', text: 'a' },
    { t: 0.25, type: 'attack', text: 'b' },
    { t: 0.5, type: 'attack', text: 'c' },
    { t: 1, type: 'attack', text: 'd' },
    { t: 1.5, type: 'attack', text: 'e' },
  ];
  check('eventsInWindow: cua so (0, 0.5] loai t=0, lay ca t=0.5',
    JSON.stringify(eventsInWindow(evs, 0, 0.5).map(e => e.text)) === JSON.stringify(['b', 'c']));
  check('eventsInWindow: t0 < 0 lay tu dau (gom ca t=0)',
    JSON.stringify(eventsInWindow(evs, -1, 0.5).map(e => e.text)) === JSON.stringify(['a', 'b', 'c']));
  const joined = [...eventsInWindow(evs, 0, 0.5), ...eventsInWindow(evs, 0.5, 1), ...eventsInWindow(evs, 1, 1.5)];
  check('eventsInWindow: ghep cac cua so lien tiep khong trung lap, du va dung thu tu',
    JSON.stringify(joined.map(e => e.text)) === JSON.stringify(['b', 'c', 'd', 'e']) && new Set(joined).size === joined.length);
  // Tren tran that: ghep cac moc 2/5/10/duration phai ra dung toan bo events
  const team = [
    { uid: 'a', defId: 'gogo', star: 1, items: [], x: 3, y: 2 },
    { uid: 'b', defId: 'lulu', star: 1, items: [], x: 2, y: 3 },
  ];
  const r = simulateBattle(team, pveEnemiesForRound(1), [], 7);
  const parts = [...eventsInWindow(r.events, -1, 2), ...eventsInWindow(r.events, 2, 5), ...eventsInWindow(r.events, 5, 10), ...eventsInWindow(r.events, 10, r.duration)];
  check('eventsInWindow: ghep cua so tren tran that ra dung toan bo events, khong trung',
    parts.length === r.events.length && JSON.stringify(parts) === JSON.stringify(r.events));
}

console.log(`\nTONG: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
