package com.dautruongchibi.game;

// Quy tac doi tranh san theo chang (hoc tu Kanto Tactics: moi truong ve tay doi theo tung chang;
// so lieu/quy tac khop ban RN - arenaTheme.ts):
// - Chien Dich: theo chuong (chapter-1)%3 -> rung / sa mac / bang; vong Boss -> hoang hon.
// - PvP + Song Quai: theo stage: 1 rung, 2 hoang hon, 3 sa mac, >=4 bang; vong Boss -> hoang hon.
// Khoa san khop Assets.arenaFor: "grass" | "sunset" | "desert" | "ice".
public final class ArenaTheme {
    private ArenaTheme() {}

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
