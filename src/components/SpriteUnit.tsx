import React, { useEffect, useRef, useState } from 'react';
import { Image, View } from 'react-native';
import { SCENE_ART, UNIT_ART } from '../game/artManifest';
import type { ClipName } from '../game/rig';
// SPRITE RASTER: nhan vat la tranh splash art that (assets/art/units/<id>.webp,
// giai ma tu .b64 boi scripts/decode-art.mjs). Animation CAP SPRITE theo dung
// state machine cua rig cu (stateForUnit trong game/rig.ts): idle tho + bob,
// walk nhun + nghieng, attack lao ve phia muc tieu, cast nhun len + vong sang,
// hurt rung + flash trang, death xoay nga + mo dan, victory nhay an mung.
// Component tu chay dong ho rieng (50ms) va chi re-render chinh no.
interface SpecLike { id: string }
interface Props { spec?: SpecLike; artId?: string; size?: number; state?: ClipName; star?: number; flip?: boolean; speed?: number }
export default function SpriteUnit({ spec, artId, size = 84, state = 'idle', flip = false, speed = 1 }: Props) {
  const id = artId ?? spec?.id ?? 'slime';
  const src = UNIT_ART[id] ?? UNIT_ART['slime'];
  const [tick, setTick] = useState(0);
  const startRef = useRef(Date.now());
  const prevState = useRef(state);
  if (prevState.current !== state) { prevState.current = state; startRef.current = Date.now(); }
  useEffect(() => { const iv = setInterval(() => setTick(t => t + 1), 50); return () => clearInterval(iv); }, []);
  const t = (Date.now() - startRef.current) * speed;
  const s = size;
  let tx = 0, ty = 0, rot = 0, sc = 1, sy = 1, opacity = 1, flash = 0, glow = 0, glowScale = 0.7;
  const dir = flip ? -1 : 1;
  // Lech pha theo id: hash co trong so theo vi tri ky tu -> phase trong [0, 2PI)
  const seed = id.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0);
  const phase = (seed % 628) / 100;
  const range = (spec as any)?.range;
  const isRanged = typeof range === 'number' && range > 1;
  if (state === 'idle') { const p = Math.sin(t / 340 + phase); sy = 1 + 0.022 * p; sc = 1 - 0.008 * p; ty = -s * 0.012 * (0.5 + 0.5 * p); }
  else if (state === 'walk') { const p = Math.sin(t / 110 + phase); ty = -Math.abs(p) * s * 0.045; rot = dir * 4.5 + 5.2 * Math.sin(t / 110 + phase); sy = 1 + 0.03 * Math.abs(p); }
  else if (state === 'attack') {
    const p = (t % 620) / 620;
    if (!isRanged) {
      // Can chien, don luc 2 nhip: lui lay da -> lao toi -> hoi ve
      if (p < 0.3) { const u = p / 0.3; const e = Math.sin(u * Math.PI / 2); tx = dir * s * -0.07 * e; sy = 1 - 0.06 * e; sc = 1 + 0.015 * e; rot = dir * -3.5 * e; ty = s * 0.012 * e; }
      else if (p < 0.5) { const u = (p - 0.3) / 0.2; const e = 1 - (1 - u) * (1 - u); tx = dir * s * (-0.07 + 0.24 * e); sy = 0.94 + 0.10 * e; sc = 1.015 - 0.015 * e; rot = dir * (-3.5 + 13.5 * e); ty = s * 0.012 * (1 - e) - s * 0.02 * e; }
      else { const u = (p - 0.5) / 0.5; const f = Math.cos(u * Math.PI / 2); tx = dir * s * 0.17 * f; sy = 1 + 0.04 * f; rot = dir * 10 * f; ty = -s * 0.02 * f; }
    } else {
      // Danh xa: giat nong lui nhanh -> nhich toi -> rung nhe giu nhip ban
      if (p < 0.2) { const u = p / 0.2; const e = Math.sin(u * Math.PI / 2); tx = dir * s * -0.05 * e; rot = dir * -4 * e; sy = 1 - 0.02 * e; }
      else if (p < 0.45) { const u = (p - 0.2) / 0.25; const e = Math.sin(u * Math.PI / 2); tx = dir * s * (-0.05 + 0.08 * e); rot = dir * (-4 + 5 * e); sy = 0.98 + 0.02 * e; }
      else { const u = (p - 0.45) / 0.55; tx = dir * s * 0.03 * (1 - u * 0.4) + Math.sin(t / 42) * s * 0.006 * (1 - u); rot = dir * 1 * (1 - u); ty = Math.sin(t / 42) * s * 0.004 * (1 - u); }
    }
  }
  else if (state === 'cast') {
    const q = Math.min(1, t / 450);
    if (q < 0.4) { const u = q / 0.4; const e = Math.sin(u * Math.PI / 2); ty = s * 0.03 * e; sy = 1 - 0.05 * e; sc = 1 + 0.01 * e; glow = 0.35 * e; glowScale = 0.6 + 0.25 * e; }
    else { const u = (q - 0.4) / 0.6; const e = 1 - (1 - u) * (1 - u); ty = s * 0.03 * (1 - e) - s * 0.055 * e; sy = 0.95 + 0.13 * e; sc = 1.01 + 0.07 * e; glow = 0.35 + 0.95 * e; glowScale = 0.85 + 0.95 * e; }
  }
  else if (state === 'hurt') { const decay = Math.max(0, 1 - t / 380); tx = Math.sin(t / 26) * s * 0.045 * decay - dir * s * 0.06 * decay; rot = Math.sin(t / 26) * 4 * decay; flash = 0.75 * decay; }
  else if (state === 'death') { const p = Math.min(1, t / 650); const hop = p >= 0.2 && p <= 0.4 ? -s * 0.055 * Math.sin((p - 0.2) / 0.2 * Math.PI) : 0; rot = dir * 84 * p; opacity = 1 - p; ty = s * 0.1 * p + hop; }
  else if (state === 'victory') { const p = Math.abs(Math.sin(t / 170 + phase)); ty = -p * s * 0.085; sy = 1 + 0.03 * p; }
  void tick;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'flex-end' }} pointerEvents="none">
      {glow > 0 && (<View style={{ position: 'absolute', bottom: s * 0.02, width: s * 0.8, height: s * 0.22, borderRadius: 999, borderWidth: 3, borderColor: '#ffd60a', opacity: Math.min(1, glow * 0.95), transform: [{ scaleX: glowScale }] }} />)}
      <View style={{ width: s, height: s, opacity, transform: [{ translateX: tx }, { translateY: ty }, { rotate: rot + 'deg' }, { scaleX: (flip ? -1 : 1) * sc }, { scaleY: sy }] }}>
        <Image source={src} style={{ width: s, height: s }} resizeMode="contain" />
        {flash > 0.02 && (<Image source={src} style={{ position: 'absolute', left: 0, top: 0, width: s, height: s, opacity: flash, tintColor: '#ffffff' } as any} resizeMode="contain" />)}
      </View>
    </View>
  );
}
// Anh canh raster toan khung (lobby / arena / banner chuong)
export function SceneArtImage({ id, width, height, radius = 0 }: { id: string; width: number; height: number; radius?: number }) {
  const src = SCENE_ART[id];
  if (!src || width <= 0 || height <= 0) return null;
  return (<Image source={src} style={{ position: 'absolute', left: 0, top: 0, width, height, borderRadius: radius } as any} resizeMode="cover" />);
}
