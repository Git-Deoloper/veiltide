import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = file => readFile(new URL(file,root),'utf8');

test('there are no runtime dependencies or external resource links', async()=>{
 const pkg=JSON.parse(await read('package.json'));
 assert.deepEqual(pkg.dependencies,undefined);
 assert.deepEqual(pkg.devDependencies,undefined);
 const html=await read('index.html');
 assert.doesNotMatch(html, /<script[^>]+src="https?:/i);
 assert.doesNotMatch(html, /<link[^>]+href="https?:/i);
 assert.doesNotMatch(html, /google-analytics|gtag\(|mixpanel|segment\.com/i);
});
test('static host CSP blocks network and unsafe inline scripts', async()=>{
 const headers=await read('_headers');
 assert.match(headers,/Content-Security-Policy:/);
 assert.match(headers,/connect-src 'none'/);
 assert.match(headers,/default-src 'none'/);
 assert.doesNotMatch(headers,/unsafe-inline|unsafe-eval/);
});
test('app source does not store raw text in browser storage',async()=>{
 const app=await read('src/app.js');
 assert.doesNotMatch(app,/localStorage|indexedDB|sessionStorage|sendBeacon|XMLHttpRequest/);
 assert.match(app,/URL\.createObjectURL/);
});
test('public project assets do not contain private author paths',async()=>{
 const all=(await Promise.all(['README.md','index.html','SECURITY.md','docs/DEPLOYMENT.md','docs/LAUNCH.md'].map(read))).join('\n');
 assert.doesNotMatch(all,/\/Users\/[A-Za-z0-9._-]+\/|\/home\/[A-Za-z0-9._-]+\/|[A-Z]:\\Users\\[A-Za-z0-9._-]+\\/);
});
