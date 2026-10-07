// Gives Babcia's Mahjong service worker a version made from the game's files, so an
// installed copy sees an update exactly when something under /mahjong/ changes.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dist/mahjong', sw = join(dir, 'sw.js');
const h = createHash('sha256');
for (const f of readdirSync(dir).filter(f => f !== 'sw.js').sort()) h.update(f).update(readFileSync(join(dir, f)));
const version = 'babcia-' + h.digest('hex').slice(0, 12);
const src = readFileSync(sw, 'utf8');
if (!src.includes("const VERSION = 'babcia-dev';")) throw new Error('sw.js VERSION placeholder not found');
writeFileSync(sw, src.replace("const VERSION = 'babcia-dev';", `const VERSION = '${version}';`));
console.log('mahjong service worker', version);
