import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { HomeScene, welcomeSpecs } from '../components/SceneArt';
import ChibiRig from '../components/ChibiRig';
const LINES = [
  ['Mục tiêu', 'Đấu Trường: sống sót cuối cùng trong 8 người chơi (bạn + 7 bot AI), ai hết 100 máu trước sẽ bị loại. Chiến Dịch PvE: thắng từng ải quái để mở ải sau và săn 3 sao. Sóng Quái: sống qua càng nhiều sóng càng tốt.'],
  ['Vòng lặp mỗi round', 'Giai đoạn Chuẩn bị: mua tướng ở shop, xếp đội hình, gắn trang bị. Bấm Bắt đầu đấu: hai đội tự đánh, đầy mana sẽ tung kỹ năng. Kết round: nhận vàng, XP, tính streak và sát thương lên người thua.'],
  ['Cửa hàng và kinh tế', 'Shop có 5 ô, tỉ lệ ra tướng theo cấp. Làm mới tốn 2 vàng, Khóa shop giữ nguyên shop sang round sau, Mua XP tốn 4 vàng. Mỗi round nhận vàng cơ bản + lãi tối đa 5 vàng theo mốc 10/20/30/40/50 vàng đang giữ + vàng streak thắng/thua.'],
  ['Ghép sao', 'Mua đủ 3 tướng giống nhau cùng sao sẽ tự ghép lên sao cao hơn (chỉ số nhân 1.8 lần ở 2 sao, 3.2 lần ở 3 sao). Bán tướng bằng cách chọn tướng rồi bấm Bán.'],
  ['Xếp đội hình', 'Chạm tướng ở hàng chờ để chọn, chạm ô trên bàn cờ để đặt. Chạm tướng trên bàn để chọn rồi chạm ô khác để di chuyển hoặc đổi chỗ. Tướng cận chiến nên ở hàng trước, xạ thủ/phù thủy ở hàng sau.'],
  ['Tộc / Hệ', 'Đặt nhiều tướng khác nhau cùng tộc/hệ để kích hoạt mốc (ví dụ 2/4). Buff áp dụng thật trong trận: giáp, máu, tốc đánh, chí mạng, khiên, hồi mana... Danh sách tộc/hệ đang kích hoạt hiện ngay trên bàn cờ.'],
  ['Trang bị và cường hóa', 'Thắng round PvE sẽ rơi trang bị và vàng. Chạm chọn trang bị trong kho rồi chạm tướng để gắn (tối đa 3 đồ). Ở các mốc round trong Đấu Trường, bạn được chọn 1 trong 3 cường hóa có hiệu lực cả trận.'],
  ['Xem trận', 'Trong lúc đấu có thể tăng tốc độ x2 hoặc bỏ qua tới kết quả. Nhân vật chuyển động bằng hệ thống xương kiểu Spine tự xây: đi, đánh, tung chiêu, trúng đòn và ngã xuống đều có clip riêng.'],
];
export default function Guide() {
  return (<ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 12, alignItems: 'center' }}>
    <HomeScene width={330}/>
    <View style={{ flexDirection: 'row', marginTop: -64 }}>{welcomeSpecs.slice(0,3).map(d => <ChibiRig key={d.id} spec={d} size={72} state='idle'/>)}</View>
    <Text style={s.h}>Hướng dẫn cách chơi</Text>
    {LINES.map(([t, b]) => (<View key={t} style={s.card}><Text style={s.t}>{t}</Text><Text style={s.b}>{b}</Text></View>))}
  </ScrollView>);
}
const s = StyleSheet.create({ screen:{ flex:1, backgroundColor:'#fff7fb' }, h:{ fontSize:24, fontWeight:'900', color:'#7b2d5b' }, card:{ backgroundColor:'#fff', borderRadius:14, padding:12, width:'100%', maxWidth:620 }, t:{ fontWeight:'800', fontSize:16, color:'#5b3a29', marginBottom:4 }, b:{ color:'#444', lineHeight:20 } });
