# Đấu Trường Chibi — Bản Java + Pixel 2D (LibGDX)

Bản chuyển đổi của game "Đấu Trường Chibi" từ React Native sang **Java + LibGDX** với đồ họa **pixel 2D**,
theo quyết định của chủ dự án (đợt 1, 2026-10-23).

> **Quan trọng:** Bản React Native ở thư mục gốc của repo **vẫn giữ nguyên** và demo Vercel
> (https://dau-truong-chibi.vercel.app) vẫn chạy bản RN. Bản Java này nằm trong thư mục `java/`
> và chỉ thay thế hẳn bản RN khi bản web của nó chạy được (xem mục "Bản web (TeaVM)").

## Công nghệ & phiên bản

| Thành phần | Phiên bản |
|---|---|
| JDK | Temurin **17.0.20.1** (chạy được với mọi JDK 17+) |
| Gradle | **8.10.2** (qua Gradle Wrapper trong repo — `./gradlew`) |
| LibGDX | **1.13.1** |
| Backend desktop | LWJGL3 (LWJGL 3.3.3) |
| Font tiếng Việt | DejaVu Sans qua FreeType (gdx-freetype) — đủ dấu tiếng Việt |

## Cấu trúc project

```
java/
├── settings.gradle          # include 'core', 'desktop' (web/android chua kich hoat)
├── build.gradle             # repositories dung chung (+ kho Maven cuc bo neu co)
├── core/                    # toan bo game (khong phu thuoc nen tang)
│   └── src/main/java/com/dautruongchibi/
│       ├── data/GameData.java   # so lieu port nguyen tu ban RN: 25 tuong, 8 toc/he, 12 do, 10 quai, 8 cuong hoa
│       ├── game/                # Engine (mo phong tat dinh theo seed), Match (dieu phoi tran),
│       │                        # Traps (6 la bay up), Rank (10 bac + bang LP), Stages (5.200 man),
│       │                        # Profile (luu JSON local), Rng (mulberry32 giong ban RN)
│       ├── headless/HeadlessMain.java  # bo kiem tra khong giao dien (19 muc)
│       └── ui/                  # MenuScreen, CampaignScreen, MatchScreen, GuideScreen, ProfileScreen
├── desktop/                 # DesktopLauncher (LWJGL3 1280x720) + ScreenshotMain (cong cu kiem chung GUI)
├── android/                 # KHAI BAO SAN (build.gradle + Manifest + launcher) — chua build APK dot nay
├── web/                     # Thi nghiem TeaVM — chua dung duoc, xem muc rieng o duoi
├── assets/                  # units/ (35 sprite pixel), scenes/ (arena, lobby, card-back...), fonts/
└── tools/
    ├── pixelize.py          # pipeline chuyen tranh goc -> sprite pixel (chay lai duoc)
    ├── preview-sheet.png    # bang xem truoc toan bo sprite (phong to nearest-neighbor)
    ├── fetch-deps.sh / fetch_deps.py  # tai dependency bang curl vao local-maven (moi truong han che mang)
    └── shot-*.png           # anh chup kiem chung GUI (menu, lat the, chuan bi, giao tranh)
```

## Gameplay đã port (khớp bản RN)

- **Lõi auto-battler:** shop 5 thẻ theo odds từng cấp, reroll 2 vàng, mua XP 4 vàng, lãi theo vàng giữ (tối đa +5),
  thưởng chuỗi thắng/thua, bench 9 ô, bàn 7×4 (đặt ở 4 hàng dưới), ghép sao tự động ×1.8 / ×3.2,
  tộc/hệ 8 hệ với ngưỡng như bản RN, 12 trang bị, cường hóa ở vòng 2-1 / 3-2 / 4-2, bot AI dựng đội + hao hụt bot-vs-bot mô phỏng.
- **Cơ cấu chế độ (theo chốt của user):**
  - PvE **Chiến Dịch**: 5.200 màn / 52 chương sinh tất định, boss mỗi 10 màn, boss lớn cuối chương.
  - PvE **Sóng Quái** vô tận, boss mỗi 10 sóng.
  - PvP **Thường / Hạng / Đấu Tập**: đấu 8 người với 7 bot giả lập; **chỉ Hạng mới tính rank LP** vào hồ sơ;
    Đấu Tập bot yếu hơn (lùi 4 vòng sức mạnh, tối đa 1 bẫy) và không tính gì.
  - **Học Chơi** riêng ở menu. (PvP online người thật vẫn chờ Supabase như bản RN — ngoài phạm vi đợt này.)
- **LP 8000 (mượn Yu-Gi-Oh):** mọi người chơi bắt đầu 8000 LP. Sát thương thua vòng của bản RN (thang 100 máu)
  được **nhân hệ số 80** (`Engine.LP_SCALE = 80`) — kiểm chứng bằng mô phỏng headless: trận PvP trọn vẹn kéo dài
  16–17 vòng ở 3 seed kiểm tra, tương đương độ dài bản 100 máu. LP về 0 = bị loại; hiển thị số LP lớn + cột LP trong danh sách người chơi.
- **Lật thẻ úp mở trận:** đầu trận PvP (và các vòng x-4, sóng 1 ở Sóng Quái) hiện 8 thẻ úp lưng pixel;
  chọn 1 thẻ → lật mở (420ms, các thẻ khác lật nối tiếp) → nhận tướng về bench + 1 trang bị vào kho.
- **Bài bẫy úp (mượn Yu-Gi-Oh, bản nhẹ):** mỗi vòng ở pha chuẩn bị được xem 3 lá, đặt úp tối đa 2 lá
  (chỉ hiện mặt lưng; bot cũng đặt bẫy ẩn). Khi đúng điều kiện, lá bẫy tự lật kèm banner
  **"BẪY KÍCH HOẠT: \<tên\>!"** và chạy hiệu ứng ngay trong engine tất định theo seed:
  1. *Hố Sập Choáng* — mở trận: tướng địch khỏe nhất choáng 2,5s + 100 sát thương phép.
  2. *Bẫy Băng Giá* — địch tung kỹ năng lần đầu: đóng băng 2s + 120 sát thương phép.
  3. *Khiên Đội Hình* — tổng máu đội lần đầu dưới 50%: toàn đội nhận khiên 15% máu tối đa.
  4. *Sét Trừng Phạt* — giây 10, nếu còn ≥3 địch: sét 180 sát thương phép lên toàn bộ địch.
  5. *Hồi Sinh Đồng Đội* — đồng minh đầu tiên gục ngã hồi sinh với 40% máu.
  6. *Gương Phản Đòn* — đòn chí tử đầu tiên lên đồng minh bị hóa giải (sống sót với 1 máu) và phản 150% sát thương.
  
  Mỗi lá chỉ kích hoạt 1 lần/vòng. Bộ kiểm tra headless có 1 mục riêng cho **từng lá bẫy**.
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
./gradlew :desktop:verifyHeadless # chay bo kiem tra logic (phai dat 19 PASS / 0 FAIL)
```

Chụp ảnh kiểm chứng GUI (cần Xvfb, không cần người bấm — công cụ tự vào trận, tự đánh):

```bash
xvfb-run -a ./gradlew :desktop:screenshot -PscreenshotMode=battle4 -PscreenshotOut=tools/shot-battle4.png
# che do: menu | draft | planning | battle | battle4 (tran vong 4, nhieu tuong)
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

Cách làm: cắt theo hộp alpha → thu nhỏ premultiplied-alpha (LANCZOS) về tối đa 56px chiều cao →
lượng tử hóa palette tối đa 28 màu (MEDIANCUT, không dither) → canvas 64×64 neo đáy giữa.
Kết quả: 35 sprite tướng/quái + arena 4 biến thể (cỏ/hoàng hôn/sa mạc/băng) 480×270, lobby, lưng thẻ 96×134.
Xem trước: `tools/preview-sheet.png`. Nhận xét chất lượng: sprite nhận diện rõ, alpha sạch không quầng;
riêng mimi/nana/queen hơi nhạt do tranh gốc vốn bán trong suốt (vào game trên nền arena tối sẽ rõ hơn).

## Kiểm chứng đã làm (đợt này)

- `./gradlew :desktop:compileJava` — **BUILD SUCCESSFUL** (core + desktop).
- `./gradlew :desktop:verifyHeadless` — **19 PASS / 0 FAIL**, gồm: dữ liệu gốc khớp bản RN; RNG tất định;
  sinh 5.200 màn; ghép sao; shop/odds; LP 8000 ×80; bảng rank LP; lật thẻ 8 lá; mô phỏng trận tất định;
  **từng lá bẫy trong 6 lá** kích hoạt đúng điều kiện; **trận PvP 8 người trọn vẹn tới khi có hạng (3 seed: 16–17 vòng)**;
  PvE chiến dịch; Sóng Quái (tới sóng 10); hồ sơ JSON lưu/đọc vòng lặp.
- GUI thật dưới Xvfb: chụp 4 màn hình (menu, lật thẻ úp, pha chuẩn bị, giao tranh vòng 4 có banner bẫy kích hoạt,
  số sát thương, LP đối thủ giảm theo vòng) — xem `tools/shot-*.png`.

## Đơn giản hóa & giới hạn đã biết

- **Do thám đối thủ:** bản RN xem được đội hình bot; bản Java hiện chỉ hiện tên/loại đối thủ vòng này (đội hình ẩn) — sẽ bổ sung khi có thời gian.
- **Phát lại giao tranh:** engine xuất khung hình mỗi 0,5s; GUI nội suy tuyến tính vị trí/máu/mana giữa 2 khung — mượt ở mức sprite, không phải mô phỏng 60fps.
- **Pha chuẩn bị** có đếm ngược 90 giây, hết giờ tự vào trận (bản RN cũng tự bắt đầu theo đồng hồ vòng).
- **Chưa có âm thanh** trong đợt Java này (bản RN có nhạc/SFX tổng hợp; sẽ port sau).
- `autoPlan()` trong `Match.java` là bot điều khiển phục vụ kiểm tra headless — chơi đơn giản (không reroll/xp chủ động) nên thường xếp hạng thấp khi tự đánh trọn trận; đó là giới hạn của bot kiểm tra, không phải lỗi engine.
- **Android:** module đã khai báo sẵn (build.gradle + AndroidManifest + AndroidLauncher) nhưng **chưa build APK** đợt này — cần thêm `include 'android'` vào settings.gradle + Android SDK/AGP trên máy build.

## Bản web (TeaVM) — CHƯA dựng được, điểm kẹt cụ thể

Đã thử nghiêm túc (không bỏ qua): backend **gdx-teavm 1.2.4** (đi với LibGDX 1.13.5 — cùng dòng 1.13 với project)
+ **TeaVM 0.12.3** + **gdx-freetype-teavm 1.2.4**. Dependency resolve offline thành công, TeaVM bắt đầu biên dịch
nhưng dừng ở 12 lỗi phân tích:

1. `java.nio.file.Path / Files / LinkOption was not found` (×6) — **TeaVM 0.12.3 chưa có java.nio.file**;
   `game/Profile.java` đang dùng NIO để lưu hồ sơ. *Sửa được:* chuyển Profile sang `java.io.File` (đợt sau).
2. `java.lang.Integer.sum / toUnsignedLong was not found` (×5) — thiếu trong classlib TeaVM 0.12.3, phát sinh từ
   mã thư viện (không phải mã game) — **không sửa được ở tầng game**.
3. `Field PixmapPacker$PixmapPackerRectangle.x was not found` (×1) — lỗi phân giải field trong đường
   đóng gói glyph của FreeTypeFontGenerator trên TeaVM 0.12.3.

**Hướng đi đợt sau:** nâng LibGDX lên **1.14.0** + backend-teavm **1.4.0** (TeaVM **0.13**) trong một đợt riêng
(kèm chuyển Profile sang java.io), vì bản 1.4.0/0.13 mới là dòng đang được bảo trì. Mã nguồn thử nghiệm giữ ở
thư mục `web/` (WebLauncher + BuildWeb + build.gradle) nhưng module **không** nằm trong `settings.gradle`
để không ảnh hưởng build desktop. Khi dựng được, output sẽ ở `web/build/webapp/` (index.html + game.js + assets) —
đó cũng là điều kiện để thay hẳn bản RN trên Vercel theo kế hoạch của chủ dự án.
