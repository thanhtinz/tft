// Hieu ung KINH TE / SAN KHAU tu chua (state + interval rieng, pointerEvents="none").
// Moi component tinh tien trinh thuan tu `born` (Date.now() luc sinh) nhu FxLayer trong
// GameScreen, dung 1 interval 40-50ms/component. Toa do: px tuyet doi trong he toa do arena
// (cung he voi FxLayer / hexCenter cua GameScreen). Noi gan tu don mang sau khi het tuoi.
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Rect, Stop } from 'react-native-svg';

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
