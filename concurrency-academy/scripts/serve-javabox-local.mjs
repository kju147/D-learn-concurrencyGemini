// Tiny static server for locally built JavaBox WASM artifacts (dev only).
// Serves /.javabox-local with cache disabled on http://127.0.0.1:8642
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const ROOT = decodeURIComponent(new URL('../.javabox-local/', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const MIME = {
  '.mjs': 'application/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
  '.html': 'text/html; charset=utf-8',
};

createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = normalize(join(ROOT, name));
  if (!file.startsWith(normalize(ROOT))) { res.writeHead(403); return res.end(); }
  let size;
  try { size = statSync(file).size; } catch { res.writeHead(404); return res.end('not found'); }
  if (req.method === 'HEAD') { res.writeHead(200, { 'Content-Length': size }); return res.end(); }
  res.writeHead(200, {
    'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
    'Content-Length': size,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  });
  createReadStream(file).pipe(res);
}).listen(8642, '127.0.0.1', () => console.log('javabox-local assets on http://127.0.0.1:8642 from', ROOT));
