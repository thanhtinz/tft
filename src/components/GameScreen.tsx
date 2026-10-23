import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Ellipse, G, Polygon, Rect } from 'react-native-svg';
import { router } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { ItemArt } from './ChibiArt';
import ChibiRig from './ChibiRig';
import { AmbientParticles, ArenaScene } from './SceneArt';
import { rowDepth, stateForUnit } from '../game/rig';
import { AUGMENTS, BOT_NAMES, CHAMPIONS, SHOP_ODDS, TRAITS, champById, itemById, monsterById, traitName } from '../game/data';
import { AUG_ROUNDS_TFT as AUG_ROUNDS, BattleResult, PlacedUnit, computeSynergies, interestOf, isCarouselRound, isPveStageRound, lossDamage, makeAiTeam, makeMonsterTeam, newUid, pveEnemiesForRound, randomItem, rollShop, roundLabel, sellValue, simulateBattle, stageSub, streakBonus, xpToNext } from '../game/engine';
import { MONSTERS } from '../game/data';
import { loadMeta, loadSettings, saveMeta, saveSettings } from '../game/storage';
import { TOTAL_STAGES, buildStageTeam, stageDef, stageReward } from '../game/stages';
import { TUT_REWARD, TutEvent, createTutorial, currentStep, onTutEvent, skipTutorial } from '../game/tutorial';
import { audio } from '../game/audio';
import { eventsInWindow, renderUnitsForFrame } from '../game/fx';
import { applyMatchRewards } from '../game/accounts';
import { rankLabel, xpForPlacement } from '../game/auth';
import RankBadge from './RankBadge';
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
// ===== Lop trinh bay phu: banner / hieu ung giao tranh / o phat sang (chi hien thi, khong chua logic game) =====
type FxKind = 'dmg' | 'heal' | 'proj' | 'burst' | 'soul' | 'stun';
interface FxItem { id: number; kind: FxKind; x: number; y: number; x2?: number; y2?: number; text?: string; crit?: boolean; color?: string; radius?: number; born: number; }
const FX_LIFE: Record<FxKind, number> = { dmg: 750, heal: 750, proj: 240, burst: 500, soul: 900, stun: 750 };
const BURST_COLORS: Record<string, string> = { aoe: '#fb8500', freeze: '#48cae4', stun: '#9d4edd', heal: '#38b000' };
const STAR_SCALE = (s: number) => s === 1 ? 1 : s === 2 ? 1.15 : 1.3;
function starPoints(cx: number, cy: number, r: number) { return cx + ',' + (cy - r) + ' ' + (cx + r * 0.28) + ',' + (cy - r * 0.28) + ' ' + (cx + r) + ',' + cy + ' ' + (cx + r * 0.28) + ',' + (cy + r * 0.28) + ' ' + cx + ',' + (cy + r) + ' ' + (cx - r * 0.28) + ',' + (cy + r * 0.28) + ' ' + (cx - r) + ',' + cy + ' ' + (cx - r * 0.28) + ',' + (cy - r * 0.28); }
function ValidCellGlow({ hm, rows, board }: { hm: ReturnType<typeof hexMetrics>; rows: number; board: PlacedUnit[] }) {
  const [on, setOn] = useState(true);
  useEffect(() => { const iv = setInterval(() => setOn(o => !o), 600); return () => clearInterval(iv); }, []);
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < 7; x++) {
    if (board.some(u => u.x === x && u.y === y)) continue;
    const { cx, cy } = hexCenter(hm, x, y);
    cells.push(<Polygon key={'glow-' + x + '-' + y} points={hexPoints(cx, cy, hm.size)} fill="#ffb703" fillOpacity={on ? 0.16 : 0.04} stroke="#ffb703" strokeWidth={2.2} strokeOpacity={on ? 0.95 : 0.35} />);
  }
  return (<>{cells}</>);
}
function SelBounce({ children }: { children: React.ReactNode }) {
  const [up, setUp] = useState(false);
  useEffect(() => { const iv = setInterval(() => setUp(u => !u), 280); return () => clearInterval(iv); }, []);
  return (<View style={{ transform: [{ translateY: up ? -6 : 0 }] }}>{children}</View>);
}
function UnitPedestal({ sz, team, star }: { sz: number; team: number; star: number }) {
  const w = sz * 0.62, h = sz * 0.17;
  const border = star >= 3 ? '#ffb703' : star === 2 ? '#d7dee8' : team === 1 ? '#ff5d5d' : '#4dabff';
  return (<View style={{ position: 'absolute', left: (sz - w) / 2, top: sz * 0.883 - h / 2, width: w, height: h, borderRadius: 999, borderWidth: 3, borderColor: border, backgroundColor: 'rgba(10,14,28,0.25)' }} />);
}
function StarSparkles({ sz }: { sz: number }) {
  return (<Svg width={sz * 0.44} height={sz * 0.24} viewBox="0 0 52 28" style={{ position: 'absolute', right: 0, top: 0 } as any} pointerEvents="none">
    <Polygon points={starPoints(10, 14, 7)} fill="#ffd60a" />
    <Polygon points={starPoints(27, 8, 5.5)} fill="#ffe66d" />
    <Polygon points={starPoints(43, 15, 6.5)} fill="#ffb703" />
  </Svg>);
}
// ===== Cum thanh tren dau tuong kieu TFT: sao pips + mau CHIA VACH + mana mong + o do mini =====
function SegmentBar({ frac, color, h }: { frac: number; color: string; h: number }) {
  const f = Math.max(0, Math.min(1, frac));
  return (<View style={{ height: h, backgroundColor: 'rgba(4,6,14,0.88)', borderWidth: 1, borderColor: '#04060e', borderRadius: 2, overflow: 'hidden' }}>
    <View style={{ height: '100%', width: (f * 100) + '%', backgroundColor: color }} />
    {Array.from({ length: 9 }).map((_, i) => (<View key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: ((i + 1) * 10) + '%', width: 1, backgroundColor: 'rgba(4,6,14,0.6)' }} />))}
  </View>);
}
function UnitBars({ sz, star, hpFrac, manaFrac, items }: { sz: number; star: number; hpFrac: number; manaFrac: number; items: string[] }) {
  const bw = Math.max(30, sz * 0.92);
  return (<View pointerEvents="none" style={{ position: 'absolute', top: -sz * 0.17, left: (sz - bw) / 2, width: bw, zIndex: 60 }}>
    <Text style={{ fontSize: Math.max(8, sz * 0.13), fontWeight: '900', color: '#ffd60a', lineHeight: Math.max(10, sz * 0.15), textShadowColor: 'rgba(0,0,0,0.85)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>{'★'.repeat(star)}</Text>
    <SegmentBar frac={hpFrac} color="#43c62f" h={Math.max(5, sz * 0.062)} />
    <View style={{ height: Math.max(2.5, sz * 0.032), marginTop: 1, backgroundColor: 'rgba(4,6,14,0.88)', borderWidth: 1, borderColor: '#04060e', borderRadius: 2, overflow: 'hidden' }}>
      <View style={{ height: '100%', width: Math.max(0, Math.min(100, manaFrac * 100)) + '%', backgroundColor: '#3aa0ff' }} />
    </View>
    {!!items.length && (<View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
      {items.slice(0, 3).map((iid, i) => { const it = itemById(iid); return (<View key={i} style={{ width: Math.max(11, sz * 0.15), height: Math.max(11, sz * 0.15), backgroundColor: 'rgba(6,9,20,0.9)', borderWidth: 1, borderColor: '#c9a227', borderRadius: 2, alignItems: 'center', justifyContent: 'center' }}>{it ? <ItemArt color={it.color} size={Math.max(9, sz * 0.12)} /> : null}</View>); })}
    </View>)}
  </View>);
}
// Duoc lua o goc san: lua chay animation bang interval rieng
function Torch({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const [big, setBig] = useState(false);
  useEffect(() => { const iv = setInterval(() => setBig(b => !b), 170); return () => clearInterval(iv); }, []);
  const w = 26 * s, h = 40 * s;
  return (<Svg width={w} height={h} style={{ position: 'absolute', left: x - w / 2, top: y - h + 6 } as any} pointerEvents="none">
    <Rect x={w / 2 - 1.6 * s} y={h - 15 * s} width={3.2 * s} height={15 * s} fill="#4a3423" />
    <Polygon points={(w / 2 - 9 * s) + ',' + (h - 15 * s) + ' ' + (w / 2 + 9 * s) + ',' + (h - 15 * s) + ' ' + (w / 2 + 5.5 * s) + ',' + (h - 7 * s) + ' ' + (w / 2 - 5.5 * s) + ',' + (h - 7 * s)} fill="#6b7280" stroke="#9aa5b1" strokeWidth={1} />
    <Ellipse cx={w / 2} cy={h - 21 * s} rx={6.4 * s * (big ? 1.14 : 0.95)} ry={10 * s * (big ? 1.12 : 0.94)} fill="#fb8500" opacity={0.92} />
    <Ellipse cx={w / 2} cy={h - 18 * s} rx={3.4 * s} ry={5.6 * s * (big ? 1.15 : 0.9)} fill="#ffd60a" opacity={0.95} />
    <Ellipse cx={w / 2} cy={h - 22 * s} rx={15 * s} ry={15 * s} fill="#ffb703" opacity={0.13} />
  </Svg>);
}
// Boc phan tu cho hieu ung bay lo lung (linh thu)
function FloatWrap({ amp = 4, children }: { amp?: number; children: React.ReactNode }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const iv = setInterval(() => setTick(t => t + 1), 90); return () => clearInterval(iv); }, []);
  return (<View style={{ transform: [{ translateY: Math.sin(tick * 0.55) * amp }] }}>{children}</View>);
}
function FxLayer({ items }: { items: FxItem[] }) {
  const [, setTick] = useState(0);
  useEffect(() => { const iv = setInterval(() => setTick(t => t + 1), 50); return () => clearInterval(iv); }, []);
  const now = Date.now();
  return (<View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 200 }}>
    {items.map(it => {
      const life = FX_LIFE[it.kind]; const age = now - it.born; if (age < 0 || age > life) return null; const p = age / life;
      if (it.kind === 'dmg' || it.kind === 'heal' || it.kind === 'stun') {
        const fade = p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1; const isHeal = it.kind === 'heal';
        const fontSize = it.crit ? 26 : isHeal ? 17 : 16;
        return (<Text key={it.id} style={{ position: 'absolute', left: it.x - 45, top: it.y - 14, width: 90, textAlign: 'center', fontWeight: '900', fontSize, color: it.color ?? (isHeal ? '#57e389' : it.crit ? '#ffd60a' : '#ffffff'), opacity: fade, transform: [{ translateY: -44 * p }, { scale: it.crit ? 1 + 0.3 * (1 - p) : 1 }], textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>{it.crit ? 'CRIT ' : ''}{it.text}</Text>);
      }
      if (it.kind === 'proj') {
        const x2 = it.x2 ?? it.x, y2 = it.y2 ?? it.y;
        const dot = (pp: number, size: number, op: number) => { const q = Math.max(0, Math.min(1, pp)); const px = it.x + (x2 - it.x) * q, py = it.y + (y2 - it.y) * q - Math.sin(Math.PI * q) * 20; return (<View style={{ position: 'absolute', left: px - size / 2, top: py - size / 2, width: size, height: size, borderRadius: size / 2, backgroundColor: '#ffd60a', opacity: op }} />); };
        return (<View key={it.id} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>{dot(p - 0.34, 4, 0.18)}{dot(p - 0.17, 6, 0.35)}{dot(p, 10, 1)}</View>);
      }
      if (it.kind === 'burst') {
        const target = it.radius ? 2.2 : 1.3; const sc = 0.3 + (target - 0.3) * p; const d = 54;
        return (<View key={it.id} style={{ position: 'absolute', left: it.x - d / 2, top: it.y - d / 2, width: d, height: d, borderRadius: d / 2, borderWidth: 3, borderColor: it.color ?? '#ffd60a', opacity: 0.9 * (1 - p), transform: [{ scale: sc }] }} />);
      }
      return (<View key={it.id} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
        <View style={{ position: 'absolute', left: it.x - 15, top: it.y - 15 - 26 * p, width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: '#cdb4f6', opacity: 0.75 * (1 - p), transform: [{ scale: 0.6 + p }] }} />
        <View style={{ position: 'absolute', left: it.x - 6, top: it.y - 6 - 48 * p, width: 12, height: 12, borderRadius: 6, backgroundColor: '#e0c3fc', opacity: 1 - p }} />
      </View>);
    })}
  </View>);
}
function ArenaBanner({ title, sub, tone, onDone }: { title: string; sub?: string; tone: 'win' | 'lose' | 'info'; onDone: () => void }) {
  const [elapsed, setElapsed] = useState(0); const doneRef = useRef(false);
  useEffect(() => { const iv = setInterval(() => setElapsed(e => e + 50), 50); return () => clearInterval(iv); }, []);
  useEffect(() => { if (elapsed >= 1700 && !doneRef.current) { doneRef.current = true; onDone(); } }, [elapsed, onDone]);
  const opacity = elapsed < 250 ? elapsed / 250 : elapsed > 1400 ? Math.max(0, 1 - (elapsed - 1400) / 300) : 1;
  const scale = elapsed < 250 ? 1.25 - 0.25 * (elapsed / 250) : 1;
  const accent = tone === 'lose' ? '#ef476f' : tone === 'win' ? '#57e389' : '#f5d67b';
  return (<View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: '36%', zIndex: 150, alignItems: 'center', opacity }}>
    <View style={{ transform: [{ scale }], backgroundColor: 'rgba(12,16,32,0.9)', borderWidth: 2, borderColor: accent, borderRadius: 12, paddingHorizontal: 34, paddingVertical: 10, alignItems: 'center', minWidth: 260 }}>
      <Text style={{ fontSize: 30, fontWeight: '900', color: accent, letterSpacing: 3 }}>{title}</Text>
      {!!sub && <Text style={{ fontSize: 13, fontWeight: '700', color: '#eef1ff', marginTop: 2 }}>{sub}</Text>}
    </View>
  </View>);
}

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
  const [reward, setReward] = useState<{ xp: number; lpDelta?: number; promoted?: boolean; demoted?: boolean; rankText?: string; tier?: number } | null>(null);
  // Ghi XP/LP/lich su theo tai khoan hien tai khi 1 tran (hoac man) ket thuc
  async function recordRewards(args: { mode: string; modeLabel: string; resultText: string; placement?: number; xp: number }) {
    try {
      const r = await applyMatchRewards({ ...args, totalPlayers: args.placement ? 8 : undefined, team: board.map(u => ({ defId: u.defId, star: u.star })) });
      setReward({ xp: r.xpGained, lpDelta: r.lpDelta, promoted: r.promoted, demoted: r.demoted, rankText: rankLabel(r.profile.rank), tier: r.profile.rank.tier });
    } catch {}
  }
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
  const [augView, setAugView] = useState(false);
  const [itemsByUid, setItemsByUid] = useState<Record<string, string[]>>({});
  const [rightTab, setRightTab] = useState<'players'|'dmg'>('players');
  const [dmgStats, setDmgStats] = useState<{ name: string; dmg: number; team: number }[]>([]);
  const [summary, setSummary] = useState<{ win: boolean; dealt: number; taken: number } | null>(null);
  const [arenaSize, setArenaSize] = useState({ w: 520, h: 300 });
  const [legendHurt, setLegendHurt] = useState(false); const [shake, setShake] = useState(false);
  const [banner, setBanner] = useState<{ title: string; sub?: string; tone: 'win' | 'lose' | 'info' } | null>(null);
  const [fxItems, setFxItems] = useState<FxItem[]>([]);
  const [redFlash, setRedFlash] = useState(false);
  const fxIdRef = useRef(1);
  const prevFrameRef = useRef<{ idx: number; t: number }>({ idx: -1, t: -1 });
  const shakeTimerRef = useRef<any>(null);
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
    if (r.finished) { loadMeta().then(async m => { if (!m.tutorialDone) { m.tutorialDone = true; m.gems += TUT_REWARD; await saveMeta(m); setFinished(`Hoàn thành hướng dẫn chơi! Bạn nhận ${TUT_REWARD} Ngọc thưởng lần đầu. Giờ hãy thử Đấu với AI, PvP Online hoặc Chiến Dịch PvE nhé!`); } else setFinished('Hoàn thành hướng dẫn chơi! Bạn đã nhận thưởng lần đầu trước đó rồi.'); }); recordRewards({ mode: 'tutorial', modeLabel: 'Học chơi', resultText: 'Hoàn thành hướng dẫn chơi', xp: 20 }); audio.playSfx('champion'); }
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
    const imap: Record<string, string[]> = {}; [...board, ...e.units].forEach(u => { imap[u.uid] = u.items; }); setItemsByUid(imap);
    const pveFight = mode !== 'arena' || isPveStageRound(round);
    setBanner({ title: 'VÒNG ' + (isArena ? roundLabel(round) : mode === 'campaign' ? stageDef(stageId).name : mode === 'waves' ? 'Sóng ' + wave : 'Luyện tập'), sub: pveFight ? 'Đấu với quái — ' + e.label : 'Đấu với ' + e.label.replace('Đội của ', ''), tone: 'info' });
    setFxItems([]);
    const res = simulateBattle(board, e.units, augments, round*17 + wave*31 + stageId);
    setResult(res); setFrameIdx(0); setPhase('battle'); setRightTab('dmg'); audio.playSfx('start'); emitTut('battleStart');
  }
  // Dong ho chuan bi kieu TFT (chi che do Dau Truong): het gio tu vao giao tranh
  useEffect(() => { if (!isArena || phase!=='plan' || paused || carousel || augChoice || finished) return; setPlanLeft(planMax); const iv = setInterval(() => setPlanLeft(s => { if (s <= 1) { clearInterval(iv); return 0; } if (s <= 6) audio.playSfx('click'); return s - 1; }), 1000); return () => clearInterval(iv); }, [isArena, phase, round, paused, !!carousel, !!augChoice, !!finished]);
  useEffect(() => { if (isArena && phase==='plan' && planLeft === 0 && board.length) startBattle(); }, [planLeft]);
  useEffect(() => { if (phase!=='battle' || !result || paused) return; const iv = setInterval(() => setFrameIdx(f => Math.min(f+1, result.frames.length-1)), 420/speed); return () => clearInterval(iv); }, [phase, result, speed, paused]);
  useEffect(() => { if (phase!=='battle' || !result) return; const fr = result.frames[Math.min(frameIdx, result.frames.length-1)]; if (!fr) return; const evs = result.events.filter(e => Math.abs(e.t - fr.t) < 0.3); if (evs.some(e => e.text.includes('kỹ năng'))) audio.playSfx('cast'); else if (evs.some(e => e.text.includes(' đánh '))) audio.playSfx('hit'); }, [frameIdx, phase, result]);
  useEffect(() => { if (!redFlash) return; const tm = setTimeout(() => setRedFlash(false), 500); return () => clearTimeout(tm); }, [redFlash]);
  useEffect(() => () => { if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current); }, []);
  // Spawn hieu ung giao tranh theo cua so event cua frame vua chuyen (chi hien thi)
  useEffect(() => {
    if (phase !== 'battle' || !result) { prevFrameRef.current = { idx: -1, t: -1 }; return; }
    const cur = result.frames[Math.min(frameIdx, result.frames.length - 1)]; if (!cur) return;
    const prev = prevFrameRef.current; if (prev.idx === frameIdx) return;
    const t0 = prev.idx >= 0 && prev.idx < frameIdx ? prev.t : frameIdx > 0 ? (result.frames[frameIdx - 1]?.t ?? cur.t) : -1;
    prevFrameRef.current = { idx: frameIdx, t: cur.t };
    if (frameIdx === 0) return;
    const evs = eventsInWindow(result.events, t0, cur.t); if (!evs.length) return;
    const m = hexMetrics(arenaSize.w, arenaSize.h, 7);
    const posOf = (gx?: number, gy?: number, uid?: string) => {
      if (gx !== undefined && gy !== undefined) { const c = hexCenter(m, Math.max(0, Math.min(6, gx)), Math.max(0, Math.min(6, gy))); return { x: c.cx, y: c.cy }; }
      const u = uid ? cur.units.find(v => v.uid === uid) : undefined;
      if (u) { const c = hexCenter(m, Math.max(0, Math.min(6, u.x)), Math.max(0, Math.min(6, u.y))); return { x: c.cx, y: c.cy }; }
      return null;
    };
    const spawned: FxItem[] = []; const now = Date.now();
    for (const e of evs) {
      const tgt = posOf(e.tx, e.ty, e.targetUid ?? e.uid); const src = posOf(e.ax, e.ay, e.attackerUid);
      if ((e.type === 'attack' || e.type === 'hit' || e.type === 'poison') && e.amount) {
        if (tgt) spawned.push({ id: fxIdRef.current++, kind: 'dmg', x: tgt.x, y: tgt.y - m.size * 0.4, text: '-' + e.amount, crit: !!e.crit, color: e.type === 'poison' ? '#c77dff' : e.kind === 'magic' ? '#e0aaff' : undefined, born: now });
        if (e.type === 'attack' && e.ranged && src && tgt) spawned.push({ id: fxIdRef.current++, kind: 'proj', x: src.x, y: src.y - m.size * 0.3, x2: tgt.x, y2: tgt.y - m.size * 0.3, born: now });
      } else if (e.type === 'heal' && e.amount) {
        if (tgt) spawned.push({ id: fxIdRef.current++, kind: 'heal', x: tgt.x, y: tgt.y - m.size * 0.4, text: '+' + e.amount, born: now });
      } else if (e.type === 'cast') {
        if (tgt) spawned.push({ id: fxIdRef.current++, kind: 'burst', x: tgt.x, y: tgt.y, color: BURST_COLORS[e.skillKind ?? ''] ?? '#ffd60a', radius: e.radius, born: now });
      } else if (e.type === 'death') {
        if (tgt) spawned.push({ id: fxIdRef.current++, kind: 'soul', x: tgt.x, y: tgt.y, born: now });
      } else if (e.type === 'dodge') {
        if (tgt) spawned.push({ id: fxIdRef.current++, kind: 'dmg', x: tgt.x, y: tgt.y - m.size * 0.4, text: 'NÉ', color: '#adb5bd', born: now });
      }
    }
    if (spawned.length) setFxItems(prevItems => [...prevItems.filter(i => now - i.born < 1000), ...spawned].slice(-40));
    if (evs.some(e => e.crit && (e.amount ?? 0) >= 120)) { setShake(true); if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current); shakeTimerRef.current = setTimeout(() => setShake(false), 320); }
  }, [frameIdx, phase, result, arenaSize]);
  useEffect(() => { if (phase==='battle' && result && frameIdx >= result.frames.length-1 && !resolvedRef.current) { resolvedRef.current = true; const tm = setTimeout(() => resolveBattle(), 650); return () => clearTimeout(tm); } }, [frameIdx, phase, result]);
  async function addGems(n: number) { const m = await loadMeta(); m.gems += n; if (mode==='waves') m.bestWave = Math.max(m.bestWave, wave); await saveMeta(m); }
  function computeDmg(res: BattleResult) { const map = new Map<string, { name: string; dmg: number; team: number }>(); const myNames = new Map(board.map(u => [champById(u.defId).name, 0])); for (const e of res.events) { if (!e.amount) continue; const m = e.text.match(/^(.*?) đánh /); if (!m) continue; const name = m[1]; const team = myNames.has(name) ? 0 : 1; const cur = map.get(name) ?? { name, dmg: 0, team }; cur.dmg += e.amount; map.set(name, cur); } const arr = [...map.values()].sort((a,b) => b.dmg - a.dmg); setDmgStats(arr); return arr; }
  function resolveBattle() {
    if (!result) return; const win = result.winner===0; setPhase('done'); audio.playSfx(win ? 'win' : 'lose');
    const dmgArr = computeDmg(result); const dealt = dmgArr.filter(d => d.team===0).reduce((a,d) => a+d.dmg, 0); const taken = dmgArr.filter(d => d.team===1).reduce((a,d) => a+d.dmg, 0); setSummary({ win, dealt, taken });
    if (mode==='tutorial') { emitTut('battleEnd'); say(win ? 'Thắng trận luyện tập! Tướng của bạn tự đánh và tung kỹ năng khi đầy mana đó.' : 'Thua trận luyện tập cũng không sao — hướng dẫn vẫn tiếp tục, cứ làm theo mascot nhé.'); setGold(g => g + 10); setPhase('plan'); setResult(null); return; }
    if (mode==='campaign') { const sd = stageDef(stageId); const reward = stageReward(stageId); setBanner({ title: win ? 'THẮNG' : 'THUA', sub: win ? 'Gây ' + dealt + ' sát thương' : 'Nhận ' + taken + ' sát thương', tone: win ? 'win' : 'lose' });
      if (win) { const frac = result.survivors / Math.max(1, board.length); const stars = frac>=0.7?3:frac>=0.35?2:1;
        loadMeta().then(async m => { m.campaignStars[String(stageId)] = Math.max(m.campaignStars[String(stageId)] ?? 0, stars); m.unlockedStage = Math.max(m.unlockedStage, Math.min(TOTAL_STAGES, stageId+1)); m.gems += reward; if (stageId===TOTAL_STAGES) m.wins += 1; await saveMeta(m); });
        setFinished(`Thắng ${sd.name}! Nhận ${stars} sao và ${reward} Ngọc.`);
        recordRewards({ mode: 'campaign', modeLabel: 'Chiến dịch PvE', resultText: `Thắng ${sd.name} (${stars} sao)`, xp: 30 }); }
      else { setFinished('Thua rồi... Hãy nâng cấp đội hình, ghép sao và thử lại nhé.');
        recordRewards({ mode: 'campaign', modeLabel: 'Chiến dịch PvE', resultText: `Thua tại ${sd.name}`, xp: 8 }); }
      return; }
    if (mode==='waves') { setBanner({ title: win ? 'THẮNG' : 'THUA', sub: win ? 'Gây ' + dealt + ' sát thương' : 'Dừng ở sóng ' + wave, tone: win ? 'win' : 'lose' }); if (win) { say('Qua sóng '+wave+'! Sóng tiếp theo mạnh hơn.'); setWave(w => w+1); setGold(g => g + 6 + Math.floor(wave/3)); if (wave%3===0) setInventory(inv => [...inv, randomItem()]); setPhase('plan'); setResult(null); }
      else { addGems(wave*5); setFinished(`Dừng lại ở sóng ${wave}. Kỷ lục được lưu, nhận ${wave*5} Ngọc.`);
        recordRewards({ mode: 'waves', modeLabel: 'Sóng quái vô hạn', resultText: `Dừng lại ở sóng ${wave}`, xp: Math.min(60, 6 + wave * 2) }); } return; }
    // Arena theo cau truc stage TFT
    const dmgTaken = win ? 0 : lossDamage(round, result.enemySurvivors);
    let newHp = hp; const newPlayers = players.map(p => ({ ...p, lvl: p.lvl }));
    if (win) { setStreak(s => s>=0 ? s+1 : 1); } else { setStreak(s => s<=0 ? s-1 : -1); newHp = Math.max(0, hp - dmgTaken); setHp(newHp); say(`Thua round ${roundLabel(round)}, mất ${dmgTaken} máu (theo stage + quân địch còn sống).`); setLegendHurt(true); setRedFlash(true); setTimeout(() => setLegendHurt(false), 1300); if (dmgTaken >= 8) { setShake(true); setTimeout(() => setShake(false), 550); } }
    if (win) say('Thắng round '+roundLabel(round)+'!');
    setBanner({ title: win ? 'THẮNG' : 'THUA', sub: win ? 'Gây ' + dealt + ' sát thương' : '-' + dmgTaken + ' máu', tone: win ? 'win' : 'lose' });
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
    if (newHp<=0 || aliveCount<=1) { const rank = newHp<=0 ? aliveCount : 1; if (rank===1) audio.playSfx('champion'); loadMeta().then(async m => { m.bestRank = Math.min(m.bestRank, rank); m.gems += Math.max(10, (9-rank)*15); if (rank===1) m.wins += 1; await saveMeta(m); }); setFinished(rank===1 ? 'Vô địch! Bạn đứng hạng 1/8. Tuyệt vời!' : `Trận đấu kết thúc. Bạn xếp hạng ${rank}/8.`);
      recordRewards({ mode: 'arena', modeLabel: 'Đấu với AI (Đấu Trường)', resultText: rank===1 ? 'Vô địch Đấu Trường' : `Xếp hạng ${rank}/8 trong Đấu Trường`, placement: rank, xp: xpForPlacement(rank) }); return; }
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
        {/* ===== TOP BAR: o cuong hoa trai, cum stage giua, nut phai ===== */}
        <View style={st.topbar}>
          <Pressable style={st.augSquare} onPress={() => { if (augments.length) setAugView(true); else say('Chưa có cường hóa — cường hóa xuất hiện ở các mốc 2-1, 3-2, 4-2.'); }}>
            <Svg width={24} height={24} viewBox="0 0 24 24"><Polygon points="12,1.5 22.5,12 12,22.5 1.5,12" fill={augments.length ? '#2b3a67' : '#232c4c'} stroke={augments.length ? '#ffd60a' : '#5b6a94'} strokeWidth="1.6" /><Polygon points={starPoints(12, 12, 5.5)} fill={augments.length ? '#ffd60a' : '#5b6a94'} /></Svg>
            {!!augments.length && (<View style={st.augCount}><Text style={st.augCountTxt}>{augments.length}</Text></View>)}
          </Pressable>
          <View style={st.stageCluster}>
            <View style={st.stagePlaque}>
              <Text style={st.stageBig}>{isArena ? roundLabel(round) : mode==='campaign' ? stageDef(stageId).name : mode==='waves' ? 'Sóng '+wave : 'Luyện tập'}</Text>
            </View>
            {isArena && (<View style={st.stageDots}>
              {stageRounds.map(r => { const ss = stageSub(r); const kind = r===round ? 'cur' : isPveStageRound(r) ? 'pve' : isCarouselRound(r) ? 'car' : 'pvp'; return (<View key={r} style={[st.dot, kind==='cur' && st.dotCur, kind==='pve' && st.dotPve, kind==='car' && st.dotCar]}><Text style={[st.dotTxt, kind==='cur' && { color: '#23180a' }]}>{ss.sub}</Text></View>); })}
            </View>)}
            {phase==='battle' ? <View style={st.timerPill}><Text style={st.timerPillTxt}>Đang giao tranh: {enemyLabel}</Text></View>
            : isArena ? (<View style={st.timerRow}><View style={[st.timerBar, { width: 120 }]}><View style={[st.timerFill, { width: (planLeft/planMax*100)+'%', backgroundColor: planLeft<=5 ? '#ef476f' : '#f5c542' }]} /></View><View style={st.timerPill}><Text style={[st.timerPillTxt, planLeft<=5 && { color: '#ef476f' }]}>{paused ? 'Tạm dừng' : planLeft + 's'}</Text></View></View>)
            : <View style={st.timerPill}><Text style={st.timerPillTxt}>{mode==='campaign' ? ('Độ khó: '+stageDef(stageId).power+' — Thưởng: '+stageReward(stageId)+' Ngọc') : 'Chuẩn bị tự do'}</Text></View>}
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
                <View key={r.t.id} style={[st.traitRow, r.tier>0 && { backgroundColor: '#4a3a10', borderColor: tierColor }, hl && st.traitHl]}>
                  <Text style={st.traitName}>{r.t.name}</Text>
                  <Text style={[st.traitCnt, r.tier>0 && { color: '#ffd60a', fontWeight:'900' }]}>{r.c}{r.next ? '/'+r.next : ' (tối đa)'}</Text>
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
            <ArenaScene width={arenaSize.w} height={arenaSize.h}/>
            <AmbientParticles width={arenaSize.w} height={arenaSize.h}/>
                        <Svg style={StyleSheet.absoluteFill} width={arenaSize.w} height={arenaSize.h}>
              {(() => { const bx = hm.ox - hm.size * 0.8, by = hm.oy - hm.size * 0.6, bw = 7.5 * hm.hw + hm.size * 1.6, bh = (2 * hm.size + (rows - 1) * 1.5 * hm.size) + hm.size * 1.15; return (<React.Fragment>
                <Rect x={bx} y={by} width={bw} height={bh} rx={16} fill="rgba(10,16,14,0.18)" stroke="#4c5563" strokeWidth={10} strokeOpacity={0.55} />
                <Rect x={bx + 6} y={by + 6} width={bw - 12} height={bh - 12} rx={12} fill="none" stroke="#aeb8c4" strokeWidth={1.4} strokeOpacity={0.35} />
                <Rect x={bx + 2} y={by + 2} width={bw - 4} height={bh - 4} rx={14} fill="none" stroke="#2c313a" strokeWidth={2} strokeOpacity={0.5} />
              </React.Fragment>); })()}
              {Array.from({length: rows}).map((_, y) => Array.from({length: 7}).map((_, x) => { const { cx, cy } = hexCenter(hm, x, y); const occ = phase!=='battle' && board.some(u => u.x===x && u.y===y); const enemyHalf = phase==='battle' && y >= 4; return (
                <Polygon key={x+'-'+y} points={hexPoints(cx, cy, hm.size)} fill={occ ? 'rgba(255,214,110,0.20)' : enemyHalf ? 'rgba(255,130,118,0.055)' : 'rgba(120,255,205,0.05)'} stroke={enemyHalf ? 'rgba(255,150,140,0.6)' : 'rgba(64,224,190,0.6)'} strokeWidth={1.3} onPress={phase!=='battle' ? () => tapBoardCell(x, y) : undefined}/>
              ); }))}
              {phase!=='battle' && selUid != null && (<ValidCellGlow hm={hm} rows={rows} board={board}/>)}
            </Svg>
            {(() => { const bx = hm.ox - hm.size * 0.8, by = hm.oy - hm.size * 0.6, bw = 7.5 * hm.hw + hm.size * 1.6, bh = (2 * hm.size + (rows - 1) * 1.5 * hm.size) + hm.size * 1.15; return (<React.Fragment>
              <Torch x={bx + 8} y={by + 12} s={0.95} /><Torch x={bx + bw - 8} y={by + 12} s={0.95} />
              <Torch x={bx + 8} y={by + bh + 14} s={0.8} /><Torch x={bx + bw - 8} y={by + bh + 14} s={0.8} />
            </React.Fragment>); })()}
            {phase==='plan' && (<View pointerEvents="none" style={{ position:'absolute', left:0, right:0, top:0, bottom:0, alignItems:'center', justifyContent:'center', zIndex:1 }}>
              <Text style={{ fontSize: Math.min(120, arenaSize.w * 0.17), fontWeight:'900', color:'rgba(255,255,255,0.10)', letterSpacing: 4 }}>{board.length}/{level}</Text>
            </View>)}
                        {phase!=='battle' && board.map(u => { const { cx, cy } = hexCenter(hm, u.x, u.y); const sz = hm.size * 2.05 * rowDepth(u.y, 4).scale * STAR_SCALE(u.star); const isSel = selUid===u.uid; const rig = (
                <View style={[{ width: sz, height: sz, alignItems:'center' }, u.star>=2 && { shadowColor: u.star>=3 ? '#ffb703' : '#d7dee8', shadowOpacity: 0.9, shadowRadius: u.star>=3 ? 12 : 7, shadowOffset: { width: 0, height: 0 }, elevation: 6 }]}>
                  <UnitPedestal sz={sz} team={0} star={u.star}/>
                  <ChibiRig spec={champById(u.defId)} size={sz} star={u.star} state='idle'/>
                  {u.star>=3 && <StarSparkles sz={sz}/>}
                </View>); return (
              <View key={u.uid} style={{ position:'absolute', left: cx - sz/2, top: cy + hm.size*0.28 - sz*0.88, width: sz, height: sz, alignItems:'center', zIndex: rowDepth(u.y, 4).zIndex }} pointerEvents="none">
                {isSel && <View style={[st.selRing, { width: sz*0.9, height: sz*0.3, bottom: -2 }]} />}
                {isSel ? <SelBounce>{rig}</SelBounce> : rig}
                <UnitBars sz={sz} star={u.star} hpFrac={1} manaFrac={0} items={u.items} />
              </View> ); })}
            {phase==='battle' && frame && result && renderUnitsForFrame(frame).map(u => { const { cx, cy } = hexCenter(hm, Math.max(0, Math.min(6, u.x)), Math.max(0, Math.min(6, u.y))); const prev = frameIdx>0 ? result.frames[frameIdx-1].units.find(v => v.uid===u.uid) : undefined; const prevT = frameIdx>0 ? result.frames[frameIdx-1].t : frame.t - 0.5; const evs = eventsInWindow(result.events, prevT, frame.t); const isTarget = evs.some(e => (e.type==='attack' || e.type==='hit') && (e.targetUid ?? e.uid)===u.uid); const lungeEv = evs.find(e => e.type==='attack' && e.attackerUid===u.uid && !e.ranged); const lx = lungeEv && lungeEv.tx!==undefined ? Math.sign(lungeEv.tx - u.x)*12 : 0; const ly = lungeEv && lungeEv.ty!==undefined ? Math.sign(lungeEv.ty - u.y)*6 : 0; const animState = stateForUnit({ alive: u.alive, moved: !!prev && (prev.x!==u.x || prev.y!==u.y), castAtFrame: evs.some(e => e.type==='cast' && e.attackerUid===u.uid), attackedAtFrame: evs.some(e => e.type==='attack' && e.attackerUid===u.uid), hurtAtFrame: evs.some(e => (e.targetUid ?? e.uid)===u.uid && !!e.amount), battleOver: frameIdx >= result.frames.length-1, won: result.winner===u.team }); const dep = rowDepth(u.y, 7); const sz = hm.size * 2.05 * dep.scale * STAR_SCALE(u.star); const stunAngle = (frame.t * 120) % 360; return (
              <View key={u.uid} style={{ position:'absolute', left: cx - sz/2 + lx + (isTarget ? (frameIdx % 2 === 0 ? 3 : -3) : 0), top: cy + hm.size*0.28 - sz*0.88 + ly, width: sz, zIndex: dep.zIndex, alignItems:'center' }}>
                <View style={[{ width: sz, height: sz, alignItems:'center' }, u.star>=2 && { shadowColor: u.star>=3 ? '#ffb703' : '#d7dee8', shadowOpacity: 0.9, shadowRadius: u.star>=3 ? 12 : 7, shadowOffset: { width: 0, height: 0 }, elevation: 6 }]}>
                  <UnitPedestal sz={sz} team={u.team} star={u.star}/>
                  <ChibiRig spec={u.art} size={sz} star={u.star} state={animState} flip={u.team===1}/>
                  {isTarget && <View style={{ position:'absolute', left:0, top:0, width: sz, height: sz, backgroundColor:'#ffffff', opacity:0.55, borderRadius:12 }} pointerEvents="none"/>}
                  {u.star>=3 && <StarSparkles sz={sz}/>}
                  {u.stun > 0 && (<Svg width={sz*0.52} height={16} viewBox="0 0 62 16" style={{ position:'absolute', left: sz*0.24, top: -4, transform: [{ rotate: stunAngle + 'deg' }] } as any} pointerEvents="none"><Polygon points={starPoints(9, 8, 6)} fill="#ffd60a"/><Polygon points={starPoints(31, 8, 6)} fill="#ffd60a"/><Polygon points={starPoints(53, 8, 6)} fill="#ffd60a"/></Svg>)}
                </View>
                <UnitBars sz={sz} star={u.star} hpFrac={u.hp / u.maxHp} manaFrac={u.maxMana ? u.mana / u.maxMana : 0} items={itemsByUid[u.uid] ?? []} />
              </View> ); })}
<View style={st.legend}>
              <FloatWrap amp={4}>
                <ChibiRig spec={champById('toto')} size={56} state={legendHurt ? 'hurt' : 'idle'}/>
              </FloatWrap>
              <Text style={st.legendName}>Toto</Text>
              <View style={st.legendBadge}><Text style={st.legendBadgeTxt}>{isArena ? 'Cấp ' + level : mode==='campaign' ? 'PvE' : mode==='waves' ? 'Sóng ' + wave : 'Tập'}</Text></View>
              <View style={{ width: 68 }}>
                <SegmentBar frac={hp / 100} color={hp > 50 ? '#43c62f' : hp > 25 ? '#e0a800' : '#ef476f'} h={6} />
              </View>
              <Text style={st.legendHp}>{hp} máu • Đội {board.length}/{level}</Text>
            </View>
            {phase==='battle' && (<View style={st.battleCtrls}><Pressable style={st.smallBtn} onPress={() => result && setFrameIdx(result.frames.length-1)}><Text style={st.smallTxt}>Bỏ qua tới kết quả</Text></Pressable></View>)}
            {phase==='battle' && result && (<View style={st.logFloat}>{result.events.filter(e => Math.abs(e.t - (frame?.t ?? 0)) < 1.4).slice(-2).map((e,i) => <Text key={i} style={st.logTxt}>{e.text}{e.amount?(' ('+e.amount+')'):''}</Text>)}</View>)}
            <FxLayer items={fxItems}/>
            {banner && <ArenaBanner title={banner.title} sub={banner.sub} tone={banner.tone} onDone={() => setBanner(null)}/>}
            {redFlash && <View pointerEvents="none" style={{ position:'absolute', left:0, top:0, right:0, bottom:0, borderWidth:6, borderColor:'#ef476f', backgroundColor:'rgba(239,71,111,0.12)', zIndex:180 }}/>}
          </View>
          {/* RIGHT: scoreboard / damage */}
          <View style={st.rightPanel}>
            {isArena ? (<>
              <View style={st.tabRow}><Pressable style={[st.tab, rightTab==='players' && st.tabOn]} onPress={() => setRightTab('players')}><Text style={[st.tabTxt, rightTab==='players' && st.tabTxtOn]}>Người chơi</Text></Pressable><Pressable style={[st.tab, rightTab==='dmg' && st.tabOn]} onPress={() => setRightTab('dmg')}><Text style={[st.tabTxt, rightTab==='dmg' && st.tabTxtOn]}>Sát thương</Text></Pressable></View>
              {rightTab==='players' ? (<ScrollView showsVerticalScrollIndicator={false}>{players.map((p, i) => { const isOpp = phase!=='battle' ? peekOpponent().idx===i : oppIdx===i; return (
                <Pressable key={i} onPress={() => { setScout(i); audio.playSfx('click'); }} style={[st.pRow, !p.alive && st.pDead, isOpp && p.alive && st.pOpp]}>
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text style={st.pName} numberOfLines={1}>{p.name}{i===0?' (bạn)':''} • Cấp {i===0 ? level : p.lvl}</Text>
                    <View style={{ flexDirection:'row', alignItems:'center', gap:7 }}>
                      <Text style={[st.pHpBig, { color: !p.alive ? '#8a93ad' : p.hp>50 ? '#7ee787' : p.hp>25 ? '#ffd60a' : '#ff8fab' }]}>{p.alive ? p.hp : (p.rank ? '#'+p.rank : '0')}</Text>
                      <View style={[st.pHpBar, { flex: 1 }]}><View style={[st.pHpFill, { width: Math.max(0, p.hp)+'%', backgroundColor: p.hp>50 ? '#43c62f' : p.hp>25 ? '#e0a800' : '#ef476f' }]} /></View>
                    </View>
                    {i===0 && streak !== 0 && <Text style={st.pHp}>Chuỗi {streak>0 ? 'thắng ' : 'thua '}{Math.abs(streak)}</Text>}
                    {!p.alive && !!p.rank && <Text style={st.pHp}>Đã bị loại — Hạng {p.rank}</Text>}
                  </View>
                  <View style={[st.pAvatar, isOpp && p.alive && st.pAvatarOpp, !p.alive && { borderColor:'#3a4568' }]}>
                    <View style={{ position:'absolute', left:-4, top:-5 }}>
                      <ChibiRig spec={CHAMPIONS[(i*3) % CHAMPIONS.length]} size={46} state={p.alive ? 'idle' : 'death'}/>
                    </View>
                  </View>
                </Pressable> ); })}</ScrollView>)
              : (<ScrollView showsVerticalScrollIndicator={false}><Text style={st.dim}>Sát thương đánh thường theo nhật ký trận gần nhất. Chạm người chơi ở tab Người chơi để xem bàn cờ của họ.</Text>{dmgStats.map((d, i) => (<View key={i} style={st.dRow}><Text style={[st.dName, { color: d.team===0 ? '#7fb3ff' : '#ff8fab' }]}>{d.name}</Text><View style={st.dBar}><View style={{ height: 10, borderRadius: 5, width: (d.dmg/maxDmg*100)+'%', backgroundColor: d.team===0 ? '#4361ee' : '#ef476f' }} /></View><Text style={st.dVal}>{d.dmg}</Text></View>))}{!dmgStats.length && <Text style={st.dim}>Chưa có dữ liệu — hãy đấu một round.</Text>}</ScrollView>)}
            </>) : (<>
              <Text style={st.panelTitle}>{mode==='campaign' ? 'Thông tin ải' : mode==='waves' ? 'Thử thách' : 'Ghi chú'}</Text>
              {mode==='campaign' && <><Text style={st.infoLine}>{stageDef(stageId).name}</Text><Text style={st.dim}>Chương {stageDef(stageId).chapter} — Độ khó {stageDef(stageId).power}</Text><Text style={st.dim}>Thưởng thắng: {stageReward(stageId)} Ngọc. Tổng chiến dịch: {TOTAL_STAGES} màn.</Text></>}
              {mode==='waves' && <Text style={st.dim}>Sóng {wave}: quái mạnh dần theo sóng. Cứ 3 sóng nhận 1 trang bị ngẫu nhiên.</Text>}
              {isTut && <Text style={st.dim}>Làm theo hướng dẫn của mascot Nana ở phía trên. Hoàn thành lần đầu nhận {TUT_REWARD} Ngọc.</Text>}
              <Text style={[st.panelTitle, { marginTop: 8 }]}>Sát thương (đánh thường)</Text>
              <ScrollView showsVerticalScrollIndicator={false}>{dmgStats.map((d, i) => (<View key={i} style={st.dRow}><Text style={[st.dName, { color: d.team===0 ? '#7fb3ff' : '#ff8fab' }]}>{d.name}</Text><View style={st.dBar}><View style={{ height: 10, borderRadius: 5, width: (d.dmg/maxDmg*100)+'%', backgroundColor: d.team===0 ? '#4361ee' : '#ef476f' }} /></View><Text style={st.dVal}>{d.dmg}</Text></View>))}{!dmgStats.length && <Text style={st.dim}>Chưa có dữ liệu.</Text>}</ScrollView>
            </>)}
          </View>
        </View>
        {/* ===== BENCH (o da long vao mep duoi san) ===== */}
        {phase!=='battle' && (<View style={[st.benchRow, hi('bench') && st.tutHi]}><Text style={st.benchLbl}>Bench</Text>{Array.from({length:9}).map((_,i) => { const u = bench[i]; return (
          <Pressable key={i} onPress={() => u && tapBench(u)} style={[st.benchCell, u && selUid===u.uid && st.cellSel]}>{u ? <ChibiRig spec={champById(u.defId)} size={44} star={u.star} state='idle'/> : <Text style={st.cellDot}>·</Text>}</Pressable> ); })}
          <View style={st.logMini}>{log.slice(0,2).map((l,i) => <Text key={i} style={st.logTxt} numberOfLines={1}>{l}</Text>)}</View>
        </View>)}
        {/* ===== SHOP ===== */}
        {phase!=='battle' && (<View style={st.shopRow}>
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
                  <View style={[st.cardArt, { backgroundColor: COST_COLORS[d.cost] + '33' }]}>
                    <ChibiRig spec={d} size={84} state='idle'/>
                    <View style={st.costBadge}><Text style={st.costBadgeTxt}>{d.cost}</Text></View>
                    {glow && <Text style={st.glowTag}>Sắp lên sao</Text>}
                  </View>
                  <View style={st.cardInfo}>
                    <Text style={st.shopName}>{d.name}</Text>
                    <Text style={st.cardTrait}>{d.traits.map(traitName).join(' · ')}</Text>
                  </View>
                </Pressable> ); })}
            </View>
          </View>
          {phase==='plan' && <Pressable style={[st.fightBtn, hi('fight') && st.tutHiBtn]} onPress={startBattle}><Text style={st.fightTxt}>Bắt đầu đấu</Text><Text style={st.fightSub}>{isArena ? enemyForRound().label : mode==='campaign' ? stageDef(stageId).name : mode==='waves' ? 'Sóng '+wave : 'Đội luyện tập'}</Text></Pressable>}
        </View>)}
        <Pressable style={st.homeLink} onPress={() => router.back()}><Text style={st.dim}>Về trang chủ</Text></Pressable>
        {/* ===== VONG TRON BAN TUONG o 2 goc duoi (chi khi dang chon 1 tuong, phase chuan bi) ===== */}
        {phase==='plan' && selUnit && (<React.Fragment>
          <Pressable style={[st.sellCircle, { left: -74, bottom: -80 }]} onPress={sellSelected}>
            <View style={{ position:'absolute', right: 20, top: 24, alignItems:'center', gap: 1 }}>
              <Svg width={24} height={24} viewBox="0 0 24 24"><Rect x="5" y="7" width="14" height="13" rx="2" fill="#aab4d4" /><Rect x="3.5" y="4.5" width="17" height="3" rx="1.5" fill="#e8ecff" /><Rect x="9.5" y="2" width="5" height="3" rx="1.4" fill="#e8ecff" /><Rect x="8.6" y="10" width="2.2" height="7" fill="#232c4c" /><Rect x="13.2" y="10" width="2.2" height="7" fill="#232c4c" /></Svg>
              <Text style={st.sellGold}>{sellValue(selUnit.defId, selUnit.star)} vàng</Text>
              <Text style={st.sellLbl}>Bán {champById(selUnit.defId).name}</Text>
            </View>
          </Pressable>
          <Pressable style={[st.sellCircle, { right: -74, bottom: -80 }]} onPress={sellSelected}>
            <View style={{ position:'absolute', left: 20, top: 24, alignItems:'center', gap: 1 }}>
              <Svg width={24} height={24} viewBox="0 0 24 24"><Rect x="5" y="7" width="14" height="13" rx="2" fill="#aab4d4" /><Rect x="3.5" y="4.5" width="17" height="3" rx="1.5" fill="#e8ecff" /><Rect x="9.5" y="2" width="5" height="3" rx="1.4" fill="#e8ecff" /><Rect x="8.6" y="10" width="2.2" height="7" fill="#232c4c" /><Rect x="13.2" y="10" width="2.2" height="7" fill="#232c4c" /></Svg>
              <Text style={st.sellGold}>{sellValue(selUnit.defId, selUnit.star)} vàng</Text>
              <Text style={st.sellLbl}>Bán {champById(selUnit.defId).name}</Text>
            </View>
          </Pressable>
        </React.Fragment>)}
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
                {carousel && !finished && (<View style={st.carOverlay}>
          <Text style={st.carTitle}>Vòng chọn — Carousel</Text>
          <Text style={st.carDesc}>Vòng tròn tướng kèm trang bị đang quay. Chạm vào 1 ô để nhận tướng + trang bị đó (các đối thủ chọn sau bạn).</Text>
          <View style={st.carCircle}>
            <View style={st.carRing}/>
            {carousel.map((opt, i) => { const ang = (carAngle + i * 45) * Math.PI / 180; const cx = 190 + Math.cos(ang) * 130; const cy = 130 + Math.sin(ang) * 88; const d = champById(opt.defId); return (
              <Pressable key={i} onPress={() => chooseCarousel(opt)} style={[st.carCell, { left: cx - 50, top: cy - 56, borderColor: COST_COLORS[d.cost] }]}>
                <ChibiRig spec={d} size={72} state='idle'/><Text style={st.carName}>{d.name}</Text>
                <View style={{ flexDirection:'row', alignItems:'center', gap:2 }}><ItemArt color={(itemById(opt.item)?.color) ?? '#ccc'} size={16}/><Text style={st.carItem}>{itemById(opt.item)?.name ?? ''}</Text></View>
              </Pressable> ); })}
            <View style={st.carCenter}><ChibiRig spec={champById('toto')} size={64} state='victory'/></View>
          </View>
        </View>)}
{augView && (<View style={st.overlay}><View style={st.modal}>
          <Text style={st.modalTitle}>Cường hóa đã chọn</Text>
          <Text style={st.modalDesc}>Cường hóa nhận ở các mốc 2-1, 3-2, 4-2 và có hiệu lực cả trận.</Text>
          {augments.map(id => { const a = AUGMENTS.find(x => x.id===id); return a ? (<View key={id} style={st.augViewRow}><Svg width={22} height={22} viewBox="0 0 24 24"><Polygon points="12,1.5 22.5,12 12,22.5 1.5,12" fill="#2b3a67" stroke="#ffd60a" strokeWidth="1.6" /><Polygon points={starPoints(12, 12, 5.5)} fill="#ffd60a" /></Svg><View style={{ flex: 1 }}><Text style={st.selName}>{a.name}</Text><Text style={st.dim}>{a.desc}</Text></View></View>) : null; })}
          {!augments.length && <Text style={st.dim}>Chưa có cường hóa nào.</Text>}
          <Pressable style={st.bigBtn} onPress={() => setAugView(false)}><Text style={st.bigTxt}>Đóng</Text></Pressable>
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
            {reward && (<View style={st.rewardBox}>
              <Text style={st.rewardXp}>+{reward.xp} XP hồ sơ</Text>
              {reward.lpDelta !== undefined && (<View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                {reward.tier !== undefined && <RankBadge tier={reward.tier} size={30} />}
                <Text style={[st.rewardLp, { color: reward.lpDelta >= 0 ? '#57e389' : '#ff8fab' }]}>{reward.lpDelta >= 0 ? '+' : ''}{reward.lpDelta} LP — {reward.rankText}{reward.promoted ? ' — THĂNG HẠNG!' : reward.demoted ? ' — Giáng hạng' : ''}</Text>
              </View>)}
              {reward.lpDelta === undefined && <Text style={st.rewardNote}>Chế độ này chỉ cộng XP, không tính LP hạng.</Text>}
            </View>)}
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
  root:{ flex:1, backgroundColor:'#14101f', alignItems:'center', justifyContent:'center' },
  frame:{ backgroundColor:'#10182e', borderRadius:16, borderWidth:2, borderColor:'#c9a227', padding:8, gap:6, overflow:'hidden', maxWidth:'100%', maxHeight:'100%' },
  topbar:{ flexDirection:'row', gap:10, alignItems:'flex-start', backgroundColor:'#1a2340', borderRadius:12, borderWidth:1, borderColor:'#c9a227', paddingHorizontal:10, paddingVertical:6 },
  augSquare:{ width:46, height:46, borderRadius:9, backgroundColor:'#10182e', borderWidth:2, borderColor:'#c9a227', alignItems:'center', justifyContent:'center', position:'relative', marginTop:2 },
  augCount:{ position:'absolute', right:-6, top:-6, minWidth:18, height:18, borderRadius:9, backgroundColor:'#ffd60a', borderWidth:1, borderColor:'#a86e00', alignItems:'center', justifyContent:'center', paddingHorizontal:4 }, augCountTxt:{ fontSize:10.5, fontWeight:'900', color:'#23180a' },
  augViewRow:{ flexDirection:'row', gap:9, alignItems:'center', backgroundColor:'#232d4f', borderRadius:11, padding:8, borderWidth:1, borderColor:'#46538a' },
  stageCluster:{ flex:1, alignItems:'center', gap:3 },
  stagePlaque:{ backgroundColor:'#0d1526', borderWidth:1.5, borderColor:'#c9a227', borderRadius:10, paddingHorizontal:16, paddingVertical:1, shadowColor:'#000', shadowOpacity:0.4, shadowRadius:5, shadowOffset:{ width:0, height:2 } },
  stageBig:{ fontWeight:'900', fontSize:20, color:'#f5d67b', letterSpacing:1 },
  stageDots:{ flexDirection:'row', gap:4, alignItems:'center' },
  dot:{ width:22, height:22, borderRadius:11, backgroundColor:'#2a3454', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#46538a' }, dotCur:{ backgroundColor:'#f5c542', borderColor:'#f5c542', transform:[{scale:1.2}] }, dotPve:{ backgroundColor:'#8a5a13' }, dotCar:{ backgroundColor:'#5a189a' }, dotTxt:{ fontSize:11, fontWeight:'800', color:'#eef1ff' },
  timerRow:{ flexDirection:'row', alignItems:'center', gap:7 }, timerBar:{ height:7, backgroundColor:'rgba(255,255,255,0.14)', borderRadius:4, overflow:'hidden' }, timerFill:{ height:7, borderRadius:4 },
  timerPill:{ backgroundColor:'rgba(8,12,26,0.85)', borderRadius:999, borderWidth:1, borderColor:'#46538a', paddingHorizontal:10, paddingVertical:2.5 }, timerPillTxt:{ fontWeight:'800', color:'#eef1ff', fontSize:11.5 }, timerTxt:{ fontWeight:'800', color:'#eef1ff', fontSize:12 }, sumTxt:{ fontSize:11, color:'#aab4d4', fontWeight:'600' },
  sellCircle:{ position:'absolute', width:156, height:156, borderRadius:78, backgroundColor:'rgba(9,12,25,0.93)', borderWidth:2.5, borderColor:'#c9a227', zIndex:45, shadowColor:'#000', shadowOpacity:0.5, shadowRadius:10, elevation:8 },
  sellGold:{ fontSize:15, fontWeight:'900', color:'#ffd60a' }, sellLbl:{ fontSize:10, fontWeight:'700', color:'#aab4d4', maxWidth:78, textAlign:'center' },
  rewardBox:{ backgroundColor:'#141b33', borderWidth:1, borderColor:'#c9a227', borderRadius:12, paddingHorizontal:12, paddingVertical:8, alignItems:'center', gap:4, alignSelf:'stretch' },
  rewardXp:{ fontSize:13.5, fontWeight:'900', color:'#7fb3ff' }, rewardLp:{ fontSize:13, fontWeight:'900' }, rewardNote:{ fontSize:11, color:'#aab4d4', fontWeight:'600' },
  topBtns:{ flexDirection:'row', gap:6 }, tBtn:{ backgroundColor:'#2f6db3', borderRadius:999, paddingHorizontal:10, paddingVertical:6, borderTopWidth:1, borderTopColor:'#8fc1f5', borderBottomWidth:4, borderBottomColor:'#1c4472' }, tBtnTxt:{ color:'#fff', fontWeight:'700', fontSize:11 },
  middle:{ flex:1, flexDirection:'row', gap:8, minHeight:0 },
  leftPanel:{ width:172, backgroundColor:'rgba(26,35,64,0.96)', borderRadius:14, padding:8, borderWidth:1.5, borderColor:'#c9a227' },
  rightPanel:{ width:196, backgroundColor:'rgba(26,35,64,0.96)', borderRadius:14, padding:8, borderWidth:1.5, borderColor:'#c9a227' },
  panelTitle:{ fontWeight:'900', color:'#f5d67b', marginBottom:4 },
  traitRow:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', backgroundColor:'#242f52', borderRadius:9, paddingHorizontal:8, paddingVertical:4, marginBottom:4, borderWidth:1, borderColor:'transparent' }, traitHl:{ borderColor:'#ffb703', borderWidth:2 }, traitName:{ fontWeight:'700', fontSize:12, color:'#eef1ff' }, traitCnt:{ fontSize:12, color:'#aab4d4', fontWeight:'700' },
  augChip:{ backgroundColor:'#4a3a10', borderRadius:9, paddingHorizontal:8, paddingVertical:4, marginBottom:4 }, augTxt:{ fontSize:11, fontWeight:'700', color:'#ffd60a' },
  invWrap:{ flexDirection:'row', flexWrap:'wrap', gap:6 }, invCell:{ backgroundColor:'#232d4f', borderRadius:10, padding:4, alignItems:'center', width:74, borderWidth:1, borderColor:'#46538a' }, invTxt:{ fontSize:9, textAlign:'center', fontWeight:'600', color:'#e8ecff' },
  selMini:{ marginTop:8, backgroundColor:'#232d4f', borderRadius:10, padding:7 }, selName:{ fontWeight:'800', fontSize:12, color:'#eef1ff' }, miniBtn:{ backgroundColor:'#2f6db3', borderRadius:999, paddingHorizontal:9, paddingVertical:4, borderTopWidth:1, borderTopColor:'#8fc1f5', borderBottomWidth:3, borderBottomColor:'#1c4472' }, miniTxt:{ color:'#fff', fontWeight:'700', fontSize:10 },
  arena:{ flex:1, backgroundColor:'#1d3a2a', borderRadius:16, borderWidth:2, borderColor:'#c9a227', position:'relative', overflow:'hidden', alignItems:'center' },
  selRing:{ position:'absolute', borderWidth:3, borderColor:'#ffb703', borderRadius:999, backgroundColor:'#ffb70333' },
  hpBar:{ width:'92%', height:5, backgroundColor:'rgba(6,8,20,0.5)', borderRadius:3, overflow:'hidden' }, hpFill:{ height:5, backgroundColor:'#38b000' }, manaBar:{ width:'92%', height:4, backgroundColor:'rgba(6,8,20,0.5)', borderRadius:3, overflow:'hidden', marginTop:1 }, manaFill:{ height:4, backgroundColor:'#4dabff' },
  legend:{ position:'absolute', left:7, top:'33%', alignItems:'center', gap:3, zIndex:30 }, legendName:{ fontWeight:'900', fontSize:12, color:'#fff', textShadowColor:'rgba(0,0,0,0.8)', textShadowOffset:{ width:0, height:1 }, textShadowRadius:3 }, legendBadge:{ backgroundColor:'#f5c542', borderRadius:5, paddingHorizontal:6, paddingVertical:1, borderWidth:1, borderColor:'#a86e00' }, legendBadgeTxt:{ fontSize:9.5, fontWeight:'900', color:'#23180a' }, legendHp:{ fontSize:10, color:'#e8ecff', fontWeight:'700', textShadowColor:'rgba(0,0,0,0.8)', textShadowOffset:{ width:0, height:1 }, textShadowRadius:3 },
  battleCtrls:{ position:'absolute', right:8, bottom:8, flexDirection:'row', gap:6 },
  logFloat:{ position:'absolute', left:8, top:8, backgroundColor:'rgba(10,14,30,0.82)', borderRadius:10, padding:7, maxWidth:300 }, logTxt:{ fontSize:11, color:'#ffe9a8' },
  tabRow:{ flexDirection:'row', gap:6, marginBottom:6 }, tab:{ flex:1, backgroundColor:'#242f52', borderRadius:999, paddingVertical:5, alignItems:'center' }, tabOn:{ backgroundColor:'#f5c542' }, tabTxt:{ fontWeight:'800', fontSize:11, color:'#eef1ff' }, tabTxtOn:{ color:'#23180a' },
  pRow:{ flexDirection:'row', gap:7, alignItems:'center', backgroundColor:'#232d4f', borderRadius:11, padding:6, marginBottom:5, borderWidth:2, borderColor:'transparent' }, pDead:{ opacity:0.5, backgroundColor:'#171f38' }, pOpp:{ borderColor:'#ffb703', backgroundColor:'#2a3358' }, pName:{ fontWeight:'800', fontSize:10.5, color:'#eef1ff' }, pHpBar:{ height:5, backgroundColor:'rgba(255,255,255,0.14)', borderRadius:3, overflow:'hidden' }, pHpFill:{ height:5 }, pHp:{ fontSize:9.5, color:'#aab4d4', fontWeight:'600' }, pHpBig:{ fontSize:18, fontWeight:'900', lineHeight:20 }, pAvatar:{ width:38, height:38, borderRadius:19, overflow:'hidden', borderWidth:2, borderColor:'#46538a', backgroundColor:'#141b33', position:'relative' }, pAvatarOpp:{ borderColor:'#ffb703' },
  dRow:{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:5 }, dName:{ width:86, fontSize:11, fontWeight:'700' }, dBar:{ flex:1, backgroundColor:'rgba(255,255,255,0.12)', borderRadius:5 }, dVal:{ width:38, fontSize:11, fontWeight:'800', textAlign:'right', color:'#eef1ff' },
  infoLine:{ fontWeight:'800', color:'#f5d67b' },
  benchRow:{ flexDirection:'row', gap:5, alignItems:'center', backgroundColor:'rgba(22,25,34,0.94)', borderRadius:10, padding:6, borderWidth:1.5, borderColor:'#6e5a1e', marginTop:-11, zIndex:25, shadowColor:'#000', shadowOpacity:0.35, shadowRadius:6, shadowOffset:{ width:0, height:-2 } }, benchLbl:{ fontWeight:'900', color:'#f5d67b', fontSize:12, marginRight:2 }, benchCell:{ width:50, height:50, backgroundColor:'#454e61', borderRadius:7, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#79839b', borderTopWidth:2.5, borderTopColor:'#aeb8c4', borderBottomWidth:3.5, borderBottomColor:'#22262f' }, cellSel:{ borderWidth:3, borderColor:'#ffb703' }, cellDot:{ color:'#98a2b8', fontSize:18 }, logMini:{ flex:1, gap:1 },
  shopRow:{ flexDirection:'row', gap:8, backgroundColor:'rgba(26,35,64,0.96)', borderRadius:14, padding:8, borderWidth:1.5, borderColor:'#c9a227', alignItems:'stretch' },
  shopLeft:{ width:206, gap:6 }, lvlCard:{ backgroundColor:'#232d4f', borderRadius:10, padding:7 }, lvlBig:{ fontWeight:'900', fontSize:16, color:'#f5d67b' }, xpBar:{ height:7, backgroundColor:'rgba(255,255,255,0.14)', borderRadius:4, overflow:'hidden', marginVertical:3 },
  shopBtn:{ flex:1, backgroundColor:'#2f6db3', borderRadius:10, paddingVertical:7, alignItems:'center', borderTopWidth:1, borderTopColor:'#8fc1f5', borderBottomWidth:4, borderBottomColor:'#1c4472' }, shopBtnTxt:{ color:'#fff', fontWeight:'800', fontSize:10 },
  goldBox:{ backgroundColor:'#4a3a10', borderRadius:10, padding:7, borderWidth:1.5, borderColor:'#c9a227' }, goldTxt:{ fontWeight:'900', fontSize:16, color:'#ffd60a' },
  oddsRow:{ flexDirection:'row', gap:5, alignItems:'center', marginBottom:5, flexWrap:'wrap' }, oddChip:{ borderRadius:999, paddingHorizontal:8, paddingVertical:2 }, oddTxt:{ color:'#fff', fontWeight:'800', fontSize:10 },
  cardsRow:{ flexDirection:'row', gap:7 }, shopCard:{ flex:1, maxWidth:172, backgroundColor:'#1e2748', borderRadius:13, padding:6, alignItems:'center', borderWidth:2, gap:4 }, cardGlow:{ borderColor:'#ffb703', shadowColor:'#ffb703', shadowOpacity:0.95, shadowRadius:12, elevation:8, backgroundColor:'#2a2f57' },
  cardArt:{ width:'100%', alignItems:'center', borderRadius:9, paddingVertical:2, position:'relative' }, cardInfo:{ width:'100%', backgroundColor:'#141b33', borderRadius:8, paddingHorizontal:6, paddingVertical:4, alignItems:'center', gap:1 },
  costBadge:{ position:'absolute', right:4, top:4, width:30, height:30, borderRadius:15, backgroundColor:'#ffb703', borderWidth:1, borderColor:'rgba(255,255,255,0.35)', alignItems:'center', justifyContent:'center' }, costBadgeTxt:{ color:'#23180a', fontWeight:'900', fontSize:14 },
  cardTrait:{ fontSize:9, color:'#aab4d4', fontWeight:'600', textAlign:'center' }, glowTag:{ position:'absolute', left:4, top:4, fontSize:9, fontWeight:'900', color:'#6b5200', backgroundColor:'#ffe08a', borderRadius:6, paddingHorizontal:4, paddingVertical:1 },
  shopName:{ fontWeight:'800', textAlign:'center', fontSize:12, color:'#eef1ff' },
  fightBtn:{ width:118, backgroundColor:'#c2255c', borderRadius:14, alignItems:'center', justifyContent:'center', padding:8, gap:2, borderBottomWidth:5, borderBottomColor:'#6d1434', borderTopWidth:1, borderTopColor:'#ff8fab' }, fightTxt:{ color:'#fff', fontWeight:'900', fontSize:16, textAlign:'center' }, fightSub:{ color:'#ffd6e7', fontWeight:'600', fontSize:10, textAlign:'center' },
  homeLink:{ alignSelf:'center', paddingVertical:1 },
  dim:{ fontSize:11, color:'#aab4d4', lineHeight:15 }, synRow:{ flexDirection:'row', flexWrap:'wrap', gap:6 }, synChip:{ backgroundColor:'#242f52', borderRadius:999, paddingHorizontal:9, paddingVertical:4, fontSize:12, color:'#e8ecff' }, synActive:{ backgroundColor:'#4a3a10', fontWeight:'800', color:'#ffd60a' },
  coach:{ position:'absolute', top:52, alignSelf:'center', width:'92%', maxWidth:600, flexDirection:'row', gap:10, backgroundColor:'rgba(26,35,64,0.97)', borderRadius:16, padding:10, borderWidth:2, borderColor:'#c9a227', alignItems:'center', zIndex:60, shadowColor:'#000', shadowOpacity:0.25, shadowRadius:10, elevation:8 }, coachTitle:{ fontWeight:'900', color:'#f5d67b' }, coachTxt:{ color:'#e8ecff', lineHeight:18, fontSize:12 },
  tutHi:{ borderWidth:3, borderColor:'#ffb703', borderRadius:12 }, tutHiBtn:{ borderWidth:3, borderColor:'#ffb703' },
  section:{ fontWeight:'800', color:'#f5d67b' }, shopTrait:{ fontSize:11, color:'#aab4d4', textAlign:'center' },
  smallBtn:{ backgroundColor:'#2f6db3', borderRadius:999, paddingHorizontal:12, paddingVertical:7, borderTopWidth:1, borderTopColor:'#8fc1f5', borderBottomWidth:4, borderBottomColor:'#1c4472' }, smallTxt:{ color:'#fff', fontWeight:'700', fontSize:12 },
  bigBtn:{ backgroundColor:'#2f6db3', borderRadius:999, paddingVertical:12, alignItems:'center', marginTop:4, borderTopWidth:1, borderTopColor:'#8fc1f5', borderBottomWidth:5, borderBottomColor:'#1c4472' }, bigTxt:{ color:'#fff', fontWeight:'800', fontSize:15 },
  overlay:{ position:'absolute', inset:0, backgroundColor:'rgba(8,10,24,0.78)', alignItems:'center', justifyContent:'center', padding:14, zIndex:80 } as any,
  modal:{ backgroundColor:'#1a2340', borderRadius:20, borderWidth:2, borderColor:'#c9a227', padding:16, gap:9, maxWidth:560, width:'100%', maxHeight:'94%' }, modalTitle:{ fontSize:19, fontWeight:'900', textAlign:'center', color:'#f5d67b' }, modalDesc:{ textAlign:'center', color:'#e8ecff', fontSize:12, lineHeight:17 }, modalRow:{ flexDirection:'row', gap:9, justifyContent:'center', flexWrap:'wrap' },
  augCard:{ backgroundColor:'#232d4f', borderRadius:14, borderWidth:1.5, borderColor:'#c9a227', padding:11, width:158, alignItems:'center', gap:3 },
  carOverlay:{ position:'absolute', inset:0, backgroundColor:'rgba(8,10,24,0.66)', alignItems:'center', justifyContent:'center', padding:14, zIndex:80, gap:8 } as any,
  carTitle:{ fontSize:20, fontWeight:'900', textAlign:'center', color:'#f5d67b' }, carDesc:{ textAlign:'center', color:'#e8ecff', fontSize:12, lineHeight:17, maxWidth:560 },
  carCircle:{ width:440, height:290, position:'relative' }, carRing:{ position:'absolute', left:90, top:30, width:200, height:200, borderRadius:100, borderWidth:2, borderColor:'rgba(201,162,39,0.45)' }, carCell:{ position:'absolute', width:100, backgroundColor:'rgba(16,22,44,0.88)', borderRadius:13, borderWidth:2, padding:4, alignItems:'center' }, carName:{ fontWeight:'800', fontSize:10, textAlign:'center', color:'#eef1ff' }, carItem:{ fontSize:9, fontWeight:'600', color:'#aab4d4' }, carCenter:{ position:'absolute', left:190-32, top:130-32 },
  scoutBoard:{ height:210, backgroundColor:'#232d4f', borderRadius:14, position:'relative' }, scoutCell:{ position:'absolute', width:50, height:50, alignItems:'center' },
});
