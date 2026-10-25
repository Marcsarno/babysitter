import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../public/cupcake/js/logic.js';
import {buildTown, destination, path, createVan, driveStep, reached, isRoad, gridToTile, timeLimit, T, at} from '../public/cupcake/js/town.js';

test('a new season starts with $50, an empty pantry, two menu slots and an oven for 10', () => {
  const s = L.newGame(1);
  assert.equal(s.cash, 50);
  assert.ok(Object.values(s.stock).every(n => n === 0));
  assert.equal(s.menu.length, L.menuSlots(s));
  assert.equal(L.ovenCap(s), 10);
  assert.deepEqual(L.unlockedIds(s).sort(), ['chocolate', 'cherry', 'pink', 'sprinkles', 'vanilla', 'white'].sort());
});

test('buying spends money, fills the pantry, and refuses when broke or full', () => {
  const s = L.newGame(1);
  assert.equal(L.buy(s, 'vanilla', {qty: 5, price: 5}), 'ok');
  assert.equal(s.cash, 45);
  assert.equal(s.stock.vanilla, 5);
  s.stock.vanilla = 18;
  assert.equal(L.buy(s, 'vanilla', {qty: 5, price: 5}), 'full');
  s.cash = 2;
  assert.equal(L.buy(s, 'white', {qty: 5, price: 5}), 'broke');
});

test('market deals are whole dollars, get harder over the season, and the explainer finds the savings', () => {
  for (let day = 1; day <= 40; day++) for (const id of Object.keys(L.INGREDIENTS)) {
    const deals = L.dealsFor(L.rng(day * 31 + id.length), day, false, id);
    assert.equal(deals.length, day <= 3 ? 1 : 2);
    for (const d of deals) assert.ok(Number.isInteger(d.price) && d.price >= 1 && Number.isInteger(d.qty), JSON.stringify(d));
    if (day >= 4 && day <= 10) assert.equal(deals[0].qty, deals[1].qty);
  }
  const miss = L.savingsMissed({qty: 5, price: 5}, {qty: 10, price: 8});
  assert.deepEqual([miss.qty, miss.costA, miss.costB, miss.saved], [10, 10, 8, 2]);
  assert.equal(L.savingsMissed({qty: 10, price: 8}, {qty: 5, price: 5}), null);
});

test('baking uses one cake, one frosting and each topping per cupcake, within the oven and pantry', () => {
  const s = L.newGame(1);
  Object.assign(s.stock, {vanilla: 6, pink: 6, sprinkles: 6, chocolate: 4, white: 4, cherry: 2});
  assert.equal(L.maxMore(s, [0, 0], 0), 6);
  assert.equal(L.maxMore(s, [6, 0], 1), 2);
  assert.equal(L.canBake(s, [6, 3]), false);
  const shelf = L.bake(s, [6, 2]);
  assert.deepEqual(shelf, [6, 2]);
  assert.equal(s.stock.vanilla, 0);
  assert.equal(s.stock.chocolate, 2);
  s.stock.vanilla = 50; s.stock.pink = 50; s.stock.sprinkles = 50;
  assert.equal(L.canBake(s, [11, 0]), false, 'oven holds 10');
});

test('customers pay more early in the season and animals pay more than people; too pricey means no sale', () => {
  const d = {cake: 'vanilla', frosting: 'white', toppings: ['sprinkles'], name: 'x', price: 5};
  assert.ok(L.willingToPay('girl', d, 1) > L.willingToPay('girl', d, 10));
  assert.ok(L.willingToPay('cat', d, 10) > L.willingToPay('builder', d, 10));
  assert.equal(L.decide('builder', [d], [3], 10).action, 'buy');
  assert.equal(L.decide('builder', [{...d, price: 12}], [3], 10).action, 'pricey');
  assert.equal(L.decide('builder', [d], [0], 10).action, 'soldout');
});

test('orders are word problems whose numbers add up to an answer the shelf can fill', () => {
  for (let tier = 1; tier <= 5; tier++) for (let seed = 0; seed < 300; seed++) {
    const r = L.rng(seed), max = 1 + (seed % 12);
    const o = L.makeOrder(r, tier, max, seed % 5 === 0);
    assert.ok(Number.isInteger(o.answer) && o.answer >= 1 && o.answer <= max, `tier ${tier} ${JSON.stringify(o)} max ${max}`);
    const h = o.hint;
    const expect = {count: () => h.n, add: () => h.a + h.b, sub: () => h.a - h.b, groups: () => h.g * h.k, groupsMinus: () => h.g * h.k - h.b}[h.kind]();
    assert.equal(expect, o.answer, o.text);
    assert.ok(/\d/.test(o.text));
    if (tier === 1) assert.equal(h.kind === 'count' || h.kind === 'groups', true);
  }
});

test('addresses use the number line first, then the grid, never the shop itself', () => {
  for (let seed = 0; seed < 200; seed++) {
    const a = L.makeAddress(L.rng(seed), 5, false);
    assert.equal(a.mode, 'line'); assert.ok(a.n >= 1 && a.n <= 10);
    const g = L.makeAddress(L.rng(seed), 25, false);
    assert.equal(g.mode, 'grid'); assert.ok(g.x <= 6 && g.y <= 6 && (g.x || g.y));
    const small = L.makeAddress(L.rng(seed), 12, false);
    assert.ok(small.x <= 4 && small.y <= 4);
  }
  assert.match(L.addressText({mode: 'grid', x: 3, y: 4, coach: true}), /\(3, 4\).*over 3, up 4/);
});

test('earnings fill the money bar and unlock new ingredients; the day advances', () => {
  const s = L.newGame(1);
  const {entry, unlocked} = L.endDay(s, {sales: 40, tips: 6, spent: 30, sold: [], leftovers: 0, goal: 4, soldCount: 5});
  assert.equal(entry.profit, 16);
  assert.deepEqual(unlocked, ['strawberry']);
  assert.equal(s.day, 2);
  assert.equal(s.stars, 1);
  assert.ok(L.moneyBar(s).frac > 0 && L.moneyBar(s).next === 'choc');
});

test('upgrades cost money, raise limits, and stop at the top level', () => {
  const s = L.newGame(1);
  s.cash = 1000;
  assert.equal(L.buyUpgrade(s, 'menu'), 'ok');
  assert.equal(s.menu.length, 3);
  for (let i = 0; i < 3; i++) L.buyUpgrade(s, 'oven');
  assert.equal(L.ovenCap(s), 32);
  assert.equal(L.buyUpgrade(s, 'oven'), 'max');
  assert.equal(L.choosePaint(s, 'mint'), 'ok');
  assert.equal(s.paint, 'mint');
});

const town = buildTown(7);

test('every address has a house and a road the van can reach from the shop', () => {
  const addresses = [];
  for (let n = 1; n <= 10; n++) addresses.push({mode: 'line', n});
  for (let x = 0; x <= 6; x++) for (let y = 0; y <= 6; y++) if (x || y) addresses.push({mode: 'grid', x, y});
  for (const a of addresses) {
    const d = destination(town, a);
    assert.ok(d.house && at(town, d.house.tx, d.house.ty) === T.HOUSE, JSON.stringify(a));
    assert.ok(isRoad(town, d.road.tx, d.road.ty));
    assert.ok(path(town, town.start, d.road).length > 0, JSON.stringify(a));
    assert.ok(timeLimit(town, town.start, d.road) > 7);
  }
  assert.deepEqual(gridToTile(0, 0), town.start);
  assert.ok(town.tiles.includes(T.LOT), 'empty lots are kept for future shops');
});

function autopilot(van, route) {
  const tx = Math.floor(van.x), ty = Math.floor(van.y);
  const i = route.findIndex(p => p.tx === tx && p.ty === ty);
  const next = route[Math.min(route.length - 1, i + 1)] || route.at(-1);
  const dx = next.tx + 0.5 - van.x, dy = next.ty + 0.5 - van.y;
  return Math.abs(dx) > Math.abs(dy) ? {x: Math.sign(dx), y: 0} : {x: 0, y: Math.sign(dy)};
}

for (const easy of [true, false]) {
  test(`${easy ? 'easy driving' : 'free steering'} reaches every grid address without leaving the road`, () => {
    for (let x = 0; x <= 6; x += 2) for (let y = 0; y <= 6; y += 3) {
      if (!x && !y) continue;
      const d = destination(town, {mode: 'grid', x, y}), route = path(town, town.start, d.road);
      const van = createVan(town, town.start);
      let t = 0;
      while (!reached(van, d.road) && t < 60) {
        driveStep(town, van, autopilot(van, route), 1 / 60, {easy});
        assert.ok(isRoad(town, Math.floor(van.x), Math.floor(van.y)), `off road at ${van.x},${van.y}`);
        t += 1 / 60;
      }
      assert.ok(reached(van, d.road), `${easy} did not reach (${x}, ${y}) in time; stuck at ${van.x.toFixed(2)},${van.y.toFixed(2)}`);
    }
  });
}

test('mashing random arrows never pushes the van off the road', () => {
  const r = L.rng(3);
  for (const easy of [true, false]) {
    const van = createVan(town, town.start);
    let input = {x: 1, y: 0};
    for (let i = 0; i < 6000; i++) {
      if (i % 20 === 0) input = L.pick(r, [{x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}, {x: 1, y: 1}, {x: 0, y: 0}]);
      driveStep(town, van, input, 1 / 60, {easy});
      assert.ok(isRoad(town, Math.floor(van.x), Math.floor(van.y)));
    }
    assert.ok(van.distance > 20, 'the van actually drives around');
  }
});

test('easy driving holds a turn until the next corner', () => {
  const van = createVan(town, town.start);
  for (let i = 0; i < 20; i++) driveStep(town, van, {x: 1, y: 0}, 1 / 60, {easy: true});
  const y0 = van.y;
  for (let i = 0; i < 70; i++) driveStep(town, van, {x: 0, y: -1}, 1 / 60, {easy: true});
  assert.equal(Math.floor(van.x), town.start.tx + 4, 'turned up at the next street, not before');
  assert.ok(van.y < y0);
});

import {S, allLines, GREET} from '../public/cupcake/js/say.js';

test('every sentence the game reads aloud has a recording in the voice catalog', () => {
  const lines = new Set(allLines());
  const missing = new Set();
  const need = t => { if (!lines.has(t)) missing.add(t); };
  for (let tier = 1; tier <= 5; tier++) for (let seed = 0; seed < 400; seed++) L.makeOrder(L.rng(seed * 7 + tier), tier, 1 + (seed % 15), seed % 6 === 0).say.forEach(need);
  for (let seed = 0; seed < 300; seed++) for (const day of [3, 8, 15, 30]) for (const big of [false, true]) {
    const a = L.makeAddress(L.rng(seed), day, big);
    L.addressSpoken(a).forEach(need);
    if (a.mode === 'grid') { need(S.yesPoint(a.x, a.y)); need(S.goOver(a.x, a.y)); need(S.herePoint(a.x, a.y)); }
    else { need(S.yesHouse(a.n)); need(S.hereHouse(a.n)); }
  }
  for (let day = 1; day <= 40; day++) for (const id of Object.keys(L.INGREDIENTS)) for (let seed = 0; seed < 30; seed++) {
    const [a, b] = L.dealsFor(L.rng(seed * 13 + day), day, seed % 2 === 0, id);
    if (!b) continue;
    for (const [x, y] of [[a, b], [b, a]]) {
      const m = L.savingsMissed(x, y);
      if (m) [S.couldSave(m.saved), S.compare(m.qty), S.costs(x.vendor, m.costA), S.costs(y.vendor, m.costB), S.minus(m.costA, m.costB, m.saved), S.canSave(m.saved)].forEach(need);
    }
  }
  for (let d = 1; d <= 40; d++) { need(S.day(d)); need(S.dayDone(d)); need(S.goal(L.goalFor(d % 33))); }
  GREET.forEach(need);
  assert.deepEqual([...missing], []);
});

test('better-baked batches sell for a little more, and stars come from the three baking steps', () => {
  const d = {cake: 'vanilla', frosting: 'white', toppings: ['sprinkles'], name: 'x', price: 6};
  assert.ok(L.willingToPay('girl', d, 10, 1, 3) > L.willingToPay('girl', d, 10, 1, 2));
  assert.ok(L.willingToPay('girl', d, 10, 1, 1) < L.willingToPay('girl', d, 10, 1, 2));
  assert.equal(L.willingToPay('girl', d, 10), L.willingToPay('girl', d, 10, 1, 2));
  assert.deepEqual([0, 2, 3, 4, 5, 6].map(L.bakeStars), [1, 1, 2, 2, 3, 3]);
});
