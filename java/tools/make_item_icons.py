#!/usr/bin/env python3
"""Chuan hoa 18 icon trang bi tu ban sinh tho (tools/item-icons-raw/<id>.png, 1600x1600)
thanh asset game assets/items/<id>.png (256x256):

- Sua goc trang: vai ban sinh bi tran nen trang o cac goc ngoai phien da quy.
  Vung goc 150px: pixel nao sang (lum > 150) thi thay bang mau phien keo dai tu
  phia trong (clamp toa do ve vung [150, W-150]) -> phien da lien mach toi ria.
- Resize LANCZOS ve 256x256 (hien thi trong game 44-76px nen 256 la du net).
- Xuat ban .b64 vao tools/item-icons-b64/ phuc vu day len GitHub (quy uoc repo:
  file nhi phan luu dang base64 text, giai ma bang tools/restore-binaries.sh).
"""
import base64
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "tools" / "item-icons-raw"
OUT = ROOT / "assets" / "items"
B64 = ROOT / "tools" / "item-icons-b64"

IDS = [
    "tpkiem", "tpgay", "tpcung", "tpgang", "tpgiap", "tptim",
    "kiem", "giap", "nuocmat", "gay", "cung", "aochoang",
    "gang", "tim", "vuot", "sachcu", "khienvang", "giay",
]
CORNER = 150  # canh vung goc duoc kiem tra tran nen trang
# Mau goc ngoai phien cua cac icon chuan trong bo (navy toi ~ (8..20, 11..16, 55..70)):
# vung tran trang nam NGOAI vong cung vien vang nen fill bang mau nay la khop bo.
CORNER_FILL = (13, 15, 62)


def fix_corners(img: Image.Image) -> Image.Image:
    arr = np.asarray(img.convert("RGB")).astype(np.int32)
    h, w, _ = arr.shape
    lum = arr.sum(axis=2) / 3.0
    ys, xs = np.mgrid[0:h, 0:w]
    in_corner = ((xs < CORNER) | (xs >= w - CORNER)) & ((ys < CORNER) | (ys >= h - CORNER))
    spill = in_corner & (lum > 150)
    if spill.any():
        arr[spill] = CORNER_FILL
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    B64.mkdir(parents=True, exist_ok=True)
    for iid in IDS:
        src = RAW / f"{iid}.png"
        if not src.is_file():
            raise FileNotFoundError(f"Thieu icon tho: {src}")
        img = Image.open(src).convert("RGB")
        if img.size[0] != img.size[1]:
            s = min(img.size)
            img = img.crop(((img.size[0] - s) // 2, (img.size[1] - s) // 2,
                            (img.size[0] + s) // 2, (img.size[1] + s) // 2))
        img = fix_corners(img)
        img = img.resize((256, 256), Image.LANCZOS)
        dst = OUT / f"{iid}.png"
        img.save(dst)
        (B64 / f"{iid}.png.b64").write_text(base64.b64encode(dst.read_bytes()).decode())
        print(f"OK {iid}: {dst.stat().st_size // 1024}KB")
    print(f"DONE {len(IDS)} icons -> {OUT}")


if __name__ == "__main__":
    main()
