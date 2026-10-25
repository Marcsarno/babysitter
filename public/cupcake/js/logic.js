// Arianna's Cupcakes: the rules of the business, kept free of drawing so they can be tested.

export const SAVE_KEY = 'ariannaCupcakes.save.v1';
export const START_CASH = 50;
export const SEASON_DAYS = 40;

// cost: dollars per serving at Corner Market. value: what customers think it is worth.
export const INGREDIENTS = {
  vanilla:    {kind: 'cake', name: 'Vanilla cake', cost: 1, value: 2, unlock: 0},
  chocolate:  {kind: 'cake', name: 'Chocolate cake', cost: 1, value: 2, unlock: 0},
  strawberry: {kind: 'cake', name: 'Strawberry cake', cost: 1, value: 2, unlock: 1},
  lemon:      {kind: 'cake', name: 'Lemon cake', cost: 1, value: 2.5, unlock: 4},
  redvelvet:  {kind: 'cake', name: 'Red velvet cake', cost: 2, value: 3.5, unlock: 7},
  white:      {kind: 'frosting', name: 'Vanilla frosting', cost: 1, value: 2, unlock: 0},
  pink:       {kind: 'frosting', name: 'Strawberry frosting', cost: 1, value: 2, unlock: 0},
  choc:       {kind: 'frosting', name: 'Chocolate frosting', cost: 1, value: 2, unlock: 2},
  mint:       {kind: 'frosting', name: 'Mint frosting', cost: 1, value: 2.5, unlock: 5},
  blue:       {kind: 'frosting', name: 'Blueberry frosting', cost: 1, value: 2.5, unlock: 8},
  lavender:   {kind: 'frosting', name: 'Lavender frosting', cost: 1, value: 2.5, unlock: 10},
  sprinkles:  {kind: 'topping', name: 'Sprinkles', cost: 1, value: 1.5, unlock: 0},
  cherry:     {kind: 'topping', name: 'Cherry', cost: 1, value: 1.5, unlock: 0},
  gummy:      {kind: 'topping', name: 'Gummy bear', cost: 1, value: 2, unlock: 3},
  chips:      {kind: 'topping', name: 'Chocolate chips', cost: 1, value: 1.5, unlock: 6},
  heart:      {kind: 'topping', name: 'Candy heart', cost: 1, value: 2, unlock: 9},
  star:       {kind: 'topping', name: 'Gold star', cost: 2, value: 3, unlock: 11},
  bone:       {kind: 'topping', name: 'Doggy cookie', cost: 1, value: 2, unlock: 12},
};
export const KINDS = ['cake', 'frosting', 'topping'];

// Lifetime earnings that fill the money bar; each one unlocks the ingredient with that unlock number.
export const UNLOCK_AT = [40, 100, 170, 250, 340, 450, 580, 730, 900, 1100, 1330, 1600];

export const CUSTOMERS = {
  grandma: {name: 'Grandma Rose', kind: 'person', likes: ['vanilla', 'white', 'cherry']},
  builder: {name: 'Builder Bo', kind: 'person', likes: ['chocolate', 'choc', 'chips']},
  boy:     {name: 'Little Leo', kind: 'person', likes: ['strawberry', 'sprinkles', 'gummy']},
  mail:    {name: 'Mia the Mail Carrier', kind: 'person', likes: ['lemon', 'white', 'star']},
  girl:    {name: 'Sophie', kind: 'person', likes: ['pink', 'sprinkles', 'heart']},
  dad:     {name: 'Mr. Patel', kind: 'person', likes: ['chocolate', 'mint', 'chips']},
  bunny:   {name: 'Bunny Belle', kind: 'animal', likes: ['strawberry', 'pink', 'heart']},
  cat:     {name: 'Ginger Cat', kind: 'animal', likes: ['vanilla', 'blue', 'sprinkles']},
  bear:    {name: 'Big Bear', kind: 'animal', likes: ['chocolate', 'choc', 'gummy']},
  duck:    {name: 'Dot the Duck', kind: 'animal', likes: ['lemon', 'mint', 'cherry']},
  pug:     {name: 'Peanut the Pug', kind: 'dog', likes: ['vanilla', 'bone', 'pink']},
  poodle:  {name: 'Princess Poodle', kind: 'dog', likes: ['strawberry', 'bone', 'lavender']},
  spot:    {name: 'Domino', kind: 'dog', likes: ['vanilla', 'bone', 'white']},
};

export const UPGRADES = {
  oven:   {name: 'Bigger oven', what: 'Bake more cupcakes each day', levels: [10, 16, 24, 32], costs: [60, 130, 240]},
  pantry: {name: 'Bigger fridge', what: 'Store more of each ingredient', levels: [20, 35, 60], costs: [40, 100]},
  sign:   {name: 'Shop sign', what: 'More people stop by', levels: [0, 2, 4, 6], costs: [50, 110, 200]},
  menu:   {name: 'Menu board', what: 'Sell more kinds of cupcakes', levels: [2, 3, 4], costs: [70, 160]},
  van:    {name: 'Zoomier van', what: 'Drive faster for bigger tips', levels: [1, 1.25, 1.5], costs: [80, 170]},
};
export const DECOR = {
  balloons: {name: 'Balloons', cost: 15},
  flowers:  {name: 'Flower boxes', cost: 20},
  bunting:  {name: 'Party flags', cost: 25},
  lights:   {name: 'Twinkle lights', cost: 35},
};
export const PAINTS = {
  pink:     {name: 'Bubblegum', cost: 0, body: '#f48fb5', stripe: '#9fe3c0'},
  mint:     {name: 'Minty', cost: 15, body: '#8fdcb8', stripe: '#f7a8c8'},
  lavender: {name: 'Lavender', cost: 15, body: '#c3a6ec', stripe: '#fff1a8'},
  sunshine: {name: 'Sunshine', cost: 15, body: '#ffd66b', stripe: '#f48fb5'},
  sky:      {name: 'Sky blue', cost: 15, body: '#86c3f2', stripe: '#ffffff'},
};

export const NAME_WORDS = [
  ['Sparkly', 'Happy', 'Fluffy', 'Super', 'Silly', 'Sweet', 'Dreamy', 'Yummy', 'Twinkle', 'Giggly'],
  ['Baxter', 'Rainbow', 'Unicorn', 'Puppy', 'Sunshine', 'Cloud', 'Party', 'Princess', 'Galaxy', 'Bunny'],
  ['Bites', 'Swirl', 'Delight', 'Treat', 'Surprise', 'Cake', 'Pop', 'Dream', 'Crunch', 'Wonder'],
];

// ---------- random numbers ----------
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const randInt = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
export const pick = (r, list) => list[Math.floor(r() * list.length)];

// ---------- a new season ----------
export function newGame(seed = Date.now() & 0xffffff) {
  const stock = {};
  for (const id in INGREDIENTS) stock[id] = 0;
  return {
    v: 1, seed, day: 1, cash: START_CASH, earnedTotal: 0, unlockLevel: 0, stock,
    menu: [
      {cake: 'vanilla', frosting: 'pink', toppings: ['sprinkles'], name: 'Pink Sprinkle Swirl', price: 5},
      {cake: 'chocolate', frosting: 'white', toppings: ['cherry'], name: 'Cherry on Top', price: 5},
    ],
    upg: {oven: 0, pantry: 0, sign: 0, menu: 0, van: 0},
    deco: [], paints: ['pink'], paint: 'pink',
    history: [], stickers: {}, stars: 0, seen: {},
  };
}

export const unlockedIds = save => Object.keys(INGREDIENTS).filter(id => INGREDIENTS[id].unlock <= save.unlockLevel);
export const upgradeValue = (save, key) => UPGRADES[key].levels[save.upg[key]];
export const ovenCap = save => upgradeValue(save, 'oven');
export const pantryCap = save => upgradeValue(save, 'pantry');
export const menuSlots = save => upgradeValue(save, 'menu');
export const vanSpeed = save => upgradeValue(save, 'van');

export function upgradeCost(save, key) {
  const lvl = save.upg[key];
  return lvl < UPGRADES[key].costs.length ? UPGRADES[key].costs[lvl] : null;
}
export function buyUpgrade(save, key) {
  const cost = upgradeCost(save, key);
  if (cost == null) return 'max';
  if (save.cash < cost) return 'broke';
  save.cash -= cost;
  save.upg[key]++;
  if (key === 'menu') while (save.menu.length < menuSlots(save)) save.menu.push(null);
  return 'ok';
}
export function buyDecor(save, id) {
  if (save.deco.includes(id)) return 'owned';
  if (save.cash < DECOR[id].cost) return 'broke';
  save.cash -= DECOR[id].cost;
  save.deco.push(id);
  return 'ok';
}
export function choosePaint(save, id) {
  if (!save.paints.includes(id)) {
    if (save.cash < PAINTS[id].cost) return 'broke';
    save.cash -= PAINTS[id].cost;
    save.paints.push(id);
  }
  save.paint = id;
  return 'ok';
}

// ---------- the day's schedule and difficulty ----------
export function dayEvent(day) {
  if (day === 15 || day === 35) return 'birthday';   // Baxter's birthday: dog customers, double tips
  if (day % 7 === 0) return 'rain';
  if (day % 9 === 4) return 'party';
  return null;
}
export function orderTier(day, bigKid) {
  if (bigKid) return day <= 5 ? 3 : day <= 15 ? 4 : 5;
  return day <= 5 ? 1 : day <= 10 ? 2 : day <= 20 ? 3 : 4;
}
export const addressMode = (day, bigKid) => (day <= (bigKid ? 5 : 10) ? 'line' : 'grid');
export const gridSize = (day, bigKid) => (day <= (bigKid ? 12 : 20) ? 4 : 6);
export const dealLevel = (day, bigKid) => (day <= 3 ? 0 : bigKid ? 3 : day <= 10 ? 1 : day <= 20 ? 2 : 3);

// ---------- market ----------
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
export const lcm = (a, b) => (a / gcd(a, b)) * b;

export function dealsFor(r, day, bigKid, id) {
  const c = INGREDIENTS[id].cost, level = dealLevel(day, bigKid);
  const corner = {vendor: 'corner', qty: 5, price: 5 * c};
  if (level === 0) return [corner];
  let barn;
  if (level === 1) {
    barn = {vendor: 'barn', qty: 5, price: 5 * c + (r() < 0.7 ? -1 : 1)};
  } else if (level === 2) {
    barn = {vendor: 'barn', qty: 10, price: 10 * c + pick(r, [-2, -1, -1, 1])};
  } else {
    const [qa, qb] = pick(r, [[4, 6], [3, 9], [5, 8], [4, 10], [6, 9]]);
    const big = {qty: qb, price: qb * c + (r() < 0.7 ? -Math.max(1, Math.round(qb / 5)) : 1)};
    const small = {qty: qa, price: qa * c};
    if (r() < 0.5) { corner.qty = small.qty; corner.price = small.price; barn = {vendor: 'barn', ...big}; }
    else { corner.qty = big.qty; corner.price = big.price; barn = {vendor: 'barn', ...small}; }
  }
  return [corner, barn];
}

// Compare two deals on the same number of items (the smallest amount both sell).
export function compareDeals(a, b) {
  const qty = lcm(a.qty, b.qty);
  return {qty, packsA: qty / a.qty, costA: (qty / a.qty) * a.price, packsB: qty / b.qty, costB: (qty / b.qty) * b.price};
}
export function savingsMissed(chosen, other) {
  if (!other) return null;
  const c = compareDeals(chosen, other);
  return c.costB < c.costA ? {...c, saved: c.costA - c.costB} : null;
}

export function buy(save, id, deal) {
  if (save.cash < deal.price) return 'broke';
  if (save.stock[id] + deal.qty > pantryCap(save)) return 'full';
  save.cash -= deal.price;
  save.stock[id] += deal.qty;
  return 'ok';
}

// ---------- designs and baking ----------
export const parts = d => [d.cake, d.frosting, ...d.toppings];
export const designCost = d => parts(d).reduce((s, id) => s + INGREDIENTS[id].cost, 0);
export const designValue = d => parts(d).reduce((s, id) => s + INGREDIENTS[id].value, 0);

export function needs(designs, counts) {
  const need = {};
  designs.forEach((d, i) => {
    if (!d || !counts[i]) return;
    for (const id of parts(d)) need[id] = (need[id] || 0) + counts[i];
  });
  return need;
}
export function canBake(save, counts) {
  const total = counts.reduce((s, n) => s + (n || 0), 0);
  if (total > ovenCap(save)) return false;
  const need = needs(save.menu, counts);
  return Object.entries(need).every(([id, n]) => save.stock[id] >= n);
}
// The most of one design that still fits, given what the other slots already use.
export function maxMore(save, counts, slot) {
  const d = save.menu[slot];
  if (!d) return 0;
  const used = needs(save.menu, counts);
  const room = ovenCap(save) - counts.reduce((s, n) => s + (n || 0), 0);
  let most = room;
  for (const id of parts(d)) most = Math.min(most, save.stock[id] - (used[id] || 0));
  return Math.max(0, most);
}
export function bake(save, counts) {
  if (!canBake(save, counts)) return null;
  for (const [id, n] of Object.entries(needs(save.menu, counts))) save.stock[id] -= n;
  return save.menu.map((d, i) => (d ? counts[i] || 0 : 0));
}

// ---------- customers ----------
export const priceTolerance = day => (day <= 2 ? 1.5 : day <= 4 ? 1.25 : 1);

export function willingToPay(type, design, day, mood = 1) {
  const c = CUSTOMERS[type];
  const liked = parts(design).filter(id => c.likes.includes(id)).length;
  return designValue(design) * (1 + 0.25 * liked) * priceTolerance(day) * (c.kind === 'person' ? 1 : 1.3) * mood;
}

export function decide(type, menu, shelf, day, mood = 1) {
  let best = null;
  menu.forEach((d, i) => {
    if (!d || !(shelf[i] > 0)) return;
    const pay = willingToPay(type, d, day, mood);
    const score = pay - d.price;
    if (!best || score > best.score) best = {slot: i, score, pay};
  });
  if (!best) return {action: 'soldout'};
  return {action: best.score >= 0 ? 'buy' : 'pricey', slot: best.slot};
}

export function passersby(r, save, event) {
  const n = Math.min(12, 5 + Math.floor(save.day / 3)) + upgradeValue(save, 'sign') - (event === 'rain' ? 3 : 0);
  const pool = event === 'birthday' ? ['pug', 'poodle', 'spot'] :
    Object.keys(CUSTOMERS).filter(t => CUSTOMERS[t].kind !== 'dog' || save.day > 5);
  const out = [];
  for (let i = 0; i < n; i++) {
    let type = pick(r, pool);
    if (out.length && out[out.length - 1].type === type) type = pick(r, pool);
    out.push({type, mood: 0.85 + r() * 0.3, hungry: r() > 0.12});
  }
  return out;
}

// ---------- orders as word problems ----------
const FAMILY = ['sister', 'brother', 'mom', 'dad', 'grandpa', 'best friend', 'teacher', 'neighbor'];
const PETS = ['cats', 'goldfish', 'hamsters', 'bikes', 'kites'];

export function makeOrder(r, tier, maxQty, party = false) {
  const cap = Math.min(maxQty, [0, 4, 8, 12, 12, 15][tier]);
  if (party && cap >= 4) {
    for (let tries = 0; tries < 20; tries++) {
      const g = randInt(r, 2, 4), k = randInt(r, 2, 3);
      if (g * k <= cap) return {answer: g * k, hint: {kind: 'groups', g, k},
        text: `It's my birthday party! ${g} tables, and each table needs ${k}.`};
    }
  }
  const options = [];
  const one = n => options.push(() => ({answer: n, hint: {kind: 'count', n},
    text: pick(r, [`${n}, please!`, `I'd like ${n}.`, `Can I have ${n}, please?`])}));
  if (tier === 1 || cap < 2) { one(randInt(r, 1, Math.max(1, cap))); return options[0](); }
  if (tier >= 2) {
    const n = randInt(r, 2, Math.min(cap, tier === 2 ? 6 : 10)), a = randInt(r, 1, n - 1), b = n - a, who = pick(r, FAMILY);
    options.push(() => ({answer: n, hint: {kind: 'add', a, b},
      text: pick(r, [`${a} for me and ${b} for my ${who}.`, `I need ${a} for my friends and ${b} for me.`, `${a} for my soccer team and ${b} more for the coaches.`])}));
    if (tier === 2) options.push(options[0]);
  }
  if (tier >= 3) {
    const n = randInt(r, 1, Math.min(cap, 10)), b = randInt(r, 1, 5), a = n + b;
    options.push(() => ({answer: n, hint: {kind: 'sub', a, b},
      text: pick(r, [`I need ${a} for my class, but I already have ${b}.`, `There are ${a} kids at my sleepover. ${b} of them already ate one.`])}));
  }
  if (tier >= 4) {
    const groups = [];
    for (let g = 2; g <= 4; g++) for (let k = 2; k <= 4; k++) if (g * k <= cap) groups.push([g, k]);
    if (groups.length) {
      const [g, k] = pick(r, groups);
      options.push(() => ({answer: g * k, hint: {kind: 'groups', g, k},
        text: pick(r, [`${g} boxes with ${k} in each, please.`, `${g} friends are coming over, and each one wants ${k}.`])}));
    }
    const n = randInt(r, 2, Math.min(cap, 9)), a = randInt(r, 1, n - 1), b = n - a, d = randInt(r, 2, 9);
    options.push(() => ({answer: n, hint: {kind: 'add', a, b, extra: d},
      text: `I have ${d} ${pick(r, PETS)} at home! I'd like ${a} for me and ${b} for my ${pick(r, FAMILY)}.`}));
  }
  if (tier >= 5) {
    const groups = [];
    for (let g = 2; g <= 4; g++) for (let k = 2; k <= 5; k++) for (let b = 1; b < g * k && b <= 4; b++) if (g * k - b <= cap) groups.push([g, k, b]);
    if (groups.length) {
      const [g, k, b] = pick(r, groups);
      options.push(() => ({answer: g * k - b, hint: {kind: 'groupsMinus', g, k, b},
        text: `${g} boxes of ${k}, but my ${pick(r, FAMILY)} already bought ${b} of them.`}));
    }
  }
  return pick(r, options)();
}

// ---------- delivery addresses and tips ----------
export function makeAddress(r, day, bigKid) {
  if (addressMode(day, bigKid) === 'line') return {mode: 'line', n: randInt(r, 1, 10), labels: day <= 5 ? 'all' : 'fives'};
  const size = gridSize(day, bigKid);
  let x = 0, y = 0;
  while (x === 0 && y === 0) { x = randInt(r, 0, size); y = randInt(r, 0, size); }
  return {mode: 'grid', x, y, size, coach: day <= (bigKid ? 8 : 14)};
}
export function addressText(a) {
  if (a.mode === 'line') return `Please bring them to house ${a.n}!`;
  return `Please bring them to (${a.x}, ${a.y})!` + (a.coach ? ` That's over ${a.x}, up ${a.y}.` : '');
}
export function addressSpoken(a) {
  if (a.mode === 'line') return `Please bring them to house ${a.n}!`;
  return `Please bring them to ${a.x}, ${a.y}!` + (a.coach ? ` That's over ${a.x}, up ${a.y}.` : '');
}
export function tipFor(seconds, limit, event) {
  const t = seconds <= limit * 0.5 ? 3 : seconds <= limit ? 2 : 1;
  return event === 'birthday' ? t * 2 : t;
}

// ---------- end of day ----------
export const goalFor = baked => Math.max(2, Math.round(baked * 0.6));

export function endDay(save, log) {
  const earned = log.sales + log.tips;
  const entry = {day: save.day, earned, sales: log.sales, tips: log.tips, spent: log.spent, profit: earned - log.spent,
    sold: log.sold, leftovers: log.leftovers, goal: log.goal, goalMet: log.soldCount >= log.goal, cheap: log.cheap || []};
  save.history.push(entry);
  save.earnedTotal += earned;
  if (entry.goalMet) save.stars++;
  const unlocked = [];
  while (save.unlockLevel < UNLOCK_AT.length && save.earnedTotal >= UNLOCK_AT[save.unlockLevel]) {
    save.unlockLevel++;
    for (const id in INGREDIENTS) if (INGREDIENTS[id].unlock === save.unlockLevel) unlocked.push(id);
  }
  save.day++;
  return {entry, unlocked};
}
export function moneyBar(save) {
  const lvl = save.unlockLevel;
  if (lvl >= UNLOCK_AT.length) return {from: UNLOCK_AT.at(-1), to: UNLOCK_AT.at(-1), frac: 1, next: null};
  const from = lvl ? UNLOCK_AT[lvl - 1] : 0, to = UNLOCK_AT[lvl];
  const next = Object.keys(INGREDIENTS).find(id => INGREDIENTS[id].unlock === lvl + 1);
  return {from, to, frac: Math.min(1, (save.earnedTotal - from) / (to - from)), next};
}
export const seasonProfit = save => save.history.filter(h => h.day <= SEASON_DAYS).reduce((s, h) => s + h.profit, 0);
export function trophyFor(profit) {
  return profit >= 1200 ? 'gold' : profit >= 700 ? 'silver' : profit >= 300 ? 'bronze' : 'ribbon';
}

// Saves are plain JSON; fill in anything a newer version added.
export function migrate(data) {
  if (!data || data.v !== 1) return null;
  const fresh = newGame(data.seed);
  const save = {...fresh, ...data, upg: {...fresh.upg, ...data.upg}};
  for (const id in INGREDIENTS) if (!(id in save.stock)) save.stock[id] = 0;
  while (save.menu.length < menuSlots(save)) save.menu.push(null);
  return save;
}
