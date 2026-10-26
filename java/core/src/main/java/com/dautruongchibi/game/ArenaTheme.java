package com.dautruongchibi.game;

// Quy tac doi tranh san theo chang (hoc tu Kanto Tactics: moi truong ve tay doi theo tung chang;
// so lieu/quy tac khop ban RN - arenaTheme.ts):
// - Chien Dich: theo chuong (chapter-1)%3 -> rung / sa mac / bang; vong Boss -> hoang hon.
// - PvP + Song Quai: theo stage: 1 rung, 2 hoang hon, 3 sa mac, >=4 bang; vong Boss -> hoang hon.
// Khoa san khop Assets.arenaFor: "grass" | "sunset" | "desert" | "ice".
public final class ArenaTheme {
    private ArenaTheme() {}

    // ===== LUA CHON SAN CUA NGUOI CHOI (loadout kieu TFT, luu o Profile.arenaId) =====
    // "auto" = Theo man (giu quy tac xoay theo chang ben duoi); 4 khoa con lai la
    // theme co dinh ghi de moi quy tac xoay. Bot PvP duoc gan ngau nhien 1 theme
    // trong THEMES khi startPvp (nhu cach gan tinh linh).
    public static final String AUTO = "auto";
    public static final String[] THEMES = {"grass", "sunset", "desert", "ice"};
    public static final String[] CHOICES = {AUTO, "grass", "sunset", "desert", "ice"};

    public static boolean isTheme(String key) {
        for (String t : THEMES) if (t.equals(key)) return true;
        return false;
    }

    public static boolean isChoice(String key) {
        return AUTO.equals(key) || isTheme(key);
    }

    public static String nameOf(String key) {
        if ("sunset".equals(key)) return "Hoàng Hôn";
        if ("desert".equals(key)) return "Sa Mạc";
        if ("ice".equals(key)) return "Băng Tuyết";
        if ("grass".equals(key)) return "Đồng Cỏ";
        return "Theo màn";
    }

    // Giai quyet lua chon -> khoa san thuc te: theme co dinh thang thang; "auto"
    // (hoac gia tri la) -> khoa tu dong theo chang da tinh san (autoKey).
    public static String resolve(String choice, String autoKey) {
        return isTheme(choice) ? choice : autoKey;
    }

    public static String forCampaign(int chapter, boolean isBoss) {
        if (isBoss) return "sunset";
        switch ((Math.max(1, chapter) - 1) % 3) {
            case 0: return "grass";
            case 1: return "desert";
            default: return "ice";
        }
    }

    public static String forStage(int stage, boolean isBoss) {
        if (isBoss) return "sunset";
        if (stage <= 1) return "grass";
        if (stage == 2) return "sunset";
        if (stage == 3) return "desert";
        return "ice";
    }

    // Song Quai: quy stage = ceil(song/5); song Boss (moi 10 song) -> hoang hon.
    public static String forWaves(int wave, boolean isBossWave) {
        return forStage((int) Math.ceil(Math.max(1, wave) / 5.0), isBossWave);
    }
}
