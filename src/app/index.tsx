import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { HomeScene, welcomeSpecs } from '../components/SceneArt';
import ChibiRig from '../components/ChibiRig';
import { loadMeta, loadSettings, saveSettings, MetaState, defaultMeta } from '../game/storage';
import { TOTAL_STAGES } from '../game/stages';
import { audio } from '../game/audio';
export default function Home() {
  const [meta, setMeta] = useState<MetaState>(defaultMeta);
  const [musicOn, setMusicOn] = useState(true); const [sfxOn, setSfxOn] = useState(true);
  useEffect(() => { loadMeta().then(setMeta); loadSettings().then(s => { setMusicOn(s.music); setSfxOn(s.sfx); audio.setMusicEnabled(s.music); audio.setSfxEnabled(s.sfx); }); }, []);
  function tap() { audio.unlock(); audio.playSfx('click'); if (musicOn) audio.startBgm('home'); }
  async function toggleAudio(kind: 'music'|'sfx') { audio.unlock(); const s = await loadSettings(); if (kind==='music') { s.music = !s.music; setMusicOn(s.music); audio.setMusicEnabled(s.music); if (s.music) audio.startBgm('home'); else audio.stopBgm(); } else { s.sfx = !s.sfx; setSfxOn(s.sfx); audio.setSfxEnabled(s.sfx); if (s.sfx) audio.playSfx('click'); } await saveSettings(s); }
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 13, alignItems: 'center' }}>
      <View style={{ position: 'relative', alignItems: 'center' }}>
        <HomeScene width={340}/>
        <View style={{ position: 'absolute', bottom: 6, flexDirection: 'row', gap: 2 }}>
          {welcomeSpecs.map((d, i) => <ChibiRig key={d.id} spec={d} size={i===1||i===2?96:78} state={i%2?'victory':'idle'}/>)}
        </View>
      </View>
      <Text style={s.title}>Đấu Trường Chibi</Text>
      <Text style={s.sub}>Game auto-battler kiểu TFT với tranh vẽ chibi 2.5D, nhân vật chuyển động bằng hệ thống xương kiểu Spine tự xây và nhạc nền tổng hợp. Màn hình trận đấu ngang chuẩn TFT: sàn hex, panel tộc/hệ, bảng 8 người chơi, vòng chọn carousel và cường hóa ở 2-1, 3-2, 4-2.</Text>
      <View style={s.metaRow}><Text style={s.metaChip}>Ngọc: {meta.gems}</Text><Text style={s.metaChip}>Tiến độ PvE: {Math.min(meta.unlockedStage, TOTAL_STAGES)}/{TOTAL_STAGES} màn</Text><Text style={s.metaChip}>Kỷ lục sóng: {meta.bestWave}</Text><Text style={s.metaChip}>Hạng tốt nhất: {meta.bestRank}/8</Text><Text style={s.metaChip}>Số trận thắng: {meta.wins}</Text></View>
      {!meta.tutorialDone && (
        <Pressable style={[s.btn, s.tutorial]} onPress={() => { tap(); router.push('/game?mode=tutorial'); }}><Text style={s.btnTxt}>Lần đầu chơi? Học chơi tương tác với mascot (thưởng 50 Ngọc)</Text></Pressable>
      )}
      <Pressable style={[s.btn, s.online]} onPress={() => { tap(); router.push('/online'); }}><Text style={s.btnTxt}>PvP Online — Người đấu người qua mạng</Text></Pressable>
      <Pressable style={[s.btn, s.primary]} onPress={() => { tap(); router.push('/game?mode=arena'); }}><Text style={s.btnTxt}>Đấu với AI (offline)</Text></Pressable>
      <Pressable style={[s.btn, s.green]} onPress={() => { tap(); router.push('/campaign'); }}><Text style={s.btnTxt}>Chiến Dịch PvE ({TOTAL_STAGES} màn, Boss mỗi 10 màn)</Text></Pressable>
      <Pressable style={[s.btn, s.purple]} onPress={() => { tap(); router.push('/game?mode=waves'); }}><Text style={s.btnTxt}>Thử Thách Sóng Quái (vô hạn)</Text></Pressable>
      <Pressable style={[s.btn, s.teal]} onPress={() => { tap(); router.push('/game?mode=tutorial'); }}><Text style={s.btnTxt}>Hướng Dẫn Chơi Tương Tác</Text></Pressable>
      <Pressable style={[s.btn, s.gray]} onPress={() => { tap(); router.push('/collection'); }}><Text style={s.btnTxt}>Bộ Sưu Tập Tướng</Text></Pressable>
      <Pressable style={[s.btn, s.gray]} onPress={() => { tap(); router.push('/guide'); }}><Text style={s.btnTxt}>Hướng Dẫn Cách Chơi (đọc)</Text></Pressable>
      <View style={s.settings}>
        <Text style={s.setTitle}>Cài đặt âm thanh</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable style={[s.setBtn, musicOn && s.setOn]} onPress={() => toggleAudio('music')}><Text style={s.setTxt}>Nhạc nền: {musicOn ? 'Bật' : 'Tắt'}</Text></Pressable>
          <Pressable style={[s.setBtn, sfxOn && s.setOn]} onPress={() => toggleAudio('sfx')}><Text style={s.setTxt}>Hiệu ứng: {sfxOn ? 'Bật' : 'Tắt'}</Text></Pressable>
        </View>
        <Text style={s.setNote}>Nhạc và tiếng được tổng hợp bằng code (chiptune) — trên web phát bằng Web Audio, bắt đầu sau thao tác đầu tiên của bạn.</Text>
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({ screen:{ flex:1, backgroundColor:'#fff7fb' }, title:{ fontSize:30, fontWeight:'900', color:'#7b2d5b' }, sub:{ textAlign:'center', color:'#555', maxWidth:620, lineHeight:20 }, metaRow:{ flexDirection:'row', flexWrap:'wrap', gap:8, justifyContent:'center' }, metaChip:{ backgroundColor:'#ffe3ef', borderRadius:999, paddingHorizontal:12, paddingVertical:6, fontWeight:'700', color:'#7b2d5b' }, btn:{ width:'100%', maxWidth:560, borderRadius:999, paddingVertical:14, alignItems:'center', shadowColor:'#000', shadowOpacity:0.15, shadowRadius:6, elevation:3 }, tutorial:{ backgroundColor:'#ffb703' }, online:{ backgroundColor:'#4361ee' }, primary:{ backgroundColor:'#ff70a6' }, green:{ backgroundColor:'#38b000' }, purple:{ backgroundColor:'#7b5ea7' }, teal:{ backgroundColor:'#159e8f' }, gray:{ backgroundColor:'#6c757d' }, btnTxt:{ color:'#fff', fontWeight:'800', fontSize:16, textAlign:'center', paddingHorizontal:10 }, settings:{ width:'100%', maxWidth:560, backgroundColor:'#fff', borderRadius:16, padding:12, gap:8, alignItems:'center', borderWidth:1, borderColor:'#ffd6e0' }, setTitle:{ fontWeight:'900', color:'#7b2d5b' }, setBtn:{ backgroundColor:'#e9ecef', borderRadius:999, paddingHorizontal:14, paddingVertical:8 }, setOn:{ backgroundColor:'#c8f7dc' }, setTxt:{ fontWeight:'700', color:'#333' }, setNote:{ fontSize:11, color:'#888', textAlign:'center', lineHeight:15 } });
