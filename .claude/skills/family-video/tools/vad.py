import sys, json, numpy as np, librosa
mp3, grid = sys.argv[1], sys.argv[2]
y, sr = librosa.load(mp3, sr=16000, mono=False)
L, R = librosa.stft(y[0], hop_length=256), librosa.stft(y[1], hop_length=256)
M = (L + R) / 2; D = (L - R) / 2
mask = np.clip(1 - np.abs(D) / (np.abs(M) + 1e-9), 0, 1) ** 4
fr = librosa.fft_frequencies(sr=sr, n_fft=2048); C = M * mask; C[(fr < 150) | (fr > 4000)] = 0
Hm, Pm = librosa.decompose.hpss(C, margin=2.0)
v = librosa.istft(Hm, hop_length=256, length=y.shape[1])
f0, vflag, vprob = librosa.pyin(v, fmin=110, fmax=700, sr=sr, frame_length=1024, hop_length=320)
t = librosa.times_like(vprob, sr=sr, hop_length=320)
np.save(mp3.replace("media/music", "work").replace(".mp3", "_vprob.npy"), np.vstack([t, vprob, np.nan_to_num(f0)]))
g = json.load(open(grid)); beats = np.array(g["beats"]); downs = g["downbeats"]
for i, a in enumerate(downs):
    b = downs[i + 1] if i + 1 < len(downs) else t[-1]
    cells = []
    for k in range(8):
        a2, b2 = a + (b - a) * k / 8, a + (b - a) * (k + 1) / 8
        m = (t >= a2) & (t < b2); p = vprob[m].mean() if m.any() else 0
        cells.append(" .:-=+*#%@"[min(9, int(p * 10))])
    print(f"bar{i+1:3d} {a:7.2f} |{''.join(cells)}|")
