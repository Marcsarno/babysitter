"""Look test (short style proof) for a family film. Names below are placeholders.

Renders 1920x1080 @30fps frames with Pillow/numpy, pipes them to ffmpeg,
then muxes a synthesized broadcast soundtrack (bars tone, 2-pop, CRT sounds).
Usage: python3 -I render_looktest.py <scratchpad_dir> <out.mp4>
"""
import sys, json, math, subprocess, wave
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter

S = sys.argv[1]
OUT = sys.argv[2]
W, H, FPS = 1920, 1080, 30
MEDIA, FONTS = f"{S}/media", f"{S}/fonts"
FACES = json.load(open(f"{S}/work/faces.json"))

def font(name, size): return ImageFont.truetype(f"{FONTS}/{name}", size)
SLAB, OSW, OSW_R, VT = "roboto-slab-latin-700-normal.woff", "oswald-latin-700-normal.woff", "oswald-latin-400-normal.woff", "vt323-latin-400-normal.woff"

def ease(x): x = min(max(x, 0.0), 1.0); return x * x * (3 - 2 * x)
def lerp(a, b, t): return a + (b - a) * t
def lerp_rect(a, b, t): return tuple(lerp(p, q, t) for p, q in zip(a, b))

# ---------- assets ----------
def load_art(name):
    return Image.open(f"{MEDIA}/art/{name}").convert("RGB").resize((W, H), Image.LANCZOS)

def screen_masks(name):
    """Blank (near-black) regions of an art plate -> list of (rect, soft mask) in 1920x1080 coords."""
    im = cv2.imread(f"{MEDIA}/art/{name}"); im = cv2.resize(im, (W, H), interpolation=cv2.INTER_AREA)
    m = (cv2.cvtColor(im, cv2.COLOR_BGR2GRAY) < 18).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    out = []
    for i in range(1, n):
        if st[i][4] < 50000: continue
        cnts, _ = cv2.findContours((lab == i).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        hull = cv2.convexHull(cnts[0]); mk = np.zeros((H, W), np.uint8); cv2.fillPoly(mk, [hull], 255)
        mk = cv2.dilate(mk, np.ones((3, 3), np.uint8))  # cover the anti-aliased edge
        mk = cv2.GaussianBlur(mk, (3, 3), 0)
        x, y, w, h = st[i][:4]
        out.append(((float(x), float(y), float(w), float(h)), Image.fromarray(mk)))
    return sorted(out, key=lambda r: r[0][0])

def load_photo(name):
    return Image.open(f"{MEDIA}/photos/{name}").convert("RGB")

def face_crop(name, aspect, src_size, anchor=0.42, widen=None):
    """Largest crop of given aspect that keeps every detected face inside, faces placed near `anchor` height."""
    sw, sh = src_size
    boxes = [f["bbox"] for f in FACES[name]]
    fx0 = min(b[0] for b in boxes); fx1 = max(b[2] for b in boxes)
    fy0 = min(b[1] for b in boxes); fy1 = max(b[3] for b in boxes)
    cw = min(sw, sh * aspect); ch = cw / aspect
    cx = min(max((fx0 + fx1) / 2 - cw / 2, 0), sw - cw)
    cy = min(max((fy0 + fy1) / 2 - ch * anchor, 0), sh - ch)
    return (cx, cy, cw, ch)

def extent(img, rect, size=(W, H), resample=Image.BICUBIC):
    x, y, w, h = rect
    return img.transform(size, Image.EXTENT, (x, y, x + w, y + h), resample)

# ---------- CRT screen compositing ----------
def crt_frame(art, scr_rect, scr_mask, src, src_rect, view, crt=1.0, power=1.0, bright=1.0):
    """Render `art` seen through `view` (art coords) with `src` (crop src_rect) displayed in the screen.
    crt: 0..1 strength of scanlines/glow; power: 0..1 CRT turn-on/off (vertical open)."""
    vx, vy, vw, vh = view
    base = np.asarray(extent(art, view), np.float32)
    mask = np.asarray(extent(scr_mask, view, resample=Image.BILINEAR), np.float32)[..., None] / 255.0
    sx, sy, sw, sh = scr_rect; px, py, pw, ph = src_rect
    # output pixel -> art coords -> source coords (linear), so content is sub-pixel exact
    ax0, ay0 = vx, vy; ax1, ay1 = vx + vw, vy + vh
    def a2s(ax, ay): return (px + (ax - sx) / sw * pw, py + (ay - sy) / sh * ph)
    s0 = a2s(ax0, ay0); s1 = a2s(ax1, ay1)
    content = np.asarray(src.transform((W, H), Image.EXTENT, (*s0, *s1), Image.BICUBIC), np.float32)
    if crt > 0:
        ys = np.arange(H, dtype=np.float32)
        line = ((vy + ys / H * vh) - sy) / (sh / 260.0)          # ~260 visible scanlines
        scan = 1.0 - 0.22 * crt * (0.5 + 0.5 * np.cos(2 * np.pi * line))
        small = cv2.resize(content, (W // 8, H // 8), interpolation=cv2.INTER_AREA)
        glow = cv2.resize(cv2.GaussianBlur(small, (0, 0), 3), (W, H))
        content = content * scan[:, None, None] + glow * 0.18 * crt
        content = content * (1 + 0.06 * crt)
        # gentle chroma fringe
        sh_px = max(1, int(2 * crt * W / vw))
        content[:, sh_px:, 0] = content[:, :-sh_px, 0] * 0.5 + content[:, sh_px:, 0] * 0.5
    if power < 1.0:  # turn-on: bright line opening vertically
        cy_art = sy + sh / 2
        half = max(0.004, ease(power)) * sh / 2
        yart = vy + np.arange(H, dtype=np.float32) / H * vh
        open_ = (np.abs(yart - cy_art) <= half).astype(np.float32)[:, None, None]
        flash = 1 + 2.5 * (1 - ease(power))
        content = np.minimum(content * flash + 60 * (1 - power), 255) * open_
    content = np.clip(content * bright, 0, 255)
    return Image.fromarray(np.clip(base * (1 - mask) + content * mask, 0, 255).astype(np.uint8))

# ---------- generators ----------
def smpte_bars():
    im = Image.new("RGB", (W, H)); d = ImageDraw.Draw(im)
    top = [(191,191,191),(191,191,0),(0,191,191),(0,191,0),(191,0,191),(191,0,0),(0,0,191)]
    mid = [(0,0,191),(19,19,19),(191,0,191),(19,19,19),(0,191,191),(19,19,19),(191,191,191)]
    bw = W / 7
    for i, c in enumerate(top): d.rectangle([i*bw, 0, (i+1)*bw, H*0.67], fill=c)
    for i, c in enumerate(mid): d.rectangle([i*bw, H*0.67, (i+1)*bw, H*0.75], fill=c)
    x = 0
    for c, wmul in [((0,33,76),1.25),((255,255,255),1.25),((50,0,106),1.25),((19,19,19),1.25)]:
        d.rectangle([x, H*0.75, x+bw*wmul, H], fill=c); x += bw*wmul
    for c in [(9,9,9),(19,19,19),(29,29,29)]:
        d.rectangle([x, H*0.75, x+bw/3, H], fill=c); x += bw/3
    d.rectangle([x, H*0.75, W, H], fill=(19,19,19))
    f = font(VT, 64); txt = "STAR'S BIRTHDAY SPECIAL"
    tw = d.textlength(txt, font=f)
    d.rectangle([W/2-tw/2-30, 300, W/2+tw/2+30, 400], fill=(0,0,0))
    d.text((W/2, 350), txt, font=f, fill=(235,235,235), anchor="mm")
    return im

def leader(num, frac):
    im = Image.new("RGB", (W, H), (150,150,150)); d = ImageDraw.Draw(im)
    cx, cy, r = W/2, H/2, 430
    ang = -90 + 360 * frac
    d.pieslice([cx-r*1.6, cy-r*1.6, cx+r*1.6, cy+r*1.6], -90, ang, fill=(95,95,95))
    d.line([0, cy, W, cy], fill=(40,40,40), width=4); d.line([cx, 0, cx, H], fill=(40,40,40), width=4)
    for rr, wd in [(r, 10), (r-40, 6)]:
        d.ellipse([cx-rr, cy-rr, cx+rr, cy+rr], outline=(245,245,245), width=wd)
    d.text((cx, cy+10), str(num), font=font(OSW_R, 560), fill=(15,15,15), anchor="mm")
    return im

def stripe_wipe(a, b, t):
    """Retro diagonal stripe wipe (red/gold/cream bands from the art) from a to b."""
    A = np.asarray(a, np.float32); B = np.asarray(b, np.float32)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = xx + (H - yy) * 0.55                      # slanted coordinate
    lead = lerp(-600, W + H * 0.55 + 600, ease(t))
    out = np.where((d < lead - 420)[..., None], B, A)
    for k, col in enumerate([(240,222,186), (196,154,60), (160,28,38)]):
        band = (d >= lead - 420 + k*140) & (d < lead - 420 + (k+1)*140)
        out[band] = col
    return Image.fromarray(out.astype(np.uint8))

def vhs_glitch(img, amt, seed):
    rng = np.random.default_rng(seed); a = np.asarray(img).copy()
    n = int(14 * amt) + 1
    for _ in range(n):
        y = rng.integers(0, H - 40); h = rng.integers(6, 50); s = int(rng.integers(-90, 90) * amt)
        a[y:y+h] = np.roll(a[y:y+h], s, axis=1)
    a[..., 0] = np.roll(a[..., 0], int(10 * amt), axis=1)
    noise = rng.normal(0, 40 * amt, (H, W, 1))
    return Image.fromarray(np.clip(a + noise, 0, 255).astype(np.uint8))

LT = Image.open(f"{MEDIA}/art/lower_third.png").convert("RGBA").resize((W, H), Image.LANCZOS)
def lower_third(frame, name, sub, t_in, t_out, t):
    if t < t_in or t > t_out + 0.5: return frame
    p_in = ease((t - t_in) / 0.45); p_out = ease((t - t_out) / 0.4)
    layer = LT.copy(); d = ImageDraw.Draw(layer)
    d.text((395, 862), name, font=font(SLAB, 76), fill=(250,242,225), anchor="lm")
    d.text((395, 962), sub, font=font(OSW, 40), fill=(250,236,200), anchor="lm")
    reveal = int(lerp(0, W, p_in) * (1 - p_out))
    m = Image.new("L", (W, H), 0); ImageDraw.Draw(m).rectangle([0, 0, reveal, H], fill=255)
    a = Image.fromarray((np.asarray(layer.getchannel("A"), np.float32) * np.asarray(m, np.float32) / 255).astype(np.uint8))
    out = frame.copy(); out.paste(layer.convert("RGB"), (0, 0), a); return out

def fade(img, k): return Image.fromarray((np.asarray(img, np.float32) * k).astype(np.uint8))

# ---------- build plates ----------
DEMO = load_art("demo_reel.png"); DEMO_SCR = screen_masks("demo_reel.png")[0]
MON = load_art("monitor.png"); MON_SCR = screen_masks("monitor.png")[0]
TRIP = load_art("triptych.png"); TRIP_HOLES = screen_masks("triptych.png")

P_BACK = "p04_fb6cf235.jpg"; back = load_photo(P_BACK)
F_BACK = face_crop(P_BACK, 16/9, back.size, anchor=0.40)            # final full-screen 16:9 crop
def tall_crop(final, aspect, size):                                  # same width, taller, centred on final
    x, y, w, h = final; nh = min(size[1], w / aspect); ny = min(max(y + h/2 - nh/2, 0), size[1] - nh)
    return (x, ny, w, nh)
dsr = DEMO_SCR[0]; S_BACK = tall_crop(F_BACK, dsr[2] / dsr[3], back.size)

P_FAM = "p06_7dcddb3d.jpg"; fam = load_photo(P_FAM)
msr = MON_SCR[0]; S_FAM = face_crop(P_FAM, msr[2] / msr[3], fam.size, anchor=0.45)

TRIP_PICS = []
for nm in ["p03_c246afc8.jpg", "p09_180c1223.jpg", "p07_5f7a35f8.jpg"]:
    im = load_photo(nm)
    TRIP_PICS.append((im, nm))
def triptych_frame(t_local, zoom):
    base = TRIP.copy()
    for i, ((rect, mk), (im, nm)) in enumerate(zip(TRIP_HOLES, TRIP_PICS)):
        x, y, w, h = rect; p = ease((t_local - 0.15 - i * 0.3) / 0.35)
        if p <= 0: continue
        cr = face_crop(nm, w / h, im.size, anchor=0.38)
        s = lerp(1.06, 1.0, p)
        cw, ch = cr[2] / s, cr[3] / s; cr2 = (cr[0] + (cr[2]-cw)/2, cr[1] + (cr[3]-ch)/2, cw, ch)
        tile = extent(im, cr2, (int(w)+2, int(h)+2))
        hole_mask = mk.crop((int(x)-1, int(y)-1, int(x)+int(w)+1, int(y)+int(h)+1))
        alpha = Image.fromarray((np.asarray(hole_mask, np.float32) * p).astype(np.uint8))
        base.paste(tile, (int(x)-1, int(y)-1), alpha)
    vw = W / zoom; vh = H / zoom
    return extent(base, ((W - vw)/2, (H - vh)/2, vw, vh))

# ---------- timeline ----------
T = dict(bars=(0.0, 2.0), lead3=(2.0, 3.0), lead2=(3.0, 3.25), black=(3.25, 3.75),
         demo=(3.75, 8.0), push=(8.0, 9.3), back=(9.3, 12.8), wipe=(12.8, 13.45),
         trip=(13.45, 17.4), glitch=(17.4, 17.9), mon=(17.9, 21.3), end=(21.3, 21.8))
DUR = T["end"][1]
full = (0.0, 0.0, float(W), float(H))
sx, sy, sw, sh = DEMO_SCR[0]
def zoom_toward(cx, cy, z):
    vw, vh = W / z, H / z
    return (min(max(cx - vw/2, 0), W - vw), min(max(cy - vh/2, 0), H - vh), vw, vh)
V_DEMO_END = zoom_toward(sx + sw/2, sy + sh/2, 1.07)
V_SCREEN = (sx, sy + sh/2 - sw/(16/9)/2, sw, sw/(16/9))        # 16:9 view filling the screen exactly
mx, my, mw, mh = MON_SCR[0]

def frame_at(t):
    if t < T["bars"][1]: return smpte_bars()
    if t < T["lead3"][1]: return leader(3, (t - 2.0))
    if t < T["lead2"][1]: return leader(2, (t - 3.0) / 1.0)
    if t < T["black"][1]: return Image.new("RGB", (W, H))
    if t < T["demo"][1]:
        lt = t - T["demo"][0]
        view = lerp_rect(full, V_DEMO_END, ease(lt / 4.25))
        power = 0.0 if lt < 1.0 else min(1.0, (lt - 1.0) / 0.45)
        img = crt_frame(DEMO, DEMO_SCR[0], DEMO_SCR[1], back, S_BACK, view, crt=1.0, power=power if lt >= 1.0 else 0.0001,
                        bright=1.0 if lt >= 1.0 else 0.0)
        return fade(img, ease(lt / 0.5))
    if t < T["push"][1]:
        p = ease((t - T["push"][0]) / (T["push"][1] - T["push"][0]))
        view = lerp_rect(V_DEMO_END, V_SCREEN, p)
        img = crt_frame(DEMO, DEMO_SCR[0], DEMO_SCR[1], back, S_BACK, view, crt=1.0 - p)
        q = ease((p - 0.8) / 0.2)                     # hide the bezel sliver as the screen fills frame
        if q > 0:
            (sx_, sy_, sw_, sh_), (px, py, pw, ph) = DEMO_SCR[0], S_BACK
            vx, vy, vw, vh = view
            rect = (px + (vx - sx_) / sw_ * pw, py + (vy - sy_) / sh_ * ph, vw / sw_ * pw, vh / sh_ * ph)
            img = Image.blend(img, extent(back, rect), q)
        return img
    if t < T["back"][1]:
        lt = t - T["back"][0]; z = lerp(1.0, 1.045, lt / 3.5)
        x, y, w, h = F_BACK; nw, nh = w / z, h / z
        img = extent(back, (x + (w - nw) * 0.45, y + (h - nh) * 0.5, nw, nh))
        return lower_third(img, "STAR NAME", "CAPTION GOES HERE", T["back"][0] + 0.5, T["back"][1] - 0.6, t)
    if t < T["wipe"][1]:
        x, y, w, h = F_BACK; z = 1.045; nw, nh = w / z, h / z
        a = extent(back, (x + (w - nw) * 0.45, y + (h - nh) * 0.5, nw, nh))
        return stripe_wipe(a, triptych_frame(0, 1.0), (t - T["wipe"][0]) / (T["wipe"][1] - T["wipe"][0]))
    if t < T["trip"][1]:
        lt = t - T["trip"][0]; return triptych_frame(lt, lerp(1.0, 1.035, lt / 4.0))
    if t < T["glitch"][1]:
        lt = (t - T["glitch"][0]) / 0.5
        src = triptych_frame(4.0, 1.035) if lt < 0.5 else crt_frame(MON, MON_SCR[0], MON_SCR[1], fam, S_FAM, full, power=0.0001, bright=0.0)
        return vhs_glitch(src, math.sin(math.pi * lt), int(t * 1000))
    if t < T["mon"][1]:
        lt = t - T["mon"][0]
        view = lerp_rect(full, zoom_toward(mx + mw/2, my + mh/2, 1.05), ease(lt / 3.4))
        on = min(1.0, max(0.0001, (lt - 0.2) / 0.45))
        off_t = lt - 2.7                                        # CRT switch-off at the end
        if off_t > 0:
            pw = max(0.0001, 1 - off_t / 0.35)
            return crt_frame(MON, MON_SCR[0], MON_SCR[1], fam, S_FAM, view, power=pw, bright=1.0 if pw > 0.01 else 0.0)
        return crt_frame(MON, MON_SCR[0], MON_SCR[1], fam, S_FAM, view, power=on, bright=1.0 if lt >= 0.2 else 0.0)
    lt = t - T["end"][0]
    view = zoom_toward(mx + mw/2, my + mh/2, 1.05)
    return fade(crt_frame(MON, MON_SCR[0], MON_SCR[1], fam, S_FAM, view, power=0.0001, bright=0.0), 1 - ease(lt / 0.5))

# ---------- audio ----------
SR = 48000
def audio():
    n = int(DUR * SR); a = np.zeros(n, np.float32); t = np.arange(n) / SR
    def put(start, sig): i = int(start * SR); a[i:i+len(sig)] += sig[:max(0, n-i)]
    tone = 0.1 * np.sin(2*np.pi*1000*np.arange(int(2.0*SR))/SR); tone[:480] *= np.linspace(0,1,480); tone[-480:] *= np.linspace(1,0,480)
    put(0.0, tone)
    pop = 0.25 * np.sin(2*np.pi*1000*np.arange(int(SR/24))/SR); put(3.0, pop)
    def crt_on():
        k = np.arange(int(0.35*SR))/SR
        thunk = 0.35*np.sin(2*np.pi*55*k)*np.exp(-k*14)
        hiss = np.random.default_rng(1).normal(0, 0.05, len(k)) * np.exp(-k*9)
        return (thunk + hiss).astype(np.float32)
    put(4.75, crt_on()); put(18.1, crt_on())
    gl = np.random.default_rng(2).normal(0, 0.12, int(0.5*SR)) * np.sin(np.linspace(0, np.pi, int(0.5*SR))); put(17.4, gl.astype(np.float32))
    k = np.arange(int(0.35*SR))/SR; zap = 0.18*np.sin(2*np.pi*(900 - 2200*k)*k)*np.exp(-k*6); put(20.6, zap.astype(np.float32))
    wipe_k = np.arange(int(0.65*SR))/SR; sw = np.random.default_rng(3).normal(0, 0.05, len(wipe_k)) * np.sin(np.pi*wipe_k/0.65); put(12.8, sw.astype(np.float32))
    a = np.clip(a, -1, 1)
    with wave.open(f"{S}/work/looktest_audio.wav", "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((a * 32767).astype(np.int16).tobytes())

if __name__ == "__main__":
    if len(sys.argv) > 3:  # still frames for checking: times given as extra args
        for ts in sys.argv[3:]:
            frame_at(float(ts)).save(f"{S}/work/still_{float(ts):05.2f}.jpg", quality=88)
        sys.exit()
    audio()
    nframes = int(DUR * FPS)
    ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-i", f"{S}/work/looktest_audio.wav", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
                           "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
                           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
    for i in range(nframes):
        ff.stdin.write(frame_at(i / FPS).tobytes())
        if i % 60 == 0: print(f"frame {i}/{nframes}", flush=True)
    ff.stdin.close(); ff.wait(); print("done", ff.returncode)
