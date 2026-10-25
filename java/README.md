# Đấu Trường Chibi — Bản Java + Đồ họa vẽ tay 2D (LibGDX)

Bản chuyển đổi của game "Đấu Trường Chibi" từ React Native sang **Java + LibGDX** với đồ họa **vẽ tay 2D**,
(trước đây là pixel 2D — xem đợt painted hóa bên dưới),
theo quyết định của chủ dự án (đợt 1, 2026-10-23). **Đợt hoàn thiện (cùng ngày):** nâng LibGDX 1.14.0 +
bản web TeaVM dựng thành công, trau chuốt giao diện desktop, nối âm thanh đầy đủ, do thám đội hình đối thủ,
nội suy vị trí mượt (smoothstep), module Android đã nối sẵn (xem mục Android về giới hạn build trong sandbox).
**Đợt bỏ Yu-Gi-Oh (cùng ngày):** gỡ toàn bộ hệ thống bài bẫy úp và điểm gốc 8000 (về **máu 100 kiểu TFT**),
đồng thời bổ sung lớp trình diễn học từ 2 game mẫu **Kanto Tactics** + **FighterZ Tactics**: sân đổi theo chặng,
đòn nặng nổ "pow" truyện tranh, announcer cuối vòng, bảng sát thương theo tướng, xoáy gộp sao + vòng chân theo sao,
popup nhận trang bị kiểu mở quà (chi tiết ở mục Gameplay).
**Đợt kéo–thả + painted hóa + làm lại nút bấm (2026-10-25):** theo chốt của chủ dự án, toàn bộ đồ họa chuyển sang
**tranh vẽ nét cao (painted)** — sân 1280×720 từ tranh gốc, 35 sprite tướng/quái giữ alpha nét cao, tướng trên bàn
phóng to 100px, ô bàn 84×70; **kéo–thả tướng đầy đủ thay nút "Cất về bench"** (kéo bench→bàn, bàn→bench, hoán đổi,
kéo xuống thùng rác góc dưới để bán, thả hụt thì trượt về chỗ cũ); **toàn bộ nút bấm làm lại kiểu dày có khối**
(bo góc lớn, viền vàng hai lớp + kim cương 4 góc, gloss, thêm họ nút vàng và icon vẽ nét cao) — chi tiết ở mục cuối.

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
| Texture giao diện | Bộ 9-patch vẽ bằng PIL trong `assets/ui/` — **v2 (đợt painted hóa)**: nút dày có khối, bo góc lớn, viền vàng 2 lớp + kim cương 4 góc, gloss nửa trên; **5 họ nút × 3 trạng thái** (thường/hồng ngọc/xanh lá/đỏ/**vàng mới**), panel, plaque, thẻ shop theo bậc giá 1–5, mặt thẻ, avatar (ô chờ bench KHÔNG thuộc bộ này: là mảng đất painted riêng — xem `tools/make_bench_patches.py`) + **12 icon vẽ nét cao 96×96** (coin, tim, sao, kiếm, khiên, cúp, sách, cờ, sóng, thùng rác, biểu đồ, tốc độ) |

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
│       ├── headless/HeadlessMain.java  # bo kiem tra khong giao dien (16 muc, muc 16 = logic keo-tha)
│       └── ui/                  # MenuScreen, CampaignScreen, MatchScreen, GuideScreen, ProfileScreen, Sound (am thanh)
├── desktop/                 # DesktopLauncher (LWJGL3 1280x720) + ScreenshotMain (cong cu kiem chung GUI)
├── android/                 # Module Android day du (AGP 8.5.2, SDK 35) — xem muc Android ve gioi han build APK
├── web/                     # Backend TeaVM 1.4.0 — build thanh cong ra web/build/webapp (index.html + game.js + assets)
├── assets/                  # units/ (35 sprite PAINTED 512x512 giu alpha), scenes/ (arena 1280x720 + lobby + card-back painted), fonts/ (Baloo 2 + Nunito), ui/ (texture giao diện v2 + icon vẽ nét cao), audio/ (22 file WAV)
└── tools/
    ├── make-painted-assets.py # pipeline painted hoa: sinh lai 35 sprite + 4 san 1280x720 tu tranh goc (chay lai duoc)
    ├── pixelize.py          # pipeline pixel cu (legacy, khong con dung cho ban chinh)
    ├── make_ui.py           # sinh lai toan bo texture assets/ui/ bang PIL (nut v2 day co khoi + icon net cao) — chay: python3 tools/make_ui.py
    ├── ui-preview.png       # bang xem truoc bo texture nut/icon v2
    ├── preview-sheet.png    # bang xem truoc toan bo sprite (phong to nearest-neighbor)
    ├── fetch-deps.sh / fetch_deps.py  # tai dependency bang curl vao local-maven (moi truong han che mang)
    └── shot-*.png           # anh chup kiem chung GUI (menu, lat the, chuan bi, giao tranh)
    └── shot2-*.png          # anh chup dot bo Yu-Gi-Oh (menu, chuan bi khong con panel bay, giao tranh co pow, announcer + popup do)
    └── shot3-*.png          # anh chup dot lam lai bo cuc san tran vien (menu, lat the, chuan bi, giao tranh, ket qua)
    └── shot6-*.png          # anh chup dot painted hoa + keo-tha + nut moi (menu, lat the, chuan bi, DANG KEO, giao tranh, chien dich, hoc choi, ho so)
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
- **Lật thẻ úp mở trận:** đầu trận PvP (và các vòng x-4, sóng 1 ở Sóng Quái) hiện 8 thẻ úp lưng vẽ;
  chọn 1 thẻ → lật mở (420ms, các thẻ khác lật nối tiếp) → nhận tướng về bench + 1 trang bị vào kho.
- **Bố cục màn trận — sân tràn viền (đợt làm lại theo 2 game mẫu):** tranh sân là MỘT môi trường liền mạch phủ kín
  1280×720, không còn hai cột hộp tím hai bên. Bàn cờ lớn ở giữa (**ô 84×70px, sprite tướng 100px** — tỉ lệ painted,
  bóng ellipse mềm dưới chân);
  lưới ô chỉ hiện mờ ở pha chuẩn bị và mờ hẳn về ~0 khi giao tranh. Bench là hàng **9 mảng đất** ngay dưới bàn cờ
  TRONG sân (texture painted `benchpatch1..3.png` sinh bằng `tools/make_bench_patches.py` — tướng ĐỨNG trên đất với
  bóng chân mềm, không còn ô khung hộp; ô được chọn/đang kéo qua chỉ có quầng sáng mềm bám theo mảng đất). **Ô bench
  ĐÚNG bằng ô bàn 84×70 (dải 357..1113 × 92..162, nằm gọn giữa 2 đĩa tròn góc) và sprite bench ĐÚNG 100px như trên
  bàn — bench là một hàng ngang nữa của bàn cờ, neo chân/bóng đất/vòng sao/hàng sao dùng CHUNG quy tắc với tướng
  trên bàn (đợt cân bằng bench 2026-10-25, mảng đất vẽ lại rộng và bẹt 96×48 bao quanh vùng chân cy−50).** Thông tin
  dồn ra viền: tộc/hệ = chip nhỏ bán trong suốt dọc mép trái, trang bị = nút nổi dưới chip, danh sách người chơi = hàng
  gọn mép phải (avatar + tên + số máu + thanh máu mỏng, hàng của mình phủ vàng rất nhẹ), thanh trên = plaque nổi mỏng ở
  giữa-trên, nhật ký thu thành nút icon cuốn sách nhỏ. **Điều khiển học TFT Mobile (đợt 2026-10-25):** hai NÚT TRÒN ở
  hai góc dưới — tròn XANH DƯƠNG dưới-trái vừa là cấp (huy hiệu "Lv.") vừa là nút MUA XP (tiến trình "XP a/b" + vòng
  cung tiến trình quanh nút, giá 4 + icon xu; chạm = mua XP), tròn VÀNG dưới-phải hiện số vàng (+ huy hiệu lửa khi có
  chuỗi thắng) và là nút MỞ/ĐÓNG SHOP. Shop là lớp mở/đóng nằm DƯỚI hàng chờ, sát mép dưới màn hình (thứ tự dọc:
  bàn cờ → hàng chờ → shop): hàng 5 thẻ như cũ + dòng tỉ lệ odds % theo
  bậc giá của cấp hiện tại + nút LÀM MỚI tròn vàng cuối hàng (2 vàng, chỉ tồn tại khi shop mở); mua xong shop vẫn mở,
  chạm vùng sân trống = đóng shop, vào giao tranh shop tự đóng. Các nút ĐẤU!/Tốc độ/Bảng sát thương/Bán tướng chọn/
  MUA XP/Làm mới chữ nhật đều đã BỎ; trận TỰ ĐỘNG bắt đầu khi hết 45s chuẩn bị; pha kết quả tự chuyển sau ~4s
  (chạm = đi ngay) và bảng sát thương TỰ HIỆN ở pha đó. Thoát là nút nhỏ góc trên phải.
- **Kéo–thả tướng (đợt 2026-10-25, thay nút "Cất về bench" — nút đã XOÁ khỏi giao diện):** ở pha chuẩn bị, kéo quá
  ngưỡng 14px thì sprite bám theo con trỏ (nhấc nhẹ, phóng to ~1,05, có bóng dưới); chạm nhẹ vẫn là chọn/xem như cũ
  và luồng chạm-chọn + chạm-ô đặt vẫn dùng được làm dự phòng. Các hướng kéo: **bench → ô bàn** (đặt tướng; ô có tướng
  thì HOÁN ĐỔI, tướng kia về đúng ô bench vừa trống — `Match.moveBenchToBoard`), **bàn → ô bàn khác** (dời/hoán đổi),
  **bàn → ô bench** (cất về bench; ô bench có tướng thì hoán đổi, tướng bench lên đúng ô bàn vừa trống —
  `Match.moveBoardToBenchSlot`), **bench → ô bench khác** (dời chỗ — `Match.moveOnBench`), **→ thùng rác**:
  khi đang kéo tướng (từ bàn hay từ bench đều được), hai vùng thùng rác đỏ ở 2 góc dưới hiện ra, thả vào = bán tướng
  theo luật hoàn vàng hiện tại — đây là cách bán duy nhất (không còn nút "Bán tướng chọn").
  Ô đích hợp lệ được tô vàng khi kéo qua; thả ra ngoài mọi vùng hợp lệ thì tướng **trượt về vị trí cũ** (animation 0,22s).
- **Trình diễn theo 2 game mẫu (Kanto Tactics + FighterZ Tactics)** — chỉ học bố cục/kỹ thuật trình diễn, không sao chép asset:
  1. **Sân đấu đổi theo chặng** (`game/ArenaTheme.java`): Chiến Dịch theo chương — `(chương-1)%3` lần lượt rừng / sa mạc / băng
     (khớp tông banner chương), vòng Boss → hoàng hôn; PvP + Sóng Quái theo stage: 1 rừng, 2 hoàng hôn, 3 sa mạc, ≥4 băng
     (Sóng Quái quy stage = ⌈sóng/5⌉), vòng Boss → hoàng hôn. Sân được chốt tại thời điểm bắt đầu giao tranh (tự động khi hết giờ chuẩn bị) cho đúng vòng đang đấu.
  2. **Đòn nặng truyện tranh:** đòn crit hoặc đòn ≥ 15% máu tối đa của mục tiêu → cụm nổ mây trắng "pow" + 5 vệt tốc độ
     tỏa ra tại điểm trúng, mục tiêu **lộn nghiêng** ±38° trong 0,35s. (Số sát thương to kiểu Kanto giữ nguyên.)
  3. **Announcer cuối vòng:** chữ Baloo lớn "THẮNG!" / "THUA!" (thắng trận có boss: **"HẠ GỤC BOSS!"**) phồng lên giữa sân
     ~1,5s rồi tan, kèm banner nhỏ chứa tóm tắt vòng + máu còn lại; sau đó mới hiện panel kết quả chi tiết.
  4. **Bảng sát thương theo tướng:** panel nổi ở phía phải sân **TỰ HIỆN trong pha kết quả vòng** (không còn nút bật/tắt),
     liệt kê từng tướng của **cả 2 bên** kèm thanh ngang theo tổng sát thương gây ra trong trận vừa đấu (dữ liệu `Engine.damageChart` cộng từ sự kiện engine).
  5. **Lên sao = TIẾN HOÁ ĐỔI HÌNH DẠNG (kiểu Kanto):** mỗi tướng có **3 hình dạng riêng theo cấp sao** — gộp sao là tướng
     đổi hẳn hình, không chỉ tăng chỉ số: **2 sao = dạng trưởng thành** (thêm giáp vai, viền **bạc**, vũ khí to hơn có đá quý,
     thêm phụ kiện), **3 sao = dạng tiến hoá cuối** (vương miện/viền **vàng**, áo choàng, vũ khí lớn nhất, thần thái trùm).
     Sprite riêng tại `assets/units/<id>_s2.png` / `<id>_s3.png` (25 tướng × 2 cấp, sinh bằng `tools/make-evo-assets.py`
     từ tranh thô khoá nền trong `tools/evo-raw/`); `Assets.unit(artId, star)` chọn đúng dạng, thiếu file thì fallback dạng gốc
     (quái/Boss không gộp sao nên chỉ có dạng gốc). Kích thước hiển thị cũng lớn dần: 2 sao ×1.06, 3 sao ×1.12.
     Khoảnh khắc gộp: 3 chấm sao xoáy bay vào tướng kết quả + vòng sáng nở ở chân + chớp sáng bung ra để lộ dạng tiến hoá mới;
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
./gradlew :desktop:verifyHeadless # chay bo kiem tra logic (phai dat 16 PASS / 0 FAIL)
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

## Pipeline đồ họa painted (bản chính hiện tại)

```bash
python3 tools/make-painted-assets.py   # sinh lai 35 sprite painted + 4 san 1280x720 tu tranh goc
```

Theo chốt của chủ dự án (sau bản mẫu đối chiếu), bản chính dùng **tranh vẽ nét cao trực tiếp, không pixel-hóa**:
sân = tranh gốc `tools/new-art/arena-*.webp` cắt 16:9 theo đúng neo của pipeline cũ, resize LANCZOS về 1280×720
(không quantize, không nướng vignette — vignette/quầng sáng vẫn do code vẽ); tướng/quái = tranh raster gốc của dự án RN,
chỉ chuẩn hóa khung (trim alpha, thân về tỉ lệ 432/512 chiều cao canvas, neo đáy, căn giữa trên canvas 512×512,
resize premultiplied-alpha cho viền sạch) — giữ nguyên RGBA nét cao. Texture scene/unit trong `Assets` dùng filter
**Linear** để thu nhỏ mượt. Kết quả: 35 sprite painted + arena 4 biến thể (rừng/hoàng hôn/sa mạc/băng).

`tools/pixelize.py` là pipeline pixel cũ (v1/v2: palette 48 màu, viền đậm 1px, sân 640×360/128 màu không dither) —
**legacy, không còn dùng cho bản chính**; chỉ giữ để tham khảo. Xem trước lịch sử: `tools/preview-sheet.png`,
`tools/arena-sheet.png`.

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
- `./gradlew :desktop:verifyHeadless` — **17 PASS / 0 FAIL** (16 mục cũ + **mục 17: sprite tiến hoá theo sao** — đủ
  25 tướng × 2 file `_s2`/`_s3`, logic chọn asset theo sao đúng, fallback dạng gốc khi thiếu file; trước đó mục 16 là
  logic kéo–thả — hoán đổi bench→bàn ở ô trùng, hoán đổi bàn→bench theo slot, sắp xếp lại bench, đặt tướng thứ 2 theo giới hạn cấp), gồm:
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
- **Pha chuẩn bị** có đếm ngược 45 giây (trước là 90 giây — rút ngắn theo đợt điều khiển TFT Mobile), hết giờ tự vào trận ở mọi chế độ.
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

## Đợt painted hóa + kéo–thả + làm lại nút bấm (2026-10-25)

- **Painted hóa toàn game:** asset sinh bởi `tools/make-painted-assets.py` phủ MỌI màn — menu (lobby painted),
  màn trận (sân + tướng painted), lật thẻ (lưng thẻ), chiến dịch/học chơi/hồ sơ (tranh nền sau panel). Không màn nào
  còn lẫn sprite pixel. Tỉ lệ màn trận theo bản mẫu đã chốt: ô bàn 84×70, sprite bàn/trận 100px, xem trước địch 88px,
  bench 56px (số của đợt này — đợt cân bằng bench 2026-10-25 đã nâng bench lên BẰNG bàn: ô 84×70, sprite 100px).
- **Nút bấm v2:** `tools/make_ui.py` vẽ nội bộ ở 4x rồi thu LANCZOS — nút **dày có khối**: bo góc lớn, gradient dọc
  (sáng trên → đậm dưới), **viền vàng hai lớp + viên kim cương ở 4 góc**, gloss bóng ở nửa trên; hover sáng hơn,
  nhấn xuống tối rõ, disabled xám hóa; panel/plaque/thẻ shop/ô bench bo góc đồng bộ. Thêm **họ nút vàng** (MUA XP,
  Làm mới) cạnh họ chính hồng ngọc (ĐẤU!) và họ phụ tím đậm. `Ui.GameButton` gắn **icon vẽ nét cao 96×96** cạnh nhãn:
  kiếm (ĐẤU!), tốc độ, biểu đồ (Bảng sát thương), sách (Nhật ký), sao (MUA XP), xu vàng (Làm mới), thùng rác
  (Bán tướng chọn). Áp dụng qua Ui helper cho mọi màn: menu, màn trận, chiến dịch (lưới 100 nút màn), học chơi, hồ sơ.
  Xem trước bộ texture: `tools/ui-preview.png`.
- **Kéo–thả:** logic hoán đổi/dời ô tách ở tầng `Match` (3 method mới, test headless mục 16); UI xử lý
  touchDown/touchDragged/touchUp với ngưỡng kéo 14px, tô sáng ô đích, 2 vùng thùng rác khi kéo từ bàn, animation
  trượt về khi thả hụt. Hai lỗi phát hiện khi soi ảnh và đã sửa tận gốc trong đợt: (1) hit-test ô bàn phải dùng
  `Math.floor` — phép cắt `(int)` về 0 khiến điểm kéo dưới mép bàn bị nhận nhầm thành hàng 0; (2) `Ui.drawShadow`
  phải sao chép màu batch (`new Color(batch.getColor())`) — tham chiếu trực tiếp khiến lệnh khôi phục vô hiệu,
  phần tử vẽ ngay sau bóng (lưng thẻ úp) bị nhuộm đen trong suốt.
- **Kiểm chứng đợt này:** compile desktop PASS; `verifyHeadless` **16 PASS / 0 FAIL**; `:web:buildWeb` PASS
  (game.js 915.854 byte). Ảnh `tools/shot6-*.png` đã tự soi: menu, lật thẻ (8 lưng thẻ hiện rõ sau sửa lỗi shadow),
  chuẩn bị (nút mới có icon, **không còn nút "Cất về bench"**, gợi ý kéo–thả mới), **đang kéo** (ScreenshotMain giả lập
  trạng thái kéo: sprite bám trỏ trên ô bench được tô viền vàng + 2 vùng thùng rác hiện), giao tranh, chiến dịch,
  học chơi, hồ sơ.
- **Chưa kiểm chứng (nói thẳng):** kéo–thả bằng tay thật trên bản chạy (mới kiểm bằng test logic + ảnh giả lập trạng thái
  kéo + code path cảm ứng); runtime bản web TeaVM vẫn chỉ build PASS như các đợt trước; bảng sát thương/nhật ký ở
  trạng thái đang mở và thẻ shop ở trạng thái mua được vẫn chưa có ảnh chụp trực tiếp (giới hạn công cụ chụp).

## Đợt VFX/SFX theo tướng (2026-10-25)

Trước đợt này mọi tướng tung chiêu chỉ có 1 quầng sáng vàng chung và tiếng "cast" chung (thực tế sự kiện cast
còn không phát tiếng nào). Nay mỗi tướng có **hồ sơ hiệu ứng theo hệ/kỹ năng** dùng chung cho cả hình và tiếng:

- **Bảng ánh xạ (`data/FxProfile.java`):** 25 tướng + 10 quái → 10 hồ sơ: LỬA (drago, fifi, phoenix, dragonboss),
  BĂNG (astro, frostboss), SÉT (susu, zaza), ĐỘC (nấm độc), HỒI PHỤC (dodo, vivi, queen), KHIÊN (bobi, toto, king),
  NĂNG LƯỢNG (lulu, haha, rero, luna), VẬT LÝ (mimi, pipo, kiki, gogo, titan + quái cận chiến), BÓNG TỐI (baba,
  shadow, witchmob), THIÊN NHIÊN (nana, sumo, kingboss). Id lạ → suy theo `SkillKind`.
  Quyết định các tướng mơ hồ (đã ghi trong code): **fifi** kind là poison (DoT) nhưng tên/mô tả là lửa đốt → LỬA
  (vệt cháy thay vũng độc); **astro** "Hố Đen Nhỏ" nhưng kind freeze/mô tả đóng băng → BĂNG; **baba** phù thủy tối
  → BÓNG TỐI (sao băng = tia tối rơi xuống); **luna** tên trăng → NĂNG LƯỢNG bạc-tím; **king** buff + tự khiên →
  KHIÊN; **sumo/kingboss** triệu hồi → THIÊN NHIÊN (cổng đất/lá).
- **VFX (`ui/BattleFx.java`, MatchScreen chỉ đưa sự kiện vào):** nổ hạt theo hệ tại điểm trúng (lửa kèm tàn lửa
  bay lên, băng vỡ mảnh tinh thể rơi, sét = tia lửa điện, độc = bọt xanh); **vệt đất** cháy/độc/băng 1,2–4s;
  **vòm khiên** bong bóng khi cast khiên; **cổng triệu hồi** 2 vòng mở rộng cho summon; dấu cộng + hạt sáng bay
  lên ở sự kiện hồi máu; **sao xoay quanh đầu** khi tướng bị choáng (đọc từ trạng thái stun của frame) và
  **phủ tông băng** lên mục tiêu bị freeze (~2s); vòng chấn động cho Đập Đất; vệt chém chữ X cho execute;
  hạt hút ngược về người tung cho lifesteal. Trần hiệu năng: tối đa 280 hạt cùng lúc.
- **Hai kỹ năng đặc trưng làm riêng:** Rero **"Tia Laser" = beam 3 lớp** (quầng ngoài màu hệ, thân màu, lõi
  trắng, nhấp nháy + chớp tại điểm trúng, xuyên qua mục tiêu một đoạn); Zaza **"Sấm Liên Hoàn" = tia sét gãy
  khúc nối người tung → từng mục tiêu**. Lưu ý trung thực: engine mô phỏng Zaza là burst 1 mục tiêu (mô tả
  ghi nhảy 3 mục tiêu) — tia sét vẽ nối thêm 2 địch gần nhất trên sân cho đúng mô tả, **không đổi sát thương**.
- **Đòn đánh xa:** viên đạn đổi màu/hình theo hệ của tướng bắn (lửa = cầu lửa, băng = mảnh thoi xoay, sét = lõi
  rung, còn lại = cầu năng lượng theo màu hệ) + vệt sáng ngắn phía sau — thay ô cam dùng chung trước đây.
- **Ăn theo đợt tiến hoá:** tướng **3 sao** tung chiêu → hiệu ứng phóng to ×1.25.
- **SFX theo hệ (`tools/make_cast_sfx.py`):** tổng hợp 10 file `assets/audio/cast_<hệ>.wav` (PCM 16-bit mono
  22050Hz, đúng tiền lệ các file tự sinh trước): lửa phừng + lách tách, băng vỡ lách cách cao, sét rẹt 2 nhịp,
  độc sủi bọt, hồi phục chuông arpeggio, khiên rung trầm, năng lượng rít lên, vật lý vút gió, bóng tối thở ầm
  thấp, thiên nhiên gảy lá. `Sound.castFor()` phát đúng file theo hệ khi có sự kiện cast, thiếu file thì lui về
  "cast" chung; nút bật/tắt âm thanh ở menu giữ nguyên tác dụng.
  **Nói thẳng: âm thanh mới chỉ ở mức nạp file + nối sự kiện + kiểm chứng file tồn tại — CHƯA nghe thử bằng tai**
  (sandbox không có card tiếng, như mọi đợt trước).
- **Kiểm chứng đợt này:** compile desktop PASS; `verifyHeadless` **18 PASS / 0 FAIL** (mục 18 mới: đủ 25 tướng
  + 10 quái có hồ sơ hệ, đủ file `cast_<hệ>.wav` cho các hệ đã dùng, hệ của 2 kỹ năng đặc trưng đúng);
  `:web:buildWeb` PASS (game.js 940.648 byte, webapp có đủ 10 file cast). Ảnh chụp bắt khoảnh khắc cast:
  `tools/fx-fire.png`, `fx-ice.png`, `fx-lightning.png`, `fx-beam.png` (ScreenshotMain thêm chế độ
  `fx<he>`: dựng đội hình có tướng của hệ đó, chờ `BattleFx.lastCastFx` trùng hệ rồi chụp trễ ~8 frame cho
  hiệu ứng đã rõ).

## Đợt điều khiển TFT Mobile (2026-10-25)
- Làm lại sơ đồ điều khiển màn trận theo 2 ảnh mẫu TFT Mobile của user. Hai nút tròn vẽ tay (batch + hit-test
  hình tròn trong `BoardInput`): **tròn xanh dưới-trái = cấp + MUA XP** (huy hiệu "Lv." đè góc nút, "XP a/b"
  hoặc "MAX", vòng cung tiến trình XP quanh nút, giá 4 + icon xu), **tròn vàng dưới-phải = số vàng + MỞ/ĐÓNG
  shop** (huy hiệu lửa + số streak khi chuỗi thắng ≥ 2). **Shop thành lớp mở/đóng** (trường `shopOpen`):
  hàng 5 thẻ dời lên dải trên bench (y 156), thêm **dòng odds %** theo `GameData.SHOP_ODDS` của cấp hiện tại
  và **nút LÀM MỚI tròn vàng** ở cuối hàng (chỉ bấm/vẽ được khi shop mở); mua xong shop vẫn mở; **chạm vùng
  sân trống (không trúng thẻ/nút/ô/tướng) = đóng shop**; vào giao tranh tự đóng. **Bỏ hẳn** các nút ĐẤU!/VÀO
  TRẬN!, Tốc độ (biến nội bộ `speed` giữ cho công cụ chụp), bật/tắt Bảng sát thương, "Bán tướng chọn" (bán
  chỉ bằng kéo vào thùng rác — nay áp dụng cho cả kéo từ bench), MUA XP/Làm mới chữ nhật; Nhật ký thu thành
  nút icon sách 42×42. **Tự động vào trận:** đếm ngược chuẩn bị rút **90s → 45s**, hết giờ tự đánh ở mọi chế
  độ; **pha kết quả tự chuyển sau ~4s** kể từ khi announcer xong (chạm bất kỳ đâu = đi ngay, bỏ nút "Tiếp
  tục"), panel kết quả thu hẹp lệch trái (tâm x=451) để **bảng sát thương tự hiện phía phải sân** cùng lúc.
  ScreenshotMain thêm 2 mode `shopopen` (reflection bật `shopOpen`) và `resultpanel` (chụp sau announcer,
  trước mốc tự chuyển). Đợt này làm trên bản sao `tft-java-uicontrols` (gates 17/17) rồi port sang sau khi
  đợt VFX lên main.
- **Kiểm chứng đợt này (trên project chính sau port):** compile desktop PASS, `verifyHeadless` **18/18 PASS**,
  `:web:buildWeb` PASS. Ảnh `tools/shot8-*.png` tự soi 2 vòng: chuẩn bị shop đóng (chỉ còn 2 nút tròn +
  bench), shop mở (5 thẻ thật + odds + reroll vàng + nút vàng thành "ĐÓNG"), giao tranh (sạch nút), kết quả
  (panel + bảng sát thương cạnh nhau không chồng). Chưa kiểm chứng: cảm giác chạm thật trên thiết bị, runtime
  web TeaVM (build PASS như mọi đợt), trường hợp shop mở phủ hàng bàn 0 — tướng ở hàng 0 muốn kéo phải đóng
  shop trước (đúng tính chất lớp phủ của TFT).

## Đợt cân bằng kích thước + neo chân hàng chờ (2026-10-25)

User chỉ 2 lỗi: (1) tướng bench NHỎ hơn tướng trên bàn (ô bench 64px/sprite 56px so với ô bàn 84×70/sprite
100px) — kích thước sảnh chờ và trong sàn phải BẰNG NHAU; (2) tướng bench neo lệch (tâm ô tính lệch
`(SLOT−4)/2 = 30` thay vì tâm ô thật, sprite neo ở `y+30` và bóng ở `y+5` tách rời chân) nên con cao con
thấp/lệch tâm so với mảng đất. Xử lý: **bench thành một hàng ngang nữa của bàn cờ** — dùng lại đúng quy
tắc neo của tướng trên bàn, không còn bộ số riêng:

| Số đo | Trước | Sau |
| --- | --- | --- |
| Ô bench | 64×44 (dải 357..933 × 108..152) | **84×70 (dải 357..1113 × 92..162)** — đúng ô bàn, gọn giữa 2 đĩa tròn (đĩa trái mép phải 116, đĩa phải mép trái 1164) |
| Sprite bench | 56px, tâm (x+30, y+30) | **100px, tâm = tâm ô** qua helper chung `benchCx(i) = BENCH_X + i·SLOT + SLOT/2`, `benchCy() = BENCH_Y + SLOT_H/2` (=127) |
| Bóng chân bench | ellipse 46px ở y+5 (lệch chân ~25px) | `drawShadow(cx, cy−45, 78)` — đúng lời gọi của tướng trên bàn |
| Vòng sao bench | không có | `drawGroundRing(cx, cy, …)` — đúng hàm của bàn (vòng bạc 2★/vàng 3★ ở cy−41) |
| Hàng sao bench | sao 10px vàng ở y+60 | sao 11px ở cy+54, màu như `drawBars` (2★ bạc / 3★ vàng) |
| Mảng đất | canvas 256×192, vẽ 64×48 | canvas **384×192 (tỉ lệ 2:1)**, vẽ **96×48** tâm (cx, cy−40) — rộng và bẹt, bao quanh vùng chân cy−50; vẫn 3 biến thể + lật ngang |
| Sprite kéo / trượt-về từ bench | 96px / 56px | **105px / 100px** — cùng cỡ với kéo từ bàn, không đổi cỡ giữa chừng |
| Chồng dọc | bàn 152..642 → bench 108..152 → odds 86..106 → shop 2..84 | bàn 152..642 (không đổi) → bench **92..162** → odds 86..106 (không đổi) → shop 2..84 (không đổi); plaque 668..716 và dòng thông báo 642..664 không đổi |

Điểm neo dùng chung: `unitScreenPos` (animation trượt-về + hiệu ứng gộp sao) nay trả đúng
`{benchCx(bi), benchCy()}` thay cho công thức lệch cũ; 3 hit-rect bench tự cập nhật theo hằng số mới.
Chấp nhận giữ nguyên: dải odds (86..106) vẽ sau bench nên khi shop MỞ nó cắt ngang phần chân dưới của
tướng bench ô 0–2 (lớp phủ như TFT); đầu tướng bench (tới y 177) chồng vào vùng hàng bàn 0 theo phối cảnh
hàng-trước giống tướng bàn đứng hàng sau — thanh máu hàng 0 (y 476 trên ảnh) vẫn trên đầu bench, không bị che.
ScreenshotMain thêm 2 mode `benchshow` (bàn 3 tướng + bench 6 tướng đủ dáng: thấp tròn/cao/váy dài/2★/bay)
và `benchshop` (cùng trạng thái + shop mở).

- **Kiểm chứng đợt này:** compile desktop PASS, `verifyHeadless` **18/18 PASS**, `:web:buildWeb` PASS.
  Ảnh `tools/shot10-planning.png`, `tools/shot10-shopopen.png`, `tools/shot10-benchzoom.png` (crop phóng to
  dải bench) + `tools/shot10-drag.png`, `tools/shot10-battle4.png` (hồi quy). Tự soi 2 vòng: vòng 1 toàn
  cảnh + zoom dải bench — mọi tướng bench đứng cùng đường chân (game y ≈ 77) trên mảng đất, cỡ bằng tướng
  bàn đặt cạnh; đo số: tâm mảng đất lệch tâm ô ≤ ±14px (khối đất vẽ tay không đối xứng tuyệt đối, như đợt
  trước), hàng sao của tướng 2★ trên bench đo tại đúng vị trí công thức vẽ (x 641..660, y 185..189 so với
  kỳ vọng 639..662 × 181..192); vòng 2 phóng to 2× từng con (toto thấp tròn, queen váy dài, phoenix bay) —
  chân/váy đều chạm đúng tâm mảng đất, không con nào lơ lửng/chìm/lệch tâm. Chưa kiểm chứng: cảm giác kéo–thả
  bằng tay thật và runtime web TeaVM (build PASS như mọi đợt).
