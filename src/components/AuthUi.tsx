import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { LobbyScene } from './SceneArt';
// Khung man hinh auth phong cach game: nen tranh lobby, panel toi vien vang
export function AuthShell({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  const { width: winW, height: winH } = useWindowDimensions();
  return (
    <View style={s.root}>
      <LobbyScene width={winW} height={winH} />
      <View style={s.dim} />
      <View style={[s.panel, { width: Math.min(430, winW - 28) }]}>
        <Text style={s.title}>{title}</Text>
        {!!sub && <Text style={s.sub}>{sub}</Text>}
        {children}
      </View>
    </View>
  );
}
export function AuthInput({ label, value, onChangeText, placeholder, secure, autoCapitalize = 'none' }: {
  label: string; value: string; onChangeText: (t: string) => void; placeholder?: string; secure?: boolean; autoCapitalize?: 'none' | 'sentences';
}) {
  const [show, setShow] = useState(false);
  return (
    <View style={{ gap: 4 }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputWrap}>
        <TextInput
          style={s.input} value={value} onChangeText={onChangeText} placeholder={placeholder}
          placeholderTextColor="#67739c" secureTextEntry={secure && !show} autoCapitalize={autoCapitalize}
          autoCorrect={false}
        />
        {secure && (
          <Pressable style={s.eyeBtn} onPress={() => setShow(v => !v)}>
            <Text style={s.eyeTxt}>{show ? 'Ẩn' : 'Hiện'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
export function AuthButton({ title, onPress, ghost, danger }: { title: string; onPress: () => void; ghost?: boolean; danger?: boolean }) {
  return (
    <Pressable
      style={[s.btn, ghost && s.btnGhost, danger && s.btnDanger]}
      onPress={onPress}
    >
      <Text style={[s.btnTxt, ghost && s.btnGhostTxt]}>{title}</Text>
    </Pressable>
  );
}
export function AuthError({ text }: { text?: string }) {
  if (!text) return null;
  return (<View style={s.errBox}><Text style={s.errTxt}>{text}</Text></View>);
}
const s = StyleSheet.create({
  root:{ flex:1, backgroundColor:'#0a2e26', alignItems:'center', justifyContent:'center', overflow:'hidden' },
  dim:{ position:'absolute', left:0, top:0, right:0, bottom:0, backgroundColor:'rgba(5,10,22,0.45)' },
  panel:{ backgroundColor:'rgba(15,21,42,0.97)', borderRadius:20, borderWidth:2, borderColor:'#c9a227', padding:20, gap:12, shadowColor:'#000', shadowOpacity:0.5, shadowRadius:16, shadowOffset:{ width:0, height:6 }, elevation:10 },
  title:{ fontSize:24, fontWeight:'900', color:'#f5d67b', textAlign:'center', letterSpacing:0.6 },
  sub:{ fontSize:12.5, color:'#aab4d4', textAlign:'center', lineHeight:17 },
  label:{ fontSize:12, fontWeight:'800', color:'#f5d67b', letterSpacing:0.4 },
  inputWrap:{ flexDirection:'row', alignItems:'center', backgroundColor:'#1c2547', borderRadius:11, borderWidth:1.5, borderColor:'#46538a' },
  input:{ flex:1, paddingHorizontal:12, paddingVertical:10, color:'#fff', fontSize:14.5, fontWeight:'600' },
  eyeBtn:{ paddingHorizontal:12, paddingVertical:8 },
  eyeTxt:{ color:'#ffd60a', fontWeight:'800', fontSize:12 },
  btn:{ backgroundColor:'#2f6db3', borderRadius:999, paddingVertical:12, alignItems:'center', borderTopWidth:1, borderTopColor:'#8fc1f5', borderBottomWidth:5, borderBottomColor:'#1c4472' },
  btnGhost:{ backgroundColor:'transparent', borderWidth:1.5, borderColor:'#5b6a94', borderBottomWidth:1.5 },
  btnDanger:{ backgroundColor:'#b62b40', borderTopColor:'#ff8fab', borderBottomColor:'#6d1420' },
  btnTxt:{ color:'#fff', fontWeight:'900', fontSize:15 },
  btnGhostTxt:{ color:'#cbd5e1' },
  errBox:{ backgroundColor:'rgba(182,43,64,0.18)', borderWidth:1, borderColor:'#ef476f', borderRadius:10, paddingHorizontal:11, paddingVertical:8 },
  errTxt:{ color:'#ffadc0', fontSize:12.5, fontWeight:'700', lineHeight:16 },
});
