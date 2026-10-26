import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../public/cupcake/js/logic.js';
import * as SA from '../public/cupcake/js/salon.js';
import {S, allLines} from '../public/cupcake/js/say.js';

test('times are said the way a second grader learns them', () => {
  assert.equal(SA.timePhrase({h: 3, m: 0}), "3 o'clock");
  assert.equal(SA.timePhrase({h: 3, m: 30}), 'half past 3');
  assert.equal(SA.timePhrase({h: 3, m: 15}), 'quarter past 3');
  assert.equal(SA.timePhrase({h: 3, m: 45}), 'quarter to 4');
  assert.equal(SA.timePhrase({h: 12, m: 45}), 'quarter to 1');
  assert.equal(SA.timePhrase({h: 3, m: 25}), 'three twenty-five');
  assert.equal(SA.timePhrase({h: 10, m: 5}), 'ten oh five');
  assert.equal(SA.digital({h: 9, m: 5}), '9:05');
});

test('the clock gets harder one kind of time at a time, within opening hours', () => {
  const kinds = level => {
    const r = L.rng(level + 1), seen = new Set();
    for (let i = 0; i < 300; i++) {
      const t = SA.makeTime(r, level);
      assert.ok(SA.HOURS.includes(t.h));
      assert.ok(!(t.h === 5 && t.m), 'the last appointment is at 5 sharp');
      seen.add(t.m);
    }
    return [...seen].sort((a, b) => a - b);
  };
  assert.deepEqual(kinds(0), [0]);
  assert.deepEqual(kinds(1), [0, 30]);
  assert.deepEqual(kinds(2), [0, 15, 30, 45]);
  assert.equal(kinds(3).length, 12);
  assert.deepEqual([0, 1, 2, 3, 4, 9].map(p => SA.timeLevel(p, false)), [0, 1, 2, 2, 3, 3]);
  assert.equal(SA.timeLevel(0, true), 1);
});

test('every haircut fits on the ruler and leaves some hair', () => {
  for (const level of [0, 1]) {
    const r = L.rng(9 + level);
    for (let i = 0; i < 300; i++) {
      const c = SA.makeCut(r, level);
      assert.ok(c.from <= SA.RULER && c.to >= 2 && c.off >= 1 && c.from - c.off === c.to);
      if (level === 0) assert.equal(c.mode, 'make');
    }
  }
});

test('every salon sentence is recorded, and a day has no repeat clients', () => {
  const lines = new Set(allLines());
  for (const t of SA.allTimes()) assert.ok(lines.has(S.setClock(SA.timePhrase(t))));
  for (const c of SA.allCuts()) for (const l of [S.makeIt(c.from, c.to), S.cutOff(c.from, c.off), S.takeAway(c.from, c.off, c.to), S.findOn(c.to)]) assert.ok(lines.has(l), l);
  for (let n = 1; n <= 5 * SA.clientPrice(true); n++) assert.ok(lines.has(S.salonEarned(n)));
  for (let seed = 0; seed < 50; seed++) { const c = SA.clients(L.rng(seed), 5); assert.equal(new Set(c).size, 5); }
});
