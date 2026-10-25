package com.dautruongchibi.ui;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.InputAdapter;
import com.badlogic.gdx.InputMultiplexer;
import com.badlogic.gdx.ScreenAdapter;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.Pixmap;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.math.Vector3;
import com.badlogic.gdx.scenes.scene2d.Stage;
import com.badlogic.gdx.scenes.scene2d.ui.Label;
import com.badlogic.gdx.scenes.scene2d.ui.Table;
import com.badlogic.gdx.scenes.scene2d.ui.TextButton;
import com.badlogic.gdx.utils.viewport.FitViewport;
import com.dautruongchibi.data.FxProfile;
import com.dautruongchibi.data.GameData;
import com.dautruongchibi.data.GameData.ChampDef;
import com.dautruongchibi.data.GameData.SkillKind;
import com.dautruongchibi.game.ArenaTheme;
import com.dautruongchibi.game.Engine;
import com.dautruongchibi.game.Match;
import com.dautruongchibi.game.Rank;
import com.dautruongchibi.game.Stages;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

// Man hinh tran dau — BO CUC SAN TRAN VIEN (hoc tu Kanto Tactics + FighterZ Tactics va ban RN):
// tranh san la MOT moi truong lien mach phu kin 1280x720, moi UI la lop noi ban trong suot TREN san.
// Ban co lon o giua (o painted 84x70, sprite 100px), luoi chi mo o pha chuan bi va mo han khi giao tranh.
// Bench = hang o ngay mep duoi trong san. DIEU KHIEN hoc TFT Mobile: nut tron xanh duong goc duoi
// trai = cap + mua XP, nut tron vang goc duoi phai = vang + mo/dong SHOP (shop la lop mo/dong nam
// tren bench, reroll tron chi co trong shop, cham vung trong thi dong shop); tran TU DONG bat dau
// khi het 45s chuan bi; pha ket qua tu chuyen sau ~4s va bang sat thuong tu hien o pha do.
// Toc/he = chip nho doc mep trai; danh sach nguoi choi = hang gon mep phai; nhat ky = nut icon nho.
// Giu nguyen trinh dien: pow truyen tranh, announcer, popup trang bi, xoay gop sao, keo-tha + thung rac, VFX theo he.
public class MatchScreen extends ScreenAdapter {
    enum Phase { PLANNING, DRAFT, AUGMENT, BATTLE, RESULT, OVER }

    private final MainGame game;
    private final Match match;
    private Stage stage;
    private SpriteBatch batch;
    private ShapeRenderer shapes;
    private Phase phase = Phase.PLANNING;

    // Geometry — ban co lon giua san, bench + shop la dai duoi TREN san.
    // Ti le PAINTED (chot tu ban mau so sanh): o chu nhat 84x70 (ban 588x490, 357..945 x 152..642),
    // sprite ban/tran 100px, xem truoc dich 88px, bench o 64 sprite 56px.
    static final float BX = 357, BY = 152, CELLX = 84, CELLY = 70;
    static final float BENCH_Y = 94, BENCH_X = 357, SLOT = 64;
    // Shop la LOP MO/DONG (truong shopOpen): hang the nam o dai duoi TREN bench (y 156..238,
    // phu tam hang ban 0 khi dang mo), khong con nam sat mep duoi nhu ban cu.
    static final float SHOP_Y = 156, SHOP_X = 254, CARD_W = 148, CARD_H = 82;
    // Hai nut tron dieu khien kieu TFT Mobile (ve tay bang batch, hit-test hinh tron trong BoardInput):
    // tron xanh duoi-trai = cap + MUA XP, tron vang duoi-phai = vang + mo/dong shop.
    static final float XP_CX = 62, XP_CY = 58, XP_R = 54;
    static final float GOLD_CX = 1218, GOLD_CY = 58, GOLD_R = 54;
    // Nut LAM MOI tron vang o cuoi hang shop — chi ton tai khi shop dang mo.
    static final float REROLL_CX = 1072, REROLL_CY = SHOP_Y + CARD_H / 2, REROLL_R = 38;
    // Dem nguoc pha chuan bi: 45 giay (ban cu 90 giay — rut ngan theo dot dieu khien TFT Mobile)
    static final float PLAN_TIME = 45f;

    // HUD labels
    private Label roundLabel, goldVal, lvlVal, hpVal, msgLabel, timerLabel, logLabel, oppInfo;
    private Table invBox, playersBox, logBox;
    private Ui.GameButton logBtn;
    private boolean showLog = false;
    private boolean shopOpen = false; // lop shop dang mo hay dong (mac dinh dong nhu TFT Mobile)
    private float resultT = 0;        // dem giay o pha RESULT sau announcer: ~4s thi tu chuyen tiep
    // Chip toc/he ve tay o mep trai: {noi dung, "1" neu bac dang kich hoat}
    private final List<String[]> synChips = new ArrayList<>();

    // Selection / planning
    private String selUid;
    private boolean selFromBench;
    private String armedItem;
    // Keo-tha tuong o pha chuan bi: cham = chon (nhu cu), keo qua nguong 14px = sprite bam tro.
    private String dragUid;
    private Engine.PlacedUnit dragUnit;
    private boolean dragFromBench, dragActive;
    private float pressX, pressY, dragX, dragY;
    private static final float DRAG_THRESHOLD = 14f;
    // Tuong vua tha hut: truot ve vi tri cu trong RETURN_DUR giay (ve thay sprite tai cho trong luc truot)
    private String returnUid;
    private boolean returnFromBench;
    private float returnFromX, returnFromY, returnT = -1;
    private static final float RETURN_DUR = 0.22f;
    // Hai vung thung rac o 2 goc duoi: chi hien khi dang KEO tuong (tu ban hoac tu bench, tha vao = ban)
    private static final Rectangle TRASH_L = new Rectangle(10, 8, 190, 108);
    private static final Rectangle TRASH_R = new Rectangle(1080, 8, 190, 108);
    private float planTimeLeft = PLAN_TIME;
    private String toast = "";
    private float toastT = 0;

    // Draft (lat the)
    private int draftChosen = -1;
    private float draftElapsed = 0;
    private boolean draftApplied = false;

    // Battle playback
    private Match.FightOutcome outcome;
    private float playT = 0, speed = 1;
    private int firedIdx = 0;
    private final List<FloatText> floatTexts = new ArrayList<>();
    private final List<Glow> glows = new ArrayList<>();
    private final Map<String, Float> lastAttackAt = new HashMap<>();
    private final Map<String, float[]> lastAttackTarget = new HashMap<>();
    private final Map<String, Float> lastHitAt = new HashMap<>();
    private boolean rewardsApplied = false;
    private String overDetail = "";

    // Hieu ung theo 2 game mau: pow truyen tranh + lon nghieng (FighterZ), announcer,
    // bang sat thuong, popup trang bi mo qua (Kanto), xoay gop sao + vong chan theo sao.
    private final List<Pow> pows = new ArrayList<>();
    // Hieu ung theo HE/KY NANG tung tuong (dot VFX/SFX): BattleFx nhan su kien cast/hit/heal
    // tu fireEvents va ve particle/vet dat/set lan/beam/khien theo ho so FxProfile cua tuong.
    private final BattleFx battleFx = new BattleFx();
    private final Map<String, Float> lastHeavyHitAt = new HashMap<>();
    private final Map<String, Engine.FightUnit> unitIndex = new HashMap<>();
    private float announceT = 0; // >0: dang hien chu ho lon giua san o pha RESULT
    private String battleArenaKey = null; // khoa san chot tai startBattle (match.round da tang sau fight())
    private String popupItemId = null;
    private float popupT = 0;
    private final List<MergeFx> mergeFx = new ArrayList<>();
    private final Map<String, Integer> starSnapshot = new HashMap<>();
    private boolean snapshotReady = false;

    static final class Pow { float x, y, ttl, seed; Pow(float x, float y, float seed) { this.x = x; this.y = y; this.seed = seed; } }
    static final class MergeFx { float x, y, ttl; int star; MergeFx(float x, float y, int star) { this.x = x; this.y = y; this.star = star; } }

    // Texture tron mem + vong tron (alpha radial, sinh bang Pixmap giong whiteTex cua Assets):
    // dung cho cum may pow, vong chan theo sao va xoay gop sao (tint mau truc tiep len nen trang).
    private Texture circleTex, ringTex;
    // Dia tron canh CUNG cho 2 nut tron dieu khien (alpha 1 toi 94% ban kinh roi moi mo dan):
    // circleTex qua mem nen dia ve bang no bi mo ria nhu bong ma, phai co tex rieng.
    private Texture discTex;

    private static Texture discTexture() {
        Pixmap pm = new Pixmap(128, 128, Pixmap.Format.RGBA8888);
        for (int y = 0; y < 128; y++) for (int x = 0; x < 128; x++) {
            double d = Math.hypot(x - 63.5, y - 63.5) / 64.0;
            float al = d <= 0.94 ? 1f : (float) Math.max(0, 1 - (d - 0.94) / 0.06);
            pm.setColor(1, 1, 1, al);
            pm.drawPixel(x, y);
        }
        Texture t = new Texture(pm);
        pm.dispose();
        return t;
    }

    private static Texture radialTex(boolean ring) {
        Pixmap pm = new Pixmap(64, 64, Pixmap.Format.RGBA8888);
        for (int y = 0; y < 64; y++) for (int x = 0; x < 64; x++) {
            double d = Math.hypot(x - 31.5, y - 31.5) / 31.5;
            float a;
            if (!ring) a = d >= 1 ? 0 : d > 0.7 ? (float) (1 - (d - 0.7) / 0.3) : 1f;
            else a = (float) Math.max(0, 1 - Math.abs(d - 0.86) / 0.14);
            pm.setColor(1, 1, 1, a);
            pm.drawPixel(x, y);
        }
        Texture t = new Texture(pm);
        pm.dispose();
        return t;
    }

    static final class FloatText {
        float x, y, ttl, maxTtl, scale; String text; Color color;
        FloatText(float x, float y, String text, Color color, float scale) {
            this.x = x; this.y = y; this.text = text; this.color = color; this.scale = scale; this.ttl = 0; this.maxTtl = 0.95f;
        }
    }
    static final class Glow { float x, y, ttl; Color color; Glow(float x, float y, Color c) { this.x = x; this.y = y; this.color = c; this.ttl = 0; } }

    public MatchScreen(MainGame game, Match match) {
        this.game = game;
        this.match = match;
    }

    @Override
    public void show() {
        batch = new SpriteBatch();
        shapes = new ShapeRenderer();
        circleTex = radialTex(false);
        ringTex = radialTex(true);
        discTex = discTexture();
        stage = new Stage(new FitViewport(1280, 720), batch);
        Assets a = game.assets;

        // Thanh tren: plaque noi mong o giua-tren (vong | vang | cap | mau | thoi gian) — ShadowTable: tu do bong mem
        Table top = Ui.shadowTable(a);
        top.setPosition(260, 668);
        top.setSize(760, 48);
        top.background(Ui.plaqueBg(a));
        top.pad(2, 14, 2, 14);
        top.left();
        roundLabel = Ui.labelBig(a, "", Color.WHITE);
        goldVal = Ui.labelBig(a, "", Ui.GOLD);
        lvlVal = Ui.labelBig(a, "", Color.WHITE);
        hpVal = Ui.labelBig(a, "", new Color(1, 0.55f, 0.65f, 1));
        timerLabel = Ui.label(a, "", Ui.TEXT_DIM);
        top.add(roundLabel).padRight(14);
        top.add(iconImg(a, "coin", 20)).padRight(4);
        top.add(goldVal).padRight(14);
        top.add(iconImg(a, "star", 20)).padRight(4);
        top.add(lvlVal).padRight(14);
        top.add(iconImg(a, "heart", 20)).padRight(4);
        top.add(hpVal).padRight(14);
        top.add(timerLabel);
        stage.addActor(top);
        // Dong thong bao nam ngay duoi plaque, can giua (chi la chu, khong nen hop)
        msgLabel = Ui.label(a, "", Color.WHITE);
        msgLabel.setAlignment(com.badlogic.gdx.utils.Align.center);
        msgLabel.setPosition(290, 642);
        msgLabel.setSize(700, 22);
        stage.addActor(msgLabel);

        // Mep phai: tieu de + danh sach nguoi choi gon (khong nen hop dac), thong tin doi thu o duoi
        Label playersTitle = Ui.labelSmall(a, match.isPvp() ? "NGƯỜI CHƠI — MÁU" : "THÔNG TIN", Ui.GOLD);
        playersTitle.setPosition(1094, 646);
        playersTitle.setSize(178, 18);
        stage.addActor(playersTitle);
        playersBox = new Table();
        playersBox.setPosition(1092, 292);
        playersBox.setSize(180, 350);
        playersBox.top().align(com.badlogic.gdx.utils.Align.left);
        stage.addActor(playersBox);

        // Mep trai duoi: nhan TRANG BI + kho do (nut noi, khong hop bao)
        Label invTitle = Ui.labelSmall(a, "TRANG BỊ", Ui.GOLD);
        invTitle.setPosition(10, 454);
        invTitle.setSize(120, 18);
        stage.addActor(invTitle);
        invBox = new Table();
        invBox.setPosition(8, 264);
        invBox.setSize(200, 184);
        invBox.top().align(com.badlogic.gdx.utils.Align.left);
        stage.addActor(invBox);

        // Nhat ky: panel noi nho bat/tat bang nut icon, mac dinh tat de giua san thoang — ShadowTable: tu do bong mem
        logBox = Ui.shadowTable(a);
        logBox.setPosition(8, 168);
        logBox.setSize(336, 190);
        logBox.background(Ui.bg(a, Ui.PANEL));
        logBox.pad(8);
        logBox.top().align(com.badlogic.gdx.utils.Align.left);
        logBox.add(Ui.labelBig(a, "NHẬT KÝ", Ui.GOLD)).align(com.badlogic.gdx.utils.Align.left).row();
        logLabel = Ui.labelSmall(a, "", Ui.TEXT_DIM);
        logLabel.setWrap(true);
        logBox.add(logLabel).width(320).align(com.badlogic.gdx.utils.Align.left).row();
        logBox.setVisible(false);
        stage.addActor(logBox);

        // SO DO DIEU KHIEN MOI (TFT Mobile): khong con cum nut chu nhat o 2 goc duoi.
        // Nut tron mua XP (duoi-trai) + nut tron vang/mo shop (duoi-phai) + nut reroll tron trong
        // shop deu VE TAY bang batch (drawRoundButtons/drawShop) va xu ly cham trong BoardInput.
        // KHONG con nut "Cat ve bench": keo tuong tren ban tha vao o bench de cat (xem BoardInput keo-tha).
        // Nhat ky thu thanh nut ICON nho kin dao o mep trai (khong chu), bam de bat/tat panel.
        logBtn = Ui.iconButton(a, "book", "", Ui.BTN, a.fontSmall);
        logBtn.setPosition(14, 120);
        logBtn.setSize(42, 42);
        logBtn.addListener(changed(() -> { showLog = !showLog; logBox.setVisible(showLog); }));
        stage.addActor(logBtn);
        // Thoat: nut nho do o goc tren phai
        TextButton exitBtn = Ui.button(a, "Thoát", Ui.RED, a.fontSmall);
        exitBtn.setPosition(1186, 678);
        exitBtn.setSize(86, 32);
        exitBtn.addListener(changed(() -> game.setScreen(new MenuScreen(game))));
        stage.addActor(exitBtn);

        InputMultiplexer mux = new InputMultiplexer();
        mux.addProcessor(stage);
        mux.addProcessor(new BoardInput());
        Gdx.input.setInputProcessor(mux);
        game.sound().playBgm("battle");

        if (match.draftPending) enterDraft();
        else if (match.augmentPending) phase = Phase.AUGMENT;
        refreshPlanning();
    }

    private com.badlogic.gdx.scenes.scene2d.ui.Image iconImg(Assets a, String name, float size) {
        com.badlogic.gdx.scenes.scene2d.ui.Image im = new com.badlogic.gdx.scenes.scene2d.ui.Image(
            new com.badlogic.gdx.scenes.scene2d.utils.TextureRegionDrawable(new com.badlogic.gdx.graphics.g2d.TextureRegion(a.icon(name))));
        im.setSize(size, size);
        return im;
    }

    private com.badlogic.gdx.scenes.scene2d.utils.ChangeListener changed(Runnable r) {
        return new com.badlogic.gdx.scenes.scene2d.utils.ChangeListener() {
            @Override public void changed(ChangeEvent e, com.badlogic.gdx.scenes.scene2d.Actor actor) { r.run(); }
        };
    }

    private void toast(String msg) { toast = msg == null ? "" : msg; toastT = 3.2f; }

    private void enterDraft() {
        phase = Phase.DRAFT;
        draftChosen = -1;
        draftElapsed = 0;
        draftApplied = false;
    }

    // ---------- Cap nhat UI pha chuan bi ----------
    private void refreshPlanning() {
        Match.PlayerState h = match.human();
        String modeName;
        switch (match.mode) {
            case PVP_NORMAL: modeName = "PvP Thường"; break;
            case PVP_RANKED: modeName = "PvP Hạng"; break;
            case PVP_PRACTICE: modeName = "PvP Đấu Tập"; break;
            case WAVES: modeName = "Sóng Quái — Sóng " + match.wave; break;
            default: modeName = "Chiến Dịch — Màn " + match.campaignStageId; break;
        }
        roundLabel.setText(modeName + (match.isPvp() ? " — Vòng " + Engine.roundLabel(match.round) : ""));
        goldVal.setText(String.valueOf(h.gold));
        lvlVal.setText("Cấp " + h.level + " (" + h.xp + "/" + Engine.xpToNext(h.level) + ")");
        hpVal.setText(h.hp + " / " + Engine.HP_MAX);
        // Synergy -> chip nho doc mep trai (ve tay trong render)
        List<Engine.SynergyInfo> syns = Engine.computeSynergies(h.board);
        synChips.clear();
        if (syns.isEmpty()) synChips.add(new String[]{"Chưa có tướng trên bàn", "0"});
        for (Engine.SynergyInfo s : syns) {
            String t = GameData.traitName(s.traitId) + " " + s.count + (s.active ? " (bậc " + s.tier + ")" : "");
            synChips.add(new String[]{t, s.active ? "1" : "0"});
        }
        // Danh sach nguoi choi: hang gon mep phai (avatar tron + ten + mau), hang cua minh sang hon
        playersBox.clear();
        if (match.isPvp()) {
            Color[] dots = {new Color(0.96f, 0.77f, 0.26f, 1), new Color(0.45f, 0.8f, 1, 1), new Color(1, 0.55f, 0.65f, 1),
                new Color(0.55f, 0.95f, 0.6f, 1), new Color(0.78f, 0.62f, 1, 1), new Color(1, 0.75f, 0.4f, 1),
                new Color(0.5f, 0.9f, 0.9f, 1), new Color(0.9f, 0.7f, 0.9f, 1)};
            int idx = 0;
            for (Match.PlayerState p : match.players) {
                Table row = new Table();
                // Hang cua minh: chi mot lop vang ban trong suot rat nhe, khong hop dac
                if (p.human) row.background(Ui.bg(game.assets, new Color(1f, 0.84f, 0.3f, 0.16f)));
                row.pad(2, 4, 2, 4);
                com.badlogic.gdx.scenes.scene2d.ui.Image av = new com.badlogic.gdx.scenes.scene2d.ui.Image(
                    new com.badlogic.gdx.scenes.scene2d.utils.TextureRegionDrawable(new com.badlogic.gdx.graphics.g2d.TextureRegion(game.assets.avatarTex)));
                av.setColor(p.alive ? dots[idx % dots.length] : new Color(0.4f, 0.4f, 0.45f, 1));
                row.add(av).width(20).height(20).padRight(5);
                Label nm = Ui.labelSmall(game.assets, p.name + (p.placement > 0 ? " (hạng " + p.placement + ")" : ""), p.alive ? (p.human ? Ui.GOLD : Color.WHITE) : new Color(0.55f, 0.55f, 0.6f, 1));
                row.add(nm).expandX().align(com.badlogic.gdx.utils.Align.left);
                Label hp = Ui.labelSmall(game.assets, p.alive ? String.valueOf(p.hp) : "LOẠI", p.alive ? Color.WHITE : new Color(0.9f, 0.4f, 0.4f, 1));
                row.add(hp).align(com.badlogic.gdx.utils.Align.right);
                row.row();
                // Thanh mau mong duoi ten (bar mau, khong chi la con so)
                com.badlogic.gdx.scenes.scene2d.ui.ProgressBar.ProgressBarStyle bs = new com.badlogic.gdx.scenes.scene2d.ui.ProgressBar.ProgressBarStyle();
                bs.background = Ui.bg(game.assets, new Color(0, 0, 0, 0.55f));
                bs.knobBefore = Ui.bg(game.assets, p.alive ? new Color(0.30f, 0.85f, 0.45f, 0.95f) : new Color(0.4f, 0.4f, 0.45f, 0.9f));
                com.badlogic.gdx.scenes.scene2d.ui.ProgressBar bar = new com.badlogic.gdx.scenes.scene2d.ui.ProgressBar(0, Engine.HP_MAX, 1, false, bs);
                bar.setValue(p.alive ? p.hp : 0);
                bar.setAnimateDuration(0);
                row.add(bar).colspan(3).width(164).height(5).padTop(1);
                playersBox.add(row).width(172).padBottom(2).row();
                idx++;
            }
        }
        oppInfo = Ui.labelSmall(game.assets, "", Color.WHITE);
        oppInfo.setWrap(true);
        // Nen toi ban trong suot + bong mem sau khoi chu do tham/thong tin (truoc day la chu tran tren tranh):
        // ShadowTable nen dac alpha 0.45, padding deu 9px, chu nam gon trong khoi.
        Table oppBg = Ui.shadowTable(game.assets);
        oppBg.background(Ui.bg(game.assets, new Color(0.04f, 0.03f, 0.10f, 0.45f)));
        oppBg.pad(9);
        oppBg.add(oppInfo).width(154).align(com.badlogic.gdx.utils.Align.left);
        playersBox.add(oppBg).width(172).align(com.badlogic.gdx.utils.Align.left).padTop(4).row();
        StringBuilder ob = new StringBuilder();
        if (match.isPvp()) {
            ob.append("Đối thủ vòng này: ").append(nextOpponentText());
        } else if (match.mode == Match.Mode.WAVES) {
            ob.append("Sóng hiện tại: ").append(match.wave).append("\nMáu còn: ").append(h.hp).append("\nQuái sóng này: ").append(match.waveTeam(match.wave).size()).append(" con");
        } else {
            Stages.StageDef def = Stages.stageDef(match.campaignStageId);
            ob.append("Màn ").append(def.id).append(": ").append(def.name).append("\nChương ").append(def.chapter).append(" — ").append(Stages.chapterName(def.chapter))
              .append("\nSức mạnh địch: ").append(def.power).append("\nThưởng: ").append(def.reward).append(" điểm");
        }
        oppInfo.setText(ob.toString());
        // Log (8 dong cuoi — panel bat/tat rieng, khong chiem cot co dinh)
        List<String> lg = match.log;
        StringBuilder lb = new StringBuilder();
        for (int i = Math.max(0, lg.size() - 8); i < lg.size(); i++) lb.append(lg.get(i)).append("\n");
        logLabel.setText(lb.toString());
        rebuildInvBox();
        detectMerges();
    }

    // Phat hien gop sao de chay hieu ung xoay hop nhat: tuong moi xuat hien voi sao > 1
    // (uid moi do runCombines tao) hoac tuong cu tang sao ngay tai vi tri cua no.
    private void detectMerges() {
        Match.PlayerState h = match.human();
        List<Engine.PlacedUnit> all = new ArrayList<>(h.board);
        all.addAll(h.bench);
        if (!snapshotReady) {
            for (Engine.PlacedUnit u : all) starSnapshot.put(u.uid, u.star);
            snapshotReady = true;
            return;
        }
        Set<String> seen = new HashSet<>();
        for (Engine.PlacedUnit u : all) {
            seen.add(u.uid);
            Integer prev = starSnapshot.get(u.uid);
            boolean merged = prev == null ? u.star > 1 : u.star > prev;
            if (merged) {
                float[] p = unitScreenPos(u, h);
                if (p != null) mergeFx.add(new MergeFx(p[0], p[1], u.star));
            }
            starSnapshot.put(u.uid, u.star);
        }
        starSnapshot.keySet().retainAll(seen);
    }

    private float[] unitScreenPos(Engine.PlacedUnit u, Match.PlayerState h) {
        if (h.board.contains(u)) return cellCenter(u.x, u.y);
        int bi = h.bench.indexOf(u);
        if (bi >= 0) return new float[]{BENCH_X + bi * SLOT + (SLOT - 4) / 2f, BENCH_Y + 27};
        return null;
    }

    private String nextOpponentText() {
        if (Engine.isPveStageRound(match.round)) return "Quái PvE (" + Engine.pveEnemiesForRound(match.round).size() + " con)";
        // Do tham: hien ten + toan bo doi hinh bot se gap
        Match.PlayerState bot = match.peekNextOpponent();
        List<Engine.PlacedUnit> team = match.peekNextOpponentTeam();
        if (bot == null || team == null) return "một đối thủ bot (đội hình ẩn)";
        StringBuilder sb = new StringBuilder(bot.name).append(" — đội hình: ");
        for (int i = 0; i < team.size(); i++) {
            Engine.PlacedUnit u = team.get(i);
            if (i > 0) sb.append(", ");
            sb.append(GameData.champById(u.defId).name);
            if (u.star > 1) sb.append(" (").append(u.star).append(" sao)");
        }
        return sb.toString();
    }

    private void rebuildInvBox() {
        invBox.clear();
        Match.PlayerState h = match.human();
        if (h.inventory.isEmpty()) { invBox.add(Ui.labelSmall(game.assets, "Kho trống.", Ui.TEXT_DIM)).align(com.badlogic.gdx.utils.Align.left).row(); return; }
        Map<String, Integer> counts = new HashMap<>();
        for (String id : h.inventory) counts.put(id, counts.getOrDefault(id, 0) + 1); // khong dung Integer::sum (TeaVM chua co)
        for (Map.Entry<String, Integer> e : counts.entrySet()) {
            String id = e.getKey();
            TextButton b = Ui.button(game.assets, GameData.itemById(id).name + " x" + e.getValue(), armedItem != null && armedItem.equals(id) ? Ui.GREEN : Ui.BTN);
            b.addListener(changed(() -> { armedItem = id.equals(armedItem) ? null : id; rebuildInvBox(); }));
            invBox.add(b).width(192).padBottom(3).row();
        }
        Label hint = Ui.labelSmall(game.assets, armedItem != null ? "Đang cầm đồ: chạm 1 tướng để đeo." : "Chạm 1 món đồ rồi chạm tướng để đeo.", Ui.TEXT_DIM);
        hint.setWrap(true);
        invBox.add(hint).width(192).align(com.badlogic.gdx.utils.Align.left).row();
    }

    // ================= RENDER =================
    private final com.badlogic.gdx.graphics.g2d.GlyphLayout layout = new com.badlogic.gdx.graphics.g2d.GlyphLayout();
    private final List<float[]> projectiles = new ArrayList<>(); // {t0, ax, ay, tx, ty} toa do man hinh
    private final Map<String, float[]> lastScreenPos = new HashMap<>();

    private float[] cellCenter(double gx, double gy) {
        return new float[]{BX + (float) gx * CELLX + CELLX / 2f, BY + (float) gy * CELLY + CELLY / 2f};
    }

    // San doi theo chang (ArenaTheme): Chien Dich theo chuong, PvP/Song Quai theo stage, Boss -> hoang hon
    private String arenaKey() {
        if ((phase == Phase.BATTLE || phase == Phase.RESULT) && battleArenaKey != null) return battleArenaKey;
        switch (match.mode) {
            case CAMPAIGN: {
                Stages.StageDef def = Stages.stageDef(match.campaignStageId);
                return ArenaTheme.forCampaign(def.chapter, def.isBoss);
            }
            case WAVES:
                return ArenaTheme.forWaves(match.wave, match.wave % 10 == 0);
            default: {
                boolean boss = outcome != null && outcome.bossBattle && (phase == Phase.BATTLE || phase == Phase.RESULT);
                if (!boss) boss = Engine.isPveStageRound(match.round) && (match.round == 18 || match.round == 26);
                return ArenaTheme.forStage(Engine.stageSub(match.round)[0], boss);
            }
        }
    }

    @Override
    public void render(float delta) {
        Assets a = game.assets;
        float now = com.badlogic.gdx.utils.TimeUtils.nanoTime() / 1e9f;
        // --- Cap nhat trang thai ---
        if (toastT > 0) { toastT -= delta; msgLabel.setText(toast); }
        else if (phase == Phase.PLANNING) msgLabel.setText("Kéo tướng: lên bàn để đặt, về bench để cất, vào thùng rác để bán — hết giờ tự vào trận.");
        else if (phase == Phase.BATTLE) msgLabel.setText("Đang giao tranh với " + (outcome != null ? outcome.opponentName : "") + "...");
        if (returnT >= 0) { returnT += delta; if (returnT >= RETURN_DUR) { returnT = -1; returnUid = null; } }
        if (announceT > 0) announceT -= delta;
        if (popupT > 0) { popupT -= delta; if (popupT <= 0) popupItemId = null; }
        for (int i = mergeFx.size() - 1; i >= 0; i--) { MergeFx fx = mergeFx.get(i); fx.ttl += delta; if (fx.ttl > 0.9f) mergeFx.remove(i); }
        if (phase == Phase.PLANNING) {
            planTimeLeft -= delta;
            timerLabel.setText("Chuẩn bị: " + Math.max(0, (int) Math.ceil(planTimeLeft)) + "s");
            if (planTimeLeft <= 0) startBattle();
        } else timerLabel.setText(phase == Phase.BATTLE ? "Giao tranh: " + String.format("%.1f", playT) + "s" : "");
        if (phase == Phase.DRAFT && draftChosen >= 0 && !draftApplied) {
            draftElapsed += delta;
            if (draftElapsed > 7 * 0.13f + 0.42f + 1.5f) {
                draftApplied = true;
                toast(match.pickDraft(draftChosen));
                if (match.augmentPending) { phase = Phase.AUGMENT; }
                else { phase = Phase.PLANNING; planTimeLeft = PLAN_TIME; refreshPlanning(); }
            }
        }
        if (phase == Phase.BATTLE && outcome != null && outcome.result != null) {
            playT += delta * speed;
            fireEvents();
            for (int i = floatTexts.size() - 1; i >= 0; i--) { FloatText ft = floatTexts.get(i); ft.ttl += delta; ft.y += 30 * delta; if (ft.ttl > ft.maxTtl) floatTexts.remove(i); }
            for (int i = glows.size() - 1; i >= 0; i--) { Glow g = glows.get(i); g.ttl += delta; if (g.ttl > 0.45f) glows.remove(i); }
            for (int i = pows.size() - 1; i >= 0; i--) { Pow pw = pows.get(i); pw.ttl += delta; if (pw.ttl > 0.38f) pows.remove(i); }
            battleFx.update(delta);
            if (playT >= outcome.result.duration + 1.0f) {
                phase = Phase.RESULT;
                announceT = 1.5f; // announcer phong to giua san roi moi hien panel ket qua
                resultT = 0;
                if (outcome.droppedItem != null) { popupItemId = outcome.droppedItem; popupT = 2.3f; }
                game.sound().sfx(outcome.humanWon ? "win" : "lose");
            }
        }
        // Pha ket qua: sau announcer, tu dong chuyen tiep sau ~4 giay (cham man hinh = di ngay,
        // xu ly o BoardInput nhanh RESULT). Overlay ket thuc tran (OVER) giu nguyen nut bam.
        if (phase == Phase.RESULT && announceT <= 0) {
            resultT += delta;
            if (resultT >= 4.0f) advanceFromResult();
        }

        Gdx.gl.glClearColor(0.05f, 0.04f, 0.1f, 1);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);
        Gdx.gl.glEnable(GL20.GL_BLEND);
        // --- Nen: tranh san TRUA VIEN lien mach, chi phu mot lop toi cuc nhe cho chu de doc ---
        batch.begin();
        batch.draw(a.arenaFor(arenaKey()), 0, 0, 1280, 720);
        batch.setColor(0, 0, 0, 0.07f);
        batch.draw(a.whiteTex(), 0, 0, 1280, 720);
        batch.setColor(Color.WHITE);
        drawDepthOverlay(a);
        batch.end();
        drawBoardBase();
        // --- Don vi / bench / shop / chip toc-he ---
        batch.begin();
        battleFx.drawGround(batch, circleTex); // vet dat theo he (chay/doc/bang) nam duoi chan tuong
        if (phase == Phase.BATTLE || phase == Phase.RESULT) drawBattleUnits(now);
        else { drawPlanningUnits(now); drawBench(now); if (shopOpen && phase == Phase.PLANNING) drawShop(); }
        drawSynergyChips();
        drawMergeFx(now);
        // So sat thuong noi (phong Kanto: cam vang, chi mang to + "!")
        for (FloatText ft : floatTexts) {
            BitmapFont f = ft.scale > 1.3f ? a.fontBig : a.font;
            Color c = new Color(ft.color); c.a = Math.max(0, 1 - ft.ttl / ft.maxTtl * 0.7f);
            drawCentered(f, ft.text, ft.x, ft.y, c);
        }
        for (Glow g : glows) {
            batch.setColor(g.color.r, g.color.g, g.color.b, 0.35f * (1 - g.ttl / 0.45f));
            float r = 26 + g.ttl * 60;
            batch.draw(a.whiteTex(), g.x - r, g.y - r, r * 2, r * 2);
            batch.setColor(Color.WHITE);
        }
        drawProjectiles();
        drawPows();
        battleFx.draw(batch, a, circleTex, ringTex); // hieu ung theo he: beam/set/vom khien/particle
        batch.end();
        // --- Bong do cho khoi danh sach nguoi choi mep phai (Table khong nen, ve tay o day;
        // cac nut/plaque/panel Scene2D con lai tu do bong qua Ui.ShadowTextButton/ShadowTable) ---
        batch.begin();
        drawShadowRect(playersBox.getX(), playersBox.getY(), playersBox.getWidth(), playersBox.getHeight(), 0.30f);
        batch.end();
        // --- HUD Scene2D (plaque, nut noi, danh sach gon) ---
        stage.act(delta);
        stage.draw();
        // 2 nut tron dieu khien ve sau HUD (tren moi lop san/bench/shop) nhung duoi overlay:
        // chi o pha chuan bi — vao giao tranh la bien mat, khong con nut thua.
        if (phase == Phase.PLANNING) drawRoundButtons(now);
        // Lop keo-tha ve sau HUD de sprite bam tro + vung thung rac nam tren cung (chi pha chuan bi)
        if (phase == Phase.PLANNING) drawDragOverlay(now);
        // --- Overlay tren cung: announcer/ket qua, popup trang bi ---
        if (phase == Phase.DRAFT) drawDraftOverlay(now);
        else if (phase == Phase.AUGMENT) drawAugmentOverlay();
        else if (phase == Phase.RESULT) drawResultOverlay();
        else if (phase == Phase.OVER) drawOverOverlay();
        // Bang sat thuong TU HIEN o pha ket qua vong (sau announcer, cung luc panel ket qua) —
        // khong con nut bat/tat; du lieu van la Engine.damageChart cua tran vua dau.
        if (phase == Phase.RESULT && announceT <= 0 && outcome != null && outcome.result != null) drawDamageChart();
        if (popupT > 0 && popupItemId != null) drawItemPopup();
    }

    // Lop phu chieu sau tren san (ve ngay sau tranh san, truoc tuong/UI):
    // 1) Vet sang mem radial o vung tren san, nhuom mau theo theme, alpha rat thap (0.08–0.11).
    // 2) Vignette goc toi — texture da chua alpha toi da 0.11 (san moi nuong san ~14%, tranh cong don).
    private void drawDepthOverlay(Assets a) {
        Color glow;
        switch (arenaKey()) {
            case "sunset": glow = new Color(1f, 0.60f, 0.28f, 1); break;
            case "desert": glow = new Color(1f, 0.84f, 0.48f, 1); break;
            case "ice":    glow = new Color(0.72f, 0.88f, 1f, 1); break;
            default:       glow = new Color(1f, 0.94f, 0.70f, 1); break; // rung: am vang-xanh nhe (vang am la chu yeu)
        }
        if (a.glowTex() != null) {
            batch.setColor(glow.r, glow.g, glow.b, 0.11f);
            batch.draw(a.glowTex(), 400 - 330, 545 - 185, 660, 370);
            batch.setColor(glow.r, glow.g, glow.b, 0.08f);
            batch.draw(a.glowTex(), 905 - 245, 575 - 140, 490, 280);
        }
        batch.setColor(Color.WHITE);
        if (a.vignetteTex() != null) batch.draw(a.vignetteTex(), 0, 0, 1280, 720);
        batch.setColor(Color.WHITE);
    }

    // Bong do mem cho cac phan tu ve tay bang batch trong man tran (the shop, chip, panel overlay...).
    private void drawShadowRect(float x, float y, float w, float h) { drawShadowRect(x, y, w, h, 0.35f); }
    private void drawShadowRect(float x, float y, float w, float h, float alpha) {
        Ui.drawShadow(batch, game.assets, x, y, w, h, alpha);
    }

    private void drawCentered(BitmapFont f, String text, float cx, float y, Color color) {
        f.setColor(color);
        layout.setText(f, text);
        f.draw(batch, text, cx - layout.width / 2, y);
        f.setColor(Color.WHITE);
    }

    private void drawBorder(float x, float y, float w, float h, Color c, float th) {
        batch.setColor(c);
        batch.draw(game.assets.whiteTex(), x, y, w, th);
        batch.draw(game.assets.whiteTex(), x, y + h - th, w, th);
        batch.draw(game.assets.whiteTex(), x, y, th, h);
        batch.draw(game.assets.whiteTex(), x + w - th, y, th, h);
        batch.setColor(Color.WHITE);
    }

    // Luoi o: pha chuan bi hien MO de thay o dat tuong; vao giao tranh mo han ve ~0.
    // Khong con o nen toi sau ban co — san la mot moi truong lien mach.
    private void drawBoardBase() {
        boolean fighting = phase == Phase.BATTLE || phase == Phase.RESULT;
        float aEven = fighting ? 0.02f : 0.17f, aOdd = fighting ? 0.01f : 0.09f;
        Gdx.gl.glEnable(GL20.GL_BLEND);
        Gdx.gl.glBlendFunc(GL20.GL_SRC_ALPHA, GL20.GL_ONE_MINUS_SRC_ALPHA);
        shapes.begin(ShapeRenderer.ShapeType.Filled);
        for (int y = 0; y < 7; y++) for (int x = 0; x < 7; x++) {
            if (y < 4) shapes.setColor(0.35f, 0.55f, 1f, (x + y) % 2 == 0 ? aEven : aOdd);
            else shapes.setColor(1f, 0.4f, 0.4f, (x + y) % 2 == 0 ? aEven : aOdd);
            shapes.rect(BX + x * CELLX + 1, BY + y * CELLY + 1, CELLX - 2, CELLY - 2);
        }
        shapes.end();
        // O dang chon (planning)
        if (phase == Phase.PLANNING && selUid != null && !selFromBench) {
            for (Engine.PlacedUnit u : match.human().board) if (u.uid.equals(selUid)) {
                shapes.begin(ShapeRenderer.ShapeType.Filled);
                shapes.setColor(Ui.GOLD);
                float x = BX + u.x * CELLX, y = BY + u.y * CELLY;
                shapes.rect(x, y, CELLX, 3); shapes.rect(x, y + CELLY - 3, CELLX, 3);
                shapes.rect(x, y, 3, CELLY); shapes.rect(x + CELLX - 3, y, 3, CELLY);
                shapes.end();
            }
        }
    }

    // Chip toc/he doc mep trai: nen ban trong suot, bac kich hoat co thanh vang o mep chip.
    private void drawSynergyChips() {
        Assets a = game.assets;
        drawLeft(a.fontSmall, "TỘC / HỆ", 10, 656, Ui.GOLD);
        float top = 632;
        for (String[] chip : synChips) {
            boolean active = "1".equals(chip[1]);
            layout.setText(a.fontSmall, chip[0]);
            float w = Math.min(200, layout.width + 20);
            drawShadowRect(10, top - 24, w, 24, 0.32f);
            batch.setColor(0.07f, 0.05f, 0.15f, active ? 0.78f : 0.60f);
            batch.draw(a.whiteTex(), 10, top - 24, w, 24);
            if (active) { batch.setColor(Ui.GOLD); batch.draw(a.whiteTex(), 10, top - 24, 3, 24); }
            batch.setColor(Color.WHITE);
            drawLeft(a.fontSmall, chip[0], 19, top - 7, active ? Color.WHITE : Ui.TEXT_DIM);
            top -= 28;
            if (top < 480) break; // khong lan xuong vung trang bi
        }
    }

    private void drawLeft(BitmapFont f, String text, float x, float y, Color color) {
        f.setColor(color);
        f.draw(batch, text, x, y);
        f.setColor(Color.WHITE);
    }

    // Bong ellipse mem duoi chan tuong + sprite (ve trong cung batch)
    private void drawShadow(float cx, float cy, float w) {
        batch.setColor(0, 0, 0, 0.30f);
        batch.draw(circleTex, cx - w / 2, cy - w * 0.16f, w, w * 0.32f);
        batch.setColor(Color.WHITE);
    }

    private void drawUnitSprite(String artId, float cx, float cy, float size, int star, boolean flip, float alpha, float rotation, Color tint) {
        Assets a = game.assets;
        // Len sao = tien hoa doi hinh dang (sprite _s2/_s3) + to hon mot bac: 2 sao x1.06, 3 sao x1.12
        com.badlogic.gdx.graphics.Texture tex = a.unit(artId, star);
        float scale = star == 2 ? 1.06f : star >= 3 ? 1.12f : 1f;
        float w = size * scale, h = size * scale;
        if (tint != null) batch.setColor(tint.r, tint.g, tint.b, alpha); else batch.setColor(1, 1, 1, alpha);
        batch.draw(tex, cx - w / 2, cy - h / 2, w / 2, h / 2, w, h, flip ? -1 : 1, 1, rotation, 0, 0, tex.getWidth(), tex.getHeight(), false, false);
        batch.setColor(Color.WHITE);
    }

    private void drawBars(float cx, float cy, double hpFrac, double manaFrac, double shieldFrac, int team, int star, boolean stunned) {
        Assets a = game.assets;
        float w = 50, x = cx - w / 2, y = cy + 57;
        batch.setColor(0, 0, 0, 0.7f); batch.draw(a.whiteTex(), x - 1, y - 1, w + 2, 9);
        batch.setColor(team == 0 ? new Color(0.2f, 0.85f, 0.45f, 1) : new Color(0.95f, 0.3f, 0.3f, 1));
        batch.draw(a.whiteTex(), x, y, w * (float) Math.max(0, hpFrac), 7);
        if (shieldFrac > 0.01) { batch.setColor(0.95f, 0.95f, 1, 0.9f); batch.draw(a.whiteTex(), x, y + 8, w * (float) Math.min(1, shieldFrac), 3); }
        batch.setColor(0.25f, 0.5f, 1, 1); batch.draw(a.whiteTex(), x, y - 5, w * (float) Math.max(0, manaFrac), 3);
        batch.setColor(Color.WHITE);
        if (star >= 2) {
            // Sao cap tuong ve bang icon pixel (font game khong co glyph sao)
            float sw = 11, total = star * (sw + 1) - 1;
            batch.setColor(star >= 3 ? Ui.GOLD : new Color(0.88f, 0.92f, 0.97f, 1));
            for (int i = 0; i < star; i++) batch.draw(a.icon("star"), cx - total / 2 + i * (sw + 1), y + 13, sw, sw);
            batch.setColor(Color.WHITE);
        }
        if (stunned) {
            batch.setColor(Ui.GOLD);
            batch.draw(a.icon("star"), cx + 16 + 4 * (float) Math.sin(com.badlogic.gdx.utils.TimeUtils.nanoTime() / 2e8), y + 15, 11, 11);
            batch.setColor(Color.WHITE);
        }
    }

    private void drawPlanningUnits(float now) {
        Match.PlayerState h = match.human();
        // Xem truoc doi dich (PvE) o nua tren ban
        List<Engine.PlacedUnit> preview = null;
        if (match.mode == Match.Mode.CAMPAIGN) preview = Stages.buildStageTeam(match.campaignStageId);
        else if (match.mode == Match.Mode.WAVES) preview = match.waveTeam(match.wave);
        else if (Engine.isPveStageRound(match.round)) preview = Engine.pveEnemiesForRound(match.round);
        else if (match.isPvp()) preview = match.peekNextOpponentTeam(); // do tham PvP: xem truoc doi hinh bot
        if (preview != null) for (Engine.PlacedUnit u : preview) {
            float[] p = cellCenter(u.x, 6 - u.y);
            String art = u.isMonster && u.monster != null ? u.monster.id : u.defId;
            drawShadow(p[0], p[1] - 42, 70);
            drawGroundRing(p[0], p[1], u.star, now, u.uid.hashCode());
            drawUnitSprite(art, p[0], p[1], 88, u.star, true, 0.85f, 0, null);
            drawBars(p[0], p[1], 1, 0, 0, 1, u.star, false);
        }
        int i = 0;
        for (Engine.PlacedUnit u : h.board) {
            if (isUnitHidden(u.uid)) continue; // dang bi keo di / dang truot ve sau tha hut
            float[] p = cellCenter(u.x, u.y);
            float bob = (float) Math.sin(now * 3 + (i++) * 1.7) * 2;
            drawShadow(p[0], p[1] - 45, 78);
            drawGroundRing(p[0], p[1], u.star, now, u.uid.hashCode());
            drawUnitSprite(u.defId, p[0], p[1] + bob, 100, u.star, false, 1, 0, null);
            drawBars(p[0], p[1], 1, 0, 0, 0, u.star, false);
        }
    }

    // Vong o chan theo cap sao (phong tien hoa Kanto): 2 sao vong bac, 3 sao hao quang vang
    // chay + cham sao bay quanh chan. Vong tron ep det nam sat dat duoi chan tuong.
    private void drawGroundRing(float cx, float cy, int star, float now, int seed) {
        if (star < 2) return;
        Assets a = game.assets;
        float w = star >= 3 ? 80 : 66, h = w * 0.42f;
        float gy = cy - 41;
        if (star >= 3) {
            float pulse = 0.55f + 0.3f * (float) Math.sin(now * 5 + seed);
            batch.setColor(1f, 0.72f, 0.15f, pulse);
        } else {
            batch.setColor(0.85f, 0.9f, 0.97f, 0.8f);
        }
        batch.draw(ringTex, cx - w / 2, gy - h / 2, w, h);
        batch.setColor(Color.WHITE);
        if (star >= 3) {
            for (int i = 0; i < 3; i++) {
                double ang = now * 2.2 + seed + i * (Math.PI * 2 / 3);
                float sx = cx + (float) Math.cos(ang) * 30, sy = gy + (float) Math.sin(ang) * 9;
                batch.setColor(1f, 0.85f, 0.3f, 0.9f);
                batch.draw(a.icon("star"), sx - 5, sy - 5, 10, 10);
            }
            batch.setColor(Color.WHITE);
        }
    }

    private void drawBench(float now) {
        Assets a = game.assets;
        Match.PlayerState h = match.human();
        for (int i = 0; i < 9; i++) {
            float x = BENCH_X + i * SLOT, y = BENCH_Y;
            batch.draw(a.benchSlotTex, x, y, SLOT - 4, 52);
            if (i < h.bench.size()) {
                Engine.PlacedUnit u = h.bench.get(i);
                if (!isUnitHidden(u.uid)) { // an sprite tai cho khi dang keo / dang truot ve
                    boolean sel = u.uid.equals(selUid);
                    drawUnitSprite(u.defId, x + (SLOT - 4) / 2f, y + 27, 56, u.star, false, 1, 0, null);
                    if (u.star >= 2) {
                        float sw = 10, total = u.star * (sw + 1) - 1;
                        batch.setColor(Ui.GOLD);
                        for (int k = 0; k < u.star; k++) batch.draw(a.icon("star"), x + (SLOT - 4) / 2f - total / 2 + k * (sw + 1), y + 50, sw, sw);
                        batch.setColor(Color.WHITE);
                    }
                    if (sel) drawBorder(x, y, SLOT - 4, 52, Ui.GOLD, 3);
                }
            }
        }
        // (Phan hoi chon tuong di qua toast o dong thong bao — khong ve them dong chu de san thoang.)
    }

    private void drawShop() {
        Assets a = game.assets;
        Match.PlayerState h = match.human();
        float nowS = com.badlogic.gdx.utils.TimeUtils.nanoTime() / 1e9f;
        for (int i = 0; i < 5; i++) {
            float x = SHOP_X + i * (CARD_W + 8), y = SHOP_Y;
            String defId = i < match.shop.size() ? match.shop.get(i) : null;
            if (defId == null) {
                drawShadowRect(x, y, CARD_W, CARD_H, 0.22f);
                batch.setColor(0.62f, 0.62f, 0.68f, 0.85f);
                batch.draw(a.shopFrames[0], x, y, CARD_W, CARD_H);
                batch.setColor(Color.WHITE);
                drawCentered(a.font, "Đã bán", x + CARD_W / 2, y + CARD_H / 2 + 6, Ui.TEXT_DIM);
                continue;
            }
            ChampDef d = GameData.champById(defId);
            // The mua duoc: bong do + ep mau ve trang day du truoc khi ve (chong tint xam ro ri tu
            // the "Da ban"/phan tu ve truoc lam the mua duoc bi toi nhu the da ban).
            drawShadowRect(x, y, CARD_W, CARD_H, 0.38f);
            batch.setColor(Color.WHITE);
            batch.draw(a.shopFrames[Math.max(0, Math.min(4, d.cost - 1))], x, y, CARD_W, CARD_H);
            batch.setColor(Color.WHITE);
            batch.draw(a.unit(d.id), x + 8, y + 10, 56, 62);
            Color costColor = d.cost >= 4 ? Ui.GOLD : d.cost == 3 ? new Color(0.78f, 0.62f, 1, 1) : d.cost == 2 ? new Color(0.45f, 0.8f, 1, 1) : Color.WHITE;
            a.font.setColor(Color.WHITE);
            layout.setText(a.font, d.name, Color.WHITE, 76, com.badlogic.gdx.utils.Align.left, true);
            a.font.draw(batch, layout, x + 68, y + CARD_H - 10);
            // Gia: icon dong vang + so
            batch.draw(a.icon("coin"), x + 68, y + 7, 15, 15);
            a.font.setColor(costColor);
            a.font.draw(batch, String.valueOf(d.cost), x + 86, y + 20);
            a.font.setColor(Color.WHITE);
            // Sap gop sao (dang co dung 2 ban 1 sao cua tuong nay): vien vang nhap nhay + nhan
            int owned = 0;
            for (Engine.PlacedUnit u : h.board) if (u.defId.equals(defId) && u.star == 1) owned++;
            for (Engine.PlacedUnit u : h.bench) if (u.defId.equals(defId) && u.star == 1) owned++;
            if (owned % 3 == 2) {
                float pulse = 0.55f + 0.45f * (float) Math.sin(nowS * 5);
                drawBorder(x - 2, y - 2, CARD_W + 4, CARD_H + 4, new Color(1, 0.8f, 0.15f, pulse), 3);
                drawCentered(a.fontSmall, "Sắp gộp!", x + CARD_W - 26, y + CARD_H - 6, Ui.GOLD);
            }
        }
        drawShopOdds(a);
        drawRerollButton(a, h);
    }

    // Dong ti le odds theo bac gia o cap hien tai (du lieu GameData.SHOP_ODDS) — nam ngay tren hang the.
    private void drawShopOdds(Assets a) {
        Match.PlayerState h = match.human();
        int lvl = Math.max(1, Math.min(9, h.level));
        float oy = SHOP_Y + CARD_H + 4;
        batch.setColor(0.05f, 0.05f, 0.12f, 0.78f);
        batch.draw(a.whiteTex(), SHOP_X - 6, oy, 330, 24);
        batch.setColor(Color.WHITE);
        a.fontSmall.setColor(Ui.TEXT_DIM);
        a.fontSmall.draw(batch, "Tỉ lệ cấp " + lvl + ":", SHOP_X, oy + 17);
        String label = "Tỉ lệ cấp " + lvl + ":";
        layout.setText(a.fontSmall, label);
        float cx = SHOP_X + layout.width + 10;
        Color[] tierCols = { new Color(0.75f, 0.75f, 0.8f, 1), new Color(0.4f, 0.9f, 0.45f, 1), new Color(0.4f, 0.65f, 1, 1), new Color(0.78f, 0.5f, 1, 1), new Color(1, 0.8f, 0.2f, 1) };
        for (int c = 0; c < 5; c++) {
            batch.setColor(tierCols[c]);
            batch.draw(a.whiteTex(), cx, oy + 6, 11, 11);
            batch.setColor(Color.WHITE);
            String pct = GameData.SHOP_ODDS[lvl][c] + "%";
            a.fontSmall.setColor(Color.WHITE);
            a.fontSmall.draw(batch, pct, cx + 14, oy + 17);
            layout.setText(a.fontSmall, pct);
            cx += 14 + layout.width + 10;
        }
        a.fontSmall.setColor(Color.WHITE);
    }

    // Nut LAM MOI tron vang o cuoi hang shop (gia 2) — chi ve khi shop mo, hit-test o planningPress.
    private void drawRerollButton(Assets a, Match.PlayerState h) {
        boolean afford = h.gold >= 2;
        float d = REROLL_R * 2;
        batch.setColor(0, 0, 0, 0.35f);
        batch.draw(discTex, REROLL_CX - REROLL_R - 3, REROLL_CY - REROLL_R - 3, d, d);
        batch.setColor(afford ? new Color(0.50f, 0.34f, 0.05f, 1) : new Color(0.35f, 0.35f, 0.38f, 1));
        batch.draw(discTex, REROLL_CX - REROLL_R, REROLL_CY - REROLL_R, d, d);
        batch.setColor(afford ? new Color(0.98f, 0.78f, 0.25f, 1) : new Color(0.55f, 0.55f, 0.58f, 1));
        float in = REROLL_R - 5;
        batch.draw(discTex, REROLL_CX - in, REROLL_CY - in, in * 2, in * 2);
        batch.setColor(1, 1, 1, 0.30f);
        batch.draw(a.glowTex(), REROLL_CX - in, REROLL_CY + 2, in * 2, in - 4);
        batch.setColor(Color.WHITE);
        drawCentered(a.fontSmall, "LÀM MỚI", REROLL_CX, REROLL_CY + 15, afford ? new Color(0.35f, 0.22f, 0.02f, 1) : Ui.TEXT_DIM);
        batch.draw(a.icon("coin"), REROLL_CX - 13, REROLL_CY - 22, 13, 13);
        drawCentered(a.font, "2", REROLL_CX + 8, REROLL_CY - 9, afford ? new Color(0.35f, 0.22f, 0.02f, 1) : Ui.TEXT_DIM);
    }

    // Hai nut tron dieu khien o 2 goc duoi (chi pha chuan bi), ve bang batch sau HUD:
    // - Trai: dia xanh duong = cap + MUA XP: vong cung tien trinh XP quanh dia, huy hieu "Lv. X"
    //   de o goc duoi-phai cua dia, trong dia co nhan MUA XP + icon xu + gia 4 + dong "XP a/b".
    // - Phai: dia vang = so vang lon o giua + nhan SHOP/DONG; huy hieu lua + so streak khi
    //   dang co chuoi thang (streak >= 2). Shop dang mo thi dia co vong sang nhap nhay bao quanh.
    private void drawRoundButtons(float now) {
        Assets a = game.assets;
        Match.PlayerState h = match.human();
        // --- Vong tien trinh XP + vong bao shop-mo: ve bang ShapeRenderer truoc batch ---
        shapes.begin(ShapeRenderer.ShapeType.Filled);
        int need = Engine.xpToNext(h.level);
        float frac = h.level >= 9 ? 1f : Math.min(1f, h.xp / (float) Math.max(1, need));
        shapes.setColor(0.04f, 0.05f, 0.12f, 0.55f);
        shapes.circle(XP_CX, XP_CY, XP_R + 6);
        if (frac > 0) {
            shapes.setColor(0.35f, 0.85f, 1f, 0.95f);
            shapes.arc(XP_CX, XP_CY, XP_R + 6, 90, -360f * frac, 40);
        }
        if (shopOpen) {
            float pulse = 0.55f + 0.35f * (float) Math.sin(now * 4);
            shapes.setColor(1f, 0.82f, 0.25f, pulse);
            shapes.circle(GOLD_CX, GOLD_CY, GOLD_R + 7);
        }
        shapes.end();

        batch.begin();
        float d = XP_R * 2;
        // Dia XP: bong + vien xanh dam + mat xanh duong + gloss nua tren
        batch.setColor(0, 0, 0, 0.35f);
        batch.draw(discTex, XP_CX - XP_R - 3, XP_CY - XP_R - 3, d, d);
        batch.setColor(0.10f, 0.22f, 0.48f, 1);
        batch.draw(discTex, XP_CX - XP_R, XP_CY - XP_R, d, d);
        boolean maxLvl = h.level >= 9;
        batch.setColor(maxLvl ? new Color(0.45f, 0.48f, 0.55f, 1) : new Color(0.17f, 0.40f, 0.80f, 1));
        float in = XP_R - 5;
        batch.draw(discTex, XP_CX - in, XP_CY - in, in * 2, in * 2);
        batch.setColor(1, 1, 1, 0.28f);
        batch.draw(a.glowTex(), XP_CX - in, XP_CY + 2, in * 2, in - 4);
        batch.setColor(Color.WHITE);
        drawCentered(a.font, "MUA XP", XP_CX, XP_CY + 30, Color.WHITE);
        // Gia: icon xu + "4" mau vang
        batch.draw(a.icon("coin"), XP_CX - 15, XP_CY + 2, 15, 15);
        a.font.setColor(Ui.GOLD);
        layout.setText(a.font, "4");
        a.font.draw(batch, "4", XP_CX + 3, XP_CY + 15);
        a.font.setColor(Color.WHITE);
        drawCentered(a.fontSmall, maxLvl ? "XP MAX" : "XP " + h.xp + "/" + need, XP_CX, XP_CY - 16, new Color(0.85f, 0.92f, 1, 1));
        // Huy hieu cap: dia vang nho de goc duoi-phai dia XP, loi toi + chu "Lv. X"
        batch.setColor(0.98f, 0.78f, 0.25f, 1);
        batch.draw(discTex, XP_CX + 38 - 19, XP_CY - 38 - 19, 38, 38);
        batch.setColor(0.16f, 0.12f, 0.30f, 1);
        batch.draw(discTex, XP_CX + 38 - 16.5f, XP_CY - 38 - 16.5f, 33, 33);
        batch.setColor(Color.WHITE);
        drawCentered(a.fontSmall, "Lv." + h.level, XP_CX + 38, XP_CY - 38 + 5, Ui.GOLD);

        // Dia vang: bong + vien vang dam + mat vang + gloss
        float gd = GOLD_R * 2;
        batch.setColor(0, 0, 0, 0.35f);
        batch.draw(discTex, GOLD_CX - GOLD_R - 3, GOLD_CY - GOLD_R - 3, gd, gd);
        batch.setColor(0.50f, 0.34f, 0.05f, 1);
        batch.draw(discTex, GOLD_CX - GOLD_R, GOLD_CY - GOLD_R, gd, gd);
        batch.setColor(0.98f, 0.78f, 0.25f, 1);
        float gin = GOLD_R - 5;
        batch.draw(discTex, GOLD_CX - gin, GOLD_CY - gin, gin * 2, gin * 2);
        batch.setColor(1, 1, 1, 0.30f);
        batch.draw(a.glowTex(), GOLD_CX - gin, GOLD_CY + 2, gin * 2, gin - 4);
        batch.setColor(Color.WHITE);
        batch.draw(a.icon("coin"), GOLD_CX - 9, GOLD_CY + 16, 18, 18);
        drawCentered(a.fontTitle, String.valueOf(h.gold), GOLD_CX, GOLD_CY + 12, new Color(0.30f, 0.19f, 0.02f, 1));
        drawCentered(a.fontSmall, shopOpen ? "ĐÓNG" : "SHOP", GOLD_CX, GOLD_CY - 22, new Color(0.35f, 0.22f, 0.02f, 1));
        // Huy hieu chuoi thang: dia do de goc tren-trai dia vang + ngon lua ve tay + so streak
        if (h.streak >= 2) {
            float fx = GOLD_CX - 40, fy = GOLD_CY + 40;
            batch.setColor(0.62f, 0.10f, 0.05f, 1);
            batch.draw(discTex, fx - 17, fy - 17, 34, 34);
            batch.setColor(1, 0.45f, 0.10f, 1);
            batch.draw(a.glowTex(), fx - 11, fy - 9, 22, 20);
            batch.setColor(1, 0.85f, 0.25f, 1);
            batch.draw(a.glowTex(), fx - 6, fy - 6, 12, 12);
            batch.setColor(Color.WHITE);
            drawCentered(a.fontSmall, String.valueOf(h.streak), fx, fy + 5, Color.WHITE);
        }
        batch.end();
    }

    private static SkillKind parseKind(String s) {
        if (s == null) return null;
        try { return SkillKind.valueOf(s); } catch (Exception ex) { return null; }
    }

    // ---------- Playback tran danh tu frames/events cua engine ----------
    private void fireEvents() {
        if (outcome == null || outcome.result == null) return;
        List<Engine.BattleEvent> evs = outcome.result.events;
        while (firedIdx < evs.size() && evs.get(firedIdx).t <= playT) {
            Engine.BattleEvent e = evs.get(firedIdx++);
            switch (e.type) {
                case "attack": case "hit": {
                    boolean crit = Boolean.TRUE.equals(e.crit);
                    Engine.FightUnit atkU = e.attackerUid != null ? unitIndex.get(e.attackerUid) : null;
                    SkillKind evKind = parseKind(e.skillKind);
                    FxProfile.Fx evFx = FxProfile.of(atkU != null ? atkU.artId : null, evKind);
                    if (e.amount != null && e.amount > 0 && e.tx != null) {
                        float[] p = cellCenter(e.tx, e.ty);
                        String txt = "-" + e.amount.intValue() + (crit ? "!" : "");
                        Color c = "magic".equals(e.kind) ? new Color(0.78f, 0.62f, 1, 1) : crit ? new Color(1, 0.8f, 0.1f, 1) : new Color(1, 0.62f, 0.05f, 1);
                        floatTexts.add(new FloatText(p[0], p[1] + 34, txt, c, crit ? 1.6f : 1f));
                    }
                    // Don nang kieu truyen tranh (FighterZ): crit hoac >= 15% mau toi da cua muc tieu
                    // -> cum no "pow" + muc tieu lon nghieng (lastHeavyHitAt duoc drawBattleUnits doc)
                    if (e.amount != null && e.amount > 0 && e.targetUid != null) {
                        Engine.FightUnit tgt = unitIndex.get(e.targetUid);
                        boolean heavy = crit || (tgt != null && e.amount >= 0.15 * tgt.maxHp);
                        if (heavy) {
                            float[] tp = lastScreenPos.get(e.targetUid);
                            if (tp == null && e.tx != null) tp = cellCenter(e.tx, e.ty);
                            if (tp != null) pows.add(new Pow(tp[0], tp[1], (float) e.t));
                            lastHeavyHitAt.put(e.targetUid, (float) e.t);
                        }
                    }
                    // Impact cua ky nang: hieu ung theo he tai muc tieu (dong bang/bong doc
                    // danh dau rieng trong BattleFx de phu tong + vet dat dung thoi luong)
                    if (evKind != null && e.targetUid != null) {
                        float[] tp2 = lastScreenPos.get(e.targetUid);
                        if (tp2 == null && e.tx != null) tp2 = cellCenter(e.tx, e.ty);
                        float[] ap2 = e.attackerUid != null ? lastScreenPos.get(e.attackerUid) : null;
                        if (ap2 == null && e.ax != null) ap2 = cellCenter(e.ax, e.ay);
                        if (tp2 != null) battleFx.onSkillHit(evFx, evKind, tp2[0], tp2[1],
                            ap2 != null ? ap2[0] : tp2[0], ap2 != null ? ap2[1] : tp2[1],
                            atkU != null && atkU.star >= 3 ? 1.25f : 1f, e.targetUid, e.t);
                    }
                    if (e.attackerUid != null) {
                        lastAttackAt.put(e.attackerUid, (float) e.t);
                        if (e.tx != null) lastAttackTarget.put(e.attackerUid, new float[]{e.tx, e.ty});
                    }
                    if (e.targetUid != null) lastHitAt.put(e.targetUid, (float) e.t);
                    if (Boolean.TRUE.equals(e.ranged) && e.ax != null && e.tx != null) {
                        float[] from = cellCenter(e.ax, e.ay), to = cellCenter(e.tx, e.ty);
                        // [5] = ordinal he cua nguoi ban -> dan bay ve mau/hinh theo he do
                        projectiles.add(new float[]{(float) e.t, from[0], from[1], to[0], to[1], evFx.ordinal()});
                    }
                    break;
                }
                case "heal": {
                    if (e.amount != null && e.amount > 0 && e.tx != null) {
                        float[] p = cellCenter(e.tx, e.ty);
                        floatTexts.add(new FloatText(p[0], p[1] + 34, "+" + e.amount.intValue(), new Color(0.4f, 1, 0.5f, 1), 1f));
                        battleFx.onHeal(p[0], p[1]); // dau cong + hat sang bay len quanh dong minh duoc hoi
                    }
                    break;
                }
                case "cast": {
                    float[] p = e.attackerUid != null && lastScreenPos.containsKey(e.attackerUid) ? lastScreenPos.get(e.attackerUid) : cellCenter(e.ax == null ? 3 : e.ax, e.ay == null ? 3 : e.ay);
                    Engine.FightUnit caster = e.attackerUid != null ? unitIndex.get(e.attackerUid) : null;
                    SkillKind sk = parseKind(e.skillKind);
                    FxProfile.Fx fx = FxProfile.of(caster != null ? caster.artId : null, sk);
                    // Quang sang tai nguoi tung: mau theo HE cua tuong thay cho vang chung truoc day
                    glows.add(new Glow(p[0], p[1], FxProfile.mainColor(fx)));
                    float fxScale = caster != null && caster.star >= 3 ? 1.25f : 1f; // 3 sao: hieu ung to hon 1 bac
                    float[] tp = e.tx != null ? cellCenter(e.tx, e.ty) : p;
                    // Muc tieu trung ky nang CUNG thoi diem (su kien hit/heal co skillKind, cung
                    // nguoi tung) theo dung thu tu su kien — day la duong di cua set lan Zaza.
                    List<BattleFx.HitPos> tgts = new ArrayList<>();
                    for (int j = firedIdx; j < evs.size(); j++) {
                        Engine.BattleEvent n = evs.get(j);
                        if (n.t != e.t) break;
                        if ((!"hit".equals(n.type) && !"heal".equals(n.type)) || n.skillKind == null) continue;
                        if (e.attackerUid == null || !e.attackerUid.equals(n.attackerUid) || n.tx == null) continue;
                        float[] hp = cellCenter(n.tx, n.ty);
                        tgts.add(new BattleFx.HitPos(hp[0], hp[1], n.targetUid));
                    }
                    // Rieng Zaza: engine mo phong burst 1 muc tieu, nhung mo ta ky nang la set
                    // nhay qua 3 muc tieu -> noi them 2 dich dang tren san gan muc tieu nhat
                    // cho phan VE tia set (chi hinh anh, khong doi sat thuong mo phong).
                    if (caster != null && "zaza".equals(caster.artId) && !tgts.isEmpty()) {
                        final BattleFx.HitPos first = tgts.get(0);
                        List<Engine.FightUnit> foes = new ArrayList<>();
                        for (Engine.FightUnit u : unitIndex.values()) {
                            if (u.team == caster.team || u.uid.equals(first.uid)) continue;
                            if (lastScreenPos.containsKey(u.uid)) foes.add(u);
                        }
                        foes.sort((x, y) -> {
                            float[] px = lastScreenPos.get(x.uid), py = lastScreenPos.get(y.uid);
                            return Double.compare(Math.hypot(px[0] - first.x, px[1] - first.y), Math.hypot(py[0] - first.x, py[1] - first.y));
                        });
                        for (int i = 0; i < Math.min(2, foes.size()); i++) {
                            float[] sp = lastScreenPos.get(foes.get(i).uid);
                            tgts.add(new BattleFx.HitPos(sp[0], sp[1], foes.get(i).uid));
                        }
                    }
                    List<float[]> teamPos = null;
                    if (sk == SkillKind.buffAS && caster != null) {
                        teamPos = new ArrayList<>();
                        for (Engine.FightUnit u : unitIndex.values()) {
                            if (u.team != caster.team) continue;
                            float[] sp = lastScreenPos.get(u.uid);
                            if (sp != null) teamPos.add(sp);
                        }
                    }
                    battleFx.onCast(fx, sk, caster != null ? caster.artId : null, p[0], p[1], tp[0], tp[1], tgts, teamPos, fxScale);
                    game.sound().castFor(FxProfile.sfxKey(fx)); // tieng tung chieu theo he cua tuong
                    break;
                }
                default: break;
            }
        }
    }

    // Dan bay cua don danh xa: mau + hinh theo HE cua tuong ban (trước đây la 1 o cam
    // dung chung cho moi tuong), kem vet sang ngan phia sau. pr[5] = ordinal FxProfile.
    private void drawProjectiles() {
        if (phase != Phase.BATTLE && phase != Phase.RESULT) return;
        for (float[] pr : projectiles) {
            float k = (playT - pr[0]) / 0.18f;
            if (k < 0 || k > 1) continue;
            FxProfile.Fx fx = pr.length > 5 ? FxProfile.Fx.values()[(int) pr[5]] : FxProfile.Fx.ENERGY;
            Color main = FxProfile.mainColor(fx), acc = FxProfile.accentColor(fx);
            for (int g = 2; g >= 1; g--) { // vet sang: 2 bong mo dan phia sau vien dan
                float kg = k - g * 0.055f;
                if (kg < 0) continue;
                float gx = pr[1] + (pr[3] - pr[1]) * kg, gy = pr[2] + (pr[4] - pr[2]) * kg;
                batch.setColor(main.r, main.g, main.b, g == 2 ? 0.18f : 0.28f);
                float gr = g == 2 ? 4.5f : 6f;
                batch.draw(circleTex, gx - gr, gy - gr, gr * 2, gr * 2);
            }
            float x = pr[1] + (pr[3] - pr[1]) * k, y = pr[2] + (pr[4] - pr[2]) * k;
            if (fx == FxProfile.Fx.ICE) {
                // Manh bang: hinh thoi xoay theo huong bay
                float ang = (float) Math.toDegrees(Math.atan2(pr[4] - pr[2], pr[3] - pr[1]));
                batch.setColor(acc.r, acc.g, acc.b, 0.95f);
                batch.draw(game.assets.whiteTex(), x - 6, y - 6, 6, 6, 12, 12, 1, 1, ang + 45, 0, 0, 1, 1, false, false);
            } else if (fx == FxProfile.Fx.LIGHTNING) {
                // Vien set: loi sang rung nhe quanh duong bay
                float jx = x + (float) Math.sin(playT * 61 + pr[0] * 40) * 2.2f, jy = y + (float) Math.cos(playT * 53 + pr[0] * 31) * 2.2f;
                batch.setColor(acc.r, acc.g, acc.b, 0.95f);
                batch.draw(circleTex, jx - 5, jy - 5, 10, 10);
                batch.setColor(main.r, main.g, main.b, 0.9f);
                batch.draw(circleTex, jx - 3, jy - 3, 6, 6);
            } else {
                float r = fx == FxProfile.Fx.FIRE ? 6.5f : fx == FxProfile.Fx.PHYSICAL ? 4f : 5.5f;
                batch.setColor(main.r, main.g, main.b, 0.5f);
                batch.draw(circleTex, x - r * 1.7f, y - r * 1.7f, r * 3.4f, r * 3.4f);
                batch.setColor(acc.r, acc.g, acc.b, 0.95f);
                batch.draw(circleTex, x - r, y - r, r * 2, r * 2);
            }
            batch.setColor(Color.WHITE);
        }
    }

    // Cum no "pow" truyen tranh (FighterZ): dam may trang no ra + 5 vet toc do toa xung quanh
    private void drawPows() {
        Assets a = game.assets;
        for (Pow pw : pows) {
            float prog = pw.ttl / 0.38f;
            float alpha = Math.max(0, 1 - prog);
            // Cum may: 5 bong tron trang chong nhau, no dan theo prog
            float[][] puffs = {{0, 0, 26}, {-16, 6, 18}, {16, 8, 19}, {-8, -12, 16}, {12, -10, 15}};
            for (float[] pf : puffs) {
                float r = pf[2] * (0.5f + prog * 0.9f);
                batch.setColor(1, 1, 1, alpha * 0.92f);
                batch.draw(circleTex, pw.x + pf[0] * (0.6f + prog * 0.7f) - r, pw.y + pf[1] * (0.6f + prog * 0.7f) - r, r * 2, r * 2);
            }
            // Vet toc do: doan thang mong toa ra tu tam, dai nhat o giua doi hieu ung
            float len = 40 * (float) Math.sin(Math.min(1, prog) * Math.PI);
            for (int i = 0; i < 5; i++) {
                double ang = pw.seed * 3.7 + i * (Math.PI * 2 / 5) + 0.4;
                float dx = (float) Math.cos(ang), dy = (float) Math.sin(ang);
                float sx = pw.x + dx * 14, sy = pw.y + dy * 14;
                batch.setColor(1, 0.95f, 0.75f, alpha);
                batch.draw(a.whiteTex(), sx, sy - 1.5f, 0, 1.5f, len, 3, 1, 1, (float) Math.toDegrees(ang), 0, 0, 1, 1, false, false);
            }
            batch.setColor(Color.WHITE);
        }
    }

    // Xoay hop nhat khi gop sao (Kanto): 3 cham sao xoay bay vao tam + vong sang mo dan o chan tuong ket qua
    private void drawMergeFx(float now) {
        Assets a = game.assets;
        for (MergeFx fx : mergeFx) {
            float prog = fx.ttl / 0.9f;
            for (int i = 0; i < 3; i++) {
                double ang = i * (Math.PI * 2 / 3) + fx.ttl * 7;
                float r = 48 * (1 - prog);
                float sx = fx.x + (float) Math.cos(ang) * r, sy = fx.y + (float) Math.sin(ang) * r * 0.7f;
                batch.setColor(1, 0.9f, 0.45f, 1 - prog * 0.4f);
                batch.draw(a.icon("star"), sx - 7, sy - 7, 14, 14);
            }
            float rr = 14 + prog * 42;
            Color ring = fx.star >= 3 ? Ui.GOLD : new Color(0.9f, 0.94f, 1, 1);
            batch.setColor(ring.r, ring.g, ring.b, (1 - prog) * 0.85f);
            batch.draw(ringTex, fx.x - rr, fx.y - 28 - rr * 0.5f, rr * 2, rr);
            if (prog < 0.35f) {
                batch.setColor(1, 1, 1, (0.35f - prog) / 0.35f * 0.7f);
                float fr = 20 * (1 - prog / 0.35f) + 8;
                batch.draw(circleTex, fx.x - fr, fx.y - fr, fr * 2, fr * 2);
            }
            batch.setColor(Color.WHITE);
        }
    }

    private void drawBattleUnits(float now) {
        if (outcome == null || outcome.result == null) return;
        List<Engine.BattleFrame> frames = outcome.result.frames;
        if (frames.isEmpty()) return;
        int idx = 0;
        while (idx < frames.size() - 1 && frames.get(idx + 1).t <= playT) idx++;
        Engine.BattleFrame f1 = frames.get(idx);
        Engine.BattleFrame f2 = frames.get(Math.min(idx + 1, frames.size() - 1));
        double span = Math.max(0.0001, f2.t - f1.t);
        double al = f2 == f1 ? 0 : Math.max(0, Math.min(1, (playT - f1.t) / span));
        Map<String, Engine.FightUnit> m1 = new HashMap<>(), m2 = new HashMap<>();
        for (Engine.FightUnit u : f1.units) m1.put(u.uid, u);
        for (Engine.FightUnit u : f2.units) m2.put(u.uid, u);
        List<String> uids = new ArrayList<>(m2.keySet());
        for (String id : m1.keySet()) if (!m2.containsKey(id)) uids.add(id);
        // Ve tu xa (y lon) truoc de don vi gan de len
        uids.sort((x, y) -> {
            Engine.FightUnit ux = m2.getOrDefault(x, m1.get(x)), uy = m2.getOrDefault(y, m1.get(y));
            return Integer.compare(uy.y, ux.y);
        });
        for (String uid : uids) {
            Engine.FightUnit u1 = m1.get(uid), u2 = m2.get(uid);
            Engine.FightUnit base = u2 != null ? u2 : u1;
            boolean alive1 = u1 != null && u1.alive, alive2 = u2 != null && u2.alive;
            if (!alive1 && !alive2) continue;
            // Vi tri noi suy muot (smoothstep) giua 2 khung 0,5s; mau/mana giu tuyen tinh
            double alPos = al * al * (3 - 2 * al);
            double gx = u1 == null ? u2.x : u2 == null ? u1.x : u1.x + (u2.x - u1.x) * alPos;
            double gy = u1 == null ? u2.y : u2 == null ? u1.y : u1.y + (u2.y - u1.y) * alPos;
            double hp = u1 == null ? u2.hp : u2 == null ? u1.hp : u1.hp + (u2.hp - u1.hp) * al;
            double mana = u1 == null ? u2.mana : u2 == null ? u1.mana : u1.mana + (u2.mana - u1.mana) * al;
            double shield = u1 == null ? u2.shield : u2 == null ? u1.shield : u1.shield + (u2.shield - u1.shield) * al;
            float[] p = cellCenter(gx, gy);
            float cx = p[0], cy = p[1];
            boolean dying = alive1 && !alive2;
            float alpha = 1, rotation = 0;
            if (dying) {
                float prog = (float) Math.max(0, Math.min(1, (playT - f2.t) / 0.5));
                rotation = -80 * prog * (base.team == 0 ? 1 : -1);
                alpha = 1 - 0.75f * prog;
            } else {
                cy += (float) Math.sin(now * 3 + uid.hashCode()) * 1.6f;
                Float la = lastAttackAt.get(uid);
                if (la != null && playT - la < 0.3f && lastAttackTarget.containsKey(uid)) {
                    float[] tp = cellCenter(lastAttackTarget.get(uid)[0], lastAttackTarget.get(uid)[1]);
                    float k = (float) Math.sin((playT - la) / 0.3f * Math.PI) * 13;
                    float dx = tp[0] - cx, dy = tp[1] - cy;
                    float len = (float) Math.max(1, Math.hypot(dx, dy));
                    cx += dx / len * k; cy += dy / len * k;
                }
                // Don nang (pow) vua trung: muc tieu lon nghieng manh roi ve thang (0,35s)
                Float hh = lastHeavyHitAt.get(uid);
                if (hh != null && playT - hh < 0.35f) {
                    float k = (playT - hh) / 0.35f;
                    rotation += (float) Math.sin(k * Math.PI) * 38f * (base.team == 0 ? -1 : 1);
                }
            }
            Color tint = null;
            Float lh = lastHitAt.get(uid);
            if (lh != null && playT - lh < 0.15f) tint = new Color(1, 0.5f, 0.5f, 1);
            if (!dying && battleFx.isFrozen(uid, playT)) tint = new Color(0.62f, 0.85f, 1f, 1); // phu tong bang khi bi dong bang (Astro/Boss Bang)
            if (!dying) { drawShadow(p[0], p[1] - 47, 80); drawGroundRing(p[0], p[1], base.star, now, uid.hashCode()); }
            drawUnitSprite(base.artId, cx, cy, 100, base.star, base.team == 1, alpha, rotation, tint);
            lastScreenPos.put(uid, new float[]{cx, cy});
            if (!dying) drawBars(cx, cy, hp / Math.max(1, base.maxHp), mana / Math.max(1, base.maxMana), shield / Math.max(1, base.maxHp), base.team, base.star, base.stun > 0);
            if (!dying && base.stun > 0) battleFx.drawStunStars(batch, game.assets.icon("star"), cx, cy + 70, now); // sao xoay quanh dau khi choang/dong bang
        }
    }

    // ================= OVERLAYS =================
    // Announcer kieu FighterZ: chu ho lon font Baloo phong len giua san roi tan dan,
    // kem banner nho chua thong tin sat thuong/mau cua vong vua dau.
    private void drawAnnouncer() {
        Assets a = game.assets;
        float prog = 1 - announceT / 1.5f; // 0 -> 1
        float scale = prog < 0.22f ? 0.45f + 2.9f * prog * (1.12f - prog) : 1.05f - 0.05f * Math.min(1, prog); // phong qua 1.0 roi ve ~1 (overshoot nhe)
        float alpha = announceT < 0.35f ? Math.max(0, announceT / 0.35f) : 1f;
        String text = outcome.bossBattle && outcome.humanWon ? "HẠ GỤC BOSS!" : outcome.humanWon ? "THẮNG!" : "THUA!";
        Color c = outcome.humanWon ? new Color(0.35f, 0.95f, 0.5f, alpha) : new Color(1, 0.4f, 0.4f, alpha);
        a.fontTitle.getData().setScale(scale);
        drawCentered(a.fontTitle, text, 640, 486, c);
        a.fontTitle.getData().setScale(1f);
        // Banner nho di kem: tom tat vong + thay doi mau
        drawShadowRect(390, 268, 500, 58, 0.35f);
        a.patchPlaque.draw(batch, 390, 268, 500, 58);
        String sub = outcome.summary + (outcome.humanHpDelta != 0 ? "  •  Máu còn: " + match.human().hp : "");
        drawCentered(a.font, sub, 640, 306, Color.WHITE);
    }

    // Bang sat thuong theo tuong cua tran vua dau (ca 2 ben) — panel noi sat mep phai san
    // (nam ngay trai cot nguoi choi gon), bat/tat bang nut "Bang sat thuong". Du lieu tu Engine.damageChart.
    private void drawDamageChart() {
        Assets a = game.assets;
        List<Engine.DamageRow> rows = Engine.damageChart(outcome.result);
        if (rows.isEmpty()) return;
        batch.begin();
        int n = Math.min(rows.size(), 14);
        float pw = 302, ph = 52 + n * 26;
        float px = 782, py = 654 - ph;
        drawShadowRect(px, py, pw, ph, 0.40f);
        a.patchPanel.draw(batch, px, py, pw, ph);
        drawCentered(a.fontBig, "SÁT THƯƠNG CỦA TRẬN", px + pw / 2, py + ph - 16, Ui.GOLD);
        double max = Math.max(1, rows.get(0).damage);
        for (int i = 0; i < n; i++) {
            Engine.DamageRow r = rows.get(i);
            float ry = py + ph - 48 - i * 26;
            batch.draw(a.unit(r.artId, r.star), px + 10, ry - 15, 20, 20);
            String nm = r.name + (r.star > 1 ? " (" + r.star + " sao)" : "");
            a.fontSmall.setColor(r.team == 0 ? new Color(0.45f, 0.95f, 0.6f, 1) : new Color(1, 0.55f, 0.55f, 1));
            layout.setText(a.fontSmall, nm, a.fontSmall.getColor(), 118, com.badlogic.gdx.utils.Align.left, true);
            a.fontSmall.draw(batch, layout, px + 36, ry + 4);
            batch.setColor(0, 0, 0, 0.55f);
            batch.draw(a.whiteTex(), px + 160, ry - 10, 92, 10);
            batch.setColor(r.team == 0 ? new Color(0.3f, 0.85f, 0.45f, 1) : new Color(0.95f, 0.35f, 0.35f, 1));
            batch.draw(a.whiteTex(), px + 160, ry - 10, 92 * (float) (r.damage / max), 10);
            batch.setColor(Color.WHITE);
            a.fontSmall.setColor(Color.WHITE);
            a.fontSmall.draw(batch, String.valueOf((int) r.damage), px + 258, ry + 4);
        }
        a.fontSmall.setColor(Color.WHITE);
        batch.end();
    }

    // Popup nhan trang bi kieu mo qua (Kanto): the nay vao giua-phai san ~2,3s khi PvE roi do
    private void drawItemPopup() {
        GameData.ItemDef it = GameData.itemById(popupItemId);
        if (it == null) return;
        Assets a = game.assets;
        float elapsed = 2.3f - popupT;
        float pop = elapsed < 0.18f ? 0.55f + 0.45f * (elapsed / 0.18f) : 1f;
        float pw = 252 * pop, ph = 96 * pop;
        float cxp = 838, cyp = 384;
        batch.begin();
        drawShadowRect(cxp - pw / 2, cyp - ph / 2, pw, ph, 0.40f);
        a.patchPanel.draw(batch, cxp - pw / 2, cyp - ph / 2, pw, ph);
        if (pop > 0.8f) {
            drawCentered(a.fontSmall, "NHẬN TRANG BỊ!", cxp, cyp + 40, Ui.GOLD);
            batch.setColor(Color.valueOf(it.color));
            batch.draw(circleTex, cxp - 86, cyp - 26, 30, 30);
            batch.setColor(Color.WHITE);
            a.fontBig.setColor(Color.WHITE);
            layout.setText(a.fontBig, it.name, Color.WHITE, 160, com.badlogic.gdx.utils.Align.left, true);
            a.fontBig.draw(batch, layout, cxp - 48, cyp + 12);
            drawCentered(a.fontSmall, it.desc, cxp + 8, cyp - 22, Ui.TEXT_DIM);
        }
        batch.end();
    }

    private Rectangle draftRect(int i) { return new Rectangle(65 + i * (128 + 18), 268, 128, 184); }

    private void drawDraftOverlay(float now) {
        Assets a = game.assets;
        batch.begin();
        batch.setColor(0.02f, 0.02f, 0.07f, 0.55f);
        batch.draw(a.whiteTex(), 0, 0, 1280, 720);
        batch.setColor(Color.WHITE);
        drawCentered(a.fontTitle, "LẬT THẺ ÚP MỞ TRẬN", 640, 560, Ui.GOLD);
        drawCentered(a.font, draftChosen < 0 ? "8 thẻ úp — chạm 1 thẻ để chọn tướng + trang bị kèm theo!" : "Đang lật thẻ...", 640, 516, Color.WHITE);
        for (int i = 0; i < match.draftOptions.size() && i < 8; i++) {
            Rectangle r = draftRect(i);
            Engine.CarouselOption opt = match.draftOptions.get(i);
            float prog;
            if (draftChosen < 0) prog = 0;
            else prog = (float) Math.max(0, Math.min(1, (draftElapsed - Math.abs(i - draftChosen) * 0.13f) / 0.42f));
            float sx = Math.abs((float) Math.cos(prog * Math.PI));
            float w = r.width * Math.max(0.08f, sx);
            float cx = r.x + r.width / 2;
            drawShadowRect(r.x, r.y, r.width, r.height, 0.30f);
            if (prog < 0.5f) {
                batch.draw(a.cardBack, cx - w / 2, r.y, w, r.height);
            } else {
                a.patchCardFront.draw(batch, cx - w / 2, r.y, w, r.height);
                if (sx > 0.55f) {
                    ChampDef d = GameData.champById(opt.defId);
                    batch.draw(a.unit(d.id), cx - 30, r.y + 74, 60, 66);
                    drawCentered(a.fontSmall, d.name, cx, r.y + 62, new Color(0.12f, 0.1f, 0.2f, 1));
                    drawCentered(a.fontSmall, d.cost + " vàng", cx, r.y + 44, new Color(0.45f, 0.35f, 0.05f, 1));
                    drawCentered(a.fontSmall, "+ " + GameData.itemById(opt.item).name, cx, r.y + 26, new Color(0.2f, 0.4f, 0.75f, 1));
                }
            }
            if (i == draftChosen && prog >= 1) drawBorder(r.x - 4, r.y - 4, r.width + 8, r.height + 8, Ui.GOLD, 4);
            else if (draftChosen < 0) {
                float pulse = 2 + (float) Math.sin(now * 2.4 + i) * 1.2f;
                drawBorder(r.x - 2, r.y - 2, r.width + 4, r.height + 4, new Color(0.5f, 0.42f, 0.8f, 0.6f), Math.max(1.5f, pulse));
            }
        }
        batch.end();
    }

    private Rectangle augmentRect(int i) { return new Rectangle(136 + i * (320 + 24), 288, 320, 204); }

    private void drawAugmentOverlay() {
        Assets a = game.assets;
        batch.begin();
        batch.setColor(0.02f, 0.02f, 0.07f, 0.60f);
        batch.draw(a.whiteTex(), 0, 0, 1280, 720);
        batch.setColor(Color.WHITE);
        drawCentered(a.fontTitle, "CHỌN CƯỜNG HÓA", 640, 560, Ui.GOLD);
        drawCentered(a.font, "Cường hóa áp dụng cho cả trận — chọn khôn ngoan nhé!", 640, 516, Color.WHITE);
        if (match.augmentOptions != null) for (int i = 0; i < match.augmentOptions.size(); i++) {
            Rectangle r = augmentRect(i);
            GameData.AugmentDef def = GameData.augmentById(match.augmentOptions.get(i));
            drawShadowRect(r.x, r.y, r.width, r.height, 0.40f);
            a.patchPanel.draw(batch, r.x, r.y, r.width, r.height);
            drawCentered(a.fontBig, def.name, r.x + r.width / 2, r.y + r.height - 26, Ui.GOLD);
            a.font.setColor(Color.WHITE);
            layout.setText(a.font, def.desc, Color.WHITE, r.width - 36, com.badlogic.gdx.utils.Align.center, true);
            a.font.draw(batch, layout, r.x + 18, r.y + r.height - 66);
            a.font.setColor(Color.WHITE);
        }
        batch.end();
    }

    // Panel ket qua vong nam LECH TRAI (tam x=451) de phia phai san danh cho bang sat thuong
    // tu hien cung luc. Khong con nut "Tiep tuc": pha RESULT tu chuyen sau ~4s, cham = chuyen ngay.
    private static final float RESULT_CX = 451;
    private void drawResultOverlay() {
        Assets a = game.assets;
        batch.begin();
        if (announceT > 0 && outcome != null) {
            // Announcer dang chay: chi hien chu ho + banner nho tren nen san (khong che panel)
            drawAnnouncer();
            batch.end();
            return;
        }
        batch.setColor(0.02f, 0.02f, 0.07f, 0.55f);
        batch.draw(a.whiteTex(), 0, 0, 1280, 720);
        batch.setColor(Color.WHITE);
        drawShadowRect(216, 200, 470, 330, 0.42f);
        a.patchPanel.draw(batch, 216, 200, 470, 330);
        if (outcome != null) {
            drawCentered(a.fontTitle, outcome.bossBattle && outcome.humanWon ? "HẠ GỤC BOSS!" : outcome.humanWon ? "THẮNG!" : "THUA!", RESULT_CX, 500, outcome.humanWon ? new Color(0.35f, 0.95f, 0.5f, 1) : new Color(1, 0.4f, 0.4f, 1));
            // Tom tat vong: chu to neu vua panel 470, dai qua thi ha xuong font thuong
            layout.setText(a.fontBig, outcome.summary);
            if (layout.width <= 430) drawCentered(a.fontBig, outcome.summary, RESULT_CX, 448, Color.WHITE);
            else drawCentered(a.font, outcome.summary, RESULT_CX, 448, Color.WHITE);
            drawCentered(a.font, "Đối thủ: " + outcome.opponentName, RESULT_CX, 414, Ui.TEXT_DIM);
            if (outcome.humanHpDelta != 0) drawCentered(a.font, "Máu thay đổi: " + outcome.humanHpDelta + "  •  Máu còn: " + match.human().hp, RESULT_CX, 382, Color.WHITE);
            if (outcome.droppedItem != null) drawCentered(a.font, "Trang bị rơi: " + GameData.itemById(outcome.droppedItem).name + " (đã vào kho)", RESULT_CX, 350, Ui.GOLD);
            if (match.mode == Match.Mode.CAMPAIGN || match.mode == Match.Mode.WAVES) drawCentered(a.fontSmall, match.endMessage, RESULT_CX, 322, Ui.TEXT_DIM);
        }
        int remain = Math.max(0, (int) Math.ceil(4.0f - resultT));
        drawCentered(a.fontSmall, match.over ? "Chạm để xem kết quả cuối" : "Tự tiếp tục sau " + remain + "s — chạm để đi ngay", RESULT_CX, 238, Ui.TEXT_DIM);
        batch.end();
    }

    private final Rectangle overMenuBtn = new Rectangle(352, 224, 200, 54);
    private final Rectangle overAgainBtn = new Rectangle(728, 224, 200, 54);
    private void drawOverOverlay() {
        Assets a = game.assets;
        batch.begin();
        batch.setColor(0.02f, 0.02f, 0.07f, 0.70f);
        batch.draw(a.whiteTex(), 0, 0, 1280, 720);
        batch.setColor(Color.WHITE);
        drawShadowRect(300, 180, 680, 380, 0.42f);
        a.patchPanel.draw(batch, 300, 180, 680, 380);
        drawCentered(a.fontTitle, "KẾT THÚC", 640, 528, Ui.GOLD);
        a.font.setColor(Color.WHITE);
        layout.setText(a.font, match.endMessage, Color.WHITE, 600, com.badlogic.gdx.utils.Align.center, true);
        a.font.draw(batch, layout, 340, 486);
        a.fontSmall.setColor(Ui.TEXT_DIM);
        layout.setText(a.fontSmall, overDetail, Ui.TEXT_DIM, 600, com.badlogic.gdx.utils.Align.center, true);
        a.fontSmall.draw(batch, layout, 340, 446);
        a.font.setColor(Color.WHITE); a.fontSmall.setColor(Color.WHITE);
        drawShadowRect(overMenuBtn.x, overMenuBtn.y, overMenuBtn.width, overMenuBtn.height, 0.35f);
        drawShadowRect(overAgainBtn.x, overAgainBtn.y, overAgainBtn.width, overAgainBtn.height, 0.35f);
        a.patchBtn[0].draw(batch, overMenuBtn.x, overMenuBtn.y, overMenuBtn.width, overMenuBtn.height);
        a.patchBtnPrimary[0].draw(batch, overAgainBtn.x, overAgainBtn.y, overAgainBtn.width, overAgainBtn.height);
        drawCentered(a.fontBig, "Về menu", 452, overMenuBtn.y + 38, Color.WHITE);
        drawCentered(a.fontBig, match.mode == Match.Mode.CAMPAIGN ? "Chọn màn" : "Chơi lại", 828, overAgainBtn.y + 38, Color.WHITE);
        batch.end();
    }

    // ================= LOGIC CHUYEN PHA =================
    private void startBattle() {
        if (phase != Phase.PLANNING) return;
        if (match.human().board.isEmpty()) toast("Đội hình trống — vẫn vào trận (sẽ thua chắc).");
        battleArenaKey = arenaKey(); // chot san cua VONG SAP DAU truoc khi fight() tang round
        outcome = match.fight();
        shopOpen = false; // vao giao tranh: lop shop tu dong (nut Toc do da bo — speed chi con la bien noi bo cho cong cu chup)
        playT = 0; firedIdx = 0; speed = 1;
        floatTexts.clear(); glows.clear(); projectiles.clear(); pows.clear(); battleFx.clear();
        lastAttackAt.clear(); lastAttackTarget.clear(); lastHitAt.clear(); lastScreenPos.clear(); lastHeavyHitAt.clear();
        // Chi muc don vi toan tran (gom ca golem trieu hoi xuat hien giua tran) cho nguong don nang 15%
        unitIndex.clear();
        if (outcome != null && outcome.result != null) for (Engine.BattleFrame f : outcome.result.frames) for (Engine.FightUnit u : f.units) unitIndex.put(u.uid, u);
        selUid = null; armedItem = null;
        dragUid = null; dragUnit = null; dragActive = false; returnT = -1; returnUid = null;
        if (outcome == null || outcome.result == null) { phase = Phase.RESULT; return; }
        game.sound().sfx("start");
        phase = Phase.BATTLE;
    }

    private void advanceFromResult() {
        if (match.over) { enterOver(); return; }
        if (match.draftPending) { enterDraft(); return; }
        if (match.augmentPending) { phase = Phase.AUGMENT; return; }
        phase = Phase.PLANNING;
        planTimeLeft = PLAN_TIME; resultT = 0; selUid = null; armedItem = null;
        refreshPlanning();
    }

    private void enterOver() {
        phase = Phase.OVER;
        if (rewardsApplied) return;
        rewardsApplied = true;
        switch (match.mode) {
            case PVP_RANKED: case PVP_NORMAL: case PVP_PRACTICE: {
                boolean ranked = match.mode == Match.Mode.PVP_RANKED;
                Rank.LpResult r = game.profile.applyMatchResult(match.humanPlacement, ranked);
                overDetail = "Thứ hạng: " + match.humanPlacement + "/8\n"
                    + (ranked ? "Rank LP: " + (r.delta >= 0 ? "+" : "") + r.delta + (r.promoted ? " — THĂNG HẠNG!" : r.demoted ? " — Xuống hạng" : "") + "\nHạng hiện tại: " + game.profile.rankLabel()
                              : "Chế độ này không tính rank LP (chỉ cộng XP + thống kê).")
                    + "\nSố trận: " + game.profile.matches + " — Top 1: " + game.profile.top1 + " lần";
                break;
            }
            case WAVES: {
                int cleared = Math.max(0, match.wave - 1);
                game.profile.wavesBest = Math.max(game.profile.wavesBest, cleared);
                overDetail = "Bạn dọn được " + cleared + " sóng quái.\nKỷ lục Sóng Quái hiện tại: " + game.profile.wavesBest;
                break;
            }
            case CAMPAIGN: {
                if (match.campaignWon) game.profile.campaignCleared = Math.max(game.profile.campaignCleared, match.campaignStageId);
                overDetail = match.campaignWon ? "Đã ghi nhận qua màn " + match.campaignStageId + " vào hồ sơ.\nTiến độ chiến dịch: " + game.profile.campaignCleared + " màn"
                                               : "Chưa qua màn này — thử đội hình khác rồi quay lại nhé.";
                break;
            }
        }
        game.saveProfile();
    }

    private void playAgain() {
        long seed = (System.currentTimeMillis() % 100000) + 47;
        switch (match.mode) {
            case CAMPAIGN: game.setScreen(new CampaignScreen(game)); break;
            case WAVES: game.setScreen(new MatchScreen(game, Match.startWaves(seed, game.profile.name))); break;
            default: game.setScreen(new MatchScreen(game, Match.startPvp(match.mode, seed, game.profile.name))); break;
        }
    }

    // ================= INPUT =================
    private final class BoardInput extends InputAdapter {
        @Override
        public boolean touchDown(int screenX, int screenY, int pointer, int button) {
            Vector3 v = stage.getViewport().unproject(new Vector3(screenX, screenY, 0));
            float x = v.x, y = v.y;
            switch (phase) {
                case DRAFT: {
                    if (draftChosen >= 0) return true;
                    for (int i = 0; i < match.draftOptions.size() && i < 8; i++) {
                        if (draftRect(i).contains(x, y)) { draftChosen = i; draftElapsed = 0; game.sound().sfx("sparkle"); return true; }
                    }
                    return true;
                }
                case AUGMENT: {
                    if (match.augmentOptions != null) for (int i = 0; i < match.augmentOptions.size(); i++) {
                        if (augmentRect(i).contains(x, y)) {
                            toast(match.pickAugment(i));
                            game.sound().sfx("levelup");
                            phase = Phase.PLANNING; planTimeLeft = PLAN_TIME; refreshPlanning();
                            return true;
                        }
                    }
                    return true;
                }
                case RESULT: advanceFromResult(); return true; // cham bat ky dau o pha ket qua = chuyen ngay
                case OVER: {
                    if (overMenuBtn.contains(x, y)) { game.setScreen(new MenuScreen(game)); return true; }
                    if (overAgainBtn.contains(x, y)) { playAgain(); return true; }
                    return true;
                }
                case BATTLE: return false;
                case PLANNING: return planningPress(x, y);
                default: return false;
            }
        }

        @Override
        public boolean touchDragged(int screenX, int screenY, int pointer) {
            if (pointer != 0 || phase != Phase.PLANNING || dragUid == null) return false;
            Vector3 v = stage.getViewport().unproject(new Vector3(screenX, screenY, 0));
            dragX = v.x; dragY = v.y;
            if (!dragActive && Math.hypot(dragX - pressX, dragY - pressY) > DRAG_THRESHOLD) dragActive = true;
            return dragActive;
        }

        @Override
        public boolean touchUp(int screenX, int screenY, int pointer, int button) {
            if (pointer != 0 || phase != Phase.PLANNING || dragUid == null) return false;
            Vector3 v = stage.getViewport().unproject(new Vector3(screenX, screenY, 0));
            dragX = v.x; dragY = v.y;
            if (dragActive) resolveDragDrop(); else applyTapSelection();
            dragUid = null; dragUnit = null; dragActive = false;
            return true;
        }
    }

    // Nhan xuong o pha chuan bi theo SO DO DIEU KHIEN MOI, thu tu uu tien:
    // 1) Lop shop (chi khi dang mo): the tuong -> mua ngay (shop van mo sau khi mua);
    //    nut reroll tron o cuoi hang -> lam moi. Reroll KHONG ton tai khi shop dong.
    // 2) 2 nut tron goc duoi: tron XP -> mua XP; tron vang -> MO/DONG shop.
    // 3) Dang cam do -> luong cham cu (planningClick).
    // 4) Tuong o bench/ban -> UNG VIEN KEO (cham thuong se chon o touchUp, keo qua nguong thi keo that).
    // 5) Khong cham gi ca (vung san trong) -> neu shop dang mo thi DONG SHOP (dung y user:
    //    "bam vao man hinh trong ben duoi (ben tren shop) la tat shop"), con khong thi bo chon.
    private boolean planningPress(float x, float y) {
        Match.PlayerState h = match.human();
        if (shopOpen) {
            for (int i = 0; i < 5; i++) {
                Rectangle r = new Rectangle(SHOP_X + i * (CARD_W + 8), SHOP_Y, CARD_W, CARD_H);
                if (r.contains(x, y)) { toast(match.buy(i)); if (match.shop.get(i) == null) game.sound().sfx("coin"); refreshPlanning(); return true; }
            }
            if (Math.hypot(x - REROLL_CX, y - REROLL_CY) <= REROLL_R + 4) {
                int g0 = h.gold; toast(match.reroll()); if (h.gold < g0) game.sound().sfx("reroll");
                refreshPlanning(); return true;
            }
        }
        if (Math.hypot(x - XP_CX, y - XP_CY) <= XP_R + 4) {
            int g0 = h.gold, lv0 = h.level; toast(match.buyXp());
            if (h.level > lv0) game.sound().sfx("levelup"); else if (h.gold < g0) game.sound().sfx("coin");
            refreshPlanning(); return true;
        }
        if (Math.hypot(x - GOLD_CX, y - GOLD_CY) <= GOLD_R + 4) {
            shopOpen = !shopOpen;
            game.sound().sfx("click");
            return true;
        }
        if (armedItem != null) return planningClick(x, y);
        for (int i = 0; i < 9; i++) {
            Rectangle r = new Rectangle(BENCH_X + i * SLOT, BENCH_Y, SLOT - 4, 52);
            if (r.contains(x, y) && i < h.bench.size()) { beginDragCandidate(h.bench.get(i), true, x, y); return true; }
        }
        int cx = cellXAt(x), cy = cellYAt(y);
        if (cx >= 0 && cx < 7 && cy >= 0 && cy < 4) {
            for (Engine.PlacedUnit u : h.board) if (u.x == cx && u.y == cy) {
                // Dang co tuong khac dang chon ma cham vao o co tuong: giu hanh vi cu (doi cho theo cham)
                if (selUid != null && !selUid.equals(u.uid)) return planningClick(x, y);
                beginDragCandidate(u, false, x, y);
                return true;
            }
            if (selUid != null) return planningClick(x, y); // o trong + dang co tuong chon: dat theo cham nhu cu
            // O ban trong, khong co gi dang chon -> roi xuong nhanh dong shop o duoi
        }
        boolean handled = planningClick(x, y);
        if (!handled && shopOpen) { shopOpen = false; game.sound().sfx("click"); return true; }
        return handled;
    }

    private void beginDragCandidate(Engine.PlacedUnit u, boolean fromBench, float x, float y) {
        dragUid = u.uid; dragUnit = u; dragFromBench = fromBench;
        pressX = dragX = x; pressY = dragY = y; dragActive = false;
    }

    // Cham thuong (khong keo) vao tuong: chon tuong nhu hanh vi cu
    private void applyTapSelection() {
        if (dragUnit == null) return;
        selUid = dragUnit.uid; selFromBench = dragFromBench;
        String nm = GameData.champById(dragUnit.defId).name;
        toast(dragFromBench
            ? "Đã chọn " + nm + " (bench) — kéo lên bàn hoặc chạm ô bàn cờ để đặt."
            : "Đã chọn " + nm + " — kéo để xếp lại (về bench = cất, xuống góc thùng rác = bán), hoặc chạm ô khác để dời.");
        refreshPlanning();
    }

    // Quy toa do man hinh -> o ban: PHAI dung floor (khong dung (int) cat ve 0,
    // neu khong diem nam tren/tren hang bench se bi nhan nham thanh o ban hang 0)
    private int cellXAt(float x) { return (int) Math.floor((x - BX) / CELLX); }
    private int cellYAt(float y) { return (int) Math.floor((y - BY) / CELLY); }

    private int benchSlotAt(float x, float y) {
        for (int i = 0; i < 9; i++) {
            Rectangle r = new Rectangle(BENCH_X + i * SLOT, BENCH_Y, SLOT - 4, 52);
            if (r.contains(x, y)) return i;
        }
        return -1;
    }

    private boolean trashContains(float x, float y) { return TRASH_L.contains(x, y) || TRASH_R.contains(x, y); }

    // Tha tuong dang keo: thu tu uu tien thung rac -> o ban -> o bench; hut thi truot ve cho cu
    private void resolveDragDrop() {
        Match.PlayerState h = match.human();
        Engine.PlacedUnit u = dragUnit;
        if (u == null) return;
        boolean ok = false;
        // Ban bang keo vao thung rac ap dung cho ca tuong tu bench (nut "Ban tuong chon" da bo
        // khoi so do dieu khien moi — keo-tha la duong ban duy nhat).
        if (trashContains(dragX, dragY)) {
            int g0 = h.gold;
            toast(match.sell(u.uid));
            if (h.gold > g0) { game.sound().sfx("sell"); ok = true; }
        }
        if (!ok) {
            int cx = cellXAt(dragX), cy = cellYAt(dragY);
            if (cx >= 0 && cx < 7 && cy >= 0 && cy < 4) {
                if (dragFromBench) { toast(match.moveBenchToBoard(u.uid, cx, cy)); ok = h.board.contains(u); }
                else { toast(match.moveOnBoard(u.uid, cx, cy)); ok = h.board.contains(u); }
                if (ok) game.sound().sfx("place");
            } else {
                int slot = benchSlotAt(dragX, dragY);
                if (slot >= 0) {
                    if (dragFromBench) { toast(match.moveOnBench(u.uid, slot)); ok = h.bench.contains(u); }
                    else { toast(match.moveBoardToBenchSlot(u.uid, slot)); ok = h.bench.contains(u); }
                    if (ok) game.sound().sfx("place");
                }
            }
        }
        if (ok) selUid = null;
        else { returnUid = u.uid; returnFromBench = dragFromBench; returnFromX = dragX; returnFromY = dragY; returnT = 0; }
        refreshPlanning();
    }

    private boolean isUnitHidden(String uid) {
        return (dragActive && uid.equals(dragUid)) || (returnT >= 0 && uid.equals(returnUid));
    }

    // Lop ve keo-tha (sau stage.draw): sprite truot ve khi tha hut, o dich to sang,
    // 2 vung thung rac (khi dang keo tuong), sprite bam con tro nhac len + phong to nhe.
    private void drawDragOverlay(float now) {
        Assets a = game.assets;
        batch.begin();
        if (returnT >= 0 && returnUid != null) {
            Engine.PlacedUnit u = null;
            for (Engine.PlacedUnit x2 : match.human().board) if (x2.uid.equals(returnUid)) u = x2;
            if (u == null) for (Engine.PlacedUnit x2 : match.human().bench) if (x2.uid.equals(returnUid)) u = x2;
            if (u != null) {
                float[] target = unitScreenPos(u, match.human());
                if (target != null) {
                    float k = Math.min(1, returnT / RETURN_DUR);
                    float e = 1 - (1 - k) * (1 - k); // ease-out
                    float px = returnFromX + (target[0] - returnFromX) * e;
                    float py = returnFromY + (target[1] - returnFromY) * e;
                    float size = returnFromBench ? 56 : 100;
                    drawShadow(px, py - size * 0.45f, size * 0.78f);
                    drawUnitSprite(u.defId, px, py, size, u.star, false, 1, 0, null);
                }
            }
        }
        if (dragActive && dragUnit != null) {
            drawTrashZone(TRASH_L, now); drawTrashZone(TRASH_R, now); // keo tu bench hay tu ban deu ban duoc
            int cx = cellXAt(dragX), cy = cellYAt(dragY);
            if (cx >= 0 && cx < 7 && cy >= 0 && cy < 4) {
                float x = BX + cx * CELLX, y = BY + cy * CELLY;
                batch.setColor(1, 0.85f, 0.3f, 0.30f);
                batch.draw(a.whiteTex(), x + 2, y + 2, CELLX - 4, CELLY - 4);
                batch.setColor(Color.WHITE);
                drawBorder(x + 1, y + 1, CELLX - 2, CELLY - 2, Ui.GOLD, 3);
            } else {
                int slot = benchSlotAt(dragX, dragY);
                if (slot >= 0) {
                    float x = BENCH_X + slot * SLOT, y = BENCH_Y;
                    batch.setColor(1, 0.85f, 0.3f, 0.30f);
                    batch.draw(a.whiteTex(), x + 1, y + 1, SLOT - 6, 50);
                    batch.setColor(Color.WHITE);
                    drawBorder(x, y, SLOT - 4, 52, Ui.GOLD, 3);
                }
            }
            float size = (dragFromBench ? 96 : 100) * 1.05f;
            drawShadow(dragX, dragY - 40, 80);
            drawUnitSprite(dragUnit.defId, dragX, dragY + 8, size, dragUnit.star, false, 0.96f, 0, null);
        }
        batch.end();
    }

    private void drawTrashZone(Rectangle r, float now) {
        Assets a = game.assets;
        boolean hover = r.contains(dragX, dragY);
        float pulse = 0.72f + 0.25f * (float) Math.sin(now * 6);
        drawShadowRect(r.x, r.y, r.width, r.height, 0.4f);
        batch.setColor(0.45f, 0.08f, 0.12f, hover ? 0.94f : 0.80f);
        batch.draw(a.whiteTex(), r.x, r.y, r.width, r.height);
        batch.setColor(Color.WHITE);
        drawBorder(r.x, r.y, r.width, r.height, hover ? new Color(1, 0.45f, 0.45f, 1) : new Color(1, 0.72f, 0.42f, pulse), hover ? 4 : 3);
        batch.draw(a.icon("trash"), r.x + r.width / 2 - 17, r.y + r.height - 54, 34, 34);
        drawCentered(a.fontBig, "BÁN", r.x + r.width / 2, r.y + 36, Color.WHITE);
    }

    // Tra ve true neu click THUC SU lam mot viec (chon/dat/deo do) — planningPress dua vao
    // day de biet day la "cham vung trong" (khong lam gi) hay thao tac that, phuc vu quy tac dong shop.
    // (Mua the/reroll khong con o day: lop shop duoc planningPress xu ly rieng khi dang mo.)
    private boolean planningClick(float x, float y) {
        Match.PlayerState h = match.human();
        // Bench
        for (int i = 0; i < 9; i++) {
            Rectangle r = new Rectangle(BENCH_X + i * SLOT, BENCH_Y, SLOT - 4, 52);
            if (r.contains(x, y)) {
                if (i < h.bench.size()) {
                    Engine.PlacedUnit u = h.bench.get(i);
                    if (armedItem != null) { int inv0 = h.inventory.size(); toast(match.equipItem(u.uid, armedItem)); if (h.inventory.size() < inv0) game.sound().sfx("equip"); armedItem = null; }
                    else { selUid = u.uid; selFromBench = true; toast("Đã chọn " + GameData.champById(u.defId).name + " (bench) — kéo lên bàn hoặc chạm ô bàn cờ để đặt."); }
                    refreshPlanning();
                    return true;
                }
                return false; // o bench trong = vung trong
            }
        }
        // Ban co (chi hang 0..3 la vung dat tuong cua minh)
        int cx = cellXAt(x), cy = cellYAt(y);
        if (cx >= 0 && cx < 7 && cy >= 0 && cy < 4) {
            Engine.PlacedUnit at = null;
            for (Engine.PlacedUnit u : h.board) if (u.x == cx && u.y == cy) at = u;
            boolean acted = armedItem != null || selUid != null || at != null;
            if (armedItem != null && at != null) { int inv0 = h.inventory.size(); toast(match.equipItem(at.uid, armedItem)); if (h.inventory.size() < inv0) game.sound().sfx("equip"); armedItem = null; }
            else if (selUid != null) {
                boolean wasBench = selFromBench;
                int bs0 = h.board.size();
                Engine.PlacedUnit selU = null;
                for (Engine.PlacedUnit u2 : h.board) if (u2.uid.equals(selUid)) selU = u2;
                int px0 = selU != null ? selU.x : -1, py0 = selU != null ? selU.y : -1;
                toast(wasBench ? match.moveToBoard(selUid, cx, cy) : match.moveOnBoard(selUid, cx, cy));
                Engine.PlacedUnit afterU = null;
                for (Engine.PlacedUnit u2 : h.board) if (u2.uid.equals(selUid)) afterU = u2;
                if ((wasBench && h.board.size() > bs0) || (!wasBench && afterU != null && (afterU.x != px0 || afterU.y != py0))) game.sound().sfx("place");
                selUid = null;
            } else if (at != null) {
                selUid = at.uid; selFromBench = false;
                toast("Đã chọn " + GameData.champById(at.defId).name + " — kéo để xếp lại (về bench = cất, xuống góc thùng rác = bán), hoặc chạm ô khác để dời.");
            }
            refreshPlanning();
            return acted;
        }
        selUid = null; armedItem = null;
        refreshPlanning();
        return false;
    }

    @Override
    public void resize(int w, int h) { if (stage != null) stage.getViewport().update(w, h, true); }

    @Override
    public void dispose() {
        if (stage != null) stage.dispose();
        if (batch != null) batch.dispose();
        if (shapes != null) shapes.dispose();
        if (circleTex != null) circleTex.dispose();
        if (ringTex != null) ringTex.dispose();
        if (discTex != null) discTex.dispose();
    }
}
