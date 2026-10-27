# Đấu Trường Chibi — Bản Java + Đồ họa pixel art 2D (LibGDX)

Bản chuyển đổi của game "Đấu Trường Chibi" từ React Native sang **Java + LibGDX** với đồ họa **pixel art 2D**
(theo quyết định của chủ dự án 2026-10-25: "Chuyển qua pixel đi" — toàn bộ tranh painted của các đợt trước
đã được pixel-hóa bằng pipeline pixel v2, xem mục "Pipeline đồ họa pixel" bên dưới; hướng painted chỉ còn
là lịch sử/tuỳ chọn, khôi phục được từ git history),
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
├── assets/                  # units/ (85 sprite PIXEL 128x128: 25 tuong x 3 dang sao + 10 quai), scenes/ (arena + lobby pixel 640x360, card-back, banner), items/ (18 icon trang bi pixel), fonts/ (Baloo 2 + Nunito), ui/ (texture giao diện v2 + icon vẽ nét cao + mang dat bench pixel), audio/ (22 file WAV)
└── tools/
    ├── make-painted-assets.py # pipeline painted hoa (dot truoc): sinh lai sprite + san painted tu tranh goc (chay lai duoc)
    ├── pixelize.py          # pipeline pixel v2: thu vien ham + thong so pixel da chot (sprite 128px/48 mau, san 640x360/128 mau, khong dither)
    ├── pixelize_from_painted.py # pipeline pixel v3 (BAN CHINH): pixel-hoa toan bo tranh painted hien tai theo thong so v2 — chay: python3 tools/pixelize_from_painted.py [--icons]
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
  tộc/hệ 8 hệ với ngưỡng như bản RN, trang bị ghép kiểu TFT (6 đồ thành phần → 12 đồ hoàn chỉnh, xem mục riêng bên dưới), cường hóa ở vòng 2-1 / 3-2 / 4-2, bot AI dựng đội + hao hụt bot-vs-bot mô phỏng.
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
  chọn 1 thẻ → lật mở (420ms, các thẻ khác lật nối tiếp) → nhận tướng về bench + 1 đồ thành phần vào kho.
- **Bố cục màn trận — sân tràn viền (đợt làm lại theo 2 game mẫu):** tranh sân là MỘT môi trường liền mạch phủ kín
  1280×720, không còn hai cột hộp tím hai bên. Bàn cờ lớn ở giữa (**ô 84×70px, sprite tướng 100px** — tỉ lệ painted).
  **Lưới ô mặc định KHÔNG hiện (đợt 2026-10-25):** sân bình thường là một môi trường liền mạch không ô; lưới chỉ
  **mờ dần hiện (~150ms)** khi đang KÉO một tướng hoặc đang CHỌN một tướng kiểu chạm (ô đích đang nhắm tô vàng +
  quầng sáng rõ hơn hẳn lưới), thả/huỷ chọn thì mờ dần biến mất; giao tranh/kết quả giữ ~0. **Tướng "tiếp đất"
  (cùng đợt):** bóng đổ **kéo dài lệch xuống-phải** theo đúng hướng bóng cây trong tranh sân (độ dài theo theme:
  hoàng hôn dài nhất) + **contact AO** — mảng tối mềm dẹt ngay dưới bàn chân + **gradient tối nhẹ ở dải chân**
  sprite (bản texture lúc chạy `Assets.unitOnGround`, file tranh gốc không đổi) — hết cảm giác tướng bị dán lên
  mặt đất; tướng đang bị nhấc lên (kéo) thì bóng nhỏ/mờ lại và AO biến mất. (Đã thử thêm tint hoà sáng ấm theo
  theme: soi A/B thấy chênh lệch không đáng kể mà làm lệch màu tranh gốc nên KHÔNG giữ.) **Khử viền trắng +
  hết mờ sprite (đợt 2026-10-25):** sprite painted tách nền từ nền sáng nên vành bán trong suốt bị nhiễm
  matte sáng (đo: ~11% pixel vành sáng bất thường so với thân) và game thu 512→100px bằng Linear KHÔNG
  mipmap gây quầng sáng + lấp loáng. Đã chạy `tools/defringe_units.py` cho cả 85 sprite (gọt mép ngoài
  1px, diệt alpha <28, cắt phần sáng vượt của vành về phía màu thân gần nhất, bleed màu ra vùng trong
  suốt thay RGB đen, unsharp nhẹ) — pixel vành sáng bất thường còn ~1,9% — và bật **mipmap +
  MipMapLinearLinear** cho texture tướng trong `Assets` (gồm bản `unitOnGround`; lỗi sinh mipmap thì tự
  fallback Linear như cũ). Bench là hàng **9 mảng đất** ngay dưới bàn cờ
  TRONG sân (texture painted `benchpatch1..3.png` sinh bằng `tools/make_bench_patches.py` — tướng ĐỨNG trên đất với
  bóng chân mềm, không còn ô khung hộp; ô được chọn/đang kéo qua chỉ có quầng sáng mềm bám theo mảng đất). **Ô bench
  ĐÚNG bằng ô bàn 84×70 (dải 357..1113 × 92..162, nằm gọn giữa 2 đĩa tròn góc) và sprite bench ĐÚNG 100px như trên
  bàn — bench là một hàng ngang nữa của bàn cờ, neo chân/bóng đất/vòng sao/hàng sao dùng CHUNG quy tắc với tướng
  trên bàn (đợt cân bằng bench 2026-10-25, mảng đất vẽ lại rộng và bẹt 96×48 bao quanh vùng chân cy−50).** Thông tin
  dồn ra viền: tộc/hệ = chip nhỏ bán trong suốt dọc mép trái, trang bị = khay icon vẽ tay dưới chip (chạm = bảng thông tin, kéo = ghép/đeo), danh sách người chơi = hàng
  gọn mép phải (avatar + tên + số máu + thanh máu mỏng, hàng của mình phủ vàng rất nhẹ), thanh trên = plaque nổi mỏng ở
  giữa-trên. **Điều khiển học TFT Mobile (đợt 2026-10-25):** hai NÚT TRÒN ở
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
  4. **Bảng sát thương theo tướng:** là **cột phải của chính thẻ kết quả** giữa sân (đợt gọn trình bày 2026-10-25: pha kết quả chỉ còn MỘT khối duy nhất — scrim phủ toàn sân, cột trái = kết quả + phần thưởng vòng, cột phải = bảng sát thương; không còn panel/hộp rời) **TỰ HIỆN trong pha kết quả vòng** (không còn nút bật/tắt),
     liệt kê từng tướng của **cả 2 bên** kèm thanh ngang theo tổng sát thương gây ra trong trận vừa đấu (dữ liệu `Engine.damageChart` cộng từ sự kiện engine).
  5. **Lên sao = TIẾN HOÁ ĐỔI HÌNH DẠNG (kiểu Kanto):** mỗi tướng có **3 hình dạng riêng theo cấp sao** — gộp sao là tướng
     đổi hẳn hình, không chỉ tăng chỉ số: **2 sao = dạng trưởng thành** (thêm giáp vai, viền **bạc**, vũ khí to hơn có đá quý,
     thêm phụ kiện), **3 sao = dạng tiến hoá cuối** (vương miện/viền **vàng**, áo choàng, vũ khí lớn nhất, thần thái trùm).
     Sprite riêng tại `assets/units/<id>_s2.png` / `<id>_s3.png` (25 tướng × 2 cấp, sinh bằng `tools/make-evo-assets.py`
     từ tranh thô khoá nền trong `tools/evo-raw/`); `Assets.unit(artId, star)` chọn đúng dạng, thiếu file thì fallback dạng gốc
     (quái/Boss không gộp sao nên chỉ có dạng gốc). Kích thước hiển thị cũng lớn dần: 2 sao ×1.06, 3 sao ×1.12.
     Khoảnh khắc gộp: 3 chấm sao xoáy bay vào tướng kết quả + vòng sáng nở ở chân + chớp sáng bung ra để lộ dạng tiến hoá mới;
     tướng **2 sao có vòng bạc ở chân**, **3 sao có hào quang vàng cháy** nhấp nháy kèm 3 chấm sao bay quanh chân (cả ở pha chuẩn bị lẫn trong trận).
  6. **Nhận trang bị kiểu mở quà:** thắng vòng quái PvE (mọi vòng quái trong PvP; Sóng Quái mỗi 3 sóng; Chiến Dịch khi thắng màn Boss)
     rơi 1 đồ THÀNH PHẦN ngẫu nhiên vào kho — ở pha kết quả, phần thưởng (icon + tên đồ + vàng nhận) hiện **ngay trong thẻ kết quả**; thẻ popup nổi giữa-phải sân ~2,3s (icon vẽ tay thật của món đồ + tên + dòng chỉ số) chỉ còn dùng ở ngữ cảnh ngoài pha kết quả (vd ghép đồ xong).
- **Hồ sơ local:** tên người chơi, hạng (10 bậc Sắt → Thách Đấu, bảng LP port từ bản RN: Top 1 +46 ở nhóm thấp...),
  cấp độ/XP, tiến độ chiến dịch, kỷ lục sóng — lưu JSON tại `~/.dau-truong-chibi/profile.json`. Chỉ PvP Hạng mới đổi rank LP.
- **Animation kiểu sprite như bản RN:** nhún thở (bob), lao đòn, giật đỏ khi trúng đòn, ngã xoay + mờ dần khi chết,
  đạn bay cho tướng tầm xa, vệt sáng tung chiêu, số sát thương phong cách Kanto (cam/vàng, chí mạng to + "!"),
  thanh máu/mana/khiên viền mỏng + sao phía trên đầu.

## Trang bị — ghép đồ kiểu TFT (đợt 2026-10-25)

Mọi món đồ trong game đều có **icon vẽ tay thật** (`assets/items/<id>.png`, sinh bằng `tools/make_item_icons.py`
từ tranh thô trong `tools/item-icons-raw/`): một bộ thống nhất — vật thể vẽ painted trên nền phiến đá quý tối
tím viền vàng, đọc rõ ở cỡ 40px. Icon thay thế hoàn toàn cách trình bày cũ (chữ + vòng tròn màu) ở **khay trang bị**,
**popup nhận đồ**, **thẻ lật mở trận** và **bảng thông tin đồ**.

- **Khay trang bị** (mép trái, dưới chip tộc/hệ): mỗi món đồ trong kho là 1 ô icon riêng (lưới 4 cột, ô 48px);
  kho trống thì **không vẽ khung ô nào** (kiểu TFT: có đồ icon mới hiện, không có thì trống trơn — đợt gọn trình bày 2026-10-25 đã bỏ 8 ô mờ vẽ sẵn; khi đang kéo đồ, một quầng sáng mờ tạm thời hiện sau vùng khay làm gợi ý vùng thả).
- **Chạm (không kéo) vào icon** → **bảng thông tin**: icon lớn + tên + loại + dòng chỉ số/mô tả. Thành phần có thêm
  mục **"GHÉP ĐƯỢC THÀNH"** (từng dòng: icon thành phần kia + icon đồ đích + tên); đồ hoàn chỉnh có dòng
  **"GHÉP TỪ: A + B"** kèm icon. Đóng bằng nút X hoặc chạm ra ngoài bảng.
- **Kéo–thả là đường dùng đồ duy nhất** (luồng cũ "chạm đồ rồi chạm tướng" đã bỏ): kéo icon thả lên icon khác
  trong khay → **ghép** nếu có công thức (loé sáng + toast; không có công thức thì toast từ chối, icon về chỗ cũ);
  kéo thả lên tướng trên bàn/bench → **đeo**. Ô đích đang nhắm được tô viền (xanh lá = ghép được, đỏ = không).
- **6 đồ thành phần** (đeo được như đồ thường, tối đa 3 ô/tướng như luật chung): Lưỡi Kiếm Mật Ong (+10 ST),
  Gậy Phép Socola (+15 SMKN), Dây Cung Kẹo Dẻo (+12% tốc đánh), Găng Tay Nhung (+10% chí mạng),
  Mảnh Vỏ Kẹo Cứng (+12 giáp, +75 máu), Mảnh Tim Kẹo (+150 máu).
- **Nguồn rơi chỉ trả thành phần**: vòng quái PvE trong PvP, Sóng Quái mỗi 3 sóng, Boss Chiến Dịch, đồ kèm thẻ
  lật mở trận. Đồ hoàn chỉnh chỉ có được bằng ghép (hoặc cường hoá ghi rõ tặng đồ hoàn chỉnh).
- **Tự hợp nhất trên người tướng:** tướng đang đeo 1 thành phần, đeo thêm thành phần còn lại của cùng công thức
  thì 2 món tự gộp thành đồ hoàn chỉnh chiếm 1 ô (kể cả khi tướng đã đủ 3 ô vẫn gộp được).

**Bảng công thức** (mỗi đồ hoàn chỉnh = đúng 1 cặp thành phần; dữ liệu ở `GameData.RECIPES`,
kiểm chứng headless mục 19–21):

| Đồ hoàn chỉnh | Ghép từ |
| --- | --- |
| Kiếm Bánh Quy (+20 sát thương) | Lưỡi Kiếm Mật Ong + Lưỡi Kiếm Mật Ong |
| Gậy Socola (+30 SMKN) | Gậy Phép Socola + Gậy Phép Socola |
| Cung Kẹo Dẻo (+25% tốc đánh) | Dây Cung Kẹo Dẻo + Dây Cung Kẹo Dẻo |
| Trái Tim Ấm (+400 máu) | Mảnh Tim Kẹo + Mảnh Tim Kẹo |
| Găng Kim Cương (+20% chí mạng, +15 SMKN) | Găng Tay Nhung + Găng Tay Nhung |
| Khiên Vàng (+35 giáp, +35 kháng phép) | Mảnh Vỏ Kẹo Cứng + Mảnh Vỏ Kẹo Cứng |
| Giáp Kẹo Cứng (+25 giáp, +150 máu) | Mảnh Vỏ Kẹo Cứng + Mảnh Tim Kẹo |
| Áo Choàng Đêm (+25 kháng phép, +200 máu) | Mảnh Vỏ Kẹo Cứng + Gậy Phép Socola |
| Vuốt Rồng (+20% hút máu, +15 sát thương) | Lưỡi Kiếm Mật Ong + Mảnh Tim Kẹo |
| Sách Cổ Ma Thuật (+40 SMKN, +10 mana) | Gậy Phép Socola + Găng Tay Nhung |
| Giày Bay (+20% tốc đánh) | Dây Cung Kẹo Dẻo + Găng Tay Nhung |
| Giọt Nước Mắt Sao (+20 mana, +15 SMKN) | Gậy Phép Socola + Mảnh Tim Kẹo |

### Gắn + hiển thị trang bị trên tướng (căn theo TFT, đợt 2026-10-25)

- **Hiện đồ trên tướng:** mọi tướng có đồ đều hiện hàng icon đồ (tối đa 3 icon 18px trên phiến tối) ngay
  **dưới cụm thanh máu/mana** — trên bàn, trên bench, ở đội hình địch xem trước khi do thám, và trong trận
  cho cả 2 phe (`Engine.FightUnit` mang theo `items` từ `PlacedUnit` qua `makeSim`/`copySim`; golem triệu
  hồi không thừa hưởng đồ của chủ). Tướng không có đồ không vẽ gì thêm.
- **Thẻ tướng (kiểu TFT Mobile):** chạm-chọn 1 tướng ở pha chuẩn bị mở thẻ ở mép phải — chân dung, tên + sao,
  chip tộc/hệ, lưới chỉ số (`Engine.statsOf`: sao × chỉ số gốc + đồ đang đeo), tên + mô tả kỹ năng, **3 ô
  trang bị** (chạm 1 ô có đồ mở bảng thông tin của món đó) và **nút BÁN kèm giá** (`Engine.sellValue`).
  Thẻ đóng khi bỏ chọn/chạm ra ngoài/bắt đầu kéo; bán qua thẻ chạy cùng `Match.sell` như kéo vào thùng rác.
- **Thẻ tướng PHA TRẬN (kiểu TFT Mobile):** đang giao tranh, chạm vào bất kỳ tướng nào trên sân (phe mình
  lẫn phe địch — do thám giữa trận) mở cùng khung thẻ ở mép phải, trận **vẫn chạy phía sau** không pause.
  Nội dung phản ánh trạng thái **sống**: thanh máu/mana thời gian thực (nội suy theo khung hình), lưới chỉ
  số **hiệu dụng** (`FightUnit` mang `ad/ap/armor/mr/as/crit` = `statsOf` + đồ + buff tộc/hệ đã gấp sẵn
  trong mô phỏng), kỹ năng, 3 ô đồ (chạm ô vẫn mở bảng thông tin món). **Không có nút BÁN** — đóng bằng
  nút X góc dưới-phải, chạm ra ngoài, hoặc chạm sang tướng khác để chuyển thẻ; tướng đang xem bị hạ thì
  thẻ tự đóng. Kiểm chứng headless mục 23 (helper cắt tên) + ảnh `tools/shot22-battlecard*.png`.
- **Tên tướng trong bảng sát thương:** cột tên được nới rộng (thanh sát thương lùi sang phải) và tên dài
  được cắt bằng `MatchScreen.fitDamageName`: phần tên bị rút gọn kèm "..." nhưng **hậu tố sao "(N sao)"
  luôn nguyên vẹn** (bản cũ cắt mù từ cuối chuỗi thành "Pipo Chim Sẻ (2").
- **Đánh dấu đối thủ kiểu TFT (thay hộp chữ "Đối thủ vòng này"):** hộp chữ dưới danh sách người chơi
  ("Đối thủ vòng này: X — đội hình: ..." liệt kê toàn bộ tướng địch, kèm biến thể thông tin PvE) đã
  **xoá hẳn** — cả nhãn `oppInfo`, khung nền riêng và hàm `nextOpponentText()`; cột phải kết thúc ngay
  ở hàng người chơi cuối, mảng bóng sau danh sách chỉ vẽ khi danh sách có hàng. Thay vào đó, đối thủ
  được đánh dấu **ngay trong hàng của họ** trong danh sách "NGƯỜI CHƠI — MÁU" (`MatchScreen.buildPlayerList`,
  tách khỏi `refreshPlanning`): nền trong vàng + **viền vàng 2px** (NinePatch vẽ bằng Pixmap, không bọc
  Table ngoài nên chiều cao hàng không đổi) + **icon kiếm chéo 16px** ngay sau avatar (texture 28×28 vẽ
  bằng Pixmap: 2 lưỡi bạc chéo hình X, chuôi vàng, cán nâu — không emoji) + tên vàng. Mọi hàng đều dành
  sẵn ô 16px cho dấu kiếm nên vị trí tên/máu không xê dịch giữa các hàng/vòng. Đối thủ lấy từ
  `Match.peekNextOpponent()` (round-robin tất định — `fight()` dùng cùng `opponentCursor` nên dấu ở pha
  chuẩn bị khớp người sẽ gặp); `startBattle` còn ghim lại theo `FightOutcome.opponentName` thật để pha
  trận khớp 100%. Vòng PvE/vòng quái trong PvP: không đánh dấu hàng nào; chế độ PvE (Chiến Dịch/Sóng
  Quái) cột phải chỉ còn tiêu đề, gọn sạch. Cơ chế ghép trận hiện tại **không có trận bóng ma** (đối thủ
  luôn là bot còn sống) nên không có trường hợp đánh dấu người đã bị loại. Dòng trạng thái "Đang giao
  tranh với X..." trên đầu pha trận giữ nguyên. Mode chụp mới: `oppmark` (chuẩn bị PvP vòng 13),
  `oppbattle` (đang đấu), `pveplan` (Chiến Dịch) — ảnh `tools/shot24-*.png` đã soi: dấu đúng hàng
  Bé Na ở cả 2 pha, PvE sạch dấu/hộp/bóng ma.
- **Panel trái hợp nhất 2 tab icon (kiểu TFT Mobile):** hai khối tách rời ở mép trái (chip tộc/hệ xếp
  dọc phía trên + khay đồ phía dưới kèm nhãn "TRANG BỊ" Scene2D riêng) đã gộp thành **MỘT panel duy
  nhất** (`MatchScreen.drawLeftPanel`, x 8..216, đỉnh y=668) với **thanh tab 2 icon ở trên cùng**:
  tab **KHIÊN** = tộc/hệ, tab **TÚI** = trang bị — cả hai icon đều **vẽ bằng Pixmap** (khiên vàng
  viền/xanh lòng/sao vàng; túi nâu dây vàng/đồng xu — không emoji). Tab đang chọn: nền vàng mờ +
  gạch vàng dưới chân + icon sáng rõ; tab còn lại nền tối + icon mờ 50%. **Mặc định vào trận mở tab
  tộc/hệ**; trạng thái tab (`panelTab`) giữ nguyên suốt trận, chuyển pha không tự nhảy, và bấm tab
  được ở cả pha chuẩn bị lẫn pha trận (`pressPanelTab` xử lý trước mọi thao tác khác trong
  `planningPress`/`battlePress`). Chiều cao thân panel lấy theo nội dung **lớn hơn** trong 2 tab
  (chip tộc/hệ hoặc lưới đồ + gợi ý) nên chuyển tab không đổi kích thước; đáy panel không bao giờ
  xuống dưới y=126 (đĩa cấp + MUA XP kết thúc ở 112). Mọi tương tác đồ giữ nguyên 100% nhưng **chỉ
  diễn ra khi tab trang bị đang mở** (chạm xem thông tin, kéo ghép/đeo, chip GHÉP, tô sáng đích,
  quầng khay khi kéo); lưới đồ dời vào trong panel (ô đầu ở y 570..618), kho trống không khung ma
  như cũ. Hai lỗi bắt được khi soi ảnh đợt này: dòng gợi ý 1 dòng (~281px) **tràn khỏi thân panel**
  (rộng 192) → tách 2 dòng ngắn; và công cụ chụp set tab ở frame 50 nhưng mode trận chụp sớm theo
  pow (playT ~0,2s) → set tab từ frame 5. Mode chụp mới: `tabtraits`, `tabitems`, `tabdrag`,
  `battletab` — ảnh `tools/shot25-*.png` đã soi (kèm hồi quy `unitcard`/`iteminfo_full`/`pveplan`).
  GuideScreen bổ sung 3 dòng hướng dẫn panel 2 tab.

### Sảnh chính theo bố cục TFT Mobile + thanh đỉnh tối giản + panel phải 2 tab (đợt 2026-10-25)

- **Sảnh chính làm lại toàn bộ (`MenuScreen` viết lại, vẽ tay bằng batch):** toàn màn hình là
  tranh lobby, KHÔNG còn tiêu đề to ở giữa / cột nút xếp chồng / panel hồ sơ đóng khung. Chỉ học
  BỐ CỤC của ảnh mẫu TFT Mobile — nhân vật/tranh là của game mình. Góc trên-trái: avatar tròn
  (cắt đầu/vai của Gogo từ sprite, nạp riêng lọc Nearest) + tên hồ sơ + dòng "Hạng • Cấp (XP)"
  trên dải gradient tối mờ; chạm avatar/tên mở lớp sửa tên (Stage chứa TextField, quy tắc lưu
  cũ: trim ≥ 2 ký tự). Góc trên-phải: 3 nút tròn nhỏ cho chức năng thật — Hồ Sơ & Thống Kê
  (icon biểu đồ), Học Chơi (sách), Âm thanh (loa vẽ Pixmap, có bản gạch chéo khi tắt). Cột trái
  giữa: 3 mục nút-tròn-kèm-chữ — CHIẾN DỊCH (dòng phụ tiến độ + thanh tiến độ CHIA 12 ĐOẠN
  trên nền pill tối), SÓNG QUÁI (kỷ lục), HỒ SƠ (hạng/LP) — bấm đi thẳng màn tương ứng. Góc
  dưới-trái: thẻ nổi bật CHIẾN DỊCH (banner chương + mô tả 2 dòng + tiến độ). Nửa phải: để
  trống tranh lobby — **sảnh sạch không linh vật** (bản đầu có linh vật Gogo phóng lớn ~402px
  bằng Nearest, user chê xấu và đã chốt bỏ hẳn theo mockup "Kiểu 2" trong 3 kiểu thử; cột trái
  đồng thời nới giãn cách `{516, 404, 292}`). Góc dưới-phải: nút **CHƠI** thật to (nền vàng +
  quầng sáng thở + mũi tên vẽ Pixmap) mở **lớp chọn chế độ**: panel tối ở giữa, đủ 5 chế độ
  (Chiến Dịch / Sóng Quái / PvP Thường / PvP Hạng / PvP Đấu Tập) kèm mô tả ngắn — mọi chế độ
  tới được trong tối đa 2 chạm.
- **Thanh đỉnh trong trận tối giản kiểu TFT (Việc 2):** plaque pill to 760×48 ở đỉnh giữa
  (chế độ — vòng — vàng — cấp/XP — máu — đếm giờ) đã GỠ. Đỉnh giữa chỉ còn 1 dòng chữ
  (fontBig, căn giữa) theo pha — "Vòng 1-1 • Chuẩn bị: 42s" / "Đang giao tranh với X..." /
  "Vòng 1-1 • Kết quả" / "… • Lật thẻ mở trận" / "… • Chọn cường hóa" — và **một thanh tiến
  trình mảnh 240×5** ngay dưới: vàng theo đếm ngược chuẩn bị, xanh cyan theo playT/thời lượng
  trận, ẩn ở các pha còn lại. Không thông tin nào mất hẳn: vàng → đĩa SHOP dưới-phải, cấp/XP →
  đĩa MUA XP dưới-trái, máu PvP → hàng của mình trong tab NGƯỜI của panel phải, máu PvE → tab
  NGƯỜI của panel phải (xem dưới), tên chế độ không hiện thường trực nữa.
- **Panel phải hợp nhất 2 tab icon (Việc 3, đối xứng panel trái):** danh sách người chơi và
  bảng sát thương gộp vào MỘT panel (`MatchScreen.drawRightPanel`, x 1084..1272, đỉnh 668)
  với thanh 2 tab icon vẽ Pixmap cùng ngôn ngữ tab trái: **NGƯỜI** (chân dung nhóm — tab mặc
  định) và **BIỂU ĐỒ** (3 cột biểu đồ — đọc rõ ở cỡ nhỏ hơn kiếm chéo). Tab NGƯỜI = danh sách
  Scene2D nguyên vẹn (dấu kiếm chéo + highlight đối thủ của đợt ce8a3501 nằm trong tab này);
  PvE thì tab này hiện tên + thanh máu + chế độ/màn của người chơi (`drawPveInfoTab`). Tab
  BIỂU ĐỒ = bảng sát thương GỌN xem nhanh: giữa trận hiện số liệu **cộng dồn theo thời gian
  trận** nhờ `Engine.damageChartUpTo(result, playT)` mới (lọc sự kiện attack/hit có `e.t <=
  tMax`; `damageChart` toàn trận delegate về nó với tMax = ∞; verifyHeadless #10 mở rộng
  khẳng định t=0 rỗng, t=duration trùng toàn trận), các pha khác hiện trận gần nhất, chưa có
  trận nào hiện "Chưa có dữ liệu sát thương". Cache khóa 0,25s theo playT. Thẻ kết quả cuối
  vòng giữ nguyên cột sát thương — tab này chỉ để xem nhanh. Trạng thái tab giữ qua các pha,
  bấm tab được ở cả chuẩn bị (`planningPress`, sau thẻ tướng) lẫn giữa trận (`battlePress`,
  sau thẻ trận). Hai lỗi bắt được khi soi ảnh đợt này: (1) visibility của danh sách phải đồng
  bộ NGAY TẠI CHỖ VẼ (`drawRightPanel` tự `playersBox.setVisible(...)` mỗi frame) — chỉ set
  trong handler chạm thì trạng thái tab đổi bằng đường khác sẽ vẽ đè 2 tab lên nhau; (2) cache
  khóa 0,5s giữ bảng rỗng của frame đầu trận quá lâu → khóa 0,25s và mode chụp `battledmg`
  phải chờ playT ≥ 3s mới có số liệu thật. Mode chụp mới: `menumodes` (lớp chọn chế độ),
  `battledmg` (trận + tab biểu đồ), `dmgplan` (chuẩn bị + tab biểu đồ rỗng) — ảnh
  `tools/shot26-*.png` đã soi toàn bộ (kèm crop panel phải 3x và dải đỉnh). GuideScreen bổ
  sung mục SẢNH CHÍNH + 2 đoạn hướng dẫn thanh đỉnh/panel phải.

### Nét pixel cho tranh nền + kiểm chứng sân hoàng hôn/băng (đợt 2026-10-25)

- **Lọc Nearest cho riêng tranh nền:** 4 sân đấu + tranh lobby là pixel art 640×360 và mọi nơi vẽ đều
  phóng đúng **1280×720 = 2× nguyên số** (MatchScreen/MenuScreen/GuideScreen), nên `Assets.loadBackdrop`
  nạp chúng với **Nearest–Nearest**: hạt pixel vuông nét, đồng bộ với sprite tướng. Trước đây qua Linear
  nên khối pixel mềm/nhòe lệch tông với tướng. Phạm vi chỉ nền — texture tướng giữ MipMapLinearLinear
  (đợt khử viền), icon trang bị/UI/font/card-back/banner giữ Linear như cũ.
- **Ảnh trận đầu tiên của sân hoàng hôn + sân băng:** ScreenshotMain thêm 2 mode `battlesunset`
  (PvP vòng 8 → stage 2) và `battleice` (vòng 20 → stage 4), dùng đội hình `battleItemsMatch` (2 phe
  đều có tướng mang đồ). Soi ảnh: thanh máu/mana + icon đồ dưới thanh máu rõ trên cả nền ấm hoàng hôn
  lẫn nền tuyết sáng của sân băng, bóng xiên + contact AO đọc rõ (hệ số ×1.30/×0.80), tướng không lẫn
  vào nền. Đối chiếu trước/sau lọc ở `tools/shot23-crop-arena.png` / `shot23-crop-lobby.png`,
  ảnh trận ở `tools/shot23-after-battlesunset.png` / `shot23-after-battleice.png`.
- **Đồ đã đeo là CỐ ĐỊNH:** không có đường tháo/dời đồ khỏi tướng. Đường duy nhất lấy đồ lại là **bán
  tướng** — `Match.sell` trả **toàn bộ** đồ trên người tướng về khay (kể cả đồ đã tự hợp nhất trên người:
  trả nguyên đồ hoàn chỉnh, không tách lại thành phần) và thông báo bán liệt kê các món được trả
  (kiểm chứng headless mục 22). Gộp sao tràn quá 3 món cũng trả phần thừa về khay như trước.
- **Phản hồi khi kéo đồ (parity TFT):** đang kéo 1 icon — mọi thành phần trong khay ghép được với nó phát
  sáng viền xanh; mọi tướng **nhận được** món đó (còn ô trống hoặc hợp nhất được) sáng quầng vàng nhẹ;
  di qua 1 tướng đang đeo thành phần ghép được → hiện **chip xem trước** món hoàn chỉnh sẽ tạo thành cạnh
  tướng; tướng đã đủ 3 ô và không hợp nhất được thì ô đích tô viền đỏ (thả vào sẽ bị từ chối như luật cũ).

### Tinh linh đồng hành — Little Legend (đợt 2026-10-25)

- **Bộ tinh linh = 10 quái PvE** (`GameData.MONSTERS`: Slime Hồng, Nấm Độc, Goblin Tinh Nghịch, Sói Xám
  Con, Golem Đá, Xương Khô Cười, Phù Thủy Rừng, Rồng Boss Lửa, Boss Băng Giá, Vua Quái Vật) — sinh vật
  tách biệt với tướng như tinh linh của TFT. Người chơi chọn trong màn **Hồ Sơ** (lưới chọn 5×2, chạm là
  chọn + lưu ngay vào `Profile.legendId`, mặc định `slime`); bot PvP được `Match.startPvp` gán ngẫu nhiên.
- **Avatar theo tinh linh:** mặt tinh linh đang chọn (cắt đầu + vai theo hộp alpha, `Assets.unitHeadRegion`)
  thay avatar cũ ở **sảnh chính**, ở **từng hàng của tab NGƯỜI** (panel phải trong trận — của mình là con
  đã chọn, bot là con đã gán; giữ nguyên dấu kiếm chéo + highlight đối thủ), và ở ô chọn trong Hồ Sơ.
- **Hành vi trên sân (MatchScreen, máy trạng thái riêng):** nhà ở dải sân trái bàn cờ (282,252) — ngoài
  lưới ô, ngoài panel/2 đĩa/shop. Pha chuẩn bị: nhún idle + thỉnh thoảng **đi dạo** quanh nhà rồi về.
  Pha trận: ngồi xem ở rìa sân nhà. **Nhặt cầu đồ:** trận có đồ rơi → ở `playT ≥ 0.7` một **cầu đồ phát
  sáng** (quầng vàng + icon món) hiện giữa sân `cellCenter(1.5, 3.5)`, tinh linh **chạy thật tới nhặt**
  (~470px/s), cầu **bay vòng cung vào người**, *xong mới* hiện popup nhận đồ như cũ (toàn đoạn ~1–1,3s,
  không đổi nhịp tự chuyển pha; nếu trận quá ngắn, đoạn nhặt chạy nốt trong cửa sổ announcer). Pha kết
  quả: **thắng → nhảy ăn mừng + xoay nhẹ + tia sao**; **thua → ngã nghiêng + sao quay trên đầu**, sang
  pha sau tự đứng dậy về nhà. Tinh linh **đối thủ** đứng ở rìa sân địch (282,556) trong PvP và phản ứng
  ngược (mình thắng → nó xụi, mình thua → nó ăn mừng); PvE không có tinh linh địch.
- **Vẽ:** tái dùng bản tiếp đất + bóng chân/contact AO của tướng (`unitOnGround` + `drawUnitGrounding`),
  chuyển động bằng squash/hop/rotation (không thêm khung hình), vẽ cùng lớp đơn vị — dưới panel/HUD,
  không che thanh máu. Kiểm chứng headless mục 24 + mode chụp `legendplan` / `legendlist` /
  `legendpickup` / `legendwin` / `legendlose` trong ScreenshotMain.

### Sân đấu — Arena (đợt 2026-10-26)

- **Chọn sân trong loadout (kiểu TFT):** màn **Hồ Sơ** có thêm hộp **SÀN ĐẤU** (cột phải, cạnh hộp chọn
  tinh linh): 5 lựa chọn — **Theo màn** (mặc định, giữ quy tắc xoay theo chặng của `ArenaTheme`) + 4 theme
  cố định (Đồng Cỏ / Hoàng Hôn / Sa Mạc / Băng Tuyết), mỗi ô là ảnh thu nhỏ cắt từ chính tranh sân; ô "Theo
  màn" là ảnh ghép 2×2 của 4 sân. Lựa chọn lưu vào `Profile.arenaId` (`ArenaTheme.CHOICES`; khóa lạ trong
  file tự về `"auto"`, không crash — kiểm chứng headless mục 25 cùng `ArenaTheme.resolve`).
- **Mức áp dụng:** theme cố định GHI ĐÈ `MatchScreen.arenaKey()` ở mọi pha (chuẩn bị + giao tranh + kết quả)
  và mọi chế độ (PvP, Chiến Dịch, Sóng Quái); hệ số bóng theo theme không đổi (hoàng hôn ×1.30, sa mạc
  ×0.85, băng ×0.80). **Giới hạn v1:** bản Java không có cơ chế sân nhà/sân khách — mọi trận của người chơi
  đều vẽ trên một bàn duy nhất của mình, nên sân đã chọn áp cho mọi trận của mình; bot PvP vẫn được
  `Match.startPvp` gán ngẫu nhiên một theme vào `PlayerState.arenaId` (parity với tinh linh) và hồ sơ cũng
  ghi vào `human().arenaId`, nhưng v1 chưa render sân của bot — dữ liệu đã sẵn cho cơ chế "ghé thăm" về sau.
- **Phản ứng theo trận** (`MatchScreen.drawArenaDecor` + `drawLossDim`, tái dùng `Match` streak/level):
  chuỗi thắng ≥ 2 (chỉ PvP có streak) → dãy cờ kim cương vàng/cam treo ở mép trên bàn cờ + 10 tia sao lấp
  lánh quanh bàn, chỉ ở pha chuẩn bị/kết quả; chuỗi thua ≥ 2 → lớp phủ tối-xám alpha 0.22 lên 4 dải NGOÀI
  khối bàn cờ+bench, vẽ ngay trên tranh sân (dưới nền bàn/tướng/chữ/panel nên không làm chìm thông tin nào),
  tự biến mất ngay khi chuỗi ngắt. Cấp người chơi là trạng thái đơn điệu (chỉ tăng trong trận): cấp ≥ 6 →
  rune kim cương vàng ở 4 góc bàn cờ; cấp ≥ 8 → thêm viền vàng nhịp sáng quanh bàn + quầng sáng vàng mềm
  dưới bàn (`drawLevelGlow`).
- **Điểm bấm tương tác:** một vị trí cố định theo tọa độ sân **(300,100)** bán kính 42 — vùng đất trống ở
  góc hồ dưới-trái, không bị panel/đĩa/shop/bench/tinh linh che trên cả 4 theme (trên từng theme nó rơi vào
  chi tiết tranh thật: sa mạc = mặt hồ, hoàng hôn = thúng hoa dưới biển chỉ đường, cỏ = đám hoa cạnh đá,
  băng = mặt băng nứt). Chỉ bắt ở pha chuẩn bị (hook trong `planningPress` sau mọi lớp modal): bấm → bùng
  8 tia sao + vòng lan + nền sân rung nhẹ 0,22s, sfx `sparkle`, hồi chiêu 3s chống spam; thuần giải trí,
  không đụng gameplay. Kiểm chứng bằng mode chụp `arenaprofile` / `arenasunset` / `arenawinstreak` /
  `arenalosestreak` / `arenalevel6` / `arenalevel8` / `arenaclick` trong ScreenshotMain.

### Kết liễu & Boom — Finisher & Boom (đợt 2026-10-26)

- **Boom — hiệu ứng va chạm sau mỗi vòng** (`MatchScreen.startBoom` / `drawBoom`, điều kiện thuần ở
  `Match.boomFires`): khi vòng đấu kết thúc và vào cửa sổ announcer, các tướng **còn sống của bên thắng**
  (tối đa 8 tia, chọn đều khắp đội hình từ khung hình cuối của trận) bắn loạt **tia sao vàng bay vòng cung**
  sang **nhà của tinh linh bên thua** — mình thắng: sang rìa sân địch (282,556); mình thua: tướng địch bắn
  vào tinh linh của mình (282,252), đồng bộ lúc nó ngã xụi. Tia bay 0,5s, lệch nhịp 0,05s/tia (cả loạt
  ~0,85s), chạm đích nổ chùm sao + vòng lan; sfx `sparkle` lúc bắn, `burst` ở tia chạm đầu tiên. Chạy gọn
  trong cửa sổ announcer 1,5s sẵn có — **không kéo dài pha**. Cả 2 bên cùng bị quét sạch (thắng chỉ nhờ
  tiêu chí phụ tổng máu khi hết giờ — coi như hòa) → không Boom. Áp cho cả PvP lẫn PvE (Chiến Dịch /
  Sóng Quái không có tinh linh địch: sao vẫn nổ ở rìa sân địch).
- **Kết liễu — Finisher** (dữ liệu: `Match.FightOutcome.eliminatedOpponent` / `humanEliminated`, phân loại
  thuần `Match.finisherKind`): nối thẳng vào dữ liệu loại sẵn có của `Match.fight()` nhánh PvP — đối thủ
  của vòng (`oppBot`, vốn bị loại khỏi vòng bot-đấu-bot nên chỉ nhận sát thương từ trận của người chơi)
  chết sau `resolveEliminations` → `eliminatedOpponent`; người chơi chết ở vòng này → `humanEliminated`
  (kể cả chết ở vòng PvE trong trận PvP). Hoạt cảnh **1,8 giây** phủ toàn màn TRƯỚC thẻ kết quả
  (`MatchScreen.drawFinisher`): màn tối dần (scrim), chùm sao bùng lớn ở giữa + rung nhẹ giảm dần, chữ lớn
  **"KẾT LIỄU!"** (vàng, dòng phụ là tên nạn nhân) hoặc **"BẠN BỊ LOẠI"** (đỏ, dòng phụ là hạng dừng lại) —
  chữ đo bằng GlyphLayout ở đúng scale vẽ, tự hạ scale nếu vượt 1120px; sfx `burst` cộng tiếng thắng/thua
  sẵn có. Tổng cửa sổ trước thẻ chỉ dài hơn ~0,3s so với announcer thường; chạm màn hình để bỏ qua hoạt
  cảnh sang thẻ. PvE (Chiến Dịch / Sóng Quái) không có "người chơi bị loại" → không kết liễu, chỉ Boom.
  Kiểm chứng headless mục 26 (điều kiện thuần + bất biến 2 chiều trên trận PvP trọn vẹn) và mode chụp
  `boomwin` / `boomlose` / `finisherwin` / `finisherlose` / `finishercard` trong ScreenshotMain.

### Vòng emote — Emote Wheel (đợt 2026-10-26)

- **Bộ 6 sticker VẼ** (logic thuần ở `game/Emotes.java`, hình sinh bằng Pixmap trong `MatchScreen`): mỗi
  sticker là **khuôn mặt thật của game** (cắt vùng đầu theo hộp alpha như `Assets.unitHeadRegion`) cộng
  yếu tố biểu cảm vẽ đè — (0) **Vui**: mặt Gogo + mắt trái tim + má hồng; (1) **Cười lớn**: mặt Slime Hồng +
  mắt nhắm ^^ + miệng cười to có lưỡi; (2) **Giận**: mặt Golem Đá + lông mày chéo + dấu gân giận đỏ;
  (3) **Khóc**: mặt Nấm Độc + giọt nước mắt; (4) **Ngạc nhiên**: mặt Phù Thủy Rừng + huy hiệu "!" vàng +
  miệng O; (5) **Khiêu khích**: mặt Goblin + nháy mắt + lè lưỡi + tia sao. Sticker được cắt tròn, nền trắng
  + viền tối kiểu sticker dán nên đọc rõ trên cả 4 nền sân. **Tuyệt đối không dùng ký tự emoji** (luật sản
  phẩm + emote TFT là tranh vẽ). Sticker bật ~**78px trên đầu tinh linh**, phóng 0.6→1.05→1.0 + lắc nhẹ,
  sống **2,5s** rồi mờ dần trong 0,4s cuối (`Emotes.popScale` / `popAlpha`).
- **Nút mở + vòng quay:** nút tròn nhỏ icon **bong bóng thoại** (Pixmap) ở **(282,168)** — ngay dưới nhà
  tinh linh của mình trong dải sân trái, không đè đĩa MUA XP/SHOP, panel, bench, bàn cờ, vùng bấm nghịch
  sân (300,100) hay thùng rác. Chạm → **vòng 6 ô** quanh nút (bán kính 70, ô trên cùng ở (282,238)); chạm
  1 sticker → bật trên đầu tinh linh của mình + đóng vòng; chạm ra ngoài → đóng. Bắt chạm ở đầu
  `planningPress` / `battlePress` (sau tab panel) nên dùng được ở **pha chuẩn bị và ngay giữa trận** —
  trận không hề dừng. **Hồi chiêu 5s** sau mỗi lần dùng tay: nút xám đi + vòng cung vàng quanh nút chạy
  ngược theo % còn lại (ngôn ngữ vòng XP); đang hồi mà chọn sticker trong vòng thì bị chặn kèm toast.
- **Tự bật theo sự kiện:** thắng vòng → sticker **Vui** tự bật trên tinh linh của mình, *trừ khi* vòng đó
  đã dùng emote tay (cờ đặt ở `useManualEmote`, reset ở `advanceFromResult`) hoặc đang có sticker khác
  hiện (`Emotes.shouldAutoCelebrate`); bị loại thì không tự bật gì.
- **Bot PvP đáp lại** (gieo hạt bằng `Random` từ seed trận — tất định theo trận): sau vòng đấu, bot đối
  thủ bị mình **loại hẳn → Khóc** (chắc chắn); bot **thắng vòng** → **35%** bật Vui hoặc Khiêu khích;
  mỗi vòng chuẩn bị → **8%** bot tự bật 1 sticker ngẫu nhiên. Mọi nguồn emote bot dùng chung **khoảng
  cách tối thiểu 10s** (`Emotes.botMayPop` trên đồng hồ trận) nên bot không bao giờ spam. Kiểm chứng
  headless mục 27 (mặt thật, hồi chiêu, đường cong pop, bảng chân lý tự bật, phân bố gieo hạt của bot)
  và mode chụp `emotewheel` / `emotepop` / `emotefoe` trong ScreenshotMain.

### Vá đỉnh màn trận (đợt 2026-10-26)

- **Bỏ hẳn dòng gợi ý tĩnh ở đỉnh** ("Kéo tướng: đặt / cất / bán • Kéo đồ khay trái: ghép / đeo — hết giờ
  tự vào trận.") theo yêu cầu user — hướng dẫn thao tác đã có trong màn Học Chơi. `msgLabel` chỉ còn hiện
  toast tạm thời; các toast chọn tướng cũng cắt bỏ phần hướng dẫn kéo/đặt/bán, chỉ giữ "Đã chọn X.".
- **"Vệt đỏ" sau dòng gợi ý — đã rõ nguyên nhân:** đó là **thanh máu đỏ của tướng địch xem trước ở hàng
  trên cùng bàn cờ** (tâm ô cy=607, `drawBars` vẽ thanh ở cy+57 → 664–671) **thò qua mép trên bàn cờ (642)**
  vào vùng chữ đỉnh và bị chữ trắng che một phần nên trông như vệt lạ. Cách sửa: hàng trên cùng **lật cả
  cụm thanh máu/mana/khiên/sao + khay đồ xuống dưới tướng** (đối xứng qua tâm tướng, `drawBars` /
  `drawUnitItems` trong `MatchScreen`); các hàng khác giữ nguyên. Đo trên ảnh sân băng: pixel đỏ trong
  dải đỉnh 395 → 0, thanh lật xuống đo đủ 350px/thanh dưới chân tướng.
- **Chữ trên sân băng:** sau khi bỏ dòng gợi ý, dòng pha (chữ lớn có viền tối) đọc rõ trên nền băng nên
  **không thêm dải mờ** (ít thay đổi càng tốt). Kiểm chứng bằng mode chụp mới `topfixice` / `topfixsunset`
  (ảnh trước/sau `tools/shot-topfix-{ice,sunset}-{before,after}.png`); gates: compile PASS,
  `verifyHeadless` **27/27 PASS**, `:web:buildWeb` PASS.

- **Bỏ nốt 3 dòng hướng dẫn nhỏ trong panel/popup đồ (đợt 2026-10-27):** nối tiếp lệnh bỏ dòng gợi ý ở đỉnh
  màn trận, bỏ luôn footer khay đồ ở tab TRANG BỊ (*"Kéo để ghép/đeo"* / *"Chạm xem chi tiết"*) và dòng cuối
  trong popup thông tin đồ (*"Kéo 2 thành phần vào nhau trong khay để ghép."* ở nhánh thành phần /
  *"Kéo đồ này lên tướng để đeo (tối đa 3 món/tướng)."* ở nhánh hoàn chỉnh) — chỉ bỏ chữ, hành vi kéo
  ghép/đeo và chạm mở popup giữ nguyên; popup thu 26px chiều cao (đáy 186 → 212, đỉnh 516 không đổi) để
  không còn dải trống. Gates: compile PASS, `verifyHeadless` 27/27 PASS, `:web:buildWeb` PASS
  (ảnh `tools/shot-nohint-{tabitems,iteminfo_comp,iteminfo_full}.png`).

### Làm lại pha chuẩn bị theo clip TFT Mobile (đợt 2026-10-26)

User gửi clip TikTok TFT Mobile (@khoai.tft.mobile, vòng 1-1) và yêu cầu làm lại màn chuẩn bị cho khớp;
bản ghi chi tiết bố cục từ clip: `~/workspace/research_notes/tft-mobile-planning-layout-from-tiktok-20261026.md`.
Đã áp dụng (chỉ `MatchScreen` + `ScreenshotMain` + mục Học Chơi; engine/cơ chế không đổi):

- **Shop luôn hiện ở pha chuẩn bị, vị trí DƯỚI–GIỮA (hiệu chỉnh theo phản hồi user):** bản đầu của đợt này
  đặt shop TRÊN–GIỮA y 586 theo đúng clip; user xem ảnh chụp và chốt *"Shop đưa xuống đẹp hơn"* nên dải thẻ
  đã dời xuống **dưới hàng bench**: 5 thẻ dọc 148×88 tại **y 4..92** (x bắt đầu 254, pitch 156, dải
  254..1026 căn giữa 640), **bỏ hẳn cơ chế mở/đóng shop bằng đĩa vàng** (trường `shopOpen` đã xóa). Thẻ kiểu
  clip: khung viền theo bậc tiền (asset `shopFrames`), chân dung phía trên, dòng icon kim cương + tên tộc/hệ
  ở giữa, tên tướng dưới-trái (cắt `...` nếu quá 100px), icon xu + giá dưới-phải theo màu bậc. Ngay **trên**
  dải thẻ là **pill tỉ lệ odds** (y 96, cao 20 — nằm giữa bench và thẻ) lấy đúng bảng
  `GameData.SHOP_ODDS[level]` của engine. Pha giao tranh/kết quả: dải shop **biến mất hoàn toàn**. Hình học
  đã đối chiếu: mép trên thẻ trùng đúng `BENCH_Y=92` nên không lẹm vào vùng chạm bench (92..162); dải không
  che đĩa MUA XP (x ≤ 116), cụm ĐỔI LẠI/vàng (x ≥ 1164), 2 vùng thùng rác kéo bán (x ≤ 200 / x ≥ 1080 —
  thùng rác vốn vẽ ở lớp kéo–thả nằm TRÊN shop), thẻ tướng (y ≥ 166) và bảng thông tin đồ (y ≥ 186). Lợi ích
  chính của vị trí dưới: **hàng tướng địch xem trước trên cùng bàn cờ hiện trọn vẹn** trong pha chuẩn bị
  (bản trên-giữa phủ mất hàng đó) và dây cờ chuỗi thắng của sàn đấu (y 642–659) hiện đủ ở cả pha chuẩn bị.
  Điểm phụ: vòng bấm nghịch sân (300,100,r42) bị thẻ 0 phủ mất cáp dưới (y 58..92) — tâm và cáp trên vẫn bấm
  được như thường.
- **Đĩa vàng chỉ còn là đồng hồ vàng:** bỏ chữ SHOP/ĐÓNG, bỏ vòng pulse, bỏ chức năng bấm mở shop (chạm vào
  chỉ nuốt chạm). **Reroll thành đĩa riêng** "ĐỔI LẠI" r38 tại (1218, 156) ở cột phải phía trên đĩa vàng, giá
  2, mờ khi thiếu vàng; **huy hiệu lửa chuỗi thắng dời lên góc trên-trái đĩa ĐỔI LẠI** (logic streak ≥2 giữ
  nguyên, tách khỏi đĩa vàng như clip).
- **Danh sách người chơi ẩn ở pha chuẩn bị:** panel phải thu về, chỉ còn nút gạt 34×68 ở mép phải (chữ `<`);
  chạm thì panel hiện dạng lớp phủ (đủ 2 tab Người/Sát thương, dấu đối thủ kiếm chéo + viền vàng giữ nguyên),
  nút gạt đổi thành `>` ở mép trái panel, chạm lại hoặc chạm ra ngoài là thu về (cú chạm ra ngoài vẫn tiếp
  tục xử lý như chạm sân thường). Pha giao tranh/kết quả hiện như cũ.
- **Panel trái thêm THU GỌN THỦ CÔNG:** nút tròn chevron r15 ở góc trên panel — thu thành cột hẹp 56px chỉ
  gồm icon lục giác màu theo tộc/hệ (đang kích hoạt có vòng vàng; chạm xem tên + số + mô tả hiệu ứng) và ô
  vuông đồ trong khay (chạm mở bảng thông tin; tràn thì ô cuối hiện `+N`). Trạng thái thu/mở là lựa chọn của
  người chơi, **giữ nguyên qua mọi pha** (clip chứng minh panel không tự thu theo pha), mặc định mở rộng.
- **Bench thành 9 ô tròn:** thay mảng đất vẽ đĩa tròn tại đúng tâm ô cũ (đĩa ngoài 82px viền tối, lòng 72px
  xanh ngọc trầm + vệt bóng sáng nửa trên). **Tọa độ/kích thước vùng chạm bench không đổi** (mảng đất là lớp
  vẽ tách riêng trong `drawBench` nên thay được; `benchPatchTex` vẫn được nạp cho nơi khác nếu cần).

Khác biệt có chủ đích so với clip (giữ nguyên, đã ghi rõ): **(1)** panel trái vẫn có **tab trang bị** đầy đủ —
hệ thống đồ của game cần khay để ghép/đeo/kéo, clip TFT Mobile để trang bị ở nơi khác; trạng thái thu gọn
vẫn chứa ô đồ để xem nhanh. **(2) Không có cần điều khiển di chuyển tinh linh** ở mép trái như clip — tinh
linh của game tự đi lại trên sân. **(3)** Lật thẻ úp mở trận + vòng chọn x-4, đĩa MUA XP, thẻ tướng khi chạm,
kéo–thả/kéo bán, vòng emote: giữ nguyên như các đợt trước.

Kiểm chứng: mode chụp mới `plantop` (1-1 shop dưới-giữa, sân cỏ, địch xem trước trọn vẹn), `planopen` (panel phải mở dạng lớp phủ),
`plancollapse` (panel trái thu gọn cột icon), `planstreak` (ép streak=3: odds + đĩa ĐỔI LẠI + huy hiệu lửa),
cộng `battle`/`result` (shop biến mất, danh sách hiện) — ảnh `tools/shot-plan-*.png`, đã tự soi từng điểm
theo bản ghi clip. Gates: compile PASS, `verifyHeadless` **27/27 PASS** (không đổi), `:web:buildWeb` PASS.

## Cách build & chạy

> **Lưu ý bản trên GitHub:** các file nhị phân (PNG sprite/scene, font TTF, `gradle-wrapper.jar`) được lưu
> dưới dạng text base64 (`*.b64`) theo quy ước của repo này. Sau khi clone/pull thư mục `java/`, chạy một lần:
> `bash tools/restore-binaries.sh` để giải mã chúng về file thật trước khi build.

Máy có mạng bình thường (Gradle tự tải dependency từ Maven Central):

```bash
cd java
./gradlew :desktop:run            # chay ban desktop
./gradlew :desktop:verifyHeadless # chay bo kiem tra logic (phai dat 26 PASS / 0 FAIL)
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

## Pipeline đồ họa pixel (bản chính hiện tại)

```bash
python3 tools/pixelize_from_painted.py            # pixel-hoa units + scenes + mang dat bench
python3 tools/pixelize_from_painted.py --icons    # + 18 icon trang bi
```

Theo chốt của chủ dự án 2026-10-25 ("Chuyển qua pixel đi"), bản chính quay về **pixel art** như bản Java
đời đầu. Pipeline v3 (`tools/pixelize_from_painted.py`) tái dùng nguyên hàm + thông số của pipeline pixel v2
(`tools/pixelize.py`) nhưng lấy **nguồn là toàn bộ tranh painted hiện tại** (gồm cả dạng tiến hoá `_s2/_s3`
và bản đã khử viền trắng) thay vì tranh RN/new-art cũ:

- **Sprite tướng/quái (85 file):** canvas 128×128, thân tối đa 108×116, palette 48 màu (MEDIANCUT, không
  dither), tăng bão hoà thích ứng, resize premultiplied, alpha cắt cứng (ngưỡng 96), xoá mảnh bụi ≤20px,
  viền đậm 1px, neo đáy — tỉ lệ thân/canvas và cỡ vẽ trong game (100px trên bàn/bench) không đổi.
- **Sân (4) + lobby:** 640×360, palette 128 màu, không dither, KHÔNG nướng thêm vignette (tranh painted
  đã nướng sẵn ~14%). Card-back 128×179/64 màu; banner rộng 320/96 màu.
- **Mảng đất bench (3):** lưới pixel 96×48 (= đúng cỡ vẽ trong game), palette 96 màu, giữ alpha.
- **Icon trang bị (18):** lưới nội bộ 64×64, palette 96 màu (rộng hơn sprite để đọc rõ ở cỡ khay ~40px),
  phóng NEAREST lên file 128×128. Cả 18 icon đều đọc rõ sau pixel-hóa (kiểm chứng trong game thật:
  khay trang bị + bảng thông tin) — không icon nào phải giữ painted.
- **KHÔNG pixel-hóa:** khung/nút/panel UI, hiệu ứng BattleFx vẽ bằng code, chữ/số.

Lần chạy đầu, script tự chụp snapshot nguồn painted vào `tools/painted-src/` (thư mục làm việc cục bộ,
không đẩy lên repo). Đợt khử viền (`defringe_units.py`) không còn cần cho sprite pixel vì alpha đã cắt
cứng — script vẫn giữ trong repo. Hướng painted dưới đây chỉ còn là lịch sử/tuỳ chọn.

## Pipeline đồ họa painted (đợt trước — giữ làm tuỳ chọn)

```bash
python3 tools/make-painted-assets.py   # sinh lai sprite painted + 4 san 1280x720 tu tranh goc
```

Đợt painted-hóa (sau bản mẫu đối chiếu) từng là bản chính: sân = tranh gốc `tools/new-art/arena-*.webp`
cắt 16:9, resize LANCZOS về 1280×720 (không quantize); tướng/quái = tranh raster gốc, chuẩn hóa khung
trên canvas 512×512 (thân tỉ lệ 432/512, neo đáy). Đã bị thay bởi hướng pixel ở mục trên theo quyết định
2026-10-25; toàn bộ asset painted vẫn khôi phục được từ git history (commit `26c8f81c` trở về trước).
Xem trước lịch sử: `tools/preview-sheet.png`, `tools/arena-sheet.png`.

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
| Bóng chân bench | ellipse 46px ở y+5 (lệch chân ~25px) | cùng hệ tiếp đất của tướng trên bàn (nay là `drawUnitGrounding(cx, cy, 100, 0)` — bóng đổ xuống-phải + contact AO, xem mục bố cục màn trận) |
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

## Đợt gỡ nhật ký trận (2026-10-25)

User chỉ ra TFT thật không có panel nhật ký chữ (thông tin trận bên TFT đi qua số sát thương bay +
bảng sát thương) — **gỡ toàn bộ UI nhật ký cho giống TFT**: nút icon sách 42×42 ở góc trái
(trên đĩa MUA XP), panel `logBox` "NHẬT KÝ" + nhãn log + trạng thái `showLog` và listener bật/tắt,
khối nạp 8 dòng log cuối trong `refreshPlanning`, mode chụp `logopen` trong ScreenshotMain, và câu
mô tả nút sách trong GuideScreen. Rà soát dữ liệu trước khi gỡ sâu: danh sách `Match.log` chỉ có
**đúng 1 nơi đọc** là panel này (mọi `log.add(msg)` đều chạy song song với `return msg` cho
toast/popup — thông tin không mất đường hiển thị nào khác) nên **gỡ luôn cả phần ghi log**:
field `log` + 7 lệnh `log.add(...)` trong `Match.java`. Giữ nguyên tuyệt đối: bảng sát thương tự
hiện ở pha kết quả, số sát thương bay/cụm pow, announcer, toast, danh sách người chơi.

- **Kiểm chứng đợt này:** compile desktop PASS, `verifyHeadless` **22/22 PASS**, `:web:buildWeb` PASS.
  Grep sau gỡ: không còn `logBox`/`logBtn`/`showLog`/`logLabel`/`logopen`/`Match.log` ở đâu trong
  code (icon "book" trong Assets/MenuScreen vẫn dùng cho nút Học Chơi — không thuộc panel nhật ký).
  Ảnh `tools/shot17-planning.png`, `tools/shot17-battle4.png`, `tools/shot17-resultpanel.png` đã tự
  soi: không còn nút sách ở góc trái, không khoảng trống bất thường (đĩa MUA XP và khay trang bị giữ
  nguyên vị trí), bảng sát thương vẫn tự hiện ở pha kết quả.
