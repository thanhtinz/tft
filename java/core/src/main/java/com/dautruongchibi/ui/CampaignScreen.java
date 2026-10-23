package com.dautruongchibi.ui;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.ScreenAdapter;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.scenes.scene2d.Stage;
import com.badlogic.gdx.scenes.scene2d.ui.Label;
import com.badlogic.gdx.scenes.scene2d.ui.ScrollPane;
import com.badlogic.gdx.scenes.scene2d.ui.Table;
import com.badlogic.gdx.scenes.scene2d.ui.TextButton;
import com.badlogic.gdx.utils.viewport.FitViewport;
import com.dautruongchibi.game.Match;
import com.dautruongchibi.game.Stages;

// Man hinh Chien Dich: chon chuong (52) -> luoi 100 man cua chuong; man khoa/mo theo tien do ho so.
public class CampaignScreen extends ScreenAdapter {
    private final MainGame game;
    private Stage stage;
    private int chapter;
    private Table stageGrid;
    private Label chapterLabel, themeBanner;

    public CampaignScreen(MainGame game) {
        this.game = game;
        this.chapter = Stages.chapterOf(Math.min(Stages.TOTAL_STAGES, game.profile.campaignCleared + 1));
    }

    @Override
    public void show() {
        stage = new Stage(new FitViewport(1280, 720));
        Gdx.input.setInputProcessor(stage);
        game.sound().playBgm("home");
        Assets a = game.assets;
        Table root = new Table();
        root.setFillParent(true);
        root.background(Ui.bg(a, new Color(0.08f, 0.06f, 0.16f, 1)));
        root.pad(20);
        stage.addActor(root);
        root.add(Ui.title(a, "CHIẾN DỊCH PvE", Ui.GOLD)).align(com.badlogic.gdx.utils.Align.left).padBottom(6).row();
        root.add(Ui.label(a, "5.200 màn — 52 chương. Boss ở mỗi màn x10, boss lớn ở cuối chương. Đã qua: " + game.profile.campaignCleared + " màn.", Ui.TEXT_DIM)).align(com.badlogic.gdx.utils.Align.left).padBottom(10).row();

        Table nav = new Table();
        TextButton prev = Ui.button(a, "← Chương trước");
        TextButton next = Ui.button(a, "Chương sau →");
        chapterLabel = Ui.labelBig(a, "", Color.WHITE);
        themeBanner = Ui.label(a, "", Ui.GOLD);
        prev.addListener(new com.badlogic.gdx.scenes.scene2d.utils.ChangeListener() {
            @Override public void changed(ChangeEvent e, com.badlogic.gdx.scenes.scene2d.Actor actor) { if (chapter > 1) { chapter--; rebuildGrid(); } }
        });
        next.addListener(new com.badlogic.gdx.scenes.scene2d.utils.ChangeListener() {
            @Override public void changed(ChangeEvent e, com.badlogic.gdx.scenes.scene2d.Actor actor) { if (chapter < Stages.CHAPTER_COUNT) { chapter++; rebuildGrid(); } }
        });
        nav.add(prev).padRight(12);
        nav.add(chapterLabel).padRight(12);
        nav.add(next).padRight(18);
        nav.add(themeBanner);
        root.add(nav).align(com.badlogic.gdx.utils.Align.left).padBottom(10).row();

        stageGrid = new Table();
        stageGrid.defaults().pad(3);
        ScrollPane sp = new ScrollPane(stageGrid);
        sp.setFadeScrollBars(false);
        root.add(sp).expand().fill().row();

        TextButton back = Ui.button(a, "← Quay lại menu");
        back.addListener(new com.badlogic.gdx.scenes.scene2d.utils.ChangeListener() {
            @Override public void changed(ChangeEvent e, com.badlogic.gdx.scenes.scene2d.Actor actor) { game.setScreen(new MenuScreen(game)); }
        });
        root.add(back).align(com.badlogic.gdx.utils.Align.left).padTop(10);
        rebuildGrid();
    }

    private void rebuildGrid() {
        Assets a = game.assets;
        chapterLabel.setText("Chương " + chapter + " / " + Stages.CHAPTER_COUNT + " — " + Stages.chapterName(chapter));
        Stages.ThemeDef theme = Stages.THEMES[(chapter - 1) % Stages.THEMES.length];
        themeBanner.setText("Chủ đề: " + theme.name + " — Boss chương: " + com.dautruongchibi.data.GameData.monsterById(theme.boss).name);
        stageGrid.clear();
        int unlocked = game.profile.campaignCleared + 1;
        int start = (chapter - 1) * Stages.CHAPTER_SIZE + 1;
        for (int i = 0; i < Stages.CHAPTER_SIZE; i++) {
            final int stageId = start + i;
            Stages.StageDef def = Stages.stageDef(stageId);
            boolean cleared = stageId <= game.profile.campaignCleared;
            boolean locked = stageId > unlocked;
            String text = def.isChapterBoss ? stageId + " BOSS" : def.isBoss ? stageId + " boss" : String.valueOf(stageId);
            TextButton b = Ui.button(a, text, cleared ? Ui.GREEN : def.isBoss ? Ui.RED : Ui.BTN);
            if (locked) { b.setDisabled(true); }
            else {
                b.addListener(new com.badlogic.gdx.scenes.scene2d.utils.ChangeListener() {
                    @Override public void changed(ChangeEvent e, com.badlogic.gdx.scenes.scene2d.Actor actor) {
                        long seed = 5000 + stageId;
                        game.setScreen(new MatchScreen(game, Match.startCampaign(stageId, seed, game.profile.name)));
                    }
                });
            }
            stageGrid.add(b).width(104).height(40);
            if (i % 10 == 9) stageGrid.row();
        }
    }

    @Override
    public void render(float delta) {
        Gdx.gl.glClearColor(0.07f, 0.05f, 0.14f, 1);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);
        stage.act(delta);
        stage.draw();
    }

    @Override
    public void resize(int w, int h) { if (stage != null) stage.getViewport().update(w, h, true); }
    @Override
    public void dispose() { if (stage != null) stage.dispose(); }
}
