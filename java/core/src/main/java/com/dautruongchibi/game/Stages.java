package com.dautruongchibi.game;

import com.dautruongchibi.data.GameData;
import com.dautruongchibi.data.GameData.CampaignStage;
import com.dautruongchibi.data.GameData.MonsterDef;

import java.util.ArrayList;
import java.util.List;

// He thong sinh man PvE port tu stages.ts: 5.200 man / 52 chuong, tat dinh theo id man.
// 12 man dau lay nguyen tu CAMPAIGN; tu man 13 sinh thu tuc theo chu de chuong + seed rieng.
public final class Stages {
    private Stages() {}

    public static final int TOTAL_STAGES = 5200;
    public static final int CHAPTER_SIZE = 100;
    public static final int CHAPTER_COUNT = 52;

    public static final class ThemeDef {
        public final String name; public final String[] monsters; public final String boss; public final String hue;
        public ThemeDef(String name, String[] monsters, String boss, String hue) { this.name = name; this.monsters = monsters; this.boss = boss; this.hue = hue; }
    }
    public static final ThemeDef[] THEMES = {
        new ThemeDef("Rừng Slime", new String[]{"slime", "nam", "goblin"}, "golem", "#7bc96f"),
        new ThemeDef("Đồi Nấm Độc", new String[]{"nam", "goblin", "witchmob"}, "golem", "#95d5b2"),
        new ThemeDef("Hang Goblin", new String[]{"goblin", "slime", "skeleton"}, "golem", "#e9c46a"),
        new ThemeDef("Thung Lũng Sói", new String[]{"soi", "goblin", "slime"}, "dragonboss", "#a2d2ff"),
        new ThemeDef("Tháp Xương", new String[]{"skeleton", "witchmob", "soi"}, "frostboss", "#ced4da"),
        new ThemeDef("Rừng Phù Thủy", new String[]{"witchmob", "nam", "skeleton"}, "frostboss", "#cdb4f6"),
        new ThemeDef("Núi Lửa Rồng", new String[]{"golem", "soi", "goblin"}, "dragonboss", "#ff9770"),
        new ThemeDef("Lâu Đài Băng", new String[]{"skeleton", "witchmob", "golem"}, "frostboss", "#90e0ef"),
        new ThemeDef("Vương Quốc Bóng Đêm", new String[]{"soi", "skeleton", "witchmob"}, "kingboss", "#bdb2ff"),
        new ThemeDef("Đền Cổ Golem", new String[]{"golem", "skeleton", "goblin"}, "kingboss", "#ffd6a5"),
        new ThemeDef("Vực Sâu Hỗn Loạn", new String[]{"witchmob", "soi", "golem", "skeleton"}, "kingboss", "#ffadad"),
        new ThemeDef("Thiên Đỉnh Rồng", new String[]{"golem", "witchmob", "soi"}, "dragonboss", "#ffb703")
    };
    private static final String[] CHAPTER_BOSSES = {"kingboss", "frostboss", "dragonboss"};

    public static final class StageDef {
        public int id, chapter, theme, reward, power;
        public String name;
        public boolean isBoss, isChapterBoss;
    }

    static int hash32(int n) {
        int h = (n) ^ 0x9e3779b9;
        h = (h ^ (h >>> 16)) * 0x21f0aaad;
        h = (h ^ (h >>> 15)) * 0x735a2d97;
        return (h ^ (h >>> 15));
    }

    public static double difficultyScale(int id) {
        return 1 + Math.pow(Math.max(0, id - 12) / 140.0, 1.25);
    }
    public static int stagePower(int id) {
        return (int) Math.round(90 * difficultyScale(id) + id * 3);
    }
    public static int chapterOf(int id) { return (int) Math.ceil(id / (double) CHAPTER_SIZE); }
    private static int themeIndexOf(int chapter) { return (chapter - 1) % THEMES.length; }
    private static String bossIdFor(int id, int chapter) {
        if (id % CHAPTER_SIZE == 0) return CHAPTER_BOSSES[(chapter - 1) % CHAPTER_BOSSES.length];
        return THEMES[themeIndexOf(chapter)].boss;
    }
    public static int stageReward(int id) {
        if (id <= GameData.CAMPAIGN.size()) return GameData.CAMPAIGN.get(id - 1).reward;
        int chapter = chapterOf(id);
        int r = (int) Math.round(24 + id * 0.55 + chapter * 10);
        if (id % CHAPTER_SIZE == 0) r *= 3;
        else if (id % 10 == 0) r = (int) Math.round(r * 1.5);
        return r;
    }
    public static StageDef stageDef(int id) {
        int chapter = chapterOf(id);
        StageDef d = new StageDef();
        d.id = id; d.chapter = chapter; d.theme = themeIndexOf(chapter);
        d.isBoss = id % 10 == 0; d.isChapterBoss = id % CHAPTER_SIZE == 0;
        if (id <= GameData.CAMPAIGN.size()) d.name = GameData.CAMPAIGN.get(id - 1).name;
        else if (d.isBoss) d.name = "Boss: " + GameData.monsterById(bossIdFor(id, chapter)).name;
        else d.name = THEMES[d.theme].name + " - Màn " + id;
        d.reward = stageReward(id);
        d.power = stagePower(id);
        return d;
    }
    private static String toRoman(int n) {
        int[][] table = {{10, 0}, {9, 1}, {5, 2}, {4, 3}, {1, 4}};
        String[] syms = {"X", "IX", "V", "IV", "I"};
        StringBuilder out = new StringBuilder();
        int v = n;
        for (int i = 0; i < table.length; i++) while (v >= table[i][0]) { out.append(syms[i]); v -= table[i][0]; }
        return out.toString();
    }
    public static String chapterName(int chapter) {
        ThemeDef theme = THEMES[themeIndexOf(chapter)];
        int loop = (chapter - 1) / THEMES.length;
        return loop == 0 ? theme.name : theme.name + " " + toRoman(loop + 1);
    }
    private static int regularCount(int id) { return Math.min(9, 3 + Math.max(0, (id - 13) / 250)); }
    private static int starFor(int id, double r) {
        double p3 = id > 3500 ? 0.12 : 0;
        double p2 = id > 3500 ? 0.35 : id > 1500 ? 0.3 : id > 600 ? 0.12 : 0;
        if (r < p3) return 3;
        if (r < p3 + p2) return 2;
        return 1;
    }

    public static List<Engine.PlacedUnit> buildStageTeam(int id) {
        if (id <= GameData.CAMPAIGN.size()) {
            CampaignStage st = GameData.CAMPAIGN.get(id - 1);
            List<Engine.MonsterPick> picks = new ArrayList<>();
            for (String[] e : st.enemies) picks.add(new Engine.MonsterPick(GameData.monsterById(e[0]), Integer.parseInt(e[1])));
            return Engine.makeMonsterTeam(picks, 1);
        }
        int chapter = chapterOf(id);
        ThemeDef theme = THEMES[themeIndexOf(chapter)];
        Rng rng = new Rng(Integer.toUnsignedLong(hash32(id)));
        double scale = difficultyScale(id);
        int count = regularCount(id);
        List<Engine.MonsterPick> picks = new ArrayList<>();
        for (int i = 0; i < count; i++) picks.add(new Engine.MonsterPick(GameData.monsterById(theme.monsters[rng.nextInt(theme.monsters.length)]), 1));
        List<Engine.PlacedUnit> team = Engine.makeMonsterTeam(picks, scale);
        boolean isBoss = id % 10 == 0;
        boolean isChapterBoss = id % CHAPTER_SIZE == 0;
        if (isBoss) {
            double bossScale = scale * (isChapterBoss ? 3 : 1.8);
            List<Engine.MonsterPick> bp = new ArrayList<>();
            bp.add(new Engine.MonsterPick(GameData.monsterById(bossIdFor(id, chapter)), 1));
            team.addAll(Engine.makeMonsterTeam(bp, bossScale));
        }
        for (int i = 0; i < team.size(); i++) {
            Engine.PlacedUnit u = team.get(i);
            boolean isBossUnit = isBoss && i == team.size() - 1;
            u.uid = "s" + id + "-" + i;
            u.x = i % 7;
            u.y = i < 4 ? 0 : 2;
            if (isBossUnit) u.star = isChapterBoss && id >= 2500 ? 2 : 1;
            else u.star = starFor(id, rng.next());
        }
        return team;
    }
}
