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
import com.badlogic.gdx.graphics.g2d.GlyphLayout;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.math.Vector3;
import com.badlogic.gdx.scenes.scene2d.Stage;
import com.badlogic.gdx.scenes.scene2d.ui.Table;
import com.badlogic.gdx.scenes.scene2d.ui.TextButton;
import com.badlogic.gdx.scenes.scene2d.ui.TextField;
import com.badlogic.gdx.scenes.scene2d.utils.ChangeListener;
import com.badlogic.gdx.utils.Align;
import com.badlogic.gdx.utils.viewport.FitViewport;
import com.dautruongchibi.game.Match;
import com.dautruongchibi.game.Rank;
import com.dautruongchibi.game.Stages;

// Sanh chinh — BO CUC hoc tu anh mau TFT Mobile (chi hoc bo cuc, nhan vat/tranh la
// cua game minh): toan man hinh la tranh lobby; goc tren-trai avatar tron + ten +
// hang/cap tren dai gradient toi mo; goc tren-phai 3 nut tron (Ho So / Hoc Choi /
// Am thanh); cot trai giua 3 muc nut-tron-kem-chu (CHIEN DICH co thanh tien do doan,
// SONG QUAI, HO SO); the noi bat CHIEN DICH o duoi-trai; linh vat Gogo Hiep Si dung
// LON o nua phai; nut CHOI that to o duoi-phai mo LOP CHON CHE DO (5 che do, chu nam
// tren panel toi — het canh chu chim tren tranh). Sua ten: cham avatar/ten -> lop
// sua ten (Stage rieng chua TextField + Luu/Huy, tai dung quy tac luu cu).
public class MenuScreen extends ScreenAdapter {
    private final MainGame game;
    private FitViewport viewport;
    private SpriteBatch batch;
    private Stage stage; // chi chua lop sua ten
    private Table editRoot;
    private TextField nameField;
    private final GlyphLayout layout = new GlyphLayout();

    // Trang thai lop phu (ScreenshotMain lat qua reflection de chup kiem chung)
    boolean modesOpen = false;
    private boolean editing = false;
    private float time = 0;

    // Texture sinh rieng cho sanh (Pixmap, loc Nearest cho linh vat dung chat pixel)
    private Texture mascotTex, gradTopTex, gradLeftTex, discTex, ringDiscTex, speakerTex, speakerOffTex, playTriTex;
    private TextureRegion mascotRegion, avatarRegion;

    // Hinh hoc cac vung cham
    private static final Rectangle AVATAR_ZONE = new Rectangle(24, 596, 330, 112);
    private static final Rectangle CARD_RECT = new Rectangle(24, 22, 380, 122);
    private static final Rectangle PLAY_RECT = new Rectangle(924, 26, 330, 94);
    private static final float[] ENTRY_CY = {502, 406, 310};
    // Chu phu o sanh: sang hon TEXT_DIM de doc ro tren tranh (nam tren dai gradient toi)
    private static final Color SUB_COLOR = new Color(0.88f, 0.89f, 0.94f, 1f);
    private static final float[] ICON_CX = {1128, 1184, 1240};
    private static final float ICON_CY = 668;
    private static final Rectangle LAYER_PANEL = new Rectangle(350, 120, 580, 480);
    private static final float ROW_H = 66, ROW_GAP = 8, ROWS_TOP = 540;

    private static final class ModeEntry {
        final String icon, title, desc;
        final Runnable action;
        ModeEntry(String icon, String title, String desc, Runnable action) {
            this.icon = icon; this.title = title; this.desc = desc; this.action = action;
        }
    }
    private ModeEntry[] modeEntries;

    public MenuScreen(MainGame game) { this.game = game; }

    @Override
    public void show() {
        batch = new SpriteBatch();
        viewport = new FitViewport(1280, 720);
        stage = new Stage(viewport, batch);
        Assets a = game.assets;

        buildTextures();
        modeEntries = new ModeEntry[]{
            new ModeEntry("flag", "Chiến Dịch (5.200 màn)", "Chinh phục 52 chương, boss mỗi 10 màn", () -> game.setScreen(new CampaignScreen(game))),
            new ModeEntry("waves", "Sóng Quái Vô Tận", "100 máu, trụ càng lâu càng tốt", () -> startMatch(Match.Mode.WAVES)),
            new ModeEntry("sword", "PvP Thường", "Đấu 7 đối thủ, không tính hạng", () -> startMatch(Match.Mode.PVP_NORMAL)),
            new ModeEntry("trophy", "PvP Hạng", "Có tính điểm rank LP vào hồ sơ", () -> startMatch(Match.Mode.PVP_RANKED)),
            new ModeEntry("shield", "PvP Đấu Tập", "Bot yếu hơn, luyện tập tự do", () -> startMatch(Match.Mode.PVP_PRACTICE)),
        };
        buildEditOverlay(a);

        InputMultiplexer mux = new InputMultiplexer();
        mux.addProcessor(stage);
        mux.addProcessor(new InputAdapter() {
            @Override public boolean touchDown(int sx, int sy, int pointer, int button) {
                if (editing) return false; // lop sua ten (Stage) xu ly
                Vector3 v = viewport.unproject(new Vector3(sx, sy, 0));
                return press(v.x, v.y);
            }
        });
        Gdx.input.setInputProcessor(mux);
        game.sound().playBgm("home");
    }

    // ---------- Texture rieng cua sanh ----------
    private void buildTextures() {
        // Linh vat: nap rieng sprite gogo tu file (ban trong Assets loc MipMapLinear —
        // ban nay loc NEAREST de phong lon dung chat pixel), cat theo hop alpha that.
        try {
            Pixmap pm = new Pixmap(Gdx.files.internal("units/gogo.png"));
            int minX = pm.getWidth(), minY = pm.getHeight(), maxX = -1, maxY = -1;
            for (int y = 0; y < pm.getHeight(); y++) for (int x = 0; x < pm.getWidth(); x++) {
                if ((pm.getPixel(x, y) & 0xFF) > 10) {
                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                    if (y < minY) minY = y; if (y > maxY) maxY = y;
                }
            }
            if (maxX < 0) { minX = 0; minY = 0; maxX = pm.getWidth() - 1; maxY = pm.getHeight() - 1; }
            mascotTex = new Texture(pm);
            mascotTex.setFilter(Texture.TextureFilter.Nearest, Texture.TextureFilter.Nearest);
            pm.dispose();
            int bw = maxX - minX + 1, bh = maxY - minY + 1;
            mascotRegion = new TextureRegion(mascotTex, minX, minY, bw, bh);
            // Avatar: cat phan DAU + VAI (tren 55% hop alpha)
            avatarRegion = new TextureRegion(mascotTex, minX, minY, bw, Math.round(bh * 0.55f));
        } catch (Exception e) {
            mascotTex = null; mascotRegion = null; avatarRegion = null;
        }
        // Dai gradient toi o dinh: alpha 0.66 o tren cung -> 0 o day dai (Pixmap: hang 0 = dinh)
        Pixmap gt = new Pixmap(4, 128, Pixmap.Format.RGBA8888);
        for (int j = 0; j < 128; j++) {
            float f = 1 - j / 127f;
            gt.setColor(0, 0, 0, 0.66f * f * f);
            gt.fillRectangle(0, j, 4, 1);
        }
        gradTopTex = new Texture(gt); gt.dispose();
        // Dai gradient toi mep trai: alpha 0.55 o sat mep, tan cham (mu 0.85) -> 0 vao trong
        Pixmap gl = new Pixmap(256, 4, Pixmap.Format.RGBA8888);
        for (int i = 0; i < 256; i++) {
            float f = 1 - i / 255f;
            gl.setColor(0, 0, 0, 0.55f * (float) Math.pow(f, 0.85));
            gl.fillRectangle(i, 0, 1, 4);
        }
        gradLeftTex = new Texture(gl); gl.dispose();
        discTex = makeDisc(false);
        ringDiscTex = makeDisc(true);
        speakerTex = makeSpeaker(false);
        speakerOffTex = makeSpeaker(true);
        // Mui ten CHOI: tam giac trang tro phai
        Pixmap pt = new Pixmap(48, 48, Pixmap.Format.RGBA8888);
        pt.setColor(Color.WHITE);
        pt.fillTriangle(13, 8, 13, 40, 41, 24);
        playTriTex = new Texture(pt); pt.dispose();
    }

    // Dia tron nut bam: long toi + vien vang (avatar dung ban vien day hon).
    private Texture makeDisc(boolean thickRing) {
        int S = 128;
        Pixmap pm = new Pixmap(S, S, Pixmap.Format.RGBA8888);
        pm.setColor(0.96f, 0.77f, 0.26f, 1f);
        pm.fillCircle(64, 64, 62);
        pm.setColor(0.07f, 0.05f, 0.14f, 0.95f);
        pm.fillCircle(64, 64, thickRing ? 55 : 58);
        Texture t = new Texture(pm); pm.dispose();
        return t;
    }

    // Icon LOA ve Pixmap 48x48 (trang): than loa + song am; ban TAT them gach cheo do.
    private Texture makeSpeaker(boolean off) {
        Pixmap pm = new Pixmap(48, 48, Pixmap.Format.RGBA8888);
        pm.setColor(Color.WHITE);
        pm.fillRectangle(6, 20, 8, 9);
        pm.fillTriangle(14, 14, 14, 35, 28, 35);
        pm.fillTriangle(14, 14, 28, 14, 28, 35);
        if (!off) {
            pm.drawCircle(24, 24, 10);
            pm.drawCircle(24, 24, 15);
        } else {
            pm.setColor(1f, 0.35f, 0.35f, 1f);
            pm.drawLine(12, 12, 38, 38);
            pm.drawLine(13, 12, 39, 38);
            pm.drawLine(38, 12, 12, 38);
            pm.drawLine(39, 12, 13, 38);
        }
        Texture t = new Texture(pm); pm.dispose();
        return t;
    }

    // ---------- Lop sua ten (Stage) ----------
    private void buildEditOverlay(Assets a) {
        editRoot = new Table();
        editRoot.setFillParent(true);
        editRoot.setBackground(Ui.bg(a, new Color(0, 0, 0, 0.55f)));
        Table box = Ui.shadowTable(a);
        box.background(Ui.panelBg(a));
        box.pad(22);
        box.add(Ui.labelBig(a, "ĐỔI TÊN NGƯỜI CHƠI", Ui.GOLD)).padBottom(12).row();
        nameField = Ui.textField(a, game.profile.name);
        box.add(nameField).width(280).padBottom(6).row();
        box.add(Ui.labelSmall(a, "Tên cần ít nhất 2 ký tự.", Ui.TEXT_DIM)).padBottom(14).row();
        Table row = new Table();
        TextButton save = Ui.button(a, "Lưu tên", Ui.BTN_GOLD);
        save.addListener(new ChangeListener() {
            @Override public void changed(ChangeEvent e, com.badlogic.gdx.scenes.scene2d.Actor actor) {
                String n = nameField.getText().trim();
                if (n.length() >= 2) {
                    game.profile.name = n;
                    game.saveProfile();
                    game.sound().sfx("click");
                    closeEdit();
                }
            }
        });
        TextButton cancel = Ui.button(a, "Hủy");
        cancel.addListener(new ChangeListener() {
            @Override public void changed(ChangeEvent e, com.badlogic.gdx.scenes.scene2d.Actor actor) {
                game.sound().sfx("click");
                closeEdit();
            }
        });
        row.add(save).padRight(10);
        row.add(cancel);
        box.add(row).row();
        editRoot.add(box);
        editRoot.setVisible(false);
        editRoot.setTouchable(com.badlogic.gdx.scenes.scene2d.Touchable.disabled);
        stage.addActor(editRoot);
    }

    private void openEdit() {
        editing = true;
        nameField.setText(game.profile.name);
        editRoot.setVisible(true);
        editRoot.setTouchable(com.badlogic.gdx.scenes.scene2d.Touchable.enabled);
        stage.setKeyboardFocus(nameField);
        nameField.selectAll();
    }

    private void closeEdit() {
        editing = false;
        editRoot.setVisible(false);
        editRoot.setTouchable(com.badlogic.gdx.scenes.scene2d.Touchable.disabled);
        stage.unfocusAll();
    }

    // ---------- Xu ly cham ----------
    private boolean press(float x, float y) {
        Assets a = game.assets;
        if (modesOpen) {
            // Lop chon che do: cham hang -> vao che do; cham X / ra ngoai panel -> dong
            for (int i = 0; i < modeEntries.length; i++) {
                if (rowRect(i).contains(x, y)) {
                    modesOpen = false;
                    game.sound().sfx("click");
                    modeEntries[i].action.run();
                    return true;
                }
            }
            modesOpen = false;
            game.sound().sfx("click");
            return true;
        }
        if (PLAY_RECT.contains(x, y)) { modesOpen = true; game.sound().sfx("click"); return true; }
        if (AVATAR_ZONE.contains(x, y)) { openEdit(); game.sound().sfx("click"); return true; }
        // 3 nut tron tren-phai: Ho So / Hoc Choi / Am thanh
        for (int i = 0; i < 3; i++) {
            if (Math.hypot(x - ICON_CX[i], y - ICON_CY) <= 28) {
                game.sound().sfx("click");
                if (i == 0) game.setScreen(new ProfileScreen(game));
                else if (i == 1) game.setScreen(new GuideScreen(game));
                else {
                    boolean on = !game.sound().isEnabled();
                    game.sound().setEnabled(on);
                    if (on) { game.sound().playBgm("home"); game.sound().sfx("click"); }
                }
                return true;
            }
        }
        // Cot trai: CHIẾN DỊCH / SÓNG QUÁI / HỒ SƠ
        for (int i = 0; i < 3; i++) {
            if (new Rectangle(16, ENTRY_CY[i] - 42, 400, 84).contains(x, y)) {
                game.sound().sfx("click");
                if (i == 0) game.setScreen(new CampaignScreen(game));
                else if (i == 1) startMatch(Match.Mode.WAVES);
                else game.setScreen(new ProfileScreen(game));
                return true;
            }
        }
        if (CARD_RECT.contains(x, y)) { game.sound().sfx("click"); game.setScreen(new CampaignScreen(game)); return true; }
        return false;
    }

    private Rectangle rowRect(int i) {
        float top = ROWS_TOP - i * (ROW_H + ROW_GAP);
        return new Rectangle(LAYER_PANEL.x + 18, top - ROW_H, LAYER_PANEL.width - 36, ROW_H);
    }

    private void startMatch(Match.Mode mode) {
        long seed = (System.currentTimeMillis() % 100000) + 17;
        Match m = mode == Match.Mode.WAVES ? Match.startWaves(seed, game.profile.name) : Match.startPvp(mode, seed, game.profile.name);
        game.setScreen(new MatchScreen(game, m));
    }

    // ---------- Ve ----------
    @Override
    public void render(float delta) {
        time += delta;
        Assets a = game.assets;
        Gdx.gl.glClearColor(0.07f, 0.05f, 0.14f, 1);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);
        batch.begin();
        batch.draw(a.lobbyTex, 0, 0, 1280, 720);
        batch.draw(gradLeftTex, 0, 0, 660, 720);
        batch.draw(gradTopTex, 0, 592, 1280, 128);
        drawMascot(a);
        drawTopLeft(a);
        drawTopRight(a);
        drawEntries(a);
        drawFeaturedCard(a);
        drawPlayButton(a);
        if (modesOpen) drawModeLayer(a);
        batch.end();
        stage.act(delta);
        stage.draw();
    }

    // Linh vat Gogo Hiep Si dung lon o nua phai (sprite pixel phong bang Nearest, co
    // bong mem duoi chan va nhac nhe theo nhip tho). Khong che nut CHOI (ve truoc nut)
    // va khong cham hang icon tren-phai (dinh linh vat ~502 < 641).
    private void drawMascot(Assets a) {
        if (mascotRegion == null) return;
        float h = 402, w = h * mascotRegion.getRegionWidth() / mascotRegion.getRegionHeight();
        float cx = 1006, bottom = 100 + (float) Math.sin(time * 1.2f) * 4;
        Ui.drawShadow(batch, a, cx - w / 2 - 14, 74, w + 28, 40, 0.30f);
        batch.draw(mascotRegion, cx - w / 2, bottom, w, h);
    }

    private void drawTopLeft(Assets a) {
        // Avatar tron: dia vien vang day + cat dau/vai cua linh vat
        batch.draw(ringDiscTex, 32, 604, 92, 92);
        if (avatarRegion != null) {
            float w = 74, h = w * avatarRegion.getRegionHeight() / avatarRegion.getRegionWidth();
            batch.draw(avatarRegion, 78 - w / 2, 652 - h / 2, w, h);
        }
        drawLeft(a.fontBig, game.profile.name, 140, 690, Color.WHITE);
        // Hang (vang) + cap do (mo) tren cung mot dong, do be ngang that
        String rank = Rank.rankLabel(game.profile.rank);
        drawLeft(a.fontSmall, rank, 140, 652, Ui.GOLD);
        float rw = measureW(a.fontSmall, rank);
        drawLeft(a.fontSmall, " • Cấp " + game.profile.level + " (" + game.profile.xp + " XP)", 140 + rw, 652, Ui.TEXT_DIM);
        drawLeft(a.fontTiny, "Chạm avatar / tên để đổi tên", 140, 628, Ui.TEXT_DIM);
    }

    private void drawTopRight(Assets a) {
        Texture[] icons = {a.icon("chart"), a.icon("book"), game.sound().isEnabled() ? speakerTex : speakerOffTex};
        for (int i = 0; i < 3; i++) {
            batch.draw(discTex, ICON_CX[i] - 27, ICON_CY - 27, 54, 54);
            batch.draw(icons[i], ICON_CX[i] - 13, ICON_CY - 13, 26, 26);
        }
    }

    // Cot trai giua: nut tron kem chu nhu mau (REWARDS/STORE/TEAM PLANNER).
    private void drawEntries(Assets a) {
        String[][] data = {
            {"flag", "CHIẾN DỊCH", "Đã qua " + game.profile.campaignCleared + " / 5.200 màn • Chương "
                + Stages.chapterOf(Math.min(Stages.TOTAL_STAGES, game.profile.campaignCleared + 1))},
            {"waves", "SÓNG QUÁI", "Kỷ lục: " + game.profile.wavesBest + " sóng — trụ càng lâu càng tốt"},
            {"trophy", "HỒ SƠ", Rank.rankLabel(game.profile.rank) + " • " + game.profile.matches + " trận PvP"},
        };
        for (int i = 0; i < 3; i++) {
            float cy = ENTRY_CY[i];
            batch.draw(discTex, 28, cy - 36, 72, 72);
            batch.draw(a.icon(data[i][0]), 46, cy - 18, 36, 36);
            if (i == 0) {
                drawLeft(a.fontBig, data[i][1], 118, cy + 18, Color.WHITE);
                drawLeft(a.fontSmall, data[i][2], 118, cy - 16, SUB_COLOR);
                drawProgressBar(a, 118, cy - 46, 240, game.profile.campaignCleared / (float) Stages.TOTAL_STAGES);
            } else {
                drawLeft(a.fontBig, data[i][1], 118, cy + 16, Color.WHITE);
                drawLeft(a.fontSmall, data[i][2], 118, cy - 18, SUB_COLOR);
            }
        }
    }

    // Thanh tien do CHIA DOAN nhu thanh phan thuong cua mau: 12 doan tren mot NEN
    // pill toi (nhu mau — thanh nam tren dai toi moi doc ro tren tranh sang), doan da
    // dat sang xanh ngoc, doan chua dat trang mo.
    private void drawProgressBar(Assets a, float x, float y, float w, float frac) {
        int segs = 12;
        float gap = 3, sw = (w - gap * (segs - 1)) / segs;
        int filled = Math.round(segs * Math.max(0, Math.min(1, frac)));
        batch.setColor(0, 0, 0, 0.5f);
        batch.draw(a.whiteTex(), x - 5, y - 3, w + 10, 15);
        for (int s = 0; s < segs; s++) {
            batch.setColor(s < filled ? new Color(0.35f, 0.85f, 0.95f, 0.95f) : new Color(1, 1, 1, 0.22f));
            batch.draw(a.whiteTex(), x + s * (sw + gap), y, sw, 9);
        }
        batch.setColor(Color.WHITE);
    }

    // The noi bat duoi-trai (nhu the Ashe cua mau) — dung cho CHIEN DICH: banner
    // chuong + ten + mo ta + tien do, cham vao mo man Chien Dich.
    private void drawFeaturedCard(Assets a) {
        float x = CARD_RECT.x, y = CARD_RECT.y, w = CARD_RECT.width, h = CARD_RECT.height;
        Ui.drawShadow(batch, a, x, y, w, h, 0.38f);
        a.patchPanel.draw(batch, x, y, w, h);
        int chapter = Stages.chapterOf(Math.min(Stages.TOTAL_STAGES, game.profile.campaignCleared + 1));
        batch.draw(a.bannerFor(chapter - 1), x + 12, y + 12, 116, 98);
        drawLeft(a.fontBig, "CHIẾN DỊCH", x + 140, y + h - 16, Ui.GOLD);
        a.fontSmall.setColor(Color.WHITE);
        layout.setText(a.fontSmall, "Chinh phục 52 chương, boss mỗi 10 màn, nhận đồ thành phần.", Color.WHITE, 240, Align.left, true);
        a.fontSmall.draw(batch, layout, x + 140, y + h - 44);
        a.fontSmall.setColor(Color.WHITE);
        drawLeft(a.fontTiny, "Đã qua " + game.profile.campaignCleared + " / 5.200 màn", x + 140, y + 34, Ui.TEXT_DIM);
        // Thanh tien do mong duoi mo ta
        float frac = game.profile.campaignCleared / (float) Stages.TOTAL_STAGES;
        batch.setColor(0, 0, 0, 0.55f);
        batch.draw(a.whiteTex(), x + 140, y + 10, 224, 6);
        batch.setColor(0.35f, 0.85f, 0.95f, 0.95f);
        batch.draw(a.whiteTex(), x + 140, y + 10, 224 * Math.max(0, Math.min(1, frac)), 6);
        batch.setColor(Color.WHITE);
    }

    // Nut CHOI that to o duoi-phai (hoc dang nut PLAY cua mau: lon, vien sang, mui
    // ten) — ve theo ngon ngu do hoa cua game: nen nut vang + quang sang tho sau lung.
    private void drawPlayButton(Assets a) {
        float pulse = 0.22f + 0.07f * (float) Math.sin(time * 2.4f);
        batch.setColor(1f, 0.85f, 0.35f, pulse);
        batch.draw(a.glowTex(), PLAY_RECT.x - 24, PLAY_RECT.y - 22, PLAY_RECT.width + 48, PLAY_RECT.height + 44);
        batch.setColor(Color.WHITE);
        Ui.drawShadow(batch, a, PLAY_RECT.x, PLAY_RECT.y, PLAY_RECT.width, PLAY_RECT.height, 0.4f);
        a.patchBtnGold[0].draw(batch, PLAY_RECT.x, PLAY_RECT.y, PLAY_RECT.width, PLAY_RECT.height);
        drawCentered(a.fontTitle, "CHƠI", PLAY_RECT.x + (PLAY_RECT.width - 44) / 2, PLAY_RECT.y + 74, Color.WHITE);
        batch.draw(playTriTex, PLAY_RECT.x + PLAY_RECT.width - 58, PLAY_RECT.y + PLAY_RECT.height / 2 - 17, 34, 34);
    }

    // Lop CHON CHE DO sau nut CHOI: panel toi o giua, 5 hang che do (icon + ten + mo
    // ta ngan tren nen panel — chu khong con chim tren tranh), nut X do dong lop.
    private void drawModeLayer(Assets a) {
        batch.setColor(0, 0, 0, 0.62f);
        batch.draw(a.whiteTex(), 0, 0, 1280, 720);
        batch.setColor(Color.WHITE);
        Ui.drawShadow(batch, a, LAYER_PANEL.x, LAYER_PANEL.y, LAYER_PANEL.width, LAYER_PANEL.height, 0.45f);
        a.patchPanel.draw(batch, LAYER_PANEL.x, LAYER_PANEL.y, LAYER_PANEL.width, LAYER_PANEL.height);
        drawCentered(a.fontBig, "CHỌN CHẾ ĐỘ", 640, LAYER_PANEL.y + LAYER_PANEL.height - 26, Ui.GOLD);
        for (int i = 0; i < modeEntries.length; i++) {
            ModeEntry e = modeEntries[i];
            Rectangle r = rowRect(i);
            a.patchBtn[0].draw(batch, r.x, r.y, r.width, r.height);
            batch.draw(a.icon(e.icon), r.x + 16, r.y + r.height / 2 - 17, 34, 34);
            drawLeft(a.font, e.title, r.x + 64, r.y + r.height - 16, Color.WHITE);
            drawLeft(a.fontSmall, e.desc, r.x + 64, r.y + r.height - 40, Ui.TEXT_DIM);
        }
        drawCentered(a.fontTiny, "PvP online người thật sẽ mở khi có Supabase (ngoài phạm vi bản này).", 640, LAYER_PANEL.y + 34, Ui.TEXT_DIM);
        // Nut X dong lop
        float cx = LAYER_PANEL.x + LAYER_PANEL.width - 14, cy = LAYER_PANEL.y + LAYER_PANEL.height - 14;
        batch.setColor(0.75f, 0.22f, 0.28f, 1f);
        batch.draw(discTex, cx - 15, cy - 15, 30, 30);
        batch.setColor(Color.WHITE);
        drawCentered(a.fontBig, "×", cx, cy + 9, Color.WHITE);
    }

    private void drawLeft(BitmapFont f, String text, float x, float y, Color color) {
        f.setColor(color);
        f.draw(batch, text, x, y);
        f.setColor(Color.WHITE);
    }

    private void drawCentered(BitmapFont f, String text, float cx, float y, Color color) {
        f.setColor(color);
        layout.setText(f, text);
        f.draw(batch, text, cx - layout.width / 2, y);
        f.setColor(Color.WHITE);
    }

    private float measureW(BitmapFont f, String text) {
        layout.setText(f, text);
        return layout.width;
    }

    @Override
    public void resize(int w, int h) { if (viewport != null) viewport.update(w, h, true); }

    @Override
    public void hide() {
        // Texture rieng cua sanh giai phong khi roi man (cac man khac tu tao cua chung)
        for (Texture t : new Texture[]{mascotTex, gradTopTex, gradLeftTex, discTex, ringDiscTex, speakerTex, speakerOffTex, playTriTex})
            if (t != null) t.dispose();
        mascotTex = null;
        if (stage != null) stage.dispose();
        if (batch != null) batch.dispose();
    }
}
