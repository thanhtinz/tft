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
  let tx = 0, ty = 0, rot = 0, sc = 1, sy = 1, opacity = 1, flash = 0, glow = 0;
  const dir = flip ? -1 : 1;
  if (state === 'idle') { const p = Math.sin(t / 340); sy = 1 + 0.022 * p; sc = 1 - 0.008 * p; ty = -s * 0.012 * (0.5 + 0.5 * p); }
  else if (state === 'walk') { const p = Math.sin(t / 110); ty = -Math.abs(p) * s * 0.045; rot = 3.2 * Math.sin(t / 110); sy = 1 + 0.03 * Math.abs(p); }
  else if (state === 'attack') { const p = (t % 620) / 620; const lunge = Math.sin(Math.PI * Math.min(1, p * 1.7)); tx = dir * s * 0.13 * lunge; rot = dir * 7 * lunge; ty = -s * 0.02 * lunge; }
  else if (state === 'cast') { const p = Math.sin(Math.min(1, t / 450) * Math.PI); ty = -s * 0.05 * p; sc = 1 + 0.05 * p; sy = 1 + 0.05 * p; glow = p; }
  else if (state === 'hurt') { const decay = Math.max(0, 1 - t / 380); tx = Math.sin(t / 26) * s * 0.045 * decay; rot = Math.sin(t / 26) * 4 * decay; flash = 0.75 * decay; }
  else if (state === 'death') { const p = Math.min(1, t / 650); rot = dir * 84 * p; opacity = 1 - p; ty = s * 0.1 * p; }
  else if (state === 'victory') { const p = Math.abs(Math.sin(t / 170)); ty = -p * s * 0.085; sy = 1 + 0.03 * p; }
  void tick;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'flex-end' }} pointerEvents="none">
      {glow > 0 && (<View style={{ position: 'absolute', bottom: s * 0.02, width: s * 0.8, height: s * 0.22, borderRadius: 999, borderWidth: 3, borderColor: '#ffd60a', opacity: glow * 0.9, transform: [{ scaleX: 0.7 + glow * 0.5 }] }} />)}
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
