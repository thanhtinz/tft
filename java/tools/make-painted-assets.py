#!/usr/bin/env python3
"""Dung bo asset PAINTED (khong pixel-hoa) cho ban mau so sanh phong cach.

- Units: lay tranh raster goc cua du an RN (assets/art/units/<id>.webp, RGBA),
  chuan hoa khung nhu pipeline pixel v2 (than chiem 108/128 chieu cao canvas,
  neo day sat mep duoi canvas, can giua ngang) nhung GIU NGUYEN RGBA day du:
  khong quantize, khong cat alpha cung, khong vien dam. Canvas 512x512.
- Scenes: lay tranh goc tools/new-art/arena-*.webp, cat 16:9 theo cung anchor
  cua pixelize.py, resize LANCZOS ve dung 1280x720, khong quantize/vignette.

Chi ghi vao thu muc assets cua project chinh (tft-java-game).
"""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path.home() / "workspace" / "tft-java-game"
RN_UNITS = Path.home() / "workspace" / "tft-chibi-game" / "assets" / "art" / "units"
NEW_ART = Path.home() / "workspace" / "tft-java-game" / "tools" / "new-art"
OUT_UNITS = ROOT / "assets" / "units"
OUT_SCENES = ROOT / "assets" / "scenes"

CANVAS = 512
BODY_H = 432  # = 108/128 * 512, cung ti le than/canvas voi sprite pixel v2
TRIM_THRESHOLD = 8

ARENAS = [
    ("arena-forest.webp", "arena.png", 0.0),
    ("arena-sunset.webp", "arena-sunset.png", 0.0),
    ("arena-desert.webp", "arena-desert.png", 0.30),
    ("arena-ice.webp", "arena-ice.png", 0.0),
]


def resize_premultiplied(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    arr = np.asarray(img).astype(np.float32)
    alpha = arr[..., 3:4] / 255.0
    premult = np.concatenate([arr[..., :3] * alpha, arr[..., 3:4]], axis=2)
    resized = Image.fromarray(np.clip(premult, 0, 255).astype(np.uint8), "RGBA").resize(size, Image.LANCZOS)
    out = np.asarray(resized).astype(np.float32)
    a = out[..., 3:4] / 255.0
    rgb = np.where(a > 0, out[..., :3] / np.maximum(a, 1e-6), 0)
    return Image.fromarray(np.concatenate([np.clip(rgb, 0, 255), out[..., 3:4]], axis=2).astype(np.uint8), "RGBA")


def convert_unit(src: Path, dst: Path) -> str:
    img = Image.open(src).convert("RGBA")
    alpha = np.asarray(img.split()[3])
    ys, xs = np.where(alpha > TRIM_THRESHOLD)
    if len(xs) == 0:
        return "EMPTY-ALPHA"
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    body = img.crop((x0, y0, x1, y1))
    bw, bh = body.size
    scale = BODY_H / bh
    note = ""
    if bw * scale > CANVAS:  # con qua be ngang: gioi han theo chieu ngang
        scale = CANVAS / bw
        note = " (gioi han theo ngang)"
    nw, nh = max(1, round(bw * scale)), max(1, round(bh * scale))
    body = resize_premultiplied(body, (nw, nh))
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.paste(body, ((CANVAS - nw) // 2, CANVAS - nh), body)
    canvas.save(dst, optimize=True)
    return f"bbox goc {bw}x{bh} -> than {nw}x{nh}{note}"


def crop_to_16_9(img: Image.Image, anchor_top: float) -> Image.Image:
    w, h = img.size
    target_h = round(w * 9 / 16)
    if h <= target_h:
        target_w = round(h * 16 / 9)
        left = (w - target_w) // 2
        return img.crop((left, 0, left + target_w, h))
    cut = h - target_h
    top = round(cut * anchor_top)
    return img.crop((0, top, w, top + target_h))


def main() -> None:
    ids = sorted(p.stem for p in OUT_UNITS.glob("*.png"))
    print(f"units can chuyen: {len(ids)}")
    problems = []
    for uid in ids:
        src = RN_UNITS / f"{uid}.webp"
        if not src.exists():
            problems.append(f"{uid}: THIEU file RN")
            continue
        info = convert_unit(src, OUT_UNITS / f"{uid}.png")
        if info == "EMPTY-ALPHA":
            problems.append(f"{uid}: alpha rong")
        else:
            print(f"  {uid}: {info}")
    for src_name, dst_name, anchor in ARENAS:
        img = Image.open(NEW_ART / src_name).convert("RGB")
        img = crop_to_16_9(img, anchor).resize((1280, 720), Image.LANCZOS)
        img.save(OUT_SCENES / dst_name, optimize=True)
        print(f"  scene {dst_name}: 1280x720 tu {src_name} (anchor {anchor})")
    if problems:
        print("VAN DE:")
        for p in problems:
            print("  " + p)
    else:
        print("units: khong van de")


if __name__ == "__main__":
    main()
