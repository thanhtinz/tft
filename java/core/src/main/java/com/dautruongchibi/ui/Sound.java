package com.dautruongchibi.ui;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Preferences;
import com.badlogic.gdx.audio.Music;

import java.util.HashMap;
import java.util.Map;

// Am thanh ban Java: tai su dung dan WAV tong hop cua ban RN (assets/audio/).
// - BGM: bgm-home (menu) + bgm-battle (trong tran), phat lap bang Music.
// - SFX: cac file <ten>.wav nap bang Sound (click, coin, sell, place, champion,
//   reroll, equip, cast, hit, levelup, starup, start, win, lose, error).
// Tat ca deu nap "an toan": thieu file / khong co thiet bi am thanh -> im lang,
// khong bao gio lam crash game (quan trong cho headless + Xvfb khong co card tieng).
// Trang thai bat/tat luu bang Gdx Preferences (desktop/android/web deu ho tro).
public final class Sound {
    private static final String PREFS = "dautruongchibi";
    private static final String KEY_ON = "soundOn";

    private final Map<String, com.badlogic.gdx.audio.Sound> sfx = new HashMap<>();
    private Music bgmHome, bgmBattle, currentBgm;
    private boolean enabled = true;
    private boolean available = false;

    public Sound() {
        try {
            Preferences prefs = Gdx.app.getPreferences(PREFS);
            enabled = prefs.getBoolean(KEY_ON, true);
        } catch (Exception ignored) {}
        try {
            bgmHome = loadMusic("audio/bgm-home.wav");
            bgmBattle = loadMusic("audio/bgm-battle.wav");
            String[] names = {"click", "coin", "sell", "place", "champion", "reroll", "equip",
                "cast", "hit", "levelup", "starup", "start", "win", "lose", "error",
                "sparkle", "burst", "freeze", "heal", "stun",
                // SFX tung chieu THEO HE cua tuong (dot VFX/SFX): cast_<he>.wav tong hop rieng
                "cast_fire", "cast_ice", "cast_lightning", "cast_poison", "cast_heal",
                "cast_shield", "cast_energy", "cast_physical", "cast_shadow", "cast_nature"};
            for (String n : names) {
                try {
                    sfx.put(n, Gdx.audio.newSound(Gdx.files.internal("audio/" + n + ".wav")));
                } catch (Exception ignored) {
                    // Thieu 1 SFX thi bo qua rieng file do
                }
            }
            available = bgmHome != null || bgmBattle != null || !sfx.isEmpty();
        } catch (Exception ignored) {
            available = false;
        }
    }

    private Music loadMusic(String path) {
        try {
            Music m = Gdx.audio.newMusic(Gdx.files.internal(path));
            m.setLooping(true);
            m.setVolume(0.5f);
            return m;
        } catch (Exception e) {
            return null;
        }
    }

    public boolean isEnabled() { return enabled; }
    public boolean isAvailable() { return available; }

    public void setEnabled(boolean on) {
        enabled = on;
        try {
            Preferences prefs = Gdx.app.getPreferences(PREFS);
            prefs.putBoolean(KEY_ON, on);
            prefs.flush();
        } catch (Exception ignored) {}
        if (!on) stopBgm();
        else if (currentBgm != null) playBgm(currentBgm == bgmBattle ? "battle" : "home");
    }

    public void playBgm(String track) {
        Music target = "battle".equals(track) ? bgmBattle : bgmHome;
        if (target == null) return;
        if (currentBgm != null && currentBgm != target) {
            try { currentBgm.stop(); } catch (Exception ignored) {}
        }
        currentBgm = target;
        if (!enabled) return;
        try { if (!target.isPlaying()) target.play(); } catch (Exception ignored) {}
    }

    public void stopBgm() {
        if (currentBgm != null) {
            try { currentBgm.stop(); } catch (Exception ignored) {}
        }
    }

    public void sfx(String name) {
        if (!enabled) return;
        com.badlogic.gdx.audio.Sound s = sfx.get(name);
        if (s == null) return;
        try { s.play(0.8f); } catch (Exception ignored) {}
    }

    // Tieng tung chieu theo he cua tuong (khoa tu FxProfile.sfxKey): co file rieng thi
    // phat file do, thieu thi lui ve tieng "cast" chung — khong bao gio loi am thanh.
    public void castFor(String fxKey) {
        if (fxKey != null && sfx.containsKey("cast_" + fxKey)) sfx("cast_" + fxKey);
        else sfx("cast");
    }

    public void dispose() {
        for (com.badlogic.gdx.audio.Sound s : sfx.values()) {
            try { s.dispose(); } catch (Exception ignored) {}
        }
        sfx.clear();
        if (bgmHome != null) try { bgmHome.dispose(); } catch (Exception ignored) {}
        if (bgmBattle != null) try { bgmBattle.dispose(); } catch (Exception ignored) {}
    }
}
