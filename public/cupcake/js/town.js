// The delivery town: a tile map whose streets line up with the coordinate grid, plus van driving.
import {rng} from './logic.js';

export const T = {GRASS: 0, ROAD: 1, HOUSE: 2, TREE: 3, FLOWER: 4, SHOP: 5, LOT: 6, POND: 7, PARK: 8};
export const BLOCK = 3;            // tiles between streets
export const LINES = 7;            // grid lines 0..6
const STEP = BLOCK + 1;
const CORE = (LINES - 1) * STEP + 1;
export const MARGIN = 2;
const MAIN_ROW = MARGIN + CORE - 1; // Main Street is grid line y = 0

// Blocks named by the grid corner at their bottom-left.
const LOTS = [[2, 3], [4, 1]];     // empty lots, saved for the hair salon and toy shop
const PARKS = [[1, 4], [5, 4], [3, 1]];

export function gridToTile(x, y) { return {tx: MARGIN + x * STEP, ty: MAIN_ROW - y * STEP}; }
export function lineToTile(n) { return {tx: MARGIN + 2 * n, ty: MAIN_ROW}; }

export function buildTown(seed = 7) {
  const r = rng(seed);
  const w = CORE + MARGIN * 2, h = MARGIN + CORE + 3;
  const tiles = new Uint8Array(w * h).fill(T.GRASS), variant = new Uint8Array(w * h);
  const set = (x, y, t, v = Math.floor(r() * 6)) => { tiles[y * w + x] = t; variant[y * w + x] = v; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const cx = x - MARGIN, cy = y - MARGIN;
    const inCore = cx >= 0 && cx < CORE && cy >= 0 && cy < CORE;
    if (inCore && (cx % STEP === 0 || cy % STEP === 0)) set(x, y, T.ROAD, (cx % STEP === 0 ? 1 : 0) | (cy % STEP === 0 ? 2 : 0));
    else if (!inCore) set(x, y, r() < 0.55 ? T.TREE : T.FLOWER);
  }
  // blocks
  for (let bx = 0; bx < LINES - 1; bx++) for (let by = 0; by < LINES - 1; by++) {
    const x0 = MARGIN + bx * STEP + 1, y0 = MAIN_ROW - (by + 1) * STEP + 1;
    const lot = LOTS.some(([a, b]) => a === bx && b === by), park = PARKS.some(([a, b]) => a === bx && b === by);
    for (let i = 0; i < BLOCK; i++) for (let j = 0; j < BLOCK; j++) {
      const x = x0 + i, y = y0 + j, center = i === 1 && j === 1;
      if (lot) set(x, y, T.LOT, LOTS.findIndex(([a, b]) => a === bx && b === by));
      else if (park) set(x, y, center ? T.POND : r() < 0.5 ? T.TREE : T.PARK);
      else if (center) set(x, y, r() < 0.6 ? T.TREE : T.FLOWER);
      else set(x, y, r() < 0.82 ? T.HOUSE : T.TREE);
    }
  }
  // Main Street's south side is the number line: the shop at 0, houses 1..10, more houses past that.
  const south = MAIN_ROW + 1;
  for (let x = 0; x < w; x++) set(x, south, (x - MARGIN) % 2 === 0 && x >= MARGIN ? T.HOUSE : T.FLOWER);
  set(MARGIN - 1, south, T.SHOP, 0); set(MARGIN, south, T.SHOP, 1);
  for (let x = 0; x < w; x++) set(x, south + 1, r() < 0.7 ? T.TREE : T.FLOWER);
  for (let x = 0; x < w; x++) set(x, south + 2, T.TREE);
  const town = {w, h, tiles, variant, start: {tx: MARGIN, ty: MAIN_ROW}};
  // every grid corner must have a house beside it to deliver to
  for (let gx = 0; gx < LINES; gx++) for (let gy = 0; gy < LINES; gy++) {
    if (!houseForGrid(town, gx, gy)) {
      const {tx, ty} = gridToTile(gx, gy);
      const [hx, hy] = [[1, -1], [-1, -1], [1, 1], [-1, 1]].map(([dx, dy]) => [tx + dx, ty + dy]).find(([x, y]) => at(town, x, y) !== T.LOT && at(town, x, y) !== T.POND && x >= 0 && y >= 0 && x < w && y < h);
      set(hx, hy, T.HOUSE);
    }
  }
  return town;
}

export const at = (town, x, y) => (x < 0 || y < 0 || x >= town.w || y >= town.h ? -1 : town.tiles[y * town.w + x]);
export const isRoad = (town, x, y) => at(town, x, y) === T.ROAD;

export function houseForGrid(town, x, y) {
  const {tx, ty} = gridToTile(x, y);
  for (const [dx, dy] of [[1, -1], [-1, -1], [1, 1], [-1, 1]]) if (at(town, tx + dx, ty + dy) === T.HOUSE) return {tx: tx + dx, ty: ty + dy};
  return null;
}
export function houseForLine(n) { const {tx, ty} = lineToTile(n); return {tx, ty: ty + 1}; }

// A delivery: the house to light up and the road tile the van has to reach.
export function destination(town, address) {
  if (address.mode === 'line') return {road: lineToTile(address.n), house: houseForLine(address.n)};
  return {road: gridToTile(address.x, address.y), house: houseForGrid(town, address.x, address.y)};
}

export function path(town, from, to) {
  const key = (x, y) => y * town.w + x, prev = new Map([[key(from.tx, from.ty), -1]]), q = [[from.tx, from.ty]];
  while (q.length) {
    const [x, y] = q.shift();
    if (x === to.tx && y === to.ty) {
      const out = [];
      for (let k = key(x, y); k !== -1; k = prev.get(k)) out.push({tx: k % town.w, ty: Math.floor(k / town.w)});
      return out.reverse();
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (isRoad(town, nx, ny) && !prev.has(k)) { prev.set(k, key(x, y)); q.push([nx, ny]); }
    }
  }
  return [];
}

// ---------- driving ----------
// Positions are in tiles; a tile's centre is (tx + 0.5, ty + 0.5). Input is a screen direction.
const DIRS = {right: [1, 0], left: [-1, 0], down: [0, 1], up: [0, -1]};
export const BASE_SPEED = 3.4; // tiles per second
const RADIUS = 0.3;

export function createVan(town, start) {
  return {x: start.tx + 0.5, y: start.ty + 0.5, angle: 0, speed: 0, dir: null, travel: [1, 0], moving: false, distance: 0};
}

function fits(town, x, y) {
  return isRoad(town, Math.floor(x - RADIUS), Math.floor(y - RADIUS)) && isRoad(town, Math.floor(x + RADIUS), Math.floor(y - RADIUS)) &&
    isRoad(town, Math.floor(x - RADIUS), Math.floor(y + RADIUS)) && isRoad(town, Math.floor(x + RADIUS), Math.floor(y + RADIUS));
}

const toDir = input => {
  if (!input || (!input.x && !input.y)) return null;
  return Math.abs(input.x) >= Math.abs(input.y) ? (input.x > 0 ? 'right' : 'left') : (input.y > 0 ? 'down' : 'up');
};

// Easy driving: the van runs along the middle of the road and turns at the next corner that goes the held way.
const nextCenter = (v, d) => (d > 0 ? Math.floor(v - 0.5) + 1.5 : Math.ceil(v - 0.5) - 0.5);

function stepEasy(town, van, input, dt, top) {
  const want = toDir(input);
  if (!want) { van.moving = false; van.speed = 0; return; }
  const [wx, wy] = DIRS[want];
  if (van.dir && DIRS[van.dir][0] === -wx && DIRS[van.dir][1] === -wy) van.dir = want; // turn around any time
  let budget = top * dt;
  while (budget > 1e-9) {
    const tx = Math.floor(van.x), ty = Math.floor(van.y);
    const atCenter = Math.abs(van.x - tx - 0.5) < 1e-6 && Math.abs(van.y - ty - 0.5) < 1e-6;
    if (!atCenter && !van.dir) { van.x = tx + 0.5; van.y = ty + 0.5; continue; }
    if (atCenter) {
      if (isRoad(town, tx + wx, ty + wy)) van.dir = want;
      else if (!van.dir || !isRoad(town, tx + DIRS[van.dir][0], ty + DIRS[van.dir][1])) { van.dir = null; break; }
    }
    const [dx, dy] = DIRS[van.dir];
    const now = dx ? van.x : van.y, target = nextCenter(now, dx || dy);
    const gap = Math.abs(target - now), move = Math.min(budget, gap);
    if (dx) van.x = move === gap ? target : van.x + dx * move;
    else van.y = move === gap ? target : van.y + dy * move;
    van.distance += move; budget -= move;
  }
  van.moving = !!van.dir;
  van.speed = van.moving ? top : 0;
  if (van.dir) van.travel = DIRS[van.dir];
}

// Free steering: drive where the arrows point; curbs are solid and the van slides along them.
// If the held way is blocked, the van keeps rolling the way it was going until the corner opens up.
function stepFree(town, van, input, dt, top) {
  const want = input && (input.x || input.y) ? input : null;
  van.speed = want ? Math.min(top, van.speed + top * 4 * dt) : Math.max(0, van.speed - top * 6 * dt);
  if (!van.speed) { van.moving = false; return; }
  let ix, iy;
  if (want) { const l = Math.hypot(want.x, want.y); ix = want.x / l; iy = want.y / l; } else [ix, iy] = van.travel;
  const d = van.speed * dt;
  const tryMove = (mx, my) => { if (fits(town, van.x + mx, van.y + my)) { van.x += mx; van.y += my; van.distance += Math.hypot(mx, my); return true; } return false; };
  let moved = false;
  if (tryMove(ix * d, iy * d)) { moved = true; van.travel = Math.abs(ix) >= Math.abs(iy) ? [Math.sign(ix), 0] : [0, Math.sign(iy)]; }
  else if (tryMove(van.travel[0] * d, van.travel[1] * d)) moved = true;
  else if (ix && tryMove(ix * d, 0)) { moved = true; van.travel = [Math.sign(ix), 0]; }
  else if (iy && tryMove(0, iy * d)) { moved = true; van.travel = [0, Math.sign(iy)]; }
  if (!moved) {
    // slide toward the middle of the tile so the van can slip into the side street it is aiming for
    const cx = Math.floor(van.x) + 0.5, cy = Math.floor(van.y) + 0.5;
    const nudge = (from, to) => Math.sign(to - from) * Math.min(d, Math.abs(to - from));
    if (Math.abs(iy) >= Math.abs(ix) && Math.abs(van.x - cx) > 1e-3) moved = tryMove(nudge(van.x, cx), 0);
    else if (Math.abs(van.y - cy) > 1e-3) moved = tryMove(0, nudge(van.y, cy));
  }
  if (!moved) { van.speed = 0; van.moving = false; return; }
  // keep to the middle of the lane
  const pull = Math.min(1, dt * 7);
  if (van.travel[0]) van.y += (Math.floor(van.y) + 0.5 - van.y) * pull;
  else van.x += (Math.floor(van.x) + 0.5 - van.x) * pull;
  van.moving = true;
}

export function driveStep(town, van, input, dt, {easy = true, speed = 1} = {}) {
  const top = BASE_SPEED * speed;
  const before = [van.x, van.y];
  (easy ? stepEasy : stepFree)(town, van, input, dt, top);
  const mx = van.x - before[0], my = van.y - before[1];
  if (Math.hypot(mx, my) > 1e-4) {
    const target = Math.atan2(my, mx);
    let diff = target - van.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    van.angle += diff * Math.min(1, dt * 14);
  }
}

export function reached(van, road) {
  return Math.floor(van.x) === road.tx && Math.floor(van.y) === road.ty && Math.hypot(van.x - road.tx - 0.5, van.y - road.ty - 0.5) < 0.45;
}

export function timeLimit(town, from, road, speed = 1) {
  const tiles = Math.max(1, path(town, from, road).length - 1);
  return Math.round(tiles / (BASE_SPEED * speed) * 2.4 + 7);
}

