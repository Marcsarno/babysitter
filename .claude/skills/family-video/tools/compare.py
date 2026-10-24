import sys, glob, os, numpy as np, cv2
from insightface.app import FaceAnalysis
app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"]); app.prepare(ctx_id=-1, det_size=(640,640))
refs = {os.path.basename(p)[:-4]: np.load(p) for p in glob.glob(sys.argv[1]+"/*.npy")}
for p in sys.argv[2:]:
    faces = app.get(cv2.imread(p))
    for i,f in enumerate(sorted(faces, key=lambda f:-(f.bbox[2]-f.bbox[0]))):
        sims = {k: round(float((v @ f.normed_embedding).max()),2) for k,v in refs.items()}
        print(os.path.basename(p), "face", i, "w=%d"%(f.bbox[2]-f.bbox[0]), sims)
