// Everything drawn in code: cupcakes, scenes, the van, the town tiles and stand-in customers.
// The look matches the character sheets: dark-brown outlines, soft pastel fills, one shadow tone.
import {T} from './town.js';
import {PAINTS} from './logic.js';
import {SHOPS} from './shops.js';
import {image, hasArt} from './art.js';

export const C = {
  ink: '#5b3a29', cream: '#fff8ee', pink: '#f27aa9', pinkL: '#ffc6dc', mint: '#9fe3c0', mintD: '#6fcf9f',
  butter: '#ffe08a', sky: '#bfe6ff', skyD: '#8ccaf5', grass: '#bfe6a2', grassD: '#a3d88a', road: '#a7a9b7',
  roadD: '#90929f', curb: '#ece8f2', lilac: '#cdb8f2', peach: '#ffbc96', wood: '#e0b083', woodD: '#c18d5f',
};
const FONT = '"Fredoka", "Baloo 2", ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif';

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(typeof r === 'number' ? r : r[0] || 0, w / 2, h / 2);
    this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
  };
}

export function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function paint(ctx, fill, lw, stroke = C.ink) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function circle(ctx, x, y, r, fill, lw) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); paint(ctx, fill, lw); }
function ellipse(ctx, x, y, rx, ry, fill, lw) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); paint(ctx, fill, lw); }
function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 0.9, y - s * 0.25, x - s * 0.35, y - s * 0.85, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.35, y - s * 0.85, x + s * 0.9, y - s * 0.25, x, y + s * 0.35);
  ctx.closePath();
}
function starPath(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.48 : r;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
}
export function text(ctx, str, x, y, size, {color = C.ink, align = 'center', weight = 600, stroke = null, sw = 0, baseline = 'middle'} = {}) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align; ctx.textBaseline = baseline;
  if (stroke) { ctx.lineWidth = sw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
  ctx.fillStyle = color; ctx.fillText(str, x, y);
}
// The largest font size up to `size` at which str fits in maxW.
export function fitSize(ctx, str, size, maxW, weight = 600) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  const w = ctx.measureText(str).width;
  return w > maxW ? size * maxW / w : size;
}

// ---------- painted backgrounds ----------
// Fit a painted scene so `focus` (x0, y0, x1, y1 as fractions of the picture) sits in the screen band top..bottom,
// as large as fits while the picture still covers the full width (and the full height with cover).
// Returns where the picture goes and `at(fx, fy)` to turn picture fractions into screen points,
// or null if the picture has not been made yet.
export function fitArt(name, W, H, focus, top = 0, bottom = H, cover = false) {
  const img = image(name);
  if (!img) return null;
  const [fx0, fy0, fx1, fy1] = focus, iw = img.width, ih = img.height;
  let k = Math.max(W / iw, Math.min(W / ((fx1 - fx0) * iw), (bottom - top) / ((fy1 - fy0) * ih)));
  if (cover) k = Math.max(k, H / ih);
  const w = iw * k, h = ih * k;
  const x = Math.min(0, Math.max(W - w, W / 2 - (fx0 + fx1) / 2 * w));
  const y = Math.min(0, Math.max(H - h, (top + bottom) / 2 - (fy0 + fy1) / 2 * h));
  return {img, x, y, w, h, at: (fx, fy) => [x + fx * w, y + fy * h], sx: fx => x + fx * w, sy: fy => y + fy * h};
}
export function paintArt(ctx, f, H) {
  ctx.drawImage(f.img, f.x, f.y, f.w, f.h);
  // below a picture shorter than the screen, keep going with mirrored copies of its bottom band
  const band = f.img.height * 0.1, bh = f.h * 0.1;
  for (let y = f.y + f.h, flip = true; y < H; y += bh, flip = !flip) {
    ctx.save(); ctx.translate(0, flip ? y + bh : y); ctx.scale(1, flip ? -1 : 1);
    ctx.drawImage(f.img, 0, f.img.height - band, f.img.width, band, f.x, 0, f.w, bh);
    ctx.restore();
  }
}
const bunting = (ctx, x0, x1, y, h, n) => {
  const step = (x1 - x0) / n;
  for (let i = 0; i < n; i++) { const bx = x0 + i * step; ctx.beginPath(); ctx.moveTo(bx + 2, y); ctx.lineTo(bx + step - 2, y); ctx.lineTo(bx + step / 2, y + h); ctx.closePath(); paint(ctx, ['#ffd23d', '#9fe3c0', '#c3a6ec', '#ff9fc4'][i % 4], 1.2); }
};

// ---------- cupcakes ----------
const LINER = {vanilla: '#ff9fc4', chocolate: '#9fe3c0', strawberry: '#fff1a8', lemon: '#b9d7ff', redvelvet: '#ffffff'};
const CAKE = {vanilla: ['#f7e2a8', '#e3c27a'], chocolate: ['#8b5534', '#6b3d22'], strawberry: ['#f8b4c4', '#e58fa3'], lemon: ['#f9ec8a', '#e2cf55'], redvelvet: ['#c03a52', '#962a3e']};
const FROST = {white: ['#fffaf2', '#eadbc6'], pink: ['#f8a0c4', '#e27aa6'], choc: ['#86543a', '#653d25'], mint: ['#b4ecd0', '#82d2aa'], blue: ['#a9cff7', '#7fb0e6'], lavender: ['#d7c3f6', '#b49ae6']};
const SPRINKLE = ['#ff6b9d', '#4fb8f0', '#ffd23d', '#6fd16f', '#a77bf0', '#ff9a4d'];
const SCATTER = [[-.32, -.47], [-.12, -.5], [.1, -.46], [.3, -.49], [-.22, -.6], [.0, -.63], [.2, -.6], [-.1, -.73], [.12, -.74], [-.38, -.52], [.38, -.45], [-.02, -.55], [.24, -.69], [-.25, -.68]];
const TOP_ITEMS = ['cherry', 'gummy', 'heart', 'star', 'bone'];
// Painted cupcake parts (I1-I18). A finished cupcake is built from a cake, a frosting swirl and its toppings.
const CAKE_ART = {vanilla: 'i1-cake-vanilla', chocolate: 'i2-cake-chocolate', strawberry: 'i3-cake-strawberry', lemon: 'i4-cake-lemon', redvelvet: 'i5-cake-redvelvet'};
const FROST_ART = {white: 'i6-frosting-vanilla', pink: 'i7-frosting-strawberry', choc: 'i8-frosting-chocolate', mint: 'i9-frosting-mint', blue: 'i10-frosting-blueberry', lavender: 'i11-frosting-lavender'};
const TOP_ART = {cherry: 'i12-cherry', gummy: 'i13-gummy', heart: 'i14-heart', star: 'i15-star', bone: 'i16-bone', sprinkles: 'i17-jar-sprinkles', chips: 'i18-jar-chips'};
const TOP_HEIGHT = {cherry: 0.22, gummy: 0.2, heart: 0.16, star: 0.17, bone: 0.1};
// Raw batter in its liner (I19-I23) and the empty liners (I24-I28), for pouring and baking.
const BATTER_ART = {vanilla: 'i19-batter-vanilla', chocolate: 'i20-batter-chocolate', strawberry: 'i21-batter-strawberry', lemon: 'i22-batter-lemon', redvelvet: 'i23-batter-redvelvet'};
const LINER_ART = {vanilla: 'i24-liner-pink', chocolate: 'i25-liner-mint', strawberry: 'i26-liner-yellow', lemon: 'i27-liner-blue', redvelvet: 'i28-liner-white'};
const linerWidth = s => s * 0.92 * 0.74; // the same width as the baked cupcake's liner
// How high the liner's rim is above the cupcake's base (negative, as a y offset), for the fill line.
export function linerTop(d, s) {
  const img = image(BATTER_ART[d.cake]);
  return img ? -linerWidth(s) * img.height / img.width * 0.95 : -s * 0.4;
}
// Draw a picture through a tint, using a scratch canvas so only the picture is coloured.
const scratch = document.createElement('canvas');
function tinted(img, w, h, paint) {
  scratch.width = Math.max(1, Math.ceil(w)); scratch.height = Math.max(1, Math.ceil(h));
  const g = scratch.getContext('2d');
  g.drawImage(img, 0, 0, w, h);
  g.globalCompositeOperation = 'source-atop'; paint(g, w, h); g.globalCompositeOperation = 'source-over';
  return scratch;
}
// draw a picture with its bottom centre at (x, y), hgt tall
function placeArt(ctx, img, x, y, hgt, tilt = 0) {
  const w = hgt * img.width / img.height;
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.drawImage(img, -w / 2, -hgt, w, hgt); ctx.restore();
}

function topping(ctx, id, x, y, s, lw, tilt = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
  if (id === 'cherry') {
    ctx.beginPath(); ctx.moveTo(0, -s * 0.06); ctx.quadraticCurveTo(s * 0.04, -s * 0.18, s * 0.11, -s * 0.2); paint(ctx, null, lw * 1.2, '#4f8a3a');
    circle(ctx, 0, 0, s * 0.085, '#e8324f', lw);
    circle(ctx, -s * 0.03, -s * 0.03, s * 0.022, 'rgba(255,255,255,.85)');
  } else if (id === 'gummy') {
    const g = '#ff5f7e';
    circle(ctx, -s * 0.05, -s * 0.1, s * 0.03, g, lw); circle(ctx, s * 0.05, -s * 0.1, s * 0.03, g, lw);
    rr(ctx, -s * 0.065, -s * 0.03, s * 0.13, s * 0.12, s * 0.05); paint(ctx, g, lw);
    circle(ctx, 0, -s * 0.07, s * 0.06, g, lw);
    circle(ctx, -s * 0.02, -s * 0.08, s * 0.008, C.ink); circle(ctx, s * 0.02, -s * 0.08, s * 0.008, C.ink);
  } else if (id === 'heart') {
    heartPath(ctx, 0, -s * 0.04, s * 0.13); paint(ctx, '#ff7eb6', lw);
  } else if (id === 'star') {
    starPath(ctx, 0, -s * 0.05, s * 0.1); paint(ctx, '#ffd23d', lw);
    circle(ctx, -s * 0.025, -s * 0.07, s * 0.015, 'rgba(255,255,255,.9)');
  } else if (id === 'bone') {
    ctx.rotate(-0.5);
    const b = '#e9c08a';
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) circle(ctx, sx * s * 0.08, sy * s * 0.03 - s * 0.03, s * 0.035, b, lw);
    rr(ctx, -s * 0.08, -s * 0.055, s * 0.16, s * 0.05, s * 0.02); paint(ctx, b, 0);
    ctx.beginPath(); ctx.moveTo(-s * 0.08, -s * 0.055); ctx.lineTo(s * 0.08, -s * 0.055); ctx.moveTo(-s * 0.08, -s * 0.005); ctx.lineTo(s * 0.08, -s * 0.005); paint(ctx, null, lw);
  }
  ctx.restore();
}

// A cupcake from the side, standing with its bottom centre at (x, y), s pixels tall.
// Mix two #rrggbb colours; k = 0 gives a, 1 gives b.
export const batterColor = cakeId => mix((CAKE[cakeId] || CAKE.vanilla)[0], '#fff8e8', 0.45);
export function mix(a, b, k) {
  k = Math.max(0, Math.min(1, k));
  const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, '0')).join('');
}

// stage (for the baking mini-game) draws a cupcake part-way through being made:
// {fill: batter 0..1.3} before baking, then {bake: 0..1.2, frost: 0..1.3, tops: [topping ids so far]}.
export function cupcake(ctx, d, x, y, s, t = 0, bare = false, stage = null) {
  const lw = Math.max(1, s * 0.022);
  if ((!stage || stage.frost > 0) && paintedCupcake(ctx, d, x, y, s, t, bare, stage, lw)) return;
  if (stage && stage.bake == null && paintedBatter(ctx, d, x, y, s, stage, lw)) return;
  if (stage && stage.bake != null && paintedOven(ctx, d, x, y, s, stage)) return;
  const liner = LINER[d.cake] || C.pinkL, [cake, cakeD] = CAKE[d.cake] || CAKE.vanilla, [fr, frD] = FROST[d.frosting] || FROST.white;
  ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ellipse(ctx, 0, s * 0.01, s * 0.32, s * 0.035, 'rgba(91,58,41,.16)');
  const topW = s * 0.76, botW = s * 0.56, wy = -s * 0.4;
  const wrapper = () => { ctx.beginPath(); ctx.moveTo(-topW / 2, wy); ctx.lineTo(topW / 2, wy); ctx.lineTo(botW / 2, 0); ctx.quadraticCurveTo(0, s * 0.025, -botW / 2, 0); ctx.closePath(); };
  wrapper(); paint(ctx, liner);
  ctx.save(); wrapper(); ctx.clip();
  for (let i = 1; i < 7; i++) {
    const f = i / 7;
    ctx.beginPath(); ctx.moveTo(-topW / 2 + topW * f, wy); ctx.lineTo(-botW / 2 + botW * f, s * 0.02);
    paint(ctx, null, s * 0.035, 'rgba(255,255,255,.35)');
  }
  ctx.fillStyle = 'rgba(91,58,41,.12)'; ctx.fillRect(topW * 0.15, wy, topW, s);
  const batter = mix(cake, '#fff8e8', 0.45);
  if (stage && stage.bake == null && stage.fill > 0) {
    const top = wy * Math.min(1, stage.fill);
    ctx.fillStyle = batter; ctx.fillRect(-topW, top, topW * 2, -top + s * 0.05);
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(-topW, top, topW * 2, s * 0.02);
  }
  ctx.restore();
  wrapper(); paint(ctx, null, lw);
  if (stage && stage.bake == null) {
    if (stage.fill > 1) {
      // too much batter: it bulges over the top and drips
      const over = Math.min(0.3, stage.fill - 1);
      ctx.beginPath(); ctx.ellipse(0, wy, topW * 0.55, s * over * 0.6, 0, Math.PI, 0); paint(ctx, batter, lw);
      for (const dx of [-0.36, 0.33]) { rr(ctx, topW * dx - s * 0.03, wy - s * 0.01, s * 0.06, s * over * 0.7, s * 0.03); paint(ctx, batter, lw * 0.7); }
    }
    ctx.restore(); return;
  }
  const domeColor = !stage ? cake : stage.bake < 0.62 ? mix(batter, cake, stage.bake / 0.62) : mix(cake, '#6e4022', (stage.bake - 0.8) / 0.4);
  const rise = !stage ? 1 : Math.min(1, 0.3 + stage.bake * 1.1);
  ctx.beginPath(); ctx.ellipse(0, wy, topW * 0.53, s * (bare ? 0.2 : stage && !(stage.frost > 0) ? 0.16 : 0.09) * rise, 0, Math.PI, 0); paint(ctx, domeColor, lw);
  if (stage && !(stage.frost > 0)) { ctx.restore(); return; }
  if (bare) { ctx.beginPath(); ctx.ellipse(-topW * 0.15, wy - s * 0.1, topW * 0.12, s * 0.04, -0.3, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fill(); ctx.restore(); return; }
  // frosting swirl, three tiers and a peak, swaying a little
  const sway = Math.sin(t * 2.4) * s * 0.012;
  if (stage) {
    // only the part piped so far, from the bottom up
    ctx.save(); ctx.beginPath(); ctx.rect(-s, -s * 0.385 - Math.min(1, stage.frost) * s * 0.53, s * 2, s * 2); ctx.clip();
  }
  const tiers = [[-0.47, 0.92, 0.17], [-0.6, 0.72, 0.16], [-0.72, 0.5, 0.14]];
  tiers.forEach(([ty, tw, th], i) => {
    const cx = sway * (i + 1), cy = s * ty, w = s * tw, h = s * th;
    rr(ctx, cx - w / 2, cy - h / 2, w, h, h / 2); paint(ctx, fr);
    ctx.save(); rr(ctx, cx - w / 2, cy - h / 2, w, h, h / 2); ctx.clip();
    ctx.fillStyle = frD; ctx.beginPath(); ctx.ellipse(cx + w * 0.1, cy + h * 0.55, w * 0.6, h * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    rr(ctx, cx - w / 2, cy - h / 2, w, h, h / 2); paint(ctx, null, lw);
    ctx.beginPath(); ctx.ellipse(cx - w * 0.2, cy - h * 0.18, w * 0.18, h * 0.14, -0.2, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill();
  });
  const px = sway * 4;
  ctx.beginPath(); ctx.moveTo(px - s * 0.11, -s * 0.775); ctx.quadraticCurveTo(px - s * 0.04, -s * 0.8, px + s * 0.03, -s * 0.9);
  ctx.quadraticCurveTo(px + s * 0.07, -s * 0.81, px + s * 0.11, -s * 0.775); ctx.closePath(); paint(ctx, fr, lw);
  if (stage) {
    ctx.restore();
    if (stage.frost > 1.04) {
      // piped too tall: the peak keeps going up in a wobbly point
      const extra = Math.min(0.3, stage.frost - 1);
      ctx.beginPath(); ctx.moveTo(px - s * 0.07, -s * 0.8); ctx.quadraticCurveTo(px - s * 0.04, -s * 0.86, px + s * 0.03 + Math.sin(t * 6) * s * 0.02, -s * 0.9 - extra * s * 0.9);
      ctx.quadraticCurveTo(px + s * 0.07, -s * 0.85, px + s * 0.08, -s * 0.8); ctx.closePath(); paint(ctx, fr, lw);
    }
  }
  // toppings
  const tops = stage ? stage.tops || [] : d.toppings || [];
  let topsPlaced = 0;
  tops.forEach((id, k) => {
    if (id === 'sprinkles' || id === 'chips') {
      SCATTER.forEach(([u, v], i) => {
        if ((i + k) % (tops.length > 1 ? 2 : 1)) return;
        const sx = u * s + sway * (v < -0.65 ? 3 : v < -0.55 ? 2 : 1), sy = v * s;
        if (id === 'sprinkles') {
          const a = (i * 1.7) % Math.PI;
          ctx.beginPath(); ctx.moveTo(sx - Math.cos(a) * s * 0.025, sy - Math.sin(a) * s * 0.025); ctx.lineTo(sx + Math.cos(a) * s * 0.025, sy + Math.sin(a) * s * 0.025);
          paint(ctx, null, s * 0.022, SPRINKLE[i % SPRINKLE.length]);
        } else {
          ctx.beginPath(); ctx.moveTo(sx, sy - s * 0.03); ctx.quadraticCurveTo(sx + s * 0.025, sy + s * 0.01, sx, sy + s * 0.012); ctx.quadraticCurveTo(sx - s * 0.025, sy + s * 0.01, sx, sy - s * 0.03);
          paint(ctx, '#5a3420', lw * 0.6);
        }
      });
    } else if (TOP_ITEMS.includes(id)) {
      if (topsPlaced === 0) topping(ctx, id, px + s * 0.03, -s * 0.9, s, lw);
      else topping(ctx, id, sway * 2 + s * 0.24, -s * 0.62, s * 0.9, lw, 0.35);
      topsPlaced++;
    }
  });
  ctx.restore();
}

// Pouring: the empty liner with the batter level showing through it, then the full batter picture at the top.
function paintedBatter(ctx, d, x, y, s, stage, lw) {
  const liner = image(LINER_ART[d.cake]), batter = image(BATTER_ART[d.cake]);
  if (!liner || !batter) return false;
  const w = linerWidth(s), hl = w * liner.height / liner.width, hb = w * batter.height / batter.width, fill = stage.fill || 0;
  ctx.save(); ctx.translate(x, y);
  ellipse(ctx, 0, s * 0.01, s * 0.32, s * 0.035, 'rgba(91,58,41,.16)');
  const level = hl * Math.min(1, fill), color = batterColor(d.cake);
  ctx.drawImage(tinted(liner, w, hl, (g, ww, hh) => {
    g.globalAlpha = 0.62; g.fillStyle = color; g.fillRect(0, hh - level, ww, level);
    g.globalAlpha = 0.9; g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(0, hh - level, ww, Math.min(level, hh * 0.025));
  }), -w / 2, -hl, w, hl);
  // almost full: the real batter picture fades in, its top showing at the rim
  const full = Math.max(0, Math.min(1, (fill - 0.85) / 0.15));
  if (full > 0) { ctx.globalAlpha = full; ctx.drawImage(batter, -w / 2, -hb, w, hb); ctx.globalAlpha = 1; }
  if (fill > 1) {
    // too much batter: it bulges over the top and drips
    const over = Math.min(0.3, fill - 1);
    ctx.beginPath(); ctx.ellipse(0, -hb * 0.96, w * 0.5, s * over * 0.6, 0, Math.PI, 0); paint(ctx, color, lw);
    for (const dx of [-0.42, 0.38]) { rr(ctx, w * dx - s * 0.03, -hb * 0.97, s * 0.06, s * over * 0.7, s * 0.03); paint(ctx, color, lw * 0.7); }
  }
  ctx.restore();
  return true;
}
// Baking: the batter turns into the baked cake as it rises, and browns if it stays in too long.
function paintedOven(ctx, d, x, y, s, stage) {
  const batter = image(BATTER_ART[d.cake]), cake = image(CAKE_ART[d.cake] || CAKE_ART.vanilla);
  if (!batter || !cake) return false;
  const w = linerWidth(s), hb = w * batter.height / batter.width, hc = w * cake.height / cake.width;
  const k = Math.max(0, Math.min(1, stage.bake / 0.62)), rise = 0.82 + 0.18 * k, burn = Math.max(0, Math.min(0.6, (stage.bake - 0.8) * 1.4));
  ctx.save(); ctx.translate(x, y);
  ellipse(ctx, 0, s * 0.01, s * 0.32, s * 0.035, 'rgba(91,58,41,.16)');
  if (k < 1) { ctx.globalAlpha = 1 - k; ctx.drawImage(batter, -w / 2, -hb, w, hb); }
  ctx.globalAlpha = k;
  const baked = burn > 0 ? tinted(cake, w, hc, (g, ww, hh) => { g.globalAlpha = burn; g.fillStyle = '#5a3018'; g.fillRect(0, 0, ww, hh * 0.4); }) : cake;
  ctx.drawImage(baked, -w / 2, -hc * rise, w, hc * rise);
  ctx.restore();
  return true;
}
function paintedCupcake(ctx, d, x, y, s, t, bare, stage, lw) {
  const base = image(CAKE_ART[d.cake] || CAKE_ART.vanilla), cream = image(FROST_ART[d.frosting] || FROST_ART.white);
  if (!base || (!bare && !cream)) return false;
  s *= 0.92; // the painted swirl is taller than the drawn one; keep the same overall height
  ctx.save(); ctx.translate(x, y);
  ellipse(ctx, 0, s * 0.01, s * 0.32, s * 0.035, 'rgba(91,58,41,.16)');
  const bw = s * 0.74, bh = bw * base.height / base.width;
  ctx.drawImage(base, -bw / 2, -bh, bw, bh);
  if (bare) { ctx.restore(); return true; }
  // the swirl sits on the dome and sways a little
  const sway = Math.sin(t * 2.4) * s * 0.01, fw = s * 0.62, fh = fw * cream.height / cream.width, fb = -s * 0.44, top = fb - fh;
  ctx.translate(sway, 0);
  if (stage) { ctx.save(); ctx.beginPath(); ctx.rect(-s, fb - Math.min(1, stage.frost) * fh, s * 2, s * 2); ctx.clip(); }
  ctx.drawImage(cream, -fw / 2, top, fw, fh);
  if (stage) {
    ctx.restore();
    if (stage.frost > 1.04) {
      // piped too tall: the peak keeps going up in a wobbly point
      const extra = Math.min(0.3, stage.frost - 1), fr = (FROST[d.frosting] || FROST.white)[0];
      ctx.beginPath(); ctx.moveTo(-s * 0.07, top + s * 0.06); ctx.quadraticCurveTo(-s * 0.04, top, s * 0.01 + Math.sin(t * 6) * s * 0.02, top - extra * s * 0.9);
      ctx.quadraticCurveTo(s * 0.06, top, s * 0.08, top + s * 0.06); ctx.closePath(); paint(ctx, fr, lw);
    }
  }
  const tops = stage ? stage.tops || [] : d.toppings || [];
  let placed = 0;
  tops.forEach((id, k) => {
    if (id === 'sprinkles' || id === 'chips') {
      SCATTER.forEach(([u, v], i) => {
        if ((i + k) % (tops.length > 1 ? 2 : 1)) return;
        // spread over the swirl, narrower towards its top
        const vy = fb + (v + 0.42) * 1.6 * s, up = (fb - vy) / fh, sx = u * s * 0.85 * (1 - up * 0.7), sy = vy;
        if (id === 'sprinkles') {
          const a = (i * 1.7) % Math.PI;
          ctx.beginPath(); ctx.moveTo(sx - Math.cos(a) * s * 0.025, sy - Math.sin(a) * s * 0.025); ctx.lineTo(sx + Math.cos(a) * s * 0.025, sy + Math.sin(a) * s * 0.025);
          paint(ctx, null, s * 0.022, SPRINKLE[i % SPRINKLE.length]);
        } else {
          ctx.beginPath(); ctx.moveTo(sx, sy - s * 0.03); ctx.quadraticCurveTo(sx + s * 0.025, sy + s * 0.01, sx, sy + s * 0.012); ctx.quadraticCurveTo(sx - s * 0.025, sy + s * 0.01, sx, sy - s * 0.03);
          paint(ctx, '#5a3420', lw * 0.6);
        }
      });
    } else if (TOP_ITEMS.includes(id)) {
      const img = image(TOP_ART[id]), hgt = s * TOP_HEIGHT[id];
      const [tx, ty, tilt] = placed === 0 ? [-s * 0.015, top + s * 0.07, 0] : [s * 0.2, fb - fh * 0.42, 0.35];
      if (img) placeArt(ctx, img, tx, ty, hgt * (placed ? 0.85 : 1), tilt);
      else topping(ctx, id, tx, ty - s * 0.05, s, lw, tilt);
      placed++;
    }
  });
  ctx.restore();
  return true;
}

// Small square pictures of single ingredients, for buttons.
const iconCache = new Map();
export function ingredientIcon(id, kind, size = 96) {
  const art = image((kind === 'cake' ? CAKE_ART : kind === 'frosting' ? FROST_ART : TOP_ART)[id]);
  const key = id + size + (art ? '+art' : '');
  if (iconCache.has(key)) return iconCache.get(key);
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const s = size * 0.92;
  if (art) {
    const k = size * 0.88 / Math.max(art.width, art.height), w = art.width * k, hh = art.height * k;
    ctx.drawImage(art, (size - w) / 2, (size - hh) / 2, w, hh);
  } else if (kind === 'cake') {
    cupcake(ctx, {cake: id, toppings: []}, size / 2, size * 0.92, s * 1.45, 0, true);
  } else if (kind === 'frosting') {
    const [fr, frD] = FROST[id];
    const lw = size * 0.03;
    [[0.78, 0.8, 0.22], [0.58, 0.6, 0.2], [0.4, 0.4, 0.17]].forEach(([y, w, h]) => {
      rr(ctx, size / 2 - size * w / 2, size * y - size * h / 2, size * w, size * h, size * h / 2); paint(ctx, fr, lw);
      ctx.beginPath(); ctx.ellipse(size / 2 + size * 0.05, size * y + size * h * 0.25, size * w * 0.35, size * h * 0.2, 0, 0, Math.PI * 2); ctx.fillStyle = frD; ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1;
    });
    ctx.beginPath(); ctx.moveTo(size * 0.42, size * 0.31); ctx.quadraticCurveTo(size * 0.5, size * 0.28, size * 0.53, size * 0.12); ctx.quadraticCurveTo(size * 0.58, size * 0.27, size * 0.6, size * 0.31); ctx.closePath(); paint(ctx, fr, lw);
  } else if (id === 'sprinkles' || id === 'chips') {
    ellipse(ctx, size / 2, size * 0.62, size * 0.36, size * 0.2, '#fff4e6', size * 0.025);
    for (let i = 0; i < 12; i++) {
      const a = i * 2.39, r = (i % 4) * size * 0.07, x = size / 2 + Math.cos(a) * r * 1.4, y = size * 0.6 + Math.sin(a) * r * 0.6;
      if (id === 'sprinkles') { ctx.beginPath(); ctx.moveTo(x - size * 0.03, y); ctx.lineTo(x + size * 0.03, y + size * 0.02); paint(ctx, null, size * 0.035, SPRINKLE[i % 6]); }
      else circle(ctx, x, y, size * 0.03, '#5a3420');
    }
  } else {
    topping(ctx, id, size / 2, size * 0.68, size * 3.3, size * 0.03);
  }
  const url = cv.toDataURL();
  iconCache.set(key, url);
  return url;
}

// ---------- stand-in characters (customers, and Arianna/Baxter if their pictures fail to load) ----------
export const LOOK = {
  grandma: {skin: '#f3cfb0', hair: '#e5e4ea', style: 'bun', top: '#c9b3f0', bottom: '#8e79c4', acc: ['glasses']},
  builder: {skin: '#c98d62', hair: '#3b2a20', style: 'short', top: '#ff9d4d', bottom: '#5b7fc7', acc: ['hardhat', 'vest']},
  boy:     {skin: '#f5d0ab', hair: '#7a5232', style: 'short', top: '#ff6b6b', stripes: '#ffffff', bottom: '#5b8fd6', acc: ['balloon'], small: true},
  mail:    {skin: '#8d5a3c', hair: '#2b1d16', style: 'short', top: '#9fcff5', bottom: '#3f5f9e', acc: ['mailcap', 'bag']},
  girl:    {skin: '#e9b48d', hair: '#2b1d16', style: 'pigtails', top: '#ffe08a', bottom: '#ffe08a', dress: true, small: true},
  dad:     {skin: '#b47a52', hair: '#1f1612', style: 'short', top: '#7fd1a0', bottom: '#c9b28a', acc: ['glasses']},
  bunny:   {skin: '#ffffff', ears: 'bunny', top: '#7fb2ea', bottom: '#7fb2ea', animal: true, small: true},
  cat:     {skin: '#ffad5c', ears: 'cat', top: '#6fcfc0', stripes: '#ffffff', bottom: '#5aa89c', animal: true},
  bear:    {skin: '#a8714a', ears: 'bear', top: '#a8714a', bottom: '#a8714a', acc: ['bowtie'], animal: true, big: true},
  duck:    {skin: '#ffe066', ears: 'duck', top: '#ff6b6b', bottom: '#ff6b6b', animal: true, small: true},
  pug:     {skin: '#e8c9a0', mask: '#5b4636', ears: 'floppy', top: '#f48fb5', bottom: '#e8c9a0', animal: true, small: true, acc: ['partyhat']},
  poodle:  {skin: '#fff0f6', ears: 'poof', top: '#c9b3f0', bottom: '#fff0f6', animal: true, acc: ['partyhat']},
  spot:    {skin: '#ffffff', spots: '#3b2a20', ears: 'floppy', top: '#9fe3c0', bottom: '#ffffff', animal: true, acc: ['partyhat']},
  arianna: {skin: '#f0c39b', hair: '#c08a4e', style: 'ponytail', top: '#a8e3b9', bottom: '#4f7fc7', apron: '#f27aa9'},
  baxter:  {skin: '#fff8ee', mask: '#c79a62', ears: 'floppy', earColor: '#a8784a', top: '#fff8ee', bottom: '#fff8ee', animal: true, small: true, acc: ['bandana']},
};

export function person(ctx, who, x, y, h, {t = 0, walking = false, face = 'happy', dir = 1} = {}) {
  const L = LOOK[who] || LOOK.dad;
  h *= L.small ? 0.84 : L.big ? 1.1 : 1;
  const lw = Math.max(1.2, h * 0.016), r = h * 0.17, hy = -h + r * 1.05;
  const swing = walking ? Math.sin(t * 10) * 0.45 : 0, bob = walking ? -Math.abs(Math.cos(t * 10)) * h * 0.02 : 0;
  ctx.save(); ctx.translate(x, y + bob); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ellipse(ctx, 0, -bob + h * 0.005, h * 0.17, h * 0.025, 'rgba(91,58,41,.18)');
  const legTop = -h * 0.3, legW = h * 0.085;
  for (const [side, a] of [[-1, swing], [1, -swing]]) {
    ctx.save(); ctx.translate(side * h * 0.07, legTop); ctx.rotate(a);
    rr(ctx, -legW / 2, 0, legW, h * 0.28, legW / 2); paint(ctx, L.dress ? L.skin : L.bottom, lw);
    ellipse(ctx, h * 0.02 * dir, h * 0.29, h * 0.06, h * 0.03, L.animal ? L.skin : '#5b3a29', lw);
    ctx.restore();
  }
  // arms behind the body
  for (const [side, a] of [[-1, -swing], [1, swing]]) {
    ctx.save(); ctx.translate(side * h * 0.16, -h * 0.6); ctx.rotate(a * 0.7 + side * 0.15);
    rr(ctx, -h * 0.035, 0, h * 0.07, h * 0.22, h * 0.035); paint(ctx, L.top, lw);
    circle(ctx, 0, h * 0.23, h * 0.04, L.skin, lw);
    ctx.restore();
  }
  // body
  if (L.dress) { ctx.beginPath(); ctx.moveTo(-h * 0.12, -h * 0.64); ctx.lineTo(h * 0.12, -h * 0.64); ctx.lineTo(h * 0.2, -h * 0.26); ctx.quadraticCurveTo(0, -h * 0.23, -h * 0.2, -h * 0.26); ctx.closePath(); }
  else rr(ctx, -h * 0.16, -h * 0.66, h * 0.32, h * 0.38, h * 0.1);
  paint(ctx, L.top);
  if (L.stripes) {
    ctx.save(); ctx.clip();
    for (let i = 0; i < 5; i++) { ctx.fillStyle = L.stripes; ctx.fillRect(-h * 0.2, -h * 0.62 + i * h * 0.08, h * 0.4, h * 0.03); }
    ctx.restore();
    if (L.dress) { ctx.beginPath(); ctx.moveTo(-h * 0.12, -h * 0.64); ctx.lineTo(h * 0.12, -h * 0.64); ctx.lineTo(h * 0.2, -h * 0.26); ctx.quadraticCurveTo(0, -h * 0.23, -h * 0.2, -h * 0.26); ctx.closePath(); }
    else rr(ctx, -h * 0.16, -h * 0.66, h * 0.32, h * 0.38, h * 0.1);
  }
  paint(ctx, null, lw);
  if (L.apron) { rr(ctx, -h * 0.12, -h * 0.58, h * 0.24, h * 0.32, h * 0.04); paint(ctx, L.apron, lw); }
  if (L.acc?.includes('vest')) { rr(ctx, -h * 0.16, -h * 0.66, h * 0.1, h * 0.38, h * 0.05); paint(ctx, '#ffd23d', lw); rr(ctx, h * 0.06, -h * 0.66, h * 0.1, h * 0.38, h * 0.05); paint(ctx, '#ffd23d', lw); }
  if (L.acc?.includes('bag')) { rr(ctx, h * 0.1, -h * 0.45, h * 0.16, h * 0.14, h * 0.03); paint(ctx, '#c18d5f', lw); ctx.beginPath(); ctx.moveTo(-h * 0.12, -h * 0.66); ctx.lineTo(h * 0.18, -h * 0.45); paint(ctx, null, lw * 2, '#a8784a'); }
  if (L.acc?.includes('bowtie') || L.acc?.includes('bandana')) {
    const c = L.acc.includes('bandana') ? C.mint : '#5fbf7f';
    ctx.beginPath(); ctx.moveTo(0, -h * 0.64); ctx.lineTo(-h * 0.08, -h * 0.69); ctx.lineTo(-h * 0.08, -h * 0.59); ctx.closePath(); paint(ctx, c, lw);
    ctx.beginPath(); ctx.moveTo(0, -h * 0.64); ctx.lineTo(h * 0.08, -h * 0.69); ctx.lineTo(h * 0.08, -h * 0.59); ctx.closePath(); paint(ctx, c, lw);
  }
  // head
  ctx.save(); ctx.translate(0, hy);
  const ear = L.earColor || L.skin;
  if (L.ears === 'bunny') for (const s of [-1, 1]) { ctx.save(); ctx.rotate(s * 0.15); rr(ctx, s * r * 0.35 - r * 0.2, -r * 2.1, r * 0.4, r * 1.4, r * 0.2); paint(ctx, ear, lw); rr(ctx, s * r * 0.35 - r * 0.1, -r * 1.9, r * 0.2, r * 1.0, r * 0.1); paint(ctx, '#ffc6dc'); ctx.restore(); }
  if (L.ears === 'cat') for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * 0.3, -r * 0.8); ctx.lineTo(s * r * 0.85, -r * 1.25); ctx.lineTo(s * r * 0.9, -r * 0.35); ctx.closePath(); paint(ctx, ear, lw); }
  if (L.ears === 'bear') for (const s of [-1, 1]) circle(ctx, s * r * 0.75, -r * 0.75, r * 0.35, ear, lw);
  if (L.ears === 'poof') for (const s of [-1, 1]) circle(ctx, s * r * 0.95, -r * 0.1, r * 0.45, ear, lw);
  circle(ctx, 0, 0, r, L.skin, lw);
  if (L.mask) { ctx.save(); circle(ctx, 0, 0, r); ctx.clip(); ellipse(ctx, 0, r * 0.35, r * 0.55, r * 0.45, L.mask); ctx.restore(); circle(ctx, 0, 0, r, null, lw); }
  if (L.spots) { circle(ctx, -r * 0.5, -r * 0.45, r * 0.18, L.spots); circle(ctx, r * 0.55, r * 0.1, r * 0.14, L.spots); }
  if (L.ears === 'floppy') for (const s of [-1, 1]) { ctx.save(); ctx.translate(s * r * 0.85, -r * 0.35); ctx.rotate(s * (0.35 + (walking ? Math.sin(t * 10) * 0.12 : 0))); rr(ctx, -r * 0.2, 0, r * 0.4, r * 0.85, r * 0.2); paint(ctx, ear, lw); ctx.restore(); }
  if (L.hair) {
    ctx.save(); circle(ctx, 0, 0, r); ctx.clip();
    ctx.fillStyle = L.hair; ctx.beginPath(); ctx.ellipse(0, -r * 0.74, r * 1.2, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore(); circle(ctx, 0, 0, r, null, lw);
    if (L.style === 'bun') circle(ctx, 0, -r * 1.05, r * 0.4, L.hair, lw);
    if (L.style === 'pigtails') for (const s of [-1, 1]) circle(ctx, s * r * 1.05, -r * 0.25, r * 0.32, L.hair, lw);
    if (L.style === 'ponytail') { ctx.beginPath(); ctx.ellipse(-dir * r * 0.95, -r * 0.2, r * 0.3, r * 0.65, dir * 0.4, 0, Math.PI * 2); paint(ctx, L.hair, lw); }
  }
  if (L.ears === 'duck') { ctx.beginPath(); ctx.ellipse(r * 0.05, r * 0.25, r * 0.45, r * 0.18, 0, 0, Math.PI * 2); paint(ctx, '#ff9a3d', lw); }
  // face
  const ey = -r * 0.08;
  if (face === 'wow') { circle(ctx, -r * 0.35, ey, r * 0.13, '#fff', lw * 0.7); circle(ctx, r * 0.35, ey, r * 0.13, '#fff', lw * 0.7); circle(ctx, -r * 0.33, ey, r * 0.07, C.ink); circle(ctx, r * 0.37, ey, r * 0.07, C.ink); }
  else { circle(ctx, -r * 0.35, ey, r * 0.09, C.ink); circle(ctx, r * 0.35, ey, r * 0.09, C.ink); circle(ctx, -r * 0.32, ey - r * 0.04, r * 0.03, '#fff'); circle(ctx, r * 0.38, ey - r * 0.04, r * 0.03, '#fff'); }
  circle(ctx, -r * 0.62, r * 0.22, r * 0.13, 'rgba(255,120,150,.35)'); circle(ctx, r * 0.62, r * 0.22, r * 0.13, 'rgba(255,120,150,.35)');
  if (L.ears === 'floppy' || L.ears === 'poof' || L.ears === 'bear' || L.ears === 'cat' || L.ears === 'bunny') circle(ctx, 0, r * 0.2, r * 0.11, C.ink);
  if (L.ears !== 'duck') {
    ctx.beginPath();
    if (face === 'hmm') { ctx.moveTo(-r * 0.18, r * 0.5); ctx.lineTo(r * 0.2, r * 0.42); }
    else if (face === 'wow') ctx.ellipse(0, r * 0.47, r * 0.12, r * 0.15, 0, 0, Math.PI * 2);
    else ctx.arc(0, r * 0.32, r * 0.25, 0.15 * Math.PI, 0.85 * Math.PI);
    paint(ctx, face === 'wow' ? '#c4475f' : null, lw);
  }
  if (face === 'hmm') { ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.35); ctx.lineTo(-r * 0.2, -r * 0.3); ctx.moveTo(r * 0.2, -r * 0.3); ctx.lineTo(r * 0.5, -r * 0.4); paint(ctx, null, lw); }
  if (L.acc?.includes('glasses')) { circle(ctx, -r * 0.35, ey, r * 0.24, 'rgba(255,255,255,.25)', lw); circle(ctx, r * 0.35, ey, r * 0.24, 'rgba(255,255,255,.25)', lw); }
  if (L.acc?.includes('hardhat')) { ctx.beginPath(); ctx.arc(0, -r * 0.35, r * 0.95, Math.PI, 0); paint(ctx, '#ffd23d', lw); rr(ctx, -r * 1.15, -r * 0.42, r * 2.3, r * 0.16, r * 0.08); paint(ctx, '#ffd23d', lw); }
  if (L.acc?.includes('mailcap')) { ctx.beginPath(); ctx.arc(0, -r * 0.4, r * 0.9, Math.PI, 0); paint(ctx, '#3f5f9e', lw); rr(ctx, -r * 0.1, -r * 0.48, r * 1.1, r * 0.14, r * 0.07); paint(ctx, '#2f4a80', lw); }
  if (L.acc?.includes('partyhat')) { ctx.beginPath(); ctx.moveTo(-r * 0.45, -r * 0.8); ctx.lineTo(r * 0.1, -r * 1.85); ctx.lineTo(r * 0.5, -r * 0.75); ctx.closePath(); paint(ctx, '#7fc8f5', lw); circle(ctx, r * 0.1, -r * 1.9, r * 0.14, '#ffd23d', lw); }
  ctx.restore();
  if (L.acc?.includes('balloon')) {
    const bx = -h * 0.24 + Math.sin(t * 1.5) * h * 0.02, by = -h * 1.05;
    ctx.beginPath(); ctx.moveTo(-h * 0.16, -h * 0.38); ctx.quadraticCurveTo(-h * 0.25, -h * 0.7, bx, by + h * 0.1); paint(ctx, null, lw * 0.6, C.ink);
    ellipse(ctx, bx, by, h * 0.09, h * 0.11, '#ff5f6d', lw);
    circle(ctx, bx - h * 0.03, by - h * 0.04, h * 0.02, 'rgba(255,255,255,.8)');
  }
  ctx.restore();
}

// ---------- the van ----------
// Side view, wheels on (x, y), L pixels long, facing right. drawPeople(ctx, windowBox) paints the cab.
// The van pictures are pink with a mint stripe; other paints are made by recolouring them once.
const vanCache = new Map();
function hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function rgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
const hex = c => hsl(...[1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)));
function vanArt(name, paintId) {
  const img = image(name);
  if (!img || paintId === 'pink' || !PAINTS[paintId]) return img;
  const key = name + paintId;
  if (vanCache.has(key)) return vanCache.get(key);
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const g = cv.getContext('2d');
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, cv.width, cv.height), px = data.data;
  const swaps = [[hex(PAINTS.pink.body), hex(PAINTS[paintId].body), h => h > 312 && h < 352], [hex(PAINTS.pink.stripe), hex(PAINTS[paintId].stripe), h => h > 95 && h < 170]];
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 8) continue;
    const [h, sat, l] = hsl(px[i], px[i + 1], px[i + 2]);
    if (sat < 0.22) continue;
    for (const [from, to, near] of swaps) if (near(h)) {
      const out = rgb(to[0], Math.min(1, to[1] * sat / from[1]), Math.max(0, Math.min(1, l + to[2] - from[2])));
      px[i] = out[0]; px[i + 1] = out[1]; px[i + 2] = out[2];
      break;
    }
  }
  g.putImageData(data, 0, 0);
  vanCache.set(key, cv);
  return cv;
}

export function vanSide(ctx, x, y, L, paintId, {t = 0, roll = 0, drawPeople = null, name = ''} = {}) {
  const art = vanArt('v1-van-side', paintId);
  if (art) {
    const hgt = L * art.height / art.width;
    ellipse(ctx, x, y, L * 0.48, L * 0.03, 'rgba(91,58,41,.2)');
    ctx.drawImage(art, x - L / 2, y - hgt, L, hgt);
    if (name) text(ctx, name, x - L * 0.19, y - hgt * 0.535, fitSize(ctx, name, L * 0.05, L * 0.42, 700), {color: '#fff', stroke: C.ink, sw: L * 0.012, weight: 700});
    return;
  }
  const p = PAINTS[paintId] || PAINTS.pink, lw = Math.max(1.5, L * 0.012);
  ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round';
  ellipse(ctx, 0, 0, L * 0.5, L * 0.03, 'rgba(91,58,41,.2)');
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(-L * 0.48, -L * 0.12); ctx.lineTo(-L * 0.48, -L * 0.52); ctx.quadraticCurveTo(-L * 0.48, -L * 0.6, -L * 0.4, -L * 0.6);
    ctx.lineTo(L * 0.14, -L * 0.6); ctx.quadraticCurveTo(L * 0.22, -L * 0.6, L * 0.27, -L * 0.53);
    ctx.lineTo(L * 0.38, -L * 0.36); ctx.quadraticCurveTo(L * 0.49, -L * 0.34, L * 0.49, -L * 0.26);
    ctx.lineTo(L * 0.49, -L * 0.15); ctx.quadraticCurveTo(L * 0.49, -L * 0.11, L * 0.45, -L * 0.11); ctx.closePath();
  };
  body(); paint(ctx, p.body);
  ctx.save(); body(); ctx.clip();
  ctx.fillStyle = p.stripe; ctx.fillRect(-L * 0.5, -L * 0.3, L, L * 0.07);
  ctx.fillStyle = 'rgba(91,58,41,.12)'; ctx.fillRect(-L * 0.5, -L * 0.18, L, L * 0.1);
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(-L * 0.46, -L * 0.57, L * 0.7, L * 0.04);
  ctx.restore();
  body(); paint(ctx, null, lw);
  // cab window with Arianna and Baxter
  const win = () => { ctx.beginPath(); ctx.moveTo(L * 0.06, -L * 0.54); ctx.lineTo(L * 0.2, -L * 0.54); ctx.quadraticCurveTo(L * 0.23, -L * 0.54, L * 0.25, -L * 0.51); ctx.lineTo(L * 0.33, -L * 0.37); ctx.lineTo(L * 0.06, -L * 0.37); ctx.closePath(); };
  win(); paint(ctx, '#d9f1ff');
  if (drawPeople) { ctx.save(); win(); ctx.clip(); drawPeople(ctx, {x: L * 0.06, y: -L * 0.54, w: L * 0.27, h: L * 0.17}); ctx.restore(); }
  win(); paint(ctx, null, lw);
  ctx.beginPath(); ctx.moveTo(L * 0.035, -L * 0.56); ctx.lineTo(L * 0.035, -L * 0.13); paint(ctx, null, lw);
  // side decal
  cupcake(ctx, {cake: 'vanilla', frosting: 'pink', toppings: ['sprinkles', 'cherry']}, -L * 0.24, -L * 0.17, L * 0.34, t);
  if (name) text(ctx, name, -L * 0.24, -L * 0.13, L * 0.045, {color: '#fff', stroke: C.ink, sw: L * 0.012, weight: 700});
  // lights and bumper
  ellipse(ctx, L * 0.47, -L * 0.27, L * 0.02, L * 0.03, '#fff6b0', lw * 0.7);
  rr(ctx, L * 0.36, -L * 0.14, L * 0.15, L * 0.04, L * 0.02); paint(ctx, '#d9d9e3', lw * 0.8);
  rr(ctx, -L * 0.5, -L * 0.14, L * 0.08, L * 0.04, L * 0.02); paint(ctx, '#d9d9e3', lw * 0.8);
  // roof cupcake
  rr(ctx, -L * 0.24, -L * 0.64, L * 0.16, L * 0.04, L * 0.02); paint(ctx, '#d9d9e3', lw * 0.8);
  cupcake(ctx, {cake: 'chocolate', frosting: 'pink', toppings: ['cherry']}, -L * 0.16, -L * 0.635, L * 0.2, t);
  // wheels
  for (const wx of [-L * 0.3, L * 0.3]) {
    circle(ctx, wx, -L * 0.1, L * 0.1, '#4a3c3a', lw);
    circle(ctx, wx, -L * 0.1, L * 0.05, '#e7e3ee', lw * 0.8);
    ctx.save(); ctx.translate(wx, -L * 0.1); ctx.rotate(roll / (L * 0.1));
    for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L * 0.045, 0); paint(ctx, null, lw * 0.7, '#9b96a8'); }
    ctx.restore();
  }
  ctx.restore();
}

// Top-down van for the town map; tile = tile size in pixels. Baxter's head pokes out of the passenger window.
export function vanTop(ctx, x, y, angle, tile, paintId, {t = 0, moving = false} = {}) {
  const p = PAINTS[paintId] || PAINTS.pink, lw = Math.max(1.5, tile * 0.028), u = tile;
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.lineJoin = 'round';
  const art = vanArt('v2-van-top', paintId);
  if (art) {
    const len = u * 1.04, wid = len * art.height / art.width;
    rr(ctx, -len / 2 + u * 0.04, -wid / 2 + u * 0.05, len, wid, u * 0.14); ctx.fillStyle = 'rgba(40,30,40,.2)'; ctx.fill();
    ctx.drawImage(art, -len / 2, -wid / 2, len, wid);
  } else {
  rr(ctx, -u * 0.47, -u * 0.25, u * 1.0, u * 0.56, u * 0.14); ctx.fillStyle = 'rgba(40,30,40,.2)'; ctx.fill();
  for (const [wx, wy] of [[-0.3, -0.27], [-0.3, 0.27], [0.28, -0.27], [0.28, 0.27]]) { rr(ctx, wx * u - u * 0.08, wy * u - u * 0.045, u * 0.16, u * 0.09, u * 0.03); paint(ctx, '#4a3c3a'); }
  rr(ctx, -u * 0.5, -u * 0.27, u * 1.0, u * 0.54, u * 0.14); paint(ctx, p.body, lw);
  // stripes down both sides and a lighter hood
  ctx.fillStyle = p.stripe; ctx.fillRect(-u * 0.44, -u * 0.23, u * 0.6, u * 0.05); ctx.fillRect(-u * 0.44, u * 0.18, u * 0.6, u * 0.05);
  rr(ctx, u * 0.27, -u * 0.24, u * 0.2, u * 0.48, u * 0.1); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fill();
  // windshield
  ctx.beginPath(); ctx.moveTo(u * 0.14, -u * 0.2); ctx.lineTo(u * 0.27, -u * 0.23); ctx.lineTo(u * 0.27, u * 0.23); ctx.lineTo(u * 0.14, u * 0.2); ctx.closePath(); paint(ctx, '#bfe6ff', lw * 0.8);
  // headlights and the roof heart
  circle(ctx, u * 0.47, -u * 0.17, u * 0.035, '#fff6b0', lw * 0.5); circle(ctx, u * 0.47, u * 0.17, u * 0.035, '#fff6b0', lw * 0.5);
  ctx.save(); ctx.translate(-u * 0.16, 0); ctx.rotate(Math.PI / 2); heartPath(ctx, 0, u * 0.02, u * 0.17); paint(ctx, '#fff', lw * 0.8); heartPath(ctx, 0, u * 0.02, u * 0.1); paint(ctx, '#ff7eb6'); ctx.restore();
  }
  // Baxter, ears flapping in the wind
  const flap = moving ? Math.sin(t * 22) * 0.45 : 0;
  ctx.save(); ctx.translate(u * 0.04, u * 0.31);
  for (const side of [-1, 1]) { ctx.save(); ctx.rotate(Math.PI + side * (0.5 + flap * side)); rr(ctx, 0, -u * 0.035, u * 0.15, u * 0.07, u * 0.035); paint(ctx, '#b07d4f', lw * 0.6); ctx.restore(); }
  ellipse(ctx, 0, 0, u * 0.11, u * 0.095, '#fff8ee', lw * 0.7);
  ellipse(ctx, -u * 0.03, -u * 0.01, u * 0.05, u * 0.06, '#d9a86e');
  circle(ctx, u * 0.1, 0, u * 0.028, C.ink);
  ctx.restore();
  ctx.restore();
}

// ---------- the town, pre-drawn once ----------
const ROOF = ['#f48fb5', '#8fc8f2', '#ffd66b', '#c3a6ec', '#8fdcb8', '#ffb38a'];
const WALL = ['#fff3e6', '#fff8d9', '#f2f7ff', '#fff0f5', '#f0fff6', '#fff4ea'];

function tree(ctx, cx, cy, s, lw, v) {
  ellipse(ctx, cx + s * 0.06, cy + s * 0.1, s * 0.34, s * 0.22, 'rgba(60,90,40,.25)');
  circle(ctx, cx, cy, s * 0.34, v % 2 ? '#7ccf7a' : '#6fc27a', lw);
  circle(ctx, cx - s * 0.1, cy - s * 0.1, s * 0.16, 'rgba(255,255,255,.22)');
  if (v % 3 === 0) for (let i = 0; i < 3; i++) circle(ctx, cx + Math.cos(i * 2.1) * s * 0.16, cy + Math.sin(i * 2.1) * s * 0.16, s * 0.04, '#ff7a8a');
}

// Painted map tiles (T1-T12); the -tile copies are square and untrimmed so they line up with the grid.
const PARK_ART = ['t17-playground', 't18-fountain', 't16-bench'];
const HOUSE_TILES = ['t1-house-pink-tile', 't2-house-blue-tile', 't3-house-yellow-tile', 't4-house-lavender-tile', 't5-house-mint-tile', 't6-house-peach-tile'];
export function renderTown(town, S, taken = {}) {
  const cv = document.createElement('canvas');
  cv.width = town.w * S; cv.height = town.h * S;
  const ctx = cv.getContext('2d');
  const lw = Math.max(1.2, S * 0.03);
  const isRoad = (x, y) => x >= 0 && y >= 0 && x < town.w && y < town.h && town.tiles[y * town.w + x] === T.ROAD;
  ctx.fillStyle = C.grass; ctx.fillRect(0, 0, cv.width, cv.height);
  for (let y = 0; y < town.h; y++) for (let x = 0; x < town.w; x++) {
    const t = town.tiles[y * town.w + x], v = town.variant[y * town.w + x], px = x * S, py = y * S;
    if (t !== T.ROAD) {
      ctx.fillStyle = (x + y) % 2 ? C.grass : '#c4e9a8'; ctx.fillRect(px, py, S, S);
      if ((x * 7 + y * 3) % 5 === 0) { ctx.strokeStyle = C.grassD; ctx.lineWidth = lw * 0.6; ctx.beginPath(); ctx.moveTo(px + S * 0.3, py + S * 0.7); ctx.lineTo(px + S * 0.33, py + S * 0.6); ctx.moveTo(px + S * 0.37, py + S * 0.7); ctx.lineTo(px + S * 0.38, py + S * 0.58); ctx.stroke(); }
    }
    if (t === T.ROAD) {
      ctx.fillStyle = C.road; ctx.fillRect(px, py, S, S);
      ctx.fillStyle = C.curb;
      const c = S * 0.08;
      if (!isRoad(x, y - 1)) ctx.fillRect(px, py, S, c);
      if (!isRoad(x, y + 1)) ctx.fillRect(px, py + S - c, S, c);
      if (!isRoad(x - 1, y)) ctx.fillRect(px, py, c, S);
      if (!isRoad(x + 1, y)) ctx.fillRect(px + S - c, py, c, S);
      ctx.fillStyle = '#fff6c9';
      const h = isRoad(x - 1, y) && isRoad(x + 1, y), vv = isRoad(x, y - 1) && isRoad(x, y + 1);
      if (h && !vv) { ctx.fillRect(px + S * 0.1, py + S * 0.47, S * 0.3, S * 0.06); ctx.fillRect(px + S * 0.6, py + S * 0.47, S * 0.3, S * 0.06); }
      if (vv && !h) { ctx.fillRect(px + S * 0.47, py + S * 0.1, S * 0.06, S * 0.3); ctx.fillRect(px + S * 0.47, py + S * 0.6, S * 0.06, S * 0.3); }
      if (h && vv) { ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(px + S / 2, py + S / 2, S * 0.28, 0, Math.PI * 2); ctx.fill(); }
    } else if (t === T.HOUSE && image(HOUSE_TILES[v % 6])) {
      ctx.drawImage(image(HOUSE_TILES[v % 6]), px, py, S, S);
    } else if (t === T.TREE && image(v % 3 === 0 ? 't8-tree-blossom-tile' : 't7-tree-tile')) {
      ctx.drawImage(image(v % 3 === 0 ? 't8-tree-blossom-tile' : 't7-tree-tile'), px + S * 0.04, py + S * 0.04, S * 0.92, S * 0.92);
    } else if (t === T.FLOWER && image('t10-flowers-tile')) {
      ctx.drawImage(image('t10-flowers-tile'), px + S * 0.08, py + S * 0.08, S * 0.84, S * 0.84);
    } else if (t === T.POND && image('t9-pond-tile')) {
      ctx.fillStyle = '#cdeeb4'; ctx.fillRect(px, py, S, S);
      ctx.drawImage(image('t9-pond-tile'), px, py, S, S);
    } else if (t === T.SHOP && v === 1 && image('t11-shop-roof')) {
      const roof = image('t11-shop-roof'), k = Math.min(S * 1.9 / roof.width, S * 0.94 / roof.height), w = roof.width * k, hh = roof.height * k;
      ctx.drawImage(roof, px - S + (S * 2 - w) / 2, py + (S - hh) / 2, w, hh);
    } else if (t === T.PARK && image(PARK_ART[v % 3])) {
      // a playground, a fountain or a bench in each bit of park
      ctx.fillStyle = '#cdeeb4'; ctx.fillRect(px, py, S, S);
      const img = image(PARK_ART[v % 3]), k = S * (v % 3 === 2 ? 0.62 : 0.86) / Math.max(img.width, img.height);
      ctx.drawImage(img, px + (S - img.width * k) / 2, py + (S - img.height * k) / 2, img.width * k, img.height * k);
    } else if (t === T.HOUSE) {
      const roof = ROOF[v % ROOF.length];
      ctx.fillStyle = 'rgba(91,58,41,.18)'; ctx.fillRect(px + S * 0.16, py + S * 0.18, S * 0.76, S * 0.74);
      rr(ctx, px + S * 0.12, py + S * 0.12, S * 0.76, S * 0.72, S * 0.08); paint(ctx, roof, lw);
      ctx.beginPath(); ctx.moveTo(px + S * 0.12, py + S * 0.48); ctx.lineTo(px + S * 0.88, py + S * 0.48); paint(ctx, null, lw * 0.8);
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(px + S * 0.15, py + S * 0.16, S * 0.7, S * 0.12);
      rr(ctx, px + S * 0.62, py + S * 0.2, S * 0.12, S * 0.14, S * 0.02); paint(ctx, '#d9876a', lw * 0.7);
      rr(ctx, px + S * 0.42, py + S * 0.84, S * 0.16, S * 0.14, S * 0.02); paint(ctx, '#f3e7d3');
    } else if (t === T.TREE) {
      tree(ctx, px + S / 2, py + S / 2, S, lw, v);
    } else if (t === T.FLOWER) {
      for (let i = 0; i < 4; i++) {
        const fx = px + S * (0.25 + (i % 2) * 0.5), fy = py + S * (0.3 + Math.floor(i / 2) * 0.4);
        for (let k = 0; k < 5; k++) circle(ctx, fx + Math.cos(k * 1.26) * S * 0.06, fy + Math.sin(k * 1.26) * S * 0.06, S * 0.045, ['#ff9fc4', '#fff1a8', '#c3a6ec', '#ffb38a'][(i + v) % 4]);
        circle(ctx, fx, fy, S * 0.035, '#ffd23d');
      }
    } else if (t === T.PARK) {
      ctx.fillStyle = '#cdeeb4'; ctx.fillRect(px, py, S, S);
      rr(ctx, px + S * 0.42, py, S * 0.16, S, 0); paint(ctx, '#f3e2c0');
    } else if (t === T.POND) {
      ctx.fillStyle = '#cdeeb4'; ctx.fillRect(px, py, S, S);
      ellipse(ctx, px + S / 2, py + S / 2, S * 0.42, S * 0.34, '#8fd0f5', lw);
      ellipse(ctx, px + S * 0.4, py + S * 0.45, S * 0.12, S * 0.07, '#7ccf7a');
      circle(ctx, px + S * 0.62, py + S * 0.52, S * 0.05, '#fff');
    } else if (t === T.LOT) {
      ctx.fillStyle = '#ecd3a3'; ctx.fillRect(px, py, S, S);
      ctx.fillStyle = 'rgba(193,141,95,.35)'; ctx.fillRect(px + S * 0.1, py + S * 0.6, S * 0.2, S * 0.08);
    } else if (t === T.SHOP && v === 1) {
      // two tiles wide: this is the right half, so draw the whole roof from one tile to the left
      const sx = px - S;
      ctx.fillStyle = 'rgba(91,58,41,.18)'; ctx.fillRect(sx + S * 0.14, py + S * 0.16, S * 1.8, S * 0.78);
      rr(ctx, sx + S * 0.08, py + S * 0.1, S * 1.84, S * 0.76, S * 0.1); paint(ctx, '#fff', lw);
      ctx.save(); rr(ctx, sx + S * 0.08, py + S * 0.1, S * 1.84, S * 0.76, S * 0.1); ctx.clip();
      for (let i = 0; i < 10; i += 2) { ctx.fillStyle = C.pink; ctx.fillRect(sx + S * 0.08 + i * S * 0.185, py, S * 0.185, S); }
      ctx.restore();
      rr(ctx, sx + S * 0.08, py + S * 0.1, S * 1.84, S * 0.76, S * 0.1); paint(ctx, null, lw);
      cupcake(ctx, {cake: 'vanilla', frosting: 'pink', toppings: ['cherry']}, sx + S, py + S * 0.78, S * 0.62);
    }
  }
  // lots get a fence and a sign: something is coming here later
  const lots = {};
  for (let y = 0; y < town.h; y++) for (let x = 0; x < town.w; x++) if (town.tiles[y * town.w + x] === T.LOT) {
    const v = town.variant[y * town.w + x];
    const b = lots[v] || (lots[v] = {x0: x, y0: y, x1: x, y1: y});
    b.x0 = Math.min(b.x0, x); b.y0 = Math.min(b.y0, y); b.x1 = Math.max(b.x1, x); b.y1 = Math.max(b.y1, y);
  }
  for (const [v, b] of Object.entries(lots)) {
    const x0 = b.x0 * S + S * 0.12, y0 = b.y0 * S + S * 0.12, w = (b.x1 - b.x0 + 1) * S - S * 0.24, h = (b.y1 - b.y0 + 1) * S - S * 0.24;
    if (taken[v]) { shopRoof(ctx, taken[v], b.x0 * S, b.y0 * S, (b.x1 - b.x0 + 1) * S, (b.y1 - b.y0 + 1) * S, S, lw); continue; }
    if (image('t12-lot')) ctx.drawImage(image('t12-lot'), x0 - S * 0.06, y0 - S * 0.06, w + S * 0.12, h + S * 0.12);
    else { ctx.setLineDash([S * 0.12, S * 0.08]); rr(ctx, x0, y0, w, h, S * 0.08); paint(ctx, null, lw * 1.2, '#c18d5f'); ctx.setLineDash([]); }
    const cx = x0 + w / 2, cy = y0 + h / 2;
    rr(ctx, cx - S * 0.5, cy - S * 0.35, S, S * 0.6, S * 0.1); paint(ctx, '#fff8ee', lw);
    text(ctx, '?', cx, cy - S * 0.05, S * 0.45, {color: C.pink, weight: 700});
    ctx.beginPath(); ctx.moveTo(cx, cy + S * 0.25); ctx.lineTo(cx, cy + S * 0.55); paint(ctx, null, lw * 1.5, '#a8784a');
  }
  return cv;
}

// A new shop seen from above on the map: a paved yard, a striped roof and the shop's sign in the middle.
function shopRoof(ctx, id, x, y, w, h, S, lw) {
  const shop = SHOPS[id];
  ctx.fillStyle = '#f3e7d3'; ctx.fillRect(x, y, w, h);
  const rx = x + S * 0.3, ry = y + S * 0.3, rw = w - S * 0.6, rh = h - S * 0.75;
  ctx.fillStyle = 'rgba(91,58,41,.18)'; ctx.fillRect(rx + S * 0.08, ry + S * 0.1, rw, rh);
  rr(ctx, rx, ry, rw, rh, S * 0.14); paint(ctx, shop.color, lw);
  ctx.save(); rr(ctx, rx, ry, rw, rh, S * 0.14); ctx.clip();
  for (let i = 0; i < 12; i += 2) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(rx + i * rw / 12, ry, rw / 12, rh); }
  ctx.restore();
  rr(ctx, rx, ry, rw, rh, S * 0.14); paint(ctx, null, lw);
  circle(ctx, rx + rw / 2, ry + rh / 2, S * 0.5, '#fff8ee', lw);
  shopIcon(ctx, id, rx + rw / 2, ry + rh / 2, S * 0.62);
  // the awning along the front, facing the street below
  rr(ctx, rx + rw * 0.2, ry + rh - S * 0.05, rw * 0.6, S * 0.28, S * 0.06); paint(ctx, shop.trim, lw);
}

// Each new shop's sign: scissors for the salon, a teddy bear for the toy shop. x, y is the middle.
export function shopIcon(ctx, id, x, y, s) {
  const lw = Math.max(1.5, s * 0.06);
  ctx.save(); ctx.translate(x, y);
  if (id === 'salon') {
    for (const k of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(k * s * 0.12, s * 0.12); ctx.lineTo(-k * s * 0.18, -s * 0.42); ctx.lineTo(-k * s * 0.05, -s * 0.4); ctx.closePath(); paint(ctx, '#e8eef5', lw);
      circle(ctx, k * s * 0.2, s * 0.26, s * 0.14, C.pink, lw);
      circle(ctx, k * s * 0.2, s * 0.26, s * 0.06, '#fff8ee', lw * 0.7);
    }
    circle(ctx, 0, -s * 0.04, s * 0.04, C.ink);
  } else {
    for (const k of [-1, 1]) { circle(ctx, k * s * 0.26, -s * 0.24, s * 0.13, '#c9915f', lw); circle(ctx, k * s * 0.26, -s * 0.24, s * 0.06, '#f2c9a0'); }
    circle(ctx, 0, 0, s * 0.33, '#c9915f', lw);
    ellipse(ctx, 0, s * 0.1, s * 0.15, s * 0.11, '#f2c9a0', lw * 0.7);
    circle(ctx, 0, s * 0.05, s * 0.04, C.ink);
    for (const k of [-1, 1]) circle(ctx, k * s * 0.12, -s * 0.07, s * 0.035, C.ink);
  }
  ctx.restore();
}

// A new shop going up, seen from the front: x is its middle, y the ground, w its width. Builder Bo adds a
// part each time she taps: 1 the base, 2 the frame, 3 the walls, 4 the roof, 5 the window, door and
// awning, 6 the sign. A red ribbon hangs across the door until she cuts it.
export const BUILD_STAGES = 6;
export function shopFront(ctx, id, x, y, w, stage, {ribbon = false, t = 0} = {}) {
  const shop = SHOPS[id], lw = Math.max(2, w * 0.012);
  const wallH = w * 0.6, left = x - w / 2, top = y - wallH;
  if (stage < 1) {
    // the fenced lot
    for (let i = 0; i <= 8; i++) { rr(ctx, left + i * w / 8 - w * 0.025, y - w * 0.2, w * 0.05, w * 0.2, w * 0.01); paint(ctx, C.wood, lw); }
    rr(ctx, left - w * 0.03, y - w * 0.15, w * 1.06, w * 0.04, w * 0.01); paint(ctx, C.woodD, lw);
    return;
  }
  rr(ctx, left - w * 0.04, y - w * 0.05, w * 1.08, w * 0.06, w * 0.01); paint(ctx, '#d9cfc3', lw);
  if (stage === 2) {
    for (let i = 0; i <= 4; i++) { rr(ctx, left + i * w / 4 - w * 0.02, top, w * 0.04, wallH - w * 0.05, 0); paint(ctx, C.wood, lw); }
    rr(ctx, left - w * 0.02, top - w * 0.02, w * 1.04, w * 0.05, 0); paint(ctx, C.woodD, lw);
    return;
  }
  if (stage >= 3) {
    rr(ctx, left, top, w, wallH - w * 0.05, w * 0.02); paint(ctx, mix(shop.color, '#ffffff', 0.45), lw);
    for (let i = 1; i < 6; i++) { ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(left + i * w / 6 - w * 0.008, top + w * 0.02, w * 0.016, wallH - w * 0.1); }
  }
  if (stage >= 4) {
    ctx.beginPath(); ctx.moveTo(left - w * 0.08, top + w * 0.02); ctx.lineTo(x, top - w * 0.3); ctx.lineTo(left + w * 1.08, top + w * 0.02); ctx.closePath(); paint(ctx, shop.color, lw);
    circle(ctx, x, top - w * 0.13, w * 0.08, '#fff8ee', lw);
  }
  if (stage >= 5) {
    // big window on the left, door on the right, striped awning over the window
    rr(ctx, left + w * 0.08, top + w * 0.2, w * 0.46, w * 0.26, w * 0.02); paint(ctx, '#d6efff', lw);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(left + w * 0.12, top + w * 0.23, w * 0.06, w * 0.18);
    rr(ctx, left + w * 0.64, top + w * 0.18, w * 0.26, wallH - w * 0.23, w * 0.03); paint(ctx, shop.trim, lw);
    circle(ctx, left + w * 0.69, top + w * 0.36, w * 0.015, C.ink);
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.rect(left + w * 0.05 + i * w * 0.087, top + w * 0.1, w * 0.087, w * 0.08); paint(ctx, i % 2 ? '#fff' : shop.trim, lw * 0.8);
      ctx.beginPath(); ctx.arc(left + w * 0.05 + (i + 0.5) * w * 0.087, top + w * 0.18, w * 0.0435, 0, Math.PI); paint(ctx, i % 2 ? '#fff' : shop.trim, lw * 0.8);
    }
  }
  if (stage >= 6) {
    shopIcon(ctx, id, x, top - w * 0.13, w * 0.12);
    rr(ctx, left + w * 0.12, top - w * 0.02, w * 0.76, w * 0.1, w * 0.03); paint(ctx, '#fff8ee', lw);
    const size = fitSize(ctx, shop.name, w * 0.06, w * 0.7, 700);
    text(ctx, shop.name, x, top + w * 0.03, size, {weight: 700});
  }
  if (ribbon) {
    const ry = top + w * 0.38, sway = Math.sin(t * 2) * w * 0.006;
    ctx.beginPath(); ctx.moveTo(left - w * 0.02, ry); ctx.quadraticCurveTo(x, ry + w * 0.05 + sway, left + w * 1.02, ry); paint(ctx, null, w * 0.025, '#e8506a');
    for (const k of [-1, 1]) { ellipse(ctx, x + k * w * 0.05, ry + w * 0.03, w * 0.05, w * 0.03, '#e8506a', lw * 0.8); }
    circle(ctx, x, ry + w * 0.035, w * 0.022, '#c23a52', lw * 0.8);
  }
}

// The street in front of the building site: sky, hills, a lawn and the sidewalk. Returns the ground line.
export function siteScene(ctx, W, H, gy, t = 0) {
  sky(ctx, W, H, t);
  hills(ctx, W, gy - H * 0.08, '#cdeccf', H * 0.03, 0.8);
  hills(ctx, W, gy - H * 0.03, C.grass, H * 0.02, 2.2);
  ctx.fillStyle = '#ecd3a3'; ctx.fillRect(0, gy - H * 0.01, W, H * 0.03);
  ctx.fillStyle = '#efe6dc'; ctx.fillRect(0, gy + H * 0.02, W, H * 0.06);
  ctx.fillStyle = C.road; ctx.fillRect(0, gy + H * 0.08, W, H);
}

// ---------- the hair salon (stand-ins until its pictures are made) ----------
// The salon inside: striped wallpaper, a big mirror, a salon chair and a checkered floor. gy is the floor line.
export function salonRoom(ctx, W, H, gy, t = 0) {
  ctx.fillStyle = '#f1e8fb'; ctx.fillRect(0, 0, W, gy);
  for (let x = 0; x < W; x += 36) { ctx.fillStyle = 'rgba(195,166,236,.28)'; ctx.fillRect(x, 0, 18, gy); }
  // a strip of little lights along the top
  for (let i = 0; i < 9; i++) circle(ctx, W * (i + 0.5) / 9, H * 0.12 + Math.sin(i * 1.7) * 4, 5, `hsl(${(i * 47 + t * 25) % 360} 80% 78%)`, 1.5);
  // the mirror and the shelf of bottles
  const mx = W * 0.08, my = gy - H * 0.42, mw = W * 0.46, mh = H * 0.3;
  rr(ctx, mx - 8, my - 8, mw + 16, mh + 16, 40); paint(ctx, '#f7a8c8', 3);
  rr(ctx, mx, my, mw, mh, 34); paint(ctx, '#dff3ff', 3);
  ctx.save(); rr(ctx, mx, my, mw, mh, 34); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.moveTo(mx + mw * 0.15, my); ctx.lineTo(mx + mw * 0.35, my); ctx.lineTo(mx + mw * 0.05, my + mh); ctx.lineTo(mx - mw * 0.15, my + mh); ctx.fill();
  ctx.restore();
  rr(ctx, W * 0.62, gy - H * 0.36, W * 0.32, H * 0.02, 4); paint(ctx, C.wood, 2.5);
  [['#9fe3c0', 0.66], ['#f27aa9', 0.74], ['#ffe08a', 0.82], ['#8ccaf5', 0.89]].forEach(([c, k], i) => {
    const bx = W * k, bh = H * (0.05 + (i % 2) * 0.015);
    rr(ctx, bx - 8, gy - H * 0.36 - bh, 16, bh, 5); paint(ctx, c, 2.5);
    rr(ctx, bx - 4, gy - H * 0.36 - bh - 8, 8, 9, 2); paint(ctx, '#fff', 2);
  });
  // floor
  const tile = Math.max(24, W / 12);
  for (let y = gy; y < H; y += tile) for (let x = 0; x < W; x += tile) { ctx.fillStyle = ((x + y) / tile) % 2 < 1 ? '#fff8ee' : '#e8dcf5'; ctx.fillRect(x, y, tile, tile); }
  ctx.fillStyle = 'rgba(91,58,41,.12)'; ctx.fillRect(0, gy, W, 4);
  return {mirror: {x: mx, y: my, w: mw, h: mh}};
}
// The salon chair: x its middle, y the floor, s its height.
export function salonChair(ctx, x, y, s) {
  rr(ctx, x - s * 0.04, y - s * 0.32, s * 0.08, s * 0.3, 3); paint(ctx, '#c9c9d6', 2.5);
  ellipse(ctx, x, y - s * 0.02, s * 0.22, s * 0.05, '#a7a9b7', 2.5);
  rr(ctx, x - s * 0.3, y - s * 0.5, s * 0.6, s * 0.18, s * 0.06); paint(ctx, '#f27aa9', 3);
  rr(ctx, x - s * 0.26, y - s, s * 0.52, s * 0.55, s * 0.12); paint(ctx, '#f27aa9', 3);
  rr(ctx, x - s * 0.2, y - s * 0.92, s * 0.4, s * 0.38, s * 0.08); paint(ctx, '#ff9fc4', 0);
}

// A clock to set: hands at {h, m}. A hand left as null isn't drawn. `active` lights up the hand being set,
// `ghost` shows where the hands should go, faintly.
export function clockFace(ctx, x, y, r, time, {active = null, ghost = null} = {}) {
  const lw = Math.max(2.5, r * 0.035);
  circle(ctx, x, y + r * 0.04, r * 1.08, 'rgba(91,58,41,.18)');
  circle(ctx, x, y, r * 1.08, '#c3a6ec', lw);
  circle(ctx, x, y, r * 0.94, '#fff', lw);
  for (let i = 0; i < 60; i++) {
    const a = i / 60 * Math.PI * 2, big = i % 5 === 0, r0 = r * (big ? 0.8 : 0.86);
    ctx.beginPath(); ctx.moveTo(x + Math.sin(a) * r0, y - Math.cos(a) * r0); ctx.lineTo(x + Math.sin(a) * r * 0.9, y - Math.cos(a) * r * 0.9);
    paint(ctx, null, big ? lw : lw * 0.45, big ? C.ink : 'rgba(91,58,41,.45)');
  }
  for (let n = 1; n <= 12; n++) {
    const a = n / 12 * Math.PI * 2;
    text(ctx, String(n), x + Math.sin(a) * r * 0.64, y - Math.cos(a) * r * 0.64, r * 0.19, {weight: 700});
  }
  const hand = (turn, len, width, color, glow) => {
    const a = turn * Math.PI * 2, ex = x + Math.sin(a) * len, ey = y - Math.cos(a) * len;
    ctx.lineCap = 'round';
    if (glow) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); paint(ctx, null, width + r * 0.08, 'rgba(255,224,138,.9)'); }
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); paint(ctx, null, width + lw * 1.4, C.ink);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); paint(ctx, null, width, color);
    ctx.lineCap = 'butt';
  };
  const hourTurn = t => ((t.h % 12) + (t.m || 0) / 60) / 12;
  if (ghost) {
    ctx.globalAlpha = 0.35;
    hand(hourTurn(ghost), r * 0.45, r * 0.09, C.pink); hand(ghost.m / 60, r * 0.72, r * 0.05, C.skyD);
    ctx.globalAlpha = 1;
  }
  if (time.h != null) hand(hourTurn(time), r * 0.45, r * 0.09, C.pink, active === 'hour');
  if (time.m != null) hand(time.m / 60, r * 0.72, r * 0.05, C.skyD, active === 'minute');
  circle(ctx, x, y, r * 0.07, C.ink);
}
// Which number on the clock (1-12) a tap at (px, py) is nearest, or null if it's not on the face.
export function clockNumberAt(x, y, r, px, py) {
  const dx = px - x, dy = py - y, d = Math.hypot(dx, dy);
  if (d < r * 0.2 || d > r * 1.2) return null;
  const n = Math.round(Math.atan2(dx, -dy) / (Math.PI * 2) * 12);
  return ((n + 12) % 12) || 12;
}

// The measuring board: a ruler from 0 to `inches`, with a lock of hair lying along it from 0 to `hair`.
// Returns where each inch mark is so taps can be matched to them. `cut` is the snip so far (the cut-off
// end slides away as `fall` goes from 0 to 1); `mark` bounces a mark to show where to cut.
export function measureBoard(ctx, x, y, w, inches, hair, {color = '#8b5a3c', cut = null, fall = 0, mark = null, counting = null, t = 0} = {}) {
  const lw = Math.max(2, w * 0.006), pad = w * 0.06, step = (w - pad * 2) / inches, x0 = x + pad;
  const boardH = w * 0.36;
  rr(ctx, x, y, w, boardH, w * 0.04); paint(ctx, '#fff8ee', lw * 1.3);
  // the hair: a wavy lock from 0 to its length, cut at `cut`
  const hy = y + boardH * 0.3, hh = boardH * 0.2;
  const lock = (from, to, dx, dy, alpha) => {
    if (to <= from) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(dx, dy);
    ctx.beginPath();
    const a = x0 + from * step, b = x0 + to * step;
    ctx.moveTo(a, hy - hh / 2);
    for (let px = a; px <= b; px += 4) ctx.lineTo(px, hy - hh / 2 + Math.sin(px * 0.08) * hh * 0.18);
    ctx.lineTo(b + hh * 0.3, hy);
    for (let px = b; px >= a; px -= 4) ctx.lineTo(px, hy + hh / 2 + Math.sin(px * 0.08 + 1) * hh * 0.18);
    ctx.closePath(); paint(ctx, color, lw);
    ctx.beginPath();
    for (let px = a + 6; px < b - 6; px += 14) { ctx.moveTo(px, hy - hh * 0.15); ctx.quadraticCurveTo(px + 6, hy, px + 12, hy + hh * 0.12); }
    paint(ctx, null, lw * 0.6, 'rgba(255,255,255,.4)');
    ctx.restore();
  };
  if (cut == null) lock(0, hair, 0, 0, 1);
  else { lock(0, cut, 0, 0, 1); lock(cut, hair, fall * step * 1.5, fall * boardH * 0.9, 1 - fall); }
  // the ruler
  const ry = y + boardH * 0.52, rh = boardH * 0.4;
  rr(ctx, x0 - step * 0.3, ry, step * (inches + 0.6), rh, rh * 0.15); paint(ctx, '#ffe08a', lw);
  const marks = [];
  for (let i = 0; i <= inches; i++) {
    const mx = x0 + i * step;
    marks.push(mx);
    if (counting && i <= counting.from && i >= counting.to) { circle(ctx, mx, ry + rh * 0.72, step * 0.36, i === counting.to ? 'rgba(242,122,169,.55)' : 'rgba(159,227,192,.6)'); }
    ctx.beginPath(); ctx.moveTo(mx, ry); ctx.lineTo(mx, ry + rh * 0.42); paint(ctx, null, lw, C.ink);
    if (i < inches) { ctx.beginPath(); ctx.moveTo(mx + step / 2, ry); ctx.lineTo(mx + step / 2, ry + rh * 0.22); paint(ctx, null, lw * 0.6, C.ink); }
    text(ctx, String(i), mx, ry + rh * 0.72, Math.min(step * 0.6, rh * 0.42), {weight: 700});
  }
  if (mark != null) {
    const mx = x0 + mark * step, bob = Math.abs(Math.sin(t * 6)) * step * 0.25;
    ctx.beginPath(); ctx.moveTo(mx, ry - 4 - bob); ctx.lineTo(mx - step * 0.25, ry - step * 0.45 - bob); ctx.lineTo(mx + step * 0.25, ry - step * 0.45 - bob); ctx.closePath(); paint(ctx, C.pink, lw);
  }
  return {marks, top: y, bottom: y + boardH, hy, step};
}
// Snipping scissors, drawn open or closed.
export function scissors(ctx, x, y, s, open = 0.4) {
  for (const k of [-1, 1]) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(k * open * 0.5);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-s * 0.06, -s * 0.55); ctx.lineTo(s * 0.06, -s * 0.5); ctx.closePath(); paint(ctx, '#e8eef5', Math.max(1.5, s * 0.03));
    circle(ctx, k * s * 0.08, s * 0.22, s * 0.11, C.pink, Math.max(1.5, s * 0.03));
    ctx.restore();
  }
}
// A finishing touch on a client's head: a bow, sparkles or a flower. x, y is the top of the head.
export function styleTouch(ctx, id, x, y, s, t = 0) {
  const lw = Math.max(1.5, s * 0.06);
  if (id === 'bow') {
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + k * s * 0.6, y - s * 0.45, x + k * s * 0.55, y + s * 0.3); ctx.closePath(); paint(ctx, C.pink, lw); }
    circle(ctx, x, y, s * 0.14, '#e8508a', lw);
  } else if (id === 'flower') {
    for (let i = 0; i < 5; i++) circle(ctx, x + Math.cos(i * 1.257) * s * 0.22, y + Math.sin(i * 1.257) * s * 0.22, s * 0.18, '#fff1a8', lw);
    circle(ctx, x, y, s * 0.13, '#ffb38a', lw);
  } else {
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7 + t * 0.6, rx = x + Math.cos(a) * s * 0.7, ry = y - s * 0.2 + Math.sin(a) * s * 0.45, k = 0.7 + 0.3 * Math.sin(t * 5 + i);
      starPath(ctx, rx, ry, s * 0.2 * k); paint(ctx, '#ffe08a', lw * 0.8);
    }
  }
}

// ---------- scenes ----------
function sky(ctx, W, H, t, top = '#9fd8ff', bottom = '#e6f6ff') {
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.6);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 4; i++) {
    const cx = ((i * 0.31 + t * 0.006 * (1 + i * 0.3)) % 1.3 - 0.15) * W, cy = H * (0.06 + (i % 2) * 0.07), s = W * (0.08 + (i % 3) * 0.02);
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.6, 0, Math.PI * 2); ctx.arc(cx + s * 0.6, cy + s * 0.1, s * 0.5, 0, Math.PI * 2); ctx.arc(cx - s * 0.6, cy + s * 0.12, s * 0.45, 0, Math.PI * 2); ctx.fill();
  }
}
function hills(ctx, W, y, color, amp, phase) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, y);
  for (let x = 0; x <= W; x += W / 24) ctx.lineTo(x, y - Math.sin(x / W * 5 + phase) * amp - amp);
  ctx.lineTo(W, y + 400); ctx.lineTo(0, y + 400); ctx.closePath(); ctx.fill();
}
function rain(ctx, W, H, t) {
  ctx.fillStyle = 'rgba(80,100,140,.12)'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let i = 0; i < 70; i++) { const x = (i * 97.3 + t * 40) % W, y = (i * 53.1 + t * 600) % H; ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 14); }
  ctx.stroke();
}

// The shop seen from the street. Returns where things go so the caller can place people.
// The painted shop front (BG1), fitted so the sign, window, door and sidewalk show above the order panel.
export const streetArt = (W, H) => fitArt('bg1-shopfront', W, H, [0, 0.1, 1, 0.78], H * 0.07, H * 0.62);
export function street(ctx, W, H, o) {
  const f = streetArt(W, H);
  if (f) return paintedStreet(ctx, W, H, f, o);
  const {t = 0, save, shelf = [], groundY = H * 0.58, shopName = "Arianna's Cupcakes", event} = o;
  sky(ctx, W, H, t, event === 'rain' ? '#a9b8cc' : '#9fd8ff', event === 'rain' ? '#dfe7ef' : '#e6f6ff');
  hills(ctx, W, groundY - H * 0.25, '#cdeccf', H * 0.025, 1);
  // houses down the street behind the shop
  for (let i = 0; i < 6; i++) {
    const hx = (i / 5) * W * 1.1 - W * 0.05, hw = W * 0.18, hh = H * (0.12 + (i % 2) * 0.04), hy = groundY - H * 0.02;
    rr(ctx, hx - hw / 2, hy - hh, hw, hh, 4); paint(ctx, WALL[i % 6], 1.5);
    ctx.beginPath(); ctx.moveTo(hx - hw * 0.6, hy - hh); ctx.lineTo(hx, hy - hh - H * 0.06); ctx.lineTo(hx + hw * 0.6, hy - hh); ctx.closePath(); paint(ctx, ROOF[(i + 2) % 6], 1.5);
  }
  const L = W * 0.06, R = W * 0.94, top = H * 0.13;
  const shop = {L, R, top, awning: [H * 0.2, H * 0.265], win: {x: W * 0.13, y: H * 0.285, w: W * 0.52, h: H * 0.19}, door: {x: W * 0.71, y: H * 0.3, w: W * 0.17, h: groundY - H * 0.3}, groundY};
  // building
  rr(ctx, L, top + H * 0.04, R - L, groundY - top - H * 0.04, 6); paint(ctx, '#fff4f8', 2);
  ctx.fillStyle = 'rgba(242,122,169,.12)';
  for (let y = top + H * 0.08; y < groundY; y += H * 0.03) ctx.fillRect(L + 2, y, R - L - 4, 1.5);
  // sign
  const sw = W * 0.7, sx = W / 2 - sw / 2, sy = top - H * 0.045;
  rr(ctx, sx, sy, sw, H * 0.075, 14); paint(ctx, '#fff8ee', 2.5);
  rr(ctx, sx + 5, sy + 5, sw - 10, H * 0.075 - 10, 10); paint(ctx, null, 1.5, C.pink);
  text(ctx, shopName, W / 2, sy + H * 0.0375, Math.min(W * 0.075, H * 0.042), {color: C.pink, weight: 700, stroke: '#fff', sw: 4});
  const signLevel = save?.upg.sign || 0;
  for (let i = 0; i < signLevel * 2; i++) circle(ctx, sx + 12 + i * (sw - 24) / Math.max(1, signLevel * 2 - 1), sy + H * 0.075 + 2, 4.5, ['#ffd23d', '#ff9fc4', '#9fe3c0'][i % 3], 1.2);
  // window and counter
  const w = shop.win;
  rr(ctx, w.x - 6, w.y - 6, w.w + 12, w.h + 12, 10); paint(ctx, C.wood, 2);
  rr(ctx, w.x, w.y, w.w, w.h, 6); paint(ctx, '#fff2dc');
  ctx.fillStyle = '#ffe2ec'; for (let i = 0; i < 6; i++) ctx.fillRect(w.x + i * w.w / 6, w.y, w.w / 12, w.h);
  shop.counterY = w.y + w.h;
  // the door
  const d = shop.door;
  rr(ctx, d.x, d.y, d.w, d.h, [d.w / 2, d.w / 2, 0, 0]); paint(ctx, C.mint, 2);
  rr(ctx, d.x + d.w * 0.2, d.y + d.h * 0.12, d.w * 0.6, d.h * 0.32, [d.w * 0.3, d.w * 0.3, 4, 4]); paint(ctx, '#d9f1ff', 1.5);
  circle(ctx, d.x + d.w * 0.82, d.y + d.h * 0.58, 3, C.butter, 1.2);
  // awning
  const [a0, a1] = shop.awning;
  ctx.save(); rr(ctx, L - 6, a0, R - L + 12, a1 - a0, 4); ctx.clip();
  for (let i = 0; i < 14; i++) { ctx.fillStyle = i % 2 ? '#fff' : C.pink; ctx.fillRect(L - 6 + i * (R - L + 12) / 14, a0, (R - L + 12) / 14 + 1, a1 - a0); }
  ctx.restore();
  rr(ctx, L - 6, a0, R - L + 12, a1 - a0, 4); paint(ctx, null, 2);
  const n = 14, sc = (R - L + 12) / n;
  for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(L - 6 + sc * (i + 0.5), a1, sc / 2, 0, Math.PI); paint(ctx, i % 2 ? '#fff' : C.pink, 2); }
  // decorations
  if (save?.deco.includes('bunting')) {
    for (let i = 0; i < 9; i++) { const bx = L + i * (R - L) / 9 + 8; ctx.beginPath(); ctx.moveTo(bx, top + H * 0.045); ctx.lineTo(bx + (R - L) / 9 - 4, top + H * 0.045); ctx.lineTo(bx + (R - L) / 18 - 2, top + H * 0.07); ctx.closePath(); paint(ctx, ['#ffd23d', '#9fe3c0', '#c3a6ec', '#ff9fc4'][i % 4], 1.2); }
  }
  if (save?.deco.includes('lights')) for (let i = 0; i < 16; i++) circle(ctx, L + i * (R - L) / 15, a1 + 14 + Math.sin(i) * 2, 3.5, `hsl(${(i * 47 + t * 60) % 360} 90% 72%)`, 1);
  if (save?.deco.includes('flowers')) for (const fx of [w.x + 10, w.x + w.w - 50]) { rr(ctx, fx, groundY - H * 0.03, 40, H * 0.03, 4); paint(ctx, C.wood, 1.5); for (let k = 0; k < 5; k++) circle(ctx, fx + 6 + k * 7, groundY - H * 0.035, 5, ['#ff7a8a', '#ffd23d', '#c3a6ec'][k % 3], 1); }
  if (save?.deco.includes('balloons')) for (const [bx, c] of [[R - 8, '#ff7a8a'], [R + 6, '#ffd23d'], [R - 2, '#7fc8f5']]) { const by = top + H * 0.02 + Math.sin(t * 2 + bx) * 4; ctx.beginPath(); ctx.moveTo(bx, by + 14); ctx.lineTo(R - 2, a1 + 20); paint(ctx, null, 1); ellipse(ctx, bx, by, 11, 14, c, 1.5); }
  // sidewalk and street
  ctx.fillStyle = '#efe6dc'; ctx.fillRect(0, groundY, W, H * 0.07);
  ctx.fillStyle = 'rgba(91,58,41,.12)'; for (let x = 0; x < W; x += W / 8) ctx.fillRect(x, groundY, 1.5, H * 0.07);
  ctx.fillStyle = C.curb; ctx.fillRect(0, groundY + H * 0.07, W, H * 0.012);
  ctx.fillStyle = C.road; ctx.fillRect(0, groundY + H * 0.082, W, H);
  ctx.fillStyle = '#fff6c9'; for (let x = 0; x < W; x += W / 5) ctx.fillRect(x + W * 0.05, groundY + H * 0.15, W * 0.1, H * 0.008);
  if (event === 'rain') rain(ctx, W, H, t);
  return shop;
}

function paintedStreet(ctx, W, H, f, o) {
  const {t = 0, save, shopName = "Arianna's Cupcakes", event} = o;
  paintArt(ctx, f, H);
  // measured from the picture: the serving window, its counter ledge, the door and the sidewalk
  const [wx0, wy0] = f.at(0.105, 0.385), [wx1, wy1] = f.at(0.675, 0.536);
  const [dx0, dy0] = f.at(0.73, 0.38), [dx1, dy1] = f.at(0.93, 0.68);
  const shop = {painted: true, win: {x: wx0, y: wy0, w: wx1 - wx0, h: wy1 - wy0}, counterY: wy1, door: {x: dx0, y: dy0, w: dx1 - dx0, h: dy1 - dy0}, groundY: f.sy(0.7)};
  // the cash register sits at the right end of the counter, so the cupcakes use the rest of it
  if (image('u2-register')) { shop.register = {x: f.sx(0.615), y: wy1 + f.h * 0.004, h: f.h * 0.06}; shop.shelfW = f.sx(0.56) - wx0; }
  // the shop name on the blank sign
  const [sx, sy] = f.at(0.5, 0.162);
  text(ctx, shopName, sx, sy, fitSize(ctx, shopName, f.h * 0.04, f.w * 0.42, 700), {color: C.pink, weight: 700, stroke: '#fff', sw: 4});
  const signLevel = save?.upg.sign || 0;
  for (let i = 0; i < signLevel * 2; i++) circle(ctx, f.sx(0.27 + i * 0.46 / Math.max(1, signLevel * 2 - 1)), f.sy(0.212), f.w * 0.011, ['#ffd23d', '#ff9fc4', '#9fe3c0'][i % 3], 1.2);
  // decorations from the upgrades shop (D1-D4), with drawn ones until a picture exists
  const deco = id => save?.deco.includes(id);
  // a string of flags or lights, repeated so each flag or bulb stays small
  const strip = (name, y, copies) => {
    const img = image(name);
    if (!img) return false;
    const w = f.w * 0.98 / copies, hgt = w * img.height / img.width;
    for (let i = 0; i < copies; i++) ctx.drawImage(img, f.sx(0.01) + i * w, f.sy(y) - hgt * 0.4, w, hgt);
    return true;
  };
  if ((deco('bunting') || event === 'birthday') && !strip('d3-bunting', 0.222, 2)) bunting(ctx, f.sx(0.02), f.sx(0.98), f.sy(0.222), f.h * 0.024, 12);
  if (deco('lights') && !strip('d4-lights', 0.362, 2)) for (let i = 0; i < 16; i++) circle(ctx, f.sx(0.03 + i * 0.94 / 15), f.sy(0.365) + Math.sin(i) * 2, f.w * 0.009, `hsl(${(i * 47 + t * 60) % 360} 90% 72%)`, 1);
  if (deco('flowers')) for (const fx of [0.13, 0.55]) {
    const [bx, by] = f.at(fx, 0.715), bw = f.w * 0.09;
    if (image('d2-flowerbox')) { placeArt(ctx, image('d2-flowerbox'), bx + bw / 2, by, f.w * 0.1); continue; }
    rr(ctx, bx, by - f.h * 0.022, bw, f.h * 0.022, 4); paint(ctx, C.wood, 1.5);
    for (let k = 0; k < 5; k++) circle(ctx, bx + bw * (0.12 + k * 0.19), by - f.h * 0.026, bw * 0.12, ['#ff7a8a', '#ffd23d', '#c3a6ec'][k % 3], 1);
  }
  if (deco('balloons') && image('d1-balloons')) placeArt(ctx, image('d1-balloons'), f.sx(0.93), f.sy(0.52) + Math.sin(t * 2) * 3, f.h * 0.22, Math.sin(t * 1.3) * 0.04);
  else if (deco('balloons')) {
    const [kx, ky] = f.at(0.955, 0.5);
    for (const [ox, oy, c] of [[-0.03, 0.30, '#ff7a8a'], [0.005, 0.27, '#ffd23d'], [0.03, 0.31, '#7fc8f5']]) {
      const bx = f.sx(0.955 + ox), by = f.sy(oy) + Math.sin(t * 2 + ox * 90) * 4;
      ctx.beginPath(); ctx.moveTo(bx, by + 14); ctx.lineTo(kx, ky); paint(ctx, null, 1); ellipse(ctx, bx, by, f.w * 0.028, f.w * 0.035, c, 1.5);
    }
  }
  if (event === 'rain') rain(ctx, W, H, t);
  return shop;
}

// Cupcakes on the counter, with how many are left.
export function shelfDisplay(ctx, shop, menu, shelf, t, H) {
  const w = shop.win, items = menu.map((d, i) => ({d, n: shelf[i] || 0, i})).filter(x => x.d);
  const slotW = (shop.shelfW || w.w) / Math.max(items.length, 1);
  if (shop.register) placeArt(ctx, image('u2-register'), shop.register.x, shop.register.y, shop.register.h);
  items.forEach(({d, n, i}, k) => {
    const cx = w.x + slotW * (k + 0.5), base = shop.counterY - 4, s = Math.min(slotW * 0.42, H * 0.075);
    const show = Math.min(n, 3);
    for (let j = show - 1; j >= 0; j--) cupcake(ctx, d, cx + (j - (show - 1) / 2) * s * 0.55, base - j % 2 * 2, s, t + i);
    if (!n) text(ctx, 'sold out', cx, base - s * 0.4, s * 0.28, {color: C.pink, weight: 700, stroke: '#fff', sw: 3});
  });
  if (!shop.painted) { rr(ctx, w.x - 10, shop.counterY - 2, w.w + 20, H * 0.03, 6); paint(ctx, C.woodD, 2); }
  items.forEach(({d, n}, k) => {
    const cx = w.x + slotW * (k + 0.5);
    rr(ctx, cx - 30, shop.counterY + H * 0.035, 60, H * 0.032, 8); paint(ctx, '#fff', 1.5);
    text(ctx, `$${d.price}  ×${n}`, cx, shop.counterY + H * 0.051, H * 0.019, {weight: 700});
  });
}

// The painted kitchen (BG2): shelves, window and the oven show above the kitchen panel.
export function kitchen(ctx, W, H, o = {}) {
  const {t = 0, baking = 0, menu = [], counts = [], open = [0, H * 0.46]} = o;
  const f = fitArt('bg2-kitchen', W, H, [0, 0.03, 1, 0.6], open[0], open[1]);
  if (f) { paintArt(ctx, f, H); return f; }
  ctx.fillStyle = '#fff4ea'; ctx.fillRect(0, 0, W, H);
  const tile = W / 9;
  for (let y = 0; y < H * 0.5; y += tile) for (let x = 0; x < W; x += tile) { ctx.fillStyle = ((x + y) / tile) % 2 ? '#ffe9f1' : '#fff7fb'; ctx.fillRect(x, y, tile, tile); }
  // shelf with jars
  rr(ctx, W * 0.05, H * 0.12, W * 0.5, H * 0.015, 4); paint(ctx, C.wood, 1.5);
  ['#ff9fc4', '#9fe3c0', '#ffe08a', '#c3a6ec'].forEach((c, i) => { rr(ctx, W * (0.08 + i * 0.11), H * 0.06, W * 0.08, H * 0.06, 6); paint(ctx, '#f6fbff', 1.5); rr(ctx, W * (0.08 + i * 0.11) + 3, H * 0.085, W * 0.08 - 6, H * 0.032, 4); paint(ctx, c); rr(ctx, W * (0.085 + i * 0.11), H * 0.05, W * 0.07, H * 0.014, 3); paint(ctx, C.woodD, 1.2); });
  // window
  rr(ctx, W * 0.08, H * 0.18, W * 0.38, H * 0.2, 10); paint(ctx, '#cdeeff', 2.5);
  ctx.save(); rr(ctx, W * 0.08, H * 0.18, W * 0.38, H * 0.2, 10); ctx.clip(); hills(ctx, W, H * 0.36, '#bfe6a2', H * 0.01, t * 0.1); ctx.restore();
  ctx.beginPath(); ctx.moveTo(W * 0.27, H * 0.18); ctx.lineTo(W * 0.27, H * 0.38); ctx.moveTo(W * 0.08, H * 0.28); ctx.lineTo(W * 0.46, H * 0.28); paint(ctx, null, 2.5);
  // oven
  const ox = W * 0.56, oy = H * 0.12, ow = W * 0.38, oh = H * 0.34;
  rr(ctx, ox, oy, ow, oh, 14); paint(ctx, '#f6f1fb', 2.5);
  for (let i = 0; i < 3; i++) circle(ctx, ox + ow * (0.25 + i * 0.25), oy + oh * 0.08, ow * 0.045, '#c3a6ec', 1.5);
  rr(ctx, ox + ow * 0.1, oy + oh * 0.2, ow * 0.8, oh * 0.62, 10); paint(ctx, baking ? '#ffcf7a' : '#4a3c3a', 2.5);
  if (baking) {
    ctx.save(); rr(ctx, ox + ow * 0.1, oy + oh * 0.2, ow * 0.8, oh * 0.62, 10); ctx.clip();
    const glow = ctx.createRadialGradient(ox + ow / 2, oy + oh * 0.5, 4, ox + ow / 2, oy + oh * 0.5, ow * 0.6);
    glow.addColorStop(0, 'rgba(255,240,180,.9)'); glow.addColorStop(1, 'rgba(255,150,80,.4)'); ctx.fillStyle = glow; ctx.fillRect(ox, oy, ow, oh);
    const list = []; menu.forEach((d, i) => { for (let k = 0; k < Math.min(3, counts[i] || 0); k++) list.push(d); });
    list.slice(0, 6).forEach((d, i) => {
      const s = ow * 0.2, rise = Math.min(1, baking * 1.4);
      const plain = {cake: d.cake, frosting: d.frosting, toppings: []};
      ctx.save(); ctx.translate(ox + ow * (0.22 + (i % 3) * 0.28), oy + oh * (0.5 + Math.floor(i / 3) * 0.28));
      ctx.scale(1, 0.6 + rise * 0.4);
      cupcake(ctx, baking > 0.7 ? d : {...plain, frosting: baking > 0.45 ? plain.frosting : 'white'}, 0, 0, s, t);
      ctx.restore();
    });
    ctx.restore();
  }
  rr(ctx, ox + ow * 0.08, oy + oh * 0.86, ow * 0.84, oh * 0.05, 6); paint(ctx, '#d9d4e2', 1.5);
  // counter
  rr(ctx, -10, H * 0.46, W + 20, H * 0.05, 6); paint(ctx, C.wood, 2.5);
  ctx.fillStyle = '#f6d7c0'; ctx.fillRect(0, H * 0.51, W, H);
}

// The painted market (BG3): the stall names go on its two blank signs.
export function market(ctx, W, H, o = {}) {
  const {t = 0, barnOpen = false, open = [0, H * 0.3]} = o;
  const f = fitArt('bg3-market', W, H, [0, 0.13, 1, 0.47], open[0], open[1]);
  if (f) {
    paintArt(ctx, f, H);
    const name = (str, fx, fy, maxW) => { const [x, y] = f.at(fx, fy); text(ctx, str, x, y, fitSize(ctx, str, f.h * 0.032, f.w * maxW, 700), {color: C.ink, weight: 700, stroke: '#fff', sw: 4}); };
    name('Corner Market', 0.255, 0.197, 0.3);
    name('Bulk Barn', 0.81, 0.242, 0.26);
    if (!barnOpen) {
      // boards across the barn until it opens
      const [cx, cy] = f.at(0.8, 0.33);
      for (let i = 0; i < 2; i++) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(i ? 0.32 : -0.32); rr(ctx, -f.w * 0.17, -f.h * 0.012, f.w * 0.34, f.h * 0.024, 3); paint(ctx, C.wood, 1.5); ctx.restore(); }
      rr(ctx, cx - f.w * 0.11, cy - f.h * 0.02, f.w * 0.22, f.h * 0.04, 6); paint(ctx, '#fff8ee', 2);
      text(ctx, 'Opens day 4', cx, cy, fitSize(ctx, 'Opens day 4', f.h * 0.02, f.w * 0.19, 700), {weight: 700, color: C.pink});
    }
    return f;
  }
  sky(ctx, W, H, t);
  hills(ctx, W, H * 0.3, '#cdeccf', H * 0.02, 2);
  ctx.fillStyle = '#efe6dc'; ctx.fillRect(0, H * 0.3, W, H);
  const stall = (x, w, stripeA, stripeB, title, open) => {
    const top = H * 0.12, bottom = H * 0.3;
    rr(ctx, x, top + H * 0.05, w, bottom - top - H * 0.05, 6); paint(ctx, open ? '#fff8ee' : '#e9e2da', 2);
    ctx.save(); rr(ctx, x - 6, top, w + 12, H * 0.06, 6); ctx.clip();
    for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? stripeB : stripeA; ctx.fillRect(x - 6 + i * (w + 12) / 8, top, (w + 12) / 8 + 1, H * 0.06); }
    ctx.restore(); rr(ctx, x - 6, top, w + 12, H * 0.06, 6); paint(ctx, null, 2);
    text(ctx, title, x + w / 2, top - H * 0.02, Math.min(W * 0.05, H * 0.028), {weight: 700, stroke: '#fff', sw: 4});
    if (open) {
      for (let i = 0; i < 3; i++) { rr(ctx, x + 10 + i * (w - 20) / 3, bottom - H * 0.07, (w - 20) / 3 - 6, H * 0.06, 6); paint(ctx, C.wood, 1.5); for (let k = 0; k < 3; k++) circle(ctx, x + 22 + i * (w - 20) / 3 + k * 12, bottom - H * 0.075, 6, ['#ff7a8a', '#ffd23d', '#9fe3c0', '#c3a6ec'][(i + k) % 4], 1.2); }
    } else {
      for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(x + w / 2, top + H * 0.13 + i * H * 0.035); ctx.rotate((i - 1) * 0.08); rr(ctx, -w * 0.45, -H * 0.012, w * 0.9, H * 0.024, 3); paint(ctx, C.wood, 1.5); ctx.restore(); }
    }
  };
  stall(W * 0.06, W * 0.4, '#ff7a8a', '#fff', 'Corner Market', true);
  stall(W * 0.54, W * 0.4, '#b5523b', '#fff1dc', 'Bulk Barn', barnOpen);
}

// The painted houses (BG4-BG6) all share one layout: the door is at x 0.67 and its step at y 0.605.
const HOUSES = ['bg4-house-pink', 'bg5-house-blue', 'bg6-house-yellow'];
export function doorstep(ctx, W, H, o = {}) {
  const {t = 0, variant = 0} = o;
  const houses = HOUSES.filter(hasArt);
  const f = houses.length && fitArt(houses[variant % houses.length], W, H, [0, 0.12, 1, 0.95], 0, H, true);
  if (f) {
    paintArt(ctx, f, H);
    return {painted: true, gy: f.sy(0.605), door: {x: f.sx(0.668), y: f.sy(0.605)}, doorH: f.h * 0.21, path: f.at(0.47, 0.75), start: f.at(-0.15, 0.93)};
  }
  sky(ctx, W, H, t);
  const gy = H * 0.66;
  const hx = W * 0.32, hw = W * 0.64, top = H * 0.12;
  rr(ctx, hx, top + H * 0.1, hw, gy - top - H * 0.1, 4); paint(ctx, WALL[variant % 6], 2);
  ctx.beginPath(); ctx.moveTo(hx - 14, top + H * 0.1); ctx.lineTo(hx + hw / 2, top - H * 0.02); ctx.lineTo(hx + hw + 14, top + H * 0.1); ctx.closePath(); paint(ctx, ROOF[variant % 6], 2.5);
  const dx = hx + hw * 0.55, dw = hw * 0.26, dh = H * 0.26;
  rr(ctx, dx, gy - dh, dw, dh, [dw / 2, dw / 2, 0, 0]); paint(ctx, ROOF[(variant + 3) % 6], 2);
  circle(ctx, dx + dw * 0.8, gy - dh * 0.45, 3.5, C.butter, 1.2);
  rr(ctx, hx + hw * 0.1, top + H * 0.17, hw * 0.3, H * 0.13, 6); paint(ctx, '#d9f1ff', 2);
  ctx.beginPath(); ctx.moveTo(hx + hw * 0.25, top + H * 0.17); ctx.lineTo(hx + hw * 0.25, top + H * 0.3); paint(ctx, null, 2);
  rr(ctx, dx - 12, gy - 6, dw + 24, 10, 3); paint(ctx, '#e3d6c8', 1.5);
  for (const fx of [hx + 6, hx + hw - 40]) { rr(ctx, fx, gy - 26, 34, 24, 5); paint(ctx, '#e8a07a', 1.5); for (let k = 0; k < 4; k++) circle(ctx, fx + 6 + k * 7, gy - 30, 5, ['#ff7a8a', '#ffd23d', '#c3a6ec'][k % 3], 1); }
  ctx.fillStyle = C.grass; ctx.fillRect(0, gy, W, H);
  ctx.fillStyle = '#efe6dc'; ctx.fillRect(0, gy + H * 0.03, W, H * 0.06);
  ctx.fillStyle = C.road; ctx.fillRect(0, gy + H * 0.09, W, H);
  return {gy, door: {x: dx + dw / 2, y: gy}};
}

// The morning street (BG8) behind the day card, and the cozy room (BG7) at the end of the day.
// Each returns the fitted picture, or null when it falls back to drawing.
export function morning(ctx, W, H, o = {}) {
  const f = fitArt('bg8-morning', W, H, [0, 0.3, 1, 1], 0, H, true);
  if (f) { paintArt(ctx, f, H); return f; }
  cozy(ctx, W, H, o);
  return null;
}
export function title(ctx, W, H, o = {}) {
  const {t = 0} = o;
  sky(ctx, W, H, t);
  const sunY = H * 0.13;
  circle(ctx, W * 0.84, sunY, W * 0.08, '#fff1a8');
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + t * 0.2; ctx.beginPath(); ctx.moveTo(W * 0.84 + Math.cos(a) * W * 0.1, sunY + Math.sin(a) * W * 0.1); ctx.lineTo(W * 0.84 + Math.cos(a) * W * 0.13, sunY + Math.sin(a) * W * 0.13); paint(ctx, null, 3, '#ffe08a'); }
  hills(ctx, W, H * 0.62, '#cdeccf', H * 0.03, 0.5);
  hills(ctx, W, H * 0.68, C.grass, H * 0.025, 2.5);
  ctx.fillStyle = '#efe6dc'; ctx.fillRect(0, H * 0.74, W, H * 0.05);
  ctx.fillStyle = C.road; ctx.fillRect(0, H * 0.79, W, H);
}

export function cozy(ctx, W, H, o = {}) {
  const {t = 0} = o;
  const f = fitArt('bg7-cozy-room', W, H, [0, 0.3, 1, 1], 0, H, true);
  if (f) {
    paintArt(ctx, f, H);
    return f;
  }
  ctx.fillStyle = '#fff1f6'; ctx.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 28) { ctx.fillStyle = 'rgba(242,122,169,.08)'; ctx.fillRect(x, 0, 14, H * 0.7); }
  for (let i = 0; i < 12; i++) circle(ctx, W * i / 11, H * 0.05 + Math.sin(i * 1.3) * 8, 5, `hsl(${(i * 40 + t * 30) % 360} 85% 75%)`, 1);
  ctx.fillStyle = '#f2d2b8'; ctx.fillRect(0, H * 0.7, W, H);
  ellipse(ctx, W * 0.5, H * 0.83, W * 0.38, H * 0.06, '#c9b3f0', 2);
  ellipse(ctx, W * 0.5, H * 0.83, W * 0.3, H * 0.045, '#d9c8f5', 0);
}

// A little feelings bubble over someone's head (E1-E7 pictures, drawn in code until they exist).
// It pops in over the first fifth of a second and bobs gently; x, y is its bottom centre, s its size.
const EMOTE_ART = {heart: 'e1-heart', thinking: 'e2-thinking', question: 'e3-question', sweat: 'e4-sweat', sparkles: 'e5-sparkles', wow: 'e6-wow', note: 'e7-note'};
export function emote(ctx, kind, x, y, s, age) {
  const pop = age < 0.2 ? Math.sin(Math.min(1, age / 0.2) * Math.PI * 0.75) / Math.sin(Math.PI * 0.75) : 1;
  ctx.save(); ctx.translate(x, y - Math.sin(age * 3) * s * 0.04); ctx.scale(pop, pop);
  const img = image(EMOTE_ART[kind]);
  if (img) { const w = s * img.width / img.height; ctx.drawImage(img, -w / 2, -s, w, s); ctx.restore(); return; }
  const lw = Math.max(1.5, s * 0.05), cy = -s * 0.55, r = s * 0.42;
  if (kind === 'sweat') {
    ctx.beginPath(); ctx.moveTo(0, -s * 0.95); ctx.quadraticCurveTo(s * 0.32, -s * 0.4, 0, -s * 0.1); ctx.quadraticCurveTo(-s * 0.32, -s * 0.4, 0, -s * 0.95); paint(ctx, '#9fd4f7', lw);
    ellipse(ctx, -s * 0.06, -s * 0.38, s * 0.05, s * 0.09, 'rgba(255,255,255,.8)');
  } else if (kind === 'sparkles') {
    for (const [dx, dy, k] of [[-0.25, -0.35, 0.8], [0.22, -0.6, 1], [-0.05, -0.85, 0.6]]) { starPath(ctx, dx * s, dy * s, s * 0.2 * k); paint(ctx, '#ffe066', lw * 0.8); }
  } else {
    // a round white bubble with a little tail
    ctx.beginPath(); ctx.arc(0, cy, r, 0, Math.PI * 2); paint(ctx, '#fff', lw);
    ctx.beginPath(); ctx.moveTo(-s * 0.08, cy + r * 0.92); ctx.lineTo(-s * 0.16, -s * 0.02); ctx.lineTo(s * 0.06, cy + r * 0.95); ctx.closePath(); paint(ctx, '#fff', 0);
    ctx.beginPath(); ctx.moveTo(-s * 0.09, cy + r * 0.97); ctx.lineTo(-s * 0.16, -s * 0.02); ctx.lineTo(s * 0.06, cy + r * 0.97); paint(ctx, null, lw);
    if (kind === 'heart') { heartPath(ctx, 0, cy + s * 0.04, s * 0.26); paint(ctx, '#ff7eb6', lw * 0.7); }
    else if (kind === 'thinking') for (let i = -1; i <= 1; i++) circle(ctx, i * s * 0.15, cy, s * 0.055, C.ink);
    else if (kind === 'question') text(ctx, '?', 0, cy + s * 0.02, s * 0.5, {color: C.pink, weight: 700});
    else if (kind === 'note') text(ctx, '♪', 0, cy + s * 0.02, s * 0.48, {color: C.pink, weight: 700});
    else { starPath(ctx, 0, cy, s * 0.24); paint(ctx, '#ffd23d', lw * 0.7); }
  }
  ctx.restore();
}

export function confetti(ctx, parts) {
  for (const p of parts) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
    if (p.star && image('u7-star')) ctx.drawImage(image('u7-star'), -p.s, -p.s, p.s * 2, p.s * 2);
    else if (p.star) text(ctx, '⭐', 0, 0, p.s * 2);
    else if (p.coin && image('u1-coin')) ctx.drawImage(image('u1-coin'), -p.s * 1.2, -p.s * 1.2, p.s * 2.4, p.s * 2.4);
    else if (p.coin) { circle(ctx, 0, 0, p.s, '#ffd23d', 1.5); text(ctx, '$', 0, 1, p.s * 1.3, {color: '#b78a1a', weight: 700}); }
    else { ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); }
    ctx.restore();
  }
}
