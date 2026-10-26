// The hair salon's rules, free of drawing so they can be tested. A salon day is a few clients, each one
// booked on the clock (telling time) and then cut at the ruler (measuring), then given a finishing touch.
import {CUSTOMERS, randInt, pick} from './logic.js';

export const HOURS = [9, 10, 11, 12, 1, 2, 3, 4, 5];   // the salon is open nine to five
export const RULER = 10;                                // inches on the ruler
export const PRICE = {cut: 5, style: 2};
export const STYLES = {
  bow:      {name: 'Bow', icon: '🎀'},
  sparkles: {name: 'Sparkles', icon: '✨'},
  flower:   {name: 'Flower', icon: '🌸'},
};

// How hard the clock is, from salon days played: 0 o'clock, 1 half past, 2 quarter past and quarter to,
// 3 any five minutes. Big Kid mode starts a step ahead.
export const timeLevel = (played, bigKid) => Math.min(3, (played >= 4 ? 3 : played >= 2 ? 2 : played >= 1 ? 1 : 0) + (bigKid ? 1 : 0));
// The digital time shows beside the clock while she learns each new kind of time, then fades away.
export const showDigital = (played, bigKid) => played < (bigKid ? 1 : 3);
// Cutting: first she finds a length on the ruler, later she works out what's left after cutting some off.
export const cutLevel = (played, bigKid) => (played >= (bigKid ? 0 : 2) ? 1 : 0);

const next = h => (h % 12) + 1;
const MINUTES = [[0], [30], [15, 45], [5, 10, 20, 25, 35, 40, 50, 55]];

export function makeTime(r, level) {
  // mostly the newest kind of time, sometimes an older one for practice
  const lvl = level > 0 && r() < 0.35 ? randInt(r, 0, level - 1) : level;
  const m = pick(r, MINUTES[lvl]);
  // the last appointment is at 5 o'clock sharp
  const hours = m ? HOURS.filter(h => h !== 5) : HOURS;
  return {h: pick(r, hours), m};
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const TENS = {20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty'};
function minuteWords(m) {
  if (m < 10) return `oh ${WORDS[m]}`;
  if (m <= 12) return WORDS[m];
  const t = Math.floor(m / 10) * 10;
  return TENS[t] + (m % 10 ? `-${WORDS[m % 10]}` : '');
}
// how a time is said: "3 o'clock", "half past 3", "quarter to 4", "three twenty-five"
export function timePhrase({h, m}) {
  if (m === 0) return `${h} o'clock`;
  if (m === 30) return `half past ${h}`;
  if (m === 15) return `quarter past ${h}`;
  if (m === 45) return `quarter to ${next(h)}`;
  return `${WORDS[h]} ${minuteWords(m)}`;
}
export const digital = ({h, m}) => `${h}:${String(m).padStart(2, '0')}`;
export const sameTime = (a, b) => a.h === b.h && a.m === b.m;
export const allTimes = () => HOURS.flatMap(h => [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].filter(m => !m || h !== 5).map(m => ({h, m})));

// A haircut: the hair is `from` inches long and should end up `to` inches long. In level 1 she's told how
// much to cut off instead, and works out where that is on the ruler.
export function makeCut(r, level) {
  const from = randInt(r, 5, RULER), off = randInt(r, 1, Math.min(5, from - 2));
  return {from, to: from - off, off, mode: level >= 1 && r() < 0.6 ? 'off' : 'make'};
}
export const allCuts = () => {
  const out = [];
  for (let from = 5; from <= RULER; from++) for (let off = 1; off <= Math.min(5, from - 2); off++) out.push({from, to: from - off, off});
  return out;
};

// The clients for a salon day: everyone who booked, people for haircuts and animals for a fur trim.
export function clients(r, n) {
  const all = Object.keys(CUSTOMERS), out = [];
  while (out.length < n) {
    const type = pick(r, all);
    if (!out.includes(type) || out.length >= all.length) out.push(type);
  }
  return out;
}
export const isPerson = type => CUSTOMERS[type].kind === 'person';
export const clientPrice = styled => PRICE.cut + (styled ? PRICE.style : 0);
