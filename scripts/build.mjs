import { cp, mkdir, rm, stat } from 'node:fs/promises';
const output = new URL('../dist/', import.meta.url);
await rm(output, { recursive:true, force:true });
await mkdir(output, { recursive:true });
for (const name of ['index.html','styles.css','manifest.webmanifest','sw.js','robots.txt','_headers']) {
  await cp(new URL(`../${name}`,import.meta.url),new URL(name,output));
}
for (const name of ['assets','src']) {
  await cp(new URL(`../${name}/`,import.meta.url),new URL(`${name}/`,output), { recursive: true, filter: p=> !p.endsWith('/cli.js') && !p.endsWith('-preview.png') });
}
const index = await stat(new URL('index.html', output));
if (index.size < 5000) throw new Error('Unexpectedly small release');
console.log('Built dist/ static release. No private inputs or third-party dependencies.');
