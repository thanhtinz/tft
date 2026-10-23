package com.dautruongchibi.ui;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.scenes.scene2d.ui.Label;
import com.badlogic.gdx.scenes.scene2d.ui.TextButton;
import com.badlogic.gdx.scenes.scene2d.ui.TextField;
import com.badlogic.gdx.scenes.scene2d.utils.Drawable;

import java.util.HashMap;
import java.util.Map;

// Helper tao widget dung chung (phong pixel: nen dac, vien vang, chu trang).
public final class Ui {
    private Ui() {}

    public static final Color GOLD = new Color(0.96f, 0.77f, 0.26f, 1);
    public static final Color PANEL = new Color(0.10f, 0.08f, 0.20f, 0.92f);
    public static final Color PANEL_LIGHT = new Color(0.20f, 0.16f, 0.36f, 0.95f);
    public static final Color BTN = new Color(0.24f, 0.18f, 0.45f, 1);
    public static final Color BTN_DOWN = new Color(0.45f, 0.32f, 0.72f, 1);
    public static final Color BTN_OVER = new Color(0.32f, 0.24f, 0.58f, 1);
    public static final Color ACCENT = new Color(0.85f, 0.25f, 0.45f, 1);
    public static final Color GREEN = new Color(0.25f, 0.65f, 0.30f, 1);
    public static final Color RED = new Color(0.75f, 0.22f, 0.28f, 1);
    public static final Color TEXT_DIM = new Color(0.78f, 0.76f, 0.88f, 1);

    private static final Map<Integer, Drawable> cache = new HashMap<>();

    public static Drawable bg(Assets a, Color c) {
        int key = Color.rgba8888(c);
        Drawable d = cache.get(key);
        if (d == null) { d = a.solid(c); cache.put(key, d); }
        return d;
    }

    public static Label label(Assets a, String text, Color color) {
        Label.LabelStyle s = new Label.LabelStyle(a.font, color);
        return new Label(text, s);
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

    public static TextButton button(Assets a, String text) { return button(a, text, BTN); }

    public static TextButton button(Assets a, String text, Color base) {
        TextButton.TextButtonStyle s = new TextButton.TextButtonStyle();
        s.font = a.font;
        s.fontColor = Color.WHITE;
        s.up = bg(a, base);
        s.down = bg(a, BTN_DOWN);
        s.over = bg(a, BTN_OVER);
        s.disabled = bg(a, new Color(0.25f, 0.25f, 0.3f, 1));
        TextButton b = new TextButton(text, s);
        b.pad(8, 14, 8, 14);
        return b;
    }

    public static TextField textField(Assets a, String text) {
        TextField.TextFieldStyle s = new TextField.TextFieldStyle();
        s.font = a.font;
        s.fontColor = Color.WHITE;
        s.background = bg(a, PANEL_LIGHT);
        s.cursor = bg(a, GOLD);
        s.selection = bg(a, new Color(0.4f, 0.35f, 0.6f, 1));
        TextField f = new TextField(text, s);
        f.setMaxLength(16);
        return f;
    }
}
