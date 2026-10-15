import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync, strFromU8 } from 'fflate';
import { makeExercisePack } from '../lib/exercise-pack.mjs';
import { handleJavaRequest } from '../lib/java-runner-proxy.mjs';
import {
  cleanResult,
  EXERCISE_ID,
  REVISION,
  TESTS,
} from '../lib/java-execution.mjs';

const config = {
  JAVA_RUNNER_URL: 'https://runner.example.test',
  JAVA_RUNNER_TOKEN: 'x'.repeat(40),
};
const submission = {
  exerciseId: EXERCISE_ID,
  revision: REVISION,
  mode: 'submit',
  code: 'public class OrderImport {}',
};
const pass = {
  ...submission,
  status: 'passed',
  stdout: '',
  stderr: '',
  durationMs: 120,
  tests: TESTS.map((entry) => ({ ...entry, passed: true, detail: 'ok' })),
};
function request(body = submission, headers = {}) {
  return new Request('https://academy.example.test/api/java', {
    method: 'POST',
    headers: {
      origin: 'https://academy.example.test',
      'Content-Type': 'application/json',
      'oai-authenticated-user-id': 'test-user',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
const neverFetch = () => {
  throw new Error('must not contact runner');
};

test('rejects anonymous requests', async () => {
  assert.equal(
    (
      await handleJavaRequest(
        new Request('https://academy.example.test/api/java'),
        config,
        neverFetch,
      )
    ).status,
    401,
  );
});
test('rejects cross-origin POST', async () => {
  assert.equal(
    (
      await handleJavaRequest(
        request(submission, { origin: 'https://other.test' }),
        config,
        neverFetch,
      )
    ).status,
    403,
  );
});
test('rejects non-JSON requests', async () => {
  assert.equal(
    (
      await handleJavaRequest(
        request(submission, { 'Content-Type': 'text/plain' }),
        config,
        neverFetch,
      )
    ).status,
    415,
  );
});
test('unconfigured service is unavailable, never a passed result', async () => {
  const response = await handleJavaRequest(request(), {}, neverFetch);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).ready, false);
});
test('rejects unsafe runner URL config', async () => {
  for (const url of [
    'http://localhost',
    'https://user:secret@runner.test',
    'https://runner.test/?token=x',
  ]) {
    assert.equal(
      (
        await handleJavaRequest(
          request(),
          { ...config, JAVA_RUNNER_URL: url },
          neverFetch,
        )
      ).status,
      503,
    );
  }
});
test('only accepts supported exercise revision and bounded nonempty source', async () => {
  for (const changes of [
    { exerciseId: 'other' },
    { revision: 1 },
    { mode: 'shell' },
    { code: '' },
    { code: '汉'.repeat(9000) },
    { code: 'x'.repeat(40000) },
  ]) {
    assert.equal(
      (
        await handleJavaRequest(
          request({ ...submission, ...changes }),
          config,
          neverFetch,
        )
      ).status,
      400,
    );
  }
});
test('proxies fixed fields only and hashes identity', async () => {
  const response = await handleJavaRequest(
    request({ ...submission, command: 'ignored' }),
    config,
    async (url, init) => {
      assert.equal(url.href, 'https://runner.example.test/execute');
      assert.equal(init.redirect, 'error');
      assert.equal(
        init.headers.Authorization,
        'Bearer ' + config.JAVA_RUNNER_TOKEN,
      );
      assert.match(init.headers['X-Learner-Key'], /^[a-f0-9]{64}$/);
      assert.deepEqual(JSON.parse(init.body), submission);
      return Response.json(pass);
    },
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).status, 'passed');
});
test('health requires declared sandbox protocol and exercise revision', async () => {
  const get = () =>
    new Request('https://academy.example.test/api/java', {
      headers: { 'oai-authenticated-user-id': 'test-user' },
    });
  assert.equal(
    (
      await handleJavaRequest(get(), config, async () =>
        Response.json({ ready: true }),
      )
    ).status,
    503,
  );
  assert.equal(
    (
      await handleJavaRequest(get(), config, async () =>
        Response.json({ ready: true, runtime: 'jdk21-runsc', revision: 2 }),
      )
    ).status,
    200,
  );
});
test('rejects fake empty pass and duplicate tests', () => {
  assert.equal(cleanResult({ ...pass, tests: [] }, 'submit'), null);
  assert.equal(
    cleanResult(
      {
        ...pass,
        tests: [pass.tests[0], pass.tests[0], ...pass.tests.slice(2)],
      },
      'submit',
    ),
    null,
  );
  assert.equal(cleanResult({ ...pass, mode: 'run' }, 'run'), null);
});
test('upstream busy and broken responses stay failures', async () => {
  assert.equal(
    (
      await handleJavaRequest(
        request(),
        config,
        async () => new Response('', { status: 429 }),
      )
    ).status,
    429,
  );
  assert.equal(
    (
      await handleJavaRequest(request(), config, async () =>
        Response.json({ ...pass, tests: [] }),
      )
    ).status,
    502,
  );
  assert.equal(
    (
      await handleJavaRequest(
        request(),
        config,
        async () => new Response('x'.repeat(70000)),
      )
    ).status,
    503,
  );
  assert.equal(
    (
      await handleJavaRequest(request(), config, async () => {
        throw new Error('network');
      })
    ).status,
    503,
  );
});
test('download bundle preserves current source and UTF-8 with only fixed paths', () => {
  const source = '// 我的代码\npublic class OrderImport {}';
  const files = unzipSync(makeExercisePack(source, '// 测试', '# 说明'));
  assert.deepEqual(Object.keys(files).sort(), [
    'start-join/README.md',
    'start-join/src/OrderImport.java',
    'start-join/src/StartJoinTests.java',
  ]);
  assert.equal(strFromU8(files['start-join/src/OrderImport.java']), source);
  assert.equal(strFromU8(files['start-join/README.md']), '# 说明');
});
