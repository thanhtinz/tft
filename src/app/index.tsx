import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { router } from 'expo-router';
import { HomeScene, welcomeSpecs, bossSpec } from '../components/SceneArt';
import ChibiRig from '../components/ChibiRig';
import { loadMeta, loadSettings, saveSettings, MetaState, defaultMeta } from '../game/storage';
import { TOTAL_STAGES } from '../game/stages';
import { CHAMPIONS, champById, monsterById } from '../game/data';
import { audio } from '../game/audio';

function StarsOverlay({ width, height }: { width: number; height: number }) {
  const stars: [number, number, number, number][] = [
    [0.06, 0.14, 1.6, 0.9], [0.16, 0.3, 1.1, 0.6], [0.28, 0.1, 1.3, 0.75], [0.42, 0.22, 1, 0.55],
    [0.55, 0.08, 1.7, 0.9], [0.68, 0.26, 1.1, 0.6], [0.8, 0.12, 1.4, 0.8], [0.92, 0.3, 1.2, 0.65],
    [0.36, 0.38, 0.9, 0.45], [0.74, 0.4, 0.9, 0.45], [0.1, 0.48, 0.8, 0.4], [0.9, 0.52, 0.8, 0.4],
  ];
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      <Rect width={width} height={height} fill="#ff7a45" opacity={0.10} />
      <Rect y={height * 0.45} width={width} height={height * 0.55} fill="#ff4d6d" opacity={0.08} />
      {stars.map(([x, y, r, o], i) => (
        <Circle key={i} cx={width * x} cy={height * y} r={r} fill="#ffe9a8" opacity={o} />
      ))}
    </Svg>
  );
}

type BannerProps = {
  spec: any;
  accent: string;
  disc: string;
  title: string;
  desc: string;
  badge?: string;
  featured?: boolean;
  onPress: () => void;
};

function ModeBanner({ spec, accent, disc, title, desc, badge, featured, onPress }: BannerProps) {
  return (
    <Pressable
      style={[s.banner, { borderColor: accent }, featured && s.bannerFeatured]}
      onPress={onPress}
    >
      <View style={[s.bannerDisc, { backgroundColor: disc, borderColor: accent }]}>
        <ChibiRig spec={spec} size={62} state="idle" />
      </View>
      <View style={s.bannerMid}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={s.bannerTitle}>{title}</Text>
          {badge ? (
            <View style={s.badge}>
              <Text style={s.badgeTxt}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={s.bannerDesc}>{desc}</Text>
      </View>
      <Text style={s.bannerArrow}>›</Text>
    </Pressable>
  );
}

export default function Home() {
  const [meta, setMeta] = useState<MetaState>(defaultMeta);
  const [musicOn, setMusicOn] = useState(true); const [sfxOn, setSfxOn] = useState(true);
  const { width: winW } = useWindowDimensions();
  const heroW = Math.min(Math.max(winW - 32, 300), 880);
  const heroH = heroW * 0.52;
  useEffect(() => { loadMeta().then(setMeta); loadSettings().then(s => { setMusicOn(s.music); setSfxOn(s.sfx); audio.setMusicEnabled(s.music); audio.setSfxEnabled(s.sfx); }); }, []);
  function tap() { audio.unlock(); audio.playSfx('click'); if (musicOn) audio.startBgm('home'); }
  async function toggleAudio(kind: 'music'|'sfx') { audio.unlock(); const s = await loadSettings(); if (kind==='music') { s.music = !s.music; setMusicOn(s.music); audio.setMusicEnabled(s.music); if (s.music) audio.startBgm('home'); else audio.stopBgm(); } else { s.sfx = !s.sfx; setSfxOn(s.sfx); audio.setSfxEnabled(s.sfx); if (s.sfx) audio.playSfx('click'); } await saveSettings(s); }
  const heroSpecs = [...welcomeSpecs, champById('drago'), bossSpec];
  const showcase = [0, 3, 6, 9, 12, 15, 18, 20, 22, 24].map(i => CHAMPIONS[i]).filter(Boolean);
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 14, alignItems: 'center' }}>
      <View style={[s.hero, { width: heroW }]}>
        <HomeScene width={heroW}/>
        <StarsOverlay width={heroW} height={heroH} />
        <View style={s.heroFloor} />
        <View style={s.heroRow}>
          {heroSpecs.map((d, i) => <ChibiRig key={d.id} spec={d} size={i===1||i===2?112:i===5?118:96} state={i%2?'victory':'idle'}/>)}
        </View>
      </View>
      <Text style={s.title}>Đấu Trường Chibi</Text>
      <Text style={s.sub}>Auto-battler chibi kiểu TFT: xây đội hình, ghép sao, đấu PvP online và chinh phục 5.200 màn PvE.</Text>
      <View style={s.metaRow}><Text style={s.metaChip}>Ngọc: {meta.gems}</Text><Text style={s.metaChip}>Tiến độ PvE: {Math.min(meta.unlockedStage, TOTAL_STAGES)}/{TOTAL_STAGES} màn</Text><Text style={s.metaChip}>Kỷ lục sóng: {meta.bestWave}</Text><Text style={s.metaChip}>Hạng tốt nhất: {meta.bestRank}/8</Text><Text style={s.metaChip}>Số trận thắng: {meta.wins}</Text></View>
      {!meta.tutorialDone && (
        <Pressable style={s.tutorialBanner} onPress={() => { tap(); router.push('/game?mode=tutorial'); }}>
          <View style={s.tutorialDisc}>
            <ChibiRig spec={champById('nana')} size={62} state="victory" />
          </View>
          <View style={s.bannerMid}>
            <Text style={s.tutorialTitle}>Lần đầu chơi? Học chơi tương tác</Text>
            <Text style={s.tutorialDesc}>Chơi cùng mascot Nana — hoàn thành nhận thưởng 50 Ngọc</Text>
          </View>
          <Text style={s.tutorialArrow}>›</Text>
        </Pressable>
      )}
      <ModeBanner spec={champById('astro')} accent="#f2c230" disc="#26356e" title="PvP Online" desc="Người đấu người qua mạng — tạo phòng, ghép nhanh" badge="ONLINE" featured onPress={() => { tap(); router.push('/online'); }} />
      <ModeBanner spec={champById('drago')} accent="#c9a227" disc="#3a2340" title="Đấu với AI" desc="Đấu trường offline với 7 đối thủ máy" onPress={() => { tap(); router.push('/game?mode=arena'); }} />
      <ModeBanner spec={monsterById('kingboss')} accent="#4ade80" disc="#17351f" title="Chiến Dịch PvE" desc={`${TOTAL_STAGES} màn, Boss mỗi 10 màn`} onPress={() => { tap(); router.push('/campaign'); }} />
      <ModeBanner spec={monsterById('soi')} accent="#a78bfa" disc="#2a2145" title="Thử Thách Sóng Quái" desc="Sóng quái vô hạn — phá kỷ lục của bạn" onPress={() => { tap(); router.push('/game?mode=waves'); }} />
      <ModeBanner spec={champById('nana')} accent="#2dd4bf" disc="#123a38" title="Hướng Dẫn Chơi Tương Tác" desc="Học từng bước cùng mascot Nana" onPress={() => { tap(); router.push('/game?mode=tutorial'); }} />
      <ModeBanner spec={champById('luna')} accent="#94a3b8" disc="#232c42" title="Bộ Sưu Tập Tướng" desc="Xem tướng, quái, tộc/hệ và trang bị" onPress={() => { tap(); router.push('/collection'); }} />
      <ModeBanner spec={champById('lulu')} accent="#7dd3fc" disc="#1b2f45" title="Hướng Dẫn Cách Chơi" desc="Đọc luật chơi, kinh tế và xếp đội hình" onPress={() => { tap(); router.push('/guide'); }} />
      <View style={[s.showcaseWrap, { width: Math.min(winW - 32, 880) }]}>
        <Text style={s.showcaseTitle}>Đội hình chibi tiêu biểu</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.showcaseRow}>
          {showcase.map(d => (
            <View key={d.id} style={s.showcaseItem}>
              <ChibiRig spec={d} size={54} state="idle" />
              <Text style={s.showcaseName} numberOfLines={1}>{d.name}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
      <View style={s.settings}>
        <Text style={s.setTitle}>Cài đặt âm thanh</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable style={[s.setBtn, musicOn && s.setOn]} onPress={() => toggleAudio('music')}><Text style={[s.setTxt, musicOn && s.setTxtOn]}>Nhạc nền: {musicOn ? 'Bật' : 'Tắt'}</Text></Pressable>
          <Pressable style={[s.setBtn, sfxOn && s.setOn]} onPress={() => toggleAudio('sfx')}><Text style={[s.setTxt, sfxOn && s.setTxtOn]}>Hiệu ứng: {sfxOn ? 'Bật' : 'Tắt'}</Text></Pressable>
        </View>
        <Text style={s.setNote}>Nhạc và tiếng tổng hợp bằng code (chiptune) — trên web phát bằng Web Audio, bắt đầu sau thao tác đầu tiên của bạn.</Text>
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  screen:{ flex:1, backgroundColor:'#0d1326' },
  hero:{ position:'relative', alignItems:'center', alignSelf:'center', borderRadius:18, overflow:'hidden', borderWidth:1.5, borderColor:'#c9a22788', backgroundColor:'#141d38' },
  heroFloor:{ position:'absolute', left:0, right:0, bottom:0, height:26, backgroundColor:'#0a0f1f', opacity:0.45, borderTopWidth:1, borderTopColor:'#c9a22766' },
  heroRow:{ position:'absolute', bottom:2, left:0, right:0, flexDirection:'row', justifyContent:'center', alignItems:'flex-end', gap:2 },
  title:{ fontSize:44, fontWeight:'900', color:'#ffe27a', textAlign:'center', letterSpacing:0.5, textShadowColor:'#9a6a00', textShadowOffset:{ width:0, height:3 }, textShadowRadius:14, marginTop:2 },
  sub:{ textAlign:'center', color:'#aab4d4', maxWidth:620, lineHeight:20, fontSize:14 },
  metaRow:{ flexDirection:'row', flexWrap:'wrap', gap:8, justifyContent:'center', maxWidth:880 },
  metaChip:{ backgroundColor:'rgba(28,37,71,0.92)', borderWidth:1, borderColor:'#c9a22788', borderRadius:10, paddingHorizontal:12, paddingVertical:6, fontWeight:'700', color:'#f5d67b', overflow:'hidden' },
  banner:{ width:'100%', maxWidth:880, flexDirection:'row', alignItems:'center', gap:12, backgroundColor:'#1c2547', borderRadius:16, borderWidth:1.5, paddingHorizontal:14, paddingVertical:10, shadowColor:'#000', shadowOpacity:0.35, shadowRadius:8, shadowOffset:{ width:0, height:3 }, elevation:4 },
  bannerFeatured:{ borderWidth:2, borderColor:'#ffd60a', backgroundColor:'#232c52', shadowColor:'#f2c230', shadowOpacity:0.35, shadowRadius:10 },
  bannerDisc:{ width:72, height:72, borderRadius:36, borderWidth:1.5, alignItems:'center', justifyContent:'center', overflow:'hidden' },
  bannerMid:{ flex:1, gap:3 },
  bannerTitle:{ fontSize:17, fontWeight:'900', color:'#f8fafc' },
  bannerDesc:{ fontSize:12.5, color:'#aab4d4', lineHeight:17 },
  bannerArrow:{ fontSize:34, fontWeight:'900', color:'#f2c230', lineHeight:36, paddingHorizontal:2 },
  badge:{ backgroundColor:'#ffd60a', borderRadius:6, paddingHorizontal:7, paddingVertical:2 },
  badgeTxt:{ fontSize:10, fontWeight:'900', color:'#1a1400', letterSpacing:0.8 },
  tutorialBanner:{ width:'100%', maxWidth:880, flexDirection:'row', alignItems:'center', gap:12, backgroundColor:'#8a6d12', borderRadius:16, borderWidth:2, borderColor:'#ffd60a', paddingHorizontal:14, paddingVertical:10, shadowColor:'#ffd60a', shadowOpacity:0.3, shadowRadius:10, shadowOffset:{ width:0, height:3 }, elevation:5 },
  tutorialDisc:{ width:72, height:72, borderRadius:36, borderWidth:1.5, borderColor:'#ffd60a', backgroundColor:'#3d3410', alignItems:'center', justifyContent:'center', overflow:'hidden' },
  tutorialTitle:{ fontSize:16, fontWeight:'900', color:'#fff3b0' },
  tutorialDesc:{ fontSize:12.5, color:'#ffe9a8', lineHeight:17 },
  tutorialArrow:{ fontSize:34, fontWeight:'900', color:'#ffd60a', lineHeight:36, paddingHorizontal:2 },
  showcaseWrap:{ backgroundColor:'#0a0f22', borderTopWidth:1, borderTopColor:'#c9a22755', borderRadius:14, paddingTop:10, paddingBottom:8, gap:6 },
  showcaseTitle:{ fontSize:12, fontWeight:'800', color:'#f5d67b', letterSpacing:0.6, textAlign:'center', textTransform:'uppercase' },
  showcaseRow:{ gap:14, paddingHorizontal:14, alignItems:'flex-end' },
  showcaseItem:{ alignItems:'center', gap:2, width:72 },
  showcaseName:{ fontSize:10, fontWeight:'700', color:'#cbd5e1', textAlign:'center' },
  settings:{ width:'100%', maxWidth:880, backgroundColor:'#141d38', borderRadius:16, padding:14, gap:10, alignItems:'center', borderWidth:1, borderColor:'#c9a22755' },
  setTitle:{ fontWeight:'900', color:'#f5d67b', fontSize:15 },
  setBtn:{ backgroundColor:'#232c52', borderRadius:10, borderWidth:1, borderColor:'#3b4a7a', paddingHorizontal:14, paddingVertical:9 },
  setOn:{ backgroundColor:'#c9a227', borderColor:'#ffd60a' },
  setTxt:{ fontWeight:'700', color:'#aab4d4' },
  setTxtOn:{ color:'#171106' },
  setNote:{ fontSize:11, color:'#7f8bb0', textAlign:'center', lineHeight:15, maxWidth:560 },
});
