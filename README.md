# Đấu Trường Chibi

Game auto-battler kiểu Teamfight Tactics (TFT) với đồ họa chibi vẽ tay bằng SVG, chạy đa nền tảng PC / Android / iOS từ một codebase React Native + Expo + TypeScript.

## Chế độ chơi
1. **Đấu Trường (PvP vs 7 AI)**: 8 người chơi, 100 máu, đấu vòng tròn, vòng chọn thưởng đầu game, round PvE xen kẽ rơi trang bị/vàng, cường hóa ở round 5/12/20, xếp hạng 1-8.
2. **Chiến Dịch PvE**: 12 ải, 3 chương, Boss cuối chương, chấm 1-3 sao, mở khóa dần, lưu tiến độ bằng AsyncStorage.
3. **Thử Thách Sóng Quái**: sóng quái vô hạn tăng dần độ khó, lưu kỷ lục sóng cao nhất.

## Gameplay lõi (kiểu TFT)
- Shop 5 ô theo tỉ lệ cấp, làm mới 2 vàng, khóa shop, mua XP 4 vàng, cấp tối đa 9, số tướng trên bàn bằng cấp.
- Kinh tế: vàng cơ bản + lãi tối đa 5 (mốc 10/20/30/40/50) + streak thắng/thua + vàng thắng round.
- Hàng chờ 9 ô, bàn cờ 7x4, ghép sao tự động 3->2 sao, 3->3 sao, bán tướng, chạm để đặt/di chuyển/đổi chỗ.
- 25 tướng, 8 tộc/hệ có mốc kích hoạt và buff thật, 12 trang bị gắn tối đa 3/tướng, 8 cường hóa.
- Kỹ năng: 12 loại hiệu ứng (đơn thể, AoE, choáng, đóng băng, hồi máu, khiên, buff tốc đánh, triệu hồi, kết liễu, độc, hút máu, lao tới).
- Battle engine thuần TypeScript (src/game/engine.ts): tick thời gian thực, di chuyển vào tầm, tích mana, chí mạng, né, giáp/kháng phép, overtime 30 giây xử lý theo quân/máu còn lại.

## Đồ họa: tranh vẽ + 2.5D + rig xương kiểu Spine (tự xây)
- Toàn bộ tướng/quái/boss là **tranh chibi vẽ chi tiết bằng SVG vector** (src/components/ChibiArt.tsx và các part trong ChibiRig.tsx): đầu to, mắt long lanh, má hồng, tóc, trang phục, phụ kiện riêng (tai mèo, sừng, mũ phù thủy, vương miện, cánh, đuôi...) và vũ khí riêng. Không dùng ảnh ngoài, không dùng emoji; icon chỉ còn ở mức tối thiểu cho chỉ số.
- Tranh nền/scene riêng (src/components/SceneArt.tsx): tranh trang chủ, nền bàn cờ nhiều lớp, tranh theo chương PvE, tranh kết quả thắng/thua.
- **2.5D**: nền bàn cờ nhiều lớp tạo chiều sâu (trời/núi xa, cây và cổng đấu trường ở lớp giữa, sàn phối cảnh với ô hình thang, hàng sau nhỏ hơn hàng trước), nhân vật được sắp xếp độ sâu theo hàng (hàng trước che hàng sau, scale lớn dần về phía trước), bóng đổ elip mềm co giãn theo nhịp nhảy.
- **Hệ thống rig "Spine-like" tự xây bằng code** (src/game/rig.ts + src/components/ChibiRig.tsx) — không phải runtime Spine thương mại và không có file .spine: mỗi nhân vật tách thành các bộ phận vẽ riêng gắn vào 11 xương (root, accessory, legL, legR, hips, torso, armL, armR, head, eyes, weaponFx) với pivot và z-order. 7 animation clips dạng keyframe có easing và nội suy mượt: idle (thở, nhún, chớp mắt bằng xương mắt), walk, attack (vung vũ khí bằng xương tay), cast (giơ vũ khí, phát sáng), hurt, death (ngã, mờ dần), victory (nhảy ăn mừng). State machine (stateForUnit) nối trực tiếp vào battle engine: unit di chuyển -> walk, đánh thường -> attack, tung kỹ năng -> cast, trúng đòn -> hurt, chết -> death, thắng -> victory. Trong shop và bộ sưu tập, tướng chạy idle liên tục. Mỗi ChibiRig tự chạy đồng hồ riêng (interval 70ms) và chỉ re-render chính nó để giữ hiệu năng.

## Chạy thử
```bash
npm install
npm run icons      # sinh assets/icon.png tu icon.svg (can chay 1 lan truoc khi export/build)
npx expo start     # dev server
npm run web        # ban PC tren trinh duyet
npm test           # test headless: battle engine + economy + synergy + rig (16 kiem tra)
npx tsc --noEmit   # kiem tra kieu
npx expo export --platform web   # xuat ban web tinh vao dist/ (demo PC)
```

## Build Android / iOS
- Android APK (preview): `npx eas build --platform android --profile preview` (cần đăng nhập EAS bằng tài khoản Expo của bạn). Cũng có thể build local bằng `npx expo run:android` khi đã cài Android Studio/SDK.
- iOS: build qua EAS cloud `npx eas build --platform ios --profile production` — cần tài khoản Apple Developer (99 USD/năm do Apple thu) để cài lên máy thật/phát hành; cấu hình sẵn trong eas.json, bundle id `com.thanhtinz.dautruongchibi`.

## Cấu trúc
- `src/game/data.ts` — dữ liệu tướng, tộc/hệ, trang bị, cường hóa, quái, ải chiến dịch.
- `src/game/engine.ts` — battle engine thuần + kinh tế + shop + AI (test headless được).
- `src/game/rig.ts` — xương, clips, nội suy keyframe, state machine animation, hàm 2.5D.
- `src/game/storage.ts` — lưu tiến độ/cài đặt bằng AsyncStorage.
- `src/components/` — ChibiRig (nhân vật sống), ChibiArt (tranh tĩnh/phụ kiện, tranh vật phẩm), SceneArt (tranh nền), GameScreen (màn hình trận đấu cho cả 3 chế độ).
- `src/app/` — expo-router: trang chủ, trận đấu, bản đồ chiến dịch, bộ sưu tập, hướng dẫn.
