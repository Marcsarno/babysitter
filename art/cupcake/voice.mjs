// Records every line in public/cupcake/js/say.js in the voice cast for whoever says it (CAST there),
// and packs each voice's clips into one file: public/cupcake/voice/<voice>.bin holds the MP3 clips
// back to back, <voice>.json says where each sentence starts and how long it is, and index.json lists
// the cast. The game fetches just the bytes of the sentence it needs. Clips already in a pack are
// reused, so rerunning after adding lines only records the new ones.
//
//   npm install --prefix /tmp/kokoro kokoro-js@1
//   KOKORO_DIR=/tmp/kokoro node art/cupcake/voice.mjs [workers]
//   node art/cupcake/voice.mjs --pack    (no recording: pack the voices that are finished so far)
//
// Needs ffmpeg (with the rubberband filter for pitch) on the PATH, and downloads the Kokoro model
// from Hugging Face the first time.
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawn, execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, unlinkSync, writeFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '..', 'public', 'cupcake', 'voice');
const {CAST, linesBy} = await import(pathToFileURL(join(HERE, '..', '..', 'public', 'cupcake', 'js', 'say.js')));
const packName = key => key.replace('@', '_');

async function record(jobs) {
  const req = createRequire(join(process.env.KOKORO_DIR || '.', 'package.json'));
  const mod = await import(pathToFileURL(req.resolve('kokoro-js')));
  const {KokoroTTS} = mod.KokoroTTS ? mod : mod.default;
  const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {dtype: 'q8', device: 'cpu'});
  for (const {voice, pitch, text, out} of jobs) {
    const wav = out + '.wav';
    await (await tts.generate(text, {voice})).save(wav);
    // trimmed of silence at both ends, pitch shifted without changing speed, small mono MP3
    const af = ['silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse'];
    if (pitch !== 1) af.push(`rubberband=pitch=${pitch}:pitchq=quality`);
    af.push('apad=pad_dur=0.08');
    execFileSync('ffmpeg', ['-nostdin', '-y', '-loglevel', 'error', '-i', wav, '-af', af.join(','), '-ac', '1', '-ar', '24000', '-b:a', '32k', out + '.part.mp3']);
    renameSync(out + '.part.mp3', out); // only finished clips count when resuming
    unlinkSync(wav);
    process.stdout.write('.');
  }
}

if (process.argv[2] === '--worker') {
  await record(JSON.parse(readFileSync(process.argv[3], 'utf8')));
} else {
  mkdirSync(OUT, {recursive: true});
  const by = linesBy();
  // each voice records the lines of everyone cast with it
  const want = {};
  for (const [role, key] of Object.entries(CAST)) {
    const lines = role === 'narrator' || role === 'arianna' ? by[role] : by.customer;
    (want[key] ||= new Set());
    lines.forEach(t => want[key].add(t));
  }
  // new recordings wait here until the packs are written, so an interrupted run picks up where it stopped
  const tmp = join(tmpdir(), 'cupcake-voice-work');
  mkdirSync(tmp, {recursive: true});
  const clips = {}; // key -> text -> Buffer or path of a new recording
  const jobs = [];
  for (const [key, set] of Object.entries(want)) {
    const [voice, pitch = '1'] = key.split('@');
    const name = packName(key), old = existsSync(join(OUT, name + '.json')) ? JSON.parse(readFileSync(join(OUT, name + '.json'), 'utf8')).lines : {};
    const bin = Object.keys(old).length ? readFileSync(join(OUT, name + '.bin')) : null;
    clips[key] = {};
    for (const text of set) {
      if (old[text]) { const [at, len] = old[text]; clips[key][text] = bin.subarray(at, at + len); continue; }
      const out = join(tmp, `${name}-${createHash('sha1').update(text).digest('hex').slice(0, 12)}.mp3`);
      clips[key][text] = out;
      if (!existsSync(out)) jobs.push({voice, pitch: +pitch, text, out});
    }
  }
  const packOnly = process.argv[2] === '--pack';
  if (packOnly) jobs.length = 0;
  const workers = Math.max(1, Math.min(+process.argv[2] || 3, jobs.length));
  console.log(`${Object.keys(want).length} voices, ${Object.values(want).reduce((n, s) => n + s.size, 0)} clips, ${jobs.length} to record with ${workers} workers`);
  if (jobs.length) {
    const chunks = Array.from({length: workers}, (_, i) => jobs.filter((_, k) => k % workers === i));
    await Promise.all(chunks.map((chunk, i) => new Promise((done, fail) => {
      const list = join(tmp, `jobs-${i}.json`);
      writeFileSync(list, JSON.stringify(chunk));
      const p = spawn(process.execPath, [fileURLToPath(import.meta.url), '--worker', list], {stdio: ['ignore', 'inherit', 'inherit'], env: process.env});
      p.on('exit', code => (code ? fail(new Error(`worker ${i} failed`)) : done()));
    })));
    console.log();
  }
  // write each finished voice's pack in a stable order; an unfinished voice keeps its old pack, if any
  const packs = {};
  for (const [key, byText] of Object.entries(clips)) {
    const name = packName(key), parts = [], lines = {};
    if (Object.values(byText).some(c => typeof c === 'string' && !existsSync(c))) {
      if (existsSync(join(OUT, name + '.json'))) packs[key] = name;
      console.log(`${name}: not finished yet`);
      continue;
    }
    let at = 0;
    for (const text of Object.keys(byText).sort()) {
      const buf = typeof byText[text] === 'string' ? readFileSync(byText[text]) : byText[text];
      lines[text] = [at, buf.length];
      parts.push(buf); at += buf.length;
    }
    writeFileSync(join(OUT, name + '.bin'), Buffer.concat(parts));
    writeFileSync(join(OUT, name + '.json'), JSON.stringify({lines}));
    packs[key] = name;
    console.log(`${name}: ${Object.keys(lines).length} clips, ${(at / 1048576).toFixed(1)} MB`);
  }
  writeFileSync(join(OUT, 'index.json'), JSON.stringify({cast: CAST, packs}, null, 1) + '\n');
  // remove packs and single clips no voice uses any more
  const keep = new Set(Object.values(packs).flatMap(n => [n + '.bin', n + '.json']).concat('index.json'));
  for (const f of readdirSync(OUT)) if (!keep.has(f)) unlinkSync(join(OUT, f));
  if (Object.keys(packs).length === Object.keys(clips).length && !packOnly) rmSync(tmp, {recursive: true, force: true});
}
