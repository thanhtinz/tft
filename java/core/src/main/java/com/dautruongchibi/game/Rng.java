package com.dautruongchibi.game;

// RNG xac dinh port tu engine.ts: mulberry32 (32-bit) + FNV-1a hashSeed.
// So hoc int cua Java tran 32-bit giong Math.imul cua JS nen cho cung day so.
public final class Rng {
    private int a;

    public Rng(long seed) { this.a = (int) seed; }

    public double next() {
        a += 0x6D2B79F5;
        int t = (a ^ (a >>> 15)) * (1 | a);
        t = (t + ((t ^ (t >>> 7)) * (61 | t))) ^ t;
        t = t ^ (t >>> 14);
        return (t & 0xFFFFFFFFL) / 4294967296.0; // = Integer.toUnsignedLong(t), nhung TeaVM chua co ham do
    }

    public int nextInt(int bound) {
        if (bound <= 0) return 0;
        return (int) (next() * bound);
    }

    public boolean chance(double pct) { return next() * 100 < pct; }

    public static int hashSeed(String str) {
        int h = 0x811c9dc5;
        for (int i = 0; i < str.length(); i++) {
            h ^= str.charAt(i);
            h = h * 0x01000193;
        }
        return h;
    }

    // LCG rieng cua makeAiTeam ban RN: s = (s*9301+49297) % 233280
    public static final class Lcg {
        private long s;
        public Lcg(long seed) { this.s = seed; }
        public double next() {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280.0;
        }
        public int nextInt(int bound) { return bound <= 0 ? 0 : (int) (next() * bound); }
    }
}
