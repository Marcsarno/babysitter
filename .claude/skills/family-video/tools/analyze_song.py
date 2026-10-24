import sys, json, numpy as np, librosa
p, out = sys.argv[1], sys.argv[2]
y, sr = librosa.load(p, sr=22050, mono=True)
dur = len(y)/sr
tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units="time")
tempo = float(np.atleast_1d(tempo)[0])
# downbeats: choose phase of 4 with highest onset strength
oenv = librosa.onset.onset_strength(y=y, sr=sr)
bf = librosa.time_to_frames(beats, sr=sr)
ph = max(range(4), key=lambda k: oenv[bf[k::4]].mean())
downs = beats[ph::4]
# section boundaries via recurrence/agglomerative on chroma+mfcc (beat-synced)
C = librosa.feature.chroma_cqt(y=y, sr=sr); M = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
F = np.vstack([librosa.util.normalize(C), librosa.util.normalize(M)])
Fs = librosa.util.sync(F, bf)
k = int(sys.argv[3]) if len(sys.argv) > 3 else 12
bnd = librosa.segment.agglomerative(Fs, k)
bt = [0.0] + [float(beats[min(i, len(beats)-1)]) for i in bnd[1:]]
# vocal-band energy (300-3400Hz harmonic) per second
H = librosa.effects.harmonic(y)
S_ = np.abs(librosa.stft(H)); fr = librosa.fft_frequencies(sr=sr)
band = S_[(fr > 300) & (fr < 3400)].mean(0); tot = S_.mean(0) + 1e-9
voc = band / tot
rms = librosa.feature.rms(y=y)[0]
t = librosa.frames_to_time(np.arange(len(rms)), sr=sr)
per_sec = []
for s in range(int(dur)+1):
    m = (t >= s) & (t < s+1)
    if m.any(): per_sec.append([s, round(float(rms[m].mean()),4), round(float(voc[m[:len(voc)]].mean()),2)])
json.dump(dict(dur=dur, tempo=tempo, beats=[round(float(b),3) for b in beats], downbeats=[round(float(b),3) for b in downs], sections=[round(b,2) for b in bt], per_sec=per_sec), open(out,"w"))
print(f"{p.split('/')[-1]} dur={dur:.1f}s tempo={tempo:.1f} beats={len(beats)} first_beat={beats[0]:.2f}")
print("section starts:", [round(b,1) for b in bt])
