"""Soundtrack: songs placed on the film clock + light SFX, limited, 48k stereo."""
import sys, json, wave, subprocess, numpy as np
S = sys.argv[1]; sys.argv = [sys.argv[0], S, "info"]
ns = {}; exec(open(f"{S}/tools/film.py").read().split("# ---------------------------------------------------------------- frame assembly")[0], ns)
SR = 48000; DUR = ns["DUR"]; D1 = ns["D1"]; f1, f2 = ns["f1"], ns["f2"]
n = int(DUR * SR) + SR
fx = np.zeros((n, 2), np.float32)
def put(t, sig, gain=1.0):
    i = int(t * SR); s = sig[:max(0, n - i)]
    if s.ndim == 1: s = np.stack([s, s], 1)
    fx[i:i + len(s)] += s * gain
k = lambda d: np.arange(int(d * SR)) / SR
rng = np.random.default_rng(7)
thunk = (0.5 * np.sin(2 * np.pi * 55 * k(0.35)) * np.exp(-k(0.35) * 14) + rng.normal(0, 0.06, len(k(0.35))) * np.exp(-k(0.35) * 9))
tone = 0.05 * np.sin(2 * np.pi * 1000 * k(2.5)); tone[:480] *= np.linspace(0, 1, 480); tone[-480:] *= np.linspace(1, 0, 480)
clap = rng.normal(0, 1, len(k(0.12))) * np.exp(-k(0.12) * 45); clap = np.convolve(clap, np.ones(3) / 3, "same")
click = rng.normal(0, 1, len(k(0.03))) * np.exp(-k(0.03) * 160)
def bell(f, d=1.6): t = k(d); return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)) * np.exp(-t * 2.6)
zap = 0.25 * np.sin(2 * np.pi * (900 - 2200 * k(0.35)) * k(0.35)) * np.exp(-k(0.35) * 6)
put(1.0, thunk, 0.8); put(1.0, tone)                          # cold open: TV on + bars tone
put(3.5 + 1.4, clap, 0.45)                                    # slate clap
put(f1(ns["CD1"]), clap, 0.30); put(f1(ns["CD2"]), clap, 0.30)      # claps into the countdowns
put(f1(D1[31]) - 0.35, click, 0.35); put(f1(D1[31]) - 0.29, click, 0.25)  # "say cheese" shutter
b0 = f1(ns["S1_CUT"]) + 0.2                                         # station-break chime (G4 E5 C5)
for i, f in enumerate([392.0, 659.3, 523.3]): put(b0 + i * 0.42, bell(f), 0.16)
put(f2(174.84) - 0.9, zap, 0.6)                               # CRT off at end of song 2
fx_path = f"{S}/work/sfx.wav"
with wave.open(fx_path, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(fx, -1, 1) * 32767).astype(np.int16).tobytes())
m1, m2 = f"{S}/media/music/song1_keep_the_camera_rolling.mp3", f"{S}/media/music/song2_hold_the_frame.mp3"
cut, b_from, b_at, s2_at = ns["S1_CUT"], ns["S1B_FROM"], ns["S1B_AT"], ns["S2_AT"]
fc = (f"[0:a]atrim=0:{cut},afade=t=out:st={cut - 0.05}:d=0.05,adelay={int(ns['COLD'] * 1000)}|{int(ns['COLD'] * 1000)}[a];"
      f"[1:a]adelay={int(s2_at * 1000)}|{int(s2_at * 1000)}[b];"
      f"[2:a]atrim={b_from},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.02,adelay={int(b_at * 1000)}|{int(b_at * 1000)}[c];"
      f"[a][b][c][3:a]amix=inputs=4:normalize=0:duration=longest,atrim=0:{DUR},alimiter=limit=0.89:level=false[out]")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", m1, "-i", m2, "-i", m1, "-i", fx_path, "-filter_complex", fc, "-map", "[out]",
                "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", f"{S}/work/soundtrack.wav"], check=True)
print("soundtrack ok", DUR)
