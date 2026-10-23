#!/usr/bin/env python3
# Sinh texture giao dien "ve" cho ban Java (LibGDX) bang PIL.
# Xuat PNG vao assets/ui/ — chay lai: python3 tools/make_ui.py
# Tong mau bam tranh lobby + lung the: tim sam + vang kim; nut chinh hong ngoc.
import math, os, random
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "ui")
os.makedirs(OUT, exist_ok=True)
random.seed(42)

GOLD = (245, 197, 66, 255)
GOLD_LIGHT = (255, 224, 138, 255)
GOLD_DARK = (166, 110, 20, 255)

def lerp(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(len(c1)))

def vgrad(size, top, bottom):
    w, h = size
    img = Image.new("RGBA", size)
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        c = lerp(top, bottom, t)
        for x in range(w):
            px[x, y] = c
    return img

def add_noise(img, amount=7, alpha=None):
    w, h = img.size
    noise = Image.effect_noise((w, h), 18).convert("L")
    px, nx = img.load(), noise.load()
    for y in range(h):
        for x in range(w):
            d = (nx[x, y] - 128) * amount // 128
            r, g, b, a = px[x, y]
            px[x, y] = (max(0, min(255, r + d)), max(0, min(255, g + d)), max(0, min(255, b + d)), a if alpha is None else alpha)
    return img

def gold_frame(draw, box, w_outer=3, corner_diamond=True):
    x0, y0, x1, y1 = box
    draw.rectangle(box, outline=GOLD_DARK, width=w_outer + 2)
    draw.rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], outline=GOLD, width=w_outer - 1)
    draw.rectangle([x0 + w_outer + 3, y0 + w_outer + 3, x1 - w_outer - 3, y1 - w_outer - 3],
                   outline=(255, 224, 138, 120), width=1)
    if corner_diamond:
        for cx, cy in [(x0 + 3, y0 + 3), (x1 - 3, y0 + 3), (x0 + 3, y1 - 3), (x1 - 3, y1 - 3)]:
            r = 5
            draw.polygon([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], fill=GOLD_LIGHT, outline=GOLD_DARK)

def make_panel(name, top, bottom, fill_alpha):
    S = 160
    img = vgrad((S, S), top + (fill_alpha,), bottom + (fill_alpha,))
    img = add_noise(img, 6)
    d = ImageDraw.Draw(img)
    gold_frame(d, [0, 0, S - 1, S - 1], 3)
    img.save(os.path.join(OUT, name))
    print("panel", name)

def make_plaque():
    W, H = 200, 56
    img = vgrad((W, H), (38, 27, 66, 242), (22, 15, 40, 242))
    img = add_noise(img, 5)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W - 1, H - 1], outline=GOLD_DARK, width=4)
    d.rectangle([2, 2, W - 3, H - 3], outline=GOLD, width=2)
    d.line([6, 8, W - 7, 8], fill=(255, 224, 138, 110), width=1)
    d.line([6, H - 9, W - 7, H - 9], fill=(255, 224, 138, 110), width=1)
    for cx in (12, W - 13):
        d.ellipse([cx - 3, H // 2 - 3, cx + 3, H // 2 + 3], fill=GOLD_LIGHT, outline=GOLD_DARK)
    img.save(os.path.join(OUT, "plaque.png"))
    print("plaque")

def shade(c, f):
    return tuple(max(0, min(255, int(v * f))) for v in c)

def make_button(name, top, bottom, border=GOLD):
    W, H = 120, 48
    def one(suffix, tf, bf, gloss_a):
        img = vgrad((W, H), shade(top, tf) + (255,), shade(bottom, bf) + (255,))
        img = add_noise(img, 5)
        d = ImageDraw.Draw(img, "RGBA")
        # gloss nua tren
        gloss = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gd = ImageDraw.Draw(gloss)
        gd.ellipse([-20, -H - 6, W + 20, H - 8], fill=(255, 255, 255, gloss_a))
        img.alpha_composite(gloss)
        d = ImageDraw.Draw(img)
        b = border if suffix != "down" else shade(border, 0.8) + (255,)
        draw_c = (b[0], b[1], b[2], 255)
        d.rectangle([0, 0, W - 1, H - 1], outline=shade(draw_c, 0.55), width=4)
        d.rectangle([2, 2, W - 3, H - 3], outline=draw_c, width=2)
        d.line([5, 5, W - 6, 5], fill=(255, 255, 255, 90), width=1)
        img.save(os.path.join(OUT, f"{name}{suffix}.png"))
    one("", 1.0, 1.0, 46)
    one("_over", 1.18, 1.14, 66)
    one("_down", 0.82, 0.8, 22)
    print("button", name)

def make_cardfront():
    W, H = 120, 160
    img = vgrad((W, H), (43, 30, 74, 255), (28, 19, 50, 255))
    d = ImageDraw.Draw(img)
    gold_frame(d, [0, 0, W - 1, H - 1], 3)
    # vung parchment giua (chu toi ve len tren)
    parch = vgrad((W - 28, H - 28), (240, 230, 203, 255), (224, 208, 172, 255))
    parch = add_noise(parch, 4)
    img.paste(parch, (14, 14))
    d = ImageDraw.Draw(img)
    d.rectangle([13, 13, W - 14, H - 14], outline=GOLD_DARK, width=2)
    img.save(os.path.join(OUT, "cardfront.png"))
    print("cardfront")

COST_COLORS = [(184, 196, 204), (77, 163, 255), (176, 122, 255), (245, 197, 66), (255, 122, 69)]
def make_shopcards():
    W, H = 148, 78
    for i, col in enumerate(COST_COLORS):
        img = vgrad((W, H), (26, 20, 46, 235), (15, 11, 28, 235))
        img = add_noise(img, 5)
        d = ImageDraw.Draw(img)
        d.rectangle([0, 0, W - 1, H - 1], outline=shade(col, 0.55) + (255,), width=5)
        d.rectangle([2, 2, W - 3, H - 3], outline=col + (255,), width=2)
        # vien gem goc tren trai
        cx, cy, r = 12, 12, 6
        d.polygon([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], fill=col + (255,), outline=(255, 255, 255, 200))
        img.save(os.path.join(OUT, f"shopcard{i + 1}.png"))
    print("shopcards")

def make_benchslot():
    S = 52
    img = vgrad((S, S), (24, 19, 44, 235), (14, 11, 28, 235))
    d = ImageDraw.Draw(img, "RGBA")
    d.rectangle([0, 0, S - 1, S - 1], outline=(104, 88, 160, 255), width=2)
    d.rectangle([3, 3, S - 4, S - 4], outline=(0, 0, 0, 90), width=2)
    d.line([4, S - 5, S - 5, S - 5], fill=(255, 255, 255, 36), width=2)
    img.save(os.path.join(OUT, "benchslot.png"))
    print("benchslot")

def make_avatar():
    S = 48
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    base = vgrad((S, S), (64, 48, 110, 255), (34, 24, 64, 255))
    mask = Image.new("L", (S, S), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([2, 2, S - 3, S - 3], fill=255)
    img.paste(base, (0, 0), mask)
    d = ImageDraw.Draw(img)
    d.ellipse([2, 2, S - 3, S - 3], outline=GOLD_DARK, width=5)
    d.ellipse([4, 4, S - 5, S - 5], outline=GOLD, width=2)
    d.ellipse([9, 7, 22, 16], fill=(255, 255, 255, 46))
    img.save(os.path.join(OUT, "avatar.png"))
    print("avatar")

# ---------- Icons pixel (ve tren luoi 24, phong 2x = 48) ----------
def icon_canvas():
    return Image.new("RGBA", (24, 24), (0, 0, 0, 0))

def save_icon(img, name):
    img.resize((48, 48), Image.NEAREST).save(os.path.join(OUT, name))
    print("icon", name)

def draw_star(d, cx, cy, r, fill, outline=None):
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.45
        pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
    d.polygon(pts, fill=fill, outline=outline)

def make_icons():
    # coin
    im = icon_canvas(); d = ImageDraw.Draw(im)
    d.ellipse([3, 3, 20, 20], fill=(245, 197, 66, 255), outline=(166, 110, 20, 255), width=2)
    d.ellipse([6, 6, 17, 17], outline=(255, 224, 138, 255), width=1)
    d.rectangle([10, 8, 13, 15], fill=(166, 110, 20, 255))
    d.point((6, 5), fill=(255, 255, 255, 255))
    save_icon(im, "coin.png")
    # heart (LP)
    im = icon_canvas(); d = ImageDraw.Draw(im)
    d.polygon([(12, 20), (4, 12), (3, 7), (5, 4), (9, 4), (12, 7), (15, 4), (19, 4), (21, 7), (20, 12)], fill=(239, 71, 111, 255), outline=(150, 30, 60, 255))
    d.rectangle([6, 6, 8, 8], fill=(255, 170, 190, 255))
    save_icon(im, "heart.png")
    # star
    im = icon_canvas(); d = ImageDraw.Draw(im)
    draw_star(d, 12, 12, 9, (255, 209, 26, 255), (166, 110, 20, 255))
    save_icon(im, "star.png")
    # sword (cheo)
    im = icon_canvas(); d = ImageDraw.Draw(im)
    d.polygon([(14, 2), (17, 3), (9, 13), (7, 11)], fill=(216, 226, 240, 255), outline=(120, 134, 156, 255))
    d.polygon([(6, 12), (9, 15), (7, 17), (4, 14)], fill=(245, 197, 66, 255))
    d.line([4, 16, 7, 19], fill=(120, 72, 30, 255), width=2)
    d.rectangle([3, 19, 5, 21], fill=(80, 48, 18, 255))
    save_icon(im, "sword.png")
    # shield
    im = icon_canvas(); d = ImageDraw.Draw(im)
    d.polygon([(12, 21), (5, 17), (4, 5), (12, 3), (20, 5), (19, 17)], fill=(90, 140, 220, 255), outline=(40, 70, 130, 255))
    d.polygon([(12, 18), (8, 15), (7, 8), (12, 6), (17, 8), (16, 15)], fill=(140, 185, 245, 255))
    d.rectangle([11, 8, 13, 15], fill=(245, 197, 66, 255))
    save_icon(im, "shield.png")
    # trophy
    im = icon_canvas(); d = ImageDraw.Draw(im)
    d.rectangle([7, 4, 17, 12], fill=(245, 197, 66, 255), outline=(166, 110, 20, 255))
    d.polygon([(7, 5), (3, 5), (4, 10), (8, 11)], fill=(255, 224, 138, 255), outline=(166, 110, 20, 255))
    d.polygon([(17, 5), (21, 5), (20, 10), (16, 11)], fill=(255, 224, 138, 255), outline=(166, 110, 20, 255))
    d.rectangle([11, 12, 13, 16], fill=(166, 110, 20, 255))
    d.rectangle([8, 16, 16, 18], fill=(245, 197, 66, 255), outline=(166, 110, 20, 255))
    d.rectangle([6, 19, 18, 21], fill=(120, 72, 30, 255))
    save_icon(im, "trophy.png")
    # book
    im = icon_canvas(); d = ImageDraw.Draw(im)
    d.polygon([(12, 6), (6, 4), (4, 5), (4, 18), (6, 17), (12, 19)], fill=(240, 230, 203, 255), outline=(120, 72, 30, 255))
    d.polygon([(12, 6), (18, 4), (20, 5), (20, 18), (18, 17), (12, 19)], fill=(224, 208, 172, 255), outline=(120, 72, 30, 255))
    d.line([12, 6, 12, 19], fill=(120, 72, 30, 255), width=1)
    for yy in (9, 12, 15):
        d.line([6, yy, 10, yy + 1], fill=(150, 130, 100, 255))
        d.line([14, yy + 1, 18, yy], fill=(150, 130, 100, 255))
    d.rectangle([3, 3, 21, 20], outline=None)
    save_icon(im, "book.png")
    # flag (chien dich)
    im = icon_canvas(); d = ImageDraw.Draw(im)
    d.rectangle([5, 3, 6, 20], fill=(120, 72, 30, 255))
    d.polygon([(7, 4), (19, 7), (7, 11)], fill=(239, 71, 111, 255), outline=(150, 30, 60, 255))
    d.rectangle([3, 20, 9, 21], fill=(80, 48, 18, 255))
    save_icon(im, "flag.png")
    # waves (song)
    im = icon_canvas(); d = ImageDraw.Draw(im)
    for i, yy in enumerate((6, 12, 18)):
        pts = []
        for x in range(3, 22):
            pts.append((x, yy + (2 if (x // 3 + i) % 2 == 0 else -1)))
        d.line(pts, fill=(77, 171, 255, 255), width=2)
    save_icon(im, "waves.png")

make_panel("panel.png", (43, 30, 74), (24, 16, 42), 226)
make_panel("panel_light.png", (62, 46, 102), (38, 27, 66), 240)
make_plaque()
make_button("btn", (86, 62, 148), (50, 36, 96))
make_button("btn_primary", (232, 84, 141), (168, 32, 84))
make_button("btn_green", (66, 160, 80), (34, 104, 46))
make_button("btn_red", (198, 62, 58), (138, 34, 32))
make_cardfront()
make_shopcards()
make_benchslot()
make_avatar()
make_icons()
print("DONE ->", OUT)
