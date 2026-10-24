#!/usr/bin/env python3
"""
Pipeline Pixel Art v2 - Dau Truong Chibi (Java)
================================================

Dot nang chat luong hinh anh (sau phan hoi "van chua dep, van tho"):
pipeline v1 pixel-hoa qua tho (sprite 64px/28 mau, san 480x270/64 mau +
dither Floyd-Steinberg) lam tranh bi "bun", sprite nhat va vo net.

v2 thay doi:
  * San dau: dung TRANH VE MOI giau chi tiet (tools/new-art/arena-*.webp,
    ve theo phong cach Kanto Tactics: vung choi co ket cau mat dat, vat
    the ke chuyen quanh vien, ao nho day lech goc) thay cho tranh RN cu
    (ao nam giua vung choi, bai co phang).
    Pixel-hoa o luoi 640x360 (gap 1.78x so v1), palette 128 mau,
    KHONG dither (dither FS la nguon nhieu lam ban tranh), tang nhe
    tuong phan/baco hoa/sac net truoc khi quantize, va nuong (bake)
    vignette nhe vao tranh (game con cong them vignette code rat nhe).
  * Sprite tuong: canvas noi bo 128x128 (hien thi ~74-84px), than toi da
    108px cao, palette 48 mau, tang bao hoa THICH UNG (tuong nhat nhu
    mimi/nana/queen duoc tang manh hon), lam sac net truoc quantize,
    alpha cat cung (silhouette sach), va them VIEN DAM 1px quanh
    silhouette (mau vien = mau vien than duoc lam toi di) - dung chuan
    sprite pixel sach kieu Kanto.
  * Lobby/banner/card-back: giu nguon RN, nang luoi + palette, bo dither.

Chay lai bang 1 lenh (tu thu muc goc cua project Java):
    python3 tools/pixelize.py

Dau ra:
  assets/units/<id>.png       - sprite 128x128
  assets/scenes/arena*.png    - 640x360
  assets/scenes/lobby.png     - 640x360
  assets/scenes/card-back.png - 128x179
  assets/scenes/banner-*.png  - rong 320px
  tools/preview-sheet.png     - contact sheet sprite (moi con x2)
  tools/arena-sheet.png       - 4 san moi (2x2, kich thuoc that 640x360)
  tools/arena-before-after.png- san rung cu vs moi
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

# ---------------------------------------------------------------------------
# Duong dan
# ---------------------------------------------------------------------------
TOOLS_DIR = Path(__file__).resolve().parent          # .../tft-java-game/tools
PROJECT_DIR = TOOLS_DIR.parent                       # .../tft-java-game
WORKSPACE_DIR = PROJECT_DIR.parent                   # .../workspace
SRC_DIR = WORKSPACE_DIR / "tft-chibi-game" / "assets" / "art"
SRC_UNITS = SRC_DIR / "units"
SRC_SCENES = SRC_DIR / "scenes"
NEW_ART_DIR = TOOLS_DIR / "new-art"                  # tranh san ve moi

OUT_UNITS = PROJECT_DIR / "assets" / "units"
OUT_SCENES = PROJECT_DIR / "assets" / "scenes"
PREVIEW_PATH = TOOLS_DIR / "preview-sheet.png"
ARENA_SHEET_PATH = TOOLS_DIR / "arena-sheet.png"
BEFORE_AFTER_PATH = TOOLS_DIR / "arena-before-after.png"

# ---------------------------------------------------------------------------
# Thong so v2
# ---------------------------------------------------------------------------
CANVAS = 128               # canvas sprite (hien thi ~74-84px, du net 1.5x+)
SPRITE_MAX_H = 108         # chieu cao than sprite (chua cong dem vien 2px)
SPRITE_MAX_W = 116
SPRITE_COLORS = 48
SPRITE_PAD = 2             # dem trong suot quanh than de ve vien 1px
ALPHA_TRIM_THRESHOLD = 8
ALPHA_HARD_THRESHOLD = 96  # alpha >= nguong nay -> 255, duoi -> 0 (silhouette sach)

ARENA_SIZE = (640, 360)
ARENA_COLORS = 128
LOBBY_SIZE = (640, 360)
LOBBY_COLORS = 128
CARD_BACK_SIZE = (128, 179)
CARD_BACK_COLORS = 64
BANNER_WIDTH = 320
BANNER_COLORS = 96
VIGNETTE_STRENGTH = 0.15   # giam sang toi da o goc (game cong them ~0.10-0.12)

# San moi: (ten file nguon trong new-art, ten dau ra, phan cat tren khi ep 16:9)
# Ba tranh sunset/desert/ice sinh ra o ti le 3:2 -> cat tren/duoi ve 16:9.
# anchor_top: 0.0 = cat het o duoi (giu canh tren), 1.0 = cat het o tren.
ARENAS = [
    ("arena-forest.webp", "arena", 0.0),         # nguon da la 16:9, khong cat
    ("arena-sunset.webp", "arena-sunset", 0.0),   # giu hang rao + ao o tren
    ("arena-desert.webp", "arena-desert", 0.30),  # cat nhieu o tren mot chut
    ("arena-ice.webp", "arena-ice", 0.0),         # giu cuc quang o tren
]


# ---------------------------------------------------------------------------
# Tien ich mau sac
# ---------------------------------------------------------------------------
def mean_saturation(img_rgba: Image.Image) -> float:
    """Bao hoa trung binh (HSV) cua cac pixel nhin thay duoc."""
    arr = np.asarray(img_rgba).astype(np.float32) / 255.0
    rgb, a = arr[..., :3], arr[..., 3]
    mask = a > 0.10
    if not mask.any():
        return 0.0
    px = rgb[mask]
    mx = px.max(axis=1)
    mn = px.min(axis=1)
    sat = np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0.0)
    return float(sat.mean())


def enhance_sprite_colors(img: Image.Image) -> Image.Image:
    """
    Tang bao hoa thich ung + tuong phan nhe cho sprite.
    Tuong nhat (bao hoa thap) duoc tang manh hon de het "nhat mau nuoc".
    """
    sat = mean_saturation(img)
    if sat < 0.30:
        color_boost, bright = 1.34, 1.05
    elif sat < 0.42:
        color_boost, bright = 1.22, 1.03
    else:
        color_boost, bright = 1.13, 1.01
    r, g, b, a = img.split()
    rgb = Image.merge("RGB", (r, g, b))
    rgb = ImageEnhance.Color(rgb).enhance(color_boost)
    rgb = ImageEnhance.Brightness(rgb).enhance(bright)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.06)
    r2, g2, b2 = rgb.split()
    return Image.merge("RGBA", (r2, g2, b2, a))


def sharpen_rgb(img_rgba: Image.Image, radius=1.2, percent=70) -> Image.Image:
    """Lam sac net kenh RGB (khong dung vao alpha de tranh lem vien)."""
    r, g, b, a = img_rgba.split()
    rgb = Image.merge("RGB", (r, g, b))
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=1))
    r2, g2, b2 = rgb.split()
    return Image.merge("RGBA", (r2, g2, b2, a))


# ---------------------------------------------------------------------------
# Sprite tuong / quai
# ---------------------------------------------------------------------------
def trim_alpha(img: Image.Image) -> Image.Image:
    alpha = np.asarray(img.split()[3])
    mask = alpha > ALPHA_TRIM_THRESHOLD
    if not mask.any():
        return img
    rows = np.where(mask.any(axis=1))[0]
    cols = np.where(mask.any(axis=0))[0]
    top, bottom = int(rows[0]), int(rows[-1]) + 1
    left, right = int(cols[0]), int(cols[-1]) + 1
    return img.crop((left, top, right, bottom))


def resize_premultiplied(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Resize RGBA bang LANCZOS tren anh premultiply alpha (vien sach)."""
    arr = np.asarray(img).astype(np.float32)
    alpha = arr[..., 3:4] / 255.0
    premult = np.concatenate([arr[..., :3] * alpha, arr[..., 3:4]], axis=2)
    premult_img = Image.fromarray(np.clip(premult, 0, 255).astype(np.uint8), mode="RGBA")
    resized = premult_img.resize(size, Image.LANCZOS)
    out = np.asarray(resized).astype(np.float32)
    a = out[..., 3:4] / 255.0
    rgb = np.zeros_like(out[..., :3])
    nonzero = a[..., 0] > 0
    rgb[nonzero] = out[..., :3][nonzero] / a[nonzero]
    result = np.concatenate([rgb, out[..., 3:4]], axis=2)
    return Image.fromarray(np.clip(result, 0, 255).astype(np.uint8), mode="RGBA")


def harden_alpha(img: Image.Image) -> Image.Image:
    """Cat alpha cung: silhouette sach kieu pixel art, het vien ban trong suot."""
    arr = np.asarray(img).copy()
    arr[..., 3] = np.where(arr[..., 3] >= ALPHA_HARD_THRESHOLD, 255, 0)
    return Image.fromarray(arr, mode="RGBA")


def remove_dust(img: Image.Image, max_area: int = 20) -> Image.Image:
    """
    Xoa cac manh alpha roi rac rat nho (hat bui/particle thua tu tranh goc
    con sot lai sau khi cat alpha cung) - giu lai than chinh va cac manh
    phu du lon (vu khi, manh bang trang tri...). Flood fill 4 huong.
    """
    arr = np.asarray(img).copy()
    solid = arr[..., 3] > 0
    if not solid.any():
        return img
    h, w = solid.shape
    seen = np.zeros_like(solid)
    from collections import deque
    for y0 in range(h):
        for x0 in range(w):
            if not solid[y0, x0] or seen[y0, x0]:
                continue
            comp = []
            dq = deque([(y0, x0)])
            seen[y0, x0] = True
            while dq:
                y, x = dq.popleft()
                comp.append((y, x))
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < h and 0 <= nx < w and solid[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        dq.append((ny, nx))
            if len(comp) <= max_area:
                for (y, x) in comp:
                    arr[y, x] = 0
    return Image.fromarray(arr, mode="RGBA")


def quantize_rgba(img: Image.Image, colors: int) -> Image.Image:
    """Quantize palette RGB (MEDIANCUT, khong dither), giu nguyen alpha."""
    r, g, b, a = img.split()
    alpha_arr = np.asarray(a).copy()
    rgb_arr = np.asarray(Image.merge("RGB", (r, g, b))).astype(np.float32)
    visible = alpha_arr > 0
    if visible.any():
        mean_color = rgb_arr[visible].mean(axis=0)
        rgb_arr[~visible] = mean_color
    rgb = Image.fromarray(np.clip(rgb_arr, 0, 255).astype(np.uint8), mode="RGB")
    quantized = rgb.quantize(colors=colors, method=Image.MEDIANCUT,
                             dither=Image.Dither.NONE).convert("RGB")
    out_arr = np.asarray(quantized.convert("RGBA")).copy()
    out_arr[..., 3] = alpha_arr
    out_arr[alpha_arr == 0, :3] = 0
    return Image.fromarray(out_arr, mode="RGBA")


def _shift(mask: np.ndarray, dy: int, dx: int) -> np.ndarray:
    """Dich mask bool, phan le ra ngoai coi nhu False (khong cuon vong)."""
    out = np.zeros_like(mask)
    h, w = mask.shape
    ys = slice(max(0, dy), min(h, h + dy))
    xs = slice(max(0, dx), min(w, w + dx))
    yt = slice(max(0, -dy), min(h, h - dy))
    xt = slice(max(0, -dx), min(w, w - dx))
    out[ys, xs] = mask[yt, xt]
    return out


def add_outline(img: Image.Image) -> Image.Image:
    """
    Ve vien dam 1px quanh silhouette.
    Mau vien = mau trung binh cua cac pixel sat vien than, lam toi manh
    (x0.36) va tron voi tim dam -> vien doc nhu mot duong net ve tay.
    """
    arr = np.asarray(img).copy()
    solid = arr[..., 3] > 0
    if not solid.any():
        return img
    dil = solid.copy()
    ero = solid.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            dil |= _shift(solid, dy, dx)
            ero &= _shift(solid, dy, dx)
    ring = dil & ~solid
    edge = solid & ~ero
    if edge.any():
        base = arr[edge][:, :3].astype(np.float32).mean(axis=0)
    else:
        base = np.array([90.0, 70.0, 110.0], dtype=np.float32)
    dark_violet = np.array([34.0, 22.0, 52.0], dtype=np.float32)
    outline_rgb = (base * 0.36 * 0.55 + dark_violet * 0.45).clip(0, 255).astype(np.uint8)
    arr[ring, 0] = outline_rgb[0]
    arr[ring, 1] = outline_rgb[1]
    arr[ring, 2] = outline_rgb[2]
    arr[ring, 3] = 255
    return Image.fromarray(arr, mode="RGBA")


def pixelize_sprite(src: Path, dst: Path) -> None:
    img = Image.open(src).convert("RGBA")
    img = trim_alpha(img)
    img = enhance_sprite_colors(img)

    w, h = img.size
    scale = min(SPRITE_MAX_H / h, SPRITE_MAX_W / w)
    new_w = max(1, round(w * scale))
    new_h = max(1, round(h * scale))
    img = resize_premultiplied(img, (new_w, new_h))
    img = sharpen_rgb(img)
    img = harden_alpha(img)
    img = remove_dust(img)
    img = quantize_rgba(img, SPRITE_COLORS)

    # Dem trong suot quanh than roi ve vien (vien can cho trong o ngoai than)
    padded = Image.new("RGBA", (new_w + SPRITE_PAD * 2, new_h + SPRITE_PAD * 2),
                       (0, 0, 0, 0))
    padded.paste(img, (SPRITE_PAD, SPRITE_PAD))
    padded = add_outline(padded)

    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    x = (CANVAS - padded.width) // 2
    y = CANVAS - padded.height
    canvas.paste(padded, (x, y))
    canvas.save(dst, optimize=True)


# ---------------------------------------------------------------------------
# Canh (arena / lobby / card-back / banner)
# ---------------------------------------------------------------------------
def crop_to_16_9(img: Image.Image, anchor_top: float) -> Image.Image:
    """Cat tren/duoi de dua anh ve 16:9. anchor_top=0 giu canh tren."""
    w, h = img.size
    target_h = round(w * 9 / 16)
    if h <= target_h:
        target_w = round(h * 16 / 9)
        left = (w - target_w) // 2
        return img.crop((left, 0, left + target_w, h))
    cut = h - target_h
    top = round(cut * anchor_top)
    return img.crop((0, top, w, top + target_h))


def bake_vignette(img: Image.Image, strength: float = VIGNETTE_STRENGTH) -> Image.Image:
    """Nuong vignette nhe: goc toi dan theo khoang cach chuan hoa toi goc."""
    arr = np.asarray(img).astype(np.float32)
    h, w = arr.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    dx = (xx / max(1, w - 1)) * 2 - 1
    dy = (yy / max(1, h - 1)) * 2 - 1
    d2 = np.clip((dx * dx + dy * dy) / 2.0, 0, 1)          # 0 o tam, 1 o goc
    factor = 1.0 - strength * (d2 ** 1.6)
    out = arr * factor[..., None]
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), mode="RGB")


def pixelize_scene(img: Image.Image, dst: Path, size: tuple[int, int], colors: int,
                   vignette: bool = False) -> None:
    """Pixel-hoa canh: resize LANCZOS + sac net/tuong phan nhe + palette sach."""
    img = img.convert("RGB")
    img = img.resize(size, Image.LANCZOS)
    img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=55, threshold=2))
    img = ImageEnhance.Color(img).enhance(1.05)
    img = ImageEnhance.Contrast(img).enhance(1.03)
    img = img.quantize(colors=colors, method=Image.MEDIANCUT,
                       dither=Image.Dither.NONE).convert("RGB")
    if vignette:
        img = bake_vignette(img)
    img.save(dst, optimize=True)


def banner_size(src: Path) -> tuple[int, int]:
    with Image.open(src) as img:
        w, h = img.size
    return (BANNER_WIDTH, max(1, round(BANNER_WIDTH * h / w)))


# ---------------------------------------------------------------------------
# Anh xem truoc (contact sheet)
# ---------------------------------------------------------------------------
def checkerboard(size: tuple[int, int], cell: int = 16) -> Image.Image:
    w, h = size
    board = Image.new("RGB", size, (205, 205, 205))
    draw = ImageDraw.Draw(board)
    for yy in range(0, h, cell):
        for xx in range(0, w, cell):
            if ((xx // cell) + (yy // cell)) % 2 == 0:
                draw.rectangle([xx, yy, xx + cell - 1, yy + cell - 1],
                               fill=(165, 165, 165))
    return board


def load_label_font():
    try:
        return ImageFont.load_default(size=20)
    except TypeError:
        return ImageFont.load_default()


def make_preview(unit_files: list[Path]) -> None:
    scale = 2
    cell_w = CANVAS * scale            # 256
    label_h = 26
    cell_h = CANVAS * scale + label_h  # 282
    cols = 5
    rows = (len(unit_files) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell_w, rows * cell_h), (240, 240, 240))
    draw = ImageDraw.Draw(sheet)
    font = load_label_font()
    for idx, path in enumerate(unit_files):
        col, row = idx % cols, idx // cols
        ox, oy = col * cell_w, row * cell_h
        tile = checkerboard((cell_w, CANVAS * scale))
        sprite = Image.open(path).convert("RGBA")
        sprite_big = sprite.resize((CANVAS * scale, CANVAS * scale), Image.NEAREST)
        tile.paste(sprite_big, (0, 0), sprite_big)
        sheet.paste(tile, (ox, oy))
        label = path.stem
        bbox = draw.textbbox((0, 0), label, font=font)
        tw = bbox[2] - bbox[0]
        draw.text((ox + (cell_w - tw) // 2, oy + CANVAS * scale + 3),
                  label, fill=(20, 20, 20), font=font)
    sheet.save(PREVIEW_PATH, optimize=True)


def make_arena_sheet() -> None:
    """4 san moi xep 2x2 o kich thuoc that 640x360 -> sheet 1280x720."""
    names = ["arena", "arena-sunset", "arena-desert", "arena-ice"]
    sheet = Image.new("RGB", (ARENA_SIZE[0] * 2, ARENA_SIZE[1] * 2), (0, 0, 0))
    for i, name in enumerate(names):
        p = OUT_SCENES / f"{name}.png"
        if not p.exists():
            continue
        im = Image.open(p).convert("RGB")
        sheet.paste(im, ((i % 2) * ARENA_SIZE[0], (i // 2) * ARENA_SIZE[1]))
    sheet.save(ARENA_SHEET_PATH, optimize=True)


def make_before_after(old_path: Path) -> None:
    """San rung cu (480x270, phong NEAREST len 640x360) canh san moi."""
    if not old_path.exists():
        return
    old = Image.open(old_path).convert("RGB").resize(ARENA_SIZE, Image.NEAREST)
    new = Image.open(OUT_SCENES / "arena.png").convert("RGB")
    sheet = Image.new("RGB", (ARENA_SIZE[0] * 2, ARENA_SIZE[1] + 30), (245, 245, 245))
    sheet.paste(old, (0, 30))
    sheet.paste(new, (ARENA_SIZE[0], 30))
    draw = ImageDraw.Draw(sheet)
    font = load_label_font()
    draw.text((12, 5), "CU: 480x270 / 64 mau / dither", fill=(20, 20, 20), font=font)
    draw.text((ARENA_SIZE[0] + 12, 5), "MOI: tranh ve lai, 640x360 / 128 mau",
              fill=(20, 20, 20), font=font)
    sheet.save(BEFORE_AFTER_PATH, optimize=True)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    OUT_UNITS.mkdir(parents=True, exist_ok=True)
    OUT_SCENES.mkdir(parents=True, exist_ok=True)

    # 0) Giu ban sao san cu de lam anh doi chieu (chi khi chua co)
    old_arena = Path("/tmp/old-assets/arena-old.png")

    # 1) Sprite tuong / quai
    unit_srcs = sorted(SRC_UNITS.glob("*.webp"))
    unit_outs: list[Path] = []
    for src in unit_srcs:
        dst = OUT_UNITS / f"{src.stem}.png"
        pixelize_sprite(src, dst)
        unit_outs.append(dst)
    print(f"units : {len(unit_outs)} sprites 128px/48 mau -> {OUT_UNITS}")

    # 2) San dau tu tranh ve moi
    for src_name, out_name, anchor in ARENAS:
        src = NEW_ART_DIR / src_name
        img = Image.open(src)
        img = crop_to_16_9(img, anchor)
        pixelize_scene(img, OUT_SCENES / f"{out_name}.png",
                       ARENA_SIZE, ARENA_COLORS, vignette=True)
    print(f"scenes: arena x4 tu tranh moi (640x360, {ARENA_COLORS} mau) -> {OUT_SCENES}")

    # 3) Lobby (nguon RN, nang luoi/palette, bo dither)
    lobby = Image.open(SRC_SCENES / "lobby.webp")
    pixelize_scene(lobby, OUT_SCENES / "lobby.png", LOBBY_SIZE, LOBBY_COLORS,
                   vignette=True)
    print(f"scenes: lobby (640x360, {LOBBY_COLORS} mau)")

    # 4) Lung the + banner (nguon RN, nang luoi/palette, bo dither)
    card = Image.open(SRC_SCENES / "card-back.webp")
    pixelize_scene(card, OUT_SCENES / "card-back.png", CARD_BACK_SIZE,
                   CARD_BACK_COLORS)
    for src in sorted(SRC_SCENES.glob("banner-*.webp")):
        img = Image.open(src)
        pixelize_scene(img, OUT_SCENES / f"{src.stem}.png",
                       banner_size(src), BANNER_COLORS)
    print(f"scenes: card-back + banner x3 (rong {BANNER_WIDTH}px, bo dither)")

    # 5) Anh xem truoc
    make_preview(unit_outs)
    make_arena_sheet()
    make_before_after(old_arena)
    print(f"preview: {PREVIEW_PATH}\n         {ARENA_SHEET_PATH}\n         {BEFORE_AFTER_PATH}")


if __name__ == "__main__":
    main()
