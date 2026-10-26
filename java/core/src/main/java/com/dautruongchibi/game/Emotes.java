package com.dautruongchibi.game;

import java.util.Random;

// Logic THUAN cua VONG EMOTE (sticker ve kieu TFT) — tach khoi tang UI de
// HeadlessMain kiem chung duoc ma khong can moi truong do hoa: chi so sticker,
// khuon mat nen, thoi luong/hoi chieu, duong cong phong/mo cua sticker, dieu
// kien sticker Vui tu bat khi thang vong, va quyet dinh phan ung cua bot.
// Bot gieo hat bang Random TRUYEN VAO (MatchScreen dung Random gieo tu seed
// cua tran) nen hanh vi tat dinh khi test/chup anh. Hinh anh sticker (Pixmap)
// va vong quay nam o MatchScreen. TUYET DOI khong dung ky tu emoji: sticker
// la tranh ve tu khuon mat that cua game + bieu cam ve bang Pixmap.
public final class Emotes {
    private Emotes() { }

    // 6 sticker theo dung thu tu o tren vong quay (bat dau tu o tren cung)
    public static final int HAPPY = 0;    // Vui: mat trai tim + ma hong — mat Gogo Hiep Si
    public static final int LAUGH = 1;    // Cuoi lon: mat nham + mieng cuoi to — mat Slime Hong
    public static final int ANGRY = 2;    // Gian: dau gan gian + long may — mat Golem Da
    public static final int CRY = 3;      // Khoc: giot nuoc mat chay — mat Nam Doc
    public static final int SURPRISE = 4; // Ngac nhien: dau cham than + mieng O — mat Phu Thuy Rung
    public static final int TAUNT = 5;    // Khieu khich: le luoi + nhay mat — mat Goblin Tinh Nghich
    public static final int COUNT = 6;

    // Khuon mat nen cua tung sticker: id nghe thuat THAT cua game (tuong hoac
    // quai) — MatchScreen cat vung dau theo hop alpha giong Assets.unitHeadRegion.
    public static final String[] FACE_IDS = {"gogo", "slime", "golem", "nam", "witchmob", "goblin"};

    public static final float DURATION = 2.5f;    // giay sticker ton tai tren dau tinh linh
    public static final float COOLDOWN = 5f;      // hoi chieu emote THU CONG (giay) — chong spam
    public static final float BOT_MIN_GAP = 10f;  // khoang cach toi thieu giua 2 lan bot bat sticker (giay)
    public static final float BOT_WIN_CHANCE = 0.35f;     // xac suat bot dap lai khi THANG vong truoc mat minh
    public static final float BOT_AMBIENT_CHANCE = 0.08f; // xac suat bot bat ngau nhien o mot pha chuan bi

    // Con dung duoc emote thu cong khong (het hoi chieu chua)
    public static boolean canUse(float cooldownLeft) { return cooldownLeft <= 0f; }

    // Ti le phong cua sticker theo thoi gian da bat: 0.6 -> 1.05 (nay qua mot
    // chut) -> 1.0 dung yen; ngoai khoang song thi giu 1.0 (alpha se ve 0).
    public static float popScale(float t) {
        if (t <= 0f) return 0.6f;
        if (t < 0.16f) return 0.6f + (1.05f - 0.6f) * (t / 0.16f);
        if (t < 0.30f) return 1.05f - 0.05f * ((t - 0.16f) / 0.14f);
        return 1f;
    }

    // Do mo cua sticker: trong suot truoc khi bat, 1.0 trong phan lon thoi gian
    // song, mo dan tuyen tinh ve 0 trong 0.4 giay cuoi.
    public static float popAlpha(float t) {
        if (t < 0f || t >= DURATION) return 0f;
        float fadeStart = DURATION - 0.4f;
        if (t <= fadeStart) return 1f;
        return 1f - (t - fadeStart) / 0.4f;
    }

    // Sticker Vui TU BAT tren tinh linh cua minh khi thang vong: chi khi vong do
    // nguoi choi CHUA dung emote thu cong (tranh chong 2 sticker lien tiep) va
    // hien khong co sticker nao dang hien.
    public static boolean shouldAutoCelebrate(boolean humanWon, boolean usedManualThisRound, boolean stickerShowing) {
        return humanWon && !usedManualThisRound && !stickerShowing;
    }

    // Bot khong spam: hai lan bot bat sticker (bat ke nguon: phan ung hay ngau
    // nhien) phai cach nhau toi thieu BOT_MIN_GAP giay tren dong ho tran.
    public static boolean botMayPop(float lastPopAt, float now, float minGap) {
        return now - lastPopAt >= minGap;
    }

    // Phan ung cua bot DOI THU sau mot vong dau voi nguoi choi:
    // - Bi nguoi choi LOAI HAN o vong nay -> sticker KHOC (chac chan, khoanh khac
    //   lon nhat cua bot — khong gieo xac suat).
    // - Thang vong truoc mat nguoi choi -> BOT_WIN_CHANCE co hoi bat VUI hoac
    //   KHIEU KHICH (50/50).
    // - Con lai (thua vong thuong / hoa) -> khong bat gi (-1).
    public static int botReaction(Random rng, boolean botWonRound, boolean botEliminated) {
        if (botEliminated) return CRY;
        if (botWonRound && rng.nextFloat() < BOT_WIN_CHANCE) return rng.nextBoolean() ? HAPPY : TAUNT;
        return -1;
    }

    // Sticker NGAU NHIEN cua bot o pha chuan bi: xac suat nho moi vong, chon
    // deu 1 trong 6 sticker; -1 = vong nay bot im lang.
    public static int botPlanningAmbient(Random rng) {
        if (rng.nextFloat() >= BOT_AMBIENT_CHANCE) return -1;
        return rng.nextInt(COUNT);
    }
}
