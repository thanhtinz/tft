import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { ItemArt } from './ChibiArt';
import SpriteUnit, { SceneArtImage } from './SpriteUnit';
import { rowDepth, stateForUnit } from '../game/rig';
import { AUGMENTS, CHAMPIONS, champById, itemById, monsterById, traitName } from '../game/data';
import { BattleResult, PlacedUnit, computeSynergies, interestOf, isPveRound, newUid, pveEnemiesForRound, randomItem, rollShop, sellValue, simulateBattle, streakBonus, xpToNext } from '../game/engine';
import { loadMeta, loadPlayer, saveMeta } from '../game/storage';
import { applyMatchRewards } from '../game/accounts';
import { rankLabel, xpForPlacement } from '../game/auth';
import { audio } from '../game/audio';
import { renderUnitsForFrame } from '../game/fx';
import { BattleInfo, OnlineMatch, StandingsInfo, quickMatch } from '../game/onlineClient';
import { RoomPlayer, TeamSnapshot, deserializeTeam, pairSeed } from '../game/online';

interface Props { mode: 'create' | 'join' | 'quick'; joinCode: string; playerName: string; }
const STAR_TXT = (s: number) => s === 1 ? '★' : s === 2 ? '★★' : '★★★';

export default function OnlineGameScreen({ mode, joinCode, playerName }: Props) {
  const [status, setStatus] = useState('Đang kết nối...');
  const [code, setCode] = useState(joinCode.toUpperCase());
  const [isHost, setIsHost] = useState(mode === 'create');
  const [mySeat, setMySeat] = useState(-1);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [inLobby, setInLobby] = useState(true);
  const matchRef = useRef<OnlineMatch | null>(null);
  const myIdRef = useRef('');
  // Game state (giong che do arena)
  const [gold, setGold] = useState(5); const [xp, setXp] = useState(0); const [level, setLevel] = useState(1);
  const [hp, setHp] = useState(100); const [round, setRound] = useState(1);
  const [bench, setBench] = useState<PlacedUnit[]>([]); const [board, setBoard] = useState<PlacedUnit[]>([]);
  const [shop, setShop] = useState<string[]>(() => rollShop(1));
  const [locked, setLocked] = useState(false); const [inventory, setInventory] = useState<string[]>([]);
  const [selUid, setSelUid] = useState<string | null>(null); const [selItem, setSelItem] = useState<string | null>(null);
  const [phase, setPhase] = useState<'plan' | 'battle' | 'wait' | 'done'>('plan');
  const [countdown, setCountdown] = useState(0);
  const [result, setResult] = useState<BattleResult | null>(null); const [frameIdx, setFrameIdx] = useState(0);
  const [speed, setSpeed] = useState(1); const [streak, setStreak] = useState(0);
  const [log, setLog] = useState<string[]>(['Phòng online: mua tướng và xếp đội trong thời gian chuẩn bị, hết giờ đội hình sẽ tự gửi lên phòng.']);
  const [augments, setAugments] = useState<string[]>([]); const [augChoice, setAugChoice] = useState<string[] | null>(null);
  const [draft, setDraft] = useState<string[] | null>(null);
  const [finished, setFinished] = useState<string | null>(null);
  const [battleLabel, setBattleLabel] = useState('');
  const [spectate, setSpectate] = useState(false);
  const submittedRound = useRef(0); const resolvedRef = useRef(false); const myWinRef = useRef(false); const battleInfoRef = useRef<BattleInfo | null>(null);
  const rewardRecordedRef = useRef(false); const [rewardTxt, setRewardTxt] = useState('');
  const allUnits = useMemo(() => [...board, ...bench], [board, bench]);
  const synergies = useMemo(() => computeSynergies(board), [board]);
  const say = (s: string) => setLog(prev => [s, ...prev].slice(0, 8));
  const me = players.find(p => p.id === myIdRef.current);
  const myAlive = me ? me.alive : true;

  useEffect(() => { if (Platform.OS !== 'web') { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {}); return () => { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {}); }; } }, []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      audio.unlock(); audio.startBgm('battle');
      const player = await loadPlayer(); myIdRef.current = player.id;
      const m = new OnlineMatch({
        onLobby: (ps, seat, host) => { if (cancelled) return; setPlayers(ps); setMySeat(seat); setIsHost(host); setStatus(host ? 'Bạn là chủ phòng. Đủ người (hoặc còn ghế AI lấp) thì bấm Bắt đầu trận.' : 'Đã vào phòng. Chờ chủ phòng bắt đầu trận...'); },
        onStart: () => { if (cancelled) return; setInLobby(false); setDraft([CHAMPIONS[2].id, CHAMPIONS[5].id, CHAMPIONS[9].id]); say('Trận online bắt đầu! Chọn tướng miễn phí ở vòng chọn thưởng.'); audio.playSfx('start'); },
        onPlan: (r, seconds) => { if (cancelled) return; setRound(r); setPhase('plan'); setCountdown(seconds); submittedRound.current = 0; setResult(null); if ([5, 12, 20].includes(r)) { const pool = [...AUGMENTS].sort(() => Math.random() - 0.5).slice(0, 3); setAugChoice(pool.map(a => a.id)); } say('Vòng ' + r + (isPveRound(r) ? ' (đấu quái PvE)' : '') + ': chuẩn bị đội hình!'); },
        onBattle: (info) => { if (!cancelled) handleBattle(info); },
        onStandings: (s) => { if (!cancelled) handleStandings(s); },
        onNotice: (t) => { if (!cancelled) say(t); },
        onHostChange: (host) => { if (!cancelled && host) { setIsHost(true); say('Bạn đã trở thành chủ phòng mới.'); } },
        onError: (t) => { if (!cancelled) setStatus(t); },
      });
      matchRef.current = m;
      try {
        if (mode === 'create') { const c = await m.createRoom({ id: player.id, name: playerName }); if (!cancelled) { setCode(c); setStatus('Phòng đã tạo. Gửi mã phòng cho bạn bè để họ vào chơi!'); } }
        else if (mode === 'join') { await m.joinRoom(joinCode, { id: player.id, name: playerName }); if (!cancelled) setStatus('Đang vào phòng ' + joinCode.toUpperCase() + '...'); }
        else { setStatus('Đang ghép nhanh...'); const q = await quickMatch({ id: player.id, name: playerName }, (s) => { if (!cancelled) setStatus(s); }); if (q.isHost) { await m.createRoom({ id: player.id, name: playerName }, q.code); if (!cancelled) { setCode(q.code); setIsHost(true); setStatus('Đã tạo phòng ghép nhanh. Chờ thêm người chơi hoặc bấm Bắt đầu trận.'); } } else { await m.joinRoom(q.code, { id: player.id, name: playerName }); if (!cancelled) setCode(q.code); } }
      } catch (e: any) { if (!cancelled) setStatus('Không kết nối được máy chủ online: ' + (e?.message ?? 'lỗi không rõ') + '. Kiểm tra cấu hình Supabase và mạng rồi thử lại.'); }
    })();
    return () => { cancelled = true; matchRef.current?.leave(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dem nguoc giai doan chuan bi -> tu gui snapshot doi hinh
  useEffect(() => {
    if (inLobby || phase !== 'plan' || countdown <= 0) return;
    const iv = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(iv);
  }, [inLobby, phase, countdown > 0]);
  useEffect(() => {
    if (!inLobby && phase === 'plan' && countdown === 0 && submittedRound.current !== round) {
      submittedRound.current = round;
      matchRef.current?.submitSnapshot(board, level, augments);
      setPhase('wait'); say('Đã gửi đội hình vòng ' + round + '. Đang chờ các người chơi khác...');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown, phase, inLobby]);

  function startFrames(res: BattleResult, label: string) {
    battleInfoRef.current = battleInfoRef.current; resolvedRef.current = false;
    setResult(res); setFrameIdx(0); setBattleLabel(label); setPhase('battle');
  }
  function handleBattle(info: BattleInfo) {
    battleInfoRef.current = info;
    const mySnap = info.snaps[mySeat];
    if (info.pve) {
      const myTeam = mySnap ? deserializeTeam(mySnap) : board;
      const seed = pairSeed(code, info.round, mySeat, 99);
      const res = simulateBattle(myTeam, pveEnemiesForRound(info.round), mySnap?.augments ?? augments, seed);
      myWinRef.current = res.winner === 0;
      matchRef.current?.reportPve(myWinRef.current, res.enemySurvivors);
      startFrames(res, 'Đấu quái PvE vòng ' + info.round);
      return;
    }
    const pair = info.myPair ?? info.pairs[0];
    if (!pair) { setPhase('wait'); return; }
    const low = Math.min(pair.a, pair.b), high = Math.max(pair.a, pair.b);
    const lowSnap = info.snaps[low], highSnap = info.snaps[high];
    if (!lowSnap || !highSnap) { setPhase('wait'); return; }
    const res = simulateBattle(deserializeTeam(lowSnap), deserializeTeam(highSnap), lowSnap.augments, pair.seed);
    const winnerSeat = res.winner === 0 ? low : high;
    myWinRef.current = winnerSeat === mySeat;
    if (info.myPair) matchRef.current?.reportResult(pair, winnerSeat, res.winner === 0 ? res.survivors : res.enemySurvivors);
    const oppName = players.find(p => p.seat === (pair.a === mySeat ? pair.b : pair.a))?.name ?? 'Đối thủ';
    startFrames(res, info.myPair ? ('Đấu với ' + oppName + (pair.ghost ? ' (đội bóng ma)' : '')) : ('Xem trận: ghế ' + low + ' vs ghế ' + high));
  }
  function handleStandings(s: StandingsInfo) {
    setPlayers(s.players);
    const mine = s.players.find(p => p.id === myIdRef.current);
    if (mine) { setHp(mine.hp); if (!mine.alive && !spectate) { setSpectate(true); say('Bạn đã bị loại — chuyển sang chế độ xem các trận còn lại.'); } }
    const win = myWinRef.current;
    setStreak(st => win ? (st >= 0 ? st + 1 : 1) : (st <= 0 ? st - 1 : -1));
    const reward = 5 + interestOf(gold) + streakBonus(streak) + (win ? 1 : 0) + (augments.includes('vang2') && win ? 4 : 0);
    if (!s.finished) { setGold(g => g + reward); gainXp(2); if (isPveRound(s.round) && win) { setInventory(inv => [...inv, randomItem()]); setGold(g => g + 3); } if (!locked) setShop(rollShop(level)); }
    if (s.finished) {
      const rank = s.ranks[myIdRef.current] ?? s.players.filter(p => p.alive).length + 1;
      loadMeta().then(async mm => { mm.bestRank = Math.min(mm.bestRank, rank); mm.gems += Math.max(10, (9 - rank) * 15); if (rank === 1) mm.wins += 1; await saveMeta(mm); });
      audio.playSfx(rank === 1 ? 'champion' : 'lose');
      setFinished(rank === 1 ? 'Vô địch online! Bạn đứng hạng 1/8. Tuyệt vời!' : 'Trận online kết thúc. Bạn xếp hạng ' + rank + '/8.');
      if (!rewardRecordedRef.current) { rewardRecordedRef.current = true;
        applyMatchRewards({ mode: 'online', modeLabel: 'PvP Online', resultText: rank === 1 ? 'Vô địch trận online' : 'Xếp hạng ' + rank + '/8 trong trận online', placement: rank, totalPlayers: 8, xp: xpForPlacement(rank), team: board.map(u => ({ defId: u.defId, star: u.star })) })
          .then(r => setRewardTxt(`+${r.xpGained} XP hồ sơ${r.lpDelta !== undefined ? ` • ${r.lpDelta >= 0 ? '+' : ''}${r.lpDelta} LP — ${rankLabel(r.profile.rank)}${r.promoted ? ' — THĂNG HẠNG!' : r.demoted ? ' — Giáng hạng' : ''}` : ''}`))
          .catch(() => {});
      }
      setPhase('done');
    } else { say(win ? 'Thắng vòng! Nhận ' + reward + ' vàng.' : 'Thua vòng này. Bảng xếp hạng đã cập nhật.'); audio.playSfx(win ? 'win' : 'lose'); }
  }

  useEffect(() => { if (phase !== 'battle' || !result) return; const iv = setInterval(() => setFrameIdx(f => Math.min(f + 1, result.frames.length - 1)), 420 / speed); return () => clearInterval(iv); }, [phase, result, speed]);
  useEffect(() => { if (phase === 'battle' && result && frameIdx >= result.frames.length - 1 && !resolvedRef.current) { resolvedRef.current = true; const tm = setTimeout(() => setPhase('wait'), 700); return () => clearTimeout(tm); } }, [frameIdx, phase, result]);

  // --- Hanh dong nguoi choi (copy logic arena, them SFX) ---
  function addUnit(defId: string, toBoard = false) {
    const u: PlacedUnit = { uid: newUid(), defId, star: 1, items: [], x: 0, y: 0 };
    let nb = [...bench], nd = [...board];
    if (toBoard && nd.length < level) { u.x = nd.length % 7; u.y = champById(defId).range <= 1 ? 2 : 3; nd.push(u); } else nb.push(u);
    for (let star = 1; star <= 2; star++) {
      const all = [...nd, ...nb]; const same = all.filter(x => x.defId === defId && x.star === star);
      if (same.length >= 3) {
        const removeIds = new Set(same.slice(0, 3).map(x => x.uid)); const items = same.slice(0, 3).flatMap(x => x.items).slice(0, 3);
        nd = nd.filter(x => !removeIds.has(x.uid)); nb = nb.filter(x => !removeIds.has(x.uid));
        const merged: PlacedUnit = { uid: newUid(), defId, star: star + 1, items, x: same[0].x, y: same[0].y };
        if (nd.length < level) nd.push(merged); else nb.push(merged);
        say(champById(defId).name + ' đã lên ' + (star + 1) + ' sao!'); audio.playSfx('starup');
      }
    }
    setBoard(nd); setBench(nb.slice(0, 9));
  }
  function buy(i: number) { if (phase !== 'plan') return; const id = shop[i]; const cost = champById(id).cost; if (gold < cost) { say('Không đủ vàng!'); audio.playSfx('error'); return; } if (bench.length >= 9 && board.length >= level) { say('Hàng chờ và bàn cờ đã đầy!'); return; } setGold(g => g - cost); addUnit(id); audio.playSfx('coin'); setShop(prev => { const n = [...prev]; n[i] = rollShop(level)[0]; return n; }); }
  function gainXp(amount: number) { let nx = xp + amount, nl = level; while (nl < 9 && nx >= xpToNext(nl)) { nx -= xpToNext(nl); nl++; say('Lên cấp ' + nl + '!'); audio.playSfx('levelup'); } setXp(nx); setLevel(nl); }
  function buyXp() { if (gold < 4 || level >= 9) return; setGold(g => g - 4); gainXp(4); }
  function reroll() { if (gold < 2 || locked) return; setGold(g => g - 2); setShop(rollShop(level)); audio.playSfx('reroll'); }
  function sellSelected() { const u = allUnits.find(x => x.uid === selUid); if (!u) return; setGold(g => g + sellValue(u.defId, u.star)); setBoard(b => b.filter(x => x.uid !== selUid)); setBench(b => b.filter(x => x.uid !== selUid)); setSelUid(null); audio.playSfx('sell'); say('Đã bán ' + champById(u.defId).name); }
  function tapBoardCell(x: number, y: number) {
    if (phase !== 'plan') return; const occupant = board.find(u => u.x === x && u.y === y);
    if (selItem) { if (occupant) equipTo(occupant); return; }
    if (selUid) { const u = allUnits.find(v => v.uid === selUid)!;
      if (occupant && occupant.uid !== selUid) { const ox = u.x, oy = u.y; setBoard(prev => prev.map(v => v.uid === selUid ? { ...v, x: occupant.x, y: occupant.y } : v.uid === occupant.uid ? { ...v, x: ox, y: oy } : v)); setSelUid(null); return; }
      if (bench.some(v => v.uid === selUid)) { if (board.length >= level) { say('Bàn cờ đầy theo cấp!'); return; } setBench(b => b.filter(v => v.uid !== selUid)); setBoard(b => [...b, { ...u, x, y }]); }
      else setBoard(prev => prev.map(v => v.uid === selUid ? { ...v, x, y } : v));
      audio.playSfx('place'); setSelUid(null); return;
    }
    if (occupant) setSelUid(occupant.uid);
  }
  function tapBench(u: PlacedUnit) { if (selItem) { equipTo(u); return; } setSelUid(selUid === u.uid ? null : u.uid); }
  function equipTo(u: PlacedUnit) { if (!selItem) return; if (u.items.length >= 3) { say('Tướng đã có 3 trang bị!'); return; } const apply = (arr: PlacedUnit[]) => arr.map(v => v.uid === u.uid ? { ...v, items: [...v.items, selItem!] } : v); setBoard(apply); setBench(apply); setInventory(inv => { const i = inv.indexOf(selItem); const n = [...inv]; n.splice(i, 1); return n; }); audio.playSfx('equip'); say('Đã gắn ' + (itemById(selItem)?.name ?? '') + ' cho ' + champById(u.defId).name); setSelItem(null); }
  function moveToBench() { const u = board.find(v => v.uid === selUid); if (!u || bench.length >= 9) return; setBoard(b => b.filter(v => v.uid !== selUid)); setBench(b => [...b, u]); setSelUid(null); }
  function chooseAugment(id: string) { const a = AUGMENTS.find(x => x.id === id)!; setAugments(prev => [...prev, id]); setAugChoice(null); if (a.kind === 'gold') setGold(g => g + a.value); if (a.kind === 'xp') gainXp(a.value); say('Đã chọn cường hóa: ' + a.name); }
  function chooseDraft(id: string) { setDraft(null); addUnit(id, true); say('Nhận miễn phí ' + champById(id).name + ' từ vòng chọn!'); }
  async function leaveRoom() { audio.playSfx('click'); await matchRef.current?.leave(); router.back(); }

  const frame = result?.frames[Math.min(frameIdx, (result.frames.length - 1) || 0)];
  const cell = 46;
  if (inLobby) {
    return (
      <ScrollView style={st.screen} contentContainerStyle={{ padding: 14, gap: 12, alignItems: 'center' }}>
        <Text style={st.title}>Phòng PvP Online</Text>
        {!!code && <View style={st.codeBox}><Text style={st.codeLabel}>Mã phòng (gửi cho bạn bè)</Text><Text style={st.codeTxt}>{code}</Text></View>}
        <Text style={st.status}>{status}</Text>
        <View style={{ width: '100%', maxWidth: 520, gap: 6 }}>
          {players.map(p => (<View key={p.seat} style={[st.playerChip, !p.connected && !p.isBot && st.dead]}><Text style={st.playerTxt}>Ghế {p.seat + 1}: {p.name}{p.id === myIdRef.current ? ' (bạn)' : ''}{p.isBot ? ' — AI lấp ghế trống' : ''}</Text></View>))}
          {!players.length && <Text style={st.status}>Đang chờ thông tin phòng...</Text>}
        </View>
        <Text style={st.note}>Phòng đủ 8 ghế: người thật + AI lấp ghế trống. Chủ phòng bấm Bắt đầu khi mọi người đã sẵn sàng. Ghế trống sẽ có AI lấp.</Text>
        {isHost && <Pressable style={st.bigBtn} onPress={() => { audio.playSfx('start'); matchRef.current?.startGame(); }}><Text style={st.bigTxt}>Bắt đầu trận</Text></Pressable>}
        <Pressable style={st.homeBtn} onPress={leaveRoom}><Text style={st.smallTxt}>Rời phòng</Text></Pressable>
      </ScrollView>
    );
  }
  return (
    <ScrollView style={st.screen} contentContainerStyle={{ padding: 12, gap: 10 }}>
      <View style={st.topbar}>
        <Text style={st.title}>PvP Online — Phòng {code}</Text>
        <View style={st.statsRow}>
          <Text style={st.stat}>Vàng: {gold}</Text><Text style={st.stat}>Cấp {level} ({xp}/{xpToNext(level)} XP)</Text>
          <Text style={st.stat}>Máu: {hp}</Text><Text style={st.stat}>Vòng {round}</Text>
          <Text style={st.stat}>Đội: {board.length}/{level}</Text>
          {phase === 'plan' && <Text style={[st.stat, { backgroundColor: '#ffd6a5' }]}>Chuẩn bị: {countdown}s</Text>}
          {phase === 'wait' && <Text style={st.stat}>Đang chờ phòng...</Text>}
          {spectate && <Text style={[st.stat, { backgroundColor: '#dee2e6' }]}>Chế độ xem</Text>}
        </View>
      </View>
      <View style={st.players}>{players.map(p => (<View key={p.seat} style={[st.playerChip, !p.alive && st.dead]}><Text style={st.playerTxt}>{p.name}{p.id === myIdRef.current ? ' (bạn)' : ''}: {p.hp} máu{p.alive ? '' : ' (loại)'}{!p.isBot && !p.connected ? ' (AI thay)' : ''}</Text></View>))}</View>
      {!!synergies.length && (<View style={st.synRow}>{synergies.map(s => (<Text key={s.traitId} style={[st.synChip, s.active && st.synActive]}>{traitName(s.traitId)}: {s.count}{s.active ? ' (kích hoạt bậc ' + s.tier + ')' : ''}</Text>))}</View>)}
      <Text style={st.section}>{phase === 'battle' ? ('Đang đấu: ' + battleLabel) : phase === 'plan' ? 'Bàn cờ — hết giờ chuẩn bị, đội hình tự gửi lên phòng' : 'Đang chờ kết quả từ phòng...'}</Text>
      <View style={[st.board, { width: cell * 7 + 12, height: (phase === 'battle' ? cell * 7 : cell * 4) + 12 }]}>
        <SceneArtImage id="arena" width={cell * 7 + 12} height={(phase === 'battle' ? cell * 7 : cell * 4) + 12} />
        {phase !== 'battle' && Array.from({ length: 4 }).map((_, y) => Array.from({ length: 7 }).map((_, x) => { const u = board.find(v => v.x === x && v.y === y); return (
          <Pressable key={x + '-' + y} onPress={() => tapBoardCell(x, y)} style={[st.cell, { left: 6 + x * cell, top: 6 + y * cell, width: cell - 4, height: cell - 4 }, selUid && u?.uid === selUid && st.cellSel]}>
            {u ? (<React.Fragment><View style={{ position: 'absolute', bottom: 3, width: '58%', height: 7, borderRadius: 999, backgroundColor: 'rgba(8,26,14,0.30)' }} /><SpriteUnit spec={champById(u.defId)} size={(cell - 4) * rowDepth(y, 4).scale} star={u.star} state='idle' /></React.Fragment>) : <Text style={st.cellDot}>·</Text>}
          </Pressable>); }))}
        {phase === 'battle' && frame && renderUnitsForFrame(frame).map(u => { const prev = result && frameIdx > 0 ? result.frames[frameIdx - 1].units.find(v => v.uid === u.uid) : undefined; const evs = result ? result.events.filter(e => Math.abs(e.t - frame.t) < 0.3) : []; const animState = stateForUnit({ alive: u.alive, moved: !!prev && (prev.x !== u.x || prev.y !== u.y), castAtFrame: evs.some(e => e.uid === u.uid && e.text.includes('kỹ năng')), attackedAtFrame: evs.some(e => e.text.startsWith(u.name + ' đánh')), hurtAtFrame: evs.some(e => e.uid === u.uid && !!e.amount), battleOver: frameIdx >= (result?.frames.length ?? 1) - 1, won: result?.winner === u.team }); const dep = rowDepth(u.y, 7); return (
          <View key={u.uid} style={[st.battleUnit, { left: 6 + u.x * cell, top: 6 + u.y * cell, width: cell - 2, height: cell - 2, zIndex: dep.zIndex }]}>
            <View style={{ position: 'absolute', bottom: 9, left: '19%', width: '62%', height: 9, borderRadius: 999, backgroundColor: 'rgba(8,26,14,0.32)' }} />
            <SpriteUnit spec={u.art} size={(cell - 6) * dep.scale + 8} star={u.star} state={animState} flip={u.team === 1} />
            <View style={st.hpBar}><View style={[st.hpFill, { width: Math.max(0, Math.min(100, u.hp / u.maxHp * 100)) + '%' }]} /></View>
            <View style={st.manaBar}><View style={[st.manaFill, { width: Math.min(100, u.mana / u.maxMana * 100) + '%' }]} /></View>
          </View>); })}
        {phase === 'battle' && (<View style={st.battleCtrls}><Pressable style={st.smallBtn} onPress={() => setSpeed(sp => sp === 1 ? 2 : 1)}><Text style={st.smallTxt}>Tốc độ x{speed}</Text></Pressable><Pressable style={st.smallBtn} onPress={() => result && setFrameIdx(result.frames.length - 1)}><Text style={st.smallTxt}>Bỏ qua tới kết quả</Text></Pressable></View>)}
      </View>
      <Text style={st.section}>Hàng chờ</Text>
      <View style={st.benchRow}>{Array.from({ length: 9 }).map((_, i) => { const u = bench[i]; return (
        <Pressable key={u ? 'b-' + u.uid : 'e-' + i} onPress={() => u && tapBench(u)} style={[st.benchCell, u && selUid === u.uid && st.cellSel]}>{u ? <SpriteUnit key={u.uid} spec={champById(u.defId)} size={42} star={u.star} state='idle' /> : <Text style={st.cellDot}>·</Text>}</Pressable>); })}
      </View>
      {selUid && (() => { const u = allUnits.find(v => v.uid === selUid); if (!u) return null; const d = champById(u.defId); return (
        <View style={st.selBox}><SpriteUnit spec={d} size={64} star={u.star} state='idle' /><View style={{ flex: 1 }}><Text style={st.selName}>{d.name} {STAR_TXT(u.star)} - {d.skill.name}</Text><Text style={st.selDesc}>{d.skill.desc} | Đồ: {u.items.map(i => itemById(i)?.name).filter(Boolean).join(', ') || 'chưa có'}</Text></View>
          <Pressable style={st.smallBtn} onPress={sellSelected}><Text style={st.smallTxt}>Bán +{sellValue(u.defId, u.star)} vàng</Text></Pressable>
          {board.some(v => v.uid === selUid) && <Pressable style={st.smallBtn} onPress={moveToBench}><Text style={st.smallTxt}>Về hàng chờ</Text></Pressable>}</View>); })()}
      {!!inventory.length && (<View><Text style={st.section}>Trang bị (chạm chọn đồ, rồi chạm tướng để gắn)</Text><View style={st.invRow}>{inventory.map((iid, i) => { const it = itemById(iid); if (!it) return null; return (
        <Pressable key={i} onPress={() => setSelItem(selItem === iid ? null : iid)} style={[st.invCell, selItem === iid && st.cellSel]}><ItemArt color={it.color} size={36} /><Text style={st.invTxt}>{it.name}</Text></Pressable>); })}</View></View>)}
      <View style={st.shopHead}><Text style={st.section}>Cửa hàng</Text>
        <Pressable style={st.smallBtn} onPress={reroll}><Text style={st.smallTxt}>Làm mới (2 vàng)</Text></Pressable>
        <Pressable style={st.smallBtn} onPress={() => setLocked(l => !l)}><Text style={st.smallTxt}>{locked ? 'Mở khóa shop' : 'Khóa shop'}</Text></Pressable>
        <Pressable style={st.smallBtn} onPress={buyXp}><Text style={st.smallTxt}>Mua XP (4 vàng)</Text></Pressable></View>
      <View style={st.shopRow}>{shop.map((id, i) => { const d = champById(id); return (
        <Pressable key={i} onPress={() => buy(i)} style={st.shopCard}><SpriteUnit spec={d} size={78} state='idle' /><Text style={st.shopName}>{d.name}</Text><Text style={st.shopCost}>{d.cost} vàng - {STAR_TXT(1)}</Text><Text style={st.shopTrait}>{d.traits.map(traitName).join(' / ')}</Text><Text style={st.shopSkill}>{d.skill.name}</Text></Pressable>); })}
      </View>
      {phase === 'plan' && <Pressable style={st.bigBtn} onPress={() => { if (submittedRound.current !== round) { submittedRound.current = round; matchRef.current?.submitSnapshot(board, level, augments); setPhase('wait'); say('Đã gửi đội hình sớm.'); } }}><Text style={st.bigTxt}>Gửi đội hình & sẵn sàng</Text></Pressable>}
      <View style={st.logBox}>{log.map((l, i) => <Text key={i} style={st.logTxt}>{l}</Text>)}</View>
      <Pressable style={st.homeBtn} onPress={leaveRoom}><Text style={st.smallTxt}>Rời trận / về menu online</Text></Pressable>
      {(draft || augChoice || finished) && (<View style={st.overlay}><View style={st.modal}>
        {finished ? (<><Text style={st.modalTitle}>Kết quả trận online</Text><Text style={st.modalDesc}>{finished}</Text>
          {!!rewardTxt && <Text style={[st.modalDesc, { fontWeight: '800', color: '#4361ee' }]}>{rewardTxt}</Text>}
          <Pressable style={st.bigBtn} onPress={leaveRoom}><Text style={st.bigTxt}>Về menu online</Text></Pressable></>)
          : draft ? (<><Text style={st.modalTitle}>Vòng chọn thưởng</Text><Text style={st.modalDesc}>Chọn 1 tướng miễn phí để bắt đầu trận đấu.</Text><View style={st.modalRow}>{draft.map(id => { const d = champById(id); return (
            <Pressable key={id} style={st.shopCard} onPress={() => chooseDraft(id)}><SpriteUnit spec={d} size={88} state='victory' /><Text style={st.shopName}>{d.name}</Text><Text style={st.shopTrait}>{d.traits.map(traitName).join(' / ')}</Text></Pressable>); })}</View></>)
            : (<><Text style={st.modalTitle}>Chọn cường hóa</Text><Text style={st.modalDesc}>Chọn 1 trong 3 cường hóa, hiệu lực cả trận.</Text><View style={st.modalRow}>{(augChoice ?? []).map(id => { const a = AUGMENTS.find(x => x.id === id)!; return (
              <Pressable key={id} style={st.augCard} onPress={() => chooseAugment(id)}><Text style={st.shopName}>{a.name}</Text><Text style={st.shopTrait}>{a.desc}</Text></Pressable>); })}</View></>)}
      </View></View>)}
    </ScrollView>
  );
}
const st = StyleSheet.create({
  screen:{ flex:1, backgroundColor:'#10182e' }, topbar:{ gap:6 }, title:{ fontSize:22, fontWeight:'800', color:'#f5d67b' },
  status:{ textAlign:'center', color:'#c6cfe8', lineHeight:20, maxWidth:520 }, note:{ textAlign:'center', color:'#93a1c4', fontSize:12, lineHeight:17, maxWidth:520 },
  codeBox:{ backgroundColor:'rgba(14,20,42,0.72)', borderRadius:16, padding:14, alignItems:'center', width:'100%', maxWidth:520 }, codeLabel:{ fontSize:12, fontWeight:'700', color:'#f5d67b' }, codeTxt:{ fontSize:34, fontWeight:'900', letterSpacing:6, color:'#7fb3ff' },
  statsRow:{ flexDirection:'row', flexWrap:'wrap', gap:8 }, stat:{ backgroundColor:'rgba(14,20,42,0.6)', paddingHorizontal:10, paddingVertical:5, borderRadius:999, fontWeight:'700', color:'#eef1ff' },
  players:{ flexDirection:'row', flexWrap:'wrap', gap:6 }, playerChip:{ backgroundColor:'rgba(20,42,30,0.6)', borderRadius:999, paddingHorizontal:9, paddingVertical:4 }, dead:{ backgroundColor:'rgba(40,46,66,0.55)', opacity:0.6 }, playerTxt:{ fontSize:12, fontWeight:'600', color:'#eef1ff' },
  synRow:{ flexDirection:'row', flexWrap:'wrap', gap:6 }, synChip:{ backgroundColor:'rgba(14,20,42,0.6)', borderRadius:999, paddingHorizontal:9, paddingVertical:4, fontSize:12, color:'#dbe4ff' }, synActive:{ backgroundColor:'rgba(84,64,14,0.75)', fontWeight:'800', color:'#ffd60a' },
  section:{ fontWeight:'800', color:'#f5d67b', marginTop:4 },
  board:{ backgroundColor:'#33523c', borderRadius:18, alignSelf:'center', position:'relative', overflow:'hidden' },
  cell:{ position:'absolute', backgroundColor:'rgba(140,220,190,0.10)', borderRadius:12, alignItems:'center', justifyContent:'center' }, cellSel:{ borderWidth:3, borderColor:'#ffb703' }, cellDot:{ color:'rgba(240,248,230,0.85)', fontSize:20 },
  battleUnit:{ position:'absolute', alignItems:'center' }, hpBar:{ width:'92%', height:5, backgroundColor:'#0003', borderRadius:3, overflow:'hidden' }, hpFill:{ height:5, backgroundColor:'#38b000' }, manaBar:{ width:'92%', height:4, backgroundColor:'#0003', borderRadius:3, overflow:'hidden', marginTop:1 }, manaFill:{ height:4, backgroundColor:'#4361ee' },
  battleCtrls:{ position:'absolute', right:8, bottom:8, flexDirection:'row', gap:6 },
  benchRow:{ flexDirection:'row', gap:6, flexWrap:'wrap' }, benchCell:{ width:48, height:48, backgroundColor:'rgba(70,84,64,0.85)', borderRadius:12, alignItems:'center', justifyContent:'center' },
  selBox:{ flexDirection:'row', gap:10, backgroundColor:'rgba(14,20,42,0.72)', borderRadius:14, padding:10, alignItems:'center' }, selName:{ fontWeight:'800', color:'#eef1ff' }, selDesc:{ fontSize:12, color:'#aab4d4' },
  invRow:{ flexDirection:'row', gap:8, flexWrap:'wrap' }, invCell:{ backgroundColor:'rgba(14,20,42,0.6)', borderRadius:12, padding:6, alignItems:'center', width:86 }, invTxt:{ fontSize:11, textAlign:'center', fontWeight:'600', color:'#e8ecff' },
  shopHead:{ flexDirection:'row', gap:8, alignItems:'center', flexWrap:'wrap' }, shopRow:{ flexDirection:'row', gap:8, flexWrap:'wrap' },
  shopCard:{ backgroundColor:'rgba(16,22,44,0.78)', borderRadius:16, padding:8, alignItems:'center', width:118 }, shopName:{ fontWeight:'800', textAlign:'center', color:'#eef1ff' }, shopCost:{ color:'#ffb35c', fontWeight:'700' }, shopTrait:{ fontSize:11, color:'#aab4d4', textAlign:'center' }, shopSkill:{ fontSize:11, color:'#f3c6ff', fontWeight:'600', textAlign:'center' },
  bigBtn:{ backgroundColor:'#c2255c', borderRadius:999, paddingVertical:13, paddingHorizontal:26, alignItems:'center', marginTop:6 }, bigTxt:{ color:'#fff', fontWeight:'800', fontSize:16 },
  smallBtn:{ backgroundColor:'rgba(38,84,150,0.9)', borderRadius:999, paddingHorizontal:12, paddingVertical:7 }, smallTxt:{ color:'#fff', fontWeight:'700', fontSize:12 },
  homeBtn:{ backgroundColor:'rgba(70,80,105,0.85)', borderRadius:999, paddingVertical:9, paddingHorizontal:20, alignItems:'center' },
  logBox:{ backgroundColor:'rgba(14,20,42,0.6)', borderRadius:12, padding:10, gap:2 }, logTxt:{ fontSize:12, color:'#d7def5' },
  overlay:{ position:'absolute', inset:0, backgroundColor:'#0008', alignItems:'center', justifyContent:'center', padding:16, zIndex:50 } as any,
  modal:{ backgroundColor:'#fff7fb', borderRadius:20, padding:18, gap:10, maxWidth:560, width:'100%' }, modalTitle:{ fontSize:20, fontWeight:'800', textAlign:'center', color:'#7b2d5b' }, modalDesc:{ textAlign:'center', color:'#555' }, modalRow:{ flexDirection:'row', gap:10, justifyContent:'center', flexWrap:'wrap' },
  augCard:{ backgroundColor:'#fff3b0', borderRadius:16, padding:12, width:160, alignItems:'center', gap:4 },
});
