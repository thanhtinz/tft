package com.dautruongchibi.game;

// He thong HANG + LP (rank) port tu auth.ts ban RN: 10 bac, LP theo bang rieng tung nhom bac.
public final class Rank {
    private Rank() {}

    public static final String[] RANK_TIERS = {"Sắt", "Đồng", "Bạc", "Vàng", "Bạch Kim", "Ngọc Lục Bảo", "Kim Cương", "Cao Thủ", "Đại Cao Thủ", "Thách Đấu"};
    public static final String[] TIER_COLORS = {"#8d99ae", "#c97b4a", "#c0c8d4", "#f5c542", "#7fe7dc", "#2ecc71", "#5eb2f2", "#b388ff", "#ff6b81", "#ffb703"};
    public static final int APEX_TIER = 7;
    public static final int APEX_PROMOTE_LP = 200;
    public static final int[] PLACEMENT_XP = {50, 42, 36, 30, 24, 18, 12, 8};

    public static final class RankState {
        public int tier; public Integer division; public int lp;
        public RankState(int tier, Integer division, int lp) { this.tier = tier; this.division = division; this.lp = lp; }
        public RankState copy() { return new RankState(tier, division, lp); }
    }
    public static RankState defaultRank() { return new RankState(0, 4, 0); }

    private static final String[] ROMAN = {"", "I", "II", "III", "IV"};
    public static String rankLabel(RankState r) {
        String t = RANK_TIERS[Math.max(0, Math.min(9, r.tier))];
        return r.division != null ? t + " " + ROMAN[r.division] + " • " + r.lp + " LP" : t + " • " + r.lp + " LP";
    }
    public static String rankShort(RankState r) {
        String t = RANK_TIERS[Math.max(0, Math.min(9, r.tier))];
        return r.division != null ? t + " " + ROMAN[r.division] : t;
    }

    // Bang LP theo nhom bac (hang 1..8)
    private static final int[] LP_LOW = {46, 32, 20, 12, -4, -12, -22, -34};
    private static final int[] LP_MID = {42, 30, 19, 11, -6, -15, -25, -38};
    private static final int[] LP_HIGH = {40, 28, 18, 10, -8, -17, -28, -42};
    private static final int[] LP_APEX = {38, 26, 17, 10, -10, -19, -30, -45};

    public static int lpDelta(int placement, int tier) {
        int[] tbl = tier <= 1 ? LP_LOW : tier <= 3 ? LP_MID : tier <= 5 ? LP_HIGH : LP_APEX;
        return tbl[Math.max(1, Math.min(8, placement)) - 1];
    }

    public static final class LpResult {
        public RankState rank; public int delta; public boolean promoted, demoted;
    }

    public static LpResult applyLp(RankState in, int placement) {
        int delta = lpDelta(placement, in.tier);
        int tier = in.tier; Integer division = in.division; int lp = in.lp + delta;
        boolean promoted = false, demoted = false;
        while (true) {
            if (tier >= APEX_TIER) {
                if (lp >= APEX_PROMOTE_LP && tier < 9) { lp -= APEX_PROMOTE_LP; tier++; division = null; promoted = true; continue; }
                break;
            }
            if (lp >= 100) {
                lp -= 100; promoted = true;
                if (division != null && division > 1) division--;
                else if (tier < 6) { tier++; division = 4; }
                else { tier = APEX_TIER; division = null; }
                continue;
            }
            break;
        }
        while (lp < 0) {
            if (tier >= APEX_TIER) {
                if (tier > APEX_TIER) { tier--; lp += 75; demoted = true; continue; }
                tier = 6; division = 1; lp += 75; demoted = true; continue;
            }
            if (tier == 0 && division != null && division == 4) { lp = 0; break; }
            if (division != null && division < 4) { division++; lp += 75; demoted = true; continue; }
            tier--; division = 1; lp += 75; demoted = true;
        }
        LpResult r = new LpResult();
        r.rank = new RankState(tier, division, lp); r.delta = delta; r.promoted = promoted; r.demoted = demoted;
        return r;
    }

    public static int xpForPlacement(int placement) { return PLACEMENT_XP[Math.max(1, Math.min(8, placement)) - 1]; }
    public static int xpToNextLevel(int level) { return 80 + (level - 1) * 40; }

    public static final class XpResult { public int level, xp, levelsGained; }
    public static XpResult applyXp(int level, int xp, int gained) {
        int lv = level, x = xp + Math.max(0, gained), g = 0;
        while (x >= xpToNextLevel(lv)) { x -= xpToNextLevel(lv); lv++; g++; }
        XpResult r = new XpResult(); r.level = lv; r.xp = x; r.levelsGained = g;
        return r;
    }
}
