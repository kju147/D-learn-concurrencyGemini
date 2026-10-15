// Executes ONLY these repository-owned, reviewed fixtures. Never read learner submissions here.
// This script verifies pedagogy on a local JDK; it is NOT a sandbox or a hosted runner.
import {
  mkdtempSync,
  copyFileSync,
  writeFileSync,
  rmSync,
  mkdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { starter, solution } from '../lib/start-join-exercise.mjs';

const jdk = process.env.JAVA_HOME;
if (!jdk) throw new Error('Set JAVA_HOME to a JDK 21 installation.');
const extension = process.platform === 'win32' ? '.exe' : '';
const javac = join(jdk, 'bin', 'javac' + extension);
const java = join(jdk, 'bin', 'java' + extension);
const version = spawnSync(javac, ['-version'], { encoding: 'utf8' });
assert.match(
  version.stdout + version.stderr,
  /javac 21\./,
  'JDK 21 is required',
);
const base = resolve(tmpdir());
const work = mkdtempSync(join(base, 'academy-trusted-fixtures-'));
const tester = fileURLToPath(
  new URL(
    '../public/exercises/m01-start-join/StartJoinTests.java',
    import.meta.url,
  ),
);
const cases = [
  ['solution', solution, true, null],
  ['starter', starter, false, 'FAIL thread'],
  ['missing-join', solution.replace('worker.join();', ''), false, 'FAIL await'],
  [
    'direct-run',
    solution.replace(
      /Thread worker =[\s\S]*?worker\.join\(\);/,
      'validate.run();',
    ),
    false,
    'FAIL thread',
  ],
  [
    'wrong-name',
    solution.replace('"order-validator"', '"wrong-name"'),
    false,
    'FAIL thread',
  ],
  [
    'virtual-thread',
    solution.replace('Thread.ofPlatform()', 'Thread.ofVirtual()'),
    false,
    'FAIL thread',
  ],
  [
    'swallowed-interrupt',
    solution.replace(
      'worker.join();',
      'try { worker.join(); } catch (InterruptedException ignored) {}',
    ),
    false,
    'FAIL interrupt',
  ],
];
try {
  for (const [name, source, shouldPass, expected] of cases) {
    const dir = join(work, name);
    mkdirSync(dir);
    writeFileSync(join(dir, 'OrderImport.java'), source, 'utf8');
    copyFileSync(tester, join(dir, 'StartJoinTests.java'));
    const compilation = spawnSync(
      javac,
      [
        '--release',
        '21',
        '-encoding',
        'UTF-8',
        'OrderImport.java',
        'StartJoinTests.java',
      ],
      { cwd: dir, encoding: 'utf8', timeout: 15000, maxBuffer: 64000 },
    );
    assert.equal(
      compilation.status,
      0,
      compilation.stderr || compilation.error?.message,
    );
    const run = spawnSync(java, ['-cp', '.', 'StartJoinTests'], {
      cwd: dir,
      encoding: 'utf8',
      timeout: 35000,
      maxBuffer: 64000,
    });
    assert.equal(
      run.status === 0,
      shouldPass,
      name + '\n' + run.stdout + run.stderr,
    );
    if (expected)
      assert.ok(run.stdout.includes(expected), name + '\n' + run.stdout);
    if (shouldPass) {
      const main = spawnSync(java, ['-cp', '.', 'OrderImport'], {
        cwd: dir,
        encoding: 'utf8',
        timeout: 5000,
      });
      assert.equal(main.status, 0);
      assert.equal(main.stdout.trim(), 'validOrders=42');
    }
    console.log(
      'PASS fixture:',
      name,
      shouldPass ? '(accepted)' : '(rejected as intended)',
    );
  }
  const dir = join(work, 'syntax-error');
  mkdirSync(dir);
  writeFileSync(
    join(dir, 'OrderImport.java'),
    solution.replace('worker.join();', 'worker.join()'),
    'utf8',
  );
  const compilation = spawnSync(
    javac,
    ['--release', '21', '-encoding', 'UTF-8', 'OrderImport.java'],
    { cwd: dir, encoding: 'utf8', timeout: 15000 },
  );
  assert.notEqual(compilation.status, 0);
  assert.match(compilation.stderr, /OrderImport.java:\d+:/);
  console.log(
    'PASS fixture: syntax-error (javac rejects and identifies source line)',
  );
} finally {
  // Delete only the exact freshly-created temporary fixture directory, never a workspace.
  if (
    dirname(resolve(work)) !== base ||
    !resolve(work).startsWith(join(base, 'academy-trusted-fixtures-'))
  ) {
    throw new Error('Refusing unsafe cleanup path');
  }
  rmSync(work, { recursive: true, force: true });
}
