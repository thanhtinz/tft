#!/usr/bin/env python3
"""
Pipeline Pixel Art v3 - chuyen toan bo tranh PAINTED hien tai sang PIXEL ART
============================================================================

Chot cua chu du an 2026-10-25: "Chuyen qua pixel di" - dao nguoc huong
painted (dot painted-hoa + khu vien), quay ve pixel art nhu ban Java doi
dau. Pipeline nay KHONG phat minh thong so moi: tai dung nguyen cac ham
cua tools/pixelize.py v2 (dot nang chat luong hinh thoi pixel):

  * Sprite tuong/quai : canvas 128x128, than toi da 108x116, palette 48 mau
    (MEDIANCUT, khong dither), tang bao hoa thich ung, resize premultiplied,
    alpha cat cung (nguong 96), xoa manh bui <=20px, vien dam 1px.
  * San dau / lobby   : 640x360, palette 128 mau, khong dither.
  * Card-back         : 128x179, 64 mau.  Banner: rong 320, 96 mau.
  * Mang dat bench    : luoi pixel 96x48 (= dung co ve trong game),
    palette 96 mau, giu alpha (resize premultiplied).

Diem khac voi pixelize.py v2:
  * NGUON la tranh painted HIEN TAI trong assets/ (gom ca dang tien hoa
    _s2/_s3 va ban da khu vien) thay vi tranh RN/new-art cu.
  * KHONG nuong them vignette vao san/lobby: tranh painted da nuong san
    vignette ~14% (cong them se qua toi goc).
  * Lan chay dau tien se tu chup snapshot nguon painted vao
    tools/painted-src/ (thu muc lam viec cuc bo, khong day len repo -
    nguon painted van con trong git history + tai tao duoc bang
    make-painted-assets.py). Cac lan chay sau doc tu snapshot nay nen
    script chay lai duoc nhieu lan ke ca khi assets/ da la pixel.

Chay (tu thu muc goc project Java):
    python3 tools/pixelize_from_painted.py            # units + scenes + bench
    python3 tools/pixelize_from_painted.py --icons    # + icon trang bi (18)
    python3 tools/pixelize_from_painted.py --sheets   # chi dung lai cac sheet soi

Icon trang bi: luoi noi bo 64x64 roi phong NEAREST len 128x128 (file cu
256x256), palette 96 mau (rong hon sprite de doc duoc o co ~40px trong
khay va ~120px o bang thong tin). Nen phien da quy toi la mot phan cua
icon nen quantize ca nen nhu thuong.
"""

import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

TOOLS_DIR = Path(__file__).resolve().parent
PROJECT_DIR = TOOLS_DIR.parent
sys.path.insert(0, str(TOOLS_DIR))
import pixelize as P  # noqa: E402  (ham + thong so v2 da chot)

ASSETS = PROJECT_DIR / "assets"
SNAP = TOOLS_DIR / "painted-src"

ICON_GRID = 64           # luoi pixel noi bo cua icon trang bi
ICON_OUT = 128           # kich thuoc file icon dau ra (phong NEAREST tu luoi)
ICON_COLORS = 96
PATCH_SIZE = (96, 48)    # = co ve trong game cua mang dat bench
PATCH_COLORS = 96


# ---------------------------------------------------------------------------
# Snapshot nguon painted
# ---------------------------------------------------------------------------
def ensure_snapshot() -> None:
    if (SNAP / "units").exists():
        return
    print("snapshot: chup nguon painted ->", SNAP)
    for sub in ("units", "scenes", "items"):
        src = ASSETS / sub
        if src.exists():
            shutil.copytree(src, SNAP / sub)
    (SNAP / "ui").mkdir(parents=True, exist_ok=True)
    for f in (ASSETS / "ui").glob("benchpatch*.png"):
        shutil.copy2(f, SNAP / "ui" / f.name)


# ---------------------------------------------------------------------------
# Units + scenes (tai dung ham v2)
# ---------------------------------------------------------------------------
def convert_units() -> list[Path]:
    outs = []
    for src in sorted((SNAP / "units").glob("*.png")):
        dst = ASSETS / "units" / src.name
        P.pixelize_sprite(src, dst)
        outs.append(dst)
    print(f"units : {len(outs)} sprite pixel 128px/48 mau")
    return outs


def convert_scenes() -> None:
    sc = SNAP / "scenes"
    for name in ("arena", "arena-sunset", "arena-desert", "arena-ice"):
        img = Image.open(sc / f"{name}.png")
        P.pixelize_scene(img, ASSETS / "scenes" / f"{name}.png",
                         P.ARENA_SIZE, P.ARENA_COLORS, vignette=False)
    print("scenes: arena x4 (640x360, 128 mau, khong nuong them vignette)")

    lobby = Image.open(sc / "lobby.png")
    P.pixelize_scene(lobby, ASSETS / "scenes" / "lobby.png",
                     P.LOBBY_SIZE, P.LOBBY_COLORS, vignette=False)
    print("scenes: lobby (640x360, 128 mau)")

    card = Image.open(sc / "card-back.png")
    P.pixelize_scene(card, ASSETS / "scenes" / "card-back.png",
                     P.CARD_BACK_SIZE, P.CARD_BACK_COLORS)
    for src in sorted(sc.glob("banner-*.png")):
        img = Image.open(src)
        w, h = img.size
        size = (P.BANNER_WIDTH, max(1, round(P.BANNER_WIDTH * h / w)))
        P.pixelize_scene(img, ASSETS / "scenes" / src.name, size, P.BANNER_COLORS)
    print("scenes: card-back (128x179, 64 mau) + banner x3 (rong 320, 96 mau)")


# ---------------------------------------------------------------------------
# Mang dat bench (RGBA, co alpha mem o mep)
# ---------------------------------------------------------------------------
def pixelize_patch(src: Path, dst: Path) -> None:
    img = Image.open(src).convert("RGBA")
    img = P.resize_premultiplied(img, PATCH_SIZE)
    img = P.sharpen_rgb(img, radius=1.0, percent=55)
    img = P.quantize_rgba(img, PATCH_COLORS)
    img.save(dst, optimize=True)


def convert_patches() -> None:
    n = 0
    for src in sorted((SNAP / "ui").glob("benchpatch*.png")):
        pixelize_patch(src, ASSETS / "ui" / src.name)
        n += 1
    print(f"bench : {n} mang dat pixel {PATCH_SIZE[0]}x{PATCH_SIZE[1]}/{PATCH_COLORS} mau")


# ---------------------------------------------------------------------------
# Icon trang bi (chi chay khi --icons: dot trang bi phai da len main)
# ---------------------------------------------------------------------------
def pixelize_icon(src: Path, dst: Path) -> None:
    img = Image.open(src).convert("RGB")
    img = img.resize((ICON_GRID, ICON_GRID), Image.LANCZOS)
    img = P.sharpen_rgb(img.convert("RGBA"), radius=1.0, percent=60).convert("RGB")
    img = img.quantize(colors=ICON_COLORS, method=Image.MEDIANCUT,
                       dither=Image.Dither.NONE).convert("RGB")
    img = img.resize((ICON_OUT, ICON_OUT), Image.NEAREST)
    img.save(dst, optimize=True)


def convert_icons() -> list[Path]:
    outs = []
    for src in sorted((SNAP / "items").glob("*.png")):
        dst = ASSETS / "items" / src.name
        pixelize_icon(src, dst)
        outs.append(dst)
    print(f"icons : {len(outs)} icon trang bi pixel luoi {ICON_GRID}/{ICON_COLORS} mau")
    return outs


# ---------------------------------------------------------------------------
# Sheets de soi bang mat
# ---------------------------------------------------------------------------
def _font():
    try:
        return ImageFont.load_default(size=18)
    except TypeError:
        return ImageFont.load_default()


def sheet_star_forms() -> None:
    """2 tuong x 3 dang sao o co that 128 (phong NEAREST x2) + co nho 44/20px."""
    names = [("gogo", "gogo_s2", "gogo_s3"), ("susu", "susu_s2", "susu_s3")]
    cell, label_h = 256, 24
    sheet = Image.new("RGB", (cell * 3, (cell + label_h) * len(names)), (235, 235, 235))
    d = ImageDraw.Draw(sheet)
    for r, row in enumerate(names):
        for c, name in enumerate(row):
            p = ASSETS / "units" / f"{name}.png"
            if not p.exists():
                continue
            tile = P.checkerboard((cell, cell))
            sp = Image.open(p).convert("RGBA").resize((cell, cell), Image.NEAREST)
            tile.paste(sp, (0, 0), sp)
            sheet.paste(tile, (c * cell, r * (cell + label_h)))
            d.text((c * cell + 8, r * (cell + label_h) + cell + 3), name,
                   fill=(20, 20, 20), font=_font())
    out = TOOLS_DIR / "pixel-sheet-stars.png"
    sheet.save(out, optimize=True)
    print("sheet :", out)


def sheet_on_grass() -> None:
    """Vai tuong pixel dung tren cat san rung that o co ve 100px (co game)."""
    arena = Image.open(ASSETS / "scenes" / "arena.png").convert("RGB")
    crop = arena.crop((150, 120, 550, 320)).resize((800, 400), Image.NEAREST)
    picks = ["gogo_s3", "baba", "phoenix", "slime", "kingboss"]
    x = 20
    for name in picks:
        p = ASSETS / "units" / f"{name}.png"
        if not p.exists():
            continue
        sp = Image.open(p).convert("RGBA").resize((100, 100), Image.NEAREST)
        crop.paste(sp, (x, 400 - 100 - 8), sp)
        x += 155
    out = TOOLS_DIR / "pixel-sheet-grass.png"
    crop.save(out, optimize=True)
    print("sheet :", out)


def sheet_icons(icon_outs: list[Path]) -> None:
    """Icon o co hien thi that: khay 44px va bang thong tin 120px."""
    if not icon_outs:
        return
    cols = len(icon_outs)
    sheet = Image.new("RGB", (cols * 132, 132 + 52), (30, 26, 44))
    d = ImageDraw.Draw(sheet)
    for i, p in enumerate(icon_outs):
        img = Image.open(p).convert("RGB")
        big = img.resize((120, 120), Image.NEAREST)
        sheet.paste(big, (i * 132 + 6, 6))
        small = img.resize((44, 44), Image.NEAREST)
        sheet.paste(small, (i * 132 + 44, 132 + 4))
    out = TOOLS_DIR / "pixel-sheet-icons.png"
    sheet.save(out, optimize=True)
    print("sheet :", out)


# ---------------------------------------------------------------------------
def main() -> None:
    args = set(sys.argv[1:])
    ensure_snapshot()
    if "--sheets" not in args:
        unit_outs = convert_units()
        convert_scenes()
        convert_patches()
        icon_outs = convert_icons() if "--icons" in args else []
    else:
        unit_outs = sorted((ASSETS / "units").glob("*.png"))
        icon_outs = sorted((ASSETS / "items").glob("*.png")) if "--icons" in args else []
    P.make_preview(unit_outs)
    P.make_arena_sheet()
    sheet_star_forms()
    sheet_on_grass()
    sheet_icons(icon_outs)
    print("xong. Sheets: preview-sheet.png, arena-sheet.png, "
          "pixel-sheet-stars.png, pixel-sheet-grass.png"
          + (", pixel-sheet-icons.png" if icon_outs else ""))


if __name__ == "__main__":
    main()
