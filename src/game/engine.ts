// Battle engine thuan TypeScript - khong phu thuoc React
import { CHAMPIONS, ChampDef, ITEMS, MONSTERS, MonsterDef, SHOP_ODDS, TRAITS, champById, itemById } from './data';
// RNG xac dinh: mulberry32 chuan (32-bit state, tra ve [0,1))
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Hash chuoi -> so nguyen khong am: FNV-1a 32-bit
export function hashSeed(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
export interface PlacedUnit { uid: string; defId: string; star: number; items: string[]; x: number; y: number; isMonster?: boolean; monster?: MonsterDef; }
let uidCounter = 1;
export const newUid = () => 'u' + (uidCounter++);
export function defOf(u: PlacedUnit): ChampDef {
  if (u.isMonster && u.monster) { const m = u.monster; return { id:m.id, name:m.name, cost:1, traits:['nguyento','hove'], hp:m.hp, ad:m.ad, armor:m.armor, mr:m.mr, as:m.as, range:m.range, mana:m.mana, color:m.color, hair:m.hair, accessory:m.accessory, weapon:m.weapon, skill:m.skill }; }
  return champById(u.defId);
}
export function statsOf(u: PlacedUnit) {
  const d = defOf(u); const mult = u.star === 1 ? 1 : u.star === 2 ? 1.8 : 3.2;
  let hp = d.hp * mult, ad = d.ad * mult, ap = 100, armor = d.armor, mr = d.mr, as = d.as, crit = 25, manaStart = 0, lifesteal = 0, dodge = 0;
  for (const iid of u.items) { const it = itemById(iid); if (!it) continue; hp += it.hp ?? 0; ad += it.ad ?? 0; ap += it.ap ?? 0; armor += it.armor ?? 0; mr += it.mr ?? 0; as *= 1 + (it.asPct ?? 0)/100; crit += it.crit ?? 0; manaStart += it.mana ?? 0; lifesteal += it.lifesteal ?? 0; }
  return { hp, ad, ap, armor, mr, as, crit, manaStart, lifesteal, dodge, maxMana: d.mana };
}
export interface SynergyInfo { traitId: string; count: number; tier: number; active: boolean; }
export function computeSynergies(units: PlacedUnit[]): SynergyInfo[] {
  const counts: Record<string, number> = {}; const seen = new Set<string>();
  for (const u of units) { if (u.isMonster) continue; if (seen.has(u.defId)) continue; seen.add(u.defId); for (const t of defOf(u).traits) counts[t] = (counts[t] ?? 0) + 1; }
  return TRAITS.map(t => { const c = counts[t.id] ?? 0; let tier = 0; t.thresholds.forEach((th, i) => { if (c >= th) tier = i + 1; }); return { traitId: t.id, count: c, tier, active: tier > 0 }; }).filter(s => s.count > 0);
}
export interface TeamBuff { hpPct: number; adPct: number; apPct: number; asPct: number; armor: number; crit: number; dodge: number; shieldPct: number; manaRegen: number; }
export function synergyBuff(units: PlacedUnit[], traitId?: string): TeamBuff {
  const b: TeamBuff = { hpPct:0, adPct:0, apPct:0, asPct:0, armor:0, crit:0, dodge:0, shieldPct:0, manaRegen:0 };
  for (const s of computeSynergies(units)) { if (!s.active) continue; if (traitId && s.traitId !== traitId) continue; const k = s.tier;
    if (s.traitId==='hiepsi'){ b.armor += 20*k; b.hpPct += 8*k; } if (s.traitId==='phuthuy'){ b.apPct += 20*k; } if (s.traitId==='xathu'){ b.asPct += 15*k; }
    if (s.traitId==='satthu'){ b.crit += 15*k; b.adPct += 8*k; } if (s.traitId==='hove'){ b.shieldPct += 10*k; b.hpPct += 10*k; } if (s.traitId==='nguyento'){ b.manaRegen += 3*k; b.apPct += 10*k; }
    if (s.traitId==='tinhlinh'){ b.dodge += 8*k; } if (s.traitId==='longtoc'){ b.hpPct += 10*k; b.adPct += 10*k; b.apPct += 10*k; }
  } return b;
}
export function unitBuffFor(u: PlacedUnit, all: PlacedUnit[], aug: string[]): TeamBuff {
  const d = defOf(u); const total = synergyBuff(all); const own: TeamBuff = { hpPct:0, adPct:0, apPct:0, asPct:0, armor:0, crit:0, dodge:0, shieldPct:0, manaRegen:0 };
  // Buff theo toc/he chi ap dung cho tuong thuoc toc/he do (don gian hoa: hiepsi/xathu/satthu/longtoc)
  for (const s of computeSynergies(all)) { if (!s.active || !d.traits.includes(s.traitId)) continue; const sb = synergyBuff(all, s.traitId);
    if (['hiepsi','xathu','satthu','longtoc'].includes(s.traitId)) { own.armor += sb.armor; } }
  const merged: TeamBuff = { hpPct: total.hpPct, adPct: total.adPct, apPct: (d.traits.includes('phuthuy')||d.traits.includes('nguyento')||d.traits.includes('longtoc')) ? total.apPct : 0, asPct: d.traits.includes('xathu') ? total.asPct : 0, armor: own.armor, crit: d.traits.includes('satthu') ? total.crit : 0, dodge: d.traits.includes('tinhlinh') ? total.dodge : 0, shieldPct: total.shieldPct, manaRegen: total.manaRegen };
  if (aug.includes('mau1')) merged.hpPct += 15; if (aug.includes('sat1')) merged.adPct += 12; if (aug.includes('toc1')) merged.asPct += 12; if (aug.includes('giapdoi')) merged.armor += 15;
  return merged;
}
export interface FightUnit { uid: string; defId: string; name: string; team: number; star: number; x: number; y: number; hp: number; maxHp: number; mana: number; maxMana: number; shield: number; stun: number; atkCd: number; alive: boolean; isMonster?: boolean; color: string; }
export interface BattleFrame { t: number; units: FightUnit[]; }
export interface BattleEvent { t: number; text: string; amount?: number; uid?: string; }
export interface BattleResult { winner: number; frames: BattleFrame[]; events: BattleEvent[]; survivors: number; enemySurvivors: number; duration: number; }
interface SimUnit extends FightUnit { ad: number; ap: number; armor: number; mr: number; as: number; range: number; crit: number; lifesteal: number; dodge: number; manaRegen: number; poison: number; buffAsUntil: number; baseAs: number; skillKind: string; skillPower: number; skillName: string; }
const dist = (a:{x:number;y:number}, b:{x:number;y:number}) => Math.max(Math.abs(a.x-b.x), Math.abs(a.y-b.y));
function makeSim(u: PlacedUnit, team: number, aug: string[], all: PlacedUnit[]): SimUnit {
  const d = defOf(u); const st = statsOf(u); const buff = unitBuffFor(u, all, aug);
  const maxHp = st.hp * (1 + buff.hpPct/100);
  return { uid:u.uid, defId:u.defId, name:d.name, team, star:u.star, x:u.x, y: team===0? u.y : 6-u.y, hp:maxHp, maxHp, mana: Math.min(st.manaStart, st.maxMana), maxMana: st.maxMana, shield: maxHp * buff.shieldPct/100, stun:0, atkCd:0, alive:true, isMonster:u.isMonster, color:d.color,
    ad: st.ad*(1+buff.adPct/100), ap: st.ap+buff.apPct, armor: st.armor+buff.armor, mr: st.mr+buff.armor, as: st.as*(1+buff.asPct/100), baseAs: st.as*(1+buff.asPct/100), range:d.range, crit: st.crit+buff.crit, lifesteal: st.lifesteal, dodge: buff.dodge, manaRegen: buff.manaRegen, poison:0, buffAsUntil:0, skillKind:d.skill.kind, skillPower:d.skill.power, skillName:d.skill.name };
}
export function simulateBattle(player: PlacedUnit[], enemy: PlacedUnit[], aug: string[] = [], seed = 1): BattleResult {
  const rnd = mulberry32(seed);
  const units: SimUnit[] = [...player.map(u => makeSim(u, 0, aug, player)), ...enemy.map(u => makeSim(u, 1, [], enemy))];
  const frames: BattleFrame[] = []; const events: BattleEvent[] = [];
  const snap = (t:number) => frames.push({ t, units: units.map(u => ({ ...u })) });
  const dmg = (src: SimUnit, tgt: SimUnit, raw: number, magic: boolean, t: number) => {
    if (!tgt.alive) return 0; if (rnd()*100 < tgt.dodge) { events.push({t, text:`${tgt.name} né đòn!`, uid:tgt.uid}); return 0; }
    const mit = magic ? tgt.mr : tgt.armor; let dealt = raw * (100/(100+Math.max(0,mit)));
    if (tgt.shield > 0) { const absorbed = Math.min(tgt.shield, dealt); tgt.shield -= absorbed; dealt -= absorbed; }
    tgt.hp -= dealt; tgt.mana = Math.min(tgt.maxMana, tgt.mana + dealt*0.08);
    if (src.lifesteal > 0) src.hp = Math.min(src.maxHp, src.hp + dealt*src.lifesteal/100);
    if (tgt.hp <= 0) { tgt.hp = 0; tgt.alive = false; events.push({t, text:`${tgt.name} đã gục ngã`, uid:tgt.uid}); }
    return dealt;
  };
  snap(0);
  const dt = 0.25; let t = 0;
  while (t < 30) {
    t += dt;
    const alive0 = units.some(u => u.alive && u.team===0); const alive1 = units.some(u => u.alive && u.team===1);
    if (!alive0 || !alive1) break;
    for (const u of units) {
      if (!u.alive) continue;
      if (u.poison > 0) { u.hp -= 8*dt*4; u.poison -= dt; if (u.hp<=0){u.hp=0;u.alive=false; events.push({t,text:`${u.name} gục vì trúng độc`,uid:u.uid}); continue;} }
      if (u.buffAsUntil > 0 && t > u.buffAsUntil) { u.as = u.baseAs; u.buffAsUntil = 0; }
      if (u.stun > 0) { u.stun -= dt; continue; }
      u.mana = Math.min(u.maxMana, u.mana + u.manaRegen*dt);
      const foes = units.filter(f => f.alive && f.team !== u.team); if (!foes.length) break;
      foes.sort((a,b) => dist(u,a)-dist(u,b)); const target = foes[0];
      // Ky nang khi day mana
      if (u.mana >= u.maxMana) {
        u.mana = 0; const power = u.skillPower * (u.ap/100) * (u.star===1?1:u.star===2?1.5:2.2); const allies = units.filter(a => a.alive && a.team===u.team);
        events.push({t, text:`${u.name} tung kỹ năng ${u.skillName}!`, uid:u.uid});
        if (u.skillKind==='burst') dmg(u, target, power, true, t);
        else if (u.skillKind==='aoe') foes.slice(0,4).forEach(f => dmg(u, f, power, true, t));
        else if (u.skillKind==='stun') { dmg(u, target, power, true, t); target.stun = 1.5; }
        else if (u.skillKind==='freeze') { foes.slice(0,3).forEach(f => { dmg(u, f, power, true, t); f.stun = 2; }); }
        else if (u.skillKind==='heal') { allies.sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp).slice(0,2).forEach(a => { a.hp = Math.min(a.maxHp, a.hp + power); }); }
        else if (u.skillKind==='shield') { u.shield += power; const near = allies[0]; if (near && near!==u) near.shield += power*0.6; }
        else if (u.skillKind==='buffAS') { allies.forEach(a => { a.as = a.baseAs * (1 + u.skillPower/100); a.buffAsUntil = t+5; }); if (u.defId==='king') u.shield += 200; }
        else if (u.skillKind==='summon') { const golem: SimUnit = { ...u, uid:u.uid+'-golem'+Math.floor(t), defId:'golem-summon', name:'Golem Bánh', hp:900, maxHp:900, ad:40, mana:9999, maxMana:9999, skillKind:'burst', skillPower:50, x:u.x, y:u.y, shield:0, poison:0 }; units.push(golem); }
        else if (u.skillKind==='execute') { const weak = [...foes].sort((a,b)=>a.hp-b.hp)[0]; dmg(u, weak, power * (weak.hp/weak.maxHp < 0.4 ? 1.8 : 1), false, t); }
        else if (u.skillKind==='poison') { dmg(u, target, power, true, t); target.poison = 4; }
        else if (u.skillKind==='lifesteal') { const dealt = dmg(u, target, power, true, t); u.hp = Math.min(u.maxHp, u.hp + dealt*0.6); }
        else if (u.skillKind==='dash') { u.x = target.x; u.y = target.y; dmg(u, target, power, false, t); }
        continue;
      }
      if (dist(u, target) > u.range) { u.x += Math.sign(target.x-u.x); if (dist(u,target) > u.range) u.y += Math.sign(target.y-u.y); u.x = Math.max(0, Math.min(6, u.x)); u.y = Math.max(0, Math.min(6, u.y)); continue; }
      u.atkCd -= dt; if (u.atkCd <= 0) { u.atkCd = 1/Math.max(0.2, u.as); const crit = rnd()*100 < u.crit; const raw = u.ad * (crit ? 1.6 : 1) * (0.9 + rnd()*0.2); const dealt = dmg(u, target, raw, false, t); if (dealt>0) events.push({t, text:`${u.name} đánh ${target.name} -${Math.round(dealt)}`, amount: Math.round(dealt), uid: target.uid}); u.mana = Math.min(u.maxMana, u.mana + 10); }
    }
    if (Math.round(t*4) % 2 === 0) snap(t);
  }
  snap(t);
  const s0 = units.filter(u => u.alive && u.team===0).length; const s1 = units.filter(u => u.alive && u.team===1).length;
  let winner = 1; if (s0 > s1) winner = 0; else if (s0 === s1) { const h0 = units.filter(u=>u.team===0).reduce((a,u)=>a+u.hp,0); const h1 = units.filter(u=>u.team===1).reduce((a,u)=>a+u.hp,0); winner = h0 >= h1 ? 0 : 1; }
  return { winner, frames, events, survivors: s0, enemySurvivors: s1, duration: t };
}
// Kinh te, shop, ghep sao, AI
export function interestOf(gold: number) { return Math.min(5, Math.floor(Math.max(0, gold)/10)); }
export function streakBonus(streak: number) { const a = Math.abs(streak); return a>=5?3:a>=3?2:a>=2?1:0; }
export function xpToNext(level: number) { return [0,2,6,10,20,32,50,72,999][level] ?? 999; }
export function rollShop(level: number, rnd: () => number = Math.random): string[] {
  const odds = SHOP_ODDS[level] ?? SHOP_ODDS[1]; const out: string[] = [];
  for (let i=0;i<5;i++) { const r = rnd()*100; let cost = 1, acc = 0; for (let c=0;c<5;c++){ acc += odds[c]; if (r < acc){ cost = c+1; break; } cost = c+1; }
    const pool = CHAMPIONS.filter(c => c.cost===cost); out.push(pool[Math.floor(rnd()*pool.length)].id); }
  return out;
}
export function sellValue(defId: string, star: number) { const c = champById(defId).cost; return star===1?c:star===2?c*3-1:c*9-2; }
export function combineCheck(units: { defId: string; star: number }[], defId: string) { return units.filter(u => u.defId===defId && u.star===1).length; }
export function makeAiTeam(round: number, seed = 1): PlacedUnit[] {
  let s = seed*7919 + round*131; const rnd = () => { s = (s*9301+49297)%233280; return s/233280; };
  const size = Math.min(9, Math.max(1, Math.floor(round/2)+1)); const maxCost = round<4?2:round<9?3:round<16?4:5;
  const pool = CHAMPIONS.filter(c => c.cost<=maxCost); const team: PlacedUnit[] = [];
  for (let i=0;i<size;i++){ const def = pool[Math.floor(rnd()*pool.length)]; const star = round>=14 && rnd()<0.4 ? 2 : round>=7 && rnd()<0.2 ? 2 : 1;
    team.push({ uid:'ai'+round+'-'+i, defId:def.id, star, items: round>=12 && i===0 ? ['kiem'] : [], x: i%7, y: def.range<=1?0:3 }); }
  return team;
}
export function makeMonsterTeam(list: { def: MonsterDef; count: number }[], scale = 1): PlacedUnit[] {
  const out: PlacedUnit[] = []; let i = 0;
  for (const e of list) for (let k=0;k<e.count;k++){ const m = { ...e.def, hp: Math.round(e.def.hp*scale), ad: Math.round(e.def.ad*(1+(scale-1)*0.7)) }; out.push({ uid:'mon'+(i), defId:e.def.id, star:1, items:[], x: i%7, y: i<4?0:2, isMonster:true, monster:m }); i++; }
  return out;
}
export function pveEnemiesForRound(round: number): PlacedUnit[] {
  const by = (id:string) => MONSTERS.find(m=>m.id===id)!;
  if (round===1) return makeMonsterTeam([{def:by('slime'),count:2}]);
  if (round===2) return makeMonsterTeam([{def:by('slime'),count:2},{def:by('nam'),count:1}]);
  if (round===3) return makeMonsterTeam([{def:by('goblin'),count:2},{def:by('nam'),count:1}]);
  if (round===10) return makeMonsterTeam([{def:by('golem'),count:1},{def:by('soi'),count:2}]);
  if (round===18) return makeMonsterTeam([{def:by('dragonboss'),count:1},{def:by('skeleton'),count:2}]);
  if (round===26) return makeMonsterTeam([{def:by('frostboss'),count:1},{def:by('witchmob'),count:2}]);
  return makeMonsterTeam([{def:by('soi'),count:3}], 1 + round*0.03);
}
export const PVE_ROUNDS = [1,2,3,10,18,26];
export function isPveRound(round: number) { return PVE_ROUNDS.includes(round); }
export function randomItem(rnd: () => number = Math.random) { return ITEMS[Math.floor(rnd()*ITEMS.length)].id; }
// Cau truc stage kieu TFT: stage 1 co 4 round (1-1..1-4), cac stage sau moi stage 7 round.
export function stageSub(round: number) { if (round <= 4) return { stage: 1, sub: round }; const k = round - 5; return { stage: 2 + Math.floor(k / 7), sub: (k % 7) + 1 }; }
export function roundLabel(round: number) { const s = stageSub(round); return s.stage + '-' + s.sub; }
export function isPveStageRound(round: number) { const { stage, sub } = stageSub(round); return (stage === 1 && sub <= 3) || sub === 7; }
export function isCarouselRound(round: number) { const { stage, sub } = stageSub(round); return stage >= 2 && sub === 4; }
export const AUG_ROUNDS_TFT = [5, 13, 20]; // 2-1, 3-2, 4-2
const STAGE_DMG_TFT = [0, 0, 2, 3, 4, 6, 8, 10, 12, 14, 16];
export function lossDamage(round: number, enemySurvivors: number) { const { stage } = stageSub(round); return (STAGE_DMG_TFT[Math.min(stage, STAGE_DMG_TFT.length - 1)] ?? 16) + enemySurvivors * 2; }
