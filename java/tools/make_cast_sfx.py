#!/usr/bin/env python3
# Tong hop SFX tung chieu THEO HE cho dot VFX/SFX theo tuong (ban Java).
# Dinh dang khop tien le du an: WAV PCM 16-bit mono 22050Hz (nhu burst/heal/freeze tu sinh truoc).
# Moi he 1 tieng cast rieng: lua phung, bang vo, set ret, doc sui, hoi phuc chuong,
# khien rung tram, nang luong rit, vat ly vut gio, bong toi tho am, thien nhien la xa.
# Chay: python3 tools/make_cast_sfx.py  -> ghi vao assets/audio/cast_<he>.wav
import math, os, random, struct, wave

SR = 22050
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "audio")
random.seed(20261025)


def render(dur, fn):
    n = int(SR * dur)
    buf = [fn(i / SR, i, n) for i in range(n)]
    # chong click: fade 3ms dau/cuoi
    k = int(SR * 0.003)
    for i in range(k):
        buf[i] *= i / k
        buf[n - 1 - i] *= i / k
    peak = max(1e-6, max(abs(v) for v in buf))
    g = 0.82 / peak
    return [max(-1.0, min(1.0, v * g)) for v in buf]


def save(name, samples):
    path = os.path.join(OUT, name)
    w = wave.open(path, "wb")
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(b"".join(struct.pack("<h", int(v * 32767)) for v in samples))
    w.close()
    print("wrote", path, len(samples), "frames", round(len(samples) / SR, 3), "s")


def lowpass(x, a):
    y = 0.0
    out = []
    for v in x:
        y += a * (v - y)
        out.append(y)
    return out


def noise_seq(n, seed):
    r = random.Random(seed)
    return [r.uniform(-1, 1) for _ in range(n)]


def fire():
    n = int(SR * 0.45)
    raw = noise_seq(n, 11)
    lp = lowpass(raw, 0.5)
    lp2 = lowpass(raw, 0.08)
    crackle = [0.0] * n
    r = random.Random(12)
    for _ in range(26):
        i = r.randrange(n // 3, n)
        crackle[i] = r.uniform(0.5, 1.0)
    cr = lowpass(crackle, 0.35)
    def f(t, i, N):
        e = (1 - math.exp(-t * 30)) * math.exp(-t * 5.5)
        sweep = 0.25 * math.sin(2 * math.pi * (300 - 200 * t) * t)
        return e * (0.75 * lp[i] + 0.9 * lp2[i] + sweep) + math.exp(-t * 4) * cr[i] * 0.7
    return render(0.45, f)


def ice():
    pings = [(0.00, 2350), (0.05, 2980), (0.11, 3520), (0.19, 2740), (0.28, 3950)]
    def f(t, i, N):
        v = 0.0
        for (t0, fr) in pings:
            dt = t - t0
            if dt >= 0:
                v += math.sin(2 * math.pi * fr * (1 - 0.12 * dt) * dt) * math.exp(-dt * 22) * 0.7
                v += math.sin(2 * math.pi * fr * 1.5 * dt) * math.exp(-dt * 34) * 0.25
        return v
    s = render(0.45, f)
    ticks = lowpass(noise_seq(len(s), 21), 0.9)
    return [a + b * 0.10 * math.exp(-i / SR * 9) for i, (a, b) in enumerate(zip(s, ticks))]


def lightning():
    def f(t, i, N):
        zap = 0.0
        for (t0, dur, f0, f1) in [(0.0, 0.10, 1500, 220), (0.13, 0.07, 1100, 300)]:
            dt = t - t0
            if 0 <= dt < dur:
                ph = 2 * math.pi * (f0 + (f1 - f0) * dt / dur) * dt
                zap += math.tanh(2.2 * math.sin(ph)) * math.exp(-dt * 26)
        nse = noise_seq(N, 31)[i] * (0.5 + 0.5 * math.sin(i * 12.9898) ** 2)
        return zap * 0.8 + nse * math.exp(-t * 16) * 0.55
    return render(0.35, f)


def poison():
    blips = [(0.02, 320, 640), (0.11, 260, 560), (0.19, 380, 760), (0.30, 300, 690), (0.40, 420, 820)]
    base = lowpass(noise_seq(int(SR * 0.5), 41), 0.05)
    def f(t, i, N):
        v = base[i] * 0.5 * math.exp(-t * 2.5)
        for (t0, f0, f1) in blips:
            dt = t - t0
            if 0 <= dt < 0.09:
                fr = f0 + (f1 - f0) * (dt / 0.09)
                v += math.sin(2 * math.pi * fr * dt) * math.sin(math.pi * dt / 0.09) * 0.8
        return v
    return render(0.5, f)


def heal():
    notes = [(0.00, 659.25), (0.09, 783.99), (0.18, 987.77), (0.27, 1318.5)]
    def f(t, i, N):
        v = 0.0
        for (t0, fr) in notes:
            dt = t - t0
            if dt >= 0:
                a = (1 - math.exp(-dt * 18)) * math.exp(-dt * 4.2)
                v += (math.sin(2 * math.pi * fr * dt) + 0.35 * math.sin(4 * math.pi * fr * dt)) * a * 0.55
        return v
    return render(0.55, f)


def shield():
    def f(t, i, N):
        a = (1 - math.exp(-t * 9)) * math.exp(-t * 3.4)
        v = (math.sin(2 * math.pi * 176 * t) + 0.5 * math.sin(2 * math.pi * 264 * t)
             + 0.22 * math.sin(2 * math.pi * 352 * t)) * a
        v += math.sin(2 * math.pi * 2350 * t) * math.exp(-t * 30) * 0.18  # tia sang mo dau
        return v
    return render(0.5, f)


def energy():
    def f(t, i, N):
        if t < 0.13:
            fr = 210 + (1750 - 210) * (t / 0.13)
            ph = 2 * math.pi * fr * t
            return math.sin(ph) * (0.4 + 0.6 * t / 0.13) * 0.8
        dt = t - 0.13
        fr = 1750 * math.exp(-dt * 5.5) + 240
        return (math.sin(2 * math.pi * fr * dt) + 0.4 * math.sin(4 * math.pi * fr * dt)) * math.exp(-dt * 9) * 0.85
    return render(0.42, f)


def physical():
    n = int(SR * 0.30)
    raw = noise_seq(n, 51)
    lp = lowpass(raw, 0.35)
    lp_slow = lowpass(raw, 0.04)
    hp = [lp[i] - lp_slow[i] for i in range(n)]
    def f(t, i, N):
        e = math.sin(math.pi * min(1, t / 0.30)) ** 2
        return hp[i] * e * 1.6
    return render(0.30, f)


def shadow():
    def f(t, i, N):
        a = (1 - math.exp(-t * 5)) * math.exp(-t * 3.0)
        sag = 1 - 0.25 * t
        v = (math.sin(2 * math.pi * 110 * sag * t) + math.sin(2 * math.pi * 116.5 * sag * t)) * 0.45 * a
        v *= (0.8 + 0.2 * math.sin(2 * math.pi * 7 * t))
        return v
    s = render(0.5, f)
    br = lowpass(noise_seq(len(s), 61), 0.03)
    return [a + b * 0.35 * (i / len(s)) for i, (a, b) in enumerate(zip(s, br))]


def nature():
    plucks = [(0.00, 523.25), (0.10, 659.25), (0.21, 783.99)]
    def f(t, i, N):
        v = 0.0
        for (t0, fr) in plucks:
            dt = t - t0
            if dt >= 0:
                v += (math.sin(2 * math.pi * fr * dt) + 0.3 * math.sin(4 * math.pi * fr * dt)) * math.exp(-dt * 11) * 0.6
        return v
    s = render(0.5, f)
    raw = noise_seq(len(s), 71)
    rustle = [raw[i] - raw[i - 1] if i else 0.0 for i in range(len(raw))]
    return [a + b * 0.06 * math.sin(math.pi * i / len(s)) for i, (a, b) in enumerate(zip(s, rustle))]


if __name__ == "__main__":
    save("cast_fire.wav", fire())
    save("cast_ice.wav", ice())
    save("cast_lightning.wav", lightning())
    save("cast_poison.wav", poison())
    save("cast_heal.wav", heal())
    save("cast_shield.wav", shield())
    save("cast_energy.wav", energy())
    save("cast_physical.wav", physical())
    save("cast_shadow.wav", shadow())
    save("cast_nature.wav", nature())
