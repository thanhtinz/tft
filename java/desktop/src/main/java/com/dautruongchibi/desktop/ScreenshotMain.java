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
// | battlesunset / battleice (tran danh that ep theme san: PvP vong 8 = stage 2 hoang hon,
//   vong 20 = stage 4 bang — kiem chung 2 san chua tung co anh tran)
// | battlecard (tran dang chay + THE TUONG PHA TRAN mo tren Gogo 3 sao deo 3 mon)
// | battlecardinfo (nhu battlecard + bang thong tin mon hoan chinh mo tu o do cua the)
// | tabtraits / tabitems / tabdrag (PANEL TRAI HOP NHAT 2 tab: chuan bi voi tab TOC/HE
//   mac dinh / tab TRANG BI mo san / dang keo do trong tab TRANG BI)
// | battletab (tran dang chay + tab TRANG BI mo san — panel van dung/chuyen duoc o pha tran)
// | battledmg (tran dang chay + tab SAT THUONG cua panel phai mo san: bang sat thuong
//   cong don theo thoi gian tran, xem nhanh giua tran khong can cho the ket qua)
// | dmgplan (pha chuan bi + tab SAT THUONG mo san — trang thai rong "chua co du lieu")
// | menumodes (sanh moi + LOP CHON CHE DO mo san sau nut CHOI)
// | legendplan (chuan bi: TINH LINH dung/di dao o ria san nha + tinh linh dich o ria
//   san dich; ho so ep legendId=golem) | legendlist (chuan bi PvP: tab NGUOI voi
//   avatar = mat tinh linh tung nguoi) | legendpickup (tran that + tiem do roi qua
//   reflection: chup GIUA doan tinh linh chay nhat cau do) | legendwin / legendlose
//   (chup cua so announcer o pha RESULT: tinh linh an mung / bi hat xui)
// | fxfire/fxice/fxlightning/fxheal/fxbeam (chup dung khung hinh mot tuong tung chieu theo
//   HE chi dinh — doi BattleFx.lastCastFx trung he roi chup ngay frame do)
// | emotewheel / emotepop / emotefoe (VONG EMOTE: vong quay 6 o dang mo / sticker VUI
//   bat tren tinh linh cua minh / sticker KHIEU KHICH cua bot o ria san dich — trang
//   thai tiem bang reflection trong render)
// | plantop / planopen / plancollapse / planstreak (LAM LAI PHA CHUAN BI theo clip:
//   dai shop TREN-GIUA luon hien + danh sach phai AN mac dinh chi con nut "<" / planopen
//   mo san danh sach dang lop phu / plancollapse ep panel trai THU GON cot icon /
//   planstreak ep streak = 3 de huy hieu lua nam tren dia DOI LAI)
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
        MenuScreen menuScreen;
        int fxSeenSeq = -1;
        int fxCaptureAt = -1;

        ShotGame(String mode, String outPath) { this.mode = mode; this.outPath = outPath; }

        @Override
        public void create() {
            assets = new Assets();
            assets.load();
            profile = Profile.load(Profile.defaultPath());
            switch (mode) {
                case "menu": case "menumodes":
                    // menumodes: sanh moi + LOP CHON CHE DO mo san (bat modesOpen bang
                    // reflection trong render, nhu nguoi choi bam nut CHOI)
                    menuScreen = new MenuScreen(this);
                    setScreen(menuScreen);
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
                case "planning": case "shopopen": case "plantop": case "planopen": case "planstreak": case "battle": case "result": case "resultpanel": case "drag": case "dragcell": case "select": {
                    Match m = Match.startPvp(Match.Mode.PVP_RANKED, 7, "QA Pixel");
                    m.autoPlan();
                    if ("shopopen".equals(mode) || "plantop".equals(mode) || "planopen".equals(mode) || "planstreak".equals(mode)) {
                        // autoPlan da mua sach shop + tieu het vang: nap lai vang va lam moi
                        // de chup duoc 5 the that (chua ban) + dia DOI LAI o trang thai vang.
                        // (shopopen la ten cu tu thoi shop con mo/dong o mep duoi — nay dai
                        // shop LUON HIEN o tren-giua nen ca 4 mode deu ra cung mot hinh.)
                        m.human().gold = 50;
                        m.reroll();
                    }
                    if ("planstreak".equals(mode)) m.human().streak = 3; // ep chuoi thang: huy hieu lua phai o tren dia DOI LAI
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    if ("planopen".equals(mode)) {
                        // Mo san danh sach nguoi choi dang LOP PHU o pha chuan bi (mac
                        // dinh AN chi con nut "<") de kiem chung ca 2 tab + dau doi thu
                        try {
                            Field fRL = MatchScreen.class.getDeclaredField("rightListOpen"); fRL.setAccessible(true); fRL.setBoolean(matchScreen, true);
                        } catch (Exception ex) { throw new RuntimeException(ex); }
                    }
                    break;
                }
                case "plancollapse": {
                    // Panel trai THU GON (cot icon): doi hinh benchShowcase + kho 8 mon
                    // nhu tabitems, ep leftCollapsed = true — cot chi con luc giac toc/he
                    // + icon do; nut chevron phai hien ">" o goc cot.
                    Match m = benchShowcase();
                    Match.PlayerState h = m.human();
                    h.inventory.add("tpkiem"); h.inventory.add("tptim"); h.inventory.add("tpcung");
                    h.inventory.add("tpgang"); h.inventory.add("tpgiap"); h.inventory.add("tpgay");
                    h.inventory.add("vuot"); h.inventory.add("tim");
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    try {
                        Field fLC = MatchScreen.class.getDeclaredField("leftCollapsed"); fLC.setAccessible(true); fLC.setBoolean(matchScreen, true);
                    } catch (Exception ex) { throw new RuntimeException(ex); }
                    break;
                }
                case "benchshow": case "benchshop": {
                    Match m = benchShowcase();
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "arenaprofile": {
                    // Man HO SO 2 cot: hop chon SAN DAU o cot phai (o dang chon = Hoang
                    // Hon, ep qua ho so de anh chup xac dinh)
                    profile.arenaId = "sunset";
                    setScreen(new com.dautruongchibi.ui.ProfileScreen(this));
                    break;
                }
                case "arenasunset": case "arenawinstreak": case "arenalosestreak": case "arenalevel6": case "arenalevel8": case "arenaclick": {
                    // SAN DAU (Arena v1): doi hinh benchShowcase nhung ep level/streak
                    // de CO LAP tung trang tri phan ung (benchShowcase mac dinh cap 9
                    // + streak 0 se lam nhieu cac anh kiem chung rieng le).
                    // arenasunset: ho so chon co dinh Hoang Hon — pha chuan bi vong 1
                    // (auto se la san co) phai ve tranh hoang hon. Cac mode con lai de
                    // "auto" nhu choi that. PHAI ep ca hai nhanh: MainGame.dispose()
                    // tu LUU ho so khi thoat, nen mode chay truoc de lai arenaId trong
                    // file va lam nhieu mode chay sau (da tung dinh "sunset" dan ca lo).
                    profile.arenaId = "arenasunset".equals(mode) ? "sunset" : "auto";
                    Match m = benchShowcase();
                    Match.PlayerState h = m.human();
                    h.level = "arenalevel6".equals(mode) ? 6 : "arenalevel8".equals(mode) ? 8 : 5;
                    h.streak = "arenawinstreak".equals(mode) ? 3 : "arenalosestreak".equals(mode) ? -3 : 0;
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "topfixice": case "topfixsunset": {
                    // VA DINH MAN TRAN: san BANG (sang) + san HOANG HON (toi) de doi
                    // chieu vung chu dinh sau khi bo dong goi y tinh va lat thanh mau
                    // hang tren cung xuong duoi tuong. Ep arenaId ca hai nhanh nhu cac
                    // mode arena (dispose tu luu ho so -> tranh ro lua chon sang mode sau).
                    profile.arenaId = "topfixice".equals(mode) ? "ice" : "sunset";
                    Match m = benchShowcase();
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "legendplan": {
                    // Pha chuan bi day du (benchShowcase): tinh linh cua minh (ep ho so
                    // sang Golem Da) o ria san nha, tinh linh doi thu o ria san dich
                    profile.legendId = "golem";
                    Match m = benchShowcase();
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "legendlist": {
                    // Danh sach nguoi choi PvP: avatar tung hang = mat tinh linh cua
                    // nguoi do (minh = Golem Da da ep, bot = con gan ngau nhien)
                    profile.legendId = "golem";
                    Match m = Match.startPvp(Match.Mode.PVP_RANKED, 7, "QA Pixel");
                    m.autoPlan();
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "legendpickup": {
                    // Tran danh that vong 13; do roi duoc TIEM qua reflection trong
                    // render() (vong PvP khong tu roi do) de chup doan chay nhat cau
                    profile.legendId = "witchmob";
                    Match m = battleItemsMatch();
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "legendwin": {
                    // Doi hinh sao cao danh man chien dich 3 (thang gan nhu chac chan):
                    // chup cua so announcer — tinh linh NHAY AN MUNG
                    Match m = starBattleMatch();
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "legendlose": {
                    // Ban trong -> thua chac vong PvE 1-1: chup cua so announcer —
                    // tinh linh BI HAT XUI (sao quay tren dau)
                    Match m = Match.startPvp(Match.Mode.PVP_RANKED, 7, "QA Pixel");
                    if (m.draftPending) m.pickDraft(0);
                    if (m.augmentPending) m.pickAugment(0);
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "emotewheel": case "emotepop": {
                    // VONG EMOTE (sticker ve): pha chuan bi PvP day du cua benchShowcase
                    // (tinh linh minh o ria nha). Trang thai emote (vong mo / sticker
                    // bat) tiem bang reflection trong render().
                    Match m = benchShowcase();
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "emotefoe": {
                    // Sticker cua BOT o ria san dich: can DOI THU THAT cua vong nen
                    // dung battleItemsMatch (PvP vong 13) — vong 1-1 cua benchShowcase
                    // la vong QUAI PvE (Engine.isPveStageRound) nen peekNextOpponent
                    // = null, khong co tinh linh dich de bat sticker. Van o pha
                    // CHUAN BI (khong startBattle), sticker tiem bang reflection.
                    Match m = battleItemsMatch();
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "boomwin": {
                    // BOOM khi MINH THANG: doi hinh sao cao danh vong PvP 1-6 — chup o pha
                    // RESULT khi tia sao dang bay tu tuong minh sang ria san dich
                    Match m = boomWinMatch();
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "boomlose": {
                    // BOOM khi MINH THUA: ban trong o vong PvP 1-6 — tuong dich con song
                    // ban tia sao vao tinh linh cua minh (dang nga xui)
                    Match m = emptyBoardPvpMatch(100);
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "finisherwin": case "finishercard": {
                    // KET LIEU!: nhu boomwin nhung doi thu vong nay chi con 2 mau —
                    // thua vong la bi loai han -> hoat canh KET LIEU chay truoc the ket
                    // qua. finishercard chup THE KET QUA sau khi hoat canh da xong.
                    Match m = boomWinMatch();
                    m.players.get(1).hp = 2; // bot dau tien = doi thu vong nay (opponentCursor 0)
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "finisherlose": {
                    // BAN BI LOAI: ban trong + minh chi con 3 mau o vong PvP — thua la
                    // het mau, bi loai han -> hoat canh BAN BI LOAI truoc man ket thuc
                    Match m = emptyBoardPvpMatch(3);
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
                case "tabtraits": case "tabitems": case "tabdrag": {
                    // PANEL TRAI HOP NHAT 2 tab: doi hinh nhu mode "items" (benchShowcase +
                    // kho 8 mon). tabtraits giu mac dinh tab TOC/HE; tabitems/tabdrag mo
                    // san tab TRANG BI bang reflection trong render().
                    Match m = benchShowcase();
                    Match.PlayerState h = m.human();
                    h.inventory.add("tpkiem"); h.inventory.add("tptim"); h.inventory.add("tpcung");
                    h.inventory.add("tpgang"); h.inventory.add("tpgiap"); h.inventory.add("tpgay");
                    h.inventory.add("vuot"); h.inventory.add("tim");
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "battletab": {
                    // Tran danh that (battleItemsMatch) + tab TRANG BI mo san: kiem chung
                    // panel hop nhat van gon/dung dung o pha tran, dia duoi-trai khong bi che
                    Match m = battleItemsMatch();
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "battledmg": {
                    // Tran danh that (battleItemsMatch) + tab SAT THUONG cua panel phai mo
                    // san (rightTab = 1 bang reflection): bang phai hien so lieu CONG DON
                    // theo playT ngay giua tran
                    Match m = battleItemsMatch();
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "dmgplan": {
                    // Pha chuan bi PvP + tab SAT THUONG mo san: chua tung co tran nao ->
                    // trang thai rong "Chua co du lieu sat thuong"; tab NGUOI CHOI cua
                    // panel phai phai bi thay boi tab nay (dau kiem cheo doi thu van nam
                    // o tab NGUOI, chup rieng bang oppmark)
                    Match m = Match.startPvp(Match.Mode.PVP_RANKED, 7, "QA Pixel");
                    m.autoPlan();
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
                case "oppmark": case "oppbattle": {
                    // Kiem chung DANH DAU DOI THU kieu TFT (thay hop chu doi hinh): doi hinh
                    // battleItems vong 13 PvP. "oppmark" o nguyen PHA CHUAN BI: hang cua
                    // peekNextOpponent phai co kiem cheo + vien vang va KHONG con hop chu
                    // liet ke doi hinh duoi danh sach. "oppbattle" (battleMode) vao tran
                    // that: dau phai van dung nguoi dang dau o pha tran.
                    Match m = battleItemsMatch();
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "pveplan": {
                    // PvE Chien Dich, pha chuan bi: cot phai phai GON SACH — khong dau kiem
                    // cheo, khong hop chu thong tin, khong mang bong ma duoi tieu de THONG TIN
                    Match m = Match.startCampaign(1, 7, "QA Pixel");
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "battlesunset": case "battleice": {
                    // Ep THEME SAN bang so vong PvP (ArenaTheme.forStage): vong 8 -> stage 2
                    // = hoang hon; vong 20 -> stage 4 = bang. Doi hinh nhu battleitems
                    // (ca 2 phe co tuong mang do) de kiem chung tren tung nen san.
                    Match m = battleItemsMatch();
                    m.round = "battlesunset".equals(mode) ? 8 : 20;
                    matchScreen = new MatchScreen(this, m);
                    setScreen(matchScreen);
                    break;
                }
                case "battlecard": case "battlecardinfo": {
                    // Tran dang chay + THE TUONG PHA TRAN mo san tren Gogo 3 sao deo 3 mon
                    // (2 hoan chinh + 1 thanh phan) bang reflection (battleCardUid);
                    // battlecardinfo mo them bang thong tin cua mon hoan chinh "vuot" tu o do cua the.
                    Match m = battleCardMatch();
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
                    // (Lich su: mode nay tung ep truong shopOpen de mo lop shop duoi. Nay
                    // dai shop LUON HIEN o pha chuan bi nen khong con gi de ep — giu
                    // nhanh nay lam no-op de cac lenh chup cu khong gay loi truong da xoa.)
                    shopSet = true;
                }
                if (("draftflip".equals(mode) || "draftlong".equals(mode)) && !dragSet && frames > 30 && matchScreen != null) {
                    // Chon the 0 va tua thoi gian lat toi luc ca 8 the da mo (nhung chua ap dung chon)
                    Field fCh = MatchScreen.class.getDeclaredField("draftChosen"); fCh.setAccessible(true); fCh.setInt(matchScreen, 0);
                    Field fEl = MatchScreen.class.getDeclaredField("draftElapsed"); fEl.setAccessible(true); fEl.setFloat(matchScreen, 1.45f);
                    dragSet = true;
                }
                if (("emotewheel".equals(mode) || "emotepop".equals(mode) || "emotefoe".equals(mode)) && frames > 40 && matchScreen != null) {
                    // GHIM trang thai emote MOI frame toi luc chup (mac dinh frame 100)
                    // nhu itempop: delta thuc duoi Xvfb luc khoi dong khong on dinh nen
                    // dat 1 lan se troi mat. emotewheel = vong quay mo san 6 o;
                    // emotepop = sticker VUI (0) tren tinh linh MINH ghim o t=0.55
                    // (da phong het co 1.0, alpha 1); emotefoe = sticker KHIEU KHICH
                    // (5) cua BOT o ria san dich, cung ghim t=0.55.
                    if ("emotewheel".equals(mode)) {
                        Field fW = MatchScreen.class.getDeclaredField("emoteWheelOpen"); fW.setAccessible(true); fW.setBoolean(matchScreen, true);
                    } else if ("emotepop".equals(mode)) {
                        Field fE = MatchScreen.class.getDeclaredField("myEmote"); fE.setAccessible(true); fE.setInt(matchScreen, 0);
                        Field fT = MatchScreen.class.getDeclaredField("myEmoteT"); fT.setAccessible(true); fT.setFloat(matchScreen, 0.55f);
                    } else {
                        Field fE = MatchScreen.class.getDeclaredField("foeEmote"); fE.setAccessible(true); fE.setInt(matchScreen, 5);
                        Field fT = MatchScreen.class.getDeclaredField("foeEmoteT"); fT.setAccessible(true); fT.setFloat(matchScreen, 0.55f);
                    }
                }
                if ("arenaclick".equals(mode) && !dragSet && frames > 40 && matchScreen != null) {
                    // Kich hoat BUNG SAO cua diem bam tuong tac tren san bang reflection
                    // (nhu nguoi choi cham vao vung ho goc duoi-trai luc chuan bi):
                    // arenaBurstT bat dau tu 0, due bat anh khi burst chay toi 0.12..0.5s
                    Field fBurst = MatchScreen.class.getDeclaredField("arenaBurstT"); fBurst.setAccessible(true); fBurst.setFloat(matchScreen, 0.0001f);
                    Field fShake = MatchScreen.class.getDeclaredField("arenaShakeT"); fShake.setAccessible(true); fShake.setFloat(matchScreen, 0.22f);
                    dragSet = true;
                }
                if (("battledmg".equals(mode) || "dmgplan".equals(mode)) && !dragSet && frames > 5 && matchScreen != null) {
                    // Mo san tab SAT THUONG cua panel phai (rightTab = 1) bang reflection.
                    // frames > 5 nhu battletab: mode tran co the chup rat som khi pow no.
                    Field fRT = MatchScreen.class.getDeclaredField("rightTab"); fRT.setAccessible(true); fRT.setInt(matchScreen, 1);
                    dragSet = true;
                }
                if (("legendlist".equals(mode) || "oppmark".equals(mode) || "dmgplan".equals(mode)) && frames > 5 && matchScreen != null) {
                    // Cac mode kiem chung DANH SACH o pha chuan bi: nay danh sach mac dinh
                    // AN (chi con nut "<") nen phai mo san dang lop phu, khong thi anh
                    // chup khong con thay danh sach nua. (oppbattle/battledmg o pha tran
                    // thi panel tu hien, khong can.)
                    Field fRL2 = MatchScreen.class.getDeclaredField("rightListOpen"); fRL2.setAccessible(true); fRL2.setBoolean(matchScreen, true);
                }
                if ("menumodes".equals(mode) && !dragSet && frames > 30 && menuScreen != null) {
                    // Mo LOP CHON CHE DO o sanh bang reflection (modesOpen = true)
                    Field fMO = MenuScreen.class.getDeclaredField("modesOpen"); fMO.setAccessible(true); fMO.setBoolean(menuScreen, true);
                    dragSet = true;
                }
                if (("tabitems".equals(mode) || "tabdrag".equals(mode) || "battletab".equals(mode)) && !dragSet && frames > 5 && matchScreen != null) {
                    // frames > 5 (khong phai 50): mode tran co the chup RAT som khi pow no
                    // (playT ~0,2s) — set tab muon la anh chup van o tab mac dinh
                    // Mo san tab TRANG BI cua panel trai (panelTab = 1) bang reflection
                    Field fTab = MatchScreen.class.getDeclaredField("panelTab"); fTab.setAccessible(true); fTab.setInt(matchScreen, 1);
                    if ("tabdrag".equals(mode)) {
                        // Chuan hoa kho nhu mode itemdrag: [tpkiem, tptim, ...] — roi gia
                        // lap dang keo tpkiem (o 0) sang dung tam o 1 (tptim, ghep duoc):
                        // icon bam tro + quang khay + vien xanh o dich phai hien nhu cu.
                        // Tam o 1 theo hinh hoc panel moi: x = 16 + 48 + 24 = 88,
                        // y = 618 - 24 = 594.
                        Field fMatchD = MatchScreen.class.getDeclaredField("match");
                        fMatchD.setAccessible(true);
                        Match md = (Match) fMatchD.get(matchScreen);
                        md.human().inventory.clear();
                        md.human().inventory.add("tpkiem"); md.human().inventory.add("tptim");
                        md.human().inventory.add("tpcung"); md.human().inventory.add("tpgang");
                        Field fIdx = MatchScreen.class.getDeclaredField("dragItemIndex"); fIdx.setAccessible(true); fIdx.setInt(matchScreen, 0);
                        Field fActI = MatchScreen.class.getDeclaredField("itemDragActive"); fActI.setAccessible(true); fActI.setBoolean(matchScreen, true);
                        Field fX = MatchScreen.class.getDeclaredField("dragX"); fX.setAccessible(true); fX.setFloat(matchScreen, 88f);
                        Field fY = MatchScreen.class.getDeclaredField("dragY"); fY.setAccessible(true); fY.setFloat(matchScreen, 594f);
                    }
                    dragSet = true;
                }
                boolean fxMode = mode.startsWith("fx");
                boolean battleMode = "battle".equals(mode) || "battle4".equals(mode) || "result".equals(mode) || "resultpanel".equals(mode) || "starbattle".equals(mode) || "battleitems".equals(mode) || "battlesunset".equals(mode) || "battleice".equals(mode) || "resultlose".equals(mode) || "resultpanelbig".equals(mode) || "over".equals(mode) || "battlecard".equals(mode) || "battlecardinfo".equals(mode) || "oppbattle".equals(mode) || "battletab".equals(mode) || "battledmg".equals(mode) || "legendpickup".equals(mode) || "legendwin".equals(mode) || "legendlose".equals(mode) || "boomwin".equals(mode) || "boomlose".equals(mode) || "finisherwin".equals(mode) || "finisherlose".equals(mode) || "finishercard".equals(mode) || fxMode;
                if (battleMode && !battleStarted && frames > 30 && matchScreen != null) {
                    Method mb = MatchScreen.class.getDeclaredMethod("startBattle");
                    mb.setAccessible(true);
                    mb.invoke(matchScreen);
                    battleStarted = true;
                    if ("result".equals(mode) || "resultpanel".equals(mode) || "resultlose".equals(mode) || "resultpanelbig".equals(mode) || "over".equals(mode) || "legendwin".equals(mode) || "legendlose".equals(mode) || "boomwin".equals(mode) || "boomlose".equals(mode) || "finisherwin".equals(mode) || "finisherlose".equals(mode) || "finishercard".equals(mode)) {
                        // Tang toc playback x3 de vao pha RESULT nhanh (announcer chi keo 1,5s;
                        // Boom/ket lieu chay theo thoi gian that o pha RESULT, khong bi x3)
                        Field fs = MatchScreen.class.getDeclaredField("speed");
                        fs.setAccessible(true);
                        fs.setFloat(matchScreen, 3f);
                    }
                }
                if (("battlecard".equals(mode) || "battlecardinfo".equals(mode)) && battleStarted && !dragSet && matchScreen != null) {
                    // Mo THE TRAN tren Gogo 3 sao (uid FightUnit trung uid PlacedUnit) sau khi
                    // tran da chay; battlecardinfo mo them bang thong tin mon "vuot" tu o do.
                    Field fMatch = MatchScreen.class.getDeclaredField("match");
                    fMatch.setAccessible(true);
                    Match mm = (Match) fMatch.get(matchScreen);
                    for (com.dautruongchibi.game.Engine.PlacedUnit u : mm.human().board) {
                        if (u.defId.equals("gogo") && u.star == 3) {
                            Field fCard = MatchScreen.class.getDeclaredField("battleCardUid"); fCard.setAccessible(true);
                            fCard.set(matchScreen, u.uid);
                        }
                    }
                    if ("battlecardinfo".equals(mode)) {
                        Field fInfo = MatchScreen.class.getDeclaredField("itemInfoId"); fInfo.setAccessible(true);
                        fInfo.set(matchScreen, "vuot");
                    }
                    dragSet = true;
                }
                if ("legendpickup".equals(mode) && battleStarted && !dragSet && matchScreen != null) {
                    // Tiem DO ROI vao outcome + bat co doan nhat cau: startBattle that
                    // khong tu arm vi vong 13 PvP khong roi do. Cau dat o
                    // cellCenter(1.5, 3.5) = (525, 432) nhu code that tu tinh.
                    Field fOut = MatchScreen.class.getDeclaredField("outcome"); fOut.setAccessible(true);
                    Object oc = fOut.get(matchScreen);
                    Field fDrop = oc.getClass().getDeclaredField("droppedItem"); fDrop.setAccessible(true);
                    fDrop.set(oc, "tpkiem");
                    Field fArm = MatchScreen.class.getDeclaredField("pickupArmed"); fArm.setAccessible(true); fArm.setBoolean(matchScreen, true);
                    Field fOx = MatchScreen.class.getDeclaredField("orbX"); fOx.setAccessible(true); fOx.setFloat(matchScreen, 525f);
                    Field fOy = MatchScreen.class.getDeclaredField("orbY"); fOy.setAccessible(true); fOy.setFloat(matchScreen, 432f);
                    dragSet = true;
                }
                boolean due;
                if ("arenaclick".equals(mode) && dragSet) {
                    // Chup GIUA doan bung sao cua diem bam san (vong lan + tia sao con ro)
                    Field fBurst = MatchScreen.class.getDeclaredField("arenaBurstT"); fBurst.setAccessible(true);
                    float bt = fBurst.getFloat(matchScreen);
                    due = (bt >= 0.12f && bt <= 0.5f) || frames >= 1200;
                } else if ("legendpickup".equals(mode) && battleStarted) {
                    // Chup GIUA doan chay nhat cau: tinh linh dang o TO_ORB va da roi
                    // nha > ~90px (cau do dang hien o giua san)
                    Field fSt = MatchScreen.class.getDeclaredField("legendState"); fSt.setAccessible(true);
                    Field fX = MatchScreen.class.getDeclaredField("legendX"); fX.setAccessible(true);
                    boolean mid = "TO_ORB".equals(String.valueOf(fSt.get(matchScreen))) && fX.getFloat(matchScreen) > 370f;
                    due = mid || frames >= 2400;
                } else if ("battledmg".equals(mode) && battleStarted) {
                    // Chup MUON (playT >= 3s) de tab SAT THUONG co so lieu cong don that
                    // (chup som theo pow dau tien thi bang con rong vi chua don nao dan)
                    java.lang.reflect.Field fp = MatchScreen.class.getDeclaredField("phase");
                    fp.setAccessible(true);
                    java.lang.reflect.Field ft = MatchScreen.class.getDeclaredField("playT");
                    ft.setAccessible(true);
                    boolean inBattle = "BATTLE".equals(String.valueOf(fp.get(matchScreen)));
                    due = (inBattle && ft.getFloat(matchScreen) >= 3.0f) || frames >= 1500;
                } else if (("battlecard".equals(mode) || "battlecardinfo".equals(mode)) && battleStarted) {
                    // Chup GIUA tran khi the tran da mo va playT ~2.4s (tuong da tru mau,
                    // the phan anh trang thai song); phong ngu o frame 1500.
                    java.lang.reflect.Field fp = MatchScreen.class.getDeclaredField("phase");
                    fp.setAccessible(true);
                    java.lang.reflect.Field ft = MatchScreen.class.getDeclaredField("playT");
                    ft.setAccessible(true);
                    boolean inBattle = "BATTLE".equals(String.valueOf(fp.get(matchScreen)));
                    due = (inBattle && dragSet && ft.getFloat(matchScreen) >= 2.4f) || frames >= 1500;
                } else if (("draftflip".equals(mode) || "draftlong".equals(mode)) && dragSet) {
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
                } else if (("boomwin".equals(mode) || "boomlose".equals(mode)) && battleStarted) {
                    // Chup GIUA LOAT BOOM: pha RESULT va boomT trong 0,22..0,62s — tia
                    // sao đang bay (tia som sap cham dich, tia muon moi roi nong)
                    Field fp = MatchScreen.class.getDeclaredField("phase");
                    fp.setAccessible(true);
                    Field fBoom = MatchScreen.class.getDeclaredField("boomT");
                    fBoom.setAccessible(true);
                    boolean inResult = "RESULT".equals(String.valueOf(fp.get(matchScreen)));
                    float bt = fBoom.getFloat(matchScreen);
                    due = (inResult && bt >= 0.22f && bt <= 0.62f) || frames >= 2400;
                } else if (("finisherwin".equals(mode) || "finisherlose".equals(mode)) && battleStarted) {
                    // Chup GIUA HOAT CANH KET LIEU: finisherT dem nguoc 1,8 -> chup khi
                    // con 0,55..1,45 (tien trinh 0,35..1,25s: chu da phong to, chum sao
                    // dang toa, scrim chua mo dan)
                    Field fFin = MatchScreen.class.getDeclaredField("finisherT");
                    fFin.setAccessible(true);
                    float ft2 = fFin.getFloat(matchScreen);
                    due = (ft2 > 0.55f && ft2 <= 1.45f) || frames >= 2400;
                } else if ("finishercard".equals(mode) && battleStarted) {
                    // Chup THE KET QUA sau hoat canh: ca finisherT lan announceT deu da
                    // het (the da hien), chup nhanh trong cua so ~4s truoc khi tu chuyen
                    Field fp = MatchScreen.class.getDeclaredField("phase");
                    fp.setAccessible(true);
                    Field fa = MatchScreen.class.getDeclaredField("announceT");
                    fa.setAccessible(true);
                    Field fFin = MatchScreen.class.getDeclaredField("finisherT");
                    fFin.setAccessible(true);
                    boolean panelUp = "RESULT".equals(String.valueOf(fp.get(matchScreen)))
                        && fa.getFloat(matchScreen) <= 0 && fFin.getFloat(matchScreen) <= 0;
                    if (panelUp) panelFrames++;
                    due = panelFrames >= 12 || frames >= 2400;
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
                } else if (("result".equals(mode) || "legendwin".equals(mode) || "legendlose".equals(mode)) && battleStarted) {
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

    // Doi hinh chup THE TRAN: Gogo 3 sao deo 3 mon (vuot + tim hoan chinh, tpkiem thanh
    // phan) o hang truoc, Lulu 2 sao deo gay, Titan 1 sao; vong 13 de dich makeAiTeam
    // cung co tuong mang do (do tham/cham dich van kiem chung duoc bang the).
    static Match battleCardMatch() {
        Match m = Match.startPvp(Match.Mode.PVP_RANKED, 7, "QA Pixel");
        Match.PlayerState h = m.human();
        if (m.draftPending) m.pickDraft(0);
        if (m.augmentPending) m.pickAugment(0);
        h.level = 9;
        for (int i = 0; i < 9; i++) m.addChampion(h, "gogo");
        for (int i = 0; i < 3; i++) m.addChampion(h, "lulu");
        m.addChampion(h, "titan");
        placeByStar(m, h, "gogo", 3, 3, 0);
        placeByStar(m, h, "lulu", 2, 2, 3);
        placeByStar(m, h, "titan", 1, 4, 0);
        for (com.dautruongchibi.game.Engine.PlacedUnit u : new java.util.ArrayList<>(h.board)) {
            if (u.defId.equals("gogo")) {
                h.inventory.add("vuot"); h.inventory.add("tim"); h.inventory.add("tpkiem");
                m.equipItem(u.uid, "vuot"); m.equipItem(u.uid, "tim"); m.equipItem(u.uid, "tpkiem");
            } else if (u.defId.equals("lulu")) {
                h.inventory.add("gay");
                m.equipItem(u.uid, "gay");
            }
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

    // Doi hinh BOOM/KET LIEU khi minh thang: doi hinh sao cao (Gogo 3 sao + Lulu 2 sao
    // + Titan + Bobi) danh vong PvP 1-6 (round 6 khong phai vong PvE) — thang gan nhu
    // chac chan va con nhieu tuong song de ban Boom. finisherwin dung chung doi hinh
    // nay nhung ep doi thu vong (bot dau tien) con 2 mau de bi loai han.
    static Match boomWinMatch() {
        Match m = Match.startPvp(Match.Mode.PVP_RANKED, 7, "QA Pixel");
        Match.PlayerState h = m.human();
        if (m.draftPending) m.pickDraft(0);
        if (m.augmentPending) m.pickAugment(0);
        h.level = 9;
        for (int i = 0; i < 9; i++) m.addChampion(h, "gogo");
        for (int i = 0; i < 3; i++) m.addChampion(h, "lulu");
        m.addChampion(h, "titan");
        m.addChampion(h, "bobi");
        placeByStar(m, h, "gogo", 3, 3, 0);
        placeByStar(m, h, "lulu", 2, 2, 3);
        placeByStar(m, h, "titan", 1, 4, 0);
        placeByStar(m, h, "bobi", 1, 2, 1);
        m.round = 6;
        return m;
    }

    // Ban trong (tuong lat the nam o bench) o vong PvP 1-6 -> thua chac, dich con
    // nguyen doi hinh de ban Boom. humanHp tuy mode: 100 = boomlose (thua thuong),
    // 3 = finisherlose (thua la het mau -> bi loai han).
    static Match emptyBoardPvpMatch(int humanHp) {
        Match m = Match.startPvp(Match.Mode.PVP_RANKED, 7, "QA Pixel");
        if (m.draftPending) m.pickDraft(0);
        if (m.augmentPending) m.pickAugment(0);
        m.human().hp = humanHp;
        m.round = 6;
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
