package com.dautruongchibi.ui;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.ScreenAdapter;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.scenes.scene2d.Stage;
import com.badlogic.gdx.scenes.scene2d.ui.Label;
import com.badlogic.gdx.scenes.scene2d.ui.Table;
import com.badlogic.gdx.scenes.scene2d.ui.TextButton;
import com.badlogic.gdx.scenes.scene2d.ui.TextField;
import com.badlogic.gdx.utils.viewport.FitViewport;
import com.dautruongchibi.game.Match;
import com.dautruongchibi.game.Rank;

import java.util.function.Consumer;

// Menu chinh: co cau che do theo quyet dinh cua user —
// PvE (Chien Dich + Song Quai), PvP (Thuong / Hang / Dau Tap), Hoc Choi rieng, Ho So.
public class MenuScreen extends ScreenAdapter {
    private final MainGame game;
    private Stage stage;
    private SpriteBatch batch;

    public MenuScreen(MainGame game) { this.game = game; }

    @Override
    public void show() {
        batch = new SpriteBatch();
        stage = new Stage(new FitViewport(1280, 720), batch);
        Gdx.input.setInputProcessor(stage);
        Assets a = game.assets;

        Table root = new Table();
        root.setFillParent(true);
        root.pad(28);
        stage.addActor(root);

        Label title = Ui.title(a, "ĐẤU TRƯỜNG CHIBI", Ui.GOLD);
        root.add(title).colspan(2).padBottom(2).row();
        root.add(Ui.label(a, "Bản Java — đồ họa pixel 2D (LibGDX)", Ui.TEXT_DIM)).colspan(2).padBottom(14).row();

        // Cot trai: ho so
        Table profileBox = new Table();
        profileBox.background(Ui.bg(a, Ui.PANEL));
        profileBox.pad(14);
        profileBox.defaults().align(com.badlogic.gdx.utils.Align.left);
        profileBox.add(Ui.labelBig(a, "HỒ SƠ", Ui.GOLD)).row();
        TextField nameField = Ui.textField(a, game.profile.name);
        nameField.setWidth(220);
        profileBox.add(Ui.label(a, "Tên người chơi:", Color.WHITE)).row();
        profileBox.add(nameField).width(230).padBottom(6).row();
        TextButton saveName = Ui.button(a, "Lưu tên");
        saveName.addListener(new com.badlogic.gdx.scenes.scene2d.utils.ChangeListener() {
            @Override public void changed(ChangeEvent e, com.badlogic.gdx.scenes.scene2d.Actor actor) {
                String n = nameField.getText().trim();
                if (n.length() >= 2) { game.profile.name = n; game.saveProfile(); }
            }
        });
        profileBox.add(saveName).padBottom(10).row();
        Label info = Ui.label(a, profileText(), Color.WHITE);
        profileBox.add(info).row();
        root.add(profileBox).width(360).align(com.badlogic.gdx.utils.Align.topLeft).padRight(18);

        // Cot phai: cac che do
        Table modes = new Table();
        modes.defaults().align(com.badlogic.gdx.utils.Align.left).padBottom(8);
        modes.add(Ui.labelBig(a, "PvE — ĐẤU VỚI MÁY", Ui.GOLD)).row();
        modes.add(modeBtn(a, "Chiến Dịch (5.200 màn)", "Chinh phục 52 chương, boss mỗi 10 màn", () -> game.setScreen(new CampaignScreen(game)))).row();
        modes.add(modeBtn(a, "Sóng Quái Vô Tận", "8000 LP, trụ càng lâu càng tốt", () -> startMatch(Match.Mode.WAVES))).row();
        modes.add(Ui.labelBig(a, "PvP — ĐẤU 8 NGƯỜI (BOT GIẢ LẬP)", Ui.GOLD)).padTop(8).row();
        modes.add(modeBtn(a, "PvP Thường", "Đấu 7 đối thủ, không tính hạng", () -> startMatch(Match.Mode.PVP_NORMAL))).row();
        modes.add(modeBtn(a, "PvP Hạng", "Có tính điểm rank LP vào hồ sơ", () -> startMatch(Match.Mode.PVP_RANKED))).row();
        modes.add(modeBtn(a, "PvP Đấu Tập", "Bot yếu hơn, luyện tập tự do", () -> startMatch(Match.Mode.PVP_PRACTICE))).row();
        modes.add(Ui.labelSmall(a, "PvP online người thật sẽ mở khi có Supabase (ngoài phạm vi bản này).", Ui.TEXT_DIM)).padTop(2).row();
        modes.add(modeBtn(a, "Học Chơi", "Luật chơi, LP 8000, bẫy úp, lật thẻ", () -> game.setScreen(new GuideScreen(game)))).padTop(10).row();
        modes.add(modeBtn(a, "Hồ Sơ & Thống Kê", "Hạng, LP, lịch sử phong độ", () -> game.setScreen(new ProfileScreen(game)))).row();
        root.add(modes).align(com.badlogic.gdx.utils.Align.topLeft).expandX();
    }

    private String profileText() {
        return "Hạng: " + game.profile.rankLabel() + "\n"
            + "Cấp độ: " + game.profile.level + " (" + game.profile.xp + " XP)\n"
            + "Chiến dịch: đã qua " + game.profile.campaignCleared + " màn\n"
            + "Kỷ lục sóng quái: " + game.profile.wavesBest + "\n"
            + "Số trận PvP: " + game.profile.matches;
    }

    private Table modeBtn(Assets a, String title, String desc, Runnable action) {
        Table t = new Table();
        TextButton b = Ui.button(a, title);
        b.addListener(new com.badlogic.gdx.scenes.scene2d.utils.ChangeListener() {
            @Override public void changed(ChangeEvent e, com.badlogic.gdx.scenes.scene2d.Actor actor) { action.run(); }
        });
        t.add(b).width(330).align(com.badlogic.gdx.utils.Align.left);
        t.add(Ui.labelSmall(a, desc, Ui.TEXT_DIM)).align(com.badlogic.gdx.utils.Align.left).padLeft(10);
        return t;
    }

    private void startMatch(Match.Mode mode) {
        long seed = (System.currentTimeMillis() % 100000) + 17;
        Match m = mode == Match.Mode.WAVES ? Match.startWaves(seed, game.profile.name) : Match.startPvp(mode, seed, game.profile.name);
        game.setScreen(new MatchScreen(game, m));
    }

    @Override
    public void render(float delta) {
        Gdx.gl.glClearColor(0.07f, 0.05f, 0.14f, 1);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);
        batch.begin();
        batch.draw(game.assets.lobbyTex, 0, 0, 1280, 720);
        batch.setColor(0, 0, 0, 0.45f);
        batch.draw(game.assets.whiteTex(), 0, 0, 1280, 720);
        batch.setColor(Color.WHITE);
        batch.end();
        stage.act(delta);
        stage.draw();
    }

    @Override
    public void resize(int w, int h) { if (stage != null) stage.getViewport().update(w, h, true); }

    @Override
    public void dispose() {
        if (stage != null) stage.dispose();
        if (batch != null) batch.dispose();
    }
}
