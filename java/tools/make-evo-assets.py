#!/usr/bin/env python3
"""Xu ly tranh TIEN HOA theo sao (s2/s3) cho cac tuong:

- Doc anh tho sinh tren nen khoa (magenta #FF00FF hoac green #00FF00) tu
  tools/evo-raw/<id>_s<star>.png, tach nen bang color-distance keying +
  despill + got alpha 1px (port nguyen tuat toan process-art.mjs cua repo RN).
- Chuan hoa khung giong make-painted-assets.py: trim alpha, than cao 432/512,
  neo day sat mep duoi canvas, can giua ngang, canvas 512x512.
- Ghi ra assets/units/<id>_s<star>.png.

Cach dung:
  python3 tools/make-evo-assets.py gogo 2 magenta
  python3 tools/make-evo-assets.py mimi 3 green
  python3 tools/make-evo-assets.py --batch idkey.txt   # moi dong: <id> <star> <key>
  python3 tools/make-evo-assets.py --sheet gogo mimi   # bang doi chieu 1/2/3 sao
"""
from pathlib import Path
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path.home() / "workspace" / "tft-java-game"
RAW = ROOT / "tools" / "evo-raw"
OUT = ROOT / "assets" / "units"
CANVAS = 512
BODY_H = 432
TRIM_THRESHOLD = 8

KEYS = {
    "magenta": {"K": (255, 0, 255), "dom": (0, 2)},
    "green": {"K": (0, 255, 0), "dom": (1,)},
}


def spill_of(rgb: np.ndarray, key: dict) -> np.ndarray:
    if len(key["dom"]) == 2:
        return np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]
    return rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2])


def key_out(img: Image.Image, key_name: str) -> Image.Image:
    key = KEYS[key_name]
    K = np.array(key["K"], dtype=np.float32)
    # Giu kich thuoc giong pipeline goc: fit trong 900x900
    img = img.convert("RGB")
    img.thumbnail((900, 900), Image.LANCZOS)
    rgb = np.asarray(img).astype(np.float32)
    H, W = rgb.shape[:2]

    # Pass 1: alpha theo khoang cach mau
    dist = np.sqrt(((rgb - K) ** 2).sum(axis=2))
    a = np.clip((dist - 90) / 120.0, 0, 1)
    alpha = np.round(a * 255).astype(np.uint8)
    alpha[alpha < 10] = 0
    alpha[alpha > 246] = 255
    # Pass 1b: diet alpha thap
    alpha[(alpha > 0) & (alpha < 90)] = 0
    # Pass 2: got alpha 1px (min-filter 3x3, ngoai bien = 0)
    alpha = ndimage.minimum_filter(alpha, size=3, mode="constant", cval=0)
    # Pass 3: despill tru
    rgb = rgb.copy()
    spill = spill_of(rgb, key)
    a8 = alpha.astype(np.float32)
    edge = (alpha > 0) & (alpha < 255)
    t = np.maximum(0, spill - (a8 / 255.0) * 48)
    for c in key["dom"]:
        rgb[..., c] = np.where(edge, np.maximum(0, rgb[..., c] - t), rgb[..., c])
    solid = alpha == 255
    cut = np.where(spill > 100, (spill - 100) * 0.7, 0)
    for c in key["dom"]:
        rgb[..., c] = np.where(solid, np.maximum(0, rgb[..., c] - cut), rgb[..., c])
    # Pass 4: xoa dom alpha lo lung (component nho)
    lab, n = ndimage.label(alpha > 0)
    if n > 1:
        sizes = ndimage.sum(alpha > 0, lab, range(1, n + 1))
        best = sizes.max()
        min_keep = max(24, int(best * 0.0008))
        kill = np.zeros(n + 1, dtype=bool)
        for i, s in enumerate(sizes, start=1):
            if s < min_keep:
                kill[i] = True
        alpha[kill[lab]] = 0
    # Pass 5: dem mau bien ~3px, vung trong suot con lai RGB=0
    filled = alpha > 0
    out_rgb = rgb.copy()
    for _ in range(3):
        m = filled
        acc = np.zeros_like(out_rgb)
        cnt = np.zeros((H, W), dtype=np.float32)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                sh = np.roll(np.roll(out_rgb, dy, axis=0), dx, axis=1)
                shf = np.roll(np.roll(m, dy, axis=0), dx, axis=1)
                # cat phan wrap-around o bien
                if dy == -1: sh[H - 1, :] = 0; shf[H - 1, :] = False
                if dy == 1: sh[0, :] = 0; shf[0, :] = False
                if dx == -1: sh[:, W - 1] = 0; shf[:, W - 1] = False
                if dx == 1: sh[:, 0] = 0; shf[:, 0] = False
                acc += np.where(shf[..., None], sh, 0)
                cnt += shf
        newfill = (~filled) & (cnt > 0)
        out_rgb[newfill] = (acc[newfill] / cnt[newfill][..., None]).round()
        filled = filled | newfill
    out_rgb[~filled] = 0
    rgba = np.concatenate([np.clip(out_rgb, 0, 255), alpha[..., None].astype(np.float32)], axis=2)
    return Image.fromarray(rgba.astype(np.uint8), "RGBA")


def resize_premultiplied(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    arr = np.asarray(img).astype(np.float32)
    alpha = arr[..., 3:4] / 255.0
    premult = np.concatenate([arr[..., :3] * alpha, arr[..., 3:4]], axis=2)
    resized = Image.fromarray(np.clip(premult, 0, 255).astype(np.uint8), "RGBA").resize(size, Image.LANCZOS)
    out = np.asarray(resized).astype(np.float32)
    a = out[..., 3:4] / 255.0
    rgb = np.where(a > 0, out[..., :3] / np.maximum(a, 1e-6), 0)
    return Image.fromarray(np.concatenate([np.clip(rgb, 0, 255), out[..., 3:4]], axis=2).astype(np.uint8), "RGBA")


def normalize(img: Image.Image) -> Image.Image:
    alpha = np.asarray(img.split()[3])
    ys, xs = np.where(alpha > TRIM_THRESHOLD)
    if len(xs) == 0:
        raise ValueError("alpha rong sau khi tach nen")
    body = img.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    bw, bh = body.size
    scale = BODY_H / bh
    if bw * scale > CANVAS:
        scale = CANVAS / bw
    nw, nh = max(1, round(bw * scale)), max(1, round(bh * scale))
    body = resize_premultiplied(body, (nw, nh))
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.paste(body, ((CANVAS - nw) // 2, CANVAS - nh), body)
    return canvas


def process(uid: str, star: int, key: str) -> str:
    src = RAW / f"{uid}_s{star}.png"
    if not src.exists():
        return f"{uid}_s{star}: THIEU file tho {src}"
    img = Image.open(src)
    keyed = key_out(img, key)
    norm = normalize(keyed)
    dst = OUT / f"{uid}_s{star}.png"
    norm.save(dst, optimize=True)
    cov = float((np.asarray(norm.split()[3]) > 8).mean())
    return f"{uid}_s{star}: OK (key={key}, phu alpha {cov:.1%}) -> {dst.name}"


def sheet(ids: list[str]) -> Path:
    """Bang doi chieu: moi tuong 1 hang, 3 cot 1/2/3 sao, nen co xanh + dam xam."""
    cell = 340
    rows = []
    for uid in ids:
        row = []
        for suffix in ("", "_s2", "_s3"):
            p = OUT / f"{uid}{suffix}.png"
            im = Image.open(p).convert("RGBA").resize((cell, cell), Image.LANCZOS)
            bg = Image.new("RGBA", (cell, cell), (88, 148, 62, 255))
            bg.alpha_composite(im)
            row.append(bg)
        rows.append(row)
    W = cell * 3
    H = cell * len(ids)
    out = Image.new("RGBA", (W, H), (40, 40, 48, 255))
    for r, row in enumerate(rows):
        for c, im in enumerate(row):
            out.alpha_composite(im, (c * cell, r * cell))
    dst = ROOT / "tools" / ("evo-sheet-" + "-".join(ids) + ".png")
    out.convert("RGB").save(dst, optimize=True)
    return dst


def main() -> None:
    args = sys.argv[1:]
    if args and args[0] == "--sheet":
        print(sheet(args[1:]))
        return
    if args and args[0] == "--batch":
        lines = Path(args[1]).read_text().strip().splitlines()
        jobs = [ln.split() for ln in lines if ln.strip()]
    else:
        jobs = [args]
    for uid, star, key in jobs:
        try:
            print(process(uid, int(star), key))
        except Exception as e:
            print(f"{uid}_s{star}: LOI {e}")


if __name__ == "__main__":
    main()
