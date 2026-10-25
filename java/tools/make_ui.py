#!/usr/bin/env python3
# Sinh texture giao dien "ve" cho ban Java (LibGDX) bang PIL.
# Xuat PNG vao assets/ui/ — chay lai: python3 tools/make_ui.py
#
# Ban lam lai (theo phan hoi "nut rat tho"):
# - Moi texture ve noi bo o do phan giai 4x roi thu nho LANCZOS -> canh min, khong rang cua.
# - Nut: BO GOC LON (ban kinh ~11px o co cuoi 120x48), ngoai vung bo goc TRONG SUOT,
#   gradient doc giau (tren sang, duoi dam), dai gloss mem nua tren, bevel hai mat
#   (highlight mep trong tren + duong toi mep trong duoi), vien vang HAI LOP chay theo
#   duong bo goc + vien kim cuong nho o 4 goc tren vien.
# - Trang thai: thuong / _over (sang hon, gloss manh) / _down (toi hon, gloss yeu,
#   them bong trong mep tren -> cam giac lun). Disabled do code tint xam, khong can file.
# - Cac ho nut: btn (tim), btn_primary (hong ngoc), btn_gold (vang/nau vang),
#   btn_green, btn_red. Moi ho 3 file, kich thuoc cuoi BAT BUOC 120x48 (nine-patch code).
# - Icon: ve o canvas 96x96 (render 4x = 384 roi thu nho), net min, net day, mau ruc,
#   vien dam. Them 3 icon moi: trash, chart, speed.
import math, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "ui")
os.makedirs(OUT, exist_ok=True)
random.seed(42)
np.random.seed(42)

SS = 4  # supersample

GOLD = (245, 197, 66, 255)
GOLD_LIGHT = (255, 224, 138, 255)
GOLD_DARK = (166, 110, 20, 255)
GOLD_DEEP = (122, 78, 12, 255)


def shade(c, f):
    return tuple(max(0, min(255, int(v * f))) for v in c[:3]) + ((c[3],) if len(c) > 3 else ())


def vgrad(size, stops):
    """Gradient doc nhieu moc mau. stops: [(pos0..1, (r,g,b,a)), ...]"""
    w, h = size
    ys = np.linspace(0.0, 1.0, h)
    arr = np.zeros((h, w, 4), dtype=np.float32)
    pos = [s[0] for s in stops]
    for ch in range(4):
        vals = [s[1][ch] for s in stops]
        arr[:, :, ch] = np.interp(ys, pos, vals)[:, None]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def add_noise(img, amount=5):
    arr = np.asarray(img).astype(np.int16)
    noise = np.random.normal(0, amount, arr.shape[:2])[..., None]
    arr[..., :3] = np.clip(arr[..., :3] + noise, 0, 255)
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def rounded_mask(size, radius, inset=0):
    w, h = size
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([inset, inset, w - 1 - inset, h - 1 - inset], radius=max(1, radius - inset), fill=255)
    return m


def clip(img, mask):
    out = img.copy()
    a = np.minimum(np.asarray(out.split()[3]).astype(np.int16), np.asarray(mask).astype(np.int16))
    out.putalpha(Image.fromarray(a.astype(np.uint8)))
    return out


def framed_shape(size, radius, stops, noise=4, gloss_a=0, gloss_h=0.52,
                 border_dark=GOLD_DEEP, border_mid=GOLD, border_light=GOLD_LIGHT,
                 inner_shadow_top=0, bevel=True):
    """Nen hinh chu nhat bo goc: gradient + gloss + bevel + vien 2 lop theo duong bo goc.
    Ve o co SS roi tra ve anh SS (chua thu nho)."""
    W, H = size
    img = vgrad(size, stops)
    if noise:
        img = add_noise(img, noise)
    mask = rounded_mask(size, radius)
    img = clip(img, mask)
    # Gloss: dai bong mem nua tren (ellipse mo, cat theo hinh bo goc lo vao 4px)
    if gloss_a > 0:
        ov = Image.new("RGBA", size, (0, 0, 0, 0))
        od = ImageDraw.Draw(ov)
        od.ellipse([-W * 0.18, -H * 1.05, W * 1.18, H * gloss_h * 2 - H * 0.55],
                   fill=(255, 255, 255, gloss_a))
        ov = ov.filter(ImageFilter.GaussianBlur(SS * 3))
        img.alpha_composite(clip(ov, rounded_mask(size, radius, inset=SS * 4)))
    # Bong trong mep tren (trang thai _down): dai den mo dan o 30% tren
    if inner_shadow_top > 0:
        sh = np.zeros((H, W, 4), dtype=np.uint8)
        t = np.clip(1.0 - np.linspace(0, 1, H) / 0.32, 0, 1) ** 1.5 * inner_shadow_top
        sh[..., 3] = t[:, None].astype(np.uint8)
        img.alpha_composite(clip(Image.fromarray(sh, "RGBA"), mask))
    d = ImageDraw.Draw(img, "RGBA")
    # Bevel hai mat: highlight mep trong phia tren, duong toi mep trong phia duoi
    if bevel:
        inset_b = SS * 5
        hl = Image.new("RGBA", size, (0, 0, 0, 0))
        hd = ImageDraw.Draw(hl)
        hd.rounded_rectangle([inset_b, inset_b, W - 1 - inset_b, H - 1 - inset_b],
                             radius=max(1, radius - inset_b), outline=(255, 255, 255, 105), width=SS)
        hl_top = hl.crop((0, 0, W, int(H * 0.5)))
        img.alpha_composite(hl_top, (0, 0))
        dk = Image.new("RGBA", size, (0, 0, 0, 0))
        dd = ImageDraw.Draw(dk)
        dd.rounded_rectangle([inset_b, inset_b, W - 1 - inset_b, H - 1 - inset_b],
                             radius=max(1, radius - inset_b), outline=(0, 0, 0, 120), width=SS)
        dk_bot = dk.crop((0, int(H * 0.45), W, H))
        img.alpha_composite(dk_bot, (0, int(H * 0.45)))
        d = ImageDraw.Draw(img, "RGBA")
    # Vien vang hai lop chay theo duong bo goc: ngoai dam, trong sang
    d.rounded_rectangle([SS // 2, SS // 2, W - 1 - SS // 2, H - 1 - SS // 2],
                        radius=radius, outline=border_dark + (255,) if len(border_dark) == 3 else border_dark,
                        width=SS * 2)
    off = SS * 2
    d.rounded_rectangle([off, off, W - 1 - off, H - 1 - off],
                        radius=max(1, radius - off), outline=border_mid, width=SS + SS // 2)
    off2 = off + SS + SS // 2
    d.rounded_rectangle([off2, off2, W - 1 - off2, H - 1 - off2],
                        radius=max(1, radius - off2), outline=shade(border_light, 1.0)[:3] + (170,), width=SS // 2 + 1)
    return img


def corner_diamonds(img, radius_final_pos=10, r=3.4, fill=GOLD_LIGHT, outline=GOLD_DARK):
    """Vien kim cuong nho o 4 goc, nam tren vien (toa do theo co cuoi, nhan SS)."""
    W, H = img.size
    d = ImageDraw.Draw(img)
    p = radius_final_pos * SS
    rr = r * SS
    for cx, cy in [(p, p), (W - p, p), (p, H - p), (W - p, H - p)]:
        d.polygon([(cx, cy - rr), (cx + rr, cy), (cx, cy + rr), (cx - rr, cy)],
                  fill=fill, outline=outline, width=SS)
        d.point((cx, cy), fill=(255, 255, 255, 255))
    return img


def finish(img, final_size, name):
    img.resize(final_size, Image.LANCZOS).save(os.path.join(OUT, name), optimize=True)
    print(name, final_size)


# ---------------- Panels / plaque / cards ----------------

def make_panel(name, top, bottom, fill_alpha):
    S = 160
    size = (S * SS, S * SS)
    stops = [(0.0, top + (fill_alpha,)), (0.55, tuple((top[i] + bottom[i]) // 2 for i in range(3)) + (fill_alpha,)),
             (1.0, bottom + (fill_alpha,))]
    img = framed_shape(size, 14 * SS, stops, noise=4, gloss_a=14, bevel=True)
    finish(img, (S, S), name)


def make_plaque():
    W, H = 200, 56
    size = (W * SS, H * SS)
    stops = [(0.0, (52, 38, 88, 242)), (0.5, (38, 27, 66, 242)), (1.0, (22, 15, 40, 242))]
    img = framed_shape(size, 12 * SS, stops, noise=4, gloss_a=26, bevel=True)
    d = ImageDraw.Draw(img)
    cy = size[1] // 2
    for cx in (13 * SS, size[0] - 13 * SS):
        d.ellipse([cx - 3 * SS, cy - 3 * SS, cx + 3 * SS, cy + 3 * SS], fill=GOLD_LIGHT, outline=GOLD_DARK, width=SS)
    finish(img, (W, H), "plaque.png")


def make_cardfront():
    W, H = 120, 160
    size = (W * SS, H * SS)
    stops = [(0.0, (58, 42, 96, 255)), (0.55, (43, 30, 74, 255)), (1.0, (28, 19, 50, 255))]
    img = framed_shape(size, 12 * SS, stops, noise=4, gloss_a=20, bevel=True)
    # vung parchment giua bo goc, vien dam rieng
    inset = 14 * SS
    parch = vgrad((size[0] - inset * 2, size[1] - inset * 2),
                  [(0.0, (243, 233, 208, 255)), (1.0, (224, 208, 172, 255))])
    parch = add_noise(parch, 4)
    pmask = rounded_mask(parch.size, 8 * SS)
    img.paste(parch, (inset, inset), pmask)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([inset - SS, inset - SS, size[0] - inset + SS, size[1] - inset + SS],
                        radius=9 * SS, outline=GOLD_DARK, width=SS * 2)
    finish(img, (W, H), "cardfront.png")


COST_COLORS = [(184, 196, 204), (77, 163, 255), (176, 122, 255), (245, 197, 66), (255, 122, 69)]


def make_shopcards():
    W, H = 148, 78
    size = (W * SS, H * SS)
    for i, col in enumerate(COST_COLORS):
        stops = [(0.0, (36, 28, 60, 235)), (1.0, (15, 11, 28, 235))]
        img = framed_shape(size, 10 * SS, stops, noise=4, gloss_a=18,
                           border_dark=shade(col, 0.5), border_mid=col + (255,),
                           border_light=(255, 255, 255, 255))
        d = ImageDraw.Draw(img)
        cx, cy, r = 13 * SS, 13 * SS, 6 * SS
        d.polygon([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)],
                  fill=col + (255,), outline=(255, 255, 255, 220), width=SS)
        finish(img, (W, H), f"shopcard{i + 1}.png")


def make_benchslot():
    S = 52
    size = (S * SS, S * SS)
    stops = [(0.0, (32, 26, 56, 235)), (1.0, (14, 11, 28, 235))]
    img = framed_shape(size, 8 * SS, stops, noise=3, gloss_a=12,
                       border_dark=(52, 42, 92, 255), border_mid=(104, 88, 160, 255),
                       border_light=(150, 138, 200, 255))
    img = corner_diamonds(img, radius_final_pos=8, r=0.1, fill=(0, 0, 0, 0), outline=(0, 0, 0, 0)) \
        if False else img  # benchslot khong de kim cuong, giu sach de dat tuong len
    finish(img, (S, S), "benchslot.png")


def make_avatar():
    # avatar.png GIU NGUYEN ban hien tai theo yeu cau.
    if os.path.exists(os.path.join(OUT, "avatar.png")):
        print("avatar.png: giu nguyen, bo qua")
        return
    S = 48
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    base = vgrad((S, S), [(0.0, (64, 48, 110, 255)), (1.0, (34, 24, 64, 255))])
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).ellipse([2, 2, S - 3, S - 3], fill=255)
    img.paste(base, (0, 0), mask)
    d = ImageDraw.Draw(img)
    d.ellipse([2, 2, S - 3, S - 3], outline=GOLD_DARK, width=5)
    d.ellipse([4, 4, S - 5, S - 5], outline=GOLD, width=2)
    img.save(os.path.join(OUT, "avatar.png"))
    print("avatar.png")


# ---------------- Buttons ----------------

def make_button(name, top, mid, bottom):
    """3 trang thai, co cuoi BAT BUOC 120x48, ve 4x = 480x192, ban kinh goc 11px."""
    W, H = 120, 48
    size = (W * SS, H * SS)
    radius = 11 * SS

    def build(suffix, tf, mf, bf, gloss_a, shadow_top):
        stops = [(0.0, shade(top, tf) + (255,)), (0.52, shade(mid, mf) + (255,)),
                 (1.0, shade(bottom, bf) + (255,))]
        img = framed_shape(size, radius, stops, noise=4, gloss_a=gloss_a,
                           inner_shadow_top=shadow_top, bevel=True)
        img = corner_diamonds(img)
        # Bong do gia lap mem o day (vien toi mem phia duoi trong texture)
        d = ImageDraw.Draw(img, "RGBA")
        bot = Image.new("RGBA", size, (0, 0, 0, 0))
        ImageDraw.Draw(bot).rounded_rectangle(
            [SS, size[1] - SS * 7, size[0] - SS, size[1] - SS], radius=radius // 2,
            fill=(0, 0, 0, 46))
        img.alpha_composite(bot.filter(ImageFilter.GaussianBlur(SS)))
        finish(img, (W, H), f"{name}{suffix}.png")

    build("", 1.06, 1.0, 0.94, 52, 0)          # thuong
    build("_over", 1.22, 1.16, 1.08, 84, 0)    # sang hon + gloss manh
    build("_down", 0.80, 0.76, 0.72, 20, 95)   # toi hon, gloss yeu, bong trong mep tren
    print("button family", name)


# ---------------- Icons (canvas 96, render 384) ----------------

IK = 4  # icon supersample so voi 96


class IDraw:
    def __init__(self):
        self.img = Image.new("RGBA", (96 * IK, 96 * IK), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.img, "RGBA")

    def _s(self, pts):
        return [(x * IK, y * IK) for x, y in pts]

    def _b(self, box):
        return [v * IK for v in box]

    def poly(self, pts, fill, outline=None, w=3):
        self.d.polygon(self._s(pts), fill=fill)
        if outline:
            self.d.line(self._s(pts + [pts[0]]), fill=outline, width=int(w * IK), joint="curve")

    def line(self, pts, fill, w=3):
        self.d.line(self._s(pts), fill=fill, width=int(w * IK), joint="curve")

    def ellipse(self, box, fill, outline=None, w=3):
        self.d.ellipse(self._b(box), fill=fill, outline=outline, width=int(w * IK) if outline else 1)

    def rrect(self, box, r, fill, outline=None, w=3):
        self.d.rounded_rectangle(self._b(box), radius=r * IK, fill=fill, outline=outline,
                                 width=int(w * IK) if outline else 1)

    def arc(self, box, a0, a1, fill, w=4):
        self.d.arc(self._b(box), a0, a1, fill=fill, width=int(w * IK))

    def save(self, name):
        self.img.resize((96, 96), Image.LANCZOS).save(os.path.join(OUT, name), optimize=True)
        print("icon", name, "96x96")


def star_pts(cx, cy, r, ratio=0.48, rot=-math.pi / 2):
    pts = []
    for i in range(10):
        ang = rot + i * math.pi / 5
        rr = r if i % 2 == 0 else r * ratio
        pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
    return pts


def heart_pts(cx, cy, s):
    pts = []
    for i in range(61):
        t = 2 * math.pi * i / 60
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((cx + x * s, cy - y * s))
    return pts


def make_icons():
    DK = (90, 44, 10, 255)  # vien dam chung nau vang
    # coin
    c = IDraw()
    c.ellipse([10, 10, 86, 86], (245, 197, 66, 255), (150, 96, 14, 255), 6)
    c.ellipse([19, 19, 77, 77], None, (255, 224, 138, 255), 4)
    c.rrect([41, 30, 55, 66], 4, (166, 110, 20, 255))
    c.ellipse([22, 20, 36, 34], (255, 255, 255, 190))
    c.save("coin.png")
    # heart
    c = IDraw()
    c.poly(heart_pts(48, 50, 2.35), (120, 18, 44, 255))
    c.poly(heart_pts(48, 49, 2.12), (239, 71, 111, 255))
    c.ellipse([26, 26, 42, 40], (255, 190, 205, 220))
    c.save("heart.png")
    # star
    c = IDraw()
    c.poly(star_pts(48, 49, 40), (166, 110, 20, 255))
    c.poly(star_pts(48, 48, 35), (255, 209, 26, 255))
    c.poly(star_pts(48, 44, 15), (255, 230, 120, 255))
    c.save("star.png")
    # sword
    c = IDraw()
    c.poly([(64, 8), (78, 14), (42, 54), (34, 46)], (226, 234, 246, 255), (110, 124, 148, 255), 4)
    c.line([(70, 18), (44, 48)], (170, 184, 205, 255), 4)
    c.poly([(30, 44), (44, 58), (37, 68), (23, 54)], (245, 197, 66, 255), (150, 96, 14, 255), 3)
    c.line([(28, 60), (16, 74)], (130, 76, 32, 255), 8)
    c.ellipse([6, 68, 20, 82], (245, 197, 66, 255), (150, 96, 14, 255), 3)
    c.save("sword.png")
    # shield
    c = IDraw()

    def shield(cx, cy, s):
        pts = [(cx - 26 * s, cy - 30 * s), (cx + 26 * s, cy - 30 * s)]
        for i in range(1, 9):  # canh phai cong xuong diem day
            t = i / 8
            x = (1 - t) ** 2 * 26 * s + 2 * (1 - t) * t * 26 * s + t ** 2 * 0
            y = (1 - t) ** 2 * -30 * s + 2 * (1 - t) * t * 6 * s + t ** 2 * 34 * s
            pts.append((cx + x, cy + y))
        for i in range(1, 9):  # canh trai nguoc lai
            t = i / 8
            x = (1 - t) ** 2 * 0 + 2 * (1 - t) * t * -26 * s + t ** 2 * -26 * s
            y = (1 - t) ** 2 * 34 * s + 2 * (1 - t) * t * 6 * s + t ** 2 * -30 * s
            pts.append((cx + x, cy + y))
        return pts

    c.poly(shield(48, 48, 1.12), (36, 62, 118, 255))
    c.poly(shield(48, 48, 0.98), (90, 140, 220, 255))
    c.poly(shield(48, 46, 0.74), (150, 192, 248, 255))
    c.rrect([43, 28, 53, 62], 3, (245, 197, 66, 255))
    c.rrect([31, 40, 65, 50], 3, (245, 197, 66, 255))
    c.save("shield.png")
    # trophy
    c = IDraw()
    c.arc([8, 16, 38, 48], 80, 290, (190, 132, 26, 255), 8)
    c.arc([58, 16, 88, 48], 250, 100, (190, 132, 26, 255), 8)
    c.poly([(28, 12), (68, 12), (65, 36), (56, 48), (40, 48), (31, 36)], (245, 197, 66, 255), (150, 96, 14, 255), 4)
    c.rrect([34, 17, 62, 25], 3, (255, 224, 138, 200))
    c.rrect([43, 48, 53, 60], 2, (166, 110, 20, 255))
    c.rrect([32, 60, 64, 68], 3, (245, 197, 66, 255), (150, 96, 14, 255), 3)
    c.rrect([26, 68, 70, 78], 3, (120, 72, 30, 255), (80, 46, 16, 255), 3)
    c.save("trophy.png")
    # book
    c = IDraw()
    c.poly([(48, 26), (28, 16), (16, 21), (16, 70), (28, 65), (48, 74)], (172, 44, 60, 255))
    c.poly([(48, 26), (68, 16), (80, 21), (80, 70), (68, 65), (48, 74)], (198, 58, 76, 255))
    c.poly([(48, 30), (31, 21), (21, 25), (21, 66), (31, 62), (48, 69)], (243, 234, 208, 255), (120, 84, 40, 255), 3)
    c.poly([(48, 30), (65, 21), (75, 25), (75, 66), (65, 62), (48, 69)], (228, 214, 178, 255), (120, 84, 40, 255), 3)
    c.line([(48, 30), (48, 69)], (120, 84, 40, 255), 3)
    for yy in (38, 47, 56):
        c.line([(27, yy), (42, yy + 3)], (158, 138, 104, 255), 3)
        c.line([(54, yy + 3), (69, yy)], (158, 138, 104, 255), 3)
    c.save("book.png")
    # flag
    c = IDraw()
    top = [(28 + 50 * t, 20 - 4 * math.sin(t * math.pi)) for t in [i / 8 for i in range(9)]]
    bot = [(28 + 50 * t, 44 - 4 * math.sin(t * math.pi)) for t in [i / 8 for i in range(8, -1, -1)]]
    c.poly(top + bot, (239, 71, 111, 255), (150, 30, 60, 255), 4)
    c.rrect([22, 10, 29, 82], 3, (130, 76, 32, 255), (80, 46, 16, 255), 2)
    c.ellipse([19, 4, 32, 17], (245, 197, 66, 255), (150, 96, 14, 255), 2)
    c.rrect([14, 80, 38, 88], 3, (90, 54, 22, 255))
    c.save("flag.png")
    # waves
    c = IDraw()
    for row, (yy, col) in enumerate([(28, (56, 150, 235, 255)), (48, (77, 171, 255, 255)), (68, (120, 200, 255, 255))]):
        pts = [(10 + 76 * t, yy + 6 * math.sin(t * math.pi * 3 + row)) for t in [i / 24 for i in range(25)]]
        c.line([(x, y + 3) for x, y in pts], (30, 96, 170, 200), 8)
        c.line(pts, col, 7)
    c.save("waves.png")
    # trash (MOI): thung rac co nap + 3 khe doc
    c = IDraw()
    c.rrect([36, 8, 60, 17], 4, (86, 96, 124, 255), (38, 44, 66, 255), 3)   # tay cam nap
    c.rrect([18, 16, 78, 27], 5, (110, 122, 150, 255), (38, 44, 66, 255), 4)  # nap
    c.poly([(24, 29), (72, 29), (67, 84), (29, 84)], (130, 144, 172, 255), (38, 44, 66, 255), 4)
    c.rrect([32, 34, 64, 42], 3, (168, 182, 205, 160))
    for xx in (36, 46, 56):
        c.rrect([xx, 46, xx + 5, 72], 2, (52, 62, 86, 255))
    c.save("trash.png")
    # chart (MOI): 3 cot tang dan + truc
    c = IDraw()
    cols = [(28, 52, (84, 190, 96, 255)), (46, 38, (245, 197, 66, 255)), (64, 24, (239, 91, 130, 255))]
    for x, y, col in cols:
        c.rrect([x, y, x + 14, 76], 3, col, (52, 44, 30, 255), 3)
        c.rrect([x + 3, y + 3, x + 7, 73], 2, (255, 255, 255, 90))
    c.line([(18, 12), (18, 78), (86, 78)], (240, 230, 210, 255), 6)
    c.line([(24, 44), (42, 30), (60, 16)], (255, 255, 255, 230), 4)
    c.save("chart.png")
    # speed (MOI): dong ho toc do — nua vong cung chia vach + kim
    c = IDraw()
    box = [12, 14, 84, 86]
    c.arc(box, 180, 245, (84, 190, 96, 255), 10)
    c.arc(box, 243, 302, (245, 197, 66, 255), 10)
    c.arc(box, 300, 360, (239, 71, 90, 255), 10)
    for deg in range(180, 361, 30):
        a = math.radians(deg)
        x1, y1 = 48 + 26 * math.cos(a), 50 + 26 * math.sin(a)
        x2, y2 = 48 + 31 * math.cos(a), 50 + 31 * math.sin(a)
        c.line([(x1, y1), (x2, y2)], (240, 234, 220, 255), 3)
    a = math.radians(-48)
    c.line([(48, 50), (48 + 22 * math.cos(a), 50 + 22 * math.sin(a))], (255, 240, 200, 255), 6)
    c.ellipse([41, 43, 55, 57], (245, 197, 66, 255), (150, 96, 14, 255), 3)
    c.rrect([14, 48, 82, 54], 3, (52, 60, 84, 255))  # thanh day ngang noi hai dau cung
    c.save("speed.png")


make_panel("panel.png", (43, 30, 74), (24, 16, 42), 226)
make_panel("panel_light.png", (62, 46, 102), (38, 27, 66), 240)
make_plaque()
make_button("btn", (104, 80, 168), (86, 62, 148), (50, 36, 96))
make_button("btn_primary", (246, 110, 158), (232, 84, 141), (160, 28, 78))
make_button("btn_gold", (250, 196, 74), (226, 156, 44), (166, 106, 22))
make_button("btn_green", (84, 186, 98), (66, 160, 80), (30, 96, 42))
make_button("btn_red", (224, 88, 80), (198, 62, 58), (130, 30, 28))
make_cardfront()
make_shopcards()
make_benchslot()
make_avatar()
make_icons()
print("DONE ->", OUT)
