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
// | result (announcer THANG!/THUA! dau pha ket qua vong)
// | drag (gia lap dang keo mot tuong tren ban ve phia o bench: sprite bam tro + 2 vung thung rac hien)
// | stars (doi chieu 1/2/3 sao cua Gogo dung canh nhau tren ban — sprite tien hoa theo sao)
// | starbattle (giao tranh PvE voi Gogo 3 sao dang tien hoa trong doi hinh)
public class ScreenshotMain {
    static class ShotGame extends MainGame {
        final String mode;
        final String outPath;
        int frames = 0;
        int resultFrames = 0;
        boolean battleStarted = false, captured = false, dragSet = false;
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
                case "campaign":
                    setScreen(new com.dautruongchibi.ui.CampaignScreen(this));
                    break;
                case "guide":
                    setScreen(new com.dautruongchibi.ui.GuideScreen(this));
                    break;
                case "profile":
                    setScreen(new com.dautruongchibi.ui.ProfileScreen(this));
                    break;
                case "draft": {
                    Match m = Match.startPvp(Match.Mode.PVP_RANKED, 7, "QA Pixel");
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "planning": case "battle": case "result": case "drag": {
                    Match m = Match.startPvp(Match.Mode.PVP_RANKED, 7, "QA Pixel");
                    m.autoPlan();
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "stars": {
                    Match m = starShowcase();
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "starbattle": {
                    Match m = starBattleMatch();
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
                if ("drag".equals(mode) && !dragSet && frames > 50 && matchScreen != null) {
                    // Gia lap trang thai dang keo: lay tuong dau tien tren ban, dat cac truong keo-tha
                    // bang reflection, tro vao giua o bench so 1 (sprite bam tro + thung rac hien o 2 goc duoi)
                    Field fMatch = MatchScreen.class.getDeclaredField("match");
                    fMatch.setAccessible(true);
                    Match mm = (Match) fMatch.get(matchScreen);
                    if (mm != null && !mm.human().board.isEmpty()) {
                        com.dautruongchibi.game.Engine.PlacedUnit u = mm.human().board.get(0);
                        Field fUid = MatchScreen.class.getDeclaredField("dragUid"); fUid.setAccessible(true); fUid.set(matchScreen, u.uid);
                        Field fUnit = MatchScreen.class.getDeclaredField("dragUnit"); fUnit.setAccessible(true); fUnit.set(matchScreen, u);
                        Field fFrom = MatchScreen.class.getDeclaredField("dragFromBench"); fFrom.setAccessible(true); fFrom.setBoolean(matchScreen, false);
                        Field fAct = MatchScreen.class.getDeclaredField("dragActive"); fAct.setAccessible(true); fAct.setBoolean(matchScreen, true);
                        Field fX = MatchScreen.class.getDeclaredField("dragX"); fX.setAccessible(true); fX.setFloat(matchScreen, 451f);
                        Field fY = MatchScreen.class.getDeclaredField("dragY"); fY.setAccessible(true); fY.setFloat(matchScreen, 120f);
                        dragSet = true;
                    }
                }
                boolean battleMode = "battle".equals(mode) || "battle4".equals(mode) || "result".equals(mode) || "starbattle".equals(mode);
                if (battleMode && !battleStarted && frames > 30 && matchScreen != null) {
                    Method mb = MatchScreen.class.getDeclaredMethod("startBattle");
                    mb.setAccessible(true);
                    mb.invoke(matchScreen);
                    battleStarted = true;
                    if ("result".equals(mode)) {
                        // Tang toc playback x3 de vao pha RESULT nhanh (announcer chi keo 1,5s)
                        Field fs = MatchScreen.class.getDeclaredField("speed");
                        fs.setAccessible(true);
                        fs.setFloat(matchScreen, 3f);
                    }
                }
                boolean due;
                if ("result".equals(mode) && battleStarted) {
                    Field fp = MatchScreen.class.getDeclaredField("phase");
                    fp.setAccessible(true);
                    boolean inResult = "RESULT".equals(String.valueOf(fp.get(matchScreen)));
                    if (inResult) resultFrames++;
                    due = resultFrames >= 20 || frames >= 2400; // chup giua cua so announcer (chu da phong to)
                } else if (battleMode && battleStarted) {
                    // Chup GIUA tran (khong cho theo so frame vi fps Xvfb khong on dinh):
                    // doi phase == BATTLE va playT >= 1.6s (bay/su kien da kich hoat); phong ngu o frame 1500.
                    java.lang.reflect.Field fp = MatchScreen.class.getDeclaredField("phase");
                    fp.setAccessible(true);
                    java.lang.reflect.Field ft = MatchScreen.class.getDeclaredField("playT");
                    ft.setAccessible(true);
                    boolean inBattle = "BATTLE".equals(String.valueOf(fp.get(matchScreen)));
                    float pt = ft.getFloat(matchScreen);
                    // Uu tien chup dung khoanh khac co cum pow dang no (neu co) de kiem chung hieu ung don nang
                    java.lang.reflect.Field fPows = MatchScreen.class.getDeclaredField("pows");
                    fPows.setAccessible(true);
                    boolean powActive = !((java.util.List<?>) fPows.get(matchScreen)).isEmpty();
                    due = (inBattle && (powActive || pt >= 1.6f)) || frames >= 1500;
                } else {
                    due = frames >= 100;
                }
                if (!captured && due) {
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

    // Dung doi hinh toan Gogo o ca 3 cap sao: 9 con gop thanh 1 con 3 sao, +3 con thanh 1 con 2 sao, +1 con 1 sao.
    static Match starShowcase() {
        Match m = Match.startCampaign(1, 99, "QA Pixel");
        Match.PlayerState h = m.human();
        for (int i = 0; i < 9; i++) m.addChampion(h, "gogo");
        for (int i = 0; i < 3; i++) m.addChampion(h, "gogo");
        m.addChampion(h, "gogo");
        h.level = 9;
        placeByStar(m, h, "gogo", 1, 2, 0);
        placeByStar(m, h, "gogo", 2, 3, 0);
        placeByStar(m, h, "gogo", 3, 4, 0);
        return m;
    }

    // Doi hinh danh that: Gogo 3 sao (tien hoa) + Lulu 2 sao + Bobi 1 sao, danh man chien dich 3.
    static Match starBattleMatch() {
        Match m = Match.startCampaign(3, 99, "QA Pixel");
        Match.PlayerState h = m.human();
        for (int i = 0; i < 9; i++) m.addChampion(h, "gogo");
        for (int i = 0; i < 3; i++) m.addChampion(h, "lulu");
        m.addChampion(h, "bobi");
        h.level = 9;
        placeByStar(m, h, "gogo", 3, 3, 0);
        placeByStar(m, h, "lulu", 2, 2, 3);
        placeByStar(m, h, "bobi", 1, 4, 1);
        return m;
    }

    static void placeByStar(Match m, Match.PlayerState h, String defId, int star, int x, int y) {
        for (com.dautruongchibi.game.Engine.PlacedUnit u : new java.util.ArrayList<>(h.bench))
            if (u.star == star && u.defId.equals(defId)) { m.moveToBoard(u.uid, x, y); return; }
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
