import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { CAMPAIGN } from '../game/data';
import { ChapterScene } from '../components/SceneArt';
import ChibiRig from '../components/ChibiRig';
import { MONSTERS } from '../game/data';
import { loadMeta, MetaState, defaultMeta } from '../game/storage';
export default function CampaignMap() {
  const [meta, setMeta] = useState<MetaState>(defaultMeta);
  useEffect(() => { loadMeta().then(setMeta); }, []);
  return (<ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 14 }}>
    <Text style={s.h}>Bản đồ Chiến Dịch PvE</Text>
    <Text style={s.sub}>Thắng ải để mở ải sau. Sao: 3 sao khi còn nhiều quân sống sót, 2 sao mức vừa, 1 sao khi thắng sát nút. Mỗi chương kết thúc bằng một Boss.</Text>
    {[1,2,3].map(ch => (<View key={ch} style={{ gap: 8 }}>
      <ChapterScene chapter={ch} width={330}/>
      <Text style={s.chapter}>Chương {ch}: {ch===1?'Rừng Xanh Yên Bình':ch===2?'Sa Mạc Và Lâu Đài Xương':'Vương Quốc Bóng Đêm'}</Text>
      <View style={s.grid}>{CAMPAIGN.filter(st => st.chapter===ch).map(st => { const locked = st.id > meta.unlockedStage; const stars = meta.campaignStars[String(st.id)] ?? 0; const boss = st.enemies.some(e => e.id.includes('boss') || e.id==='golem');
        return (<Pressable key={st.id} disabled={locked} onPress={() => router.push('/game?mode=campaign&stage='+st.id)} style={[s.node, locked && s.locked, boss && s.boss]}>
          <ChibiRig spec={MONSTERS[Math.min(MONSTERS.length-1, st.id-1)]} size={54} state={locked?'idle':'walk'}/>
          <Text style={s.nodeName}>{st.id}. {st.name}</Text>
          <Text style={s.stars}>{locked?'Chưa mở khóa':(stars? 'Sao đạt được: '+stars+'/3' : 'Chưa thắng')}</Text>
          <Text style={s.reward}>Thưởng: {st.reward} Ngọc</Text>
        </Pressable>); })}</View>
    </View>))}
  </ScrollView>);
}
const s = StyleSheet.create({ screen:{ flex:1, backgroundColor:'#fff7fb' }, h:{ fontSize:24, fontWeight:'900', color:'#7b2d5b' }, sub:{ color:'#555', lineHeight:19 }, chapter:{ fontSize:18, fontWeight:'800', color:'#5b3a29' }, grid:{ flexDirection:'row', flexWrap:'wrap', gap:10 }, node:{ backgroundColor:'#fff', borderRadius:16, padding:10, width:158, alignItems:'center', gap:2, borderWidth:1, borderColor:'#ffd6e0' }, boss:{ borderColor:'#ffb703', borderWidth:2, backgroundColor:'#fff8e1' }, locked:{ opacity:0.5 }, nodeName:{ fontWeight:'800', textAlign:'center' }, stars:{ fontSize:12, color:'#e07b00', fontWeight:'700' }, reward:{ fontSize:12, color:'#555' } });
