package com.dautruongchibi.game;

import com.dautruongchibi.data.GameData;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

// Ho so nguoi choi luu local dang JSON (port tu storage.ts/accounts.ts ban RN):
// ten, cap do + XP, hang + LP (rank), thong ke tran, tien do chien dich, ky luc song quai.
public final class Profile {
    public String name = "Người chơi";
    public int level = 1;
    public int xp = 0;
    public Rank.RankState rank = Rank.defaultRank();
    public int matches = 0, top1 = 0, top4 = 0, placementSum = 0;
    public int campaignCleared = 0; // man chien dich cao nhat da qua
    public int wavesBest = 0;
    // Tinh linh dong hanh (Little Legend kieu TFT): id mot quai trong GameData.MONSTERS,
    // chon o man Ho So, mac dinh la con dau tien cua bo ("slime").
    public String legendId = "slime";
    // San dau da chon (Arena kieu TFT): khoa trong ArenaTheme.CHOICES — "auto" = Theo
    // man (xoay theo chang nhu cu), hoac 1 theme co dinh. Mac dinh "auto".
    public String arenaId = ArenaTheme.AUTO;

    public double avgPlacement() { return matches > 0 ? (double) placementSum / matches : 0; }
    public String rankLabel() { return Rank.rankLabel(rank); }

    // Chi che do HANG moi thay doi LP (rank); Thuong/Dau Tap chi cong XP + thong ke.
    public Rank.LpResult applyMatchResult(int placement, boolean ranked) {
        matches++;
        if (placement == 1) top1++;
        if (placement <= 4) top4++;
        placementSum += placement;
        Rank.XpResult xr = Rank.applyXp(level, xp, Rank.xpForPlacement(placement));
        level = xr.level; xp = xr.xp;
        if (ranked) {
            Rank.LpResult r = Rank.applyLp(rank, placement);
            rank = r.rank;
            return r;
        }
        return null;
    }

    // ---------- JSON thu cong (dinh dang cua chinh minh, on dinh) ----------
    private static String esc(String s) {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"': b.append("\\\""); break;
                case '\\': b.append("\\\\"); break;
                case '\n': b.append("\\n"); break;
                case '\r': b.append("\\r"); break;
                case '\t': b.append("\\t"); break;
                default:
                    if (c < 0x20) b.append(String.format("\\u%04x", (int) c));
                    else b.append(c);
            }
        }
        return b.toString();
    }

    public String toJson() {
        StringBuilder b = new StringBuilder();
        b.append("{\n");
        b.append("  \"name\": \"").append(esc(name)).append("\",\n");
        b.append("  \"level\": ").append(level).append(",\n");
        b.append("  \"xp\": ").append(xp).append(",\n");
        b.append("  \"rankTier\": ").append(rank.tier).append(",\n");
        b.append("  \"rankDivision\": ").append(rank.division == null ? "null" : rank.division.toString()).append(",\n");
        b.append("  \"rankLp\": ").append(rank.lp).append(",\n");
        b.append("  \"matches\": ").append(matches).append(",\n");
        b.append("  \"top1\": ").append(top1).append(",\n");
        b.append("  \"top4\": ").append(top4).append(",\n");
        b.append("  \"placementSum\": ").append(placementSum).append(",\n");
        b.append("  \"campaignCleared\": ").append(campaignCleared).append(",\n");
        b.append("  \"wavesBest\": ").append(wavesBest).append(",\n");
        b.append("  \"legendId\": \"").append(esc(legendId == null ? "slime" : legendId)).append("\",\n");
        b.append("  \"arenaId\": \"").append(esc(arenaId == null ? ArenaTheme.AUTO : arenaId)).append("\"\n");
        b.append("}\n");
        return b.toString();
    }

    private static String strVal(String json, String key) {
        String pat = "\"" + key + "\"";
        int i = json.indexOf(pat);
        if (i < 0) return null;
        int colon = json.indexOf(':', i + pat.length());
        int q1 = json.indexOf('"', colon);
        if (q1 < 0) return null;
        StringBuilder out = new StringBuilder();
        for (int j = q1 + 1; j < json.length(); j++) {
            char c = json.charAt(j);
            if (c == '\\' && j + 1 < json.length()) {
                char n = json.charAt(++j);
                switch (n) {
                    case 'n': out.append('\n'); break;
                    case 't': out.append('\t'); break;
                    case 'r': out.append('\r'); break;
                    case 'u': out.append((char) Integer.parseInt(json.substring(j + 1, j + 5), 16)); j += 4; break;
                    default: out.append(n);
                }
            } else if (c == '"') break;
            else out.append(c);
        }
        return out.toString();
    }

    private static Integer intVal(String json, String key) {
        String pat = "\"" + key + "\"";
        int i = json.indexOf(pat);
        if (i < 0) return null;
        int colon = json.indexOf(':', i + pat.length());
        if (colon < 0) return null;
        int j = colon + 1;
        while (j < json.length() && (json.charAt(j) == ' ' || json.charAt(j) == '\t')) j++;
        if (json.startsWith("null", j)) return null;
        int k = j;
        if (k < json.length() && json.charAt(k) == '-') k++;
        while (k < json.length() && Character.isDigit(json.charAt(k))) k++;
        if (k == j) return null;
        try { return Integer.parseInt(json.substring(j, k)); } catch (NumberFormatException e) { return null; }
    }

    public static Profile fromJson(String json) {
        Profile p = new Profile();
        if (json == null) return p;
        String name = strVal(json, "name");
        if (name != null && !name.isEmpty()) p.name = name;
        Integer v;
        if ((v = intVal(json, "level")) != null) p.level = v;
        if ((v = intVal(json, "xp")) != null) p.xp = v;
        int tier = intVal(json, "rankTier") != null ? intVal(json, "rankTier") : 0;
        Integer div = intVal(json, "rankDivision");
        int lp = intVal(json, "rankLp") != null ? intVal(json, "rankLp") : 0;
        p.rank = new Rank.RankState(tier, tier >= Rank.APEX_TIER ? null : div, lp);
        if ((v = intVal(json, "matches")) != null) p.matches = v;
        if ((v = intVal(json, "top1")) != null) p.top1 = v;
        if ((v = intVal(json, "top4")) != null) p.top4 = v;
        if ((v = intVal(json, "placementSum")) != null) p.placementSum = v;
        if ((v = intVal(json, "campaignCleared")) != null) p.campaignCleared = v;
        if ((v = intVal(json, "wavesBest")) != null) p.wavesBest = v;
        String lg = strVal(json, "legendId");
        if (GameData.isMonsterId(lg)) p.legendId = lg; // id la/khong co -> giu mac dinh "slime"
        String ar = strVal(json, "arenaId");
        if (ArenaTheme.isChoice(ar)) p.arenaId = ar; // khoa la/khong co -> giu mac dinh "auto"
        return p;
    }

    // Luu/doc bang java.io (khong dung java.nio.file) de tuong thich TeaVM ban web.
    public void save(File file) {
        try {
            File parent = file.getParentFile();
            if (parent != null) parent.mkdirs();
            byte[] bytes = toJson().getBytes("UTF-8");
            try (OutputStream out = new FileOutputStream(file)) {
                out.write(bytes);
            }
        } catch (IOException | RuntimeException ignored) {
            // Khong luu duoc ho so khong duoc lam crash game
        }
    }

    public static Profile load(File file) {
        try {
            if (file != null && file.isFile()) {
                ByteArrayOutputStream buf = new ByteArrayOutputStream();
                try (InputStream in = new FileInputStream(file)) {
                    byte[] chunk = new byte[4096];
                    int n;
                    while ((n = in.read(chunk)) >= 0) buf.write(chunk, 0, n);
                }
                return fromJson(buf.toString("UTF-8"));
            }
        } catch (IOException | RuntimeException ignored) {}
        return new Profile();
    }

    public static File defaultPath() {
        String home = System.getProperty("user.home");
        return new File(new File(home, ".dau-truong-chibi"), "profile.json");
    }
}
