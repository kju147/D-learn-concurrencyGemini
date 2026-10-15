import {
  cleanResult,
  MAX_BODY_BYTES,
  MAX_RESPONSE_BYTES,
  readLimited,
  validSubmission,
} from './java-execution.mjs';

function json(value, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function handleJavaRequest(request, config, fetcher = fetch) {
  const user = request.headers.get('oai-authenticated-user-id');
  if (!user) return json({ message: '请先登录后再使用真实执行服务。' }, 401);
  const isStatus = request.method === 'GET';
  if (!isStatus && request.method !== 'POST')
    return json({ message: '不支持的请求方式。' }, 405);
  // Sites authenticates the visitor at its gateway. POST additionally requires same-origin.
  if (
    !isStatus &&
    request.headers.get('origin') !== new URL(request.url).origin
  ) {
    return json({ message: '只接受从本站发起的代码提交。' }, 403);
  }
  if (
    !isStatus &&
    !request.headers.get('content-type')?.startsWith('application/json')
  ) {
    return json({ message: '请求必须为 JSON。' }, 415);
  }
  let submission;
  if (!isStatus) {
    try {
      submission = JSON.parse(await readLimited(request.body, MAX_BODY_BYTES));
    } catch {
      return json(
        { message: '请求无效或过大，请将代码控制在 24 KB 内。' },
        400,
      );
    }
    if (!validSubmission(submission))
      return json(
        { message: '当前仅支持第一题第 2 版；请检查代码是否为空或过长。' },
        400,
      );
  }
  let base;
  try {
    base = new URL(config.JAVA_RUNNER_URL);
    if (
      base.protocol !== 'https:' ||
      base.username ||
      base.password ||
      base.search ||
      base.hash ||
      (base.pathname !== '/' && base.pathname !== '')
    )
      throw new Error('invalid_runner');
  } catch {
    return json(
      {
        ready: false,
        message:
          '真实 Java 执行服务尚未连接。你仍可编写代码、使用结构自检，或下载到 IDEA 运行。',
      },
      503,
    );
  }
  if (!config.JAVA_RUNNER_TOKEN || config.JAVA_RUNNER_TOKEN.length < 32) {
    return json(
      { ready: false, message: '真实 Java 执行服务尚未配置完成。' },
      503,
    );
  }
  // Send a site-scoped opaque quota key, never the visitor's email or raw identity.
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(new URL(request.url).origin + ':' + user),
  );
  const caller = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), isStatus ? 5000 : 40000);
  try {
    const upstream = await fetcher(
      new URL(isStatus ? '/health' : '/execute', base),
      {
        method: isStatus ? 'GET' : 'POST',
        redirect: 'error',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${config.JAVA_RUNNER_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Learner-Key': caller,
        },
        body: isStatus
          ? undefined
          : JSON.stringify({
              exerciseId: submission.exerciseId,
              revision: submission.revision,
              mode: submission.mode,
              code: submission.code,
            }),
      },
    );
    if (upstream.status === 429)
      return json({ message: '提交过于频繁或运行名额已满，请稍后重试。' }, 429);
    if (!upstream.ok)
      return json(
        { ready: false, message: '执行服务暂不可用，代码草稿已保留。' },
        503,
      );
    const payload = JSON.parse(
      await readLimited(upstream.body, MAX_RESPONSE_BYTES),
    );
    if (isStatus) {
      const ready =
        payload.ready === true &&
        payload.runtime === 'jdk21-runsc' &&
        payload.revision === 2;
      return json(
        {
          ready,
          message: ready ? 'JDK 21 隔离执行服务已连接' : '执行服务尚未就绪',
        },
        ready ? 200 : 503,
      );
    }
    const result = cleanResult(payload, submission.mode);
    return result
      ? json(result)
      : json({ message: '执行服务返回了无效结果，本次不会记为通过。' }, 502);
  } catch {
    return json(
      {
        ready: false,
        message: controller.signal.aborted
          ? '等待执行服务超时。本次不计为通过，请稍后重试。'
          : '暂时无法连接执行服务，代码草稿已保留。',
      },
      503,
    );
  } finally {
    clearTimeout(timer);
  }
}
