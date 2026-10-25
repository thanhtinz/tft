#!/usr/bin/env python3
"""Khử viền trắng + làm gọn mép cho sprite tướng/quái (assets/units/*.png, canvas 512).

Chẩn đoán (đo trên bản cũ): tranh painted được tách nền từ nền sáng bằng keying +
resize premultiplied Lanczos (make-painted-assets.py chia lại theo alpha làm RGB
ở vành bán trong suốt bị thổi sáng, mất bão hoà — "nhiễm matte sáng"), vành alpha
rộng và mềm; thêm việc game vẽ thu 512->~100px bằng filter Linear KHÔNG mipmap
nên texel vành sáng bị lấy mẫu rời rạc -> quầng trắng + lấp loáng/mờ quanh silhouette.
(Riêng bản _s2/_s3 đã despill/gọt ở make-evo-assets.py nên vành sạch hơn, vẫn xử lý
chung một lượt cho đồng nhất.)

Xử lý mỗi sprite (không đổi canvas/id/đường dẫn):
  1) Gọt matte: min-filter alpha 3x3 CHỈ ở vùng không-đặc (co mép ngoài ~1px,
     ruột đặc giữ nguyên 255) + diệt alpha < 28.
  2) Khử nhiễm sáng ở vành: pixel vành nào SÁNG BẤT THƯỜNG so với pixel đặc gần
     nhất (vượt quá +BRIGHT_MARGIN độ sáng) thì bị kéo màu về phía màu pixel đặc
     đó cho tới khi phần vượt bị cắt còn đúng +BRIGHT_MARGIN (giữ hướng hue) —
     chỉ đụng đúng pixel viền trắng, không đụng vành sáng hợp lệ của nhân vật
     vốn sáng (vd slime hồng bóng). Cộng kéo nhẹ toàn vành về màu đặc gần nhất
     theo (1-alpha) để mép liền màu. (Đã thử un-matte khỏi trắng thuần: nó làm
     vành SÁNG HƠN ở nhân vật vốn sáng — loại.)
  3) Bleed màu: pixel trong suốt (a=0) nhận RGB của pixel có alpha gần nhất
     (thay cho RGB đen 0,0,0 như pipeline cũ để lại) — GPU lọc song tuyến/mipmap
     không còn kéo đen/trắng lạ vào mép.
  4) Unsharp mask rất nhẹ (tham số UNSHARP) áp trên RGB theo trọng số alpha.

Cách dùng:
  python3 tools/defringe_units.py              # xử lý toàn bộ assets/units/*.png (tại chỗ)
  python3 tools/defringe_units.py susu baba    # chỉ vài id (để soi A/B)
  python3 tools/defringe_units.py --measure    # chỉ đo trước/sau, không ghi
Kèm --sheet để xuất bảng đối chiếu trên nền cỏ vào tools/defringe-sheet.png.
"""
from pathlib import Path
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path.home() / "workspace" / "tft-java-game"
UNITS = ROOT / "assets" / "units"

ALPHA_KILL = 28        # alpha sau gọt dưới mức này -> 0
SOLID = 250            # ngưỡng coi là pixel đặc (màu "thật" của nhân vật)
BRIGHT_MARGIN = 24.0   # độ sáng vành được phép vượt pixel đặc gần nhất
UNSHARP_RADIUS = 1.1
UNSHARP_AMOUNT = 0.32  # 0 = tắt


def lum(rgb: np.ndarray) -> np.ndarray:
    return 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]


def measure(arr: np.ndarray) -> dict:
    """bright_frac = tỉ lệ pixel vành sáng hơn pixel ĐẶC GẦN NHẤT của chính nó
    quá +30 (đo từng pixel, không dùng trung bình toàn cục — tránh lệch tham chiếu)."""
    rgb, a = arr[..., :3], arr[..., 3]
    rim = (a > 0) & (a < 255)
    solid = a >= SOLID
    out = {"rim_px": int(rim.sum()), "rim_lum": 0.0, "inner_lum": 0.0, "bright_frac": 0.0}
    if rim.any() and solid.any():
        L = lum(rgb)
        _, inds = ndimage.distance_transform_edt(~solid, return_indices=True)
        near_lum = L[tuple(inds)]
        out["rim_lum"] = float(L[rim].mean())
        out["inner_lum"] = float(near_lum[rim].mean())
        out["bright_frac"] = float((L[rim] > near_lum[rim] + 30).mean())
    return out


def defringe(img: Image.Image) -> Image.Image:
    arr = np.asarray(img.convert("RGBA")).astype(np.float32)
    rgb, a = arr[..., :3].copy(), arr[..., 3].copy()

    # 1) Gọt matte: co mép NGOÀI 1px — min-filter chỉ áp ở vùng không-đặc,
    #    ruột đặc (a>=SOLID) giữ nguyên để vành không phình vào trong.
    solid0 = a >= SOLID
    a_er = ndimage.minimum_filter(a, size=3, mode="constant", cval=0)
    a = np.where(solid0, a, a_er)
    a[a < ALPHA_KILL] = 0

    solid = a >= SOLID
    rim = (a > 0) & ~solid
    if rim.any():
        # Màu pixel đặc gần nhất cho mọi pixel (neo khử nhiễm)
        _, inds = ndimage.distance_transform_edt(~solid, return_indices=True)
        nearest = rgb[tuple(inds)]  # HxWx3

        # 2a) Cắt phần sáng VƯỢT bất thường: thu màu về phía màu neo sao cho
        #     độ sáng chỉ còn vượt tối đa BRIGHT_MARGIN (giữ hướng hue từ neo).
        L = lum(rgb)
        Ln = lum(nearest)
        excess = L - Ln - BRIGHT_MARGIN
        hit = rim & (excess > 0)
        if hit.any():
            s = np.ones_like(L)
            denom = np.maximum(L - Ln, 1e-6)
            s[hit] = np.clip((BRIGHT_MARGIN) / denom[hit], 0.0, 1.0)
            capped = nearest + (rgb - nearest) * s[..., None]
            rgb = np.where(hit[..., None], capped, rgb)
        # 2b) Kéo nhẹ toàn vành về màu neo theo (1-alpha) cho liền màu
        al = (a / 255.0)[..., None]
        k = (1 - al) * 0.25
        rgb = np.where(rim[..., None], rgb * (1 - k) + nearest * k, rgb)

    # 3) Bleed màu ra vùng trong suốt (thay RGB đen) để lọc GPU không kéo màu lạ
    trans = a == 0
    if trans.any() and (a > 0).any():
        _, inds = ndimage.distance_transform_edt(trans, return_indices=True)
        # inds ở đây trỏ tới pixel không-trong-suốt gần nhất cho vùng trans
        bleed = rgb[tuple(inds)]
        rgb = np.where(trans[..., None], bleed, rgb)

    out = np.concatenate([np.clip(rgb, 0, 255), a[..., None]], axis=2).astype(np.uint8)
    res = Image.fromarray(out, "RGBA")

    # 4) Unsharp nhẹ trên RGB (trọng số alpha nằm trong chính dữ liệu màu mép đã sạch)
    if UNSHARP_AMOUNT > 0:
        blur = res.filter(ImageFilter.GaussianBlur(UNSHARP_RADIUS))
        r = np.asarray(res).astype(np.float32)
        b = np.asarray(blur).astype(np.float32)
        r[..., :3] = np.clip(r[..., :3] + (r[..., :3] - b[..., :3]) * UNSHARP_AMOUNT, 0, 255)
        res = Image.fromarray(r.astype(np.uint8), "RGBA")
    return res


def main() -> None:
    args = [x for x in sys.argv[1:] if not x.startswith("--")]
    do_sheet = "--sheet" in sys.argv
    measure_only = "--measure" in sys.argv
    files = sorted(UNITS.glob("*.png"))
    if args:
        files = [UNITS / f"{x}.png" for x in args]
    tot_before, tot_after = [], []
    for f in files:
        img = Image.open(f)
        before = measure(np.asarray(img.convert("RGBA")).astype(np.float32))
        fixed = defringe(img)
        after = measure(np.asarray(fixed).astype(np.float32))
        tot_before.append(before); tot_after.append(after)
        print(f"{f.stem:16s} vanh {before['rim_px']:6d}->{after['rim_px']:6d}px  "
              f"sangVanh {before['rim_lum']:6.1f}->{after['rim_lum']:6.1f}  "
              f"sangBatThuong {before['bright_frac']*100:4.1f}%->{after['bright_frac']*100:4.1f}%")
        if not measure_only:
            fixed.save(f, optimize=True)
    if tot_before:
        n = len(tot_before)
        print(f"TRUNG BÌNH ({n} sprite): sangVanh "
              f"{np.mean([m['rim_lum'] for m in tot_before]):.1f} -> {np.mean([m['rim_lum'] for m in tot_after]):.1f}, "
              f"sangBatThuong {np.mean([m['bright_frac'] for m in tot_before])*100:.1f}% -> "
              f"{np.mean([m['bright_frac'] for m in tot_after])*100:.1f}%")
    if do_sheet:
        make_sheet(files)


def make_sheet(files) -> None:
    # Bang doi chieu o dung co game (100px) tren cat san that, phong NEAREST de soi
    arena = Image.open(ROOT / "assets" / "scenes" / "arena.png").convert("RGB")
    names = ["susu", "baba", "gogo_s3", "slime"]
    cell_w, cell_h = 130, 120
    sheet = arena.crop((280, 320, 280 + cell_w * len(names), 320 + cell_h)).resize(
        (cell_w * len(names), cell_h))
    for i, name in enumerate(names):
        im = Image.open(UNITS / f"{name}.png").convert("RGBA").resize((100, 100), Image.LANCZOS)
        sheet.paste(im, (10 + i * cell_w, 14), im)
    sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(ROOT / "tools" / "defringe-sheet.png")
    print("sheet ->", ROOT / "tools" / "defringe-sheet.png")


if __name__ == "__main__":
    main()
