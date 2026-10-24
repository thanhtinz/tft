# Đấu Trường Chibi — Bản Java + Pixel 2D (LibGDX)

Bản chuyển đổi của game "Đấu Trường Chibi" từ React Native sang **Java + LibGDX** với đồ họa **pixel 2D**,
theo quyết định của chủ dự án (đợt 1, 2026-10-23). **Đợt hoàn thiện (cùng ngày):** nâng LibGDX 1.14.0 +
bản web TeaVM dựng thành công, trau chuốt giao diện desktop, nối âm thanh đầy đủ, do thám đội hình đối thủ,
nội suy vị trí mượt (smoothstep), module Android đã nối sẵn (xem mục Android về giới hạn build trong sandbox).
**Đợt bỏ Yu-Gi-Oh (cùng ngày):** gỡ toàn bộ hệ thống bài bẫy úp và điểm gốc 8000 (về **máu 100 kiểu TFT**),
đồng thời bổ sung lớp trình diễn học từ 2 game mẫu **Kanto Tactics** + **FighterZ Tactics**: sân đổi theo chặng,
đòn nặng nổ "pow" truyện tranh, announcer cuối vòng, bảng sát thương theo tướng, xoáy gộp sao + vòng chân theo sao,
popup nhận trang bị kiểu mở quà (chi tiết ở mục Gameplay).

> **Quan trọng:** Bản React Native ở thư mục gốc của repo **vẫn giữ nguyên** và demo Vercel
> (https://dau-truong-chibi.vercel.app) vẫn chạy bản RN. Bản Java này nằm trong thư mục `java/`
> và chỉ thay thế hẳn bản RN khi bản web của nó chạy được (xem mục "Bản web (TeaVM)").

## Công nghệ & phiên bản

| Thành phần | Phiên bản |
|---|---|
| JDK | Temurin **17.0.20.1** (chạy được với mọi JDK 17+) |
| Gradle | **8.10.2** (qua Gradle Wrapper trong repo — `./gradlew`) |
| LibGDX | **1.14.0** |
| Backend desktop | LWJGL3 (LWJGL 3.3.3) |
| Backend web | **backend-teavm 1.4.0** (TeaVM 0.13) — build ra HTML/JS hoàn chỉnh |
| Backend Android | AGP **8.5.2**, compileSdk/targetSdk **35**, minSdk 24 |
| Font tiếng Việt | **Baloo 2** ExtraBold (tiêu đề) + **Nunito** ExtraBold/Bold (thân chữ) qua FreeType (gdx-freetype) — font game tròn đậm, đủ dấu tiếng Việt; DejaVu giữ làm dự phòng |
| Texture giao diện | Bộ 9-patch vẽ bằng PIL trong `assets/ui/` (panel, plaque, 4 họ nút × 3 trạng thái, thẻ shop theo bậc giá 1–5, mặt thẻ, ô bench, avatar) + 9 icon pixel (coin, tim, sao, kiếm, khiên, cúp, sách, cờ, sóng) |

## Cấu trúc project

```
java/
├── settings.gradle          # include 'core', 'desktop', 'web'; 'android' tu kich hoat khi co Android SDK
├── build.gradle             # repositories dung chung (+ kho Maven cuc bo neu co)
├── core/                    # toan bo game (khong phu thuoc nen tang)
│   └── src/main/java/com/dautruongchibi/
│       ├── data/GameData.java   # so lieu port nguyen tu ban RN: 25 tuong, 8 toc/he, 12 do, 10 quai, 8 cuong hoa
│       ├── game/                # Engine (mo phong tat dinh theo seed), Match (dieu phoi tran),
│       │                        # ArenaTheme (quy tac san theo chang), Rank (10 bac + bang LP), Stages (5.200 man),
│       │                        # Profile (luu JSON local), Rng (mulberry32 giong ban RN)
│       ├── headless/HeadlessMain.java  # bo kiem tra khong giao dien (15 muc)
│       └── ui/                  # MenuScreen, CampaignScreen, MatchScreen, GuideScreen, ProfileScreen, Sound (am thanh)
├── desktop/                 # DesktopLauncher (LWJGL3 1280x720) + ScreenshotMain (cong cu kiem chung GUI)
├── android/                 # Module Android day du (AGP 8.5.2, SDK 35) — xem muc Android ve gioi han build APK
├── web/                     # Backend TeaVM 1.4.0 — build thanh cong ra web/build/webapp (index.html + game.js + assets)
├── assets/                  # units/ (35 sprite pixel), scenes/ (arena, lobby, card-back...), fonts/ (Baloo 2 + Nunito), ui/ (33 texture giao diện + icon pixel), audio/ (22 file WAV)
└── tools/
    ├── pixelize.py          # pipeline chuyen tranh goc -> sprite pixel (chay lai duoc)
    ├── make_ui.py           # sinh lai toan bo texture assets/ui/ bang PIL (panel/plaque/nut/the shop/icon pixel) — chay: python3 tools/make_ui.py
    ├── preview-sheet.png    # bang xem truoc toan bo sprite (phong to nearest-neighbor)
    ├── fetch-deps.sh / fetch_deps.py  # tai dependency bang curl vao local-maven (moi truong han che mang)
    └── shot-*.png           # anh chup kiem chung GUI (menu, lat the, chuan bi, giao tranh)
    └── shot2-*.png          # anh chup dot bo Yu-Gi-Oh (menu, chuan bi khong con panel bay, giao tranh co pow, announcer + popup do)
    └── shot3-*.png          # anh chup dot lam lai bo cuc san tran vien (menu, lat the, chuan bi, giao tranh, ket qua)
```

## Gameplay đã port (khớp bản RN)

- **Lõi auto-battler:** shop 5 thẻ theo odds từng cấp, reroll 2 vàng, mua XP 4 vàng, lãi theo vàng giữ (tối đa +5),
  thưởng chuỗi thắng/thua, bench 9 ô, bàn 7×4 (đặt ở 4 hàng dưới), ghép sao tự động ×1.8 / ×3.2,
  tộc/hệ 8 hệ với ngưỡng như bản RN, 12 trang bị, cường hóa ở vòng 2-1 / 3-2 / 4-2, bot AI dựng đội + hao hụt bot-vs-bot mô phỏng.
- **Cơ cấu chế độ (theo chốt của user):**
  - PvE **Chiến Dịch**: 5.200 màn / 52 chương sinh tất định, boss mỗi 10 màn, boss lớn cuối chương.
  - PvE **Sóng Quái** vô tận, boss mỗi 10 sóng.
  - PvP **Thường / Hạng / Đấu Tập**: đấu 8 người với 7 bot giả lập; **chỉ Hạng mới tính rank LP** vào hồ sơ;
    Đấu Tập bot yếu hơn (lùi 4 vòng sức mạnh) và không tính gì.
  - **Học Chơi** riêng ở menu. (PvP online người thật vẫn chờ Supabase như bản RN — ngoài phạm vi đợt này.)
- **Máu 100 (kiểu TFT):** mọi người chơi bắt đầu trận với **100 máu** (`Engine.HP_MAX = 100`). Sát thương thua vòng
  dùng thẳng bảng gốc của bản RN trên thang 100 (`Engine.lossDamage`: stage càng cao + số tướng địch còn sống càng
  nhiều thì trừ càng đau) — kiểm chứng headless: trận PvP trọn vẹn kéo dài **17–20 vòng** ở 3 seed. Máu về 0 = bị loại;
  thanh trên hiện máu kèm icon tim, danh sách người chơi hiện máu 0–100. (Điểm **rank LP** của chế độ Hạng là điểm
  xếp hạng kiểu TFT — giữ nguyên, không liên quan máu trong trận. Hồ sơ cũ chỉ lưu rank/thống kê nên tương thích nguyên vẹn.)
- **Lật thẻ úp mở trận:** đầu trận PvP (và các vòng x-4, sóng 1 ở Sóng Quái) hiện 8 thẻ úp lưng pixel;
  chọn 1 thẻ → lật mở (420ms, các thẻ khác lật nối tiếp) → nhận tướng về bench + 1 trang bị vào kho.
- **Bố cục màn trận — sân tràn viền (đợt làm lại theo 2 game mẫu):** tranh sân là MỘT môi trường liền mạch phủ kín
  1280×720, không còn hai cột hộp tím hai bên. Bàn cờ lớn ở giữa (ô 66px, sprite tướng 74px, bóng ellipse mềm dưới chân);
  lưới ô chỉ hiện mờ ở pha chuẩn bị và mờ hẳn về ~0 khi giao tranh. Bench là hàng ô ngay mép dưới TRONG sân, shop là
  hàng 5 thẻ ở dải dưới TRÊN sân. Thông tin dồn ra viền: tộc/hệ = chip nhỏ bán trong suốt dọc mép trái, trang bị = nút
  nổi dưới chip, danh sách người chơi = hàng gọn mép phải (avatar + tên + số máu + thanh máu mỏng, hàng của mình phủ
  vàng rất nhẹ), thanh trên = plaque nổi mỏng ở giữa-trên, nhật ký thu thành panel nhỏ bật/tắt bằng nút. Nút hành động
  ở các góc: ĐẤU! to ở góc dưới phải (trên nó là Tốc độ + Bảng sát thương), MUA XP là nút lớn góc dưới trái kiểu
  TFT mobile (cạnh Làm mới / Bán tướng), Thoát là nút nhỏ góc trên phải.
- **Trình diễn theo 2 game mẫu (Kanto Tactics + FighterZ Tactics)** — chỉ học bố cục/kỹ thuật trình diễn, không sao chép asset:
  1. **Sân đấu đổi theo chặng** (`game/ArenaTheme.java`): Chiến Dịch theo chương — `(chương-1)%3` lần lượt rừng / sa mạc / băng
     (khớp tông banner chương), vòng Boss → hoàng hôn; PvP + Sóng Quái theo stage: 1 rừng, 2 hoàng hôn, 3 sa mạc, ≥4 băng
     (Sóng Quái quy stage = ⌈sóng/5⌉), vòng Boss → hoàng hôn. Sân được chốt tại thời điểm bấm ĐẤU cho đúng vòng đang đấu.
  2. **Đòn nặng truyện tranh:** đòn crit hoặc đòn ≥ 15% máu tối đa của mục tiêu → cụm nổ mây trắng "pow" + 5 vệt tốc độ
     tỏa ra tại điểm trúng, mục tiêu **lộn nghiêng** ±38° trong 0,35s. (Số sát thương to kiểu Kanto giữ nguyên.)
  3. **Announcer cuối vòng:** chữ Baloo lớn "THẮNG!" / "THUA!" (thắng trận có boss: **"HẠ GỤC BOSS!"**) phồng lên giữa sân
     ~1,5s rồi tan, kèm banner nhỏ chứa tóm tắt vòng + máu còn lại; sau đó mới hiện panel kết quả chi tiết.
  4. **Bảng sát thương theo tướng:** nút "Bảng sát thương" ở góc dưới phải bật/tắt panel nổi đè mép phải sân, liệt kê từng tướng
     của **cả 2 bên** kèm thanh ngang theo tổng sát thương gây ra trong trận vừa đấu (dữ liệu `Engine.damageChart` cộng từ sự kiện engine).
  5. **Lên sao kiểu tiến hóa:** khi gộp sao, 3 chấm sao xoáy bay vào tướng kết quả + vòng sáng nở ở chân + chớp sáng;
     tướng **2 sao có vòng bạc ở chân**, **3 sao có hào quang vàng cháy** nhấp nháy kèm 3 chấm sao bay quanh chân (cả ở pha chuẩn bị lẫn trong trận).
  6. **Popup nhận trang bị kiểu mở quà:** thắng vòng quái PvE (mọi vòng quái trong PvP; Sóng Quái mỗi 3 sóng; Chiến Dịch khi thắng màn Boss)
     rơi 1 trang bị ngẫu nhiên vào kho + thẻ popup (viên ngọc màu theo trang bị + tên + dòng chỉ số) nảy vào giữa-phải sân ~2,3s.
- **Hồ sơ local:** tên người chơi, hạng (10 bậc Sắt → Thách Đấu, bảng LP port từ bản RN: Top 1 +46 ở nhóm thấp...),
  cấp độ/XP, tiến độ chiến dịch, kỷ lục sóng — lưu JSON tại `~/.dau-truong-chibi/profile.json`. Chỉ PvP Hạng mới đổi rank LP.
- **Animation kiểu sprite như bản RN:** nhún thở (bob), lao đòn, giật đỏ khi trúng đòn, ngã xoay + mờ dần khi chết,
  đạn bay cho tướng tầm xa, vệt sáng tung chiêu, số sát thương phong cách Kanto (cam/vàng, chí mạng to + "!"),
  thanh máu/mana/khiên viền mỏng + sao phía trên đầu.

## Cách build & chạy

> **Lưu ý bản trên GitHub:** các file nhị phân (PNG sprite/scene, font TTF, `gradle-wrapper.jar`) được lưu
> dưới dạng text base64 (`*.b64`) theo quy ước của repo này. Sau khi clone/pull thư mục `java/`, chạy một lần:
> `bash tools/restore-binaries.sh` để giải mã chúng về file thật trước khi build.

Máy có mạng bình thường (Gradle tự tải dependency từ Maven Central):

```bash
cd java
./gradlew :desktop:run            # chay ban desktop
./gradlew :desktop:verifyHeadless # chay bo kiem tra logic (phai dat 15 PASS / 0 FAIL)
./gradlew :web:buildWeb           # dung ban web TeaVM -> web/build/webapp (index.html + game.js + assets)
./gradlew :android:assembleDebug  # build APK debug (can Android SDK; module chi kich hoat khi co
                                  # local.properties chua sdk.dir hoac bien ANDROID_HOME)
                                  # -> android/build/outputs/apk/debug/android-debug.apk
```

Chụp ảnh kiểm chứng GUI (cần Xvfb, không cần người bấm — công cụ tự vào trận, tự đánh):

```bash
xvfb-run -a ./gradlew :desktop:screenshot -PscreenshotMode=battle4 -PscreenshotOut=tools/shot-battle4.png
# che do: menu | draft | planning | battle | battle4 (tran vong 4, nhieu tuong) | result (announcer dau pha ket qua)
```

### Môi trường sandbox hạn chế mạng của Java (ghi lại để chạy lại được ở máy Muse)

- Sandbox chặn TCP trực tiếp của tiến trình Java (quyền `other_tcp` = Deny) nên Gradle **không tự tải được**
  dependency và cả Gradle distribution. Đã xử lý:
  1. Gradle distribution 8.10.2 được tải bằng `curl` và nạp sẵn vào wrapper dists
     (`GRADLE_USER_HOME/wrapper/dists/gradle-8.10.2-bin/<md5-base36-của-URL>/` + file `.ok`).
  2. Dependency được tải bằng curl vào kho Maven cục bộ: `bash tools/fetch-deps.sh`
     (sinh `local-maven/`, ~190MB, **không** đưa lên GitHub). `build.gradle` gốc tự dùng kho này nếu thư mục tồn tại,
     và luôn khai báo Maven Central phía sau cho máy bình thường. Build trong sandbox thêm cờ `--offline`.
  3. Mọi lệnh Gradle cần `-Djava.net.preferIPv4Stack=true` (đã đặt sẵn trong `gradle.properties` của project
     và biến `GRADLE_OPTS`) vì daemon Gradle bind IPv6 bị lỗi trong sandbox.
- JDK dùng ở máy Muse: Temurin 17 tại `~/workspace/tools/jdk17` (`source ~/workspace/tools/env.sh`),
  `GRADLE_USER_HOME=~/workspace/tft-java-game/.gradle-home` (bản sao cấu hình proxy của máy).

## Pipeline pixel art

```bash
python3 tools/pixelize.py   # tai tao toan bo sprite + preview sheet tu tranh goc cua ban RN
```

Pipeline v2 (đợt nâng chất lượng hình ảnh): sprite — cắt theo hộp alpha → tăng bão hòa thích ứng
(tướng nhạt được tăng mạnh hơn) → thu nhỏ premultiplied-alpha (LANCZOS) về tối đa 108px chiều cao →
làm sắc nét → cắt alpha cứng + xóa mảnh bụi rời rạc → lượng tử hóa palette tối đa 48 màu (MEDIANCUT,
không dither) → vẽ viền đậm 1px quanh silhouette → canvas 128×128 neo đáy giữa.
Sân đấu dùng TRANH VẼ MỚI giàu chi tiết trong `tools/new-art/` (vùng chơi có kết cấu mặt đất, vật thể
kể chuyện quanh viền, ao nhỏ lệch góc — thay tranh RN cũ có ao phẳng giữa sân): pixel-hóa ở 640×360,
palette 128 màu, không dither (dither Floyd–Steinberg của v1 là nguồn làm tranh "bùn"), nướng sẵn
vignette nhẹ vào tranh. Lobby 640×360/128 màu, lưng thẻ 128×179, banner rộng 320px.
Kết quả: 35 sprite tướng/quái + arena 4 biến thể (rừng/hoàng hôn/sa mạc/băng).
Xem trước: `tools/preview-sheet.png`, `tools/arena-sheet.png`, `tools/arena-before-after.png`.

## Android — module đã nối, APK chưa build được TRONG SANDBOX này

- Module `android/` đã hoàn chỉnh: AGP 8.5.2, compileSdk/targetSdk **35**, minSdk 24, bật core-library-desugaring
  (core dùng `List.of()` của Java 9+), assets trỏ về `../assets`, AndroidLauncher + Manifest (landscape, exported).
- `settings.gradle` tự kích hoạt module khi máy build có Android SDK (`local.properties` với `sdk.dir` hoặc biến `ANDROID_HOME`)
  để không làm hỏng build desktop/web trên máy chưa cài SDK.
- **Điểm kẹt (chỉ trong sandbox Muse):** sandbox chặn TCP trực tiếp của tiến trình Java nên Gradle không tự tải được dependency;
  cây phụ thuộc của AGP 8.5.2 (hàng trăm module: builder, lint/PMD, AndroidX...) được tải bằng curl vào `local-maven/`
  đã đạt ~1,1GB và 288+ module nhưng vẫn chưa đủ khép kín để `:android:assembleDebug --offline` chạy qua —
  mỗi lần chạy Gradle lại lộ thêm một lớp module thiếu (40+ → 26 → 18 → 9...). Đã dừng theo kỷ luật thời lượng của đợt.
- **Trên máy có mạng bình thường, APK build thẳng được:** repositories đã khai `google()` + `mavenCentral()` (+ kho cục bộ nếu có),
  Gradle tự tải AGP và toàn bộ phụ thuộc: `cd java && ./gradlew :android:assembleDebug`.

## Kiểm chứng đã làm (đợt này)

- `./gradlew :desktop:compileJava` — **BUILD SUCCESSFUL** (core + desktop).
- `./gradlew :desktop:verifyHeadless` — **15 PASS / 0 FAIL** (đợt bỏ Yu-Gi-Oh cập nhật lại bộ kiểm tra: bỏ 6 mục bẫy,
  mục LP 8000 thay bằng mục máu 100 + bảng sát thương gốc; thêm mục bảng sát thương theo tướng và mục quy tắc sân theo chặng), gồm:
  dữ liệu gốc khớp bản RN; RNG tất định; sinh 5.200 màn; ghép sao; shop/odds; **máu người chơi = 100 + sát thương thua vòng thang 100**;
  bảng rank LP; lật thẻ 8 lá; mô phỏng trận tất định; **bảng sát thương cộng từ sự kiện, cả 2 bên, sắp giảm dần**;
  **quy tắc sân theo chặng (chương/stage/Boss)**; **trận PvP 8 người trọn vẹn tới khi có hạng (3 seed: 17–20 vòng)**;
  PvE chiến dịch; Sóng Quái; hồ sơ JSON lưu/đọc vòng lặp.
- GUI thật dưới Xvfb (đợt bỏ Yu-Gi-Oh): chụp 5 màn hình `tools/shot2-*.png` — menu (mô tả "100 máu"),
  pha chuẩn bị (**không còn panel BẪY ÚP**, bố cục gọn, máu 100/100, nút Bảng sát thương),
  giao tranh vòng 1-4 (**bắt được cụm pow trắng nổ tại tướng trúng crit "-42!"** + vòng bạc ở chân tướng 2 sao, sân rừng đúng stage 1),
  và pha kết quả (**announcer "THẮNG!" lớn giữa sân + banner tóm tắt + popup "NHẬN TRANG BỊ! Trái Tim Ấm +400 máu"**).
  Công cụ chụp (`desktop/ScreenshotMain`) bắt khoảnh khắc theo `playT`/trạng thái pha và ưu tiên khung hình có pow đang nổ;
  thêm chế độ `result` (tăng tốc playback ×3 để vào pha kết quả nhanh).
- **Đợt hoàn thiện:** sau khi nâng LibGDX 1.14.0, hồi quy đầy đủ PASS và `:web:buildWeb` thành công
  (chi tiết ở mục Bản web). Giao diện desktop được trau chuốt lại (panel kéo dài, hết tràn/chồng chữ,
  lưới bàn cờ mờ hẳn, sprite trong trận to hơn 52→63px) và chụp lại các màn cuối.
  Âm thanh: game khởi động và chạy trọn vòng menu → trận → kết quả dưới Xvfb với lớp `Sound` đã nạp 22 file WAV không lỗi
  (sandbox không có card tiếng nên chỉ kiểm chứng được mức nạp/khởi tạo, không nghe được tiếng thật).

## Đơn giản hóa & giới hạn đã biết

- **Do thám đối thủ (đã bổ sung đợt hoàn thiện):** pha chuẩn bị hiện tên bot + **toàn bộ đội hình** của đối thủ vòng này
  (tất định theo seed/cursor vòng — `Match.peekNextOpponentTeam()`), và vẽ trước đội hình bot lên nửa trên bàn cờ ở vòng PvP thường.
- **Phát lại giao tranh:** engine xuất khung hình mỗi 0,5s; GUI nội suy giữa 2 khung — vị trí dùng **smoothstep** (mượt ở đầu/cuối bước di chuyển),
  máu/mana/khiên nội suy tuyến tính. Vẫn là phát lại ở mức sprite, không phải mô phỏng 60fps.
- **Pha chuẩn bị** có đếm ngược 90 giây, hết giờ tự vào trận (bản RN cũng tự bắt đầu theo đồng hồ vòng).
- **Âm thanh (đã nối đợt hoàn thiện):** tái sử dụng nguyên dàn WAV tổng hợp của bản RN — 22 file trong `assets/audio/`
  (2 nhạc nền: menu + trong trận, phát lặp; 20 SFX). Đã nối: bấm nút (click), mua tướng (coin), bán (sell), đặt/dời tướng (place),
  làm mới shop (reroll), gắn đồ (equip), lên cấp (levelup), lật thẻ mở trận (sparkle), chọn cường hóa (levelup),
  bắt đầu trận (start), thắng/thua vòng (win/lose). Có **nút "Âm thanh: Bật/Tắt" ở menu**,
  trạng thái lưu bằng Preferences. Mọi lỗi nạp file/thiết bị đều được nuốt im lặng để không bao giờ crash game.
- `autoPlan()` trong `Match.java` là bot điều khiển phục vụ kiểm tra headless — chơi đơn giản (không reroll/xp chủ động) nên thường xếp hạng thấp khi tự đánh trọn trận; đó là giới hạn của bot kiểm tra, không phải lỗi engine.

## Bản web (TeaVM) — ĐÃ DỰNG ĐƯỢC (đợt hoàn thiện)

Nâng cấp theo đúng hướng đã ghi ở đợt 1: **LibGDX 1.14.0 + backend-teavm 1.4.0 (TeaVM 0.13)**.
Các lỗi classlib của đợt 1 được sửa tận gốc:

1. `Profile` chuyển hẳn từ `java.nio.file` sang `java.io` (File/FileInputStream/FileOutputStream, charset "UTF-8").
2. `Rng`: bỏ `Integer.toUnsignedLong` → `(t & 0xFFFFFFFFL)`; `Stages`: bỏ `Integer.sum` → cộng tay.
3. Ba chỗ `Map.merge(k, 1, Integer::sum)` (Engine/Match/MatchScreen) → `put(k, getOrDefault(k, 0) + 1)`.
4. `WebLauncher`: bỏ field `config.preloadAssets` (không còn trong backend 1.4.0).

Kết quả: `./gradlew :web:buildWeb` — **BUILD SUCCESSFUL**. Output tại `web/build/webapp/`:
`index.html` + `game.js` (~889KB, qua kiểm tra cú pháp `node --check`) + thư mục `assets/` đủ **68/68 file**
(46 file đồ họa/font + 22 file WAV). Module `web` đã nằm trong `settings.gradle`.

**Giới hạn trung thực:** mới dừng ở mức *build thành công* — **chưa chạy kiểm chứng runtime trong trình duyệt được**
vì Chromium của sandbox bị treo ngay cả với trang trống (không phải lỗi của game). Cần mở `web/build/webapp/index.html`
bằng một máy chủ tĩnh (ví dụ `python3 -m http.server`) trên máy thường để chơi thử trước khi cân nhắc thay demo RN trên Vercel
(quyết định thay demo thuộc về chủ dự án; đợt này **không** đụng vào cấu hình Vercel).

## Đợt làm đẹp giao diện (sau góp ý "giao diện nhìn vẫn thô")

- **Font game:** Baloo 2 (tiêu đề, viền nâu đậm + bóng) và Nunito (thân chữ) thay DejaVu. Lấy bản variable từ
  google/fonts (GitHub raw) rồi dùng `fonttools varLib.instancer` cố định trọng lượng (Baloo 800, Nunito 700/800/900)
  thành TTF tĩnh trong `assets/fonts/`. Lưu ý: hai font này **không có glyph** ★ ♥ ✦ → — sao tướng/choáng vẽ bằng
  icon pixel `assets/ui/icon_star.png`, các chuỗi UI tránh các ký tự đó.
- **Texture vẽ:** `tools/make_ui.py` (PIL) sinh 33 PNG vào `assets/ui/`: panel/plaque 9-patch tông tím sẫm + viền vàng +
  kim cương góc, 4 họ nút × 3 trạng thái (thường/hồng ngọc/xanh lá/đỏ), mặt thẻ parchment, khung thẻ shop theo màu
  bậc giá 1–5, ô bench, avatar vòng tròn, 9 icon pixel 48px. `Assets` nạp thành NinePatch; `Ui` tự chọn texture theo
  màu nút cũ nên mọi màn hình kế thừa diện mạo mới.
- **Bố cục:** menu = tranh lobby tràn viền + nút plaque có icon; màn trận = plaque chỉ số giữa-trên (icon coin/sao/tim),
  danh sách người chơi dạng hàng avatar tròn + máu, shop có khung bậc giá + phát sáng "Sắp gộp!", các
  popup dùng plaque/panel vẽ. Logic/engine/dữ liệu không đổi — kiểm chứng lại ở đợt đó: compile desktop PASS,
  `verifyHeadless` PASS, `:web:buildWeb` PASS (webapp 107 file, game.js ~900KB), ảnh chụp 4 màn trong `tools/shot-*.png`.
- **Mẹo build trong sandbox này:** tiến trình Java bị chặn TCP IPv4 (kể cả loopback client↔daemon của Gradle) nhưng
  IPv6 loopback thông — chạy Gradle với `JDK_JAVA_OPTIONS="-Djava.net.preferIPv4Stack=false -Djava.net.preferIPv6Addresses=true"`
  và binary Gradle cài sẵn (wrapper chưa tải xong distribution). Trên máy thường không cần mẹo này.
