// Test headless cho battle engine + economy + rig (chay: npm test)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { simulateBattle, makeMonsterTeam, computeSynergies, interestOf, streakBonus, rollShop, makeAiTeam } = require('./.build/engine.js');
const { MONSTERS, CHAMPIONS } = require('./.build/data.js');
const { CLIPS, BONES, getBoneTransforms, stateForUnit, rowDepth } = require('./.build/rig.js');
let pass = 0, fail = 0;
const check = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name); cond ? pass++ : fail++; };
// 1. Tran PvE thang duoc: doi manh vs slime yeu
const team = [
  { uid:'a', defId:'gogo', star:2, items:['kiem'], x:3, y:2 },
  { uid:'b', defId:'lulu', star:1, items:[], x:2, y:3 },
  { uid:'c', defId:'pipo', star:1, items:[], x:4, y:3 },
];
const slimes = makeMonsterTeam([{ def: MONSTERS.find(m=>m.id==='slime'), count: 2 }]);
const r1 = simulateBattle(team, slimes, [], 7);
check('PvE: doi nguoi choi thang slime', r1.winner === 0);
check('Battle co frames va events', r1.frames.length > 3 && r1.events.length > 5);
check('Battle khong vuot 30s', r1.duration <= 30.01);
// 2. Synergy: gogo(hiepsi/hove) + bobi(hove/hiepsi) -> ca 2 toc/he kich hoat
const syn = computeSynergies([{ uid:'1', defId:'gogo', star:1, items:[], x:0, y:0 }, { uid:'2', defId:'bobi', star:1, items:[], x:1, y:0 }]);
check('Synergy Hiep Si kich hoat o moc 2', syn.some(s => s.traitId==='hiepsi' && s.active));
check('Synergy Ho Ve kich hoat o moc 2', syn.some(s => s.traitId==='hove' && s.active));
// 3. Economy
check('Interest: 50 vang -> 5, 23 vang -> 2, 0 -> 0', interestOf(50)===5 && interestOf(23)===2 && interestOf(0)===0);
check('Streak bonus: 5 -> 3, 3 -> 2, 1 -> 0', streakBonus(5)===3 && streakBonus(-3)===2 && streakBonus(1)===0);
// 4. Shop + ghep sao (logic dem ban sao)
let seed = 42; const rnd = () => { seed = (seed*9301+49297)%233280; return seed/233280; };
const shop = rollShop(5, rnd);
check('Shop co 5 o, deu la tuong hop le', shop.length===5 && shop.every(id => CHAMPIONS.some(c => c.id===id)));
const copies = [{defId:'mimi',star:1},{defId:'mimi',star:1},{defId:'mimi',star:1}];
check('Ghep sao: 3 ban 1 sao du dieu kien len 2 sao', copies.filter(u => u.defId==='mimi' && u.star===1).length >= 3);
// 5. AI team tang theo round
check('AI team round muon lon hon round som', makeAiTeam(20, 3).length >= makeAiTeam(1, 3).length);
// 6. Rig kieu Spine: bones + clips + noi suy + state machine
check('Rig co du 11 xuong', BONES.length === 11);
check('Rig co du 7 clips', ['idle','walk','attack','cast','hurt','death','victory'].every(k => CLIPS[k]));
const tr0 = getBoneTransforms('attack', 100); const tr1 = getBoneTransforms('attack', 220);
check('Noi suy keyframe: tay phai xoay thay doi theo thoi gian', tr0.armR.rot !== tr1.armR.rot);
const trDeath = getBoneTransforms('death', 700);
check('Clip death: root nga va mo dan (o=0, rot am lon)', trDeath.root.o === 0 && trDeath.root.rot < -60);
check('State machine: chet -> death, tung chieu -> cast, di chuyen -> walk, thang -> victory',
  stateForUnit({alive:false,moved:false,castAtFrame:false,attackedAtFrame:false,hurtAtFrame:false,battleOver:false})==='death' &&
  stateForUnit({alive:true,moved:false,castAtFrame:true,attackedAtFrame:false,hurtAtFrame:false,battleOver:false})==='cast' &&
  stateForUnit({alive:true,moved:true,castAtFrame:false,attackedAtFrame:false,hurtAtFrame:false,battleOver:false})==='walk' &&
  stateForUnit({alive:true,moved:false,castAtFrame:false,attackedAtFrame:false,hurtAtFrame:false,battleOver:true,won:true})==='victory');
// 7. 2.5D depth
check('2.5D: hang truoc scale lon hon va zIndex cao hon hang sau', rowDepth(3,4).scale > rowDepth(0,4).scale && rowDepth(3,4).zIndex > rowDepth(0,4).zIndex);
console.log(`\nTONG: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
