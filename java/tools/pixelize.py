#!/usr/bin/env python3
"""
Pipeline Pixel Art - Dau Truong Chibi (Java)

Chuyen tranh painted goc (webp) tu project React Native
  ../tft-chibi-game/assets/art/
thanh pixel art cho project Java:
  assets/units/<id>.png     - sprite 64x64, cao toi da 56px, palette <= 28 mau, giu alpha
  assets/scenes/arena*.png  - 480x270, palette <= 64 mau
  assets/scenes/lobby.png   - 480x270, palette <= 64 mau
  assets/scenes/card-back.png - 96x134, palette <= 48 mau
  assets/scenes/banner-*.png  - rong 240px, palette <= 48 mau
  tools/preview-sheet.png   - anh xem truoc (contact sheet)

Chay lai bang 1 lenh (tu thu muc goc cua project Java):
    python3 tools/pixelize.py

Duong dan deu tuong doi theo vi tri script, khong hardcode duong dan tuyet doi.
Yeu cau: Python 3 + Pillow (PIL) + numpy.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------------------
# Duong dan (tuong doi theo vi tri file nay)
# ---------------------------------------------------------------------------
TOOLS_DIR = Path(__file__).resolve().parent          # .../tft-java-game/tools
PROJECT_DIR = TOOLS_DIR.parent                       # .../tft-java-game
WORKSPACE_DIR = PROJECT_DIR.parent                   # .../workspace
SRC_DIR = WORKSPACE_DIR / "tft-chibi-game" / "assets" / "art"
SRC_UNITS = SRC_DIR / "units"
SRC_SCENES = SRC_DIR / "scenes"

OUT_UNITS = PROJECT_DIR / "assets" / "units"
OUT_SCENES = PROJECT_DIR / "assets" / "scenes"
PREVIEW_PATH = TOOLS_DIR / "preview-sheet.png"

# ---------------------------------------------------------------------------
# Thong so
# ---------------------------------------------------------------------------
CANVAS = 64            # sprite dat tren canvas 64x64
SPRITE_MAX_H = 56      # chieu cao toi da cua sprite sau khi trim
SPRITE_MAX_W = 64      # chieu rong toi da cua sprite sau khi trim
SPRITE_COLORS = 28     # palette toi da cho sprite
ALPHA_TRIM_THRESHOLD = 8    # alpha <= nguong nay coi nhu trong suot khi trim
ALPHA_CUT_THRESHOLD = 16    # alpha < nguong nay -> 0 (don vien mo sau resize)

ARENA_SIZE = (480, 270)
ARENA_COLORS = 64
CARD_BACK_SIZE = (96, 134)
CARD_BACK_COLORS = 48
BANNER_WIDTH = 240
BANNER_COLORS = 48


# ---------------------------------------------------------------------------
# Sprite tuong / quai
# ---------------------------------------------------------------------------
def trim_alpha(img: Image.Image) -> Image.Image:
    """Cat sat theo bounding box cua kenh alpha (bo phan trong suot thua)."""
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
    """
    Resize RGBA bang LANCZOS tren anh da premultiply alpha.

    Neu resize thang RGBA, mau cua cac pixel trong suot (thuong la den hoac
    hong sau khi tach nen) se lem vao vien -> quang den/hong quanh sprite.
    Premultiply (RGB * A) truoc khi resize roi chia lai sau khi resize
    giu vien sach.
    """
    arr = np.asarray(img).astype(np.float32)
    alpha = arr[..., 3:4] / 255.0
    premult = np.concatenate([arr[..., :3] * alpha, arr[..., 3:4]], axis=2)
    premult_img = Image.fromarray(
        np.clip(premult, 0, 255).astype(np.uint8), mode="RGBA"
    )
    resized = premult_img.resize(size, Image.LANCZOS)

    out = np.asarray(resized).astype(np.float32)
    a = out[..., 3:4] / 255.0
    rgb = np.zeros_like(out[..., :3])
    nonzero = a[..., 0] > 0
    # Chi chia o noi alpha > 0, tranh chia cho 0.
    rgb[nonzero] = out[..., :3][nonzero] / a[nonzero]
    result = np.concatenate([rgb, out[..., 3:4]], axis=2)
    return Image.fromarray(np.clip(result, 0, 255).astype(np.uint8), mode="RGBA")


def quantize_rgba(img: Image.Image, colors: int) -> Image.Image:
    """
    Luong tu hoa palette cua phan RGB (toi da `colors` mau), giu nguyen alpha.

    - Tach alpha ra truoc, quantize rieng RGB bang MEDIANCUT, khong dither
      (dither lam ban cac vung mau phang o kich thuoc pixel art nho).
    - Pixel gan nhu trong suot (alpha < nguong cat) duoc dua alpha ve 0 va
      RGB ve den, tranh palette bi ton cho mau vien mo.
    """
    r, g, b, a = img.split()

    alpha_arr = np.asarray(a).copy()
    alpha_arr[alpha_arr < ALPHA_CUT_THRESHOLD] = 0
    a = Image.fromarray(alpha_arr, mode="L")

    # Dien cac pixel trong suot bang mau trung binh cua phan nhin thay duoc
    # truoc khi quantize, neu khong MEDIANCUT se ton palette cho mau cua
    # vung trong suot (thuong la den) ma nguoi choi khong bao gio thay.
    rgb_arr = np.asarray(Image.merge("RGB", (r, g, b))).astype(np.float32)
    visible = alpha_arr >= ALPHA_CUT_THRESHOLD
    if visible.any():
        mean_color = rgb_arr[visible].mean(axis=0)
        rgb_arr[~visible] = mean_color
    rgb = Image.fromarray(np.clip(rgb_arr, 0, 255).astype(np.uint8), mode="RGB")

    quantized = rgb.quantize(
        colors=colors, method=Image.MEDIANCUT, dither=Image.Dither.NONE
    ).convert("RGB")

    out_arr = np.asarray(quantized.convert("RGBA")).copy()
    out_arr[..., 3] = alpha_arr
    # Pixel hoan toan trong suot: RGB ve 0 cho file gon, khong anh huong hien thi.
    out_arr[alpha_arr == 0, :3] = 0
    return Image.fromarray(out_arr, mode="RGBA")


def pixelize_sprite(src: Path, dst: Path) -> None:
    img = Image.open(src).convert("RGBA")
    img = trim_alpha(img)

    # Thu nho giu ti le: cao toi da 56px, rong toi da 64px.
    w, h = img.size
    scale = min(SPRITE_MAX_H / h, SPRITE_MAX_W / w)
    new_w = max(1, round(w * scale))
    new_h = max(1, round(h * scale))
    img = resize_premultiplied(img, (new_w, new_h))
    img = quantize_rgba(img, SPRITE_COLORS)

    # Dat len canvas 64x64 trong suot, neo day giua.
    # LUU Y: paste KHONG dung mask - paste co mask se alpha-blend cac pixel
    # ban trong suot voi canvas den, tao ra hang tram mau moi va pha palette
    # 28 mau vua quantize. Paste khong mask sao chep nguyen RGBA.
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    x = (CANVAS - new_w) // 2
    y = CANVAS - new_h
    canvas.paste(img, (x, y))
    canvas.save(dst, optimize=True)


# ---------------------------------------------------------------------------
# Canh (arena / lobby / card-back / banner)
# ---------------------------------------------------------------------------
def pixelize_scene(
    src: Path, dst: Path, size: tuple[int, int], colors: int
) -> None:
    img = Image.open(src).convert("RGB")
    img = img.resize(size, Image.LANCZOS)
    img = img.quantize(
        colors=colors, method=Image.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG
    ).convert("RGB")
    img.save(dst, optimize=True)


def banner_size(src: Path) -> tuple[int, int]:
    with Image.open(src) as img:
        w, h = img.size
    return (BANNER_WIDTH, max(1, round(BANNER_WIDTH * h / w)))


# ---------------------------------------------------------------------------
# Anh xem truoc (contact sheet)
# ---------------------------------------------------------------------------
def checkerboard(size: tuple[int, int], cell: int = 16) -> Image.Image:
    """Nen ca-ro xam de kiem tra alpha."""
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
    """Font mac dinh cua PIL (thu xin co lon hon neu PIL ho tro)."""
    try:
        return ImageFont.load_default(size=18)
    except TypeError:
        return ImageFont.load_default()


def make_preview(unit_files: list[Path]) -> None:
    scale = 4
    cell_w = CANVAS * scale            # 256
    label_h = 24
    cell_h = CANVAS * scale + label_h  # 280
    cols = 5
    rows = (len(unit_files) + cols - 1) // cols

    arena_path = OUT_SCENES / "arena.png"
    card_path = OUT_SCENES / "card-back.png"
    arena_big_w, arena_big_h = ARENA_SIZE[0] * 2, ARENA_SIZE[1] * 2  # 960x540
    card_big_w, card_big_h = CARD_BACK_SIZE[0] * 2, CARD_BACK_SIZE[1] * 2  # 192x268

    grid_h = rows * cell_h
    bottom_y = grid_h + 16
    bottom_h = arena_big_h + label_h
    total_w = cols * cell_w                       # 1280
    total_h = bottom_y + bottom_h + 16

    sheet = Image.new("RGB", (total_w, total_h), (240, 240, 240))
    draw = ImageDraw.Draw(sheet)
    font = load_label_font()

    # --- Luoi sprite ---
    for idx, path in enumerate(unit_files):
        col, row = idx % cols, idx // cols
        ox, oy = col * cell_w, row * cell_h
        tile = checkerboard((cell_w, CANVAS * scale))
        sprite = Image.open(path).convert("RGBA")
        sprite_big = sprite.resize(
            (CANVAS * scale, CANVAS * scale), Image.NEAREST
        )
        tile.paste(sprite_big, (0, 0), sprite_big)
        sheet.paste(tile, (ox, oy))
        label = path.stem
        bbox = draw.textbbox((0, 0), label, font=font)
        tw = bbox[2] - bbox[0]
        draw.text(
            (ox + (cell_w - tw) // 2, oy + CANVAS * scale + 3),
            label, fill=(20, 20, 20), font=font,
        )

    # --- Arena + card-back o cuoi trang (phong x2 bang NEAREST) ---
    if arena_path.exists():
        arena = Image.open(arena_path).convert("RGB")
        arena_big = arena.resize((arena_big_w, arena_big_h), Image.NEAREST)
        ax = (total_w - arena_big_w - card_big_w - 24) // 2
        sheet.paste(arena_big, (ax, bottom_y))
        draw.text((ax, bottom_y + arena_big_h + 3), "arena (x2)",
                  fill=(20, 20, 20), font=font)
        if card_path.exists():
            card = Image.open(card_path).convert("RGB")
            card_big = card.resize((card_big_w, card_big_h), Image.NEAREST)
            cx = ax + arena_big_w + 24
            sheet.paste(card_big, (cx, bottom_y))
            draw.text((cx, bottom_y + card_big_h + 3), "card-back (x2)",
                      fill=(20, 20, 20), font=font)

    sheet.save(PREVIEW_PATH, optimize=True)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    OUT_UNITS.mkdir(parents=True, exist_ok=True)
    OUT_SCENES.mkdir(parents=True, exist_ok=True)

    # 1) Sprite tuong / quai
    unit_srcs = sorted(SRC_UNITS.glob("*.webp"))
    unit_outs: list[Path] = []
    for src in unit_srcs:
        dst = OUT_UNITS / f"{src.stem}.png"
        pixelize_sprite(src, dst)
        unit_outs.append(dst)
    print(f"units : {len(unit_outs)} sprites -> {OUT_UNITS}")

    # 2) San dau + lobby: 480x270, 64 mau
    for name in ("arena", "arena-sunset", "arena-desert", "arena-ice", "lobby"):
        src = SRC_SCENES / f"{name}.webp"
        pixelize_scene(src, OUT_SCENES / f"{name}.png", ARENA_SIZE, ARENA_COLORS)
    print(f"scenes: arena x4 + lobby (480x270, {ARENA_COLORS} mau) -> {OUT_SCENES}")

    # 3) Lung the: 96x134, 48 mau
    pixelize_scene(
        SRC_SCENES / "card-back.webp",
        OUT_SCENES / "card-back.png",
        CARD_BACK_SIZE,
        CARD_BACK_COLORS,
    )
    print(f"scenes: card-back (96x134, {CARD_BACK_COLORS} mau)")

    # 4) Banner: rong 240px giu ti le, 48 mau
    for src in sorted(SRC_SCENES.glob("banner-*.webp")):
        pixelize_scene(src, OUT_SCENES / f"{src.stem}.png",
                       banner_size(src), BANNER_COLORS)
    print(f"scenes: banner x3 (rong {BANNER_WIDTH}px, {BANNER_COLORS} mau)")

    # 5) Anh xem truoc
    make_preview(unit_outs)
    print(f"preview: {PREVIEW_PATH}")


if __name__ == "__main__":
    main()
