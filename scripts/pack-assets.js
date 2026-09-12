import {readdir,readFile,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
const directory=new URL('../public/assets/',import.meta.url);
let raw=0,packed=0;
for(const name of await readdir(directory)){
 if(!name.endsWith('.glb'))continue;
 const source=await readFile(new URL(name,directory));
 const compressed=gzipSync(source,{level:9});
 await writeFile(new URL(name+'.gz',directory),compressed);
 raw+=source.length;packed+=compressed.length;
}
console.log(`GLB downloads: ${(raw/1e6).toFixed(2)} MB → ${(packed/1e6).toFixed(2)} MB`);
