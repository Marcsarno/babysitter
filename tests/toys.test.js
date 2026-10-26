import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../public/cupcake/js/logic.js';
import * as TY from '../public/cupcake/js/toys.js';
import {S, allLines} from '../public/cupcake/js/say.js';

test('shelves need a tens-and-ones number that grows with practice', () => {
  for (const [level, lo, hi] of [[0, 11, 29], [1, 21, 59], [2, 31, 99]]) {
    const r = L.rng(level + 3);
    for (let i = 0; i < 300; i++) { const n = TY.makeStock(r, level); assert.ok(n >= lo && n <= hi && n % 10, `${n} at level ${level}`); }
  }
  assert.deepEqual(TY.tensOnes(34), {tens: 3, ones: 4});
});

test('customers bring bills and only the coins she has learned, enough for a toy', () => {
  const allowed = [['dollar', 'dime'], ['dollar', 'dime', 'nickel'], ['dollar', 'quarter', 'dime', 'nickel'], ['dollar', 'quarter', 'dime', 'nickel', 'penny']];
  const cheapest = Math.min(...Object.values(TY.TOYS).map(t => t.price));
  for (let level = 0; level < 4; level++) {
    const r = L.rng(level + 11);
    for (let i = 0; i < 300; i++) {
      const m = TY.makeMoney(r, level);
      assert.ok(m.pieces.every(p => allowed[level].includes(p)));
      assert.equal(m.total, m.pieces.reduce((s, p) => s + TY.MONEY[p], 0));
      assert.ok(m.total >= cheapest && m.total % 5 === 0 && m.total % 100 && m.pieces.length <= 15);
      assert.equal(m.pieces.filter(p => p === 'penny').length % 5, 0, 'pennies come five at a time');
    }
  }
});

test('a customer buys what they want if they can, or else the best toy they can pay for', () => {
  const r = L.rng(4), all = Object.keys(TY.TOYS);
  for (let i = 0; i < 200; i++) {
    const total = 250 + Math.floor(r() * 600), toy = TY.choose(r, total, all);
    assert.ok(TY.TOYS[toy].price <= total);
  }
  assert.equal(TY.choose(r, 100, all), null);
});

test('the coin jar turns every 100 cents into a dollar', () => {
  const save = L.newGame(1);
  assert.equal(TY.bankCents(save, 950), 9); assert.equal(save.shops.cents, 50);
  assert.equal(TY.bankCents(save, 75), 1); assert.equal(save.shops.cents, 25);
  assert.equal(TY.amountPhrase(345), '3 dollars and 45 cents');
  assert.equal(TY.amountPhrase(100), '1 dollar');
  assert.equal(TY.dollars(305), '$3.05');
});

test('every toy shop sentence is recorded', () => {
  const lines = new Set(allLines());
  for (let n = 11; n <= 99; n++) if (n % 10) { assert.ok(lines.has(S.shelfNeeds(n))); assert.ok(lines.has(S.tensAndOnes(n))); }
  for (let level = 0; level < 4; level++) { const r = L.rng(level); for (let i = 0; i < 300; i++) assert.ok(lines.has(S.thatsMoney(TY.makeMoney(r, level).total))); }
});
