// Artwork: loads the generated pictures and falls back to stand-ins until a pose arrives.
// New art: put it in art/cupcake/ and run art/cupcake/process.py, which updates art/manifest.json.

// Used only if manifest.json cannot be read.
export const FILES = {
  // name: which way the character faces in the picture
  'arianna-front': 'front', 'arianna-3q': 'right', 'arianna-side': 'right', 'arianna-back': 'front',
  'baxter-front': 'front', 'baxter-3q': 'left', 'baxter-side': 'right', 'baxter-back': 'front',
};

// Each pose lists the picture it wants first, then what to use until that picture exists.
export const POSES = {
  arianna: {
    stand: ['arianna-front'], wave: ['a2-wave', 'arianna-front'], box: ['a3-box', 'arianna-front'],
    think: ['a4-think', 'arianna-3q'], cheer: ['a5-cheer', 'arianna-front'], drive: ['a6-drive', 'arianna-side'],
    oops: ['a7-oops', 'arianna-3q'], walk: ['a8-walk', 'arianna-side'], back: ['arianna-back'], serve: ['a9-serve', 'arianna-front'],
    stylist: ['a10-stylist', 'arianna-front'], toys: ['a11-toys', 'arianna-front'],
  },
  baxter: {
    sit: ['baxter-front'], stand: ['baxter-3q'], excited: ['b2-excited', 'baxter-3q'], sniff: ['b3-sniff', 'baxter-side'],
    ride: ['b4-ride', 'baxter-side'], sleep: ['b5-sleep', 'baxter-back'], tilt: ['b6-tilt', 'baxter-front'], walk: ['b7-walk', 'baxter-side'],
    run: ['b8-run', 'baxter-side'], party: ['b9-party', 'baxter-front'], bow: ['b10-bow', 'baxter-front'], ball: ['b11-ball', 'baxter-front'],
  },
};
// Part of a stand-in picture to use for a pose (x0, y0, x1, y1 as fractions).
const CROPS = {
  'arianna-side@drive': [0, 0, 1, 0.52],
  'baxter-side@ride': [0.42, 0, 1, 0.64],
};
// Customer pictures, if they have been made.
// Each customer also has -happy and -hmm pictures (C1-C13 feelings) for when they're delighted or unsure.
export const CUSTOMER_ART = {grandma: 'c1-grandma', builder: 'c2-builder', boy: 'c3-boy', bunny: 'c4-bunny', cat: 'c5-cat', bear: 'c6-bear', mail: 'c7-mail', duck: 'c8-duck', girl: 'c9-girl', dad: 'c10-dad', pug: 'c11-pug', poodle: 'c12-poodle', spot: 'c13-spot'};

const images = {};
// Loads the pictures in `first` (those the opening screens need) and resolves once they are in; the
// rest keep arriving after that, and allArt resolves when every picture has loaded or failed.
// onProgress(fraction) follows the first pictures, for the loading screen.
export let allArt = Promise.resolve();
export async function loadArt(base, onProgress = () => {}, first = null) {
  try {
    const res = await fetch(`${base}art/manifest.json`, {cache: 'no-cache'});
    if (res.ok) Object.assign(FILES, await res.json());
  } catch {}
  const load = name => new Promise(done => {
    const img = new Image();
    img.onload = () => { images[name] = img; done(); };
    img.onerror = done;
    img.src = `${base}art/${name}.webp`;
  });
  const names = Object.keys(FILES), now = first ? names.filter(n => first.includes(n)) : names;
  let loaded = 0;
  await Promise.all(now.map(n => load(n).then(() => onProgress(++loaded / now.length))));
  allArt = Promise.all(names.filter(n => !now.includes(n)).map(load));
}
export const image = name => images[name] || null;
export const hasArt = name => !!images[name];

// Which picture a pose will use right now, and whether it is the real pose or a stand-in.
export function poseArt(who, pose) {
  const options = POSES[who][pose] || POSES[who][Object.keys(POSES[who])[0]];
  for (const name of options) if (images[name]) return {img: images[name], name, standIn: name !== options[0], crop: CROPS[`${name}@${pose}`], facing: FILES[name]};
  return null;
}

// Draw a character standing on (x, y) at height h. face: 'left' | 'right' flips side views to match.
// Returns false if no picture is loaded so the caller can draw a code stand-in.
export function drawPose(ctx, who, pose, x, y, h, {face = null, t = 0, alpha = 1} = {}) {
  const art = poseArt(who, pose);
  if (!art) return false;
  const {img, crop, facing, standIn} = art;
  const [cx0, cy0, cx1, cy1] = crop || [0, 0, 1, 1];
  const sw = img.width * (cx1 - cx0), sh = img.height * (cy1 - cy0);
  const w = h * sw / sh;
  let bob = 0, rot = 0, sx = 1, sy = 1;
  // stand-ins move a little so a reused picture still reads as the pose
  if (standIn || pose === 'walk') {
    if (pose === 'wave') bob = -Math.abs(Math.sin(t * 5)) * h * 0.03;
    if (pose === 'cheer' || pose === 'excited') { bob = -Math.abs(Math.sin(t * 7)) * h * 0.12; rot = Math.sin(t * 14) * 0.06; }
    if (pose === 'think' || pose === 'tilt') rot = Math.sin(t * 1.5) * 0.04 - 0.04;
    if (pose === 'sniff') rot = 0.12 + Math.sin(t * 9) * 0.03;
    if (pose === 'sleep') { sy = 1 + Math.sin(t * 2) * 0.015; sx = 1 - Math.sin(t * 2) * 0.01; }
    if (pose === 'walk') { bob = -Math.abs(Math.sin(t * 9)) * h * 0.035; rot = Math.sin(t * 9) * 0.03; }
    if (pose === 'oops') rot = Math.sin(t * 12) * 0.05;
  } else if (pose === 'ride' || pose === 'drive') bob = Math.sin(t * 16) * h * 0.012;
  const flip = face && facing !== 'front' && face !== facing;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y + bob);
  ctx.rotate(rot);
  ctx.scale(flip ? -sx : sx, sy);
  ctx.drawImage(img, img.width * cx0, img.height * cy0, sw, sh, -w / 2, -h, w, h);
  ctx.restore();
  return true;
}
export function poseWidth(who, pose, h) {
  const art = poseArt(who, pose);
  if (!art) return h * 0.4;
  const [cx0, cy0, cx1, cy1] = art.crop || [0, 0, 1, 1];
  return h * (art.img.width * (cx1 - cx0)) / (art.img.height * (cy1 - cy0));
}
