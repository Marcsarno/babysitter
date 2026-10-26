// Everything Arianna's Cupcakes says out loud. Each sentence is recorded ahead of time with Kokoro
// (art/cupcake/voice.mjs); linesBy() lists them by who says them, for that recording.
// Lines with numbers are split into short sentences so every combination can be recorded.
import {INGREDIENTS, UPGRADES, DECOR, PAINTS, dealsFor, compareDeals, orderSentences} from './logic.js';

// Who speaks in which Kokoro voice, as "voice" or "voice@pitch" (pitch shifted without changing speed).
// Chosen in the voice casting page. Arianna says her own lines, each customer says theirs, and the
// narrator reads everything else: instructions, math help and praise.
export const CAST = {
  narrator: 'am_santa', arianna: 'af_heart@1.1',
  grandma: 'bf_alice', builder: 'am_michael', boy: 'af_sky@1.1', mail: 'am_puck', girl: 'af_jessica@1.1', dad: 'am_liam',
  bunny: 'af_nova@1.1', cat: 'bf_emma@1.1', bear: 'am_santa@0.88', duck: 'af_jessica@1.32',
  pug: 'am_echo@1.2', poodle: 'bf_isabella@1.1', spot: 'am_adam@1.1',
};
const ARIANNA = ['firstDay', 'openShop', 'designDone', 'ding', 'closing', 'comingUp', 'hereYouGo'];
const CUSTOMER = ['woof', 'thanks', 'bo'];

export const VENDOR = {corner: 'Corner Market', barn: 'Bulk Barn'};
export const GREET = ['Hi Arianna!', 'Hello there!', 'Ooh, cupcakes!', 'Yum, it smells so good!', 'Hi! Hi Baxter!'];

export const S = {
  welcome: "Welcome to Arianna's Cupcakes!",
  coach: {
    market: 'Tap a deal to buy it. Get cake, frosting and toppings for your cupcakes!',
    market4: 'Bulk Barn is open! Check which shop has the better deal.',
    kitchen: 'Choose how many to bake with plus and minus. Tap Change it to design your own cupcake!',
    street: 'Customers are coming! Listen to each order and type how many they want.',
    findline: 'Count the houses from our shop! The shop is 0.',
    findgrid: 'The first number says how far over. The second says how far up!',
    drive: 'Hold an arrow to drive. The van turns at the next corner. Find the bouncing house!',
    driveFree: 'Hold the arrows to steer to the bouncing house!',
    upgrades: 'Spend your savings to grow the shop. Or save up for something big!',
    bake: "Let's bake! Follow each step to make the yummiest cupcakes.",
    fund: 'This is the building fund jar! Save money in it, and Builder Bo will build a new shop.',
  },
  day: n => `Day ${n}!`,
  event: {
    rain: "It's a rainy day. Fewer people are out walking.",
    birthday: "It's Baxter's birthday! Only dog customers today, and tips are doubled!",
    party: 'Party day! Someone will order a big batch.',
  },
  firstDay: "Let's go shopping for ingredients!",
  openShop: "Let's open the shop!",
  broke: 'Not enough money for that one.',
  full: 'Your fridge is full of that! A bigger fridge holds more.',
  couldSave: n => `You could have saved ${n} dollars!`,
  compare: q => `Let's compare ${q}.`,
  costs: (vendor, c) => `${VENDOR[vendor]} costs ${c} dollars.`,
  minus: (a, b, s) => `${a} minus ${b} is ${s}.`,
  canSave: n => `You could save ${n} dollars!`,
  designDone: 'Yum! That looks delicious!',
  priceEach: p => `${p} dollars each.`,
  ding: 'Ding! The cupcakes are ready!',
  comingUp: 'Coming right up!',
  hereYouGo: 'Here you go!',
  goal: g => `Let's sell ${g} today!`,
  pricey: p => `Hmm, ${p} dollars is too expensive for me. Maybe next time!`,
  woof: 'Woof woof!',
  soldOut: 'Sold out! Great job!',
  closing: 'Closing time!',
  notQuite: "Hmm, not quite. Let's count together!",
  countIt: n => `Let's count together. It's ${n}! Press OK.`,
  thanks: 'Thank you!',
  tapHouse: 'Tap that house on Main Street. Our shop is 0.',
  tapCorner: 'Tap that corner. Go over first, then up.',
  yesHouse: n => `Yes! House ${n}!`,
  yesPoint: (x, y) => `Yes! Over ${x}, up ${y}!`,
  wrongHouse: n => `That's house ${n}. Count again from the shop!`,
  hereHouse: n => `Here it is! House ${n} is the bouncing one.`,
  wrongPoint: (x, y) => `That's ${x}, ${y}.`,
  goOver: (x, y) => `Go over ${x} first, then up ${y}!`,
  herePoint: (x, y) => `Here it is! The bouncing star is over ${x}, up ${y}.`,
  tip: t => `Yummy! Thank you, Arianna and Baxter! Here's a ${t} dollar tip!`,
  dayDone: n => `Day ${n} done!`,
  profit: p => `You made ${p} dollars profit!`,
  bigProfit: 'You made lots of money today!',
  noProfit: "No profit today. Let's try again tomorrow!",
  goalMet: 'And you beat your goal!',
  newIngredient: id => `New ingredient! ${INGREDIENTS[id].name}!`,
  keepSaving: 'Not enough money yet. Keep saving!',
  bought: name => `${name}!`,
  seasonDone: 'Season complete!',
  trophy: {gold: 'Gold Cupcake Trophy!', silver: 'Silver Cupcake Trophy!', bronze: 'Bronze Cupcake Trophy!', ribbon: 'Super Baker Ribbon!'},
  amazingSeason: 'What an amazing season!',
  // the baking mini-game
  pour: 'Hold to pour the batter. Let go at the line!',
  oven: "Into the oven! Tap Take them out when they're golden!",
  frost: 'Hold to swirl on the frosting. Let go at the top line!',
  toppings: 'Now add the toppings! Tap each jar.',
  perfect: 'Perfect!',
  great: 'Great job!',
  messy: 'A little messy, but still yummy!',
  stars: n => ['One star! Still yummy!', 'Two stars! Nice baking!', 'Three stars! A perfect batch!'][n - 1],
  fancy: 'Fancy cupcakes sell for more!',
  // the building fund jar and the new shops (shops.js)
  intoJar: 'Into the jar!',
  keepCash: 'Keep some money for the market!',
  fundFull: {salon: 'The jar is full! Builder Bo will build the hair salon tonight!', toy: 'The jar is full! Builder Bo will build the toy shop tonight!'},
  build: {salon: 'Builder Bo is building the hair salon! Tap to help him hammer!', toy: 'Builder Bo is building the toy shop! Tap to help him hammer!'},
  cutRibbon: 'All done! Cut the ribbon!',
  grandOpening: {salon: 'Grand opening! The hair salon is open!', toy: 'Grand opening! The toy shop is open!'},
  bo: {hi: "Let's build it!", done: 'Ta-da! All done!'},
  nudge: {
    salon: n => (n === 1 ? 'One appointment is booked at the salon!' : `${n} appointments are booked at the salon!`),
    toy: n => (n === 1 ? 'One customer is waiting at the toy shop!' : `${n} customers are waiting at the toy shop!`),
  },
};

export const N_MAX = {day: 99, money: 20, goal: 20, profit: 200, count: 15};

// Every sentence, grouped by who says it: {narrator, arianna, customer}. Every customer has all the customer lines.
export function linesBy() {
  const sets = {narrator: new Set(), arianna: new Set(), customer: new Set()};
  const put = (who, v) => { if (typeof v === 'string') sets[who].add(v); else if (v && typeof v === 'object') Object.values(v).forEach(x => put(who, x)); };
  const add = v => put('narrator', v), says = v => put('customer', v);
  for (const [key, v] of Object.entries(S)) if (typeof v !== 'function') put(ARIANNA.includes(key) ? 'arianna' : CUSTOMER.includes(key) ? 'customer' : 'narrator', v);
  GREET.forEach(says);
  for (let n = 1; n <= N_MAX.day; n++) { add(S.day(n)); add(S.dayDone(n)); }
  for (let n = 1; n <= 30; n++) { add(S.couldSave(n)); add(S.canSave(n)); }
  for (let p = 1; p <= N_MAX.money; p++) { add(S.priceEach(p)); says(S.pricey(p)); }
  for (let g = 2; g <= N_MAX.goal; g++) put('arianna', S.goal(g));
  for (let p = 1; p <= N_MAX.profit; p++) add(S.profit(p));
  for (let n = 1; n <= N_MAX.count; n++) add(S.countIt(n));
  for (let n = 0; n <= 10; n++) { add(S.wrongHouse(n)); add(S.yesHouse(n)); add(S.hereHouse(n)); }
  for (let x = 0; x <= 6; x++) for (let y = 0; y <= 6; y++) {
    add(S.yesPoint(x, y)); add(S.wrongPoint(x, y)); add(S.goOver(x, y)); add(S.herePoint(x, y));
    says(`Please bring them to ${x}, ${y}!`); says(`That's over ${x}, up ${y}.`);
  }
  for (let n = 1; n <= 10; n++) says(`Please bring them to house ${n}!`);
  for (let t = 1; t <= 6; t++) says(S.tip(t));
  for (let n = 1; n <= 3; n++) add(S.stars(n));
  for (let n = 1; n <= 5; n++) { add(S.nudge.salon(n)); add(S.nudge.toy(n)); }
  for (const id in INGREDIENTS) add(S.newIngredient(id));
  for (const u of Object.values(UPGRADES)) add(S.bought(u.name));
  for (const d of Object.values(DECOR)) add(S.bought(d.name));
  for (const p of Object.values(PAINTS)) add(S.bought(p.name));
  orderSentences().forEach(says);
  // every comparison the market can show
  for (let day = 4; day <= 40; day++) for (const bigKid of [false, true]) for (let seed = 0; seed < 40; seed++) for (const id of ['vanilla', 'redvelvet']) {
    const deals = dealsFor(seededRandom(seed * 97 + day), day, bigKid, id);
    if (deals.length < 2) continue;
    for (const [a, b] of [[deals[0], deals[1]], [deals[1], deals[0]]]) {
      const c = compareDeals(a, b);
      if (c.costB >= c.costA) continue;
      add(S.compare(c.qty)); add(S.costs(a.vendor, c.costA)); add(S.costs(b.vendor, c.costB)); add(S.minus(c.costA, c.costB, c.costA - c.costB));
    }
  }
  return Object.fromEntries(Object.entries(sets).map(([who, set]) => [who, [...set]]));
}
export const allLines = () => Object.values(linesBy()).flat();

function seededRandom(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
