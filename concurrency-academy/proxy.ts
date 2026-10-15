import { NextResponse, type NextRequest } from 'next/server';

// 全站 COOP/COEP：练习面板会在任意页面启动 WASM JVM（SharedArrayBuffer 条件）。
// 当前 vinext 版本里这个文件约定叫 proxy（旧称 middleware）。
export default function proxy(_req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  res.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  return res;
}

export const config = {
  matcher: '/:path*',
};
