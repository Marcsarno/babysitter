import sys, numpy as np, cv2
for p in sys.argv[1:]:
    im = cv2.imread(p); g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    m = (g < 18).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5,5),np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    big = [s for s in st[1:] if s[4] > 40000]
    print(p.split('/')[-1], im.shape[1::-1], [tuple(int(v) for v in s) for s in big])
