import sys, json, numpy as np, librosa
mp3, bpm_hint = sys.argv[1], float(sys.argv[2])
y, sr = librosa.load(mp3, sr=22050, mono=False); mid = y.mean(0); side = (y[0]-y[1])/2
tempo, beats = librosa.beat.beat_track(y=mid, sr=sr, units="time", start_bpm=bpm_hint)
oenv = librosa.onset.onset_strength(y=mid, sr=sr); bf = librosa.time_to_frames(beats, sr=sr)
ph = max(range(4), key=lambda k: oenv[bf[k::4]].mean()); downs = beats[ph::4]
H = librosa.effects.harmonic(mid, margin=2.0)
def band(sig, lo, hi):
    X = np.abs(librosa.stft(sig, hop_length=512)); fr = librosa.fft_frequencies(sr=sr)
    return X[(fr>lo)&(fr<hi)].sum(0)
v = band(H, 300, 3500); s_ = band(side, 300, 3500) + 1e-6
ratio = v / (v + s_)          # vocals are centre-panned: high ratio = vocal-ish
rms = librosa.feature.rms(y=mid, hop_length=512)[0]
t = librosa.frames_to_time(np.arange(len(v)), sr=sr, hop_length=512)
print(f"tempo {float(np.atleast_1d(tempo)[0]):.1f}  bar={4*60/float(np.atleast_1d(tempo)[0]):.2f}s  phase={ph}")
rows = []
for i in range(len(downs)):
    a = downs[i]; b = downs[i+1] if i+1 < len(downs) else len(mid)/sr
    m = (t>=a)&(t<b)
    rows.append((i+1, round(float(a),2), float(ratio[m].mean()), float(rms[m].mean())))
r = np.array([x[2] for x in rows]); e = np.array([x[3] for x in rows])
for (n,a,vr,en) in rows:
    print(f"bar{n:3d} {a:7.2f}  voc {'#'*int((vr-r.min())/(r.max()-r.min()+1e-9)*30):30s} nrg {'='*int(en/e.max()*20)}")
json.dump(dict(tempo=float(np.atleast_1d(tempo)[0]), beats=[float(x) for x in beats], downbeats=[float(x) for x in downs]), open(mp3.replace(".mp3","_grid.json").replace("media/music","work"),"w"))
