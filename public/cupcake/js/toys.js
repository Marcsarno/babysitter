// The toy shop's rules, free of drawing so they can be tested. A toy day starts by stocking the shelves
// with boxes of ten and loose toys (tens and ones), then customers bring the money they've saved: she counts
// it up, and they buy the best toy it pays for. Money here is in cents; whole dollars go to her cash and the
// leftover cents wait in the coin jar until they make another dollar.
import {randInt, pick} from './logic.js';

export const TOYS = {
  ball:  {name: 'Bouncy balls', one: 'bouncy ball', price: 250},
  car:   {name: 'Toy cars', one: 'toy car', price: 425},
  teddy: {name: 'Teddy bears', one: 'teddy bear', price: 550},
  robot: {name: 'Robots', one: 'robot', price: 775},
};
export const MONEY = {dollar: 100, quarter: 25, dime: 10, nickel: 5, penny: 1};
export const SHELVES = 3;

// Stocking: how many a shelf needs, from teens and twenties up to anything under 100.
export const stockLevel = (played, bigKid) => Math.min(2, (played >= 3 ? 2 : played >= 1 ? 1 : 0) + (bigKid ? 1 : 0));
const STOCK = [[11, 29], [21, 59], [31, 99]];
export function makeStock(r, level) {
  const [lo, hi] = STOCK[level];
  let n = randInt(r, lo, hi);
  if (n % 10 === 0) n += randInt(r, 1, 9) * (n + 9 <= hi ? 1 : -1);
  return n;
}
export const tensOnes = n => ({tens: Math.floor(n / 10), ones: n % 10});

// Counting money: dollar bills and dimes first, then nickels, then quarters, then pennies too.
export const coinLevel = (played, bigKid) => Math.min(3, (played >= 4 ? 3 : played >= 3 ? 2 : played >= 1 ? 1 : 0) + (bigKid ? 1 : 0));
const COINS = [['dime'], ['dime', 'nickel'], ['quarter', 'dime', 'nickel'], ['quarter', 'dime', 'nickel', 'penny']];
// A customer's savings: 2 to 8 dollar bills and a few coins, enough for at least the cheapest toy.
// Pennies come five at a time, so every amount is in 5-cent steps.
export function makeMoney(r, level) {
  const cheapest = Math.min(...Object.values(TOYS).map(t => t.price));
  for (;;) {
    const pieces = Array(randInt(r, 2, 8)).fill('dollar');
    for (let i = randInt(r, 1, level >= 2 ? 4 : 5); i > 0; i--) {
      const coin = pick(r, COINS[level]);
      pieces.push(...(coin === 'penny' ? Array(5).fill('penny') : [coin]));
    }
    const total = pieces.reduce((s, p) => s + MONEY[p], 0);
    if (total % 100 && total >= cheapest && pieces.length <= 15) {
      // biggest first while she's learning; mixed up once she knows the coins
      if (level < 2) pieces.sort((a, b) => MONEY[b] - MONEY[a]);
      else for (let i = pieces.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pieces[i], pieces[j]] = [pieces[j], pieces[i]]; }
      return {pieces, total};
    }
  }
}
// The toy a customer buys: the one they want if they can pay for it, or else the best one they can.
export function choose(r, total, stocked) {
  const want = pick(r, stocked);
  if (TOYS[want].price <= total) return want;
  return stocked.filter(id => TOYS[id].price <= total).sort((a, b) => TOYS[b].price - TOYS[a].price)[0] || null;
}

export const dollars = cents => `$${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
// how an amount is said: "3 dollars and 45 cents", "1 dollar", "60 cents"
export function amountPhrase(cents) {
  const d = Math.floor(cents / 100), c = cents % 100;
  const ds = d === 1 ? '1 dollar' : `${d} dollars`;
  if (!c) return ds;
  return d ? `${ds} and ${c} cents` : `${c} cents`;
}
// every amount a customer can bring: 2 to 8 dollars plus up to 95 cents
export const allAmounts = () => { const out = []; for (let d = 2; d <= 8; d++) for (let c = 5; c < 100; c += 5) out.push(d * 100 + c); return out; };

// End of the day: the coin jar keeps the cents, and every 100 cents become a dollar for her cash.
export function bankCents(save, cents) {
  const jar = (save.shops.cents || 0) + cents;
  save.shops.cents = jar % 100;
  return Math.floor(jar / 100);
}
