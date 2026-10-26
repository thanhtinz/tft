package com.dautruongchibi.ui;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.ScreenAdapter;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.scenes.scene2d.Stage;
import com.badlogic.gdx.scenes.scene2d.ui.Image;
import com.badlogic.gdx.scenes.scene2d.ui.Label;
import com.badlogic.gdx.scenes.scene2d.ui.Table;
import com.badlogic.gdx.scenes.scene2d.ui.TextButton;
import com.badlogic.gdx.scenes.scene2d.utils.TextureRegionDrawable;
import com.badlogic.gdx.utils.viewport.FitViewport;
import com.dautruongchibi.data.GameData;
import com.dautruongchibi.game.Rank;

// Man hinh Ho So: hang + LP, thong ke, tien do.
public class ProfileScreen extends ScreenAdapter {
    private final MainGame game;
    private Stage stage;

    public ProfileScreen(MainGame game) { this.game = game; }

    @Override
    public void show() {
        stage = new Stage(new FitViewport(1280, 720));
        Gdx.input.setInputProcessor(stage);
        game.sound().playBgm("home");
        Assets a = game.assets;
        Table root = new Table();
        root.setFillParent(true);
        root.pad(10);
        stage.addActor(root);
        root.add(Ui.title(a, "HỒ SƠ NGƯỜI CHƠI", Ui.GOLD)).align(com.badlogic.gdx.utils.Align.left).padBottom(4).row();

        Table box = new Table();
        box.background(Ui.bg(a, Ui.PANEL));
        box.pad(10);
        box.defaults().align(com.badlogic.gdx.utils.Align.left).padBottom(4);
        box.add(Ui.labelBig(a, game.profile.name, Color.WHITE)).row();
        String rankColor = Rank.TIER_COLORS[game.profile.rank.tier];
        box.add(Ui.labelBig(a, "Hạng: " + game.profile.rankLabel(), Color.valueOf(rankColor))).row();
        int target = game.profile.rank.tier >= Rank.APEX_TIER ? Rank.APEX_PROMOTE_LP : 100;
        box.add(Ui.label(a, "Tiến độ LP: " + game.profile.rank.lp + " / " + target + " tới mốc thăng hạng tiếp theo", Ui.TEXT_DIM)).row();
        box.add(Ui.label(a, "Cấp độ tài khoản: " + game.profile.level + " — " + game.profile.xp + "/" + Rank.xpToNextLevel(game.profile.level) + " XP", Color.WHITE)).row();
        box.add(Ui.label(a, "Tổng số trận PvP: " + game.profile.matches, Color.WHITE)).row();
        box.add(Ui.label(a, "Top 1: " + game.profile.top1 + " lần — Top 4: " + game.profile.top4 + " lần", Color.WHITE)).row();
        box.add(Ui.label(a, game.profile.matches > 0 ? String.format("Hạng trung bình: %.2f", game.profile.avgPlacement()) : "Hạng trung bình: —", Color.WHITE)).row();
        box.add(Ui.label(a, "Chiến dịch: đã qua " + game.profile.campaignCleared + " / " + 5200 + " màn", Color.WHITE)).row();
        box.add(Ui.label(a, "Kỷ lục Sóng Quái: sóng " + game.profile.wavesBest, Color.WHITE)).row();
        box.add(Ui.labelSmall(a, "Lưu ý: chỉ PvP Hạng mới cộng/trừ LP (rank). PvP Thường và Đấu Tập chỉ tính XP + thống kê.", Ui.TEXT_DIM)).padTop(4).row();
        root.add(box).align(com.badlogic.gdx.utils.Align.left).row();

        // ===== HANG CHON TINH LINH DONG HANH (Little Legend kieu TFT) =====
        // Du 10 con cua bo quai PvE, luoi 5x2; cham mot o = chon ngay + luu ho so.
        // O dang chon nen vang mo + ten vang; avatar sanh va mat tinh linh trong tran
        // deu lay theo lua chon nay.
        Table lbox = new Table();
        lbox.background(Ui.bg(a, Ui.PANEL));
        lbox.pad(10);
        lbox.defaults().align(com.badlogic.gdx.utils.Align.left);
        lbox.add(Ui.labelBig(a, "TINH LINH ĐỒNG HÀNH", Ui.GOLD)).padBottom(2).row();
        lbox.add(Ui.labelSmall(a, "Hiện thân của bạn trên sân đấu: chạy nhặt cầu đồ, ăn mừng khi thắng, xụi khi thua. Chạm để chọn.", Ui.TEXT_DIM)).padBottom(4).row();
        Table grid = new Table();
        for (int i = 0; i < GameData.MONSTERS.size(); i++) {
            final GameData.MonsterDef md = GameData.MONSTERS.get(i);
            boolean sel = md.id.equals(game.profile.legendId);
            Table cell = new Table();
            cell.background(Ui.bg(a, sel ? new Color(1f, 0.84f, 0.3f, 0.38f) : new Color(0, 0, 0, 0.30f)));
            cell.pad(4);
            Image img = new Image(new TextureRegionDrawable(a.unitHeadRegion(md.id)));
            cell.add(img).width(38).height(38).align(com.badlogic.gdx.utils.Align.center).row();
            Label nm = new Label(md.name, new Label.LabelStyle(a.fontTiny, sel ? Ui.GOLD : Color.WHITE));
            nm.setAlignment(com.badlogic.gdx.utils.Align.center);
            cell.add(nm).width(118).align(com.badlogic.gdx.utils.Align.center).row();
            cell.addListener(new com.badlogic.gdx.scenes.scene2d.utils.ClickListener() {
                @Override public void clicked(com.badlogic.gdx.scenes.scene2d.InputEvent e, float x, float y) {
                    game.profile.legendId = md.id;
                    game.saveProfile();
                    game.sound().sfx("click");
                    game.setScreen(new ProfileScreen(game)); // xay lai de highlight o moi
                }
            });
            grid.add(cell).width(126).pad(2);
            if (i % 5 == 4) grid.row();
        }
        lbox.add(grid).row();
        root.add(lbox).align(com.badlogic.gdx.utils.Align.left).padTop(8).row();

        TextButton back = Ui.button(a, "← Quay lại menu");
        back.addListener(new com.badlogic.gdx.scenes.scene2d.utils.ChangeListener() {
            @Override public void changed(ChangeEvent e, com.badlogic.gdx.scenes.scene2d.Actor actor) { game.setScreen(new MenuScreen(game)); }
        });
        root.add(back).align(com.badlogic.gdx.utils.Align.left).padTop(6);
    }

    @Override
    public void render(float delta) {
        Gdx.gl.glClearColor(0.07f, 0.05f, 0.14f, 1);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);
        com.badlogic.gdx.graphics.g2d.SpriteBatch sb = (com.badlogic.gdx.graphics.g2d.SpriteBatch) stage.getBatch();
        sb.begin();
        sb.draw(game.assets.lobbyTex, 0, 0, 1280, 720);
        sb.setColor(0, 0, 0, 0.58f);
        sb.draw(game.assets.whiteTex(), 0, 0, 1280, 720);
        sb.setColor(Color.WHITE);
        sb.end();
        stage.act(delta);
        stage.draw();
    }

    @Override
    public void resize(int w, int h) { if (stage != null) stage.getViewport().update(w, h, true); }
    @Override
    public void dispose() { if (stage != null) stage.dispose(); }
}
