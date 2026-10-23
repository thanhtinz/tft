import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { HomeScene, welcomeSpecs } from '../components/SceneArt';
import ChibiRig from '../components/ChibiRig';
import { loadMeta, MetaState, defaultMeta } from '../game/storage';
export default function Home() {
  const [meta, setMeta] = useState<MetaState>(defaultMeta);
  useEffect(() => { loadMeta().then(setMeta); }, []);
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 14, alignItems: 'center' }}>
      <View style={{ position: 'relative', alignItems: 'center' }}>
        <HomeScene width={340}/>
        <View style={{ position: 'absolute', bottom: 6, flexDirection: 'row', gap: 2 }}>
          {welcomeSpecs.map((d, i) => <ChibiRig key={d.id} spec={d} size={i===1||i===2?96:78} state={i%2?'victory':'idle'}/>)}
        </View>
      </View>
      <Text style={s.title}>Đấu Trường Chibi</Text>
      <Text style={s.sub}>Game auto-battler kiểu TFT với tranh vẽ chibi 2.5D và nhân vật chuyển động bằng hệ thống xương kiểu Spine tự xây. Mua tướng, ghép sao, kích tộc/hệ, gắn trang bị và chiến thắng!</Text>
      <View style={s.metaRow}><Text style={s.metaChip}>Ngọc: {meta.gems}</Text><Text style={s.metaChip}>Kỷ lục sóng: {meta.bestWave}</Text><Text style={s.metaChip}>Hạng tốt nhất: {meta.bestRank}/8</Text><Text style={s.metaChip}>Số trận thắng: {meta.wins}</Text></View>
      <Pressable style={[s.btn, s.primary]} onPress={() => router.push('/game?mode=arena')}><Text style={s.btnTxt}>Đấu Trường (PvP với 7 AI)</Text></Pressable>
      <Pressable style={[s.btn, s.green]} onPress={() => router.push('/campaign')}><Text style={s.btnTxt}>Chiến Dịch PvE (12 ải, 3 chương)</Text></Pressable>
      <Pressable style={[s.btn, s.purple]} onPress={() => router.push('/game?mode=waves')}><Text style={s.btnTxt}>Thử Thách Sóng Quái (vô hạn)</Text></Pressable>
      <Pressable style={[s.btn, s.gray]} onPress={() => router.push('/collection')}><Text style={s.btnTxt}>Bộ Sưu Tập Tướng</Text></Pressable>
      <Pressable style={[s.btn, s.gray]} onPress={() => router.push('/guide')}><Text style={s.btnTxt}>Hướng Dẫn Cách Chơi</Text></Pressable>
    </ScrollView>
  );
}
const s = StyleSheet.create({ screen:{ flex:1, backgroundColor:'#fff7fb' }, title:{ fontSize:30, fontWeight:'900', color:'#7b2d5b' }, sub:{ textAlign:'center', color:'#555', maxWidth:560, lineHeight:20 }, metaRow:{ flexDirection:'row', flexWrap:'wrap', gap:8, justifyContent:'center' }, metaChip:{ backgroundColor:'#ffe3ef', borderRadius:999, paddingHorizontal:12, paddingVertical:6, fontWeight:'700', color:'#7b2d5b' }, btn:{ width:'100%', maxWidth:520, borderRadius:999, paddingVertical:14, alignItems:'center', shadowColor:'#000', shadowOpacity:0.15, shadowRadius:6, elevation:3 }, primary:{ backgroundColor:'#ff70a6' }, green:{ backgroundColor:'#38b000' }, purple:{ backgroundColor:'#7b5ea7' }, gray:{ backgroundColor:'#6c757d' }, btnTxt:{ color:'#fff', fontWeight:'800', fontSize:16 } });
