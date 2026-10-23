package com.dautruongchibi.desktop;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.backends.lwjgl3.Lwjgl3Application;
import com.badlogic.gdx.backends.lwjgl3.Lwjgl3ApplicationConfiguration;
import com.badlogic.gdx.graphics.Pixmap;
import com.badlogic.gdx.graphics.PixmapIO;
import com.dautruongchibi.game.Match;
import com.dautruongchibi.game.Profile;
import com.dautruongchibi.ui.Assets;
import com.dautruongchibi.ui.MainGame;
import com.dautruongchibi.ui.MatchScreen;
import com.dautruongchibi.ui.MenuScreen;

import java.lang.reflect.Field;
import java.lang.reflect.Method;

// Cong cu phat trien: khoi dong game duoi Xvfb, vao thang mot man hinh chi dinh,
// cho vai giay roi chup framebuffer ra PNG va thoat. Dung de kiem chung GUI khong can nguoi bam.
// Cach chay: xvfb-run ./gradlew :desktop:screenshot -PscreenshotMode=battle -PscreenshotOut=tools/shot-battle.png
// Che do: menu | draft (lat the up) | planning (pha chuan bi) | battle (dang giao tranh)
public class ScreenshotMain {
    static class ShotGame extends MainGame {
        final String mode;
        final String outPath;
        int frames = 0;
        boolean battleStarted = false, captured = false;
        MatchScreen matchScreen;

        ShotGame(String mode, String outPath) { this.mode = mode; this.outPath = outPath; }

        @Override
        public void create() {
            assets = new Assets();
            assets.load();
            profile = Profile.load(Profile.defaultPath());
            switch (mode) {
                case "menu":
                    setScreen(new MenuScreen(this));
                    break;
                case "draft": {
                    Match m = Match.startPvp(Match.Mode.PVP_RANKED, 7, "QA Pixel");
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "planning": case "battle": {
                    Match m = Match.startPvp(Match.Mode.PVP_RANKED, 7, "QA Pixel");
                    m.autoPlan();
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "battle4": {
                    // Choi nhanh 3 vong bang logic (khong GUI) de vao vong 4 nhieu tuong hon, roi mo man hinh + danh tiep
                    Match m = Match.startPvp(Match.Mode.PVP_RANKED, 7, "QA Pixel");
                    for (int i = 0; i < 3 && !m.over; i++) { m.autoPlan(); m.fight(); }
                    m.autoPlan();
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                default:
                    setScreen(new MenuScreen(this));
            }
        }

        @Override
        public void render() {
            super.render();
            frames++;
            try {
                if (("battle".equals(mode) || "battle4".equals(mode)) && !battleStarted && frames > 30 && matchScreen != null) {
                    Method mb = MatchScreen.class.getDeclaredMethod("startBattle");
                    mb.setAccessible(true);
                    mb.invoke(matchScreen);
                    battleStarted = true;
                }
                int captureAt = ("battle".equals(mode) || "battle4".equals(mode)) ? 300 : 100;
                if (!captured && frames >= captureAt) {
                    captured = true;
                    capture(outPath);
                    Gdx.app.exit();
                }
            } catch (Exception e) {
                e.printStackTrace();
                Gdx.app.exit();
            }
        }

        private void capture(String path) throws Exception {
            int w = Gdx.graphics.getBackBufferWidth(), h = Gdx.graphics.getBackBufferHeight();
            Pixmap pm = new Pixmap(w, h, Pixmap.Format.RGBA8888);
            Gdx.gl.glReadPixels(0, 0, w, h, com.badlogic.gdx.graphics.GL20.GL_RGBA, com.badlogic.gdx.graphics.GL20.GL_UNSIGNED_BYTE, pm.getPixels());
            Pixmap flipped = new Pixmap(w, h, Pixmap.Format.RGBA8888);
            for (int y = 0; y < h; y++) flipped.drawPixmap(pm, 0, y, 0, h - 1 - y, w, 1);
            PixmapIO.writePNG(Gdx.files.absolute(path), flipped);
            System.out.println("SCREENSHOT_SAVED " + path + " " + w + "x" + h);
            pm.dispose(); flipped.dispose();
        }
    }

    public static void main(String[] args) {
        String mode = args.length > 0 ? args[0] : "battle";
        String out = args.length > 1 ? args[1] : "tools/screenshot.png";
        Lwjgl3ApplicationConfiguration config = new Lwjgl3ApplicationConfiguration();
        config.setTitle("Screenshot — Dau Truong Chibi");
        config.setWindowedMode(1280, 720);
        config.setForegroundFPS(60);
        config.useVsync(false);
        new Lwjgl3Application(new ShotGame(mode, out), config);
    }
}
