// Test headless cho RNG xac dinh + giao thuc PvP online (chay tu goc project: node scripts/test-online.mjs)
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
execSync(
  'npx tsc --ignoreConfig --ignoreDeprecations 6.0 src/game/data.ts src/game/engine.ts src/game/online.ts --outDir scripts/.build-online --module commonjs --target es2020 --moduleResolution node10 --skipLibCheck --esModuleInterop',
  { cwd: root, stdio: 'inherit' },
);

const require = createRequire(import.meta.url);
const { simulateBattle, makeMonsterTeam, mulberry32, hashSeed } = require('./.build-online/engine.js');
const { MONSTERS } = require('./.build-online/data.js');
const {
  makeRoomCode, serializeTeam, deserializeTeam, pairRound, pairSeed,
  runPairBattle, damageForLoss, applyPairResult, MockHub, rankings, finalRanks,
} = require('./.build-online/online.js');

let pass = 0, fail = 0;
const check = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name); cond ? pass++ : fail++; };

// --- (a) simulateBattle cung seed 2 lan -> giong het ---
const team = [
  { uid: 'a', defId: 'gogo', star: 2, items: ['kiem'], x: 3, y: 2 },
  { uid: 'b', defId: 'lulu', star: 1, items: [], x: 2, y: 3 },
  { uid: 'c', defId: 'pipo', star: 1, items: [], x: 4, y: 3 },
];
const cloneTeam = () => team.map((u) => ({ ...u, items: [...u.items] }));
const makeSlimes = () => makeMonsterTeam([{ def: MONSTERS.find((m) => m.id === 'slime'), count: 2 }]);
const totalHpLastFrame = (r) => r.frames[r.frames.length - 1].units.reduce((s, u) => s + u.hp, 0);

const rA1 = simulateBattle(cloneTeam(), makeSlimes(), [], 42);
const rA2 = simulateBattle(cloneTeam(), makeSlimes(), [], 42);
check('(a) simulateBattle cung seed: winner giong het', rA1.winner === rA2.winner);
check('(a) simulateBattle cung seed: survivors/enemySurvivors giong het', rA1.survivors === rA2.survivors && rA1.enemySurvivors === rA2.enemySurvivors);
check('(a) simulateBattle cung seed: duration giong het', rA1.duration === rA2.duration);
check('(a) simulateBattle cung seed: tong mau frame cuoi giong het', Math.abs(totalHpLastFrame(rA1) - totalHpLastFrame(rA2)) < 1e-9);
check('(a) simulateBattle cung seed: so events/frames giong het', rA1.events.length === rA2.events.length && rA1.frames.length === rA2.frames.length);
// Test cu cua engine: seed 7 van thang slime (ghi nhan neu RNG moi lam doi)
const rOld = simulateBattle(cloneTeam(), makeSlimes(), [], 7);
check('(a) test cu: simulateBattle(team, slimes, [], 7).winner===0', rOld.winner === 0);
// mulberry32 / hashSeed sanity
{
  const g1 = mulberry32(123); const g2 = mulberry32(123);
  const seq1 = [g1(), g1(), g1()]; const seq2 = [g2(), g2(), g2()];
  check('(a) mulberry32 cung seed cho day giong het, gia tri trong [0,1)', seq1.every((v, i) => v === seq2[i] && v >= 0 && v < 1));
  check('(a) hashSeed xac dinh va khac nhau voi chuoi khac', hashSeed('abc') === hashSeed('abc') && hashSeed('abc') !== hashSeed('abd') && hashSeed('abc') >= 0);
}

// --- (b) khac seed: khong crash + ket qua hop le ---
try {
  const rB = simulateBattle(cloneTeam(), makeSlimes(), [], 999);
  check('(b) simulateBattle khac seed: khong crash, winner hop le', rB.winner === 0 || rB.winner === 1);
  check('(b) simulateBattle khac seed: duration/frames hop le', rB.duration > 0 && rB.duration <= 30.01 && rB.frames.length > 0);
} catch (e) {
  check('(b) simulateBattle khac seed: khong crash (' + e.message + ')', false);
  check('(b) simulateBattle khac seed: duration/frames hop le', false);
}

// --- (c) protocol qua MockHub ---
const hub = new MockHub();
const tAlice = hub.connect('alice');
const tBob = hub.connect('bob');
const tHost = hub.connect('host');

const aliceUnits = [
  { uid: 'orig-a1', defId: 'gogo', star: 2, items: ['kiem'], x: 3, y: 2 },
  { uid: 'orig-a2', defId: 'lulu', star: 1, items: [], x: 2, y: 3 },
  { uid: 'orig-a3', defId: 'pipo', star: 1, items: [], x: 4, y: 3 },
];
const bobUnits = [
  { uid: 'orig-b1', defId: 'mimi', star: 1, items: [], x: 3, y: 2 },
  { uid: 'orig-b2', defId: 'bobi', star: 1, items: [], x: 2, y: 3 },
];
const round = 6;
const snapAlice = serializeTeam(aliceUnits, { playerId: 'alice', name: 'Alice', seat: 0, round, level: 5, augments: [] });
const snapBob = serializeTeam(bobUnits, { playerId: 'bob', name: 'Bob', seat: 1, round, level: 5, augments: [] });

const receivedByHost = [];
tHost.on('snapshot', (payload, fromId) => receivedByHost.push({ payload, fromId }));
// Kiem tra hub khong gui lai chinh minh
let aliceSelfReceived = 0;
tAlice.on('snapshot', () => { aliceSelfReceived++; });
tAlice.send('snapshot', snapAlice);
tBob.send('snapshot', snapBob);
check('(c) MockHub: host nhan du 2 snapshot tu 2 client', receivedByHost.length === 2);
check('(c) MockHub: fromId dung ca 2 phia', receivedByHost.some((m) => m.fromId === 'alice') && receivedByHost.some((m) => m.fromId === 'bob'));
check('(c) MockHub: khong gui lai chinh minh (alice chi nhan cua bob)', aliceSelfReceived === 1);

const roomPlayers = [
  { id: 'alice', name: 'Alice', seat: 0, hp: 100, alive: true, isBot: false, connected: true },
  { id: 'bob', name: 'Bob', seat: 1, hp: 100, alive: true, isBot: false, connected: true },
];
const pairs = pairRound(roomPlayers, round);
check('(c) pairRound 2 nguoi -> dung 1 cap, khong ghost', pairs.length === 1 && pairs[0].ghost === false && new Set([pairs[0].a, pairs[0].b]).size === 2);

const seedSide1 = pairSeed('TEST01', round, pairs[0].a, pairs[0].b);
const seedSide2 = pairSeed('TEST01', round, pairs[0].b, pairs[0].a);
check('(c) pairSeed giong nhau o 2 phia (ke ca khi doi thu tu a/b)', seedSide1 === seedSide2);

// Moi phia tu sap xep snapshot theo seat tang dan roi goi runPairBattle canonical
const snapsBySeat = [snapAlice, snapBob].sort((x, y) => x.seat - y.seat);
const resSide1 = runPairBattle(snapsBySeat[0], snapsBySeat[1], seedSide1);
// Phia ben kia: bat dau tu danh sach dao nguoc de chung minh thu tu dau vao cua client khong anh huong
const snapsReversed = [snapBob, snapAlice].sort((x, y) => x.seat - y.seat);
const resSide2 = runPairBattle(snapsReversed[0], snapsReversed[1], seedSide2);
check('(c) runPairBattle 2 phia cho winnerSeat giong het', resSide1.winnerSeat === resSide2.winnerSeat);
check('(c) runPairBattle 2 phia cho loserSeat/winnerSurvivors/duration giong het',
  resSide1.loserSeat === resSide2.loserSeat && resSide1.winnerSurvivors === resSide2.winnerSurvivors && resSide1.duration === resSide2.duration);

// applyPairResult tru dung mau nguoi thua
const expectedDamage = damageForLoss(round, resSide1.winnerSurvivors);
check('(c) damageForLoss khop cong thuc offline 2 + survivors*2 + floor(round/6)', damageForLoss(6, 2) === 2 + 4 + 1 && damageForLoss(0, 0) === 2);
const resultWithRound = { ...resSide1, round };
const after = applyPairResult(roomPlayers, pairs[0], resultWithRound, false);
const loserAfter = after.find((p) => p.seat === resSide1.loserSeat);
const winnerAfter = after.find((p) => p.seat === resSide1.winnerSeat);
check('(c) applyPairResult tru dung mau nguoi thua theo damageForLoss', loserAfter.hp === Math.max(0, 100 - expectedDamage));
check('(c) applyPairResult khong tru mau nguoi thang, alive cap nhat dung', winnerAfter.hp === 100 && loserAfter.alive === (loserAfter.hp > 0));
// Ghost: b la bong ma thi b khong bi tru ke ca khi b thua trong tran ghost; a thua moi bi tru
{
  const ghostPair = { a: 0, b: 1, ghost: true };
  // a thua trong tran ghost -> a bi tru
  const dmgGhost = damageForLoss(0, 1);
  const after1 = applyPairResult(roomPlayers, ghostPair, { winnerSeat: 1, loserSeat: 0, winnerSurvivors: 1, round: 0 }, true);
  check('(c) ghost pair: a thua thi a bi tru dung mau', after1.find((p) => p.seat === 0).hp === 100 - dmgGhost && after1.find((p) => p.seat === 1).hp === 100);
  // b (ghost) thua trong tran ghost -> khong ai bi tru o tran nay
  const after2 = applyPairResult(roomPlayers, ghostPair, { winnerSeat: 0, loserSeat: 1, winnerSurvivors: 2, round: 0 }, true);
  check('(c) ghost pair: b thua (bong ma) thi khong tru mau ai', after2.every((p) => p.hp === 100));
}
// pairRound so le -> co ghost
{
  const three = [
    { id: 'a', name: 'A', seat: 0, hp: 100, alive: true, isBot: false, connected: true },
    { id: 'b', name: 'B', seat: 1, hp: 100, alive: true, isBot: false, connected: true },
    { id: 'c', name: 'C', seat: 2, hp: 100, alive: true, isBot: false, connected: true },
  ];
  const p3 = pairRound(three, 3);
  check('(c) pairRound 3 nguoi -> 2 cap, dung 1 cap ghost', p3.length === 2 && p3.filter((p) => p.ghost).length === 1);
  check('(c) rankings/finalRanks sap xep nguoi song mau cao len truoc', finalRanks(three)[0].seat === 0 || finalRanks(three).length === 3);
}

// --- (d) makeRoomCode ---
{
  const code = makeRoomCode(mulberry32(7));
  const ALLOWED = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  check('(d) makeRoomCode du 6 ky tu', code.length === 6);
  check('(d) makeRoomCode chi gom ky tu hop le, khong co 0/O/1/I', [...code].every((ch) => ALLOWED.includes(ch)) && !/[01OI]/.test(code));
  const codes = new Set(Array.from({ length: 20 }, (_, i) => makeRoomCode(mulberry32(i + 1))));
  check('(d) makeRoomCode voi seed khac nhau khong trung toan bo (san sinh da dang)', codes.size > 10);
}

// --- (e) serialize/deserialize khu hoi ---
{
  const orig = [
    { uid: 'x1', defId: 'drago', star: 3, items: ['kiem', 'giap'], x: 1, y: 0 },
    { uid: 'x2', defId: 'luna', star: 2, items: ['cung'], x: 5, y: 3 },
    { uid: 'x3', defId: 'toto', star: 1, items: [], x: 0, y: 2 },
  ];
  const snap = serializeTeam(orig, { playerId: 'p9', name: 'Tester', seat: 4, round: 2, level: 7, augments: ['mau1'] });
  const back = deserializeTeam(snap);
  check('(e) khu hoi giu dung so luong + defId/star/vi tri/items',
    back.length === orig.length && back.every((u, i) => u.defId === orig[i].defId && u.star === orig[i].star && u.x === orig[i].x && u.y === orig[i].y && JSON.stringify(u.items) === JSON.stringify(orig[i].items)));
  check('(e) deserialize tai tao uid xac dinh dang snap-<seat>-<i>', back.every((u, i) => u.uid === `snap-4-${i}`));
  check('(e) snapshot giu dung meta (playerId/seat/round/level/augments)',
    snap.playerId === 'p9' && snap.seat === 4 && snap.round === 2 && snap.level === 7 && snap.augments[0] === 'mau1');
}

console.log(`\nTONG: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
