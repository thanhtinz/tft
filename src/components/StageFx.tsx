// Hieu ung KINH TE / SAN KHAU tu chua (state + interval rieng, pointerEvents="none").
// Moi component tinh tien trinh thuan tu `born` (Date.now() luc sinh) nhu FxLayer trong
// GameScreen, dung 1 interval 40-50ms/component. Toa do: px tuyet doi trong he toa do arena
// (cung he voi FxLayer / hexCenter cua GameScreen). Noi gan tu don mang sau khi het tuoi.
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { ItemArt } from './ChibiArt';

// ---------------------------------------------------------------------------
// OrbFlightLayer: cau loot (vang / trang bi) bay theo duong cong bac 2 ve dich
// ---------------------------------------------------------------------------
export interface OrbFlight {
  id: number;
  x: number;
  y: number;
  kind: 'gold' | 'item';
  born: number;
}

const ORB_DROP_MS = 120; // giai doan 1: roi xuong / nay nhe tai cho
const ORB_FLY_MS = 650; // giai doan 2: bay cong bac 2 ve target
const ORB_SWELL_MS = 110; // giai doan 3: phong nhe tai dich roi bien mat
const ORB_LIFE_MS = ORB_DROP_MS + ORB_FLY_MS + ORB_SWELL_MS; // ~880ms

export function OrbFlightLayer({
  orbs,
  target,
  onArrive,
}: {
  orbs: OrbFlight[];
  target: { x: number; y: number };
  onArrive?: (orb: OrbFlight) => void;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 45);
    return () => clearInterval(iv);
  }, []);

  // onArrive phai goi DUNG 1 LAN / qua cau: nho cac id da bao trong ref,
  // va luon goi ban callback moi nhat (tranh stale closure).
  const arrivedRef = useRef<Set<number>>(new Set());
  const cbRef = useRef(onArrive);
  cbRef.current = onArrive;
  useEffect(() => {
    const now = Date.now();
    for (const orb of orbs) {
      if (now - orb.born >= ORB_DROP_MS + ORB_FLY_MS && !arrivedRef.current.has(orb.id)) {
        arrivedRef.current.add(orb.id);
        if (cbRef.current) cbRef.current(orb);
      }
    }
    // Don ref: bo id khong con trong mang (noi gan da don) de ref khong phinh theo tran
    if (arrivedRef.current.size > 64) {
      const alive = new Set(orbs.map(o => o.id));
      arrivedRef.current.forEach(id => { if (!alive.has(id)) arrivedRef.current.delete(id); });
    }
  });

  const now = Date.now();
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 210 }}>
      {orbs.map(orb => {
        const age = now - orb.born;
        if (age < 0 || age > ORB_LIFE_MS) return null;
        const isGold = orb.kind === 'gold';
        const baseSize = isGold ? 15 : 14;

        let cx = orb.x;
        let cy = orb.y;
        let scale = 1;
        let opacity = 1;

        if (age < ORB_DROP_MS) {
          // Roi xuong ~12px roi nay len nhe (ease theo sin)
          const p = age / ORB_DROP_MS;
          cy = orb.y + 12 * Math.sin(p * Math.PI * 0.78);
          scale = 0.7 + 0.3 * p;
        } else if (age < ORB_DROP_MS + ORB_FLY_MS) {
          // Bay: bezier bac 2, diem dieu khien vong len tren o giua duong
          const raw = (age - ORB_DROP_MS) / ORB_FLY_MS;
          const q = raw * raw * (3 - 2 * raw); // smoothstep: cham o 2 dau, nhanh o giua
          const sx = orb.x;
          const sy = orb.y + 9; // diem cuoi giai doan roi
          const dist = Math.hypot(target.x - sx, target.y - sy);
          const ctrlX = (sx + target.x) / 2;
          const ctrlY = Math.min(sy, target.y) - (56 + dist * 0.18);
          const u = 1 - q;
          cx = u * u * sx + 2 * u * q * ctrlX + q * q * target.x;
          cy = u * u * sy + 2 * u * q * ctrlY + q * q * target.y;
          scale = 1 + 0.12 * Math.sin(q * Math.PI);
        } else {
          // Da toi dich: phong len roi mo dan / bien mat
          const p = (age - ORB_DROP_MS - ORB_FLY_MS) / ORB_SWELL_MS;
          cx = target.x;
          cy = target.y;
          scale = 1 + 0.55 * Math.sin(p * Math.PI);
          opacity = 1 - p * 0.6;
        }

        return (
          <View key={orb.id} style={{ position: 'absolute', left: cx, top: cy, width: 0, height: 0, alignItems: 'center', justifyContent: 'center' }}>
            {/* Quang sang quanh cau */}
            <View style={{ position: 'absolute', left: -baseSize, top: -baseSize, width: baseSize * 2, height: baseSize * 2, borderRadius: baseSize, backgroundColor: isGold ? 'rgba(255,214,10,0.28)' : 'rgba(255,233,168,0.30)', opacity, transform: [{ scale }] }} />
            {isGold ? (
              <View style={{ position: 'absolute', left: -baseSize / 2, top: -baseSize / 2, width: baseSize, height: baseSize, borderRadius: baseSize / 2, backgroundColor: '#ffd60a', borderWidth: 2, borderColor: '#fff3b0', opacity, transform: [{ scale }] }} />
            ) : (
              <View style={{ position: 'absolute', left: -baseSize / 2, top: -baseSize / 2, width: baseSize, height: baseSize, borderRadius: 3, backgroundColor: '#3a2b12', borderWidth: 2, borderColor: '#ffd60a', opacity, transform: [{ scale }] }} />
            )}
            {/* Loi sang o tam */}
            <View style={{ position: 'absolute', left: -3, top: -3, width: 6, height: 6, borderRadius: 3, backgroundColor: '#fffbe6', opacity, transform: [{ scale }] }} />
          </View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// StarBurstFx: chop sao khi hop sao / su kien lon tai 1 diem (song ~550ms)
// ---------------------------------------------------------------------------
const STAR_LIFE_MS = 550;

export function StarBurstFx({ x, y, born, size = 56 }: { x: number; y: number; born: number; size?: number }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 45);
    return () => clearInterval(iv);
  }, []);
  const age = Date.now() - born;
  if (age < 0 || age > STAR_LIFE_MS) return null;
  const p = age / STAR_LIFE_MS;
  const ringScale = 0.4 + 1.2 * p; // 0.4 -> 1.6
  const ringOpacity = 0.9 * (1 - p);
  const coreScale = 1 - 0.35 * p;
  const rayDist = size * (0.28 + 0.5 * p);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, zIndex: 215, alignItems: 'center', justifyContent: 'center' }}>
      {/* Vong soc no */}
      <View style={{ position: 'absolute', left: -size / 2, top: -size / 2, width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: '#ffd60a', opacity: ringOpacity, transform: [{ scale: ringScale }] }} />
      <View style={{ position: 'absolute', left: -size / 2, top: -size / 2, width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: '#fff3b0', opacity: ringOpacity * 0.7, transform: [{ scale: ringScale * 0.78 }] }} />
      {/* Loi sang chop */}
      <View style={{ position: 'absolute', left: -size * 0.22, top: -size * 0.22, width: size * 0.44, height: size * 0.44, borderRadius: size * 0.22, backgroundColor: '#fff7d6', opacity: 1 - p, transform: [{ scale: coreScale }] }} />
      <View style={{ position: 'absolute', left: -size * 0.11, top: -size * 0.11, width: size * 0.22, height: size * 0.22, borderRadius: size * 0.11, backgroundColor: '#ffd60a', opacity: 1 - p * 0.6 }} />
      {/* 6 tia sao nho bay ra quanh tam */}
      {Array.from({ length: 6 }).map((_, i) => {
        const ang = (i * Math.PI) / 3 + Math.PI / 6;
        const rx = Math.cos(ang) * rayDist;
        const ry = Math.sin(ang) * rayDist;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: rx - 2,
              top: ry - 6,
              width: 4,
              height: 12,
              borderRadius: 2,
              backgroundColor: i % 2 === 0 ? '#ffd60a' : '#fff3b0',
              opacity: 1 - p,
              transform: [{ rotate: (ang * 180) / Math.PI + 90 + 'deg' }, { scale: 1 - 0.4 * p }],
            }}
          />
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// MergeSwirlFx: vong xoay hop nhat khi gop sao (song ~600ms)
// ---------------------------------------------------------------------------
const MERGE_LIFE_MS = 600;

export function MergeSwirlFx({ x, y, born, froms }: { x: number; y: number; born: number; froms?: { x: number; y: number }[] }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 40);
    return () => clearInterval(iv);
  }, []);
  const age = Date.now() - born;
  if (age < 0 || age > MERGE_LIFE_MS) return null;
  const p = age / MERGE_LIFE_MS;
  const rot = 270 * p; // xoay tuyen tinh ~270 do trong doi
  const ringScale = 1.25 - 0.45 * p; // ban kinh co dan 1.25 -> 0.8
  const fade = p > 0.8 ? Math.max(0, 1 - (p - 0.8) / 0.2) : 1; // tat dan 20% cuoi
  const R = 32; // ban kinh vong trong Svg 92px (chu vi ~201)
  const CIRC = 2 * Math.PI * R;
  const coreP = p > 0.75 ? (p - 0.75) / 0.25 : 0; // chop loi trang cuoi doi
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, zIndex: 216, alignItems: 'center', justifyContent: 'center' }}>
      {/* Vet sang tu cac ban sao cu bay ve tam: ease-in (nhanh dan), toi tam o ~70% doi roi tan */}
      {(froms ?? []).slice(0, 2).map((f, i) => {
        const fp = Math.min(1, p / 0.7);
        const e = fp * fp; // ease-in bac 2
        const cx = (f.x - x) + (0 - (f.x - x)) * e;
        const cy = (f.y - y) + (0 - (f.y - y)) * e;
        const o = p > 0.7 ? Math.max(0, 1 - (p - 0.7) / 0.15) : 1;
        return (
          <View key={i} style={{ position: 'absolute', left: cx, top: cy, width: 0, height: 0, alignItems: 'center', justifyContent: 'center', opacity: o }}>
            <View style={{ position: 'absolute', left: -9, top: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,214,10,0.35)' }} />
            <View style={{ position: 'absolute', left: -3.5, top: -3.5, width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#ffffff' }} />
          </View>
        );
      })}
      {/* Vong xoay 3 doan cung vang / trang */}
      <View style={{ position: 'absolute', left: -46, top: -46, width: 92, height: 92, opacity: 0.95 * fade, transform: [{ rotate: rot + 'deg' }, { scale: ringScale }] }}>
        <Svg width={92} height={92}>
          {[0, 1, 2].map(i => (
            <Circle key={i} cx="46" cy="46" r={R} fill="none" stroke={i === 1 ? '#ffffff' : '#ffd60a'} strokeWidth={i === 1 ? 3 : 4} strokeLinecap="round" strokeDasharray={`${CIRC * 0.22} ${CIRC * 0.78}`} strokeDashoffset={-i * (CIRC / 3)} />
          ))}
        </Svg>
      </View>
      {/* Chop loi trang nho tai tam o cuoi doi */}
      {p > 0.75 && (
        <View style={{ position: 'absolute', left: -9, top: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: '#ffffff', opacity: 0.9 * (1 - coreP), transform: [{ scale: 1.15 - 0.45 * coreP }] }} />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// ItemRewardPopup: the nhan trang bi kieu gacha (song ~2300ms, cha tu go)
// ---------------------------------------------------------------------------
const ITEM_POPUP_LIFE_MS = 2300;

export function ItemRewardPopup({ name, desc, color, born }: { name: string; desc: string; color: string; born: number }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 40);
    return () => clearInterval(iv);
  }, []);
  const age = Date.now() - born;
  if (age < 0 || age > ITEM_POPUP_LIFE_MS) return null;
  // Nay vao kieu gacha theo bac: 0.6 -> 1.08 (180ms, ease-out) -> 1 (300ms)
  let scale = 1;
  if (age < 180) { const u = age / 180; const e = 1 - (1 - u) * (1 - u); scale = 0.6 + 0.48 * e; }
  else if (age < 300) { const u = (age - 180) / 120; scale = 1.08 - 0.08 * u * u; }
  const opacity = age > 1900 ? Math.max(0, 1 - (age - 1900) / 400) : 1;
  const burstP = Math.min(1, age / 300); // vong sang bung sau the trong 300ms dau
  return (
    <View pointerEvents="none" style={{ width: 168, alignItems: 'center', justifyContent: 'center', opacity, transform: [{ scale }] }}>
      {age < 300 && (
        <View style={{ position: 'absolute', left: 84 - 55, top: 34, width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: color, opacity: 0.85 * (1 - burstP), transform: [{ scale: 0.65 + 0.85 * burstP }] }} />
      )}
      <View style={{ width: 168, alignItems: 'center', backgroundColor: 'rgba(16,20,40,0.92)', borderWidth: 2, borderColor: color, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, shadowColor: color, shadowOpacity: 0.9, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 8 }}>
        <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: '#ffd60a', textAlign: 'center' }}>TRANG BỊ MỚI!</Text>
        <View style={{ marginTop: 6 }}>
          <ItemArt color={color} size={44} />
        </View>
        <Text style={{ marginTop: 6, fontSize: 14, fontWeight: '800', color: '#ffffff', textAlign: 'center' }}>{name}</Text>
        <Text style={{ marginTop: 2, fontSize: 11, color: '#cfd6ff', textAlign: 'center' }}>{desc}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// LevelPillarFx: cot sang doc khi linh thu / nguoi choi len cap (song ~900ms)
// ---------------------------------------------------------------------------
const PILLAR_LIFE_MS = 900;

export function LevelPillarFx({ x, y, born, height = 120 }: { x: number; y: number; born: number; height?: number }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 45);
    return () => clearInterval(iv);
  }, []);
  const age = Date.now() - born;
  if (age < 0 || age > PILLAR_LIFE_MS) return null;
  const p = age / PILLAR_LIFE_MS;
  const grow = Math.min(1, age / 250); // phong len trong 250ms dau
  const growEase = 1 - (1 - grow) * (1 - grow);
  const fade = p > 0.6 ? Math.max(0, 1 - (p - 0.6) / 0.4) : 1;
  const h = Math.max(8, height * growEase);
  const w = 26 * (0.7 + 0.45 * growEase) + 5 * Math.sin(p * Math.PI); // phong ngang roi thu lai
  const coreW = w * 0.42;
  const gid = 'pillar' + born + '-' + Math.round(x) + '-' + Math.round(y); // id gradient rieng tung cot, tranh trung id khi nhieu cot cung luc
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, zIndex: 214 }}>
      {/* Cot sang chinh: gradient trang -> vang, trong suot 2 dau (Svg) */}
      <Svg width={w} height={h} style={{ position: 'absolute', left: -w / 2, top: -h } as any}>
        <Defs>
          <LinearGradient id={gid + "Grad"} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="0" />
            <Stop offset="0.35" stopColor="#ffe9a8" stopOpacity="0.55" />
            <Stop offset="0.75" stopColor="#ffd60a" stopOpacity="0.8" />
            <Stop offset="1" stopColor="#ffd60a" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={w} height={h} fill={"url(#" + gid + "Grad)"} opacity={fade} />
      </Svg>
      {/* Loi cot hep, sang hon o giua */}
      <Svg width={coreW} height={h} style={{ position: 'absolute', left: -coreW / 2, top: -h } as any}>
        <Defs>
          <LinearGradient id={gid + "Core"} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="0" />
            <Stop offset="0.5" stopColor="#ffffff" stopOpacity="0.85" />
            <Stop offset="1" stopColor="#fff3b0" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={coreW} height={h} fill={"url(#" + gid + "Core)"} opacity={fade} />
      </Svg>
      {/* Sang nen o chan cot */}
      <Svg width={64} height={20} style={{ position: 'absolute', left: -32, top: -9 } as any}>
        <Ellipse cx="32" cy="10" rx="30" ry="8" fill="#ffd60a" opacity={0.35 * fade * growEase} />
        <Ellipse cx="32" cy="10" rx="16" ry="4.5" fill="#fff3b0" opacity={0.5 * fade * growEase} />
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------------------
// PowFx: cum no truyen tranh khi don MANH trung (song ~260ms) — may trang vien
// den + 5 speed lines toa ra tu tam. Scale nay vao roi thu lai, mo o cuoi doi.
// ---------------------------------------------------------------------------
const POW_LIFE_MS = 260;

export function PowFx({ x, y, born }: { x: number; y: number; born: number }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 40);
    return () => clearInterval(iv);
  }, []);
  const age = Date.now() - born;
  if (age < 0 || age > POW_LIFE_MS) return null;
  const p = age / POW_LIFE_MS;
  const scale = p < 0.45 ? 0.55 + 0.6 * (p / 0.45) : 1.15 - 0.15 * ((p - 0.45) / 0.55);
  const opacity = p > 0.75 ? Math.max(0, 1 - (p - 0.75) / 0.25) : 1;
  const angles = [-52, -26, 0, 26, 52];
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, zIndex: 218, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', left: -44, top: -33, width: 88, height: 66, opacity, transform: [{ scale }] }}>
        <Svg width={88} height={66} viewBox="0 0 88 66">
          {angles.map((deg, i) => {
            const a = (deg * Math.PI) / 180;
            const r0 = 17, r1 = 36 + (i % 2) * 7;
            const x1 = 44 + Math.cos(a) * r0, y1 = 33 + Math.sin(a) * r0;
            const x2 = 44 + Math.cos(a) * r1, y2 = 33 + Math.sin(a) * r1;
            return (
              <React.Fragment key={i}>
                <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#14100a" strokeWidth={3.6} strokeLinecap="round" />
                <Line x1={44 + Math.cos(a) * (r0 + 2)} y1={33 + Math.sin(a) * (r0 + 2)} x2={44 + Math.cos(a) * (r1 - 3)} y2={33 + Math.sin(a) * (r1 - 3)} stroke="#ffffff" strokeWidth={1.6} strokeLinecap="round" />
              </React.Fragment>
            );
          })}
          <Path d="M20 48 a9.5 9.5 0 1 1 2.5,-18.6 A13.5 13.5 0 0 1 47 22 a11.5 11.5 0 0 1 18.5 8.6 A9 9 0 1 1 63 48 Z" fill="#ffffff" stroke="#14100a" strokeWidth={2.2} />
        </Svg>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// BeamFx: tia nang luong 3 lop (song ~280ms) — lop mo 16px / lop mau 8px /
// loi trang 3px, hao quang xoay o nguon ban + 6 hat tan doc tia (tat dinh).
// ---------------------------------------------------------------------------
const BEAM_LIFE_MS = 280;

export function BeamFx({ x1, y1, x2, y2, color, born }: { x1: number; y1: number; x2: number; y2: number; color: string; born: number }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 40);
    return () => clearInterval(iv);
  }, []);
  const age = Date.now() - born;
  if (age < 0 || age > BEAM_LIFE_MS) return null;
  const p = age / BEAM_LIFE_MS;
  const fade = age > 190 ? Math.max(0, 1 - (age - 190) / 90) : 1;
  const rot = p * 270;
  const len = Math.max(1, Math.hypot(x2 - x1, y2 - y1));
  const px = (-(y2 - y1) / len), py = ((x2 - x1) / len);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 214 }}>
      <Svg width="100%" height="100%">
        <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={16} strokeLinecap="round" opacity={0.35 * fade} />
        <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={8} strokeLinecap="round" opacity={0.9 * fade} />
        <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeWidth={3} strokeLinecap="round" opacity={fade} />
        <Circle cx={x1} cy={y1} r={14} fill="none" stroke={color} strokeWidth={3} strokeDasharray="15 73" strokeLinecap="round" opacity={fade} transform={'rotate(' + rot + ' ' + x1 + ' ' + y1 + ')'} />
        <Circle cx={x1} cy={y1} r={9} fill="none" stroke="#ffffff" strokeWidth={2} strokeDasharray="10 47" strokeLinecap="round" opacity={0.85 * fade} transform={'rotate(' + (-rot * 1.3) + ' ' + x1 + ' ' + y1 + ')'} />
        {Array.from({ length: 6 }).map((_, i) => {
          const f = (i + 1) / 7;
          const off = Math.sin(i * 2.3 + 1) * 11 * (1 - p * 0.5);
          const cx = x1 + (x2 - x1) * f + px * off;
          const cy = y1 + (y2 - y1) * f + py * off;
          return <Circle key={i} cx={cx} cy={cy} r={i % 2 === 0 ? 2.6 : 1.8} fill={i % 2 === 0 ? '#ffffff' : color} opacity={fade} />;
        })}
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------------------
// AnnouncerFx: chu ho ket qua lon o giua san (song ~1400ms) — nay vao
// 0.5 -> 1.15 (200ms) -> 1, giu toi ~900ms roi mo dan. Vien den gia lap bang
// 4 ban sao lech huong phia sau chu chinh (RN chi co 1 textShadow).
// ---------------------------------------------------------------------------
const ANNOUNCER_LIFE_MS = 1400;

export function AnnouncerFx({ text, color, born }: { text: string; color: string; born: number }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 40);
    return () => clearInterval(iv);
  }, []);
  const age = Date.now() - born;
  if (age < 0 || age > ANNOUNCER_LIFE_MS) return null;
  let scale = 1;
  if (age < 200) scale = 0.5 + 0.65 * (age / 200);
  else if (age < 340) scale = 1.15 - 0.15 * ((age - 200) / 140);
  const opacity = age > 900 ? Math.max(0, 1 - (age - 900) / 500) : 1;
  const outline: [number, number][] = [[-2, 0], [2, 0], [0, -2], [0, 2]];
  const base = { fontSize: 44, fontWeight: '900' as const, letterSpacing: 2, textAlign: 'center' as const };
  return (
    <View pointerEvents="none" style={{ alignItems: 'center', justifyContent: 'center', opacity, transform: [{ scale }] }}>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {outline.map(([dx, dy], i) => (
          <Text key={i} style={{ ...base, position: 'absolute', left: dx, top: dy, color: '#14100a' }}>{text}</Text>
        ))}
        <Text style={{ ...base, color, textShadowColor: 'rgba(0,0,0,0.85)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 }}>{text}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ShakeWrap: boc san khau — rung nhe ±4px trong ~220ms tu moc `born`
// (0 = khong rung). Chi chay interval khi dang rung, khong re-render thua.
// ---------------------------------------------------------------------------
export function ShakeWrap({ born, style, children }: { born: number; style?: any; children: React.ReactNode }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!born) return;
    const iv = setInterval(() => setTick(t => t + 1), 40);
    const tm = setTimeout(() => { clearInterval(iv); setTick(t => t + 1); }, 300);
    return () => { clearInterval(iv); clearTimeout(tm); };
  }, [born]);
  void tick;
  const age = born ? Date.now() - born : 9999;
  let tx = 0, ty = 0;
  if (born && age >= 0 && age < 220) {
    const decay = 1 - age / 220;
    tx = Math.sin(age / 28) * 4 * decay;
    ty = Math.cos(age / 34) * 3 * decay;
  }
  return (
    <View style={[style, tx !== 0 || ty !== 0 ? { transform: [{ translateX: tx }, { translateY: ty }] } : undefined]}>
      {children}
    </View>
  );
}
