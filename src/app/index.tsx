import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';
import { router, useFocusEffect } from 'expo-router';
import SpriteUnit, { SceneArtImage } from '../components/SpriteUnit';
import { loadMeta, loadPlayer, loadProfile, loadSettings, saveSettings, MetaState, ProfileState, defaultMeta } from '../game/storage';
import RankBadge from '../components/RankBadge';
import { Identity, formatRiotId, restoreSession } from '../game/accounts';
import { rankLabel } from '../game/auth';
import { TOTAL_STAGES, stageDef } from '../game/stages';
import { champById, monsterById } from '../game/data';
import { audio } from '../game/audio';

// ===== Icon nho tu ve cho menu doc ben trai (kieu TFT lobby) =====
function MenuIcon({ kind, size = 24 }: { kind: string; size?: number }) {
  const w = '#fff';
  if (kind === 'book') return (<Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M5 3 Q9 1.6 12 4 Q15 1.6 19 3 L19 19 Q15 17.6 12 20 Q9 17.6 5 19Z" fill="none" stroke={w} strokeWidth="1.9" /><Path d="M12 4 L12 20" stroke={w} strokeWidth="1.6" /></Svg>);
  if (kind === 'swords') return (<Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4 4 L15 15 M15 15 L13.4 18.6 L10.4 15.6Z M20 4 L9 15 M9 15 L10.6 18.6 L13.6 15.6Z" stroke={w} strokeWidth="1.9" fill="none" strokeLinecap="round" /><Path d="M3 17 L7 21 M21 17 L17 21" stroke={w} strokeWidth="1.9" strokeLinecap="round" /></Svg>);
  if (kind === 'helm') return (<Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M5 19 L5 11 Q5 4 12 4 Q19 4 19 11 L19 19 L15 19 L15 12 L9 12 L9 19Z" fill="none" stroke={w} strokeWidth="1.9" /><Path d="M12 4 L12 1.8" stroke="#ffd60a" strokeWidth="2.2" strokeLinecap="round" /></Svg>);
  if (kind === 'flag') return (<Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M6 21 L6 3" stroke={w} strokeWidth="2" strokeLinecap="round" /><Polygon points="6,3.4 19,6.4 6,10" fill="#ffd60a" /></Svg>);
  if (kind === 'wave') return (<Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M2 8 Q6 3.5 10 8 Q14 12.5 18 8 Q20.5 5.4 22 7 M2 16 Q6 11.5 10 16 Q14 20.5 18 16 Q20.5 13.4 22 15" stroke={w} strokeWidth="2" fill="none" strokeLinecap="round" /></Svg>);
  if (kind === 'grid') return (<Svg width={size} height={size} viewBox="0 0 24 24"><Rect x="3.5" y="3.5" width="7" height="7" rx="1.6" fill="none" stroke={w} strokeWidth="1.9" /><Rect x="13.5" y="3.5" width="7" height="7" rx="1.6" fill="none" stroke={w} strokeWidth="1.9" /><Rect x="3.5" y="13.5" width="7" height="7" rx="1.6" fill="none" stroke={w} strokeWidth="1.9" /><Rect x="13.5" y="13.5" width="7" height="7" rx="1.6" fill="#ffd60a" /></Svg>);
  if (kind === 'note') return (<Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M6 2.5 L18 2.5 L18 21.5 L6 21.5Z" fill="none" stroke={w} strokeWidth="1.9" /><Path d="M9 7.5 L15 7.5 M9 11.5 L15 11.5 M9 15.5 L13 15.5" stroke={w} strokeWidth="1.7" strokeLinecap="round" /></Svg>);
  if (kind === 'user') return (<Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="12" cy="7.6" r="4" fill="none" stroke={w} strokeWidth="1.9" /><Path d="M3.8 21 C3.8 15.8 7.4 13.4 12 13.4 C16.6 13.4 20.2 15.8 20.2 21" fill="none" stroke={w} strokeWidth="1.9" strokeLinecap="round" /></Svg>);
  if (kind === 'music') return (<Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M9 18.5 L9 6 L20 4 L20 16" fill="none" stroke={w} strokeWidth="1.9" /><Circle cx="6.4" cy="18.5" r="2.8" fill={w} /><Circle cx="17.4" cy="16" r="2.8" fill={w} /></Svg>);
  if (kind === 'sound') return (<Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="4,9.5 8,9.5 13,4.5 13,19.5 8,14.5 4,14.5" fill={w} /><Path d="M16 9 Q18.6 12 16 15 M18.4 6.6 Q22.4 12 18.4 17.4" stroke={w} strokeWidth="1.8" fill="none" strokeLinecap="round" /></Svg>);
  return (<Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="12" cy="12" r="9" fill="none" stroke={w} strokeWidth="1.9" /></Svg>);
}

function RoundBtn({ kind, on, onPress }: { kind: string; on?: boolean; onPress: () => void }) {
  return (
    <Pressable style={[s.roundBtn, on === false && s.roundBtnOff]} onPress={onPress}>
      <MenuIcon kind={kind} size={19} />
      {on === false && <View style={s.roundBtnSlash} />}
    </Pressable>
  );
}

// Linh vat goc cua game (khong dung IP cua Riot): hiẹp si / vua banh / cong chua trang
const MASCOTS = [
  { id: 'gogo', label: 'Gogo — Hiệp Sĩ Chibi' },
  { id: 'king', label: 'King — Vua Bánh' },
  { id: 'luna', label: 'Luna — Công Chúa Trăng' },
];

type ModeDef = { route: string; icon: string; title: string; desc: string; spec: any; featured?: boolean };
export default function Home() {
  const [meta, setMeta] = useState<MetaState>(defaultMeta);
  const [playerName, setPlayerName] = useState('Người chơi');
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [musicOn, setMusicOn] = useState(true); const [sfxOn, setSfxOn] = useState(true);
  const [mascotIdx, setMascotIdx] = useState(0);
  const [showModes, setShowModes] = useState(false);
  const { width: winW, height: winH } = useWindowDimensions();
  useEffect(() => { loadSettings().then(s => { setMusicOn(s.music); setSfxOn(s.sfx); audio.setMusicEnabled(s.music); audio.setSfxEnabled(s.sfx); }); }, []);
  // Moi lan quay ve trang chu: nap lai phien dang nhap + ho so + Ngoc theo dung tai khoan
  useFocusEffect(React.useCallback(() => {
    restoreSession().then(async idn => {
      setIdentity(idn);
      const [m, p] = await Promise.all([loadMeta(), loadProfile(idn.displayName)]);
      setMeta(m); setProfile(p);
      if (idn.kind === 'guest') loadPlayer().then(pl => setPlayerName(pl.name));
    });
  }, []));
  function tap() { audio.unlock(); audio.playSfx('click'); if (musicOn) audio.startBgm('home'); }
  function go(route: string) { tap(); setShowModes(false); router.push(route as any); }
  async function toggleAudio(kind: 'music'|'sfx') { audio.unlock(); const s = await loadSettings(); if (kind==='music') { s.music = !s.music; setMusicOn(s.music); audio.setMusicEnabled(s.music); if (s.music) audio.startBgm('home'); else audio.stopBgm(); } else { s.sfx = !s.sfx; setSfxOn(s.sfx); audio.setSfxEnabled(s.sfx); if (s.sfx) audio.playSfx('click'); } await saveSettings(s); }
  const curStage = Math.min(Math.max(meta.unlockedStage, 1), TOTAL_STAGES);
  const sd = stageDef(curStage);
  const pvePct = Math.min(100, (curStage - 1) / TOTAL_STAGES * 100);
  const mascot = MASCOTS[mascotIdx];
  const mascotSize = Math.max(230, Math.min(winH * 0.66, 460));
  const MODES: ModeDef[] = [
    { route: '/online', icon: 'swords', title: 'PvP Online', desc: 'Người đấu người qua mạng — tạo phòng, ghép nhanh', spec: champById('astro'), featured: true },
    { route: '/game?mode=arena', icon: 'helm', title: 'Đấu với AI', desc: 'Đấu trường offline với 7 đối thủ máy', spec: champById('drago') },
    { route: '/campaign', icon: 'flag', title: 'Chiến Dịch PvE', desc: `${TOTAL_STAGES} màn, Boss mỗi 10 màn`, spec: monsterById('kingboss') },
    { route: '/game?mode=waves', icon: 'wave', title: 'Thử Thách Sóng Quái', desc: 'Sóng quái vô hạn — phá kỷ lục của bạn', spec: monsterById('soi') },
    { route: '/game?mode=tutorial', icon: 'book', title: 'Học Chơi Tương Tác', desc: 'Học từng bước cùng mascot Nana — thưởng 50 Ngọc lần đầu', spec: champById('nana') },
    { route: '/collection', icon: 'grid', title: 'Bộ Sưu Tập Tướng', desc: 'Xem tướng, quái, tộc/hệ và trang bị', spec: champById('luna') },
  ];
  const MENU = [
    { label: 'HỌC CHƠI', icon: 'book', route: '/game?mode=tutorial', first: true },
    { label: 'PVP ONLINE', icon: 'swords', route: '/online' },
    { label: 'ĐẤU VỚI AI', icon: 'helm', route: '/game?mode=arena' },
    { label: 'CHIẾN DỊCH PVE', icon: 'flag', route: '/campaign' },
    { label: 'SÓNG QUÁI', icon: 'wave', route: '/game?mode=waves' },
    { label: 'BỘ SƯU TẬP', icon: 'grid', route: '/collection' },
    { label: 'TÀI KHOẢN', icon: 'user', route: identity && identity.kind !== 'guest' ? '/account' : '/login' },
  ];
  return (
    <View style={s.screen}>
      <SceneArtImage id="lobby" width={winW} height={winH} />
      {/* ===== TOP BAR ===== */}
      <View style={s.topBar}>
        <Pressable style={s.playerBox} onPress={() => go(identity && identity.kind !== 'guest' ? '/account' : '/login')}>
          <View style={s.avatar}>
            <View style={{ position: 'absolute', left: -9, top: -5 }}>
              <SpriteUnit spec={champById(profile?.avatarId ?? identity?.avatarId ?? 'gogo')} size={62} state="idle" />
            </View>
          </View>
          <View>
            <Text style={s.playerName} numberOfLines={1}>{identity && identity.kind !== 'guest' ? formatRiotId(profile?.displayName ?? identity.displayName, profile?.tag ?? identity.tag) : playerName}</Text>
            {profile && identity && identity.kind !== 'guest' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <RankBadge tier={profile.rank.tier} size={15} />
                <Text style={s.playerSub}>{rankLabel(profile.rank)} • Cấp {profile.level}</Text>
              </View>
            ) : (
              <Text style={s.playerSub}>Khách — chạm để đăng nhập</Text>
            )}
          </View>
        </Pressable>
        <View style={s.topRight}>
          <View style={s.gemPill}>
            <Svg width={17} height={17} viewBox="0 0 24 24"><Circle cx="12" cy="12" r="9" fill="#ffb703" stroke="#c77f00" strokeWidth="2" /><Circle cx="12" cy="12" r="4.6" fill="#ffd60a" /></Svg>
            <Text style={s.gemTxt}>{meta.gems}</Text>
            <View style={s.gemPlus}><Text style={s.gemPlusTxt}>+</Text></View>
          </View>
          <RoundBtn kind="music" on={musicOn} onPress={() => toggleAudio('music')} />
          <RoundBtn kind="sound" on={sfxOn} onPress={() => toggleAudio('sfx')} />
          <RoundBtn kind="note" onPress={() => go('/guide')} />
        </View>
      </View>
      {/* ===== LINH VAT KHONG LO ===== */}
      <View style={[s.mascotWrap, { right: Math.max(8, winW * 0.13), bottom: winH * 0.055 }]} pointerEvents="none">
        <SpriteUnit spec={champById(mascot.id)} size={mascotSize} state="idle" />
      </View>
      {/* ===== MENU DOC BEN TRAI ===== */}
      <View style={[s.menu, { top: Math.max(86, winH * 0.21), left: Math.max(14, winW * 0.035) }]}>
        {MENU.map(m => (
          <Pressable key={m.label} style={s.menuItem} onPress={() => go(m.route)}>
            <MenuIcon kind={m.icon} size={25} />
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={s.menuTxt}>{m.label}</Text>
                {m.first && (<View style={s.lvBadge}><Text style={s.lvTxt}>LV. {sd.chapter}</Text></View>)}
              </View>
              {m.first && (
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: Math.max(4, pvePct) + '%' }]} />
                </View>
              )}
              {m.first && !meta.tutorialDone && <Text style={s.menuTag}>Hoàn thành học chơi: +50 Ngọc</Text>}
            </View>
          </Pressable>
        ))}
        <Text style={s.statsLine}>Kỷ lục sóng: {meta.bestWave} • Hạng tốt nhất: {meta.bestRank}/8 • Số trận thắng: {meta.wins}</Text>
      </View>
      {/* ===== THE NOI BAT DUOI TRAI: TIEN DO CHUONG PVE ===== */}
      <Pressable style={[s.featureCard, { left: Math.max(14, winW * 0.035), bottom: Math.max(14, winH * 0.045) }]} onPress={() => go('/campaign')}>
        <View style={{ width: 196, height: 67, borderRadius: 10, overflow: 'hidden' }}><SceneArtImage id={['banner-forest', 'banner-desert', 'banner-ice'][(sd.chapter - 1) % 3]} width={196} height={67} /></View>
        <View style={s.featureBadge}><Text style={s.featureBadgeTxt}>CHƯƠNG {sd.chapter}</Text></View>
        <View style={s.featureStrip}>
          <Text style={s.featureTitle} numberOfLines={1}>{sd.name}</Text>
          <Text style={s.featureDesc}>Tiến độ PvE: màn {curStage}/{TOTAL_STAGES}</Text>
        </View>
      </Pressable>
      {/* ===== TEN LINH VAT + CHAM XOAY VONG ===== */}
      <View style={[s.mascotNav, { bottom: Math.max(16, winH * 0.05) }]}>
        <Text style={s.mascotName}>{mascot.label}</Text>
        <View style={s.dotsRow}>
          {MASCOTS.map((m, i) => (
            <Pressable key={m.id} onPress={() => { tap(); setMascotIdx(i); }} style={[s.dot, i === mascotIdx && s.dotOn]} />
          ))}
        </View>
      </View>
      {/* ===== NUT CHOI KHONG LO ===== */}
      <Pressable style={[s.playBtn, { right: Math.max(16, winW * 0.04), bottom: Math.max(16, winH * 0.05) }]} onPress={() => { tap(); setShowModes(true); }}>
        <View style={s.playShine} />
        <View style={s.playArrowHead} />
        <View style={s.playInner}>
          <Svg width={30} height={30} viewBox="0 0 24 24"><Polygon points="6,3.5 21,12 6,20.5" fill="#fff" /></Svg>
          <Text style={s.playTxt}>CHƠI</Text>
        </View>
      </Pressable>
      {/* ===== OVERLAY CHON CHE DO NHANH ===== */}
      {showModes && (
        <View style={s.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowModes(false)} />
          <View style={[s.modePanel, { width: Math.min(600, winW - 32) }]}>
            <Text style={s.modeTitle}>CHỌN CHẾ ĐỘ CHƠI</Text>
            {MODES.map(m => (
              <Pressable key={m.title} style={[s.modeRow, m.featured && s.modeRowFeatured]} onPress={() => go(m.route)}>
                <View style={s.modeDisc}><SpriteUnit spec={m.spec} size={52} state="idle" /></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={s.modeName}>{m.title}</Text>
                    {m.featured && (<View style={s.onlineBadge}><Text style={s.onlineBadgeTxt}>ONLINE</Text></View>)}
                  </View>
                  <Text style={s.modeDesc}>{m.desc}</Text>
                </View>
                <Text style={s.modeArrow}>›</Text>
              </Pressable>
            ))}
            <Pressable style={s.closeBtn} onPress={() => setShowModes(false)}><Text style={s.closeTxt}>Đóng</Text></Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  screen:{ flex:1, backgroundColor:'#0a2e26', overflow:'hidden' },
  topBar:{ position:'absolute', top:0, left:0, right:0, flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', paddingHorizontal:16, paddingTop:12, zIndex:20 },
  playerBox:{ flexDirection:'row', alignItems:'center', gap:10 },
  avatar:{ width:46, height:46, borderRadius:23, borderWidth:2, borderColor:'#ffd60a', backgroundColor:'#123c33', overflow:'hidden', position:'relative' },
  playerName:{ fontSize:16, fontWeight:'900', color:'#fff', textShadowColor:'rgba(0,0,0,0.65)', textShadowOffset:{ width:0, height:1 }, textShadowRadius:4, maxWidth:190 },
  playerSub:{ fontSize:11, fontWeight:'700', color:'#ffe9a8', textShadowColor:'rgba(0,0,0,0.6)', textShadowOffset:{ width:0, height:1 }, textShadowRadius:3 },
  topRight:{ flexDirection:'row', alignItems:'center', gap:8 },
  gemPill:{ flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'rgba(8,18,34,0.82)', borderRadius:999, borderWidth:1.5, borderColor:'#c9a227', paddingLeft:9, paddingRight:4, paddingVertical:4 },
  gemTxt:{ fontSize:15, fontWeight:'900', color:'#ffd60a' },
  gemPlus:{ width:20, height:20, borderRadius:10, backgroundColor:'#38b000', alignItems:'center', justifyContent:'center' },
  gemPlusTxt:{ color:'#fff', fontWeight:'900', fontSize:14, lineHeight:16 },
  roundBtn:{ width:38, height:38, borderRadius:19, backgroundColor:'rgba(8,18,34,0.78)', borderWidth:1.5, borderColor:'rgba(255,255,255,0.55)', alignItems:'center', justifyContent:'center', position:'relative' },
  roundBtnOff:{ opacity:0.55 },
  roundBtnSlash:{ position:'absolute', width:30, height:2.4, backgroundColor:'#ef476f', transform:[{ rotate:'-38deg' }], borderRadius:2 },
  mascotWrap:{ position:'absolute', zIndex:5 },
  menu:{ position:'absolute', zIndex:15, gap:15, maxWidth:330 },
  menuItem:{ flexDirection:'row', alignItems:'flex-start', gap:11 },
  menuTxt:{ fontSize:17.5, fontWeight:'900', color:'#fff', letterSpacing:0.7, textShadowColor:'rgba(0,0,0,0.7)', textShadowOffset:{ width:0, height:2 }, textShadowRadius:5 },
  lvBadge:{ backgroundColor:'#f5c542', borderRadius:5, paddingHorizontal:6, paddingVertical:1.5, borderWidth:1, borderColor:'#a86e00' },
  lvTxt:{ fontSize:10.5, fontWeight:'900', color:'#23180a' },
  progressTrack:{ marginTop:5, width:158, height:6, borderRadius:3, backgroundColor:'rgba(255,255,255,0.28)', borderWidth:1, borderColor:'rgba(0,0,0,0.35)', overflow:'hidden' },
  progressFill:{ height:6, backgroundColor:'#4dabff', borderRadius:3 },
  menuTag:{ marginTop:4, fontSize:10.5, fontWeight:'800', color:'#ffd60a', textShadowColor:'rgba(0,0,0,0.7)', textShadowOffset:{ width:0, height:1 }, textShadowRadius:3 },
  statsLine:{ marginTop:2, fontSize:11, fontWeight:'700', color:'rgba(255,255,255,0.75)', textShadowColor:'rgba(0,0,0,0.7)', textShadowOffset:{ width:0, height:1 }, textShadowRadius:3 },
  featureCard:{ position:'absolute', width:196, borderRadius:13, overflow:'hidden', borderWidth:2, borderColor:'#ffd60a', backgroundColor:'#10182e', zIndex:12, shadowColor:'#000', shadowOpacity:0.45, shadowRadius:10, shadowOffset:{ width:0, height:4 }, elevation:6 },
  featureBadge:{ position:'absolute', left:7, top:7, backgroundColor:'#ffd60a', borderRadius:5, paddingHorizontal:6, paddingVertical:2 },
  featureBadgeTxt:{ fontSize:9.5, fontWeight:'900', color:'#23180a', letterSpacing:0.5 },
  featureStrip:{ paddingHorizontal:9, paddingVertical:7, gap:1 },
  featureTitle:{ fontSize:12.5, fontWeight:'900', color:'#fff' },
  featureDesc:{ fontSize:10.5, fontWeight:'700', color:'#aab4d4' },
  mascotNav:{ position:'absolute', left:0, right:0, alignItems:'center', gap:6, zIndex:11 },
  mascotName:{ fontSize:13.5, fontWeight:'900', color:'#fff', textShadowColor:'rgba(0,0,0,0.75)', textShadowOffset:{ width:0, height:1 }, textShadowRadius:5 },
  dotsRow:{ flexDirection:'row', gap:8 },
  dot:{ width:11, height:11, borderRadius:6, backgroundColor:'rgba(255,255,255,0.45)', borderWidth:1, borderColor:'rgba(0,0,0,0.35)' },
  dotOn:{ backgroundColor:'#ffd60a', transform:[{ scale:1.3 }] },
  playBtn:{ position:'absolute', width:238, height:78, borderRadius:18, backgroundColor:'#0b5ed7', borderWidth:2.5, borderColor:'#9fd8ff', overflow:'hidden', zIndex:14, shadowColor:'#38bdf8', shadowOpacity:0.55, shadowRadius:16, shadowOffset:{ width:0, height:4 }, elevation:10 },
  playShine:{ position:'absolute', left:0, right:0, top:0, height:36, backgroundColor:'rgba(255,255,255,0.30)', borderBottomLeftRadius:26, borderBottomRightRadius:26 },
  playArrowHead:{ position:'absolute', right:-17, top:20, width:38, height:38, backgroundColor:'#38bdf8', borderWidth:2.5, borderColor:'#9fd8ff', transform:[{ rotate:'45deg' }] },
  playInner:{ flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:10, paddingRight:12 },
  playTxt:{ fontSize:31, fontWeight:'900', color:'#fff', letterSpacing:3, textShadowColor:'rgba(3,50,110,0.8)', textShadowOffset:{ width:0, height:2 }, textShadowRadius:4 },
  overlay:{ position:'absolute', left:0, top:0, right:0, bottom:0, backgroundColor:'rgba(5,9,22,0.6)', alignItems:'center', justifyContent:'center', zIndex:40, padding:16 },
  modePanel:{ backgroundColor:'rgba(16,23,46,0.97)', borderRadius:20, borderWidth:2, borderColor:'#c9a227', padding:16, gap:9, maxHeight:'94%' },
  modeTitle:{ fontSize:19, fontWeight:'900', color:'#f5d67b', textAlign:'center', letterSpacing:1.2 },
  modeRow:{ flexDirection:'row', alignItems:'center', gap:11, backgroundColor:'#1e2748', borderRadius:14, borderWidth:1.5, borderColor:'#46538a', paddingHorizontal:11, paddingVertical:7 },
  modeRowFeatured:{ borderColor:'#ffd60a', backgroundColor:'#26264a' },
  modeDisc:{ width:58, height:58, borderRadius:29, backgroundColor:'#141b33', borderWidth:1.5, borderColor:'#c9a22788', alignItems:'center', justifyContent:'center', overflow:'hidden' },
  modeName:{ fontSize:15.5, fontWeight:'900', color:'#f8fafc' },
  modeDesc:{ fontSize:11.5, color:'#aab4d4', lineHeight:15 },
  modeArrow:{ fontSize:30, fontWeight:'900', color:'#f2c230', lineHeight:32 },
  onlineBadge:{ backgroundColor:'#ffd60a', borderRadius:5, paddingHorizontal:6, paddingVertical:1.5 },
  onlineBadgeTxt:{ fontSize:9.5, fontWeight:'900', color:'#23180a', letterSpacing:0.6 },
  closeBtn:{ alignSelf:'center', backgroundColor:'#2f6db3', borderRadius:999, paddingHorizontal:22, paddingVertical:8, borderBottomWidth:4, borderBottomColor:'#1c4472', marginTop:2 },
  closeTxt:{ color:'#fff', fontWeight:'800', fontSize:13 },
});
