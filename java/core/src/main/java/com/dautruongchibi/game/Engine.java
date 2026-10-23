package com.dautruongchibi.game;

import com.dautruongchibi.data.GameData;
import com.dautruongchibi.data.GameData.ChampDef;
import com.dautruongchibi.data.GameData.ItemDef;
import com.dautruongchibi.data.GameData.MonsterDef;
import com.dautruongchibi.data.GameData.SkillKind;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

// Engine giao tranh + kinh te port tu engine.ts ban RN (thuan Java, tat dinh theo seed).
// Mo rong: bai bay up (Traps) chay ngay trong vong mo phong voi cac moc kich hoat xac dinh.
public final class Engine {
    private Engine() {}

    // ---------- Don vi dat tren ban / bench ----------
    public static class PlacedUnit {
        public String uid; public String defId; public int star;
        public List<String> items = new ArrayList<>();
        public int x, y;
        public boolean isMonster;
        public MonsterDef monster; // chi dung khi isMonster
        public PlacedUnit() {}
        public PlacedUnit(String uid, String defId, int star, int x, int y) {
            this.uid = uid; this.defId = defId; this.star = star; this.x = x; this.y = y;
        }
        public PlacedUnit copy() {
            PlacedUnit p = new PlacedUnit(uid, defId, star, x, y);
            p.items.addAll(items); p.isMonster = isMonster; p.monster = monster;
            return p;
        }
    }

    private static int uidCounter = 1;
    public static String newUid() { return "u" + (uidCounter++); }
    public static void resetUidCounter(int v) { uidCounter = v; }

    public static ChampDef defOf(PlacedUnit u) {
        if (u.isMonster && u.monster != null) {
            MonsterDef m = u.monster;
            return new ChampDef(m.id, m.name, 1, "nguyento", "hove", m.hp, m.ad, m.armor, m.mr, m.as, m.range, m.mana,
                m.color, m.hair, m.accessory, m.weapon, m.skill);
        }
        return GameData.champById(u.defId);
    }

    public static final class Stats {
        public double hp, ad, ap, armor, mr, as, crit, manaStart, lifesteal, dodge, maxMana;
    }

    public static Stats statsOf(PlacedUnit u) {
        ChampDef d = defOf(u);
        double mult = u.star == 1 ? 1 : u.star == 2 ? 1.8 : 3.2;
        Stats st = new Stats();
        st.hp = d.hp * mult; st.ad = d.ad * mult; st.ap = 100; st.armor = d.armor; st.mr = d.mr; st.as = d.as;
        st.crit = 25; st.manaStart = 0; st.lifesteal = 0; st.dodge = 0; st.maxMana = d.mana;
        for (String iid : u.items) {
            ItemDef it = GameData.itemById(iid);
            if (it == null) continue;
            st.hp += it.hp; st.ad += it.ad; st.ap += it.ap; st.armor += it.armor; st.mr += it.mr;
            st.as *= 1 + it.asPct / 100.0; st.crit += it.crit; st.manaStart += it.mana; st.lifesteal += it.lifesteal;
        }
        return st;
    }

    public static final class SynergyInfo {
        public String traitId; public int count, tier; public boolean active;
    }

    public static List<SynergyInfo> computeSynergies(List<PlacedUnit> units) {
        Map<String, Integer> counts = new HashMap<>();
        Set<String> seen = new HashSet<>();
        for (PlacedUnit u : units) {
            if (u.isMonster || seen.contains(u.defId)) continue;
            seen.add(u.defId);
            for (String t : defOf(u).traits) counts.put(t, counts.getOrDefault(t, 0) + 1); // khong dung Integer::sum (TeaVM chua co)
        }
        List<SynergyInfo> out = new ArrayList<>();
        for (GameData.TraitDef t : GameData.TRAITS) {
            int c = counts.getOrDefault(t.id, 0);
            if (c == 0) continue;
            SynergyInfo s = new SynergyInfo();
            s.traitId = t.id; s.count = c; s.tier = 0;
            for (int i = 0; i < t.thresholds.length; i++) if (c >= t.thresholds[i]) s.tier = i + 1;
            s.active = s.tier > 0;
            out.add(s);
        }
        return out;
    }

    public static final class TeamBuff {
        public double hpPct, adPct, apPct, asPct, armor, crit, dodge, shieldPct, manaRegen;
    }

    public static TeamBuff synergyBuff(List<PlacedUnit> units, String onlyTrait) {
        TeamBuff b = new TeamBuff();
        for (SynergyInfo s : computeSynergies(units)) {
            if (!s.active) continue;
            if (onlyTrait != null && !s.traitId.equals(onlyTrait)) continue;
            int k = s.tier;
            switch (s.traitId) {
                case "hiepsi": b.armor += 20 * k; b.hpPct += 8 * k; break;
                case "phuthuy": b.apPct += 20 * k; break;
                case "xathu": b.asPct += 15 * k; break;
                case "satthu": b.crit += 15 * k; b.adPct += 8 * k; break;
                case "hove": b.shieldPct += 10 * k; b.hpPct += 10 * k; break;
                case "nguyento": b.manaRegen += 3 * k; b.apPct += 10 * k; break;
                case "tinhlinh": b.dodge += 8 * k; break;
                case "longtoc": b.hpPct += 10 * k; b.adPct += 10 * k; b.apPct += 10 * k; break;
                default: break;
            }
        }
        return b;
    }

    public static TeamBuff unitBuffFor(PlacedUnit u, List<PlacedUnit> all, List<String> aug) {
        ChampDef d = defOf(u);
        TeamBuff total = synergyBuff(all, null);
        double ownArmor = 0;
        for (SynergyInfo s : computeSynergies(all)) {
            if (!s.active || !d.hasTrait(s.traitId)) continue;
            if (Arrays.asList("hiepsi", "xathu", "satthu", "longtoc").contains(s.traitId)) {
                ownArmor += synergyBuff(all, s.traitId).armor;
            }
        }
        TeamBuff m = new TeamBuff();
        m.hpPct = total.hpPct; m.adPct = total.adPct;
        m.apPct = (d.hasTrait("phuthuy") || d.hasTrait("nguyento") || d.hasTrait("longtoc")) ? total.apPct : 0;
        m.asPct = d.hasTrait("xathu") ? total.asPct : 0;
        m.armor = ownArmor;
        m.crit = d.hasTrait("satthu") ? total.crit : 0;
        m.dodge = d.hasTrait("tinhlinh") ? total.dodge : 0;
        m.shieldPct = total.shieldPct; m.manaRegen = total.manaRegen;
        if (aug.contains("mau1")) m.hpPct += 15;
        if (aug.contains("sat1")) m.adPct += 12;
        if (aug.contains("toc1")) m.asPct += 12;
        if (aug.contains("giapdoi")) m.armor += 15;
        return m;
    }

    // ---------- Khung hinh + su kien cho lop render ----------
    public static class FightUnit {
        public String uid, defId, artId, name, color;
        public int team, star, x, y, range;
        public double hp, maxHp, mana, maxMana, shield, stun;
        public boolean alive, isMonster;
        public FightUnit copy() {
            FightUnit f = new FightUnit();
            f.uid = uid; f.defId = defId; f.artId = artId; f.name = name; f.color = color;
            f.team = team; f.star = star; f.x = x; f.y = y; f.range = range;
            f.hp = hp; f.maxHp = maxHp; f.mana = mana; f.maxMana = maxMana; f.shield = shield; f.stun = stun;
            f.alive = alive; f.isMonster = isMonster;
            return f;
        }
    }
    public static final class BattleFrame {
        public double t; public List<FightUnit> units = new ArrayList<>();
    }
    public static final class BattleEvent {
        public double t; public String type, text, kind, uid, attackerUid, targetUid, skillKind, skillName, trapId;
        public Double amount; public Boolean crit; public Boolean ranged;
        public Integer ax, ay, tx, ty, radius;
    }
    public static final class BattleResult {
        public int winner, survivors, enemySurvivors;
        public double duration;
        public List<BattleFrame> frames = new ArrayList<>();
        public List<BattleEvent> events = new ArrayList<>();
    }

    // ---------- Don vi trong mo phong ----------
    static final class SimUnit extends FightUnit {
        double ad, ap, armor, mr, as, crit, lifesteal, dodge, manaRegen, poison, buffAsUntil, baseAs;
        double atkCd;
        SkillKind skillKind; double skillPower; String skillName;
        SimUnit copySim() {
            SimUnit s = new SimUnit();
            s.uid = uid; s.defId = defId; s.artId = artId; s.name = name; s.color = color;
            s.team = team; s.star = star; s.x = x; s.y = y; s.range = range;
            s.hp = hp; s.maxHp = maxHp; s.mana = mana; s.maxMana = maxMana; s.shield = shield; s.stun = stun;
            s.alive = alive; s.isMonster = isMonster;
            s.ad = ad; s.ap = ap; s.armor = armor; s.mr = mr; s.as = as; s.crit = crit; s.lifesteal = lifesteal;
            s.dodge = dodge; s.manaRegen = manaRegen; s.poison = poison; s.buffAsUntil = buffAsUntil; s.baseAs = baseAs;
            s.atkCd = atkCd; s.skillKind = skillKind; s.skillPower = skillPower; s.skillName = skillName;
            return s;
        }
    }

    private static int dist(FightUnit a, FightUnit b) { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); }

    private static SimUnit makeSim(PlacedUnit u, int team, List<String> aug, List<PlacedUnit> all) {
        ChampDef d = defOf(u);
        Stats st = statsOf(u);
        TeamBuff buff = unitBuffFor(u, all, aug);
        SimUnit s = new SimUnit();
        double maxHp = st.hp * (1 + buff.hpPct / 100);
        s.uid = u.uid; s.defId = u.defId; s.artId = d.id; s.name = d.name; s.team = team; s.star = u.star;
        s.x = u.x; s.y = team == 0 ? u.y : 6 - u.y;
        s.hp = maxHp; s.maxHp = maxHp;
        s.mana = Math.min(st.manaStart, st.maxMana); s.maxMana = st.maxMana;
        s.shield = maxHp * buff.shieldPct / 100; s.stun = 0; s.atkCd = 0; s.alive = true;
        s.isMonster = u.isMonster; s.color = d.color;
        s.ad = st.ad * (1 + buff.adPct / 100); s.ap = st.ap + buff.apPct;
        s.armor = st.armor + buff.armor; s.mr = st.mr + buff.armor;
        s.as = st.as * (1 + buff.asPct / 100); s.baseAs = s.as;
        s.range = d.range; s.crit = st.crit + buff.crit; s.lifesteal = st.lifesteal; s.dodge = buff.dodge;
        s.manaRegen = buff.manaRegen; s.poison = 0; s.buffAsUntil = 0;
        s.skillKind = d.skill.kind; s.skillPower = d.skill.power; s.skillName = d.skill.name;
        return s;
    }

    // ---------- Mo phong tran danh (kem bai bay) ----------
    public static BattleResult simulateBattle(List<PlacedUnit> player, List<PlacedUnit> enemy, List<String> aug, long seed) {
        return simulateBattle(player, enemy, aug, seed, List.of(), List.of());
    }

    public static BattleResult simulateBattle(List<PlacedUnit> player, List<PlacedUnit> enemy, List<String> aug, long seed,
                                              List<String> playerTraps, List<String> enemyTraps) {
        BattleSim sim = new BattleSim(player, enemy, aug, seed, playerTraps, enemyTraps);
        return sim.run();
    }

    private static final class BattleSim {
        final Rng rnd;
        final List<SimUnit> units = new ArrayList<>();
        final List<BattleFrame> frames = new ArrayList<>();
        final List<BattleEvent> events = new ArrayList<>();
        final List<List<Traps.TrapState>> traps = new ArrayList<>(); // [team]
        boolean lightningChecked = false;

        BattleSim(List<PlacedUnit> player, List<PlacedUnit> enemy, List<String> aug, long seed,
                  List<String> playerTraps, List<String> enemyTraps) {
            this.rnd = new Rng(seed);
            for (PlacedUnit u : player) units.add(makeSim(u, 0, aug, player));
            for (PlacedUnit u : enemy) units.add(makeSim(u, 1, List.of(), enemy));
            traps.add(toStates(playerTraps));
            traps.add(toStates(enemyTraps));
        }
        static List<Traps.TrapState> toStates(List<String> ids) {
            List<Traps.TrapState> out = new ArrayList<>();
            if (ids != null) for (String id : ids) if (Traps.byId(id) != null) out.add(new Traps.TrapState(id));
            return out;
        }
        Traps.TrapState trapOf(int team, String id) {
            for (Traps.TrapState t : traps.get(team)) if (t.id.equals(id) && !t.used) return t;
            return null;
        }
        void trapEvent(double t, String trapId, int ownerTeam, String detail, SimUnit at) {
            BattleEvent e = new BattleEvent();
            e.t = t; e.type = "trap"; e.trapId = trapId;
            e.text = "BẪY KÍCH HOẠT: " + Traps.nameOf(trapId) + "!" + (detail == null ? "" : " " + detail);
            if (at != null) { e.uid = at.uid; e.tx = at.x; e.ty = at.y; }
            events.add(e);
        }
        void snap(double t) {
            BattleFrame f = new BattleFrame();
            f.t = t;
            for (SimUnit u : units) f.units.add(u.copySim());
            frames.add(f);
        }
        double sideHpFraction(int team) {
            double hp = 0, max = 0;
            for (SimUnit u : units) if (u.team == team) { max += u.maxHp; if (u.alive) hp += Math.max(0, u.hp); }
            return max <= 0 ? 1 : hp / max;
        }
        SimUnit strongestAlive(int team, boolean byHp) {
            SimUnit best = null;
            for (SimUnit u : units) {
                if (u.team != team || !u.alive) continue;
                if (best == null || (byHp ? u.maxHp > best.maxHp : u.ad > best.ad)) best = u;
            }
            return best;
        }

        // Tra ve sat thuong thuc te len hp (sau khien). fromTrap=true: khong kich them bay nao (chong de quy).
        double dmg(SimUnit src, SimUnit tgt, double raw, boolean magic, double t, SkillKind skillKind, String skillName, boolean fromTrap) {
            if (!tgt.alive) return 0;
            if (rnd.next() * 100 < tgt.dodge) {
                BattleEvent e = new BattleEvent();
                e.t = t; e.type = "dodge"; e.text = tgt.name + " né đòn!"; e.uid = tgt.uid;
                if (src != null) { e.attackerUid = src.uid; e.ax = src.x; e.ay = src.y; }
                e.targetUid = tgt.uid; e.tx = tgt.x; e.ty = tgt.y;
                e.ranged = src != null && src.range > 1; e.kind = magic ? "magic" : "phys";
                if (skillKind != null) { e.skillKind = skillKind.name(); e.skillName = skillName; }
                events.add(e);
                return 0;
            }
            double mit = magic ? tgt.mr : tgt.armor;
            double dealt = raw * (100.0 / (100 + Math.max(0, mit)));
            double totalDealt = dealt;
            // GUONG PHAN DON: hoa giai don chi tu dau tien
            Traps.TrapState reflect = null;
            if (!fromTrap && tgt.hp + tgt.shield - dealt <= 0) {
                reflect = trapOf(tgt.team, Traps.GUONG_PHAN_DON);
                if (reflect != null) {
                    dealt = Math.max(0, tgt.hp + tgt.shield - 1);
                    totalDealt = dealt;
                }
            }
            if (tgt.shield > 0) { double absorbed = Math.min(tgt.shield, dealt); tgt.shield -= absorbed; dealt -= absorbed; }
            tgt.hp -= dealt;
            tgt.mana = Math.min(tgt.maxMana, tgt.mana + dealt * 0.08);
            if (src != null && src.lifesteal > 0 && dealt > 0) src.hp = Math.min(src.maxHp, src.hp + dealt * src.lifesteal / 100);
            if (skillKind != null && totalDealt > 0) {
                BattleEvent e = new BattleEvent();
                e.t = t; e.type = "hit"; e.text = src.name + " kỹ năng " + skillName + " trúng " + tgt.name + " -" + Math.round(totalDealt);
                e.amount = (double) Math.round(totalDealt); e.uid = tgt.uid;
                e.attackerUid = src.uid; e.targetUid = tgt.uid; e.ax = src.x; e.ay = src.y; e.tx = tgt.x; e.ty = tgt.y;
                e.ranged = src.range > 1; e.kind = magic ? "magic" : "phys"; e.skillKind = skillKind.name(); e.skillName = skillName;
                events.add(e);
            }
            if (reflect != null) {
                reflect.used = true;
                trapEvent(t, Traps.GUONG_PHAN_DON, tgt.team, tgt.name + " sống sót với 1 máu!", tgt);
                if (src != null && src.alive) {
                    BattleEvent e = new BattleEvent();
                    e.t = t; e.type = "hit"; e.text = "Gương phản " + Math.round(totalDealt * 1.5) + " sát thương về " + src.name;
                    e.amount = (double) Math.round(totalDealt * 1.5); e.uid = src.uid; e.targetUid = src.uid;
                    e.tx = src.x; e.ty = src.y; e.kind = "magic";
                    events.add(e);
                    dmg(null, src, totalDealt * 1.5, true, t, null, null, true);
                }
            }
            if (tgt.hp <= 0) {
                tgt.hp = 0; tgt.alive = false;
                BattleEvent e = new BattleEvent();
                e.t = t; e.type = "death"; e.text = tgt.name + " đã gục ngã"; e.uid = tgt.uid;
                if (src != null) { e.attackerUid = src.uid; e.ax = src.x; e.ay = src.y; }
                e.targetUid = tgt.uid; e.tx = tgt.x; e.ty = tgt.y;
                events.add(e);
                // HOI SINH: dong minh dau tien guc nga hoi sinh 40% mau
                if (!fromTrap) {
                    Traps.TrapState rev = trapOf(tgt.team, Traps.HOI_SINH);
                    if (rev != null) {
                        rev.used = true;
                        tgt.alive = true; tgt.hp = tgt.maxHp * 0.4; tgt.poison = 0; tgt.stun = 0;
                        trapEvent(t, Traps.HOI_SINH, tgt.team, tgt.name + " hồi sinh với 40% máu!", tgt);
                    }
                }
                return totalDealt;
            }
            // KHIEN DOI HINH: tong mau doi lan dau duoi 50%
            if (!fromTrap) {
                Traps.TrapState sh = trapOf(tgt.team, Traps.KHIEN_DOI);
                if (sh != null && sideHpFraction(tgt.team) < 0.5) {
                    sh.used = true;
                    for (SimUnit a : units) if (a.team == tgt.team && a.alive) a.shield += a.maxHp * 0.15;
                    trapEvent(t, Traps.KHIEN_DOI, tgt.team, "Toàn đội nhận khiên!", tgt);
                }
            }
            return totalDealt;
        }

        void fireStartTraps() {
            for (int team = 0; team <= 1; team++) {
                Traps.TrapState tr = trapOf(team, Traps.HO_SAP);
                if (tr == null) continue;
                SimUnit victim = strongestAlive(1 - team, true);
                if (victim == null) continue;
                tr.used = true;
                victim.stun = Math.max(victim.stun, 2.5);
                trapEvent(0, Traps.HO_SAP, team, victim.name + " rơi vào hố sập!", victim);
                dmg(strongestAlive(team, false), victim, 100, true, 0, null, null, true);
            }
        }

        void fireLightning(double t) {
            for (int team = 0; team <= 1; team++) {
                Traps.TrapState tr = trapOf(team, Traps.SET_TRUNG_PHAT);
                if (tr == null) continue;
                List<SimUnit> foes = new ArrayList<>();
                for (SimUnit u : units) if (u.alive && u.team != team) foes.add(u);
                if (foes.size() < 3) continue;
                tr.used = true;
                trapEvent(t, Traps.SET_TRUNG_PHAT, team, "Sét đánh toàn bộ địch!", strongestAlive(team, true));
                SimUnit src = strongestAlive(team, false);
                for (SimUnit f : foes) dmg(src, f, 180, true, t, null, null, true);
            }
        }

        void onEnemyCast(SimUnit caster, double t) {
            int foeTeam = 1 - caster.team;
            Traps.TrapState tr = trapOf(foeTeam, Traps.BANG_GIA);
            if (tr == null || !caster.alive) return;
            tr.used = true;
            caster.stun = Math.max(caster.stun, 2.0);
            trapEvent(t, Traps.BANG_GIA, foeTeam, caster.name + " bị đóng băng!", caster);
            dmg(strongestAlive(foeTeam, false), caster, 120, true, t, null, null, true);
        }

        BattleResult run() {
            snap(0);
            fireStartTraps();
            double dt = 0.25, t = 0;
            while (t < 30) {
                t += dt;
                boolean alive0 = false, alive1 = false;
                for (SimUnit u : units) { if (u.alive && u.team == 0) alive0 = true; if (u.alive && u.team == 1) alive1 = true; }
                if (!alive0 || !alive1) break;
                if (!lightningChecked && t >= 10) { lightningChecked = true; fireLightning(t); }
                for (SimUnit u : new ArrayList<>(units)) {
                    if (!units.contains(u)) continue;
                    if (!u.alive) continue;
                    if (u.poison > 0) {
                        u.hp -= 8 * dt * 4; u.poison -= dt;
                        if (u.hp <= 0) {
                            u.hp = 0; u.alive = false;
                            BattleEvent e = new BattleEvent();
                            e.t = t; e.type = "death"; e.text = u.name + " gục vì trúng độc"; e.uid = u.uid; e.targetUid = u.uid; e.tx = u.x; e.ty = u.y; e.kind = "magic";
                            events.add(e);
                            Traps.TrapState rev = trapOf(u.team, Traps.HOI_SINH);
                            if (rev != null) {
                                rev.used = true;
                                u.alive = true; u.hp = u.maxHp * 0.4; u.poison = 0; u.stun = 0;
                                trapEvent(t, Traps.HOI_SINH, u.team, u.name + " hồi sinh với 40% máu!", u);
                            }
                            continue;
                        }
                    }
                    if (u.buffAsUntil > 0 && t > u.buffAsUntil) { u.as = u.baseAs; u.buffAsUntil = 0; }
                    if (u.stun > 0) { u.stun -= dt; continue; }
                    u.mana = Math.min(u.maxMana, u.mana + u.manaRegen * dt);
                    List<SimUnit> foes = new ArrayList<>();
                    for (SimUnit f : units) if (f.alive && f.team != u.team) foes.add(f);
                    if (foes.isEmpty()) break;
                    foes.sort(Comparator.comparingInt(f -> dist(u, f)));
                    SimUnit target = foes.get(0);
                    if (u.mana >= u.maxMana) {
                        castSkill(u, target, foes, t);
                        continue;
                    }
                    if (dist(u, target) > u.range) {
                        u.x += Integer.signum(target.x - u.x);
                        if (dist(u, target) > u.range) u.y += Integer.signum(target.y - u.y);
                        u.x = Math.max(0, Math.min(6, u.x)); u.y = Math.max(0, Math.min(6, u.y));
                        continue;
                    }
                    u.atkCd -= dt;
                    if (u.atkCd <= 0) {
                        u.atkCd = 1 / Math.max(0.2, u.as);
                        boolean crit = rnd.next() * 100 < u.crit;
                        double raw = u.ad * (crit ? 1.6 : 1) * (0.9 + rnd.next() * 0.2);
                        double dealt = dmg(u, target, raw, false, t, null, null, false);
                        if (dealt > 0) {
                            BattleEvent e = new BattleEvent();
                            e.t = t; e.type = "attack"; e.text = u.name + " đánh " + target.name + " -" + Math.round(dealt);
                            e.amount = (double) Math.round(dealt); e.crit = crit; e.kind = "phys"; e.uid = target.uid;
                            e.attackerUid = u.uid; e.targetUid = target.uid; e.ax = u.x; e.ay = u.y; e.tx = target.x; e.ty = target.y;
                            e.ranged = u.range > 1;
                            events.add(e);
                        }
                        u.mana = Math.min(u.maxMana, u.mana + 10);
                    }
                }
                if (Math.round(t * 4) % 2 == 0) snap(t);
            }
            snap(t);
            int s0 = 0, s1 = 0;
            double h0 = 0, h1 = 0;
            for (SimUnit u : units) {
                if (u.team == 0) { h0 += u.hp; if (u.alive) s0++; }
                else { h1 += u.hp; if (u.alive) s1++; }
            }
            int winner;
            if (s0 > s1) winner = 0; else if (s1 > s0) winner = 1; else winner = h0 >= h1 ? 0 : 1;
            BattleEvent end = new BattleEvent();
            end.t = t; end.type = "roundEnd"; end.text = "Kết thúc trận";
            events.add(end);
            BattleResult r = new BattleResult();
            r.winner = winner; r.survivors = s0; r.enemySurvivors = s1; r.duration = t;
            r.frames = frames; r.events = events;
            return r;
        }

        void castSkill(SimUnit u, SimUnit target, List<SimUnit> foes, double t) {
            u.mana = 0;
            double power = u.skillPower * (u.ap / 100) * (u.star == 1 ? 1 : u.star == 2 ? 1.5 : 2.2);
            List<SimUnit> allies = new ArrayList<>();
            for (SimUnit a : units) if (a.alive && a.team == u.team) allies.add(a);
            boolean selfSkill = u.skillKind == SkillKind.heal || u.skillKind == SkillKind.shield || u.skillKind == SkillKind.buffAS || u.skillKind == SkillKind.summon;
            BattleEvent e = new BattleEvent();
            e.t = t; e.type = "cast"; e.text = u.name + " tung kỹ năng " + u.skillName + "!";
            e.uid = u.uid; e.attackerUid = u.uid; e.targetUid = selfSkill ? u.uid : target.uid;
            e.ax = u.x; e.ay = u.y; e.tx = selfSkill ? u.x : target.x; e.ty = selfSkill ? u.y : target.y;
            e.ranged = u.range > 1; e.skillKind = u.skillKind.name(); e.skillName = u.skillName;
            if (u.skillKind == SkillKind.aoe || u.skillKind == SkillKind.freeze) e.radius = 2;
            events.add(e);
            switch (u.skillKind) {
                case burst: dmg(u, target, power, true, t, u.skillKind, u.skillName, false); break;
                case aoe: {
                    List<SimUnit> hit = new ArrayList<>(foes);
                    hit.sort(Comparator.comparingInt(f -> dist(u, f)));
                    for (int i = 0; i < Math.min(4, hit.size()); i++) dmg(u, hit.get(i), power, true, t, u.skillKind, u.skillName, false);
                    break;
                }
                case stun: dmg(u, target, power, true, t, u.skillKind, u.skillName, false); if (target.alive) target.stun = 1.5; break;
                case freeze: {
                    List<SimUnit> hit = new ArrayList<>(foes);
                    hit.sort(Comparator.comparingInt(f -> dist(u, f)));
                    for (int i = 0; i < Math.min(3, hit.size()); i++) { SimUnit f = hit.get(i); dmg(u, f, power, true, t, u.skillKind, u.skillName, false); if (f.alive) f.stun = 2; }
                    break;
                }
                case heal: {
                    List<SimUnit> sorted = new ArrayList<>(allies);
                    sorted.sort(Comparator.comparingDouble(a -> a.hp / a.maxHp));
                    for (int i = 0; i < Math.min(2, sorted.size()); i++) {
                        SimUnit a = sorted.get(i);
                        double before = a.hp;
                        a.hp = Math.min(a.maxHp, a.hp + power);
                        double healed = a.hp - before;
                        if (healed > 0) {
                            BattleEvent h = new BattleEvent();
                            h.t = t; h.type = "heal"; h.text = u.name + " hồi " + Math.round(healed) + " máu cho " + a.name;
                            h.amount = (double) Math.round(healed); h.kind = "heal"; h.uid = a.uid; h.attackerUid = u.uid; h.targetUid = a.uid;
                            h.ax = u.x; h.ay = u.y; h.tx = a.x; h.ty = a.y; h.ranged = u.range > 1; h.skillKind = u.skillKind.name(); h.skillName = u.skillName;
                            events.add(h);
                        }
                    }
                    break;
                }
                case shield: {
                    u.shield += power;
                    if (!allies.isEmpty() && allies.get(0) != u) allies.get(0).shield += power * 0.6;
                    break;
                }
                case buffAS: {
                    for (SimUnit a : allies) { a.as = a.baseAs * (1 + u.skillPower / 100); a.buffAsUntil = t + 5; }
                    if (u.defId.equals("king")) u.shield += 200;
                    break;
                }
                case summon: {
                    SimUnit g = u.copySim();
                    g.uid = u.uid + "-golem" + (int) Math.floor(t);
                    g.defId = "golem-summon"; g.artId = "golem"; g.range = 1; g.name = "Golem Bánh";
                    g.hp = 900; g.maxHp = 900; g.ad = 40; g.mana = 9999; g.maxMana = 9999;
                    g.skillKind = SkillKind.burst; g.skillPower = 50; g.shield = 0; g.poison = 0; g.alive = true; g.stun = 0;
                    units.add(g);
                    break;
                }
                case execute: {
                    SimUnit weak = foes.stream().min(Comparator.comparingDouble(f -> f.hp)).orElse(target);
                    dmg(u, weak, power * (weak.hp / weak.maxHp < 0.4 ? 1.8 : 1), false, t, u.skillKind, u.skillName, false);
                    break;
                }
                case poison: dmg(u, target, power, true, t, u.skillKind, u.skillName, false); if (target.alive) target.poison = 4; break;
                case lifesteal: { double dealt = dmg(u, target, power, true, t, u.skillKind, u.skillName, false); u.hp = Math.min(u.maxHp, u.hp + dealt * 0.6); break; }
                case dash: u.x = target.x; u.y = target.y; dmg(u, target, power, false, t, u.skillKind, u.skillName, false); break;
                default: break;
            }
            onEnemyCast(u, t);
        }
    }

    // ---------- Kinh te, shop, AI (port tu engine.ts) ----------
    public static int interestOf(int gold) { return Math.min(5, (int) Math.floor(Math.max(0, gold) / 10.0)); }
    public static int streakBonus(int streak) { int a = Math.abs(streak); return a >= 5 ? 3 : a >= 3 ? 2 : a >= 2 ? 1 : 0; }
    public static int xpToNext(int level) {
        int[] tbl = {0, 2, 6, 10, 20, 32, 50, 72, 999};
        return level >= 1 && level < tbl.length ? tbl[level] : 999;
    }

    public static List<String> rollShop(int level, Rng rnd) {
        int[] odds = GameData.SHOP_ODDS[Math.max(1, Math.min(9, level))];
        List<String> out = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            double r = rnd.next() * 100;
            int cost = 1, acc = 0;
            for (int c = 0; c < 5; c++) {
                acc += odds[c];
                if (r < acc) { cost = c + 1; break; }
                cost = c + 1;
            }
            List<ChampDef> pool = new ArrayList<>();
            for (ChampDef ch : GameData.CHAMPIONS) if (ch.cost == cost) pool.add(ch);
            out.add(pool.get(rnd.nextInt(pool.size())).id);
        }
        return out;
    }

    public static int sellValue(String defId, int star) {
        int c = GameData.champById(defId).cost;
        return star == 1 ? c : star == 2 ? c * 3 - 1 : c * 9 - 2;
    }

    public static List<PlacedUnit> makeAiTeam(int round, long seed) {
        Rng.Lcg lcg = new Rng.Lcg(seed * 7919 + round * 131L);
        int size = Math.min(9, Math.max(1, (int) Math.floor(round / 2.0) + 1));
        int maxCost = round < 4 ? 2 : round < 9 ? 3 : round < 16 ? 4 : 5;
        List<ChampDef> pool = new ArrayList<>();
        for (ChampDef c : GameData.CHAMPIONS) if (c.cost <= maxCost) pool.add(c);
        List<PlacedUnit> team = new ArrayList<>();
        for (int i = 0; i < size; i++) {
            ChampDef def = pool.get(lcg.nextInt(pool.size()));
            int star = 1;
            if (round >= 14 && lcg.next() < 0.4) star = 2;
            else if (round >= 7 && lcg.next() < 0.2) star = 2;
            PlacedUnit u = new PlacedUnit("ai" + round + "-" + i, def.id, star, i % 7, def.range <= 1 ? 0 : 3);
            if (round >= 12 && i == 0) u.items.add("kiem");
            team.add(u);
        }
        return team;
    }

    public static final class MonsterPick {
        public final MonsterDef def; public final int count;
        public MonsterPick(MonsterDef def, int count) { this.def = def; this.count = count; }
    }

    public static List<PlacedUnit> makeMonsterTeam(List<MonsterPick> list, double scale) {
        List<PlacedUnit> out = new ArrayList<>();
        int i = 0;
        for (MonsterPick e : list) {
            for (int k = 0; k < e.count; k++) {
                PlacedUnit u = new PlacedUnit("mon" + i, e.def.id, 1, i % 7, i < 4 ? 0 : 2);
                u.isMonster = true;
                u.monster = e.def.scaled(scale);
                out.add(u);
                i++;
            }
        }
        return out;
    }

    private static List<PlacedUnit> mt(String id, int count, double scale) {
        List<MonsterPick> p = new ArrayList<>();
        p.add(new MonsterPick(GameData.monsterById(id), count));
        return makeMonsterTeam(p, scale);
    }
    private static List<PlacedUnit> mt2(String id1, int c1, String id2, int c2, double scale) {
        List<MonsterPick> p = new ArrayList<>();
        p.add(new MonsterPick(GameData.monsterById(id1), c1));
        p.add(new MonsterPick(GameData.monsterById(id2), c2));
        List<PlacedUnit> out = makeMonsterTeam(p, scale);
        return out;
    }

    public static List<PlacedUnit> pveEnemiesForRound(int round) {
        switch (round) {
            case 1: return mt("slime", 2, 1);
            case 2: return mt2("slime", 2, "nam", 1, 1);
            case 3: return mt2("goblin", 2, "nam", 1, 1);
            case 10: return mt2("golem", 1, "soi", 2, 1);
            case 18: return mt2("dragonboss", 1, "skeleton", 2, 1);
            case 26: return mt2("frostboss", 1, "witchmob", 2, 1);
            default: return mt("soi", 3, 1 + round * 0.03);
        }
    }
    public static final int[] PVE_ROUNDS = {1, 2, 3, 10, 18, 26};
    public static boolean isPveRound(int round) { for (int r : PVE_ROUNDS) if (r == round) return true; return false; }

    public static String randomItem(Rng rnd) { return GameData.ITEMS.get(rnd.nextInt(GameData.ITEMS.size())).id; }

    public static int[] stageSub(int round) {
        if (round <= 4) return new int[]{1, round};
        int k = round - 5;
        return new int[]{2 + k / 7, (k % 7) + 1};
    }
    public static String roundLabel(int round) { int[] s = stageSub(round); return s[0] + "-" + s[1]; }
    public static boolean isPveStageRound(int round) {
        int[] s = stageSub(round);
        return (s[0] == 1 && s[1] <= 3) || s[1] == 7;
    }
    public static boolean isCarouselRound(int round) {
        int[] s = stageSub(round);
        return s[0] >= 2 && s[1] == 4;
    }

    public static final class CarouselOption {
        public final String defId, item;
        public CarouselOption(String defId, String item) { this.defId = defId; this.item = item; }
    }
    public static final int CAROUSEL_COUNT = 8;
    public static List<CarouselOption> genCarouselOptions(Rng rnd) {
        List<ChampDef> pool = new ArrayList<>(GameData.CHAMPIONS);
        for (int i = pool.size() - 1; i > 0; i--) {
            int j = rnd.nextInt(i + 1);
            ChampDef tmp = pool.get(i); pool.set(i, pool.get(j)); pool.set(j, tmp);
        }
        List<CarouselOption> out = new ArrayList<>();
        for (int i = 0; i < CAROUSEL_COUNT; i++) out.add(new CarouselOption(pool.get(i).id, randomItem(rnd)));
        return out;
    }

    public static final int[] AUG_ROUNDS_TFT = {5, 13, 20}; // 2-1, 3-2, 4-2
    public static boolean isAugmentRound(int round) { for (int r : AUG_ROUNDS_TFT) if (r == round) return true; return false; }
    private static final int[] STAGE_DMG_TFT = {0, 0, 2, 3, 4, 6, 8, 10, 12, 14, 16};
    public static int lossDamage(int round, int enemySurvivors) {
        int stage = stageSub(round)[0];
        int base = STAGE_DMG_TFT[Math.min(stage, STAGE_DMG_TFT.length - 1)];
        return base + enemySurvivors * 2;
    }
    // LP 8000 (muon tu Yu-Gi-Oh): sat thuong thua vong cua ban RN tinh tren thang 100 mau
    // -> nhan he so 80 de tong mau 8000 cho do dai tran tuong duong (kiem chung bang mo phong headless).
    public static final int LP_MAX = 8000;
    public static final int LP_SCALE = 80;
    public static int lossDamageLp(int round, int enemySurvivors) { return lossDamage(round, enemySurvivors) * LP_SCALE; }
}
