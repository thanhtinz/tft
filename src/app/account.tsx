import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import ChibiRig from '../components/ChibiRig';
import RankBadge from '../components/RankBadge';
import { AuthButton, AuthError } from '../components/AuthUi';
import { AUTH_ERROR_VI, avgPlacement, lpProgress, rankLabel, xpToNextLevel } from '../game/auth';
import { Identity, changeAvatar, changePassword, deleteAccount, findFriend, formatRiotId, logout, renameIdentity, restoreSession } from '../game/accounts';
import { FriendEntry, HistoryRecord, MetaState, ProfileState, defaultMeta, loadFriends, loadHistory, loadMeta, loadProfile, saveFriends } from '../game/storage';
import { TOTAL_STAGES } from '../game/stages';
import { CHAMPIONS, champById } from '../game/data';
import { audio } from '../game/audio';

type Tab = 'overview' | 'history' | 'friends' | 'settings';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Tổng quan' }, { id: 'history', label: 'Lịch sử đấu' },
  { id: 'friends', label: 'Bạn bè' }, { id: 'settings', label: 'Cài đặt' },
];
function StatBox({ label, value }: { label: string; value: string }) {
  return (<View style={s.statBox}><Text style={s.statVal}>{value}</Text><Text style={s.statLbl}>{label}</Text></View>);
}
function fmtTime(ts: number) {
  try { return new Date(ts).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
}
export default function Account() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [meta, setMeta] = useState<MetaState>(defaultMeta);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [newName, setNewName] = useState('');
  const [friendInput, setFriendInput] = useState('');
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [delStep, setDelStep] = useState(0);
  const [delPw, setDelPw] = useState('');
  async function refresh(idn?: Identity) {
    const [p, m, h, f] = await Promise.all([loadProfile(idn?.displayName), loadMeta(), loadHistory(), loadFriends()]);
    setProfile(p); setMeta(m); setHistory(h); setFriends(f);
    if (idn) setNewName(idn.displayName);
  }
  useEffect(() => { restoreSession().then(async idn => { setIdentity(idn); await refresh(idn); }); }, []);
  if (!identity || !profile) {
    return (<View style={s.root}><Text style={s.loading}>Đang tải hồ sơ...</Text></View>);
  }
  const isGuest = identity.kind === 'guest';
  const avg = avgPlacement(profile.stats);
  const xpNext = xpToNextLevel(profile.level);
  async function doChangeAvatar(avatarId: string) {
    if (!identity) return;
    audio.playSfx('click');
    const updated = await changeAvatar(identity, avatarId);
    setProfile(updated);
    setIdentity({ ...identity, avatarId });
    setAvatarOpen(false);
    setMsg('Đã đổi ảnh đại diện.');
  }
  async function doRename() {
    if (!identity) return;
    setErr(''); setMsg('');
    const r = await renameIdentity(identity, newName);
    if (r.error || !r.identity) { setErr(typeof r.error === 'string' ? r.error : 'Đổi tên thất bại.'); return; }
    setIdentity(r.identity);
    await refresh(r.identity);
    setMsg('Đã đổi tên hiển thị. Riot ID mới: ' + formatRiotId(r.identity.displayName, r.identity.tag));
  }
  async function doAddFriend() {
    if (!identity) return;
    setErr(''); setMsg('');
    const r = await findFriend(identity, friendInput);
    if (r.error || !r.friend) { setErr(r.error ?? 'Không tìm thấy bạn.'); return; }
    if (friends.some(f => f.key === r.friend!.key)) { setErr('Người này đã có trong danh sách bạn của bạn.'); return; }
    const next = [...friends, r.friend];
    setFriends(next);
    await saveFriends(next);
    setFriendInput('');
    setMsg('Đã thêm bạn: ' + formatRiotId(r.friend.name, r.friend.tag));
  }
  async function doRemoveFriend(key: string) {
    const next = friends.filter(f => f.key !== key);
    setFriends(next);
    await saveFriends(next);
  }
  async function doChangePassword() {
    if (!identity) return;
    setErr(''); setMsg('');
    const r = await changePassword(identity, oldPw, newPw);
    if (r.error) { setErr(typeof r.error === 'string' && (AUTH_ERROR_VI as any)[r.error] ? (AUTH_ERROR_VI as any)[r.error] : String(r.error)); return; }
    setOldPw(''); setNewPw('');
    setMsg('Đã đổi mật khẩu thành công.');
  }
  async function doDelete() {
    if (!identity) return;
    setErr(''); setMsg('');
    const r = await deleteAccount(identity, delPw);
    if (r.error) { setErr(r.error); return; }
    router.replace('/');
  }
  async function doLogout() { audio.playSfx('click'); await logout(); router.replace('/'); }
  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 14, gap: 12, alignItems: 'center' }}>
      {/* ===== HEADER HO SO ===== */}
      <View style={[s.panel, s.headerPanel]}>
        <Pressable style={s.avatarWrap} onPress={() => setAvatarOpen(true)}>
          <View style={{ position: 'absolute', left: -8, top: -10 }}>
            <ChibiRig spec={champById(profile.avatarId) ?? CHAMPIONS[0]} size={112} state="idle" />
          </View>
          <View style={s.avatarEdit}><Text style={s.avatarEditTxt}>Đổi</Text></View>
        </Pressable>
        <View style={{ flex: 1, gap: 4, minWidth: 200 }}>
          <Text style={s.name} selectable>{formatRiotId(profile.displayName, profile.tag)}</Text>
          <Text style={s.hint}>Chạm giữ tên để sao chép Riot ID • Chạm avatar để đổi ảnh</Text>
          <View style={s.lvlRow}>
            <View style={s.lvlBadge}><Text style={s.lvlBadgeTxt}>Cấp {profile.level}</Text></View>
            <View style={s.xpTrack}><View style={[s.xpFill, { width: Math.min(100, profile.xp / xpNext * 100) + '%' }]} /></View>
            <Text style={s.xpTxt}>{profile.xp}/{xpNext} XP</Text>
          </View>
          <Text style={s.accNote}>
            {isGuest
              ? 'Đang chơi với tư cách KHÁCH — hồ sơ và hạng chỉ lưu trên thiết bị, không có hạng chính thức. Đăng nhập để lưu đám mây.'
              : identity.kind === 'local'
                ? 'Tài khoản trên thiết bị này — kết nối Supabase để đồng bộ online.'
                : 'Tài khoản online (Supabase)' + (identity.email ? ' • ' + identity.email : '')}
          </Text>
        </View>
        <View style={{ alignItems: 'center', gap: 2 }}>
          <RankBadge tier={profile.rank.tier} size={72} />
          <Text style={s.rankLbl}>{rankLabel(profile.rank)}</Text>
          <View style={[s.xpTrack, { width: 96 }]}><View style={[s.lpFill, { width: (lpProgress(profile.rank) * 100) + '%' }]} /></View>
          <Text style={s.xpTxt}>Tiến trình hạng</Text>
        </View>
      </View>
      {isGuest && (
        <View style={[s.panel, { alignItems: 'center', gap: 9 }]}>
          <Text style={s.guestTitle}>Bạn chưa đăng nhập</Text>
          <Text style={s.hintCenter}>Đăng nhập/đăng ký để có Riot ID riêng, lưu hạng + lịch sử đấu theo tài khoản và đồng bộ khi có Supabase.</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable style={s.smallPrimary} onPress={() => router.push('/login')}><Text style={s.smallPrimaryTxt}>Đăng nhập</Text></Pressable>
            <Pressable style={s.smallGhost} onPress={() => router.push('/register')}><Text style={s.smallGhostTxt}>Đăng ký</Text></Pressable>
          </View>
        </View>
      )}
      {!!msg && (<View style={s.msgBox}><Text style={s.msgTxt}>{msg}</Text></View>)}
      <AuthError text={err} />
      {/* ===== TABS ===== */}
      <View style={s.tabRow}>
        {TABS.map(t => (
          <Pressable key={t.id} style={[s.tab, tab === t.id && s.tabOn]} onPress={() => { audio.playSfx('click'); setTab(t.id); setErr(''); setMsg(''); }}>
            <Text style={[s.tabTxt, tab === t.id && s.tabTxtOn]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      {tab === 'overview' && (
        <View style={s.panel}>
          <View style={s.statGrid}>
            <StatBox label="Tổng trận (Đấu Trường)" value={String(profile.stats.matches)} />
            <StatBox label="Vô địch Top 1" value={String(profile.stats.top1)} />
            <StatBox label="Vào Top 4" value={String(profile.stats.top4)} />
            <StatBox label="Hạng trung bình" value={avg ? avg.toFixed(2) : '—'} />
            <StatBox label="Tiến độ PvE" value={`${Math.min(meta.unlockedStage, TOTAL_STAGES)}/${TOTAL_STAGES}`} />
            <StatBox label="Kỷ lục sóng quái" value={String(meta.bestWave)} />
            <StatBox label="Ngọc hiện có" value={String(meta.gems)} />
            <StatBox label="Số trận thắng (mọi chế độ)" value={String(meta.wins)} />
            <StatBox label="Hạng tốt nhất" value={meta.bestRank ? `#${meta.bestRank}/8` : '—'} />
          </View>
        </View>
      )}
      {tab === 'history' && (
        <View style={s.panel}>
          {!history.length && <Text style={s.hintCenter}>Chưa có trận nào được ghi. Hãy đấu một trận (Đấu với AI, PvE, Sóng quái hoặc Online) — lịch sử sẽ tự lưu theo tài khoản.</Text>}
          {history.map(h => (
            <View key={h.id} style={s.histRow}>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={s.histMode}>{h.modeLabel}</Text>
                  {!!h.placement && (<View style={s.placeChip}><Text style={s.placeChipTxt}>#{h.placement}/{h.totalPlayers ?? 8}</Text></View>)}
                  <Text style={s.histTime}>{fmtTime(h.ts)}</Text>
                </View>
                <Text style={s.histResult}>{h.resultText}</Text>
                {!!h.team.length && (
                  <View style={{ flexDirection: 'row', gap: 3, flexWrap: 'wrap' }}>
                    {h.team.map((u, i) => (
                      <View key={i} style={s.teamCell}>
                        <ChibiRig spec={champById(u.defId) ?? CHAMPIONS[0]} size={30} star={u.star} state="idle" />
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                {h.lpDelta !== undefined && (<Text style={[s.lpTxt, { color: h.lpDelta >= 0 ? '#57e389' : '#ff8fab' }]}>{h.lpDelta >= 0 ? '+' : ''}{h.lpDelta} LP</Text>)}
                <Text style={s.xpGainTxt}>+{h.xpGained} XP</Text>
              </View>
            </View>
          ))}
        </View>
      )}
      {tab === 'friends' && (
        <View style={s.panel}>
          <Text style={s.fieldLbl}>Riot ID của bạn</Text>
          <Text style={s.myId} selectable>{formatRiotId(profile.displayName, profile.tag)}</Text>
          <Text style={s.hint}>Chạm giữ để sao chép và gửi cho bạn bè. {identity.kind === 'supabase' ? 'Chế độ online: tìm bạn theo đúng Riot ID trong hệ thống.' : 'Chế độ local: chỉ tìm được tài khoản đã đăng ký trên cùng thiết bị này.'}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <TextInput style={[s.input, { flex: 1 }]} value={friendInput} onChangeText={setFriendInput} placeholder="Nhập Riot ID bạn (Tên#1234)" placeholderTextColor="#67739c" autoCapitalize="none" autoCorrect={false} />
            <Pressable style={s.smallPrimary} onPress={doAddFriend}><Text style={s.smallPrimaryTxt}>Thêm bạn</Text></Pressable>
          </View>
          {friends.map(f => (
            <View key={f.key} style={s.friendRow}>
              <View style={s.friendAvatar}><View style={{ position: 'absolute', left: -5, top: -6 }}><ChibiRig spec={champById(f.avatarId) ?? CHAMPIONS[0]} size={50} state="idle" /></View></View>
              <View style={{ flex: 1 }}>
                <Text style={s.friendName}>{formatRiotId(f.name, f.tag)}</Text>
                <Text style={s.hint}>{f.rankText} • {f.source === 'supabase' ? 'Online' : 'Trên thiết bị'}</Text>
              </View>
              <Pressable style={s.removeBtn} onPress={() => doRemoveFriend(f.key)}><Text style={s.removeTxt}>Xóa</Text></Pressable>
            </View>
          ))}
          {!friends.length && <Text style={s.hintCenter}>Chưa có bạn nào. Thêm bạn bằng Riot ID ở trên nhé.</Text>}
        </View>
      )}
      {tab === 'settings' && (
        <View style={s.panel}>
          <Text style={s.fieldLbl}>Đổi tên hiển thị</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput style={[s.input, { flex: 1 }]} value={newName} onChangeText={setNewName} placeholder="2–16 ký tự" placeholderTextColor="#67739c" autoCorrect={false} />
            <Pressable style={s.smallPrimary} onPress={doRename}><Text style={s.smallPrimaryTxt}>Lưu tên</Text></Pressable>
          </View>
          <Text style={s.fieldLbl}>Ảnh đại diện</Text>
          <Pressable style={s.smallGhost} onPress={() => setAvatarOpen(true)}><Text style={s.smallGhostTxt}>Chọn avatar từ danh sách tướng</Text></Pressable>
          {!isGuest && (
            <React.Fragment>
              <Text style={s.fieldLbl}>Đổi mật khẩu {identity.kind === 'supabase' ? '(qua Supabase)' : ''}</Text>
              {identity.kind === 'local' && (<TextInput style={s.input} value={oldPw} onChangeText={setOldPw} placeholder="Mật khẩu cũ" placeholderTextColor="#67739c" secureTextEntry autoCapitalize="none" />)}
              <TextInput style={s.input} value={newPw} onChangeText={setNewPw} placeholder="Mật khẩu mới (ít nhất 6 ký tự)" placeholderTextColor="#67739c" secureTextEntry autoCapitalize="none" />
              <Pressable style={s.smallPrimary} onPress={doChangePassword}><Text style={s.smallPrimaryTxt}>Đổi mật khẩu</Text></Pressable>
            </React.Fragment>
          )}
          <View style={{ height: 4 }} />
          <AuthButton title="Đăng xuất" ghost onPress={doLogout} />
          {!isGuest && (
            <React.Fragment>
              <Text style={[s.fieldLbl, { color: '#ff8fab' }]}>Vùng nguy hiểm</Text>
              {delStep === 0 && (<AuthButton title="Xóa tài khoản" danger onPress={() => setDelStep(1)} />)}
              {delStep === 1 && (
                <View style={{ gap: 8 }}>
                  <Text style={s.hint}>Xóa tài khoản sẽ xóa hồ sơ, lịch sử, bạn bè và dữ liệu game gắn với tài khoản trên {identity.kind === 'local' ? 'thiết bị này' : 'hệ thống (hồ sơ)'} — không khôi phục được. {identity.kind === 'local' ? 'Nhập mật khẩu để xác nhận:' : 'Bấm xác nhận để tiếp tục:'}</Text>
                  {identity.kind === 'local' && (<TextInput style={s.input} value={delPw} onChangeText={setDelPw} placeholder="Mật khẩu của bạn" placeholderTextColor="#67739c" secureTextEntry autoCapitalize="none" />)}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable style={[s.smallGhost, { flex: 1, alignItems: 'center' }]} onPress={() => setDelStep(0)}><Text style={s.smallGhostTxt}>Hủy</Text></Pressable>
                    <Pressable style={[s.smallDanger, { flex: 1, alignItems: 'center' }]} onPress={doDelete}><Text style={s.smallPrimaryTxt}>Xóa vĩnh viễn</Text></Pressable>
                  </View>
                </View>
              )}
            </React.Fragment>
          )}
        </View>
      )}
      {/* ===== MODAL CHON AVATAR ===== */}
      {avatarOpen && (
        <View style={s.overlay}>
          <View style={s.avatarPanel}>
            <Text style={s.avatarTitle}>Chọn ảnh đại diện</Text>
            <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={s.avatarGrid}>
              {CHAMPIONS.map(d => (
                <Pressable key={d.id} style={[s.avatarCell, profile.avatarId === d.id && s.avatarCellOn]} onPress={() => doChangeAvatar(d.id)}>
                  <ChibiRig spec={d} size={52} state="idle" />
                  <Text style={s.avatarName} numberOfLines={1}>{d.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={s.smallGhost} onPress={() => setAvatarOpen(false)}><Text style={s.smallGhostTxt}>Đóng</Text></Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  root:{ flex:1, backgroundColor:'#0d1326' },
  loading:{ color:'#aab4d4', textAlign:'center', marginTop:60, fontWeight:'700' },
  panel:{ width:'100%', maxWidth:880, backgroundColor:'#1a2340', borderRadius:16, borderWidth:1.5, borderColor:'#c9a227', padding:14, gap:10 },
  headerPanel:{ flexDirection:'row', gap:14, alignItems:'center', flexWrap:'wrap' },
  avatarWrap:{ width:96, height:96, borderRadius:48, borderWidth:2.5, borderColor:'#ffd60a', backgroundColor:'#232c52', overflow:'hidden', position:'relative' },
  avatarEdit:{ position:'absolute', right:0, bottom:0, backgroundColor:'#ffd60a', borderTopLeftRadius:8, paddingHorizontal:7, paddingVertical:2 },
  avatarEditTxt:{ fontSize:9.5, fontWeight:'900', color:'#23180a' },
  name:{ fontSize:23, fontWeight:'900', color:'#fff' },
  hint:{ fontSize:11, color:'#7f8bb0', lineHeight:15 },
  hintCenter:{ fontSize:12, color:'#aab4d4', lineHeight:17, textAlign:'center' },
  lvlRow:{ flexDirection:'row', alignItems:'center', gap:8, marginTop:2 },
  lvlBadge:{ backgroundColor:'#4361ee', borderRadius:7, paddingHorizontal:8, paddingVertical:3 },
  lvlBadgeTxt:{ color:'#fff', fontWeight:'900', fontSize:11.5 },
  xpTrack:{ flex:1, maxWidth:210, height:9, borderRadius:5, backgroundColor:'rgba(255,255,255,0.14)', overflow:'hidden' },
  xpFill:{ height:9, backgroundColor:'#4dabff', borderRadius:5 },
  lpFill:{ height:9, backgroundColor:'#f5c542', borderRadius:5 },
  xpTxt:{ fontSize:11, color:'#aab4d4', fontWeight:'700' },
  accNote:{ fontSize:11.5, color:'#ffe9a8', lineHeight:16 },
  rankLbl:{ fontWeight:'900', color:'#f5d67b', fontSize:13.5 },
  guestTitle:{ fontSize:17, fontWeight:'900', color:'#f5d67b' },
  msgBox:{ width:'100%', maxWidth:880, backgroundColor:'rgba(56,176,0,0.15)', borderWidth:1, borderColor:'#57e389', borderRadius:10, paddingHorizontal:11, paddingVertical:8 },
  msgTxt:{ color:'#a7f3c7', fontSize:12.5, fontWeight:'700' },
  tabRow:{ flexDirection:'row', gap:7, width:'100%', maxWidth:880 },
  tab:{ flex:1, backgroundColor:'#1c2547', borderRadius:999, paddingVertical:8, alignItems:'center', borderWidth:1.5, borderColor:'#46538a' },
  tabOn:{ backgroundColor:'#f5c542', borderColor:'#ffd60a' },
  tabTxt:{ fontWeight:'800', fontSize:12.5, color:'#eef1ff' },
  tabTxtOn:{ color:'#23180a' },
  statGrid:{ flexDirection:'row', flexWrap:'wrap', gap:9 },
  statBox:{ width:'31%', minWidth:150, flexGrow:1, backgroundColor:'#232d4f', borderRadius:12, padding:11, alignItems:'center', gap:2, borderWidth:1, borderColor:'#46538a' },
  statVal:{ fontSize:19, fontWeight:'900', color:'#fff' },
  statLbl:{ fontSize:10.5, color:'#aab4d4', fontWeight:'700', textAlign:'center' },
  histRow:{ flexDirection:'row', gap:10, backgroundColor:'#232d4f', borderRadius:12, padding:10, borderWidth:1, borderColor:'#46538a' },
  histMode:{ fontWeight:'900', color:'#f5d67b', fontSize:13 },
  placeChip:{ backgroundColor:'#ffd60a', borderRadius:6, paddingHorizontal:6, paddingVertical:1.5 },
  placeChipTxt:{ fontSize:10.5, fontWeight:'900', color:'#23180a' },
  histTime:{ fontSize:10.5, color:'#7f8bb0', fontWeight:'700' },
  histResult:{ fontSize:12, color:'#e8ecff', lineHeight:16 },
  teamCell:{ width:34, height:34, borderRadius:8, backgroundColor:'#141b33', borderWidth:1, borderColor:'#46538a', alignItems:'center', justifyContent:'center', overflow:'hidden' },
  lpTxt:{ fontSize:13, fontWeight:'900' },
  xpGainTxt:{ fontSize:11.5, fontWeight:'800', color:'#7fb3ff' },
  fieldLbl:{ fontSize:12.5, fontWeight:'900', color:'#f5d67b', letterSpacing:0.4, marginTop:2 },
  myId:{ fontSize:19, fontWeight:'900', color:'#fff', backgroundColor:'#141b33', borderRadius:10, borderWidth:1, borderColor:'#c9a227', paddingHorizontal:12, paddingVertical:8 },
  input:{ backgroundColor:'#1c2547', borderRadius:11, borderWidth:1.5, borderColor:'#46538a', paddingHorizontal:12, paddingVertical:10, color:'#fff', fontSize:14, fontWeight:'600' },
  smallPrimary:{ backgroundColor:'#2f6db3', borderRadius:999, paddingHorizontal:16, paddingVertical:9, borderBottomWidth:3.5, borderBottomColor:'#1c4472', justifyContent:'center' },
  smallPrimaryTxt:{ color:'#fff', fontWeight:'800', fontSize:12.5 },
  smallGhost:{ borderWidth:1.5, borderColor:'#5b6a94', borderRadius:999, paddingHorizontal:16, paddingVertical:8, justifyContent:'center' },
  smallGhostTxt:{ color:'#cbd5e1', fontWeight:'800', fontSize:12.5 },
  smallDanger:{ backgroundColor:'#b62b40', borderRadius:999, paddingHorizontal:16, paddingVertical:9, borderBottomWidth:3.5, borderBottomColor:'#6d1420', justifyContent:'center' },
  friendRow:{ flexDirection:'row', gap:10, alignItems:'center', backgroundColor:'#232d4f', borderRadius:12, padding:8, borderWidth:1, borderColor:'#46538a' },
  friendAvatar:{ width:40, height:40, borderRadius:20, overflow:'hidden', borderWidth:1.5, borderColor:'#c9a227', backgroundColor:'#141b33', position:'relative' },
  friendName:{ fontWeight:'900', color:'#fff', fontSize:13.5 },
  removeBtn:{ backgroundColor:'rgba(182,43,64,0.2)', borderWidth:1, borderColor:'#ef476f', borderRadius:999, paddingHorizontal:11, paddingVertical:5 },
  removeTxt:{ color:'#ff8fab', fontWeight:'800', fontSize:11 },
  overlay:{ position:'absolute', left:0, top:0, right:0, bottom:0, backgroundColor:'rgba(5,9,22,0.72)', alignItems:'center', justifyContent:'center', zIndex:50, padding:16 },
  avatarPanel:{ backgroundColor:'#151d3a', borderRadius:18, borderWidth:2, borderColor:'#c9a227', padding:14, gap:10, width:'100%', maxWidth:560 },
  avatarTitle:{ fontSize:16, fontWeight:'900', color:'#f5d67b', textAlign:'center' },
  avatarGrid:{ flexDirection:'row', flexWrap:'wrap', gap:8, justifyContent:'center' },
  avatarCell:{ width:76, alignItems:'center', gap:1, backgroundColor:'#232d4f', borderRadius:11, borderWidth:1.5, borderColor:'#46538a', paddingVertical:5 },
  avatarCellOn:{ borderColor:'#ffd60a', backgroundColor:'#2b3a67' },
  avatarName:{ fontSize:9, fontWeight:'700', color:'#cbd5e1', maxWidth:72, textAlign:'center' },
});
