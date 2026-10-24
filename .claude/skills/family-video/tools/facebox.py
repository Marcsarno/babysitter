"""Pre-pass: face boxes for every film photo, in the same coordinates film.py loads them at."""
import sys, glob, os, json, numpy as np, cv2
from PIL import Image, ImageOps
from insightface.app import FaceAnalysis
S = sys.argv[1]
app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"]); app.prepare(ctx_id=-1, det_size=(960, 960))
def key(p):
    b = os.path.basename(p)
    return "young" if b.startswith("young") else (b[:3] if b.startswith("p") else b[:6])
paths = sorted(glob.glob(f"{S}/media/photos/*.jpg") + glob.glob(f"{S}/media/batch0*/*.jpg") + glob.glob(f"{S}/media/photos_film/*.jpg"))
out = {}
for p in paths:
    im = ImageOps.exif_transpose(Image.open(p)).convert("RGB")
    if max(im.size) > 2600: im.thumbnail((2600, 2600), Image.LANCZOS)
    w, h = im.size
    fs = app.get(cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR))
    boxes = [[round(float(v), 1) for v in f.bbox] for f in fs if (f.bbox[2] - f.bbox[0]) >= 0.035 * w]
    out[key(p)] = dict(path=p, size=[w, h], boxes=boxes)
json.dump(out, open(f"{S}/work/facebox.json", "w"))
print(len(out), "photos;", sum(len(v["boxes"]) for v in out.values()), "faces")
