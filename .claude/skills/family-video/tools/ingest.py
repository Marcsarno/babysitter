"""Ingest a batch: face tags (adults by ref match, kids by age), duplicates vs library, sharpness."""
import sys, glob, os, json, numpy as np, cv2
from PIL import Image
from insightface.app import FaceAnalysis
app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"]); app.prepare(ctx_id=-1, det_size=(960,960))
refdir, batchdir, libglob, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
refs = {os.path.basename(p)[:-4]: np.load(p) for p in glob.glob(refdir+"/*.npy") if "kids_gallery" not in p}
ALIAS = {"star_young": "star"}   # extra reference sets that count as the same person
def dhash(p):
    g = np.asarray(Image.open(p).convert("L").resize((17,16)), np.int16); return (g[:,1:] > g[:,:-1]).flatten()
lib = {os.path.basename(p): dhash(p) for g in libglob.split(",") for p in glob.glob(g)}
KIDS = np.load(refdir+"/kids_gallery.npy") if os.path.exists(refdir+"/kids_gallery.npy") else None
res = {}
for p in sorted(glob.glob(batchdir+"/*")):
    img = cv2.imread(p); h, w = img.shape[:2]
    faces = app.get(img); people = set(); kids = 0; detail = []
    for f in faces:
        fw = f.bbox[2]-f.bbox[0]
        if fw < w*0.035: continue                         # skip tiny background faces
        sims = {ALIAS.get(k,k): float((v @ f.normed_embedding).max()) for k,v in refs.items()}
        best = max(sims, key=sims.get)
        if sims[best] >= 0.35: people.add(best); detail.append((best, round(sims[best],2)))
        elif f.age < 15 or (KIDS is not None and float((KIDS @ f.normed_embedding).max()) >= 0.35): kids += 1; detail.append(("kid", int(f.age)))
        else: detail.append(("other", round(sims[best],2)))
    if kids: people.add("grandkids")
    gray = cv2.cvtColor(cv2.resize(img, (1000, int(1000*h/w))), cv2.COLOR_BGR2GRAY)
    sharp = cv2.Laplacian(gray, cv2.CV_64F).var()
    d = dhash(p); dup = [k for k,v in lib.items() if (d != v).sum() <= 12]
    lib[os.path.basename(p)] = d
    res[os.path.basename(p)] = dict(people=sorted(people), faces=detail, sharp=round(sharp), dup_of=dup, size=[w,h])
    print(f"{os.path.basename(p)[:6]} {','.join(sorted(people)):32s} sharp={sharp:5.0f} {'DUP of '+','.join(dup) if dup else ''}")
json.dump(res, open(out, "w"), indent=1)
