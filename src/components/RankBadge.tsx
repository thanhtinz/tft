import React from 'react';
import Svg, { Polygon } from 'react-native-svg';
import { RANK_TIERS } from '../game/auth';
// HUY HIEU HANG ve SVG theo bac (10 bac kieu TFT): canh + khien + ngoc giua,
// bac Cao Thu tro len them vuong mien. Mau rieng tung bac, khong dung asset ngoai.
const TIER_ART = [
  { main: '#8d99ae', dark: '#5d6878', light: '#c3ccd9', gem: '#e8ecff' }, // Sat
  { main: '#c97b4a', dark: '#8a4f27', light: '#eda96e', gem: '#ffe3c2' }, // Dong
  { main: '#c0c8d4', dark: '#828d9e', light: '#eef2f8', gem: '#ffffff' }, // Bac
  { main: '#f5c542', dark: '#b8860b', light: '#ffe27a', gem: '#fff3b0' }, // Vang
  { main: '#7fe7dc', dark: '#3aa79c', light: '#c8fff8', gem: '#ffffff' }, // Bach Kim
  { main: '#2ecc71', dark: '#1a8a4c', light: '#7bf0ab', gem: '#eafff2' }, // Ngoc Luc Bao
  { main: '#5eb2f2', dark: '#2b6cb0', light: '#a8d8ff', gem: '#ffffff' }, // Kim Cuong
  { main: '#b388ff', dark: '#7040b8', light: '#dcbfff', gem: '#ffe27a' }, // Cao Thu
  { main: '#ff6b81', dark: '#b62b40', light: '#ffa4b2', gem: '#ffd60a' }, // Dai Cao Thu
  { main: '#ffb703', dark: '#c2255c', light: '#ffd60a', gem: '#ef476f' }, // Thach Dau
];
export default function RankBadge({ tier, size = 64 }: { tier: number; size?: number }) {
  const t = TIER_ART[Math.max(0, Math.min(9, tier))];
  const apex = tier >= 7;
  return (
    <Svg width={size} height={size * 1.08} viewBox="0 0 48 52">
      {/* canh hai ben */}
      <Polygon points="10,20 1,13 4,26 0,30 9,31" fill={t.dark} />
      <Polygon points="38,20 47,13 44,26 48,30 39,31" fill={t.dark} />
      <Polygon points="11,25 4,23 8,32 13,31" fill={t.main} opacity={0.85} />
      <Polygon points="37,25 44,23 40,32 35,31" fill={t.main} opacity={0.85} />
      {/* vuong mien cho bac apex */}
      {apex && <Polygon points="16,9 19,2.5 24,7.5 29,2.5 32,9" fill={t.light} stroke={t.dark} strokeWidth="1" />}
      {/* khien chinh */}
      <Polygon points="24,7 39,12 39,27 24,47 9,27 9,12" fill={t.main} stroke={t.dark} strokeWidth="2" />
      <Polygon points="24,11 35,14.5 35,26 24,41 13,26 13,14.5" fill={t.light} opacity={0.5} />
      <Polygon points="24,15 31,21 24,34 17,21" fill={t.dark} opacity={0.35} />
      {/* ngoc giua */}
      <Polygon points="24,17.5 29,23 24,31 19,23" fill={t.gem} stroke={t.dark} strokeWidth="1.2" />
      <Polygon points="24,17.5 29,23 24,24.5 19,23" fill="#ffffff" opacity={0.75} />
    </Svg>
  );
}
export function tierName(tier: number): string { return RANK_TIERS[Math.max(0, Math.min(9, tier))]; }
