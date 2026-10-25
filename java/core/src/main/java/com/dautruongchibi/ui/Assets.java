package com.dautruongchibi.ui;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.Pixmap;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.NinePatch;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.badlogic.gdx.graphics.g2d.freetype.FreeTypeFontGenerator;
import com.badlogic.gdx.scenes.scene2d.utils.Drawable;
import com.badlogic.gdx.scenes.scene2d.utils.TextureRegionDrawable;

import com.dautruongchibi.data.GameData;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

// Tai nguyen dung chung: font game (Baloo 2 tieu de + Nunito than chu, qua FreeType),
// sprite pixel, texture canh, va bo texture giao dien "ve" (assets/ui, sinh boi tools/make_ui.py).
public class Assets {
    // Bo ky tu can thiet: ASCII + Tieng Viet day du + vai ky hieu game con lai trong font moi
    private static final String EXTRA_CHARS = "àáâãèéêìíòóôõùúýăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ"
        + "ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐƠƯẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸ"
        + "•…—–·×"
        + "ĩũĨŨ"; // thieu 4 glyph nay: "Hiep Si" (i~) bi tofu o chip toc/he + the tuong, "Dua" (u~) tung phai doi ten mon do

    public BitmapFont font, fontBig, fontSmall, fontTitle;
    private final Map<String, Texture> unitTex = new HashMap<>();
    private final Map<String, Texture> unitGroundTex = new HashMap<>(); // ban "tiep dat": gradient toi nhe o dai chan
    private final Set<String> unitStarMiss = new HashSet<>(); // id dang tien hoa da biet la khong co file
    private final Map<String, Texture> sceneTex = new HashMap<>();
    private final Map<String, Texture> iconTex = new HashMap<>();
    private final List<Texture> uiTex = new ArrayList<>();
    public Texture cardBack, arena, arenaSunset, arenaDesert, arenaIce, lobbyTex;
    public Texture bannerForest, bannerDesert, bannerIce;
    // Bo texture UI ve (9-patch + khung + icon) — xem tools/make_ui.py
    public NinePatch patchPanel, patchPanelLight, patchPlaque, patchCardFront;
    public NinePatch[] patchBtn, patchBtnPrimary, patchBtnGreen, patchBtnRed, patchBtnGold;
    public Texture[] shopFrames = new Texture[5];
    public Texture avatarTex;
    // 3 bien the MANG DAT o cho bench (painted, sinh bang tools/make_bench_patches.py):
    // o cho la mang dat thuoc mat san de tuong DUNG LEN, khong con khung hop UI.
    public Texture[] benchPatchTex = new Texture[3];
    private Texture whiteTex;
    // Texture chieu sau sinh bang Pixmap luc runtime (khong dung file PNG):
    // bong do mem (chu nhat bo goc, alpha roi mem ra vien), vignette goc toi, quang sang radial.
    private Texture shadowTex, vignetteTex, glowTex;

    public void load() {
        FreeTypeFontGenerator genBaloo = new FreeTypeFontGenerator(Gdx.files.internal("fonts/Baloo2-ExtraBold.ttf"));
        FreeTypeFontGenerator genNunito = new FreeTypeFontGenerator(Gdx.files.internal("fonts/Nunito-ExtraBold.ttf"));
        FreeTypeFontGenerator genNunitoB = new FreeTypeFontGenerator(Gdx.files.internal("fonts/Nunito-Bold.ttf"));
        fontTitle = makeFont(genBaloo, 46, 2.2f, new Color(0.20f, 0.10f, 0.02f, 1));
        fontBig = makeFont(genBaloo, 23, 1.3f, new Color(0.13f, 0.08f, 0.22f, 1));
        font = makeFont(genNunito, 17, 0, null);
        fontSmall = makeFont(genNunitoB, 14, 0, null);
        genBaloo.dispose(); genNunito.dispose(); genNunitoB.dispose();

        Pixmap pm = new Pixmap(1, 1, Pixmap.Format.RGBA8888);
        pm.setColor(Color.WHITE); pm.fill();
        whiteTex = new Texture(pm); pm.dispose();
        shadowTex = makeShadowTex();
        vignetteTex = makeVignetteTex();
        glowTex = makeGlowTex();

        cardBack = loadScene("card-back");
        arena = loadScene("arena");
        arenaSunset = loadScene("arena-sunset");
        arenaDesert = loadScene("arena-desert");
        arenaIce = loadScene("arena-ice");
        lobbyTex = loadScene("lobby");
        bannerForest = loadScene("banner-forest");
        bannerDesert = loadScene("banner-desert");
        bannerIce = loadScene("banner-ice");
        loadUi();
    }

    private BitmapFont makeFont(FreeTypeFontGenerator gen, float size, float borderWidth, Color borderColor) {
        FreeTypeFontGenerator.FreeTypeFontParameter p = new FreeTypeFontGenerator.FreeTypeFontParameter();
        p.size = Math.round(size);
        p.characters = FreeTypeFontGenerator.DEFAULT_CHARS + EXTRA_CHARS;
        p.color = Color.WHITE;
        if (borderWidth > 0) { p.borderWidth = borderWidth; p.borderColor = borderColor; p.borderStraight = true; }
        p.shadowOffsetX = 1; p.shadowOffsetY = 1;
        p.shadowColor = new Color(0, 0, 0, 0.55f);
        BitmapFont f = gen.generateFont(p);
        f.getData().markupEnabled = true;
        return f;
    }

    // ---------- Texture UI ve ----------
    private Texture uiTexture(String name) {
        Texture t = new Texture(Gdx.files.internal("ui/" + name + ".png"));
        t.setFilter(Texture.TextureFilter.Linear, Texture.TextureFilter.Linear);
        uiTex.add(t);
        return t;
    }

    private void loadUi() {
        patchPanel = new NinePatch(uiTexture("panel"), 24, 24, 24, 24);
        patchPanelLight = new NinePatch(uiTexture("panel_light"), 24, 24, 24, 24);
        patchPlaque = new NinePatch(uiTexture("plaque"), 26, 26, 16, 16);
        patchCardFront = new NinePatch(uiTexture("cardfront"), 20, 20, 20, 20);
        patchBtn = btnPatches("btn");
        patchBtnPrimary = btnPatches("btn_primary");
        patchBtnGreen = btnPatches("btn_green");
        patchBtnRed = btnPatches("btn_red");
        patchBtnGold = btnPatches("btn_gold");
        for (int i = 0; i < 5; i++) shopFrames[i] = uiTexture("shopcard" + (i + 1));
        for (int i = 0; i < 3; i++) benchPatchTex[i] = uiTexture("benchpatch" + (i + 1));
        avatarTex = uiTexture("avatar");
        for (String n : new String[]{"coin", "heart", "star", "sword", "shield", "trophy", "book", "flag", "waves", "trash", "chart", "speed"})
            iconTex.put(n, uiTexture(n));
    }

    private NinePatch[] btnPatches(String base) {
        return new NinePatch[]{
            new NinePatch(uiTexture(base), 18, 18, 14, 14),
            new NinePatch(uiTexture(base + "_over"), 18, 18, 14, 14),
            new NinePatch(uiTexture(base + "_down"), 18, 18, 14, 14)};
    }

    public NinePatch[] btnPatchesFor(String kind) {
        switch (kind) {
            case "primary": return patchBtnPrimary;
            case "green": return patchBtnGreen;
            case "red": return patchBtnRed;
            case "gold": return patchBtnGold;
            default: return patchBtn;
        }
    }

    public Texture icon(String name) {
        Texture t = iconTex.get(name);
        return t != null ? t : avatarTex;
    }

    // Icon TRANG BI ve tay (assets/items/<id>.png — 6 thanh phan + 12 hoan chinh, cung 1 bo
    // nen phien da quy toi). Thieu file thi fallback o mau theo mau dai dien cua do (khong crash).
    private final Map<String, Texture> itemTex = new HashMap<>();
    public Texture itemIcon(String itemId) {
        Texture t = itemTex.get(itemId);
        if (t != null) return t;
        try {
            t = new Texture(Gdx.files.internal("items/" + itemId + ".png"));
            t.setFilter(Texture.TextureFilter.Linear, Texture.TextureFilter.Linear);
        } catch (Exception e) {
            GameData.ItemDef def = GameData.itemById(itemId);
            Pixmap pm = new Pixmap(48, 48, Pixmap.Format.RGBA8888);
            pm.setColor(def != null ? Color.valueOf(def.color) : Color.GRAY); pm.fill();
            t = new Texture(pm); pm.dispose();
        }
        itemTex.put(itemId, t);
        uiTex.add(t);
        return t;
    }

    public Texture bannerFor(int idx) {
        switch (Math.abs(idx) % 3) {
            case 1: return bannerDesert;
            case 2: return bannerIce;
            default: return bannerForest;
        }
    }

    private Texture loadScene(String name) {
        Texture t = sceneTex.get(name);
        if (t != null) return t;
        try {
            t = new Texture(Gdx.files.internal("scenes/" + name + ".png"));
            t.setFilter(Texture.TextureFilter.Linear, Texture.TextureFilter.Linear);
        } catch (Exception e) {
            Pixmap pm = new Pixmap(64, 64, Pixmap.Format.RGBA8888);
            pm.setColor(new Color(0.16f, 0.12f, 0.28f, 1)); pm.fill();
            t = new Texture(pm); pm.dispose();
        }
        sceneTex.put(name, t);
        return t;
    }

    // Nap texture TUONG co MIPMAP: sprite canvas 512 bi thu xuong ~100px khi dung tren san
    // (va 20px o bang sat thuong) — khong mipmap thi GPU chi lay mau song tuyen 2x2 texel,
    // texel vanh sang bi lay mau roi rac -> quang trang + lap loang/mo quanh silhouette.
    // 512 la luy thua 2 nen mipmap hop le ca WebGL1 (TeaVM). Loi sinh mipmap o bat ky
    // moi truong nao -> fallback texture thuong + Linear (hanh vi cu), khong crash.
    private static Texture loadUnitTexture(String path) {
        try {
            Texture t = new Texture(Gdx.files.internal(path), true);
            t.setFilter(Texture.TextureFilter.MipMapLinearLinear, Texture.TextureFilter.Linear);
            return t;
        } catch (Exception e) {
            Texture t = new Texture(Gdx.files.internal(path));
            t.setFilter(Texture.TextureFilter.Linear, Texture.TextureFilter.Linear);
            return t;
        }
    }

    public Texture unit(String artId) {
        Texture t = unitTex.get(artId);
        if (t != null) return t;
        String id = artId == null ? "slime" : artId;
        try {
            t = loadUnitTexture("units/" + id + ".png");
        } catch (Exception e) {
            try { t = loadUnitTexture("units/slime.png"); }
            catch (Exception e2) {
                Pixmap pm = new Pixmap(64, 64, Pixmap.Format.RGBA8888);
                pm.setColor(new Color(1, 0.6f, 0.8f, 1)); pm.fill();
                t = new Texture(pm); pm.dispose();
            }
        }
        unitTex.put(artId, t);
        return t;
    }

    // Id asset dang TIEN HOA theo cap sao: <id>_s2 (dang bac) / <id>_s3 (dang vang).
    // Quai/Boss PvE khong gop sao nen khong co file nay -> callers fallback ve dang goc.
    public static String starArtId(String artId, int star) {
        return artId + "_s" + (star >= 3 ? 3 : 2);
    }

    // Logic chon asset theo sao (thuan, HeadlessMain kiem chung duoc):
    // sao >= 2 va tap available chua id tien hoa thi dung dang tien hoa, nguoc lai dang goc.
    public static String resolveUnitId(String artId, int star, Set<String> availableStarIds) {
        if (artId != null && star >= 2 && availableStarIds != null) {
            String sid = starArtId(artId, star);
            if (availableStarIds.contains(sid)) return sid;
        }
        return artId;
    }

    // Sprite theo cap sao cua tuong: len sao = TIEN HOA doi hinh dang.
    // Thieu file cap sao (quai, boss, golem summon...) thi fallback ve sprite goc — khong crash, khong o trong.
    public Texture unit(String artId, int star) {
        if (artId != null && star >= 2) {
            String sid = starArtId(artId, star);
            if (!unitStarMiss.contains(sid)) {
                Texture t = unitTex.get(sid);
                if (t == null) {
                    try {
                        t = loadUnitTexture("units/" + sid + ".png");
                        unitTex.put(sid, t);
                    } catch (Exception e) {
                        unitStarMiss.add(sid);
                    }
                }
                if (t != null) return t;
            }
        }
        return unit(artId);
    }

    // Ban TIEP DAT cua sprite (chi dung khi ve tuong DUNG TREN SAN, file tranh goc khong doi):
    // gradient toi nhe o dai chan (11% duoi cua than, toi da -20% o hang chan) ap dung
    // thang len tung pixel co alpha — chan "chìm" xuong mat dat thay vi bi cat cung.
    // Cung thu tu phan giai file nhu unit(artId, star): dang tien hoa truoc, thieu thi dang goc.
    // Loi nap Pixmap (vd moi truong web) -> fallback ngam ve texture thuong, khong crash.
    public Texture unitOnGround(String artId, int star) {
        String base = artId == null ? "slime" : artId;
        String[] candidates = (artId != null && star >= 2 && !unitStarMiss.contains(starArtId(artId, star)))
            ? new String[]{starArtId(artId, star), base} : new String[]{base};
        for (String id : candidates) {
            Texture t = unitGroundTex.get(id);
            if (t != null) return t;
            try {
                Pixmap pm = new Pixmap(Gdx.files.internal("units/" + id + ".png"));
                darkenFeet(pm);
                // Cung mipmap nhu loadUnitTexture (ban tiep dat la texture ve tren san chinh)
                try {
                    t = new Texture(pm, true);
                    t.setFilter(Texture.TextureFilter.MipMapLinearLinear, Texture.TextureFilter.Linear);
                } catch (Exception e2) {
                    t = new Texture(pm);
                    t.setFilter(Texture.TextureFilter.Linear, Texture.TextureFilter.Linear);
                }
                pm.dispose();
                unitGroundTex.put(id, t);
                return t;
            } catch (Exception e) { /* thu ung vien tiep theo / fallback o cuoi */ }
        }
        return unit(artId, star);
    }

    // Toi dan dai chan cua sprite trong Pixmap (toa do Pixmap: y tang XUONG, chan = hang
    // alpha duoi cung). Chi cham vao pixel co alpha > 0 nen khong tao quang toi quanh chan.
    private static void darkenFeet(Pixmap pm) {
        int w = pm.getWidth(), h = pm.getHeight();
        int top = -1, bottom = -1;
        for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
            if ((pm.getPixel(x, y) & 0xFF) > 10) { if (top < 0) top = y; bottom = y; }
        }
        if (bottom < 0) return;
        int band = Math.max(8, Math.min(64, Math.round((bottom - top + 1) * 0.11f)));
        pm.setBlending(Pixmap.Blending.None);
        for (int y = Math.max(0, bottom - band + 1); y <= bottom; y++) {
            float t = (y - (bottom - band)) / (float) band; // 0 o mep tren dai -> 1 o hang chan
            float f = 1f - 0.20f * t;
            for (int x = 0; x < w; x++) {
                int px = pm.getPixel(x, y);
                int a = px & 0xFF;
                if (a == 0) continue;
                int r = (px >>> 24) & 0xFF, g = (px >>> 16) & 0xFF, b = (px >>> 8) & 0xFF;
                pm.setColor(Math.min(255, Math.round(r * f)) / 255f, Math.min(255, Math.round(g * f)) / 255f,
                    Math.min(255, Math.round(b * f)) / 255f, a / 255f);
                pm.drawPixel(x, y);
            }
        }
        pm.setBlending(Pixmap.Blending.SourceOver);
    }

    public Texture arenaFor(String themeKey) {
        switch (themeKey == null ? "" : themeKey) {
            case "sunset": return arenaSunset;
            case "desert": return arenaDesert;
            case "ice": return arenaIce;
            default: return arena;
        }
    }

    public Drawable white() { return new TextureRegionDrawable(new TextureRegion(whiteTex)); }
    public Texture whiteTex() { return whiteTex; }
    public Texture shadowTex() { return shadowTex; }
    public Texture vignetteTex() { return vignetteTex; }
    public Texture glowTex() { return glowTex; }

    // Bong do mem: SDF chu nhat bo goc — trong long alpha=1, ra ngoai vien roi mem ~10px ve 0.
    // Ve keo gian + no rong hon phan tu va lech xuong (xem Ui.drawShadow) se cho bong nhu that.
    private static Texture makeShadowTex() {
        int S = 96, margin = 14, radius = 20;
        Pixmap pm = new Pixmap(S, S, Pixmap.Format.RGBA8888);
        float cx = S / 2f, cy = S / 2f, hx = S / 2f - margin, hy = S / 2f - margin;
        for (int y = 0; y < S; y++) for (int x = 0; x < S; x++) {
            float qx = Math.abs(x + 0.5f - cx) - (hx - radius);
            float qy = Math.abs(y + 0.5f - cy) - (hy - radius);
            float ox = Math.max(qx, 0), oy = Math.max(qy, 0);
            float d = (float) Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - radius; // SDF: <0 trong, >0 ngoai
            float a = d <= 0 ? 1f : Math.max(0, 1 - d / 11f);
            a = a * a * (3 - 2 * a); // smoothstep cho vien mem hon
            pm.setColor(0, 0, 0, a);
            pm.drawPixel(x, y);
        }
        Texture t = new Texture(pm); pm.dispose();
        t.setFilter(Texture.TextureFilter.Linear, Texture.TextureFilter.Linear);
        return t;
    }

    // Vignette: trong suot o giua, den alpha toi da 0.11 o 4 goc (alpha da nhan san vao texture).
    // CHI 0.11 vi tranh san moi da nuong san vignette nhe ~14% — cong don cao hon se qua toi.
    private static Texture makeVignetteTex() {
        int W = 320, H = 180;
        Pixmap pm = new Pixmap(W, H, Pixmap.Format.RGBA8888);
        for (int y = 0; y < H; y++) for (int x = 0; x < W; x++) {
            float dx = (x + 0.5f) / W * 2 - 1, dy = (y + 0.5f) / H * 2 - 1;
            float r = (float) Math.hypot(dx, dy) / 1.4142f; // 0 o tam -> 1 o goc
            float t = Math.max(0, Math.min(1, (r - 0.52f) / 0.48f));
            float a = 0.11f * t * t * (3 - 2 * t);
            pm.setColor(0, 0, 0, a);
            pm.drawPixel(x, y);
        }
        Texture t = new Texture(pm); pm.dispose();
        t.setFilter(Texture.TextureFilter.Linear, Texture.TextureFilter.Linear);
        return t;
    }

    // Quang sang radial trang: alpha=1 o tam roi mem ve 0 o vien (khi ve se tint mau + alpha thap).
    private static Texture makeGlowTex() {
        int S = 128;
        Pixmap pm = new Pixmap(S, S, Pixmap.Format.RGBA8888);
        for (int y = 0; y < S; y++) for (int x = 0; x < S; x++) {
            float d = (float) Math.hypot(x + 0.5 - S / 2.0, y + 0.5 - S / 2.0) / (S / 2f);
            float a = d >= 1 ? 0 : (1 - d) * (1 - d);
            pm.setColor(1, 1, 1, a);
            pm.drawPixel(x, y);
        }
        Texture t = new Texture(pm); pm.dispose();
        t.setFilter(Texture.TextureFilter.Linear, Texture.TextureFilter.Linear);
        return t;
    }

    public Drawable solid(Color c) {
        Pixmap pm = new Pixmap(8, 8, Pixmap.Format.RGBA8888);
        pm.setColor(c); pm.fill();
        Texture t = new Texture(pm); pm.dispose();
        return new TextureRegionDrawable(new TextureRegion(t));
    }

    public void dispose() {
        if (font != null) font.dispose();
        if (fontBig != null) fontBig.dispose();
        if (fontSmall != null) fontSmall.dispose();
        if (fontTitle != null) fontTitle.dispose();
        for (Texture t : unitTex.values()) t.dispose();
        for (Texture t : unitGroundTex.values()) t.dispose();
        for (Texture t : sceneTex.values()) t.dispose();
        for (Texture t : uiTex) t.dispose();
        if (whiteTex != null) whiteTex.dispose();
        if (shadowTex != null) shadowTex.dispose();
        if (vignetteTex != null) vignetteTex.dispose();
        if (glowTex != null) glowTex.dispose();
    }
}
