import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ItemArt } from './ChibiArt';
import ChibiRig from './ChibiRig';
import { FloorCell, LayeredBoardBg } from './SceneArt';
import { rowDepth, stateForUnit } from '../game/rig';
import { AUGMENTS, BOT_NAMES, CAMPAIGN, CHAMPIONS, ITEMS, MONSTERS, champById, itemById, monsterById, traitName } from '../game/data';
import { BattleResult, PlacedUnit, computeSynergies, interestOf, isPveRound, makeAiTeam, makeMonsterTeam, newUid, pveEnemiesForRound, randomItem, rollShop, sellValue, simulateBattle, streakBonus, xpToNext } from '../game/engine';
import { loadMeta, saveMeta } from '../game/storage';
export type GameMode = 'arena' | 'campaign' | 'waves';
interface Props { mode: GameMode; stageId?: number; }
const STAR_TXT = (s:number) => s===1?'★':s===2?'★★':'★★★';
export default function GameScreen({ mode, stageId = 1 }: Props) {
  const [gold, setGold] = useState(mode==='arena'?5:40);
  const [xp, setXp] = useState(0); const [level, setLevel] = useState(mode==='arena'?1:5);
  const [hp, setHp] = useState(100); const [round, setRound] = useState(1);
  const [bench, setBench] = useState<PlacedUnit[]>([]); const [board, setBoard] = useState<PlacedUnit[]>([]);
  const [shop, setShop] = useState<string[]>(() => rollShop(mode==='arena'?1:5));
  const [locked, setLocked] = useState(false); const [inventory, setInventory] = useState<string[]>(mode==='campaign'?['kiem']:[]);
  const [selUid, setSelUid] = useState<string|null>(null); const [selItem, setSelItem] = useState<string|null>(null);
  const [phase, setPhase] = useState<'plan'|'battle'|'done'>('plan');
  const [result, setResult] = useState<BattleResult|null>(null); const [frameIdx, setFrameIdx] = useState(0);
  const [speed, setSpeed] = useState(1); const [streak, setStreak] = useState(0);
  const [log, setLog] = useState<string[]>(['Chào mừng đến Đấu Trường Chibi! Mua tướng, xếp đội hình rồi bấm Bắt đầu đấu.']);
  const [augments, setAugments] = useState<string[]>([]); const [augChoice, setAugChoice] = useState<string[]|null>(mode==='arena'?null:null);
  const [draft, setDraft] = useState<string[]|null>(mode==='arena' ? [CHAMPIONS[2].id, CHAMPIONS[5].id, CHAMPIONS[9].id] : null);
  const [wave, setWave] = useState(1); const [finished, setFinished] = useState<string|null>(null);
  const [players, setPlayers] = useState(() => [{ name:'Bạn', hp:100, alive:true }, ...BOT_NAMES.map(n => ({ name:n, hp:100, alive:true }))]);
  const [oppIdx, setOppIdx] = useState(1); const resolvedRef = useRef(false);
  const allUnits = useMemo(() => [...board, ...bench], [board, bench]);
  const synergies = useMemo(() => computeSynergies(board), [board]);
  const say = (s: string) => setLog(prev => [s, ...prev].slice(0, 8));
  const enemyForRound = (): { units: PlacedUnit[]; label: string } => {
    if (mode==='campaign') { const st = CAMPAIGN.find(s => s.id===stageId)!; return { units: makeMonsterTeam(st.enemies.map(e => ({ def: monsterById(e.id), count: e.count }))), label: st.name }; }
    if (mode==='waves') { const scale = 1 + (wave-1)*0.22; const pool = wave%5===0 ? [{def:MONSTERS[7],count:1},{def:MONSTERS[0],count:2}] : [{def:MONSTERS[wave%6],count:Math.min(6,2+Math.floor(wave/2))}]; return { units: makeMonsterTeam(pool, scale), label: 'Sóng '+wave }; }
    if (isPveRound(round)) return { units: pveEnemiesForRound(round), label: 'Quái PvE vòng '+round };
    const aliveBots = players.map((p,i)=>({p,i})).filter(x => x.i>0 && x.p.alive); const pick = aliveBots.length ? aliveBots[round % aliveBots.length] : { i: 1, p: players[1] };
    return { units: makeAiTeam(round, pick.i*3+round), label: 'Đội của ' + pick.p.name };
  };
  const [enemyLabel, setEnemyLabel] = useState('');
  function addUnit(defId: string, toBoard = false) {
    const u: PlacedUnit = { uid: newUid(), defId, star: 1, items: [], x: 0, y: 0 };
    let nb = [...bench], nd = [...board];
    if (toBoard && nd.length < level) { u.x = nd.length % 7; u.y = champById(defId).range <= 1 ? 2 : 3; nd.push(u); } else nb.push(u);
    // Ghep sao tu dong: 3 tuong 1 sao -> 2 sao, 3 tuong 2 sao -> 3 sao
    for (let star = 1; star <= 2; star++) {
      const all = [...nd, ...nb]; const same = all.filter(x => x.defId===defId && x.star===star);
      if (same.length >= 3) {
        const removeIds = new Set(same.slice(0,3).map(x => x.uid)); const items = same.slice(0,3).flatMap(x => x.items).slice(0,3);
        nd = nd.filter(x => !removeIds.has(x.uid)); nb = nb.filter(x => !removeIds.has(x.uid));
        const merged: PlacedUnit = { uid: newUid(), defId, star: star+1, items, x: same[0].x, y: same[0].y };
        if (nd.length < level) nd.push(merged); else nb.push(merged);
        say(`${champById(defId).name} đã lên ${star+1} sao!`);
      }
    }
    setBoard(nd); setBench(nb.slice(0, 9));
  }
  function buy(i: number) {
    if (phase!=='plan') return; const id = shop[i]; const cost = champById(id).cost;
    if (gold < cost) { say('Không đủ vàng!'); return; }
    if (bench.length >= 9 && board.length >= level) { say('Hàng chờ và bàn cờ đã đầy!'); return; }
    setGold(g => g - cost); addUnit(id);
    if (!locked) { /* giu o shop cho den khi lam moi, danh dau da mua bang cach thay o moi */ }
    setShop(prev => { const n=[...prev]; n[i]=rollShop(level)[0]; return n; });
  }
  function buyXp() { if (gold < 4 || level >= 9) return; setGold(g => g-4); gainXp(4); say('Mua 4 XP.'); }
  function gainXp(amount: number) { let nx = xp + amount, nl = level; while (nl < 9 && nx >= xpToNext(nl)) { nx -= xpToNext(nl); nl++; say('Lên cấp '+nl+'!'); } setXp(nx); setLevel(nl); }
  function reroll() { if (gold < 2 || locked) return; setGold(g => g-2); setShop(rollShop(level)); }
  function sellSelected() { const u = allUnits.find(x => x.uid===selUid); if (!u) return; setGold(g => g + sellValue(u.defId, u.star)); setBoard(b => b.filter(x => x.uid!==selUid)); setBench(b => b.filter(x => x.uid!==selUid)); setSelUid(null); say('Đã bán '+champById(u.defId).name); }
  function tapBoardCell(x: number, y: number) {
    if (phase!=='plan') return; const occupant = board.find(u => u.x===x && u.y===y);
    if (selItem) { const target = occupant; if (target) equipTo(target); return; }
    if (selUid) { const u = allUnits.find(v => v.uid===selUid)!;
      if (occupant && occupant.uid !== selUid) { // doi cho
        const ox = u.x, oy = u.y; setBoard(prev => prev.map(v => v.uid===selUid ? {...v, x: occupant.x, y: occupant.y} : v.uid===occupant.uid ? {...v, x: ox, y: oy} : v)); setSelUid(null); return; }
      if (bench.some(v => v.uid===selUid)) { if (board.length >= level) { say('Bàn cờ đầy theo cấp!'); return; } setBench(b => b.filter(v => v.uid!==selUid)); setBoard(b => [...b, {...u, x, y}]); }
      else setBoard(prev => prev.map(v => v.uid===selUid ? {...v, x, y} : v));
      setSelUid(null); return;
    }
    if (occupant) setSelUid(occupant.uid);
  }
  function tapBench(u: PlacedUnit) { if (selItem) { equipTo(u); return; } setSelUid(selUid===u.uid?null:u.uid); }
  function equipTo(u: PlacedUnit) { if (!selItem) return; if (u.items.length>=3) { say('Tướng đã có 3 trang bị!'); return; }
    const apply = (arr: PlacedUnit[]) => arr.map(v => v.uid===u.uid ? {...v, items:[...v.items, selItem!]} : v);
    setBoard(apply); setBench(apply); setInventory(inv => { const i = inv.indexOf(selItem); const n=[...inv]; n.splice(i,1); return n; }); say('Đã gắn '+ (itemById(selItem)?.name ?? '') +' cho '+champById(u.defId).name); setSelItem(null); }
  function moveToBench() { const u = board.find(v => v.uid===selUid); if (!u || bench.length>=9) return; setBoard(b => b.filter(v => v.uid!==selUid)); setBench(b => [...b, u]); setSelUid(null); }
  function startBattle() {
    if (!board.length) { say('Hãy đặt ít nhất 1 tướng lên bàn cờ!'); return; }
    const e = enemyForRound(); setEnemyLabel(e.label); resolvedRef.current = false;
    const res = simulateBattle(board, e.units, augments, round*17 + wave*31 + stageId);
    setResult(res); setFrameIdx(0); setPhase('battle');
  }
  useEffect(() => { if (phase!=='battle' || !result) return; const iv = setInterval(() => setFrameIdx(f => Math.min(f+1, result.frames.length-1)), 420/speed); return () => clearInterval(iv); }, [phase, result, speed]);
  useEffect(() => { if (phase==='battle' && result && frameIdx >= result.frames.length-1 && !resolvedRef.current) { resolvedRef.current = true; const tm = setTimeout(() => resolveBattle(), 650); return () => clearTimeout(tm); } }, [frameIdx, phase, result]);
  async function addGems(n: number) { const m = await loadMeta(); m.gems += n; if (mode==='waves') m.bestWave = Math.max(m.bestWave, wave); await saveMeta(m); }
  function resolveBattle() {
    if (!result) return; const win = result.winner===0; setPhase('done');
    if (mode==='campaign') { const st = CAMPAIGN.find(s => s.id===stageId)!;
      if (win) { const frac = result.survivors / Math.max(1, board.length); const stars = frac>=0.7?3:frac>=0.35?2:1;
        loadMeta().then(async m => { m.campaignStars[String(stageId)] = Math.max(m.campaignStars[String(stageId)] ?? 0, stars); m.unlockedStage = Math.max(m.unlockedStage, Math.min(12, stageId+1)); m.gems += st.reward; if (stageId===12) m.wins += 1; await saveMeta(m); });
        setFinished(`Thắng ải ${st.name}! Nhận ${stars} sao và ${st.reward} Ngọc.`); }
      else setFinished('Thua rồi... Hãy nâng cấp đội hình, ghép sao và thử lại nhé.');
      return; }
    if (mode==='waves') { if (win) { say('Qua sóng '+wave+'! Sóng tiếp theo mạnh hơn.'); setWave(w => w+1); setGold(g => g + 6 + Math.floor(wave/3)); if (wave%3===0) setInventory(inv => [...inv, randomItem()]); setPhase('plan'); setResult(null); }
      else { addGems(wave*5); setFinished(`Dừng lại ở sóng ${wave}. Kỷ lục được lưu, nhận ${wave*5} Ngọc.`); } return; }
    // Arena
    const dmgTaken = win ? 0 : 2 + result.enemySurvivors*2 + Math.floor(round/6);
    let newHp = hp; const newPlayers = players.map((p,i) => ({ ...p }));
    if (win) { setStreak(s => s>=0 ? s+1 : 1); } else { setStreak(s => s<=0 ? s-1 : -1); newHp = Math.max(0, hp - dmgTaken); setHp(newHp); newPlayers[0] = { ...newPlayers[0], hp: newHp, alive: newHp>0 }; say(`Thua round, mất ${dmgTaken} máu.`); }
    if (win) say('Thắng round!');
    // Bot tu mat mau dan
    for (let i=1;i<newPlayers.length;i++) { if (!newPlayers[i].alive) continue; const loss = Math.floor(Math.random()*9) + Math.floor(round/3); newPlayers[i].hp = Math.max(0, newPlayers[i].hp - (win && i===oppIdx ? 6+result.survivors*2 : loss)); newPlayers[i].alive = newPlayers[i].hp>0; }
    setPlayers(newPlayers); setOppIdx(o => o+1);
    const aliveCount = newPlayers.filter(p => p.alive).length;
    const reward = 5 + interestOf(gold) + streakBonus(streak) + (win?1:0) + (augments.includes('vang2') && win ? 4 : 0);
    setGold(g => g + reward); gainXp(2);
    if (isPveRound(round) && win) { setInventory(inv => [...inv, randomItem()]); setGold(g => g+3); say('Round PvE rơi trang bị và vàng!'); }
    if (augments.includes('hoi1')) setHp(h => Math.min(100, (win? h : newHp) + 2));
    const nextRound = round + 1; setRound(nextRound);
    if (!locked) setShop(rollShop(level));
    if (newHp<=0 || aliveCount<=1) { const rank = newHp<=0 ? aliveCount : 1; loadMeta().then(async m => { m.bestRank = Math.min(m.bestRank, rank); m.gems += Math.max(10, (9-rank)*15); if (rank===1) m.wins += 1; await saveMeta(m); }); setFinished(rank===1 ? 'Vô địch! Bạn đứng hạng 1/8. Tuyệt vời!' : `Trận đấu kết thúc. Bạn xếp hạng ${rank}/8.`); return; }
    if ([5,12,20].includes(nextRound)) { const pool = [...AUGMENTS].sort(() => Math.random()-0.5).slice(0,3); setAugChoice(pool.map(a => a.id)); }
    setPhase('plan'); setResult(null);
  }
  function chooseAugment(id: string) { const a = AUGMENTS.find(x => x.id===id)!; setAugments(prev => [...prev, id]); setAugChoice(null);
    if (a.kind==='gold') setGold(g => g + a.value); if (a.kind==='xp') gainXp(a.value); if (a.kind==='healPlayer') setHp(h => Math.min(100, h + a.value)); say('Đã chọn cường hóa: '+a.name); }
  function chooseDraft(id: string) { setDraft(null); addUnit(id, true); say('Nhận miễn phí '+champById(id).name+' từ vòng chọn!'); }
  const frame = result?.frames[Math.min(frameIdx, (result.frames.length-1) || 0)];
  const cell = 46;
  return (
    <ScrollView style={st.screen} contentContainerStyle={{ padding: 12, gap: 10 }}>
      <View style={st.topbar}>
        <Text style={st.title}>{mode==='arena'?'Đấu Trường':mode==='campaign'?('Chiến Dịch - Ải '+stageId):'Thử Thách Sóng Quái'}</Text>
        <View style={st.statsRow}>
          <Text style={st.stat}>Vàng: {gold}</Text><Text style={st.stat}>Cấp {level} ({xp}/{xpToNext(level)} XP)</Text>
          {mode==='arena' && <Text style={st.stat}>Máu: {hp}</Text>}
          <Text style={st.stat}>{mode==='waves'?('Sóng '+wave):('Round '+round)}</Text>
          <Text style={st.stat}>Đội: {board.length}/{level}</Text>
        </View>
      </View>
      {mode==='arena' && (<View style={st.players}>{players.map((p,i) => (<View key={i} style={[st.playerChip, !p.alive && st.dead]}><Text style={st.playerTxt}>{p.name}: {p.hp} máu{p.alive?'':' (loại)'}</Text></View>))}</View>)}
      {!!synergies.length && (<View style={st.synRow}>{synergies.map(s => (<Text key={s.traitId} style={[st.synChip, s.active && st.synActive]}>{traitName(s.traitId)}: {s.count}{s.active?' (kích hoạt bậc '+s.tier+')':''}</Text>))}</View>)}
      <Text style={st.section}>{phase==='battle' ? ('Đang đấu: '+enemyLabel) : 'Bàn cờ - chạm tướng ở hàng chờ để chọn, chạm ô để đặt / di chuyển'}</Text>
      <View style={{alignSelf:'center'}}><LayeredBoardBg width={cell*7+12}/></View>
      <View style={[st.board, { width: cell*7+12, height: (phase==='battle'? cell*7 : cell*4)+12 }]}>
        {phase!=='battle' && Array.from({length:4}).map((_,y) => Array.from({length:7}).map((_,x) => { const u = board.find(v => v.x===x && v.y===y); return (
          <Pressable key={x+'-'+y} onPress={() => tapBoardCell(x,y)} style={[st.cell, { left: 6+x*cell, top: 6+y*cell, width: cell-4, height: cell-4 }, selUid && u?.uid===selUid && st.cellSel]}>
            {u ? <ChibiRig spec={champById(u.defId)} size={(cell-4)*rowDepth(y,4).scale} star={u.star} state='idle'/> : <Text style={st.cellDot}>·</Text>}
          </Pressable> ); }))}
        {phase==='battle' && frame && [...frame.units].sort((a,b) => a.y-b.y).map(u => { const prev = result && frameIdx>0 ? result.frames[frameIdx-1].units.find(v => v.uid===u.uid) : undefined; const evs = result ? result.events.filter(e => Math.abs(e.t-frame.t)<0.3) : []; const animState = stateForUnit({ alive: u.alive, moved: !!prev && (prev.x!==u.x || prev.y!==u.y), castAtFrame: evs.some(e => e.uid===u.uid && e.text.includes('kỹ năng')), attackedAtFrame: evs.some(e => e.text.startsWith(u.name+' đánh')), hurtAtFrame: evs.some(e => e.uid===u.uid && !!e.amount), battleOver: frameIdx >= (result?.frames.length ?? 1)-1, won: result?.winner===u.team }); const dep = rowDepth(u.y, 7); return (
          <View key={u.uid} style={[st.battleUnit, { left: 6+u.x*cell, top: 6+u.y*cell, width: cell-2, height: cell-2, zIndex: dep.zIndex }]}>
            <ChibiRig spec={u.isMonster ? monsterById(u.defId) : champById(u.defId)} size={(cell-6)*dep.scale + 8} star={u.star} state={animState} flip={u.team===1}/>
            <View style={st.hpBar}><View style={[st.hpFill, { width: Math.max(0, Math.min(100, u.hp/u.maxHp*100))+'%' } ]}/></View>
            <View style={st.manaBar}><View style={[st.manaFill, { width: Math.min(100, u.mana/u.maxMana*100)+'%' } ]}/></View>
          </View> ); })}
        {phase==='battle' && (<View style={st.battleCtrls}><Pressable style={st.smallBtn} onPress={() => setSpeed(s => s===1?2:1)}><Text style={st.smallTxt}>Tốc độ x{speed}</Text></Pressable><Pressable style={st.smallBtn} onPress={() => result && setFrameIdx(result.frames.length-1)}><Text style={st.smallTxt}>Bỏ qua tới kết quả</Text></Pressable></View>)}
      </View>
      {phase==='battle' && result && (<View style={st.logBox}>{result.events.filter(e => Math.abs(e.t - (frame?.t ?? 0)) < 1.4).slice(-3).map((e,i) => <Text key={i} style={st.logTxt}>{e.text}{e.amount?(' ('+e.amount+')'):''}</Text>)}</View>)}
      <Text style={st.section}>Hàng chờ (chạm để chọn, chạm tướng đang chọn rồi bấm Bán / Về hàng chờ)</Text>
      <View style={st.benchRow}>{Array.from({length:9}).map((_,i) => { const u = bench[i]; return (
        <Pressable key={i} onPress={() => u && tapBench(u)} style={[st.benchCell, u && selUid===u.uid && st.cellSel]}>{u ? <ChibiRig spec={champById(u.defId)} size={42} star={u.star} state='idle'/> : <Text style={st.cellDot}>·</Text>}</Pressable> ); })}
      </View>
      {selUid && (() => { const u = allUnits.find(v => v.uid===selUid); if (!u) return null; const d = champById(u.defId); return (
        <View style={st.selBox}><ChibiRig spec={d} size={64} star={u.star} state='idle'/><View style={{flex:1}}><Text style={st.selName}>{d.name} {STAR_TXT(u.star)} - {d.skill.name}</Text><Text style={st.selDesc}>{d.skill.desc} | Đồ: {u.items.map(i => itemById(i)?.name).filter(Boolean).join(', ') || 'chưa có'}</Text></View>
        <Pressable style={st.smallBtn} onPress={sellSelected}><Text style={st.smallTxt}>Bán +{sellValue(u.defId, u.star)} vàng</Text></Pressable>
        {board.some(v => v.uid===selUid) && <Pressable style={st.smallBtn} onPress={moveToBench}><Text style={st.smallTxt}>Về hàng chờ</Text></Pressable>}</View> ); })()}
      {!!inventory.length && (<View><Text style={st.section}>Trang bị (chạm chọn đồ, rồi chạm tướng để gắn, tối đa 3 đồ/tướng)</Text><View style={st.invRow}>{inventory.map((iid, i) => { const it = itemById(iid); if (!it) return null; return (
        <Pressable key={i} onPress={() => setSelItem(selItem===iid?null:iid)} style={[st.invCell, selItem===iid && st.cellSel]}><ItemArt color={it.color} size={36}/><Text style={st.invTxt}>{it.name}</Text></Pressable> ); })}</View></View>)}
      <View style={st.shopHead}><Text style={st.section}>Cửa hàng</Text>
        <Pressable style={st.smallBtn} onPress={reroll}><Text style={st.smallTxt}>Làm mới (2 vàng)</Text></Pressable>
        <Pressable style={st.smallBtn} onPress={() => setLocked(l => !l)}><Text style={st.smallTxt}>{locked?'Mở khóa shop':'Khóa shop'}</Text></Pressable>
        <Pressable style={st.smallBtn} onPress={buyXp}><Text style={st.smallTxt}>Mua XP (4 vàng)</Text></Pressable></View>
      <View style={st.shopRow}>{shop.map((id, i) => { const d = champById(id); return (
        <Pressable key={i} onPress={() => buy(i)} style={st.shopCard}><ChibiRig spec={d} size={78} state='idle'/><Text style={st.shopName}>{d.name}</Text><Text style={st.shopCost}>{d.cost} vàng - {STAR_TXT(1)}</Text><Text style={st.shopTrait}>{d.traits.map(traitName).join(' / ')}</Text><Text style={st.shopSkill}>{d.skill.name}</Text></Pressable> ); })}
      </View>
      {phase==='plan' && <Pressable style={st.bigBtn} onPress={startBattle}><Text style={st.bigTxt}>Bắt đầu đấu{mode!=='arena'?'':' - '+enemyForRound().label}</Text></Pressable>}
      <View style={st.logBox}>{log.map((l,i) => <Text key={i} style={st.logTxt}>{l}</Text>)}</View>
      <Pressable style={st.homeBtn} onPress={() => router.back()}><Text style={st.smallTxt}>Về trang chủ</Text></Pressable>
      {(draft || augChoice || finished) && (<View style={st.overlay}><View style={st.modal}>
        {finished ? (<><Text style={st.modalTitle}>Kết quả</Text><Text style={st.modalDesc}>{finished}</Text>
          <View style={{flexDirection:'row', gap:10, justifyContent:'center'}}>{welcomeRow(finished.includes('Thắng') || finished.includes('Vô địch') || finished.includes('Qua sóng') || finished.includes('hạng 1'))}</View>
          <Pressable style={st.bigBtn} onPress={() => router.replace('/')}><Text style={st.bigTxt}>Về trang chủ</Text></Pressable></>) 
        : draft ? (<><Text style={st.modalTitle}>Vòng chọn thưởng</Text><Text style={st.modalDesc}>Chọn 1 tướng miễn phí để bắt đầu trận đấu.</Text><View style={st.modalRow}>{draft.map(id => { const d = champById(id); return (
          <Pressable key={id} style={st.shopCard} onPress={() => chooseDraft(id)}><ChibiRig spec={d} size={88} state='victory'/><Text style={st.shopName}>{d.name}</Text><Text style={st.shopTrait}>{d.traits.map(traitName).join(' / ')}</Text></Pressable> ); })}</View></>)
        : (<><Text style={st.modalTitle}>Chọn cường hóa</Text><Text style={st.modalDesc}>Chọn 1 trong 3 cường hóa, hiệu lực cả trận.</Text><View style={st.modalRow}>{(augChoice ?? []).map(id => { const a = AUGMENTS.find(x => x.id===id)!; return (
          <Pressable key={id} style={st.augCard} onPress={() => chooseAugment(id)}><Text style={st.shopName}>{a.name}</Text><Text style={st.shopTrait}>{a.desc}</Text></Pressable> ); })}</View></>)}
      </View></View>)}
    </ScrollView>
  );
}
function welcomeRow(win: boolean) { return [CHAMPIONS[0], CHAMPIONS[16], CHAMPIONS[23]].map(d => <ChibiRig key={d.id} spec={d} size={76} state={win?'victory':'hurt'}/>); }
const st = StyleSheet.create({
  screen:{ flex:1, backgroundColor:'#fff7fb' }, topbar:{ gap:6 }, title:{ fontSize:22, fontWeight:'800', color:'#7b2d5b' },
  statsRow:{ flexDirection:'row', flexWrap:'wrap', gap:8 }, stat:{ backgroundColor:'#ffe3ef', paddingHorizontal:10, paddingVertical:5, borderRadius:999, fontWeight:'700', color:'#7b2d5b' },
  players:{ flexDirection:'row', flexWrap:'wrap', gap:6 }, playerChip:{ backgroundColor:'#e7f9ee', borderRadius:999, paddingHorizontal:9, paddingVertical:4 }, dead:{ backgroundColor:'#e9ecef', opacity:0.6 }, playerTxt:{ fontSize:12, fontWeight:'600' },
  synRow:{ flexDirection:'row', flexWrap:'wrap', gap:6 }, synChip:{ backgroundColor:'#eef2ff', borderRadius:999, paddingHorizontal:9, paddingVertical:4, fontSize:12 }, synActive:{ backgroundColor:'#ffe08a', fontWeight:'800' },
  section:{ fontWeight:'800', color:'#5b3a29', marginTop:4 },
  board:{ backgroundColor:'#d8f3dc', borderRadius:18, alignSelf:'center', borderWidth:3, borderColor:'#95d5b2', position:'relative' },
  cell:{ position:'absolute', backgroundColor:'#ffffffaa', borderRadius:12, alignItems:'center', justifyContent:'center' }, cellSel:{ borderWidth:3, borderColor:'#ff70a6' }, cellDot:{ color:'#95d5b2', fontSize:20 },
  battleUnit:{ position:'absolute', alignItems:'center' }, hpBar:{ width:'92%', height:5, backgroundColor:'#0003', borderRadius:3, overflow:'hidden' }, hpFill:{ height:5, backgroundColor:'#38b000' }, manaBar:{ width:'92%', height:4, backgroundColor:'#0003', borderRadius:3, overflow:'hidden', marginTop:1 }, manaFill:{ height:4, backgroundColor:'#4361ee' },
  battleCtrls:{ position:'absolute', right:8, bottom:8, flexDirection:'row', gap:6 },
  benchRow:{ flexDirection:'row', gap:6, flexWrap:'wrap' }, benchCell:{ width:48, height:48, backgroundColor:'#fff', borderRadius:12, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#ffd6e0' },
  selBox:{ flexDirection:'row', gap:10, backgroundColor:'#fff', borderRadius:14, padding:10, alignItems:'center' }, selName:{ fontWeight:'800' }, selDesc:{ fontSize:12, color:'#555' },
  invRow:{ flexDirection:'row', gap:8, flexWrap:'wrap' }, invCell:{ backgroundColor:'#fff', borderRadius:12, padding:6, alignItems:'center', width:86 }, invTxt:{ fontSize:11, textAlign:'center', fontWeight:'600' },
  shopHead:{ flexDirection:'row', gap:8, alignItems:'center', flexWrap:'wrap' }, shopRow:{ flexDirection:'row', gap:8, flexWrap:'wrap' },
  shopCard:{ backgroundColor:'#fff', borderRadius:16, padding:8, alignItems:'center', width:118, borderWidth:1, borderColor:'#ffd6e0' }, shopName:{ fontWeight:'800', textAlign:'center' }, shopCost:{ color:'#e07b00', fontWeight:'700' }, shopTrait:{ fontSize:11, color:'#555', textAlign:'center' }, shopSkill:{ fontSize:11, color:'#7b2d5b', fontWeight:'600', textAlign:'center' },
  bigBtn:{ backgroundColor:'#ff70a6', borderRadius:999, paddingVertical:13, alignItems:'center', marginTop:6 }, bigTxt:{ color:'#fff', fontWeight:'800', fontSize:16 },
  smallBtn:{ backgroundColor:'#4361ee', borderRadius:999, paddingHorizontal:12, paddingVertical:7 }, smallTxt:{ color:'#fff', fontWeight:'700', fontSize:12 },
  homeBtn:{ backgroundColor:'#6c757d', borderRadius:999, paddingVertical:9, alignItems:'center' },
  logBox:{ backgroundColor:'#fff', borderRadius:12, padding:10, gap:2 }, logTxt:{ fontSize:12, color:'#444' },
  overlay:{ position:'absolute', inset:0, backgroundColor:'#0008', alignItems:'center', justifyContent:'center', padding:16, zIndex:50 } as any,
  modal:{ backgroundColor:'#fff7fb', borderRadius:20, padding:18, gap:10, maxWidth:560, width:'100%' }, modalTitle:{ fontSize:20, fontWeight:'800', textAlign:'center', color:'#7b2d5b' }, modalDesc:{ textAlign:'center', color:'#555' }, modalRow:{ flexDirection:'row', gap:10, justifyContent:'center', flexWrap:'wrap' },
  augCard:{ backgroundColor:'#fff3b0', borderRadius:16, padding:12, width:160, alignItems:'center', gap:4 },
});
