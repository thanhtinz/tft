import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CHAMPIONS, ITEMS, MONSTERS, TRAITS, traitName } from '../game/data';
import ChibiRig from '../components/ChibiRig';
import { ItemArt } from '../components/ChibiArt';
export default function Collection() {
  return (<ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 12 }}>
    <Text style={s.h}>Bộ Sưu Tập - {CHAMPIONS.length} tướng chibi (đều đang chuyển động idle bằng rig xương)</Text>
    <View style={s.grid}>{CHAMPIONS.map(d => (<View key={d.id} style={s.card}>
      <ChibiRig spec={d} size={96} state='idle'/>
      <Text style={s.name}>{d.name} - {d.cost} vàng</Text>
      <Text style={s.trait}>{d.traits.map(traitName).join(' / ')}</Text>
      <Text style={s.stats}>Máu {d.hp} - ST {d.ad} - Giáp {d.armor} - KP {d.mr}</Text>
      <Text style={s.stats}>Tốc đánh {d.as} - Tầm {d.range} - Mana {d.mana}</Text>
      <Text style={s.skill}>Kỹ năng: {d.skill.name}</Text><Text style={s.desc}>{d.skill.desc}</Text>
    </View>))}</View>
    <Text style={s.h}>Quái PvE và Boss</Text>
    <View style={s.grid}>{MONSTERS.map(m => (<View key={m.id} style={s.card}><ChibiRig spec={m} size={m.id.includes('boss')?118:88} state={m.id.includes('boss')?'cast':'walk'}/><Text style={s.name}>{m.name}</Text><Text style={s.stats}>Máu {m.hp} - ST {m.ad}</Text><Text style={s.skill}>{m.skill.name}: {m.skill.desc}</Text></View>))}</View>
    <Text style={s.h}>Tộc / Hệ</Text>
    {TRAITS.map(t => <Text key={t.id} style={s.line}><Text style={s.name}>{t.name}</Text> (mốc {t.thresholds.join(' / ')}): {t.desc}</Text>)}
    <Text style={s.h}>Trang bị ({ITEMS.length})</Text>
    <View style={s.grid}>{ITEMS.map(it => (<View key={it.id} style={s.itemCard}><ItemArt color={it.color} size={52}/><Text style={s.name}>{it.name}</Text><Text style={s.desc}>{it.desc}</Text></View>))}</View>
  </ScrollView>);
}
const s = StyleSheet.create({ screen:{ flex:1, backgroundColor:'#10182e' }, h:{ fontSize:20, fontWeight:'900', color:'#f5d67b', marginTop:8 }, grid:{ flexDirection:'row', flexWrap:'wrap', gap:10 }, card:{ backgroundColor:'#1c2547', borderRadius:16, padding:10, width:172, alignItems:'center', gap:2, borderWidth:1, borderColor:'#c9a22755' }, itemCard:{ backgroundColor:'#1c2547', borderRadius:16, padding:10, width:120, alignItems:'center', gap:2, borderWidth:1, borderColor:'#c9a22755' }, name:{ fontWeight:'800', textAlign:'center', color:'#f8fafc' }, trait:{ color:'#f5d67b', fontWeight:'700', fontSize:12, textAlign:'center' }, stats:{ fontSize:11.5, color:'#cbd5e1', textAlign:'center' }, skill:{ fontSize:12, fontWeight:'700', color:'#7dd3fc', textAlign:'center' }, desc:{ fontSize:11.5, color:'#aab4d4', textAlign:'center' }, line:{ lineHeight:20, color:'#dbe2f3' } });
