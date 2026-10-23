package com.dautruongchibi.data;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

// Port nguyen van so lieu tu ban React Native (src/game/data.ts).
// Khong tu bia lai chi so: 25 tuong, 8 toc/he, 12 trang bi, 8 cuong hoa, 10 quai, 12 man chien dich goc.
public final class GameData {
    private GameData() {}

    public enum SkillKind { burst, aoe, stun, heal, shield, buffAS, summon, execute, poison, freeze, lifesteal, dash }

    public static final class SkillDef {
        public final String name; public final SkillKind kind; public final int power; public final String desc;
        public SkillDef(String name, SkillKind kind, int power, String desc) { this.name = name; this.kind = kind; this.power = power; this.desc = desc; }
    }

    public static final class ChampDef {
        public final String id, name; public final int cost;
        public final String[] traits;
        public final int hp, ad, armor, mr, range, mana;
        public final double as;
        public final String color, hair, accessory, weapon;
        public final SkillDef skill;
        public ChampDef(String id, String name, int cost, String t1, String t2, int hp, int ad, int armor, int mr, double as, int range, int mana,
                        String color, String hair, String accessory, String weapon, SkillDef skill) {
            this.id = id; this.name = name; this.cost = cost; this.traits = new String[]{t1, t2};
            this.hp = hp; this.ad = ad; this.armor = armor; this.mr = mr; this.as = as; this.range = range; this.mana = mana;
            this.color = color; this.hair = hair; this.accessory = accessory; this.weapon = weapon; this.skill = skill;
        }
        public boolean hasTrait(String t) { return traits[0].equals(t) || traits[1].equals(t); }
    }

    public static final class TraitDef {
        public final String id, name, desc; public final int[] thresholds;
        public TraitDef(String id, String name, int[] thresholds, String desc) { this.id = id; this.name = name; this.thresholds = thresholds; this.desc = desc; }
    }

    public static final class ItemDef {
        public final String id, name, desc, color;
        public final int hp, ad, ap, armor, mr, mana, crit, lifesteal;
        public final double asPct;
        public ItemDef(String id, String name, String desc, int hp, int ad, int ap, int armor, int mr, double asPct, int crit, int mana, int lifesteal, String color) {
            this.id = id; this.name = name; this.desc = desc; this.hp = hp; this.ad = ad; this.ap = ap; this.armor = armor; this.mr = mr;
            this.asPct = asPct; this.crit = crit; this.mana = mana; this.lifesteal = lifesteal; this.color = color;
        }
    }

    public static final class AugmentDef {
        public final String id, name, desc, kind; public final int value;
        public AugmentDef(String id, String name, String desc, String kind, int value) { this.id = id; this.name = name; this.desc = desc; this.kind = kind; this.value = value; }
    }

    public static final class MonsterDef {
        public final String id, name;
        public final int hp, ad, armor, mr, range, mana;
        public final double as;
        public final String color, hair, accessory, weapon;
        public final SkillDef skill;
        public MonsterDef(String id, String name, int hp, int ad, int armor, int mr, double as, int range, int mana,
                          String color, String hair, String accessory, String weapon, SkillDef skill) {
            this.id = id; this.name = name; this.hp = hp; this.ad = ad; this.armor = armor; this.mr = mr; this.as = as;
            this.range = range; this.mana = mana; this.color = color; this.hair = hair; this.accessory = accessory; this.weapon = weapon; this.skill = skill;
        }
        // Ban sao da scale mau/atk giong makeMonsterTeam cua engine.ts
        public MonsterDef scaled(double scale) {
            int nhp = (int) Math.round(hp * scale);
            int nad = (int) Math.round(ad * (1 + (scale - 1) * 0.7));
            return new MonsterDef(id, name, nhp, nad, armor, mr, as, range, mana, color, hair, accessory, weapon, skill);
        }
    }

    private static SkillDef S(String name, SkillKind kind, int power, String desc) { return new SkillDef(name, kind, power, desc); }

    public static final List<TraitDef> TRAITS = Arrays.asList(
        new TraitDef("hiepsi", "Hiệp Sĩ", new int[]{2, 4}, "Tăng giáp và máu."),
        new TraitDef("phuthuy", "Phù Thủy", new int[]{2, 4}, "Tăng sức mạnh kỹ năng."),
        new TraitDef("xathu", "Xạ Thủ", new int[]{2, 4}, "Tăng tốc đánh."),
        new TraitDef("satthu", "Sát Thủ", new int[]{2, 4}, "Tăng chí mạng."),
        new TraitDef("hove", "Hộ Vệ", new int[]{2, 4}, "Nhận khiên đầu trận, tăng máu."),
        new TraitDef("nguyento", "Nguyên Tố", new int[]{2, 3}, "Hồi mana nhanh hơn."),
        new TraitDef("tinhlinh", "Tinh Linh", new int[]{2, 4}, "Tăng né tránh và hồi máu."),
        new TraitDef("longtoc", "Long Tộc", new int[]{2, 3}, "Tăng mọi chỉ số.")
    );
    public static String traitName(String id) {
        for (TraitDef t : TRAITS) if (t.id.equals(id)) return t.name;
        return id;
    }

    public static final List<ChampDef> CHAMPIONS = Arrays.asList(
        new ChampDef("mimi", "Mimi Mèo", 1, "tinhlinh", "satthu", 550, 55, 20, 20, 0.75, 1, 50, "#ffb3c8", "#ff8fab", "tai-meo", "mong-vuot", S("Vuốt Nhanh", SkillKind.dash, 160, "Lao tới cào kẻ địch yếu máu nhất.")),
        new ChampDef("bobi", "Bobi Gấu", 1, "hove", "hiepsi", 700, 50, 35, 25, 0.6, 1, 60, "#ffd6a5", "#c98a4b", "tai-gau", "khien", S("Khiên Mật Ong", SkillKind.shield, 220, "Tạo khiên cho bản thân và đồng minh gần nhất.")),
        new ChampDef("lulu", "Lulu Phù Thủy", 1, "phuthuy", "nguyento", 500, 45, 15, 30, 0.7, 3, 60, "#cdb4f6", "#7b5ea7", "mu-phuthuy", "gay-phep", S("Cầu Ma Thuật", SkillKind.burst, 200, "Bắn cầu ma thuật gây sát thương lớn đơn thể.")),
        new ChampDef("pipo", "Pipo Chim Sẻ", 1, "xathu", "tinhlinh", 480, 60, 15, 15, 0.85, 4, 70, "#a2d2ff", "#3a86ff", "canh", "cung", S("Mưa Tên", SkillKind.aoe, 130, "Bắn mưa tên lên nhóm địch.")),
        new ChampDef("toto", "Toto Rùa", 1, "hove", "nguyento", 750, 45, 40, 30, 0.55, 1, 80, "#b9fbc0", "#2a9d8f", "mai-rua", "khien", S("Mai Cứng", SkillKind.shield, 260, "Nhận khiên dày và hồi máu.")),
        new ChampDef("nana", "Nana Thỏ", 2, "tinhlinh", "xathu", 520, 65, 18, 18, 0.9, 3, 60, "#ffc8dd", "#ff70a6", "tai-tho", "carot", S("Nhảy Nhót", SkillKind.buffAS, 35, "Tăng tốc đánh cho toàn đội trong 5 giây.")),
        new ChampDef("kiki", "Kiki Khỉ", 2, "satthu", "hiepsi", 600, 70, 22, 20, 0.8, 1, 50, "#ffcfd2", "#9d4edd", "duoi", "gay", S("Gậy Xoay", SkillKind.aoe, 150, "Xoay gậy gây sát thương quanh mình.")),
        new ChampDef("susu", "Susu Sứa", 2, "nguyento", "phuthuy", 540, 50, 16, 32, 0.7, 3, 55, "#90e0ef", "#00b4d8", "xuc-tu", "bong-bong", S("Điện Giật", SkillKind.stun, 150, "Gây sát thương và làm choáng 1.5 giây.")),
        new ChampDef("dodo", "Dodo Vịt", 2, "hove", "tinhlinh", 650, 55, 28, 28, 0.65, 2, 70, "#fdffb6", "#ffd60a", "mo-vit", "loa", S("Tiếng Hát Hồi Phục", SkillKind.heal, 220, "Hồi máu cho đồng minh yếu nhất.")),
        new ChampDef("rero", "Rero Robot", 2, "hiepsi", "nguyento", 680, 58, 38, 22, 0.65, 1, 75, "#dee2e6", "#6c757d", "angten", "bung-nang-luong", S("Tia Laser", SkillKind.burst, 230, "Bắn laser xuyên mục tiêu.")),
        new ChampDef("fifi", "Fifi Cáo", 3, "satthu", "phuthuy", 580, 68, 20, 24, 0.85, 2, 45, "#ffadad", "#e85d04", "tai-cao", "quat", S("Lửa Hồ Ly", SkillKind.poison, 60, "Đốt địch, gây sát thương theo thời gian.")),
        new ChampDef("gogo", "Gogo Hiệp Sĩ", 3, "hiepsi", "hove", 850, 65, 45, 35, 0.6, 1, 80, "#a9d6e5", "#4361ee", "mu-sat", "kiem", S("Chém Công Lý", SkillKind.stun, 180, "Chém mạnh và làm choáng mục tiêu.")),
        new ChampDef("haha", "Haha Hề", 3, "phuthuy", "satthu", 560, 60, 18, 26, 0.8, 3, 60, "#e0aaff", "#5a189a", "mu-he", "bong", S("Bóng Nổ", SkillKind.aoe, 190, "Ném bóng nổ diện rộng.")),
        new ChampDef("vivi", "Vivi Tiên", 3, "tinhlinh", "phuthuy", 530, 52, 16, 30, 0.75, 3, 65, "#caffbf", "#38b000", "canh-tien", "dua-than", S("Phấn Tiên", SkillKind.heal, 280, "Hồi máu cho 2 đồng minh yếu nhất.")),
        new ChampDef("zaza", "Zaza Sấm", 3, "xathu", "nguyento", 570, 75, 18, 20, 0.95, 4, 55, "#fff3b0", "#f77f00", "tia-set", "sung-set", S("Sấm Liên Hoàn", SkillKind.burst, 240, "Bắn tia sét nhảy qua 3 mục tiêu.")),
        new ChampDef("baba", "Bà Ba Phù Thủy", 4, "phuthuy", "longtoc", 620, 55, 20, 35, 0.7, 3, 70, "#bdb2ff", "#3c096c", "mu-phuthuy", "sach", S("Mưa Sao Băng", SkillKind.aoe, 280, "Triệu hồi mưa sao băng diện rộng lớn.")),
        new ChampDef("king", "Vua Bánh King", 4, "hiepsi", "longtoc", 950, 75, 50, 40, 0.62, 1, 90, "#ffe5b4", "#bc6c25", "vuong-mien", "kiem-vang", S("Uy Nghiêm Của Vua", SkillKind.buffAS, 45, "Buff toàn đội và tạo khiên cho bản thân.")),
        new ChampDef("queen", "Nữ Hoàng Kẹo", 4, "hove", "longtoc", 700, 60, 30, 38, 0.7, 3, 75, "#ffc6ff", "#c9184a", "gay-keo", "keo", S("Kẹo Ngọt", SkillKind.heal, 350, "Hồi máu lớn cho toàn đội.")),
        new ChampDef("drago", "Drago Rồng Con", 4, "longtoc", "nguyento", 800, 80, 35, 35, 0.7, 2, 80, "#ff9770", "#d62828", "sung", "lua", S("Hơi Thở Lửa", SkillKind.aoe, 260, "Phun lửa hình nón diện rộng.")),
        new ChampDef("shadow", "Bóng Đêm Pyon", 4, "satthu", "longtoc", 640, 90, 22, 22, 0.95, 1, 40, "#adb5bd", "#212529", "khan", "dao", S("Ám Sát", SkillKind.execute, 300, "Kết liễu mục tiêu yếu máu với sát thương cực lớn.")),
        new ChampDef("astro", "Phi Hành Gia Mo", 5, "nguyento", "hiepsi", 900, 85, 45, 45, 0.7, 2, 100, "#caf0f8", "#0077b6", "mu-vu-tru", "tia-vu-tru", S("Hố Đen Nhỏ", SkillKind.freeze, 280, "Đóng băng nhóm địch 2 giây, sát thương lớn.")),
        new ChampDef("phoenix", "Phượng Hoàng Lửa", 5, "longtoc", "phuthuy", 850, 70, 30, 40, 0.75, 3, 90, "#ffb703", "#fb8500", "canh-lua", "lua-phuong", S("Tái Sinh Lửa", SkillKind.lifesteal, 320, "Sát thương lớn và hồi máu 60% sát thương.")),
        new ChampDef("titan", "Titan Bánh Quy", 5, "hove", "hiepsi", 1300, 80, 60, 50, 0.55, 1, 100, "#e6ccb2", "#7f5539", "sung", "bua", S("Đập Đất", SkillKind.stun, 250, "Đập đất gây sát thương và choáng diện rộng 2 giây.")),
        new ChampDef("luna", "Luna Công Chúa Trăng", 5, "tinhlinh", "xathu", 700, 95, 25, 30, 1.0, 4, 60, "#e0c3fc", "#7209b7", "trang", "cung-trang", S("Tên Trăng", SkillKind.execute, 350, "Bắn tên trăng cực mạnh, mạnh hơn khi địch yếu máu.")),
        new ChampDef("sumo", "Sumo Triệu Hồi Sư", 5, "hove", "phuthuy", 750, 60, 32, 36, 0.65, 3, 110, "#d8f3dc", "#1b4332", "vong", "chuong", S("Triệu Hồi Golem Bánh", SkillKind.summon, 0, "Triệu hồi Golem Bánh 900 máu chắn phía trước."))
    );
    public static ChampDef champById(String id) {
        for (ChampDef c : CHAMPIONS) if (c.id.equals(id)) return c;
        throw new IllegalArgumentException("Unknown champ " + id);
    }

    public static final List<ItemDef> ITEMS = Arrays.asList(
        new ItemDef("kiem", "Kiếm Bánh Quy", "+20 sát thương", 0, 20, 0, 0, 0, 0, 0, 0, 0, "#f4a261"),
        new ItemDef("giap", "Giáp Kẹo Cứng", "+25 giáp, +150 máu", 150, 0, 0, 25, 0, 0, 0, 0, 0, "#90e0ef"),
        new ItemDef("nuocmat", "Giọt Nước Mắt Sao", "+20 mana, +15 SMKN", 0, 0, 15, 0, 0, 0, 0, 20, 0, "#48cae4"),
        new ItemDef("gay", "Gậy Socola", "+30 SMKN", 0, 0, 30, 0, 0, 0, 0, 0, 0, "#9d6b53"),
        new ItemDef("cung", "Cung Kẹo Dẻo", "+25% tốc đánh", 0, 0, 0, 0, 0, 25, 0, 0, 0, "#ff8fab"),
        new ItemDef("aochoang", "Áo Choàng Đêm", "+25 kháng phép, +200 máu", 200, 0, 0, 0, 25, 0, 0, 0, 0, "#5a189a"),
        new ItemDef("gang", "Găng Kim Cương", "+20% chí mạng, +15 SMKN", 0, 0, 15, 0, 0, 0, 20, 0, 0, "#ffd60a"),
        new ItemDef("tim", "Trái Tim Ấm", "+400 máu", 400, 0, 0, 0, 0, 0, 0, 0, 0, "#ef476f"),
        new ItemDef("vuot", "Vuốt Rồng", "+20% hút máu, +15 sát thương", 0, 15, 0, 0, 0, 0, 0, 0, 20, "#d62828"),
        new ItemDef("sachcu", "Sách Cổ Ma Thuật", "+40 SMKN, +10 mana", 0, 0, 40, 0, 0, 0, 0, 10, 0, "#7b5ea7"),
        new ItemDef("khienvang", "Khiên Vàng", "+35 giáp, +35 kháng phép", 0, 0, 0, 35, 35, 0, 0, 0, 0, "#ffb703"),
        new ItemDef("giay", "Giày Bay", "+20% tốc đánh", 0, 0, 0, 0, 0, 20, 0, 0, 0, "#38b000")
    );
    public static ItemDef itemById(String id) {
        for (ItemDef i : ITEMS) if (i.id.equals(id)) return i;
        return null;
    }

    public static final List<AugmentDef> AUGMENTS = Arrays.asList(
        new AugmentDef("vang1", "Túi Vàng May Mắn", "Nhận ngay 12 vàng.", "gold", 12),
        new AugmentDef("vang2", "Lãi Kép", "Nhận thêm vàng khi thắng round.", "winGold", 4),
        new AugmentDef("mau1", "Trái Tim Đội", "Toàn đội +15% máu tối đa.", "teamHp", 15),
        new AugmentDef("sat1", "Sắc Bén", "Toàn đội +12% sát thương.", "teamAd", 12),
        new AugmentDef("hoi1", "Hồi Phục Nhanh", "Hồi 20 máu người chơi, +2 máu mỗi round.", "healPlayer", 20),
        new AugmentDef("toc1", "Nhanh Như Chớp", "Toàn đội +12% tốc đánh.", "teamAs", 12),
        new AugmentDef("kinhnghiem", "Học Nhanh", "Nhận ngay 12 XP.", "xp", 12),
        new AugmentDef("giapdoi", "Giáp Đội", "Toàn đội +15 giáp và kháng phép.", "teamArmor", 15)
    );
    public static AugmentDef augmentById(String id) {
        for (AugmentDef a : AUGMENTS) if (a.id.equals(id)) return a;
        return null;
    }

    private static MonsterDef M(String id, String name, int hp, int ad, String color, String acc, SkillDef skill) {
        return new MonsterDef(id, name, hp, ad, 15, 15, 0.7, 1, 60, color, color, acc, "mong-vuot", skill);
    }
    public static final List<MonsterDef> MONSTERS = Arrays.asList(
        M("slime", "Slime Hồng", 350, 30, "#ffc8dd", "tai-meo", S("Nảy Nảy", SkillKind.burst, 80, "Nhảy lên đập mục tiêu.")),
        M("nam", "Nấm Độc", 420, 35, "#b9fbc0", "mu-nam", S("Bào Tử Độc", SkillKind.poison, 30, "Phun độc theo thời gian.")),
        M("goblin", "Goblin Tinh Nghịch", 500, 45, "#caffbf", "tai-goblin", S("Chém Lén", SkillKind.dash, 110, "Lao tới chém.")),
        M("soi", "Sói Xám Con", 600, 55, "#dee2e6", "tai-soi", S("Cắn Mạnh", SkillKind.burst, 140, "Cắn gây sát thương lớn.")),
        M("golem", "Golem Đá", 1000, 50, "#adb5bd", "sung-da", S("Đập Đất", SkillKind.stun, 120, "Đập đất làm choáng.")),
        M("skeleton", "Xương Khô Cười", 650, 65, "#f8f9fa", "mu-xuong", S("Ném Xương", SkillKind.burst, 160, "Ném xương từ xa.")),
        M("witchmob", "Phù Thủy Rừng", 700, 60, "#cdb4f6", "mu-phuthuy", S("Nguyền Rủa", SkillKind.aoe, 150, "Nguyền diện rộng.")),
        M("dragonboss", "Rồng Boss Lửa", 2200, 90, "#ff9770", "sung", S("Lửa Địa Ngục", SkillKind.aoe, 260, "Phun lửa diện rộng cực mạnh.")),
        M("frostboss", "Boss Băng Giá", 2600, 85, "#90e0ef", "vuong-mien", S("Bão Tuyết", SkillKind.freeze, 240, "Đóng băng diện rộng.")),
        M("kingboss", "Vua Quái Vật", 3200, 100, "#ffe5b4", "vuong-mien", S("Triệu Hồi Đàn Em", SkillKind.summon, 0, "Triệu hồi thêm quái nhỏ."))
    );
    public static MonsterDef monsterById(String id) {
        for (MonsterDef m : MONSTERS) if (m.id.equals(id)) return m;
        throw new IllegalArgumentException("Unknown monster " + id);
    }

    public static final class CampaignStage {
        public final int id, chapter, reward; public final String name;
        public final List<String[]> enemies; // moi phan tu: {monsterId, count}
        public CampaignStage(int id, String name, List<String[]> enemies, int reward) {
            this.id = id; this.name = name; this.enemies = enemies; this.reward = reward;
            this.chapter = id <= 4 ? 1 : id <= 8 ? 2 : 3;
        }
    }
    private static String[] E(String id, int count) { return new String[]{id, String.valueOf(count)}; }
    public static final List<CampaignStage> CAMPAIGN = Arrays.asList(
        new CampaignStage(1, "Rừng Slime", Arrays.<String[]>asList(E("slime", 2)), 30),
        new CampaignStage(2, "Đồi Nấm", Arrays.asList(E("slime", 2), E("nam", 1)), 40),
        new CampaignStage(3, "Hang Goblin", Arrays.asList(E("goblin", 2), E("nam", 1)), 50),
        new CampaignStage(4, "Boss: Golem Đá", Arrays.asList(E("golem", 1), E("slime", 2)), 90),
        new CampaignStage(5, "Bãi Biển Sói", Arrays.<String[]>asList(E("soi", 3)), 70),
        new CampaignStage(6, "Tháp Xương", Arrays.asList(E("skeleton", 3), E("goblin", 1)), 80),
        new CampaignStage(7, "Rừng Phù Thủy", Arrays.asList(E("witchmob", 2), E("soi", 2)), 95),
        new CampaignStage(8, "Boss: Rồng Lửa", Arrays.asList(E("dragonboss", 1), E("slime", 2)), 140),
        new CampaignStage(9, "Lâu Đài Băng", Arrays.asList(E("skeleton", 3), E("witchmob", 2)), 120),
        new CampaignStage(10, "Đội Quân Bóng Đêm", Arrays.asList(E("soi", 3), E("skeleton", 3)), 140),
        new CampaignStage(11, "Cận Vệ Vua Quái", Arrays.asList(E("golem", 2), E("witchmob", 2)), 160),
        new CampaignStage(12, "Boss Cuối: Vua Quái Vật", Arrays.asList(E("kingboss", 1), E("dragonboss", 1)), 250)
    );

    public static final int[] LEVEL_XP = {0, 2, 6, 10, 20, 32, 50, 72, 100000};
    // SHOP_ODDS[level 1..9][cost-1] theo %
    public static final int[][] SHOP_ODDS = {
        {},
        {100, 0, 0, 0, 0}, {100, 0, 0, 0, 0}, {75, 25, 0, 0, 0}, {55, 30, 15, 0, 0},
        {45, 33, 20, 2, 0}, {30, 40, 25, 5, 0}, {19, 35, 35, 10, 1}, {18, 28, 36, 16, 2}, {10, 20, 35, 28, 7}
    };
    public static final List<String> BOT_NAMES = Arrays.asList("Bé Na", "Anh Tèo", "Chị Mây", "Bé Bắp", "Ông Kẹo", "Chị Sao", "Bé Mít");

    // Gom toan bo id nghe nghiep (art) can sprite: 25 tuong + 10 quai + golem summon dung art 'golem'
    public static List<String> allUnitArtIds() {
        List<String> out = new ArrayList<>();
        for (ChampDef c : CHAMPIONS) out.add(c.id);
        for (MonsterDef m : MONSTERS) out.add(m.id);
        return out;
    }
}
