package com.dautruongchibi.desktop;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.backends.lwjgl3.Lwjgl3Application;
import com.badlogic.gdx.backends.lwjgl3.Lwjgl3ApplicationConfiguration;
import com.badlogic.gdx.graphics.Pixmap;
import com.badlogic.gdx.graphics.PixmapIO;
import com.dautruongchibi.game.Engine;
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
// | fxfire/fxice/fxlightning/fxheal/fxbeam (chup dung khung hinh mot tuong tung chieu theo
//   HE chi dinh — doi BattleFx.lastCastFx trung he roi chup ngay frame do)
public class ScreenshotMain {
    static class ShotGame extends MainGame {
        final String mode;
        final String outPath;
        int frames = 0;
        int resultFrames = 0;
        int panelFrames = 0;
        boolean battleStarted = false, captured = false, dragSet = false, shopSet = false;
        boolean overAdvanced = false; int overFrames = 0;
        MatchScreen matchScreen;
        int fxSeenSeq = -1;
        int fxCaptureAt = -1;

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
                case "draft": case "draftflip": case "draftlong": {
                    Match m = Match.startPvp(Match.Mode.PVP_RANKED, 7, "QA Pixel");
                    if ("draftlong".equals(mode)) {
                        // Ep cac cap ten DAI NHAT (ten tuong + do thanh phan) de kiem chung tran chu tren the lat:
                        // the 0 chua ca hai ky luc cung luc (Luna Cong Chua Trang + Luoi Kiem Mat Ong)
                        String[][] pairs = {
                            {"luna", "tpkiem"}, {"phoenix", "tpgiap"}, {"sumo", "tpcung"},
                            {"baba", "tptim"}, {"astro", "tpgang"}, {"luna", "tpgiap"},
                            {"gogo", "tpkiem"}, {"phoenix", "tpkiem"}
                        };
                        m.draftOptions = new java.util.ArrayList<>();
                        for (String[] p : pairs) m.draftOptions.add(new Engine.CarouselOption(p[0], p[1]));
                    }
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "planning": case "shopopen": case "battle": case "result": case "resultpanel": case "drag": case "dragcell": case "select": {
                    Match m = Match.startPvp(Match.Mode.PVP_RANKED, 7, "QA Pixel");
                    m.autoPlan();
                    if ("shopopen".equals(mode)) {
                        // autoPlan da mua sach shop + tieu het vang: nap lai vang va lam moi
                        // de chup duoc 5 the that (chua ban) + nut reroll o trang thai vang
                        m.human().gold = 50;
                        m.reroll();
                    }
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "benchshow": case "benchshop": {
                    Match m = benchShowcase();
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
                case "itempop_comp": case "itempop_long": case "itempop_short": case "iteminfo_long": {
                    // Chi can man hinh tran o pha chuan bi; popup/bang thong tin se bat bang reflection
                    Match m = benchShowcase();
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "items": case "iteminfo_comp": case "iteminfo_full": case "itemdrag": case "itemcombined": {
                    // Doi hinh benchShowcase + kho do day: 6 thanh phan + 2 do hoan chinh
                    Match m = benchShowcase();
                    Match.PlayerState h = m.human();
                    h.inventory.add("tpkiem"); h.inventory.add("tptim"); h.inventory.add("tpcung");
                    h.inventory.add("tpgang"); h.inventory.add("tpgiap"); h.inventory.add("tpgay");
                    h.inventory.add("vuot"); h.inventory.add("tim");
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "unititems": case "unitcard": case "unitcardbench": {
                    // Do deo tren nguoi nhieu tuong (ban + bench) + dich xem truoc co do
                    Match m = unitItemsShowcase();
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "battleitems": {
                    // Tran danh that: ca 2 phe deu co tuong mang do (dich cua makeAiTeam vong 13)
                    Match m = battleItemsMatch();
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "itemdragunit": {
                    // Gia lap keo tpkiem len gogo dang deo tptim (chip xem truoc hop nhat)
                    Match m = itemDragUnitShowcase();
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
                case "fxfire": case "fxice": case "fxlightning": case "fxheal": case "fxbeam": {
                    Match m = fxMatch(mode.substring(2));
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
                case "resultlose": {
                    // Ban trong (tuong nhan tu lat the nam o bench) -> thua chac vong PvE 1-1:
                    // chup THE KET QUA THUA (khong muc phan thuong do, chi dong vang thuong vong)
                    Match m = Match.startPvp(Match.Mode.PVP_RANKED, 7, "QA Pixel");
                    if (m.draftPending) m.pickDraft(0);
                    if (m.augmentPending) m.pickAugment(0);
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "resultpanelbig": {
                    // Doi hinh lon vong sau: nhieu hang sat thuong -> kiem chung the ket qua
                    // gop hai cot khi cot sat thuong cao hon cot ket qua
                    Match m = battleItemsMatch();
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "over": {
                    // Song Quai: mau con 1 + ban trong -> thua song 1 la ket thuc tran ngay:
                    // chup man hinh KET THUC TRAN (OVER)
                    Match m = Match.startWaves(7, "QA Pixel");
                    if (m.draftPending) m.pickDraft(0);
                    m.human().hp = 1;
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
                if (("drag".equals(mode) || "dragcell".equals(mode)) && !dragSet && frames > 50 && matchScreen != null) {
                    // Gia lap trang thai dang keo: lay tuong dau tien tren ban, dat cac truong keo-tha
                    // bang reflection. "drag": tro vao giua o bench so 1 (o dich = bench).
                    // "dragcell": tro vao tam o ban (2,1) — kiem chung luoi hien + o dich noi bat.
                    Field fMatch = MatchScreen.class.getDeclaredField("match");
                    fMatch.setAccessible(true);
                    Match mm = (Match) fMatch.get(matchScreen);
                    if (mm != null && !mm.human().board.isEmpty()) {
                        com.dautruongchibi.game.Engine.PlacedUnit u = mm.human().board.get(0);
                        Field fUid = MatchScreen.class.getDeclaredField("dragUid"); fUid.setAccessible(true); fUid.set(matchScreen, u.uid);
                        Field fUnit = MatchScreen.class.getDeclaredField("dragUnit"); fUnit.setAccessible(true); fUnit.set(matchScreen, u);
                        Field fFrom = MatchScreen.class.getDeclaredField("dragFromBench"); fFrom.setAccessible(true); fFrom.setBoolean(matchScreen, false);
                        Field fAct = MatchScreen.class.getDeclaredField("dragActive"); fAct.setAccessible(true); fAct.setBoolean(matchScreen, true);
                        Field fX = MatchScreen.class.getDeclaredField("dragX"); fX.setAccessible(true);
                        Field fY = MatchScreen.class.getDeclaredField("dragY"); fY.setAccessible(true);
                        if ("dragcell".equals(mode)) { fX.setFloat(matchScreen, 567f); fY.setFloat(matchScreen, 257f); }
                        else { fX.setFloat(matchScreen, 451f); fY.setFloat(matchScreen, 120f); }
                        dragSet = true;
                    }
                }
                if (("unitcard".equals(mode) || "unitcardbench".equals(mode)) && !dragSet && frames > 50 && matchScreen != null) {
                    // Mo THE TUONG bang reflection: chon gogo tren ban (deo 3 mon) hoac
                    // lulu 2 sao tren bench (deo 2 mon) — the phai hien 3 o do + nut BAN
                    Field fMatch = MatchScreen.class.getDeclaredField("match");
                    fMatch.setAccessible(true);
                    Match mm = (Match) fMatch.get(matchScreen);
                    boolean fromBench = "unitcardbench".equals(mode);
                    com.dautruongchibi.game.Engine.PlacedUnit target = null;
                    java.util.List<com.dautruongchibi.game.Engine.PlacedUnit> pool = fromBench ? mm.human().bench : mm.human().board;
                    for (com.dautruongchibi.game.Engine.PlacedUnit u : pool)
                        if (u.defId.equals(fromBench ? "lulu" : "gogo")) target = u;
                    if (target != null) {
                        Field fS = MatchScreen.class.getDeclaredField("selUid"); fS.setAccessible(true);
                        fS.set(matchScreen, target.uid);
                        Field fB = MatchScreen.class.getDeclaredField("selFromBench"); fB.setAccessible(true);
                        fB.setBoolean(matchScreen, fromBench);
                        dragSet = true;
                    }
                }
                if ("itemdragunit".equals(mode) && !dragSet && frames > 50 && matchScreen != null) {
                    // Dang keo tpkiem (o khay 0) dung tam o (2,0) cua gogo dang deo tptim:
                    // chip xem truoc "Vuot Rong" phai hien canh gogo; titan du 3 o khong sang quang
                    Field fIdx = MatchScreen.class.getDeclaredField("dragItemIndex"); fIdx.setAccessible(true); fIdx.setInt(matchScreen, 0);
                    Field fActI = MatchScreen.class.getDeclaredField("itemDragActive"); fActI.setAccessible(true); fActI.setBoolean(matchScreen, true);
                    Field fX = MatchScreen.class.getDeclaredField("dragX"); fX.setAccessible(true); fX.setFloat(matchScreen, 567f);
                    Field fY = MatchScreen.class.getDeclaredField("dragY"); fY.setAccessible(true); fY.setFloat(matchScreen, 187f);
                    dragSet = true;
                }
                if ("select".equals(mode) && !dragSet && frames > 50 && matchScreen != null) {
                    // Gia lap CHAM-CHON mot tuong tren ban (selUid != null): luoi o phai hien
                    Field fMatch = MatchScreen.class.getDeclaredField("match");
                    fMatch.setAccessible(true);
                    Match mm = (Match) fMatch.get(matchScreen);
                    if (mm != null && !mm.human().board.isEmpty()) {
                        Field fS = MatchScreen.class.getDeclaredField("selUid"); fS.setAccessible(true);
                        fS.set(matchScreen, mm.human().board.get(0).uid);
                        Field fB = MatchScreen.class.getDeclaredField("selFromBench"); fB.setAccessible(true);
                        fB.setBoolean(matchScreen, false);
                        dragSet = true;
                    }
                }
                if (("itempop_comp".equals(mode) || "itempop_long".equals(mode) || "itempop_short".equals(mode)) && frames > 50 && matchScreen != null) {
                    // Bat POPUP NHAN DO bang reflection voi ten dai/ngan de kiem chung loi chong chu:
                    // comp = thanh phan "Gang Tay Nhung" (loi da bao), long = hoan chinh "Giot Nuoc Mat Sao"
                    // (ten dai nhat + desc dai), short = hoan chinh "Vuot Rong" (ten ngan, truong hop chuan).
                    // popupT ghim lai 2.0 MOI frame toi luc chup: delta thuc te duoi Xvfb luc khoi dong
                    // co the rat lon, dat 1 lan se het han truoc frame chup (100); ghim 2.3 thi elapsed
                    // ~0 -> pop chua mo het (panel thu nho, noi dung bi an/loi le). 2.0 -> elapsed 0.3
                    // > 0.18 nen pop = 1 (kich thuoc that) ma popup van con song.
                    String pid = "itempop_comp".equals(mode) ? "tpgang" : "itempop_long".equals(mode) ? "nuocmat" : "vuot";
                    Field fPop = MatchScreen.class.getDeclaredField("popupItemId"); fPop.setAccessible(true); fPop.set(matchScreen, pid);
                    Field fPopT = MatchScreen.class.getDeclaredField("popupT"); fPopT.setAccessible(true); fPopT.setFloat(matchScreen, 2.0f);
                    dragSet = true;
                }
                if ("iteminfo_long".equals(mode) && !dragSet && frames > 50 && matchScreen != null) {
                    // Bang thong tin do voi ten thanh phan dai nhat "Luoi Kiem Mat Ong": kiem chung
                    // dong loai/mo ta o vi tri co dinh co bi ten xuong dong de len khong
                    Field fInfo = MatchScreen.class.getDeclaredField("itemInfoId");
                    fInfo.setAccessible(true);
                    fInfo.set(matchScreen, "tpkiem");
                    dragSet = true;
                }
                if (("iteminfo_comp".equals(mode) || "iteminfo_full".equals(mode)) && !dragSet && frames > 50 && matchScreen != null) {
                    // Mo bang thong tin do bang reflection: thanh phan tpgay (4 cong thuc) / hoan chinh vuot (dong GHEP TU)
                    Field fInfo = MatchScreen.class.getDeclaredField("itemInfoId");
                    fInfo.setAccessible(true);
                    fInfo.set(matchScreen, "iteminfo_comp".equals(mode) ? "tpgay" : "vuot");
                    dragSet = true;
                }
                if ("itemdrag".equals(mode) && !dragSet && frames > 50 && matchScreen != null) {
                    // Chuan hoa kho de cap keo la cong thuc HOP LE: [tpkiem, tptim, ...]
                    Field fMatchD = MatchScreen.class.getDeclaredField("match");
                    fMatchD.setAccessible(true);
                    Match md = (Match) fMatchD.get(matchScreen);
                    md.human().inventory.clear();
                    md.human().inventory.add("tpkiem"); md.human().inventory.add("tptim");
                    md.human().inventory.add("tpcung"); md.human().inventory.add("tpgang");
                    // Gia lap dang keo tpkiem (o khay 0) sang o khay 1 (tptim): icon bam tro + vien o dich
                    Field fIdx = MatchScreen.class.getDeclaredField("dragItemIndex"); fIdx.setAccessible(true); fIdx.setInt(matchScreen, 0);
                    Field fActI = MatchScreen.class.getDeclaredField("itemDragActive"); fActI.setAccessible(true); fActI.setBoolean(matchScreen, true);
                    Field fX = MatchScreen.class.getDeclaredField("dragX"); fX.setAccessible(true); fX.setFloat(matchScreen, 95f);
                    Field fY = MatchScreen.class.getDeclaredField("dragY"); fY.setAccessible(true); fY.setFloat(matchScreen, 410f);
                    dragSet = true;
                }
                if ("itemcombined".equals(mode) && !dragSet && frames > 50 && matchScreen != null) {
                    // Ghep that qua Match API (tpkiem + tptim -> vuot) roi bat toast + popup + loe sang o khay
                    Field fMatch = MatchScreen.class.getDeclaredField("match");
                    fMatch.setAccessible(true);
                    Match mm = (Match) fMatch.get(matchScreen);
                    mm.combineItems("tpkiem", "tptim");
                    Field fToast = MatchScreen.class.getDeclaredField("toast"); fToast.setAccessible(true);
                    fToast.set(matchScreen, "Ghép thành công: Lưỡi Kiếm Mật Ong + Mảnh Tim Kẹo = Vuốt Rồng!");
                    Field fToastT = MatchScreen.class.getDeclaredField("toastT"); fToastT.setAccessible(true); fToastT.setFloat(matchScreen, 3.2f);
                    Field fPop = MatchScreen.class.getDeclaredField("popupItemId"); fPop.setAccessible(true); fPop.set(matchScreen, "vuot");
                    Field fPopT = MatchScreen.class.getDeclaredField("popupT"); fPopT.setAccessible(true); fPopT.setFloat(matchScreen, 2.3f);
                    Field fFlash = MatchScreen.class.getDeclaredField("combineFlashIndex"); fFlash.setAccessible(true);
                    Field fFlashT = MatchScreen.class.getDeclaredField("combineFlashT"); fFlashT.setAccessible(true);
                    fFlash.setInt(matchScreen, mm.human().inventory.indexOf("vuot"));
                    fFlashT.setFloat(matchScreen, 99f); // giu loe sang toi luc chup (cong cu chup chu dong dat)
                    dragSet = true;
                }
                if (("shopopen".equals(mode) || "benchshop".equals(mode)) && !shopSet && frames > 50 && matchScreen != null) {
                    // Gia lap lop shop dang MO o pha chuan bi (dat thang truong shopOpen bang reflection)
                    Field fShop = MatchScreen.class.getDeclaredField("shopOpen");
                    fShop.setAccessible(true);
                    fShop.setBoolean(matchScreen, true);
                    shopSet = true;
                }
                if (("draftflip".equals(mode) || "draftlong".equals(mode)) && !dragSet && frames > 30 && matchScreen != null) {
                    // Chon the 0 va tua thoi gian lat toi luc ca 8 the da mo (nhung chua ap dung chon)
                    Field fCh = MatchScreen.class.getDeclaredField("draftChosen"); fCh.setAccessible(true); fCh.setInt(matchScreen, 0);
                    Field fEl = MatchScreen.class.getDeclaredField("draftElapsed"); fEl.setAccessible(true); fEl.setFloat(matchScreen, 1.45f);
                    dragSet = true;
                }
                boolean fxMode = mode.startsWith("fx");
                boolean battleMode = "battle".equals(mode) || "battle4".equals(mode) || "result".equals(mode) || "resultpanel".equals(mode) || "starbattle".equals(mode) || "battleitems".equals(mode) || "resultlose".equals(mode) || "resultpanelbig".equals(mode) || "over".equals(mode) || fxMode;
                if (battleMode && !battleStarted && frames > 30 && matchScreen != null) {
                    Method mb = MatchScreen.class.getDeclaredMethod("startBattle");
                    mb.setAccessible(true);
                    mb.invoke(matchScreen);
                    battleStarted = true;
                    if ("result".equals(mode) || "resultpanel".equals(mode) || "resultlose".equals(mode) || "resultpanelbig".equals(mode) || "over".equals(mode)) {
                        // Tang toc playback x3 de vao pha RESULT nhanh (announcer chi keo 1,5s)
                        Field fs = MatchScreen.class.getDeclaredField("speed");
                        fs.setAccessible(true);
                        fs.setFloat(matchScreen, 3f);
                    }
                }
                boolean due;
                if (("draftflip".equals(mode) || "draftlong".equals(mode)) && dragSet) {
                    // Chup khi cac the da lat xong (draftElapsed ~1.6s) nhung truoc luc ap dung (2.83s)
                    Field fEl2 = MatchScreen.class.getDeclaredField("draftElapsed");
                    fEl2.setAccessible(true);
                    due = fEl2.getFloat(matchScreen) >= 1.6f || frames >= 900;
                } else if (fxMode && battleStarted) {
                    // Chup NGAY frame mot tuong tung chieu dung HE can kiem chung:
                    // BattleFx.lastCastFx/castSeq duoc MatchScreen cap nhat trong fireEvents.
                    java.lang.reflect.Field fFx = MatchScreen.class.getDeclaredField("battleFx");
                    fFx.setAccessible(true);
                    Object bfx = fFx.get(matchScreen);
                    java.lang.reflect.Field fKey = bfx.getClass().getDeclaredField("lastCastFx");
                    fKey.setAccessible(true);
                    java.lang.reflect.Field fSeq = bfx.getClass().getDeclaredField("castSeq");
                    fSeq.setAccessible(true);
                    String lastFx = String.valueOf(fKey.get(bfx));
                    int seq = fSeq.getInt(bfx);
                    // Mode fxbeam bat tia Laser cua Rero — khoa he cua Rero la "energy"
                    String wanted = "fxbeam".equals(mode) ? "energy" : mode.substring(2);
                    // Dem so cast theo he (castCounts) thay vi chi nhin lastCastFx: 2 cast
                    // cung frame se ghi de lastCastFx nhung khong lam mat dem
                    java.lang.reflect.Field fCounts = bfx.getClass().getDeclaredField("castCounts");
                    fCounts.setAccessible(true);
                    java.util.Map<?, ?> counts = (java.util.Map<?, ?>) fCounts.get(bfx);
                    Object cntObj = counts.get(wanted);
                    int cnt = cntObj == null ? 0 : ((Number) cntObj).intValue();
                    if (fxSeenSeq < 0) fxSeenSeq = cnt;
                    boolean hit = cnt != fxSeenSeq;
                    fxSeenSeq = cnt;
                    // Tre vai frame sau cast de hieu ung toa ra: beam/set song ngan (0.4s)
                    // chi tre 3 frame; cac he khac (hat/vet dat song lau) tre 7 frame
                    int delay = ("fxbeam".equals(mode) || "fxlightning".equals(mode)) ? 3 : 7;
                    if (hit && fxCaptureAt < 0) {
                        fxCaptureAt = frames + delay;
                        System.out.println("FX_CAST_SEEN wanted=" + wanted + " frame=" + frames + " -> capture at " + fxCaptureAt);
                    }
                    if (frames % 600 == 0) System.out.println("FXDBG frame=" + frames + " lastFx=" + lastFx + " seq=" + seq + " cnt=" + cnt + " wanted=" + wanted);
                    due = (fxCaptureAt >= 0 && frames >= fxCaptureAt) || frames >= 5400;
                    if (due && fxCaptureAt < 0) System.out.println("FX_NOT_CAPTURED wanted=" + wanted + " lastFx=" + lastFx);
                    if (due && fxCaptureAt >= 0) System.out.println("FX_CAPTURED wanted=" + wanted + " frame=" + frames);
                } else if (("resultpanel".equals(mode) || "resultlose".equals(mode) || "resultpanelbig".equals(mode)) && battleStarted) {
                    // Cho announcer chay xong (announceT <= 0) de THE KET QUA GOP (ket qua +
                    // phan thuong + cot sat thuong trong cung mot khoi) da hien, chup nhanh
                    // trong cua so ~4s truoc khi pha RESULT tu chuyen tiep
                    Field fp = MatchScreen.class.getDeclaredField("phase");
                    fp.setAccessible(true);
                    Field fa = MatchScreen.class.getDeclaredField("announceT");
                    fa.setAccessible(true);
                    boolean panelUp = "RESULT".equals(String.valueOf(fp.get(matchScreen))) && fa.getFloat(matchScreen) <= 0;
                    if (panelUp) panelFrames++;
                    due = panelFrames >= 12 || frames >= 2400;
                } else if ("over".equals(mode) && battleStarted) {
                    // Tran da ket thuc trong luc dau: o pha RESULT thi chuyen thang sang OVER
                    // bang advanceFromResult (nhu nguoi choi cham man hinh), roi chup overlay
                    Field fp = MatchScreen.class.getDeclaredField("phase");
                    fp.setAccessible(true);
                    String ph = String.valueOf(fp.get(matchScreen));
                    if ("RESULT".equals(ph) && !overAdvanced) {
                        Method ma = MatchScreen.class.getDeclaredMethod("advanceFromResult");
                        ma.setAccessible(true);
                        ma.invoke(matchScreen);
                        overAdvanced = true;
                    }
                    if ("OVER".equals(ph)) overFrames++;
                    due = overFrames >= 12 || frames >= 2400;
                } else if ("result".equals(mode) && battleStarted) {
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
                    // drag/dragcell/select: cho them frame de luoi o mo dan xong (~150ms) truoc khi chup
                    due = frames >= (("drag".equals(mode) || "dragcell".equals(mode) || "select".equals(mode)) ? 220 : 100);
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

    // Trang thai chup DOI CHIEU bench <-> ban: ban co 3 tuong (gogo thap chan dat, titan to,
    // mimi tam xa hang sau), bench 5-6 tuong du dang (toto tron thap, queen cao, lulu 2 sao,
    // phoenix bay, bobi) — de soi kich thuoc (bench phai bang ban: o 84x70, sprite 100px)
    // va duong chan bench co thang hang/khong lech tam so voi mang dat khong.
    static Match benchShowcase() {
        Match m = Match.startPvp(Match.Mode.PVP_RANKED, 7, "QA Pixel");
        Match.PlayerState h = m.human();
        if (m.draftPending) m.pickDraft(0); // nhan tuong lat the mo tran vao bench nhu choi that
        if (m.augmentPending) m.pickAugment(0);
        h.level = 9;
        m.addChampion(h, "gogo"); m.addChampion(h, "titan"); m.addChampion(h, "mimi");
        placeByStar(m, h, "gogo", 1, 2, 0);
        placeByStar(m, h, "titan", 1, 4, 0);
        placeByStar(m, h, "mimi", 1, 3, 3);
        m.addChampion(h, "toto");
        m.addChampion(h, "queen");
        for (int i = 0; i < 3; i++) m.addChampion(h, "lulu"); // gop thanh lulu 2 sao tren bench
        m.addChampion(h, "phoenix");
        m.addChampion(h, "bobi");
        h.gold = 50; // de nut reroll o trang thai vang khi chup benchshop
        return m;
    }

    // Doi hinh benchShowcase + do deo tren nguoi nhieu tuong ca ban lan bench: gogo (ban)
    // 3 mon, titan (ban) 2 mon, lulu 2 sao (bench) 2 mon, queen (bench) 1 thanh phan.
    // Vong dat len 12 (3-1, PvP) de doi hinh dich xem truoc cua makeAiTeam co tuong mang do.
    static Match unitItemsShowcase() {
        Match m = benchShowcase();
        Match.PlayerState h = m.human();
        for (com.dautruongchibi.game.Engine.PlacedUnit u : new java.util.ArrayList<>(h.board)) {
            if (u.defId.equals("gogo")) {
                h.inventory.add("vuot"); h.inventory.add("tim"); h.inventory.add("tpkiem");
                m.equipItem(u.uid, "vuot"); m.equipItem(u.uid, "tim"); m.equipItem(u.uid, "tpkiem");
            } else if (u.defId.equals("titan")) {
                h.inventory.add("giap"); h.inventory.add("tpcung");
                m.equipItem(u.uid, "giap"); m.equipItem(u.uid, "tpcung");
            }
        }
        for (com.dautruongchibi.game.Engine.PlacedUnit u : new java.util.ArrayList<>(h.bench)) {
            if (u.defId.equals("lulu")) {
                h.inventory.add("gay"); h.inventory.add("tptim");
                m.equipItem(u.uid, "gay"); m.equipItem(u.uid, "tptim");
            } else if (u.defId.equals("queen")) {
                h.inventory.add("tpgay");
                m.equipItem(u.uid, "tpgay");
            }
        }
        h.inventory.add("tpkiem"); h.inventory.add("tpcung");
        m.round = 12;
        return m;
    }

    // Tran danh that 2 phe deu co do: phe minh dung san doi hinh co do; dich do
    // makeAiTeam(13) sinh khi fight() chay (tuong dau mang thanh phan tpkiem).
    static Match battleItemsMatch() {
        Match m = Match.startPvp(Match.Mode.PVP_RANKED, 7, "QA Pixel");
        Match.PlayerState h = m.human();
        if (m.draftPending) m.pickDraft(0);
        if (m.augmentPending) m.pickAugment(0);
        h.level = 9;
        m.addChampion(h, "gogo"); m.addChampion(h, "titan"); m.addChampion(h, "lulu"); m.addChampion(h, "mimi");
        placeByStar(m, h, "gogo", 1, 2, 0);
        placeByStar(m, h, "titan", 1, 3, 0);
        placeByStar(m, h, "lulu", 1, 2, 3);
        placeByStar(m, h, "mimi", 1, 4, 3);
        for (com.dautruongchibi.game.Engine.PlacedUnit u : new java.util.ArrayList<>(h.board)) {
            if (u.defId.equals("gogo")) { h.inventory.add("vuot"); h.inventory.add("tim"); m.equipItem(u.uid, "vuot"); m.equipItem(u.uid, "tim"); }
            if (u.defId.equals("lulu")) { h.inventory.add("gay"); m.equipItem(u.uid, "gay"); }
        }
        m.round = 13;
        return m;
    }

    // Keo do len tuong: gogo tren ban (o 2,0) dang deo tptim; titan du 3 o (khong nhan
    // them duoc); khay chua tpkiem o o 0 — cong cu chup gia lap dang keo tpkiem vao gogo.
    static Match itemDragUnitShowcase() {
        Match m = benchShowcase();
        Match.PlayerState h = m.human();
        for (com.dautruongchibi.game.Engine.PlacedUnit u : new java.util.ArrayList<>(h.board)) {
            if (u.defId.equals("gogo")) { h.inventory.add("tptim"); m.equipItem(u.uid, "tptim"); }
            if (u.defId.equals("titan")) {
                h.inventory.add("giap"); h.inventory.add("tim"); h.inventory.add("cung");
                m.equipItem(u.uid, "giap"); m.equipItem(u.uid, "tim"); m.equipItem(u.uid, "cung");
            }
        }
        h.inventory.clear();
        // tpkiem dang keo (o 0); tptim o o 1 PHAI phat sang vien xanh vi ghep duoc voi tpkiem
        h.inventory.add("tpkiem"); h.inventory.add("tptim"); h.inventory.add("tpgay");
        return m;
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

    // Doi hinh chup FX theo he: tuong chu luc cua he o 3 sao + trang bi mana de tung chieu
    // som, danh man 12 (doi Boss) cho tran du dai de bat duoc khoanh khac cast.
    static Match fxMatch(String key) {
        // Bang: doi manh o man 12 chet qua nhanh/kho kiem soat — danh man 10 (dich khong
        // co aoe dot ca hang sau), doi gon 3 tuong de tran keo dai cho Astro kip cast
        Match m = Match.startCampaign("ice".equals(key) ? 10 : 12, 99, "QA Pixel");
        Match.PlayerState h = m.human();
        String[][] specs;
        String keyCaster;
        switch (key) {
            case "fire": specs = new String[][]{{"drago", "9"}, {"fifi", "9"}, {"phoenix", "9"}, {"titan", "9"}, {"bobi", "3"}}; keyCaster = "drago"; break;
            case "ice": specs = new String[][]{{"astro", "9"}, {"toto", "9"}, {"queen", "3"}}; keyCaster = "astro"; break;
            case "lightning": specs = new String[][]{{"zaza", "9"}, {"susu", "9"}, {"titan", "9"}, {"dodo", "3"}}; keyCaster = "zaza"; break;
            case "heal": specs = new String[][]{{"queen", "9"}, {"vivi", "9"}, {"dodo", "9"}, {"gogo", "9"}, {"titan", "3"}}; keyCaster = "vivi"; break; // vivi: cast kieu heal that (su kien heal + dau cong), queen la buffAS
            default: specs = new String[][]{{"rero", "9"}, {"toto", "9"}, {"queen", "9"}, {"bobi", "3"}}; keyCaster = "rero"; break; // beam
        }
        for (String[] s : specs) {
            int copies = Integer.parseInt(s[1]);
            for (int i = 0; i < copies; i++) m.addChampion(h, s[0]);
        }
        h.level = 9;
        // Sap xep: tank (titan/bobi/toto/gogo) hang truoc y=0/1, phap su/ho tro y=2/3
        String[][] front = {{"titan", "3", "2", "0"}, {"bobi", "2", "4", "0"}, {"toto", "3", "3", "0"}, {"gogo", "3", "1", "0"}};
        String[][] back = {{"drago", "3", "3", "3"}, {"fifi", "3", "2", "3"}, {"phoenix", "3", "4", "3"},
            {"astro", "3", "3", "3"}, {"zaza", "3", "3", "3"}, {"susu", "3", "4", "3"},
            {"queen", "3", "3", "2"}, {"vivi", "3", "2", "2"}, {"dodo", "3", "4", "2"}, {"rero", "3", "3", "3"},
            {"vivi", "2", "2", "2"}, {"dodo", "2", "4", "2"}, {"bobi", "2", "4", "1"}, {"titan", "2", "2", "1"},
            {"queen", "2", "2", "2"}};
        for (String[] p : front) placeFx(m, h, p);
        for (String[] p : back) placeFx(m, h, p);
        // Trang bi mana cho tuong chu luc (3 mon, toi da cho phep): tung chieu som hon
        for (com.dautruongchibi.game.Engine.PlacedUnit u : new java.util.ArrayList<>(h.board)) {
            if (u.defId.equals(keyCaster)) {
                h.inventory.add("nuocmat");
                h.inventory.add("sachcu");
                h.inventory.add("nuocmat");
                m.equipItem(u.uid, "nuocmat");
                m.equipItem(u.uid, "sachcu");
                m.equipItem(u.uid, "nuocmat");
            }
        }
        return m;
    }

    static void placeFx(Match m, Match.PlayerState h, String[] p) {
        // p = {defId, star, x, y}
        for (com.dautruongchibi.game.Engine.PlacedUnit u : new java.util.ArrayList<>(h.bench))
            if (u.star == Integer.parseInt(p[1]) && u.defId.equals(p[0])) {
                m.moveToBoard(u.uid, Integer.parseInt(p[2]), Integer.parseInt(p[3]));
                return;
            }
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
