package com.dautruongchibi.ui;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.dautruongchibi.data.FxProfile;
import com.dautruongchibi.data.GameData.SkillKind;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Random;

// He hieu ung GIAO TRANH theo HE/KY NANG cua tung tuong (dot VFX/SFX theo tuong).
// MatchScreen dua su kien engine (cast/hit/heal) vao day; BattleFx sinh + ve:
// - Phan tu (particle) theo he: lua (no + tan lua), bang (manh tinh the), doc (bong bong),
//   nang luong, vat ly (tia lua kem), bong toi, thien nhien (la), hoi phuc (dau cong bay len).
// - Vet dat (ground mark): chay doc/lua, vung doc, tham bang — ton tai 1,2-4s roi mo dan.
// - Tia set gay khuc (susu/zaza; zaza LAN qua tung muc tieu theo thu tu su kien hit).
// - Beam 3 lop cho rieng Rero "Tia Laser" (loi trang, vien mau he, quang ngoai).
// - Vom khien (dome) cho ky nang khien, cong trieu hoi cho summon, sao xoay quanh dau
//   cho tuong bi choang, phu tong bang cho muc tieu bi dong bang (freeze).
// Ngan sach hieu nang: toi da MAX_PARTICLES phan tu cung luc (tran ~76 "cum hieu ung"
// nhu ban RN); qua nguong thi bo qua spawn moi, khong bao gio crash vi qua tai FX.
// Random chi dung cho hinh anh (seed co dinh), khong anh huong mo phong tat dinh.
public final class BattleFx {
    public static final int MAX_PARTICLES = 280;

    // Hinh dang phan tu
    private static final int SH_CIRCLE = 0, SH_SHARD = 1, SH_PLUS = 2, SH_SPARK = 3;

    static final class P {
        float x, y, vx, vy, ttl, maxTtl, size, grav, dragK, rot, vrot;
        int shape; Color color;
    }
    static final class Mark { float x, y, rx, ry, ttl, maxTtl; Color color; }
    static final class Bolt { float[] pts; float ttl, maxTtl; Color color; float width; }
    static final class Beam { float x1, y1, x2, y2, ttl, maxTtl; Color color, accent; float scale; }
    static final class Dome { float x, y, ttl, maxTtl; Color color; }
    static final class RingFx { float x, y, ttl, maxTtl, maxR; Color color; }
    static final class Slash { float x, y, ttl, maxTtl, ang; Color color; }

    // Vi tri 1 muc tieu bi ky nang trung (toa do man hinh) + uid de danh dau dong bang
    public static final class HitPos {
        public final float x, y; public final String uid;
        public HitPos(float x, float y, String uid) { this.x = x; this.y = y; this.uid = uid; }
    }

    private final List<P> parts = new ArrayList<>();
    private final List<Mark> marks = new ArrayList<>();
    private final List<Bolt> bolts = new ArrayList<>();
    private final List<Beam> beams = new ArrayList<>();
    private final List<Dome> domes = new ArrayList<>();
    private final List<RingFx> rings = new ArrayList<>();
    private final List<Slash> slashes = new ArrayList<>();
    private final Map<String, Double> frozenUntil = new HashMap<>();
    private final Random rnd = new Random(20261025L);

    // Cho cong cu chup anh (ScreenshotMain): he vua tung chieu gan nhat + so thu tu
    public volatile String lastCastFx = "";
    public volatile int castSeq = 0;
    // So lan cast theo khoa he trong tran nay (QA bat khoanh khac theo he ke ca khi
    // 2 cast roi vao cung 1 frame khien lastCastFx bi ghi de)
    public final java.util.HashMap<String, Integer> castCounts = new java.util.HashMap<>();

    public void clear() {
        parts.clear(); marks.clear(); bolts.clear(); beams.clear(); domes.clear(); rings.clear(); slashes.clear();
        frozenUntil.clear(); lastCastFx = ""; castSeq = 0; castCounts.clear();
    }

    public boolean isFrozen(String uid, double playT) {
        Double u = frozenUntil.get(uid);
        return u != null && playT <= u;
    }

    private boolean budget(int n) { return parts.size() + n <= MAX_PARTICLES; }

    private void spawn(P p) { if (parts.size() < MAX_PARTICLES) parts.add(p); }

    private P baseP(float x, float y, int shape, Color c, float size, float ttl) {
        P p = new P();
        p.x = x; p.y = y; p.shape = shape; p.color = c; p.size = size; p.ttl = 0; p.maxTtl = ttl;
        p.rot = rnd.nextFloat() * 360f;
        return p;
    }

    // ---------- Diem vao tu su kien CAST ----------
    // cx,cy: vi tri nguoi tung (man hinh); tx,ty: muc tieu chinh; targets: cac muc tieu
    // trung ky nang cung thoi diem (theo thu tu su kien hit/heal) — dung cho set lan zaza.
    // teamPos: vi tri dong doi con song (buffAS toa sang ca doi). scale: 1 hoac 1.25 (3 sao).
    public void onCast(FxProfile.Fx fx, SkillKind kind, String casterArtId,
                       float cx, float cy, float tx, float ty,
                       List<HitPos> targets, List<float[]> teamPos, float scale) {
        lastCastFx = FxProfile.sfxKey(fx);
        castSeq++;
        Integer cc = castCounts.get(lastCastFx);
        castCounts.put(lastCastFx, cc == null ? 1 : cc + 1);
        Color main = FxProfile.mainColor(fx), acc = FxProfile.accentColor(fx);
        // Bung sang nho o tay nguoi tung (the cho quang vang chung truoc day), mau theo he
        burst(cx, cy, fx, 5, 0.6f * scale, true);
        if (kind == null) return;
        switch (kind) {
            case burst: {
                if ("rero".equals(casterArtId)) {
                    Beam b = new Beam();
                    b.x1 = cx; b.y1 = cy; b.x2 = tx; b.y2 = ty; b.ttl = 0; b.maxTtl = 0.46f;
                    b.color = main; b.accent = acc; b.scale = scale;
                    beams.add(b);
                    burst(tx, ty, fx, 8, scale, false);
                } else if ("zaza".equals(casterArtId)) {
                    // Sam Lien Hoan: tia set noi nguoi tung -> tung muc tieu theo thu tu hit
                    List<float[]> pts = new ArrayList<>();
                    pts.add(new float[]{cx, cy});
                    if (targets != null) for (HitPos h : targets) pts.add(new float[]{h.x, h.y});
                    if (pts.size() < 2) pts.add(new float[]{tx, ty});
                    chainBolt(pts, main, scale);
                } else {
                    tracer(cx, cy, tx, ty, main, acc);
                }
                break;
            }
            case aoe: {
                float gx = tx, gy = ty - 26;
                groundMark(gx, gy, 92 * scale, 40 * scale, main, fx == FxProfile.Fx.POISON ? 2.2f : 1.2f);
                if (fx == FxProfile.Fx.SHADOW) { // Mua Sao Bang: tia toi roi xuong khu vuc
                    for (int i = 0; i < 6 && budget(1); i++) {
                        float mx = gx + (rnd.nextFloat() - 0.5f) * 130 * scale;
                        P p = baseP(mx, gy + 190 + rnd.nextFloat() * 60, SH_SPARK, acc, 26, 0.34f);
                        p.vx = -34; p.vy = -330; p.rot = -100;
                        spawn(p);
                    }
                }
                if (fx == FxProfile.Fx.PHYSICAL) { // Dap Dat: vong chan dong mo rong
                    RingFx r = new RingFx();
                    r.x = gx; r.y = gy; r.ttl = 0; r.maxTtl = 0.45f; r.maxR = 105 * scale; r.color = main;
                    rings.add(r);
                }
                burst(tx, ty, fx, 9, scale, false);
                break;
            }
            case stun: {
                if (fx == FxProfile.Fx.LIGHTNING) { // Dien Giat cua Susu: 1 tia set thang
                    List<float[]> pts = new ArrayList<>();
                    pts.add(new float[]{cx, cy}); pts.add(new float[]{tx, ty});
                    chainBolt(pts, main, scale);
                } else {
                    tracer(cx, cy, tx, ty, main, acc);
                }
                break;
            }
            case freeze: {
                groundMark(tx, ty - 26, 96 * scale, 42 * scale, main, 1.6f);
                if (targets != null) for (HitPos h : targets) shards(h.x, h.y, scale);
                shards(tx, ty, scale);
                break;
            }
            case poison: {
                // Trac nghiem phun doc/lua dot tu nguoi tung toi muc tieu (impact o su kien hit)
                tracer(cx, cy, tx, ty, main, acc);
                break;
            }
            case heal: {
                sparkles(cx, cy, fx, scale);
                break;
            }
            case shield: {
                Dome d = new Dome();
                d.x = cx; d.y = cy; d.ttl = 0; d.maxTtl = 1.0f; d.color = main;
                domes.add(d);
                break;
            }
            case buffAS: {
                if (teamPos != null) for (float[] p : teamPos) sparkles(p[0], p[1], fx, scale * 0.8f);
                sparkles(cx, cy, fx, scale);
                break;
            }
            case summon: {
                // Cong trieu hoi: 2 vong mo rong + hat sang bay len tai cho nguoi tung (golem moc cung o)
                for (int i = 0; i < 2; i++) {
                    RingFx r = new RingFx();
                    r.x = cx; r.y = cy - 30; r.ttl = -i * 0.14f; r.maxTtl = 0.6f; r.maxR = 74 * scale; r.color = main;
                    rings.add(r);
                }
                for (int i = 0; i < 10 && budget(1); i++) {
                    P p = baseP(cx + (rnd.nextFloat() - 0.5f) * 56, cy - 26 + rnd.nextFloat() * 18, SH_CIRCLE, i % 2 == 0 ? main : acc, 4.5f, 0.7f);
                    p.vy = 44 + rnd.nextFloat() * 36; p.vx = (rnd.nextFloat() - 0.5f) * 14;
                    spawn(p);
                }
                break;
            }
            case execute: {
                Slash s = new Slash();
                s.x = tx; s.y = ty; s.ttl = 0; s.maxTtl = 0.26f; s.ang = -38; s.color = acc;
                slashes.add(s);
                Slash s2 = new Slash();
                s2.x = tx; s2.y = ty; s2.ttl = 0; s2.maxTtl = 0.26f; s2.ang = 42; s2.color = main;
                slashes.add(s2);
                break;
            }
            case lifesteal: {
                break; // phan hut mau ve ve o su kien hit (biet vi tri ca 2 dau)
            }
            case dash: {
                // Vet luot toc do tu cho nguoi tung toi muc tieu
                Bolt b = new Bolt();
                b.pts = new float[]{cx, cy, tx, ty};
                b.ttl = 0; b.maxTtl = 0.22f; b.color = acc; b.width = 5;
                bolts.add(b);
                break;
            }
            default: break;
        }
    }

    // ---------- Diem vao tu su kien HIT cua ky nang (impact) ----------
    public void onSkillHit(FxProfile.Fx fx, SkillKind kind, float x, float y,
                           float fromX, float fromY, float scale, String targetUid, double eventT) {
        if (kind == null) return;
        switch (kind) {
            case poison:
                bubbles(x, y, fx, scale);
                groundMark(x, y - 28, 52 * scale, 22 * scale, FxProfile.mainColor(fx), fx == FxProfile.Fx.FIRE ? 2.4f : 4f);
                break;
            case freeze:
                shards(x, y, scale);
                if (targetUid != null) frozenUntil.put(targetUid, eventT + 2.0);
                break;
            case lifesteal: {
                burst(x, y, fx, 7, scale, false);
                // Hat toi bay nguoc ve nguoi tung (hut mau)
                for (int i = 0; i < 5 && budget(1); i++) {
                    P p = baseP(x + (rnd.nextFloat() - 0.5f) * 20, y + (rnd.nextFloat() - 0.5f) * 20, SH_CIRCLE,
                        FxProfile.accentColor(fx), 4.5f, 0.42f);
                    p.vx = (fromX - x) / 0.42f; p.vy = (fromY - y) / 0.42f;
                    spawn(p);
                }
                break;
            }
            case execute:
                burst(x, y, fx, 8, scale, false);
                break;
            default:
                burst(x, y, fx, 6, scale, false);
                break;
        }
    }

    // ---------- Diem vao tu su kien HEAL ----------
    public void onHeal(float x, float y) {
        Color main = FxProfile.mainColor(FxProfile.Fx.HEAL), acc = FxProfile.accentColor(FxProfile.Fx.HEAL);
        // Quầng sáng xanh mềm dưới chân mục tiêu: neo mắt trước khi dấu cộng bay lên
        groundMark(x, y - 26, 38, 16, main, 0.55f);
        for (int i = 0; i < 6 && budget(1); i++) {
            P p = baseP(x + (rnd.nextFloat() - 0.5f) * 34, y - 4 + rnd.nextFloat() * 16, SH_PLUS, i % 2 == 0 ? main : acc, 12f, 0.8f);
            p.vy = 34 + rnd.nextFloat() * 22; p.vx = (rnd.nextFloat() - 0.5f) * 8;
            spawn(p);
        }
        for (int i = 0; i < 4 && budget(1); i++) {
            P p = baseP(x + (rnd.nextFloat() - 0.5f) * 40, y - 8, SH_CIRCLE, acc, 3.6f, 0.7f);
            p.vy = 26 + rnd.nextFloat() * 20;
            spawn(p);
        }
    }

    // ---------- Cac khoi hieu ung dung chung ----------
    // Cum no theo he tai 1 diem. small=true: ban kinh nho (o tay nguoi tung).
    private void burst(float x, float y, FxProfile.Fx fx, int n, float scale, boolean small) {
        Color main = FxProfile.mainColor(fx), acc = FxProfile.accentColor(fx);
        float sp = (small ? 46 : 86) * scale;
        for (int i = 0; i < n && budget(1); i++) {
            double ang = rnd.nextFloat() * Math.PI * 2;
            float v = sp * (0.35f + rnd.nextFloat() * 0.75f);
            int shape = SH_CIRCLE;
            if (fx == FxProfile.Fx.LIGHTNING || fx == FxProfile.Fx.PHYSICAL) shape = SH_SPARK;
            else if (fx == FxProfile.Fx.ICE) shape = SH_SHARD;
            P p = baseP(x, y, shape, rnd.nextBoolean() ? main : acc, (shape == SH_SPARK ? 15 : 7.4f) * scale, 0.34f + rnd.nextFloat() * 0.16f);
            p.vx = (float) Math.cos(ang) * v; p.vy = (float) Math.sin(ang) * v;
            p.dragK = 3.2f;
            p.rot = (float) Math.toDegrees(ang);
            if (fx == FxProfile.Fx.FIRE) p.vy += 26; // lua boc len
            if (fx == FxProfile.Fx.ICE) p.grav = -190; // manh bang roi xuong
            spawn(p);
        }
        if (fx == FxProfile.Fx.FIRE && !small) { // tan lua ton tai lau hon, nhap nhay
            for (int i = 0; i < 4 && budget(1); i++) {
                P p = baseP(x + (rnd.nextFloat() - 0.5f) * 26, y - 6 + rnd.nextFloat() * 12, SH_CIRCLE, acc, 3.2f, 0.65f + rnd.nextFloat() * 0.3f);
                p.vy = 30 + rnd.nextFloat() * 26; p.vx = (rnd.nextFloat() - 0.5f) * 10;
                spawn(p);
            }
        }
    }

    private void shards(float x, float y, float scale) {
        Color main = FxProfile.mainColor(FxProfile.Fx.ICE), acc = FxProfile.accentColor(FxProfile.Fx.ICE);
        for (int i = 0; i < 8 && budget(1); i++) {
            double ang = rnd.nextFloat() * Math.PI * 2;
            float v = 62 * scale * (0.4f + rnd.nextFloat() * 0.7f);
            P p = baseP(x, y, SH_SHARD, rnd.nextBoolean() ? main : acc, 8.6f * scale, 0.45f);
            p.vx = (float) Math.cos(ang) * v; p.vy = (float) Math.sin(ang) * v + 18;
            p.grav = -210; p.dragK = 1.4f; p.vrot = (rnd.nextFloat() - 0.5f) * 420;
            spawn(p);
        }
    }

    private void bubbles(float x, float y, FxProfile.Fx fx, float scale) {
        Color main = FxProfile.mainColor(fx), acc = FxProfile.accentColor(fx);
        for (int i = 0; i < 7 && budget(1); i++) {
            P p = baseP(x + (rnd.nextFloat() - 0.5f) * 30, y - 12 + rnd.nextFloat() * 20, SH_CIRCLE,
                rnd.nextBoolean() ? main : acc, 6.2f * scale, 0.62f + rnd.nextFloat() * 0.25f);
            p.vy = 24 + rnd.nextFloat() * 20; p.vx = (rnd.nextFloat() - 0.5f) * 12;
            spawn(p);
        }
    }

    private void sparkles(float x, float y, FxProfile.Fx fx, float scale) {
        Color main = FxProfile.mainColor(fx), acc = FxProfile.accentColor(fx);
        for (int i = 0; i < 6 && budget(1); i++) {
            P p = baseP(x + (rnd.nextFloat() - 0.5f) * 40, y - 10 + rnd.nextFloat() * 22, SH_CIRCLE,
                rnd.nextBoolean() ? main : acc, 3.8f * scale, 0.66f);
            p.vy = 38 + rnd.nextFloat() * 26; p.vx = (rnd.nextFloat() - 0.5f) * 12;
            spawn(p);
        }
    }

    // Vien dan nang luong bay nhanh tu nguoi tung toi muc tieu (dan ky nang, khac dan thuong)
    private void tracer(float cx, float cy, float tx, float ty, Color main, Color acc) {
        Bolt b = new Bolt();
        b.pts = new float[]{cx, cy, tx, ty};
        b.ttl = 0; b.maxTtl = 0.16f; b.color = main; b.width = 4;
        bolts.add(b);
    }

    // Tia set gay khuc qua cac diem (da gom dau-cuoi), rung nhe o cac khuc giua
    private void chainBolt(List<float[]> waypoints, Color color, float scale) {
        List<Float> pts = new ArrayList<>();
        for (int i = 0; i + 1 < waypoints.size(); i++) {
            float[] a = waypoints.get(i), c = waypoints.get(i + 1);
            float dx = c[0] - a[0], dy = c[1] - a[1];
            float len = (float) Math.max(1, Math.hypot(dx, dy));
            int seg = Math.max(2, (int) (len / 30));
            for (int s = 0; s < seg; s++) {
                float k = s / (float) seg;
                float px = a[0] + dx * k, py = a[1] + dy * k;
                if (s > 0) {
                    float nx = -dy / len, ny = dx / len;
                    float off = (rnd.nextFloat() - 0.5f) * 22;
                    px += nx * off; py += ny * off;
                }
                pts.add(px); pts.add(py);
            }
        }
        float[] last = waypoints.get(waypoints.size() - 1);
        pts.add(last[0]); pts.add(last[1]);
        Bolt b = new Bolt();
        b.pts = new float[pts.size()];
        for (int i = 0; i < pts.size(); i++) b.pts[i] = pts.get(i);
        b.ttl = 0; b.maxTtl = 0.42f; b.color = color; b.width = 3.4f * scale;
        bolts.add(b);
    }

    private void groundMark(float x, float y, float rx, float ry, Color color, float ttl) {
        Mark m = new Mark();
        m.x = x; m.y = y; m.rx = rx; m.ry = ry; m.ttl = 0; m.maxTtl = ttl; m.color = color;
        if (marks.size() > 14) marks.remove(0);
        marks.add(m);
    }

    // ---------- Cap nhat ----------
    public void update(float dt) {
        for (Iterator<P> it = parts.iterator(); it.hasNext();) {
            P p = it.next();
            p.ttl += dt;
            if (p.ttl >= p.maxTtl) { it.remove(); continue; }
            if (p.dragK > 0) { float d = Math.max(0, 1 - p.dragK * dt); p.vx *= d; p.vy *= d; }
            p.vy += p.grav * dt;
            p.x += p.vx * dt; p.y += p.vy * dt;
            p.rot += p.vrot * dt;
        }
        for (Iterator<Mark> it = marks.iterator(); it.hasNext();) { Mark m = it.next(); m.ttl += dt; if (m.ttl >= m.maxTtl) it.remove(); }
        for (Iterator<Bolt> it = bolts.iterator(); it.hasNext();) { Bolt b = it.next(); b.ttl += dt; if (b.ttl >= b.maxTtl) it.remove(); }
        for (Iterator<Beam> it = beams.iterator(); it.hasNext();) { Beam b = it.next(); b.ttl += dt; if (b.ttl >= b.maxTtl) it.remove(); }
        for (Iterator<Dome> it = domes.iterator(); it.hasNext();) { Dome d = it.next(); d.ttl += dt; if (d.ttl >= d.maxTtl) it.remove(); }
        for (Iterator<RingFx> it = rings.iterator(); it.hasNext();) { RingFx r = it.next(); r.ttl += dt; if (r.ttl >= r.maxTtl) it.remove(); }
        for (Iterator<Slash> it = slashes.iterator(); it.hasNext();) { Slash s = it.next(); s.ttl += dt; if (s.ttl >= s.maxTtl) it.remove(); }
    }

    // ---------- Ve ----------
    // Vet dat: ve DUOI chan tuong (goi truoc khi ve don vi)
    public void drawGround(SpriteBatch batch, Texture circle) {
        for (Mark m : marks) {
            float k = m.ttl / m.maxTtl;
            float a = 0.44f * (k < 0.15f ? k / 0.15f : 1 - Math.max(0, (k - 0.55f) / 0.45f));
            batch.setColor(m.color.r, m.color.g, m.color.b, Math.max(0, a));
            batch.draw(circle, m.x - m.rx, m.y - m.ry, m.rx * 2, m.ry * 2);
        }
        batch.setColor(Color.WHITE);
    }

    // Sao xoay quanh dau tuong bi choang/dong bang (3 sao nho, quy dao ngang dep)
    public void drawStunStars(SpriteBatch batch, Texture starTex, float cx, float cy, float now) {
        batch.setColor(1, 0.88f, 0.3f, 0.95f);
        for (int i = 0; i < 3; i++) {
            double ang = now * 4.2 + i * (Math.PI * 2 / 3);
            float sx = cx + (float) Math.cos(ang) * 17, sy = cy + (float) Math.sin(ang) * 5;
            batch.draw(starTex, sx - 5.5f, sy - 5.5f, 11, 11);
        }
        batch.setColor(Color.WHITE);
    }

    // Hieu ung tren khong: ve SAU don vi (cung batch dang mo)
    public void draw(SpriteBatch batch, Assets a, Texture circle, Texture ring) {
        Texture white = a.whiteTex();
        // Vom khien
        for (Dome d : domes) {
            float k = d.ttl / d.maxTtl;
            float r = 44 + 10 * Math.min(1, k * 3);
            float alpha = k < 0.7f ? 0.5f : 0.5f * (1 - (k - 0.7f) / 0.3f);
            batch.setColor(d.color.r, d.color.g, d.color.b, alpha * 0.30f);
            batch.draw(circle, d.x - r, d.y - r * 0.92f, r * 2, r * 2);
            batch.setColor(d.color.r, d.color.g, d.color.b, alpha);
            batch.draw(ring, d.x - r, d.y - r * 0.92f, r * 2, r * 2);
        }
        // Vong mo rong (dap dat / cong trieu hoi)
        for (RingFx r : rings) {
            if (r.ttl < 0) continue;
            float k = r.ttl / r.maxTtl;
            float rad = r.maxR * (0.25f + 0.75f * k);
            batch.setColor(r.color.r, r.color.g, r.color.b, 0.65f * (1 - k));
            batch.draw(ring, r.x - rad, r.y - rad * 0.42f, rad * 2, rad * 0.84f);
        }
        // Beam 3 lop (Rero)
        for (Beam b : beams) {
            float k = b.ttl / b.maxTtl;
            float fade = k < 0.25f ? k / 0.25f : 1 - Math.max(0, (k - 0.45f) / 0.55f);
            float flick = 0.85f + 0.15f * (float) Math.sin(b.ttl * 67);
            drawSeg(batch, white, b.x1, b.y1, b.x2, b.y2, 17 * b.scale * flick, b.accent, 0.30f * fade);
            drawSeg(batch, white, b.x1, b.y1, b.x2, b.y2, 8.5f * b.scale * flick, b.color, 0.85f * fade);
            drawSeg(batch, white, b.x1, b.y1, b.x2, b.y2, 3.6f * b.scale, Color.WHITE, 0.95f * fade);
            batch.setColor(1, 1, 1, 0.55f * fade);
            float ir = 17 * b.scale * (0.7f + 0.3f * flick);
            batch.draw(circle, b.x2 - ir, b.y2 - ir, ir * 2, ir * 2);
        }
        // Tia set / vet luot / dan ky nang: cac doan thang noi tiep
        for (Bolt b : bolts) {
            float alpha = Math.max(0, 1 - b.ttl / b.maxTtl);
            for (int i = 0; i + 3 < b.pts.length; i += 2) {
                drawSeg(batch, white, b.pts[i], b.pts[i + 1], b.pts[i + 2], b.pts[i + 3], b.width * 2.1f, b.color, alpha * 0.30f);
                drawSeg(batch, white, b.pts[i], b.pts[i + 1], b.pts[i + 2], b.pts[i + 3], b.width, b.color, alpha * 0.95f);
            }
        }
        // Vet chem (execute)
        for (Slash s : slashes) {
            float alpha = Math.max(0, 1 - s.ttl / s.maxTtl);
            float len = 46 * (0.6f + 0.4f * (s.ttl / s.maxTtl));
            batch.setColor(s.color.r, s.color.g, s.color.b, alpha * 0.9f);
            batch.draw(white, s.x - len / 2, s.y - 2.5f, len / 2, 2.5f, len, 5, 1, 1, s.ang, 0, 0, 1, 1, false, false);
        }
        // Phan tu
        for (P p : parts) {
            float k = p.ttl / p.maxTtl;
            float alpha = Math.max(0, 1 - k);
            float sz = p.size * (p.shape == SH_CIRCLE ? (1 - 0.45f * k) : 1);
            batch.setColor(p.color.r, p.color.g, p.color.b, alpha * 0.92f);
            switch (p.shape) {
                case SH_SHARD:
                    batch.draw(white, p.x - sz / 2, p.y - sz / 2, sz / 2, sz / 2, sz, sz, 1, 1, p.rot, 0, 0, 1, 1, false, false);
                    break;
                case SH_PLUS: {
                    float w = sz * 1.9f, t = sz * 0.62f;
                    batch.draw(white, p.x - w / 2, p.y - t / 2, w, t);
                    batch.draw(white, p.x - t / 2, p.y - w / 2, t, w);
                    break;
                }
                case SH_SPARK: {
                    float len = sz * 2.1f;
                    batch.draw(white, p.x, p.y - 1.4f, 0, 1.4f, len, 2.8f, 1, 1, p.rot, 0, 0, 1, 1, false, false);
                    break;
                }
                default:
                    batch.draw(circle, p.x - sz, p.y - sz, sz * 2, sz * 2);
                    break;
            }
        }
        batch.setColor(Color.WHITE);
    }

    // Ve 1 doan thang day w tu (x1,y1) toi (x2,y2) bang whiteTex xoay
    private void drawSeg(SpriteBatch batch, Texture white, float x1, float y1, float x2, float y2, float w, Color c, float alpha) {
        float dx = x2 - x1, dy = y2 - y1;
        float len = (float) Math.max(1, Math.hypot(dx, dy));
        float ang = (float) Math.toDegrees(Math.atan2(dy, dx));
        batch.setColor(c.r, c.g, c.b, Math.max(0, Math.min(1, alpha)));
        batch.draw(white, x1, y1 - w / 2, 0, w / 2, len, w, 1, 1, ang, 0, 0, 1, 1, false, false);
    }
}
