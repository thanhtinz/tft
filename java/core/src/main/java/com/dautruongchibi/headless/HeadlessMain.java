package com.dautruongchibi.headless;

import com.dautruongchibi.data.FxProfile;
import com.dautruongchibi.data.GameData;
import com.dautruongchibi.game.ArenaTheme;
import com.dautruongchibi.game.Engine;
import com.dautruongchibi.game.Match;
import com.dautruongchibi.game.Profile;
import com.dautruongchibi.game.Rank;
import com.dautruongchibi.game.Rng;
import com.dautruongchibi.game.Stages;
import com.dautruongchibi.ui.Assets;
import com.dautruongchibi.ui.MatchScreen;

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
    static Engine.PlacedUnit unitByDef(List<Engine.PlacedUnit> list, String defId) {
        for (Engine.PlacedUnit u : list) if (u.defId.equals(defId)) return u;
        return null;
    }
    static String benchOrder(Match.PlayerState p) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < p.bench.size(); i++) { if (i > 0) sb.append(", "); sb.append(p.bench.get(i).defId); }
        return sb.append("]").toString();
    }
    static String boardSummary(Match.PlayerState p) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < p.board.size(); i++) {
            Engine.PlacedUnit u = p.board.get(i);
            if (i > 0) sb.append(", ");
            sb.append(u.defId).append("(").append(u.x).append(",").append(u.y).append(")");
        }
        return sb.append("]").toString();
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
        // Cong don theo thoi gian (tab SAT THUONG xem giua tran): t=0 phai rong (chua
        // co don nao), t=duration phai trung tong toan tran, t giua tran khong vuot tong.
        List<Engine.DamageRow> upTo0 = Engine.damageChartUpTo(b1, 0);
        List<Engine.DamageRow> upToEnd = Engine.damageChartUpTo(b1, b1.duration);
        List<Engine.DamageRow> upToMid = Engine.damageChartUpTo(b1, b1.duration / 2);
        double endSum = 0, midSum = 0;
        for (Engine.DamageRow row : upToEnd) endSum += row.damage;
        for (Engine.DamageRow row : upToMid) midSum += row.damage;
        chartOk = chartOk && upTo0.isEmpty() && upToEnd.size() == chart.size()
            && Math.abs(endSum - chartSum) < 0.001 && midSum <= chartSum + 0.001;
        check("Bang sat thuong: cong tu su kien attack/hit, ca 2 ben, sap giam dan + cong don theo thoi gian tran", chartOk,
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

        // 16) Keo-tha: hoan doi bench<->ban + sap xep trong bench
        Match dm = Match.startCampaign(1, 99, "DragTest");
        Match.PlayerState dh = dm.human();
        dm.addChampion(dh, "gogo");
        dm.addChampion(dh, "lulu");
        dm.addChampion(dh, "bobi");
        boolean dragOk = dh.level == 2 && dh.bench.size() == 3 && dh.board.isEmpty()
            && benchOrder(dh).equals("[gogo, lulu, bobi]");
        StringBuilder dragFail = new StringBuilder();
        if (!dragOk) dragFail.append("khoi tao sai (level=").append(dh.level).append(", bench=").append(benchOrder(dh)).append("); ");
        String gogoUid = unitByDef(dh.bench, "gogo") == null ? "" : unitByDef(dh.bench, "gogo").uid;
        String luluUid = unitByDef(dh.bench, "lulu") == null ? "" : unitByDef(dh.bench, "lulu").uid;
        String bobiUid = unitByDef(dh.bench, "bobi") == null ? "" : unitByDef(dh.bench, "bobi").uid;
        if (gogoUid.isEmpty() || luluUid.isEmpty() || bobiUid.isEmpty()) { dragOk = false; dragFail.append("thieu uid; "); }

        // Buoc 1: gogo bench -> ban (0,0)
        dm.moveToBoard(gogoUid, 0, 0);
        Engine.PlacedUnit g1 = unitByDef(dh.board, "gogo");
        boolean step1 = g1 != null && g1.x == 0 && g1.y == 0 && benchOrder(dh).equals("[lulu, bobi]");
        if (!step1) { dragOk = false; dragFail.append("buoc1 moveToBoard gogo: ban=").append(boardSummary(dh)).append(" bench=").append(benchOrder(dh)).append("; "); }

        // Buoc 2: lulu bench -> o (0,0) dang co gogo: hoan doi, gogo ve bench dung index cu cua lulu (0)
        dm.moveBenchToBoard(luluUid, 0, 0);
        Engine.PlacedUnit l2 = unitByDef(dh.board, "lulu");
        boolean step2 = l2 != null && l2.x == 0 && l2.y == 0 && dh.board.size() == 1 && benchOrder(dh).equals("[gogo, bobi]");
        if (!step2) { dragOk = false; dragFail.append("buoc2 moveBenchToBoard lulu->(0,0): ban=").append(boardSummary(dh)).append(" bench=").append(benchOrder(dh)).append("; "); }

        // Buoc 3: lulu tren ban -> bench slot 1 (dang co bobi): hoan doi, bobi len ban dung o (0,0)
        dm.moveBoardToBenchSlot(luluUid, 1);
        Engine.PlacedUnit b3 = unitByDef(dh.board, "bobi");
        boolean step3 = b3 != null && b3.x == 0 && b3.y == 0 && dh.board.size() == 1 && benchOrder(dh).equals("[gogo, lulu]");
        if (!step3) { dragOk = false; dragFail.append("buoc3 moveBoardToBenchSlot lulu->slot1: ban=").append(boardSummary(dh)).append(" bench=").append(benchOrder(dh)).append("; "); }

        // Buoc 4: gogo trong bench -> index 1
        dm.moveOnBench(gogoUid, 1);
        boolean step4 = benchOrder(dh).equals("[lulu, gogo]");
        if (!step4) { dragOk = false; dragFail.append("buoc4 moveOnBench gogo->1: bench=").append(benchOrder(dh)).append("; "); }

        // Buoc 5: gogo bench -> ban (1,0) (cap 2 -> toi da 2 tuong tren ban)
        dm.moveToBoard(gogoUid, 1, 0);
        Engine.PlacedUnit b5 = unitByDef(dh.board, "bobi");
        Engine.PlacedUnit g5 = unitByDef(dh.board, "gogo");
        boolean step5 = b5 != null && b5.x == 0 && b5.y == 0 && g5 != null && g5.x == 1 && g5.y == 0
            && dh.board.size() == 2 && benchOrder(dh).equals("[lulu]");
        if (!step5) { dragOk = false; dragFail.append("buoc5 moveToBoard gogo->(1,0): ban=").append(boardSummary(dh)).append(" bench=").append(benchOrder(dh)).append("; "); }

        String dragDetail = dragOk
            ? "ban=" + boardSummary(dh) + " bench=" + benchOrder(dh)
            : dragFail.toString() + "thuc te: ban=" + boardSummary(dh) + " bench=" + benchOrder(dh);
        check("Keo-tha: bench->ban hoan doi o trung, ban->bench slot hoan doi, sap xep bench, dat tuong thu 2 theo cap", dragOk, dragDetail);

        // 17) Sprite tien hoa theo sao: du 25 tuong x (s2, s3) + logic chon asset dung, fallback dang goc
        java.io.File unitsDir = new java.io.File("assets/units");
        Set<String> availStar = new HashSet<>();
        boolean evoFilesOk = true;
        StringBuilder evoMiss = new StringBuilder();
        for (GameData.ChampDef c : GameData.CHAMPIONS) {
            for (int s = 2; s <= 3; s++) {
                String fn = c.id + "_s" + s + ".png";
                if (new java.io.File(unitsDir, fn).isFile()) availStar.add(c.id + "_s" + s);
                else { evoFilesOk = false; evoMiss.append(fn).append(' '); }
            }
        }
        boolean evoLogicOk = Assets.resolveUnitId("gogo", 1, availStar).equals("gogo")
            && Assets.resolveUnitId("gogo", 2, availStar).equals("gogo_s2")
            && Assets.resolveUnitId("gogo", 3, availStar).equals("gogo_s3")
            && Assets.resolveUnitId("slime", 2, availStar).equals("slime") // quai khong co dang tien hoa -> goc
            && Assets.resolveUnitId("gogo", 3, new HashSet<>()).equals("gogo"); // thieu file -> fallback, khong crash
        check("Sprite tien hoa: du 25 tuong x s2/s3, chon asset theo sao dung, fallback dang goc khi thieu",
            evoFilesOk && evoLogicOk,
            evoFilesOk ? "file=" + availStar.size() + "/50, logicOk=" + evoLogicOk : "thieu: " + evoMiss);

        // 18) VFX/SFX theo tuong: moi tuong + quai co ho so he (FxProfile), du file tieng
        // tung chieu cast_<he>.wav cho moi he thuc su duoc dung, 2 ky nang dac trung dung he
        boolean fxOk = true; StringBuilder fxMiss = new StringBuilder();
        Set<String> usedFx = new HashSet<>();
        for (GameData.ChampDef c : GameData.CHAMPIONS) {
            FxProfile.Fx f = FxProfile.of(c.id, c.skill.kind);
            if (f == null) { fxOk = false; fxMiss.append(c.id).append(' '); }
            else usedFx.add(FxProfile.sfxKey(f));
        }
        for (GameData.MonsterDef mst : GameData.MONSTERS) {
            if (FxProfile.of(mst.id, mst.skill.kind) == null) { fxOk = false; fxMiss.append(mst.id).append(' '); }
        }
        for (String key : usedFx) {
            if (!new java.io.File("assets/audio/cast_" + key + ".wav").isFile()) { fxOk = false; fxMiss.append("cast_").append(key).append(".wav "); }
        }
        boolean signatureOk = FxProfile.of("rero", GameData.SkillKind.burst) == FxProfile.Fx.ENERGY
            && FxProfile.of("zaza", GameData.SkillKind.burst) == FxProfile.Fx.LIGHTNING
            && FxProfile.of("drago", GameData.SkillKind.aoe) == FxProfile.Fx.FIRE
            && FxProfile.of("astro", GameData.SkillKind.freeze) == FxProfile.Fx.ICE;
        check("VFX/SFX theo tuong: 25 tuong + 10 quai co ho so he, du file cast_<he>.wav, he dac trung dung",
            fxOk && signatureOk,
            "so he dung: " + usedFx.size() + " " + usedFx + (fxOk && signatureOk ? "" : "; loi: " + fxMiss + "signatureOk=" + signatureOk));

        // 19) Cong thuc ghep do kieu TFT: 6 thanh phan, 12/12 do hoan chinh co dung 1 cong
        // thuc, moi thanh phan xuat hien trong it nhat 1 cong thuc, ghep doi xung 2 chieu
        boolean recipeOk = GameData.COMPONENTS.size() == 6 && GameData.RECIPES.size() == 12;
        StringBuilder recMiss = new StringBuilder();
        for (GameData.ItemDef it : GameData.ITEMS) {
            String[] r = GameData.recipeFor(it.id);
            if (r == null || r.length != 2) { recipeOk = false; recMiss.append(it.id).append(' '); continue; }
            if (!GameData.isComponent(r[0]) || !GameData.isComponent(r[1])) { recipeOk = false; recMiss.append(it.id).append("(comp?) "); }
            if (!it.id.equals(GameData.combineResult(r[0], r[1])) || !it.id.equals(GameData.combineResult(r[1], r[0]))) { recipeOk = false; recMiss.append(it.id).append("(2chieu) "); }
        }
        for (GameData.ItemDef c : GameData.COMPONENTS) if (GameData.recipesUsing(c.id).isEmpty()) { recipeOk = false; recMiss.append("unused:").append(c.id).append(' '); }
        if (GameData.combineResult("tpkiem", "tpcung") != null) recipeOk = false; // cap nay khong co cong thuc
        check("Cong thuc ghep: 6 thanh phan, 12/12 do hoan chinh co dung 1 cong thuc, moi thanh phan duoc dung",
            recipeOk, recMiss.toString());

        // 20) Ghep trong kho qua Match API + tu hop nhat tren nguoi tuong + tu choi dung luat
        Match im = Match.startCampaign(1, 5, "ItemTest");
        Match.PlayerState ih = im.human();
        ih.inventory.add("tpkiem"); ih.inventory.add("tptim");
        String combMsg = im.combineItems("tpkiem", "tptim");
        boolean combOk = ih.inventory.size() == 1 && ih.inventory.contains("vuot") && combMsg.contains("Vuốt Rồng");
        ih.inventory.add("tpkiem"); ih.inventory.add("tpcung");
        int invBefore = ih.inventory.size();
        String failMsg = im.combineItems("tpkiem", "tpcung");
        boolean failOk = ih.inventory.size() == invBefore && failMsg.contains("không ghép được");
        im.addChampion(ih, "gogo");
        Engine.PlacedUnit gu = ih.bench.get(0);
        im.equipItem(gu.uid, "tpkiem");
        boolean wornOk = gu.items.size() == 1 && gu.items.contains("tpkiem");
        ih.inventory.add("tptim");
        String mergeMsg = im.equipItem(gu.uid, "tptim");
        boolean mergeOk = gu.items.size() == 1 && gu.items.contains("vuot") && mergeMsg.contains("tự ghép");
        ih.inventory.add("giap"); ih.inventory.add("tim"); ih.inventory.add("cung");
        im.equipItem(gu.uid, "giap"); im.equipItem(gu.uid, "tim");
        int invFull = ih.inventory.size();
        String fullMsg = im.equipItem(gu.uid, "cung");
        boolean fullOk = gu.items.size() == 3 && ih.inventory.size() == invFull && fullMsg.contains("tối đa 3");
        check("Ghep do qua Match: ghep kho dung, cap sai bi tu choi, deo cap thanh phan tu hop nhat tren tuong, du 3 o bi tu choi",
            combOk && failOk && wornOk && mergeOk && fullOk,
            "ghep=" + combOk + " sai=" + failOk + " deo=" + wornOk + " hopNhat=" + mergeOk + " day=" + fullOk);

        // 21) Nguon roi do tra THANH PHAN: the lat mo tran + ham roi ngau nhien cua tran PvE
        boolean dropOk = true;
        for (long s = 1; s <= 5; s++) {
            for (Engine.CarouselOption o : Engine.genCarouselOptions(new Rng(s))) if (!GameData.isComponent(o.item)) dropOk = false;
        }
        Rng drng = new Rng(99);
        Set<String> dropped = new HashSet<>();
        for (int i = 0; i < 300; i++) { String dId = Engine.randomComponent(drng); if (!GameData.isComponent(dId)) dropOk = false; dropped.add(dId); }
        check("Nguon roi: the lat + roi PvE chi tra do thanh phan, du 6 loai qua 300 lan roi",
            dropOk && dropped.size() == 6, "so loai roi duoc: " + dropped.size());

        // 22) Ban tuong kieu TFT: TOAN BO do tren nguoi tuong roi tro lai khay — ke ca do da
        // tu hop nhat tren nguoi (tra do hoan chinh, KHONG tach lai thanh phan); vang cong
        // dung gia ban; ap cho tuong o bench lan tuong tren ban (moi duong ban deu qua Match.sell)
        Match sm = Match.startCampaign(1, 5, "SellTest");
        Match.PlayerState sh = sm.human();
        sm.addChampion(sh, "gogo");
        Engine.PlacedUnit sgu = sh.bench.get(0);
        sh.inventory.add("tpkiem"); sh.inventory.add("tptim"); sh.inventory.add("giap");
        sm.equipItem(sgu.uid, "tpkiem");
        sm.equipItem(sgu.uid, "tptim"); // tu hop nhat tren nguoi -> vuot (chiem 1 o)
        sm.equipItem(sgu.uid, "giap");  // o thu 2
        boolean sWorn = sgu.items.size() == 2 && sgu.items.contains("vuot") && sgu.items.contains("giap");
        int sGold0 = sh.gold, sInv0 = sh.inventory.size();
        String sellMsg = sm.sell(sgu.uid);
        boolean sellBenchOk = sh.bench.isEmpty() && sh.gold == sGold0 + Engine.sellValue("gogo", 1)
            && sh.inventory.size() == sInv0 + 2 && sh.inventory.contains("vuot") && sh.inventory.contains("giap")
            && !sh.inventory.contains("tpkiem") && !sh.inventory.contains("tptim")
            && sellMsg.contains("trả về khay");
        sm.addChampion(sh, "lulu");
        Engine.PlacedUnit slu = sh.bench.get(0);
        sh.level = 9;
        sm.moveToBoard(slu.uid, 0, 0);
        sh.inventory.add("kiem"); sh.inventory.add("tim"); sh.inventory.add("cung");
        sm.equipItem(slu.uid, "kiem"); sm.equipItem(slu.uid, "tim"); sm.equipItem(slu.uid, "cung");
        int sInv1 = sh.inventory.size();
        String sellMsg2 = sm.sell(slu.uid);
        boolean sellBoardOk = sh.board.isEmpty() && sh.inventory.size() == sInv1 + 3
            && sh.inventory.contains("kiem") && sh.inventory.contains("tim") && sh.inventory.contains("cung")
            && sellMsg2.contains("trả về khay");
        check("Ban tuong tra do ve khay: do hop nhat tren nguoi tra nguyen do hoan chinh, ban tu bench lan tren ban",
            sWorn && sellBenchOk && sellBoardOk,
            "deoTruoc=" + sWorn + " banBench=" + sellBenchOk + " banBan=" + sellBoardOk + " | msg: " + sellMsg);

        // 23) Cat ten bang sat thuong: hau to sao LUON nguyen ven — do gia lap moi ky tu
        // 10px: vua cot thi giu nguyen, qua cot thi cat phan ten kem "..." truoc hau to,
        // khong bao gio cat giua hau to (loi cu "Pipo Chim Se (2").
        java.util.function.ToDoubleFunction<String> fakeW = s -> s.length() * 10.0;
        String fitShort = MatchScreen.fitDamageName("Pipo", 1, 134, fakeW);
        String fitFull = MatchScreen.fitDamageName("Pipo Chim Se", 2, 250, fakeW);
        String fitCut = MatchScreen.fitDamageName("Pipo Chim Se", 2, 150, fakeW);
        String fitCut3 = MatchScreen.fitDamageName("Gogo Hiep Si", 3, 134, fakeW);
        boolean fitOk = fitShort.equals("Pipo")
            && fitFull.equals("Pipo Chim Se (2 sao)")
            && fitCut.equals("Pipo... (2 sao)") && fakeW.applyAsDouble(fitCut) <= 150
            && fitCut3.endsWith(" (3 sao)") && fitCut3.contains("...") && fakeW.applyAsDouble(fitCut3) <= 134;
        check("Cat ten bang sat thuong: giu nguyen hau to sao, ten dai cat kem '...' truoc hau to",
            fitOk, "ngan='" + fitShort + "' vua='" + fitFull + "' cat='" + fitCut + "' cat3='" + fitCut3 + "'");

        // 24) Tinh linh dong hanh: bot PvP duoc gan tinh linh hop le (id quai co that),
        // ho so luu/doc legendId dung, id la trong file -> ve mac dinh "slime"
        Match lgm = Match.startPvp(Match.Mode.PVP_RANKED, 42, "LegendQA");
        boolean botsLegendOk = lgm.players.size() == 8;
        for (int i = 1; i < lgm.players.size(); i++) {
            if (!GameData.isMonsterId(lgm.players.get(i).legendId)) botsLegendOk = false;
        }
        Profile lp = new Profile();
        lp.legendId = "golem";
        Profile lback = Profile.fromJson(lp.toJson());
        Profile lbad = Profile.fromJson("{\"name\": \"X\", \"legendId\": \"khong-co-that\"}");
        boolean legendOk = botsLegendOk && "golem".equals(lback.legendId) && "slime".equals(lbad.legendId)
            && new Profile().legendId.equals("slime");
        check("Tinh linh: bot PvP gan tinh linh hop le, ho so luu/doc lua chon, id sai ve mac dinh",
            legendOk, "bot dau=" + lgm.players.get(1).legendId + ", doc lai=" + lback.legendId);

        // 25) San dau: bot PvP duoc gan theme hop le; ho so luu/doc arenaId dung, khoa
        // la -> "auto"; resolve: theme co dinh GHI DE khoa tu dong theo chang, "auto"
        // (va khoa la) giu nguyen quy tac xoay. Mac dinh ho so moi = "auto" (Theo man).
        Match arm = Match.startPvp(Match.Mode.PVP_RANKED, 43, "ArenaQA");
        boolean botsArenaOk = arm.players.size() == 8;
        for (int i = 1; i < arm.players.size(); i++) {
            if (!com.dautruongchibi.game.ArenaTheme.isTheme(arm.players.get(i).arenaId)) botsArenaOk = false;
        }
        Profile ap = new Profile();
        ap.arenaId = "ice";
        Profile aback = Profile.fromJson(ap.toJson());
        Profile abad = Profile.fromJson("{\"name\": \"X\", \"arenaId\": \"khong-co-san-nay\"}");
        boolean resolveOk = "desert".equals(com.dautruongchibi.game.ArenaTheme.resolve("desert", "grass"))
            && "grass".equals(com.dautruongchibi.game.ArenaTheme.resolve("auto", "grass"))
            && "ice".equals(com.dautruongchibi.game.ArenaTheme.resolve("la-gi-do", "ice"))
            && "sunset".equals(com.dautruongchibi.game.ArenaTheme.resolve("sunset", "ice"));
        boolean arenaChoiceOk = botsArenaOk && "ice".equals(aback.arenaId) && "auto".equals(abad.arenaId)
            && new Profile().arenaId.equals("auto") && resolveOk;
        check("San dau: bot PvP gan theme hop le, ho so luu/doc lua chon, khoa sai ve 'auto', theme co dinh ghi de forStage",
            arenaChoiceOk, "bot dau=" + arm.players.get(1).arenaId + ", doc lai=" + aback.arenaId);

        System.out.println("=== TONG KET: " + pass + " PASS / " + fail + " FAIL ===");
        if (fail > 0) { System.out.println("Muc fail: " + failures); System.exit(1); }
    }
}
