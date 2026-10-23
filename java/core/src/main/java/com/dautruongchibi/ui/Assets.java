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

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// Tai nguyen dung chung: font game (Baloo 2 tieu de + Nunito than chu, qua FreeType),
// sprite pixel, texture canh, va bo texture giao dien "ve" (assets/ui, sinh boi tools/make_ui.py).
public class Assets {
    // Bo ky tu can thiet: ASCII + Tieng Viet day du + vai ky hieu game con lai trong font moi
    private static final String EXTRA_CHARS = "àáâãèéêìíòóôõùúýăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ"
        + "ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐƠƯẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸ"
        + "•…—–·×";

    public BitmapFont font, fontBig, fontSmall, fontTitle;
    private final Map<String, Texture> unitTex = new HashMap<>();
    private final Map<String, Texture> sceneTex = new HashMap<>();
    private final Map<String, Texture> iconTex = new HashMap<>();
    private final List<Texture> uiTex = new ArrayList<>();
    public Texture cardBack, arena, arenaSunset, arenaDesert, arenaIce, lobbyTex;
    public Texture bannerForest, bannerDesert, bannerIce;
    // Bo texture UI ve (9-patch + khung + icon) — xem tools/make_ui.py
    public NinePatch patchPanel, patchPanelLight, patchPlaque, patchCardFront;
    public NinePatch[] patchBtn, patchBtnPrimary, patchBtnGreen, patchBtnRed;
    public Texture[] shopFrames = new Texture[5];
    public Texture benchSlotTex, avatarTex;
    private Texture whiteTex;

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
        for (int i = 0; i < 5; i++) shopFrames[i] = uiTexture("shopcard" + (i + 1));
        benchSlotTex = uiTexture("benchslot");
        avatarTex = uiTexture("avatar");
        for (String n : new String[]{"coin", "heart", "star", "sword", "shield", "trophy", "book", "flag", "waves"})
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
            default: return patchBtn;
        }
    }

    public Texture icon(String name) {
        Texture t = iconTex.get(name);
        return t != null ? t : avatarTex;
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
            t.setFilter(Texture.TextureFilter.Nearest, Texture.TextureFilter.Nearest);
        } catch (Exception e) {
            Pixmap pm = new Pixmap(64, 64, Pixmap.Format.RGBA8888);
            pm.setColor(new Color(0.16f, 0.12f, 0.28f, 1)); pm.fill();
            t = new Texture(pm); pm.dispose();
        }
        sceneTex.put(name, t);
        return t;
    }

    public Texture unit(String artId) {
        Texture t = unitTex.get(artId);
        if (t != null) return t;
        String id = artId == null ? "slime" : artId;
        try {
            t = new Texture(Gdx.files.internal("units/" + id + ".png"));
        } catch (Exception e) {
            try { t = new Texture(Gdx.files.internal("units/slime.png")); }
            catch (Exception e2) {
                Pixmap pm = new Pixmap(64, 64, Pixmap.Format.RGBA8888);
                pm.setColor(new Color(1, 0.6f, 0.8f, 1)); pm.fill();
                t = new Texture(pm); pm.dispose();
            }
        }
        t.setFilter(Texture.TextureFilter.Nearest, Texture.TextureFilter.Nearest);
        unitTex.put(artId, t);
        return t;
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
        for (Texture t : sceneTex.values()) t.dispose();
        for (Texture t : uiTex) t.dispose();
        if (whiteTex != null) whiteTex.dispose();
    }
}
