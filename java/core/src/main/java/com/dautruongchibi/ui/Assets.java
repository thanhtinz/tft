package com.dautruongchibi.ui;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.Pixmap;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.badlogic.gdx.graphics.g2d.freetype.FreeTypeFontGenerator;
import com.badlogic.gdx.scenes.scene2d.utils.Drawable;
import com.badlogic.gdx.scenes.scene2d.utils.TextureRegionDrawable;

import java.util.HashMap;
import java.util.Map;

// Tai nguyen dung chung: font Tieng Viet (DejaVu Sans qua FreeType), sprite pixel, texture mau.
public class Assets {
    // Bo ky tu can thiet: ASCII + Tieng Viet day du + vai ky hieu game
    private static final String EXTRA_CHARS = "àáâãèéêìíòóôõùúýăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ"
        + "ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐƠƯẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸ"
        + "★☆♥♦♣♠⚔⚡✦→←↑↓•…—–·×";

    public BitmapFont font, fontBig, fontSmall, fontTitle;
    private final Map<String, Texture> unitTex = new HashMap<>();
    private final Map<String, Texture> sceneTex = new HashMap<>();
    public Texture cardBack, arena, arenaSunset, arenaDesert, arenaIce, lobbyTex;
    private Texture whiteTex;

    public void load() {
        FreeTypeFontGenerator gen = new FreeTypeFontGenerator(Gdx.files.internal("fonts/DejaVuSans.ttf"));
        FreeTypeFontGenerator genBold = new FreeTypeFontGenerator(Gdx.files.internal("fonts/DejaVuSans-Bold.ttf"));
        font = makeFont(gen, 17);
        fontSmall = makeFont(gen, 13.5f);
        fontBig = makeFont(genBold, 22);
        fontTitle = makeFont(genBold, 44);
        gen.dispose(); genBold.dispose();

        Pixmap pm = new Pixmap(1, 1, Pixmap.Format.RGBA8888);
        pm.setColor(Color.WHITE); pm.fill();
        whiteTex = new Texture(pm); pm.dispose();

        cardBack = loadScene("card-back");
        arena = loadScene("arena");
        arenaSunset = loadScene("arena-sunset");
        arenaDesert = loadScene("arena-desert");
        arenaIce = loadScene("arena-ice");
        lobbyTex = loadScene("lobby");
    }

    private BitmapFont makeFont(FreeTypeFontGenerator gen, float size) {
        FreeTypeFontGenerator.FreeTypeFontParameter p = new FreeTypeFontGenerator.FreeTypeFontParameter();
        p.size = Math.round(size);
        p.characters = FreeTypeFontGenerator.DEFAULT_CHARS + EXTRA_CHARS;
        p.color = Color.WHITE;
        p.shadowOffsetX = 1; p.shadowOffsetY = 1;
        p.shadowColor = new Color(0, 0, 0, 0.55f);
        BitmapFont f = gen.generateFont(p);
        f.getData().markupEnabled = true;
        return f;
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
        if (whiteTex != null) whiteTex.dispose();
    }
}
