package com.dautruongchibi.headless;

import com.dautruongchibi.data.GameData;
import com.dautruongchibi.game.ArenaTheme;
import com.dautruongchibi.game.Engine;
import com.dautruongchibi.game.Match;
import com.dautruongchibi.game.Profile;
import com.dautruongchibi.game.Rank;
import com.dautruongchibi.game.Rng;
import com.dautruongchibi.game.Stages;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

// Bo kiem tra headless: chay bang `gradle :desktop:verifyHeadless`.
// In [PASS]/[FAIL] tung muc va thoat voi ma 1 neu co muc nao fail.
public class HeadlessMain {
    static int pass = 0, fail = 0;
    static List<String> failures = new ArrayList<>();

    static void check(String name, boolean ok, String detail) {
        if (ok) { pass++; System.out.println("[PASS] " + name + (detail == null || detail.isEmpty() ? "" : " — " + detail)); }
        else { fail++; failures.add(name); System.out.println("[FAIL] " + name + (detail == null ? "" : " — " + detail)); }
    }

    static Engine.PlacedUnit pu(String defId, int star, int x, int y) {
        return new Engine.PlacedUnit("t-" + defId + "-" + x + "-" + y + "-" + star, defId, star, x, y);
    }
    static Engine.PlacedUnit mu(String monsterId, int x, int y) {
        Engine.PlacedUnit u = new Engine.PlacedUnit("tm-" + monsterId + "-" + x, monsterId, 1, x, y);
        u.isMonster = true;
        u.monster = GameData.monsterById(monsterId);
        return u;
    }
    public static void main(String[] args) {
        System.out.println("=== DAU TRUONG CHIBI (JAVA) — KIEM TRA HEADLESS ===");

        // 1) Du lieu
        boolean dataOk = GameData.CHAMPIONS.size() == 25 && GameData.TRAITS.size() == 8 && GameData.ITEMS.size() == 12
            && GameData.MONSTERS.size() == 10 && GameData.CAMPAIGN.size() == 12 && GameData.AUGMENTS.size() == 8;
        boolean oddsOk = true;
        for (int lv = 1; lv <= 9; lv++) { int s = 0; for (int v : GameData.SHOP_ODDS[lv]) s += v; if (s != 100) oddsOk = false; }
        check("Du lieu goc (25 tuong/8 he/12 do/10 quai/12 man/8 cuong hoa, odds tong 100)", dataOk && oddsOk,
            "champs=" + GameData.CHAMPIONS.size() + " oddsOk=" + oddsOk);

        // 2) RNG tat dinh
        Rng r1 = new Rng(42), r2 = new Rng(42);
        boolean same = true, inRange = true;
        for (int i = 0; i < 500; i++) { double a = r1.next(), b = r2.next(); if (a != b) same = false; if (a < 0 || a >= 1) inRange = false; }
        check("RNG mulberry32 tat dinh + trong [0,1)", same && inRange, "");

        // 3) Sinh man chien dich
        Stages.StageDef d1 = Stages.stageDef(1), d5200 = Stages.stageDef(5200);
        boolean stageOk = d1.name.equals("Rừng Slime") && d5200.chapter == 52 && d5200.isChapterBoss
            && Stages.buildStageTeam(1).size() == 2 && !Stages.buildStageTeam(100).isEmpty() && !Stages.buildStageTeam(5200).isEmpty()
            && Stages.difficultyScale(5000) > Stages.difficultyScale(100);
        check("Chien dich 5.200 man (man 1 lay tu CAMPAIGN, boss cuoi chuong, scale tang)", stageOk,
            "stage5200: " + d5200.name + ", team100=" + Stages.buildStageTeam(100).size() + " unit");

        // 4) Gop sao
        Match cm = Match.startCampaign(1, 99, "Test");
        for (int i = 0; i < 3; i++) cm.addChampion(cm.human(), "mimi");
        boolean has2 = false, has3 = false;
        int totalAfter3 = cm.human().bench.size() + cm.human().board.size();
        for (int i = 0; i < 6; i++) cm.addChampion(cm.human(), "mimi");
        for (Engine.PlacedUnit u : cm.human().bench) { if (u.star == 2) has2 = true; if (u.star == 3) has3 = true; }
        for (Engine.PlacedUnit u : cm.human().board) { if (u.star == 3) has3 = true; }
        check("Gop sao 3x1->2 sao, 9x1->3 sao", totalAfter3 == 1 && has3, "sau 3 con: " + totalAfter3 + " unit; co 3 sao=" + has3);

        // 5) Shop roll
        Rng sr = new Rng(1234);
        boolean shopOk = true;
        Set<String> ids = new HashSet<>();
        for (GameData.ChampDef c : GameData.CHAMPIONS) ids.add(c.id);
        for (int lv = 1; lv <= 9; lv += 4) {
            for (int i = 0; i < 200; i++) {
                List<String> shop = Engine.rollShop(lv, sr);
                if (shop.size() != 5) shopOk = false;
                for (String id : shop) {
                    if (!ids.contains(id)) shopOk = false;
                    if (lv == 1 && GameData.champById(id).cost != 1) shopOk = false;
                }
            }
        }
        check("Shop roll 5 o, id hop le, cap 1 chi ra tuong 1 vang", shopOk, "");

        // 6) Mau 100 kieu TFT + bang sat thuong thua vong goc (thang 100, khong quy doi)
        boolean hpOk = Engine.HP_MAX == 100;
        for (int[] c : new int[][]{{1, 0, 0}, {5, 3, 8}, {11, 5, 12}, {20, 7, 18}}) {
            if (Engine.lossDamage(c[0], c[1]) != c[2]) hpOk = false;
        }
        Match hm = Match.startPvp(Match.Mode.PVP_NORMAL, 3, "HpTest");
        for (Match.PlayerState p : hm.players) if (p.hp != 100) hpOk = false;
        check("Mau nguoi choi = 100 (TFT), sat thuong thua vong dung bang goc thang 100", hpOk,
            "vd round 11 thua con 5 dich: -" + Engine.lossDamage(11, 5) + " mau; ca 8 nguoi bat dau 100 mau");

        // 7) Rank LP
        Rank.LpResult rp1 = Rank.applyLp(Rank.defaultRank(), 1);
        Rank.LpResult rp8 = Rank.applyLp(Rank.defaultRank(), 8);
        Rank.LpResult rPro = Rank.applyLp(new Rank.RankState(0, 4, 90), 1);
        boolean rankOk = rp1.delta == 46 && rp1.rank.lp == 46
            && rp8.delta == -34 && rp8.rank.lp == 0 && rp8.rank.tier == 0 && rp8.rank.division == 4
            && rPro.promoted && rPro.rank.division == 3 && rPro.rank.lp == 36;
        check("Rank: bang LP port dung (top1 +46, san Sat IV, thang hang)", rankOk, "label=" + Rank.rankLabel(rp1.rank));

        // 8) Lat the up (draft)
        List<Engine.CarouselOption> opts = Engine.genCarouselOptions(new Rng(7));
        Set<String> seen = new HashSet<>();
        boolean draftOk = opts.size() == Engine.CAROUSEL_COUNT;
        for (Engine.CarouselOption o : opts) { if (!seen.add(o.defId)) draftOk = false; if (GameData.itemById(o.item) == null) draftOk = false; }
        check("Lat the up: 8 the, tuong khong trung, do kem hop le", draftOk, "the dau: " + GameData.champById(opts.get(0).defId).name);

        // 9) Tat dinh tran danh
        List<Engine.PlacedUnit> teamA = List.of(pu("gogo", 1, 2, 0), pu("lulu", 1, 3, 3), pu("bobi", 1, 3, 0));
        List<Engine.PlacedUnit> teamB = List.of(pu("kiki", 1, 2, 0), pu("pipo", 1, 3, 3), pu("toto", 1, 3, 0));
        Engine.BattleResult b1 = Engine.simulateBattle(teamA, teamB, List.of(), 555);
        Engine.BattleResult b2 = Engine.simulateBattle(teamA, teamB, List.of(), 555);
        check("Mo phong tran danh tat dinh theo seed", b1.winner == b2.winner && b1.duration == b2.duration && b1.events.size() == b2.events.size(),
            "winner=" + b1.winner + ", duration=" + b1.duration + "s, events=" + b1.events.size());

        // 10) Bang sat thuong theo tuong (du lieu cho panel trong man tran)
        List<Engine.DamageRow> chart = Engine.damageChart(b1);
        double chartSum = 0; boolean hasA = false, hasB = false;
        for (Engine.DamageRow row : chart) { chartSum += row.damage; if (row.team == 0) hasA = true; else hasB = true; }
        boolean chartOk = !chart.isEmpty() && chartSum > 0 && hasA && hasB;
        for (int i = 1; i < chart.size(); i++) if (chart.get(i).damage > chart.get(i - 1).damage) chartOk = false;
        check("Bang sat thuong: cong tu su kien attack/hit, ca 2 ben, sap giam dan", chartOk,
            chart.isEmpty() ? "rong" : "dong dau: " + chart.get(0).name + " " + (int) chart.get(0).damage + ", tong " + chart.size() + " dong");

        // 11) Quy tac san theo chang (Kanto: moi truong doi theo chang; Boss -> hoang hon)
        boolean arenaOk = ArenaTheme.forCampaign(1, false).equals("grass") && ArenaTheme.forCampaign(2, false).equals("desert")
            && ArenaTheme.forCampaign(3, false).equals("ice") && ArenaTheme.forCampaign(4, false).equals("grass")
            && ArenaTheme.forCampaign(2, true).equals("sunset")
            && ArenaTheme.forStage(1, false).equals("grass") && ArenaTheme.forStage(2, false).equals("sunset")
            && ArenaTheme.forStage(3, false).equals("desert") && ArenaTheme.forStage(4, false).equals("ice")
            && ArenaTheme.forStage(7, false).equals("ice") && ArenaTheme.forStage(5, true).equals("sunset")
            && ArenaTheme.forWaves(1, false).equals("grass") && ArenaTheme.forWaves(23, false).equals("ice")
            && ArenaTheme.forWaves(10, true).equals("sunset");
        check("San theo chang: Chien Dich (chuong-1)%3 rung/sa mac/bang, PvP+Song theo stage, Boss -> hoang hon", arenaOk, "");

        // 12) Tran PvP tron ven (3 seed) — do dai tran tren thang 100 mau phai tuong duong thiet ke
        boolean matchOk = true; StringBuilder mDetail = new StringBuilder();
        for (long s : new long[]{1, 7, 123}) {
            Match m = Match.startPvp(Match.Mode.PVP_RANKED, s, "Headless");
            int startHpTotal = 0; for (Match.PlayerState p : m.players) startHpTotal += p.hp;
            int guard = 0;
            while (!m.over && guard++ < 60) { m.autoPlan(); m.fight(); }
            int endHpTotal = 0; Set<Integer> placements = new HashSet<>();
            for (Match.PlayerState p : m.players) { endHpTotal += p.hp; if (p.placement > 0 && !placements.add(p.placement)) matchOk = false; }
            if (!m.over || m.humanPlacement < 1 || m.humanPlacement > 8) matchOk = false;
            if (guard > 45) matchOk = false;
            if (endHpTotal >= startHpTotal) matchOk = false;
            mDetail.append("seed ").append(s).append(": ").append(guard).append(" round, hang ").append(m.humanPlacement).append("; ");
        }
        check("Tran PvP 8 nguoi chay tron ven toi khi co hang (3 seed)", matchOk, mDetail.toString());

        // 13) PvE: danh thu vai man chien dich + tran truc tiep
        boolean pveOk = true; StringBuilder pveDetail = new StringBuilder();
        for (int st : new int[]{1, 2, 3}) {
            Match m = Match.startCampaign(st, 1000 + st, "Headless");
            m.autoPlan();
            Match.FightOutcome fo = m.fight();
            if (fo.result == null || fo.result.frames.size() < 2) pveOk = false;
            pveDetail.append("man ").append(st).append(fo.humanWon ? " thang" : " thua").append("; ");
        }
        Engine.BattleResult directBattle = Engine.simulateBattle(Engine.makeAiTeam(5, 7), Stages.buildStageTeam(1), List.of(), 42);
        if (directBattle.duration <= 0) pveOk = false;
        check("PvE chien dich: vao tran duoc, co khung hinh/su kien", pveOk, pveDetail.toString());

        // 14) Song quai
        Match w = Match.startWaves(77, "Headless");
        int wGuard = 0;
        while (!w.over && wGuard++ < 40) { w.autoPlan(); w.fight(); }
        boolean waveOk = w.wave >= 2 || w.over;
        check("Song quai: qua duoc song / chay on dinh", waveOk, "toi song " + w.wave + ", over=" + w.over + ", mau=" + w.human().hp);

        // 15) Ho so JSON vong lap
        Profile prof = new Profile();
        prof.name = "Bé \"Test\" \\ Đẹp";
        prof.level = 7; prof.xp = 33; prof.campaignCleared = 12; prof.wavesBest = 9;
        prof.rank = new Rank.RankState(3, 2, 55);
        prof.matches = 10; prof.top1 = 2; prof.top4 = 6; prof.placementSum = 41;
        Profile back = Profile.fromJson(prof.toJson());
        boolean profOk = back.name.equals(prof.name) && back.level == 7 && back.xp == 33 && back.campaignCleared == 12
            && back.wavesBest == 9 && back.rank.tier == 3 && back.rank.division == 2 && back.rank.lp == 55 && back.matches == 10;
        check("Ho so JSON: luu/doc vong lap giu nguyen du lieu", profOk, "rank=" + back.rankLabel());

        System.out.println("=== TONG KET: " + pass + " PASS / " + fail + " FAIL ===");
        if (fail > 0) { System.out.println("Muc fail: " + failures); System.exit(1); }
    }
}
