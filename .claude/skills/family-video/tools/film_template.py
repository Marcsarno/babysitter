"""Family film renderer + editable timeline (TEMPLATE, from a 77th-birthday "TV special" project).
Names are placeholders: STAR = the person being celebrated, PARTNER, KID, GRANDKIDS. Photo keys (p01, b03_12...) refer to
that project's files; replace the TIMELINE section with the new project's shots.

Film = cold open + song 1 (to its 2nd stop) + station break + song 2 (full) + song 1 (from its break) + tail.
Every shot is listed in TIMELINE below with its film start/end; edit there and re-render.

Usage:
  python3 -I film.py <scratch> stills t1 t2 ...        # write stills for checking
  python3 -I film.py <scratch> frames <start> <end> <out.mp4>   # render a range (video only)
  python3 -I film.py <scratch> info                     # print timeline + duration
"""
import sys, os, json, math, functools
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps, ImageEnhance

S = sys.argv[1]
W, H, FPS = 1920, 1080, 30
ART, FONTS = f"{S}/media/art", f"{S}/fonts"
FB = json.load(open(f"{S}/work/facebox.json"))
G1 = json.load(open(f"{S}/work/song1_keep_the_camera_rolling_grid.json"))
G2 = json.load(open(f"{S}/work/song2_hold_the_frame_grid.json"))
D1 = [None] + G1["downbeats"]          # D1[n] = start of bar n (1-based)
D2 = [None] + G2["downbeats"]

NAVY, RED, GOLD, CREAM = (29, 42, 79), (163, 32, 42), (196, 154, 60), (240, 223, 185)
SLAB, OSW, OSW_R, VT = "roboto-slab-latin-700-normal.woff", "oswald-latin-700-normal.woff", "oswald-latin-400-normal.woff", "vt323-latin-400-normal.woff"

# ---------------------------------------------------------------- film clock
COLD = 5.4                     # cold open length; song 1 starts here
S1_CUT = 118.65                # song-1 time where part A ends (downbeat of bar 58, after the drum fill)
BUMP = 3.0                     # "we'll be right back" bumper
S2_LEN = 174.84
S2_AT = COLD + S1_CUT + BUMP   # film time song 2 starts
S1B_FROM = D1[58]              # song-1 time part B resumes (start of the instrumental break)
S1B_AT = S2_AT + S2_LEN + 0.5  # film time part B starts
S1_END = 196.82
TAIL = 2.0
DUR = S1B_AT + (S1_END - S1B_FROM) + TAIL
def f1(s): return COLD + s if s <= S1_CUT + 1e-6 else S1B_AT + (s - S1B_FROM)
def f2(t): return S2_AT + t

def ease(x): x = min(max(x, 0.0), 1.0); return x * x * (3 - 2 * x)
def lerp(a, b, t): return a + (b - a) * t
def lerp_rect(a, b, t): return tuple(lerp(p, q, t) for p, q in zip(a, b))
def clamp(v, lo, hi): return max(lo, min(hi, v))

@functools.lru_cache(None)
def font(name, size): return ImageFont.truetype(f"{FONTS}/{name}", size)

# ---------------------------------------------------------------- assets
@functools.lru_cache(None)
def photo(key):
    im = ImageOps.exif_transpose(Image.open(FB[key]["path"])).convert("RGB")
    if max(im.size) > 2600: im.thumbnail((2600, 2600), Image.LANCZOS)
    if key == "young":                    # restored B&W print: keep it gently warm
        im = ImageEnhance.Contrast(im).enhance(1.05)
    return im

def boxes(key): return FB[key]["boxes"]

@functools.lru_cache(None)
def art(name, mode="RGB"):
    return Image.open(f"{ART}/{name}").convert(mode).resize((W, H), Image.LANCZOS)

@functools.lru_cache(None)
def holes(name, thresh=18, minarea=40000, region=None):
    """Blank screen/print areas of an art plate: list of (quad 4x2 TL,TR,BR,BL, mask float HxW, bbox)."""
    im = np.asarray(art(name)); g = cv2.cvtColor(im, cv2.COLOR_RGB2GRAY)
    m = (g < thresh).astype(np.uint8)
    if region: x0, y0, x1, y1 = region; r = np.zeros_like(m); r[y0:y1, x0:x1] = 1; m *= r
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    out = []
    for i in range(1, n):
        if st[i][4] < minarea: continue
        cnts, _ = cv2.findContours((lab == i).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        hull = cv2.convexHull(max(cnts, key=cv2.contourArea))
        quad = None
        for eps in np.linspace(0.005, 0.08, 30):
            ap = cv2.approxPolyDP(hull, eps * cv2.arcLength(hull, True), True)
            if len(ap) == 4: quad = ap.reshape(4, 2).astype(np.float32); break
        if quad is None: quad = cv2.boxPoints(cv2.minAreaRect(hull)).astype(np.float32)
        s = quad.sum(1); d = np.diff(quad, axis=1).ravel()
        quad = np.array([quad[np.argmin(s)], quad[np.argmin(d)], quad[np.argmax(s)], quad[np.argmax(d)]], np.float32)
        mk = np.zeros((H, W), np.uint8); cv2.fillPoly(mk, [hull], 255)
        mk = cv2.dilate(mk, np.ones((5, 5), np.uint8)); mk = cv2.GaussianBlur(mk, (5, 5), 0)
        x, y, w, h = [int(v) for v in st[i][:4]]
        out.append((quad, mk.astype(np.float32) / 255.0, (x, y, w, h)))
    return sorted(out, key=lambda r: (round(r[2][1] / 150), r[2][0]))

# ---------------------------------------------------------------- crops
def crop_rect(key, aspect, anchor=0.42, focus=None):
    w, h = photo(key).size; b = boxes(key)
    cw = min(w, h * aspect); ch = cw / aspect
    if focus is not None: fx, fy = focus[0] * w, focus[1] * h; fy0 = fy1 = fy; fx0 = fx1 = fx
    elif b:
        fx0 = min(x[0] for x in b); fx1 = max(x[2] for x in b); fy0 = min(x[1] for x in b); fy1 = max(x[3] for x in b)
    else: fx0 = fx1 = w / 2; fy0 = fy1 = h * 0.4
    cx = clamp((fx0 + fx1) / 2 - cw / 2, 0, w - cw)
    cy = clamp((fy0 + fy1) / 2 - ch * anchor, 0, h - ch)
    return (cx, cy, cw, ch)

def faces_center(key, rect):
    b = boxes(key); x, y, w, h = rect
    if not b: return (x + w / 2, y + h * 0.45)
    inside = [q for q in b if q[0] >= x - 5 and q[2] <= x + w + 5 and q[1] >= y - 5 and q[3] <= y + h + 5] or b
    return ((min(q[0] for q in inside) + max(q[2] for q in inside)) / 2, (min(q[1] for q in inside) + max(q[3] for q in inside)) / 2)

def auto_mode(key):
    w, h = photo(key).size
    if w / h >= 1.25: return "crop"
    b = boxes(key)
    if not b: return "fit"
    x, y, cw, ch = crop_rect(key, 16 / 9)
    fy0 = min(q[1] for q in b); fy1 = max(q[3] for q in b); fx0 = min(q[0] for q in b); fx1 = max(q[2] for q in b)
    ok = (fy1 - fy0) <= 0.70 * ch and (fx1 - fx0) <= 0.92 * cw and fy0 >= y and fy1 <= y + ch
    return "crop" if ok else "fit"

def extent(img, rect, size=(W, H), resample=Image.BICUBIC):
    x, y, w, h = rect
    return img.transform(size, Image.EXTENT, (x, y, x + w, y + h), resample)

def zoomed(rect, z, center, bound):
    x, y, w, h = rect; nw, nh = w / z, h / z
    bx, by, bw, bh = bound
    return (clamp(center[0] - nw / 2, bx, bx + bw - nw), clamp(center[1] - nh / 2, by, by + bh - nh), nw, nh)

# ---------------------------------------------------------------- photo shot
@functools.lru_cache(maxsize=24)
def fit_layers(key):
    im = photo(key); w, h = im.size
    bgc = crop_rect(key, 16 / 9) if w / h < 16 / 9 else ((w - h * 16 / 9) / 2, 0, h * 16 / 9, h)
    bg = extent(im, bgc, (480, 270)).filter(ImageFilter.GaussianBlur(14))
    bg = ImageEnhance.Brightness(bg).enhance(0.42).resize((W, H), Image.BICUBIC)
    s = min(1000 / h, 1780 / w); fw, fh = int(w * s), int(h * s)
    fg = im.resize((fw, fh), Image.LANCZOS)
    bord = 14
    card = Image.new("RGB", (fw + 2 * bord, fh + 2 * bord), (244, 236, 216)); card.paste(fg, (bord, bord))
    sh = Image.new("L", (card.width + 80, card.height + 80), 0)
    ImageDraw.Draw(sh).rectangle([40, 40, 40 + card.width, 40 + card.height], fill=170)
    sh = sh.filter(ImageFilter.GaussianBlur(18))
    return bg, card, sh

def render_photo(key, p, move="in", mode="auto", zoom=1.07, anchor=0.42, focus=None, tilt=0.0):
    im = photo(key)
    if mode == "auto": mode = auto_mode(key)
    if mode == "fit":
        bg, card, sh = fit_layers(key)
        z = lerp(1.0, 1.035, ease(p)) if move != "none" else 1.0
        if move == "out": z = lerp(1.035, 1.0, ease(p))
        cw, chh = int(card.width * z), int(card.height * z)
        c2 = card.resize((cw, chh), Image.BILINEAR); s2 = sh.resize((sh.width * cw // card.width, sh.height * chh // card.height), Image.BILINEAR)
        out = bg.copy()
        x0, y0 = (W - cw) // 2, (H - chh) // 2
        black = Image.new("RGB", s2.size, (0, 0, 0))
        out.paste(black, (x0 - (s2.width - cw) // 2 + 10, y0 - (s2.height - chh) // 2 + 14), s2)
        if tilt: c2 = c2.rotate(tilt, Image.BICUBIC, expand=True, fillcolor=None)
        out.paste(c2, (x0, y0))
        return out
    base = crop_rect(key, 16 / 9, anchor=anchor, focus=focus)
    w, h = im.size
    c = faces_center(key, base) if focus is None else (focus[0] * w, focus[1] * h)
    tight = zoomed(base, zoom, c, (0, 0, w, h))
    if move == "in": r = lerp_rect(base, tight, ease(p))
    elif move == "out": r = lerp_rect(tight, base, ease(p))
    elif move in ("left", "right"):
        a = zoomed(base, zoom, (base[0] + base[2] * 0.3, c[1]), (0, 0, w, h)); b = zoomed(base, zoom, (base[0] + base[2] * 0.7, c[1]), (0, 0, w, h))
        r = lerp_rect(a, b, ease(p)) if move == "right" else lerp_rect(b, a, ease(p))
    else: r = base
    return extent(im, r)

# ---------------------------------------------------------------- screens on plates
@functools.lru_cache(maxsize=64)
def screen_content(key, qw, qh, style, anchor=0.42):
    im = photo(key)
    r = crop_rect(key, qw / qh, anchor=anchor)
    c = extent(im, r, (qw, qh), Image.BICUBIC)
    a = np.asarray(c, np.float32)
    if style == "crt":
        small = cv2.resize(a, (max(1, qw // 6), max(1, qh // 6)), interpolation=cv2.INTER_AREA)
        glow = cv2.resize(cv2.GaussianBlur(small, (0, 0), 2), (qw, qh))
        rows = np.arange(qh, dtype=np.float32); period = max(3.0, qh / 240)
        scan = 1 - 0.20 * (0.5 + 0.5 * np.cos(2 * np.pi * rows / period))
        a = a * scan[:, None, None] * 1.06 + glow * 0.16
        a[:, 2:, 0] = a[:, 2:, 0] * 0.6 + a[:, :-2, 0] * 0.4
    elif style == "print":
        a = a * 0.97 + 4
    return np.clip(a, 0, 255).astype(np.uint8)

def quad_size(q):
    w = (np.linalg.norm(q[1] - q[0]) + np.linalg.norm(q[2] - q[3])) / 2
    h = (np.linalg.norm(q[3] - q[0]) + np.linalg.norm(q[2] - q[1])) / 2
    return max(8, int(w)), max(8, int(h))

def put_screen(canvas, hole, key, style="crt", power=1.0, anchor=0.42):
    """canvas float32 HxWx3 in plate coords; power 0..1 = CRT turn-on (0 = off)."""
    quad, mask, _ = hole
    if power <= 0: return canvas
    qw, qh = quad_size(quad)
    c = screen_content(key, qw, qh, style, anchor).astype(np.float32)
    if power < 1.0 and style == "crt":
        half = max(0.01, ease(power)) * qh / 2; ys = np.arange(qh)
        open_ = (np.abs(ys - qh / 2) <= half).astype(np.float32)[:, None, None]
        c = np.minimum(c * (1 + 2.0 * (1 - power)) + 70 * (1 - power), 255) * open_
    src = np.float32([[0, 0], [qw, 0], [qw, qh], [0, qh]])
    M = cv2.getPerspectiveTransform(src, quad)
    warped = cv2.warpPerspective(c, M, (W, H), flags=cv2.INTER_LINEAR)
    cov = cv2.warpPerspective(np.ones((qh, qw), np.float32), M, (W, H), flags=cv2.INTER_LINEAR)
    m = (mask * np.clip(cov * 1.02, 0, 1))[..., None]
    return canvas * (1 - m) + warped * m

def put_layer(canvas, rgba, quad=None, pos=None):
    """Composite an RGBA PIL layer onto float canvas, either at pos or warped to a quad."""
    a = np.asarray(rgba, np.float32); rgb, al = a[..., :3], a[..., 3:] / 255.0
    if quad is not None:
        h, w = rgb.shape[:2]
        M = cv2.getPerspectiveTransform(np.float32([[0, 0], [w, 0], [w, h], [0, h]]), np.float32(quad))
        rgb = cv2.warpPerspective(rgb, M, (W, H)); al = cv2.warpPerspective(al, M, (W, H))[..., None]
        return canvas * (1 - al) + rgb * al
    x, y = pos; h, w = rgb.shape[:2]
    sub = canvas[y:y + h, x:x + w]
    canvas[y:y + h, x:x + w] = sub * (1 - al[:sub.shape[0], :sub.shape[1]]) + rgb[:sub.shape[0], :sub.shape[1]] * al[:sub.shape[0], :sub.shape[1]]
    return canvas

def text_tile(w, h, lines, fnt, size, color, bg=None, spacing=1.15, shadow=False):
    t = Image.new("RGBA", (w, h), bg or (0, 0, 0, 0)); d = ImageDraw.Draw(t)
    sz = size
    while True:
        f = font(fnt, sz)
        widths = [d.textlength(l, font=f) for l in lines]
        if max(widths) <= w * 0.92 and sz * spacing * len(lines) <= h * 0.95 or sz <= 8: break
        sz -= 2
    tot = sz * spacing * len(lines); y = (h - tot) / 2 + sz * spacing / 2
    for l in lines:
        if shadow: d.text((w / 2 + 3, y + 3), l, font=f, fill=(0, 0, 0, 160), anchor="mm")
        d.text((w / 2, y), l, font=f, fill=color, anchor="mm"); y += sz * spacing
    return t

def view_frame(canvas, view):
    img = Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8))
    if view == (0, 0, W, H): return img
    return extent(img, view)

def zoom_view(z, cx, cy):
    vw, vh = W / z, H / z
    return (clamp(cx - vw / 2, 0, W - vw), clamp(cy - vh / 2, 0, H - vh), vw, vh)

# ---------------------------------------------------------------- baked plates (text on art)
@functools.lru_cache(None)
def slate(take):
    c = np.asarray(art("clapperboard.png"), np.float32).copy()
    chalk = (238, 238, 232, 255)
    for (x0, y0, x1, y1), lines, sz in [
        ((455, 525, 752, 680), ["ROLL", "A-77"], 60), ((762, 525, 1146, 680), ["SCENE", "77"], 60),
        ((1156, 525, 1465, 680), ["TAKE", str(take)], 60),
        ((455, 690, 1465, 772), ["PROD: THE STAR NAME BIRTHDAY SPECIAL"], 52),
        ((455, 782, 1046, 955), ["DIRECTOR", "STAR NAME"], 54), ((1056, 782, 1465, 955), ["CAMERA", "THE FAMILY"], 54)]:
        t = text_tile(x1 - x0, y1 - y0, lines, OSW, sz, chalk)
        c = put_layer(c, t, pos=(x0, y0))
    return c

@functools.lru_cache(None)
def edit_bay_plate():
    c = np.asarray(art("edit_bay.png"), np.float32).copy()
    labels = [((394, 802, 480, 904), "TV\nYEARS"), ((512, 802, 608, 904), "THE\nCRUISES"), ((640, 802, 736, 904), "HOLI-\nDAYS"),
              ((763, 802, 853, 904), "NYC\nBOYS"), ((885, 802, 970, 904), "GRAND-\nKIDS")]
    for (x0, y0, x1, y1), txt in labels:
        c = put_layer(c, text_tile(x1 - x0, y1 - y0, txt.split("\n"), OSW, 30, (*NAVY, 255)), pos=(x0, y0))
    return c

@functools.lru_cache(None)
def wrap_plate():
    c = np.asarray(art("thats_a_wrap.png"), np.float32).copy()
    for quad, name in [([(235, 616), (757, 606), (746, 776), (256, 797)], "PARTNER"), ([(1023, 627), (1684, 606), (1663, 787), (1045, 808)], "STAR")]:
        t = text_tile(600, 190, [name], OSW, 150, (*NAVY, 235))
        c = put_layer(c, t, quad=quad)
    return c

@functools.lru_cache(None)
def card_plate():
    c = np.asarray(art("02_Two_Photo_Card.png"), np.float32).copy()
    for (x0, y0, x1, y1), txt in [((240, 762, 762, 846), "THEN"), ((1156, 762, 1680, 846), "NOW")]:
        c = put_layer(c, text_tile(x1 - x0, y1 - y0, [txt], SLAB, 64, (*NAVY, 255)), pos=(x0, y0))
    return c

@functools.lru_cache(None)
def vhs_plate():
    c = np.asarray(art("05_VHS_Case.png"), np.float32).copy()
    c = put_layer(c, text_tile(535, 140, ["STAR'S", "GREATEST HITS"], SLAB, 60, (*NAVY, 255)), pos=(345, 128))
    c = put_layer(c, text_tile(320, 110, ["VOL. 77"], OSW, 70, (*RED, 255)), pos=(1060, 862))
    return c

@functools.lru_cache(None)
def bumper_plate(lines):
    c = np.asarray(art("07_Station_Bumper.png"), np.float32).copy()
    return put_layer(c, text_tile(1100, 185, list(lines), SLAB, 84, (*RED, 255)), pos=(410, 725))

@functools.lru_cache(None)
def bars_img():
    im = Image.new("RGB", (W, H)); d = ImageDraw.Draw(im)
    top = [(191, 191, 191), (191, 191, 0), (0, 191, 191), (0, 191, 0), (191, 0, 191), (191, 0, 0), (0, 0, 191)]
    mid = [(0, 0, 191), (19, 19, 19), (191, 0, 191), (19, 19, 19), (0, 191, 191), (19, 19, 19), (191, 191, 191)]
    bw = W / 7
    for i, c in enumerate(top): d.rectangle([i * bw, 0, (i + 1) * bw, H * 0.67], fill=c)
    for i, c in enumerate(mid): d.rectangle([i * bw, H * 0.67, (i + 1) * bw, H * 0.75], fill=c)
    x = 0
    for c in [(0, 33, 76), (255, 255, 255), (50, 0, 106), (19, 19, 19)]: d.rectangle([x, H * 0.75, x + bw * 1.25, H], fill=c); x += bw * 1.25
    for c in [(9, 9, 9), (19, 19, 19), (29, 29, 29)]: d.rectangle([x, H * 0.75, x + bw / 3, H], fill=c); x += bw / 3
    d.rectangle([x, H * 0.75, W, H], fill=(19, 19, 19))
    f = font(VT, 64); txt = "THE STAR NAME BIRTHDAY SPECIAL"; tw = d.textlength(txt, font=f)
    d.rectangle([W / 2 - tw / 2 - 30, 300, W / 2 + tw / 2 + 30, 400], fill=(0, 0, 0))
    d.text((W / 2, 350), txt, font=f, fill=(235, 235, 235), anchor="mm")
    return im

def leader(num, frac):
    im = Image.new("RGB", (W, H), (150, 150, 150)); d = ImageDraw.Draw(im)
    cx, cy, r = W / 2, H / 2, 430
    d.pieslice([cx - r * 1.6, cy - r * 1.6, cx + r * 1.6, cy + r * 1.6], -90, -90 + 360 * frac, fill=(95, 95, 95))
    d.line([0, cy, W, cy], fill=(40, 40, 40), width=4); d.line([cx, 0, cx, H], fill=(40, 40, 40), width=4)
    for rr, wd in [(r, 10), (r - 40, 6)]: d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=(245, 245, 245), width=wd)
    d.text((cx, cy + 10), str(num), font=font(OSW_R, 560), fill=(15, 15, 15), anchor="mm")
    return im

@functools.lru_cache(None)
def big77():
    im = Image.new("RGB", (W, H), NAVY)
    st = art("06_Transparent_Stripes.png", "RGBA"); im.paste(st, (0, 0), st)
    d = ImageDraw.Draw(im)
    d.text((W / 2 + 10, 470 + 12), "77", font=font(OSW, 560), fill=(10, 14, 30), anchor="mm")
    d.text((W / 2, 470), "77", font=font(OSW, 560), fill=GOLD, anchor="mm", stroke_width=10, stroke_fill=(70, 40, 10))
    d.text((W / 2, 880), "STILL ROLLING", font=font(SLAB, 110), fill=CREAM, anchor="mm", stroke_width=4, stroke_fill=NAVY)
    return im

# ---------------------------------------------------------------- overlays
LT = None
def lower_third(frame, name, sub, p_in, p_out):
    global LT
    if LT is None: LT = art("lower_third.png", "RGBA")
    layer = LT.copy(); d = ImageDraw.Draw(layer)
    d.text((395, 862), name, font=font(SLAB, 76), fill=(250, 242, 225), anchor="lm")
    f = font(OSW, 40)
    while d.textlength(sub, font=f) > 1150 and f.size > 20: f = font(OSW, f.size - 2)
    d.text((395, 962), sub, font=f, fill=(250, 236, 200), anchor="lm")
    reveal = int(lerp(0, W, ease(p_in)) * (1 - ease(p_out)))
    m = Image.new("L", (W, H), 0); ImageDraw.Draw(m).rectangle([0, 0, reveal, H], fill=255)
    a = Image.fromarray((np.asarray(layer.getchannel("A"), np.float32) * np.asarray(m, np.float32) / 255).astype(np.uint8))
    out = frame.copy(); out.paste(layer.convert("RGB"), (0, 0), a); return out

def viewfinder(frame, t_abs):
    d = ImageDraw.Draw(frame); c = (245, 245, 245); L = 70; m = 60
    for (x, y, sx, sy) in [(m, m, 1, 1), (W - m, m, -1, 1), (m, H - m, 1, -1), (W - m, H - m, -1, -1)]:
        d.line([x, y, x + sx * L, y], fill=c, width=5); d.line([x, y, x, y + sy * L], fill=c, width=5)
    if int(t_abs * 2) % 2 == 0: d.ellipse([110, 100, 146, 136], fill=(230, 30, 30))
    d.text((160, 118), "REC", font=font(VT, 64), fill=c, anchor="lm")
    d.text((W - 120, 118), "SP", font=font(VT, 64), fill=c, anchor="rm")
    d.rectangle([W - 300, 98, W - 200, 138], outline=c, width=4); d.rectangle([W - 200, 110, W - 192, 126], fill=c)
    for i in range(3): d.rectangle([W - 292 + i * 31, 106, W - 268 + i * 31, 130], fill=c)
    fr = int(t_abs * FPS); tc = f"00:{fr // (FPS * 60) % 60:02d}:{fr // FPS % 60:02d}:{fr % FPS:02d}"
    d.text((W - 120, H - 118), tc, font=font(VT, 64), fill=c, anchor="rm")
    return frame

def caption_strip(frame, text, p_in):
    if p_in <= 0: return frame
    f = font(OSW, 62); d = ImageDraw.Draw(frame)
    tw = d.textlength(text, font=f); a = ease(p_in)
    box = Image.new("RGBA", (int(tw + 90), 100), (*NAVY, int(225 * a))); bd = ImageDraw.Draw(box)
    bd.rectangle([0, 0, box.width - 1, 6], fill=(*GOLD, int(255 * a)))
    bd.text((box.width / 2, 54), text, font=f, fill=(*CREAM, int(255 * a)), anchor="mm")
    frame.paste(box, (int((W - box.width) / 2), 950), box); return frame

def take_tag(frame, text):
    d = ImageDraw.Draw(frame); f = font(OSW, 64)
    tw = d.textlength(text, font=f)
    d.rectangle([70, 70, 70 + tw + 60, 170], fill=(15, 15, 15)); d.rectangle([70, 70, 70 + tw + 60, 82], fill=CREAM)
    d.text((100, 128), text, font=f, fill=(240, 240, 235), anchor="lm"); return frame

def pause_osd(frame):
    d = ImageDraw.Draw(frame); c = (240, 240, 240)
    d.rectangle([92, 92, 108, 142], fill=c); d.rectangle([120, 92, 136, 142], fill=c)
    d.text((158, 118), "PAUSE", font=font(VT, 64), fill=c, anchor="lm"); return frame

def title_overlay(frame, lines, p, y0=150):
    if p <= 0: return frame
    a = ease(p); layer = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    y = y0
    for txt, sz, col in lines:
        f = font(SLAB, sz)
        d.text((W / 2 + 5, y + 6), txt, font=f, fill=(0, 0, 0, int(170 * a)), anchor="mm")
        d.text((W / 2, y), txt, font=f, fill=(*col, int(255 * a)), anchor="mm", stroke_width=3, stroke_fill=(*NAVY, int(255 * a)))
        y += sz * 1.15
    frame.paste(layer, (0, 0), layer); return frame

def flash(frame, k):
    if k <= 0: return frame
    return Image.blend(frame, Image.new("RGB", (W, H), (255, 255, 255)), min(1.0, k))

def u8(a): return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

def fade(img, k): return Image.fromarray((np.asarray(img, np.float32) * k).astype(np.uint8))

def crt_off(img, p):
    """CRT switch-off on a full frame: squash to a line then a dot. p 0..1"""
    if p <= 0: return img
    a = np.asarray(img, np.float32)
    if p < 0.7:
        k = 1 - ease(p / 0.7); hh = max(2, int(H * k))
        sq = cv2.resize(a, (W, hh), interpolation=cv2.INTER_AREA) * (1 + 1.5 * (1 - k))
        out = np.zeros_like(a); y0 = (H - hh) // 2; out[y0:y0 + hh] = np.minimum(sq, 255)
    else:
        k = 1 - ease((p - 0.7) / 0.3); ww = max(2, int(W * k)); out = np.zeros_like(a)
        out[H // 2 - 2:H // 2 + 2, (W - ww) // 2:(W + ww) // 2] = 255 * k
    return Image.fromarray(out.astype(np.uint8))

def vhs_glitch(img, amt, seed):
    rng = np.random.default_rng(seed); a = np.asarray(img).copy()
    for _ in range(int(14 * amt) + 1):
        y = rng.integers(0, H - 40); h = rng.integers(6, 50); s = int(rng.integers(-90, 90) * amt)
        a[y:y + h] = np.roll(a[y:y + h], s, axis=1)
    a[..., 0] = np.roll(a[..., 0], int(10 * amt), axis=1)
    return Image.fromarray(np.clip(a + rng.normal(0, 40 * amt, (H, W, 1)), 0, 255).astype(np.uint8))

STRIPES = None
def stripe_wipe(frame, p):
    """Diagonal stripe graphic sweeps left->right across the frame."""
    global STRIPES
    if STRIPES is None: STRIPES = art("06_Transparent_Stripes.png", "RGBA")
    if p <= 0 or p >= 1: return frame
    x = int(lerp(-W * 1.05, W * 1.05, p)); out = frame.copy(); out.paste(STRIPES, (x, 0), STRIPES); return out

# ---------------------------------------------------------------- shot types (fn(local_t, dur, abs_t) -> PIL)
def Photo(key, move="in", **kw):
    return lambda t, d, T: render_photo(key, t / d, move, **kw)

def Bars(): return lambda t, d, T: bars_img()
def Black(): return lambda t, d, T: Image.new("RGB", (W, H))
def Leader(n, start_frac=0.0): return lambda t, d, T: leader(n, start_frac + (1 - start_frac) * t / max(d, 1e-6))
def Card(fn, z0=1.0, z1=1.04, cx=W / 2, cy=H / 2):
    return lambda t, d, T: extent(fn(), zoom_view(lerp(z0, z1, ease(t / d)), cx, cy))

def Plate(name, screens=(), z0=1.0, z1=1.05, focus=None, base=None, hole_args=None, push=None):
    """screens: list of (hole_index, photo_key, on_at_seconds, style). push=(hole_index, t0, t1, key) pushes into a screen."""
    hs = holes(name, **(hole_args or {}))
    fx, fy = focus if focus else (W / 2, H / 2)
    def fn(t, d, T):
        c = (base() if base else np.asarray(art(name), np.float32)).copy()
        for hi, key, on_at, style in screens:
            pw = 1.0 if on_at is None else clamp((t - on_at) / 0.35, 0, 1)
            if on_at is not None and t < on_at: continue
            c = put_screen(c, hs[hi], key, style, pw)
        view = zoom_view(lerp(z0, z1, ease(t / d)), fx, fy)
        if push:
            hi, t0, t1, key = push
            if t >= t0:
                q = ease((t - t0) / (t1 - t0)); x, y, w, h = hs[hi][2]
                sv = (x + w / 2 - w / 2, y + h / 2 - (w * 9 / 16) / 2, w, w * 9 / 16)
                view = lerp_rect(view, sv, q)
                img = view_frame(c, view)
                if q > 0.75:
                    img = Image.blend(img, render_photo(key, 0, "none", mode="crop"), ease((q - 0.75) / 0.25))
                return img
        return view_frame(c, view)
    return fn

def Seq(*parts):
    """Sub-sequence inside one shot: parts = (dur, fn). Durations are scaled to fill the shot."""
    def fn(t, d, T):
        tot = sum(p[0] for p in parts); acc = 0
        for i, (pd, f) in enumerate(parts):
            pd2 = pd / tot * d
            if t < acc + pd2 or i == len(parts) - 1: return f(t - acc, pd2, T)
            acc += pd2
    return fn

# ---------------------------------------------------------------- credits
CREDITS = [("THE STAR NAME", 84, GOLD), ("BIRTHDAY SPECIAL", 84, GOLD), ("", 40, CREAM),
           ("STARRING", 40, GOLD), ("STAR NAME", 70, CREAM), ("\"NICKNAME\"", 52, CREAM), ("", 40, CREAM),
           ("CO-STARRING", 40, GOLD), ("PARTNER", 70, CREAM), ("", 40, CREAM),
           ("FEATURING", 40, GOLD), ("KID", 70, CREAM), ("", 40, CREAM),
           ("THE GRANDKIDS", 40, GOLD), ("GRANDKID  •  GRANDKID  •  GRANDKID", 56, CREAM), ("GRANDKID  •  GRANDKID  •  GRANDKID", 56, CREAM), ("", 40, CREAM),
           ("CAMERA", 40, GOLD), ("THE FAMILY", 60, CREAM), ("", 40, CREAM),
           ("DIRECTOR", 40, GOLD), ("STAR NAME", 60, CREAM), ("77 YEARS EXPERIENCE", 40, CREAM), ("", 40, CREAM),
           ("NO PUMPKINS WERE HARMED", 40, CREAM), ("IN THE MAKING OF THIS SPECIAL", 40, CREAM)]

@functools.lru_cache(None)
def credits_strip():
    hgt = int(sum(sz * 1.45 for _, sz, _ in CREDITS)) + 40
    im = Image.new("RGBA", (1000, hgt), (0, 0, 0, 0)); d = ImageDraw.Draw(im); y = 20
    for txt, sz, col in CREDITS:
        if txt: d.text((500, y + sz * 0.7), txt, font=font(SLAB if sz >= 52 else OSW, sz), fill=(*col, 255), anchor="mm")
        y += sz * 1.45
    return im

def Credits(final_at):
    """Scrolling credits on the closing-studio plate, then the birthday card from final_at (local seconds)."""
    def fn(t, d, T):
        bg = extent(art("08_Closing_Studio.png"), zoom_view(lerp(1.0, 1.06, t / d), W * 0.45, H * 0.5))
        if t < final_at:
            st = credits_strip(); y = int(lerp(H + 20, -st.height + 200, t / final_at))
            bg.paste(st, (860, y), st)
            return bg
        k = ease((t - final_at) / 0.8)
        bg = fade(bg, lerp(1, 0.45, k)); d_ = ImageDraw.Draw(bg)
        a = int(255 * k)
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ld = ImageDraw.Draw(layer)
        ld.text((W / 2, 400), "HAPPY 77th BIRTHDAY,", font=font(SLAB, 104), fill=(*CREAM, a), anchor="mm", stroke_width=4, stroke_fill=(*NAVY, a))
        ld.text((W / 2, 580), "NICKNAME!", font=font(SLAB, 190), fill=(*GOLD, a), anchor="mm", stroke_width=6, stroke_fill=(*NAVY, a))
        ld.text((W / 2, 760), "WE LOVE YOU  •  THAT'S A WRAP", font=font(OSW, 54), fill=(*CREAM, a), anchor="mm")
        bg.paste(layer, (0, 0), layer)
        return bg
    return fn

# ---------------------------------------------------------------- living room cold open
def ColdOpen():
    lr = "01_Living_Room.png"; hs = holes(lr)
    tv = hs[0]; x, y, w, h = tv[2]
    def fn(t, d, T):
        c = np.asarray(art(lr), np.float32).copy()
        if t >= 1.0:
            pw = clamp((t - 1.0) / 0.35, 0, 1)
            bars = cv2.resize(np.asarray(bars_img(), np.float32), quad_size(tv[0]))
            if pw < 1: bars = np.minimum(bars * (1 + 2 * (1 - pw)) + 70 * (1 - pw), 255) * (np.abs(np.arange(bars.shape[0]) - bars.shape[0] / 2) <= max(0.01, ease(pw)) * bars.shape[0] / 2)[:, None, None]
            qw, qh = quad_size(tv[0]); M = cv2.getPerspectiveTransform(np.float32([[0, 0], [qw, 0], [qw, qh], [0, qh]]), tv[0])
            wp = cv2.warpPerspective(bars.astype(np.float32), M, (W, H)); m = tv[1][..., None]
            c = c * (1 - m) + wp * m
        q = ease((t - 1.3) / 1.3)
        sv = (x + w / 2 - w / 2, y + h / 2 - (w * 9 / 16) / 2, w, w * 9 / 16)
        img = view_frame(c, lerp_rect((0, 0, W, H), sv, q))
        if q > 0.8: img = Image.blend(img, bars_img(), ease((q - 0.8) / 0.2))
        return fade(img, ease(t / 0.4))
    return fn

def Clapper(take, clap_at):
    def fn(t, d, T):
        img = extent(Image.fromarray(np.clip(slate(take), 0, 255).astype(np.uint8)), zoom_view(lerp(1.0, 1.05, t / d), W / 2, H * 0.55))
        if t >= clap_at:
            k = (t - clap_at)
            if k < 0.1: img = extent(img, (8 * math.sin(k * 120), 6, W - 16, H - 12))
            img = flash(img, 1 - k / 0.12)
        return img
    return fn

# ---------------------------------------------------------------- TIMELINE
# (film_start, film_end, shot_fn, crossfade_in_seconds)
T = []
SRC = {}
def add(a, b, fn, x=0.0):
    import inspect
    ctx = inspect.getframeinfo(inspect.currentframe().f_back).code_context
    SRC[id(fn)] = ctx[0].strip() if ctx else ""
    T.append((a, b, fn, x))
O = []   # overlays: (film_start, film_end, fn(frame, local_t, dur, abs_t))
def ov(a, b, fn): O.append((a, b, fn))

def S1(n): return f1(D1[n])   # film time of song-1 bar n
def S2(n): return f2(D2[n])

# Cold open (no music)
add(0.0, 2.9, ColdOpen())
add(2.9, 3.5, Bars())
add(3.5, COLD, Clapper(1, 1.4))

# Song 1 part A. Line times marked by the user from the preview (song time): verse 1 at 18.6,
# "Camera on his shoulder" ~20-22.6, "count it down... three, two" at 35.6; chorus 1 = bar 19.
V1 = 18.6; CD1 = 35.6; CD2 = 116.3          # verse 1 start, countdowns (song time)
# Intro: ON AIR studio + title (title sits low, clear of the star's face), then the edit bay "chapters"
add(f1(0), S1(6), Card(lambda: art("on_air_studio.png"), 1.0, 1.06, W * 0.5, H * 0.4))
ov(f1(D1[1]), S1(6), lambda fr, t, d, T: title_overlay(fr, [("THE STAR NAME", 92, CREAM), ("BIRTHDAY SPECIAL", 92, GOLD)], t / 0.5, y0=835))
DESK = dict(region=(250, 50, 1650, 1000))
add(S1(6), f1(V1), Plate("edit_bay.png", [(0, "b01_04", 0.4, "crt")], 1.0, 1.25, (690, 850), base=edit_bay_plate))
# Verse 1
add(f1(V1), f1(21.0), Plate("03_Desk_Photo.png", [(0, "young", None, "print")], 1.0, 1.10, (W * 0.43, H * 0.4), hole_args=DESK))
add(f1(21.0), f1(23.4), Card(lambda: art("cameraman.png"), 1.0, 1.08, W * 0.45, H * 0.4))
CR = [(i, k, 0.2 + 0.25 * i, "crt") for i, k in enumerate(["p06", "b01_06", "b02_07", "b03_05", "p07", "b02_02", "b06_07", "b03_16"])]
add(f1(23.4), f1(31.7), Plate("control_room.png", CR, 1.0, 1.04, (W * 0.6, H * 0.35), hole_args=dict(thresh=8, minarea=15000, region=(700, 0, 1920, 660)),
                       push=(0, 5.6, 7.4, "p06")))
add(f1(31.7) - 0.75, f1(31.7), Photo("p06", "none"))
# Pre-chorus 1: slate, clap on "count it down", leader 3-2 into the chorus
add(f1(31.7), f1(CD1), Clapper(2, 99))
ov(f1(CD1), f1(CD1) + 0.15, lambda fr, t, d, T: flash(fr, 1 - t / 0.15))
add(f1(CD1), f1(CD1) + 1.18, Leader(3)); add(f1(CD1) + 1.18, S1(19) - 0.25, Leader(2)); add(S1(19) - 0.25, S1(19), Black())
# Chorus 1 (bars 19-26)
add(S1(19), S1(21), Plate("demo_reel.png", [(0, "p03", 0.3, "crt")], 1.0, 1.08, (W * 0.6, H * 0.3)))
add(S1(21), S1(23), Photo("b05_16", "in"))
ov(S1(21), S1(23), lambda fr, t, d, T: viewfinder(fr, T))
cut = (S1(25) - S1(23)) / 3
add(S1(23), S1(23) + cut, Photo("b01_06", "in")); add(S1(23) + cut, S1(23) + 2 * cut, Photo("b03_08", "in")); add(S1(23) + 2 * cut, S1(25), Photo("b07_04", "in", mode="crop"))
add(S1(25), S1(27), Photo("b01_04", "in"))
ov(S1(25) - 0.25, S1(25) + 0.25, lambda fr, t, d, T: stripe_wipe(fr, t / d))
# Verse 2 (bars 27-34)
add(S1(27), S1(29), Photo("p01", "in", mode="crop", anchor=0.35))
add(S1(29), S1(30), Photo("b04_04", "in", mode="fit")); add(S1(30), S1(31), Photo("b04_05", "in", mode="crop", focus=(0.62, 0.55)))
ov(S1(31) - 0.35, S1(31) - 0.2, lambda fr, t, d, T: flash(fr, 1 - t / 0.15))
pk = (S1(33) - S1(31)) / 3
add(S1(31), S1(31) + pk, Photo("b03_09", "none", anchor=0.62)); add(S1(31) + pk, S1(31) + 2 * pk, Photo("b03_10", "none", anchor=0.62)); add(S1(31) + 2 * pk, S1(33), Photo("b03_11", "in", anchor=0.62))
add(S1(33), S1(34), Photo("b03_07", "in")); add(S1(34), S1(35), Photo("b07_07", "in", mode="fit"))
# Turnaround: take 1/2/3 gag (bars 35-36)
tk = (S1(37) - S1(35)) / 3
for i, (k, lab) in enumerate([("b05_02", "TAKE 1"), ("b05_03", "TAKE 2"), ("b05_04", "TAKE 3 - PRINT IT!")]):
    add(S1(35) + i * tk, S1(35) + (i + 1) * tk, Photo(k, "none"))
    ov(S1(35) + i * tk, S1(35) + (i + 1) * tk, (lambda lab: lambda fr, t, d, T: take_tag(fr, lab))(lab))
# Chorus 2 (bars 37-44)
add(S1(37), S1(39), Photo("b03_16", "in"))
ov(S1(37) - 0.25, S1(37) + 0.25, lambda fr, t, d, T: stripe_wipe(fr, t / d))
add(S1(39), S1(41), Photo("b04_13", "in"))
c3 = (S1(43) - S1(41)) / 3
add(S1(41), S1(41) + c3, Photo("b04_03", "in")); add(S1(41) + c3, S1(41) + 2 * c3, Photo("b03_12", "in")); add(S1(41) + 2 * c3, S1(43), Photo("b03_14", "in"))
add(S1(43), S1(45), Photo("b05_09", "in"))
# Verse 3: NYC + shenanigans (bars 45-52)
add(S1(45), S1(46), Card(lambda: art("new_york.png"), 1.0, 1.06)); add(S1(46), S1(47), Photo("b02_12", "in"))
add(S1(47), S1(48), Photo("b02_14", "in")); add(S1(48), S1(49), Photo("b02_11", "in"))
add(S1(49), S1(51), Photo("b02_05", "in", zoom=1.15))
add(S1(51), S1(52), Photo("b06_13", "in", mode="fit")); add(S1(52), S1(53), Photo("b06_14", "in", mode="fit"))
# Pre-chorus 2, countdown over the drum fill, cut to the break on the bar-58 downbeat
add(S1(53), S1(55), Plate("05_VHS_Case.png", [(0, "b02_10", 0.3, "crt"), (1, "p05", None, "print")], 1.0, 1.06, (W * 0.45, H * 0.45), base=vhs_plate))
add(S1(55), f1(CD2), Clapper(3, 99))
ov(f1(CD2), f1(CD2) + 0.15, lambda fr, t, d, T: flash(fr, 1 - t / 0.15))
add(f1(CD2), f1(CD2) + 1.18, Leader(3)); add(f1(CD2) + 1.18, f1(S1_CUT), Leader(2))
add(f1(S1_CUT), S2_AT, Card(lambda: u8(bumper_plate(("WE'LL BE RIGHT BACK",))), 1.0, 1.04))

# Song 2: Hold the Frame (crossfades)
X = 0.9
add(f2(0), S2(7), Plate("03_Desk_Photo.png", [(0, "young", None, "print")], 1.0, 1.10, (W * 0.43, H * 0.4),
                        push=(0, 14.5, 19.5, "young"), hole_args=DESK))
ov(f2(0), f2(1.5), lambda fr, t, d, T: fade(fr, ease(t / d)))
add(S2(7), S2(9), Plate("02_Two_Photo_Card.png", [(0, "young", 0.0, "print"), (1, "b02_09", 1.6, "print")], 1.0, 1.04, base=card_plate), X)
add(S2(9), S2(10), Photo("b03_06", "in"), X); add(S2(10), S2(11), Photo("b07_05", "in"), X)
add(S2(11), S2(13), Plate("triptych.png", [(0, "p03", 0.4, "print"), (1, "b03_08", 1.4, "print"), (2, "b05_16", 2.4, "print")], 1.0, 1.04), X)
for i, k in enumerate(["b06_09", "b05_16", "b01_11", "b04_08"]):
    add(S2(13 + 2 * i), S2(15 + 2 * i), Photo(k, "in" if i % 2 == 0 else "out"), X)
ov(S2(13), S2(21), lambda fr, t, d, T: pause_osd(fr) if (t % 6.9) < 2.2 else fr)
add(S2(21), S2(21) + (S2(23) - S2(21)) / 2, Photo("b02_01", "in"), X); add(S2(21) + (S2(23) - S2(21)) / 2, S2(23), Photo("b02_03", "in"), X)
add(S2(23), S2(25), Photo("b04_12", "in"), X)
add(S2(25), S2(27), Photo("b04_15", "in"), X); add(S2(27), S2(29), Photo("b04_16", "in", zoom=1.12), X)
add(S2(29), S2(31), Card(lambda: art("cameraman.png"), 1.0, 1.10, W * 0.45, H * 0.4), X)
add(S2(31), S2(33), Plate("01_Living_Room.png", [(0, "b04_10", 0.5, "crt")], 1.0, 1.10, (W * 0.5, H * 0.3)), X)
add(S2(33), S2(35), Photo("p10", "in"), X)
ov(S2(33), S2(35), lambda fr, t, d, T: viewfinder(fr, T))
add(S2(35), S2(37), Card(lambda: art("on_air_studio.png"), 1.0, 1.15, W * 0.5, H * 0.42), X)
for i, k in enumerate(["p07", "b03_05", "b02_07", "b02_02"]):
    add(S2(37 + 2 * i), S2(39 + 2 * i), Photo(k, "in" if i % 2 == 0 else "out"), X)
add(S2(45), f2(S2_LEN), Photo("b07_05", "in", zoom=1.05, anchor=0.62), X)   # reviewer swapped this photo in
ov(f2(S2_LEN - 3.2), f2(S2_LEN), lambda fr, t, d, T: crt_off(fr, t / d))

# Song 1 part B: "and we're back", break montage, bridge, finale, credits
add(S1B_AT - 0.5, S1B_AT, Black())
add(S1(58), S1(59), Card(lambda: u8(bumper_plate(("AND WE'RE BACK!",))), 1.05, 1.0))
for i, k in enumerate(["b02_15", "b06_11", "b03_15", "b01_15", "b01_08", "b04_02", "b03_02"]):
    add(S1(59 + i), S1(60 + i), Photo(k, "in"))
add(S1(66), S1(70), Photo("p04", "in", zoom=1.05))
ov(S1(66) + 0.8, S1(70) - 0.3, lambda fr, t, d, T: lower_third(fr, "STAR NAME", "NOW TRAINING HIS UNDERSTUDIES", t / 0.45, (t - d + 0.45) / 0.4))
NM = [(i, k, 0.3 + 0.45 * i if i < 4 else (S1(72) - S1(70)) + 0.3 + 0.35 * (i - 4), "crt")
      for i, k in enumerate(["b03_13", "b02_16", "b05_08", "b06_01", "b06_05", "b01_13", "b03_04", "b05_10", "b06_12"])]
add(S1(70), S1(74), Plate("04_Nine_Monitors.png", NM, 1.0, 1.04))
ov(S1(70), S1(72), lambda fr, t, d, T: caption_strip(fr, "GRANDKID  •  GRANDKID  •  GRANDKID", t / 0.3))
ov(S1(72), S1(74), lambda fr, t, d, T: caption_strip(fr, "GRANDKID  •  GRANDKID  •  GRANDKID", t / 0.3))
add(S1(74), S1(75), Photo("b07_01", "in", anchor=0.62)); add(S1(75), S1(76), Card(big77, 1.08, 1.0))
ov(S1(75), S1(75) + 0.12, lambda fr, t, d, T: flash(fr, 1 - t / 0.12))
add(S1(76), S1(78), Photo("b06_07", "in"))
m8 = ["b01_16", "b02_04", "b03_01", "b03_03", "b05_05", "b04_06", "b07_03", "b06_16"]; mm = (S1(80) - S1(78)) / 8
for i, k in enumerate(m8): add(S1(78) + i * mm, S1(78) + (i + 1) * mm, Photo(k, "none"))
add(S1(80), S1(82), Photo("b02_06", "in"))
add(S1(82), S1(84), Card(lambda: Image.fromarray(np.clip(wrap_plate(), 0, 255).astype(np.uint8)), 1.0, 1.06, W * 0.5, H * 0.55))
ov(S1(82) - 0.25, S1(82) + 0.25, lambda fr, t, d, T: stripe_wipe(fr, t / d))
END_FILM = f1(S1_END)
add(S1(84), END_FILM, Credits(final_at=(S1(92) - S1(84))))
ov(END_FILM - 1.2, END_FILM, lambda fr, t, d, T: fade(fr, 1 - ease(t / d)))
add(END_FILM, DUR, Black())

# ---------------------------------------------------------------- frame assembly
def frame_at(Tm):
    act = [s for s in T if s[0] <= Tm < s[1]]
    if not act: return Image.new("RGB", (W, H))
    act.sort(key=lambda s: s[0])
    a, b, fn, x = act[0]; img = fn(Tm - a, b - a, Tm)
    for a, b, fn, x in act[1:]:
        top = fn(Tm - a, b - a, Tm)
        k = 1.0 if x <= 0 else ease((Tm - a) / x)
        img = top if k >= 1 else Image.blend(img, top, k)
    # extend crossfaded shots: a shot with crossfade-in x starts x early so the outgoing one keeps playing
    for a, b, fn in O:
        if a <= Tm < b: img = fn(img, Tm - a, b - a, Tm)
    return img

# shots with crossfade start early by their crossfade length (outgoing shot stays under them)
# a crossfade of x seconds is centred on the cut: incoming starts x/2 early, outgoing runs x/2 late
T.sort(key=lambda s: s[0])
T2 = list(T)
for i in range(len(T)):
    a, b, fn, x = T[i]
    if i + 1 < len(T) and T[i + 1][3]: b = max(b, T[i + 1][0] + T[i + 1][3] / 2)
    if x: a = a - x / 2
    T2[i] = (a, b, fn, x)
T = T2

if __name__ == "__main__":
    mode = sys.argv[2]
    if mode == "cues":
        import re, csv
        def song_pos(t):
            if t < COLD: return "cold open", ""
            if t < S2_AT - BUMP: return "song 1", f"{t - COLD:6.2f}"
            if t < S2_AT: return "break bumper", ""
            if t < S2_AT + S2_LEN: return "song 2", f"{t - S2_AT:6.2f}"
            if t < S1B_AT: return "gap", ""
            return "song 1", f"{t - S1B_AT + S1B_FROM:6.2f}"
        w = csv.writer(open(f"{S}/out/cue_sheet.csv", "w", newline=""))
        w.writerow(["film_in", "film_out", "music", "song_time", "shot (timeline code)"])
        for a, b, fn, x in sorted(T, key=lambda r: r[0]):
            m, st = song_pos(a + 0.01)
            w.writerow([f"{int(a // 60)}:{a % 60:05.2f}", f"{int(b // 60)}:{b % 60:05.2f}", m, st, SRC.get(id(fn), "")])
        print("cue sheet rows", len(T))
    if mode == "info":
        print(f"duration {DUR:.2f}s ({int(DUR // 60)}:{DUR % 60:05.2f}); shots {len(T)}; song2 at {S2_AT:.2f}; part B at {S1B_AT:.2f}")
    elif mode == "stills":
        os.makedirs(f"{S}/work/stills", exist_ok=True)
        for ts in sys.argv[3:]:
            frame_at(float(ts)).save(f"{S}/work/stills/f_{float(ts):07.2f}.jpg", quality=85)
    elif mode == "frames":
        import subprocess
        a, b, out = float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
        ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                               "-c:v", "libx264", "-preset", "veryfast", "-crf", "14", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
        n0, n1 = int(round(a * FPS)), int(round(b * FPS))
        for i in range(n0, n1):
            ff.stdin.write(frame_at(i / FPS).tobytes())
            if (i - n0) % 150 == 0: print(f"{out[-12:]} {i - n0}/{n1 - n0}", flush=True)
        ff.stdin.close(); ff.wait(); print("done", out, ff.returncode, flush=True)
