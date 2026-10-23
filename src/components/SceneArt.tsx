import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';
import ChibiArt from './ChibiArt';
import { CHAMPIONS, MONSTERS } from '../game/data';
// TRANH NEN / SCENE ART ve bang SVG: trang chu, ban co, chuong PvE, thang/thua
export function HomeScene({ width = 340 }: { width?: number }) {
  const h = width * 0.52;
  return (<Svg width={width} height={h} viewBox="0 0 340 178">
    <Rect width="340" height="178" fill="#ffeef6"/>
    <Circle cx="292" cy="30" r="20" fill="#ffd60a"/><Circle cx="292" cy="30" r="27" fill="#ffd60a" opacity="0.25"/>
    <Ellipse cx="60" cy="34" rx="34" ry="13" fill="#fff"/><Ellipse cx="180" cy="22" rx="28" ry="10" fill="#fff"/>
    <Path d="M0 140 Q85 118 170 136 Q255 152 340 132 L340 178 L0 178Z" fill="#b9fbc0"/>
    <Path d="M0 154 Q110 138 340 148 L340 178 L0 178Z" fill="#95d5b2"/>
    <Polygon points="24,138 38,104 52,138" fill="#ff8fab"/><Rect x="34" y="124" width="8" height="10" fill="#fff"/>
    <Polygon points="292,140 306,102 320,140" fill="#a2d2ff"/><Rect x="302" y="126" width="8" height="10" fill="#fff"/>
    <Ellipse cx="170" cy="152" rx="92" ry="16" fill="#ffd6a5"/><Ellipse cx="170" cy="150" rx="92" ry="16" fill="#ffe5b4"/>
    <Path d="M86 146 L254 146" stroke="#e0a800" strokeWidth="2" strokeDasharray="7 6"/>
  </Svg>);
}
export function ChapterScene({ chapter, width = 320 }: { chapter: number; width?: number }) {
  const bg = chapter===1 ? '#d8f3dc' : chapter===2 ? '#ffe5b4' : '#e0c3fc';
  const accent = chapter===1 ? '#38b000' : chapter===2 ? '#fb8500' : '#7209b7';
  return (<Svg width={width} height={width*0.34} viewBox="0 0 320 110">
    <Rect width="320" height="110" fill={bg}/>
    <Circle cx="284" cy="22" r="14" fill="#ffd60a"/>
    <Path d="M0 84 Q80 66 160 80 Q240 92 320 74 L320 110 L0 110Z" fill={accent} opacity="0.35"/>
    <Polygon points="18,84 34,44 50,84" fill={accent}/><Polygon points="268,86 286,38 304,86" fill={accent}/>
    <Circle cx="90" cy="30" r="7" fill="#fff"/><Circle cx="140" cy="20" r="5" fill="#fff"/><Circle cx="220" cy="28" r="6" fill="#fff"/>
    <Ellipse cx="160" cy="94" rx="70" ry="10" fill="#000" opacity="0.08"/>
  </Svg>);
}
export function ResultScene({ win, width = 300 }: { win: boolean; width?: number }) {
  return (<Svg width={width} height={width*0.36} viewBox="0 0 300 108">
    <Rect width="300" height="108" fill={win ? '#fff3b0' : '#dee2e6'} rx="14"/>
    {win ? (<G><Polygon points="150,10 156,26 173,26 159,36 164,52 150,42 136,52 141,36 127,26 144,26" fill="#ffd60a"/><Circle cx="52" cy="28" r="5" fill="#ef476f"/><Circle cx="248" cy="24" r="5" fill="#48cae4"/><Circle cx="272" cy="52" r="4" fill="#38b000"/><Circle cx="28" cy="56" r="4" fill="#9d6b53"/></G>)
    : (<G><Path d="M60 22 Q70 34 60 46 Q50 34 60 22Z" fill="#48cae4"/><Path d="M240 18 Q250 30 240 42 Q230 30 240 18Z" fill="#48cae4"/></G>)}
    <Ellipse cx="150" cy="94" rx="86" ry="10" fill="#000" opacity="0.08"/>
  </Svg>);
}
export function EmptyScene({ width = 200 }: { width?: number }) {
  return (<Svg width={width} height={width*0.5} viewBox="0 0 200 100"><Ellipse cx="100" cy="86" rx="56" ry="8" fill="#000" opacity="0.08"/><Circle cx="70" cy="40" r="7" fill="#ffc8dd"/><Circle cx="130" cy="34" r="9" fill="#a2d2ff"/><Path d="M30 78 Q100 60 170 78" stroke="#ff8fab" strokeWidth="4" fill="none" strokeLinecap="round"/></Svg>);
}
// Hang nhan vat chao mung dung tranh ve (dung o trang chu)
export const welcomeSpecs = [CHAMPIONS[0], CHAMPIONS[16], CHAMPIONS[20], CHAMPIONS[23]];
export const bossSpec = MONSTERS[9];
export { ChibiArt };
// TRANH 2.5D nhieu lop cho ban co: lop xa (troi/nui) -> lop giua (cay, cong dau truong)
// -> lop san phoi canh (o hinh thang, hang sau nho hon) -> tien canh nhe.
// Quan co duoc sap xep do sau theo hang o GameScreen (rowDepth trong game/rig.ts).
export function LayeredBoardBg({ width = 340 }: { width?: number }) {
  return (<Svg width={width} height={width*0.30} viewBox="0 0 340 102">
    <Rect width="340" height="102" fill="#cdeffd"/>
    <Circle cx="300" cy="18" r="13" fill="#ffd60a"/><Ellipse cx="52" cy="16" rx="30" ry="9" fill="#fff"/><Ellipse cx="150" cy="10" rx="24" ry="7" fill="#fff"/>
    <Polygon points="0,74 60,30 120,74" fill="#a9d6e5"/><Polygon points="90,74 160,22 232,74" fill="#90c8dd"/><Polygon points="210,74 278,32 340,74" fill="#a9d6e5"/>
    <Polygon points="160,22 146,40 174,40" fill="#fff"/>
    <Rect x="8" y="66" width="10" height="18" fill="#7f5539"/><Circle cx="13" cy="60" r="13" fill="#38b000"/>
    <Rect x="322" y="66" width="10" height="18" fill="#7f5539"/><Circle cx="327" cy="60" r="13" fill="#38b000"/>
    <Path d="M120 84 L128 60 L212 60 L220 84" fill="#ffd6a5"/><Rect x="126" y="52" width="88" height="8" rx="4" fill="#ff8fab"/>
    <Rect y="84" width="340" height="18" fill="#95d5b2"/>
  </Svg>);
}
export function FloorCell({ w, back }: { w: number; back?: boolean }) {
  // O co dang hinh thang nhe: canh tren hep hon canh duoi (phoi canh 2.5D)
  return (<Svg width={w} height={w*0.86} viewBox="0 0 50 43"><Polygon points="6,2 44,2 49,41 1,41" fill={back?'#eaf7ee':'#ffffff'} opacity="0.92" stroke="#95d5b2" strokeWidth="1.6"/></Svg>);
}
