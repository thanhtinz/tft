#!/usr/bin/env python3
# Sinh texture MANG DAT o cho (bench) phong painted: mang dat nen nau mem mep, fringe co o
# ria tren, soi nho + vet dam — hoa vao mat san chu KHONG phai o UI khung hop.
# 3 bien the (seed khac nhau) de 9 o khong giong het nhau; MatchScreen luan phien + lat ngang.
# Canvas 384x192 (ti le 2:1 — ve trong game 96x48): o bench nay DUNG bang o ban 84x70 va
# sprite DUNG 100px nhu tren ban, nen mang dat phai RONG va BET hon ban 256x192 cu (ve 64x48)
# de bao quanh vung chan (chan o cy-50, bong o cy-45 cua o bench).
# Chay: python3 tools/make_bench_patches.py
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.expanduser("~/workspace/tft-java-game/assets/ui")
W, H = 384, 192
CX, CY = 192, 104  # tam mang dat (lech xuong duoi mot chut cho goc nhin tren-xuong)

DIRT_BASE = (131, 98, 62, 255)
DIRT_DARKS = [(94, 66, 38), (78, 54, 30), (62, 42, 24)]
DIRT_LIGHTS = [(143, 109, 69), (160, 124, 79), (134, 100, 60)]
RIM_SHADE = (52, 36, 18)
GRASSES = [(105, 168, 68), (127, 188, 82), (85, 133, 58), (147, 204, 103)]
PEBBLE = (154, 145, 127)
PEBBLE_HI = (201, 192, 170)


def blob_mask(rng):
    """Mask mang dat: ellipse bien dang bang nhieu goc (sin nhieu tan so) + lam mem mep."""
    steps = 180
    p1, p2, p3 = rng.uniform(0, 6.28), rng.uniform(0, 6.28), rng.uniform(0, 6.28)
    a1, a2 = rng.uniform(0.04, 0.07), rng.uniform(0.02, 0.045)
    pts = []
    for i in range(steps):
        t = 2 * math.pi * i / steps
        m = 1 + a1 * math.sin(3 * t + p1) + a2 * math.sin(7 * t + p2) + 0.02 * math.sin(11 * t + p3)
        pts.append((CX + 176 * m * math.cos(t), CY + 68 * m * math.sin(t)))
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).polygon(pts, fill=255)
    return mask.filter(ImageFilter.GaussianBlur(6))


def make_patch(seed):
    rng = random.Random(seed)
    mask = blob_mask(rng)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    # --- Lop dat nen + cac vet loang nhieu tong ---
    dirt = Image.new("RGBA", (W, H), DIRT_BASE)
    d = ImageDraw.Draw(dirt, "RGBA")
    for _ in range(130):
        x, y = rng.uniform(24, W - 24), rng.uniform(34, H - 30)
        rx, ry = rng.uniform(10, 52), rng.uniform(5, 20)
        col = rng.choice(DIRT_DARKS + DIRT_LIGHTS)
        d.ellipse([x - rx, y - ry, x + rx, y + ry], fill=col + (rng.randint(22, 60),))
    # Vet dam ngang (dat bi nen theo chieu ngang o)
    for _ in range(5):
        y = rng.uniform(CY - 40, CY + 44)
        x = rng.uniform(40, 150)
        ln = rng.uniform(80, 220)
        d.line([x, y, x + ln, y + rng.uniform(-4, 4)], fill=DIRT_DARKS[1] + (26,), width=rng.randint(3, 6))
    # Cham speckles sang/toi
    for _ in range(800):
        x, y = rng.uniform(22, W - 22), rng.uniform(32, H - 26)
        r = rng.uniform(0.8, 2.4)
        col = rng.choice(DIRT_DARKS + DIRT_LIGHTS)
        d.ellipse([x - r, y - r, x + r, y + r], fill=col + (rng.randint(50, 110),))
    dirt.putalpha(mask)
    img.alpha_composite(dirt)

    d = ImageDraw.Draw(img, "RGBA")
    # --- Vien toi mem o ria (rim shading) de mang dat "ngoi" xuong co ---
    from PIL import ImageChops
    ring = ImageChops.subtract(mask, mask.filter(ImageFilter.MinFilter(41))).filter(ImageFilter.GaussianBlur(6))
    shade = Image.new("RGBA", (W, H), RIM_SHADE + (0,))
    shade.putalpha(ring.point(lambda v: int(v * 0.42)))
    img.alpha_composite(shade)
    d = ImageDraw.Draw(img, "RGBA")

    # --- Soi nho gan ria ---
    for _ in range(6):
        t = rng.uniform(0, 6.28)
        x = CX + 156 * math.cos(t) + rng.uniform(-8, 8)
        y = CY + 52 * math.sin(t) + rng.uniform(-6, 6)
        r = rng.uniform(3.5, 6.5)
        d.ellipse([x - r, y - r * 0.7, x + r, y + r * 0.7], fill=PEBBLE + (235,))
        d.ellipse([x - r * 0.5, y - r * 0.55, x + r * 0.15, y - r * 0.1], fill=PEBBLE_HI + (200,))

    # --- Fringe co o ria tren (phia xa) + rai rac hai ben: net co ngan moc vuot qua mep dat ---
    for _ in range(80):
        t = rng.uniform(math.pi * 1.08, math.pi * 1.92)  # cung phia tren (y nho)
        bx = CX + 170 * math.cos(t)
        by = CY + 64 * math.sin(t)
        ln = rng.uniform(7, 17)
        lean = rng.uniform(-5, 5)
        col = rng.choice(GRASSES)
        d.line([bx, by, bx + lean, by - ln], fill=col + (rng.randint(170, 255),), width=rng.randint(3, 4))
    for _ in range(16):  # hai ben canh
        side = rng.choice([-1, 1])
        bx = CX + side * rng.uniform(162, 176)
        by = CY + rng.uniform(-26, 30)
        ln = rng.uniform(6, 12)
        col = rng.choice(GRASSES)
        d.line([bx, by, bx + side * ln * 0.5, by - ln * 0.7], fill=col + (rng.randint(150, 230),), width=3)
    # Vai cum co nho moc tren mat dat gan ria
    for _ in range(5):
        bx = CX + rng.uniform(-150, 150)
        by = CY + rng.choice([-1, 1]) * rng.uniform(34, 52)
        for k in range(3):
            col = rng.choice(GRASSES)
            d.line([bx, by, bx + (k - 1) * 4 + rng.uniform(-2, 2), by - rng.uniform(7, 12)],
                   fill=col + (230,), width=3)
    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    for i, seed in enumerate((11, 47, 83), start=1):
        p = os.path.join(OUT, f"benchpatch{i}.png")
        make_patch(seed).save(p)
        print("wrote", p)


if __name__ == "__main__":
    main()
