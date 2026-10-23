# Đấu Trường Chibi

Game auto-battler kiểu Teamfight Tactics (TFT) với đồ họa chibi vẽ tay bằng SVG, chạy đa nền tảng PC / Android / iOS từ một codebase React Native + Expo + TypeScript. Màn hình trận đấu nằm NGANG theo bố cục TFT: sàn HEX, panel tộc/hệ bên trái, bảng 8 người chơi bên phải, shop chuẩn TFT ở dưới.

## Chế độ chơi
1. **PvP Online (người đấu người)** — tạo phòng mã 6 ký tự / vào phòng bằng mã / ghép nhanh; tối đa 8 người, ghế trống và người mất kết nối được AI lấp. Cần cấu hình Supabase (xem mục riêng bên dưới).
2. **Đấu với AI (offline)** — trận 8 người (bạn + 7 bot), cấu trúc stage kiểu TFT (xem dưới).
3. **Chiến Dịch PvE** — **5.200 màn**, 52 chương x 100 màn theo chủ đề, Boss mỗi 10 màn, Boss lớn cuối chương, chấm 1-3 sao, lưu tiến độ bằng AsyncStorage.
4. **Thử Thách Sóng Quái** — sóng quái vô hạn tăng dần độ khó, lưu kỷ lục.
5. **Hướng Dẫn Chơi Tương Tác** — mascot Nana dẫn từng bước trong một trận luyện tập (mua tướng, đặt bàn, ghép sao, làm mới, mua XP, gắn đồ, giao tranh), chỉ qua bước khi làm đúng; hoàn thành lần đầu thưởng 50 Ngọc. Trang chủ tự gợi ý chế độ này cho người chơi mới.

## Màn hình trận đấu (giống TFT ở bố cục và nhịp trận)
- **Khóa ngang**: native tự khóa landscape khi vào trận (expo-screen-orientation) và mở khóa khi thoát; bản web hiển thị khung game ngang 16:9 giữa nền tối (letterbox).
- **Trên cùng**: dãy ô round của stage hiện tại (ô hiện tại sáng lên, phân biệt PvE/PvP/carousel), nhãn stage-round (ví dụ 2-3), đồng hồ đếm ngược chuẩn bị (hết giờ tự vào giao tranh, có tiếng tick 5 giây cuối), nút tạm dừng, tốc độ trận, bật/tắt nhạc và tiếng.
- **Bên trái**: panel Tộc/Hệ với số đếm và mốc (màu đồng/bạc/vàng theo bậc kích hoạt, highlight theo tướng đang chọn), danh sách cường hóa đã chọn, khay trang bị chưa gắn, thông tin tướng đang chọn (bán / về bench).
- **Giữa**: đấu trường sàn **HEX** 7x4 (hàng so le kiểu TFT) với tranh nền nhiều lớp 2.5D, vòng sáng dưới tướng được chọn, linh thú đại diện người chơi ở góc sân (giật mình khi thua đậm, màn hình rung nhẹ khi mất nhiều máu), số tướng trên bàn/tối đa.
- **Bên phải**: bảng 8 người chơi (avatar linh thú, tên, thanh máu + số máu, cấp, chuỗi thắng/thua, người bị loại bị xám và hiện hạng, đối thủ của round được viền sáng). **Chạm một người chơi để xem bàn cờ của họ (scouting)**. Sau giao tranh panel tự chuyển sang tab **Thống kê sát thương** (theo nhật ký trận, chủ yếu là đòn đánh thường).
- **Bench + Shop dưới cùng**: bench 9 ô ngay trên shop; shop gồm thẻ cấp (thanh XP, nút Mua XP 4 vàng — phím F trên web), nút Làm mới 2 vàng (phím D), nút Khóa shop, vàng lớn kèm lãi sắp nhận và chuỗi thắng/thua; 5 thẻ tướng khổ ngang có tranh lớn, tộc/hệ, giá với **màu nền theo bậc giá 1-5** (xám/xanh lá/xanh dương/tím/vàng), phát sáng khi sắp ghép đủ 3 bản sao; dòng **tỉ lệ % ra tướng theo bậc giá ở cấp hiện tại** ngay trên shop.

## Cấu trúc stage và cơ chế kiểu TFT
- Stage 1 có 4 round (1-1, 1-2, 1-3 là PvE; 1-4 là PvP). Mỗi stage sau có 7 round, round cuối mỗi stage là PvE (quái lớn). Round giữa stage (x-4) từ stage 2 là **vòng chọn Carousel**: vòng tròn tướng kèm trang bị quay, chạm để chọn 1 (AI chọn sau).
- **Cường hóa ở 2-1, 3-2, 4-2** (chọn 1 trong 3, hiệu lực cả trận) và hiện thành chip ở panel trái.
- Sát thương thua round = sát thương theo stage (0/2/3/4/6/8/10/12...) + 2 cho mỗi quân địch còn sống.
- Kinh tế TFT: vàng cơ bản 5 + lãi tối đa 5 (mốc 10/20/30/40/50) + streak + vàng thắng round; shop 5 ô theo tỉ lệ cấp, ghép sao tự động 3 lên 1 sao cao hơn (x1.8 / x3.2 chỉ số), bench 9 ô, cấp tối đa 9.
- 25 tướng, 8 tộc/hệ có buff thật, 12 trang bị (tối đa 3/tướng), 8 cường hóa, 12 loại hiệu ứng kỹ năng (đơn thể, AoE, choáng, đóng băng, hồi máu, khiên, buff tốc đánh, triệu hồi, kết liễu, độc, hút máu, lao tới).
- Battle engine thuần TypeScript (`src/game/engine.ts`) dùng **RNG có seed (mulberry32)**: cùng đội hình + cùng seed luôn cho kết quả giống hệt — nền tảng cho PvP online.

## Chiến dịch PvE 5.200 màn sinh tự động (`src/game/stages.ts`)
- 12 màn đầu dùng nguyên thiết kế tay (CAMPAIGN). Từ màn 13, đội hình địch được **sinh xác định theo số màn** (seed từ stage id): quái theo chủ đề của chương (10 chủ đề xoay vòng qua 52 chương), số lượng 3→9, hệ số scale máu/tấn công tăng theo đường cong mũ nhẹ `1 + ((id-12)/140)^1.25`, quái 2-3 sao xuất hiện dần ở màn cao, Boss mỗi 10 màn và Boss lớn (xoay vòng 3 boss) mỗi 100 màn. Phần thưởng Ngọc tăng dần, boss x1.5, boss chương x3.
- Bản đồ chiến dịch hiển thị theo từng chương (FlatList ảo hóa, chỉ render cửa sổ đang xem), tự cuộn tới màn đang mở, hiển thị tiến độ x/5.200.

## PvP Online — kiến trúc (`src/game/online.ts`, `onlineClient.ts`, `supabase.ts`)
- Transport: **Supabase Realtime** (Broadcast + Presence theo channel phòng `dtc-room-<MÃ>`), không cần server riêng và không bắt buộc bảng dữ liệu (`supabase/schema.sql` chỉ là tùy chọn cho lịch sử trận/phòng công khai).
- **Host-authoritative**: chủ phòng gán ghế, lấp bot vào ghế trống, phát vòng chuẩn bị, ghép cặp vòng tròn (tránh lặp cặp gần đây, số lẻ có trận "bóng ma" không gây sát thương cho phía bị mượn đội hình), phát seed cho từng cặp.
- Hết giờ chuẩn bị, mỗi client gửi **snapshot đội hình**; host phát lại toàn bộ snapshot. Mọi client **tự mô phỏng** trận của mình bằng battle engine với cùng seed (thứ tự canonical: ghế thấp là team 0) nên hai phía cùng cặp nhận kết quả **giống hệt**. Client gửi kết quả về, host tự mô phỏng lại để đối chiếu, tổng hợp máu cả 8 người và phát bảng xếp hạng mỗi vòng; cuối trận có hạng 1-8 cho mọi người.
- Mất kết nối: presence rời → ghế chuyển AI điều khiển, có thông báo. Chủ phòng rời giữa trận: người thật còn kết nối có ghế thấp nhất tiếp quản (host migration) vì trạng thái standings đã được mọi client lưu.
- Danh tính: tên hiển thị tự chọn + uuid ẩn danh lưu trên máy (không bắt buộc tài khoản).
- Round PvE trong trận online vẫn theo danh sách vòng PvE của engine; chỉ chế độ offline áp dụng cấu trúc stage chi tiết ở trên (đơn giản hóa có chủ đích để giữ đồng bộ giao thức).

### Bật PvP Online (Supabase) — khoảng 3 phút
1. Vào https://supabase.com, đăng nhập và tạo project mới (gợi ý tên `dau-truong-chibi`, region Singapore hoặc Tokyo), đặt mật khẩu database bất kỳ.
2. Trong project: vào **Project Settings → API**, copy **Project URL** và **anon public key**.
3. Điền vào `app.json`: `expo.extra.supabaseUrl` và `expo.extra.supabaseAnonKey` (đã có sẵn 2 khóa trống), hoặc đặt biến môi trường `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` khi build.
4. Build lại bản web/app (Vercel tự deploy lại khi push main nếu biến môi trường được đặt trong Vercel Project Settings; bản native cần build lại bằng EAS).
5. Riêng phòng đấu online thì không cần chạy SQL. Nếu muốn bật cả **đăng nhập online + hồ sơ đồng bộ**, hãy chạy `supabase/schema.sql` trong SQL Editor (tạo bảng `profiles` + lịch sử) và tắt Confirm email — chi tiết ở mục "Hệ thống tài khoản" ngay dưới.
Lưu ý: anon key là khóa công khai phía client, dùng kèm Realtime cho phòng bạn bè là phù hợp; đừng điền service_role key vào app.

## Hệ thống tài khoản, hồ sơ và hạng (`src/game/auth.ts`, `accounts.ts`, `authCloud.ts`)
- **Danh tính kiểu Riot ID**: Tên hiển thị + tag #4 số tự sinh (ví dụ `TinPro#2003`) — định danh mời bạn/chủ phòng. Chạm avatar + tên ở góc trên trái trang chủ để vào **Trang tài khoản** (khách thì vào màn Đăng nhập).
- **2 chế độ backend**: (1) Có cấu hình Supabase (cùng khóa với PvP Online ở trên): dùng **Supabase Auth** thật (email/mật khẩu), hồ sơ lưu bảng `profiles` trong `supabase/schema.sql` (đã kèm RLS: đọc công khai hồ sơ rút gọn để tìm bạn, chỉ chủ sở hữu sửa được của mình) — cần thêm bước: chạy `schema.sql` trong SQL Editor và tắt **Confirm email** (Authentication → Providers → Email) để đăng nhập được ngay. (2) Chưa cấu hình: **tài khoản LOCAL trên thiết bị** — đăng ký/đăng nhập lưu AsyncStorage, mật khẩu băm SHA-256 + salt lặp 200 vòng (`auth.ts` tự cài SHA-256 thuần, không lưu mật khẩu thô), nhiều tài khoản trên cùng máy, dữ liệu game (Ngọc/PvE/thống kê/hạng/lịch sử/bạn bè) gắn riêng theo từng tài khoản. Đây là chế độ test ngay trên bản live; giao diện ghi rõ "Tài khoản trên thiết bị này". Chế độ **khách** vẫn chơi mọi chế độ nhưng không có hồ sơ đám mây/hạng chính thức.
- **Trang tài khoản** (bố cục hồ sơ kiểu TFT): header có avatar tướng (đổi được từ danh sách tướng), Tên#Tag (chạm giữ để sao chép), cấp độ + thanh XP, huy hiệu hạng vẽ SVG lớn + LP + thanh tiến trình hạng. 4 tab: **Tổng quan** (tổng trận, Top 1, Top 4, hạng trung bình, tiến độ PvE x/5.200, kỷ lục sóng, Ngọc), **Lịch sử đấu** (ghi thật khi trận kết thúc ở mọi chế độ: hạng đạt, đội hình cuối trận, +XP, ±LP), **Bạn bè** (thêm bằng Riot ID; local chỉ tìm tài khoản trên cùng máy, Supabase tìm trong `profiles`; xóa bạn), **Cài đặt** (đổi tên, đổi avatar, đổi mật khẩu, đăng xuất, xóa tài khoản xác nhận 2 bước).
- **XP/Cấp**: mỗi trận cộng XP theo hạng (Đấu Trường hạng 1→8: 50/42/36/30/24/18/12/8), thắng PvE +30, thua +8, sóng quái theo sóng, học chơi +20. XP lên cấp: cần `80 + (cấp-1)×40`.
- **Hạng kiểu TFT**: 10 bậc Sắt → Đồng → Bạc → Vàng → Bạch Kim → Ngọc Lục Bảo → Kim Cương → Cao Thủ → Đại Cao Thủ → Thách Đấu; bậc tới Kim Cương chia IV–I, đủ 100 LP thăng 1 hạng/bậc; giáng hạng khi LP âm (về mức tương đương 75 LP trừ phần âm — đơn giản hóa so với TFT gốc), Cao Thủ+ thăng bậc ở 200 LP, sàn Sắt IV = 0 LP không tụt nữa. Chỉ trận Đấu Trường (AI + Online) tính LP; PvE/sóng quái/học chơi chỉ cộng XP. Bảng LP theo nhóm bậc (hạng 1..8):
  - Sắt/Đồng: +46/+32/+20/+12/−4/−12/−22/−34
  - Bạc/Vàng: +42/+30/+19/+11/−6/−15/−25/−38
  - Bạch Kim/Ngọc Lục Bảo: +40/+28/+18/+10/−8/−17/−28/−42
  - Kim Cương trở lên: +38/+26/+17/+10/−10/−19/−30/−45
- Màn kết quả trận hiện +XP và thay đổi LP + huy hiệu hạng mới; PvP Online dùng Tên#Tag + avatar của tài khoản đã đăng nhập làm danh tính phòng.
- Giới hạn hiện tại: chưa có Supabase project live (chờ người dùng tạo và điền URL + anon key như mục PvP Online) nên nhánh cloud chưa kiểm chứng thực tế — code bám API Supabase Auth/Profile chuẩn và cùng bật với PvP Online khi có khóa. Xóa tài khoản ở chế độ Supabase xóa dữ liệu hồ sơ/lịch sử của chính người dùng (RLS owner) rồi đăng xuất; xóa hẳn user khỏi Auth cần quyền admin trong Dashboard.

## Âm thanh tổng hợp bằng code (`src/game/audio.ts`)
- Không dùng file nhạc thương mại. Trên **web**: Web Audio API — BGM dạng sequencer chiptune vòng lặp (2 bản: trang chủ nhẹ nhàng 96bpm, trong trận hào hứng 132bpm, có giai điệu + bass), 15 SFX tổng hợp bằng oscillator (click, tiếng xu khi mua, bán, đặt tướng, làm mới, lên sao, lên cấp, gắn đồ, bắt đầu trận, đánh trúng, tung chiêu, thắng, thua, vô địch, lỗi). Nhạc chỉ bắt đầu sau thao tác đầu tiên (đúng chính sách autoplay của trình duyệt).
- Trên **native**: `npm run audio` (`scripts/generate-audio.mjs`) render sẵn 17 file WAV (15 SFX + 2 BGM, khoảng 1.1MB) vào `assets/audio/` để phát bằng expo-audio. File WAV không push lên Git (đã có trong .gitignore) — bước build Vercel đã tự chạy `npm run audio` qua `vercel.json`. Giới hạn hiện tại: đường phát native dùng require động nên trên Metro có thể im lặng nếu file chưa được bundle tĩnh; bản web (bản chơi thử chính) có nhạc + SFX đầy đủ.
- Bật/tắt riêng nhạc và hiệu ứng ở trang chủ (mục Cài đặt âm thanh) và nút tắt nhanh ngay trong trận; lựa chọn được lưu bằng AsyncStorage.

## Đồ họa: tranh vẽ + 2.5D + rig xương kiểu Spine (tự xây)
- Toàn bộ tướng/quái/boss là **tranh chibi vẽ chi tiết bằng SVG vector**; không dùng ảnh ngoài, không dùng emoji.
- **Hệ thống rig "Spine-like" tự xây bằng code** (`src/game/rig.ts` + `src/components/ChibiRig.tsx`) — không phải runtime Spine thương mại và không có file .spine: 11 xương có pivot/z-order, 7 clip keyframe (idle/walk/attack/cast/hurt/death/victory) nối thật vào trạng thái trận đấu; trong shop/bộ sưu tập tướng chạy idle liên tục. 2.5D: nền nhiều lớp, scale + sắp xếp độ sâu theo hàng, bóng đổ elip co giãn theo nhịp bob.

## Chạy thử
```bash
npm install
npm run icons      # sinh assets/icon.png từ icon.svg (1 lần trước export/build)
npm run audio      # sinh assets/audio/*.wav cho ban native
npx expo start     # dev server
npm run web        # bản PC trên trình duyệt
npm test           # 5 bo test headless: engine+rig, online+deterministic, stages, audio, tutorial (tong 103 kiem tra)
npx tsc --noEmit   # kiểm tra kiểu
npx expo export --platform web   # xuất bản web tĩnh vào dist/ (demo PC)
```

## Build Android / iOS
- Android APK (preview): `npx eas build --platform android --profile preview` (cần đăng nhập EAS bằng tài khoản Expo của bạn). Muốn PvP online trên bản build thì đặt sẵn 2 biến môi trường Supabase trước khi build.
- iOS: `npx eas build --platform ios --profile production` qua EAS cloud — cần tài khoản Apple Developer (99 USD/năm do Apple thu); bundle id `com.thanhtinz.dautruongchibi`.

## Cấu trúc
- `src/game/data.ts` — dữ liệu tướng, tộc/hệ, trang bị, cường hóa, quái, 12 ải đầu.
- `src/game/engine.ts` — battle engine thuần (RNG mulberry32 có seed) + kinh tế + shop + AI.
- `src/game/stages.ts` — sinh 5.200 màn PvE xác định theo seed + đường cong độ khó.
- `src/game/online.ts` — giao thức phòng thuần: mã phòng, snapshot, ghép cặp, seed cặp đấu, tổng hợp sát thương/hạng, transport mock cho test.
- `src/game/onlineClient.ts` — OnlineMatch: điều phối trận online host-authoritative trên Supabase Realtime (lobby, vòng đấu, host migration, lấp bot, ghép nhanh).
- `src/game/supabase.ts` — khởi tạo client Supabase từ env/app.json extra (trả null nếu chưa cấu hình).
- `src/game/audio.ts` — audio manager duy nhất: dữ liệu giai điệu/SFX + engine Web Audio (web) + phát WAV qua expo-audio (native).
- `src/game/tutorial.ts` — máy trạng thái 12 bước của hướng dẫn tương tác.
- `src/game/rig.ts` — xương, clips, nội suy keyframe, state machine animation, hàm 2.5D.
- `src/game/storage.ts` — tiến độ/cài đặt/danh tính người chơi (AsyncStorage), scope dữ liệu theo tài khoản + hồ sơ/lịch sử/bạn bè.
- `src/game/auth.ts` — logic tài khoản thuần (SHA-256 tự cài, băm mật khẩu + salt, đăng ký/đăng nhập local, tag Riot ID, XP/cấp, LP + 10 bậc hạng) — có `scripts/test-auth.mjs`.
- `src/game/accounts.ts` — phiên đăng nhập + danh tính, gán thưởng XP/LP/lịch sử sau trận, bạn bè local.
- `src/game/authCloud.ts` — lớp Supabase Auth + bảng `profiles` (chỉ chạy khi đã cấu hình khóa).
- `src/components/` — GameScreen (màn hình trận ngang chuẩn TFT cho offline/tutorial), OnlineGameScreen (phòng + trận online), ChibiRig, ChibiArt, SceneArt, RankBadge (huy hiệu hạng SVG), AuthUi (khung màn hình đăng nhập/đăng ký).
- `src/app/` — expo-router: trang chủ, trận đấu, bản đồ chiến dịch, bộ sưu tập, hướng dẫn đọc, menu PvP online, phòng online, đăng nhập, đăng ký, tài khoản.
- `supabase/schema.sql` — bảng phòng/lịch sử online (tùy chọn) + bảng `profiles`/lịch sử tài khoản cho đăng nhập online.
