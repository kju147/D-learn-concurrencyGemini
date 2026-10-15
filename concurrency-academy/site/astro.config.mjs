// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  // 部署后替换为正式域名；sitemap/rss 依赖此值
  site: 'https://concurrency-academy.pages.dev',
  integrations: [react(), mdx(), sitemap(), tailwind({ applyBaseStyles: false })],
  output: 'static',
  vite: {
    plugins: [
      {
        // 最早的中间件：给 dev 下的一切响应（含 vite 自身资源与 proxy 转发）打隔离头
        name: 'coop-coep-headers',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
            res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
            next();
          });
        },
      },
    ],
    server: {
      proxy: {
        // Emscripten pthread 会构造嵌套 Worker，跨源 Worker 脚本被浏览器拒绝；
        // 开发环境把本地资产服务（127.0.0.1:8642）代理成同源 /javabox/*
        '/javabox': {
          target: 'http://127.0.0.1:8642',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/javabox/, ''),
        },
      },
    },
  },
});
