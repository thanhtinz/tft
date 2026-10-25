package com.dautruongchibi.ui;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.g2d.Batch;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.NinePatch;
import com.badlogic.gdx.scenes.scene2d.ui.Button;
import com.badlogic.gdx.scenes.scene2d.ui.Image;
import com.badlogic.gdx.scenes.scene2d.ui.Label;
import com.badlogic.gdx.scenes.scene2d.ui.Table;
import com.badlogic.gdx.scenes.scene2d.ui.TextButton;
import com.badlogic.gdx.scenes.scene2d.ui.TextField;
import com.badlogic.gdx.scenes.scene2d.utils.Drawable;
import com.badlogic.gdx.scenes.scene2d.utils.NinePatchDrawable;

import java.util.HashMap;
import java.util.Map;

// Helper tao widget dung chung — phong ve: panel/nut la texture 9-patch ve tay (tools/make_ui.py),
// font game Baloo 2 (tieu de) + Nunito (than). Mau sac chi con dung cho chu va cac o mau dac biet.
public final class Ui {
    private Ui() {}

    public static final Color GOLD = new Color(0.96f, 0.77f, 0.26f, 1);
    public static final Color PANEL = new Color(0.10f, 0.08f, 0.20f, 0.92f);
    public static final Color PANEL_LIGHT = new Color(0.20f, 0.16f, 0.36f, 0.95f);
    public static final Color BTN = new Color(0.24f, 0.18f, 0.45f, 1);
    public static final Color BTN_GOLD = new Color(0.80f, 0.55f, 0.14f, 1);
    public static final Color BTN_DOWN = new Color(0.45f, 0.32f, 0.72f, 1);
    public static final Color BTN_OVER = new Color(0.32f, 0.24f, 0.58f, 1);
    public static final Color ACCENT = new Color(0.85f, 0.25f, 0.45f, 1);
    public static final Color GREEN = new Color(0.25f, 0.65f, 0.30f, 1);
    public static final Color RED = new Color(0.75f, 0.22f, 0.28f, 1);
    public static final Color TEXT_DIM = new Color(0.78f, 0.76f, 0.88f, 1);

    private static final Map<Integer, Drawable> cache = new HashMap<>();

    // Nen widget: PANEL/PANEL_LIGHT -> texture panel ve; mau khac -> o mau dac (giu cho cac o dac biet).
    public static Drawable bg(Assets a, Color c) {
        if (c == PANEL) return new NinePatchDrawable(a.patchPanel);
        if (c == PANEL_LIGHT) return new NinePatchDrawable(a.patchPanelLight);
        int key = Color.rgba8888(c);
        Drawable d = cache.get(key);
        if (d == null) { d = a.solid(c); cache.put(key, d); }
        return d;
    }

    // ---------- Bong do mem cho UI noi (chieu sau) ----------
    // Ve texture bong (Assets.shadowTex, Pixmap SDF bo goc) no rong hon phan tu 9px moi chieu,
    // lech xuong 6px, alpha mac dinh 0.35. Goi TRUOC khi ve phan tu, trong cung batch.
    public static void drawShadow(Batch batch, Assets a, float x, float y, float w, float h) {
        drawShadow(batch, a, x, y, w, h, 0.35f);
    }

    public static void drawShadow(Batch batch, Assets a, float x, float y, float w, float h, float alpha) {
        if (a == null || a.shadowTex() == null || w <= 0 || h <= 0) return;
        // PHAI copy mau: Batch.getColor() tra ve chinh object noi bo cua batch, gan thang vao
        // bien "old" thi lenh khoi phuc o cuoi la vo hieu (batch ket mau den alpha thap,
        // phan tu ve ngay sau bi nhuom den — loi lam mat lung the up o overlay lat the).
        Color old = new Color(batch.getColor());
        batch.setColor(0, 0, 0, alpha * old.a);
        batch.draw(a.shadowTex(), x - 9, y - 9 - 6, w + 18, h + 18);
        batch.setColor(old);
    }

    // Nut co bong do tu dong: moi Ui.button/buttonBig (moi man hinh dung chung) deu ke thua.
    private static final class ShadowTextButton extends TextButton {
        private final Assets assets;
        ShadowTextButton(String text, TextButtonStyle style, Assets assets) { super(text, style); this.assets = assets; }
        @Override public void draw(Batch batch, float parentAlpha) {
            drawShadow(batch, assets, getX(), getY(), getWidth(), getHeight());
            super.draw(batch, parentAlpha);
        }
    }

    // Bang (panel/plaque) co bong do tu dong — dung cho plaque thanh tren, panel nhat ky,
    // hop ho so o menu, nen chu do tham doi thu...
    public static final class ShadowTable extends Table {
        private final Assets assets;
        public ShadowTable(Assets assets) { this.assets = assets; }
        @Override public void draw(Batch batch, float parentAlpha) {
            drawShadow(batch, assets, getX(), getY(), getWidth(), getHeight(), 0.38f);
            super.draw(batch, parentAlpha);
        }
    }

    public static Table shadowTable(Assets a) { return new ShadowTable(a); }

    public static Drawable panelBg(Assets a) { return new NinePatchDrawable(a.patchPanel); }
    public static Drawable panelLightBg(Assets a) { return new NinePatchDrawable(a.patchPanelLight); }
    public static Drawable plaqueBg(Assets a) { return new NinePatchDrawable(a.patchPlaque); }

    public static Label label(Assets a, String text, Color color) {
        return new Label(text, new Label.LabelStyle(a.font, color));
    }
    public static Label labelBig(Assets a, String text, Color color) {
        return new Label(text, new Label.LabelStyle(a.fontBig, color));
    }
    public static Label labelSmall(Assets a, String text, Color color) {
        return new Label(text, new Label.LabelStyle(a.fontSmall, color));
    }
    public static Label title(Assets a, String text, Color color) {
        return new Label(text, new Label.LabelStyle(a.fontTitle, color));
    }

    // Loai nut theo "mau co so" cu: ACCENT -> nut chinh hong ngoc, GREEN -> xanh la, RED -> do, con lai -> tim thuong.
    private static String kindOf(Color base) {
        if (base == ACCENT) return "primary";
        if (base == GREEN) return "green";
        if (base == RED) return "red";
        if (base == BTN_GOLD) return "gold";
        return "btn";
    }

    public static TextButton button(Assets a, String text) { return button(a, text, BTN); }

    public static TextButton button(Assets a, String text, Color base) {
        return button(a, text, base, a.font);
    }

    public static TextButton button(Assets a, String text, Color base, BitmapFont font) {
        NinePatch[] p = a.btnPatchesFor(kindOf(base));
        TextButton.TextButtonStyle s = new TextButton.TextButtonStyle();
        s.font = font;
        s.fontColor = Color.WHITE;
        s.up = new NinePatchDrawable(p[0]);
        s.over = new NinePatchDrawable(p[1]);
        s.down = new NinePatchDrawable(p[2]);
        s.disabled = new NinePatchDrawable(p[2]).tint(new Color(0.42f, 0.42f, 0.48f, 0.85f));
        TextButton b = new ShadowTextButton(text, s, a);
        b.pad(7, 14, 7, 14);
        return b;
    }

    // Nut lon dung font Baloo (nut che do o menu, nut DAU trong tran...)
    public static TextButton buttonBig(Assets a, String text, Color base) {
        return button(a, text, base, a.fontBig);
    }

    // ---------- Nut co icon ve cung phong cach (icon nam trai nhan, cung bo texture nut moi) ----------
    // Dung Button + Image + Label de icon la mot phan cua nut (sang/lun theo trang thai nut),
    // thay cho cach dat Image rieng canh nut. Tu do bong mem giong ShadowTextButton.
    public static final class GameButton extends Button {
        private final Assets assets;
        private final Label label;
        GameButton(Assets assets, ButtonStyle style, String icon, String text, BitmapFont font, float iconSize) {
            super(style);
            this.assets = assets;
            if (icon != null) {
                Image im = new Image(new com.badlogic.gdx.scenes.scene2d.utils.TextureRegionDrawable(
                    new com.badlogic.gdx.graphics.g2d.TextureRegion(assets.icon(icon))));
                add(im).width(iconSize).height(iconSize).padRight(7);
            }
            label = new Label(text, new Label.LabelStyle(font, Color.WHITE));
            label.setAlignment(com.badlogic.gdx.utils.Align.center);
            add(label).align(com.badlogic.gdx.utils.Align.center);
            pad(4, 12, 4, 12);
        }
        public void setText(String text) { label.setText(text); }
        public String getText() { return label.getText().toString(); }
        @Override public void draw(Batch batch, float parentAlpha) {
            drawShadow(batch, assets, getX(), getY(), getWidth(), getHeight());
            super.draw(batch, parentAlpha);
        }
    }

    public static GameButton iconButton(Assets a, String icon, String text, Color base, BitmapFont font) {
        return iconButton(a, icon, text, base, font, 20);
    }

    public static GameButton iconButtonBig(Assets a, String icon, String text, Color base) {
        return iconButton(a, icon, text, base, a.fontBig, 30);
    }

    private static GameButton iconButton(Assets a, String icon, String text, Color base, BitmapFont font, float iconSize) {
        NinePatch[] p = a.btnPatchesFor(kindOf(base));
        Button.ButtonStyle s = new Button.ButtonStyle();
        s.up = new NinePatchDrawable(p[0]);
        s.over = new NinePatchDrawable(p[1]);
        s.down = new NinePatchDrawable(p[2]);
        s.disabled = new NinePatchDrawable(p[2]).tint(new Color(0.42f, 0.42f, 0.48f, 0.85f));
        return new GameButton(a, s, icon, text, font, iconSize);
    }

    public static TextField textField(Assets a, String text) {
        TextField.TextFieldStyle s = new TextField.TextFieldStyle();
        s.font = a.font;
        s.fontColor = Color.WHITE;
        s.background = new NinePatchDrawable(a.patchPanelLight);
        s.cursor = bg(a, GOLD);
        s.selection = bg(a, new Color(0.4f, 0.35f, 0.6f, 0.6f));
        TextField f = new TextField(text, s);
        f.setMaxLength(16);
        return f;
    }
}
