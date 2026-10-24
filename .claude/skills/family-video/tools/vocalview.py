import sys, numpy as np, librosa, matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt, json
mp3, grid, outp, span = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
y, sr = librosa.load(mp3, sr=22050, mono=False)
L, R = librosa.stft(y[0], hop_length=256), librosa.stft(y[1], hop_length=256)
M = (L + R) / 2; D = (L - R) / 2
mask = np.clip(1 - np.abs(D) / (np.abs(M) + 1e-9), 0, 1) ** 4          # centre-panned bins
C = M * mask
H, P = librosa.decompose.hpss(np.abs(C), margin=2.0)
fr = librosa.fft_frequencies(sr=sr, n_fft=2048); sel = (fr > 150) & (fr < 2500)
V = librosa.amplitude_to_db(H[sel], ref=np.max)
t = librosa.frames_to_time(np.arange(H.shape[1]), sr=sr, hop_length=256)
g = json.load(open(grid)); downs = g["downbeats"]
dur = t[-1]; n = int(np.ceil(dur / span))
fig, ax = plt.subplots(n, 1, figsize=(30, 3.2 * n))
for i in range(n):
    a, b = i * span, min((i + 1) * span, dur); m = (t >= a) & (t < b)
    ax[i].imshow(V[:, m], origin="lower", aspect="auto", cmap="magma", extent=[a, b, 150, 2500], vmin=-70, vmax=0)
    ax[i].set_yscale("log"); ax[i].set_ylim(150, 2500)
    for k, d in enumerate(downs):
        if a <= d < b: ax[i].axvline(d, color="cyan", lw=0.8); ax[i].text(d, 2200, str(k + 1), color="cyan", fontsize=9)
    ax[i].set_xticks(np.arange(np.ceil(a), b, 1)); ax[i].tick_params(labelsize=7)
plt.tight_layout(); plt.savefig(outp, dpi=48)
