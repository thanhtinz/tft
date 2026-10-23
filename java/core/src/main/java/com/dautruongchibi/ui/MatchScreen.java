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
import com.dautruongchibi.data.GameData;
import com.dautruongchibi.data.GameData.ChampDef;
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

// Man hinh tran dau: ban co pixel 7x7, bench, shop, lat the, playback tran danh tu engine.
// Trinh dien hoc tu 2 game mau: Kanto Tactics (san doi theo chang, so sat thuong to, xoay gop sao,
// popup trang bi) + FighterZ Tactics (pow truyen tranh, announcer, bang sat thuong theo tuong).
public class MatchScreen extends ScreenAdapter {
    enum Phase { PLANNING, DRAFT, AUGMENT, BATTLE, RESULT, OVER }

    private final MainGame game;
    private final Match match;
    private Stage stage;
    private SpriteBatch batch;
    private ShapeRenderer shapes;
    private Phase phase = Phase.PLANNING;

    // Geometry
    static final float BX = 437, BY = 176, CELL = 58;
    static final float BENCH_Y = 104, BENCH_X = 392, SLOT = 56;
    static final float SHOP_Y = 14, SHOP_X = 250, CARD_W = 148, CARD_H = 78;

    // HUD labels
    private Label roundLabel, goldVal, lvlVal, hpVal, msgLabel, timerLabel, synergyLabel, logLabel, oppInfo;
    private Table invBox, playersBox;
    private TextButton fightBtn, speedBtn, dmgBtn;

    // Selection / planning
    private String selUid;
    private boolean selFromBench;
    private String armedItem;
    private float planTimeLeft = 90;
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
    private final Map<String, Float> lastHeavyHitAt = new HashMap<>();
    private final Map<String, Engine.FightUnit> unitIndex = new HashMap<>();
    private float announceT = 0; // >0: dang hien chu ho lon giua san o pha RESULT
    private String battleArenaKey = null; // khoa san chot tai startBattle (match.round da tang sau fight())
    private boolean showDmgChart = false;
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
        stage = new Stage(new FitViewport(1280, 720), batch);
        Assets a = game.assets;

        // Thanh tren: plaque noi o giua-tren (vong | vang | cap | mau | thoi gian)
        Table top = new Table();
        top.setPosition(150, 666);
        top.setSize(880, 54);
        top.background(Ui.plaqueBg(a));
        top.pad(4, 18, 4, 18);
        top.left();
        roundLabel = Ui.labelBig(a, "", Color.WHITE);
        goldVal = Ui.labelBig(a, "", Ui.GOLD);
        lvlVal = Ui.labelBig(a, "", Color.WHITE);
        hpVal = Ui.labelBig(a, "", new Color(1, 0.55f, 0.65f, 1));
        timerLabel = Ui.label(a, "", Ui.TEXT_DIM);
        top.add(roundLabel).padRight(20);
        top.add(iconImg(a, "coin", 22)).padRight(5);
        top.add(goldVal).padRight(20);
        top.add(iconImg(a, "star", 22)).padRight(5);
        top.add(lvlVal).padRight(20);
        top.add(iconImg(a, "heart", 22)).padRight(5);
        top.add(hpVal).padRight(20);
        top.add(timerLabel);
        stage.addActor(top);
        // Dong thong bao nam ngay duoi plaque, can giua
        msgLabel = Ui.label(a, "", Color.WHITE);
        msgLabel.setAlignment(com.badlogic.gdx.utils.Align.center);
        msgLabel.setPosition(240, 634);
        msgLabel.setSize(800, 22);
        stage.addActor(msgLabel);

        // Left panel: synergy + inventory + log (keo dai gan het chieu cao de khong tran)
        Table left = new Table();
        left.setPosition(6, 8);
        left.setSize(238, 652);
        left.top().align(com.badlogic.gdx.utils.Align.left);
        left.background(Ui.bg(a, Ui.PANEL));
        left.pad(8);
        left.add(Ui.labelBig(a, "TỘC / HỆ", Ui.GOLD)).align(com.badlogic.gdx.utils.Align.left).padTop(4).padBottom(5).row();
        synergyLabel = Ui.labelSmall(a, "", Color.WHITE);
        synergyLabel.setWrap(true);
        left.add(synergyLabel).width(222).align(com.badlogic.gdx.utils.Align.left).row();
        left.add(Ui.labelBig(a, "TRANG BỊ", Ui.GOLD)).align(com.badlogic.gdx.utils.Align.left).padTop(8).row();
        invBox = new Table();
        invBox.top().align(com.badlogic.gdx.utils.Align.left);
        left.add(invBox).width(222).align(com.badlogic.gdx.utils.Align.left).row();
        left.add(Ui.labelBig(a, "NHẬT KÝ", Ui.GOLD)).align(com.badlogic.gdx.utils.Align.left).padTop(8).row();
        logLabel = Ui.labelSmall(a, "", Ui.TEXT_DIM);
        logLabel.setWrap(true);
        left.add(logLabel).width(222).align(com.badlogic.gdx.utils.Align.left).row();
        stage.addActor(left);

        // Right panel: players / info + actions
        Table right = new Table();
        right.setPosition(1036, 8);
        right.setSize(238, 652);
        right.top().align(com.badlogic.gdx.utils.Align.left);
        right.background(Ui.bg(a, Ui.PANEL));
        right.pad(8);
        right.add(Ui.labelBig(a, match.isPvp() ? "NGƯỜI CHƠI — MÁU" : "THÔNG TIN", Ui.GOLD)).align(com.badlogic.gdx.utils.Align.left).row();
        playersBox = new Table();
        playersBox.top().align(com.badlogic.gdx.utils.Align.left);
        right.add(playersBox).width(222).align(com.badlogic.gdx.utils.Align.left).row();
        oppInfo = Ui.labelSmall(a, "", Color.WHITE);
        oppInfo.setWrap(true);
        right.add(oppInfo).width(222).align(com.badlogic.gdx.utils.Align.left).row();
        fightBtn = Ui.buttonBig(a, "ĐẤU!", Ui.ACCENT);
        fightBtn.addListener(changed(() -> startBattle()));
        right.add(fightBtn).width(222).padTop(10).row();
        TextButton rerollBtn = Ui.button(a, "Làm mới shop (2 vàng)");
        rerollBtn.addListener(changed(() -> { if (phase == Phase.PLANNING) { int g0 = match.human().gold; toast(match.reroll()); if (match.human().gold < g0) game.sound().sfx("reroll"); } refreshPlanning(); }));
        right.add(rerollBtn).width(222).padTop(6).row();
        TextButton xpBtn = Ui.button(a, "Mua XP (4 vàng)");
        xpBtn.addListener(changed(() -> { if (phase == Phase.PLANNING) { int g0 = match.human().gold, lv0 = match.human().level; toast(match.buyXp()); if (match.human().level > lv0) game.sound().sfx("levelup"); else if (match.human().gold < g0) game.sound().sfx("coin"); } refreshPlanning(); }));
        right.add(xpBtn).width(222).padTop(6).row();
        TextButton sellBtn = Ui.button(a, "Bán tướng đã chọn");
        sellBtn.addListener(changed(() -> { if (phase == Phase.PLANNING && selUid != null) { int g0 = match.human().gold; toast(match.sell(selUid)); if (match.human().gold > g0) game.sound().sfx("sell"); selUid = null; refreshPlanning(); } }));
        right.add(sellBtn).width(222).padTop(6).row();
        TextButton benchBtn = Ui.button(a, "Cất về bench");
        benchBtn.addListener(changed(() -> { if (phase == Phase.PLANNING && selUid != null && !selFromBench) { int b0 = match.human().board.size(); toast(match.moveToBench(selUid)); if (match.human().board.size() < b0) game.sound().sfx("place"); selUid = null; refreshPlanning(); } }));
        right.add(benchBtn).width(222).padTop(6).row();
        speedBtn = Ui.button(a, "Tốc độ: x1");
        speedBtn.addListener(changed(() -> { speed = speed == 1 ? 2 : 1; speedBtn.setText("Tốc độ: x" + (int) speed); }));
        right.add(speedBtn).width(222).padTop(6).row();
        dmgBtn = Ui.button(a, "Bảng sát thương: Tắt");
        dmgBtn.addListener(changed(() -> { showDmgChart = !showDmgChart; dmgBtn.setText(showDmgChart ? "Bảng sát thương: Bật" : "Bảng sát thương: Tắt"); }));
        right.add(dmgBtn).width(222).padTop(6).row();
        TextButton exitBtn = Ui.button(a, "Thoát về menu", Ui.RED);
        exitBtn.addListener(changed(() -> game.setScreen(new MenuScreen(game))));
        right.add(exitBtn).width(222).padTop(10).row();
        stage.addActor(right);

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
        // Synergy (ghep 1 dong, label tu xuong dong — tranh tran panel khi nhieu he)
        List<Engine.SynergyInfo> syns = Engine.computeSynergies(h.board);
        StringBuilder sb = new StringBuilder();
        if (syns.isEmpty()) sb.append("Chưa có tướng trên bàn.");
        for (Engine.SynergyInfo s : syns) {
            if (sb.length() > 0) sb.append(" • ");
            sb.append(GameData.traitName(s.traitId)).append(" ").append(s.count);
            if (s.active) sb.append(" (bậc ").append(s.tier).append(")");
        }
        synergyLabel.setText(sb.toString());
        // Danh sach nguoi choi: hang noi co avatar tron + ten + LP (hang cua minh sang hon)
        playersBox.clear();
        StringBuilder ob = new StringBuilder();
        if (match.isPvp()) {
            Color[] dots = {new Color(0.96f, 0.77f, 0.26f, 1), new Color(0.45f, 0.8f, 1, 1), new Color(1, 0.55f, 0.65f, 1),
                new Color(0.55f, 0.95f, 0.6f, 1), new Color(0.78f, 0.62f, 1, 1), new Color(1, 0.75f, 0.4f, 1),
                new Color(0.5f, 0.9f, 0.9f, 1), new Color(0.9f, 0.7f, 0.9f, 1)};
            int idx = 0;
            for (Match.PlayerState p : match.players) {
                Table row = new Table();
                if (p.human) row.background(Ui.panelLightBg(game.assets));
                row.pad(2, 4, 2, 4);
                com.badlogic.gdx.scenes.scene2d.ui.Image av = new com.badlogic.gdx.scenes.scene2d.ui.Image(
                    new com.badlogic.gdx.scenes.scene2d.utils.TextureRegionDrawable(new com.badlogic.gdx.graphics.g2d.TextureRegion(game.assets.avatarTex)));
                av.setColor(p.alive ? dots[idx % dots.length] : new Color(0.4f, 0.4f, 0.45f, 1));
                row.add(av).width(24).height(24).padRight(6);
                Label nm = Ui.labelSmall(game.assets, p.name + (p.placement > 0 ? " (hạng " + p.placement + ")" : ""), p.alive ? (p.human ? Ui.GOLD : Color.WHITE) : new Color(0.55f, 0.55f, 0.6f, 1));
                row.add(nm).expandX().align(com.badlogic.gdx.utils.Align.left);
                Label hp = Ui.labelSmall(game.assets, p.alive ? p.hp + " máu" : "LOẠI", p.alive ? Color.WHITE : new Color(0.9f, 0.4f, 0.4f, 1));
                row.add(hp).align(com.badlogic.gdx.utils.Align.right);
                playersBox.add(row).width(222).padBottom(2).row();
                idx++;
            }
            ob.append("Đối thủ vòng này: ").append(nextOpponentText());
        } else if (match.mode == Match.Mode.WAVES) {
            ob.append("Sóng hiện tại: ").append(match.wave).append("\nMáu còn: ").append(h.hp).append("\nQuái sóng này: ").append(match.waveTeam(match.wave).size()).append(" con");
        } else {
            Stages.StageDef def = Stages.stageDef(match.campaignStageId);
            ob.append("Màn ").append(def.id).append(": ").append(def.name).append("\nChương ").append(def.chapter).append(" — ").append(Stages.chapterName(def.chapter))
              .append("\nSức mạnh địch: ").append(def.power).append("\nThưởng: ").append(def.reward).append(" điểm");
        }
        oppInfo.setText(ob.toString());
        // Log (6 dong cuoi — panel trai khong con muc bay nen co them cho)
        List<String> lg = match.log;
        StringBuilder lb = new StringBuilder();
        for (int i = Math.max(0, lg.size() - 6); i < lg.size(); i++) lb.append(lg.get(i)).append("\n");
        logLabel.setText(lb.toString());
        rebuildInvBox();
        detectMerges();
        fightBtn.setText(match.mode == Match.Mode.WAVES ? "ĐÁNH SÓNG " + match.wave + "!" : match.mode == Match.Mode.CAMPAIGN ? "VÀO TRẬN!" : "ĐẤU!");
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
            invBox.add(b).width(222).padBottom(3).row();
        }
        Label hint = Ui.labelSmall(game.assets, armedItem != null ? "Đang cầm đồ: chạm 1 tướng để đeo." : "Chạm 1 món đồ rồi chạm tướng để đeo.", Ui.TEXT_DIM);
        hint.setWrap(true);
        invBox.add(hint).width(222).align(com.badlogic.gdx.utils.Align.left).row();
    }

    // ================= RENDER =================
    private final com.badlogic.gdx.graphics.g2d.GlyphLayout layout = new com.badlogic.gdx.graphics.g2d.GlyphLayout();
    private final List<float[]> projectiles = new ArrayList<>(); // {t0, ax, ay, tx, ty} toa do man hinh
    private final Map<String, float[]> lastScreenPos = new HashMap<>();

    private float[] cellCenter(double gx, double gy) {
        return new float[]{BX + (float) gx * CELL + CELL / 2f, BY + (float) gy * CELL + CELL / 2f};
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
        else if (phase == Phase.PLANNING) msgLabel.setText("Chạm tướng bench rồi chạm ô để đặt.");
        else if (phase == Phase.BATTLE) msgLabel.setText("Đang giao tranh với " + (outcome != null ? outcome.opponentName : "") + "...");
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
                else { phase = Phase.PLANNING; planTimeLeft = 90; refreshPlanning(); }
            }
        }
        if (phase == Phase.BATTLE && outcome != null && outcome.result != null) {
            playT += delta * speed;
            fireEvents();
            for (int i = floatTexts.size() - 1; i >= 0; i--) { FloatText ft = floatTexts.get(i); ft.ttl += delta; ft.y += 30 * delta; if (ft.ttl > ft.maxTtl) floatTexts.remove(i); }
            for (int i = glows.size() - 1; i >= 0; i--) { Glow g = glows.get(i); g.ttl += delta; if (g.ttl > 0.45f) glows.remove(i); }
            for (int i = pows.size() - 1; i >= 0; i--) { Pow pw = pows.get(i); pw.ttl += delta; if (pw.ttl > 0.38f) pows.remove(i); }
            if (playT >= outcome.result.duration + 1.0f) {
                phase = Phase.RESULT;
                announceT = 1.5f; // announcer phong to giua san roi moi hien panel ket qua
                if (outcome.droppedItem != null) { popupItemId = outcome.droppedItem; popupT = 2.3f; }
                game.sound().sfx(outcome.humanWon ? "win" : "lose");
            }
        }

        Gdx.gl.glClearColor(0.05f, 0.04f, 0.1f, 1);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);
        Gdx.gl.glEnable(GL20.GL_BLEND);
        // --- Nen + ban co ---
        batch.begin();
        batch.draw(a.arenaFor(arenaKey()), 0, 0, 1280, 720);
        batch.setColor(0, 0, 0, 0.20f);
        batch.draw(a.whiteTex(), 0, 0, 1280, 720);
        batch.setColor(Color.WHITE);
        batch.end();
        drawBoardBase();
        // --- Don vi / shop / bench ---
        batch.begin();
        if (phase == Phase.BATTLE || phase == Phase.RESULT) drawBattleUnits(now);
        else { drawPlanningUnits(now); drawBench(now); drawShop(); }
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
        batch.end();
        // --- Panel Scene2D ---
        stage.act(delta);
        stage.draw();
        // --- Overlay tren cung: bang sat thuong, announcer/ket qua, popup trang bi ---
        if (showDmgChart && outcome != null && outcome.result != null && (phase == Phase.BATTLE || phase == Phase.RESULT)) drawDamageChart();
        if (phase == Phase.DRAFT) drawDraftOverlay(now);
        else if (phase == Phase.AUGMENT) drawAugmentOverlay();
        else if (phase == Phase.RESULT) drawResultOverlay();
        else if (phase == Phase.OVER) drawOverOverlay();
        if (popupT > 0 && popupItemId != null) drawItemPopup();
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

    private void drawBoardBase() {
        Gdx.gl.glEnable(GL20.GL_BLEND);
        Gdx.gl.glBlendFunc(GL20.GL_SRC_ALPHA, GL20.GL_ONE_MINUS_SRC_ALPHA);
        shapes.begin(ShapeRenderer.ShapeType.Filled);
        shapes.setColor(0.05f, 0.04f, 0.12f, 0.30f);
        shapes.rect(BX - 6, BY - 6, 7 * CELL + 12, 7 * CELL + 12);
        for (int y = 0; y < 7; y++) for (int x = 0; x < 7; x++) {
            // Luoi o rat nhe: chi du nhan biet o, khong che tranh san
            if (y < 4) shapes.setColor(0.35f, 0.55f, 1f, (x + y) % 2 == 0 ? 0.10f : 0.05f);
            else shapes.setColor(1f, 0.4f, 0.4f, (x + y) % 2 == 0 ? 0.10f : 0.05f);
            shapes.rect(BX + x * CELL + 1, BY + y * CELL + 1, CELL - 2, CELL - 2);
        }
        shapes.end();
        // O dang chon (planning)
        if (phase == Phase.PLANNING && selUid != null && !selFromBench) {
            for (Engine.PlacedUnit u : match.human().board) if (u.uid.equals(selUid)) {
                shapes.begin(ShapeRenderer.ShapeType.Filled);
                shapes.setColor(Ui.GOLD);
                float x = BX + u.x * CELL, y = BY + u.y * CELL;
                shapes.rect(x, y, CELL, 3); shapes.rect(x, y + CELL - 3, CELL, 3);
                shapes.rect(x, y, 3, CELL); shapes.rect(x + CELL - 3, y, 3, CELL);
                shapes.end();
            }
        }
    }

    private void drawUnitSprite(String artId, float cx, float cy, float size, int star, boolean flip, float alpha, float rotation, Color tint) {
        Assets a = game.assets;
        com.badlogic.gdx.graphics.Texture tex = a.unit(artId);
        float scale = star == 2 ? 1.12f : star >= 3 ? 1.26f : 1f;
        float w = size * scale, h = size * scale;
        if (tint != null) batch.setColor(tint.r, tint.g, tint.b, alpha); else batch.setColor(1, 1, 1, alpha);
        batch.draw(tex, cx - w / 2, cy - h / 2, w / 2, h / 2, w, h, flip ? -1 : 1, 1, rotation, 0, 0, tex.getWidth(), tex.getHeight(), false, false);
        batch.setColor(Color.WHITE);
    }

    private void drawBars(float cx, float cy, double hpFrac, double manaFrac, double shieldFrac, int team, int star, boolean stunned) {
        Assets a = game.assets;
        float w = 46, x = cx - w / 2, y = cy + 38;
        batch.setColor(0, 0, 0, 0.7f); batch.draw(a.whiteTex(), x - 1, y - 1, w + 2, 8);
        batch.setColor(team == 0 ? new Color(0.2f, 0.85f, 0.45f, 1) : new Color(0.95f, 0.3f, 0.3f, 1));
        batch.draw(a.whiteTex(), x, y, w * (float) Math.max(0, hpFrac), 6);
        if (shieldFrac > 0.01) { batch.setColor(0.95f, 0.95f, 1, 0.9f); batch.draw(a.whiteTex(), x, y + 7, w * (float) Math.min(1, shieldFrac), 3); }
        batch.setColor(0.25f, 0.5f, 1, 1); batch.draw(a.whiteTex(), x, y - 5, w * (float) Math.max(0, manaFrac), 3);
        batch.setColor(Color.WHITE);
        if (star >= 2) {
            // Sao cap tuong ve bang icon pixel (font game khong co glyph sao)
            float sw = 11, total = star * (sw + 1) - 1;
            batch.setColor(star >= 3 ? Ui.GOLD : new Color(0.88f, 0.92f, 0.97f, 1));
            for (int i = 0; i < star; i++) batch.draw(a.icon("star"), cx - total / 2 + i * (sw + 1), y + 12, sw, sw);
            batch.setColor(Color.WHITE);
        }
        if (stunned) {
            batch.setColor(Ui.GOLD);
            batch.draw(a.icon("star"), cx + 14 + 4 * (float) Math.sin(com.badlogic.gdx.utils.TimeUtils.nanoTime() / 2e8), y + 14, 11, 11);
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
            drawGroundRing(p[0], p[1], u.star, now, u.uid.hashCode());
            drawUnitSprite(art, p[0], p[1], 58, u.star, true, 0.8f, 0, null);
            drawBars(p[0], p[1], 1, 0, 0, 1, u.star, false);
        }
        int i = 0;
        for (Engine.PlacedUnit u : h.board) {
            float[] p = cellCenter(u.x, u.y);
            float bob = (float) Math.sin(now * 3 + (i++) * 1.7) * 2;
            drawGroundRing(p[0], p[1], u.star, now, u.uid.hashCode());
            drawUnitSprite(u.defId, p[0], p[1] + bob, 63, u.star, false, 1, 0, null);
            drawBars(p[0], p[1], 1, 0, 0, 0, u.star, false);
        }
    }

    // Vong o chan theo cap sao (phong tien hoa Kanto): 2 sao vong bac, 3 sao hao quang vang
    // chay + cham sao bay quanh chan. Vong tron ep det nam sat dat duoi chan tuong.
    private void drawGroundRing(float cx, float cy, int star, float now, int seed) {
        if (star < 2) return;
        Assets a = game.assets;
        float w = star >= 3 ? 58 : 48, h = w * 0.42f;
        float gy = cy - 27;
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
                float sx = cx + (float) Math.cos(ang) * 27, sy = gy + (float) Math.sin(ang) * 8;
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
                boolean sel = u.uid.equals(selUid);
                drawUnitSprite(u.defId, x + (SLOT - 4) / 2f, y + 27, 44, u.star, false, 1, 0, null);
                if (u.star >= 2) {
                    float sw = 10, total = u.star * (sw + 1) - 1;
                    batch.setColor(Ui.GOLD);
                    for (int k = 0; k < u.star; k++) batch.draw(a.icon("star"), x + (SLOT - 4) / 2f - total / 2 + k * (sw + 1), y + 54, sw, sw);
                    batch.setColor(Color.WHITE);
                }
                if (sel) drawBorder(x, y, SLOT - 4, 52, Ui.GOLD, 3);
            }
        }
        drawCentered(a.fontSmall, "BENCH (9 ô)", 320, BENCH_Y + 34, Ui.TEXT_DIM);
        // Ten + so do cua tuong dang chon
        Engine.PlacedUnit sel = null;
        for (Engine.PlacedUnit u : h.board) if (u.uid.equals(selUid)) sel = u;
        for (Engine.PlacedUnit u : h.bench) if (u.uid.equals(selUid)) sel = u;
        if (sel != null) {
            ChampDef d = GameData.champById(sel.defId);
            String items = sel.items.isEmpty() ? "chưa có đồ" : sel.items.size() + " món đồ";
            drawCentered(a.font, "Đã chọn: " + d.name + " " + sel.star + " sao — " + items + (armedItem != null ? " — chạm tướng để đeo đồ đang cầm" : ""), 640, 168, Color.WHITE);
        }
    }

    private void drawShop() {
        Assets a = game.assets;
        Match.PlayerState h = match.human();
        float nowS = com.badlogic.gdx.utils.TimeUtils.nanoTime() / 1e9f;
        for (int i = 0; i < 5; i++) {
            float x = SHOP_X + i * (CARD_W + 8), y = SHOP_Y;
            String defId = i < match.shop.size() ? match.shop.get(i) : null;
            if (defId == null) {
                batch.setColor(0.45f, 0.45f, 0.5f, 0.8f);
                batch.draw(a.shopFrames[0], x, y, CARD_W, CARD_H);
                batch.setColor(Color.WHITE);
                drawCentered(a.font, "Đã bán", x + CARD_W / 2, y + CARD_H / 2 + 6, Ui.TEXT_DIM);
                continue;
            }
            ChampDef d = GameData.champById(defId);
            batch.draw(a.shopFrames[Math.max(0, Math.min(4, d.cost - 1))], x, y, CARD_W, CARD_H);
            batch.draw(a.unit(d.id), x + 8, y + 9, 54, 60);
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
        drawCentered(a.fontSmall, "SHOP — chạm thẻ để mua", 636, 12, Ui.TEXT_DIM);
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
                    if (e.amount != null && e.amount > 0 && e.tx != null) {
                        float[] p = cellCenter(e.tx, e.ty);
                        String txt = "-" + e.amount.intValue() + (crit ? "!" : "");
                        Color c = "magic".equals(e.kind) ? new Color(0.78f, 0.62f, 1, 1) : crit ? new Color(1, 0.8f, 0.1f, 1) : new Color(1, 0.62f, 0.05f, 1);
                        floatTexts.add(new FloatText(p[0], p[1] + 30, txt, c, crit ? 1.6f : 1f));
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
                    if (e.attackerUid != null) {
                        lastAttackAt.put(e.attackerUid, (float) e.t);
                        if (e.tx != null) lastAttackTarget.put(e.attackerUid, new float[]{e.tx, e.ty});
                    }
                    if (e.targetUid != null) lastHitAt.put(e.targetUid, (float) e.t);
                    if (Boolean.TRUE.equals(e.ranged) && e.ax != null && e.tx != null) {
                        float[] from = cellCenter(e.ax, e.ay), to = cellCenter(e.tx, e.ty);
                        projectiles.add(new float[]{(float) e.t, from[0], from[1], to[0], to[1]});
                    }
                    break;
                }
                case "heal": {
                    if (e.amount != null && e.amount > 0 && e.tx != null) {
                        float[] p = cellCenter(e.tx, e.ty);
                        floatTexts.add(new FloatText(p[0], p[1] + 30, "+" + e.amount.intValue(), new Color(0.4f, 1, 0.5f, 1), 1f));
                    }
                    break;
                }
                case "cast": {
                    float[] p = e.attackerUid != null && lastScreenPos.containsKey(e.attackerUid) ? lastScreenPos.get(e.attackerUid) : cellCenter(e.ax == null ? 3 : e.ax, e.ay == null ? 3 : e.ay);
                    glows.add(new Glow(p[0], p[1], new Color(1, 0.85f, 0.3f, 1)));
                    break;
                }
                default: break;
            }
        }
    }

    private void drawProjectiles() {
        if (phase != Phase.BATTLE && phase != Phase.RESULT) return;
        for (float[] pr : projectiles) {
            float k = (playT - pr[0]) / 0.18f;
            if (k < 0 || k > 1) continue;
            float x = pr[1] + (pr[3] - pr[1]) * k, y = pr[2] + (pr[4] - pr[2]) * k;
            batch.setColor(1, 0.75f, 0.25f, 0.95f);
            batch.draw(game.assets.whiteTex(), x - 4, y - 4, 8, 8);
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
            batch.draw(ringTex, fx.x - rr, fx.y - 24 - rr * 0.5f, rr * 2, rr);
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
            if (!dying) drawGroundRing(p[0], p[1], base.star, now, uid.hashCode());
            drawUnitSprite(base.artId, cx, cy, 63, base.star, base.team == 1, alpha, rotation, tint);
            lastScreenPos.put(uid, new float[]{cx, cy});
            if (!dying) drawBars(cx, cy, hp / Math.max(1, base.maxHp), mana / Math.max(1, base.maxMana), shield / Math.max(1, base.maxHp), base.team, base.star, base.stun > 0);
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
        a.patchPlaque.draw(batch, 390, 268, 500, 58);
        String sub = outcome.summary + (outcome.humanHpDelta != 0 ? "  •  Máu còn: " + match.human().hp : "");
        drawCentered(a.font, sub, 640, 306, Color.WHITE);
    }

    // Bang sat thuong theo tuong cua tran vua dau (ca 2 ben) — panel noi de mep phai san,
    // bat/tat bang nut "Bang sat thuong" o panel phai. Du lieu tu Engine.damageChart.
    private void drawDamageChart() {
        Assets a = game.assets;
        List<Engine.DamageRow> rows = Engine.damageChart(outcome.result);
        if (rows.isEmpty()) return;
        batch.begin();
        int n = Math.min(rows.size(), 14);
        float pw = 302, ph = 52 + n * 26;
        float px = 722, py = 654 - ph;
        a.patchPanel.draw(batch, px, py, pw, ph);
        drawCentered(a.fontBig, "SÁT THƯƠNG CỦA TRẬN", px + pw / 2, py + ph - 16, Ui.GOLD);
        double max = Math.max(1, rows.get(0).damage);
        for (int i = 0; i < n; i++) {
            Engine.DamageRow r = rows.get(i);
            float ry = py + ph - 48 - i * 26;
            batch.draw(a.unit(r.artId), px + 10, ry - 15, 20, 20);
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
        batch.setColor(0.02f, 0.02f, 0.07f, 0.82f);
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
        batch.setColor(0.02f, 0.02f, 0.07f, 0.82f);
        batch.draw(a.whiteTex(), 0, 0, 1280, 720);
        batch.setColor(Color.WHITE);
        drawCentered(a.fontTitle, "CHỌN CƯỜNG HÓA", 640, 560, Ui.GOLD);
        drawCentered(a.font, "Cường hóa áp dụng cho cả trận — chọn khôn ngoan nhé!", 640, 516, Color.WHITE);
        if (match.augmentOptions != null) for (int i = 0; i < match.augmentOptions.size(); i++) {
            Rectangle r = augmentRect(i);
            GameData.AugmentDef def = GameData.augmentById(match.augmentOptions.get(i));
            a.patchPanel.draw(batch, r.x, r.y, r.width, r.height);
            drawCentered(a.fontBig, def.name, r.x + r.width / 2, r.y + r.height - 26, Ui.GOLD);
            a.font.setColor(Color.WHITE);
            layout.setText(a.font, def.desc, Color.WHITE, r.width - 36, com.badlogic.gdx.utils.Align.center, true);
            a.font.draw(batch, layout, r.x + 18, r.y + r.height - 66);
            a.font.setColor(Color.WHITE);
        }
        batch.end();
    }

    private final Rectangle resultBtn = new Rectangle(490, 226, 300, 54);
    private void drawResultOverlay() {
        Assets a = game.assets;
        batch.begin();
        if (announceT > 0 && outcome != null) {
            // Announcer dang chay: chi hien chu ho + banner nho tren nen san (khong che panel)
            drawAnnouncer();
            batch.end();
            return;
        }
        batch.setColor(0.02f, 0.02f, 0.07f, 0.72f);
        batch.draw(a.whiteTex(), 0, 0, 1280, 720);
        batch.setColor(Color.WHITE);
        a.patchPanel.draw(batch, 320, 200, 640, 330);
        if (outcome != null) {
            drawCentered(a.fontTitle, outcome.bossBattle && outcome.humanWon ? "HẠ GỤC BOSS!" : outcome.humanWon ? "THẮNG!" : "THUA!", 640, 500, outcome.humanWon ? new Color(0.35f, 0.95f, 0.5f, 1) : new Color(1, 0.4f, 0.4f, 1));
            drawCentered(a.fontBig, outcome.summary, 640, 448, Color.WHITE);
            drawCentered(a.font, "Đối thủ: " + outcome.opponentName, 640, 414, Ui.TEXT_DIM);
            if (outcome.humanHpDelta != 0) drawCentered(a.font, "Máu thay đổi: " + outcome.humanHpDelta + "  •  Máu còn: " + match.human().hp, 640, 382, Color.WHITE);
            if (outcome.droppedItem != null) drawCentered(a.font, "Trang bị rơi: " + GameData.itemById(outcome.droppedItem).name + " (đã vào kho)", 640, 350, Ui.GOLD);
            if (match.mode == Match.Mode.CAMPAIGN || match.mode == Match.Mode.WAVES) drawCentered(a.fontSmall, match.endMessage, 640, 322, Ui.TEXT_DIM);
        }
        a.patchBtnPrimary[0].draw(batch, resultBtn.x, resultBtn.y, resultBtn.width, resultBtn.height);
        drawCentered(a.fontBig, match.over ? "Xem kết quả" : "Tiếp tục", 640, resultBtn.y + 38, Color.WHITE);
        batch.end();
    }

    private final Rectangle overMenuBtn = new Rectangle(352, 224, 200, 54);
    private final Rectangle overAgainBtn = new Rectangle(728, 224, 200, 54);
    private void drawOverOverlay() {
        Assets a = game.assets;
        batch.begin();
        batch.setColor(0.02f, 0.02f, 0.07f, 0.85f);
        batch.draw(a.whiteTex(), 0, 0, 1280, 720);
        batch.setColor(Color.WHITE);
        a.patchPanel.draw(batch, 300, 180, 680, 380);
        drawCentered(a.fontTitle, "KẾT THÚC", 640, 528, Ui.GOLD);
        a.font.setColor(Color.WHITE);
        layout.setText(a.font, match.endMessage, Color.WHITE, 600, com.badlogic.gdx.utils.Align.center, true);
        a.font.draw(batch, layout, 340, 486);
        a.fontSmall.setColor(Ui.TEXT_DIM);
        layout.setText(a.fontSmall, overDetail, Ui.TEXT_DIM, 600, com.badlogic.gdx.utils.Align.center, true);
        a.fontSmall.draw(batch, layout, 340, 446);
        a.font.setColor(Color.WHITE); a.fontSmall.setColor(Color.WHITE);
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
        playT = 0; firedIdx = 0; speed = 1; speedBtn.setText("Tốc độ: x1");
        floatTexts.clear(); glows.clear(); projectiles.clear(); pows.clear();
        lastAttackAt.clear(); lastAttackTarget.clear(); lastHitAt.clear(); lastScreenPos.clear(); lastHeavyHitAt.clear();
        // Chi muc don vi toan tran (gom ca golem trieu hoi xuat hien giua tran) cho nguong don nang 15%
        unitIndex.clear();
        if (outcome != null && outcome.result != null) for (Engine.BattleFrame f : outcome.result.frames) for (Engine.FightUnit u : f.units) unitIndex.put(u.uid, u);
        selUid = null; armedItem = null;
        if (outcome == null || outcome.result == null) { phase = Phase.RESULT; return; }
        game.sound().sfx("start");
        phase = Phase.BATTLE;
    }

    private void advanceFromResult() {
        if (match.over) { enterOver(); return; }
        if (match.draftPending) { enterDraft(); return; }
        if (match.augmentPending) { phase = Phase.AUGMENT; return; }
        phase = Phase.PLANNING;
        planTimeLeft = 90; selUid = null; armedItem = null;
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
                            phase = Phase.PLANNING; planTimeLeft = 90; refreshPlanning();
                            return true;
                        }
                    }
                    return true;
                }
                case RESULT: if (resultBtn.contains(x, y)) { advanceFromResult(); return true; } return true;
                case OVER: {
                    if (overMenuBtn.contains(x, y)) { game.setScreen(new MenuScreen(game)); return true; }
                    if (overAgainBtn.contains(x, y)) { playAgain(); return true; }
                    return true;
                }
                case BATTLE: return false;
                case PLANNING: return planningClick(x, y);
                default: return false;
            }
        }
    }

    private boolean planningClick(float x, float y) {
        // Shop
        for (int i = 0; i < 5; i++) {
            Rectangle r = new Rectangle(SHOP_X + i * (CARD_W + 8), SHOP_Y, CARD_W, CARD_H);
            if (r.contains(x, y)) { toast(match.buy(i)); if (match.shop.get(i) == null) game.sound().sfx("coin"); refreshPlanning(); return true; }
        }
        Match.PlayerState h = match.human();
        // Bench
        for (int i = 0; i < 9; i++) {
            Rectangle r = new Rectangle(BENCH_X + i * SLOT, BENCH_Y, SLOT - 4, 52);
            if (r.contains(x, y)) {
                if (i < h.bench.size()) {
                    Engine.PlacedUnit u = h.bench.get(i);
                    if (armedItem != null) { int inv0 = h.inventory.size(); toast(match.equipItem(u.uid, armedItem)); if (h.inventory.size() < inv0) game.sound().sfx("equip"); armedItem = null; }
                    else { selUid = u.uid; selFromBench = true; toast("Đã chọn " + GameData.champById(u.defId).name + " (bench) — chạm ô bàn cờ để đặt."); }
                    refreshPlanning();
                }
                return true;
            }
        }
        // Ban co (chi hang 0..3 la vung dat tuong cua minh)
        int cx = (int) ((x - BX) / CELL), cy = (int) ((y - BY) / CELL);
        if (cx >= 0 && cx < 7 && cy >= 0 && cy < 4) {
            Engine.PlacedUnit at = null;
            for (Engine.PlacedUnit u : h.board) if (u.x == cx && u.y == cy) at = u;
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
                toast("Đã chọn " + GameData.champById(at.defId).name + " — chạm ô khác để dời, hoặc nút Cất/Bán.");
            }
            refreshPlanning();
            return true;
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
    }
}
