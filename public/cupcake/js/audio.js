// Little synthesized sounds and the read-aloud voice. Nothing to download.
let ac = null, master = null, engine = null;
export const settings = {sound: true, voice: true};

function ctx() {
  if (!ac) {
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return null;
    ac = new A();
    master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
export function unlock() { ctx(); }

function tone(freq, dur, {type = 'sine', vol = 0.3, slide = 0, delay = 0} = {}) {
  if (!settings.sound) return;
  const a = ctx(); if (!a) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, {vol = 0.2, freq = 1200, q = 1, delay = 0} = {}) {
  if (!settings.sound) return;
  const a = ctx(); if (!a) return;
  const t = a.currentTime + delay, buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t);
}

export const sfx = {
  tap: () => tone(660, 0.08, {type: 'triangle', vol: 0.18, slide: 120}),
  pop: () => tone(520, 0.12, {type: 'sine', vol: 0.3, slide: 500}),
  squish: () => { tone(220, 0.18, {type: 'sine', vol: 0.3, slide: -90}); noise(0.12, {vol: 0.08, freq: 600}); },
  coin: () => { tone(988, 0.09, {type: 'square', vol: 0.12}); tone(1319, 0.25, {type: 'square', vol: 0.12, delay: 0.08}); },
  chaChing: () => { noise(0.08, {vol: 0.15, freq: 4000, q: 2}); tone(1046, 0.12, {type: 'triangle', vol: 0.2, delay: 0.05}); tone(1568, 0.3, {type: 'triangle', vol: 0.2, delay: 0.15}); },
  yes: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, {type: 'triangle', vol: 0.22, delay: i * 0.08})),
  gentle: () => { tone(392, 0.18, {type: 'sine', vol: 0.22}); tone(330, 0.25, {type: 'sine', vol: 0.2, delay: 0.14}); },
  bark: () => { tone(560, 0.09, {type: 'sawtooth', vol: 0.14, slide: -260}); noise(0.08, {vol: 0.12, freq: 900, q: 3}); tone(600, 0.1, {type: 'sawtooth', vol: 0.12, slide: -300, delay: 0.16}); noise(0.08, {vol: 0.1, freq: 900, q: 3, delay: 0.16}); },
  honk: () => { tone(392, 0.22, {type: 'square', vol: 0.1}); tone(494, 0.22, {type: 'square', vol: 0.08}); },
  ding: () => { tone(1318, 0.5, {type: 'sine', vol: 0.25}); tone(1760, 0.6, {type: 'sine', vol: 0.12, delay: 0.02}); },
  oven: () => { noise(0.6, {vol: 0.08, freq: 300, q: 0.5}); tone(880, 0.3, {type: 'sine', vol: 0.2, delay: 0.6}); tone(1175, 0.4, {type: 'sine', vol: 0.2, delay: 0.75}); },
  unlock: () => [659, 784, 988, 1319, 1568].forEach((f, i) => tone(f, 0.22, {type: 'triangle', vol: 0.2, delay: i * 0.09})),
  sniff: () => [0, 0.12, 0.24].forEach(d => noise(0.07, {vol: 0.14, freq: 2500, q: 1.5, delay: d})),
};

export function engineHum(on, speed = 1) {
  const a = settings.sound ? ctx() : null;
  if (!a) return;
  if (on && !engine) {
    const o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = 70; f.type = 'lowpass'; f.frequency.value = 300;
    g.gain.value = 0.0001; o.connect(f); f.connect(g); g.connect(master); o.start();
    engine = {o, g};
  }
  if (!engine) return;
  const t = a.currentTime;
  engine.g.gain.setTargetAtTime(on ? 0.05 : 0.0001, t, 0.08);
  engine.o.frequency.setTargetAtTime(60 + speed * 40, t, 0.1);
}
export function engineOff() {
  if (!engine) return;
  engine.g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.05);
  const e = engine; engine = null;
  setTimeout(() => { try { e.o.stop(); } catch {} }, 400);
}

// ---------- read-aloud ----------
// Every line is pre-recorded (see say.js and art/cupcake/voice.mjs), one pack per voice. speak() takes one
// sentence or a list and plays them in order: Arianna's and the narrator's lines in their own voices, and
// customer lines in the voice of the customer passed as {customer}. A sentence without a recording falls
// back to the device's voice.
let base = '/cupcake/', cast = null, packNames = {}, voiceGain = null, playing = null, token = 0;
const packs = new Map();   // voice -> Promise of {lines: {text: [start, length]}}, or null
const whole = new Map();   // voice -> Promise of the whole pack, when the server ignores byte ranges
const buffers = new Map(); // customer|text -> Promise of a decoded clip, or null
export async function loadVoice(b) {
  base = b;
  try {
    const r = await fetch(`${b}voice/index.json`);
    if (!r.ok) return;
    ({cast, packs: packNames} = await r.json());
    await Promise.all([pack(cast.narrator), pack(cast.arianna)]);
  } catch {}
}
function pack(key) {
  if (!key || !packNames[key]) return Promise.resolve(null);
  if (!packs.has(key)) packs.set(key, fetch(`${base}voice/${packNames[key]}.json`).then(r => (r.ok ? r.json() : null)).catch(() => null));
  return packs.get(key);
}
// Load a customer's list of lines before they speak.
export function preloadCustomer(type) { if (cast) pack(customerVoice(type)); }
async function bytes(key, at, len) {
  if (!whole.has(key)) {
    const r = await fetch(`${base}voice/${packNames[key]}.bin`, {headers: {Range: `bytes=${at}-${at + len - 1}`}});
    if (r.status === 206) return r.arrayBuffer();
    // this server sent the whole pack instead: keep it and cut sentences from it from now on
    whole.set(key, r.ok ? r.arrayBuffer() : Promise.reject(new Error(`no voice pack ${key}`)));
  }
  return (await whole.get(key)).slice(at, at + len);
}
// which voice has this sentence: Arianna, the narrator, or the customer speaking. A customer whose
// voice isn't recorded yet borrows another customer's.
const customerVoice = type => (packNames[cast[type]] ? cast[type] : Object.entries(cast).find(([who, key]) => who !== 'narrator' && who !== 'arianna' && packNames[key])?.[1]);
async function find(text, customer) {
  for (const key of [cast?.arianna, cast?.narrator, customer && cast && customerVoice(customer)]) {
    const p = await pack(key);
    if (p?.lines[text]) return [key, ...p.lines[text]];
  }
  return null;
}
function buffer(text, customer) {
  const a = cast && ctx();
  if (!a) return Promise.resolve(null);
  const id = `${customer || ''}|${text}`;
  if (!buffers.has(id)) {
    if (buffers.size > 160) buffers.delete(buffers.keys().next().value);
    buffers.set(id, find(text, customer)
      .then(hit => hit && bytes(...hit))
      .then(data => data && new Promise((ok, bad) => a.decodeAudioData(data, ok, bad)))
      .catch(() => null));
  }
  return buffers.get(id);
}
function playBuffer(buf) {
  return new Promise(done => {
    if (!voiceGain) { voiceGain = ac.createGain(); voiceGain.gain.value = 1.5; voiceGain.connect(ac.destination); }
    const src = ac.createBufferSource();
    src.buffer = buf; src.connect(voiceGain); src.onended = done; src.start();
    playing = src;
  });
}

let voice = null;
function pickVoice() {
  const vs = window.speechSynthesis?.getVoices() || [];
  const en = vs.filter(v => /^en(-|_|$)/i.test(v.lang));
  voice = en.find(v => /samantha|ava|allison|google us english|jenny|aria|zira/i.test(v.name)) || en.find(v => v.localService) || en[0] || null;
}
if (window.speechSynthesis) { pickVoice(); window.speechSynthesis.onvoiceschanged = pickVoice; }
function deviceSay(text) {
  return new Promise(done => {
    if (!window.speechSynthesis) return done();
    try {
      const u = new SpeechSynthesisUtterance(text.replace(/\$(\d+)/g, '$1 dollars').replace(/×/g, 'times'));
      if (voice) u.voice = voice;
      u.rate = 0.95; u.pitch = 1.1; u.onend = done; u.onerror = done;
      window.speechSynthesis.speak(u);
      setTimeout(done, 9000);
    } catch { done(); }
  });
}

export function speak(parts, {interrupt = true, customer = null} = {}) {
  const list = [].concat(parts || []).filter(Boolean);
  if (!settings.voice || !list.length) return;
  if (interrupt) hush();
  const mine = ++token;
  list.forEach(text => buffer(text, customer));
  (async () => {
    for (const text of list) {
      const buf = await buffer(text, customer);
      if (mine !== token) return;
      if (buf) await playBuffer(buf); else await deviceSay(text);
      if (mine !== token) return;
    }
  })();
}
export function hush() {
  token++;
  try { playing?.stop(); } catch {}
  playing = null;
  try { window.speechSynthesis?.cancel(); } catch {}
}
