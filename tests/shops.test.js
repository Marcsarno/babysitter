import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../public/cupcake/js/logic.js';
import * as SH from '../public/cupcake/js/shops.js';
import {buildTown, T} from '../public/cupcake/js/town.js';

// a saved game from before the new shops, as it sits on her phone
function oldSave() {
  const s = L.newGame(42);
  delete s.shops;
  Object.assign(s, {day: 9, cash: 137, earnedTotal: 410, unlockLevel: 4, stars: 6, stickers: {grandma: 1, pug: 2}, seen: {market: true, upgrades: true}});
  s.upg.oven = 2; s.deco.push('balloons'); s.stock.vanilla = 12;
  s.history.push({day: 8, earned: 60, sales: 52, tips: 8, spent: 21, profit: 39, sold: [], leftovers: 0, goal: 6, goalMet: true, cheap: []});
  return JSON.parse(JSON.stringify(s));
}

test('an old saved game keeps everything and gains an empty building fund', () => {
  const before = oldSave(), save = L.migrate(JSON.parse(JSON.stringify(before)));
  for (const key of Object.keys(before)) assert.deepEqual(save[key], before[key], key);
  assert.deepEqual(save.shops, SH.freshShops());
  // and a save that already has shops keeps them
  save.shops.built.push('salon'); save.shops.fund = 20;
  assert.deepEqual(L.migrate(JSON.parse(JSON.stringify(save))).shops, save.shops);
});

test('the jar shows up after day 2 and saves for the salon, then the toy shop', () => {
  SH.SHOPS.toy.soon = false;   // as it will be once the toy shop is playable
  const save = L.newGame(1);
  save.day = 2;
  assert.equal(SH.fundOpen(save), false);
  save.day = 3;
  assert.equal(SH.fundOpen(save), true);
  assert.equal(SH.fundFor(save), 'salon');
  save.cash = 1000;
  let res;
  while ((res = SH.drop(save, 10)) === 'ok');
  assert.equal(res, 'full');
  assert.equal(save.cash, 1000 - SH.SHOPS.salon.cost, 'it takes exactly what the shop costs');
  assert.equal(save.shops.building, 'salon');
  assert.equal(SH.fundFor(save), null, 'no saving while Builder Bo is busy');
  assert.equal(SH.drop(save, 5), 'none');
  assert.equal(SH.finishBuilding(save), 'salon');
  assert.equal(SH.fundFor(save), 'toy');
  while (SH.drop(save, 10) === 'ok');
  SH.finishBuilding(save);
  assert.deepEqual(save.shops.built, ['salon', 'toy']);
  assert.equal(SH.fundFor(save), null);
});

test('money for the market always stays out of the jar', () => {
  const save = L.newGame(1);
  save.day = 6; save.cash = SH.KEEP_CASH + 7;
  assert.equal(SH.canDrop(save, 5), true);
  assert.equal(SH.drop(save, 5), 'ok');
  assert.equal(SH.canDrop(save, 5), false);
  assert.equal(SH.drop(save, 5), 'keep');
  assert.equal(save.cash, SH.KEEP_CASH + 2);
  assert.equal(save.shops.fund, 5);
});

test('customers book visits on cupcake days, up to a limit', () => {
  const save = L.newGame(1);
  SH.afterCupcakeDay(save);
  assert.deepEqual(save.shops.booked, {}, 'nothing to book before a shop is built');
  save.shops.building = 'salon'; SH.finishBuilding(save);
  assert.equal(SH.booked(save, 'salon'), 3);
  for (let i = 0; i < 10; i++) SH.afterCupcakeDay(save);
  assert.equal(SH.booked(save, 'salon'), SH.MAX_BOOKED);
});

test('pacing: saving part of a typical day opens the salon in the first week or so and the toy shop around day 20', () => {
  SH.SHOPS.toy.soon = false;
  // a typical day's profit grows as the shop does; she saves a bit over a third of it
  const save = L.newGame(1);
  for (let d = 1; d <= 40 && save.shops.built.length < 2; d++) {
    save.day = d + 1;
    save.cash += 20 + d * 1.5;
    if (SH.fundOpen(save) && SH.fundFor(save)) SH.drop(save, Math.round((20 + d * 1.5) * 0.38));
    if (save.shops.building) { SH.finishBuilding(save); save.shops[`${save.shops.built.at(-1)}Day`] = save.day; }
  }
  assert.ok(save.shops.salonDay >= 6 && save.shops.salonDay <= 9, `salon on day ${save.shops.salonDay}`);
  assert.ok(Math.abs(save.shops.toyDay - 20) <= 3, `toy shop on day ${save.shops.toyDay}`);
});

test('each shop has an empty lot of its own on the map', () => {
  const town = buildTown(7), lots = new Set();
  for (let i = 0; i < town.tiles.length; i++) if (town.tiles[i] === T.LOT) lots.add(town.variant[i]);
  assert.deepEqual([...lots].sort(), Object.values(SH.SHOPS).map(s => s.lot).sort());
  const save = L.newGame(1);
  save.shops.built.push('salon');
  assert.deepEqual(SH.lotsTaken(save), {[SH.SHOPS.salon.lot]: 'salon'});
});

test('the jar never saves for a shop that is not playable yet', () => {
  SH.SHOPS.toy.soon = true;
  const save = L.newGame(1);
  save.day = 6; save.shops.built = ['salon'];
  assert.equal(SH.fundFor(save), null);
  assert.equal(SH.drop(save, 5), 'none');
});

test('a jar already past a lowered price gets built, with the extra given back', () => {
  const save = L.newGame(1);
  save.day = 9; save.cash = 40; save.shops.fund = SH.SHOPS.salon.cost + 15;
  SH.settle(save);
  assert.equal(save.shops.building, 'salon');
  assert.equal(save.shops.fund, 0);
  assert.equal(save.cash, 55);
  SH.settle(save);
  assert.equal(save.cash, 55, 'only once');
});
