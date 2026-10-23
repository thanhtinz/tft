import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChapterScene } from '../components/SceneArt';
import ChibiRig from '../components/ChibiRig';
import { monsterById } from '../game/data';
import { loadMeta, MetaState, defaultMeta } from '../game/storage';
import { CHAPTER_COUNT, CHAPTER_SIZE, TOTAL_STAGES, buildStageTeam, chapterName, stageDef } from '../game/stages';

export default function CampaignMap() {
  const [meta, setMeta] = useState<MetaState>(defaultMeta);
  const unlockedChapter = Math.min(CHAPTER_COUNT, Math.ceil(Math.max(1, meta.unlockedStage) / CHAPTER_SIZE));
  const [chapter, setChapter] = useState(1);
  const listRef = useRef<FlatList>(null);
  useEffect(() => { loadMeta().then(m => { setMeta(m); setChapter(Math.min(CHAPTER_COUNT, Math.ceil(Math.max(1, m.unlockedStage) / CHAPTER_SIZE))); }); }, []);
  const stages = useMemo(() => Array.from({ length: CHAPTER_SIZE }, (_, i) => stageDef((chapter - 1) * CHAPTER_SIZE + i + 1)), [chapter]);
  const unlockedInChapter = Math.max(0, Math.min(CHAPTER_SIZE, meta.unlockedStage - (chapter - 1) * CHAPTER_SIZE));
  useEffect(() => { if (unlockedInChapter > 0 && listRef.current) { const idx = Math.max(0, unlockedInChapter - 1); const t = setTimeout(() => { try { listRef.current?.scrollToIndex({ index: idx, animated: false }); } catch {} }, 350); return () => clearTimeout(t); } }, [chapter, unlockedInChapter]);
  const doneCount = Object.keys(meta.campaignStars).length;
  return (
    <View style={s.screen}>
      <View style={{ padding: 14, gap: 8 }}>
        <Text style={s.h}>Bản đồ Chiến Dịch PvE — {TOTAL_STAGES} màn</Text>
        <Text style={s.sub}>Đã mở {Math.min(meta.unlockedStage, TOTAL_STAGES)}/{TOTAL_STAGES} màn — Đã thắng {doneCount} màn. Thắng màn để mở màn tiếp theo, mỗi 10 màn có 1 Boss, cuối mỗi chương (100 màn) là Boss lớn. 12 màn đầu được thiết kế tay, từ màn 13 đội hình địch được sinh tự động theo cấp độ khó tăng dần.</Text>
        <ChapterScene chapter={((chapter - 1) % 3) + 1} width={330}/>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
          {Array.from({ length: CHAPTER_COUNT }, (_, i) => i + 1).map(ch => (
            <Pressable key={ch} onPress={() => setChapter(ch)} style={[s.chip, ch === chapter && s.chipOn, ch === unlockedChapter && s.chipCur]}>
              <Text style={[s.chipTxt, ch === chapter && s.chipTxtOn]}>Ch.{ch}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={s.chapter}>Chương {chapter}: {chapterName(chapter)} (màn {(chapter - 1) * CHAPTER_SIZE + 1}–{chapter * CHAPTER_SIZE})</Text>
      </View>
      <FlatList
        ref={listRef}
        data={stages}
        keyExtractor={st => String(st.id)}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 20, gap: 10 }}
        columnWrapperStyle={{ gap: 10 }}
        initialNumToRender={12}
        windowSize={7}
        getItemLayout={(_, index) => ({ length: 128, offset: 138 * Math.floor(index / 2), index })}
        onScrollToIndexFailed={() => {}}
        renderItem={({ item: st }) => {
          const locked = st.id > meta.unlockedStage; const stars = meta.campaignStars[String(st.id)] ?? 0;
          const firstEnemy = buildStageTeam(st.id)[0];
          const spec = firstEnemy?.monster ?? monsterById(firstEnemy?.defId ?? 'slime');
          return (
            <Pressable disabled={locked} onPress={() => router.push('/game?mode=campaign&stage=' + st.id)} style={[s.node, locked && s.locked, st.isChapterBoss && s.bossBig, st.isBoss && !st.isChapterBoss && s.boss]}>
              <ChibiRig spec={spec} size={50} state={locked ? 'idle' : st.isBoss ? 'cast' : 'walk'}/>
              <Text style={s.nodeName}>{st.id}. {st.name}</Text>
              <Text style={s.stars}>{locked ? 'Chưa mở khóa' : (stars ? 'Sao đạt được: ' + stars + '/3' : 'Chưa thắng')}{st.isChapterBoss ? ' — BOSS CHƯƠNG' : st.isBoss ? ' — Boss' : ''}</Text>
              <Text style={s.reward}>Độ khó {st.power} — Thưởng {st.reward} Ngọc</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
const s = StyleSheet.create({ screen:{ flex:1, backgroundColor:'#fff7fb' }, h:{ fontSize:23, fontWeight:'900', color:'#7b2d5b' }, sub:{ color:'#555', lineHeight:19 }, chapter:{ fontSize:17, fontWeight:'800', color:'#5b3a29' }, chip:{ backgroundColor:'#fff', borderWidth:1, borderColor:'#ffd6e0', borderRadius:999, paddingHorizontal:11, paddingVertical:6 }, chipOn:{ backgroundColor:'#ff70a6', borderColor:'#ff70a6' }, chipCur:{ borderColor:'#ffb703', borderWidth:2 }, chipTxt:{ fontWeight:'800', fontSize:12, color:'#7b2d5b' }, chipTxtOn:{ color:'#fff' }, node:{ flex:1, backgroundColor:'#fff', borderRadius:16, padding:10, alignItems:'center', gap:2, borderWidth:1, borderColor:'#ffd6e0', minHeight:118 }, boss:{ borderColor:'#ffb703', borderWidth:2, backgroundColor:'#fff8e1' }, bossBig:{ borderColor:'#ef476f', borderWidth:3, backgroundColor:'#ffe3ef' }, locked:{ opacity:0.5 }, nodeName:{ fontWeight:'800', textAlign:'center', fontSize:13 }, stars:{ fontSize:11, color:'#e07b00', fontWeight:'700', textAlign:'center' }, reward:{ fontSize:11, color:'#555', textAlign:'center' } });
