package com.dautruongchibi.game;

import com.dautruongchibi.data.GameData;
import com.dautruongchibi.data.GameData.ChampDef;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// Dieu phoi tran dau (thuan logic, khong phu thuoc LibGDX) - dung chung cho GUI va kiem tra headless.
// Che do: PvP (Thuong / Hang / Dau Tap) 8 nguoi voi 7 bot, Song Quai vo han, Chien Dich 1 tran/màn.
public final class Match {
    public enum Mode { PVP_NORMAL, PVP_RANKED, PVP_PRACTICE, WAVES, CAMPAIGN }

    public static final class PlayerState {
        public String name;
        public boolean human;
        public int hp = Engine.HP_MAX;
        public int gold = 5, level = 1, xp = 0, streak = 0;
        public List<Engine.PlacedUnit> bench = new ArrayList<>();
        public List<Engine.PlacedUnit> board = new ArrayList<>();
        public List<String> inventory = new ArrayList<>();
        public List<String> augments = new ArrayList<>();
        public boolean alive = true;
        public int placement = 0;
        public int lastHpDelta = 0;
        public String lastOpponent = "";
    }

    public final Mode mode;
    public final long seed;
    private final Rng rng;
    public final List<PlayerState> players = new ArrayList<>();
    public int round = 1;
    public int wave = 0; // rieng WAVES
    public boolean over = false;
    public int humanPlacement = 0;
    public String endMessage = "";

    // Trang thai pha chuan bi cua nguoi choi
    public List<String> shop = new ArrayList<>();
    public List<Engine.CarouselOption> draftOptions;
    public boolean draftPending;
    public List<String> augmentOptions;
    public boolean augmentPending;
    public int campaignStageId = 0;
    public boolean campaignWon = false;
    private int uidSeq = 1;
    private int opponentCursor = 0;

    private Match(Mode mode, long seed) {
        this.mode = mode;
        this.seed = seed;
        this.rng = new Rng(seed ^ 0x5DEECE66DL);
    }

    public PlayerState human() { return players.get(0); }
    public boolean isPvp() { return mode == Mode.PVP_NORMAL || mode == Mode.PVP_RANKED || mode == Mode.PVP_PRACTICE; }

    // ---------- Khoi tao ----------
    public static Match startPvp(Mode mode, long seed, String playerName) {
        Match m = new Match(mode, seed);
        PlayerState h = new PlayerState();
        h.name = playerName; h.human = true; h.gold = 5; h.level = 1;
        m.players.add(h);
        List<String> names = new ArrayList<>(GameData.BOT_NAMES);
        for (int i = 0; i < 7; i++) {
            PlayerState b = new PlayerState();
            b.name = names.get(i); b.human = false; b.gold = 5; b.level = 1;
            m.players.add(b);
        }
        m.beginRound(true);
        return m;
    }

    public static Match startWaves(long seed, String playerName) {
        Match m = new Match(Mode.WAVES, seed);
        PlayerState h = new PlayerState();
        h.name = playerName; h.human = true; h.gold = 20; h.level = 3;
        m.players.add(h);
        m.wave = 1;
        m.beginRound(true);
        return m;
    }

    public static Match startCampaign(int stageId, long seed, String playerName) {
        Match m = new Match(Mode.CAMPAIGN, seed);
        m.campaignStageId = stageId;
        PlayerState h = new PlayerState();
        h.name = playerName; h.human = true;
        h.gold = 45 + stageId * 4;
        h.level = Math.min(9, 2 + stageId / 2);
        m.players.add(h);
        m.beginRound(false);
        return m;
    }

    private void beginRound(boolean withDraft) {
        PlayerState h = human();
        rollShop();
        if (withDraft && mode != Mode.WAVES && (round == 1 || (isPvp() && Engine.isCarouselRound(round)))) {
            draftOptions = Engine.genCarouselOptions(rng);
            draftPending = true;
        } else if (withDraft && mode == Mode.WAVES && wave == 1) {
            draftOptions = Engine.genCarouselOptions(rng);
            draftPending = true;
        }
        if (isPvp() && Engine.isAugmentRound(round)) {
            List<String> pool = new ArrayList<>();
            for (GameData.AugmentDef a : GameData.AUGMENTS) if (!h.augments.contains(a.id)) pool.add(a.id);
            Collections.shuffle(pool, new java.util.Random(rng.nextInt(1_000_000)));
            augmentOptions = new ArrayList<>(pool.subList(0, Math.min(3, pool.size())));
            augmentPending = !augmentOptions.isEmpty();
        }
    }

    private void rollShop() {
        shop = Engine.rollShop(human().level, rng);
    }

    // ---------- Lat the up (draft) ----------
    public String pickDraft(int idx) {
        if (!draftPending || draftOptions == null || idx < 0 || idx >= draftOptions.size()) return "Không có thẻ để lật.";
        Engine.CarouselOption opt = draftOptions.get(idx);
        draftPending = false;
        PlayerState h = human();
        addChampion(h, opt.defId);
        h.inventory.add(opt.item);
        String msg = "Lật thẻ: nhận " + GameData.champById(opt.defId).name + " kèm " + GameData.itemById(opt.item).name + "!";
        return msg;
    }

    // ---------- Cuong hoa ----------
    public String pickAugment(int idx) {
        if (!augmentPending || augmentOptions == null || idx < 0 || idx >= augmentOptions.size()) return "Không có cường hóa.";
        String id = augmentOptions.get(idx);
        augmentPending = false;
        PlayerState h = human();
        h.augments.add(id);
        GameData.AugmentDef a = GameData.augmentById(id);
        if ("gold".equals(a.kind)) h.gold += a.value;
        else if ("xp".equals(a.kind)) addXp(h, a.value);
        else if ("healPlayer".equals(a.kind)) h.hp = Math.min(Engine.HP_MAX, h.hp + a.value);
        String msg = "Cường hóa: " + a.name + " — " + a.desc;
        return msg;
    }

    // ---------- Kinh te / shop ----------
    public String buy(int shopIdx) {
        PlayerState h = human();
        if (shopIdx < 0 || shopIdx >= shop.size() || shop.get(shopIdx) == null) return "Ô shop trống.";
        String defId = shop.get(shopIdx);
        int cost = GameData.champById(defId).cost;
        if (h.gold < cost) return "Không đủ vàng.";
        if (!canAddChampion(h, defId)) return "Bench đã đầy (9 ô).";
        h.gold -= cost;
        shop.set(shopIdx, null);
        addChampion(h, defId);
        return "Đã mua " + GameData.champById(defId).name + ".";
    }

    public String reroll() {
        PlayerState h = human();
        if (h.gold < 2) return "Cần 2 vàng để làm mới.";
        h.gold -= 2;
        rollShop();
        return "Đã làm mới shop.";
    }

    public String buyXp() {
        PlayerState h = human();
        if (h.level >= 9) return "Đã đạt cấp tối đa.";
        if (h.gold < 4) return "Cần 4 vàng để mua XP.";
        h.gold -= 4;
        addXp(h, 4);
        return "Đã mua 4 XP. Cấp hiện tại: " + h.level;
    }

    public void addXp(PlayerState p, int amount) {
        p.xp += amount;
        while (p.level < 9 && p.xp >= Engine.xpToNext(p.level)) {
            p.xp -= Engine.xpToNext(p.level);
            p.level++;
        }
    }

    private boolean canAddChampion(PlayerState p, String defId) {
        if (p.bench.size() < 9) return true;
        // Bench day: chi mua duoc neu se gop sao ngay
        List<Engine.PlacedUnit> pool = new ArrayList<>(p.bench);
        pool.addAll(p.board);
        pool.add(new Engine.PlacedUnit("tmp", defId, 1, 0, 0));
        return countCombines(pool) > 0;
    }

    private int countCombines(List<Engine.PlacedUnit> pool) {
        int n = 0;
        List<Engine.PlacedUnit> work = new ArrayList<>(pool);
        boolean changed = true;
        while (changed) {
            changed = false;
            for (int star = 1; star <= 2 && !changed; star++) {
                Map<String, Integer> cnt = new HashMap<>();
                for (Engine.PlacedUnit u : work) if (u.star == star) cnt.put(u.defId, cnt.getOrDefault(u.defId, 0) + 1); // khong dung Integer::sum (TeaVM chua co)
                for (Map.Entry<String, Integer> e : cnt.entrySet()) {
                    if (e.getValue() >= 3) {
                        int removed = 0;
                        List<Engine.PlacedUnit> keep = new ArrayList<>();
                        Engine.PlacedUnit merged = null;
                        for (Engine.PlacedUnit u : work) {
                            if (u.star == star && u.defId.equals(e.getKey()) && removed < 3) { removed++; continue; }
                            keep.add(u);
                        }
                        merged = new Engine.PlacedUnit("tmp-m", e.getKey(), star + 1, 0, 0);
                        keep.add(merged);
                        work = keep;
                        n++;
                        changed = true;
                        break;
                    }
                }
            }
        }
        return n;
    }

    // Them tuong vao bench + tu dong gop sao (giong ban RN: gop ca tu bench lan ban co)
    public void addChampion(PlayerState p, String defId) {
        Engine.PlacedUnit u = new Engine.PlacedUnit("m" + (uidSeq++), defId, 1, 0, 0);
        p.bench.add(u);
        runCombines(p);
    }

    private void runCombines(PlayerState p) {
        boolean again = true;
        while (again) {
            again = false;
            for (int star = 1; star <= 2 && !again; star++) {
                Map<String, List<Engine.PlacedUnit>> groups = new HashMap<>();
                List<Engine.PlacedUnit> all = new ArrayList<>(p.bench);
                all.addAll(p.board);
                for (Engine.PlacedUnit u : all) if (u.star == star) groups.computeIfAbsent(u.defId, k -> new ArrayList<>()).add(u);
                for (Map.Entry<String, List<Engine.PlacedUnit>> e : groups.entrySet()) {
                    if (e.getValue().size() >= 3) {
                        List<Engine.PlacedUnit> three = e.getValue().subList(0, 3);
                        Engine.PlacedUnit onBoard = null;
                        for (Engine.PlacedUnit u : three) if (p.board.contains(u)) { onBoard = u; break; }
                        List<String> items = new ArrayList<>();
                        for (Engine.PlacedUnit u : three) items.addAll(u.items);
                        for (Engine.PlacedUnit u : three) { p.bench.remove(u); p.board.remove(u); }
                        Engine.PlacedUnit merged = new Engine.PlacedUnit("m" + (uidSeq++), e.getKey(), star + 1, 0, 0);
                        while (items.size() > 3) p.inventory.add(items.remove(items.size() - 1));
                        merged.items.addAll(items);
                        if (onBoard != null) { merged.x = onBoard.x; merged.y = onBoard.y; p.board.add(merged); }
                        else p.bench.add(merged);
                        again = true;
                        break;
                    }
                }
            }
        }
    }

    public String sell(String uid) {
        PlayerState h = human();
        for (List<Engine.PlacedUnit> list : List.of(h.bench, h.board)) {
            for (Engine.PlacedUnit u : list) {
                if (u.uid.equals(uid)) {
                    int v = Engine.sellValue(u.defId, u.star);
                    list.remove(u);
                    // Kieu TFT: ban tuong thi TOAN BO do tren nguoi tuong roi tro lai khay trang bi
                    List<String> returned = new ArrayList<>(u.items);
                    for (String it : returned) h.inventory.add(it);
                    h.gold += v;
                    String msg = "Đã bán " + GameData.champById(u.defId).name + " (+" + v + " vàng).";
                    if (!returned.isEmpty()) {
                        StringBuilder sb = new StringBuilder(msg).append(" Đồ trả về khay: ");
                        for (int i = 0; i < returned.size(); i++) {
                            if (i > 0) sb.append(", ");
                            sb.append(GameData.itemById(returned.get(i)).name);
                        }
                        msg = sb.append(".").toString();
                    }
                    return msg;
                }
            }
        }
        return "Không tìm thấy tướng.";
    }

    public String moveToBoard(String uid, int x, int y) {
        PlayerState h = human();
        Engine.PlacedUnit u = find(h.bench, uid);
        if (u == null) return "Tướng không ở bench.";
        if (h.board.size() >= h.level) return "Đội hình đã đủ " + h.level + " tướng theo cấp.";
        if (occupied(h, x, y) != null) return "Ô đã có tướng.";
        h.bench.remove(u);
        u.x = x; u.y = y;
        h.board.add(u);
        return "Đã đặt " + GameData.champById(u.defId).name + " lên bàn.";
    }

    public String moveOnBoard(String uid, int x, int y) {
        PlayerState h = human();
        Engine.PlacedUnit u = find(h.board, uid);
        if (u == null) return "Tướng không ở trên bàn.";
        Engine.PlacedUnit occ = occupied(h, x, y);
        if (occ != null && occ != u) { int ox = u.x, oy = u.y; u.x = x; u.y = y; occ.x = ox; occ.y = oy; return "Đã đổi vị trí."; }
        u.x = x; u.y = y;
        return "Đã dời tướng.";
    }

    public String moveToBench(String uid) {
        PlayerState h = human();
        Engine.PlacedUnit u = find(h.board, uid);
        if (u == null) return "Tướng không ở trên bàn.";
        if (h.bench.size() >= 9) return "Bench đã đầy.";
        h.board.remove(u);
        h.bench.add(u);
        return "Đã cất tướng về bench.";
    }

    // Keo-tha: tuong o bench -> o ban (x,y). O trong: nhu moveToBoard (co gioi han cap).
    // O co tuong khac: HOAN DOI — tuong o o dich xuong bench DUNG index tuong keo vua roi khoi,
    // tuong keo len o dich (so tuong tren ban khong doi nen khong ap gioi han cap).
    public String moveBenchToBoard(String uid, int x, int y) {
        PlayerState h = human();
        Engine.PlacedUnit u = find(h.bench, uid);
        if (u == null) return "Tướng không ở bench.";
        Engine.PlacedUnit occ = occupied(h, x, y);
        if (occ == null) return moveToBoard(uid, x, y);
        int benchIdx = h.bench.indexOf(u);
        h.bench.remove(benchIdx);
        h.board.remove(occ);
        h.bench.add(benchIdx, occ);
        u.x = x; u.y = y;
        h.board.add(u);
        return "Đã đổi vị trí: " + GameData.champById(u.defId).name + " lên bàn, "
            + GameData.champById(occ.defId).name + " về bench.";
    }

    // Keo-tha: tuong tren ban -> o bench so slot (0..8, clamp).
    // slot >= bench.size(): nhu moveToBench (them cuoi, van kiem tra bench day 9).
    // slot < bench.size(): HOAN DOI — tuong bench o slot len ban DUNG o (x,y) cua tuong keo,
    // tuong keo vao bench tai index slot (bench day van hoan doi duoc vi so luong khong doi).
    public String moveBoardToBenchSlot(String uid, int slot) {
        PlayerState h = human();
        Engine.PlacedUnit u = find(h.board, uid);
        if (u == null) return "Tướng không ở trên bàn.";
        int s = Math.max(0, Math.min(8, slot));
        if (s >= h.bench.size()) {
            if (h.bench.size() >= 9) return "Bench đã đầy.";
            h.board.remove(u);
            h.bench.add(u);
            return "Đã cất tướng về bench.";
        }
        Engine.PlacedUnit benchUnit = h.bench.get(s);
        int ox = u.x, oy = u.y;
        h.board.remove(u);
        h.bench.remove(s);
        benchUnit.x = ox; benchUnit.y = oy;
        h.board.add(benchUnit);
        h.bench.add(s, u);
        return "Đã đổi vị trí: " + GameData.champById(u.defId).name + " về bench, "
            + GameData.champById(benchUnit.defId).name + " lên bàn.";
    }

    // Keo-tha trong bench: doi tuong toi index dich (clamp [0, size-1]): remove roi insert.
    public String moveOnBench(String uid, int targetIndex) {
        PlayerState h = human();
        Engine.PlacedUnit u = find(h.bench, uid);
        if (u == null) return "Tướng không ở bench.";
        int from = h.bench.indexOf(u);
        int to = Math.max(0, Math.min(h.bench.size() - 1, targetIndex));
        if (from == to) return "Tướng đã ở vị trí đó rồi.";
        h.bench.remove(from);
        h.bench.add(to, u);
        return "Đã dời " + GameData.champById(u.defId).name + " trong bench.";
    }

    public String equipItem(String uid, String itemId) {
        PlayerState h = human();
        Engine.PlacedUnit u = find(h.board, uid);
        if (u == null) u = find(h.bench, uid);
        if (u == null) return "Không tìm thấy tướng.";
        if (!h.inventory.contains(itemId)) return "Không có trang bị này trong kho.";
        // TU HOP NHAT TREN NGUOI TUONG (kieu TFT): mon dang deo la thanh phan va tren nguoi
        // tuong da co thanh phan con lai cua cung 1 cong thuc thi 2 mon gop thanh do hoan
        // chinh chiem DUNG 1 o (ke ca khi tuong da du 3 o van gop duoc vi khong tang so o).
        if (GameData.isComponent(itemId)) {
            for (int i = 0; i < u.items.size(); i++) {
                String worn = u.items.get(i);
                if (!GameData.isComponent(worn)) continue;
                String merged = GameData.combineResult(worn, itemId);
                if (merged != null) {
                    h.inventory.remove(itemId);
                    u.items.set(i, merged);
                    String msg = GameData.itemById(worn).name + " + " + GameData.itemById(itemId).name
                        + " tự ghép trên người " + GameData.champById(u.defId).name + " thành " + GameData.itemById(merged).name + "!";
                    return msg;
                }
            }
        }
        if (u.items.size() >= 3) return "Tướng đã đeo tối đa 3 trang bị.";
        h.inventory.remove(itemId);
        u.items.add(itemId);
        return "Đã đeo " + GameData.itemById(itemId).name + " cho " + GameData.champById(u.defId).name + ".";
    }

    // Ghep 2 do thanh phan TRONG KHO (keo icon nay tha len icon kia): ca 2 bien mat,
    // do hoan chinh xuat hien trong kho. Tra ve thong diep hien cho nguoi choi.
    public String combineItems(String compA, String compB) {
        PlayerState h = human();
        String result = GameData.combineResult(compA, compB);
        if (result == null) return "Hai món này không ghép được với nhau.";
        if (!h.inventory.remove(compA)) return "Không có đủ đồ trong kho để ghép.";
        if (!h.inventory.remove(compB)) { h.inventory.add(compA); return "Không có đủ đồ trong kho để ghép."; }
        h.inventory.add(result);
        String msg = "Ghép thành công: " + GameData.itemById(compA).name + " + " + GameData.itemById(compB).name
            + " = " + GameData.itemById(result).name + "!";
        return msg;
    }

    private Engine.PlacedUnit find(List<Engine.PlacedUnit> list, String uid) {
        for (Engine.PlacedUnit u : list) if (u.uid.equals(uid)) return u;
        return null;
    }
    private Engine.PlacedUnit occupied(PlayerState p, int x, int y) {
        for (Engine.PlacedUnit u : p.board) if (u.x == x && u.y == y) return u;
        return null;
    }

    // ---------- Do tham doi thu (PvP) ----------
    // Doi thu vong toi duoc chon round-robin tat dinh (opponentCursor) va doi hinh sinh
    // tat dinh tu seed bang Engine.makeAiTeam — nen xem truoc duoc DUNG doi hinh se gap.
    public PlayerState peekNextOpponent() {
        if (!isPvp() || Engine.isPveStageRound(round)) return null;
        List<PlayerState> aliveBots = new ArrayList<>();
        for (PlayerState p : players) if (!p.human && p.alive) aliveBots.add(p);
        if (aliveBots.isEmpty()) return null;
        return aliveBots.get(opponentCursor % aliveBots.size());
    }

    public List<Engine.PlacedUnit> peekNextOpponentTeam() {
        PlayerState bot = peekNextOpponent();
        if (bot == null) return null;
        int botIdx = players.indexOf(bot);
        int effRound = mode == Mode.PVP_PRACTICE ? Math.max(1, round - 4) : round;
        return Engine.makeAiTeam(effRound, seed + botIdx * 131L);
    }

    // ---------- Phan giai tran ----------
    public static final class FightOutcome {
        public Engine.BattleResult result;
        public boolean humanWon;
        public boolean pveBattle;
        public boolean bossBattle = false; // tran co boss (announcer "HA GUC BOSS!" + san hoang hon)
        public String opponentName = "";
        public int humanHpDelta = 0;
        public String droppedItem = null; // trang bi roi tu tran PvE thang (popup mo qua)
        public String summary = "";
    }

    public FightOutcome fight() {
        PlayerState h = human();
        FightOutcome out = new FightOutcome();
        if (mode == Mode.CAMPAIGN) return fightCampaign(out);
        if (mode == Mode.WAVES) return fightWaves(out);

        // --- PvP ---
        boolean pve = Engine.isPveStageRound(round);
        out.pveBattle = pve;
        List<Engine.PlacedUnit> oppTeam;
        PlayerState oppBot = null;
        long battleSeed = seed * 1000003L + round * 1009L;
        if (pve) {
            oppTeam = Engine.pveEnemiesForRound(round);
            out.opponentName = "Quái PvE " + Engine.roundLabel(round);
        } else {
            List<PlayerState> aliveBots = new ArrayList<>();
            for (PlayerState p : players) if (!p.human && p.alive) aliveBots.add(p);
            if (aliveBots.isEmpty()) { over = true; humanPlacement = 1; out.summary = "Bạn là người sống sót cuối cùng!"; return out; }
            oppBot = aliveBots.get(opponentCursor % aliveBots.size());
            opponentCursor++;
            int botIdx = players.indexOf(oppBot);
            int effRound = mode == Mode.PVP_PRACTICE ? Math.max(1, round - 4) : round;
            oppTeam = Engine.makeAiTeam(effRound, seed + botIdx * 131L);
            battleSeed += botIdx * 77L;
            out.opponentName = oppBot.name;
            h.lastOpponent = oppBot.name;
        }
        Engine.BattleResult res = Engine.simulateBattle(h.board, oppTeam, h.augments, battleSeed);
        out.result = res;
        out.humanWon = res.winner == 0;
        for (Engine.PlacedUnit u : oppTeam) if (u.isMonster && u.monster != null && u.monster.id.contains("boss")) out.bossBattle = true;
        // Thang vong quai PvE: roi 1 trang bi vao kho (popup mo qua o lop giao dien)
        if (pve && out.humanWon) grantDrop(out);

        int aliveBefore = 0;
        for (PlayerState p : players) if (p.alive) aliveBefore++;
        Map<PlayerState, Integer> hpBefore = new HashMap<>();
        for (PlayerState p : players) hpBefore.put(p, p.hp);

        if (out.humanWon) {
            h.streak = h.streak >= 0 ? h.streak + 1 : 1;
            if (oppBot != null) applyHpDamage(oppBot, Engine.lossDamage(round, res.survivors));
        } else {
            h.streak = h.streak <= 0 ? h.streak - 1 : -1;
            int dmgHp = Engine.lossDamage(round, res.enemySurvivors);
            applyHpDamage(h, dmgHp);
            out.humanHpDelta = -dmgHp;
        }
        // Bot vs bot: hao hut mo phong nhu ban RN
        for (PlayerState b : players) {
            if (b.human || !b.alive || b == oppBot) continue;
            if (rng.next() < 0.45) {
                int dmgHp = (int) (Engine.lossDamage(round, 1 + rng.nextInt(5)) * (0.5 + rng.next() * 0.6));
                if (mode == Mode.PVP_PRACTICE) dmgHp = (int) (dmgHp * 1.4);
                applyHpDamage(b, dmgHp);
            }
        }
        resolveEliminations(aliveBefore, hpBefore);

        if (h.alive && aliveCount() <= 1) {
            over = true; humanPlacement = 1; h.placement = 1;
            endMessage = "TOP 1! Bạn vô địch trận đấu.";
        } else if (!h.alive) {
            over = true; humanPlacement = h.placement;
            endMessage = "Bạn bị loại ở hạng " + h.placement + ".";
        }
        out.summary = (out.humanWon ? "THẮNG " : "THUA ") + Engine.roundLabel(round)
            + (out.humanHpDelta != 0 ? " (" + out.humanHpDelta + " máu)" : "")
            + (oppBot != null && !oppBot.alive ? " — " + oppBot.name + " bị loại!" : "");

        if (!over) {
            int income = 5 + Engine.interestOf(h.gold) + Engine.streakBonus(h.streak) + (out.humanWon ? 1 : 0);
            if (out.humanWon && h.augments.contains("vang2")) income += 4;
            h.gold += income;
            addXp(h, 2);
            if (h.augments.contains("hoi1")) h.hp = Math.min(Engine.HP_MAX, h.hp + 2);
            round++;
            beginRound(true);
        }
        return out;
    }

    // Roi DO THANH PHAN vao kho nguoi choi khi thang tran PvE (hoc tu popup mo qua cua Kanto Tactics)
    private void grantDrop(FightOutcome out) {
        String it = Engine.randomComponent(rng);
        human().inventory.add(it);
        out.droppedItem = it;
    }

    private void applyHpDamage(PlayerState p, int dmgHp) {
        p.hp -= dmgHp;
        p.lastHpDelta = -dmgHp;
    }

    private int aliveCount() {
        int n = 0;
        for (PlayerState p : players) if (p.alive) n++;
        return n;
    }

    private void resolveEliminations(int aliveBefore, Map<PlayerState, Integer> hpBefore) {
        List<PlayerState> dead = new ArrayList<>();
        for (PlayerState p : players) if (p.alive && p.hp <= 0) dead.add(p);
        dead.sort((a, b) -> Integer.compare(hpBefore.getOrDefault(a, 0), hpBefore.getOrDefault(b, 0)));
        int place = aliveBefore;
        for (PlayerState p : dead) {
            p.alive = false; p.hp = 0; p.placement = place--;
        }
    }

    private FightOutcome fightWaves(FightOutcome out) {
        PlayerState h = human();
        out.pveBattle = true;
        out.bossBattle = wave % 10 == 0;
        out.opponentName = "Sóng quái " + wave;
        List<Engine.PlacedUnit> enemy = waveTeam(wave);
        Engine.BattleResult res = Engine.simulateBattle(h.board, enemy, h.augments, seed * 31L + wave * 977L);
        out.result = res;
        out.humanWon = res.winner == 0;
        if (out.humanWon) {
            h.gold += 6 + Engine.interestOf(h.gold);
            addXp(h, 2);
            out.summary = "Dọn sạch sóng " + wave + "!";
            if (wave % 3 == 0) grantDrop(out); // moi 3 song roi 1 trang bi
            wave++;
            beginRound(true);
        } else {
            // Cong thuc cu tren thang 8000 (150 + song*15 + quai con song*100) quy ve thang 100 mau
            int dmgHp = Math.max(1, (150 + wave * 15 + res.enemySurvivors * 100) / 80);
            applyHpDamage(h, dmgHp);
            out.humanHpDelta = -dmgHp;
            if (h.hp <= 0) {
                h.alive = false; h.hp = 0;
                over = true;
                endMessage = "Bạn trụ được tới sóng " + (wave - 1) + ".";
                out.summary = "THUA sóng " + wave + " — hết máu!";
            } else {
                out.summary = "THUA sóng " + wave + " (-" + dmgHp + " máu). Sắp xếp lại đội hình rồi đánh lại!";
            }
        }
        return out;
    }

    public List<Engine.PlacedUnit> waveTeam(int w) {
        String[] cycle = {"slime", "nam", "goblin", "soi", "skeleton", "witchmob", "golem"};
        List<Engine.MonsterPick> picks = new ArrayList<>();
        int count = Math.min(9, 2 + w / 2);
        boolean bossWave = w % 10 == 0;
        int regular = bossWave ? count - 1 : count;
        for (int i = 0; i < regular; i++) picks.add(new Engine.MonsterPick(GameData.monsterById(cycle[(w + i) % cycle.length]), 1));
        double scale = 1 + w * 0.07;
        List<Engine.PlacedUnit> team = Engine.makeMonsterTeam(picks, scale);
        if (bossWave) {
            String[] bosses = {"dragonboss", "frostboss", "kingboss"};
            List<Engine.MonsterPick> bp = new ArrayList<>();
            bp.add(new Engine.MonsterPick(GameData.monsterById(bosses[(w / 10 - 1) % 3]), 1));
            List<Engine.PlacedUnit> boss = Engine.makeMonsterTeam(bp, scale * 1.6);
            for (Engine.PlacedUnit u : boss) { u.uid = "waveboss" + w; u.x = team.size() % 7; u.y = 0; team.add(u); }
        }
        for (int i = 0; i < team.size(); i++) { team.get(i).uid = "wv" + w + "-" + i; team.get(i).x = i % 7; team.get(i).y = i < 4 ? 0 : 2; }
        return team;
    }

    private FightOutcome fightCampaign(FightOutcome out) {
        PlayerState h = human();
        out.pveBattle = true;
        Stages.StageDef def = Stages.stageDef(campaignStageId);
        out.bossBattle = def.isBoss;
        out.opponentName = def.name;
        List<Engine.PlacedUnit> enemy = Stages.buildStageTeam(campaignStageId);
        Engine.BattleResult res = Engine.simulateBattle(h.board, enemy, h.augments, seed * 17L + campaignStageId * 331L);
        out.result = res;
        out.humanWon = res.winner == 0;
        if (out.humanWon && def.isBoss) grantDrop(out); // thang man Boss: roi 1 trang bi
        campaignWon = out.humanWon;
        over = true;
        endMessage = campaignWon ? "Chiến thắng màn " + campaignStageId + ": " + def.name + " (+" + def.reward + " điểm thưởng)" : "Thất bại ở màn " + campaignStageId + ". Hãy thử đội hình khác!";
        out.summary = endMessage;
        return out;
    }

    // ---------- Chinh sach choi tu dong (dung cho kiem tra headless + bot demo) ----------
    public void autoPlan() {
        PlayerState h = human();
        if (draftPending) pickDraft(0);
        if (augmentPending) pickAugment(0);
        boolean bought = true;
        while (bought) {
            bought = false;
            for (int i = 0; i < shop.size(); i++) {
                String id = shop.get(i);
                if (id == null) continue;
                if (h.gold >= GameData.champById(id).cost && canAddChampion(h, id)) { buy(i); bought = true; }
            }
        }
        // Dat tuong: hang truoc cho tam gan, hang sau cho tam xa
        List<Engine.PlacedUnit> benchCopy = new ArrayList<>(h.bench);
        for (Engine.PlacedUnit u : benchCopy) {
            if (h.board.size() >= h.level) break;
            ChampDef d = GameData.champById(u.defId);
            int y = d.range <= 1 ? 0 : (d.range == 2 ? 2 : 3);
            boolean placed = false;
            for (int x = 0; x < 7 && !placed; x++) if (occupied(h, x, y) == null) { moveToBoard(u.uid, x, y); placed = true; }
            for (int yy = 0; yy < 4 && !placed; yy++) for (int x = 0; x < 7 && !placed; x++) if (occupied(h, x, yy) == null) { moveToBoard(u.uid, x, yy); placed = true; }
        }
        // Deo do: gan het kho cho tuong tren ban
        List<String> inv = new ArrayList<>(h.inventory);
        for (String item : inv) {
            for (Engine.PlacedUnit u : h.board) if (u.items.size() < 3) { equipItem(u.uid, item); break; }
        }
    }
}
