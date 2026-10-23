import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { router } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { ItemArt } from './ChibiArt';
import ChibiRig from './ChibiRig';
import { LayeredBoardBg } from './SceneArt';
import { rowDepth, stateForUnit } from '../game/rig';
import { AUGMENTS, BOT_NAMES, CHAMPIONS, SHOP_ODDS, TRAITS, champById, itemById, monsterById, traitName } from '../game/data';
import { AUG_ROUNDS_TFT as AUG_ROUNDS, BattleResult, PlacedUnit, computeSynergies, interestOf, isCarouselRound, isPveStageRound, lossDamage, makeAiTeam, makeMonsterTeam, newUid, pveEnemiesForRound, randomItem, rollShop, roundLabel, sellValue, simulateBattle, stageSub, streakBonus, xpToNext } from '../game/engine';
import { MONSTERS } from '../game/data';
import { loadMeta, loadSettings, saveMeta, saveSettings } from '../game/storage';
import { TOTAL_STAGES, buildStageTeam, stageDef, stageReward } from '../game/stages';
import { TUT_REWARD, TutEvent, createTutorial, currentStep, onTutEvent, skipTutorial } from '../game/tutorial';
import { audio } from '../game/audio';
export type GameMode = 'arena' | 'campaign' | 'waves' | 'tutorial';
interface Props { mode: GameMode; stageId?: number; }
const STAR_TXT = (s:number) => s===1?'★':s===2?'★★':'★★★';
export const COST_COLORS: Record<number, string> = { 1:'#8d99ae', 2:'#38b000', 3:'#4361ee', 4:'#9d4edd', 5:'#e0a800' };
// Cau truc stage kieu TFT (stageSub / roundLabel / isPveStageRound / isCarouselRound /
// AUG_ROUNDS_TFT / lossDamage) nam trong engine.ts de test headless duoc.
// Hex pointy-top: w = 1.732*size, canh doc 1.5*size, hang le lech nua o
export function hexMetrics(w: number, h: number, rows: number) { const size = Math.max(14, Math.min(w / (7.6 * 1.732), h / (rows * 1.5 + 0.7))); const hw = 1.732 * size; const totalW = 7 * hw + hw / 2; const totalH = 2 * size + (rows - 1) * 1.5 * size; return { size, hw, ox: Math.max(0, (w - totalW) / 2), oy: Math.max(0, (h - totalH) / 2) }; }
export function hexCenter(m: ReturnType<typeof hexMetrics>, x: number, y: number) { return { cx: m.ox + m.hw / 2 + x * m.hw + (y % 2 ? m.hw / 2 : 0), cy: m.oy + m.size + y * 1.5 * m.size }; }
function hexPoints(cx: number, cy: number, size: number) { const pts: string[] = []; for (let i = 0; i < 6; i++) { const a = (Math.PI / 180) * (60 * i - 30); pts.push((cx + size * 0.94 * Math.cos(a)).toFixed(1) + ',' + (cy + size * 0.94 * Math.sin(a)).toFixed(1)); } return pts.join(' '); }
interface PInfo { name: string; hp: number; alive: boolean; lvl: number; rank: number; }
export default function GameScreen({ mode, stageId = 1 }: Props) {
  const isTut = mode === 'tutorial'; const isArena = mode === 'arena';
  const { width: winW, height: winH } = useWindowDimensions();
  const frameW = Math.min(winW, Math.max(winH, 420) * 16 / 9); const frameH = winW > winH ? winH : Math.max(frameW * 9 / 16, Math.min(winH, 600));
  const [gold, setGold] = useState(isArena?5:isTut?30:40);
  const [xp, setXp] = useState(isTut?6:0); const [level, setLevel] = useState(isArena?1:isTut?3:5);
  const [hp, setHp] = useState(100); const [round, setRound] = useState(1);
  const [bench, setBench] = useState<PlacedUnit[]>([]); const [board, setBoard] = useState<PlacedUnit[]>([]);
  const [shop, setShop] = useState<string[]>(() => isTut ? ['mimi','mimi','mimi','bobi','lulu'] : rollShop(isArena?1:5));
  const [locked, setLocked] = useState(false); const [inventory, setInventory] = useState<string[]>(mode==='campaign'||isTut?['kiem']:[]);
  const [selUid, setSelUid] = useState<string|null>(null); const [selItem, setSelItem] = useState<string|null>(null);
  const [phase, setPhase] = useState<'plan'|'battle'|'done'>('plan');
  const [result, setResult] = useState<BattleResult|null>(null); const [frameIdx, setFrameIdx] = useState(0);
  const [speed, setSpeed] = useState(1); const [streak, setStreak] = useState(0);
  const [log, setLog] = useState<string[]>(['Chào mừng đến Đấu Trường Chibi! Mua tướng, xếp đội hình rồi bấm Bắt đầu đấu.']);
  const [augments, setAugments] = useState<string[]>([]); const [augChoice, setAugChoice] = useState<string[]|null>(null);
  const [wave, setWave] = useState(1); const [finished, setFinished] = useState<string|null>(null);
  const [players, setPlayers] = useState<PInfo[]>(() => [{ name:'Bạn', hp:100, alive:true, lvl:1, rank:0 }, ...BOT_NAMES.map(n => ({ name:n, hp:100, alive:true, lvl:1, rank:0 }))]);
  const [oppIdx, setOppIdx] = useState(1); const resolvedRef = useRef(false);
  const [musicOn, setMusicOn] = useState(true); const [sfxOn, setSfxOn] = useState(true);
  const [tut, setTut] = useState(() => createTutorial()); const tutRef = useRef(tut); tutRef.current = tut;
  const tutStep = isTut ? currentStep(tut) : null;
  const [planLeft, setPlanLeft] = useState(30); const [paused, setPaused] = useState(false);
  const planMax = 30;
  const genCarousel = () => { const pool = [...CHAMPIONS].sort(() => Math.random()-0.5).slice(0, 8); return pool.map(d => ({ defId: d.id, item: randomItem() })); };
  const [carousel, setCarousel] = useState<{ defId: string; item: string }[] | null>(isArena ? genCarousel() : null);
  const [carAngle, setCarAngle] = useState(0);
  const [scout, setScout] = useState<number | null>(null);
  const [rightTab, setRightTab] = useState<'players'|'dmg'>('players');
  const [dmgStats, setDmgStats] = useState<{ name: string; dmg: number; team: number }[]>([]);
  const [summary, setSummary] = useState<{ win: boolean; dealt: number; taken: number } | null>(null);
  const [arenaSize, setArenaSize] = useState({ w: 520, h: 300 });
  const [legendHurt, setLegendHurt] = useState(false); const [shake, setShake] = useState(false);
  const allUnits = useMemo(() => [...board, ...bench], [board, bench]);
  const synergies = useMemo(() => computeSynergies(board), [board]);
  const say = (s: string) => setLog(prev => [s, ...prev].slice(0, 8));
  useEffect(() => { if (Platform.OS !== 'web') { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {}); return () => { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {}); }; } }, []);
  useEffect(() => { loadSettings().then(s => { setMusicOn(s.music); setSfxOn(s.sfx); audio.setMusicEnabled(s.music); audio.setSfxEnabled(s.sfx); audio.unlock(); audio.startBgm('battle'); }); }, []);
  useEffect(() => { if (!carousel) return; const iv = setInterval(() => setCarAngle(a => (a + 18) % 360), 650); return () => clearInterval(iv); }, [carousel]);
  useEffect(() => { if (Platform.OS !== 'web') return; const h = (e: KeyboardEvent) => { if (phase !== 'plan' || paused) return; const k = e.key.toLowerCase(); if (k === 'd') reroll(); if (k === 'f') buyXp(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); });
  async function toggleAudio(kind: 'music'|'sfx') { audio.unlock(); const s = await loadSettings(); if (kind==='music') { s.music = !s.music; setMusicOn(s.music); audio.setMusicEnabled(s.music); if (s.music) audio.startBgm('battle'); } else { s.sfx = !s.sfx; setSfxOn(s.sfx); audio.setSfxEnabled(s.sfx); } await saveSettings(s); }
  function emitTut(ev: TutEvent) {
    if (!isTut) return; const r = onTutEvent(tutRef.current, ev); if (!r.advanced) return;
    setTut(r.state); tutRef.current = r.state;
    if (r.finished) { loadMeta().then(async m => { if (!m.tutorialDone) { m.tutorialDone = true; m.gems += TUT_REWARD; await saveMeta(m); setFinished(`Hoàn thành hướng dẫn chơi! Bạn nhận ${TUT_REWARD} Ngọc thưởng lần đầu. Giờ hãy thử Đấu với AI, PvP Online hoặc Chiến Dịch PvE nhé!`); } else setFinished('Hoàn thành hướng dẫn chơi! Bạn đã nhận thưởng lần đầu trước đó rồi.'); }); audio.playSfx('champion'); }
  }
  const emitRef = useRef(emitTut); emitRef.current = emitTut;
  function peekOpponent(): { idx: number; name: string } { const aliveBots = players.map((p,i)=>({p,i})).filter(x => x.i>0 && x.p.alive); const pick = aliveBots.length ? aliveBots[round % aliveBots.length] : { i: 1, p: players[1] }; return { idx: pick.i, name: pick.p.name }; }
  const enemyForRound = (): { units: PlacedUnit[]; label: string } => {
    if (mode==='tutorial') return { units: makeMonsterTeam([{def: MONSTERS[0], count: 2}]), label: 'Đội luyện tập (Slime)' };
    if (mode==='campaign') { const sd = stageDef(stageId); return { units: buildStageTeam(stageId), label: sd.name }; }
    if (mode==='waves') { const scale = 1 + (wave-1)*0.22; const pool = wave%5===0 ? [{def:MONSTERS[7],count:1},{def:MONSTERS[0],count:2}] : [{def:MONSTERS[wave%6],count:Math.min(6,2+Math.floor(wave/2))}]; return { units: makeMonsterTeam(pool, scale), label: 'Sóng '+wave }; }
    if (isPveStageRound(round)) return { units: pveEnemiesForRound(round), label: 'Quái PvE vòng '+roundLabel(round) };
    const pick = peekOpponent();
    return { units: makeAiTeam(round, pick.idx*3+round), label: 'Đội của ' + pick.name };
  };
  const [enemyLabel, setEnemyLabel] = useState('');
  function addUnit(defId: string, toBoard = false) {
    const u: PlacedUnit = { uid: newUid(), defId, star: 1, items: [], x: 0, y: 0 };
    let nb = [...bench], nd = [...board]; let combined = false;
    if (toBoard && nd.length < level) { u.x = nd.length % 7; u.y = champById(defId).range <= 1 ? 2 : 3; nd.push(u); } else nb.push(u);
    for (let star = 1; star <= 2; star++) {
      const all = [...nd, ...nb]; const same = all.filter(x => x.defId===defId && x.star===star);
      if (same.length >= 3) {
        combined = true;
        const removeIds = new Set(same.slice(0,3).map(x => x.uid)); const items = same.slice(0,3).flatMap(x => x.items).slice(0,3);
        nd = nd.filter(x => !removeIds.has(x.uid)); nb = nb.filter(x => !removeIds.has(x.uid));
        const merged: PlacedUnit = { uid: newUid(), defId, star: star+1, items, x: same[0].x, y: same[0].y };
        if (nd.length < level) nd.push(merged); else nb.push(merged);
        say(`${champById(defId).name} đã lên ${star+1} sao!`);
      }
    }
    setBoard(nd); setBench(nb.slice(0, 9));
    if (combined) { audio.playSfx('starup'); emitRef.current('combine'); }
  }
  function buy(i: number) {
    if (phase!=='plan') return; const id = shop[i]; const cost = champById(id).cost;
    if (gold < cost) { say('Không đủ vàng!'); audio.playSfx('error'); return; }
    if (bench.length >= 9 && board.length >= level) { say('Hàng chờ và bàn cờ đã đầy!'); return; }
    setGold(g => g - cost); addUnit(id); audio.playSfx('coin'); emitTut('buy');
    setShop(prev => { const n=[...prev]; n[i]=rollShop(level)[0]; return n; });
  }
  function buyXp() { if (phase!=='plan' || gold < 4 || level >= 9) return; setGold(g => g-4); gainXp(4); say('Mua 4 XP.'); }
  function gainXp(amount: number) { let nx = xp + amount, nl = level, leveled = false; while (nl < 9 && nx >= xpToNext(nl)) { nx -= xpToNext(nl); nl++; leveled = true; say('Lên cấp '+nl+'!'); } setXp(nx); setLevel(nl); if (leveled) { audio.playSfx('levelup'); emitRef.current('levelup'); } }
  function reroll() { if (phase!=='plan' || gold < 2 || locked) return; setGold(g => g-2); setShop(rollShop(level)); audio.playSfx('reroll'); emitTut('reroll'); }
  function sellSelected() { const u = allUnits.find(x => x.uid===selUid); if (!u) return; setGold(g => g + sellValue(u.defId, u.star)); setBoard(b => b.filter(x => x.uid!==selUid)); setBench(b => b.filter(x => x.uid!==selUid)); setSelUid(null); audio.playSfx('sell'); say('Đã bán '+champById(u.defId).name); }
  function tapBoardCell(x: number, y: number) {
    if (phase!=='plan') return; const occupant = board.find(u => u.x===x && u.y===y);
    if (selItem) { const target = occupant; if (target) equipTo(target); return; }
    if (selUid) { const u = allUnits.find(v => v.uid===selUid)!;
      if (occupant && occupant.uid !== selUid) { const ox = u.x, oy = u.y; setBoard(prev => prev.map(v => v.uid===selUid ? {...v, x: occupant.x, y: occupant.y} : v.uid===occupant.uid ? {...v, x: ox, y: oy} : v)); setSelUid(null); return; }
      const wasBench = bench.some(v => v.uid===selUid);
      if (wasBench) { if (board.length >= level) { say('Bàn cờ đầy theo cấp!'); return; } setBench(b => b.filter(v => v.uid!==selUid)); setBoard(b => [...b, {...u, x, y}]); }
      else setBoard(prev => prev.map(v => v.uid===selUid ? {...v, x, y} : v));
      audio.playSfx('place'); if (wasBench) emitTut('place');
      setSelUid(null); return;
    }
    if (occupant) setSelUid(occupant.uid);
  }
  function tapBench(u: PlacedUnit) { if (selItem) { equipTo(u); return; } setSelUid(selUid===u.uid?null:u.uid); }
  function equipTo(u: PlacedUnit) { if (!selItem) return; if (u.items.length>=3) { say('Tướng đã có 3 trang bị!'); return; }
    const apply = (arr: PlacedUnit[]) => arr.map(v => v.uid===u.uid ? {...v, items:[...v.items, selItem!]} : v);
    setBoard(apply); setBench(apply); setInventory(inv => { const i = inv.indexOf(selItem); const n=[...inv]; n.splice(i,1); return n; }); audio.playSfx('equip'); say('Đã gắn '+ (itemById(selItem)?.name ?? '') +' cho '+champById(u.defId).name); setSelItem(null); emitTut('equip'); }
  function moveToBench() { const u = board.find(v => v.uid===selUid); if (!u || bench.length>=9) return; setBoard(b => b.filter(v => v.uid!==selUid)); setBench(b => [...b, u]); setSelUid(null); }
  function startBattle() {
    if (phase !== 'plan') return;
    if (!board.length) { say('Hãy đặt ít nhất 1 tướng lên bàn cờ!'); audio.playSfx('error'); return; }
    audio.unlock(); audio.startBgm('battle');
    if (isArena && !isPveStageRound(round)) setOppIdx(peekOpponent().idx);
    const e = enemyForRound(); setEnemyLabel(e.label); resolvedRef.current = false;
    const res = simulateBattle(board, e.units, augments, round*17 + wave*31 + stageId);
    setResult(res); setFrameIdx(0); setPhase('battle'); setRightTab('dmg'); audio.playSfx('start'); emitTut('battleStart');
  }
  // Dong ho chuan bi kieu TFT (chi che do Dau Truong): het gio tu vao giao tranh
  useEffect(() => { if (!isArena || phase!=='plan' || paused || carousel || augChoice || finished) return; setPlanLeft(planMax); const iv = setInterval(() => setPlanLeft(s => { if (s <= 1) { clearInterval(iv); return 0; } if (s <= 6) audio.playSfx('click'); return s - 1; }), 1000); return () => clearInterval(iv); }, [isArena, phase, round, paused, !!carousel, !!augChoice, !!finished]);
  useEffect(() => { if (isArena && phase==='plan' && planLeft === 0 && board.length) startBattle(); }, [planLeft]);
  useEffect(() => { if (phase!=='battle' || !result || paused) return; const iv = setInterval(() => setFrameIdx(f => Math.min(f+1, result.frames.length-1)), 420/speed); return () => clearInterval(iv); }, [phase, result, speed, paused]);
  useEffect(() => { if (phase!=='battle' || !result) return; const fr = result.frames[Math.min(frameIdx, result.frames.length-1)]; if (!fr) return; const evs = result.events.filter(e => Math.abs(e.t - fr.t) < 0.3); if (evs.some(e => e.text.includes('kỹ năng'))) audio.playSfx('cast'); else if (evs.some(e => e.text.includes(' đánh '))) audio.playSfx('hit'); }, [frameIdx, phase, result]);
  useEffect(() => { if (phase==='battle' && result && frameIdx >= result.frames.length-1 && !resolvedRef.current) { resolvedRef.current = true; const tm = setTimeout(() => resolveBattle(), 650); return () => clearTimeout(tm); } }, [frameIdx, phase, result]);
  async function addGems(n: number) { const m = await loadMeta(); m.gems += n; if (mode==='waves') m.bestWave = Math.max(m.bestWave, wave); await saveMeta(m); }
  function computeDmg(res: BattleResult) { const map = new Map<string, { name: string; dmg: number; team: number }>(); const myNames = new Map(board.map(u => [champById(u.defId).name, 0])); for (const e of res.events) { if (!e.amount) continue; const m = e.text.match(/^(.*?) đánh /); if (!m) continue; const name = m[1]; const team = myNames.has(name) ? 0 : 1; const cur = map.get(name) ?? { name, dmg: 0, team }; cur.dmg += e.amount; map.set(name, cur); } const arr = [...map.values()].sort((a,b) => b.dmg - a.dmg); setDmgStats(arr); return arr; }
  function resolveBattle() {
    if (!result) return; const win = result.winner===0; setPhase('done'); audio.playSfx(win ? 'win' : 'lose');
    const dmgArr = computeDmg(result); const dealt = dmgArr.filter(d => d.team===0).reduce((a,d) => a+d.dmg, 0); const taken = dmgArr.filter(d => d.team===1).reduce((a,d) => a+d.dmg, 0); setSummary({ win, dealt, taken });
    if (mode==='tutorial') { emitTut('battleEnd'); say(win ? 'Thắng trận luyện tập! Tướng của bạn tự đánh và tung kỹ năng khi đầy mana đó.' : 'Thua trận luyện tập cũng không sao — hướng dẫn vẫn tiếp tục, cứ làm theo mascot nhé.'); setGold(g => g + 10); setPhase('plan'); setResult(null); return; }
    if (mode==='campaign') { const sd = stageDef(stageId); const reward = stageReward(stageId);
      if (win) { const frac = result.survivors / Math.max(1, board.length); const stars = frac>=0.7?3:frac>=0.35?2:1;
        loadMeta().then(async m => { m.campaignStars[String(stageId)] = Math.max(m.campaignStars[String(stageId)] ?? 0, stars); m.unlockedStage = Math.max(m.unlockedStage, Math.min(TOTAL_STAGES, stageId+1)); m.gems += reward; if (stageId===TOTAL_STAGES) m.wins += 1; await saveMeta(m); });
        setFinished(`Thắng ${sd.name}! Nhận ${stars} sao và ${reward} Ngọc.`); }
      else setFinished('Thua rồi... Hãy nâng cấp đội hình, ghép sao và thử lại nhé.');
      return; }
    if (mode==='waves') { if (win) { say('Qua sóng '+wave+'! Sóng tiếp theo mạnh hơn.'); setWave(w => w+1); setGold(g => g + 6 + Math.floor(wave/3)); if (wave%3===0) setInventory(inv => [...inv, randomItem()]); setPhase('plan'); setResult(null); }
      else { addGems(wave*5); setFinished(`Dừng lại ở sóng ${wave}. Kỷ lục được lưu, nhận ${wave*5} Ngọc.`); } return; }
    // Arena theo cau truc stage TFT
    const dmgTaken = win ? 0 : lossDamage(round, result.enemySurvivors);
    let newHp = hp; const newPlayers = players.map(p => ({ ...p, lvl: p.lvl }));
    if (win) { setStreak(s => s>=0 ? s+1 : 1); } else { setStreak(s => s<=0 ? s-1 : -1); newHp = Math.max(0, hp - dmgTaken); setHp(newHp); say(`Thua round ${roundLabel(round)}, mất ${dmgTaken} máu (theo stage + quân địch còn sống).`); setLegendHurt(true); setTimeout(() => setLegendHurt(false), 1300); if (dmgTaken >= 8) { setShake(true); setTimeout(() => setShake(false), 550); } }
    if (win) say('Thắng round '+roundLabel(round)+'!');
    const aliveBefore = newPlayers.filter(p => p.alive).length;
    for (let i=1;i<newPlayers.length;i++) { if (!newPlayers[i].alive) continue; const loss = Math.floor(Math.random()*9) + Math.floor(round/3); newPlayers[i].hp = Math.max(0, newPlayers[i].hp - (win && i===oppIdx ? lossDamage(round, result.survivors) : loss)); newPlayers[i].alive = newPlayers[i].hp>0; newPlayers[i].lvl = Math.min(9, 1 + Math.floor(round/3)); if (!newPlayers[i].alive && newPlayers[i].rank===0) newPlayers[i].rank = aliveBefore; }
    newPlayers[0] = { ...newPlayers[0], hp: newHp, alive: newHp>0, lvl: level, rank: newHp>0 ? 0 : aliveBefore };
    setPlayers(newPlayers); setOppIdx(o => o+1);
    const aliveCount = newPlayers.filter(p => p.alive).length;
    const reward = 5 + interestOf(gold) + streakBonus(streak) + (win?1:0) + (augments.includes('vang2') && win ? 4 : 0);
    setGold(g => g + reward); gainXp(2);
    if (isPveStageRound(round) && win) { setInventory(inv => [...inv, randomItem()]); setGold(g => g+3); say('Round PvE rơi trang bị và vàng!'); }
    if (augments.includes('hoi1')) setHp(h => Math.min(100, (win? h : newHp) + 2));
    const nextRound = round + 1; setRound(nextRound);
    if (!locked) setShop(rollShop(level));
    if (newHp<=0 || aliveCount<=1) { const rank = newHp<=0 ? aliveCount : 1; if (rank===1) audio.playSfx('champion'); loadMeta().then(async m => { m.bestRank = Math.min(m.bestRank, rank); m.gems += Math.max(10, (9-rank)*15); if (rank===1) m.wins += 1; await saveMeta(m); }); setFinished(rank===1 ? 'Vô địch! Bạn đứng hạng 1/8. Tuyệt vời!' : `Trận đấu kết thúc. Bạn xếp hạng ${rank}/8.`); return; }
    if (AUG_ROUNDS.includes(nextRound)) { const pool = [...AUGMENTS].sort(() => Math.random()-0.5).slice(0,3); setAugChoice(pool.map(a => a.id)); say('Đã đến mốc cường hóa '+roundLabel(nextRound)+' — chọn 1 trong 3!'); }
    if (isCarouselRound(nextRound)) { setCarousel(genCarousel()); audio.playSfx('start'); say('Vòng chọn (carousel) của stage mới: chạm vào 1 tướng + trang bị để nhận!'); }
    setPhase('plan'); setResult(null);
  }
  function chooseAugment(id: string) { const a = AUGMENTS.find(x => x.id===id)!; setAugments(prev => [...prev, id]); setAugChoice(null); audio.playSfx('starup');
    if (a.kind==='gold') setGold(g => g + a.value); if (a.kind==='xp') gainXp(a.value); if (a.kind==='healPlayer') setHp(h => Math.min(100, h + a.value)); say('Đã chọn cường hóa: '+a.name); }
  function chooseCarousel(opt: { defId: string; item: string }) { setCarousel(null); addUnit(opt.defId); setInventory(inv => [...inv, opt.item]); audio.playSfx('coin'); say(`Vòng chọn: nhận ${champById(opt.defId).name} kèm ${itemById(opt.item)?.name ?? 'trang bị'}! Các đối thủ cũng đã chọn phần của họ.`); }
  const frame = result?.frames[Math.min(frameIdx, (result.frames.length-1) || 0)];
  const hi = (t: string) => isTut && tutStep?.target === t;
  const selUnit = selUid ? allUnits.find(v => v.uid===selUid) : undefined;
  const traitRows = useMemo(() => { const counts: Record<string, number> = {}; const seen = new Set<string>(); for (const u of board) { if (seen.has(u.defId)) continue; seen.add(u.defId); for (const t of champById(u.defId).traits) counts[t] = (counts[t] ?? 0) + 1; } return TRAITS.map(t => { const c = counts[t.id] ?? 0; let tier = 0; t.thresholds.forEach((th, i) => { if (c >= th) tier = i+1; }); const next = t.thresholds.find(th => c < th); return { t, c, tier, next }; }).filter(r => r.c > 0).sort((a,b) => b.tier - a.tier || b.c - a.c); }, [board]);
  const copiesOf = (defId: string) => allUnits.filter(u => u.defId===defId).reduce((a,u) => a + (u.star===1?1:u.star===2?3:9), 0);
  const { stage: curStage, sub: curSub } = stageSub(round);
  const stageRounds: number[] = curStage === 1 ? [1,2,3,4] : Array.from({length:7}, (_,i) => 5 + (curStage-2)*7 + i);
  const odds = SHOP_ODDS[level] ?? SHOP_ODDS[1];
  const maxDmg = Math.max(1, ...dmgStats.map(d => d.dmg));
  const rows = phase==='battle' ? 7 : 4;
  const hm = hexMetrics(arenaSize.w, arenaSize.h, rows);
  const scoutTeam = scout !== null ? (scout === 0 ? board : makeAiTeam(round, scout*3+round)) : [];
  return (
    <View style={st.root}>
      <View style={[st.frame, { width: frameW, height: frameH }]}>
        {/* ===== TOP BAR ===== */}
        <View style={st.topbar}>
          <View style={st.stageDots}>
            <Text style={st.stageLbl}>{isArena ? roundLabel(round) : mode==='campaign' ? stageDef(stageId).name : mode==='waves' ? 'Sóng '+wave : 'Luyện tập'}</Text>
            {isArena && stageRounds.map(r => { const ss = stageSub(r); const kind = r===round ? 'cur' : isPveStageRound(r) ? 'pve' : isCarouselRound(r) ? 'car' : 'pvp'; return (<View key={r} style={[st.dot, kind==='cur' && st.dotCur, kind==='pve' && st.dotPve, kind==='car' && st.dotCar]}><Text style={st.dotTxt}>{ss.sub}</Text></View>); })}
          </View>
          <View style={st.timerBox}>
            {phase==='battle' ? <Text style={st.timerTxt}>Đang giao tranh: {enemyLabel}</Text>
            : isArena ? (<><View style={st.timerBar}><View style={[st.timerFill, { width: (planLeft/planMax*100)+'%', backgroundColor: planLeft<=5 ? '#ef476f' : '#38b000' }]} /></View><Text style={[st.timerTxt, planLeft<=5 && { color: '#ef476f' }]}>{paused ? 'Đang tạm dừng' : 'Chuẩn bị: '+planLeft+'s'}</Text></>)
            : <Text style={st.timerTxt}>{mode==='campaign' ? ('Độ khó: '+stageDef(stageId).power+' — Thưởng: '+stageReward(stageId)+' Ngọc') : 'Chuẩn bị tự do'}</Text>}
            {summary && phase!=='battle' && <Text style={st.sumTxt}>{summary.win ? 'Thắng' : 'Thua'} — Gây {summary.dealt} / Nhận {summary.taken} sát thương (đánh thường)</Text>}
          </View>
          <View style={st.topBtns}>
            <Pressable style={st.tBtn} onPress={() => setPaused(p => !p)}><Text style={st.tBtnTxt}>{paused ? 'Tiếp tục' : 'Tạm dừng'}</Text></Pressable>
            <Pressable style={st.tBtn} onPress={() => setSpeed(s => s===1?2:1)}><Text style={st.tBtnTxt}>x{speed}</Text></Pressable>
            <Pressable style={st.tBtn} onPress={() => toggleAudio('music')}><Text style={st.tBtnTxt}>Nhạc {musicOn?'Bật':'Tắt'}</Text></Pressable>
            <Pressable style={st.tBtn} onPress={() => toggleAudio('sfx')}><Text style={st.tBtnTxt}>Tiếng {sfxOn?'Bật':'Tắt'}</Text></Pressable>
          </View>
        </View>
        {/* ===== MIDDLE ===== */}
        <View style={st.middle}>
          {/* LEFT: traits + augments + items */}
          <View style={st.leftPanel}>
            <Text style={st.panelTitle}>Tộc / Hệ</Text>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {traitRows.map(r => { const hl = selUnit && champById(selUnit.defId).traits.includes(r.t.id); const tierColor = r.tier===1 ? '#cd8f52' : r.tier===2 ? '#a8b6c4' : r.tier>=3 ? '#f5c542' : undefined; return (
                <View key={r.t.id} style={[st.traitRow, r.tier>0 && { backgroundColor: '#fff3d6', borderColor: tierColor }, hl && st.traitHl]}>
                  <Text style={st.traitName}>{r.t.name}</Text>
                  <Text style={[st.traitCnt, r.tier>0 && { color: '#a86e00', fontWeight:'900' }]}>{r.c}{r.next ? '/'+r.next : ' (tối đa)'}</Text>
                </View> ); })}
              {!traitRows.length && <Text style={st.dim}>Chưa có tướng trên bàn</Text>}
              {!!augments.length && <><Text style={[st.panelTitle, { marginTop: 8 }]}>Cường hóa</Text>{augments.map(id => { const a = AUGMENTS.find(x => x.id===id); return a ? <View key={id} style={st.augChip}><Text style={st.augTxt}>{a.name}</Text></View> : null; })}</>}
              <Text style={[st.panelTitle, { marginTop: 8 }]}>Khay trang bị</Text>
              <View style={[st.invWrap, hi('item') && st.tutHi]}>
                {inventory.map((iid, i) => { const it = itemById(iid); if (!it) return null; return (<Pressable key={i} onPress={() => setSelItem(selItem===iid?null:iid)} style={[st.invCell, selItem===iid && st.cellSel]}><ItemArt color={it.color} size={30}/><Text style={st.invTxt}>{it.name}</Text></Pressable>); })}
                {!inventory.length && <Text style={st.dim}>Thắng round PvE để rơi trang bị</Text>}
              </View>
              {selUnit && <View style={st.selMini}><Text style={st.selName}>{champById(selUnit.defId).name} {STAR_TXT(selUnit.star)}</Text><Text style={st.dim}>{champById(selUnit.defId).skill.name}: {champById(selUnit.defId).skill.desc}</Text>
                <View style={{ flexDirection:'row', gap:6, marginTop:4 }}><Pressable style={st.miniBtn} onPress={sellSelected}><Text style={st.miniTxt}>Bán +{sellValue(selUnit.defId, selUnit.star)}</Text></Pressable>{board.some(v => v.uid===selUid) && <Pressable style={st.miniBtn} onPress={moveToBench}><Text style={st.miniTxt}>Về bench</Text></Pressable>}</View></View>}
            </ScrollView>
          </View>
          {/* CENTER: arena */}
          <View style={[st.arena, shake && { transform: [{ translateX: 5 }] }]} onLayout={e => setArenaSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
            <LayeredBoardBg width={Math.min(arenaSize.w, 560)}/>
            <Svg style={StyleSheet.absoluteFill} width={arenaSize.w} height={arenaSize.h}>
              {Array.from({length: rows}).map((_, y) => Array.from({length: 7}).map((_, x) => { const { cx, cy } = hexCenter(hm, x, y); const occ = phase!=='battle' && board.some(u => u.x===x && u.y===y); return (<Polygon key={x+'-'+y} points={hexPoints(cx, cy, hm.size)} fill={occ ? '#ffe3ef' : y < (phase==='battle' ? 3 : 4) ? '#ffffffb8' : '#dff7e8b8'} stroke="#95d5b2" strokeWidth={1.2} onPress={phase!=='battle' ? () => tapBoardCell(x, y) : undefined}/>); }))}
            </Svg>
            {phase!=='battle' && board.map(u => { const { cx, cy } = hexCenter(hm, u.x, u.y); const sz = hm.size * 1.5 * rowDepth(u.y, 4).scale; return (
              <View key={u.uid} style={{ position:'absolute', left: cx - sz/2, top: cy - sz*0.86, width: sz, height: sz, alignItems:'center' }} pointerEvents="none">
                {selUid===u.uid && <View style={[st.selRing, { width: sz*0.9, height: sz*0.3, bottom: -2 }]} />}
                <ChibiRig spec={champById(u.defId)} size={sz} star={u.star} state='idle'/>
              </View> ); })}
            {phase==='battle' && frame && [...frame.units].sort((a,b) => a.y-b.y).map(u => { const { cx, cy } = hexCenter(hm, Math.max(0, Math.min(6, u.x)), Math.max(0, Math.min(6, u.y))); const prev = result && frameIdx>0 ? result.frames[frameIdx-1].units.find(v => v.uid===u.uid) : undefined; const evs = result ? result.events.filter(e => Math.abs(e.t-frame.t)<0.3) : []; const animState = stateForUnit({ alive: u.alive, moved: !!prev && (prev.x!==u.x || prev.y!==u.y), castAtFrame: evs.some(e => e.uid===u.uid && e.text.includes('kỹ năng')), attackedAtFrame: evs.some(e => e.text.startsWith(u.name+' đánh')), hurtAtFrame: evs.some(e => e.uid===u.uid && !!e.amount), battleOver: frameIdx >= (result?.frames.length ?? 1)-1, won: result?.winner===u.team }); const dep = rowDepth(u.y, 7); const sz = hm.size * 1.45 * dep.scale; return (
              <View key={u.uid} style={{ position:'absolute', left: cx - sz/2, top: cy - sz*0.86, width: sz, zIndex: dep.zIndex, alignItems:'center' }}>
                <ChibiRig spec={u.isMonster ? monsterById(u.defId) : champById(u.defId)} size={sz} star={u.star} state={animState} flip={u.team===1}/>
                <View style={st.hpBar}><View style={[st.hpFill, { width: Math.max(0, Math.min(100, u.hp/u.maxHp*100))+'%' } ]}/></View>
                <View style={st.manaBar}><View style={[st.manaFill, { width: Math.min(100, u.mana/u.maxMana*100)+'%' } ]}/></View>
              </View> ); })}
            <View style={st.legend}>
              <ChibiRig spec={champById('toto')} size={52} state={legendHurt ? 'hurt' : 'idle'}/>
              <View><Text style={st.legendName}>Linh thú của bạn</Text>{isArena && <Text style={st.legendHp}>{hp} máu — Đội {board.length}/{level}</Text>}{mode==='campaign' && <Text style={st.legendHp}>{stageDef(stageId).name}</Text>}</View>
            </View>
            {phase==='battle' && (<View style={st.battleCtrls}><Pressable style={st.smallBtn} onPress={() => result && setFrameIdx(result.frames.length-1)}><Text style={st.smallTxt}>Bỏ qua tới kết quả</Text></Pressable></View>)}
            {phase==='battle' && result && (<View style={st.logFloat}>{result.events.filter(e => Math.abs(e.t - (frame?.t ?? 0)) < 1.4).slice(-2).map((e,i) => <Text key={i} style={st.logTxt}>{e.text}{e.amount?(' ('+e.amount+')'):''}</Text>)}</View>)}
          </View>
          {/* RIGHT: scoreboard / damage */}
          <View style={st.rightPanel}>
            {isArena ? (<>
              <View style={st.tabRow}><Pressable style={[st.tab, rightTab==='players' && st.tabOn]} onPress={() => setRightTab('players')}><Text style={st.tabTxt}>Người chơi</Text></Pressable><Pressable style={[st.tab, rightTab==='dmg' && st.tabOn]} onPress={() => setRightTab('dmg')}><Text style={st.tabTxt}>Sát thương</Text></Pressable></View>
              {rightTab==='players' ? (<ScrollView showsVerticalScrollIndicator={false}>{players.map((p, i) => { const isOpp = phase!=='battle' ? peekOpponent().idx===i : oppIdx===i; return (
                <Pressable key={i} onPress={() => { setScout(i); audio.playSfx('click'); }} style={[st.pRow, !p.alive && st.pDead, isOpp && p.alive && st.pOpp]}>
                  <ChibiRig spec={CHAMPIONS[(i*3) % CHAMPIONS.length]} size={34} state={p.alive ? 'idle' : 'death'}/>
                  <View style={{ flex: 1 }}>
                    <Text style={st.pName}>{p.name}{i===0?' (bạn)':''} — Cấp {i===0 ? level : p.lvl}{p.rank ? ' — Hạng '+p.rank : ''}</Text>
                    <View style={st.pHpBar}><View style={[st.pHpFill, { width: Math.max(0, p.hp)+'%', backgroundColor: p.hp>50 ? '#38b000' : p.hp>25 ? '#e0a800' : '#ef476f' }]} /></View>
                    <Text style={st.pHp}>{p.hp} máu{i===0 && streak !== 0 ? ' — Chuỗi ' + (streak>0 ? 'thắng ' : 'thua ') + Math.abs(streak) : ''}</Text>
                  </View>
                </Pressable> ); })}</ScrollView>)
              : (<ScrollView showsVerticalScrollIndicator={false}><Text style={st.dim}>Sát thương đánh thường theo nhật ký trận gần nhất. Chạm người chơi ở tab Người chơi để xem bàn cờ của họ.</Text>{dmgStats.map((d, i) => (<View key={i} style={st.dRow}><Text style={[st.dName, { color: d.team===0 ? '#28418c' : '#a4133c' }]}>{d.name}</Text><View style={st.dBar}><View style={{ height: 10, borderRadius: 5, width: (d.dmg/maxDmg*100)+'%', backgroundColor: d.team===0 ? '#4361ee' : '#ef476f' }} /></View><Text style={st.dVal}>{d.dmg}</Text></View>))}{!dmgStats.length && <Text style={st.dim}>Chưa có dữ liệu — hãy đấu một round.</Text>}</ScrollView>)}
            </>) : (<>
              <Text style={st.panelTitle}>{mode==='campaign' ? 'Thông tin ải' : mode==='waves' ? 'Thử thách' : 'Ghi chú'}</Text>
              {mode==='campaign' && <><Text style={st.infoLine}>{stageDef(stageId).name}</Text><Text style={st.dim}>Chương {stageDef(stageId).chapter} — Độ khó {stageDef(stageId).power}</Text><Text style={st.dim}>Thưởng thắng: {stageReward(stageId)} Ngọc. Tổng chiến dịch: {TOTAL_STAGES} màn.</Text></>}
              {mode==='waves' && <Text style={st.dim}>Sóng {wave}: quái mạnh dần theo sóng. Cứ 3 sóng nhận 1 trang bị ngẫu nhiên.</Text>}
              {isTut && <Text style={st.dim}>Làm theo hướng dẫn của mascot Nana ở phía trên. Hoàn thành lần đầu nhận {TUT_REWARD} Ngọc.</Text>}
              <Text style={[st.panelTitle, { marginTop: 8 }]}>Sát thương (đánh thường)</Text>
              <ScrollView showsVerticalScrollIndicator={false}>{dmgStats.map((d, i) => (<View key={i} style={st.dRow}><Text style={[st.dName, { color: d.team===0 ? '#28418c' : '#a4133c' }]}>{d.name}</Text><View style={st.dBar}><View style={{ height: 10, borderRadius: 5, width: (d.dmg/maxDmg*100)+'%', backgroundColor: d.team===0 ? '#4361ee' : '#ef476f' }} /></View><Text style={st.dVal}>{d.dmg}</Text></View>))}{!dmgStats.length && <Text style={st.dim}>Chưa có dữ liệu.</Text>}</ScrollView>
            </>)}
          </View>
        </View>
        {/* ===== BENCH ===== */}
        <View style={[st.benchRow, hi('bench') && st.tutHi]}><Text style={st.benchLbl}>Bench</Text>{Array.from({length:9}).map((_,i) => { const u = bench[i]; return (
          <Pressable key={i} onPress={() => u && tapBench(u)} style={[st.benchCell, u && selUid===u.uid && st.cellSel]}>{u ? <ChibiRig spec={champById(u.defId)} size={44} star={u.star} state='idle'/> : <Text style={st.cellDot}>·</Text>}</Pressable> ); })}
          <View style={st.logMini}>{log.slice(0,2).map((l,i) => <Text key={i} style={st.logTxt} numberOfLines={1}>{l}</Text>)}</View>
        </View>
        {/* ===== SHOP ===== */}
        <View style={st.shopRow}>
          <View style={st.shopLeft}>
            <View style={st.lvlCard}><Text style={st.lvlBig}>Cấp {level}</Text><View style={st.xpBar}><View style={{ height: 7, backgroundColor:'#4361ee', width: Math.min(100, xp/Math.max(1,xpToNext(level))*100)+'%' }} /></View><Text style={st.dim}>{level>=9 ? 'Cấp tối đa' : xp+'/'+xpToNext(level)+' XP'}</Text></View>
            <View style={{ flexDirection:'row', gap:6 }}>
              <Pressable style={[st.shopBtn, hi('xp') && st.tutHiBtn]} onPress={buyXp}><Text style={st.shopBtnTxt}>Mua XP (4) [F]</Text></Pressable>
              <Pressable style={[st.shopBtn, { backgroundColor:'#38b000' }, hi('reroll') && st.tutHiBtn]} onPress={reroll}><Text style={st.shopBtnTxt}>Làm mới (2) [D]</Text></Pressable>
              <Pressable style={[st.shopBtn, { backgroundColor: locked ? '#ef476f' : '#6c757d' }]} onPress={() => setLocked(l => !l)}><Text style={st.shopBtnTxt}>{locked ? 'Đã khóa' : 'Khóa shop'}</Text></Pressable>
            </View>
            <View style={[st.goldBox, hi('gold') && st.tutHi]}><Text style={st.goldTxt}>{gold} vàng</Text><Text style={st.dim}>Lãi sắp nhận: +{interestOf(gold)}{streak!==0 ? ' — Chuỗi '+(streak>0?'thắng ':'thua ')+Math.abs(streak) : ''}</Text></View>
          </View>
          <View style={{ flex: 1 }}>
            <View style={st.oddsRow}><Text style={st.dim}>Tỉ lệ shop cấp {level}:</Text>{odds.map((o, i) => (<View key={i} style={[st.oddChip, { backgroundColor: COST_COLORS[i+1] }]}><Text style={st.oddTxt}>{i+1} vàng: {o}%</Text></View>))}</View>
            <View style={[st.cardsRow, hi('shop') && st.tutHi]}>
              {shop.map((id, i) => { const d = champById(id); const copies = copiesOf(id); const glow = copies >= 2; return (
                <Pressable key={i} onPress={() => buy(i)} style={[st.shopCard, { borderColor: COST_COLORS[d.cost] }, glow && st.cardGlow]}>
                  <View style={st.cardTop}><Text style={st.cardTrait}>{d.traits.map(traitName).join(' · ')}</Text>{glow && <Text style={st.glowTag}>Sắp lên sao</Text>}</View>
                  <ChibiRig spec={d} size={64} state='idle'/>
                  <Text style={st.shopName}>{d.name}</Text>
                  <View style={[st.costBar, { backgroundColor: COST_COLORS[d.cost] }]}><Text style={st.costTxt}>{d.cost} vàng</Text><Text style={st.costTxt}>{STAR_TXT(1)}</Text></View>
                </Pressable> ); })}
            </View>
          </View>
          {phase==='plan' && <Pressable style={[st.fightBtn, hi('fight') && st.tutHiBtn]} onPress={startBattle}><Text style={st.fightTxt}>Bắt đầu đấu</Text><Text style={st.fightSub}>{isArena ? enemyForRound().label : mode==='campaign' ? stageDef(stageId).name : mode==='waves' ? 'Sóng '+wave : 'Đội luyện tập'}</Text></Pressable>}
        </View>
        <Pressable style={st.homeLink} onPress={() => router.back()}><Text style={st.dim}>Về trang chủ</Text></Pressable>
        {/* ===== OVERLAYS ===== */}
        {isTut && tutStep && (
          <View style={st.coach}>
            <ChibiRig spec={champById('nana')} size={70} state={tutStep.advanceOn==='ack' ? 'victory' : 'idle'}/>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={st.coachTitle}>Mascot Nana — Bước {tut.idx+1}: {tutStep.title}</Text>
              <Text style={st.coachTxt}>{tutStep.text}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {tutStep.advanceOn==='ack' && <Pressable style={st.smallBtn} onPress={() => { audio.playSfx('click'); emitTut('ack'); }}><Text style={st.smallTxt}>Đã hiểu</Text></Pressable>}
                <Pressable style={[st.smallBtn, { backgroundColor: '#6c757d' }]} onPress={() => { const s2 = skipTutorial(tutRef.current); setTut(s2); tutRef.current = s2; say('Đã bỏ qua hướng dẫn.'); }}><Text style={st.smallTxt}>Bỏ qua hướng dẫn</Text></Pressable>
              </View>
            </View>
          </View>
        )}
        {paused && (<View style={st.overlay}><View style={st.modal}><Text style={st.modalTitle}>Tạm dừng</Text><Text style={st.modalDesc}>Trận đấu đang tạm dừng.</Text>
          <Pressable style={st.bigBtn} onPress={() => setPaused(false)}><Text style={st.bigTxt}>Tiếp tục chơi</Text></Pressable>
          <Pressable style={[st.bigBtn, { backgroundColor:'#6c757d' }]} onPress={() => router.back()}><Text style={st.bigTxt}>Thoát về trang chủ</Text></Pressable></View></View>)}
        {carousel && !finished && (<View style={st.overlay}><View style={[st.modal, { maxWidth: 640 }]}>
          <Text style={st.modalTitle}>Vòng chọn — Carousel</Text><Text style={st.modalDesc}>Vòng tròn tướng kèm trang bị đang quay. Chạm vào 1 ô để nhận tướng + trang bị đó (các đối thủ chọn sau bạn).</Text>
          <View style={st.carCircle}>
            {carousel.map((opt, i) => { const ang = (carAngle + i * 45) * Math.PI / 180; const cx = 190 + Math.cos(ang) * 130; const cy = 130 + Math.sin(ang) * 88; const d = champById(opt.defId); return (
              <Pressable key={i} onPress={() => chooseCarousel(opt)} style={[st.carCell, { left: cx - 46, top: cy - 52, borderColor: COST_COLORS[d.cost] }]}>
                <ChibiRig spec={d} size={54} state='walk'/><Text style={st.carName}>{d.name}</Text>
                <View style={{ flexDirection:'row', alignItems:'center', gap:2 }}><ItemArt color={(itemById(opt.item)?.color) ?? '#ccc'} size={16}/><Text style={st.carItem}>{itemById(opt.item)?.name ?? ''}</Text></View>
              </Pressable> ); })}
            <View style={st.carCenter}><ChibiRig spec={champById('toto')} size={64} state='victory'/></View>
          </View>
        </View></View>)}
        {scout !== null && (<View style={st.overlay}><View style={[st.modal, { maxWidth: 560 }]}>
          <Text style={st.modalTitle}>Bàn cờ của {players[scout]?.name ?? 'Đối thủ'} (chỉ xem)</Text>
          <Text style={st.modalDesc}>Cấp {scout === 0 ? level : players[scout]?.lvl} — {scoutTeam.length} tướng trên bàn. Xem đội hình đối thủ để sắp xếp lại đội của bạn.</Text>
          <View style={st.scoutBoard}>
            {scoutTeam.map(u => (<View key={u.uid} style={[st.scoutCell, { left: 12 + u.x * 52 + (u.y % 2 ? 24 : 0), top: 10 + u.y * 44 }]}><ChibiRig spec={champById(u.defId)} size={46} star={u.star} state='idle'/></View>))}
            {!scoutTeam.length && <Text style={st.dim}>Chưa có tướng trên bàn.</Text>}
          </View>
          <View style={st.synRow}>{computeSynergies(scoutTeam).map(s => (<Text key={s.traitId} style={[st.synChip, s.active && st.synActive]}>{traitName(s.traitId)}: {s.count}{s.active ? ' (bậc '+s.tier+')' : ''}</Text>))}</View>
          <Pressable style={st.bigBtn} onPress={() => setScout(null)}><Text style={st.bigTxt}>Quay lại bàn của mình</Text></Pressable>
        </View></View>)}
        {(augChoice || finished) && (<View style={st.overlay}><View style={st.modal}>
          {finished ? (<><Text style={st.modalTitle}>Kết quả</Text><Text style={st.modalDesc}>{finished}</Text>
            <View style={{ flexDirection:'row', gap:10, justifyContent:'center' }}>{[CHAMPIONS[0], CHAMPIONS[16], CHAMPIONS[23]].map(d => <ChibiRig key={d.id} spec={d} size={70} state={finished.includes('Thắng') || finished.includes('Vô địch') || finished.includes('hạng 1') || finished.includes('Hoàn thành') ? 'victory' : 'hurt'}/>)}</View>
            <Pressable style={st.bigBtn} onPress={() => router.replace('/')}><Text style={st.bigTxt}>Về trang chủ</Text></Pressable></>)
          : (<><Text style={st.modalTitle}>Chọn cường hóa — {roundLabel(round)}</Text><Text style={st.modalDesc}>Mốc cường hóa kiểu TFT (2-1, 3-2, 4-2). Chọn 1 trong 3, hiệu lực cả trận.</Text><View style={st.modalRow}>{(augChoice ?? []).map(id => { const a = AUGMENTS.find(x => x.id===id)!; return (
            <Pressable key={id} style={st.augCard} onPress={() => chooseAugment(id)}><Text style={st.shopName}>{a.name}</Text><Text style={st.shopTrait}>{a.desc}</Text></Pressable> ); })}</View></>)}
        </View></View>)}
      </View>
    </View>
  );
}
const st = StyleSheet.create({
  root:{ flex:1, backgroundColor:'#241a2e', alignItems:'center', justifyContent:'center' },
  frame:{ backgroundColor:'#fff7fb', borderRadius:16, padding:8, gap:6, overflow:'hidden', maxWidth:'100%', maxHeight:'100%' },
  topbar:{ flexDirection:'row', gap:10, alignItems:'center', backgroundColor:'#ffe3ef', borderRadius:12, paddingHorizontal:10, paddingVertical:6 },
  stageDots:{ flexDirection:'row', gap:4, alignItems:'center' }, stageLbl:{ fontWeight:'900', fontSize:17, color:'#7b2d5b', marginRight:4 },
  dot:{ width:22, height:22, borderRadius:11, backgroundColor:'#fff', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#d8b4c8' }, dotCur:{ backgroundColor:'#ff70a6', borderColor:'#ff70a6', transform:[{scale:1.2}] }, dotPve:{ backgroundColor:'#ffe5b4' }, dotCar:{ backgroundColor:'#cdb4f6' }, dotTxt:{ fontSize:11, fontWeight:'800', color:'#5b3a29' },
  timerBox:{ flex:1, gap:2 }, timerBar:{ height:8, backgroundColor:'#0002', borderRadius:4, overflow:'hidden' }, timerFill:{ height:8, borderRadius:4 }, timerTxt:{ fontWeight:'800', color:'#28418c', fontSize:12 }, sumTxt:{ fontSize:11, color:'#555', fontWeight:'600' },
  topBtns:{ flexDirection:'row', gap:6 }, tBtn:{ backgroundColor:'#4361ee', borderRadius:999, paddingHorizontal:10, paddingVertical:6 }, tBtnTxt:{ color:'#fff', fontWeight:'700', fontSize:11 },
  middle:{ flex:1, flexDirection:'row', gap:8, minHeight:0 },
  leftPanel:{ width:172, backgroundColor:'#fff', borderRadius:14, padding:8, borderWidth:1, borderColor:'#ffd6e0' },
  rightPanel:{ width:196, backgroundColor:'#fff', borderRadius:14, padding:8, borderWidth:1, borderColor:'#ffd6e0' },
  panelTitle:{ fontWeight:'900', color:'#7b2d5b', marginBottom:4 },
  traitRow:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', backgroundColor:'#f6f1f8', borderRadius:9, paddingHorizontal:8, paddingVertical:4, marginBottom:4, borderWidth:1, borderColor:'transparent' }, traitHl:{ borderColor:'#ff70a6', borderWidth:2 }, traitName:{ fontWeight:'700', fontSize:12, color:'#333' }, traitCnt:{ fontSize:12, color:'#777', fontWeight:'700' },
  augChip:{ backgroundColor:'#fff3b0', borderRadius:9, paddingHorizontal:8, paddingVertical:4, marginBottom:4 }, augTxt:{ fontSize:11, fontWeight:'700', color:'#6b5200' },
  invWrap:{ flexDirection:'row', flexWrap:'wrap', gap:6 }, invCell:{ backgroundColor:'#fff7fb', borderRadius:10, padding:4, alignItems:'center', width:74, borderWidth:1, borderColor:'#ffd6e0' }, invTxt:{ fontSize:9, textAlign:'center', fontWeight:'600' },
  selMini:{ marginTop:8, backgroundColor:'#eef6ff', borderRadius:10, padding:7 }, selName:{ fontWeight:'800', fontSize:12 }, miniBtn:{ backgroundColor:'#4361ee', borderRadius:999, paddingHorizontal:9, paddingVertical:4 }, miniTxt:{ color:'#fff', fontWeight:'700', fontSize:10 },
  arena:{ flex:1, backgroundColor:'#d8f3dc', borderRadius:16, borderWidth:3, borderColor:'#95d5b2', position:'relative', overflow:'hidden', alignItems:'center' },
  selRing:{ position:'absolute', borderWidth:3, borderColor:'#ffb703', borderRadius:999, backgroundColor:'#ffb70333' },
  hpBar:{ width:'92%', height:5, backgroundColor:'#0003', borderRadius:3, overflow:'hidden' }, hpFill:{ height:5, backgroundColor:'#38b000' }, manaBar:{ width:'92%', height:4, backgroundColor:'#0003', borderRadius:3, overflow:'hidden', marginTop:1 }, manaFill:{ height:4, backgroundColor:'#4361ee' },
  legend:{ position:'absolute', left:8, bottom:6, flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'#ffffffcc', borderRadius:999, paddingRight:12, paddingLeft:2, paddingVertical:2 }, legendName:{ fontWeight:'800', fontSize:11, color:'#7b2d5b' }, legendHp:{ fontSize:11, color:'#555', fontWeight:'600' },
  battleCtrls:{ position:'absolute', right:8, bottom:8, flexDirection:'row', gap:6 },
  logFloat:{ position:'absolute', left:8, top:8, backgroundColor:'#ffffffd9', borderRadius:10, padding:7, maxWidth:300 }, logTxt:{ fontSize:11, color:'#444' },
  tabRow:{ flexDirection:'row', gap:6, marginBottom:6 }, tab:{ flex:1, backgroundColor:'#f1e7f5', borderRadius:999, paddingVertical:5, alignItems:'center' }, tabOn:{ backgroundColor:'#ff70a6' }, tabTxt:{ fontWeight:'800', fontSize:11, color:'#333' },
  pRow:{ flexDirection:'row', gap:7, alignItems:'center', backgroundColor:'#f7fbff', borderRadius:11, padding:6, marginBottom:5, borderWidth:2, borderColor:'transparent' }, pDead:{ opacity:0.45, backgroundColor:'#eee' }, pOpp:{ borderColor:'#ffb703', backgroundColor:'#fff8e1' }, pName:{ fontWeight:'800', fontSize:11 }, pHpBar:{ height:7, backgroundColor:'#0002', borderRadius:4, overflow:'hidden', marginVertical:2 }, pHpFill:{ height:7 }, pHp:{ fontSize:10, color:'#555', fontWeight:'600' },
  dRow:{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:5 }, dName:{ width:86, fontSize:11, fontWeight:'700' }, dBar:{ flex:1, backgroundColor:'#0001', borderRadius:5 }, dVal:{ width:38, fontSize:11, fontWeight:'800', textAlign:'right' },
  infoLine:{ fontWeight:'800', color:'#5b3a29' },
  benchRow:{ flexDirection:'row', gap:5, alignItems:'center', backgroundColor:'#fff', borderRadius:12, padding:6, borderWidth:1, borderColor:'#ffd6e0' }, benchLbl:{ fontWeight:'900', color:'#7b2d5b', fontSize:12, marginRight:2 }, benchCell:{ width:50, height:50, backgroundColor:'#fff7fb', borderRadius:10, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#ffd6e0' }, cellSel:{ borderWidth:3, borderColor:'#ff70a6' }, cellDot:{ color:'#95d5b2', fontSize:18 }, logMini:{ flex:1, gap:1 },
  shopRow:{ flexDirection:'row', gap:8, backgroundColor:'#fff', borderRadius:14, padding:8, borderWidth:1, borderColor:'#ffd6e0', alignItems:'stretch' },
  shopLeft:{ width:206, gap:6 }, lvlCard:{ backgroundColor:'#eef2ff', borderRadius:10, padding:7 }, lvlBig:{ fontWeight:'900', fontSize:16, color:'#28418c' }, xpBar:{ height:7, backgroundColor:'#0002', borderRadius:4, overflow:'hidden', marginVertical:3 },
  shopBtn:{ flex:1, backgroundColor:'#4361ee', borderRadius:10, paddingVertical:7, alignItems:'center' }, shopBtnTxt:{ color:'#fff', fontWeight:'800', fontSize:10 },
  goldBox:{ backgroundColor:'#fff3b0', borderRadius:10, padding:7 }, goldTxt:{ fontWeight:'900', fontSize:16, color:'#7a5b00' },
  oddsRow:{ flexDirection:'row', gap:5, alignItems:'center', marginBottom:5, flexWrap:'wrap' }, oddChip:{ borderRadius:999, paddingHorizontal:8, paddingVertical:2 }, oddTxt:{ color:'#fff', fontWeight:'800', fontSize:10 },
  cardsRow:{ flexDirection:'row', gap:7 }, shopCard:{ flex:1, maxWidth:172, backgroundColor:'#fff7fb', borderRadius:13, padding:6, alignItems:'center', borderWidth:2, gap:1 }, cardGlow:{ borderColor:'#ffb703', shadowColor:'#ffb703', shadowOpacity:0.85, shadowRadius:9, elevation:6, backgroundColor:'#fffbe8' },
  cardTop:{ flexDirection:'row', justifyContent:'space-between', width:'100%', alignItems:'center' }, cardTrait:{ fontSize:9, color:'#666', fontWeight:'600', flex:1 }, glowTag:{ fontSize:9, fontWeight:'900', color:'#a86e00', backgroundColor:'#ffe08a', borderRadius:6, paddingHorizontal:4, paddingVertical:1 },
  shopName:{ fontWeight:'800', textAlign:'center', fontSize:12 }, costBar:{ flexDirection:'row', justifyContent:'space-between', width:'100%', borderRadius:7, paddingHorizontal:8, paddingVertical:3 }, costTxt:{ color:'#fff', fontWeight:'900', fontSize:11 },
  fightBtn:{ width:118, backgroundColor:'#ff70a6', borderRadius:14, alignItems:'center', justifyContent:'center', padding:8, gap:2 }, fightTxt:{ color:'#fff', fontWeight:'900', fontSize:15, textAlign:'center' }, fightSub:{ color:'#ffe3ef', fontWeight:'600', fontSize:10, textAlign:'center' },
  homeLink:{ alignSelf:'center', paddingVertical:1 },
  dim:{ fontSize:11, color:'#777', lineHeight:15 }, synRow:{ flexDirection:'row', flexWrap:'wrap', gap:6 }, synChip:{ backgroundColor:'#eef2ff', borderRadius:999, paddingHorizontal:9, paddingVertical:4, fontSize:12 }, synActive:{ backgroundColor:'#ffe08a', fontWeight:'800' },
  coach:{ position:'absolute', top:52, alignSelf:'center', width:'92%', maxWidth:600, flexDirection:'row', gap:10, backgroundColor:'#eef6ff', borderRadius:16, padding:10, borderWidth:2, borderColor:'#4361ee', alignItems:'center', zIndex:60, shadowColor:'#000', shadowOpacity:0.25, shadowRadius:10, elevation:8 }, coachTitle:{ fontWeight:'900', color:'#28418c' }, coachTxt:{ color:'#333', lineHeight:18, fontSize:12 },
  tutHi:{ borderWidth:3, borderColor:'#ffb703', borderRadius:12 }, tutHiBtn:{ borderWidth:3, borderColor:'#ffb703' },
  section:{ fontWeight:'800', color:'#5b3a29' }, shopTrait:{ fontSize:11, color:'#555', textAlign:'center' },
  smallBtn:{ backgroundColor:'#4361ee', borderRadius:999, paddingHorizontal:12, paddingVertical:7 }, smallTxt:{ color:'#fff', fontWeight:'700', fontSize:12 },
  bigBtn:{ backgroundColor:'#ff70a6', borderRadius:999, paddingVertical:12, alignItems:'center', marginTop:4 }, bigTxt:{ color:'#fff', fontWeight:'800', fontSize:15 },
  overlay:{ position:'absolute', inset:0, backgroundColor:'#150a24cc', alignItems:'center', justifyContent:'center', padding:14, zIndex:80 } as any,
  modal:{ backgroundColor:'#fff7fb', borderRadius:20, padding:16, gap:9, maxWidth:560, width:'100%', maxHeight:'94%' }, modalTitle:{ fontSize:19, fontWeight:'900', textAlign:'center', color:'#7b2d5b' }, modalDesc:{ textAlign:'center', color:'#555', fontSize:12, lineHeight:17 }, modalRow:{ flexDirection:'row', gap:9, justifyContent:'center', flexWrap:'wrap' },
  augCard:{ backgroundColor:'#fff3b0', borderRadius:14, padding:11, width:158, alignItems:'center', gap:3 },
  carCircle:{ height:290, position:'relative' }, carCell:{ position:'absolute', width:92, backgroundColor:'#fff', borderRadius:13, borderWidth:2, padding:4, alignItems:'center' }, carName:{ fontWeight:'800', fontSize:10, textAlign:'center' }, carItem:{ fontSize:9, fontWeight:'600', color:'#555' }, carCenter:{ position:'absolute', left:190-32, top:130-32 },
  scoutBoard:{ height:210, backgroundColor:'#d8f3dc', borderRadius:14, position:'relative' }, scoutCell:{ position:'absolute', width:50, height:50, alignItems:'center' },
});
