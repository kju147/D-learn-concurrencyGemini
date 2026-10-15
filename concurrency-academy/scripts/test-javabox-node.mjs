// Boot the locally built JavaBox WASM module under Node and run a program.
// usage: node scripts/test-javabox-node.mjs <Program.java>
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '.javabox-local');
const mod = await import('file:///' + join(dir, 'javabox-direct.mjs').replace(/\\/g, '/'));
const createModule = mod.default;

const source = readFileSync(process.argv[2], 'utf8');
const cls = (source.match(/public\s+class\s+(\w+)/) || source.match(/class\s+(\w+)/) || [null, 'Main'])[1];

let sawPong = false;
let exitSeen = false;
const module1 = await createModule({
  arguments: [],
  locateFile: (p) => join(dir, p),
  print: (t) => {
    if (t.startsWith('[')) return; // skip -Xlog verbosity
    console.log(t);
    if (t.includes('JBOX_PONG')) sawPong = true;
    if (t.includes('PROBE_MATRIX_DONE')) { setTimeout(() => process.exit(0), 500); }
    if (t.startsWith('JBOX_EXIT')) { exitSeen = true; process.exit(Number(t.slice(10))); }
  },
  printErr: (t) => { if (!t.startsWith('[')) console.error('[stderr]', t); },
  printErr: (t) => console.error('[stderr]', t),
  onExit: (code) => { console.log('[exit]', code); process.exit(code); },
});
module1.ccall('jvm_enable_ring_buffer_stdin', null, [], []);

async function waitFor(fn, ms, what) {
  const t0 = Date.now();
  while (!fn()) {
    if (Date.now() - t0 > ms) throw new Error('timeout waiting ' + what);
    await new Promise(r => setTimeout(r, 300));
  }
}

await waitFor(() => sawPong, 180000, 'JBOX_PONG');
console.log('--- boot ok, compiling', cls);
module1.ccall('jvm_stdin_write_string', null, ['string'], [`JBOX_COMPILE ${cls}\n${source}\nJBOX_END\n`]);
await waitFor(() => exitSeen, 120000, 'JBOX_EXIT');
