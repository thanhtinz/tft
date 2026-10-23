import React, { useEffect, useRef, useState } from 'react';
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';
import type { ArtSpec } from './ChibiArt';
import { BONES, BoneName, ClipName, getBoneTransforms, svgTransform } from '../game/rig';
// CHIBI RIG kieu Spine (tu xay): moi nhan vat = cac manh ve SVG gan vao xuong.
// Component tu chay dong ho rieng (interval 70ms) va chi re-render chinh no,
// khong re-render ca ban co. Trang thai clip do battle engine quyet dinh.
const skin = '#ffe3c2';
const pivot = (n: BoneName) => BONES.find(b => b.name===n)!;
export default function ChibiRig({ spec, size = 84, state = 'idle', star = 1, flip = false, speed = 1 }: { spec: ArtSpec; size?: number; state?: ClipName; star?: number; flip?: boolean; speed?: number }) {
  const [now, setNow] = useState(0); const startRef = useRef(Date.now());
  useEffect(() => { startRef.current = Date.now(); }, [state]);
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 70); return () => clearInterval(iv); }, []);
  const t = (now - startRef.current) * speed;
  const tr = getBoneTransforms(state, Math.max(0, t));
  const T = (n: BoneName) => svgTransform(tr[n], pivot(n).pivotX, pivot(n).pivotY);
  const c = spec.color, h = spec.hair;
  const bob = tr.root.y;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" style={flip ? { transform: [{ scaleX: -1 }] } as any : undefined}>
      <Ellipse cx="60" cy="108" rx={24 - bob*1.4} ry="5.5" fill="#000" opacity={0.16 + bob*0.008}/>
      <G transform={T('root')} opacity={tr.root.o}>
        <G transform={T('accessory')}><BackPart spec={spec}/></G>
        <G transform={T('legL')}><Rect x="48" y="92" width="9" height="13" rx="4" fill={skin}/><Ellipse cx="51" cy="106" rx="8" ry="4" fill="#5b3a29"/></G>
        <G transform={T('legR')}><Rect x="63" y="92" width="9" height="13" rx="4" fill={skin}/><Ellipse cx="69" cy="106" rx="8" ry="4" fill="#5b3a29"/></G>
        <G transform={T('torso')}>
          <Path d="M38 78 Q60 68 82 78 L86 100 Q60 108 34 100 Z" fill={c}/>
          <Path d="M34 100 Q60 108 86 100 L88 105 Q60 112 32 105 Z" fill="#ffffff" opacity="0.55"/>
          <Polygon points="52,74 68,74 60,86" fill="#ffffff"/><Circle cx="60" cy="90" r="2.2" fill="#fff"/><Circle cx="60" cy="96" r="2.2" fill="#fff"/>
          <Path d="M40 76 L80 76" stroke={h} strokeWidth="2" opacity="0.5"/>
        </G>
        <G transform={T('armL')}><Path d="M38 80 Q26 86 28 96" stroke={skin} strokeWidth="8" fill="none" strokeLinecap="round"/></G>
        <G transform={T('armR')}><Path d="M82 80 Q94 84 92 94" stroke={skin} strokeWidth="8" fill="none" strokeLinecap="round"/><WeaponPart spec={spec}/></G>
        <G transform={T('weaponFx')} opacity={tr.weaponFx.o}><Circle cx="97" cy="58" r="15" fill="#ffd60a" opacity="0.35"/><Polygon points="97,40 100,52 112,52 102,59 106,71 97,64 88,71 92,59 82,52 94,52" fill="#ffd60a" opacity="0.85"/></G>
        <G transform={T('head')}>
          <Circle cx="60" cy="44" r="30" fill={skin}/>
          <Path d="M30 46 Q27 14 60 13 Q93 14 90 46 Q84 26 70 28 Q76 17 62 24 Q50 15 44 28 Q34 28 30 46Z" fill={h}/>
          <FrontAccessory spec={spec}/>
          <Ellipse cx="39" cy="58" rx="6" ry="3.5" fill="#ff9eb5" opacity="0.8"/><Ellipse cx="81" cy="58" rx="6" ry="3.5" fill="#ff9eb5" opacity="0.8"/>
          <Path d="M54 59 Q60 65 66 59" stroke="#b3543f" strokeWidth="2" fill="none" strokeLinecap="round"/>
          <G transform={T('eyes')}>
            <Ellipse cx="48" cy="48" rx="5.5" ry="7" fill="#2b2118"/><Ellipse cx="72" cy="48" rx="5.5" ry="7" fill="#2b2118"/>
            <Circle cx="50" cy="45" r="2.2" fill="#fff"/><Circle cx="74" cy="45" r="2.2" fill="#fff"/>
          </G>
          <Path d="M42 37 Q48 34 54 37" stroke="#2b2118" strokeWidth="1.6" fill="none" strokeLinecap="round"/><Path d="M66 37 Q72 34 78 37" stroke="#2b2118" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
        </G>
        {star>=2 && <Polygon points="60,2 62.5,7.5 68,8 64,11.5 65,17 60,14.5 55,17 56,11.5 52,8 57.5,7.5" fill="#ffb703"/>}
      </G>
    </Svg>
  );
}
function BackPart({ spec }: { spec: ArtSpec }) {
  const h = spec.hair;
  if (spec.accessory==='canh' || spec.accessory==='canh-tien') return (<G><Path d="M34 70 Q10 58 16 38 Q30 44 36 56Z" fill="#fff" opacity="0.92"/><Path d="M86 70 Q110 58 104 38 Q90 44 84 56Z" fill="#fff" opacity="0.92"/></G>);
  if (spec.accessory==='canh-lua') return (<G><Path d="M34 72 Q6 60 14 34 Q28 40 38 54 Q30 50 26 58 Q32 62 34 72Z" fill="#fb8500"/><Path d="M86 72 Q114 60 106 34 Q92 40 82 54 Q90 50 94 58 Q88 62 86 72Z" fill="#fb8500"/></G>);
  if (spec.accessory==='duoi') return (<Path d="M86 92 Q106 88 102 68" stroke={h} strokeWidth="7" fill="none" strokeLinecap="round"/>);
  if (spec.accessory==='mai-rua') return (<Ellipse cx="60" cy="88" rx="30" ry="16" fill="#2a9d8f"/>);
  return null;
}
function FrontAccessory({ spec }: { spec: ArtSpec }) {
  const h = spec.hair, c = spec.color; const a = spec.accessory;
  if (a==='tai-meo') return (<G><Polygon points="36,22 30,4 48,12" fill={h}/><Polygon points="84,22 90,4 72,12" fill={h}/><Polygon points="37,19 34,9 44,13" fill="#ffd6e0"/><Polygon points="83,19 86,9 76,13" fill="#ffd6e0"/></G>);
  if (a==='tai-gau') return (<G><Circle cx="36" cy="18" r="9" fill={h}/><Circle cx="84" cy="18" r="9" fill={h}/><Circle cx="36" cy="18" r="4.5" fill="#ffe3c2"/><Circle cx="84" cy="18" r="4.5" fill="#ffe3c2"/></G>);
  if (a==='tai-tho') return (<G><Ellipse cx="44" cy="2" rx="6" ry="13" fill={h}/><Ellipse cx="76" cy="2" rx="6" ry="13" fill={h}/><Ellipse cx="44" cy="4" rx="3" ry="8" fill="#ffd6e0"/><Ellipse cx="76" cy="4" rx="3" ry="8" fill="#ffd6e0"/></G>);
  if (a==='tai-cao' || a==='tai-goblin' || a==='tai-soi') return (<G><Polygon points="32,26 18,10 40,14" fill={h}/><Polygon points="88,26 102,10 80,14" fill={h}/></G>);
  if (a==='mu-phuthuy') return (<G><Polygon points="60,-8 38,26 82,26" fill={h}/><Ellipse cx="60" cy="27" rx="26" ry="5" fill={h}/><Rect x="48" y="20" width="24" height="5" fill="#ffd60a"/></G>);
  if (a==='mu-he') return (<G><Path d="M38 24 Q44 6 52 20" stroke={h} strokeWidth="6" fill="none"/><Path d="M82 24 Q76 6 68 20" stroke="#ffd60a" strokeWidth="6" fill="none"/><Circle cx="52" cy="8" r="4" fill="#ef476f"/><Circle cx="68" cy="8" r="4" fill="#48cae4"/></G>);
  if (a==='vuong-mien') return (<G><Polygon points="44,16 48,4 56,12 60,2 64,12 72,4 76,16" fill="#ffd60a" stroke="#e0a800" strokeWidth="1.5"/><Circle cx="60" cy="11" r="2.5" fill="#ef476f"/></G>);
  if (a==='sung' || a==='sung-da') return (<G><Path d="M40 16 Q34 2 46 6 Q44 12 46 16Z" fill={h}/><Path d="M80 16 Q86 2 74 6 Q76 12 74 16Z" fill={h}/></G>);
  if (a==='angten') return (<G><Path d="M60 14 L60 2" stroke="#6c757d" strokeWidth="3"/><Circle cx="60" cy="3" r="4" fill="#ef476f"/></G>);
  if (a==='mu-sat') return (<G><Path d="M32 30 Q60 8 88 30 L88 22 Q60 2 32 22Z" fill="#adb5bd"/><Rect x="58" y="6" width="4" height="12" fill="#ef476f"/></G>);
  if (a==='mu-vu-tru') return (<Circle cx="60" cy="42" r="34" fill="#bde0fe" opacity="0.35"/>);
  if (a==='trang') return (<Path d="M84 8 Q96 18 86 28 Q98 24 94 10 Q92 2 84 8Z" fill="#ffd60a"/>);
  if (a==='tia-set') return (<Polygon points="86,0 76,15 83,15 74,27 92,11 84,11" fill="#ffd60a"/>);
  if (a==='xuc-tu') return (<G><Path d="M38 20 Q34 34 38 40" stroke={h} strokeWidth="5" fill="none" strokeLinecap="round"/><Path d="M82 20 Q86 34 82 40" stroke={h} strokeWidth="5" fill="none" strokeLinecap="round"/></G>);
  if (a==='mo-vit') return (<Ellipse cx="60" cy="57" rx="8" ry="4.5" fill="#fb8500"/>);
  if (a==='khan') return (<Path d="M32 64 Q60 76 88 64 L88 72 Q60 84 32 72Z" fill="#212529"/>);
  if (a==='mu-nam') return (<G><Path d="M28 26 Q60 -4 92 26 Q60 34 28 26Z" fill="#e85d04"/><Circle cx="48" cy="12" r="5" fill="#fff"/><Circle cx="70" cy="8" r="4" fill="#fff"/></G>);
  if (a==='vong') return (<Circle cx="60" cy="13" r="9" fill="none" stroke="#ffd60a" strokeWidth="3"/>);
  return (<G><Circle cx="84" cy="18" r="6" fill={c}/><Circle cx="84" cy="18" r="2.5" fill="#fff"/></G>);
}
function WeaponPart({ spec }: { spec: ArtSpec }) {
  const w = spec.weapon;
  if (w==='kiem' || w==='kiem-vang') return (<G><Rect x="90" y="62" width="5" height="26" rx="2" fill="#ced4da" transform="rotate(-24 92 75)"/><Polygon points="98,58 104,44 108,60" fill="#e9ecef"/><Rect x="86" y="84" width="12" height="4" rx="2" fill={w==='kiem-vang'?'#ffd60a':'#795548'}/></G>);
  if (w==='khien') return (<G><Path d="M86 62 Q98 57 106 63 L106 80 Q98 90 86 80Z" fill="#f4a261" stroke="#c97b2d" strokeWidth="2"/><Circle cx="96" cy="71" r="4" fill="#ffd60a"/></G>);
  if (w==='gay-phep' || w==='dua-than' || w==='gay-keo') return (<G><Rect x="90" y="58" width="5" height="34" rx="2" fill="#7b5ea7" transform="rotate(-18 92 75)"/><Polygon points="96,42 99,52 109,52 101,58 104,68 96,62 88,68 91,58 83,52 93,52" fill="#ffd60a"/></G>);
  if (w==='cung' || w==='cung-trang') return (<G><Path d="M100 50 Q114 72 100 98" stroke="#795548" strokeWidth="4" fill="none"/><Path d="M100 50 L100 98" stroke="#fff" strokeWidth="1.5"/><Rect x="96" y="72" width="18" height="3" fill="#adb5bd"/></G>);
  if (w==='sach') return (<G><Rect x="86" y="64" width="24" height="18" rx="2" fill="#5a189a"/><Rect x="89" y="67" width="18" height="12" fill="#fff"/></G>);
  if (w==='dao') return (<G><Polygon points="94,64 108,52 106,70" fill="#dee2e6"/></G>);
  if (w==='bua') return (<G><Rect x="96" y="54" width="5" height="34" fill="#795548" transform="rotate(-16 98 71)"/><Rect x="84" y="44" width="26" height="14" rx="4" fill="#adb5bd"/></G>);
  if (w==='carot') return (<G><Polygon points="96,62 106,62 101,86" fill="#fb8500"/><Path d="M101 62 Q96 50 90 52 M101 62 Q102 48 110 50" stroke="#38b000" strokeWidth="3" fill="none"/></G>);
  if (w==='lua' || w==='lua-phuong') return (<G><Path d="M94 60 Q106 72 96 88 Q86 74 94 60Z" fill="#fb8500"/><Path d="M95 70 Q101 77 95 84 Q90 76 95 70Z" fill="#ffd60a"/></G>);
  if (w==='bong' || w==='bong-bong') return (<G><Circle cx="98" cy="64" r="11" fill="#a2d2ff" opacity="0.78"/><Circle cx="94" cy="60" r="3.5" fill="#fff"/></G>);
  if (w==='quat') return (<G><Polygon points="92,82 98,56 114,62 106,82" fill="#ff8fab"/></G>);
  if (w==='chuong') return (<G><Path d="M88 76 Q88 60 99 60 Q110 60 110 76 Q110 82 99 82 Q88 82 88 76Z" fill="#ffd60a"/></G>);
  return (<G><Circle cx="98" cy="68" r="8" fill={spec.color} stroke="#fff" strokeWidth="2"/></G>);
}
