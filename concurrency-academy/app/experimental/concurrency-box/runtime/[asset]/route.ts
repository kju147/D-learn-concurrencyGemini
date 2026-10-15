// Per-process cache stamp: forces all runtime requests (including pthread workers
// that re-fetch the module without our ?v= query) onto one fresh cache key after
// every dev-server restart. Prevents mixing a cached old glue .mjs with a new .wasm.
const SESSION_STAMP = String(Date.now());

const UPSTREAM_ORIGIN = 'https://javabox-demo.brian-fec.workers.dev';

const RUNTIME_ASSETS: Record<string, string> = {
  'javabox-direct.mjs': 'application/javascript; charset=utf-8',
  'javabox-direct.wasm': 'application/wasm',
  'javabox-direct.data': 'application/octet-stream',
};

type RouteContext = {
  params: Promise<{ asset: string }> | { asset: string };
};

async function getAssetName(context: RouteContext) {
  const params = await context.params;
  return params.asset;
}

// Dev-only override: when a local static server on 127.0.0.1:8642 answers,
// forward the freshly built artifacts from there instead of the public demo..
const LOCAL_RUNTIME_ORIGIN = 'http://127.0.0.1:8642';

let localRuntimeAvailable: boolean | null = null;
let localRuntimeCheckedAt = 0;

async function probeLocalRuntime(): Promise<boolean> {
  if (localRuntimeAvailable !== null && Date.now() - localRuntimeCheckedAt < 15_000) {
    return localRuntimeAvailable;
  }
  try {
    const res = await fetch(LOCAL_RUNTIME_ORIGIN + '/javabox-direct.wasm', {
      method: 'HEAD',
      signal: AbortSignal.timeout(1500),
    });
    localRuntimeAvailable = res.ok;
  } catch {
    localRuntimeAvailable = false;
  }
  localRuntimeCheckedAt = Date.now();
  return localRuntimeAvailable;
}

async function serveLocalAsset(request: Request, asset: string, contentType: string) {
  if (!(await probeLocalRuntime())) return null;
  try {
    const upstream = await fetch(LOCAL_RUNTIME_ORIGIN + '/' + asset, {
      method: request.method === 'HEAD' ? 'HEAD' : 'GET',
    });
    if (!upstream.ok) return null;
    return new Response(request.method === 'HEAD' ? null : upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Resource-Policy': 'same-origin',
        'X-Content-Type-Options': 'nosniff',
        'X-Javabox-Source': 'local',
      },
    });
  } catch {
    return null;
  }
}

async function proxyRuntimeAsset(request: Request, context: RouteContext) {
  const asset = await getAssetName(context);
  const contentType = RUNTIME_ASSETS[asset];
  if (!contentType) {
    return new Response('Not found', { status: 404 });
  }

  const url = new URL(request.url);
  if (!url.searchParams.get('v')) {
    url.searchParams.set('v', SESSION_STAMP);
    return new Response(null, { status: 308, headers: { Location: url.toString() } });
  }

  const local = await serveLocalAsset(request, asset, contentType);
  if (local) return local;

  const upstreamHeaders = new Headers();
  const range = request.headers.get('range');
  if (range) upstreamHeaders.set('range', range);

  const upstream = await fetch(`${UPSTREAM_ORIGIN}/${asset}`, {
    method: request.method === 'HEAD' ? 'HEAD' : 'GET',
    headers: upstreamHeaders,
  });

  if (!upstream.ok || !upstream.body && request.method !== 'HEAD') {
    return new Response('JavaBox runtime is temporarily unavailable', {
      status: upstream.status || 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const headers = new Headers({
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Javabox-Source': 'upstream-proxy',
  });

  for (const name of ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(request.method === 'HEAD' ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
}

export const dynamic = 'force-dynamic';

export function GET(request: Request, context: RouteContext) {
  return proxyRuntimeAsset(request, context);
}

export function HEAD(request: Request, context: RouteContext) {
  return proxyRuntimeAsset(request, context);
}
