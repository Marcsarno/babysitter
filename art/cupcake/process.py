"""Cut Arianna's Cupcakes art out of its background and save game-ready WebP files.

Usage: python3 -I art/cupcake/process.py

Put source pictures in art/cupcake/ named by their prompt code, e.g. A3-box.png, B4-ride.png,
C5-cat.png, S1-title.png, S2-icon.png. Character pictures (A, B, C) are cut out: the background
colour (white, or solid blue for Baxter) is sampled from the border, flood-filled from the edges,
and blocked by a slightly thickened outline so it cannot leak through gaps in fluffy fur.
Scenes (S1) are only resized; the icon (S2) also becomes the PNG home-screen icons.
Sheets with several poses side by side are split into one file per pose.
Writes public/cupcake/art/manifest.json, which tells the game what exists and which way it faces.
"""
from collections import deque
from pathlib import Path
import json
import re
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
PUBLIC = HERE.parent.parent / 'public' / 'cupcake'
OUT = PUBLIC / 'art'

# Character sheets: one output per figure, left to right.
SHEETS = {
    'A1-arianna-sheet.png': ['arianna-front', 'arianna-3q', 'arianna-side', 'arianna-back'],
    'B1-baxter-sheet.png': ['baxter-front', 'baxter-3q', 'baxter-side', 'baxter-back'],
}
# Which way each picture faces ('front', 'left' or 'right'); the game flips side views to match.
# The prompts ask A6, B3 and B4 to face left; fix an entry here if a picture came out the other way.
FACING = {
    'arianna-3q': 'right', 'arianna-side': 'right', 'baxter-3q': 'left', 'baxter-side': 'right',
    'a6-drive': 'left', 'b3-sniff': 'left', 'b4-ride': 'left',
    'a8-walk': 'right', 'b7-walk': 'right', 'v1-van-side': 'right', 'v2-van-top': 'right',
    'b8-run': 'right', 't13-car-blue': 'right', 't14-car-yellow': 'right', 't15-ducks': 'right',
}
# Target height by code prefix: characters, cupcake parts (I), baking tools (K), van (V), town map pieces (T),
# decorations (D), icons (U), feelings bubbles (E), number-line house fronts (H) and menu frames (P).
# Background scenes (BG, S1) are kept whole, not cut out.
HEIGHT = {'a': 720, 'b': 520, 'c': 600, 'i': 512, 'k': 600, 'v': 600, 't': 256, 'd': 400, 'u': 320, 'e': 256, 'h': 400, 'p': 600, 'r': 512, 'y': 400}


def dilate(mask, r):
    out = mask.copy()
    for _ in range(r):
        m = out.copy()
        m[1:] |= out[:-1]; m[:-1] |= out[1:]; m[:, 1:] |= out[:, :-1]; m[:, :-1] |= out[:, 1:]
        out = m
    return out


def flood(passable, seeds):
    h, w = passable.shape
    seen = np.zeros_like(passable)
    q = deque()
    for y, x in seeds:
        if passable[y, x] and not seen[y, x]:
            seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and passable[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    return seen


def cut(img, tol=34, seal=2):
    rgb = np.asarray(img.convert('RGB')).astype(np.float32)
    h, w, _ = rgb.shape
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    key = np.median(border, axis=0)
    dist = np.sqrt(((rgb - key) ** 2).sum(axis=2))
    near = dist < tol
    barrier = dilate(~near, seal)
    seeds = [(0, x) for x in range(w)] + [(h - 1, x) for x in range(w)] + \
            [(y, 0) for y in range(h)] + [(y, w - 1) for y in range(h)]
    bg = flood(near & ~barrier, seeds)
    for _ in range(seal):                      # take back the background the seal covered
        bg |= dilate(bg, 1) & near
    if key.max() - key.min() > 60:             # a coloured key never appears on the character,
        bg |= dist < tol * 0.8                 # so also clear pockets of it trapped inside fur
    # soft edge: pixels next to the background fade by how close they are to the key colour
    edge = dilate(bg, 1) & ~bg
    alpha = np.where(bg, 0.0, 1.0)
    soft = np.clip(dist / (tol * 2.2), 0, 1)
    alpha = np.where(edge, np.minimum(alpha, soft), alpha)
    a = np.maximum(alpha, 1e-3)[..., None]
    clean = np.clip((rgb - (1 - a) * key) / a, 0, 255)  # remove the background tint
    return Image.fromarray(np.dstack([clean, alpha * 255]).astype(np.uint8), 'RGBA')


def split(rgba, count):
    """Split side-by-side figures at the widest empty column gaps."""
    cols = np.asarray(rgba)[..., 3].max(axis=0) > 20
    runs, x = [], 0
    while x < len(cols):
        if cols[x]:
            s = x
            while x < len(cols) and cols[x]: x += 1
            runs.append([s, x])
        x += 1
    while len(runs) > count:                   # merge across the smallest gap
        gaps = [runs[i + 1][0] - runs[i][1] for i in range(len(runs) - 1)]
        i = int(np.argmin(gaps))
        runs[i:i + 2] = [[runs[i][0], runs[i + 1][1]]]
    return [rgba.crop((s, 0, e, rgba.height)) for s, e in runs]


def trim(rgba, pad=6):
    x0, y0, x1, y1 = Image.fromarray((np.asarray(rgba)[..., 3] > 8).astype(np.uint8) * 255).getbbox()
    return rgba.crop((max(0, x0 - pad), max(0, y0 - pad), min(rgba.width, x1 + pad), min(rgba.height, y1 + pad)))


def fit(img, height):
    return img.resize((round(img.width * height / img.height), height), Image.LANCZOS) if img.height > height else img


def save(img, name, quality=88):
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f'{name}.webp'
    img.save(path, 'WEBP', quality=quality, method=6)
    print(f'{path.relative_to(HERE.parent.parent)}  {img.width}x{img.height}  {path.stat().st_size // 1024} KB')


def main():
    made = []
    for src, names in SHEETS.items():
        p = HERE / src
        if not p.exists():
            continue
        for fig, name in zip(split(cut(Image.open(p)), len(names)), names):
            save(fit(trim(fig), HEIGHT[name[0]] if name[0] in HEIGHT else 720), name)
            made.append(name)
    for p in sorted(HERE.iterdir()):
        m = re.match(r'^((?:BG|[ABCSIKVTDUEHPRY])\d+)-([a-z0-9-]+)\.(png|jpe?g|webp)$', p.name, re.I)
        if not m or p.name in SHEETS:
            continue
        name = f'{m.group(1)}-{m.group(2)}'.lower()
        img = Image.open(p)
        if name.startswith('s1') or name.startswith('bg'):   # scenes: keep the whole picture
            save(fit(img.convert('RGB'), 1600), name, quality=84)
        elif name.startswith('s2'):            # app icon: square PNGs for home screens
            sq = img.convert('RGB')
            for size, fname in ((512, 'icon-512.png'), (192, 'icon-192.png'), (180, 'apple-touch-icon.png')):
                sq.resize((size, size), Image.LANCZOS).save(PUBLIC / fname)
                print(f'public/cupcake/{fname}')
            continue
        else:
            save(fit(trim(cut(img)), HEIGHT.get(name[0], 720)), name)
        if name.startswith('t'):              # map pieces also get a square, untrimmed copy so tiles line up
            sq = cut(img)
            save(sq.resize((256, round(256 * sq.height / sq.width)), Image.LANCZOS), name + '-tile')
            made.append(name + '-tile')
        made.append(name)
    manifest = {n: FACING.get(n, 'front') for n in sorted(made)}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1) + '\n')
    print(f'manifest: {len(manifest)} pictures')


if __name__ == '__main__':
    main()
