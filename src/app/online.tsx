import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { CHAMPIONS } from '../game/data';
const welcomeSpecs = CHAMPIONS.slice(0, 4);
import SpriteUnit, { SceneArtImage } from '../components/SpriteUnit';
import { isOnlineConfigured } from '../game/supabase';
import { loadPlayer, savePlayerName } from '../game/storage';
import { audio } from '../game/audio';

export default function OnlineMenu() {
  const [name, setName] = useState('Người chơi');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const configured = isOnlineConfigured();
  useEffect(() => { loadPlayer().then(p => setName(p.name)); }, []);
  async function go(params: string) {
    audio.unlock(); audio.playSfx('click');
    const p = await savePlayerName(name);
    router.push(('/online-game?' + params + '&name=' + encodeURIComponent(p.name)) as any);
  }
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 13, alignItems: 'center' }}>
      <View style={{ position: 'relative', alignItems: 'center' }}>
        <SceneArtImage id="lobby" width={340} height={177} />
        <View style={{ position: 'absolute', bottom: 6, flexDirection: 'row', gap: 2 }}>{welcomeSpecs.map((d, i) => <SpriteUnit key={d.id} spec={d} size={i===1||i===2?92:74} state='idle'/>)}</View>
      </View>
      <Text style={s.title}>PvP Online — Người đấu người</Text>
      <Text style={s.sub}>Vào phòng với bạn bè bằng mã phòng 6 ký tự, hoặc ghép nhanh với người chơi đang chờ. Phòng có tối đa 8 người; ghế trống và người mất kết nối sẽ được AI lấp vào để trận luôn đủ 8 như TFT.</Text>
      {!configured && (
        <View style={s.warn}>
          <Text style={s.warnTitle}>Chưa cấu hình máy chủ online</Text>
          <Text style={s.warnTxt}>Game cần một project Supabase miễn phí để kết nối người chơi. Các chế độ offline vẫn chơi bình thường. Cách bật online (khoảng 3 phút) xem trong README mục "Bật PvP Online (Supabase)" ở repo game: tạo project, copy URL + anon key vào app.json (extra.supabaseUrl / extra.supabaseAnonKey) hoặc biến môi trường EXPO_PUBLIC_*, rồi build lại bản web/app.</Text>
        </View>
      )}
      <View style={s.card}>
        <Text style={s.label}>Tên hiển thị của bạn</Text>
        <TextInput value={name} onChangeText={setName} maxLength={20} style={s.input} placeholder="Nhập tên" />
      </View>
      <Pressable disabled={!configured} style={[s.btn, s.primary, !configured && s.disabled]} onPress={() => go('mode=create')}><Text style={s.btnTxt}>Tạo phòng mới (làm chủ phòng)</Text></Pressable>
      <View style={s.card}>
        <Text style={s.label}>Vào phòng bằng mã</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput value={code} onChangeText={t => setCode(t.toUpperCase())} maxLength={6} autoCapitalize="characters" style={[s.input, { flex: 1, textTransform: 'uppercase' }]} placeholder="MÃ 6 KÝ TỰ" />
          <Pressable disabled={!configured || code.trim().length < 4} style={[s.btnSmall, (!configured || code.trim().length < 4) && s.disabled]} onPress={() => go('mode=join&code=' + encodeURIComponent(code.trim()))}><Text style={s.btnTxt}>Vào phòng</Text></Pressable>
        </View>
      </View>
      <Pressable disabled={!configured} style={[s.btn, s.purple, !configured && s.disabled]} onPress={() => go('mode=quick')}><Text style={s.btnTxt}>Ghép nhanh với người đang chờ</Text></Pressable>
      {!!msg && <Text style={s.msg}>{msg}</Text>}
      <Pressable style={[s.btn, s.gray]} onPress={() => router.back()}><Text style={s.btnTxt}>Quay lại</Text></Pressable>
    </ScrollView>
  );
}
const s = StyleSheet.create({ screen:{ flex:1, backgroundColor:'#fff7fb' }, title:{ fontSize:24, fontWeight:'900', color:'#7b2d5b', textAlign:'center' }, sub:{ textAlign:'center', color:'#555', maxWidth:560, lineHeight:20 }, card:{ width:'100%', maxWidth:520, backgroundColor:'#fff', borderRadius:16, padding:12, gap:8, borderWidth:1, borderColor:'#ffd6e0' }, label:{ fontWeight:'800', color:'#5b3a29' }, input:{ backgroundColor:'#fff7fb', borderWidth:1, borderColor:'#ffd6e0', borderRadius:12, paddingHorizontal:12, paddingVertical:10, fontWeight:'700' }, btn:{ width:'100%', maxWidth:520, borderRadius:999, paddingVertical:14, alignItems:'center' }, btnSmall:{ backgroundColor:'#4361ee', borderRadius:999, paddingHorizontal:18, justifyContent:'center', alignItems:'center' }, primary:{ backgroundColor:'#ff70a6' }, purple:{ backgroundColor:'#7b5ea7' }, gray:{ backgroundColor:'#6c757d' }, disabled:{ opacity:0.45 }, btnTxt:{ color:'#fff', fontWeight:'800', fontSize:15 }, warn:{ width:'100%', maxWidth:520, backgroundColor:'#fff3cd', borderRadius:16, padding:12, gap:4, borderWidth:1, borderColor:'#ffdf7e' }, warnTitle:{ fontWeight:'900', color:'#7a5b00' }, warnTxt:{ color:'#6b5200', lineHeight:19, fontSize:13 }, msg:{ color:'#4361ee', fontWeight:'700' } });
