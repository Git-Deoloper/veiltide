import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('../',import.meta.url)));
const port = Number(process.env.PORT || 4173);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.txt':'text/plain'};
export const headers = {
 'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; worker-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'; frame-ancestors 'none'",
 'X-Content-Type-Options': 'nosniff',
 'Referrer-Policy': 'no-referrer',
 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
 'Cross-Origin-Resource-Policy': 'same-origin',
 'X-Frame-Options':'DENY'
};
const server = createServer(async (req,res)=>{
 if (!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 let requested;
 try { requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname); }catch {res.writeHead(400);res.end();return;}
 const pathname = requested==='/'?'index.html':requested.slice(1);
 const full = resolve(join(root,pathname));
 if (!full.startsWith(root+sep) || pathname.startsWith('.') || pathname.split('/').some(segment=>segment.startsWith('.')) || /^(tests|scripts|docs)\//.test(pathname) || pathname==='package.json' || pathname==='src/cli.js') {res.writeHead(404);res.end();return;}
 try {
  const metadata=await stat(full);
  if (!metadata.isFile()){res.writeHead(404);res.end();return;}
  const type=types[extname(full)];
  if (!type) {res.writeHead(404);res.end();return;}
  const bytes=await readFile(full);
  res.writeHead(200,{'Content-Type':type,'Content-Length':bytes.length,'Cache-Control':'no-store',...headers});
  res.end(req.method==='HEAD'?undefined:bytes);
 } catch {res.writeHead(404);res.end();}
});
if (process.argv[1] && import.meta.url===new URL(`file://${process.argv[1]}`).href) server.listen(port,'127.0.0.1',()=>console.log(`Veiltide local preview at http://127.0.0.1:${port}`));
export {server};
