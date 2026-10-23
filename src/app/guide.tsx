import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CHAMPIONS } from '../game/data';
const welcomeSpecs = [CHAMPIONS[0], CHAMPIONS[16], CHAMPIONS[20]];
import SpriteUnit, { SceneArtImage } from '../components/SpriteUnit';
const LINES = [
  ['Mục tiêu', 'Đấu Trường: sống sót cuối cùng trong 8 người chơi (bạn + 7 bot AI), ai hết 100 máu trước sẽ bị loại. Chiến Dịch PvE: thắng từng ải quái để mở ải sau và săn 3 sao. Sóng Quái: sống qua càng nhiều sóng càng tốt.'],
  ['Vòng lặp mỗi round', 'Giai đoạn Chuẩn bị: mua tướng ở shop, xếp đội hình, gắn trang bị. Bấm Bắt đầu đấu: hai đội tự đánh, đầy mana sẽ tung kỹ năng. Kết round: nhận vàng, XP, tính streak và sát thương lên người thua.'],
  ['Cửa hàng và kinh tế', 'Shop có 5 ô, tỉ lệ ra tướng theo cấp. Làm mới tốn 2 vàng, Khóa shop giữ nguyên shop sang round sau, Mua XP tốn 4 vàng. Mỗi round nhận vàng cơ bản + lãi tối đa 5 vàng theo mốc 10/20/30/40/50 vàng đang giữ + vàng streak thắng/thua.'],
  ['Ghép sao', 'Mua đủ 3 tướng giống nhau cùng sao sẽ tự ghép lên sao cao hơn (chỉ số nhân 1.8 lần ở 2 sao, 3.2 lần ở 3 sao). Bán tướng bằng cách chọn tướng rồi bấm Bán.'],
  ['Xếp đội hình', 'Chạm tướng ở hàng chờ để chọn, chạm ô trên bàn cờ để đặt. Chạm tướng trên bàn để chọn rồi chạm ô khác để di chuyển hoặc đổi chỗ. Tướng cận chiến nên ở hàng trước, xạ thủ/phù thủy ở hàng sau.'],
  ['Tộc / Hệ', 'Đặt nhiều tướng khác nhau cùng tộc/hệ để kích hoạt mốc (ví dụ 2/4). Buff áp dụng thật trong trận: giáp, máu, tốc đánh, chí mạng, khiên, hồi mana... Danh sách tộc/hệ đang kích hoạt hiện ngay trên bàn cờ.'],
  ['Trang bị và cường hóa', 'Thắng round PvE sẽ rơi trang bị và vàng. Chạm chọn trang bị trong kho rồi chạm tướng để gắn (tối đa 3 đồ). Ở các mốc round trong Đấu Trường, bạn được chọn 1 trong 3 cường hóa có hiệu lực cả trận.'],
  ['Xem trận', 'Trong lúc đấu có thể tăng tốc độ x2 hoặc bỏ qua tới kết quả. Nhân vật là tranh vẽ kiểu splash art và chuyển động theo trạng thái trận đấu: thở đứng chờ, đi, đánh, tung chiêu, trúng đòn và ngã xuống đều có animation riêng.'],
  ['Bố cục màn hình kiểu TFT', 'Màn hình trận đấu nằm ngang: trên cùng là dãy round của stage và đồng hồ chuẩn bị (hết giờ tự vào giao tranh), bên trái là panel Tộc/Hệ kèm khay trang bị và cường hóa đã chọn, ở giữa là sàn HEX 7x4 và linh thú của bạn, bên phải là bảng 8 người chơi — chạm vào một người để xem bàn cờ của họ (scouting), sau giao tranh panel phải tự chuyển sang thống kê sát thương. Dưới cùng là bench 9 ô và shop chuẩn TFT với thẻ cấp, nút Mua XP, Làm mới, Khóa shop và dòng tỉ lệ shop theo cấp. Trên PC/web: phím D = làm mới, F = mua XP.'],
  ['Cấu trúc stage', 'Stage 1 có 4 round (1-1, 1-2, 1-3 là PvE, 1-4 là PvP), các stage sau mỗi stage 7 round, round cuối mỗi stage là PvE (quái lớn). Cường hóa xuất hiện ở 2-1, 3-2 và 4-2. Từ stage 2, giữa stage có vòng chọn Carousel: chạm chọn 1 tướng kèm trang bị từ vòng tròn quay. Sát thương khi thua round tính theo stage cộng 2 cho mỗi quân địch còn sống.'],
  ['PvP Online', 'Vào mục PvP Online ở trang chủ: tạo phòng để lấy mã 6 ký tự gửi bạn bè, vào phòng bằng mã, hoặc ghép nhanh với người đang chờ. Phòng tối đa 8 người, ghế trống và người mất kết nối được AI lấp vào. Chủ phòng điều phối vòng đấu; mọi máy đều mô phỏng cùng một trận bằng cùng hạt giống ngẫu nhiên nên kết quả hai phía khớp nhau. Chế độ này cần cấu hình Supabase (xem README của repo).'],
  ['Chiến dịch 5.200 màn', 'Chiến dịch PvE có 5.200 màn chia 52 chương, mỗi chương 100 màn theo chủ đề, Boss mỗi 10 màn và Boss lớn cuối chương. Từ màn 13, đội hình địch được sinh tự động với độ khó tăng dần mượt mà; tiến độ và sao được lưu tự động.'],
  ['Hướng dẫn tương tác và âm thanh', 'Người mới nên chơi chế độ Hướng Dẫn Chơi Tương Tác: mascot Nana chỉ từng bước (mua tướng, đặt bàn, ghép sao, làm mới, mua XP, gắn đồ, giao tranh) và chỉ qua bước khi bạn làm đúng — hoàn thành lần đầu nhận 50 Ngọc. Nhạc nền và hiệu ứng âm thanh được tổng hợp bằng code, bật/tắt riêng ở trang chủ hoặc ngay trong trận.'],
];
export default function Guide() {
  return (<ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 12, alignItems: 'center' }}>
    <View style={{ width: 330, height: 172, borderRadius: 14, overflow: 'hidden' }}><SceneArtImage id="lobby" width={330} height={172} /></View>
    <View style={{ flexDirection: 'row', marginTop: -64 }}>{welcomeSpecs.slice(0,3).map(d => <SpriteUnit key={d.id} spec={d} size={72} state='idle'/>)}</View>
    <Text style={s.h}>Hướng dẫn cách chơi</Text>
    {LINES.map(([t, b]) => (<View key={t} style={s.card}><Text style={s.t}>{t}</Text><Text style={s.b}>{b}</Text></View>))}
  </ScrollView>);
}
const s = StyleSheet.create({ screen:{ flex:1, backgroundColor:'#0d1326' }, h:{ fontSize:24, fontWeight:'900', color:'#f5d67b' }, card:{ backgroundColor:'#1c2547', borderRadius:14, padding:12, width:'100%', maxWidth:620, borderWidth:1, borderColor:'#c9a22755' }, t:{ fontWeight:'800', fontSize:16, color:'#f5d67b', marginBottom:4 }, b:{ color:'#aab4d4', lineHeight:20 } });
