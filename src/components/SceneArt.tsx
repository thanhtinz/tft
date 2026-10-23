import React, { useEffect, useState } from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
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
// ===== DAU TRUONG LIEN MACH: MOT tranh SVG duy nhat phu kin arena =====
// Van nen co dinh (pseudo-random bang cong thuc chi so, KHONG Math.random khi render)
const SPECKLES: { x: number; y: number; r: number; o: number; c: string }[] = Array.from({ length: 56 }, (_, i) => ({
  x: (i * 67 + 23) % 700, y: (i * 41 + 17) % 400, r: 2 + (i % 4), o: 0.05 + (i % 5) * 0.02, c: i % 3 === 0 ? '#1d4a30' : i % 3 === 1 ? '#7fae6d' : '#5d7a3a',
}));
const FLOWERS: { x: number; y: number; c: string }[] = [
  { x: 26, y: 96, c: '#ffafcc' }, { x: 52, y: 330, c: '#ffd60a' }, { x: 96, y: 372, c: '#ffafcc' }, { x: 642, y: 48, c: '#ffd60a' },
  { x: 668, y: 300, c: '#ffafcc' }, { x: 606, y: 366, c: '#cdb4f6' }, { x: 28, y: 210, c: '#ffd60a' }, { x: 674, y: 196, c: '#ffafcc' },
  { x: 128, y: 24, c: '#cdb4f6' }, { x: 566, y: 382, c: '#ffafcc' }, { x: 330, y: 386, c: '#ffd60a' }, { x: 382, y: 16, c: '#ffafcc' },
];
function DecoTree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (<G transform={'translate(' + x + ' ' + y + ') scale(' + s + ')'}>
    <Rect x="-3" y="0" width="6" height="14" fill="#7f5539" />
    <Circle cx="0" cy="-8" r="13" fill="#2f7a44" /><Circle cx="-9" cy="-2" r="9" fill="#3c9153" /><Circle cx="9" cy="-2" r="9" fill="#357f49" />
  </G>);
}
function DecoRock({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (<Polygon points={(x - 12 * s) + ',' + y + ' ' + (x - 4 * s) + ',' + (y - 9 * s) + ' ' + (x + 5 * s) + ',' + (y - 11 * s) + ' ' + (x + 12 * s) + ',' + y} fill="#8d99ae" opacity="0.85" />);
}
function DecoFlag({ x, y, color, down }: { x: number; y: number; color: string; down?: boolean }) {
  return (<G>
    <Rect x={x - 1} y={y} width="2.5" height="24" fill="#e9ecef" />
    <Polygon points={x + ',' + y + ' ' + (x + 20) + ',' + (y + 4) + ' ' + x + ',' + (y + 9)} fill={color} />
    {down && <Circle cx={x + 1} cy={y + 27} r="2.5" fill={color} />}
  </G>);
}
function DecoLantern({ x, y }: { x: number; y: number }) {
  return (<G>
    <Rect x={x - 1} y={y} width="2" height="20" fill="#5b3a29" />
    <Rect x={x - 5} y={y + 18} width="10" height="12" rx="3" fill="#fb8500" opacity="0.9" />
    <Circle cx={x} cy={y + 24} r="7" fill="#ffd60a" opacity="0.35" />
  </G>);
}
export function ArenaScene({ width, height }: { width: number; height: number }) {
  if (width <= 0 || height <= 0) return null;
  return (<Svg width={width} height={height} viewBox="0 0 700 400" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', left: 0, top: 0 } as any}>
    <Defs>
      <RadialGradient id="arenaGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor="#ffd60a" stopOpacity="0.16" /><Stop offset="1" stopColor="#ffd60a" stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id="arenaVig" cx="50%" cy="50%" r="72%">
        <Stop offset="0.55" stopColor="#060814" stopOpacity="0" /><Stop offset="1" stopColor="#060814" stopOpacity="0.35" />
      </RadialGradient>
    </Defs>
    <Rect width="700" height="400" fill="#33603f" />
    {SPECKLES.map((s, i) => <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.c} opacity={s.o} />)}
    <Rect width="700" height="200" fill="#fb8500" opacity="0.06" />
    <Rect y="200" width="700" height="200" fill="#48cae4" opacity="0.06" />
    <Ellipse cx="350" cy="200" rx="310" ry="168" fill="url(#arenaGlow)" />
    <Ellipse cx="350" cy="200" rx="286" ry="146" fill="#ffffff" opacity="0.045" />
    {/* Trang tri QUANH san (ngoai vung hex trung tam, vien ~14% moi phia) */}
    <DecoTree x={30} y={52} /><DecoTree x={64} y={26} s={0.8} /><DecoTree x={666} y={58} /><DecoTree x={636} y={30} s={0.85} />
    <DecoTree x={34} y={352} /><DecoTree x={662} y={348} /><DecoTree x={98} y={378} s={0.8} /><DecoTree x={600} y={376} s={0.8} />
    <DecoRock x={92} y={64} /><DecoRock x={614} y={68} s={1.2} /><DecoRock x={86} y={318} s={0.9} /><DecoRock x={622} y={322} />
    <DecoRock x={180} y={20} s={0.8} /><DecoRock x={520} y={384} s={0.85} />
    {FLOWERS.map((f, i) => <Circle key={'fl' + i} cx={f.x} cy={f.y} r="3" fill={f.c} opacity="0.9" />)}
    <DecoLantern x={16} y={140} /><DecoLantern x={16} y={238} /><DecoLantern x={684} y={140} /><DecoLantern x={684} y={238} />
    <DecoFlag x={338} y={4} color="#ef476f" /><DecoFlag x={362} y={372} color="#4dabff" down />
    <Rect width="700" height="400" fill="url(#arenaVig)" />
  </Svg>);
}
// Hat moi truong tu chay rieng (dom dom vang + canh hoa hong troi cham), khong keo parent re-render
const PARTICLES: { fx: number; fy: number; ph: number; sp: number; s: number; petal: boolean }[] = [
  { fx: 0.08, fy: 0.22, ph: 0.0, sp: 0.5, s: 3.2, petal: false }, { fx: 0.2, fy: 0.68, ph: 1.3, sp: 0.4, s: 2.6, petal: true },
  { fx: 0.34, fy: 0.14, ph: 2.1, sp: 0.6, s: 2.4, petal: false }, { fx: 0.47, fy: 0.8, ph: 0.7, sp: 0.45, s: 3.0, petal: true },
  { fx: 0.58, fy: 0.3, ph: 3.0, sp: 0.55, s: 2.8, petal: false }, { fx: 0.66, fy: 0.62, ph: 1.8, sp: 0.38, s: 2.2, petal: true },
  { fx: 0.76, fy: 0.18, ph: 2.6, sp: 0.5, s: 3.4, petal: false }, { fx: 0.85, fy: 0.52, ph: 0.4, sp: 0.42, s: 2.5, petal: true },
  { fx: 0.92, fy: 0.78, ph: 1.1, sp: 0.6, s: 2.7, petal: false }, { fx: 0.14, fy: 0.44, ph: 2.9, sp: 0.48, s: 2.3, petal: true },
];
export function AmbientParticles({ width, height }: { width: number; height: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const iv = setInterval(() => setTick(t => t + 1), 120); return () => clearInterval(iv); }, []);
  if (width <= 0 || height <= 0) return null;
  const t = tick * 0.12;
  return (<Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 } as any} pointerEvents="none">
    {PARTICLES.map((p, i) => {
      const x = p.fx * width + Math.sin(t * p.sp + p.ph) * 16;
      const y = p.fy * height + Math.cos(t * p.sp * 0.8 + p.ph * 1.7) * 12;
      const o = 0.3 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.6 + p.ph * 2.3));
      return p.petal
        ? <Ellipse key={i} cx={x} cy={y} rx={p.s * 1.5} ry={p.s} fill="#ffafcc" opacity={o} transform={'rotate(' + ((t * 30 + p.ph * 40) % 360) + ' ' + x + ' ' + y + ')'} />
        : <Circle key={i} cx={x} cy={y} r={p.s} fill="#ffd60a" opacity={o} />;
    })}
  </Svg>);
}
// ===== LOBBY SCENE: tranh rung huyen ao PHU KINH man hinh (nhieu lop chieu sau) =====
// Lop: troi teal + tia nang xuyen la -> tan cay xa -> cay giua + hoa anh dao -> quang
// truong sang o giua-phai (noi linh vat dung) -> co/hoa/nam o tien canh -> nhanh cay
// toi o mep duoi tao khung chieu sau. Deer silhouette la dong vat rung generic.
const FIREFLIES: { x: number; y: number; r: number; o: number }[] = [
  { x: 120, y: 120, r: 2.2, o: 0.8 }, { x: 210, y: 84, r: 1.6, o: 0.6 }, { x: 330, y: 150, r: 2.0, o: 0.7 },
  { x: 470, y: 96, r: 1.5, o: 0.55 }, { x: 560, y: 170, r: 2.3, o: 0.8 }, { x: 640, y: 110, r: 1.7, o: 0.6 },
  { x: 88, y: 220, r: 1.8, o: 0.65 }, { x: 250, y: 210, r: 1.4, o: 0.5 }, { x: 520, y: 250, r: 1.6, o: 0.6 },
  { x: 660, y: 230, r: 2.0, o: 0.7 }, { x: 150, y: 300, r: 1.5, o: 0.5 }, { x: 420, y: 190, r: 1.8, o: 0.65 },
];
const LOBBY_SPECKLES: { x: number; y: number; r: number; c: string; o: number }[] = Array.from({ length: 40 }, (_, i) => ({
  x: (i * 89 + 31) % 700, y: 300 + ((i * 37 + 13) % 92), r: 2 + (i % 3), c: i % 3 === 0 ? '#0e4a30' : i % 3 === 1 ? '#8fce6d' : '#5d9440', o: 0.16,
}));
export function LobbyScene({ width, height }: { width: number; height: number }) {
  if (width <= 0 || height <= 0) return null;
  return (<Svg width={width} height={height} viewBox="0 0 700 400" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', left: 0, top: 0 } as any}>
    <Defs>
      <LinearGradient id="lobbySky" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#082f3a" /><Stop offset="0.45" stopColor="#11584c" /><Stop offset="0.78" stopColor="#2c7a52" /><Stop offset="1" stopColor="#3d8a54" />
      </LinearGradient>
      <RadialGradient id="lobbyGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor="#ffedb0" stopOpacity="0.5" /><Stop offset="0.6" stopColor="#ffe9a8" stopOpacity="0.16" /><Stop offset="1" stopColor="#ffe9a8" stopOpacity="0" />
      </RadialGradient>
      <LinearGradient id="lobbyGrass" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#4c9a58" /><Stop offset="1" stopColor="#1d5c36" />
      </LinearGradient>
    </Defs>
    <Rect width="700" height="400" fill="url(#lobbySky)" />
    {/* Tia nang xuyen la tu goc tren */}
    <Polygon points="150,0 235,0 120,400 30,400" fill="#fff7cf" opacity="0.07" />
    <Polygon points="300,0 350,0 300,400 215,400" fill="#fff7cf" opacity="0.09" />
    <Polygon points="470,0 540,0 560,400 470,400" fill="#fff7cf" opacity="0.05" />
    {/* Tan cay xa (bong toi) */}
    <G fill="#0a4234" opacity="0.85">
      <Circle cx="40" cy="18" r="52" /><Circle cx="130" cy="6" r="60" /><Circle cx="250" cy="14" r="48" /><Circle cx="380" cy="4" r="58" />
      <Circle cx="510" cy="12" r="50" /><Circle cx="620" cy="6" r="56" /><Circle cx="695" cy="26" r="44" />
    </G>
    <Path d="M96 0 Q92 60 104 104" stroke="#0a4234" strokeWidth="5" fill="none" opacity="0.7" />
    <Path d="M588 0 Q596 52 584 96" stroke="#0a4234" strokeWidth="5" fill="none" opacity="0.7" />
    {/* Doi xa */}
    <Path d="M0 252 Q140 214 300 240 Q470 266 700 226 L700 400 L0 400Z" fill="#17573d" opacity="0.65" />
    {/* Cay giua khung hai ben + hoa anh dao */}
    <G>
      <Path d="M52 400 Q58 260 44 150 L66 150 Q62 260 78 400Z" fill="#4a3220" />
      <Circle cx="56" cy="128" r="56" fill="#1d6b45" /><Circle cx="16" cy="160" r="38" fill="#256f47" /><Circle cx="98" cy="152" r="40" fill="#185c3a" />
      <Circle cx="40" cy="112" r="15" fill="#f2a7c3" opacity="0.9" /><Circle cx="76" cy="138" r="12" fill="#e58bb1" opacity="0.9" /><Circle cx="18" cy="140" r="10" fill="#f7c3d8" opacity="0.9" />
      <Path d="M648 400 Q642 250 656 140 L634 140 Q638 250 622 400Z" fill="#42301e" />
      <Circle cx="644" cy="120" r="58" fill="#1d6b45" /><Circle cx="686" cy="152" r="38" fill="#256f47" /><Circle cx="602" cy="146" r="40" fill="#185c3a" />
      <Circle cx="664" cy="104" r="14" fill="#f2a7c3" opacity="0.9" /><Circle cx="622" cy="128" r="11" fill="#e58bb1" opacity="0.9" />
      <Circle cx="300" cy="66" r="34" fill="#2c7d54" opacity="0.8" /><Circle cx="420" cy="52" r="28" fill="#256f47" opacity="0.8" />
      <Circle cx="330" cy="58" r="10" fill="#f2a7c3" opacity="0.75" /><Circle cx="398" cy="46" r="8" fill="#f7c3d8" opacity="0.75" />
    </G>
    {/* Quang truong sang giua-phai: noi linh vat dung */}
    <Ellipse cx="445" cy="252" rx="265" ry="150" fill="url(#lobbyGlow)" />
    <Path d="M0 306 Q180 282 380 300 Q560 316 700 292 L700 400 L0 400Z" fill="url(#lobbyGrass)" />
    <Ellipse cx="452" cy="330" rx="196" ry="46" fill="#a8d97a" opacity="0.28" />
    <Ellipse cx="452" cy="334" rx="140" ry="32" fill="#ffe9a8" opacity="0.14" />
    {LOBBY_SPECKLES.map((s, i) => <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.c} opacity={s.o} />)}
    {/* Hoa + nam tien canh */}
    <G>
      <Circle cx="120" cy="348" r="3.4" fill="#ffafcc" /><Circle cx="180" cy="366" r="3" fill="#ffd60a" /><Circle cx="90" cy="322" r="2.6" fill="#ffd60a" />
      <Circle cx="586" cy="356" r="3.2" fill="#ffafcc" /><Circle cx="250" cy="342" r="2.6" fill="#cdb4f6" /><Circle cx="640" cy="330" r="2.8" fill="#ffd60a" />
      <Rect x="66" y="352" width="5" height="10" fill="#f1e3c8" /><Path d="M56 354 Q68 340 80 354Z" fill="#e85d75" /><Circle cx="63" cy="348" r="1.8" fill="#fff" />
      <Rect x="618" y="368" width="5" height="9" fill="#f1e3c8" /><Path d="M609 370 Q620 357 632 370Z" fill="#fb8500" />
      <Polygon points="30,386 44,372 58,386" fill="#5d6b7a" opacity="0.8" /><Polygon points="652,392 668,376 684,392" fill="#5d6b7a" opacity="0.8" />
    </G>
    {/* Huou nho ben phai (silhouette dong vat rung) */}
    <G fill="#0d3527" opacity="0.85">
      <Ellipse cx="612" cy="300" rx="17" ry="10" />
      <Path d="M624 294 L634 278 L640 280 L632 296Z" /><Circle cx="637" cy="277" r="4.6" />
      <Path d="M634 272 L632 262 M638 272 L642 263" stroke="#0d3527" strokeWidth="2" />
      <Rect x="600" y="306" width="3.4" height="15" /><Rect x="620" y="306" width="3.4" height="15" />
      <Path d="M596 296 L588 290 L597 291Z" />
    </G>
    {FIREFLIES.map((f, i) => <Circle key={'ff' + i} cx={f.x} cy={f.y} r={f.r} fill="#ffe27a" opacity={f.o} />)}
    {/* Nhanh cay toi mep duoi: khung chieu sau */}
    <Path d="M-10 400 Q120 356 300 384 Q470 408 710 372 L710 400Z" fill="#081f16" />
    <Path d="M-10 400 Q180 368 360 390 L360 400Z" fill="#0a2a1d" opacity="0.9" />
    <G fill="#081f16">
      <Circle cx="26" cy="382" r="17" /><Circle cx="58" cy="392" r="13" /><Circle cx="676" cy="384" r="16" /><Circle cx="646" cy="394" r="12" />
      <Circle cx="8" cy="30" r="30" /><Circle cx="692" cy="24" r="34" />
    </G>
  </Svg>);
}
export function FloorCell({ w, back }: { w: number; back?: boolean }) {
  // O co dang hinh thang nhe: canh tren hep hon canh duoi (phoi canh 2.5D)
  return (<Svg width={w} height={w*0.86} viewBox="0 0 50 43"><Polygon points="6,2 44,2 49,41 1,41" fill={back?'#eaf7ee':'#ffffff'} opacity="0.92" stroke="#95d5b2" strokeWidth="1.6"/></Svg>);
}
