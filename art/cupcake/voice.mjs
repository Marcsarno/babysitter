// Records every line in public/cupcake/js/say.js with the Kokoro "Heart" voice (af_heart)
// and writes public/cupcake/voice/<hash>.mp3 plus index.json (spoken text -> file).
// Only missing lines are recorded, so rerunning after adding lines is quick.
//
//   npm install --prefix /tmp/kokoro kokoro-js@1
//   KOKORO_DIR=/tmp/kokoro node art/cupcake/voice.mjs [workers]
//
// Needs ffmpeg on the PATH, and downloads the Kokoro model from Hugging Face the first time.
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawn, execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '..', 'public', 'cupcake', 'voice');
const VOICE = 'af_heart';
const {allLines} = await import(pathToFileURL(join(HERE, '..', '..', 'public', 'cupcake', 'js', 'say.js')));
const fileFor = text => createHash('sha1').update(VOICE + '|' + text).digest('hex').slice(0, 12) + '.mp3';

async function record(lines) {
  const req = createRequire(join(process.env.KOKORO_DIR || '.', 'package.json'));
  const mod = await import(pathToFileURL(req.resolve('kokoro-js')));
  const {KokoroTTS} = mod.KokoroTTS ? mod : mod.default;
  const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {dtype: 'q8', device: 'cpu'});
  for (const text of lines) {
    const wav = join(tmpdir(), `cupcake-${process.pid}.wav`);
    await (await tts.generate(text, {voice: VOICE})).save(wav);
    // mono, trimmed of silence at both ends, small MP3
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,apad=pad_dur=0.08',
      '-ac', '1', '-ar', '24000', '-b:a', '40k', join(OUT, fileFor(text))]);
    unlinkSync(wav);
    process.stdout.write('.');
  }
}

if (process.argv[2] === '--worker') {
  await record(JSON.parse(process.argv[3]));
} else {
  mkdirSync(OUT, {recursive: true});
  const lines = allLines();
  const todo = lines.filter(t => !existsSync(join(OUT, fileFor(t))));
  const workers = Math.max(1, Math.min(+process.argv[2] || 3, todo.length));
  console.log(`${lines.length} lines, ${todo.length} to record with ${workers} workers`);
  if (todo.length) {
    const chunks = Array.from({length: workers}, (_, i) => todo.filter((_, k) => k % workers === i));
    await Promise.all(chunks.map(chunk => new Promise((done, fail) => {
      const p = spawn(process.execPath, [fileURLToPath(import.meta.url), '--worker', JSON.stringify(chunk)], {stdio: ['ignore', 'inherit', 'inherit'], env: process.env});
      p.on('exit', code => (code ? fail(new Error(`worker exited ${code}`)) : done()));
    })));
    console.log();
  }
  const index = {};
  for (const t of lines) if (existsSync(join(OUT, fileFor(t)))) index[t] = fileFor(t);
  const keep = new Set(Object.values(index));
  for (const f of readdirSync(OUT)) if (f.endsWith('.mp3') && !keep.has(f)) unlinkSync(join(OUT, f));
  writeFileSync(join(OUT, 'index.json'), JSON.stringify({voice: VOICE, lines: index}));
  console.log(`index: ${Object.keys(index).length} of ${lines.length} lines`);
}
