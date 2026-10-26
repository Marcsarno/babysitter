// Arianna's Cupcakes: screens and the flow of a day.
import * as L from './logic.js';
import {buildTown, destination, path, createVan, driveStep, reached, timeLimit, gridToTile, MARGIN} from './town.js';
import * as D from './draw.js';
import {loadArt, drawPose, image, CUSTOMER_ART} from './art.js';
import {sfx, speak, hush, settings as audio, unlock, engineHum, engineOff, loadVoice, preloadCustomer, loadMusic, music, musicOn, pauseMusic} from './audio.js';
import {S, GREET} from './say.js';

const BASE = new URL('../', import.meta.url).pathname;
const SETTINGS_KEY = 'ariannaCupcakes.settings.v1';
const SHOP_NAME = "Arianna's Cupcakes";
const TS = 64; // town tile size in pixels

const app = document.getElementById('app'), cv = document.getElementById('scene'), ctx = cv.getContext('2d');
const ui = document.getElementById('ui'), hudEl = document.getElementById('hud');
let W = 0, H = 0, now = 0;

// ---------- storage ----------
const readJSON = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
const writeJSON = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} };
const settings = {voice: true, sound: true, music: true, easyDrive: true, bigKid: false, ...readJSON(SETTINGS_KEY)};
function applySettings() { audio.sound = settings.sound; audio.voice = settings.voice; musicOn(settings.music); writeJSON(SETTINGS_KEY, settings); }
applySettings();
let save = L.migrate(readJSON(L.SAVE_KEY));
// Progress is saved between days; leaving mid-day comes back to the start of that day.
const persist = () => writeJSON(L.SAVE_KEY, save);

// ---------- little DOM helpers ----------
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}
const btn = (label, onclick, cls = '') => h('button', {class: 'btn ' + cls, onclick: e => { sfx.tap(); onclick(e); }}, label);
const mount = (...els) => { ui.replaceChildren(...els); };
function modal(...content) {
  const back = h('div', {class: 'back'}, h('div', {class: 'card'}, ...content));
  app.append(back);
  return () => back.remove();
}
function toast(msg, ms = 2200) {
  const el = h('div', {class: 'toast'}, msg);
  app.append(el);
  setTimeout(() => el.remove(), ms);
}
function portrait(who, pose = 'stand', size = 108) {
  const c = h('canvas', {width: size, height: size});
  const g = c.getContext('2d');
  if (who === 'arianna') { if (!drawPose(g, 'arianna', pose, size / 2, size * 3.2, size * 3.25)) D.person(g, 'arianna', size / 2, size * 1.9, size * 2.1); }
  else if (who === 'baxter') { if (!drawPose(g, 'baxter', 'sit', size / 2, size * 2.05, size * 2.1)) D.person(g, 'baxter', size / 2, size * 1.9, size * 2.1); }
  else if (image(CUSTOMER_ART[who])) drawCustomer(g, who, size / 2, size * 2.05, size * 2.05 / (ART_SCALE[who] || 1), {});
  else drawCustomer(g, who, size / 2, size * 2.1, size * 2.3, {});
  return c;
}
// A one-time tip from the narrator the first time each screen shows up.
function coach(key, seenKey = key) {
  if (save.seen[seenKey]) return;
  save.seen[seenKey] = true;
  const msg = S.coach[key];
  const el = h('div', {class: 'coach'}, h('img', {class: 'narrator', src: `${BASE}icon-192.png`, alt: ''}), h('div', {class: 'grow'}, msg), btn('OK', () => el.remove(), 'small mint'));
  app.append(el);
  speak(msg);
}
// customer: whose voice reads customer lines
function speakerButton(getText, customer = null) { return h('button', {class: 'speaker', 'aria-label': 'Read it to me', onclick: () => speak(getText(), {customer})}, '🔊'); }

// ---------- HUD ----------
function hud(show = true) {
  hudEl.classList.toggle('hidden', !show || !save);
  if (!show || !save) return;
  const ev = day?.event;
  hudEl.replaceChildren(...[
    h('div', {class: 'chip'}, `Day ${day ? day.number : save.day}`),
    ev ? h('div', {class: 'chip event'}, {rain: '🌧️ Rainy', birthday: '🎉 Baxter’s birthday', party: '🎈 Party day'}[ev]) : null,
    h('div', {class: 'spacer'}),
    h('div', {class: 'chip cash', id: 'cash'}, `$${save.cash}`),
    h('button', {class: 'chip icon', 'aria-label': 'Menu', onclick: () => { sfx.tap(); openMenu(); }}, '☰'),
  ].filter(Boolean));
}
function cashChanged() {
  const el = document.getElementById('cash');
  if (!el) return;
  el.textContent = `$${save.cash}`;
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
}
function cashPoint() {
  const el = document.getElementById('cash');
  if (!el) return {x: W - 80, y: 30};
  const r = el.getBoundingClientRect(), a = app.getBoundingClientRect();
  return {x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2};
}

// ---------- particles ----------
const parts = [];
function confettiBurst(x, y, n = 40) {
  for (let i = 0; i < n; i++) parts.push({x, y, vx: (Math.random() - 0.5) * 420, vy: -Math.random() * 420 - 100, a: Math.random() * 6, va: (Math.random() - 0.5) * 12, s: 8 + Math.random() * 6, c: ['#f27aa9', '#9fe3c0', '#ffe08a', '#8ccaf5', '#cdb8f2'][i % 5], life: 2.2});
}
function coinsTo(x, y, n) {
  const target = cashPoint();
  for (let i = 0; i < Math.min(n, 14); i++) parts.push({x, y, vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 260 - 80, a: 0, va: 0, s: 10, coin: true, life: 1.6, delay: i * 0.05, target, home: 0});
}
function updateParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (p.delay > 0) { p.delay -= dt; continue; }
    p.life -= dt;
    if (p.coin) {
      p.home += dt;
      if (p.home > 0.35) { const k = Math.min(1, dt * 7); p.x += (p.target.x - p.x) * k; p.y += (p.target.y - p.y) * k; if (Math.hypot(p.target.x - p.x, p.target.y - p.y) < 12) { parts.splice(i, 1); sfx.coin(); continue; } }
      else { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; }
    } else { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; p.vx *= 0.99; p.a += p.va * dt; }
    if (p.life <= 0) parts.splice(i, 1);
  }
}

// ---------- characters ----------
// The part of the screen between the top bar and the bottom panel, where a scene can be seen.
function openArea() {
  const a = app.getBoundingClientRect(), p = ui.querySelector('.panel')?.getBoundingClientRect();
  return [hudEl.getBoundingClientRect().bottom - a.top, p ? p.top - a.top : H];
}
function arianna(pose, x, y, hgt, opts = {}) { if (!drawPose(ctx, 'arianna', pose, x, y, hgt, {t: now, ...opts})) D.person(ctx, 'arianna', x, y, hgt, {t: now, walking: pose === 'walk', ...opts}); }
function baxter(pose, x, y, hgt, opts = {}) { if (!drawPose(ctx, 'baxter', pose, x, y, hgt, {t: now, ...opts})) D.person(ctx, 'baxter', x, y, hgt * 1.3, {t: now, ...opts}); }
const ART_SCALE = {girl: 0.8, boy: 0.8, builder: 0.88, bunny: 0.86, cat: 0.9, duck: 0.82, bear: 1.1, pug: 0.82, poodle: 0.9, spot: 0.9};   // kids and little animals stand a bit shorter, the bear taller
// Draw a feelings bubble for someone; it pops in again whenever the feeling changes.
function feeling(who, kind, x, y, size) {
  if (who.feeling !== kind) { who.feeling = kind; who.feelingAt = now; }
  if (kind) D.emote(ctx, kind, x, y, size, now - who.feelingAt);
}
function drawCustomer(g, type, x, y, hgt, opts) {
  const img = image(CUSTOMER_ART[type]);
  if (img) {
    hgt *= ART_SCALE[type] || 1;
    const bob = opts.walking ? -Math.abs(Math.sin((opts.t || 0) * 9)) * hgt * 0.03 : 0;
    const w = hgt * img.width / img.height;
    g.drawImage(img, x - w / 2, y - hgt + bob, w, hgt);
  } else D.person(g, type, x, y, hgt, opts);
}
function boxInHands(x, y, s) {
  ctx.save(); ctx.translate(x, y);
  D.rr(ctx, -s / 2, -s * 0.6, s, s * 0.6, 4); ctx.fillStyle = '#ffc6dc'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = D.C.ink; ctx.stroke();
  ctx.fillStyle = '#f27aa9'; ctx.fillRect(-s * 0.06, -s * 0.6, s * 0.12, s * 0.6);
  ctx.restore();
}

// ---------- the town picture, drawn once ----------
const town = buildTown(7);
let townImg = null;
const townCanvas = () => townImg || (townImg = D.renderTown(town, TS));

// ---------- the current day ----------
let day = null;
function newDay() {
  const r = L.rng((save.seed ^ Math.imul(save.day, 2654435761)) >>> 0);
  const event = L.dayEvent(save.day);
  const deals = {};
  for (const id of L.unlockedIds(save)) deals[id] = L.dealsFor(r, save.day, settings.bigKid, id);
  day = {number: save.day, r, event, deals, spent: 0, sales: 0, tips: 0, soldCount: 0, sold: {}, shelf: [], baked: 0, goal: 0,
    passers: L.passersby(r, save, event), next: 0, cheap: {}, pricey: {}, sniffs: 3, partyDone: event !== 'party', counts: null};
}

// ---------- scenes ----------
let scene = null;
// The old screen fades out over the new one for a moment instead of jumping.
let fadeFrom = null;
const calm = matchMedia('(prefers-reduced-motion: reduce)');
function go(next, arg) {
  if (scene && W && !calm.matches) {
    const c = document.createElement('canvas');
    c.width = cv.width; c.height = cv.height; c.getContext('2d').drawImage(cv, 0, 0);
    fadeFrom = {c, t: now};
  }
  scene?.exit?.();
  hush();
  document.querySelectorAll('.coach, .savings, .toast, .ticket, .banner').forEach(e => e.remove());
  scene = next;
  ui.replaceChildren();
  next.enter?.(arg);
  music(SCENE_MUSIC.get(next)?.());
}

const Title = {
  enter() {
    hud(false);
    const has = save && (save.day > 1 || save.history.length);
    const start = () => { unlock(); speak(S.welcome); if (!save) save = L.newGame(); go(DayStart); };
    mount(
      h('div', {class: 'title'}, h('h1', null, 'Arianna’s', h('span', null, 'Cupcakes')), h('p', null, 'with Baxter the delivery pup')),
      h('div', {class: 'menu'},
        btn(has ? `Keep baking · Day ${save.day}` : 'Start baking!', start, 'pink big'),
        h('div', {class: 'pair'},
          has ? btn('New season', () => confirmNew(), 'ghost small') : null,
          btn('Stickers', () => openStickers(), 'ghost small'),
          btn('Settings', () => openSettings(), 'ghost small'))),
    );
  },
  draw() {
    const art = image('s1-title');
    if (art) {
      // the painted title scene, cropped to fill the screen and drifting slowly
      const k = Math.max(W / art.width, H / art.height) * 1.04, w = art.width * k, hh = art.height * k;
      ctx.drawImage(art, (W - w) / 2 + Math.sin(now * 0.2) * W * 0.01, (H - hh) * 0.3, w, hh);
      return;
    }
    D.title(ctx, W, H, {t: now});
    const gy = H * 0.77;
    D.vanSide(ctx, W * 0.24, gy + H * 0.03, Math.min(W * 0.55, H * 0.32), save?.paint || 'pink', {t: now, name: SHOP_NAME, drawPeople: cabPeople});
    arianna('wave', W * 0.66, gy + H * 0.01, Math.min(H * 0.36, W * 0.8));
    baxter('excited', W * 0.86, gy + H * 0.015, Math.min(H * 0.14, W * 0.3), {face: 'left'});
  },
};
function cabPeople(g, box) {
  // Arianna's face in the van window, and Baxter beside her
  drawPose(g, 'arianna', 'drive', box.x + box.w * 0.4, box.y + box.h * 1.9, box.h * 2.1, {face: 'right', t: now});
}
function confirmNew() {
  const close = modal(h('h2', null, 'Start a new season?'), h('p', {class: 'center'}, 'The shop starts over on day 1 with $50. Stickers stay in the book.'),
    h('div', {class: 'actions'}, btn('Keep my shop', () => close(), 'ghost'), btn('Start over', () => {
      const stickers = save?.stickers || {}, seen = save?.seen || {};
      save = L.newGame(); save.stickers = stickers; save.seen = seen; persist(); close(); go(DayStart);
    }, 'pink')));
}

const DayStart = {
  enter() {
    newDay();
    persist();
    hud(true);
    const lines = S.event;
    const first = save.day === 1;
    mount(h('div', {class: 'back', style: 'align-items:start;padding-top:calc(env(safe-area-inset-top,0px) + 70px)'}, h('div', {class: 'card daycard'},
      h('div', {class: 'muted'}, save.day > L.SEASON_DAYS ? 'Free play' : `Day ${save.day} of ${L.SEASON_DAYS}`),
      h('div', {class: 'num'}, `Day ${save.day}`),
      day.event ? h('div', {class: 'event'}, lines[day.event]) : null,
      first ? h('p', null, 'Buy cake, frosting and toppings at the market. Then bake, sell, and deliver around town with Baxter!') : null,
      h('div', {class: 'actions'}, btn('Go to the market →', () => go(Market), 'pink big')))));
    speak([S.day(save.day), day.event ? lines[day.event] : first ? S.firstDay : S.openShop]);
  },
  draw() {
    D.morning(ctx, W, H, {t: now});
    arianna('wave', W * 0.34, H * 0.86, H * 0.36);
    baxter(day?.event === 'birthday' ? 'excited' : 'sit', W * 0.72, H * 0.87, H * 0.15);
  },
};

// ---------- market ----------
const Market = {
  enter() {
    hud(true);
    this.panel = h('div', {class: 'panel', style: 'max-height:70%'});
    mount(this.panel);
    this.render();
    coach(save.day >= 4 && !save.seen.market4 ? 'market4' : 'market');
  },
  render() {
    const used = new Set(save.menu.filter(Boolean).flatMap(L.parts));
    const list = h('div', {class: 'list scroll'});
    const groups = {cake: 'Cake', frosting: 'Frosting', topping: 'Toppings'};
    for (const kind of L.KINDS) {
      list.append(h('div', {class: 'section'}, groups[kind]));
      for (const id of L.unlockedIds(save).filter(i => L.INGREDIENTS[i].kind === kind)) {
        const deals = day.deals[id] || L.dealsFor(day.r, save.day, settings.bigKid, id);
        day.deals[id] = deals;
        const dealBtn = (deal, other) => h('button', {class: `deal ${deal.vendor}`, onclick: e => this.buy(id, deal, other, e.currentTarget)},
          `${deal.qty} for $${deal.price}`, h('small', null, deal.vendor === 'corner' ? 'Corner Market' : 'Bulk Barn'));
        list.append(h('div', {class: 'item'},
          h('img', {src: D.ingredientIcon(id, kind), alt: ''}),
          h('div', null, h('div', {class: 'name'}, L.INGREDIENTS[id].name), h('div', {class: 'have'}, `You have ${save.stock[id]}`), used.has(id) ? h('span', {class: 'uses'}, 'on your menu') : null),
          dealBtn(deals[0], deals[1]),
          deals[1] ? dealBtn(deals[1], deals[0]) : h('div', {class: 'deal closed'}, 'Bulk Barn', h('small', null, 'opens day 4'))));
      }
    }
    const canMake = fillCounts().reduce((a, b) => a + b, 0);
    this.panel.replaceChildren(
      h('div', {class: 'row-end'}, h('h2', null, 'Market'), h('div', {class: 'spacer'}), h('div', {class: 'muted'}, `Fridge holds ${L.pantryCap(save)} of each`)),
      list,
      h('div', {class: 'row-end'}, h('div', {class: 'grow muted', style: 'flex:1'}, `You can bake ${canMake} cupcake${canMake === 1 ? '' : 's'}`), btn('Kitchen →', () => go(Kitchen), 'pink')),
    );
    this.list = list;
  },
  buy(id, deal, other, el) {
    const res = L.buy(save, id, deal);
    if (res !== 'ok') {
      sfx.gentle(); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
      const msg = res === 'broke' ? S.broke : S.full;
      toast(msg); speak(msg);
      return;
    }
    day.spent += deal.price;
    sfx.coin(); cashChanged();
    const scroll = this.list.scrollTop;
    this.render();
    this.list.scrollTop = scroll;
    const miss = L.savingsMissed(deal, other);
    document.querySelector('.savings')?.remove();
    if (miss) {
      const el2 = h('div', {class: 'savings'}, h('div', {class: 'grow'}, `You could have saved $${miss.saved}!`), btn('Really?', () => { el2.remove(); explainSavings(miss, deal, other, id); }, 'small mint'), h('button', {class: 'speaker', onclick: () => el2.remove()}, '✕'));
      app.append(el2);
      speak(S.couldSave(miss.saved));
      setTimeout(() => el2.remove(), 7000);
    }
  },
  draw() {
    const open = openArea(), f = D.market(ctx, W, H, {t: now, barnOpen: save.day >= 4, open});
    if (f) baxter('tilt', f.sx(0.5), Math.min(f.sy(0.52), open[1] + H * 0.02), Math.min(H * 0.1, (open[1] - open[0]) * 0.45));
    else baxter('tilt', W * 0.5, H * 0.33, H * 0.1);
  },
};
const vendorName = v => (v === 'corner' ? 'Corner Market' : 'Bulk Barn');
function explainSavings(m, chose, other, id) {
  const coins = (n, saved = 0) => h('div', {class: 'coins'}, ...Array.from({length: n}, (_, i) => h('span', {class: 'coin' + (i >= n - saved ? ' saved' : '')}, '$')));
  const what = L.INGREDIENTS[id].name.toLowerCase();
  const side = (deal, packs, cost, extraSaved) => h('div', {class: 'side'},
    h('b', null, vendorName(deal.vendor)), h('div', null, `${deal.qty} for $${deal.price}`),
    packs > 1 ? h('div', null, `${packs} packs = ${m.qty} for $${cost}`) : h('div', null, `${m.qty} for $${cost}`), coins(cost, extraSaved));
  const say = [S.compare(m.qty), S.costs(chose.vendor, m.costA), S.costs(other.vendor, m.costB), S.minus(m.costA, m.costB, m.saved), S.canSave(m.saved)];
  const close = modal(h('h2', null, 'Let’s compare!'), h('p', {class: 'center'}, `Buying ${m.qty} ${what}:`),
    h('div', {class: 'compare'}, side(chose, m.packsA, m.costA, m.saved), side(other, m.packsB, m.costB, 0)),
    h('div', {class: 'answer'}, `$${m.costA} − $${m.costB} = $${m.saved} saved`),
    h('div', {class: 'actions'}, speakerButton(() => say), btn('Got it!', () => close(), 'mint')));
  speak(say);
}

// ---------- kitchen ----------
function fillCounts(start) {
  const counts = start ? [...start] : save.menu.map(() => 0);
  let added = true;
  while (added) {
    added = false;
    for (let i = 0; i < save.menu.length; i++) if (save.menu[i] && L.maxMore(save, counts, i) > 0) { counts[i]++; added = true; }
  }
  return counts;
}
const Kitchen = {
  enter() {
    hud(true);
    day.counts = fillCounts();
    this.baking = 0;
    this.panel = h('div', {class: 'panel', style: 'max-height:56%'});
    mount(this.panel);
    this.render();
    coach('kitchen');
  },
  render() {
    const slots = h('div', {class: 'slots scroll'});
    save.menu.forEach((d, i) => {
      if (!d) { slots.append(h('button', {class: 'newslot', onclick: () => { sfx.tap(); openDesigner(i); }}, '+ Design a new cupcake')); return; }
      const c = h('canvas', {width: 140, height: 140});
      D.cupcake(c.getContext('2d'), d, 70, 132, 124);
      const step = delta => () => {
        const n = (day.counts[i] || 0) + delta;
        if (n < 0 || (delta > 0 && L.maxMore(save, day.counts, i) < 1)) { sfx.gentle(); if (delta > 0) toast(L.ovenCap(save) <= day.counts.reduce((a, b) => a + b, 0) ? `The oven holds ${L.ovenCap(save)}.` : 'You need more ingredients for that one.'); return; }
        day.counts[i] = n; sfx.pop(); this.render();
      };
      slots.append(h('div', {class: 'slot'}, c,
        h('div', null, h('div', {class: 'name'}, d.name), h('div', {class: 'meta'}, `Sells for $${d.price} · costs $${L.designCost(d)} to make`), h('button', {class: 'edit', onclick: () => { sfx.tap(); openDesigner(i); }}, 'Change it')),
        h('div', {class: 'stepper'}, h('button', {onclick: step(-1), 'aria-label': 'Less'}, '−'), h('b', null, day.counts[i] || 0), h('button', {onclick: step(1), 'aria-label': 'More'}, '+'))));
    });
    const total = day.counts.reduce((a, b) => a + b, 0);
    this.panel.replaceChildren(
      h('div', {class: 'row-end'}, h('h2', null, 'Kitchen'), h('div', {class: 'spacer', style: 'flex:1'}), h('div', {class: 'muted'}, `Oven: ${total} of ${L.ovenCap(save)}`)),
      slots,
      h('div', {class: 'row-end'}, btn('← Market', () => go(Market), 'ghost'), h('div', {style: 'flex:1'}), btn(total ? `Bake ${total}!` : 'Bake!', () => this.bake(), 'pink big')),
    );
  },
  bake() {
    const total = day.counts.reduce((a, b) => a + b, 0);
    if (!total) { toast('Add some cupcakes to the oven first!'); sfx.gentle(); return; }
    const shelf = L.bake(save, day.counts);
    if (!shelf) { toast('Not enough ingredients.'); return; }
    day.shelf = shelf; day.baked = total; day.goal = L.goalFor(total); day.quality = [];
    go(Bake);
  },
  draw() {
    D.kitchen(ctx, W, H, {t: now, baking: this.baking, menu: save.menu, counts: day.counts, open: openArea()});
    arianna(this.baking ? 'cheer' : 'think', W * 0.33, H * 0.62, H * 0.3, {face: 'right'});
  },
};

// ---------- the baking mini-game: pour, bake, frost, top ----------
// One round for each kind of cupcake in the oven. Each step scores 0-2; the stars change what customers pay.
const dropImages = {};
const dropImage = id => dropImages[id] || Object.assign(dropImages[id] = new Image(), {src: D.ingredientIcon(id, 'topping')});
const STEPS = [['pour', 'Pour'], ['bake', 'Bake'], ['frost', 'Frost'], ['toppings', 'Top']];
const Bake = {
  enter() {
    hud(true);
    this.queue = save.menu.map((_, i) => i).filter(i => save.menu[i] && day.shelf[i] > 0);
    this.head = h('div', {class: 'bakehead'});
    this.panel = h('div', {class: 'panel bakepanel'});
    mount(this.head, this.panel);
    this.next();
    coach('bake');
  },
  next() {
    if (!this.queue.length) return this.finish();
    this.slot = this.queue.shift();
    this.d = save.menu[this.slot];
    this.points = 0; this.st = {fill: 0}; this.stars = 0;
    this.step('pour');
  },
  step(name) {
    Object.assign(this, {name, holding: false, scored: false, t: 0, drops: []});
    const n = day.shelf[this.slot], idx = STEPS.findIndex(([k]) => k === name);
    this.head.replaceChildren(
      h('div', {class: 'bakewhat'}, `Baking ${n} × ${this.d.name}`),
      h('div', {class: 'steps'}, ...STEPS.map(([, label], i) => h('span', {class: i < idx ? 'done' : i === idx ? 'now' : ''}, label))),
      btn('Quick bake ⏩', () => this.quick(), 'ghost small'));
    const holdBtn = (label) => {
      const b = h('button', {class: 'btn pink big wide hold'}, label);
      b.addEventListener('pointerdown', e => { e.preventDefault(); this.press(); });
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => this.release());
      return b;
    };
    if (name === 'pour') { this.st = {fill: 0}; this.say(S.pour); this.panel.replaceChildren(this.tipEl(S.pour), holdBtn('Hold to pour 🥣')); }
    if (name === 'bake') { this.st = {bake: 0, frost: 0}; this.say(S.oven); sfx.oven(); this.panel.replaceChildren(this.tipEl(S.oven), btn('Take them out! 🧤', () => this.takeOut(), 'pink big wide')); }
    if (name === 'frost') { this.st.frost = 0.001; this.say(S.frost); this.panel.replaceChildren(this.tipEl(S.frost), holdBtn('Hold to frost 🍦')); }
    if (name === 'toppings') {
      this.st.tops = [];
      if (!this.d.toppings.length) return this.finishOne();
      this.say(S.toppings);
      this.panel.replaceChildren(this.tipEl(S.toppings), h('div', {class: 'jars'}, ...this.d.toppings.map(id => {
        const b = h('button', {class: 'pick jar'}, h('img', {src: D.ingredientIcon(id, 'topping'), alt: ''}), L.INGREDIENTS[id].name);
        b.addEventListener('click', () => { if (b.disabled) return; b.disabled = true; b.classList.add('on'); this.dropTopping(id); });
        return b;
      })));
    }
  },
  tipEl(text) { return h('div', {class: 'status'}, h('div', {class: 'grow'}, text), speakerButton(() => text)); },
  say(text) { if (!save.seen['bake-' + this.name] || this.name === 'toppings') speak(text); save.seen['bake-' + this.name] = true; },
  press() { if (this.name === 'pour' || this.name === 'frost') { if (!this.scored) { this.holding = true; unlock(); } } },
  release() {
    if (!this.holding) return;
    this.holding = false;
    const v = this.name === 'pour' ? this.st.fill : this.st.frost;
    if (v < 0.45) return; // barely started: keep going
    this.score(Math.abs(v - (this.name === 'pour' ? 0.82 : 1)), this.name === 'pour' ? 'bake' : 'toppings');
  },
  takeOut() { if (this.name === 'bake' && !this.scored) this.score(Math.abs(this.st.bake - 0.68) * 0.8, 'frost'); },
  score(off, nextStep) {
    this.scored = true;
    const pts = off < 0.07 ? 2 : off < 0.16 ? 1 : 0;
    this.points += pts;
    this.flash = {text: ['Oops!', 'Great!', 'Perfect!'][pts], t: now};
    (pts === 2 ? sfx.yes : pts === 1 ? sfx.pop : sfx.gentle)();
    speak(pts === 2 ? S.perfect : pts === 1 ? S.great : S.messy);
    if (pts === 2) confettiBurst(W / 2, H * 0.35, 18);
    setTimeout(() => { if (scene === this) this.step(nextStep); }, 1300);
  },
  dropTopping(id) {
    sfx.squish();
    this.drops.push({id, t: 0});
    setTimeout(() => {
      if (scene !== this) return;
      this.st.tops.push(id);
      sfx.pop();
      if (this.d.toppings.every(x => this.st.tops.includes(x))) setTimeout(() => scene === this && this.finishOne(), 600);
    }, 550);
  },
  finishOne() {
    this.name = 'done';
    this.stars = L.bakeStars(this.points);
    day.quality[this.slot] = this.stars;
    sfx.unlock(); confettiBurst(W / 2, H * 0.3, 30 + this.stars * 10);
    speak([S.stars(this.stars), this.stars === 3 ? S.fancy : null]);
    this.head.querySelector('.steps')?.replaceChildren(...STEPS.map(([, label]) => h('span', {class: 'done'}, label)));
    this.panel.replaceChildren(h('div', {class: 'status'}, h('div', {class: 'grow', style: 'font-size:24px'}, '⭐'.repeat(this.stars) + '☆'.repeat(3 - this.stars)), h('div', null, S.stars(this.stars))),
      btn(this.queue.length ? 'Next cupcake →' : 'Open the shop! →', () => this.next(), 'pink big wide'));
  },
  quick() {
    for (const i of [this.slot, ...this.queue]) if (day.quality[i] == null) day.quality[i] = 2;
    this.queue = [];
    this.finish();
  },
  finish() { sfx.ding(); speak([S.ding, S.goal(day.goal)]); go(Street); },
  update(dt) {
    this.t += dt;
    if (this.holding && this.name === 'pour') { this.st.fill += dt * 0.42; if (this.st.fill >= 1.3) this.release(); }
    if (this.holding && this.name === 'frost') { this.st.frost += dt * 0.4; if (this.st.frost >= 1.35) this.release(); }
    if (this.name === 'bake' && !this.scored) { this.st.bake += dt * 0.17; if (this.st.bake >= 1.2) this.takeOut(); }
    if (this.name === 'bake' && this.scored) this.st.bake = Math.max(this.st.bake, 0.01);
    for (const d of this.drops) d.t += dt;
  },
  // the cupcake stands on the front counter of the painted kitchen, or on a drawn one
  art() { return D.fitArt('bg2-kitchen', W, H, [0, 0.4, 1, 0.85], 0, H, true); },
  geom() { const s = Math.min(W * 0.6, H * 0.34), f = this.art(); return {cx: W / 2, base: f ? Math.min(f.sy(0.735), H * 0.72) : H * 0.64, s, f}; },
  draw() {
    const {cx, base, s, f} = this.geom(), d = this.d;
    if (f) D.paintArt(ctx, f, H);
    else this.drawnCounter(base);
    if (!d) return;
    this.drawCupcake(cx, base, s, d);
  },
  drawnCounter(base) {
    ctx.fillStyle = '#fff4ea'; ctx.fillRect(0, 0, W, H);
    const tile = W / 8;
    for (let y = 0; y < base; y += tile) for (let x = 0; x < W; x += tile) { ctx.fillStyle = ((x + y) / tile) % 2 ? '#ffe9f1' : '#fff7fb'; ctx.fillRect(x, y, tile, tile); }
    D.rr(ctx, -10, base - 4, W + 20, H * 0.04, 6); ctx.fillStyle = D.C.wood; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = D.C.ink; ctx.stroke();
    ctx.fillStyle = '#f6d7c0'; ctx.fillRect(0, base + H * 0.036, W, H);
  },
  drawCupcake(cx, base, s, d) {
    const wy = -s * 0.4;
    let ovenWin = null; // set while the painted oven shows the cupcake inside it
    if (this.name === 'bake' || (this.name === 'frost' && this.t < 0.4)) {
      // inside the oven, glowing as it bakes
      const oven = image('k3-oven');
      if (oven) {
        // the painted oven (K3): glow in its window, the cupcake on the rack
        const oh = s * 1.3, ow = oh * oven.width / oven.height, ox = cx - ow / 2, oy = base - oh * 0.6;
        const win = [ox + ow * 0.12, oy + oh * 0.33, ow * 0.76, oh * 0.51];
        ctx.drawImage(oven, ox, oy, ow, oh);
        const heat = Math.min(1, (this.st.bake || 0) * 1.4);
        ctx.save(); ctx.beginPath(); ctx.rect(...win); ctx.clip();
        const glow = ctx.createRadialGradient(cx, base - s * 0.2, 10, cx, base - s * 0.2, ow * 0.6);
        glow.addColorStop(0, `rgba(255,${220 - heat * 60},${150 - heat * 90},${0.35 + heat * 0.4})`); glow.addColorStop(1, 'rgba(120,60,30,.35)');
        ctx.fillStyle = glow; ctx.fillRect(...win);
        // a smaller cupcake on the rack, so it fits the oven window
        D.cupcake(ctx, d, cx, oy + oh * 0.66, s * 0.6, now, false, this.st);
        ctx.restore();
        ovenWin = win;
        this.meter(Math.min(ox + ow + 18, W - 22), oy, oh);
      } else {
      const ow = s * 1.25, oh = s * 1.2, ox = cx - ow / 2, oy = base - oh + s * 0.08;
      D.rr(ctx, ox - 14, oy - 14, ow + 28, oh + 28, 22); ctx.fillStyle = '#f6f1fb'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = D.C.ink; ctx.stroke();
      const glow = ctx.createRadialGradient(cx, base - s * 0.3, 10, cx, base - s * 0.3, ow * 0.8);
      const heat = Math.min(1, (this.st.bake || 0) * 1.4);
      glow.addColorStop(0, `rgba(255,${220 - heat * 60},${150 - heat * 90},1)`); glow.addColorStop(1, '#5a3d33');
      D.rr(ctx, ox, oy, ow, oh, 14); ctx.fillStyle = glow; ctx.fill(); ctx.stroke();
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(ox + 12, base + 2 - i * 6); ctx.lineTo(ox + ow - 12, base + 2 - i * 6); ctx.strokeStyle = `rgba(255,${120 + i * 40},60,${0.4 + heat * 0.5})`; ctx.lineWidth = 3; ctx.stroke(); }
      this.meter(cx + ow / 2 + 26, oy, oh);
      }
    }
    const stage = this.name === 'done' ? null : this.st;
    const bounce = this.name === 'done' ? -Math.abs(Math.sin(now * 4)) * s * 0.04 : 0;
    if (!ovenWin) D.cupcake(ctx, d, cx, base + bounce, s, now, false, stage);
    if (this.name === 'pour') {
      // fill line
      const ly = base + wy * 0.82;
      ctx.fillStyle = 'rgba(159,227,192,.45)'; ctx.fillRect(cx - s * 0.5, base + wy * 0.9, s, wy * -0.16);
      ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(cx - s * 0.52, ly); ctx.lineTo(cx + s * 0.52, ly); ctx.lineWidth = 3; ctx.strokeStyle = '#3f9e6e'; ctx.stroke(); ctx.setLineDash([]);
      D.text(ctx, 'fill line', cx + s * 0.58, ly, 14, {align: 'left', color: '#3f9e6e', weight: 700, stroke: '#fff', sw: 4});
      // the mixing bowl, tipping while she pours
      const bowl = image('k1-bowl');
      if (bowl) {
        // the painted bowl (K1), flipped so its spout faces the cupcake, tipping about the spout
        const bh = s * 0.6, bw = bh * bowl.width / bowl.height;
        ctx.save(); ctx.translate(cx + s * 0.06, base - s * 1.0); ctx.rotate(this.holding ? -0.55 : -0.1); ctx.scale(-1, 1);
        ctx.drawImage(bowl, -bw * 0.98, -bh * 0.55, bw, bh);
        ctx.restore();
      } else {
      const tip = this.holding ? -0.75 : -0.2;
      ctx.save(); ctx.translate(cx + s * 0.3, base - s * 1.05); ctx.rotate(tip);
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.36, s * 0.08, 0, 0, Math.PI * 2); ctx.fillStyle = D.batterColor(d.cake); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-s * 0.36, 0); ctx.quadraticCurveTo(0, s * 0.5, s * 0.36, 0); ctx.closePath(); ctx.fillStyle = '#8fc8f2'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = D.C.ink; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.36, s * 0.08, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      }
      if (this.holding) {
        const top = base + wy * Math.min(1.1, this.st.fill);
        ctx.beginPath(); ctx.moveTo(cx + s * 0.02, base - s * 1.0); ctx.quadraticCurveTo(cx - s * 0.02 + Math.sin(now * 20) * 3, (top + base - s) / 2, cx, top);
        ctx.lineWidth = s * 0.07; ctx.lineCap = 'round'; ctx.strokeStyle = D.batterColor(d.cake); ctx.stroke(); ctx.lineCap = 'butt';
      }
    }
    if (this.name === 'frost') {
      const topY = base - s * 0.385 - s * 0.53;
      ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(cx - s * 0.4, topY); ctx.lineTo(cx + s * 0.4, topY); ctx.lineWidth = 3; ctx.strokeStyle = '#3f9e6e'; ctx.stroke(); ctx.setLineDash([]);
      D.text(ctx, 'top line', cx + s * 0.46, topY, 14, {align: 'left', color: '#3f9e6e', weight: 700, stroke: '#fff', sw: 4});
      // the piping bag, circling as the swirl builds
      const ny = base - s * 0.385 - Math.min(1.3, this.st.frost) * s * 0.53 - s * 0.03, nx = cx + (this.holding ? Math.sin(now * 9) * s * 0.18 : 0);
      const bag = image('k2-piping-bag');
      if (bag) { const bh = s * 0.62, bw = bh * bag.width / bag.height; ctx.save(); ctx.translate(nx, ny); ctx.rotate(0.15); ctx.drawImage(bag, -bw / 2, -bh, bw, bh); ctx.restore(); }
      else {
      ctx.save(); ctx.translate(nx, ny); ctx.rotate(0.15);
      ctx.beginPath(); ctx.moveTo(-s * 0.03, 0); ctx.lineTo(s * 0.03, 0); ctx.lineTo(s * 0.2, -s * 0.5); ctx.quadraticCurveTo(0, -s * 0.6, -s * 0.2, -s * 0.5); ctx.closePath();
      ctx.fillStyle = '#f9d7e6'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = D.C.ink; ctx.stroke();
      D.rr(ctx, -s * 0.035, -s * 0.03, s * 0.07, s * 0.06, 4); ctx.fillStyle = '#d9d9e3'; ctx.fill(); ctx.stroke();
      ctx.restore();
      }
    }
    for (const drop of this.drops) if (drop.t < 0.6) {
      const k = Math.min(1, drop.t / 0.55), y = base - s * 1.6 + k * k * s * 0.75;
      if (drop.id === 'sprinkles' || drop.id === 'chips') for (let i = 0; i < 10; i++) D.text(ctx, drop.id === 'chips' ? '•' : '▮', cx + Math.sin(i * 2.3) * s * 0.25, y + (i % 4) * 8, 12, {color: drop.id === 'chips' ? '#5a3420' : ['#ff6b9d', '#4fb8f0', '#ffd23d', '#6fd16f'][i % 4]});
      else { const img = dropImage(drop.id); if (img.complete) ctx.drawImage(img, cx - s * 0.15, y - s * 0.15, s * 0.3, s * 0.3); }
    }
    if (this.name === 'done') {
      const star = image('u7-star'), sz = s * 0.2;
      if (star) for (let i = 0; i < this.stars; i++) ctx.drawImage(star, cx + (i - (this.stars - 1) / 2) * sz * 1.1 - sz / 2, base - s * 1.42 - (i === 1 ? sz * 0.15 : 0), sz, sz);
      else D.text(ctx, '⭐'.repeat(this.stars), cx, base - s * 1.08, s * 0.18);
    }
    if (this.flash && now - this.flash.t < 1.2) {
      const k = (now - this.flash.t) / 1.2;
      D.text(ctx, this.flash.text, cx, base - s * 1.15 - k * 20, s * 0.17 * (1 + Math.sin(Math.min(1, k * 4) * Math.PI) * 0.15), {color: this.flash.text === 'Oops!' ? '#e8506a' : D.C.pink, weight: 700, stroke: '#fff', sw: 6});
    }
    arianna(this.name === 'done' ? (this.stars === 3 ? 'cheer' : 'wave') : this.holding ? 'think' : 'stand', W * 0.12, base + H * 0.03, H * 0.28, {face: 'right'});
    baxter(this.name === 'done' ? 'excited' : 'tilt', W * 0.89, base + H * 0.035, H * 0.1);
  },
  meter(x, y, hgt) {
    // pale -> golden -> brown, with the golden zone marked
    const w = 22, g = ctx.createLinearGradient(0, y + hgt, 0, y);
    g.addColorStop(0, '#fff3cf'); g.addColorStop(0.5, '#f2b544'); g.addColorStop(0.75, '#d68a2c'); g.addColorStop(1, '#6e4022');
    D.rr(ctx, x - w / 2, y, w, hgt, 10); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = D.C.ink; ctx.stroke();
    const zone = v => y + hgt - (v / 1.2) * hgt;
    ctx.lineWidth = 3; ctx.strokeStyle = '#3f9e6e'; ctx.strokeRect(x - w / 2 - 4, zone(0.78), w + 8, zone(0.58) - zone(0.78));
    const my = zone(Math.min(1.2, this.st.bake || 0));
    ctx.beginPath(); ctx.moveTo(x - w / 2 - 12, my - 8); ctx.lineTo(x - w / 2 - 2, my); ctx.lineTo(x - w / 2 - 12, my + 8); ctx.closePath(); ctx.fillStyle = D.C.ink; ctx.fill();
    D.text(ctx, 'golden', x, zone(0.68), 11, {weight: 700, color: '#fff', stroke: D.C.ink, sw: 3});
  },
};

// ---------- cupcake designer ----------
function openDesigner(slot) {
  const d = save.menu[slot] ? JSON.parse(JSON.stringify(save.menu[slot])) :
    {cake: 'vanilla', frosting: 'white', toppings: ['sprinkles'], name: randomName(), price: 5};
  const words = d.name.split(' ');
  const prev = h('canvas');
  const cost = h('div', {class: 'costtag'});
  const body = h('div', {class: 'body'});
  let raf = 0;
  const drawPrev = () => {
    const r = prev.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    if (prev.width !== Math.round(r.width * dpr)) { prev.width = Math.round(r.width * dpr); prev.height = Math.round(r.height * dpr); }
    const g = prev.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height);
    D.cupcake(g, d, r.width / 2, r.height * 0.95, r.height * 0.88, performance.now() / 1000);
    raf = requestAnimationFrame(drawPrev);
  };
  const pickRow = (kind, multi) => {
    const row = h('div', {class: 'chips'});
    for (const id of L.unlockedIds(save).filter(i => L.INGREDIENTS[i].kind === kind)) {
      const on = multi ? d.toppings.includes(id) : d[kind] === id;
      row.append(h('button', {class: 'pick' + (on ? ' on' : ''), onclick: () => {
        if (multi) {
          if (d.toppings.includes(id)) d.toppings = d.toppings.filter(x => x !== id);
          else { d.toppings.push(id); if (d.toppings.length > 2) d.toppings.shift(); }
        } else d[kind] = id;
        sfx.squish(); render();
      }}, h('img', {src: D.ingredientIcon(id, kind), alt: ''}), L.INGREDIENTS[id].name.replace(/ (cake|frosting)$/, ''), h('small', null, `$${L.INGREDIENTS[id].cost}`)));
    }
    return row;
  };
  const input = h('input', {value: d.name, maxlength: 28, 'aria-label': 'Cupcake name', oninput: e => { d.name = e.target.value; }});
  function render() {
    const c = L.designCost(d), keep = d.price - c;
    cost.textContent = `Costs you $${c} each`;
    const scroll = body.scrollTop;
    body.replaceChildren(
      h('div', {class: 'label'}, 'Cake'), pickRow('cake'),
      h('div', {class: 'label'}, 'Frosting'), pickRow('frosting'),
      h('div', {class: 'label'}, 'Toppings (up to 2)'), pickRow('topping', true),
      h('div', {class: 'label'}, 'Name'),
      h('div', {class: 'namebox'}, ...L.NAME_WORDS.map((list, k) => h('button', {class: 'word', onclick: () => {
        words[k] = list[(list.indexOf(words[k]) + 1) % list.length];
        d.name = L.NAME_WORDS.map((l, j) => words[j] || l[0]).join(' '); input.value = d.name; sfx.pop();
      }}, ['🎀', '🐶', '✨'][k] + ' ' + ['Word 1', 'Word 2', 'Word 3'][k])), input),
      h('div', {class: 'label'}, 'Price'),
      h('div', {class: 'price'}, h('div', {class: 'stepper'}, h('button', {onclick: () => { if (d.price > 1) { d.price--; sfx.pop(); render(); } }}, '−')), h('b', null, `$${d.price}`), h('div', {class: 'stepper'}, h('button', {onclick: () => { if (d.price < 20) { d.price++; sfx.pop(); render(); } }}, '+'))),
      h('div', {class: 'hint' + (keep < 0 ? ' bad' : '')}, keep > 0 ? `It costs $${c} to make. Sell it for $${d.price} and you keep $${keep} each.` : keep === 0 ? `It costs $${c} to make, so at $${d.price} you keep nothing.` : `Uh oh! It costs $${c} to make. At $${d.price} you lose $${-keep} each.`),
    );
    body.scrollTop = scroll;
  }
  const close = () => { cancelAnimationFrame(raf); el.remove(); };
  const el = h('div', {class: 'designer'},
    h('div', {class: 'preview'}, prev, cost),
    body,
    h('div', {class: 'foot'}, btn('Cancel', close, 'ghost'), btn('Done!', () => {
      d.name = d.name.trim() || randomName();
      save.menu[slot] = d; close(); sfx.yes(); speak([S.designDone, S.priceEach(d.price)]);
      if (scene === Kitchen) { day.counts = fillCounts(day.counts.map((n, i) => (i === slot ? 0 : n))); Kitchen.render(); }
    }, 'pink')));
  app.append(el);
  render();
  drawPrev();
}
const randomName = () => L.NAME_WORDS.map(l => l[Math.floor(Math.random() * l.length)]).join(' ');

// ---------- selling on the street ----------
const Street = {
  enter(back) {
    hud(true);
    this.walker = null; this.wait = back ? 0.8 : 1.0; this.closing = 0;
    this.panel = h('div', {class: 'panel'});
    mount(this.panel);
    this.idle();
    if (!back) coach('street');
  },
  idle() {
    const left = day.shelf.reduce((a, b) => a + b, 0);
    this.panel.replaceChildren(h('div', {class: 'status'}, h('div', {class: 'grow'}, left ? 'Waiting for customers…' : 'All sold out!'), h('div', null, `Sold ${day.soldCount} · goal ${day.goal} ${day.soldCount >= day.goal ? '⭐' : ''}`)));
  },
  geom() {
    const f = D.streetArt(W, H);
    if (f) {
      // the painted sidewalk; customers stand a little shorter than the shop door
      const feet = f.sy(0.75);
      return {groundY: feet - H * 0.045, spot: W * 0.36, feet, ch: Math.min(f.h * 0.27, W * 0.42), road: f.sy(0.94)};
    }
    const g = H * 0.55;
    return {groundY: g, spot: W * 0.36, feet: g + H * 0.045, ch: Math.min(H * 0.2, W * 0.42), road: g + H * 0.16};
  },
  update(dt) {
    if (this.closing) { this.closing -= dt; if (this.closing <= 0) { this.closing = 0; go(Results); } return; }
    const g = this.geom(), speed = W * 0.32;
    const w = this.walker;
    if (!w) {
      this.wait -= dt;
      if (this.wait > 0) return;
      if (day.next >= day.passers.length || day.shelf.every(n => n <= 0)) { this.close(); return; }
      const p = day.passers[day.next++];
      this.walker = {...p, x: W + 60, state: 'in', face: 'happy', t: 0};
      preloadCustomer(p.type);
      return;
    }
    w.t += dt;
    if (w.state === 'in') {
      w.x -= speed * dt;
      if (w.hungry && w.x <= g.spot) { w.x = g.spot; w.state = 'decide'; w.t = 0; }
      if (!w.hungry && w.x < -80) { this.walker = null; this.wait = 0.3; }
    } else if (w.state === 'decide' && w.t > 0.45) {
      const res = L.decide(w.type, save.menu, day.shelf, save.day, w.mood, day.quality);
      if (res.action === 'buy') { w.state = 'order'; this.order(w, res.slot); }
      else if (res.action === 'pricey') {
        day.pricey[res.slot] = (day.pricey[res.slot] || 0) + 1;
        w.state = 'say'; w.face = 'hmm'; w.t = 0;
        this.say(w, S.pricey(save.menu[res.slot].price));
      } else { this.close(); }
    } else if (w.state === 'say' && w.t > 2.6) { w.state = 'out'; this.bubble?.remove(); this.idle(); }
    else if (w.state === 'out') { w.x -= speed * dt; if (w.x < -80) { this.walker = null; this.wait = 0.4 + Math.random() * 0.8; } }
  },
  say(w, msg) {
    this.bubble?.remove();
    this.bubble = h('div', {class: 'bubble', style: `top:${H * 0.17}px`}, h('div', {class: 'who'}, L.CUSTOMERS[w.type].name), h('div', {class: 'say'}, h('div', null, msg), speakerButton(() => msg, w.type)));
    ui.append(this.bubble);
    speak(msg, {customer: w.type});
  },
  close() {
    if (this.closing) return;
    this.closing = 2.2;
    this.bubble?.remove();
    const soldOut = day.shelf.every(n => n <= 0);
    ui.append(h('div', {class: 'banner'}, soldOut ? 'Sold out! 🎉' : 'Closing time!'));
    speak(soldOut ? S.soldOut : S.closing);
    if (soldOut) confettiBurst(W / 2, H * 0.4);
  },
  order(w, slot) {
    const d = save.menu[slot], party = !day.partyDone && day.shelf[slot] >= 4;
    const order = L.makeOrder(day.r, L.orderTier(save.day, settings.bigKid), day.shelf[slot], party);
    if (party) day.partyDone = true;
    day.order = order;
    const address = L.makeAddress(day.r, save.day, settings.bigKid);
    const greet = [L.CUSTOMERS[w.type].kind === 'dog' ? S.woof : null, GREET[Math.floor(day.r() * GREET.length)]].filter(Boolean);
    const line1 = `${greet.join(' ')} I’d like the ${d.name}.`;
    const spoken = [...greet, ...order.say];
    let typed = '', misses = 0;
    const hintBox = h('div');
    this.bubble?.remove();
    this.bubble = h('div', {class: 'bubble', style: `top:${H * 0.15}px`}, h('div', {class: 'who'}, L.CUSTOMERS[w.type].name),
      h('div', {class: 'say'}, h('div', null, line1, h('br'), h('b', null, order.text)), speakerButton(() => spoken, w.type)), hintBox);
    ui.append(this.bubble);
    speak(spoken, {customer: w.type});
    const screen = h('div', {class: 'screen'}, h('span', {class: 'what'}, `How many ${d.name}?`), h('span', null, ''));
    const show = () => { screen.lastChild.textContent = typed || '_'; };
    const key = k => () => {
      sfx.tap();
      if (k === 'del') typed = typed.slice(0, -1);
      else if (k === 'ok') return submit();
      else if (typed.length < 2) typed = (typed + k).replace(/^0+(?=\d)/, '');
      show();
    };
    const submit = () => {
      if (!typed) { sfx.gentle(); return; }
      if (+typed === order.answer) return this.sold(w, slot, order, address);
      misses++;
      sfx.gentle(); w.face = 'hmm'; this.oopsAt = now;
      hintBox.replaceChildren(hintDots(order, misses >= 2));
      if (misses >= 2) { typed = String(order.answer); show(); speak(S.countIt(order.answer)); }
      else { typed = ''; show(); speak(S.notQuite); }
    };
    this.keyHandler = e => {
      if (/^\d$/.test(e.key)) key(e.key)();
      else if (e.key === 'Backspace') key('del')();
      else if (e.key === 'Enter') key('ok')();
    };
    addEventListener('keydown', this.keyHandler);
    const keys = h('div', {class: 'keys'});
    for (const k of ['1', '2', '3', 'del', '4', '5', '6', 'ok', '7', '8', '9', '0']) {
      keys.append(h('button', {class: 'key' + (k === 'ok' ? ' ok' : k === 'del' ? ' del' : ''), onclick: key(k), style: k === '0' ? 'grid-column: 2' : ''}, k === 'del' ? '⌫' : k === 'ok' ? 'OK' : k));
    }
    this.panel.className = 'panel register';
    this.panel.replaceChildren(screen, keys);
    show();
  },
  sold(w, slot, order, address) {
    removeEventListener('keydown', this.keyHandler);
    const d = save.menu[slot], total = order.answer * d.price;
    day.shelf[slot] -= order.answer;
    day.sold[slot] = (day.sold[slot] || 0) + order.answer;
    day.soldCount += order.answer;
    day.sales += total; save.cash += total;
    if (L.willingToPay(w.type, d, save.day, w.mood, day.quality?.[slot]) - d.price >= 3) day.cheap[slot] = (day.cheap[slot] || 0) + 1;
    const newSticker = !save.stickers[w.type];
    save.stickers[w.type] = (save.stickers[w.type] || 0) + 1;
    w.face = 'wow';
    sfx.chaChing(); cashChanged(); speak(S.comingUp);
    const g = this.geom();
    coinsTo(g.spot, g.feet - g.ch * 0.6, Math.min(12, order.answer * 2));
    const ticket = h('div', {class: 'ticket'}, 'Order ticket', h('br'), h('b', null, `${order.answer} × ${d.name}`), h('br'), `${order.answer} × $${d.price} = $${total}`, newSticker ? h('div', {style: 'margin-top:6px;color:#f27aa9'}, '⭐ New sticker!') : null);
    ui.append(ticket);
    const msg = `${S.thanks} ${L.addressText(address)}`;
    setTimeout(() => {
      ticket.remove();
      if (scene !== this) return;
      this.bubble.replaceChildren(h('div', {class: 'who'}, L.CUSTOMERS[w.type].name), h('div', {class: 'say'}, h('div', null, h('b', null, msg)), speakerButton(() => [S.thanks, ...L.addressSpoken(address)], w.type)));
      speak([S.thanks, ...L.addressSpoken(address)], {customer: w.type});
      this.panel.className = 'panel';
      this.panel.replaceChildren(btn(address.mode === 'line' ? 'Find the house →' : 'Find it on the map →', () => go(Find, {w, slot, order, address}), 'pink big wide'));
    }, 1700);
  },
  exit() { removeEventListener('keydown', this.keyHandler); },
  draw() {
    const g = this.geom();
    const shop = D.street(ctx, W, H, {t: now, save, groundY: g.groundY, shopName: SHOP_NAME, event: day.event});
    // Arianna behind the counter, seen through the window
    ctx.save(); D.rr(ctx, shop.win.x, shop.win.y, shop.win.w, shop.win.h, 6); ctx.clip();
    arianna(now - (this.oopsAt ?? -9) < 2.5 ? 'oops' : this.walker?.state === 'order' ? 'think' : this.closing ? 'cheer' : 'stand', shop.win.x + shop.win.w * 0.72, shop.win.y + shop.win.h * 1.35, shop.win.h * 1.45);
    ctx.restore();
    D.shelfDisplay(ctx, shop, save.menu, day.shelf, now, H);
    if (day.event === 'birthday' && !shop.painted) for (let i = 0; i < 7; i++) { ctx.fillStyle = ['#ffd23d', '#9fe3c0', '#c3a6ec', '#ff9fc4'][i % 4]; ctx.beginPath(); const bx = W * 0.08 + i * W * 0.12; ctx.moveTo(bx, H * 0.27); ctx.lineTo(bx + W * 0.1, H * 0.27); ctx.lineTo(bx + W * 0.05, H * 0.3); ctx.fill(); }
    D.vanSide(ctx, W * 0.02, g.road, Math.min(W * 0.5, H * 0.3), save.paint, {t: now, name: D.streetArt(W, H) ? '' : SHOP_NAME});
    baxter(this.walker?.state === 'order' ? 'excited' : 'sit', W * 0.88, g.feet - H * 0.005, Math.min(H * 0.11, W * 0.24));
    const w = this.walker;
    if (w) {
      drawCustomer(ctx, w.type, w.x, g.feet, g.ch, {t: now + w.t, walking: w.state === 'in' || w.state === 'out', face: w.face, dir: -1});
      // a feelings bubble: a heart when served, a question mark for a wrong count, a sweat drop at a high price
      feeling(w, w.face === 'wow' ? 'heart' : w.face === 'hmm' ? (now - (this.oopsAt ?? -9) < 2.5 ? 'question' : 'sweat') : null, w.x + g.ch * 0.2, g.feet - g.ch * (ART_SCALE[w.type] || 1) * 0.98, g.ch * 0.26);
    }
  },
};

function hintDots(order, reveal) {
  const h_ = order.hint, dots = (n, cls = '') => h('div', {class: 'grp'}, ...Array.from({length: n}, () => h('span', {class: 'dot ' + cls})));
  const row = h('div', {class: 'dots'});
  if (h_.kind === 'count') row.append(dots(h_.n), `= ${h_.n}`);
  if (h_.kind === 'add') { row.append(dots(h_.a), '+', dots(h_.b, 'b'), reveal ? `= ${h_.a + h_.b}` : '= ?'); if (h_.extra) row.append(h('span', {class: 'muted'}, `(The ${h_.extra} at home don’t count!)`)); }
  if (h_.kind === 'sub') { const g = h('div', {class: 'grp'}); for (let i = 0; i < h_.a; i++) g.append(h('span', {class: 'dot' + (i >= h_.a - h_.b ? ' x' : '')})); row.append(g, reveal ? `= ${h_.a - h_.b}` : `${h_.a} − ${h_.b} = ?`); }
  if (h_.kind === 'groups' || h_.kind === 'groupsMinus') {
    for (let i = 0; i < h_.g; i++) row.append(dots(h_.k, i % 2 ? 'b' : ''));
    row.append(reveal ? `= ${order.answer}` : `${h_.g} groups of ${h_.k}${h_.kind === 'groupsMinus' ? `, take away ${h_.b}` : ''}`);
  }
  return row;
}

// ---------- finding the address ----------
const Find = {
  enter(job) {
    this.job = job; this.misses = 0; this.picked = null; this.hint = 0;
    hud(true);
    const a = job.address;
    this.help = h('div', {class: 'findhelp'});
    this.helpSay(a.mode === 'line' ? S.tapHouse : S.tapCorner);
    mount(h('div', {class: 'target'}, a.mode === 'line' ? `🏠 House ${a.n}` : `📍 (${a.x}, ${a.y})`), this.help);
    speak(L.addressSpoken(a), {customer: job.w.type});
    coach(a.mode === 'line' ? 'findline' : 'findgrid');
  },
  helpSay(msg, spoken = null) {
    const a = this.job.address;
    this.help.replaceChildren(h('div', {class: 'bubble', style: 'position:static'}, h('div', {class: 'say'}, h('div', null, h('b', null, L.addressText(a)), h('br'), msg), speakerButton(() => spoken || L.addressSpoken(a), this.job.w.type))));
  },
  layout() {
    const a = this.job.address;
    if (a.mode === 'line') {
      const left = W * 0.07, right = W * 0.93, y = H * 0.52;
      return {line: true, left, step: (right - left) / 10, y};
    }
    const size = a.size, top = MARGIN - 1 + (6 - size) * 4, x0 = MARGIN - 1;
    const tiles = size * 4 + 3, avail = Math.min(W * 0.86, H * 0.5);
    const s = avail / tiles, ox = (W - tiles * s) / 2 + s * 0.4, oy = H * 0.2;
    const pt = (gx, gy) => { const t = gridToTile(gx, gy); return {x: ox + (t.tx - x0 + 0.5) * s, y: oy + (t.ty - top + 0.5) * s}; };
    return {line: false, s, ox, oy, x0, top, tiles, pt, size};
  },
  tap(x, y) {
    if (this.picked) return;
    const a = this.job.address, lay = this.layout();
    let ok = false, choice;
    if (lay.line) {
      choice = Math.round((x - lay.left) / lay.step);
      if (choice < 0 || choice > 10 || Math.abs(y - lay.y) > H * 0.14) return;
      ok = choice === a.n;
    } else {
      let best = null;
      for (let gx = 0; gx <= lay.size; gx++) for (let gy = 0; gy <= lay.size; gy++) { const p = lay.pt(gx, gy), dd = Math.hypot(p.x - x, p.y - y); if (!best || dd < best.d) best = {gx, gy, d: dd}; }
      if (!best || best.d > lay.s * 2.2) return;
      choice = [best.gx, best.gy];
      ok = best.gx === a.x && best.gy === a.y;
    }
    this.tapped = {choice, ok, t: now};
    if (ok) {
      this.picked = choice; sfx.yes(); confettiBurst(x, y, 20);
      speak(a.mode === 'line' ? S.yesHouse(a.n) : S.yesPoint(a.x, a.y));
      this.help.replaceChildren(btn('Drive there! 🚐', () => go(Drive, this.job), 'pink big wide'));
    } else {
      this.misses++; sfx.gentle();
      const say = a.mode === 'line' ? [this.misses >= 2 ? S.hereHouse(a.n) : S.wrongHouse(choice)]
        : this.misses >= 2 ? [S.herePoint(a.x, a.y)] : [S.wrongPoint(choice[0], choice[1]), S.goOver(a.x, a.y)];
      this.hint = this.misses;
      this.helpSay(say.join(' '), say); speak(say);
    }
  },
  draw() {
    const a = this.job.address, lay = this.layout();
    ctx.fillStyle = '#e9f7ff'; ctx.fillRect(0, 0, W, H);
    if (lay.line) {
      const sky = ctx.createLinearGradient(0, 0, 0, lay.y); sky.addColorStop(0, '#9fd8ff'); sky.addColorStop(1, '#e6f6ff');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, lay.y + 8);
      D.rr(ctx, W / 2 - 80, lay.y - lay.step * 3.6, 160, 40, 10); ctx.fillStyle = '#8fdcb8'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = D.C.ink; ctx.stroke();
      D.text(ctx, 'Main Street', W / 2, lay.y - lay.step * 3.6 + 20, 20, {color: '#fff', weight: 700, stroke: D.C.ink, sw: 4});
      // Main Street as a number line, our shop at 0
      ctx.fillStyle = D.C.grass; ctx.fillRect(0, lay.y + 8, W, H * 0.12);
      ctx.fillStyle = D.C.road; ctx.fillRect(0, lay.y + H * 0.05, W, H * 0.05);
      ctx.fillStyle = '#fff6c9'; for (let i = 0; i < 12; i++) ctx.fillRect(i * W / 11, lay.y + H * 0.073, W / 22, 3);
      ctx.strokeStyle = D.C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lay.left - 10, lay.y + 8); ctx.lineTo(lay.left + lay.step * 10 + 10, lay.y + 8); ctx.stroke();
      for (let n = 0; n <= 10; n++) {
        const x = lay.left + n * lay.step, hh = lay.step * 1.7, bounce = (this.hint >= 2 && n === a.n) || (this.picked === n) ? -Math.abs(Math.sin(now * 6)) * 12 : 0;
        if (n === 0) { D.rr(ctx, x - lay.step * 0.48, lay.y - hh * 1.2, lay.step * 0.96, hh * 1.2, 4); ctx.fillStyle = '#fff4f8'; ctx.fill(); ctx.stroke(); for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? '#fff' : D.C.pink; ctx.fillRect(x - lay.step * 0.48 + k * lay.step * 0.24, lay.y - hh * 1.2, lay.step * 0.24, hh * 0.25); } D.cupcake(ctx, {cake: 'vanilla', frosting: 'pink', toppings: ['cherry']}, x, lay.y - 2, lay.step * 0.6); }
        else {
          ctx.save(); ctx.translate(0, bounce);
          D.rr(ctx, x - lay.step * 0.38, lay.y - hh * 0.75, lay.step * 0.76, hh * 0.75, 3); ctx.fillStyle = ['#fff3e6', '#fff8d9', '#f2f7ff', '#fff0f5'][n % 4]; ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x - lay.step * 0.48, lay.y - hh * 0.75); ctx.lineTo(x, lay.y - hh * 1.15); ctx.lineTo(x + lay.step * 0.48, lay.y - hh * 0.75); ctx.closePath(); ctx.fillStyle = ['#f48fb5', '#8fc8f2', '#ffd66b', '#c3a6ec', '#8fdcb8'][n % 5]; ctx.fill(); ctx.stroke();
          D.rr(ctx, x - lay.step * 0.1, lay.y - hh * 0.32, lay.step * 0.2, hh * 0.32, 2); ctx.fillStyle = '#c18d5f'; ctx.fill(); ctx.stroke();
          ctx.restore();
        }
        ctx.beginPath(); ctx.moveTo(x, lay.y + 2); ctx.lineTo(x, lay.y + 16); ctx.stroke();
        const label = a.labels === 'all' || n % 5 === 0 || this.misses >= 1;
        if (label) D.text(ctx, String(n), x, lay.y + 30, Math.min(22, lay.step * 0.6), {weight: 700, stroke: '#fff', sw: 4});
        if (this.tapped && !this.tapped.ok && this.tapped.choice === n && now - this.tapped.t < 1.2) { ctx.fillStyle = 'rgba(232,80,106,.25)'; ctx.fillRect(x - lay.step / 2, lay.y - hh * 1.3, lay.step, hh * 1.3); }
        if (this.picked === n) D.text(ctx, '⭐', x, lay.y - hh * 1.4, 26);
      }
      baxter('sniff', W * 0.2, lay.y + H * 0.2, H * 0.09, {face: 'right'});
    } else {
      const tc = townCanvas();
      ctx.save(); D.rr(ctx, lay.ox - lay.s * 0.4, lay.oy, lay.tiles * lay.s, lay.tiles * lay.s, 14); ctx.clip();
      ctx.drawImage(tc, lay.x0 * TS, lay.top * TS, lay.tiles * TS, lay.tiles * TS, lay.ox - lay.s * 0.4, lay.oy, lay.tiles * lay.s, lay.tiles * lay.s);
      ctx.restore();
      ctx.lineWidth = 3; ctx.strokeStyle = D.C.ink; D.rr(ctx, lay.ox - lay.s * 0.4, lay.oy, lay.tiles * lay.s, lay.tiles * lay.s, 14); ctx.stroke();
      for (let i = 0; i <= lay.size; i++) {
        const px = lay.pt(i, 0), py = lay.pt(0, i);
        D.text(ctx, String(i), px.x, lay.oy + lay.tiles * lay.s + 16, 18, {weight: 700, stroke: '#fff', sw: 4});
        D.text(ctx, String(i), lay.ox - lay.s * 0.4 - 14, py.y, 18, {weight: 700, stroke: '#fff', sw: 4});
      }
      for (let gx = 0; gx <= lay.size; gx++) for (let gy = 0; gy <= lay.size; gy++) {
        const p = lay.pt(gx, gy);
        ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
      }
      const shop = lay.pt(0, 0);
      D.text(ctx, '🧁', shop.x - lay.s * 0.6, shop.y + lay.s * 0.7, 20);
      if (this.hint >= 1 || this.picked) {
        // over, then up
        const o = lay.pt(0, 0), over = lay.pt(a.x, 0), up = lay.pt(a.x, a.y);
        ctx.setLineDash([8, 6]); ctx.lineWidth = 5; ctx.strokeStyle = '#f27aa9';
        ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(over.x, over.y); ctx.lineTo(up.x, up.y); ctx.stroke(); ctx.setLineDash([]);
      }
      if (this.tapped && !this.tapped.ok && now - this.tapped.t < 1.2) { const p = lay.pt(...this.tapped.choice); ctx.beginPath(); ctx.arc(p.x, p.y, 14, 0, Math.PI * 2); ctx.fillStyle = 'rgba(232,80,106,.45)'; ctx.fill(); }
      if (this.hint >= 2 || this.picked) { const p = lay.pt(a.x, a.y); D.text(ctx, '⭐', p.x, p.y - 14 - Math.abs(Math.sin(now * 6)) * 10, 30); }
      D.text(ctx, 'over →', W / 2, lay.oy + lay.tiles * lay.s + 40, 16, {weight: 600});
      D.text(ctx, '↑ up', lay.ox + lay.s * 0.6, lay.oy - 14, 16, {weight: 600, align: 'left'});
    }
  },
};

// ---------- driving ----------
const KEYS = {ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right'};
const Drive = {
  enter(job) {
    hud(true);
    this.job = job;
    this.dest = destination(town, job.address);
    this.van = createVan(town, town.start);
    this.speed = L.vanSpeed(save);
    this.limit = timeLimit(town, town.start, this.dest.road, this.speed);
    this.elapsed = 0; this.trail = null; this.trailT = 0; this.sniffT = 0; this.done = false;
    this.held = {up: false, down: false, left: false, right: false};
    const pad = h('div', {class: 'dpad'});
    for (const [dir, sym] of [['up', '▲'], ['left', '◀'], ['right', '▶'], ['down', '▼']]) {
      const b = h('button', {class: dir, 'aria-label': dir});
      b.textContent = sym;
      const on = e => { e.preventDefault(); this.held[dir] = true; b.classList.add('held'); unlock(); };
      const off = () => { this.held[dir] = false; b.classList.remove('held'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
      pad.append(b);
    }
    this.sniffBtn = btn(`🐾 Baxter, sniff it out! (${day.sniffs})`, () => this.sniff(), 'mint small sniff');
    if (!day.sniffs) this.sniffBtn.disabled = true;
    const a = job.address;
    mount(h('div', {class: 'target'}, a.mode === 'line' ? `🏠 House ${a.n}` : `📍 (${a.x}, ${a.y})`), this.sniffBtn, pad);
    this.kd = e => { if (KEYS[e.key]) { this.held[KEYS[e.key]] = true; e.preventDefault(); } if (e.key === ' ') this.sniff(); };
    this.ku = e => { if (KEYS[e.key]) this.held[KEYS[e.key]] = false; };
    addEventListener('keydown', this.kd); addEventListener('keyup', this.ku);
    coach(settings.easyDrive ? 'drive' : 'driveFree', 'drive');
    sfx.honk();
  },
  exit() { removeEventListener('keydown', this.kd); removeEventListener('keyup', this.ku); engineOff(); },
  input() { const k = this.held; return {x: (k.right ? 1 : 0) - (k.left ? 1 : 0), y: (k.down ? 1 : 0) - (k.up ? 1 : 0)}; },
  sniff() {
    if (!day.sniffs || this.done) return;
    day.sniffs--;
    this.trail = path(town, {tx: Math.floor(this.van.x), ty: Math.floor(this.van.y)}, this.dest.road);
    this.trailT = 7; this.sniffT = 1.6;
    sfx.sniff(); setTimeout(() => sfx.bark(), 450);
    this.sniffBtn.textContent = `🐾 Baxter, sniff it out! (${day.sniffs})`;
    if (!day.sniffs) this.sniffBtn.disabled = true;
  },
  update(dt) {
    if (this.done) return;
    this.elapsed += dt; this.trailT -= dt; this.sniffT -= dt;
    driveStep(town, this.van, this.input(), dt, {easy: settings.easyDrive, speed: this.speed});
    engineHum(true, this.van.moving ? 1 : 0);
    if (reached(this.van, this.dest.road)) {
      this.done = true; engineOff(); sfx.honk(); setTimeout(() => sfx.bark(), 300);
      const tip = L.tipFor(this.elapsed, this.limit, day.event);
      setTimeout(() => go(Doorstep, {...this.job, tip, seconds: this.elapsed}), 700);
    }
  },
  camera() {
    const z = Math.max(W / (7.2 * TS), H / (11 * TS));
    const vw = W / z, vh = H / z, mw = town.w * TS, mh = town.h * TS;
    let cx = this.van.x * TS - vw / 2, cy = this.van.y * TS - vh / 2;
    cx = Math.max(0, Math.min(mw - vw, cx)); cy = Math.max(0, Math.min(mh - vh, cy));
    return {z, cx, cy, vw, vh};
  },
  draw() {
    const cam = this.camera();
    ctx.fillStyle = D.C.grass; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.scale(cam.z, cam.z); ctx.translate(-cam.cx, -cam.cy);
    ctx.drawImage(townCanvas(), 0, 0);
    // the house to deliver to
    const hx = (this.dest.house.tx + 0.5) * TS, hy = (this.dest.house.ty + 0.5) * TS;
    ctx.beginPath(); ctx.arc(hx, hy, TS * (0.62 + Math.sin(now * 5) * 0.06), 0, Math.PI * 2); ctx.lineWidth = 6; ctx.strokeStyle = '#ffd23d'; ctx.stroke();
    const bob = Math.abs(Math.sin(now * 4)) * TS * 0.2;
    ctx.beginPath(); ctx.moveTo(hx, hy - TS * 0.2); ctx.lineTo(hx, hy - TS * 0.7 - bob); ctx.lineWidth = 2; ctx.strokeStyle = D.C.ink; ctx.stroke();
    D.cupcake(ctx, {cake: 'vanilla', frosting: 'pink', toppings: ['heart']}, hx, hy - TS * 0.62 - bob, TS * 0.7, now);
    if (this.trailT > 0 && this.trail) {
      ctx.globalAlpha = Math.min(1, this.trailT);
      this.trail.forEach((p, i) => { if (i % 1 === 0 && i > 0) D.text(ctx, '🐾', (p.tx + 0.5) * TS, (p.ty + 0.5) * TS, TS * 0.32); });
      ctx.globalAlpha = 1;
    }
    D.vanTop(ctx, this.van.x * TS, this.van.y * TS, this.van.angle, TS, save.paint, {t: now, moving: this.van.moving});
    ctx.restore();
    // arrow at the screen edge pointing at the house when it is out of view
    const sx = (hx - cam.cx) * cam.z, sy = (hy - cam.cy) * cam.z;
    if ((settings.easyDrive || this.elapsed > 10) && (sx < 0 || sy < 70 || sx > W || sy > H - 20)) {
      const ang = Math.atan2(sy - H / 2, sx - W / 2), ex = Math.max(28, Math.min(W - 28, sx)), ey = Math.max(110, Math.min(H - 170, sy));
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -13); ctx.lineTo(-4, 0); ctx.lineTo(-10, 13); ctx.closePath(); ctx.fillStyle = '#ffd23d'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = D.C.ink; ctx.stroke();
      ctx.restore();
    }
    this.drawClock();
    this.drawCab();
  },
  drawClock() {
    const r = 26, x = W - r - 12, y = 98, frac = Math.max(0, 1 - this.elapsed / this.limit);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = D.C.ink; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r - 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); ctx.closePath();
    ctx.fillStyle = frac > 0.5 ? '#9fe3c0' : frac > 0 ? '#ffd23d' : '#ddd'; ctx.fill();
    const tip = L.tipFor(this.elapsed, this.limit, day.event);
    D.text(ctx, `$${tip}`, x, y + r + 12, 15, {weight: 700, stroke: '#fff', sw: 4});
    D.text(ctx, 'tip', x, y + 1, 13, {weight: 700});
  },
  drawCab() {
    // the window into the van: Arianna driving, Baxter riding with the wind in his ears
    const w = Math.min(W * 0.42, 170), hh = w * 0.72, x = 10, y = H - hh - 16;
    ctx.save(); D.rr(ctx, x, y, w, hh, 18); ctx.clip();
    const g = ctx.createLinearGradient(0, y, 0, y + hh); g.addColorStop(0, '#9fd8ff'); g.addColorStop(1, '#e6f6ff'); ctx.fillStyle = g; ctx.fillRect(x, y, w, hh);
    const scroll = (this.van.distance * 40) % w;
    ctx.fillStyle = '#bfe6a2'; for (let i = -1; i < 4; i++) { ctx.beginPath(); ctx.arc(x + i * w * 0.5 - scroll * 0.5 + w * 0.25, y + hh * 0.95, w * 0.3, Math.PI, 0); ctx.fill(); }
    if (this.van.moving) { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { const ly = y + hh * (0.2 + i * 0.15), lx = x + w - ((now * 300 + i * 60) % w); ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 22, ly); ctx.stroke(); } }
    ctx.fillStyle = '#f7d9c4'; ctx.fillRect(x, y + hh * 0.78, w, hh * 0.22);
    arianna('drive', x + w * 0.3, y + hh * 1.02, hh * 0.98, {face: 'right'});
    // the A6 picture has its own steering wheel and seat
    if (!image('a6-drive')) { ctx.beginPath(); ctx.arc(x + w * 0.46, y + hh * 0.72, hh * 0.2, -Math.PI * 0.9, Math.PI * 0.1); ctx.lineWidth = 5; ctx.strokeStyle = '#5b3a29'; ctx.stroke(); }
    if (this.sniffT > 0) baxter('sniff', x + w * 0.78, y + hh * 0.98, hh * 0.5, {face: 'right'});
    else baxter('ride', x + w * 0.79, y + hh * 1.02, hh * (image('b4-ride') ? 0.66 : 0.78), {face: 'right'});
    ctx.restore();
    ctx.lineWidth = 4; ctx.strokeStyle = D.C.ink; D.rr(ctx, x, y, w, hh, 18); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + w * 0.56, y); ctx.lineTo(x + w * 0.56, y + hh); ctx.stroke();
  },
};

// ---------- at the door ----------
const Doorstep = {
  enter(job) {
    hud(true);
    this.job = job; this.t = 0; this.paid = false; this.handed = false;
    this.variant = (job.address.mode === 'line' ? job.address.n : job.address.x * 7 + job.address.y) % 6;
    mount();
  },
  update(dt) {
    this.t += dt;
    if (this.t > 1.3 && !this.handed) { this.handed = true; speak(S.hereYouGo); }
    if (this.t > 2.3 && !this.paid) {
      this.paid = true;
      const tip = this.job.tip;
      day.tips += tip; save.cash += tip; cashChanged();
      const g = {x: W * 0.62, y: H * 0.45};
      coinsTo(g.x, g.y, tip * 2); confettiBurst(g.x, g.y, 24); sfx.yes();
      const msg = S.tip(tip);
      mount(h('div', {class: 'bubble', style: `top:${H * 0.12}px`}, h('div', {class: 'who'}, L.CUSTOMERS[this.job.w.type].name), h('div', {class: 'say'}, h('div', null, msg), speakerButton(() => msg, this.job.w.type))),
        h('div', {class: 'findhelp'}, btn('Back to the shop →', () => go(Street, true), 'pink big wide')));
      speak(msg, {customer: this.job.w.type});
    }
  },
  draw() {
    const s = D.doorstep(ctx, W, H, {t: now, variant: this.variant});
    const ch = s.painted ? s.doorH * 0.95 : Math.min(H * 0.24, W * 0.5);
    drawCustomer(ctx, this.job.w.type, s.door.x, s.gy + 4, ch, {t: now, face: this.paid ? 'happy' : 'wow'});
    feeling(this, this.paid ? 'heart' : 'sparkles', s.door.x + ch * 0.22, s.gy - ch * (ART_SCALE[this.job.w.type] || 1) * 0.95, ch * 0.26);
    const k = Math.min(1, this.t / 1.3);
    // on a painted house she walks up the lawn from the sidewalk; on the drawn one, along the ground
    const [x0, y0] = s.painted ? s.start : [W * 0.04, s.gy + 6], [x1, y1] = s.painted ? s.path : [s.door.x - W * 0.26, s.gy + 6];
    const ax = x0 + (x1 - x0) * k, ay = y0 + (y1 - y0) * k;
    const ah = s.painted ? s.doorH * 1.25 : Math.min(H * 0.3, W * 0.62);
    if (k < 1) { arianna('walk', ax, ay, ah, {face: 'right'}); boxInHands(ax + ah * 0.12, ay - ah * 0.42, ah * 0.2); }
    else arianna('box', ax, ay, ah, {face: 'right'});
    if (k >= 1 && !image('a3-box')) boxInHands(ax, ay - ah * 0.36, ah * 0.22);
    baxter(this.paid ? 'excited' : 'walk', ax - ah * 0.28, ay + 2, ah * 0.36, {face: 'right'});
  },
};

// ---------- end of the day ----------
const Results = {
  enter() {
    hud(true);
    const leftovers = day.shelf.reduce((a, b) => a + b, 0);
    const sold = save.menu.map((d, i) => d && {name: d.name, count: day.sold[i] || 0, design: d}).filter(Boolean);
    const {entry, unlocked} = L.endDay(save, {sales: day.sales, tips: day.tips, spent: day.spent, sold: sold.map(s => ({name: s.name, count: s.count})), leftovers, goal: day.goal, soldCount: day.soldCount, cheap: Object.keys(day.cheap).filter(i => day.cheap[i] >= 2).map(i => save.menu[i]?.name)});
    persist();
    this.entry = entry;
    const bars = h('canvas'), line = h('canvas');
    const notes = [];
    if (entry.goalMet) notes.push(`⭐ You beat today’s goal of ${entry.goal}!`); else notes.push(`Goal was ${entry.goal}. So close! Try again tomorrow.`);
    if (leftovers) notes.push(`${leftovers} leftover cupcake${leftovers > 1 ? 's' : ''} went to the neighbors.`);
    for (const [i, n] of Object.entries(day.cheap)) if (n >= 2) notes.push(`💡 ${n} customers would have happily paid more for ${save.menu[i].name}.`);
    for (const [i, n] of Object.entries(day.pricey)) notes.push(`💡 ${n} customer${n > 1 ? 's' : ''} thought ${save.menu[i].name} cost too much.`);
    const mb = L.moneyBar(save);
    const card = h('div', {class: 'card results'},
      h('h2', null, `Day ${entry.day} done!`),
      h('div', {class: 'big3'}, h('div', null, h('small', null, 'Earned'), h('b', null, `$${entry.earned}`)), h('div', null, h('small', null, 'Spent'), h('b', null, `$${entry.spent}`)),
        h('div', {class: 'profit ' + (entry.profit >= 0 ? 'gain' : 'loss')}, h('small', null, 'Profit'), h('b', null, `${entry.profit < 0 ? '−' : ''}$${Math.abs(entry.profit)}`))),
      h('div', {class: 'muted center', style: 'margin-top:4px'}, `Cupcakes $${entry.sales} + tips $${entry.tips}`),
      h('h3', null, 'Cupcakes sold'), bars,
      save.history.length >= 3 ? [h('h3', null, 'Profit each day'), line] : null,
      ...notes.map(n => h('div', {class: 'note'}, n)),
      h('h3', null, mb.next ? 'Next surprise ingredient' : 'Every ingredient unlocked!'),
      h('div', {class: 'bar'}, h('i', {style: `width:${Math.round(mb.frac * 100)}%`}), h('span', null, mb.next ? `$${save.earnedTotal} of $${mb.to} · ❓` : '🎉')),
      h('div', {class: 'actions'}, btn('Upgrades', () => go(Upgrades), 'mint'), btn('Next day →', () => this.next(), 'pink')),
    );
    mount(h('div', {class: 'back', style: 'background:transparent;align-items:start;padding-top:calc(env(safe-area-inset-top,0px) + 56px)'}, card));
    requestAnimationFrame(() => { drawBars(bars, sold); if (save.history.length >= 3) drawLine(line, save.history); });
    speak([S.dayDone(entry.day), entry.profit > 200 ? S.bigProfit : entry.profit > 0 ? S.profit(entry.profit) : S.noProfit, entry.goalMet ? S.goalMet : null]);
    if (entry.goalMet) confettiBurst(W / 2, H * 0.3, 50);
    if (unlocked.length) setTimeout(() => showUnlock(unlocked), 900);
  },
  next() { go(this.entry.day === L.SEASON_DAYS ? SeasonEnd : DayStart); },
  draw() {
    const f = D.cozy(ctx, W, H, {t: now});
    // asleep on the rug
    baxter('sleep', f ? f.sx(0.5) : W * 0.5, f ? f.sy(0.85) : H * 0.87, H * 0.13);
    if (!image('b5-sleep')) for (let i = 0; i < 3; i++) { const k = (now * 0.5 + i / 3) % 1; D.text(ctx, 'z', W * 0.58 + k * 30, H * 0.76 - k * 50, 14 + i * 4, {weight: 700, color: `rgba(91,58,41,${1 - k})`}); }
  },
};
function showUnlock(ids) {
  sfx.unlock();
  const id = ids[0], ing = L.INGREDIENTS[id];
  const close = modal(h('div', {class: 'unlock'}, h('h2', null, 'New ingredient!'), h('img', {src: D.ingredientIcon(id, ing.kind, 160), alt: ''}), h('p', null, h('b', null, ing.name), h('br'), 'Find it at the market and in the cupcake designer.')),
    h('div', {class: 'actions'}, btn('Yay!', () => { close(); if (ids.length > 1) showUnlock(ids.slice(1)); }, 'pink')));
  speak(S.newIngredient(id));
  confettiBurst(W / 2, H * 0.35, 40);
}
function canvasSize(c) {
  const r = c.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [g, r.width, r.height];
}
function drawBars(c, sold) {
  const [g, w, hh] = canvasSize(c);
  const max = Math.max(4, ...sold.map(s => s.count)), bw = Math.min(70, (w - 40) / sold.length - 16);
  g.strokeStyle = 'rgba(91,58,41,.15)'; g.lineWidth = 1;
  for (let v = 0; v <= max; v += Math.max(1, Math.ceil(max / 4))) { const y = hh - 28 - (hh - 50) * v / max; g.beginPath(); g.moveTo(26, y); g.lineTo(w - 8, y); g.stroke(); D.text(g, String(v), 14, y, 12); }
  sold.forEach((s, i) => {
    const x = 34 + i * (w - 42) / sold.length + ((w - 42) / sold.length - bw) / 2, bh = (hh - 50) * s.count / max;
    D.rr(g, x, hh - 28 - bh, bw, Math.max(bh, 2), 6); g.fillStyle = ['#f27aa9', '#9fe3c0', '#ffd23d', '#8ccaf5'][i % 4]; g.fill(); g.lineWidth = 2; g.strokeStyle = D.C.ink; g.stroke();
    D.text(g, String(s.count), x + bw / 2, hh - 36 - bh, 15, {weight: 700});
    D.cupcake(g, s.design, x + bw / 2, hh - 2, 24);
  });
}
function drawLine(c, history) {
  const [g, w, hh] = canvasSize(c);
  const pts = history.slice(-12), vals = pts.map(p => p.profit), lo = Math.min(0, ...vals), hi = Math.max(10, ...vals);
  const X = i => 30 + i * (w - 46) / Math.max(1, pts.length - 1), Y = v => hh - 26 - (hh - 44) * (v - lo) / (hi - lo);
  g.strokeStyle = 'rgba(91,58,41,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(26, Y(0)); g.lineTo(w - 8, Y(0)); g.stroke();
  D.text(g, `$${hi}`, 16, Y(hi), 11); D.text(g, '$0', 14, Y(0), 11);
  g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(X(i), Y(p.profit)) : g.moveTo(X(i), Y(p.profit)))); g.lineWidth = 4; g.strokeStyle = '#f27aa9'; g.lineJoin = 'round'; g.stroke();
  pts.forEach((p, i) => { g.beginPath(); g.arc(X(i), Y(p.profit), 5, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = D.C.ink; g.stroke(); D.text(g, String(p.day), X(i), hh - 10, 11); });
}

// ---------- upgrades ----------
const Upgrades = {
  enter() { hud(true); this.panel = h('div', {class: 'panel', style: 'max-height:80%'}); mount(this.panel); this.render(); coach('upgrades'); },
  render() {
    const list = h('div', {class: 'list scroll'});
    for (const [key, u] of Object.entries(L.UPGRADES)) {
      const cost = L.upgradeCost(save, key), lvl = save.upg[key];
      list.append(h('div', {class: 'up'},
        h('div', null, h('div', {class: 'name'}, u.name), h('div', {class: 'muted'}, u.what), h('div', {class: 'lv'}, ...u.levels.map((_, i) => h('i', {class: i <= lvl ? 'on' : ''})))),
        cost == null ? h('b', null, 'Max!') : btn(`$${cost}`, () => this.buy(() => L.buyUpgrade(save, key), u.name), save.cash >= cost ? 'pink small' : 'ghost small')));
    }
    list.append(h('div', {class: 'section'}, 'Shop decorations'));
    list.append(h('div', {class: 'swatches'}, ...Object.entries(L.DECOR).map(([id, d]) => h('button', {class: 'swatch' + (save.deco.includes(id) ? ' on' : ''), onclick: () => { if (!save.deco.includes(id)) this.buy(() => L.buyDecor(save, id), d.name); }},
      h('i', {style: `background:${{balloons: '#ff7a8a', flowers: '#ffd23d', bunting: '#9fe3c0', lights: '#cdb8f2'}[id]}`}), d.name, h('br'), save.deco.includes(id) ? '✓' : `$${d.cost}`))));
    list.append(h('div', {class: 'section'}, 'Van paint'));
    list.append(h('div', {class: 'swatches'}, ...Object.entries(L.PAINTS).map(([id, p]) => h('button', {class: 'swatch' + (save.paint === id ? ' on' : ''), onclick: () => this.buy(() => L.choosePaint(save, id), p.name)},
      h('i', {style: `background:linear-gradient(${p.body} 60%, ${p.stripe} 60%)`}), p.name, h('br'), save.paints.includes(id) ? (save.paint === id ? '✓' : 'Use') : `$${p.cost}`))));
    this.panel.replaceChildren(h('div', {class: 'row-end'}, h('h2', null, 'Upgrades'), h('div', {style: 'flex:1'}), h('div', {class: 'muted'}, `${save.stars} ⭐`)), list,
      h('div', {class: 'row-end'}, h('div', {style: 'flex:1'}), btn(Results.entry?.day === L.SEASON_DAYS ? 'Finish the season →' : 'Next day →', () => { persist(); Results.next(); }, 'pink big')));
  },
  buy(fn, name) {
    const res = fn();
    if (res === 'broke') { sfx.gentle(); toast(S.keepSaving); speak(S.keepSaving); return; }
    if (res === 'ok') { sfx.unlock(); cashChanged(); confettiBurst(W / 2, H * 0.25, 24); speak(S.bought(name)); persist(); }
    this.render();
  },
  draw() {
    D.street(ctx, W, H, {t: now, save, groundY: H * 0.4, shopName: SHOP_NAME});
    D.vanSide(ctx, W * 0.5, H * 0.5, Math.min(W * 0.5, H * 0.25), save.paint, {t: now, name: SHOP_NAME});
  },
};

const SeasonEnd = {
  enter() {
    hud(true);
    const profit = L.seasonProfit(save), trophy = L.trophyFor(profit);
    const best = save.history.reduce((a, b) => (b.profit > a.profit ? b : a), save.history[0]);
    const totals = {};
    for (const hd of save.history) for (const s of hd.sold) totals[s.name] = (totals[s.name] || 0) + s.count;
    const fav = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
    const art = {gold: 'u3-trophy-gold', silver: 'u4-trophy-silver', bronze: 'u5-trophy-bronze', ribbon: 'u6-ribbon'}[trophy];
    const prize = image(art) ? h('img', {class: 'prize', src: `${BASE}art/${art}.webp`, alt: ''}) : `${{gold: '🏆', silver: '🥈', bronze: '🥉', ribbon: '🎀'}[trophy]} `;
    mount(h('div', {class: 'back'}, h('div', {class: 'card center'},
      h('h2', null, 'Season complete!'), h('div', {style: 'font-size:30px;font-weight:700;margin:8px 0'}, prize, h('div', null, S.trophy[trophy])),
      h('p', null, `Season profit: $${profit}`), h('p', null, `Best day: day ${best.day} ($${best.profit})`), fav ? h('p', null, `Best seller: ${fav[0]} (${fav[1]} sold)`) : null,
      h('p', null, `Stickers collected: ${Object.keys(save.stickers).length} of ${Object.keys(L.CUSTOMERS).length}`),
      h('div', {class: 'actions'}, btn('Keep baking (free play)', () => go(DayStart), 'pink')))));
    confettiBurst(W / 2, H * 0.3, 80); sfx.unlock();
    speak([S.seasonDone, S.trophy[trophy], S.amazingSeason]);
  },
  draw() { D.cozy(ctx, W, H, {t: now}); arianna('cheer', W * 0.3, H * 0.95, H * 0.3); baxter('excited', W * 0.75, H * 0.95, H * 0.14); },
};

// ---------- menus ----------
function openSettings() {
  const row = (key, name, desc) => {
    const sw = h('button', {class: 'switch' + (settings[key] ? ' on' : ''), 'aria-label': name, onclick: () => { settings[key] = !settings[key]; sw.classList.toggle('on', settings[key]); applySettings(); sfx.tap(); }});
    return h('div', {class: 'toggle'}, h('div', null, name, h('small', null, desc)), sw);
  };
  const close = modal(h('h2', null, 'Settings'),
    row('voice', 'Read aloud', 'Customers and tips are spoken out loud'),
    row('sound', 'Sounds', 'Coins, barks and beeps'),
    row('music', 'Music', 'Gentle music in the background'),
    row('easyDrive', 'Easy driving', 'The van follows the road and turns at corners'),
    row('bigKid', 'Big Kid mode', 'Harder word problems and deals, the grid sooner'),
    h('div', {class: 'actions'}, btn('Done', () => close(), 'pink')));
}
function openStickers() {
  const grid = h('div', {class: 'stickers'});
  const have = save?.stickers || {};
  for (const [type, c] of Object.entries(L.CUSTOMERS)) {
    const cnv = portrait(type, 'stand', 150);
    grid.append(h('div', {class: 'sticker' + (have[type] ? '' : ' locked')}, cnv, have[type] ? c.name : '???'));
  }
  const close = modal(h('h2', null, 'Sticker book'), h('p', {class: 'center muted'}, `Serve a customer to get their sticker. ${Object.keys(have).length} of ${Object.keys(L.CUSTOMERS).length}`), grid, h('div', {class: 'actions'}, btn('Close', () => close(), 'pink')));
}
function openMenu() {
  const close = modal(h('h2', null, 'Paused'),
    h('div', {class: 'list'}, btn('Keep playing', () => close(), 'pink'), btn('Settings', () => { close(); openSettings(); }, 'ghost'), btn('Sticker book', () => { close(); openStickers(); }, 'ghost'),
      btn('Home screen', () => { close(); save = L.migrate(readJSON(L.SAVE_KEY)) || save; go(Title); }, 'ghost')),
    h('p', {class: 'center muted'}, 'Going home starts today over from the morning.'));
}

// ---------- main loop ----------
function resize() {
  const r = app.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  W = r.width; H = r.height;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', resize);
cv.addEventListener('pointerdown', e => {
  const r = cv.getBoundingClientRect();
  unlock();
  scene?.tap?.(e.clientX - r.left, e.clientY - r.top);
  scene?.press?.();
});
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) cv.addEventListener(ev, () => scene?.release?.());
addEventListener('keydown', e => { if (e.key === ' ' && !e.repeat) scene?.press?.(); });
addEventListener('keyup', e => { if (e.key === ' ') scene?.release?.(); });
let last = performance.now(), paused = false;
document.addEventListener('visibilitychange', () => { paused = document.hidden; if (paused) { hush(); engineOff(); } pauseMusic(paused); last = performance.now(); });
function frame(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000);
  last = ts;
  if (!paused) {
    now += dt;
    if (!document.querySelector('.back:not(#ui .back), .designer')) scene?.update?.(dt);
    updateParts(dt);
    ctx.clearRect(0, 0, W, H);
    scene?.draw?.();
    if (fadeFrom) {
      const k = (now - fadeFrom.t) / 0.3;
      if (k >= 1) fadeFrom = null;
      else { ctx.globalAlpha = 1 - k; ctx.drawImage(fadeFrom.c, 0, 0, W, H); ctx.globalAlpha = 1; }
    }
    D.confetti(ctx, parts);
  }
  requestAnimationFrame(frame);
}

// Which music plays where: the first track in each list that has been made (Suno codes M1-M9).
const SCENE_MUSIC = new Map([
  [Title, () => ['m1-title']],
  [DayStart, () => ['m3-market']], [Market, () => ['m3-market']],
  [Kitchen, () => ['m4-kitchen']], [Bake, () => ['m4-kitchen']],
  [Street, () => [day?.event === 'birthday' && 'm8-birthday', day?.event === 'rain' && 'm9-rain', 'm2-shop'].filter(Boolean)],
  [Find, () => ['m5-drive', 'm2-shop']], [Drive, () => ['m5-drive', 'm2-shop']], [Doorstep, () => ['m5-drive', 'm2-shop']],
  [Results, () => ['m6-evening', 'm2-shop']], [Upgrades, () => ['m6-evening', 'm2-shop']],
  [SeasonEnd, () => ['m7-season-end', 'm1-title']],
]);

// For automated checks: read-only peek at the game.
const SCENES = {Title, DayStart, Market, Kitchen, Bake, Street, Find, Drive, Doorstep, Results, Upgrades, SeasonEnd};
window.__cupcake = {get save() { return save; }, get day() { return day; }, scenes: SCENES, town, get scene() { return Object.keys(SCENES).find(k => SCENES[k] === scene); }};

resize();
const loadbar = document.getElementById('loadbar');
await Promise.all([loadArt(BASE, k => { if (loadbar) loadbar.style.width = `${Math.round(k * 100)}%`; }), loadVoice(BASE), loadMusic(BASE), document.fonts?.ready]);
go(Title);
requestAnimationFrame(frame);
if ('serviceWorker' in navigator && location.hostname !== '127.0.0.1' && location.hostname !== 'localhost') navigator.serviceWorker.register(`${BASE}sw.js`, {scope: BASE}).catch(() => {});
