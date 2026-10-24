import sys, glob, os, numpy as np, cv2
from insightface.app import FaceAnalysis
app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
app.prepare(ctx_id=-1, det_size=(640, 640))
refdir, out = sys.argv[1], sys.argv[2]
embs = []
for p in sorted(glob.glob(os.path.join(refdir, "*"))):
    img = cv2.imread(p)
    faces = sorted(app.get(img), key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]), reverse=True)
    if not faces: print("NO FACE", p); continue
    f = faces[0]
    print(os.path.basename(p), "faces:", len(faces), "det:", round(float(f.det_score),3), "age~", f.age)
    embs.append(f.normed_embedding)
E = np.array(embs)
print("pairwise cosine similarity:\n", np.round(E @ E.T, 2))
np.save(out, E)
