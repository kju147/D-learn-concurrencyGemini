// Shared wire contract only. No credentials or executable commands belong here.
export const EXERCISE_ID = 'm01-start-join';
export const REVISION = 2;
export const MAX_SOURCE_BYTES = 24 * 1024;
export const MAX_BODY_BYTES = 32 * 1024;
export const MAX_RESPONSE_BYTES = 64 * 1024;
export const TESTS = [
  { id: 'thread', label: '任务在指定名称的平台线程中执行一次' },
  { id: 'await', label: '校验未结束时，调用方不能提前返回' },
  { id: 'values', label: '重复调用、不同任务的数据均可读取' },
  { id: 'interrupt', label: '等待被中断时向调用方传播 InterruptedException' },
];

export function validSubmission(value) {
  return (
    value &&
    value.exerciseId === EXERCISE_ID &&
    value.revision === REVISION &&
    ['run', 'submit'].includes(value.mode) &&
    typeof value.code === 'string' &&
    value.code.trim().length > 0 &&
    new TextEncoder().encode(value.code).length <= MAX_SOURCE_BYTES
  );
}

export async function readLimited(stream, limit) {
  if (!stream) throw new Error('missing_body');
  const reader = stream.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new Error('body_too_large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

// Treat even the sandbox's response as untrusted. Only expose this small contract.
export function cleanResult(value, mode) {
  const statuses = [
    'completed',
    'passed',
    'tests_failed',
    'compile_error',
    'runtime_error',
    'timeout',
    'output_limit',
  ];
  if (
    !value ||
    !statuses.includes(value.status) ||
    value.mode !== mode ||
    value.exerciseId !== EXERCISE_ID ||
    value.revision !== REVISION ||
    typeof value.stdout !== 'string' ||
    typeof value.stderr !== 'string' ||
    value.stdout.length + value.stderr.length > 24000 ||
    !Number.isFinite(value.durationMs) ||
    value.durationMs < 0 ||
    !Array.isArray(value.tests)
  )
    return null;
  if (
    mode === 'run' &&
    (value.tests.length || ['passed', 'tests_failed'].includes(value.status))
  )
    return null;
  if (mode === 'submit' && value.status === 'completed') return null;
  const tests = [];
  for (const test of value.tests) {
    const known = TESTS.find((entry) => entry.id === test.id);
    if (
      !known ||
      tests.some((entry) => entry.id === test.id) ||
      typeof test.passed !== 'boolean' ||
      typeof test.detail !== 'string' ||
      test.detail.length > 2000
    )
      return null;
    tests.push({ ...known, passed: test.passed, detail: test.detail });
  }
  if (
    value.status === 'passed' &&
    (tests.length !== TESTS.length || tests.some((test) => !test.passed))
  )
    return null;
  if (
    value.status === 'tests_failed' &&
    (tests.length !== TESTS.length || !tests.some((test) => !test.passed))
  )
    return null;
  return {
    exerciseId: EXERCISE_ID,
    revision: REVISION,
    mode,
    status: value.status,
    stdout: value.stdout,
    stderr: value.stderr,
    durationMs: value.durationMs,
    tests,
  };
}
