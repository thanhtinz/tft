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

// Man hinh Hoc Choi: tom tat luat (port y chinh tu huong dan ban RN;
// trinh dien hoc tu 2 game mau Kanto Tactics + FighterZ Tactics).
public class GuideScreen extends ScreenAdapter {
    private final MainGame game;
    private Stage stage;

    private static final String TEXT = String.join("\n",
        "MỤC TIÊU",
        "Đấu Trường Chibi là game auto-battler: bạn mua tướng, xếp đội hình, rồi xem chúng tự đánh.",
        "Trong trận PvP có 8 người chơi. Ai hết máu trước bị loại; sống sót cuối cùng là vô địch (Top 1).",
        "",
        "MÁU NGƯỜI CHƠI — 100 (kiểu TFT)",
        "Mỗi người bắt đầu trận với 100 máu. Thua một vòng sẽ mất máu theo số tướng địch",
        "còn sống và stage (stage càng cao trừ càng đau). Máu về 0 = bị loại ngay.",
        "Lưu ý: chế độ Hạng còn có điểm rank LP dùng để thăng/xuống hạng — đó là điểm xếp hạng",
        "kiểu TFT, không phải máu trong trận.",
        "",
        "LẬT THẺ ÚP MỞ TRẬN",
        "Đầu trận PvP (và các vòng x-4) có 8 thẻ úp. Chạm 1 thẻ để lật mở: nhận tướng trong thẻ",
        "về bench kèm 1 trang bị vào kho. Các thẻ còn lại cũng lật mở để bạn thấy mình đã bỏ lỡ gì.",
        "",
        "SÂN ĐẤU & HIỆU ỨNG (học từ Kanto Tactics + FighterZ Tactics)",
        "Sân đấu đổi tranh theo chặng: Chiến Dịch theo chương — (chương-1)%3 lần lượt là rừng,",
        "sa mạc, băng; vòng Boss luôn là sân hoàng hôn. PvP và Sóng Quái theo stage: 1 rừng,",
        "2 hoàng hôn, 3 sa mạc, từ stage 4 là băng (vòng Boss cũng hoàng hôn).",
        "Đòn chí mạng hoặc đòn nặng (từ 15% máu tối đa của mục tiêu) sẽ nổ cụm khói truyện tranh",
        "kèm vệt tốc độ, và mục tiêu bị lộn nghiêng. Cuối mỗi vòng, chữ hô lớn THẮNG! / THUA!",
        "(hạ boss: HẠ GỤC BOSS!) phồng lên giữa sân. Nút 'Bảng sát thương' ở panel phải mở",
        "bảng tổng sát thương của từng tướng hai bên trong trận vừa đấu.",
        "Thắng vòng quái PvE sẽ rơi 1 trang bị (Sóng Quái: mỗi 3 sóng; Chiến Dịch: thắng màn Boss)",
        "— thẻ trang bị nảy lên giữa-phải sân rồi tự vào kho. Gộp sao có vòng xoáy hợp nhất;",
        "tướng 2 sao có vòng bạc ở chân, 3 sao có hào quang vàng cháy kèm chấm sao bay.",
        "",
        "KINH TẾ & ĐỘI HÌNH",
        "Shop có 5 thẻ tướng theo tỉ lệ odds từng cấp. Làm mới shop tốn 2 vàng, mua XP tốn 4 vàng.",
        "Mỗi vòng nhận vàng cơ bản + lãi (mỗi 10 vàng giữ lại được +1, tối đa +5) + thưởng chuỗi thắng/thua.",
        "3 tướng giống nhau cùng sao sẽ tự gộp lên sao cao hơn (x1.8 chỉ số, rồi x3.2).",
        "Số tướng tối đa trên bàn = cấp của bạn. Bench chứa tối đa 9 tướng.",
        "Ghép cặp tướng cùng tộc/hệ để kích hoạt hiệu ứng tộc/hệ (xem panel trái trong trận).",
        "Vòng cường hóa ở 2-1, 3-2, 4-2: chọn 1 trong 3 cường hóa cho cả trận.",
        "",
        "CHẾ ĐỘ CHƠI",
        "PvE Chiến Dịch: 5.200 màn trong 52 chương, boss mỗi 10 màn, boss lớn cuối chương.",
        "PvE Sóng Quái: quái đến theo từng sóng ngày càng mạnh, 100 máu, xem trụ được bao lâu.",
        "PvP Thường: đấu 7 bot giả lập, không tính hạng. PvP Hạng: tính điểm rank LP vào hồ sơ.",
        "PvP Đấu Tập: bot yếu hơn, thuần luyện tập. (PvP online người thật: mở khi có Supabase.)",
        "",
        "ĐIỀU KHIỂN TRONG TRẬN",
        "Chạm tướng ở bench rồi chạm ô trên bàn để đặt. Chạm tướng trên bàn để chọn, chạm ô khác để dời,",
        "hoặc dùng nút Về bench / Bán. Trang bị: chạm 1 món trong kho rồi chạm tướng để đeo (tối đa 3 món)."
    );

    public GuideScreen(MainGame game) { this.game = game; }

    @Override
    public void show() {
        stage = new Stage(new FitViewport(1280, 720));
        Gdx.input.setInputProcessor(stage);
        game.sound().playBgm("home");
        Assets a = game.assets;
        Table root = new Table();
        root.setFillParent(true);
        root.pad(24);
        stage.addActor(root);
        root.add(Ui.title(a, "HỌC CHƠI", Ui.GOLD)).align(com.badlogic.gdx.utils.Align.left).padBottom(10).row();
        Label body = Ui.label(a, TEXT, Color.WHITE);
        body.setWrap(true);
        Table inner = new Table();
        inner.add(body).width(1180).align(com.badlogic.gdx.utils.Align.left);
        ScrollPane sp = new ScrollPane(inner);
        sp.setFadeScrollBars(false);
        root.add(sp).expand().fill().row();
        TextButton back = Ui.button(a, "← Quay lại menu");
        back.addListener(new com.badlogic.gdx.scenes.scene2d.utils.ChangeListener() {
            @Override public void changed(ChangeEvent e, com.badlogic.gdx.scenes.scene2d.Actor actor) { game.setScreen(new MenuScreen(game)); }
        });
        root.add(back).align(com.badlogic.gdx.utils.Align.left).padTop(10);
    }

    @Override
    public void render(float delta) {
        Gdx.gl.glClearColor(0.07f, 0.05f, 0.14f, 1);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);
        com.badlogic.gdx.graphics.g2d.SpriteBatch sb = (com.badlogic.gdx.graphics.g2d.SpriteBatch) stage.getBatch();
        sb.begin();
        sb.draw(game.assets.lobbyTex, 0, 0, 1280, 720);
        sb.setColor(0, 0, 0, 0.68f);
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
