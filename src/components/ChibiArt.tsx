import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, Rect, Stop, Text as SvgText } from 'react-native-svg';
// TRANH VE CHIBI CHI TIET bang SVG vector (khong phai icon):
// moi nhan vat co bong do, chan/giay, trang phuc co hoa tiet, tay, dau to,
// toc, mat to long lanh co diem sang, long may, mieng cuoi, ma hong,
// phu kien rieng (tai meo, sung, mu phu thuy, vuong mien, canh, duoi...)
// va vu khi rieng ve tay. Phong to khong vo net.
export interface ArtSpec { color: string; hair: string; accessory: string; weapon: string; id?: string; }
const skin = '#ffe3c2';
export default function ChibiArt({ spec, size = 84, expr = 'happy', star = 1 }: { spec: ArtSpec; size?: number; expr?: 'happy'|'wow'|'sad'; star?: number }) {
  const gid = (spec.id ?? 'x').replace(/[^a-z0-9]/g, '');
  const c = spec.color, h = spec.hair;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id={'b'+gid} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={c}/><Stop offset="1" stopColor={h}/></LinearGradient>
        <LinearGradient id={'f'+gid} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#fff1d6"/><Stop offset="1" stopColor={skin}/></LinearGradient>
      </Defs>
      <Ellipse cx="60" cy="108" rx="26" ry="6" fill="#000" opacity="0.14"/>
      <BackArt spec={spec}/>
      {/* chan va giay */}
      <Rect x="48" y="94" width="9" height="12" rx="4" fill={skin}/>
      <Rect x="63" y="94" width="9" height="12" rx="4" fill={skin}/>
      <Ellipse cx="51" cy="107" rx="8" ry="4" fill="#5b3a29"/><Ellipse cx="69" cy="107" rx="8" ry="4" fill="#5b3a29"/>
      {/* than: trang phuc co co ao, nut, vay */}
      <Path d="M38 78 Q60 68 82 78 L86 100 Q60 108 34 100 Z" fill={'url(#b'+gid+')'}/>
      <Path d="M34 100 Q60 108 86 100 L88 105 Q60 112 32 105 Z" fill="#ffffff" opacity="0.55"/>
      <Polygon points="52,74 68,74 60,86" fill="#ffffff"/>
      <Circle cx="60" cy="90" r="2.2" fill="#fff"/><Circle cx="60" cy="96" r="2.2" fill="#fff"/>
      {/* tay */}
      <Path d="M38 80 Q26 86 28 96" stroke={skin} strokeWidth="8" fill="none" strokeLinecap="round"/>
      <Path d="M82 80 Q94 84 92 94" stroke={skin} strokeWidth="8" fill="none" strokeLinecap="round"/>
      <WeaponArt spec={spec}/>
      {/* dau to tron */}
      <Circle cx="60" cy="44" r="30" fill={'url(#f'+gid+')'}/>
      {/* toc mai */}
      <Path d="M30 44 Q28 16 60 14 Q92 16 90 44 Q84 26 70 28 Q76 18 62 24 Q50 16 44 28 Q34 28 30 44Z" fill={h}/>
      <AccessoryArt spec={spec}/>
      {/* mat to long lanh */}
      <Ellipse cx="48" cy="48" rx="5.5" ry="7" fill="#2b2118"/><Ellipse cx="72" cy="48" rx="5.5" ry="7" fill="#2b2118"/>
      <Circle cx="50" cy="45" r="2.2" fill="#fff"/><Circle cx="74" cy="45" r="2.2" fill="#fff"/>
      <Circle cx="46.5" cy="51" r="1.1" fill="#fff" opacity="0.8"/><Circle cx="70.5" cy="51" r="1.1" fill="#fff" opacity="0.8"/>
      <Path d="M42 38 Q48 35 54 38" stroke="#2b2118" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
      <Path d="M66 38 Q72 35 78 38" stroke="#2b2118" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
      {/* ma hong + mieng */}
      <Ellipse cx="39" cy="58" rx="6" ry="3.5" fill="#ff9eb5" opacity="0.75"/><Ellipse cx="81" cy="58" rx="6" ry="3.5" fill="#ff9eb5" opacity="0.75"/>
      {expr==='happy' && <Path d="M54 59 Q60 65 66 59" stroke="#b3543f" strokeWidth="2" fill="none" strokeLinecap="round"/>}
      {expr==='wow' && <Ellipse cx="60" cy="61" rx="3.5" ry="4.5" fill="#b3543f"/>}
      {expr==='sad' && <Path d="M54 63 Q60 58 66 63" stroke="#b3543f" strokeWidth="2" fill="none" strokeLinecap="round"/>}
      {star>=2 && <SvgText x="60" y="12" fontSize="10" fill="#ffb703" textAnchor="middle" fontWeight="bold">{star===2?'★★':'★★★'}</SvgText>}
    </Svg>
  );
}
function BackArt({ spec }: { spec: ArtSpec }) {
  const h = spec.hair, c = spec.color;
  if (spec.accessory==='canh' || spec.accessory==='canh-tien') return (<G><Path d="M34 70 Q10 58 16 38 Q30 44 36 56Z" fill="#fff" opacity="0.9"/><Path d="M86 70 Q110 58 104 38 Q90 44 84 56Z" fill="#fff" opacity="0.9"/></G>);
  if (spec.accessory==='canh-lua') return (<G><Path d="M34 72 Q6 60 14 34 Q28 40 38 54 Q30 50 26 58 Q32 62 34 72Z" fill="#fb8500"/><Path d="M86 72 Q114 60 106 34 Q92 40 82 54 Q90 50 94 58 Q88 62 86 72Z" fill="#fb8500"/></G>);
  if (spec.accessory==='duoi') return (<Path d="M86 92 Q106 88 102 68" stroke={h} strokeWidth="7" fill="none" strokeLinecap="round"/>);
  if (spec.accessory==='mai-rua') return (<Ellipse cx="60" cy="88" rx="30" ry="16" fill="#2a9d8f"/>);
  return null;
}
function AccessoryArt({ spec }: { spec: ArtSpec }) {
  const h = spec.hair, c = spec.color; const a = spec.accessory;
  if (a==='tai-meo') return (<G><Polygon points="36,22 30,4 48,12" fill={h}/><Polygon points="84,22 90,4 72,12" fill={h}/><Polygon points="37,19 34,9 44,13" fill="#ffd6e0"/><Polygon points="83,19 86,9 76,13" fill="#ffd6e0"/></G>);
  if (a==='tai-gau') return (<G><Circle cx="36" cy="18" r="9" fill={h}/><Circle cx="84" cy="18" r="9" fill={h}/><Circle cx="36" cy="18" r="4.5" fill="#ffe3c2"/><Circle cx="84" cy="18" r="4.5" fill="#ffe3c2"/></G>);
  if (a==='tai-tho') return (<G><Ellipse cx="44" cy="4" rx="6" ry="14" fill={h}/><Ellipse cx="76" cy="4" rx="6" ry="14" fill={h}/><Ellipse cx="44" cy="6" rx="3" ry="9" fill="#ffd6e0"/><Ellipse cx="76" cy="6" rx="3" ry="9" fill="#ffd6e0"/></G>);
  if (a==='tai-cao' || a==='tai-goblin' || a==='tai-soi') return (<G><Polygon points="32,26 18,10 40,14" fill={h}/><Polygon points="88,26 102,10 80,14" fill={h}/></G>);
  if (a==='mu-phuthuy') return (<G><Polygon points="60,-6 38,26 82,26" fill={h}/><Ellipse cx="60" cy="27" rx="26" ry="5" fill={h}/><Rect x="48" y="20" width="24" height="5" fill="#ffd60a"/></G>);
  if (a==='mu-he') return (<G><Path d="M38 24 Q44 6 52 20" stroke={h} strokeWidth="6" fill="none"/><Path d="M82 24 Q76 6 68 20" stroke="#ffd60a" strokeWidth="6" fill="none"/><Circle cx="52" cy="8" r="4" fill="#ef476f"/><Circle cx="68" cy="8" r="4" fill="#48cae4"/></G>);
  if (a==='vuong-mien') return (<G><Polygon points="44,16 48,4 56,12 60,2 64,12 72,4 76,16" fill="#ffd60a" stroke="#e0a800" strokeWidth="1.5"/><Circle cx="60" cy="11" r="2.5" fill="#ef476f"/></G>);
  if (a==='sung' || a==='sung-da') return (<G><Path d="M40 16 Q34 2 46 6 Q44 12 46 16Z" fill={h}/><Path d="M80 16 Q86 2 74 6 Q76 12 74 16Z" fill={h}/></G>);
  if (a==='angten') return (<G><Path d="M60 14 L60 2" stroke="#6c757d" strokeWidth="3"/><Circle cx="60" cy="3" r="4" fill="#ef476f"/><Rect x="30" y="30" width="6" height="14" rx="3" fill="#adb5bd"/><Rect x="84" y="30" width="6" height="14" rx="3" fill="#adb5bd"/></G>);
  if (a==='mu-sat') return (<G><Path d="M32 30 Q60 8 88 30 L88 22 Q60 2 32 22Z" fill="#adb5bd"/><Rect x="58" y="6" width="4" height="12" fill="#ef476f"/></G>);
  if (a==='mu-vu-tru') return (<Circle cx="60" cy="42" r="34" fill="#bde0fe" opacity="0.35"/>);
  if (a==='trang') return (<Path d="M84 8 Q96 18 86 28 Q98 24 94 10 Q92 2 84 8Z" fill="#ffd60a"/>);
  if (a==='tia-set') return (<Polygon points="86,2 76,16 83,16 74,28 92,12 84,12" fill="#ffd60a"/>);
  if (a==='xuc-tu') return (<G><Path d="M38 20 Q34 34 38 40" stroke={h} strokeWidth="5" fill="none" strokeLinecap="round"/><Path d="M82 20 Q86 34 82 40" stroke={h} strokeWidth="5" fill="none" strokeLinecap="round"/><Circle cx="46" cy="14" r="5" fill={c}/><Circle cx="74" cy="14" r="5" fill={c}/></G>);
  if (a==='mo-vit') return (<Ellipse cx="60" cy="56" rx="8" ry="4.5" fill="#fb8500"/>);
  if (a==='khan') return (<Path d="M32 62 Q60 74 88 62 L88 70 Q60 82 32 70Z" fill="#212529"/>);
  if (a==='mu-nam') return (<G><Path d="M28 26 Q60 -4 92 26 Q60 34 28 26Z" fill="#e85d04"/><Circle cx="48" cy="12" r="5" fill="#fff"/><Circle cx="70" cy="8" r="4" fill="#fff"/></G>);
  if (a==='mu-xuong') return (<G><Circle cx="46" cy="40" r="7" fill="#212529"/><Circle cx="74" cy="40" r="7" fill="#212529"/></G>);
  if (a==='vong') return (<Circle cx="60" cy="16" r="9" fill="none" stroke="#ffd60a" strokeWidth="3"/>);
  return (<G><Circle cx="84" cy="18" r="6" fill={c}/><Circle cx="84" cy="18" r="2.5" fill="#fff"/></G>);
}
function WeaponArt({ spec }: { spec: ArtSpec }) {
  const w = spec.weapon;
  if (w==='kiem' || w==='kiem-vang') return (<G><Rect x="90" y="62" width="5" height="26" rx="2" fill="#ced4da" transform="rotate(-24 92 75)"/><Polygon points="98,58 104,44 108,60" fill="#e9ecef"/><Rect x="86" y="84" width="12" height="4" rx="2" fill={w==='kiem-vang'?'#ffd60a':'#795548'}/></G>);
  if (w==='khien') return (<G><Path d="M8 66 Q20 60 30 66 L30 84 Q20 96 8 84Z" fill="#f4a261" stroke="#c97b2d" strokeWidth="2"/><Circle cx="19" cy="76" r="4" fill="#ffd60a"/></G>);
  if (w==='gay-phep' || w==='dua-than' || w==='gay-keo') return (<G><Rect x="90" y="58" width="5" height="34" rx="2" fill="#7b5ea7" transform="rotate(-18 92 75)"/><Polygon points="96,44 99,54 109,54 101,60 104,70 96,64 88,70 91,60 83,54 93,54" fill="#ffd60a"/></G>);
  if (w==='cung' || w==='cung-trang') return (<G><Path d="M96 52 Q112 74 96 98" stroke="#795548" strokeWidth="4" fill="none"/><Path d="M96 52 L96 98" stroke="#fff" strokeWidth="1.5"/><Rect x="94" y="72" width="18" height="3" fill="#adb5bd"/></G>);
  if (w==='sach') return (<G><Rect x="84" y="66" width="24" height="18" rx="2" fill="#5a189a"/><Rect x="87" y="69" width="18" height="12" fill="#fff"/></G>);
  if (w==='dao') return (<G><Polygon points="92,66 106,54 104,72" fill="#dee2e6"/><Rect x="88" y="68" width="8" height="5" fill="#212529" transform="rotate(30 92 70)"/></G>);
  if (w==='bua') return (<G><Rect x="94" y="56" width="5" height="34" fill="#795548" transform="rotate(-16 96 73)"/><Rect x="82" y="46" width="26" height="14" rx="4" fill="#adb5bd"/></G>);
  if (w==='carot') return (<G><Polygon points="94,64 104,64 99,88" fill="#fb8500"/><Path d="M99 64 Q94 52 88 54 M99 64 Q100 50 108 52" stroke="#38b000" strokeWidth="3" fill="none"/></G>);
  if (w==='lua' || w==='lua-phuong') return (<G><Path d="M92 62 Q104 74 94 90 Q84 76 92 62Z" fill="#fb8500"/><Path d="M93 72 Q99 79 93 86 Q88 78 93 72Z" fill="#ffd60a"/></G>);
  if (w==='bong' || w==='bong-bong') return (<G><Circle cx="96" cy="66" r="11" fill="#a2d2ff" opacity="0.75"/><Circle cx="92" cy="62" r="3.5" fill="#fff"/></G>);
  if (w==='quat') return (<G><Polygon points="90,84 96,58 112,64 104,84" fill="#ff8fab"/><Path d="M96 82 L100 64" stroke="#c9184a" strokeWidth="2"/></G>);
  if (w==='chuong') return (<G><Path d="M86 78 Q86 62 97 62 Q108 62 108 78 Q108 84 97 84 Q86 84 86 78Z" fill="#ffd60a"/><Circle cx="97" cy="88" r="3" fill="#e0a800"/></G>);
  return (<G><Circle cx="96" cy="70" r="8" fill={spec.color} stroke="#fff" strokeWidth="2"/></G>);
}
// Tranh vat pham ve tay (thay icon): qua cau mau theo trang bi
export function ItemArt({ color, size = 40 }: { color: string; size?: number }) {
  return (<Svg width={size} height={size} viewBox="0 0 60 60"><Ellipse cx="30" cy="52" rx="14" ry="4" fill="#000" opacity="0.12"/><Circle cx="30" cy="28" r="18" fill={color}/><Circle cx="24" cy="21" r="6" fill="#fff" opacity="0.55"/><Path d="M16 38 Q30 48 44 38" stroke="#fff" strokeWidth="3" fill="none" opacity="0.7"/></Svg>);
}
