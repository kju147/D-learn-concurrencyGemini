import type { NextConfig } from 'next';

// SharedArrayBuffer (浏览器内 JVM 多线程) requires cross-origin isolation on
// every page, not just the runtime route — the exercise panel boots the WASM
// worker from the course UI itself.
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          // third-party assets（若有）必须带 CORP/CORS，否则被隔离策略拦截；
          // 当前站点所有所需资源均自托管。
        ],
      },
    ];
  },
};

export default nextConfig;
